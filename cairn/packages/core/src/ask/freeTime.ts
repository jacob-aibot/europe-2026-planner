/**
 * **The three-valued daypart classifier — §11.7 rule 3.** One of exactly two computations that
 * are `ask/`'s own (§11.4's ceiling); the other is `country_count`'s evidence walk. Both are
 * about *answering* rather than about the trip. A third would be a design defect routed to the
 * architect, whose fix is a function in `derive/` used by both callers.
 *
 * **Nothing is defaulted into existence.** Measured over the reference trip: **143 of 143 stops
 * carry `durationMins: null`** (112 scheduled + 31 pooled) — the legacy planner recorded when
 * things start and never how long they take. So *"do I have a free evening in Split?"* has no
 * evidence behind a **yes**, and the table below has three values rather than two:
 *
 * | Value     | Means                                                                          |
 * |-----------|--------------------------------------------------------------------------------|
 * | `busy`    | a stop **starts** inside the window                                             |
 * | `open`    | nothing starts inside it **and every stop that day states a `durationMins`**    |
 * | `unknown` | nothing starts inside it and at least one stop that day states no duration      |
 *
 * **A stop with `durationMins: null` occupies its start instant and nothing more, and no default
 * duration is invented.** `CAT_DEFAULT_TIME` is §2.10 group 2's class — *a tuning constant a
 * caller must not read or reproduce* — and reaching for it here would put a second definition of
 * *"how long a stop takes"* into an answer the user is invited to trust.
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
import type { DayPart } from './types.ts';

/**
 * The three windows, as `HH:MM` wall-clock at the stop's location (§2.1 — core stores no UTC
 * instants and does no timezone maths, so a lexical string compare IS the time comparison).
 *
 * **`evening` is §11.7's own, stated there as 18:00–23:59.** `morning` and `afternoon` are this
 * module's, pinned here rather than left implicit: the boundary that matters is that the 14th's
 * last start, **17:15**, falls in the afternoon and not in the evening, which is what makes that
 * day's evening the measured `unknown` rather than a `busy`.
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

export type DayVerdict = {
  state: 'busy' | 'open' | 'unknown';
  /** The stops that START inside the window. Empty unless `state` is `busy`. */
  starts: Stop[];
  /** The last time anything starts on this day at all, or `null` if nothing is timed. */
  latestStart: ClockTime | null;
  /** Stops on this day that state no `durationMins`. The reason a day is `unknown`. */
  withoutDuration: Stop[];
  /** Scheduled stops on this day carrying no `placement.time` — `time_unknown`'s population. */
  withoutTime: Stop[];
};

/** The stop's start time, or `null` — a pooled stop has no place in a day's clock. */
function startTime(stop: Stop): ClockTime | null {
  return stop.placement.kind === 'scheduled' ? stop.placement.time : null;
}

/**
 * Classify one day against one daypart. Pure; reads `Stop.placement.time` and
 * `Stop.durationMins` and nothing else.
 *
 * **The vacuous case is deliberate**: a day with no stops at all has nothing starting in the
 * window and no stop that fails to state a duration, so it is `open`. That is the honest reading
 * of an empty day — nothing is planned — rather than a hole in the record. It does not arise on
 * the reference trip: all 16 days carry between 2 and 12 stops.
 */
export function classifyDay(day: Day, part: DayPart): DayVerdict {
  const w = DAYPART_WINDOWS[part];
  const starts: Stop[] = [];
  const withoutDuration: Stop[] = [];
  const withoutTime: Stop[] = [];
  let latestStart: ClockTime | null = null;
  for (const stop of day.stops) {
    const t = startTime(stop);
    if (t === null) {
      if (stop.placement.kind === 'scheduled') withoutTime.push(stop);
    } else {
      if (latestStart === null || t > latestStart) latestStart = t;
      if (t >= w.from && t <= w.to) starts.push(stop);
    }
    if (stop.durationMins === null) withoutDuration.push(stop);
  }
  const state = starts.length > 0 ? 'busy' : withoutDuration.length === 0 ? 'open' : 'unknown';
  return { state, starts, latestStart, withoutDuration, withoutTime };
}
