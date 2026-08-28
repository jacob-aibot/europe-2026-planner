/**
 * Round 19 — the breaker pass over ARCHITECTURE revision 17's **A-22** (the five sites A-21 and
 * A-21a's "exhaustive" searches missed) and **A-23** (the standing census,
 * `packages/core/test/readOnce.test.ts`).
 *
 * Run: node --experimental-strip-types qa/r19-census-gaps.mjs   (from cairn/)
 *
 * A-22's five fixes and A-21's original claims are re-derived in `qa/r18-readonce.mjs`, which is
 * now **ALL OK** after round 19 re-expressed its §2.3 and §3.5 per A-22's own instruction. This
 * file is the part round 18 could not do: it attacks **A-23's mechanism**, not the code A-23
 * guards. A-23 was built because two consecutive rulings printed "exhaustive" and were not, so
 * the question this round has to answer is *does the census reach everything a hand search
 * missed* — and the honest way to ask it is to look for the sites the census's own roots exclude.
 *
 *   §1  **R19-1** — the sixth site, found by widening the census, not by reading the diff:
 *       `source.trip.id` is read TWICE on the shipped tree, and read 1 is the CREDIT while read 2
 *       is A-16 step 2's same-document identity test. With the two reads disagreeing a place is
 *       filed under a city key match that A-16 rules is *"a coincidence, not an identity"*.
 *   §2  **R19-2** — the recipient's own `Day.id` is read twice across the one traversal
 *       `copyStopInto` → `addStop`: the guard in `copyStop.ts` passes and `withDay` then throws.
 *       Same class as R18-4 (`samePlace` reading the recipient's row), one record over.
 *   §3  **R19-3** — why neither is in `readOnce.test.ts`'s offender list: A-23's `opaque` set makes
 *       the whole `Trip` invisible, and the ruling's stated reason for that (*"the document
 *       skeleton rather than values that cross"*) is false for `Trip.id` and `Trip.ownerId`, which
 *       cross verbatim into `provenance.origin`.
 *   §4  **R19-4** — the ten-row matrix's reach: scenario 5 does not deliver the second cover A-23's
 *       own table assigns it, and three ordinary document shapes are unreached.
 *   §5  **R19-5** — `Stop.ticket` is invisible to the census, because the census enumerates the
 *       fixture's keys and A-23's fixture list omits the one field §6.6 calls a credential.
 *   §6  **R19-6** — A-23's printed `srcPlace.at.lat ×3` re-derived as ×4, from the shipped tree.
 *   §7  What A-23 DOES catch, and the ceilings.
 *
 * A FAIL line means the probe found what it was looking for. Read the finding in
 * ../docs/QA-FINDINGS.md before assuming the script is broken.
 *
 * **Population bound, unchanged from rounds 17 and 18 and the reason every finding here is
 * MINOR:** §1, §2 and the mutations behind §3 need an **accessor property** on a caller-supplied
 * value. `JSON.parse` produces own data properties and never accessors, `TripDoc = string`,
 * `importDoc(text: string)` and `cli.ts` both pass text, and `apps/web`'s only `copyStopInto` call
 * site builds `{ trip: browsing, stopId: stop.id }` as an object literal over a parsed document.
 * The population is an in-process caller past the type system. §4 and §5 need no accessor at all —
 * they are gaps in the guard rather than defects in the guarded code.
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

/* ===================== the A-23 fixture, rebuilt here =========================== */
/* A-23 says in writing that `readOnce.test.ts` and QA's own copy are two measurements of one
 * mechanism and *"a divergence between the two is itself a finding"*. §3.1 below therefore
 * reproduces the shipped test's ten scenarios byte-for-byte and cross-checks the result before it
 * uses them for anything, so a drift in either file surfaces as a FAIL rather than as a silent
 * disagreement. */
const SRC_CITY = 'src-vienna', TGT_CITY = 'tgt-city';
function a23Source(opts = {}) {
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
  return core.addStop(t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 }, {
    id: 's-src', name: 'Check in', category: 'stay',
    place: opts.link ?? { kind: 'place', placeId: 'p-src' },
    note: 'Go early', flags: ['free'], durationMins: 90, travelRole: 'transfer',
    cost: { amounts: [{ lo: 10, hi: 20, currency: 'EUR', basis: 'per_person' }], display: '€10–20', note: 'tickets at the door' },
    arrival: { mode: 'metro', mins: 12, label: 'Bus 8' },
    links: [{ label: 'Menu', href: 'https://example.test/menu' }],
  }, C('src2-'));
}
function a23Target(cfg = {}) {
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
const A23_MATRIX = [
  ["1 · place · re-filed · NEW row", () => ({ source: a23Source(), target: a23Target(), placement: SCHED })],
  ["2 · place · re-filed · row REUSED", () => ({ source: a23Source(), target: a23Target({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] }), placement: SCHED })],
  ["3 · place · 3 same-name target rows", () => ({ source: a23Source(), target: a23Target({ places: [
    { name: 'Habyt Vienna', at: { lat: 40, lng: 40 } }, { name: 'Habyt Vienna', at: { lat: 41, lng: 41 } },
    { name: 'Habyt Vienna', at: { lat: 42, lng: 42 } }] }), placement: SCHED })],
  ["4 · place · A-14 step 3", () => ({ source: a23Source(), target: a23Target({ city: 'Prague' }), placement: SCHED })],
  ["5 · place · null coordinate", () => ({ source: a23Source({ at: null }), target: a23Target({ places: [{ name: 'Habyt Vienna', at: null }] }), placement: SCHED })],
  ["6 · place · dangling placeId", () => ({ source: a23Source({ link: { kind: 'place', placeId: 'no-such-place' } }), target: a23Target(), placement: SCHED })],
  ["7 · inline", () => ({ source: a23Source({ link: { kind: 'inline', at: { lat: 1, lng: 2 } } }), target: a23Target(), placement: SCHED })],
  ["8 · none", () => ({ source: a23Source({ link: { kind: 'none' } }), target: a23Target(), placement: SCHED })],
  ["9 · pool, LIVE hint", () => ({ source: a23Source(), target: a23Target(), placement: { kind: 'pool', cityKey: TGT_CITY, hint: { dayId: '2026-08-08', time: '11:00', order: 0 } } })],
  ["10 · pool, TRANSIT + stale hint", () => ({ source: a23Source(), target: a23Target(), placement: { kind: 'pool', cityKey: TRANSIT_CITY_KEY, hint: { dayId: '2099-01-01', time: '11:00', order: 0 } } })],
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

/** `deep === false` reproduces the SHIPPED roots; `deep === true` opens the `Trip` containers. */
function runMatrix(deep) {
  const rows = [];
  for (const [name, build] of A23_MATRIX) {
    const { source: s0, target: t0, placement } = build();
    const counts = {};
    const ids = core.sequentialIds('copy-');
    const opaque = new Set([ids]);
    let srcTrip, tgtTrip;
    if (deep) {
      srcTrip = censusDeep(s0, counts, 'srcTrip', opaque);
      tgtTrip = censusDeep(t0, counts, 'tgtTrip', opaque);
    } else {
      srcTrip = { ...s0,
        days: s0.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === 's-src' ? censusDeep(s, counts, 'srcStop', opaque) : s)) })),
        places: s0.places.map((p, i) => censusDeep(p, counts, i === 0 ? 'srcPlace' : `srcPlace${i}`, opaque)) };
      tgtTrip = { ...t0, places: t0.places.map((p, i) => censusDeep(p, counts, `tgtPlace${i}`, opaque)) };
      opaque.add(srcTrip); opaque.add(tgtTrip);
    }
    const source = censusDeep({ trip: srcTrip, stopId: 's-src' }, counts, 'source', new Set([...opaque, srcTrip]));
    const ctx = censusDeep({ ids, today: '2026-08-25', actorUserId: 'user:jacob' }, counts, 'ctx', opaque);
    const placed = censusDeep(placement, counts, 'placement', opaque);
    const r = attempt(() => core.copyStopInto(tgtTrip, source, placed, ctx));
    rows.push({ name, counts: { ...counts }, threw: r.threw, out: r.out });
  }
  return rows;
}

/* ============ §1 R19-1 — the sixth site: `source.trip.id`, read twice ============ */

line('§1.1 R19-1 — `source.trip.id` is read TWICE on the shipped tree at 215aeee');
{
  // A-22 Part 1's own comment enumerates the five old reads of `source.trip` and names two of them
  // by site: "`origin.sourceTripId`" and "`refileCityKey`". It hoisted the CONTAINER into
  // `sourceTrip` and stopped there. Both of those sites then read `.id` off that container — the
  // credit at `copyStop.ts:509`, and A-16 step 2's identity test inside `refileCityKey` at :330,
  // reached from :558. So the ruling fixed WHICH DOCUMENT and left WHICH ID.
  const t0 = a23Source();
  const gid = flipping(['trip-src']);
  const gown = flipping(['user:marta']);
  const T = { ...t0 };
  Object.defineProperty(T, 'id', { get: gid, enumerable: true, configurable: true });
  Object.defineProperty(T, 'ownerId', { get: gown, enumerable: true, configurable: true });
  attempt(() => core.copyStopInto(a23Target(), { trip: T, stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  note(`source Trip.id reads = ${gid.reads()}; source Trip.ownerId reads = ${gown.reads()}`);
  ok('R19-1: `source.trip.id` is read ONCE — A-21\'s rule, applied to the field A-22 Part 1 hoisted ' +
    'the container of but not the field itself. Read 1 is `provenance.origin.sourceTripId` (the ' +
    'CREDIT, §2.14 rule 7); read 2 is `refileCityKey`\'s `source.id === target.id`, which is the ' +
    'conjunct A-16 says "turns key equality into an identity"',
    gid.reads() === 1, `Trip.id reads = ${gid.reads()}`);
  ok('...and `source.trip.ownerId` is read once (the other half of the credit) — recorded, so a ' +
    'future round knows this half was checked', gown.reads() === 1, `reads = ${gown.reads()}`);
}

line('§1.2 R19-1\'s harm — A-16 step 2 fires on a key COINCIDENCE, and the place is filed under it');
{
  // A-16, in its own words: "a bare key match between two documents is a coincidence — every
  // deterministic IdFactory in this repo mints `city-1` in every document it builds. The
  // same-document conjunct is what turns key equality into an identity." That conjunct is read 2.
  const S = a23Source();                                   // its one city is `src-vienna`, Vienna
  let T = a23Target({ city: 'Prague' });
  // Force the collision A-16 calls a coincidence. Two documents; one shared key; different cities.
  T = { ...T, cities: [{ ...T.cities[0], key: SRC_CITY }],
        days: T.days.map((d) => ({ ...d, primaryCity: SRC_CITY, cities: [SRC_CITY] })) };
  note(`source city = ${S.cities[0].key} "${S.cities[0].name}" | target city = ${T.cities[0].key} "${T.cities[0].name}"`);

  const stable = core.copyStopInto(T, { trip: S, stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const sc = copied(stable);
  note(`STABLE   : places = ${JSON.stringify(stable.places.map((p) => [p.cityKey, p.name]))} | link = ${JSON.stringify(sc.place)}`);
  ok('the correct answer, with a stable `id`: two different documents, so step 2 does NOT fire, ' +
    '"vienna" does not fold onto "prague", and A-14 step 3 keeps the coordinate and writes NO ' +
    '`Place` row — the ruling working as designed',
    stable.places.length === 0 && sc.place.kind === 'inline');

  const gid = flipping(['trip-src', 'trip-tgt']);
  const F = withAccessor(S, 'id', gid);
  const out = core.copyStopInto(T, { trip: F, stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const fc = copied(out);
  note(`FLIPPING : places = ${JSON.stringify(out.places.map((p) => [p.cityKey, p.name]))} | link = ${JSON.stringify(fc.place)} | id reads = ${gid.reads()}`);
  note(`           credit = ${JSON.stringify(fc.provenance.origin)}`);
  const issues = core.validateTrip(out);
  note(`           validateTrip on the recipient: ${issues.length} issues`);
  ok('R19-1: the credit names `trip-src` (read 1) while the re-file decides "the source IS the ' +
    'target" (read 2), so a Vienna `Place` is written into the recipient\'s document filed under ' +
    'the key their PRAGUE city holds — the exact papering-over A-16 refuses, `validateTrip` says ' +
    'nothing, and a `Place` carries no provenance (A-6) so no view can tell',
    out.places.length === 0,
    `${out.places.length} row(s) written: ${JSON.stringify(out.places.map((p) => `${p.name} filed under ${p.cityKey} = "${T.cities[0].name}"`))}; ` +
    `credit = ${fc.provenance.origin.sourceTripId}; validateTrip = ${issues.length}`);
}

/* ====== §2 R19-2 — the recipient's own `Day.id`, across one traversal ============ */

line('§2 R19-2 — the recipient\'s `Day.id` is read twice: `copyStop.ts`\'s guard, then `withDay`');
{
  // A-22 Part 1(b) settles the scope question in writing: "`requireActor` validating read 1 while
  // `addStop` receives read 2 is the banned form on its face" — so a `copyStopInto` → `addStop`
  // traversal is ONE traversal for this rule. `copyStop.ts:480` asks
  // `target.days.some((d) => d.id === dayId)`; `addStop` then calls `withDay(trip, dayId, …)`,
  // which asks the same rows again. R18-4 is the same class one record over (`samePlace` reading
  // the RECIPIENT's `Place.at`), and §2.1 is the rule: core throws on programmer error, never on
  // what a document contains.
  const T0 = a23Target();
  const dayIdAccessor = (t, i0, get) => ({ ...t, days: t.days.map((d, i) => (i === i0 ? withAccessor(d, 'id', get) : d)) });
  const idx = T0.days.findIndex((d) => d.id === '2026-08-08');
  for (const vs of [['2026-08-08', '2026-08-09'], ['2026-08-08', 'gone']]) {
    const g = flipping(vs);
    const r = attempt(() => core.copyStopInto(dayIdAccessor(T0, idx, g), { trip: a23Source(), stopId: 's-src' }, { ...SCHED }, CC(pfx())));
    note(`recipient day id flips ${JSON.stringify(vs)} -> reads ${g.reads()}, ${r.threw ? `threw ${r.threw.message}` : 'no throw'}`);
    ok(`R19-2: \`copyStopInto\`'s own guard says the day exists and \`withDay\` then throws ` +
      `\`no such day\` — naming the day the guard just accepted — because of what the RECIPIENT's ` +
      `document contains (§2.1, R15-2, R18-4)`, r.threw === null, r.threw?.message ?? '');
  }
}

/* ========= §3 R19-3 — what A-23's five roots structurally cannot reach =========== */

line('§3.1 the shipped census, reproduced here — A-23 says a divergence between the two is a finding');
{
  const rows = runMatrix(false);
  const ALLOWED = { 'srcStop.place.kind': 2, 'srcPlace.at': 2, 'srcPlace.at.lat': 2, 'srcPlace.at.lng': 2, 'srcPlace.name': 2 };
  const offenders = [];
  const observed = {};
  for (const { name, counts } of rows) {
    for (const [f, n] of Object.entries(counts)) {
      if (f in ALLOWED) observed[f] = Math.max(observed[f] ?? 0, n);
      if (n > 1 && (ALLOWED[f] === undefined || n > ALLOWED[f])) offenders.push(`${name}: ${f} ×${n}`);
    }
  }
  ok('QA\'s copy of A-23\'s census agrees with `packages/core/test/readOnce.test.ts`: no unnamed ' +
    'multi-read across the ten scenarios', offenders.length === 0, JSON.stringify(offenders));
  ok('...and every ALLOWED entry is observed at exactly its max, so the allow-list is tight rather ' +
    'than padded (each `max: 2 -> 1` turns BOTH assertions red; each `2 -> 3` turns assertion 2 ' +
    'red — mutation-verified in a scratch worktree)',
    Object.entries(ALLOWED).every(([f, m]) => observed[f] === m), JSON.stringify(observed));
  ok('...and no scenario throws', rows.every((r) => r.threw === null),
    JSON.stringify(rows.filter((r) => r.threw).map((r) => `${r.name}: ${r.threw.message}`)));
}

line('§3.2 R19-3 — the same census with the `Trip` containers OPENED: what the five roots exclude');
{
  const deep = runMatrix(true);
  const agg = {};
  for (const { name, counts } of deep) {
    for (const [f, n] of Object.entries(counts)) if (n > 1) (agg[f] ??= {})[name] = n;
  }
  // Everything the shipped roots (`srcStop`, `srcPlace*`, `tgtPlace*`, `source`, `placement`,
  // `ctx`) can never name, because `opaque` holds both whole `Trip`s.
  const unreachable = (f) =>
    !f.startsWith('source.') && !f.startsWith('ctx.') && !f.startsWith('placement.') &&
    !/^srcTrip\.places\.\d+/.test(f) && !/^tgtTrip\.places\.\d+/.test(f) &&
    !/^srcTrip\.days\.\d+\.stops\.\d+/.test(f);
  const blind = Object.keys(agg).filter(unreachable).sort();
  for (const f of blind) note(`${f.padEnd(30)} ${JSON.stringify(agg[f])}`);
  note('of that list, most ARE the legitimate skeleton scanning A-23 blessed — `tgtTrip.days`, ' +
    '`tgtTrip.cities`, `tgtTrip.places` and the `{ ...target }` / `withDay` record spreads that ' +
    'read every field of the recipient\'s trip once each. The two that are NOT are `srcTrip.id` ' +
    '(§1, R19-1) and `tgtTrip.days.<n>.id` (§2, R19-2). The point of this section is not the list: ' +
    'it is that NOTHING on it, benign or not, can ever reach the offender list.');
  ok('R19-3: A-23\'s `opaque` set holds both whole `Trip`s, so NO field of either document\'s own ' +
    'record — `Trip.id`, `Trip.ownerId`, a `City` row, a `Day` row — can ever appear in the ' +
    'offender list. `readOnce.test.ts` is green on the shipped tree and green on every one of the ' +
    'four mutations round 19 planted in exactly those fields',
    blind.length === 0, JSON.stringify(blind));

  // The ruling's stated reason for the opaque set is that the `Trip` containers are "the document
  // skeleton rather than values that cross". That is false for two of their fields, measured:
  const out = core.copyStopInto(a23Target(), { trip: a23Source(), stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const origin = copied(out).provenance.origin;
  note(`the copied stop's credit = ${JSON.stringify(origin)}`);
  ok('...and A-23\'s stated justification for making the `Trip` opaque — "the document skeleton ' +
    'rather than values that cross" — is FALSE for `Trip.id` and `Trip.ownerId`: both cross the ' +
    'person boundary verbatim, into `provenance.origin.sourceTripId` and `.friendUserId`, which ' +
    'is the field §2.14 rule 7 makes non-negotiable and R18-1 was filed over',
    origin.sourceTripId !== 'trip-src' && origin.friendUserId !== 'user:marta',
    `sourceTripId = ${origin.sourceTripId} (= source Trip.id), friendUserId = ${origin.friendUserId} (= source Trip.ownerId)`);
}

/* ============== §4 R19-4 — what the ten-row matrix does not reach ================ */

line('§4.1 R19-4 — scenario 5 does not deliver the second cover A-23\'s own table assigns it');
{
  // A-23's matrix table: row 5 = "{kind:'place'} · null coordinate, target row also null", and the
  // column "what it is the only cover for" reads "`samePlace`'s `null` arm, `placeForCopy`'s
  // `at === null`". Those two are mutually exclusive as written: a same-named target row with a
  // null `at` makes `samePlace` return TRUE, so the copy takes the REUSE branch and
  // `placeForCopy` is never called at all.
  const asShipped = core.copyStopInto(
    a23Target({ places: [{ name: 'Habyt Vienna', at: null }] }),
    { trip: a23Source({ at: null }), stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const rowsAfter = asShipped.places.length;
  note(`scenario 5 as shipped: target keeps ${rowsAfter} place row(s), the copy REUSES it — ` +
    `placeForCopy was never called, so its \`at === null\` arm is never taken`);

  // One character on the target row's name and the same source document takes the arm.
  const widened = core.copyStopInto(
    a23Target({ places: [{ name: 'Somewhere else', at: null }] }),
    { trip: a23Source({ at: null }), stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const written = widened.places.at(-1);
  note(`with the target row RENAMED: ${widened.places.length} rows, the new one is ` +
    `${JSON.stringify([written.name, written.cityKey, written.at])} — placeForCopy's null arm, taken`);
  ok('R19-4: A-23\'s row 5 covers `samePlace`\'s null arm but NOT `placeForCopy`\'s `at === null`, ' +
    'which its own table names as the row\'s second cover. Two-sided: deleting the `at === null ? ' +
    'null :` guard in `placeForCopy` leaves `readOnce.test.ts` GREEN as shipped and turns it RED ' +
    'the moment the target row is renamed (mutation-verified in a scratch worktree). This is the ' +
    'shape of Jacob\'s own data — the live planner has exactly one place with no coordinates',
    rowsAfter === 1 && written.at !== null,
    `as shipped the new-row path is never reached with a null coordinate (rows ${rowsAfter}, reuse); renamed, it is (at = ${JSON.stringify(written.at)})`);
}

line('§4.2 R19-4 — three ordinary document shapes the ten rows never build');
{
  const built = A23_MATRIX.map(([n, b]) => [n, b()]);
  const sameDoc = built.filter(([, c]) => c.source.id === c.target.id);
  ok('the matrix never copies WITHIN one document, so A-16 step 2 — `source.id === target.id && ' +
    'target.cities.some(…)`, the branch R19-1 subverts and the one §2.14 says Phase 1 exercises ' +
    '("copying between two of your own trips") — is never censused',
    sameDoc.length > 0, `${sameDoc.length} of 10 scenarios copy within one document`);
  const pooled = built.filter(([, c]) => c.source.pool.some((s) => s.id === 's-src'));
  ok('...and the source stop is always SCHEDULED, so `findAnywhere`\'s `trip.pool` arm is never ' +
    'censused — the reference trip carries 31 pool stops, so this is not an exotic shape',
    pooled.length > 0, `${pooled.length} of 10 scenarios take the stop from the source's pool`);
  const minimal = built.filter(([, c]) => {
    const s = c.source.days.flatMap((d) => d.stops).find((x) => x.id === 's-src');
    return s.cost === null || s.arrival === null || s.links === undefined;
  });
  ok('...and every scenario\'s source stop carries EVERY optional field, so the `cost === null` / ' +
    '`arrival === null` / `links` absent arms — an ordinary hand-typed stop — are never censused. ' +
    'A-23 populates the fixture maximally so the recursion has something to count; the cost is ' +
    'that the census only ever measures a maximal document',
    minimal.length > 0, `${minimal.length} of 10 scenarios copy a stop with a missing optional field`);
}

/* ================ §5 R19-5 — the field the fixture does not carry =============== */

line('§5 R19-5 — `Stop.ticket` is invisible to the census, because the census enumerates keys');
{
  // A-23's maintenance rule promises: "A new field on `Stop` or `Place` is covered automatically,
  // because the census enumerates whatever the record carries." True only for fields the FIXTURE
  // INSTANCE carries. `makeStop` writes `ticket` only when `init.ticket` is truthy, and A-23's own
  // printed fixture list — "note, flags, durationMins, travelRole, cost …, arrival …, links" —
  // omits it. So the one field §6.6 classifies as an access credential is the one field of `Stop`
  // the census can never count.
  const s = a23Source().days.flatMap((d) => d.stops).find((x) => x.id === 's-src');
  const modelFields = ['id', 'placement', 'name', 'category', 'place', 'note', 'cost', 'arrival',
    'travelRole', 'bookingId', 'flags', 'provenance', 'durationMins', 'links', 'ticket'];
  const missing = modelFields.filter((k) => !Object.hasOwn(s, k));
  note(`A-23's source stop carries ${Object.keys(s).length} of ${modelFields.length} \`Stop\` fields; missing: ${JSON.stringify(missing)}`);
  ok('R19-5: A-23\'s fixture populates every field of `Stop`, so its promise that a new field is ' +
    '"covered automatically" holds', missing.length === 0, JSON.stringify(missing));

  // The population is ordinary: a ticketed stop round-trips through the parser.
  const withTicket = core.addStop(a23Source(), { kind: 'scheduled', dayId: '2026-08-09', time: '09:00', order: 0 }, {
    id: 's-tkt', name: 'Ticketed', category: 'sight', place: { kind: 'none' },
    ticket: { kind: 'bundled', path: 'tickets/x.pdf', label: 'Entry' },
  }, C(pfx()));
  const back = core.fromJSON(core.toJSON(withTicket));
  const parsed = back.days.flatMap((d) => d.stops).find((x) => x.id === 's-tkt');
  note(`a ticketed stop survives fromJSON(toJSON()): ticket = ${JSON.stringify(parsed.ticket)}`);
  ok('...and the population needs no accessor and no cast: `Stop.ticket` is a modelled field that ' +
    'survives the parser, so a copy-path regression that emitted only a `{kind:"bundled"}` ticket ' +
    'would pass the whole suite — `copyStop.test.ts`\'s rule-3 fixture pins only a `{kind:"url"}` ' +
    'ticket, and the census cannot see the field at all (mutation-verified: 615/615 green)',
    Object.hasOwn(s, 'ticket'), `the censused fixture stop has no \`ticket\` key`);
}

/* ============= §6 R19-6 — A-23's printed ×3, re-derived from the tree =========== */

line('§6 R19-6 — A-23\'s "srcPlace.at.lat ×3 in scenario 3" is ×4, and the mechanism says so');
{
  // A-22 Part 2 states the mechanism: pre-fix, `samePlace` read `b.at.lat` ONCE PER CANDIDATE ROW
  // and `placeForCopy` read it again, so the count was N+1. Its own prose then prints "4/1 at
  // N = 3". A-23's "Verified, not asserted" section prints ×3 for the same scenario. They cannot
  // both be right, and the mechanism decides it: measure N on the shipped tree.
  const counts = {};
  const ids = core.sequentialIds('copy-');
  const opaque = new Set([ids]);
  const t0 = a23Target({ places: [
    { name: 'Habyt Vienna', at: { lat: 40, lng: 40 } }, { name: 'Habyt Vienna', at: { lat: 41, lng: 41 } },
    { name: 'Habyt Vienna', at: { lat: 42, lng: 42 } }] });
  const tgtTrip = { ...t0, places: t0.places.map((p, i) => censusDeep(p, counts, `tgtPlace${i}`, opaque)) };
  const s0 = a23Source();
  const srcTrip = { ...s0, places: s0.places.map((p) => censusDeep(p, counts, 'srcPlace', opaque)) };
  opaque.add(srcTrip); opaque.add(tgtTrip);
  core.copyStopInto(tgtTrip, { trip: srcTrip, stopId: 's-src' }, { ...SCHED }, CC(pfx()));
  const candidates = [0, 1, 2].filter((i) => (counts[`tgtPlace${i}.at`] ?? 0) > 0).length;
  note(`scenario 3: ${candidates} candidate rows reach \`samePlace\`'s coordinate arm; ` +
    `srcPlace.at.lat is read ${counts['srcPlace.at.lat']}× on the FIXED tree (constant in N, A-22 Part 2)`);
  ok('R19-6: the pre-fix count in scenario 3 is N+1 = 4, not the 3 A-23\'s "Verified, not asserted" ' +
    'section prints. COSMETIC — an illustrative number in prose. A-22 Part 2\'s own table states ' +
    '"4/1 at N = 3" correctly, the mechanism (once per candidate row, plus `placeForCopy`) yields ' +
    '4, `qa/r18-readonce.mjs` §2.3 measured 1/2/4 at N = 0/1/3 when it was filed, and round 19 ' +
    're-derived ×4 by reverting `copyStop.ts` to 993d8fc under the shipped `readOnce.test.ts`. ' +
    'No behavioural claim depends on the 3',
    candidates === 3 && counts['srcPlace.at.lat'] === 2,
    `N = ${candidates}, so pre-fix = N+1 = ${candidates + 1}; post-fix = ${counts['srcPlace.at.lat']}`);
}

/* ================== §7 what A-23 DOES catch, and the ceilings =================== */

line('§7.1 A-23 catches everything inside its roots — 20 mutations, recorded');
{
  // Every line here was measured one at a time in a throwaway `git worktree add … 215aeee`,
  // discarded; nothing under `cairn/` was written. Baseline 2/2 and 85/85 before and after each.
  const CAUGHT = [
    'restore `sourceStopId: src.id` (R18-2)', 'restore `friendUserId: source.trip.ownerId` (R18-1)',
    'restore the inline `srcPlace.at` double read (R18-3)', 'restore `samePlace`\'s `a.at` reads (R18-4)',
    'un-clone the reuse probe\'s `at` (R18-5)', 'restore `ids: ctx.ids` in addStop opts (Part 1(b))',
    'restore `now: ctx.today` in addStop opts (Part 1(b))', 'restore `actorUserId: ctx.actorUserId` (Part 1(b))',
    're-read `c.note` in costForCopy', 're-read `a.label` in arrivalForCopy',
    're-read `p.note` in placeForCopy', 're-read `l.href` in the Stop.links map',
    're-read `o.note` in hoursForCopy', 'call readWeeklyEntry twice in weeklyForCopy',
    'spread `flags` from `src.flags`', 're-read `src.provenance.confidence`',
    're-read `h.dayId` in the hint block', 're-read `a.name` in samePlace (recipient row)',
    're-read `a.lo` in the cost.amounts map', 're-read `srcPlace.placeId` in the find predicate',
  ];
  const MISSED = [
    'double-read `sourceTrip.ownerId` (R19-3)', 'double-read `sourceTrip.id` (R19-1)',
    'double-read a target `City.name` in refileCityKey (R19-3)',
    'emit `src.ticket` when `kind === "bundled"` (R19-5)',
    'double-read `original.cityKey` on the A-16 step-2 path only (R19-4)',
    'double-read `src.place` when the source stop is in the POOL (R19-4)',
  ];
  note(`${CAUGHT.length} planted read-once defects inside A-23's roots: every one turns ` +
    `\`readOnce.test.ts\` RED. Fourteen of the twenty leave \`copyStop.test.ts\` 85/85 GREEN, which ` +
    `is the census earning its place beside the value fixtures rather than duplicating them.`);
  note(`${MISSED.length} planted outside them: every one leaves BOTH files green, and four leave ` +
    `the whole 615-test suite green.`);
  ok('A-23\'s mechanism works on everything its roots reach — including all three `ctx` fields, ' +
    'which no value-based fixture can reach without pinning a fact about `addStop`', true,
    `${CAUGHT.length} caught / ${MISSED.length} missed`);
  ok('...and the "no dead allowance" half is live in BOTH directions and survives matrix loss: ' +
    'un-cloning the probe\'s `at` with scenario 3 DELETED from the matrix is still red, via ' +
    'assertion 2', true, 'mutation-verified');
}

line('§7.2 ceilings, `cairn-constraints` and the read-only boundary');
{
  ok('§2.10 export surface is still 71', Object.keys(core).length === 71, String(Object.keys(core).length));
  for (const s of ['censusDeep', 'samePlace', 'placeForCopy', 'refileCityKey', 'ALLOWED']) {
    ok(`  ...and \`${s}\` is not on it — A-23's "tests do not create surface"`, !(s in core));
  }
  const src = readFileSync(new URL('../packages/core/test/readOnce.test.ts', import.meta.url), 'utf8');
  ok('the standing test imports the four public symbols from `../src/index.ts` and the two ' +
    'internals by module path, exactly as A-23 specifies',
    /from '\.\.\/src\/index\.ts'/.test(src) && /from '\.\.\/src\/build\/stops\.ts'/.test(src) &&
    /from '\.\.\/src\/model\/ids\.ts'/.test(src));
  ok('...and exports nothing itself', !/^export /m.test(src));
  const copyStop = readFileSync(new URL('../packages/core/src/build/copyStop.ts', import.meta.url), 'utf8');
  const stripped = copyStop.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok('determinism: no `Date.now`, `Math.random` or `crypto.randomUUID` in either file the A-22/A-23 ' +
    'diff touched', !/Date\.now|Math\.random|crypto\.randomUUID/.test(copyStop + src));
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
