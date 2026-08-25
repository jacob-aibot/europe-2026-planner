const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);

function ports(storage) {
  return {
    storage: storage ?? mem.memoryStorage(),
    clock: mem.fixedClockPort('2026-08-01'),
    ids: mem.sequentialIdPort('c'),
    file: mem.memoryFile(),
    scheduler: mem.immediateScheduler(),
  };
}

const { trip } = loadEurope2026();

console.log('== ui state never in the persisted bytes ==');
{
  const st = mem.memoryStorage();
  const s = createStore({ ports: ports(st) });
  await s.adoptTrip(trip);
  s.setUi({ activeDayId: '2026-08-13', selectedStopId: 'stop-7', openPanel: 'conflicts' });
  s.dispatch({ type: 'setDayMeta', dayId: '2026-08-13', patch: { title: 'Edited' } });
  await s.flush();
  const bytes = st.docs.get(trip.id);
  const leaks = ['selectedStopId', 'openPanel', 'activeDayId', '"ui"'].filter((k) => bytes.includes(k));
  ok('no ui keys in saved bytes', leaks.length === 0, JSON.stringify(leaks));
}

console.log('');
console.log('== two trips do not leak ==');
{
  const st = mem.memoryStorage();
  const s = createStore({ ports: ports(st) });
  await s.adoptTrip(trip);
  s.setUi({ selectedStopId: 'stop-3', activeDayId: '2026-08-14' });
  const before = s.getState().ui;
  await s.createTrip({ id: 't-b', title: 'B', startDate: '2027-01-01', endDate: '2027-01-03', homeCurrency: 'EUR', ownerId: 'u' });
  const after = s.getState().ui;
  ok('ui reset on createTrip', after.selectedStopId !== before.selectedStopId, JSON.stringify(after));
  ok('history reset on createTrip', s.getState().history.past.length === 0);
  const d2 = s.getDerived();
  ok('derived belongs to the new trip', d2 === null || s.getState().doc.id === 't-b');
  s.undo();
  ok('undo after switch does not resurrect trip A', s.getState().doc.id === 't-b', s.getState().doc.id);
}

console.log('');
console.log('== undo/redo to depth 50 and beyond ==');
{
  const s = createStore({ ports: ports(), autosave: false });
  await s.adoptTrip(trip);
  const base = core.toJSON(s.getState().doc);
  const snaps = [base];
  for (let i = 0; i < 60; i++) {
    s.dispatch({ type: 'setDayMeta', dayId: '2026-08-13', patch: { title: 'T' + i } });
    snaps.push(core.toJSON(s.getState().doc));
  }
  ok('past capped at 50', s.getState().history.past.length === 50, s.getState().history.past.length);
  for (let i = 0; i < 50; i++) s.undo();
  const afterUndo = core.toJSON(s.getState().doc);
  ok('50 undos land on snapshot 10 exactly', afterUndo === snaps[10], 'title now=' + s.getState().doc.days.find((d) => d.id === '2026-08-13').title);
  const extra = core.toJSON(s.getState().doc);
  s.undo(); s.undo();
  ok('undo past the limit is a no-op', core.toJSON(s.getState().doc) === extra);
  for (let i = 0; i < 50; i++) s.redo();
  ok('50 redos return to the newest state', core.toJSON(s.getState().doc) === snaps[60]);
  s.redo();
  ok('redo past the end is a no-op', core.toJSON(s.getState().doc) === snaps[60]);
}

console.log('');
console.log('== undo restores the previous Trip EXACTLY (revision included?) ==');
{
  const s = createStore({ ports: ports(), autosave: false });
  await s.adoptTrip(trip);
  const before = s.getState().doc;
  s.dispatch({ type: 'removeStop', stopId: trip.days[5].stops[0].id });
  s.undo();
  const after = s.getState().doc;
  ok('undo === previous Trip byte-for-byte', core.toJSON(after) === core.toJSON(before),
    'revision ' + before.revision + ' -> ' + after.revision);
}

console.log('');
console.log('== failing save ==');
{
  const st = mem.memoryStorage();
  const s = createStore({ ports: ports(st) });
  await s.adoptTrip(trip);
  st.failAll = 'disk on fire';
  s.dispatch({ type: 'setDayMeta', dayId: '2026-08-13', patch: { title: 'Edited while broken' } });
  await s.flush();
  const stt = s.getState();
  ok('status = error', stt.persistence.status === 'error', JSON.stringify(stt.persistence));
  ok('edit still in memory', stt.doc.days.find((d) => d.id === '2026-08-13').title === 'Edited while broken');
  ok('isDirty() true', s.isDirty());
  st.failAll = null;
  s.dispatch({ type: 'setDayMeta', dayId: '2026-08-14', patch: { title: 'Recovered' } });
  await s.flush();
  ok('recovers to idle after storage returns', s.getState().persistence.status === 'idle', JSON.stringify(s.getState().persistence));
  const saved = core.fromJSON(st.docs.get(trip.id));
  ok('both edits persisted after recovery',
    saved.days.find((d) => d.id === '2026-08-13').title === 'Edited while broken' &&
    saved.days.find((d) => d.id === '2026-08-14').title === 'Recovered');
}

console.log('');
console.log('== quota exhaustion mid-session, then app restart ==');
{
  const st = mem.memoryStorage();
  const s = createStore({ ports: ports(st) });
  await s.adoptTrip(trip);
  await s.flush();
  st.failAll = 'QuotaExceededError';
  for (let i = 0; i < 5; i++) s.dispatch({ type: 'setDayMeta', dayId: '2026-08-13', patch: { title: 'lost-' + i } });
  await s.flush();
  ok('error surfaced', s.getState().persistence.status === 'error');
  const s2 = createStore({ ports: ports(st) });
  await s2.refreshLibrary();
  await s2.openTrip(trip.id);
  const title = s2.getState().doc.days.find((d) => d.id === '2026-08-13').title;
  console.log('   after "restart" the day title is:', JSON.stringify(title), '(the 5 edits are gone from storage, as expected)');
  ok('reopened trip is the last successfully saved one', title !== 'lost-4');
}

console.log('');
console.log('== importDoc overwrite guard depends on the in-memory library ==');
{
  const st = mem.memoryStorage();
  const s1 = createStore({ ports: ports(st) });
  await s1.adoptTrip(trip);
  s1.dispatch({ type: 'setDayMeta', dayId: '2026-08-13', patch: { title: 'JACOBS REAL PLAN' } });
  await s1.flush();
  ok('trip A saved', core.fromJSON(st.docs.get(trip.id)).days.find((d) => d.id === '2026-08-13').title === 'JACOBS REAL PLAN');

  // A second store on the same storage that never called refreshLibrary — e.g. import
  // before the library load resolves.
  const s2 = createStore({ ports: ports(st) });
  const incoming = core.toJSON(core.setTripMeta(trip, { title: 'A friend’s copy' }, { ids: core.sequentialIds('z'), now: '2026-08-01', actorUserId: 'u' }));
  await s2.importDoc(incoming);
  await s2.flush();
  const nowStored = core.fromJSON(st.docs.get(trip.id));
  ok('import did NOT overwrite trip A', nowStored.days.find((d) => d.id === '2026-08-13').title === 'JACOBS REAL PLAN',
    'stored title is now "' + nowStored.title + '" / day title "' + nowStored.days.find((d) => d.id === '2026-08-13').title + '"; docs in storage: ' + st.docs.size);
}
