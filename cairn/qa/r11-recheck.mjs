/**
 * Round 11 — the narrow re-verification of the two fixes shipped at `c6c6e2b`, attacked
 * BEYOND the builder's own regression tests and beyond the round-10 probes. Run from `cairn/`:
 *
 *     node qa/r11-recheck.mjs
 *
 *   §1  R10-3 (`set()` clears `history` on every `{reseed:true}`) — merged with a non-empty
 *       `future` and then REDONE; several undos in a row after a merge; and the one branch
 *       the fix does NOT reach, `set`'s step-1 identity early-return, which `writeAndSettle`
 *       takes whenever the user typed while the merge write was in flight (`stillOurs` false).
 *   §2  R10-2 (`updateStop` calls `pruneOrphanedCopyPlace`) — the other shapes of a
 *       place-changing patch (`{kind:'none'}`, a re-point to a DIFFERENT place), a copied stop
 *       in the POOL, `moveStop` (which must not be able to change `place` at all), and the
 *       over-prune guard (a second linker in the pool).
 *
 * A "FAIL" means the probe found something.
 */
const core = await import('../packages/core/src/index.ts');
const client = await import('../packages/client/src/index.ts');

let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? '\n         ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

const TODAY = '2026-08-01';
const VIENNA = { lat: 48.2082, lng: 16.3738 };
const LAX = { lat: 33.9416, lng: -118.4085 };
const FAR = { lat: 21.3069, lng: -157.8583 };

let idn = 0;
const ids = { newId: (k) => `${k}-r11-${++idn}` };
const ctx = () => ({ ids, now: TODAY, clock: { today: () => TODAY }, actorUserId: 'local:self' });
const findStop = (trip, id) => [...trip.days.flatMap((d) => d.stops), ...trip.pool].find((s) => s.id === id) ?? null;
const blockers = (trip) => core.detectConflicts(trip, { today: TODAY }).filter((c) => c.severity === 'blocker');

// ---------------------------------------------------------------------------
// §1 — R10-3
// ---------------------------------------------------------------------------
line('§1 R10-3 — the reseed clears history; three shapes the builder\'s test does not cover');

const mk = (storage) => client.createStore({
  ports: { storage, clock: client.fixedClockPort(TODAY), ids: client.sequentialIdPort() },
  debounceMs: 5,
});
const newTrip = { title: 'Shared trip', startDate: '2026-08-07', endDate: '2026-08-09',
  cities: [{ key: 'vienna', name: 'Vienna', centre: VIENNA }] };

/** The exact R10-3 setup: two tabs, disjoint fields on one day, tab A refused. */
async function twoTabsInConflict(storage) {
  const a = mk(storage);
  await a.createTrip(newTrip);
  const id = a.getState().doc.id;
  const dayId = a.getState().doc.days[0].id;
  await a.flush();
  const b = mk(storage);
  await b.openTrip(id);
  return { a, b, id, dayId };
}

// §1.1 — a non-empty `future` at merge time, then REDO instead of undo.
{
  const storage = client.memoryStorage();
  const { a, b, id, dayId } = await twoTabsInConflict(storage);
  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'OTHER TAB' } });
  await b.flush();
  // Tab A: two edits, then TWO Ctrl+Z's — so `future` is non-empty at merge time and the
  // document is still dirty (subtitle back to the empty string), which is what gets refused.
  a.dispatch({ type: 'setDayMeta', dayId, patch: { subtitle: 'mine' } });
  a.dispatch({ type: 'setDayMeta', dayId, patch: { subtitle: 'mine-2' } });
  a.undo(); a.undo();
  ok('1.1a precondition: a non-empty future before the merge', a.getState().history.future.length === 2,
     `future=${a.getState().history.future.length}`);
  await a.flush();                           // the undo's own scheduled save hits the fence
  ok('1.1b precondition: tab A is refused', a.getState().persistence.status === 'conflict', a.getState().persistence.status);
  await a.mergeWithStored();
  ok('1.1c the merge is correct', a.getState().doc.days[0].title === 'OTHER TAB',
     `title=${JSON.stringify(a.getState().doc.days[0].title)}`);
  ok('1.1d the reseed cleared BOTH stacks', a.getState().history.past.length === 0 && a.getState().history.future.length === 0,
     `past=${a.getState().history.past.length} future=${a.getState().history.future.length}`);
  a.redo(); a.redo(); a.redo();
  await a.flush();
  const s = core.fromJSON((await storage.load(id)).doc);
  ok('1.1e three Ctrl+Shift+Z after the merge cannot restore a pre-merge snapshot IN STORAGE',
     s.days[0].title === 'OTHER TAB' && s.days[0].subtitle === '',
     `stored title=${JSON.stringify(s.days[0].title)} subtitle=${JSON.stringify(s.days[0].subtitle)}`);
}

// §1.2 — many past entries, many undos after the merge.
{
  const storage = client.memoryStorage();
  const { a, b, id, dayId } = await twoTabsInConflict(storage);
  for (let i = 0; i < 6; i++) a.dispatch({ type: 'setDayMeta', dayId, patch: { subtitle: `v${i}` } });
  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'OTHER TAB' } });
  await b.flush();
  a.dispatch({ type: 'setDayMeta', dayId, patch: { subtitle: 'mine' } });
  await a.flush();
  await a.mergeWithStored();
  for (let i = 0; i < 10; i++) a.undo();
  await a.flush();
  const s = core.fromJSON((await storage.load(id)).doc);
  ok('1.2 ten Ctrl+Z after a merge cannot destroy the other tab\'s edit IN STORAGE',
     s.days[0].title === 'OTHER TAB' && s.days[0].subtitle === 'mine',
     `stored title=${JSON.stringify(s.days[0].title)} subtitle=${JSON.stringify(s.days[0].subtitle)} `
     + `past=${a.getState().history.past.length} status=${a.getState().persistence.status}`);
}

// §1.3 — the branch the R10-3 clear does not reach: `set`'s step-1 identity early-return.
// `writeAndSettle` only installs the merged document when `stillOurs` (`state.doc ===
// startedFrom`). If the user typed while the merge write was in flight, `state.doc` has moved
// on, `next.doc === state.doc`, and `set` returns at step 1 BEFORE the R10-3 history clear.
// Run twice: once WITHOUT the Ctrl+Z (the control — is the undo the cause of any loss?) and
// once WITH it.
async function mergeTypedThrough(withUndo) {
  const inner = client.memoryStorage();
  let gate = null;
  const storage = {
    ...inner,
    listTrips: (...x) => inner.listTrips(...x),
    load: (...x) => inner.load(...x),
    delete: (...x) => inner.delete(...x),
    async saveIfVersion(...x) {
      if (gate) { const g = gate; gate = null; await g; }
      return inner.saveIfVersion(...x);
    },
  };
  const { a, b, id, dayId } = await twoTabsInConflict(storage);
  a.dispatch({ type: 'setDayMeta', dayId, patch: { subtitle: 'A-early' } });
  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'OTHER TAB' } });
  await b.flush();
  a.dispatch({ type: 'setDayMeta', dayId, patch: { subtitle: 'mine' } });
  await a.flush();
  const refused = a.getState().persistence.status === 'conflict';

  // Hold the merge's write open, and type into tab A while it is in flight.
  let release;
  gate = new Promise((r) => { release = r; });
  const merging = a.mergeWithStored();
  await new Promise((r) => setTimeout(r, 20));
  a.dispatch({ type: 'setDayMeta', dayId, patch: { subtitle: 'typed DURING the merge write' } });
  release();
  await merging;

  const afterMerge = core.fromJSON((await storage.load(id)).doc).days[0];
  const past = a.getState().history.past.length;
  const inMem = a.getState().doc.days[0];
  if (withUndo) a.undo();
  await a.flush();
  const stored = core.fromJSON((await storage.load(id)).doc).days[0];
  return { refused, past, inMem, afterMerge, stored, status: a.getState().persistence.status };
}

{
  const ctrl = await mergeTypedThrough(false);
  ok('1.3a precondition: tab A is refused, and the merge write itself lands', ctrl.refused
     && ctrl.afterMerge.title === 'OTHER TAB',
     `status was conflict=${ctrl.refused}; storage straight after the merge write: title=${JSON.stringify(ctrl.afterMerge.title)}`);
  console.log(`         CONTROL (no Ctrl+Z): in memory title=${JSON.stringify(ctrl.inMem.title)} `
    + `subtitle=${JSON.stringify(ctrl.inMem.subtitle)}; past=${ctrl.past}; `
    + `storage after the next autosave: title=${JSON.stringify(ctrl.stored.title)} status=${ctrl.status}`);
  ok('1.3b R11-1 CONTROL — no Ctrl+Z at all: typing through the merge write loses the other tab\'s edit',
     ctrl.stored.title === 'OTHER TAB',
     `stored title=${JSON.stringify(ctrl.stored.title)} — the merged document is DISCARDED (\`stillOurs\` `
     + 'false, so `writeAndSettle` does not install it) and the un-merged local document is then '
     + 'autosaved over it under the POST-merge `savedVersion`, which the fence accepts. No undo '
     + 'is involved: this is NOT the R10-3 mechanism and the R10-3 fix neither causes nor cures it.');

  const undone = await mergeTypedThrough(true);
  // NOT asserted: `set` returns at step 1 here (`next.doc === state.doc`, because the merged
  // document was never installed), so the R10-3 clear does not run and `past` survives. That is
  // consistent — the surviving history IS linear with the document the store still holds. The
  // loss below is R11-1's, identical to the control, not an undo defect.
  console.log(`         WITH one Ctrl+Z: past at merge time=${undone.past}, `
    + `storage after the autosave: title=${JSON.stringify(undone.stored.title)} `
    + `subtitle=${JSON.stringify(undone.stored.subtitle)} status=${undone.status}`);
  ok('1.3c R11-1 — the same loss with a Ctrl+Z, same magnitude, same cause',
     undone.stored.title === 'OTHER TAB',
     `stored title=${JSON.stringify(undone.stored.title)}`);
}

// ---------------------------------------------------------------------------
// §2 — R10-2
// ---------------------------------------------------------------------------
line('§2 R10-2 — every OTHER shape of a place-changing patch, and the doors that are not `updateStop`');

function baseTrip(id, title, ownerId = 'local:self') {
  const t = core.createTrip({
    title, startDate: '2026-08-07', endDate: '2026-08-08',
    cities: [{ key: 'vienna', name: 'Vienna', centre: VIENNA }],
    homeBase: { name: 'LAX', at: LAX },
  }, ctx());
  return { ...t, id, ownerId };
}
function sourceTrip() {
  let t = baseTrip('trip-marta', "Marta's trip", 'user:marta');
  const place = { id: 'place-marta', name: 'Far Away', cityKey: 'vienna', at: FAR, kind: 'sight' };
  t = { ...t, places: [...t.places, place] };
  t = core.addStop(t, { kind: 'scheduled', dayId: t.days[0].id, time: null, order: 1 },
    { name: 'Far Away', category: 'sight', place: { kind: 'place', placeId: place.id } }, ctx());
  return t;
}
/** Mine, with one copied stop (and the Place `copyStopInto` rule 4 dragged in). */
function withCopy(placement) {
  const src = sourceTrip();
  const mine0 = baseTrip('trip-mine', 'My trip');
  const srcStop = src.days[0].stops[0];
  const before = new Set(mine0.places.map((p) => p.id));
  const trip = core.copyStopInto(mine0, { trip: src, stopId: srcStop.id },
    placement ?? { kind: 'scheduled', dayId: mine0.days[0].id, time: null, order: 1 },
    { ids, today: TODAY, actorUserId: 'local:self' });
  const copiedPlaceId = trip.places.map((p) => p.id).find((p) => !before.has(p));
  const copiedStop = [...trip.days.flatMap((d) => d.stops), ...trip.pool]
    .find((s) => core.attribution(s) !== null);
  return { trip, copiedStop, copiedPlaceId, dayId: mine0.days[0].id };
}

// 2.1 — place -> { kind: 'none' }
{
  const { trip, copiedStop, copiedPlaceId } = withCopy();
  ok('2.1a precondition: the copy brought a place and mints no blocker',
     trip.places.some((p) => p.id === copiedPlaceId) && blockers(trip).length === 0,
     `blockers=${blockers(trip).length}`);
  const after = core.updateStop(trip, copiedStop.id, { place: { kind: 'none' } });
  ok('2.1b clearing a copied stop\'s place entirely also prunes the orphan',
     !after.places.some((p) => p.id === copiedPlaceId) && blockers(after).length === 0,
     `place present=${after.places.some((p) => p.id === copiedPlaceId)} blockers=${JSON.stringify(blockers(after).map((c) => c.ruleId))}`);
}

// 2.2 — place -> a DIFFERENT { kind: 'place' } link
{
  const { trip: t0, copiedStop, copiedPlaceId } = withCopy();
  const other = { id: 'place-other', name: 'Vienna Sight', cityKey: 'vienna', at: VIENNA, kind: 'sight' };
  const trip = { ...t0, places: [...t0.places, other] };
  const after = core.updateStop(trip, copiedStop.id, { place: { kind: 'place', placeId: other.id } });
  ok('2.2 re-pointing a copied stop at a DIFFERENT place prunes the one it left',
     !after.places.some((p) => p.id === copiedPlaceId) && after.places.some((p) => p.id === other.id)
     && blockers(after).length === 0,
     `left=${after.places.some((p) => p.id === copiedPlaceId)} new=${after.places.some((p) => p.id === other.id)} `
     + `blockers=${JSON.stringify(blockers(after).map((c) => c.ruleId))}`);
}

// 2.3 — the copied stop is in the POOL
{
  const { trip, copiedStop, copiedPlaceId } = withCopy({ kind: 'pool' });
  ok('2.3a precondition: the copy is pooled', trip.pool.some((s) => s.id === copiedStop.id));
  const after = core.updateStop(trip, copiedStop.id, { place: { kind: 'inline', at: VIENNA } });
  ok('2.3b editing a POOLED copy\'s coordinates prunes its orphaned place too',
     !after.places.some((p) => p.id === copiedPlaceId) && blockers(after).length === 0,
     `place present=${after.places.some((p) => p.id === copiedPlaceId)} blockers=${blockers(after).length}`);
}

// 2.4 — `moveStop` must not be able to change `place` at all (§2.10: placement only)
{
  const { trip, copiedStop, copiedPlaceId, dayId } = withCopy();
  const moved = core.moveStop(trip, copiedStop.id, { kind: 'pool' });
  const s = findStop(moved, copiedStop.id);
  ok('2.4a moveStop preserves the stop\'s place link (no orphan to prune)',
     s.place.kind === 'place' && s.place.placeId === copiedPlaceId, `place=${JSON.stringify(s.place)}`);
  ok('2.4b ...and the place row and blocker count are unchanged',
     moved.places.length === trip.places.length && blockers(moved).length === 0,
     `places ${trip.places.length} -> ${moved.places.length} blockers=${blockers(moved).length}`);
  const back = core.moveStop(moved, copiedStop.id, { kind: 'scheduled', dayId, time: null, order: 0 });
  ok('2.4c ...and moving it back is still silent',
     back.places.some((p) => p.id === copiedPlaceId) && blockers(back).length === 0);
  ok('2.4d reorderStop likewise cannot change place',
     JSON.stringify(core.reorderStop(trip, copiedStop.id, 1).places) === JSON.stringify(trip.places));
}

// 2.5 — the over-prune guard: a SECOND linker sitting in the pool
{
  const { trip: t0, copiedStop, copiedPlaceId } = withCopy();
  const trip = core.addStop(t0, { kind: 'pool' },
    { name: 'My own note on it', category: 'sight', place: { kind: 'place', placeId: copiedPlaceId } }, ctx());
  const after = core.updateStop(trip, copiedStop.id, { place: { kind: 'inline', at: VIENNA } });
  ok('2.5a a place still linked from the POOL is never pruned by an updateStop re-point',
     after.places.some((p) => p.id === copiedPlaceId), 'clause 3 must look in the pool as well as the days');
  const f = core.geoCheck(after).find((x) => x.ref.kind === 'place' && x.ref.id === copiedPlaceId);
  ok('2.5b ...and it is now measured as the USER\'s place (its only linker is user-authored)',
     f !== undefined && f.confidence === 'certain', `confidence=${f && f.confidence}`);
}

// 2.6 — through the store's own dispatch path, with undo/redo
{
  const { trip, copiedStop, copiedPlaceId } = withCopy();
  const storage = client.memoryStorage();
  const store = mk(storage);
  await store.createTrip(newTrip);
  await store.loadTrip?.(trip);
  // No import door for a synthetic trip: drive core through the reducer instead.
  const s0 = store.getState();
  if (s0.doc) {
    // Replace the active document with our synthetic one via the merge-free path the tests
    // use: dispatch is the only public writer, so assert on core + the reducer's own action.
    const act = { type: 'updateStop', stopId: copiedStop.id, patch: { place: { kind: 'inline', at: VIENNA } } };
    const reduced = client.reduce
      ? client.reduce({ ...s0, doc: trip }, act, { ids, now: TODAY, clock: { today: () => TODAY }, actorUserId: 'local:self' })
      : null;
    if (reduced) {
      ok('2.6 the `updateStop` ACTION (the one StopEditor dispatches) prunes through the reducer',
         !reduced.doc.places.some((p) => p.id === copiedPlaceId), 'reducer path');
    } else {
      console.log('  --   2.6 skipped: `reduce` is not exported from packages/client');
    }
  }
}

console.log(`\n${fails} FAIL`);
