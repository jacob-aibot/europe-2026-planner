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
 * The only part of a trip `lifecycle` reads.
 *
 * §8.1 writes the signature as `lifecycle(trip: Trip, today)`, and a `Trip` satisfies this —
 * every existing caller is unaffected. It is stated structurally so that `Library.tsx`, which
 * renders `TripSummaryRow`s and never holds more than one `Trip` document in memory (§8.4),
 * can call **this** function rather than growing a second implementation of it. Sequencing
 * rule 1: a second implementation of trip state anywhere is a design defect.
 *
 * BUILD-NOTES **KD-37** records this as a divergence from §8.1's literal parameter type.
 */
export type DatedTrip = Pick<Trip, 'startDate' | 'endDate'>;

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
export function lifecycle(trip: DatedTrip, today: IsoDate): Lifecycle {
  const now = dayNumber(today);
  if (now < dayNumber(trip.startDate)) return 'planned';
  if (now > dayNumber(trip.endDate)) return 'completed';
  return 'active';
}
