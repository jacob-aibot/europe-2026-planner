/**
 * QA round 63 — the adversarial pass over I-24 / §8.4 **A-85**, against commit `9817fe0`.
 *
 * Run from `cairn/`:  `node --experimental-strip-types qa/r63-i24.mjs`
 *
 * A-85 Part 2 puts a rule at a **door**: a `CityInit` carrying a `pick` and **no `centre` key**
 * is stood on a copy of `pick.centre`; a `centre` written out loud — `null` included — is
 * honoured verbatim. The distinction vanishes in the stored document (born-stale and
 * user-erased are the same two fields), so the only thing that can be attacked is the door set.
 * A-85 Part 3 puts `placeCount` on the stored row and takes `SUMMARY_VERSION` to 8.
 *
 * A `FAIL` line is a finding; a `note` line is a recorded fact; a `GAP` line is a design
 * question routed rather than asserted. The run ends with a `COMPLETE` line — a run without one
 * is INCOMPLETE and its counts may not be quoted. It writes nothing outside memory.
 *
 *   A  the door census: can a stored `{centre: null, pick: live}` be reached without writing `null`?
 *   B  `!== undefined` vs `'centre' in c` — the one input they differ on, measured both ways
 *   C  a malformed pick at the door that A-84 Part 3 clause 2 says is refused with a path
 *   D  `placeCount` end to end: the v7 → v8 rescan, a v7 row read by a v8 build, hostile rows
 *   E  the range check on both new subjects: boundaries, `-0`, null centre, params, the reference trip
 *   F  A-39 Part 11's covering table, re-derived from the file's own text rather than from its assertions
 *   G  N6's substitute, measured: what the injected `at === null` branch would actually redden
 *   H  standing constraints on the changed files, and the negative controls
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const gz = await import(pathToFileURL(join(CAIRN, 'packages/core/src/geo/gazetteer.gen.ts')).href);
const client = await import(pathToFileURL(join(CAIRN, 'packages/client/src/index.ts')).href);
const { loadEurope2026 } = await import(pathToFileURL(join(CAIRN, 'fixtures/loadEurope2026.mjs')).href);

let fails = 0, gaps = 0;
const ok = (c, m, x) => { if (c) console.log(`  ok   ${m}`); else { fails++; console.log(`  FAIL ${m}${x === undefined ? '' : `  — ${x}`}`); } };
const note = (m) => console.log(`  note ${m}`);
/**
 * A design question routed rather than asserted — and it is CONDITIONAL, since QA round 64.
 * Every `gap()` here used to be an unconditional print, so the count could not move when the
 * fact behind it moved: two of the three were still printing at `fcac762` after `I-25` had
 * changed what they said. `gap(cond, m, closed)` prints the GAP only while `cond` holds and
 * prints `closed` as an `ok` line otherwise, so the probe measures the gap instead of
 * remembering it. (R64-6.)
 */
const gap = (cond, m, closed) => {
  if (cond) { gaps++; console.log(`  GAP  ${m}`); }
  else console.log(`  ok   ${closed ?? 'the gap this section recorded is closed'}`);
};
const head = (s) => console.log(`\n== ${s}`);
const J = (v) => JSON.stringify(v);
const src = (p) => readFileSync(join(CAIRN, p), 'utf8');

const ctx = (p = 'r63') => ({ ids: core.sequentialIds(p), now: '2026-01-01', actorUserId: 'local:self' });
const IDX = core.COUNTRY_INDEX;
const ROWS = gz.GAZETTEER.rows;
const GENEVA = ROWS.find((r) => r.fold === 'geneva' && r.countryCode === 'CH');
const pickOf = () => core.cityPickFromRow(GENEVA);
const trip1 = (cityInit, p) => core.createTrip(
  { title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [cityInit] }, ctx(p),
);
const city0 = (trip) => core.tripSummary(trip, IDX).cities[0];
const caught = (fn) => { try { return { value: fn() }; } catch (e) { return { err: e }; } };

// ===========================================================================
head('A — the door census: a stored `{centre: null, pick: live}` without a caller writing `null`');
{
  // A1. The door set, re-measured rather than quoted: who constructs a `City`, and who accepts
  //     a `CityInit`? A-85 Part 2 clause 4 rests on this set being two and one.
  const grepCity = execSync(
    `grep -rn "centre:" ${JSON.stringify(join(CAIRN, 'packages/core/src'))} --include=*.ts | grep -v "^.*: *\\*" | grep -v "parseCentre\\|centre: LatLng\\|centre: null | \\|centre?:"`,
    { encoding: 'utf8' },
  ).trim().split('\n');
  const cityWriters = grepCity.filter((l) => !/\/(derive|geo|validate|serialize|model)\//.test(l) || /import\/legacyDays/.test(l));
  note(`grep 'centre:' in packages/core/src — ${grepCity.length} lines, of which ${cityWriters.length} outside derive/geo/validate/serialize/model`);
  for (const l of cityWriters) note(`  ${l.replace(CAIRN + '/', '')}`);
  const initUsers = execSync(
    `grep -rln "CityInit" ${JSON.stringify(join(CAIRN, 'packages'))} ${JSON.stringify(join(CAIRN, 'apps'))} ${JSON.stringify(join(CAIRN, 'cli.ts'))} --include=*.ts --include=*.tsx || true`,
    { encoding: 'utf8' },
  ).trim().split('\n').filter(Boolean).map((p) => p.replace(CAIRN + '/', ''));
  note(`files naming CityInit: ${J(initUsers)}`);
  ok(initUsers.filter((p) => !p.includes('/test/')).every((p) => p === 'packages/core/src/build/createTrip.ts' || p === 'packages/core/src/index.ts'),
    'A-85 Part 2 clause 4: `createTrip` is still the only non-test consumer of `CityInit`', J(initUsers));

  // A2. The four `CityInit` shapes, through the door, into the stored document.
  const shapes = [
    ['centre key absent', { name: 'Geneva', pick: pickOf() }],
    ['centre: undefined', { name: 'Geneva', centre: undefined, pick: pickOf() }],
    ['centre: null (erase)', { name: 'Geneva', centre: null, pick: pickOf() }],
    ['centre: Vienna (moved)', { name: 'Geneva', centre: { lat: 48.2082, lng: 16.3738 }, pick: pickOf() }],
  ];
  for (const [label, init] of shapes) {
    const t = trip1(init, label.slice(0, 4));
    const stored = JSON.parse(core.toJSON(t)).cities[0];
    const s = city0(t);
    note(`${label.padEnd(22)} centre ${String(J(stored.centre)).padEnd(30)} → ${s.countryCode}/${s.countrySource}`);
  }

  // A3. `setTripMeta`'s claim — *"its patch takes `City[]`, whose `centre` is required, so a
  //     caller there has to write `centre: null` out loud"* — verified rather than accepted.
  //     TypeScript is not the enforcement at runtime; the parser is. Both spellings of "I did
  //     not write a centre" must be refused with a path, or the claim is false.
  const base = trip1({ name: 'Geneva', pick: pickOf() }, 'stm');
  const c0 = base.cities[0];
  for (const [label, city] of [
    ['no `centre` key at all', { key: c0.key, name: c0.name, countryCode: '', pick: c0.pick, order: 0 }],
    ['`centre: undefined`', { ...c0, centre: undefined }],
  ]) {
    const r = caught(() => core.setTripMeta(base, { cities: [city] }, ctx('stm')));
    ok(r.err !== undefined && /\$\.centre/.test(r.err.message),
      `setTripMeta refuses a city with ${label}, naming the path — A-85 Part 2 clause 4's claim`,
      r.err ? r.err.message : J(r.value.cities[0]));
  }
  const erased = core.setTripMeta(base, { cities: [{ ...c0, centre: null }] }, ctx('stm'));
  ok(erased.cities[0].centre === null && erased.cities[0].pick !== null,
    'setTripMeta with `centre: null` written out loud is the erase case — pick kept, inert',
    J(erased.cities[0]));

  // A4. `mergeTrips`, both orientations: can one side's `centre` pair with the other's `pick`?
  const live = trip1({ name: 'Geneva', pick: pickOf() }, 'mg');
  const localErased = core.setTripMeta(live, { cities: [{ ...live.cities[0], centre: null }] }, ctx('mg'));
  const remoteMoved = core.setTripMeta(live, { cities: [{ ...live.cities[0], centre: { lat: 48.2082, lng: 16.3738 } }] }, ctx('mg'));
  for (const [label, l, r] of [['local erased / remote moved', localErased, remoteMoved], ['local moved / remote erased', remoteMoved, localErased]]) {
    const m = caught(() => core.mergeTrips(live, l, r, ctx('mg')));
    if (m.err) { note(`mergeTrips(${label}) threw: ${m.err.message}`); continue; }
    const merged = (m.value.trip ?? m.value).cities[0];
    note(`mergeTrips ${label} → centre ${J(merged.centre)} pick ${merged.pick ? 'kept' : 'null'}`);
    ok(
      [l, r, live].some((t) => t.cities[0].centre === null ? merged.centre === null : true),
      `mergeTrips (${label}) does not synthesise a city — the array is one value`,
      J(merged),
    );
    ok(!(merged.centre === null && merged.pick !== null && l.cities[0].centre !== null && r.cities[0].centre !== null),
      `mergeTrips (${label}) cannot produce {centre: null, pick: live} from two located sides`, J(merged));
  }

  // A5. The migration ladder: does any rung null a centre while keeping a pick, other than the
  //     `{0,0}` case A-85 Part 5 rules out of scope?
  const migrate = await import(pathToFileURL(join(CAIRN, 'packages/core/src/serialize/migrate.ts')).href);
  const doc = JSON.parse(core.toJSON(trip1({ name: 'Geneva', pick: pickOf() }, 'mig')));
  for (const [label, centre, expectNulled] of [
    ['{0,0} + pick (A-85 Part 5)', { lat: 0, lng: 0 }, true],
    ['{-0,0} + pick', { lat: -0, lng: 0 }, true],
    ['{0.0001,0} + pick', { lat: 0.0001, lng: 0 }, false],
    ['Geneva + pick', { lat: 46.21, lng: 6.14 }, false],
  ]) {
    const v3 = { ...doc, schemaVersion: 3, cities: [{ ...doc.cities[0], centre, pick: doc.cities[0].pick }] };
    const r = caught(() => core.fromJSON(JSON.stringify(v3)));
    if (r.err) { note(`ladder ${label} refused: ${r.err.message}`); continue; }
    const c = r.value.cities[0];
    const bornStale = c.centre === null && c.pick !== null;
    note(`ladder ${label} → centre ${J(c.centre)} pick ${c.pick ? 'kept' : 'null'}`);
    ok(bornStale === expectNulled,
      `the 3→4 rung nulls exactly the origin centre (${label})`, `${J(c.centre)} nulled=${bornStale}`);
  }
  const report = caught(() => migrate.migrateDocWithReport(JSON.parse(JSON.stringify({ ...doc, schemaVersion: 3, cities: [{ ...doc.cities[0], centre: { lat: 0, lng: 0 } }] }))));
  if (!report.err) note(`migrateDocWithReport on the {0,0}+pick document: ${J(report.value.report ?? report.value)}`);

  // A6. `copyStopInto` — the person boundary. It may carry no city and no pick at all.
  const from = core.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-08', ownerId: 'u:a', cities: [{ name: 'Geneva', pick: pickOf() }] }, ctx('cpa'));
  const withStop = core.addStop(
    from,
    { kind: 'scheduled', dayId: from.days[0].id, time: null, order: 0 },
    { name: 'S', category: 'sight' },
    ctx('cpa'),
  );
  const into = core.createTrip({ title: 'B', startDate: '2026-08-07', endDate: '2026-08-08', ownerId: 'u:b' }, ctx('cpb'));
  const copyCtx = { ids: core.sequentialIds('cpb'), today: '2026-01-01', actorUserId: 'u:b' };
  const copied = caught(() => core.copyStopInto(
    into,
    { trip: withStop, stopId: withStop.days[0].stops[0].id },
    { kind: 'scheduled', dayId: into.days[0].id, time: null, order: 0 },
    copyCtx,
  ));
  if (copied.err) note(`copyStopInto threw: ${copied.err.message}`);
  else ok(copied.value.cities.length === 0,
    'copyStopInto carries no city and therefore no pick across a person boundary', J(copied.value.cities));
}

// ===========================================================================
head("B — `!== undefined` vs `'centre' in c`: the one input they differ on");
{
  // The builder chose `!== undefined` on KD-101's precedent. The claim to test is not which is
  // prettier but what the OTHER spelling would actually do, because A-85 Part 2's stated goal is
  // that no door produces a born-stale pick.
  const init = { name: 'Geneva', centre: undefined, pick: pickOf() };
  const shipped = trip1(init, 'undef').cities[0];
  ok(shipped.centre !== null && shipped.centre.lat === 46.21,
    '`{centre: undefined, pick}` stands on the pick under the shipped `!== undefined` spelling', J(shipped.centre));

  // What `'centre' in c` would write, simulated exactly: the door would pass `undefined`
  // through to the same `commit` → `parseCity` the shipped door uses.
  const doc = JSON.parse(core.toJSON(trip1({ name: 'Geneva', pick: pickOf() }, 'sim')));
  const asIn = { ...doc, cities: [{ ...doc.cities[0], centre: undefined }] };
  const r = caught(() => core.fromJSON(JSON.stringify({ ...asIn, cities: [{ ...asIn.cities[0] }] })));
  // `JSON.stringify` drops an `undefined` value, so the honest simulation is the parser call
  // the door makes, on the object, not on its serialisation.
  const parse = await import(pathToFileURL(join(CAIRN, 'packages/core/src/serialize/fromJSON.ts')).href);
  const direct = caught(() => parse.parseCity({ ...doc.cities[0], centre: undefined }, '$.cities[0]'));
  note(`under 'centre' in c the door would hand the parser {centre: undefined} → ${direct.err ? `THROW ${direct.err.message}` : J(direct.value.centre)}`);
  note(`(the same object serialised and reparsed: ${r.err ? `THROW ${r.err.message}` : J(r.value.cities[0].centre)} — JSON drops the key, which is why the door is the only place that can tell)`);
  ok(direct.err !== undefined,
    "the two spellings differ by `take the default` vs `a parse refusal` — NOT by born-stale; neither can produce {centre: null, pick: live}",
    direct.err ? direct.err.message : J(direct.value));

  // The third spelling nobody wrote: a `centre` inherited from a prototype is "written" under
  // both `in` and `!== undefined`, and only `hasOwnProperty` would call it absent.
  const proto = trip1(Object.assign(Object.create({ centre: null }), { name: 'Geneva', pick: pickOf() }), 'proto');
  note(`Object.create({centre: null}) + pick → centre ${J(proto.cities[0].centre)} (born-stale via an INHERITED key; both spellings in the criterion agree here)`);
}

// ===========================================================================
head('C — a malformed pick at the door: A-84 Part 3 clause 2 says a named refusal, at every door');
{
  // A-84 Part 3 clause 2: *"a malformed, partial or half-typed pick is refused by the parser, at
  // a named JSON path, at every door"*, and A-85 Part 7's rewritten N6 requires each door's
  // message to carry `pick.rowId` and to identify the city. I-24 Part 1 put `c.pick.centre.lat`
  // in front of that parser.
  const bad = [
    ['a pick with no `centre` (A-84 clause 2\'s own case)', { rowId: 'ne:j64n0x', countryCode: 'CH' }],
    ['a pick whose `centre` is null', { rowId: 'ne:j64n0x', centre: null, countryCode: 'CH' }],
    ['a pick that is a string', 'ne:j64n0x'],
    ['a pick that is a number', 7],
    ['a pick that is `true`', true],
    ['a pick that is an array', []],
  ];
  for (const [label, pick] of bad) {
    const without = caught(() => trip1({ name: 'G', pick }, 'bad'));
    const withNull = caught(() => trip1({ name: 'G', centre: null, pick }, 'bad'));
    const named = (e) => e !== undefined && /\$\.pick|\$\.centre|cities\[0\]/.test(e.message) && !(e instanceof TypeError);
    note(`${label}`);
    note(`   no centre key : ${without.err ? `${without.err.constructor.name}: ${without.err.message}` : J(without.value.cities[0])}`);
    note(`   centre: null  : ${withNull.err ? `${withNull.err.constructor.name}: ${withNull.err.message}` : J(withNull.value.cities[0])}`);
    ok(named(without.err),
      `createTrip refuses ${label} with a NAMED path when no \`centre\` key is written`,
      without.err ? `${without.err.constructor.name}: ${without.err.message}` : 'accepted');
    ok(named(withNull.err),
      `createTrip refuses ${label} with a NAMED path when \`centre: null\` is written`,
      withNull.err ? `${withNull.err.constructor.name}: ${withNull.err.message}` : 'accepted');
  }
  // The mirror case: a pick whose centre is present but not a number still reaches the parser,
  // because the door only dereferences `.lat`/`.lng` rather than checking them.
  // The door reads `pick.centre` TWICE — once for its copy, and once again when `commit` hands
  // the same caller-owned object to `parseCityPick`. Two reads of one object is a door that can
  // be made to disagree with itself.
  let n = 0;
  const shifting = { rowId: 'ne:j64n0x', countryCode: 'CH', get centre() { n++; return { lat: 46.21 + n, lng: 6.14 }; } };
  const shifted = caught(() => trip1({ name: 'G', pick: shifting }, 'tocs'));
  if (!shifted.err) {
    const c = shifted.value.cities[0];
    const live = c.centre !== null && c.centre.lat === c.pick.centre.lat;
    note(`a pick whose \`centre\` is a getter: city.centre ${J(c.centre)} vs pick.centre ${J(c.pick.centre)} — pick is ${live ? 'live' : 'STALE AT BIRTH'} (${n} reads)`);
    ok(live, 'the door reads `pick.centre` once, so a caller-owned object cannot be made to disagree with itself', J([c.centre, c.pick.centre]));
  } else note(`the getter pick threw: ${shifted.err.message}`);

  const strs = caught(() => trip1({ name: 'G', pick: { rowId: 'ne:j64n0x', centre: { lat: '46.21', lng: '6.14' }, countryCode: 'CH' } }, 'str'));
  note(`a pick with string coordinates, no centre key → ${strs.err ? strs.err.message : J(strs.value.cities[0])}`);
  ok(strs.err !== undefined && /\$\.pick/.test(strs.err.message),
    'a pick with string coordinates is refused at `$.pick…`, not at the city centre the caller never wrote',
    strs.err ? strs.err.message : 'accepted');
}

// ===========================================================================
head('D — `placeCount` end to end: the rescan, a v7 row read by a v8 build, hostile rows');
{
  const { trip } = loadEurope2026(core);
  const fresh = core.tripSummary(trip, IDX);
  note(`reference trip: placeCount ${fresh.placeCount}, places.located ${fresh.attribution.places.located}, summaryVersion ${fresh.summaryVersion}`);

  // D1. A v7 row read by a v8 build — the row a real user's IndexedDB holds this morning.
  const aged = { ...fresh, summaryVersion: 7 };
  delete aged.placeCount;
  const stale = core.travelStats([aged], '2026-12-31');
  ok(stale.seen.places === stale.located.places,
    'a gen-7 row degrades to `seen.places === located.places` rather than throwing',
    `${stale.seen.places} vs ${stale.located.places}`);
  ok(client.rowStatsReadable(aged) === client.rowStatsReadable(fresh),
    'R44-1\'s class: `rowStatsReadable` does not change its answer for a row with no `placeCount`',
    `${client.rowStatsReadable(aged)} vs ${client.rowStatsReadable(fresh)}`);
  ok(client.rowLifecycle(aged, '2026-12-31') === client.rowLifecycle(fresh, '2026-12-31'),
    '`rowLifecycle` is unmoved by the missing key');
  const hist = client.travelHistory({ library: [aged] }, '2026-12-31');
  ok(hist.ok === true, 'the client selector reports ok for a library of gen-7 rows', J(hist).slice(0, 200));

  // D2. Hostile stored values — a stored row is not a validated document (A-37 Part 3).
  const hostile = [undefined, null, -1, 1.5, NaN, Infinity, -Infinity, '95', {}, [], 1e21, Number.MAX_SAFE_INTEGER, true, -0];
  let worst = null;
  for (const v of hostile) {
    const row = { ...fresh, placeCount: v };
    const s = caught(() => core.travelStats([row], '2026-12-31'));
    if (s.err) { worst = `${J(v)} threw ${s.err.message}`; break; }
    const st = s.value;
    if (!(Number.isInteger(st.seen.places) && st.seen.places >= st.located.places && st.seen.places >= 0)) {
      worst = `${J(v)} → seen.places ${st.seen.places}`; break;
    }
  }
  ok(worst === null, '14 hostile `placeCount` values: `seen.places` stays a non-negative integer ≥ located, no throw', worst);
  note(`for reference, placeCount 1e21 → seen.places ${core.travelStats([{ ...fresh, placeCount: 1e21 }], '2026-12-31').seen.places} (a stored count is believed, exactly as \`stopCount\` is)`);
  const big = core.travelStats([{ ...fresh, placeCount: 4000 }], '2026-12-31');
  // **Updated at QA round 64.** This is no longer an open question: §8.4 **A-86** Part 5 RULES
  // it as a recorded residue with two triggers and no ceiling, and `countOf`'s docstring now
  // carries the reasoning where a builder tempted to add a cap will read it. It stays a GAP
  // because the *behaviour* is unchanged and the residue is live — the condition below is what
  // says so, and the day a ceiling lands this line turns into an `ok`.
  gap(big.seen.places === 4000,
    `a hand-edited row publishes \`seen.places\` ${big.seen.places} where the document holds ${fresh.placeCount} — RULED as a residue by A-86 Part 5 (no ceiling: for places the row IS the denominator, so a cap would be a number nobody measured), recorded in \`countOf\`'s docstring with its two triggers, neither of which has fired`,
    `a stored \`placeCount\` of 4000 no longer publishes 4000 (got ${big.seen.places}) — A-86 Part 5's residue has been closed and this line should be re-derived`);

  // D3. The invariant, over a hostile library rather than over one trip.
  const lib = [
    { ...fresh, id: 't1' },
    { ...fresh, id: 't2', placeCount: 0 },
    { ...fresh, id: 't3', placeCount: 3, attribution: { ...fresh.attribution, places: { located: 90, attributed: 90 } } },
  ];
  const many = core.travelStats(lib, '2026-12-31');
  ok(many.unattributed.places <= many.located.places && many.located.places <= many.seen.places,
    'unattributed ≤ located ≤ seen for places over a mixed library', J({ u: many.unattributed.places, l: many.located.places, s: many.seen.places }));

  // D4. The rescan, driven through the client store the way a boot does it.
  const storage = client.memoryStorage();
  const ports = () => ({ storage, file: client.memoryFile(), clock: client.fixedClockPort('2026-12-31'), ids: client.sequentialIdPort('r63-'), scheduler: client.immediateScheduler() });
  const v7row = { ...fresh, summaryVersion: 7 };
  delete v7row.placeCount;
  const seeded = await storage.saveIfVersion(trip.id, null, core.toJSON(trip), v7row);
  ok(seeded.ok === true, 'seeded a v7 row + its document into storage');
  const store = client.createStore({ ports: ports() });
  await store.refreshLibrary();
  const before = client.travelHistory(store.getState(), '2026-12-31');
  ok(before.ok && before.stats.seen.places === before.stats.located.places,
    'before the rescan the library reports the gen-7 answer', before.ok ? `${before.stats.seen.places}/${before.stats.located.places}` : before.message);
  const scanBefore = client.summaryScan(store.getState());
  ok(scanBefore.outdated.length === 1, 'the generic scan names the gen-7 row as outdated', J(scanBefore.outdated));
  await store.rescanSummaries();
  const row = store.getState().library[0];
  ok(row.summaryVersion === core.SUMMARY_VERSION && row.placeCount === fresh.placeCount,
    'the generic rescan brings the row to generation 8 and mints `placeCount` from the document',
    J({ v: row.summaryVersion, placeCount: row.placeCount }));
  const after = client.travelHistory(store.getState(), '2026-12-31');
  ok(after.ok && after.stats.seen.places === fresh.placeCount && after.stats.seen.places - after.stats.located.places === 1,
    'after the rescan `seen − located` is the one place with no coordinate', after.ok ? J(after.stats.seen) : after.message);
  const stored = await storage.listTrips();
  ok(stored[0].placeCount === fresh.placeCount, 'storage holds the rewritten row, not just the in-memory library', J(stored[0].placeCount));

  // D5. The rescan when the document will not open: the row must stay honest, not vanish.
  const st2 = client.memoryStorage();
  const badRow = { ...fresh, id: 'broken', summaryVersion: 7 };
  delete badRow.placeCount;
  await st2.saveIfVersion('broken', null, '{"schemaVersion":5,"id":"broken"', badRow);
  const store2 = client.createStore({ ports: { storage: st2, file: client.memoryFile(), clock: client.fixedClockPort('2026-12-31'), ids: client.sequentialIdPort('r63b-'), scheduler: client.immediateScheduler() } });
  await store2.refreshLibrary();
  await store2.rescanSummaries();
  const r2 = store2.getState().library[0];
  ok(r2 !== undefined && r2.summaryVersion === 7 && !('placeCount' in r2),
    'an unopenable document leaves its row at generation 7 — degraded, not deleted and not invented',
    J({ v: r2 && r2.summaryVersion, has: r2 && 'placeCount' in r2 }));
  const h2 = client.travelHistory(store2.getState(), '2026-12-31');
  ok(h2.ok === true, 'and the census still answers for that library', h2.ok ? '' : h2.message);
  note(`rescan.unreadable after the failed open: ${J(store2.getState().rescan.unreadable)}`);

  // D6. A trip with zero places, and a trip with zero days — the shapes the brief asks for.
  const empty = core.createTrip({ title: 'E', startDate: '2026-08-07', endDate: '2026-08-07' }, ctx('emp'));
  const erow = core.tripSummary(empty, IDX);
  ok(erow.placeCount === 0, 'a trip with no places mints `placeCount: 0`', erow.placeCount);
  const est = core.travelStats([erow], '2026-12-31');
  ok(est.seen.places === 0 && est.located.places === 0, 'and the census reports 0/0 rather than NaN', J(est.seen));
}

// ===========================================================================
head('E — the range check on both new subjects');
{
  const impossible = { lat: 91.5, lng: 500.25 };
  const t = trip1({ name: 'Bad', centre: impossible, pick: { rowId: 'ne:j64n0x', centre: impossible, countryCode: 'CH' } }, 'rng');
  const issues = core.validateTrip(t).filter((i) => i.code === 'lat_lng_out_of_range');
  ok(issues.length === 2, 'a city and its pick at {91.5, 500.25} report two errors', J(issues.map((i) => i.message)));
  ok(issues.every((i) => i.level === 'error' && i.params.cityKey === t.cities[0].key && typeof i.params.lat === 'number'),
    'each carries level error, `cityKey`, `lat` and `lng`', J(issues.map((i) => i.params)));
  ok(issues.every((i) => i.ref.kind === 'trip'), 'the ref is the trip — a city has no RefKind', J(issues.map((i) => i.ref)));
  const consumers = execSync(`grep -rn "lat_lng_out_of_range" ${JSON.stringify(join(CAIRN, 'packages/client/src'))} ${JSON.stringify(join(CAIRN, 'apps/web/src'))} || true`, { encoding: 'utf8' }).trim();
  // **Updated at QA round 64.** §8.4 A-86 Part 6 answers the rendered half two-sidedly (nothing
  // under `apps/web/src` reads `Issue`; `issuesForRef` has no caller) and `I-25` arms a tripwire
  // on the second measurement. What is still open is `issuesForRef`'s kind-ignoring filter, and
  // it is open exactly while that selector has no caller — so the condition is the measurement.
  gap(consumers === '',
    'a `lat_lng_out_of_range` issue whose `ref.kind` is `trip` is new: every previous one named a stop or a place, and `issuesForRef` filters on `i.ref.id` alone. A-86 Part 6 records the latent defect and `I-25` arms a tripwire (`test/stats-storage.test.ts`, section 7) that reddens the day a first caller appears — it is armed, not fixed',
    'a consumer of `lat_lng_out_of_range` now exists outside core — A-86 Part 6\'s trigger has fired and the kind must go into `issuesForRef`\'s signature');
  note(`consumers of the code outside core: ${consumers === '' ? 'none' : consumers.replace(new RegExp(CAIRN + '/', 'g'), '')}`);

  // Boundaries, one at a time. `inRange` is inclusive; the values a real device produces sit on
  // the ends of the domain.
  for (const [label, centre, want] of [
    ['exactly ±90/±180', { lat: 90, lng: 180 }, 0],
    ['exactly -90/-180', { lat: -90, lng: -180 }, 0],
    ['90.0000001', { lat: 90.0000001, lng: 0 }, 1],
    ['-0 / -0', { lat: -0, lng: -0 }, 0],
    ['180.00001 lng', { lat: 0, lng: 180.00001 }, 1],
  ]) {
    const tt = trip1({ name: 'B', centre }, `b${label.length}`);
    const n = core.validateTrip(tt).filter((i) => i.code === 'lat_lng_out_of_range').length;
    ok(n === want, `city centre ${label} → ${want} issue(s)`, n);
  }
  // A null centre is legal and silent; a pick alone is reported.
  const nullCentre = trip1({ name: 'Typed', centre: null }, 'nc');
  ok(core.validateTrip(nullCentre).filter((i) => i.code === 'lat_lng_out_of_range').length === 0,
    '`centre: null` reports nothing — the `Place` arm\'s `at === null` branch is not copied');
  const pickOnly = trip1({ name: 'P', centre: null, pick: { rowId: 'ne:j64n0x', centre: impossible, countryCode: 'CH' } }, 'po');
  ok(core.validateTrip(pickOnly).filter((i) => i.code === 'lat_lng_out_of_range').length === 1,
    'a legal (null) centre with an impossible pick reports exactly one');
  // Attribution is untouched, which is the ruling's own clause 3.
  const s = core.tripSummary(t, IDX).cities[0];
  note(`the impossible-point city still reports ${s.countryCode}/${s.countrySource} beside the errors`);
  // Non-finite coordinates cannot reach a City through any door — the parser refuses them.
  for (const v of [NaN, Infinity]) {
    const r = caught(() => trip1({ name: 'B', centre: { lat: v, lng: 0 } }, 'nf'));
    ok(r.err !== undefined, `a ${String(v)} latitude is refused at the door, so \`inRange\`'s finite test is a belt`, r.err ? '' : 'accepted');
  }
  const { trip } = loadEurope2026(core);
  const refIssues = core.validateTrip(trip).filter((i) => i.code === 'lat_lng_out_of_range');
  const citySubject = refIssues.filter((i) => i.ref.kind === 'trip');
  ok(citySubject.length === 0,
    'the whole reference trip reports zero CITY-subject out-of-range issues', J(citySubject));
  note(`(it reports ${refIssues.length} \`lat_lng_out_of_range\` issue overall — the Place arm's "${refIssues[0] ? refIssues[0].message : ''}", which is the SAME code used for a MISSING coordinate. I-24's criterion says the reference trip reports "zero of them"; scoped to the two new subjects that is true, and unscoped it is false.)`);
}

// ===========================================================================
head("F — A-39 Part 11's covering table, re-derived from the file's own text");
{
  const text = src('test/stats-storage.test.ts');
  const rows = [...text.matchAll(/^ {2}\{ n: *(\d+), s: '([^']+)', +d: '([^']+)', +c: '([^']+)', +v: '([^']+)', +b: '([^']+)', +arm: (\d) \},$/gm)]
    .map((m) => ({ n: +m[1], s: m[2], d: m[3], c: m[4], v: m[5], b: m[6], arm: +m[7] }));
  ok(rows.length === 45, 'the covering table is 45 rows, counted from the source text', rows.length);
  const gens = [...new Set(rows.map((r) => r.s))], docs = [...new Set(rows.map((r) => r.d))];
  ok(gens.length === 9 && docs.length === 5, '|S| = 9 and |D| = 5 in the table itself', J({ gens: gens.length, docs: docs.length }));
  const pairs = rows.map((r) => `${r.s}|${r.d}`);
  ok(new Set(pairs).size === 45, 'every S×D pair appears exactly once — the pairwise lower bound is achieved, so 45 is minimal', new Set(pairs).size);
  ok(gens.length * docs.length === 45, 'and 45 is the product, not a coincidence');
  ok(new Set(rows.map((r) => `${r.s}|${r.c}`)).size === 36 && new Set(rows.map((r) => `${r.v}|${r.s}`)).size === 18,
    'S×C is 36 and V×S is 18 — the numbers the test TITLE claims',
    J({ sc: new Set(rows.map((r) => `${r.s}|${r.c}`)).size, vs: new Set(rows.map((r) => `${r.v}|${r.s}`)).size }));
  ok(rows.map((r) => r.n).every((n, i) => n === i + 1), 'the rows are numbered 1..45');
  ok(rows.filter((r) => r.arm === 2).length === 23 && rows.filter((r) => r.arm === 3).length === 22, 'the arms split 23/22');
  ok(core.SUMMARY_VERSION + 1 === gens.length, "A-85 Part 6's law holds against the shipped constant: |S| = SUMMARY_VERSION + 1");
  // The assertion MESSAGES that did not move with the table.
  const staleMsgs = [
    ['32 S×C pairs', 36],
    ['16 V×S pairs', 18],
  ];
  for (const [needle, real] of staleMsgs) {
    const line = text.split('\n').findIndex((l) => l.includes(needle)) + 1;
    ok(line === 0, `no assertion message still says "${needle}" — the table now covers ${real}`, `test/stats-storage.test.ts:${line}`);
  }
  // The `absent` ledger: `placeCount` arrives at generation 8, so every entry below it names it.
  const ledger = [...text.matchAll(/\{ name: '(gen-[^']+)', version: ([^,]+), absent: \[([^\]]*)\]/g)]
    .map((m) => ({ name: m[1], version: m[2], absent: m[3] }));
  const below = ledger.filter((g) => g.version !== 'null' && !Number.isNaN(+g.version) && +g.version < 8);
  ok(below.every((g) => g.absent.includes("'placeCount'")), 'every ledger entry below gen-8 names `placeCount` in `absent`', J(below.filter((g) => !g.absent.includes('placeCount')).map((g) => g.name)));
  const gen8 = ledger.find((g) => g.name === 'gen-8');
  note(`gen-8 ledger entry: ${gen8 ? J(gen8) : 'ABSENT'}`);
}

// ===========================================================================
head("G — N6's substitute, measured: what the injected `at === null` branch would redden");
{
  // The builder disclosed that ROADMAP's N6 oracle is wrong. Measure the claim rather than
  // accept it: the fault is *"copy the `Place` arm's `at === null` branch onto `City.centre`"*,
  // so simulate the injected predicate over the corpora the criterion names.
  const injected = (trip) => trip.cities.filter((c) => c.centre === null).length;
  const { trip } = loadEurope2026(core);
  ok(injected(trip) === 0,
    "N6's stated oracle is unreachable: the reference trip has no city with a null centre, so the injected branch cannot redden it",
    injected(trip));
  note(`reference trip cities: ${trip.cities.length}, of which null-centre: ${injected(trip)}`);
  const nullCentre = trip1({ name: 'Typed', centre: null }, 'n6');
  ok(injected(nullCentre) === 1, 'the substitute — a dedicated `centre: null` test — is reddened by the same fault', injected(nullCentre));
  // Is the substitute as strong? Its reach is one assertion in one file; the control it replaced
  // was the whole reference trip. Measure what else in the committed corpus would have caught it.
  let legacyNull = 0, legacyCities = 0;
  for (const f of ['fixtures/legacy/trip-598cd7f.v1.json', 'fixtures/legacy/trip-origin-centre.v3.json', 'fixtures/legacy/trip-picked.v4.json']) {
    let doc;
    try { doc = core.fromJSON(src(f)); } catch (e) { note(`${f}: ${e.message}`); continue; }
    legacyCities += doc.cities.length;
    legacyNull += injected(doc);
  }
  note(`committed legacy fixtures: ${legacyCities} cities, ${legacyNull} with a null centre`);
  const greps = execSync(`grep -rln "centre: null" ${JSON.stringify(join(CAIRN, 'packages/core/test'))} || true`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean).map((p) => p.replace(CAIRN + '/', ''));
  note(`core tests naming a null centre: ${J(greps)}`);
}

// ===========================================================================
head('H — standing constraints on the changed files, and the negative controls');
{
  const changed = execSync('git show --stat --name-only --format= 9817fe0', { cwd: CAIRN, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  note(`files in 9817fe0: ${changed.length}`);
  ok(!changed.some((f) => f.endsWith('.tsx')), 'no `.tsx` in the increment', J(changed.filter((f) => f.endsWith('.tsx'))));
  ok(!changed.some((f) => f.includes('apps/web/') || f.includes('docs/design/') || f.includes('packages/client/src/')),
    'no `apps/web/`, no `docs/design/`, no `packages/client/src/`', J(changed.filter((f) => f.includes('apps/web/') || f.includes('docs/design/') || f.includes('packages/client/src/'))));
  ok(!changed.some((f) => /package-lock|gazetteer\.gen|gen-gazetteer|fixtures\/golden\/gazetteer/.test(f)), 'no lockfile, no corpus, no gazetteer golden', J(changed));
  const qaTouched = changed.filter((f) => f.includes('/qa/'));
  ok(qaTouched.length === 1 && qaTouched[0].endsWith('i7a-idb-rowkeys.mjs'), 'exactly one `qa/` file, the one A-36 Part 4 obliges', J(qaTouched));

  // Comments talk ABOUT these APIs constantly, so the census is over code lines only.
  const codeLines = (dir, re) => execSync(`grep -rn "${re}" ${JSON.stringify(join(CAIRN, dir))} --include=*.ts || true`, { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean)
    .filter((l) => { const body = l.slice(l.indexOf(':', l.indexOf(':') + 1) + 1).trim(); return !(body.startsWith('*') || body.startsWith('//') || body.startsWith('/*')); });
  const ambient = [...codeLines('packages/core/src', 'Date\\.now()\\|Math\\.random()\\|crypto\\.randomUUID'), ...codeLines('packages/client/src', 'Date\\.now()\\|Math\\.random()\\|crypto\\.randomUUID')];
  ok(ambient.length === 0, 'determinism: no ambient clock or randomness in core or client code', J(ambient));
  const dom = codeLines('packages/client/src', 'document\\.getElementById\\|document\\.querySelector\\|document\\.createElement\\|window\\.\\|localStorage\\|indexedDB\\|from .react');
  ok(dom.length === 0, 'no DOM and no React in packages/client/src', J(dom));
  for (const p of ['packages/core/package.json', 'packages/client/package.json']) {
    const deps = Object.keys(JSON.parse(src(p)).dependencies ?? {}).filter((d) => d !== '@cairn/core');
    ok(deps.length === 0, `zero third-party runtime dependencies in ${p}`, J(deps));
  }
  ok(core.SCHEMA_VERSION === 5, 'SCHEMA_VERSION is 5 — no record shape moved', core.SCHEMA_VERSION);
  ok(core.SUMMARY_VERSION === 8, 'SUMMARY_VERSION is 8', core.SUMMARY_VERSION);
  const exports = Object.keys(core).length;
  ok(exports === 88, '§2.10 export surface is 88, counted from the module', exports);
  const subpath = JSON.parse(src('packages/core/package.json')).exports['./gazetteer'];
  const gzExports = Object.keys(await import(pathToFileURL(join(CAIRN, 'packages/core', subpath)).href)).filter((k) => k !== 'default');
  ok(gzExports.length === 1 && gzExports[0] === 'GAZETTEER', 'the @cairn/core/gazetteer subpath is exactly one symbol', J(gzExports));

  // The disclosed negative control: `cityPick.test.ts` is edited, and the claim is that only the
  // version pin and its title moved. Verified by diff rather than by reading the file.
  const diff = execSync('git diff 9817fe0^ 9817fe0 -- ./packages/core/test/cityPick.test.ts', { cwd: CAIRN, encoding: 'utf8' });
  const removed = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
  const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  ok(removed.length === 3 && removed.every((l) => /SUMMARY_VERSION|SCHEMA_VERSION|test\(/.test(l)),
    'cityPick.test.ts: every REMOVED line is the version pin or its title — no pick or staleness assertion was weakened',
    J(removed));
  ok(!added.some((l) => /assert\.(equal|deepEqual|ok|throws)/.test(l) && !/SUMMARY_VERSION|SCHEMA_VERSION/.test(l)),
    'cityPick.test.ts: no assertion was added that is not the version pin', J(added.filter((l) => /assert\./.test(l))));
  const pickAsserts = (rev) => execSync(`git show ${rev}:./packages/core/test/cityPick.test.ts`, { cwd: CAIRN, encoding: 'utf8' })
    .split('\n').filter((l) => /assert\./.test(l) && !/SUMMARY_VERSION|SCHEMA_VERSION/.test(l));
  const b = pickAsserts('9817fe0^'), a = pickAsserts('9817fe0');
  ok(b.length === a.length && b.every((l, i) => l === a[i]),
    `cityPick.test.ts: all ${a.length} non-version assertions are byte-for-byte unchanged`,
    `${b.length} → ${a.length}`);
}

// ===========================================================================
head('I — the aged-row fixtures: a row that claims to predate generation 8 and carries its key');
{
  // A-39 Part 4's sub-ruling, which this increment's own N8 injects: a fixture aged by the
  // NUMBER alone is invisible to a key-presence guard. `qa/i7a-idb-rowkeys.mjs`'s gen-1 seed got
  // the treatment right (its `gone` list gained `placeCount`); its plain-Node counterparts did
  // not, and one of them is R44-1's own fixture.
  const cases = [
    ['packages/client/test/row-stats-readable.test.ts', 'versionOneRow', /function versionOneRow[\s\S]*?\n\}/],
    ['packages/client/test/summary-rescan.test.ts', 'preI6Row', /function preI6Row[\s\S]*?\n\}/],
    ['packages/client/test/summary-refresh.test.ts', 'staleRow', /function staleRow[\s\S]*?\n\}/],
  ];
  for (const [file, fn, re] of cases) {
    const body = re.exec(src(file))[0];
    const mints = /placeCount/.test(body);
    const deletes = /delete r\.placeCount/.test(body);
    const built = /= row\(init\)/.test(body);
    const carries = built ? !deletes : mints;
    note(`${file}:${fn} — ${carries ? 'CARRIES `placeCount`' : 'lacks `placeCount`'}`);
    ok(!carries,
      `${fn} represents a row minted BEFORE generation 8 and must not carry generation 8's key`,
      body.split('\n').filter((l) => /placeCount|delete r\./.test(l)).join(' | '));
  }
  note('measured separately with `npx tsc --noEmit --strict … cast.ts`: an object literal missing `placeCount` and written `as unknown as TripSummaryRow` compiles, exit 0 — so summary-rescan.test.ts:84\'s reason (*"the type requires it"*) is not the reason.');
}

// ===========================================================================
head('J — R62-6: the guard is live, and what a live guard costs');
{
  // I-24 Part 4 binds `row.cities` once so the `Array.isArray` guard can answer instead of the
  // `for…of` one line down throwing. The guard is right (A-37 Part 3). What it changes is the
  // FAILURE MODE, and that is worth measuring rather than assuming.
  const { trip } = loadEurope2026(core);
  const good = core.tripSummary(trip, IDX);
  const corrupt = { ...good, id: 'corrupt', cities: 'AT,HR,CZ' };
  const s = caught(() => core.travelStats([good, corrupt], '2026-12-31'));
  ok(s.err === undefined, 'a row whose `cities` is a string no longer throws — the guard answers', s.err && s.err.message);
  // **Updated at QA round 64 (R64-6).** *"contributes 0 and says so nowhere"* stopped being true
  // at `I-25`: `TravelStats.unreadableCityLists` counts the absorbed row and `cli.ts stats`
  // prints it. The note now reports both numbers rather than the sentence that went stale.
  if (!s.err) note(`the census over {good, corrupt} reports seen.cities ${s.value.seen.cities} — the corrupt row contributes 0, and since I-25 it says so: unreadableCityLists ${s.value.unreadableCityLists}`);
  const hist = client.travelHistory({ library: [good, corrupt] }, '2026-12-31');
  ok(hist.ok === true, '`travelHistory` returns ok — no banner, no named row');
  ok(client.rowStatsReadable(corrupt) === false, '…while `rowStatsReadable` says that row is NOT readable');
  // **Updated at QA round 64 (R64-6).** `I-25` closed the half of this that was about the count:
  // the two predicates are reconciled through `TravelStats.unreadableCityLists`, which `cli.ts
  // stats` prints. What is still open is the half A-59 Part 5 owns — no CLIENT surface names the
  // row, because `rowStatsReadable` is still consulted only inside `travelHistory`'s `catch`
  // (`selectors/index.ts:291`) and the success branch carries no `unreadableRows`. The condition
  // below is that measurement, so the day a second consumer appears this turns into an `ok`.
  const counted = !s.err && s.value.unreadableCityLists === 1;
  ok(counted, 'I-25: the absorbed row IS counted now — `unreadableCityLists` reconciles the two predicates', s.err ? s.err.message : `got ${s.value.unreadableCityLists}`);
  const consumersOfPredicate = execSync(`grep -rln "rowStatsReadable" ${JSON.stringify(join(CAIRN, 'packages/client/src'))} ${JSON.stringify(join(CAIRN, 'apps/web/src'))} || true`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  gap(hist.ok === true && consumersOfPredicate.length === 1,
    `the COUNT is closed and the NAME is not: \`travelHistory\` still returns ok:true with no banner and no named row, and \`rowStatsReadable\` still has exactly one consumer (${consumersOfPredicate.map((f) => f.replace(CAIRN + '/', '')).join(', ')}) — inside the \`catch\` this guard made unreachable. A-59 Part 5's *recompute* affordance is the thing that would close it, and it is unscheduled by ruling`,
    'a second consumer of `rowStatsReadable` exists, or `travelHistory` now refuses — A-59 Part 5\'s treatment has landed and this line should be re-derived');
}

console.log(`\nCOMPLETE — ${fails} FAIL, ${gaps} GAP`);
process.exit(fails > 0 ? 1 : 0);
