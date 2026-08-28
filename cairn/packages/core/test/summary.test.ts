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
    // Derived from the city's own coordinate through the injected index. §8.4 **A-29** lets a
    // *stated* `City.countryCode` fill a gap the coordinate cannot answer — but never override
    // one, so on every city the index can attribute this is still the coordinate's answer.
    assert.equal(row.cities[i].countryCode, countryOf(cities[i].centre, COUNTRY_INDEX));
    assert.equal(row.cities[i].countrySource, 'coordinate');
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
  // `'ZZ'` is well-formed and the gate still refuses it: `TWO_POLYGONS` carries no such code,
  // so the map has no ring to draw for it (§8.4 A-29 Part 3, step 4).
  assert.deepEqual(row.cities.map((c) => c.countrySource), ['coordinate', null]);
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
  // …including through A-29's gate: an index carrying no codes at all can draw no country, so
  // no stated code survives step 4 either. The gate's alphabet is the index's own.
  assert.deepEqual(
    tripSummary(trip, empty).cities.map((c) => c.countrySource),
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

// ---------------------------------------------------------------------------
// §8.4 **A-29** — a city's *stated* country fills a gap the coordinate cannot
// answer, never overrides one, and only if the index can draw it.
// ---------------------------------------------------------------------------

/**
 * Hvar Town, Dalmatia. Measured against the shipped artefact: `countryOf` returns **`null`**
 * here — no ring in the 1:10m admin-0 layer contains it, which A-26 ruled is the *correct*
 * answer for a coordinate the dataset has no evidence about. The document's own `City`
 * record nevertheless says `HR`, and that is a second, independent piece of evidence.
 */
const HVAR = { lat: 43.1729, lng: 16.4413 };
const VIENNA = { lat: 48.2082, lng: 16.3738 };

/** One city, one hand-built stated code, and nothing else that could contribute a country. */
function statedCity(countryCode: string, centre: LatLng): Trip {
  return createTrip(
    {
      title: 'A-29 gate',
      startDate: '2026-03-01',
      endDate: '2026-03-02',
      homeCurrency: 'EUR',
      cities: [{ name: 'Stated', countryCode, centre }],
    },
    ctx(),
  );
}

const gateRow = (countryCode: string, centre: LatLng = HVAR) =>
  tripSummary(statedCity(countryCode, centre), COUNTRY_INDEX).cities[0];

test('A-29 precondition: countryOf has no answer at Hvar Town, so the gap is real', () => {
  assert.equal(
    countryOf(HVAR, COUNTRY_INDEX),
    null,
    'INCONCLUSIVE: the index now attributes Hvar, so every test below tests nothing',
  );
});

test('A-29 gap-fill: a stated HR on a city the index cannot attribute is admitted', () => {
  const row = tripSummary(statedCity('HR', HVAR), COUNTRY_INDEX);
  assert.deepEqual(row.cities[0].countryCode, 'HR');
  assert.equal(row.cities[0].countrySource, 'stated');
  assert.deepEqual(row.countryCodes, ['HR'], 'the stated code never reached countryCodes');
});

test('A-29 non-override: a coordinate that answers WINS over a stated code that disagrees', () => {
  // A Vienna city record mistyped as `HU`. The coordinate says `AT` and the coordinate is the
  // answer; the stated value is not consulted at all. Had the rule been "union both", one
  // mistyped field would put Hungary on the lifetime map permanently.
  const row = tripSummary(statedCity('HU', VIENNA), COUNTRY_INDEX);
  assert.equal(row.cities[0].countryCode, 'AT');
  assert.equal(row.cities[0].countrySource, 'coordinate');
  assert.deepEqual(row.countryCodes, ['AT']);
  assert.equal(row.countryCodes.includes('HU' as CountryCode), false, 'a stated typo inflated the map');
});

test('A-29 gate: an empty stated code is refused', () => {
  // `''` is `createTrip`'s own default (`c.countryCode ?? ''`), so this is the ordinary case
  // for every city created inside the product today.
  assert.deepEqual(gateRow(''), { key: gateRow('').key, name: 'Stated', countryCode: null, countrySource: null });
});

test('A-29 gate: a lowercase two-letter code is normalised, not refused', () => {
  const c = gateRow('hr');
  assert.equal(c.countryCode, 'HR');
  assert.equal(c.countrySource, 'stated');
});

test('A-29 gate: surrounding whitespace is trimmed before the shape is judged', () => {
  const c = gateRow('  HR  ');
  assert.equal(c.countryCode, 'HR');
  assert.equal(c.countrySource, 'stated');
});

test('A-29 gate: an alpha-3 code is refused — the gate is exactly two letters', () => {
  assert.equal(gateRow('HRV').countryCode, null);
  assert.equal(gateRow('HRV').countrySource, null);
});

test('A-29 gate: a country NAME is refused', () => {
  assert.equal(gateRow('Croatia').countryCode, null);
  assert.equal(gateRow('H1').countryCode, null, 'a digit passed the letters-only shape');
  assert.equal(gateRow('H R').countryCode, null, 'an interior space passed the shape');
});

test('A-29 gate: ZZ is well-formed and still refused — the index carries no such code', () => {
  assert.equal(
    COUNTRY_INDEX.countries.some((e) => e.code === ('ZZ' as CountryCode)),
    false,
    'INCONCLUSIVE: the index now carries ZZ',
  );
  assert.equal(gateRow('ZZ').countryCode, null);
  assert.equal(gateRow('ZZ').countrySource, null);
});

test('A-29 gate: RE is a real ISO code and is refused ON PURPOSE — do not "fix" this', () => {
  // Réunion. `RE` is a genuine ISO 3166-1 alpha-2 code, and the gate refuses it because the
  // shipped index does not carry it: Natural Earth's admin-0 layer folds Réunion into France,
  // so there is no ring here to fill. §8.4 clause 3's second consequence draws the lifetime
  // map from *this index's own rings with no tiles behind it*, so admitting `RE` would name a
  // country the signature screen silently omits. The coordinate attribution already answers
  // the parent state for `RE`, `GF`, `GP`, `MQ`, `YT`, `SJ`, `TK` and `BQ`, and that is the
  // better answer. A-29 Part 3, and residue 2.
  assert.equal(
    COUNTRY_INDEX.countries.some((e) => e.code === ('RE' as CountryCode)),
    false,
    'INCONCLUSIVE: the index now carries RE, so this test no longer says what it means',
  );
  assert.equal(gateRow('RE').countryCode, null);
  assert.equal(gateRow('RE').countrySource, null);
});

test('A-29 gate: a non-string stated code cannot crash the helper — it is total', () => {
  // `fromJSON` guarantees a string for a stored document; a hand-built fixture does not, and
  // §8.4 clause 3 is reached from the CLI and from tests with hand-built trips.
  const trip = statedCity('HR', HVAR);
  for (const bad of [null, undefined, 42, {}, ['HR']]) {
    const mutated = {
      ...trip,
      cities: [{ ...trip.cities[0], countryCode: bad as unknown as string }],
    };
    const row = tripSummary(mutated, COUNTRY_INDEX);
    assert.equal(row.cities[0].countryCode, null, `${JSON.stringify(bad)} was admitted`);
    assert.equal(row.cities[0].countrySource, null);
  }
});

test('A-29: countrySource is null exactly when countryCode is null', () => {
  const trips = [
    tripSummary(statedCity('HR', HVAR), COUNTRY_INDEX),
    tripSummary(statedCity('HU', VIENNA), COUNTRY_INDEX),
    tripSummary(statedCity('', HVAR), COUNTRY_INDEX),
    tripSummary(europe2026().trip, COUNTRY_INDEX),
  ];
  for (const row of trips) {
    for (const c of row.cities) {
      assert.equal(
        c.countrySource === null,
        c.countryCode === null,
        `${c.name}: ${JSON.stringify(c)} breaks the "null exactly when null" pairing`,
      );
      if (c.countrySource !== null) {
        assert.ok(['coordinate', 'stated'].includes(c.countrySource), `bad source ${c.countrySource}`);
      }
    }
  }
});

test('A-29: a stated code on a city does NOT rescue that city\'s places and stops', () => {
  // Residue 1's other half: `Place` and `Stop` have no stated country and none is being added,
  // so a place on Vis stays unattributed and honestly so. Here the trip's only *coordinate*
  // evidence is the city centre, and `countryCodes` gets `HR` from the city's own entry only.
  const row = tripSummary(statedCity('HR', HVAR), COUNTRY_INDEX);
  assert.deepEqual(row.countryCodes, ['HR']);
  assert.equal(row.stopCount, 0, 'INCONCLUSIVE: the fixture grew stops');
});

test('A-31: SUMMARY_VERSION is 4 — the row gained a census, so the stamp moves', () => {
  assert.equal(SUMMARY_VERSION, 4);
});

test('A-29 non-regression: the reference trip does not move, and every city is coordinate-derived', () => {
  const { trip } = europe2026();
  const row = tripSummary(trip, COUNTRY_INDEX);
  assert.deepEqual(row.countryCodes, ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US']);
  assert.deepEqual(row.cities.map((c) => c.countrySource), row.cities.map(() => 'coordinate'));
  // …and every one of the six *states* the same code its coordinate derives, which is why the
  // stated branch is unreachable on the only real trip we have and its tests are hand-built.
  for (const c of orderedCities(trip)) {
    assert.equal(c.countryCode.toUpperCase(), countryOf(c.centre, COUNTRY_INDEX));
  }
});

// ---------------------------------------------------------------------------
// §8.4 **A-31** Part 2 — the record census `countryCodes` was computed from.
//
// `unattributed: {places, stops}` on `TravelStats` was never computable from the
// revision-23 row: there is no `placeCount`, and `stopCount`/`poolCount` count
// *records*, not *coordinate-bearing* records. Two numbers per record class close
// that, and `located` is the one that separates "nothing to attribute" from
// "everything attributed" — the distinction the Profile's "no places yet" rests on.
// ---------------------------------------------------------------------------

/** Every coordinate-bearing stop of the trip, scheduled and pooled, in the row's own order. */
function coordinateStops(trip: Trip): LatLng[] {
  const out: LatLng[] = [];
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

test('A-31: places.located counts coordinate-bearing places; attributed, the ones countryOf named', () => {
  const { trip } = europe2026();
  const row = tripSummary(trip, COUNTRY_INDEX);
  const located = trip.places.filter((p) => p.at !== null);
  assert.equal(row.attribution.places.located, located.length);
  assert.equal(
    row.attribution.places.attributed,
    located.filter((p) => countryOf(p.at as LatLng, COUNTRY_INDEX) !== null).length,
  );
  assert.ok(located.length < trip.places.length || located.length === trip.places.length);
});

test('A-31: stops.located counts scheduled AND pooled stops — the same walk countryCodes uses', () => {
  const { trip } = europe2026();
  const row = tripSummary(trip, COUNTRY_INDEX);
  const ats = coordinateStops(trip);
  assert.ok(trip.pool.length > 0, 'INCONCLUSIVE: the fixture has no pooled stops, so the pool half is untested');
  assert.equal(row.attribution.stops.located, ats.length);
  assert.equal(
    row.attribution.stops.attributed,
    ats.filter((at) => countryOf(at, COUNTRY_INDEX) !== null).length,
  );
});

test('A-31: attributed is never greater than located, on every census of every fixture', () => {
  const rows = [
    tripSummary(europe2026().trip, COUNTRY_INDEX),
    tripSummary(statedCity('HR', HVAR), COUNTRY_INDEX),
    tripSummary(europe2026().trip, countryIndex({ scale: 'test', source: 'empty', countries: [] })),
  ];
  for (const row of rows) {
    for (const c of [row.attribution.places, row.attribution.stops]) {
      assert.ok(c.attributed <= c.located, `attributed ${c.attributed} > located ${c.located}`);
      assert.ok(Number.isInteger(c.located) && Number.isInteger(c.attributed));
    }
  }
});

/**
 * A-31 Part 7's last paragraph — **the check that is worth more than the golden.**
 *
 * `gen-golden.mjs` walks the document directly; `tripSummary` walks it again inside the write
 * that mints the row. Four numbers, two programs, one trip. This is the assertion that would
 * catch the row's census and the golden's census walking different records — dropping
 * `trip.pool` from the row is the injected fault, and `countries.json` counts pooled stops.
 */
test('A-31: the row census equals countries.json — four numbers, two independent walks', () => {
  const { trip } = europe2026();
  const row = tripSummary(trip, COUNTRY_INDEX);
  const g = golden<{
    stops: { withCoordinates: number };
    places: { withCoordinates: number };
    unattributedStops: unknown[];
    unattributedPlaces: unknown[];
  }>('countries.json');
  assert.equal(row.attribution.stops.located, g.stops.withCoordinates, 'stops.located');
  assert.equal(
    row.attribution.stops.located - row.attribution.stops.attributed,
    g.unattributedStops.length,
    'unattributed stops',
  );
  assert.equal(row.attribution.places.located, g.places.withCoordinates, 'places.located');
  assert.equal(
    row.attribution.places.located - row.attribution.places.attributed,
    g.unattributedPlaces.length,
    'unattributed places',
  );
});

test('A-31: a trip with no coordinate-bearing record censuses zero, not a guess', () => {
  // One city (a `City.centre` is non-nullable, so the city census is `cities[]`), no place and
  // no stop. This is the row behind the Profile's *"no places yet"* — distinguishable from a
  // trip whose every coordinate the dataset could not name only because `located` exists.
  const trip = createTrip(
    {
      title: 'Nothing to attribute',
      startDate: '2026-03-01',
      endDate: '2026-03-02',
      homeCurrency: 'EUR',
      cities: [{ name: 'Inside', countryCode: 'AA', centre: { lat: 10, lng: 10 } }],
    },
    ctx(),
  );
  const row = tripSummary(trip, TWO_POLYGONS);
  assert.deepEqual(row.attribution, {
    places: { located: 0, attributed: 0 },
    stops: { located: 0, attributed: 0 },
  });
});

test('A-31: a located record the index cannot name is located and NOT attributed', () => {
  const trip = createTrip(
    {
      title: 'A hole with a coordinate in it',
      startDate: '2026-03-01',
      endDate: '2026-03-02',
      homeCurrency: 'EUR',
      cities: [{ name: 'Inside', countryCode: 'AA', centre: { lat: 10, lng: 10 } }],
    },
    ctx(),
  );
  // Two places: one inside "AA", one mid-ocean that no polygon contains.
  const withPlaces: Trip = {
    ...trip,
    places: [
      { id: 'place-in', cityKey: trip.cities[0].key, name: 'In', at: { lat: 10, lng: 10 }, category: 'sight' },
      { id: 'place-out', cityKey: trip.cities[0].key, name: 'Out', at: { lat: 0, lng: 0 }, category: 'sight' },
    ] as unknown as Trip['places'],
  };
  const row = tripSummary(withPlaces, TWO_POLYGONS);
  assert.deepEqual(row.attribution.places, { located: 2, attributed: 1 });
});
