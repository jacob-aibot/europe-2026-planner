/**
 * The rule interface. One file per rule (ARCHITECTURE §2.7) so a rule can be read,
 * argued with and deleted on its own.
 */
import type { Conflict, TripCtx } from '../../model/types.ts';
import type { RuleId } from '../../model/ids.ts';

export type Rule = {
  id: RuleId;
  /** One line, for the conflicts panel's rule filter. */
  description: string;
  /** Pure. MUST NOT mutate the trip and MUST NOT throw on bad data. */
  run: (ctx: TripCtx) => Conflict[];
};
