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
  moveStop, poolFor, rejectCandidate, removeStop, returnToPool, scheduleFromPool, sequentialIds, setDayMeta,
  toJSON, fromJSON,
  updateStop, upsertBooking, validateTrip,
} from '../src/index.ts';
import { detectConflicts } from '../src/index.ts';
// Internals of public functions, off the surface in §2.10 revision 5. BUILD-NOTES KD-33.
import { addPlace } from '../src/build/stops.ts';
// Not on §2.10's surface by design (`model/ids.ts`): a caller outside core asks "is this key
// one of `trip.cities`?" rather than knowing the value. A-19 makes it the one honest answer a
// cross-trip pool copy can give, so the test names it rather than the bare string.
import { TRANSIT_CITY_KEY } from '../src/model/ids.ts';
import { needsBadge } from '../src/derive/display.ts';
// A-20: the ONE definition of a well-formed `OpeningHours`, shared by `fromJSON`,
// `validateTrip` and `weeklyForCopy`. Off §2.10's surface by design, so it is imported by path.
// A-21 (revision 16) replaced the boolean predicate with a READER that hands back what it read,
// so the question this file asks is `readWeeklyEntry(w).kind === 'entry'`.
import { readWeeklyEntry } from '../src/model/openingHours.ts';
import { resolvePlaceLink } from '../src/derive/geo.ts';
import type {
  BuildCtx, CostEstimate, LatLng, Link, MoveOverride, Money, Place, Stop, StopPlacement, Trip,
} from '../src/index.ts';
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

// ---------------------------------------------------------------------------
// A-18 (ARCHITECTURE revision 14, QA R15-3) — free text does not become structural by being
// nested inside a `Stop`.
//
// Rule 5 lists the fields of `Stop`, and `cost` and `arrival` are RECORDS, not strings:
// naming them in a field list says which fields travel, not which strings do. So
// `cost: {...src.cost}` and `arrival: {...src.arrival}` handed `CostEstimate.note` and
// `MoveOverride.label` across the person boundary verbatim, while §6.6's sample path redacts
// both — the same "sample fails closed, copy fails open" asymmetry A-15 called THE finding,
// one record inward instead of one record sideways.
//
// > A field list is only exhaustive down to the depth it recurses. Enumeration stops at a
// > SCALAR, never at a field name.
//
// R15-1 (`{...w}` on an `hours.weekly` entry) is the same sentence one level down inside
// `Place`, which is why the two land together.
// ---------------------------------------------------------------------------

const COST_NOTE_CREDENTIAL = 'paid with card, conf 5814731574';
const ARRIVAL_LABEL_CREDENTIAL = 'Bus 8, booking GYGG45MLA9Q9';

/**
 * The four records A-18 rebuilds, as compile-time exhaustive maps — the same mechanical stop
 * A-15 gave `Place`, which R15-3 observed `Stop` did not have. A field added to any of these
 * fails `npm run typecheck` HERE first, and then fails the key-set assertions below until it is
 * classified in `costForCopy` / `arrivalForCopy` / the `links` line.
 */
const STOP_FIELDS: Record<keyof Stop, true> = {
  id: true, placement: true, name: true, category: true, place: true, note: true, cost: true,
  arrival: true, travelRole: true, bookingId: true, flags: true, provenance: true,
  durationMins: true, links: true, ticket: true,
};
const COST_FIELDS: Record<keyof CostEstimate, true> = { amounts: true, display: true, note: true };
const MONEY_FIELDS: Record<keyof Money, true> = { lo: true, hi: true, currency: true, basis: true };
const ARRIVAL_FIELDS: Record<keyof MoveOverride, true> = { mode: true, mins: true, label: true };
const LINK_FIELDS: Record<keyof Link, true> = { label: true, href: true };

/** `ticket` is the one field of `Stop` that may not cross: §6.6, a ticket is a credential. */
const STOP_FIELDS_THAT_CROSS = Object.keys(STOP_FIELDS).filter((k) => k !== 'ticket');

/** A source trip whose one stop populates every field of `CostEstimate` and `MoveOverride`. */
function sourceWithFullStop(over: {
  costNote?: string;
  display?: string | null;
  label?: string;
} = {}): Trip {
  const t = mintedTrip('trip-src', 'user:marta', 'fs', [{ name: 'Vienna', centre: VIENNA }]);
  return addStop(
    t, { kind: 'scheduled', dayId: '2026-08-07', time: '10:00', order: 0 },
    {
      id: 's-src', name: 'Tour', category: 'sight', place: { kind: 'none' }, note: 'plain prose',
      cost: {
        amounts: [{ lo: 10, hi: 20, currency: 'EUR', basis: 'per_person' }],
        display: over.display === undefined ? '€10–20' : over.display,
        note: over.costNote ?? 'tickets at the door',
      },
      arrival: { mode: 'bus', mins: 20, label: over.label ?? 'Bus 8' },
      travelRole: 'transfer', durationMins: 90, flags: ['ticketed'],
      links: [{ label: 'Info', href: 'https://example.test/info' }],
    },
    CTX('fss'),
  );
}

const jacobsTarget = (prefix = 'tgt'): Trip =>
  mintedTrip('trip-tgt', 'user:jacob', prefix, [{ name: 'Vienna', centre: VIENNA }]);

test('A-18: the copied stop\'s KEY SETS are the classified lists — a new cost or arrival field fails here first', () => {
  const source = sourceWithFullStop();
  const before = source.days.find((d) => d.id === '2026-08-07')!.stops[0];
  assert.deepEqual(
    Object.keys(before).sort(), Object.keys(STOP_FIELDS).filter((k) => k !== 'ticket').sort(),
    'the fixture must populate every field of Stop but `ticket`, or this measures less than it claims',
  );
  assert.deepEqual(Object.keys(before.cost!).sort(), Object.keys(COST_FIELDS).sort());
  assert.deepEqual(Object.keys(before.arrival!).sort(), Object.keys(ARRIVAL_FIELDS).sort());

  const copy = copiedStop(copyAcross(jacobsTarget(), source));
  assert.deepEqual(
    Object.keys(copy).sort(), [...STOP_FIELDS_THAT_CROSS].sort(),
    'a field crossed the trip boundary that rule 5 does not classify (or a classified one is missing)',
  );
  assert.deepEqual(
    Object.keys(copy.cost!).sort(), Object.keys(COST_FIELDS).sort(),
    'a field of CostEstimate travelled unclassified — A-18 position 2 forbids a spread at any depth',
  );
  assert.deepEqual(
    Object.keys(copy.cost!.amounts[0]).sort(), Object.keys(MONEY_FIELDS).sort(),
    'a field of Money travelled unclassified',
  );
  assert.deepEqual(
    Object.keys(copy.arrival!).sort(), Object.keys(ARRIVAL_FIELDS).sort(),
    'a field of MoveOverride travelled unclassified',
  );
  assert.deepEqual(
    Object.keys(copy.links![0]).sort(), Object.keys(LINK_FIELDS).sort(),
    'a field of Link travelled unclassified',
  );

  // The limitation, stated so it is not oversold (A-15's is the same): this catches a field
  // that TRAVELS unclassified — a re-introduced spread over a source that carries one — and it
  // catches a classified field that stops travelling. A field that silently fails to travel
  // when nothing in the fixture populates it is the fail-closed direction, and is caught by the
  // compile-time maps above plus review, not by this assertion.
  // QA **R16-1**: `links` was the one row of the assertion above NOT forced against a hostile
  // fixture — it ran on a two-key `{label, href}` and read `{label, href}` whatever the
  // construction, so reverting the `links` line to `{ ...l }` left the whole suite green and
  // the round-16 claim of "spreading `links` (1 red)" was measured at 0. The eleventh key makes
  // that mutation red. `parseLinks` rebuilds every `Link` as `{label, href}`, so the carrier is
  // an in-memory document — which is exactly the population A-18 position 2's *"no spread at
  // any depth"* is written against.
  const hostile: Trip = {
    ...source,
    days: source.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => ({
        ...s,
        cost: { ...s.cost!, ninth: 'PIN 0754' } as unknown as Stop['cost'],
        arrival: { ...s.arrival!, tenth: 'PIN 0754' } as unknown as Stop['arrival'],
        links: [{ label: 'Info', href: 'https://example.test/info', eleventh: 'PIN 0754' }] as unknown as Stop['links'],
      })),
    })),
  };
  const hostileCopy = copiedStop(copyAcross(jacobsTarget(), hostile, 'k2'));
  assert.deepEqual(Object.keys(hostileCopy.cost!).sort(), Object.keys(COST_FIELDS).sort());
  assert.deepEqual(Object.keys(hostileCopy.arrival!).sort(), Object.keys(ARRIVAL_FIELDS).sort());
  assert.deepEqual(
    Object.keys(hostileCopy.links![0]).sort(), Object.keys(LINK_FIELDS).sort(),
    'a field of Link travelled unclassified — A-18 position 2 forbids `{ ...l }` at any depth',
  );
  assert.equal(
    JSON.stringify(hostileCopy.links).includes('eleventh'), false,
    'the eleventh key rode across on a spread',
  );
});

// ---------------------------------------------------------------------------
// QA **R16-1**, the named rider: A-18 says *"`redacted()` replaces every `as string` in this
// file"*, and restoring `redactText(p.note) as string` in `placeForCopy` left 583/583 green,
// because `parsePlace` validates `note` with `str()` so no PARSED document carries a non-string
// one. `redactText` is typed `(unknown) => unknown` and returns a non-string **unchanged**, so
// the cast is what let `{pin: '…'}` cross whole in R15-1. A cast-built place is the fixture that
// tells the two constructions apart — the same population A-20 ratified `place_hours_malformed`
// for, one field over.
// ---------------------------------------------------------------------------

test('R16-1 rider: placeForCopy uses `redacted()`, not `redactText(...) as string` — a non-string note fails CLOSED', () => {
  for (const value of [{ pin: 'Front door PIN 0754' }, 5814731574, ['conf 5814731574'], true]) {
    const src = sourceWithFullPlace('ordinary prose');
    const source: Trip = { ...src, places: src.places.map((p) => ({ ...p, note: value as unknown as string })) };
    const copy = copyAcross(jacobsTarget(), source, 'rn').places[0];
    assert.equal(
      copy.note, '[redacted]',
      `a non-string Place.note crossed whole: ${JSON.stringify(value)} — that is \`as string\`, not \`redacted()\``,
    );
    assert.equal(JSON.stringify(toJSON(copyAcross(jacobsTarget(), source, 'rn2'))).includes('0754'), false);
  }
  // And the fail-closed rule is not a wipe: a real string still crosses byte-identical.
  assert.equal(
    copyAcross(jacobsTarget(), sourceWithFullPlace('entrance is on the north side'), 'rn3').places[0].note,
    'entrance is on the north side',
  );
});

test('A-18: a credential in cost.note or arrival.label does not cross the trip boundary', () => {
  const source = sourceWithFullStop({
    costNote: COST_NOTE_CREDENTIAL,
    label: ARRIVAL_LABEL_CREDENTIAL,
    display: '€40, conf 5814731574',
  });
  const after = copyAcross(jacobsTarget(), source);
  const copy = copiedStop(after);

  assert.deepEqual(redactionHits(copy.cost?.note ?? ''), [], 'a §6.6 pattern still matches the copied cost.note');
  assert.deepEqual(redactionHits(copy.arrival?.label ?? ''), [], 'a §6.6 pattern still matches the copied arrival.label');
  assert.match(copy.cost?.note ?? '', /\[redacted\]/, 'redaction should be visible, not a silently emptied note');
  assert.equal(copy.arrival?.label, 'Bus 8, [redacted]', 'the part that describes the journey must survive');

  const doc = JSON.stringify(toJSON(after));
  for (const needle of ['5814731574', 'GYGG45MLA9Q9']) {
    assert.equal(doc.includes(needle), false, `${needle} is greppable in the recipient's whole document`);
  }
  // The two thresholds now agree: the sample path redacts both of these strings, and so does
  // the copy path. That agreement is the whole finding.
  assert.deepEqual(redactionHits(copy.cost?.display ?? ''), []);
});

test('A-18: redaction is not a wipe — an ordinary cost.note, label and display cross byte-identical', () => {
  const source = sourceWithFullStop({
    costNote: 'tickets at the door', label: 'Bus 8', display: 'gardens free · palace €15–24',
  });
  const before = source.days.find((d) => d.id === '2026-08-07')!.stops[0];
  const copy = copiedStop(copyAcross(jacobsTarget(), source));

  assert.equal(copy.cost?.note, 'tickets at the door', 'a rule that redacts everything is wrong');
  assert.equal(copy.arrival?.label, 'Bus 8');
  assert.equal(copy.cost?.display, 'gardens free · palace €15–24');
  assert.deepEqual(copy.cost?.amounts, before.cost?.amounts, 'the money is a description of the world');
  assert.equal(copy.arrival?.mode, 'bus');
  assert.equal(copy.arrival?.mins, 20);
  assert.deepEqual(copy.flags, ['ticketed'], 'flags is a STRUCTURAL_KEY on the sample path too');
});

test('A-18: a credential-shaped display becomes null and `amounts` is unmoved, so the price survives', () => {
  // The `display` row is the one that drops to a specified unknown instead of redacting in
  // place: `[redacted] HUF` is a number that is not a number. `costLabel` (apps/web) reads
  // `amounts` whenever `display` is falsy, so the recipient sees €40 rather than a marker.
  // Asserted here as the two facts costLabel consumes — `test/boundaries.test.ts` forbids any
  // test importing apps/web, so its output cannot be asserted directly from the suite.
  const source = mintedTrip('trip-src', 'user:marta', 'dsp', [{ name: 'Vienna', centre: VIENNA }]);
  const withStop = addStop(
    source, { kind: 'scheduled', dayId: '2026-08-07', time: '10:00', order: 0 },
    {
      id: 's-src', name: 'Tour', category: 'sight', place: { kind: 'none' },
      cost: { amounts: [{ lo: 40, hi: 40, currency: 'EUR', basis: 'per_person' }], display: '€40, conf 5814731574' },
    },
    CTX('dsps'),
  );
  const copy = copiedStop(copyAcross(jacobsTarget(), withStop));
  assert.equal(copy.cost?.display, null, 'a display that redactText alters must not travel altered');
  assert.deepEqual(copy.cost?.amounts, [{ lo: 40, hi: 40, currency: 'EUR', basis: 'per_person' }]);
  assert.equal('note' in (copy.cost as object), false, 'an absent cost.note must not become a present one');

  // And a non-string display — reachable from a hand-built document — fails closed the same
  // way, with no throw and no cast.
  const hostile: Trip = {
    ...withStop,
    days: withStop.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => ({ ...s, cost: { ...s.cost!, display: { pin: 'PIN 0754' } as unknown as string } })),
    })),
  };
  const hostileCopy = copiedStop(copyAcross(jacobsTarget(), hostile, 'h2'));
  assert.equal(hostileCopy.cost?.display, null);
  assert.equal(JSON.stringify(toJSON(copyAcross(jacobsTarget(), hostile, 'h3'))).includes('0754'), false);
});

test('A-18: nothing of the copied cost, arrival or links is aliased, from either direction', () => {
  const source = sourceWithFullStop();
  const after = copyAcross(jacobsTarget(), source);
  const original = source.days.find((d) => d.id === '2026-08-07')!.stops[0];
  const copy = copiedStop(after);

  assert.notEqual(copy.cost, original.cost, 'two documents must not share one CostEstimate');
  assert.notEqual(copy.cost!.amounts[0], original.cost!.amounts[0], 'nor one Money');
  assert.notEqual(copy.arrival, original.arrival, 'nor one MoveOverride');
  assert.notEqual(copy.links![0], original.links![0], 'nor one Link');
  assert.notEqual(copy.flags, original.flags);

  const targetBefore = toJSON(after);
  original.cost!.amounts[0].lo = 999;
  original.arrival!.mins = 999;
  original.links![0].href = 'https://changed.test/';
  assert.equal(toJSON(after), targetBefore, 'a later mutation of the SOURCE document reached the target');

  const sourceBefore = toJSON(source);
  copy.cost!.amounts[0].hi = 111;
  copy.arrival!.mins = 111;
  copy.links![0].label = 'CHANGED';
  assert.equal(toJSON(source), sourceBefore, 'a later mutation of the TARGET document reached the source');
});

test('A-18: no new throw site — every cost and arrival shape fromJSON accepts copies cleanly', () => {
  const shapes: Array<[string, { cost?: Stop['cost']; arrival?: Stop['arrival'] }]> = [
    ['cost: null, arrival: null', { cost: null, arrival: null }],
    ['amounts: []', { cost: { amounts: [], display: null } }],
    ['display: null with amounts', { cost: { amounts: [{ lo: 1, hi: 2, currency: 'EUR', basis: 'per_person' }], display: null } }],
    ['no note, no label', { cost: { amounts: [], display: '€1' }, arrival: { mode: 'walk', mins: 4 } }],
  ];
  for (const [label, over] of shapes) {
    let t = mintedTrip('trip-src', 'user:marta', 'ns', [{ name: 'Vienna', centre: VIENNA }]);
    t = addStop(
      t, { kind: 'scheduled', dayId: '2026-08-07', time: '10:00', order: 0 },
      { id: 's-src', name: 'S', category: 'sight', place: { kind: 'none' }, ...over },
      CTX('nss'),
    );
    const round = fromJSON(toJSON(t));
    const copy = copiedStop(copyAcross(jacobsTarget(), round, 'ns2'));
    assert.equal('note' in ((copy.cost ?? {}) as object), false, `${label}: an absent cost.note was invented`);
    assert.equal('label' in ((copy.arrival ?? {}) as object), false, `${label}: an absent arrival.label was invented`);
  }
});

// ---------------------------------------------------------------------------
// R15-1 / R15-2 — `Place.hours` USED to be the one field `parsePlace` did not structurally
// validate (`o.hours as Place['hours']`), so what the TYPE said about `hours` was not what a
// DOCUMENT could carry. `{...w}` over `hours.weekly` therefore carried arbitrary keys across
// the person boundary (R15-1), and `p.hours.weekly.map(...)` threw a raw `TypeError` on six
// shapes `fromJSON` accepted (R15-2) — core throwing about a document, which §2.1 forbids.
//
// **§2.14 A-20 (revision 15) closed the cast**, so none of these shapes can arrive through the
// parser any more — `test/openingHours.test.ts` pins the refusal, path by path. A-20 says in
// writing that these fixtures are re-expressed rather than deleted: *"a hostile `hours` fixture
// now arrives by cast, not by parse"*, and the assertion is **two-sided** — `fromJSON` refuses
// with a path, AND `copyStopInto` still never throws on the equivalent cast-built in-memory
// document. The second half is R15-2's closure, and a ruling about the parser does not reopen
// it: a cast, a future untyped writer or a native bridge can still hand core one of these, and
// `place_hours_malformed` is the warning A-20 ratified for exactly that document.
// ---------------------------------------------------------------------------

/**
 * A source trip whose place holds an `hours` the type system says is an `OpeningHours` and is
 * not — built **in memory, past the parser**, because since A-20 that is the only way such a
 * document exists. `castWithHours` is the population `place_hours_malformed` describes.
 */
function castWithHours(hours: unknown): Trip {
  const t = sourceWithFullPlace('ordinary prose');
  return { ...t, places: t.places.map((p) => ({ ...p, hours: hours as Place['hours'] })) };
}

/** A document that carries `hours`, as JSON text — the input side of the parser. */
function docWithHours(hours: unknown): string {
  const raw = JSON.parse(toJSON(sourceWithFullPlace('ordinary prose')));
  raw.places[0].hours = hours;
  return JSON.stringify(raw);
}

/** The other half of every assertion below: the parser refuses what the cast smuggles in. */
function refusedByParser(hours: unknown, label: string): void {
  assert.throws(
    () => fromJSON(docWithHours(hours)),
    (e: unknown) => (e as Error).name === 'TripParseError',
    `${label}: A-20 says fromJSON refuses this — if it parses, the cast fixture is testing nothing`,
  );
}

test('R15-1: an unvalidated hours.weekly entry is rebuilt field by field — nothing else crosses', () => {
  const hostileHours = {
    weekly: [{
      day: 1, open: '09:00', close: '17:00',
      note: 'Front door PIN 0754, conf 5814731574 - ask for jacob@example.com',
      href: 'https://vendor.example/booking/GYGG45MLA9Q9',
    }],
  };
  // A-20 puts an extra key on a *structurally valid* entry on the NORMALISE side, not the
  // refuse side: the parser drops it, exactly as `parseLinks` drops a third key on a `Link`.
  // So the two-sided statement here is *dropped by the parser, and dropped by the copy too*.
  const parsed = fromJSON(docWithHours(hostileHours));
  assert.deepEqual(
    Object.keys(parsed.places[0].hours!.weekly[0]!).sort(), ['close', 'day', 'open'],
    'A-20: the parser rebuilds a weekly entry from three named fields — the extra key must not survive it',
  );
  const source = castWithHours(hostileHours);
  assert.notEqual(
    (source.places[0].hours!.weekly[0] as Record<string, unknown>).note, undefined,
    'the fixture must actually carry the extra key, or it is not testing the carrier',
  );

  const after = copyAcross(jacobsTarget(), source);
  const entry = after.places[0].hours!.weekly[0]!;
  assert.deepEqual(Object.keys(entry).sort(), ['close', 'day', 'open'], 'a key of a weekly entry crossed unclassified');
  assert.deepEqual(entry, { day: 1, open: '09:00', close: '17:00' }, 'the hours themselves must still cross');
  const doc = JSON.stringify(toJSON(after));
  for (const needle of CREDENTIALS) {
    assert.equal(doc.includes(needle), false, `${needle} reached the recipient's document through hours.weekly`);
  }
});

test('R15-1: hours.note is redacted even when it is not a string — `as string` was hiding that', () => {
  for (const value of [{ pin: 'PIN 0754' }, 5814731574, ['conf 5814731574']]) {
    refusedByParser({ weekly: [], note: value }, `hours.note as ${JSON.stringify(value)}`);
    const source = castWithHours({ weekly: [], note: value });
    const after = copyAcross(jacobsTarget(), source, 'hn');
    assert.equal(after.places[0].hours?.note, '[redacted]', `a non-string hours.note crossed whole: ${JSON.stringify(value)}`);
    assert.equal(JSON.stringify(toJSON(after)).includes('0754'), false);
  }
  // A weekly entry whose open/close are not clock times redactText leaves alone becomes the
  // model's own specified unknown — `null` — rather than a `[redacted]` opening time.
  refusedByParser({ weekly: [{ day: 1, open: 'PIN 0754', close: '17:00' }] }, 'an open that is not a time');
  const hostile = castWithHours({ weekly: [{ day: 1, open: 'PIN 0754', close: '17:00' }] });
  const copy = copyAcross(jacobsTarget(), hostile, 'hw').places[0];
  assert.deepEqual(copy.hours?.weekly, [null], 'a time that is not a time must not travel as a redaction marker');
});

test('R15-2: the six hours shapes are refused by fromJSON, and cast-built still copy without throwing', () => {
  const shapes: Array<[string, unknown]> = [
    ['hours: {} (no weekly)', {}],
    ['hours: a string', 'closed mondays'],
    ['hours: a number', 7],
    ['hours: an array', [1, 2]],
    ['hours: null', null],
    ['hours.weekly: a string', { weekly: 'mon-fri' }],
  ];
  for (const [label, hours] of shapes) {
    // Half one (A-20): the parser refuses it. Half two (R15-2, unchanged): the same shape
    // built in memory past the type system still copies without a throw out of core.
    refusedByParser(hours, label);
    const source = castWithHours(hours);
    let after: Trip;
    assert.doesNotThrow(() => { after = copyAcross(jacobsTarget(), source, 'sh'); }, `${label} threw`);
    const copy = after!.places[0];
    assert.deepEqual(copy.hours?.weekly, [], `${label}: an unreadable weekly must become a hole, not an invention`);
    assert.equal('note' in (copy.hours as object), false, `${label}: a note was invented`);
    // §2.1: core throws on programmer error and reports a DOCUMENT problem as an Issue. This
    // is the half of R15-2 that answers "nothing warns the user first", and the population
    // A-20 ratified `place_hours_malformed` to describe: a document built past the parser.
    const issues = validateTrip(source).filter((i) => i.code === 'place_hours_malformed');
    assert.equal(issues.length, 1, `${label}: validateTrip says nothing about the malformed hours`);
    assert.equal(issues[0].level, 'warn');
    // And `toJSON` re-emits it rather than repairing or throwing — which is why the warning
    // above is not dead code: the export is what fails to re-import.
    assert.doesNotThrow(() => toJSON(source), `${label}: toJSON threw on a cast-built document`);
    assert.throws(() => fromJSON(toJSON(source)), /./, `${label}: the re-emitted export must not re-import clean`);
  }
  // And a WELL-FORMED hours warns about nothing, or the rule is noise — through the parser,
  // which is the only route a well-formed one now needs.
  const wellFormed = JSON.parse(toJSON(sourceWithFullPlace('ordinary prose')));
  wellFormed.places[0].hours = { weekly: [null, { day: 1, open: '09:00', close: '17:00' }], note: 'x' };
  assert.deepEqual(
    validateTrip(fromJSON(JSON.stringify(wellFormed))).filter((i) => i.code === 'place_hours_malformed'),
    [],
  );
});

// ---------------------------------------------------------------------------
// A-20 Part 5(b) — the invariant R16-2 asked for, stated directly:
//
//   > if `readWeeklyEntry(w).kind === 'entry'`, then `weeklyForCopy(w) !== null`.
//
// (A-20 stated this as `isWeeklyEntry(w) && w != null`; A-21 renamed the predicate to a reader
// and the two forms are the same set, which `openingHours.test.ts` re-derives row for row.)
//
// `weeklyForCopy` is module-private (§2.10), so it is measured where it is observable: the
// entry a copied place's `hours.weekly` actually holds. Given Part 5(a) — all 11 000 strings
// `isClockTime` accepts are byte-identical under `redactText` — this cannot be satisfied by
// weakening either side: strengthen the predicate and a legitimate entry stops crossing;
// weaken it and one of R16-2's three shapes crosses as a time that is not a time.
// ---------------------------------------------------------------------------

test('A-20 5(b): readWeeklyEntry(w).kind === \'entry\'  ⟹  the entry survives the copy', () => {
  const table: Array<[string, unknown]> = [
    ['a legitimate entry', { day: 1, open: '09:00', close: '17:00' }],
    ['a single-digit hour', { day: 0, open: '9:00', close: '23:59' }],
    ['an entry with an extra key', { day: 2, open: '09:00', close: '17:00', note: 'PIN 0754' }],
    ['R16-2: close as 170000', { day: 1, open: '9:00', close: '170000' }],
    ['R16-2: open as a URL', { day: 1, open: 'https://vendor.test/x', close: '17:00' }],
    ['R16-2: open as a reference', { day: 1, open: 'YZGDTS', close: '17:00' }],
    ['null', null],
    ['undefined', undefined],
    ['a nested object', { day: 1, open: { h: 9 }, close: '17:00' }],
    ['an array', [1, 2]],
    ['a string', 'mon 9-5'],
    ['a NaN day', { day: NaN, open: '9:00', close: '17:00' }],
  ];

  let survived = 0;
  let dropped = 0;
  for (const [label, w] of table) {
    const source = castWithHours({ weekly: [w] });
    const entry = copyAcross(jacobsTarget(), source, `wc${survived}${dropped}`).places[0].hours!.weekly[0];
    const wellFormed = readWeeklyEntry(w).kind === 'entry';
    if (wellFormed) {
      assert.notEqual(entry, null, `${label}: readWeeklyEntry says well-formed but the copy dropped it (R16-2)`);
      assert.deepEqual(Object.keys(entry!).sort(), ['close', 'day', 'open'], `${label}: an unclassified key crossed`);
      survived++;
    } else {
      assert.equal(entry, null, `${label}: the copy kept an entry readWeeklyEntry calls malformed`);
      dropped++;
    }
    // The two readers agree by construction now — one predicate, three call sites.
    const issues = validateTrip(source).filter((i) => i.code === 'place_hours_malformed');
    assert.equal(
      issues.length, wellFormed || w === null || w === undefined ? 0 : 1,
      `${label}: validateTrip and the copy boundary disagree — that disagreement IS R16-2`,
    );
  }
  assert.equal(survived, 3, 'the table must contain entries that DO survive, or it proves nothing');
  assert.equal(dropped, 9);
});

// ---------------------------------------------------------------------------
// R15-4 — A-16 step 1 must run BEFORE step 2, and the fixture above cannot show it.
//
// `A-16 step 1 stays first` files its place under `'city_gone'`, a key NEITHER document holds,
// so step 2's `target.cities.some(...)` is false whatever the order and moving step 2 above
// step 1 leaves the whole suite green (QA verified this by mutation). The document that
// distinguishes the two orders is the one where the SOURCE cannot resolve the key and the
// TARGET can: a snapshot taken before the target gained the city.
// ---------------------------------------------------------------------------

test('A-16 step 1 stays first: a key only the TARGET can resolve still takes step 3', () => {
  const GAINED = 'city-later';
  let target = mintedTrip('trip-gain', 'user:jacob', 'gn', [{ name: 'Vienna', centre: VIENNA }]);
  target = {
    ...target,
    cities: [...target.cities, { key: GAINED, name: 'Prague', countryCode: 'CZ', centre: PRAGUE, order: 1 }],
  };
  // The snapshot the Browse pane still holds: no such city, but a place already filed under it.
  let stale: Trip = { ...target, cities: target.cities.filter((c) => c.key !== GAINED) };
  stale = addPlace(stale, { id: 'p-src', cityKey: GAINED, name: 'Belvedere', at: BELVEDERE, category: 'sight' });
  stale = addStop(
    stale, { kind: 'scheduled', dayId: '2026-08-07', time: '10:00', order: 0 },
    { id: 's-src', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'p-src' } },
    CTX('gns'),
  );
  target = { ...target, places: stale.places, days: stale.days };

  // The preconditions that make the ORDER observable, asserted rather than assumed.
  assert.equal(stale.cities.some((c) => c.key === GAINED), false, 'the source must NOT resolve its own key');
  assert.equal(target.cities.some((c) => c.key === GAINED), true, 'the target MUST resolve it, or step 2 is false anyway');
  assert.equal(stale.id, target.id, 'and they must be the same document, or step 2\'s first conjunct is false');

  const after = copyAcross(target, stale, 'gn2');
  const landed = copiedStop(after).place;
  assert.equal(
    landed.kind, 'inline',
    'step 2 answered before step 1: a place whose own document cannot resolve its city was filed ' +
      'under the target\'s key anyway, which is the papering-over A-16 refuses',
  );
  assert.equal(after.places.length, stale.places.length, 'no row may be minted for a place with no city');
});

// ---------------------------------------------------------------------------
// A-19 (ARCHITECTURE revision 14, QA R15-6) — a placement is an instruction in the TARGET's
// terms, so it is validated, not re-filed.
//
// `copyStopInto` validated the scheduled branch's `dayId` against the target and nothing for
// the pool branch, so a `{kind:'pool', cityKey}` carrying the SOURCE's key was written straight
// into the recipient's document, where `validateTrip` reports `pool_stop_unknown_city` — an
// error they did not cause, explained by a sentence that is false for their document, whose
// only repair ("Add to the plan") throws.
// ---------------------------------------------------------------------------

test('A-19: a pool placement naming a city the target does not have is REFUSED, and nothing is written', () => {
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  const target = jacobsTarget('a19');
  assert.notEqual(source.cities[0].key, target.cities[0].key, 'the fixture is not testing minted keys');

  const before = toJSON(target);
  assert.throws(
    () => copyStopInto(target, { trip: source, stopId: 's-src' },
      { kind: 'pool', cityKey: source.cities[0].key }, COPY_CTX('a19a')),
    new RegExp(`no such city ${source.cities[0].key} in trip-tgt`),
  );
  assert.equal(toJSON(target), before, 'the target moved behind the throw');
});

test('A-19: the transit key is the honest unknown, and a key the target HAS files under it', () => {
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  const target = jacobsTarget('a19b');

  const unfiled = copyStopInto(target, { trip: source, stopId: 's-src' },
    { kind: 'pool', cityKey: TRANSIT_CITY_KEY }, COPY_CTX('a19c'));
  assert.equal(unfiled.pool.length, 1);
  assert.deepEqual(unfiled.pool[0].placement, { kind: 'pool', cityKey: TRANSIT_CITY_KEY });
  assert.deepEqual(
    validateTrip(unfiled).map((i) => i.code), validateTrip(target).map((i) => i.code),
    'the transit group must add no issue at all',
  );
  assert.equal(displayStatus(unfiled.pool[0]), 'imported', 'the badge and the credit are untouched');
  assert.ok(attribution(unfiled.pool[0]));

  const filed = copyStopInto(target, { trip: source, stopId: 's-src' },
    { kind: 'pool', cityKey: target.cities[0].key }, COPY_CTX('a19d'));
  assert.equal(poolFor(filed, target.cities[0].key).length, 1);
  assert.deepEqual(validateTrip(filed).filter((i) => i.code === 'pool_stop_unknown_city'), []);
  // Otherwise identical to the scheduled case: A-15 applied to the place beside it.
  assert.equal(filed.places.length, 1);
  assert.equal(filed.places[0].cityKey, target.cities[0].key, 'the PLACE\'s key is still re-filed');
});

test('A-19: a within-trip copy into the pool under the stop\'s own key adds no issue', () => {
  let t = mintedTrip('trip-self', 'user:jacob', 'sf', [{ name: 'Vienna', centre: VIENNA }]);
  t = addStop(
    t, { kind: 'pool', cityKey: t.cities[0].key },
    { id: 's-src', name: 'Pooled', category: 'sight', place: { kind: 'none' } }, CTX('sfs'),
  );
  const after = copyStopInto(t, { trip: t, stopId: 's-src' },
    { kind: 'pool', cityKey: t.cities[0].key }, COPY_CTX('sf2'));
  assert.equal(after.pool.length, 2);
  assert.deepEqual(validateTrip(after).map((i) => i.code), validateTrip(t).map((i) => i.code));
});

test('A-19: a hint the target cannot resolve is DROPPED, not carried and not thrown on', () => {
  let source = mintedTrip('trip-src', 'user:marta', 'hs', [{ name: 'Vienna', centre: VIENNA }]);
  // A day that belongs to the city, so `pickDay` has an answer and the fallback is reachable.
  source = setDayMeta(source, '2026-08-08', { primaryCity: source.cities[0].key });
  source = addStop(
    source, { kind: 'pool', cityKey: source.cities[0].key },
    { id: 's-src', name: 'Pooled', category: 'sight', place: { kind: 'none' } }, CTX('hss'),
  );
  const target = jacobsTarget('hst');
  assert.equal(target.days.some((d) => d.id === '2020-01-01'), false);

  const dropped = copyStopInto(source, { trip: source, stopId: 's-src' }, // same doc, foreign day
    { kind: 'pool', cityKey: source.cities[0].key, hint: { dayId: '2020-01-01', time: '09:00', order: 2 } },
    COPY_CTX('h1'));
  const copy = dropped.pool[dropped.pool.length - 1];
  assert.equal('hint' in copy.placement, false, 'a hint naming a day the target does not have is a wrong filing');
  // ...and the repair the recipient is offered now works, through pickDay + CAT_DEFAULT_TIME.
  assert.doesNotThrow(() => scheduleFromPool(dropped, copy.id));

  const kept = copyStopInto(source, { trip: source, stopId: 's-src' },
    { kind: 'pool', cityKey: source.cities[0].key, hint: { dayId: '2026-08-08', time: '09:00', order: 2 } },
    COPY_CTX('h2'));
  assert.deepEqual(
    kept.pool[kept.pool.length - 1].placement,
    { kind: 'pool', cityKey: source.cities[0].key, hint: { dayId: '2026-08-08', time: '09:00', order: 2 } },
    'a hint the target CAN resolve is preserved, order included',
  );
});

test('A-19: the written placement is never the caller\'s object, for either branch', () => {
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  const target = jacobsTarget('a19e');

  const scheduled: StopPlacement = { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 };
  const afterS = copyStopInto(target, { trip: source, stopId: 's-src' }, scheduled, COPY_CTX('al1'));
  assert.notEqual(copiedStop(afterS).placement, scheduled, 'reindex keeps the caller\'s object when the order matches');

  const pooled: StopPlacement = {
    kind: 'pool', cityKey: target.cities[0].key, hint: { dayId: '2026-08-08', time: '09:00', order: 1 },
  };
  const afterP = copyStopInto(target, { trip: source, stopId: 's-src' }, pooled, COPY_CTX('al2'));
  assert.notEqual(afterP.pool[0].placement, pooled);
  assert.notEqual(
    (afterP.pool[0].placement as { hint?: object }).hint,
    (pooled as { hint?: object }).hint,
    'the hint is a mutable object shared between two documents',
  );

  const before = toJSON(afterP);
  (pooled as { cityKey: string }).cityKey = 'mutated';
  (pooled as { hint: { time: string } }).hint.time = '23:59';
  (scheduled as { order: number }).order = 99;
  assert.equal(toJSON(afterP), before, 'mutating the caller\'s placement after the copy reached the document');
});

// ---------------------------------------------------------------------------
// A-21 (ARCHITECTURE revision 16, QA R17-1) — **within one traversal, a field of a
// caller-supplied value is read exactly once.** The value that was checked is the value that is
// used, compared, redacted and emitted.
//
// A-20 printed `isWeeklyEntry(v): boolean`: a predicate that validates a value and then throws
// it away, so every consumer had to go back to the object and read the field AGAIN to use it.
// `weeklyForCopy` therefore read `open` four times and `close` four times. For a plain data
// object every read is equal — which is why A-20's argument held and why all 53 of QA's parser
// shapes agreed — but for an **accessor property** they are four different values, and the entry
// that passed the check is not the entry that crosses. That is R15-1's exact harm, on the person
// boundary A-15 and A-18 were written to close, reached through the construction that closed it.
//
// The injected fault is `flipping` (§0.5): a getter that returns a different value per read,
// with the last value repeating forever so that a call site's read COUNT cannot change the
// outcome. The population is a document built **in memory past the type system** — `JSON.parse`
// produces own data properties and never accessors — i.e. exactly the population
// `place_hours_malformed` was ratified for.
//
// A-21's search found seven more sites in six functions beyond the one R17-1 named; every one
// below was measured against the shipped body before the fix, and each is one of the ruling's
// six named mutations.
// ---------------------------------------------------------------------------

/** A getter that returns a different value on each read — A-21's injected fault. The last value
 *  repeats forever, so a call site's read COUNT cannot change the outcome. */
function flipping<T>(values: readonly T[]): () => T {
  let i = 0;
  return () => { const v = values[Math.min(i, values.length - 1)] as T; i += 1; return v; };
}

/**
 * Installs `key` on `base` as an enumerable accessor over `values`, and hands back a read
 * counter.
 *
 * The counter is what actually pins A-21, and the flipping values alone are not: the values
 * below are calibrated to the read COUNT of the shipped pre-A-21 body, so a mutation that
 * re-reads the field once more still lands on a benign value and the value assertion survives
 * it. `reads()` is the rule stated literally — *a field of a caller-supplied value is read
 * exactly once* — and it is what turns "re-read `e.open`" and "re-read `c.display`" red.
 */
function withAccessor<T extends object>(
  base: T, key: string, values: readonly unknown[],
): { value: T; reads: () => number } {
  let n = 0;
  const next = flipping(values);
  Object.defineProperty(base, key, {
    enumerable: true, configurable: true, get: () => { n += 1; return next(); },
  });
  return { value: base, reads: () => n };
}

const A21_PIN = 'Front door PIN 0754, conf 5814731574';

test('A-21 R17-1: a weekly entry whose `open` is an ACCESSOR crosses as the value that was VALIDATED', () => {
  // Four reads of `open` in the shipped body: inside `isWeeklyEntry`, inside `redacted(e.open)`,
  // in the `!==` comparison, and in the object it returned. So the fourth value is the one that
  // used to reach the recipient's document.
  const open = withAccessor({ day: 1, close: '17:00' }, 'open', ['9:00', '9:00', '9:00', A21_PIN]);
  const source = castWithHours({ weekly: [open.value] });
  const after = copyAcross(jacobsTarget('a21a'), source, 'a21a');

  assert.equal(open.reads(), 1, 'A-21: `open` must be read exactly once for the whole copy');
  assert.equal(
    after.places[0].hours!.weekly[0]!.open, '9:00',
    'the copy emitted a read of `open` that no shape check ever saw — R17-1',
  );
  const doc = toJSON(after);
  for (const needle of ['0754', '5814731574']) {
    assert.equal(doc.includes(needle), false, `${needle} crossed the person boundary through hours.weekly[0].open`);
  }
  // `close` is the same field one column over, and it flips the same way.
  const close = withAccessor({ day: 1, open: '9:00' }, 'close', ['17:00', '17:00', '17:00', A21_PIN]);
  const after2 = copyAcross(jacobsTarget('a21b'), castWithHours({ weekly: [close.value] }), 'a21b');
  assert.equal(close.reads(), 1, 'A-21: `close` must be read exactly once for the whole copy');
  assert.equal(after2.places[0].hours!.weekly[0]!.close, '17:00');
  assert.equal(toJSON(after2).includes('0754'), false);
});

test('A-21: `cost.display` is the same leak, unfiled — A-18\'s own field by A-18\'s own construction', () => {
  // `display` ×4: `c.display === null`, `redacted(c.display)`, `=== c.display`, `? c.display`.
  const t = sourceWithFullStop();
  const day = t.days.find((d) => d.id === '2026-08-07')!;
  const stop = day.stops[0];
  const display = withAccessor(
    { amounts: stop.cost!.amounts, note: stop.cost!.note } as unknown as CostEstimate,
    'display', ['€25', '€25', '€25', 'conf 5814731574'],
  );
  const cost = display.value;
  const source: Trip = {
    ...t,
    days: t.days.map((d) => (d.id !== '2026-08-07' ? d : { ...d, stops: [{ ...stop, cost }] })),
  };

  const after = copyAcross(jacobsTarget('a21c'), source, 'a21c');
  const copy = copiedStop(after);
  assert.equal(display.reads(), 1, 'A-21: `cost.display` must be read exactly once for the whole copy');
  assert.equal(copy.cost!.display, '€25', 'the display that was redaction-checked is not the one that crossed');
  assert.deepEqual(
    copy.cost!.amounts, [{ lo: 10, hi: 20, currency: 'EUR', basis: 'per_person' }],
    'the price itself must be unmoved — A-18 keeps `amounts` intact so `costLabel` still has a figure',
  );
  assert.equal(toJSON(after).includes('5814731574'), false, 'a booking reference crossed through cost.display');
});

test('A-21: a flipping `cost.amounts` does not throw out of copyStopInto — §2.1', () => {
  // `amounts` ×2: `Array.isArray(c.amounts)` said "array", `c.amounts` handed back a string, and
  // `.map is not a function` came out of a function §2.1 says does not throw on a document.
  const t = sourceWithFullStop();
  const day = t.days.find((d) => d.id === '2026-08-07')!;
  const stop = day.stops[0];
  const amounts = withAccessor(
    { display: '€25', note: 'tickets at the door' } as unknown as CostEstimate,
    'amounts', [[{ lo: 1, hi: 2, currency: 'EUR', basis: 'per_person' }], 'nope'],
  );
  const source: Trip = {
    ...t,
    days: t.days.map((d) => (d.id !== '2026-08-07' ? d : { ...d, stops: [{ ...stop, cost: amounts.value }] })),
  };
  let after: Trip;
  assert.doesNotThrow(() => { after = copyAcross(jacobsTarget('a21d'), source, 'a21d'); });
  assert.equal(amounts.reads(), 1, 'A-21: `cost.amounts` must be read exactly once for the whole copy');
  assert.deepEqual(copiedStop(after!).cost!.amounts, [{ lo: 1, hi: 2, currency: 'EUR', basis: 'per_person' }]);
});

test('A-21: a flipping `hours.weekly` does not throw — R15-2\'s closure, held on an accessor', () => {
  // `weekly` ×2 in `hoursForCopy`: `Array.isArray(o.weekly)` then `o.weekly.map(...)`.
  const weekly = withAccessor({} as Record<string, unknown>, 'weekly', [[], 'nope']);
  const source = castWithHours(weekly.value);
  let after: Trip;
  assert.doesNotThrow(
    () => { after = copyAcross(jacobsTarget('a21e'), source, 'a21e'); },
    'TypeError: o.weekly.map is not a function — R15-2 reopened on a getter',
  );
  assert.equal(weekly.reads(), 1, 'A-21: `hours.weekly` must be read exactly once for the whole copy');
  assert.deepEqual(after!.places[0].hours!.weekly, [], 'the array that was tested is the array that was mapped');
});

test('A-21: a flipping `Place.at` does not throw, and the coordinate that crosses is the one that was checked', () => {
  // `p.at` ×3 in `placeForCopy`: `p.at === null`, `p.at.lat`, `p.at.lng`. Read 1 said "not
  // null", read 2 was `null`, and `Cannot read properties of null (reading 'lat')` came out.
  //
  // Three values, not two: `copyStopInto`'s A-14 block reads `original.at` once ahead of this,
  // to build the `refiled` probe `samePlace` compares against, so the first value is consumed
  // there and `placeForCopy` sees values 2 and 3. That pair is A-21a's ONE written-down
  // exception (its read-count table, row "re-filed, new row written"): `placeForCopy` takes a
  // `Place` and reads it, and closing the gap would classify half of `Place`'s fields at the
  // call site — which is exactly what A-15's single classification point forbids.
  const t = sourceWithFullPlace('ordinary prose');
  const at = withAccessor(
    { ...t.places[0] } as Place, 'at',
    [{ lat: 1, lng: 2 }, { lat: 1, lng: 2 }, null] as unknown[],
  );
  const source: Trip = { ...t, places: [at.value] };

  let after: Trip;
  assert.doesNotThrow(
    () => { after = copyAcross(jacobsTarget('a21f'), source, 'a21f'); },
    'a getter on `at` threw a raw TypeError out of copyStopInto',
  );
  // TWO, not one, and the second is A-21a's disclosed exception rather than an oversight: one
  // read is A-14's `refiled` probe, one is `placeForCopy`'s, and never two inside one function.
  // Two is the CEILING, and A-21a refuses to drive it to 1 — a builder who does has changed
  // `placeForCopy`'s contract. A third read is `placeForCopy` re-reading, and that is the
  // mutation. Step 3, where A-21a did move the count (3 → 1), is the test above.
  assert.equal(at.reads(), 2, 'A-21: `placeForCopy` reads `at` once; A-14\'s `refiled` probe is the other');
  assert.deepEqual(
    after!.places[0].at, { lat: 1, lng: 2 },
    'the coordinate that was null-checked must be the coordinate that crosses',
  );
});

test('A-21a: on A-14 step 3, `original.at` is read ONCE — no throw, and the checked coordinate crosses', () => {
  // A-21 Part 4 printed the place block as `/* … verbatim … */` and therefore left it reading
  // `original.at` THREE times on the step-3 path: the `=== null` test, then `.lat`, then `.lng`.
  // Measured on the shipped body (A-21a, revision 16 addendum):
  //
  //   at flips [{1,2}, null]  → TypeError: Cannot read properties of null (reading 'lat'), 2 reads
  //   at flips [{1,2}, {3,4}] → copies {kind:'inline', at:{lat:3,lng:4}}, 3 reads
  //
  // The second is the one that decides it: a coordinate no `null` test ever saw, crossing a
  // person boundary — A-21's subject sentence, not a crash. Step 3 is live here because the
  // target has no city that answers to the source city's name (A-14 assertion 3's fixture).
  const stepThree = (values: readonly unknown[]) => {
    const t = sourceWithPlace({ name: 'Split', centre: SPLIT }, { name: 'Blue Cave, Biševo', at: BLUE_CAVE });
    const at = withAccessor({ ...t.places[0] } as Place, 'at', values);
    const target = mintedTrip('trip-tgt', 'user:jacob', 'tgt', [{ name: 'Prague', centre: PRAGUE }]);
    return { at, source: { ...t, places: [at.value] } as Trip, target };
  };

  const nulls = stepThree([{ lat: 1, lng: 2 }, null]);
  let afterNull: Trip;
  assert.doesNotThrow(
    () => { afterNull = copyAcross(nulls.target, nulls.source, 'a21i'); },
    'a getter on `at` threw a raw TypeError out of copyStopInto on A-14 step 3',
  );
  assert.equal(nulls.at.reads(), 1, 'A-21a: step 3 reads `original.at` exactly once');
  assert.deepEqual(
    copiedStop(afterNull!).place, { kind: 'inline', at: { lat: 1, lng: 2 } },
    'step 3 must keep the coordinate the `null` test actually saw',
  );
  assert.equal(afterNull!.places.length, 0, 'step 3 still files no Place row — A-14 is unchanged');

  const flips = stepThree([{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }]);
  const afterFlip = copyAcross(flips.target, flips.source, 'a21j');
  assert.equal(flips.at.reads(), 1, 'A-21a: step 3 reads `original.at` exactly once');
  assert.deepEqual(
    copiedStop(afterFlip).place, { kind: 'inline', at: { lat: 1, lng: 2 } },
    'a coordinate no `null` test ever saw crossed the person boundary — A-21\'s subject sentence',
  );
});

test('A-21: an out-of-union `place` kind copies as `{kind:\'none\'}` — the alias needed no getter at all', () => {
  // The ternary's fallthrough was `: src.place`, so a cast-built link with a `kind` outside the
  // union put the SOURCE's own object — with every key it carried — into the target document.
  // A-18 position 2 forbids a spread of a source record at any depth; an alias of one is worse.
  const t = sourceWithFullStop();
  const day = t.days.find((d) => d.id === '2026-08-07')!;
  const stop = day.stops[0];
  const hostileLink = { kind: 'nope', pin: `${A21_PIN} - ask for jacob@example.com` };
  const link = withAccessor({ ...stop } as Stop, 'place', [hostileLink]);
  const source: Trip = {
    ...t,
    days: t.days.map((d) => (d.id !== '2026-08-07' ? d : { ...d, stops: [link.value] })),
  };

  const after = copyAcross(jacobsTarget('a21g'), source, 'a21g');
  const copy = copiedStop(after);
  assert.equal(link.reads(), 1, 'A-21: `src.place` was read five times; it is read once');
  assert.deepEqual(copy.place, { kind: 'none' }, 'the hole is the DEFAULT; every branch overwrites it deliberately');
  assert.notEqual(copy.place, hostileLink, 'the source\'s own PlaceLink object was aliased into the recipient');
  const doc = toJSON(after);
  for (const needle of ['0754', '5814731574', 'jacob@example.com']) {
    assert.equal(doc.includes(needle), false, `${needle} crossed inside an aliased PlaceLink`);
  }
});

test('A-21 Part 4(c): a flipping `placement.cityKey` files the stop under the key that was VALIDATED', () => {
  // A-19 validates `placement.cityKey` against `target.cities` and then emitted a SECOND read of
  // it into the document, so the throw and the emission could see different values — and the
  // recipient's document acquires `pool_stop_unknown_city`, the uncleanable issue A-19 exists to
  // prevent. Three values because the shipped body reads it once against `TRANSIT_CITY_KEY` and
  // once per city inside `target.cities.some(...)`; the target here has exactly one city.
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  const target = jacobsTarget('a21h');
  const good = target.cities[0].key;
  const bad = 'city-the-target-does-not-have';
  assert.equal(target.cities.some((c) => c.key === bad), false, 'the fixture must name a key the target lacks');

  const cityKey = withAccessor({ kind: 'pool' } as unknown as StopPlacement, 'cityKey', [good, good, bad]);
  let after: Trip;
  assert.doesNotThrow(
    () => { after = copyStopInto(target, { trip: source, stopId: 's-src' }, cityKey.value, COPY_CTX('a21h')); },
  );
  assert.equal(cityKey.reads(), 1, 'A-21 Part 4(c): the throw and the emission must see one read');
  assert.deepEqual(after!.pool[0].placement, { kind: 'pool', cityKey: good }, 'filed under the key that was checked');
  assert.deepEqual(
    validateTrip(after!).filter((i) => i.code === 'pool_stop_unknown_city'), [],
    'the recipient inherited an error they did not cause — A-19\'s whole subject',
  );

  // A-19's rules are otherwise untouched: same throws, same messages, same TRANSIT exemption.
  assert.throws(
    () => copyStopInto(target, { trip: source, stopId: 's-src' },
      { kind: 'pool', cityKey: bad }, COPY_CTX('a21i')),
    new RegExp(`no such city ${bad} in trip-tgt`),
  );
  const transit = copyStopInto(target, { trip: source, stopId: 's-src' },
    { kind: 'pool', cityKey: TRANSIT_CITY_KEY }, COPY_CTX('a21j'));
  assert.deepEqual(transit.pool[0].placement, { kind: 'pool', cityKey: TRANSIT_CITY_KEY });
});

test('A-21 Part 4(c), disclosed consequence: an out-of-union placement `kind` is now REFUSED, not coerced', () => {
  // `qa/r16-copy-depth.mjs` §3.5 measured the old behaviour and recorded it as *"confirmed, not
  // filed"*: a `{kind:'nonsense'}` placement fell past A-19's city check (which tested
  // `kind === 'pool'` first) and then landed on the rebuild ternary's else-arm, writing
  // `{kind:'pool', cityKey: undefined}` into the recipient's document — a filing nothing badges.
  //
  // A-21 Part 4(c) merges the check and the rebuild into ONE branch on the discriminant, so the
  // else-arm now validates `cityKey` before it emits it and `undefined` is refused. This is a
  // behaviour change on an argument the type system forbids, it is a direct consequence of the
  // body A-21 prints rather than a choice made here, and §2.1 calls an out-of-union argument
  // programmer error either way — refusing it is what §2.1 prescribes. **The probe's §3.5 line
  // therefore goes red and is reported to QA rather than edited** (A-19 assertion 7). Pinned here
  // so the change is deliberate and visible rather than an unobserved side effect.
  const source = sourceWithPlace({ name: 'Vienna', centre: VIENNA }, { name: 'Belvedere', at: BELVEDERE });
  const target = jacobsTarget('a21k');
  const before = toJSON(target);
  assert.throws(
    () => copyStopInto(target, { trip: source, stopId: 's-src' },
      { kind: 'nonsense', dayId: '2026-08-08', time: '11:00', order: 0 } as unknown as StopPlacement,
      COPY_CTX('a21l')),
    /no such city undefined in trip-tgt/,
  );
  assert.equal(toJSON(target), before, 'the target moved behind the throw');
});

// ---------------------------------------------------------------------------
// R17-2 (QA round 17) — A-20 added `hours: p.hours === undefined ? undefined : hours(p.hours)`
// to `toJSON` and nothing in the suite failed when it was reverted to `hours: p.hours`
// (mutation-verified at `909b4a3`: 593/593 green). The mutation is not a no-op — passing the
// value through unenumerated re-emits every key a cast-built document put on it, straight into
// the user's own backup file.
//
// The R15-2 test above already builds the cast fixture; this is the key-set assertion on the
// EXPORTED `hours` that the mutation actually turns red, plus the greppability line beside it.
// ---------------------------------------------------------------------------

test('R17-2: toJSON rebuilds `hours` field by field — an unenumerated key is not re-emitted', () => {
  const secret = `${A21_PIN} - ask for jacob@example.com`;
  const source = castWithHours({
    weekly: [{ day: 1, open: '09:00', close: '17:00', secret }],
    note: 'closed in winter',
    // NOT `CREDENTIAL_HREF`: `sourceWithFullPlace` already carries that in the place's own
    // `links`, which this document is entitled to export. The needle has to be unique to the
    // key that must NOT survive, or the assertion measures the wrong field.
    extraKey: 'https://vendor.example/booking/ZZTOP99',
  });
  // The fixture must actually carry the unclassified keys, or it measures nothing.
  const raw = source.places[0].hours as unknown as Record<string, unknown>;
  assert.equal('extraKey' in raw, true);
  assert.equal('secret' in (raw.weekly as Record<string, unknown>[])[0], true);

  const doc = toJSON(source);
  const exported = JSON.parse(doc).places[0].hours;
  assert.deepEqual(
    Object.keys(exported.weekly[0]).sort(), ['close', 'day', 'open'],
    'an unclassified key on a weekly entry was re-emitted into the export',
  );
  assert.deepEqual(Object.keys(exported).sort(), ['note', 'weekly'], 'an unclassified key on `hours` was re-emitted');
  assert.equal(exported.note, 'closed in winter', 'the rebuild is not a wipe');
  for (const needle of ['0754', '5814731574', 'jacob@example.com', 'ZZTOP99']) {
    assert.equal(doc.includes(needle), false, `${needle} reached the user's own backup through toJSON's \`hours\``);
  }

  // The second property the rebuild exists for: the exported object does not ALIAS the in-memory
  // `weekly`. `toJSON` stringifies immediately, so it is measured the only way it is observable —
  // mutate the source's entry after the export and the export must not have moved.
  const before = toJSON(source);
  (raw.weekly as Record<string, unknown>[])[0].open = A21_PIN;
  assert.notEqual(toJSON(source), before, 'the fixture must be mutable, or the aliasing claim is untestable');
  assert.equal(before.includes(A21_PIN), false, 'the earlier export aliased the live weekly entry');
});
