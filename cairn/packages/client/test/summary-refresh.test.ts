/**
 * **A summary refresh is not a document write** — ARCHITECTURE §4.3 **A-30**, ROADMAP Phase 2
 * **I-6a**. Plus round 26's R26-1, R26-2 and R26-3, which are about what the pass *remembers*.
 *
 * I-6 brought a stale row current by rewriting the whole record:
 * `saveIfVersion(id, stored.version, toJSON(doc), summary)`. The document bytes going in were
 * the bytes that came out — nothing about the trip had changed — but `saveIfVersion` mints,
 * because minting on every success is the only contract it has. The bill (QA **R26-6**): tab A
 * holds a trip open and idle, tab B boots and runs the ordinary `refreshLibrary()` →
 * `rescanSummaries()`, and tab A's next keystroke is refused with the full `CONFLICT_MESSAGE`
 * over a stored copy whose document is byte-identical to the one tab A is holding. A conflict
 * banner and a *Merge* button, with nothing to merge, raised by a background pass with no user
 * on the other side.
 *
 * A-30's ruling, and the property this file exists to pin: **the fence fences the document.**
 * Equality of a `StorageVersion` asserts the document bytes have not changed and asserts
 * nothing about the summary row stored beside them. So a write that can change the document
 * MUST mint, and a write that changes only the summary MUST NOT — which is `refreshSummary`,
 * and which is why the rescan's per-row link is now uniform for every row *including the
 * active one*: `load` → `fromJSON` → `tripSummary` → `refreshSummary`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, RESCAN_MAX_PASSES, summaryScan,
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler, manualScheduler,
  core,
} from '../src/index.ts';
import type { MemoryStorage, Ports, StorageVersion, TripDoc } from '../src/index.ts';

type TripSummaryRow = core.TripSummaryRow;

const TODAY = '2026-08-01';
let seq = 0;

function ports(storage: MemoryStorage): Ports {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(`x${++seq}-`),
    scheduler: immediateScheduler(),
  };
}

/** Two cities in two countries, so a row carrying the wrong one is visible, not plausible. */
const PLACES = {
  vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
  dubrovnik: { key: 'dubrovnik', name: 'Dubrovnik', countryCode: 'HR', centre: { lat: 42.6507, lng: 18.0944 } },
};

function makeTrip(id: string, city: keyof typeof PLACES): core.Trip {
  return core.createTrip(
    {
      id,
      title: `Trip ${id}`,
      startDate: '2026-08-07',
      endDate: '2026-08-09',
      homeCurrency: 'EUR',
      cities: [PLACES[city]],
    },
    { ids: core.sequentialIds(`${id}-`), now: TODAY, actorUserId: core.LOCAL_OWNER },
  );
}

/** The row as a build older than the current `SUMMARY_VERSION` wrote it. */
function staleRow(doc: core.Trip): TripSummaryRow {
  return {
    id: doc.id,
    title: doc.title,
    startDate: doc.startDate,
    endDate: doc.endDate,
    datePrecision: doc.datePrecision,
    cityCount: doc.cities.length,
    dayCount: doc.days.length,
    stopCount: 0,
    poolCount: 0,
    revision: doc.revision,
  } as unknown as TripSummaryRow;
}

async function seed(
  storage: MemoryStorage,
  doc: core.Trip,
  row: TripSummaryRow = staleRow(doc),
  body: TripDoc = core.toJSON(doc),
): Promise<void> {
  const out = await storage.saveIfVersion(doc.id, null, body, row);
  assert.equal(out.ok, true, `seeding ${doc.id} failed`);
}

const rowFor = (s: { library: TripSummaryRow[] }, id: string) =>
  s.library.find((r) => r.id === id) as TripSummaryRow;

// ---------------------------------------------------------------------------
// A-30 (a) — the fence does not move. The assertion whose absence let R26-6 ship.
// ---------------------------------------------------------------------------

test('A-30: a background rescan in one tab does not move another tab\'s write fence', async () => {
  const storage = memoryStorage();
  const open = makeTrip('y-hr', 'dubrovnik');
  await seed(storage, open);
  await seed(storage, makeTrip('y-at', 'vienna'));

  // Tab A: holds trip Y open, clean, idle. It never asked for a rescan.
  const tabA = createStore({ ports: ports(storage) });
  await tabA.refreshLibrary();
  await tabA.openTrip('y-hr');
  // Captured through the port's own map, never asserted as a literal — §2.2a rule 3's
  // corollary: a `StorageVersion` is opaque and is compared for equality only.
  const V = storage.versions.get('y-hr') as StorageVersion;
  const bytesBefore = storage.docs.get('y-hr') as TripDoc;
  const savesBefore = storage.saveCount;
  assert.equal(tabA.getState().persistence.savedVersion, V, 'precondition: the fence is Y\'s own version');

  // Tab B boots — exactly `App.tsx`'s boot sequence.
  const tabB = createStore({ ports: ports(storage) });
  await tabB.refreshLibrary();
  await tabB.rescanSummaries();

  assert.equal(storage.versions.get('y-hr'), V, 'the rescan minted a new version for a document it did not change');
  assert.equal(storage.docs.get('y-hr'), bytesBefore, 'the rescan rewrote the document');
  assert.equal(storage.saveCount, savesBefore, 'the rescan issued a document write');

  // …and the consequence that is the whole point: tab A's next keystroke still lands.
  tabA.dispatch({ type: 'setTripMeta', patch: { title: 'Croatia, renamed by the user' } });
  await tabA.flush();
  const s = tabA.getState();
  assert.equal(s.persistence.status, 'idle', `tab A was refused: ${s.persistence.lastError}`);
  assert.equal(
    core.fromJSON((await storage.load('y-hr'))!.doc).title,
    'Croatia, renamed by the user',
    'tab A\'s edit did not reach storage',
  );
});

// ---------------------------------------------------------------------------
// A-30 (b) — and the row is still brought current, which is what the pass is for.
// ---------------------------------------------------------------------------

test('A-30: the row is still brought current, from the document STORAGE holds', async () => {
  const storage = memoryStorage();
  const open = makeTrip('b-hr', 'dubrovnik');
  await seed(storage, open);
  await seed(storage, makeTrip('b-at', 'vienna'));

  const tabA = createStore({ ports: ports(storage) });
  await tabA.refreshLibrary();
  await tabA.openTrip('b-hr');

  const tabB = createStore({ ports: ports(storage) });
  await tabB.refreshLibrary();
  await tabB.rescanSummaries();

  const stored = await storage.listTrips();
  for (const id of ['b-hr', 'b-at']) {
    const row = stored.find((r) => r.id === id) as TripSummaryRow;
    assert.equal(row.summaryVersion, core.SUMMARY_VERSION, `${id} was left below the version`);
  }
  assert.deepEqual(stored.find((r) => r.id === 'b-hr')!.countryCodes, ['HR']);
  assert.deepEqual(stored.find((r) => r.id === 'b-at')!.countryCodes, ['AT']);
  assert.equal(summaryScan(tabB.getState()).phase, 'complete');
  // The refresh is a real port call, counted separately from a document write.
  assert.equal(storage.refreshCount, 2, 'one refresh per stale row');
});

test('A-30: the ACTIVE trip takes the same path as every other row — no attemptSave branch', async () => {
  const storage = memoryStorage();
  await seed(storage, makeTrip('u-hr', 'dubrovnik'));
  await seed(storage, makeTrip('u-at', 'vienna'));

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.openTrip('u-hr');
  const savesBefore = storage.saveCount;
  const refreshesBefore = storage.refreshCount;
  await store.rescanSummaries();

  assert.equal(storage.saveCount, savesBefore, 'the active trip was written as a DOCUMENT by the rescan');
  assert.equal(storage.refreshCount - refreshesBefore, 2, 'the active row did not go through refreshSummary');
  assert.equal(summaryScan(store.getState()).phase, 'complete');
  assert.equal(rowFor(store.getState(), 'u-hr').summaryVersion, core.SUMMARY_VERSION);
  assert.equal(store.getState().persistence.status, 'idle');
});

/**
 * §8.4 clause 3 property 4, as A-30 replaces it: *the row is computed from the document
 * **storage holds**, and `state.doc` is not consulted by this path.* Under I-6 the rescan
 * routed the active trip through `attemptSave`, which has no `dirty()` skip, so a half-typed
 * title reached storage ahead of its own 400 ms debounce (round 26 §F). It no longer can.
 */
test('A-30: an unsaved in-memory edit is neither flushed early nor described by a row', async () => {
  const storage = memoryStorage();
  const doc = makeTrip('d-at', 'vienna');
  await seed(storage, doc);

  // A manual scheduler, so the 400 ms debounce is genuinely still armed rather than having
  // already fired: the question is whether the RESCAN writes the edit, not whether autosave does.
  const sched = manualScheduler();
  const store = createStore({ ports: { ...ports(storage), scheduler: sched } });
  await store.refreshLibrary();
  await store.openTrip('d-at');
  await store.dispatch({ type: 'setTripMeta', patch: { title: 'half-typed, debounce still pending' } });
  assert.ok(sched.pending.length > 0, 'INCONCLUSIVE: the debounce is not armed');
  assert.equal(
    core.fromJSON((await storage.load('d-at'))!.doc).title,
    'Trip d-at',
    'INCONCLUSIVE: the edit was already in storage',
  );

  await store.rescanSummaries();

  assert.equal(
    core.fromJSON((await storage.load('d-at'))!.doc).title,
    'Trip d-at',
    'the rescan flushed an in-flight edit ahead of its own debounce',
  );
  const row = (await storage.listTrips())[0];
  assert.equal(row.summaryVersion, core.SUMMARY_VERSION, 'the row was not brought current');
  assert.equal(row.title, 'Trip d-at', 'a row described an edit that is not in the document it is about');
});

// ---------------------------------------------------------------------------
// A-30 (c) — a refresh can neither create nor resurrect.
// ---------------------------------------------------------------------------

test('A-30: refreshSummary against an absent record is REFUSED — it cannot create a trip', async () => {
  const storage = memoryStorage();
  await seed(storage, makeTrip('c-at', 'vienna'));
  const before = (await storage.listTrips()).length;

  const ghost = core.tripSummary(makeTrip('never-stored', 'dubrovnik'), core.COUNTRY_INDEX);
  const out = await storage.refreshSummary('never-stored', 'any-token', ghost);
  assert.deepEqual(out, { ok: false, storedVersion: null });
  assert.equal((await storage.listTrips()).length, before, 'a refresh created a row with no document');
  assert.equal(storage.summaries.has('never-stored'), false);
});

test('A-30: existence is checked against the DOCUMENT, not against the version beside it', async () => {
  // The half-deleted record: the envelope version survives, the document does not. It is what
  // a half-completed delete or a partial restore leaves, and it is the only shape in which
  // A-30's *"an absent record is refused"* differs from a bare version comparison — which is
  // exactly why the ruling spells the check out as `DOCS.getKey(id)` rather than leaving it to
  // fall out of `VERSIONS.get(id)`. Without it, a summary row appears for a document that is
  // gone: `listTrips()` grows a card with nothing behind it.
  const storage = memoryStorage();
  const doc = makeTrip('half-at', 'vienna');
  await seed(storage, doc);
  const held = storage.versions.get('half-at') as StorageVersion;
  storage.docs.delete('half-at');
  storage.summaries.delete('half-at');
  assert.equal(storage.versions.get('half-at'), held, 'INCONCLUSIVE: the fixture removed the version too');

  const out = await storage.refreshSummary('half-at', held, core.tripSummary(doc, core.COUNTRY_INDEX));
  assert.deepEqual(
    out,
    { ok: false, storedVersion: null },
    'a refresh wrote a summary row for a document that is not there',
  );
  assert.equal(storage.summaries.has('half-at'), false);
  assert.equal((await storage.listTrips()).length, 0, 'listTrips grew a card with nothing behind it');
});

test('A-30: a delete landing between the pass\'s load and its refresh leaves the trip deleted', async () => {
  const storage = memoryStorage();
  const doomed = makeTrip('gone-hr', 'dubrovnik');
  await seed(storage, doomed);
  await seed(storage, makeTrip('stay-at', 'vienna'));

  // Destroy the record straight at the port between the load and the refresh, exactly as a
  // second tab would. `load` is where the pass learns the version it will expect.
  const origLoad = storage.load.bind(storage);
  let armed = true;
  storage.load = async (id) => {
    const r = await origLoad(id);
    if (armed && id === 'gone-hr') {
      armed = false;
      await storage.delete('gone-hr');
    }
    return r;
  };

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();

  assert.equal(await storage.load('gone-hr'), null, 'the refresh resurrected a deleted document');
  assert.equal((await storage.listTrips()).some((r) => r.id === 'gone-hr'), false, 'a summary row outlived its document');
  assert.equal(store.getState().library.some((r) => r.id === 'gone-hr'), false);
  assert.deepEqual(rowFor(store.getState(), 'stay-at').countryCodes, ['AT']);
});

test('A-30: a refresh whose expectation another writer has spent is refused, not retried over', async () => {
  const storage = memoryStorage();
  const doc = makeTrip('r-hr', 'dubrovnik');
  await seed(storage, doc);

  const origLoad = storage.load.bind(storage);
  let armed = true;
  storage.load = async (id) => {
    const r = await origLoad(id);
    if (armed && r) {
      armed = false;
      // A document write lands in between — the fence does its ordinary job.
      const moved = { ...core.fromJSON(r.doc), title: 'From the other tab' };
      const out = await storage.saveIfVersion(id, r.version, core.toJSON(moved), core.tripSummary(moved, core.COUNTRY_INDEX));
      assert.equal(out.ok, true);
    }
    return r;
  };

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();

  // The other writer's row stands: their own write computed it at the current version.
  const row = (await storage.listTrips())[0];
  assert.equal(row.title, 'From the other tab', 'the rescan wrote over another writer\'s row');
  assert.equal(row.summaryVersion, core.SUMMARY_VERSION);
  assert.equal(summaryScan(store.getState()).phase, 'complete');
});

test('A-30: a failing refreshSummary surfaces — it is not silently swallowed', async () => {
  const storage = memoryStorage();
  await seed(storage, makeTrip('f-at', 'vienna'));
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();

  storage.failNextRefresh = 'IndexedDB: QuotaExceededError';
  await assert.rejects(() => store.rescanSummaries(), /QuotaExceededError/);
  assert.equal(store.getState().rescan.running, false, 'the pass is wedged "running" forever');
  assert.equal(summaryScan(store.getState()).phase, 'stale');

  await store.rescanSummaries();
  assert.equal(summaryScan(store.getState()).phase, 'complete', 'a later pass could not recover');
});

// ---------------------------------------------------------------------------
// A-30 (e) — R26-4's own repro. NOT fixed by a condition; fixed by the redesign.
// ---------------------------------------------------------------------------

/**
 * **R26-4 is subsumed, not separately patched** (A-30 Part 3, point 2). Under I-6 the active
 * document was routed to `attemptSave`, which writes against `state.persistence.savedVersion`
 * — a fence that is stale *by definition* when the trip is in `'conflict'`. So the write was
 * refused, the row never came current, and every later `rescanSummaries()` re-spent the whole
 * bound while flipping the banner through `'saving'` and back.
 *
 * With `attemptSave` out of the path, `savedVersion` is not in it either: the conflict is about
 * the user's in-memory edit, the row is about the document storage holds, and neither needs the
 * other resolved first. R26-4's proposed `status === 'conflict'` skip is **not implemented**.
 */
test('A-30 subsumes R26-4: a trip sitting in conflict has its row brought current anyway', async () => {
  const storage = memoryStorage();
  const a = makeTrip('k-at', 'vienna');
  await seed(storage, a);
  await seed(storage, makeTrip('k-hr', 'dubrovnik'));

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.openTrip('k-at');
  // Another writer moves k-at's version behind this store's back, then the user types.
  const cur = (await storage.load('k-at'))!;
  await storage.saveIfVersion('k-at', cur.version, cur.doc, staleRow(a));
  store.dispatch({ type: 'setTripMeta', patch: { title: 'edited' } });
  await store.flush();
  assert.equal(store.getState().persistence.status, 'conflict', 'precondition: the active trip is in conflict');

  const statuses: string[] = [];
  const un = store.subscribe((s) => statuses.push(s.persistence.status));
  const refreshesBefore = storage.refreshCount;
  await store.rescanSummaries();
  un();

  const s = store.getState();
  const scan = summaryScan(s);
  assert.equal(scan.phase, 'complete', `the row never converged: ${JSON.stringify(scan)}`);
  assert.equal(rowFor(s, 'k-at').summaryVersion, core.SUMMARY_VERSION);
  assert.deepEqual(rowFor(s, 'k-at').countryCodes, ['AT']);
  // …without touching the conflict, and without the banner flickering through 'saving'.
  assert.equal(s.persistence.status, 'conflict', 'the user\'s conflict was cleared or masked');
  assert.equal(s.doc!.title, 'edited', 'the user\'s in-memory edit was lost');
  assert.deepEqual([...new Set(statuses)], ['conflict'], `the banner flickered: ${statuses.join(' → ')}`);
  // And the bound is not re-spent on a write that cannot succeed.
  assert.ok(
    storage.refreshCount - refreshesBefore <= 2,
    `the pass spent ${storage.refreshCount - refreshesBefore} refreshes on 2 rows`,
  );
  assert.ok(RESCAN_MAX_PASSES >= 2, 'the bound cannot express a second pass at all');
});

// ---------------------------------------------------------------------------
// R26-1 — the end-of-pass library snapshot is not installed off the chain.
// ---------------------------------------------------------------------------

/**
 * QA **R26-1 (MAJOR)**. Every pass used to end with `listTrips()` and a `set` that replaced the
 * whole `state.library` with a snapshot taken at an earlier moment — outside any
 * `chainOntoSaving` callback, while `deleteTrip` removes its row from `state.library` *inside*
 * a chain link. Park the read, delete a trip, release: the deleted trip's card came back,
 * clickable, and opening it raised the raw internal `openTrip: no trip <id> in storage`.
 *
 * §0.6, and the architect's own framing of the fix: *a pass that correctly re-derives its
 * outstanding, unreadable and deleted state each time, rather than trusting a stale
 * end-of-pass snapshot.*
 */
test('R26-1: a trip deleted while a pass is in flight does not come back as a card', async () => {
  const storage = memoryStorage();
  for (const id of ['keep', 'doomed']) await seed(storage, makeTrip(id, 'vienna'));

  // Park `listTrips` on its SECOND call — the first is `refreshLibrary`'s. The rows are read
  // BEFORE the park, which models a slow port whose result was computed before the delete and
  // delivered after it: what an IndexedDB cursor round trip actually does.
  let calls = 0;
  let release: (() => void) | null = null;
  const origList = storage.listTrips.bind(storage);
  storage.listTrips = async () => {
    calls++;
    const rows = await origList();
    if (calls === 2) await new Promise<void>((r) => { release = r; });
    return rows;
  };

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const pass = store.rescanSummaries();
  for (let i = 0; i < 300 && release === null; i++) await new Promise((r) => setImmediate(r));
  assert.ok(release !== null, 'INCONCLUSIVE: the pass never parked on its end-of-pass listTrips()');

  // Not awaited before the release: under the fix the delete is ORDERED behind the pass's
  // link, so awaiting it here would deadlock — which is itself the property under test.
  const deleting = store.deleteTrip('doomed');
  await new Promise((r) => setImmediate(r));
  (release as unknown as () => void)();
  await Promise.all([pass, deleting]);

  const s = store.getState();
  assert.equal(
    s.library.some((r) => r.id === 'doomed'),
    false,
    `a deleted trip's row is back in the library the user is looking at: ${JSON.stringify(s.library.map((r) => r.id))}`,
  );
  assert.equal(await storage.load('doomed'), null, 'storage disagrees — the document survived');
  assert.deepEqual(s.library.map((r) => r.id), ['keep']);
  // …and the row that survived is the real one, brought current.
  assert.equal(rowFor(s, 'keep').summaryVersion, core.SUMMARY_VERSION);
});

// ---------------------------------------------------------------------------
// R26-2 — `unreadable` is an observation about the last attempt, not a verdict.
// ---------------------------------------------------------------------------

/**
 * QA **R26-2**. `RescanState.unreadable` is documented as *"cleared and re-derived at the start
 * of every pass, so a record another writer repairs stops being reported without anything
 * having to remember that it was."* The clearing sat **after** `startRescan`'s early return, so
 * when the repair also brought the row current there was nothing left to rescan, no pass ran,
 * and nothing was cleared — leaving *"This trip's file could not be read"* on a row whose file
 * reads perfectly, with `summaryScan` stuck at `'stale'` indefinitely.
 */
test('R26-2: a repaired record stops being reported unreadable even when no pass has to run', async () => {
  const storage = memoryStorage();
  const good = makeTrip('good', 'vienna');
  const bad = makeTrip('bad', 'dubrovnik');
  await seed(storage, good);
  await seed(storage, bad, staleRow(bad), '{ "not": "a trip"');

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();
  assert.deepEqual(summaryScan(store.getState()).unreadable.map((u) => u.id), ['bad'], 'precondition');

  // Another writer repairs the document AND writes a current row — exactly what a second tab
  // that could open and re-save the trip leaves behind. Nothing is left below the version.
  const held = storage.versions.get('bad') as StorageVersion;
  const out = await storage.saveIfVersion('bad', held, core.toJSON(bad), core.tripSummary(bad, core.COUNTRY_INDEX));
  assert.equal(out.ok, true);
  await store.refreshLibrary();
  await store.rescanSummaries();          // no row is below the version, so NO pass runs

  const scan = summaryScan(store.getState());
  assert.deepEqual(scan.unreadable, [], 'a repaired record is still reported as unreadable');
  assert.equal(scan.phase, 'complete', 'the library still refuses to say it is complete');
});

test('R26-2: a DELETED trip is not still reported as a file that could not be read', async () => {
  const storage = memoryStorage();
  const good = makeTrip('good', 'vienna');
  const bad = makeTrip('bad', 'dubrovnik');
  await seed(storage, good);
  await seed(storage, bad, staleRow(bad), '{ "not": "a trip"');

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();
  assert.equal(summaryScan(store.getState()).unreadable.length, 1, 'precondition');

  await store.deleteTrip('bad');

  const scan = summaryScan(store.getState());
  assert.equal(scan.total, 1, 'the row is still in the library');
  assert.deepEqual(scan.unreadable, [], 'a trip that no longer exists is still counted as unreadable');
  assert.equal(
    scan.phase,
    'complete',
    'the library will not say complete because of a trip that no longer exists — and with ' +
      'outdated.length === 0 the header reads "0 trips are not up to date yet."',
  );
});

// ---------------------------------------------------------------------------
// R26-3 — a `null` load is as final as an unparseable one.
// ---------------------------------------------------------------------------

/**
 * QA **R26-3**. A document the pass cannot *parse* is filed in `unreadable` and filtered out of
 * every later pass. A document `load()` returns `null` for was filed nowhere, so an **orphan
 * row** — a summary whose document is gone, the shape a half-completed delete or a partial
 * restore leaves — stayed in `listTrips()`, stayed below the version, and burned all
 * `RESCAN_MAX_PASSES` passes on every single boot, forever.
 *
 * It stays honestly reported: it is `outdated`, and it is deliberately **not** `unreadable` —
 * those are different facts and the report keeps them apart.
 */
test('R26-3: an orphan row costs ONE pass, not the whole bound, on every boot', async () => {
  const storage = memoryStorage();
  await seed(storage, makeTrip('a', 'vienna'));
  await seed(storage, makeTrip('ghost', 'dubrovnik'));
  // Destroy the document but leave the row behind.
  storage.docs.delete('ghost');
  storage.versions.delete('ghost');

  let passes = 0;
  const origList = storage.listTrips.bind(storage);
  storage.listTrips = async () => { passes++; return origList(); };
  let loads = 0;
  const origLoad = storage.load.bind(storage);
  storage.load = async (id) => { loads++; return origLoad(id); };

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const listsAfterRefresh = passes;
  await store.rescanSummaries();

  const scan = summaryScan(store.getState());
  assert.equal(passes - listsAfterRefresh, 1, `the pass re-read the library ${passes - listsAfterRefresh} times for one orphan`);
  assert.equal(loads, 2, `the pass loaded ${loads} documents for two rows`);
  assert.equal(scan.phase, 'stale', 'the library must still report itself out of date');
  assert.deepEqual(scan.outdated, ['ghost'], 'and name the orphan');
  assert.deepEqual(scan.unreadable, [], 'an absent document is "outdated", not "unreadable"');
  assert.equal(store.getState().rescan.running, false);
});
