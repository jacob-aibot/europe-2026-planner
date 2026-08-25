/**
 * The client acceptance criteria from ROADMAP.md Phase 1, "And in the client, without a
 * browser". One test per criterion, plus the failure modes the tester is told to attack.
 *
 * Runs in plain Node against the in-memory ports: no DOM, no IndexedDB, no network.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, ACTION_SPECS, HISTORY_LIMIT, computeDerived, derivedFor,
  initialState, reduce, undo, redo, setUi,
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, manualScheduler, immediateScheduler,
  core,
} from '../src/index.ts';
import type { Action } from '../src/index.ts';
import type { Ports } from '../src/ports/types.ts';

const TODAY = '2026-08-01';

function ports(storage = memoryStorage()): Ports & { storage: ReturnType<typeof memoryStorage> } {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(),
    scheduler: immediateScheduler(),
  } as Ports & { storage: ReturnType<typeof memoryStorage> };
}

const TRIP_INIT = {
  title: 'Test trip',
  startDate: '2026-08-07',
  endDate: '2026-08-10',
  cities: [
    { key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } },
    { key: 'split', name: 'Split', centre: { lat: 43.5081, lng: 16.4402 } },
  ],
};

async function storeWithTrip(p = ports()) {
  const store = createStore({ ports: p });
  await store.createTrip(TRIP_INIT);
  return store;
}

function firstDayId(store: Awaited<ReturnType<typeof storeWithTrip>>): string {
  const doc = store.getState().doc;
  assert.ok(doc, 'expected an active trip');
  return doc.days[0].id;
}

function addStopAction(dayId: string, name: string, order = 0): Action {
  return {
    type: 'addStop',
    placement: { kind: 'scheduled', dayId, time: '09:00', order },
    stop: { name, category: 'sight', place: { kind: 'inline', at: { lat: 48.2082, lng: 16.3738 } } },
  } as Action;
}

// ---------------------------------------------------------------------------
// 1. every action dispatches to exactly one core build function;
//    the reducer contains no domain logic
// ---------------------------------------------------------------------------

test('every action maps 1:1 onto a core export that exists', () => {
  const names = Object.keys(ACTION_SPECS);
  assert.ok(names.length > 0, 'ACTION_SPECS is empty');
  for (const [type, spec] of Object.entries(ACTION_SPECS)) {
    const fn = (core as unknown as Record<string, unknown>)[spec.coreFn];
    assert.equal(typeof fn, 'function', `action ${type} names core.${spec.coreFn}, which is not a function`);
  }
});

test('the reducer holds no domain logic — no switch over action types', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(resolve(here, '../src/store/reducer.ts'), 'utf8');
  // A `switch` on the action would be the reducer starting to decide domain questions.
  assert.ok(!/switch\s*\(\s*action/.test(src), 'reducer switches on the action — domain logic has leaked in');
  for (const type of Object.keys(ACTION_SPECS)) {
    assert.ok(!src.includes(`'${type}'`), `reducer mentions the action type ${type} by name`);
  }
});

test('applyAction calls the core function and returns a new immutable trip', async () => {
  const store = await storeWithTrip();
  const before = store.getState().doc;
  assert.ok(before);
  const frozen = JSON.stringify(before);
  store.dispatch(addStopAction(before.days[0].id, 'Belvedere'));
  const after = store.getState().doc;
  assert.ok(after);
  assert.notEqual(after, before, 'dispatch must not mutate in place');
  assert.equal(JSON.stringify(before), frozen, 'the previous trip was mutated');
  assert.equal(after.revision, before.revision + 1);
  assert.equal(after.days[0].stops.length, 1);
  assert.equal(after.days[0].stops[0].name, 'Belvedere');
});

test('an unknown action is a loud programmer error, not a silent no-op', async () => {
  const store = await storeWithTrip();
  assert.throws(() => store.dispatch({ type: 'nope' } as unknown as Action), /unknown action/);
});

// ---------------------------------------------------------------------------
// 2. ui state never appears in a persisted document (assert on the saved bytes)
// ---------------------------------------------------------------------------

test('ui state never reaches the saved bytes', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  const dayId = firstDayId(store);

  store.setUi({ activeDayId: dayId, panel: 'conflicts', selectedStopId: 'stop-1', mapScope: 'all', ruleFilter: 'geo_outlier' });
  store.dispatch(addStopAction(dayId, 'Schönbrunn'));
  await store.flush();

  const saved = p.storage.docs.get(store.getState().activeTripId as string);
  assert.ok(saved, 'nothing was saved');
  const parsed = JSON.parse(saved) as Record<string, unknown>;
  for (const key of ['ui', 'activeDayId', 'panel', 'selectedStopId', 'mapScope', 'ruleFilter', 'history', 'persistence', 'library']) {
    assert.ok(!(key in parsed), `saved document contains ui/store key "${key}"`);
  }
  // and not nested anywhere either
  assert.ok(!/"panel"\s*:/.test(saved), 'saved bytes mention a ui panel');
  assert.ok(!/"mapScope"\s*:/.test(saved), 'saved bytes mention mapScope');
});

test('setUi never schedules a save', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  const before = p.storage.saveCount;
  store.setUi({ panel: 'validation' });
  store.setUi({ selectedStopId: 'x' });
  assert.equal(p.storage.saveCount, before, 'a ui change wrote to storage');
});

// ---------------------------------------------------------------------------
// 3. derived is recomputed on doc.revision change and never read stale
// ---------------------------------------------------------------------------

test('derived is cached per revision and recomputed when the revision moves', async () => {
  const store = await storeWithTrip();
  const dayId = firstDayId(store);

  const first = store.getDerived();
  assert.ok(first);
  assert.equal(store.getDerived(), first, 'derived recomputed with no edit in between');

  store.dispatch(addStopAction(dayId, 'Prater'));
  const second = store.getDerived();
  assert.ok(second);
  assert.notEqual(second, first, 'derived was not recomputed after an edit');
  assert.equal(second.revision, store.getState().doc?.revision);
  assert.equal(second.days[dayId].legs.length, 1);
});

test('derivedFor keys on (tripId, revision), not revision alone', () => {
  const ctx = { ids: sequentialIdPort(), now: TODAY, actorUserId: core.LOCAL_OWNER };
  const a = core.createTrip({ ...TRIP_INIT, id: 'trip-a', title: 'A' }, ctx);
  const b = core.createTrip({ ...TRIP_INIT, id: 'trip-b', title: 'B' }, ctx);
  assert.equal(a.revision, b.revision, 'precondition: two fresh trips sit at the same revision');

  const cacheA = computeDerived(a, TODAY);
  const got = derivedFor(cacheA, b, TODAY);
  assert.ok(got);
  assert.equal(got.tripId, 'trip-b', 'trip B read trip A’s derived data');
});

test('derived never goes stale across undo', async () => {
  const store = await storeWithTrip();
  const dayId = firstDayId(store);
  store.dispatch(addStopAction(dayId, 'Stephansdom'));
  assert.equal(store.getDerived()?.days[dayId].legs.length, 1);
  store.undo();
  assert.equal(store.getDerived()?.days[dayId].legs.length, 0, 'derived still shows the undone stop');
});

// ---------------------------------------------------------------------------
// 4. undo/redo restores the previous Trip exactly, to a depth of 50
// ---------------------------------------------------------------------------

test('undo restores the previous trip exactly', async () => {
  const store = await storeWithTrip();
  const dayId = firstDayId(store);
  const before = store.getState().doc;
  store.dispatch(addStopAction(dayId, 'Hofburg'));
  store.undo();
  assert.deepEqual(store.getState().doc, before);
  store.redo();
  assert.equal(store.getState().doc?.days[0].stops[0].name, 'Hofburg');
});

test('history is bounded at 50 and drops the oldest, not the newest', async () => {
  const store = await storeWithTrip();
  const dayId = firstDayId(store);
  assert.equal(HISTORY_LIMIT, 50);

  for (let i = 0; i < HISTORY_LIMIT + 10; i++) store.dispatch(addStopAction(dayId, `stop ${i}`, i));
  assert.equal(store.getState().history.past.length, HISTORY_LIMIT);

  for (let i = 0; i < HISTORY_LIMIT; i++) store.undo();
  assert.equal(store.getState().history.past.length, 0);
  // 60 edits, 50 undone: the 10 oldest survive because their history fell off the end.
  assert.equal(store.getState().doc?.days[0].stops.length, 10);
  store.undo();
  assert.equal(store.getState().doc?.days[0].stops.length, 10, 'undo past the limit changed the document');
});

test('a new edit clears the redo stack', async () => {
  const store = await storeWithTrip();
  const dayId = firstDayId(store);
  store.dispatch(addStopAction(dayId, 'one'));
  store.undo();
  assert.equal(store.getState().history.future.length, 1);
  store.dispatch(addStopAction(dayId, 'two'));
  assert.equal(store.getState().history.future.length, 0);
  store.redo();
  assert.equal(store.getState().doc?.days[0].stops[0].name, 'two');
});

test('undo and redo on a fresh trip are no-ops, not throws', async () => {
  const store = await storeWithTrip();
  const doc = store.getState().doc;
  store.undo();
  store.redo();
  assert.deepEqual(store.getState().doc, doc);
});

// ---------------------------------------------------------------------------
// 5. a failing StoragePort.save puts persistence.status='error' and never
//    drops the edit silently
// ---------------------------------------------------------------------------

test('a failing save surfaces as an error and keeps the edit in memory', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  const dayId = firstDayId(store);

  p.storage.failAll = 'QuotaExceededError';
  store.dispatch(addStopAction(dayId, 'Naschmarkt'));
  await store.flush();

  const state = store.getState();
  assert.equal(state.persistence.status, 'error');
  assert.match(state.persistence.lastError ?? '', /QuotaExceeded/);
  assert.equal(state.doc?.days[0].stops[0].name, 'Naschmarkt', 'the edit was dropped');
  assert.ok(store.isDirty(), 'a failed save must leave the store dirty');
});

test('a later successful save clears the error and marks the store clean', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  const dayId = firstDayId(store);

  p.storage.failAll = 'disk on fire';
  store.dispatch(addStopAction(dayId, 'Karlskirche'));
  await store.flush();
  assert.equal(store.getState().persistence.status, 'error');

  p.storage.failAll = null;
  await store.flush();
  assert.equal(store.getState().persistence.status, 'idle');
  assert.equal(store.isDirty(), false);
  const saved = p.storage.docs.get(store.getState().activeTripId as string);
  assert.ok(saved?.includes('Karlskirche'), 'the retried save did not contain the edit');
});

test('autosave is debounced: many edits, one write', async () => {
  const sched = manualScheduler();
  const p = { ...ports(), scheduler: sched };
  const store = createStore({ ports: p as Ports });
  await store.createTrip(TRIP_INIT);
  const dayId = firstDayId(store as never);
  const baseline = (p.storage as ReturnType<typeof memoryStorage>).saveCount;

  for (let i = 0; i < 5; i++) store.dispatch(addStopAction(dayId, `s${i}`, i));
  assert.equal((p.storage as ReturnType<typeof memoryStorage>).saveCount, baseline, 'wrote before the debounce fired');
  sched.runAll();
  await store.flush();
  assert.ok((p.storage as ReturnType<typeof memoryStorage>).saveCount <= baseline + 2, 'debounce did not coalesce the writes');
});

// ---------------------------------------------------------------------------
// 6. two trips in the library do not leak state into each other when switching
// ---------------------------------------------------------------------------

test('switching trips resets doc, history, derived and ui selection', async () => {
  const p = ports();
  const store = createStore({ ports: p });

  await store.createTrip({ ...TRIP_INIT, title: 'Trip A' });
  const idA = store.getState().activeTripId as string;
  const dayA = firstDayId(store as never);
  store.dispatch(addStopAction(dayA, 'only in A'));
  store.setUi({ panel: 'conflicts', selectedStopId: 'sA' });
  await store.flush();

  await store.createTrip({ ...TRIP_INIT, title: 'Trip B', startDate: '2026-09-01', endDate: '2026-09-03' });
  const idB = store.getState().activeTripId as string;
  assert.notEqual(idA, idB);
  await store.flush();

  const b = store.getState();
  assert.equal(b.history.past.length, 0, 'history leaked across the switch');
  assert.equal(b.doc?.days.some((d) => d.stops.length > 0), false, 'trip B has trip A’s stops');
  assert.equal(b.ui.selectedStopId, null, 'ui selection leaked across the switch');

  await store.refreshLibrary();
  assert.equal(store.getState().library.length, 2);

  await store.openTrip(idA);
  const a = store.getState();
  assert.equal(a.doc?.title, 'Trip A');
  assert.equal(a.doc?.days[0].stops[0].name, 'only in A');
  assert.equal(a.history.past.length, 0);
  assert.equal(a.ui.panel, 'timeline', 'ui panel survived a trip switch');
  assert.equal(store.getDerived()?.tripId, idA, 'derived cache still points at the other trip');
});

test('openTrip on a missing id throws rather than blanking the app', async () => {
  const store = await storeWithTrip();
  await assert.rejects(() => store.openTrip('trip-does-not-exist'), /no trip/);
});

test('openTrip on a corrupt document throws a TripParseError with a path', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.storage.docs.set('corrupt', '{"schemaVersion":1,"days":"not an array"}');
  await assert.rejects(() => store.openTrip('corrupt'), (err: Error) => {
    assert.equal(err.name, 'TripParseError', `expected a TripParseError, got ${err.name}`);
    assert.match(err.message, /\(at \$\./, 'the parse error carries no JSON path');
    return true;
  });
});

test('deleting the active trip clears the document but keeps the rest of the library', async () => {
  const p = ports();
  const store = createStore({ ports: p });
  await store.createTrip({ ...TRIP_INIT, title: 'Keep' });
  const keep = store.getState().activeTripId as string;
  await store.flush();
  await store.createTrip({ ...TRIP_INIT, title: 'Drop' });
  const drop = store.getState().activeTripId as string;
  await store.flush();
  await store.refreshLibrary();

  await store.deleteTrip(drop);
  assert.equal(store.getState().doc, null);
  assert.equal(store.getState().library.some((r) => r.id === drop), false);
  assert.equal(store.getState().library.some((r) => r.id === keep), true);
  assert.equal(p.storage.docs.has(keep), true);
});

// ---------------------------------------------------------------------------
// import / export — "may not be stubbed"
// ---------------------------------------------------------------------------

test('export round-trips through import without overwriting the original', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  const dayId = firstDayId(store);
  store.dispatch(addStopAction(dayId, 'Röntgen'));  // non-ascii, must survive
  await store.flush();

  const text = await store.exportActive();
  const originalId = store.getState().activeTripId as string;
  await store.refreshLibrary();

  await store.importDoc(text);
  const imported = store.getState();
  assert.notEqual(imported.activeTripId, originalId, 'import overwrote the existing trip');
  assert.match(imported.doc?.title ?? '', /imported/);
  assert.equal(imported.doc?.days[0].stops[0].name, 'Röntgen');

  await store.refreshLibrary();
  assert.equal(store.getState().library.length, 2);
});

test('importing malformed JSON throws and leaves the active trip alone', async () => {
  const store = await storeWithTrip();
  const before = store.getState().doc;
  await assert.rejects(() => store.importDoc('{ not json'));
  assert.deepEqual(store.getState().doc, before);
});

// ---------------------------------------------------------------------------
// determinism — the reducer may not read an ambient clock or RNG
// ---------------------------------------------------------------------------

test('client store sources have no ambient Date.now, Math.random or randomUUID', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = resolve(here, '../src/store');
  for (const f of readdirSync(dir)) {
    const src = readFileSync(resolve(dir, f), 'utf8');
    assert.ok(!/Date\.now\(/.test(src), `${f} calls Date.now()`);
    assert.ok(!/Math\.random\(/.test(src), `${f} calls Math.random()`);
    assert.ok(!/randomUUID\(/.test(src), `${f} calls crypto.randomUUID()`);
  }
});

test('the client imports no DOM, React or network API', async () => {
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, '../src');
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((n) => {
      const full = resolve(d, n);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  const stripComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const f of walk(root)) {
    const src = stripComments(readFileSync(f, 'utf8'));
    assert.ok(!/from ['"]react/.test(src), `${f} imports React`);
    assert.ok(!/\bdocument\.|window\.|localStorage|indexedDB/.test(src), `${f} touches the DOM`);
    assert.ok(!/\bfetch\(|XMLHttpRequest|WebSocket/.test(src), `${f} makes a network call`);
  }
});

// ---------------------------------------------------------------------------
// the pure reducer, exercised without a store
// ---------------------------------------------------------------------------

test('reduce on a state with no document is a loud error', () => {
  assert.throws(() => reduce(initialState(), { type: 'ensureDays' } as Action, { ids: sequentialIdPort(), now: TODAY }), /no active trip/);
});

test('setUi is pure and leaves the document identical', () => {
  const ctx = { ids: sequentialIdPort(), now: TODAY, actorUserId: core.LOCAL_OWNER };
  const doc = core.createTrip(TRIP_INIT, ctx);
  const s0 = { ...initialState(), doc };
  const s1 = setUi(s0, { panel: 'places' });
  assert.equal(s1.doc, doc, 'setUi replaced the document object');
  assert.equal(s0.ui.panel, 'timeline', 'setUi mutated the input state');
  assert.equal(s1.ui.panel, 'places');
});

test('undo/redo on the pure reducer are no-ops without a document', () => {
  const s = initialState();
  assert.equal(undo(s), s);
  assert.equal(redo(s), s);
});

// ---------------------------------------------------------------------------
// F-1 — the revision guard. Two tabs on one trip.
//
// `save()` used to write the whole document with no compare-and-set, so the
// second tab's write destroyed the first tab's edits and the LOSING tab still
// displayed "Saved". §2.2 promises "last-writer-wins per stop with a revision
// guard"; these tests are that sentence, both halves.
// ---------------------------------------------------------------------------

/** Two independent stores over ONE storage — the in-Node equivalent of two browser tabs. */
async function twoTabs() {
  const storage = memoryStorage();
  const a = createStore({ ports: ports(storage) });
  await a.createTrip(TRIP_INIT);
  const tripId = a.getState().activeTripId as string;
  const b = createStore({ ports: ports(storage) });
  await b.refreshLibrary();
  await b.openTrip(tripId);
  return { storage, a, b, tripId };
}

test('two tabs editing different days: both edits survive', async () => {
  const { storage, a, b, tripId } = await twoTabs();
  const dayA = a.getState().doc?.days[0].id as string;
  const dayB = a.getState().doc?.days[1].id as string;

  a.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'TAB A EDIT' } } as Action);
  await a.flush();
  b.dispatch({ type: 'setDayMeta', dayId: dayB, patch: { title: 'TAB B EDIT' } } as Action);
  await b.flush();

  const stored = core.fromJSON(storage.docs.get(tripId) as string);
  assert.equal(stored.days[0].title, 'TAB A EDIT', "tab A's edit was destroyed");
  assert.equal(stored.days[1].title, 'TAB B EDIT', "tab B's edit was destroyed");
  assert.equal(b.getState().persistence.status, 'idle');
  assert.equal(b.isDirty(), false, 'tab B is genuinely saved');
});

test('the merged document is what tab B now holds, so its next save is not stale again', async () => {
  const { storage, a, b, tripId } = await twoTabs();
  const dayA = a.getState().doc?.days[0].id as string;
  const dayB = a.getState().doc?.days[1].id as string;

  a.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'TAB A EDIT' } } as Action);
  await a.flush();
  b.dispatch({ type: 'setDayMeta', dayId: dayB, patch: { title: 'TAB B EDIT' } } as Action);
  await b.flush();
  assert.equal(b.getState().doc?.days[0].title, 'TAB A EDIT', 'tab B did not take on the merged state');

  b.dispatch({ type: 'setDayMeta', dayId: dayB, patch: { title: 'TAB B AGAIN' } } as Action);
  await b.flush();
  assert.equal(b.getState().persistence.status, 'idle');
  const stored = core.fromJSON(storage.docs.get(tripId) as string);
  assert.equal(stored.days[0].title, 'TAB A EDIT');
  assert.equal(stored.days[1].title, 'TAB B AGAIN');
});

test('two tabs editing the SAME thing: the last writer wins and the loss is reported, never silent', async () => {
  const { storage, a, b, tripId } = await twoTabs();
  const day = a.getState().doc?.days[0].id as string;

  a.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'A' } } as Action);
  await a.flush();
  b.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'B' } } as Action);
  await b.flush();

  assert.equal(core.fromJSON(storage.docs.get(tripId) as string).days[0].title, 'B');
  const merge = b.getState().persistence.lastMerge;
  assert.ok(merge, 'the overwrite was silent');
  assert.match(merge.message, /edited elsewhere/i);
  assert.deepEqual(merge.report.overwritten, [{ entity: 'day', id: day, field: 'title' }]);
});

test('a save with no common ancestor refuses, and the losing tab does NOT say "Saved"', async () => {
  const storage = memoryStorage();
  const a = createStore({ ports: ports(storage) });
  await a.createTrip(TRIP_INIT);
  const tripId = a.getState().activeTripId as string;
  const day = a.getState().doc?.days[0].id as string;
  a.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'REAL PLAN' } } as Action);
  await a.flush();

  // A store that mints a trip onto an id storage already holds: no common ancestor, so
  // there is nothing to merge against and the write must be refused outright.
  const b = createStore({ ports: ports(storage) });
  await b.createTrip({ ...TRIP_INIT, id: tripId } as Parameters<typeof b.createTrip>[0]);
  b.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'CLOBBER' } } as Action);
  await b.flush();

  assert.equal(b.getState().persistence.status, 'error', 'a stale writer reported success');
  assert.equal(b.isDirty(), true, 'the edit must still be in memory and known unsaved');
  assert.match(b.getState().persistence.lastError ?? '', /changed|stale|elsewhere/i);
  assert.equal(core.fromJSON(storage.docs.get(tripId) as string).days[0].title, 'REAL PLAN');
});

test('adoptTrip opens the stored trip rather than overwriting it', async () => {
  const storage = memoryStorage();
  const a = createStore({ ports: ports(storage) });
  await a.createTrip(TRIP_INIT);
  const tripId = a.getState().activeTripId as string;
  const day = a.getState().doc?.days[0].id as string;
  a.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'REAL PLAN' } } as Action);
  await a.flush();

  const original = core.fromJSON(storage.docs.get(tripId) as string);
  const b = createStore({ ports: ports(storage) });
  await b.adoptTrip({ ...original, days: original.days.map((d, i) => (i === 0 ? { ...d, title: 'STALE' } : d)) });
  assert.equal(b.getState().doc?.days[0].title, 'REAL PLAN', 'adoptTrip clobbered a stored trip');
  assert.equal(core.fromJSON(storage.docs.get(tripId) as string).days[0].title, 'REAL PLAN');
});

// ---------------------------------------------------------------------------
// F-2 — import is backup/restore of the user's OWN exports.
//
// The guard used to read the boot-time in-memory `state.library`, so an import
// from a tab that booted before a trip existed wrote straight over it.
// ---------------------------------------------------------------------------

test('import checks storage, not the boot-time library snapshot', async () => {
  const storage = memoryStorage();
  const a = createStore({ ports: ports(storage) });
  await a.createTrip(TRIP_INIT);
  const tripId = a.getState().activeTripId as string;
  const day = a.getState().doc?.days[0].id as string;
  const stale = await a.exportActive();
  a.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'JACOBS REAL PLAN — do not lose this' } } as Action);
  await a.flush();

  // b never called refreshLibrary: its in-memory library is the empty boot snapshot.
  const b = createStore({ ports: ports(storage) });
  assert.deepEqual(b.getState().library, []);
  await b.importDoc(stale);
  await b.flush();

  const stored = core.fromJSON(storage.docs.get(tripId) as string);
  assert.equal(stored.days[0].title, 'JACOBS REAL PLAN — do not lose this', 'the import destroyed a stored trip');
  assert.notEqual(b.getState().activeTripId, tripId, 'the import kept the colliding id');
  assert.equal(storage.docs.size, 2);
});

test('import refuses a document owned by somebody else', async () => {
  const storage = memoryStorage();
  const s = createStore({ ports: ports(storage) });
  await s.createTrip(TRIP_INIT);
  const mine = core.fromJSON(await s.exportActive());
  const theirs = core.toJSON({ ...mine, id: 'trip-marta', ownerId: 'user:marta' });

  await assert.rejects(() => s.importDoc(theirs), /another person|not yours|owned by/i);
  assert.equal(storage.docs.has('trip-marta'), false);
  assert.equal(s.getState().activeTripId, mine.id, 'the active trip changed on a refused import');
});

test('import accepts a document owned by this store\'s own owner id', async () => {
  const storage = memoryStorage();
  const s = createStore({ ports: ports(storage), ownerId: 'user:jacob' });
  await s.createTrip({ ...TRIP_INIT, ownerId: 'user:jacob' } as Parameters<typeof s.createTrip>[0]);
  const text = await s.exportActive();
  await s.deleteTrip(s.getState().activeTripId as string);
  await s.importDoc(text);
  assert.equal(s.getState().doc?.ownerId, 'user:jacob');
});
