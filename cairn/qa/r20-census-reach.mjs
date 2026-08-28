/**
 * Round 20 — the breaker pass over ARCHITECTURE revision 18's **A-24** (the census's reach) plus
 * the two findings routed straight to a builder, **R19-1** and **R19-2**, and the builder's own
 * disclosed **KD-50**.
 *
 * Run: node --experimental-strip-types qa/r20-census-reach.mjs   (from cairn/)
 *
 * R19-1…R19-6 are all CLOSED and their closure is measured in `qa/r19-census-gaps.mjs`, which
 * round 20 re-expressed onto the shipped A-24 census (14 rows, `censusTrip`'s narrower `opaque`,
 * 7 allow-list entries) and which is now **ALL OK**. This file is the part that is new: A-24 is
 * itself a ruling about *how far a guard reaches*, and this round asks the same question of A-24
 * that A-24 asked of A-23.
 *
 *   §1  **R20-1** — A-24's amended maintenance rule (*"the fixture populating every field of both
 *       records is part of this contract"*) is **unenforced**. Nothing compile-time or test-time
 *       ties `readOnce.test.ts`'s fixture to `keyof Stop` / `keyof Place`. Demonstrated by adding
 *       a 16th field to `Stop` in a throwaway worktree: only `copyStop.test.ts` goes red, a
 *       builder satisfies it there, and a double read of the new field is then invisible to the
 *       census with the whole suite green. That is R19-5's loop, reproducing on the next field.
 *   §2  **R20-2** — the same gap one record UP, and created by A-24 Part 1 itself. The census's
 *       two new `Trip` roots carry **17 of `Trip`'s 18 keys**: `meta` is **absent** and `homeBase`
 *       is present but **`null`**. So `srcTrip.meta` may be read any number of times invisibly,
 *       and the whole `homeBase.at` subtree — a named home coordinate — is never entered at all.
 *       Two-sided: populate both on the fixture and the same plants go red.
 *   §3  **R20-3** — a live multi-read no ruling names and no guard can see: `refileCityKey`'s
 *       step-4 fold reads a **target** `City.order` twice, once in the comparison and once in the
 *       record the next iteration compares against. With three same-named target cities and an
 *       unstable `order`, the copied `Place` is filed under the wrong city and `validateTrip`
 *       reports 0.
 *   §4  **KD-50** — the builder's disclosed consequences of deleting `copyStop.ts`'s day
 *       pre-check, checked rather than accepted: the message, the id draws, the target behind the
 *       refusal, and whether any call site depends on either.
 *   §5  **R20-4** — A-24 Part 1's residue paragraph says *"Two known multi-reads therefore stay
 *       invisible"*. A fully-opened census finds **five**, two of which produce a divergent record.
 *   §6  **R20-5** — `qa/r14-horizon-copy.mjs` §7 pins `kds.length === 49`; this pass minted KD-50,
 *       so a probe that was ALL OK at `215aeee` is 1 FAIL at `3d1be3b`, and BUILD-NOTES' *"nothing
 *       in this pass went unrun"* is false for r14…r18.
 *   §7  Ceilings, `cairn-constraints`, and the attack list that did NOT break.
 *
 * A FAIL line means the probe found what it was looking for. Read the finding in
 * ../docs/QA-FINDINGS.md before assuming the script is broken. **8 FAIL by design** — R20-1 ×1,
 * R20-2 ×2, R20-3 ×2, R20-4 ×1, R20-5 ×1, plus KD-50's one cosmetic residue in §4. Every other
 * line is a confirmation that must stay at 0. Deterministic call sequences only, no races and no
 * sleeps. Nothing under `cairn/` is written by it.
 *
 * **Population bound, unchanged since round 16 and the reason every finding here is MINOR:** §2
 * and §3 need an **accessor property** on a caller-supplied value, which no JSON document and no
 * shipped caller can produce (`JSON.parse` makes own data properties; `TripDoc = string`;
 * `importDoc(text: string)` and `cli.ts` pass text; `apps/web`'s only `copyStopInto` call site
 * builds an object literal over a parsed document). §1 and §5 need no accessor at all — they are
 * gaps in the *guard* rather than defects in the guarded code.
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
const C = (p) => ({ ids: core.sequentialIds(p), now: '2026-01-01', actorUserId: 'user:marta' });
const CC = (p) => ({ ids: core.sequentialIds(p), today: '2026-04-01', actorUserId: 'user:jacob' });
const SCHED = { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 };
const SRC_CITY = 'src-vienna', TGT_CITY = 'tgt-city';
let seq = 0;
const pfx = () => 'r20-' + seq++;

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

/** The census fixtures as `readOnce.test.ts` builds them, plus the two knobs §2 needs. */
function source(opts = {}) {
  let t = core.createTrip({
    id: opts.id ?? 'trip-src', title: 'Marta in Vienna', ownerId: 'user:marta',
    startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: SRC_CITY, name: 'Vienna', centre: VIENNA, order: 0 }],
    ...(opts.homeBase ? { homeBase: { name: 'Los Angeles', at: { lat: 34.0522, lng: -118.2437 } } } : {}),
    ...(opts.meta ? { meta: { sourceHash: 'abc123', poolNotes: { [SRC_CITY]: { title: 'Optional', note: 'door PIN 0754' } } } } : {}),
  }, C('src-'));
  t = addPlace(t, {
    id: 'p-src', cityKey: SRC_CITY, name: 'Habyt Vienna',
    at: opts.at === undefined ? BELVEDERE : opts.at, category: 'stay',
    note: 'ordinary prose about the entrance',
    links: [{ label: 'Site', href: 'https://example.test/habyt' }],
    hours: { weekly: [{ day: 1, open: '09:00', close: '17:00' }], note: 'closed in winter' },
  });
  return core.addStop(t,
    opts.pool ? { kind: 'pool', cityKey: SRC_CITY } : { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    {
      id: 's-src', name: 'Check in', category: 'stay',
      place: opts.link ?? { kind: 'place', placeId: 'p-src' },
      note: 'Go early', flags: ['free'], durationMins: 90, travelRole: 'transfer',
      cost: { amounts: [{ lo: 10, hi: 20, currency: 'EUR', basis: 'per_person' }], display: '€10–20', note: 'tickets at the door' },
      arrival: { mode: 'metro', mins: 12, label: 'Bus 8' },
      links: [{ label: 'Menu', href: 'https://example.test/menu' }],
      ticket: { kind: 'bundled', path: 'tickets/entry.pdf', label: 'Entry' },
    }, C('src2-'));
}
function target(cfg = {}) {
  let t = core.createTrip({
    id: 'trip-tgt', title: 'Jacob', ownerId: 'user:jacob',
    startDate: '2026-08-07', endDate: '2026-08-09',
    cities: cfg.cities ?? [{ key: TGT_CITY, name: cfg.city ?? 'Vienna', centre: VIENNA, order: 0 }],
    ...(cfg.homeBase ? { homeBase: { name: 'London', at: { lat: 51.5, lng: -0.12 } } } : {}),
    ...(cfg.meta ? { meta: { sourceHash: 'zzz' } } : {}),
  }, C('tgt-'));
  for (const [i, p] of (cfg.places ?? []).entries()) {
    t = addPlace(t, { id: `p-tgt-${i}`, cityKey: TGT_CITY, name: p.name, at: p.at, category: 'stay' });
  }
  return t;
}

/* ===== §1 R20-1 — A-24's own maintenance rule is prose, not a test ============== */

line('§1 R20-1 — the fixture-completeness rule A-24 added is unenforced');
{
  // A-24 amends A-23's maintenance rule to: "a new field on `Stop` or `Place` is covered
  // automatically ONCE THE FIXTURE POPULATES IT, and the fixture populating every field of both
  // records is part of this contract." That sentence is the thing that would have prevented
  // R19-5. Nothing checks it.
  const ro = readFileSync(new URL('../packages/core/test/readOnce.test.ts', import.meta.url), 'utf8');
  const cs = readFileSync(new URL('../packages/core/test/copyStop.test.ts', import.meta.url), 'utf8');
  const idiom = /Record<keyof (Stop|Place|CostEstimate|MoveOverride|Money|Link)\s*,\s*true>/g;
  const inCopyStop = [...cs.matchAll(idiom)].map((m) => m[1]);
  const inReadOnce = [...ro.matchAll(idiom)].map((m) => m[1]);
  note(`\`copyStop.test.ts\` carries the key-set idiom for: ${JSON.stringify(inCopyStop)}`);
  note(`\`readOnce.test.ts\`  carries it for:               ${JSON.stringify(inReadOnce)}`);
  note('and `copyStop.test.ts`\'s own STOP_FIELDS assertion deliberately FILTERS `ticket` out ' +
    '(`Object.keys(STOP_FIELDS).filter((k) => k !== \'ticket\')`), so it pins a DIFFERENT fixture ' +
    'to a DIFFERENT list and cannot stand in for this one.');
  ok('R20-1: `readOnce.test.ts` asserts its own fixture carries every field of `Stop` and `Place` ' +
    '— the mechanism `copyStop.test.ts` has had since A-15 (`Record<keyof Place, true>` + a key-set ' +
    'assertion against the fixture INSTANCE), and the thing that turns A-24\'s amended maintenance ' +
    'rule from prose into a red test',
    inReadOnce.length > 0,
    'the census fixture is pinned to nothing; the rule is a sentence in a docstring');

  note('mutation-verified in a throwaway `git worktree add … 3d1be3b`, discarded, in four steps:');
  note('  1. add a 16th optional field to `Stop` (`voucher?: { code: string }`), written by');
  note('     `makeStop` only when truthy — exactly `ticket`\'s shape;');
  note('  2. `npm run typecheck` fails at ONE site: `copyStop.test.ts:1256` `STOP_FIELDS`');
  note('     (TS2741, "Property \'voucher\' is missing … in type Record<keyof Stop, true>");');
  note('  3. satisfy it the way a builder would — add `voucher: true`, exclude it from');
  note('     `STOP_FIELDS_THAT_CROSS` beside `ticket`: typecheck clean, **618/618 green**,');
  note('     `readOnce.test.ts`\'s fixture never touched;');
  note('  4. plant R19-5\'s exact shape on the new field (`src.voucher && src.voucher.code ? … : …`');
  note('     — tested, then emitted): `readOnce.test.ts` **2/2 GREEN**. The census cannot see it,');
  note('     for exactly the reason it could not see `ticket`.');
}

/* ===== §2 R20-2 — the two `Trip` roots A-24 added carry 15 of 17 fields ========= */

line('§2 R20-2 — the census\'s `Trip` roots do not carry `homeBase` or `meta`');
{
  // A-24 Part 1 refused "census `id` and `ownerId` by name" precisely because it "gives up A-23's
  // 'a new field is covered automatically' promise AT THE LEVEL WHERE A PHASE 2/3 FIELD WILL
  // ACTUALLY BE ADDED TO `Trip`". It then chose "census every own field except the six
  // collections" — which delivers that promise only for fields the fixture INSTANCE carries, and
  // the fixture is `createTrip` with no `homeBase` and no `meta`.
  const TRIP_FIELDS = ['id', 'title', 'ownerId', 'startDate', 'endDate', 'datePrecision',
    'homeCurrency', 'homeBase', 'party', 'cities', 'days', 'pool', 'places', 'bookings',
    'resolutions', 'revision', 'schemaVersion', 'meta'];
  const s = source(), t = target();
  const missS = TRIP_FIELDS.filter((k) => !Object.hasOwn(s, k));
  const missT = TRIP_FIELDS.filter((k) => !Object.hasOwn(t, k));
  note(`the censused source trip carries ${Object.keys(s).length} of ${TRIP_FIELDS.length} \`Trip\` fields; absent: ${JSON.stringify(missS)}`);
  note(`the censused target trip carries ${Object.keys(t).length} of ${TRIP_FIELDS.length}; absent: ${JSON.stringify(missT)}`);
  note(`and of the keys that ARE present, \`homeBase\` is \`${JSON.stringify(s.homeBase)}\` on both, so ` +
    '`censusDeep` stops at the null and nothing below it is ever counted.');
  ok('R20-2a: the census\'s two `Trip` roots populate every field of `Trip`, so A-24 Part 1\'s ' +
    'chosen candidate delivers the "a new field is covered automatically" promise it was chosen for',
    missS.length === 0 && missT.length === 0,
    `17 of 18 keys present; absent from both fixtures: ${JSON.stringify(missS)} — \`meta\` is ` +
    `\`TripMeta\`, an open \`[k: string]: unknown\` bag whose \`poolNotes\` is free text (KD-20's carrier class)`);
  ok('R20-2b: `Trip.homeBase` is non-null on at least one document, so the subtree below it — ' +
    '`homeBase.name` and `homeBase.at.lat`/`.lng`, a NAMED HOME COORDINATE that §2.13 makes a ' +
    '`geoCheck` anchor and `BRIEF.md` classifies as data that must not leak — is inside the census',
    s.homeBase !== null || t.homeBase !== null,
    'both fixtures carry `homeBase: null`, so R18-5\'s hybrid-coordinate shape one level down is ' +
    'green by vacancy rather than by measurement');

  note('mutation-verified in a throwaway worktree at `3d1be3b`, discarded, BOTH directions:');
  note('  A. plant `sourceTrip.meta ? String(sourceTrip.meta.sourceHash) : \'\'` (and the same on');
  note('     `target`) at the top of `copyStopInto` — a double read of `Trip.meta` on BOTH');
  note('     documents: `readOnce.test.ts` **2/2 green**, whole suite **618/618 green**;');
  note('  B. plant R18-5\'s hybrid shape on the SOURCE\'s home coordinate —');
  note('     `sourceTrip.homeBase === null ? null : { lat: sourceTrip.homeBase.at.lat, lng:');
  note('     sourceTrip.homeBase.at.lng, n: sourceTrip.homeBase.name }`, four reads of a field');
  note('     that crosses no boundary today but is the trip\'s own start point:');
  note('     `readOnce.test.ts` **2/2 green**, whole suite **618/618 green**;');
  note('  C. run the SAME plants against a fixture that populates `homeBase` and `meta`:');
  note('     **RED**, naming `srcTrip.homeBase ×3`, `srcTrip.homeBase.at ×2`, `srcTrip.meta ×2`.');
  note('  So the fix is one line on each fixture and it needs NO eighth `ALLOWED` entry —');
  note('  measured over 12 further document shapes below, every `Trip` field stays at ≤1.');

  // The measurement behind that last sentence, run live: populate both fields on both documents
  // and confirm the shipped census stays green — i.e. widening the fixture costs no allowance.
  const TRIP_SKELETON = new Set(['days', 'cities', 'places', 'pool', 'bookings', 'resolutions']);
  const censusDeep = (v, counts, path, opaque) => {
    if (v === null || typeof v !== 'object' || opaque.has(v)) return v;
    const out = Array.isArray(v) ? [] : {};
    for (const k of Object.keys(v)) {
      const key = `${path}.${k}`;
      const child = censusDeep(v[k], counts, key, opaque);
      Object.defineProperty(out, k, { enumerable: true, configurable: true,
        get() { counts[key] = (counts[key] ?? 0) + 1; return child; } });
    }
    return out;
  };
  const censusTrip = (trip, counts, path, opaque) => {
    const out = {};
    for (const k of Object.keys(trip)) {
      const raw = trip[k];
      if (TRIP_SKELETON.has(k)) { out[k] = raw; continue; }
      const key = `${path}.${k}`;
      const child = censusDeep(raw, counts, key, opaque);
      Object.defineProperty(out, k, { enumerable: true, configurable: true,
        get() { counts[key] = (counts[key] ?? 0) + 1; return child; } });
    }
    return out;
  };
  const ALLOWED = { 'srcStop.place.kind': 2, 'srcPlace.at': 2, 'srcPlace.at.lat': 2,
    'srcPlace.at.lng': 2, 'srcPlace.name': 2, 'tgtTrip.id': 2, 'tgtTrip.revision': 2 };
  const WIDER = [
    ['W1 both documents carry homeBase + meta', () => ({ s: source({ homeBase: 1, meta: 1 }), t: target({ homeBase: 1, meta: 1 }), p: SCHED })],
    ['W2 source only', () => ({ s: source({ homeBase: 1, meta: 1 }), t: target(), p: SCHED })],
    ['W3 target only', () => ({ s: source(), t: target({ homeBase: 1, meta: 1 }), p: SCHED })],
    ['W4 target holds three cities, re-file folds onto the third by name', () => ({ s: source(), t: target({ cities: [
      { key: 'c1', name: 'Prague', centre: VIENNA, order: 0 }, { key: 'c2', name: 'Split', centre: VIENNA, order: 1 },
      { key: 'c3', name: 'Vienna', centre: VIENNA, order: 2 }] }), p: SCHED })],
    ['W5 pool placement, pooled source stop, inline link', () => ({ s: source({ pool: true, link: { kind: 'inline', at: { lat: 1, lng: 2 } } }), t: target(), p: { kind: 'pool', cityKey: TGT_CITY } })],
    ['W6 pool placement, TRANSIT, no hint', () => ({ s: source(), t: target(), p: { kind: 'pool', cityKey: TRANSIT_CITY_KEY } })],
    ['W7 scheduled placement, order out of range', () => ({ s: source(), t: target(), p: { kind: 'scheduled', dayId: '2026-08-08', time: null, order: 99 } })],
    ['W8 target holds five same-name rows', () => ({ s: source(), t: target({ places: [0, 1, 2, 3, 4].map((i) => ({ name: 'Habyt Vienna', at: { lat: 40 + i, lng: 40 + i } })) }), p: SCHED })],
    ['W9 same document, pooled source stop', () => ({ s: source({ pool: true }), t: source({ pool: true }), p: SCHED })],
    ['W10 null source coordinate, non-null same-name target row', () => ({ s: source({ at: null }), t: target({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] }), p: SCHED })],
  ];
  const hits = [];
  for (const [name, build] of WIDER) {
    const { s: s0, t: t0, p: placement } = build();
    const counts = {};
    const ids = core.sequentialIds('cp-');
    const opaque = new Set([ids]);
    const srcSub = { ...s0,
      days: s0.days.map((d) => ({ ...d, stops: d.stops.map((x) => (x.id === 's-src' ? censusDeep(x, counts, 'srcStop', opaque) : x)) })),
      pool: s0.pool.map((x) => (x.id === 's-src' ? censusDeep(x, counts, 'srcStop', opaque) : x)),
      places: s0.places.map((p, i) => censusDeep(p, counts, i === 0 ? 'srcPlace' : `srcPlace${i}`, opaque)) };
    const tgtSub = { ...t0, places: t0.places.map((p, i) => censusDeep(p, counts, `tgtPlace${i}`, opaque)) };
    const srcTrip = censusTrip(srcSub, counts, 'srcTrip', opaque);
    const tgtTrip = censusTrip(tgtSub, counts, 'tgtTrip', opaque);
    opaque.add(srcTrip); opaque.add(tgtTrip);
    const src2 = censusDeep({ trip: srcTrip, stopId: 's-src' }, counts, 'source', opaque);
    const ctx = censusDeep({ ids, today: '2026-08-25', actorUserId: 'user:jacob' }, counts, 'ctx', opaque);
    const r = attempt(() => core.copyStopInto(tgtTrip, src2, censusDeep(placement, counts, 'placement', opaque), ctx));
    if (r.threw) hits.push(`${name}: THREW ${r.threw.message}`);
    for (const [f, n] of Object.entries(counts)) {
      if (n > 1 && !(f in ALLOWED && n <= ALLOWED[f])) hits.push(`${name}: ${f} ×${n}`);
    }
  }
  ok('...and widening the fixture costs nothing: across TEN further document shapes — including ' +
    'both documents carrying `homeBase` and `meta` — the shipped seven-entry allow-list still ' +
    'holds and no scenario throws, so R20-2\'s fix is a fixture change and not a new allowance',
    hits.length === 0, JSON.stringify(hits));
}

/* ===== §3 R20-3 — refileCityKey's step-4 tie-break reads `order` twice ========== */

line('§3 R20-3 — a target `City.order` is read twice in `refileCityKey`\'s name fold');
{
  // copyStop.ts:355-358
  //   for (const c of target.cities) {
  //     if (normalizeCityName(c.name) !== wanted) continue;
  //     if (best === null || c.order < best.order) best = { key: c.key, order: c.order };
  //   }
  // `c.order` is COMPARED and then RECORDED, and the record is what the next iteration compares
  // against — A-21's banned form exactly: the value that was checked is not the value that is
  // used. A-16's tie-break ("the lowest `order` wins") is therefore decided on a number the
  // winning record does not carry.
  const sched = { kind: 'scheduled', dayId: '2026-08-08', time: null, order: 0 };
  const threeCities = (orders) => core.createTrip({
    id: 'trip-tgt', title: 'Jacob', ownerId: 'user:jacob',
    startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'A', name: 'Vienna', centre: VIENNA, order: orders[0] },
             { key: 'B', name: 'Vienna', centre: VIENNA, order: orders[1] },
             { key: 'C', name: 'Vienna', centre: VIENNA, order: orders[2] }],
  }, C(pfx()));

  const stable = core.copyStopInto(threeCities([5, 3, 4]), { trip: source(), stopId: 's-src' }, { ...sched }, CC(pfx()));
  const sKey = stable.places.at(-1).cityKey;
  note(`STABLE  : three same-named target cities at order 5/3/4 -> the place is filed under "${sKey}" (lowest order wins, A-16 step 4)`);

  const T0 = threeCities([5, 3, 4]);
  const g = flipping([3, 99]);
  const T = { ...T0, cities: [T0.cities[0], withAccessor(T0.cities[1], 'order', g), T0.cities[2]] };
  const out = core.copyStopInto(T, { trip: source(), stopId: 's-src' }, { ...sched }, CC(pfx()));
  const fKey = out.places.at(-1).cityKey;
  const issues = core.validateTrip(out);
  note(`FLIPPING: \`order\` on city B flips [3, 99] -> reads ${g.reads()}, the place is filed under "${fKey}"`);
  note(`          validateTrip on the recipient: ${issues.length} issues`);
  ok('R20-3: a target `City.order` is read ONCE inside `refileCityKey`\'s step-4 fold — the value ' +
    'compared is the value recorded, so the tie-break cannot be decided on a number the winning ' +
    'record does not carry',
    g.reads() === 1, `\`order\` reads = ${g.reads()} (compared at \`c.order < best.order\`, recorded at \`{ key: c.key, order: c.order }\`)`);
  ok('...and the copied `Place` is filed under the same city either way, so the harm is a count ' +
    'and not a mis-filing',
    fKey === sKey,
    `stable files under "${sKey}"; with the second read disagreeing it files under "${fKey}" — the ` +
    `recipient's OWN document, no person boundary, and \`validateTrip\` reports ${issues.length}`);
  note('Invisible to the guard in both directions: `readOnce.test.ts` does not census `cities` ' +
    'ROWS (A-24 Part 1\'s disclosed residue) and no row of the 14-row matrix builds a target with ' +
    'two same-named cities, so widening one without the other would still not reach it.');
}

/* ===== §4 KD-50 — the builder\'s disclosed consequences, checked ================= */

line('§4 KD-50 — deleting the day pre-check: the message, the id draws, and the target');
{
  // The pre-check `target.days.some((d) => d.id === dayId)` is gone and `addStop` → `withDay` owns
  // the refusal. BUILD-NOTES KD-50 discloses two consequences. Both are real; neither is a defect.
  const countingIds = (p) => { const inner = core.sequentialIds(p); const drawn = []; return { newId: (k) => { const v = inner.newId(k); drawn.push(v); return v; }, drawn }; };
  for (const [label, city] of [['a new `Place` row is needed', 'Vienna'], ['A-14 step 3, no `Place` row', 'Prague']]) {
    const T = target({ city });
    const before = core.toJSON(T);
    const ids = countingIds('kd-');
    const r = attempt(() => core.copyStopInto(T, { trip: source(), stopId: 's-src' },
      { kind: 'scheduled', dayId: '2027-01-01', time: null, order: 0 }, { ids, today: '2026-04-01', actorUserId: 'user:jacob' }));
    note(`[${label}] message "${r.threw.message}" · ids drawn ${JSON.stringify(ids.drawn)} · target byte-identical ${core.toJSON(T) === before} · revision ${T.revision}`);
    ok(`  KD-50 consequence 2 is bounded: the target is byte-identical behind the refusal (${label})`,
      core.toJSON(T) === before && ids.drawn.length <= 2);
  }
  // Consequence 1: the message. Nothing pattern-matches it, so the change is safe — but the three
  // refusals this one function can produce no longer share a family, and that IS a divergence.
  const msgs = {};
  msgs.day = attempt(() => core.copyStopInto(target(), { trip: source(), stopId: 's-src' }, { kind: 'scheduled', dayId: '2027-01-01', time: null, order: 0 }, CC(pfx()))).threw.message;
  msgs.city = attempt(() => core.copyStopInto(target(), { trip: source(), stopId: 's-src' }, { kind: 'pool', cityKey: 'no-such-city' }, CC(pfx()))).threw.message;
  msgs.stop = attempt(() => core.copyStopInto(target(), { trip: source(), stopId: 'no-such-stop' }, { ...SCHED }, CC(pfx()))).threw.message;
  for (const [k, v] of Object.entries(msgs)) note(`refusal (${k.padEnd(4)}): ${v}`);
  ok('KD-50 consequence 1 is safe: no call site in `packages/client`, `apps/web` or `cli.ts` ' +
    'pattern-matches the old text, and `copyStop.test.ts` asserts `/no such day/` — the rule, not ' +
    'the wording. Re-derived by grep across all three, plus `BrowsePane.tsx`, the one surface that ' +
    'renders `(e as Error).message` from this path',
    true, 'checked');
  ok('...and the three refusals `copyStopInto` can produce still share one message family — a ' +
    'user who sees one has the same information about which function refused and about which trip',
    /^copyStopInto:/.test(msgs.day) && /^copyStopInto:/.test(msgs.city) && /^copyStopInto:/.test(msgs.stop),
    `"${msgs.day}" names neither the function nor the trip, while the other two name both — cosmetic, ` +
    'disclosed at KD-50, recorded here so it is a decision rather than a drift');
  // Determinism, `cairn-constraints` §4: the id gap is unobservable.
  const ids = countingIds('z-');
  const T = target();
  attempt(() => core.copyStopInto(T, { trip: source(), stopId: 's-src' }, { kind: 'scheduled', dayId: '2027-01-01', time: null, order: 0 }, { ids, today: '2026-04-01', actorUserId: 'user:jacob' }));
  const out = core.copyStopInto(T, { trip: source(), stopId: 's-src' }, { kind: 'scheduled', dayId: '2026-08-08', time: null, order: 0 }, { ids, today: '2026-04-01', actorUserId: 'user:jacob' });
  const allIds = [...out.days.flatMap((d) => d.stops), ...out.pool].map((s) => s.id).concat(out.places.map((p) => p.id));
  note(`refuse-then-retry draws ${JSON.stringify(ids.drawn)}; the landed stop is ${copied(out).id}`);
  ok('...and the burnt ids are unobservable: a refused copy followed by a corrected retry mints ' +
    'FRESH ids, collides with nothing, and leaves `validateTrip` at 0. Ids are opaque (§2.1, A-10) ' +
    'and nothing in this system reads a gap in a sequence; `apps/web` mints from a stateless ' +
    'CSPRNG (`browserIds`), so there is no sequence to gap there at all',
    allIds.length === new Set(allIds).size && core.validateTrip(out).length === 0,
    JSON.stringify(ids.drawn));
}

/* ===== §5 R20-4 — the residue A-24 discloses is smaller than the residue ======== */

line('§5 R20-4 — A-24 names two invisible multi-reads; a fully-opened census finds five');
{
  // A-24 Part 1: "It does not census the ROWS of `days` and `cities`. TWO KNOWN MULTI-READS
  // THEREFORE STAY INVISIBLE: the recipient's `Day.id` (R19-2) and QA's recorded
  // `tgtTrip.cities.0.key ×2` on the pool-placement path." Measured over the 14 rows plus two
  // shapes with same-named target cities, with NOTHING opaque but the `IdFactory`:
  const censusDeep = (v, counts, path, opaque) => {
    if (v === null || typeof v !== 'object' || opaque.has(v)) return v;
    const out = Array.isArray(v) ? [] : {};
    for (const k of Object.keys(v)) {
      const key = `${path}.${k}`;
      const child = censusDeep(v[k], counts, key, opaque);
      Object.defineProperty(out, k, { enumerable: true, configurable: true,
        get() { counts[key] = (counts[key] ?? 0) + 1; return child; } });
    }
    return out;
  };
  const ROWS = [
    ['1', () => ({ s: source(), t: target(), p: SCHED })],
    ['2', () => ({ s: source(), t: target({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] }), p: SCHED })],
    ['4', () => ({ s: source(), t: target({ city: 'Prague' }), p: SCHED })],
    ['7', () => ({ s: source({ link: { kind: 'inline', at: { lat: 1, lng: 2 } } }), t: target(), p: SCHED })],
    ['9', () => ({ s: source(), t: target(), p: { kind: 'pool', cityKey: TGT_CITY, hint: { dayId: '2026-08-08', time: '11:00', order: 0 } } })],
    ['12', () => ({ s: source(), t: source(), p: SCHED })],
    ['X two same-named target cities', () => ({ s: source(), t: target({ cities: [
      { key: 'a', name: 'Vienna', centre: VIENNA, order: 1 }, { key: 'b', name: 'Vienna', centre: VIENNA, order: 0 }] }), p: { kind: 'pool', cityKey: 'a' } })],
  ];
  const agg = {};
  for (const [name, build] of ROWS) {
    const { s: s0, t: t0, p: placement } = build();
    const counts = {};
    const ids = core.sequentialIds('cp-');
    const opaque = new Set([ids]);
    const srcTrip = censusDeep(s0, counts, 'srcTrip', opaque);
    const tgtTrip = censusDeep(t0, counts, 'tgtTrip', opaque);
    const src2 = censusDeep({ trip: srcTrip, stopId: 's-src' }, counts, 'source', new Set([...opaque, srcTrip]));
    const ctx = censusDeep({ ids, today: '2026-08-25', actorUserId: 'user:jacob' }, counts, 'ctx', opaque);
    attempt(() => core.copyStopInto(tgtTrip, src2, censusDeep(placement, counts, 'placement', opaque), ctx));
    for (const [f, n] of Object.entries(counts)) if (n > 1) (agg[f] ??= {})[name] = n;
  }
  // Only the SCALAR leaves matter: an array or a row counted twice is the skeleton scanning A-23
  // blessed in writing. A scalar counted twice is a value that was checked and then re-read.
  const SCALARS = Object.keys(agg).filter((f) => /^tgtTrip\.(days|cities)\.\d+/.test(f) &&
    !/\.(days|cities|stops|places|pool|bookings|resolutions)$/.test(f) && !/\.\d+$/.test(f)).sort();
  for (const f of SCALARS) note(`${f.padEnd(40)} ${JSON.stringify(agg[f])}`);
  const DISCLOSED = ['tgtTrip.days.1.id', 'tgtTrip.cities.0.key'];
  const undisclosed = SCALARS.filter((f) => !DISCLOSED.includes(f));
  ok('R20-4: A-24 Part 1\'s residue paragraph names every multi-read the narrowed `opaque` still ' +
    'cannot see, so a future reader can trust the disclosure the way the ruling asks them to',
    undisclosed.length === 0,
    `${SCALARS.length} scalar paths, ${undisclosed.length} of them undisclosed: ${JSON.stringify(undisclosed)}`);
  note('Two of the undisclosed ones produce a DIVERGENT RECORD under a flipping accessor, not just ' +
    'a count: `cities.<n>.order` (§3 above, the tie-break) and `days.<n>.stops.<m>.placement` — ' +
    '`reindex`/`insertionIndex` in `stops.ts`, which A-22 Part 1(b) puts inside this traversal. ' +
    'With the recipient\'s own stop\'s `placement` flipping, the ordering decision is taken on one ' +
    'read and the rebuilt record keeps the `time` from another, so the user\'s own day renders out ' +
    'of time order. Both are the RECIPIENT\'S OWN values, which is why both are MINOR.');
}

/* ===== §6 R20-5 — a green probe this pass turned red without saying so ========== */

line('§6 R20-5 — `qa/r14-horizon-copy.mjs` §7\'s KD ceiling is now red');
{
  const notes = readFileSync(new URL('../docs/BUILD-NOTES.md', import.meta.url), 'utf8');
  const kds = [...notes.matchAll(/^### (KD-(\d+))\b/gm)].map((m) => Number(m[2]));
  const contiguous = kds.every((n, i) => n === i + 1);
  const r14 = readFileSync(new URL('./r14-horizon-copy.mjs', import.meta.url), 'utf8');
  const pinned = Number((/kds\.length === (\d+)/.exec(r14) ?? [])[1]);
  note(`BUILD-NOTES now holds ${kds.length} KDs (contiguous: ${contiguous}); r14's §7 pins ${pinned}`);
  note('Two earlier builder passes declined to mint a KD *because of this exact line* and said so ' +
    'in writing (BUILD-NOTES: "No KD was minted: `qa/r14-horizon-copy.mjs` §7 pins ' +
    '`kds.length === 49`, so a KD-50 would turn a green probe line red"). This pass minted KD-50 ' +
    '— correctly, it is a real divergence worth recording — and its Numbers row does not record ' +
    'running r14…r18 at all, while its "What I did not verify" row says "nothing in this pass ' +
    'went unrun".');
  ok('R20-5: `qa/r14-horizon-copy.mjs` is still ALL OK, so the regression sweep BUILD-NOTES claims ' +
    'is the sweep that was run', pinned === kds.length,
    `r14 §7 pins ${pinned}, BUILD-NOTES holds ${kds.length} — 1 FAIL, and the fix is a one-character ` +
    're-expression of QA\'s own ceiling (A-19 assertion 7), not a change to the KD');
  ok('...and the KD ids themselves are contiguous and unique, so the finding is the STALE CEILING ' +
    'and not the KD', contiguous && new Set(kds).size === kds.length, kds.join(','));
}

/* ===== §7 ceilings and the attack list that did not break ====================== */

line('§7 ceilings, `cairn-constraints`, and what did NOT break');
{
  ok('§2.10 export surface is still 71', Object.keys(core).length === 71, String(Object.keys(core).length));
  const copyStop = readFileSync(new URL('../packages/core/src/build/copyStop.ts', import.meta.url), 'utf8');
  const stripped = copyStop.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok('determinism: no `Date.now`, `Math.random` or `crypto.randomUUID` in `copyStop.ts`',
    !/Date\.now|Math\.random|crypto\.randomUUID/.test(copyStop));
  ok('...and `copyStop.ts` still holds no `as string` and exactly one `{ ...x }` record spread',
    !/as string/.test(stripped) && (stripped.match(/\{ \.\.\.[a-zA-Z]/g) ?? []).length === 1);

  // Jacob's own data through the changed path, end to end.
  const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
  const { trip: ref } = loadEurope2026();
  const all = [...ref.days.flatMap((d) => d.stops), ...ref.pool];
  const CREDS = ['0754', '4809', '5814731574', '5175904714', 'YZGDTS', 'GYGG45MLA9Q9'];
  let threw = 0, leaked = 0;
  for (const s of all) {
    const p = s.place.kind === 'place' ? ref.places.find((q) => q.id === s.place.placeId) : null;
    const city = p ? ref.cities.find((c) => c.key === p.cityKey) : ref.cities[0];
    const T = core.createTrip({ id: 'trip-j2', title: 'Second trip', ownerId: 'user:jacob',
      startDate: '2026-08-07', endDate: '2026-08-22',
      cities: [{ name: city ? city.name : 'Vienna', centre: { lat: 0, lng: 0 }, order: 0 }] }, C(pfx()));
    const r = attempt(() => core.copyStopInto(T, { trip: ref, stopId: s.id }, { kind: 'scheduled', dayId: '2026-08-09', time: null, order: 0 }, CC(pfx())));
    if (r.threw) { threw += 1; continue; }
    if (copied(r.out).ticket !== undefined) leaked += 1;
    const json = core.toJSON(r.out);
    if (CREDS.some((c) => json.includes(c))) leaked += 1;
  }
  ok(`every one of the reference trip's ${all.length} real stops (112 scheduled + 31 pooled — ` +
    'overnight legs, five multi-city days, seven ticketed stops) copies into a fresh trip without ' +
    'throwing, and no `Ticket` and no door PIN / booking reference crosses',
    threw === 0 && leaked === 0, `${threw} threw, ${leaked} leaked`);
  const windsor = ref.places.filter((p) => p.at === null);
  ok('...and the reference trip still holds exactly one place with no coordinates (Windsor Great ' +
    'Park / Long Walk), which is what census row 11 exists to model',
    windsor.length === 1, JSON.stringify(windsor.map((p) => p.name)));
  const noCities = core.createTrip({ id: 'trip-nc', title: 'No cities', ownerId: 'user:jacob',
    startDate: '2026-08-07', endDate: '2026-08-09' }, C(pfx()));
  const s0 = all.find((x) => x.place.kind === 'place');
  const outNC = core.copyStopInto(noCities, { trip: ref, stopId: s0.id }, { kind: 'scheduled', dayId: '2026-08-08', time: null, order: 0 }, CC(pfx()));
  ok('...and copying into a target with ZERO cities takes A-14 step 3: no `Place` row, the ' +
    'coordinate travels inline, `validateTrip` reports 0',
    outNC.places.length === 0 && copied(outNC).place.kind === 'inline' && core.validateTrip(outNC).length === 0,
    `${outNC.places.length} row(s), link ${JSON.stringify(copied(outNC).place.kind)}, ${core.validateTrip(outNC).length} issues`);
}

console.log('\n' + (fails ? `${fails} FAIL` : 'ALL OK'));
process.exitCode = 0;
