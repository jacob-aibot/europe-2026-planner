/**
 * `copyStopInto` and `attribution` (ARCHITECTURE §2.14) — the social primitive.
 *
 * Jacob's answer of 2026-08-25 reweighted the model: friends do not exchange whole trips,
 * they build their own itinerary and copy individual activities across. Whole-trip transfer
 * is not the primitive; one stop is.
 *
 * The rule this exists to make mechanical is `CLAUDE.md`'s oldest one — *never present my
 * suggestions as Jacob's plan* — so the tests below are written from the direction of "can
 * a copied stop ever render as his own work", not "does the copy succeed".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  acceptCandidate, addPlace, addStop, attribution, copyStopInto, createTrip, displayStatus,
  moveStop, needsBadge, removeStop, returnToPool, scheduleFromPool, sequentialIds, toJSON, fromJSON,
  updateStop, upsertBooking, validateTrip,
} from '../src/index.ts';
import type { BuildCtx, Stop, Trip } from '../src/index.ts';

const CTX = (prefix: string): BuildCtx => ({ ids: sequentialIds(prefix), now: '2026-08-25', actorUserId: 'user:jacob' });
const COPY_CTX = (prefix: string) => ({ ids: sequentialIds(prefix), today: '2026-08-25', actorUserId: 'user:jacob' });

/** Marta's trip: one stop that references a Place, has a booking and a bundled ticket. */
function martasTrip(): Trip {
  let t = createTrip(
    {
      id: 'trip-marta', title: 'Marta in Vienna', ownerId: 'user:marta',
      startDate: '2026-08-07', endDate: '2026-08-09',
      cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
    },
    CTX('m'),
  );
  t = addPlace(t, {
    id: 'place-naschmarkt', cityKey: 'vienna', name: 'Naschmarkt',
    at: { lat: 48.1974, lng: 16.3628 }, category: 'food', note: 'Saturday flea market',
  });
  t = upsertBooking(t, {
    id: 'bk-marta', tripId: 'trip-marta', kind: 'tour', operator: 'SomeTours', reference: 'MARTA123',
    startsAt: { date: '2026-08-08', time: '10:00' }, price: null, party: null, status: 'active',
    ticket: { kind: 'url', href: 'https://example.test/secret-token', label: 'Ticket', verifiedAt: null, verifiedBy: null },
    provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-08-01', acceptedAt: '2026-08-01', actorUserId: 'user:marta' },
  });
  t = addStop(
    t,
    { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    {
      id: 'stop-marta-1', name: 'Naschmarkt flea market', category: 'food',
      place: { kind: 'place', placeId: 'place-naschmarkt' },
      note: 'Go early', flags: ['free'], durationMins: 90,
      arrival: { mode: 'metro', mins: 12 }, travelRole: 'transfer',
      bookingId: 'bk-marta',
      ticket: { kind: 'url', href: 'https://example.test/secret-token', label: 'Ticket', verifiedAt: null, verifiedBy: null },
      cost: { amounts: [{ lo: 10, hi: 20, currency: 'EUR', basis: 'per_person' }], display: '€10–20' },
    },
    CTX('m2'),
  );
  return t;
}

function jacobsTrip(): Trip {
  return createTrip(
    {
      id: 'trip-jacob', title: 'Jacob in Vienna', ownerId: 'user:jacob',
      startDate: '2026-08-07', endDate: '2026-08-09',
      cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
    },
    CTX('j'),
  );
}

function copied(): { trip: Trip; stop: Stop } {
  const target = copyStopInto(
    jacobsTrip(),
    { trip: martasTrip(), stopId: 'stop-marta-1' },
    { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 },
    COPY_CTX('c'),
  );
  return { trip: target, stop: target.days.find((d) => d.id === '2026-08-08')!.stops[0] };
}

// ---------------------------------------------------------------------------
// The seven rules of §2.14
// ---------------------------------------------------------------------------

test('rule 1: a new id, always — ids never cross trips', () => {
  const { stop } = copied();
  assert.notEqual(stop.id, 'stop-marta-1');
  assert.match(stop.id, /^c/, 'the id must come from the injected IdFactory');
  assert.equal(stop.provenance.origin?.sourceStopId, 'stop-marta-1', 'the source id survives only inside origin');
});

test('rule 2: provenance is overwritten, never copied — the stop is badged from the instant it exists', () => {
  const { stop } = copied();
  assert.equal(stop.provenance.source, 'friend');
  assert.equal(stop.provenance.state, 'candidate');
  assert.equal(stop.provenance.acceptedAt, null);
  assert.equal(stop.provenance.addedAt, '2026-08-25');
  assert.equal(stop.provenance.actorUserId, 'user:jacob');
  assert.deepEqual(stop.provenance.origin, {
    friendUserId: 'user:marta', sourceTripId: 'trip-marta', sourceStopId: 'stop-marta-1',
  });
  assert.equal(displayStatus(stop), 'imported');
  assert.equal(needsBadge(stop), true);
});

test('rule 2: confidence is demoted — you do not hold their document', () => {
  const { stop } = copied();
  const source = martasTrip().days.find((d) => d.id === '2026-08-08')!.stops[0];
  assert.equal(source.provenance.confidence, 'confirmed');
  assert.notEqual(stop.provenance.confidence, 'confirmed');
  assert.ok(['asserted', 'inferred'].includes(stop.provenance.confidence));
});

test('rule 3: bookingId is dropped and no Ticket travels — a ticket URL is an access credential', () => {
  const { trip, stop } = copied();
  assert.equal(stop.bookingId, null);
  assert.equal(stop.ticket ?? null, null);
  assert.equal(trip.bookings.length, 0, "the friend's booking must not be adopted");
  assert.equal(JSON.stringify(trip).includes('secret-token'), false, 'a ticket credential reached the target trip');
  assert.equal(JSON.stringify(trip).includes('MARTA123'), false, 'a booking reference reached the target trip');
});

test('rule 3: cost is copied, with confidence demoted to inferred', () => {
  const { stop } = copied();
  assert.deepEqual(stop.cost?.amounts, [{ lo: 10, hi: 20, currency: 'EUR', basis: 'per_person' }]);
  assert.equal(stop.cost?.display, '€10–20');
});

test('rule 4: a referenced Place comes with it, new id, same provenance stamp', () => {
  const { trip, stop } = copied();
  assert.equal(stop.place.kind, 'place');
  const placeId = stop.place.kind === 'place' ? stop.place.placeId : '';
  assert.notEqual(placeId, 'place-naschmarkt', 'ids never cross trips');
  const place = trip.places.find((p) => p.id === placeId);
  assert.ok(place, 'the link must not dangle');
  assert.equal(place.name, 'Naschmarkt');
  assert.deepEqual(place.at, { lat: 48.1974, lng: 16.3628 });
  assert.deepEqual(validateTrip(trip).filter((i) => i.code === 'place_ref_dangling'), []);
});

test('rule 4: an existing place with the same name and coordinates in the same city is reused', () => {
  let target = jacobsTrip();
  target = addPlace(target, {
    id: 'place-jacob-nasch', cityKey: 'vienna', name: 'Naschmarkt',
    at: { lat: 48.1974, lng: 16.3628 }, category: 'food',
  });
  const after = copyStopInto(
    target, { trip: martasTrip(), stopId: 'stop-marta-1' },
    { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 }, COPY_CTX('c'),
  );
  assert.equal(after.places.length, 1, 'a duplicate place was created');
  const stop = after.days.find((d) => d.id === '2026-08-08')!.stops[0];
  assert.equal(stop.place.kind === 'place' ? stop.place.placeId : '', 'place-jacob-nasch');
});

test('rule 5: descriptions of a place and a journey copy verbatim', () => {
  const { stop } = copied();
  assert.equal(stop.name, 'Naschmarkt flea market');
  assert.equal(stop.note, 'Go early');
  assert.equal(stop.category, 'food');
  assert.deepEqual(stop.flags, ['free']);
  assert.equal(stop.durationMins, 90);
  assert.deepEqual(stop.arrival, { mode: 'metro', mins: 12 });
  assert.equal(stop.travelRole, 'transfer');
});

test('rule 6: accepting is a separate act, and it preserves origin', () => {
  const { trip, stop } = copied();
  const accepted = acceptCandidate(trip, { kind: 'stop', id: stop.id }, 'user:jacob', '2026-08-26');
  const after = accepted.days.find((d) => d.id === '2026-08-08')!.stops[0];
  assert.equal(after.provenance.state, 'accepted');
  assert.equal(after.provenance.acceptedAt, '2026-08-26');
  assert.equal(displayStatus(after), 'own', "the brief's 'until the user accepts it'");
  assert.ok(after.provenance.origin?.sourceTripId, 'origin was stripped by acceptance');
});

test('rule 7: credit survives acceptance — displayStatus governs the badge, attribution the credit', () => {
  const { trip, stop } = copied();
  assert.deepEqual(attribution(stop), {
    friendUserId: 'user:marta', sourceTripId: 'trip-marta', sourceStopId: 'stop-marta-1',
  });
  const accepted = acceptCandidate(trip, { kind: 'stop', id: stop.id }, 'user:jacob', '2026-08-26');
  const after = accepted.days.find((d) => d.id === '2026-08-08')!.stops[0];
  assert.equal(displayStatus(after), 'own');
  assert.deepEqual(attribution(after), {
    friendUserId: 'user:marta', sourceTripId: 'trip-marta', sourceStopId: 'stop-marta-1',
  });
});

test('attribution is null for anything the user made themselves', () => {
  const t = addStop(jacobsTrip(), { kind: 'scheduled', dayId: '2026-08-08', time: '09:00', order: 0 },
    { id: 'mine', name: 'Mine', category: 'sight' }, CTX('x'));
  assert.equal(attribution(t.days.find((d) => d.id === '2026-08-08')!.stops[0]), null);
});

// ---------------------------------------------------------------------------
// The invariant to attack (§2.14)
// ---------------------------------------------------------------------------

test('the §2.14 invariant: a credited record is never own unless the OWNER accepted it, with a timestamp', () => {
  const { trip, stop } = copied();
  const check = (t: Trip, label: string) => {
    for (const s of [...t.days.flatMap((d) => d.stops), ...t.pool]) {
      const a = attribution(s);
      if (!a) continue;
      if (displayStatus(s) === 'own') {
        assert.equal(s.provenance.state, 'accepted', `${label}: own without accepted`);
        assert.notEqual(s.provenance.acceptedAt, null, `${label}: own without acceptedAt`);
        assert.equal(s.provenance.actorUserId, t.ownerId, `${label}: own but accepted by somebody else`);
      }
      assert.ok(attribution(s), `${label}: attribution vanished`);
    }
  };

  check(trip, 'fresh copy');
  check(updateStop(trip, stop.id, { name: 'Renamed' }), 'after updateStop');
  check(moveStop(trip, stop.id, { kind: 'scheduled', dayId: '2026-08-09', time: '10:00', order: 0 }), 'after moveStop');
  const pooled = returnToPool(trip, stop.id);
  check(pooled, 'after returnToPool');
  check(scheduleFromPool(pooled, stop.id, { dayId: '2026-08-09', time: '10:00' }), 'after a pool round trip');
  check(fromJSON(toJSON(trip)), 'after a JSON round trip');
  const accepted = acceptCandidate(trip, { kind: 'stop', id: stop.id }, 'user:jacob', '2026-08-26');
  check(accepted, 'after acceptCandidate');
  check(fromJSON(toJSON(accepted)), 'after accept + JSON round trip');
});

test('acceptCandidate by somebody who is not the owner does not make it the owner\'s plan', () => {
  const { trip, stop } = copied();
  const accepted = acceptCandidate(trip, { kind: 'stop', id: stop.id }, 'user:someone-else', '2026-08-26');
  const after = accepted.days.find((d) => d.id === '2026-08-08')!.stops[0];
  assert.notEqual(after.provenance.actorUserId, trip.ownerId);
  assert.ok(attribution(after), 'credit must survive regardless of who accepted');
});

test('validateTrip emits origin_stripped when the credit link is removed by hand', () => {
  const { trip, stop } = copied();
  assert.deepEqual(validateTrip(trip).filter((i) => i.code === 'origin_stripped'), []);

  const stripped = {
    ...trip,
    days: trip.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) =>
        s.id === stop.id ? { ...s, provenance: { ...s.provenance, origin: undefined } } : s,
      ),
    })),
  };
  const issues = validateTrip(stripped).filter((i) => i.code === 'origin_stripped');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].level, 'error');
  assert.equal(issues[0].params.stopId ?? issues[0].ref.id, stop.id);
});

// ---------------------------------------------------------------------------
// The cases ROADMAP tells the tester to aim at
// ---------------------------------------------------------------------------

test('copying a stop that is ITSELF imported credits the trip it was copied FROM, not the chain', () => {
  const first = copied().trip;                      // jacob <- marta
  const firstStop = first.days.find((d) => d.id === '2026-08-08')!.stops[0];
  const third = createTrip(
    { id: 'trip-sam', title: 'Sam', ownerId: 'user:sam', startDate: '2026-08-07', endDate: '2026-08-09' },
    CTX('s'),
  );
  const after = copyStopInto(
    third, { trip: first, stopId: firstStop.id },
    { kind: 'scheduled', dayId: '2026-08-08', time: '12:00', order: 0 },
    { ids: sequentialIds('s2'), today: '2026-08-27', actorUserId: 'user:sam' },
  );
  const stop = after.days.find((d) => d.id === '2026-08-08')!.stops[0];
  assert.deepEqual(attribution(stop), {
    friendUserId: 'user:jacob',   // the trip it was copied FROM
    sourceTripId: 'trip-jacob',
    sourceStopId: firstStop.id,
  });
});

test('copying a stop from a trip into itself is a copy, not an alias', () => {
  const { trip, stop } = copied();
  const after = copyStopInto(
    trip, { trip, stopId: stop.id },
    { kind: 'scheduled', dayId: '2026-08-09', time: '09:00', order: 0 }, COPY_CTX('self'),
  );
  const clone = after.days.find((d) => d.id === '2026-08-09')!.stops[0];
  assert.notEqual(clone.id, stop.id);
  assert.equal(after.days.find((d) => d.id === '2026-08-08')!.stops.length, 1, 'the original moved');
  assert.deepEqual(validateTrip(after).filter((i) => i.code === 'duplicate_id'), []);
});

test('copying into the pool works and keeps the badge', () => {
  const after = copyStopInto(
    jacobsTrip(), { trip: martasTrip(), stopId: 'stop-marta-1' },
    { kind: 'pool', cityKey: 'vienna' }, COPY_CTX('p'),
  );
  assert.equal(after.pool.length, 1);
  assert.equal(displayStatus(after.pool[0]), 'imported');
  assert.ok(attribution(after.pool[0]));
});

test('copyStopInto is pure: neither trip is mutated', () => {
  const source = martasTrip();
  const target = jacobsTrip();
  const sourceBefore = toJSON(source);
  const targetBefore = toJSON(target);
  copyStopInto(target, { trip: source, stopId: 'stop-marta-1' },
    { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 }, COPY_CTX('q'));
  assert.equal(toJSON(source), sourceBefore);
  assert.equal(toJSON(target), targetBefore);
});

test('copyStopInto bumps the revision and throws on a missing stop or day', () => {
  const target = jacobsTrip();
  const source = martasTrip();
  const after = copyStopInto(target, { trip: source, stopId: 'stop-marta-1' },
    { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 }, COPY_CTX('r'));
  assert.equal(after.revision, target.revision + 1);
  assert.throws(() => copyStopInto(target, { trip: source, stopId: 'nope' },
    { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 }, COPY_CTX('r')), /no such stop/);
  assert.throws(() => copyStopInto(target, { trip: source, stopId: 'stop-marta-1' },
    { kind: 'scheduled', dayId: '2027-01-01', time: '11:00', order: 0 }, COPY_CTX('r')), /no such day/);
});

test('a removed copy leaves no orphan place behind that dangles anything', () => {
  const { trip, stop } = copied();
  const after = removeStop(trip, stop.id);
  assert.deepEqual(validateTrip(after).filter((i) => i.code === 'place_ref_dangling'), []);
});
