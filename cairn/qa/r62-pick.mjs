/**
 * QA round 62 — the adversarial pass over I-22a / §8.4 **A-84**, against commit `bd0c25e`.
 *
 * Run from `cairn/`:  `node --experimental-strip-types qa/r62-pick.mjs`
 *
 * A-84 Part 3 clause 3 makes a pick inert by an **exact float equality** on `lat`/`lng`, asked at
 * derive time rather than enforced at the doors, and justifies the exactness with three claims:
 * *"both values are 4 dp decimals"*, *"JSON round-trips them unchanged"*, and *"the migration
 * ladder never rewrites a located coordinate"*. This probe tests the claims rather than accepting
 * them, over the **whole** shipped corpus rather than over Geneva, and then goes after the parser,
 * the door census, the migration ladder and `travelStats.seen`.
 *
 * A `FAIL` line is a finding; a `note` line is a recorded fact; a `GAP` line is a design question
 * routed rather than asserted. The run ends with a `COMPLETE` line — a run without one is
 * INCOMPLETE and its counts may not be quoted. It writes nothing: `fixtures/` is read only.
 *
 *   A  the mint × the shape rule × the equality, over all 7,342 shipped rows
 *   B  the staleness rule's float claims: -0, sub-4dp precision, non-finite, JSON identity
 *   C  a pick that is STALE THE INSTANT IT IS MADE, through the only mint that exists
 *   D  `parseCityPick` past the builder's 22 refusals
 *   E  the door census: can a malformed or partial pick reach a stored document?
 *   F  the ladder: the three committed fixtures, and a pick riding a rung that rewrites a centre
 *   G  `travelStats.seen` — the lower bound, and what a shipped surface prints
 *   H  standing constraints on the changed files
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const gz = await import(pathToFileURL(join(CAIRN, 'packages/core/src/geo/gazetteer.gen.ts')).href);
const migrate = await import(pathToFileURL(join(CAIRN, 'packages/core/src/serialize/migrate.ts')).href);

let fails = 0, gaps = 0;
const ok = (c, m, x) => { if (c) console.log(`  ok   ${m}`); else { fails++; console.log(`  FAIL ${m}${x === undefined ? '' : `  — ${x}`}`); } };
const note = (m) => console.log(`  note ${m}`);
const gap = (m) => { gaps++; console.log(`  GAP  ${m}`); };
const head = (s) => console.log(`\n== ${s}`);
const J = (v) => JSON.stringify(v);

const ctx = () => ({ ids: core.sequentialIds('r62'), now: '2026-01-01', actorUserId: 'local:self' });
const IDX = core.COUNTRY_INDEX;
const ROWS = gz.GAZETTEER.rows;
const DRAWABLE = new Set(IDX.countries.map((e) => e.code));

const trip1 = (cityInit) => core.createTrip(
  { title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [cityInit] }, ctx(),
);
const city0 = (trip) => core.tripSummary(trip, IDX).cities[0];
/** Write a `City` straight into the stored document — what a hand edit or a stale file holds. */
function rawCity(cityPatch) {
  const trip = trip1({ name: 'X' });
  const doc = JSON.parse(core.toJSON(trip));
  doc.cities[0] = { ...doc.cities[0], ...cityPatch };
  return doc;
}
const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };

const GENEVA = ROWS.find((r) => r.fold === 'geneva' && r.countryCode === 'CH');
const VIENNA_ROW = ROWS.find((r) => r.fold === 'vienna' && r.countryCode === 'AT');
note(`Geneva row ${J(GENEVA)}`);
note(`countryOf(Geneva.centre) = ${J(core.countryOf(GENEVA.centre, IDX))} — the coarse ring's answer`);

// ===========================================================================
head('A — the mint × the shape rule × the equality, over all 7,342 shipped rows');
{
  const RE = /^[a-z]{2,8}:[A-Za-z0-9_-]{1,32}$/;
  let badId = 0, badIdEx = [];
  for (const r of ROWS) if (!RE.test(r.id)) { badId++; if (badIdEx.length < 5) badIdEx.push(`${r.id} (${r.name})`); }
  ok(badId === 0, 'every shipped rowId is one `parseCityPick` accepts', `${badId} fail: ${J(badIdEx)}`);

  // The mint's code mapping, against the corpus's own alphabet.
  const shapes = new Map();
  for (const r of ROWS) { const k = /^[A-Z]{2}$/.test(r.countryCode) ? '[A-Z]{2}' : J(r.countryCode); shapes.set(k, (shapes.get(k) ?? 0) + 1); }
  note(`corpus countryCode shapes: ${J([...shapes])}`);

  // The real claim: mint a pick, put the row's own centre on the city, take the document all the
  // way through `toJSON`/`fromJSON`, and assert the pick is still LIVE and still attributes.
  let notLive = 0, notPicked = 0, refused = 0, undrawable = 0, nullCode = 0, liveEx = [];
  const docTemplate = JSON.parse(core.toJSON(trip1({ name: 'X' })));
  for (const r of ROWS) {
    const pick = core.cityPickFromRow(r);
    const doc = { ...docTemplate, cities: [{ ...docTemplate.cities[0], name: r.name, countryCode: 'ZZ', centre: { lat: r.centre.lat, lng: r.centre.lng }, pick }] };
    let reopened;
    try { reopened = core.fromJSON(JSON.parse(JSON.stringify(doc))); } catch (e) { refused++; if (liveEx.length < 5) liveEx.push(`${r.id} refused: ${e.message}`); continue; }
    const c = reopened.cities[0];
    const live = c.centre !== null && c.centre.lat === c.pick.centre.lat && c.centre.lng === c.pick.centre.lng;
    if (!live) { notLive++; if (liveEx.length < 5) liveEx.push(`${r.id} ${J(c.centre)} vs ${J(c.pick.centre)}`); continue; }
    const row = core.tripSummary(reopened, IDX).cities[0];
    if (pick.countryCode === null) { nullCode++; continue; }
    if (!DRAWABLE.has(pick.countryCode)) { undrawable++; continue; }
    if (!(row.countrySource === 'picked' && row.countryCode === pick.countryCode)) { notPicked++; if (liveEx.length < 5) liveEx.push(`${r.id} -> ${J(row)}`); }
  }
  // A re-decode of the packed corpus must produce BIT-IDENTICAL doubles, or a pick minted from
  // one decode would be stale against a city centred from another. `parseInt(n,36) / 1e4` is
  // deterministic, but that is the claim rather than the measurement.
  {
    const gzsrc = await import(pathToFileURL(join(CAIRN, 'packages/core/src/geo/gazetteer.ts')).href);
    const packed = readFileSync(join(CAIRN, 'packages/core/src/geo/gazetteer.gen.ts'), 'utf8');
    const m = packed.match(/const PACKED = ['\u0060]([\s\S]*?)['\u0060];/);
    let redecodeChecked = false;
    if (m) {
      const again = gzsrc.decodeGazetteer({ source: 'redecode' }, m[1]);
      let diff = 0;
      for (let i = 0; i < ROWS.length; i++) {
        const a = ROWS[i], b = again.rows[i];
        if (!b || !Object.is(a.centre.lat, b.centre.lat) || !Object.is(a.centre.lng, b.centre.lng)) diff++;
      }
      ok(diff === 0, 'a SECOND decode of the packed corpus yields bit-identical centres (Object.is over all rows)', `${diff} rows differ`);
      redecodeChecked = true;
    }
    if (!redecodeChecked) note('could not isolate PACKED to re-decode it — the re-decode claim is asserted only through the JSON round trip below');
  }

  ok(refused === 0, 'every minted pick survives `toJSON` -> `JSON` -> `fromJSON`', `${refused} refused: ${J(liveEx)}`);
  ok(notLive === 0, 'every minted pick is LIVE after a full JSON round trip — the exactness claim, over the corpus', `${notLive} stale: ${J(liveEx)}`);
  ok(notPicked === 0, 'every live pick with a drawable code reports {that code, picked}', `${notPicked} not picked: ${J(liveEx)}`);
  note(`rows whose minted pick states no country: ${nullCode}; rows whose code the index cannot draw: ${undrawable}`);
}

// ===========================================================================
head('B — the staleness rule\'s float claims');
{
  // B1 — negative zero. JSON.stringify(-0) is "0", so -0 is the ONE double that does not
  // round-trip. `===` treats -0 and 0 as equal, so it cannot flip liveness. Measured, not assumed.
  const nz = core.fromJSON(rawCity({ centre: { lat: -0, lng: -0 }, pick: { rowId: 'ne:z', centre: { lat: -0, lng: -0 }, countryCode: 'CH' } }));
  const c = nz.cities[0];
  ok(Object.is(c.centre.lat, -0) || c.centre.lat === 0, 'a -0 centre parses', J(c.centre));
  ok(c.centre.lat === c.pick.centre.lat && c.centre.lng === c.pick.centre.lng, '-0/-0 is LIVE');
  const mixed = core.fromJSON(rawCity({ centre: { lat: 0, lng: 0 }, pick: { rowId: 'ne:z', centre: { lat: -0, lng: -0 }, countryCode: 'CH' } }));
  ok(mixed.cities[0].centre.lat === mixed.cities[0].pick.centre.lat, '0 vs -0 is LIVE (=== does not distinguish them)');
  const rt = JSON.parse(core.toJSON(nz));
  note(`-0 through toJSON: centre ${J(rt.cities[0].centre)}, pick.centre ${J(rt.cities[0].pick.centre)} — both normalise together, so liveness is preserved`);

  // B2 — sub-4-dp precision. A-84 says "both values are 4 dp decimals". Nothing enforces that.
  const hi = { lat: 46.2100000000001, lng: 6.1400000000002 };
  const t = core.fromJSON(rawCity({ centre: hi, pick: { rowId: 'ne:j64n0x', centre: hi, countryCode: 'CH' } }));
  ok(t.cities[0].centre.lat === t.cities[0].pick.centre.lat, 'a 13-dp pair survives the parser and stays LIVE');
  const rt2 = core.fromJSON(JSON.parse(core.toJSON(t)));
  ok(rt2.cities[0].centre.lat === rt2.cities[0].pick.centre.lat, 'and stays LIVE through a full JSON round trip');
  note('so the "4 dp" half of the justification is not enforced anywhere — but the "JSON round-trips unchanged" half is true for EVERY double, not only 4 dp ones, because JSON.stringify emits the shortest round-tripping decimal. The claim is stronger than the reason given for it.');

  // B3 — non-finite. `numOf` requires finite, so a NaN can never enter a stored coordinate,
  // which is what would make the equality permanently false.
  for (const [label, v] of [['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity]]) {
    const e1 = threw(() => trip1({ name: 'X', centre: { lat: v, lng: 0 }, pick: { rowId: 'ne:z', centre: GENEVA.centre, countryCode: 'CH' } }));
    const e2 = threw(() => trip1({ name: 'X', centre: GENEVA.centre, pick: { rowId: 'ne:z', centre: { lat: v, lng: 0 }, countryCode: 'CH' } }));
    ok(e1 !== null && e2 !== null, `${label} is refused at the door on BOTH centre and pick.centre`, `${e1?.message} / ${e2?.message}`);
  }

  // B4 — does any shipped path rewrite a located coordinate? Census by grep, then the one rung
  // that does write a centre, driven in F2.
  const src = ['build/createTrip.ts', 'build/copyStop.ts', 'build/commit.ts', 'serialize/migrate.ts', 'serialize/fromJSON.ts', 'serialize/toJSON.ts', 'import/legacyDays.ts', 'derive/summary.ts']
    .map((f) => [f, readFileSync(join(CAIRN, 'packages/core/src', f), 'utf8')]);
  const writers = src.filter(([, s]) => /centre:\s*(?!c\.centre === null|null\b)/.test(s)).map(([f]) => f);
  note(`files that write a \`centre:\` field at all: ${J(writers)}`);
  const round = src.filter(([, s]) => /toFixed|Math\.round|\* 1e4|\/ 1e4/.test(s)).map(([f]) => f);
  ok(round.length === 0, 'no core write path quantises a coordinate (toFixed / Math.round / 1e4)', J(round));
}

// ===========================================================================
head('C — a pick that is STALE THE INSTANT IT IS MADE');
{
  const pick = core.cityPickFromRow(GENEVA);
  // C1 — the shortest call a picker UI would write: name + pick, no centre. `CityInit.centre`
  // defaults to null (I-22), so the pick is stale at birth and attributes nothing.
  const t = trip1({ name: 'Geneva', pick });
  const c = city0(t);
  note(`createTrip({name, pick}) with no centre -> stored centre ${J(t.cities[0].centre)}, pick ${J(t.cities[0].pick)}`);
  ok(t.cities[0].pick !== null, 'the pick is stored');
  const born = c.countrySource === 'picked';
  if (!born) {
    gap(`a pick minted from a row and handed to \`createTrip\` WITHOUT a centre is stale at birth: the city reports ${J({ countryCode: c.countryCode, countrySource: c.countrySource })}, not {CH, picked}. Nothing warns, no Issue, no default.`);
  } else {
    ok(true, 'createTrip fills the centre from the pick');
  }
  const issues = core.validateTrip(t).filter((i) => JSON.stringify(i).includes('pick') || JSON.stringify(i).includes('centre'));
  ok(issues.length === 0, 'validateTrip says nothing about it (A-84 Part 4 item 2, as ruled)', J(issues));

  // C2 — the same through the patch door: pick a row for a city that already has a typed centre.
  const typed = trip1({ name: 'Geneva', centre: { lat: 46.2, lng: 6.15 } });
  const patched = core.setTripMeta(typed, { cities: [{ ...typed.cities[0], pick }] }, ctx());
  const pc = core.tripSummary(patched, IDX).cities[0];
  if (pc.countrySource !== 'picked') {
    gap(`\`setTripMeta\` accepting a pick WITHOUT the matching centre stores a pick that is inert from the first write: ${J({ countryCode: pc.countryCode, countrySource: pc.countrySource })}. The only correct call writes \`pick\` and \`centre\` together, and nothing in the type, the door or \`validateTrip\` says so.`);
  }
  // C3 — the correct call, for contrast.
  const right = core.setTripMeta(typed, { cities: [{ ...typed.cities[0], pick, centre: { lat: pick.centre.lat, lng: pick.centre.lng } }] }, ctx());
  const rc = core.tripSummary(right, IDX).cities[0];
  ok(rc.countryCode === 'CH' && rc.countrySource === 'picked', 'writing pick AND centre together reports {CH, picked}', J(rc));
}

// ===========================================================================
head('D — `parseCityPick` past the builder\'s 22 refusals');
{
  const base = { rowId: 'ne:j64n0x', centre: { lat: 46.21, lng: 6.14 }, countryCode: 'CH' };
  const open = (p) => core.fromJSON(rawCity({ centre: { lat: 46.21, lng: 6.14 }, pick: p }));

  // D1 — extra keys are dropped rather than carried (A-20's rule, one record over).
  const extra = open({ ...base, label: 'Genève, Switzerland', population: 183981 });
  ok(!('label' in extra.cities[0].pick) && !('population' in extra.cities[0].pick),
    'an unenumerated key on the pick does not survive the parser', J(extra.cities[0].pick));

  // D2 — prototype pollution through the pick and through its centre.
  const poll = JSON.parse(`{"rowId":"ne:j64n0x","centre":{"lat":46.21,"lng":6.14,"__proto__":{"polluted":1}},"__proto__":{"polluted2":1},"countryCode":"CH"}`);
  const pd = open(poll);
  ok({}.polluted === undefined && {}.polluted2 === undefined && pd.cities[0].pick.polluted === undefined,
    'a `__proto__` key inside a pick pollutes nothing', J(Object.getPrototypeOf(pd.cities[0].pick) === Object.prototype));

  // D3 — rowId boundaries, both ends of both quantifiers.
  const idCases = [
    ['n:x  (1-letter prefix)', 'n:x', false], ['ne:x  (2)', 'ne:x', true],
    ['abcdefgh:x  (8)', 'abcdefgh:x', true], ['abcdefghi:x  (9)', 'abcdefghi:x', false],
    ['32-char row part', `ne:${'a'.repeat(32)}`, true], ['33-char row part', `ne:${'a'.repeat(33)}`, false],
    ['NE:x  (uppercase prefix)', 'NE:x', false], ['ne:a:b  (two colons)', 'ne:a:b', false],
    ['ne:-  (row part is a dash)', 'ne:-', true], ['ne:_x', 'ne:_x', true],
    ['ne:x\\n  (trailing newline)', 'ne:x\n', false], ['\\nne:x', '\nne:x', false],
  ];
  for (const [label, rowId, shouldOpen] of idCases) {
    const e = threw(() => open({ ...base, rowId }));
    ok(shouldOpen ? e === null : e !== null && e.path === '$.cities[0].pick.rowId',
      `rowId ${label} ${shouldOpen ? 'opens' : 'is refused at $.cities[0].pick.rowId'}`,
      e === null ? 'opened' : `${e.constructor.name} at ${e.path}: ${e.message}`);
  }

  // D4 — a boxed String is not a string.
  const boxed = threw(() => core.fromJSON(rawCity({ centre: base.centre, pick: { ...base, countryCode: Object('CH') } })));
  ok(boxed !== null, 'a boxed `String` countryCode is refused', boxed === null ? 'accepted' : boxed.message);

  // D5 — the pick's centre is NOT range-checked, and `validateTrip` has no rule for it (A-84
  // Part 4 item 2). A pick can therefore claim a point off the globe and still attribute — as
  // long as the city stands on the same impossible point.
  const off = { lat: 91.5, lng: 500.25 };
  const wild = open({ rowId: 'ne:j64n0x', centre: off, countryCode: 'CH' });
  const wildCity = core.fromJSON(rawCity({ centre: off, pick: { rowId: 'ne:j64n0x', centre: off, countryCode: 'CH' } }));
  const wr = core.tripSummary(wildCity, IDX).cities[0];
  note(`a pick at ${J(off)} parses: ${J(wild.cities[0].pick)}`);
  if (wr.countrySource === 'picked') {
    note(`a city standing at ${J(off)} with a pick there reports ${J({ c: wr.countryCode, s: wr.countrySource })} — off-globe coordinates attribute, because the pick's centre is not range-checked and A-84 Part 4 item 2 gives it no validateTrip rule`);
    const iss = core.validateTrip(wildCity).map((i) => i.code);
    note(`validateTrip on that trip: ${J(iss)}`);
  }

  // D6 — an extra key on the pick's centre.
  const alt = open({ ...base, centre: { lat: 46.21, lng: 6.14, alt: 5 } });
  ok(!('alt' in alt.cities[0].pick.centre), 'an `alt` key on the pick\'s centre is dropped by `parseCentre`', J(alt.cities[0].pick.centre));

  // D7 — the two accepted shapes, and everything else.
  for (const [label, v] of [['[]', []], ['0', 0], ['false', false], ['""', ''], ['a string', 'ne:j64n0x']]) {
    const e = threw(() => open(v));
    ok(e !== null, `pick as ${label} is refused`, e === null ? 'accepted' : `${e.path}`);
  }
  const absent = threw(() => { const d = rawCity({ centre: base.centre }); delete d.cities[0].pick; return core.fromJSON(d); });
  ok(absent !== null && absent.path === '$.cities[0].pick', 'an ABSENT pick is refused by the parser (only the rung supplies it)', absent === null ? 'accepted' : absent.path);
}

// ===========================================================================
head('E — the door census: can a malformed or partial pick reach a stored document?');
{
  const bad = { rowId: ':', centre: { lat: 46.21, lng: 6.14 }, countryCode: 'CH' };
  const partial = { rowId: 'ne:j64n0x' }; // no centre, no countryCode — the "half-typed" pick
  const t = trip1({ name: 'Geneva', centre: { lat: 46.21, lng: 6.14 } });

  const doors = [
    ['createTrip', (p) => trip1({ name: 'G', centre: { lat: 46.21, lng: 6.14 }, pick: p })],
    ['setTripMeta', (p) => core.setTripMeta(t, { cities: [{ ...t.cities[0], pick: p }] }, ctx())],
  ];
  for (const [name, fn] of doors) {
    for (const [label, p] of [['malformed rowId', bad], ['partial (no centre)', partial]]) {
      const e = threw(() => fn(p));
      ok(e !== null, `${name} refuses a ${label} pick`, e === null ? 'ACCEPTED' : '');
      if (e) note(`  ${name} / ${label}: ${e.message.split('\n')[0].slice(0, 200)}`);
    }
  }

  // E2 — the builder's substitute for ROADMAP N6, measured. N6 asks for a message naming
  // `$.cities[0].pick.rowId` from a door that does not contain the word `pick`; the builder
  // asserts instead that neither door names `rowId`.
  const src = {
    createTrip: readFileSync(join(CAIRN, 'packages/core/src/build/createTrip.ts'), 'utf8'),
    commit: readFileSync(join(CAIRN, 'packages/core/src/build/commit.ts'), 'utf8'),
    storable: readFileSync(join(CAIRN, 'packages/core/src/build/storable.ts'), 'utf8'),
  };
  for (const [f, s] of Object.entries(src)) {
    const code = s.split('\n').filter((l) => !/^\s*(\*|\/\*|\/\/)/.test(l)).join('\n');
    ok(!/\browId\b/.test(code), `${f}.ts's CODE does not name \`rowId\` — the shape rule lives in one place`, `names rowId`);
  }
  const cMsg = threw(() => trip1({ name: 'G', centre: { lat: 46.21, lng: 6.14 }, pick: bad })).message;
  const sMsg = threw(() => core.setTripMeta(t, { cities: [{ ...t.cities[0], pick: bad }] }, ctx())).message;
  ok(/pick\.rowId/.test(cMsg) && /pick\.rowId/.test(sMsg), 'both door messages still carry the sub-path `pick.rowId`', J([cMsg, sMsg]));
  ok(/cities\[0\]/.test(cMsg) && /cities\[0\]/.test(sMsg), 'both door messages locate the offending CITY', J([cMsg, sMsg]));
  const fMsg = threw(() => core.fromJSON(rawCity({ centre: { lat: 46.21, lng: 6.14 }, pick: bad })));
  ok(fMsg.path === '$.cities[0].pick.rowId', '`fromJSON` itself gives the full path N6 asked for', fMsg.path);

  // E3 — every other exported build function that can carry a City through.
  const carriers = Object.keys(core).filter((k) => typeof core[k] === 'function');
  note(`§2.10 exports: ${carriers.length} functions of ${Object.keys(core).length} symbols`);
  const anyCityWriter = Object.keys(core).filter((k) => /city|cities|Trip/i.test(k));
  note(`exports whose name mentions a trip or a city: ${J(anyCityWriter)}`);
}

// ===========================================================================
head('F — the ladder: the committed fixtures, and a pick riding a rung that rewrites a centre');
{
  const files = ['trip-598cd7f.v1.json', 'trip-origin-centre.v3.json', 'trip-picked.v4.json'];
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(CAIRN, 'fixtures/legacy', f), 'utf8'));
    const before = JSON.stringify(raw);
    const { doc, report } = migrate.migrateDocWithReport(raw);
    ok(JSON.stringify(raw) === before, `${f}: the rung does not mutate the caller's document`);
    ok(doc.schemaVersion === core.SCHEMA_VERSION, `${f}: arrives at v${core.SCHEMA_VERSION}`, doc.schemaVersion);
    const picks = (doc.cities ?? []).map((c) => c.pick);
    ok(picks.every((p) => p === null), `${f}: no city arrives with a non-null pick`, J(picks));
    ok((doc.cities ?? []).every((c) => !('placeId' in c)), `${f}: no city arrives carrying \`placeId\``);
    note(`${f}: report ${J(report)}`);
    const t = core.fromJSON(doc);
    ok(t.cities.every((c) => c.pick === null), `${f}: opens through fromJSON`);
    // idempotence
    const twice = migrate.migrateDocWithReport(doc);
    ok(JSON.stringify(twice.doc) === JSON.stringify(doc), `${f}: migrating twice is byte-identical to once`);
    ok(twice.report.droppedPlaceIds === 0 && twice.report.nulledOriginCentres === 0, `${f}: the second pass reports 0/0`, J(twice.report));
  }

  // F2 — A-84 Part 3 clause 3's third justification is *"the migration ladder never rewrites a
  // located coordinate"*. The 3 -> 4 rung rewrites `{0,0}` to `null`. If a v3 document carries a
  // pick (unknown keys ride the spread), that rung silently makes the pick INERT and nothing
  // counts it — `droppedPlaceIds` is about `placeId`, and `nulledOriginCentres` is about centres.
  const v3 = JSON.parse(readFileSync(join(CAIRN, 'fixtures/legacy/trip-origin-centre.v3.json'), 'utf8'));
  const idx = v3.cities.findIndex((c) => c.centre && c.centre.lat === 0 && c.centre.lng === 0);
  ok(idx >= 0, 'the committed v3 fixture has a {0,0} city', idx);
  const planted = JSON.parse(JSON.stringify(v3));
  planted.cities[idx] = { ...planted.cities[idx], pick: { rowId: 'ne:j64n0x', centre: { lat: 0, lng: 0 }, countryCode: 'CH' } };
  const out = migrate.migrateDocWithReport(planted);
  const pc = out.doc.cities[idx];
  note(`a v3 city at {0,0} carrying a pick at {0,0}: after the ladder centre=${J(pc.centre)}, pick=${J(pc.pick)}, report=${J(out.report)}`);
  if (pc.pick !== null && pc.centre === null) {
    gap('the 3 -> 4 rung REWROTE a coordinate underneath a pick and made it inert, and the report counts neither: `nulledOriginCentres` counts the centre, nothing counts the pick that stopped attributing. A-84 Part 7 item 3 says the 4 -> 5 rung is *"the first that could discard a picked value"*; this is a rung one below it that can.');
  }
  const reopened = core.fromJSON(out.doc);
  const summ = core.tripSummary(reopened, IDX).cities.find((c) => c.name === v3.cities[idx].name);
  note(`  and its summary row is ${J(summ)}`);

  // F3 — a v4 document carrying BOTH a placeId and a hand-written pick.
  const v4 = JSON.parse(readFileSync(join(CAIRN, 'fixtures/legacy/trip-picked.v4.json'), 'utf8'));
  const both = JSON.parse(JSON.stringify(v4));
  both.cities[0] = { ...both.cities[0], pick: { rowId: 'ne:j64n0x', centre: { lat: 46.21, lng: 6.14 }, countryCode: 'CH' } };
  const bo = migrate.migrateDocWithReport(both);
  note(`a v4 city with placeId ${J(v4.cities[0].placeId)} AND a pick: kept pick=${J(bo.doc.cities[0].pick)}, report=${J(bo.report)}`);
  ok(bo.doc.cities[0].pick !== null, 'the rung keeps a pre-existing pick (v1ToV2\'s clause, one field over)');

  // F4 — a document already stamped 5 that still carries `placeId` and no `pick`.
  const stamped = { ...JSON.parse(JSON.stringify(v4)), schemaVersion: 5 };
  const so = migrate.migrateDocWithReport(stamped);
  const se = threw(() => core.fromJSON(so.doc));
  ok(se !== null && se.path === '$.cities[0].pick', 'a doc stamped 5 that never ran the rung is REFUSED, not silently defaulted', se === null ? 'ACCEPTED' : se.path);
  note(`  and its report is ${J(so.report)} — the ladder only climbs (R61-9), so nothing is counted`);

  // F5 — R61-12 restated: `droppedPlaceIds` has no non-test caller.
  const callers = execSync(
    `grep -rln 'droppedPlaceIds\\|migrateDocWithReport' ${JSON.stringify(CAIRN)}/packages ${JSON.stringify(CAIRN)}/cli.ts ${JSON.stringify(CAIRN)}/apps 2>/dev/null || true`,
  ).toString().trim().split('\n').filter(Boolean).map((p) => p.replace(`${CAIRN}/`, ''));
  note(`non-test readers of the migration report: ${J(callers)} — A-84 Part 7 item 3 rules a notice "not owed here"`);
}

// ===========================================================================
head('G — `travelStats.seen`');
{
  // G1 — what the SHIPPED CLI prints, against the shipped reference trip.
  const sample = join(CAIRN, 'fixtures/golden/travel-stats.json');
  let golden = null;
  try { golden = JSON.parse(readFileSync(sample, 'utf8')); } catch { /* not generated */ }
  if (golden) note(`golden travel-stats: seen=${J(golden.seen ?? golden.stats?.seen)} located=${J(golden.located ?? golden.stats?.located)}`);

  const legacy = await import(pathToFileURL(join(CAIRN, 'packages/core/src/import/legacyDays.ts')).href);
  note(`legacyDays exports: ${J(Object.keys(legacy))}`);

  // Build a library by hand: one trip with an UNLOCATED place, and read the census back.
  const t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }] }, ctx());
  const doc = JSON.parse(core.toJSON(t));
  const ck = doc.cities[0].key;
  doc.places = [
    { id: 'p1', cityKey: ck, name: 'Located', at: { lat: 48.2, lng: 16.37 }, category: 'sight' },
    { id: 'p2', cityKey: ck, name: 'No coordinate', at: null, category: 'sight' },
    { id: 'p3', cityKey: ck, name: 'Also none', at: null, category: 'sight' },
  ];
  const withPlaces = core.fromJSON(doc);
  const row = core.tripSummary(withPlaces, IDX);
  const st = core.travelStats([row], '2026-09-09');
  note(`a trip with 3 places, 1 located: seen.places=${st.seen.places} located.places=${st.located.places} (true record count 3)`);
  ok(st.seen.places === 3, 'seen.places counts PLACE RECORDS, not located ones', `seen.places=${st.seen.places}, and the true count is 3 — the shipped CLI prints this as "records seen … places N"`);
  ok(st.seen.cities >= st.located.cities && st.located.cities >= st.unattributed.cities, 'unattributed <= located <= seen for cities');
  ok(st.seen.stops >= st.located.stops, 'located <= seen for stops');

  // G2 — the guard that guards nothing: `seenCities += Array.isArray(row.cities) ? … : 0` is
  // followed immediately by `for (const c of row.cities)`.
  const brokenRow = { ...row, cities: 'not an array' };
  const e = threw(() => core.travelStats([brokenRow], '2026-09-09'));
  if (e) note(`travelStats over a row whose \`cities\` is not an array THROWS: ${e.constructor.name}: ${e.message} — the new \`Array.isArray\` guard on the line above is dead code`);
  else note('travelStats survives a non-array `cities`');

  // G3 — `seen.stops` reads two STORED scalars, so a stored row can inflate it.
  const inflated = { ...row, stopCount: 1_000_000, poolCount: 0 };
  const st2 = core.travelStats([inflated], '2026-09-09');
  note(`a stored row claiming stopCount 1,000,000 reports seen.stops=${st2.seen.stops} against located.stops=${st2.located.stops}`);
}

// ===========================================================================
head('H — standing constraints over the changed files');
{
  const changed = ['packages/core/src/model/types.ts', 'packages/core/src/serialize/fromJSON.ts', 'packages/core/src/serialize/toJSON.ts', 'packages/core/src/serialize/migrate.ts', 'packages/core/src/build/createTrip.ts', 'packages/core/src/derive/summary.ts', 'packages/core/src/derive/travelStats.ts', 'packages/core/src/geo/gazetteer.ts', 'packages/core/src/index.ts', 'packages/core/src/import/legacyDays.ts'];
  for (const f of changed) {
    const s = readFileSync(join(CAIRN, f), 'utf8');
    const code = s.split('\n').filter((l) => !/^\s*(\*|\/\*|\/\/)/.test(l)).join('\n');
    const amb = [/Date\.now\(/, /Math\.random\(/, /crypto\.randomUUID\(/].filter((r) => r.test(code));
    ok(amb.length === 0, `${f}: no ambient clock or randomness`, J(amb.map(String)));
    ok(!/^import .* from ['"][^.]/m.test(code.replace(/^import type .*$/gm, '')), `${f}: no runtime dependency import`, (code.match(/^import .* from ['"][^.].*$/m) ?? [''])[0]);
  }
  const dom = execSync(
    `grep -rnE 'document\\.(getElement|querySelector|createElement|body)|window\\.(location|addEventListener|document)|from .react.' ${JSON.stringify(CAIRN)}/packages/client/src --include='*.ts' || true`,
  ).toString().trim();
  ok(dom === '', 'packages/client/src touches no DOM and no React', J(dom.split('\n').slice(0, 4)));
}

// ===========================================================================
head('I — the eleventh door: `mergeTrips`, and whether a merge can COMPOSE a false pair');
{
  const pick = core.cityPickFromRow(GENEVA);
  const geneva = { name: 'Geneva', centre: { lat: pick.centre.lat, lng: pick.centre.lng }, pick };
  const base = trip1(geneva);
  const asRow = (t) => core.tripSummary(t, IDX).cities[0];
  ok(asRow(base).countrySource === 'picked' && asRow(base).countryCode === 'CH', 'the base trip reports {CH, picked}', J(asRow(base)));

  // local moves the coordinate (the pick goes stale); remote retypes the country code.
  const local = core.setTripMeta(base, { cities: [{ ...base.cities[0], centre: { lat: 48.2082, lng: 16.3738 } }] }, ctx());
  const remote = core.setTripMeta(base, { cities: [{ ...base.cities[0], countryCode: 'HU' }] }, ctx());
  const merged = core.mergeTrips(base, local, remote);
  const mt = merged.trip ?? merged;
  const mc = mt.cities[0];
  note(`merged city: centre=${J(mc.centre)} countryCode=${J(mc.countryCode)} pick=${J(mc.pick)}`);
  const mr = core.tripSummary(mt, IDX).cities[0];
  note(`merged summary: ${J({ c: mr.countryCode, s: mr.countrySource })}`);
  const composed = mc.pick !== null && mc.centre !== null
    && mc.centre.lat === mc.pick.centre.lat && mc.centre.lng === mc.pick.centre.lng
    && (mc.centre.lat !== base.cities[0].centre.lat);
  ok(!composed, 'the three-way merge cannot pair one side\'s centre with the other side\'s pick — `cities` merges WHOLE (pick3), not field by field');
  ok(mr.countrySource !== 'picked' || mr.countryCode === 'CH', 'no merge outcome reports a picked country other than the pick\'s own', J(mr));

  // And the same merge with the two changes swapped, so neither side is privileged.
  const merged2 = core.mergeTrips(base, remote, local);
  const m2 = (merged2.trip ?? merged2).cities[0];
  const r2 = core.tripSummary(merged2.trip ?? merged2, IDX).cities[0];
  note(`swapped merge: centre=${J(m2.centre)} countryCode=${J(m2.countryCode)} -> ${J({ c: r2.countryCode, s: r2.countrySource })}`);
  ok(r2.countrySource !== 'picked' || r2.countryCode === 'CH', 'and swapped, still no forged picked country', J(r2));
}

// ===========================================================================
head('J — what a SHIPPED surface prints: `cli.ts stats` against the reference trip');
{
  const { loadEurope2026 } = await import(pathToFileURL(join(CAIRN, 'fixtures/loadEurope2026.mjs')).href);
  const loaded = loadEurope2026();
  const trip = loaded.trip ?? loaded;
  const total = trip.places.length;
  const unlocated = trip.places.filter((p) => p.at === null).length;
  const st = core.travelStats([core.tripSummary(trip, IDX)], '2026-08-25');
  note(`the reference trip holds ${total} places, ${unlocated} of them with no coordinate`);
  note(`\`cli.ts stats\` prints "records seen … places ${st.seen.places}" and "located … places ${st.located.places}"`);
  ok(st.seen.places === total,
    'the SHIPPED CLI\'s "records seen … places N" is the true record count on the reference trip',
    `prints ${st.seen.places}, the true count is ${total}; seen − located = ${st.seen.places - st.located.places} where ${unlocated} place record has no coordinate. The caveat lives in a source comment; the printed line carries none.`);
  ok(st.seen.cities === trip.cities.length, 'seen.cities IS exact on the reference trip', `${st.seen.cities} vs ${trip.cities.length}`);
  const stops = trip.days.reduce((n, d) => n + d.stops.length, 0) + trip.pool.length;
  ok(st.seen.stops === stops, 'seen.stops IS exact on the reference trip', `${st.seen.stops} vs ${stops}`);
}

// ===========================================================================
head('K — the door census by hand: every `packages/core/src` export that returns a Trip');
{
  const out = execSync(`grep -rn 'export function .*): Trip' ${JSON.stringify(CAIRN)}/packages/core/src --include='*.ts'`).toString().trim().split('\n');
  const doors = out.map((l) => ({ file: l.split(':')[0].replace(`${CAIRN}/`, ''), name: (l.match(/export function (\w+)/) ?? [])[1] }));
  note(`Trip-returning exports: ${J(doors.map((d) => d.name))}`);
  const bodies = new Map();
  for (const d of doors) { if (!bodies.has(d.file)) bodies.set(d.file, readFileSync(join(CAIRN, d.file), 'utf8')); }
  const noCommit = doors.filter((d) => {
    const src = bodies.get(d.file);
    const i = src.indexOf(`export function ${d.name}`);
    const body = src.slice(i, i + 4000);
    return !/\bcommit\(/.test(body) && !/\bfromJSON\(/.test(body);
  });
  note(`Trip-returning exports whose body names neither \`commit(\` nor \`fromJSON(\` in its first 4 kB: ${J(noCommit.map((d) => `${d.file}:${d.name}`))} — each is either a pass-through or is covered by \`storable.test.ts\`'s compiler census (A-80)`);
}

// ===========================================================================
head('L — the person boundary and the email path: can a pick cross either?');
{
  const pick = core.cityPickFromRow(GENEVA);
  // Their trip: a picked Geneva, with a stop standing in it.
  let theirs = core.createTrip({
    id: 'trip_theirs', title: 'Theirs', ownerId: 'user:them', startDate: '2026-08-07', endDate: '2026-08-08',
    cities: [{ key: 'geneva', name: 'Geneva', countryCode: 'CH', centre: { lat: pick.centre.lat, lng: pick.centre.lng }, pick }],
  }, ctx());
  theirs = core.addStop(theirs, { kind: 'day', dayId: theirs.days[0].id }, { name: 'Jet d\'Eau', category: 'sight', place: { kind: 'inline', name: 'Jet d\'Eau', at: { lat: 46.2074, lng: 6.1557 } } }, { ids: core.sequentialIds('them'), now: '2026-08-07', today: '2026-08-07', actorUserId: 'user:them' });
  const theirStop = theirs.days[0].stops.at(-1);
  ok(core.tripSummary(theirs, IDX).cities[0].countrySource === 'picked', 'their trip reports a PICKED country');

  // Mine: no cities at all.
  const mine = core.createTrip({ id: 'trip_mine', title: 'Mine', ownerId: 'user:me', startDate: '2026-08-07', endDate: '2026-08-08' }, ctx());
  const after = core.copyStopInto(mine, { trip: theirs, stopId: theirStop.id }, { kind: 'pool', cityKey: 'transit' }, { ids: core.sequentialIds('me'), today: '2026-08-07', actorUserId: 'user:me' });
  note(`after copyStopInto my trip holds ${after.cities.length} cities: ${J(after.cities.map((c) => ({ name: c.name, centre: c.centre, pick: c.pick })))}`);
  ok(after.cities.every((c) => c.pick === null), 'no pick crosses the person boundary through `copyStopInto`', J(after.cities.map((c) => c.pick)));
  ok(!JSON.stringify(after).includes(pick.rowId), 'their `rowId` appears NOWHERE in my document', 'the rowId leaked');
  const myRow = core.tripSummary(after, IDX);
  ok(!myRow.cities.some((c) => c.countrySource === 'picked'), 'and my summary claims no picked country', J(myRow.cities));

  // The email path: `acceptCandidate` is the highest-volume writer there will be. It must not be
  // able to mint or move a city at all.
  const cand = readFileSync(join(CAIRN, 'packages/core/src/build/candidates.ts'), 'utf8');
  ok(!/\bcities\b|\bCity\b|\bpick\b/.test(cand), '`build/candidates.ts` — the email-candidate door — names no city and no pick at all', (cand.match(/\bcities\b|\bCity\b|\bpick\b/) ?? [''])[0]);
  const leak = execSync(`grep -rniE 'console\\.(log|warn|error)|fetch\\(|navigator\\.' ${JSON.stringify(CAIRN)}/packages/core/src --include='*.ts' | grep -v '^\\s*//' || true`).toString().trim();
  ok(leak === '', '`packages/core/src` logs nothing, fetches nothing — no coordinate or pick can leave through it', J(leak.split('\n').slice(0, 3)));
}

console.log(`\nCOMPLETE — ${fails} FAIL, ${gaps} GAP`);
process.exit(fails > 0 ? 1 : 0);
