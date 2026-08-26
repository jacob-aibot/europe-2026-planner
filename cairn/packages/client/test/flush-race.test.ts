/**
 * QA R5-1 — an edit dispatched WHILE a transition's own flush is in flight.
 *
 * §4.2 rule 6a is "a pending write is never outlived by its document", and
 * `flushForTransition` used to verify it by sampling `persistence.status` *after* its own
 * `save()` resolved. That is a fact about the last write, not about the current document: if
 * the user typed while the write was awaiting storage, `writeAndSettle` correctly recorded
 * `savedDoc` as the document it wrote (the old one), left `state.doc` on the new one — and the
 * transition proceeded anyway because the status read `'idle'`. `state.doc` then became `null`
 * (or another trip), the re-armed debounce fired against nothing, `attemptSave`'s early return
 * dropped it, and `isDirty()` read `false` because there was no document left to be dirty
 * about.
 *
 * Every assertion below is on **stored bytes**, not on `isDirty()` — the rule this repo
 * adopted after R4-1, where an internal oracle agreed with itself while storage disagreed
 * with both.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, FLUSH_MAX_ATTEMPTS,
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort,
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
 * A storage port whose `saveIfVersion` parks until released — the interleaving window a real
 * IndexedDB write opens, made explicit and deterministic. Everything else delegates.
 */
function gatedStorage(): {
  inner: MemoryStorage;
  port: StoragePort;
  /** Arms the gate; the returned function releases it. */
  park(): () => void;
} {
  const inner = memoryStorage();
  let gate: Promise<void> | null = null;
  let release: (() => void) | null = null;
  const port: StoragePort = {
    listTrips: () => inner.listTrips(),
    load: (id) => inner.load(id),
    delete: (id) => inner.delete(id),
    async saveIfVersion(id, expected, doc, summary) {
      if (gate) await gate;
      return inner.saveIfVersion(id, expected, doc, summary);
    },
  };
  return {
    inner,
    port,
    park() {
      gate = new Promise<void>((r) => { release = r; });
      return () => {
        gate = null;
        release?.();
      };
    },
  };
}

/** A scheduler that arms nothing — it exists to prove the defect is NOT the debounce timer. */
const deadScheduler: SchedulerPort = { schedule: () => () => {} };

function portsFor(storage: StoragePort, scheduler?: SchedulerPort): Ports {
  const base: Ports = {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(`f${++seq}-`),
  };
  return scheduler ? { ...base, scheduler } : base;
}

const dayTitles = (json: string | undefined): string[] =>
  json === undefined ? [] : (JSON.parse(json).days as Array<{ title?: string }>).map((d) => d.title ?? '').filter(Boolean);

/** Lets a re-armed debounce (20 ms) and any microtask queue drain. */
const settle = () => new Promise((r) => setTimeout(r, 80));

/**
 * The five transitions that replace `state.doc`. `deleteTrip(otherId)` is safe by
 * construction (it does not replace the active document) and is asserted separately;
 * `deleteTrip(activeId)` losing the edit is §4.2 rule 6c's stated exception.
 */
const TRANSITIONS = ['closeTrip', 'openTrip', 'createTrip', 'adoptTrip', 'importDoc'] as const;

for (const transition of TRANSITIONS) {
  test(`R5-1: ${transition} — an edit landing during its own flush reaches STORAGE`, async () => {
    const g = gatedStorage();
    const store = createStore({ ports: portsFor(g.port), debounceMs: 20 });

    await store.createTrip(INIT('Away'));
    const idB = store.getState().doc!.id;
    await store.flush();
    await store.createTrip(INIT('Home'));
    const idA = store.getState().doc!.id;
    await store.flush();

    // A clean baseline write, so `savedVersion` is real and the fence has something to match.
    store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'edit ONE' } });
    await store.flush();
    assert.deepEqual(dayTitles(g.inner.docs.get(idA)), ['edit ONE'], 'the baseline write did not land');

    // A backup of the OTHER trip under a fresh id, for the importDoc case.
    const backup = core.toJSON({ ...core.fromJSON(g.inner.docs.get(idB)!), id: `${idB}-restored` });

    // Edit TWO is pending when the transition starts. Its flush parks inside the port.
    store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'edit TWO' } });
    const release = g.park();
    const moving =
      transition === 'closeTrip' ? store.closeTrip()
      : transition === 'openTrip' ? store.openTrip(idB)
      : transition === 'createTrip' ? store.createTrip(INIT('Third'))
      : transition === 'adoptTrip' ? store.adoptTrip(
          core.createTrip(
            { ...INIT('Adopted'), id: 'trip-adopted' },
            { ids: { newId: (k: string) => `adopted-${k}` }, now: TODAY, actorUserId: core.LOCAL_OWNER },
          ),
        )
      : store.importDoc(backup);

    // Let the flush reach the parked port, then land ONE keystroke — edit THREE.
    await new Promise((r) => setTimeout(r, 5));
    store.dispatch({ type: 'setDayMeta', dayId: '2026-09-03', patch: { title: 'edit THREE' } });
    release();
    await moving;
    await settle();

    // The criterion, on bytes: ROADMAP F's sixth case, clause (a).
    assert.deepEqual(
      dayTitles(g.inner.docs.get(idA)),
      ['edit ONE', 'edit TWO', 'edit THREE'],
      `${transition} completed over an unwritten edit`,
    );
    assert.equal(store.isDirty(), false, 'the store reports dirty after a completed transition');
    assert.equal(store.getState().persistence.status, 'idle');
  });
}

test('R5-1: it is not the debounce timer — with autosave off the same edit must still land', async () => {
  // The finding's own control: "With autosave:false — no timer exists to orphan — the edit is
  // lost identically. The timer is a symptom; the decision is the defect."
  const g = gatedStorage();
  const store = createStore({ ports: portsFor(g.port, deadScheduler), autosave: false });

  await store.createTrip(INIT('Home'));
  const idA = store.getState().doc!.id;
  await store.flush();
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'edit ONE' } });
  await store.flush();

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'edit TWO' } });
  const release = g.park();
  const moving = store.closeTrip();
  await new Promise((r) => setTimeout(r, 5));
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-03', patch: { title: 'edit THREE' } });
  release();
  await moving;
  await settle();

  assert.deepEqual(dayTitles(g.inner.docs.get(idA)), ['edit ONE', 'edit TWO', 'edit THREE']);
  assert.equal(store.getState().activeTripId, null, 'the transition did not complete');
});

test('R5-1: deleteTrip(otherId) is safe by construction and stays safe', async () => {
  const g = gatedStorage();
  const store = createStore({ ports: portsFor(g.port), debounceMs: 20 });
  await store.createTrip(INIT('Away'));
  const idB = store.getState().doc!.id;
  await store.flush();
  await store.createTrip(INIT('Home'));
  const idA = store.getState().doc!.id;
  await store.flush();
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'edit ONE' } });
  await store.flush();

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'edit TWO' } });
  const release = g.park();
  const moving = store.deleteTrip(idB);
  await new Promise((r) => setTimeout(r, 5));
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-03', patch: { title: 'edit THREE' } });
  release();
  await moving;
  await settle();

  assert.deepEqual(dayTitles(g.inner.docs.get(idA)), ['edit ONE', 'edit TWO', 'edit THREE']);
  assert.equal(store.getState().activeTripId, idA, 'deleting another trip closed the active one');
});

test('R5-1: a refused flush still aborts the transition — the drain loop does not paper over 6b', async () => {
  const g = gatedStorage();
  const store = createStore({ ports: portsFor(g.port), debounceMs: 20 });
  await store.createTrip(INIT('Home'));
  const idA = store.getState().doc!.id;
  await store.flush();

  // Another writer moves the record while this store holds an edit.
  const before = g.inner.docs.get(idA)!;
  await g.inner.saveIfVersion(idA, g.inner.versions.get(idA)!, before, core.tripSummary(core.fromJSON(before)));

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'edit ONE' } });
  assert.equal(await store.closeTrip().then(() => store.getState().activeTripId), idA, 'a refused flush let the transition through');
  assert.equal(store.getState().persistence.status, 'conflict');
  assert.equal(store.isDirty(), true, 'the edit was dropped rather than kept in memory');
});

test('R5-1: the drain is BOUNDED — continuous typing cannot hang the transition', async () => {
  // A user who keeps typing for the whole of every write must not be able to keep a
  // transition in flight forever. The loop gives up after FLUSH_MAX_ATTEMPTS writes and
  // treats the exhausted bound as a refused flush: the transition aborts, the trip stays
  // open, the edit stays in memory and `isDirty()` says so. Nothing is discarded.
  const inner = memoryStorage();
  const typist: { on: boolean; keystrokes: number; day: number } = { on: false, keystrokes: 0, day: 0 };
  const held: { store: ReturnType<typeof createStore> | null } = { store: null };
  const port: StoragePort = {
    listTrips: () => inner.listTrips(),
    load: (id) => inner.load(id),
    delete: (id) => inner.delete(id),
    async saveIfVersion(id, expected, doc, summary) {
      const outcome = await inner.saveIfVersion(id, expected, doc, summary);
      // One keystroke lands during every single write, forever.
      if (typist.on) {
        typist.day = (typist.day % 4) + 1;
        typist.keystrokes += 1;
        held.store?.dispatch({
          type: 'setDayMeta',
          dayId: `2026-09-0${typist.day}`,
          patch: { title: `typing ${typist.keystrokes}` },
        });
      }
      return outcome;
    },
  };
  const store = createStore({ ports: portsFor(port, deadScheduler), debounceMs: 20 });
  held.store = store;

  await store.createTrip(INIT('Home'));
  const idA = store.getState().doc!.id;
  await store.flush();

  typist.on = true;
  const savesBefore = inner.saveCount;
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'first' } });
  await store.closeTrip();

  assert.equal(store.getState().activeTripId, idA, 'the transition proceeded over an unwritten edit');
  assert.equal(store.isDirty(), true, 'the store claims clean while a keystroke is unwritten');
  assert.equal(
    inner.saveCount - savesBefore,
    FLUSH_MAX_ATTEMPTS,
    'the drain did not stop at its bound',
  );

  // And the bound is not a dead end: stop typing and the same click works.
  typist.on = false;
  await store.closeTrip();
  assert.equal(store.getState().activeTripId, null, 'the transition never became possible again');
  assert.equal(store.isDirty(), false);
  const stored = JSON.parse(inner.docs.get(idA)!) as { days: Array<{ title?: string }> };
  assert.equal(
    stored.days.some((d) => d.title === `typing ${typist.keystrokes}`),
    true,
    `the last keystroke ("typing ${typist.keystrokes}") never reached storage`,
  );
});
