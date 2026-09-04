/**
 * `@cairn/core` — the public surface of ARCHITECTURE §2.10 and nothing else.
 *
 * **83 runtime symbols, one list, set equality in both directions** (69 at revision 5, QA R2-12,
 * BUILD-NOTES KD-33; +`reassertRetirements` at revision 6; +`lifecycle` at Phase 2 I-1;
 * +`countryOf` and `COUNTRY_INDEX` at Phase 2 I-5; +`SUMMARY_VERSION` at Phase 2 I-6;
 * +`travelStats` at Phase 2 I-7; +`clusterPoints` at Phase 2 I-8d, §4.4 A-41 Part 6;
 * +`isIsoDate` at Phase 2 I-8e, §2.9 A-46 Part 2; +`countryKeyPoint` at Phase 2 I-8g,
 * §4.4 A-48 Part 2; **+`addPhoto`, `removePhoto`, `updatePhoto` and `readExif` at Phase 2 I-13,
 * §10.1/§10.2, A-57 Part 6 — 79 → 83, counted in this pass and pinned in §2.10 and ROADMAP
 * criterion E in the same commit, which is §8.9's rule**). It used to be 110 against a 50-name list plus a 60-name "beyond §2.10,
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
  PhotoAsset, PhotoAttachRef, PhotoDerivative,
} from './model/types.ts';
export { SCHEMA_VERSION, LOCAL_OWNER } from './model/types.ts';
export type { TripId, DayId, StopId, PlaceId, PhotoId, BookingId, ConflictId, UserId, CityKey, RuleId, CountryCode, IsoDate, ClockTime, Currency, IdFactory, ClockPort } from './model/ids.ts';
export { sequentialIds } from './model/ids.ts';
// §2.9 **A-46** Part 2 / §2.10, Phase 2 I-8e. A **predicate, not a parser**: A-45 made this the
// definition of a date for the whole system and left it reachable only from inside core, so
// `packages/client`'s `rowDatesReadable` could not ask the question `fromJSON` now answers and
// the alternative was a second calendar implementation there — the exact defect A-20, A-21,
// A-37 and A-45 have each treated once. A caller holding a document still calls `fromJSON`,
// which does far more than check two dates; no caller may use this to decide a document is
// safe to accept. `daysInMonth` and `ISO_DATE_RE` stay internal.
export { isIsoDate } from './model/ids.ts';
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
// §10.1, Phase 2 **I-13** (A-57 Part 6). Three build functions, on P1's terms: `packages/client`
// dispatches all three through `ACTION_SPECS`, which resolves `core[spec.coreFn]` off THIS index
// and nothing else. `reattachDanglingPhotos` deliberately stays internal — it is §10.3's repair
// applied by `removeStop`/`ensureDays`, not a capability a caller gets to invoke, and exporting
// it would publish a way to rewrite a photo's attachment with no gate.
export { addPhoto, removePhoto, updatePhoto } from './build/photos.ts';
export type { PhotoInit, PhotoPatch } from './build/photos.ts';

// ---- derive (26) -------------------------------------------------------------
// `countryOf` and `COUNTRY_INDEX` join in revision 20's terms under Phase 2 I-5: §8.4 clause 1
// names `countryOf(at, index)` as a callable (P2), and the same clause's revision-10 consequence
// says the index "is generated code inside `packages/core` and is exported as a value from
// `index.ts` so every call site can pass it" — which `tools/gen-golden.mjs` already is (P1),
// since §2.10 ceiling (1) forbids it reaching into `geo/countries.gen.ts` by module path.
// `countryKeyPoint` joins at Phase 2 I-8g under §4.4 **A-48** Part 2 (P2 — that section names
// it) and P1 (`packages/client`'s `worldMapFrame` calls it). A key point is a geometric
// property of the index, as `box` and `countryOf` are, and computing it in the client would put
// a second bounds computation there — which §4.4 A-40 clause 2 forbids in as many words. It is
// a LABEL for a country, never an attribution of a coordinate: `countryOf`'s `null` stays
// first-class and nothing may snap a point to the nearest key. The ring-area helper it needs is
// module-private.
// `countryParts` joins at Phase 2 I-8h under §4.4 **A-49** Part 9, on `countryKeyPoint`'s terms
// verbatim: P2 (that section names it) and P1 (`worldMapFrame` calls it). A country's parts are
// a geometric property of the index, as `box`, `countryOf` and the key point already are, and
// deriving them in `packages/client` would put a second bounds computation there. It is a LABEL
// for a country's geometry — *"which pieces is this country in, and where is each"* — never an
// answer about a coordinate. It takes the threshold as an argument because the threshold is
// framing policy and lives in the client (A-41 C4). `CountryPart` is a type and is not part of
// §2.10's runtime set-equality count.
export { countryOf, countryKeyPoint, countryParts } from './derive/country.ts';
export type { CountryPart } from './derive/country.ts';
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
export { clusterPoints, clusterStops, focusCluster, fitSpanKm, mapBounds, stopPoints, MIN_SPAN_KM } from './derive/cluster.ts';
export type { FocusResult, MapBounds } from './derive/cluster.ts';
export { rollUpCost } from './derive/cost.ts';
export type { RollUpScope, RollUpOpts } from './derive/cost.ts';
export { displayStatus, attribution } from './derive/display.ts';
// `SUMMARY_VERSION` joins under §8.4 clause 3 at Phase 2 I-6: `packages/client` compares
// every stored row against it and rescans the ones below, so it has to be public.
export { cityRange, tripSummary, daysForCity, orderedCities, weekdayOf, SUMMARY_VERSION } from './derive/summary.ts';
export type { TripSummaryRow, TripSummaryCity, AttributionCensus } from './derive/summary.ts';
// `travelStats` joins under §8.4 clause 2 at Phase 2 I-7: the clause names it as a callable, and
// the Profile and the CLI are outside `packages/core`. Its inputs are summary rows and an
// injected `today` — never a document, never storage — which is §4.2's "exactly ONE trip in
// memory at a time" surviving the one screen that would want forty.
export { travelStats } from './derive/travelStats.ts';
export type { TravelStats, TravelStatsCountry, TravelStatsCity, TravelRecordCensus } from './derive/travelStats.ts';

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

// ---- photo (1) — §10.2 --------------------------------------------------------
// `readExif` is on the surface under P2 (§10.2 names it as a callable) and P1 (`apps/web`'s
// import path and `cli.ts photos` both call it). **A-58 Part 3 is why it is in core at all**:
// it is pure byte arithmetic with no DOM, no clock and no randomness — a derivation — and
// derivations live in core because that is where they are testable on bare Node against a
// golden and where `apps/web`, `apps/mobile`, `services/api` and the CLI reach the same answer.
// `ExifRead` is a type and does not count.
export { readExif } from './photo/exif.ts';
export type { ExifRead } from './photo/exif.ts';

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
