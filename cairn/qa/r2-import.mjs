/**
 * Round 2 — importDoc (F-2/F-6 re-check) and failure modes: storage errors, quota,
 * corrupt documents, an export/restore round trip.
 * Run: node qa/r2-import.mjs   (from cairn/)
 */
const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');
const mkPorts = (storage) => ({
  storage: storage ?? mem.memoryStorage(),
  clock: mem.fixedClockPort('2026-08-25'),
  ids: mem.sequentialIdPort('i'),
  file: mem.memoryFile(),
  scheduler: mem.immediateScheduler(),
});
const { trip } = loadEurope2026();

line('F-6: a document owned by someone else is refused');
{
  const store = createStore({ ports: mkPorts(), autosave: false });
  const foreign = core.toJSON({ ...trip, ownerId: 'user:marta' });
  try { await store.importDoc(foreign); ok('refused', false, 'ACCEPTED a foreign document'); }
  catch (e) { ok('refused with ForeignDocumentError', e.constructor.name === 'ForeignDocumentError', `${e.constructor.name}: ${e.message.slice(0, 80)}`); }
  console.log('  library after the refusal:', store.getState().library.length, '| active:', store.getState().activeTripId);
}

line('the spec says an ABSENT ownerId is allowed (§2.14 rule 1) — is it?');
{
  const store = createStore({ ports: mkPorts(), autosave: false });
  const o = JSON.parse(core.toJSON(trip));
  delete o.ownerId;
  try { await store.importDoc(JSON.stringify(o)); ok('an old export with no ownerId restores', true); }
  catch (e) { ok('an old export with no ownerId restores', false, `${e.constructor.name}: ${e.message.slice(0, 90)}`); }
}

line('F-2: an import never overwrites a stored trip');
{
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage), autosave: false });
  await store.adoptTrip(trip);
  await store.flush();
  const edited = core.setDayMeta(store.getState().doc, '2026-08-13', { title: 'MY REAL EDIT' });
  await store.adoptTrip(edited);
  store.dispatch({ type: 'setDayMeta', dayId: '2026-08-13', patch: { title: 'MY REAL EDIT' } });
  await store.flush();
  const stale = core.toJSON(trip);
  await store.importDoc(stale);
  // REPAIRED, Phase 2 I-0: `StoragePort.load()` returns `{doc, version}` since `3a124a2`
  // (ARCHITECTURE §2.2a rule 4). This threw, and the probe has not run past here since round 2.
  const after = JSON.parse((await storage.load(trip.id)).doc);
  ok('the stored trip keeps its edit', after.days.find((d) => d.id === '2026-08-13').title === 'MY REAL EDIT',
    after.days.find((d) => d.id === '2026-08-13').title);
  console.log('  new trip id:', store.getState().doc.id, '| title:', store.getState().doc.title);
  console.log('  library:', (await storage.listTrips()).map((r) => r.id).join(', '));
}

line('a copied stop\'s credit after an export → restore round trip');
{
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage), autosave: false });
  await store.adoptTrip({ ...trip, id: 'trip:src' });
  await store.flush();
  await store.createTrip({ title: 'Target', startDate: '2026-09-01', endDate: '2026-09-02', homeCurrency: 'EUR', cities: [] });
  const browsed = await store.browseTrip('trip:src');
  store.dispatch({ type: 'copyStopInto', source: { trip: browsed, stopId: browsed.days[0].stops[0].id }, placement: { kind: 'scheduled', dayId: store.getState().doc.days[0].id, time: null, order: 0 } });
  const text = await store.exportActive();
  const store2 = createStore({ ports: mkPorts(mem.memoryStorage()), autosave: false });
  await store2.importDoc(text);
  const s = store2.getState().doc.days[0].stops[0];
  ok('restored copy is still badged + credited', core.displayStatus(s) === 'imported' && !!core.attribution(s),
    `${core.displayStatus(s)} / ${JSON.stringify(core.attribution(s))}`);
  console.log('  credit points at:', JSON.stringify(core.attribution(s)));
  console.log('  ...and that trip id is in this library:', store2.getState().library.map((r) => r.id).join(',') || '(none — the credit dangles)');
}

line('failure modes: storage that fails, and quota');
{
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage), autosave: false });
  await store.adoptTrip(trip);
  await store.flush();
  storage.failAll = new Error('QuotaExceededError: no room');
  store.dispatch({ type: 'setDayMeta', dayId: '2026-08-13', patch: { title: 'edit under quota pressure' } });
  await store.flush();
  const p = store.getState().persistence;
  console.log('  status:', p.status, '| lastError:', String(p.lastError).slice(0, 60));
  ok('a failed save is never reported as saved', p.status !== 'idle');
  ok('the edit is still in memory', store.getState().doc.days.find((d) => d.id === '2026-08-13').title === 'edit under quota pressure');
  storage.failAll = null;
  await store.flush();
  console.log('  after storage recovers:', store.getState().persistence.status);
}

line('a corrupt stored document');
{
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage), autosave: false });
  await store.adoptTrip(trip);
  await store.flush();
  // REPAIRED, Phase 2 I-0: `StoragePort.save()` became `saveIfVersion(id, expected, doc,
  // summary)` at `3a124a2` (§2.2a). This threw `storage.save is not a function`.
  await storage.saveIfVersion(trip.id, storage.versions.get(trip.id), '{"schemaVersion":1,"id":"trip-europe-2026","days":', { id: trip.id, title: 'x', startDate: '2026-08-07', endDate: '2026-08-22', dayCount: 16, stopCount: 0, cityCount: 0 });
  try { await store.openTrip(trip.id); ok('a corrupt document is refused', false, 'it opened'); }
  catch (e) { ok('a corrupt document is refused with a path', e.constructor.name === 'TripParseError', `${e.constructor.name}: ${String(e.message).slice(0, 70)}`); }
  console.log('  browseTrip on the same corrupt doc:');
  try { await store.browseTrip(trip.id); console.log('    opened (!)'); } catch (e) { console.log('   ', e.constructor.name, String(e.message).slice(0, 60)); }
}
