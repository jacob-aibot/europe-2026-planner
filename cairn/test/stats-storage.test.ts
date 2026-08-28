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
import { COUNTRY_INDEX, SUMMARY_VERSION, tripSummary, createTrip, sequentialIds } from '../packages/core/src/index.ts';
import type { Trip, TripSummaryRow } from '../packages/core/src/index.ts';
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
 */
const ROW_PATHS = [
  'attribution.places.attributed',
  'attribution.places.located',
  'attribution.stops.attributed',
  'attribution.stops.located',
  'cities[].countryCode',
  'cities[].countrySource',
  'cities[].key',
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

/** The eight count-shaped fields §8.4 A-31 Part 6 permits on the row, as dotted paths. */
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
// The three rows the leaf-path union is taken over. One row cannot cover the set, because an
// empty collection contributes no path (A-33 Part 2 assertion 3).
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

const THREE_ROWS = () => [referenceRow(), nullCountryRow(), emptyRow()];

test('exit 6a: a minted row\'s TOP-LEVEL keys are exactly the type\'s — no more, no fewer', () => {
  for (const row of THREE_ROWS()) {
    assert.deepEqual(
      Object.keys(row).sort(),
      Object.keys(ROW_KEYS).sort(),
      'a field was minted but not typed, or typed but not minted. A field on TripSummaryRow is a ' +
        'field in storage and SUMMARY_VERSION has to move with it — widening ROW_KEYS is an ' +
        'ARCHITECT\'S ruling (ARCHITECTURE §8.4 A-33 Part 2), not a builder\'s.',
    );
  }
});

test('exit 6a: the union of three rows\' LEAF PATHS is exactly ROW_PATHS', () => {
  const union = new Set<string>();
  for (const row of THREE_ROWS()) for (const p of leafPaths(row)) union.add(p);
  assert.deepEqual(
    [...union].sort(),
    [...ROW_PATHS].sort(),
    'the row grew or lost a leaf. Not the count-shaped ones — EVERY key: `daysAbroad: number` ' +
      'carries no counting suffix and no plural domain noun, and that is exactly how a minted ' +
      'lifetime count walked past the revision-24 classifier (§8.4 A-33 Part 1).',
  );
  // Each row individually is a SUBSET, which is what catches an injection into a row that is
  // not the reference one.
  for (const row of THREE_ROWS()) {
    const extra = leafPaths(row).filter((p) => !ROW_PATHS.includes(p));
    assert.deepEqual(extra, [], `a row carries leaves the type does not: ${extra.join(', ')}`);
  }
});

test('exit 6a: the three rows are genuinely different, so the union is not one row three times', () => {
  const [ref, nul, empty] = THREE_ROWS();
  assert.ok(leafPaths(ref).includes('cities[].countryCode'));
  assert.equal(nul.cities.length, 1, 'the null-country row lost its city');
  assert.equal(nul.cities[0].countryCode, null, 'the "unplaceable" city was placed after all');
  assert.deepEqual(empty.cities, [], 'the empty row is not empty');
  assert.deepEqual(empty.countryCodes, []);
  assert.equal(leafPaths(empty).includes('cities[].name'), false, 'an empty collection contributed a path');
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
 */
function recordingIdb() {
  const stores = new Map<string, Map<string, unknown>>();
  const at = (n: string) => { if (!stores.has(n)) stores.set(n, new Map()); return stores.get(n)!; };
  let version = 0;

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
 */
async function driveWebPort(fn: (port: StoragePort, db: Recording) => Promise<void>, source?: string): Promise<void> {
  const db = recordingIdb();
  const had = 'indexedDB' in globalThis;
  const prior = (globalThis as Record<string, unknown>).indexedDB;
  (globalThis as Record<string, unknown>).indexedDB = db;
  try {
    const make = await loadWebPort(source);
    await fn(make(), db);
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

test('exit 6b-1b: the web port EXECUTED — every value that reaches its summary store is clean', async () => {
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

test('exit 6b-1b: the web port EXECUTED — every row it HANDS BACK is clean', async () => {
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

test('exit 6b-1b: the double is not lying — the port\'s OUTCOMES are asserted, not just its keys', async () => {
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

test('exit 6b-1b: the arm is not vacuous — a port that widens its rows FAILS it', async () => {
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
    }, faulted),
    /not on TripSummaryRow|leaves reached the store/,
    'G7\'s shape — the parameter reassigned in place before an unchanged put — walked past 6b-1b',
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
