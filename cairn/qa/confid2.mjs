const core = await import('../packages/core/src/index.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);
const T = { today: FIXTURE_TODAY };
const { trip } = loadEurope2026();
const flight = trip.days.find((d) => d.id === '2026-08-18').stops.find((s) => s.name.startsWith('Ryanair PRG'));
const bvp = (t) => core.detectConflicts(t, T).find((c) => c.ruleId === 'booking_vs_plan');
// REPAIRED, Phase 2 I-0. This probe FILED R2-7 and R2-7 was fixed by adding `syncResolutions`
// — a build function §2.7 says "the client calls whenever it recomputes the derived conflict
// set". The probe never called it, so it kept reproducing the pre-fix behaviour of a caller
// that opts out of the fix, and reported R2-7 open forever. `recompute` below is what
// `packages/client`'s `getDerived()` does: detect, then retire, on every pass. Since §2.7 A-9
// `syncResolutions` detects its own UN-GATED set and takes `(trip, at)` — the set argument is
// gone, because the gated set is the wrong thing to retire against (QA P2-1).
const recompute = (t) => core.syncResolutions(t, FIXTURE_TODAY);

console.log('== resurrection of a dismissed conflict ==');
let t = core.updateStop(trip, flight.id, { time: '19:30' });
const c1 = bvp(t);
console.log('  flight 19:30 -> booking_vs_plan', c1.id);
console.log('   ', c1.summary);
t = core.resolveConflict(t, { conflictId: c1.id, state: 'dismissed', by: 'u1', at: '2026-08-01', note: 'I checked, it is fine' });
console.log('  dismissed. resolutions:', t.resolutions.length);

t = recompute(core.updateStop(t, flight.id, { time: '20:30' }));
const c2 = bvp(t);
console.log('  flight 20:30 -> booking_vs_plan', c2.id, 'resolution =', JSON.stringify(c2.resolution));
ok('the dismissal does NOT apply to the new 20:30 conflict', c2.resolution === null);

t = recompute(core.updateStop(t, flight.id, { time: '19:30' }));
const c3 = bvp(t);
console.log('  flight back to 19:30 -> booking_vs_plan', c3.id, 'resolution =', JSON.stringify(c3.resolution));
ok('the old dismissal does NOT silently come back to life', c3.resolution === null,
  'a conflict the user dismissed once is re-dismissed automatically when the data returns to that value, with no new user action');
console.log('  stale resolutions retained:', t.resolutions.length, JSON.stringify(t.resolutions.map((r) => r.conflictId)));

console.log('');
console.log('== do stale resolutions ever get cleaned up? ==');
let u = trip;
for (const time of ['08:30', '09:30', '10:30', '11:30', '12:30']) {
  u = recompute(core.updateStop(u, flight.id, { time }));
  const c = bvp(u);
  if (c) u = core.resolveConflict(u, { conflictId: c.id, state: 'acknowledged', by: 'u1', at: '2026-08-01' });
}
console.log('  after 5 edit+acknowledge cycles, trip.resolutions holds', u.resolutions.length, 'rows');
u = recompute(u);
const live = new Set(core.detectConflicts(u, T).map((c) => c.id));
console.log('  of which still correspond to a live conflict:', u.resolutions.filter((r) => live.has(r.conflictId)).length);
// §2.7 keeps a dead row deliberately — retired, not deleted — so a conflict that comes back
// says "you dismissed this and it has come back" rather than returning silently. The claim
// that survives the fix is that every dead row is RETIRED, i.e. inert and never re-armed.
const deadLive = u.resolutions.filter((r) => !live.has(r.conflictId) && !r.retiredAt);
ok('every resolution row with no live conflict is retired, not left armed', deadLive.length === 0,
  deadLive.length + ' dead rows still live, and they re-arm if the value ever returns');
console.log('  rows:', u.resolutions.length, '| retired:', u.resolutions.filter((r) => r.retiredAt).length);
console.log('  validateTrip complains about them?',
  core.validateTrip(u).filter((i) => /resolution/i.test(i.code) || /resolution/i.test(i.message)).length);
