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

// ------------------------------------------- 4a. the holes golden (criterion 4 part b)

type GoldenHoles = {
  index: { scale: string; source: string };
  scales: string[];
  resolvable: number;
  holes: Array<{ kind: 'stop' | 'place'; id: string; name: string; resolvesAt: string | null }>;
};

/**
 * **Criterion 4 part b — every hole is named, and says whether a scale would fix it.**
 *
 * `fixtures/golden/country-holes.json` is written by `node tools/gen-countries.mjs --holes`, which
 * fetches all three scales in the pinned family (a human's generation-time cost — nothing in the
 * product fetches anything) and records, for each record the *committed* index leaves `null`, the
 * coarsest scale in the family that does attribute it.
 *
 * That field is the whole point of the artefact, and A-26 Part 1 is what it makes un-askable
 * again: **`resolvesAt: null` is a dataset gap and `null` is the correct answer** — Biševo,
 * Budikovac and Lokrum have no admin-0 polygon at any scale, with the nearest Croatian ring
 * 4.26 km, 2.75 km and 1.87 km away — whereas a non-null `resolvesAt` is a scale question.
 */
test('I-5a criterion 4b: the holes golden names exactly the records the committed index leaves null', () => {
  const { trip } = europe2026();
  const g = golden<GoldenHoles>('country-holes.json');

  const actual: Array<{ kind: string; id: string; name: string }> = [];
  for (const s of allStops(trip)) {
    if (s.at && countryOf(s.at, COUNTRY_INDEX) === null) actual.push({ kind: 'stop', id: s.stopId, name: s.name });
  }
  for (const p of trip.places) {
    if (p.at && countryOf(p.at, COUNTRY_INDEX) === null) actual.push({ kind: 'place', id: p.id, name: p.name });
  }

  assert.deepEqual(
    g.holes.map((h) => ({ kind: h.kind, id: h.id, name: h.name })),
    actual,
    'countries.json and country-holes.json name different records — the two artefacts have drifted',
  );
});

test('I-5a criterion 4b: the holes golden agrees with the attribution golden, record for record', () => {
  const holes = golden<GoldenHoles>('country-holes.json');
  const g = golden<GoldenCountries>('countries.json');
  assert.deepEqual(
    holes.holes.filter((h) => h.kind === 'stop').map((h) => ({ stopId: h.id, name: h.name })),
    g.unattributedStops.map((s) => ({ stopId: s.stopId, name: s.name })),
  );
  assert.deepEqual(
    holes.holes.filter((h) => h.kind === 'place').map((h) => ({ placeId: h.id, name: h.name })),
    g.unattributedPlaces.map((p) => ({ placeId: p.placeId, name: p.name })),
  );
  assert.equal(holes.index.scale, COUNTRY_INDEX.scale);
  assert.equal(holes.index.source, COUNTRY_INDEX.source);
  assert.deepEqual(holes.scales, ['110m', '50m', '10m'], 'coarsest first — resolvesAt is the coarsest that works');
});

/**
 * The values, measured at revision 20 and re-measured by the generator that wrote the file. Three
 * landforms Natural Earth admin-0 does not carry at any scale, and one record — Hvar Town, which
 * *is* on a carried island — that only the finest scale reaches.
 */
test('I-5a criterion 4b: a dataset gap is null and a scale question names its scale', () => {
  const g = golden<GoldenHoles>('country-holes.json');
  const at = (kind: string, name: string) => g.holes.find((h) => h.kind === kind && h.name.startsWith(name));
  assert.equal(at('stop', 'Blue Cave, Biševo')?.resolvesAt, null);
  assert.equal(at('stop', 'Stiniva Cove, Vis')?.resolvesAt, null);
  assert.equal(at('stop', 'Budikovac / Blue Lagoon')?.resolvesAt, null);
  assert.equal(at('stop', 'Hvar Town')?.resolvesAt, '10m');
  assert.equal(at('place', 'Blue Cave, Biševo')?.resolvesAt, null);
  assert.equal(at('place', 'Stiniva Cove, Vis')?.resolvesAt, null);
  assert.equal(at('place', 'Hvar Town')?.resolvesAt, '10m');
  for (const h of g.holes) {
    assert.ok(h.resolvesAt === null || g.scales.includes(h.resolvesAt), `${h.name}: ${h.resolvesAt} is not a pinned scale`);
  }
});

/**
 * **The ceiling.** The number of holes a scale change *could* have fixed is the number that may
 * not grow; a hole with `resolvesAt: null` is correct and is not counted against anything.
 */
test('I-5a criterion 4b: the count of scale-resolvable holes is a ceiling, not a target', () => {
  const g = golden<GoldenHoles>('country-holes.json');
  const resolvable = g.holes.filter((h) => h.resolvesAt !== null).length;
  assert.equal(resolvable, g.resolvable, 'the recorded count disagrees with the rows');
  assert.ok(resolvable <= 2, `${resolvable} holes a scale would fix; the measured ceiling is 2`);
});

test('I-5a: no coordinate reached the committed holes golden either', () => {
  const raw = golden<Record<string, unknown>>('country-holes.json');
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
  assert.deepEqual(floats, [], 'a coordinate reached the committed holes golden');
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
 * **I-5a inverts this test.** At 1:110m the micro-states are not in the dataset at all, so they
 * did not come back `null` — they came back as their *surrounding country*, which is the one
 * failure mode of that scale `null` does not make visible. §8.4 **A-26** Part 3 measured the size
 * of that hole: the 1:110m layer carries 175 ISO codes, the 1:10m layer carries 239, and eight of
 * the 64 missing ones were being answered with a wrong neighbour rather than a hole.
 *
 * The mixed index fills those 64 codes and emits ascending polygon area, so the enclave's ring is
 * tested before its encloser's. Seven of the eight now answer themselves.
 *
 * **`VA` is the eighth and it is pinned as `IT` — a known-wrong answer, disclosed, not repaired**
 * (A-26 Part 5, residue 1). Natural Earth's `VA` feature is a seven-point sliver spanning
 * 12.4527–12.4540 E, 41.9028–41.9039 N — about 110 m × 130 m against the real state's 0.44 km² —
 * and St Peter's Basilica sits ~90 m south of it. No scale, no ordering and no fill reaches that;
 * the only mechanism left is a hand-authored exclusion box for one polity, which is the first step
 * onto the hand-typed-polygon road I-5's dependency clause forbids. Reopen if Natural Earth ships
 * a real `VA` polygon.
 */
test('I-5a criterion 4c: the micro-states the base scale omits now answer themselves', () => {
  assert.equal(countryOf({ lat: 43.9424, lng: 12.4578 }, COUNTRY_INDEX), 'SM'); // San Marino
  assert.equal(countryOf({ lat: 43.7333, lng: 7.4167 }, COUNTRY_INDEX), 'MC'); // Monaco
  // Vaduz, 47.1410/9.5209. NOT the 47.1662/9.5554 the pre-I-5a test labelled "Liechtenstein":
  // measured against the 1:10m ring, that point is ~250 m EAST of Liechtenstein's border at that
  // latitude, so `AT` was always the better answer for it and the fill does not change it. A
  // coordinate that was never in the country is not evidence about the country.
  assert.equal(countryOf({ lat: 47.141, lng: 9.5209 }, COUNTRY_INDEX), 'LI');
  assert.equal(countryOf({ lat: 42.5063, lng: 1.5218 }, COUNTRY_INDEX), 'AD'); // Andorra la Vella
  assert.equal(countryOf({ lat: 36.1408, lng: -5.3536 }, COUNTRY_INDEX), 'GI'); // Gibraltar
  assert.equal(countryOf({ lat: 22.3193, lng: 114.1694 }, COUNTRY_INDEX), 'HK'); // Hong Kong
  assert.equal(countryOf({ lat: 1.3521, lng: 103.8198 }, COUNTRY_INDEX), 'SG'); // Singapore
});

/**
 * **`VA` is the eighth, and the residue is measured here rather than assumed.** A-26 Part 5 says
 * *"Vatican City is `IT` at every scale"*; the measurement is narrower and this test records what
 * the dataset actually does, because a pinned known-wrong answer is only useful if it is the
 * answer the code gives.
 *
 * Natural Earth carries a seven-point `VA` feature spanning **12.4527–12.4540 E, 41.9028–41.9039
 * N** — about 110 m × 130 m, roughly a thirtieth of the real state's 0.44 km², sitting over the
 * gardens rather than the basilica. So:
 *
 *   - a coordinate that happens to fall inside that patch returns `VA`;
 *   - **St Peter's Basilica — the landmark a real trip records — is ~90 m south of it and returns
 *     `IT`**, and so does the square, the museums entrance and most of the state.
 *
 * That is the residue, and it is disclosed, not repaired: the only mechanism available is a
 * hand-authored polygon for one polity, which is the road I-5's dependency clause forbids, for a
 * state whose every visitor is in Rome the same day and whose lifetime map gains `IT` either way.
 * **Reopen if** Natural Earth ships a real `VA` polygon. KD-52 records the measurement.
 */
test('I-5a criterion 4c: Vatican City stays a disclosed known-wrong answer — St Peter\'s is IT', () => {
  assert.equal(countryOf({ lat: 41.9022, lng: 12.4539 }, COUNTRY_INDEX), 'IT'); // St Peter's Basilica
  assert.equal(countryOf({ lat: 41.9042, lng: 12.4568 }, COUNTRY_INDEX), 'IT'); // Vatican Museums
  assert.equal(countryOf({ lat: 41.9022, lng: 12.4568 }, COUNTRY_INDEX), 'IT'); // St Peter's Square
  // …and the 110 m x 130 m patch the dataset does carry answers itself, which is why the ruling's
  // "IT at every scale" is recorded above as narrower than it reads.
  assert.equal(countryOf({ lat: 41.9033, lng: 12.4533 }, COUNTRY_INDEX), 'VA');
});

/**
 * **A-26 Part 5, residue 2 — the second thing this ruling makes worse, disclosed rather than left
 * to be discovered.** A filled polygon is 1:10m and its neighbour is 1:110m, so the two do not
 * share a boundary: there is an overlap *band*, and ascending-area order hands that band to the
 * smaller state. Natural Earth's 12-point Monaco spans 43.7179–43.7635 N against the real
 * 43.7247–43.7519, so roughly 700 m of French ground north of Monaco returns `MC`.
 *
 * This is accepted deliberately: it replaces *always wrong inside Monaco* with *right inside
 * Monaco, wrong within ~700 m outside it*, which is strictly less wrong area. It is pinned here as
 * a measurement so that the day it changes is a red test, not a silence.
 */
test('I-5a: a point ~500 m north of Monaco returns MC — the fill\'s border bias, measured', () => {
  assert.equal(countryOf({ lat: 43.7564, lng: 7.42 }, COUNTRY_INDEX), 'MC');
  // Far enough out and France is answered again: the band is narrow, not a takeover.
  assert.equal(countryOf({ lat: 43.79, lng: 7.42 }, COUNTRY_INDEX), 'FR');
});

/**
 * The island states the 1:110m layer could never name — the reason A-26 re-opened I-5 rather than
 * filing the micro-enclaves as a curiosity. A lifetime map that cannot say *Malta* is broken for
 * exactly the person the product is for.
 */
test('I-5a criterion 4c: the island states the base scale cannot reach are named', () => {
  const expected: Array<[string, LatLng, string]> = [
    ['MT', { lat: 35.8989, lng: 14.5146 }, 'Valletta'],
    ['MV', { lat: 4.1755, lng: 73.5093 }, 'Malé'],
    ['MU', { lat: -20.1609, lng: 57.5012 }, 'Port Louis'],
    ['SC', { lat: -4.6191, lng: 55.4513 }, 'Victoria'],
    ['MO', { lat: 22.1987, lng: 113.5439 }, 'Macao'],
    ['BH', { lat: 26.2285, lng: 50.586 }, 'Manama'],
    ['BM', { lat: 32.2949, lng: -64.7814 }, 'Hamilton'],
    ['FO', { lat: 62.0079, lng: -6.7723 }, 'Tórshavn'],
    ['CV', { lat: 14.9177, lng: -23.5092 }, 'Praia'],
    ['BB', { lat: 13.0975, lng: -59.6167 }, 'Bridgetown'],
    ['IM', { lat: 54.1509, lng: -4.4814 }, 'Douglas'],
    // Inland Jersey, not St Helier: the harbour town sits on the waterline and falls ~200 m
    // outside the 1:10m ring — A-26 Part 2's shoreline effect, on a filled polygon this time.
    ['JE', { lat: 49.2144, lng: -2.1312 }, 'Jersey (inland)'],
    ['AX', { lat: 60.0971, lng: 19.9348 }, 'Mariehamn'],
  ];
  for (const [code, at, name] of expected) {
    assert.equal(countryOf(at, COUNTRY_INDEX), code, `${name} should attribute to ${code}`);
  }
});

/**
 * Criterion 4c's coverage half, made checkable with no network: **every ISO code the pinned
 * family's finest scale carries is in the shipped index.** The 64 the 1:110m base omits are
 * enumerated by §8.4 A-26 Part 3, measured there; the generator re-derives the same set from the
 * two downloads on every run and refuses to write if the emitted index misses one.
 */
const FILLED_CODES = [
  // the 8 that were answered with a wrong neighbour
  'AD', 'GI', 'HK', 'LI', 'MC', 'SG', 'SM', 'VA',
  // the 56 that were unreachable
  'MT', 'MV', 'MU', 'SC', 'MO', 'BH', 'BM', 'FO', 'CV', 'BB', 'IM', 'JE', 'GG', 'AX',
  'AW', 'CW', 'KY', 'TC', 'AG', 'KN', 'LC', 'VC', 'GD', 'DM', 'MS', 'AI', 'BL', 'MF',
  'SX', 'VG', 'VI', 'PF', 'WS', 'TO', 'TV', 'KI', 'FM', 'MH', 'PW', 'GU', 'MP', 'AS',
  'NU', 'CK', 'NF', 'WF', 'NR', 'PM', 'SH', 'ST', 'KM', 'IO', 'GS', 'HM', 'UM', 'PN',
];

test('I-5a criterion 4c: every ISO code the base scale omits is filled from the finest scale', () => {
  assert.equal(FILLED_CODES.length, 64, 'A-26 Part 3 counts 64 filled codes');
  const have = new Set(COUNTRY_INDEX.countries.map((c) => c.code));
  const missing = FILLED_CODES.filter((c) => !have.has(c));
  assert.deepEqual(missing, [], 'a code the finest scale carries is absent from the shipped index');
  for (const code of FILLED_CODES) {
    const entry = COUNTRY_INDEX.countries.find((c) => c.code === code)!;
    assert.ok(entry.rings.length > 0, `${code} was filled with no rings`);
  }
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

/**
 * **I-5a inverts this test (§8.4 A-26 Part 4).** It used to assert that `countryIndex` re-sorted
 * its input by ISO code, so that insertion order could not decide an overlap. That key was
 * deterministic and arbitrary, and the arbitrariness was the defect: alphabetical order resolves
 * seven of the eight enclave overlaps the mixed-resolution index creates *in favour of the
 * encloser* (`AT` before `LI`, `CN` before `HK`, `IT` before `SM`, `MY` before `SG`, …).
 *
 * So the order moves into the artefact. `countryIndex` **preserves the order it is given**, the
 * generator emits ascending polygon area (an enclave is always smaller than its encloser), and a
 * reorder becomes a diff a reviewer sees rather than a comparison a reviewer trusts. Determinism
 * is unchanged — the same input still gives the same answer on every machine — it is simply the
 * caller's input that fixes it now.
 */
test('I-5a: overlapping rings resolve in the order the index was given, which countryIndex preserves', () => {
  const square = [0, 0, 10, 0, 10, 10, 0, 10];
  const zzFirst = countryIndex({
    scale: 'fixture', source: 'test',
    countries: [{ code: 'ZZ', rings: [square] }, { code: 'MM', rings: [square] }],
  });
  const mmFirst = countryIndex({
    scale: 'fixture', source: 'test',
    countries: [{ code: 'MM', rings: [square] }, { code: 'ZZ', rings: [square] }],
  });
  assert.equal(countryOf({ lat: 5, lng: 5 }, zzFirst), 'ZZ', 'the first entry given wins, not the first alphabetically');
  assert.equal(countryOf({ lat: 5, lng: 5 }, mmFirst), 'MM');
  // …and the order is genuinely preserved, not merely stable for two entries.
  assert.deepEqual(zzFirst.countries.map((c) => c.code), ['ZZ', 'MM']);
  assert.deepEqual(mmFirst.countries.map((c) => c.code), ['MM', 'ZZ']);
});

/**
 * The enclave-before-encloser property, on a fixture rather than on the shipped dataset: a small
 * square wholly inside a large one is only reachable if it is tested first. This is exactly the
 * Vaduz/Austria and Singapore/Malaysia shape A-26 Part 4 describes, four polygons wide.
 */
test('I-5a: a small polygon inside a larger one is reachable only when it is emitted first', () => {
  const big = { code: 'BG', rings: [[0, 0, 10, 0, 10, 10, 0, 10]] };
  const small = { code: 'SL', rings: [[4, 4, 6, 4, 6, 6, 4, 6]] };
  const enclaveFirst = countryIndex({ scale: 'fixture', source: 'test', countries: [small, big] });
  const encloserFirst = countryIndex({ scale: 'fixture', source: 'test', countries: [big, small] });
  assert.equal(countryOf({ lat: 5, lng: 5 }, enclaveFirst), 'SL');
  assert.equal(countryOf({ lat: 5, lng: 5 }, encloserFirst), 'BG', 'the encloser swallows it — the fault A-26 fixes');
  assert.equal(countryOf({ lat: 1, lng: 1 }, enclaveFirst), 'BG', 'outside the enclave, both orders agree');
  assert.equal(countryOf({ lat: 1, lng: 1 }, encloserFirst), 'BG');
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

test('I-5a: the bundled index decodes to a plausible mixed-resolution admin-0 layer', () => {
  assert.equal(COUNTRY_INDEX.scale, 'ne_110m+10m');
  assert.match(COUNTRY_INDEX.source, /^nvkelso\/natural-earth-vector@v5\.1\.2\//);
  assert.match(COUNTRY_INDEX.source, /ne_110m_admin_0_countries\.geojson/, 'the base file is not named');
  assert.match(COUNTRY_INDEX.source, /ne_10m_admin_0_countries\.geojson/, 'the fill file is not named');
  assert.equal(COUNTRY_INDEX.countries.length, 239);
  const codes = COUNTRY_INDEX.countries.map((c) => c.code);
  assert.equal(new Set(codes).size, codes.length, 'a country code appears twice');
  assert.deepEqual(codes.filter((c) => !/^[A-Z]{2}$/.test(c)), [], 'a code is not ISO 3166-1 alpha-2');
  for (const c of COUNTRY_INDEX.countries) {
    assert.ok(c.rings.length > 0, `${c.code} has no rings`);
    assert.ok(c.box[0] >= -180 && c.box[2] <= 180 && c.box[1] >= -90 && c.box[3] <= 90, `${c.code}'s box is off the globe`);
    assert.ok(c.box[0] <= c.box[2] && c.box[1] <= c.box[3], `${c.code}'s box is inverted`);
  }
});

/**
 * Spherical polygon area, re-implemented here on purpose: the emitted order is the tie-break the
 * whole ruling turns on, so the test that checks it must not ask the generator whether the
 * generator was right. Chamberlain & Duquette's formula on a unit sphere; only the *ordering* it
 * induces is used, so the radius cancels.
 */
function ringArea(ring: readonly number[]): number {
  const rad = Math.PI / 180;
  let sum = 0;
  const n = ring.length;
  for (let i = 0; i + 1 < n; i += 2) {
    const jx = ring[(i + 2) % n];
    const jy = ring[(i + 3) % n];
    sum += (jx - ring[i]) * rad * (2 + Math.sin(ring[i + 1] * rad) + Math.sin(jy * rad));
  }
  return Math.abs(sum / 2);
}

test('I-5a: the shipped index is emitted in ascending polygon area, ties by ISO code', () => {
  const keyed = COUNTRY_INDEX.countries.map((c) => ({
    code: c.code,
    area: c.rings.reduce((a, r) => a + ringArea(r), 0),
  }));
  for (let i = 1; i < keyed.length; i++) {
    const prev = keyed[i - 1];
    const cur = keyed[i];
    assert.ok(
      prev.area < cur.area || (Math.abs(prev.area - cur.area) < 1e-12 && prev.code < cur.code),
      `${prev.code} (${prev.area}) is emitted before ${cur.code} (${cur.area}) — the order is not ascending area`,
    );
  }
  // And it is emphatically NOT the ISO order it used to be: that is the fault A-26 Part 4 names.
  assert.notDeepEqual(keyed.map((k) => k.code), [...keyed.map((k) => k.code)].sort());
  // The smallest polygon in the world's admin-0 layer leads; the largest trails.
  assert.equal(keyed[keyed.length - 1].code, 'RU', 'Russia should be the largest entry');
});

/**
 * Criterion 4c's **first injected fault**, run in memory against the shipped rings rather than by
 * hand-editing the generated module: put the index back in ISO order and three answers go wrong,
 * each in favour of the encloser. This is the measurement that says ascending area is doing work.
 */
test('I-5a injected fault: restoring ISO-ascending order loses Vaduz, Singapore and Hong Kong', () => {
  const isoOrder = countryIndex({
    scale: COUNTRY_INDEX.scale,
    source: COUNTRY_INDEX.source,
    countries: [...COUNTRY_INDEX.countries]
      .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
      .map((c) => ({ code: c.code, rings: c.rings })),
  });
  assert.equal(countryOf({ lat: 47.141, lng: 9.5209 }, isoOrder), 'AT', 'Vaduz falls back to Austria');
  assert.equal(countryOf({ lat: 1.3521, lng: 103.8198 }, isoOrder), 'MY', 'Singapore falls back to Malaysia');
  assert.equal(countryOf({ lat: 22.3193, lng: 114.1694 }, isoOrder), 'CN', 'Hong Kong falls back to China');
  // …while an island with no encloser is unaffected: the order only decides overlaps.
  assert.equal(countryOf({ lat: 35.8989, lng: 14.5146 }, isoOrder), 'MT');
});

/** Criterion 4c's **second injected fault**: drop `LI` from the fill and Vaduz returns `AT`. */
test('I-5a injected fault: dropping LI from the fill returns Vaduz to Austria', () => {
  const withoutLI = countryIndex({
    scale: COUNTRY_INDEX.scale,
    source: COUNTRY_INDEX.source,
    countries: COUNTRY_INDEX.countries.filter((c) => c.code !== 'LI').map((c) => ({ code: c.code, rings: c.rings })),
  });
  assert.equal(countryOf({ lat: 47.141, lng: 9.5209 }, withoutLI), 'AT');
  assert.equal(countryOf({ lat: 47.141, lng: 9.5209 }, COUNTRY_INDEX), 'LI', 'and the shipped index does not');
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
