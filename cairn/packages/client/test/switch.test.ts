/**
 * R3-2 — the sixth NO-SILENT-LOSS case: the edit's *container* goes away
 * (ARCHITECTURE §4.2 rule 6, ROADMAP Phase 1 F "Sixth case").
 *
 * The five cases the criterion already enumerated all keep the edit in memory. This is the
 * one where the document is replaced, closed or deleted while a 400 ms debounced write is
 * still pending, so there is no memory left to keep it in. One click, no second tab, inside
 * a window the app chose.
 *
 * Every test here asserts **the indicator string the view would render** as well as
 * `persistence.status`: a criterion that reads the enum keeps passing the day the view stops
 * reading it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createStore, CONFLICT_MESSAGE,
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, manualScheduler, immediateScheduler,
  core,
} from '../src/index.ts';
import type { Action } from '../src/index.ts';
import type { MemoryStorage } from '../src/index.ts';
import type { Ports, SaveOutcome, SchedulerPort, StorageVersion } from '../src/index.ts';

const TODAY = '2026-08-01';
let seq = 0;

/** Ask for the store's OWN `setTimeout` scheduler — ROADMAP F's "real timers, not the manual one". */
const REAL_TIMERS = Symbol('real timers');

function ports(storage: MemoryStorage, scheduler: SchedulerPort | typeof REAL_TIMERS = immediateScheduler()): Ports {
  const base = {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(`s${++seq}-`),
  };
  return scheduler === REAL_TIMERS ? base : { ...base, scheduler };
}

const INIT = (title: string, startDate = '2026-08-07', endDate = '2026-08-09') => ({
  title, startDate, endDate,
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
});

/** The save indicator exactly as `apps/web/src/App.tsx` renders it. */
function saveIndicator(store: ReturnType<typeof createStore>): string {
  const { status } = store.getState().persistence;
  if (status === 'conflict') return 'Not saved — edited elsewhere';
  if (status === 'error') return 'Not saved — retry';
  if (status === 'saving') return 'Saving…';
  return store.isDirty() ? 'Unsaved changes' : 'Saved';
}

/**
 * The banner text `apps/web/src/App.tsx` renders beneath the indicator, transcribed. §4.2
 * rule 6b requires it to name both recoveries — merge with the stored copy, export this copy.
 */
function banner(store: ReturnType<typeof createStore>): string {
  const { status, lastError } = store.getState().persistence;
  if (status === 'conflict') return `${lastError ?? ''} Merge and save. Export this copy.`;
  if (status === 'error') return `Not saved. ${lastError ?? ''} Retry. Export this copy.`;
  return '';
}

/** A storage whose next compare-and-set is refused, without any other writer existing. */
function refusingStorage(): MemoryStorage {
  const storage = memoryStorage();
  const real = storage.saveIfVersion.bind(storage);
  let armed = false;
  const port = storage as MemoryStorage & { arm(): void };
  port.arm = () => { armed = true; };
  storage.saveIfVersion = async (id, expected, doc, summary): Promise<SaveOutcome> => {
    if (armed) {
      armed = false;
      return { ok: false, storedVersion: (storage.versions.get(id) ?? null) as StorageVersion | null };
    }
    return real(id, expected, doc, summary);
  };
  return port;
}

/** A store with one trip and one edit dispatched but NOT yet written — the R3-2 window. */
async function pendingEdit(storage: MemoryStorage, scheduler = manualScheduler()) {
  const store = createStore({ ports: ports(storage, scheduler) });
  await store.createTrip(INIT('Outgoing'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'THE PENDING EDIT' } } as Action);
  assert.equal(store.isDirty(), true, 'the edit was already written — no pending window to test');
  assert.equal(scheduler.pending.length > 0, true, 'nothing was scheduled');
  return { store, id, dayId, scheduler };
}

const storedTitle = (storage: MemoryStorage, id: string) =>
  core.fromJSON(storage.docs.get(id) as string).days[0].title;

// ---------------------------------------------------------------------------
// The list is closed, and asserted as a ceiling FIRST (ROADMAP F).
// ---------------------------------------------------------------------------

test('exactly six store methods change the active document, and each flushes first', () => {
  const src = readFileSync(new URL('../src/store/store.ts', import.meta.url), 'utf8');
  // Methods of the returned object literal, at four-space indentation.
  const bounds = [...src.matchAll(/^ {4}(?:async )?(\w+)\(/gm)];
  assert.ok(bounds.length > 10, 'the store method scan found nothing — did the shape change?');

  const bodies = new Map<string, string>();
  for (let i = 0; i < bounds.length; i++) {
    const start = bounds[i].index as number;
    const end = i + 1 < bounds.length ? (bounds[i + 1].index as number) : src.length;
    bodies.set(bounds[i][1], src.slice(start, end));
  }

  // A method that assigns a different active document either names a new `activeTripId` or
  // resets to `initialState()`. Both are how `state.doc` becomes another document.
  const switchers = [...bodies.entries()]
    .filter(([, body]) => /activeTripId:/.test(body) || /\.\.\.initialState\(\)/.test(body))
    .map(([name]) => name)
    .sort();

  assert.deepEqual(switchers, ['adoptTrip', 'closeTrip', 'createTrip', 'deleteTrip', 'importDoc', 'openTrip'],
    'a seventh path assigns state.doc — §4.2 rule 6a is a CLOSED list');

  // And each of the six begins by flushing (deleteTrip is 6c: it cancels instead).
  for (const name of switchers) {
    const body = bodies.get(name) as string;
    assert.match(body, /flushForTransition\(\)|cancelTimer\(\)/,
      `${name} does not flush the pending write before changing the document`);
  }
});

// ---------------------------------------------------------------------------
// 6a — each of the six, with an edit in flight: the write lands FIRST.
// ---------------------------------------------------------------------------

test('6a closeTrip flushes the pending edit before the document goes away', async () => {
  const storage = memoryStorage();
  const { store, id, scheduler } = await pendingEdit(storage);
  await store.closeTrip();
  // ROADMAP F: "after the call returns" — the pending timer must not be what saves this.
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT');
  assert.equal(store.isDirty(), false);
  assert.equal(store.getState().doc, null, 'the trip did not actually close');
  scheduler.runAll();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT');
});

test('6a openTrip flushes the OUTGOING trip, and the write lands on it, not the incoming one', async () => {
  const storage = memoryStorage();
  // A second trip already in storage, made by a different store so `pendingEdit` is clean.
  const other = createStore({ ports: ports(storage) });
  await other.createTrip(INIT('Incoming', '2026-09-01', '2026-09-03'));
  const otherId = other.getState().activeTripId as string;
  const otherRevisionBefore = core.fromJSON(storage.docs.get(otherId) as string).revision;

  const { store, id, scheduler } = await pendingEdit(storage);
  await store.openTrip(otherId);
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT', "trip A's edit did not survive the switch");
  scheduler.runAll();
  await new Promise((r) => setTimeout(r, 5));

  assert.equal(core.fromJSON(storage.docs.get(otherId) as string).revision, otherRevisionBefore,
    "the pending write was executed against trip B");
  assert.equal(store.getState().activeTripId, otherId);
  assert.equal(store.isDirty(), false);
});

test('6a createTrip flushes the outgoing trip first', async () => {
  const storage = memoryStorage();
  const { store, id, scheduler } = await pendingEdit(storage);
  await store.createTrip(INIT('A brand new trip', '2026-10-01', '2026-10-03'));
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT');
  scheduler.runAll();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT');
  assert.equal(store.getState().doc?.title, 'A brand new trip');
  assert.equal(store.isDirty(), false);
});

test('6a adoptTrip flushes the outgoing trip first', async () => {
  const storage = memoryStorage();
  const sample = createStore({ ports: ports(memoryStorage()) });
  await sample.createTrip(INIT('Sample', '2026-11-01', '2026-11-03'));
  const sampleDoc = sample.getState().doc as core.Trip;

  const { store, id, scheduler } = await pendingEdit(storage);
  await store.adoptTrip(sampleDoc);
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT');
  scheduler.runAll();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT');
  assert.equal(store.getState().activeTripId, sampleDoc.id);
  assert.equal(store.isDirty(), false);
});

test('6a importDoc flushes the outgoing trip first', async () => {
  const storage = memoryStorage();
  const donor = createStore({ ports: ports(memoryStorage()) });
  await donor.createTrip(INIT('Backup', '2026-12-01', '2026-12-03'));
  const backup = await donor.exportActive();

  const { store, id, scheduler } = await pendingEdit(storage);
  await store.importDoc(backup);
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT');
  scheduler.runAll();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT');
  assert.equal(store.getState().doc?.title, 'Backup');
  assert.equal(store.isDirty(), false);
});

test('6a deleting some OTHER trip flushes the active one first', async () => {
  const storage = memoryStorage();
  const doomed = createStore({ ports: ports(storage) });
  await doomed.createTrip(INIT('Doomed', '2027-01-01', '2027-01-03'));
  const doomedId = doomed.getState().activeTripId as string;

  const { store, id, scheduler } = await pendingEdit(storage);
  await store.refreshLibrary();
  await store.deleteTrip(doomedId);

  // ROADMAP F: "after the call returns" — the pending timer must not be what saves this.
  assert.equal(storage.docs.has(doomedId), false, 'the other trip was not deleted');
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT', 'the active trip lost its pending edit');
  assert.equal(store.getState().activeTripId, id, 'the active trip changed');
  assert.equal(store.isDirty(), false);

  // And a late timer changes nothing.
  scheduler.runAll();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT');
});

test('6a a transition with nothing pending does not write at all', async () => {
  // Rule 6a puts a flush in front of every navigation. On a 176 KB document that must not
  // become a full re-write (and a burnt StorageVersion) every time the user clicks a trip.
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage) });
  await store.createTrip(INIT('Clean'));
  const id = store.getState().activeTripId as string;
  await store.flush();
  assert.equal(store.isDirty(), false, 'precondition: nothing to save');

  const writesBefore = storage.saveCount;
  const versionBefore = storage.versions.get(id);
  await store.closeTrip();
  await store.openTrip(id);
  await store.closeTrip();

  assert.equal(storage.saveCount, writesBefore, 'a clean navigation wrote the document anyway');
  assert.equal(storage.versions.get(id), versionBefore, 'a clean navigation burnt a StorageVersion');
});

// ---------------------------------------------------------------------------
// 6b — if the flush cannot succeed, the transition DOES NOT HAPPEN.
// ---------------------------------------------------------------------------

const refusedCases: Array<[string, (s: ReturnType<typeof createStore>, ctx: { otherId: string; backup: string; adopt: core.Trip }) => Promise<unknown>]> = [
  ['closeTrip', (s) => s.closeTrip()],
  ['openTrip', (s, c) => s.openTrip(c.otherId)],
  ['createTrip', (s) => s.createTrip(INIT('Should not exist', '2027-02-01', '2027-02-03'))],
  ['adoptTrip', (s, c) => s.adoptTrip(c.adopt)],
  ['importDoc', (s, c) => s.importDoc(c.backup)],
  ['deleteTrip (another trip)', (s, c) => s.deleteTrip(c.otherId)],
];

for (const [name, run] of refusedCases) {
  test(`6b a refused flush aborts ${name} and keeps the edit`, async () => {
    const storage = refusingStorage();
    const other = createStore({ ports: ports(storage) });
    await other.createTrip(INIT('Other', '2026-09-01', '2026-09-03'));
    const otherId = other.getState().activeTripId as string;
    const donor = createStore({ ports: ports(memoryStorage()) });
    await donor.createTrip(INIT('Backup', '2026-12-01', '2026-12-03'));
    const backup = await donor.exportActive();
    const adopt = donor.getState().doc as core.Trip;

    const { store, id } = await pendingEdit(storage);
    (storage as MemoryStorage & { arm(): void }).arm();
    await run(store, { otherId, backup, adopt });

    // The transition did not happen.
    assert.equal(store.getState().activeTripId, id, `${name} proceeded over an unsaved edit`);
    assert.equal(store.getState().doc?.days[0].title, 'THE PENDING EDIT', 'the edit left memory');
    assert.equal(store.getState().persistence.status, 'conflict');
    // The screen says so, and names both recoveries.
    assert.equal(saveIndicator(store), 'Not saved — edited elsewhere');
    assert.notEqual(saveIndicator(store), 'Saved');
    assert.match(banner(store), /merge with the stored copy/i);
    assert.match(banner(store), /export this copy/i);
    // The other trip is untouched — a refused delete deletes nothing.
    assert.equal(storage.docs.has(otherId), true, 'a refused transition still had a side effect');
    assert.notEqual(storedTitle(storage, id), 'THE PENDING EDIT');
  });
}

test('6b a FAILING storage aborts the transition too, with error rather than conflict', async () => {
  const storage = memoryStorage();
  const { store, id } = await pendingEdit(storage);
  storage.failNextSave = 'QuotaExceededError';
  await store.closeTrip();

  assert.equal(store.getState().activeTripId, id, 'closeTrip proceeded over a failed write');
  assert.equal(store.getState().doc?.days[0].title, 'THE PENDING EDIT');
  assert.equal(store.getState().persistence.status, 'error');
  assert.equal(saveIndicator(store), 'Not saved — retry');
  assert.match(banner(store), /export this copy/i);
});

test('6b the edit is still recoverable after a refused transition', async () => {
  // NO SILENT LOSS: "the edit is still in memory, SOME SURFACE STILL REACHES IT".
  const storage = refusingStorage();
  const { store, id } = await pendingEdit(storage);
  (storage as MemoryStorage & { arm(): void }).arm();
  await store.closeTrip();
  assert.equal(store.getState().persistence.status, 'conflict');

  const exported = await store.exportActive();
  assert.match(exported, /THE PENDING EDIT/);
  await store.mergeWithStored();
  assert.equal(store.getState().persistence.status, 'idle');
  assert.equal(storedTitle(storage, id), 'THE PENDING EDIT');
  assert.equal(saveIndicator(store), 'Saved');
});

// ---------------------------------------------------------------------------
// 6c — deleteTrip of the ACTIVE trip is the one exception.
// ---------------------------------------------------------------------------

test('6c deleting the active trip cancels the pending write without performing it', async () => {
  const storage = memoryStorage();
  const { store, id, scheduler } = await pendingEdit(storage);
  const writesBefore = storage.saveCount;

  await store.refreshLibrary();
  await store.deleteTrip(id);
  scheduler.runAll();
  await new Promise((r) => setTimeout(r, 5));

  assert.equal(storage.docs.has(id), false, 'the trip survived its own delete');
  assert.equal(storage.saveCount, writesBefore, 'a write reached the deleted id');
  assert.equal(store.getState().doc, null);
  assert.equal(store.getState().activeTripId, null);
  assert.equal(store.getState().library.some((r) => r.id === id), false);
});

test('6c a conflicted active trip is still deletable — 6b must not make it undeletable', async () => {
  const storage = refusingStorage();
  const { store, id } = await pendingEdit(storage);
  (storage as MemoryStorage & { arm(): void }).arm();
  await store.closeTrip();
  assert.equal(store.getState().persistence.status, 'conflict', 'precondition: the store is stuck');

  await store.deleteTrip(id);
  assert.equal(storage.docs.has(id), false, 'a conflicted trip could not be deleted');
  assert.equal(store.getState().doc, null);
});

// ---------------------------------------------------------------------------
// Belt and braces — a scheduled save captures its trip id and is DROPPED, not
// retargeted, if the document moved underneath it.
// ---------------------------------------------------------------------------

test('a late timer that finds a different document is dropped, never retargeted', async () => {
  const storage = memoryStorage();
  const other = createStore({ ports: ports(storage) });
  await other.createTrip(INIT('Incoming', '2026-09-01', '2026-09-03'));
  const otherId = other.getState().activeTripId as string;

  const { store, scheduler } = await pendingEdit(storage);
  // Switch WITHOUT going through a transition, by flushing the pending write first: the
  // timer that remains is the one this test is about.
  await store.openTrip(otherId);
  const incomingRevision = store.getState().doc?.revision as number;
  const incomingBytes = storage.docs.get(otherId) as string;

  // Whatever timers were left over now fire against a document that is not theirs.
  scheduler.runAll();
  await new Promise((r) => setTimeout(r, 5));

  assert.equal(store.getState().doc?.revision, incomingRevision, 'the late timer mutated the incoming trip');
  assert.equal(storage.docs.get(otherId), incomingBytes, 'the late timer wrote to the incoming trip');
});

// ---------------------------------------------------------------------------
// The injected fault ROADMAP F names: REAL timers, not the manual scheduler.
// "A test that only exercises the manual scheduler does not satisfy this."
// ---------------------------------------------------------------------------

test('REAL TIMERS: edit then closeTrip inside the debounce window keeps the edit', async () => {
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage, REAL_TIMERS), debounceMs: 400 });
  await store.createTrip(INIT('Real timers'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'TYPED THEN CLICKED' } } as Action);
  await store.closeTrip(); // a click ~0 ms later, well inside the 400 ms window
  await new Promise((r) => setTimeout(r, 600));

  assert.equal(storedTitle(storage, id), 'TYPED THEN CLICKED');
  assert.equal(store.isDirty(), false);
});

test("REAL TIMERS: edit trip A then openTrip B inside the window stores A's edit, not B's", async () => {
  const storage = memoryStorage();
  const b = createStore({ ports: ports(storage) });
  await b.createTrip(INIT('B', '2026-09-01', '2026-09-03'));
  const idB = b.getState().activeTripId as string;
  const bytesB = storage.docs.get(idB) as string;

  const store = createStore({ ports: ports(storage, REAL_TIMERS), debounceMs: 400 });
  await store.createTrip(INIT('A'));
  const idA = store.getState().activeTripId as string;
  const dayA = store.getState().doc?.days[0].id as string;

  store.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'A EDIT' } } as Action);
  await store.openTrip(idB);
  await new Promise((r) => setTimeout(r, 600));

  assert.equal(storedTitle(storage, idA), 'A EDIT', "trip A's edit was discarded by the switch");
  assert.equal(storage.docs.get(idB), bytesB, "trip A's pending write was executed against trip B");
  assert.equal(store.getState().activeTripId, idB);
  assert.equal(store.isDirty(), false);
});

test('REAL TIMERS: a refused flush inside the window refuses the transition', async () => {
  const storage = refusingStorage();
  const store = createStore({ ports: ports(storage, REAL_TIMERS), debounceMs: 400 });
  await store.createTrip(INIT('Real timers, refused'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MUST NOT VANISH' } } as Action);
  (storage as MemoryStorage & { arm(): void }).arm();
  await store.closeTrip();
  await new Promise((r) => setTimeout(r, 600));

  assert.equal(store.getState().activeTripId, id, 'the transition proceeded over an unsaved edit');
  assert.equal(store.getState().doc?.days[0].title, 'MUST NOT VANISH');
  assert.equal(saveIndicator(store), 'Not saved — edited elsewhere');
  assert.notEqual(storedTitle(storage, id), 'MUST NOT VANISH');
});

test('the conflict message names both recoveries', () => {
  // §4.2 rule 6b: "the screen names the two things the user can actually do — merge with
  // the stored copy, or export this copy."
  assert.match(CONFLICT_MESSAGE, /merge with the stored copy/i);
  assert.match(CONFLICT_MESSAGE, /export this copy/i);
});
