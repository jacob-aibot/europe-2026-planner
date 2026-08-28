/**
 * Round 2, attack 2/6 — real-trip data shapes, and the interactions between the three
 * things that changed underneath the model (travelRole, geoCheck, copyStopInto).
 * Run: node qa/r2-data.mjs   (from cairn/)
 */
const core = await import('../packages/core/src/index.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');
const { trip } = loadEurope2026();
const ids = core.sequentialIds('d');
const ctx = { ids, now: '2026-08-25', actorUserId: 'local:self' };

line('the shapes the brief names');
const multi = trip.days.filter((d) => d.cities.length > 1);
console.log('  multi-city days:', multi.map((d) => `${d.id}:${d.cities.join('+')}`).join(' '));
const noCoord = trip.days.flatMap((d) => d.stops).filter((s) => s.place.kind === 'none');
console.log('  stops with no coordinate:', noCoord.length);
const overnight = trip.days.flatMap((d) => d.stops).filter((s) => s.arrival && s.arrival.mins > 600);
console.log('  legs over 10 h:', overnight.map((s) => `${s.name}:${s.arrival.mins}m`).join(' '));
const dup = trip.bookings.filter((b, i, a) => a.some((x, j) => j !== i && x.reference && x.reference === b.reference));
console.log('  bookings sharing a reference:', dup.map((b) => `${b.operator}/${b.reference}/${b.startsAt.date}`).join(' '));

line('zero-day / inverted / one-day trips still behave');
for (const [label, init] of Object.entries({
  'zero days (end < start)': { title: 'Z', startDate: '2026-09-05', endDate: '2026-09-01', homeCurrency: 'EUR', cities: [] },
  'one day': { title: 'O', startDate: '2026-09-01', endDate: '2026-09-01', homeCurrency: 'EUR', cities: [] },
})) {
  try {
    const t = core.createTrip(init, ctx);
    const iss = core.validateTrip(t);
    const con = core.detectConflicts(t, { today: '2026-08-25' });
    console.log(`  ${label}: days=${t.days.length} issues=[${iss.map((i) => i.code).join(',')}] conflicts=${con.length} geo=${core.geoCheck(t).length}`);
  } catch (e) { console.log(`  ${label}: THREW ${e.message.slice(0, 70)}`); }
}

line('copy + geoCheck: does the social primitive manufacture a blocker?');
const lisbon = core.createTrip(
  { title: 'Lisbon', startDate: '2026-09-01', endDate: '2026-09-03', homeCurrency: 'EUR',
    homeBase: { name: 'Lisbon home', at: { lat: 38.72, lng: -9.14 } },
    cities: [{ key: 'lisbon', name: 'Lisbon', countryCode: 'PT', centre: { lat: 38.72, lng: -9.14 }, order: 0 }] },
  ctx,
);
const lax = trip.days[0].stops[0];
const copied = core.copyStopInto(lisbon, { trip: { ...trip, ownerId: 'user:marta', id: 'trip:marta' }, stopId: lax.id },
  { kind: 'scheduled', dayId: lisbon.days[0].id, time: '09:00', order: 0 }, { ids, today: '2026-08-25', actorUserId: 'local:self' });
const cc = core.detectConflicts(copied, { today: '2026-08-25' });
console.log('  after copying "Arrive LAX" into a Lisbon trip:');
console.log('   geoCheck:', core.geoCheck(copied).map((f) => `${f.ref.id} ${f.km}km ${f.confidence}`).join(', '));
console.log('   conflicts:', cc.map((c) => `${c.severity}:${c.ruleId}`).join(', ') || '(none)');
ok('copying one stop does not manufacture a blocker', !cc.some((c) => c.severity === 'blocker'),
  'a legitimately-far stop copied from a friend fires geo_outlier as a BLOCKER');

line('travelRole survives the copy, and the rules read it consistently');
const journey = trip.days.flatMap((d) => d.stops).find((s) => s.travelRole === 'journey');
const cj = core.copyStopInto(lisbon, { trip, stopId: journey.id }, { kind: 'scheduled', dayId: lisbon.days[0].id, time: '10:00', order: 1 }, { ids, today: '2026-08-25', actorUserId: 'x' });
const got = cj.days[0].stops.find((s) => s.name === journey.name);
ok('travelRole copies verbatim', got.travelRole === 'journey', got.travelRole);
console.log('  arrival copied:', JSON.stringify(got.arrival));

line('the injected-fault criteria, re-derived independently');
// Fisherman's Bastion, the historical typo: place-68, 47.5025 -> 48.5025
const place68 = trip.places.find((p) => p.id === 'place-68');
console.log('  place-68 is:', place68?.name, JSON.stringify(place68?.at));
const typo = { ...trip, places: trip.places.map((p) => (p.id === 'place-68' ? { ...p, at: { ...p.at, lat: p.at.lat + 1 } } : p)) };
const before = core.detectConflicts(trip, { today: FIXTURE_TODAY });
const after = core.detectConflicts(typo, { today: FIXTURE_TODAY });
console.log(`  conflicts before=${before.length} after=${after.length}`);
const newOnes = after.filter((c) => !before.some((b) => b.id === c.id));
console.log('  new:', newOnes.map((c) => `${c.severity}:${c.ruleId}:${c.subjects.map((s) => s.id).join('/')} ${JSON.stringify(c.params)}`).join(' | '));
ok('the Fisherman\'s Bastion typo produces exactly one new blocker naming place-68',
  newOnes.length === 1 && newOnes[0].severity === 'blocker' && newOnes[0].subjects.some((s) => s.id === 'place-68'));

line('a typo the rule cannot see, stated honestly by §2.13 — check the boundary');
// A whole day displaced: §2.13 limitation 2.
const day = trip.days[5];
const whole = { ...trip, days: trip.days.map((d) => (d.id === day.id ? { ...d, stops: d.stops.map((s) => (s.place.kind === 'inline' ? { ...s, place: { kind: 'inline', at: { lat: s.place.at.lat + 1, lng: s.place.at.lng } } } : s)) } : d)) };
const wc = core.detectConflicts(whole, { today: FIXTURE_TODAY }).filter((c) => !before.some((b) => b.id === c.id));
console.log(`  displacing all of ${day.id} by +1° -> ${wc.length} new conflicts`, wc.map((c) => c.ruleId).join(','));

line('sub-threshold typo sweep: how far can one coordinate move undetected?');
const target = trip.days[3].stops.find((s) => s.place.kind === 'inline');
if (target) {
  for (const delta of [0.1, 0.2, 0.3, 0.4, 0.5, 1]) {
    const t2 = { ...trip, days: trip.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === target.id ? { ...s, place: { kind: 'inline', at: { lat: s.place.at.lat + delta, lng: s.place.at.lng } } } : s)) })) };
    const found = core.geoCheck(t2).filter((f) => f.ref.id === target.id);
    console.log(`   +${delta}° (~${Math.round(delta * 111)} km): ${found.length ? `${found[0].km}km ${found[0].confidence}` : 'invisible'}`);
  }
}

line('unbooked_ticketed / horizon rules with a hostile `today`');
for (const today of ['2026-08-01', '2030-01-01', '1999-01-01']) {
  const cs = core.detectConflicts(trip, { today });
  console.log(`  today=${today}: ${cs.length} conflicts (${cs.filter((c) => c.severity === 'blocker').length} blockers)`);
}
try { core.detectConflicts(trip, { today: 'garbage' }); console.log('  today="garbage": ACCEPTED, no throw'); }
catch (e) { console.log('  today="garbage": threw', e.message.slice(0, 60)); }
try { core.detectConflicts(trip, {}); console.log('  today missing: ACCEPTED, no throw'); }
catch (e) { console.log('  today missing: threw', e.message.slice(0, 60)); }
