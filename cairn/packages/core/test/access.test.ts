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

import { can, canComment, canDelete, canEdit, canShare, canView, effectiveRole } from '../src/index.ts';
// §2.10 revision 5 takes `isIsoDate` off the public surface — it is an internal of the
// validators that use it. Tests may import a core module path directly; tests do not create
// surface. BUILD-NOTES KD-33.
import { isIsoDate } from '../src/model/ids.ts';
import type { Principal, Relationship } from '../src/index.ts';

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
