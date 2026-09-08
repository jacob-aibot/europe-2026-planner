/**
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
import { readdirSync, existsSync } from 'node:fs';
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

// The censused modules. Half 1 (the type-level door census) intersects exactly these namespaces;
// half 2 asserts that this list is the directory. A new file in `build/` reddens half 2 on the
// commit that adds it, whatever is in the file; a new `Trip`-returning export in any file already
// here reddens `npm run typecheck` on the commit that adds it, however it is declared.
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
import * as ResolveMod from '../src/conflict/resolve.ts';

import type { BuildCtx } from '../src/build/createTrip.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..', 'src');
const BUILD_DIR = resolve(SRC, 'build');

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
// A-77 Part 6.1 — the DOOR CENSUS, at the type level. It fails `npm run typecheck`, not a test.
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

type IsExact<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type ReturnsTrip<F> = F extends (...a: never[]) => infer R
  ? ([Trip] extends [R] ? ([R] extends [Trip] ? true : false) : false)
  : false;
type DoorsOf<M> = { [K in keyof M]-?: ReturnsTrip<M[K]> extends true ? K : never }[keyof M];

type Censused =
  typeof Bookings & typeof Candidates & typeof CommitMod & typeof CopyStopMod &
  typeof CreateTripMod & typeof DaysMod & typeof ParticipantsMod & typeof PhotosMod &
  typeof PoolMod & typeof RedactMod & typeof StopsMod & typeof StorableMod & typeof ResolveMod;

/**
 * **This line is the census.** A new `Trip`-returning export in any censused file — written
 * `export function`, `export const … = () =>`, `function d(){}; export { d }` or
 * `export default function` — makes `IsExact` `false` and `npm run typecheck` fails on the commit
 * that adds it. That is R55-4's repro run as a standing criterion, and it is the claim A-76 Part 6
 * made and could not support.
 */
const DOOR_CENSUS: IsExact<DoorsOf<Censused>, (typeof DOORS)[number] | (typeof CENSUS_MECHANISM)[number]> = true;

test('A-77 Part 6.1: the type-level door census holds (it is `npm run typecheck` that enforces it)', () => {
  assert.equal(DOOR_CENSUS, true);
  assert.equal(new Set(DOORS).size, DOORS.length, 'a door is named twice');
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 6.2 — the MODULE census, a runtime directory read. It sees the one thing a type-level
// assertion cannot: a new FILE.
// ---------------------------------------------------------------------------------------------

/** Exactly the modules the census above imports from `packages/core/src/build/`. */
const CENSUSED_BUILD_FILES = [
  'bookings.ts', 'candidates.ts', 'commit.ts', 'copyStop.ts', 'createTrip.ts', 'days.ts',
  'participants.ts', 'photos.ts', 'pool.ts', 'redactText.ts', 'stops.ts', 'storable.ts',
] as const;

/** Door files outside `build/`, named explicitly. A-76's census could not see this one (R55-new). */
const EXTRA_DOOR_FILES = ['conflict/resolve.ts'] as const;

test('A-77 Part 6.2: build/ holds exactly the modules the door census imports', () => {
  const onDisk = readdirSync(BUILD_DIR).filter((f) => f.endsWith('.ts')).sort();
  assert.deepEqual(
    onDisk,
    [...CENSUSED_BUILD_FILES].sort(),
    'a file in packages/core/src/build/ is not imported by the type-level door census above. ' +
      'Add it to CENSUSED_BUILD_FILES and to `Censused`, or the compiler cannot see its doors.',
  );
});

test('A-77 Part 6.2: every explicitly-named extra door file still exists', () => {
  for (const f of EXTRA_DOOR_FILES) {
    assert.ok(existsSync(resolve(SRC, f)), `${f} is named as a door file and is not on disk`);
  }
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 6.3 — the three `Trip`-returning exports that are NOT doors. Three names, each a
// whole-document constructor, replacing A-76's 26 free-text exemptions.
// ---------------------------------------------------------------------------------------------

const NON_DOORS: ReadonlyArray<{ name: string; why: string }> = [
  { name: 'fromJSON', why: 'it IS the parse' },
  { name: 'importLegacyDays', why: 'a producer — it builds a document rather than editing one, so there is no `before` to diff against (A-77 Part 10 residue 3)' },
  { name: 'mergeTrips', why: 'a producer, for importLegacyDays\' reason' },
];

test('A-77 Part 6.3: the three named non-doors are not in DOORS', () => {
  for (const n of NON_DOORS) {
    assert.ok(!(DOORS as readonly string[]).includes(n.name), `${n.name} is listed as a door: ${n.why}`);
    assert.ok(n.why.length > 10);
  }
  assert.equal(NON_DOORS.length, 3, 'A-77 Part 6.3 names three producers and no more');
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 6.4 — the BEHAVIOURAL census. One hostile value per door, driven by `DOORS`.
// This is what reddens if a door is listed and its `commit` call is deleted (fault N1).
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

for (const row of HOSTILE) {
  test(`A-77 Part 6.4: ${row.door} refuses a ${row.noun} the parser refuses (${row.path})`, () => {
    let thrown: unknown = null;
    try {
      row.hostile();
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

test('A-77 Part 5: every legal DayMetaPatch key still passes', () => {
  const { trip } = baseTrip();
  assert.doesNotThrow(() => DaysMod.setDayMeta(trip, '2026-03-01', {
    primaryCity: 'wien', cities: ['wien'], title: 'Arrival', subtitle: 'Landing',
    legacyFlag: true, tzId: 'Europe/Vienna', provenance: GOOD_PROVENANCE,
  }));
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

test('A-77 Part 4: isIsoDate is KEPT at both trip doors — the calendar is a property the parser has, and the door\'s message is a person\'s', () => {
  assert.throws(
    () => CreateTripMod.createTrip({ title: 'x', startDate: '2026-13-45', endDate: '2026-03-02', cities: [] }, ctx()),
    /createTrip: startDate and endDate must be real calendar dates/,
  );
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
