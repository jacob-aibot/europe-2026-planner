/**
 * The trip lifecycle (ARCHITECTURE §8.1).
 *
 * **Derived, never stored.** There is no `Trip.status` field and a builder must not add one:
 * a stored status is a copy of a fact the dates already state, it goes stale at midnight with
 * nothing to invalidate it, and §0.6 is the whole of the argument — the same reasoning that
 * keeps `Leg`, `CostRollUp` and `Conflict` derived.
 *
 * Keyed on an injected `today` exactly as the conflict engine's `TripCtx` already is. Core has
 * no ambient clock (§2.1), so the caller supplies one.
 */
import type { Trip } from '../model/types.ts';
import type { IsoDate } from '../model/ids.ts';
import { dayNumber } from './summary.ts';

export type Lifecycle = 'planned' | 'active' | 'completed';

/**
 * Which stage of its own life the trip is in on `today`.
 *
 * `endDate` is **inclusive**: a trip ending on the 22nd is still `'active'` on the 22nd and
 * `'completed'` on the 23rd. A zero-day trip (`startDate === endDate`) is `'active'` on
 * exactly that one day.
 *
 * Compares calendar day numbers rather than strings, so it is correct across month and year
 * rollovers and does not depend on `YYYY-MM-DD` sorting lexicographically.
 *
 * Pure.
 *
 * @throws {Error} if `today`, `trip.startDate` or `trip.endDate` is not a `YYYY-MM-DD`
 *         calendar date — programmer error per §2.1. A document cannot hold one:
 *         `createTrip`, `setTripMeta` and `fromJSON` all reject it before it gets here.
 */
export function lifecycle(trip: Trip, today: IsoDate): Lifecycle {
  const now = dayNumber(today);
  if (now < dayNumber(trip.startDate)) return 'planned';
  if (now > dayNumber(trip.endDate)) return 'completed';
  return 'active';
}
