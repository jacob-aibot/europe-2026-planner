/**
 * `countryOf` (ARCHITECTURE §8.4 clause 1) and the attribution golden — ROADMAP Phase 2 I-5's
 * exit criterion 4, in full.
 *
 * The size budget is not here: it is `0-countryBudget.test.ts`, which runs first and never
 * imports the generated module, because a guard that has to load the thing it guards cannot
 * report on a module too big to load.
 *
 * **What this file measures, in the criterion's own order:**
 *   1. the golden names every distinct country AND the stop that produced it;
 *   2. a mid-Atlantic coordinate is `null`;
 *   3. the historical Fisherman's Bastion typo changes the attributed country **and** still
 *      produces its `geo_outlier` blocker;
 *   4. the Dalmatian islands — and the measured answer, which is not the one the criterion
 *      predicted; see the block comment on that test and BUILD-NOTES **KD-51**;
 *   5. the attack list: the poles, the antimeridian, exactly `(0,0)`, an enclave, international
 *      waters;
 *   6. purity and injection — the same function, over a four-polygon fixture, with no committed
 *      dataset anywhere near it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { europe2026, FIXTURE_TODAY, golden } from './fixture.ts';
import { COUNTRY_INDEX, countryOf, detectConflicts, stopLatLng } from '../src/index.ts';
import type { LatLng, Place, Trip } from '../src/index.ts';
// §2.10's "tests do not create surface": the index CONSTRUCTOR is internal, and a test that
// builds a four-polygon fixture is exactly the case the exemption is written for.
import { countryIndex } from '../src/geo/countryIndex.ts';

type GoldenCountries = {
  index: { scale: string; source: string; countries: number; rings: number };
  stops: { total: number; withCoordinates: number; attributed: number; unattributed: number };
  places: { total: number; withCoordinates: number; attributed: number; unattributed: number };
  countries: Array<{
    code: string;
    stops: number;
    places: number;
    namedBy: { dayId: string | null; stopId: string; name: string } | null;
  }>;
  unattributedStops: Array<{ dayId: string | null; stopId: string; name: string }>;
  unattributedPlaces: Array<{ placeId: string; name: string }>;
};

function allStops(trip: Trip): Array<{ dayId: string | null; stopId: string; name: string; at: LatLng | null }> {
  const out: Array<{ dayId: string | null; stopId: string; name: string; at: LatLng | null }> = [];
  for (const day of trip.days) {
    for (const stop of day.stops) out.push({ dayId: day.id, stopId: stop.id, name: stop.name, at: stopLatLng(stop, trip) });
  }
  for (const stop of trip.pool) out.push({ dayId: null, stopId: stop.id, name: stop.name, at: stopLatLng(stop, trip) });
  return out;
}

function withPlaceMoved(trip: Trip, placeId: string, dLat: number): Trip {
  return {
    ...trip,
    places: trip.places.map((p) =>
      p.id === placeId && p.at ? ({ ...p, at: { lat: p.at.lat + dLat, lng: p.at.lng } } as Place) : p,
    ),
  };
}

// ---------------------------------------------------------------- 1. the golden

test('I-5 criterion 4: the golden is reproduced exactly by running countryOf today', () => {
  const { trip } = europe2026();
  const g = golden<GoldenCountries>('countries.json');

  const counts = new Map<string, { stops: number; places: number }>();
  const unattributedStops: Array<{ dayId: string | null; stopId: string; name: string }> = [];
  for (const s of allStops(trip)) {
    if (!s.at) continue;
    const code = countryOf(s.at, COUNTRY_INDEX);
    if (code === null) {
      unattributedStops.push({ dayId: s.dayId, stopId: s.stopId, name: s.name });
      continue;
    }
    const row = counts.get(code) ?? { stops: 0, places: 0 };
    row.stops++;
    counts.set(code, row);
  }
  const unattributedPlaces: Array<{ placeId: string; name: string }> = [];
  for (const p of trip.places) {
    if (!p.at) continue;
    const code = countryOf(p.at, COUNTRY_INDEX);
    if (code === null) {
      unattributedPlaces.push({ placeId: p.id, name: p.name });
      continue;
    }
    const row = counts.get(code) ?? { stops: 0, places: 0 };
    row.places++;
    counts.set(code, row);
  }

  assert.deepEqual(
    [...counts.keys()].sort(),
    g.countries.map((c) => c.code),
    'the set of attributed countries has moved — run `npm run golden` and read the diff',
  );
  for (const row of g.countries) {
    assert.deepEqual({ ...counts.get(row.code) }, { stops: row.stops, places: row.places }, `counts for ${row.code}`);
  }
  assert.deepEqual(unattributedStops, g.unattributedStops);
  assert.deepEqual(unattributedPlaces, g.unattributedPlaces);
});

/**
 * The headline half of criterion 4, and the one that would fail silently if it were written the
 * other way round: **a country attributed with no stop named for it fails the run.** A code in a
 * summary row with nothing behind it is a pin on the lifetime map with no travel under it.
 */
test('I-5 criterion 4: every distinct country in the golden names a stop, and that stop really produces it', () => {
  const { trip } = europe2026();
  const g = golden<GoldenCountries>('countries.json');
  const stops = new Map(allStops(trip).map((s) => [s.stopId, s]));

  assert.ok(g.countries.length > 0, 'the golden attributes no countries at all');
  for (const row of g.countries) {
    assert.ok(row.namedBy, `country ${row.code} is in the golden with no stop named for it`);
    const stop = stops.get(row.namedBy.stopId);
    assert.ok(stop, `${row.code} names ${row.namedBy.stopId}, which is not a stop on this trip`);
    assert.equal(stop.name, row.namedBy.name, `${row.code}'s named stop has been renamed`);
    assert.equal(stop.dayId, row.namedBy.dayId, `${row.code}'s named stop has moved day`);
    assert.ok(stop.at, `${row.code}'s named stop resolves to no coordinate`);
    assert.equal(
      countryOf(stop.at, COUNTRY_INDEX),
      row.code,
      `${row.code}'s named stop "${stop.name}" does not attribute to ${row.code}`,
    );
    assert.ok(row.stops >= 1, `${row.code} is named by a stop but its stop count is ${row.stops}`);
  }
});

/**
 * The same rule the conflict golden carries (`conflict.test.ts`): no coordinate reaches a
 * committed golden. The root `CLAUDE.md` boundary is that no copy of the live planner's `DAYS`
 * lands under `cairn/`, and 132 latitudes is a copy of the half of `DAYS` that matters most.
 */
test('I-5: no coordinate reached the committed attribution golden', () => {
  const raw = golden<Record<string, unknown>>('countries.json');
  // Walked as VALUES, not as text. `conflict.test.ts`'s version greps the serialised string,
  // which here would trip on the `v5.1.2` in the source citation — a version, not a latitude.
  // Every number this golden legitimately carries is a count, and a count is an integer.
  const floats: string[] = [];
  const walk = (v: unknown, path: string): void => {
    if (typeof v === 'number') {
      if (!Number.isInteger(v)) floats.push(`${path}=${v}`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    }
  };
  walk(raw, '$');
  assert.deepEqual(floats, [], 'a coordinate reached the committed golden');
});

test('I-5: the golden records which dataset produced it', () => {
  const g = golden<GoldenCountries>('countries.json');
  assert.equal(g.index.scale, COUNTRY_INDEX.scale);
  assert.equal(g.index.source, COUNTRY_INDEX.source);
  assert.match(g.index.source, /nvkelso\/natural-earth-vector@v5\.1\.2\//);
  assert.equal(g.index.countries, COUNTRY_INDEX.countries.length);
});

// ---------------------------------------------------------------- 2. the honest hole

test('I-5 criterion 4: a mid-Atlantic coordinate is null, and null is never widened to a guess', () => {
  // 30°N 40°W — roughly halfway between the Azores and Bermuda, a thousand kilometres from any
  // coast. The nearest country is a real thing; it is not the answer, and there is no argument
  // shape by which it could become one. §8.4: "never snapped to the nearest country".
  assert.equal(countryOf({ lat: 30, lng: -40 }, COUNTRY_INDEX), null);
  assert.equal(countryOf({ lat: 0, lng: -25 }, COUNTRY_INDEX), null);
  assert.equal(countryOf({ lat: -40, lng: -30 }, COUNTRY_INDEX), null);
});

test('I-5: a coordinate outside the legal range, or not a number, is null rather than an exception', () => {
  for (const at of [
    { lat: NaN, lng: 0 },
    { lat: 0, lng: NaN },
    { lat: 91, lng: 0 },
    { lat: -91, lng: 0 },
    { lat: 0, lng: 181 },
    { lat: 0, lng: -181 },
    { lat: Infinity, lng: Infinity },
  ]) {
    assert.equal(countryOf(at, COUNTRY_INDEX), null, `${JSON.stringify(at)} should be unattributed`);
  }
});

// ---------------------------------------------------------------- 3. the injected fault

/**
 * The historical bug, re-injected: `place-68` (Fisherman's Bastion) at lat 47.5025 is Budapest;
 * at 48.5025 it is 111 km north, and the planner rendered it without visibly breaking. Criterion
 * 4 asks for BOTH halves — the attribution moves *and* the existing blocker still fires — because
 * either one on its own is a system that has half-noticed.
 */
test('I-5 criterion 4: the Fisherman\'s Bastion typo changes the attributed country', () => {
  const { trip } = europe2026();
  const before = trip.places.find((p) => p.id === 'place-68');
  assert.ok(before?.at, 'place-68 must exist and carry a coordinate');
  assert.match(before.name, /Fisherman|Bastion/i, `place-68 is "${before.name}"`);

  const typo = withPlaceMoved(trip, 'place-68', 1);
  const after = typo.places.find((p) => p.id === 'place-68')!;

  assert.equal(countryOf(before.at, COUNTRY_INDEX), 'HU', 'the correct coordinate is in Hungary');
  assert.equal(countryOf(after.at!, COUNTRY_INDEX), 'SK', 'one digit of latitude puts it in Slovakia');
  assert.notEqual(countryOf(before.at, COUNTRY_INDEX), countryOf(after.at!, COUNTRY_INDEX));
});

test('I-5 criterion 4: the same typo still produces its geo_outlier blocker', () => {
  const { trip } = europe2026();
  const before = detectConflicts(trip, { today: FIXTURE_TODAY });
  const typo = withPlaceMoved(trip, 'place-68', 1);
  const after = detectConflicts(typo, { today: FIXTURE_TODAY });

  const added = after.filter((c) => !before.some((b) => b.id === c.id));
  assert.equal(added.length, 1, `expected exactly one new conflict, got ${added.map((c) => c.ruleId).join(', ')}`);
  assert.equal(added[0].ruleId, 'geo_outlier');
  assert.equal(added[0].severity, 'blocker');
  assert.deepEqual(added[0].subjects, [{ kind: 'place', id: 'place-68' }]);
});

// ---------------------------------------------------------------- 4. the Dalmatian islands

/**
 * **This is the one measurement in I-5 that came out against the criterion, and it is recorded
 * here as a number rather than smoothed over. BUILD-NOTES KD-51 is the divergence entry.**
 *
 * Criterion 4 says the three Dalmatian records attribute to **HR**, and that if they do not, the
 * generator moves to 1:50m and *"the budget moves, not the criterion"*. Lokrum does attribute to
 * HR at 1:110m. `Blue Cave, Biševo` and `Stiniva Cove, Vis` do not, at **any** Natural Earth
 * admin-0 scale — those islands are 4 km and 9 km across and only 1:10m carries either of them —
 * and the escalation the criterion prescribes makes the trip **worse**, measured, not argued:
 *
 * | scale | emitted bytes | unattributed places (of 94) | unattributed stops (of 132) |
 * |---|---|---|---|
 * | 1:110m *(shipped)* | 175,085 | **3** | **4** |
 * | 1:50m | 1,648,598 | 24 | 31 |
 * | 1:10m | 9,072,727 | 21 | 26 |
 *
 * The reason is the direction simplification runs at a jagged coast: a coarse ring bulges *out*
 * over the sea and swallows shoreline points, while a finer one tracks the real waterline and
 * drops anything a few hundred metres seaward of it. At 1:50m the Split peninsula is generalised
 * away and Dubrovnik's Old Town falls outside Croatia; at 1:10m the coastline is accurate to
 * ~400 m and the fixture's shoreline coordinates still fall on the water side of it.
 *
 * So the shipped answer for those two is `null` — the honest hole §8.4 makes a first-class
 * answer — and the escalation rule is left to the architect rather than applied to a dataset it
 * makes worse. The assertions below pin the *measured* answers, including the two nulls, so that
 * the day the attribution improves is a red test rather than an unnoticed silence.
 */
test('I-5 criterion 4: Lokrum attributes to HR at the shipped scale', () => {
  const { trip } = europe2026();
  const lokrum = trip.places.find((p) => p.name === 'Lokrum Island');
  assert.ok(lokrum?.at, 'Lokrum Island must be in the fixture with a coordinate');
  assert.equal(countryOf(lokrum.at, COUNTRY_INDEX), 'HR');
});

test('I-5 criterion 4: the two open-sea Dalmatian islands are unattributed, and that is measured, not chosen', () => {
  const { trip } = europe2026();
  for (const name of ['Blue Cave, Biševo', 'Stiniva Cove, Vis']) {
    const place = trip.places.find((p) => p.name === name);
    assert.ok(place?.at, `${name} must be in the fixture with a coordinate`);
    assert.equal(
      countryOf(place.at, COUNTRY_INDEX),
      null,
      `${name} now attributes — if the index improved, update the golden and KD-51; if something ` +
        'started guessing, that is the defect §8.4 forbids',
    );
  }
});

test('I-5: Croatia is still the trip\'s best-attributed country despite those two holes', () => {
  const g = golden<GoldenCountries>('countries.json');
  const hr = g.countries.find((c) => c.code === 'HR');
  assert.ok(hr, 'HR is not attributed at all — the escalation question is now urgent, not academic');
  assert.ok(hr.places >= 20, `only ${hr.places} Croatian places attributed`);
});

// ---------------------------------------------------------------- 5. the attack list

test('I-5 attack: the poles', () => {
  // No admin-0 polygon covers the Arctic Ocean, so the north pole is an honest hole. The south
  // pole is inside Antarctica's ring and comes back AQ — which is a real ISO 3166-1 code.
  assert.equal(countryOf({ lat: 90, lng: 0 }, COUNTRY_INDEX), null);
  assert.equal(countryOf({ lat: 89.9, lng: 0 }, COUNTRY_INDEX), null);
  assert.equal(countryOf({ lat: 90, lng: 180 }, COUNTRY_INDEX), null);
  assert.equal(countryOf({ lat: -90, lng: 0 }, COUNTRY_INDEX), 'AQ');
  assert.equal(countryOf({ lat: -89.9, lng: 0 }, COUNTRY_INDEX), 'AQ');
  assert.equal(countryOf({ lat: -90, lng: -180 }, COUNTRY_INDEX), 'AQ');
});

test('I-5 attack: the antimeridian — no wrapping, and both halves of a straddling country answer', () => {
  // Admin-0 rings are clipped at ±180°, so Russia arrives as two sets of polygons and neither the
  // ray nor the bounding box ever has to cross the line. Both sides answer RU.
  assert.equal(countryOf({ lat: 66, lng: 179.9 }, COUNTRY_INDEX), 'RU');
  assert.equal(countryOf({ lat: 66, lng: -179.9 }, COUNTRY_INDEX), 'RU');
  assert.equal(countryOf({ lat: 66, lng: -180 }, COUNTRY_INDEX), 'RU');
  // Exactly +180 is the clip line itself: the ray is cast towards +∞ longitude and there is
  // nothing east of it to cross, so it is `null`. Arbitrary but deterministic — the property a
  // golden needs — and documented in `derive/country.ts` rather than discovered by a reader.
  assert.equal(countryOf({ lat: 66, lng: 180 }, COUNTRY_INDEX), null);
  // Beyond the legal range is not "wrapped to 179" — it is out of range, so null.
  assert.equal(countryOf({ lat: 66, lng: 181 }, COUNTRY_INDEX), null);
  // Fiji straddles the line too and is too small to survive 1:110m: an honest hole, not a guess.
  assert.equal(countryOf({ lat: -16.7, lng: 179.9 }, COUNTRY_INDEX), null);
});

test('I-5 attack: exactly (0,0)', () => {
  // Null Island. The Gulf of Guinea is water and the answer is `null` — which is also what a
  // record whose coordinates were never filled in produces, and that is the point: a zeroed
  // coordinate must not be attributed to whichever country happens to be nearest the origin.
  assert.equal(countryOf({ lat: 0, lng: 0 }, COUNTRY_INDEX), null);
});

test('I-5 attack: an enclave — the hole in South Africa is respected', () => {
  // Lesotho is a country-shaped hole in South Africa, and it is the case that proves the
  // even-odd rule is doing real work: Maseru crosses ZA's outer ring once and its hole once
  // (even, so not ZA) and LS's ring once (odd, so LS).
  assert.equal(countryOf({ lat: -29.31, lng: 27.48 }, COUNTRY_INDEX), 'LS');
  assert.equal(countryOf({ lat: -26.2, lng: 28.04 }, COUNTRY_INDEX), 'ZA'); // Johannesburg, outside the hole
});

/**
 * The other half of the enclave attack, and the reason it is a separate test with its own name:
 * at 1:110m the four European micro-enclaves **are not in the dataset at all**, so they do not
 * come back `null` — they come back as their surrounding country. That is a **misattribution,
 * not a hole**, it is the one failure mode of this scale that `null` does not make visible, and
 * it is pinned here so that nobody discovers it from a user's map. BUILD-NOTES KD-51.
 */
test('I-5 attack: the micro-enclaves 1:110m does not carry are absorbed by their neighbour', () => {
  assert.equal(countryOf({ lat: 43.9424, lng: 12.4578 }, COUNTRY_INDEX), 'IT'); // San Marino
  assert.equal(countryOf({ lat: 41.9029, lng: 12.4534 }, COUNTRY_INDEX), 'IT'); // Vatican City
  assert.equal(countryOf({ lat: 43.7333, lng: 7.4167 }, COUNTRY_INDEX), 'FR'); // Monaco
  assert.equal(countryOf({ lat: 47.1662, lng: 9.5554 }, COUNTRY_INDEX), 'AT'); // Liechtenstein
});

test('I-5 attack: international waters, at four different distances from land', () => {
  for (const at of [
    { lat: 30, lng: -40 }, // mid-Atlantic
    { lat: -30, lng: -110 }, // South Pacific gyre
    { lat: 20, lng: 65 }, // Arabian Sea
    { lat: 43.2, lng: 16.7 }, // the Adriatic between Split and Hvar — near land, still water
  ]) {
    assert.equal(countryOf(at, COUNTRY_INDEX), null, `${JSON.stringify(at)}`);
  }
});

test('I-5: the six countries the reference trip actually visits still resolve', () => {
  const expected: Array<[string, LatLng]> = [
    ['AT', { lat: 48.2082, lng: 16.3738 }],
    ['HR', { lat: 45.815, lng: 15.9819 }],
    ['CZ', { lat: 50.0755, lng: 14.4378 }],
    ['HU', { lat: 47.4979, lng: 19.0402 }],
    ['GB', { lat: 51.5074, lng: -0.1278 }],
    ['US', { lat: 33.9425, lng: -118.4081 }],
  ];
  for (const [code, at] of expected) assert.equal(countryOf(at, COUNTRY_INDEX), code);
});

// ---------------------------------------------------------------- 6. purity and injection

/**
 * §8.4's *"pure; index injected … testable against the four-polygon fixture"*, taken literally.
 * Four polygons, no committed dataset, degenerate longitudes and latitudes chosen so the maths
 * is checkable by hand:
 *
 *   AA  a 10×10 square at the origin's north-east
 *   BB  a 10×10 square with a 4×4 hole cut out of its middle
 *   CC  a 4×4 square filling BB's hole — the enclave
 *   DD  two disjoint 2×2 squares — one country, two islands
 */
const FIXTURE_INDEX = countryIndex({
  scale: 'fixture',
  source: 'packages/core/test/country.test.ts',
  countries: [
    { code: 'AA', rings: [[0, 0, 10, 0, 10, 10, 0, 10]] },
    {
      code: 'BB',
      rings: [
        [20, 0, 30, 0, 30, 10, 20, 10],
        [23, 3, 27, 3, 27, 7, 23, 7], // the hole
      ],
    },
    { code: 'CC', rings: [[23, 3, 27, 3, 27, 7, 23, 7]] },
    {
      code: 'DD',
      rings: [
        [40, 0, 42, 0, 42, 2, 40, 2],
        [46, 0, 48, 0, 48, 2, 46, 2],
      ],
    },
  ],
});

test('I-5: the four-polygon fixture — a plain interior, a hole, an enclave and two islands', () => {
  assert.equal(countryOf({ lat: 5, lng: 5 }, FIXTURE_INDEX), 'AA');
  assert.equal(countryOf({ lat: 5, lng: 21 }, FIXTURE_INDEX), 'BB');
  assert.equal(countryOf({ lat: 5, lng: 25 }, FIXTURE_INDEX), 'CC', 'the hole in BB is filled by CC, not by BB');
  assert.equal(countryOf({ lat: 1, lng: 41 }, FIXTURE_INDEX), 'DD');
  assert.equal(countryOf({ lat: 1, lng: 47 }, FIXTURE_INDEX), 'DD', "DD's second island is the same country");
  assert.equal(countryOf({ lat: 1, lng: 44 }, FIXTURE_INDEX), null, 'the water between DD\'s islands');
  assert.equal(countryOf({ lat: 5, lng: 15 }, FIXTURE_INDEX), null, 'between AA and BB');
  assert.equal(countryOf({ lat: 50, lng: 50 }, FIXTURE_INDEX), null, 'nowhere near anything');
});

test('I-5: the index really is injected — the same coordinate answers differently per index', () => {
  const at = { lat: 5, lng: 5 };
  assert.equal(countryOf(at, FIXTURE_INDEX), 'AA');
  assert.equal(countryOf(at, COUNTRY_INDEX), null, '5°N 5°E is the Gulf of Guinea in the real world');
  const empty = countryIndex({ scale: 'empty', source: 'test', countries: [] });
  assert.equal(countryOf(at, empty), null, 'an empty index attributes nothing rather than throwing');
});

test('I-5: countryOf is pure — repeated calls agree and neither argument is mutated', () => {
  const at = { lat: 5, lng: 5 };
  const snapshot = JSON.stringify(FIXTURE_INDEX);
  const first = countryOf(at, FIXTURE_INDEX);
  for (let i = 0; i < 50; i++) assert.equal(countryOf(at, FIXTURE_INDEX), first);
  assert.deepEqual(at, { lat: 5, lng: 5 }, 'the coordinate was mutated');
  assert.equal(JSON.stringify(FIXTURE_INDEX), snapshot, 'the index was mutated');
});

test('I-5: overlapping rings resolve by ascending code, not by insertion order', () => {
  // Two countries claiming the same square. There is no right answer; there has to be the SAME
  // answer on every machine, or a golden is a coin flip. `countryIndex` sorts by code, so the
  // insertion order below is irrelevant: 'MM' sorts before 'ZZ' and wins in both.
  const a = countryIndex({
    scale: 'fixture', source: 'test',
    countries: [
      { code: 'ZZ', rings: [[0, 0, 10, 0, 10, 10, 0, 10]] },
      { code: 'MM', rings: [[0, 0, 10, 0, 10, 10, 0, 10]] },
    ],
  });
  const b = countryIndex({
    scale: 'fixture', source: 'test',
    countries: [
      { code: 'MM', rings: [[0, 0, 10, 0, 10, 10, 0, 10]] },
      { code: 'ZZ', rings: [[0, 0, 10, 0, 10, 10, 0, 10]] },
    ],
  });
  assert.equal(countryOf({ lat: 5, lng: 5 }, a), 'MM');
  assert.equal(countryOf({ lat: 5, lng: 5 }, b), 'MM');
});

test('I-5: a degenerate ring encloses nothing rather than throwing', () => {
  const idx = countryIndex({
    scale: 'fixture', source: 'test',
    countries: [
      { code: 'AA', rings: [[]] },
      { code: 'BB', rings: [[0, 0]] },
      { code: 'CC', rings: [[0, 0, 1, 1]] },
    ],
  });
  assert.equal(countryOf({ lat: 0, lng: 0 }, idx), null);
  assert.equal(countryOf({ lat: 0.5, lng: 0.5 }, idx), null);
});

// ---------------------------------------------------------------- the bundled index itself

test('I-5: the bundled index decodes to a plausible admin-0 layer', () => {
  assert.equal(COUNTRY_INDEX.scale, 'ne_110m');
  assert.match(COUNTRY_INDEX.source, /^nvkelso\/natural-earth-vector@v5\.1\.2\//);
  assert.equal(COUNTRY_INDEX.countries.length, 175);
  // Every code is a well-formed uppercase alpha-2, unique, and sorted — the ordering `countryOf`
  // relies on for a deterministic tie-break.
  const codes = COUNTRY_INDEX.countries.map((c) => c.code);
  assert.deepEqual(codes, [...codes].sort(), 'the index is not sorted by code');
  assert.equal(new Set(codes).size, codes.length, 'a country code appears twice');
  assert.deepEqual(codes.filter((c) => !/^[A-Z]{2}$/.test(c)), [], 'a code is not ISO 3166-1 alpha-2');
  for (const c of COUNTRY_INDEX.countries) {
    assert.ok(c.rings.length > 0, `${c.code} has no rings`);
    assert.ok(c.box[0] >= -180 && c.box[2] <= 180 && c.box[1] >= -90 && c.box[3] <= 90, `${c.code}'s box is off the globe`);
    assert.ok(c.box[0] <= c.box[2] && c.box[1] <= c.box[3], `${c.code}'s box is inverted`);
  }
});

test('I-5: the bundled index is data only — nothing in core reaches the network for it', () => {
  // §6.1, made mechanical rather than trusted: the two files that carry this feature inside
  // `packages/core` contain no fetch, no import of a node builtin, and no URL.
  const HERE = dirname(fileURLToPath(import.meta.url));
  const files = ['../src/derive/country.ts', '../src/geo/countryIndex.ts', '../src/geo/countries.gen.ts'];
  for (const rel of files) {
    const src = readFileSync(resolve(HERE, rel), 'utf8');
    for (const banned of [/\bfetch\s*\(/, /XMLHttpRequest/, /from\s+['"]node:/, /\brequire\s*\(/]) {
      assert.equal(banned.test(src), false, `${rel} contains ${banned}`);
    }
  }
});
