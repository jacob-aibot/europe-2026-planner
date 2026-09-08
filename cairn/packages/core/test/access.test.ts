/**
 * The access predicates (ARCHITECTURE §6.2), and specifically F-13.
 *
 * These predicates are the definition Phase 2's RLS policies are generated from and tested
 * against. A permissive default here becomes a policy that fails open, so the tests below
 * are written from the direction of "what does it do when the caller is wrong", not "what
 * does it do when the caller is right".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  addParticipant, can, canComment, canDelete, canEdit, canShare, canView, createTrip,
  effectiveRole, sequentialIds,
} from '../src/index.ts';
// §2.10 revision 5 takes `isIsoDate` off the public surface — it is an internal of the
// validators that use it. Tests may import a core module path directly; tests do not create
// surface. BUILD-NOTES KD-33.
import { isIsoDate } from '../src/model/ids.ts';
import type { BuildCtx, Operation, Participant, Principal, Relationship } from '../src/index.ts';

const NOW = '2026-08-25';
const OWNER: Principal = { kind: 'user', userId: 'user:jacob' };
const FRIEND: Principal = { kind: 'user', userId: 'user:marta' };
const ANON: Principal = { kind: 'anonymous' };

/** A trip Jacob owns, with a viewer share to Marta that expired yesterday. */
const expiredShare: Relationship = {
  tripId: 'trip-1',
  ownerId: 'user:jacob',
  friendIds: ['user:marta'],
  shares: [{ principal: FRIEND, role: 'viewer', expiresAt: '2026-08-24' }],
};

test('an expired share grants nothing', () => {
  assert.equal(effectiveRole(FRIEND, expiredShare, NOW), null);
  assert.equal(canView(FRIEND, expiredShare, NOW), false);
});

test('a live share grants exactly its role', () => {
  const live: Relationship = {
    ...expiredShare,
    shares: [{ principal: FRIEND, role: 'viewer', expiresAt: '2026-09-01' }],
  };
  assert.equal(canView(FRIEND, live, NOW), true);
  assert.equal(canComment(FRIEND, live, NOW), false);
  assert.equal(canEdit(FRIEND, live, NOW), false);
  assert.equal(canShare(FRIEND, live, NOW), false);
  assert.equal(canDelete(FRIEND, live, NOW), false);
});

test('being a friend of the owner grants nothing by itself', () => {
  const noShare: Relationship = { tripId: 'trip-1', ownerId: 'user:jacob', friendIds: ['user:marta'] };
  assert.equal(canView(FRIEND, noShare, NOW), false);
});

// ---------------------------------------------------------------------------
// F-13. `now` is load-bearing: expiry is the only thing standing between an old
// link and the trip. A missing or malformed `now` used to make every expiry
// comparison false, which returned `true` from canView on an EXPIRED share.
// ---------------------------------------------------------------------------

const BAD_NOWS: unknown[] = [
  undefined,
  null,
  '',
  '2026-8-25',
  '25/08/2026',
  '2026-08-25T10:00:00Z',
  '2026-13-01',
  '2026-02-30',
  0,
  NaN,
  {},
];

for (const bad of BAD_NOWS) {
  test(`effectiveRole throws rather than failing open on now = ${JSON.stringify(bad)}`, () => {
    assert.throws(
      () => effectiveRole(FRIEND, expiredShare, bad as string),
      /YYYY-MM-DD/,
      `now = ${JSON.stringify(bad)} did not throw`,
    );
  });

  test(`no predicate returns true for an expired share when now = ${JSON.stringify(bad)}`, () => {
    for (const [name, fn] of [
      ['canView', canView],
      ['canComment', canComment],
      ['canEdit', canEdit],
      ['canShare', canShare],
      ['canDelete', canDelete],
    ] as const) {
      assert.throws(() => fn(FRIEND, expiredShare, bad as string), /YYYY-MM-DD/, `${name} failed open`);
    }
    for (const op of ['view', 'comment', 'edit', 'share', 'delete'] as const) {
      assert.throws(() => can(op, FRIEND, expiredShare, bad as string), /YYYY-MM-DD/, `can(${op}) failed open`);
    }
  });
}

test('a bad clock is refused even for the owner — the guard is on the argument, not the answer', () => {
  assert.throws(() => canView(OWNER, expiredShare, ''), /YYYY-MM-DD/);
  assert.throws(() => canView(ANON, expiredShare, undefined as unknown as string), /YYYY-MM-DD/);
});

test('isIsoDate validates the calendar, not the shape', () => {
  assert.equal(isIsoDate('2026-08-25'), true);
  assert.equal(isIsoDate('2024-02-29'), true, 'leap year');
  assert.equal(isIsoDate('2026-02-29'), false, 'not a leap year');
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('2026-13-45'), false);
  assert.equal(isIsoDate('2026-00-10'), false);
  assert.equal(isIsoDate('2026-04-31'), false);
  assert.equal(isIsoDate('2026-04-30'), true);
  assert.equal(isIsoDate(undefined), false);
  assert.equal(isIsoDate(20260825), false);
});

// ---------------------------------------------------------------------------
// The same argument as F-13, one field over: `expiresAt` and `revokedAt` are
// compared lexically against `now`, and a lexical compare on an unvalidated
// string is not a calendar comparison. `"9999-99-99"`, `"tomorrow"` and
// `"never"` all sort after a real `YYYY-MM-DD`, so all three read as "not yet
// expired" and GRANT access. §6.2.4 makes these predicates the definition the
// Phase 2 RLS policies are generated from; a definition that fails open
// generates a policy that fails open. BUILD-NOTES KD-29.
// ---------------------------------------------------------------------------

const MALFORMED_EXPIRY = ['9999-99-99', 'tomorrow', 'never', '2026-02-30', '25/08/2026', '2026-08-25T00:00:00Z'];

for (const bad of MALFORMED_EXPIRY) {
  test(`a share whose expiresAt is ${JSON.stringify(bad)} fails closed`, () => {
    const rel: Relationship = {
      tripId: 'trip-1',
      ownerId: 'user:jacob',
      shares: [{ principal: FRIEND, role: 'editor', expiresAt: bad }],
    };
    assert.equal(effectiveRole(FRIEND, rel, NOW), null, `expiresAt ${bad} granted a role`);
    for (const op of ['view', 'comment', 'edit', 'share', 'delete'] as const) {
      assert.equal(can(op, FRIEND, rel, NOW), false, `can(${op}) failed open on expiresAt ${bad}`);
    }
  });

  test(`a share whose revokedAt is ${JSON.stringify(bad)} fails closed`, () => {
    const rel: Relationship = {
      tripId: 'trip-1',
      ownerId: 'user:jacob',
      shares: [{ principal: FRIEND, role: 'editor', revokedAt: bad }],
    };
    assert.equal(effectiveRole(FRIEND, rel, NOW), null, `revokedAt ${bad} granted a role`);
  });
}

test('null, "" and absent still mean "no expiry" — the fix must not break the ordinary share', () => {
  const mk = (patch: Record<string, unknown>): Relationship => ({
    tripId: 'trip-1',
    ownerId: 'user:jacob',
    shares: [{ principal: FRIEND, role: 'viewer', ...patch }],
  });
  assert.equal(effectiveRole(FRIEND, mk({ expiresAt: null }), NOW), 'viewer');
  assert.equal(effectiveRole(FRIEND, mk({ expiresAt: '' }), NOW), 'viewer');
  assert.equal(effectiveRole(FRIEND, mk({}), NOW), 'viewer');
  assert.equal(effectiveRole(FRIEND, mk({ expiresAt: undefined }), NOW), 'viewer');
  assert.equal(effectiveRole(FRIEND, mk({ revokedAt: null }), NOW), 'viewer');
  assert.equal(effectiveRole(FRIEND, mk({ revokedAt: '' }), NOW), 'viewer');
  assert.equal(effectiveRole(FRIEND, mk({ expiresAt: '2026-09-01' }), NOW), 'viewer', 'a real future date still grants');
  assert.equal(effectiveRole(FRIEND, mk({ expiresAt: '2026-08-24' }), NOW), null, 'a real past date still expires');
  assert.equal(effectiveRole(FRIEND, mk({ expiresAt: NOW }), NOW), 'viewer', 'expiring today is not yet expired');
});

// ---------------------------------------------------------------------------
// EC-9, "Participation grants nothing, asserted mechanically" — the §6.2
// conformance set RUN TWICE, once with participants added to every trip and
// once without, over every (principal × relationship × operation) cell, with
// the two runs asserted identical. QA round 54 **R54-3**: the criterion's own
// mechanism did not exist — the property held (the breaker measured it by hand)
// but nothing in the suite would notice the day it stopped holding, which is
// the whole point of a conformance set.
//
// The claim under test is §8.3's central sentence and it is a NEGATIVE one: a
// participant is a statement about *who was on the trip*, and access is
// `TripMember`/`TripShare`. Structurally `Relationship` carries no participant
// field at all, so the strongest observable form of the sentence is that
// handing the predicates a relationship that carries participants anyway —
// the shape a future refactor that collapsed the two edges would produce —
// changes not one cell of the matrix.
//
// The denial is asserted **not to be passing for the wrong reason**: the same
// person is the owner of the fifth relationship shape and is granted every
// operation there, so "participants change nothing" is not "this principal can
// never do anything".
// ---------------------------------------------------------------------------

const ctx = (): BuildCtx => ({ ids: sequentialIds(), now: NOW, actorUserId: 'user:jacob' });

/**
 * Real participants, minted by the real build function — not hand-written records — so this
 * is *"participants added to every trip"* rather than a literal that could drift from what
 * `addParticipant` actually writes. One of them carries the `userId` §8.3 says a Phase 3
 * build may link, because a participant with no account cannot be a principal at all and the
 * criterion would be vacuous.
 */
function realParticipants(): Participant[] {
  const c = ctx();
  let trip = createTrip(
    { title: 'Matrix', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'wien', name: 'Vienna' }] },
    c,
  );
  trip = addParticipant(trip, { displayName: 'Zoë', note: 'her mother' }, c);
  trip = addParticipant(trip, { displayName: 'Jacob', kind: 'self' }, c);
  trip = addParticipant(trip, { displayName: 'Marta' }, c);
  // The link a later build is allowed to write (§8.3; `participants.test.ts` round-trips one).
  // `addParticipant` refuses to write it, which is why it is spread on here.
  return trip.participants.map((p, i) => (i === 0 ? { ...p, userId: PARTICIPANT_USER_ID } : p));
}

const CO_OWNER: Principal = { kind: 'user', userId: 'user:co' };
const EDITOR: Principal = { kind: 'user', userId: 'user:editor' };
const COMMENTER: Principal = { kind: 'user', userId: 'user:commenter' };
const VIEWER: Principal = { kind: 'user', userId: 'user:viewer' };
const REVOKED: Principal = { kind: 'user', userId: 'user:revoked' };
const STRANGER: Principal = { kind: 'user', userId: 'user:stranger' };
const LIVE_LINK: Principal = { kind: 'link', token: 'tok-live' };
const EXPIRED_LINK: Principal = { kind: 'link', token: 'tok-expired' };
const REVOKED_LINK: Principal = { kind: 'link', token: 'tok-revoked' };
/** The thirteenth: on the trip as a participant and nothing else. */
const PARTICIPANT_USER_ID = 'user:zoe';
const PARTICIPANT: Principal = { kind: 'user', userId: PARTICIPANT_USER_ID };

/** §6.2.4's enumeration, plus the participant-only principal the criterion is about. */
const PRINCIPALS: Array<[string, Principal]> = [
  ['owner', OWNER],
  ['co-owner', CO_OWNER],
  ['editor', EDITOR],
  ['commenter', COMMENTER],
  ['viewer', VIEWER],
  ['friend', FRIEND],
  ['revoked editor', REVOKED],
  ['stranger', STRANGER],
  ['anonymous', ANON],
  ['live link', LIVE_LINK],
  ['expired link', EXPIRED_LINK],
  ['revoked link', REVOKED_LINK],
  ['participant only', PARTICIPANT],
];

const OPS: Operation[] = ['view', 'comment', 'edit', 'share', 'delete'];

/** The shape in which the participant IS the owner — the control on the denial. */
const OWNING_SHAPE = 'participant is the owner';

/**
 * Five relationship shapes. `participants` is `null` for the run without them; otherwise the
 * array is attached to **every** shape, which is the cast the type system exists to make
 * impossible (`Relationship` has no such field) and therefore the only way to ask the
 * question at all.
 */
function shapes(participants: Participant[] | null): Array<[string, Relationship]> {
  const attach = (rel: Relationship): Relationship =>
    participants === null ? rel : ({ ...rel, participants } as Relationship & { participants: Participant[] });
  return [
    ['every kind of share', attach({
      tripId: 'trip-m',
      ownerId: 'user:jacob',
      memberIds: ['user:co'],
      friendIds: ['user:marta', 'user:zoe'],
      shares: [
        { principal: EDITOR, role: 'editor' },
        { principal: COMMENTER, role: 'commenter' },
        { principal: VIEWER, role: 'viewer' },
        { principal: REVOKED, role: 'editor', revokedAt: '2026-07-01' },
        { principal: LIVE_LINK, role: 'viewer', expiresAt: '2026-09-01' },
        { principal: EXPIRED_LINK, role: 'viewer', expiresAt: '2026-08-24' },
        { principal: REVOKED_LINK, role: 'viewer', revokedAt: '2026-07-01' },
      ],
    })],
    ['owner only', attach({ tripId: 'trip-m', ownerId: 'user:jacob' })],
    ['friends only', attach({
      tripId: 'trip-m', ownerId: 'user:jacob', friendIds: ['user:marta', 'user:zoe', 'user:stranger'],
    })],
    ['every share dead', attach({
      tripId: 'trip-m',
      ownerId: 'user:jacob',
      shares: [
        { principal: EDITOR, role: 'editor', expiresAt: '2026-08-24' },
        { principal: VIEWER, role: 'viewer', revokedAt: '2026-07-01' },
        { principal: PARTICIPANT, role: 'editor', expiresAt: '2026-08-24' },
        { principal: LIVE_LINK, role: 'viewer', expiresAt: '2026-08-24' },
      ],
    })],
    [OWNING_SHAPE, attach({ tripId: 'trip-m', ownerId: 'user:zoe', friendIds: ['user:jacob'] })],
  ];
}

/** Every (principal × relationship × operation) cell, keyed so a diff names the cell. */
function runMatrix(participants: Participant[] | null): Record<string, boolean> {
  const cells: Record<string, boolean> = {};
  for (const [rname, rel] of shapes(participants)) {
    for (const [pname, p] of PRINCIPALS) {
      for (const op of OPS) cells[`${rname} | ${pname} | ${op}`] = can(op, p, rel, NOW);
    }
  }
  return cells;
}

/** The same grid one level down, so a role change that no operation happens to expose still fails. */
function runRoles(participants: Participant[] | null): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const [rname, rel] of shapes(participants)) {
    for (const [pname, p] of PRINCIPALS) cells[`${rname} | ${pname}`] = String(effectiveRole(p, rel, NOW));
  }
  return cells;
}

test('EC-9: the conformance matrix is identical with participants on every trip and without', () => {
  const without = runMatrix(null);
  const withThem = runMatrix(realParticipants());

  // The count is asserted so a matrix that quietly stopped enumerating cannot pass by
  // comparing two empty objects — 13 principals × 5 relationships × 5 operations.
  assert.equal(PRINCIPALS.length, 13);
  assert.equal(Object.keys(without).length, 13 * 5 * 5, 'the matrix did not enumerate every cell');
  assert.equal(Object.keys(withThem).length, 13 * 5 * 5);

  const diff = Object.keys(without).filter((k) => without[k] !== withThem[k]);
  assert.deepEqual(diff, [], `participants changed ${diff.length} cell(s) of the access matrix:\n${diff.join('\n')}`);
  assert.deepEqual(withThem, without);
  assert.deepEqual(runRoles(realParticipants()), runRoles(null), 'participants changed an effective role');
});

test('EC-9: a participant who is not a member or share holder is denied every operation, including view', () => {
  for (const participants of [null, realParticipants()]) {
    for (const [rname, rel] of shapes(participants)) {
      const granted: Operation[] = OPS.filter((op) => can(op, PARTICIPANT, rel, NOW));
      const where = `${rname} (participants ${participants === null ? 'absent' : 'present'})`;
      if (rname === OWNING_SHAPE) {
        // The control: the denial above is about participation, not about this principal.
        assert.deepEqual(granted, OPS, `${where}: the owner was denied ${OPS.filter((op) => !granted.includes(op))}`);
        assert.equal(effectiveRole(PARTICIPANT, rel, NOW), 'owner', where);
      } else {
        assert.deepEqual(granted, [], `${where}: participation granted ${granted.join(', ')}`);
        assert.equal(canView(PARTICIPANT, rel, NOW), false, `${where}: participation granted a read`);
        assert.equal(effectiveRole(PARTICIPANT, rel, NOW), null, where);
      }
    }
  }
});

test('EC-9: a participant carrying a linked userId is still not a principal', () => {
  // The vacuity guard for the two tests above: if no participant carried an account, "the
  // matrix does not move" would be true of a field nothing could ever match anyway.
  const ps = realParticipants();
  assert.equal(ps.length, 3);
  assert.equal(
    ps.filter((p) => p.userId === PARTICIPANT_USER_ID).length, 1,
    'INCONCLUSIVE: no participant carries the principal’s userId, so the matrix compares an unmatchable field',
  );
});
