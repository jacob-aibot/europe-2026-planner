/**
 * Round 3 — `mergeWithStored()` breaks the save chain the R2-1 fix introduced.
 *
 * store.ts:127  save():            `saving = saving.catch(...).then(attemptSave)`  — chains
 * store.ts:266  mergeWithStored(): `saving = (async () => ...)()`                  — ASSIGNS
 * store.ts:288  mergeWithStored(): `saving = (async () => ...)()`                  — ASSIGNS
 *
 * So the guarantee the fix's own comment states — "One store never races ITSELF" — holds
 * for save() and not for the one path a user reaches while a conflict is on screen.
 *
 * Run: node qa/r3-merge.mjs   (from cairn/)
 */
const fs = await import('node:fs');
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
const mkPorts = (storage, sched) => ({
  storage, clock: mem.fixedClockPort('2026-08-25'),
  ids: mem.sequentialIdPort(`m${++n}-`), file: mem.memoryFile(), scheduler: sched,
});

line('static: how many write paths chain, how many assign');
{
  const src = fs.readFileSync(new URL('../packages/client/src/store/store.ts', import.meta.url), 'utf8');
  const lines = src.split('\n');
  lines.forEach((l, i) => { if (/^\s*saving = /.test(l)) console.log(`  store.ts:${i + 1}  ${l.trim()}`); });
  ok('every write path chains onto `saving`',
     lines.filter((l) => /^\s*saving = \(async/.test(l)).length === 0);
}

line('behavioural: an autosave in flight when the user presses "Merge and save"');
{
  const storage = mem.memoryStorage();
  // A latch that holds `saveIfRevision` open so two writes are genuinely in flight.
  const gates = [];
  let hold = false;
  const latched = {
    ...storage,
    docs: storage.docs,
    async saveIfVersion(...a) {
      if (hold) await new Promise((r) => gates.push(r));
      return storage.saveIfVersion(...a);
    },
  };
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(latched, sched) });
  await store.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = store.getState().activeTripId;
  const dayId = store.getState().doc.days[0].id;
  const day2 = store.getState().doc.days[1].id;

  // Another tab moves storage on, so this store lands in 'conflict'.
  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: day2, patch: { title: 'OTHER TAB DAY 2' } });
  await other.flush();

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MINE DAY 1' } });
  sched.runAll();
  await store.flush();
  ok('precondition: this tab is in conflict', store.getState().persistence.status === 'conflict',
     store.getState().persistence.status);

  // The user keeps typing (an autosave is scheduled) and then presses "Merge and save".
  hold = true;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MINE DAY 1 (edited again)' } });
  sched.runAll();                                   // autosave issued -> blocked at the latch
  const merge = store.mergeWithStored();            // issued while the autosave is unsettled
  await new Promise((r) => setImmediate(r));
  console.log(`  writes in flight at the latch: ${gates.length}` +
              (gates.length > 1 ? '  <-- two, from ONE store' : ''));
  hold = false;
  for (const g of gates.splice(0)) g();
  await new Promise((r) => setImmediate(r));
  for (const g of gates.splice(0)) g();
  await merge.catch((e) => console.log('  merge rejected:', e.message.slice(0, 70)));
  await new Promise((r) => setTimeout(r, 20));

  const st = store.getState();
  const stored = core.fromJSON(storage.docs.get(id));
  console.log(`  after: status=${st.persistence.status} indicator="${indicator(store)}"` +
              ` lastMerge=${st.persistence.lastMerge ? 'shown' : 'ABSENT'}`);
  console.log(`  stored: day1=${JSON.stringify(stored.days[0].title)} day2=${JSON.stringify(stored.days[1].title)}`);

  ok('only one write was in flight from this store', gates.length <= 1);
  ok('the merge landed: both tabs\' edits are in storage',
     stored.days[0].title === 'MINE DAY 1 (edited again)' && stored.days[1].title === 'OTHER TAB DAY 2',
     `day1=${stored.days[0].title} day2=${stored.days[1].title}`);
  ok('the store settled and the merge notice is shown',
     st.persistence.status === 'idle' && !!st.persistence.lastMerge,
     `status=${st.persistence.status} lastMerge=${st.persistence.lastMerge ? 'shown' : 'absent'}`);
}
console.log('');
