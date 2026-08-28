/**
 * The rule interface. One file per rule (ARCHITECTURE §2.7) so a rule can be read,
 * argued with and deleted on its own.
 */
import type { Conflict, TripCtx } from '../../model/types.ts';
import type { RuleId } from '../../model/ids.ts';

/**
 * What kind of claim a rule makes (ARCHITECTURE §8.2).
 *
 * > A **feasibility** rule asserts something about whether the plan can happen. It does not
 * > run for a subject whose day is strictly before the injected `today`. An **integrity** rule
 * > asserts that the data disagrees with itself or with the world; it always runs.
 *
 * §0.5 governs: *a blocker is a thing Jacob must act on*, and nobody can act on the past. A
 * rule does **not** implement the gate itself — that lives once, in `detect.ts`. Ten rules
 * each checking the clock is ten implementations of one idea, which is the §2.13 mistake in a
 * new place.
 *
 * §2.7 **A-11** states the property A-9 only approximated with a token grep, and it is asserted
 * as a clock sweep in `packages/core/test/horizonGate.test.ts` rather than as a search:
 *
 * > A rule's **output set** may not depend on the clock. For one document, `detectUngated`
 * > returns the same conflict ids at every well-formed clock. A clock may change a rule's
 * > **prose** — `summary`, `detail`, and any `params` key that is not in `values` — and nothing
 * > else. Every clock-driven *suppression* lives in `detect.ts` under the `gate` conjunct,
 * > where `detectUngated` disables it.
 *
 * One degenerate case is permitted by name: a rule may decline to run **at all** when the
 * context carries no clock. That costs retirement nothing, because `syncResolutions` also
 * declines without a well-formed `at`, so the two abstentions coincide exactly and the
 * clock-free set is never the set retirement reads.
 */
export type RuleClass = 'feasibility' | 'integrity';

export type Rule = {
  id: RuleId;
  /** One line, for the conflicts panel's rule filter. */
  description: string;
  /** §8.2. Decides whether `detect.ts` gates this rule's findings on the injected `today`. */
  class: RuleClass;
  /**
   * §2.7 **A-11**. A finding whose every subject falls more than this many days AFTER the
   * injected `today` is premature, and `detect.ts` withholds it — under `gate`, so
   * `detectUngated` sees it. A rule NEVER applies its own horizon: a suppression a rule
   * performs itself is invisible to `detectUngated`, which is the set retirement reads, and
   * *absent from the un-gated set* means *fixed*. Only a `feasibility` rule may declare one —
   * a horizon says *"this is premature"*, which is a feasibility claim by construction.
   *
   * §2.7 **A-17** (revision 13, QA R14-1) adds one standing obligation to this field:
   *
   * > A rule that declares `horizonDays` must emit, among the subjects of every conflict it
   * > produces, at least one ref whose `subjectDate` resolution does not depend on an id being
   * > unique — in practice the `{kind:'day'}` ref for the day the finding is about. A rule that
   * > cannot do so may not declare a horizon.
   *
   * Why: `subjectDate` resolves a `{kind:'stop'}` ref to the FIRST day holding that id, which on
   * a `duplicate_id` document need not be the day the rule was iterating — and `fromJSON`
   * accepts such a document deliberately, so `importDoc` is a live route to one. `beyondHorizon`
   * suppresses only when EVERY subject is beyond the horizon, so an unambiguous day ref means an
   * ambiguous stop ref can only ever make the conjunction fail: the gate may KEEP a finding the
   * old in-rule guard would have withheld, and can never withhold one it would have kept.
   * Over-reporting, never hiding something actionable. The case this excludes is a finding about
   * a POOL stop, which has no day of its own and falls through to §8.2 ruling 2's `endDate`
   * fallback — a pool stop has no date, so *"more than 60 days out"* is a claim about a date
   * that does not exist, and such a finding simply always shows. Asserted in
   * `packages/core/test/horizonGate.test.ts`, in the same test as *"only a feasibility rule may
   * declare a horizon"*, not enforced by a type, for the same reason.
   */
  horizonDays?: number;
  /** Pure. MUST NOT mutate the trip and MUST NOT throw on bad data. */
  run: (ctx: TripCtx) => Conflict[];
};
