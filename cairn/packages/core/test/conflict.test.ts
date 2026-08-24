/**
 * Conflicts (ARCHITECTURE §2.7). The named fixture cases are asserted individually rather
 * than only as a snapshot, because a snapshot that silently loses a rule still passes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { europe2026, FIXTURE_TODAY, golden } from './fixture.ts';
import {
  detectConflicts, resolveConflict, updateStop, RULES, sequentialIds, createTrip, addStop,
  upsertBooking, linkBooking, LOCAL_OWNER,
} from '../src/index.ts';
import type { Booking, BuildCtx } from '../src/index.ts';

const ctx = (): BuildCtx => ({ ids: sequentialIds('t'), now: '2026-01-01', actorUserId: LOCAL_OWNER });

test('the golden conflict list is reproduced exactly', () => {
  const { trip } = europe2026();
  const g = golden<{ conflicts: Array<{ id: string; ruleId: string; severity: string; summary: string }> }>('core-conflicts.json');
  const actual = detectConflicts(trip, { today: FIXTURE_TODAY });
  assert.equal(actual.length, g.conflicts.length);
  for (let i = 0; i < actual.length; i++) {
    assert.equal(actual[i].id, g.conflicts[i].id, `conflict ${i} id`);
    assert.equal(actual[i].ruleId, g.conflicts[i].ruleId, `conflict ${i} rule`);
    assert.equal(actual[i].severity, g.conflicts[i].severity, `conflict ${i} severity`);
    assert.equal(actual[i].summary, g.conflicts[i].summary, `conflict ${i} summary`);
  }
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

test('impossible_transfer catches the Aug 18 05:30 airport bus', () => {
  const { trip } = europe2026();
  const fired = detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'impossible_transfer');
  const aug18 = fired.find((c) => c.params.dayId === '2026-08-18');
  assert.ok(aug18, 'the named fixture case must fire');
  assert.equal(aug18.params.legMins, 40);
  assert.equal(aug18.params.gapMins, 30);
  assert.equal(aug18.severity, 'blocker');
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

test('geo_outlier fires on a ±1° latitude typo — the Fisherman\'s Bastion class', () => {
  const { trip } = europe2026();
  const day = trip.days.find((d) => d.id === '2026-08-19')!;
  const stop = day.stops.find((s) => s.name.startsWith('Széchenyi'))!;
  const before = detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier').length;
  const broken = updateStop(trip, stop.id, { place: { kind: 'inline', at: { lat: 48.5025, lng: 19.0819 } } });
  const after = detectConflicts(broken, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier');
  assert.equal(after.length, before + 1);
  assert.ok(after.some((c) => String(c.params.stopName).startsWith('Széchenyi')));
  assert.equal(after.find((c) => String(c.params.stopName).startsWith('Széchenyi'))?.severity, 'blocker');
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

test('closed fires only when the place has hours that say so', () => {
  const { trip } = europe2026();
  assert.equal(detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'closed').length, 0);
  // Naschmarkt's flea market ends at 14:00; schedule a stop against it at 15:50.
  const place = { id: 'place-naschmarkt', cityKey: 'vienna', name: 'Naschmarkt flea market', at: { lat: 48.1974, lng: 16.3628 }, category: 'sight' as const, hours: { weekly: [null, null, null, null, null, null, { day: 6, open: '06:00', close: '14:00' }] } };
  const withPlace = { ...trip, places: [...trip.places, place] };
  const day = withPlace.days.find((d) => d.id === '2026-08-08')!; // a Saturday
  const target = day.stops[day.stops.length - 1];
  const scheduled = updateStop({ ...withPlace }, target.id, { place: { kind: 'place', placeId: place.id }, time: '15:50' });
  const fired = detectConflicts(scheduled, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'closed');
  assert.equal(fired.length, 1);
  assert.equal(fired[0].params.close, '14:00');
});

test('conflict ids are stable across a no-op re-import and change when the Aug 18 flight time is edited', () => {
  const a = europe2026().trip;
  const before = detectConflicts(a, { today: FIXTURE_TODAY });
  const again = detectConflicts(a, { today: FIXTURE_TODAY });
  assert.deepEqual(again.map((c) => c.id), before.map((c) => c.id));

  const day = a.days.find((d) => d.id === '2026-08-18')!;
  const flight = day.stops.find((s) => s.name.startsWith('Ryanair PRG'))!;
  const edited = updateStop(a, flight.id, { time: '19:30' });
  const after = detectConflicts(edited, { today: FIXTURE_TODAY });
  const transferIdsBefore = before.filter((c) => c.ruleId === 'impossible_transfer' && c.params.dayId === '2026-08-18').map((c) => c.id);
  const transferIdsAfter = after.filter((c) => c.ruleId === 'impossible_transfer' && c.params.dayId === '2026-08-18').map((c) => c.id);
  assert.notDeepEqual(transferIdsAfter, transferIdsBefore, 'a time change must not carry an acknowledgement over');
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
