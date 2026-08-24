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

/** The live (unexpired, unrevoked) role a principal holds on a trip, or null. Pure. */
export function effectiveRole(p: Principal, rel: Relationship, now: IsoDate): Role | 'owner' | null {
  if (p.kind === 'user') {
    if (p.userId === rel.ownerId) return 'owner';
    if ((rel.memberIds ?? []).includes(p.userId)) return 'owner';
  }
  let best: Role | null = null;
  const rank: Record<Role, number> = { viewer: 1, commenter: 2, editor: 3 };
  for (const s of rel.shares ?? []) {
    if (!samePrincipal(s.principal, p)) continue;
    if (s.revokedAt) continue;
    if (s.expiresAt && s.expiresAt < now) continue;
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
