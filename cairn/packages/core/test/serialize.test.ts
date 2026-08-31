/**
 * `fromJSON`'s hostile-input surface — ROADMAP F's last criterion, and F-12.
 *
 * *"`fromJSON` rejects unknown enum values and non-numeric coordinates:
 * `category:'nuclear'`, `source:'nsa'`, `kind:'telepathic'`, `lat:'33.9425'`, `lat:1e999`."*
 *
 * The review reported all five as ACCEPTED. They are not — `oneOf` and `numOf` reject every
 * one, and this file pins that so the finding cannot be true again without a red test. Where
 * the review was right is the domain edges below: an in-range NUMBER that is not a legal
 * coordinate, and a `YYYY-MM-DD`-shaped string that is not a date. Those are caught by
 * `validateTrip`, not by the parser, and the split is deliberate — see the last two tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { europe2026 } from './fixture.ts';
import { fromJSON, toJSON, validateTrip, TripParseError } from '../src/index.ts';

type Doc = Record<string, unknown>;
const doc = (): Doc => JSON.parse(toJSON(europe2026().trip)) as Doc;

function mutated(fn: (d: any) => void): string {
  const d = doc();
  fn(d);
  return JSON.stringify(d);
}

const REJECTED: Array<[string, (d: any) => void, RegExp]> = [
  ["category:'nuclear'", (d) => { d.days[1].stops[0].category = 'nuclear'; }, /category/],
  ["provenance.source:'nsa'", (d) => { d.days[1].stops[0].provenance.source = 'nsa'; }, /source/],
  ["ticket kind:'telepathic'", (d) => { d.days.flat().flatMap((x: any) => x.stops).find((s: any) => s.ticket).ticket.kind = 'telepathic'; }, /kind/],
  ["lat as a string", (d) => { d.places[0].at.lat = '33.9425'; }, /lat/],
  ["lat: 1e999 (Infinity)", (d) => { d.places[0].at.lat = 1e999; }, /lat/],
  ["travelRole:'teleport'", (d) => { d.days[1].stops[0].travelRole = 'teleport'; }, /travelRole/],
  ["arrival.mode:'jetpack'", (d) => { d.days[1].stops[1].arrival = { mode: 'jetpack', mins: 5 }; }, /mode/],
  ["resolution state:'bogus'", (d) => { d.resolutions = [{ conflictId: 'x', state: 'bogus', by: 'u', at: '2026-01-01' }]; }, /state/],
  ["money basis:'per_dog'", (d) => { const s = d.days.flatMap((x: any) => x.stops).find((y: any) => y.cost); s.cost.amounts[0].basis = 'per_dog'; }, /basis/],
  ["booking status:'schrodinger'", (d) => { d.bookings[0].status = 'schrodinger'; }, /status/],
  ["placement kind:'floating'", (d) => { d.days[1].stops[0].placement = { kind: 'floating' }; }, /placement/],
  ["place link kind:'quantum'", (d) => { d.days[1].stops[0].place = { kind: 'quantum' }; }, /place/],
  ["revision as a string", (d) => { d.revision = '7'; }, /revision/],
  ["days not an array", (d) => { d.days = { '0': {} }; }, /days/],
];

for (const [label, mutate, path] of REJECTED) {
  test(`fromJSON rejects ${label}, with a JSON path`, () => {
    assert.throws(
      () => fromJSON(mutated(mutate)),
      (e: Error) => {
        assert.equal(e.name, 'TripParseError', `${label} threw ${e.name}`);
        assert.match((e as TripParseError).path, path, `path was "${(e as TripParseError).path}"`);
        return true;
      },
    );
  });
}

// ---------------------------------------------------------------------------
// R17-3 (QA round 17) — `clockOrNull`'s `HH:MM` refusal, which had no test at all.
//
// Deleting `if (s !== '' && !isClockTime(s)) throw …` left 593/593 green at `909b4a3` and
// 583/583 at `69f551c`, so this is **pre-existing** rather than something A-20 introduced —
// A-20 only moved the line onto the shared predicate (`model/openingHours.ts`). The
// consequence is measurable and there is nothing downstream to catch it: with the line gone,
// `fromJSON` accepts `placement.time: 'PIN 0754'`, `validateTrip` reports nothing about it,
// and a stop time that is not a time reaches every consumer of `timeVal`/`compareStops`.
//
// `clockOrNull` guards three fields, so all three are pinned here rather than just the one the
// finding named — the two `Booking` ones would otherwise carry the same hole.
// ---------------------------------------------------------------------------

const NOT_A_CLOCK: Array<[string, (d: any) => void, string]> = [
  ["placement.time: 'PIN 0754'", (d) => { d.days[1].stops[0].placement.time = 'PIN 0754'; }, '$.days[1].stops[0].placement.time'],
  ["placement.time: '9:0'", (d) => { d.days[1].stops[0].placement.time = '9:0'; }, '$.days[1].stops[0].placement.time'],
  ["placement.time: '17:00 '", (d) => { d.days[1].stops[0].placement.time = '17:00 '; }, '$.days[1].stops[0].placement.time'],
  ["booking startsAt.time", (d) => { d.bookings[0].startsAt.time = 'GYGG45MLA9Q9'; }, '$.bookings[0].startsAt.time'],
];

test('R17-3: fromJSON refuses a placement.time that is not a clock time, at its own path', () => {
  for (const [label, mutate, path] of NOT_A_CLOCK) {
    assert.throws(
      () => fromJSON(mutated(mutate)),
      (e: Error) => {
        assert.equal(e.name, 'TripParseError', `${label} threw ${e.name}`);
        assert.equal((e as TripParseError).path, path, `${label}: path was "${(e as TripParseError).path}"`);
        assert.match(e.message, /HH:MM/, `${label}: the refusal must say what it wanted`);
        return true;
      },
      `${label} was ACCEPTED — the only guard on Stop.placement.time is gone`,
    );
  }
});

test('R17-3: the refusal is not a wipe — a blank time and a legal one both still parse', () => {
  // `clockOrNull` allows `''` on purpose (A-20): a stop's time may be blank, and an opening
  // time is the field that must be a time. Both halves are asserted so that neither tightening
  // nor deleting the guard is a silent change.
  const blank = fromJSON(mutated((d) => { d.days[1].stops[0].placement.time = ''; }));
  assert.equal(blank.days[1].stops[0].placement.kind === 'scheduled'
    && blank.days[1].stops[0].placement.time, '');
  const legal = fromJSON(mutated((d) => { d.days[1].stops[0].placement.time = '9:05'; }));
  assert.equal(legal.days[1].stops[0].placement.kind === 'scheduled'
    && legal.days[1].stops[0].placement.time, '9:05');
  const absent = fromJSON(mutated((d) => { d.days[1].stops[0].placement.time = null; }));
  assert.equal(absent.days[1].stops[0].placement.kind === 'scheduled'
    && absent.days[1].stops[0].placement.time, null);
  // And nothing downstream re-checks it, which is why the parser is the only guard: measured,
  // not assumed — this is the sentence the finding rests on.
  assert.deepEqual(
    validateTrip(legal).filter((i) => JSON.stringify(i.params).includes('9:05')), [],
    'validateTrip says nothing about placement.time, so deleting the parser guard is unobserved',
  );
});

test('fromJSON rejects malformed and truncated JSON', () => {
  assert.throws(() => fromJSON('{ not json'), /./);
  assert.throws(() => fromJSON(toJSON(europe2026().trip).slice(0, 5000)), /./);
  assert.throws(() => fromJSON('null'), TripParseError);
  assert.throws(() => fromJSON('[]'), TripParseError);
});

test('prototype pollution through a document is not possible', () => {
  const text = mutated((d) => { d.days[1].stops[0].__proto__ = { polluted: true }; });
  const trip = fromJSON(text);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal((trip.days[1].stops[0] as Record<string, unknown>).polluted, undefined);
});

test('unicode and emoji survive a round trip byte-for-byte', () => {
  const { trip } = europe2026();
  const names = trip.days.flatMap((d) => d.stops).map((s) => s.name);
  assert.ok(names.some((n) => /Vyšehrad|Széchenyi|náměstí|Skradinski/.test(n)), 'the fixture must carry non-ascii');
  assert.equal(toJSON(fromJSON(toJSON(trip))), toJSON(trip));
});

// ---------------------------------------------------------------------------
// The two the review was right about — caught downstream, on purpose
// ---------------------------------------------------------------------------

test('a numerically valid but geographically impossible coordinate parses, and validateTrip catches it', () => {
  // §2.9: `lat_lng_out_of_range` is a genuine STRUCTURAL check and it lives in
  // `validateTrip`, not the parser. The parser's job is "is this the right shape"; refusing
  // to load a document because one pin is wrong would mean a user cannot open their trip to
  // fix it. So this is a split, not a gap — but it is a split, and it is written down.
  const trip = fromJSON(mutated((d) => { d.places[0].at.lat = 200; }));
  const issues = validateTrip(trip).filter((i) => i.code === 'lat_lng_out_of_range');
  // Two: the Place itself, and the stop that resolves its coordinate through it. Both are
  // records a user would have to look at, so both are reported.
  assert.ok(issues.length >= 1 && issues.length <= 3, `${issues.length} issues`);
  assert.ok(issues.some((i) => i.ref.kind === 'place'), 'the place must be named');
  for (const i of issues) assert.equal(i.level, 'error');
});

// ---------------------------------------------------------------------------
// A-45 (revision 30, ROADMAP I-8c) — the date is the one field the split above does NOT
// apply to, and the test that used to live here asserted the opposite.
//
// A-20: "`fromJSON` decides whether a document IS a `Trip`; `validateTrip` decides whether a
// `Trip` says something wrong." §2.1 A-32 states `IsoDate`'s domain — a real proleptic
// Gregorian date. `2026-02-30` is therefore not an `IsoDate`, so a document carrying one is
// not a `Trip`, so it is the parser's refusal and not `validateTrip`'s report. The local
// `isoDate()` helper hand-rolled `/^\d{4}-\d{2}-\d{2}$/`, which is the second copy of a
// predicate that `clockOrNull` six lines below it already calls out by name.
//
// This test is the one A-45 Part 4 names as legitimately moving. It previously read
// "a YYYY-MM-DD-shaped non-date parses, and validateTrip catches it — KD-12" and asserted
// `fromJSON` ACCEPTED `2026-02-30`; the `invalid_calendar_date` half of it is re-pointed at a
// `Trip` built directly, below, because that issue code is not deleted — it is defence in
// depth for objects that never met the parser.
// ---------------------------------------------------------------------------

/** Every date field the parser reads, and the JSON path each must name. */
const DATE_SITES: Array<[string, (d: any, v: string) => void, string]> = [
  ['$.startDate', (d, v) => { d.startDate = v; }, '$.startDate'],
  ['$.endDate', (d, v) => { d.endDate = v; }, '$.endDate'],
  ['$.days[3].date', (d, v) => { d.days[3].date = v; }, '$.days[3].date'],
  ['$.bookings[1].startsAt.date', (d, v) => { d.bookings[1].startsAt.date = v; }, '$.bookings[1].startsAt.date'],
];

/** A-45 / ROADMAP I-8c criterion 1: a ceiling, not a floor. */
const CALENDAR_INVALID = ['2026-02-30', '2026-02-31', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-00'];

/** The six the parser already refused on shape alone. They must still be refused. */
const SHAPE_INVALID = ['202-01-01', '10000-01-04', '2026-8-7', '', 'March 2019', 'not-a-date'];

for (const bad of CALENDAR_INVALID) {
  for (const [label, mutate, path] of DATE_SITES) {
    test(`A-45: fromJSON refuses ${JSON.stringify(bad)} at ${label}`, () => {
      assert.throws(
        () => fromJSON(mutated((d) => mutate(d, bad))),
        (e: Error) => {
          assert.equal(e.name, 'TripParseError', `${bad} at ${label} threw ${e.name}`);
          assert.equal((e as TripParseError).path, path);
          assert.match(e.message, /YYYY-MM-DD/, 'the refusal must say what a date looks like');
          return true;
        },
      );
    });
  }
}

test('A-45: the six shapes the parser already refused are still refused, at every date field', () => {
  for (const bad of SHAPE_INVALID) {
    for (const [label, mutate, path] of DATE_SITES) {
      assert.throws(
        () => fromJSON(mutated((d) => mutate(d, bad))),
        (e: Error) => {
          assert.equal(e.name, 'TripParseError', `${JSON.stringify(bad)} at ${label} threw ${e.name}`);
          assert.equal((e as TripParseError).path, path);
          return true;
        },
      );
    }
  }
});

test('A-45: a real calendar date at every one of those fields still parses, and round-trips', () => {
  // The refusal must not have widened into dates that exist. 2024 is a leap year, so
  // `2024-02-29` is a date and `2026-02-29` (asserted refused above) is not.
  const text = mutated((d) => {
    d.startDate = '2024-02-29';
    d.endDate = '2024-12-31';
    d.days[3].date = '2024-03-01';
    d.bookings[1].startsAt.date = '2024-02-29';
  });
  const trip = fromJSON(text);
  assert.equal(trip.startDate, '2024-02-29');
  assert.equal(toJSON(fromJSON(toJSON(trip))), toJSON(trip));
});

test('A-45: `invalid_calendar_date` survives for a Trip that never met the parser', () => {
  // A-45 Part 3: the issue code is NOT deleted. It is defence in depth for the legacy
  // importer, `migrateDoc` and hand-built trips — objects that reach `validateTrip` without
  // passing `fromJSON`. So this is built directly rather than parsed, which is exactly the
  // population the code still exists for.
  const base = europe2026().trip;
  const trip = { ...base, startDate: '2026-02-30' as typeof base.startDate };
  const issues = validateTrip(trip).filter((i) => i.code === 'invalid_calendar_date');
  assert.equal(issues.length, 1, 'validateTrip stopped reporting a date that is not a date');
  assert.equal(issues[0].level, 'error');
  assert.equal(issues[0].params.value, '2026-02-30');
});

test('a foreign-owned document loads but every one of its stops stays badged', async () => {
  // ROADMAP: "a foreign-owned document through every entry point — none may yield an
  // unbadged stop". `importDoc` refuses one outright (§2.14); a hand-edited stored record
  // still parses, so the badge must not depend on the refusal having happened.
  const text = mutated((d) => {
    d.ownerId = 'user:marta';
    for (const day of d.days) {
      for (const s of day.stops) {
        s.provenance = {
          source: 'friend', state: 'candidate', confidence: 'asserted',
          origin: { friendUserId: 'user:marta', sourceTripId: 'trip-marta', sourceStopId: s.id },
          addedAt: '2026-08-01', acceptedAt: null, actorUserId: 'user:marta',
        };
      }
    }
  });
  const trip = fromJSON(text);
  const stops = trip.days.flatMap((d) => d.stops);
  assert.ok(stops.length > 100);
  const { displayStatus } = await import('../src/index.ts');
  const unbadged = stops.filter((s) => displayStatus(s) === 'own').map((s) => s.name);
  assert.deepEqual(unbadged, [], 'a stranger\'s stop rendered as the user\'s own plan');
  assert.deepEqual([...new Set(stops.map((s) => s.provenance.source))], ['friend']);
  assert.deepEqual([...new Set(stops.map((s) => displayStatus(s)))], ['imported']);
  assert.deepEqual(validateTrip(trip).filter((i) => i.code === 'origin_stripped'), [], 'credit links intact');
});

// ---------------------------------------------------------------------------
// §2.14 rule 1 — an ABSENT ownerId is not a parse failure
// ---------------------------------------------------------------------------

/**
 * §2.14 rule 1 refuses a document whose `ownerId` is *"present and is neither the local user
 * … nor absent"*. Absent is therefore an allowed input class, and the parser may not refuse
 * it before the ownership check the rule describes has had a chance to run.
 *
 * The parser does not invent an owner: core has no idea who is signed in, and `LOCAL_OWNER`
 * here would silently stamp a stranger's ownerless file as the local user's inside a pure
 * function. Absence is carried as `''` — the same "present, falsy, and `validateTrip` says
 * so" shape `owner_missing` already exists for — and `store.importDoc`, which is the layer
 * that knows the local user, is where absence becomes ownership.
 */
test('fromJSON accepts a document with no ownerId at all — §2.14 rule 1', () => {
  const trip = fromJSON(mutated((d) => { delete d.ownerId; }));
  assert.equal(trip.ownerId, '', 'an absent owner is carried as absent, not invented');
  assert.equal(trip.days.length > 0, true, 'the rest of the document still parsed');
  assert.deepEqual(
    validateTrip(trip).filter((i) => i.code === 'owner_missing').map((i) => i.level),
    ['error'],
    'an ownerless trip is a domain problem core REPORTS, not one the parser hides',
  );
});

test('fromJSON accepts an explicitly null ownerId the same way JSON expresses absence', () => {
  const trip = fromJSON(mutated((d) => { d.ownerId = null; }));
  assert.equal(trip.ownerId, '');
});

test('fromJSON still rejects a non-string ownerId — absent is allowed, garbage is not', () => {
  assert.throws(
    () => fromJSON(mutated((d) => { d.ownerId = 42; })),
    (e: Error) => {
      assert.equal(e.name, 'TripParseError');
      assert.match((e as TripParseError).path, /ownerId/);
      return true;
    },
  );
});
