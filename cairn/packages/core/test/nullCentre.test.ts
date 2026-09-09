/**
 * **ROADMAP I-22 — `City.centre` may be `null`, and a picked city carries the row it came from.**
 * ARCHITECTURE §8.4 **A-83** Part 8, amending §8.4 **A-29** Part 3 by exactly one clause and
 * withdrawing §8.4 **A-56**'s stated ground for a non-nullable `TripSummaryCity.centre`.
 *
 * Two measured problems, one increment:
 *
 *  1. `createTrip` wrote `centre: {lat: 0, lng: 0}` for a city nobody located — *"a value nobody
 *     measured, wearing the shape of one"* (A-82 Part 7). Every hand-entered city was a summary
 *     row claiming 0°N 0°E, and the first surface to draw city pins would have drawn them there.
 *  2. A-82 Part 5's consistency invariant refused 98 real cities — Brazzaville, Geneva and
 *     Jerusalem among them. A-83 restates the invariant rather than weakening it (*no shipped row
 *     may **silently** contradict the index*), and that needs `City.placeId`: **the row a human
 *     picked**, which is exactly the provenance A-29 Part 3 item 3 said was missing.
 *
 * **Revision 65 / ROADMAP I-22a: `City.placeId` is REPLACED by `City.pick: CityPick | null`**
 * (§8.4 **A-84** Part 3). A bare id is a pointer nothing on the derive path can resolve, and QA
 * round 61 measured the consequence — the picked arm read the city's **own typed `countryCode`**.
 * **Everything in this file about `centre` stands unchanged; everything about the pick moved to
 * `cityPick.test.ts`**, which is where A-84's four clauses and criteria N1–N10 live. What is left
 * here of the pick is the minimum that keeps this file's own round trips honest.
 *
 * **The one thing to get right, stated here because it looks like drift and is not.** A picked
 * city's own `countryCode` outranks `countryOf`, and **only** for a picked city. A mistyped `HU`
 * on a hand-typed Vienna still loses to `countryOf`, permanently — that is what A-29 Part 3 item 3
 * refuses, it is upheld verbatim, and the second precedence test below is the one that says so.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRY_INDEX, SCHEMA_VERSION, SUMMARY_VERSION,
  createTrip, fromJSON, toJSON, migrateDoc, sequentialIds, tripSummary, travelStats,
  TripParseError,
} from '../src/index.ts';
import type { BuildCtx, Trip, TripSummaryRow } from '../src/index.ts';
// **Not on §2.10's surface, deliberately.** `migrateDocWithReport` is the ladder's own reporting
// shape and lives in `serialize/migrate.ts`; `migrateDoc` is `.doc` off it. Exporting it from
// `index.ts` would move the export count, which this increment does not do — so it is reached by
// module path, exactly as `qa/p2b-gate.mjs` already reaches `migrate.ts`.
import { migrateDocWithReport } from '../src/serialize/migrate.ts';

const ctx = (p: string): BuildCtx => ({ ids: sequentialIds(`${p}-`), now: '2026-06-15' });

/** Vienna, which the index resolves to `AT`. */
const VIENNA = { lat: 48.2082, lng: 16.3738 };
/**
 * Geneva, at the coordinate the gazetteer carries for it. **The shipped `COUNTRY_INDEX` answers
 * `FR` here** — measured, not assumed — which is exactly A-83 Part 8's case: a coarse ring bulges
 * outward and draws the second city of Switzerland on the French side of the frontier.
 */
const IN_FRANCE = { lat: 46.21, lng: 6.14 };
/**
 * **§8.4 A-84 Part 3** — the pick this file uses wherever I-22 used `placeId: 'ne:abc'`. Its
 * `centre` equals `IN_FRANCE`, so it is **live**; `cityPick.test.ts` is where a stale one lives.
 */
const GENEVA_PICK = { rowId: 'ne:j64n0x', centre: { lat: 46.21, lng: 6.14 }, countryCode: 'CH' as const };

// ---------------------------------------------------------------------------
// Part 1 — the record.
// ---------------------------------------------------------------------------

test('I-22 / I-22a: SCHEMA_VERSION is 5', () => {
  // 4 at I-22 (`centre` widened); **5 at I-22a** (§8.4 A-84 Part 8 — `placeId` becomes `pick`,
  // which is a type change and not a new scalar with a total default).
  assert.equal(SCHEMA_VERSION, 5);
});

test('I-22 A-83 Part 8: a city nobody located has centre `null`, not {0,0}', () => {
  const trip = createTrip(
    {
      title: 'Typed from memory', startDate: '2019-03-01', endDate: '2019-03-04', homeCurrency: 'EUR',
      cities: [{ key: 'kyoto', name: 'Kyoto' }],
    },
    ctx('typed'),
  );
  assert.equal(trip.cities[0].centre, null, 'createTrip still fabricates a coordinate');
  assert.equal(trip.cities[0].pick, null, '`pick` is null for a city nobody picked');
});

test('I-22 / I-22a: `CityInit` carries both fields through `createTrip`', () => {
  const trip = createTrip(
    {
      title: 'Picked', startDate: '2019-03-01', endDate: '2019-03-04', homeCurrency: 'EUR',
      cities: [{ key: 'geneva', name: 'Geneva', centre: IN_FRANCE, countryCode: 'CH', pick: GENEVA_PICK }],
    },
    ctx('picked'),
  );
  assert.deepEqual(trip.cities[0].centre, IN_FRANCE);
  assert.deepEqual(trip.cities[0].pick, GENEVA_PICK);
});

// ---------------------------------------------------------------------------
// Part 2 — serialization and the migration.
// ---------------------------------------------------------------------------

test('I-22 / I-22a: toJSON emits `centre: null` and `pick`, and fromJSON reads them back', () => {
  const trip = createTrip(
    {
      title: 'Round trip', startDate: '2019-03-01', endDate: '2019-03-04', homeCurrency: 'EUR',
      cities: [
        { key: 'kyoto', name: 'Kyoto' },
        { key: 'geneva', name: 'Geneva', centre: IN_FRANCE, countryCode: 'CH', pick: GENEVA_PICK },
      ],
    },
    ctx('rt'),
  );
  const text = toJSON(trip);
  const raw = JSON.parse(text) as { schemaVersion: number; cities: Array<Record<string, unknown>> };
  assert.equal(raw.schemaVersion, 5);
  assert.equal(raw.cities[0].centre, null, 'toJSON did not emit a null centre');
  assert.equal(raw.cities[0].pick, null);
  assert.deepEqual(raw.cities[1].pick, GENEVA_PICK);
  const back = fromJSON(text);
  assert.equal(back.cities[0].centre, null);
  assert.equal(back.cities[0].pick, null);
  assert.deepEqual(back.cities[1].centre, IN_FRANCE);
  assert.deepEqual(back.cities[1].pick, GENEVA_PICK);
  assert.equal(toJSON(back), text, 'the document does not round-trip byte for byte');
});

test('I-22 / I-22a: fromJSON refuses a `pick` that is not an object or null, with a named reason', () => {
  const trip = createTrip(
    { title: 'Bad pick', startDate: '2019-03-01', endDate: '2019-03-02', homeCurrency: 'EUR', cities: [{ key: 'k', name: 'K' }] },
    ctx('bad'),
  );
  const doc = JSON.parse(toJSON(trip)) as { cities: Array<Record<string, unknown>> };
  doc.cities[0].pick = 42;
  assert.throws(
    () => fromJSON(JSON.stringify(doc)),
    (e: unknown) => e instanceof TripParseError && /\$\.cities\[0\]\.pick/.test((e as TripParseError).path),
    'a numeric pick was accepted',
  );
  // The whole ceiling — every field, every shape — is `cityPick.test.ts`'s N5.
});

test('I-22: fromJSON refuses a `centre` that is neither an object nor null', () => {
  const trip = createTrip(
    { title: 'Bad centre', startDate: '2019-03-01', endDate: '2019-03-02', homeCurrency: 'EUR', cities: [{ key: 'k', name: 'K' }] },
    ctx('badc'),
  );
  const doc = JSON.parse(toJSON(trip)) as { cities: Array<Record<string, unknown>> };
  doc.cities[0].centre = 'nowhere';
  assert.throws(
    () => fromJSON(JSON.stringify(doc)),
    (e: unknown) => e instanceof TripParseError && /\$\.cities\[0\]\.centre/.test((e as TripParseError).path),
  );
});

/**
 * **The migration criterion, and the rung's ruling.** A stored `centre` *exactly* equal to
 * `{lat: 0, lng: 0}` becomes `null`; every other value passes through untouched; `placeId` is
 * filled with `null`. Stated plainly because it will be questioned: this also nulls a city
 * genuinely at 0°N 0°E, of which there are none on land, and the alternative is carrying a
 * fabrication forever.
 */
function v3DocWithTwoCities(): Record<string, unknown> {
  const trip = createTrip(
    {
      title: 'A v3 document', startDate: '2019-03-01', endDate: '2019-03-04', homeCurrency: 'EUR',
      cities: [
        { key: 'fabricated', name: 'Fabricated', centre: { lat: 0, lng: 0 } },
        { key: 'vienna', name: 'Vienna', centre: VIENNA },
      ],
    },
    ctx('v3'),
  );
  const doc = JSON.parse(toJSON(trip)) as Record<string, unknown>;
  // Age it: schemaVersion 3, and no `placeId` and no `pick` key on any city — the shape a v3
  // document has. (`pick` is what `toJSON` writes today; the rung under test is 3 → 4, and the
  // 4 → 5 rung above it is `cityPick.test.ts`'s.)
  doc.schemaVersion = 3;
  for (const c of doc.cities as Array<Record<string, unknown>>) { delete c.placeId; delete c.pick; }
  return doc;
}

test('I-22 A-83 Part 8: the 3 → 4 rung nulls exactly the {0,0} centres and leaves every other one alone', () => {
  const doc = v3DocWithTwoCities();
  // **The ladder climbs the whole way**, so this asserts what a v3 document looks like at the
  // CURRENT version: the 3 → 4 rung's conversion, then the 4 → 5 rung on top of it.
  const migrated = migrateDoc(doc) as { schemaVersion: number; cities: Array<Record<string, unknown>> };
  assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
  assert.equal(migrated.cities.length, 2);
  // **The unchanged-coordinate assertion goes FIRST and it names the city.** N4 makes the rung
  // null every centre, and the failure a reader wants is *"Vienna"*, not *"2 !== 1"*.
  assert.deepEqual(
    migrated.cities.filter((c) => c.centre === null).map((c) => c.name),
    ['Fabricated'],
    'the rung nulled a coordinate that was not {0,0}. Every other value passes through UNTOUCHED ' +
      '(§8.4 A-83 Part 8) — Vienna is not at 0°N 0°E and the rung may not touch it.',
  );
  assert.equal(migrated.cities[0].centre, null, 'the {0,0} city was not nulled');
  assert.deepEqual(
    migrated.cities[1].centre, VIENNA,
    'the rung moved a REAL coordinate. Vienna is not at 0°N 0°E and the rung may not touch it.',
  );
  assert.equal(migrated.cities[0].pick, null, 'the ladder did not leave `pick: null`');
  assert.equal(migrated.cities[1].pick, null);
  // …and the migrated document parses and re-serialises.
  const trip = fromJSON(JSON.stringify(migrated));
  assert.equal(trip.cities[0].centre, null);
  assert.deepEqual(trip.cities[1].centre, VIENNA);
  assert.equal(JSON.parse(toJSON(trip)).schemaVersion, SCHEMA_VERSION);
});

test('I-22: the 3 → 4 rung REPORTS what it converted, and the count is 1 for that document', () => {
  const doc = v3DocWithTwoCities();
  const { report } = migrateDocWithReport(doc);
  assert.equal(report.nulledOriginCentres, 1, 'the rung did not report its conversion count');
  // A document with nothing to convert reports zero, so the number is a measurement.
  assert.equal(migrateDocWithReport(migrateDoc(doc)).report.nulledOriginCentres, 0);
});

test('I-22 / I-22a: a build that reads up to 5 refuses a 6, and the ladder still names the version it was handed', () => {
  const doc = migrateDoc(v3DocWithTwoCities()) as Record<string, unknown>;
  assert.throws(
    () => migrateDoc({ ...doc, schemaVersion: 6 }),
    /this build reads up to 5\. Update the app\./,
  );
  assert.throws(
    () => migrateDoc({ ...doc, schemaVersion: 0 }),
    /no migration path from schemaVersion 0/,
  );
});

// ---------------------------------------------------------------------------
// Part 3 — the precedence. **This is the criterion the increment lives or dies on.**
// ---------------------------------------------------------------------------

/**
 * One city, `centre` inside France's ring, `countryCode: 'CH'`, and a live pick either present or
 * not. Everything else is held equal, so the only thing that can move the answer is the pick.
 *
 * **I-22a**: the pick's own `countryCode` is what answers now, not the city's. Here the two agree
 * (`'CH'` in both places), which is what keeps this a test about PRECEDENCE; the case where they
 * disagree — round 61's `HU` — is `cityPick.test.ts`'s N1.
 */
function precedenceRow(picked: boolean): TripSummaryRow {
  const trip = createTrip(
    {
      title: 'Geneva-ish', startDate: '2019-03-01', endDate: '2019-03-04', homeCurrency: 'EUR',
      cities: [{ key: 'geneva', name: 'Geneva', centre: IN_FRANCE, countryCode: 'CH', ...(picked ? { pick: GENEVA_PICK } : {}) }],
    },
    ctx(`prec-${picked ? 'pick' : 'none'}`),
  );
  return tripSummary(trip, COUNTRY_INDEX);
}

test('I-22 A-83 Part 8 clause 2: a PICKED city\'s own country outranks countryOf — {CH, picked}', () => {
  const row = precedenceRow(true);
  assert.deepEqual(
    { countryCode: row.cities[0].countryCode, countrySource: row.cities[0].countrySource },
    { countryCode: 'CH', countrySource: 'picked' },
    'a picked row\'s country did not outrank the coarse ring (A-83 Part 8 clause 2)',
  );
  assert.deepEqual(row.countryCodes, ['CH'], 'the picked code did not reach countryCodes');
});

test('I-22 A-83 Part 8 clause 3: a TYPED city\'s code still loses to countryOf, permanently — {FR, coordinate}', () => {
  const row = precedenceRow(false);
  assert.deepEqual(
    { countryCode: row.cities[0].countryCode, countrySource: row.cities[0].countrySource },
    { countryCode: 'FR', countrySource: 'coordinate' },
    'a HAND-TYPED country code overrode countryOf. That is the drift A-29 Part 3 item 3 forbids: ' +
      'a mistyped `HU` on Vienna would put Hungary on a lifetime map permanently.',
  );
  assert.deepEqual(row.countryCodes, ['FR']);
});

test('I-22 A-83 Part 8 clause 1: a null centre means no coordinate attribution, and A-29\'s gate still speaks', () => {
  const trip = createTrip(
    {
      title: 'Typed, no coordinate', startDate: '2019-03-01', endDate: '2019-03-04', homeCurrency: 'EUR',
      cities: [
        { key: 'zagreb', name: 'Zagreb', countryCode: 'HR' },
        { key: 'nowhere', name: 'Nowhere' },
      ],
    },
    ctx('nullcentre'),
  );
  const row = tripSummary(trip, COUNTRY_INDEX);
  assert.deepEqual(
    { countryCode: row.cities[0].countryCode, countrySource: row.cities[0].countrySource },
    { countryCode: 'HR', countrySource: 'stated' },
    'A-29\'s four-step gate stopped filling the gap a missing coordinate leaves',
  );
  assert.deepEqual(
    { countryCode: row.cities[1].countryCode, countrySource: row.cities[1].countrySource },
    { countryCode: null, countrySource: null },
  );
  assert.equal(row.cities[0].centre, null);
  assert.equal(row.cities[1].centre, null);
});

// ---------------------------------------------------------------------------
// `null` is a first-class centre, as a ceiling (verification rule 4).
// ---------------------------------------------------------------------------

test('I-22 / I-22a / I-24: SUMMARY_VERSION is 8', () => {
  // 6 at I-22 (`centre` nullable, `countrySource` gained `'picked'`); **7 at I-22a** (§8.4 A-84
  // Part 3 — the picked DERIVATION changes and no key moves); **8 at I-24** (§8.4 A-85 Part 3 —
  // the row gains the TOP-LEVEL key `placeCount`, the first such widening since A-33).
  assert.equal(SUMMARY_VERSION, 8);
});

test('I-22 ceiling: one located and one unlocated city — two rows, exactly one null centre, exactly one unlocated, ZERO cities at {0,0}', () => {
  const trip: Trip = createTrip(
    {
      title: 'Half located', startDate: '2019-03-01', endDate: '2019-03-04', homeCurrency: 'EUR',
      cities: [
        { key: 'vienna', name: 'Vienna', centre: VIENNA },
        { key: 'kyoto', name: 'Kyoto' },
      ],
    },
    ctx('half'),
  );
  const row = tripSummary(trip, COUNTRY_INDEX);
  // **Named, not counted, and FIRST.** N3 restores `createTrip`'s `{lat: 0, lng: 0}` default: a
  // red that says "1 !== 0" sends a reader looking, a red that says "Kyoto" hands them the row —
  // and it has to be the first assertion in this test or the count below reddens ahead of it and
  // hides the name.
  assert.deepEqual(
    row.cities.filter((c) => c.centre !== null && c.centre.lat === 0 && c.centre.lng === 0).map((c) => c.name),
    [],
    'a summary row still claims a city is at 0°N 0°E — the Gulf of Guinea, which is where every ' +
      'hand-entered city used to be drawn (§8.4 A-83 Part 8 / A-82 Part 7)',
  );
  assert.equal(row.cities.length, 2, 'a city with no centre was dropped from the summary');
  assert.equal(row.cities.filter((c) => c.centre === null).length, 1);

  const stats = travelStats([row], '2026-06-15');
  assert.equal(stats.located.cities, 1, 'travelStats counted an unlocated city as located');
  assert.equal(
    row.cities.length - stats.located.cities, 1,
    'travelStats does not count exactly one unlocated city',
  );
  // The census stays honest: `unattributed` is never greater than `located`, per class.
  assert.ok(stats.unattributed.cities <= stats.located.cities);
});
