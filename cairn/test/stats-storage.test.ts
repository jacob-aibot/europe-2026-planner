/**
 * ROADMAP Phase 2 **exit criterion 6**, in its **revision-26** form.
 * ARCHITECTURE §8.4 **A-33** (QA **R28-2**, MAJOR), which supersedes A-31 Part 6's mechanism,
 * and §8.4 **A-36** (QA **R29-1**, MAJOR), which supersedes A-33's 6b-1/6b-2/6b-4 split.
 *
 * The rule is unchanged and is the whole point:
 *
 * > **A count may be stored only if it is a property of exactly one document, minted inside the
 * > write that carries that document (§8.4 clause 1) and stamped with `SUMMARY_VERSION`
 * > (clause 3). Everything else — every number that summarises more than one trip — is computed
 * > on read and has no storage representation at all.**
 *
 * That is why `cityCount` is legitimate and `countriesVisited: 47` is not, and the distinction is
 * mechanical: the first can be recomputed from a document that exists and repaired by the rescan;
 * the second summarises a *set* of documents, has no document to be recomputed from, and drifts
 * with nothing to notice. It is §0.6 applied one level up.
 *
 * **What changed, and why.** The revision-24 form was two halves: an allow-list of the row's
 * *count-shaped* fields, and a regex — `/([A-Za-z$_][\w$]*)\??\s*:\s*number\b/` — over source
 * text. That regex matches a **declaration**; the danger is a **value**. QA round 28 made both
 * `SUMMARIES.put(summary, id)` call sites in `apps/web/src/ports/storage.ts` write
 * `{ ...summary, countriesVisited, daysTravelled }` into IndexedDB, on every write, forever —
 * and the criterion, the 795-test suite and `tsc` were **all green** (a spread widens the object
 * type, so excess-property checking never fires). A second fault, `daysAbroad: number` on the row
 * and minted, walked past the classifier by choosing a name. §0.5: *a rule that cannot catch its
 * own bug does not ship.*
 *
 * **What revision 26 changed.** A-33 left one port unexecuted — `apps/web/src/ports/storage.ts`,
 * *"IndexedDB, does not run in Node"* — and let 6b-2's grep stand in for running it. QA round 29
 * defeated the grep in one line, and the architect then measured that **no static form of it
 * works**: a check over an argument expression cannot see what happened to the binding before
 * the call. A-36's ruling is that *execution* is the mechanism —
 *
 * > **Every `StoragePort` implementation named by the 6b-3 census is executed by the gate,
 * > written through on every mutating method, and read back; the keys of every value that
 * > reaches its summary store, and of every row it returns, are asserted against
 * > `ROW_KEYS`/`ROW_PATHS`. No implementation is policed by reading its source text.**
 *
 * So, the parts, and the ones with teeth end at a value in a store rather than at text in a file:
 *
 *   **6a′**   the row's **whole key set**, compile-time and runtime, and every leaf path
 *   **6b-1a** the rows the MEMORY port actually holds, read back after a real write
 *   **6b-1b** the same, for the WEB port — the shipped file, type-stripped and evaluated in
 *             plain Node against a recording double of the IndexedDB surface it uses
 *   **6b-2**  demoted to a **tripwire**: the pinned site count and the bare-identifier capture
 *   **6b-3**  the port census — a third implementation cannot appear without an executed arm
 *   **6b-5**  nothing that persists anything imports `travelStats`
 *   **6b′′′′** the old source sweep, demoted to a secondary **tripwire**
 *
 * (**6b-4**, reading the real IndexedDB bytes back in Chromium, is deliberately and permanently
 * **not** a gate: it needs a browser, and this gate must run on bare Node. It lives in `qa/` as
 * `qa/i7a-idb-rowkeys.mjs`, and A-36 Part 4 makes running it an **obligation** on any increment
 * that touches the web port, the double or `ROW_KEYS` — with the measured result recorded in
 * BUILD-NOTES, or its absence disclosed as a gap and not called a pass.)
 *
 * **Widening `ROW_KEYS`, `ROW_PATHS` or either allow-list is an architect's ruling**, exactly as
 * §2.10's export list works — a field on the row is a field in storage and `SUMMARY_VERSION` has
 * to move with it. A builder who finds a new hit has found a design question, not a chore.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';
// **A-36.** Node 22.18's type stripper, which `package.json`'s `engines` already requires. It
// is what lets 6b-1b evaluate the shipped `apps/web` port without a build step and without a
// static import into a tsconfig that deliberately excludes that project. It prints an
// `ExperimentalWarning`, which is noise in `node --test` and not a failure.
import { stripTypeScriptTypes } from 'node:module';
import { COUNTRY_INDEX, SCHEMA_VERSION, SUMMARY_VERSION, tripSummary, createTrip, addPhoto, addStop, migrateDoc, sequentialIds, toJSON, fromJSON } from '../packages/core/src/index.ts';
import type { BuildCtx, Trip, TripSummaryRow } from '../packages/core/src/index.ts';
// §2.10's "tests do not create surface": `addPlace` is an internal, imported by module path
// exactly as `packages/core/test/readOnce.test.ts` already imports it. Axis C's `attribution
// .places` cell cannot be reached without a `Place` that carries an `at`, and there is no
// public builder for one — this widens no export list.
import { addPlace } from '../packages/core/src/build/stops.ts';
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
} from '../packages/client/src/index.ts';
import type { MemoryStorage, Ports, StoragePort } from '../packages/client/src/index.ts';
import { loadEurope2026 } from '../fixtures/loadEurope2026.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const rel = (p: string) => relative(CAIRN, p).split(sep).join('/');

// ===========================================================================
// (6a′) The row's key set is pinned IN FULL — every field, not the count-shaped ones.
// ===========================================================================

/**
 * **Compile-time.** A field added to `TripSummaryRow` without a line here is a `tsc` error,
 * which is the earliest this can possibly fail. No `Partial`, no index signature.
 */
const ROW_KEYS: Record<keyof TripSummaryRow, true> = {
  id: true,
  title: true,
  startDate: true,
  endDate: true,
  datePrecision: true,
  cityCount: true,
  dayCount: true,
  stopCount: true,
  poolCount: true,
  revision: true,
  countryCodes: true,
  cities: true,
  attribution: true,
  summaryVersion: true,
};

/**
 * **Runtime, every leaf.** The dotted leaf paths a minted row carries, with array indices
 * collapsed to `[]`, transcribed in full. This is the assertion `daysAbroad: number` could not
 * walk past, because it does not ask what a field is *called*.
 *
 * **20 → 24 at §8.4 A-56 Part 6 (ROADMAP I-12).** `cities[]` gains `centre`, `firstDay` and
 * `lastDay`; `centre` is a plain object, so `leafPaths` descends into it and it contributes
 * **two** leaves rather than one. `ROW_KEYS` is unchanged at the top level, and that is a
 * deliberate property of doing the widening *inside* `cities[]` rather than beside it.
 */
const ROW_PATHS = [
  'attribution.places.attributed',
  'attribution.places.located',
  'attribution.stops.attributed',
  'attribution.stops.located',
  'cities[].centre.lat',
  'cities[].centre.lng',
  'cities[].countryCode',
  'cities[].countrySource',
  'cities[].firstDay',
  'cities[].key',
  'cities[].lastDay',
  'cities[].name',
  'cityCount',
  'countryCodes[]',
  'datePrecision',
  'dayCount',
  'endDate',
  'id',
  'poolCount',
  'revision',
  'startDate',
  'stopCount',
  'summaryVersion',
  'title',
];

/** Every leaf of a value, as a dotted path. A leaf is anything not an array and not a plain object. */
function leafPaths(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    const out = new Set<string>();
    for (const v of value) for (const p of leafPaths(v, `${path}[]`)) out.add(p);
    return [...out];
  }
  if (value && typeof value === 'object') {
    const out: string[] = [];
    for (const [k, v] of Object.entries(value)) out.push(...leafPaths(v, path ? `${path}.${k}` : k));
    return out;
  }
  return [path];
}

// ---------------------------------------------------------------------------
// What "count-shaped" means. Kept — but as a LABEL on a set that is pinned by other means,
// which is the only job a name-based heuristic can do honestly (A-33 Part 2).
// ---------------------------------------------------------------------------

/** The nouns the criterion names, plus `stop`, `place` and `pool` because the row counts those too. */
const DOMAIN = /countr(?:y|ies)|cit(?:y|ies)|trip|day|stop|place|pool/i;
/** A counting suffix. */
const SHAPE = /(?:count|total|tally|num|visited|travell?ed)$/i;
/** A bare plural domain noun. `cities: number` is a count of cities however it is spelled. */
const PLURAL = /(?:cities|countries|trips|days|stops|places)$/i;
/** The census pair A-31 Part 2 introduces. Neither name carries its noun, so both are named. */
const CENSUS = /^(?:located|attributed)$/i;

function countShaped(name: string): boolean {
  if (CENSUS.test(name)) return true;
  if (PLURAL.test(name) && DOMAIN.test(name)) return true;
  return DOMAIN.test(name) && SHAPE.test(name);
}

/**
 * The eight count-shaped fields §8.4 A-31 Part 6 permits on the row, as dotted paths.
 *
 * **A-56 Part 6: this does not move, and that is a real check on the widening rather than a
 * formality.** It is what fails if someone later adds `cities[].dayCount` here instead of
 * deriving one from `firstDay`/`lastDay`. A ninth entry means a count was stored.
 */
const ROW_COUNT_FIELDS = [
  'attribution.places.attributed',
  'attribution.places.located',
  'attribution.stops.attributed',
  'attribution.stops.located',
  'cityCount',
  'dayCount',
  'poolCount',
  'stopCount',
];

// ---------------------------------------------------------------------------
// The rows the leaf-path union is taken over. One row cannot cover the set, because an
// empty collection contributes no path (A-33 Part 2 assertion 3).
//
// **A-56 Part 6 adds a fourth**: a trip with one city that occupies **no day**, so the
// `firstDay: null` / `lastDay: null` branch ships exercised rather than assumed. That is 2a's
// own population — `ensureDays` marks every blank day `primaryCity: 'transit'`, so a trip whose
// days were never assigned to its cities is in exactly this state.
//
// *(Measured while building it, and recorded because A-56 Part 6 assumes the opposite: the
// first two fixtures ALREADY reach `firstDay: null`, for the same `'transit'` reason, and the
// reference trip is the only fixture here that reaches a NON-null one. The fourth fixture is
// added as ruled, and the union test below now pins **both** branches explicitly rather than
// resting on which fixture happens to reach which.)*
// ---------------------------------------------------------------------------

const referenceRow = () => tripSummary((loadEurope2026() as { trip: Trip }).trip, COUNTRY_INDEX);

/** A trip with ONE city the index cannot attribute — the `cities[].countryCode: null` leaf. */
function nullCountryRow(): TripSummaryRow {
  const trip = createTrip(
    {
      title: 'One unplaceable city',
      startDate: '2024-03-01',
      endDate: '2024-03-02',
      homeCurrency: 'EUR',
      // Deep in the South Atlantic: a real coordinate the country index has nothing for.
      cities: [{ key: 'nowhere', name: 'Nowhere', centre: { lat: -40.5, lng: -20.5 } }],
    },
    { ids: sequentialIds('null-'), now: '2026-06-15' },
  );
  return tripSummary(trip, COUNTRY_INDEX);
}

/** A trip with no city, no place and no stop — every collection empty. */
function emptyRow(): TripSummaryRow {
  const trip = createTrip(
    { title: 'Nothing at all', startDate: '2024-05-01', endDate: '2024-05-02', homeCurrency: 'EUR' },
    { ids: sequentialIds('empty-'), now: '2026-06-15' },
  );
  return tripSummary(trip, COUNTRY_INDEX);
}

/**
 * **A-56 Part 6's fourth fixture.** One city, and no day of the trip carries it — the shape
 * that makes `firstDay`/`lastDay` null, and the majority population for a completed trip.
 */
function cityWithNoDaysRow(): TripSummaryRow {
  const trip = createTrip(
    {
      title: 'A city on no day',
      startDate: '2019-03-01',
      endDate: '2019-03-31',
      datePrecision: 'month',
      homeCurrency: 'EUR',
      cities: [{ key: 'kyoto', name: 'Kyoto', centre: { lat: 35.0116, lng: 135.7681 } }],
    },
    { ids: sequentialIds('nodays-'), now: '2026-06-15' },
  );
  assert.ok(trip.days.length > 0, 'INCONCLUSIVE: the fixture has no day skeleton at all');
  assert.deepEqual(
    trip.days.flatMap((d) => d.cities).filter((k) => k === 'kyoto'),
    [],
    'INCONCLUSIVE: the fixture\'s city occupies a day, so it no longer reaches the null branch',
  );
  return tripSummary(trip, COUNTRY_INDEX);
}

const UNION_ROWS = () => [referenceRow(), nullCountryRow(), emptyRow(), cityWithNoDaysRow()];

test('exit 6a: a minted row\'s TOP-LEVEL keys are exactly the type\'s — no more, no fewer', () => {
  for (const row of UNION_ROWS()) {
    assert.deepEqual(
      Object.keys(row).sort(),
      Object.keys(ROW_KEYS).sort(),
      'a field was minted but not typed, or typed but not minted. A field on TripSummaryRow is a ' +
        'field in storage and SUMMARY_VERSION has to move with it — widening ROW_KEYS is an ' +
        'ARCHITECT\'S ruling (ARCHITECTURE §8.4 A-33 Part 2), not a builder\'s.',
    );
  }
});

test('exit 6a: the union of four rows\' LEAF PATHS is exactly ROW_PATHS', () => {
  const union = new Set<string>();
  for (const row of UNION_ROWS()) for (const p of leafPaths(row)) union.add(p);
  assert.deepEqual(
    [...union].sort(),
    [...ROW_PATHS].sort(),
    'the row grew or lost a leaf. Not the count-shaped ones — EVERY key: `daysAbroad: number` ' +
      'carries no counting suffix and no plural domain noun, and that is exactly how a minted ' +
      'lifetime count walked past the revision-24 classifier (§8.4 A-33 Part 1).',
  );
  // Each row individually is a SUBSET, which is what catches an injection into a row that is
  // not the reference one.
  for (const row of UNION_ROWS()) {
    const extra = leafPaths(row).filter((p) => !ROW_PATHS.includes(p));
    assert.deepEqual(extra, [], `a row carries leaves the type does not: ${extra.join(', ')}`);
  }
});

test('exit 6a: the four rows are genuinely different, so the union is not one row four times', () => {
  const [ref, nul, empty, noDays] = UNION_ROWS();
  assert.ok(leafPaths(ref).includes('cities[].countryCode'));
  assert.equal(nul.cities.length, 1, 'the null-country row lost its city');
  assert.equal(nul.cities[0].countryCode, null, 'the "unplaceable" city was placed after all');
  assert.deepEqual(empty.cities, [], 'the empty row is not empty');
  assert.deepEqual(empty.countryCodes, []);
  assert.equal(leafPaths(empty).includes('cities[].name'), false, 'an empty collection contributed a path');
  // **A-56 Part 6.** Both branches of the new pair are reached, and by name rather than by
  // whichever fixture happens to produce them: a city with days, and a city with none.
  assert.ok(
    ref.cities.some((c) => c.firstDay !== null && c.lastDay !== null),
    'no fixture reaches a NON-null firstDay, so the dated branch ships unexercised',
  );
  assert.equal(noDays.cities.length, 1, 'the no-days row lost its city');
  assert.equal(noDays.cities[0].firstDay, null, 'the fourth fixture no longer reaches firstDay: null');
  assert.equal(noDays.cities[0].lastDay, null);
  // …and it still carries the coordinate. "No days" is not "no city" (§8.4 A-56 Part 2).
  assert.deepEqual(noDays.cities[0].centre, { lat: 35.0116, lng: 135.7681 });
});

test('exit 6a: the count-shaped fields are exactly the eight — an assertion ABOUT the set, not the filter that decides it', () => {
  assert.deepEqual(
    ROW_PATHS.filter((p) => countShaped(p.split('.').pop() as string)).sort(),
    [...ROW_COUNT_FIELDS].sort(),
    'a count-shaped field was added to (or removed from) TripSummaryRow. A count may be stored ' +
      'only if it is a property of exactly one document, minted inside the write that carries ' +
      'that document and stamped with SUMMARY_VERSION (§8.4 A-31 Part 6).',
  );
  // `revision` and `summaryVersion` are numbers and are NOT counts. If the classifier ever
  // swallowed them, the list above would be satisfiable by a filter that eats everything.
  assert.equal(countShaped('revision'), false);
  assert.equal(countShaped('summaryVersion'), false);
  assert.ok(ROW_PATHS.includes('revision') && ROW_PATHS.includes('summaryVersion'));
});

/**
 * §8.4 **A-59** Part 3 — `TravelStats.unreadableCityDates` is **not** count-shaped under this
 * file's own classifier, so `SOURCE_ALLOW` gains no entry.
 *
 * Asserted rather than left to be read as an omission: a reviewer finding no allow-list line
 * for a new `TravelStats` number should be able to see *why* there isn't one, and a builder
 * should not helpfully add one. It ends in `Dates`, which is neither `PLURAL` nor `SHAPE` —
 * and it is a count of **defects absorbed on the read**, not of anything a traveller did.
 */
test('A-59 Part 3: `unreadableCityDates` is not count-shaped, so the allow-list stays as it is', () => {
  assert.equal(countShaped('unreadableCityDates'), false);
  // The classifier is not simply blind here: `unnamedCities` beside it IS caught and IS
  // allow-listed, so the negative above is a property of the name and not of the filter.
  assert.equal(countShaped('unnamedCities'), true);
  assert.ok('packages/core/src/derive/travelStats.ts::unnamedCities' in SOURCE_ALLOW);
  assert.equal('packages/core/src/derive/travelStats.ts::unreadableCityDates' in SOURCE_ALLOW, false);
});

// ===========================================================================
// (6b-1) The rows a REAL PORT actually holds, read back after a real write.
//
// This is the check with teeth: it asserts what is in the store, not what a file says.
// `packages/client/src/ports/memory.ts` is a real `StoragePort` and runs in plain Node, which
// is the whole reason §1.3 requires the client to be attackable there.
// ===========================================================================

const TODAY = '2026-06-15';
let seq = 0;
function ports(storage: MemoryStorage): Ports {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(`s${++seq}-`),
    scheduler: immediateScheduler(),
  };
}

function assertRowsAreClean(rows: readonly TripSummaryRow[], where: string): void {
  assert.ok(rows.length > 0, `INCONCLUSIVE: ${where} returned no rows`);
  for (const row of rows) {
    assert.deepEqual(
      Object.keys(row).sort(),
      Object.keys(ROW_KEYS).sort(),
      `${where}: a field reached the store that is not on TripSummaryRow. A number that ` +
        'summarises more than one trip has no storage representation at all (§8.4 A-33 6b-1).',
    );
    const extra = leafPaths(row).filter((p) => !ROW_PATHS.includes(p));
    assert.deepEqual(extra, [], `${where}: leaves reached the store that the type does not have`);
  }
}

test('exit 6b-1: the rows the store\'s own write path leaves in a real port are clean', async () => {
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage) });
  await store.createTrip({
    title: 'Written through the store',
    startDate: '2026-03-01',
    endDate: '2026-03-04',
    cities: [{ name: 'Vienna', order: 0 }],
  });
  await store.flush();
  assertRowsAreClean(await storage.listTrips(), 'the store write path');
});

test('exit 6b-1: the rows the RESCAN leaves in a real port are clean', async () => {
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage) });
  await store.createTrip({
    title: 'Rescanned',
    startDate: '2026-03-01',
    endDate: '2026-03-04',
    cities: [{ name: 'Split', order: 0 }],
  });
  await store.flush();
  // Knock the row back so the rescan has something to do, exactly as a pre-I-7 build left it.
  const before = await storage.listTrips();
  const stale = { ...before[0], summaryVersion: SUMMARY_VERSION - 1 };
  const stored = await storage.load(stale.id);
  assert.ok(stored, 'the document vanished');
  await storage.refreshSummary(stale.id, stored.version, stale as TripSummaryRow);
  const refreshCountBefore = storage.refreshCount;

  const reader = createStore({ ports: ports(storage) });
  await reader.refreshLibrary();
  await reader.rescanSummaries();
  assert.ok(storage.refreshCount > refreshCountBefore, 'INCONCLUSIVE: the rescan wrote nothing');
  const rows = await storage.listTrips();
  assert.equal(rows[0].summaryVersion, SUMMARY_VERSION, 'INCONCLUSIVE: the row was not brought current');
  assertRowsAreClean(rows, 'the rescan path');
});

test('exit 6b-1: the rows a DIRECT port call leaves are clean, for both mutating methods', async () => {
  const storage = memoryStorage();
  const trip = createTrip(
    {
      title: 'Straight at the port',
      startDate: '2026-03-01',
      endDate: '2026-03-04',
      homeCurrency: 'EUR',
      cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
    },
    { ids: sequentialIds('direct-'), now: TODAY },
  );
  const summary = tripSummary(trip, COUNTRY_INDEX);
  const saved = await storage.saveIfVersion(trip.id, null, JSON.stringify(trip), summary);
  assert.equal(saved.ok, true);
  assertRowsAreClean(await storage.listTrips(), 'saveIfVersion');

  const stored = await storage.load(trip.id);
  assert.ok(stored);
  const refreshed = await storage.refreshSummary(trip.id, stored.version, tripSummary(trip, COUNTRY_INDEX));
  assert.equal(refreshed.ok, true);
  assertRowsAreClean(await storage.listTrips(), 'refreshSummary');
});

// ===========================================================================
// (6b-1b) The WEB port, EXECUTED — `apps/web/src/ports/storage.ts`, in plain Node.
//
// **§8.4 A-36 (QA R29-1, MAJOR).** A-33 left this one port unexecuted — *"it is IndexedDB and
// does not run in Node"* — and stood 6b-2's source grep in its place. Round 29 defeated the grep
// with one line (**G1**), and the architect then measured that *no* static form of it works:
// take the fault one line further up (**G7**, `summary = { ...summary, … }`, the parameter
// reassigned in place) and the parameter is still named `summary`, the declaration is still
// there, the capture at both puts is still the bare identifier, and the site count is still 2 —
// every version of 6b-2, shipped or scoped, passes, while the port persists a 16-key record.
//
// > **A static check over an argument expression cannot see what happened to the binding before
// > the call.** The only checks that see all of these shapes are the ones that look at the value.
//
// So: the port runs here. It has **zero** runtime imports (both of its imports are `import type`
// and erase) and it reaches `indexedDB`, `crypto` and `btoa` off the global object at call time,
// so nothing has to be refactored for injection. It is loaded the way `qa/i7a-idb-rowkeys.mjs`
// already loads it — read the file, type-strip it, import it as a `data:` URL module — and
// **not** with a static `import`: the root `tsconfig.json` excludes `apps/web` on purpose, and a
// static import would make this gate depend on `@cairn/*` bare-specifier resolution from a
// project with no `paths`. Type-stripping erases the type imports and the question with them.
// ===========================================================================

/**
 * A **recorder for the IndexedDB API surface this one port uses** — not a database. A-33
 * residue 2 refused *"a second implementation of a database in order to test a two-line
 * property"* and A-36 Part 3 narrows that refusal rather than reversing it: no persistence, no
 * key ordering, no cursors, no index, no quota, no constraint checking, no `versionchange`
 * blocking. Its only obligations are that the port's methods run to completion and that every
 * value put or returned is observed verbatim.
 *
 * The one subtlety it must get right is the one the port depends on: **a request issued from a
 * previous request's `onsuccess` is still inside the transaction**, and `oncomplete` fires only
 * when nothing is pending. The `queueMicrotask(settle)` after each callback is that; it is why
 * `saveIfVersion`'s compare-then-put chain works here at all, and it must not be "simplified".
 *
 * Its own fidelity is pinned by the outcome assertions below, by the injected-fault matrix of
 * A-36 Part 5, and out of band by `qa/i7a-idb-rowkeys.mjs` in real Chromium (6b-4).
 *
 * **A-38 Part 4/5 (revision 27, QA R30-1): it takes a `Seed`.** A port's coverage is the set of
 * its **write paths**, not the set of its interface methods, and `ensureReady()`'s upcast is a
 * write path that only executes against a database that already holds records. So the recorder
 * can be handed a pre-existing database. The line, which is mechanical and a reviewer should
 * check it:
 *
 * > **The double may be given *state*. It may never be given *behaviour that depends on state*.**
 *
 * Seeding is `Map.set` into the `stores` map this already keeps, plus the initial value of the
 * `version` variable it already has — **confined to the constructor, additive only, and with no
 * `if` that reads a stored value**. It adds no method to the IndexedDB surface, no branch on
 * record content and no transformation of any value: every seeded value is handed back verbatim,
 * which is the recorder's one existing obligation. Nothing here knows what a "legacy record" is;
 * that knowledge stays in the port under test, and the *test* states the fixture.
 */
type Seed = {
  /** What the recorder reports as the already-installed database version. */
  dbVersion?: number;
  /** store name → (key → value), handed back verbatim. */
  stores?: Record<string, Record<string, unknown>>;
};

function recordingIdb(seed?: Seed) {
  const stores = new Map<string, Map<string, unknown>>();
  const at = (n: string) => { if (!stores.has(n)) stores.set(n, new Map()); return stores.get(n)!; };
  let version = 0;

  // --- A-38 Part 4: the seed. State, not behaviour. Nothing below this reads it. ---
  for (const [name, entries] of Object.entries(seed?.stores ?? {})) {
    const m = at(name);                                   // an empty seeded store still EXISTS
    for (const [key, value] of Object.entries(entries)) m.set(key, value);
  }
  version = seed?.dbVersion ?? 0;
  // ---------------------------------------------------------------------------------

  function makeTx(names: string[]) {
    let pending = 0, done = false;
    const tx: any = { error: null, oncomplete: null, onerror: null, onabort: null };
    const settle = () => { if (!done && pending === 0) { done = true; tx.oncomplete?.(); } };
    const request = (fn: () => unknown) => {
      const req: any = { result: undefined, error: null, onsuccess: null, onerror: null };
      pending++;
      queueMicrotask(() => {
        try { req.result = fn(); } catch (e) { req.error = e; }
        pending--;
        if (req.error) req.onerror?.(); else req.onsuccess?.();
        queueMicrotask(settle);          // a request issued from onsuccess keeps the tx alive
      });
      return req;
    };
    tx.objectStore = (name: string) => {
      if (!names.includes(name)) throw new Error(`store ${name} not in transaction scope`);
      const m = at(name);
      return {
        put: (v: unknown, k: string) => request(() => { m.set(k, v); return k; }),
        get: (k: string) => request(() => m.get(k)),
        getKey: (k: string) => request(() => (m.has(k) ? k : undefined)),
        getAll: () => request(() => [...m.values()]),
        getAllKeys: () => request(() => [...m.keys()]),
        delete: (k: string) => request(() => { m.delete(k); return undefined; }),
      };
    };
    return tx;
  }

  return {
    open(_name: string, want: number) {
      const req: any = { result: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      queueMicrotask(() => {
        req.result = {
          objectStoreNames: { contains: (n: string) => stores.has(n) },
          createObjectStore: (n: string) => at(n),
          deleteObjectStore: (n: string) => stores.delete(n),
          transaction: (n: string | string[]) => makeTx(Array.isArray(n) ? n : [n]),
          close: () => {},
        };
        if (version < want) { version = want; req.onupgradeneeded?.(); }   // once, like a real upgrade
        req.onsuccess?.();
      });
      return req;
    },
    _summaries: () => at('summaries'),
    /** §4.3 A-30's fence, so "`refreshSummary` moved no `StorageVersion`" is assertable. */
    _store: (name: string) => at(name),
    /**
     * **§10 A-57 Part 8.** Which stores EXIST, without creating one by asking — `_store` above
     * is `at()`, which mints on read, and the `DB_VERSION` 3 → 4 arm's whole assertion is that
     * `photos` and `photoThumbs` did **not** exist before `onupgradeneeded` ran and do after.
     */
    _names: () => [...stores.keys()].sort(),
  };
}

type Recording = ReturnType<typeof recordingIdb>;

/** The shipped file, type-stripped and evaluated. No static import — see the block above. */
async function loadWebPort(source?: string): Promise<() => StoragePort> {
  const raw = source ?? readFileSync(resolve(CAIRN, 'apps/web/src/ports/storage.ts'), 'utf8');
  const js = stripTypeScriptTypes(raw, { mode: 'strip' });
  const mod = (await import(`data:text/javascript,${encodeURIComponent(js)}`)) as {
    indexedDbStorage?: () => StoragePort;
  };
  assert.equal(typeof mod.indexedDbStorage, 'function', 'the web port\'s export shape moved');
  return mod.indexedDbStorage as () => StoragePort;
}

/**
 * Runs `fn` with a fresh recorder installed as the global `indexedDB` — which is where the port
 * reaches for it, at call time, so nothing needs injecting. `crypto.getRandomValues` and `btoa`
 * are Node globals already and are the real ones.
 *
 * **A-38 Part 3: every arm states its starting state**, which is `opts.seed`. `opts.beforeConstruct`
 * runs after the recorder exists and **before any port is constructed** — that is where Part 4's
 * seed-integrity assertion goes, and it is not optional for a seeded arm. `fn` is handed the
 * factory as well as an instance, so an arm can open a second instance over the same database.
 */
async function driveWebPort(
  fn: (port: StoragePort, db: Recording, make: () => StoragePort) => Promise<void>,
  opts: { source?: string; seed?: Seed; beforeConstruct?: (db: Recording) => void } = {},
): Promise<void> {
  const db = recordingIdb(opts.seed);
  const had = 'indexedDB' in globalThis;
  const prior = (globalThis as Record<string, unknown>).indexedDB;
  (globalThis as Record<string, unknown>).indexedDB = db;
  try {
    const make = await loadWebPort(opts.source);
    opts.beforeConstruct?.(db);
    await fn(make(), db, make);
  } finally {
    if (had) (globalThis as Record<string, unknown>).indexedDB = prior;
    else delete (globalThis as Record<string, unknown>).indexedDB;
  }
}

function webRow(id: string): { trip: Trip; summary: TripSummaryRow } {
  const trip = createTrip(
    {
      id,
      title: `Through the web port (${id})`,
      startDate: '2026-03-01',
      endDate: '2026-03-04',
      homeCurrency: 'EUR',
      cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
    },
    { ids: sequentialIds(`web-${id}-`), now: TODAY },
  );
  return { trip, summary: tripSummary(trip, COUNTRY_INDEX) };
}

const WEB_PORT = 'apps/web/src/ports/storage.ts';
const shippedPort = () => readFileSync(resolve(CAIRN, WEB_PORT), 'utf8');

/**
 * The shipped port with one or more string replacements applied, each asserted to have landed.
 * R29-4 and A-38 Part 7: **an injected fault that did not run is a failure, not a pass** — so
 * every anchor is checked, and *"the anchor no longer applies — re-derive it, do not delete it"*.
 */
function faultedPort(label: string, edits: Array<[string, string]>): string {
  const shipped = shippedPort();
  let out = shipped;
  for (const [from, to] of edits) {
    assert.ok(
      out.includes(from),
      `${label}: the anchor for this fault no longer applies — re-derive it, do not delete it`,
    );
    out = out.replace(from, to);
  }
  assert.notEqual(out, shipped, `${label}: the replacement changed nothing`);
  return out;
}

// ---------------------------------------------------------------------------
// A-38 Part 4 — the seed: a database the port did NOT create.
// ---------------------------------------------------------------------------

/**
 * A fixed literal, never minted: determinism (`cairn-constraints` §4), and it is what makes
 * *"the upcast did not move this record's fence"* assertable **by equality** rather than by
 * shape. A real `StorageVersion` is base64url of 16 CSPRNG bytes; this is the same alphabet.
 */
const SEEDED_FENCE = 'seededfence0000000000A';

/**
 * The port's own `DB_VERSION`, read out of the shipped source. Hard-coding `3` here would mean
 * that the day someone bumps it, the seeded database quietly becomes an *older* one, an upgrade
 * fires, and arm 2 stops being the "no upgrade needed" arm it says it is.
 */
function portDbVersion(): number {
  const m = /^const DB_VERSION = (\d+);$/m.exec(shippedPort());
  assert.ok(m, `${WEB_PORT}: DB_VERSION could not be read — the seeded arms cannot state a starting state`);
  return Number(m[1]);
}

/**
 * A record as it sits in a pre-existing database. `version: null` is the LEGACY shape.
 *
 * **A-39 Part 7 point 1 adds `gen`**, and it is required rather than defaulted on purpose: a
 * record whose generation is implicit is a record whose key set is asserted against whatever
 * the assertion happens to assume, which is the shape of every finding this arc has produced.
 *
 * **§10 A-57 Part 8 adds `d` and `b`, required for exactly the same reason.** A record whose
 * document generation and byte availability are implicit is a record that silently sits in
 * whatever state the fixture builder happened to produce — which is R31-1's own shape, one axis
 * over. `doc` is the serialized document as it sits in the store: for `d: 'v2'` it is
 * `JSON.stringify(trip)`, and for `d: 'v1'` it is that document **aged** by `ageDoc`.
 */
type SeedRecord = {
  trip: Trip;
  summary: TripSummaryRow;
  version: string | null;
  gen: GenEntry;
  d: DocGen;
  b: ByteState;
  doc: string;
  /** The `PhotoId`s this record's document references. `[]` for `b: 'none'`. */
  photoIds: readonly string[];
};

/**
 * **A-57 Part 8, Axis O.** A byte record no document references. Seeded into arm 2 and into no
 * other arm, which makes arm 3 the negative measurement for the sweep fault (G26) — *"a fault
 * that would be caught anyway proves nothing about the axis it was added for"* (A-39 Part 9).
 *
 * Its id cannot collide with a minted one: `coverTrip` mints through `sequentialIds`, so every
 * real `PhotoId` here is `<seed>-photo-N`.
 */
const ORPHAN_PHOTO_ID = 'photo-orphan-no-document-references-me';

/**
 * A whole starting state. **Minted through `createTrip`/`tripSummary`, never hand-typed** — a
 * literal row would go stale the next time the row is widened and would defeat the very key
 * assertion it is the subject of, and it is load-bearing at run time too (`listTrips()` sorts on
 * `startDate` and `title`, so a stub throws inside the port instead of failing an assertion).
 *
 * **§10.3's two byte stores are seeded here too**, from each record's own Axis-B state, and they
 * are named even when empty for the same reason `versions` always is: an empty store that EXISTS
 * is a different starting state from a store that does not, and `DB_VERSION` 4 creates both.
 */
function seededDb(records: readonly SeedRecord[], opts: { orphan?: boolean } = {}): Seed {
  const docs: Record<string, unknown> = {};
  const summaries: Record<string, unknown> = {};
  const versions: Record<string, unknown> = {};
  const photos: Record<string, unknown> = {};
  const photoThumbs: Record<string, unknown> = {};
  for (const r of records) {
    docs[r.trip.id] = r.doc;
    summaries[r.trip.id] = r.summary;
    if (r.version !== null) versions[r.trip.id] = r.version;
    // `b: 'missing'` seeds the reference and NOT the bytes — §10.2's designed state, reached the
    // way the platform reaches it (eviction, or an export/restore round trip that carries
    // metadata without bytes). `b: 'none'` has no reference to seed.
    if (r.b === 'present') {
      for (const id of r.photoIds) {
        photoThumbs[id] = photoBytes(id, 'thumb');
        photos[id] = photoBytes(id, 'display');
      }
    }
  }
  if (opts.orphan === true) {
    photoThumbs[ORPHAN_PHOTO_ID] = photoBytes(ORPHAN_PHOTO_ID, 'thumb');
    photos[ORPHAN_PHOTO_ID] = photoBytes(ORPHAN_PHOTO_ID, 'display');
  }
  // All five stores are named even when empty, so `versions: {}` is an EXISTING empty store
  // rather than an absent one — which is exactly the legacy database's shape.
  return { dbVersion: portDbVersion(), stores: { docs, summaries, versions, photos, photoThumbs } };
}

/**
 * **A seed record at Axis D `v2` and Axis B `none`** — a current document that references no
 * photo. It is what every fixture in this file was before I-13, and it is also the one cell the
 * 18-row covering table structurally cannot carry (§10 A-57 Part 8: `D = v1` implies `B = none`,
 * so all six `none` rows are v1), which is why arms 1, 4 and 5 are named as carrying it.
 *
 * It is a **named constructor, not a default**: `d` and `b` stay required on `SeedRecord` for
 * A-39 Part 7 point 1's reason, and a reader of any call site can still see which state the
 * fixture is in without going and looking.
 */
const currentDoc = (
  trip: Trip,
  summary: TripSummaryRow,
  version: string | null,
  gen: GenEntry,
): SeedRecord => ({ trip, summary, version, gen, d: 'v2', b: 'none', doc: JSON.stringify(trip), photoIds: [] });

/**
 * **A seed record at Axis D's `v1` and Axis B's `none`** — the only shape a database written by a
 * build older than I-13 can hold, and therefore the only shape arm 6 (the `DB_VERSION` 3 → 4
 * upgrade) can seed: `SCHEMA_VERSION` went to 2 and `DB_VERSION` went to 4 **in the same commit**,
 * so a version-3 database predates `Trip.photos` as well as the two byte stores.
 */
const legacyDoc = (
  trip: Trip,
  summary: TripSummaryRow,
  version: string | null,
  gen: GenEntry,
): SeedRecord => ({ trip, summary, version, gen, d: 'v1', b: 'none', doc: ageDoc(trip), photoIds: [] });

/**
 * **A-38 Part 4's seed-integrity assertion, and it is not optional.** A mis-spelled store name
 * silently yields an *empty* database, at which point arms 2–4 degrade back into arm 1 and
 * report green — which is R30-1, re-created inside the fix for R30-1, with the same signature.
 * The before/after pair on the summary record's key set is also what makes a red attributable:
 * clean before, widened after, therefore **the port** did it.
 */
function assertSeedLanded(
  db: Recording,
  records: readonly SeedRecord[],
  where: string,
  opts: { orphan?: boolean } = {},
): void {
  const ids = records.map((r) => r.trip.id).sort();
  const versioned = records.filter((r) => r.version !== null).map((r) => r.trip.id).sort();
  assert.ok(ids.length > 0, `${where}: INCONCLUSIVE — an empty seed is arm 1 wearing arm 2's name`);
  assert.deepEqual([...db._store('docs').keys()].sort(), ids, `${where}: the docs seed did not land`);
  assert.deepEqual([...db._store('summaries').keys()].sort(), ids, `${where}: the summaries seed did not land`);
  assert.deepEqual([...db._store('versions').keys()].sort(), versioned, `${where}: the versions seed did not land`);
  // **§10 A-57 Part 8.** The same integrity check, one axis at a time, over the state I-13 added.
  // Without these the two new axes degrade silently exactly as Axis S did at R31-1: a document
  // that is not really v1, or a `missing` record whose bytes are actually there, reports green
  // while covering nothing.
  for (const r of records) {
    const stored = db._store('docs').get(r.trip.id);
    assert.equal(stored, r.doc, `${where}: the seeded document for ${r.trip.id} is not the one the record names`);
    let parsed: { schemaVersion?: unknown; photos?: unknown } = {};
    try { parsed = JSON.parse(String(stored)) as typeof parsed; } catch { assert.fail(`${where}: the seeded document for ${r.trip.id} is not JSON`); }
    assert.equal(
      parsed.schemaVersion,
      r.d === 'v1' ? 1 : SCHEMA_VERSION,
      `${where}: ${r.trip.id} claims Axis D = ${r.d} and its seeded document does not say so`,
    );
    assert.equal(
      'photos' in parsed,
      r.d === 'v2',
      `${where}: ${r.trip.id} (${r.d}) — a v1 document carries NO \`photos\` key at all, which is ` +
        'the whole difference between the two generations and the reason a v1 record can only be ' +
        'Axis B `none` (§10 A-57 Part 8)',
    );
    assert.equal(
      r.photoIds.length > 0,
      r.b !== 'none',
      `${where}: ${r.trip.id} claims Axis B = ${r.b} but references ${r.photoIds.length} photo(s)`,
    );
    for (const photoId of r.photoIds) {
      assert.equal(
        db._store('photoThumbs').has(photoId),
        r.b === 'present',
        `${where}: ${r.trip.id} claims Axis B = ${r.b} and its byte records say otherwise. A ` +
          '`missing` fixture whose bytes are actually there covers nothing, and a `present` one ' +
          'whose bytes are absent is the same failure inverted.',
      );
      assert.equal(db._store('photos').has(photoId), r.b === 'present', `${where}: ${r.trip.id} — the two byte stores disagree, which \`write\`'s one transaction makes unreachable`);
    }
  }
  // Axis O, before the port runs: an orphan that did not land degrades the sweep fault into a
  // no-op that reports green, which is A-38 Part 4's whole argument one store over.
  assert.equal(
    db._store('photoThumbs').has(ORPHAN_PHOTO_ID),
    opts.orphan === true,
    `${where}: the ORPHANED byte record ${opts.orphan === true ? 'did not land' : 'is present in an arm that states it has none'} — Axis O is not in the state this arm names`,
  );
  // **A-39 Part 7 point 1.** Aged rows are, correctly, not `ROW_KEYS`-shaped, so this stops
  // asserting `ROW_KEYS` uniformly and asserts **each record's own generation's** key set,
  // computed from the ledger. Same purpose, same failure mode caught, one level more precise.
  // **QA R32-1:** and at BOTH levels — the generations differ inside `cities[]` too.
  for (const r of records) {
    const row = db._store('summaries').get(r.trip.id);
    assert.ok(row, `${where}: no seeded row for ${r.trip.id}`);
    assertGenerationShape(
      row as TripSummaryRow,
      r.gen,
      `${where}: the seeded row for ${r.trip.id} is not shaped like its own generation ` +
        `(${r.gen.name}) BEFORE the port runs, so a widening found afterwards could not be ` +
        'attributed to the port',
    );
  }
}

// ===========================================================================
// **§8.4 A-39 (revision 28, QA R31-1, MAJOR)** — the FINITE COVERING SET.
//
// A-38 Part 7 stated the gate's property as a **universal quantifier over faults**, discharged
// by an **existential list of fixtures**. A claim of that form can never be closed: for any
// finite fixture list a reader can construct a guard that reads a field none of them varies,
// and each such construction is a legitimate finding under the sentence's own terms. Three
// rounds produced three such axes (R29-1: the mechanism was a grep; R30-1: the fixtures were
// all empty; R31-1: the fixtures were all *current*).
//
// > **A-39's ruling: the quantifier moves from *faults* to *readable state*.** A fault confined
// > to `ensureReady()` can be conditional only on data `ensureReady()` can READ — which, after
// > `open()` resolves, is exactly *the contents of the three object stores* (`db.version`,
// > `db.objectStoreNames` and the module constants are all constant at that point). That is
// > finite, committed and versioned, so it can be enumerated; the faults cannot.
//
// **§10 A-57 Part 8 (revision 40, ROADMAP I-13) RE-DERIVES A-39 Part 3's table**, because I-13
// fired A-39 Part 11 on two of its seven items at once:
//
//   - **item 2** — `SCHEMA_VERSION` went **1 → 2** (`Trip.photos`, A-57 Part 5). *"Axis D stops
//     being degenerate. Note the cost is zero new rows"* — a domain-2 factor is absorbed into
//     18 exactly as V is.
//   - **item 4** — the port's database gained **two object stores**, `photos` and `photoThumbs`
//     (§10.3), at `DB_VERSION` 3 → 4. *"A genuinely new axis; Part 3's table is re-derived."*
//
// **The re-derivation, over the port as it is shipped today.** After `open()` resolves,
// `db.version` is always `DB_VERSION` and `db.objectStoreNames` is always exactly
// `{docs, summaries, versions, photos, photoThumbs}` — `onupgradeneeded` creates every missing
// store unconditionally and deletes `meta`, so both are still **constants and not axes**, for
// A-39 Part 3's own reason. What moved is the last row of that table: the variable domain is now
// *"the contents of the **five** object stores"*, and the two new ones hold `ArrayBuffer`s keyed
// by `PhotoId` whose only guard-visible property is **whether a key is there**. (A guard on a
// derivative's `byteLength` is excluded on A-39 Part 4's reachability rule: `derive` never
// produces an empty buffer and no shipped write path stores one, so there is no size cell a real
// deployed database can be in that `present` does not already cover.)
//
// Seven axes, then — five of A-39's, with D no longer degenerate, plus two:
//
//   **V** envelope-version presence      {present, absent}                             domain 2
//   **S** summary-row generation   {gen-1 … gen-5, gen-future}  domain 6  (5 until A-56/I-12)
//   **C** row content                    {rich, degenerate, unattributed}               domain 3
//   **D** document generation            {v1, v2} — **was domain 1 until I-13**         domain 2
//   **B** photo-byte availability, per record  {none, present, missing}   **new at I-13** domain 3
//   **N** loop population                {0, ≥1 uniform, ≥2 spanning both V}            domain 3
//   **O** orphaned byte records, per DATABASE  {clean, orphaned}          **new at I-13** domain 2
//
// The cover is **pairwise over {V, S, C, D, B}** and structural over N, O and P (fixture
// provenance). O is not in the table for the same reason N is not: it is a property of the
// *run*, not of a record — an orphan is a byte record **no document references**, so it belongs
// to no id in the table. Arm 2 carries one and arm 3 carries none, which is also A-39 Part 9's
// required negative measurement for the sweep fault (G26) rather than an accident.
//
// The lower bound on a pairwise covering array is the product of the two largest domains —
// `|S| × |C| = |S| × |B| = 6 × 3 = 18` — and the table below still achieves it, so **18 is
// minimal, and the two new axes cost ZERO new rows**. 3-wise is refused on the record (A-39
// Part 5): a fault requiring three simultaneous state conditions is not a single edit and has no
// instance among the twenty-one faults in the matrix.
//
// **One pair is not reachable, and it is stated rather than discovered.** `D = v1` **implies**
// `B = none`: a v1 document has no `photos` key at all, so it references no `PhotoId` and its
// byte availability cannot be anything else. Full `B × S` coverage puts exactly one `B = none`
// row in each generation, and full `D × S` coverage then forces every one of those six rows to
// be the generation's `D = v1` row — so **`(D = v2, B = none)` cannot appear in an 18-row
// table.** It is not left uncovered: it is the starting state of **arms 1, 4 and 5**, whose
// documents are current and photoless, and the count test below asserts that rather than
// waiving it.
//
// **What reopens this** (A-39 Part 11): a `SUMMARY_VERSION` bump (→ 3 more rows; fired once
// already, at A-56/I-12, which is what took this table from 15 to 18), a `SCHEMA_VERSION`
// bump (no new rows, D absorbed — **fired at I-13**), `DatePrecision`/`countrySource` gaining a
// member (→ +6), a new object store (**fired at I-13**), a new `StoragePort`, a fourth write
// path, or `onupgradeneeded` growing a body that writes records. **What does NOT**: *"here is
// one more fault shape whose guard reads a field already on V, S, C, D, B, N or O."* If such a
// fault is green, the covering set has been IMPLEMENTED wrongly — a table row is missing, a
// fixture has rotted into another state, or an assertion is not per-id — and that is a
// **builder** finding against the table below, with the table itself as the oracle.
// ===========================================================================

/** Axis S's six states, in ledger order. **Five until A-56 (I-12) fired Part 11 item 1.** */
type GenName = 'gen-1' | 'gen-2' | 'gen-3' | 'gen-4' | 'gen-5' | 'gen-future';

type GenEntry = {
  name: GenName;
  /** What `summaryVersion` holds — or `null` when the generation has no such KEY at all. */
  version: number | null;
  /** The TOP-LEVEL keys this generation did not carry. */
  absent: readonly string[];
  /** The keys absent from every `cities[]` entry of this generation. */
  absentInCity: readonly string[];
};

/**
 * **The generation ledger.** One entry per shipped `SUMMARY_VERSION`, transcribed from
 * `SUMMARY_VERSION`'s own docstring in `packages/core/src/derive/summary.ts` — which is the
 * ledger this file mirrors, and the only place a new generation is described.
 *
 * The generations differ in **key set**, not only in the number, and A-39 Part 4 is explicit
 * about why that is load-bearing: a guard of the form `if (!('attribution' in r))` — *"this row
 * predates the census, bring it current"* — is **invisible** to a row that was aged by setting a
 * number and nothing else. A version-only aged fixture would have re-created R31-1 inside the
 * fix for R31-1. That is fault **G17**, and it is here to prove this sentence rather than assert
 * it.
 */
const LEDGER: readonly GenEntry[] = [
  // 1 — Phase 1 / Phase 2a. No `countryCodes`, no `cities`, no `attribution`, and no
  //     `summaryVersion` KEY AT ALL, which is what `needsRescan`'s `?? 0` exists for and is a
  //     distinct state from any number.
  { name: 'gen-1', version: null, absent: ['summaryVersion', 'countryCodes', 'cities', 'attribution'], absentInCity: [] },
  // 2 — Phase 2 I-6: `countryCodes`, `cities` and `summaryVersion` arrive; `countrySource` and
  //     `attribution` do not.
  { name: 'gen-2', version: 2, absent: ['attribution'], absentInCity: ['countrySource'] },
  // 3 — Phase 2 I-6a (A-29): `cities[]` gains `countrySource`. Still no `attribution`.
  { name: 'gen-3', version: 3, absent: ['attribution'], absentInCity: [] },
  // 4 — Phase 2 I-7 (A-31): the row gains `attribution`. `cities[]` still carries no
  //     coordinate and no dates.
  { name: 'gen-4', version: 4, absent: [], absentInCity: ['centre', 'firstDay', 'lastDay'] },
  // 5 — Phase 2 I-12 (A-56): `cities[]` gains `centre`, `firstDay` and `lastDay`. No new
  //     TOP-LEVEL key, which is why `absent` is empty and the whole widening is nested.
  //     Current.
  { name: 'gen-5', version: 5, absent: [], absentInCity: [] },
];

/**
 * Above current, and **not a ledger entry**: a second tab on a newer deploy wrote it. That is
 * the same two-writer scenario §2.2a's whole fence exists for, so refusing it here would be
 * inconsistent with the rest of the design.
 *
 * It is version-only, and that is A-39 Part 12 residue 1, disclosed rather than buried: a future
 * generation's *extra* keys cannot be written down today, so a fault guarded on a key that
 * generation will add is not covered. It is permanent and irreducible, and it is fired the day
 * that generation ships — at which point it stops being the future and becomes a shape-faithful
 * ledger entry (Part 11 item 1).
 */
const GEN_FUTURE: GenEntry = { name: 'gen-future', version: SUMMARY_VERSION + 1, absent: [], absentInCity: [] };

const GENERATIONS: readonly GenEntry[] = [...LEDGER, GEN_FUTURE];

function generation(name: GenName): GenEntry {
  const found = GENERATIONS.find((g) => g.name === name);
  assert.ok(found, `no generation named ${name} — the covering table names a state the ledger does not have`);
  return found;
}

/** The current generation, by the ledger rather than by position-in-a-comment. */
const CURRENT_GEN = generation('gen-5');

/** A generation's top-level key set: `ROW_KEYS` minus that generation's own removals. */
function expectedKeys(gen: GenEntry): string[] {
  return Object.keys(ROW_KEYS).filter((k) => !gen.absent.includes(k)).sort();
}

/**
 * The keys one minted `cities[]` entry carries — derived from `ROW_PATHS`, which is the single
 * source this file already has for the row's leaves, and **never a second hand-written list**
 * (the reason A-39 Part 6 pin 3 checks the ledger's arithmetic against `ROW_KEYS` rather than
 * against a copy of it).
 *
 * **A-56.** `cities[].centre` is an OBJECT, so `ROW_PATHS` carries its two leaves
 * (`centre.lat`, `centre.lng`) and not the key itself. `Object.keys(city)` answers `centre`, so
 * the derivation takes the **first segment** after the prefix and de-duplicates — which keeps
 * the single-source property while surviving a nested field. A `.split('.')[0]` and nothing
 * more: if a future entry nests two levels, this still names the key the entry actually has.
 */
const CITY_KEYS: readonly string[] = [
  ...new Set(
    ROW_PATHS
      .filter((p) => p.startsWith('cities[].'))
      .map((p) => p.slice('cities[].'.length).split('.')[0]),
  ),
].sort();

/** A generation's `cities[]`-entry key set: `CITY_KEYS` minus that generation's NESTED removals. */
function expectedCityKeys(gen: GenEntry): string[] {
  return CITY_KEYS.filter((k) => !gen.absentInCity.includes(k)).sort();
}

/**
 * **QA R32-1 (MAJOR).** A generation is defined by its **key set**, and A-39 Part 4 defines
 * gen-2's difference from gen-3 one level down: *"gen-2 has no `countrySource` inside
 * `cities[]`"*. `LEDGER` encodes that (`absentInCity`) and `ageRow` genuinely produces it — and
 * then, before this fix, nothing checked it again: both per-id assertions compared
 * `Object.keys(row)` against `expectedKeys(gen)`, which is built from `gen.absent` alone, so a
 * widening that filled in `cities[].countrySource` on a gen-2 row was **invisible on both
 * seeded arms** while its top-level twin was red. The `ROW_PATHS` backstop cannot help: a
 * *restored* nested key is a path the type legitimately has.
 *
 * So the key-set comparison runs at **both levels**: the row's own keys against the
 * generation's, and then every `cities[]` entry's keys against the generation's nested key set.
 * A generation with no `cities` key at all (gen-1) has nothing below to walk, which the ledger
 * says rather than this function assuming it.
 */
function assertGenerationShape(row: TripSummaryRow, gen: GenEntry, where: string): void {
  assert.deepEqual(Object.keys(row).sort(), expectedKeys(gen), where);
  if (gen.absent.includes('cities')) return; // gen-1 carries no `cities` KEY AT ALL.
  const cities = (row as { cities?: unknown }).cities;
  assert.ok(Array.isArray(cities), `${where} — the row has no cities[] to walk, but ${gen.name} carries one`);
  const want = expectedCityKeys(gen);
  cities.forEach((city, i) => {
    assert.deepEqual(
      Object.keys(city as object).sort(),
      want,
      `${where} — one level down: cities[${i}]. A key outside ${gen.name}'s own NESTED key set ` +
        'appeared inside a cities[] entry (§8.4 A-39 Part 4\'s shape-faithfulness sub-ruling, QA R32-1).',
    );
  });
}

/**
 * **A-38 Part 4's *"never a hand-typed row literal"* rule, and A-39 Part 6's one bounded
 * exception to it.** A-38's rule is right — a literal goes stale the next time the row is
 * widened and defeats the key assertion it is the subject of — but Axis S needs rows that are
 * *deliberately* not current. So the rule gains exactly one exception, drawn so its reason
 * survives:
 *
 * > **A fixture row is minted through `createTrip` + `tripSummary` and may then be *aged* by a
 * > single helper that only ever DELETES KEYS and SETS `summaryVersion`. It may never add a key
 * > and never write any other field's value.**
 *
 * **The reviewer's check, in one line:** the body below contains no assignment other than to
 * `summaryVersion`, and no key literal that is not also in the ledger. Anything else here — a
 * defaulted field, a rewritten count, a "helpful" normalisation — has turned a fixture into a
 * migration and this whole gate back into a fixture list nobody can reason about. Do not let
 * this grow into a general-purpose row mutator.
 */
function ageRow(fresh: TripSummaryRow, gen: GenEntry): TripSummaryRow {
  const row = structuredClone(fresh) as Record<string, unknown>;
  for (const key of gen.absent) delete row[key];
  for (const city of (row.cities ?? []) as Array<Record<string, unknown>>) {
    for (const key of gen.absentInCity) delete city[key];
  }
  if (gen.version !== null) row.summaryVersion = gen.version;
  return row as unknown as TripSummaryRow;
}

// ---------------------------------------------------------------------------
// **Axis D — document generation. §10 A-57 Part 8 / A-39 Part 11 item 2.**
//
// A-39 recorded this axis as **degenerate, domain 1**: *"`SCHEMA_VERSION` is 1 … every deployed
// document is v1, so there is nothing to vary and no cell to cover."* I-13 took it to **2**
// (A-57 Part 5 — `photos` is *records*, and an older build that silently dropped them would
// delete the user's attachments and orphan megabytes it cannot see), so the axis is live and
// **costs zero new rows**, absorbed into the existing 18 exactly as V is.
//
// Its two states are reachable in the plainest possible way: every database Jacob has today
// holds v1 documents, and every one written after I-13 holds v2 ones. A page load after the
// update walks both.
// ---------------------------------------------------------------------------

type DocGen = 'v1' | 'v2';

/**
 * **The document ager, and it is `ageRow`'s rule one record class over.** A v1 document is the
 * current one with the `photos` key **removed** and `schemaVersion` set to 1 — nothing else, no
 * added key, no rewritten value. That is not a guess: it is `serialize/migrate.ts`'s own
 * `v1ToV2`, read backwards (*"the document gains `photos`"*), and the pin below drives the
 * fixture through `migrateDoc` to prove the two agree rather than asserting that they do.
 *
 * **The reviewer's check, in one line:** the body deletes exactly one key and assigns exactly one
 * field. Anything else here has turned a fixture into a migration, which is the failure A-39
 * Part 6 spends a paragraph forbidding for rows.
 */
function ageDoc(trip: Trip): string {
  const doc = JSON.parse(JSON.stringify(trip)) as Record<string, unknown>;
  delete doc.photos;
  doc.schemaVersion = 1;
  return JSON.stringify(doc);
}

const docFor = (trip: Trip, d: DocGen): string => (d === 'v1' ? ageDoc(trip) : JSON.stringify(trip));

// ---------------------------------------------------------------------------
// **Axis B — photo-byte availability, per record. §10 A-57 Part 8 / A-39 Part 11 item 4.**
//
// The two stores §10.3 adds hold a bare `ArrayBuffer` keyed by `PhotoId`, and the only thing a
// guard can distinguish about one is **whether the key is there** — so the axis is the join
// between what a document references and what the byte stores hold:
//
//   `none`     the document references no photo. Every pre-I-13 database, and most trips.
//   `present`  every referenced id has its bytes. The ordinary state after an import.
//   `missing`  a referenced id has no bytes. **§10.2 calls this a DESIGNED state, not an error
//              path** — Safari evicts script-created storage under pressure and under ITP's
//              non-interaction rule, and an export/restore round trip carries metadata without
//              bytes. A covering set that could not reach it would be covering the happy path.
//
// A byte record's *size* is not a fourth state: `derive` never produces an empty buffer and no
// shipped write path stores one, so A-39 Part 4's admission rule — *"a real deployed database
// can actually be in it"* — excludes it.
// ---------------------------------------------------------------------------

type ByteState = 'none' | 'present' | 'missing';
const BYTE_STATES: readonly ByteState[] = ['none', 'present', 'missing'];

/**
 * A stored derivative. Deterministic and tiny: the assertions are about **which keys are there
 * and that nothing rewrote them**, never about pixels, and a megabyte per fixture would buy the
 * gate nothing. `ArrayBuffer` is what §10.3 stores and what `indexedDbPhotoBytes` writes.
 */
function photoBytes(id: string, size: 'thumb' | 'display'): ArrayBuffer {
  const tag = `${size}:${id}`;
  const out = new Uint8Array(tag.length);
  for (let i = 0; i < tag.length; i++) out[i] = tag.charCodeAt(i) & 0xff;
  return out.buffer;
}

/**
 * A content fixture that also sits on Axis B. **`contentTrip` is untouched** — it is pinned by
 * its own three fixture tests and by A-39 Part 6's reasoning, and a photo is not part of what
 * makes a trip `rich`, `degenerate` or `unattributed`.
 *
 * The photo is minted through core's own `addPhoto` (no hand-typed asset), and then the trip is
 * round-tripped through the serializer with `revision` **restored to what it was**. That is not
 * a convenience: `addPhoto` bumps `revision`, and `revision: 0` is Axis C's zero cell for the
 * `degenerate` fixture — a photo that quietly took it to 1 would delete a covered cell to add
 * one. The restore uses exactly the path `contentTrip`'s own `degenerate` arm documents and QA
 * R32-2 measured: `importDoc` reads `revision` verbatim and never touches it, so a restored
 * export genuinely persists the revision it carried.
 *
 * `at` and `capturedAt` are **null** on purpose. §10.5's cross-cutting rule is *"no coordinate in
 * any log line, ever"*, and a fixture is the cheapest place to break it by accident.
 */
function coverTrip(content: ContentName, id: string, b: ByteState): Trip {
  const base = contentTrip(content, id);
  if (b === 'none') return base;
  const withPhoto = addPhoto(
    base,
    {
      caption: '',
      at: null,
      capturedAt: null,
      thumb: { w: 320, h: 240, bytes: 8_192 },
      display: { w: 1600, h: 1200, bytes: 131_072 },
    },
    buildCtx(id),
  );
  const doc = JSON.parse(toJSON(withPhoto)) as Record<string, unknown>;
  doc.revision = base.revision;
  return fromJSON(JSON.stringify(doc));
}

const photoIdsOf = (trip: Trip): string[] => trip.photos.map((p) => p.id);

// ---------------------------------------------------------------------------
// Axis C — the three representatives. A-39 Part 4: every count- and collection-shaped field of
// the row is a function of the underlying trip document, so a single fixture choice sets all of
// them at once, and three fixtures are chosen so their union covers both cells of every count
// field and every value of both enums (`datePrecision` ∈ 3, `cities[].countrySource` ∈ 3).
//
// `DatePrecision` gaining a fourth value gives Axis C a fourth state — that is a named trigger
// in A-39 Part 11 item 3, not something this file can absorb.
// ---------------------------------------------------------------------------

type ContentName = 'rich' | 'degenerate' | 'unattributed';
const CONTENTS: readonly ContentName[] = ['rich', 'degenerate', 'unattributed'];

/**
 * Deep in the South Atlantic: a real coordinate the country index has nothing for, which is the
 * same one `nullCountryRow()` above already relies on. A-26 ruled that `null` is the *correct*
 * answer for a landform the dataset does not carry, so this is a supported state and not a hole.
 */
const UNPLACEABLE = { lat: -40.5, lng: -20.5 };
/** Vienna, which the index does resolve. */
const PLACEABLE = { lat: 48.2082, lng: 16.3738 };

const buildCtx = (id: string): BuildCtx => ({ ids: sequentialIds(`${id}-`), now: TODAY });

function contentTrip(content: ContentName, id: string): Trip {
  const ctx = buildCtx(id);
  if (content === 'degenerate') {
    // A bare trip: no city, no place, no stop, no pool entry, `revision: 0`. `dayCount` is NOT
    // zero and cannot be — `ensureDays` mints at least one `Day` for any valid range, so no
    // storable document has zero days (A-39 Part 4, recorded so it is not mistaken for a gap).
    const minted = createTrip(
      { id, title: `degenerate (${id})`, startDate: '2024-05-01', endDate: '2024-05-02', homeCurrency: 'EUR', datePrecision: 'month' },
      ctx,
    );
    // **QA R32-2, and it is a REACHABILITY fact, not a fixture convenience.** `revision: 0` is
    // Axis C's zero cell for `revision`, and a previous pass dropped it as unreachable on the
    // ground that `createTrip` ends in `ensureDays`, which bumps `revision` to 1. That checks
    // the wrong thing: A-39 Part 4's admission rule is *"a real deployed DATABASE can actually
    // be in it"*, and `createTrip` is not the only write path into the database. `importDoc`
    // (`packages/client/src/store/store.ts`) is the second — it takes a document from
    // `fromJSON`, adopts an absent `ownerId` and saves — and it **never touches `revision`**,
    // while `fromJSON` reads `revision` verbatim with no floor. Backup/restore of the user's
    // own export is a shipped feature, so importing an export whose `revision` is 0 persists a
    // summary row with `revision: 0`. Measured, no fault injected: `qa/r32-revision0.mjs`.
    //
    // So the fixture reaches the cell the way production does — a minted document, round-
    // tripped through core's own serializer with the field the import path leaves alone. Still
    // minted through `createTrip`, still no hand-typed row literal, and **nothing here for
    // `ageRow` to write**: A-39 Part 6's *"only ever deletes keys and sets `summaryVersion`"*
    // rule is about the AGER, and it is untouched. This is the content fixture's own business.
    const doc = JSON.parse(toJSON(minted)) as Record<string, unknown>;
    doc.revision = 0;
    return fromJSON(JSON.stringify(doc));
  }
  if (content === 'unattributed') {
    // The cell neither of the other two produces: `located > 0` AND `attributed === 0`, on both
    // census classes. This is the state §8.4 clause 2's `unattributed` exists for, and
    // *"this row has an unattributed hole, recompute it"* is as natural a guard as staleness.
    let trip = createTrip(
      {
        id, title: `unattributed (${id})`, startDate: '2024-07-01', endDate: '2024-07-02',
        homeCurrency: 'EUR', datePrecision: 'year',
        // No stated `countryCode`, so `countrySource` stays null as well as `countryCode`.
        cities: [{ key: 'nowhere', name: 'Nowhere', centre: UNPLACEABLE }],
      },
      ctx,
    );
    trip = addPlace(trip, {
      id: `${id}-place`, cityKey: 'nowhere', name: 'A pin in the ocean', at: UNPLACEABLE, category: 'sight',
    });
    trip = addStop(
      trip,
      { kind: 'scheduled', dayId: trip.days[0].id, time: '09:00', order: 0 },
      { name: 'Standing on water', category: 'sight', place: { kind: 'inline', at: UNPLACEABLE } },
      ctx,
    );
    return trip;
  }
  // rich — countries attributed, cities, days, stops, a pool, `revision > 0`,
  // `datePrecision: 'exact'`, and `cities[]` carrying BOTH `countrySource` values.
  let trip = createTrip(
    {
      id, title: `rich (${id})`, startDate: '2026-03-01', endDate: '2026-03-04',
      homeCurrency: 'EUR', datePrecision: 'exact',
      cities: [
        // The coordinate answers → `countrySource: 'coordinate'`.
        { key: 'vienna', name: 'Vienna', centre: PLACEABLE },
        // The coordinate is silent and the stated code passes A-29's gate → `'stated'`.
        { key: 'atlantis', name: 'Atlantis', centre: UNPLACEABLE, countryCode: 'HR' },
      ],
    },
    ctx,
  );
  trip = addPlace(trip, {
    id: `${id}-place`, cityKey: 'vienna', name: 'Stephansdom', at: { lat: 48.2085, lng: 16.3735 }, category: 'sight',
  });
  trip = addStop(
    trip,
    { kind: 'scheduled', dayId: trip.days[0].id, time: '09:00', order: 0 },
    { name: 'Coffee', category: 'food', place: { kind: 'inline', at: { lat: 48.21, lng: 16.37 } } },
    ctx,
  );
  trip = addStop(
    trip,
    { kind: 'pool', cityKey: 'vienna' },
    { name: 'Maybe the Prater', category: 'sight', place: { kind: 'inline', at: { lat: 48.2166, lng: 16.3966 } } },
    ctx,
  );
  return trip;
}

const contentRow = (content: ContentName, id: string): TripSummaryRow =>
  tripSummary(contentTrip(content, id), COUNTRY_INDEX);

// ---------------------------------------------------------------------------
// **A-39 Part 5 — the covering table.** 6 summary-row generations × 3 row-content
// representatives = 18 `S×C` pairs, each carrying a `V` value chosen so that every generation
// carries both V values (12 `V×S` pairs) and every content class carries both (6 `V×C` pairs).
//
// **15 → 18 at §8.4 A-56 (ROADMAP I-12).** A-39 Part 11 item 1 fires by construction the moment
// `SUMMARY_VERSION` moves — *"axis S gains a state; the ledger gains an entry; the table goes
// 15 → 18 (three C-values against the new generation)"* — and Part 6's pin 1 below is what
// stops it being forgotten. The lower bound is still `|S| × |C|`, now `6 × 3 = 18`, and the
// table achieves it, so **18 is minimal, not chosen**.
//
// This is DATA, not eighteen near-duplicate test bodies, and the test below asserts those three
// counts **from the table itself** — so a row deleted or duplicated during maintenance fails
// loudly rather than silently shrinking the cover.
// ---------------------------------------------------------------------------

type CoverCell = {
  n: number;
  s: GenName;
  c: ContentName;
  v: 'present' | 'absent';
  /** **§10 A-57 Part 8.** Axis D, live since `SCHEMA_VERSION` went to 2. */
  d: DocGen;
  /** **§10 A-57 Part 8.** Axis B, live since §10.3's two byte stores. */
  b: ByteState;
  arm: 2 | 3;
};

/**
 * **The `d`/`b` columns are a LATIN SQUARE over the existing rows, not extra rows.**
 * `b = BYTE_STATES[(generationIndex + contentIndex) mod 3]`, which puts all three byte states in
 * every generation (18 `B×S` pairs) and in every content class (9 `B×C` pairs) using the 18 rows
 * the table already had. `d` is then forced: `v1` on exactly the `b: 'none'` rows, because a v1
 * document has no `photos` key and can reference nothing — one per generation, which is what
 * gives all 12 `D×S` pairs.
 */
const COVERING_SET: readonly CoverCell[] = [
  { n: 1,  s: 'gen-1',      c: 'rich',         v: 'present', d: 'v1', b: 'none',    arm: 2 },
  { n: 2,  s: 'gen-1',      c: 'degenerate',   v: 'absent',  d: 'v2', b: 'present', arm: 3 },
  { n: 3,  s: 'gen-1',      c: 'unattributed', v: 'present', d: 'v2', b: 'missing', arm: 2 },
  { n: 4,  s: 'gen-2',      c: 'rich',         v: 'absent',  d: 'v2', b: 'present', arm: 3 },
  { n: 5,  s: 'gen-2',      c: 'degenerate',   v: 'present', d: 'v2', b: 'missing', arm: 2 },
  { n: 6,  s: 'gen-2',      c: 'unattributed', v: 'absent',  d: 'v1', b: 'none',    arm: 3 },
  { n: 7,  s: 'gen-3',      c: 'rich',         v: 'present', d: 'v2', b: 'missing', arm: 2 },
  { n: 8,  s: 'gen-3',      c: 'degenerate',   v: 'absent',  d: 'v1', b: 'none',    arm: 3 },
  { n: 9,  s: 'gen-3',      c: 'unattributed', v: 'present', d: 'v2', b: 'present', arm: 2 },
  { n: 10, s: 'gen-4',      c: 'rich',         v: 'absent',  d: 'v1', b: 'none',    arm: 3 },
  { n: 11, s: 'gen-4',      c: 'degenerate',   v: 'present', d: 'v2', b: 'present', arm: 2 },
  { n: 12, s: 'gen-4',      c: 'unattributed', v: 'absent',  d: 'v2', b: 'missing', arm: 3 },
  // A-56's three new rows, in ledger position rather than appended, so the table reads in the
  // same order as `LEDGER` and `gen-future` stays last.
  { n: 13, s: 'gen-5',      c: 'rich',         v: 'present', d: 'v2', b: 'present', arm: 2 },
  { n: 14, s: 'gen-5',      c: 'degenerate',   v: 'absent',  d: 'v2', b: 'missing', arm: 3 },
  { n: 15, s: 'gen-5',      c: 'unattributed', v: 'present', d: 'v1', b: 'none',    arm: 2 },
  { n: 16, s: 'gen-future', c: 'rich',         v: 'absent',  d: 'v2', b: 'missing', arm: 3 },
  { n: 17, s: 'gen-future', c: 'degenerate',   v: 'present', d: 'v1', b: 'none',    arm: 2 },
  { n: 18, s: 'gen-future', c: 'unattributed', v: 'absent',  d: 'v2', b: 'present', arm: 3 },
];

const coverId = (cell: CoverCell) => `t-cov${String(cell.n).padStart(2, '0')}-${cell.s}-${cell.c}`;

/** The seeded records one arm carries, built from the table rather than written beside it. */
function coveringSeed(arm: 2 | 3): SeedRecord[] {
  return COVERING_SET.filter((cell) => cell.arm === arm).map((cell) => {
    const gen = generation(cell.s);
    const id = coverId(cell);
    const trip = coverTrip(cell.c, id, cell.b);
    return {
      trip,
      summary: ageRow(tripSummary(trip, COUNTRY_INDEX), gen),
      version: cell.v === 'present' ? SEEDED_FENCE : null,
      gen,
      d: cell.d,
      b: cell.b,
      doc: docFor(trip, cell.d),
      photoIds: photoIdsOf(trip),
    };
  });
}

/**
 * **A-39 Part 7 point 2.** The post-run assertion on a seeded row is per-id before/after key-set
 * equality: the row's key set after `ensureReady` equals the key set it was SEEDED with. That is
 * strictly stronger than `ROW_KEYS`-membership for these arms — an aged row is correctly not
 * `ROW_KEYS`-shaped — and it is what makes a red **attributable to an id**.
 *
 * Rows the port MINTS (arms 1 and 5) keep the `=== ROW_KEYS` assertion of
 * `assertRowsAreClean()`, unchanged, because for those the port is the author.
 */
function assertSeededRowsUnchanged(
  db: Recording,
  records: readonly SeedRecord[],
  rows: readonly TripSummaryRow[],
  where: string,
  opts: { orphan?: boolean } = {},
): void {
  assertSeededBytesUnchanged(db, records, where, opts);
  assert.ok(records.length > 0, `INCONCLUSIVE: ${where} was handed no records`);
  assert.equal(rows.length, records.length, `INCONCLUSIVE: ${where} returned ${rows.length} rows for ${records.length} seeded records`);
  const returned = new Map(rows.map((r) => [r.id, r]));
  for (const record of records) {
    const id = record.trip.id;
    for (const [side, row] of [
      ['PERSISTED', db._summaries().get(id) as TripSummaryRow | undefined],
      ['RETURNED', returned.get(id)],
    ] as const) {
      assert.ok(row, `${where}: no ${side} row for ${id}`);
      // **QA R32-1.** Both levels: the row's own key set AND every `cities[]` entry's, each
      // against this record's own generation. A widening one level down is a key outside the
      // key set this record was seeded with just as much as a top-level one is.
      assertGenerationShape(
        row,
        record.gen,
        `${where}: ${id} (${record.gen.name}) — the key set of the ${side} row moved. A key ` +
          'outside the key set this record was SEEDED with reached storage, which means the ' +
          'port rewrote a row it was handed (§8.4 A-39 Part 10).',
      );
      const extra = leafPaths(row).filter((p) => !ROW_PATHS.includes(p));
      assert.deepEqual(extra, [], `${where}: ${id} — leaves reached the store that the type does not have`);
    }
    // **§10 A-57 Part 8, Axis D.** The document is handed back byte for byte, including a v1 one.
    // `ensureReady` reads document KEYS and never a document VALUE; a fault that parsed one to
    // decide something is free to rewrite it too, and this is the assertion that says so.
    assert.equal(
      db._store('docs').get(id),
      record.doc,
      `${where}: ${id} (${record.d}) — the DOCUMENT the port was handed was rewritten. ` +
        '`ensureReady` has no business writing a document at all (§4.3 A-30, one store over).',
    );
  }
}

/**
 * **§10 A-57 Part 8 — the assertion the two new object stores oblige every seeded arm to carry.**
 *
 * A-39's arms assert that no key appears in a summary row that was not seeded there. The byte
 * stores need the mirror of that and it is a *stronger* claim, because the failure mode is not a
 * widening but a **deletion**: §10.2 rules that orphaned bytes are *"reported by a selector and
 * deleted only by an explicit user action, never swept silently"*, so `ensureReady` — which runs
 * on every page load, before any read is served — must leave both stores exactly as it found
 * them, orphan included.
 *
 * Keys, not values, for the same reason the row arms pin keys: what a fault can do here is add a
 * record or take one away.
 */
function assertSeededBytesUnchanged(
  db: Recording,
  records: readonly SeedRecord[],
  where: string,
  opts: { orphan?: boolean } = {},
): void {
  const want = [
    ...records.filter((r) => r.b === 'present').flatMap((r) => r.photoIds),
    ...(opts.orphan === true ? [ORPHAN_PHOTO_ID] : []),
  ].sort();
  for (const store of ['photoThumbs', 'photos'] as const) {
    assert.deepEqual(
      [...db._store(store).keys()].sort(),
      want,
      `${where}: the photo byte store \`${store}\` changed. \`ensureReady\` neither writes nor ` +
        'deletes a derivative — and an ORPHANED record is reclaimable, reported and deleted by ' +
        'an explicit user action only (§10.2). A sweep here destroys a memory to tidy a plan.',
    );
  }
}

// ---------------------------------------------------------------------------
// The three self-checking pins (A-39 Part 6), and the content-fixture pins beside them. These
// are the direct answer to the question R31-1 routes here: *"how does this stay honest?"*
// ---------------------------------------------------------------------------

test('exit 6b-1b (A-39 pin 1): the generation ledger\'s NEWEST entry IS SUMMARY_VERSION', () => {
  assert.equal(
    LEDGER.at(-1)?.version,
    SUMMARY_VERSION,
    'SUMMARY_VERSION moved and the ledger did not. Add the new generation to LEDGER (with the ' +
      'keys that generation did NOT carry, transcribed from SUMMARY_VERSION\'s own docstring in ' +
      'packages/core/src/derive/summary.ts), and add THREE ROWS to COVERING_SET — one per Axis C ' +
      'representative — taking the table from 18 to 21. This is §8.4 A-39 Part 11 item 1, and ' +
      'this pin is what stops it being forgotten.',
  );
  assert.deepEqual(
    LEDGER.map((g) => g.name),
    ['gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5'],
    'the ledger holds one entry per SHIPPED SUMMARY_VERSION, in order',
  );
  assert.equal(GEN_FUTURE.version, SUMMARY_VERSION + 1, 'gen-future must sit exactly one above current');
});

test('exit 6b-1b (A-39 pin 2): ageing a row to the CURRENT generation is the IDENTITY', () => {
  for (const content of CONTENTS) {
    const fresh = contentRow(content, `pin2-${content}`);
    assert.deepEqual(
      ageRow(fresh, CURRENT_GEN),
      fresh,
      `ageRow() mangled a ${content} row while claiming to reproduce the current shape. The ` +
        'helper may ONLY delete keys named in the ledger and set summaryVersion (§8.4 A-39 ' +
        'Part 6) — anything else has turned a fixture into a migration.',
    );
  }
});

test('exit 6b-1b (A-39 pin 3): every generation\'s key set is ROW_KEYS minus its OWN removals — the ageing is SHAPE-FAITHFUL, not version-stamped', () => {
  for (const gen of GENERATIONS) {
    const fresh = contentRow('rich', `pin3-${gen.name}`);
    const aged = ageRow(fresh, gen);
    assert.deepEqual(
      Object.keys(aged).sort(),
      expectedKeys(gen),
      `${gen.name}: the aged row's key set is not ROW_KEYS minus the ledger's removals. A ` +
        'fixture aged by setting a NUMBER and nothing else is invisible to a key-presence ' +
        'guard — that is fault G17, and it would re-create R31-1 inside the fix for R31-1.',
    );
    if (gen.version === null) {
      assert.equal('summaryVersion' in aged, false, `${gen.name} must have no summaryVersion KEY AT ALL, which is a distinct state from any number`);
    } else {
      assert.equal(aged.summaryVersion, gen.version, `${gen.name}: summaryVersion was not set to the ledger's number`);
    }
    // **QA R32-1.** The same arithmetic one level down, and stated POSITIVELY as well as
    // negatively: an entry's key set is `CITY_KEYS` (derived from `ROW_PATHS`) minus this
    // generation's own nested removals. The negative half alone is what let a *restored*
    // `cities[].countrySource` pass unseen.
    // gen-1 carries no `cities` KEY AT ALL, which the ledger says and this does not assume.
    if (!gen.absent.includes('cities')) {
      assert.ok(aged.cities.length > 0, `INCONCLUSIVE: the rich fixture has no cities[] entry to check ${gen.name}'s nested key set against`);
    }
    for (const city of aged.cities ?? []) {
      for (const key of gen.absentInCity) {
        assert.equal(key in city, false, `${gen.name}: cities[].${key} survived the ageing`);
      }
      assert.deepEqual(
        Object.keys(city).sort(),
        expectedCityKeys(gen),
        `${gen.name}: a cities[] entry's key set is not CITY_KEYS minus the ledger's NESTED ` +
          'removals (§8.4 A-39 Part 4\'s shape-faithfulness sub-ruling, QA R32-1).',
      );
    }
    // And the ageing is a copy, never a mutation of the row it was handed.
    assert.deepEqual(Object.keys(fresh).sort(), Object.keys(ROW_KEYS).sort(), `${gen.name}: ageRow mutated its argument`);
  }
});

test('exit 6b-1b (A-39 Part 6): the three Axis-C fixtures still ARE the states they are named for', () => {
  // The unattributed fixture is the one that can rot silently: if the country index improves,
  // its coordinate starts attributing and Axis C's third state degrades into `rich` with
  // nothing saying so — which is R30-1's signature one more time. A fixture that has stopped
  // being the state it names is INCONCLUSIVE, not green.
  const rich = contentRow('rich', 'pinC-rich');
  assert.ok(rich.cityCount > 0 && rich.dayCount > 0 && rich.stopCount > 0 && rich.poolCount > 0, 'INCONCLUSIVE: the `rich` fixture has a zero count');
  assert.ok(rich.revision > 0, 'INCONCLUSIVE: the `rich` fixture is at revision 0');
  assert.ok(rich.countryCodes.length > 0, 'INCONCLUSIVE: the `rich` fixture attributed no country');
  assert.ok(rich.attribution.places.attributed > 0 && rich.attribution.stops.attributed > 0, 'INCONCLUSIVE: the `rich` fixture attributed no record');
  assert.equal(rich.datePrecision, 'exact');
  assert.deepEqual(
    rich.cities.map((c) => c.countrySource).sort(),
    ['coordinate', 'stated'],
    'INCONCLUSIVE: the `rich` fixture no longer carries BOTH countrySource values, so Axis C ' +
      'has stopped covering that enum (§8.4 A-39 Part 4)',
  );

  const degenerate = contentRow('degenerate', 'pinC-degenerate');
  assert.equal(degenerate.cityCount, 0);
  assert.equal(degenerate.stopCount, 0);
  assert.equal(degenerate.poolCount, 0);
  assert.deepEqual(degenerate.countryCodes, []);
  assert.deepEqual(degenerate.cities, []);
  assert.deepEqual(degenerate.attribution, { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } });
  assert.equal(degenerate.datePrecision, 'month');
  // `dayCount === 0` is NOT reachable — `ensureDays` mints at least one Day for any valid
  // range — so the degenerate fixture is zero on every count the document can actually zero.
  assert.ok(degenerate.dayCount > 0, 'ensureDays stopped minting a day, which changes Axis C');
  // **A-39 Part 4's `revision: 0`, and QA R32-2 is why it is here rather than pinned at 1.** A
  // previous pass dropped this cell as unreachable because `createTrip` ends in `ensureDays`,
  // which bumps `revision` to 1. `createTrip` is not the only write path into a database:
  // `importDoc` never touches `revision` and `fromJSON` reads it verbatim, so restoring the
  // user's own export with `revision: 0` persists a summary row with `revision: 0` — measured,
  // with no fault injected, by `qa/r32-revision0.mjs`. The fixture reaches the cell the same
  // way (see `contentTrip`), so a guard `if (r.revision === 0)` is covered rather than excused.
  assert.equal(
    degenerate.revision, 0,
    'INCONCLUSIVE: the degenerate fixture has stopped carrying Axis C\'s `revision` ZERO cell, ' +
      'which is the only representative that reaches it (§8.4 A-39 Part 4, QA R32-2)',
  );

  const unattributed = contentRow('unattributed', 'pinC-unattributed');
  assert.ok(unattributed.attribution.places.located > 0, 'INCONCLUSIVE: the `unattributed` fixture has no located place');
  assert.equal(unattributed.attribution.places.attributed, 0, 'INCONCLUSIVE: the `unattributed` fixture\'s place STARTED ATTRIBUTING — the country index improved and Axis C\'s third state has degraded into `rich`');
  assert.ok(unattributed.attribution.stops.located > 0, 'INCONCLUSIVE: the `unattributed` fixture has no located stop');
  assert.equal(unattributed.attribution.stops.attributed, 0, 'INCONCLUSIVE: the `unattributed` fixture\'s stop STARTED ATTRIBUTING — see above');
  assert.deepEqual(unattributed.cities.map((c) => c.countrySource), [null], 'INCONCLUSIVE: the `unattributed` fixture\'s city was placed after all');
  assert.deepEqual(unattributed.countryCodes, []);
  assert.equal(unattributed.datePrecision, 'year');

  // And the three are genuinely different states, so the cover is not one fixture three times.
  assert.deepEqual(
    [rich, degenerate, unattributed].map((r) => r.datePrecision).sort(),
    ['exact', 'month', 'year'],
    'the three Axis C representatives no longer cover DatePrecision\'s three members',
  );
});

test('exit 6b-1b (A-39 Part 5): the covering table covers 18 S×C, 12 V×S and 6 V×C pairs — COUNTED FROM THE TABLE', () => {
  const distinct = (f: (c: CoverCell) => string) => new Set(COVERING_SET.map(f)).size;
  const cells = GENERATIONS.length * CONTENTS.length;
  assert.equal(cells, 18, 'the axis domains moved: |S| × |C| is no longer 6 × 3 (§8.4 A-39 Part 11)');
  assert.equal(COVERING_SET.length, cells, 'the covering set is not |S| × |C| rows. That product is the pairwise lower bound AND is achieved, so it is minimal — a row was deleted or duplicated (§8.4 A-39 Part 5).');
  assert.equal(distinct((c) => `${c.s}|${c.c}`), cells, 'the S×C pairs are not distinct — the cover has shrunk while the row count says otherwise');
  assert.equal(distinct((c) => `${c.v}|${c.s}`), 2 * GENERATIONS.length, 'not every generation carries BOTH envelope-version states (12 V×S pairs)');
  assert.equal(distinct((c) => `${c.v}|${c.c}`), 6, 'not every content class carries BOTH envelope-version states (6 V×C pairs)');
  assert.deepEqual(COVERING_SET.map((c) => c.n), Array.from({ length: cells }, (_, i) => i + 1), 'the table rows are not numbered 1..18');
  // The domains are exactly Part 4's, so a state cannot be dropped by dropping its rows.
  assert.deepEqual([...new Set(COVERING_SET.map((c) => c.s))].sort(), GENERATIONS.map((g) => g.name).slice().sort(), 'the table does not exercise every generation');
  assert.deepEqual([...new Set(COVERING_SET.map((c) => c.c))].sort(), [...CONTENTS].sort(), 'the table does not exercise every content representative');
  // Arm assignment IS the V axis, and the split is 9/9 (8/7 before A-56 took the table to
  // 18). A-39 Part 5 counts them in writing.
  for (const cell of COVERING_SET) {
    assert.equal(cell.arm, cell.v === 'present' ? 2 : 3, `row ${cell.n} is assigned to an arm whose starting state does not match its V value`);
  }
  assert.equal(COVERING_SET.filter((c) => c.arm === 2).length, 9, 'arm 2 does not carry the nine V=present rows');
  assert.equal(COVERING_SET.filter((c) => c.arm === 3).length, 9, 'arm 3 does not carry the nine V=absent rows');
  // And the ids the seed is keyed by are unique, or two table rows share one record.
  const ids = COVERING_SET.map(coverId);
  assert.equal(new Set(ids).size, cells, 'two table rows collide on one seeded id');
});

test('exit 6b-1b (§10 A-57 Part 8): the re-derived table covers Axis D and Axis B pairwise too — 18 B×S, 9 B×C, 6 V×B, 12 D×S, 6 D×C, 4 V×D, and the ONE unreachable pair is named', () => {
  const pairs = (f: (c: CoverCell) => string, g: (c: CoverCell) => string) =>
    new Set(COVERING_SET.map((c) => `${f(c)}|${g(c)}`)).size;

  // **Axis B, new at I-13 (A-39 Part 11 item 4).** Full pairwise against both of the two largest
  // axes, using the rows the table already had: this is what "zero new rows" means.
  assert.equal(BYTE_STATES.length, 3, 'Axis B\'s domain moved (§10 A-57 Part 8)');
  assert.equal(pairs((c) => c.b, (c) => c.s), BYTE_STATES.length * GENERATIONS.length, 'not every generation carries all three byte states (18 B×S pairs)');
  assert.equal(pairs((c) => c.b, (c) => c.c), BYTE_STATES.length * CONTENTS.length, 'not every content class carries all three byte states (9 B×C pairs)');
  assert.equal(pairs((c) => c.b, (c) => c.v), BYTE_STATES.length * 2, 'not every byte state carries BOTH envelope-version states (6 V×B pairs)');
  for (const arm of [2, 3] as const) {
    assert.deepEqual(
      [...new Set(COVERING_SET.filter((c) => c.arm === arm).map((c) => c.b))].sort(),
      [...BYTE_STATES].sort(),
      `arm ${arm} does not carry all three byte states, so one arm's starting state is blind to Axis B`,
    );
  }

  // **Axis D, degenerate until I-13 (A-39 Part 11 item 2).** Two states, absorbed — *"the cost
  // is zero new rows"*, and here that is checked rather than repeated.
  assert.equal(pairs((c) => c.d, (c) => c.s), 2 * GENERATIONS.length, 'not every generation carries BOTH document generations (12 D×S pairs)');
  assert.equal(pairs((c) => c.d, (c) => c.c), 2 * CONTENTS.length, 'not every content class carries BOTH document generations (6 D×C pairs)');
  assert.equal(pairs((c) => c.d, (c) => c.v), 4, 'the four D×V combinations are not all present');

  // **The constraint, asserted rather than assumed.** A v1 document has no `photos` key, so it
  // references nothing and its byte availability can only be `none`. A table row that broke this
  // would be a fixture claiming a state no deployed database can be in (A-39 Part 4).
  for (const cell of COVERING_SET) {
    if (cell.d === 'v1') {
      assert.equal(cell.b, 'none', `row ${cell.n} is a v1 document claiming Axis B \`${cell.b}\` — a v1 document carries no \`photos\` key and can reference no PhotoId`);
    }
  }
  assert.equal(COVERING_SET.filter((c) => c.d === 'v1').length, GENERATIONS.length, 'there is not exactly one v1 row per generation, which is what full D×S and B×S coverage together force');
  assert.equal(pairs((c) => c.d, (c) => c.b), 3, 'the reachable D×B pairs are exactly three: (v1,none), (v2,present), (v2,missing)');
  assert.deepEqual(
    [...new Set(COVERING_SET.map((c) => `${c.d}|${c.b}`))].sort(),
    ['v1|none', 'v2|missing', 'v2|present'],
    'the D×B cells the table carries moved',
  );

  // **`(D = v2, B = none)` — the one pair the 18-row table structurally cannot carry.** It is
  // not waived: it is the starting state of arms 1, 4 and 5, and this is the assertion that says
  // so, against the constructor those arms actually use rather than against a comment.
  const { trip, summary } = webRow('t-cover-v2-none');
  const structural = currentDoc(trip, summary, SEEDED_FENCE, CURRENT_GEN);
  assert.equal(structural.d, 'v2', 'arms 1/4/5 no longer carry a v2 document, so (v2, none) is uncovered everywhere');
  assert.equal(structural.b, 'none', 'arms 1/4/5 no longer carry a photoless record, so (v2, none) is uncovered everywhere');
  assert.deepEqual(structural.photoIds, [], 'a `none` record that references a photo is not a `none` record');
});

test('exit 6b-1b (§10 A-57 Part 8, Axis D pin): `ageDoc` produces a document `migrateDoc` reads AS a v1 one, and differs from the current shape by exactly one key', () => {
  // A-39 Part 6's pin 2/pin 3 reasoning, applied to the document ager: a fixture that has stopped
  // being the generation it names covers nothing, and the way to know is to drive it through the
  // production migration rather than to describe it.
  const trip = coverTrip('rich', 't-agedoc', 'none');
  const v2 = JSON.parse(docFor(trip, 'v2')) as Record<string, unknown>;
  const v1 = JSON.parse(docFor(trip, 'v1')) as Record<string, unknown>;
  assert.equal(v2.schemaVersion, SCHEMA_VERSION, 'the v2 fixture does not claim the current schema version');
  assert.equal(v1.schemaVersion, 1, 'the v1 fixture does not claim schema version 1');
  assert.deepEqual(
    Object.keys(v2).filter((k) => !Object.keys(v1).includes(k)),
    ['photos'],
    'ageing a document must remove EXACTLY `photos` and nothing else — `serialize/migrate.ts`\'s ' +
      '`v1ToV2` says the document *gains* `photos`, and this is that read backwards',
  );
  assert.deepEqual(Object.keys(v1).filter((k) => !Object.keys(v2).includes(k)), [], 'ageing a document ADDED a key, which is the failure A-39 Part 6 forbids for rows');
  // And the production migration accepts it and supplies the field, which is P11 one store over.
  const migrated = migrateDoc(v1) as { schemaVersion?: unknown; photos?: unknown };
  assert.equal(migrated.schemaVersion, SCHEMA_VERSION, '`migrateDoc` did not upgrade the v1 fixture');
  assert.deepEqual(migrated.photos, [], '`migrateDoc` did not supply `photos: []` for the v1 fixture');
});

test('exit 6b-1b (§10 A-57 Part 8, Axis B pin): the three byte-state fixtures still ARE the states they are named for', () => {
  // The content-fixture pins of A-39 Part 6, one axis over. A `present` fixture whose trip stopped
  // carrying a photo, or a `missing` one whose bytes are seeded anyway, degrades into `none` with
  // nothing saying so — R30-1's signature, which is why this is a test and not a comment.
  for (const b of BYTE_STATES) {
    const trip = coverTrip('rich', `t-byte-${b}`, b);
    assert.equal(
      trip.photos.length,
      b === 'none' ? 0 : 1,
      `INCONCLUSIVE: the \`${b}\` fixture's trip carries ${trip.photos.length} photo(s)`,
    );
    // A photo may not perturb the axis it is not on: Axis C's cells are set by `contentTrip`.
    const base = contentTrip('rich', `t-byte-${b}`);
    assert.equal(trip.revision, base.revision, `the \`${b}\` fixture moved \`revision\`, which is one of Axis C's own cells`);
    assert.deepEqual(
      { ...tripSummary(trip, COUNTRY_INDEX) },
      { ...tripSummary(base, COUNTRY_INDEX) },
      `the \`${b}\` fixture changed the SUMMARY ROW, so Axis B is not orthogonal to Axis C and the ` +
        'pairwise table is measuring two things at once',
    );
    // §10.5's cross-cutting rule, at the one place a fixture can break it by accident.
    for (const photo of trip.photos) {
      assert.equal(photo.at, null, 'a fixture photo carries a coordinate — §10.5: no coordinate in a log line, a golden or a fixture');
      assert.equal(photo.capturedAt, null, 'a fixture photo carries a capture time this gate has no use for');
    }
  }
  const seeded = seededDb(coveringSeed(2), { orphan: true });
  const stores = seeded.stores as Record<string, Record<string, unknown>>;
  assert.deepEqual(Object.keys(stores).sort(), ['docs', 'photoThumbs', 'photos', 'summaries', 'versions'].sort(), 'the seed does not name all five of the port\'s object stores');
  assert.deepEqual(Object.keys(stores.photos).sort(), Object.keys(stores.photoThumbs).sort(), '`write` puts both derivatives in one transaction, so a seed in which the two stores disagree is not a reachable state');
  assert.ok(Object.keys(stores.photoThumbs).includes(ORPHAN_PHOTO_ID), 'INCONCLUSIVE: the orphan did not land, so Axis O is not exercised');
});

test('exit 6b-1b-1: STARTING STATE = an EMPTY database. The web port EXECUTED — every value that reaches its summary store is clean', async () => {
  await driveWebPort(async (port, db) => {
    const { trip, summary } = webRow('web-1');
    const saved = await port.saveIfVersion(trip.id, null, JSON.stringify(trip), summary);
    if (!saved.ok) assert.fail(`INCONCLUSIVE: saveIfVersion refused (${JSON.stringify(saved)})`);
    // What is IN THE STORE, not what a file says. This is what G1 and G7 fail.
    assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the web port: saveIfVersion → summaries');

    const refreshed = await port.refreshSummary(trip.id, saved.version, tripSummary(trip, COUNTRY_INDEX));
    if (!refreshed.ok) assert.fail(`INCONCLUSIVE: refreshSummary refused (${JSON.stringify(refreshed)})`);
    assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the web port: refreshSummary → summaries');
  });
});

test('exit 6b-1b-1: STARTING STATE = an EMPTY database. Every row the web port HANDS BACK is clean', async () => {
  // Read back through the port as well as out of the store, because a read-side widening
  // (G4: `listTrips` decorating the rows it returns) persists nothing and is invisible to the
  // assertion above while every consumer sees the count anyway.
  await driveWebPort(async (port, db) => {
    const a = webRow('web-a');
    const b = webRow('web-b');
    for (const { trip, summary } of [a, b]) {
      const saved = await port.saveIfVersion(trip.id, null, JSON.stringify(trip), summary);
      if (!saved.ok) assert.fail('INCONCLUSIVE: seeding failed');
    }
    // `>=`, not `===`: this is an inconclusiveness guard, and a *count* here would make this arm
    // catch G8 as well — which is 6b-2's job and is what tells the two checks apart (A-36 Part 5).
    assert.ok(db._summaries().size >= 2, 'INCONCLUSIVE: the store did not take the two rows');
    assertRowsAreClean(await port.listTrips(), 'the web port: listTrips');
  });
});

test('exit 6b-1b-1: the double is not lying — the port\'s OUTCOMES are asserted, not just its keys', async () => {
  // A double that has broken the transaction semantics fails these BEFORE it can give a false
  // green on the key set. A-36 Part 3 fidelity obligations 1 and 4.
  await driveWebPort(async (port, db) => {
    const { trip, summary } = webRow('web-fid');
    const doc = JSON.stringify(trip);

    const first = await port.saveIfVersion(trip.id, null, doc, summary);
    assert.equal(first.ok, true, 'a fresh record with expectedVersion null must be accepted');
    if (!first.ok) return;

    // A stale fence refuses AND writes nothing.
    const widened = { ...summary, title: 'a value a refused write must not leave behind' };
    const stale = await port.saveIfVersion(trip.id, 'not-the-stored-token', doc, widened as TripSummaryRow);
    assert.deepEqual(stale, { ok: false, storedVersion: first.version }, 'a stale expectedVersion must be refused with the stored token');
    assert.equal((db._summaries().get(trip.id) as TripSummaryRow).title, summary.title, 'a REFUSED write reached the store');

    // `refreshSummary` on an absent record refuses, and creates nothing.
    const absent = await port.refreshSummary('no-such-trip', first.version, summary);
    assert.deepEqual(absent, { ok: false, storedVersion: null });
    assert.equal(db._summaries().has('no-such-trip'), false, 'a refused refresh created a summary row for a document that does not exist');

    // §4.3 **A-30**: `refreshSummary` moves no `StorageVersion` and touches no document.
    const versionBefore = db._store('versions').get(trip.id);
    const docBefore = db._store('docs').get(trip.id);
    const again = await port.refreshSummary(trip.id, first.version, { ...summary, title: 'refreshed' } as TripSummaryRow);
    assert.deepEqual(again, { ok: true, version: first.version }, 'refreshSummary minted a new fence');
    assert.equal(db._store('versions').get(trip.id), versionBefore, 'refreshSummary moved the record\'s StorageVersion');
    assert.equal(db._store('docs').get(trip.id), docBefore, 'refreshSummary wrote the document');
    assert.equal((db._summaries().get(trip.id) as TripSummaryRow).title, 'refreshed', 'INCONCLUSIVE: the accepted refresh did not land');
  });
});

test('exit 6b-1b-1: the arm is not vacuous — a port that widens its rows FAILS it', async () => {
  // The control. Without this, every assertion above could be passing because nothing ran.
  const faulted = readFileSync(resolve(CAIRN, 'apps/web/src/ports/storage.ts'), 'utf8').replace(
    '      await ensureReady();\n      const db = await open();\n      return new Promise<SaveOutcome>((resolve, reject) => {\n        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], \'readwrite\');\n        let outcome: SaveOutcome | null = null;\n        const readKey = tx.objectStore(DOCS).getKey(id) as IDBRequest<IDBValidKey | undefined>;',
    '      await ensureReady();\n      summary = { ...summary, countriesVisited: summary.countryCodes.length } as TripSummaryRow;\n      const db = await open();\n      return new Promise<SaveOutcome>((resolve, reject) => {\n        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], \'readwrite\');\n        let outcome: SaveOutcome | null = null;\n        const readKey = tx.objectStore(DOCS).getKey(id) as IDBRequest<IDBValidKey | undefined>;',
  );
  assert.notEqual(faulted, readFileSync(resolve(CAIRN, 'apps/web/src/ports/storage.ts'), 'utf8'),
    'the anchor for the vacuity control no longer applies — re-derive it, do not delete it');
  await assert.rejects(
    () => driveWebPort(async (port, db) => {
      const { trip, summary } = webRow('web-fault');
      await port.saveIfVersion(trip.id, null, JSON.stringify(trip), summary);
      assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the faulted web port');
    }, { source: faulted }),
    /not on TripSummaryRow|leaves reached the store/,
    'G7\'s shape — the parameter reassigned in place before an unchanged put — walked past 6b-1b',
  );
});

// ===========================================================================
// (6b-1b-2 … 6b-1b-5) The four arms A-38 adds, each with a STATED STARTING STATE.
//
// **§8.4 A-38 (QA R30-1, MAJOR).** A-36 Part 2's sentence is a totality claim over *values* —
// *"the keys of every value that reaches its summary store"* — and arm 1 above discharges it
// for exactly one starting state: a database that does not exist yet. `ensureReady()` is the
// port's **third write path**. It is not an interface method, it runs once per port instance,
// and on an empty database its loop body has nothing to walk. So the sentence was true of the
// property and false of the mechanism, one method over, and round 30 put a widening there and
// read it back out of real Chromium while exit criterion 6 reported 18 pass / 0 fail.
//
// > **A `StoragePort`'s coverage is the set of its WRITE PATHS, not the set of its interface
// > methods.** Every arm drives its port from a stated starting state, and the stated starting
// > states include a database that already holds records — because a path that only executes
// > against an existing database is the path that executes on **every page load after the
// > first**, which is almost every page load there is.
//
// `ensureReady`'s loop has two arms, and only one of them can be reached at all:
//
//   for (const key of docKeys.result) {
//     if (have.has(String(key))) continue;   // arm A: this doc already has an envelope version
//     versions.put(mintVersion(), key);      // arm B: the legacy record — the upcast's work
//   }
//
// **A port called twice can never produce arm B**, because the port's own write path always
// writes a version alongside the document. Only a database the port did not create has a
// versionless record in it — which is precisely the population `ensureReady` exists for. That
// is why the seeding is the load-bearing half and running the port twice (arm 5) is the
// fixture-fidelity cross-check, a different and smaller job.
// ===========================================================================

test('exit 6b-1b-2: STARTING STATE = an existing CURRENT database (no upgrade), seeded with A-39\'s NINE V=present covering records AND an ORPHANED byte record. The upcast runs and correctly does nothing — PER ID', async () => {
  const records = coveringSeed(2);
  // **§10 A-57 Part 8, Axis O.** This arm's database holds one byte record no document
  // references — the state §10.2 calls *reclaimable*, and the state a *"while we are in here,
  // tidy up"* edit destroys. Arm 3 deliberately has none, which is Axis O's other cell and the
  // negative measurement for the sweep fault below.
  const WITH_ORPHAN = { orphan: true };
  await driveWebPort(
    async (port, db) => {
      const rows = await port.listTrips();
      // The property, on both sides — what is in the store and what the port hands back —
      // **per id, against the key set each record was SEEDED with** (A-39 Part 7 point 2).
      assertSeededRowsUnchanged(db, records, rows, 'the web port, seeded current', WITH_ORPHAN);
      // And the assertions that prove THIS path ran and did what it should. §4.3 A-30 applied
      // to the upcast: arm A's whole job is to leave a record that already has a fence alone.
      // A-38's arm-2 assertions, now holding PER ID.
      for (const r of records) {
        assert.equal(
          db._store('versions').get(r.trip.id),
          SEEDED_FENCE,
          `the upcast moved the StorageVersion it was handed for ${r.trip.id}. A fence the port ` +
            'did not mint is a fence another tab may be holding (§4.3 A-30, §2.2a) — arm A ' +
            'exists to skip it.',
        );
        assert.equal(db._store('docs').get(r.trip.id), r.doc, `the upcast rewrote the document for ${r.trip.id}`);
      }
      assert.equal(db._store('versions').size, records.length, 'the upcast added a version for a record with no document');
      assert.equal(db._summaries().size, records.length, 'the upcast added or dropped a summary row');
      assert.equal(records.length, 9, 'A-39 Part 5: arm 2 carries the NINE V=present rows of the covering table');
      assert.deepEqual(
        records.map((r) => r.gen.name),
        COVERING_SET.filter((c) => c.arm === 2).map((c) => c.s),
        'INCONCLUSIVE: the seeded generations are not the ones the table assigns to arm 2',
      );
      // **§10 A-57 Part 8.** The three new starting-state facts this arm now carries, stated so
      // an arm that quietly stopped exercising them is a red rather than a silence.
      assert.deepEqual(
        [...new Set(records.map((r) => r.d))].sort(),
        ['v1', 'v2'],
        'INCONCLUSIVE: arm 2 no longer holds both document generations, so Axis D is not exercised here',
      );
      assert.deepEqual(
        [...new Set(records.map((r) => r.b))].sort(),
        [...BYTE_STATES].sort(),
        'INCONCLUSIVE: arm 2 no longer holds all three byte states, so Axis B is not exercised here',
      );
      assert.ok(
        db._store('photoThumbs').has(ORPHAN_PHOTO_ID),
        'INCONCLUSIVE: arm 2\'s orphaned byte record is gone before the assertions ran, so Axis O is not exercised here',
      );
    },
    {
      seed: seededDb(records, WITH_ORPHAN),
      beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 2', WITH_ORPHAN),
    },
  );
});

test('exit 6b-1b-3: STARTING STATE = an existing LEGACY database (NO version), seeded with A-39\'s NINE V=absent covering records. The stamping branch runs — this is the arm G13 dies in', async () => {
  const records = coveringSeed(3);
  await driveWebPort(
    async (port, db) => {
      const rows = await port.listTrips();
      assertSeededRowsUnchanged(db, records, rows, 'the web port, seeded legacy');

      // The stamp: `versions` was empty and gains EXACTLY SEVEN non-empty entries.
      assert.equal(db._store('versions').size, records.length, 'the upcast did not stamp every versionless record exactly once');
      assert.equal(records.length, 9, 'A-39 Part 5: arm 3 carries the NINE V=absent rows of the covering table');
      const minted = new Set<string>();
      for (const r of records) {
        const token = db._store('versions').get(r.trip.id);
        assert.equal(typeof token, 'string', `the upcast did not stamp ${r.trip.id}`);
        assert.ok((token as string).length > 0, `the upcast stamped ${r.trip.id} with an empty token`);
        assert.notEqual(token, SEEDED_FENCE, 'INCONCLUSIVE: the seeded fence leaked into the legacy arm');
        minted.add(token as string);
        assert.equal(db._store('docs').get(r.trip.id), r.doc, `the upcast rewrote the document for ${r.trip.id}`);
      }
      assert.equal(minted.size, records.length, 'the upcast reused one minted token across records (§2.2a rule 2)');
      assert.equal(db._summaries().size, records.length, 'the upcast added or dropped a summary row');

      // **The assertion that proves the stamp actually landed**: `load()` REJECTS a record with
      // no envelope version (*"storage: record … has no envelope version"*), so it cannot
      // resolve at all unless arm B wrote one. Per id, so a red names the record.
      for (const r of records) {
        const loaded = await port.load(r.trip.id);
        assert.ok(loaded, `load() returned null for the seeded document ${r.trip.id}`);
        assert.equal(loaded.doc, r.doc, `load() handed back a document the seed did not put there for ${r.trip.id}`);
        assert.equal(loaded.version, db._store('versions').get(r.trip.id), `load() returned a fence other than the newly minted one for ${r.trip.id}`);
      }
      assert.deepEqual(
        records.map((r) => r.gen.name),
        COVERING_SET.filter((c) => c.arm === 3).map((c) => c.s),
        'INCONCLUSIVE: the seeded generations are not the ones the table assigns to arm 3',
      );
      // **§10 A-57 Part 8.** Both new axes are exercised here too — and Axis O is in its OTHER
      // cell. That is deliberate: arm 3 is the negative measurement for the sweep fault, and a
      // fault that would be caught anyway proves nothing about the axis it was added for.
      assert.deepEqual(
        [...new Set(records.map((r) => r.d))].sort(),
        ['v1', 'v2'],
        'INCONCLUSIVE: arm 3 no longer holds both document generations, so Axis D is not exercised here',
      );
      assert.deepEqual(
        [...new Set(records.map((r) => r.b))].sort(),
        [...BYTE_STATES].sort(),
        'INCONCLUSIVE: arm 3 no longer holds all three byte states, so Axis B is not exercised here',
      );
      assert.equal(
        db._store('photoThumbs').has(ORPHAN_PHOTO_ID),
        false,
        'arm 3 states Axis O = clean; an orphan here would make it a second copy of arm 2',
      );
    },
    { seed: seededDb(records), beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 3') },
  );
});

test('exit 6b-1b-4: STARTING STATE = a MIXED database — one legacy id and one current id, both arms of the upcast loop in one run', async () => {
  // A real upgraded database is mixed; an arm that is uniformly legacy or uniformly current
  // tests half a loop.
  //
  // **A-39 Part 5 says this arm's size in writing, so nobody "optimises" it.** It is UNCHANGED
  // at two records, both gen-4/rich. It contributes **no S×C coverage cells at all** and exists
  // solely for Axis N's third state — both loop arms in one `ensureReady` run. Growing it adds
  // no coverage; shrinking it deletes the only arm that spans both V values in one transaction.
  const legacy = webRow('t-mixed-legacy');
  const current = webRow('t-mixed-current');
  const records: SeedRecord[] = [
    currentDoc(legacy.trip, legacy.summary, null, CURRENT_GEN),
    currentDoc(current.trip, current.summary, SEEDED_FENCE, CURRENT_GEN),
  ];
  await driveWebPort(
    async (port, db) => {
      assert.equal(records.length, 2, 'A-39 Part 5: arm 4 stays at TWO records and contributes zero S×C coverage cells — Axis N is its only job');
      const rows = await port.listTrips();
      assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the web port, seeded mixed: summaries');
      assertRowsAreClean(rows, 'the web port, seeded mixed: listTrips');
      assert.equal(rows.length, 2, 'INCONCLUSIVE: both seeded rows did not come back');

      // Arm B: the versionless id was stamped.
      const minted = db._store('versions').get(legacy.trip.id);
      assert.equal(typeof minted, 'string', 'the legacy id was not stamped in a mixed database');
      assert.ok((minted as string).length > 0, 'the legacy id was stamped with an empty token');
      // Arm A: the versioned id's token is byte-identical to the seeded one.
      assert.equal(
        db._store('versions').get(current.trip.id),
        SEEDED_FENCE,
        'the upcast moved the fence of the record that already had one',
      );
      assert.equal(db._store('versions').size, 2, 'the upcast wrote a version for a key with no document');
      assert.equal(db._summaries().size, 2, 'the upcast added or dropped a summary row');
    },
    { seed: seededDb(records), beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 4') },
  );
});

test('exit 6b-1b-5: STARTING STATE = what the PORT ITSELF wrote — a second instance over instance 1\'s database, and the fixture-fidelity cross-check', async () => {
  // Its coverage is a strict subset of arm 2's. It is kept for the one thing no seeded arm can
  // do: **its starting state was produced by the port rather than by the test**, which is what
  // stops arms 2-4's fixture drifting away from what the port actually writes — the way a
  // seeded arm goes quietly wrong.
  const { trip, summary } = webRow('t-second');
  await driveWebPort(async (port, db, make) => {
    const saved = await port.saveIfVersion(trip.id, null, JSON.stringify(trip), summary);
    if (!saved.ok) assert.fail(`INCONCLUSIVE: instance 1's write refused (${JSON.stringify(saved)})`);

    // --- fixture fidelity: what instance 1 left behind must match the arms 2-4 fixture shape.
    // Asserted in the direction that matters: every store the hand-written seed populates is a
    // store the port itself writes, with a value of the same shape. (Enumerating the double's
    // store names would need an accessor outside its constructor, which A-38 Part 5's
    // checkable line forbids adding here — see BUILD-NOTES.)
    const fixture = seededDb([currentDoc(trip, summary, SEEDED_FENCE, CURRENT_GEN)]);
    for (const name of Object.keys(fixture.stores ?? {})) {
      // **§10 A-57 Part 8.** The seed now names five stores, and only three are keyed by a trip
      // id. §10.3's two byte stores are keyed by `PhotoId` and are written by
      // `indexedDbPhotoBytes` — a **different export, with a different fence** (§10.2: *"they are
      // one interface because a caller wants one capability; they are two files because the
      // fences are different"*). So `indexedDbStorage`'s own write path must leave them EMPTY,
      // and that is the stronger claim, not a weaker one: it is what says the document write did
      // not grow a byte write.
      const photoStore = name === 'photos' || name === 'photoThumbs';
      assert.deepEqual(
        [...db._store(name).keys()],
        photoStore ? [] : [trip.id],
        photoStore
          ? `fixture drift: \`indexedDbStorage\` wrote to \`${name}\`, which is \`indexedDbPhotoBytes\`'s store (§10.2, §10.3)`
          : `fixture drift: the port did not write store \`${name}\` that arms 2-4 seed`,
      );
    }
    assert.equal(typeof db._store('docs').get(trip.id), 'string', 'fixture drift: `docs` holds a serialized document');
    assert.equal(db._store('docs').get(trip.id), JSON.stringify(trip), 'fixture drift: the document round-trip moved');
    assert.equal(typeof db._store('versions').get(trip.id), 'string', 'fixture drift: `versions` holds an opaque string token');
    assert.deepEqual(
      Object.keys(db._summaries().get(trip.id) as TripSummaryRow).sort(),
      Object.keys((fixture.stores as Record<string, Record<string, unknown>>).summaries[trip.id] as TripSummaryRow).sort(),
      'fixture drift: the row the PORT persists and the row arms 2-4 SEED no longer have the ' +
        'same key set. Re-derive the fixture from `tripSummary` — do not widen ROW_KEYS.',
    );

    // --- page load 2: a fresh instance over what instance 1 wrote.
    const second = make();
    const rows = await second.listTrips();
    assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the web port, second instance: summaries');
    assertRowsAreClean(rows, 'the web port, second instance: listTrips');
    assert.equal(db._store('versions').get(trip.id), saved.version, 'the second instance moved instance 1\'s fence');
  });
});

test('exit 6b-1b-6 (§10 A-57 Part 8): STARTING STATE = a database at the PREVIOUS `DB_VERSION` — the two photo stores do not exist yet, and `onupgradeneeded` creates them EMPTY', async () => {
  // **The sixth arm, and A-39 Part 11 item 4 is what creates it.** Every arm above starts from a
  // database already at the port's own `DB_VERSION`, so no `onupgradeneeded` fires and the
  // upgrade path — the one every installed copy of Cairn takes exactly once, on the first page
  // load after the update — was covered by nothing.
  //
  // Like arm 4 it contributes **no S×C/D/B coverage cells** and is kept for one structural
  // reason: it is the only arm in which the port's `open()` runs an upgrade. Its records are
  // `d: 'v1'`/`b: 'none'` because that is the only state a version-3 database can hold —
  // `SCHEMA_VERSION` → 2 and `DB_VERSION` → 4 shipped in the same commit.
  //
  // **What it cannot see, stated rather than discovered:** a widening placed *inside*
  // `onupgradeneeded` that WRITES a record is beyond the double by construction — a real upgrade
  // writes through `request.transaction`, which the recorder does not implement. That is A-38
  // Part 8 residue 1 and A-39 Part 11 item 7, and it is `qa/i7a-idb-rowkeys.mjs` phase 3's job.
  const current = webRow('t-upgrade-current');
  const legacy = webRow('t-upgrade-legacy');
  const records: SeedRecord[] = [
    legacyDoc(current.trip, current.summary, SEEDED_FENCE, CURRENT_GEN),
    legacyDoc(legacy.trip, legacy.summary, null, CURRENT_GEN),
  ];
  const full = seededDb(records).stores as Record<string, Record<string, unknown>>;
  const seed: Seed = {
    // One below the port's own — read from the source, never hard-coded, for `portDbVersion`'s
    // own reason: the day someone bumps `DB_VERSION` this arm must still be the upgrade arm.
    dbVersion: portDbVersion() - 1,
    stores: {
      docs: full.docs,
      summaries: full.summaries,
      versions: full.versions,
      // The store `DB_VERSION` 2 kept the epoch and counter in. `open()` deletes it
      // unconditionally, and this is the first arm in which that line has ever executed.
      meta: { epoch: 'a value R4-2 deleted, and §2.2b F3 forbids remembering' },
    },
  };
  await driveWebPort(
    async (port, db) => {
      const rows = await port.listTrips();
      assertSeededRowsUnchanged(db, records, rows, 'the web port, upgraded 3 → 4');

      // The upgrade ran and created both stores — EMPTY. `onupgradeneeded` writes no record, and
      // a byte store that arrived with something in it would be bytes with no tenancy reference,
      // which is the one thing §6.3 exists to make impossible.
      assert.deepEqual(
        db._names(),
        ['docs', 'photoThumbs', 'photos', 'summaries', 'versions'].sort(),
        'the upgrade did not leave the database with exactly the port\'s five object stores',
      );
      assert.equal(db._store('photos').size, 0, '`onupgradeneeded` put a record in `photos`');
      assert.equal(db._store('photoThumbs').size, 0, '`onupgradeneeded` put a record in `photoThumbs`');

      // The upgrade is not a rewrite: the rows, the documents and the fences the port did not
      // mint all survive it untouched.
      assert.equal(db._store('versions').get(current.trip.id), SEEDED_FENCE, 'the upgrade moved a fence the port did not mint');
      const minted = db._store('versions').get(legacy.trip.id);
      assert.equal(typeof minted, 'string', 'the upgrade path skipped the stamping branch');
      assert.notEqual(minted, SEEDED_FENCE, 'INCONCLUSIVE: the seeded fence leaked into the versionless record');
      assert.equal(rows.length, 2, 'INCONCLUSIVE: both seeded rows did not come back through the upgraded database');
      assertRowsAreClean(rows, 'the web port, upgraded 3 → 4: listTrips');
    },
    {
      seed,
      beforeConstruct: (db) => {
        // **Before anything asks for them.** `_store()` mints on read, so the "these two stores
        // do not exist yet" claim has to be made through `_names()` and made FIRST, or the
        // assertion creates the very thing it is checking for.
        assert.deepEqual(
          db._names(),
          ['docs', 'meta', 'summaries', 'versions'],
          'INCONCLUSIVE: the starting state is not a pre-I-13 database — this arm covers the ' +
            'upgrade and there is nothing to upgrade',
        );
        assertSeedLanded(db, records, 'arm 6');
      },
    },
  );
});

test('exit 6b-1b-6 (§10 A-57 Part 8): the upgrade deletes the DEAD `meta` store, and `_names()` is what proves it', async () => {
  const { trip, summary } = webRow('t-upgrade-meta');
  const records: SeedRecord[] = [legacyDoc(trip, summary, SEEDED_FENCE, CURRENT_GEN)];
  const full = seededDb(records).stores as Record<string, Record<string, unknown>>;
  await driveWebPort(
    async (port, db) => {
      await port.listTrips();
      assert.equal(
        db._names().includes('meta'),
        false,
        '`meta` survived the upgrade. R4-2 deleted the epoch and the storage-wide counter it ' +
          'held, and §2.2b F3 forbids a token being derived from a remembered value — the store ' +
          'does not get to sit there looking useful.',
      );
    },
    {
      seed: {
        dbVersion: portDbVersion() - 1,
        stores: { docs: full.docs, summaries: full.summaries, versions: full.versions, meta: { epoch: 'dead' } },
      },
      beforeConstruct: (db) => assert.ok(db._names().includes('meta'), 'INCONCLUSIVE: the dead `meta` store did not land, so its deletion is unobservable'),
    },
  );
});

// ---------------------------------------------------------------------------
// The vacuity controls for the four new arms — A-38 Part 7, and R29-4's rule holds without
// restatement: **an injected fault that did not run is a FAILURE, not a pass**, which is what
// `faultedPort()`'s anchor assertion is.
//
// | G12 | the widening applied to every summary row from inside the upcast | arms 2, 3, 4, 5 |
// | G13 | the same widening INSIDE THE STAMPING BRANCH, so it fires only for a versionless
//         document | **arms 3 and 4, and nothing else in the repo** |
// | G14 | the upcast stamps a record it should have skipped, moving a fence | arms 2 and 4 |
//
// `qa/a38-exit6d.sh` measures the same three against the whole file, against the pre-A-38 gate
// shape (arm 1 alone) and against 6b-2 — which is where the quantitative claim comes from.
// ---------------------------------------------------------------------------

/** G12: `ensureReady` takes `SUMMARIES` into scope and re-puts every row widened. */
function g12(): string {
  return faultedPort('G12', [
    [
      "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);",
      "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);",
    ],
    [
      '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;',
      '              const all = sums.getAll() as IDBRequest<TripSummaryRow[]>;\n'
        + '              all.onsuccess = () => {\n'
        + '                for (const r of all.result) {\n'
        + '                  sums.put({ ...r, countriesVisited: r.countryCodes.length, daysTravelled: r.dayCount }, r.id);\n'
        + '                }\n'
        + '              };\n'
        + '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;',
    ],
  ]);
}

/**
 * **G13.** The same widening, one `sums.get`/`sums.put` pair placed *after* the existing
 * `versions.put(mintVersion(), key)` — so it fires **only** for a document with no envelope
 * version. `objectStore(SUMMARIES).put` still appears exactly twice in the file, so 6b-2's
 * pinned site count and its bare-identifier capture are both untouched, and it is invisible to
 * every shape of this gate that existed before A-38.
 */
function g13(): string {
  return faultedPort('G13', [
    [
      "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);",
      "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);",
    ],
    [
      '                versions.put(mintVersion(), key);',
      '                versions.put(mintVersion(), key);\n'
        + '                const one = sums.get(String(key)) as IDBRequest<TripSummaryRow>;\n'
        + '                one.onsuccess = () => {\n'
        + '                  const r = one.result;\n'
        + '                  sums.put({ ...r, countriesVisited: r.countryCodes.length, daysTravelled: r.dayCount }, String(key));\n'
        + '                };',
    ],
  ]);
}

/** G14: the `continue` that skips a record which already has a fence is removed. */
function g14(): string {
  return faultedPort('G14', [
    [
      '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;\n',
      '              for (const key of docKeys.result) {\n',
    ],
  ]);
}

test('exit 6b-1b-2: not vacuous — G12 (the upcast widens every row) FAILS the seeded-current arm', async () => {
  const { trip, summary } = webRow('t-current');
  const records: SeedRecord[] = [currentDoc(trip, summary, SEEDED_FENCE, CURRENT_GEN)];
  await assert.rejects(
    () => driveWebPort(
      async (port, db) => {
        await port.listTrips();
        assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the faulted web port (G12), seeded current');
      },
      { source: g12(), seed: seededDb(records), beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 2 under G12') },
    ),
    /not on TripSummaryRow|leaves reached the store/,
    'G12 — a widening in the upcast, against a database that already holds records — walked past arm 2',
  );
});

test('exit 6b-1b-2: not vacuous — G14 (the upcast stamps a record it should have skipped) FAILS the byte-identical fence assertion', async () => {
  const { trip, summary } = webRow('t-current');
  const records: SeedRecord[] = [currentDoc(trip, summary, SEEDED_FENCE, CURRENT_GEN)];
  await assert.rejects(
    () => driveWebPort(
      async (port, db) => {
        await port.listTrips();
        assert.equal(db._store('versions').get(trip.id), SEEDED_FENCE, 'the upcast moved a StorageVersion it was handed');
      },
      { source: g14(), seed: seededDb(records), beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 2 under G14') },
    ),
    /moved a StorageVersion it was handed/,
    'G14 — the upcast re-stamping a record that already had a fence — walked past arm 2',
  );
});

test('exit 6b-1b-3: NOT VACUOUS, AND THIS IS THE POINT — G13 (the widening inside the STAMPING BRANCH) FAILS the seeded-legacy arm', async () => {
  // The fault R30-1 found: green under exit criterion 6 in its A-36 shape (18 pass / 0 fail),
  // green under both of 6b-2's surviving assertions, green under 6b-4 because that probe
  // deletes the database first — and caught here, by an arm whose starting state is a
  // VERSIONLESS record. `qa/a38-exit6d.sh` measures each of those three claims.
  const { trip, summary } = webRow('t-legacy');
  const records: SeedRecord[] = [currentDoc(trip, summary, null, CURRENT_GEN)];
  await assert.rejects(
    () => driveWebPort(
      async (port, db) => {
        await port.listTrips();
        assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the faulted web port (G13), seeded legacy');
      },
      { source: g13(), seed: seededDb(records), beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 3 under G13') },
    ),
    /not on TripSummaryRow|leaves reached the store/,
    'G13 — a widening reachable ONLY when a document key has no envelope version — walked past ' +
      'arm 3, which is the one arm in the repo that can see it',
  );
});

test('exit 6b-1b-4: not vacuous — G13 FAILS the mixed arm too, through its legacy half', async () => {
  const legacy = webRow('t-mixed-legacy');
  const current = webRow('t-mixed-current');
  const records: SeedRecord[] = [
    currentDoc(legacy.trip, legacy.summary, null, CURRENT_GEN),
    currentDoc(current.trip, current.summary, SEEDED_FENCE, CURRENT_GEN),
  ];
  await assert.rejects(
    () => driveWebPort(
      async (port, db) => {
        await port.listTrips();
        assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the faulted web port (G13), seeded mixed');
      },
      { source: g13(), seed: seededDb(records), beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 4 under G13') },
    ),
    /not on TripSummaryRow|leaves reached the store/,
    'G13 walked past arm 4 — a mixed database contains the legacy half by construction',
  );
});

test('exit 6b-1b-5: not vacuous — G12 FAILS the second-instance arm', async () => {
  const { trip, summary } = webRow('t-second');
  await assert.rejects(
    () => driveWebPort(
      async (port, db, make) => {
        const saved = await port.saveIfVersion(trip.id, null, JSON.stringify(trip), summary);
        assert.equal(saved.ok, true, 'INCONCLUSIVE: instance 1 refused the write');
        await make().listTrips();
        assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the faulted web port (G12), second instance');
      },
      { source: g12() },
    ),
    /not on TripSummaryRow|leaves reached the store/,
    'G12 walked past arm 5 — a second instance opens a database that already holds records',
  );
});

// ---------------------------------------------------------------------------
// **A-39 Part 9 — five more faults, ONE PER AXIS STATE the covering set exists to reach**, so
// the cover is *demonstrated* rather than asserted. A-33 Part 6's ten, A-36 Part 5's four and
// A-38 Part 7's three all stand above and must stay red.
//
// | G16 | `r.summaryVersion < SUMMARY_VERSION` — *"while we are in here, bring stale rows
//         current."* **This is R31-1's own H4.**                    | arms 2 and 3 | Axis S below-current |
// | G17 | `!('attribution' in r)` — a KEY-PRESENCE guard, no version read at all
//                                                                   | arms 2 and 3 | that the ageing is SHAPE-FAITHFUL |
// | G18 | `r.summaryVersion !== SUMMARY_VERSION`                     | arms 2 and 3 | gen-future ≠ stale |
// | G19 | `r.countryCodes.length === 0`                              | arms 2 and 3 | Axis C's zero cell |
// | G20 | `attribution.stops.attributed < attribution.stops.located` | arms 2 and 3 | Axis C's third cell |
//
// Each is the transaction-scope widening **G12 already makes**, with a different guard on the
// put — which is A-39 Part 1's finding stated as code: `SUMMARIES` is not in `ensureReady`'s
// transaction scope, so *every* fault in this class is that same scope edit plus a body.
//
// `qa/a39-exit6e.sh` measures each of them against the whole file, against the pre-A-38 gate
// shape (arm 1 alone), against 6b-2, and — for G16, G17, G19 and G20 — against a **deliberately
// degraded covering set**, which is A-39 Part 9's required NEGATIVE measurement: a fault that
// would be caught anyway proves nothing about the axis it was added for.
// ---------------------------------------------------------------------------

/**
 * G12's transaction-scope widening with a guard on the put. The widened key is `daysTravelled`
 * — a lifetime count of exactly the kind §8.4 clause 2 forbids — and it is computed from
 * `dayCount`, which is the **one count-shaped field every generation carries**, so the fault is
 * a *widening* on every row it fires for rather than a crash on the older ones.
 */
function guardedUpcastFault(label: string, guard: string): string {
  return faultedPort(label, [
    [
      "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);",
      "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);",
    ],
    [
      '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;',
      '              const all = sums.getAll() as IDBRequest<TripSummaryRow[]>;\n'
        + '              all.onsuccess = () => {\n'
        + '                for (const r of all.result) {\n'
        + `                  if (${guard}) sums.put({ ...r, daysTravelled: r.dayCount }, r.id);\n`
        + '                }\n'
        + '              };\n'
        + '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;',
    ],
  ]);
}

/**
 * The five guards, transcribed from A-39 Part 9's table.
 *
 * **Two carry a null-guard A-39's table does not print, and it is disclosed rather than
 * silent.** `r.countryCodes.length` and `r.attribution.stops.…` both *throw* against a gen-1
 * row, which has neither key — and a throw inside the recorder's `onsuccess` escapes the
 * transaction entirely, killing the test process instead of widening a row. A fault that
 * crashes is not the fault A-39 is describing (a silent widening), and an author writing a
 * migration over rows they know may be legacy writes the guarded form. The COMPARISON is
 * verbatim; only its reachability is made safe.
 */
const A39_FAULTS: ReadonlyArray<{ id: string; guard: string; fires: string }> = [
  { id: 'G16', guard: `r.summaryVersion < ${SUMMARY_VERSION}`, fires: 'gen-2 and gen-3 rows (gen-1 has no summaryVersion key at all, so `undefined < n` is false — which is exactly why G17 exists as a separate fault)' },
  { id: 'G17', guard: "!('attribution' in r)", fires: 'gen-1, gen-2 and gen-3 rows — with no version read at all' },
  { id: 'G18', guard: `r.summaryVersion !== ${SUMMARY_VERSION}`, fires: 'gen-1, gen-2, gen-3 AND gen-future rows — `<` and `!==` are different faults' },
  { id: 'G19', guard: 'r.countryCodes?.length === 0', fires: 'the degenerate and unattributed rows — Axis C\'s zero cell' },
  { id: 'G20', guard: '!!r.attribution && r.attribution.stops.attributed < r.attribution.stops.located', fires: 'the unattributed rows only — the cell neither rich nor degenerate reaches' },
];

for (const fault of A39_FAULTS) {
  for (const arm of [2, 3] as const) {
    test(`exit 6b-1b-${arm}: not vacuous — ${fault.id} (a guarded widening in the upcast, firing on ${fault.fires}) FAILS the covering seed`, async () => {
      const records = coveringSeed(arm);
      await assert.rejects(
        () => driveWebPort(
          async (port, db) => {
            const rows = await port.listTrips();
            assertSeededRowsUnchanged(db, records, rows, `the faulted web port (${fault.id}), arm ${arm}`);
          },
          {
            source: guardedUpcastFault(fault.id, fault.guard),
            seed: seededDb(records),
            beforeConstruct: (db) => assertSeedLanded(db, records, `arm ${arm} under ${fault.id}`),
          },
        ),
        /the key set of the (PERSISTED|RETURNED) row moved|leaves reached the store/,
        `${fault.id} walked past arm ${arm}. A-39 Part 11: this is a BUILDER finding against the ` +
          'covering table — a row is missing, a fixture has rotted into another state, or an ' +
          'assertion is not per-id — not a design question for the architect.',
      );
    });
  }
}

test('exit 6b-1b: the covering set is what catches them — G16 is GREEN against a gen-4-only seed, which is R31-1 measured', async () => {
  // The negative half of the claim, in the suite rather than only in `qa/`. Seeding the same
  // arm with freshly-minted rows — A-38's shape, one per content class so nothing else changed
  // — leaves R31-1's own H4 completely invisible. That is the finding, reproduced, and it is
  // why the table above cannot be quietly replaced by "one seeded row per arm".
  const records: SeedRecord[] = CONTENTS.map((content) => {
    const id = `t-fresh-${content}`;
    const trip = contentTrip(content, id);
    return currentDoc(trip, tripSummary(trip, COUNTRY_INDEX), SEEDED_FENCE, CURRENT_GEN);
  });
  await driveWebPort(
    async (port, db) => {
      const rows = await port.listTrips();
      // No rejection: the fault ran and changed nothing, because no seeded row is stale.
      assertSeededRowsUnchanged(db, records, rows, 'G16 against a gen-4-only seed');
    },
    {
      source: guardedUpcastFault('G16', `r.summaryVersion < ${SUMMARY_VERSION}`),
      seed: seededDb(records),
      beforeConstruct: (db) => assertSeedLanded(db, records, 'the gen-4-only seed'),
    },
  );
});

test('exit 6b-1b: the ageing must be SHAPE-FAITHFUL — G17 is GREEN against version-only-aged fixtures, which is the fixture A-39 Part 6 forbids', async () => {
  // A-39 Part 9's required negative measurement for G17. If `ageRow` only stamped a number —
  // the fixture that "looks aged" — a key-presence guard reads a row that still has every key
  // and does nothing. This is R31-1's shape one level down, and it is why Part 6 forbids a
  // version-only fixture in writing.
  const versionOnly = (fresh: TripSummaryRow, gen: GenEntry): TripSummaryRow =>
    (gen.version === null ? fresh : { ...fresh, summaryVersion: gen.version });
  const records: SeedRecord[] = COVERING_SET.filter((c) => c.arm === 2).map((cell) => {
    const gen = generation(cell.s);
    const id = coverId(cell);
    const trip = contentTrip(cell.c, id);
    // The seed is asserted against the CURRENT key set, because that is what a version-only
    // aged row actually has — which is the whole point of the measurement. Axis D and Axis B
    // collapse to their `v2`/`none` cells here for the same reason: this fixture degrades
    // exactly ONE axis, or it stops measuring the one it names.
    return currentDoc(trip, versionOnly(tripSummary(trip, COUNTRY_INDEX), gen), SEEDED_FENCE, CURRENT_GEN);
  });
  await driveWebPort(
    async (port, db) => {
      const rows = await port.listTrips();
      assertSeededRowsUnchanged(db, records, rows, 'G17 against version-only-aged fixtures');
    },
    {
      source: guardedUpcastFault('G17', "!('attribution' in r)"),
      seed: seededDb(records),
      beforeConstruct: (db) => assertSeedLanded(db, records, 'the version-only-aged seed'),
    },
  );
});

test('exit 6b-1b: Axis C is what catches them — G19 and G20 are GREEN against a rich-only seed', async () => {
  // A-39 Part 9's required negative measurement for G20, and the same shape for G19: a fault
  // that would be caught anyway proves nothing about the axis it was added for. Every
  // generation is present here; only the CONTENT axis has collapsed to one representative.
  for (const fault of A39_FAULTS.filter((f) => f.id === 'G19' || f.id === 'G20')) {
    const records: SeedRecord[] = COVERING_SET.filter((c) => c.arm === 2).map((cell) => {
      const gen = generation(cell.s);
      const id = `rich-only-${cell.n}`;
      const trip = contentTrip('rich', id);
      return currentDoc(trip, ageRow(tripSummary(trip, COUNTRY_INDEX), gen), SEEDED_FENCE, gen);
    });
    await driveWebPort(
      async (port, db) => {
        const rows = await port.listTrips();
        assertSeededRowsUnchanged(db, records, rows, `${fault.id} against a rich-only seed`);
      },
      {
        source: guardedUpcastFault(fault.id, fault.guard),
        seed: seededDb(records),
        beforeConstruct: (db) => assertSeedLanded(db, records, `the rich-only seed (${fault.id})`),
      },
    );
  }
});

test('exit 6b-1b: the SEED-INTEGRITY assertion is itself not vacuous — a mis-spelled store name is caught BEFORE the port runs', async () => {
  // A-38 Part 4's reasoning, tested rather than asserted: without this, a typo in a store name
  // silently yields an EMPTY database, arms 2-4 degrade back into arm 1, and the gate reports
  // green — R30-1 re-created inside the fix for R30-1, with the same signature.
  const { trip, summary } = webRow('t-typo');
  const records: SeedRecord[] = [currentDoc(trip, summary, null, CURRENT_GEN)];
  const good = seededDb(records);
  const typo: Seed = {
    dbVersion: good.dbVersion,
    stores: { documents: (good.stores as Record<string, Record<string, unknown>>).docs, summaries: {}, versions: {} },
  };
  await assert.rejects(
    () => driveWebPort(async () => { /* never reached */ }, {
      seed: typo,
      beforeConstruct: (db) => assertSeedLanded(db, records, 'the mis-seeded arm'),
    }),
    /the docs seed did not land/,
    'a seed that landed in no store at all was accepted as a starting state',
  );
});

// ---------------------------------------------------------------------------
// **§10 A-57 Part 8 (revision 40, ROADMAP I-13) — the covering set, RE-DERIVED over the two new
// object stores and the new schema version.** Four more faults, one per state the two new axes
// exist to reach, in the same shape as A-39 Part 9's five: the same transaction-scope widening
// G12 makes, with a guard that reads something `ensureReady()` could not read before I-13.
//
// | G24 | `d.schemaVersion === 1` — *"this document predates photos, mark its row."*
//                                                     | arms 2 and 3 | **Axis D**, no longer degenerate |
// | G25 | a referenced `PhotoId` has NO byte record    | arms 2 and 3 | **Axis B**'s `missing` cell |
// | G26 | the orphan sweep — bytes no document references are DELETED
//                                                     | arm 2 only   | **Axis O**, and §10.2's rule |
// | G27 | every referenced `PhotoId` HAS its bytes     | arms 2 and 3 | **Axis B**'s `present` cell |
//
// G26 is the one that is not a row widening at all. It is a **silent delete of user data**, and
// §10.2 forbids it in as many words — *"orphaned bytes are reported by a selector and deleted
// only by an explicit user action, never swept silently"*. It is caught by the byte-store
// before/after assertion, which is the assertion the two new stores oblige the arms to carry.
// ---------------------------------------------------------------------------

/**
 * **A-57 Part 8's template.** G12's transaction-scope widening, extended over the two new stores,
 * with a guard that can read any of: the summary row (`r`), that row's own **document** (`d`,
 * parsed, or `null`), the `PhotoId`s that document references (`refs`), and the set of ids the
 * **thumb store** actually holds (`stored`). Those four are exactly what A-57 Part 8's
 * re-derivation of A-39 Part 3's table adds to the readable state.
 *
 * The widened key is `daysTravelled` — a lifetime count of exactly the kind §8.4 clause 2 forbids
 * — computed from `dayCount`, the one count-shaped field every generation carries, so the fault
 * is a *widening* on every row it fires for rather than a crash on the older ones.
 */
function storeGuardedUpcastFault(label: string, guard: string): string {
  return faultedPort(label, [
    [
      "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);",
      "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS, PHOTOS, PHOTO_THUMBS], 'readwrite');\n"
        + '          const versions = tx.objectStore(VERSIONS);\n'
        + '          const sums = tx.objectStore(SUMMARIES);\n'
        + '          const docsStore = tx.objectStore(DOCS);\n'
        + '          const thumbs = tx.objectStore(PHOTO_THUMBS);',
    ],
    [
      '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;',
      '              const photoKeys = thumbs.getAllKeys() as IDBRequest<IDBValidKey[]>;\n'
        + '              photoKeys.onsuccess = () => {\n'
        + '                const stored = new Set(photoKeys.result.map((k) => String(k)));\n'
        + '                const all = sums.getAll() as IDBRequest<TripSummaryRow[]>;\n'
        + '                all.onsuccess = () => {\n'
        + '                  for (const r of all.result) {\n'
        + '                    const one = docsStore.get(r.id) as IDBRequest<unknown>;\n'
        + '                    one.onsuccess = () => {\n'
        + '                      let d: any = null;\n'
        + '                      try { d = JSON.parse(String(one.result)); } catch { d = null; }\n'
        + '                      const refs: string[] = Array.isArray(d?.photos) ? d.photos.map((p: any) => String(p?.id)) : [];\n'
        + `                      if (${guard}) sums.put({ ...r, daysTravelled: r.dayCount }, r.id);\n`
        + '                    };\n'
        + '                  }\n'
        + '                };\n'
        + '              };\n'
        + '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;',
    ],
  ]);
}

const A57_FAULTS: ReadonlyArray<{ id: string; guard: string; axis: string; fires: string }> = [
  {
    id: 'G24',
    guard: 'd !== null && d.schemaVersion === 1',
    axis: 'Axis D — no longer degenerate, because `SCHEMA_VERSION` went to 2 (A-39 Part 11 item 2)',
    fires: 'every record whose seeded DOCUMENT is a v1 one',
  },
  {
    id: 'G25',
    guard: 'refs.length > 0 && refs.some((p: string) => !stored.has(p))',
    axis: "Axis B's `missing` cell — a photo whose bytes are gone (§10.2's DESIGNED state)",
    fires: 'the records that reference a PhotoId with no byte record',
  },
  {
    id: 'G27',
    guard: 'refs.length > 0 && refs.every((p: string) => stored.has(p))',
    axis: "Axis B's `present` cell — the bytes are there",
    fires: 'the records whose every referenced PhotoId has bytes',
  },
];

/**
 * **G26 — the orphan sweep, and it is the fault the two new stores were added to catch.**
 *
 * *"While we are in here, tidy up the byte records nothing points at."* It is not a row widening
 * at all: it is a **silent delete of a derivative the user cannot get back** — §10.4 stores no
 * original, and §10.2 rules that orphaned bytes are *"reported by a selector and deleted only by
 * an explicit user action, never swept silently"*, on §6.3's stated ground that a sweeper *"fails
 * loudly, it does not silently delete."*
 *
 * It is the most natural mistaken edit the new stores admit, which is exactly why the covering
 * set has to reach it: `ensureReady()` already opens a `readwrite` transaction on every page
 * load, and this is nineteen lines inside it.
 */
function orphanSweepFault(): string {
  return faultedPort('G26', [
    [
      "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);",
      "          const tx = db.transaction([DOCS, VERSIONS, PHOTOS, PHOTO_THUMBS], 'readwrite');\n"
        + '          const versions = tx.objectStore(VERSIONS);\n'
        + '          const docsStore = tx.objectStore(DOCS);\n'
        + '          const thumbs = tx.objectStore(PHOTO_THUMBS);\n'
        + '          const blobs = tx.objectStore(PHOTOS);',
    ],
    [
      '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;',
      '              const photoKeys = thumbs.getAllKeys() as IDBRequest<IDBValidKey[]>;\n'
        + '              photoKeys.onsuccess = () => {\n'
        + '                const docsAll = docsStore.getAll() as IDBRequest<unknown[]>;\n'
        + '                docsAll.onsuccess = () => {\n'
        + '                  const referenced = new Set<string>();\n'
        + '                  for (const rawDoc of docsAll.result) {\n'
        + '                    try {\n'
        + '                      const parsed = JSON.parse(String(rawDoc)) as { photos?: Array<{ id?: unknown }> };\n'
        + '                      if (Array.isArray(parsed.photos)) for (const p of parsed.photos) referenced.add(String(p?.id));\n'
        + '                    } catch { /* a document we cannot read references nothing */ }\n'
        + '                  }\n'
        + '                  for (const k of photoKeys.result) {\n'
        + '                    if (referenced.has(String(k))) continue;\n'
        + '                    thumbs.delete(k);\n'
        + '                    blobs.delete(k);\n'
        + '                  }\n'
        + '                };\n'
        + '              };\n'
        + '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;',
    ],
  ]);
}

test('exit 6b-1b-2 (A-57 Part 8): not vacuous — G26 (the ORPHAN SWEEP, a silent delete of a derivative that has no original) FAILS the arm whose database holds one', async () => {
  const records = coveringSeed(2);
  await assert.rejects(
    () => driveWebPort(
      async (port, db) => {
        const rows = await port.listTrips();
        assertSeededRowsUnchanged(db, records, rows, 'the faulted web port (G26), arm 2', { orphan: true });
      },
      {
        source: orphanSweepFault(),
        seed: seededDb(records, { orphan: true }),
        beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 2 under G26', { orphan: true }),
      },
    ),
    /the photo byte store/,
    'G26 walked past arm 2. §10.2 forbids a silent sweep in as many words, and the covering ' +
      'set is what has to be able to see one.',
  );
});

test('exit 6b-1b-3 (A-57 Part 8): Axis O is what catches it — G26 is GREEN against a database with no orphan, which is the required negative measurement', async () => {
  // A-39 Part 9's rule: a fault that would be caught anyway proves nothing about the axis it was
  // added for. Arm 3's every byte record is referenced by a live document, so the sweep runs and
  // correctly deletes nothing — and it is arm 2's ORPHAN, not the sweep's existence, that makes
  // the red above mean something.
  const records = coveringSeed(3);
  await driveWebPort(
    async (port, db) => {
      const rows = await port.listTrips();
      assertSeededRowsUnchanged(db, records, rows, 'G26 against an orphan-free database');
    },
    {
      source: orphanSweepFault(),
      seed: seededDb(records),
      beforeConstruct: (db) => assertSeedLanded(db, records, 'the orphan-free seed'),
    },
  );
});

for (const fault of A57_FAULTS) {
  for (const arm of [2, 3] as const) {
    test(`exit 6b-1b-${arm} (A-57 Part 8): not vacuous — ${fault.id} (${fault.axis}), firing on ${fault.fires}, FAILS the covering seed`, async () => {
      const records = coveringSeed(arm);
      await assert.rejects(
        () => driveWebPort(
          async (port, db) => {
            const rows = await port.listTrips();
            assertSeededRowsUnchanged(db, records, rows, `the faulted web port (${fault.id}), arm ${arm}`);
          },
          {
            source: storeGuardedUpcastFault(fault.id, fault.guard),
            seed: seededDb(records),
            beforeConstruct: (db) => assertSeedLanded(db, records, `arm ${arm} under ${fault.id}`),
          },
        ),
        /the key set of the (PERSISTED|RETURNED) row moved|leaves reached the store/,
        `${fault.id} walked past arm ${arm}. A-39 Part 11 item 4 fired at I-13 and A-57 Part 8 ` +
          'says the table is re-derived over the two new stores — if this is green the ' +
          're-derivation is incomplete, which is a BUILDER finding against the table.',
      );
    });
  }
}

/**
 * Arm 2's nine records with **one axis collapsed to a single state** — the shape A-39 Part 9's
 * negative measurements need, and the shape the covering table had *before* I-13. The Axis-D
 * constraint survives the collapse (`v1` implies `none`), because a fixture that broke it would
 * be measuring a state no database can be in rather than measuring the degradation.
 */
function degradedSeed(over: { d?: DocGen; b?: ByteState }): SeedRecord[] {
  return COVERING_SET.filter((cell) => cell.arm === 2).map((cell) => {
    const gen = generation(cell.s);
    const id = coverId(cell);
    const d = over.d ?? cell.d;
    const b = d === 'v1' ? 'none' : (over.b ?? cell.b);
    const trip = coverTrip(cell.c, id, b);
    return {
      trip,
      summary: ageRow(tripSummary(trip, COUNTRY_INDEX), gen),
      version: SEEDED_FENCE,
      gen,
      d,
      b,
      doc: docFor(trip, d),
      photoIds: photoIdsOf(trip),
    };
  });
}

/**
 * **A-39 Part 9's required negative half, for the two axes A-57 Part 8 adds.** *"A fault that
 * would be caught anyway proves nothing about the axis it was added for."* Each row below
 * collapses exactly one axis to the state the fixtures were in **before I-13** and measures the
 * fault as GREEN — which is R31-1's own measurement, re-run against the new axes, and is what
 * makes the reds above attributable to the re-derivation rather than to luck.
 */
const A57_NEGATIVES: ReadonlyArray<{
  id: string;
  guard: string;
  seed: () => SeedRecord[];
  why: string;
}> = [
  {
    id: 'G24',
    guard: 'd !== null && d.schemaVersion === 1',
    seed: () => degradedSeed({ d: 'v2' }),
    why: 'every document is CURRENT — Axis D as A-39 Part 4 recorded it, degenerate at domain 1',
  },
  {
    id: 'G25',
    guard: 'refs.length > 0 && refs.some((p: string) => !stored.has(p))',
    seed: () => degradedSeed({ b: 'present' }),
    why: 'every referenced photo HAS its bytes — the happy path, and §10.2\'s `missing` state absent',
  },
  {
    id: 'G27',
    guard: 'refs.length > 0 && refs.every((p: string) => stored.has(p))',
    seed: () => degradedSeed({ b: 'none' }),
    why: 'no record references a photo at all — every fixture in this file before I-13',
  },
];

for (const negative of A57_NEGATIVES) {
  test(`exit 6b-1b (A-57 Part 8): the re-derived table is what catches them — ${negative.id} is GREEN when ${negative.why}`, async () => {
    const records = negative.seed();
    await driveWebPort(
      async (port, db) => {
        // No rejection: the fault ran, its anchors applied, and it changed nothing — because the
        // state its guard reads is not in this seed.
        const rows = await port.listTrips();
        assertSeededRowsUnchanged(db, records, rows, `${negative.id} against a degraded seed`);
      },
      {
        source: storeGuardedUpcastFault(negative.id, negative.guard),
        seed: seededDb(records),
        beforeConstruct: (db) => assertSeedLanded(db, records, `the degraded seed (${negative.id})`),
      },
    );
  });
}

// ===========================================================================
// (6b-2) A TRIPWIRE. Every port hands its summary store the bare identifier it was given.
//
// **§8.4 A-36 Part 4.** This check no longer carries the weight A-33 put on it — **6b-1b above
// is what asserts the property**, by executing the port and looking at the value. Two of its
// three assertions survive, because each has value the runtime arm does not duplicate:
//
//   - the **pinned site count** — a THIRD write site writing a *correct* row is invisible to a
//     runtime check and is a design change that should fail loudly;
//   - the **bare-identifier capture** — it refuses `put(widen(summary), id)`,
//     `put(Object.assign({}, summary, …), id)` and a spread at the call site *at review time*,
//     one commit before anything reaches a port.
//
// **Its third assertion — the parameter-declaration grep — is WITHDRAWN, not scoped.** Its
// failure message claimed *"a local `const summary = { ...spread }` would pass the check
// above"*, which is a claim of coverage that is false, and G7 shows that binding it to the
// enclosing method's parameter list leaves the claim just as false. A check whose only value was
// an untrue sentence about what it catches is worth less than the sentence that replaces it.
//
// **If you are reading this because you changed a port, run `qa/i7a-idb-rowkeys.mjs`** — the
// real bytes in real Chromium, 6b-4, which A-36 Part 4 makes an obligation and not a note.
// ===========================================================================

const PORT_WRITES: Array<{
  file: string;
  /** Captures the first argument of each write to the summary store. */
  capture: RegExp;
  /** Every write to that store, so a THIRD site fails even if it passes the identifier test. */
  all: RegExp;
  sites: number;
}> = [
  {
    file: 'apps/web/src/ports/storage.ts',
    capture: /objectStore\(SUMMARIES\)\s*\.\s*put\(\s*([^,)]*?)\s*,/g,
    all: /objectStore\(SUMMARIES\)\s*\.\s*put/g,
    sites: 2,
  },
  {
    file: 'packages/client/src/ports/memory.ts',
    capture: /summaries\.set\(\s*[^,)]*?\s*,\s*([^,)]*?)\s*\)/g,
    all: /summaries\.set\(/g,
    sites: 2,
  },
];

for (const port of PORT_WRITES) {
  test(`tripwire 6b-2: ${port.file} writes the bare identifier \`summary\`, at exactly ${port.sites} sites`, () => {
    const src = readFileSync(resolve(CAIRN, port.file), 'utf8');
    const captures = [...src.matchAll(port.capture)].map((m) => m[1]);
    const writes = [...src.matchAll(port.all)].length;
    assert.equal(
      writes,
      port.sites,
      `${port.file}: ${writes} writes to the summary store, expected ${port.sites}. A new write ` +
        'site is a design change and adding one is an architect\'s ruling — and a third site ' +
        'writing a CORRECT row is invisible to 6b-1b, which is why this assertion survives ' +
        '(§8.4 A-36 Part 4). (A renamed constant lands here too, rather than silently matching ' +
        'nothing.)',
    );
    assert.deepEqual(
      captures,
      new Array(port.sites).fill('summary'),
      `${port.file}: the summary store was handed something other than the bare identifier at ` +
        'the call site. `put({ ...summary, countriesVisited }, id)` is a lifetime count in ' +
        'storage, on every write, forever, with nothing to recompute it from. This is a ' +
        'TRIPWIRE: it catches the shape at review time, and 6b-1b is what asserts the property.',
    );
  });
}

// ===========================================================================
// (6b-3) The port census, so a third implementation cannot appear unpoliced.
// ===========================================================================

/** The two implementations, the interface, and the one caller — the same four §4.3 reasons about. */
const PORT_CENSUS = [
  'apps/web/src/ports/storage.ts',
  'packages/client/src/ports/memory.ts',
  'packages/client/src/ports/types.ts',
  'packages/client/src/store/store.ts',
];

test('exit 6b-3: exactly four source files mention refreshSummary', () => {
  const hits = sourceFiles().filter((f) => /refreshSummary/.test(readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(
    hits.sort(),
    [...PORT_CENSUS].sort(),
    'the StoragePort population moved. A new `StoragePort` implementation needs an EXECUTED ' +
      '6b-1 arm of its own — not a 6b-2 recipe: no port is policed by reading its source ' +
      '(§8.4 A-36 Part 2), and Phase 5\'s expo-sqlite port is the next one. Adding an arm is ' +
      'mechanical; widening this census is an ARCHITECT\'S ruling.',
  );
});

// ===========================================================================
// (6b-5) Nothing that persists anything imports `travelStats`. Unchanged from revision 24,
// including its inconclusiveness guard: it is the one existing check that already asserts a
// property of the persistence layer rather than of a name.
// ===========================================================================

test('exit 6b-5: nothing that persists anything imports travelStats', () => {
  const persisters = sourceFiles().filter((f) => {
    const r = rel(f);
    return /\/(?:ports|serialize)\//.test(r) || /\/store(?:\/|\.ts$)/.test(r);
  });
  assert.ok(persisters.length >= 5, `INCONCLUSIVE: only ${persisters.length} persistence files found`);
  const offenders = persisters.filter((f) => /travelStats|TravelStats/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map(rel), [], 'a lifetime statistic reached the persistence layer');
});

// ===========================================================================
// The source sweep, demoted to a SECONDARY TRIPWIRE (A-33 Part 4).
//
// Not deleted: it is the only check that can see a lifetime count **before** it is written —
// `countriesVisited: number` on `Trip`, and an exported `lifetimeTotals` object literal in the
// store, are caught here and nowhere else — and a check that catches an intent one commit early
// is worth keeping once it has stopped being the thing that was supposed to catch a value.
// Its being name-based is now acceptable *because it is not load-bearing*: everything that
// reaches storage is covered by 6a′ and 6b-1/6b-2.
// ===========================================================================

/** A-33 Part 5: every source tree this repo ships. `packages/tokens/src` joins at revision 25. */
const ROOTS = ['packages/core/src', 'packages/client/src', 'apps/web/src', 'packages/tokens/src'];

/**
 * The only count-shaped numeric declarations permitted in the source trees, as `<path>::<name>`,
 * each with the reason it is not a stored lifetime statistic.
 */
const SOURCE_ALLOW: Record<string, string> = {
  // TripSummaryRow's own fields — a property of exactly one document, minted inside the write
  // that carries it (§8.4 clause 1) and stamped with SUMMARY_VERSION (clause 3).
  'packages/core/src/derive/summary.ts::cityCount': 'TripSummaryRow, clause 1 + clause 3',
  'packages/core/src/derive/summary.ts::dayCount': 'TripSummaryRow, clause 1 + clause 3',
  'packages/core/src/derive/summary.ts::stopCount': 'TripSummaryRow, clause 1 + clause 3',
  'packages/core/src/derive/summary.ts::poolCount': 'TripSummaryRow, clause 1 + clause 3',
  'packages/core/src/derive/summary.ts::located': 'AttributionCensus on TripSummaryRow (A-31 Part 2)',
  'packages/core/src/derive/summary.ts::attributed': 'AttributionCensus on TripSummaryRow (A-31 Part 2)',
  // `TravelStats` is the RETURN TYPE of a pure function. It summarises a set of documents, which
  // is exactly the thing that may not be stored — and it is not: it has no storage
  // representation at all, which 6b-5 above pins mechanically.
  'packages/core/src/derive/travelStats.ts::cities': 'TravelRecordCensus — derived, never stored',
  'packages/core/src/derive/travelStats.ts::places': 'TravelRecordCensus — derived, never stored',
  'packages/core/src/derive/travelStats.ts::stops': 'TravelRecordCensus — derived, never stored',
  'packages/core/src/derive/travelStats.ts::daysTravelled': 'TravelStats — derived, never stored',
  'packages/core/src/derive/travelStats.ts::unnamedCities': 'TravelStats — derived, never stored',
  // A rule's look-ahead WINDOW, in days (§2.7 A-17). A duration, not a count of anything a
  // traveller did, and it is a compile-time property of a `RuleSpec` — it is never written to a
  // document, a summary row or `AppState`. The classifier is deliberately wide enough to catch
  // it, because a classifier narrow enough to miss it would miss `daysVisited` too.
  'packages/core/src/conflict/rules/types.ts::horizonDays': 'RuleSpec look-ahead window — a duration, not a tally',
  'packages/core/src/conflict/detect.ts::horizonDays': 'RuleSpec look-ahead window — a duration, not a tally',
};

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = resolve(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(p)) out.push(p);
    }
  };
  for (const r of ROOTS) walk(resolve(CAIRN, r));
  return out.sort();
}

/**
 * Comments stripped — **required, not cosmetic**: without it the numeric-literal sweep below
 * hits `derive/travelStats.ts`'s own docstring quoting A-31's rule (`countriesVisited: 47`),
 * which would be a false positive on prose that must stay in the file.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/** Every count-shaped name declared or initialised as a number in one file. */
function countShapedHits(src: string): string[] {
  const clean = stripComments(src);
  // Widening 2: a local `type X = number` alias counts as `number`.
  const aliases = [...clean.matchAll(/^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*number\s*;/gm)]
    .map((m) => m[1]);
  const typed = new RegExp(`([A-Za-z$_][\\w$]*)\\??\\s*:\\s*(?:number${aliases.map((a) => `|${a}`).join('')})\\b`, 'g');
  const names = [...clean.matchAll(typed)].map((m) => m[1]);
  // Widening 3: a count-shaped property initialised to a numeric literal is a count whether or
  // not anyone annotated it.
  names.push(...[...clean.matchAll(/([A-Za-z$_][\w$]*)\s*:\s*(-?\d)/g)].map((m) => m[1]));
  return names.filter(countShaped);
}

test('tripwire: no count of countries, cities, trips or days is declared outside TripSummaryRow', () => {
  const hits: string[] = [];
  for (const file of sourceFiles()) {
    for (const name of countShapedHits(readFileSync(file, 'utf8'))) {
      const key = `${rel(file)}::${name}`;
      if (!(key in SOURCE_ALLOW)) hits.push(key);
    }
  }
  assert.deepEqual(
    [...new Set(hits)].sort(),
    [],
    'a count of countries, cities, trips or days was declared outside TripSummaryRow. Every ' +
      'number that summarises more than one trip is computed on read and has no storage ' +
      'representation at all (§8.4 A-31 Part 6). A stored countriesVisited: 47 is a second ' +
      'source of truth a user can inflate by typing.',
  );
});

test('tripwire: the allow-list is a ceiling — every entry is still present in the source', () => {
  // Without this, deleting a field would leave a stale entry that silently permits its return.
  const seen = new Set<string>();
  for (const file of sourceFiles()) {
    for (const name of countShapedHits(readFileSync(file, 'utf8'))) seen.add(`${rel(file)}::${name}`);
  }
  assert.deepEqual(
    Object.keys(SOURCE_ALLOW).filter((k) => !seen.has(k)),
    [],
    'the allow-list names a declaration that no longer exists — remove the line',
  );
});

test('tripwire: every root resolves to a real directory with sources in it', () => {
  // A renamed package must fail loudly rather than silently scanning nothing.
  for (const r of ROOTS) {
    const dir = resolve(CAIRN, r);
    assert.ok(statSync(dir).isDirectory(), `${r} is not a directory`);
  }
  const byRoot = new Map<string, number>();
  for (const f of sourceFiles()) {
    const root = ROOTS.find((r) => rel(f).startsWith(`${r}/`)) as string;
    byRoot.set(root, (byRoot.get(root) ?? 0) + 1);
  }
  for (const r of ROOTS) assert.ok((byRoot.get(r) ?? 0) > 0, `${r} contributed no source files`);
});
