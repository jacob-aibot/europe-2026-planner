/**
 * **ROADMAP I-22a — a pick is a RECORD, not a pointer.** ARCHITECTURE §8.4 **A-84**, which amends
 * §8.4 **A-83** Part 8 in place and leaves §8.4 **A-29** Parts 3–4 standing verbatim.
 *
 * **What QA round 61 measured.** `derive/summary.ts` tested `c.placeId !== null` and then handed
 * the city's **own stored `countryCode`** to A-29's acceptance gate. It never looked a gazetteer
 * row up, and no layer of `packages/core` can. So a city with any non-null `placeId` and a
 * well-formed, drawable, **wrong** country code reported `{that code, 'picked'}`, outranked
 * `countryOf`, and put that country on the lifetime map — and `setTripMeta(trip, {cities})`
 * reached it in one call with no hand-editing.
 *
 * **What A-84 rules.** The pick becomes `{rowId, centre, countryCode}` — minted from a row, read
 * whole, refused whole, and **inert** the moment it stops describing the city it sits on. Four
 * clauses, and each has its criterion below:
 *
 *   1. the country is read off the **pick** and never off `City.countryCode` (N1/N2/N3);
 *   2. `parseCityPick` accepts the object whole or refuses it whole, in the parser, so
 *      A-77…A-81 put it at every build door with no new mechanism (N5/N6);
 *   3. the pick attributes only while `city.centre` **exactly equals** `pick.centre` (N4);
 *   4. the mint takes a **row**, so a caller that does not hold one cannot call it (N7).
 *
 * The coordinates below are the shipped gazetteer's own and are **re-derived**, not copied:
 * Geneva `ne:j64n0x` at `{46.21, 6.14}` stating `CH`, where `countryOf` says **`FR`**; Vienna
 * `ne:j64n2j` at `{48.202, 16.3647}` stating `AT`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  COUNTRY_INDEX, SCHEMA_VERSION, SUMMARY_VERSION,
  cityPickFromRow, createTrip, fromJSON, searchGazetteer, setTripMeta, toJSON, migrateDoc,
  sequentialIds, tripSummary, travelStats, TripParseError,
} from '../src/index.ts';
import type { BuildCtx, City, CityPick, GazetteerRow, Trip, TripSummaryRow } from '../src/index.ts';
// **Not on §2.10's surface, deliberately** — the ladder's reporting shape is reached by module
// path, exactly as `nullCentre.test.ts` already reaches it, so the export count stays at 88.
import { migrateDocWithReport } from '../src/serialize/migrate.ts';
import { GAZETTEER } from '../src/geo/gazetteer.gen.ts';

const ctx = (p: string): BuildCtx => ({ ids: sequentialIds(`${p}-`), now: '2026-06-15' });

/** The shipped row, found the way a human finds it: by typing a name. */
function row(query: string): GazetteerRow {
  const hits = searchGazetteer(query, GAZETTEER, { limit: 5 });
  assert.ok(hits.length > 0, `the shipped gazetteer has no row for "${query}"`);
  return hits[0];
}

const GENEVA = row('geneva');
const VIENNA = row('vienna');

test('I-22a: the two shipped rows this file rests on are what A-84 says they are', () => {
  assert.deepEqual(
    { id: GENEVA.id, centre: GENEVA.centre, countryCode: GENEVA.countryCode },
    { id: 'ne:j64n0x', centre: { lat: 46.21, lng: 6.14 }, countryCode: 'CH' },
  );
  assert.deepEqual(
    { id: VIENNA.id, centre: VIENNA.centre, countryCode: VIENNA.countryCode },
    { id: 'ne:j64n2j', centre: { lat: 48.202, lng: 16.3647 }, countryCode: 'AT' },
  );
});

test('I-22a A-84 Part 8: SCHEMA_VERSION is 5 and SUMMARY_VERSION is 7', () => {
  assert.equal(SCHEMA_VERSION, 5);
  assert.equal(SUMMARY_VERSION, 7);
});

// ---------------------------------------------------------------------------
// N1 / N2 — the country comes off the PICK. This is the criterion the increment
// lives or dies on, and N1 is QA R61-1 exactly.
// ---------------------------------------------------------------------------

/**
 * One city standing exactly where round 61 stood it: at Geneva's coordinate (which the coarse
 * ring attributes to **`FR`**), carrying the picked Geneva row, and with **`HU` typed into its
 * own `countryCode`**. `HU` is drawable, so under the shipped code it won; under A-84 it is not
 * consulted at all.
 */
function pickedGeneva(): Trip {
  return createTrip(
    {
      title: 'Geneva, picked', startDate: '2019-03-01', endDate: '2019-03-04', homeCurrency: 'EUR',
      cities: [{
        key: 'geneva', name: 'Geneva', countryCode: 'HU',
        centre: { lat: 46.21, lng: 6.14 },
        pick: { rowId: 'ne:j64n0x', centre: { lat: 46.21, lng: 6.14 }, countryCode: 'CH' },
      }],
    },
    ctx('picked'),
  );
}

test('I-22a A-84 Part 3 clause 1 (N1/N2): the country is read off the PICK — {CH, picked}, never HU, never FR', () => {
  const summary = tripSummary(pickedGeneva(), COUNTRY_INDEX);
  assert.deepEqual(
    { countryCode: summary.cities[0].countryCode, countrySource: summary.cities[0].countrySource },
    { countryCode: 'CH', countrySource: 'picked' },
    'the picked arm did not answer with the PICK\'s own country. `HU` here is QA R61-1 — the ' +
      'city\'s own typed `countryCode` being read on the picked path; `FR` is the coarse ring, ' +
      'which a live pick outranks (§8.4 A-84 Part 3 clause 1).',
  );
  assert.deepEqual(summary.countryCodes, ['CH'], 'countryCodes carries a country the pick never stated');
});

test('I-22a A-84 Part 3 clause 1: a TYPED city\'s code still loses to countryOf, permanently — A-29 Part 3 is unamended', () => {
  const trip = createTrip(
    {
      title: 'Geneva, typed', startDate: '2019-03-01', endDate: '2019-03-04', homeCurrency: 'EUR',
      cities: [{ key: 'geneva', name: 'Geneva', countryCode: 'CH', centre: { lat: 46.21, lng: 6.14 } }],
    },
    ctx('typed'),
  );
  const summary = tripSummary(trip, COUNTRY_INDEX);
  assert.deepEqual(
    { countryCode: summary.cities[0].countryCode, countrySource: summary.cities[0].countrySource },
    { countryCode: 'FR', countrySource: 'coordinate' },
  );
});

// ---------------------------------------------------------------------------
// N3 — round 61's own reproduction, through a SHIPPED DOOR.
// ---------------------------------------------------------------------------

test('I-22a A-84 Part 3 (N3): `setTripMeta` writing `countryCode` over a picked city is INERT — {CH, picked} stays {CH, picked}', () => {
  const trip = pickedGeneva();
  const patched = setTripMeta(
    trip,
    { cities: trip.cities.map((c): City => ({ ...c, countryCode: 'HU' })) },
    ctx('n3'),
  );
  const summary = tripSummary(patched, COUNTRY_INDEX);
  assert.deepEqual(
    { countryCode: summary.cities[0].countryCode, countrySource: summary.cities[0].countrySource },
    { countryCode: 'CH', countrySource: 'picked' },
    'QA R61-1: a shipped door composed a false pair out of two fields that move independently, ' +
      'and the summary read the half the door wrote. The pick is one value now.',
  );
});

// ---------------------------------------------------------------------------
// N4 — a pick that no longer describes the city is INERT. This is the
// invalidation clause A-83 did not have.
// ---------------------------------------------------------------------------

test('I-22a A-84 Part 3 clause 3 (N4): moving the city\'s centre makes the pick STALE — {AT, coordinate} at Vienna', () => {
  const trip = pickedGeneva();
  const moved = setTripMeta(
    trip,
    { cities: trip.cities.map((c): City => ({ ...c, centre: { lat: 48.202, lng: 16.3647 } })) },
    ctx('n4'),
  );
  const summary = tripSummary(moved, COUNTRY_INDEX);
  assert.deepEqual(
    { countryCode: summary.cities[0].countryCode, countrySource: summary.cities[0].countrySource },
    { countryCode: 'AT', countrySource: 'coordinate' },
    'the pick still attributed at a coordinate it does not describe. A pick describes a POINT ' +
      '(§8.4 A-84 Part 3 clause 3); when the city moves it is kept, and it attributes nothing.',
  );
  assert.deepEqual(summary.countryCodes, ['AT'], 'countryCodes still carries the stale pick\'s country');
  // The pick is KEPT — it is the user's own record of what they did.
  assert.deepEqual(moved.cities[0].pick, trip.cities[0].pick, 'a stale pick was deleted rather than left inert');
});

test('I-22a A-84 Part 3 clause 3 (N4): a null centre makes the pick stale too, and `countrySource` gains NO fourth value', () => {
  const trip = pickedGeneva();
  // `'XX'` and not `'HU'`: `HU` is drawable, so A-29's gate would admit it and the assertion
  // would be about A-29 rather than about the pick.
  const cleared = setTripMeta(
    trip,
    { cities: trip.cities.map((c): City => ({ ...c, centre: null, countryCode: 'XX' })) },
    ctx('n4b'),
  );
  const summary = tripSummary(cleared, COUNTRY_INDEX);
  assert.deepEqual(
    { countryCode: summary.cities[0].countryCode, countrySource: summary.cities[0].countrySource },
    { countryCode: null, countrySource: null },
    'a stale pick is not a source — `countrySource` has exactly three non-null values',
  );
});

// ---------------------------------------------------------------------------
// N5 — the pick is refused WHOLE, as a ceiling (verification rule 4).
// ---------------------------------------------------------------------------

/** A well-formed v5 document with one city, whose `pick` the caller then replaces. */
function docWithPick(pick: unknown): string {
  const trip = createTrip(
    {
      title: 'Ceiling', startDate: '2019-03-01', endDate: '2019-03-02', homeCurrency: 'EUR',
      cities: [{ key: 'k', name: 'K', centre: { lat: 46.21, lng: 6.14 } }],
    },
    ctx('ceil'),
  );
  const doc = JSON.parse(toJSON(trip)) as { cities: Array<Record<string, unknown>> };
  doc.cities[0].pick = pick;
  return JSON.stringify(doc);
}

const GOOD_PICK = { rowId: 'ne:j64n0x', centre: { lat: 46.21, lng: 6.14 }, countryCode: 'CH' };

/** Every shape the parser must refuse, with the JSON path fragment its reason must name. */
const REFUSED: ReadonlyArray<{ what: string; pick: unknown; at: string }> = [
  // `pick` itself
  { what: 'a string rather than an object', pick: 'ne:j64n0x', at: '$.cities[0].pick' },
  { what: 'an array', pick: [], at: '$.cities[0].pick' },
  { what: 'a number', pick: 3, at: '$.cities[0].pick' },
  // rowId
  { what: "rowId ''", pick: { ...GOOD_PICK, rowId: '' }, at: '$.cities[0].pick.rowId' },
  { what: "rowId '   '", pick: { ...GOOD_PICK, rowId: '   ' }, at: '$.cities[0].pick.rowId' },
  { what: "rowId ':'", pick: { ...GOOD_PICK, rowId: ':' }, at: '$.cities[0].pick.rowId' },
  { what: "rowId 'x'", pick: { ...GOOD_PICK, rowId: 'x' }, at: '$.cities[0].pick.rowId' },
  { what: "rowId 'null'", pick: { ...GOOD_PICK, rowId: 'null' }, at: '$.cities[0].pick.rowId' },
  { what: "rowId 'ne:'", pick: { ...GOOD_PICK, rowId: 'ne:' }, at: '$.cities[0].pick.rowId' },
  { what: 'rowId of 4 kB', pick: { ...GOOD_PICK, rowId: `ne:${'a'.repeat(4096)}` }, at: '$.cities[0].pick.rowId' },
  { what: 'rowId a number', pick: { ...GOOD_PICK, rowId: 42 }, at: '$.cities[0].pick.rowId' },
  { what: 'rowId null', pick: { ...GOOD_PICK, rowId: null }, at: '$.cities[0].pick.rowId' },
  { what: 'rowId absent', pick: { centre: GOOD_PICK.centre, countryCode: 'CH' }, at: '$.cities[0].pick.rowId' },
  // centre — never null, because clause 3 needs it
  { what: 'centre absent', pick: { rowId: 'ne:j64n0x', countryCode: 'CH' }, at: '$.cities[0].pick.centre' },
  { what: 'centre null', pick: { ...GOOD_PICK, centre: null }, at: '$.cities[0].pick.centre' },
  { what: "centre {lat:'1'}", pick: { ...GOOD_PICK, centre: { lat: '1', lng: 2 } }, at: '$.cities[0].pick.centre.lat' },
  // countryCode — uppercase exactly, never trimmed
  { what: "countryCode 'hu'", pick: { ...GOOD_PICK, countryCode: 'hu' }, at: '$.cities[0].pick.countryCode' },
  { what: "countryCode ' HU '", pick: { ...GOOD_PICK, countryCode: ' HU ' }, at: '$.cities[0].pick.countryCode' },
  { what: "countryCode 'HUN'", pick: { ...GOOD_PICK, countryCode: 'HUN' }, at: '$.cities[0].pick.countryCode' },
  { what: "countryCode ''", pick: { ...GOOD_PICK, countryCode: '' }, at: '$.cities[0].pick.countryCode' },
  { what: 'countryCode 3', pick: { ...GOOD_PICK, countryCode: 3 }, at: '$.cities[0].pick.countryCode' },
  { what: 'countryCode absent', pick: { rowId: 'ne:j64n0x', centre: GOOD_PICK.centre }, at: '$.cities[0].pick.countryCode' },
];

test('I-22a A-84 Part 3 clause 2 (N5): the pick is refused WHOLE, each at its own named path — a ceiling', () => {
  for (const c of REFUSED) {
    assert.throws(
      () => fromJSON(docWithPick(c.pick)),
      (e: unknown) =>
        e instanceof TripParseError &&
        e.path === c.at,
      `fromJSON accepted, or misreported, ${c.what} — expected a TripParseError at ${c.at}`,
    );
  }
});

test('I-22a A-84 Part 3 clause 2 (N5): it accepts EXACTLY two shapes — `null`, and one well-formed object', () => {
  const nulled = fromJSON(docWithPick(null));
  assert.equal(nulled.cities[0].pick, null);

  const good = fromJSON(docWithPick(GOOD_PICK));
  assert.deepEqual(good.cities[0].pick, GOOD_PICK);
  // `countryCode: null` is the third legal value of the third field, not a fourth shape.
  const codeless = fromJSON(docWithPick({ ...GOOD_PICK, countryCode: null }));
  assert.equal(codeless.cities[0].pick?.countryCode, null);

  // …and it round-trips byte for byte through `toJSON`.
  assert.deepEqual(JSON.parse(toJSON(good)).cities[0].pick, GOOD_PICK);
  assert.equal(JSON.parse(toJSON(nulled)).cities[0].pick, null);
});

test('I-22a: `pick` ABSENT is refused by the parser — the migration rung is the layer that supplies it', () => {
  const trip = createTrip(
    { title: 'No pick key', startDate: '2019-03-01', endDate: '2019-03-02', homeCurrency: 'EUR', cities: [{ key: 'k', name: 'K' }] },
    ctx('nopick'),
  );
  const doc = JSON.parse(toJSON(trip)) as { cities: Array<Record<string, unknown>> };
  delete doc.cities[0].pick;
  assert.throws(
    () => fromJSON(JSON.stringify(doc)),
    (e: unknown) => e instanceof TripParseError && e.path === '$.cities[0].pick',
    '`centre`\'s own layering, one field over: `fromJSON` refuses an absent field and `migrateDoc` ' +
      'is the layer that supplies one (§8.4 A-84 Part 3 clause 2).',
  );
});

// ---------------------------------------------------------------------------
// N6 — every build door is behind the parser, with no new mechanism.
// ---------------------------------------------------------------------------

const BAD_PICK = { rowId: ':', centre: { lat: 46.21, lng: 6.14 }, countryCode: 'CH' } as unknown as CityPick;

/**
 * **The path a door reports is `commit`'s, not `fromJSON`'s, and that is the shipped A-77
 * mechanism rather than a gap.** `commit(where, before, after)` hands each record it wrote to
 * `fromJSON`'s own per-record parser, so the parser's path is relative to the RECORD — `$.pick`
 * — and `commit` names the collection slot beside it: *"… (at $.pick.rowId). Saving it would
 * produce a document that cannot be re-opened. (cities[0])"*. Both halves are asserted, because
 * either alone would let a door name the wrong field or the wrong city.
 */
const namesTheBadPick = (e: unknown): boolean =>
  e instanceof Error && /\$\.pick\.rowId/.test(e.message) && /cities\[0\]/.test(e.message);

test('I-22a (N6): `createTrip` and `setTripMeta` BOTH refuse a malformed pick, naming `pick.rowId` and `cities[0]`', () => {
  assert.throws(
    () => createTrip(
      { title: 'D', startDate: '2019-03-01', endDate: '2019-03-02', homeCurrency: 'EUR', cities: [{ name: 'X', key: 'x', pick: BAD_PICK }] },
      ctx('door1'),
    ),
    namesTheBadPick,
  );

  const trip = createTrip(
    { title: 'D2', startDate: '2019-03-01', endDate: '2019-03-02', homeCurrency: 'EUR', cities: [{ key: 'x', name: 'X' }] },
    ctx('door2'),
  );
  assert.throws(
    () => setTripMeta(trip, { cities: trip.cities.map((c): City => ({ ...c, pick: BAD_PICK })) }, ctx('door3')),
    namesTheBadPick,
  );
  // …and `fromJSON` itself, over the same value, names the whole path.
  assert.throws(
    () => fromJSON(docWithPick(BAD_PICK)),
    (e: unknown) => e instanceof TripParseError && e.path === '$.cities[0].pick.rowId',
  );
});

test('I-22a (N6): neither door contains the pick\'s SHAPE RULE — the parser is the only place it lives', () => {
  const src = readFileSync(new URL('../src/build/createTrip.ts', import.meta.url), 'utf8');
  assert.equal(
    /rowId/.test(src), false,
    '`build/createTrip.ts` names `rowId`. A-77…A-81\'s boundary is what puts the pick\'s shape ' +
      'rule at every door; a second copy in a door is R16-2\'s *one property, two guards* and ' +
      'the eleventh door is always the one nobody remembered.',
  );
});

// ---------------------------------------------------------------------------
// N7 — the mint takes a ROW, end to end.
// ---------------------------------------------------------------------------

test('I-22a A-84 Part 3 clause 4 (N7): `cityPickFromRow` copies the row, and the pick reaches a summary as {CH, picked}', () => {
  const pick = cityPickFromRow(GENEVA);
  assert.deepEqual(pick, { rowId: 'ne:j64n0x', centre: { lat: 46.21, lng: 6.14 }, countryCode: 'CH' });
  // A fresh object, not the row's own — a summary row that aliased the corpus would let a write
  // to a trip land in the gazetteer (A-56 Part 2 / R43-1, one type over).
  assert.notEqual(pick.centre, GENEVA.centre, 'the mint handed back the ROW\'s centre object');

  const trip = createTrip(
    {
      title: 'Geneva, through the only path there is', startDate: '2019-03-01', endDate: '2019-03-04',
      homeCurrency: 'EUR',
      cities: [{ key: 'geneva', name: GENEVA.name, centre: { ...GENEVA.centre }, pick }],
    },
    ctx('mint'),
  );
  const back = fromJSON(toJSON(trip));
  const summary = tripSummary(back, COUNTRY_INDEX);
  assert.deepEqual(
    { countryCode: summary.cities[0].countryCode, countrySource: summary.cities[0].countrySource },
    { countryCode: 'CH', countrySource: 'picked' },
    'Geneva is not recordable with the right country through the only path that exists',
  );
});

test('I-22a A-84 Part 3 clause 4 (N7): a row stating no drawable two-letter code mints `countryCode: null`, and THAT parses', () => {
  const codeless: GazetteerRow = { ...GENEVA, countryCode: '' as GazetteerRow['countryCode'] };
  const pick = cityPickFromRow(codeless);
  assert.equal(pick.countryCode, null, 'the mint copied a non-code through — the parser would then refuse the document it produced');
  // …and the document it produces opens, which is what "the mint and the shape rule AGREE" means.
  const trip = createTrip(
    { title: 'Codeless', startDate: '2019-03-01', endDate: '2019-03-02', homeCurrency: 'EUR', cities: [{ key: 'c', name: 'C', centre: { ...codeless.centre }, pick }] },
    ctx('codeless'),
  );
  assert.equal(fromJSON(toJSON(trip)).cities[0].pick?.countryCode, null);
  // A pick with no country attributes nothing: the city falls to A-29 verbatim.
  const summary = tripSummary(trip, COUNTRY_INDEX);
  assert.equal(summary.cities[0].countrySource, 'coordinate');
});

// ---------------------------------------------------------------------------
// N8 / N9 — the migration, against the COMMITTED fixture.
// ---------------------------------------------------------------------------

const LEGACY_DIR = new URL('../../../fixtures/legacy/', import.meta.url);
const legacy = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(name, LEGACY_DIR), 'utf8')) as Record<string, unknown>;

/** Both documents, minus the field the rung is about, so "every other byte" is comparable. */
function withoutPickFields(doc: unknown): unknown {
  const d = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
  for (const c of (d.cities as Array<Record<string, unknown>>) ?? []) {
    delete c.placeId;
    delete c.pick;
  }
  delete d.schemaVersion;
  return d;
}

test('I-22a A-84 Part 8 (N8): the 4 → 5 rung DROPS `placeId`, writes `pick: null`, and may not promote', () => {
  const before = legacy('trip-picked.v4.json');
  const { doc, report } = migrateDocWithReport(before);
  const after = doc as { schemaVersion: number; cities: Array<Record<string, unknown>> };

  assert.equal(after.schemaVersion, 5);
  assert.deepEqual(
    after.cities.filter((c) => c.pick !== null).map((c) => c.name),
    [],
    'the rung PROMOTED a `placeId` into a pick. That composes a verified record out of exactly ' +
      'the three unverified fields this increment exists to stop being read as one, and it ' +
      're-creates QA R61-1 inside the migration (§8.4 A-84 Part 8).',
  );
  assert.deepEqual(after.cities.map((c) => c.placeId), [undefined, undefined], '`placeId` survived the rung');
  assert.equal(report.droppedPlaceIds, 1, 'the rung did not report the one non-null `placeId` it dropped');

  // Every other byte unchanged — round 61's own method, whole-document rather than field by field.
  assert.deepEqual(withoutPickFields(after), withoutPickFields(before));

  // …and the migrated document parses.
  const trip = fromJSON(JSON.stringify(after));
  assert.deepEqual(trip.cities.map((c) => c.pick), [null, null]);
});

test('I-22a (N8): migrating twice is identical to once, and a v5 document is a no-op reporting 0', () => {
  const once = migrateDoc(legacy('trip-picked.v4.json'));
  const twice = migrateDocWithReport(once);
  assert.deepEqual(twice.doc, once);
  assert.equal(twice.report.droppedPlaceIds, 0);
});

test('I-22a (N8): over EVERY committed legacy fixture the dropped count is 0 — except the one written for this rung', () => {
  const counts = readdirSync(LEGACY_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => [f, migrateDocWithReport(legacy(f)).report.droppedPlaceIds] as const);
  assert.ok(counts.length >= 3, 'the legacy fixture directory lost a document');
  assert.deepEqual(
    counts.filter(([, n]) => n !== 0),
    [['trip-picked.v4.json', 1]],
    'a committed fixture other than the rung\'s own lost a picked value. That is one of I-22a\'s ' +
      'three stop-and-report conditions.',
  );
  // …and every one of them still opens.
  for (const [f] of counts) assert.ok(fromJSON(JSON.stringify(migrateDoc(legacy(f)))).id, `${f} no longer opens`);
});

test('I-22a (R61-11): the committed v3 fixture pins the 3 → 4 rung too — one {0,0} centre nulled, one real one untouched', () => {
  const { doc, report } = migrateDocWithReport(legacy('trip-origin-centre.v3.json'));
  const after = doc as { schemaVersion: number; cities: Array<Record<string, unknown>> };
  assert.equal(after.schemaVersion, SCHEMA_VERSION);
  assert.equal(report.nulledOriginCentres, 1);
  assert.deepEqual(
    after.cities.filter((c) => c.centre === null).map((c) => c.name),
    ['Kyoto'],
    'the rung nulled a coordinate that was not {0,0}',
  );
  assert.deepEqual(after.cities[0].centre, { lat: 46.21, lng: 6.14 });
  assert.deepEqual(after.cities.map((c) => c.pick), [null, null]);
});

test('I-22a (N9): a build that reads up to 5 refuses a 6, and the ladder still names the version it was handed', () => {
  const doc = migrateDoc(legacy('trip-picked.v4.json')) as Record<string, unknown>;
  assert.throws(() => migrateDoc({ ...doc, schemaVersion: 6 }), /this build reads up to 5\. Update the app\./);
  assert.throws(() => migrateDoc({ ...doc, schemaVersion: 0 }), /no migration path from schemaVersion 0/);
});

// ---------------------------------------------------------------------------
// N10 — `seen`, and the number it exists to make possible (QA R61-6).
// ---------------------------------------------------------------------------

test('I-22a A-84 Part 7 item 1 (N10): `seen` counts RECORDS, so `seen − located` is the unlocated ones', () => {
  const rows: TripSummaryRow[] = ['a', 'b'].map((tag) => {
    const trip = createTrip(
      {
        title: `Trip ${tag}`, startDate: '2019-03-01', endDate: '2019-03-04', homeCurrency: 'EUR',
        cities: [
          { key: `${tag}-vienna`, name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } },
          // The SAME name, unlocated, in both trips: `travelStats` groups cities by `nameKey`
          // across trips, so the two records subtract to one row.
          { key: `${tag}-paris`, name: 'Paris' },
        ],
      },
      ctx(`seen-${tag}`),
    );
    return tripSummary(trip, COUNTRY_INDEX);
  });
  const stats = travelStats(rows, '2026-06-15');
  assert.equal(stats.seen.cities, 4, '`seen` was computed from the GROUPED `cities` array, not from the records');
  assert.equal(stats.located.cities, 2);
  assert.equal(stats.cities.filter((c) => normalize(c.name) === 'paris').length, 1, 'the two Paris records did not group into one row');
  assert.equal(stats.seen.cities - stats.located.cities, 2, 'the unlocated record count is not derivable');
  for (const cls of ['cities', 'places', 'stops'] as const) {
    assert.ok(
      stats.unattributed[cls] <= stats.located[cls] && stats.located[cls] <= stats.seen[cls],
      `the census invariant \`unattributed <= located <= seen\` broke for ${cls}`,
    );
  }
});

const normalize = (s: string) => s.trim().toLowerCase();
