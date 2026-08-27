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
  acceptCandidate, addStop, attribution, copyStopInto, createTrip, displayStatus,
  moveStop, rejectCandidate, removeStop, returnToPool, scheduleFromPool, sequentialIds,
  toJSON, fromJSON,
  updateStop, upsertBooking, validateTrip,
} from '../src/index.ts';
import { detectConflicts } from '../src/index.ts';
// Internals of public functions, off the surface in §2.10 revision 5. BUILD-NOTES KD-33.
import { addPlace } from '../src/build/stops.ts';
import { needsBadge } from '../src/derive/display.ts';
import { resolvePlaceLink } from '../src/derive/geo.ts';
import type { BuildCtx, LatLng, Place, Stop, Trip } from '../src/index.ts';
import { redactionHits } from '../src/index.ts';
import { europe2026 } from './fixture.ts';

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

test('rule 5 amended: a credential in the note does not survive the copy (QA round 2, the note-field leak)', () => {
  // The exact shape the tester found live: rule 3 already drops `bookingId` and the
  // `Ticket` because a reference and a URL are credentials — this is the same class of
  // information sitting in prose instead of a structured field.
  const t = jacobsTrip();
  const withMarta = (() => {
    let m = martasTrip();
    m = updateStop(m, 'stop-marta-1', { note: 'Check in — Habyt Vienna: booked, conf 5814731574, PIN 0754, 2 nights' });
    return m;
  })();
  const target = copyStopInto(
    t,
    { trip: withMarta, stopId: 'stop-marta-1' },
    { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 },
    COPY_CTX('c2'),
  );
  const stop = target.days.find((d) => d.id === '2026-08-08')!.stops[0];
  assert.doesNotMatch(stop.note ?? '', /5814731574/, 'the booking confirmation must not cross the trip boundary');
  assert.doesNotMatch(stop.note ?? '', /\b0754\b/, 'the door PIN must not cross the trip boundary');
  assert.match(stop.note ?? '', /\[redacted\]/, 'redaction should be visible, not a silently emptied note');
  // Ordinary prose is untouched — this is a credential filter, not a note-stripper.
  assert.match(stop.note ?? '', /Check in — Habyt Vienna/);
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

// ---------------------------------------------------------------------------
// The R2-11 ruling (ARCHITECTURE revision 4, §2.14 + §2.9; ROADMAP Phase 1 §D).
//
// §2.14's invariant — a credited record is never `'own'` unless the accepter is a member of
// the trip — was stated and enforced nowhere. It is enforced in exactly two places, and
// `displayStatus` is deliberately not one of them: it is a pure function of one `Provenance`,
// cannot see the trip, and must not learn to.
//
//   1. the CALL throws: `acceptCandidate` / `rejectCandidate` / `copyStopInto` refuse a
//      missing actor, because an acceptance with no accepter is unfalsifiable forever after;
//   2. the DOCUMENT is an error: `validateTrip`'s `accepted_by_non_member`, because a wrong
//      actor arrives inside a document (a restored backup, a hand-edited record, a Phase 2
//      sync) and throwing there means an unopenable trip.
// ---------------------------------------------------------------------------

/** The three values §D names, over the full ref matrix. */
const MISSING_ACTORS: Array<[string, unknown]> = [
  ['null', null],
  ['undefined', undefined],
  ["the empty string", ''],
];

function tripWithEveryRefKind(): Trip {
  const { trip, stop } = copied();
  return upsertBooking(trip, {
    id: 'bk-jacob', tripId: trip.id, kind: 'tour', operator: 'Tours', reference: 'X1',
    startsAt: { date: '2026-08-08', time: '10:00' }, price: null, party: null, status: 'active',
    ticket: null,
    provenance: {
      source: 'friend', state: 'candidate', confidence: 'asserted',
      origin: { friendUserId: 'user:marta', sourceTripId: 'trip-marta', sourceStopId: stop.id },
      addedAt: '2026-08-25', acceptedAt: null, actorUserId: 'user:jacob',
    },
  });
}

test('R2-11: acceptCandidate and rejectCandidate throw on a missing actor, over the full ref matrix', () => {
  const base = tripWithEveryRefKind();
  const stopId = base.days.find((d) => d.id === '2026-08-08')!.stops[0].id;
  const refs = [
    { kind: 'stop' as const, id: stopId },
    { kind: 'day' as const, id: '2026-08-08' },
    { kind: 'booking' as const, id: 'bk-jacob' },
  ];
  const before = toJSON(base);

  for (const ref of refs) {
    for (const [label, actor] of MISSING_ACTORS) {
      for (const [name, fn] of [['acceptCandidate', acceptCandidate], ['rejectCandidate', rejectCandidate]] as const) {
        assert.throws(
          () => fn(base, ref, actor as string, '2026-08-26'),
          /actor/i,
          `${name}(${ref.kind}) accepted ${label} as an actor`,
        );
        // The ceiling: no partially-mutated document behind the exception.
        assert.equal(toJSON(base), before, `${name}(${ref.kind}) mutated the trip before throwing (${label})`);
      }
    }
  }
  assert.equal(base.revision, fromJSON(before).revision, 'revision moved behind a throw');
});

test('R2-11: copyStopInto throws on a missing actor — the type was already right and R2-11 went straight through it', () => {
  const target = jacobsTrip();
  const source = martasTrip();
  const before = toJSON(target);
  for (const [label, actor] of MISSING_ACTORS) {
    assert.throws(
      () => copyStopInto(
        target,
        { trip: source, stopId: 'stop-marta-1' },
        { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 },
        { ids: sequentialIds('z'), today: '2026-08-25', actorUserId: actor as string },
      ),
      /actor/i,
      `copyStopInto accepted ${label} as an actor`,
    );
    assert.equal(toJSON(target), before, `copyStopInto mutated the target before throwing (${label})`);
  }
  assert.equal(target.revision, fromJSON(before).revision, 'revision moved behind a throw');
});

test('R2-11 injected fault: an accepted, credited record whose actor is not a member is an error', () => {
  // ROADMAP §D, near-verbatim: "Hand-build a stop with source:'friend', a valid origin,
  // state:'accepted', acceptedAt set, and actorUserId:'user:someone-else', on a trip with
  // ownerId:'local:self'."
  const clean = { ...copied().trip, ownerId: 'local:self' };
  const stopId = clean.days.find((d) => d.id === '2026-08-08')!.stops[0].id;
  const baseline = validateTrip(clean);
  assert.deepEqual(
    baseline.filter((i) => i.code === 'accepted_by_non_member'),
    [],
    'the unfaulted trip already reports the fault',
  );

  const faulted: Trip = {
    ...clean,
    days: clean.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) =>
        s.id === stopId
          ? {
              ...s,
              provenance: {
                ...s.provenance,
                source: 'friend' as const,
                state: 'accepted' as const,
                acceptedAt: '2026-08-26',
                actorUserId: 'user:someone-else',
              },
            }
          : s,
      ),
    })),
  };

  const issues = validateTrip(faulted);
  const added = issues.filter((i) => !baseline.some((b) => b.code === i.code && b.ref.id === i.ref.id));
  assert.equal(added.length, 1, `expected exactly one additional issue, got ${added.map((i) => i.code).join(', ')}`);
  const issue = added[0];
  assert.equal(issue.code, 'accepted_by_non_member');
  assert.equal(issue.level, 'error');
  assert.deepEqual(issue.ref, { kind: 'stop', id: stopId });
  assert.equal(issue.params.actorUserId, 'user:someone-else');
  assert.equal(issue.params.ownerId, 'local:self');

  // `displayStatus` still says 'own' — on purpose. It is a pure function of one Provenance,
  // it cannot see the trip, and the invariant is a claim about which DOCUMENTS may exist.
  const faultedStop = faulted.days.find((d) => d.id === '2026-08-08')!.stops[0];
  assert.equal(displayStatus(faultedStop), 'own');
  assert.ok(attribution(faultedStop), 'the credit must still be there');
});

test('R2-11: the owner accepting is not an error, and a day or a booking is checked the same way', () => {
  const clean = { ...tripWithEveryRefKind(), ownerId: 'user:jacob' };
  const accepted = acceptCandidate(clean, { kind: 'booking', id: 'bk-jacob' }, 'user:jacob', '2026-08-26');
  assert.deepEqual(validateTrip(accepted).filter((i) => i.code === 'accepted_by_non_member'), []);

  const byStranger = acceptCandidate(clean, { kind: 'booking', id: 'bk-jacob' }, 'user:someone-else', '2026-08-26');
  const issues = validateTrip(byStranger).filter((i) => i.code === 'accepted_by_non_member');
  assert.equal(issues.length, 1);
  assert.deepEqual(issues[0].ref, { kind: 'booking', id: 'bk-jacob' });
});

test('R2-11 ceiling: the new rule adds nothing to the unmodified reference trip', () => {
  // ROADMAP §D: "zero additional issues on the unmodified reference trip — source:'user'
  // records with actorUserId:null are outside the rule's subject by design (§2.14) and a run
  // in which the reference trip's issue count moves at all fails."
  const { trip } = europe2026();
  const issues = validateTrip(trip);
  assert.deepEqual(issues.filter((i) => i.code === 'accepted_by_non_member'), []);

  // The reference trip is full of accepted rows, so the ceiling is not vacuous.
  const accepted = [...trip.days, ...trip.days.flatMap((d) => d.stops), ...trip.pool, ...trip.bookings]
    .filter((x) => x.provenance?.state === 'accepted');
  assert.ok(accepted.length > 100, 'the reference trip no longer carries accepted records');
  assert.deepEqual(accepted.filter((x) => attribution(x)), [],
    'a credited record appeared in the reference trip — the ceiling is now measuring something else');
});

test('R2-11: a source:user record with a null actor is outside the rule by design (§2.14)', () => {
  // §2.14, "Explicitly out of scope in Phase 1, named rather than left silent": those records
  // assert no acceptance of anyone ELSE's content, `attribution()` on them is null, and that
  // is what puts them outside the invariant's subject. Phase 2's `BuildCtx.actorUserId`
  // becoming required is the trigger that changes this, not a later reinterpretation.
  const trip = jacobsTrip();
  const withNullActor: Trip = {
    ...trip,
    days: trip.days.map((d) => ({
      ...d,
      provenance: { ...d.provenance, source: 'user' as const, state: 'accepted' as const, actorUserId: null },
    })),
  };
  assert.deepEqual(validateTrip(withNullActor).filter((i) => i.code === 'accepted_by_non_member'), []);
});

// ---------------------------------------------------------------------------
// QA R5-2 — `accepted_by_non_member` exempted a MISSING actor as well as a wrong one.
//
// §2.9's predicate has three conjuncts: a non-null `attribution()`, `state === 'accepted'`,
// and an `actorUserId` that is **not a member of the trip**. `null`, `undefined` and `''` are
// members of nothing, so all three shapes satisfy it — and the implementation's `!actor`
// short-circuit added an unstated fourth conjunct ("the actor must be truthy") that let an
// "accepted by nobody" credited record validate clean and render as the user's own plan.
//
// The exemption §2.14 *does* state is scoped by `attribution()`, not by nullness — which is
// what the `source:'user'` test above holds down, and it must keep passing.
// ---------------------------------------------------------------------------

/** A trip with one credited, accepted stop whose actor is whatever the caller passes. */
function faultedWithActor(actor: unknown): { trip: Trip; stopId: string } {
  const clean = { ...copied().trip, ownerId: 'local:self' };
  const stopId = clean.days.find((d) => d.id === '2026-08-08')!.stops[0].id;
  const trip: Trip = {
    ...clean,
    days: clean.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) =>
        s.id === stopId
          ? {
              ...s,
              provenance: {
                ...s.provenance,
                source: 'friend' as const,
                state: 'accepted' as const,
                acceptedAt: '2026-08-26',
                actorUserId: actor as string | null,
              },
            }
          : s,
      ),
    })),
  };
  return { trip, stopId };
}

test('R5-2: an accepted, credited record with NO actor is an error, for all three missing shapes', () => {
  for (const [label, actor] of MISSING_ACTORS) {
    const { trip, stopId } = faultedWithActor(actor);
    const stop = trip.days.find((d) => d.id === '2026-08-08')!.stops.find((s) => s.id === stopId)!;
    // The shape really is the rule's subject: credited, and rendering as the user's own.
    assert.ok(attribution(stop), `${label}: the fixture is not credited, so the test proves nothing`);
    assert.equal(displayStatus(stop), 'own', `${label}: the fixture does not render as 'own'`);

    const issues = validateTrip(trip).filter((i) => i.code === 'accepted_by_non_member');
    assert.equal(issues.length, 1, `actorUserId=${label} was not flagged (${issues.length} issues)`);
    assert.equal(issues[0].level, 'error');
    assert.deepEqual(issues[0].ref, { kind: 'stop', id: stopId });
    // §2.1: structured params beside the string, and `params` is Record<string, string|number>
    // — a `null` actor must not leak through as a non-string.
    assert.equal(typeof issues[0].params.actorUserId, 'string', `${label}: params.actorUserId is not a string`);
    assert.equal(issues[0].params.actorUserId, '');
    assert.equal(issues[0].params.ownerId, 'local:self');
    assert.equal(issues[0].params.tripId, trip.id);
    assert.doesNotMatch(issues[0].message, /null|undefined/, `${label}: the message reads "${issues[0].message}"`);
  }
});

test('R5-2: a real non-member string is still flagged, and the trip OWNER is still not', () => {
  const stranger = faultedWithActor('user:someone-else');
  const strangerIssues = validateTrip(stranger.trip).filter((i) => i.code === 'accepted_by_non_member');
  assert.equal(strangerIssues.length, 1);
  assert.equal(strangerIssues[0].params.actorUserId, 'user:someone-else');
  assert.match(strangerIssues[0].message, /user:someone-else/);

  const owner = faultedWithActor('local:self');
  assert.deepEqual(
    validateTrip(owner.trip).filter((i) => i.code === 'accepted_by_non_member'),
    [],
    'the trip owner accepting a credited record is legitimate and must never be flagged',
  );
});

// ---------------------------------------------------------------------------
// A-14 (ARCHITECTURE revision 12, QA R13-6) — a `CityKey` is trip-relative filing, so it
// may not cross a trip boundary.
//
// Rule 4 used to copy the referenced `Place` with `{...original, id: newId('place')}`, which
// carried the SOURCE trip's minted key into the target. After A-10 two independently created
// trips can never share a key, so every cross-trip copy of a place-linked stop left the
// recipient reporting `unknown_city_key` (an error nothing in the UI can clear) — and the
// reuse branch, which compares `cityKey` first, could never match across trips either.
//
// A-14's three-step decision: find the source's city, re-file by normalised name, or the
// place does not travel and the stop keeps the raw coordinate.
// ---------------------------------------------------------------------------

const VIENNA = { lat: 48.2082, lng: 16.3738 };
const BELVEDERE = { lat: 48.1915, lng: 16.3806 };
const SPLIT = { lat: 43.5081, lng: 16.4402 };
const BLUE_CAVE = { lat: 43.0072, lng: 16.0403 };
const PRAGUE = { lat: 50.0755, lng: 14.4378 };

type CitySpec = { name: string; centre: LatLng; order?: number };

/** A trip whose city keys are MINTED — which is every trip the product creates (A-10). */
function mintedTrip(id: string, ownerId: string, prefix: string, cities: CitySpec[]): Trip {
  return createTrip(
    { id, title: id, ownerId, startDate: '2026-08-07', endDate: '2026-08-09', cities },
    CTX(prefix),
  );
}

/** A source trip: one city, one curated `Place` filed under it, one stop linked to that place. */
function sourceWithPlace(city: CitySpec, place: { name: string; at: LatLng | null }): Trip {
  let t = mintedTrip('trip-src', 'user:marta', 'src', [city]);
  t = addPlace(t, {
    id: 'p-src', cityKey: t.cities[0].key, name: place.name, at: place.at,
    category: 'sight', note: 'the curated record',
  });
  t = addStop(
    t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: place.name, category: 'sight', place: { kind: 'place', placeId: 'p-src' } },
    CTX('srcs'),
  );
  return t;
}

const copyAcross = (target: Trip, source: Trip, prefix = 'x'): Trip =>
  copyStopInto(
    target, { trip: source, stopId: 's-src' },
    { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 }, COPY_CTX(prefix),
  );

const copiedStop = (t: Trip): Stop => t.days.find((d) => d.id === '2026-08-08')!.stops[0];

test('A-14 step 2: a cross-trip copy re-files the place under the TARGET trip\'s key', () => {
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  assert.notEqual(source.cities[0].key, target.cities[0].key, 'the fixture is not testing minted keys');

  const after = copyAcross(target, source);
  assert.equal(after.places.length, 1, 'the place should travel');
  assert.equal(after.places[0].cityKey, target.cities[0].key);
  assert.equal(after.places[0].name, 'Belvedere');
  assert.deepEqual(after.places[0].at, BELVEDERE);
  assert.equal(after.places[0].note, 'the curated record', 'step 2 carries the whole record but the filing');
  assert.notEqual(after.places[0].id, 'p-src', 'rule 1: ids never cross trips');
  assert.deepEqual(validateTrip(after).filter((i) => i.code === 'unknown_city_key'), []);
  assert.deepEqual(after.cities, target.cities, 'no city may be minted into the target by a copy');
});

test('A-14 step 2: the name match is normalised — case, whitespace and NFC', () => {
  for (const targetName of ['  vienna ', 'VIENNA', 'Wień'.normalize('NFD')]) {
    const sourceName = targetName === 'Wień'.normalize('NFD') ? 'Wień'.normalize('NFC') : 'Vienna';
    const source = sourceWithPlace({ name: sourceName, centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
    const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: targetName, centre: VIENNA }]);
    const after = copyAcross(target, source);
    assert.equal(after.places.length, 1, `${JSON.stringify(targetName)}: the place did not travel`);
    assert.equal(after.places[0].cityKey, target.cities[0].key, `${JSON.stringify(targetName)}: wrong filing`);
  }
});

test('A-14 assertion 2: reuse across trips is restored — an equivalent place is not duplicated', () => {
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  let target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  target = addPlace(target, {
    id: 'p-tgt', cityKey: target.cities[0].key, name: 'belvedere', at: BELVEDERE, category: 'sight',
  });
  const after = copyAcross(target, source);
  assert.equal(after.places.length, 1, 'the copy duplicated a place the target already had');
  const stop = copiedStop(after);
  assert.equal(stop.place.kind === 'place' ? stop.place.placeId : '', 'p-tgt');
  assert.deepEqual(validateTrip(after).filter((i) => i.code === 'unknown_city_key'), []);
});

test('A-14 assertion 3: no city of that name in the target — the place does not travel, the coordinate does', () => {
  const source = sourceWithPlace({ name: 'Split', centre: SPLIT }, { name: 'Blue Cave, Biševo', at: BLUE_CAVE });
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Prague', centre: PRAGUE }]);
  const before = validateTrip(target);
  const beforeGeo = detectConflicts(target, { today: '2026-08-01' }).filter((c) => c.ruleId === 'geo_outlier');

  const after = copyAcross(target, source);
  assert.equal(after.places.length, 0, 'a place was filed under a city this trip does not have');
  assert.deepEqual(after.cities, target.cities);

  const stop = copiedStop(after);
  assert.equal(stop.place.kind, 'inline');
  assert.deepEqual(stop.place.kind === 'inline' ? stop.place.at : null, BLUE_CAVE);
  assert.deepEqual(resolvePlaceLink(stop.place, after.places), BLUE_CAVE, 'the stop must still pin on a map');
  assert.equal(stop.name, 'Blue Cave, Biševo', 'rule 5 still copies the stop\'s own fields');

  const issues = validateTrip(after);
  for (const code of ['unknown_city_key', 'place_ref_dangling'] as const) {
    assert.deepEqual(
      issues.filter((i) => i.code === code).length, before.filter((i) => i.code === code).length,
      `step 3 added a ${code}`,
    );
  }
  const afterGeo = detectConflicts(after, { today: '2026-08-01' }).filter((c) => c.ruleId === 'geo_outlier');
  assert.equal(afterGeo.length, beforeGeo.length, 'step 3 published a geo_outlier');
});

test('A-14 assertion 3: a source place with at:null yields {kind:\'none\'} and no dangling ref', () => {
  const source = sourceWithPlace({ name: 'Split', centre: SPLIT }, { name: 'Windsor Great Park', at: null });
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Prague', centre: PRAGUE }]);
  const after = copyAcross(target, source);
  assert.equal(after.places.length, 0);
  assert.equal(copiedStop(after).place.kind, 'none');
  assert.deepEqual(validateTrip(after).filter((i) => i.code === 'place_ref_dangling'), []);
  assert.deepEqual(validateTrip(after).filter((i) => i.code === 'unknown_city_key'), []);
});

test('A-14 assertion 5: a blank source city name never matches a blank target city name', () => {
  const source = sourceWithPlace({ name: '   ', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: '', centre: VIENNA }]);
  const after = copyAcross(target, source);
  assert.equal(after.places.length, 0, 'two blank names matched — a blank name is not an identity');
  assert.equal(copiedStop(after).place.kind, 'inline');
});

test('A-14 step 1: a source place filed under a city the SOURCE does not have takes step 3', () => {
  let source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  source = { ...source, places: source.places.map((p) => ({ ...p, cityKey: 'nowhere' })) };
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  const after = copyAcross(target, source);
  assert.equal(after.places.length, 0, 'a key the source itself cannot resolve must not be re-filed by guess');
  assert.equal(copiedStop(after).place.kind, 'inline');
  assert.deepEqual(validateTrip(after).filter((i) => i.code === 'unknown_city_key'), []);
});

test('A-14 assertion 4: two same-named cities in the target re-file onto the lower order', () => {
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [
    { name: 'Vienna', centre: VIENNA, order: 5 },
    { name: 'Vienna', centre: VIENNA, order: 1 },
  ]);
  const after = copyAcross(target, source);
  assert.equal(after.places[0].cityKey, target.cities[1].key, 'the lower `order` wins, not document position');

  // Tie on `order`: the earliest in `target.cities` wins, so the result is still deterministic.
  const tied = mintedTrip('trip-tie', 'user:jacob', 'tie', [
    { name: 'Vienna', centre: VIENNA, order: 3 },
    { name: 'Vienna', centre: VIENNA, order: 3 },
  ]);
  assert.equal(copyAcross(tied, source).places[0].cityKey, tied.cities[0].key);
});

test('A-14 assertion 4: the same copy run twice on the same inputs is byte-identical', () => {
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  assert.equal(toJSON(copyAcross(target, source, 'd1')), toJSON(copyAcross(target, source, 'd1')));
});

test('A-14: copying within one trip is unchanged — the source city resolves to itself and the place is reused', () => {
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  const after = copyStopInto(
    source, { trip: source, stopId: 's-src' },
    { kind: 'scheduled', dayId: '2026-08-09', time: '09:00', order: 0 }, COPY_CTX('self2'),
  );
  assert.equal(after.places.length, 1, 'a same-trip copy duplicated the place');
  assert.equal(after.places[0].id, 'p-src');
  assert.equal(after.places[0].cityKey, source.cities[0].key);
  const clone = after.days.find((d) => d.id === '2026-08-09')!.stops[0];
  assert.equal(clone.place.kind === 'place' ? clone.place.placeId : '', 'p-src');
});

// ---------------------------------------------------------------------------
// A-15 (ARCHITECTURE revision 13, QA R14-4) — a copied `Place` crosses a person boundary, so
// §6.6 applies to it.
//
// Rule 4 built the copied place as `{...refiled, id: newId('place')}` and rule 5, two lines
// later, ran the copied STOP's note through `redactText`. The place's own `note` and `links`
// went through nothing, so a door PIN, a confirmation number, a mailbox address and a vendor
// voucher URL all arrived intact in the recipient's document — the unfixed half of round 2's
// BLOCKER R2-3, whose own text named `Place.note` and `Place.links`.
//
// The direction is the point: §6.6's sample path fails CLOSED (redact every string but the
// structural ones) and the copy path failed OPEN (enumerate fields; a field nobody enumerated
// travels verbatim). `placeForCopy` enumerates all eight, and the key-set test below is the
// mechanical stop that makes a ninth field fail until it is classified.
// ---------------------------------------------------------------------------

/** The credential shapes §6.6 classifies, in one place note and one place link. */
const CREDENTIAL_NOTE = 'Front door PIN 0754, conf 5814731574 - ask for jacob@example.com';
const CREDENTIAL_HREF = 'https://vendor.example/booking/GYGG45MLA9Q9';
const CREDENTIALS = ['0754', '5814731574', 'GYGG45MLA9Q9', 'jacob@example.com'];

/**
 * Every field `Place` has, as a compile-time exhaustive map. A ninth field added to `Place`
 * fails `npm run typecheck` here — which is the cheapest available form of §6.6's *"redacted
 * by default rather than leaking by default"* inside a typed record — and then fails the
 * key-set test below until it is classified in `placeForCopy`'s table.
 */
const PLACE_FIELDS: Record<keyof Place, true> = {
  id: true, cityKey: true, name: true, at: true, category: true, note: true, links: true, hours: true,
};

/** What A-15's table says may cross: everything but `links`, which is dropped. */
const PLACE_FIELDS_THAT_CROSS = ['id', 'cityKey', 'name', 'at', 'category', 'note', 'hours'];

/** A source trip whose one `Place` carries every optional field populated. */
function sourceWithFullPlace(note: string, hoursNote?: string): Trip {
  let t = mintedTrip('trip-src', 'user:marta', 'src', [{ name: 'Vienna', centre: VIENNA }]);
  t = addPlace(t, {
    id: 'p-src', cityKey: t.cities[0].key, name: 'Habyt Vienna', at: BELVEDERE, category: 'stay',
    note,
    links: [{ label: 'Voucher', href: CREDENTIAL_HREF }],
    hours: {
      weekly: [null, { day: 1, open: '09:00', close: '17:00' }],
      ...(hoursNote === undefined ? {} : { note: hoursNote }),
    },
  });
  t = addStop(
    t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Check in', category: 'stay', place: { kind: 'place', placeId: 'p-src' } },
    CTX('srcf'),
  );
  return t;
}

test('A-15: the copied place\'s KEY SET is the classified list — a ninth field fails here first', () => {
  const source = sourceWithFullPlace('ordinary prose');
  assert.deepEqual(
    Object.keys(source.places[0]).sort(), Object.keys(PLACE_FIELDS).sort(),
    'the fixture must populate every field of Place, or this test measures less than it claims',
  );
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  const copy = copyAcross(target, source).places[0];
  assert.deepEqual(
    Object.keys(copy).sort(), [...PLACE_FIELDS_THAT_CROSS].sort(),
    'a field crossed the trip boundary that A-15\'s table does not classify (or a classified one is missing)',
  );
});

test('A-15: a credential in the copied place\'s note and links does not cross the trip boundary', () => {
  const source = sourceWithFullPlace(CREDENTIAL_NOTE);
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  const after = copyAcross(target, source);
  const copy = after.places[0];

  assert.deepEqual(redactionHits(copy.note ?? ''), [], 'a §6.6 pattern still matches the copied place note');
  assert.match(copy.note ?? '', /\[redacted\]/, 'redaction should be visible, not a silently emptied note');
  assert.equal('links' in copy, false, 'A-15 drops `links` entirely — an empty array is not the answer');

  const doc = JSON.stringify(toJSON(after));
  for (const needle of CREDENTIALS) {
    assert.equal(doc.includes(needle), false, `${needle} is greppable in the recipient's whole document`);
  }
});

test('A-15: redaction is not a wipe — an ordinary place note crosses byte-identical', () => {
  const prose = 'entrance is on the north side';
  const source = sourceWithFullPlace(prose);
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  const copy = copyAcross(target, source).places[0];
  assert.equal(copy.note, prose, 'a rule that redacts everything passes the test above and is wrong');
  assert.equal(copy.name, 'Habyt Vienna');
  assert.equal(copy.category, 'stay');
  assert.deepEqual(copy.at, BELVEDERE);
  assert.deepEqual(copy.hours?.weekly, [null, { day: 1, open: '09:00', close: '17:00' }]);

  // A source place with no note and no hours arrives with neither key invented.
  const bare = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: null });
  const bareCopy = copyAcross(target, { ...bare, places: bare.places.map((p) => ({ ...p, note: undefined })) })
    .places[0];
  assert.equal('note' in bareCopy, false, 'an absent note must not become a present one');
  assert.equal('hours' in bareCopy, false, 'an absent `hours` must not become a present one');
  assert.equal(bareCopy.at, null, 'a null coordinate crosses as null');
});

test('A-15: hours.note is free text too — the weekly array crosses, the note beside it is redacted', () => {
  const source = sourceWithFullPlace('ordinary prose', 'code 4417');
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  const copy = copyAcross(target, source).places[0];
  assert.deepEqual(copy.hours?.weekly, [null, { day: 1, open: '09:00', close: '17:00' }]);
  assert.deepEqual(redactionHits(copy.hours?.note ?? ''), [], 'hours.note is the same class of omission as Place.note');
  assert.equal(copy.hours?.note, '[redacted]');
});

test('A-15: nothing of the copied place is aliased — mutating the source afterwards changes nothing', () => {
  const source = sourceWithFullPlace('ordinary prose', 'closed in winter');
  const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  const after = copyAcross(target, source);
  const copy = after.places[0];
  const original = source.places[0];

  assert.notEqual(copy.at, original.at, 'two documents must not share one mutable LatLng');
  assert.notEqual(copy.hours, original.hours, 'nor one OpeningHours');
  assert.notEqual(copy.hours?.weekly, original.hours?.weekly);
  assert.notEqual(copy.hours?.weekly[1], original.hours?.weekly[1]);

  const before = toJSON(after);
  (original.at as LatLng).lat = 0;
  original.hours!.weekly[1]!.open = '00:00';
  assert.equal(toJSON(after), before, 'a later mutation of the SOURCE document reached the target');
});

test('A-15: the reuse branch is untouched — the target keeps its own note and links', () => {
  const source = sourceWithFullPlace(CREDENTIAL_NOTE);
  let target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  target = addPlace(target, {
    id: 'p-tgt', cityKey: target.cities[0].key, name: 'habyt vienna', at: BELVEDERE, category: 'stay',
    note: 'my own note', links: [{ label: 'Mine', href: 'https://example.test/mine' }],
  });
  const after = copyAcross(target, source);
  assert.equal(after.places.length, 1, 'A-14 assertion 2: an equivalent place is reused, not duplicated');
  assert.equal(after.places[0].note, 'my own note', 'the reused row must keep the TARGET\'s note');
  assert.deepEqual(after.places[0].links, [{ label: 'Mine', href: 'https://example.test/mine' }]);
  const doc = JSON.stringify(toJSON(after));
  for (const needle of CREDENTIALS) {
    assert.equal(doc.includes(needle), false, `${needle} crossed through the reuse branch`);
  }
});

// ---------------------------------------------------------------------------
// A-16 (ARCHITECTURE revision 13, QA R14-2) — re-filing is a derivation, and the source
// document may already hold the answer.
//
// A-14 claimed copying within one trip was unchanged: *"the source city is found by key, its
// own name matches itself, the key comes back identical."* `refileCityKey` never asked whether
// source and target were the same document, so a within-trip copy was re-filed by name like
// any other — and on a trip holding two cities of the same name (A-10 blesses that; it is what
// a there-and-back itinerary through a hub looks like) the place re-filed onto the wrong one
// and a duplicate row was written.
// ---------------------------------------------------------------------------

/** A trip with two cities named Vienna, one place filed under the SECOND, and a stop on it. */
function twoViennas(): { trip: Trip; secondKey: string } {
  let t = mintedTrip('trip-hub', 'user:jacob', 'hub', [
    { name: 'Vienna', centre: VIENNA, order: 0 },
    { name: 'Vienna', centre: VIENNA, order: 1 },
  ]);
  const secondKey = t.cities[1].key;
  t = addPlace(t, { id: 'p-src', cityKey: secondKey, name: 'Belvedere', at: BELVEDERE, category: 'sight' });
  t = addStop(
    t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'p-src' } },
    CTX('hubs'),
  );
  return { trip: t, secondKey };
}

const copyWithin = (t: Trip, source: Trip, prefix = 'w'): Trip =>
  copyStopInto(
    t, { trip: source, stopId: 's-src' },
    { kind: 'scheduled', dayId: '2026-08-09', time: '11:00', order: 0 }, COPY_CTX(prefix),
  );

test('A-16 step 2: a within-trip copy on a two-Vienna trip keeps the place\'s OWN key and adds no row', () => {
  const { trip, secondKey } = twoViennas();
  assert.notEqual(secondKey, trip.cities[0].key, 'the fixture is not testing two same-named cities');

  const after = copyWithin(trip, trip);
  assert.equal(after.places.length, 1, 'the reuse search must match the original row — A-14 assertion 2');
  assert.equal(after.places[0].cityKey, secondKey, 're-filed by name onto the lowest-order Vienna');
  const clone = after.days.find((d) => d.id === '2026-08-09')!.stops[0];
  assert.equal(clone.place.kind === 'place' ? clone.place.placeId : '', 'p-src');
  assert.deepEqual(validateTrip(after).filter((i) => i.code === 'unknown_city_key'), []);
});

test('A-16 step 2: `.id`, not `===` — the same document as a DIFFERENT object copies identically', () => {
  const { trip } = twoViennas();
  const sameObject = copyWithin(trip, trip, 'obj');
  // What the reducer actually holds: the store applies the action to its current document
  // while the UI passes whatever object it rendered from — equal by `.id`, a different object
  // after any `openTrip` (which re-parses through `fromJSON`) or any dispatch since the render.
  const snapshot = fromJSON(toJSON(trip));
  assert.notEqual(snapshot, trip, 'the fixture is not testing two objects');
  assert.equal(snapshot.id, trip.id);
  const different = copyWithin(trip, snapshot, 'obj');
  assert.equal(toJSON(different), toJSON(sameObject), 'this is the assertion that fails under `===`');
});

test('A-16 step 2: a within-trip copy under a BLANK-named city keeps the place link', () => {
  let t = mintedTrip('trip-blank', 'user:jacob', 'bl', [{ name: '   ', centre: VIENNA }]);
  t = addPlace(t, { id: 'p-src', cityKey: t.cities[0].key, name: 'Belvedere', at: BELVEDERE, category: 'sight' });
  t = addStop(
    t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'p-src' } },
    CTX('bls'),
  );
  const after = copyWithin(t, t, 'bl2');
  const clone = after.days.find((d) => d.id === '2026-08-09')!.stops[0];
  assert.equal(clone.place.kind, 'place', 'no identity is being derived from a name here — step 2 answers first');
  assert.equal(after.places.length, 1, 'and no row is added');
  // A-14 assertion 5 is unmoved: ACROSS documents, two blank names still do not match.
  const other = mintedTrip('trip-other', 'user:jacob', 'ot', [{ name: '', centre: VIENNA }]);
  const across = copyAcross(other, t, 'bl3');
  assert.equal(across.places.length, 0, 'a blank name is still not an identity across documents');
  assert.equal(copiedStop(across).place.kind, 'inline');
});

test('A-16 step 1 stays first: a key the SOURCE cannot resolve takes step 3 even within one trip', () => {
  let t = mintedTrip('trip-dangle', 'user:jacob', 'dg', [{ name: 'Vienna', centre: VIENNA }]);
  t = addPlace(t, { id: 'p-src', cityKey: 'city_gone', name: 'Belvedere', at: BELVEDERE, category: 'sight' });
  t = addStop(
    t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'p-src' } },
    CTX('dgs'),
  );
  const before = validateTrip(t).filter((i) => i.code === 'unknown_city_key').length;
  assert.equal(before, 1, 'the fixture must already be the data-integrity gap A-16 refuses to paper over');

  const after = copyWithin(t, t, 'dg2');
  assert.equal(after.places.length, 1, 'no row may be minted for a place whose own city does not exist');
  const clone = after.days.find((d) => d.id === '2026-08-09')!.stops[0];
  assert.equal(clone.place.kind, 'inline', 'the coordinate travels; the record does not');
  assert.equal(
    validateTrip(after).filter((i) => i.code === 'unknown_city_key').length, before,
    'the copy minted a NEW unknown_city_key',
  );
});

test('A-16 step 2: a STALE source snapshot never files under a key the target no longer holds', () => {
  const { trip, secondKey } = twoViennas();
  // The user deletes the second Vienna after the pane rendered. The snapshot the UI holds
  // still has it; §0.6 — the fact is read from `target`, which is the resource that holds it.
  const stale = trip;
  const target: Trip = { ...trip, cities: trip.cities.filter((c) => c.key !== secondKey) };

  const after = copyWithin(target, stale, 'st');
  assert.deepEqual(
    validateTrip(after).filter((i) => i.code === 'unknown_city_key'),
    validateTrip(target).filter((i) => i.code === 'unknown_city_key'),
    'the stale key was filed into a document that no longer has it',
  );
  // A city of that name is still there, so name matching answers: the copy lands on it.
  const copy = after.places[after.places.length - 1];
  assert.equal(copy.cityKey, target.cities[0].key, 'a stale source falls through to name matching');

  // With the NAME gone too, it falls all the way through to step 3 — a hole, never a wrong filing.
  const renamed: Trip = { ...target, cities: target.cities.map((c) => ({ ...c, name: 'Prague' })) };
  const gone = copyWithin(renamed, stale, 'st2');
  assert.equal(gone.places.length, renamed.places.length, 'step 3: no row, and no city invented');
  assert.equal(gone.days.find((d) => d.id === '2026-08-09')!.stops[0].place.kind, 'inline');
});

test('A-16 step 2: two DIFFERENT documents sharing a city key is a coincidence, not an identity', () => {
  // Every deterministic IdFactory in this repo mints `city-1` in every document it builds, and
  // `importDoc`'s "restore as a copy" produces two documents with the same city keys by
  // construction. Trusting a bare key match would file a Vienna place under the target's
  // `city-1`, whatever that happens to be.
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  // The same `IdFactory` prefix in both documents, which is what `sequentialIds`, the fixtures
  // and `tools/gen-sample.mjs` all do: `city-1` in every document they build.
  const target = mintedTrip('trip-tgt', 'user:jacob', 'src', [{ name: 'Prague', centre: PRAGUE }]);
  assert.equal(source.cities[0].key, target.cities[0].key, 'the fixture is not testing a shared key');
  assert.notEqual(source.id, target.id);

  const after = copyAcross(target, source, 'coin');
  assert.equal(after.places.length, 0, 'a bare key match filed a Vienna place under Prague');
  assert.equal(copiedStop(after).place.kind, 'inline');
});

// ---------------------------------------------------------------------------
// R14-3 (routed to the builder; the same purity argument as A-14's step 3)
// ---------------------------------------------------------------------------

test('R14-3: an inline or absent source place is CLONED into the target, not aliased', () => {
  let t = mintedTrip('trip-inline', 'user:jacob', 'il', [{ name: 'Vienna', centre: VIENNA }]);
  t = addStop(
    t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Inline', category: 'sight', place: { kind: 'inline', at: { lat: 1, lng: 2 } } },
    CTX('ils'),
  );
  const after = copyWithin(t, t, 'il2');
  const srcPlace = t.days.find((d) => d.id === '2026-08-08')!.stops[0].place;
  const dstPlace = after.days.find((d) => d.id === '2026-08-09')!.stops[0].place;
  assert.notEqual(srcPlace, dstPlace, 'the two stops share ONE PlaceLink object');
  assert.notEqual(
    srcPlace.kind === 'inline' ? srcPlace.at : null, dstPlace.kind === 'inline' ? dstPlace.at : undefined,
    'the two documents share ONE mutable LatLng',
  );
  assert.deepEqual(dstPlace.kind === 'inline' ? dstPlace.at : null, { lat: 1, lng: 2 });

  let n = mintedTrip('trip-none', 'user:jacob', 'nn', [{ name: 'Vienna', centre: VIENNA }]);
  n = addStop(
    n, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'No place', category: 'sight', place: { kind: 'none' } },
    CTX('nns'),
  );
  const afterNone = copyWithin(n, n, 'nn2');
  assert.notEqual(
    n.days.find((d) => d.id === '2026-08-08')!.stops[0].place,
    afterNone.days.find((d) => d.id === '2026-08-09')!.stops[0].place,
    '{kind:\'none\'} is a fresh object too — the copy owns every part of its own document',
  );
});

test('R5-2 ceiling: the widened rule adds nothing to the unmodified reference trip', () => {
  // The finding's own stated invariant. It holds because the Europe 2026 reference trip
  // carries zero attributed records — asserted here rather than assumed, so that the day a
  // credited record enters the sample this test says so instead of quietly measuring nothing.
  const { trip } = europe2026();
  const issues = validateTrip(trip);
  assert.deepEqual(issues.filter((i) => i.code === 'accepted_by_non_member'), []);

  const attributed = [...trip.days, ...trip.days.flatMap((d) => d.stops), ...trip.pool, ...trip.bookings]
    .filter((x) => attribution(x));
  assert.deepEqual(attributed, [], 'a credited record appeared in the reference trip');

  const accepted = [...trip.days, ...trip.days.flatMap((d) => d.stops), ...trip.pool, ...trip.bookings]
    .filter((x) => x.provenance.state === 'accepted');
  assert.ok(accepted.length > 100, `the ceiling is vacuous: only ${accepted.length} accepted records in the sample`);

  // And the widened rule is not silently absent for a different reason: the same document with
  // ONE record credited and its actor removed does fire, on the same call path.
  const first = trip.days.find((d) => d.stops.length > 0)!;
  const faulted: Trip = {
    ...trip,
    days: trip.days.map((d) =>
      d.id !== first.id ? d : {
        ...d,
        stops: d.stops.map((s, i) => i !== 0 ? s : {
          ...s,
          provenance: {
            ...s.provenance,
            source: 'friend' as const,
            state: 'accepted' as const,
            origin: { friendUserId: 'user:marta', sourceTripId: 'trip-marta', sourceStopId: s.id },
            actorUserId: null,
          },
        }),
      },
    ),
  };
  assert.equal(
    validateTrip(faulted).filter((i) => i.code === 'accepted_by_non_member').length,
    1,
    'the rule does not fire on the reference document at all — the ceiling proves nothing',
  );
  assert.equal(
    validateTrip(faulted).length,
    issues.length + 1,
    'exactly one additional issue, not a cascade',
  );
});
