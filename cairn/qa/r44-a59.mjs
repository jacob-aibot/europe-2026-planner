/**
 * QA round 44 — the independent breaker pass over **I-12a** (`ARCHITECTURE.md` §8.4 **A-59**
 * and **A-60**, revision 41): the anonymous city-date throw becomes a counted fallback, the
 * row becomes nameable, and a clamped-away city range says so.
 *
 *   node --experimental-strip-types qa/r44-a59.mjs      (bare Node, no browser, no server)
 *
 * Written from A-59 and A-60 as they are actually worded, and from the shipped source. It does
 * **not** call, extend or trust `packages/core/test/travelStats.test.ts`,
 * `packages/client/test/row-stats-readable.test.ts`, `test/cli.test.ts` or
 * `test/stats-storage.test.ts` — all four were written or amended by the builder of this
 * increment. Where a number here also appears in BUILD-NOTES, it was re-derived by running it.
 *
 * Sections
 *   A  the fence over `git diff 7ef18c9 b574dc5`, and `cairn-constraints` on the ADDED
 *      production lines only.
 *   B  `unreadableCityDates` — the counting rule, per entry, at every shape of input.
 *   C  `rowStatsReadable` — the 2 + 2N matrix, and the three predicates it may not have moved.
 *   D  `unreadableRows` / `rowId` — zero suspects, one, two, the same row twice over, the
 *      duplicate-id case, and the attribution when an innocent row is in the suspect set.
 *   E  **R44-1** — `rowStatsReadable` is documented *"pure, total, never throws"* and is not,
 *      so `travelHistory` now throws out of the very catch block that exists to stop it.
 *   F  **R44-2** — A-60's HALF-NULL fork: the pseudocode and the closing ceiling claim say one
 *      thing, the preamble says another, and the shipped code falsifies the ceiling.
 *   G  A-60's disjointness boundary, at every edge, plus the ceiling as a property.
 *   H  purity, determinism, order-independence, and the rendered CLI outcome.
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as core from '../packages/core/src/index.ts';
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
} from '../packages/client/src/index.ts';
import {
  travelHistory, rowStatsReadable, rowDatesReadable, rowLifecycle, rowUnopenable, summaryScan,
} from '../packages/client/src/selectors/index.ts';
import { loadEurope2026 } from '../fixtures/loadEurope2026.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const ROOT = resolve(CAIRN, '..');

let fails = 0;
const ok = (c, m, extra) => {
  if (c) console.log(`  ok    ${m}`);
  else { fails++; console.log(`  FAIL  ${m}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });

const PRE = '7ef18c9';
const AT = 'b574dc5';
const TODAY = '2026-06-01';

const CITY = {
  vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
  prague: { key: 'prague', name: 'Prague', countryCode: 'CZ', centre: { lat: 50.0755, lng: 14.4378 } },
  split: { key: 'split', name: 'Split', countryCode: 'HR', centre: { lat: 43.5081, lng: 16.4402 } },
  tokyo: { key: 'tokyo', name: 'Tokyo', countryCode: 'JP', centre: { lat: 35.6762, lng: 139.6503 } },
};
const makeTrip = (id, keys, startDate, endDate) =>
  core.createTrip(
    { id, title: `Trip ${id}`, startDate, endDate, homeCurrency: 'EUR', cities: keys.map((k) => CITY[k]) },
    { ids: core.sequentialIds(`${id}-`), now: '2026-08-24', actorUserId: core.LOCAL_OWNER },
  );
/** A minted row, deep-cloned so a test may corrupt it without reaching the document. */
const R = (id, keys = ['vienna'], s = '2026-03-10', e = '2026-03-20') =>
  JSON.parse(JSON.stringify(core.tripSummary(makeTrip(id, keys, s, e), core.COUNTRY_INDEX)));
/** One city entry patched on a fresh row. */
const withCity = (patch, id = 'tc', keys, s, e) => {
  const r = R(id, keys, s, e); Object.assign(r.cities[0], patch); return r;
};
const cityOf = (row, today = TODAY) => core.travelStats([row], today).cities[0];
const span = (c) => [c.firstVisit, c.lastVisit];

// ===========================================================================
head('A. the fence over `git diff 7ef18c9 b574dc5`, and cairn-constraints on the added lines');
// ===========================================================================
{
  const names = git('diff', '--name-only', PRE, AT).trim().split('\n');
  note(`${names.length} files: ${names.map((n) => n.replace('cairn/', '')).join(' ')}`);
  const none = (re, label) => ok(names.filter((n) => re.test(n)).length === 0, label,
    names.filter((n) => re.test(n)));
  none(/\.tsx$/, 'zero `.tsx` files — A-59 Part 4 and A-60 Part 4 both promise this');
  none(/^cairn\/apps\/web\/src\//, 'zero `apps/web/src/`');
  none(/^cairn\/packages\/core\/src\/index\.ts$/, 'zero `packages/core/src/index.ts` — §2.10 unmoved');
  none(/^cairn\/qa\//, 'zero `qa/` — the builder edited no adversarial probe');
  none(/package(-lock)?\.json$/, 'zero dependency change');
  none(/^cairn\/docs\/design\//, 'zero `docs/design/`');
  none(/^(?!cairn\/)/, 'nothing outside `cairn/` — the root planner is untouched');

  // §2.10's surface counted at runtime rather than inferred from a zero-line diff. A-59 claims
  // `isIsoDate` is reached by MODULE PATH and adds no symbol; both halves are checked.
  const surface = Object.keys(core).length;
  ok(surface === 79, `core's runtime export surface is 79 symbols (${surface})`, surface);
  const ts = git('show', `${AT}:cairn/packages/core/src/derive/travelStats.ts`);
  ok(/import \{ isIsoDate \} from '\.\.\/model\/ids\.ts';/.test(ts),
    'A-59: `isIsoDate` is imported by module path, not through `index.ts`');
  ok(!/from '\.\.\/index\.ts'/.test(ts), 'and `travelStats.ts` imports nothing from core\'s own barrel');

  const sv = git('show', `${AT}:cairn/packages/core/src/derive/summary.ts`).match(/export const SUMMARY_VERSION = (\d+);/);
  ok(sv && sv[1] === '5', `SUMMARY_VERSION still reads 5 (${sv && sv[1]})`);

  const md5 = execFileSync('md5sum', [join(ROOT, 'europe-2026-itinerary.html')], { encoding: 'utf8' }).split(' ')[0];
  ok(md5 === '7c69df3208ef91c8be0fb59a56443188', `root planner md5 unchanged (${md5})`);

  const added = git('diff', PRE, AT, '--', 'cairn/packages/core/src', 'cairn/packages/client/src',
    'cairn/apps/web/src', 'cairn/cli.ts')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const code = added.map((l) => l.replace(/^\+\s*(\*|\/\/|\/\*).*$/, '')).join('\n');
  for (const [re, label] of [
    [/console\./, 'console.*'], [/\bfetch\(/, 'fetch('], [/XMLHttpRequest|sendBeacon/, 'beacon/XHR'],
    [/localStorage|sessionStorage/, 'web storage'], [/geolocation|watchPosition/, 'geolocation'],
    [/Date\.now|new Date\(/, 'ambient clock'], [/Math\.random|crypto\.randomUUID/, 'ambient randomness'],
    [/\bdocument\b|\bwindow\b|navigator\./, 'DOM in packages/client'],
    [/imap|gmail|oauth|mailbox|EXIF/i, 'mailbox/EXIF'],
    [/\blat\b\s*:|\blng\b\s*:/, 'a coordinate in an added production line'],
  ]) ok(!re.test(code), `no added production line matches ${label}`,
    code.split('\n').filter((l) => re.test(l)).slice(0, 3));
}

// ===========================================================================
head('B. `unreadableCityDates` — A-59 Part 3\'s counting rule, driven at every shape');
// ===========================================================================
{
  const count = (row) => core.travelStats([row], TODAY).unreadableCityDates;
  ok(count(R('b0')) === 0, 'a clean row counts 0');
  ok(count(withCity({ firstDay: null, lastDay: null })) === 0,
    '`null` on both ends is a VALUE, not a defect — 0');
  const v4 = withCity({}); delete v4.cities[0].firstDay; delete v4.cities[0].lastDay;
  ok(count(v4) === 0, 'an ABSENT key (the version-4 row the rescan has not reached) is 0');
  ok(count(withCity({ firstDay: 'not-a-date' })) === 1, 'one corrupt end counts 1');
  ok(count(withCity({ firstDay: 'x', lastDay: 'y' })) === 1,
    'BOTH ends corrupt still counts 1 — per ENTRY, not per field (A-59 Part 3)');
  ok(count(withCity({ lastDay: 12345 })) === 1, 'a number is present-and-unreadable — 1');
  ok(count(withCity({ firstDay: {} })) === 1, 'an object is present-and-unreadable — 1');
  ok(count(withCity({ firstDay: '2026-3-1' })) === 1, 'the near-miss `2026-3-1` is unreadable — 1');
  ok(count(withCity({ firstDay: '2026-02-30' })) === 1,
    'a CALENDAR-invalid date is unreadable too (residue 2: stricter than the throw it replaces) — 1');

  // Per entry, across entries and across rows.
  const multi = R('bm', ['vienna', 'prague', 'split']);
  multi.cities[0].firstDay = 'x'; multi.cities[0].lastDay = 'y';   // one entry, two fields
  multi.cities[2].lastDay = 42;                                    // one entry, one field
  ok(count(multi) === 2, 'three cities, two corrupt ENTRIES -> 2', count(multi));
  const multi2 = JSON.parse(JSON.stringify(multi)); multi2.id = 'bm2';
  ok(core.travelStats([multi, multi2], TODAY).unreadableCityDates === 4,
    'the same corruption in two rows -> 4 — the count is over the whole library');

  // The builder's disclosed micro-decision, reproduced and ruled on here.
  const unnamed = withCity({ name: '   ', firstDay: 'x' }, 'bu');
  const s = core.travelStats([unnamed], TODAY);
  ok(s.unnamedCities === 1 && s.unreadableCityDates === 0 && s.cities.length === 0,
    'an entry that is BOTH unnamed and date-corrupt counts once, in `unnamedCities` only',
    { unnamedCities: s.unnamedCities, unreadableCityDates: s.unreadableCityDates, cities: s.cities.length });
  note('CONFIRMED as the right call. `unreadableCityDates` is defined as *"the entry fell back to');
  note('its trip\'s range"*; an unnamed entry emits no city row and falls back to nothing. Counting');
  note('it in both would double-count one entry across two absorption counters that otherwise');
  note('partition cleanly, and A-59 Part 3\'s "maximum one per cities[] entry" holds either way.');

  // A PLANNED row is never walked, so its corruption is never absorbed and never counted.
  const planned = withCity({ firstDay: 'nope' }, 'bp', ['vienna'], '2027-01-01', '2027-01-10');
  const ps = core.travelStats([planned], TODAY);
  ok(ps.unreadableCityDates === 0 && ps.cities.length === 0,
    'a PLANNED row\'s corrupt city date is neither absorbed nor counted — it is not walked at all');
  note('Consistent with the field\'s docstring, which counts fallbacks and not corruptions. It does');
  note('mean the CLI line reads 0 for a library whose only corruption is in trips not yet started,');
  note('while `rowStatsReadable` flags that row. Recorded, not filed: the two measure different things.');
}

// ===========================================================================
head('C. `rowStatsReadable` — the 2 + 2N matrix, and the ceiling A-59 Part 4 sets');
// ===========================================================================
{
  const bad = (f) => { const r = R('c1'); f(r); return r; };
  const cases = [
    ['clean', R('c0'), true],
    ['corrupt startDate', bad((r) => { r.startDate = 'x'; }), false],
    ['corrupt endDate', bad((r) => { r.endDate = '2026-3-1'; }), false],
    ['corrupt cities[0].firstDay', bad((r) => { r.cities[0].firstDay = 'x'; }), false],
    ['cities[0].lastDay is a number', bad((r) => { r.cities[0].lastDay = 5; }), false],
    ['cities[0].firstDay is null', bad((r) => { r.cities[0].firstDay = null; }), true],
    ['both city keys absent (v4 row)', bad((r) => { delete r.cities[0].firstDay; delete r.cities[0].lastDay; }), true],
    ['calendar-invalid 2026-02-30', bad((r) => { r.cities[0].firstDay = '2026-02-30'; }), false],
    ['trip AND city date both corrupt', bad((r) => { r.startDate = 'x'; r.cities[0].firstDay = 'y'; }), false],
  ];
  for (const [label, row, want] of cases) {
    let got; try { got = rowStatsReadable(row); } catch (e) { got = `THREW: ${e.message}`; }
    ok(got === want, `rowStatsReadable: ${label} -> ${JSON.stringify(want)}`, got);
  }
  // Every one of the 2 + 2N fields matters, on a three-city row.
  for (let i = 0; i < 3; i++) {
    for (const f of ['firstDay', 'lastDay']) {
      const r = R('cn', ['vienna', 'prague', 'split']);
      r.cities[i][f] = 'x';
      ok(rowStatsReadable(r) === false, `cities[${i}].${f} alone makes the row unreadable`);
    }
  }
  // The ceiling: the new predicate is a SIBLING, and the other three did not move.
  const cityBad = bad((r) => { r.cities[1] = { ...R('cx', ['vienna', 'prague']).cities[1], firstDay: 'x' }; });
  const three = R('cy', ['vienna', 'prague']); three.cities[1].firstDay = 'x';
  ok(rowStatsReadable(three) === false, 'A-59 F-E: the row is unreadable…');
  ok(rowDatesReadable(three) === true, '…while A-46 F-C still reads its own two dates as fine');
  ok(rowLifecycle(three, TODAY) !== null, '…and A-44 F-B still classifies it');
  ok(rowUnopenable({ library: [three], openFailures: [] }, three.id) !== undefined,
    '…and A-47 F-D is answerable for it');
  note(`rowUnopenable(row) = ${rowUnopenable({ library: [three], openFailures: [] }, three.id)} — ` +
    'A-59 Part 4 forbids folding F-E into it; that is checked in the shipped test, not re-asserted here.');
  void cityBad;
}

// ===========================================================================
head('D. `unreadableRows` / `rowId` — zero suspects, one, two, and an innocent in the set');
// ===========================================================================
{
  const good = R('d-good'), other = R('d-other', ['tokyo'], '2019-04-01', '2019-04-09');
  const badTrip = (id) => { const r = R(id); r.startDate = 'not-a-date'; return r; };
  const badCity = (id) => { const r = R(id); r.cities[0].firstDay = 'x'; return r; };
  const run = (lib, today = TODAY) => travelHistory({ library: lib }, today);

  const clean = run([good, other]);
  ok(clean.ok === true, 'a clean library is ok:true and carries no `unreadableRows` at all');
  ok(!('unreadableRows' in clean), 'the ok:true branch has no `unreadableRows` key — not `[]`, absent');

  const cityOnly = run([badCity('d-c'), good]);
  ok(cityOnly.ok === true, 'A-59 Part 2: a corrupt CITY date no longer refuses the library');

  const one = run([badTrip('d-1'), good]);
  ok(one.ok === false && one.rowId === 'd-1' && JSON.stringify(one.unreadableRows) === '["d-1"]',
    'one suspect -> named, and `unreadableRows` is exactly it', one);

  const two = run([badTrip('d-1'), badTrip('d-2')]);
  ok(two.ok === false && two.rowId === null && two.unreadableRows.length === 2,
    'two suspects -> `rowId` null and both listed in library order', two);
  ok(JSON.stringify(two.unreadableRows) === '["d-1","d-2"]', 'library order, not sorted', two.unreadableRows);

  const both = (() => { const r = R('d-both'); r.startDate = 'x'; r.cities[0].firstDay = 'y'; return r; })();
  const b = run([both, good]);
  ok(b.ok === false && b.rowId === 'd-both' && b.unreadableRows.length === 1,
    'one row corrupt at BOTH the trip AND the city level is named exactly ONCE', b);

  const dup = run([good, JSON.parse(JSON.stringify(good))]);
  ok(dup.ok === false && dup.rowId === 'd-good' && JSON.stringify(dup.unreadableRows) === '[]',
    'the duplicate-id case keeps its own `rowId` and reports `unreadableRows: []` — honestly empty', dup);

  // Zero suspects on the failure branch: the degenerate case must be [] + null, not populated.
  const zero = run([good, other], 'not-a-date');
  ok(zero.ok === false && zero.rowId === null && JSON.stringify(zero.unreadableRows) === '[]',
    'a failure with NO unreadable row is `[]` + `rowId: null`, not a degenerate populated case', zero);

  // An innocent row in the suspect set: attribution degrades to null rather than misnaming.
  const mixed = run([badTrip('d-guilty'), badCity('d-innocent')]);
  ok(mixed.rowId === null && mixed.unreadableRows.length === 2,
    'a guilty row beside an innocent-but-flagged one degrades to `rowId: null` rather than misnaming', mixed);
  note('The converse is reachable only through a malformed `today`, which is programmer error:');
  const misattributed = run([good, badCity('d-innocent2')], 'not-a-date');
  note(`  travelHistory(library, 'not-a-date') names rowId=${JSON.stringify(misattributed.rowId)} for a clock fault.`);
  note('  `today` comes from `clock.today()` on every shipped surface, so this is recorded, not filed.');
}

// ===========================================================================
head('E. R44-1 — `rowStatsReadable` is documented total and is not, and `travelHistory` now throws');
// ===========================================================================
{
  const src = git('show', `${AT}:cairn/packages/client/src/selectors/index.ts`);
  ok(/Pure, total, never throws, opens nothing\./.test(src),
    'the docstring shipped with this increment claims `rowStatsReadable` is TOTAL');

  // A GENUINE version-1 row, per the ledger in `SUMMARY_VERSION`'s own docstring: the ten
  // Phase-1 keys and nothing else. `cities` arrives at version 2, so a version-1 row has none.
  const versionOneRow = (doc) => {
    const r = core.tripSummary(doc, core.COUNTRY_INDEX);
    return { id: r.id, title: r.title, startDate: r.startDate, endDate: r.endDate,
      datePrecision: r.datePrecision, cityCount: r.cityCount, dayCount: r.dayCount,
      stopCount: r.stopCount, poolCount: r.poolCount, revision: r.revision };
  };
  const doc1 = makeTrip('t-v1', ['vienna'], '2024-05-01', '2024-05-10');
  const doc5 = makeTrip('t-v5', ['prague'], '2024-06-01', '2024-06-10');
  const st = memoryStorage();
  await st.saveIfVersion('t-v1', null, core.toJSON(doc1), versionOneRow(doc1));
  await st.saveIfVersion('t-v5', null, core.toJSON(doc5), core.tripSummary(doc5, core.COUNTRY_INDEX));
  const store = createStore({ ports: {
    storage: st, file: memoryFile(), clock: fixedClockPort('2026-08-24'),
    ids: sequentialIdPort('r44-'), scheduler: immediateScheduler(),
  } });
  await store.refreshLibrary();
  const lib = store.getState().library;
  const v1 = lib.find((r) => r.id === 't-v1');
  ok(v1 !== undefined && !('cities' in v1),
    'a genuine version-1 row is in `state.library` and carries NO `cities` key', Object.keys(v1 ?? {}));
  ok(summaryScan(store.getState()).phase === 'stale',
    'and the rescan has not reached it — this is the window `refreshLibrary` legitimately leaves open');
  ok(rowLifecycle(v1, '2026-08-24') !== null && rowDatesReadable(v1) === true,
    'the three older row gates are all TOTAL over it — A-44 and A-46 both answer');

  let threw = null;
  try { rowStatsReadable(v1); } catch (e) { threw = `${e.constructor.name}: ${e.message}`; }
  ok(threw === null, 'FINDING R44-1: `rowStatsReadable` must not throw on a version-1 row', threw);

  let hist = null, escaped = null;
  try { hist = travelHistory(store.getState(), '2026-08-24'); } catch (e) { escaped = `${e.constructor.name}: ${e.message}`; }
  ok(escaped === null,
    'FINDING R44-1: `travelHistory` must REFUSE rather than throw — it is the catch A-37 Part 2 mandates',
    escaped);
  if (hist) ok(hist.ok === false && hist.rowId === null, 'and the refusal is the ok:false branch', hist);

  // The same libraries at the parent commit, to place the regression.
  note('At 7ef18c9 the same three libraries all returned `{ok:false, rowId:null}` — measured in a');
  note('worktree at the parent commit. The throw from `travelStats` was pre-existing; what I-12a');
  note('changed is that the refusal boundary no longer holds it. Two more shapes, same cause:');
  for (const [label, mut] of [
    ['cities: null', (r) => { r.cities = null; }],
    ['cities: [null]', (r) => { r.cities = [null]; }],
  ]) {
    const r = R('e-x'); mut(r);
    let esc = null;
    try { travelHistory({ library: [r] }, TODAY); } catch (e) { esc = e.message; }
    ok(esc === null, `FINDING R44-1: \`travelHistory\` must refuse rather than throw for \`${label}\``, esc);
  }
  // And the one that is wrong rather than fatal.
  const strung = R('e-s'); strung.cities = 'nope';
  let sr; try { sr = rowStatsReadable(strung); } catch (e) { sr = `THREW: ${e.message}`; }
  note(`rowStatsReadable({cities: 'nope'}) = ${JSON.stringify(sr)} — a string is iterable, so a ` +
    'garbage row reads READABLE rather than throwing. Same missing guard, opposite symptom.');
  ok(sr !== true, 'FINDING R44-1: a non-array `cities` must not read as READABLE', sr);
}

// ===========================================================================
head('F. R44-2 — A-60\'s HALF-NULL fork, and the ceiling claim it falsifies');
// ===========================================================================
{
  // A-60 Part 2's pseudocode, transcribed from ARCHITECTURE.md §8.4 by hand:
  //
  //   rawA = inDomain(dayNumber(firstDay))
  //   rawB = max(rawA, inDomain(dayNumber(lastDay)))
  //   if (firstDay is null/absent/unreadable)  -> [a, b]        // A-56 clause 2, A-59 Part 2
  //   else if (rawB < a || rawA > b)           -> [a, b]        // A-60: disjoint
  //   else  cityA = min(b, max(a, rawA)); cityB = max(cityA, min(b, max(a, rawB)))
  //
  // and its closing claim, also transcribed:
  //
  //   "After this the city line is never more assertive than its country's line at the same
  //    clock, and every day it names is either a day the city's own range contains or the
  //    trip's whole window."
  //
  // The shipped code scopes the pair-wide fallback to *unreadable* only; a cleanly-`null`
  // `firstDay` keeps the pre-existing per-field `?? row.startDate`. Both readings are
  // defensible from the text. Only one of them satisfies the closing claim.
  const hn = (firstDay, lastDay, today = TODAY, s = '2026-03-10', e = '2026-03-20') =>
    span(cityOf(withCity({ firstDay, lastDay }, 'f1', ['vienna'], s, e), today));

  note(`firstDay null, lastDay 2026-03-14  -> ${JSON.stringify(hn(null, '2026-03-14'))}  (literal A-60: ["2026-03-10","2026-03-20"])`);
  note(`firstDay null, lastDay 2020-01-01  -> ${JSON.stringify(hn(null, '2020-01-01'))}  (literal A-60: ["2026-03-10","2026-03-20"])`);
  note(`firstDay 2026-03-14, lastDay null  -> ${JSON.stringify(hn('2026-03-14', null))}  (the pseudocode does not cover this arm at all)`);
  note(`firstDay "x",  lastDay 2026-03-14  -> ${JSON.stringify(hn('x', '2026-03-14'))}  (unreadable: pair-wide, as ruled)`);
  note(`firstDay null, lastDay null        -> ${JSON.stringify(hn(null, null))}  (both readings agree here)`);

  // The measurable consequence: a single day named for a city with no usable evidence, which
  // is the exact artefact class A-60 exists to remove — one trigger short.
  const row = withCity({ firstDay: null, lastDay: '2020-01-01' }, 'f2');
  const s = core.travelStats([row], TODAY);
  const city = s.cities[0], country = s.countries.find((c) => c.code === city.countryCode);
  ok(!(city.firstVisit > country.firstVisit || city.lastVisit < country.lastVisit),
    'FINDING R44-2: A-60 Part 2 — a city line may not be MORE assertive than its country line',
    { city: span(city), country: [country.firstVisit, country.lastVisit] });
  ok(s.unreadableCityDates === 0,
    'and nothing counts it: `null` is a value, so the CLI line stays silent about the collapse');
  note('A-60 Part 2\'s closing claim also says every day a city names is "a day the city\'s own');
  note('range contains, or the trip\'s whole window". 2026-03-10 is neither. The literal reading of');
  note('the pseudocode satisfies the claim; the shipped narrower reading does not.');
  note('Injected the literal reading (pair-wide fallback whenever EITHER end is null/absent/');
  note('unreadable, count still on `unreadable` only): the FULL suite stays 1235 pass / 0 fail.');
  note('So no shipped test distinguishes the two readings — this is an unpinned fork, not a');
  note('regression, and it needs A-60\'s own text corrected either way. -> architect.');

  // The second way the closing claim is falsified, and this one is A-31/A-56's, not A-60's.
  const zz = withCity({ countryCode: 'ZZ' }, 'f3');
  const zs = core.travelStats([zz], TODAY);
  note(`a city whose stored countryCode is off-index ("ZZ") prints a city line with NO country ` +
    `line to be less assertive than: countries=${JSON.stringify(zs.countries.map((c) => c.code))}, ` +
    `cities=${JSON.stringify(zs.cities.map((c) => c.countryCode))}. Pre-existing, not I-12a's.`);
}

// ===========================================================================
head('G. A-60\'s disjointness boundary, and the ceiling as a property over real data');
// ===========================================================================
{
  // Trip [03-10, 03-20], completed, so [a, b] = [03-10, 03-20].
  const d = (f, l) => span(cityOf(withCity({ firstDay: f, lastDay: l }, 'g1')));
  const eq = (got, want, label) => ok(JSON.stringify(got) === JSON.stringify(want), label, got);

  eq(d('2026-03-12', '2026-03-14'), ['2026-03-12', '2026-03-14'], 'an interior range passes through untouched');
  eq(d('2026-03-05', '2026-03-10'), ['2026-03-10', '2026-03-10'],
    'a range TOUCHING `a` on its last day intersects — the single day is a real arrival day, kept');
  eq(d('2026-03-04', '2026-03-09'), ['2026-03-10', '2026-03-20'],
    'one day further out it is disjoint and takes the trip\'s range (the `rawB < a` edge)');
  eq(d('2026-03-20', '2026-03-25'), ['2026-03-20', '2026-03-20'],
    'a range TOUCHING `b` on its first day intersects — kept');
  eq(d('2026-03-21', '2026-03-25'), ['2026-03-10', '2026-03-20'],
    'one day further out it is disjoint (the `rawA > b` edge)');
  eq(d('1999-01-01', '2099-01-01'), ['2026-03-10', '2026-03-20'],
    'a range CONTAINING [a, b] is not disjoint, and clamps to [a, b] — same answer, different path');
  eq(d('2026-03-28', '2026-03-25'), ['2026-03-10', '2026-03-20'],
    'an INVERTED pair wholly after the trip collapses first, then reads disjoint');
  eq(d('2026-03-25', '2026-03-15'), ['2026-03-10', '2026-03-20'],
    'an inverted pair straddling `b` collapses onto its first, which is past `b` — disjoint');
  eq(d('2026-03-18', '2026-03-12'), ['2026-03-18', '2026-03-18'],
    'an inverted pair INSIDE the window still collapses onto its first (A-56 clause 1, unchanged)');

  // The active ceiling, which is where R43-4 lived.
  const act = (f, l) => span(cityOf(withCity({ firstDay: f, lastDay: l }, 'g2', ['vienna'],
    '2026-08-07', '2026-08-22'), '2026-08-12'));
  eq(act('2026-08-18', '2026-08-21'), ['2026-08-07', '2026-08-12'],
    'R43-4: a city the traveller has NOT reached reports the trip\'s clamped range, not today');
  eq(act('2026-08-12', '2026-08-15'), ['2026-08-12', '2026-08-12'],
    'and a city they arrive in TODAY keeps its genuine single day — the precision A-56 bought');

  // The ceiling as a property, over the real trip and over a mixed corrupt library.
  const ceilingBreaks = (rows, today) => {
    const s = core.travelStats(rows, today);
    const byCode = new Map(s.countries.map((c) => [c.code, c]));
    return s.cities.flatMap((c) => {
      const k = byCode.get(c.countryCode);
      if (!k) return [];
      return (c.firstVisit < k.firstVisit || c.lastVisit > k.lastVisit)
        ? [{ city: c.name, city: span(c), country: [k.firstVisit, k.lastVisit] }] : [];
    });
  };
  const refRow = core.tripSummary(loadEurope2026().trip, core.COUNTRY_INDEX);
  for (const t of ['2026-08-07', '2026-08-12', '2026-08-18', '2026-08-22', '2026-08-24', '2027-01-01']) {
    const bad = ceilingBreaks([refRow], t);
    ok(bad.length === 0, `no city line escapes its own country's range at --today ${t}`, bad);
  }
  const corrupt = R('g3', ['vienna', 'prague']); corrupt.cities[0].firstDay = 'x'; corrupt.cities[1].lastDay = 42;
  ok(ceilingBreaks([corrupt, R('g4', ['vienna'], '2020-01-01', '2020-01-05')], TODAY).length === 0,
    'and none escapes over a mixed corrupt/clean library either');
}

// ===========================================================================
head('H. purity, determinism, order-independence, and the rendered CLI outcome');
// ===========================================================================
{
  const r1 = R('h1', ['vienna'], '2026-03-01', '2026-03-10'); r1.cities[0].firstDay = 'x';
  const r2 = R('h2', ['vienna', 'prague'], '2026-04-01', '2026-04-10'); r2.cities[1].lastDay = 7;
  const r3 = R('h3', ['prague'], '2026-05-01', '2026-05-10');
  const frozen = JSON.stringify([r1, r2, r3]);
  const A = core.travelStats([r1, r2, r3], TODAY);
  const B = core.travelStats([r3, r2, r1], TODAY);
  ok(JSON.stringify([r1, r2, r3]) === frozen, 'travelStats does not mutate its input rows');
  ok(JSON.stringify(A) === JSON.stringify(core.travelStats([r1, r2, r3], TODAY)),
    'travelStats is deterministic across calls');
  ok(A.unreadableCityDates === B.unreadableCityDates && A.unreadableCityDates === 2,
    `the new count is order-independent (${A.unreadableCityDates} / ${B.unreadableCityDates})`);
  ok(JSON.stringify(A) === JSON.stringify(B), 'and the whole statistic is order-independent');

  // A-59 residue 3, measured: a corrupt row still reports plausible wrong dates.
  const clean = R('h4', ['vienna'], '2026-03-05', '2026-03-06');
  const wide = R('h5', ['vienna'], '2020-01-01', '2029-12-31'); wide.cities[0].firstDay = 'garbage';
  const folded = core.travelStats([clean, wide], '2030-01-01').cities[0];
  note(`residue 3 live: one corrupt row widens Vienna to ${JSON.stringify(span(folded))} — ` +
    'only `unreadableCityDates` says anything happened. Disclosed and unchanged.');

  // The rendered outcome, A-60 Part 2's six values, read out of the real CLI.
  const out = execFileSync('node', ['cli.ts', 'stats', '--today', '2026-08-12'],
    { cwd: CAIRN, encoding: 'utf8' });
  for (const [code, name, range] of [
    ['AT', 'Vienna', '2026-08-08 → 2026-08-10'],
    ['HR', 'Dubrovnik', '2026-08-10 → 2026-08-12'],
    ['HR', 'Split', '2026-08-12 → 2026-08-12'],
    ['HU', 'Budapest', '2026-08-07 → 2026-08-12'],
    ['GB', 'London', '2026-08-07 → 2026-08-12'],
    ['CZ', 'Prague', '2026-08-07 → 2026-08-12'],
  ]) ok(new RegExp(`${code}\\s+${name}\\s+${range}`).test(out),
    `cli stats --today 2026-08-12: ${code} ${name} ${range}`, out.split('\n').filter((l) => l.includes(name)));
  ok(!/(Budapest|London|Prague)\s+2026-08-12 → 2026-08-12/.test(out),
    'R43-4 is gone: no unreached city prints today as a single-day visit');
  ok(!/\d\.\d/.test(out), 'and `cli stats` still prints no decimal at all — no coordinate reaches it');
  ok(!/unreadable stored dates/.test(out),
    'the new `unreadableCityDates` line stays silent on a clean library (the `unnamedCities` idiom)');
  note('That line\'s POSITIVE branch is unreachable from `cli stats`, which only ever mints rows');
  note('from the sample — exactly as `unnamedCities`\' line beside it has always been. Recorded.');
}

console.log(fails === 0 ? '\nALL OK' : `\n${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
