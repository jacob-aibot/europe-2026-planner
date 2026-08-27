/**
 * `legacy_flag` — the migration's real work (ARCHITECTURE §2.11).
 *
 * The live app has two hand-set red days: `flag:true` on Aug 18 and Aug 20, with the reason
 * written in the day's subtitle and nothing machine-readable behind it. Importing turns
 * each into a first-class blocker conflict whose summary IS that subtitle, so the reason
 * survives as data rather than as a colour.
 */
import type { Conflict } from '../../model/types.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

export const legacyFlag: Rule = {
  id: 'legacy_flag',
  description: 'A day the author marked as needing attention.',
  /** §8.2: the user marked this day themselves; retiring their own flag is not ours to do. */
  class: 'integrity',
  run(ctx) {
    const out: Conflict[] = [];
    for (const day of ctx.trip.days) {
      if (!day.legacyFlag) continue;
      out.push(
        makeConflict({
          ruleId: 'legacy_flag',
          kind: 'editorial',
          severity: 'blocker',
          subjects: [{ kind: 'day', id: day.id }],
          summary: day.subtitle || `${day.date} is flagged for attention.`,
          params: { dayId: day.id, date: day.date, title: day.title },
          detail: 'Carried over from the original planner’s red-flag day.',
          values: { date: day.date, subtitle: day.subtitle },
        }),
      );
    }
    return out;
  },
};
