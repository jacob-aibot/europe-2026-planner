/**
 * The pool — the generalisation of the live app's `OPTIONAL` list (ARCHITECTURE §2.10).
 *
 * `returnToPool` remembers the day, the time AND the index it left from, so
 * `scheduleFromPool` puts it back exactly. The roadmap requires that round-trip to be
 * lossless, and the live app's `removeSuggestion`/`addOptional` pair only remembered
 * day + time.
 */
import type { Stop, Trip } from '../model/types.ts';
import type { CityKey, ClockTime, DayId, StopId } from '../model/ids.ts';
import { findStop, moveStop } from './stops.ts';

/** Category → the default time the live app used when a pool item had no hint. */
export const CAT_DEFAULT_TIME: Record<string, ClockTime> = {
  sight: '11:00',
  food: '13:00',
  night: '21:00',
  suggest: '11:00',
  trip: '09:00',
  transit: '10:00',
  stay: '15:00',
};

/**
 * Picks the day a city add-on should land on: the least-packed day where the city is
 * PRIMARY (a transit day that merely passes through must not soak up adds meant for the
 * city itself), falling back to any day listing the city. Flagged days are skipped.
 * Pure; returns null when the city has no days.
 */
export function pickDay(trip: Trip, cityKey: CityKey): DayId | null {
  const primary = trip.days.filter((d) => d.primaryCity === cityKey && !d.legacyFlag);
  const days = primary.length ? primary : trip.days.filter((d) => d.cities.includes(cityKey) && !d.legacyFlag);
  if (!days.length) return null;
  return days.slice().sort((a, b) => a.stops.length - b.stops.length)[0].id;
}

/**
 * Moves a scheduled stop into its city's pool, remembering where it came from. Pure.
 * @throws {Error} if the stop is missing or already pooled.
 */
export function returnToPool(trip: Trip, stopId: StopId, cityKey?: CityKey): Trip {
  const stop = findStop(trip, stopId);
  if (!stop) throw new Error(`returnToPool: no such stop ${stopId}`);
  if (stop.placement.kind !== 'scheduled') throw new Error(`returnToPool: ${stopId} is already in the pool`);
  const dayId = stop.placement.dayId;
  const day = trip.days.find((d) => d.id === dayId);
  const order = day ? day.stops.findIndex((s) => s.id === stopId) : stop.placement.order;
  const city = cityKey ?? (day ? day.primaryCity : 'transit');
  return moveStop(trip, stopId, {
    kind: 'pool',
    cityKey: city,
    hint: { dayId, time: stop.placement.time ?? '', order: order < 0 ? 0 : order },
  });
}

export type ScheduleHint = { dayId?: DayId; time?: ClockTime; order?: number };

/**
 * Schedules a pooled stop. Uses, in order: the explicit hint, the stop's stored hint, then
 * `pickDay` + the category default time. Pure.
 *
 * @throws {Error} if the stop is missing, not pooled, or no day can be chosen.
 */
export function scheduleFromPool(trip: Trip, stopId: StopId, hint?: ScheduleHint): Trip {
  const stop = findStop(trip, stopId);
  if (!stop) throw new Error(`scheduleFromPool: no such stop ${stopId}`);
  if (stop.placement.kind !== 'pool') throw new Error(`scheduleFromPool: ${stopId} is not in the pool`);
  const stored = stop.placement.hint;
  const dayId = hint?.dayId ?? stored?.dayId ?? pickDay(trip, stop.placement.cityKey);
  if (!dayId) throw new Error(`scheduleFromPool: no day available for ${stop.placement.cityKey}`);
  if (!trip.days.some((d) => d.id === dayId)) throw new Error(`scheduleFromPool: no such day ${dayId}`);
  const time = hint?.time ?? stored?.time ?? CAT_DEFAULT_TIME[stop.category] ?? '12:00';
  const order = hint?.order ?? stored?.order ?? -1;
  return moveStop(trip, stopId, { kind: 'scheduled', dayId, time: time || null, order });
}

/** Every pooled stop for a city, in insertion order. Pure. */
export function poolFor(trip: Trip, cityKey: CityKey): Stop[] {
  return trip.pool.filter((s) => s.placement.kind === 'pool' && s.placement.cityKey === cityKey);
}
