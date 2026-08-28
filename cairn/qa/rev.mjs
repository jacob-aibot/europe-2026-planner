const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);
const { trip } = loadEurope2026();

const st = mem.memoryStorage();
const s = createStore({
  ports: { storage: st, clock: mem.fixedClockPort('2026-08-24'), ids: mem.sequentialIdPort('c'), scheduler: mem.immediateScheduler() },
  autosave: false,
});
await s.adoptTrip(trip);

const dayId = '2026-08-13';
const stopId = trip.days.find((d) => d.id === dayId).stops[0].id;
const poolId = trip.pool[0].id;
const bk = trip.bookings[0];

const actions = [
  { type: 'setTripMeta', patch: { title: 'X' } },
  { type: 'setDayMeta', dayId, patch: { title: 'Y' } },
  { type: 'ensureDays' },
  { type: 'addStop', placement: { kind: 'scheduled', dayId, time: '23:00', order: 0 }, stop: { name: 'New', category: 'sight', place: { kind: 'none' } } },
  { type: 'updateStop', stopId, patch: { name: 'Renamed' } },
  { type: 'reorderStop', stopId, delta: 1 },
  { type: 'moveStop', stopId, placement: { kind: 'scheduled', dayId: '2026-08-14', time: '08:00', order: 0 } },
  { type: 'scheduleFromPool', stopId: poolId, hint: { dayId } },
  { type: 'returnToPool', stopId: poolId },
  { type: 'linkBooking', stopId, bookingId: bk.id },
  { type: 'upsertBooking', booking: { ...bk, operator: 'CHANGED' } },
  { type: 'resolveConflict', resolution: { conflictId: 'x', state: 'dismissed', by: 'u', at: '2026-08-24' } },
  { type: 'unresolveConflict', conflictId: 'x' },
  { type: 'acceptCandidate', ref: { kind: 'stop', id: trip.days.flatMap((d) => d.stops).find((x) => core.displayStatus(x) === 'suggested').id } },
  { type: 'removeStop', stopId },
];

console.log('== every action bumps revision, and derived is not stale ==');
for (const a of actions) {
  const before = s.getState().doc.revision;
  const dBefore = s.getDerived();
  const legsBefore = JSON.stringify(dBefore?.days?.[dayId] ?? dBefore ?? null).length;
  let after, err = null;
  try { after = s.dispatch(a).doc.revision; } catch (e) { err = e.message; }
  if (err) { console.log('   ' + a.type.padEnd(20) + ' THREW ' + err.slice(0, 60)); continue; }
  const dAfter = s.getDerived();
  ok(a.type.padEnd(20) + ' revision ' + before + ' -> ' + after, after > before);
  if (dAfter === dBefore) console.log('        (derived cache object identical after ' + a.type + ')');
}

console.log('');
console.log('== derived cache: is it keyed on revision only, or on trip id too? ==');
{
  const st2 = mem.memoryStorage();
  const s2 = createStore({ ports: { storage: st2, clock: mem.fixedClockPort('2026-08-24'), ids: mem.sequentialIdPort('d'), scheduler: mem.immediateScheduler() } });
  await s2.adoptTrip(trip);
  const d1 = s2.getDerived();
  const n1 = d1 ? Object.keys(d1).join(',') : 'null';
  console.log('   derived keys:', n1);
  const conflictsA = d1?.conflicts?.length;
  await s2.createTrip({ id: 'tiny', title: 'Tiny', startDate: '2027-01-01', endDate: '2027-01-02', homeCurrency: 'EUR', ownerId: 'u' });
  const d2 = s2.getDerived();
  console.log('   trip A conflicts:', conflictsA, '-> trip B conflicts:', d2?.conflicts?.length);
  ok('derived recomputed for the new trip', d2?.conflicts?.length === 0, JSON.stringify(d2?.conflicts?.slice(0, 1)));
  // revision collision: new trip has revision 1, same as ... force it
  await s2.openTrip(trip.id);
  const d3 = s2.getDerived();
  ok('derived recomputed on reopening trip A', d3?.conflicts?.length === conflictsA, `${d3?.conflicts?.length} vs ${conflictsA}`);
}

console.log('');
console.log('== two different trips with the SAME revision number ==');
{
  const st3 = mem.memoryStorage();
  const s3 = createStore({ ports: { storage: st3, clock: mem.fixedClockPort('2026-08-24'), ids: mem.sequentialIdPort('e'), scheduler: mem.immediateScheduler() } });
  const A = { ...trip, id: 'A', revision: 7 };
  const B = { ...trip, id: 'B', revision: 7, days: trip.days.map((d) => ({ ...d, stops: [] })) };
  await s3.adoptTrip(A);
  const dA = s3.getDerived();
  await s3.adoptTrip(B);
  const dB = s3.getDerived();
  const stopsA = Object.values(dA?.days ?? {}).length;
  console.log('   A derived days entries:', stopsA, '| B:', Object.values(dB?.days ?? {}).length);
  ok('B (0 stops, same revision as A) does not reuse A derived',
    JSON.stringify(dB) !== JSON.stringify(dA), 'derived identical across two trips at revision 7');
}
