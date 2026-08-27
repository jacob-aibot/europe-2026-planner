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
  /**
   * §2.7 **A-11**. The horizon is DECLARED here and APPLIED in `detect.ts`, under the same
   * `gate` conjunct as §8.2's feasibility gate, so `detectUngated` disables it exactly as it
   * disables the gate.
   *
   * A-9 kept `delta > UNBOOKED_HORIZON_DAYS` inside this file on the argument that *"as a clock
   * advances `delta` only shrinks, so the horizon can only ever admit a finding, never withdraw
   * one."* That is true of a **monotone** clock. `apps/web`'s `systemClock()` returns the
   * device's local civil date, which steps backwards when the phone flies west and when the
   * user corrects a wrong clock — so one step back across the boundary took the finding out of
   * `detectUngated`, and `syncResolutions` read *"not in the set"* as *"fixed"*.
   *
   * The retirement A-9 wanted from the horizon was already paid for elsewhere: `values` carries
   * `date`, so moving the day changes the conflict id and content-addressing retires the
   * dismissal at any clock.
   */
  horizonDays: UNBOOKED_HORIZON_DAYS,
  run(ctx) {
    // Permitted by A-11 by name: a rule may decline to run AT ALL with no clock. It is not a
    // suppression — `syncResolutions` declines without a well-formed `at` too, so the clock-free
    // set is never the set retirement reads.
    if (!ctx.today) return [];
    const out: Conflict[] = [];
    const todayN = dayNumber(ctx.today);
    for (const day of ctx.trip.days) {
      // `ctx.today` survives in this file for PROSE only — `summary` and `params.daysOut`, both
      // of which A-11 permits a clock to move. No branch below reads it.
      const delta = dayNumber(day.date) - todayN;
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
