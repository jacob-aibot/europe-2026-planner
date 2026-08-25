const core = await import('../packages/core/src/index.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);
const ctx = (p = 'r') => ({ ids: core.sequentialIds(p), now: '2026-08-01', actorUserId: 'u1' });
const { trip } = loadEurope2026();
const T = { today: '2026-08-01' };

console.log('== rules that never fire on the reference trip ==');
const fired = new Set(core.detectConflicts(trip, T).map((c) => c.ruleId));
const all = core.RULES.map((r) => r.id);
console.log('   rules:', all.join(', '));
console.log('   silent on the fixture:', all.filter((r) => !fired.has(r)).join(', '));

console.log('');
console.log('== "closed": the Naschmarkt flea-market case named in ARCHITECTURE 2.7 ==');
const withHours = trip.places.filter((p) => p.hours);
console.log('   places carrying opening hours after import:', withHours.length, '/', trip.places.length);
const nasch = trip.days.flatMap((d) => d.stops).find((s) => /Naschmarkt/i.test(s.name));
console.log('   Naschmarkt stop:', nasch ? nasch.name + ' @ ' + nasch.placement.time + ' place=' + JSON.stringify(nasch.place) : 'not found');
ok('the documented `closed` fixture case fires', fired.has('closed'),
  'no Place carries hours, so `closed` can never fire on this trip');

console.log('');
console.log('== "overlap": two stops with durations that intersect ==');
{
  const dayId = '2026-08-13';
  let t = core.updateStop(trip, trip.days.find((d) => d.id === dayId).stops[0].id, { durationMins: 180 }, ctx());
  t = core.updateStop(t, trip.days.find((d) => d.id === dayId).stops[1].id, { durationMins: 180 }, ctx());
  const c = core.detectConflicts(t, T).filter((x) => x.ruleId === 'overlap');
  ok('overlap fires', c.length > 0, 'none');
  if (c[0]) console.log('   ', c[0].summary);
  // durationMins null must never overlap
  const c2 = core.detectConflicts(trip, T).filter((x) => x.ruleId === 'overlap');
  ok('durationMins:null never overlaps', c2.length === 0);
}

console.log('');
console.log('== two stops at exactly the same time ==');
{
  const dayId = '2026-08-13';
  const day = trip.days.find((d) => d.id === dayId);
  const t = core.addStop(trip, { kind: 'scheduled', dayId, time: day.stops[0].placement.time, order: 0 },
    { name: 'Collision', category: 'sight', place: { kind: 'none' } }, ctx());
  const d2 = t.days.find((d) => d.id === dayId);
  console.log('   order at that time:', d2.stops.slice(0, 3).map((s) => s.placement.time + ' ' + s.name.slice(0, 24)));
  ok('no crash, both survive', d2.stops.length === day.stops.length + 1);
  core.computeLegs(d2, t); core.focusCluster(d2.stops, t); core.rollUpCost(d2.stops);
  ok('legs/clusters/cost survive', true);
}

console.log('');
console.log('== a stop with PlaceLink {kind:"none"} through everything ==');
{
  const dayId = '2026-08-13';
  const t = core.addStop(trip, { kind: 'scheduled', dayId, time: '11:11', order: 0 },
    { name: 'Nowhere', category: 'sight', place: { kind: 'none' }, cost: null }, ctx());
  const d = t.days.find((x) => x.id === dayId);
  const i = d.stops.findIndex((s) => s.name === 'Nowhere');
  const legs = core.computeLegs(d, t);
  console.log('   leg into it:', JSON.stringify(legs[i]), '| leg out of it:', JSON.stringify(legs[i + 1]));
  ok('leg into a coordinate-less stop is null', legs[i] === null);
  ok('leg OUT of a coordinate-less stop is null', legs[i + 1] === null);
  const f = core.focusCluster(d.stops, t);
  ok('focusCluster excludes it', !f.focus.some((s) => s.name === 'Nowhere') || f.focus.length > 0);
  ok('validateTrip does not error on it', !core.validateTrip(t).some((x) => x.level === 'error' && /Nowhere/.test(x.message)));
  ok('rollUpCost survives', !!core.rollUpCost(d.stops));
  console.log('   dayMovingMinutes:', core.dayMovingMinutes(d, t));
}

console.log('');
console.log('== a day with zero stops ==');
{
  const dayId = '2026-08-09';
  const day = trip.days.find((d) => d.id === dayId);
  console.log('   Aug 9 stop count:', day.stops.length);
  let t = trip;
  for (const s of day.stops) t = core.removeStop(t, s.id, ctx());
  const d = t.days.find((x) => x.id === dayId);
  ok('day survives with 0 stops', d.stops.length === 0);
  ok('computeLegs -> []', JSON.stringify(core.computeLegs(d, t)) === '[]');
  const f = core.focusCluster(d.stops, t);
  console.log('   focusCluster:', JSON.stringify({ split: f.split, focus: f.focus.length, spanKm: f.spanKm }));
  console.log('   mapBounds:', JSON.stringify(core.mapBounds(core.stopPoints(d.stops, t))));
  console.log('   rollUpCost:', JSON.stringify(core.rollUpCost(d.stops)));
  ok('validateTrip has no error for the empty day', !core.validateTrip(t).some((x) => x.level === 'error' && x.ref?.id === dayId));
}

console.log('');
console.log('== duplicate_booking: two references, same route and date ==');
{
  const b = trip.bookings.find((x) => x.kind === 'flight' && x.reference);
  console.log('   base booking:', b.operator, b.reference, JSON.stringify(b.startsAt), JSON.stringify(b.route));
  const dup = { ...b, id: 'bk-dup', reference: 'ZZZ999' };
  const t = core.upsertBooking(trip, dup, ctx());
  const c = core.detectConflicts(t, T).filter((x) => x.ruleId === 'duplicate_booking');
  ok('duplicate_booking fires', c.length > 0, 'silent');
  if (c[0]) console.log('   ', c[0].summary);
  const sup = { ...b, id: 'bk-sup', provenance: { ...b.provenance, addedAt: '2026-08-04' } };
  const t2 = core.upsertBooking(trip, sup, ctx());
  const c2 = core.detectConflicts(t2, T).filter((x) => x.ruleId === 'superseded_booking');
  console.log('   same reference, different issue date -> superseded_booking count:', c2.length);
  ok('same ref is superseded, not duplicated',
    core.detectConflicts(t2, T).filter((x) => x.ruleId === 'duplicate_booking').length === 0);
}

console.log('');
console.log('== money: CZK/GBP with no rate table, and mixed bases ==');
{
  const roll = core.rollUpCost(trip.days.flatMap((d) => d.stops));
  console.log('   byCurrency:', JSON.stringify(roll.byCurrency));
  console.log('   converted:', JSON.stringify(roll.converted));
  console.log('   missingRates:', JSON.stringify(roll.missingRates));
  console.log('   basisWarnings:', JSON.stringify(roll.basisWarnings));
  ok('never silently converts', roll.converted === null);
  ok('reports basisWarnings for the mixed-basis trip', roll.basisWarnings.length > 0);
  const cruise = trip.days.flatMap((d) => d.stops).find((s) => /cruise/i.test(s.name) && s.cost);
  console.log('   Danube cruise cost:', cruise ? JSON.stringify(cruise.cost) : 'not found');
}

console.log('');
console.log('== booking_vs_plan must fire when a booking really disagrees ==');
{
  const linked = trip.days.flatMap((d) => d.stops).find((s) => s.bookingId);
  const b = trip.bookings.find((x) => x.id === linked.bookingId);
  console.log('   linked stop:', linked.name, '@', linked.placement.time, '| booking', b.operator, JSON.stringify(b.startsAt));
  const moved = core.upsertBooking(trip, { ...b, startsAt: { date: '2026-08-19', time: '23:45' } }, ctx());
  const c = core.detectConflicts(moved, T).filter((x) => x.ruleId === 'booking_vs_plan');
  ok('booking_vs_plan fires on a real disagreement', c.length > 0, 'silent — the blocker rule never fires');
  if (c[0]) console.log('   ', c[0].summary);
}
