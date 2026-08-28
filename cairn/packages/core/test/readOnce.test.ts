/**
 * **A-23 (ARCHITECTURE revision 17) — the standing census.**
 *
 * `build/copyStop.ts` produced a finding in five consecutive breaker rounds, and since round 17
 * every one of them had the same shape: *a ruling printed a claim that its search was complete,
 * and the search had missed a site.* A-21 said "file-wide" and missed five. A-21a said "total",
 * searched the same file for exactly this shape, and missed four — including one printed inside
 * A-21's own body, in the sibling branch of the `if` it was fixing.
 *
 * So the rule stops being checked by the next reviewer's eyes:
 *
 * > Within one traversal, a field of a caller-supplied value is read exactly **once**. The value
 * > that was checked is the value that is used, compared, redacted and emitted.
 *
 * This file **measures** that, mechanically, over every control-flow path through `copyStopInto`.
 * Every own enumerable field of every caller-supplied record — recursively, through plain objects
 * and arrays — is wrapped in a counting accessor that returns a **stable** value. Nothing here is
 * a fault injection: the values never change, so a red line is never a false alarm about a value
 * that was never read. It reports the field, the count and the scenario.
 *
 * **Why a census and not a grep.** A grep over property-access counts cannot tell `p.at` inside a
 * `find` predicate that runs once from one that runs N times, cannot see through a helper, and
 * false-positives on the first legitimate pattern it does not know — a test that removes itself
 * the first time it is wrong.
 *
 * **What this does NOT claim** (A-23, so nobody over-trusts it):
 *
 *   - It is not the `flipping` fixtures' replacement. This proves *how many times* a value is
 *     read; `copyStop.test.ts`'s A-21/A-21a/A-22 accessor fixtures prove *which value crosses*
 *     and that nothing throws. A function that read one field once and emitted a different field
 *     entirely would pass this file and fail those.
 *   - It is scoped to `copyStopInto`, deliberately. `fromJSON` is full of the **safe** double
 *     read A-21 Part 2 blessed in writing, so a census there would be red by design. The trigger
 *     to widen it is the one A-20, A-21 Part 6 and A-21a all name: the day something other than a
 *     person's own hand builds a `Trip` in memory (a native bridge, an ingest worker §5.1, a
 *     vendor feed).
 *   - It measures the paths the matrix reaches. That is why the matrix is specified in A-23
 *     rather than left to the builder, and why **adding a branch means adding a row**.
 *
 * **The maintenance rule.** A new branch in `copyStopInto` adds a scenario row. A new field on
 * `Stop` or `Place` is covered automatically, because the census enumerates whatever the record
 * carries. And a new entry in `ALLOWED` — or a raised `max` — is **an architect's ruling, not a
 * builder's judgment**: it is the written form of *"this value may be read twice and here is why
 * the second read cannot leak"*. A builder who needs one stops and routes it.
 *
 * This does not replace `qa/r18-readonce.mjs` §1.1, which is QA's own copy of the mechanism at
 * its own scope. **A divergence between the two is itself a finding.**
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// §2.10's "tests do not create surface": the four public symbols come from the index, and
// `addPlace` / `TRANSIT_CITY_KEY` are internals imported by module path. Nothing here widens the
// surface — §2.10 stays at 71.
import { addStop, copyStopInto, createTrip, sequentialIds } from '../src/index.ts';
import type { BuildCtx, LatLng, PlaceLink, StopPlacement, Trip } from '../src/index.ts';
import { addPlace } from '../src/build/stops.ts';
import { TRANSIT_CITY_KEY } from '../src/model/ids.ts';

// ---------------------------------------------------------------------------
// The census
// ---------------------------------------------------------------------------

type Counts = Record<string, number>;

/**
 * Wraps every own enumerable property of `v` — recursively, through plain objects and arrays — in
 * a counting accessor that returns a STABLE value. Recursion stops at `opaque` (the `Trip`
 * containers and the `IdFactory`: core legitimately scans `days`, `cities` and `places` in `find`
 * loops, and those are the document skeleton rather than values that cross).
 */
function censusDeep<T>(v: T, counts: Counts, path: string, opaque: ReadonlySet<unknown>): T {
  if (v === null || typeof v !== 'object' || opaque.has(v)) return v;
  const from = v as unknown as Record<string, unknown>;
  const out = (Array.isArray(v) ? [] : {}) as Record<string, unknown>;
  for (const k of Object.keys(from)) {
    const key = `${path}.${k}`;
    const child = censusDeep(from[k], counts, key, opaque);
    Object.defineProperty(out, k, {
      enumerable: true, configurable: true,
      get() { counts[key] = (counts[key] ?? 0) + 1; return child; },
    });
  }
  return out as unknown as T;
}

/**
 * **The allow-list is the ruling, written in the test** (A-23). Exactly five entries after A-22,
 * each naming the ruling that blesses it. Adding one, or raising a `max`, is an architect's
 * decision — see the maintenance rule in this file's header.
 */
const ALLOWED: Record<string, { max: number; why: string }> = {
  'srcStop.place.kind': { max: 2, why: 'A-21: discriminant tested against a closed set; every branch builds a fresh record, so the worst an unstable kind yields is {kind:"none"} — a hole' },
  'srcPlace.at':        { max: 2, why: 'A-21a: the reuse probe reads it, placeForCopy reads it again; closing it would break A-15\'s single classification point' },
  'srcPlace.at.lat':    { max: 2, why: 'A-22 Part 2: the same exception one level down, now constant in the recipient\'s row count' },
  'srcPlace.at.lng':    { max: 2, why: 'A-22 Part 2: as above' },
  'srcPlace.name':      { max: 2, why: 'A-21a: probe + placeForCopy; A-15 has `name` crossing verbatim, so this is an inconsistency and not a crossing' },
};

// ---------------------------------------------------------------------------
// Fixtures — the source stop carries every optional field and the source place carries `note`,
// `links` and `hours`, or the recursion has nothing to count and the census is green by vacancy.
// ---------------------------------------------------------------------------

const VIENNA: LatLng = { lat: 48.2082, lng: 16.3738 };
const BELVEDERE: LatLng = { lat: 48.1915, lng: 16.3806 };

const CTX = (prefix: string): BuildCtx => ({
  ids: sequentialIds(prefix), now: '2026-08-01', actorUserId: 'user:marta',
});

const SRC_CITY = 'src-vienna';
const TGT_CITY = 'tgt-city';

function sourceTrip(opts: { link?: PlaceLink; at?: LatLng | null } = {}): Trip {
  let t = createTrip(
    {
      id: 'trip-src', title: 'Marta in Vienna', ownerId: 'user:marta',
      startDate: '2026-08-07', endDate: '2026-08-09',
      cities: [{ key: SRC_CITY, name: 'Vienna', centre: VIENNA, order: 0 }],
    },
    CTX('src-'),
  );
  t = addPlace(t, {
    id: 'p-src', cityKey: SRC_CITY, name: 'Habyt Vienna',
    at: opts.at === undefined ? BELVEDERE : opts.at,
    category: 'stay',
    note: 'ordinary prose about the entrance',
    links: [{ label: 'Site', href: 'https://example.test/habyt' }],
    hours: { weekly: [{ day: 1, open: '09:00', close: '17:00' }], note: 'closed in winter' },
  });
  return addStop(
    t,
    { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    {
      id: 's-src', name: 'Check in', category: 'stay',
      place: opts.link ?? { kind: 'place', placeId: 'p-src' },
      note: 'Go early', flags: ['free'], durationMins: 90, travelRole: 'transfer',
      cost: {
        amounts: [{ lo: 10, hi: 20, currency: 'EUR', basis: 'per_person' }],
        display: '€10–20', note: 'tickets at the door',
      },
      arrival: { mode: 'metro', mins: 12, label: 'Bus 8' },
      links: [{ label: 'Menu', href: 'https://example.test/menu' }],
    },
    CTX('src2-'),
  );
}

function targetTrip(cfg: { city?: string; places?: Array<{ name: string; at: LatLng | null }> } = {}): Trip {
  let t = createTrip(
    {
      id: 'trip-tgt', title: 'Jacob', ownerId: 'user:jacob',
      startDate: '2026-08-07', endDate: '2026-08-09',
      cities: [{ key: TGT_CITY, name: cfg.city ?? 'Vienna', centre: VIENNA, order: 0 }],
    },
    CTX('tgt-'),
  );
  for (const [i, p] of (cfg.places ?? []).entries()) {
    t = addPlace(t, { id: `p-tgt-${i}`, cityKey: TGT_CITY, name: p.name, at: p.at, category: 'stay' });
  }
  return t;
}

const SCHEDULED: StopPlacement = { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 };

// ---------------------------------------------------------------------------
// The scenario matrix — ten rows, one per control-flow path through `copyStopInto` (A-23).
// A census only measures what the scenarios reach, so the matrix is part of the contract.
// ---------------------------------------------------------------------------

type Case = { source: Trip; target: Trip; placement: StopPlacement };

const MATRIX: Array<{ n: number; name: string; build: () => Case }> = [
  {
    n: 1, name: "1 · {kind:'place'} · re-filed · NEW row",
    build: () => ({ source: sourceTrip(), target: targetTrip(), placement: SCHEDULED }),
  },
  {
    n: 2, name: "2 · {kind:'place'} · re-filed · row REUSED",
    build: () => ({
      source: sourceTrip(),
      target: targetTrip({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] }),
      placement: SCHEDULED,
    }),
  },
  {
    n: 3, name: "3 · {kind:'place'} · re-filed · 3 same-name target rows, new row",
    build: () => ({
      source: sourceTrip(),
      target: targetTrip({
        places: [
          { name: 'Habyt Vienna', at: { lat: 40, lng: 40 } },
          { name: 'Habyt Vienna', at: { lat: 41, lng: 41 } },
          { name: 'Habyt Vienna', at: { lat: 42, lng: 42 } },
        ],
      }),
      placement: SCHEDULED,
    }),
  },
  {
    n: 4, name: "4 · {kind:'place'} · A-14 step 3 (target cannot re-file)",
    build: () => ({ source: sourceTrip(), target: targetTrip({ city: 'Prague' }), placement: SCHEDULED }),
  },
  {
    n: 5, name: "5 · {kind:'place'} · null coordinate, target row also null",
    build: () => ({
      source: sourceTrip({ at: null }),
      target: targetTrip({ places: [{ name: 'Habyt Vienna', at: null }] }),
      placement: SCHEDULED,
    }),
  },
  {
    n: 6, name: "6 · {kind:'place'} · dangling placeId",
    build: () => ({
      source: sourceTrip({ link: { kind: 'place', placeId: 'no-such-place' } }),
      target: targetTrip(), placement: SCHEDULED,
    }),
  },
  {
    n: 7, name: "7 · {kind:'inline'}",
    build: () => ({
      source: sourceTrip({ link: { kind: 'inline', at: { lat: 1, lng: 2 } } }),
      target: targetTrip(), placement: SCHEDULED,
    }),
  },
  {
    n: 8, name: "8 · {kind:'none'}",
    build: () => ({
      source: sourceTrip({ link: { kind: 'none' } }), target: targetTrip(), placement: SCHEDULED,
    }),
  },
  {
    n: 9, name: "9 · {kind:'pool'} placement with a LIVE hint",
    build: () => ({
      source: sourceTrip(), target: targetTrip(),
      placement: { kind: 'pool', cityKey: TGT_CITY, hint: { dayId: '2026-08-08', time: '11:00', order: 0 } },
    }),
  },
  {
    n: 10, name: "10 · {kind:'pool'} placement with TRANSIT_CITY_KEY and a STALE hint",
    build: () => ({
      source: sourceTrip(), target: targetTrip(),
      placement: { kind: 'pool', cityKey: TRANSIT_CITY_KEY, hint: { dayId: '2099-01-01', time: '11:00', order: 0 } },
    }),
  },
];

/**
 * Runs one scenario with every caller-supplied record censused, and snapshots the counts
 * **immediately after `copyStopInto` returns** and before anything inspects the result, so
 * nothing but the copy is measured.
 *
 * Five roots, named by the path prefix a failure prints: `srcStop` (the source stop, substituted
 * into its day), `srcPlace` (the source's `places` row), `tgtPlace0…n` (the **recipient's** own
 * rows — R18-4 was a multi-read of one of those), `source` (with `source.trip` opaque),
 * `placement`, and `ctx` (with `ctx.ids` opaque, because an `IdFactory` is a callable core owns).
 */
function runScenario(build: () => Case): { counts: Counts; threw: unknown } {
  const { source: srcTrip0, target: tgtTrip0, placement } = build();
  const counts: Counts = {};
  const ids = sequentialIds('copy-');
  const opaque = new Set<unknown>([ids]);

  const srcTrip: Trip = {
    ...srcTrip0,
    days: srcTrip0.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => (s.id === 's-src' ? censusDeep(s, counts, 'srcStop', opaque) : s)),
    })),
    places: srcTrip0.places.map((p, i) => censusDeep(p, counts, i === 0 ? 'srcPlace' : `srcPlace${i}`, opaque)),
  };
  const tgtTrip: Trip = {
    ...tgtTrip0,
    places: tgtTrip0.places.map((p, i) => censusDeep(p, counts, `tgtPlace${i}`, opaque)),
  };
  // The two documents are the skeleton, not values that cross: `findAnywhere`, `refileCityKey`
  // and the reuse search legitimately scan `days`, `cities` and `places`.
  opaque.add(srcTrip);
  opaque.add(tgtTrip);

  const source = censusDeep({ trip: srcTrip, stopId: 's-src' }, counts, 'source', opaque);
  const ctx = censusDeep(
    { ids, today: '2026-08-25', actorUserId: 'user:jacob' }, counts, 'ctx', opaque,
  );
  const placed = censusDeep(placement, counts, 'placement', opaque);

  let threw: unknown = null;
  try {
    copyStopInto(tgtTrip, source, placed, ctx);
  } catch (e) {
    threw = e;
  }
  return { counts: { ...counts }, threw };
}

type Run = { name: string; counts: Counts; threw: unknown };

let cached: Run[] | null = null;
function matrix(): Run[] {
  if (cached === null) {
    cached = MATRIX.map(({ name, build }) => {
      const { counts, threw } = runScenario(build);
      return { name, counts, threw };
    });
  }
  return cached;
}

// ---------------------------------------------------------------------------
// Two assertions, and the second one is not decoration.
// ---------------------------------------------------------------------------

test('A-23: no unnamed multi-read — every field `copyStopInto` reads twice is in ALLOWED and within its max', () => {
  // Every scenario must complete without throwing: a stable-valued document that makes
  // `copyStopInto` throw is a §2.1 violation on its own (R15-2's rule).
  const threw = matrix()
    .filter((r) => r.threw !== null)
    .map((r) => `${r.name}: ${(r.threw as Error)?.message ?? String(r.threw)}`);
  assert.deepEqual(threw, [], 'a scenario threw out of copyStopInto — §2.1: core throws on programmer error, never on what a document contains');

  // Accumulated across the WHOLE matrix, then asserted once, so a builder sees the full set in
  // one run rather than the first offender.
  const offenders: string[] = [];
  for (const { name, counts } of matrix()) {
    for (const [field, count] of Object.entries(counts)) {
      if (count <= 1) continue;
      const allowed = ALLOWED[field];
      if (allowed === undefined || count > allowed.max) offenders.push(`${name}: ${field} ×${count}`);
    }
  }
  assert.deepEqual(
    offenders, [],
    'a field of a caller-supplied value is read more than once and no ruling names it. ' +
    'The value that was checked is then not necessarily the value that crosses — §2.14 A-21. ' +
    'Fix the read, or route an ALLOWED entry to the architect; do not add one here.',
  );
});

test('A-23: no dead allowance — every ALLOWED entry is observed at EXACTLY its max somewhere in the matrix', () => {
  // An exception nobody exercises has stopped being an exception and has become a licence. This
  // is also what turns A-21a's sentence — "a builder who drives that 2 to 1 has changed
  // `placeForCopy`'s contract" — into pinned behaviour rather than prose.
  const observed: Counts = {};
  for (const { counts } of matrix()) {
    for (const [field, count] of Object.entries(counts)) {
      if (field in ALLOWED) observed[field] = Math.max(observed[field] ?? 0, count);
    }
  }
  const dead = Object.entries(ALLOWED)
    .filter(([field, { max }]) => (observed[field] ?? 0) !== max)
    .map(([field, { max }]) => `${field}: allowed ${max}, observed ${observed[field] ?? 0} — ${ALLOWED[field]!.why}`);
  assert.deepEqual(
    dead, [],
    'an ALLOWED entry is never observed at its max: either the exception is dead (delete it — ' +
    'route it) or the matrix stopped reaching the branch that exercises it (add the scenario row).',
  );
});
