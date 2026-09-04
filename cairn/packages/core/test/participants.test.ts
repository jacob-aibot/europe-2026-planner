/**
 * The `Participant` record class — ARCHITECTURE **§8.3**, ROADMAP Phase 2 **I-9**.
 *
 * §8.3's whole claim is a negative one: **participation grants nothing.** A participant is a
 * statement about *who was on the trip*; access is `TripMember`/`TripShare`, location visibility
 * is `LocationShare`, a social relationship is `Connection`. Five edges (§8.7), never collapsed.
 * The tests at the bottom of this file are the mechanical form of that sentence.
 *
 * The record is **embedded in the trip document, not a second persisted structure** (§8.3, which
 * is §2.7 A-5's rejected option refused again for the same reasons). That is why round-trip
 * parity, deletion and undo need no new machinery here — the assertions for all three are
 * ordinary assertions about a `Trip`.
 *
 * `userId` is **permanently `null` until Phase 3** and that is correct, not a gap: there are no
 * accounts to link to. Two tests below pin it, because a field that is "null for now" is the
 * field a later caller quietly fills.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addParticipant, updateParticipant, removeParticipant,
  createTrip, ensureDays, addStop, copyStopInto, fromJSON, toJSON, validateTrip, sequentialIds,
  can, canView,
  TripParseError,
} from '../src/index.ts';
import type { BuildCtx, Issue, Participant, Trip } from '../src/index.ts';

const ctx = (): BuildCtx => ({ ids: sequentialIds(), now: '2026-03-01', actorUserId: 'local:self' });

function tripWithDays(): { trip: Trip; c: BuildCtx } {
  const c = ctx();
  const trip = createTrip(
    { title: 'Participant trip', startDate: '2026-03-01', endDate: '2026-03-03', cities: [{ key: 'wien', name: 'Vienna' }] },
    c,
  );
  return { trip: ensureDays(trip, c), c };
}

const codes = (issues: Issue[]) => issues.map((i) => i.code);
const of = (issues: Issue[], code: string) => issues.filter((i) => i.code === code);

/** A trip whose `participants` array was built past the type system — §2.9's stated population. */
function withParticipants(trip: Trip, participants: Participant[]): Trip {
  return { ...trip, participants };
}

const person = (id: string, displayName: string, kind: 'self' | 'contact' = 'contact'): Participant => ({
  id, displayName, kind, userId: null,
});

// ------------------------------------------------------------------ the field

test('a new trip carries an empty participants array', () => {
  const { trip } = tripWithDays();
  assert.deepEqual(trip.participants, []);
});

// -------------------------------------------------------------- addParticipant

test('addParticipant appends, mints an id, bumps revision once, and is pure', () => {
  const { trip, c } = tripWithDays();
  const before = trip.revision;
  const next = addParticipant(trip, { displayName: 'Ada' }, c);
  assert.equal(trip.participants.length, 0, 'addParticipant mutated its input');
  assert.equal(next.participants.length, 1);
  assert.equal(next.revision, before + 1);
  assert.equal(typeof next.participants[0].id, 'string');
  assert.notEqual(next.participants[0].id, '');
  assert.equal(next.participants[0].displayName, 'Ada');
});

test('addParticipant defaults kind to "contact" and userId to null', () => {
  const { trip, c } = tripWithDays();
  const p = addParticipant(trip, { displayName: 'Ada' }, c).participants[0];
  assert.equal(p.kind, 'contact');
  assert.equal(p.userId, null);
});

test('addParticipant honours an explicit kind:"self"', () => {
  const { trip, c } = tripWithDays();
  const p = addParticipant(trip, { displayName: 'Jacob', kind: 'self' }, c).participants[0];
  assert.equal(p.kind, 'self');
});

test('addParticipant keeps an optional note and omits it when absent', () => {
  const { trip, c } = tripWithDays();
  const withNote = addParticipant(trip, { displayName: 'Ada', note: 'her mother' }, c).participants[0];
  assert.equal(withNote.note, 'her mother');
  const without = addParticipant(trip, { displayName: 'Ada' }, c).participants[0];
  assert.equal(Object.prototype.hasOwnProperty.call(without, 'note'), false, 'an absent note became a present key');
});

/**
 * §8.3: `userId` is `null` *"until that person has an account AND the user links them"*, and
 * there are no accounts before Phase 3. The build function therefore does not read a supplied
 * one — this is the untyped caller every runtime guard in this project exists for (§2.1).
 */
test('addParticipant never sets userId, even when an untyped caller supplies one', () => {
  const { trip, c } = tripWithDays();
  const init = { displayName: 'Ada', userId: 'user-99' } as unknown as Parameters<typeof addParticipant>[1];
  const p = addParticipant(trip, init, c).participants[0];
  assert.equal(p.userId, null, 'a caller filled userId before Phase 3 exists to link it');
});

test('addParticipant mints its id from the injected factory and takes none from the caller', () => {
  const { trip, c } = tripWithDays();
  const init = { displayName: 'Ada', id: 'chosen' } as unknown as Parameters<typeof addParticipant>[1];
  const p = addParticipant(trip, init, c).participants[0];
  assert.notEqual(p.id, 'chosen', 'a caller chose a participant id, which is how a duplicate is minted');
});

test('addParticipant preserves order — the array is the order', () => {
  const { trip, c } = tripWithDays();
  let t = trip;
  for (const n of ['Ada', 'Grace', 'Edsger']) t = addParticipant(t, { displayName: n }, c);
  assert.deepEqual(t.participants.map((p) => p.displayName), ['Ada', 'Grace', 'Edsger']);
});

// ----------------------------------------------------------- updateParticipant

test('updateParticipant patches displayName, kind and note, bumps revision once, and is pure', () => {
  const { trip, c } = tripWithDays();
  const added = addParticipant(trip, { displayName: 'Ada' }, c);
  const id = added.participants[0].id;
  const next = updateParticipant(added, id, { displayName: 'Ada L.', kind: 'self', note: 'me' });
  assert.equal(added.participants[0].displayName, 'Ada', 'updateParticipant mutated its input');
  assert.equal(next.participants[0].displayName, 'Ada L.');
  assert.equal(next.participants[0].kind, 'self');
  assert.equal(next.participants[0].note, 'me');
  assert.equal(next.revision, added.revision + 1);
});

test('updateParticipant throws for an id the trip does not have', () => {
  const { trip, c } = tripWithDays();
  const added = addParticipant(trip, { displayName: 'Ada' }, c);
  assert.throws(() => updateParticipant(added, 'nope', { displayName: 'x' }), /updateParticipant: no such participant/);
});

test('updateParticipant refuses to patch id or userId, even with an undefined value', () => {
  const { trip, c } = tripWithDays();
  const added = addParticipant(trip, { displayName: 'Ada' }, c);
  const id = added.participants[0].id;
  for (const key of ['id', 'userId']) {
    assert.throws(
      () => updateParticipant(added, id, { [key]: undefined } as unknown as Parameters<typeof updateParticipant>[2]),
      new RegExp(`updateParticipant: "${key}" may not be patched`),
      `${key} was patchable`,
    );
  }
});

// ----------------------------------------------------------- removeParticipant

test('removeParticipant removes the row, bumps revision once, and is pure', () => {
  const { trip, c } = tripWithDays();
  let t = addParticipant(trip, { displayName: 'Ada' }, c);
  t = addParticipant(t, { displayName: 'Grace' }, c);
  const id = t.participants[0].id;
  const next = removeParticipant(t, id);
  assert.equal(t.participants.length, 2, 'removeParticipant mutated its input');
  assert.deepEqual(next.participants.map((p) => p.displayName), ['Grace']);
  assert.equal(next.revision, t.revision + 1);
});

test('removeParticipant throws for an id the trip does not have', () => {
  const { trip, c } = tripWithDays();
  const added = addParticipant(trip, { displayName: 'Ada' }, c);
  assert.throws(() => removeParticipant(added, 'nope'), /removeParticipant: no such participant/);
});

/** §8.3's *"deletion … comes for free"*: nothing outside the array refers to a participant. */
test('removing a participant leaves the rest of the document untouched', () => {
  const { trip, c } = tripWithDays();
  const added = addParticipant(trip, { displayName: 'Ada' }, c);
  const next = removeParticipant(added, added.participants[0].id);
  assert.deepEqual(next.days, added.days);
  assert.deepEqual(next.pool, added.pool);
  assert.deepEqual(next.places, added.places);
  assert.deepEqual(next.bookings, added.bookings);
});

// -------------------------------------------------------------- serialization

test('toJSON writes participants even when empty, so the round trip is byte-identical from the first save', () => {
  const { trip } = tripWithDays();
  const doc = JSON.parse(toJSON(trip)) as Record<string, unknown>;
  assert.deepEqual(doc.participants, []);
  assert.equal(toJSON(fromJSON(toJSON(trip))), toJSON(trip));
});

test('the round trip is byte-identical with participants present', () => {
  const { trip, c } = tripWithDays();
  let t = addParticipant(trip, { displayName: 'Jacob', kind: 'self' }, c);
  t = addParticipant(t, { displayName: 'Zoë', note: 'her mother' }, c);
  t = addParticipant(t, { displayName: '🐈' }, c);
  const once = toJSON(t);
  assert.equal(toJSON(fromJSON(once)), once, 'the document does not survive a round trip byte-for-byte');
  assert.deepEqual(fromJSON(once).participants, t.participants);
});

test('a document with no participants key parses to an empty array', () => {
  const { trip } = tripWithDays();
  const doc = JSON.parse(toJSON(trip)) as Record<string, unknown>;
  delete doc.participants;
  assert.deepEqual(fromJSON(JSON.stringify(doc)).participants, []);
});

/**
 * ROADMAP I-9's *"`fromJSON` rejects a document with a duplicate participant id"*.
 *
 * The refusal carries the JSON path, which is the whole point of hand-rolled parsing here.
 */
test('fromJSON rejects a document with a duplicate participant id, naming the path', () => {
  const { trip, c } = tripWithDays();
  const t = addParticipant(trip, { displayName: 'Ada' }, c);
  const doc = JSON.parse(toJSON(t)) as Record<string, unknown>;
  (doc.participants as unknown[]).push(JSON.parse(JSON.stringify((doc.participants as unknown[])[0])));
  let err: unknown = null;
  try { fromJSON(JSON.stringify(doc)); } catch (e) { err = e; }
  assert.ok(err instanceof TripParseError, 'a duplicate participant id parsed cleanly');
  assert.equal((err as TripParseError).path, '$.participants[1].id');
});

test('fromJSON rejects an unknown participant kind', () => {
  const { trip, c } = tripWithDays();
  const doc = JSON.parse(toJSON(addParticipant(trip, { displayName: 'Ada' }, c))) as any;
  doc.participants[0].kind = 'ghost';
  assert.throws(() => fromJSON(JSON.stringify(doc)), (e: unknown) =>
    e instanceof TripParseError && e.path === '$.participants[0].kind');
});

test('fromJSON rejects a non-string participant displayName', () => {
  const { trip, c } = tripWithDays();
  const doc = JSON.parse(toJSON(addParticipant(trip, { displayName: 'Ada' }, c))) as any;
  doc.participants[0].displayName = 7;
  assert.throws(() => fromJSON(JSON.stringify(doc)), (e: unknown) =>
    e instanceof TripParseError && e.path === '$.participants[0].displayName');
});

/** §8.3: `userId` is `UserId | null` in the type and a *later* build may write one. */
test('fromJSON round-trips a participant carrying a userId a later build wrote', () => {
  const { trip, c } = tripWithDays();
  const doc = JSON.parse(toJSON(addParticipant(trip, { displayName: 'Ada' }, c))) as any;
  doc.participants[0].userId = 'user-7';
  const parsed = fromJSON(JSON.stringify(doc));
  assert.equal(parsed.participants[0].userId, 'user-7');
  assert.equal(toJSON(parsed), JSON.stringify(doc, null, 2));
});

// ---------------------------------------------------------------- validateTrip

test('a trip with participants validates clean', () => {
  const { trip, c } = tripWithDays();
  let t = addParticipant(trip, { displayName: 'Jacob', kind: 'self' }, c);
  t = addParticipant(t, { displayName: 'Ada' }, c);
  assert.deepEqual(
    codes(validateTrip(t)).filter((x) => x.startsWith('participant') || x.startsWith('duplicate_participant')),
    [],
  );
});

/** Injected fault 1 — `duplicate_participant_id`. */
test('validateTrip reports duplicate_participant_id for two participants sharing one id', () => {
  const { trip } = tripWithDays();
  const t = withParticipants(trip, [person('p1', 'Ada'), person('p1', 'Grace')]);
  const hits = of(validateTrip(t), 'duplicate_participant_id');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].level, 'error');
  assert.equal(hits[0].params.participantId, 'p1');
  assert.equal(hits[0].ref.kind, 'trip');
});

/** The fault removed: the same two people with distinct ids are clean. */
test('validateTrip is silent when the same two people carry distinct ids', () => {
  const { trip } = tripWithDays();
  const t = withParticipants(trip, [person('p1', 'Ada'), person('p2', 'Grace')]);
  assert.deepEqual(of(validateTrip(t), 'duplicate_participant_id'), []);
});

/** Injected fault 2 — `participant_name_empty`. */
test('validateTrip reports participant_name_empty for a blank displayName', () => {
  const { trip } = tripWithDays();
  const t = withParticipants(trip, [person('p1', '')]);
  const hits = of(validateTrip(t), 'participant_name_empty');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].level, 'error');
  assert.equal(hits[0].params.participantId, 'p1');
});

test('validateTrip reports participant_name_empty for a whitespace-only displayName', () => {
  const { trip } = tripWithDays();
  const t = withParticipants(trip, [person('p1', '   \t ')]);
  assert.equal(of(validateTrip(t), 'participant_name_empty').length, 1);
});

test('a participant issue message never prints the opaque participant id', () => {
  const { trip } = tripWithDays();
  const t = withParticipants(trip, [person('p1-opaque', ''), person('dup', 'A'), person('dup', 'B')]);
  for (const i of validateTrip(t)) {
    if (!i.code.includes('participant')) continue;
    assert.doesNotMatch(i.message, /p1-opaque|dup/, `an id reached a rendered sentence: ${i.message}`);
  }
});

/** Injected fault 3 — the third check, riding on the first two's mechanism (§8.3). */
test('validateTrip reports a second kind:"self" as duplicate_participant_id', () => {
  const { trip } = tripWithDays();
  const t = withParticipants(trip, [person('p1', 'Jacob', 'self'), person('p2', 'Also Jacob', 'self')]);
  const hits = of(validateTrip(t), 'duplicate_participant_id');
  assert.equal(hits.length, 1, 'two participants both claim to be the trip owner and nothing said so');
  assert.equal(hits[0].level, 'error');
  assert.match(hits[0].message, /self|owner|you/i);
});

test('exactly one kind:"self" is clean', () => {
  const { trip } = tripWithDays();
  const t = withParticipants(trip, [person('p1', 'Jacob', 'self'), person('p2', 'Ada')]);
  assert.deepEqual(of(validateTrip(t), 'duplicate_participant_id'), []);
});

/**
 * **Zero `'self'` is legal and must stay legal.** §8.3 says *"at most one"*, never "exactly
 * one": a trip recorded on someone else's behalf, or one the user simply has not marked, is an
 * ordinary trip. A rule that required one would fire on every trip that exists today.
 */
test('zero kind:"self" is clean — §8.3 says at most one, never exactly one', () => {
  const { trip } = tripWithDays();
  const t = withParticipants(trip, [person('p1', 'Ada'), person('p2', 'Grace')]);
  assert.deepEqual(of(validateTrip(t), 'duplicate_participant_id'), []);
  assert.deepEqual(of(validateTrip(t), 'participant_name_empty'), []);
});

// ------------------------------------------------------------------ attack list

test('attack: 200 participants on one trip validate clean and round-trip byte-identically', () => {
  const { trip, c } = tripWithDays();
  let t = trip;
  for (let i = 0; i < 200; i++) t = addParticipant(t, { displayName: `person ${i}` }, c);
  assert.equal(t.participants.length, 200);
  assert.equal(new Set(t.participants.map((p) => p.id)).size, 200, 'the factory minted a duplicate id');
  const issues = validateTrip(t).filter((i) => i.code.includes('participant'));
  assert.deepEqual(issues, []);
  const once = toJSON(t);
  assert.equal(toJSON(fromJSON(once)), once);
});

test('attack: two participants with the same name and different ids are allowed', () => {
  const { trip, c } = tripWithDays();
  let t = addParticipant(trip, { displayName: 'Alex' }, c);
  t = addParticipant(t, { displayName: 'Alex' }, c);
  assert.notEqual(t.participants[0].id, t.participants[1].id);
  assert.deepEqual(validateTrip(t).filter((i) => i.code.includes('participant')), []);
});

/**
 * A name that is only an emoji is **allowed**: `participant_name_empty`'s rule is emptiness, and
 * its argument (§8.3) is that a nameless participant *"can never be re-identified"*. `🐈` is a
 * name its author can re-identify. Refusing it would be a script policy nobody ruled, and it
 * would refuse a great deal of legitimate non-Latin text along the way.
 */
test('attack: a displayName that is only an emoji is allowed and survives the round trip', () => {
  const { trip, c } = tripWithDays();
  const t = addParticipant(trip, { displayName: '🐈' }, c);
  assert.deepEqual(of(validateTrip(t), 'participant_name_empty'), []);
  const parsed = fromJSON(toJSON(t));
  assert.equal(parsed.participants[0].displayName, '🐈');
});

/**
 * **A measured limitation, recorded so it is a decision rather than an accident.**
 *
 * U+200B ZERO WIDTH SPACE is not whitespace under `String.prototype.trim`, so a name made only
 * of it is non-empty and is **allowed** — it renders as a ghost row, which is the harm §8.3
 * names. It is allowed anyway, and deliberately: the rule here is emptiness and it is the same
 * `.trim()` `city_name_empty` has used since A-10, so widening one and not the other would put
 * two different answers to *"is this a name"* in one file. Widening **both** is a rule about
 * invisible characters that nobody has ruled, and it would start refusing legitimate text
 * (joiners, marks, formatting characters) in scripts this project has not thought about.
 *
 * If a real ghost row ever arrives, this test is the place the finding lands.
 */
test('attack: a zero-width-space-only displayName is allowed — the rule is emptiness, and U+200B is not empty', () => {
  const { trip } = tripWithDays();
  const t = withParticipants(trip, [person('p1', '​')]);
  assert.deepEqual(of(validateTrip(t), 'participant_name_empty'), []);
  assert.equal('​'.trim(), '​', 'trim() started removing U+200B, so the rule above moved');
  // The same string in a city name is treated identically — one answer, not two.
  const withCity = { ...trip, cities: [{ ...trip.cities[0], name: '​' }] };
  assert.deepEqual(of(validateTrip(withCity), 'city_name_empty'), []);
});

// ---------------------------------------------------------------- the copy path

/**
 * §2.14's social primitive copies a **stop**, and a participant is not part of one. Asserted on
 * the OUTPUT rather than by counting reads — `readOnce.test.ts` holds `participants` bare in
 * `TRIP_SKELETON` and points here, exactly as it does for `photos`.
 *
 * It matters beyond tidiness: a participant carried across a copy would name a third party on a
 * trip they were never on, which is the assertion §8.3's separation exists to make impossible.
 */
test('copyStopInto carries no participant', () => {
  const c = ctx();
  const source = (() => {
    const { trip, c: c2 } = tripWithDays();
    const withStop = addStop(
      trip,
      { kind: 'scheduled', dayId: '2026-03-02', time: '09:00', order: 0 },
      { name: 'Prater', category: 'sight' },
      c2,
    );
    const stopId = withStop.days.find((d) => d.id === '2026-03-02')!.stops[0].id;
    return { trip: addParticipant(withStop, { displayName: 'Zoë' }, c2), stopId };
  })();
  const target = createTrip({ id: 'target', title: 'Other', startDate: '2026-04-01', endDate: '2026-04-02' }, c);
  const copied = copyStopInto(
    target,
    { trip: source.trip, stopId: source.stopId },
    { kind: 'scheduled', dayId: '2026-04-01', time: '09:00', order: 0 },
    { ids: c.ids, today: '2026-04-01', actorUserId: 'local:self' },
  );
  assert.deepEqual(copied.participants, [], 'a participant crossed the copy boundary');
  assert.equal(copied.days[0].stops.length, 1, 'INCONCLUSIVE: the stop itself did not copy');
});

// ------------------------------------------------------------------ undo depth

/**
 * ROADMAP I-9: *"undo/redo restores participants exactly at depth 50."* History is a `Trip`
 * snapshot (§4.2 rule 5), which is exactly what embedding in the document buys — see §8.3.
 * `packages/client/test/participants.test.ts` runs the same claim through the real store.
 */
test('a participant list survives 50 snapshots taken and restored', () => {
  const { trip, c } = tripWithDays();
  const snapshots: Trip[] = [];
  let t: Trip = trip;
  for (let i = 0; i < 50; i++) {
    snapshots.push(t);
    t = addParticipant(t, { displayName: `person ${i}` }, c);
  }
  assert.equal(t.participants.length, 50);
  assert.deepEqual(snapshots[0].participants, [], 'the oldest snapshot acquired participants it never had');
  assert.equal(snapshots[10].participants.length, 10, 'a mid-stack snapshot does not hold its own generation');
  assert.equal(t.participants[49].displayName, 'person 49');
});

// -------------------------------------------------- participation grants nothing

/**
 * §8.3's central sentence, mechanically: **participation grants nothing — not a read, not a
 * comment, not a coordinate.** The strongest available form of the claim is structural: the
 * access predicates take a `Relationship`, which has no participant field at all, so there is no
 * expression a participant can appear in. This asserts the observable half of that.
 */
test('a participant who is neither owner, member nor share holder is denied every operation', () => {
  const { trip, c } = tripWithDays();
  const t = addParticipant(trip, { displayName: 'Zoë' }, c);
  assert.equal(t.participants[0].userId, null, 'a participant has no account to be a principal with');
  // The person exists on the trip; give them the account they will one day have and check that
  // being on the trip still buys nothing.
  const principal = { kind: 'user' as const, userId: 'user-zoe' };
  const rel = { tripId: t.id, ownerId: t.ownerId };
  for (const op of ['view', 'comment', 'edit', 'share', 'delete'] as const) {
    assert.equal(can(op, principal, rel, '2026-03-01'), false, `participation granted ${op}`);
  }
  assert.equal(canView(principal, rel, '2026-03-01'), false);
});

test('the access Relationship has no participant field to read', () => {
  // A type-level claim needs a runtime witness: `canView` is a pure function of the
  // relationship, so handing it a relationship carrying participants may not change its answer.
  const principal = { kind: 'user' as const, userId: 'user-zoe' };
  const bare = { tripId: 't1', ownerId: 'local:self' };
  const stuffed = { ...bare, participants: [person('p1', 'Zoë')] } as unknown as typeof bare;
  assert.equal(canView(principal, stuffed, '2026-03-01'), canView(principal, bare, '2026-03-01'));
  assert.equal(canView(principal, stuffed, '2026-03-01'), false);
});
