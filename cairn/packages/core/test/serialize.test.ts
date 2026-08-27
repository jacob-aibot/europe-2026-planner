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

test('a YYYY-MM-DD-shaped non-date parses, and validateTrip catches it — KD-12', () => {
  const trip = fromJSON(mutated((d) => { d.startDate = '2026-02-30'; }));
  const issues = validateTrip(trip).filter((i) => i.code === 'invalid_calendar_date');
  assert.equal(issues.length, 1, 'the parser lets it through; validateTrip must not');
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
