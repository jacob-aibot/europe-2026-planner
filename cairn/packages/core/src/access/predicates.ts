/**
 * Authorization predicates (ARCHITECTURE §6.2).
 *
 * These ship in Phase 1 even though NOTHING enforces them yet. They are the *definition*
 * the Phase 2 Postgres RLS policies are generated from and tested against by the
 * conformance matrix; writing them later is the retrofit Jacob specifically asked to avoid.
 *
 * Pure predicates over a principal, a relationship and a trip. No IO, no clock — `now` is
 * passed in so expiry is testable.
 */
import type { TripId, UserId, IsoDate } from '../model/ids.ts';
import { isIsoDate } from '../model/ids.ts';

export type Role = 'viewer' | 'commenter' | 'editor';

export type Principal =
  | { kind: 'user'; userId: UserId }
  | { kind: 'link'; token: string }
  | { kind: 'anonymous' };

export type Relationship = {
  tripId: TripId;
  ownerId: UserId;
  /** Co-owners. Always have full rights. */
  memberIds?: UserId[];
  /** Direct grants to a user. */
  shares?: Array<{ principal: Principal; role: Role; expiresAt?: IsoDate | null; revokedAt?: IsoDate | null }>;
  /** Accepted, bidirectional friendships of the owner. Being a friend grants NOTHING by itself. */
  friendIds?: UserId[];
};

export type Operation = 'view' | 'comment' | 'edit' | 'share' | 'delete';

function samePrincipal(a: Principal, b: Principal): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'user' && b.kind === 'user') return a.userId === b.userId;
  if (a.kind === 'link' && b.kind === 'link') return a.token === b.token;
  return a.kind === 'anonymous';
}

/**
 * `now` is the only thing standing between an expired link and the trip, so a caller that
 * cannot supply one is a programmer error and MUST NOT be answered.
 *
 * Before this guard, `s.expiresAt < now` with `now` `undefined` or `''` was false for every
 * share, so an EXPIRED viewer share returned `canView === true` — a predicate that fails
 * open. Per §2.1 core throws only on programmer error; a missing clock is exactly that.
 *
 * @throws {Error} if `now` is not a real calendar date in `YYYY-MM-DD`.
 */
function requireNow(now: IsoDate): void {
  if (!isIsoDate(now)) {
    throw new Error(
      `access: "now" must be a calendar date in YYYY-MM-DD, got ${JSON.stringify(now)} — ` +
        'refusing to evaluate access without a clock',
    );
  }
}

/**
 * Is this share's `expiresAt` in the past — **failing closed on anything that is present and
 * is not a real calendar date**?
 *
 * `s.expiresAt < now` is a lexical string compare, and a lexical compare on an unvalidated
 * string is not a calendar comparison: `"9999-99-99"`, `"tomorrow"` and `"never"` all sort
 * after a real `YYYY-MM-DD`, so all three read as *not yet expired* and grant access. That is
 * F-13's argument one field over, and §6.2.4 is why it matters — these predicates are the
 * definition the Phase 2 RLS policies are generated from and tested against, so a definition
 * that fails open generates a policy that fails open.
 *
 * A value that is **absent, `null` or `''`** legitimately means "no expiry" and keeps meaning
 * that. Anything else that is not a calendar date is treated as expired, because a share
 * whose expiry cannot be read is a share whose expiry cannot be trusted. Pure.
 */
function expired(value: IsoDate | null | undefined, now: IsoDate): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (!isIsoDate(value)) return true;
  return value < now;
}

/**
 * Has this share been revoked — **failing closed on a malformed `revokedAt`**?
 *
 * Any present, well-formed date means revoked (revocation is not dated into the future by
 * this model; a row that carries one is revoked). A present value that is not a calendar
 * date is also revoked, for the same reason as `expired`: an unreadable revocation is not an
 * absent one. Absent, `null` and `''` mean "not revoked". Pure.
 */
function revoked(value: IsoDate | null | undefined): boolean {
  return !(value === undefined || value === null || value === '');
}

/**
 * The live (unexpired, unrevoked) role a principal holds on a trip, or null. Pure.
 * @throws {Error} if `now` is missing or not a `YYYY-MM-DD` calendar date.
 */
export function effectiveRole(p: Principal, rel: Relationship, now: IsoDate): Role | 'owner' | null {
  requireNow(now);
  if (p.kind === 'user') {
    if (p.userId === rel.ownerId) return 'owner';
    if ((rel.memberIds ?? []).includes(p.userId)) return 'owner';
  }
  let best: Role | null = null;
  const rank: Record<Role, number> = { viewer: 1, commenter: 2, editor: 3 };
  for (const s of rel.shares ?? []) {
    if (!samePrincipal(s.principal, p)) continue;
    if (revoked(s.revokedAt)) continue;
    if (expired(s.expiresAt, now)) continue;
    if (!best || rank[s.role] > rank[best]) best = s.role;
  }
  return best;
}

/** Pure. */
export function canView(p: Principal, rel: Relationship, now: IsoDate): boolean {
  return effectiveRole(p, rel, now) !== null;
}

/** Pure. */
export function canComment(p: Principal, rel: Relationship, now: IsoDate): boolean {
  const r = effectiveRole(p, rel, now);
  return r === 'owner' || r === 'editor' || r === 'commenter';
}

/** Pure. */
export function canEdit(p: Principal, rel: Relationship, now: IsoDate): boolean {
  const r = effectiveRole(p, rel, now);
  return r === 'owner' || r === 'editor';
}

/** Only owners and co-owners may hand out access. Pure. */
export function canShare(p: Principal, rel: Relationship, now: IsoDate): boolean {
  return effectiveRole(p, rel, now) === 'owner';
}

/** Only owners and co-owners may delete. Pure. */
export function canDelete(p: Principal, rel: Relationship, now: IsoDate): boolean {
  return effectiveRole(p, rel, now) === 'owner';
}

/** One entry point, so the Phase 2 conformance matrix has a single thing to compare. Pure. */
export function can(op: Operation, p: Principal, rel: Relationship, now: IsoDate): boolean {
  if (op === 'view') return canView(p, rel, now);
  if (op === 'comment') return canComment(p, rel, now);
  if (op === 'edit') return canEdit(p, rel, now);
  if (op === 'share') return canShare(p, rel, now);
  return canDelete(p, rel, now);
}
