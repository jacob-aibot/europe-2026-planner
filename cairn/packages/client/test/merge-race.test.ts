/**
 * QA R3-3 — `mergeWithStored()` must not race the store against itself.
 *
 * `save()` chains: `saving = saving.catch(() => {}).then(() => attemptSave(...))`, and its own
 * comment states why — "One store never races ITSELF". `mergeWithStored()` had two bare
 * `saving = (async () => …)()` assignments instead, one per branch, which *replace* the chain
 * rather than extend it. An autosave still in flight when the user presses "Merge and save"
 * therefore ran alongside the merge's write, from one store. The merge landed, then the
 * orphaned autosave was refused against its now-stale expectation and set `status='conflict'`:
 * the user read "Not saved — edited elsewhere" with `isDirty() === false` over a document that
 * was fully and correctly saved, and it did not clear until the next edit.
 *
 * The assertions below are on **stored bytes** and on how many writes the port ever sees at
 * once — never on `isDirty()` alone. That is this repo's rule since R4-1, where an internal
 * oracle agreed with itself while storage disagreed with both.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore,
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, manualScheduler, immediateScheduler,
  core,
} from '../src/index.ts';
import type { MemoryStorage, Ports, SchedulerPort, StoragePort } from '../src/index.ts';

const TODAY = '2026-08-01';
let seq = 0;

const INIT = (title: string) => ({
  title,
  startDate: '2026-09-01',
  endDate: '2026-09-04',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
});

/**
 * A storage port that can park `saveIfVersion` mid-write AND counts how many writes are inside
 * it at once. The counter is the whole point: "one store never races itself" is a statement
 * about concurrency at the port, and it cannot be observed from the store's own state enum.
 */
function gatedStorage(): {
  inner: MemoryStorage;
  port: StoragePort;
  /** The highest number of writes ever inside `saveIfVersion` simultaneously. */
  peak(): number;
  /** How many times `saveIfVersion` has been called — A-7's "no write was even attempted". */
  saveCalls(): number;
  /** Arms the gate; the returned function releases it. */
  park(): () => void;
  /**
   * Parks `load` — A-7's WIDER half of the merge window (QA R11-1). `park()` alone only
   * covers the tens of milliseconds a write is actually inside `saveIfVersion`; this covers
   * the storage read `doMerge` awaits first, before it has even seen the remote document.
   */
  parkLoad(): () => void;
} {
  const inner = memoryStorage();
  let gate: Promise<void> | null = null;
  let release: (() => void) | null = null;
  let loadGate: Promise<void> | null = null;
  let loadRelease: (() => void) | null = null;
  let inFlight = 0;
  let peak = 0;
  let saves = 0;
  const port: StoragePort = {
    listTrips: () => inner.listTrips(),
    async load(id) {
      if (loadGate) await loadGate;
      return inner.load(id);
    },
    delete: (id) => inner.delete(id),
    async saveIfVersion(id, expected, doc, summary) {
      saves += 1;
      inFlight += 1;
      if (inFlight > peak) peak = inFlight;
      try {
        if (gate) await gate;
        return await inner.saveIfVersion(id, expected, doc, summary);
      } finally {
        inFlight -= 1;
      }
    },
  };
  return {
    inner,
    port,
    peak: () => peak,
    saveCalls: () => saves,
    park() {
      gate = new Promise<void>((r) => { release = r; });
      return () => {
        gate = null;
        release?.();
      };
    },
    parkLoad() {
      loadGate = new Promise<void>((r) => { loadRelease = r; });
      return () => {
        loadGate = null;
        loadRelease?.();
      };
    },
  };
}

function portsFor(storage: StoragePort, scheduler: SchedulerPort): Ports {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(`mr${++seq}-`),
    scheduler,
  };
}

/** Lets every queued microtask (and the port's awaits) drain, with no real timers involved. */
const tick = async () => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));
};

/**
 * Builds a store that is in `'conflict'` because a second tab moved the record on, with an
 * autosave for a further edit parked inside the storage port.
 */
async function conflictedStoreWithParkedAutosave() {
  const g = gatedStorage();
  const sched = manualScheduler();
  const store = createStore({ ports: portsFor(g.port, sched) });

  await store.createTrip(INIT('Home'));
  const id = store.getState().doc!.id;
  await store.flush();

  // Another tab writes, so this store's own write is refused by the fence.
  const other = createStore({ ports: portsFor(g.inner, immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'OTHER TAB DAY 2' } });
  await other.flush();

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'MINE DAY 1' } });
  sched.runAll();
  await store.flush();
  assert.equal(
    store.getState().persistence.status,
    'conflict',
    'precondition: this tab must be in conflict before the merge button exists',
  );

  return { g, sched, store, id };
}

test('R3-3: an autosave in flight when "Merge and save" is pressed does not race the merge', async () => {
  const { g, sched, store, id } = await conflictedStoreWithParkedAutosave();

  // The user keeps typing while the conflict banner is up, then presses "Merge and save".
  const release = g.park();
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'MINE DAY 1 AGAIN' } });
  sched.runAll();          // the autosave is issued and parks inside the port
  await tick();
  const merging = store.mergeWithStored();
  await tick();

  assert.equal(
    g.peak(),
    1,
    'two writes were inside the storage port at once, from ONE store — mergeWithStored did not chain onto `saving`',
  );

  release();
  await merging;
  await tick();

  // On stored bytes: neither the autosave's content nor the other tab's survives at the
  // other's expense — the merge reconciles both.
  const stored = core.fromJSON(g.inner.docs.get(id) as string);
  assert.equal(stored.days[0].title, 'MINE DAY 1 AGAIN', "this tab's latest edit is not in storage");
  assert.equal(stored.days[1].title, 'OTHER TAB DAY 2', "the other tab's edit was clobbered by the merge");

  // And the indicator tells the truth about that document.
  assert.equal(
    store.getState().persistence.status,
    'idle',
    'the store reads "Not saved — edited elsewhere" over a document that is correctly saved',
  );
  assert.equal(store.isDirty(), false);
  assert.ok(store.getState().persistence.lastMerge, 'the merge notice was not recorded');
});

test('R3-3: the deleted-trip merge branch chains too — one write at a time, and the trip is written back', async () => {
  const { g, sched, store, id } = await conflictedStoreWithParkedAutosave();

  // The trip is destroyed underneath a tab that is holding a conflict. Pressing "Merge and
  // save" then means "write mine back", against the honest expectation of `null`.
  await g.inner.delete(id);

  const release = g.park();
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'MINE DAY 1 AGAIN' } });
  sched.runAll();
  await tick();
  const merging = store.mergeWithStored();
  await tick();

  assert.equal(
    g.peak(),
    1,
    'two writes were inside the storage port at once, from ONE store — the deleted-trip branch did not chain onto `saving`',
  );

  release();
  await merging;
  await tick();

  const stored = core.fromJSON(g.inner.docs.get(id) as string);
  assert.equal(stored.days[0].title, 'MINE DAY 1 AGAIN', 'the write-back did not land');
  assert.equal(store.getState().persistence.status, 'idle', 'the write-back landed but the store still reports a conflict');
  assert.equal(store.isDirty(), false);
});

// ---------------------------------------------------------------------------
// QA R7-1 — "Merge and save" pressed twice before the first press settles.
// ---------------------------------------------------------------------------

test('R7-1: two clicks on "Merge and save" do not leave a conflict over a correctly merged document', async () => {
  const { g, store, id } = await conflictedStoreWithParkedAutosave();

  const release = g.park();
  const a = store.mergeWithStored().catch(() => undefined);
  const b = store.mergeWithStored().catch(() => undefined);   // the second click
  await tick();
  release();
  await Promise.allSettled([a, b]);
  await tick();

  const stored = core.fromJSON(g.inner.docs.get(id) as string);
  const merged =
    stored.days[0].title === 'MINE DAY 1' && stored.days[1].title === 'OTHER TAB DAY 2';
  assert.equal(merged, true, `the merge did not land: ${stored.days.map((d) => d.title).join(' | ')}`);

  // The indicator is the assertion, per this repo's standing rule: a store that has just
  // written both sides' work correctly must not read "Not saved — edited elsewhere".
  const { status } = store.getState().persistence;
  const indicator =
    status === 'conflict' ? 'Not saved — edited elsewhere'
      : status === 'error' ? 'Not saved — retry'
        : status === 'saving' ? 'Saving…'
          : store.isDirty() ? 'Unsaved changes' : 'Saved';
  assert.equal(
    indicator,
    'Saved',
    `the second click\'s write was refused against the first click\'s own new version and the ` +
      `banner lies about a fully-saved document (status=${status}, dirty=${store.isDirty()})`,
  );
  assert.equal(g.peak(), 1, 'never two writes in flight from one store');
});

test('R7-1: the second click does not issue a second write at all', async () => {
  const { g, store } = await conflictedStoreWithParkedAutosave();
  let writes = 0;
  const real = g.port.saveIfVersion.bind(g.port);
  g.port.saveIfVersion = async (a, b, c, d) => { writes++; return real(a, b, c, d); };

  const p1 = store.mergeWithStored().catch(() => undefined);
  const p2 = store.mergeWithStored().catch(() => undefined);
  await Promise.allSettled([p1, p2]);
  await tick();
  assert.equal(writes, 1, 'the in-flight merge was entered twice; one press, one merge');
});

// ---------------------------------------------------------------------------
// QA R7-2 — a throwing subscriber turns the DEBOUNCED autosave's `void save(...)`
// into an unhandled promise rejection.
// ---------------------------------------------------------------------------

test('R7-2: a throwing subscriber does not produce an unhandled rejection from the debounce', async () => {
  const g = gatedStorage();
  const sched = manualScheduler();
  const store = createStore({ ports: portsFor(g.port, sched) });
  await store.createTrip(INIT('Throwing subscriber'));

  const seen: string[] = [];
  const onUnhandled = (e: unknown) => seen.push(String((e as Error)?.message));
  process.on('unhandledRejection', onUnhandled);

  let armed = false;
  const unsub = store.subscribe(() => {
    if (armed) { armed = false; throw new Error('BOOM in a subscriber'); }
  });
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'X' } });
  armed = true;
  sched.runAll();                     // the debounced `void save(...)` rejects
  await tick();
  await new Promise((r) => setTimeout(r, 30));
  unsub();
  process.off('unhandledRejection', onUnhandled);

  assert.deepEqual(seen, [], 'the debounced autosave path emitted an unhandled rejection');
});

test('R7-2 ceiling: an EXPLICIT flush still reports its own failure to its caller', async () => {
  // The fix must not become "swallow every rejection": `flush()` returns a promise the
  // caller holds, and a link that fails still has to reject for that caller.
  const g = gatedStorage();
  const store = createStore({ ports: portsFor(g.port, immediateScheduler()), autosave: false });
  await store.createTrip(INIT('Explicit flush'));
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'Y' } });
  await tick();

  let armed = false;
  const unsub = store.subscribe((s) => {
    if (armed && s.persistence.status === 'saving') { armed = false; throw new Error('BOOM from a subscriber'); }
  });
  armed = true;
  const outcome = await store.flush().then(() => 'fulfilled', (e: Error) => `rejected:${e.message}`);
  unsub();
  assert.equal(outcome, 'rejected:BOOM from a subscriber', 'the failing link stopped reporting for itself');
});

// ---------------------------------------------------------------------------
// QA R11-1 / ARCHITECTURE §2.2a A-7 — a write the store declines to install may not move
// `savedDoc`/`savedVersion`. `doMerge` captures `state.doc` before its FIRST await (the
// storage read), so the exposure is the whole of `doMerge`, not just the final write:
// `gatedStorage().parkLoad()` opens the wide half, `park()` the narrow half `writeAndSettle`
// itself has to close. Every assertion below is on the bytes the port actually holds.
// ---------------------------------------------------------------------------

/** Two tabs, one trip, disjoint edits, this tab refused — the precondition every A-7 test shares. */
async function twoTabsRefused() {
  const g = gatedStorage();
  const sched = manualScheduler();
  const store = createStore({ ports: portsFor(g.port, sched) });
  await store.createTrip(INIT('Shared'));
  const id = store.getState().doc!.id;
  await store.flush();

  const other = createStore({ ports: portsFor(g.inner, immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'OTHER TAB' } });
  await other.flush();

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'MINE' } });
  sched.runAll();
  await store.flush();
  assert.equal(store.getState().persistence.status, 'conflict', 'precondition: this tab must be refused');

  return { g, sched, store, id };
}

test('A-7 case 1: the ordinary merge — no interleaving dispatch — still installs and still advances the fence', async () => {
  const { g, store, id } = await twoTabsRefused();
  const before = store.getState().persistence.savedVersion;

  await store.mergeWithStored();

  const stored = core.fromJSON(g.inner.docs.get(id) as string);
  assert.equal(stored.days[0].title, 'OTHER TAB');
  assert.equal(stored.days[1].title, 'MINE');
  assert.equal(
    store.getState().doc,
    store.getState().persistence.savedDoc,
    'a fix that over-refuses the ordinary case installs the merge but stops calling it saved',
  );
  assert.notEqual(store.getState().persistence.savedVersion, before, 'the fence must still advance on an ordinary merge');
  assert.equal(store.getState().persistence.status, 'idle');
  assert.equal(store.isDirty(), false);
  assert.ok(store.getState().persistence.lastMerge, 'the merge notice must still be recorded');
});

test('A-7 case 2 (R11-1): an edit landing during the WRITE — the trailing autosave must not destroy the merge', async () => {
  const { g, sched, store, id } = await twoTabsRefused();

  const release = g.park();
  const merging = store.mergeWithStored();
  await tick(); // the merge's own write is now parked inside saveIfVersion

  // Zero undo calls, exactly `qa/r11-recheck.mjs` §1.3b's shape.
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-03', patch: { title: 'TYPED DURING THE WRITE' } });

  release();
  await merging;
  await tick();

  assert.equal(store.getState().persistence.status, 'conflict', 'A-7: the merge must not install over a moved document');
  assert.equal(store.getState().doc?.days[2].title, 'TYPED DURING THE WRITE', 'the local edit must stay in memory');

  // The trailing autosave MUST be allowed to run — real debounce mechanism, no explicit
  // flush — because that is the write that does the damage without the fix.
  sched.runAll();
  await tick();

  const stored = core.fromJSON(g.inner.docs.get(id) as string);
  assert.equal(stored.days[0].title, 'OTHER TAB', "R11-1: the other tab's edit must survive the trailing autosave");
  assert.equal(stored.days[1].title, 'MINE', "the merge's own reconciliation must survive too");
});

test('A-7 case 3 (R11-1): an edit landing during the STORAGE READ — no merge write is even attempted', async () => {
  const { g, store } = await twoTabsRefused();
  const savesBefore = g.saveCalls();

  const releaseLoad = g.parkLoad();
  const merging = store.mergeWithStored();
  await tick(); // doMerge is now parked inside ports.storage.load(), before it has read anything

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-03', patch: { title: 'TYPED DURING THE READ' } });

  releaseLoad();
  await merging;
  await tick();

  assert.equal(
    g.saveCalls(),
    savesBefore,
    'A-7: the precondition inside the chained link must abandon the merge before it ever calls saveIfVersion',
  );
  assert.equal(store.getState().persistence.status, 'conflict');
  assert.equal(store.getState().doc?.days[2].title, 'TYPED DURING THE READ');
});

test('A-7 case 4: a write already queued ahead of the merge, plus an edit while both drain', async () => {
  const { g, sched, store, id } = await conflictedStoreWithParkedAutosave();
  // `conflictedStoreWithParkedAutosave` leaves the store `'conflict'` with a further local
  // edit already in `state.doc`, not yet reconciled with the other tab's.

  const release = g.park();
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'MINE DAY 1 AGAIN' } });
  sched.runAll(); // this autosave attempt is now queued/parked inside the port
  await tick();

  const merging = store.mergeWithStored(); // queues BEHIND the parked write — R3-3's chain
  await tick();

  // While both the queued autosave and the merge wait on the chain, one more edit lands —
  // the interleaving A-7 names explicitly.
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-03', patch: { title: 'TYPED WHILE QUEUED' } });

  release();
  await merging;
  await tick();
  sched.runAll(); // let any re-armed or still-pending autosave settle too
  await tick();

  // Whichever way this interleaves, storage may never regress past what it already held.
  const stored = core.fromJSON(g.inner.docs.get(id) as string);
  assert.equal(stored.days[1].title, 'OTHER TAB DAY 2', "the other tab's edit must survive every interleaving");
});

test('A-7 case 5: the invariant itself — a non-installed merge write never advances the fence, and a second press converges', async () => {
  const { g, store, id } = await twoTabsRefused();
  const staleVersion = store.getState().persistence.savedVersion;
  const staleDoc = store.getState().persistence.savedDoc;

  const release = g.park();
  const merging = store.mergeWithStored();
  await tick();
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-03', patch: { title: 'MOVED ON' } });
  release();
  await merging;
  await tick();

  assert.equal(
    store.getState().persistence.savedVersion,
    staleVersion,
    'the fence must not advance to a version this store does not hold',
  );
  assert.equal(
    store.getState().persistence.savedDoc,
    staleDoc,
    'savedDoc must not become the merged document this store never installed — F2\'s definition',
  );

  // The store's own next write is refused by the port — the fence fails safe even without
  // the precondition catching it a second time.
  await store.flush();
  assert.equal(store.getState().persistence.status, 'conflict', "the store's own next write must be refused, not accepted");

  // A second press converges: `savedDoc` is still the true common ancestor.
  await store.mergeWithStored();
  await tick();
  assert.equal(store.getState().persistence.status, 'idle');
  const stored = core.fromJSON(g.inner.docs.get(id) as string);
  assert.equal(stored.days[0].title, 'OTHER TAB');
  assert.equal(stored.days[1].title, 'MINE');
  assert.equal(stored.days[2].title, 'MOVED ON');
});

test('A-7 ceiling: an edit during an ORDINARY (non-merge) autosave still advances the fence and re-arms', async () => {
  const g = gatedStorage();
  const sched = manualScheduler();
  const store = createStore({ ports: portsFor(g.port, sched) });
  await store.createTrip(INIT('Ceiling'));
  const id = store.getState().doc!.id;
  await store.flush();
  const v0 = store.getState().persistence.savedVersion;

  const release = g.park();
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'FIRST' } });
  sched.runAll(); // this ordinary autosave is now parked inside saveIfVersion
  await tick();

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'SECOND, WHILE THE FIRST WRITE IS IN FLIGHT' } });

  release();
  await tick();
  sched.runAll(); // the re-armed autosave for the newer document
  await tick();

  assert.notEqual(store.getState().persistence.savedVersion, v0, 'A-7 must not stop the ordinary autosave fence from advancing');
  assert.equal(store.getState().persistence.status, 'idle');
  const stored = core.fromJSON(g.inner.docs.get(id) as string);
  assert.equal(
    stored.days[1].title,
    'SECOND, WHILE THE FIRST WRITE IS IN FLIGHT',
    'the newer document must still reach storage — both autosave sites have toWrite === startedFrom',
  );
});
