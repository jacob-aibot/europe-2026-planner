/**
 * §2.1 **A-78** — *the census reads the tree, not a list of files.* ROADMAP **I-17**, from QA
 * **R56-1/R56-2** (MAJOR) with **R56-3/5/7/10** riding along. It sits on top of §2.1 **A-77** —
 * *a door does not say what it wrote; the document says what changed* — whose mechanism round 56
 * attacked hardest and could not break, and which is upheld entire.
 *
 * **What A-78 replaced.** A-77 deleted the enumeration of *what a door writes* and left an
 * enumeration of *where doors live*: `CENSUSED_BUILD_FILES` (twelve names, checked against a
 * `readdirSync` of `build/`) plus `EXTRA_DOOR_FILES` (one name, checked only for existence).
 * `export function archiveTrip(trip: Trip, r: ConflictResolution): Trip` appended to
 * `derive/lifecycle.ts` — an existing file, ordinary syntax, no new directory — left
 * `npm run typecheck` at exit 0 and this file at 62 pass / 0 fail while writing a document
 * `fromJSON` refuses at `$.resolutions[0].state` (**R56-1**). And the classifier matched an
 * *exact* `Trip` return type, so `Trip | null` and `Promise<Trip>` were not doors (**R56-2**).
 *
 * **Both lists are deleted.** There is now **one** `CENSUS` array — every `.ts` file under
 * `packages/core/src`, with **no exclusions** — read by four halves that fail at different times:
 *
 *   1. **The type-level door census** maps `DoorsOf` over `CENSUS` and its expected set is
 *      `DOORS ∪ CENSUS_MECHANISM ∪ NON_DOORS[].name`. It fails `npm run typecheck`, not a test.
 *   2. **The module census** is a **recursive** `readdirSync` walk of `packages/core/src`, and it
 *      sees the one thing a type-level assertion cannot: a **new file**, in any directory,
 *      including one nobody has created yet.
 *   3. **Name uniqueness is checked at runtime**, by function *identity* over the same namespace
 *      objects — the shadowing hole a name-keyed census cannot see. Not by qualifying names.
 *   4. **The behavioural census** is unchanged: one hostile value per door, driven by `DOORS`.
 *
 * Plus **Invariant R**'s door half (A-78 Part 7): a frozen-input test, driven by `DOORS`, that
 * proves no door mutates a record in place. There is **no `Object.freeze` in `src`** — the ruling
 * refuses that, with its reasons and its trigger.
 *
 * ---
 *
 * §2.1 **A-77** — *a door does not say what it wrote; the document says what changed.*
 * ROADMAP **I-16**, from QA **R55-1/2/3/4/5/7**.
 *
 * **What replaced what.** A-76 put one mechanism (`assertStorable`) behind eight per-field guards
 * and then **enumerated where to call it** — 24 checked rows and 26 free-text exemption reasons, in
 * this file. Round 55 measured **thirteen** door × field cases that table still left writing a
 * document which can never be re-opened, and proved **two** of its exemption reasons false against
 * the code; the architect found **three more** at `conflict/resolve.ts`'s `resolveConflict`, a door
 * in a directory the census could not see, writing an eighth record class. **Sixteen.** A-77
 * deletes the enumeration rather than correcting it a third time: a door hands `commit` the
 * document it was given and the document it produced, and `commit` parses every record that is
 * not, by object identity, one the door was handed.
 *
 * `EXEMPT_TABLE` and `EXEMPT_UNTABLED` are **gone** — 26 reasons in prose, two of them false,
 * replaced by a return type. This file is A-77 **Part 6**'s censuses, in the four halves the
 * ruling states, each failing at a different time:
 *
 *   1. **The door census is a type-level assertion and it fails `npm run typecheck`, not a test.**
 *      A door is *an exported function whose return type is `Trip`* — a fact the compiler already
 *      has for every export of a module, in **every declaration syntax there is**. A-76's census
 *      collected `/^export\s+function\s+(\w+)/gm` and round 55 kept it green while injecting a
 *      door three other ways (R55-4). The regex is **not widened**; it is deleted.
 *   2. **The module census is a runtime directory read**, and it closes the one thing a type-level
 *      assertion cannot see: a **new file** in `build/`.
 *   3. **Three `Trip`-returning exports are not doors** and are named rather than reasoned about.
 *   4. **The behavioural census** fires one hostile value per door, driven by `DOORS`. It is what
 *      reddens if a door is listed and its `commit` call is deleted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { parseTripEnvelope, parseResolution, TripParseError, fromJSON } from '../src/serialize/fromJSON.ts';
import { toJSON } from '../src/serialize/toJSON.ts';
import { assertStorable } from '../src/build/storable.ts';
import { SCHEMA_VERSION } from '../src/model/types.ts';
import type {
  Booking, Day, Participant, PhotoAsset, Place, Stop, Trip,
} from '../src/model/types.ts';
import { sequentialIds } from '../src/model/ids.ts';

// §2.1 **A-78** Part 1 — ONE namespace import per `.ts` file under `packages/core/src`, with **no
// exclusions**: `index.ts`, the two type-only `types.ts` modules and the 375 kB generated
// `geo/countries.gen.ts` are all here, because an exclusion is where the last three rounds of this
// class lived. The `CENSUS` array below pairs each with its path, and both halves read that one
// array.
import * as AccessPredicates from '../src/access/predicates.ts';
import * as Bookings from '../src/build/bookings.ts';
import * as Candidates from '../src/build/candidates.ts';
import * as CommitMod from '../src/build/commit.ts';
import * as CopyStopMod from '../src/build/copyStop.ts';
import * as CreateTripMod from '../src/build/createTrip.ts';
import * as DaysMod from '../src/build/days.ts';
import * as ParticipantsMod from '../src/build/participants.ts';
import * as PhotosMod from '../src/build/photos.ts';
import * as PoolMod from '../src/build/pool.ts';
import * as RedactMod from '../src/build/redactText.ts';
import * as StopsMod from '../src/build/stops.ts';
import * as StorableMod from '../src/build/storable.ts';
import * as ConflictDetect from '../src/conflict/detect.ts';
import * as ConflictId from '../src/conflict/id.ts';
import * as ResolveMod from '../src/conflict/resolve.ts';
import * as RuleBookingVsPlan from '../src/conflict/rules/bookingVsPlan.ts';
import * as RuleDuplicateBooking from '../src/conflict/rules/duplicateBooking.ts';
import * as RuleGeoOutlier from '../src/conflict/rules/geoOutlier.ts';
import * as RuleImpossibleTransfer from '../src/conflict/rules/impossibleTransfer.ts';
import * as RuleLegacyFlag from '../src/conflict/rules/legacyFlag.ts';
import * as RuleMissingLodging from '../src/conflict/rules/missingLodging.ts';
import * as RuleOverlap from '../src/conflict/rules/overlap.ts';
import * as RuleSupersededBooking from '../src/conflict/rules/supersededBooking.ts';
import * as RuleTypes from '../src/conflict/rules/types.ts';
import * as RuleUnbookedTicketed from '../src/conflict/rules/unbookedTicketed.ts';
import * as RuleUnverifiedReference from '../src/conflict/rules/unverifiedReference.ts';
import * as DeriveCluster from '../src/derive/cluster.ts';
import * as DeriveCost from '../src/derive/cost.ts';
import * as DeriveCountry from '../src/derive/country.ts';
import * as DeriveDisplay from '../src/derive/display.ts';
import * as DeriveGeo from '../src/derive/geo.ts';
import * as DeriveGeoCheck from '../src/derive/geoCheck.ts';
import * as DeriveLegs from '../src/derive/legs.ts';
import * as DeriveLifecycle from '../src/derive/lifecycle.ts';
import * as DeriveSummary from '../src/derive/summary.ts';
import * as DeriveTravelStats from '../src/derive/travelStats.ts';
import * as GeoCountriesGen from '../src/geo/countries.gen.ts';
import * as GeoCountryIndex from '../src/geo/countryIndex.ts';
import * as ImportLegacyDays from '../src/import/legacyDays.ts';
import * as IndexBarrel from '../src/index.ts';
import * as MergeTripsMod from '../src/merge/mergeTrips.ts';
import * as ModelCityName from '../src/model/cityName.ts';
import * as ModelIds from '../src/model/ids.ts';
import * as ModelMoney from '../src/model/money.ts';
import * as ModelOpeningHours from '../src/model/openingHours.ts';
import * as ModelProvenance from '../src/model/provenance.ts';
import * as ModelTypes from '../src/model/types.ts';
import * as PhotoExif from '../src/photo/exif.ts';
import * as SerializeFromJSON from '../src/serialize/fromJSON.ts';
import * as SerializeMigrate from '../src/serialize/migrate.ts';
import * as SerializeParseError from '../src/serialize/parseError.ts';
import * as SerializeToJSON from '../src/serialize/toJSON.ts';
import * as ValidateTrip from '../src/validate/validateTrip.ts';

import type { BuildCtx } from '../src/build/createTrip.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..', 'src');

const ctx = (seed = 's'): BuildCtx => ({ ids: sequentialIds(seed), now: '2026-03-01', actorUserId: 'local:self' });

const GOOD_PLACE: Place = { id: 'pl-1', cityKey: 'wien', name: 'Belvedere', at: null, category: 'sight' };
const GOOD_DERIVATIVE = { w: 100, h: 80, bytes: 4096 };
const GOOD_PROVENANCE = {
  source: 'user' as const, state: 'accepted' as const, confidence: 'confirmed' as const,
  addedAt: '2026-03-01', acceptedAt: '2026-03-01', actorUserId: 'local:self',
};
const GOOD_BOOKING: Booking = {
  id: 'bk-1', tripId: 'trip-base', kind: 'train', operator: 'ÖBB', reference: 'ABC123',
  startsAt: { date: '2026-03-01', time: '08:00' }, price: null, party: 2, status: 'active',
  ticket: null, provenance: GOOD_PROVENANCE,
};

const ENVELOPE = {
  id: 'trip-1',
  title: 'Europe',
  ownerId: 'local:self',
  startDate: '2026-08-07',
  endDate: '2026-08-22',
  datePrecision: 'exact',
  homeCurrency: 'EUR',
  homeBase: null,
  party: { adults: 2, children: 0 },
  revision: 3,
  schemaVersion: SCHEMA_VERSION,
};

function baseTrip(seed = 's'): { trip: Trip; c: BuildCtx } {
  const c = ctx(seed);
  const trip = CreateTripMod.createTrip(
    {
      id: 'trip-base', title: 'Storable', startDate: '2026-03-01', endDate: '2026-03-03',
      cities: [{ key: 'wien', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
    },
    c,
  );
  return { trip, c };
}

function tripWithStop(seed = 's'): { trip: Trip; c: BuildCtx; stopId: string } {
  const { trip, c } = baseTrip(seed);
  const next = StopsMod.addStop(
    trip,
    { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
    { id: 'stop-1', name: 'Belvedere', category: 'sight' },
    c,
  );
  return { trip: next, c, stopId: 'stop-1' };
}

/** Rewrites one field of a record already in the document, behind a cast — §2.1's reachable producer. */
function poisonStop(t: Trip, stopId: string, field: string, value: unknown): Trip {
  return {
    ...t,
    days: t.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => (s.id === stopId ? ({ ...s, [field]: value } as unknown as Stop) : s)),
    })),
  };
}

/** A source document that is another person's — `copyStopInto`'s whole subject (§2.14). */
function foreignTrip(mutate: (t: Trip) => Trip): { trip: Trip; stopId: string } {
  const c = ctx('friend');
  let trip = CreateTripMod.createTrip(
    {
      id: 'trip-friend', title: 'Marta', startDate: '2026-03-01', endDate: '2026-03-03',
      ownerId: 'user:marta',
      cities: [{ key: 'wien-m', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
    },
    c,
  );
  trip = StopsMod.addPlace(trip, { id: 'pl-m', cityKey: 'wien-m', name: 'Belvedere', at: { lat: 48.19, lng: 16.38 }, category: 'sight' });
  trip = StopsMod.addStop(
    trip,
    { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
    { id: 'stop-m', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'pl-m' } },
    c,
  );
  return { trip: mutate(trip), stopId: 'stop-m' };
}

/** A trip carrying one live resolution, for the four `conflict/resolve.ts` doors. */
function tripWithResolution(): Trip {
  const { trip } = baseTrip();
  return ResolveMod.resolveConflict(trip, {
    conflictId: 'c-1', state: 'dismissed', by: 'local:self', at: '2026-03-01',
  });
}

// ---------------------------------------------------------------------------------------------
// A-77 Part 4 — `parseTripEnvelope`, `fromJSON`'s trip-level scalars extracted as a unit, and
// A-77 Part 3 rule 8 — `parseResolution`, the eighth exported per-record parser.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 4: parseTripEnvelope returns the trip scalars and nothing else', () => {
  const env = parseTripEnvelope({ ...ENVELOPE, cities: 'not an array', days: 42 }, '$');
  assert.deepEqual(env, {
    id: 'trip-1', title: 'Europe', ownerId: 'local:self',
    startDate: '2026-08-07', endDate: '2026-08-22', datePrecision: 'exact',
    homeCurrency: 'EUR', homeBase: null, party: { adults: 2, children: 0 },
    revision: 3, schemaVersion: SCHEMA_VERSION,
  });
});

test('A-77 Part 4: fromJSON\'s three tolerances move verbatim', () => {
  const { ownerId: _o, ...noOwner } = ENVELOPE;
  assert.equal(parseTripEnvelope(noOwner, '$').ownerId, '');
  const { datePrecision: _d, ...noPrecision } = ENVELOPE;
  assert.equal(parseTripEnvelope(noPrecision, '$').datePrecision, 'exact');
  const { homeBase: _h, ...noHomeBase } = ENVELOPE;
  assert.equal(parseTripEnvelope(noHomeBase, '$').homeBase, null);
});

test('A-77 Part 4: `meta` is carried when present and absent when absent', () => {
  assert.equal('meta' in parseTripEnvelope(ENVELOPE, '$'), false);
  assert.deepEqual(parseTripEnvelope({ ...ENVELOPE, meta: { k: 1 } }, '$').meta, { k: 1 });
});

test('A-77 Part 4: R55-3\'s scalars are refused with their own path', () => {
  const cases: ReadonlyArray<[string, unknown, string]> = [
    ['title', 42, '$.title'],
    ['homeCurrency', 42, '$.homeCurrency'],
    ['ownerId', 42, '$.ownerId'],
    ['party', { adults: 'two', children: 0 }, '$.party.adults'],
    ['meta', 'not an object', '$.meta'],
    ['homeBase', { name: 'Home', at: { lat: 'north', lng: 0 } }, '$.homeBase.at.lat'],
    ['datePrecision', 'fortnight', '$.datePrecision'],
    ['startDate', '2026-13-45', '$.startDate'],
  ];
  for (const [field, value, path] of cases) {
    let thrown: unknown = null;
    try {
      parseTripEnvelope({ ...ENVELOPE, [field]: value }, '$');
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown instanceof TripParseError, `${field} was accepted`);
    assert.equal((thrown as TripParseError).path, path, `${field} threw at the wrong path`);
  }
});

test('A-77 Part 4: the one check fromJSON does not have — schemaVersion must be current', () => {
  assert.throws(
    () => parseTripEnvelope({ ...ENVELOPE, schemaVersion: SCHEMA_VERSION - 1 }, '$'),
    (err: unknown) => err instanceof TripParseError && err.path === '$.schemaVersion',
  );
});

test('A-77 Part 3.8: parseResolution is exported and refuses the three fields R55 measured', () => {
  const good = { conflictId: 'c1', state: 'dismissed', by: 'local:self', at: '2026-08-07' };
  assert.deepEqual(parseResolution(good, '$'), { ...good, retiredAt: null });
  for (const [field, value, path] of [
    ['state', 'bogus', '$.state'],
    ['by', 42, '$.by'],
    ['note', {}, '$.note'],
  ] as ReadonlyArray<[string, unknown, string]>) {
    assert.throws(
      () => parseResolution({ ...good, [field]: value }, '$'),
      (err: unknown) => err instanceof TripParseError && err.path === path,
      `${field} was accepted`,
    );
  }
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 3 rules 5 and 7 — `assertStorable` RETURNS the parsed record, and carries a locator.
// `commit` is its only caller; this is the unit that caller depends on.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 3.5: assertStorable returns the parser\'s value, not the caller\'s object', () => {
  const caller = { ...GOOD_PLACE, smuggled: 'not a declared key' } as unknown as Place;
  const stored = assertStorable('doorName', 'place', caller, 'places[0]');
  assert.notEqual(stored, caller, 'assertStorable handed the caller\'s own object back');
  assert.equal('smuggled' in stored, false, 'an undeclared key survived the parser (A-77 residue 4)');
  assert.deepEqual(stored, GOOD_PLACE);
});

test('A-77 Part 3.5: a getter that flips on the second read is read once, and the read value is stored', () => {
  let reads = 0;
  const flipper = {
    ...GOOD_PLACE,
    get name(): string {
      reads += 1;
      return reads === 1 ? 'Belvedere' : (42 as unknown as string);
    },
  } as unknown as Place;
  const stored = assertStorable('doorName', 'place', flipper, 'places[0]');
  assert.equal(stored.name, 'Belvedere');
  assert.equal(typeof stored.name, 'string');
});

test('A-77 Part 3.7: the message keeps A-76\'s sentence and appends the locator', () => {
  let thrown: unknown = null;
  try {
    assertStorable('doorName', 'place', { ...GOOD_PLACE, category: 'transport' as unknown as Place['category'] }, 'places[3]');
  } catch (err) {
    thrown = err;
  }
  assert.ok(thrown instanceof Error);
  assert.ok(!(thrown instanceof TripParseError), 'A-76 Part 3\'s one hard prohibition');
  const msg = (thrown as Error).message;
  assert.match(msg, /^doorName: this place cannot be stored — /);
  assert.ok(msg.includes('$.category'), msg);
  assert.ok(msg.includes('cannot be re-opened'), msg);
  assert.ok(msg.endsWith('(places[3])'), msg);
});

test('A-77 Part 3.8: StorableMap has a `resolution` arm', () => {
  const good = { conflictId: 'c1', state: 'dismissed' as const, by: 'local:self', at: '2026-08-07', retiredAt: null };
  assert.deepEqual(assertStorable('doorName', 'resolution', good, 'resolutions[0]'), good);
  assert.throws(
    () => assertStorable('doorName', 'resolution', { ...good, state: 'bogus' as never }, 'resolutions[0]'),
    /doorName: this resolution cannot be stored — .*\$\.state.*\(resolutions\[0\]\)/s,
  );
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 1 — the CENSUS. One array, every `.ts` file under `packages/core/src`, no exclusions.
// ---------------------------------------------------------------------------------------------

/**
 * EVERY module under `packages/core/src`, by path relative to it, paired with its namespace.
 * **ONE list, read by all three census halves**: the type census maps over it, the module census
 * compares its paths against a *recursive* read of the directory, and the name-uniqueness check
 * walks its namespace objects. **THERE ARE NO EXCLUDED FILES** — an exclusion is where the last
 * three rounds of this class lived, and A-78 Part 1 says so in as many words.
 *
 * `index.ts` is censused like everything else. It re-exports the doors, so the same names arrive
 * twice — harmless, because both halves work on *names* and the barrel's names are the same
 * names; the identity check below is what makes that safe rather than merely convenient.
 */
const CENSUS = [
  ['access/predicates.ts', AccessPredicates],
  ['build/bookings.ts', Bookings],
  ['build/candidates.ts', Candidates],
  ['build/commit.ts', CommitMod],
  ['build/copyStop.ts', CopyStopMod],
  ['build/createTrip.ts', CreateTripMod],
  ['build/days.ts', DaysMod],
  ['build/participants.ts', ParticipantsMod],
  ['build/photos.ts', PhotosMod],
  ['build/pool.ts', PoolMod],
  ['build/redactText.ts', RedactMod],
  ['build/stops.ts', StopsMod],
  ['build/storable.ts', StorableMod],
  ['conflict/detect.ts', ConflictDetect],
  ['conflict/id.ts', ConflictId],
  ['conflict/resolve.ts', ResolveMod],
  ['conflict/rules/bookingVsPlan.ts', RuleBookingVsPlan],
  ['conflict/rules/duplicateBooking.ts', RuleDuplicateBooking],
  ['conflict/rules/geoOutlier.ts', RuleGeoOutlier],
  ['conflict/rules/impossibleTransfer.ts', RuleImpossibleTransfer],
  ['conflict/rules/legacyFlag.ts', RuleLegacyFlag],
  ['conflict/rules/missingLodging.ts', RuleMissingLodging],
  ['conflict/rules/overlap.ts', RuleOverlap],
  ['conflict/rules/supersededBooking.ts', RuleSupersededBooking],
  ['conflict/rules/types.ts', RuleTypes],
  ['conflict/rules/unbookedTicketed.ts', RuleUnbookedTicketed],
  ['conflict/rules/unverifiedReference.ts', RuleUnverifiedReference],
  ['derive/cluster.ts', DeriveCluster],
  ['derive/cost.ts', DeriveCost],
  ['derive/country.ts', DeriveCountry],
  ['derive/display.ts', DeriveDisplay],
  ['derive/geo.ts', DeriveGeo],
  ['derive/geoCheck.ts', DeriveGeoCheck],
  ['derive/legs.ts', DeriveLegs],
  ['derive/lifecycle.ts', DeriveLifecycle],
  ['derive/summary.ts', DeriveSummary],
  ['derive/travelStats.ts', DeriveTravelStats],
  ['geo/countries.gen.ts', GeoCountriesGen],
  ['geo/countryIndex.ts', GeoCountryIndex],
  ['import/legacyDays.ts', ImportLegacyDays],
  ['index.ts', IndexBarrel],
  ['merge/mergeTrips.ts', MergeTripsMod],
  ['model/cityName.ts', ModelCityName],
  ['model/ids.ts', ModelIds],
  ['model/money.ts', ModelMoney],
  ['model/openingHours.ts', ModelOpeningHours],
  ['model/provenance.ts', ModelProvenance],
  ['model/types.ts', ModelTypes],
  ['photo/exif.ts', PhotoExif],
  ['serialize/fromJSON.ts', SerializeFromJSON],
  ['serialize/migrate.ts', SerializeMigrate],
  ['serialize/parseError.ts', SerializeParseError],
  ['serialize/toJSON.ts', SerializeToJSON],
  ['validate/validateTrip.ts', ValidateTrip],
] as const;

// ---------------------------------------------------------------------------------------------
// A-78 Part 1 half 1 / Part 2 — the DOOR CENSUS, at the type level, MAPPED over `CENSUS`.
// It fails `npm run typecheck`, not a test.
// ---------------------------------------------------------------------------------------------

/**
 * Every exported function in a censused module whose return type is `Trip`. This is the whole
 * classifier: **there is no reason column**, because a return type is not a judgement about
 * whether a function *"reads a caller value into a record field"* — the judgement that was wrong
 * twice (R55-2).
 */
const DOORS = [
  // build/bookings.ts
  'upsertBooking', 'supersedeBooking', 'linkBooking',
  // build/candidates.ts
  'acceptCandidate', 'rejectCandidate',
  // build/copyStop.ts
  'copyStopInto',
  // build/createTrip.ts
  'createTrip', 'setTripMeta',
  // build/days.ts
  'ensureDays', 'setDayMeta',
  // build/participants.ts
  'addParticipant', 'updateParticipant', 'removeParticipant',
  // build/photos.ts
  'addPhoto', 'updatePhoto', 'removePhoto', 'reattachDanglingPhotos',
  // build/pool.ts
  'returnToPool', 'scheduleFromPool',
  // build/stops.ts
  'addStop', 'updateStop', 'removeStop', 'moveStop', 'reorderStop', 'addPlace',
  // conflict/resolve.ts
  'resolveConflict', 'syncResolutions', 'reassertRetirements', 'unresolveConflict',
] as const;

/**
 * The one `Trip`-returning export inside the censused set that is not a door: **the mechanism
 * itself**. `commit` cannot commit through itself, and it is module-internal exactly as
 * `assertStorable` and `reindex` are.
 */
const CENSUS_MECHANISM = ['commit'] as const;

/**
 * **A-78 Part 1 half 1 / Part 6.3 — the three `Trip`-returning exports that are NOT doors.**
 *
 * A-77 asserted these three separately, because their modules were outside the census. They are
 * now *inside* it, so they stop being an assertion and become **part of the equation**: they
 * appear on the expected side of `DOOR_CENSUS` or `npm run typecheck` fails.
 *
 * The rule for what may go here is unchanged and narrow: **a whole-document producer — a function
 * that constructs a document rather than editing one, so there is no `before` to diff against.**
 * A-78 Part 10 names this list as **the one remaining place a human judgement can hide a door**,
 * and its residue's trigger is *the fourth name*: a fourth producer is an architect's ruling, and
 * the question it must answer is whether producers should get the whole-document check A-77 Part
 * 10 residue 3 defers — not whether this particular function may be excused.
 */
const NON_DOORS = [
  { name: 'fromJSON', why: 'it IS the parse' },
  { name: 'importLegacyDays', why: 'a producer — it builds a document rather than editing one, so there is no `before` to diff against (A-77 Part 10 residue 3)' },
  { name: 'mergeTrips', why: 'a producer, for importLegacyDays\' reason' },
] as const satisfies ReadonlyArray<{ name: string; why: string }>;

type IsExact<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

/**
 * **A-78 Part 2 — the classifier, three legal return shapes.**
 *
 * The return type a door may have, normalised: one `Promise` unwrapped, `null`/`undefined`
 * removed. `Exclude<Awaited<R>, null | undefined>` and **not**
 * `Awaited<Exclude<R, null | undefined>>` — **the order is load-bearing**, and the wrong one
 * silently drops `Promise<Trip | null>`.
 */
type TripishReturn<F> = F extends (...a: never[]) => infer R ? Exclude<Awaited<R>, null | undefined> : never;

/** A DOOR: its return type is `Trip`, `Trip | null`, `Promise<Trip>` or `Promise<Trip | null>`. */
type IsDoor<F> = IsExact<TripishReturn<F>, Trip>;

/** A REFUSED SHAPE: the return type carries `Trip` as a union member but is not a door. */
type HasTripMember<R> = true extends (R extends unknown ? IsExact<R, Trip> : never) ? true : false;
type IsIllegal<F> = IsDoor<F> extends true ? false : HasTripMember<TripishReturn<F>>;

type DoorsOf<M> = { [K in keyof M]-?: IsDoor<M[K]> extends true ? K : never }[keyof M];
type IllegalOf<M> = { [K in keyof M]-?: IsIllegal<M[K]> extends true ? K : never }[keyof M];

/** A **union** over `CENSUS`, not an intersection of namespaces: an intersection makes a name
 * exported by two modules into an intersection of two function types, which is a classification
 * hazard for no benefit. */
type NamesIn<E> = E extends readonly [string, infer M] ? DoorsOf<M> & string : never;
type IllegalIn<E> = E extends readonly [string, infer M] ? IllegalOf<M> & string : never;

type AllDoors = NamesIn<(typeof CENSUS)[number]>;
type AllIllegal = IllegalIn<(typeof CENSUS)[number]>;

/**
 * **This line is the census.** A new `Trip`-returning export **anywhere under
 * `packages/core/src`** — written `export function`, `export const … = () =>`,
 * `function d(){}; export { d }` or `export default function`, returning `Trip`, `Trip | null`,
 * `Promise<Trip>` or `Promise<Trip | null>` — makes `IsExact` `false` and `npm run typecheck`
 * fails on the commit that adds it. `archiveTrip` in `derive/lifecycle.ts` (R56-1's exact repro)
 * is caught here, because that module is in `CENSUS` and its namespace is mapped.
 */
const DOOR_CENSUS: IsExact<
  AllDoors,
  (typeof DOORS)[number] | (typeof CENSUS_MECHANISM)[number] | ExcusedProducers
> = true;

/**
 * **A-78 Part 1 half 1, corrected against the code — BUILD-NOTES KD-106.**
 *
 * The ruling writes the expected set as `DOORS ∪ CENSUS_MECHANISM ∪ NON_DOORS[].name` on the
 * stated ground that *"`fromJSON`, `importLegacyDays` and `mergeTrips` return `Trip` and their
 * modules are now censused, so they must appear on the right-hand side or the census fails"*.
 * **That is true of `fromJSON` and false of the other two, measured:**
 * `mergeTrips(base, local, remote): MergeResult` where `MergeResult = {trip, report}`
 * (`merge/mergeTrips.ts:42,207`) and `importLegacyDays(legacy, opts): ImportResult` where
 * `ImportResult = {trip, issues, cityRangeCheck, unmatchedNames}` (`import/legacyDays.ts:74,147`).
 * Both are **wrapper returns**, so `IsDoor` classifies neither as a door and neither needs
 * excusing; written literally, the ruling's equation makes `AllDoors` a strict subset of the
 * expected set and `npm run typecheck` fails on a healthy tree.
 *
 * The excuse is therefore taken **as far as it is owed and no further**: a `NON_DOORS` name is
 * subtracted from the census only where the classifier actually put it there. Nothing is weakened
 * — the intersection is computed by the compiler, not judged — and the two properties the ruling
 * wanted from this line are both kept: a producer that *is* `Trip`-returning (`fromJSON`) is on
 * the expected side or the census fails, and a name in `NON_DOORS` that is exported by no censused
 * module is caught by half 3's identity check below.
 *
 * These two are also the only wrapper returns in `packages/core/src`, and A-78 Part 2's
 * prohibition does not reach them: it binds *"a function … that produces an **edited** `Trip`"*,
 * and a producer constructs a document rather than editing one (A-77 Part 6.3, Part 10 residue 3).
 */
type ExcusedProducers = (typeof NON_DOORS)[number]['name'] & AllDoors;

/**
 * **A-78 Part 2's second census line.** A function returning `Trip | Day` is neither a door nor a
 * non-door; it is a **return shape core does not permit**, and it fails the build saying so rather
 * than being classified.
 *
 * The one shape this cannot detect is a `Trip` reached through a **wrapper** — `{trip, issues}`, a
 * tuple, a class instance — which would need an arbitrary-depth search that flags half the library.
 * A-78 Part 2 forbids it **by rule** instead, and the rule is quoted here so it is read where the
 * mechanism is:
 *
 * > **A function in `packages/core/src` that produces an edited `Trip` returns it directly.** The
 * > legal return types are `Trip`, `Trip | null`, and a `Promise` of either. A door may not return
 * > a `Trip` inside a record, a tuple, a generator or any other container. A function that
 * > genuinely needs to return a trip *and* something else is **two functions**: a door, and a
 * > reader over the document it returned.
 *
 * **Trigger:** the first increment that wants a wrapper return — most plausibly a Phase 3 ingest
 * worker returning a trip plus a report. It is an **architect's** ruling and not a builder's
 * convenience: the answer is either *split it* (expected) or a census extension ruled in writing.
 */
const ILLEGAL_SHAPE_CENSUS: IsExact<AllIllegal, never> = true;

test('A-78 Part 1: the type-level door census holds (it is `npm run typecheck` that enforces it)', () => {
  assert.equal(DOOR_CENSUS, true);
  assert.equal(ILLEGAL_SHAPE_CENSUS, true);
  assert.equal(new Set(DOORS).size, DOORS.length, 'a door is named twice');
});

test('A-78 Part 1: the three named non-doors are producers, not doors', () => {
  for (const n of NON_DOORS) {
    assert.ok(!(DOORS as readonly string[]).includes(n.name), `${n.name} is listed as a door: ${n.why}`);
    assert.ok(n.why.length > 10);
  }
  assert.equal(
    NON_DOORS.length, 3,
    'A-78 Part 10\'s residue: NON_DOORS is the one remaining place a human judgement can hide a ' +
    'door, and its trigger is THE FOURTH NAME. A fourth producer is an architect\'s ruling — the ' +
    'question it must answer is whether producers get the whole-document check A-77 Part 10 ' +
    'residue 3 defers, not whether this particular function may be excused.',
  );
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 1 half 2 — the MODULE census, a RECURSIVE directory read of `packages/core/src`.
// It sees the one thing a type-level assertion cannot: a new FILE, in any directory, including
// one nobody has created yet. `CENSUSED_BUILD_FILES` and `EXTRA_DOOR_FILES` are DELETED.
// ---------------------------------------------------------------------------------------------

function walk(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(resolve(dir, e.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

test('A-78 Part 1: every `.ts` file under packages/core/src is censused, and every censused path is on disk', () => {
  const onDisk = walk(SRC).filter((f) => f.endsWith('.ts')).sort();
  const censused = CENSUS.map(([p]) => p).slice().sort();
  assert.deepEqual(
    onDisk,
    censused,
    'a file is under `packages/core/src` and is not censused: add a namespace import and a ' +
    '`CENSUS` row. If `npm run typecheck` then fails, that file exports a function returning a ' +
    '`Trip` and you must classify it — a door (add it to `DOORS` and give it a behavioural row), ' +
    'the mechanism, or a whole-document producer with a reason. DO NOT ADD AN EXCLUSION LIST.',
  );
});

test('A-78 Part 1: there is nothing else under packages/core/src — no `.d.ts`, no non-`.ts` file', () => {
  // A `.d.ts` cannot be namespace-imported the way `CENSUS` requires and could declare a door over
  // a JS implementation; core is zero-dependency and has neither today.
  const strays = walk(SRC).filter((f) => !f.endsWith('.ts') || f.endsWith('.d.ts'));
  assert.deepEqual(
    strays, [],
    'a file under `packages/core/src` is not a namespace-importable `.ts` module. An architect ' +
    'rules on this file; do not exclude it.',
  );
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 1 half 3 — a door's name is UNIQUE across `packages/core/src`, checked at RUNTIME by
// function IDENTITY. Half 1 works on names, so a *second* door named `addStop` in another module
// would collapse into the union and stay invisible — the shadowing hole, and precisely the next
// face a breaker would try.
//
// It is closed **without qualifying every name**, which A-78 refuses because qualifying would
// double `DOORS` to carry `index.ts`'s re-exports. A re-export gives the SAME OBJECT, so
// `index.ts` costs nothing; a second definition gives two, and this reddens naming both modules.
// ---------------------------------------------------------------------------------------------

test('A-78 Part 1 half 3: every censused name resolves to exactly one function object', () => {
  const names = [
    ...DOORS,
    ...CENSUS_MECHANISM,
    ...NON_DOORS.map((n) => n.name),
  ] as readonly string[];
  const problems: string[] = [];
  for (const name of names) {
    const objects = new Map<unknown, string[]>();
    for (const [path, ns] of CENSUS) {
      const member = (ns as Record<string, unknown>)[name];
      if (typeof member !== 'function') continue;
      const seen = objects.get(member);
      if (seen) seen.push(path);
      else objects.set(member, [path]);
    }
    if (objects.size === 0) {
      problems.push(`${name}: named in DOORS/CENSUS_MECHANISM/NON_DOORS and exported by no censused module`);
    } else if (objects.size !== 1) {
      const where = [...objects.values()].map((paths) => paths.join(' + ')).join(' AND ');
      problems.push(`${name}: ${objects.size} distinct function objects — ${where}`);
    }
  }
  assert.deepEqual(
    problems, [],
    'a name is defined twice under `packages/core/src`. If it ever fires on an innocent collision ' +
    'the answer is to RENAME THE INNOCENT FUNCTION, not to exempt it: a door\'s name is how a ' +
    'refusal reads on screen, and two of them in one library is a defect in its own right.',
  );
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 1 half 4 (was A-77 Part 6.4) — the BEHAVIOURAL census, UNCHANGED. One hostile value
// per door, driven by `DOORS`. This is what reddens if a door is listed and its `commit` call is
// deleted (A-77 fault N1), and it is what reddens if a door's name is moved into `NON_DOORS`
// (A-78 fault N6).
// ---------------------------------------------------------------------------------------------

type HostileRow = {
  /** The door. Must be one of `DOORS`, and every door must have a row. */
  door: string;
  /** The record class the refusal must name — `trip` for the envelope (A-77 Part 3 rule 1). */
  noun: string;
  /** The JSON path `fromJSON` throws at, rooted at the record. */
  path: string;
  /** The door the refusal names. Usually `door`; a delegating door names the door it delegates to. */
  where: string;
  hostile: () => unknown;
};

/** A trip whose own `title` cannot be stored — the envelope is parsed on every commit (rule 1). */
function poisonedEnvelope(t: Trip): Trip {
  return { ...t, title: 42 as unknown as string };
}

const HOSTILE: readonly HostileRow[] = [
  {
    door: 'addStop', noun: 'stop', path: '$.category', where: 'addStop',
    hostile: () => {
      const { trip, c } = baseTrip();
      return StopsMod.addStop(trip, { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
        { name: 'Bus', category: 'transport' as unknown as Stop['category'] }, c);
    },
  },
  {
    door: 'updateStop', noun: 'stop', path: '$.category', where: 'updateStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return StopsMod.updateStop(trip, stopId, { category: 'transport' as unknown as Stop['category'] });
    },
  },
  {
    door: 'moveStop', noun: 'stop', path: '$.placement.cityKey', where: 'moveStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return StopsMod.moveStop(trip, stopId, { kind: 'pool', cityKey: 42 } as unknown as Stop['placement']);
    },
  },
  {
    // Delegates to `moveStop`, which is where the refusal is raised — A-76's own note, upheld.
    door: 'reorderStop', noun: 'stop', path: '$.category', where: 'moveStop',
    hostile: () => {
      const { trip, c, stopId } = tripWithStop();
      const two = StopsMod.addStop(trip, { kind: 'scheduled', dayId: '2026-03-01', time: '12:00', order: 1 },
        { id: 'stop-2', name: 'Prater', category: 'sight' }, c);
      return StopsMod.reorderStop(poisonStop(two, stopId, 'category', 'transport'), stopId, 1);
    },
  },
  {
    // `removeStop` writes no caller value — A-76 exempted it. `commit` covers it anyway, because
    // the trip it produces is diffed whole and its envelope is parsed unconditionally.
    door: 'removeStop', noun: 'trip', path: '$.title', where: 'removeStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return StopsMod.removeStop(poisonedEnvelope(trip), stopId);
    },
  },
  {
    door: 'addPlace', noun: 'place', path: '$.category', where: 'addPlace',
    hostile: () => {
      const { trip } = baseTrip();
      return StopsMod.addPlace(trip, { ...GOOD_PLACE, category: 'transport' as unknown as Place['category'] });
    },
  },
  {
    door: 'setDayMeta', noun: 'day', path: '$.legacyFlag', where: 'setDayMeta',
    hostile: () => {
      const { trip } = baseTrip();
      return DaysMod.setDayMeta(trip, '2026-03-01', { legacyFlag: 'yes' as unknown as boolean });
    },
  },
  {
    // R55-2: A-76 exempted `ensureDays`/`blankDay` as *"reads no caller value into a record
    // field"*, and that reason was false — `blankDay(date, city, ctx.now)` writes the CALLER's
    // `ctx.now` into `provenance.addedAt`.
    door: 'ensureDays', noun: 'day', path: '$.provenance.addedAt', where: 'ensureDays',
    hostile: () => {
      const { trip } = baseTrip();
      return DaysMod.ensureDays({ ...trip, endDate: '2026-03-06' },
        { ids: sequentialIds('e'), now: 42 as unknown as string, actorUserId: 'local:self' });
    },
  },
  {
    // R55-3: `createTrip`'s literal wrote six trip-level scalars with no check of any kind.
    door: 'createTrip', noun: 'trip', path: '$.title', where: 'createTrip',
    hostile: () => CreateTripMod.createTrip(
      { title: 42 as unknown as string, startDate: '2026-03-01', endDate: '2026-03-03', cities: [] }, ctx()),
  },
  {
    door: 'setTripMeta', noun: 'trip', path: '$.homeCurrency', where: 'setTripMeta',
    hostile: () => {
      const { trip, c } = baseTrip();
      return CreateTripMod.setTripMeta(trip, { homeCurrency: 7 as unknown as string }, c);
    },
  },
  {
    door: 'upsertBooking', noun: 'booking', path: '$.kind', where: 'upsertBooking',
    hostile: () => {
      const { trip } = baseTrip();
      return Bookings.upsertBooking(trip, { ...GOOD_BOOKING, kind: 'spaceship' as unknown as Booking['kind'] });
    },
  },
  {
    // A-76 exempted it — *"writes a field of a booking already in the trip"*. It rewrites that
    // booking into a NEW object, so `commit` parses it.
    door: 'supersedeBooking', noun: 'booking', path: '$.operator', where: 'supersedeBooking',
    hostile: () => {
      const { trip } = baseTrip();
      const a = Bookings.upsertBooking(trip, GOOD_BOOKING);
      const b = Bookings.upsertBooking(a, { ...GOOD_BOOKING, id: 'bk-2' });
      const poisoned: Trip = {
        ...b,
        bookings: b.bookings.map((x) => (x.id === 'bk-1' ? ({ ...x, operator: 42 } as unknown as Booking) : x)),
      };
      return Bookings.supersedeBooking(poisoned, 'bk-1', 'bk-2');
    },
  },
  {
    door: 'linkBooking', noun: 'stop', path: '$.category', where: 'linkBooking',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      const withBooking = Bookings.upsertBooking(trip, GOOD_BOOKING);
      return Bookings.linkBooking(poisonStop(withBooking, stopId, 'category', 'transport'), stopId, 'bk-1');
    },
  },
  {
    // R55-2: A-76 exempted it as *"writes a `Provenance` core constructs from its own literals"*,
    // and that reason was false — `accept(p, at, actor)` writes the CALLER's `at`.
    door: 'acceptCandidate', noun: 'stop', path: '$.provenance.acceptedAt', where: 'acceptCandidate',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return Candidates.acceptCandidate(trip, { kind: 'stop', id: stopId }, 'local:self', 42 as unknown as string);
    },
  },
  {
    // `rejectCandidate` was safe **by accident** (`reject()` writes `acceptedAt: null` whatever it
    // is passed). It rewrites the record either way, so `commit` covers it on purpose now.
    door: 'rejectCandidate', noun: 'stop', path: '$.category', where: 'rejectCandidate',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return Candidates.rejectCandidate(poisonStop(trip, stopId, 'category', 'transport'),
        { kind: 'stop', id: stopId }, 'local:self', '2026-03-01');
    },
  },
  {
    door: 'addParticipant', noun: 'participant', path: '$.kind', where: 'addParticipant',
    hostile: () => {
      const { trip, c } = baseTrip();
      return ParticipantsMod.addParticipant(trip, { displayName: 'Marta', kind: 'goldfish' as never }, c);
    },
  },
  {
    door: 'updateParticipant', noun: 'participant', path: '$.displayName', where: 'updateParticipant',
    hostile: () => {
      const { trip, c } = baseTrip();
      const withP = ParticipantsMod.addParticipant(trip, { displayName: 'Marta' }, c);
      return ParticipantsMod.updateParticipant(withP, withP.participants[0].id,
        { displayName: 42 as unknown as string });
    },
  },
  {
    door: 'removeParticipant', noun: 'trip', path: '$.title', where: 'removeParticipant',
    hostile: () => {
      const { trip, c } = baseTrip();
      const withP = ParticipantsMod.addParticipant(trip, { displayName: 'Marta' }, c);
      return ParticipantsMod.removeParticipant(poisonedEnvelope(withP), withP.participants[0].id);
    },
  },
  {
    door: 'addPhoto', noun: 'photo', path: '$.caption', where: 'addPhoto',
    hostile: () => {
      const { trip, c } = baseTrip();
      return PhotosMod.addPhoto(trip, { caption: 42 as unknown as string, thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
    },
  },
  {
    door: 'updatePhoto', noun: 'photo', path: '$.caption', where: 'updatePhoto',
    hostile: () => {
      const { trip, c } = baseTrip();
      const withPhoto = PhotosMod.addPhoto(trip, { id: 'ph-1', thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
      return PhotosMod.updatePhoto(withPhoto, 'ph-1', { caption: 42 as unknown as string });
    },
  },
  {
    door: 'removePhoto', noun: 'trip', path: '$.title', where: 'removePhoto',
    hostile: () => {
      const { trip, c } = baseTrip();
      const withPhoto = PhotosMod.addPhoto(trip, { id: 'ph-1', thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
      return PhotosMod.removePhoto(poisonedEnvelope(withPhoto), 'ph-1');
    },
  },
  {
    // A-76 exempted it — *"rewrites `attach` to the literal `{kind:'trip'}`"*. It rewrites the
    // PhotoAsset into a new object, so `commit` parses the whole record.
    door: 'reattachDanglingPhotos', noun: 'photo', path: '$.caption', where: 'reattachDanglingPhotos',
    hostile: () => {
      const { trip, c, stopId } = tripWithStop();
      const withPhoto = PhotosMod.addPhoto(trip, { id: 'ph-1', attach: { kind: 'stop', stopId }, thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
      // The stop is gone and the caption is unstorable: the photo must be rewritten, and the
      // rewritten record is what `commit` sees.
      const dangling: Trip = {
        ...withPhoto,
        days: withPhoto.days.map((d) => ({ ...d, stops: [] })),
        photos: withPhoto.photos.map((p) => ({ ...p, caption: 42 } as unknown as PhotoAsset)),
      };
      return PhotosMod.reattachDanglingPhotos(dangling);
    },
  },
  {
    door: 'returnToPool', noun: 'stop', path: '$.category', where: 'moveStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return PoolMod.returnToPool(poisonStop(trip, stopId, 'category', 'transport'), stopId, 'wien');
    },
  },
  {
    door: 'scheduleFromPool', noun: 'stop', path: '$.category', where: 'moveStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      const pooled = StopsMod.moveStop(trip, stopId, { kind: 'pool', cityKey: 'wien' });
      const poisoned: Trip = {
        ...pooled,
        pool: pooled.pool.map((s) => ({ ...s, category: 'transport' } as unknown as Stop)),
      };
      return PoolMod.scheduleFromPool(poisoned, stopId, { dayId: '2026-03-01', time: '10:00', order: 0 });
    },
  },
  {
    // The one door whose input is another person's document (§2.14). The PLACE it drags in is
    // refused first — A-77 Part 3 rule 2's stated collection order, `places` before `days`.
    door: 'copyStopInto', noun: 'place', path: '$.category', where: 'copyStopInto',
    hostile: () => {
      const { trip: target, c } = baseTrip();
      const { trip: src, stopId } = foreignTrip((t) => ({
        ...t, places: t.places.map((p) => ({ ...p, category: 'transport' } as unknown as Place)),
      }));
      return CopyStopMod.copyStopInto(target, { trip: src, stopId },
        { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
        { ids: c.ids, today: '2026-03-01', actorUserId: 'local:self' });
    },
  },
  {
    // The case A-76's census structurally could not see: another directory, an eighth record class.
    door: 'resolveConflict', noun: 'resolution', path: '$.state', where: 'resolveConflict',
    hostile: () => {
      const { trip } = baseTrip();
      return ResolveMod.resolveConflict(trip, { conflictId: 'c-1', state: 'bogus' as never, by: 'local:self', at: '2026-03-01' });
    },
  },
  {
    door: 'syncResolutions', noun: 'resolution', path: '$.by', where: 'syncResolutions',
    hostile: () => {
      const t = tripWithResolution();
      const poisoned: Trip = { ...t, resolutions: t.resolutions.map((r) => ({ ...r, by: 42 } as unknown as typeof r)) };
      return ResolveMod.syncResolutions(poisoned, '2026-03-02');
    },
  },
  {
    door: 'reassertRetirements', noun: 'resolution', path: '$.by', where: 'reassertRetirements',
    hostile: () => {
      const t = tripWithResolution();
      const poisoned: Trip = { ...t, resolutions: t.resolutions.map((r) => ({ ...r, by: 42 } as unknown as typeof r)) };
      return ResolveMod.reassertRetirements(poisoned, new Map([['c-1', '2026-03-02']]));
    },
  },
  {
    door: 'unresolveConflict', noun: 'trip', path: '$.title', where: 'unresolveConflict',
    hostile: () => ResolveMod.unresolveConflict(poisonedEnvelope(tripWithResolution()), 'c-1'),
  },
];

test('A-77 Part 6.4: the behavioural census covers every door, exactly once', () => {
  assert.deepEqual(HOSTILE.map((r) => r.door).sort(), [...DOORS].sort());
});

/**
 * **A-78 Part 2's widening reaches the runner, not only the classifier** (BUILD-NOTES KD-107).
 * The classifier now admits `Promise<Trip>`, and a synchronous `try`/`catch` cannot see a rejected
 * promise: an async door's refusal would read as *"the door ACCEPTED a value `fromJSON` refuses"*,
 * which is the wrong sentence about the wrong fact. Every door is synchronous today, so this
 * changes nothing that runs — it is what stops A-78 Part 9's **N3** from being half-true.
 */
function isThenable(v: unknown): v is PromiseLike<unknown> {
  return typeof (v as { then?: unknown } | null)?.then === 'function';
}

for (const row of HOSTILE) {
  test(`A-77 Part 6.4: ${row.door} refuses a ${row.noun} the parser refuses (${row.path})`, async () => {
    let thrown: unknown = null;
    try {
      const out = row.hostile();
      if (isThenable(out)) await out;
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown !== null, `${row.door} accepted a ${row.noun} fromJSON refuses at ${row.path}`);
    assert.ok(thrown instanceof Error, `${row.door} threw a non-Error`);
    // A-76 Part 3's one hard prohibition, upheld entire by A-77: never a `TripParseError`. That
    // type means "this STORED document is unopenable" to `store.ts` and to §2.9 A-47's
    // `noteOpenFailure`, and raising one from a build door would put a live, healthy document
    // into the unreadable-row path.
    assert.ok(!(thrown instanceof TripParseError), `${row.door} threw a TripParseError`);
    const msg = (thrown as Error).message;
    assert.ok(msg.startsWith(`${row.where}: this ${row.noun} cannot be stored`), msg);
    assert.ok(msg.includes(row.path), `refusal does not carry the parser's path ${row.path}: ${msg}`);
    assert.ok(msg.includes('cannot be re-opened'), msg);
  });
}

// ---------------------------------------------------------------------------------------------
// A-78 Part 7 (QA **R56-10**) — **Invariant R**, the door half, enforced mechanically.
//
// > **Invariant R — records are replaced, never rewritten.** A record in a committed `Trip` is
// > immutable in practice. Code that changes a record produces a NEW object (`{...r, field: v}`)
// > and puts it in a new collection array; it never assigns through a reference into a record the
// > document already holds. **This is what makes `commit`'s identity diff sound**: an in-place
// > write is invisible to it, permanently, and the document becomes unopenable with no refusal at
// > any door.
//
// The premise was unstated until A-78, and the breaker demonstrated its violation at three record
// classes. It is now written into `commit.ts`'s header docstring, and this is the half the
// repository controls, proved rather than asserted: **for every door, deep-freeze the `before`
// document, call the door with a LEGAL argument, and assert it does not throw.** A door that
// mutates rather than replaces throws `TypeError` in strict mode (every module here is ESM).
//
// **There is no `Object.freeze` in `src`** — A-78 Part 7 refuses that, with its reasons and its
// trigger, and this is deliberately a test-time freeze. The CALLER half stays a written invariant.
// ---------------------------------------------------------------------------------------------

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  return value;
}

type FrozenRow = {
  /** The door. Must be one of `DOORS`, and every door must have a row. */
  door: string;
  /** The `before` document. The test deep-freezes THIS and hands it to `go`. */
  before: () => Trip;
  go: (frozen: Trip, c: BuildCtx) => Trip;
};

const PLACEMENT = { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 } as const;

const FROZEN: readonly FrozenRow[] = [
  { door: 'upsertBooking', before: () => baseTrip().trip, go: (t) => Bookings.upsertBooking(t, GOOD_BOOKING) },
  {
    door: 'supersedeBooking',
    before: () => Bookings.upsertBooking(Bookings.upsertBooking(baseTrip().trip, GOOD_BOOKING), { ...GOOD_BOOKING, id: 'bk-2' }),
    go: (t) => Bookings.supersedeBooking(t, 'bk-1', 'bk-2'),
  },
  {
    door: 'linkBooking',
    before: () => Bookings.upsertBooking(tripWithStop().trip, GOOD_BOOKING),
    go: (t) => Bookings.linkBooking(t, 'stop-1', 'bk-1'),
  },
  {
    door: 'acceptCandidate', before: () => tripWithStop().trip,
    go: (t) => Candidates.acceptCandidate(t, { kind: 'stop', id: 'stop-1' }, 'local:self', '2026-03-02'),
  },
  {
    door: 'rejectCandidate', before: () => tripWithStop().trip,
    go: (t) => Candidates.rejectCandidate(t, { kind: 'stop', id: 'stop-1' }, 'local:self', '2026-03-02'),
  },
  {
    // The `before` document here is the TARGET. The source is an argument, not the document being
    // edited, so it is not what this criterion freezes.
    door: 'copyStopInto', before: () => baseTrip().trip,
    go: (t, c) => {
      const { trip: src, stopId } = foreignTrip((x) => x);
      return CopyStopMod.copyStopInto(t, { trip: src, stopId }, PLACEMENT,
        { ids: c.ids, today: '2026-03-01', actorUserId: 'local:self' });
    },
  },
  {
    // `createTrip`'s `before` is `null` — the base case. What it must not mutate is the caller's
    // `init`, so that is what is frozen for this row.
    door: 'createTrip', before: () => baseTrip().trip,
    go: (_t, c) => CreateTripMod.createTrip(deepFreeze({
      id: 'trip-frozen', title: 'Frozen', startDate: '2026-03-01', endDate: '2026-03-03',
      cities: [{ key: 'wien', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
    }), c),
  },
  { door: 'setTripMeta', before: () => baseTrip().trip, go: (t, c) => CreateTripMod.setTripMeta(t, { title: 'Renamed' }, c) },
  { door: 'ensureDays', before: () => baseTrip().trip, go: (t, c) => DaysMod.ensureDays(t, c) },
  { door: 'setDayMeta', before: () => baseTrip().trip, go: (t) => DaysMod.setDayMeta(t, '2026-03-01', { title: 'Arrival' }) },
  {
    door: 'addParticipant', before: () => baseTrip().trip,
    go: (t, c) => ParticipantsMod.addParticipant(t, { displayName: 'Marta', kind: 'contact' }, c),
  },
  {
    door: 'updateParticipant',
    before: () => { const { trip, c } = baseTrip(); return ParticipantsMod.addParticipant(trip, { displayName: 'Marta' }, c); },
    go: (t) => ParticipantsMod.updateParticipant(t, t.participants[0].id, { displayName: 'Marta B' }),
  },
  {
    door: 'removeParticipant',
    before: () => { const { trip, c } = baseTrip(); return ParticipantsMod.addParticipant(trip, { displayName: 'Marta' }, c); },
    go: (t) => ParticipantsMod.removeParticipant(t, t.participants[0].id),
  },
  {
    door: 'addPhoto', before: () => baseTrip().trip,
    go: (t, c) => PhotosMod.addPhoto(t, { thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c),
  },
  {
    door: 'updatePhoto',
    before: () => { const { trip, c } = baseTrip(); return PhotosMod.addPhoto(trip, { id: 'ph-1', thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c); },
    go: (t) => PhotosMod.updatePhoto(t, 'ph-1', { caption: 'A caption' }),
  },
  {
    door: 'removePhoto',
    before: () => { const { trip, c } = baseTrip(); return PhotosMod.addPhoto(trip, { id: 'ph-1', thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c); },
    go: (t) => PhotosMod.removePhoto(t, 'ph-1'),
  },
  {
    // Something must actually dangle, or the door returns the trip by reference and proves nothing.
    door: 'reattachDanglingPhotos',
    before: () => {
      const { trip, c, stopId } = tripWithStop();
      const withPhoto = PhotosMod.addPhoto(trip, { id: 'ph-1', attach: { kind: 'stop', stopId }, thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
      return { ...withPhoto, days: withPhoto.days.map((d) => ({ ...d, stops: [] })) };
    },
    go: (t) => PhotosMod.reattachDanglingPhotos(t),
  },
  { door: 'returnToPool', before: () => tripWithStop().trip, go: (t) => PoolMod.returnToPool(t, 'stop-1', 'wien') },
  {
    door: 'scheduleFromPool',
    before: () => StopsMod.moveStop(tripWithStop().trip, 'stop-1', { kind: 'pool', cityKey: 'wien' }),
    go: (t) => PoolMod.scheduleFromPool(t, 'stop-1', { dayId: '2026-03-01', time: '10:00', order: 0 }),
  },
  {
    door: 'addStop', before: () => baseTrip().trip,
    go: (t, c) => StopsMod.addStop(t, PLACEMENT, { name: 'Prater', category: 'sight' }, c),
  },
  { door: 'updateStop', before: () => tripWithStop().trip, go: (t) => StopsMod.updateStop(t, 'stop-1', { name: 'Belvedere Palace' }) },
  { door: 'removeStop', before: () => tripWithStop().trip, go: (t) => StopsMod.removeStop(t, 'stop-1') },
  { door: 'moveStop', before: () => tripWithStop().trip, go: (t) => StopsMod.moveStop(t, 'stop-1', { kind: 'pool', cityKey: 'wien' }) },
  {
    door: 'reorderStop',
    before: () => {
      const { trip, c } = tripWithStop();
      return StopsMod.addStop(trip, { kind: 'scheduled', dayId: '2026-03-01', time: '12:00', order: 1 },
        { id: 'stop-2', name: 'Prater', category: 'sight' }, c);
    },
    go: (t) => StopsMod.reorderStop(t, 'stop-1', 1),
  },
  { door: 'addPlace', before: () => baseTrip().trip, go: (t) => StopsMod.addPlace(t, GOOD_PLACE) },
  {
    door: 'resolveConflict', before: () => baseTrip().trip,
    go: (t) => ResolveMod.resolveConflict(t, { conflictId: 'c-1', state: 'dismissed', by: 'local:self', at: '2026-03-01' }),
  },
  { door: 'syncResolutions', before: () => tripWithResolution(), go: (t) => ResolveMod.syncResolutions(t, '2026-03-02') },
  {
    door: 'reassertRetirements', before: () => tripWithResolution(),
    go: (t) => ResolveMod.reassertRetirements(t, new Map([['c-1', '2026-03-02']])),
  },
  { door: 'unresolveConflict', before: () => tripWithResolution(), go: (t) => ResolveMod.unresolveConflict(t, 'c-1') },
];

test('A-78 Part 7: the frozen-input census covers every door, exactly once', () => {
  assert.deepEqual(FROZEN.map((r) => r.door).sort(), [...DOORS].sort());
});

for (const row of FROZEN) {
  test(`A-78 Part 7 (Invariant R): ${row.door} replaces rather than rewrites — a frozen \`before\` is enough`, async () => {
    const frozen = deepFreeze(row.before());
    let thrown: unknown = null;
    try {
      const out: unknown = row.go(frozen, ctx(`frozen-${row.door}`));
      if (isThenable(out)) await out;
    } catch (err) {
      thrown = err;
    }
    assert.equal(
      thrown, null,
      `${row.door} threw on a deep-frozen \`before\` document: ${(thrown as Error)?.message}. ` +
      'Invariant R — records are REPLACED, never rewritten. An in-place write is invisible to ' +
      "`commit`'s identity diff, permanently, and the document becomes unopenable with no " +
      'refusal at any door.',
    );
  });
}

// ---------------------------------------------------------------------------------------------
// A-77 Part 8 fault N5 — the SIXTEEN door × field cases of Part 1, re-derived here as a standing
// test rather than a one-off probe run. Each must be REFUSED AT DOOR.
// ---------------------------------------------------------------------------------------------

const SIXTEEN: ReadonlyArray<{ label: string; go: () => unknown }> = [
  // R55-1 — `setDayMeta · stops`. `DayMetaPatch` is a compile-time `Pick`; the door had no
  // runtime key allowlist, and A-76's elision then substituted the injected list away before
  // `parseDay` could see it.
  {
    label: 'R55-1 setDayMeta · stops',
    go: () => {
      const { trip, stopId } = tripWithStop();
      return DaysMod.setDayMeta(trip, '2026-03-01', {
        stops: [{ ...trip.days[0].stops[0], category: 'transport' }],
      } as unknown as Parameters<typeof DaysMod.setDayMeta>[2]);
    },
  },
  // R55-2 — two exemption reasons A-76 stated and the code disproved. Four cases.
  {
    label: 'R55-2 acceptCandidate · at (stop)',
    go: () => {
      const { trip, stopId } = tripWithStop();
      return Candidates.acceptCandidate(trip, { kind: 'stop', id: stopId }, 'local:self', 42 as unknown as string);
    },
  },
  {
    label: 'R55-2 acceptCandidate · at (day)',
    go: () => {
      const { trip } = baseTrip();
      return Candidates.acceptCandidate(trip, { kind: 'day', id: '2026-03-01' }, 'local:self', 42 as unknown as string);
    },
  },
  {
    label: 'R55-2 createTrip → blankDay · ctx.now',
    go: () => CreateTripMod.createTrip(
      { title: 'x', startDate: '2026-03-01', endDate: '2026-03-03', cities: [] },
      { ids: sequentialIds('n'), now: 42 as unknown as string, actorUserId: 'local:self' }),
  },
  {
    label: 'R55-2 setTripMeta → ensureDays · ctx.now on a range change',
    go: () => {
      const { trip } = baseTrip();
      return CreateTripMod.setTripMeta(trip, { endDate: '2026-03-20' },
        { ids: sequentialIds('n2'), now: 42 as unknown as string, actorUserId: 'local:self' });
    },
  },
  // R55-3 — the eight trip-level scalars A-76 Part 2 exempted in one sentence.
  { label: 'R55-3 setTripMeta · title', go: () => { const { trip, c } = baseTrip(); return CreateTripMod.setTripMeta(trip, { title: 42 as unknown as string }, c); } },
  { label: 'R55-3 setTripMeta · homeCurrency', go: () => { const { trip, c } = baseTrip(); return CreateTripMod.setTripMeta(trip, { homeCurrency: 7 as unknown as string }, c); } },
  { label: 'R55-3 setTripMeta · ownerId', go: () => { const { trip, c } = baseTrip(); return CreateTripMod.setTripMeta(trip, { ownerId: 7 as unknown as string }, c); } },
  { label: 'R55-3 setTripMeta · party', go: () => { const { trip, c } = baseTrip(); return CreateTripMod.setTripMeta(trip, { party: 'two' as unknown as Trip['party'] }, c); } },
  { label: 'R55-3 setTripMeta · meta', go: () => { const { trip, c } = baseTrip(); return CreateTripMod.setTripMeta(trip, { meta: 7 as unknown as Trip['meta'] }, c); } },
  { label: 'R55-3 createTrip · title', go: () => CreateTripMod.createTrip({ title: 42 as unknown as string, startDate: '2026-03-01', endDate: '2026-03-02', cities: [] }, ctx()) },
  { label: 'R55-3 createTrip · homeCurrency', go: () => CreateTripMod.createTrip({ title: 'x', homeCurrency: 7 as unknown as string, startDate: '2026-03-01', endDate: '2026-03-02', cities: [] }, ctx()) },
  { label: 'R55-3 createTrip · party', go: () => CreateTripMod.createTrip({ title: 'x', party: 'two' as unknown as Trip['party'], startDate: '2026-03-01', endDate: '2026-03-02', cities: [] }, ctx()) },
  // The architect's own three, at a door in a directory A-76's census could not read, writing the
  // eighth record class. These are what decided A-77 Part 2.
  { label: 'NEW resolveConflict · state', go: () => ResolveMod.resolveConflict(baseTrip().trip, { conflictId: 'c-1', state: 'bogus' as never, by: 'local:self', at: '2026-03-01' }) },
  { label: 'NEW resolveConflict · by', go: () => ResolveMod.resolveConflict(baseTrip().trip, { conflictId: 'c-1', state: 'dismissed', by: 42 as unknown as string, at: '2026-03-01' }) },
  { label: 'NEW resolveConflict · note', go: () => ResolveMod.resolveConflict(baseTrip().trip, { conflictId: 'c-1', state: 'dismissed', by: 'local:self', at: '2026-03-01', note: {} as unknown as string }) },
];

test('A-77 Part 8 N5: all sixteen door × field cases of Part 1 are REFUSED AT DOOR', () => {
  assert.equal(SIXTEEN.length, 16, 'A-77 Part 1 measures sixteen cases');
  const survivors: string[] = [];
  for (const { label, go } of SIXTEEN) {
    let thrown: unknown = null;
    try {
      const out = go();
      // Not refused: does the document it produced still open? That is the harm, measured the way
      // round 55 measured it — door → toJSON → fromJSON.
      try {
        fromJSON(toJSON(out as Trip));
        survivors.push(`${label} → accepted, and the saved document still reopens`);
      } catch (e) {
        survivors.push(`${label} → accepted, and the SAVED document is UNOPENABLE (${(e as Error).message})`);
      }
    } catch (err) {
      thrown = err;
    }
    if (thrown !== null) {
      assert.ok(thrown instanceof Error && !(thrown instanceof TripParseError),
        `${label} refused with the wrong error type`);
    }
  }
  assert.deepEqual(survivors, [], 'a door still writes a document that cannot be opened again');
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 5 — `setDayMeta`'s missing allowlist, the half of R55-1 `commit` does NOT subsume.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 5: setDayMeta refuses every key outside DayMetaPatch', () => {
  const { trip } = baseTrip();
  for (const key of ['stops', 'id', 'date', 'somethingNobodyDeclared']) {
    assert.throws(
      () => DaysMod.setDayMeta(trip, '2026-03-01', { [key]: undefined } as unknown as Parameters<typeof DaysMod.setDayMeta>[2]),
      new RegExp(`setDayMeta: "${key}" may not be patched`),
      `${key} was accepted on a DayMetaPatch`,
    );
  }
});

test('A-77 Part 5: a `stops` key carrying an ALREADY-VALID stop from another day is still refused', () => {
  // This is the case `commit` cannot see: the smuggled stop is a perfectly parseable record and
  // is the SAME OBJECT the document already holds, so the identity diff finds nothing new. What
  // it produces is `duplicate_id` and `scheduled_stop_has_no_day` on an edit the user never made.
  const { trip, c, stopId } = tripWithStop();
  const existing = trip.days[0].stops[0];
  const twoDays = DaysMod.setDayMeta(trip, '2026-03-02', { title: 'Day two' });
  assert.throws(
    () => DaysMod.setDayMeta(twoDays, '2026-03-02', { stops: [existing] } as unknown as Parameters<typeof DaysMod.setDayMeta>[2]),
    /setDayMeta: "stops" may not be patched/,
  );
});

/**
 * **QA R56-6 — the type and the runtime allowlist, pinned.** `DAY_META_PATCH_KEYS` was a
 * hand-maintained second copy of `DayMetaPatch`'s `Pick` with nothing holding the two together: a
 * field added to the type and not to the constant makes a legal patch silently refused, and
 * nothing catches it. The pin is in two halves, and this is the second:
 *
 *   1. `days.ts` types the constant as `Record<keyof DayMetaPatch, true>` — the same
 *      compile-time shape `readOnce.test.ts`'s four `CENSUS_*_FIELDS` maps use — so a field added
 *      to `DayMetaPatch` and not to the constant fails `npm run typecheck` **in `src`**, on the
 *      commit that adds it.
 *   2. This literal is typed `Required<DayMetaPatch>`, so the same field fails `npm run typecheck`
 *      **here** until the fixture carries it — and the assertion below then drives it through the
 *      real door, which is what makes the constant's agreement a *behaviour* and not a type.
 */
const EVERY_DAY_META_KEY: Required<DaysMod.DayMetaPatch> = {
  primaryCity: 'wien', cities: ['wien'], title: 'Arrival', subtitle: 'Landing',
  legacyFlag: true, tzId: 'Europe/Vienna',
  // `provenance` was here and A-78 Part 5 takes it out of the `Pick`. Both halves move together:
  // if only the constant moved, this literal would fail `npm run typecheck` for a missing key.
};

test('A-77 Part 5 (R56-6): every key of DayMetaPatch is accepted — the type and the allowlist cannot drift', () => {
  const { trip } = baseTrip();
  assert.doesNotThrow(() => DaysMod.setDayMeta(trip, '2026-03-01', EVERY_DAY_META_KEY));
  // Key by key, so a drift names the field rather than failing on the whole patch.
  for (const [k, v] of Object.entries(EVERY_DAY_META_KEY)) {
    assert.doesNotThrow(
      () => DaysMod.setDayMeta(trip, '2026-03-01', { [k]: v } as DaysMod.DayMetaPatch),
      `"${k}" is a key of DayMetaPatch and setDayMeta refused it — the allowlist has drifted from the type`,
    );
  }
});

test('A-77 Part 5 (R56-6): a key inherited from Object.prototype is not a patchable key', () => {
  // The allowlist is an OWN-property lookup, not `in`: `{toString: …}` names a key every object
  // has and none of them is a field of `DayMetaPatch`.
  const { trip } = baseTrip();
  for (const key of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
    assert.throws(
      () => DaysMod.setDayMeta(trip, '2026-03-01', Object.defineProperty({}, key, {
        value: undefined, enumerable: true, configurable: true, writable: true,
      }) as DaysMod.DayMetaPatch),
      // Not anchored at the front: `assert.throws` matches a RegExp against `String(err)`, which
      // carries the `Error: ` prefix. The tail is the part that matters here.
      new RegExp(`setDayMeta: "${key}" may not be patched — it is not a field of DayMetaPatch$`),
      `${key} was accepted on a DayMetaPatch, or its refusal printed a value off Object.prototype ` +
      'where its reason belongs',
    );
  }
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 4 (QA **R56-5** / BUILD-NOTES **KD-104**) — `TripMetaPatch` joins the patch-allowlist
// family. Deleting `assertDatePrecision` was right and it left a real regression, and it is a
// change of **verdict** rather than of message: `setTripMeta(t, {datePrecision: undefined})` on a
// `'month'` trip silently wrote `'exact'`.
//
// **Why the family and not a guard for one field.** `parseTripEnvelope` carries `fromJSON`'s
// TOLERANCES verbatim, by design — absent `ownerId` is `''`, absent `datePrecision` is `'exact'`,
// absent `homeBase` is `null`. Those are right for a *document* (an older file; a field that did
// not exist yet) and wrong for a *patch*, where a key's PRESENCE is the caller saying *set this
// field to this value* and `undefined` is not a value any of these fields may hold. **Every field
// with a parser tolerance is a hole of exactly this shape**; `datePrecision` is the one a breaker
// reached first.
// ---------------------------------------------------------------------------------------------

/** Every key of `TripMetaPatch`, typed so a field added to the `Pick` fails `npm run typecheck`
 * here until the fixture carries it — R56-6's pin, applied to the second patch door. */
const EVERY_TRIP_META_KEY: Required<CreateTripMod.TripMetaPatch> = {
  title: 'Renamed', startDate: '2026-03-01', endDate: '2026-03-04', datePrecision: 'month',
  homeCurrency: 'GBP', homeBase: null, party: { adults: 2, children: 1 }, cities: [],
  ownerId: 'local:self', meta: { k: 1 },
};

test('A-78 Part 4 (R56-5): setTripMeta refuses a present-but-undefined key of TripMetaPatch', () => {
  const { trip, c } = baseTrip();
  const month = CreateTripMod.setTripMeta(trip, { datePrecision: 'month' }, c);
  assert.equal(month.datePrecision, 'month');
  assert.throws(
    () => CreateTripMod.setTripMeta(month, { datePrecision: undefined }, c),
    /setTripMeta: "datePrecision" may not be patched to `undefined`/,
    'a present-but-undefined datePrecision silently reset a precision the USER chose',
  );
  // …and the trip still reads what the user said.
  assert.equal(month.datePrecision, 'month');

  // The family, not the field: every key of `TripMetaPatch` gets the same answer, because every
  // one of them either has a parser tolerance or is a field `undefined` cannot be.
  for (const k of Object.keys(EVERY_TRIP_META_KEY)) {
    assert.throws(
      () => CreateTripMod.setTripMeta(month, { [k]: undefined } as CreateTripMod.TripMetaPatch, c),
      new RegExp(`setTripMeta: "${k}" may not be patched to \`undefined\``),
      `"${k}" was accepted with an explicit undefined — a caller that means *leave this field ` +
      'alone* omits the key',
    );
  }
});

test('A-78 Part 4 (R56-5): setTripMeta refuses any key outside TripMetaPatch\'s Pick', () => {
  const { trip, c } = baseTrip();
  for (const key of ['days', 'stops', 'id', 'revision', 'schemaVersion', 'photos', 'somethingNobodyDeclared']) {
    assert.throws(
      () => CreateTripMod.setTripMeta(trip, { [key]: 'x' } as unknown as CreateTripMod.TripMetaPatch, c),
      new RegExp(`setTripMeta: "${key}" may not be patched — it is not a field of TripMetaPatch$`),
      `${key} was accepted on a TripMetaPatch`,
    );
  }
});

test('A-78 Part 4 (R56-5): a key inherited from Object.prototype is not a patchable key here either', () => {
  const { trip, c } = baseTrip();
  for (const key of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
    assert.throws(
      () => CreateTripMod.setTripMeta(trip, Object.defineProperty({}, key, {
        value: 'x', enumerable: true, configurable: true, writable: true,
      }) as CreateTripMod.TripMetaPatch, c),
      new RegExp(`setTripMeta: "${key}" may not be patched — it is not a field of TripMetaPatch$`),
      `${key} was accepted on a TripMetaPatch`,
    );
  }
});

test('A-78 Part 4 (R56-5): every key of TripMetaPatch is still ACCEPTED with a real value', () => {
  const { trip, c } = baseTrip();
  assert.doesNotThrow(() => CreateTripMod.setTripMeta(trip, EVERY_TRIP_META_KEY, c));
  for (const [k, v] of Object.entries(EVERY_TRIP_META_KEY)) {
    assert.doesNotThrow(
      () => CreateTripMod.setTripMeta(trip, { [k]: v } as CreateTripMod.TripMetaPatch, c),
      `"${k}" is a key of TripMetaPatch and setTripMeta refused it — the allowlist has drifted ` +
      'from the type',
    );
  }
});

test('A-78 Part 4: the `cities` Array.isArray check STAYS — it is the one shape commit cannot see', () => {
  const { trip, c } = baseTrip();
  assert.throws(
    () => CreateTripMod.setTripMeta(trip, { cities: 'not an array' as unknown as Trip['cities'] }, c),
    /setTripMeta: cities must be an array/,
    'commit walks a COLLECTION; a non-array in the slot is the one shape the per-collection walk ' +
    'cannot see',
  );
  // `{cities: undefined}` is subsumed by the new rule and answers with it, not with this one.
  assert.throws(
    () => CreateTripMod.setTripMeta(trip, { cities: undefined }, c),
    /setTripMeta: "cities" may not be patched to `undefined`/,
  );
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 5 (QA **R56-7**) — `provenance` leaves `DayMetaPatch`.
//
// `setDayMeta`'s allowlist permitted `provenance` because `DayMetaPatch`'s `Pick` named it, while
// `updateStop`'s `FORBIDDEN_PATCH_KEYS` forbids it by name. Two doors, one field, opposite
// answers. **The stop's answer is the right one and the day follows it**: provenance records *who
// said so*, and a caller that can rewrite it can launder a suggestion into the user's own plan —
// the one convention the root `CLAUDE.md` calls absolute. `Sidebar.tsx` renders
// `displayStatus(day.provenance)` exactly as `DayTimeline.tsx` renders it for a stop, so a
// rewritable day provenance is a VISIBLE false claim about who planned the day.
// ---------------------------------------------------------------------------------------------

test('A-78 Part 5 (R56-7): setDayMeta refuses `provenance`, with updateStop\'s reason verbatim', () => {
  const { trip, stopId } = tripWithStop();
  assert.throws(
    () => DaysMod.setDayMeta(trip, '2026-03-01', { provenance: GOOD_PROVENANCE } as unknown as DaysMod.DayMetaPatch),
    /setDayMeta: "provenance" may not be patched — use acceptCandidate \/ rejectCandidate$/,
  );
  // The two doors now read the same. This is the sentence being matched against.
  assert.throws(
    () => StopsMod.updateStop(trip, stopId, { provenance: GOOD_PROVENANCE } as never),
    /updateStop: "provenance" may not be patched — use acceptCandidate \/ rejectCandidate$/,
  );
});

test('A-78 Part 5 (R56-7): a Day\'s provenance is written by blankDay and importLegacyDays and by nothing a caller can reach', () => {
  const { trip } = baseTrip();
  const before = trip.days[0].provenance;
  const after = DaysMod.setDayMeta(trip, '2026-03-01', { title: 'Arrival' });
  assert.deepEqual(after.days[0].provenance, before);
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 3 rule 4 — the elision survives, STRUCTURALLY rather than by a declared clause.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 3.4: setDayMeta edits a day that already holds an unparseable stop', () => {
  // The point of the identity diff: the poisoned stop is the SAME OBJECT the door was handed, so
  // it is not re-parsed and the edit is not punished for data it did not write.
  const { trip, stopId } = tripWithStop();
  const poisoned = poisonStop(trip, stopId, 'category', 'transport');
  assert.doesNotThrow(() => DaysMod.setDayMeta(poisoned, '2026-03-01', { title: 'Arrival' }));
});

test('A-77 Part 3.4: a stop that MOVES between a day and the pool is not re-parsed for having moved', () => {
  const { trip, stopId } = tripWithStop();
  // A pre-existing record the parser would refuse, moved without being rewritten: `moveStop`
  // rewrites `placement`, so this asserts the one-set-over-days-and-pool rule through a door that
  // does NOT rewrite the record — `removeParticipant` on a trip whose pool holds it.
  const pooled = StopsMod.moveStop(trip, stopId, { kind: 'pool', cityKey: 'wien' });
  const poisoned: Trip = { ...pooled, pool: pooled.pool.map((s) => ({ ...s, category: 'transport' } as unknown as Stop)) };
  // `addPlace` touches neither the pool nor the days, so the poisoned pooled stop keeps identity.
  assert.doesNotThrow(() => StopsMod.addPlace(poisoned, GOOD_PLACE));
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 3 rule 5 — R55-5's TOCTOU, closed at every door rather than at the two the repros used.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 3.5 (R55-5): a getter that flips on its second read cannot poison the document', () => {
  const { trip } = baseTrip();
  let reads = 0;
  const hostile = {
    ...GOOD_BOOKING,
    get kind(): Booking['kind'] {
      reads += 1;
      return reads === 1 ? 'train' : ('spaceship' as Booking['kind']);
    },
  } as Booking;
  const next = Bookings.upsertBooking(trip, hostile);
  assert.equal(next.bookings[0].kind, 'train');
  // And the document the door produced still opens, however many times the getter has since run.
  assert.doesNotThrow(() => fromJSON(toJSON(next)));
});

test('A-77 Part 3.5 (R55-5): a caller that mutates its object after the door returned holds an object the document no longer contains', () => {
  const { trip } = baseTrip();
  const mine: Booking = { ...GOOD_BOOKING };
  const next = Bookings.upsertBooking(trip, mine);
  assert.notEqual(next.bookings[0], mine, 'the door stored the caller\'s own object');
  (mine as { kind: string }).kind = 'spaceship';
  assert.equal(next.bookings[0].kind, 'train');
  assert.doesNotThrow(() => fromJSON(toJSON(next)));
});

test('A-77 Part 3.6 (R55-5): `party` and `homeBase` are substituted too', () => {
  const { trip, c } = baseTrip();
  const party = { adults: 2, children: 1 };
  const next = CreateTripMod.setTripMeta(trip, { party }, c);
  assert.notEqual(next.party, party, 'the envelope was not substituted');
  (party as { adults: unknown }).adults = 'two';
  assert.equal(next.party.adults, 2);
  assert.doesNotThrow(() => fromJSON(toJSON(next)));
});

// ---------------------------------------------------------------------------------------------
// QA **R56-4** — rule 5's TOCTOU one level UP: the collection ARRAY, not the record in it.
//
// Rule 5 made the RECORD read-once. The array holding it was not. `commitList` read `after[i]`
// for the aligned test and then built its output with `after.slice()` — a SECOND read of every
// slot it had not parsed — and when it parsed nothing at all it returned the array it was handed
// **by reference**, so every later read of that array (`toJSON`'s, the next door's) was a third.
// With an accessor on the slot, the value that was tested is then not the value that is stored:
// the breaker's flip-read sweep produced an UNOPENABLE document at flip 3.
//
// `commitList` and `commitDays` now read each slot exactly once and **accumulate what they read**
// into the array they return, so the collection in the committed document holds the values that
// were tested and no accessor the caller controls.
// ---------------------------------------------------------------------------------------------

/**
 * The breaker's own oracle (`qa/r56-a77.mjs`'s `census`): call the door, serialise what it
 * returned, try to open it again. `REFUSED` is the mechanism working. **`UNOPENABLE` is the
 * defect class** — it saved, and it can never be opened again.
 */
function census(run: () => Trip): 'REFUSED' | 'UNSERIALISABLE' | 'UNOPENABLE' | 'clean' {
  let doc: Trip;
  try { doc = run(); } catch { return 'REFUSED'; }
  let bytes: string;
  try { bytes = toJSON(doc); } catch { return 'UNSERIALISABLE'; }
  try { fromJSON(bytes); } catch { return 'UNOPENABLE'; }
  return 'clean';
}

/** An array whose slot `i` yields `flipped` on the `flipAt`-th read and `stable` on every other. */
function flipRead<T>(rows: readonly T[], i: number, flipAt: number, stable: T, flipped: T): T[] {
  const out = rows.slice();
  let reads = 0;
  Object.defineProperty(out, String(i), {
    configurable: true, enumerable: true,
    get(): T { return ++reads === flipAt ? flipped : stable; },
  });
  return out;
}

test('A-77 Part 3.5 (R56-4): a collection slot that flips on a LATER read cannot poison the document', () => {
  const { trip, c } = baseTrip();
  const base = Bookings.upsertBooking(
    Bookings.upsertBooking(trip, GOOD_BOOKING),
    { ...GOOD_BOOKING, id: 'bk-2', kind: 'bus' },
  );
  const good1 = base.bookings[1];
  const evil = { ...good1, kind: 'teleport' as Booking['kind'] };

  const bad: string[] = [];
  for (let flipAt = 1; flipAt <= 5; flipAt++) {
    const hostile = flipRead(base.bookings, 1, flipAt, good1, evil);
    const verdict = census(() =>
      CreateTripMod.setTripMeta({ ...base, bookings: hostile }, { title: `r${flipAt}` }, c));
    if (verdict === 'UNOPENABLE' || verdict === 'UNSERIALISABLE') bad.push(`flip ${flipAt}: ${verdict}`);
  }
  assert.deepEqual(
    bad, [],
    'a read of a collection slot other than the tested one reached the document — the value that ' +
    'was checked is not the value that was stored (R56-4, R55-5\'s class inside commit itself)',
  );
});

test('A-77 Part 3.5 (R56-4): the same holds for the DAYS array, whose slots commitDays reads', () => {
  const { trip } = baseTrip();
  const good1 = trip.days[1];
  const evil = { ...good1, title: 42 as unknown as string };

  const bad: string[] = [];
  for (let flipAt = 1; flipAt <= 5; flipAt++) {
    const hostile = flipRead(trip.days, 1, flipAt, good1, evil);
    const verdict = census(() => StopsMod.addPlace({ ...trip, days: hostile }, GOOD_PLACE));
    if (verdict === 'UNOPENABLE' || verdict === 'UNSERIALISABLE') bad.push(`flip ${flipAt}: ${verdict}`);
  }
  assert.deepEqual(bad, [], 'commitDays stored a read of a day slot other than the one it tested');
});

test('A-77 Part 3.5 (R56-4): commit accumulates — a committed collection is never the array the door handed it', () => {
  const { trip, c } = baseTrip();
  const base = Bookings.upsertBooking(trip, GOOD_BOOKING);
  const next = CreateTripMod.setTripMeta(base, { title: 'Renamed' }, c);
  assert.notEqual(
    next.bookings, base.bookings,
    'commit returned the array it was handed, so a later read of a slot is not the read that was tested',
  );
  assert.notEqual(next.days, base.days, 'the same, for the days array commitDays builds');
  // Accumulation is not re-parsing: every unchanged record keeps its identity, which is what
  // A-77 Part 9's budget is bought with.
  assert.equal(next.bookings[0], base.bookings[0]);
  for (let i = 0; i < base.days.length; i++) assert.equal(next.days[i], base.days[i]);
  assert.deepEqual(next.bookings, base.bookings);
});

test('A-77 Part 10 residue 4: an undeclared key on a record does not survive the door', () => {
  const { trip } = baseTrip();
  const next = Bookings.upsertBooking(trip, { ...GOOD_BOOKING, smuggled: 'x' } as unknown as Booking);
  assert.equal('smuggled' in next.bookings[0], false);
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 9 — `ensureDays` preserves day identity, so a range change re-parses only what it minted.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 9: a range change keeps every unchanged day by object identity', () => {
  const { trip, c } = baseTrip();
  const before = trip.days.slice();
  const wider = CreateTripMod.setTripMeta(trip, { endDate: '2026-03-06' }, c);
  for (let i = 0; i < before.length; i++) {
    assert.deepEqual(wider.days[i], before[i], `day ${i} was rewritten by a range change`);
  }
  assert.equal(wider.days.length, 6);
});

test('A-77 Part 9: ensureDays does not rebuild a day whose id already equals its date', () => {
  const { trip } = baseTrip();
  const same = DaysMod.ensureDays(trip, ctx('x'));
  // `commit` substitutes nothing it did not have to, so an untouched day is the same object it
  // was — which is the property the 3,653-day budget is bought with.
  for (let i = 0; i < trip.days.length; i++) assert.equal(same.days[i], trip.days[i]);
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 4 — the two guards that are NOT the parser, and the one that is deleted.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 4: assertDatePrecision is DELETED, and the refusal it made is the parser\'s now', () => {
  const { trip, c } = baseTrip();
  assert.throws(
    () => CreateTripMod.setTripMeta(trip, { datePrecision: 'fortnight' as never }, c),
    /setTripMeta: this trip cannot be stored — .*\$\.datePrecision/s,
  );
  assert.throws(
    () => CreateTripMod.createTrip({ title: 'x', startDate: '2026-03-01', endDate: '2026-03-02', datePrecision: 'fortnight' as never, cities: [] }, ctx()),
    /createTrip: this trip cannot be stored — .*\$\.datePrecision/s,
  );
  assert.doesNotThrow(() => CreateTripMod.setTripMeta(trip, { datePrecision: 'month' }, c));
});

/**
 * **A-78 Part 3 (QA R56-3) — this test's RULING changed, so the test is rewritten, not deleted.**
 *
 * A-77 Part 4 kept `isIsoDate` at both trip doors and gave a reason that is **false against the
 * code**: §2.9 **A-45** had already made `isIsoDate` the parser's *own* date check
 * (`fromJSON.ts`'s `isoDate` calls it), the two predicates return identical verdicts on all 19
 * values round 56 drove through both, and there is no value at which the door is stricter than the
 * document. That is R16-2's *one property, two guards*, and A-77 deleted `assertDatePrecision` one
 * table row above for exactly this reason.
 *
 * The only reason the measurement left open was **ordering** — the ground `assertBuiltAttach`
 * survives on — and it is empty: **both doors commit the envelope BEFORE minting days.**
 * `createTrip` runs `commit('createTrip', null, base)` and only then `ensureDays`; `setTripMeta`
 * runs `commit('setTripMeta', trip, next)` and only then the conditional `ensureDays`. So a
 * calendar-invalid date is refused by `parseTripEnvelope` at `$.startDate` **before** A-35's span
 * cap can produce its misleading *"this trip would cover N days"* message.
 *
 * **Both call sites are deleted.** `isIsoDate` itself is untouched — it is on §2.10's surface and
 * seven other modules call it, `fromJSON` included.
 */
test('A-78 Part 3 (R56-3): isIsoDate is DELETED at both trip doors, and the refusal is the parser\'s own', () => {
  for (const bad of ['2026-13-45', '2026-02-30', '2026-00-10', '2026-04-31', '2026-02-29']) {
    assert.throws(
      () => CreateTripMod.createTrip({ title: 'x', startDate: bad, endDate: '2026-03-02', cities: [] }, ctx()),
      (err: unknown) => {
        const msg = (err as Error).message;
        assert.ok(
          msg.startsWith('createTrip: this trip cannot be stored — '),
          `the refusal is not the storability refusal: ${msg}`,
        );
        assert.ok(msg.includes('expected a real calendar date in YYYY-MM-DD'), msg);
        assert.ok(msg.includes('$.startDate'), `the refusal does not name the field: ${msg}`);
        // A-35's span cap must NOT be what fires: `2026-13-45` rolls through Date.UTC into
        // 2027-02-14, and the misleading message is *"this trip would cover N days"*.
        assert.ok(!msg.includes('would cover'), `A-35's span cap pre-empted the parser: ${msg}`);
        return true;
      },
      `createTrip accepted ${bad}`,
    );
  }
  const { trip, c } = baseTrip();
  assert.throws(
    () => CreateTripMod.setTripMeta(trip, { endDate: '2026-13-45' }, c),
    (err: unknown) => {
      const msg = (err as Error).message;
      assert.ok(msg.startsWith('setTripMeta: this trip cannot be stored — '), msg);
      assert.ok(msg.includes('expected a real calendar date in YYYY-MM-DD'), msg);
      assert.ok(msg.includes('$.endDate'), msg);
      return true;
    },
  );
  // The doors keep NO second date opinion — not merely a weaker one. `isIsoDate` is CALLED
  // nowhere in this file any more (the docstrings still name it, which is why this matches a call
  // and not the word), and `build/` is left with exactly one guard that is not the parser.
  const source = readFileSync(resolve(SRC, 'build/createTrip.ts'), 'utf8');
  assert.equal(
    /isIsoDate\s*\(/.test(source), false,
    'createTrip.ts still calls a date predicate of its own — A-78 Part 3 deletes both call sites',
  );
});

test('A-78 Part 3: both doors\' `endDate < startDate` check STAYS — ordering is a property the parser deliberately does not have', () => {
  const { trip, c } = baseTrip();
  assert.throws(
    () => CreateTripMod.createTrip({ title: 'x', startDate: '2026-03-05', endDate: '2026-03-02', cities: [] }, ctx()),
    /createTrip: endDate 2026-03-02 precedes startDate 2026-03-05/,
  );
  assert.throws(
    () => CreateTripMod.setTripMeta(trip, { endDate: '2026-02-01' }, c),
    /setTripMeta: endDate 2026-02-01 precedes startDate 2026-03-01/,
  );
  // …and the reversed document itself OPENS. `validateTrip` is what reports it (§2.9).
  const reversed = { ...trip, startDate: '2026-03-03', endDate: '2026-03-01' };
  assert.doesNotThrow(() => fromJSON(toJSON(reversed as Trip)));
});

test('A-77 Part 4: assertBuiltAttach is KEPT, and still runs BEFORE commit', () => {
  const { trip, c } = baseTrip();
  assert.throws(
    () => PhotosMod.addPhoto(trip, { attach: { kind: 'place', placeId: 'pl-1' }, caption: 42 as unknown as string, thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c),
    /attaching a photo to a place is not built/,
    'the storability refusal pre-empted the deferral message',
  );
});

test('A-77 Part 4: the three per-field guards A-76 deleted are still gone', () => {
  for (const name of ['assertParticipantKind', 'assertDisplayName', 'assertNote']) {
    assert.equal(name in (ParticipantsMod as unknown as Record<string, unknown>), false);
  }
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 10 residue 1 — agreement, not strictness. The doors must still accept everything the
// parser accepts, or the mechanism has become a second validator.
// ---------------------------------------------------------------------------------------------

test('A-77 residue 1: a legal edit at every checked door still succeeds', () => {
  const { trip, c, stopId } = tripWithStop();
  assert.doesNotThrow(() => StopsMod.updateStop(trip, stopId, { name: 'Belvedere Palace' }));
  assert.doesNotThrow(() => StopsMod.moveStop(trip, stopId, { kind: 'pool', cityKey: 'wien' }));
  assert.doesNotThrow(() => StopsMod.reorderStop(trip, stopId, 0));
  assert.doesNotThrow(() => StopsMod.removeStop(trip, stopId));
  assert.doesNotThrow(() => DaysMod.setDayMeta(trip, '2026-03-01', { title: 'Arrival', legacyFlag: true }));
  assert.doesNotThrow(() => StopsMod.addPlace(trip, GOOD_PLACE));
  assert.doesNotThrow(() => Bookings.upsertBooking(trip, GOOD_BOOKING));
  assert.doesNotThrow(() => PhotosMod.addPhoto(trip, { thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c));
  assert.doesNotThrow(() => ParticipantsMod.addParticipant(trip, { displayName: 'Marta', kind: 'contact' }, c));
  assert.doesNotThrow(() => CreateTripMod.setTripMeta(trip, { title: 'Renamed' }, c));
  assert.doesNotThrow(() => Candidates.acceptCandidate(trip, { kind: 'stop', id: stopId }, 'local:self', '2026-03-02'));
  assert.doesNotThrow(() => ResolveMod.resolveConflict(trip, { conflictId: 'c-1', state: 'dismissed', by: 'local:self', at: '2026-03-01' }));
});

test('A-77 residue 1: a committed document round-trips through toJSON/fromJSON unchanged', () => {
  const { trip, c, stopId } = tripWithStop();
  const edited = DaysMod.setDayMeta(
    Bookings.upsertBooking(StopsMod.updateStop(trip, stopId, { name: 'Belvedere Palace' }), GOOD_BOOKING),
    '2026-03-01', { title: 'Arrival' },
  );
  assert.deepEqual(fromJSON(toJSON(edited)), edited);
});

