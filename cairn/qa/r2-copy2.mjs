/**
 * Round 2, attack 1b — the copy path through the CLIENT store: undo/redo, place copying,
 * browse-then-mutate, and what a copied Place carries.
 * Run: node qa/r2-copy2.mjs   (from cairn/)
 */
const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');

const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');
const find = (t, id) => t.days.flatMap((d) => d.stops).concat(t.pool).find((s) => s.id === id);
const newest = (t) => t.days.flatMap((d) => d.stops).concat(t.pool).slice(-1)[0];

const { trip: euro } = loadEurope2026();
const marta = { ...euro, id: 'trip:marta', ownerId: 'user:marta' };
const ids = core.sequentialIds('m');
const ctx = { ids, today: '2026-08-25', actorUserId: 'local:self' };

line('rule 4 — a Place travels with the stop');
const placeStop = marta.days.flatMap((d) => d.stops).find((s) => s.place.kind === 'place');
const srcPlace = marta.places.find((p) => p.id === placeStop.place.placeId);
console.log('  source stop:', placeStop.name, '-> place', srcPlace.id, srcPlace.name);
const mine0 = core.createTrip(
  { title: 'Mine', startDate: '2026-09-01', endDate: '2026-09-02', homeCurrency: 'EUR',
    cities: [{ key: srcPlace.cityKey, name: srcPlace.cityKey, countryCode: 'AT', centre: srcPlace.at, order: 0 }] },
  { ids, now: '2026-08-25', actorUserId: 'local:self' },
);
const d0 = mine0.days[0].id;
const c1 = core.copyStopInto(mine0, { trip: marta, stopId: placeStop.id }, { kind: 'scheduled', dayId: d0, time: null, order: 0 }, ctx);
console.log('  places after 1 copy:', c1.places.length, JSON.stringify(c1.places[0]));
const c2 = core.copyStopInto(c1, { trip: marta, stopId: placeStop.id }, { kind: 'scheduled', dayId: d0, time: null, order: 0 }, ctx);
ok('place reused on the second copy', c2.places.length === 1, `${c2.places.length} places`);
// REPAIRED, Phase 2 I-0. This probe filed the question and the architect ANSWERED it against
// a `Place.provenance` field: ARCHITECTURE §2.13 A-6 / ROADMAP Phase 1 row 16 — "a `Place` with
// >=1 linking stop, ALL of them `attribution() !== null`, is measured but never `'certain'`.
// Derived in `geoCheck` at evaluation time — **no `Place.provenance`**", and A-6a then made
// `removeStop` prune the orphan rather than let it linger. So the credit a copied place
// carries is the credit on the stops that link it, and the ceiling is that `Place`'s shape did
// NOT change. Both halves are asserted, which is strictly more than the original line was.
ok('ceiling (§2.13 A-6): a copied Place carries NO provenance field — credit lives on the stop',
  !('provenance' in c1.places[0]), 'Place grew a provenance field; A-6 says it must not');
{
  const linkers = c1.days.flatMap((d) => d.stops).concat(c1.pool)
    .filter((st) => st.place.kind === 'place' && st.place.placeId === c1.places[0].id);
  ok('...and every stop linking it is attributed, which is what makes the place exempt',
    linkers.length > 0 && linkers.every((st) => core.attribution(st.provenance) !== null),
    `${linkers.length} linker(s), attributed: ${linkers.filter((st) => core.attribution(st.provenance) !== null).length}`);
}
console.log('  copied Place note:', JSON.stringify(c1.places[0].note ?? null));
console.log('  copied Place links:', JSON.stringify(c1.places[0].links ?? null));
console.log('  validate:', core.validateTrip(c2).map((i) => `${i.level}:${i.code}`).join(', ') || '(clean)');

line('the client store: copy, undo, redo, reload');
const ports = {
  storage: mem.memoryStorage(),
  clock: mem.fixedClockPort('2026-08-25'),
  ids: mem.sequentialIdPort('c'),
  file: mem.memoryFile(),
  scheduler: mem.immediateScheduler(),
};
const store = createStore({ ports, autosave: false });
await store.adoptTrip({ ...marta, id: 'trip:source', ownerId: core.LOCAL_OWNER });
await store.flush();
const mine = core.createTrip(
  { title: 'Target', startDate: '2026-09-01', endDate: '2026-09-02', homeCurrency: 'EUR', cities: [] },
  { ids: { newId: (k) => ports.ids.newId(k) }, now: '2026-08-25', actorUserId: core.LOCAL_OWNER },
);
await store.adoptTrip(mine);
await store.flush();
await store.refreshLibrary();
const browsed = await store.browseTrip('trip:source');
const bStop = browsed.days.flatMap((d) => d.stops)[0];
store.dispatch({ type: 'copyStopInto', source: { trip: browsed, stopId: bStop.id }, placement: { kind: 'scheduled', dayId: store.getState().doc.days[0].id, time: null, order: 0 } });
const cid = newest(store.getState().doc).id;
const st = (label) => {
  const s = find(store.getState().doc, cid);
  console.log(`  ${label}: ${s ? core.displayStatus(s) + ' / ' + (core.attribution(s) ? 'credit' : 'NO CREDIT') : 'absent'}`);
};
st('after copy');
store.undo(); st('after undo');
store.redo(); st('after redo');
for (let i = 0; i < 60; i++) store.dispatch({ type: 'updateStop', stopId: cid, patch: { note: 'edit ' + i } });
console.log('  history depth:', store.getState().history.past.length, '(limit', store.getState().history.limit + ')');
for (let i = 0; i < 70; i++) store.undo();
st('after 70 undos (history limit 50)');
await store.flush();
await store.openTrip(store.getState().doc.id);
st('after save + reopen from storage');

line('browse pane: is the browsed doc really read-only?');
const before = core.toJSON(browsed);
try {
  store.dispatch({ type: 'updateStop', stopId: bStop.id, patch: { name: 'HIJACK' } });
  console.log('  dispatch against a browsed stop id: NO THROW');
} catch (e) {
  console.log('  dispatch against a browsed stop id threw:', e.message.slice(0, 70));
}
// REPAIRED, Phase 2 I-0: `StoragePort.load()` has returned `{doc, version}` since `3a124a2`
// (ARCHITECTURE §2.2a rule 4). This line was `JSON.parse(await load(...))` and threw, so this
// probe has not executed past here since round 2.
const storedSource = await ports.storage.load('trip:source');
ok('browsed source document unchanged in storage', JSON.parse(storedSource.doc).days.flatMap((d) => d.stops)[0].name === bStop.name);
ok('in-memory browsed doc unchanged', core.toJSON(browsed) === before);

line('does the browsing doc survive a trip switch? (stale cross-trip state)');
console.log('  browsing before openTrip:', store.getState().browsing?.id ?? 'null');
await store.openTrip('trip:source');
console.log('  browsing after openTrip(same id as browsed):', store.getState().browsing?.id ?? 'null');
console.log('  active:', store.getState().activeTripId);
try {
  const s2 = store.getState().browsing;
  if (s2) {
    store.dispatch({ type: 'copyStopInto', source: { trip: s2, stopId: s2.days.flatMap((d) => d.stops)[0].id }, placement: { kind: 'scheduled', dayId: store.getState().doc.days[0].id, time: null, order: 0 } });
    const n = newest(store.getState().doc);
    console.log('  copied a stop from a trip into ITSELF:', core.displayStatus(n), JSON.stringify(core.attribution(n)));
    ok('self-copy is not credited to the user as "a friend"', core.attribution(n) === null || core.attribution(n).sourceTripId !== store.getState().doc.id,
      'a stop copied inside one trip is badged "from a friend" and credited to its own trip');
  }
} catch (e) { console.log('  self-copy threw:', e.message.slice(0, 80)); }
