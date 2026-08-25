/**
 * `@cairn/core` — the public surface of ARCHITECTURE §2.10 and nothing else.
 *
 * Zero runtime dependencies. No DOM, no fetch, no fs, no `Date.now()`, no randomness:
 * a clock and an `IdFactory` are injected so every output is reproducible and golden files
 * are possible.
 */

// ---- model ------------------------------------------------------------------
export type {
  Trip, City, Day, Stop, StopPlacement, Place, PlaceLink, Booking, BookingKind, Ticket,
  CostEstimate, Money, MoneyBasis, Provenance, ProvenanceSource, ProvenanceState,
  ProvenanceConfidence, Conflict, ConflictKind, ConflictResolution, ConflictSeverity,
  Leg, Issue, IssueCode, Ref, RefKind, LatLng, StopCategory, StopFlag, TravelMode,
  MoveOverride, CostRollUp, DisplayStatus, OpeningHours, Link, TripCtx, TripMeta,
} from './model/types.ts';
export { SCHEMA_VERSION, LOCAL_OWNER } from './model/types.ts';
export type { TripId, DayId, StopId, PlaceId, BookingId, ConflictId, UserId, CityKey, RuleId, IsoDate, ClockTime, Currency, IdFactory, ClockPort } from './model/ids.ts';
export { sequentialIds, fixedClock, isIsoDate } from './model/ids.ts';
export { parseCostDisplay, costFromDisplay, currenciesOf, mixesBasis, formatRange } from './model/money.ts';
export { userProvenance, systemSuggestion, emailCandidate, friendImport, accept, reject } from './model/provenance.ts';

// ---- build ------------------------------------------------------------------
export { createTrip, setTripMeta } from './build/createTrip.ts';
export type { BuildCtx, TripInit, CityInit, TripMetaPatch } from './build/createTrip.ts';
export { ensureDays, setDayMeta, findDay, blankDay } from './build/days.ts';
export type { DayMetaPatch } from './build/days.ts';
export {
  addStop, updateStop, removeStop, moveStop, reorderStop, findStop, makeStop, addPlace,
  cityOfStop, compareStops, insertionIndex,
} from './build/stops.ts';
export type { StopInit, StopPatch } from './build/stops.ts';
export { scheduleFromPool, returnToPool, pickDay, poolFor, CAT_DEFAULT_TIME } from './build/pool.ts';
export type { ScheduleHint } from './build/pool.ts';
export { upsertBooking, linkBooking, supersedeBooking, stopsForBooking } from './build/bookings.ts';
export { acceptCandidate, rejectCandidate } from './build/candidates.ts';

// ---- derive -----------------------------------------------------------------
export { computeLegs, legBetween, dayMovingMinutes, dayDistanceKm, timeVal, fmtMins } from './derive/legs.ts';
export { haversine, resolvePlaceLink, stopLatLng, inRange, EARTH_RADIUS_KM } from './derive/geo.ts';
export {
  clusterStops, focusCluster, fitSpanKm, rawSpanKm, mapBounds, stopPoints,
  MIN_SPAN_KM, DEFAULT_CLUSTER_THRESHOLD_KM,
} from './derive/cluster.ts';
export type { FocusResult, MapBounds } from './derive/cluster.ts';
export { rollUpCost, dayCost } from './derive/cost.ts';
export type { RollUpScope, RollUpOpts } from './derive/cost.ts';
export { displayStatus, needsBadge, statusLabel } from './derive/display.ts';
export {
  cityRange, tripSummary, daysForCity, orderedCities, addDays, dayNumber, dateSpan,
  parseIsoDate, fromDayNumber, weekdayOf,
} from './derive/summary.ts';
export type { TripSummaryRow } from './derive/summary.ts';

// ---- conflict ---------------------------------------------------------------
export { detectConflicts, conflictsFor, RULES } from './conflict/detect.ts';
export type { DetectOpts } from './conflict/detect.ts';
export { resolveConflict, unresolveConflict } from './conflict/resolve.ts';
export { conflictId, makeConflict, digest, canonical } from './conflict/id.ts';

// ---- validate ---------------------------------------------------------------
export { validateTrip, issueCounts, FAR_FROM_CITY_KM } from './validate/validateTrip.ts';

// ---- merge -------------------------------------------------------------------
// NOT on §2.10's list. Added to implement §2.2's "last-writer-wins per stop with a
// revision guard", which Phase 1 shipped with neither half. BUILD-NOTES §1, KD-9.
export { mergeTrips, mergeLostData, describeMerge } from './merge/mergeTrips.ts';
export type { MergeReport, MergeNote, MergeResult } from './merge/mergeTrips.ts';

// ---- access (defined now, enforced in Phase 2 — §6.2) ------------------------
export { canView, canComment, canEdit, canShare, canDelete, can, effectiveRole } from './access/predicates.ts';
export type { Principal, Relationship, Role, Operation } from './access/predicates.ts';

// ---- serialize --------------------------------------------------------------
export { toJSON, toDoc } from './serialize/toJSON.ts';
export { fromJSON, TripParseError } from './serialize/fromJSON.ts';
export { migrateDoc } from './serialize/migrate.ts';

// ---- import -----------------------------------------------------------------
export { importLegacyDays } from './import/legacyDays.ts';
export type {
  ImportOpts, ImportResult, LegacyConstants, LegacyDay, LegacyStop, LegacyPlace, LegacyBookingFixture,
} from './import/legacyDays.ts';
