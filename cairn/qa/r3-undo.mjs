/**
 * Round 3 — undo makes `Trip.revision` go BACKWARDS, and the revision is the whole
 * compare-and-set guard (a746d75 / R2-1).
 *
 * `reducer.undo()` restores a previous immutable `Trip` snapshot, revision and all, and
 * `scheduleSave()` writes it. So a revision the CAS has already seen can be stored again
 * — and a second tab still holding that revision then passes the compare.
 *
 * Run: node qa/r3-undo.mjs   (from cairn/)
 * A "FAIL" line means the probe found what it was looking for.
 */
const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');

const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');
const indicator = (s) => {
  const { status } = s.getState().persistence;
  if (status === 'conflict') return 'Not saved — edited elsewhere';
  if (status === 'error') return 'Not saved — retry';
  if (status === 'saving') return 'Saving…';
  return s.isDirty() ? 'Unsaved changes' : 'Saved';
};
let n = 0;
const mkPorts = (storage) => ({
  storage, clock: mem.fixedClockPort('2026-08-25'),
  ids: mem.sequentialIdPort(`u${++n}-`), file: mem.memoryFile(),
  scheduler: mem.immediateScheduler(),
});

line('1. does an undone save lower the stored revision?');
{
  const storage = mem.memoryStorage();
  const a = createStore({ ports: mkPorts(storage) });
  await a.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = a.getState().activeTripId;
  const dayId = a.getState().doc.days[0].id;
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'ONE' } });
  await a.flush();
  const r1 = core.fromJSON(storage.docs.get(id)).revision;
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'TWO' } });
  await a.flush();
  const r2 = core.fromJSON(storage.docs.get(id)).revision;
  a.undo();
  await a.flush();
  const r3 = core.fromJSON(storage.docs.get(id)).revision;
  console.log(`  stored revision: ${r1} -> ${r2} -> ${r3} after undo (title now ${JSON.stringify(core.fromJSON(storage.docs.get(id)).days[0].title)})`);
  ok('§2.2: `revision` is monotonic', r3 > r2, `it went ${r2} -> ${r3}`);
}

line('2. tab A undoes; tab B, in conflict, is silently let back in and clobbers A');
{
  const storage = mem.memoryStorage();
  const a = createStore({ ports: mkPorts(storage) });
  await a.createTrip({ title: 'Europe 2026', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = a.getState().activeTripId;
  const dayId = a.getState().doc.days[0].id;
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'AGREED' } });
  await a.flush();

  // Tab B opens at the agreed revision.
  const b = createStore({ ports: mkPorts(storage) });
  await b.openTrip(id);
  const agreed = b.getState().persistence.savedRevision;

  // Tab A edits and saves. Tab B tries and is correctly refused.
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'A KEEPS TYPING' } });
  await a.flush();
  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'B WAS EDITING TOO' } });
  await b.flush();
  ok('precondition: B is in conflict and knows it', b.getState().persistence.status === 'conflict',
     b.getState().persistence.status);

  // Tab A presses Ctrl-Z. That writes the OLD snapshot back — at the OLD revision.
  a.undo();
  await a.flush();
  const storedRev = core.fromJSON(storage.docs.get(id)).revision;
  console.log(`  after A's undo: stored revision=${storedRev}, B still expects ${agreed}`);

  // Tab B autosaves again, as it does on every keystroke while in conflict.
  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'B WAS EDITING TOO (again)' } });
  await b.flush();

  const stored = core.fromJSON(storage.docs.get(id));
  console.log(`  stored day title: ${JSON.stringify(stored.days[0].title)}`);
  console.log(`  tab A: doc=${JSON.stringify(a.getState().doc.days[0].title)} indicator="${indicator(a)}" dirty=${a.isDirty()}`);
  console.log(`  tab B: indicator="${indicator(b)}"`);
  ok("tab A is not showing \"Saved\" over a document that is no longer A's",
     stored.days[0].title === a.getState().doc.days[0].title || indicator(a) !== 'Saved',
     `storage holds ${JSON.stringify(stored.days[0].title)}, A shows ${JSON.stringify(a.getState().doc.days[0].title)} and says "${indicator(a)}"`);
}

line('3. one tab, undo/redo alone: can it store a document it did not mean to?');
{
  const storage = mem.memoryStorage();
  const a = createStore({ ports: mkPorts(storage) });
  await a.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = a.getState().activeTripId;
  const dayId = a.getState().doc.days[0].id;
  for (const t of ['ONE', 'TWO', 'THREE']) {
    a.dispatch({ type: 'setDayMeta', dayId, patch: { title: t } });
    await a.flush();
  }
  a.undo(); a.undo(); await a.flush();
  const after = core.fromJSON(storage.docs.get(id));
  console.log(`  after two undos: stored=${JSON.stringify(after.days[0].title)} rev=${after.revision} indicator="${indicator(a)}"`);
  ok('the undo reached storage and the indicator agrees',
     after.days[0].title === 'ONE' && indicator(a) === 'Saved',
     `stored=${after.days[0].title} indicator=${indicator(a)}`);
}

console.log('');
