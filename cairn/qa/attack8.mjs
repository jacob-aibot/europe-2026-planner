const core = await import('../packages/core/src/index.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);
const { trip } = loadEurope2026();
const T = { today: FIXTURE_TODAY };

console.log('== ROADMAP: conflict ids change when the Aug 18 flight time is edited (correct patch shape) ==');
const flight = trip.days.find((d) => d.id === '2026-08-18').stops.find((s) => s.name.startsWith('Ryanair PRG'));
const before = core.detectConflicts(trip, T);
const edited = core.updateStop(trip, flight.id, { time: '19:30' });
const after = core.detectConflicts(edited, T);
const b = before.map((c) => c.id), a = after.map((c) => c.id);
console.log('   removed ids:', b.filter((i) => !a.includes(i)).length, '| added:', a.filter((i) => !b.includes(i)).length);
ok('ids change', b.filter((i) => !a.includes(i)).length > 0);

console.log('');
console.log('== an acknowledgement made before the edit must not carry over ==');
const tgt = before.find((c) => c.ruleId === 'impossible_transfer' && c.params.dayId === '2026-08-18');
const ack = core.resolveConflict(trip, { conflictId: tgt.id, state: 'acknowledged', by: 'u1', at: '2026-08-01' });
const ackEdited = core.updateStop(ack, flight.id, { time: '19:30' });
const post = core.detectConflicts(ackEdited, T);
const carried = post.filter((c) => c.resolution);
ok('no conflict on Aug 18 still carries the old acknowledgement',
  !carried.some((c) => c.params.dayId === '2026-08-18'),
  JSON.stringify(carried.map((c) => c.summary.slice(0, 80))));
console.log('   stale resolutions left in trip.resolutions:', ackEdited.resolutions.length, '(never garbage-collected)');

console.log('');
console.log('== updateStop with a runtime key TypeScript would have blocked ==');
const s0 = trip.days.find((d) => d.id === '2026-08-13').stops[0];
const hij = core.updateStop(trip, s0.id, { id: 'HIJACKED' });
const found = hij.days.find((d) => d.id === '2026-08-13').stops[0];
console.log('   stop id after updateStop({id:"HIJACKED"}):', found.id);
ok('updateStop refuses to rewrite the id', found.id === s0.id, 'id was rewritten -> booking links and conflict resolutions now dangle');
const junk = core.updateStop(trip, s0.id, { totallyUnknownKey: 'x', schemaVersion: 99 });
const j = junk.days.find((d) => d.id === '2026-08-13').stops[0];
console.log('   unknown keys written onto the stop:', Object.keys(j).filter((k) => !Object.keys(s0).includes(k)));
console.log('   survives a JSON round trip?', (() => { try { return Object.keys(core.fromJSON(core.toJSON(junk)).days.find((d) => d.id === '2026-08-13').stops[0]).filter((k) => !Object.keys(s0).includes(k)); } catch (e) { return 'threw ' + e.message; } })());

console.log('');
console.log('== rollUpCost lists the HOME currency as a missing rate ==');
const roll = core.rollUpCost(trip.days.flatMap((d) => d.stops), { homeCurrency: 'EUR' });
console.log('   missingRates:', JSON.stringify(roll.missingRates), '| trip.homeCurrency =', trip.homeCurrency);
ok('home currency is not reported as unconvertible', !roll.missingRates.includes(trip.homeCurrency));

console.log('');
console.log('== access predicates ==');
const rels = ['owner', 'member', 'editor', 'commenter', 'viewer', 'friend', 'revoked', 'stranger', 'anonymous', 'expired_link'];
const ops = ['view', 'comment', 'edit', 'share', 'delete'];
console.log('   ' + 'relationship'.padEnd(14) + ops.map((o) => o.padEnd(9)).join(''));
for (const r of rels) {
  const row = ops.map((o) => {
    try { return String(core.can({ userId: 'u2' }, r, o)).padEnd(9); } catch (e) { return 'ERR'.padEnd(9); }
  });
  console.log('   ' + r.padEnd(14) + row.join(''));
}
console.log('   effectiveRole(unknown relationship):', (() => { try { return core.effectiveRole('nonsense'); } catch (e) { return 'threw: ' + e.message; } })());
console.log('   can(principal, "nonsense-relationship", "edit"):', (() => { try { return core.can({ userId: 'u' }, 'nonsense', 'edit'); } catch (e) { return 'threw: ' + e.message; } })());
console.log('   can(principal, "revoked", "view"):', (() => { try { return core.can({ userId: 'u' }, 'revoked', 'view'); } catch (e) { return 'threw'; } })());
