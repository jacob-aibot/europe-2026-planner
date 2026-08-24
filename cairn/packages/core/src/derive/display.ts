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
