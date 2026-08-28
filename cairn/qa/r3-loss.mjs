/**
 * Round 3 — NO SILENT LOSS (ROADMAP Phase 1 F, added in a746d75) against the trip-switch
 * paths, which no criterion covers.
 *
 * `dispatch()` schedules a debounced autosave (400 ms). `attemptSave()` reads `state.doc`
 * at EXECUTION time. No trip-switch path — closeTrip / openTrip / deleteTrip / adoptTrip /
 * importDoc — cancels the pending timer, flushes it, or even warns. So an edit made inside
 * the debounce window before the user clicks "Cairn" (App.tsx:46, "Back to all trips") or
 * opens another trip (Library.tsx:88) is discarded, and the indicator reads "Saved".
 *
 * Run: node qa/r3-loss.mjs   (from cairn/)
 */
const core = await import('../packages/core/src/index.ts');
const { createStore, AUTOSAVE_DEBOUNCE_MS } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');

const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

/** The string apps/web/src/App.tsx `SaveState()` renders, transcribed. */
const indicator = (s) => {
  const { status } = s.getState().persistence;
  if (status === 'conflict') return 'Not saved — edited elsewhere';
  if (status === 'error') return 'Not saved — retry';
  if (status === 'saving') return 'Saving…';
  return s.isDirty() ? 'Unsaved changes' : 'Saved';
};

let n = 0;
const mkPorts = (storage, sched) => ({
  storage,
  clock: mem.fixedClockPort('2026-08-25'),
  ids: mem.sequentialIdPort(`s${++n}-`),
  file: mem.memoryFile(),
  scheduler: sched,
});

console.log(`autosave debounce = ${AUTOSAVE_DEBOUNCE_MS} ms; the window below is that long.`);

// ---------------------------------------------------------------------------
line('1. edit, then click "Cairn" (App.tsx:46 → closeTrip) inside the debounce window');
{
  const storage = mem.memoryStorage();
  const sched = mem.manualScheduler();          // the timer has NOT fired yet
  const store = createStore({ ports: mkPorts(storage, sched) });
  await store.createTrip({ title: 'Vienna 2027', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = store.getState().activeTripId;
  const dayId = store.getState().doc.days[0].id;

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'Belvedere at 10, Naschmarkt after' } });
  console.log('  indicator right after the edit:', indicator(store));

  await store.closeTrip();                      // "Back to all trips"
  sched.runAll();                               // the debounce fires — too late
  await new Promise((r) => setTimeout(r, 10));

  const stored = core.fromJSON(storage.docs.get(id));
  console.log('  indicator after closing:', indicator(store), '| stored day title:', JSON.stringify(stored.days[0].title));
  ok("the edit survived the close, or the user was told it did not",
     stored.days[0].title === 'Belvedere at 10, Naschmarkt after',
     `the edit is gone from storage and the indicator reads "${indicator(store)}"`);
}

// ---------------------------------------------------------------------------
line('2. edit trip A, then open trip B (Library.tsx:88) inside the debounce window');
{
  const storage = mem.memoryStorage();
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(storage, sched) });
  await store.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  const idA = store.getState().activeTripId;
  const dayA = store.getState().doc.days[0].id;

  const bStore = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await bStore.createTrip({ title: 'B', startDate: '2026-09-01', endDate: '2026-09-03' });
  const idB = bStore.getState().activeTripId;
  const revBBefore = core.fromJSON(storage.docs.get(idB)).revision;

  store.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'A EDIT' } });
  await store.openTrip(idB);
  sched.runAll();
  await new Promise((r) => setTimeout(r, 10));

  const a = core.fromJSON(storage.docs.get(idA));
  const b = core.fromJSON(storage.docs.get(idB));
  console.log(`  A stored day title: ${JSON.stringify(a.days[0].title)} | B revision ${revBBefore} -> ${b.revision}` +
              ` | indicator: ${indicator(store)}`);
  ok("trip A's edit survived the switch", a.days[0].title === 'A EDIT',
     `A's edit is gone; the pending save wrote trip B (revision ${revBBefore} -> ${b.revision}) instead`);
}

// ---------------------------------------------------------------------------
line('3. same, with real timers rather than the manual scheduler');
{
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage, undefined), debounceMs: 400 });
  await store.createTrip({ title: 'Real timers', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = store.getState().activeTripId;
  const dayId = store.getState().doc.days[0].id;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'TYPED THEN CLICKED' } });
  await store.closeTrip();                     // a click ~0 ms later
  await new Promise((r) => setTimeout(r, 600)); // well past the debounce
  const stored = core.fromJSON(storage.docs.get(id));
  console.log('  stored day title:', JSON.stringify(stored.days[0].title), '| indicator:', indicator(store));
  ok('the edit survived', stored.days[0].title === 'TYPED THEN CLICKED', 'discarded, silently');
}

// ---------------------------------------------------------------------------
line('4. deleteTrip on a NON-active trip does not disturb the active one (control)');
{
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await store.createTrip({ title: 'Keep', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = store.getState().activeTripId;
  const dayId = store.getState().doc.days[0].id;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'KEPT' } });
  await store.flush();
  await store.deleteTrip('nothing-here');
  ok('active trip untouched', core.fromJSON(storage.docs.get(id)).days[0].title === 'KEPT');
}

console.log('');
