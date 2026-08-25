/**
 * The derived cache (ARCHITECTURE §4.2 rule 3).
 *
 * Derived data is never stored and is invalidated WHOLESALE on `doc.revision`. No partial
 * invalidation: it is cheap at 112 stops and it removes a class of stale-view bugs outright.
 *
 * `rollUpCost` is always called with `{ target: trip.homeCurrency }`. Without it,
 * `missingRates` lists every currency INCLUDING the trip's own, and a EUR trip renders
 * "No conversion rate for EUR" (F-15).
 */
import * as core from '../deps.ts';
import type { Conflict, Issue, Leg, Trip } from '../deps.ts';

export type DayDerived = {
  legs: (Leg | null)[];
  movingMinutes: number;
  distanceKm: number;
  cost: core.CostRollUp;
  focus: core.FocusResult;
  focusBounds: core.MapBounds;
  allBounds: core.MapBounds;
};

export type DerivedCache = {
  revision: number;
  tripId: string;
  days: Record<string, DayDerived>;
  conflicts: Conflict[];
  issues: Issue[];
  tripCost: core.CostRollUp;
  summary: core.TripSummaryRow;
};

/** Computes everything derived for a trip. Pure. */
export function computeDerived(trip: Trip, today: string): DerivedCache {
  const days: Record<string, DayDerived> = {};
  for (const day of trip.days) {
    const focus = core.focusCluster(day.stops, trip);
    days[day.id] = {
      legs: core.computeLegs(day, trip),
      movingMinutes: core.dayMovingMinutes(day, trip),
      distanceKm: core.dayDistanceKm(day, trip),
      cost: core.rollUpCost(day.stops, { target: trip.homeCurrency }),
      focus,
      focusBounds: core.mapBounds(core.stopPoints(focus.focus, trip)),
      allBounds: core.mapBounds(core.stopPoints(day.stops, trip)),
    };
  }
  return {
    revision: trip.revision,
    tripId: trip.id,
    days,
    conflicts: core.detectConflicts(trip, { today }),
    issues: core.validateTrip(trip),
    tripCost: core.rollUpCost(trip, { target: trip.homeCurrency }),
    summary: core.tripSummary(trip),
  };
}

/**
 * Returns the cache, recomputing when the revision or the trip changed. Pure given a cache.
 *
 * The staleness check is `(tripId, revision)` — not `revision` alone, because two trips in
 * the library can sit at the same revision and must not read each other's derived data.
 */
export function derivedFor(cache: DerivedCache | null, trip: Trip | null, today: string): DerivedCache | null {
  if (!trip) return null;
  if (cache && cache.revision === trip.revision && cache.tripId === trip.id) return cache;
  return computeDerived(trip, today);
}
