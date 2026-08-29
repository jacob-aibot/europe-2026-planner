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

/** A record as it sits in a pre-existing database. `version: null` is the LEGACY shape. */
type SeedRecord = { trip: Trip; summary: TripSummaryRow; version: string | null };

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
  for (const [id, row] of db._store('summaries')) {
    assert.deepEqual(
      Object.keys(row as TripSummaryRow).sort(),
      Object.keys(ROW_KEYS).sort(),
      `${where}: the seeded row for ${id} is not ROW_KEYS-shaped BEFORE the port runs, so a ` +
        'widening found afterwards could not be attributed to the port',
    );
  }
}

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

test('exit 6b-1b-2: STARTING STATE = an existing CURRENT database (doc + summary + version, no upgrade). The upcast runs and correctly does nothing', async () => {
  const { trip, summary } = webRow('t-current');
  const records: SeedRecord[] = [{ trip, summary, version: SEEDED_FENCE }];
  await driveWebPort(
    async (port, db) => {
      const rows = await port.listTrips();
      // The property, on both sides: what is in the store, and what the port hands back.
      assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the web port, seeded current: summaries');
      assertRowsAreClean(rows, 'the web port, seeded current: listTrips');
      // And the assertions that prove THIS path ran and did what it should. §4.3 A-30 applied
      // to the upcast: arm A's whole job is to leave a record that already has a fence alone.
      assert.equal(
        db._store('versions').get(trip.id),
        SEEDED_FENCE,
        'the upcast moved a StorageVersion it was handed. A fence the port did not mint is a ' +
          'fence another tab may be holding (§4.3 A-30, §2.2a) — arm A exists to skip it.',
      );
      assert.equal(db._store('versions').size, 1, 'the upcast added a version for a record with no document');
      assert.equal(db._summaries().size, 1, 'the upcast added or dropped a summary row');
      assert.equal(db._store('docs').get(trip.id), JSON.stringify(trip), 'the upcast rewrote the document');
      assert.equal(rows.length, 1, 'INCONCLUSIVE: the seeded row was not returned');
      assert.equal(rows[0].id, trip.id, 'INCONCLUSIVE: a different record came back');
    },
    { seed: seededDb(records), beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 2') },
  );
});

test('exit 6b-1b-3: STARTING STATE = an existing LEGACY database (doc + summary, NO version). The stamping branch runs — this is the arm G13 dies in', async () => {
  const { trip, summary } = webRow('t-legacy');
  const records: SeedRecord[] = [{ trip, summary, version: null }];
  await driveWebPort(
    async (port, db) => {
      const rows = await port.listTrips();
      assertRowsAreClean([...db._summaries().values()] as TripSummaryRow[], 'the web port, seeded legacy: summaries');
      assertRowsAreClean(rows, 'the web port, seeded legacy: listTrips');

      // The stamp: `versions` was empty and gains EXACTLY ONE non-empty entry.
      assert.equal(db._store('versions').size, 1, 'the upcast did not stamp the versionless record exactly once');
      const minted = db._store('versions').get(trip.id);
      assert.equal(typeof minted, 'string');
      assert.ok((minted as string).length > 0, 'the upcast stamped an empty token');
      assert.notEqual(minted, SEEDED_FENCE, 'INCONCLUSIVE: the seeded fence leaked into the legacy arm');
      // Nothing else moved.
      assert.equal(db._summaries().size, 1, 'the upcast added or dropped a summary row');
      assert.equal(db._store('docs').get(trip.id), JSON.stringify(trip), 'the upcast rewrote the document');

      // **The assertion that proves the stamp actually landed**: `load()` REJECTS a record with
      // no envelope version (*"storage: record … has no envelope version"*), so it cannot
      // resolve at all unless arm B wrote one.
      const loaded = await port.load(trip.id);
      assert.ok(loaded, 'load() returned null for a seeded document');
      assert.equal(loaded.doc, JSON.stringify(trip), 'load() handed back a document the seed did not put there');
      assert.equal(loaded.version, minted, 'load() returned a fence other than the newly minted one');
    },
    { seed: seededDb(records), beforeConstruct: (db) => assertSeedLanded(db, records, 'arm 3') },
  );
});

test('exit 6b-1b-4: STARTING STATE = a MIXED database — one legacy id and one current id, both arms of the upcast loop in one run', async () => {
  // A real upgraded database is mixed; an arm that is uniformly legacy or uniformly current
  // tests half a loop.
  const legacy = webRow('t-mixed-legacy');
  const current = webRow('t-mixed-current');
  const records: SeedRecord[] = [
    { trip: legacy.trip, summary: legacy.summary, version: null },
    { trip: current.trip, summary: current.summary, version: SEEDED_FENCE },
  ];
  await driveWebPort(
    async (port, db) => {
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
    const fixture = seededDb([{ trip, summary, version: SEEDED_FENCE }]);
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
  const records: SeedRecord[] = [{ trip, summary, version: SEEDED_FENCE }];
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
  const records: SeedRecord[] = [{ trip, summary, version: SEEDED_FENCE }];
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
  const records: SeedRecord[] = [{ trip, summary, version: null }];
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
    { trip: legacy.trip, summary: legacy.summary, version: null },
    { trip: current.trip, summary: current.summary, version: SEEDED_FENCE },
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

test('exit 6b-1b: the SEED-INTEGRITY assertion is itself not vacuous — a mis-spelled store name is caught BEFORE the port runs', async () => {
  // A-38 Part 4's reasoning, tested rather than asserted: without this, a typo in a store name
  // silently yields an EMPTY database, arms 2-4 degrade back into arm 1, and the gate reports
  // green — R30-1 re-created inside the fix for R30-1, with the same signature.
  const { trip, summary } = webRow('t-typo');
  const records: SeedRecord[] = [{ trip, summary, version: null }];
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
