/**
 * Conflict detection (ARCHITECTURE §2.7).
 *
 * *Flag conflicts, don't resolve them by guessing* — as a type. `detectConflicts` is pure
 * and NO code path in core edits a stop in response to a conflict. A resolved conflict is
 * still returned, carrying its `ConflictResolution`, so it can render dimmed rather than
 * disappear.
 */
import type { Conflict, Ref, Trip, TripCtx } from '../model/types.ts';
import type { IsoDate } from '../model/ids.ts';
import { bookingVsPlan } from './rules/bookingVsPlan.ts';
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
 * The calendar day a conflict subject belongs to (ARCHITECTURE §8.2, revision 10 ruling 2).
 *
 * `{kind:'day'}` is its own date; `{kind:'stop'}` is its day's date; `{kind:'booking'}` is
 * `startsAt.date`. **A subject that resolves to no date resolves to `trip.endDate`** —
 * `{kind:'trip'}`, `{kind:'place'}` and a pool stop have no day of their own. Falling back to
 * the trip's end date means a wholly-past trip goes quiet, which is the point of the whole
 * ruling, while a trip that has not ended keeps every one of its trip-level findings.
 *
 * An id nothing in the trip matches gets the same fallback rather than a throw: `detect.ts`
 * never throws (§2.1 — domain problems are data, not exceptions), and treating an unknown
 * subject as trip-level is the conservative direction.
 *
 * Pure.
 */
export function subjectDate(trip: Trip, ref: Ref): IsoDate {
  if (ref.kind === 'day') {
    const day = trip.days.find((d) => d.id === ref.id);
    if (day) return day.date;
    return trip.endDate;
  }
  if (ref.kind === 'stop') {
    for (const day of trip.days) {
      if (day.stops.some((s) => s.id === ref.id)) return day.date;
    }
    // A pool stop has no day of its own — ruling 2. So does an id nothing matches.
    return trip.endDate;
  }
  if (ref.kind === 'booking') {
    const booking = trip.bookings.find((b) => b.id === ref.id);
    if (booking) return booking.startsAt.date;
    return trip.endDate;
  }
  // 'trip' and 'place' — ruling 2, by definition.
  return trip.endDate;
}

/**
 * The feasibility gate (§8.2). **It lives here, once.** A rule that checked the clock itself
 * would be ten implementations of one idea.
 *
 * A conflict is suppressed **iff every one of its subjects resolves to a date strictly before
 * `ctx.today`** (ruling 1). The asymmetry is deliberate and it is the safe direction: one
 * subject on or after today keeps the whole finding, because a `booking_vs_plan` between a
 * past booking and a future day is still something Jacob can act on, and §0.5 is the test —
 * suppression must never remove a finding somebody could still do something about.
 *
 * With **no** `ctx.today`, nothing is gated (ruling 3). `DetectOpts.today` is already optional
 * and rules that need a horizon already skip themselves without it; the gate inherits that
 * rather than inventing a default clock, which core is forbidden from having anyway (§2.1).
 */
function suppressedAsPast(trip: Trip, conflict: Conflict, today: IsoDate | undefined): boolean {
  if (!today) return false;
  if (conflict.subjects.length === 0) return false;
  return conflict.subjects.every((s) => subjectDate(trip, s) < today);
}

/**
 * The one implementation (§2.7 A-9). `gate` decides whether §8.2's feasibility gate is
 * applied; everything else is identical, because there is exactly one rule loop and exactly
 * one place the gate lives. Private: the two public entry points below are the whole API.
 */
function runRules(trip: Trip, opts: DetectOpts, gate: boolean): Conflict[] {
  const ctx: TripCtx = { trip, ...(opts.today ? { today: opts.today } : {}) };
  // Retired rows never resolve a conflict again (§2.7) — but they are read below, so a
  // conflict that comes back after a dismissal says so instead of returning silently.
  const byId = new Map(trip.resolutions.filter((r) => !r.retiredAt).map((r) => [r.conflictId, r]));
  const retiredById = new Map(trip.resolutions.filter((r) => r.retiredAt).map((r) => [r.conflictId, r]));
  const found: Array<{ c: Conflict; rank: number }> = [];
  RULES.forEach((rule, rank) => {
    if (opts.only && !opts.only.includes(rule.id)) return;
    let produced: Conflict[] = [];
    // Set by the catch below and read by the gate: a crash is exempt because it *is* a crash,
    // not because of anything about the note it produced. A real rule cannot claim the
    // exemption by minting a conflict with `ruleId: 'rule_error'`.
    let crashed = false;
    try {
      produced = rule.run(ctx);
    } catch (err) {
      crashed = true;
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
    for (const c of produced) {
      // §8.2. `rule.class` is read here and only here — the gate has one home. A `rule_error`
      // note is synthesised above and is never gated: a rule that crashed is an integrity
      // problem with the code, and silencing it because the trip is over would hide it.
      //
      // QA P2-4: `crashed` is why that sentence is now true. The synthesised note inherits the
      // crashing rule's `class` and its only subject is `{kind:'trip'}`, which ruling 2
      // resolves to `trip.endDate` — so without this clause a bug in a *feasibility* rule was
      // silent on every finished trip while the same bug in an integrity rule reported.
      //
      // A-9 adds the `gate` conjunct at the front and keeps every conjunct that was already
      // here. `detectUngated` is `gate === false`: retirement is a claim about the DOCUMENT
      // and must not read a set the clock has thinned.
      if (gate && !crashed && rule.class === 'feasibility' && suppressedAsPast(trip, c, opts.today)) continue;
      const live = byId.get(c.id) ?? null;
      const retired = live ? null : retiredById.get(c.id);
      const detail = retired
        ? `${c.detail ? `${c.detail} ` : ''}You ${retired.state === 'dismissed' ? 'dismissed' : 'answered'} ` +
          `this on ${retired.at} and it went away; it has come back.`
        : c.detail;
      found.push({ c: { ...c, resolution: live, ...(detail !== undefined ? { detail } : {}) }, rank });
    }
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

/**
 * Runs every rule and attaches any stored resolution. Pure; never throws — a rule that
 * throws is caught and reported as a `note` so one bad rule cannot take down the panel.
 *
 * A **feasibility** rule's finding is dropped when every one of its subjects is already in
 * the past (§8.2, `suppressedAsPast` above). An **integrity** rule always runs. This is what
 * stops the conflicts panel telling Jacob his Budapest lodging is missing for a trip he
 * finished on 22 August. `booking_vs_plan` going quiet on a completed trip is a **deliberate,
 * named loss** (§8.2), not a bug to patch back in.
 *
 * Ordered by severity, then rule order, then id, so goldens are stable.
 */
export function detectConflicts(trip: Trip, opts: DetectOpts = {}): Conflict[] {
  return runRules(trip, opts, true);
}

/**
 * The same rules with §8.2's feasibility gate **disabled** (§2.7 A-9, QA P2-1).
 *
 * **Not exported from `index.ts`** — exactly as `TRANSIT_CITY_KEY`'s sentinel discipline, and
 * §2.10's runtime symbol count stays at 71 (KD-42). The only legitimate caller is `syncResolutions`.
 *
 * Why it exists: *retirement is a claim about the document; the gate is a claim about the
 * user's attention, taken at a clock, over a document that has not changed.* A conflict the
 * gate withheld has **not** been fixed, so reading the gated set as evidence of a fix retires
 * the user's dismissals for no reason other than the calendar. Nothing that renders may call
 * this — a panel built from it would nag about a trip that is over.
 *
 * Pure.
 */
export function detectUngated(trip: Trip, opts: DetectOpts = {}): Conflict[] {
  return runRules(trip, opts, false);
}

/** Conflicts touching a given day, stop or booking id. Pure. */
export function conflictsFor(conflicts: readonly Conflict[], id: string): Conflict[] {
  return conflicts.filter((c) => c.subjects.some((s) => s.id === id));
}
