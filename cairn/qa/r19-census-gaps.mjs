/**
 * Round 19 — the breaker pass over ARCHITECTURE revision 17's **A-22** (the five sites A-21 and
 * A-21a's "exhaustive" searches missed) and **A-23** (the standing census,
 * `packages/core/test/readOnce.test.ts`).
 *
 * Run: node --experimental-strip-types qa/r19-census-gaps.mjs   (from cairn/)
 *
 * ---------------------------------------------------------------------------------------------
 * **RE-EXPRESSED IN ROUND 20, at `master` @ `3d1be3b`. It was 12 FAIL by design; it is now 0.**
 *
 * A-19 assertion 7 makes re-expressing QA's own probes QA's job, and the builder who landed A-24
 * correctly refused to touch this file — his run reported *"12 FAIL → 8 FAIL"*, with the remaining
 * 8 all measured against **QA's own local copy of the pre-A-24 census** (`runMatrix`/`a23Source`
 * below): ten rows, five `ALLOWED` entries, both whole `Trip`s opaque. Those 8 were not findings
 * about the shipped tree at all; they were this file being a round out of date. Round 20 brings it
 * current, and the six round-19 findings are then all measured **closed against what shipped**:
 *
 *   - **R19-1 / R19-2** — code fixes in `copyStop.ts`. §1 and §2 assert the closure directly, with
 *     this file's own flipping accessors, and §1.2 asserts the *harm* is gone rather than only the
 *     count. Both are re-derived here, not taken from BUILD-NOTES.
 *   - **R19-3** — A-24 Part 1: `opaque` narrows from the whole `Trip` to its six collections, so
 *     `srcTrip`/`tgtTrip` are two more roots. §3 measures that the fields that cross
 *     (`Trip.id`, `Trip.ownerId`) are now watched, and that reverting R19-1 turns the census red.
 *   - **R19-4** — A-24 Part 2: rows 11–14. §4 asserts each takes the branch it claims.
 *   - **R19-5** — A-24 Part 3: the fixture stop carries 15 of `Stop`'s 15 fields. §5 asserts it.
 *   - **R19-6** — cosmetic, corrected in the ruling. §6 is unchanged and still confirms it.
 *
 * The census's *remaining* reach — what A-24's own narrowing still cannot see — is **round 20's**
 * subject and lives in `qa/r20-census-reach.mjs`, not here. This file's job after the
 * re-expression is to be the standing "round 19 is closed" check.
 * ---------------------------------------------------------------------------------------------
 *
 * A FAIL line means the probe found what it was looking for. Read the finding in
 * ../docs/QA-FINDINGS.md before assuming the script is broken.
 *
 * **Population bound, unchanged from rounds 17, 18 and 19 and the reason every finding in this
 * arc has been MINOR:** every read-count finding needs an **accessor property** on a
 * caller-supplied value. `JSON.parse` produces own data properties and never accessors,
 * `TripDoc = string`, `importDoc(text: string)` and `cli.ts` both pass text, and `apps/web`'s only
 * `copyStopInto` call site builds `{ trip: browsing, stopId: stop.id }` as an object literal over a
 * parsed document. The population is an in-process caller past the type system.
 */
import { readFileSync } from 'node:fs';

const core = await import('../packages/core/src/index.ts');
const { addPlace } = await import('../packages/core/src/build/stops.ts');
const { TRANSIT_CITY_KEY } = await import('../packages/core/src/model/ids.ts');

let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');
const note = (s) => console.log('  ' + s);

const VIENNA = { lat: 48.2082, lng: 16.3738 };
const BELVEDERE = { lat: 48.1915, lng: 16.3806 };
const C = (p) => ({ ids: core.sequentialIds(p), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
const CC = (p) => ({ ids: core.sequentialIds(p), today: '2026-04-01', actorUserId: core.LOCAL_OWNER });
const SCHED = { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 };
let seq = 0;
const pfx = () => 'r19-' + seq++;

/** A-21's own injected fault: a getter that returns a different value per read, last repeats. */
function flipping(values) {
  let i = 0;
  const f = () => { const v = values[Math.min(i, values.length - 1)]; i += 1; return v; };
  f.reads = () => i;
  return f;
}
function withAccessor(o0, key, get) {
  const o = { ...o0 };
  delete o[key];
  Object.defineProperty(o, key, { get, enumerable: true, configurable: true });
  return o;
}
const attempt = (fn) => { try { return { out: fn(), threw: null }; } catch (e) { return { out: null, threw: e }; } };
const copied = (out) => out.days.flatMap((d) => d.stops).concat(out.pool).find((s) => s.provenance.source === 'friend');

/* ============ the A-24 fixture and matrix, rebuilt here ========================= */
/* A-23 says in writing that `readOnce.test.ts` and QA's own copy are two measurements of one
 * mechanism and *"a divergence between the two is itself a finding"*. §3.1 below therefore
 * reproduces the shipped test's FOURTEEN scenarios and SEVEN allow-list entries and cross-checks
 * the result before it uses them for anything, so a drift in either file surfaces as a FAIL
 * rather than as a silent disagreement. Rows 1–10 are unchanged in construction and numbering
 * from A-23, exactly as A-24 Part 2 promises, so this stays a row-by-row comparison. */
const SRC_CITY = 'src-vienna', TGT_CITY = 'tgt-city';
function a24Source(opts = {}) {
  let t = core.createTrip({
    id: 'trip-src', title: 'Marta in Vienna', ownerId: 'user:marta',
    startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: SRC_CITY, name: 'Vienna', centre: VIENNA, order: 0 }],
  }, C('src-'));
  t = addPlace(t, {
    id: 'p-src', cityKey: SRC_CITY, name: 'Habyt Vienna',
    at: opts.at === undefined ? BELVEDERE : opts.at, category: 'stay',
    note: 'ordinary prose about the entrance',
    links: [{ label: 'Site', href: 'https://example.test/habyt' }],
    hours: { weekly: [{ day: 1, open: '09:00', close: '17:00' }], note: 'closed in winter' },
  });
  return core.addStop(
    t,
    opts.pool ? { kind: 'pool', cityKey: SRC_CITY }
      : { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    {
      id: 's-src', name: 'Check in', category: 'stay',
      place: opts.link ?? { kind: 'place', placeId: 'p-src' },
      note: 'Go early', flags: ['free'], durationMins: 90, travelRole: 'transfer',
      cost: { amounts: [{ lo: 10, hi: 20, currency: 'EUR', basis: 'per_person' }], display: '€10–20', note: 'tickets at the door' },
      arrival: { mode: 'metro', mins: 12, label: 'Bus 8' },
      links: [{ label: 'Menu', href: 'https://example.test/menu' }],
      // A-24 Part 3 (R19-5): the 15th field. §6.6 calls a ticket an access credential.
      ticket: { kind: 'bundled', path: 'tickets/entry.pdf', label: 'Entry' },
    },
    C('src2-'),
  );
}
/** A-24 Part 2, row 14 — no optional field populated, on the stop OR the place. */
function a24Minimal() {
  let t = core.createTrip({
    id: 'trip-src', title: 'Marta in Vienna', ownerId: 'user:marta',
    startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: SRC_CITY, name: 'Vienna', centre: VIENNA, order: 0 }],
  }, C('min-'));
  t = addPlace(t, { id: 'p-src', cityKey: SRC_CITY, name: 'Habyt Vienna', at: BELVEDERE, category: 'stay' });
  return core.addStop(t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Check in', category: 'stay', place: { kind: 'place', placeId: 'p-src' } }, C('min2-'));
}
function a24Target(cfg = {}) {
  let t = core.createTrip({
    id: 'trip-tgt', title: 'Jacob', ownerId: 'user:jacob',
    startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: TGT_CITY, name: cfg.city ?? 'Vienna', centre: VIENNA, order: 0 }],
  }, C('tgt-'));
  for (const [i, p] of (cfg.places ?? []).entries()) {
    t = addPlace(t, { id: `p-tgt-${i}`, cityKey: TGT_CITY, name: p.name, at: p.at, category: 'stay' });
  }
  return t;
}
const A24_MATRIX = [
  ["1 · place · re-filed · NEW row", () => ({ source: a24Source(), target: a24Target(), placement: SCHED })],
  ["2 · place · re-filed · row REUSED", () => ({ source: a24Source(), target: a24Target({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] }), placement: SCHED })],
  ["3 · place · 3 same-name target rows", () => ({ source: a24Source(), target: a24Target({ places: [
    { name: 'Habyt Vienna', at: { lat: 40, lng: 40 } }, { name: 'Habyt Vienna', at: { lat: 41, lng: 41 } },
    { name: 'Habyt Vienna', at: { lat: 42, lng: 42 } }] }), placement: SCHED })],
  ["4 · place · A-14 step 3", () => ({ source: a24Source(), target: a24Target({ city: 'Prague' }), placement: SCHED })],
  ["5 · place · null coordinate, target row also null", () => ({ source: a24Source({ at: null }), target: a24Target({ places: [{ name: 'Habyt Vienna', at: null }] }), placement: SCHED })],
  ["6 · place · dangling placeId", () => ({ source: a24Source({ link: { kind: 'place', placeId: 'no-such-place' } }), target: a24Target(), placement: SCHED })],
  ["7 · inline", () => ({ source: a24Source({ link: { kind: 'inline', at: { lat: 1, lng: 2 } } }), target: a24Target(), placement: SCHED })],
  ["8 · none", () => ({ source: a24Source({ link: { kind: 'none' } }), target: a24Target(), placement: SCHED })],
  ["9 · pool, LIVE hint", () => ({ source: a24Source(), target: a24Target(), placement: { kind: 'pool', cityKey: TGT_CITY, hint: { dayId: '2026-08-08', time: '11:00', order: 0 } } })],
  ["10 · pool, TRANSIT + stale hint", () => ({ source: a24Source(), target: a24Target(), placement: { kind: 'pool', cityKey: TRANSIT_CITY_KEY, hint: { dayId: '2099-01-01', time: '11:00', order: 0 } } })],
  // A-24 Part 2 (R19-4) — the four new rows.
  ["11 · place · null coordinate, NO matching target row", () => ({ source: a24Source({ at: null }), target: a24Target(), placement: SCHED })],
  ["12 · the SAME document, two distinct objects (A-16 step 2)", () => ({ source: a24Source(), target: a24Source(), placement: SCHED })],
  ["13 · the source stop is taken from the source's POOL", () => ({ source: a24Source({ pool: true }), target: a24Target(), placement: SCHED })],
  ["14 · a MINIMAL source stop", () => ({ source: a24Minimal(), target: a24Target(), placement: SCHED })],
];

/** A-23's own `censusDeep`, verbatim from the ruling. */
function censusDeep(v, counts, path, opaque) {
  if (v === null || typeof v !== 'object' || opaque.has(v)) return v;
  const out = Array.isArray(v) ? [] : {};
  for (const k of Object.keys(v)) {
    const key = `${path}.${k}`;
    const child = censusDeep(v[k], counts, key, opaque);
    Object.defineProperty(out, k, {
      enumerable: true, configurable: true,
      get() { counts[key] = (counts[key] ?? 0) + 1; return child; },
    });
  }
  return out;
}
/** A-24 Part 1's `censusTrip`, verbatim from the ruling. */
const TRIP_SKELETON = new Set(['days', 'cities', 'places', 'pool', 'bookings', 'resolutions']);
function censusTrip(trip, counts, path, opaque) {
  const out = {};
  for (const k of Object.keys(trip)) {
    const raw = trip[k];
    if (TRIP_SKELETON.has(k)) { out[k] = raw; continue; }
    const key = `${path}.${k}`;
    const child = censusDeep(raw, counts, key, opaque);
    Object.defineProperty(out, k, {
      enumerable: true, configurable: true,
      get() { counts[key] = (counts[key] ?? 0) + 1; return child; },
    });
  }
  return out;
}

/** The SHIPPED A-24 roots: seven, not five. */
function runMatrix() {
  const rows = [];
  for (const [name, build] of A24_MATRIX) {
    const { source: s0, target: t0, placement } = build();
    const counts = {};
    const ids = core.sequentialIds('copy-');
    const opaque = new Set([ids]);
    const srcSub = { ...s0,
      days: s0.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === 's-src' ? censusDeep(s, counts, 'srcStop', opaque) : s)) })),
      pool: s0.pool.map((s) => (s.id === 's-src' ? censusDeep(s, counts, 'srcStop', opaque) : s)),
      places: s0.places.map((p, i) => censusDeep(p, counts, i === 0 ? 'srcPlace' : `srcPlace${i}`, opaque)) };
    const tgtSub = { ...t0, places: t0.places.map((p, i) => censusDeep(p, counts, `tgtPlace${i}`, opaque)) };
    const srcTrip = censusTrip(srcSub, counts, 'srcTrip', opaque);
    const tgtTrip = censusTrip(tgtSub, counts, 'tgtTrip', opaque);
    opaque.add(srcTrip); opaque.add(tgtTrip);
    const source = censusDeep({ trip: srcTrip, stopId: 's-src' }, counts, 'source', opaque);
    const ctx = censusDeep({ ids, today: '2026-08-25', actorUserId: 'user:jacob' }, counts, 'ctx', opaque);
    const placed = censusDeep(placement, counts, 'placement', opaque);
    const r = attempt(() => core.copyStopInto(tgtTrip, source, placed, ctx));
    rows.push({ name, counts: { ...counts }, threw: r.threw, out: r.out });
  }
  return rows;
}
/** The shipped seven. A divergence from `readOnce.test.ts` is itself a finding (A-23). */
const ALLOWED = {
  'srcStop.place.kind': 2, 'srcPlace.at': 2, 'srcPlace.at.lat': 2, 'srcPlace.at.lng': 2,
  'srcPlace.name': 2, 'tgtTrip.id': 2, 'tgtTrip.revision': 2,
};

/* ===================== §1 R19-1 — CLOSED, re-derived here ======================= */

line('§1.1 R19-1 — `source.trip.id` is read ONCE (was 2 at 215aeee)');
{
  // A-22 Part 1 hoisted the CONTAINER (`const sourceTrip: Trip = source.trip`) and left the FIELD:
  // `.id` was then read at the credit (`origin.sourceTripId`) and again inside `refileCityKey`'s
  // A-16 step 2 (`source.id === target.id`). A-24 Part 1's step 1 hoists the field and passes the
  // id into `refileCityKey` as a parameter.
  const t0 = a24Source();
  const gid = flipping(['trip-src']);
  const gown = flipping(['user:marta']);
  const T = { ...t0 };
  Object.defineProperty(T, 'id', { get: gid, enumerable: true, configurable: true });
  Object.defineProperty(T, 'ownerId', { get: gown, enumerable: true, configurable: true });
  attempt(() => core.copyStopInto(a24Target(), { trip: T, stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  note(`source Trip.id reads = ${gid.reads()}; source Trip.ownerId reads = ${gown.reads()}`);
  ok('R19-1 CLOSED: `source.trip.id` is read ONCE — the credit (§2.14 rule 7) and A-16 step 2\'s ' +
    'identity test are now the same read', gid.reads() === 1, `Trip.id reads = ${gid.reads()}`);
  ok('...and `source.trip.ownerId` is read once (the other half of the credit)',
    gown.reads() === 1, `reads = ${gown.reads()}`);
}

line('§1.2 R19-1\'s harm is gone — A-16 step 2 no longer fires on a key COINCIDENCE');
{
  const S = a24Source();                                   // its one city is `src-vienna`, Vienna
  let T = a24Target({ city: 'Prague' });
  // Two documents; one shared key; different cities — the coincidence A-16 refuses to treat as an
  // identity.
  T = { ...T, cities: [{ ...T.cities[0], key: SRC_CITY }],
        days: T.days.map((d) => ({ ...d, primaryCity: SRC_CITY, cities: [SRC_CITY] })) };
  note(`source city = ${S.cities[0].key} "${S.cities[0].name}" | target city = ${T.cities[0].key} "${T.cities[0].name}"`);

  const stable = core.copyStopInto(T, { trip: S, stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const sc = copied(stable);
  ok('the correct answer, with a stable `id`: two different documents, so step 2 does NOT fire, ' +
    '"vienna" does not fold onto "prague", and A-14 step 3 keeps the coordinate and writes NO ' +
    '`Place` row', stable.places.length === 0 && sc.place.kind === 'inline');

  const gid = flipping(['trip-src', 'trip-tgt']);
  const F = withAccessor(S, 'id', gid);
  const out = core.copyStopInto(T, { trip: F, stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const fc = copied(out);
  note(`FLIPPING : places = ${JSON.stringify(out.places.map((p) => [p.cityKey, p.name]))} | link = ${JSON.stringify(fc.place)} | id reads = ${gid.reads()}`);
  note(`           credit = ${JSON.stringify(fc.provenance.origin)}`);
  ok('R19-1 CLOSED, at the value level and not only the count: with `id` flipping ' +
    '`[trip-src, trip-tgt]` the outcome is byte-identical to the stable one — no `Place` row is ' +
    'written under the recipient\'s Prague key, and the credit still names `trip-src`. One read ' +
    'means the credit and the re-file cannot disagree',
    out.places.length === 0 && core.toJSON(out) === core.toJSON(stable).replaceAll('"' + sc.id + '"', '"' + fc.id + '"'),
    `${out.places.length} row(s); credit = ${fc.provenance.origin.sourceTripId}; link = ${JSON.stringify(fc.place)}`);
}

/* ============ §2 R19-2 — CLOSED: one traversal, one read of the Day ============= */

line('§2 R19-2 — the recipient\'s `Day.id` no longer decides twice');
{
  // A-24's step 1: `copyStop.ts`'s own `target.days.some((d) => d.id === dayId)` pre-check is
  // deleted and `addStop` → `withDay` owns the throw it already produces. The banned form was the
  // guard accepting a day `withDay` then threw on — core throwing because of what the RECIPIENT's
  // document contains (§2.1, R15-2).
  const T0 = a24Target();
  const dayIdAccessor = (t, i0, get) => ({ ...t, days: t.days.map((d, i) => (i === i0 ? withAccessor(d, 'id', get) : d)) });
  const idx = T0.days.findIndex((d) => d.id === '2026-08-08');
  for (const vs of [['2026-08-08', '2026-08-09'], ['2026-08-08', 'gone']]) {
    const g = flipping(vs);
    const r = attempt(() => core.copyStopInto(dayIdAccessor(T0, idx, g), { trip: a24Source(), stopId: 's-src' }, { ...SCHED }, CC(pfx())));
    note(`recipient day id flips ${JSON.stringify(vs)} -> reads ${g.reads()}, ${r.threw ? `threw ${r.threw.message}` : 'no throw'}`);
    ok('R19-2 CLOSED: no throw out of `copyStopInto` because of what the RECIPIENT\'s document ' +
      'contains', r.threw === null, r.threw?.message ?? '');
  }
  // The rule itself is unchanged: a genuinely missing day is still refused, and the target is
  // untouched behind the refusal. (The message and the id draw both move — BUILD-NOTES KD-50,
  // checked in `qa/r20-census-reach.mjs` §4.)
  const before = core.toJSON(T0);
  const r = attempt(() => core.copyStopInto(T0, { trip: a24Source(), stopId: 's-src' },
    { kind: 'scheduled', dayId: '2027-01-01', time: null, order: 0 }, CC(pfx())));
  ok('...and a genuinely missing day is still REFUSED, with the target byte-identical behind it',
    r.threw !== null && /no such day/.test(r.threw.message) && core.toJSON(T0) === before,
    r.threw?.message ?? 'no throw');
}

/* ============ §3 R19-3 — CLOSED: A-24 Part 1 opens the two `Trip`s ============== */

line('§3.1 QA\'s copy of the A-24 census agrees with the shipped `readOnce.test.ts`');
{
  const rows = runMatrix();
  const offenders = [];
  const observed = {};
  for (const { name, counts } of rows) {
    for (const [f, n] of Object.entries(counts)) {
      if (f in ALLOWED) observed[f] = Math.max(observed[f] ?? 0, n);
      if (n > 1 && (ALLOWED[f] === undefined || n > ALLOWED[f])) offenders.push(`${name}: ${f} ×${n}`);
    }
  }
  ok('no unnamed multi-read across the FOURTEEN scenarios, with the SEVEN-entry allow-list — the ' +
    'same result `readOnce.test.ts` asserts (A-23: a divergence between the two is itself a finding)',
    offenders.length === 0, JSON.stringify(offenders));
  ok('...and every one of the seven ALLOWED entries is observed at exactly its max, so nothing is ' +
    'padded and nothing is dead. Mutation-verified in a scratch worktree at `3d1be3b` for the two ' +
    'entries A-24 added: `tgtTrip.id` and `tgtTrip.revision` each go red on `max: 2 -> 1` (BOTH ' +
    'assertions) and on `max: 2 -> 3` (assertion 2 only)',
    Object.entries(ALLOWED).every(([f, m]) => observed[f] === m), JSON.stringify(observed));
  ok('...and no scenario throws', rows.every((r) => r.threw === null),
    JSON.stringify(rows.filter((r) => r.threw).map((r) => `${r.name}: ${r.threw.message}`)));
  ok('...and the matrix is fourteen rows', A24_MATRIX.length === 14, String(A24_MATRIX.length));
}

line('§3.2 R19-3 — the two fields that CROSS are now watched, and reverting R19-1 turns it red');
{
  // A-23's `opaque` set held both whole `Trip`s on the stated ground that they are "the document
  // skeleton rather than values that cross". A-24 Part 1 narrows it to the six collections,
  // because `Trip.id` and `Trip.ownerId` cross the person boundary verbatim into
  // `provenance.origin`.
  const rows = runMatrix();
  const watched = ['srcTrip.id', 'srcTrip.ownerId'];
  const seen = watched.filter((f) => rows.some(({ counts }) => (counts[f] ?? 0) > 0));
  ok('R19-3 CLOSED: `srcTrip.id` and `srcTrip.ownerId` are censused — the two fields that cross ' +
    'into `provenance.origin.sourceTripId` / `.friendUserId` are inside the guard for the first time',
    seen.length === 2, JSON.stringify(seen));
  const maxSrcId = Math.max(...rows.map(({ counts }) => counts['srcTrip.id'] ?? 0));
  ok('...and `srcTrip.id` is at 1 on every row, with NO allow-list entry written for it — A-24\'s ' +
    'discriminator: the source is never spread, so it has no irreducible floor',
    maxSrcId === 1 && !('srcTrip.id' in ALLOWED), `max = ${maxSrcId}`);
  note('two-sided, measured in a throwaway worktree at `3d1be3b` and discarded: restoring ' +
    '`packages/core/src/build/copyStop.ts` to `63a14d7` under the SHIPPED `readOnce.test.ts` turns ' +
    'it RED naming `srcTrip.id ×2` on 11 of the 14 rows — every row that reaches `refileCityKey`; ' +
    'rows 6, 7 and 8 correctly show 1, because they never call it. That is the census catching, ' +
    'mechanically, the defect this file produced for the sixth round running.');
  ok('...which is the acceptance criterion A-24 step 3 sets, re-derived by QA rather than taken ' +
    'from BUILD-NOTES', true, 'red with 63a14d7\'s copyStop.ts, green as shipped');
}

/* ===================== §4 R19-4 — CLOSED: rows 11–14 =========================== */

line('§4.1 R19-4 — row 11 delivers the cover row 5 could not');
{
  // Row 5's second cover is WITHDRAWN, not repaired: a same-named target row whose `at` is null
  // makes `samePlace` return true, so the copy takes the reuse branch and `placeForCopy` is never
  // called. Row 11 is "null coordinate, NO matching target row" — the shape of Jacob's own data
  // (the live planner has exactly one place with no coordinates, Windsor Great Park / Long Walk).
  const r5 = core.copyStopInto(
    a24Target({ places: [{ name: 'Habyt Vienna', at: null }] }),
    { trip: a24Source({ at: null }), stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  ok('row 5 still covers `samePlace`\'s null arm and nothing else: the target keeps its one row ' +
    'and the copy REUSES it', r5.places.length === 1, `${r5.places.length} row(s)`);
  const r11 = core.copyStopInto(a24Target(), { trip: a24Source({ at: null }), stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const written = r11.places.at(-1);
  note(`row 11 writes ${JSON.stringify([written.name, written.cityKey, written.at])}`);
  ok('R19-4 CLOSED (row 11): `placeForCopy`\'s `at === null` arm is now reached — a place with no ' +
    'coordinates copied where the target holds no matching row',
    r11.places.length === 1 && written.at === null && written.cityKey === TGT_CITY,
    JSON.stringify([written.name, written.cityKey, written.at]));
}

line('§4.2 R19-4 — rows 12, 13 and 14 each take the branch they claim');
{
  const built = A24_MATRIX.map(([n, b]) => [n, b()]);
  const sameDoc = built.filter(([, c]) => c.source.id === c.target.id);
  ok('row 12: the matrix copies WITHIN one document, so A-16 step 2 — the branch R19-1 subverted ' +
    'and the one §2.14 says Phase 1 exercises ("copying between two of your own trips") — is censused',
    sameDoc.length > 0, `${sameDoc.length} of ${built.length} scenarios copy within one document`);
  const r12 = core.copyStopInto(a24Source(), { trip: a24Source(), stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const p12 = r12.places.find((p) => p.name === 'Habyt Vienna');
  ok('  ...and it takes step 2 for real: the place is filed under the SOURCE\'S OWN key and the row ' +
    'is reused, with `validateTrip` reporting 0',
    r12.places.length === 1 && p12.cityKey === SRC_CITY && core.validateTrip(r12).length === 0,
    `${r12.places.length} row(s) under ${p12?.cityKey}; validateTrip ${core.validateTrip(r12).length}`);

  const pooled = built.filter(([, c]) => c.source.pool.some((s) => s.id === 's-src'));
  ok('row 13: the source stop is taken from the source\'s POOL, so `findAnywhere`\'s second arm is ' +
    'censused — the reference trip carries 31 pool stops, so this is the ordinary shape',
    pooled.length > 0, `${pooled.length} of ${built.length} scenarios take the stop from the pool`);

  const minimal = built.filter(([, c]) => {
    const s = c.source.days.flatMap((d) => d.stops).concat(c.source.pool).find((x) => x.id === 's-src');
    return s.cost === null && s.arrival === null && s.links === undefined && s.ticket === undefined;
  });
  ok('row 14: one row copies a MINIMAL stop, so the absent-optional arms (`cost === null`, ' +
    '`arrival === null`, `links`/`ticket` absent, a `Place` with no note and no hours) are censused ' +
    'rather than only the maximal document A-23 measured',
    minimal.length > 0, `${minimal.length} of ${built.length} scenarios copy a minimal stop`);
}

/* ================ §5 R19-5 — CLOSED: the fixture carries `ticket` =============== */

line('§5 R19-5 — the censused source stop carries 15 of `Stop`\'s 15 fields');
{
  const s = a24Source().days.flatMap((d) => d.stops).find((x) => x.id === 's-src');
  const modelFields = ['id', 'placement', 'name', 'category', 'place', 'note', 'cost', 'arrival',
    'travelRole', 'bookingId', 'flags', 'provenance', 'durationMins', 'links', 'ticket'];
  const missing = modelFields.filter((k) => !Object.hasOwn(s, k));
  note(`the censused source stop carries ${Object.keys(s).length} of ${modelFields.length} \`Stop\` fields; missing: ${JSON.stringify(missing)}`);
  ok('R19-5 CLOSED: the fixture populates every field of `Stop`, `ticket` included — the field ' +
    '§6.6 classifies as an access credential and rule 3 says never travels',
    missing.length === 0, JSON.stringify(missing));

  // And the rule-3 half: `copyStop.test.ts` now covers all three `Ticket` kinds.
  const cs = readFileSync(new URL('../packages/core/test/copyStop.test.ts', import.meta.url), 'utf8');
  const kinds = ['bundled', 'url', 'attachment'].filter((k) => new RegExp(`kind: '${k}'`).test(cs));
  ok('...and `copyStop.test.ts`\'s rule-3 fixture is parameterised over all THREE `Ticket` kinds, ' +
    'with a compile-time `Record<Ticket[\'kind\'], true>` stop for a fourth',
    kinds.length === 3 && /Record<Ticket\['kind'\], true>/.test(cs), JSON.stringify(kinds));

  // The regression A-24 Part 3 names, from the other side: no ticket payload of any kind reaches
  // the recipient.
  for (const t of [{ kind: 'bundled', path: 'tickets/x-4471.pdf', label: 'E' },
                   { kind: 'url', href: 'https://example.test/secret-9c3f', label: 'E', verifiedAt: null, verifiedBy: null },
                   { kind: 'attachment', mailMessageId: 'msg-mailbox-9c3f', filename: 'bp-XX00XX0X.pdf', label: 'E' }]) {
    let src = a24Source();
    src = core.addStop(src, { kind: 'scheduled', dayId: '2026-08-09', time: '09:00', order: 0 },
      { id: 's-tkt', name: 'Ticketed', category: 'sight', place: { kind: 'none' }, ticket: t }, C(pfx()));
    const out = core.copyStopInto(a24Target(), { trip: src, stopId: 's-tkt' }, { ...SCHED }, CC(pfx()));
    const json = core.toJSON(out);
    const payloads = [t.path, t.href, t.mailMessageId, t.filename].filter(Boolean);
    ok(`  ...and no \`${t.kind}\` ticket payload reaches the recipient's document`,
      copied(out).ticket === undefined && payloads.every((p) => !json.includes(p)),
      JSON.stringify(payloads.filter((p) => json.includes(p))));
  }
}

/* ============= §6 R19-6 — A-23's printed ×3, re-derived from the tree =========== */

line('§6 R19-6 — A-23\'s "srcPlace.at.lat ×3 in scenario 3" is ×4, and the mechanism says so');
{
  // A-22 Part 2 states the mechanism: pre-fix, `samePlace` read `b.at.lat` ONCE PER CANDIDATE ROW
  // and `placeForCopy` read it again, so the count was N+1. A-24 Part 4 corrected the number in
  // the ruling itself; this line stays as the standing confirmation that it is cosmetic.
  const counts = {};
  const ids = core.sequentialIds('copy-');
  const opaque = new Set([ids]);
  const t0 = a24Target({ places: [
    { name: 'Habyt Vienna', at: { lat: 40, lng: 40 } }, { name: 'Habyt Vienna', at: { lat: 41, lng: 41 } },
    { name: 'Habyt Vienna', at: { lat: 42, lng: 42 } }] });
  const tgtTrip = { ...t0, places: t0.places.map((p, i) => censusDeep(p, counts, `tgtPlace${i}`, opaque)) };
  const s0 = a24Source();
  const srcTrip = { ...s0, places: s0.places.map((p) => censusDeep(p, counts, 'srcPlace', opaque)) };
  opaque.add(srcTrip); opaque.add(tgtTrip);
  core.copyStopInto(tgtTrip, { trip: srcTrip, stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const candidates = [0, 1, 2].filter((i) => (counts[`tgtPlace${i}.at`] ?? 0) > 0).length;
  note(`scenario 3: ${candidates} candidate rows reach \`samePlace\`'s coordinate arm; ` +
    `srcPlace.at.lat is read ${counts['srcPlace.at.lat']}× on the FIXED tree (constant in N, A-22 Part 2)`);
  ok('R19-6 CLOSED (cosmetic): the pre-fix count in scenario 3 is N+1 = 4, and A-24 Part 4 ' +
    'corrected the ruling in place. A-22 Part 2\'s own table states "4/1 at N = 3" correctly and no ' +
    'shipped assertion ever read the 3',
    candidates === 3 && counts['srcPlace.at.lat'] === 2,
    `N = ${candidates}, so pre-fix = N+1 = ${candidates + 1}; post-fix = ${counts['srcPlace.at.lat']}`);
}

/* ================== §7 what A-23/A-24 DO catch, and the ceilings ================ */

line('§7.1 the census catches everything inside its roots — recorded');
{
  // Round 19 planted 20 read-once defects inside A-23's five roots; every one turned
  // `readOnce.test.ts` red and fourteen left `copyStop.test.ts` green. Round 20 re-ran the six
  // that were planted OUTSIDE them against the A-24 census, in a throwaway worktree at `3d1be3b`:
  const NOW_CAUGHT = [
    'double-read `sourceTrip.id`            (R19-1 — RED: `srcTrip.id ×2` on 11 of 14 rows)',
    'double-read `sourceTrip.ownerId`       (R19-3 — RED: `srcTrip.ownerId ×2`)',
    'emit `src.ticket` when kind===bundled  (R19-5 — RED in BOTH files)',
    'double-read on the A-16 step-2 path    (R19-4 — reached by row 12)',
    'double-read on a POOLED source stop    (R19-4 — reached by row 13)',
  ];
  for (const l of NOW_CAUGHT) note('  ' + l);
  ok('the four gaps round 19 demonstrated by planting a defect the guard should have caught are ' +
    'all inside the guard now', true, `${NOW_CAUGHT.length} shapes, all red under A-24`);
  note('what is still OUTSIDE it is round 20\'s subject — `qa/r20-census-reach.mjs`.');
}

line('§7.2 ceilings, `cairn-constraints` and the read-only boundary');
{
  ok('§2.10 export surface is still 71', Object.keys(core).length === 71, String(Object.keys(core).length));
  for (const s of ['censusDeep', 'censusTrip', 'TRIP_SKELETON', 'samePlace', 'placeForCopy', 'refileCityKey', 'ALLOWED']) {
    ok(`  ...and \`${s}\` is not on it — A-23's "tests do not create surface"`, !(s in core));
  }
  const src = readFileSync(new URL('../packages/core/test/readOnce.test.ts', import.meta.url), 'utf8');
  ok('the standing test imports the four public symbols from `../src/index.ts` and the two ' +
    'internals by module path, exactly as A-23 specifies',
    /from '\.\.\/src\/index\.ts'/.test(src) && /from '\.\.\/src\/build\/stops\.ts'/.test(src) &&
    /from '\.\.\/src\/model\/ids\.ts'/.test(src));
  ok('...and exports nothing itself', !/^export /m.test(src));
  // Round 21 (A-19 assertion 7): re-expressed 7 -> 8. A-25 Part 2 added `tgtCity0.key`, and
  // A-25 Part 6 clause 5 makes the count a standing ceiling — "no ninth `ALLOWED` entry and no
  // raised `max` in the pass that lands this or any later builder pass. A multi-read the eight
  // entries do not name is a finding routed to the architect." So this line pins BOTH halves.
  const allowedEntries = src.match(/\{ max: \d+, why:/g) ?? [];
  ok('...and holds A-25\'s eight ALLOWED entries and no ninth',
    allowedEntries.length === 8, String(allowedEntries.length));
  ok('  ...and every one of them is still `max: 2` — no `max` was raised (A-25 Part 6 clause 5)',
    allowedEntries.every((e) => /\{ max: 2, why:/.test(e)), allowedEntries.join(' | '));
  const copyStop = readFileSync(new URL('../packages/core/src/build/copyStop.ts', import.meta.url), 'utf8');
  const stripped = copyStop.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok('determinism: no `Date.now`, `Math.random` or `crypto.randomUUID` in either file',
    !/Date\.now|Math\.random|crypto\.randomUUID/.test(copyStop + src));
  ok('...and the standing test neither logs, fetches nor persists',
    !/fetch\(|localStorage|indexedDB|writeFileSync|console\./.test(src));
  ok('`copyStop.ts` still contains no `as string`', !/as string/.test(stripped));
  ok('...and, comments stripped, exactly one `{ ...x }` record spread — `{ ...target }`',
    (stripped.match(/\{ \.\.\.[a-zA-Z]/g) ?? []).length === 1,
    JSON.stringify(stripped.match(/\{ \.\.\.[a-zA-Z]+/g) ?? []));

  const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
  const { trip: ref } = loadEurope2026();
  const iss = core.validateTrip(ref);
  ok('the reference trip is unmoved at 11 `validateTrip` issues', iss.length === 11, String(iss.length));
  const cf = core.detectConflicts(ref, { today: FIXTURE_TODAY });
  const by = (sev) => cf.filter((c) => c.severity === sev).length;
  ok('...and 2 / 4 / 11 at FIXTURE_TODAY', by('blocker') === 2 && by('warning') === 4 && by('note') === 11,
    `${by('blocker')}/${by('warning')}/${by('note')}`);
  ok('...and it round-trips byte-identically', core.toJSON(core.fromJSON(core.toJSON(ref))) === core.toJSON(ref));
}

console.log('\n' + (fails ? `${fails} FAIL` : 'ALL OK'));
process.exitCode = 0;
