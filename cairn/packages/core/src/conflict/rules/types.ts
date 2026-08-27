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
 * > run for a subject whose day is strictly before `ctx.today`. An **integrity** rule asserts
 * > that the data disagrees with itself or with the world; it always runs.
 *
 * §0.5 governs: *a blocker is a thing Jacob must act on*, and nobody can act on the past. A
 * rule does **not** implement the gate itself — that lives once, in `detect.ts`. Ten rules
 * each checking the clock is ten implementations of one idea, which is the §2.13 mistake in a
 * new place.
 */
export type RuleClass = 'feasibility' | 'integrity';

export type Rule = {
  id: RuleId;
  /** One line, for the conflicts panel's rule filter. */
  description: string;
  /** §8.2. Decides whether `detect.ts` gates this rule's findings on `ctx.today`. */
  class: RuleClass;
  /** Pure. MUST NOT mutate the trip and MUST NOT throw on bad data. */
  run: (ctx: TripCtx) => Conflict[];
};
