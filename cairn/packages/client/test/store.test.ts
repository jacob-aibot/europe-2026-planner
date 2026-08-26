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
  poolSection, unfiledPool,
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

/**
 * The save indicator exactly as `apps/web/src/App.tsx` renders it.
 *
 * The criterion is about the words on the screen — *"the losing tab MUST NOT display
 * Saved"* — so the test asserts the words, not the enum behind them. Asserting
 * `status === 'conflict'` alone would keep passing if the view stopped reading `status`.
 */
function saveIndicator(store: ReturnType<typeof createStore>): string {
  const { status } = store.getState().persistence;
  if (status === 'conflict') return 'Not saved — edited elsewhere';
  if (status === 'error') return 'Not saved — retry';
  if (status === 'saving') return 'Saving…';
  return store.isDirty() ? 'Unsaved changes' : 'Saved';
}

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

test('two tabs, one trip: the second save is REFUSED, not silently applied', async () => {
  // ROADMAP F, verbatim: "Tab A saves, tab B saves, tab A saves again -> tab A's write is
  // refused, status is 'conflict', tab A's indicator does not say 'Saved', and the stored
  // document still contains tab B's edit."
  const storage = memoryStorage();
  const a = createStore({ ports: ports(storage) });
  await a.createTrip(TRIP_INIT);
  const tripId = a.getState().activeTripId as string;
  const dayA = a.getState().doc?.days[0].id as string;
  const dayB = a.getState().doc?.days[1].id as string;

  // Tab A saves.
  a.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'TAB A FIRST' } } as Action);
  await a.flush();
  assert.equal(a.getState().persistence.status, 'idle');

  // Tab B opens on that state and saves.
  const b = createStore({ ports: ports(storage) });
  await b.refreshLibrary();
  await b.openTrip(tripId);
  b.dispatch({ type: 'setDayMeta', dayId: dayB, patch: { title: 'TAB B EDIT' } } as Action);
  await b.flush();
  assert.equal(b.getState().persistence.status, 'idle');

  // Tab A saves again, against a revision that has moved.
  a.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'TAB A SECOND' } } as Action);
  await a.flush();

  assert.equal(a.getState().persistence.status, 'conflict');
  assert.equal(a.isDirty(), true, 'the refused edit must still be known unsaved');
  assert.match(a.getState().persistence.lastError ?? '', /saved somewhere else/i);

  const stored = core.fromJSON(storage.docs.get(tripId) as string);
  assert.equal(stored.days[1].title, 'TAB B EDIT', "tab B's edit was clobbered");
  assert.equal(stored.days[0].title, 'TAB A FIRST', "tab A's refused write reached storage anyway");
  assert.equal(a.getState().doc?.days[0].title, 'TAB A SECOND', 'the edit was dropped from memory');
  assert.notEqual(saveIndicator(a), 'Saved', 'the losing tab displayed "Saved"');
});

// ---------------------------------------------------------------------------
// R2-1 — the CONCURRENT case. The sequential test above passed for eight weeks
// while this one failed two runs in three in a real browser, because the
// criterion it was written from ("tab A saves, tab B saves, tab A saves again")
// describes three separate saves and the defect needs two overlapping ones.
//
// `save()` was `load()` -> compare -> `save()`: two awaits with an interleaving
// point between them, so both tabs read revision R, both passed the compare,
// and the second write destroyed the first while BOTH displayed "Saved".
// The compare now happens inside `StoragePort.saveIfRevision`, atomically.
//
// Deterministic, and in plain Node: no browser, no timers, no elapsed time.
// ---------------------------------------------------------------------------

test('two tabs saving AT THE SAME MOMENT: exactly one wins and the loser is told', async () => {
  const { storage, a, b, tripId } = await twoTabs();
  const dayA = a.getState().doc?.days[0].id as string;

  // Both tabs hold the same revision. This is the precondition the race needs;
  // if it ever stops being true the test is no longer testing anything.
  const startRevision = a.getState().doc?.revision as number;
  assert.equal(b.getState().doc?.revision, startRevision, 'tabs did not start from one revision');
  assert.equal(a.getState().persistence.savedRevision, startRevision);
  assert.equal(b.getState().persistence.savedRevision, startRevision);
  // And on the same FENCE, which is what the port actually compares — §2.2a. The revisions
  // above are content bookkeeping and carry no authority over the write.
  const startVersion = a.getState().persistence.savedVersion;
  assert.ok(startVersion, 'tab A never agreed with storage');
  assert.equal(b.getState().persistence.savedVersion, startVersion, 'tabs did not start from one version');

  a.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'TAB A' } } as Action);
  b.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'TAB B' } } as Action);

  // Overlapping, not sequential: both writes are issued before either is awaited.
  // `await a.flush(); await b.flush()` is the shape that hid this defect.
  await Promise.all([a.flush(), b.flush()]);

  const tabs = [
    { name: 'A', store: a, edit: 'TAB A' },
    { name: 'B', store: b, edit: 'TAB B' },
  ];
  const stored = core.fromJSON(storage.docs.get(tripId) as string);

  // Exactly one mutation won — not zero, not both-agreeing-by-luck.
  const winners = tabs.filter((t) => stored.days[0].title === t.edit);
  assert.equal(winners.length, 1, `expected exactly one winner, storage holds ${stored.days[0].title}`);
  const losers = tabs.filter((t) => t !== winners[0]);
  assert.equal(losers.length, 1);

  // The winner is settled and its edit is intact on screen and in storage.
  const w = winners[0];
  assert.equal(w.store.getState().persistence.status, 'idle', `winner ${w.name} did not settle`);
  assert.equal(w.store.getState().doc?.days[0].title, w.edit);
  assert.equal(w.store.isDirty(), false, `winner ${w.name} still reports unsaved work`);
  assert.equal(saveIndicator(w.store), 'Saved');

  // The loser is TOLD, keeps its edit, and does not claim to be saved. This is
  // the whole finding: before the fix this assertion read 'Saved'.
  const l = losers[0];
  assert.equal(l.store.getState().persistence.status, 'conflict', `loser ${l.name} was not told`);
  assert.notEqual(saveIndicator(l.store), 'Saved', `loser ${l.name} displayed "Saved"`);
  assert.equal(saveIndicator(l.store), 'Not saved — edited elsewhere');
  assert.equal(l.store.isDirty(), true, `loser ${l.name} lost track of its unsaved edit`);
  assert.equal(l.store.getState().doc?.days[0].title, l.edit, `loser ${l.name}'s edit vanished from memory`);
  assert.match(l.store.getState().persistence.lastError ?? '', /saved somewhere else/i);

  // NO SILENT LOSS: the loser's edit is recoverable, and pressing the button recovers it.
  await l.store.mergeWithStored();
  assert.equal(l.store.getState().persistence.status, 'idle', 'the merge did not settle');
  const after = core.fromJSON(storage.docs.get(tripId) as string);
  assert.equal(after.days[0].title, l.edit, 'the merge did not carry the losing edit through');
});

test('a store never races ITSELF: overlapping saves from one tab do not self-conflict', async () => {
  // The atomic port refuses a stale expectation, and an autosave overlapping an explicit
  // flush WAS one. A tab must not be able to put itself into 'conflict' against its own
  // write — that would be an unresolvable state with no other writer to merge with.
  const p = ports();
  const store = await storeWithTrip(p);
  const dayId = store.getState().doc?.days[0].id as string;

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'ONE' } } as Action);
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'TWO' } } as Action);
  await Promise.all([store.flush(), store.flush(), store.flush()]);

  assert.equal(store.getState().persistence.status, 'idle');
  assert.equal(saveIndicator(store), 'Saved');
  const stored = core.fromJSON(p.storage.docs.get(store.getState().activeTripId as string) as string);
  assert.equal(stored.days[0].title, 'TWO');
});

// The port contract itself — "N concurrent saveIfVersion calls at one expected
// version yield exactly one ok:true", freshness, ABA and opacity — moved to
// `storage-version.test.ts` when the fence stopped being `Trip.revision`
// (ARCHITECTURE §2.2a). It is stated there against the port `apps/mobile`'s
// SQLite implementation and Phase 2's SyncPort must also satisfy.

test("a refused save is 'conflict', never 'error' — storage is not broken", async () => {
  const { a, b } = await twoTabs();
  const day = a.getState().doc?.days[0].id as string;
  b.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'B' } } as Action);
  await b.flush();
  a.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'A' } } as Action);
  await a.flush();
  assert.equal(a.getState().persistence.status, 'conflict');
  assert.notEqual(a.getState().persistence.status, 'error');
});

test('mergeWithStored resolves a conflict: disjoint edits from both tabs survive', async () => {
  const { storage, a, b, tripId } = await twoTabs();
  const dayA = a.getState().doc?.days[0].id as string;
  const dayB = a.getState().doc?.days[1].id as string;

  a.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'TAB A EDIT' } } as Action);
  await a.flush();
  b.dispatch({ type: 'setDayMeta', dayId: dayB, patch: { title: 'TAB B EDIT' } } as Action);
  await b.flush();
  assert.equal(b.getState().persistence.status, 'conflict');

  await b.mergeWithStored();
  assert.equal(b.getState().persistence.status, 'idle');
  const stored = core.fromJSON(storage.docs.get(tripId) as string);
  assert.equal(stored.days[0].title, 'TAB A EDIT');
  assert.equal(stored.days[1].title, 'TAB B EDIT');
  assert.equal(b.getState().doc?.days[0].title, 'TAB A EDIT', 'the merged document is what tab B now holds');
  assert.equal(b.isDirty(), false);
});

test('mergeWithStored on a genuine collision keeps this tab\'s value and reports the loss', async () => {
  const { storage, a, b, tripId } = await twoTabs();
  const day = a.getState().doc?.days[0].id as string;
  a.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'A' } } as Action);
  await a.flush();
  b.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'B' } } as Action);
  await b.flush();
  await b.mergeWithStored();

  assert.equal(core.fromJSON(storage.docs.get(tripId) as string).days[0].title, 'B');
  const merge = b.getState().persistence.lastMerge;
  assert.ok(merge, 'the overwrite was silent');
  assert.match(merge.message, /edited elsewhere/i);
  assert.deepEqual(merge.report.overwritten, [{ entity: 'day', id: day, field: 'title' }]);
});

test('mergeWithStored refuses when there is no common ancestor rather than guessing', async () => {
  const storage = memoryStorage();
  const a = createStore({ ports: ports(storage) });
  await a.createTrip(TRIP_INIT);
  const tripId = a.getState().activeTripId as string;
  const day = a.getState().doc?.days[0].id as string;
  a.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'REAL PLAN' } } as Action);
  await a.flush();

  const b = createStore({ ports: ports(storage) });
  await b.createTrip({ ...TRIP_INIT, id: tripId } as Parameters<typeof b.createTrip>[0]);
  b.dispatch({ type: 'setDayMeta', dayId: day, patch: { title: 'CLOBBER' } } as Action);
  await b.flush();
  assert.equal(b.getState().persistence.status, 'conflict');

  await assert.rejects(() => b.mergeWithStored(), /no common version/i);
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

  await assert.rejects(() => s.importDoc(theirs), (e: Error) => {
    assert.equal(e.name, 'ForeignDocumentError');
    assert.equal((e as { ownerId?: string }).ownerId, 'user:marta');
    assert.match(e.message, /belongs to someone else/i);
    return true;
  });
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

// ---------------------------------------------------------------------------
// §2.14 — browse another trip, copy one stop across
// ---------------------------------------------------------------------------

test('browseTrip loads another stored trip READ-ONLY, without switching the active trip', async () => {
  const p = ports();
  const store = createStore({ ports: p });
  await store.createTrip({ ...TRIP_INIT, title: 'Source' } as Parameters<typeof store.createTrip>[0]);
  const sourceId = store.getState().activeTripId as string;
  const sourceDay = store.getState().doc?.days[0].id as string;
  store.dispatch(addStopAction(sourceDay, 'A café worth stealing'));
  await store.flush();

  await store.createTrip({ ...TRIP_INIT, title: 'Mine' } as Parameters<typeof store.createTrip>[0]);
  const mineId = store.getState().activeTripId as string;
  await store.refreshLibrary();

  const browsed = await store.browseTrip(sourceId);
  assert.equal(browsed.id, sourceId);
  assert.equal(store.getState().activeTripId, mineId, 'browsing must not switch trips');
  assert.equal(store.getState().doc?.id, mineId);
  assert.equal(store.getState().browsing?.id, sourceId);

  await store.closeBrowse();
  assert.equal(store.getState().browsing, null);
});

test('copying a stop from a browsed trip badges and credits it, and never says "own"', async () => {
  const p = ports();
  const store = createStore({ ports: p, ownerId: 'user:jacob' });
  await store.createTrip({ ...TRIP_INIT, title: 'Marta', ownerId: 'user:marta' } as Parameters<typeof store.createTrip>[0]);
  const sourceId = store.getState().activeTripId as string;
  const sourceDay = store.getState().doc?.days[0].id as string;
  store.dispatch(addStopAction(sourceDay, 'Naschmarkt'));
  await store.flush();
  const sourceStopId = store.getState().doc?.days[0].stops[0].id as string;

  await store.createTrip({ ...TRIP_INIT, title: 'Jacob' } as Parameters<typeof store.createTrip>[0]);
  const myDay = store.getState().doc?.days[0].id as string;
  await store.refreshLibrary();
  const source = await store.browseTrip(sourceId);

  store.dispatch({
    type: 'copyStopInto',
    source: { trip: source, stopId: sourceStopId },
    placement: { kind: 'scheduled', dayId: myDay, time: '10:00', order: 0 },
  } as Action);
  await store.flush();

  const copiedStop = store.getState().doc?.days[0].stops[0];
  assert.ok(copiedStop);
  assert.notEqual(copiedStop.id, sourceStopId);
  assert.equal(core.displayStatus(copiedStop), 'imported');
  assert.deepEqual(core.attribution(copiedStop), {
    friendUserId: 'user:marta', sourceTripId: sourceId, sourceStopId,
  });

  // and it survives the round trip through storage
  const stored = core.fromJSON(p.storage.docs.get(store.getState().activeTripId as string) as string);
  const persisted = stored.days[0].stops[0];
  assert.equal(core.displayStatus(persisted), 'imported');
  assert.ok(core.attribution(persisted));
});

test('the derived cache retires resolutions whose conflicts are gone', async () => {
  const p = ports();
  const store = createStore({ ports: p });
  await store.createTrip(TRIP_INIT);
  store.dispatch({
    type: 'resolveConflict',
    resolution: { conflictId: 'never-existed', state: 'dismissed', by: 'local:self', at: TODAY },
  } as Action);
  assert.equal(store.getState().doc?.resolutions[0].retiredAt, null);

  store.syncResolutions();
  assert.equal(store.getState().doc?.resolutions[0].retiredAt, TODAY,
    'a resolution answering a conflict nobody reports any more must be retired');
});

// ---------------------------------------------------------------------------
// R2-2, at the surface. Core files the stop under a reachable key; this is the
// other half — that the panel actually renders every pooled stop, so the count
// the user sees and the stops the user can reach are the same number.
// ---------------------------------------------------------------------------

test('R2-2: every pooled stop is rendered by some group, on a trip with no cities', async () => {
  const store = createStore({ ports: ports() });
  await store.createTrip({ title: 'New trip', startDate: '2026-08-07', endDate: '2026-08-08' });
  const doc0 = store.getState().doc as core.Trip;
  store.dispatch(addStopAction(doc0.days[0].id, 'Arrive LAX'));
  const stopId = (store.getState().doc as core.Trip).days[0].stops[0].id;
  store.dispatch({ type: 'returnToPool', stopId } as Action);
  await store.flush();

  const trip = store.getState().doc as core.Trip;
  assert.equal(trip.pool.length, 1, 'the stop left the document');

  // What the panel would render: the active city's section, plus the catch-all.
  const cityKey = store.getState().ui.activeCityKey ?? trip.cities[0]?.key ?? '';
  const shown = poolSection(trip, cityKey).stops.length + unfiledPool(trip).length;
  assert.equal(shown, trip.pool.length, 'the pool count and the rendered stops disagree — a stop is unreachable');

  // And it goes back. R2-2's document was intact the whole time; the defect was
  // that no path reached it, which is the same loss from where the user sits.
  store.dispatch({ type: 'scheduleFromPool', stopId } as Action);
  assert.equal((store.getState().doc as core.Trip).days[0].stops.length, 1);
  assert.equal((store.getState().doc as core.Trip).pool.length, 0);
});

test('R2-2: a stop pooled from a city day stays under that city, not the catch-all', async () => {
  const store = await storeWithTrip();
  const trip0 = store.getState().doc as core.Trip;
  store.dispatch({ type: 'setDayMeta', dayId: trip0.days[1].id, patch: { primaryCity: 'vienna', cities: ['vienna'] } } as Action);
  store.dispatch(addStopAction((store.getState().doc as core.Trip).days[1].id, 'Belvedere'));
  const stopId = (store.getState().doc as core.Trip).days[1].stops[0].id;
  store.dispatch({ type: 'returnToPool', stopId } as Action);

  const trip = store.getState().doc as core.Trip;
  assert.equal(poolSection(trip, 'vienna').stops.length, 1);
  assert.equal(unfiledPool(trip).length, 0, 'a stop with a perfectly good city fell into the catch-all');
});
