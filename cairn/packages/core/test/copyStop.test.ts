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
  moveStop, needsBadge, rejectCandidate, removeStop, returnToPool, scheduleFromPool, sequentialIds,
  toJSON, fromJSON,
  updateStop, upsertBooking, validateTrip,
} from '../src/index.ts';
import type { BuildCtx, Stop, Trip } from '../src/index.ts';
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
