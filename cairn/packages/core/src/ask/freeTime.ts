/**
 * **The three-valued daypart classifier — §11.7 rule 3, as amended by §11.11 A-96 Part 3.** One
 * of exactly two computations that are `ask/`'s own (§11.4's ceiling); the other is
 * `country_count`'s evidence walk. Both are about *answering* rather than about the trip.
 *
 * **How long a stop occupies the clock is NOT one of them** — that is `derive/occupancy.ts`,
 * shared with `conflict/rules/overlap.ts` (A-96 Part 2). This file asks it for an interval and
 * decides whether the interval meets the window; it never reads `durationMins` or `arrival`
 * itself.
 *
 * **Nothing is defaulted into existence — and nothing the document DOES state is ignored.**
 * Measured over the reference trip: **0 of 143 stops carry a non-null `durationMins`**, and **91
 * of the 112 scheduled stops state no run length by any field at all** — the other 21 are
 * journeys that state one in `arrival.mins` (§2.12). The legacy planner recorded when things
 * start, and how long a *vehicle* runs, and never how long anything else takes.
 *
 * | Value     | Means                                                                            |
 * |-----------|----------------------------------------------------------------------------------|
 * | `busy`    | some stop's occupied interval **intersects** the window                          |
 * | `open`    | none intersects it, every stop that day states a run length, and every scheduled stop states a time |
 * | `unknown` | none intersects it and at least one stop states no run length **or no time**      |
 *
 * **A stop that states no run length occupies its start instant and nothing more, and no default
 * duration is invented.** `CAT_DEFAULT_TIME` is §2.10 group 2's class — *a tuning constant a
 * caller must not read or reproduce* — and reaching for it here would put a second definition of
 * *"how long a stop takes"* into an answer the user is invited to trust.
 *
 * **A stop that states no TIME cannot be placed in or out of the window (QA R70-2), so it is a
 * hole in exactly the same sense.** Before this, a day carrying one could return `open` and be
 * rendered as a confident **"Yes."** at `coverage: 'complete'` while the answer separately
 * carried a `time_unknown` caveat saying the stop *"could not be placed"* — confident and honest
 * disagreeing inside one `Answer`. The hole is now in the verdict, which is the field a surface
 * branches on. It does not arise on the reference trip: 0 of 112 scheduled stops carry a null
 * time.
 *
 * **The `unknown` population is deliberately WIDER than the arrow of time requires** — a stop
 * that states no run length and starts *after* the window is still counted. A-96 Part 8 residue 1
 * measured the narrowing and refused it: it turns 2026-08-08's morning `open`, a morning spent
 * over the Atlantic, because the 7th's 16:45 leg runs 660 minutes and lands the next day.
 * **Trigger:** §7's timezone work, which is what makes a cross-day interval expressible at all.
 *
 * **`StopFlag 'free'` means free of CHARGE** — the legacy planner's `badge:"free"`, on rooftops,
 * beaches and an open-air cinema (21 stops on this trip). Nothing here reads `flags`, and a test
 * asserts the string `.flags` does not occur in this directory.
 *
 * Internal — §11.9: a caller that can reach the daypart windows is a caller that will grow a
 * second set of them.
 */
import type { Day, Stop } from '../model/types.ts';
import type { ClockTime } from '../model/ids.ts';
import { timeVal } from '../derive/legs.ts';
import { intervalIntersects, occupiedInterval, stopOccupancy } from '../derive/occupancy.ts';
import type { OccupiedInterval } from '../derive/occupancy.ts';
import type { DayPart } from './types.ts';

/**
 * The three windows, as `HH:MM` wall-clock at the stop's location (§2.1 — core stores no UTC
 * instants and does no timezone maths).
 *
 * **`evening` is §11.7's own, stated there as 18:00–23:59.** `morning` and `afternoon` are this
 * module's, pinned here rather than left implicit: the boundary that matters is that the 14th's
 * last departure, **17:15**, falls in the afternoon — and that the 80 minutes the document says
 * that bus runs carry it to 18:35, which is inside the evening.
 *
 * The windows tile the waking day and deliberately do not cover 00:00–04:59: a stop that starts
 * at 02:00 belongs to no daypart this vocabulary can name, and inventing a fourth window to
 * absorb it would be answering a question nobody asked.
 */
export const DAYPART_WINDOWS: Record<DayPart, { from: ClockTime; to: ClockTime }> = {
  morning: { from: '05:00', to: '11:59' },
  afternoon: { from: '12:00', to: '17:59' },
  evening: { from: '18:00', to: '23:59' },
};

/** A stop whose occupied interval meets the window, with the interval that says so. */
export type Occupying = { stop: Stop; interval: OccupiedInterval; startsInWindow: boolean };

export type DayVerdict = {
  state: 'busy' | 'open' | 'unknown';
  /** Every stop whose occupied interval intersects the window. Empty unless `state` is `busy`. */
  occupying: Occupying[];
  /** The subset of `occupying` that START inside the window. */
  starts: Stop[];
  /** The subset already running when the window opened — a journey's stated run reaching in. */
  runsInto: Occupying[];
  /**
   * The latest start **before** the window among the stops that state no run length, or `null`.
   * The only time this day can offer as evidence for `unknown` (QA R70-8: the day-wide latest
   * start can be *after* the window it is being asked about).
   */
  lastUncertainBefore: ClockTime | null;
  /** Stops on this day that state no run length in any field. A reason a day is `unknown`. */
  withoutOccupancy: Stop[];
  /** Scheduled stops carrying no `placement.time` — `time_unknown`'s population. */
  withoutTime: Stop[];
  /** How many stops the day carries at all. A day with none states nothing — QA R70-10. */
  stopCount: number;
};

/**
 * Classify one day against one daypart. Pure; reads `Stop.placement.time` and
 * `derive/occupancy.ts` and nothing else.
 *
 * **The vacuous case is deliberate**: a day with no stops at all has nothing occupying the window
 * and no stop that fails to state a run length, so it is `open`. That is the honest reading of an
 * empty day — nothing is planned — rather than a hole in the record. `stopCount` is carried out
 * so the *sentence* does not then claim every stop states its length (QA R70-10). It does not
 * arise on the reference trip: all 16 days carry between 2 and 12 stops.
 */
export function classifyDay(day: Day, part: DayPart): DayVerdict {
  const w = DAYPART_WINDOWS[part];
  const fromMin = timeVal(w.from);
  const toMin = timeVal(w.to);
  const occupying: Occupying[] = [];
  const starts: Stop[] = [];
  const runsInto: Occupying[] = [];
  const withoutOccupancy: Stop[] = [];
  const withoutTime: Stop[] = [];
  let lastUncertainBefore: ClockTime | null = null;

  for (const stop of day.stops) {
    const interval = occupiedInterval(stop);
    if (interval === null) {
      if (stop.placement.kind === 'scheduled') withoutTime.push(stop);
    } else if (intervalIntersects(interval, fromMin, toMin)) {
      const startsInWindow = interval.startMin >= fromMin;
      const hit: Occupying = { stop, interval, startsInWindow };
      occupying.push(hit);
      if (startsInWindow) starts.push(stop);
      else runsInto.push(hit);
    } else if (interval.source === null && interval.startMin < fromMin) {
      const t = stop.placement.kind === 'scheduled' ? stop.placement.time : null;
      if (t !== null && (lastUncertainBefore === null || t > lastUncertainBefore)) lastUncertainBefore = t;
    }
    // "States a run length" is a property of the STOP, not of whether it could be placed on a
    // clock — one definition, read through one function (A-96 Part 2).
    if (stopOccupancy(stop) === null) withoutOccupancy.push(stop);
  }

  const state = occupying.length > 0
    ? 'busy'
    : withoutOccupancy.length > 0 || withoutTime.length > 0
      ? 'unknown'
      : 'open';
  return { state, occupying, starts, runsInto, lastUncertainBefore, withoutOccupancy, withoutTime, stopCount: day.stops.length };
}
