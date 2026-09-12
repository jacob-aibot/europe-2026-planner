/**
 * **How long a stop occupies the clock — ARCHITECTURE §11.11 A-96 Part 2.** One definition, two
 * callers: `conflict/rules/overlap.ts` (which had this computation module-private since Phase 1)
 * and `ask/freeTime.ts` (which shipped a second, narrower opinion of it).
 *
 * > **A fact the document carries in two different fields is read through one function, not at
 * > two call sites.** The user did not write down a field name; they wrote down how long the bus
 * > takes.
 *
 * `durationMins` wins where it is set. Otherwise, for a **`travelRole: 'journey'`** stop,
 * §2.12 is explicit that *`arrival` is the vehicle's own journey and `time` is when it DEPARTS* —
 * so `arrival.mins` **is** that stop's own run length. Measured over the reference trip: **21 of
 * 21 journey stops carry an `arrival` and all 21 carry `durationMins: null`**, which is the
 * population `free_time` was calling silent (QA R70-3).
 *
 * **The trap, named so nobody walks into it: an `arrival` on a NON-journey stop is not
 * occupancy.** §2.5 makes `Stop.arrival` *the leg INTO this stop* — for `'transfer'` (the
 * default) `time` is when you **arrive** and `arrival.mins` is a journey already finished.
 * Measured: **60 of the 112 scheduled stops are that shape**, and reading them as occupancy would
 * double-count the whole trip. `'unknown'` is not `'journey'` and states nothing either, per
 * §2.12's own degrade rule.
 *
 * **Not on §2.10's surface** (A-96 Part 2 decision 3 / §11.9). Two callers, both inside this
 * package; publishing a symbol is a one-way door and the trigger for taking it is the first
 * consumer outside `packages/core/src`. **Nothing here is stored**: `SUMMARY_VERSION` stays 8 and
 * `SCHEMA_VERSION` stays 5, and this is computed from the document on every call exactly like
 * `computeLegs`.
 *
 * Pure. No clock, no randomness, no I/O.
 */
import type { Stop } from '../model/types.ts';
import { timeVal } from './legs.ts';

/** Which field of the document stated the run length. */
export type OccupancySource = 'stated_duration' | 'journey_run';

/** The last minute of a day, as minutes since midnight. `23:59`. */
const DAY_END_MIN = 23 * 60 + 59;

/**
 * How long the stop occupies the clock, or `null` when the document does not say. Pure.
 *
 * @throws nothing.
 */
export function stopOccupancy(stop: Stop): { mins: number; source: OccupancySource } | null {
  if (stop.durationMins != null) return { mins: stop.durationMins, source: 'stated_duration' };
  if (stop.travelRole === 'journey' && stop.arrival) return { mins: stop.arrival.mins, source: 'journey_run' };
  return null;
}

export type OccupiedInterval = {
  /** Minutes since midnight, wall-clock at the stop's own location. */
  startMin: number;
  /**
   * `startMin` + the stated run. **NOT clamped — it may exceed 1439** (§11.12 A-97 Part 3).
   * Equals `startMin` when `source` is `null`.
   */
  endMin: number;
  /** `null` = no run length stated; the stop occupies an instant. */
  source: OccupancySource | null;
  /** `endMin > DAY_END_MIN` — the run outlives the day it starts in. */
  crossesDay: boolean;
};

/**
 * The stop's occupied interval, or `null` when it is not on a day's clock at all — a pooled stop,
 * or a scheduled stop with no `placement.time`. Pure.
 *
 * **`endMin` is the document's own arithmetic — §11.12 A-97 Part 3 (QA R71-1).** It used to be
 * clamped to 23:59, and `free_time` rendered that clamp as a landing time: *"on 2026-08-07 you
 * are on a flight from 16:45 until 23:59"* about a stop whose document says `arrival.mins: 660`,
 * i.e. 03:45 the next day. **A value computed to DECIDE a question may never be STATED as a fact
 * unless it is true outside the decision that produced it.** The narrowing lives inside the
 * consumer that needs it — `intervalIntersects` — and this returns what the document says, so
 * there is exactly **one** end-of-run instant in this package and `overlap`'s `start + mins`
 * spells the same number.
 *
 * **There is deliberately no second field.** `endMinRaw` beside `endMin` is refused by A-97 Part 3
 * decision 3: two fields for one quantity is the shape that makes the next caller pick the wrong
 * one silently. **The failure mode of forgetting must be ugly, not false** — a reader who ignores
 * `crossesDay` renders `27:45` (odd prose, true of the document) where it used to render `23:59`
 * (clean prose, false). Measured: 2 of the 21 journey intervals on the reference trip run past
 * 23:59. The instant is still in the *departure* stop's wall clock and core does no timezone
 * maths (§2.1, §7) — `crossesDay` says a run outlives its day and nothing says which day it lands
 * on (A-97 Part 9 residue 1).
 *
 * @throws nothing.
 */
export function occupiedInterval(stop: Stop): OccupiedInterval | null {
  if (stop.placement.kind !== 'scheduled' || stop.placement.time === null) return null;
  const startMin = timeVal(stop.placement.time);
  if (startMin === 99999) return null;
  const occ = stopOccupancy(stop);
  if (occ === null) return { startMin, endMin: startMin, source: null, crossesDay: false };
  const endMin = startMin + occ.mins;
  return { startMin, endMin, source: occ.source, crossesDay: endMin > DAY_END_MIN };
}

/**
 * Minutes since midnight → `HH:MM`. The inverse of `legs.ts`'s `timeVal`, and it lives beside the
 * interval because an interval's `endMin` is a computed instant no field of the document spells.
 * **Not clamped to 24 hours**: `overlap` renders a run that passes midnight as `27:45`, which is
 * the honest reading of a wall clock the model does no timezone maths on (§2.1, §7). Pure.
 *
 * @throws nothing.
 */
export function clockOf(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/**
 * Does this stop's occupied time intersect `[fromMin, toMin]`? Pure.
 *
 * **A stop that states no run length occupies its start instant and nothing more** — it is inside
 * the window only when its start is. A stated run is half-open at its end (`[start, end)`),
 * exactly as `overlap` compares two runs: a leg landing at 18:00 does not occupy 18:00.
 *
 * **A stated run is tested at BOTH ends — QA R71-4.** Testing only `end > fromMin` is equivalent
 * for `mins > 0` and wrong otherwise: `durationMins: 0` at the window's first minute, and any
 * negative `mins` (`fromJSON`'s `numOf` accepts both, and no build door refuses them), made a stop
 * that starts *inside* the window not occupy it — `classifyDay` returned `open` and the answer was
 * a confident **"Yes."** at `coverage: 'complete'`.
 *
 * **This is where the day-closed reading lives — §11.12 A-97 Part 3 decision 2.** The clamp used
 * to sit on `endMin` itself, where its only reader was prose and where it was false (R71-1). It
 * belongs to this predicate, which is the one caller that needs *"no claim about the next day"*
 * (A-96 Part 3). It is **behaviourally inert at every window this vocabulary can name** —
 * `DAYPART_WINDOWS`' three `from` values are 300, 720 and 1080, all below 1439, and clamping a
 * value already above 1439 down to 1439 cannot change `> 300`, `> 720` or `> 1080`. It is kept
 * because a **fourth daypart** is cheaper to add against an explicit line than against an argument
 * about window bounds.
 *
 * @throws nothing.
 */
export function intervalIntersects(i: OccupiedInterval, fromMin: number, toMin: number): boolean {
  if (i.startMin > toMin) return false;
  if (i.source === null) return i.startMin >= fromMin;
  // The run is closed inside its own day HERE, and nowhere else: the model makes no claim about
  // the next day, and `endMin` itself stays the document's own arithmetic (A-97 Part 3).
  const end = Math.min(i.endMin, DAY_END_MIN);
  return i.startMin >= fromMin || end > fromMin;
}
