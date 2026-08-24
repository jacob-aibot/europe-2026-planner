/**
 * `overlap` — two scheduled stops whose `[time, time+durationMins)` intersect.
 *
 * `durationMins: null` NEVER overlaps. Guessing a duration would manufacture conflicts out
 * of nothing, which is the opposite of the point.
 */
import type { Conflict } from '../../model/types.ts';
import { timeVal } from '../../derive/legs.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

export const overlap: Rule = {
  id: 'overlap',
  description: 'Two stops on the same day are scheduled on top of each other.',
  run(ctx) {
    const out: Conflict[] = [];
    for (const day of ctx.trip.days) {
      const timed = day.stops
        .map((s) => ({
          s,
          start: s.placement.kind === 'scheduled' ? timeVal(s.placement.time) : 99999,
        }))
        .filter((x) => x.start < 99999 && x.s.durationMins != null);
      for (let i = 0; i < timed.length; i++) {
        for (let j = i + 1; j < timed.length; j++) {
          const a = timed[i];
          const b = timed[j];
          const aEnd = a.start + (a.s.durationMins as number);
          const bEnd = b.start + (b.s.durationMins as number);
          if (a.start < bEnd && b.start < aEnd) {
            const [first, second] = a.start <= b.start ? [a, b] : [b, a];
            out.push(
              makeConflict({
                ruleId: 'overlap',
                kind: 'schedule',
                severity: 'warning',
                subjects: [
                  { kind: 'stop', id: first.s.id },
                  { kind: 'stop', id: second.s.id },
                  { kind: 'day', id: day.id },
                ],
                summary:
                  `“${first.s.name}” runs ${fmt(first.start)}–${fmt(first.start + (first.s.durationMins as number))} ` +
                  `but “${second.s.name}” starts at ${fmt(second.start)} on ${day.date}.`,
                params: {
                  dayId: day.id,
                  firstName: first.s.name,
                  secondName: second.s.name,
                  firstStart: fmt(first.start),
                  firstEnd: fmt(first.start + (first.s.durationMins as number)),
                  secondStart: fmt(second.start),
                },
                values: { a: first.start, aDur: first.s.durationMins, b: second.start, bDur: second.s.durationMins },
              }),
            );
          }
        }
      }
    }
    return out;
  },
};

function fmt(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
