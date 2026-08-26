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
  Leg, Issue, IssueCode, Ref, RefKind, LatLng, StopCategory, StopFlag, TravelMode, TravelRole,
  MoveOverride, CostRollUp, DisplayStatus, OpeningHours, Link, TripCtx, TripMeta,
} from './model/types.ts';
export { SCHEMA_VERSION, LOCAL_OWNER } from './model/types.ts';
export type { TripId, DayId, StopId, PlaceId, BookingId, ConflictId, UserId, CityKey, RuleId, IsoDate, ClockTime, Currency, IdFactory, ClockPort } from './model/ids.ts';
export { sequentialIds, fixedClock, isIsoDate } from './model/ids.ts';
export { parseCostDisplay, costFromDisplay, currenciesOf, mixesBasis, formatRange } from './model/money.ts';
// `accept` and `reject` are deliberately NOT here (QA R5-5). They take `UserId | null` and
// check nothing, so exporting them published a bypass around §2.14's gate — an acceptance
// with no accepter, mintable in one public call. The checked wrappers `acceptCandidate` and
// `rejectCandidate` are the public way to accept, and they call `requireActor` first. The
// primitives stay module-internal to `packages/core` and are called only from `build/`.
export { userProvenance, systemSuggestion, emailCandidate, friendImport } from './model/provenance.ts';

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
export { copyStopInto } from './build/copyStop.ts';
export type { CopyStopSource, CopyStopCtx } from './build/copyStop.ts';

// ---- derive -----------------------------------------------------------------
export { computeLegs, legBetween, dayMovingMinutes, dayDistanceKm, timeVal, fmtMins } from './derive/legs.ts';
export { haversine, resolvePlaceLink, stopLatLng, inRange, EARTH_RADIUS_KM } from './derive/geo.ts';
export { geoCheck, GEO_LIMIT_KM } from './derive/geoCheck.ts';
export type { GeoFinding, GeoAnchor } from './derive/geoCheck.ts';
export {
  clusterStops, focusCluster, fitSpanKm, rawSpanKm, mapBounds, stopPoints,
  MIN_SPAN_KM, DEFAULT_CLUSTER_THRESHOLD_KM,
} from './derive/cluster.ts';
export type { FocusResult, MapBounds } from './derive/cluster.ts';
export { rollUpCost, dayCost } from './derive/cost.ts';
export type { RollUpScope, RollUpOpts } from './derive/cost.ts';
export { displayStatus, needsBadge, statusLabel, attribution } from './derive/display.ts';
export {
  cityRange, tripSummary, daysForCity, orderedCities, addDays, dayNumber, dateSpan,
  parseIsoDate, fromDayNumber, weekdayOf,
} from './derive/summary.ts';
export type { TripSummaryRow } from './derive/summary.ts';

// ---- conflict ---------------------------------------------------------------
export { detectConflicts, conflictsFor, RULES } from './conflict/detect.ts';
export type { DetectOpts } from './conflict/detect.ts';
export { resolveConflict, unresolveConflict, syncResolutions } from './conflict/resolve.ts';
export type { ResolutionInit } from './conflict/resolve.ts';
export { conflictId, makeConflict, digest, canonical } from './conflict/id.ts';

// ---- validate ---------------------------------------------------------------
export { validateTrip, issueCounts, STALE_RESOLUTION_LIMIT } from './validate/validateTrip.ts';

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
export { fromJSON, TripParseError, ForeignDocumentError } from './serialize/fromJSON.ts';
export { migrateDoc } from './serialize/migrate.ts';

// ---- import -----------------------------------------------------------------
export { importLegacyDays } from './import/legacyDays.ts';
export type {
  ImportOpts, ImportResult, LegacyConstants, LegacyDay, LegacyStop, LegacyPlace, LegacyBookingFixture,
} from './import/legacyDays.ts';
