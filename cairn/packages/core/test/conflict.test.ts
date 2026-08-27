/**
 * Conflicts (ARCHITECTURE §2.7). The named fixture cases are asserted individually rather
 * than only as a snapshot, because a snapshot that silently loses a rule still passes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { europe2026, FIXTURE_TODAY, golden } from './fixture.ts';
import {
  detectConflicts, reassertRetirements, resolveConflict, updateStop, RULES, sequentialIds,
  createTrip, addStop,
  upsertBooking, linkBooking, setDayMeta, syncResolutions, validateTrip, LOCAL_OWNER,
  computeLegs as computeLegsForTest,
} from '../src/index.ts';
// Off the surface in §2.10 revision 5: a tuning constant a caller must not reproduce, and an
// internal of `computeLegs`. Tests import the module path. BUILD-NOTES KD-33.
import { STALE_RESOLUTION_LIMIT } from '../src/validate/validateTrip.ts';
import { timeVal as timeValForTest } from '../src/derive/legs.ts';
import type { Booking, BuildCtx } from '../src/index.ts';

const ctx = (): BuildCtx => ({ ids: sequentialIds('t'), now: '2026-01-01', actorUserId: LOCAL_OWNER });

type GoldenConflict = { id: string; ruleId: string; severity: string; summary: string; whyJacobMustAct?: string };

/**
 * `[snapshot]` — this golden is our own output and proves only that nothing changed
 * (ROADMAP "How a criterion is written", rule 2). It is paired with the `[stated]`
 * criterion in the next test and with the injected-fault criteria in `geoCheck.test.ts`.
 */
test('the golden conflict list is reproduced exactly', () => {
  const { trip } = europe2026();
  const g = golden<{ conflicts: GoldenConflict[]; blockerCount: number }>('core-conflicts.json');
  const actual = detectConflicts(trip, { today: FIXTURE_TODAY });
  assert.equal(actual.length, g.conflicts.length);
  for (let i = 0; i < actual.length; i++) {
    assert.equal(actual[i].id, g.conflicts[i].id, `conflict ${i} id`);
    assert.equal(actual[i].ruleId, g.conflicts[i].ruleId, `conflict ${i} rule`);
    assert.equal(actual[i].severity, g.conflicts[i].severity, `conflict ${i} severity`);
    assert.equal(actual[i].summary, g.conflicts[i].summary, `conflict ${i} summary`);
  }
});

/**
 * ROADMAP C, `[stated]`: exactly 2 blockers on the unmodified reference trip — the
 * `legacy_flag` days Aug 18 and Aug 20 — and nothing else. Revision 1 shipped 12, of which
 * 3 were actionable. This is a CEILING, not a floor (rule 4).
 */
test('exactly 2 blockers on the unmodified trip, and each carries its line saying why Jacob must act', () => {
  const { trip } = europe2026();
  const blockers = detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.severity === 'blocker');
  assert.deepEqual(blockers.map((c) => c.ruleId), ['legacy_flag', 'legacy_flag']);
  assert.deepEqual(
    blockers.flatMap((c) => c.subjects.filter((s) => s.kind === 'day').map((s) => s.id)).sort(),
    ['2026-08-18', '2026-08-20'],
  );

  const g = golden<{ conflicts: GoldenConflict[]; blockerCount: number }>('core-conflicts.json');
  assert.equal(g.blockerCount, 2);
  const goldenBlockers = g.conflicts.filter((c) => c.severity === 'blocker');
  assert.equal(goldenBlockers.length, 2);
  for (const c of goldenBlockers) {
    assert.ok(
      c.whyJacobMustAct && c.whyJacobMustAct.length > 40,
      `blocker ${c.id} (${c.ruleId}) has no line in the golden saying why Jacob must act on it`,
    );
  }
});

test('no rule puts a coordinate in Conflict.params — §2.7 and §6.1', () => {
  const { trip } = europe2026();
  // The clean trip plus every geography fault, so the rule that would leak one is exercised.
  const faulted = { ...trip, places: trip.places.map((p, i) => (i === 0 && p.at ? { ...p, at: { ...p.at, lat: p.at.lat + 1 } } : p)) };
  const suspicious: string[] = [];
  for (const t of [trip, faulted]) {
    for (const c of detectConflicts(t, { today: FIXTURE_TODAY })) {
      for (const [k, v] of Object.entries(c.params)) {
        if (typeof v !== 'number') continue;
        // A coordinate: in [-180,180] with three or more decimals.
        if (Math.abs(v) <= 180 && /\.\d{3,}/.test(String(v))) suspicious.push(`${c.ruleId}.params.${k} = ${v}`);
      }
    }
  }
  assert.deepEqual(suspicious, []);

  const raw = golden<Record<string, unknown>>('core-conflicts.json');
  const text = JSON.stringify(raw);
  const floats = [...text.matchAll(/-?\d{1,3}\.\d{3,}/g)].map((m) => m[0]);
  assert.deepEqual(floats, [], 'a coordinate reached the committed golden');
});

test('the two legacy_flag blockers are Aug 18 and Aug 20, with the day subtitle as the summary', () => {
  const { trip } = europe2026();
  const flags = detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'legacy_flag');
  assert.equal(flags.length, 2);
  const days = flags.flatMap((c) => c.subjects.filter((s) => s.kind === 'day').map((s) => s.id)).sort();
  assert.deepEqual(days, ['2026-08-18', '2026-08-20']);
  for (const c of flags) {
    assert.equal(c.severity, 'blocker');
    const day = trip.days.find((d) => d.id === c.subjects[0].id);
    assert.equal(c.summary, day?.subtitle);
  }
});

test('YZGDTS is a supersedes note, never a duplicate', () => {
  const { trip } = europe2026();
  const all = detectConflicts(trip, { today: FIXTURE_TODAY });
  const sup = all.filter((c) => c.ruleId === 'superseded_booking');
  assert.equal(sup.length, 1);
  assert.equal(sup[0].severity, 'note');
  assert.equal(sup[0].params.reference, 'YZGDTS');
  assert.equal(sup[0].params.oldDate, '2026-08-18');
  assert.equal(sup[0].params.newDate, '2026-08-15');
  assert.equal(all.filter((c) => c.ruleId === 'duplicate_booking').length, 0);
});

test('the two unverified references are IU1TUY and I54C9A', () => {
  const { trip } = europe2026();
  const unv = detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'unverified_reference');
  assert.deepEqual(unv.map((c) => c.params.reference).sort(), ['I54C9A', 'IU1TUY']);
  for (const c of unv) assert.equal(c.severity, 'warning');
});

test('booking_vs_plan does NOT fire for Aug 15 — the Smartwings reissue agrees with the plan', () => {
  const { trip } = europe2026();
  const fired = detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'booking_vs_plan');
  assert.deepEqual(fired, [], 'nothing in the fixture disagrees with its booking');
});

test('booking_vs_plan DOES fire when a booking and its stop disagree', () => {
  const { trip } = europe2026();
  const stop = trip.days.find((d) => d.id === '2026-08-15')!.stops.find((s) => s.name.startsWith('Smartwings'))!;
  const moved = updateStop(trip, stop.id, { time: '09:00' });
  const fired = detectConflicts(moved, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'booking_vs_plan');
  assert.equal(fired.length, 1);
  assert.equal(fired[0].severity, 'blocker');
  assert.match(fired[0].summary, /14:40/);
  assert.match(fired[0].summary, /09:00/);
});

test('the Aug 18 05:30 airport bus does NOT fire — it is a departure, not an arrival', () => {
  // §2.7's revision-1 table named this as the rule's fixture case, and the review, the QA
  // pass and the note to Jacob all called it the one real transfer defect. §2.12 revises
  // that: the bus DEPARTS 05:30, runs 40 minutes, reaches PRG at 06:10, and the flight is
  // 07:30. What the data says about the hotel-to-bus-stop transfer is nothing.
  const { trip } = europe2026();
  const day = trip.days.find((d) => d.id === '2026-08-18')!;
  const bus = day.stops.find((s) => s.name.startsWith('Airport Express bus'))!;
  assert.equal(bus.travelRole, 'journey');
  const fired = detectConflicts(trip, { today: FIXTURE_TODAY }).filter(
    (c) => c.ruleId === 'impossible_transfer' && c.params.dayId === '2026-08-18',
  );
  assert.deepEqual(fired.map((c) => c.summary), []);
});

test('missing_lodging covers Budapest and London and nothing else', () => {
  const { trip } = europe2026();
  const fired = detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'missing_lodging');
  assert.deepEqual(fired.map((c) => c.params.cityKey).sort(), ['budapest', 'london']);
  assert.equal(fired.find((c) => c.params.cityKey === 'budapest')?.params.nights, 3);
  assert.equal(fired.find((c) => c.params.cityKey === 'london')?.params.nights, 1);
});

test('unbooked_ticketed names Széchenyi, Prague Castle and Windsor', () => {
  const { trip } = europe2026();
  const fired = detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'unbooked_ticketed');
  const names = fired.map((c) => String(c.params.stopName));
  for (const want of ['Széchenyi Thermal Bath', 'Prague Castle grounds & ticket queue', 'Windsor Castle']) {
    assert.ok(names.some((n) => n.startsWith(want.slice(0, 12))), `${want} should be flagged`);
  }
});

test('unbooked_ticketed returns nothing when no clock is injected', () => {
  const { trip } = europe2026();
  assert.equal(detectConflicts(trip).filter((c) => c.ruleId === 'unbooked_ticketed').length, 0);
});

test('overlap never fires without a duration, and does fire with one', () => {
  const { trip } = europe2026();
  assert.equal(detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'overlap').length, 0);
  const day = trip.days.find((d) => d.id === '2026-08-16')!;
  const [a, b] = day.stops;
  const withDur = updateStop(updateStop(trip, a.id, { durationMins: 240 }), b.id, { durationMins: 30 });
  const fired = detectConflicts(withDur, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'overlap');
  assert.equal(fired.length, 1);
  assert.equal(fired[0].severity, 'warning');
});

test('duplicate_booking fires for two different references on the same route and date', () => {
  const { trip } = europe2026();
  const original = trip.bookings.find((b) => b.reference === 'AS67UA')!;
  const clone: Booking = { ...original, id: 'booking-clone', reference: 'ZZ99XX' };
  const withDupe = upsertBooking(trip, clone);
  const fired = detectConflicts(withDupe, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'duplicate_booking');
  assert.equal(fired.length, 1);
  assert.equal(fired[0].severity, 'warning');
  assert.match(String(fired[0].params.references), /ZZ99XX/);
});

test('conflict ids are stable across a no-op re-import', () => {
  const a = europe2026().trip;
  const before = detectConflicts(a, { today: FIXTURE_TODAY });
  const again = detectConflicts(a, { today: FIXTURE_TODAY });
  assert.deepEqual(again.map((c) => c.id), before.map((c) => c.id));
});

/**
 * ROADMAP C: "Acknowledgement follows the value, in both directions", asserted on specific
 * ids rather than on array inequality. Revision 1's test asserted
 * `notDeepEqual([Y, X], [X])`, which is true and proves nothing — it passes on an id list
 * that merely GREW.
 *
 * The second half matters as much as the first: an edit that does NOT touch a conflict's
 * inputs correctly leaves its acknowledgement standing. That is the content-addressing
 * mechanism working, and revision 1's criterion mistook it for a failure.
 */
test('acknowledging Aug 20, then editing that day, retires the acknowledgement with the id', () => {
  const a = europe2026().trip;
  const target = detectConflicts(a, { today: FIXTURE_TODAY }).find(
    (c) => c.ruleId === 'legacy_flag' && c.subjects.some((s) => s.id === '2026-08-20'),
  )!;
  assert.ok(target, 'Aug 20 is one of the two legacy_flag blockers');

  const acked = resolveConflict(a, {
    conflictId: target.id, state: 'acknowledged', at: '2026-08-01', by: 'local:self',
  });
  assert.equal(
    detectConflicts(acked, { today: FIXTURE_TODAY }).find((c) => c.id === target.id)?.resolution?.state,
    'acknowledged',
  );

  const edited = setDayMeta(acked, '2026-08-20', { subtitle: 'A different explanation entirely' });
  const after = detectConflicts(edited, { today: FIXTURE_TODAY });

  assert.equal(after.some((c) => c.id === target.id), false, 'the acknowledged id survived an edit to its inputs');
  const successor = after.find((c) => c.ruleId === 'legacy_flag' && c.subjects.some((s) => s.id === '2026-08-20'))!;
  assert.ok(successor, 'the day is still flagged, so the blocker must still be reported');
  assert.notEqual(successor.id, target.id);
  assert.ok(!successor.resolution, `acknowledgement carried over: ${JSON.stringify(successor.resolution)}`);
});

test('acknowledging Aug 20, then editing the Aug 18 flight time, leaves it acknowledged — and that is correct', () => {
  const a = europe2026().trip;
  const target = detectConflicts(a, { today: FIXTURE_TODAY }).find(
    (c) => c.ruleId === 'legacy_flag' && c.subjects.some((s) => s.id === '2026-08-20'),
  )!;
  const acked = resolveConflict(a, {
    conflictId: target.id, state: 'acknowledged', at: '2026-08-01', by: 'local:self',
  });
  const flight = a.days.find((d) => d.id === '2026-08-18')!.stops.find((s) => s.name.startsWith('Ryanair PRG'))!;
  const edited = updateStop(acked, flight.id, { time: '19:30' });
  const still = detectConflicts(edited, { today: FIXTURE_TODAY }).find((c) => c.id === target.id);
  assert.equal(still?.resolution?.state, 'acknowledged',
    'moving an Aug 18 flight does not touch an Aug 20 day flag, so the acknowledgement must stand');
});

test('resolveConflict records a resolution and changes nothing else', () => {
  const { trip } = europe2026();
  const first = detectConflicts(trip, { today: FIXTURE_TODAY })[0];
  const resolved = resolveConflict(trip, { conflictId: first.id, state: 'acknowledged', by: LOCAL_OWNER, at: '2026-08-24' });
  assert.equal(resolved.resolutions.length, 1);
  assert.equal(resolved.days.length, trip.days.length);
  assert.deepEqual(resolved.days, trip.days, 'no stop may be edited in response to a conflict');
  const after = detectConflicts(resolved, { today: FIXTURE_TODAY });
  assert.equal(after.length, detectConflicts(trip, { today: FIXTURE_TODAY }).length, 'a resolved conflict still renders');
  assert.equal(after.find((c) => c.id === first.id)?.resolution?.state, 'acknowledged');
});

/**
 * `geo_outlier`'s own tests moved to `geoCheck.test.ts` when §2.13 made the rule a thin
 * publisher over one shared mechanism. `closed` is deleted from Phase 1 (§2.7): 0 of 95
 * places carry `hours`, §2.11 has no `hours` row, and the fixture case it named
 * ("Naschmarkt flea market ends 14:00") is not a stop in the trip. A rule with a fictional
 * fixture case reads as coverage and is not.
 */
test('every rule has a unique id and survives an empty trip', () => {
  const ids = RULES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  const empty = createTrip({ title: 'Empty', startDate: '2026-01-01', endDate: '2026-01-01' }, ctx());
  assert.deepEqual(detectConflicts(empty, { today: '2026-01-01' }), []);
});

test('a linked booking that vanishes does not crash detection', () => {
  const c = ctx();
  let trip = createTrip({ title: 'T', startDate: '2026-01-01', endDate: '2026-01-02', cities: [{ key: 'x', name: 'X', centre: { lat: 0, lng: 0 } }] }, c);
  trip = addStop(trip, { kind: 'scheduled', dayId: '2026-01-01', time: '10:00', order: 0 }, { name: 'S', category: 'sight' }, c);
  const booking: Booking = {
    id: 'b1', tripId: trip.id, kind: 'other', operator: 'X', reference: 'R', startsAt: { date: '2026-01-01', time: '10:00' },
    price: null, party: null, status: 'active', ticket: null,
    provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-01-01', acceptedAt: '2026-01-01', actorUserId: null },
  };
  trip = upsertBooking(trip, booking);
  trip = linkBooking(trip, trip.days[0].stops[0].id, 'b1');
  const orphaned = { ...trip, bookings: [] };
  assert.doesNotThrow(() => detectConflicts(orphaned, { today: '2026-01-01' }));
});

// ---------------------------------------------------------------------------
// §2.12 — travelRole, and the departure-time defect it closes
// ---------------------------------------------------------------------------

test('impossible_transfer returns 0 blockers and 0 warnings on the unmodified trip', () => {
  const { trip } = europe2026();
  const fired = detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'impossible_transfer');
  assert.deepEqual(
    fired.map((c) => `${c.severity}: ${c.summary}`),
    [],
    'all four of Phase 1\'s hits were departure-time artifacts, Aug 18 included',
  );
});

test('the tightest remaining margin on any transfer stop is 7 minutes — Aug 14, Skradin', () => {
  const { trip } = europe2026();
  let tightest = { margin: Infinity, name: '', day: '' };
  for (const day of trip.days) {
    const legs = computeLegsForTest(day, trip);
    for (let i = 1; i < day.stops.length; i++) {
      const leg = legs[i];
      const prev = day.stops[i - 1];
      const cur = day.stops[i];
      if (!leg || cur.travelRole !== 'transfer') continue;
      if (prev.placement.kind !== 'scheduled' || cur.placement.kind !== 'scheduled') continue;
      const t0 = timeValForTest(prev.placement.time);
      const t1 = timeValForTest(cur.placement.time);
      if (t0 >= 99999 || t1 >= 99999) continue;
      const margin = t1 - t0 - leg.mins;
      if (margin < tightest.margin) tightest = { margin, name: cur.name, day: day.id };
    }
  }
  assert.equal(tightest.margin, 7, `tightest was ${tightest.margin} min at ${tightest.day} “${tightest.name}”`);
  assert.equal(tightest.day, '2026-08-14');
  assert.match(tightest.name, /Skradin/);
});

/**
 * ROADMAP C's injected-fault criterion for the departure model names "the Aug 8 Condor
 * DE4345 stop". **That stop cannot demonstrate the fault**: it departs 14:30 against a
 * 13:00 previous stop and runs 80 minutes, so the gap already exceeds the journey by 10
 * minutes and `impossible_transfer` is silent whichever role it carries. It is one of the
 * 25 stops §2.12 describes as "silent only because the printed clock gap happens to exceed
 * the journey time". The criterion names a stop with no observable flip; the mechanism it
 * is reaching for is real and is asserted here on a stop where the flip IS observable —
 * the Aug 7 Condor DE2081, 660 minutes into a 120-minute gap. Both halves are checked, so
 * the criterion's own stop is covered too. BUILD-NOTES §1, KD-16.
 */
test('injected fault: a vehicle journey fires as a blocker only if its time is called an arrival', () => {
  const { trip } = europe2026();

  const flip = (dayId: string, nameFragment: string, role: 'transfer' | 'journey' | 'unknown') => {
    const day = trip.days.find((d) => d.id === dayId)!;
    const target = day.stops.find((s) => s.name.includes(nameFragment))!;
    assert.ok(target, `${nameFragment} not found on ${dayId}`);
    const stops = day.stops.map((s) => (s.id === target.id ? { ...s, travelRole: role } : s));
    const days = trip.days.map((d) => (d.id === day.id ? { ...d, stops } : d));
    return detectConflicts({ ...trip, days }, { today: FIXTURE_TODAY }).filter(
      (c) => c.ruleId === 'impossible_transfer' && c.subjects.some((x) => x.id === target.id),
    );
  };

  // The observable case: Aug 7, Condor DE2081, a 660-minute flight in a 120-minute gap.
  assert.deepEqual(flip('2026-08-07', 'Condor DE2081', 'journey'), [],
    "'journey' must not fire: a vehicle's own run is not a transfer");
  const asTransfer = flip('2026-08-07', 'Condor DE2081', 'transfer');
  assert.equal(asTransfer.length, 1);
  assert.equal(asTransfer[0].severity, 'blocker');
  const asUnknown = flip('2026-08-07', 'Condor DE2081', 'unknown');
  assert.equal(asUnknown.length, 1);
  assert.equal(asUnknown[0].severity, 'warning', "'unknown' degrades to a warning, it does not go silent");
  assert.match(asUnknown[0].detail ?? '', /departure|cannot tell/i);

  // The criterion's own stop, and why it proves nothing either way.
  const de4345 = trip.days.find((d) => d.id === '2026-08-08')!.stops.find((s) => s.name.includes('Condor DE4345'))!;
  assert.equal(de4345.travelRole, 'journey', 'the importer must classify a cat:transit flight as a journey');
  for (const role of ['transfer', 'journey', 'unknown'] as const) {
    assert.deepEqual(flip('2026-08-08', 'Condor DE4345', role), [],
      `Aug 8 DE4345 has a 10-minute margin, so role ${role} changes nothing — see the header`);
  }
});

test('a journey stop occupies its own run for overlap, even with durationMins null', () => {
  const { trip } = europe2026();
  const day = trip.days.find((d) => d.id === '2026-08-08')!;
  const condor = day.stops.find((s) => s.name.includes('Condor DE4345'))!;
  assert.equal(condor.durationMins, null);
  assert.ok(condor.arrival && condor.arrival.mins > 0);

  const t = condor.placement.kind === 'scheduled' ? condor.placement.time! : '';
  const mid = `${String(Number(t.slice(0, 2)) + 1).padStart(2, '0')}:${t.slice(3)}`;
  const intruder = {
    ...condor,
    id: 'stop-intruder',
    name: 'Something scheduled mid-flight',
    travelRole: 'transfer' as const,
    arrival: null,
    durationMins: 10,
    placement: { kind: 'scheduled' as const, dayId: day.id, time: mid, order: 99 },
  };
  const days = trip.days.map((d) => (d.id === day.id ? { ...d, stops: [...d.stops, intruder] } : d));
  const fired = detectConflicts({ ...trip, days }, { today: FIXTURE_TODAY }).filter(
    (c) => c.ruleId === 'overlap' && c.subjects.some((s) => s.id === 'stop-intruder'),
  );
  assert.equal(fired.length, 1, 'a flight does overlap the thing you scheduled during it');
});

test('a journey does NOT overlap the stop that immediately follows it — the Aug 21 timezone artifact', () => {
  const { trip } = europe2026();
  const fired = detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'overlap');
  assert.deepEqual(fired.map((c) => c.summary), [],
    'BA863 12:55 + 165 min vs Windsor 15:15 is CEST -> BST, not an overlap (KD-15)');
});

// ---------------------------------------------------------------------------
// §2.7 — resolutions are retired, not resurrected
// ---------------------------------------------------------------------------

test('a dismissal does not resurrect when the data reverts to its old value', () => {
  const a = europe2026().trip;
  const day = a.days.find((d) => d.id === '2026-08-20')!;

  const original = detectConflicts(a, { today: FIXTURE_TODAY }).find(
    (c) => c.ruleId === 'legacy_flag' && c.subjects.some((s) => s.id === '2026-08-20'),
  )!;
  const dismissed = resolveConflict(a, {
    conflictId: original.id, state: 'dismissed', at: '2026-08-12', by: 'local:self',
  });

  // X -> Y: the conflict's content changes, so the id changes and the old row is retired.
  const toY = setDayMeta(dismissed, '2026-08-20', { subtitle: 'A different subtitle' });
  const atY = detectConflicts(toY, { today: FIXTURE_TODAY });
  assert.equal(atY.some((c) => c.id === original.id), false);
  const syncedAtY = syncResolutions(toY, atY, '2026-08-13');
  assert.equal(syncedAtY.resolutions.find((r) => r.conflictId === original.id)?.retiredAt, '2026-08-13');

  // Y -> X: the original id comes back. It must come back UNRESOLVED.
  const backToX = setDayMeta(syncedAtY, '2026-08-20', { subtitle: day.subtitle });
  const atX = detectConflicts(backToX, { today: FIXTURE_TODAY });
  const returned = atX.find((c) => c.id === original.id);
  assert.ok(returned, 'the conflict must come back — the data is what it was');
  assert.equal(returned.resolution, null, 'a dismissed blocker re-armed itself with no user action');
  assert.match(returned.detail ?? '', /dismissed this on 2026-08-12/,
    'the returning conflict must say it was dismissed before');
});

test('syncResolutions is one-way and is a no-op when nothing changed', () => {
  const a = europe2026().trip;
  const conflicts = detectConflicts(a, { today: FIXTURE_TODAY });
  const resolved = resolveConflict(a, {
    conflictId: conflicts[0].id, state: 'acknowledged', at: '2026-08-01', by: 'local:self',
  });
  assert.equal(syncResolutions(resolved, conflicts, '2026-08-13'), resolved, 'must not churn the document');

  const retired = syncResolutions(resolved, [], '2026-08-13');
  assert.equal(retired.resolutions[0].retiredAt, '2026-08-13');
  assert.equal(retired.revision, resolved.revision + 1);
  // and nothing un-retires
  const again = syncResolutions(retired, conflicts, '2026-08-20');
  assert.equal(again.resolutions[0].retiredAt, '2026-08-13');
});

test('validateTrip reports retired resolutions once they pile up, and stays quiet below the limit', () => {
  const a = europe2026().trip;
  const rows = Array.from({ length: STALE_RESOLUTION_LIMIT + 1 }, (_, i) => ({
    conflictId: `gone-${i}`, state: 'dismissed' as const, by: 'local:self', at: '2026-08-01', retiredAt: '2026-08-02',
  }));
  assert.deepEqual(
    validateTrip({ ...a, resolutions: rows.slice(0, STALE_RESOLUTION_LIMIT) }).filter((i) => i.code === 'stale_resolutions'),
    [],
  );
  const over = validateTrip({ ...a, resolutions: rows }).filter((i) => i.code === 'stale_resolutions');
  assert.equal(over.length, 1);
  assert.equal(over[0].params.retired, STALE_RESOLUTION_LIMIT + 1);
});

// ---------------------------------------------------------------------------
// A-5 (revision 6, QA R8-1) — `reassertRetirements`. Retirement is monotone
// metadata, so a client can re-assert it onto a restored undo snapshot. The
// function is the whole of §4.2 rule 5's carve-out and it must touch NOTHING
// but `resolutions[].retiredAt` on rows the ledger has a key for.
// ---------------------------------------------------------------------------

test('A-5: reassertRetirements returns the SAME reference when nothing changed', () => {
  const a = europe2026().trip;
  const conflicts = detectConflicts(a, { today: FIXTURE_TODAY });
  const resolved = resolveConflict(a, {
    conflictId: conflicts[0].id, state: 'dismissed', at: '2026-08-01', by: 'local:self',
  });
  assert.equal(reassertRetirements(resolved, new Map()), resolved, 'an empty ledger must not churn the document');
  assert.equal(
    reassertRetirements(resolved, new Map([['some-other-conflict', '2026-08-13']])),
    resolved,
    'a ledger with no key for any live row must not churn the document',
  );
  const retired = syncResolutions(resolved, [], '2026-08-13');
  assert.equal(
    reassertRetirements(retired, new Map([[conflicts[0].id, '2026-08-13']])),
    retired,
    'a row that is ALREADY retired is not rewritten',
  );
});

test('A-5: reassertRetirements sets retiredAt from the ledger and bumps revision', () => {
  const a = europe2026().trip;
  const conflicts = detectConflicts(a, { today: FIXTURE_TODAY });
  const resolved = resolveConflict(a, {
    conflictId: conflicts[0].id, state: 'dismissed', at: '2026-08-01', by: 'local:self', note: 'not a problem',
  });
  const next = reassertRetirements(resolved, new Map([[conflicts[0].id, '2026-08-13']]));
  assert.notEqual(next, resolved);
  assert.equal(next.resolutions[0].retiredAt, '2026-08-13');
  assert.equal(next.revision, resolved.revision + 1, '§2.2a: revision is content, and the content changed');
});

test('A-5: reassertRetirements changes NOTHING but resolutions[].retiredAt', () => {
  // §4.2 rule 5's carve-out is exactly one field. Field-by-field equality over the whole
  // document with `resolutions[].retiredAt` and `revision` excluded — a check that merely
  // skipped `resolutions` would let `state`, `by`, `at` or `note` drift through the hole.
  const a = europe2026().trip;
  const conflicts = detectConflicts(a, { today: FIXTURE_TODAY });
  let resolved = resolveConflict(a, {
    conflictId: conflicts[0].id, state: 'dismissed', at: '2026-08-01', by: 'local:self', note: 'not a problem',
  });
  resolved = resolveConflict(resolved, {
    conflictId: conflicts[1].id, state: 'acknowledged', at: '2026-08-02', by: 'user:marta',
  });
  const ledger = new Map([[conflicts[0].id, '2026-08-13']]);
  const next = reassertRetirements(resolved, ledger);

  const strip = (t: typeof a) => ({
    ...t,
    revision: 0,
    resolutions: t.resolutions.map((r) => ({ ...r, retiredAt: null })),
  });
  assert.deepEqual(strip(next), strip(resolved), 'a field other than resolutions[].retiredAt moved');
  assert.deepEqual(
    next.resolutions.map((r) => r.retiredAt),
    ['2026-08-13', null],
    'only the row the ledger has a key for may move, and only from null to the ledger value',
  );
  // The un-keyed row keeps every one of its own fields.
  assert.deepEqual(next.resolutions[1], resolved.resolutions[1]);
});

test('A-5: reassertRetirements never un-retires, and never overwrites an earlier date', () => {
  const a = europe2026().trip;
  const conflicts = detectConflicts(a, { today: FIXTURE_TODAY });
  const resolved = resolveConflict(a, {
    conflictId: conflicts[0].id, state: 'dismissed', at: '2026-08-01', by: 'local:self',
  });
  const retired = syncResolutions(resolved, [], '2026-08-13');
  const later = reassertRetirements(retired, new Map([[conflicts[0].id, '2026-08-20']]));
  assert.equal(later, retired, 'an already-retired row is untouched, whatever the ledger says');
  assert.equal(later.resolutions[0].retiredAt, '2026-08-13');
});

test('A-5: reassertRetirements is idempotent and converges in one pass', () => {
  const a = europe2026().trip;
  const conflicts = detectConflicts(a, { today: FIXTURE_TODAY });
  const resolved = resolveConflict(a, {
    conflictId: conflicts[0].id, state: 'dismissed', at: '2026-08-01', by: 'local:self',
  });
  const ledger = new Map([[conflicts[0].id, '2026-08-13']]);
  const once = reassertRetirements(resolved, ledger);
  assert.equal(reassertRetirements(once, ledger), once, 'a second pass must be a no-op — `set` cannot recurse');
});
