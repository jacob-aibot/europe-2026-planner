/**
 * `booking_vs_plan` — a linked booking's date, time or route disagrees with the stop it is
 * attached to. Blocker, because this is the class of disagreement that put a wrong flight
 * time in front of Jacob twice.
 *
 * Both sides stay visible and the conflict states both. Nothing here edits a stop.
 *
 * The Aug 15 Smartwings reissue is the negative fixture: the ticket now agrees with the
 * plan, so this rule MUST NOT fire for it.
 */
import type { Conflict } from '../../model/types.ts';
import { timeVal } from '../../derive/legs.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

/**
 * A stop is often timed for boarding or check-in rather than departure — the Danube cruise
 * boards at 19:10 for a 19:30 sailing, and the voucher says to arrive 20–30 min early. A
 * rule that called that a blocker would be switched off within a day, so times within this
 * many minutes of each other agree. Dates never get a tolerance. See BUILD-NOTES.
 */
export const BOOKING_TIME_TOLERANCE_MINS = 30;

export const bookingVsPlan: Rule = {
  id: 'booking_vs_plan',
  description: 'A booking says something different from the stop it is attached to.',
  run(ctx) {
    const out: Conflict[] = [];
    const byId = new Map(ctx.trip.bookings.map((b) => [b.id, b]));
    for (const day of ctx.trip.days) {
      for (const stop of day.stops) {
        if (!stop.bookingId) continue;
        const b = byId.get(stop.bookingId);
        if (!b || b.status !== 'active') continue;
        const planTime = stop.placement.kind === 'scheduled' ? stop.placement.time : null;
        const dateDiffers = b.startsAt.date !== day.date;
        const timeDiffers =
          b.startsAt.time != null &&
          planTime != null &&
          Math.abs(timeVal(b.startsAt.time) - timeVal(planTime)) > BOOKING_TIME_TOLERANCE_MINS;
        if (!dateDiffers && !timeDiffers) continue;
        out.push(
          makeConflict({
            ruleId: 'booking_vs_plan',
            kind: 'booking',
            severity: 'blocker',
            subjects: [
              { kind: 'stop', id: stop.id },
              { kind: 'booking', id: b.id },
              { kind: 'day', id: day.id },
            ],
            summary:
              `The plan has “${stop.name}” on ${day.date}${planTime ? ` at ${planTime}` : ''}, ` +
              `but ${b.operator}${b.reference ? ` ${b.reference}` : ''} says ` +
              `${b.startsAt.date}${b.startsAt.time ? ` at ${b.startsAt.time}` : ''}.`,
            params: {
              stopName: stop.name,
              planDate: day.date,
              planTime: planTime ?? '',
              bookingDate: b.startsAt.date,
              bookingTime: b.startsAt.time ?? '',
              operator: b.operator,
              reference: b.reference ?? '',
            },
            detail: 'Neither side has been changed. Decide which is right and resolve the conflict.',
            values: {
              planDate: day.date,
              planTime,
              bookingDate: b.startsAt.date,
              bookingTime: b.startsAt.time,
            },
          }),
        );
      }
    }
    return out;
  },
};
