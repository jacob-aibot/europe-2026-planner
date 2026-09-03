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
import { COUNTRY_INDEX, SUMMARY_VERSION, tripSummary, createTrip, addStop, sequentialIds, toJSON, fromJSON } from '../packages/core/src/index.ts';
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
 */
type SeedRecord = { trip: Trip; summary: TripSummaryRow; version: string | null; gen: GenEntry };

/**
 * A whole starting state. **Minted through `createTrip`/`tripSummary`, never hand-typed** — a
 * literal row would go stale the next time the row is widened and would defeat the very key
 * assertion it is the subject of, and it is load-bearing at run time too (`listTrips()` sorts on
 * `startDate` and `title`, so a stub throws inside the port instead of failing an assertion).
 */
function seededDb(records: readonly SeedRecord[]): Seed {
  const docs: Record<string, unknown> = {};
  const summaries: Record<string, unknown> = {};
  const versions: Record<string, unknown> = {};
  for (const r of records) {
    docs[r.trip.id] = JSON.stringify(r.trip);
    summaries[r.trip.id] = r.summary;
    if (r.version !== null) versions[r.trip.id] = r.version;
  }
  // All three stores are named even when empty, so `versions: {}` is an EXISTING empty store
  // rather than an absent one — which is exactly the legacy database's shape.
  return { dbVersion: portDbVersion(), stores: { docs, summaries, versions } };
}

/**
 * **A-38 Part 4's seed-integrity assertion, and it is not optional.** A mis-spelled store name
 * silently yields an *empty* database, at which point arms 2–4 degrade back into arm 1 and
 * report green — which is R30-1, re-created inside the fix for R30-1, with the same signature.
 * The before/after pair on the summary record's key set is also what makes a red attributable:
 * clean before, widened after, therefore **the port** did it.
 */
function assertSeedLanded(db: Recording, records: readonly SeedRecord[], where: string): void {
  const ids = records.map((r) => r.trip.id).sort();
  const versioned = records.filter((r) => r.version !== null).map((r) => r.trip.id).sort();
  assert.ok(ids.length > 0, `${where}: INCONCLUSIVE — an empty seed is arm 1 wearing arm 2's name`);
  assert.deepEqual([...db._store('docs').keys()].sort(), ids, `${where}: the docs seed did not land`);
  assert.deepEqual([...db._store('summaries').keys()].sort(), ids, `${where}: the summaries seed did not land`);
  assert.deepEqual([...db._store('versions').keys()].sort(), versioned, `${where}: the versions seed did not land`);
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
// Five axes, derived line by line in A-39 Part 3/4:
//
//   **V** envelope-version presence      {present, absent}                             domain 2
//   **S** summary-row generation   {gen-1 … gen-5, gen-future}  domain 6  (5 until A-56/I-12)
//   **C** row content                    {rich, degenerate, unattributed}               domain 3
//   **D** document generation            {v1} — `SCHEMA_VERSION` is 1                   domain 1
//   **N** loop population                {0, ≥1 uniform, ≥2 spanning both V}            domain 3
//
// The cover is **pairwise over {V, S, C}** and structural over N and P (fixture provenance).
// The lower bound on a pairwise covering array is the product of the two largest domains —
// `|S| × |C| = 6 × 3 = 18` — and the table below achieves it, so **18 is minimal, not chosen**.
// 3-wise is refused on the record (A-39 Part 5): a fault requiring three simultaneous state
// conditions is not a single edit and has no instance among the seventeen faults in the matrix.
//
// **What reopens this** (A-39 Part 11): a `SUMMARY_VERSION` bump (→ 3 more rows; fired once
// already, at A-56/I-12, which is what took this table from 15 to 18), a `SCHEMA_VERSION`
// bump (no new rows, D absorbed), `DatePrecision`/`countrySource` gaining a member (→ +6), a
// new object store, a new `StoragePort`, a fourth write path, or `onupgradeneeded` growing a
// body that writes records. **What does NOT**: *"here is one more fault shape whose guard reads
// a field already on V, S, C, D or N."* If such a fault is green, the covering set has been
// IMPLEMENTED wrongly — a table row is missing, a fixture has rotted into another state, or an
// assertion is not per-id — and that is a **builder** finding against the table below, with the
// table itself as the oracle.
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

type CoverCell = { n: number; s: GenName; c: ContentName; v: 'present' | 'absent'; arm: 2 | 3 };

const COVERING_SET: readonly CoverCell[] = [
  { n: 1,  s: 'gen-1',      c: 'rich',         v: 'present', arm: 2 },
  { n: 2,  s: 'gen-1',      c: 'degenerate',   v: 'absent',  arm: 3 },
  { n: 3,  s: 'gen-1',      c: 'unattributed', v: 'present', arm: 2 },
  { n: 4,  s: 'gen-2',      c: 'rich',         v: 'absent',  arm: 3 },
  { n: 5,  s: 'gen-2',      c: 'degenerate',   v: 'present', arm: 2 },
  { n: 6,  s: 'gen-2',      c: 'unattributed', v: 'absent',  arm: 3 },
  { n: 7,  s: 'gen-3',      c: 'rich',         v: 'present', arm: 2 },
  { n: 8,  s: 'gen-3',      c: 'degenerate',   v: 'absent',  arm: 3 },
  { n: 9,  s: 'gen-3',      c: 'unattributed', v: 'present', arm: 2 },
  { n: 10, s: 'gen-4',      c: 'rich',         v: 'absent',  arm: 3 },
  { n: 11, s: 'gen-4',      c: 'degenerate',   v: 'present', arm: 2 },
  { n: 12, s: 'gen-4',      c: 'unattributed', v: 'absent',  arm: 3 },
  // A-56's three new rows, in ledger position rather than appended, so the table reads in the
  // same order as `LEDGER` and `gen-future` stays last.
  { n: 13, s: 'gen-5',      c: 'rich',         v: 'present', arm: 2 },
  { n: 14, s: 'gen-5',      c: 'degenerate',   v: 'absent',  arm: 3 },
  { n: 15, s: 'gen-5',      c: 'unattributed', v: 'present', arm: 2 },
  { n: 16, s: 'gen-future', c: 'rich',         v: 'absent',  arm: 3 },
  { n: 17, s: 'gen-future', c: 'degenerate',   v: 'present', arm: 2 },
  { n: 18, s: 'gen-future', c: 'unattributed', v: 'absent',  arm: 3 },
];

const coverId = (cell: CoverCell) => `t-cov${String(cell.n).padStart(2, '0')}-${cell.s}-${cell.c}`;

/** The seeded records one arm carries, built from the table rather than written beside it. */
function coveringSeed(arm: 2 | 3): SeedRecord[] {
  return COVERING_SET.filter((cell) => cell.arm === arm).map((cell) => {
    const gen = generation(cell.s);
    const id = coverId(cell);
    const trip = contentTrip(cell.c, id);
    return {
      trip,
      summary: ageRow(tripSummary(trip, COUNTRY_INDEX), gen),
      version: cell.v === 'present' ? SEEDED_FENCE : null,
      gen,
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
): void {
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

test('exit 6b-1b-2: STARTING STATE = an existing CURRENT database (no upgrade), seeded with A-39\'s NINE V=present covering records. The upcast runs and correctly does nothing — PER ID', async () => {
  const records = coveringSeed(2);
  await driveWebPort(
    async (port, db) => {
      const rows = await port.listTrips();
      // The property, on both sides — what is in the store and what the port hands back —
      // **per id, against the key set each record was SEEDED with** (A-39 Part 7 point 2).
      assertSeededRowsUnchanged(db, records, rows, 'the web port, seeded current');
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
        assert.equal(db._store('docs').get(r.trip.id), JSON.stringify(r.trip), `the upcast rewrote the document for ${r.trip.id}`);
      }
      assert.equal(db._store('versions').size, records.length, 'the upcast added a version for a record with no document');
      assert.equal(db._summaries().size, records.length, 'the upcast added or dropped a summary row');
      assert.equal(records.length, 9, 'A-39 Part 5: arm 2 carries the NINE V=present rows of the covering table');
      assert.deepEqual(
        records.map((r) => r.gen.name),
        COVERING_SET.filter((c) => c.arm === 2).map((c) => c.s),
        'INCONCLUSIVE: the seeded generations are not the ones the table assigns to arm 2',
      );
    },
    { seed: seededDb(records), beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 2') },
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
        assert.equal(db._store('docs').get(r.trip.id), JSON.stringify(r.trip), `the upcast rewrote the document for ${r.trip.id}`);
      }
      assert.equal(minted.size, records.length, 'the upcast reused one minted token across records (§2.2a rule 2)');
      assert.equal(db._summaries().size, records.length, 'the upcast added or dropped a summary row');

      // **The assertion that proves the stamp actually landed**: `load()` REJECTS a record with
      // no envelope version (*"storage: record … has no envelope version"*), so it cannot
      // resolve at all unless arm B wrote one. Per id, so a red names the record.
      for (const r of records) {
        const loaded = await port.load(r.trip.id);
        assert.ok(loaded, `load() returned null for the seeded document ${r.trip.id}`);
        assert.equal(loaded.doc, JSON.stringify(r.trip), `load() handed back a document the seed did not put there for ${r.trip.id}`);
        assert.equal(loaded.version, db._store('versions').get(r.trip.id), `load() returned a fence other than the newly minted one for ${r.trip.id}`);
      }
      assert.deepEqual(
        records.map((r) => r.gen.name),
        COVERING_SET.filter((c) => c.arm === 3).map((c) => c.s),
        'INCONCLUSIVE: the seeded generations are not the ones the table assigns to arm 3',
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
    { trip: legacy.trip, summary: legacy.summary, version: null, gen: CURRENT_GEN },
    { trip: current.trip, summary: current.summary, version: SEEDED_FENCE, gen: CURRENT_GEN },
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
    const fixture = seededDb([{ trip, summary, version: SEEDED_FENCE, gen: CURRENT_GEN }]);
    for (const name of Object.keys(fixture.stores ?? {})) {
      assert.deepEqual(
        [...db._store(name).keys()],
        [trip.id],
        `fixture drift: the port did not write store \`${name}\` that arms 2-4 seed`,
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
  const records: SeedRecord[] = [{ trip, summary, version: SEEDED_FENCE, gen: CURRENT_GEN }];
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
  const records: SeedRecord[] = [{ trip, summary, version: SEEDED_FENCE, gen: CURRENT_GEN }];
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
  const records: SeedRecord[] = [{ trip, summary, version: null, gen: CURRENT_GEN }];
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
    { trip: legacy.trip, summary: legacy.summary, version: null, gen: CURRENT_GEN },
    { trip: current.trip, summary: current.summary, version: SEEDED_FENCE, gen: CURRENT_GEN },
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
    return { trip, summary: tripSummary(trip, COUNTRY_INDEX), version: SEEDED_FENCE, gen: CURRENT_GEN };
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
    return {
      trip,
      summary: versionOnly(tripSummary(trip, COUNTRY_INDEX), gen),
      version: SEEDED_FENCE,
      // The seed is asserted against the CURRENT key set, because that is what a version-only
      // aged row actually has — which is the whole point of the measurement.
      gen: CURRENT_GEN,
    };
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
      return { trip, summary: ageRow(tripSummary(trip, COUNTRY_INDEX), gen), version: SEEDED_FENCE, gen };
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
  const records: SeedRecord[] = [{ trip, summary, version: null, gen: CURRENT_GEN }];
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
