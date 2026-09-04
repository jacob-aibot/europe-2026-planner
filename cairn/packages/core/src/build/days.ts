/**
 * Day skeleton maintenance (ARCHITECTURE §2.3).
 *
 * Days are stored, because editorial city assignment, day-level prose, empty days and
 * day-level provenance are all things nothing derives. The dangerous half of "stored" is
 * drift, so: `days` MUST be dense over `[startDate,endDate]` and `Day.id === Day.date`,
 * and every function that touches the range comes through here.
 */
import type { Day, Trip } from '../model/types.ts';
import type { CityKey, DayId, IsoDate } from '../model/ids.ts';
import { addDays, dayNumber } from '../derive/summary.ts';
import { userProvenance } from '../model/provenance.ts';
import { reattachDanglingPhotos } from './photos.ts';
import type { BuildCtx } from './createTrip.ts';

/**
 * The widest day skeleton `ensureDays` will mint: ten Gregorian years, inclusive
 * (`2020-01-01 … 2029-12-31` is exactly this). §2.3 **A-35**, QA R29-2.
 *
 * Module-private and **not exported**: §2.10's surface does not move, and no view needs the
 * number — the forms learn about the bound the way they already learn about a non-calendar
 * date, by catching the throw (`PastTripForm.submit` and `Library`'s `NewTrip.submit` both
 * already wrap `store.createTrip` in `try { … } catch (err) { onError(...) }`).
 */
const MAX_TRIP_SPAN_DAYS = 3653;

/** A blank day. Pure. */
export function blankDay(date: IsoDate, primaryCity: CityKey | 'transit', at: IsoDate): Day {
  return {
    id: date,
    date,
    primaryCity,
    cities: primaryCity === 'transit' ? ['transit'] : [primaryCity],
    title: '',
    subtitle: '',
    stops: [],
    provenance: userProvenance(at),
  };
}

/**
 * Makes `trip.days` dense over `[startDate, endDate]`, sorted, with `Day.id === Day.date`.
 *
 * Existing days are preserved by date. A day that falls outside the range is dropped if it
 * is empty; if it still holds stops the trip's range is WIDENED to keep it rather than
 * silently destroying content. Pure.
 *
 * @param alreadyBumped internal — set when the caller has already incremented `revision`.
 */
export function ensureDays(trip: Trip, ctx: BuildCtx, alreadyBumped = false): Trip {
  const byDate = new Map<IsoDate, Day>();
  for (const d of trip.days) byDate.set(d.date, { ...d, id: d.date });

  let start = trip.startDate;
  let end = trip.endDate;
  for (const d of byDate.values()) {
    if (d.stops.length === 0) continue;
    if (dayNumber(d.date) < dayNumber(start)) start = d.date;
    if (dayNumber(d.date) > dayNumber(end)) end = d.date;
  }

  const span = dayNumber(end) - dayNumber(start);
  // §2.3 **A-35**. AFTER the widening loop, because the span that matters is the one that will
  // actually be minted; BEFORE the allocation loop, because the harm is the allocation and the
  // refusal has to precede it. `span + 1`, because the loop below mints `span + 1` days.
  //
  // Not an `Issue`: by the time `validateTrip` could report one the 664,377 records exist. Not
  // a floor on `IsoDate` either (A-32 Part 4) — a year floor would not have caught this, since
  // `1900-01-01 → 2500-12-31` is 219,000 days of entirely ordinary years. The disease is span.
  if (span + 1 > MAX_TRIP_SPAN_DAYS) {
    throw new Error(
      `ensureDays: this trip would cover ${span + 1} days (${start} → ${end}), and one trip may ` +
        `cover at most ${MAX_TRIP_SPAN_DAYS} (about ten years). Check the year in the dates.`,
    );
  }
  const days: Day[] = [];
  for (let i = 0; i <= span; i++) {
    const date = addDays(start, i);
    const existing = byDate.get(date);
    days.push(existing ?? blankDay(date, 'transit', ctx.now));
  }
  // §10.3: this is the ONE function in core that can make a `dayId` stop existing (an empty day
  // outside the range is dropped above). A photo pointing at a dropped day falls back to
  // `{kind:'trip'}` rather than being deleted — A-57 Part 9 residue 2. It does not bump
  // `revision` a second time, and it returns the trip by reference when nothing dangles.
  return reattachDanglingPhotos({
    ...trip,
    startDate: start,
    endDate: end,
    days,
    revision: alreadyBumped ? trip.revision : trip.revision + 1,
  });
}

export type DayMetaPatch = Partial<Pick<Day, 'primaryCity' | 'cities' | 'title' | 'subtitle' | 'provenance' | 'legacyFlag' | 'tzId'>>;

/**
 * Patches a day's editorial fields. `cities` always ends up containing `primaryCity`
 * (an invariant `validateTrip` also checks). Pure.
 *
 * @throws {Error} if `dayId` is not in the trip — a programmer error, not a domain problem.
 */
export function setDayMeta(trip: Trip, dayId: DayId, patch: DayMetaPatch): Trip {
  const idx = trip.days.findIndex((d) => d.id === dayId);
  if (idx < 0) throw new Error(`setDayMeta: no such day ${dayId}`);
  const day = trip.days[idx];
  const merged: Day = { ...day, ...patch };
  const primary = merged.primaryCity;
  if (!merged.cities.includes(primary)) merged.cities = [primary, ...merged.cities];
  const days = trip.days.slice();
  days[idx] = merged;
  return { ...trip, days, revision: trip.revision + 1 };
}

/** Looks up a day. Pure; returns null rather than throwing. */
export function findDay(trip: Trip, dayId: DayId): Day | null {
  return trip.days.find((d) => d.id === dayId) ?? null;
}
