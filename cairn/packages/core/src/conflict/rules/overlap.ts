/**
 * `overlap` — two scheduled stops whose occupied clock ranges intersect.
 *
 * `durationMins: null` NEVER overlaps. Guessing a duration would manufacture conflicts out
 * of nothing, which is the opposite of the point.
 *
 * ONE exception, from §2.12: a `travelRole:'journey'` stop occupies
 * `[time, time + arrival.mins)` even with `durationMins` null. That is not a guess — the
 * vehicle's own run is recorded on the stop, and a flight does overlap the thing you
 * scheduled during it. `'transfer'` and `'unknown'` keep the no-guessing rule.
 *
 * And one carve-out inside that exception, which is a divergence from §2.12 taken
 * literally — BUILD-NOTES §1, KD-15. **A journey's derived occupancy is not compared
 * against an immediately-following stop that is ITSELF a journey.** That stop is the
 * itinerary continuing at the destination, on the destination's clock: on Aug 21 BA863
 * departs Budapest 12:55
 * and runs 165 minutes, and the next stop is 15:15 in Windsor — which reads like a
 * 25-minute overlap and is not, because the flight crosses CEST → BST and core stores
 * wall-clock with no timezone (§7). §2.12 identifies that exact pair as the reason
 * `journey_overrun` is deferred to Phase 4; reporting it here under a different rule id
 * would ship the artifact the deferral exists to avoid, and §2.7 requires `overlap` to
 * return 0 on the reference trip.
 */
import type { Conflict, Stop } from '../../model/types.ts';
import { timeVal } from '../../derive/legs.ts';
import { clockOf, stopOccupancy } from '../../derive/occupancy.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

type Occupied = { s: Stop; start: number; mins: number; derived: boolean };

export const overlap: Rule = {
  id: 'overlap',
  description: 'Two stops on the same day are scheduled on top of each other.',
  /** §8.2: two things you already did do not clash. */
  class: 'feasibility',
  run(ctx) {
    const out: Conflict[] = [];
    for (const day of ctx.trip.days) {
      // Time order over ALL timed stops, so "immediately follows" means what it says even
      // when the stop in between has no occupancy of its own.
      const byTime = day.stops
        .map((s) => ({ s, start: s.placement.kind === 'scheduled' ? timeVal(s.placement.time) : 99999 }))
        .filter((x) => x.start < 99999)
        .sort((a, b) => a.start - b.start);
      const nextOf = new Map<string, string>();
      for (let i = 0; i + 1 < byTime.length; i++) nextOf.set(byTime[i].s.id, byTime[i + 1].s.id);

      const timed: Occupied[] = [];
      for (const { s, start } of byTime) {
        // §11.11 A-96 Part 2: this rule's module-private `occupancy` is now
        // `derive/occupancy.ts`'s `stopOccupancy`, read by `ask/free_time` too.
        // `source === 'journey_run'` IS the old `derived` flag — an exact identity, which is
        // why KD-15's carve-out below and this rule's golden do not move.
        const occ = stopOccupancy(s);
        if (occ) timed.push({ s, start, mins: occ.mins, derived: occ.source === 'journey_run' });
      }

      for (let i = 0; i < timed.length; i++) {
        for (let j = i + 1; j < timed.length; j++) {
          const a = timed[i];
          const b = timed[j];
          const aEnd = a.start + a.mins;
          const bEnd = b.start + b.mins;
          if (!(a.start < bEnd && b.start < aEnd)) continue;
          const [first, second] = a.start <= b.start ? [a, b] : [b, a];
          // KD-15: a journey's derived occupancy is not compared against the stop that
          // immediately follows it in time WHEN that stop is itself a journey — the
          // itinerary continuing at the destination, on the destination's clock. Anything
          // else scheduled inside the run (a sight, a meal, a check-in) still fires.
          if (first.derived && second.s.travelRole === 'journey' && nextOf.get(first.s.id) === second.s.id) continue;
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
                `“${first.s.name}” runs ${clockOf(first.start)}–${clockOf(first.start + first.mins)} ` +
                `but “${second.s.name}” starts at ${clockOf(second.start)} on ${day.date}.`,
              params: {
                dayId: day.id,
                firstName: first.s.name,
                secondName: second.s.name,
                firstStart: clockOf(first.start),
                firstEnd: clockOf(first.start + first.mins),
                secondStart: clockOf(second.start),
              },
              values: { a: first.start, aDur: first.mins, b: second.start, bDur: second.mins },
            }),
          );
        }
      }
    }
    return out;
  },
};
