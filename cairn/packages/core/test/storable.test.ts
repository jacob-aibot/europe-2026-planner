/**
 * §2.1 **A-76** — *a build door asks the parser what a record may hold; it does not keep a second
 * opinion.* ROADMAP **I-15**, from QA **R54-1**.
 *
 * Round 54's breaker drove eight build doors through the real store and measured the same harm at
 * each: a value `fromJSON` refuses is accepted at the door, `toJSON` serialises it, `persistence`
 * reports `'idle'` (the state the UI renders as **Saved**) — and the stored bytes can never be
 * parsed again. The whole document goes, not the field.
 *
 * A-76 refuses the eight per-field guards that finding's routing anticipated (Part 2: *"it is the
 * enumeration, and the enumeration is the defect"* — the architect found two more unguarded fields
 * while writing the ruling) and replaces them with one mechanism: `build/storable.ts`'s
 * `assertStorable`, which hands the record the door just wrote to **`fromJSON`'s own per-record
 * parser**. Agreement with the parser is the invariant, not strictness.
 *
 * This file is A-76 **Part 6**'s two standing censuses, and they do different jobs:
 *
 *   1. **The directory census** reads `packages/core/src/build/*.ts` from disk and asserts the set
 *      of `export function` names is equal **in both directions** to Part 5's checked rows plus its
 *      exempt rows. A new build function, or a new file in `build/`, reddens it on the commit that
 *      adds it — which is what makes a tenth unguarded door structurally impossible rather than
 *      merely currently absent. (A-76 Part 7 **M3**.)
 *   2. **The behavioural census** fires one hostile value at every checked door and asserts each
 *      throws, with the parser's own path in the message. This is what reddens if a door is in the
 *      table and its `assertStorable` call is deleted or was never written. (A-76 Part 7 **M1**.)
 *
 * It is **one hostile value per door, not per field** — per-field coverage is the mechanism's, by
 * construction, and needing no test is exactly the property A-76 bought.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  addStop, updateStop, moveStop, reorderStop,
  setDayMeta, upsertBooking, addPhoto, updatePhoto,
  addParticipant, updateParticipant, createTrip, setTripMeta, copyStopInto,
  sequentialIds, TripParseError,
} from '../src/index.ts';
import { addPlace } from '../src/build/stops.ts';
import { assertStorable } from '../src/build/storable.ts';
import type { BuildCtx, Booking, Place, Stop, Trip } from '../src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = resolve(HERE, '..', 'src', 'build');

// ---------------------------------------------------------------------------------------------
// A-76 Part 5's table, transcribed. This is the contract, and the two censuses below are driven
// from it rather than from a second list.
// ---------------------------------------------------------------------------------------------

type CheckedRow = {
  /** The door names on this row of Part 5's table. */
  doors: readonly string[];
  /** The record class the row hands to `assertStorable`. */
  kind: string;
  /** The JSON path `fromJSON` throws at for the hostile value below, rooted at the record. */
  path: string;
  /** The door the hostile call goes through, and the `where` its refusal must name. */
  where: string;
  /** One hostile call. It must throw. */
  hostile: () => unknown;
};

const ctx = (): BuildCtx => ({ ids: sequentialIds(), now: '2026-03-01', actorUserId: 'local:self' });

function baseTrip(): { trip: Trip; c: BuildCtx } {
  const c = ctx();
  const trip = createTrip(
    {
      id: 'trip-base',
      title: 'Storable',
      startDate: '2026-03-01',
      endDate: '2026-03-03',
      cities: [{ key: 'wien', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
    },
    c,
  );
  return { trip, c };
}

function tripWithStop(): { trip: Trip; c: BuildCtx; stopId: string } {
  const { trip, c } = baseTrip();
  const next = addStop(
    trip,
    { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
    { id: 'stop-1', name: 'Belvedere', category: 'sight' },
    c,
  );
  return { trip: next, c, stopId: 'stop-1' };
}

const GOOD_BOOKING: Booking = {
  id: 'bk-1',
  tripId: 'trip-base',
  kind: 'train',
  operator: 'ÖBB',
  reference: 'ABC123',
  startsAt: { date: '2026-03-01', time: '08:00' },
  price: null,
  party: 2,
  status: 'active',
  ticket: null,
  provenance: {
    source: 'user', state: 'accepted', confidence: 'confirmed',
    addedAt: '2026-03-01', acceptedAt: '2026-03-01', actorUserId: 'local:self',
  },
};

const GOOD_PLACE: Place = { id: 'pl-1', cityKey: 'wien', name: 'Belvedere', at: null, category: 'sight' };

const GOOD_DERIVATIVE = { w: 100, h: 80, bytes: 4096 };

/** A source document that is another person's — `copyStopInto`'s whole subject (§2.14). */
function foreignTrip(mutate: (t: Trip) => Trip): { trip: Trip; stopId: string } {
  const c = ctx();
  let trip = createTrip(
    {
      id: 'trip-friend',
      title: 'Marta',
      startDate: '2026-03-01',
      endDate: '2026-03-03',
      ownerId: 'user:marta',
      cities: [{ key: 'wien-m', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
    },
    c,
  );
  trip = addPlace(trip, { id: 'pl-m', cityKey: 'wien-m', name: 'Belvedere', at: { lat: 48.19, lng: 16.38 }, category: 'sight' });
  trip = addStop(
    trip,
    { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
    { id: 'stop-m', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'pl-m' } },
    c,
  );
  return { trip: mutate(trip), stopId: 'stop-m' };
}

/** Rewrites one field of the friend's stop behind a cast — the reachable producer A-76 Part 1 names. */
function withHostileSourceStop(field: string, value: unknown): (t: Trip) => Trip {
  return (t) => ({
    ...t,
    days: t.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => (s.id === 'stop-m' ? ({ ...s, [field]: value } as unknown as Stop) : s)),
    })),
  });
}

const CHECKED: readonly CheckedRow[] = [
  {
    doors: ['addStop'], kind: 'stop', path: '$.category', where: 'addStop',
    hostile: () => {
      const { trip, c } = baseTrip();
      return addStop(
        trip,
        { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
        { name: 'Bus', category: 'transport' as unknown as Stop['category'] },
        c,
      );
    },
  },
  {
    doors: ['updateStop'], kind: 'stop', path: '$.category', where: 'updateStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return updateStop(trip, stopId, { category: 'transport' as unknown as Stop['category'] });
    },
  },
  {
    // `reorderStop` delegates to `moveStop` and needs no call of its own — Part 5's own note.
    // The `StopPlacement` ARGUMENT, which `parsePlacement` reads through `oneOf`/`str` and which
    // round 54's census did not name — A-76 Part 2(a)'s second uncounted field.
    doors: ['moveStop', 'reorderStop'], kind: 'stop', path: '$.placement.cityKey', where: 'moveStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return moveStop(trip, stopId, { kind: 'pool', cityKey: 42 } as unknown as Stop['placement']);
    },
  },
  {
    doors: ['setDayMeta'], kind: 'day', path: '$.legacyFlag', where: 'setDayMeta',
    hostile: () => {
      const { trip } = baseTrip();
      return setDayMeta(trip, '2026-03-01', { legacyFlag: 'yes' as unknown as boolean });
    },
  },
  {
    doors: ['addPlace'], kind: 'place', path: '$.category', where: 'addPlace',
    hostile: () => {
      const { trip } = baseTrip();
      return addPlace(trip, { ...GOOD_PLACE, category: 'transport' as unknown as Place['category'] });
    },
  },
  {
    doors: ['upsertBooking'], kind: 'booking', path: '$.kind', where: 'upsertBooking',
    hostile: () => {
      const { trip } = baseTrip();
      return upsertBooking(trip, { ...GOOD_BOOKING, kind: 'spaceship' as unknown as Booking['kind'] });
    },
  },
  {
    doors: ['addPhoto', 'updatePhoto'], kind: 'photo', path: '$.caption', where: 'addPhoto',
    hostile: () => {
      const { trip, c } = baseTrip();
      return addPhoto(
        trip,
        { caption: 42 as unknown as string, thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE },
        c,
      );
    },
  },
  {
    doors: ['addParticipant', 'updateParticipant'], kind: 'participant', path: '$.kind', where: 'addParticipant',
    hostile: () => {
      const { trip, c } = baseTrip();
      return addParticipant(trip, { displayName: 'Marta', kind: 'goldfish' as never }, c);
    },
  },
  {
    doors: ['createTrip'], kind: 'city', path: '$.centre.lat', where: 'createTrip',
    hostile: () =>
      createTrip(
        {
          title: 'T', startDate: '2026-03-01', endDate: '2026-03-03',
          cities: [{ name: 'Vienna', centre: { lat: 'north' as unknown as number, lng: 16.37 } }],
        },
        ctx(),
      ),
  },
  {
    doors: ['setTripMeta'], kind: 'city', path: '$.centre.lat', where: 'setTripMeta',
    hostile: () => {
      const { trip, c } = baseTrip();
      return setTripMeta(
        trip,
        { cities: [{ key: 'wien', name: 'Vienna', countryCode: 'AT', order: 0, centre: { lat: 'north' as unknown as number, lng: 16.37 } }] },
        c,
      );
    },
  },
  {
    doors: ['copyStopInto'], kind: 'stop', path: '$.category', where: 'copyStopInto',
    hostile: () => {
      const { trip: target, c } = baseTrip();
      const { trip: src, stopId } = foreignTrip(withHostileSourceStop('category', 'transport'));
      return copyStopInto(
        target,
        { trip: src, stopId },
        { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
        { ids: c.ids, today: '2026-03-01', actorUserId: 'local:self' },
      );
    },
  },
  {
    // The same door's second record class — Part 5 names both, so both are fired.
    doors: ['copyStopInto'], kind: 'place', path: '$.category', where: 'copyStopInto',
    hostile: () => {
      const { trip: target, c } = baseTrip();
      const { trip: src, stopId } = foreignTrip((t) => ({
        ...t,
        places: t.places.map((p) => ({ ...p, category: 'transport' } as unknown as Place)),
      }));
      return copyStopInto(
        target,
        { trip: src, stopId },
        { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
        { ids: c.ids, today: '2026-03-01', actorUserId: 'local:self' },
      );
    },
  },
];

/**
 * Part 5's **exempt** rows, each carrying its stated reason as a string — Part 6 requires the
 * reason to be in the test, because an exemption nobody can read is an omission.
 */
const EXEMPT_TABLE: ReadonlyArray<{ name: string; reason: string }> = [
  { name: 'makeStop', reason: 'returns a Stop rather than a Trip, and every caller of it is a door in this table — a check here would be the same check twice' },
  { name: 'ensureDays', reason: 're-arranges days it was handed; reads no caller value into a record field. Keeps A-35\'s span cap, which is a different property' },
  { name: 'blankDay', reason: 'writes literals and a userProvenance; reads no caller value into a record field' },
  { name: 'supersedeBooking', reason: 'writes a field of a booking already in the trip from a value core itself chose (\'superseded\')' },
  { name: 'linkBooking', reason: 'writes a field of a booking already in the trip from an id checked for existence' },
  { name: 'removePhoto', reason: 'it removes — no caller value reaches a record field' },
  { name: 'removeStop', reason: 'it removes — no caller value reaches a record field' },
  { name: 'removeParticipant', reason: 'it removes — no caller value reaches a record field' },
  { name: 'reattachDanglingPhotos', reason: 'rewrites attach to the literal {kind:\'trip\'}' },
  { name: 'acceptCandidate', reason: 'writes a Provenance core constructs from its own literals' },
  { name: 'rejectCandidate', reason: 'writes a Provenance core constructs from its own literals' },
];

/**
 * `build/`'s remaining exports, which A-76 Part 5's table does not name. They are classified here
 * under **Part 2's stated rule** — *"A build function that writes no record field is exempt and
 * says so in the census"* — because Part 6's set equality is over the **directory**, and the
 * directory holds these fifteen as well as the table's twenty-four. Every one is a pure query, a
 * pure transform of records already in the document, or a delegation to a door above.
 *
 * A function moved OUT of this list and into `CHECKED` is a real change; a function ADDED here to
 * silence the census is the failure mode Part 6 exists to make visible, so each carries its reason.
 */
const EXEMPT_UNTABLED: ReadonlyArray<{ name: string; reason: string }> = [
  { name: 'assertStorable', reason: 'the mechanism itself (build/storable.ts) — it writes nothing' },
  { name: 'compareStops', reason: 'pure comparator; returns a number' },
  { name: 'insertionIndex', reason: 'pure query; returns an index' },
  { name: 'reindex', reason: 'rewrites placement.order to match array position from core\'s own counter; writes no caller value' },
  { name: 'findStop', reason: 'pure lookup; returns a Stop or null' },
  { name: 'cityOfStop', reason: 'pure lookup; returns a CityKey or null' },
  { name: 'findDay', reason: 'pure lookup; returns a Day or null' },
  { name: 'stopsForBooking', reason: 'pure query; returns Stop[]' },
  { name: 'requireActor', reason: 'argument guard; returns a UserId and writes nothing' },
  { name: 'pickDay', reason: 'pure query; returns a DayId or null' },
  { name: 'poolFor', reason: 'pure query; returns Stop[]' },
  { name: 'returnToPool', reason: 'delegates to moveStop, which is checked' },
  { name: 'scheduleFromPool', reason: 'delegates to moveStop, which is checked' },
  { name: 'redactText', reason: 'string transform; writes no record' },
  { name: 'redactionHits', reason: 'string query; writes no record' },
];

const EXEMPT = [...EXEMPT_TABLE, ...EXEMPT_UNTABLED];

// ---------------------------------------------------------------------------------------------
// 1. The directory census (A-76 Part 6 item 1; fault M3).
// ---------------------------------------------------------------------------------------------

/** Every `export function` name in `packages/core/src/build/*.ts`, read from disk. */
function buildDirExports(): string[] {
  const names: string[] = [];
  for (const file of readdirSync(BUILD_DIR).filter((f) => f.endsWith('.ts')).sort()) {
    const src = readFileSync(resolve(BUILD_DIR, file), 'utf8');
    for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) names.push(m[1]);
  }
  return names.sort();
}

test('A-76 Part 6.1: every exported function in build/ is either checked by assertStorable or exempt with a reason', () => {
  const onDisk = new Set(buildDirExports());
  const classified = new Set<string>([...CHECKED.flatMap((r) => r.doors), ...EXEMPT.map((e) => e.name)]);

  const unclassified = [...onDisk].filter((n) => !classified.has(n));
  assert.deepEqual(
    unclassified,
    [],
    `A-76 Part 5's table does not classify these exported build functions: ${unclassified.join(', ')}. ` +
      'A new build door must either call assertStorable or be listed exempt with its reason.',
  );

  const stale = [...classified].filter((n) => !onDisk.has(n));
  assert.deepEqual(stale, [], `classified but no longer in build/: ${stale.join(', ')}`);
});

test('A-76 Part 6.1: the census is set equality in both directions, not a subset check', () => {
  const onDisk = buildDirExports();
  const classified = [...CHECKED.flatMap((r) => r.doors), ...EXEMPT.map((e) => e.name)].sort();
  // A door named twice in the table (copyStopInto carries two record classes) is one door.
  assert.deepEqual([...new Set(classified)].sort(), [...new Set(onDisk)].sort());
});

test('A-76 Part 6.1: every exempt row carries a non-empty reason', () => {
  for (const e of EXEMPT) assert.ok(e.reason.length > 10, `${e.name} has no stated reason`);
});

// ---------------------------------------------------------------------------------------------
// 2. The behavioural census (A-76 Part 6 item 2; fault M1).
// ---------------------------------------------------------------------------------------------

for (const row of CHECKED) {
  test(`A-76 Part 6.2: ${row.where} refuses a ${row.kind} the parser refuses (${row.path})`, () => {
    let thrown: unknown = null;
    try {
      row.hostile();
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown !== null, `${row.where} accepted a ${row.kind} fromJSON refuses at ${row.path}`);
    assert.ok(thrown instanceof Error, `${row.where} threw a non-Error`);
    // A-76 Part 3's one hard prohibition: never a TripParseError. That type means "this STORED
    // document is unopenable" to store.ts and to §2.9 A-47's noteOpenFailure, and raising one from
    // a build door would put a live, healthy document into the unreadable-row path.
    assert.ok(
      !(thrown instanceof TripParseError),
      `${row.where} threw a TripParseError — A-76 Part 3 forbids it; a door throws a plain Error`,
    );
    const msg = (thrown as Error).message;
    assert.ok(msg.includes(row.where), `refusal does not name the door: ${msg}`);
    assert.ok(msg.includes(row.path), `refusal does not carry the parser's path ${row.path}: ${msg}`);
  });
}

// ---------------------------------------------------------------------------------------------
// 3. `assertStorable` itself.
// ---------------------------------------------------------------------------------------------

test('A-76 Part 3: assertStorable accepts a record the parser accepts', () => {
  assert.doesNotThrow(() => assertStorable('t', 'place', GOOD_PLACE));
  assert.doesNotThrow(() => assertStorable('t', 'booking', GOOD_BOOKING));
});

test('A-76 Part 3: assertStorable rethrows a plain Error, never a TripParseError', () => {
  let thrown: unknown = null;
  try {
    assertStorable('doorName', 'place', { ...GOOD_PLACE, category: 'transport' as unknown as Place['category'] });
  } catch (err) {
    thrown = err;
  }
  assert.ok(thrown instanceof Error);
  assert.ok(!(thrown instanceof TripParseError));
  const msg = (thrown as Error).message;
  assert.match(msg, /^doorName: this place cannot be stored — /);
  assert.ok(msg.includes('$.category'));
  assert.ok(msg.includes('cannot be re-opened'));
});

test('A-76 Part 3: assertStorable refuses a required field spread away as undefined (R52-2, for every record class)', () => {
  assert.throws(
    () => assertStorable('doorName', 'participant', { id: 'p1', displayName: undefined as unknown as string, kind: 'contact', userId: null }),
    /doorName: this participant cannot be stored/,
  );
});

// ---------------------------------------------------------------------------------------------
// 4. The two guards A-76 Part 4 KEEPS, and the three it deletes.
// ---------------------------------------------------------------------------------------------

test('A-76 Part 4: assertDatePrecision is kept — a trip-level scalar has no record class to ask', () => {
  const { trip, c } = baseTrip();
  assert.throws(
    () => setTripMeta(trip, { datePrecision: 'fortnight' as never }, c),
    /datePrecision must be one of/,
  );
});

test('A-76 Part 4: assertBuiltAttach is kept — the one door legitimately stricter than the parser', () => {
  const { trip, c } = baseTrip();
  assert.throws(
    () => addPhoto(trip, { attach: { kind: 'place', placeId: 'pl-1' }, thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c),
    /attaching a photo to a place is not built/,
  );
});

test('A-76 Part 4: the three subsumed second guards are gone from build/participants.ts', () => {
  const src = readFileSync(resolve(BUILD_DIR, 'participants.ts'), 'utf8');
  // Declarations and call sites, not mentions: the file keeps a tombstone paragraph naming all
  // three and saying which parser subsumed each, which is the record of the deletion and not
  // the guard.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const name of ['assertParticipantKind', 'assertDisplayName', 'assertNote']) {
    assert.ok(!code.includes(name), `${name} is still live in build/participants.ts — A-76 Part 4 deletes it`);
  }
  // And the file no longer needs the member list it used to keep a copy of the check against.
  assert.ok(!code.includes('PARTICIPANT_KINDS'), 'build/participants.ts still reads PARTICIPANT_KINDS');
});

test('A-76 Part 4: createTrip.ts holds no private DATE_PRECISIONS copy (§2.9 A-20)', () => {
  const src = readFileSync(resolve(BUILD_DIR, 'createTrip.ts'), 'utf8');
  assert.ok(
    !/const\s+DATE_PRECISIONS/.test(src),
    'build/createTrip.ts still declares its own DATE_PRECISIONS — import the one model/types.ts exports',
  );
});

// ---------------------------------------------------------------------------------------------
// 5. Agreement, not strictness (A-76 Part 8 residue 1) — the doors must still accept everything
//    the parser accepts, or the mechanism has become a second validator.
// ---------------------------------------------------------------------------------------------

test('A-76 Part 8.1: a legal edit at every checked door still succeeds', () => {
  const { trip, c, stopId } = tripWithStop();
  assert.doesNotThrow(() => updateStop(trip, stopId, { name: 'Belvedere Palace' }));
  assert.doesNotThrow(() => moveStop(trip, stopId, { kind: 'pool', cityKey: 'wien' }));
  assert.doesNotThrow(() => reorderStop(trip, stopId, 0));
  assert.doesNotThrow(() => setDayMeta(trip, '2026-03-01', { title: 'Arrival', legacyFlag: true }));
  assert.doesNotThrow(() => addPlace(trip, GOOD_PLACE));
  assert.doesNotThrow(() => upsertBooking(trip, GOOD_BOOKING));
  assert.doesNotThrow(() => addPhoto(trip, { thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c));
  assert.doesNotThrow(() => addParticipant(trip, { displayName: 'Marta', kind: 'contact' }, c));
  assert.doesNotThrow(() => setTripMeta(trip, { title: 'Renamed' }, c));
});

test('A-76 Part 5 elision: setDayMeta edits a day that already holds an unparseable stop', () => {
  // The elision is what stops a door refusing an edit because of data it did not write. `DayMetaPatch`
  // cannot carry `stops`, so the merged Day is checked with `stops: []`.
  const { trip, stopId } = tripWithStop();
  const poisoned: Trip = {
    ...trip,
    days: trip.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => (s.id === stopId ? ({ ...s, category: 'transport' } as unknown as Stop) : s)),
    })),
  };
  assert.doesNotThrow(() => setDayMeta(poisoned, '2026-03-01', { title: 'Arrival' }));
});

test('A-76 Part 5: updatePhoto and updateParticipant are checked, not only their add- siblings', () => {
  const { trip, c } = baseTrip();
  const withPhoto = addPhoto(trip, { id: 'ph-1', thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
  assert.throws(
    () => updatePhoto(withPhoto, 'ph-1', { caption: 42 as unknown as string }),
    /updatePhoto: this photo cannot be stored/,
  );
  const withParticipant = addParticipant(trip, { displayName: 'Marta' }, c);
  const pid = withParticipant.participants[0].id;
  assert.throws(
    () => updateParticipant(withParticipant, pid, { kind: 'goldfish' as never }),
    /updateParticipant: this participant cannot be stored/,
  );
});

test('A-76 Part 5: upsertBooking now refuses the missing-startsAt case at the door', () => {
  const { trip } = baseTrip();
  const { startsAt, ...noStart } = GOOD_BOOKING;
  assert.throws(
    () => upsertBooking(trip, noStart as unknown as Booking),
    /upsertBooking: this booking cannot be stored/,
  );
});
