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
  cityRange,
  countryOf,
  createTrip,
  daysForCity,
  orderedCities,
  sequentialIds,
  setDayMeta,
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
  const c = gateRow('');
  // The A-29 fields only: A-56 added `centre`/`firstDay`/`lastDay` beside them and this test is
  // about the acceptance gate, not about the entry's whole shape (which `ROW_PATHS` pins).
  assert.deepEqual(
    { key: c.key, name: c.name, countryCode: c.countryCode, countrySource: c.countrySource },
    { key: c.key, name: 'Stated', countryCode: null, countrySource: null },
  );
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

test('A-56: SUMMARY_VERSION is 5 — the city entry gained a place and dates, so the stamp moves', () => {
  assert.equal(SUMMARY_VERSION, 5);
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

// ---------------------------------------------------------------------------
// §8.4 **A-56** (ROADMAP I-12) — a city entry carries WHERE it is and WHEN it was.
//
// `TripSummaryCity` already survived summarization with `{key, name, countryCode,
// countrySource}`. Two things a memory / route / stamp surface is made of were thrown away at
// the moment they were cheapest to keep: a point to draw the city at, and the days the
// traveller was in it. Both are computable inside `tripSummary` from the document in front of
// it, and `cityRange` has been computing the second one — as a display string — since Phase 1.
//
// **`centre` may not reach a golden, a log line or the CLI** (A-56 Part 5). Its correctness is
// asserted here instead, and deliberately more strongly than a golden could: an equality
// against the document's own `City.centre`, which catches a wrong coordinate that a transcribed
// literal never would.
// ---------------------------------------------------------------------------

/** `cityRange`'s own month table, so the oracle below parses what that function formats. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `"Aug 8–10"` / `"Aug 30–Sep 2"` / `"Aug 8"` → the two `{m, d}` ends it names. */
function parseCityRange(s: string): { first: { m: number; d: number }; last: { m: number; d: number } } {
  const [head, tail] = s.split('–');
  const [hm, hd] = head.split(' ');
  const first = { m: MONTHS.indexOf(hm) + 1, d: Number(hd) };
  if (tail === undefined) return { first, last: first };
  return tail.includes(' ')
    ? { first, last: { m: MONTHS.indexOf(tail.split(' ')[0]) + 1, d: Number(tail.split(' ')[1]) } }
    : { first, last: { m: first.m, d: Number(tail) } };
}

test('A-56: every city entry\'s `centre` IS the document\'s own City.centre — an equality against the source', () => {
  const { trip } = europe2026();
  const row = tripSummary(trip, COUNTRY_INDEX);
  const cities = orderedCities(trip);
  assert.equal(row.cities.length, cities.length);
  assert.ok(cities.length > 1, 'INCONCLUSIVE: one city cannot show a swap');
  for (let i = 0; i < cities.length; i++) {
    assert.deepEqual(
      row.cities[i].centre,
      cities[i].centre,
      `cities[${i}] (${cities[i].name}) carries a coordinate that is not its own City.centre`,
    );
  }
  // …and the six are pairwise distinct, so "every entry equals the source" is a claim these
  // assertions could have caught being false by carrying one city's centre six times.
  const seen = new Set(row.cities.map((c) => `${c.centre.lat},${c.centre.lng}`));
  assert.equal(seen.size, cities.length, 'two city entries share one coordinate');
});

test('A-56: `centre` is the CITY\'s centre and never the country\'s — residue 2, as a ceiling', () => {
  // A-56 Part 5 residue 2: `centre` is a label for where to draw the city, in the same sense
  // §4.4 A-48's `countryKeyPoint` is. It may never answer *"which country was this record
  // in"* — `countrySource` is the field that records which evidence won.
  const { trip } = europe2026();
  const row = tripSummary(trip, COUNTRY_INDEX);
  for (const c of row.cities) {
    assert.equal(typeof c.centre.lat, 'number');
    assert.equal(typeof c.centre.lng, 'number');
  }
  // Two cities in the same country carry two different centres, which a country key point
  // could not do.
  const byCountry = new Map<string, Set<string>>();
  for (const c of row.cities) {
    if (c.countryCode === null) continue;
    const hit = byCountry.get(c.countryCode) ?? new Set<string>();
    hit.add(`${c.centre.lat},${c.centre.lng}`);
    byCountry.set(c.countryCode, hit);
  }
  const hr = byCountry.get('HR');
  assert.ok(hr && hr.size > 1, 'INCONCLUSIVE: the reference trip no longer has two Croatian cities');
});

test('A-56: firstDay/lastDay reproduce cityRange\'s ends for every city of the reference trip', () => {
  // A SECOND PROGRAM's answer to the same question — `cityRange` filters the same days and
  // formats their ends as a display string. A-56 keeps the filter and throws away the
  // formatting, because a display string in a stored row is an i18n retrofit (§2.1).
  const { trip } = europe2026();
  const row = tripSummary(trip, COUNTRY_INDEX);
  let checked = 0;
  for (const c of row.cities) {
    const label = cityRange(trip, c.key);
    if (label === null) {
      assert.equal(c.firstDay, null, `${c.name}: cityRange says no days and the row named one`);
      assert.equal(c.lastDay, null);
      continue;
    }
    assert.ok(c.firstDay !== null && c.lastDay !== null, `${c.name}: cityRange found days and the row did not`);
    const want = parseCityRange(label);
    const got = {
      first: { m: Number(c.firstDay.slice(5, 7)), d: Number(c.firstDay.slice(8, 10)) },
      last: { m: Number(c.lastDay.slice(5, 7)), d: Number(c.lastDay.slice(8, 10)) },
    };
    assert.deepEqual(got, want, `${c.name}: firstDay/lastDay disagree with cityRange "${label}"`);
    checked++;
  }
  assert.equal(checked, 6, 'INCONCLUSIVE: the reference trip no longer has six dated cities');
});

test('A-56: firstDay/lastDay are the ends of daysForCity, in document order', () => {
  const { trip } = europe2026();
  const row = tripSummary(trip, COUNTRY_INDEX);
  for (const c of row.cities) {
    const days = daysForCity(trip, c.key);
    assert.equal(c.firstDay, days.length ? days[0].date : null, `${c.name}: firstDay`);
    assert.equal(c.lastDay, days.length ? days[days.length - 1].date : null, `${c.name}: lastDay`);
  }
});

test('A-56: a city that occupies no day carries null for BOTH — not the trip\'s range, not a guess', () => {
  // `createTrip` mints its day skeleton through `ensureDays`, which marks every blank day
  // `primaryCity: 'transit'` — so a trip whose days were never assigned to its city is exactly
  // this state, and it is the majority population for a completed trip recorded from memory.
  const trip = createTrip(
    {
      title: 'A city on no day',
      startDate: '2026-03-01',
      endDate: '2026-03-04',
      homeCurrency: 'EUR',
      cities: [{ key: 'inside', name: 'Inside', countryCode: 'AA', centre: { lat: 10, lng: 10 } }],
    },
    ctx(),
  );
  assert.ok(trip.days.length > 0, 'INCONCLUSIVE: the fixture has no day skeleton at all');
  assert.deepEqual(daysForCity(trip, 'inside' as never), [], 'INCONCLUSIVE: the fixture\'s city occupies a day');
  const row = tripSummary(trip, TWO_POLYGONS);
  assert.equal(row.cities[0].firstDay, null);
  assert.equal(row.cities[0].lastDay, null);
  // …and the coordinate is still there. "No days" is not "no city".
  assert.deepEqual(row.cities[0].centre, { lat: 10, lng: 10 });
});

test('A-56 residue 1: a day spanning two cities contributes to BOTH, so the ranges overlap', () => {
  const trip = createTrip(
    {
      title: 'One day, two cities',
      startDate: '2026-03-01',
      endDate: '2026-03-03',
      homeCurrency: 'EUR',
      cities: [
        { key: 'a', name: 'Aaa', countryCode: 'AA', centre: { lat: 10, lng: 10 } },
        { key: 'b', name: 'Bbb', countryCode: 'BB', centre: { lat: 50, lng: 50 } },
      ],
    },
    ctx(),
  );
  const withDays = setDayMeta(
    setDayMeta(
      setDayMeta(trip, '2026-03-01' as never, { primaryCity: 'a' as never, cities: ['a'] as never }),
      '2026-03-02' as never,
      // The handover day: the traveller was in both.
      { primaryCity: 'a' as never, cities: ['a', 'b'] as never },
    ),
    '2026-03-03' as never,
    { primaryCity: 'b' as never, cities: ['b'] as never },
  );
  const row = tripSummary(withDays, TWO_POLYGONS);
  assert.deepEqual(
    row.cities.map((c) => [c.key, c.firstDay, c.lastDay]),
    [
      ['a', '2026-03-01', '2026-03-02'],
      ['b', '2026-03-02', '2026-03-03'],
    ],
  );
  // Σ (last − first + 1) = 2 + 2 = 4 over a 3-day trip. A-56 residue 1 in one assertion: NO
  // SURFACE MAY SUM CITY DAY RANGES INTO A TOTAL — the honest answer is a union sweep.
  assert.equal(row.dayCount, 3);
});

test('A-56: the day index is built from the trip, so two trips cannot contaminate one another', () => {
  const { trip } = europe2026();
  const a = tripSummary(trip, COUNTRY_INDEX);
  const other = createTrip(
    {
      title: 'Elsewhere entirely',
      startDate: '1999-01-01',
      endDate: '1999-01-02',
      homeCurrency: 'EUR',
      cities: [{ key: 'inside', name: 'Inside', countryCode: 'AA', centre: { lat: 10, lng: 10 } }],
    },
    ctx(),
  );
  tripSummary(other, TWO_POLYGONS);
  assert.deepEqual(tripSummary(trip, COUNTRY_INDEX), a, 'tripSummary is not pure across calls');
  for (const c of a.cities) {
    if (c.firstDay === null) continue;
    assert.ok(c.firstDay >= trip.startDate && c.lastDay! <= trip.endDate, `${c.name} is dated outside its own trip`);
  }
});

test('A-56 / R43-1: `centre` is COPIED verbatim, not aliased — a row is a value, not a view into the document', () => {
  // A-56 Part 2 says the centre is *"copied verbatim"*, and verbatim means the **values**.
  // `centre` is the first non-primitive leaf ever put on `TripSummaryRow` — every other field
  // is a string, a number, or a freshly allocated array/object (`countryCodes`, `attribution`,
  // the city entry itself) — so *"a stored row is a value"* had been true by construction until
  // now. Round 43 R43-1 measured it false: the row's `centre` WAS the document's own `LatLng`,
  // so `row.cities[0].centre.lat = 0` wrote `0` into the live trip. Live in `memoryStorage`
  // (the CLI and every test), latent behind the web port's structured clone.
  //
  // Built locally rather than from `europe2026()`, whose trip is cached and shared across this
  // file: a regression test for aliasing must not itself mutate a fixture other tests read.
  const trip = createTrip(
    {
      title: 'A row is a value',
      startDate: '2026-03-01',
      endDate: '2026-03-02',
      homeCurrency: 'EUR',
      cities: [
        { key: 'a', name: 'Aaa', countryCode: 'AA', centre: { lat: 10, lng: 10 } },
        { key: 'b', name: 'Bbb', countryCode: 'BB', centre: { lat: 50, lng: 50 } },
      ],
    },
    ctx(),
  );
  const source = orderedCities(trip);
  const row = tripSummary(trip, TWO_POLYGONS);
  assert.equal(row.cities.length, 2, 'INCONCLUSIVE: the fixture lost a city');
  // The values match — A-56 Part 2's actual requirement, unchanged…
  for (let i = 0; i < source.length; i++) {
    assert.deepEqual(row.cities[i].centre, source[i].centre, `cities[${i}]: the centre is not the document's`);
    // …and the identity does NOT, which is the whole finding.
    assert.notEqual(
      row.cities[i].centre,
      source[i].centre,
      `cities[${i}]: the row carries the document's own LatLng object, so writing to one writes to both`,
    );
  }

  // Direction 1 — mutating the row cannot reach the trip.
  row.cities[0].centre.lat = 0;
  row.cities[0].centre.lng = 0;
  assert.deepEqual(source[0].centre, { lat: 10, lng: 10 }, 'writing to the row wrote through to the trip document');

  // Direction 2 — mutating the trip cannot reach a row already minted from it.
  const fresh = tripSummary(trip, TWO_POLYGONS);
  source[1].centre.lat = 99;
  source[1].centre.lng = 99;
  assert.deepEqual(fresh.cities[1].centre, { lat: 50, lng: 50 }, 'writing to the trip wrote through to a minted row');

  // And the copy is a plain `LatLng` — exactly two keys, no smuggled prototype or extra leaf.
  assert.deepEqual(Object.keys(fresh.cities[1].centre).sort(), ['lat', 'lng']);
});
