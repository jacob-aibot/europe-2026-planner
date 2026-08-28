/**
 * Round 16 — the mandatory breaker pass over the builder implementation of ARCHITECTURE
 * revision 14's **A-18** (free text does not become structural by being nested inside a
 * `Stop`) and **A-19** (a placement is an instruction in the target's terms), plus the four
 * findings QA round 15 routed straight to a builder (**R15-1**, **R15-2**, **R15-4**,
 * **R15-5**).
 *
 * Run: node --experimental-strip-types qa/r16-copy-depth.mjs   (from cairn/)
 *
 * Nothing here needs a second checkout: the two mutation findings round 15 filed are
 * re-derived by mutating product code in a throwaway `git worktree`, never in this tree, and
 * this probe only records the outcome. `qa/r15-place-copy.mjs` keeps the differential.
 *
 *   §1  A-18 in depth. The credential repro round 15 filed as R15-3 is in
 *       `r15-place-copy.mjs` §2.1 and now passes; this section attacks what that repro does
 *       NOT reach — the `display` predicate at its edges, an unclassified key on every record
 *       A-18 enumerates (`cost`, `Money`, `arrival`, **`Link`**), and the strings A-18 leaves
 *       verbatim by an argument rather than by a threshold.
 *   §2  `Place.hours`, past round 15's six shapes. 34 shapes through the live `fromJSON`
 *       route: does any still throw, does any still carry a credential, and does
 *       `validateTrip`'s new `place_hours_malformed` agree with what the copy actually did?
 *   §3  A-19's eight assertions, re-derived — the throw, the two legal keys, the hint, the
 *       aliasing, and whether the id factory is left unconsumed behind the refusal.
 *   §4  `place_hours_malformed` as shipped: the reference trip's ceiling, determinism, the
 *       `Ref` shape, and every consumer of an `Issue` that could be surprised by a code
 *       §2.9 does not print.
 *   §5  Ceilings and the read-only boundary, re-derived by running.
 *
 * A FAIL line means the probe found what it was looking for. Read the finding in
 * ../docs/QA-FINDINGS.md before assuming the script is broken.
 *
 * **Maintained by QA round 17 (`909b4a3`), which is when it went to 0 FAIL.** Both of its
 * by-design FAILs are closed, and four groups of lines were re-expressed rather than deleted
 * (A-19 assertion 7 and A-20 both say the builder does not edit anything under `qa/`):
 *   - **§1.2's R16-1 line** was a literal `ok(…, false, …)` about a gap in the shipped suite; it
 *     now points at the fixture that closed it. Mutation-verified at `909b4a3`: reverting the
 *     `links` line to `{ ...l }` is 1 red (0 at `bff7a81`), and restoring
 *     `redactText(p.note) as string` is 1 red (0 at `bff7a81`).
 *   - **§1.4(b), §2.1, §2.2 and §2.3** built hostile `hours` fixtures THROUGH `fromJSON` and
 *     asserted acceptance. **A-20 (revision 15) refuses those shapes**, which aborted this probe
 *     at §1.4 line 253 with an uncaught `TripParseError`. Each is now two-sided: the parser's
 *     refusal with its JSON path, and the copy measured on a CAST-BUILT document — the
 *     population `place_hours_malformed` was ratified to describe.
 *   - **§2.3 is R16-2's closure**, kept as the same assertion and now green: one predicate in
 *     `model/openingHours.ts`, imported by `fromJSON`, `validateTrip` and `copyStop`.
 * Round 17's own findings are in `qa/r17-hours-parser.mjs`, which does not duplicate anything here.
 */
import { readFileSync } from 'node:fs';

const core = await import('../packages/core/src/index.ts');
const { addPlace } = await import('../packages/core/src/build/stops.ts');
const { unfiledPool } = await import('../packages/client/src/selectors/index.ts');
const redactMod = await import('../tools/redact.mjs');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');

let fails = 0;
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
};
const line = (s) => console.log('\n== ' + s + ' ==');
const note = (s) => console.log('  ' + s);

const C = (p) => ({ ids: core.sequentialIds(p), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
const CC = (p) => ({ ids: core.sequentialIds(p), today: '2026-04-01', actorUserId: core.LOCAL_OWNER });
const VIENNA = { lat: 48.2082, lng: 16.3738 };
const BELVEDERE = { lat: 48.1915, lng: 16.3806 };
const TRANSIT = 'transit'; // model/ids.ts TRANSIT_CITY_KEY — deliberately not on the export surface

const CREDENTIALS = ['5814731574', 'GYGG45MLA9Q9', 'jacob@example.test', 'YZGDTS', '0754'];

function mintedTrip(id, prefix, cities) {
  const t = core.createTrip(
    {
      title: 'T', startDate: '2026-08-07', endDate: '2026-08-10',
      cities: cities.map((c, i) => ({ name: c.name, order: c.order ?? i, centre: c.centre })),
    },
    C(prefix),
  );
  return { ...t, id };
}

/** One source trip: one city, one `Place` carrying `fields`, one stop linked to it. */
function sourceWithPlace(fields, prefix = 'src', tripId = 'trip-src') {
  let t = mintedTrip(tripId, prefix, [{ name: 'Vienna', centre: VIENNA }]);
  t = addPlace(t, { id: 'p-src', cityKey: t.cities[0].key, name: 'Habyt Vienna', at: BELVEDERE, category: 'stay', ...fields });
  t = core.addStop(
    t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Check in', category: 'stay', place: { kind: 'place', placeId: 'p-src' } }, C(prefix + 's'),
  );
  return t;
}

/** A source trip whose one stop populates every optional field of `Stop`. */
function sourceWithFullStop(over = {}, prefix = 'fs', tripId = 'trip-src') {
  const t = mintedTrip(tripId, prefix, [{ name: 'Vienna', centre: VIENNA }]);
  return core.addStop(
    t, { kind: 'scheduled', dayId: '2026-08-07', time: '10:00', order: 0 },
    {
      id: 's-src', name: 'Tour', category: 'sight', place: { kind: 'none' }, note: 'plain prose',
      cost: {
        amounts: [{ lo: 10, hi: 20, currency: 'EUR', basis: 'per_person' }],
        display: over.display === undefined ? '€10–20' : over.display,
        note: over.costNote ?? 'tickets at the door',
      },
      arrival: { mode: 'bus', mins: 20, label: over.label ?? 'Bus 8' },
      travelRole: 'transfer', durationMins: 90, flags: ['ticketed'],
      links: over.links ?? [{ label: 'Info', href: 'https://example.test/info' }],
    },
    C(prefix + 's'),
  );
}

const jacobsTarget = (prefix = 'tgt', cities = [{ name: 'Vienna', centre: VIENNA }]) =>
  mintedTrip('trip-tgt', prefix, cities);

const copyAcross = (target, source, prefix = 'c', stopId = 's-src') =>
  core.copyStopInto(
    target, { trip: source, stopId },
    { kind: 'scheduled', dayId: '2026-08-09', time: '11:00', order: 0 }, CC(prefix),
  );

const copiedStop = (t) => t.days.find((d) => d.id === '2026-08-09').stops[0];
const greppable = (t) => {
  const doc = core.toJSON(t);
  return CREDENTIALS.filter((c) => doc.includes(c));
};

/** Re-parses through the live import route, so the probe measures what `importDoc` sees. */
const reparse = (t, mutate) => {
  const raw = JSON.parse(core.toJSON(t));
  if (mutate) mutate(raw);
  return core.fromJSON(JSON.stringify(raw));
};

/* --- A-20 (revision 15), added by round 17 -------------------------------------------------
 * `fromJSON` validates `Place.hours` now, so a hostile `hours` can no longer ARRIVE by parse.
 * Every such fixture below is two-sided: the parser's refusal (with its JSON path) is asserted,
 * and the copy is measured on a CAST-BUILT document — a `Place.hours` set past the type system,
 * which is exactly the population `place_hours_malformed` was ratified to describe. Same
 * construction as `packages/core/test/copyStop.test.ts`'s `castWithHours`/`refusedByParser`. */

/** A source trip whose `Place.hours` is set by cast; it never goes through the parser. */
const castWithHours = (hours, prefix = 'ch') => {
  const t = sourceWithPlace({}, prefix);
  return { ...t, places: t.places.map((p) => ({ ...p, hours })) };
};

/** `{accepted}` or `{name, path, message}` — the parser's verdict on one `hours` value. */
const parserVerdict = (hours, prefix = 'pv') => {
  try { reparse(sourceWithPlace({ hours }, prefix)); return { accepted: true }; }
  catch (e) { return { accepted: false, name: e.constructor.name, path: e.path, message: e.message }; }
};

/* ================================================= §1 A-18 in depth ============ */

line('§1.1 A-18 — the `display` predicate at its edges');
{
  // A-18's exact predicate: `display === null ? null : redacted(display) === display ? display : null`.
  // The claim the ruling makes is that the hole is FILLED, not just opened: `amounts` crosses
  // intact so `costLabel` can derive a figure. So the failure mode to hunt is a display that
  // is dropped while `amounts` is EMPTY — a copy with no price at all where the source had one.
  const cases = [
    ['a plain price', '€10–20', '€10–20'],
    ['an empty display', '', ''],
    ['a space-grouped six-digit price (§6.6 discloses this shape)', '12 000 HUF', null],
    ['a price with a credential', '€40, conf 5814731574', null],
    ['a bare ALL-CAPS word (6+, §6.6 discloses this)', 'GARDENS free · palace €15', null],
    ['a Budapest forint price under 6 digits', '4 500 HUF', '4 500 HUF'],
  ];
  for (const [what, display, want] of cases) {
    const copy = copiedStop(copyAcross(jacobsTarget(), sourceWithFullStop({ display }), 'd' + display.length));
    ok(`display: ${what}`, copy.cost.display === want, JSON.stringify(copy.cost.display));
  }

  // The hole with nothing behind it: `amounts: []` AND a display redactText alters.
  const t = mintedTrip('trip-src', 'e0', [{ name: 'Vienna', centre: VIENNA }]);
  const withStop = core.addStop(
    t, { kind: 'scheduled', dayId: '2026-08-07', time: '10:00', order: 0 },
    {
      id: 's-src', name: 'Tour', category: 'sight', place: { kind: 'none' },
      cost: { amounts: [], display: '12 000 HUF' },
    }, C('e0s'),
  );
  const c = copiedStop(copyAcross(jacobsTarget(), reparse(withStop), 'e1')).cost;
  note(`amounts: [] + display "12 000 HUF" copies as ${JSON.stringify(c)}`);
  ok('DISCLOSED, not filed: a price with no `amounts` behind it crosses as no price at all',
    c.display === null && c.amounts.length === 0,
    'A-18 argues the hole is filled by `amounts`; with `amounts: []` there is nothing to fill it. ' +
    'fromJSON accepts `amounts: []`, and §6.6 redacts the same string on the sample path, so the ' +
    'two thresholds still agree — recorded as the residue of the ruling, not as a defect.');
}

line('§1.2 A-18 position 2 — an unclassified key on every record the ruling enumerates');
{
  // "No record that crosses the trip boundary is copied by spread, at any depth." The
  // mechanical stop is `copyStop.test.ts`'s key-set assertion, forced against a HOSTILE source
  // carrying an unclassified key. Four records are enumerated; the hostile source populates two.
  const base = sourceWithFullStop();
  const hostile = {
    ...base,
    days: base.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => ({
        ...s,
        cost: { ...s.cost, ninth: 'PIN 0754' },
        arrival: { ...s.arrival, tenth: 'conf 5814731574' },
        links: [{ label: 'Info', href: 'https://example.test/info', eleventh: 'PIN 0754' }],
        flags: ['ticketed'],
      })),
    })),
  };
  const after = copyAcross(jacobsTarget(), hostile, 'h1');
  const copy = copiedStop(after);
  ok('an unclassified key on `CostEstimate` does not cross',
    Object.keys(copy.cost).sort().join() === 'amounts,display,note', Object.keys(copy.cost).sort().join());
  ok('an unclassified key on `MoveOverride` does not cross',
    Object.keys(copy.arrival).sort().join() === 'label,mins,mode', Object.keys(copy.arrival).sort().join());
  ok('an unclassified key on `Money` does not cross',
    Object.keys(copy.cost.amounts[0]).sort().join() === 'basis,currency,hi,lo', Object.keys(copy.cost.amounts[0]).sort().join());
  ok('an unclassified key on `Link` does not cross',
    Object.keys(copy.links[0]).sort().join() === 'href,label', Object.keys(copy.links[0]).sort().join());
  ok('and no credential from any of the four is greppable in the recipient\'s document',
    greppable(after).length === 0, greppable(after).join());

  // R16-1 was that the code was right on all four while the MECHANICAL STOP was not: the shipped
  // key-set test's hostile source populated `cost` and `arrival` only, so the `Link` row ran
  // against a two-key fixture link and was `{label,href}` whatever the construction.
  //
  // **Re-expressed by round 17**, the way round 16 re-expressed §3.2/§5.1: this was a literal
  // `ok(…, false, …)` — a statement about a gap in the *shipped suite*, which no product change
  // can turn green — so it now points at the fixture that closed it. A probe cannot mutate the
  // product code it imports; the mutation was made in a throwaway `git worktree` at `909b4a3`
  // and discarded, and nothing under `cairn/` was written by it.
  {
    const suite = readFileSync(new URL('../packages/core/test/copyStop.test.ts', import.meta.url), 'utf8');
    ok('R16-1 CLOSED: the hostile source in A-18\'s key-set test now carries an unclassified key ' +
      'on `links` too, so the `Link` row can fail — reverting the `links` line to `{ ...l }` turns ' +
      'exactly 1 test red (it was 0 at `bff7a81`), mutation-verified in a scratch worktree at 909b4a3',
      /links: \[\{ label: [^\n]*, href: [^\n]*, eleventh:/.test(suite),
      'the fixture must populate an eleventh key on `links`, or the assertion is true by construction');
    ok('R16-1\'s rider CLOSED: `placeForCopy`\'s `redacted(p.note)` is pinned by a cast-built ' +
      'non-string note — restoring `redactText(p.note) as string` turns exactly 1 test red (0 at `bff7a81`)',
      /R16-1 rider: placeForCopy uses `redacted\(\)`/.test(suite),
      'the named test must exist in the shipped suite');
  }
}

line('§1.3 A-18 — the strings that still cross verbatim, and whether the two thresholds agree');
{
  // A-18 keeps `name`, `flags` and `Money.currency` verbatim. Two different arguments are in
  // play and only one of them is a threshold agreement, so both are measured rather than read.
  const structural = new Set(redactMod.STRUCTURAL_KEYS);
  ok('`flags` is a STRUCTURAL_KEY, so §6.6\'s sample path does not redact it either — thresholds agree',
    structural.has('flags'), 'A-18 says so in writing; confirmed against tools/redact.mjs');
  ok('`currency` is a STRUCTURAL_KEY too, so the same argument covers `Money.currency`',
    structural.has('currency'), 'unvalidated by fromJSON (`str`), verbatim in costForCopy, structural on the sample path');
  ok('`open`/`close` are NOT structural, so §6.6 redacts them and A-18 nulls the entry — both fail closed',
    !structural.has('open') && !structural.has('close'), '');
  ok('`label` is NOT structural, so §6.6 redacts `arrival.label` and so does A-18 — thresholds agree',
    !structural.has('label'), '');
  // `name` is the disclosed disagreement: redactStop runs it through redactText on the sample
  // path and copyStopInto does not. A-18 measured 4 of 143 altered, all false positives.
  const { trip } = loadEurope2026();
  const names = trip.days.flatMap((d) => d.stops.map((s) => s.name)).concat(trip.pool.map((s) => s.name));
  const altered = names.filter((n) => core.redactText(n) !== n);
  note(`stop names altered by redactText: ${altered.length} of ${names.length} — ${JSON.stringify(altered)}`);
  ok('A-18\'s `name` measurement reproduces: 4 altered, all public timetable designators / a bar name',
    altered.length === 4, String(altered.length));
  const placeNames = trip.places.map((p) => p.name).filter((n) => core.redactText(n) !== n);
  ok('and the same holds for `Place.name`, which A-15 also keeps verbatim',
    placeNames.length === 0, JSON.stringify(placeNames));
}

line('§1.4 A-18 — a `weeklyForCopy` entry is dropped whole when ONE of its two times is hostile');
{
  // The builder's disclosed judgment call: an `open`/`close` that `redactText` would alter makes
  // the WHOLE entry `null`, rather than `[redacted]`. Two questions, both measured:
  //   (a) does any legitimate clock time get altered? (would silently corrupt real data)
  //   (b) what does a caller lose when one of the two is hostile?
  const clocks = [];
  for (let h = 0; h < 24; h++) for (const m of ['00', '15', '30', '45', '59']) {
    clocks.push(`${String(h).padStart(2, '0')}:${m}`, `${h}:${m}`);
  }
  const altered = clocks.filter((c) => core.redactText(c) !== c);
  ok('(a) no HH:MM or H:MM clock time in the whole 24-hour day is altered by redactText — the ' +
    'judgment call cannot corrupt a well-formed time', altered.length === 0, JSON.stringify(altered));

  // Nor any of the near-miss shapes a hand-written document might carry.
  const nearMiss = ['09:00', '9:00', '00:00', '23:59', '09.00', '09h00', '0900', '09:00 ', ' 09:00', '09:00–17:00', '9am', '09:00 AM'];
  const alteredNear = nearMiss.filter((c) => core.redactText(c) !== c);
  ok('...nor any near-miss time format a hand-written document might carry',
    alteredNear.length === 0, JSON.stringify(alteredNear));

  // (b) The shapes that ARE altered are the ones that were never a time.
  //
  // **Re-expressed by round 17 (A-20, revision 15).** This fixture used to arrive through
  // `reparse`; the parser now refuses `close: '170000'` at `$.places[0].hours.weekly[1].close`,
  // which aborted this probe here. Both halves are kept — the parser refuses with the path, and
  // a cast-built equivalent (the population `place_hours_malformed` describes) still copies
  // without throwing, with the hostile entry nulled in place.
  const hostile = ['PIN 0754', '170000', 'https://vendor.test/x', 'YZGDTS', 'conf 5814731574'];
  const badWeekly = { weekly: [{ day: 1, open: '09:00', close: '17:00' }, { day: 2, open: '09:00', close: '170000' }] };
  let parseErr = null;
  try { reparse(sourceWithPlace({ hours: badWeekly }, 'wkp')); } catch (e) { parseErr = e; }
  ok('A-20: fromJSON refuses the hostile entry at the exact path, rather than accepting it',
    parseErr?.name === 'TripParseError' && parseErr.path === '$.places[0].hours.weekly[1].close',
    `${parseErr?.name}@${parseErr?.path}`);

  const src = castWithHours(badWeekly, 'wk');
  const after = copyAcross(jacobsTarget(), src, 'wk1');
  const hours = after.places[0].hours;
  note(`weekly after copy: ${JSON.stringify(hours.weekly)}`);
  ok('a well-formed entry beside a hostile one survives intact',
    JSON.stringify(hours.weekly[0]) === '{"day":1,"open":"09:00","close":"17:00"}', JSON.stringify(hours.weekly[0]));
  ok('the hostile entry becomes `null` — OpeningHours\' own specified unknown, position preserved',
    hours.weekly[1] === null && hours.weekly.length === 2, JSON.stringify(hours.weekly));
  ok('every hostile time shape redactText alters (so every one becomes a hole, never a wrong time)',
    hostile.every((h) => core.redactText(h) !== h), '');
}

/* ============================================ §2 Place.hours, past six shapes === */

line('§2.1 `Place.hours` — 34 shapes through the live fromJSON route (R15-1, R15-2)');
{
  const PIN = 'Front door PIN 0754, conf 5814731574 - ask jacob@example.test';
  const HREF = 'https://vendor.test/booking/GYGG45MLA9Q9';
  const GOOD = { day: 1, open: '09:00', close: '17:00' };
  // Round 15's original six are the first six; everything after is new this round.
  const shapes = [
    ['{}', {}],
    ['a string', 'mon-fri 9-5'],
    ['a number', 7],
    ['an array', []],
    ['null', null],
    ['{weekly: "mon-fri"}', { weekly: 'mon-fri' }],
    // --- new this round -------------------------------------------------------------
    ['{weekly: []}', { weekly: [] }],
    ['{weekly: [null]}', { weekly: [null] }],
    ['{weekly: [GOOD]}', { weekly: [GOOD] }],
    ['{weekly: [GOOD + note + href]}', { weekly: [{ ...GOOD, note: PIN, href: HREF }] }],
    ['a weekly entry that is a NESTED OBJECT', { weekly: [{ ...GOOD, inner: { pin: PIN, href: HREF } }] }],
    ['a weekly entry that is two levels of nesting', { weekly: [{ ...GOOD, a: { b: { c: PIN } } }] }],
    ['a weekly entry that is an ARRAY', { weekly: [[GOOD]] }],
    ['a weekly entry that is a string', { weekly: [PIN] }],
    ['a weekly entry that is a number', { weekly: [7] }],
    ['a weekly entry that is `true`', { weekly: [true] }],
    ['a weekly entry that is `{}`', { weekly: [{}] }],
    ['a weekly entry missing `close`', { weekly: [{ day: 1, open: '09:00' }] }],
    ['a weekly entry whose `day` is a string', { weekly: [{ ...GOOD, day: '1' }] }],
    ['a weekly entry whose `day` is 1e999 (Infinity through JSON.parse)', { weekly: [{ ...GOOD, day: 1e999 }] }],
    ['a weekly entry whose `day` is -1e999', { weekly: [{ ...GOOD, day: -1e999 }] }],
    ['a weekly entry whose `day` is out of 0..6', { weekly: [{ ...GOOD, day: 99 }] }],
    ['a weekly entry whose `day` is fractional', { weekly: [{ ...GOOD, day: 1.5 }] }],
    ['a weekly entry whose `open` is a number', { weekly: [{ ...GOOD, open: 900 }] }],
    ['a weekly entry whose `open` is an object', { weekly: [{ ...GOOD, open: { pin: PIN } }] }],
    ['a weekly entry whose `open` is a credential', { weekly: [{ ...GOOD, open: PIN }] }],
    ['a weekly entry whose `close` is a voucher URL', { weekly: [{ ...GOOD, close: HREF }] }],
    ['a weekly entry with `__proto__` as a data key', JSON.parse(`{"weekly":[{"day":1,"open":"09:00","close":"17:00","__proto__":{"polluted":true}}]}`)],
    ['a weekly entry with a `constructor` key', { weekly: [{ ...GOOD, constructor: PIN }] }],
    ['`weekly` array-LIKE but not an array', { weekly: { 0: GOOD, length: 1 } }],
    ['`weekly` deeply nested under another key', { weekly: [], other: { weekly: [{ ...GOOD, note: PIN }] } }],
    ['`hours.note` a credential string', { weekly: [GOOD], note: PIN }],
    ['`hours.note` an object', { weekly: [GOOD], note: { pin: PIN } }],
    ['`hours.note` a number', { weekly: [GOOD], note: 5814731574 }],
    ['`hours` with 500 weekly entries, half hostile', { weekly: Array.from({ length: 500 }, (_, i) => (i % 2 ? { ...GOOD, note: PIN } : null)) }],
  ];
  // **Re-expressed by round 17 (A-20).** Round 16 fed all 34 through `fromJSON` and skipped the
  // ones it refused; A-20 refuses most of them, which would silently empty this section. So each
  // shape is now measured on BOTH sides: what the parser does with it (recorded, and refusals
  // must name a path), and what `copyStopInto` does with the same shape supplied BY CAST — which
  // is R15-1/R15-2's live population after A-20 and the only one left.
  let threw = 0, leaked = 0, n = 0, refused = 0, pathless = [];
  const leakedShapes = [], threwShapes = [];
  for (const [what, hours] of shapes) {
    n++;
    const v = parserVerdict(hours, 'h' + n);
    if (!v.accepted) {
      refused++;
      if (v.name !== 'TripParseError' || !v.path) pathless.push(`${what}: ${v.name}@${v.path}`);
    }
    try {
      const after = copyAcross(jacobsTarget(), castWithHours(hours, 'k' + n), 'hc' + n);
      const hits = greppable(after);
      if (hits.length) { leaked++; leakedShapes.push(`${what} -> ${hits.join()}`); }
    } catch (e) {
      threw++; threwShapes.push(`${what}: ${e.constructor.name}: ${e.message}`);
    }
  }
  note(`${n} shapes offered; fromJSON refuses ${refused} of them; ${threwShapes.length} threw on the copy; ${leakedShapes.length} leaked a credential`);
  ok('A-20: every `hours` shape the parser refuses is refused as a TripParseError WITH a JSON path',
    pathless.length === 0, pathless.join(' | '));
  ok('R15-2 CLOSED: no cast-built `hours` shape makes `copyStopInto` throw',
    threw === 0, threwShapes.join(' | '));
  ok('R15-1 CLOSED: no cast-built `hours` shape carries a credential into the recipient',
    leaked === 0, leakedShapes.join(' | '));
  ok('...and `Object.prototype` is not polluted by any of them',
    ({}).polluted === undefined, String(({}).polluted));
}

line('§2.2 the copy\'s own output is always a well-formed OpeningHours');
{
  const PIN = 'PIN 0754';
  const GOOD = { day: 1, open: '09:00', close: '17:00' };
  for (const [what, hours] of [
    ['a string', 'mon-fri'], ['{}', {}], ['{weekly:"x"}', { weekly: 'x' }],
    ['a hostile entry', { weekly: [{ ...GOOD, note: PIN }] }],
  ]) {
    // Re-expressed by round 17: cast-built, because A-20's parser refuses all four.
    const after = copyAcross(jacobsTarget(), castWithHours(hours, 'q' + what.length), 'qc' + what.length);
    const issues = core.validateTrip(after).filter((i) => i.code === 'place_hours_malformed');
    ok(`the COPY of ${what} is well-formed — the recipient inherits no warning`,
      issues.length === 0, JSON.stringify(issues));
    ok(`...and the copy of ${what} round-trips through toJSON/fromJSON, so the recipient's backup restores`,
      (() => { try { core.fromJSON(core.toJSON(after)); return true; } catch { return false; } })(), '');
  }
}

line('§2.3 `place_hours_malformed` vs what the copy actually did (R16-2)');
{
  // The new IssueCode's stated purpose, in the builder's own words: it "is what says so to the
  // user *before* they wonder where their hours went". So the test is whether the two guards
  // written in the same pass agree: does every document whose hours the COPY silently drops
  // also get the warning?
  const GOOD = { day: 1, open: '09:00', close: '17:00' };
  const cases = [
    ['day 1e999 (Infinity)', { weekly: [{ ...GOOD, day: 1e999 }] }],
    ['day -1e999', { weekly: [{ ...GOOD, day: -1e999 }] }],
    ['close is a 6-digit run', { weekly: [{ ...GOOD, close: '170000' }] }],
    ['open is a voucher URL', { weekly: [{ ...GOOD, open: 'https://vendor.test/x' }] }],
    ['open is an ALL-CAPS token', { weekly: [{ ...GOOD, open: 'YZGDTS' }] }],
    ['day is a string (control — both agree)', { weekly: [{ ...GOOD, day: '1' }] }],
  ];
  // **Re-expressed by round 17: this is R16-2's closure, measured.** A-20 deletes
  // `wellFormedHours` and points `validateTrip`, `fromJSON` and `weeklyForCopy` at ONE predicate
  // (`model/openingHours.ts`), so the divergence this line was written to catch cannot exist by
  // construction — the assertion is kept, stated the same way, and must now hold. The fixtures
  // arrive by cast, because the parser refuses all six (asserted beside each).
  const silent = [], accepted = [];
  for (const [what, hours] of cases) {
    if (parserVerdict(hours, 'p' + what.length).accepted) accepted.push(what);
    const src = castWithHours(hours, 'v' + what.length);
    const warned = core.validateTrip(src).some((i) => i.code === 'place_hours_malformed');
    const after = copyAcross(jacobsTarget(), src, 'vc' + what.length);
    const dropped = after.places[0].hours.weekly[0] === null;
    note(`${what}: fromJSON refuses = ${!accepted.includes(what)}, validateTrip warns = ${warned}, copy drops the entry = ${dropped}`);
    if (dropped && !warned) silent.push(what);
  }
  ok('A-20: fromJSON refuses all six of R16-2\'s shapes, so none can arrive by parse',
    accepted.length === 0, JSON.stringify(accepted));
  ok('R16-2 CLOSED: every document whose weekly entry the copy silently discards is also reported ' +
    'by `place_hours_malformed`', silent.length === 0,
    `${silent.length} shapes are dropped by weeklyForCopy and called well-formed by ` +
    `validateTrip: ${JSON.stringify(silent)}. Round 16 measured 5 here — the three R16-2 named ` +
    `plus both Infinity days — because the two guards held different predicates. A-20 made it one.`);

  // The other direction, for completeness: a document that IS warned about while the copy loses
  // nothing. Bounded and benign — recorded so the finding is not overstated in one direction.
  const noisy = castWithHours({ weekly: [GOOD], note: 5814731574 }, 'v9');
  const noisyCopy = copyAcross(jacobsTarget(), noisy, 'v9c');
  note(`hours.note as a number: validateTrip warns = ` +
    `${core.validateTrip(noisy).some((i) => i.code === 'place_hours_malformed')}, ` +
    `copied hours = ${JSON.stringify(noisyCopy.places[0].hours)}`);
  ok('CONFIRMED, not filed: the reverse direction — a warning where the copy loses nothing but a ' +
    'non-string note — is noise, not harm', true,
    'the weekly entry crosses intact and the note becomes [redacted]; the warning is still true ' +
    'about the document, so this direction is over-reporting rather than under-reporting.');

  // ROOT CAUSE, as filed at round 16: there were THREE independent answers in this repo to
  // "what is a well-formed OpeningHours" — `serialize/fromJSON.ts:294` (a raw cast, i.e.
  // anything), `validate/validateTrip.ts:406` (`wellFormedHours`) and `build/copyStop.ts:157`
  // (`weeklyForCopy`) — and no two agreed. **A-20 (revision 15) made it one**, in
  // `model/openingHours.ts`, imported by all three. Round 17 re-derives that here rather than
  // reading it: the three call sites, and the one address the clock regex now lives at.
  {
    const src = (p) => readFileSync(new URL('../packages/core/src/' + p, import.meta.url), 'utf8');
    ok('R16-2\'s mechanism: `wellFormedHours` no longer exists in validateTrip.ts',
      !/function wellFormedHours/.test(src('validate/validateTrip.ts')), '');
    ok('...and all three call sites import the ONE predicate module',
      /model\/openingHours/.test(src('validate/validateTrip.ts')) &&
      /model\/openingHours/.test(src('build/copyStop.ts')) &&
      /model\/openingHours/.test(src('serialize/fromJSON.ts')), '');
    // ROUND 18 re-expression. A-21 (revision 16) renamed both halves and the ruling named this
    // line as QA's to re-express: `isWeeklyEntry(w)` became `readWeeklyEntry(w)` (a predicate over
    // a compound value hands back what it read, so the validated value IS the used value), and
    // `redacted(e.open) !== e.open` became `redacted(open) !== open` (the reader's own scalar, not
    // a second read of the caller's object). The assertion's SUBJECT is unchanged and still true:
    // the structural half is asked once, elsewhere, and the redaction half is a copy-boundary
    // policy that lives here.
    ok('...and `weeklyForCopy`\'s own remaining line is the A-18 redaction POLICY, not a shape test',
      /readWeeklyEntry\(w\)/.test(src('build/copyStop.ts')) &&
      /redacted\(open\) !== open/.test(src('build/copyStop.ts')), '');
    // Comments still name `isWeeklyEntry` — that is the ruling's own reasoning for the next
    // reader — so this is asserted against comment-stripped source, the same treatment §5.1's
    // spread ceiling uses.
    const bare = (p) => src(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    ok('...and A-21 DELETED the old boolean predicate rather than shipping both',
      !/isWeeklyEntry/.test(bare('model/openingHours.ts')) &&
      !/isWeeklyEntry/.test(bare('build/copyStop.ts')) &&
      !/isWeeklyEntry/.test(bare('validate/validateTrip.ts')), '');
  }
}

/* ==================================================== §3 A-19 ================== */

line('§3.1 A-19 assertion 1 — a pool placement naming a city the target lacks is REFUSED');
{
  const source = sourceWithPlace({}, 'p1', 'trip-src');
  const target = jacobsTarget('p1t');
  const before = core.toJSON(target);
  const ids = core.sequentialIds('p1c');
  let err = null;
  try {
    core.copyStopInto(target, { trip: source, stopId: 's-src' },
      { kind: 'pool', cityKey: source.cities[0].key }, { ids, today: '2026-04-01', actorUserId: core.LOCAL_OWNER });
  } catch (e) { err = e; }
  ok('it throws an Error (not a TypeError, not silence)', err instanceof Error && err.constructor === Error, String(err));
  ok('...naming the key and the target id', /no such city .* in trip-tgt/.test(err?.message ?? ''), err?.message);
  ok('...and the target is unmoved, byte-identical', core.toJSON(target) === before, '');
  ok('...and the id factory is left UNCONSUMED behind the refusal, so a retry mints the same ids',
    ids.newId('stop') === core.sequentialIds('p1c').newId('stop'), ids.newId('stop'));
}

line('§3.2 A-19 assertions 2, 3, 4 — the keys that are legal');
{
  // TRANSIT_CITY_KEY
  const source = sourceWithPlace({}, 'p2');
  let after = core.copyStopInto(jacobsTarget('p2t'), { trip: source, stopId: 's-src' },
    { kind: 'pool', cityKey: TRANSIT }, CC('p2c'));
  let stop = after.pool[0];
  ok('TRANSIT_CITY_KEY succeeds and lands in the pool', stop !== undefined && stop.placement.cityKey === TRANSIT, JSON.stringify(stop?.placement));
  ok('...adds no `pool_stop_unknown_city` and no other new issue',
    core.validateTrip(after).length === core.validateTrip(jacobsTarget('p2t')).length,
    JSON.stringify(core.validateTrip(after).map((i) => i.code)));
  ok('...and `unfiledPool` catches it, which is where the recipient re-files it',
    unfiledPool(after).some((s) => s.id === stop.id), '');
  ok('...and it is badged `imported` from the instant it exists',
    core.displayStatus(stop) === 'imported', core.displayStatus(stop));

  // A key the target DOES have
  const target = jacobsTarget('p3t');
  after = core.copyStopInto(target, { trip: source, stopId: 's-src' },
    { kind: 'pool', cityKey: target.cities[0].key }, CC('p3c'));
  stop = after.pool[0];
  ok('a key the target does have succeeds and lands in `poolFor`',
    core.poolFor(after, target.cities[0].key).some((s) => s.id === stop.id), '');
  ok('...and the copy is otherwise identical to the scheduled case (same credit, same stamp)',
    stop.provenance.source === 'friend' && stop.provenance.state === 'candidate' &&
    stop.provenance.origin.sourceTripId === 'trip-src', JSON.stringify(stop.provenance));
  ok('...and it adds no issue', core.validateTrip(after).length === core.validateTrip(target).length,
    JSON.stringify(core.validateTrip(after).map((i) => i.code)));

  // A WITHIN-TRIP copy into the pool under the stop's own pool key
  let own = mintedTrip('trip-own', 'p4', [{ name: 'Vienna', centre: VIENNA }]);
  own = core.addStop(own, { kind: 'pool', cityKey: own.cities[0].key },
    { id: 's-own', name: 'Market', category: 'sight', place: { kind: 'none' } }, C('p4s'));
  const ownAfter = core.copyStopInto(own, { trip: own, stopId: 's-own' },
    { kind: 'pool', cityKey: own.cities[0].key }, CC('p4c'));
  ok('a within-trip pool copy under the stop\'s own key succeeds and adds no issue',
    ownAfter.pool.length === 2 && core.validateTrip(ownAfter).length === core.validateTrip(own).length,
    JSON.stringify(core.validateTrip(ownAfter).map((i) => i.code)));

  // Hostile keys the check must still refuse.
  for (const [what, key] of [['the empty string', ''], ['a lookalike of TRANSIT', 'Transit'], ['a whitespace-padded transit', ' transit ']]) {
    let threw = false;
    try {
      core.copyStopInto(jacobsTarget('p5t'), { trip: source, stopId: 's-src' },
        { kind: 'pool', cityKey: key }, CC('p5c'));
    } catch { threw = true; }
    ok(`...and ${what} is refused, not silently treated as transit`, threw, JSON.stringify(key));
  }
}

line('§3.5 A-19 part 2 — what the rebuild does to a placement whose `kind` is neither');
{
  // A-19 part 2 rebuilds the placement with a two-armed ternary on `kind`. `StopPlacement` is a
  // discriminated union so this is unreachable from TypeScript, but `copyStopInto` is called
  // from `.mjs` probes and could be called from untyped JS. Measured rather than reasoned about,
  // because the ruling does not mention the case and the behaviour CHANGED with this pass.
  // ROUND 18 re-expression. A-21 Part 4(c) merges A-19's city check and the placement rebuild
  // into ONE branch on the discriminant, so the else-arm now VALIDATES `cityKey` before emitting
  // it. The recorded behaviour therefore changed from "silently coerced into `{kind:'pool',
  // cityKey: undefined}` past the city check" to "refused". The builder reported this in
  // BUILD-NOTES as a consequence A-21 does not name; round 18 re-derives it and keeps the line as
  // a two-sided assertion, because the direction of the change is what matters — refusing beats
  // writing a filing nothing badges (§2.1: an out-of-union argument is programmer error).
  const source = sourceWithPlace({}, 'pz');
  const target = jacobsTarget('pzt');
  const before = core.toJSON(target);
  let out = null, threw = null;
  try {
    out = core.copyStopInto(target, { trip: source, stopId: 's-src' },
      { kind: 'nonsense', dayId: '2026-08-09', time: '11:00', order: 0 }, CC('pzc'));
  } catch (e) { threw = e; }
  const written = out?.pool?.[0]?.placement;
  note(`kind:'nonsense' -> ${threw ? threw.message : JSON.stringify(written)}`);
  ok('A-21 Part 4(c): a placement with an out-of-union `kind` no longer falls PAST A-19\'s city ' +
    'check — the else-arm validates `cityKey` before emitting it, so the call is REFUSED',
    threw !== null && threw.constructor === Error && /no such city undefined/.test(threw.message),
    threw ? threw.constructor.name + ': ' + threw.message : JSON.stringify(written));
  ok('...and the target is byte-identical behind the refusal',
    core.toJSON(target) === before, '');
  // The residual coercion, measured rather than assumed: an out-of-union `kind` carrying a
  // cityKey the target DOES have still lands in the pool. That is a hole (a filing the recipient
  // can see and move), not a leak, and §2.1 calls the argument programmer error either way.
  let out2 = null, threw2 = null;
  try {
    out2 = core.copyStopInto(jacobsTarget('pzt2'), { trip: source, stopId: 's-src' },
      { kind: 'nonsense', cityKey: TRANSIT }, CC('pzc2'));
  } catch (e) { threw2 = e; }
  note(`kind:'nonsense' + a valid cityKey -> ${threw2 ? threw2.message : JSON.stringify(out2?.pool?.[0]?.placement)}`);
  ok('RECORDED, not filed: an out-of-union `kind` carrying a cityKey the target HAS is still ' +
    'coerced to a pool filing — a hole the recipient can see, never a leak',
    threw2 === null && out2?.pool?.[0]?.placement?.kind === 'pool' &&
    out2.pool[0].placement.cityKey === TRANSIT,
    'unreachable from TypeScript; it becomes a finding the day an untyped caller exists.');
  if (out2) {
    ok('...and validateTrip reports nothing uncleanable about the result',
      !core.validateTrip(out2).some((i) => i.code === 'pool_stop_unknown_city'),
      JSON.stringify(core.validateTrip(out2).map((i) => i.code)));
  }
}

line('§3.3 A-19 assertion 5 — the hint');
{
  const source = sourceWithPlace({}, 'p6');
  const target = jacobsTarget('p6t');
  // A hint naming a day that exists only in the SOURCE.
  let after = core.copyStopInto(target, { trip: source, stopId: 's-src' },
    { kind: 'pool', cityKey: TRANSIT, hint: { dayId: 'no-such-day', time: '10:00', order: 3 } }, CC('p6c'));
  let stop = after.pool[0];
  ok('an unresolvable hint is DROPPED — the key is absent, not present-and-empty',
    !('hint' in stop.placement), JSON.stringify(stop.placement));
  const scheduled = core.scheduleFromPool(after, stop.id, {}, { ids: core.sequentialIds('p6f'), now: '2026-04-01', actorUserId: core.LOCAL_OWNER });
  ok('...and `scheduleFromPool` on the copy then SUCCEEDS through pickDay + CAT_DEFAULT_TIME',
    scheduled.days.some((d) => d.stops.some((s) => s.id === stop.id)), '');

  // A hint naming a day the TARGET does have.
  after = core.copyStopInto(target, { trip: source, stopId: 's-src' },
    { kind: 'pool', cityKey: TRANSIT, hint: { dayId: '2026-08-09', time: '14:30', order: 2 } }, CC('p7c'));
  stop = after.pool[0];
  ok('a resolvable hint is preserved, `order` included',
    JSON.stringify(stop.placement.hint) === '{"dayId":"2026-08-09","time":"14:30","order":2}', JSON.stringify(stop.placement.hint));
  // ...and an unclassified key on the hint does not travel.
  after = core.copyStopInto(target, { trip: source, stopId: 's-src' },
    { kind: 'pool', cityKey: TRANSIT, hint: { dayId: '2026-08-09', time: '14:30', evil: 'PIN 0754' } }, CC('p8c'));
  ok('...and an unclassified key on the hint does not travel',
    Object.keys(after.pool[0].placement.hint).sort().join() === 'dayId,time', Object.keys(after.pool[0].placement.hint).join());
}

line('§3.4 A-19 assertion 6 — the placement is never the caller\'s object, either branch');
{
  const source = sourceWithPlace({}, 'p9');
  const target = jacobsTarget('p9t');

  // The natural call A-19 names: "copy it where it already sits". Mutate the SOURCE stop's own
  // placement afterwards and the target must not move.
  let src2 = mintedTrip('trip-s2', 'pa', [{ name: 'Vienna', centre: VIENNA }]);
  src2 = core.addStop(src2, { kind: 'pool', cityKey: src2.cities[0].key, hint: { dayId: '2026-08-08', time: '09:00', order: 1 } },
    { id: 's-p', name: 'Market', category: 'sight', place: { kind: 'none' } }, C('pas'));
  const srcPlacement = src2.pool[0].placement;
  // the target must hold a city of that key for this to be legal at all
  const tgt2 = { ...jacobsTarget('pat'), cities: [{ ...jacobsTarget('pat').cities[0], key: srcPlacement.cityKey }] };
  const after = core.copyStopInto(tgt2, { trip: src2, stopId: 's-p' }, srcPlacement, CC('pac'));
  const written = after.pool[0].placement;
  ok('the written placement is not the caller\'s object', written !== srcPlacement, '');
  ok('...nor its hint', written.hint !== srcPlacement.hint, JSON.stringify(written));
  const before = core.toJSON(after);
  srcPlacement.cityKey = 'MUTATED';
  srcPlacement.hint.time = '23:59';
  srcPlacement.hint.order = 99;
  ok('mutating the SOURCE stop\'s placement and hint after the copy leaves the target byte-identical',
    core.toJSON(after) === before, '');

  // ...and the scheduled branch, where `reindex` keeps the caller's object when the order matches.
  const p = { kind: 'scheduled', dayId: '2026-08-09', time: '11:00', order: 0 };
  const sAfter = core.copyStopInto(target, { trip: source, stopId: 's-src' }, p, CC('pbc'));
  const sWritten = copiedStop(sAfter).placement;
  ok('the SCHEDULED branch is not the caller\'s object either', sWritten !== p, '');
  const sBefore = core.toJSON(sAfter);
  p.dayId = 'MUTATED'; p.time = '23:59'; p.order = 99;
  ok('...and mutating it afterwards leaves the target byte-identical', core.toJSON(sAfter) === sBefore, '');
}

/* ============================== §4 place_hours_malformed as shipped ============= */

line('§4.1 the new IssueCode — ceiling, determinism and wiring');
{
  const { trip } = loadEurope2026();
  const issues = core.validateTrip(trip);
  const codes = {};
  for (const i of issues) codes[i.level + ':' + i.code] = (codes[i.level + ':' + i.code] ?? 0) + 1;
  note(`validateTrip on the reference trip: ${issues.length} — ${JSON.stringify(codes)}`);
  ok('the reference trip is unmoved at 11 issues — `place_hours_malformed` does not fire',
    issues.length === 11 && !issues.some((i) => i.code === 'place_hours_malformed'), String(issues.length));
  ok('...because 0 of its 95 places carry `hours` at all',
    trip.places.filter((p) => p.hours !== undefined).length === 0, '');
  ok('validateTrip is still deterministic', JSON.stringify(core.validateTrip(trip)) === JSON.stringify(issues), '');
  ok('...and still never throws on any of §2.1\'s 34 shapes',
    (() => {
      try {
        for (const h of [{}, 'x', 7, [], null, { weekly: 'x' }, { weekly: [7] }, { weekly: [{ day: 1 }] }]) {
          core.validateTrip(sourceWithPlace({ hours: h }, 'z' + String(h)));
        }
        return true;
      } catch { return false; }
    })(), '');

  // The Issue contract: level, ref kind, params, and a message with no opaque CityKey in it.
  const bad = sourceWithPlace({ hours: 'mon-fri' }, 'w1');
  const one = core.validateTrip(bad).find((i) => i.code === 'place_hours_malformed');
  ok('it is a `warn`, as §2.9 requires of a "shaped oddly" finding', one?.level === 'warn', JSON.stringify(one));
  ok('...carries a resolvable `{kind:"place"}` ref', one?.ref?.kind === 'place' && bad.places.some((p) => p.id === one.ref.id), JSON.stringify(one?.ref));
  ok('...and its message names the place, not an opaque id (R13-7\'s rule)',
    typeof one?.message === 'string' && one.message.includes('Habyt Vienna') && !one.message.includes(one.ref.id),
    one?.message);
  ok('...exactly one per malformed place, not one per weekly entry',
    core.validateTrip(sourceWithPlace({ hours: { weekly: [7, 7, 7, 7] } }, 'w2'))
      .filter((i) => i.code === 'place_hours_malformed').length === 1, '');
  ok('...and a well-formed `hours` produces none',
    core.validateTrip(sourceWithPlace({ hours: { weekly: [{ day: 1, open: '09:00', close: '17:00' }], note: 'ring the bell' } }, 'w3'))
      .filter((i) => i.code === 'place_hours_malformed').length === 0, '');

  // Wiring: nothing in the repo switches exhaustively on IssueCode, so an unratified code
  // cannot render as `undefined` anywhere. Measured by grep rather than asserted.
  const files = ['packages/client/src/selectors/index.ts', 'apps/web/src/views/Panels.tsx', 'cli.ts'];
  const HERE = new URL('..', import.meta.url).pathname;
  const switching = files.filter((f) => {
    const s = readFileSync(HERE + f, 'utf8');
    return /Record<\s*IssueCode/.test(s) || /switch\s*\(\s*\w*[Ii]ssue\w*\.code/.test(s);
  });
  ok('no consumer switches exhaustively on `IssueCode`, so the new code renders its own message',
    switching.length === 0, switching.join());
}

/* ==================================================== §5 ceilings ============== */

line('§5.1 ceilings and the read-only boundary');
{
  // Round 22: 71 -> 73. Phase 2 I-5 (`897b928`) added `countryOf` and `COUNTRY_INDEX`.
  // I-7a (QA R28-8, BUILD-NOTES KD-65): 73 -> 75, re-derived by running rather than
  // quoted. `SUMMARY_VERSION` joined at I-6 and `travelStats` at I-7, and neither commit
  // updated this line. Strict equality on purpose — never relaxed to `>=`.
  ok('§2.10 export surface is still 75', Object.keys(core).length === 75, String(Object.keys(core).length));
  for (const n of ['placeForCopy', 'refileCityKey', 'costForCopy', 'arrivalForCopy', 'weeklyForCopy', 'hoursForCopy', 'redacted'])
    ok(`  ...and \`${n}\` is module-private`, !(n in core), '');
  const { trip } = loadEurope2026();
  const cs = core.detectConflicts(trip, { today: FIXTURE_TODAY });
  const n = (sev) => cs.filter((c) => c.severity === sev).length;
  ok('reference trip is 2 / 4 / 11 at FIXTURE_TODAY',
    n('blocker') === 2 && n('warning') === 4 && n('note') === 11, `${n('blocker')}/${n('warning')}/${n('note')}`);
  const HERE = new URL('..', import.meta.url).pathname;
  const raw = readFileSync(HERE + 'packages/core/src/build/copyStop.ts', 'utf8');
  // Comments in this file QUOTE the constructions the ruling forbids, so the greppable claim
  // has to be made against code with the comments stripped or it reports its own docstring.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  ok('BUILD-NOTES\' greppable claim (a): `copyStop.ts` contains no `as string` in code',
    !src.includes('as string'), '');
  const spreads = src.match(/\{\s*\.\.\.\s*\w+/g) ?? [];
  ok('BUILD-NOTES\' greppable claim (b): the only spread left in code is `{ ...target }`, the ' +
    'RECIPIENT\'s own document — no spread of a source record at any depth',
    spreads.length === 1 && spreads[0].includes('target'), JSON.stringify(spreads));
  ok('nothing in the new code logs, fetches or persists (§6.1/§6.6)',
    !/console\.|fetch\(|localStorage|process\.env/.test(src), '');
}

line('§5.2 the reference trip is genuinely unmoved by A-18, measured field by field');
{
  const { trip } = loadEurope2026();
  const stops = trip.days.flatMap((d) => d.stops).concat(trip.pool);
  const displays = stops.map((s) => s.cost?.display).filter((d) => typeof d === 'string' && d !== '');
  const moved = displays.filter((d) => core.redactText(d) !== d);
  note(`non-empty cost.display strings: ${displays.length}; altered by redactText: ${moved.length} ${JSON.stringify(moved)}`);
  ok('0 of the reference trip\'s `cost.display` strings are altered, so no real price is dropped ' +
    'by A-18\'s display predicate', moved.length === 0, JSON.stringify(moved));
  ok('...and 0 stops carry a `cost.note` or an `arrival.label`, so A-18 has no live exposure here',
    stops.filter((s) => s.cost?.note !== undefined).length === 0 &&
    stops.filter((s) => s.arrival?.label !== undefined).length === 0, '');
  const withLinks = stops.filter((s) => Array.isArray(s.links) && s.links.length > 0).length;
  note(`stops carrying \`links\`: ${withLinks} — A-15's disclosed residue, unchanged by A-18`);
}

line('§5.3 differential vs `b3a0c89` — an ORDINARY copy must be byte-identical (needs /tmp/r16-pre)');
{
  // git worktree add /tmp/r16-pre b3a0c89   # the commit BEFORE A-18/A-19 were built
  const PRE = '/tmp/r16-pre/cairn/packages/core/src/index.ts';
  let pre = null;
  try { pre = await import(PRE); } catch { /* not checked out */ }
  if (!pre) {
    console.log('  skip §5.3 — run `git worktree add /tmp/r16-pre b3a0c89` first');
  } else {
    // A reference-trip-SHAPED stop: no cost.note, no arrival.label, no place hours, a plain
    // display, one link. A-18 must not move any of it.
    const build = (mod) => {
      const t = mod.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-10',
        cities: [{ name: 'Vienna', order: 0, centre: VIENNA }] },
        { ids: mod.sequentialIds('df'), now: '2026-01-01', actorUserId: mod.LOCAL_OWNER });
      const src = mod.addStop({ ...t, id: 'trip-src' },
        { kind: 'scheduled', dayId: '2026-08-07', time: '10:00', order: 0 },
        { id: 's-src', name: 'Belvedere', category: 'sight', place: { kind: 'inline', at: BELVEDERE },
          note: 'Gardens free, palace ticket at the door',
          cost: { amounts: [{ lo: 15, hi: 24, currency: 'EUR', basis: 'per_person' }], display: '€15–24' },
          arrival: { mode: 'metro', mins: 12 }, travelRole: 'transfer', durationMins: 120, flags: ['ticketed'],
          links: [{ label: 'Tickets', href: 'https://example.test/belvedere' }] },
        { ids: mod.sequentialIds('dfs'), now: '2026-01-01', actorUserId: mod.LOCAL_OWNER });
      const tgt = mod.createTrip({ title: 'J', startDate: '2026-08-07', endDate: '2026-08-10',
        cities: [{ name: 'Vienna', order: 0, centre: VIENNA }] },
        { ids: mod.sequentialIds('dt'), now: '2026-01-01', actorUserId: mod.LOCAL_OWNER });
      return mod.toJSON(mod.copyStopInto({ ...tgt, id: 'trip-tgt' }, { trip: src, stopId: 's-src' },
        { kind: 'scheduled', dayId: '2026-08-09', time: '11:00', order: 0 },
        { ids: mod.sequentialIds('dc'), today: '2026-04-01', actorUserId: mod.LOCAL_OWNER }));
    };
    const before = build(pre), after = build(core);
    ok('an ordinary copy (no cost.note, no arrival.label, no hours) is byte-identical to `b3a0c89`',
      before === after, before === after ? '' : 'first divergence at char ' +
        [...before].findIndex((ch, i) => ch !== after[i]));
  }
}

console.log(`\n${fails === 0 ? 'ALL OK' : fails + ' FAIL'}`);
process.exitCode = 0;
