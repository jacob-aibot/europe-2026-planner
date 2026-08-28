/**
 * The derived cache (ARCHITECTURE §4.2 rule 3).
 *
 * Derived data is never stored and is invalidated WHOLESALE on `(document identity, today)`.
 * No partial invalidation: it is cheap at 112 stops and it removes a class of stale-view bugs
 * outright.
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
  /**
   * The exact `Trip` object this cache was computed from — §2.2b F2's key.
   *
   * `revision` and `tripId` are both gone: `revision` because `===` on a content counter
   * cannot prove sameness (undo makes it non-injective over content, so undo-then-a-different-
   * edit served the pre-undo document's legs and conflicts), and `tripId` because it is
   * subsumed — two trips cannot be the same object.
   */
  doc: Trip;
  /**
   * The date the cache was computed for. Added in revision 4 alongside the identity key: the
   * date-sensitive conflict rules went stale across midnight because nothing invalidated on
   * the clock.
   */
  today: string;
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
    doc: trip,
    today,
    days,
    conflicts: core.detectConflicts(trip, { today }),
    issues: core.validateTrip(trip),
    tripCost: core.rollUpCost(trip, { target: trip.homeCurrency }),
    summary: core.tripSummary(trip, core.COUNTRY_INDEX),
  };
}

/**
 * Returns the cache, recomputing when the document or the date changed. Pure given a cache.
 *
 * The staleness key is `(document identity, today)` — ARCHITECTURE §2.2b F2, §4.2 rule 3.
 * It used to be `(revision, tripId)`, and `===` on a revision cannot prove sameness: undo
 * restores a snapshot verbatim, so a different document can wear a revision an earlier one
 * already wore, and this cache then served the pre-undo document's legs, costs, clusters and
 * conflicts. Through `store.syncResolutions()` that does not merely render — it **writes**,
 * retiring resolutions against conflicts the current document does not have.
 *
 * `today` closes a smaller pre-existing hole: the date-sensitive conflict rules went stale
 * across midnight because nothing invalidated on the clock.
 */
export function derivedFor(cache: DerivedCache | null, trip: Trip | null, today: string): DerivedCache | null {
  if (!trip) return null;
  if (cache && cache.doc === trip && cache.today === today) return cache;
  return computeDerived(trip, today);
}
