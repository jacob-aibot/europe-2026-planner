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
import type { BuildCtx } from './createTrip.ts';

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

  const days: Day[] = [];
  const span = dayNumber(end) - dayNumber(start);
  for (let i = 0; i <= span; i++) {
    const date = addDays(start, i);
    const existing = byDate.get(date);
    days.push(existing ?? blankDay(date, 'transit', ctx.now));
  }
  return {
    ...trip,
    startDate: start,
    endDate: end,
    days,
    revision: alreadyBumped ? trip.revision : trip.revision + 1,
  };
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
