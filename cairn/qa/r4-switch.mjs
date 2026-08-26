/**
 * Round 4 — adversarial re-verification of the §2.2a StorageVersion / flush-before-switch
 * implementation (`3a124a2`).
 *
 * The premise: §2.2a split the WRITE FENCE out of `Trip.revision` because "a property of the
 * document may never fence writes to a resource" and because a bare counter cannot tell
 * "unchanged" from "different content on the same number" (R3-1 / R3-4's ABA).
 *
 * `store.ts` still has a second bare counter doing a load-bearing job:
 *
 *     function dirty() { return state.doc.revision !== state.persistence.savedRevision; }
 *
 * and `flushForTransition()` uses it to decide whether to write at all:
 *
 *     const idle = state.persistence.status === 'idle';
 *     if (state.doc && !(idle && !dirty())) { await save(); await saving; }
 *
 * `undo()` restores a snapshot verbatim, `revision` included (reducer.ts:127-132), and the
 * next `dispatch()` bumps from THAT number. So a revision the store has already written can
 * be re-issued to different content — R3-1's exact mechanism, one level up, against the
 * "is there an unwritten edit" test instead of against the fence.
 *
 * Run: node qa/r4-switch.mjs   (from cairn/)
 */
const core = await import('../packages/core/src/index.ts');
const { createStore, AUTOSAVE_DEBOUNCE_MS } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');

const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

/** apps/web/src/App.tsx SaveState(), transcribed. */
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
  scheduler: sched ?? mem.manualScheduler(),
});

const INIT = {
  title: 'T', startDate: '2026-08-07', endDate: '2026-08-09', homeCurrency: 'EUR',
  cities: [{ key: 'vie', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2, lng: 16.37 } }],
};

const titleOf = (storage, id, dayIdx = 0) => core.fromJSON(storage.docs.get(id)).days[dayIdx].title;

// ---------------------------------------------------------------------------
line('1. BLOCKER candidate: undo, then a DIFFERENT edit, then close the trip');
{
  const storage = mem.memoryStorage();
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(storage, sched) });
  await store.createTrip(INIT);
  const id = store.getState().doc.id;
  const dayId = store.getState().doc.days[0].id;

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'EDIT A' } });
  await store.flush();
  const revAfterA = store.getState().doc.revision;
  const savedAfterA = store.getState().persistence.savedRevision;
  console.log(`  after "EDIT A" saved: doc.revision=${revAfterA} savedRevision=${savedAfterA} stored="${titleOf(storage, id)}"`);

  // Ctrl-Z. The snapshot carries its OWN, lower revision back in.
  store.undo();
  console.log(`  after Ctrl-Z:         doc.revision=${store.getState().doc.revision} savedRevision=${store.getState().persistence.savedRevision} isDirty=${store.isDirty()}`);

  // ...and the user types something else inside the 400 ms debounce window.
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'EDIT B — THE ONE THAT MATTERS' } });
  const st = store.getState();
  console.log(`  after "EDIT B":       doc.revision=${st.doc.revision} savedRevision=${st.persistence.savedRevision} isDirty=${store.isDirty()} indicator="${indicator(store)}"`);
  ok('the store knows there is an unwritten edit', store.isDirty(),
     `revision ${st.doc.revision} === savedRevision ${st.persistence.savedRevision}, so dirty() says clean while the content differs`);
  ok('the indicator does not read "Saved" over an unwritten edit', indicator(store) !== 'Saved',
     `it reads "${indicator(store)}"`);

  const savesBefore = storage.saveCount;
  await store.closeTrip();                   // §4.2 rule 6a is supposed to flush first
  console.log(`  closeTrip: writes issued during the transition = ${storage.saveCount - savesBefore}`);
  const stored = titleOf(storage, id);
  console.log(`  stored after closeTrip: "${stored}"`);
  ok('EDIT B survived the trip switch', stored === 'EDIT B — THE ONE THAT MATTERS',
     `storage still holds "${stored}" — the edit is gone, with nothing on screen`);
  ok('the pending timer was not simply dropped', storage.saveCount - savesBefore > 0,
     'flushForTransition skipped the write because dirty() said clean');
}

// ---------------------------------------------------------------------------
line('2. the same, through openTrip (the Library click), not closeTrip');
{
  const storage = mem.memoryStorage();
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(storage, sched) });
  await store.createTrip(INIT);
  const idA = store.getState().doc.id;
  const dayA = store.getState().doc.days[0].id;
  await store.createTrip({ ...INIT, title: 'T2' });
  const idB = store.getState().doc.id;
  await store.openTrip(idA);

  store.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'A1' } });
  await store.flush();
  store.undo();
  store.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'A2 — MUST SURVIVE' } });
  console.log(`  before openTrip(B): isDirty=${store.isDirty()} indicator="${indicator(store)}"`);
  await store.openTrip(idB);
  const stored = titleOf(storage, idA);
  console.log(`  trip A in storage: "${stored}"`);
  ok('A2 survived switching to trip B', stored === 'A2 — MUST SURVIVE', `storage holds "${stored}"`);
}

// ---------------------------------------------------------------------------
line('3. the same, through the page-exit "unsaved changes" guard (beforeunload)');
{
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage, mem.manualScheduler()) });
  await store.createTrip(INIT);
  const dayId = store.getState().doc.days[0].id;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'X1' } });
  await store.flush();
  store.undo();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'X2' } });
  // pageExit.ts: beforeunload calls preventDefault() only `while dirty`.
  ok('beforeunload would warn before discarding X2', store.isDirty(),
     'isDirty() is false, so the browser closes the tab without a prompt');
}

// ---------------------------------------------------------------------------
line('4. three and four concurrent tabs on one trip (only two were ever verified)');
{
  const storage = mem.memoryStorage();
  const seed = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await seed.createTrip(INIT);
  const id = seed.getState().doc.id;
  const dayId = seed.getState().doc.days[0].id;
  await seed.flush();

  const tabs = [];
  for (let i = 0; i < 4; i++) {
    const t = createStore({ ports: mkPorts(storage, mem.manualScheduler()) });
    await t.openTrip(id);
    tabs.push(t);
  }
  tabs.forEach((t, i) => t.dispatch({ type: 'setDayMeta', dayId, patch: { title: `TAB ${i}` } }));
  const results = await Promise.all(tabs.map((t) => t.flush().then(() => t.getState().persistence.status)));
  console.log('  statuses:', results.join(', '));
  const winners = results.filter((r) => r === 'idle').length;
  ok('exactly one of four tabs wins', winners === 1, `${winners} tabs reported 'idle'`);
  const storedTitle = titleOf(storage, id);
  const sayingSaved = tabs.filter((t) => indicator(t) === 'Saved');
  console.log(`  stored="${storedTitle}"; tabs rendering "Saved": ${sayingSaved.length}`);
  ok('no losing tab renders "Saved"',
     sayingSaved.every((t) => t.getState().doc.days[0].title === storedTitle),
     'a tab reads "Saved" while holding a different document');
}

// ---------------------------------------------------------------------------
line('5. a trip deleted in tab A while tab B holds a pending edit on THAT trip');
{
  const storage = mem.memoryStorage();
  const a = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await a.createTrip(INIT);
  const id = a.getState().doc.id;
  const dayId = a.getState().doc.days[0].id;
  await a.flush();

  const b = createStore({ ports: mkPorts(storage, mem.manualScheduler()) });
  await b.openTrip(id);
  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'B EDIT' } });   // pending

  await a.deleteTrip(id);                       // gone from under B
  console.log(`  storage holds the id after delete: ${storage.docs.has(id)}`);

  await b.flush();                              // B's pending write lands... where?
  const st = b.getState();
  console.log(`  tab B: status=${st.persistence.status} indicator="${indicator(b)}" recreated=${storage.docs.has(id)}`);
  ok('B does not silently resurrect a trip the user deleted', !storage.docs.has(id),
     'the deleted trip is back in storage, written by a tab that never asked');
  ok('B is told something went wrong rather than reading "Saved"', indicator(b) !== 'Saved',
     `indicator="${indicator(b)}" status=${st.persistence.status}`);
}

// ---------------------------------------------------------------------------
line('6. mergeWithStored racing an autosave from the SAME store, right after a switch');
{
  const storage = mem.memoryStorage();
  const gates = [];
  let hold = false;
  const latched = {
    ...storage,
    docs: storage.docs,
    versions: storage.versions,
    async saveIfVersion(...a) {
      if (hold) await new Promise((r) => gates.push(r));
      return storage.saveIfVersion(...a);
    },
  };
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(latched, sched) });
  await store.createTrip(INIT);
  const id = store.getState().doc.id;
  const dayId = store.getState().doc.days[0].id;
  await store.flush();

  // Another tab moves storage, so this store is in 'conflict'.
  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'OTHER' } });
  await other.flush();

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MINE' } });
  await store.flush();
  console.log(`  precondition: status=${store.getState().persistence.status}`);

  // Now: an autosave is in flight (held) AND the user presses "Merge and save".
  hold = true;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MINE AGAIN' } });
  const inflight = store.flush();
  const merging = store.mergeWithStored();
  await new Promise((r) => setTimeout(r, 5));
  hold = false;
  for (const g of gates.splice(0)) g();
  await Promise.allSettled([inflight, merging]);
  const st = store.getState();
  console.log(`  after: status=${st.persistence.status} stored="${titleOf(storage, id)}" lastMerge=${st.persistence.lastMerge ? 'shown' : 'none'}`);
  ok('a merge that reports success is actually the document in storage',
     st.persistence.status !== 'idle' || titleOf(storage, id) === st.doc.days[0].title,
     `status=${st.persistence.status} stored="${titleOf(storage, id)}" memory="${st.doc.days[0].title}"`);
}

// ---------------------------------------------------------------------------
line('7. flushForTransition while `saving` is still resolving a previous merge');
{
  const storage = mem.memoryStorage();
  const gates = [];
  let hold = false;
  const latched = {
    ...storage,
    docs: storage.docs,
    versions: storage.versions,
    async saveIfVersion(...a) {
      if (hold) await new Promise((r) => gates.push(r));
      return storage.saveIfVersion(...a);
    },
  };
  const store = createStore({ ports: mkPorts(latched, mem.manualScheduler()) });
  await store.createTrip(INIT);
  const idA = store.getState().doc.id;
  const dayId = store.getState().doc.days[0].id;
  await store.flush();
  await store.createTrip({ ...INIT, title: 'T2' });
  const idB = store.getState().doc.id;
  await store.flush();
  await store.openTrip(idA);

  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(idA);
  other.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'OTHER' } });
  await other.flush();

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MINE' } });
  await store.flush();                       // -> conflict
  hold = true;
  const merging = store.mergeWithStored();   // held open inside writeAndSettle
  await new Promise((r) => setTimeout(r, 5));
  const switching = store.openTrip(idB);     // transition while the merge is unsettled
  await new Promise((r) => setTimeout(r, 5));
  hold = false;
  for (const g of gates.splice(0)) g();
  await Promise.allSettled([merging, switching]);
  const st = store.getState();
  console.log(`  active=${st.activeTripId} (A=${idA} B=${idB}) status=${st.persistence.status}`);
  console.log(`  trip A stored day title="${titleOf(storage, idA)}"`);
  ok('the store did not end up on B holding A\'s persistence',
     st.activeTripId === null || st.doc === null || st.doc.id === st.activeTripId,
     `activeTripId=${st.activeTripId} doc.id=${st.doc?.id}`);
  ok('savedVersion describes the trip that is actually open',
     st.doc === null || st.persistence.savedVersion === storage.versions.get(st.doc.id),
     `savedVersion=${st.persistence.savedVersion} storage=${storage.versions.get(st.doc?.id)}`);
}

// ---------------------------------------------------------------------------
line('8. importDoc onto an id another tab currently has open');
{
  const storage = mem.memoryStorage();
  const a = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await a.createTrip(INIT);
  const id = a.getState().doc.id;
  const dayId = a.getState().doc.days[0].id;
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'A LIVE' } });
  await a.flush();
  const exported = await a.exportActive();

  const b = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await b.refreshLibrary();
  await b.importDoc(exported);                  // same id, already stored and open in A
  const newId = b.getState().doc.id;
  console.log(`  import minted id=${newId} (original ${id}); title="${b.getState().doc.title}"`);
  ok('the import did not land on the open trip\'s id', newId !== id, 'it reused the live id');
  ok('trip A in storage is untouched', titleOf(storage, id) === 'A LIVE', `it now reads "${titleOf(storage, id)}"`);

  // A keeps editing. Its fence must still be valid.
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'A STILL LIVE' } });
  await a.flush();
  console.log(`  A after the import: status=${a.getState().persistence.status} stored="${titleOf(storage, id)}"`);
  ok('A can still write after an import minted a neighbouring id',
     a.getState().persistence.status === 'idle' && titleOf(storage, id) === 'A STILL LIVE',
     `status=${a.getState().persistence.status}`);
}

// ---------------------------------------------------------------------------
line('9. three tabs, save/undo/switch cycled in different orders');
{
  const storage = mem.memoryStorage();
  const seed = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await seed.createTrip(INIT);
  const id = seed.getState().doc.id;
  const dayId = seed.getState().doc.days[0].id;
  await seed.flush();

  const t = [];
  for (let i = 0; i < 3; i++) {
    const s = createStore({ ports: mkPorts(storage, mem.manualScheduler()) });
    await s.openTrip(id);
    t.push(s);
  }
  const seq = [
    () => t[0].dispatch({ type: 'setDayMeta', dayId, patch: { title: 'T0-a' } }),
    () => t[1].dispatch({ type: 'setDayMeta', dayId, patch: { title: 'T1-a' } }),
    () => t[0].flush(),
    () => t[1].flush(),
    () => t[2].dispatch({ type: 'setDayMeta', dayId, patch: { title: 'T2-a' } }),
    () => t[0].undo(),
    () => t[0].flush(),
    () => t[2].flush(),
    () => t[1].undo(),
    () => t[1].flush(),
  ];
  for (const step of seq) await step();
  const stored = titleOf(storage, id);
  const claims = t.map((s, i) => `${i}:${indicator(s)}/"${s.getState().doc.days[0].title}"`);
  console.log(`  stored="${stored}"`);
  console.log('  ' + claims.join('  '));
  const liars = t.filter((s) => indicator(s) === 'Saved' && s.getState().doc.days[0].title !== stored);
  ok('no tab renders "Saved" over a document storage does not hold', liars.length === 0,
     `${liars.length} tab(s) do`);
}

// ---------------------------------------------------------------------------
line('10. §2.2a rule 1\'s invariant, stated as an invariant and tested as one');
{
  // "Non-decreasing along a chain of build-function applications, and WITHIN ONE DOCUMENT IN
  //  ONE STORE, EQUAL `revision` IMPLIES IDENTICAL CONTENT."  — ARCHITECTURE §2.2a rule 1.
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage, mem.manualScheduler()) });
  await store.createTrip(INIT);
  const dayId = store.getState().doc.days[0].id;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'BRANCH ONE' } });
  const one = store.getState().doc;
  store.undo();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'BRANCH TWO' } });
  const two = store.getState().doc;
  console.log(`  revision ${one.revision}: "${one.days[0].title}"`);
  console.log(`  revision ${two.revision}: "${two.days[0].title}"`);
  ok('equal revision implies identical content, in one document in one store',
     !(one.revision === two.revision) || core.toJSON(one) === core.toJSON(two),
     `both are revision ${one.revision} and they are different documents — the invariant §2.2a asserts is false, and store.ts:258 relies on it`);
}

console.log('\ndone.');
