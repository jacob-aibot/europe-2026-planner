/**
 * Round 18 — the mandatory breaker pass over ARCHITECTURE revision 16's **A-21** ("within one
 * traversal, a field of a caller-supplied value is read exactly once") and its addendum **A-21a**
 * ("Part 4's rule is total — the one block it printed as *verbatim* is not exempt").
 *
 * Run: node --experimental-strip-types qa/r18-readonce.mjs   (from cairn/)
 *
 * The rulings claim an **exhaustive** search of `model/openingHours.ts`, `serialize/fromJSON.ts`,
 * `serialize/toJSON.ts`'s `hours` half and `build/copyStop.ts`. This probe verifies that claim
 * rather than trusting it, and the method is the one the rulings themselves use: run the shipped
 * bodies against accessor properties and **count reads**, never read the diff.
 *
 *   §1  A mechanical read-count CENSUS of every field `copyStopInto` touches on a caller-supplied
 *       record — the source stop, its `PlaceLink`, the source `Place`, the `placement`, and the
 *       two argument objects `source` and `ctx`. Every field is wrapped in a counting getter that
 *       returns a STABLE value, so the census measures the shipped control flow and nothing else.
 *       This is what a grep over property accesses cannot do and what A-21's own residue paragraph
 *       says a reviewer must otherwise do by hand.
 *   §2  A-21a's read-count TABLE, re-derived path by path. It reproduces exactly — and §2.3 shows
 *       where its bound stops holding, one level below the granularity the table is written at.
 *   §3  The five sites the census finds above 1 that neither ruling names, each with its measured
 *       consequence. **R18-1 … R18-4 live here.**
 *   §4  A-21's core claim where it DOES hold: `readWeeklyEntry`, `isOpeningHours`, `hoursForCopy`,
 *       `costForCopy`, `weeklyForCopy`, `placeForCopy`, `toJSON`'s `hours()` and Part 4(c). Every
 *       one is re-derived here, so a future round knows which half of the file was checked.
 *   §5  Ceilings, `cairn-constraints` and the read-only boundary, re-derived by running.
 *
 * A FAIL line means the probe found what it was looking for. Read the finding in
 * ../docs/QA-FINDINGS.md before assuming the script is broken.
 *
 * Population bound, measured once and true of every finding below: this needs an **accessor
 * property** on a caller-supplied value. `JSON.parse` produces own data properties and never
 * accessors, `TripDoc = string`, `importDoc(text: string)` and `cli.ts` both pass text, and
 * `apps/web`'s only `copyStopInto` call site builds `{ trip: browsing, stopId: stop.id }` as an
 * object literal from a parsed document. So the whole population is an **in-process caller past
 * the type system** — the same population `place_hours_malformed` was ratified for and the same
 * one that made R16-1 and R17-1 MINOR rather than the R15-1 they structurally resemble.
 */
import { readFileSync } from 'node:fs';

const core = await import('../packages/core/src/index.ts');
const oh = await import('../packages/core/src/model/openingHours.ts');
const { addPlace } = await import('../packages/core/src/build/stops.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');

let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');
const note = (s) => console.log('  ' + s);

const C = (p) => ({ ids: core.sequentialIds(p), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
const CC = (p) => ({ ids: core.sequentialIds(p), today: '2026-04-01', actorUserId: core.LOCAL_OWNER });
const VIENNA = { lat: 48.2082, lng: 16.3738 };
const BELVEDERE = { lat: 48.1915, lng: 16.3806 };
const PIN = 'Front door PIN 0754, conf 5814731574 - ask jacob@example.test';
const CREDENTIALS = ['5814731574', 'GYGG45MLA9Q9', 'jacob@example.test', 'YZGDTS', '0754'];
const SCHED = { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 };
let seq = 0;
const pfx = () => 'r18-' + seq++;

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
/** Wrap every own enumerable field in a COUNTING getter that returns the same value. */
function census(obj, counts, label) {
  const o = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    Object.defineProperty(o, k, {
      get() { counts[label + '.' + k] = (counts[label + '.' + k] ?? 0) + 1; return v; },
      enumerable: true, configurable: true,
    });
  }
  return o;
}

function mintedTrip(id, city = 'Vienna', ownerId) {
  const t = core.createTrip({
    title: 'T', startDate: '2026-08-07', endDate: '2026-08-10',
    cities: [{ name: city, order: 0, centre: VIENNA }],
  }, C(pfx()));
  return { ...t, id, ...(ownerId ? { ownerId } : {}) };
}
/** One source trip: one city, one `Place`, one stop linked to it. */
function sourceTrip({ id = 'trip-src', ownerId, placeName = 'Habyt Vienna', placeNote, link } = {}) {
  let t = mintedTrip(id, 'Vienna', ownerId);
  t = addPlace(t, {
    id: 'p-src', cityKey: t.cities[0].key, name: placeName, at: BELVEDERE, category: 'stay',
    ...(placeNote ? { note: placeNote } : {}),
    hours: { weekly: [{ day: 1, open: '9:00', close: '17:00' }], note: 'h' },
  });
  return core.addStop(t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 }, {
    id: 's-src', name: 'Check in', category: 'stay',
    place: link ?? { kind: 'place', placeId: 'p-src' },
    note: 'a note',
    cost: { amounts: [{ lo: 1, hi: 2, currency: 'EUR', basis: 'per_person' }], display: '€25', note: 'cn' },
    arrival: { mode: 'walk', mins: 5, label: 'lbl' },
    links: [{ label: 'L', href: 'https://x.test/a' }], durationMins: 30,
  }, C(pfx()));
}
function targetTrip({ id = 'trip-tgt', city = 'Vienna', places = [] } = {}) {
  let t = mintedTrip(id, city);
  for (const [i, p] of places.entries()) {
    t = addPlace(t, { id: 'p-tgt' + i, cityKey: t.cities[0].key, name: p.name, at: p.at, category: 'stay' });
  }
  return t;
}
/** Replace the source stop with one whose `key` is an accessor. */
const stopWithAccessor = (t, key, get) => ({
  ...t,
  days: t.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === 's-src' ? withAccessor(s, key, get) : s)) })),
});
const linkWithAccessor = (t, key, get) => ({
  ...t,
  days: t.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === 's-src' ? { ...s, place: withAccessor(s.place, key, get) } : s)) })),
});
const placeWithAccessor = (t, key, get) => ({ ...t, places: t.places.map((p) => (p.id === 'p-src' ? withAccessor(p, key, get) : p)) });
const copied = (out) => out.days.flatMap((d) => d.stops).concat(out.pool).find((s) => s.provenance.source === 'friend');
const greppable = (t) => { const d = core.toJSON(t); return CREDENTIALS.filter((c) => d.includes(c)); };
const attempt = (fn) => { try { return { out: fn(), threw: null }; } catch (e) { return { out: null, threw: e }; } };

/* ============================ §1 the census ==================================== */

line('§1.1 read-count census — every field of every caller-supplied record `copyStopInto` touches');
{
  // Each row is one scenario, because the control flow through the place block differs per link
  // kind and per whether the target can re-file / already holds the place. A field wrapped here
  // returns a STABLE value, so nothing below is a fault injection — it is a measurement of the
  // shipped body, and it is the thing A-21's residue paragraph says a reviewer otherwise does by
  // hand over a 500-line file.
  const scenarios = [
    ['link=place · re-filed · NEW row', { city: 'Vienna', places: [] }, {}],
    ['link=place · re-filed · row REUSED', { city: 'Vienna', places: [{ name: 'Habyt Vienna', at: BELVEDERE }] }, {}],
    ['link=place · A-14 step 3 (target cannot re-file)', { city: 'Prague', places: [] }, {}],
    ['link=inline', { city: 'Vienna', places: [] }, { link: { kind: 'inline', at: { lat: 1, lng: 2 } } }],
    ['link=none', { city: 'Vienna', places: [] }, { link: { kind: 'none' } }],
  ];
  const seen = {};
  for (const [name, tgtCfg, srcCfg] of scenarios) {
    const counts = {};
    const t = sourceTrip(srcCfg);
    const srcStop = t.days.find((d) => d.id === '2026-08-08').stops[0];
    const wrappedLink = census(srcStop.place, counts, 'link');
    const wrappedStop = census(srcStop, counts, 'stop');
    Object.defineProperty(wrappedStop, 'place', {
      get() { counts['stop.place'] = (counts['stop.place'] ?? 0) + 1; return wrappedLink; },
      enumerable: true, configurable: true,
    });
    const src = {
      ...t,
      days: t.days.map((d) => (d.id === '2026-08-08' ? { ...d, stops: [wrappedStop] } : d)),
      places: [census(t.places[0], counts, 'place')],
    };
    const placement = census({ ...SCHED }, counts, 'placement');
    const source = census({ trip: src, stopId: 's-src' }, counts, 'source');
    const ctx = census(CC(pfx()), counts, 'ctx');
    attempt(() => core.copyStopInto(targetTrip(tgtCfg), source, placement, ctx));
    const over = Object.entries(counts).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
    note(`${name}: ${over.length ? over.map(([k, c]) => `${k}×${c}`).join('  ') : 'every field read once'}`);
    for (const [k, c] of over) seen[k] = Math.max(seen[k] ?? 0, c);
  }
  // The two the rulings BLESS. `srcPlace.kind` is A-21's discriminant carve-out (every branch
  // builds a fresh record; the worst an unstable kind yields is `{kind:'none'}`, a hole).
  // `place.at`/`place.name` at 2 on the new-row path is A-21a's written, bounded exception.
  const BLESSED = new Set(['link.kind', 'place.at', 'place.name']);
  const undisclosed = Object.entries(seen).filter(([k]) => !BLESSED.has(k)).sort();
  note(`fields read >1 that NEITHER ruling names: ${JSON.stringify(undisclosed)}`);
  ok('A-21 + A-21a claim an EXHAUSTIVE search of `build/copyStop.ts`: no field of a ' +
    'caller-supplied value is read more than once except the two carve-outs they write down',
    undisclosed.length === 0,
    `${undisclosed.length} sites the rulings do not name. R18-1…R18-4 in §3.`);
}

/* ================== §2 A-21a's read-count table, re-derived ==================== */

line('§2.1 A-21a\'s read-count table for `original`, path by path — re-derived, not read');
{
  // | path | cityKey | at | name | category/note/hours |
  // | link dangles      | 0 | 0 | 0 | 0 |
  // | step 3            | 1 | 1 | 0 | 0 |
  // | row reused        | 1 | 1 | 1 | 0 |
  // | new row written   | 1 | 2 | 2 | 1 each |
  const rows = [
    ['link dangles (no `original`)', { city: 'Vienna', places: [] }, 'dangle', { cityKey: 0, at: 0, name: 0, category: 0 }],
    ['step 3 — target cannot re-file', { city: 'Prague', places: [] }, 'ok', { cityKey: 1, at: 1, name: 0, category: 0 }],
    ['re-filed, existing row reused', { city: 'Vienna', places: [{ name: 'Habyt Vienna', at: BELVEDERE }] }, 'ok', { cityKey: 1, at: 1, name: 1, category: 0 }],
    ['re-filed, new row written', { city: 'Vienna', places: [] }, 'ok', { cityKey: 1, at: 2, name: 2, category: 1 }],
  ];
  for (const [label, tgtCfg, mode, expect] of rows) {
    const counts = {};
    const t = sourceTrip(mode === 'dangle' ? { link: { kind: 'place', placeId: 'no-such-place' } } : {});
    const src = { ...t, places: [census(t.places[0], counts, 'p')] };
    attempt(() => core.copyStopInto(targetTrip(tgtCfg), { trip: src, stopId: 's-src' }, { ...SCHED }, CC(pfx())));
    const got = { cityKey: counts['p.cityKey'] ?? 0, at: counts['p.at'] ?? 0, name: counts['p.name'] ?? 0, category: counts['p.category'] ?? 0 };
    ok(`A-21a's table row "${label}" — cityKey ${expect.cityKey}, at ${expect.at}, name ${expect.name}`,
      JSON.stringify(got) === JSON.stringify(expect), JSON.stringify(got));
  }
}

line('§2.2 A-21a\'s bound: the reuse-MISS residue is "a duplicate row", never a leak, never a throw');
{
  // The addendum's own measured consequence, re-derived: `at` flipping against a target that
  // already holds that place writes a DUPLICATE `Place` row, because the dedupe was computed on
  // a coordinate the row does not carry.
  const g = flipping([{ lat: 9, lng: 9 }, { lat: 1, lng: 2 }]);
  const r = attempt(() => core.copyStopInto(
    targetTrip({ places: [{ name: 'Habyt Vienna', at: { lat: 1, lng: 2 } }] }),
    { trip: placeWithAccessor(sourceTrip(), 'at', g), stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  note(`at flips [{9,9},{1,2}] against a target holding {1,2}: rows = ${r.out?.places.length}, reads = ${g.reads()}`);
  ok('the worst outcome really is a DUPLICATE row — not a throw, not a merge onto the wrong row',
    r.threw === null && r.out.places.length === 2 &&
    r.out.places.every((p) => p.at.lat === 1 && p.at.lng === 2), JSON.stringify(r.out?.places.map((p) => p.at)));

  // No throw, in either direction, on the reuse-miss path.
  for (const [what, vals] of [['read 2 is null', [{ lat: 1, lng: 2 }, null]], ['read 1 is null', [null, { lat: 3, lng: 4 }]]]) {
    const gg = flipping(vals);
    const rr = attempt(() => core.copyStopInto(targetTrip({}),
      { trip: placeWithAccessor(sourceTrip(), 'at', gg), stopId: 's-src' }, { ...SCHED }, CC(pfx())));
    ok(`...and it never throws when ${what}`, rr.threw === null, rr.threw?.message ?? '');
  }

  // No FALSE-POSITIVE merge: the reuse branch never re-reads, so the row it merges onto is the
  // row the value it compared actually matches.
  const gn = flipping(['Habyt Vienna', 'Somewhere Else']);
  const rn = attempt(() => core.copyStopInto(targetTrip({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] }),
    { trip: placeWithAccessor(sourceTrip(), 'name', gn), stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  ok('...and a flipping `name` cannot produce a wrong-but-plausible MERGE — the reuse branch ' +
    'reads `name` once, so `placeForCopy`\'s second read is never reached on it',
    rn.threw === null && gn.reads() === 1 && rn.out.places.length === 1, `name reads = ${gn.reads()}`);

  // And it is not a NEW leak: a STABLE cast crosses the identical string today, by A-15's
  // ratified policy that a place's name and coordinate are descriptions of the world.
  const stable = attempt(() => core.copyStopInto(targetTrip({}),
    { trip: placeWithAccessor(sourceTrip(), 'name', () => PIN), stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  ok('...and the `name` half is not a NEW leak: a STABLE hostile name crosses identically today ' +
    '(A-15: a place\'s name is a description of the world), so the residue is the INCONSISTENCY, ' +
    'not the crossing', greppable(stable.out).length > 0, JSON.stringify(greppable(stable.out)));
}

line('§2.3 R18-5 CLOSED — A-22 Part 2\'s corrected bound, one level below the table\'s granularity');
{
  // ROUND 19 RE-EXPRESSION (A-22's own instruction; A-19 assertion 7 — the builder edits nothing
  // under `qa/`, QA re-expresses its own probe). This section was written at `1d091a6`, where
  // `refiled` ALIASED the caller's `LatLng`: `samePlace` read `b.at.lat` once per candidate row
  // and `placeForCopy` read it again, so `original.at.lat` was read N+1 times with N controlled by
  // the RECIPIENT's document, and `&&`'s short-circuit read `lat` and `lng` a different number of
  // times as each other (measured 1/2/4 at N = 0/1/3 for `lat`, 1 for `lng`).
  //
  // A-22 Part 2 makes the probe carry a CLONE. The corrected claim — and what this section now
  // asserts — is `latReads === 2` AND `lngReads === 2`, CONSTANT IN N: one read by the probe, one
  // by `placeForCopy`, never two inside one function, never a count the other party controls.
  // The old assertion (`latReads === 1`) is not the fix and never was: driving that 2 to 1 would
  // change `placeForCopy`'s contract, which A-21a refused and A-22 does not reopen.
  const counts = [];
  for (const k of [0, 1, 3]) {
    const glat = flipping([BELVEDERE.lat, 10.0]);
    const glng = flipping([BELVEDERE.lng, 20.0]);
    const at = {};
    Object.defineProperty(at, 'lat', { get: glat, enumerable: true });
    Object.defineProperty(at, 'lng', { get: glng, enumerable: true });
    const places = Array.from({ length: k }, (_, i) => ({ name: 'Habyt Vienna', at: { lat: 40 + i, lng: 40 + i } }));
    const t = sourceTrip();
    const src = { ...t, places: [{ ...t.places[0], at }] };
    const r = attempt(() => core.copyStopInto(targetTrip({ places }), { trip: src, stopId: 's-src' }, { ...SCHED }, CC(pfx())));
    const written = r.out?.places.at(-1)?.at;
    counts.push({ candidates: k, latReads: glat.reads(), lngReads: glng.reads(), written });
    note(`${k} same-name candidate rows in the target -> lat read ${glat.reads()}×, lng read ${glng.reads()}×, row written ${JSON.stringify(written)}`);
  }
  ok('R18-5 CLOSED (A-22 Part 2): `original.at.lat` and `original.at.lng` are each read EXACTLY ' +
    'TWICE — the probe once, `placeForCopy` once — and the count is CONSTANT in N, the number of ' +
    'same-city, same-name rows in the RECIPIENT\'s document. A count the other party can raise is ' +
    'not a bound; this one they cannot',
    counts.every((c) => c.latReads === 2 && c.lngReads === 2),
    JSON.stringify(counts.map((c) => `${c.candidates}->lat ${c.latReads}/lng ${c.lngReads}`)));
  ok('...and `lat` and `lng` are read the SAME number of times as each other, so the short-circuit ' +
    'in `samePlace`\'s `&&` can no longer produce a HYBRID coordinate — the pair written is the ' +
    'pair one read produced, which restores A-21a\'s disclosed residue (a duplicate row) as the ' +
    'true one',
    counts.every((c) => c.latReads === c.lngReads) &&
    counts.every((c) => c.written === undefined ||
      (c.written.lat === 10.0 && c.written.lng === 20.0) ||
      (c.written.lat === BELVEDERE.lat && c.written.lng === BELVEDERE.lng)),
    JSON.stringify(counts.map((c) => c.written)));
}

/* ================= §3 the sites the census finds, with consequences ============= */

line('§3.1 R18-1 — `source.trip` is read FIVE times: the stop comes from one document, the CREDIT names another');
{
  // The five reads, in order: `findAnywhere(source.trip, …)`; `origin.friendUserId =
  // source.trip.ownerId`; `origin.sourceTripId = source.trip.id`; `source.trip.places.find(…)`;
  // `refileCityKey(source.trip, …)`. A-21 Part 4(c) states in writing that the rule covers the
  // one ARGUMENT too — "the rule for this file is only checkable if it is TOTAL" — and fixes
  // `placement.cityKey` for exactly this reason. `source` got no such pass.
  const A = sourceTrip({ id: 'trip-A', ownerId: 'local:alice' });
  const B = sourceTrip({ id: 'trip-B', ownerId: 'local:mallory' });
  const g = flipping([A, B]);
  const r = attempt(() => core.copyStopInto(targetTrip({}), { get trip() { return g(); }, stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  const st = copied(r.out);
  note(`source.trip reads = ${g.reads()}; the stop was FOUND in trip-A and CREDITED to ` +
    `${JSON.stringify(st?.provenance.origin)}`);
  note(`attribution() renders: ${JSON.stringify(core.attribution(st, r.out))}`);
  ok('R18-1: the stop found in Alice\'s document is credited to Mallory — `origin.friendUserId` ' +
    'and `origin.sourceTripId` are reads 2 and 3 of a field whose read 1 decided which stop was ' +
    'copied, and §2.14 rule 7 says the credit is what every view renders',
    st?.provenance.origin.friendUserId === 'local:alice' &&
    st?.provenance.origin.sourceTripId === 'trip-A',
    `credit = ${JSON.stringify(st?.provenance.origin)}; badge = ${core.displayStatus(st, '2026-04-01')}`);

  // Read 4 is `.places`, so the `Place` row the recipient keeps can come from a THIRD document —
  // one the credit does not name and the recipient never browsed. A `Place` has no provenance
  // (A-6), so nothing downstream can tell.
  const A2 = sourceTrip({ id: 'trip-A', ownerId: 'local:alice' });
  const C3 = sourceTrip({ id: 'trip-C', ownerId: 'local:carol', placeName: "Mallory's flat, keybox 4471" });
  const g2 = flipping([A2, A2, A2, C3, C3]);
  const r2 = attempt(() => core.copyStopInto(targetTrip({}), { get trip() { return g2(); }, stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  note(`place rows written: ${JSON.stringify(r2.out?.places.map((p) => p.name))}`);
  ok('...and read 4 (`source.trip.places`) can put a `Place` row from a THIRD document into the ' +
    'recipient\'s trip, credited to neither — a `Place` carries no provenance (A-6), so no view ' +
    'can tell', r2.out?.places.every((p) => p.name === 'Habyt Vienna'),
    JSON.stringify(r2.out?.places.map((p) => p.name)));
}

line('§3.2 R18-2 — `src.id` is tested by the `find` predicate and EMITTED as `origin.sourceStopId`');
{
  // `findAnywhere` matches on `x.id === stopId`; `provenance.origin.sourceStopId` is `src.id`
  // again. A-21's unsafe form, verbatim: "read 1 is validated or tested, and read 2 is used,
  // compared or emitted." A-21 Part 4 enumerates the `src.*` fields it hoists — `name`,
  // `category`, `note`, `cost`, `arrival`, `travelRole`, `flags`, `links`, `durationMins`,
  // `provenance.confidence` — and `id` is not among them.
  const g = flipping(['s-src', PIN]);
  const r = attempt(() => core.copyStopInto(targetTrip({}),
    { trip: stopWithAccessor(sourceTrip(), 'id', g), stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  const st = copied(r.out);
  note(`the caller named "s-src"; the recipient's document carries sourceStopId = ` +
    `${JSON.stringify(st?.provenance.origin.sourceStopId)} (reads = ${g.reads()})`);
  const round = attempt(() => core.fromJSON(core.toJSON(r.out)));
  ok('R18-2: a string the caller never named crosses into the recipient\'s ' +
    '`provenance.origin.sourceStopId`, survives `fromJSON(toJSON())`, and `validateTrip` reports ' +
    'nothing about it', st?.provenance.origin.sourceStopId === 's-src',
    `greppable in the recipient's export: ${JSON.stringify(greppable(r.out))}; ` +
    `round-trips: ${round.threw === null}; validateTrip: ${core.validateTrip(r.out, '2026-04-01').length} issues`);
}

line('§3.3 R18-3 — the `kind:\'inline\'` branch reads `srcPlace.at` TWICE (A-21a\'s defect, sibling branch)');
{
  // `place = { kind:'inline', at: { lat: srcPlace.at.lat, lng: srcPlace.at.lng } }` — the exact
  // shape A-21a upheld an objection over, in the same function, ~20 lines above the block it
  // fixed, and printed inside A-21 Part 4's own body.
  for (const [what, vals, expect] of [
    ['flips to null on read 2', [{ lat: 1, lng: 2 }, null], 'no throw'],
    ['flips to another coordinate', [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }], '{"lat":1,"lng":2}'],
  ]) {
    const g = flipping(vals);
    const r = attempt(() => core.copyStopInto(targetTrip({}),
      { trip: linkWithAccessor(sourceTrip({ link: { kind: 'inline', at: { lat: 1, lng: 2 } } }), 'at', g), stopId: 's-src' },
      { ...SCHED }, CC(pfx())));
    const got = r.threw ? `${r.threw.constructor.name}: ${r.threw.message}` : JSON.stringify(copied(r.out).place.at);
    note(`inline at ${what} (reads = ${g.reads()}) -> ${got}`);
    ok(`R18-3: an inline \`at\` that ${what} — ${expect === 'no throw'
      ? '`copyStopInto` must not throw on a document shape (§2.1, R15-2)'
      : 'the coordinate that crosses must be the one the `null` test saw'}`,
      expect === 'no throw' ? r.threw === null : got === expect, got);
  }
}

line('§3.4 R18-4 — `samePlace` reads `a.at` up to three times, where `a` is the RECIPIENT\'s own row');
{
  // `if (a.at === null || b.at === null) return a.at === b.at;` then `a.at.lat`, `a.at.lng`.
  const g = flipping([BELVEDERE, null]);
  const tgt = targetTrip({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] });
  const tgt2 = { ...tgt, places: [withAccessor(tgt.places[0], 'at', g)] };
  const r = attempt(() => core.copyStopInto(tgt2, { trip: sourceTrip(), stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  note(`recipient row \`at\` flips [coord, null] (reads = ${g.reads()}) -> ` +
    `${r.threw ? r.threw.constructor.name + ': ' + r.threw.message : 'no throw'}`);
  ok('R18-4: `copyStopInto` throws a raw `TypeError` out of core because of the shape of the ' +
    'TARGET document — §2.1 says nothing here throws on what a document contains, and R15-2 is ' +
    'the finding that established it', r.threw === null, r.threw?.message ?? '');
}

line('§3.5 the `ctx` trio — A-22 Part 1(b): re-expressed from "recorded, not filed" to a read count of 1');
{
  // ROUND 19 RE-EXPRESSION (A-22's own instruction). At `1d091a6` this section measured
  // `ctx.actorUserId` ×2 (`requireActor` validates read 1; `addStop`'s `opts.actorUserId` took
  // read 2), `ctx.today` ×2 and `ctx.ids` ×3, and recorded them rather than filing them: the
  // copied document was byte-identical either way. A-22 Part 1(b) reclassifies that — the reason
  // the second read was harmless was a property of `addStop`, not of `copyStopInto`, and A-21's
  // whole thesis is that a rule kept true by a fact about another function decays the day that
  // function changes. So the claim is no longer "unobservable"; it is a COUNT, and it is 1.
  //
  // This is the half of A-23 no value-based fixture can reach: measured in round 19's scratch
  // worktree, restoring any one of `ids: ctx.ids` / `now: ctx.today` / `actorUserId:
  // ctx.actorUserId` in `addStop`'s opts leaves `copyStop.test.ts` 85/85 GREEN and turns
  // `readOnce.test.ts` red. Hence both, side by side.
  const build = (ctx) => core.toJSON(core.copyStopInto(
    targetTrip({ id: 'trip-tgt' }), { trip: sourceTrip(), stopId: 's-src' }, { ...SCHED }, ctx));
  seq = 900; const stable = build({ ids: core.sequentialIds('fx'), today: '2026-04-01', actorUserId: core.LOCAL_OWNER });
  const cases = [
    ['ctx.actorUserId, flipping to ""', 'actorUserId', () => flipping([core.LOCAL_OWNER, ''])],
    ['ctx.actorUserId, flipping to a credential', 'actorUserId', () => flipping([core.LOCAL_OWNER, PIN])],
    ['ctx.today, flipping to 1999-01-01', 'today', () => flipping(['2026-04-01', '1999-01-01'])],
    ['ctx.ids, flipping to a second factory', 'ids', () => flipping([core.sequentialIds('fx'), core.sequentialIds('zz')])],
  ];
  for (const [what, field, mkg] of cases) {
    seq = 900;
    const g = mkg();
    const ctx = { ids: core.sequentialIds('fx'), today: '2026-04-01', actorUserId: core.LOCAL_OWNER };
    Object.defineProperty(ctx, field, { get: g, enumerable: true, configurable: true });
    const r = attempt(() => build(ctx));
    ok(`A-22 Part 1(b) CLOSED: \`${what}\` is read EXACTLY ONCE — the value \`requireActor\` ` +
      `validated (or \`provenance.addedAt\` carries, or \`newId\` came from) is the value ` +
      `\`addStop\`'s opts receive, and that is now a property of \`copyStopInto\` rather than of ` +
      `\`addStop\``,
      r.threw === null && r.out === stable && g.reads() === 1,
      `reads = ${g.reads()}${r.threw ? `; threw ${r.threw.message}` : ''}` +
      `${r.out === stable ? '' : '; DOCUMENT DIVERGED'}`);
  }
}

/* =================== §4 where A-21's claim DOES hold ============================ */

line('§4.1 A-21 Part 1 — `readWeeklyEntry` and `isOpeningHours` read each field exactly once');
{
  const reads = {};
  const e = { };
  for (const [k, v] of [['day', 1], ['open', '9:00'], ['close', '17:00']]) {
    Object.defineProperty(e, k, { enumerable: true, get() { reads[k] = (reads[k] ?? 0) + 1; return v; } });
  }
  const got = oh.readWeeklyEntry(e);
  ok('`readWeeklyEntry` reads `day`/`open`/`close` once each and hands back what it read',
    reads.day === 1 && reads.open === 1 && reads.close === 1 && got.kind === 'entry' &&
    got.entry.open === '9:00', JSON.stringify(reads));
  const o = {};
  const or = {};
  for (const [k, v] of [['weekly', [{ day: 1, open: '9:00', close: '17:00' }]], ['note', 'n']]) {
    Object.defineProperty(o, k, { enumerable: true, get() { or[k] = (or[k] ?? 0) + 1; return v; } });
  }
  const isOH = oh.isOpeningHours(o);
  ok('`isOpeningHours` reads `weekly`/`note` once each and does not throw', isOH === true && or.weekly === 1 && or.note === 1, JSON.stringify(or));
  // The A-21 leak fixtures themselves, re-derived: a flipping `weekly` may not throw anywhere.
  for (const [what, fn] of [
    ['isOpeningHours', (v) => oh.isOpeningHours(v)],
    ['toJSON', (v) => core.toJSON({ ...sourceTrip(), places: [{ ...sourceTrip().places[0], hours: v }] })],
    ['validateTrip', (v) => core.validateTrip({ ...sourceTrip(), places: [{ ...sourceTrip().places[0], hours: v }] }, '2026-04-01')],
  ]) {
    const g = flipping([[], 'nope']);
    const r = attempt(() => fn({ get weekly() { return g(); } }));
    ok(`...and ${what} does not throw on a \`weekly\` flipping [[], 'nope']`, r.threw === null, r.threw?.message ?? '');
  }
}

line('§4.2 A-21 Part 4 — the five helpers, each read-once, measured on the copy');
{
  // `open`/`close` — R17-1's own fixture. The credential is on reads 2..7 and must not cross.
  const hits = [];
  for (let n = 0; n <= 6; n++) {
    let ro = 0, rc = 0;
    const e = { day: 1 };
    Object.defineProperty(e, 'open', { enumerable: true, get() { ro++; return ro > n ? PIN : '09:00'; } });
    Object.defineProperty(e, 'close', { enumerable: true, get() { rc++; return rc > n ? 'https://v.test/GYGG45MLA9Q9' : '17:00'; } });
    const t = sourceTrip();
    const src = { ...t, places: [{ ...t.places[0], hours: { weekly: [e] } }] };
    const r = attempt(() => core.copyStopInto(targetTrip({}), { trip: src, stopId: 's-src' }, { ...SCHED }, CC(pfx())));
    if (r.threw) hits.push(`flip-${n} THREW ${r.threw.message}`);
    else if (greppable(r.out).length) hits.push(`flip-${n} -> ${greppable(r.out).join()}`);
  }
  ok('A-21 Part 4: `weeklyForCopy` — 7 flip points on `open`/`close`, 0 leak and 0 throw', hits.length === 0, JSON.stringify(hits));

  // `cost.display` — A-18's own field, the leak A-21 found unfiled.
  const gd = flipping(['€25', '€25', '€25', 'conf 5814731574']);
  const t2 = sourceTrip();
  const src2 = {
    ...t2,
    days: t2.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === 's-src'
      ? { ...s, cost: withAccessor(s.cost, 'display', gd) } : s)) })),
  };
  const r2 = attempt(() => core.copyStopInto(targetTrip({}), { trip: src2, stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  ok('...`costForCopy` — `display` reads 1× and the validated value is the one that crosses',
    r2.threw === null && copied(r2.out).cost.display === '€25' && gd.reads() === 1 && greppable(r2.out).length === 0,
    `display = ${JSON.stringify(copied(r2.out)?.cost.display)}, reads = ${gd.reads()}`);

  // `cost.amounts` and `hours.weekly` — the two `Array.isArray`-then-`.map` crashes.
  for (const [what, mk] of [
    ['cost.amounts', () => { const t = sourceTrip(); const g = flipping([[], 'nope']);
      return [{ ...t, days: t.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === 's-src' ? { ...s, cost: withAccessor(s.cost, 'amounts', g) } : s)) })) }, g]; }],
    ['hours.weekly', () => { const t = sourceTrip(); const g = flipping([[], 'nope']);
      return [{ ...t, places: [{ ...t.places[0], hours: { get weekly() { return g(); } } }] }, g]; }],
  ]) {
    const [src, g] = mk();
    const r = attempt(() => core.copyStopInto(targetTrip({}), { trip: src, stopId: 's-src' }, { ...SCHED }, CC(pfx())));
    ok(`...a flipping \`${what}\` does not throw out of \`copyStopInto\` (reads = ${g.reads()})`, r.threw === null, r.threw?.message ?? '');
  }

  // `placeForCopy`'s `at`, on the path A-21 fixed.
  const ga = flipping([{ lat: 1, lng: 2 }, null]);
  const r3 = attempt(() => core.copyStopInto(targetTrip({}),
    { trip: placeWithAccessor(sourceTrip(), 'at', ga), stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  ok('...`placeForCopy` — a flipping `Place.at` does not throw', r3.threw === null, r3.threw?.message ?? '');

  // A-21a's own fixture: step 3, `at` read once.
  for (const vals of [[{ lat: 1, lng: 2 }, null], [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }]]) {
    const g = flipping(vals);
    const r = attempt(() => core.copyStopInto(targetTrip({ city: 'Prague' }),
      { trip: placeWithAccessor(sourceTrip(), 'at', g), stopId: 's-src' }, { ...SCHED }, CC(pfx())));
    ok(`A-21a: on A-14 step 3, \`original.at\` is read ONCE and the checked coordinate crosses ` +
      `(${JSON.stringify(vals)})`,
      r.threw === null && g.reads() === 1 && JSON.stringify(copied(r.out).place) === '{"kind":"inline","at":{"lat":1,"lng":2}}',
      `reads = ${g.reads()}, place = ${JSON.stringify(copied(r.out)?.place)}`);
  }

  // A-21 Part 4's de-aliased place block: an out-of-union `kind` is a hole, not the source object.
  const t4 = sourceTrip();
  const src4 = { ...t4, days: t4.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === 's-src' ? { ...s, place: { kind: 'nope', pin: PIN } } : s)) })) };
  const r4 = attempt(() => core.copyStopInto(targetTrip({}), { trip: src4, stopId: 's-src' }, { ...SCHED }, CC(pfx())));
  ok('...an out-of-union `place.kind` copies as `{kind:\'none\'}` and its extra key does not cross',
    r4.threw === null && JSON.stringify(copied(r4.out).place) === '{"kind":"none"}' && greppable(r4.out).length === 0,
    JSON.stringify(copied(r4.out)?.place));
}

line('§4.3 A-21 Part 4(c) — the placement argument: validated key and emitted key are one read');
{
  const tgt = targetTrip({});
  const g = flipping([tgt.cities[0].key, 'no-such-city']);
  const r = attempt(() => core.copyStopInto(tgt, { trip: sourceTrip(), stopId: 's-src' },
    { kind: 'pool', get cityKey() { return g(); } }, CC(pfx())));
  const st = r.out ? r.out.pool.find((s) => s.provenance.source === 'friend') : null;
  ok('Part 4(c): a flipping `placement.cityKey` files the stop under the VALIDATED key and ' +
    '`validateTrip` reports no `pool_stop_unknown_city`',
    r.threw === null && st?.placement.cityKey === tgt.cities[0].key &&
    !core.validateTrip(r.out, '2026-04-01').some((i) => i.code === 'pool_stop_unknown_city'),
    `${r.threw?.message ?? JSON.stringify(st?.placement)} (reads = ${g.reads()})`);
}

/* ======================= §5 ceilings, constraints, boundary ==================== */

line('§5.1 ceilings, re-derived by running');
{
  ok('§2.10 export surface is still 71', Object.keys(core).length === 71, String(Object.keys(core).length));
  for (const s of ['readWeeklyEntry', 'isClockTime', 'isOpeningHours', 'WeeklyEntry', 'samePlace', 'placeForCopy']) {
    ok(`  ...and \`${s}\` is not on it`, !(s in core));
  }
  const { trip } = loadEurope2026();
  const issues = core.validateTrip(trip, FIXTURE_TODAY);
  ok('the reference trip is unmoved at 11 validateTrip issues', issues.length === 11, String(issues.length));
  const conflicts = core.detectConflicts(trip, { today: FIXTURE_TODAY });
  const by = (sev) => conflicts.filter((c) => c.severity === sev).length;
  ok('...and 2 / 4 / 11 at FIXTURE_TODAY', by('blocker') === 2 && by('warning') === 4 && by('note') === 11,
    `${by('blocker')}/${by('warning')}/${by('note')}`);
  ok('...and it round-trips byte-identically', core.toJSON(core.fromJSON(core.toJSON(trip))) === core.toJSON(trip));
}

line('§5.2 `cairn-constraints` on the A-21/A-21a diff, and the read-only boundary');
{
  const src = (p) => readFileSync(new URL('../packages/core/src/' + p, import.meta.url), 'utf8');
  const files = ['build/copyStop.ts', 'model/openingHours.ts', 'serialize/toJSON.ts'];
  ok('determinism: no `Date.now`, `Math.random` or `crypto.randomUUID` in any file the two ' +
    'rulings touched', files.every((f) => !/Date\.now\(|Math\.random\(|crypto\.randomUUID\(/.test(src(f))));
  ok('zero runtime deps: `packages/core/package.json` declares no `dependencies`',
    !('dependencies' in JSON.parse(readFileSync(new URL('../packages/core/package.json', import.meta.url), 'utf8'))));
  const bare = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  ok('`copyStop.ts` still contains no `as string`', !/as string/.test(bare('build/copyStop.ts')));
  ok('...and, comments stripped, exactly one `{ ...x }` record spread — `{ ...target }`',
    (bare('build/copyStop.ts').match(/\{ \.\.\.[A-Za-z]/g) ?? []).length === 1 &&
    /\{ \.\.\.target/.test(bare('build/copyStop.ts')),
    JSON.stringify(bare('build/copyStop.ts').match(/\{ \.\.\.[A-Za-z]+/g)));
  ok('...and no `as { placeId` cast', !/as \{ placeId/.test(bare('build/copyStop.ts')));
  ok('nothing in the two rulings\' diff logs, fetches or persists',
    files.every((f) => !/console\.|fetch\(|localStorage|indexedDB/.test(src(f))));
}

console.log(fails === 0 ? '\nALL OK' : `\n${fails} FAIL`);
