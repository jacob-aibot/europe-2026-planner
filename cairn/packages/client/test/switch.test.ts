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

// ---------------------------------------------------------------------------
// §4.2 rule 6a″, revision 5 (QA R6-1, R6-2). Exhausting `FLUSH_MAX_ATTEMPTS` is a
// refusal for DISPLAY as well as for control flow, and it is the ONE exit that
// re-arms the debounce — the other two must not, and this is a three-way rule.
// ---------------------------------------------------------------------------

/**
 * A storage that lands an edit inside every write's latency, so the document is dirty again
 * the instant `saveIfVersion` returns and the drain loop can never converge. ROADMAP names
 * exactly this shape ("a StoragePort that always leaves the document dirty after a write").
 */
type NeverSettling = MemoryStorage & { settle(): void; writes: number; edit: (() => void) | null };

function neverSettlingStorage(): NeverSettling {
  const storage = memoryStorage() as NeverSettling;
  const real = storage.saveIfVersion.bind(storage);
  let settled = false;
  storage.writes = 0;
  storage.edit = null;
  storage.settle = () => { settled = true; };
  storage.saveIfVersion = async (id, expected, doc, summary): Promise<SaveOutcome> => {
    storage.writes++;
    const outcome = await real(id, expected, doc, summary);
    if (!settled && storage.edit) storage.edit();
    return outcome;
  };
  return storage;
}

async function exhaustedFlush() {
  const storage = neverSettlingStorage();
  const scheduler = manualScheduler();
  const store = createStore({ ports: ports(storage, scheduler) });
  await store.createTrip(INIT('Never settles'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;
  let n = 0;
  storage.edit = () => {
    store.dispatch({ type: 'setDayMeta', dayId, patch: { title: `TYPING ${++n}` } } as Action);
  };
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'THE EDIT' } } as Action);
  await store.closeTrip();
  return { store, storage, scheduler, id, dayId };
}

test('R6-1: exhausting the flush bound is an ERROR the banner renders, not a silent no-op', async () => {
  const { store, storage, id } = await exhaustedFlush();

  assert.equal(store.getState().activeTripId, id, 'the transition happened over an unsettled document');
  assert.equal(store.isDirty(), true, 'the edit is not in memory any more');
  // The stored bytes are the other half of "dirty" — the document storage holds is NOT the
  // one in memory, which is exactly why the transition had to be refused.
  assert.notEqual(storedTitle(storage, id), store.getState().doc?.days[0].title,
    'storage already holds the in-memory document, so nothing was unsettled');
  assert.equal(store.getState().persistence.status, 'error');
  assert.notEqual(store.getState().persistence.lastError, undefined);

  // The RENDERED output, not the enum — a test that reads the enum keeps passing the day
  // the view stops reading it. It must name what happened and offer both recoveries.
  assert.notEqual(banner(store), '', 'the click did nothing and said nothing');
  assert.match(banner(store), /saving/i, 'the banner does not name what happened');
  assert.match(banner(store), /Retry/);
  assert.match(banner(store), /Export this copy/);
  assert.equal(saveIndicator(store), 'Not saved — retry');
  assert.notEqual(saveIndicator(store), 'Saved');
});

test('R6-1: the exhausted exit is NOT a conflict — nothing refused the write', async () => {
  // §4.2 rule 6a" is explicit: offering a merge would be a lie about what went wrong, since
  // nothing refused anything and there is no other writer to merge with.
  const { store } = await exhaustedFlush();
  assert.equal(store.getState().persistence.status, 'error');
  assert.notEqual(store.getState().persistence.status, 'conflict');
  assert.equal(banner(store).includes('Merge and save'), false);
});

test('R6-2: the exhausted exit RE-ARMS the debounce, and the edit lands with no further input', async () => {
  const { store, storage, scheduler, id } = await exhaustedFlush();

  // Behaviour, not the scheduler's bookkeeping (a cancelled job stays in `pending`): let the
  // port settle, fire what is scheduled, and require a write with NO user input at all.
  storage.settle();
  const before = storage.writes;
  scheduler.runAll();
  await settle();

  assert.ok(storage.writes > before,
    'the loop cancelled the timer on its last pass and never put it back — the document is ' +
      'dirty with no scheduled write until the user\'s next keystroke');
  assert.equal(store.isDirty(), false);
  assert.equal(store.getState().persistence.status, 'idle', 'the banner must clear when the write lands');
  assert.match(storedTitle(storage, id), /TYPING|THE EDIT/, 'the re-armed write never reached storage');
  assert.equal(saveIndicator(store), 'Saved');
});

test('R6-2 ceiling: a CONFLICT exit does not re-arm — it would spin against the fence', async () => {
  const storage = refusingStorage();
  const scheduler = manualScheduler();
  const store = createStore({ ports: ports(storage, scheduler) });
  await store.createTrip(INIT('Refused'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MINE' } } as Action);
  (storage as MemoryStorage & { arm(): void }).arm();
  await store.closeTrip();
  assert.equal(store.getState().persistence.status, 'conflict');

  // Behaviour, not the scheduler's bookkeeping: firing every scheduled job must produce no
  // further write. A re-armed autosave here would be refused against the same fence every
  // 400 ms forever; the user must merge or export.
  const before = countWrites(storage);
  scheduler.runAll();
  await settle();
  assert.equal(countWrites(storage), before, 'the conflict exit re-armed the autosave');
  assert.equal(store.isDirty(), true);
  assert.notEqual(storage.docs.get(id), undefined, 'precondition: the trip was never stored');
  assert.notEqual(storedTitle(storage, id), 'MINE', 'the refused write reached storage after all');
});

test('R6-2 ceiling: a port-FAILURE exit does not re-arm either — Retry is the deliberate act', async () => {
  const storage = memoryStorage();
  const scheduler = manualScheduler();
  const store = createStore({ ports: ports(storage, scheduler) });
  await store.createTrip(INIT('Broken port'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MINE' } } as Action);
  let attempts = 0;
  storage.saveIfVersion = async () => { attempts++; throw new Error('disk is on fire'); };
  await store.closeTrip();
  assert.equal(store.getState().persistence.status, 'error');

  const before = attempts;
  scheduler.runAll();
  await settle();
  assert.equal(attempts, before, 'the port is failing; the banner\'s Retry is the deliberate act');
  assert.equal(store.isDirty(), true);
  assert.notEqual(storedTitle(storage, id), 'MINE', 'the failed write reached storage after all');
});

// ---------------------------------------------------------------------------
// A-2 / QA R7-3 — `delete()` is a link on the serialization chain (§4.2 rule 6c,
// §4.3, revision 5). The exception is about not WRITING, not about not ORDERING.
// ---------------------------------------------------------------------------

/**
 * The store's source with every comment and string literal blanked out (spaces, so every
 * offset is preserved). A structural claim about *code* that a doc comment can satisfy is
 * not a structural claim — this file's own prose mentions `ports.storage.delete(id)` and
 * `chainOntoSaving(` several times.
 */
function codeOnly(src: string): string {
  let out = '';
  let i = 0;
  const blank = (n: number) => src.slice(i, i + n).replace(/[^\n]/g, ' ');
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === '//') {
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? src.length : end;
      out += blank(stop - i); i = stop; continue;
    }
    if (two === '/*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += blank(stop - i); i = stop; continue;
    }
    const q = src[i];
    if (q === "'" || q === '"' || q === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== q) j += src[j] === '\\' ? 2 : 1;
      const stop = Math.min(j + 1, src.length);
      out += blank(stop - i); i = stop; continue;
    }
    out += src[i]; i += 1;
  }
  return out;
}

/** Is `index` lexically inside the argument list of some `chainOntoSaving(` call? */
function insideChain(code: string, index: number): boolean {
  for (const m of code.matchAll(/chainOntoSaving\(/g)) {
    const open = (m.index as number) + 'chainOntoSaving'.length;
    if (open > index) continue;
    let depth = 0;
    for (let i = open; i < code.length; i++) {
      if (code[i] === '(') depth++;
      else if (code[i] === ')') { depth--; if (depth === 0) { if (index < i) return true; break; } }
    }
  }
  return false;
}

/** The `[start, end)` character range of a named function's body in `code`, braces balanced. */
function bodyRange(code: string, decl: RegExp): [number, number] {
  const m = decl.exec(code);
  assert.ok(m, `${decl} not found — re-derive this assertion against the store's new shape`);
  // Step over the PARAMETER list first: an inline object type in a parameter (`merge: {
  // message: string; … }`) puts a `{` before the body's own brace.
  let i = (m.index as number) + m[0].length - 1;
  let paren = 0;
  for (; i < code.length; i++) {
    if (code[i] === '(') paren++;
    else if (code[i] === ')') { paren--; if (paren === 0) { i++; break; } }
  }
  const open = code.indexOf('{', i);
  let depth = 0;
  for (let j = open; j < code.length; j++) {
    if (code[j] === '{') depth++;
    else if (code[j] === '}') { depth--; if (depth === 0) return [open, j]; }
  }
  throw new Error(`unbalanced body for ${decl}`);
}

/**
 * ROADMAP E's structural half of the `delete()`-on-the-chain criterion (§4.3, revision 5).
 *
 * *"Every `ports.storage.*` call that is not `listTrips` or `load` is issued from inside the
 * store's serialization chain."* It is asserted as a composition rather than as one grep,
 * because `saveIfVersion` is reached through two helpers rather than written out at each call
 * site — which is the same shape QA's own `r7-chain` §11 uses. Expected violations: zero.
 *
 * **Phase 2 I-6a (§4.3 A-30) takes `saveIfVersion` back to one call site and adds
 * `refreshSummary` as the rescan's.** I-6 brought a stale row current by rewriting the whole
 * record, which minted a version for a document that had not changed and knocked another tab
 * into a conflict with nothing to merge (QA R26-6). The rescan now issues a summary-only write
 * instead, and it is the literal shape §4.3 describes rather than a new exemption: **the §4.3
 * exemption list stays `listTrips` and `load`, and `refreshSummary` is not on it.** So the
 * criterion's own sentence holds unchanged — every `saveIfVersion` call site is inside
 * `writeAndSettle` (whose every caller clause 2 checks), and every other `ports.storage`
 * mutation, `refreshSummary` included, is lexically inside a `chainOntoSaving` callback. The
 * counts are pinned, so a new write path fails here until somebody re-derives this deliberately.
 *
 * **What this does NOT prove — BUILD-NOTES KD-62.** `insideChain` is a *lexical* test. A write
 * wrapped in a thunk created inside the callback and invoked after it returns passes here while
 * running off the chain, and nothing else in the suite catches that either (measured). The
 * property asserted is §4.3's own wording; making it an ordering guarantee needs dataflow
 * analysis over the store rather than a regex, which is an architect's call.
 */
test('structural: every ports.storage mutation is issued inside a chainOntoSaving callback', () => {
  const code = codeOnly(readFileSync(new URL('../src/store/store.ts', import.meta.url), 'utf8'));
  const lineOf = (i: number) => code.slice(0, i).split('\n').length;
  const [wsStart, wsEnd] = bodyRange(code, /async function writeAndSettle\(/);
  const [asStart, asEnd] = bodyRange(code, /async function attemptSave\(/);

  // 1. One `saveIfVersion` call site, in `writeAndSettle`. A second is a new DOCUMENT write
  //    path and is not blessed by this assertion.
  const saves = [...code.matchAll(/ports\.storage\.saveIfVersion\(/g)].map((m) => m.index as number);
  assert.equal(saves.length, 1, 'saveIfVersion call sites: writeAndSettle, and nothing else');
  assert.equal(
    saves.filter((i) => i > wsStart && i < wsEnd).length,
    1,
    'writeAndSettle must hold exactly one saveIfVersion call site',
  );

  // 1b. …and one `refreshSummary` call site — the rescan's — lexically inside a
  //     `chainOntoSaving` callback. **A-30 test (d): hoist it one frame out and this reds.**
  const refreshes = [...code.matchAll(/ports\.storage\.refreshSummary\(/g)].map((m) => m.index as number);
  assert.equal(refreshes.length, 1, 'refreshSummary call sites: the SUMMARY_VERSION rescan, and nothing else');
  for (const i of refreshes) {
    assert.ok(
      insideChain(code, i),
      `a refreshSummary at line ${lineOf(i)} is off the serialization chain — it is NOT exempt`,
    );
  }

  const callSites = (name: string) =>
    [...code.matchAll(new RegExp(`(?<![\\w.])${name}\\(`, 'g'))]
      .map((m) => m.index as number)
      .filter((i) => !/function\s*$/.test(code.slice(Math.max(0, i - 20), i)));

  // 2. Every `writeAndSettle` call site is on the chain — directly, or through `attemptSave`.
  const settles = callSites('writeAndSettle');
  assert.ok(settles.length >= 3, `only ${settles.length} writeAndSettle call sites found`);
  // 3. …and every `attemptSave` call site is directly inside a `chainOntoSaving` callback.
  const attempts = callSites('attemptSave');
  assert.ok(attempts.length >= 1, 'attemptSave is gone — re-derive this assertion');
  // 4. …as is every `ports.storage.delete` call site (§4.2 rule 6c, revision 5).
  const deletes = [...code.matchAll(/ports\.storage\.delete\(/g)].map((m) => m.index as number);
  assert.ok(deletes.length >= 1, 'deleteTrip no longer calls the port');

  const offenders: string[] = [];
  for (const i of settles) {
    if (insideChain(code, i) || (i > asStart && i < asEnd)) continue;
    offenders.push(`writeAndSettle at line ${lineOf(i)}`);
  }
  for (const i of [...attempts, ...deletes, ...refreshes]) {
    if (insideChain(code, i)) continue;
    offenders.push(`${code.slice(i, code.indexOf('(', i))} at line ${lineOf(i)}`);
  }
  assert.deepEqual(
    offenders,
    [],
    'a storage mutation reaches the port without the serialization chain (§4.3) — a delete ' +
      'makes a record absent and an expect-absent write is SATISFIED by absence, so the only ' +
      'thing standing between the two kinds of mutation is their order',
  );

  // And the other half, so this cannot be satisfied by deleting the mutations: the port has
  // no method this assertion has failed to classify.
  const all = [...code.matchAll(/ports\.storage\.(\w+)\(/g)].map((m) => m[1]);
  assert.deepEqual(
    [...new Set(all)].sort(),
    ['delete', 'listTrips', 'load', 'refreshSummary', 'saveIfVersion'],
    'the storage port grew a method this assertion does not classify',
  );
});

/** Parks the port's next writes until `open()` is called. */
function latch(storage: MemoryStorage): () => void {
  const real = storage.saveIfVersion.bind(storage);
  let open: () => void = () => {};
  const gate = new Promise<void>((r) => { open = r; });
  storage.saveIfVersion = async (a, b, c, d): Promise<SaveOutcome> => { await gate; return real(a, b, c, d); };
  return () => open();
}

test('R7-3: a queued expect-absent write cannot resurrect a trip the user deleted', async () => {
  // The dangerous shape is `mergeWithStored`'s DELETED-TRIP branch: its expectation is
  // `null`, and an expect-absent write is SATISFIED by the record's absence — so a write
  // still queued when the delete lands succeeds, `upsertSummary` puts the library row back,
  // and the trip is resurrected with the delete silently undone.
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage), autosave: false });
  await store.createTrip(INIT('Doomed'));
  const id = store.getState().activeTripId as string;
  await store.flush();

  // Another writer destroyed it, which is what puts this tab in the deleted-trip branch.
  storage.docs.delete(id);
  storage.versions.delete(id);
  const open = latch(storage);

  const merging = store.mergeWithStored().catch(() => undefined);
  await settle();
  const deleting = store.deleteTrip(id);
  await settle();
  open();
  await Promise.allSettled([merging, deleting]);
  await settle();

  assert.equal(storage.docs.has(id), false, 'the queued expect-absent write resurrected the trip');
  assert.equal(store.getState().library.some((r) => r.id === id), false, 'the library row came back');
});

test('R7-3: a write queued BEFORE the delete settles first, and the delete still wins', async () => {
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage), autosave: false });
  await store.createTrip(INIT('Doomed 2'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;
  await store.flush();

  const open = latch(storage);
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'LAST WORDS' } } as Action);
  const writing = store.flush();
  await settle();
  const deleting = store.deleteTrip(id);
  await settle();
  open();
  await Promise.allSettled([writing, deleting]);
  await settle();

  assert.equal(storage.docs.has(id), false, 'the trip is back in storage after an explicit delete');
  assert.equal(store.getState().library.some((r) => r.id === id), false);
  assert.equal(store.getState().doc, null, 'the active document survived its own deletion');
  assert.equal(store.getState().persistence.savedDoc, null, 'savedDoc points at a trip that no longer exists');
  assert.equal(store.getState().persistence.savedVersion, null, 'the fence pointer outlived the record');
});

test('6c survives A-2: a CONFLICTED active trip is still deletable', async () => {
  const storage = refusingStorage();
  const store = createStore({ ports: ports(storage), autosave: false });
  await store.createTrip(INIT('Conflicted but deletable'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MINE' } } as Action);
  (storage as MemoryStorage & { arm(): void }).arm();
  await store.flush();
  assert.equal(store.getState().persistence.status, 'conflict', 'precondition: not conflicted');

  await store.deleteTrip(id);
  assert.equal(storage.docs.has(id), false, '6b made a conflicted trip undeletable — that is what 6c exists to stop');
  assert.equal(store.getState().doc, null);
});

/** Lets every already-queued microtask and resolved promise drain. */
function settle(turns = 8): Promise<void> {
  let p = Promise.resolve();
  for (let i = 0; i < turns; i++) p = p.then(() => undefined);
  return p;
}

/** How many times this storage's compare-and-set has been called. */
function countWrites(storage: MemoryStorage): number {
  const counted = storage as MemoryStorage & { __writes?: number };
  if (counted.__writes === undefined) {
    counted.__writes = 0;
    const real = storage.saveIfVersion.bind(storage);
    storage.saveIfVersion = async (a, b, c, d): Promise<SaveOutcome> => {
      counted.__writes = (counted.__writes ?? 0) + 1;
      return real(a, b, c, d);
    };
  }
  return counted.__writes;
}
