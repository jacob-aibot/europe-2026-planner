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
// REPAIRED, Phase 2 I-0 — same two faults as qa/confid.mjs, in the same fixture case:
//   (1) this asserted ROADMAP **revision 1**'s criterion, which the current §C retracts by
//       name ("revision 1's criterion mistook it for a failure");
//   (2) the acknowledgement case below targeted `impossible_transfer` on the unmodified trip,
//       which §2.12 took to 0 findings, so `tgt` was `undefined` and `tgt.id` threw — nothing
//       in this file past line 19 had run since `travelRole` landed.
ok('ROADMAP §C: an edit that does not touch a conflict\'s inputs leaves its id alone',
  b.every((i) => a.includes(i)),
  `${b.filter((i) => !a.includes(i)).length} pre-existing id(s) vanished on an unrelated edit`);

console.log('');
console.log('== acknowledgement follows the VALUE, in both directions (ROADMAP §C) ==');
{
  // Direction 1 — the edit does NOT touch this conflict's inputs, so the acknowledgement stays.
  const keep = before.find((c) => c.ruleId === 'legacy_flag' && c.subjects.some((s) => s.id === '2026-08-18'));
  const ack = core.resolveConflict(trip, { conflictId: keep.id, state: 'acknowledged', by: 'u1', at: '2026-08-01' });
  const post = core.detectConflicts(core.updateStop(ack, flight.id, { time: '19:30' }), T);
  const same = post.find((c) => c.id === keep.id);
  ok('an unrelated edit leaves an acknowledgement in place', !!same && !!same.resolution,
    `present=${!!same} resolution=${JSON.stringify(same?.resolution?.state ?? null)}`);

  // Direction 2 — edit the text the id is addressed over, and the acknowledgement is gone.
  const retitled = core.setDayMeta(ack, '2026-08-18', { subtitle: 'Totally different reason' },
    { ids: core.sequentialIds('q'), now: '2026-08-01', actorUserId: 'u1' });
  const post2 = core.detectConflicts(retitled, T);
  ok('editing the text behind it drops the acknowledgement', !post2.find((c) => c.id === keep.id),
    'that exact id survived an edit to its own inputs');
  console.log('   stale resolutions left in trip.resolutions:', retitled.resolutions.length, '(syncResolutions retires them)');
}

console.log('');
console.log('== updateStop with a runtime key TypeScript would have blocked ==');
const s0 = trip.days.find((d) => d.id === '2026-08-13').stops[0];
// REPAIRED, Phase 2 I-0: `assertPatchable` now THROWS on `id` (§2.10's forbidden-patch-keys),
// so the old shape crashed this probe. The claim is unchanged — the id must not be rewritten —
// only the mechanism it is refused by.
let hijThrew = null;
try { core.updateStop(trip, s0.id, { id: 'HIJACKED' }); } catch (e) { hijThrew = e.message; }
console.log('   updateStop({id:"HIJACKED"}):', hijThrew ?? 'DID NOT THROW');
ok('updateStop refuses to rewrite the id', hijThrew !== null, 'id was rewritten -> booking links and conflict resolutions now dangle');
const junk = core.updateStop(trip, s0.id, { totallyUnknownKey: 'x', schemaVersion: 99 });
const j = junk.days.find((d) => d.id === '2026-08-13').stops[0];
console.log('   unknown keys written onto the stop:', Object.keys(j).filter((k) => !Object.keys(s0).includes(k)));
console.log('   survives a JSON round trip?', (() => { try { return Object.keys(core.fromJSON(core.toJSON(junk)).days.find((d) => d.id === '2026-08-13').stops[0]).filter((k) => !Object.keys(s0).includes(k)); } catch (e) { return 'threw ' + e.message; } })());

console.log('');
console.log('== rollUpCost lists the HOME currency as a missing rate ==');
// REPAIRED, Phase 2 I-0: the option is `target`, not `homeCurrency` (`RollUpOpts`, §2.6). With
// an unrecognised key `target` is `undefined`, so every present currency lands in
// `missingRates` including the home one — the probe was measuring its own typo. ROADMAP §B:
// "`rollUpCost` is always called with `{ target: trip.homeCurrency }`, and a `homeCurrency:'EUR'`
// trip never reports EUR in `missingRates`".
const roll = core.rollUpCost(trip.days.flatMap((d) => d.stops), { target: trip.homeCurrency });
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
