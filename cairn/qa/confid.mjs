const core = await import('../packages/core/src/index.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);
const T = { today: FIXTURE_TODAY };
const { trip } = loadEurope2026();
const on18 = (cs) => cs.filter((c) => c.params.dayId === '2026-08-18' || c.subjects.some((s) => s.id === '2026-08-18'));

const flight = trip.days.find((d) => d.id === '2026-08-18').stops.find((s) => s.name.startsWith('Ryanair PRG'));
console.log('Aug 18 conflicts BEFORE the edit (flight at ' + flight.placement.time + '):');
const before = core.detectConflicts(trip, T);
for (const c of on18(before)) console.log('   ' + c.id + '  ' + c.ruleId);

const edited = core.updateStop(trip, flight.id, { time: '19:30' });
const after = core.detectConflicts(edited, T);
console.log('Aug 18 conflicts AFTER moving the flight to 19:30:');
for (const c of on18(after)) console.log('   ' + c.id + '  ' + c.ruleId);
const bIds = before.map((c) => c.id), aIds = after.map((c) => c.id);
console.log('');
console.log('   ids that disappeared:', bIds.filter((i) => !aIds.includes(i)).length);
console.log('   ids that appeared:  ', aIds.filter((i) => !bIds.includes(i)).length);
// REPAIRED, Phase 2 I-0. This asserted ROADMAP **revision 1**'s criterion, which the current
// ROADMAP §C explicitly retracts: *"acknowledge it, then edit the Aug 18 flight time → that
// exact id is STILL present and still acknowledged, because the edit does not touch its
// inputs. This half is the mechanism working; revision 1's criterion mistook it for a
// failure."* So the assertion is inverted to the criterion that replaced it.
ok('ROADMAP §C: an edit that does not touch a conflict\'s inputs leaves its id alone',
  bIds.every((i) => aIds.includes(i)),
  `${bIds.filter((i) => !aIds.includes(i)).length} pre-existing id(s) vanished on an unrelated edit`);
console.log('   (and the edit does add ids for the conflicts it DID create:', aIds.filter((i) => !bIds.includes(i)).length + ')');

console.log('');
console.log('== the invariant that actually matters: an acknowledged conflict about the flight ==');
// Step 1: move the flight to 19:30 so a conflict exists that is ABOUT the flight time.
const c19 = core.detectConflicts(edited, T).find((c) => c.ruleId === 'impossible_transfer' &&
  String(c.params.toName || '').startsWith('Ryanair'));
console.log('   conflict about the flight at 19:30:', c19 ? c19.id + ' :: ' + c19.summary : 'none');
if (c19) {
  const ack = core.resolveConflict(edited, { conflictId: c19.id, state: 'acknowledged', by: 'u1', at: '2026-08-01' });
  const moved = core.updateStop(ack, flight.id, { time: '20:30' });
  const post = core.detectConflicts(moved, T);
  const same = post.find((c) => c.id === c19.id);
  ok('id changes when the time behind it changes', !same,
    'the acknowledged conflict id survived a 19:30 -> 20:30 change and is still marked ' + JSON.stringify(same?.resolution));
  const nowAbout = post.find((c) => c.ruleId === 'impossible_transfer' && String(c.params.toName || '').startsWith('Ryanair'));
  console.log('   conflict about the flight at 20:30:', nowAbout ? nowAbout.id + ' resolution=' + JSON.stringify(nowAbout.resolution) : 'none');
}

console.log('');
console.log('== and the case the ROADMAP names: an acknowledgement made at 07:30, still live at 19:30 ==');
{
  // REPAIRED, Phase 2 I-0. This block was written when `impossible_transfer` produced four
  // blockers on the unmodified fixture. §2.12's `travelRole` took it to **0 blockers and 0
  // warnings** (ROADMAP Phase 1 row 1 and §C), which is the design, so `tgt` is `undefined`
  // and `tgt.summary` threw — this probe has not run past line 45 since `travelRole` landed.
  // The premise is gone, so the section asserts the ceiling that replaced it, and points at
  // the probe that still answers the carry-over question on a conflict that does exist.
  const tgt = before.find((c) => c.ruleId === 'impossible_transfer' && c.params.dayId === '2026-08-18');
  if (!tgt) {
    const anyIT = before.filter((c) => c.ruleId === 'impossible_transfer');
    ok('ceiling (§2.12, ROADMAP §C): impossible_transfer returns 0 findings on the unmodified trip',
      anyIT.length === 0, `${anyIT.length} found — the 4-blocker era is back`);
    console.log('   the acknowledgement-carry-over case now lives in qa/confid2.mjs, on a conflict that exists');
  } else {
    console.log('   acknowledging:', tgt.summary);
    const ack = core.resolveConflict(trip, { conflictId: tgt.id, state: 'acknowledged', by: 'u1', at: '2026-08-01' });
    const post = core.detectConflicts(core.updateStop(ack, flight.id, { time: '19:30' }), T);
    const still = post.find((c) => c.id === tgt.id);
    console.log('   after the flight moves to 19:30, that acknowledgement is:', still ? 'STILL APPLIED' : 'cleared');
    ok('the Aug 18 acknowledgement does not survive the Aug 18 flight-time edit', !still,
      'HISTORY Pass 5 lesson is not mechanised for this conflict — it is about the checkout->bus pair, which the flight edit does not touch');
  }
}

console.log('');
console.log('== legacy_flag id is content-addressed over what? ==');
{
  const lf = before.find((c) => c.ruleId === 'legacy_flag' && c.subjects.some((s) => s.id === '2026-08-18'));
  console.log('   before:', lf.id);
  const retitled = core.setDayMeta(trip, '2026-08-18', { subtitle: 'Totally different reason' }, { ids: core.sequentialIds('q'), now: '2026-08-01', actorUserId: 'u' });
  const lf2 = core.detectConflicts(retitled, T).find((c) => c.ruleId === 'legacy_flag' && c.subjects.some((s) => s.id === '2026-08-18'));
  console.log('   after rewriting the subtitle (which IS the summary):', lf2 ? lf2.id : 'gone');
  ok('changing the text behind a legacy_flag changes its id', !lf2 || lf2.id !== lf.id,
    'the id is stable while the summary changed — an acknowledgement carries over to a different statement');
  console.log('   summary now:', lf2?.summary);
}
