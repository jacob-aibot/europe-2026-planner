/**
 * **ROADMAP I-24 Parts 1 and 3** — ARCHITECTURE §8.4 **A-85** Parts 2 and 4, which amend §8.4
 * **A-84** Part 3 (clauses 1, 2 and 3 stand verbatim) and Part 4 item 2.
 *
 * **What QA round 62 measured (R62-2, MAJOR).** `CityInit.centre` and `CityInit.pick` are
 * independent optionals, so the *shortest call a picker screen writes* —
 * `createTrip({cities: [{name: 'Geneva', pick: cityPickFromRow(row)}]})` — stored a well-formed
 * pick on a city with `centre: null`. A-84 Part 3 clause 3 then makes that pick **stale at
 * birth**: it attributes nothing, forever, with no default, no `Issue` and no refusal.
 *
 * **What A-85 Part 2 rules.** A `CityInit` that carries a `pick` and does **not carry a `centre`
 * key** is stood on a **copy** of `pick.centre`. A `CityInit` that carries `centre` is honoured
 * **verbatim, `null` included** — because an explicit `centre: null` beside a pick is A-84 Part 3
 * clause 3's *erase* case, a legal shipped user action, and in the stored document the two cases
 * are the same two fields. **The distinction exists only at the door**, so the test is key
 * PRESENCE and never `??`.
 *
 * **And A-85 Part 4 (R62-8).** The **existing** `lat_lng_out_of_range` gains two subjects —
 * `City.centre` when non-null, and `City.pick.centre`. No new `IssueCode`, no new severity, and
 * **the `Place` arm's `at === null` branch is deliberately NOT copied**: a city's absent
 * coordinate is A-82 Part 7's honest hole, and copying it would redden every typed city.
 *
 * The coordinates are the shipped gazetteer's own and are re-derived here rather than copied:
 * Geneva `ne:j64n0x` at `{46.21, 6.14}` stating `CH`, where `countryOf` says **`FR`**.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRY_INDEX, cityPickFromRow, countryOf, createTrip, searchGazetteer, sequentialIds,
  tripSummary, validateTrip,
} from '../src/index.ts';
import type { BuildCtx, GazetteerRow, Issue, Trip } from '../src/index.ts';
import { GAZETTEER } from '../src/geo/gazetteer.gen.ts';
import { europe2026 } from './fixture.ts';

const ctx = (p: string): BuildCtx => ({ ids: sequentialIds(`${p}-`), now: '2026-06-15' });

/** The shipped row, found the way a human finds it: by typing a name. */
function row(query: string): GazetteerRow {
  const hits = searchGazetteer(query, GAZETTEER, { limit: 5 });
  assert.ok(hits.length > 0, `the shipped gazetteer has no row for "${query}"`);
  return hits[0];
}

const GENEVA = row('geneva');

const attribution = (trip: Trip) => {
  const s = tripSummary(trip, COUNTRY_INDEX);
  return {
    countryCode: s.cities[0].countryCode,
    countrySource: s.cities[0].countrySource,
    countryCodes: s.countryCodes,
  };
};

test('I-24: the row this file rests on is what A-85 says it is, and the ring still disagrees with it', () => {
  assert.deepEqual(
    { id: GENEVA.id, centre: GENEVA.centre, countryCode: GENEVA.countryCode },
    { id: 'ne:j64n0x', centre: { lat: 46.21, lng: 6.14 }, countryCode: 'CH' },
  );
  assert.equal(
    countryOf(GENEVA.centre, COUNTRY_INDEX), 'FR',
    'INCONCLUSIVE: the coarse ring no longer says FR at Geneva, so `picked` outranking ' +
      '`coordinate` is no longer observable at this point (§8.4 A-84 Part 3 clause 1)',
  );
});

// ===========================================================================
// Part 1 — the pick lands on the point it names.
// ===========================================================================

test('I-24 Part 1 (A-85 Part 2, QA R62-2): a pick with NO `centre` key stands the city on a COPY of `pick.centre`', () => {
  const pick = cityPickFromRow(GENEVA);
  // The shortest call a picker screen writes. Nothing else.
  const trip = createTrip(
    { title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ name: 'Geneva', pick }] },
    ctx('p1'),
  );
  assert.deepEqual(trip.cities[0].centre, { lat: 46.21, lng: 6.14 });
  // A COPY, never the pick's own object: the two fields are independently stored and an
  // alias would make a later in-place edit of either silently move the other.
  assert.notEqual(trip.cities[0].centre, trip.cities[0].pick?.centre);
  assert.notEqual(trip.cities[0].centre, pick.centre);
  assert.deepEqual(trip.cities[0].pick, pick);
  // …and therefore the pick is LIVE, which is the whole point: `{CH, picked}`, not `{null, null}`.
  assert.deepEqual(attribution(trip), {
    countryCode: 'CH', countrySource: 'picked', countryCodes: ['CH'],
  });
});

test('I-24 Part 1 (A-85 Part 2 clause 2): an EXPLICIT `centre: null` beside a pick is honoured verbatim — the erase case', () => {
  const pick = cityPickFromRow(GENEVA);
  const trip = createTrip(
    {
      title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
      // Written out loud. A-84 Part 3 clause 3's erase case: the pick is KEPT and inert.
      cities: [{ name: 'Geneva', centre: null, pick }],
    },
    ctx('p2'),
  );
  assert.equal(trip.cities[0].centre, null);
  assert.deepEqual(trip.cities[0].pick, pick, 'the pick is kept — deleting it silently is the larger loss');
  assert.deepEqual(attribution(trip), { countryCode: null, countrySource: null, countryCodes: [] });
});

test('I-24 Part 1 (A-85 Part 2 clause 2): an EXPLICIT `centre` elsewhere is honoured verbatim — the pick goes stale and stays kept', () => {
  const pick = cityPickFromRow(GENEVA);
  const trip = createTrip(
    {
      title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
      cities: [{ name: 'Geneva', centre: { lat: 48.2082, lng: 16.3738 }, pick }],
    },
    ctx('p3'),
  );
  assert.deepEqual(trip.cities[0].centre, { lat: 48.2082, lng: 16.3738 });
  assert.deepEqual(trip.cities[0].pick, pick);
  assert.deepEqual(attribution(trip), {
    countryCode: 'AT', countrySource: 'coordinate', countryCodes: ['AT'],
  });
});

test('I-24 Part 1: a city with NO pick and NO centre is still the honest hole A-82 Part 7 made it', () => {
  const trip = createTrip(
    { title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ name: 'Nowhere' }] },
    ctx('p4'),
  );
  assert.equal(trip.cities[0].centre, null);
  assert.equal(trip.cities[0].pick, null);
});

test('I-24 Part 1: `undefined` written out loud is ABSENT — the door test is presence, and `centre: undefined` beside a pick still lands on the pick', () => {
  const pick = cityPickFromRow(GENEVA);
  const trip = createTrip(
    {
      title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
      cities: [{ name: 'Geneva', centre: undefined, pick }],
    },
    ctx('p5'),
  );
  // `undefined` is what an INIT means by *take the default* (BUILD-NOTES KD-101's reasoning,
  // one field over): it is not a value the caller supplied. `null` is.
  assert.deepEqual(trip.cities[0].centre, { lat: 46.21, lng: 6.14 });
});

// ===========================================================================
// Part 1, QA round 63 — the pick is PARSED before its coordinate is read.
//
// **R63-1 (MAJOR).** The first cut of Part 1 wrote `c.pick.centre.lat` in FRONT of the parser
// A-84 Part 3 clause 2 says refuses a malformed pick *"at a named JSON path, at every door"*, so
// six malformed shapes — `{rowId, countryCode}` with no centre among them, which is clause 2's
// own case (*"a pick without a coordinate is not a pick"*) — came out of `createTrip` as a bare
// `TypeError: Cannot read properties of undefined (reading 'lat')` **whenever the caller had not
// written a `centre` key**. The same six with `centre: null` written out loud were refused
// correctly, which is the shape of the defect: the quality of a refusal depended on a key the
// malformed value has nothing to do with.
//
// **R63-2 (MINOR).** The same site read `pick.centre` twice (three times counting the parser's
// own read), so a getter-backed init minted a city whose `centre` disagreed with the `pick.centre`
// stored beside it — a pick **stale at birth** with no caller ever writing `centre: null`, which
// is precisely the state A-85 Part 2 exists to prevent.
//
// Both close the same way and it is the one A-84 Part 3 clause 2 already names: the door hands the
// pick to the parser first and takes the city's coordinate off the **parsed** record, so the
// coordinate that is copied is one the parser has already accepted.
// ===========================================================================

/** Every malformed pick shape, run through the door both ways round. */
const MALFORMED: readonly (readonly [string, unknown])[] = [
  ["a pick with no `centre` — A-84 Part 3 clause 2's own case", { rowId: 'ne:j64n0x', countryCode: 'CH' }],
  ['a pick whose `centre` is null', { rowId: 'ne:j64n0x', centre: null, countryCode: 'CH' }],
  ['a pick that is a string', 'ne:j64n0x'],
  ['a pick that is a number', 7],
  ['a pick that is `true`', true],
  ['a pick that is an array', []],
  ['a pick whose coordinates are strings', { rowId: 'ne:j64n0x', centre: { lat: '46.21', lng: '6.14' }, countryCode: 'CH' }],
];

const refusal = (fn: () => unknown): Error => {
  try {
    fn();
  } catch (err) {
    return err as Error;
  }
  return assert.fail('createTrip accepted a malformed pick') as never;
};

test('I-24 Part 1 (QA R63-1): a malformed pick is refused at a NAMED path whether or not `centre` was written', () => {
  for (const [label, pick] of MALFORMED) {
    for (const [how, city] of [
      ['no `centre` key', { name: 'Geneva', pick }],
      ['`centre: null` written out loud', { name: 'Geneva', centre: null, pick }],
    ] as const) {
      const err = refusal(() => createTrip(
        { title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [city as never] },
        ctx('r63'),
      ));
      assert.ok(
        !(err instanceof TypeError),
        `${label}, ${how}: a bare TypeError is the parser being jumped — ${err.message}`,
      );
      assert.match(err.message, /createTrip: this city cannot be stored/, `${label}, ${how}`);
      assert.match(err.message, /\(at \$\.pick(\.|\b)/, `${label}, ${how}: the path names the PICK`);
      assert.match(err.message, /\(cities\[0\]\)/, `${label}, ${how}: the refusal locates the city`);
    }
  }
});

test('I-24 Part 1 (QA R63-1): a pick with string coordinates is refused at `$.pick.centre.lat`, not at a `centre` the caller never wrote', () => {
  const err = refusal(() => createTrip(
    {
      title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
      cities: [{ name: 'Geneva', pick: { rowId: 'ne:j64n0x', centre: { lat: '46.21', lng: '6.14' }, countryCode: 'CH' } as never }],
    },
    ctx('r63b'),
  ));
  assert.match(err.message, /\(at \$\.pick\.centre\.lat\)/);
});

test('I-24 Part 1 (QA R63-2): the door reads `pick.centre` ONCE — a caller-owned object cannot be made to disagree with itself', () => {
  // The realistic shape is a reactive or `Proxy`-backed form object; a counting getter is the
  // same thing made observable.
  let reads = 0;
  const shifting = {
    rowId: 'ne:j64n0x',
    countryCode: 'CH',
    get centre() {
      reads += 1;
      return { lat: 46.21 + reads, lng: 6.14 };
    },
  };
  const trip = createTrip(
    { title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ name: 'Geneva', pick: shifting as never }] },
    ctx('r63c'),
  );
  const city = trip.cities[0];
  assert.equal(reads, 1, 'one read of the caller-owned getter, and it is the parser that takes it');
  assert.deepEqual(
    city.centre, city.pick?.centre,
    'the stored city stands on the stored pick — anything else is a pick stale at birth (A-85 Part 2)',
  );
  // …and a copy, not the same object, exactly as the well-formed case asserts.
  assert.notEqual(city.centre, city.pick?.centre);
  // Live, therefore attributing: `{CH, picked}`, not `{null, null}`.
  assert.deepEqual(attribution(trip), { countryCode: 'CH', countrySource: 'picked', countryCodes: ['CH'] });
});

// ===========================================================================
// Part 3 — the coordinate range check, on both new subjects.
// ===========================================================================

/**
 * The CITY subjects only. `lat_lng_out_of_range` has four subjects after A-85 Part 4 and the
 * other two are `Stop` and `Place`; the reference trip already carries a `Place` with no
 * coordinate at all (that is the 95th place record, and R62-1's whole subject), so an unfiltered
 * count would read a shipped, correct issue as this increment's. A city issue is the one whose
 * `ref` is the TRIP — cities have no `RefKind` of their own and A-85 adds none.
 */
const outOfRange = (issues: readonly Issue[]) =>
  issues.filter((i) => i.code === 'lat_lng_out_of_range' && i.ref.kind === 'trip');

test('I-24 Part 3 (A-85 Part 4, QA R62-8): a city AND its pick at an impossible point are TWO errors, each naming the city', () => {
  const bad = { lat: 91.5, lng: 500.25 };
  const trip = createTrip(
    {
      title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
      cities: [{
        key: 'geneva', name: 'Geneva', centre: bad,
        pick: { rowId: 'ne:j64n0x', centre: bad, countryCode: 'CH' },
      }],
    },
    ctx('p6'),
  );
  const issues = outOfRange(validateTrip(trip));
  assert.equal(issues.length, 2, 'one for `City.centre` and one for `City.pick.centre`');
  for (const i of issues) {
    assert.equal(i.level, 'error');
    assert.equal(i.params.cityKey, 'geneva');
    assert.equal(i.params.lat, 91.5);
    assert.equal(i.params.lng, 500.25);
    assert.match(i.message, /Geneva/, 'the city is NAMED — a key is an opaque id nobody can read');
  }
  assert.equal(
    issues.filter((i) => /pick/i.test(i.message)).length, 1,
    'exactly one of the two messages says the subject is the PICK, or a reader cannot tell them apart',
  );
  // A-85 Part 4 note 3: this changes NO attribution. Reporting is `validateTrip`'s job and
  // precedence is `summary.ts`'s, and the ruling does not blur them.
  assert.deepEqual(attribution(trip), {
    countryCode: 'CH', countrySource: 'picked', countryCodes: ['CH'],
  });
});

test('I-24 Part 3: `City.centre: null` is LEGAL and is not an issue — the `Place` arm\'s `at === null` branch is NOT copied', () => {
  const trip = createTrip(
    {
      title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
      cities: [{ key: 'typed', name: 'Typed', centre: null }],
    },
    ctx('p7'),
  );
  assert.deepEqual(outOfRange(validateTrip(trip)), []);
});

test('I-24 Part 3: only the offending subject reddens — a legal city carrying an impossible PICK is one error', () => {
  const trip = createTrip(
    {
      title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
      cities: [{
        key: 'geneva', name: 'Geneva', centre: { lat: 46.21, lng: 6.14 },
        pick: { rowId: 'ne:j64n0x', centre: { lat: 91.5, lng: 500.25 }, countryCode: 'CH' },
      }],
    },
    ctx('p8'),
  );
  const issues = outOfRange(validateTrip(trip));
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /pick/i);
});

test('I-24 Part 3: the whole committed reference trip reports ZERO city coordinate errors', () => {
  const { trip } = europe2026();
  assert.deepEqual(
    outOfRange(validateTrip(trip) as Issue[]).map((i) => i.message), [],
    'a real trip reddening here means the `Place` arm was copied, or the range test is wrong',
  );
});

// ===========================================================================
// Part 1, QA round 64 — **R64-1 (MAJOR)**: the door reads each init field ONCE.
//
// R63-2's fix moved the `pick.centre` read below the commit and, in the same edit, added a
// **second** read of `c.centre`: the record's `c.centre !== undefined ? c.centre : null` is two
// reads (short-circuiting), and `wroteCentre`'s own `c.centre !== undefined` a few lines below
// is a third. `init.cities` was read twice for the same reason — once for the record map, once
// for `wroteCentre` — while `standOnPicks` maps the FIRST. Both were measured, and both have a
// consequence a caller cannot see:
//
//   - a `centre` getter yielding `undefined` first and a coordinate after stores
//     `{centre: null, pick: live}` and reports `{null, null}` — R62-2's own reproduction string,
//     reached through the door built to prevent it, with nobody writing `null`;
//   - a `cities` getter returning a shorter array the second time misaligns `wroteCentre`, so a
//     city the caller **did** locate is silently moved onto its pick's coordinate — `{lat:50,
//     lng:14}` written, `{46.21, 6.14}` stored — and then attributed `{CH, picked}` with
//     confidence.
//
// A-86 Part 2's trigger names the fix in as many words — *bind the value once, write it into
// both fields* — so the door now normalises each `CityInit` in ONE pass, reading every property
// into a local, and the record, `wroteCentre` and `standOnPicks` all consume the local. The
// three tests below are the property itself, then each fault.
// ===========================================================================

/** Every field a `CityInit` may carry, wrapped in a counting accessor over a STABLE value. */
function countingCity(values: Record<string, unknown>, counts: Record<string, number>) {
  const c: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    counts[k] = 0;
    Object.defineProperty(c, k, {
      enumerable: true,
      get() {
        counts[k] += 1;
        return v;
      },
    });
  }
  return c;
}

test('I-25/R64-1: every `CityInit` field is read exactly ONCE, and so is `init.cities`', () => {
  const counts: Record<string, number> = {};
  const city = countingCity(
    {
      key: 'geneva',
      name: 'Geneva',
      countryCode: 'CH',
      centre: { lat: 48.2082, lng: 16.3738 },
      pick: cityPickFromRow(GENEVA),
      order: 0,
      meta: { flagEmoji: '🇨🇭' },
    },
    counts,
  );
  let cityListReads = 0;
  const init = {
    title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
    get cities() {
      cityListReads += 1;
      return [city as never];
    },
  };
  createTrip(init, ctx('r64a'));
  assert.deepEqual(
    counts,
    { key: 1, name: 1, countryCode: 1, centre: 1, pick: 1, order: 1, meta: 1 },
    'a field of a caller-owned object read twice is a field two reads can disagree about (A-23)',
  );
  assert.equal(cityListReads, 1, '`init.cities` is read once — `wroteCentre` may not map a second read');
});

test('I-25/R64-1: every `TripInit` field is read exactly ONCE too — the class, not the instance', () => {
  const counts: Record<string, number> = {};
  const init = countingCity(
    {
      id: 'trip-1',
      title: 'T',
      startDate: '2026-08-07',
      endDate: '2026-08-08',
      ownerId: 'u1',
      homeCurrency: 'EUR',
      homeBase: null,
      party: { adults: 1, children: 0 },
      cities: [{ name: 'Geneva', pick: cityPickFromRow(GENEVA) }],
      datePrecision: 'exact',
      meta: { note: 'n' },
    },
    counts,
  );
  createTrip(init as never, ctx('r64b'));
  const twice = Object.entries(counts).filter(([, n]) => n !== 1);
  assert.deepEqual(twice, [], `these \`TripInit\` fields were not read exactly once: ${JSON.stringify(counts)}`);
});

test('I-25/R64-1 fault 1: a `centre` getter yielding `undefined` then a point cannot mint a pick STALE AT BIRTH', () => {
  let reads = 0;
  const shifting = {
    name: 'Geneva',
    pick: cityPickFromRow(GENEVA),
    get centre() {
      reads += 1;
      return reads === 1 ? undefined : { lat: 48.2082, lng: 16.3738 };
    },
  };
  const trip = createTrip(
    { title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [shifting as never] },
    ctx('r64c'),
  );
  const city = trip.cities[0];
  assert.equal(reads, 1, 'the door read the caller-owned getter more than once');
  // Whichever value the ONE read took, the two fields agree: the pick is live, never stale at
  // birth. With `undefined` on that read, absence means *the point the pick names* (A-85 Part 2).
  assert.deepEqual(city.centre, city.pick?.centre);
  assert.deepEqual(attribution(trip), { countryCode: 'CH', countrySource: 'picked', countryCodes: ['CH'] });
});

test('I-25/R64-1 fault 2: a shorter second read of `init.cities` cannot move a city the caller LOCATED', () => {
  const pick = cityPickFromRow(GENEVA);
  const VIENNA = { lat: 48.2082, lng: 16.3738 };
  const PRAGUE = { lat: 50, lng: 14 };
  let reads = 0;
  const init = {
    title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
    get cities() {
      reads += 1;
      return reads === 1
        ? [{ name: 'A', pick, centre: VIENNA }, { name: 'B', pick, centre: PRAGUE }]
        : [{ name: 'A', pick, centre: VIENNA }];
    },
  };
  const trip = createTrip(init, ctx('r64d'));
  assert.equal(reads, 1);
  assert.deepEqual(
    trip.cities.map((c) => c.centre), [VIENNA, PRAGUE],
    'a city the caller located was moved onto its pick and then attributed with confidence',
  );
  const s = tripSummary(trip, COUNTRY_INDEX);
  assert.deepEqual(s.cities.map((c) => [c.countryCode, c.countrySource]), [['AT', 'coordinate'], ['CZ', 'coordinate']]);
});
