/**
 * `unbooked_ticketed` — a stop that clearly needs a ticket (it has a booking link and a
 * price) with no `Booking` behind it, and the day is close enough to matter.
 *
 * Needs `ctx.today`; with no clock injected the rule returns nothing rather than guessing a
 * horizon. Fixture cases: Széchenyi, Prague Castle, Windsor Castle.
 */
import type { Conflict } from '../../model/types.ts';
import { dayNumber } from '../../derive/summary.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

/** How far ahead the rule looks. */
export const UNBOOKED_HORIZON_DAYS = 60;

export const unbookedTicketed: Rule = {
  id: 'unbooked_ticketed',
  description: 'A ticketed stop that has not been booked yet.',
  /** §8.2: "book this within N days" is meaningless afterwards. */
  class: 'feasibility',
  run(ctx) {
    if (!ctx.today) return [];
    const out: Conflict[] = [];
    const todayN = dayNumber(ctx.today);
    for (const day of ctx.trip.days) {
      const delta = dayNumber(day.date) - todayN;
      if (delta < 0 || delta > UNBOOKED_HORIZON_DAYS) continue;
      for (const stop of day.stops) {
        if (stop.bookingId) continue;
        if (!stop.cost) continue;
        const hasLink = (stop.links && stop.links.length > 0) || !!stop.ticket;
        if (!hasLink) continue;
        out.push(
          makeConflict({
            ruleId: 'unbooked_ticketed',
            kind: 'coverage',
            severity: 'note',
            subjects: [
              { kind: 'stop', id: stop.id },
              { kind: 'day', id: day.id },
            ],
            summary:
              `“${stop.name}” on ${day.date} costs ${stop.cost.display ?? 'money'} and has a booking link, ` +
              `but nothing is booked (${delta} day${delta === 1 ? '' : 's'} out).`,
            params: {
              stopName: stop.name,
              date: day.date,
              cost: stop.cost.display ?? '',
              daysOut: delta,
            },
            values: { stop: stop.name, date: day.date, cost: stop.cost.display },
          }),
        );
      }
    }
    return out;
  },
};
