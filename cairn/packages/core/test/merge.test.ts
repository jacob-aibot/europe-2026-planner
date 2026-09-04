/**
 * `mergeTrips` — the "last-writer-wins per stop with a revision guard" half of
 * ARCHITECTURE §2.2's authority table.
 *
 * The revision guard (client, `store.save`) detects that storage moved under us. This is
 * what resolves it: a three-way merge keyed on entity id, so two tabs editing different
 * stops of the same trip both keep their edits, and two tabs editing the SAME stop resolve
 * to the last writer with the loss reported rather than silent.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  addParticipant, addStop, createTrip, mergeTrips, removeParticipant, removeStop, sequentialIds,
  setDayMeta, setTripMeta, updateParticipant, updateStop,
} from '../src/index.ts';
import type { BuildCtx, Trip } from '../src/index.ts';

const ctx = (prefix = 't'): BuildCtx => ({ ids: sequentialIds(prefix), now: '2026-08-01', actorUserId: 'local:self' });

function base(): Trip {
  let t = createTrip(
    {
      id: 'trip-1',
      title: 'Europe',
      startDate: '2026-08-07',
      endDate: '2026-08-09',
      cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
    },
    ctx(),
  );
  t = addStop(t, { kind: 'scheduled', dayId: '2026-08-07', time: '09:00', order: 0 }, { id: 'stop-a', name: 'A', category: 'sight' }, ctx());
  t = addStop(t, { kind: 'scheduled', dayId: '2026-08-08', time: '09:00', order: 0 }, { id: 'stop-b', name: 'B', category: 'sight' }, ctx());
  return t;
}

test('disjoint edits in two tabs both survive — this is the F-1 data loss', () => {
  const b = base();
  const local = updateStop(b, 'stop-a', { name: 'TAB A EDIT' });
  const remote = updateStop(b, 'stop-b', { name: 'TAB B EDIT' });

  const { trip, report } = mergeTrips(b, local, remote);
  assert.equal(trip.days[0].stops[0].name, 'TAB A EDIT');
  assert.equal(trip.days[1].stops[0].name, 'TAB B EDIT');
  assert.equal(report.overwritten.length, 0, 'nothing was lost, so nothing to report');
  assert.deepEqual(report.fromRemote, [{ entity: 'stop', id: 'stop-b' }]);
});

test('the merged revision is ahead of both sides, so the next guard compares against it', () => {
  const b = base();
  const local = updateStop(b, 'stop-a', { name: 'L' });
  const remote = setDayMeta(setDayMeta(b, '2026-08-09', { title: 'x' }), '2026-08-09', { title: 'y' });
  const { trip } = mergeTrips(b, local, remote);
  assert.ok(trip.revision > local.revision, `${trip.revision} <= ${local.revision}`);
  assert.ok(trip.revision > remote.revision, `${trip.revision} <= ${remote.revision}`);
});

test('the same stop edited on both sides resolves to the local writer AND is reported', () => {
  const b = base();
  const local = updateStop(b, 'stop-a', { name: 'MINE' });
  const remote = updateStop(b, 'stop-a', { name: 'THEIRS' });
  const { trip, report } = mergeTrips(b, local, remote);
  assert.equal(trip.days[0].stops[0].name, 'MINE');
  assert.deepEqual(report.overwritten, [{ entity: 'stop', id: 'stop-a' }]);
});

test('a stop added remotely appears; a stop added locally stays', () => {
  const b = base();
  const local = addStop(b, { kind: 'scheduled', dayId: '2026-08-07', time: '12:00', order: 1 }, { id: 'stop-l', name: 'L', category: 'food' }, ctx('l'));
  const remote = addStop(b, { kind: 'scheduled', dayId: '2026-08-07', time: '13:00', order: 1 }, { id: 'stop-r', name: 'R', category: 'food' }, ctx('r'));
  const { trip } = mergeTrips(b, local, remote);
  const ids = trip.days[0].stops.map((s) => s.id);
  assert.deepEqual(ids.slice().sort(), ['stop-a', 'stop-l', 'stop-r']);
  assert.deepEqual(trip.days[0].stops.map((s, i) => s.placement.kind === 'scheduled' && s.placement.order === i), [true, true, true]);
});

test('a remote delete of a stop the local side did not touch is honoured', () => {
  const b = base();
  const local = setDayMeta(b, '2026-08-07', { title: 'Day one' });
  const remote = removeStop(b, 'stop-a');
  const { trip, report } = mergeTrips(b, local, remote);
  assert.deepEqual(trip.days[0].stops.map((s) => s.id), []);
  assert.equal(trip.days[0].title, 'Day one');
  assert.deepEqual(report.fromRemote, [{ entity: 'stop', id: 'stop-a', field: 'deleted' }]);
});

test('a remote delete does NOT destroy a local edit to the same stop — an edit outranks a delete', () => {
  const b = base();
  const local = updateStop(b, 'stop-a', { name: 'still wanted' });
  const remote = removeStop(b, 'stop-a');
  const { trip, report } = mergeTrips(b, local, remote);
  assert.equal(trip.days[0].stops[0].name, 'still wanted');
  assert.deepEqual(report.overwritten, [{ entity: 'stop', id: 'stop-a', field: 'deleted_remotely' }]);
});

test('a local delete is honoured against an untouched remote', () => {
  const b = base();
  const local = removeStop(b, 'stop-a');
  const remote = setDayMeta(b, '2026-08-08', { title: 'Day two' });
  const { trip } = mergeTrips(b, local, remote);
  assert.deepEqual(trip.days[0].stops.map((s) => s.id), []);
  assert.equal(trip.days[1].title, 'Day two');
});

test('day-level prose and trip-level metadata merge field by field', () => {
  const b = base();
  const local = setDayMeta(b, '2026-08-07', { title: 'My title' });
  const remote = setTripMeta(setDayMeta(b, '2026-08-07', { subtitle: 'Their subtitle' }), { homeCurrency: 'GBP' }, ctx());
  const { trip } = mergeTrips(b, local, remote);
  assert.equal(trip.days[0].title, 'My title');
  assert.equal(trip.days[0].subtitle, 'Their subtitle');
  assert.equal(trip.homeCurrency, 'GBP');
  assert.equal(trip.title, 'Europe');
});

/**
 * QA P2-3. `datePrecision` is a trip-level scalar (§8.1) and it was missing from the field
 * list `mergeTrips` walks, so the other tab's change was neither merged nor reported — the
 * one failure mode §2.2 exists to prevent. `title` is the control: it was always on the list.
 */
test('QA P2-3: a remote-only datePrecision change survives a merge, alongside a local edit', () => {
  const b = base();
  const local = setTripMeta(b, { title: 'Renamed by tab B' }, ctx());
  const remote = setTripMeta(b, { datePrecision: 'month' }, ctx());
  const { trip, report } = mergeTrips(b, local, remote);
  assert.equal(trip.datePrecision, 'month', "tab A's precision change was discarded");
  assert.equal(trip.title, 'Renamed by tab B', "tab B's title change was discarded");
  assert.deepEqual(
    report.fromRemote.filter((n) => n.field === 'datePrecision'),
    [{ entity: 'trip', id: 'trip-1', field: 'datePrecision' }],
    'a field taken from the remote side is reported, like every other trip field',
  );
  assert.equal(report.overwritten.length, 0, 'nothing was lost, so nothing to report');
});

test('QA P2-3: and the reverse — a local datePrecision change survives a remote title edit', () => {
  const b = base();
  const local = setTripMeta(b, { datePrecision: 'year' }, ctx());
  const remote = setTripMeta(b, { title: 'Renamed by tab A' }, ctx());
  const { trip, report } = mergeTrips(b, local, remote);
  assert.equal(trip.datePrecision, 'year');
  assert.equal(trip.title, 'Renamed by tab A');
  assert.equal(report.overwritten.length, 0);
});

test('QA P2-3: both tabs changing datePrecision resolves to the local writer AND is reported', () => {
  const b = base();
  const local = setTripMeta(b, { datePrecision: 'month' }, ctx());
  const remote = setTripMeta(b, { datePrecision: 'year' }, ctx());
  const { trip, report } = mergeTrips(b, local, remote);
  assert.equal(trip.datePrecision, 'month', 'last writer wins, per §2.2');
  assert.deepEqual(report.overwritten, [{ entity: 'trip', id: 'trip-1', field: 'datePrecision' }]);
});

test('a day added by a remote date extension appears, and days stay dense and sorted', () => {
  const b = base();
  const local = updateStop(b, 'stop-a', { name: 'L' });
  const remote = setTripMeta(b, { endDate: '2026-08-11' }, ctx());
  const { trip } = mergeTrips(b, local, remote);
  assert.deepEqual(trip.days.map((d) => d.id), ['2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11']);
  assert.equal(trip.endDate, '2026-08-11');
  assert.equal(trip.days[0].stops[0].name, 'L');
});

test('pool, places, bookings and resolutions merge by id too', async () => {
  const { upsertBooking } = await import('../src/index.ts');
  // Off the surface in §2.10 revision 5; a test may import the module path. BUILD-NOTES KD-33.
  const { addPlace } = await import('../src/build/stops.ts');
  const { userProvenance } = await import('../src/model/provenance.ts');
  const b0 = base();
  const b1 = addStop(b0, { kind: 'pool', cityKey: 'vienna' }, { id: 'stop-p', name: 'Pooled', category: 'sight' }, ctx());
  const local = addPlace(b1, { id: 'place-l', cityKey: 'vienna', name: 'Local place', at: { lat: 48.2, lng: 16.3 }, category: 'sight' });
  const remote = upsertBooking(b1, {
    id: 'bk-r', tripId: 'trip-1', kind: 'tour', operator: 'Op', reference: 'R1',
    startsAt: { date: '2026-08-08', time: '10:00' }, price: null, party: null, status: 'active', ticket: null,
    provenance: userProvenance('2026-08-01', 'local:self'),
  });
  const { trip } = mergeTrips(b1, local, remote);
  assert.equal(trip.pool.length, 1);
  assert.ok(trip.places.some((p) => p.id === 'place-l'));
  assert.ok(trip.bookings.some((bk) => bk.id === 'bk-r'));
});

test('an acknowledgement made in one tab is not thrown away by the other tab\'s save', async () => {
  const { resolveConflict } = await import('../src/index.ts');
  const b = base();
  const remote = resolveConflict(b, {
    conflictId: 'impossible_transfer-deadbeef', state: 'acknowledged', at: '2026-08-02', by: 'local:self',
  });
  const local = updateStop(b, 'stop-a', { name: 'L' });
  const { trip } = mergeTrips(b, local, remote);
  assert.deepEqual(trip.resolutions.map((r) => r.conflictId), ['impossible_transfer-deadbeef']);
  assert.equal(trip.days[0].stops[0].name, 'L');
});

test('merging documents with different ids is a programmer error', () => {
  const b = base();
  const other = { ...b, id: 'trip-other' };
  assert.throws(() => mergeTrips(b, b, other), /same trip/);
});

test('merge is a no-op when neither side moved', () => {
  const b = base();
  const { trip, report } = mergeTrips(b, b, b);
  assert.deepEqual({ ...trip, revision: b.revision }, b);
  assert.equal(report.fromRemote.length, 0);
  assert.equal(report.overwritten.length, 0);
});

test('a stop moved to another day locally is not duplicated by the merge', async () => {
  const { moveStop } = await import('../src/index.ts');
  const b = base();
  const local = moveStop(b, 'stop-a', { kind: 'scheduled', dayId: '2026-08-09', time: '10:00', order: 0 });
  const remote = updateStop(b, 'stop-a', { note: 'remote note' });
  const { trip } = mergeTrips(b, local, remote);
  const where = trip.days.filter((d) => d.stops.some((s) => s.id === 'stop-a')).map((d) => d.id);
  assert.deepEqual(where, ['2026-08-09'], 'stop-a exists in exactly one day');
  assert.equal(trip.pool.some((s) => s.id === 'stop-a'), false);
});

// ------------------------------------------------------- participants (QA R52-1)
/**
 * `Trip.participants` (§8.3, Phase 2 I-9) is a record array, and a record array that is not
 * merged here is silently taken from `local` — QA **P2-3**'s finding, which the comment above
 * `out.photos` predicts in advance and which I-9 then walked into. These three tests are the
 * mechanical form of that comment: the other tab's addition, its edit and its deletion.
 */
function withZoe(): { b: Trip; zoe: string } {
  const b = addParticipant(base(), { displayName: 'Zoë' }, ctx('b'));
  return { b, zoe: b.participants[0].id };
}

test('R52-1: a participant added in the other tab survives the merge and is reported', () => {
  const { b } = withZoe();
  const local = addParticipant(b, { displayName: 'Jacob', kind: 'self' }, ctx('l'));
  const remote = addParticipant(b, { displayName: 'Zoë\'s mother' }, ctx('r'));

  const { trip, report } = mergeTrips(b, local, remote);
  assert.deepEqual(
    trip.participants.map((p) => p.displayName).sort(),
    ['Jacob', 'Zoë', 'Zoë\'s mother'],
    'the other tab\'s participant was discarded',
  );
  assert.deepEqual(
    report.fromRemote.filter((n) => n.entity === 'participant'),
    [{ entity: 'participant', id: 'rparticipant-1', field: 'added' }],
  );
});

test('R52-1: the other tab\'s edit to an existing participant survives the merge', () => {
  const { b, zoe } = withZoe();
  const local = addParticipant(b, { displayName: 'Jacob', kind: 'self' }, ctx('l'));
  const remote = updateParticipant(b, zoe, { note: 'drove the second leg' });

  const { trip, report } = mergeTrips(b, local, remote);
  assert.equal(trip.participants.find((p) => p.id === zoe)?.note, 'drove the second leg');
  assert.deepEqual(report.fromRemote.filter((n) => n.entity === 'participant'), [{ entity: 'participant', id: zoe }]);
});

test('R52-1: a participant removed in the other tab stays removed after a merge', () => {
  const { b, zoe } = withZoe();
  const local = addParticipant(b, { displayName: 'Jacob', kind: 'self' }, ctx('l'));
  const remote = removeParticipant(b, zoe);

  const { trip, report } = mergeTrips(b, local, remote);
  assert.equal(trip.participants.some((p) => p.id === zoe), false, 'the merge undid the other tab\'s deletion');
  assert.deepEqual(
    report.fromRemote.filter((n) => n.entity === 'participant'),
    [{ entity: 'participant', id: zoe, field: 'deleted' }],
  );
});

test('R52-1: both tabs renaming one participant is last-writer-wins AND reported, like every other record', () => {
  const { b, zoe } = withZoe();
  const local = updateParticipant(b, zoe, { displayName: 'MINE' });
  const remote = updateParticipant(b, zoe, { displayName: 'THEIRS' });

  const { trip, report } = mergeTrips(b, local, remote);
  assert.equal(trip.participants.find((p) => p.id === zoe)?.displayName, 'MINE');
  assert.deepEqual(report.overwritten.filter((n) => n.entity === 'participant'), [{ entity: 'participant', id: zoe }]);
});

test('R52-1: a Trip built before the field existed merges as an empty list, as photos does', () => {
  const { b } = withZoe();
  const stripped = { ...b } as unknown as Record<string, unknown>;
  delete stripped.participants;
  const legacy = stripped as unknown as Trip;
  const { trip } = mergeTrips(legacy, legacy, legacy);
  assert.deepEqual(trip.participants, []);
});
