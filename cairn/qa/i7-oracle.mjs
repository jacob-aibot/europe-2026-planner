/**
 * QA round 28 (I-7) — the four-number external oracle, re-derived by a THIRD program.
 *
 * A-31 Part 7's "worth more than the golden" check compares `travelStats` against
 * `countries.json`. Both of those are produced from `gen-golden.mjs` / `tripSummary`, which
 * share `countryOf` and `stopLatLng`. This probe walks the document with its OWN loop and its
 * own definition of "coordinate-bearing", so a shared miscount in the two shipped walks has a
 * third witness.
 *
 * Also checks the golden's two clocks (KD-63) are present and that the `afterTheTrip` block
 * is byte-equal to a fresh `travelStats` call, and the `fixtureToday` block to another.
 *
 *   node --experimental-strip-types qa/i7-oracle.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as core from '../packages/core/src/index.ts';
import { loadEurope2026, FIXTURE_TODAY } from '../fixtures/loadEurope2026.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const G = (n) => JSON.parse(readFileSync(resolve(HERE, '..', 'fixtures', 'golden', n), 'utf8'));

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

const { trip } = loadEurope2026();

// ---- Walk 3: my own census, no core derive helpers except countryOf -----------------------
// Deliberately re-implements `stopLatLng`'s contract from ARCHITECTURE §2.2 rather than
// calling it: place link -> place.at, inline -> at, none -> null.
const placeById = new Map(trip.places.map((p) => [p.id, p]));
function myStopAt(s) {
  const l = s.place;
  if (!l) return null;
  if (l.kind === 'inline') return l.at ?? null;
  if (l.kind === 'place') return placeById.get(l.placeId)?.at ?? null;
  return null;
}
let mPlacesLoc = 0, mPlacesAttr = 0, mStopsLoc = 0, mStopsAttr = 0;
for (const p of trip.places) {
  if (!p.at) continue;
  mPlacesLoc++;
  if (core.countryOf(p.at, core.COUNTRY_INDEX) !== null) mPlacesAttr++;
}
const allStops = [...trip.days.flatMap((d) => d.stops), ...trip.pool];
for (const s of allStops) {
  const at = myStopAt(s);
  if (!at) continue;
  mStopsLoc++;
  if (core.countryOf(at, core.COUNTRY_INDEX) !== null) mStopsAttr++;
}

const countries = G('countries.json');
const row = core.tripSummary(trip, core.COUNTRY_INDEX);
const st = core.travelStats([row], '2026-08-24');

console.log('\n== walk 3 vs countries.json vs the row vs travelStats ==');
eq(mPlacesLoc, countries.places.withCoordinates, 'places.located: walk3 == countries.json');
eq(mPlacesLoc, row.attribution.places.located, 'places.located: walk3 == row');
eq(mPlacesLoc, st.located.places, 'places.located: walk3 == travelStats');
eq(mPlacesLoc - mPlacesAttr, countries.unattributedPlaces.length, 'places.unattributed: walk3 == countries.json');
eq(mPlacesLoc - mPlacesAttr, st.unattributed.places, 'places.unattributed: walk3 == travelStats');
eq(mStopsLoc, countries.stops.withCoordinates, 'stops.located: walk3 == countries.json');
eq(mStopsLoc, row.attribution.stops.located, 'stops.located: walk3 == row');
eq(mStopsLoc, st.located.stops, 'stops.located: walk3 == travelStats');
eq(mStopsLoc - mStopsAttr, countries.unattributedStops.length, 'stops.unattributed: walk3 == countries.json');
eq(mStopsLoc - mStopsAttr, st.unattributed.stops, 'stops.unattributed: walk3 == travelStats');
console.log(`   measured: places ${mPlacesLoc}/${mPlacesLoc - mPlacesAttr}, stops ${mStopsLoc}/${mStopsLoc - mStopsAttr}`);

// The pool actually contributes something -- otherwise the "pool is counted" assertion is vacuous.
let poolLocated = 0;
for (const s of trip.pool) if (myStopAt(s)) poolLocated++;
ok(poolLocated > 0, `the pool contributes ${poolLocated} located stops, so "pool included" is not vacuous`);

// ---- KD-63: both clocks present and correct ----------------------------------------------
console.log('\n== KD-63: the golden carries two clocks ==');
const ts = G('travel-stats.json');
ok(ts.clocks && ts.clocks.fixtureToday && ts.clocks.afterTheTrip, 'both clock blocks present');
eq(ts.clocks.fixtureToday.today, FIXTURE_TODAY, 'fixtureToday.today is FIXTURE_TODAY');
ok(core.tripSummary(trip, core.COUNTRY_INDEX).startDate > FIXTURE_TODAY,
  'FIXTURE_TODAY precedes startDate, so the fixture-clock block is the planned case');
const freshFixture = core.travelStats([row], ts.clocks.fixtureToday.today);
const freshAfter = core.travelStats([row], ts.clocks.afterTheTrip.today);
eq(JSON.stringify(freshFixture), JSON.stringify(ts.clocks.fixtureToday.stats), 'fixtureToday block == fresh call');
eq(JSON.stringify(freshAfter), JSON.stringify(ts.clocks.afterTheTrip.stats), 'afterTheTrip block == fresh call');
eq(ts.summaryVersion, core.SUMMARY_VERSION, 'golden summaryVersion == SUMMARY_VERSION');

// No coordinate anywhere in the golden: any float at all.
const floats = [];
(function scan(v, p) {
  if (typeof v === 'number') { if (!Number.isInteger(v)) floats.push(p); return; }
  if (Array.isArray(v)) return v.forEach((x, i) => scan(x, `${p}[${i}]`));
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) scan(x, p ? `${p}.${k}` : k);
})(ts, '');
eq(floats.length, 0, `no non-integer number in travel-stats.json (${floats.join(', ')})`);

console.log(fails === 0 ? '\nALL OK' : `\n${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
