/**
 * The widened `TripSummaryRow` — ARCHITECTURE §8.4 clause 3, ROADMAP Phase 2 **I-6**.
 *
 * `tripSummary(trip, index)` gains `countryCodes`, `cities` and `summaryVersion`, and the
 * country index is a **required** second argument. §8.4's own reason, which this file
 * asserts rather than restates: an optional index has a default behaviour, and the only
 * available default is *"emit a row with no countries"* — a row that claims to be complete
 * and is not. Making it required means there is no way to mint a summary that silently
 * forgot the countries.
 *
 * `cities` carries `{ key, name, countryCode }` and **not** a bare `CityKey` (§2.2 A-10): a
 * key is an opaque minted id, so it can neither label a pin nor join two trips, and a row
 * that must be resolved against a document it does not carry is not a summary.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { europe2026, golden } from './fixture.ts';
import {
  COUNTRY_INDEX,
  SUMMARY_VERSION,
  countryOf,
  createTrip,
  orderedCities,
  sequentialIds,
  stopLatLng,
  tripSummary,
} from '../src/index.ts';
import type { CountryCode, LatLng, Trip } from '../src/index.ts';
// §2.10's "tests do not create surface": the index CONSTRUCTOR is internal, and a test that
// builds a two-polygon fixture is exactly the case that exemption is written for.
import { countryIndex } from '../src/geo/countryIndex.ts';

type GoldenCountries = { countries: Array<{ code: string }> };

/** Every coordinate the trip itself states, in the order the summary must consider them. */
function tripCoordinates(trip: Trip): LatLng[] {
  const out: LatLng[] = [];
  for (const c of trip.cities) out.push(c.centre);
  for (const p of trip.places) if (p.at) out.push(p.at);
  for (const d of trip.days) for (const s of d.stops) {
    const at = stopLatLng(s, trip);
    if (at) out.push(at);
  }
  for (const s of trip.pool) {
    const at = stopLatLng(s, trip);
    if (at) out.push(at);
  }
  return out;
}

const ctx = () => ({ ids: sequentialIds('s'), now: '2026-01-01', actorUserId: 'local:self' });

/** A square degree of "AA" around (10,10) and one of "BB" around (50,50). */
const TWO_POLYGONS = countryIndex({
  scale: 'test',
  source: 'hand-built',
  countries: [
    { code: 'AA' as CountryCode, rings: [[9, 9, 11, 9, 11, 11, 9, 11, 9, 9]] },
    { code: 'BB' as CountryCode, rings: [[49, 49, 51, 49, 51, 51, 49, 51, 49, 49]] },
  ],
});

// ---------------------------------------------------------------- the required index

test('I-6: the index is a REQUIRED argument — no call can mint a row with no countries', () => {
  const { trip } = europe2026();
  assert.throws(
    // The whole point of §8.4's ruling: the one-argument call is a programmer error and is
    // refused loudly, rather than defaulting to a row that claims completeness with no
    // countries in it. `as never` is how a compile-time refusal is reached at runtime.
    () => (tripSummary as unknown as (t: Trip) => unknown)(trip),
    /country index/i,
    'tripSummary accepted a call with no index',
  );
});

test('I-6: tripSummary stamps the current SUMMARY_VERSION', () => {
  const { trip } = europe2026();
  assert.equal(typeof SUMMARY_VERSION, 'number');
  assert.ok(SUMMARY_VERSION >= 1, 'SUMMARY_VERSION must be a positive integer');
  assert.equal(tripSummary(trip, COUNTRY_INDEX).summaryVersion, SUMMARY_VERSION);
});

// ---------------------------------------------------------------- cities

test('I-6: `cities` carries key, NAME and countryCode — never a bare CityKey (A-10)', () => {
  const { trip } = europe2026();
  const row = tripSummary(trip, COUNTRY_INDEX);
  const cities = orderedCities(trip);
  assert.equal(row.cities.length, cities.length);
  assert.equal(row.cityCount, row.cities.length, 'cityCount and cities disagree about the same trip');
  for (let i = 0; i < cities.length; i++) {
    assert.equal(row.cities[i].key, cities[i].key);
    assert.equal(row.cities[i].name, cities[i].name);
    assert.ok(row.cities[i].name.length > 0, 'a city row carries no name — the pin cannot be labelled');
    // Derived from the city's own coordinate through the injected index, never copied from
    // `City.countryCode` (which is importer metadata and is not nullable).
    assert.equal(row.cities[i].countryCode, countryOf(cities[i].centre, COUNTRY_INDEX));
  }
});

test('I-6: a city whose centre no polygon contains carries countryCode null, never a guess', () => {
  const trip = createTrip(
    {
      title: 'Two squares',
      startDate: '2026-03-01',
      endDate: '2026-03-02',
      homeCurrency: 'EUR',
      cities: [
        { name: 'Inside', countryCode: 'AA', centre: { lat: 10, lng: 10 } },
        { name: 'Nowhere', countryCode: 'ZZ', centre: { lat: 0, lng: 0 } },
      ],
    },
    ctx(),
  );
  const row = tripSummary(trip, TWO_POLYGONS);
  assert.deepEqual(row.cities.map((c) => c.countryCode), ['AA', null]);
  assert.deepEqual(row.countryCodes, ['AA'], 'a null attribution leaked into countryCodes');
});

// ---------------------------------------------------------------- countryCodes

test('I-6: countryCodes is the sorted distinct set the trip itself states', () => {
  const { trip } = europe2026();
  const row = tripSummary(trip, COUNTRY_INDEX);
  const expected = [
    ...new Set(
      tripCoordinates(trip)
        .map((at) => countryOf(at, COUNTRY_INDEX))
        .filter((c): c is CountryCode => c !== null),
    ),
  ].sort();
  assert.deepEqual(row.countryCodes, expected);
  assert.deepEqual([...row.countryCodes].sort(), row.countryCodes, 'countryCodes is not sorted');
  assert.equal(new Set(row.countryCodes).size, row.countryCodes.length, 'countryCodes has a duplicate');
});

test('I-6: the Europe 2026 row reproduces the I-5 attribution golden, code for code', () => {
  const { trip } = europe2026();
  const g = golden<GoldenCountries>('countries.json');
  assert.deepEqual(
    tripSummary(trip, COUNTRY_INDEX).countryCodes,
    g.countries.map((c) => c.code).sort(),
  );
});

test('I-6: homeBase alone never adds a country — a trip does not visit where it starts from', () => {
  const trip = createTrip(
    {
      title: 'Home is not a visit',
      startDate: '2026-03-01',
      endDate: '2026-03-02',
      homeCurrency: 'EUR',
      homeBase: { name: 'Somewhere in BB', at: { lat: 50, lng: 50 } },
      cities: [{ name: 'Inside', countryCode: 'AA', centre: { lat: 10, lng: 10 } }],
    },
    ctx(),
  );
  const row = tripSummary(trip, TWO_POLYGONS);
  assert.equal(countryOf({ lat: 50, lng: 50 }, TWO_POLYGONS), 'BB', 'INCONCLUSIVE: the fixture does not attribute the home base');
  assert.deepEqual(row.countryCodes, ['AA'], 'the home base was counted as a country the trip visited');
});

// ---------------------------------------------------------------- purity / injection

test('I-6: tripSummary is pure and takes its whole answer from the injected index', () => {
  const { trip } = europe2026();
  const a = tripSummary(trip, COUNTRY_INDEX);
  const b = tripSummary(trip, COUNTRY_INDEX);
  assert.deepEqual(a, b);
  assert.notEqual(a, b, 'the same object came back twice — something is memoising');
  // A different index is a different answer, which is what "injected" has to mean.
  const empty = countryIndex({ scale: 'test', source: 'empty', countries: [] });
  assert.deepEqual(tripSummary(trip, empty).countryCodes, []);
  assert.deepEqual(
    tripSummary(trip, empty).cities.map((c) => c.countryCode),
    trip.cities.map(() => null),
  );
  // …and the trip itself is untouched by any of it.
  assert.deepEqual(tripSummary(trip, COUNTRY_INDEX), a);
});

/**
 * I-6's stated dependency on **I-4a** (§2.2 A-10), asserted rather than assumed.
 *
 * Before city keys were minted ids, both web forms slugged the display name with
 * `name.toLowerCase().replace(…)`, which deleted every non-ASCII-alphanumeric character and
 * collapsed 東京 and 京都 to the single key `"-"`. A summary row carrying that key would put
 * one pin on the lifetime map for two cities and label it with nothing — which is exactly why
 * `cities` carries `{key, name, countryCode}` and why this increment was blocked on that one.
 */
test('I-6: two non-Latin city names produce two rows, each carrying its own name', () => {
  const trip = createTrip(
    {
      title: '日本 2027',
      startDate: '2027-04-01',
      endDate: '2027-04-03',
      homeCurrency: 'JPY',
      cities: [
        { name: '東京', countryCode: 'JP', centre: { lat: 35.6762, lng: 139.6503 } },
        { name: '京都', countryCode: 'JP', centre: { lat: 35.0116, lng: 135.7681 } },
      ],
    },
    ctx(),
  );
  const row = tripSummary(trip, COUNTRY_INDEX);
  assert.equal(row.cities.length, 2);
  assert.equal(new Set(row.cities.map((c) => c.key)).size, 2, 'two cities collapsed to one key');
  assert.deepEqual(row.cities.map((c) => c.name), ['東京', '京都']);
  assert.deepEqual(row.cities.map((c) => c.countryCode), ['JP', 'JP']);
  assert.deepEqual(row.countryCodes, ['JP'], 'two cities in one country are one country');
  for (const c of row.cities) assert.ok(!/^-*$/.test(c.key), `key ${JSON.stringify(c.key)} is a dead slug`);
});
