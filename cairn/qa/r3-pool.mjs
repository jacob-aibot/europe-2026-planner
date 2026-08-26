/**
 * Round 3 — attacks on the NEW pool/validation path (a746d75, R2-2).
 * Run: node qa/r3-pool.mjs   (from cairn/)
 */
const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const sel = await import('../packages/client/src/selectors/index.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');

const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');
const ctx = { ids: { newId: (k) => `${k}-x${Math.random().toString(36).slice(2, 7)}` }, now: '2026-08-26', actorUserId: core.LOCAL_OWNER };

/** What the pool panel can actually render, over all cities plus the catch-all. */
const reachable = (t) =>
  t.cities.reduce((n, c) => n + sel.poolSection(t, c.key).stops.length, 0) + sel.unfiledPool(t).length;

const { trip: europe } = loadEurope2026();

// ---------------------------------------------------------------------------
line('1. the reference trip: every pooled stop reachable? (ROADMAP F names it)');
{
  console.log(`  pool=${europe.pool.length} reachable=${reachable(europe)} cities=${europe.cities.length}`);
  ok('pool total == rendered total', europe.pool.length === reachable(europe));
  const iss = core.validateTrip(europe).filter((i) => i.code === 'pool_stop_unknown_city');
  ok('no false pool_stop_unknown_city on the real trip', iss.length === 0, JSON.stringify(iss.slice(0, 2)));
}

// ---------------------------------------------------------------------------
line('2. returnToPool with an EXPLICIT city key the trip does not have');
// ARCHITECTURE §2.9: "`returnToPool` will not mint an unreachable key, so this rule exists
// to catch a hand-edited document, a deleted city, and the next bug."
{
  const t0 = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2, lng: 16.37 } }] }, ctx);
  const withDay = core.setDayMeta(t0, t0.days[0].id, { primaryCity: 'vienna', cities: ['vienna'] });
  const t1 = core.addStop(withDay, { kind: 'scheduled', dayId: withDay.days[0].id, time: '10:00', order: 0 }, { name: 'Belvedere', category: 'sight' }, ctx);
  const stopId = t1.days[0].stops[0].id;
  const t2 = core.returnToPool(t1, stopId, 'atlantis');
  const key = t2.pool[0].placement.cityKey;
  console.log('  pooled under:', key);
  ok('returnToPool refuses a city key the trip does not have', key !== 'atlantis',
     'it minted exactly the unreachable key §2.9 says it will not mint');
  const iss = core.validateTrip(t2).filter((i) => i.code === 'pool_stop_unknown_city');
  ok('validateTrip catches it as an error', iss.length === 1 && iss[0].level === 'error',
     JSON.stringify(iss));
  ok('and the catch-all still renders it', sel.unfiledPool(t2).length === 1);
  // Is that path reachable from the client?
  const src = (await import('node:fs')).readFileSync(new URL('../packages/client/src/store/reducer.ts', import.meta.url), 'utf8');
  const m = src.match(/returnToPool[^\n]*\n?[^\n]*/);
  console.log('  reducer call site:', (m && m[0].trim().replace(/\s+/g, ' ')) || '(not found)');
}

// ---------------------------------------------------------------------------
line('3. primaryCity deleted from trip.cities AFTER the stop was scheduled');
{
  const t0 = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [
      { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2, lng: 16.37 } },
      { key: 'split', name: 'Split', countryCode: 'HR', centre: { lat: 43.5, lng: 16.44 } }] }, ctx);
  const d = core.setDayMeta(t0, t0.days[0].id, { primaryCity: 'vienna', cities: ['vienna', 'split'] });
  const t1 = core.addStop(d, { kind: 'scheduled', dayId: d.days[0].id, time: '10:00', order: 0 }, { name: 'Belvedere', category: 'sight' }, ctx);
  const stopId = t1.days[0].stops[0].id;
  // Delete Vienna from trip.cities by hand — there is no removeCity build function.
  const t2 = { ...t1, cities: t1.cities.filter((c) => c.key !== 'vienna') };
  const t3 = core.returnToPool(t2, stopId);
  console.log('  filed under:', t3.pool[0].placement.cityKey, '(day.cities were vienna,split)');
  ok('falls back to the other REAL city on the day', t3.pool[0].placement.cityKey === 'split');
  ok('reachable', reachable(t3) === t3.pool.length);
}

// ---------------------------------------------------------------------------
line('4. day.cities lists a second real city that is not primary');
{
  const t0 = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [
      { key: 'dubrovnik', name: 'Dubrovnik', countryCode: 'HR', centre: { lat: 42.65, lng: 18.09 } },
      { key: 'split', name: 'Split', countryCode: 'HR', centre: { lat: 43.5, lng: 16.44 } }] }, ctx);
  // The real Aug 12 shape: starts in Dubrovnik, ends in Split, editorially a SPLIT day.
  const d = core.setDayMeta(t0, t0.days[0].id, { primaryCity: 'split', cities: ['dubrovnik', 'split'] });
  const t1 = core.addStop(d, { kind: 'scheduled', dayId: d.days[0].id, time: '08:00', order: 0 }, { name: 'Old Town walk', category: 'sight' }, ctx);
  const t2 = core.returnToPool(t1, t1.days[0].stops[0].id);
  console.log('  filed under:', t2.pool[0].placement.cityKey, '(primary=split, day.cities=[dubrovnik,split])');
  ok('primaryCity wins over day.cities order', t2.pool[0].placement.cityKey === 'split');
}

// ---------------------------------------------------------------------------
line('5. returnToPool on a stop whose day no longer exists');
{
  const t0 = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2, lng: 16.37 } }] }, ctx);
  const d = core.setDayMeta(t0, t0.days[0].id, { primaryCity: 'vienna', cities: ['vienna'] });
  const t1 = core.addStop(d, { kind: 'scheduled', dayId: d.days[0].id, time: '10:00', order: 0 }, { name: 'Ghost', category: 'sight' }, ctx);
  const stopId = t1.days[0].stops[0].id;
  // A hand-broken document: the stop's day is gone but the stop is still in trip.days[0]?
  // Simulate the placement pointing at a day that does not exist.
  const broken = {
    ...t1,
    days: t1.days.map((day, i) => i === 0
      ? { ...day, stops: day.stops.map((s) => ({ ...s, placement: { ...s.placement, dayId: '2099-01-01' } })) }
      : day),
  };
  try {
    const t2 = core.returnToPool(broken, stopId);
    const key = t2.pool[0].placement.cityKey;
    console.log('  filed under:', key, '| hint.dayId:', JSON.stringify(t2.pool[0].placement.hint));
    ok('a stop whose day is gone still lands somewhere reachable',
       key === 'transit' || t2.cities.some((c) => c.key === key));
    ok('and the catch-all renders it', reachable(t2) === t2.pool.length);
    try {
      core.scheduleFromPool(t2, stopId);
      ok('scheduleFromPool recovers it', true);
    } catch (e) { ok('scheduleFromPool recovers it', false, e.message); }
  } catch (e) { ok('returnToPool did not throw', false, `${e.constructor.name}: ${e.message}`); }
}

// ---------------------------------------------------------------------------
line('6. the pool tab badge vs what the panel can show (R2-2 symptom: count != reachable)');
{
  // apps/web/src/views/TripView.tsx:71 — the badge is `trip.pool.length`, the whole pool.
  // PoolPanel renders ONE city's section plus the catch-all.
  const active = europe.cities[0].key;
  const shown = sel.poolSection(europe, active).stops.length + sel.unfiledPool(europe).length;
  console.log(`  tab badge says ${europe.pool.length}; the open panel (city "${active}") shows ${shown}`);
  ok('the badge and the open panel agree', europe.pool.length === shown,
     'the count the user sees is still not the number of stops the open panel reaches');
}

// ---------------------------------------------------------------------------
line('7. a trip whose city is literally keyed "transit"');
{
  const t0 = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'transit', name: 'Transit City', countryCode: 'XX', centre: { lat: 0, lng: 0 } }] }, ctx);
  const t1 = core.addStop(t0, { kind: 'scheduled', dayId: t0.days[0].id, time: '10:00', order: 0 }, { name: 'Layover beer', category: 'food' }, ctx);
  const t2 = core.returnToPool(t1, t1.days[0].stops[0].id);
  console.log('  filed under:', t2.pool[0].placement.cityKey, '| unfiled:', sel.unfiledPool(t2).length,
              '| poolFor(transit):', core.poolFor(t2, 'transit').length);
  ok('rendered exactly once', reachable(t2) === t2.pool.length, `reachable=${reachable(t2)} pool=${t2.pool.length}`);
}

// ---------------------------------------------------------------------------
line('8. pool_stop_unknown_city on a hand-built malformed document, through fromJSON');
{
  const t0 = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2, lng: 16.37 } }] }, ctx);
  const d = core.setDayMeta(t0, t0.days[0].id, { primaryCity: 'vienna', cities: ['vienna'] });
  const t1 = core.addStop(d, { kind: 'scheduled', dayId: d.days[0].id, time: '10:00', order: 0 }, { name: 'X', category: 'sight' }, ctx);
  const t2 = core.returnToPool(t1, t1.days[0].stops[0].id);
  const o = JSON.parse(core.toJSON(t2));
  o.pool[0].placement.cityKey = 'praha-typo';
  let round;
  try { round = core.fromJSON(JSON.stringify(o)); } catch (e) { round = null; console.log('  fromJSON rejected:', e.message.slice(0, 80)); }
  if (round) {
    const iss = core.validateTrip(round).filter((i) => i.code === 'pool_stop_unknown_city');
    ok('the injected fault fires exactly one error', iss.length === 1 && iss[0].level === 'error', JSON.stringify(iss));
    console.log('  message:', iss[0]?.message);
    ok('no coordinate in params (§6.1 rule 1)',
       !JSON.stringify(iss[0]?.params ?? {}).match(/-?\d{1,3}\.\d{3,}/));
    ok('the catch-all reaches it', sel.unfiledPool(round).length === 1);
  }
  // The CEILING the criterion states: the transit group itself never reports one.
  const tr = core.createTrip({ title: 'New trip', startDate: '2026-08-07', endDate: '2026-08-08' }, ctx);
  const tr1 = core.addStop(tr, { kind: 'scheduled', dayId: tr.days[0].id, time: '10:00', order: 0 }, { name: 'Y', category: 'sight' }, ctx);
  const tr2 = core.returnToPool(tr1, tr1.days[0].stops[0].id);
  const trIss = core.validateTrip(tr2).filter((i) => i.code === 'pool_stop_unknown_city');
  ok('a brand-new trip carries no false error', trIss.length === 0, JSON.stringify(trIss));
}

// ---------------------------------------------------------------------------
line('9. round trip through the catch-all: does "Add to the plan" actually work?');
// PoolPanel's button dispatches scheduleFromPool with hint {dayId: activeDayId} or none.
{
  const p = { storage: mem.memoryStorage(), clock: mem.fixedClockPort('2026-08-26'),
              ids: mem.sequentialIdPort('p-'), file: mem.memoryFile(), scheduler: mem.immediateScheduler() };
  const store = createStore({ ports: p });
  await store.createTrip({ title: 'New trip', startDate: '2026-08-07', endDate: '2026-08-08' });
  const d0 = store.getState().doc.days[0].id;
  store.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId: d0, time: '16:45', order: 0 }, stop: { name: 'Arrive LAX', category: 'transit' } });
  const stopId = store.getState().doc.days[0].stops[0].id;
  store.dispatch({ type: 'returnToPool', stopId });
  const t = store.getState().doc;
  ok('in the catch-all', sel.unfiledPool(t).length === 1);
  // The button, with the active day (what App renders) and without it.
  const withDay = () => store.dispatch({ type: 'scheduleFromPool', stopId, hint: { dayId: store.getState().ui.activeDayId } });
  try { withDay(); ok('round-trips back into the plan', store.getState().doc.days[0].stops.length === 1); }
  catch (e) { ok('round-trips back into the plan', false, e.message); }

  // Now the same, but for a stop pooled under a key that is NOT transit and NOT a city,
  // with no stored hint — the "hand-edited document" case the new error code is for.
  const t2raw = JSON.parse(core.toJSON(store.getState().doc));
  ok('control: it came back', t2raw.pool.length === 0);
}

console.log('');
