/**
 * `displayStatus` (ARCHITECTURE §2.8) — the single function that decides how anything
 * renders, so web, native and server cannot drift.
 *
 * The invariant the tester should attack: nothing un-accepted and non-user may ever be
 * presented without a badge, i.e. it may never return `'own'`.
 */
import type { DisplayStatus, Provenance } from '../model/types.ts';

/** Anything carrying provenance. */
export type HasProvenance = { provenance: Provenance };

/** Pure. Never throws — an unknown source degrades to `'suggested'`, which is badged. */
export function displayStatus(x: HasProvenance | Provenance): DisplayStatus {
  const p: Provenance = 'provenance' in x ? x.provenance : x;
  if (p.source === 'user' || p.state === 'accepted') return 'own';
  if (p.state === 'rejected') return 'rejected';
  if (p.source === 'email') return 'candidate';
  if (p.source === 'friend') return 'imported';
  return 'suggested';
}

/** True when the item must carry a visible badge. Pure. */
export function needsBadge(x: HasProvenance | Provenance): boolean {
  return displayStatus(x) !== 'own';
}

/** Short label for the badge. Presentation-adjacent but shared, so surfaces agree. Pure. */
export function statusLabel(s: DisplayStatus): string {
  if (s === 'suggested') return 'suggested';
  if (s === 'candidate') return 'from email — review';
  if (s === 'imported') return 'from a friend';
  if (s === 'rejected') return 'rejected';
  return '';
}

/**
 * Who a record is credited to, or `null` (ARCHITECTURE §2.8, §2.14).
 *
 * Deliberately SEPARATE from `displayStatus`. Acceptance changes the badge and must never
 * change the credit: a stop copied from Marta and then accepted is `displayStatus() ===
 * 'own'` — Jacob has taken it on, which is what the brief's *"until the user accepts it"*
 * means — and `attribution()` still names Marta.
 *
 * **The contract every view owes this function:** any view that renders a record with a
 * non-null `attribution` renders the credit. That is the mechanical form of `CLAUDE.md`'s
 * oldest rule, applied to the path where it will actually be exercised.
 *
 * Pure. Never throws.
 */
export function attribution(
  x: HasProvenance | Provenance,
): { friendUserId: string; sourceTripId: string; sourceStopId: string } | null {
  const p: Provenance = 'provenance' in x ? x.provenance : x;
  if (p.source !== 'friend') return null;
  const o = p.origin;
  if (!o || !o.sourceTripId || !o.friendUserId) return null;
  return {
    friendUserId: o.friendUserId,
    sourceTripId: o.sourceTripId,
    sourceStopId: o.sourceStopId ?? '',
  };
}
