/**
 * Round 3 — undo makes `Trip.revision` go BACKWARDS, and in revision 2 the revision was the
 * whole compare-and-set guard (a746d75 / R2-1), so a revision the CAS had already spent came
 * back around and readmitted a tab that was correctly in `'conflict'`.
 *
 * **Re-pointed at the §2.2a contract.** `Trip.revision` rewinding is now *expected* — it is
 * content, and undo restores a snapshot verbatim. What must never rewind is the opaque
 * `StorageVersion` in the record envelope, which is the fence. Probe 1 therefore asserts
 * the fence, not the revision; probes 2 and 3 are unchanged in intent.
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

line('1. an undone save lowers the stored revision — does it lower the FENCE?');
{
  const storage = mem.memoryStorage();
  const a = createStore({ ports: mkPorts(storage) });
  await a.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = a.getState().activeTripId;
  const dayId = a.getState().doc.days[0].id;
  const seen = [];
  const snap = () => {
    seen.push(storage.versions.get(id));
    return core.fromJSON(storage.docs.get(id)).revision;
  };
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'ONE' } });
  await a.flush();
  const r1 = snap();
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'TWO' } });
  await a.flush();
  const r2 = snap();
  a.undo();
  await a.flush();
  const r3 = snap();
  console.log(`  stored revision: ${r1} -> ${r2} -> ${r3} after undo (title now ${JSON.stringify(core.fromJSON(storage.docs.get(id)).days[0].title)})`);
  console.log(`  stored version:  ${seen.join(' -> ')}`);
  ok('§2.2a: `Trip.revision` is CONTENT and may rewind', r3 < r2, `it went ${r2} -> ${r3}`);
  ok('§2.2a: the StorageVersion fence never repeats', new Set(seen).size === seen.length, seen.join(','));
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
  const agreed = b.getState().persistence.savedVersion;

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
  console.log(`  after A's undo: stored revision=${storedRev}, stored version=${storage.versions.get(id)}, B still expects ${agreed}`);

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
