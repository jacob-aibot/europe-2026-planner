/**
 * ARCHITECTURE §2.10 — the public API surface, asserted as set equality in both directions
 * against a literal list checked in here.
 *
 * *"Phase 1 exported 102 runtime symbols against a list of 38, which is not a leak the
 * manager can be expected to notice by eye."* This is the mechanism that fixes that: a
 * symbol added to `index.ts` without being added here fails the build, and a symbol listed
 * here and not exported fails too.
 *
 * The list is in two halves, deliberately.
 *
 *   `SECTION_2_10` is §2.10's list, transcribed. It is the contract.
 *   `BEYOND_2_10` is every symbol the index exports that §2.10 does not name, each with the
 *      caller that needs it. It is NOT a licence — it is the leak, enumerated so it can be
 *      reviewed line by line, which is the whole difference between 112-against-50 and a
 *      number nobody can act on. BUILD-NOTES §1, KD-19.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/index.ts';

/** §2.10, transcribed. Runtime symbols only — types are erased and cannot be counted. */
const SECTION_2_10 = [
  // model
  'LOCAL_OWNER', 'TripParseError', 'ForeignDocumentError', 'sequentialIds',
  // build
  'createTrip', 'ensureDays', 'setTripMeta', 'setDayMeta',
  'addStop', 'updateStop', 'removeStop', 'moveStop', 'reorderStop',
  'scheduleFromPool', 'returnToPool', 'acceptCandidate', 'rejectCandidate', 'copyStopInto',
  'upsertBooking', 'linkBooking', 'resolveConflict', 'syncResolutions',
  // derive
  'computeLegs', 'dayMovingMinutes', 'clusterStops', 'focusCluster', 'fitSpanKm', 'MIN_SPAN_KM',
  'mapBounds', 'stopPoints',
  'rollUpCost', 'displayStatus', 'attribution', 'needsBadge', 'cityRange', 'formatRange', 'tripSummary',
  'geoCheck',
  // conflict
  'detectConflicts', 'RULES',
  // validate
  'validateTrip',
  // access
  'canView', 'canEdit', 'canShare', 'canDelete',
  // serialize
  'toJSON', 'fromJSON', 'SCHEMA_VERSION', 'migrateDoc',
  // import
  'importLegacyDays',
] as const;

/**
 * Exported, not in §2.10, and why. Every line is a claim the reviewer can check.
 *
 * Anything here is a candidate for either widening §2.10 or making the symbol private. The
 * point of writing it out is that "112 exports against a list of 50" is not reviewable and
 * this is.
 */
const BEYOND_2_10: Record<string, string> = {
  // --- genuinely needed by the client, the CLI or the views -------------------
  fmtMins: 'apps/web DayTimeline and cli.ts render "1 h 20" — one implementation, not two',
  issueCounts: 'apps/web ValidationPanel and cli.ts split errors from warnings',
  orderedCities: 'apps/web Sidebar and cli.ts iterate cities in trip order',
  daysForCity: 'apps/web Sidebar groups days under city tabs',
  dayDistanceKm: 'apps/web DayTimeline and cli.ts show a day\'s distance',
  weekdayOf: 'apps/web Sidebar and cli.ts label a date',
  statusLabel: 'packages/tokens and apps/web render the provenance badge text',
  addPlace: 'apps/web StopEditor creates a Place for a new inline coordinate',
  findStop: 'apps/web StopEditor resolves the selected id',
  findDay: 'packages/client selectors resolve the active day',
  poolFor: 'apps/web PoolPanel lists the pool by city',
  pickDay: 'apps/web PoolPanel defaults the day when scheduling from the pool',
  unresolveConflict: 'apps/web ConflictsPanel undoes an acknowledgement',
  stopsForBooking: 'apps/web shows which stops a booking covers',
  supersedeBooking: 'the YZGDTS-class reissue, reachable from the booking editor',
  cityOfStop: 'packages/client selectors group stops by city',
  makeStop: 'packages/client builds a StopInit for the editor',
  compareStops: 'packages/client sorts a day for display',
  insertionIndex: 'packages/client places a new stop in a sorted day',
  haversine: 'apps/web DayMap labels a leg; one implementation of the distance, §2.13',
  timeVal: 'packages/client and apps/web sort and compare HH:MM',
  stopLatLng: 'apps/web DayMap resolves a pin',
  resolvePlaceLink: 'apps/web PlacesPanel resolves a link',
  inRange: 'apps/web StopEditor validates a typed coordinate before dispatching',
  isIsoDate: 'apps/web NewTrip validates a typed date; the ONE date validator, §2.9',
  parseCostDisplay: 'apps/web StopEditor parses a typed price string',
  costFromDisplay: 'apps/web StopEditor builds a CostEstimate from that',
  currenciesOf: 'apps/web DayTimeline lists the currencies on a day',
  mixesBasis: 'apps/web DayTimeline warns about a mixed-basis estimate',
  userProvenance: 'apps/web stamps a hand-added stop',
  systemSuggestion: 'the importer and the tests build a suggestion stamp',
  emailCandidate: 'Phase 3 ingest; shipped now so the shape is fixed, §2.8',
  friendImport: 'the provenance stamp copyStopInto builds, §2.14',
  fixedClock: 'tests and the CLI inject a clock, §2.1',
  CAT_DEFAULT_TIME: 'apps/web PoolPanel defaults a time by category',
  DEFAULT_CLUSTER_THRESHOLD_KM: 'apps/web DayMap "whole day\'s journey" toggle',
  EARTH_RADIUS_KM: 'the tester diffs the haversine constant against the live page',
  GEO_LIMIT_KM: 'apps/web renders "more than 35 km"; one constant, not two',
  STALE_RESOLUTION_LIMIT: 'apps/web ValidationPanel explains the stale_resolutions threshold',
  rawSpanKm: 'apps/web DayMap shows the unclamped span in the toggle label',
  legBetween: 'the tester diffs a single leg against the live page',
  dayCost: 'the tester diffs a single day cost against the live page',
  conflictsFor: 'packages/client selectors filter conflicts by subject',
  mergeTrips: 'the client\'s explicit merge action, §2.2 — KD-9',
  mergeLostData: 'the client decides whether to warn after a merge — KD-9',
  describeMerge: 'the client\'s merge banner text — KD-9',
  can: 'the Phase 2 conformance matrix needs one entry point, §6.2',
  canComment: 'the fourth predicate; §2.10 lists only four of the five',
  effectiveRole: 'the Phase 2 RLS policy generator reads the role, not just the boolean',
  addDays: 'the client computes a date range for the new-trip form',
  dayNumber: 'the client sorts and compares dates without a date library',
  fromDayNumber: 'the inverse; both are the zero-dependency date arithmetic',
  parseIsoDate: 'the client splits a date for display',
  dateSpan: 'tripSummary and the client compute a length',
  // --- internals that should probably become private ---------------------------
  canonical: 'INTERNAL — conflict id hashing. Should not be public; see KD-19',
  digest: 'INTERNAL — conflict id hashing. Should not be public; see KD-19',
  makeConflict: 'INTERNAL — rule authoring. Should not be public; see KD-19',
  conflictId: 'INTERNAL — rule authoring. Should not be public; see KD-19',
  blankDay: 'INTERNAL — ensureDays. Should not be public; see KD-19',
  toDoc: 'INTERNAL — toJSON. Should not be public; see KD-19',
};

const runtimeExports = () => Object.keys(core).filter((k) => typeof (core as Record<string, unknown>)[k] !== 'undefined');

test('every symbol §2.10 names is actually exported', () => {
  const actual = new Set(runtimeExports());
  const missing = SECTION_2_10.filter((n) => !actual.has(n));
  assert.deepEqual(missing, [], '§2.10 names a symbol the index does not export');
});

test('every exported symbol is either in §2.10 or enumerated with a reason', () => {
  const allowed = new Set<string>([...SECTION_2_10, ...Object.keys(BEYOND_2_10)]);
  const undeclared = runtimeExports().filter((n) => !allowed.has(n)).sort();
  assert.deepEqual(
    undeclared,
    [],
    'a symbol was added to core\'s index without being added to §2.10 or to BEYOND_2_10 with the caller that needs it',
  );
});

test('BEYOND_2_10 has no dead entries', () => {
  const actual = new Set(runtimeExports());
  const dead = Object.keys(BEYOND_2_10).filter((n) => !actual.has(n)).sort();
  assert.deepEqual(dead, [], 'a listed symbol is no longer exported — delete the line');
});

test('the size of the gap is reported, not hidden', () => {
  const actual = runtimeExports();
  const beyond = actual.filter((n) => !(SECTION_2_10 as readonly string[]).includes(n));
  // The number itself is not a pass/fail criterion — it is here so it cannot drift silently
  // and so that "how far past §2.10 are we" is one grep rather than an eyeball.
  assert.equal(
    beyond.length,
    Object.keys(BEYOND_2_10).length,
    `${beyond.length} symbols beyond §2.10; BEYOND_2_10 lists ${Object.keys(BEYOND_2_10).length}`,
  );
  assert.ok(beyond.length <= 65, `the gap grew to ${beyond.length}; narrow the index or widen §2.10 (KD-19)`);
});

/**
 * QA R5-5 — `accept`/`reject` are OFF the public surface.
 *
 * §2.14's invariant ("an acceptance with no accepter can never be traced to anyone") is
 * enforced by `requireActor` inside `acceptCandidate`, `rejectCandidate` and `copyStopInto`.
 * The primitives underneath them take `UserId | null` and check nothing, so exporting them
 * published a bypass around the gate — and BEYOND_2_10's justification for the export
 * ("used by the client for optimistic UI") was false: nothing in `packages/client`,
 * `apps/web`, `cli.ts` or the tests ever called them.
 *
 * They stay module-internal to `packages/core`, called only by the two build functions that
 * have already checked the actor. The alternative — routing them through `requireActor` —
 * would have made `model/` depend on `build/`, inverting the layering for a symbol with no
 * caller.
 */
test('R5-5: the unchecked accept/reject primitives are not exported', () => {
  const exported = new Set(runtimeExports());
  for (const name of ['accept', 'reject']) {
    assert.equal(
      exported.has(name),
      false,
      `core.${name} is public again — it takes UserId | null and does not call requireActor, ` +
        'which is §2.14\'s gate with a public bypass (QA R5-5)',
    );
  }
  // The checked wrappers are still there — this is a narrowing, not a removal of capability.
  assert.equal(typeof core.acceptCandidate, 'function');
  assert.equal(typeof core.rejectCandidate, 'function');
});

test('the six named internals are the only INTERNAL entries', () => {
  const internals = Object.entries(BEYOND_2_10).filter(([, why]) => why.startsWith('INTERNAL')).map(([n]) => n).sort();
  assert.deepEqual(internals, ['blankDay', 'canonical', 'conflictId', 'digest', 'makeConflict', 'toDoc']);
});
