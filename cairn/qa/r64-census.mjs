/**
 * QA round 64 — the adversarial pass over `2b54c67` + `I-25` (`fcac762`) as ONE subject:
 * *the door and the census after round 63*.
 *
 * Run from `cairn/`:  `node --experimental-strip-types qa/r64-census.mjs`
 *
 * `I-24` Part 4 put an `Array.isArray` guard in front of `travelStats`' city walk, trading a
 * loud failure for a silent under-count; `I-25` pays that back with `unreadableCityLists`.
 * This probe attacks the population the guard and the count between them are supposed to
 * cover, and the boundary they draw through it.
 *
 * A `FAIL` line is a finding; a `note` line is a recorded fact. The run ends with a `COMPLETE`
 * line — a run without one is INCOMPLETE and its counts may not be quoted. It writes nothing
 * outside memory and reads `fixtures/` only.
 *
 *   A  KD-117's blast radius: a `cities` ARRAY holding a corrupt entry, end to end
 *   B  `unreadableCityLists`' boundary over the present-and-not-an-array population
 *   C  the pin between core's counter and `rowStatsReadable` — where it actually holds
 *   D  the count under the store's real rescan path: double-counted, or missed
 *   E  `SOURCE_ALLOW` / `countShaped` — is the negative control real?
 *   F  `I-24`'s exit re-derived under the two CORRECTED criteria (R63-7, R63-8)
 *   G  standing constraints over the two commits' diff
 *   H  R63-2 re-minted: `c.centre` is read THREE times at the door, and the reads can disagree
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const client = await import(pathToFileURL(join(CAIRN, 'packages/client/src/index.ts')).href);
const { loadEurope2026 } = await import(pathToFileURL(join(CAIRN, 'fixtures/loadEurope2026.mjs')).href);

let fails = 0;
const ok = (c, m, x) => { if (c) console.log(`  ok   ${m}`); else { fails++; console.log(`  FAIL ${m}${x === undefined ? '' : `  — ${x}`}`); } };
const note = (m) => console.log(`  note ${m}`);
const head = (s) => console.log(`\n== ${s}`);

const TODAY = '2026-09-09';
const { trip } = loadEurope2026(core);
const REF = core.tripSummary(trip, core.COUNTRY_INDEX);
/** A travelled (completed) row over the reference trip. */
const travelledRow = (over) => ({ ...REF, ...over });
/** A planned row: the same document, dates moved into the future. */
const plannedRow = (over) => ({ ...REF, id: 'planned', startDate: '2027-01-01', endDate: '2027-01-10', ...over });

const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const attempt = (fn) => { try { return { threw: false, value: fn() }; } catch (e) { return { threw: true, err: e }; } };
const kindOf = (e) => (e instanceof TypeError ? 'TypeError' : e instanceof Error ? e.constructor.name : typeof e);

// ---------------------------------------------------------------------------
head('A  KD-117 — a `cities` ARRAY holding a corrupt entry: what happens, and who can name it');
// A-86 Part 8 residue 2 says such an entry "contributes that entry as unlocated and is counted
// by nothing". The builder measured a throw instead (KD-117). Blast radius, not re-confirmation:
// what the user sees, and whether anything downstream can name the row.
{
  const ENTRIES = [
    ["a string ('Vienna')", 'Vienna'],
    ['null', null],
    ['a number (42)', 42],
    ['undefined (what JSON writes for a hole)', undefined],
    ['an object whose `name` is a number', { key: 'c1', name: 42, countryCode: 'AT', countrySource: 'stated', centre: null, firstDay: null, lastDay: null }],
    ['an object whose `name` is null', { key: 'c1', name: null, countryCode: 'AT', countrySource: 'stated', centre: null, firstDay: null, lastDay: null }],
    ['an object with NO `name` key at all', { key: 'c1', countryCode: 'AT', countrySource: 'stated', centre: null, firstDay: null, lastDay: null }],
    ['a well-formed entry (control)', REF.cities[0]],
  ];
  for (const [label, entry] of ENTRIES) {
    const row = travelledRow({ id: 'corrupt', cities: [entry] });
    const r = attempt(() => core.travelStats([row], TODAY));
    const readable = client.rowStatsReadable(row);
    const hist = client.travelHistory({ library: [row] }, TODAY);
    const named = hist.ok ? '(ok)' : `rowId=${JSON.stringify(hist.rowId)} unreadableRows=${JSON.stringify(hist.unreadableRows)}`;
    note(`${label}: travelStats ${r.threw ? `THREW ${kindOf(r.err)}: ${r.err.message}` : `returned, unreadableCityLists=${r.value.unreadableCityLists}, seen.cities=${r.value.seen.cities}`}; rowStatsReadable=${readable}; travelHistory.ok=${hist.ok} ${named}`);
  }
  // The finding this section exists for: a throw that NOTHING can attribute to a row.
  const unnameable = travelledRow({ id: 'corrupt', cities: [{ key: 'c1', name: 42, countryCode: 'AT', countrySource: 'stated', centre: null, firstDay: null, lastDay: null }] });
  const r = attempt(() => core.travelStats([unnameable], TODAY));
  const hist = client.travelHistory({ library: [unnameable] }, TODAY);
  ok(!r.threw,
    'A1  a `cities` entry whose `name` is not a string does not take the whole library down',
    r.threw ? `${kindOf(r.err)}: ${r.err.message}` : undefined);
  ok(hist.ok || hist.rowId !== null || hist.unreadableRows.length > 0,
    'A2  when it does take the library down, SOMETHING names the offending row',
    hist.ok ? undefined : `message=${JSON.stringify(hist.message)} rowId=${hist.rowId} unreadableRows=${JSON.stringify(hist.unreadableRows)}`);

  // And the same fault one field over — the LIST — is absorbed and counted. The two halves of
  // one population, given opposite treatments.
  const listFault = travelledRow({ id: 'corrupt', cities: 'AT,HR' });
  const lr = attempt(() => core.travelStats([listFault], TODAY));
  note(`the LIST form of the same population: travelStats ${lr.threw ? 'THREW' : `returned, unreadableCityLists=${lr.value.unreadableCityLists}`}`);

  // Does anything downstream distinguish "no history" from "history threw"?
  const empty = client.travelHistory({ library: [] }, TODAY);
  note(`an EMPTY library: ok=${empty.ok}, trips=${empty.ok ? JSON.stringify(empty.stats.trips) : 'n/a'} — a caller that only reads counts cannot tell this from the catch branch unless it branches on \`ok\``);
  // **A3, re-cut in QA round 65.** As written this asserted `travelHistory(...).ok === false`
  // plus a core-authored catch message for the `name: 42` fault — and `I-26` (A-87 Part 4) is
  // precisely the change that stops that fault reaching the catch branch, so the assertion was
  // stale by construction rather than failing. The PROPERTY it protected is *"whatever a caller
  // is handed about a bad row, core authored it and it names the row"*, and that property is
  // now discharged on the SUCCESS path. Both halves are asserted here, over the two populations
  // that exist after `I-26`:
  //   A3a  the absorbed population — no throw, and the row and the field are named by core;
  //   A3b  the population that still reaches the catch (A-37 Part 2's grandfathered throw and
  //        the duplicate id) — the message is still core-authored, which is what A3 was for.
  const absorbedHist = client.travelHistory({ library: [unnameable] }, TODAY);
  const absorbedStats = core.travelStats([unnameable], TODAY);
  ok(absorbedHist.ok === true
     && absorbedStats.absorbed.length === 1
     && absorbedStats.absorbed[0].rowId === 'corrupt'
     && absorbedStats.absorbed[0].path === 'cities[0].name',
    'A3a the row is named by CORE on the success path — id and field path, no throw (A-87 Part 4)',
    `ok=${absorbedHist.ok} absorbed=${JSON.stringify(absorbedStats.absorbed)}`);
  const stillThrows = [
    ['a malformed trip date (A-37 Part 2, grandfathered)', [travelledRow({ id: 'baddate', startDate: 'nope' })]],
    ['a duplicate row id', [travelledRow({ id: 'dup' }), travelledRow({ id: 'dup', startDate: '2026-01-01', endDate: '2026-01-02' })]],
  ];
  for (const [label, library] of stillThrows) {
    const h = client.travelHistory({ library }, TODAY);
    ok(h.ok === false && /^travelStats:|^invalid IsoDate:/.test(h.message),
      `A3b the catch branch still reports a message core AUTHORED — ${label}`,
      h.ok ? 'it did not throw' : JSON.stringify(h.message));
  }

  // Is the entry-level fault reachable through a real write path, or only by hand?
  const roundTripped = JSON.parse(JSON.stringify({ ...REF, cities: [undefined, REF.cities[0]] }));
  const rt = attempt(() => core.travelStats([travelledRow({ id: 'rt', cities: roundTripped.cities })], TODAY));
  note(`a \`cities\` array holding \`undefined\` after ONE JSON round trip (which is what any storage port does): entry becomes ${JSON.stringify(roundTripped.cities[0])}, travelStats ${rt.threw ? `THREW ${kindOf(rt.err)}` : 'returned'}`);
}

// ---------------------------------------------------------------------------
head('B  `unreadableCityLists` over the present-and-not-an-array population');
{
  const VALUES = [
    ['undefined', undefined, 0],
    ['null', null, 0],
    ['[] (empty array)', [], 0],
    ["'nope' (string)", 'nope', 1],
    ["'' (EMPTY string — falsy, still present)", '', 1],
    ['0', 0, 1],
    ['NaN', NaN, 1],
    ['false', false, 1],
    ['{}', {}, 1],
    ['a boxed String', new String('AT,HR'), 1],
    ['an array-like {length:0}', { length: 0 }, 1],
    ["an array-like {length:1, 0:{...}}", { length: 1, 0: REF.cities[0] }, 1],
    ['a Set of entries', new Set([REF.cities[0]]), 1],
    ['a function', function cities() {}, 1],
    ['a Symbol', Symbol('cities'), 1],
    ['a bigint', 1n, 1],
  ];
  for (const [label, value, expected] of VALUES) {
    const row = travelledRow({ id: `b-${label}`, cities: value });
    const r = attempt(() => core.travelStats([row], TODAY));
    if (r.threw) { ok(false, `B  cities = ${label}: travelStats returns`, `${kindOf(r.err)}: ${r.err.message}`); continue; }
    ok(r.value.unreadableCityLists === expected,
      `B  cities = ${label} → unreadableCityLists ${expected}`,
      `got ${r.value.unreadableCityLists}`);
  }
  // A `Proxy` over a real array: `Array.isArray` pierces it, so it is WALKED, not counted.
  const proxied = new Proxy([REF.cities[0]], {});
  const pr = attempt(() => core.travelStats([travelledRow({ id: 'b-proxy', cities: proxied })], TODAY));
  note(`a Proxy over a real array: Array.isArray=${Array.isArray(proxied)}, travelStats ${pr.threw ? 'THREW' : `returned unreadableCityLists=${pr.value.unreadableCityLists} seen.cities=${pr.value.seen.cities}`} — walked, not counted, which is right`);
  // A `Proxy` whose `get` throws: the row is read three times (`cities`, then per entry).
  const hostile = new Proxy([REF.cities[0]], { get(t, k) { if (k === 'length') throw new Error('hostile length'); return Reflect.get(t, k); } });
  const hr = attempt(() => core.travelStats([travelledRow({ id: 'b-hostile', cities: hostile })], TODAY));
  note(`a Proxy whose \`length\` getter throws: travelStats ${hr.threw ? `THREW ${kindOf(hr.err)}: ${hr.err.message}` : 'returned'}`);
  // A getter on the ROW itself that throws — the row is not a validated document.
  const getterRow = travelledRow({ id: 'b-getter' });
  Object.defineProperty(getterRow, 'cities', { get() { throw new Error('storage decode failed'); }, enumerable: true, configurable: true });
  const gr = attempt(() => core.travelStats([getterRow], TODAY));
  note(`a row whose \`cities\` getter throws: travelStats ${gr.threw ? `THREW ${kindOf(gr.err)}: ${gr.err.message}` : 'returned'}`);
  // A getter that returns a different value on each read — the guard binds ONCE (I-24 Part 4).
  const flip = travelledRow({ id: 'b-flip' });
  let n = 0;
  Object.defineProperty(flip, 'cities', { get() { return n++ === 0 ? 'nope' : [REF.cities[0]]; }, enumerable: true, configurable: true });
  const fr = attempt(() => core.travelStats([flip], TODAY));
  ok(!fr.threw && fr.value.unreadableCityLists === 1 && fr.value.seen.cities === 0,
    'B  a `cities` that changes between reads is bound ONCE — counted, and contributes nothing',
    fr.threw ? `${kindOf(fr.err)}: ${fr.err.message}` : `count=${fr.value.unreadableCityLists} seen=${fr.value.seen.cities} (reads=${n})`);

  // Per ROW, not per entry: two corrupt rows are two, and one row is one however big its value.
  const two = core.travelStats([travelledRow({ id: 'x1', cities: 'a' }), travelledRow({ id: 'x2', cities: 'b' })], TODAY);
  ok(two.unreadableCityLists === 2, 'B  two corrupt rows count 2', `got ${two.unreadableCityLists}`);
  const long = core.travelStats([travelledRow({ id: 'x3', cities: 'Vienna,Split,Prague,Budapest' })], TODAY);
  ok(long.unreadableCityLists === 1, 'B  one corrupt row counts 1 however many cities its value implies', `got ${long.unreadableCityLists}`);
}

// ---------------------------------------------------------------------------
head('C  the pin between core\'s counter and `rowStatsReadable` — where it actually holds');
{
  // The pin as the increment asserts it: a TRAVELLED row with readable dates.
  const t = travelledRow({ id: 'c-travelled', cities: 'nope' });
  ok(client.rowStatsReadable(t) === false && core.travelStats([t], TODAY).unreadableCityLists === 1,
    'C1  travelled row, corrupt list: predicate false, count 1 — the asserted case');
  // The same corruption on a PLANNED row. `travelStats` walks travelled rows only.
  const p = plannedRow({ cities: 'nope' });
  const stage = core.lifecycle(p, TODAY);
  const pc = core.travelStats([p], TODAY).unreadableCityLists;
  const pr = client.rowStatsReadable(p);
  ok(pr === (pc === 0),
    `C2  planned row (lifecycle=${stage}), corrupt list: rowStatsReadable=${pr}, unreadableCityLists=${pc} — the two predicates over one fact`,
    `rowStatsReadable says ${pr ? 'readable' : 'UNREADABLE'} and the count says ${pc}`);
  note('the increment\'s own pin test holds the DATES readable but says nothing about the row\'s lifecycle; every fixture in it is travelled');
  // And the same for a row whose dates make it planned but which is otherwise identical.
  const both = core.travelStats([travelledRow({ id: 'c-t', cities: 'nope' }), plannedRow({ id: 'c-p', cities: 'nope' })], TODAY);
  ok(both.unreadableCityLists === 2,
    'C3  a library holding one travelled and one planned corrupt row counts BOTH',
    `got ${both.unreadableCityLists} — the planned row\'s absorption is invisible`);
  // Is the planned row's absorption real? Does a planned row contribute cities at all?
  const plannedGood = core.travelStats([plannedRow({ id: 'c-pg' })], TODAY);
  note(`a HEALTHY planned row contributes seen.cities=${plannedGood.seen.cities} — so a planned row's city list is never read, and its corruption absorbs nothing today`);
}

// ---------------------------------------------------------------------------
head('D  the count under the store\'s real rescan path');
{
  const ports = (storage) => ({ storage, file: client.memoryFile(), clock: client.fixedClockPort('2026-12-31'), ids: client.sequentialIdPort('r64-'), scheduler: client.immediateScheduler() });

  // D1. A corrupt row at the CURRENT generation, seeded into storage with its document.
  const storage = client.memoryStorage();
  const corruptRow = { ...REF, cities: 'AT,HR,CZ' };
  const seeded = await storage.saveIfVersion(trip.id, null, core.toJSON(trip), corruptRow);
  ok(seeded.ok === true, 'D0  seeded a corrupt-`cities` row + its real document into storage');
  const store = client.createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const h = client.travelHistory(store.getState(), '2026-12-31');
  ok(h.ok === true && h.stats.unreadableCityLists === 1,
    'D1  through the real store: `ok: true`, and the count names one absorbed row',
    h.ok ? `count=${h.stats.unreadableCityLists}` : h.message);
  // Is there any route to REPAIR it? The generic rescan triggers on version only.
  const scan = client.summaryScan(store.getState());
  ok(scan.outdated.length === 0,
    'D2  the generic rescan does NOT name a corrupt row at the current generation — there is no repair path',
    JSON.stringify(scan.outdated));
  note(`so the count is a report with no affordance behind it: rescanSummaries leaves it (outdated=${JSON.stringify(scan.outdated)}), which is A-59 Part 5's unscheduled residue measured rather than argued`);
  await store.rescanSummaries();
  const after = client.travelHistory(store.getState(), '2026-12-31');
  ok(after.ok && after.stats.unreadableCityLists === 1,
    'D3  after a full `rescanSummaries` the corrupt row is still corrupt and still counted',
    after.ok ? `count=${after.stats.unreadableCityLists}` : after.message);

  // D4. The same corruption on a row BELOW the current generation: the rescan repairs it.
  const st2 = client.memoryStorage();
  const oldRow = { ...REF, summaryVersion: 7, cities: 'AT,HR,CZ' };
  delete oldRow.placeCount;
  await st2.saveIfVersion(trip.id, null, core.toJSON(trip), oldRow);
  const store2 = client.createStore({ ports: ports(st2) });
  await store2.refreshLibrary();
  const b2 = client.travelHistory(store2.getState(), '2026-12-31');
  await store2.rescanSummaries();
  const a2 = client.travelHistory(store2.getState(), '2026-12-31');
  ok(b2.ok && b2.stats.unreadableCityLists === 1 && a2.ok && a2.stats.unreadableCityLists === 0,
    'D4  a corrupt row BELOW the current generation is repaired by the rescan and stops being counted',
    `${b2.ok ? b2.stats.unreadableCityLists : b2.message} then ${a2.ok ? a2.stats.unreadableCityLists : a2.message}`);

  // D5. Counted once per call, never accumulated; and per row.
  const lib = [{ ...REF, id: 'd5', cities: 'nope' }];
  const c1 = core.travelStats(lib, TODAY).unreadableCityLists;
  const c2 = core.travelStats(lib, TODAY).unreadableCityLists;
  ok(c1 === 1 && c2 === 1, 'D5  the counter is per call, not accumulated across calls', `${c1} then ${c2}`);
  const dup = attempt(() => core.travelStats([{ ...REF, id: 'd6', cities: 'a' }, { ...REF, id: 'd6', cities: 'b' }], TODAY));
  note(`two rows sharing one id: ${dup.threw ? `THREW — ${dup.err.message}` : `returned, count=${dup.value.unreadableCityLists}`}`);
  const rt = JSON.parse(JSON.stringify({ ...REF, id: 'd7', cities: 'nope' }));
  ok(core.travelStats([rt], TODAY).unreadableCityLists === 1, 'D6  the corrupt row still counts after a real JSON round trip');
  const undefRow = JSON.parse(JSON.stringify({ ...REF, id: 'd8', cities: undefined }));
  note(`\`cities: undefined\` written through JSON becomes ${'cities' in undefRow ? JSON.stringify(undefRow.cities) : 'an ABSENT key'} — counted ${core.travelStats([undefRow], TODAY).unreadableCityLists}`);
}

// ---------------------------------------------------------------------------
head('E  `SOURCE_ALLOW` / `countShaped` — is the negative control real?');
{
  const src = readFileSync(join(CAIRN, 'test/stats-storage.test.ts'), 'utf8');
  // Execute the test file's OWN definitions rather than a copy of them.
  const grab = (name) => {
    const m = new RegExp(`^const ${name} = [^\\n]+$`, 'm').exec(src);
    return m ? m[0] : null;
  };
  const body = /^function countShaped\(name: string\): boolean \{[\s\S]*?^\}$/m.exec(src);
  const defs = ['DOMAIN', 'SHAPE', 'PLURAL', 'CENSUS'].map(grab);
  ok(defs.every(Boolean) && body !== null, 'E0  the four regexes and `countShaped` were lifted from the shipped test file');
  for (const d of defs) note(`${d}`);
  const countShaped = new Function(`${defs.join('\n')}\n${body[0].replace(/: string|: boolean/g, '')}\nreturn countShaped;`)();
  const CASES = [
    ['unreadableCityLists', false], ['unreadableCities', true], ['unreadableCityDates', false],
    ['unnamedCities', true], ['cityCount', true], ['unreadableCityList', false],
    ['citiesUnreadable', false], ['unreadableCitiesList', false], ['cityListsUnreadable', false],
  ];
  for (const [name, expected] of CASES) {
    ok(countShaped(name) === expected, `E  countShaped('${name}') === ${expected}`, `got ${countShaped(name)}`);
  }
  note('`citiesUnreadable` and `unreadableCitiesList` are count-shaped renames the classifier does NOT catch — the negative control covers one rename, not the class');
}

// ---------------------------------------------------------------------------
head('F  `I-24`\'s exit re-derived under the two CORRECTED criteria (R63-7, R63-8)');
{
  // R63-7: the presence test is `c.centre !== undefined`, ONE spelling. Four inputs.
  const gz = await import(pathToFileURL(join(CAIRN, 'packages/core/src/geo/gazetteer.gen.ts')).href);
  const hit = core.searchGazetteer('geneva', gz.GAZETTEER)[0];
  const pick = core.cityPickFromRow(hit);
  const mk = (cityInit) => {
    const t = core.createTrip({ title: 'T', startDate: '2026-03-01', endDate: '2026-03-05', ownerId: 'u1', cities: [cityInit] }, { ids: core.sequentialIds('f'), now: '2026-01-01' });
    const r = core.tripSummary(t, core.COUNTRY_INDEX);
    return { centre: t.cities[0].centre, code: r.cities[0].countryCode, source: r.cities[0].countrySource };
  };
  const absent = mk({ name: 'Geneva', pick });
  ok(absent.centre && absent.centre.lat === pick.centre.lat && absent.code === 'CH' && absent.source === 'picked',
    'F1  key absent → stands on the pick, {CH, picked}', JSON.stringify(absent));
  const undef = mk({ name: 'Geneva', centre: undefined, pick });
  ok(undef.centre && undef.centre.lat === pick.centre.lat && undef.code === 'CH' && undef.source === 'picked',
    'F2  `centre: undefined` written out loud → SAME answer (`!== undefined`, one spelling)', JSON.stringify(undef));
  const erased = mk({ name: 'Geneva', centre: null, pick });
  ok(erased.centre === null && erased.code === null && erased.source === null,
    'F3  `centre: null` → the erase case, {null, null}', JSON.stringify(erased));
  const inherited = mk(Object.assign(Object.create({ centre: null }), { name: 'Geneva', pick }));
  ok(inherited.centre === null && inherited.code === null,
    'F4  an INHERITED `centre: null` is honoured as written (A-86 Part 2, no `hasOwnProperty`)', JSON.stringify(inherited));
  const inheritedPt = mk(Object.assign(Object.create({ centre: { lat: 48.2082, lng: 16.3738 } }), { name: 'Geneva', pick }));
  ok(inheritedPt.centre && inheritedPt.centre.lat === 48.2082 && inheritedPt.code === 'AT',
    'F5  an INHERITED real `centre` is honoured too — {AT, coordinate}', JSON.stringify(inheritedPt));
  // And the source says one spelling, not two.
  const ct = readFileSync(join(CAIRN, 'packages/core/src/build/createTrip.ts'), 'utf8');
  ok(!/permits either spelling/.test(ct), 'F6  `createTrip.ts` no longer says the ruling "permits either spelling"');
  // **F7/F8, re-cut in QA round 65.** As written these grepped for the literal string
  // `c.centre !== undefined`, which round 64's own fix (`e1e1973`, R64-1: *bind the value
  // once*) correctly removed — the door now reads `const centre = c.centre` and tests
  // `centre !== undefined`. A snapshot that reads like the init is how this class gets re-filed
  // a fourth time, and the builder was right to refuse to rescue the greps by naming a local
  // `c`. Re-cut to pin the two PROPERTIES A-86 Parts 1 and 2 actually rule:
  //   F7  the presence test is on a value read ONCE — measured with a counting accessor, not
  //       read off the source text;
  //   F8  the test is `!== undefined` and not `in`/`hasOwnProperty` — measured behaviourally
  //       (an inherited `centre` is honoured, and `{centre: undefined}` takes the default),
  //       with a source check that asserts the ABSENCE of the two spellings the ruling refuses.
  let centreReads = 0;
  const counting = { name: 'Geneva', pick, get centre() { centreReads++; return undefined; } };
  mk(counting);
  ok(centreReads === 1,
    'F7  the door reads `CityInit.centre` EXACTLY ONCE (R64-1\'s property, not its spelling)',
    `read ${centreReads} times`);
  const ctCode = strip(ct);
  // Scoped to `centre`: `hasOwnProperty` is legitimate elsewhere in this file (`setTripMeta`'s
  // patch allowlist, :415/:449, where `in` would make `toString` a patchable key — A-77's rule).
  // What A-86 Part 1 refuses is an OWN-KEY test on THIS field.
  const centreOwnKey = /(?:'centre'|"centre")\s+in\s+\w|hasOwnProperty\.call\([^)]*['"]centre['"]/.exec(ctCode);
  ok(centreOwnKey === null,
    'F8  no own-key test on `centre` at the door — neither `\'centre\' in c` nor `hasOwnProperty` (A-86 Part 1)',
    centreOwnKey ? centreOwnKey[0] : undefined);
  // …and the behaviour the spelling was a proxy for, which F1–F5 above already measure: absent
  // and `undefined` agree, and an inherited value is honoured. Asserted here as one line so the
  // property has a home even if F1–F5 are ever re-scoped.
  ok(JSON.stringify(absent) === JSON.stringify(undef),
    'F8b `centre` absent and `centre: undefined` produce the SAME answer — the behaviour `!== undefined` buys',
    `${JSON.stringify(absent)} vs ${JSON.stringify(undef)}`);

  // R63-8: the range check, BOTH numbers, over the committed reference trip.
  const issues = core.validateTrip(trip, { today: '2026-08-01' });
  const oor = issues.filter((i) => i.code === 'lat_lng_out_of_range');
  const tripKinded = oor.filter((i) => i.ref.kind === 'trip');
  ok(tripKinded.length === 0, 'F9  reference trip: `lat_lng_out_of_range` with ref.kind === "trip" is 0', `got ${tripKinded.length}`);
  ok(oor.length === 1, 'F10 reference trip: TOTAL `lat_lng_out_of_range` is 1', `got ${oor.length} — ${JSON.stringify(oor.map((i) => `${i.ref.kind}:${i.message}`))}`);
  note(`the one issue: ${oor.map((i) => `[${i.ref.kind}] ${i.message}`).join(' | ')}`);
}

// ---------------------------------------------------------------------------
head('G  standing constraints over the two commits\' surface');
{
  const changed = execSync('git show --stat --format= fcac762 2b54c67', { cwd: CAIRN, encoding: 'utf8' });
  ok(!/\.tsx/.test(changed), 'G1  no `.tsx` in either commit', changed.match(/^.*\.tsx.*$/m)?.[0]);
  ok(!/apps\/web\//.test(changed), 'G2  no `apps/web/` in either commit');
  const files = ['packages/core/src/derive/travelStats.ts', 'packages/core/src/build/createTrip.ts'];
  for (const f of files) {
    const s = readFileSync(join(CAIRN, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    ok(!/Date\.now\(|Math\.random\(|crypto\.randomUUID\(/.test(s), `G3  ${f}: no ambient clock or randomness`);
    ok(!/from '(?!\.|node:)/.test(s.replace(/from '@cairn\//g, "from './")), `G4  ${f}: no runtime dependency`);
  }
  const clientFiles = execSync('find packages/client/src -name "*.ts"', { cwd: CAIRN, encoding: 'utf8' }).trim().split('\n');
  const domHits = clientFiles.filter((f) => /\bdocument\.|\bwindow\.|\bReact\b|require\(/.test(strip(readFileSync(join(CAIRN, f), 'utf8'))));
  ok(domHits.length === 0, 'G5  `packages/client/src` touches no DOM and no React (comments stripped)', domHits.join(', '));
  // Determinism: the same inputs give the same answer twice.
  const one = JSON.stringify(core.travelStats([travelledRow({ id: 'g', cities: 'nope' })], TODAY));
  const two = JSON.stringify(core.travelStats([travelledRow({ id: 'g', cities: 'nope' })], TODAY));
  ok(one === two, 'G6  `travelStats` is deterministic across two calls');
}


// ---------------------------------------------------------------------------
head('H  the door reads `c.centre` more than once — R63-2\'s class, one field over');
{
  const gz = await import(pathToFileURL(join(CAIRN, 'packages/core/src/geo/gazetteer.gen.ts')).href);
  const pick = core.cityPickFromRow(core.searchGazetteer('geneva', gz.GAZETTEER)[0]);
  const build = (cities) => core.createTrip(
    { title: 'T', startDate: '2026-03-01', endDate: '2026-03-05', ownerId: 'u1', cities },
    { ids: core.sequentialIds('h'), now: '2026-01-01' },
  );
  const one = (city) => {
    const r = attempt(() => build([city]));
    if (r.threw) return { threw: true, message: r.err.message };
    const row = core.tripSummary(r.value, core.COUNTRY_INDEX);
    return { centre: r.value.cities[0].centre, pick: r.value.cities[0].pick, code: row.cities[0].countryCode, source: row.cities[0].countrySource };
  };

  // H1. How many times is the init's OWN `centre` read? A-86 Part 2's trigger names the fix for
  // exactly this family — "bind the value once, write it into both fields".
  let reads = 0;
  const counting = { name: 'Geneva', pick, get centre() { reads++; return null; } };
  one(counting);
  ok(reads === 1, 'H1  `createTrip` reads `CityInit.centre` exactly ONCE', `it read it ${reads} times`);
  note('the three reads are `c.centre !== undefined ? c.centre : null` (two, short-circuiting on the first when it is `undefined`) and `wroteCentre`\'s own `c.centre !== undefined` a few lines below');

  // H2. THE FINDING. The reads can disagree, and one ordering mints the exact state A-85 Part 2
  // exists to prevent: a stored `{centre: null, pick: live}` with nobody writing `null`.
  let n = 0;
  const flip = { name: 'Geneva', pick, get centre() { n++; return n === 1 ? undefined : { lat: 48.2082, lng: 16.3738 }; } };
  const born = one(flip);
  ok(!(born.centre === null && born.pick !== null),
    'H2  a getter-backed `centre` cannot mint a pick STALE AT BIRTH through this door',
    JSON.stringify(born) + ` (reads=${n})`);
  note(`stored: ${JSON.stringify(born)} — the caller supplied a real coordinate on the read that decided \`wroteCentre\`, and the row reports {${born.code}, ${born.source}}`);

  // H3. The opposite ordering loses the caller's own coordinate to the parser instead.
  let m = 0;
  const flip2 = { name: 'Geneva', pick, get centre() { m++; return m <= 1 ? { lat: 48.2082, lng: 16.3738 } : undefined; } };
  const r2 = one(flip2);
  note(`the opposite ordering (a point, then \`undefined\`): ${r2.threw ? `refused — ${r2.message}` : JSON.stringify(r2)} (reads=${m})`);

  // H4. `init.cities` is itself read twice, and `wroteCentre` is index-aligned to the SECOND read
  // while `standOnPicks` maps the FIRST. A shorter second read moves a city the caller located.
  let j = 0;
  const init = {
    title: 'T', startDate: '2026-03-01', endDate: '2026-03-05', ownerId: 'u1',
    get cities() {
      j++;
      return j === 1
        ? [{ name: 'A', pick, centre: { lat: 48.2082, lng: 16.3738 } }, { name: 'B', pick, centre: { lat: 50, lng: 14 } }]
        : [{ name: 'A', pick, centre: { lat: 48.2082, lng: 16.3738 } }];
    },
  };
  const t = attempt(() => core.createTrip(init, { ids: core.sequentialIds('h4'), now: '2026-01-01' }));
  const bCentre = t.threw ? null : t.value.cities[1].centre;
  ok(j === 1, 'H4  `createTrip` reads `init.cities` exactly ONCE', `it read it ${j} times`);
  ok(t.threw || (bCentre && bCentre.lat === 50),
    'H5  a city the caller gave a `centre` keeps it — `wroteCentre` is aligned with the array actually stored',
    `city B stored ${JSON.stringify(bCentre)} where the caller wrote {lat:50,lng:14} — it was moved onto the pick`);

  // H6. The negative control: a plain object literal is unaffected, so this is about the second
  // read and not about the door's rule.
  const plain = one({ name: 'Geneva', pick });
  ok(plain.centre && plain.centre.lat === pick.centre.lat && plain.code === 'CH',
    'H6  control: a plain literal init still lands on its pick, {CH, picked}', JSON.stringify(plain));
  // …and `order` does not reorder `trip.cities`, so the alignment holds for a plain array.
  const ordered = attempt(() => build([{ name: 'A', order: 5, centre: { lat: 48.2082, lng: 16.3738 } }, { name: 'B', order: 0, pick }]));
  ok(!ordered.threw && ordered.value.cities[0].name === 'A',
    'H7  control: `order` does not re-sort `trip.cities`, so index alignment is safe for a plain array',
    ordered.threw ? ordered.err.message : JSON.stringify(ordered.value.cities.map((c) => c.name)));
}

console.log(`\n${fails} FAIL`);
console.log('COMPLETE');
process.exit(fails > 0 ? 1 : 0);
