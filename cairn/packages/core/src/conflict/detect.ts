/**
 * Conflict detection (ARCHITECTURE §2.7).
 *
 * *Flag conflicts, don't resolve them by guessing* — as a type. `detectConflicts` is pure
 * and NO code path in core edits a stop in response to a conflict. A resolved conflict is
 * still returned, carrying its `ConflictResolution`, so it can render dimmed rather than
 * disappear.
 */
import type { Conflict, Trip, TripCtx } from '../model/types.ts';
import type { IsoDate } from '../model/ids.ts';
import { bookingVsPlan } from './rules/bookingVsPlan.ts';
import { closed } from './rules/closed.ts';
import { duplicateBooking } from './rules/duplicateBooking.ts';
import { geoOutlier } from './rules/geoOutlier.ts';
import { impossibleTransfer } from './rules/impossibleTransfer.ts';
import { legacyFlag } from './rules/legacyFlag.ts';
import { missingLodging } from './rules/missingLodging.ts';
import { overlap } from './rules/overlap.ts';
import { supersededBooking } from './rules/supersededBooking.ts';
import { unbookedTicketed } from './rules/unbookedTicketed.ts';
import { unverifiedReference } from './rules/unverifiedReference.ts';
import type { Rule } from './rules/types.ts';

/** Every rule, in a fixed order so output is deterministic. */
export const RULES: Rule[] = [
  legacyFlag,
  impossibleTransfer,
  geoOutlier,
  bookingVsPlan,
  overlap,
  closed,
  supersededBooking,
  duplicateBooking,
  unverifiedReference,
  missingLodging,
  unbookedTicketed,
];

const SEVERITY_ORDER: Record<string, number> = { blocker: 0, warning: 1, note: 2 };

export type DetectOpts = {
  /** Injected `today`; rules that need a horizon skip themselves without it. */
  today?: IsoDate;
  /** Restrict to a subset of rule ids. */
  only?: string[];
};

/**
 * Runs every rule and attaches any stored resolution. Pure; never throws — a rule that
 * throws is caught and reported as a `note` so one bad rule cannot take down the panel.
 *
 * Ordered by severity, then rule order, then id, so goldens are stable.
 */
export function detectConflicts(trip: Trip, opts: DetectOpts = {}): Conflict[] {
  const ctx: TripCtx = { trip, ...(opts.today ? { today: opts.today } : {}) };
  const byId = new Map(trip.resolutions.map((r) => [r.conflictId, r]));
  const found: Array<{ c: Conflict; rank: number }> = [];
  RULES.forEach((rule, rank) => {
    if (opts.only && !opts.only.includes(rule.id)) return;
    let produced: Conflict[] = [];
    try {
      produced = rule.run(ctx);
    } catch (err) {
      produced = [
        {
          id: `rule_error-${rule.id}`,
          kind: 'editorial',
          ruleId: 'rule_error',
          severity: 'note',
          subjects: [{ kind: 'trip', id: trip.id }],
          summary: `Rule ${rule.id} failed: ${(err as Error).message}`,
          params: { ruleId: rule.id, error: String((err as Error).message) },
          resolution: null,
        },
      ];
    }
    for (const c of produced) found.push({ c: { ...c, resolution: byId.get(c.id) ?? null }, rank });
  });
  return found
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.c.severity] - SEVERITY_ORDER[b.c.severity] ||
        a.rank - b.rank ||
        a.c.id.localeCompare(b.c.id),
    )
    .map((x) => x.c);
}

/** Conflicts touching a given day, stop or booking id. Pure. */
export function conflictsFor(conflicts: readonly Conflict[], id: string): Conflict[] {
  return conflicts.filter((c) => c.subjects.some((s) => s.id === id));
}
