/**
 * Round 26 — I-6, part 1: `tripSummary(trip, index)` itself.
 *
 *   Run: node --experimental-strip-types qa/i6-summary.mjs      (from cairn/)
 *
 * `countryOf`'s first real consumer. What this attacks:
 *   1. the required-argument throw — shape, type, message, and every falsy/wrong-shape input
 *   2. `null` (unattributed) in the `countryCodes` aggregation — dropped, kept, or crashed?
 *   3. KD-55: `homeBase` excluded — and the pool/unscheduled trip where it is the only signal
 *   4. determinism and purity: same input twice, sorted output, no mutation of `trip`
 *   5. the real-trip shapes: a stop with no place link, a city whose centre is mid-ocean,
 *      a trip with zero days, duplicate cities, a coordinate out of range
 *   6. `cities` vs `countryCodes` consistency, and whether a city's country can appear in
 *      `countryCodes` when no stop was ever in that country
 */
import * as core from '../packages/core/src/index.ts';

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);

const IDX = core.COUNTRY_INDEX;
const CTX = { ids: core.sequentialIds('p-'), now: '2026-08-01', actorUserId: core.LOCAL_OWNER };

const CITY = {
  vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
  zagreb: { key: 'zagreb', name: 'Zagreb', countryCode: 'HR', centre: { lat: 45.815, lng: 15.9819 } },
  // Deliberately mid-Atlantic: `countryOf` must answer `null` and the row must say so.
  atlantis: { key: 'atlantis', name: 'Atlantis', countryCode: 'XX', centre: { lat: 30.0, lng: -40.0 } },
};

function trip(init) {
  return core.createTrip(
    {
      id: init.id ?? 't1',
      title: init.title ?? 'T',
      startDate: init.startDate ?? '2026-08-07',
      endDate: init.endDate ?? '2026-08-09',
      homeCurrency: 'EUR',
      cities: init.cities ?? [CITY.vienna],
      ...(init.homeBase ? { homeBase: init.homeBase } : {}),
    },
    { ids: core.sequentialIds(`${init.id ?? 't1'}-`), now: '2026-08-01', actorUserId: core.LOCAL_OWNER },
  );
}

// ---------------------------------------------------------------------------
head('1 — the required-argument throw (KD-58): shape, type, message');

const badIndexes = [
  ['no argument', () => core.tripSummary(trip({}))],
  ['undefined', () => core.tripSummary(trip({}), undefined)],
  ['null', () => core.tripSummary(trip({}), null)],
  ['{}', () => core.tripSummary(trip({}), {})],
  ['{countries: null}', () => core.tripSummary(trip({}), { countries: null })],
  ['{countries: "AT"}', () => core.tripSummary(trip({}), { countries: 'AT' })],
  ['a number', () => core.tripSummary(trip({}), 42)],
  ['a string', () => core.tripSummary(trip({}), 'COUNTRY_INDEX')],
];
for (const [label, fn] of badIndexes) {
  let caught = null;
  try { fn(); } catch (e) { caught = e; }
  ok(caught instanceof Error, `${label}: throws an Error (not a raw TypeError from deref)`, caught && caught.constructor.name);
  ok(caught && /^tripSummary: /.test(caught.message), `${label}: message is prefixed with the function name`, caught && caught.message.slice(0, 60));
  ok(caught && /ARCHITECTURE §8\.4/.test(caught.message), `${label}: message cites the ruling`);
  ok(caught && caught.constructor === Error, `${label}: plain Error, matching requireActor's style`, caught && caught.constructor.name);
}
// The established style, for comparison — `requireActor` in build/candidates.ts.
{
  let a = null;
  try { core.acceptCandidate(trip({}), 'nope', { ids: core.sequentialIds('x-'), now: '2026-08-01' }); }
  catch (e) { a = e; }
  console.log(`  note  requireActor-style comparator: ${a && a.constructor.name}: ${a && a.message}`);
}
// A trip that is not a trip, with a good index — what does it do?
for (const [label, bad] of [['null trip', null], ['{}', {}], ['a string', 'trip']]) {
  let caught = null;
  try { core.tripSummary(bad, IDX); } catch (e) { caught = e; }
  console.log(`  note  tripSummary(${label}, IDX) -> ${caught ? `${caught.constructor.name}: ${caught.message.slice(0, 70)}` : 'NO THROW'}`);
}

// ---------------------------------------------------------------------------
head('2 — `null` in the countryCodes aggregation');

{
  const t = trip({ cities: [CITY.vienna, CITY.atlantis] });
  const s = core.tripSummary(t, IDX);
  ok(s.cities.length === 2, 'both cities are in `cities`');
  const atl = s.cities.find((c) => c.key === 'atlantis');
  ok(atl && atl.countryCode === null, '`null` survives into cities[].countryCode', atl);
  ok(!s.countryCodes.includes(null), '`null` is NOT in countryCodes');
  ok(!s.countryCodes.some((c) => c === undefined || c === 'null'), 'no undefined/"null" string leaked in');
  ok(JSON.stringify(s.countryCodes) === '["AT"]', 'countryCodes is exactly the attributable ones', s.countryCodes);
  // The honest-hole question: does the ROW say anything about the unattributed city?
  console.log(`  note  the row records the hole only via cities[].countryCode === null; there is`);
  console.log(`  note  no unattributed COUNT on TripSummaryRow (§8.4 puts it on TravelStats, I-7).`);
}
{
  // Every coordinate unattributable: an honest empty, not a fabricated country.
  const t = trip({ cities: [CITY.atlantis] });
  const s = core.tripSummary(t, IDX);
  ok(s.countryCodes.length === 0, 'a wholly unattributable trip is `[]`, never a nearest-country guess', s.countryCodes);
  ok(s.cities[0].countryCode === null, 'and the city reads null');
}

// ---------------------------------------------------------------------------
head('3 — KD-55: homeBase excluded, including the case where it is the only signal');

{
  const t = trip({ cities: [CITY.vienna], homeBase: { name: 'LAX', at: { lat: 33.9416, lng: -118.4085 } } });
  const s = core.tripSummary(t, IDX);
  ok(!s.countryCodes.includes('US'), 'homeBase does not put US on the row', s.countryCodes);
}
{
  // The prompt's scenario: 100% unscheduled/pool, no coordinate-bearing scheduled stop, and
  // a home base that IS the only accurate signal.
  const t = trip({ cities: [], homeBase: { name: 'LAX', at: { lat: 33.9416, lng: -118.4085 } } });
  const s = core.tripSummary(t, IDX);
  ok(s.countryCodes.length === 0, 'a trip whose ONLY coordinate is homeBase reads `[]`', s.countryCodes);
  console.log('  note  KD-55 is defensible here: "where I left from" is not "where I went".');
  console.log('  note  But the row cannot distinguish [] "nowhere recorded" from [] "nowhere');
  console.log('  note  attributable" — I-7\'s `unattributed` is the place that distinction lives.');
}
{
  // Pool stops DO count — verify, because "unscheduled" is the case KD-55 is nearest to.
  let t = trip({ cities: [CITY.vienna] });
  t = core.addStop(
    t,
    { kind: 'pool', cityKey: 'vienna' },
    { title: 'Zagreb Cathedral', place: { kind: 'inline', at: CITY.zagreb.centre } },
    CTX,
  );
  const s = core.tripSummary(t, IDX);
  ok(s.countryCodes.includes('HR'), 'a POOL stop contributes its country', s.countryCodes);
  ok(s.poolCount === 1, 'poolCount still counts it');
}

// ---------------------------------------------------------------------------
head('4 — determinism, purity, sort order');

{
  const t = trip({ cities: [CITY.zagreb, CITY.vienna] });
  const a = core.tripSummary(t, IDX);
  const b = core.tripSummary(t, IDX);
  ok(JSON.stringify(a) === JSON.stringify(b), 'two calls on one input are byte-identical');
  ok(JSON.stringify(a.countryCodes) === JSON.stringify([...a.countryCodes].sort()), 'countryCodes is sorted', a.countryCodes);
  ok(a.cities.map((c) => c.key).join() === 'zagreb,vienna', 'cities keeps DISPLAY order, not sort order', a.cities.map((c) => c.key));
  const before = JSON.stringify(t);
  core.tripSummary(t, IDX);
  ok(JSON.stringify(t) === before, 'the trip is not mutated');
  const idxBefore = IDX.countries.length;
  core.tripSummary(t, IDX);
  ok(IDX.countries.length === idxBefore, 'the index is not mutated');
  ok(a.summaryVersion === core.SUMMARY_VERSION, 'summaryVersion is stamped from the constant', a.summaryVersion);
  // 3 since I-6a: §8.4 **A-29** changed two derivations (a city's stated code may now fill a
  // gap `countryOf` cannot answer, and `cities[]` gained `countrySource`), and clause 3 bumps
  // the stamp whenever any summary field's derivation changes.
  ok(core.SUMMARY_VERSION === 3, 'SUMMARY_VERSION is 3', core.SUMMARY_VERSION);
}

// ---------------------------------------------------------------------------
head('5 — real-trip shapes');

{
  const t = trip({ cities: [] });
  const s = core.tripSummary(t, IDX);
  ok(s.cities.length === 0 && s.countryCodes.length === 0, 'zero-city trip: [] and []');
  ok(s.dayCount === t.days.length, 'dayCount unchanged');
}
{
  // A stop with NO coordinates at all (inline link with no `at`, no placeId).
  let t = trip({ cities: [CITY.vienna] });
  const dayId = t.days[0].id;
  t = core.addStop(t, { kind: 'scheduled', dayId, time: null, order: 0 }, { title: 'A stop with no location', place: { kind: 'none' } }, CTX);
  let s = null, err = null;
  try { s = core.tripSummary(t, IDX); } catch (e) { err = e; }
  ok(err === null, 'a stop with no place does not crash tripSummary', err && err.message);
  ok(s && s.stopCount === 1, 'it is still counted as a stop');
  ok(s && JSON.stringify(s.countryCodes) === '["AT"]', 'and contributes no country', s && s.countryCodes);
}
{
  // A coordinate out of legal range. `inRange` is countryOf's own guard.
  const t = trip({ cities: [{ key: 'bad', name: 'Bad', countryCode: 'XX', centre: { lat: 999, lng: 999 } }] });
  let s = null, err = null;
  try { s = core.tripSummary(t, IDX); } catch (e) { err = e; }
  ok(err === null, 'an out-of-range city centre does not crash', err && err.message);
  ok(s && s.cities[0].countryCode === null, 'it is null, not a guess', s && s.cities[0]);
}
{
  // NaN — the shape a bad parse produces.
  const t = trip({ cities: [{ key: 'nan', name: 'NaN', countryCode: 'XX', centre: { lat: NaN, lng: NaN } }] });
  let s = null, err = null;
  try { s = core.tripSummary(t, IDX); } catch (e) { err = e; }
  ok(err === null, 'NaN coordinates do not crash', err && err.message);
  ok(s && s.cities[0].countryCode === null, 'NaN is null', s && s.cities[0]);
}

// ---------------------------------------------------------------------------
head('6 — the real fixture: the Europe 2026 sample');

{
  const sample = JSON.parse(
    (await import('node:fs')).readFileSync(new URL('../apps/web/src/sample/europe2026.json', import.meta.url), 'utf8'),
  );
  const t = core.fromJSON(sample);
  const s = core.tripSummary(t, IDX);
  console.log(`  note  countryCodes = ${JSON.stringify(s.countryCodes)}`);
  console.log(`  note  cities       = ${JSON.stringify(s.cities.map((c) => `${c.name}:${c.countryCode}`))}`);
  ok(s.countryCodes.includes('US'), 'US is present — via LAX as a STOP, not via homeBase (KD-55)');
  ok(s.cities.every((c) => typeof c.name === 'string' && c.name.length > 0), 'every city carries a usable label (A-10)');
  ok(s.summaryVersion === core.SUMMARY_VERSION, 'stamped');
  // Cross-check: is every city's country also in countryCodes?
  const missing = s.cities.filter((c) => c.countryCode !== null && !s.countryCodes.includes(c.countryCode));
  ok(missing.length === 0, 'every attributed city country is also in countryCodes', missing);
  // ...and does countryCodes contain a country NO city is in? (stops/places-only countries)
  const cityCodes = new Set(s.cities.map((c) => c.countryCode).filter(Boolean));
  console.log(`  note  countries from stops/places only: ${JSON.stringify(s.countryCodes.filter((c) => !cityCodes.has(c)))}`);
}

// ---------------------------------------------------------------------------
head('7 — §8.4 A-29: a city\'s STATED country, gated (round 26 R26-5, closed)');

{
  // Round 26 found `City.countryCode` stored, user-supplied and silently ignored, and measured
  // the bill on this project's own domain: `countryOf` has no answer at Hvar Town, so a
  // Dalmatian-islands trip minted `countryCodes: []` while its every `City` record said `HR`.
  // A-29 admits the stated code as a GAP-FILLER only, behind a four-step gate whose last step
  // is *the shipped index must carry the code*.
  const HVAR = { lat: 43.1729, lng: 16.4413 };
  const at = (countryCode, centre = HVAR) =>
    core.tripSummary(
      trip({ cities: [{ key: 'c', name: 'Stated', countryCode, centre }] }),
      core.COUNTRY_INDEX,
    ).cities[0];

  ok(core.countryOf(HVAR, core.COUNTRY_INDEX) === null,
    'precondition: the shipped index still cannot attribute Hvar Town');
  const filled = at('HR');
  ok(filled.countryCode === 'HR' && filled.countrySource === 'stated',
    'R26-5 CLOSED: the stated code fills the gap, labelled `stated`', filled);
  const vienna = at('HU', { lat: 48.2082, lng: 16.3738 });
  ok(vienna.countryCode === 'AT' && vienna.countrySource === 'coordinate',
    'and NEVER overrides a coordinate that answers — a typo cannot inflate the map', vienna);

  for (const [raw, why] of [
    ['', "createTrip's own default"],
    ['HRV', 'alpha-3'],
    ['Croatia', 'a name'],
    ['H1', 'a digit'],
    ['H R', 'an interior space'],
    ['ZZ', 'well-formed, not in the index'],
    ['RE', 'a real ISO code the index folds into its parent state — refused ON PURPOSE'],
  ]) {
    const c = at(raw);
    ok(c.countryCode === null && c.countrySource === null, `refused: ${JSON.stringify(raw)} (${why})`, c);
  }
  for (const raw of ['hr', '  HR  ']) {
    const c = at(raw);
    ok(c.countryCode === 'HR' && c.countrySource === 'stated', `normalised: ${JSON.stringify(raw)}`, c);
  }
  for (const raw of [null, undefined, 42, {}, ['HR']]) {
    const c = at(raw);
    ok(c.countryCode === null, `total on a non-string: ${JSON.stringify(raw) ?? 'undefined'}`, c);
  }
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}`);
process.exitCode = fails === 0 ? 0 : 1;
