/**
 * Round 3, second pass — the attacks r3-cas.mjs did not cover, plus independent
 * re-derivations of the two it FAILed on, in shapes a user actually produces.
 *
 * Run: node qa/r3-cas2.mjs   (from cairn/)
 * A "FAIL" line means the probe found what it was looking for.
 */
const fs = await import('node:fs');
const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const sel = await import('../packages/client/src/selectors/index.ts');

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
  storage,
  clock: mem.fixedClockPort('2026-08-25'),
  ids: mem.sequentialIdPort(`c${++n}-`),
  file: mem.memoryFile(),
  scheduler: sched ?? mem.immediateScheduler(),
});
const ctx = { ids: { newId: (k) => `${k}-1` }, now: '2026-08-26', actorUserId: core.LOCAL_OWNER };

// ---------------------------------------------------------------------------
line('1. ABA: export, delete, restore-from-backup — a stale tab clobbers the restore');
// The realistic shape: the user exports a trip, deletes it by mistake, re-imports the
// export (importDoc KEEPS the id when the id is free), and a second tab that was never
// closed autosaves. The export was taken AT the revision the stale tab last agreed on,
// so the compare passes on a document with a different lineage.
{
  const storage = mem.memoryStorage();
  const a = createStore({ ports: mkPorts(storage) });
  await a.createTrip({ title: 'Europe 2026', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = a.getState().activeTripId;
  const dayId = a.getState().doc.days[0].id;
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'THE REAL PLAN' } });
  await a.flush();

  // Tab B: export -> delete -> re-import the export. Same id, same revision.
  const b = createStore({ ports: mkPorts(storage) });
  await b.openTrip(id);
  const backup = await b.exportActive();
  await b.deleteTrip(id);
  await b.importDoc(backup);
  const restoredId = b.getState().activeTripId;
  const restoredRev = core.fromJSON(storage.docs.get(restoredId)).revision;
  console.log(`  restored under id ${restoredId} (original ${id}) at revision ${restoredRev}`);
  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'RESTORED, THEN EDITED' } });
  await b.flush();
  const revNow = core.fromJSON(storage.docs.get(id)).revision;

  // Tab A never noticed any of it and autosaves its own stale edit.
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'STALE TAB A' } });
  await a.flush();
  const stored = core.fromJSON(storage.docs.get(id));
  console.log(`  after A's autosave: stored day title=${JSON.stringify(stored.days[0].title)}` +
              ` revision ${revNow} | A indicator="${indicator(a)}"`);
  ok("the restored document survived, or tab A was told it had gone stale",
     stored.days[0].title === 'RESTORED, THEN EDITED' || a.getState().persistence.status === 'conflict',
     'revision equality alone let a different document lineage pass the compare, silently');
}

// ---------------------------------------------------------------------------
line('2. the same, minimal: does saveIfVersion see delete+recreate at all?');
{
  const s = mem.memoryStorage();
  const sum = (rev) => ({ id: 'x', title: 'x', startDate: '2026-01-01', endDate: '2026-01-01',
    cityCount: 0, dayCount: 1, stopCount: 0, poolCount: 0, revision: rev });
  const first = await s.saveIfVersion('x', null, JSON.stringify({ id: 'x', revision: 4, body: 'ORIGINAL' }), sum(4));
  await s.delete('x');
  await s.saveIfVersion('x', null, JSON.stringify({ id: 'x', revision: 4, body: 'A DIFFERENT DOCUMENT' }), sum(4));
  const out = await s.saveIfVersion('x', first.version, JSON.stringify({ id: 'x', revision: 5, body: 'STALE WRITER' }), sum(5));
  console.log(`  held version=${first.version} now stored=${s.versions.get('x')}`);
  console.log('  outcome:', JSON.stringify(out), '| stored:', s.docs.get('x'));
  ok('a writer holding the DELETED record\'s version is refused', out.ok === false,
     'the counter rewound, so a recreated id re-entered a version it had already used (ABA)');
}

// ---------------------------------------------------------------------------
line('3. expectedVersion:null vs a corrupt stored record — §2.2a: the fence never parses');
{
  const s = mem.memoryStorage();
  const sum = { id: 'x', title: 'x', startDate: '2026-01-01', endDate: '2026-01-01',
    cityCount: 0, dayCount: 1, stopCount: 0, poolCount: 0, revision: 0 };
  for (const bad of ['{"id":"x","revision":', 'not json', '{"id":"x"}', '{"id":"x","revision":"7"}',
                     '{"id":"x","revision":null}', '{"id":"x","revision":1e999}']) {
    s.docs.set('x', bad);
    const out = await s.saveIfVersion('x', null, '{"id":"x","revision":0,"body":"CLOBBER"}', sum);
    console.log(`  stored=${JSON.stringify(bad).padEnd(34)} expected=null -> ok:${out.ok}`);
    ok(`a corrupt record is not overwritten by an expect-absent write (${bad.slice(0, 18)})`,
       out.ok === false, 'the record exists, so expectedVersion:null must not match it');
  }
  // And the apps/web IndexedDB port makes the identical comparison, verbatim:
  const web = fs.readFileSync(new URL('../apps/web/src/ports/storage.ts', import.meta.url), 'utf8');
  const same = /exists \? storedVersion !== null && storedVersion === expectedVersion : expectedVersion === null/.test(web);
  console.log('  apps/web/src/ports/storage.ts uses the same comparison:', same);
  ok('apps/web makes the same comparison as the in-memory port', same, 'the two implementations have drifted');
}

// ---------------------------------------------------------------------------
line('4. no beforeunload: closing the tab inside the debounce window');
{
  // The handlers live in `packages/client/src/store/pageExit.ts` (platform-free, so it is
  // testable in plain Node) and are registered from `apps/web/src/App.tsx`. Scan both.
  const roots = ['../apps/web/src/', '../packages/client/src/'];
  const read = (root) => fs.readdirSync(new URL(root, import.meta.url), { recursive: true })
    .filter((f) => String(f).endsWith('.tsx') || String(f).endsWith('.ts'))
    .map((f) => fs.readFileSync(new URL(root + f, import.meta.url), 'utf8'));
  const sources = roots.flatMap(read);
  const hits = ['beforeunload', 'pagehide', 'visibilitychange'].filter((ev) => sources.some((s) => s.includes(ev)));
  const registered = sources.some((s) => /registerPageExit\s*\(\s*\{/.test(s));
  console.log('  unload-ish handlers found:', hits.length ? hits.join(', ') : 'NONE', '| registered by apps/web:', registered);
  ok('an edit inside the 400 ms debounce is flushed at the last point the platform offers', hits.length === 3 && registered,
     'nothing flushes or warns on unload, so the last 400 ms of typing is discarded silently');
}

// ---------------------------------------------------------------------------
line('5. a pooled stop whose remembered day is dropped by a date change');
// ensureDays keeps any day that still has stops, so the only way to drop a day is to
// empty it first — which is exactly what returnToPool does.
{
  let t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-10',
    cities: [{ key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2, lng: 16.37 } }] }, ctx);
  t = core.setDayMeta(t, '2026-08-10', { primaryCity: 'vienna', cities: ['vienna'] });
  t = core.addStop(t, { kind: 'scheduled', dayId: '2026-08-10', time: '10:00', order: 0 },
                   { name: 'Belvedere', category: 'sight' }, ctx);
  const stopId = t.days.find((d) => d.id === '2026-08-10').stops[0].id;
  t = core.returnToPool(t, stopId);                       // Aug 10 is now empty
  console.log('  pooled under:', t.pool[0].placement.cityKey, '| hint:', JSON.stringify(t.pool[0].placement.hint));
  t = core.setTripMeta(t, { endDate: '2026-08-09' }, ctx); // the user shortens the trip
  console.log('  days now:', t.days.map((d) => d.id).join(','), '| pool:', t.pool.length);
  ok('the stop is still reachable from some panel',
     sel.unfiledPool(t).length + t.cities.reduce((a, c) => a + sel.poolSection(t, c.key).stops.length, 0) === t.pool.length);
  try {
    core.scheduleFromPool(t, stopId);
    ok('scheduleFromPool puts it back when its remembered day is gone', true);
  } catch (e) {
    ok('scheduleFromPool puts it back when its remembered day is gone', false, e.message);
  }
  const iss = core.validateTrip(t).filter((i) => i.code === 'pool_stop_unknown_city');
  console.log('  validateTrip pool_stop_unknown_city:', iss.length);
}

// ---------------------------------------------------------------------------
line('6. a trip with NO cities: does the catch-all double-render?');
{
  const p = mkPorts(mem.memoryStorage());
  const store = createStore({ ports: p });
  await store.createTrip({ title: 'Blank', startDate: '2026-08-07', endDate: '2026-08-08' });
  const d0 = store.getState().doc.days[0].id;
  store.dispatch({ type: 'addStop', placement: { kind: 'pool', cityKey: '' },
                   stop: { name: 'Filed under the empty string', category: 'sight' } });
  store.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId: d0, time: '09:00', order: 0 },
                   stop: { name: 'Scheduled then pooled', category: 'sight' } });
  const sid = store.getState().doc.days[0].stops[0].id;
  store.dispatch({ type: 'returnToPool', stopId: sid });
  const t = store.getState().doc;
  // PoolPanel: cityKey = activeCityKey ?? cities[0]?.key ?? ''  -> '' for a city-less trip.
  const section = sel.poolSection(t, '').stops.length;
  const unfiled = sel.unfiledPool(t).length;
  console.log(`  pool=${t.pool.length} | poolSection('')=${section} | unfiled=${unfiled} | rendered=${section + unfiled}`);
  ok('each pooled stop is rendered exactly once', section + unfiled === t.pool.length,
     'the same stop appears in both the city section and the catch-all, with the same React key');
}

// ---------------------------------------------------------------------------
line('7. the concurrent-save criterion asserts a TRANSCRIPTION of the view, not the view');
{
  const test = fs.readFileSync(new URL('../packages/client/test/store.test.ts', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../apps/web/src/App.tsx', import.meta.url), 'utf8');
  const s = 'Not saved — edited elsewhere';
  const both = test.includes(s) && app.includes(s);
  const imports = /from '\.\.\/\.\.\/\.\.\/apps/.test(test) || /@cairn\/web/.test(test);
  console.log(`  the literal lives in BOTH store.test.ts and App.tsx: ${both}; the test imports the view: ${imports}`);
  ok('the criterion "assert the indicator string the view renders" is met by the test',
     imports, 'the test re-implements SaveState(); changing App.tsx alone cannot fail it');
}

console.log('');
