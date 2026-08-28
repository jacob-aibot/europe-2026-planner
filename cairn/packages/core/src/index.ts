/**
 * `@cairn/core` — the public surface of ARCHITECTURE §2.10 and nothing else.
 *
 * **73 runtime symbols, one list, set equality in both directions** (69 at revision 5, QA R2-12,
 * BUILD-NOTES KD-33; +`reassertRetirements` at revision 6; +`lifecycle` at Phase 2 I-1;
 * +`countryOf` and `COUNTRY_INDEX` at Phase 2 I-5). It used to be 110 against a 50-name list plus a 60-name "beyond §2.10,
 * each with a justification" list, which made the acceptance criterion true by construction:
 * 110 = 50 + 60 for *any* 110 exports. A boundary the Phase 2 server and the Phase 4 native
 * app are written against cannot be "110 against 50, enumerated".
 *
 * A symbol is here if **either** a consumer outside `packages/core` calls it today
 * (`packages/client`, `apps/web`, `cli.ts`, `fixtures/`, `tools/`) **or** a numbered section
 * of `ARCHITECTURE.md` names it as a callable or a constant. Everything else is internal,
 * whether or not it was exported before. **Tests do not create surface:** `packages/core`'s
 * own tests, `cairn/test/` and `cairn/qa/` import a module path directly
 * (`packages/core/src/derive/geo.ts`) — attacking internals is their job, and routing that
 * through the index would make every internal public.
 *
 * Types are exported freely and are NOT part of the set-equality assertion: they are erased
 * at runtime, `tsc` already fails on a missing one, and a type cannot leak an implementation
 * the way a function can.
 *
 * Zero runtime dependencies. No DOM, no fetch, no fs, no `Date.now()`, no randomness:
 * a clock and an `IdFactory` are injected so every output is reproducible and golden files
 * are possible.
 */

// ---- model (7) ---------------------------------------------------------------
export type {
  Trip, City, Day, Stop, StopPlacement, Place, PlaceLink, Booking, BookingKind, Ticket,
  CostEstimate, Money, MoneyBasis, Provenance, ProvenanceSource, ProvenanceState,
  ProvenanceConfidence, Conflict, ConflictKind, ConflictResolution, ConflictSeverity,
  Leg, Issue, IssueCode, Ref, RefKind, LatLng, StopCategory, StopFlag, TravelMode, TravelRole,
  MoveOverride, CostRollUp, DisplayStatus, OpeningHours, Link, TripCtx, TripMeta, DatePrecision,
} from './model/types.ts';
export { SCHEMA_VERSION, LOCAL_OWNER } from './model/types.ts';
export type { TripId, DayId, StopId, PlaceId, BookingId, ConflictId, UserId, CityKey, RuleId, CountryCode, IsoDate, ClockTime, Currency, IdFactory, ClockPort } from './model/ids.ts';
export { sequentialIds } from './model/ids.ts';
export { costFromDisplay, formatRange } from './model/money.ts';
// `TripParseError` / `ForeignDocumentError` are model symbols by §2.10's grouping; they are
// declared next to the parser that throws them. Re-exported once, below, with `fromJSON`.

// The provenance CONSTRUCTORS (`userProvenance`, `systemSuggestion`, `emailCandidate`,
// `friendImport`) and the unchecked `accept`/`reject` primitives are all off the surface, for
// one reason: they stamp provenance with no gate, so exporting them publishes a way to mint
// an attributed record without going through `copyStopInto` and its seven rules (§2.14). QA
// R5-5 took `accept`/`reject` off for exactly this argument; revision 5 finishes the job.
// The public ways to produce provenance are `createTrip`, `addStop`, `copyStopInto`,
// `acceptCandidate` and `rejectCandidate`, every one of which checks its actor.

// ---- build (17) --------------------------------------------------------------
export { createTrip, setTripMeta } from './build/createTrip.ts';
export type { BuildCtx, TripInit, CityInit, TripMetaPatch } from './build/createTrip.ts';
export { ensureDays, setDayMeta } from './build/days.ts';
export type { DayMetaPatch } from './build/days.ts';
export { addStop, updateStop, removeStop, moveStop, reorderStop } from './build/stops.ts';
export type { StopInit, StopPatch } from './build/stops.ts';
export { scheduleFromPool, returnToPool, poolFor } from './build/pool.ts';
export type { ScheduleHint } from './build/pool.ts';
export { upsertBooking, linkBooking } from './build/bookings.ts';
export { acceptCandidate, rejectCandidate } from './build/candidates.ts';
export { copyStopInto } from './build/copyStop.ts';
export type { CopyStopSource, CopyStopCtx } from './build/copyStop.ts';

// ---- derive (24) -------------------------------------------------------------
// `countryOf` and `COUNTRY_INDEX` join in revision 20's terms under Phase 2 I-5: §8.4 clause 1
// names `countryOf(at, index)` as a callable (P2), and the same clause's revision-10 consequence
// says the index "is generated code inside `packages/core` and is exported as a value from
// `index.ts` so every call site can pass it" — which `tools/gen-golden.mjs` already is (P1),
// since §2.10 ceiling (1) forbids it reaching into `geo/countries.gen.ts` by module path.
export { countryOf } from './derive/country.ts';
export { COUNTRY_INDEX } from './geo/countries.gen.ts';
export type { CountryIndex, CountryEntry, CountryEntryInit, CountryRing, CountryBox } from './geo/countryIndex.ts';
// `lifecycle` joins in revision 10 under P2: §8.1 names it, and §8.9 is the documentation
// change §2.10's own rule requires before a symbol may reach this file.
export { lifecycle } from './derive/lifecycle.ts';
export type { Lifecycle, DatedTrip } from './derive/lifecycle.ts';
export { computeLegs, dayMovingMinutes, dayDistanceKm, fmtMins } from './derive/legs.ts';
export { stopLatLng } from './derive/geo.ts';
export { geoCheck, GEO_LIMIT_KM } from './derive/geoCheck.ts';
export type { GeoFinding, GeoAnchor } from './derive/geoCheck.ts';
export { clusterStops, focusCluster, fitSpanKm, mapBounds, stopPoints, MIN_SPAN_KM } from './derive/cluster.ts';
export type { FocusResult, MapBounds } from './derive/cluster.ts';
export { rollUpCost } from './derive/cost.ts';
export type { RollUpScope, RollUpOpts } from './derive/cost.ts';
export { displayStatus, attribution } from './derive/display.ts';
export { cityRange, tripSummary, daysForCity, orderedCities, weekdayOf } from './derive/summary.ts';
export type { TripSummaryRow } from './derive/summary.ts';

// ---- conflict (6) ------------------------------------------------------------
// `reassertRetirements` joins in revision 6 (§2.7 A-5, QA R8-1): the retirement ledger lives
// in `packages/client`'s `AppState` and the function that re-asserts it onto a restored undo
// snapshot is a pure core build function, so the client has to be able to call it.
export { detectConflicts, RULES } from './conflict/detect.ts';
export type { DetectOpts } from './conflict/detect.ts';
export { reassertRetirements, resolveConflict, unresolveConflict, syncResolutions } from './conflict/resolve.ts';
export type { ResolutionInit } from './conflict/resolve.ts';
// `conflictId`, `makeConflict`, `digest` and `canonical` are internal: a conflict id is a
// value core mints and consumers compare, and a consumer that can MINT one can mint a
// resolution for a conflict that never existed.

// ---- validate (2) ------------------------------------------------------------
export { validateTrip, issueCounts } from './validate/validateTrip.ts';

// ---- merge (2) ---------------------------------------------------------------
// §4.2 rule 6b's "merge with the stored copy". KD-9 recorded these as exported without
// being in §2.10; revision 5 puts them IN §2.10, which closes that divergence — see KD-33.
// `mergeLostData` is an internal of `describeMerge` and comes off.
export { mergeTrips, describeMerge } from './merge/mergeTrips.ts';
export type { MergeReport, MergeNote, MergeResult } from './merge/mergeTrips.ts';

// ---- access (7) — defined now, enforced in Phase 2 (§6.2) ---------------------
// All seven, `can` and `effectiveRole` included: the module is a *definition*, and a
// definition with a private half is a definition Phase 2 will re-derive.
export { canView, canComment, canEdit, canShare, canDelete, can, effectiveRole } from './access/predicates.ts';
export type { Principal, Relationship, Role, Operation } from './access/predicates.ts';

// ---- serialize (3) -----------------------------------------------------------
export { toJSON } from './serialize/toJSON.ts';
export { fromJSON, TripParseError, ForeignDocumentError } from './serialize/fromJSON.ts';
export { migrateDoc } from './serialize/migrate.ts';

// ---- import (1) --------------------------------------------------------------
export { importLegacyDays } from './import/legacyDays.ts';
export type {
  ImportOpts, ImportResult, LegacyConstants, LegacyDay, LegacyStop, LegacyPlace, LegacyBookingFixture,
} from './import/legacyDays.ts';

// ---- redact (4) — §6.6 --------------------------------------------------------
// On the index from revision 5 because `tools/redact.mjs` reached into
// `packages/core/src/build/redactText.ts` by module path. §6.6 makes redaction a rule with a
// test behind it, and a rule enforced through a deep import into another package is the
// boundary erosion §2.10 exists to prevent.
export { REDACTION_PATTERNS, REDACTED, redactText, redactionHits } from './build/redactText.ts';
