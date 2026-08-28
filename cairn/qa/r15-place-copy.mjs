/**
 * Round 15 — the mandatory breaker pass over the builder implementation of ARCHITECTURE
 * revision 13's **A-15** (what of a `Place` may cross a trip boundary), **A-16** (re-filing is
 * a derivation; the source document may already hold the answer), **A-17** (a horizon is only
 * as sharp as the document's own answer to *when*) and the mechanical **R14-3**.
 *
 * Run: node --experimental-strip-types qa/r15-place-copy.mjs   (from cairn/)
 *
 * §6.5 needs a second checkout and prints SKIP without it:
 *   git worktree add /tmp/r15-pre 3409420    # the commit BEFORE A-15/A-16/A-17 were built
 *
 *   §1  A-15's field coverage measured against what a `Place` can carry at RUNTIME, not
 *       against the `Place` type. Written when `fromJSON` cast `hours` unvalidated, so
 *       `placeForCopy`'s one surviving spread (`{...w}` over `hours.weekly`) was a live
 *       carrier and its `.map` a live crash. **A-20 (revision 15) closed that door**, so each
 *       assertion here is now two-sided — the parser refuses (or drops) with a JSON path, and
 *       a CAST-BUILT equivalent that never went through the parser still copies without
 *       throwing and without carrying a credential.                           (R15-1, R15-2)
 *   §2  The rest of the copied stop. A-15 closed `Place`; `Stop.cost.note` and
 *       `Stop.arrival.label` are the same class of free text on the same path and are still
 *       copied verbatim, while §6.6's sample path redacts both.                     (R15-3)
 *   §3  A-16's boundary: the two conjuncts, the stale source, the coincidental key, the
 *       same-document-different-object case, determinism — whether step 1 staying FIRST is
 *       pinned by anything at all, and the `cityKey` A-14's change table left raw.
 *                                                                             (R15-4, R15-6)
 *   §4  R14-3's clone, from both directions, plus every other alias `copyStopInto` still has.
 *   §5  A-17's directional test measured for what it can actually detect.            (R15-5)
 *   §6  The ceilings and the read-only boundary, re-derived by running, plus the pre-vs-post
 *       `detectConflicts` differential.
 *
 * A FAIL line means the probe found what it was looking for. Read the finding in
 * ../docs/QA-FINDINGS.md before assuming the script is broken.
 *
 * **Maintained by QA round 16 (`bff7a81`), which is when it went to 0 FAIL.** Three of its 17
 * by-design FAILs could not be closed by product code and were re-expressed rather than deleted,
 * per A-19 assertion 7 (*"the builder does not edit anything under `qa/`"*):
 *   - §3.4 asserted against a document A-19 now refuses to return — it is a `throws` assertion
 *     now, against A-19's actual contract, with the two legal keys measured beside it.
 *   - §3.2 (R15-4) and §5.1 (R15-5) were literal `ok(..., false, …)` statements about a GAP IN
 *     THE SHIPPED SUITE, not measurements of the product, so no product change could turn them
 *     green. Both now point at the test that closed them. Round 16 re-derived each by mutating
 *     product code in a throwaway `git worktree` at `bff7a81` — reordering `refileCityKey`'s
 *     steps 1/2 turns `copyStop.test.ts:1510` red (67/1), and `beyondHorizon`'s `every` -> `some`
 *     turns `horizonGate.test.ts`'s A-17 directional test red (582/1). The probe can only confirm
 *     the pins EXIST; the mutations are never made in this tree.
 * The round-16 findings live in `qa/r16-copy-depth.mjs`, which does not duplicate anything here.
 *
 * **Maintained again by QA round 17 (`909b4a3`)**, after ARCHITECTURE revision 15's **A-20** made
 * `fromJSON` validate `Place.hours` like every other field. §1.1, §1.2 and §1.3 fed a malformed
 * `hours` THROUGH `fromJSON` and asserted it was accepted — an assumption A-20 correctly
 * overturns, and which aborted this probe at §1.2 with an uncaught `TripParseError`. All three
 * are re-expressed in the two-sided form `packages/core/test/copyStop.test.ts` now uses
 * (`refusedByParser` + `castWithHours`): **the parser refuses with a path**, and **`copyStopInto`
 * still never throws** on the cast-built equivalent, which is the population `place_hours_malformed`
 * describes. Nothing else in the file moved.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const HERE = new URL('..', import.meta.url).pathname;
const core = await import('../packages/core/src/index.ts');
const detectMod = await import('../packages/core/src/conflict/detect.ts');
const { addPlace } = await import('../packages/core/src/build/stops.ts');
const redactMod = await import('../tools/redact.mjs');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');

let fails = 0;
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
};
const skip = (n, why) => console.log('  skip ' + n + ' — ' + why);
const line = (s) => console.log('\n== ' + s + ' ==');
const note = (s) => console.log('  ' + s);

const C = (p) => ({ ids: core.sequentialIds(p), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
const CC = (p) => ({ ids: core.sequentialIds(p), today: '2026-04-01', actorUserId: core.LOCAL_OWNER });
const VIENNA = { lat: 48.2082, lng: 16.3738 };
const BELVEDERE = { lat: 48.1915, lng: 16.3806 };
const PRAGUE = { lat: 50.0755, lng: 14.4378 };
const digest = (v) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);

/** A trip with a fixed `id` (so `.id` equality is under the probe's control) and named cities. */
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
function sourceWithPlace(fields, prefix = 'src', tripId = 'trip-src', cityName = 'Vienna') {
  let t = mintedTrip(tripId, prefix, [{ name: cityName, centre: VIENNA }]);
  t = addPlace(t, { id: 'p-src', cityKey: t.cities[0].key, name: 'Habyt Vienna', at: BELVEDERE, category: 'stay', ...fields });
  t = core.addStop(
    t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Check in', category: 'stay', place: { kind: 'place', placeId: 'p-src' } }, C(prefix + 's'),
  );
  return t;
}

const copyAcross = (target, source, prefix = 'c') =>
  core.copyStopInto(
    target, { trip: source, stopId: 's-src' },
    { kind: 'scheduled', dayId: '2026-08-09', time: '11:00', order: 0 }, CC(prefix),
  );

const copiedStop = (t) => t.days.find((d) => d.id === '2026-08-09').stops[0];

/** Re-parses a document through the live import route, so the probe measures what `importDoc` sees. */
const reparse = (t, mutate) => {
  const raw = JSON.parse(core.toJSON(t));
  if (mutate) mutate(raw);
  return core.fromJSON(JSON.stringify(raw));
};

/* --- A-20 (revision 15): the two halves every `hours` assertion below is stated in. ---------
 * `fromJSON` now validates `Place.hours`, so a hostile fixture can no longer ARRIVE by parse.
 * It arrives by cast, and the parser's refusal is asserted beside it. Same construction as
 * `packages/core/test/copyStop.test.ts`'s `castWithHours` / `refusedByParser`. */

/** A source trip whose `Place.hours` is set BY CAST — it never goes through the parser. */
const castWithHours = (hours, prefix = 'src') => {
  const t = sourceWithPlace({ note: 'ordinary prose' }, prefix);
  return { ...t, places: t.places.map((p) => ({ ...p, hours })) };
};

/** The parser's half: `fromJSON` refuses `hours`, and the JSON path it names. Returns the path. */
const parserVerdict = (hours) => {
  const raw = JSON.parse(core.toJSON(sourceWithPlace({ note: 'ordinary prose' })));
  raw.places[0].hours = hours;
  try {
    const t = core.fromJSON(JSON.stringify(raw));
    return { accepted: true, hours: t.places[0].hours };
  } catch (e) {
    return { accepted: false, name: e.constructor.name, path: e.path, message: e.message };
  }
};

/* ==================================================== §1 A-15 field coverage ==== */

line('§1.1 A-15 — `placeForCopy`\'s one surviving spread: `hours.weekly` entries (R15-1)');
{
  // §2.14 A-15, in its own words: "there is no remaining spread of a source `Place` into the
  // target document; a builder who leaves one has not landed this ruling." `placeForCopy`
  // clones `weekly` with `{...w}`, which is a spread of whatever the source document actually
  // holds — and when this was written `fromJSON`'s `parsePlace` passed `hours` through as a
  // RAW CAST, so `weekly[i]` was not structurally validated at all.
  //
  // **Re-expressed by round 17 (A-20).** The parser now rebuilds each entry from three named
  // fields, so the carrier cannot arrive by parse. A-20 puts an extra key on a structurally
  // VALID entry on the *normalise* side, not the refuse side (`parseLinks` drops a third key on
  // a `Link` the same way), so the parser's half here is "the key is DROPPED", not "refused" —
  // and the copy's half is measured on a cast-built document, which is the only population that
  // can still hold the key.
  const hostileHours = {
    weekly: [{
      day: 1, open: '09:00', close: '17:00',
      note: 'Front door PIN 0754, conf 5814731574 - ask for jacob@example.com',
      href: 'https://vendor.example/booking/GYGG45MLA9Q9',
    }],
  };
  const verdict = parserVerdict(hostileHours);
  ok('A-20: the parser ACCEPTS a structurally valid entry and DROPS the unenumerated key',
    verdict.accepted && JSON.stringify(Object.keys(verdict.hours.weekly[0]).sort()) === '["close","day","open"]',
    JSON.stringify(verdict));
  ok('A-20: so no credential survives `fromJSON` on this shape at all',
    verdict.accepted && !core.toJSON({ ...sourceWithPlace({}), places: [{ ...sourceWithPlace({}).places[0], hours: verdict.hours }] })
      .includes('0754'), JSON.stringify(verdict.hours));

  // The other half, and the one this finding was always about: the same entry arriving BY CAST,
  // the way an in-process writer or a native bridge could still build it.
  const src = castWithHours(hostileHours);
  ok('the cast-built fixture really does carry the extra key (or it is testing nothing)',
    src.places[0].hours.weekly[0].note !== undefined);

  const target = mintedTrip('trip-tgt', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  const after = copyAcross(target, src);
  const copied = after.places[0];
  note('copied hours.weekly[0] = ' + JSON.stringify(copied.hours.weekly[0]));
  const doc = core.toJSON(after);
  for (const needle of ['0754', '5814731574', 'GYGG45MLA9Q9', 'jacob@example.com']) {
    ok(`A-15: ${needle} does NOT reach the recipient's document via hours.weekly`,
      !doc.includes(needle), 'greppable in the recipient\'s whole toJSON');
  }
  ok('A-15: no field of a source `Place` crosses unclassified',
    Object.keys(copied.hours.weekly[0]).every((k) => ['day', 'open', 'close'].includes(k)),
    'weekly entry keys: ' + Object.keys(copied.hours.weekly[0]).join(','));
}

line('§1.2 A-15 — `hours.note` is only redacted when it happens to be a string (R15-1)');
{
  // Re-expressed by round 17 (A-20). This section used to build the fixture with `reparse`,
  // which now throws `TripParseError: expected a string (at $.places[0].hours.note)` and
  // aborted the whole probe. Both halves are kept: the parser refuses at the exact path, and
  // the cast-built equivalent still crosses the copy boundary redacted rather than verbatim.
  for (const [label, value] of [['an object', { pin: 'PIN 0754' }], ['a number', 5814731574], ['an array', ['conf 5814731574']]]) {
    const v = parserVerdict({ weekly: [], note: value });
    ok(`A-20: fromJSON REFUSES an hours.note that is ${label}, naming the path`,
      !v.accepted && v.name === 'TripParseError' && v.path === '$.places[0].hours.note',
      JSON.stringify(v));

    const src = castWithHours({ weekly: [], note: value }, 'n' + label.length);
    const target = mintedTrip('trip-tgt', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
    let copied = null, threw = null;
    try { copied = copyAcross(target, src).places[0]; } catch (e) { threw = `${e.constructor.name}: ${e.message}`; }
    ok(`R15-2 stays closed: copyStopInto does not throw on a cast-built hours.note that is ${label}`,
      threw === null, String(threw));
    ok(`A-15: a cast-built hours.note as ${label} is not carried verbatim`,
      copied !== null && JSON.stringify(copied.hours.note) !== JSON.stringify(value),
      'redactText passes a non-string straight through and `as string` hid it: ' + JSON.stringify(copied?.hours?.note));
  }
}

line('§1.3 R15-2 — the six shapes: refused by the parser, and the cast-built copy still never throws');
{
  // Re-expressed by round 17. R15-2's six shapes used to reach the copy path THROUGH `fromJSON`;
  // A-20 refuses all six at the parser, each with a JSON path. The finding's own closure —
  // *the copy may not throw on a document that never went through the parser* — is unchanged
  // and is now stated against the population that can still produce it: a cast.
  const shapes = [
    ['hours: {} (no weekly)', {}, '$.places[0].hours.weekly'],
    ['hours: a string', 'closed mondays', '$.places[0].hours'],
    ['hours: a number', 7, '$.places[0].hours'],
    ['hours: an array', [1, 2], '$.places[0].hours'],
    ['hours: null', null, '$.places[0].hours'],
    ['hours.weekly: a string', { weekly: 'mon-fri' }, '$.places[0].hours.weekly'],
  ];
  let threw = 0, accepted = 0, wrongPath = [];
  for (const [label, hours, path] of shapes) {
    const v = parserVerdict(hours);
    if (v.accepted) accepted++;
    else if (v.path !== path || v.name !== 'TripParseError') wrongPath.push(`${label} -> ${v.name}@${v.path}`);
    else note(`${label} -> ${v.message}`);

    const src = castWithHours(hours, 'c' + label.length);
    const target = mintedTrip('trip-tgt', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
    try {
      copyAcross(target, src);
    } catch (e) {
      threw++;
      note(`  cast-built ${label} -> ${e.constructor.name}: ${e.message}`);
    }
  }
  ok('A-20: fromJSON refuses all six, each with a TripParseError naming the exact JSON path',
    accepted === 0 && wrongPath.length === 0, `${accepted} accepted; wrong path: ${wrongPath.join(' | ')}`);
  ok('R15-2 stays closed: none of the six crashes copyStopInto when it arrives BY CAST', threw === 0,
    `${threw}/${shapes.length} cast-built shapes crash copyStopInto`);
  ok('validateTrip reports a malformed `hours` before the copy path meets it',
    core.validateTrip(castWithHours({}, 'vt'))
      .some((i) => i.code === 'place_hours_malformed'),
    'nothing in validateTrip mentions `hours`, so nothing warns the user first');
}

line('§1.4 A-15 — what the ruling\'s table DOES deliver (confirmations)');
{
  const CRED = 'Front door PIN 0754, conf 5814731574 - ask for jacob@example.com';
  const src = sourceWithPlace({
    note: CRED,
    links: [{ label: 'Voucher', href: 'https://vendor.example/booking/GYGG45MLA9Q9' }],
    hours: { weekly: [null, { day: 1, open: '09:00', close: '17:00' }], note: 'code 4417' },
  });
  const target = mintedTrip('trip-tgt', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  const after = copyAcross(target, src);
  const copy = after.places[0];
  ok('the copied place\'s note has no redactionHits', core.redactionHits(copy.note).length === 0, copy.note);
  ok('`links` is absent, not emptied', !('links' in copy));
  ok('`hours.note` is redacted', copy.hours.note === '[redacted]', JSON.stringify(copy.hours.note));
  ok('`hours.weekly` structure crosses intact',
    JSON.stringify(copy.hours.weekly) === JSON.stringify([null, { day: 1, open: '09:00', close: '17:00' }]));
  ok('`name`, `category` and `at` cross verbatim',
    copy.name === 'Habyt Vienna' && copy.category === 'stay' && copy.at.lat === BELVEDERE.lat);
  const doc = core.toJSON(after);
  ok('none of the four credentials is greppable in the recipient\'s document',
    ['0754', '5814731574', 'GYGG45MLA9Q9', 'jacob@example.com'].every((n) => !doc.includes(n)));

  // Redaction is not a wipe, and the key-presence rules hold.
  const plain = copyAcross(mintedTrip('trip-t2', 't2', [{ name: 'Vienna', centre: VIENNA }]),
    sourceWithPlace({ note: 'entrance is on the north side' }), 'c2').places[0];
  ok('a non-credential note crosses BYTE-IDENTICAL', plain.note === 'entrance is on the north side', plain.note);
  const bare = copyAcross(mintedTrip('trip-t3', 't3', [{ name: 'Vienna', centre: VIENNA }]),
    sourceWithPlace({}), 'c3').places[0];
  ok('an absent note/hours is not invented', !('note' in bare) && !('hours' in bare), Object.keys(bare).join(','));
  const nullAt = copyAcross(mintedTrip('trip-t4', 't4', [{ name: 'Vienna', centre: VIENNA }]),
    (() => { const t = sourceWithPlace({}); return { ...t, places: t.places.map((p) => ({ ...p, at: null })) }; })(), 'c4');
  ok('a null coordinate crosses as null rather than as a fabricated point',
    nullAt.places.length === 1 && nullAt.places[0].at === null && copiedStop(nullAt).place.kind === 'place',
    JSON.stringify(nullAt.places[0]));
}

line('§1.5 A-15 — over-redaction, measured (a rule that redacts everything is also wrong)');
{
  const target = mintedTrip('trip-tgt', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  const cases = [
    ['plain prose', 'entrance is on the north side'],
    ['empty string', ''],
    ['a street number', 'Prinz-Eugen-Strasse 27'],
    ['a year', 'built in 1723'],
    ['opening line', 'open 09:00-17:00, closed Mondays'],
    ['unicode prose', 'Eingang über den Hof — 入口は中庭です'],
    ['"the booking is done"', 'the booking is done'],
    ['5000 chars of prose', 'a'.repeat(5000)],
    ['an ALL-CAPS word', 'Entrance via the MUSEUM courtyard'],
    ['only a URL', 'https://wien.info/belvedere'],
    ['a phone number', 'call +43 1 795 570'],
  ];
  const moved = [];
  for (const [label, n] of cases) {
    const copy = copyAcross(target, sourceWithPlace({ note: n }, 'ov' + cases.indexOf(label)), 'ov').places[0];
    if (copy.note !== n) moved.push(label);
  }
  note('notes changed by the copy: ' + JSON.stringify(moved));
  ok('only the three §6.6 already discloses as over-broad move',
    JSON.stringify(moved) === JSON.stringify(['an ALL-CAPS word', 'only a URL', 'a phone number']),
    JSON.stringify(moved));
}

/* ============================ §2 the rest of the copied stop — A-15's siblings ==== */

line('§2.1 `Stop.cost.note` and `Stop.arrival.label` cross the person boundary verbatim (R15-3)');
{
  let src = mintedTrip('trip-src', 'sib', [{ name: 'Vienna', centre: VIENNA }]);
  src = core.addStop(
    src, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    {
      id: 's-src', name: 'Tour', category: 'sight', place: { kind: 'none' }, note: 'plain prose',
      cost: { display: '€10', note: 'paid with card, conf 5814731574', amounts: [{ lo: 10, hi: 10, currency: 'EUR', basis: 'per_person' }] },
      arrival: { mode: 'bus', mins: 20, label: 'Bus 8, booking GYGG45MLA9Q9' },
    }, C('sibs'),
  );
  const target = mintedTrip('trip-tgt', 'tgt', [{ name: 'Vienna', centre: VIENNA }]);
  const after = copyAcross(target, src, 'sib');
  const clone = copiedStop(after);
  note('copied cost.note    = ' + JSON.stringify(clone.cost.note));
  note('copied arrival.label = ' + JSON.stringify(clone.arrival.label));
  ok('§6.6 free text: the copied `cost.note` carries no credential',
    core.redactionHits(clone.cost.note).length === 0, core.redactionHits(clone.cost.note).join(','));
  ok('§6.6 free text: the copied `arrival.label` carries no credential',
    core.redactionHits(clone.arrival.label).length === 0, core.redactionHits(clone.arrival.label).join(','));
  const doc = core.toJSON(after);
  for (const n of ['5814731574', 'GYGG45MLA9Q9']) {
    ok(`${n} does not reach the recipient's document`, !doc.includes(n), 'greppable in toJSON');
  }

  // The asymmetry A-15's own text calls "the finding", one record further out: the SAMPLE path
  // redacts both of these (redactStop redacts `cost.note`; `redactStringsDeep` catches
  // `arrival.label`, which is not a STRUCTURAL_KEY), and the COPY path redacts neither.
  const sampled = redactMod.redactForSample(src);
  const ss = sampled.days.find((d) => d.id === '2026-08-08').stops[0];
  note('sample path cost.note     = ' + JSON.stringify(ss.cost.note));
  note('sample path arrival.label = ' + JSON.stringify(ss.arrival.label));
  ok('the two thresholds agree on these two fields',
    core.redactionHits(ss.cost.note).length === core.redactionHits(clone.cost.note).length,
    'the sample path fails closed on both and the copy path fails open on both — A-15\'s own direction argument, un-applied to `Stop`');
}

line('§2.2 exposure on the reference trip today (measurement, not a claim)');
{
  const { trip } = loadEurope2026();
  const stops = [...trip.days.flatMap((d) => d.stops), ...trip.pool];
  note(`stops ${stops.length}: with cost.note ${stops.filter((s) => s.cost?.note).length}, ` +
    `with arrival.label ${stops.filter((s) => s.arrival?.label).length}`);
  note(`places ${trip.places.length}: with note ${trip.places.filter((p) => p.note !== undefined).length}, ` +
    `credential-shaped ${trip.places.filter((p) => core.redactionHits(p.note ?? '').length).length}, ` +
    `with links ${trip.places.filter((p) => p.links?.length).length}, with hours ${trip.places.filter((p) => p.hours).length}`);
  note('so the reference trip has no exposure to R15-1/R15-2/R15-3 today; the live route is fromJSON/importDoc, as it was for R14-4.');
}

/* =============================================================== §3 A-16 ==== */

/** A trip with two cities named Vienna, one place filed under the SECOND, and a stop on it. */
function twoViennas(prefix = 'hub') {
  let t = mintedTrip('trip-hub', prefix, [
    { name: 'Vienna', centre: VIENNA, order: 0 }, { name: 'Vienna', centre: VIENNA, order: 1 },
  ]);
  const secondKey = t.cities[1].key;
  t = addPlace(t, { id: 'p-src', cityKey: secondKey, name: 'Belvedere', at: BELVEDERE, category: 'sight' });
  t = core.addStop(
    t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'p-src' } }, C(prefix + 's'),
  );
  return { trip: t, secondKey };
}

line('§3.1 A-16 assertions 1–4, re-derived');
{
  const { trip, secondKey } = twoViennas();
  const within = copyAcross(trip, trip, 'w1');
  ok('two-Vienna within-trip copy keeps the place\'s OWN key and adds no row',
    within.places.length === 1 && within.places[0].cityKey === secondKey,
    `${within.places.length} rows, key ${within.places[0].cityKey}`);
  ok('...and the stop still points at the original place',
    copiedStop(within).place.kind === 'place' && copiedStop(within).place.placeId === 'p-src');
  ok('...and no new unknown_city_key', core.validateTrip(within).filter((i) => i.code === 'unknown_city_key').length === 0);

  // Assertion 4: the same document as a DIFFERENT object is byte-identical.
  const snapshot = reparse(trip);
  ok('the fixture really is two objects with one id', snapshot !== trip && snapshot.id === trip.id);
  ok('A-16 assertion 4: same `.id`, different object -> byte-identical output',
    core.toJSON(copyAcross(trip, snapshot, 'w1')) === core.toJSON(within));

  // Determinism: the same copy twice.
  ok('A-16 assertion 5: the same copy run twice is byte-identical',
    digest(core.toJSON(copyAcross(trip, trip, 'w1'))) === digest(core.toJSON(within)));

  // Assertion 3: the stale source.
  const target = { ...trip, cities: trip.cities.filter((c) => c.key !== secondKey) };
  const stale = copyAcross(target, trip, 'st');
  const unknown = (t) => core.validateTrip(t).filter((i) => i.code === 'unknown_city_key').length;
  ok('A-16 assertion 3: a stale source mints NO NEW unknown_city_key',
    unknown(stale) === unknown(target), `${unknown(target)} before, ${unknown(stale)} after`);
  ok('...and falls through to name matching, landing on the surviving Vienna',
    stale.places[stale.places.length - 1].cityKey === target.cities[0].key);
  const renamed = { ...target, cities: target.cities.map((c) => ({ ...c, name: 'Prague' })) };
  const gone = copyAcross(renamed, trip, 'st2');
  ok('...and with the NAME gone too, all the way to step 3 — a hole, never a wrong filing',
    gone.places.length === renamed.places.length && copiedStop(gone).place.kind === 'inline');

  // The coincidence the ruling refuses to trust.
  const coinSrc = sourceWithPlace({}, 'coin', 'trip-a', 'Vienna');
  const coinTgt = mintedTrip('trip-b', 'coin', [{ name: 'Prague', centre: PRAGUE }]);
  ok('the fixture really does share a city key across two documents',
    coinSrc.cities[0].key === coinTgt.cities[0].key && coinSrc.id !== coinTgt.id);
  const coin = copyAcross(coinTgt, coinSrc, 'coin');
  ok('A-16: a shared key between two DOCUMENTS is a coincidence, not an identity',
    coin.places.length === 0 && copiedStop(coin).place.kind === 'inline');

  // Blank-named city, within and across.
  let blank = mintedTrip('trip-blank', 'bl', [{ name: '   ', centre: VIENNA }]);
  blank = addPlace(blank, { id: 'p-src', cityKey: blank.cities[0].key, name: 'Belvedere', at: BELVEDERE, category: 'sight' });
  blank = core.addStop(blank, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'p-src' } }, C('bls'));
  const bw = copyAcross(blank, blank, 'bl2');
  ok('a blank-named city keeps the place link WITHIN one trip',
    copiedStop(bw).place.kind === 'place' && bw.places.length === 1);
  const ba = copyAcross(mintedTrip('trip-other', 'ot', [{ name: '', centre: VIENNA }]), blank, 'bl3');
  ok('...and still takes step 3 ACROSS two documents (A-14 assertion 5, unmoved)',
    ba.places.length === 0 && copiedStop(ba).place.kind === 'inline');
}

line('§3.2 A-16 — step 1 staying FIRST is unpinned by any test or probe (R15-4)');
{
  // The ruling makes the ORDER load-bearing in writing: "it stays **first**. A place filed
  // under a key its own document cannot resolve has no city ... and re-filing must not paper
  // over it — so shape 3 takes step 3 **even within one trip**, deliberately."
  //
  // Within ONE object, `source.cities` and `target.cities` are the same array, so step 1 and
  // step 2 can never disagree and the order is unobservable. The only document class where the
  // order IS observable is a source snapshot that is stale in the other direction: the target
  // has GAINED the city since the snapshot, and the place is filed under it.
  let target = mintedTrip('trip-gain', 'gn', [{ name: 'Vienna', centre: VIENNA }]);
  const gainedKey = 'city-later';
  target = { ...target, cities: [...target.cities, { key: gainedKey, name: 'Prague', countryCode: 'CZ', centre: PRAGUE, order: 1 }] };
  // The snapshot the pane still holds: no such city, but a place already filed under the key.
  let stale = { ...target, cities: target.cities.filter((c) => c.key !== gainedKey) };
  stale = addPlace(stale, { id: 'p-src', cityKey: gainedKey, name: 'Belvedere', at: BELVEDERE, category: 'sight' });
  stale = core.addStop(stale, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'p-src' } }, C('gns'));
  target = { ...target, places: stale.places, days: stale.days };

  const after = copyAcross(target, stale, 'gn2');
  const landed = copiedStop(after).place;
  note('with step 1 first (shipped): copied place link = ' + JSON.stringify(landed) +
    `, place rows ${after.places.length}`);
  note('with step 2 first (the reordering the ruling forbids): the key is returned and the place ' +
    'is filed under the target\'s `' + gainedKey + '` — a DIFFERENT, observable outcome.');
  ok('shipped behaviour is A-16\'s: step 3, the record does not travel',
    landed.kind === 'inline', JSON.stringify(landed));
  note('SO: the order is behaviourally load-bearing on this document class. At bd195bd no shipped ' +
    'test covered it — `copyStop.test.ts:1032`\'s "A-16 step 1 stays first" fixture files the ' +
    'place under `city_gone`, a key NEITHER document holds, so step 2 is false there whatever ' +
    'the order, and moving step 2 above step 1 in a scratch worktree left 568/568 green.');
  // ROUND 16 re-expression. R15-4 was a statement about the SHIPPED SUITE, not a measurement of
  // the product, so no product change could turn the old `ok(..., false, ...)` line green. The
  // builder added the missing coverage at `copyStop.test.ts:1510` ("A-16 step 1 stays first: a
  // key only the TARGET can resolve still takes step 3"), on this exact document class. Round 16
  // re-derived the mutation in a scratch `git worktree` at bff7a81 rather than trusting the
  // claim: moving step 2 above step 1 turns EXACTLY that one test red (67 pass / 1 fail).
  ok('R15-4 CLOSED: the load-bearing ordering is now pinned by copyStop.test.ts:1510, and the ' +
    'reordering the ruling forbids turns exactly that test red (mutation-verified, round 16)',
    /A-16 step 1 stays first: a key only the TARGET can resolve still takes step 3/
      .test(readFileSync(HERE + 'packages/core/test/copyStop.test.ts', 'utf8')),
    'the probe can only confirm the test EXISTS; the mutation is a scratch-worktree edit, never made in this tree');
}

line('§3.3 A-16 — a colliding trip id between two library documents (reachability)');
{
  // The ruling's own worry, checked rather than reasoned about: `importDoc` re-mints the id of
  // an arriving document whose id is already in storage, so two DIFFERENT documents sharing a
  // `.id` is not reachable through the shipped import route.
  const s = readFileSync(HERE + 'packages/client/src/store/store.ts', 'utf8');
  ok('importDoc re-mints a colliding trip id before it lands in the library',
    /if \(\(await ports\.storage\.load\(doc\.id\)\) !== null\)/.test(s) && /doc = \{ \.\.\.doc, id: fresh/.test(s));
  // And what it would do if it ever were: the place is filed under the target's key of the same
  // name, which is the shape A-16 says the same-document conjunct exists to prevent.
  const a = sourceWithPlace({}, 'k1', 'trip-same', 'Vienna');
  const b = mintedTrip('trip-same', 'k1', [{ name: 'Prague', centre: PRAGUE }]);
  ok('the fixture really is two different documents with one id and one shared key',
    a.id === b.id && a.cities[0].key === b.cities[0].key);
  const c = copyAcross(b, a, 'k2');
  note(`if it were reachable: ${c.places.length} row(s), cityKey ` +
    JSON.stringify(c.places.map((p) => p.cityKey)) + ' — a Vienna place filed under Prague.');
  ok('...bounded, because the id collision itself is not reachable through importDoc', true);
}

line('§3.4 A-14/A-16 re-file the PLACE\'s cityKey; the POOL PLACEMENT\'s is still raw (R15-6)');
{
  // §2.14 rule 4 and A-14/A-16 are all about `Place.cityKey`. A-14's own change table puts
  // `StopPlacement.pool.cityKey` in the *"Nothing else — they compare keys and never read
  // them"* row, which is true inside one document and false at the one place a record moves
  // between documents. `copyStopInto` takes the caller's `placement` verbatim and validates
  // only the `scheduled` branch's `dayId`, so a `pool` placement carrying the SOURCE's key is
  // written straight into the target — R13-6's harm class, through the placement.
  //
  // ROUND 16 re-expression. A-19 (revision 14) rules that a placement is an ARGUMENT about the
  // target, so its `cityKey` is validated exactly as `dayId` is and never re-filed. The line
  // below used to assert against a RETURNED document; that call is now a hard `Error`, and
  // A-19 assertion 7 hands the re-expression to QA. It is a `throws` assertion now.
  const src = sourceWithPlace({}, 'pl', 'trip-src', 'Vienna');
  const target = mintedTrip('trip-tgt', 'plt', [{ name: 'Vienna', centre: VIENNA }]);
  const before = core.toJSON(target);
  let err = null;
  try {
    core.copyStopInto(target, { trip: src, stopId: 's-src' },
      { kind: 'pool', cityKey: src.cities[0].key }, CC('pl2'));
  } catch (e) { err = e; }
  note('target city keys: ' + JSON.stringify(target.cities.map((c) => c.key)) +
    ' | source key offered: ' + JSON.stringify(src.cities[0].key) +
    ' | result: ' + (err ? err.message : 'returned a document'));
  ok('R15-6 CLOSED: a cross-trip copy into the POOL under the SOURCE\'s key is REFUSED, so it can ' +
    'no longer mint an unrepairable `pool_stop_unknown_city` in the recipient\'s document',
    err instanceof Error && /no such city .* in trip-tgt/.test(err.message), String(err));
  ok('...and the target is unmoved behind the throw', core.toJSON(target) === before, '');
  // The two keys A-19 rules legal, so this line measures a refusal and not a blanket ban.
  const transit = core.copyStopInto(target, { trip: src, stopId: 's-src' },
    { kind: 'pool', cityKey: 'transit' }, CC('pl3'));
  ok('...while TRANSIT_CITY_KEY and a key the target DOES have both still succeed',
    transit.pool.length === 1 &&
    core.copyStopInto(target, { trip: src, stopId: 's-src' },
      { kind: 'pool', cityKey: target.cities[0].key }, CC('pl4')).pool.length === 1,
    'the full A-19 matrix is qa/r16-copy-depth.mjs §3');
  ok('no shipped caller offers a pool placement to copyStopInto today (bounds it)',
    !/type: 'copyStopInto'[\s\S]{0,400}kind: 'pool'/.test(readFileSync(HERE + 'apps/web/src/views/BrowsePane.tsx', 'utf8')));
}

/* =========================================================== §4 R14-3 ==== */

line('§4.1 R14-3 — the clone holds from BOTH directions');
{
  // Two DIFFERENT documents, so structural sharing inside one document cannot be mistaken for
  // the alias R14-3 was about.
  let src = mintedTrip('trip-inline', 'il', [{ name: 'Vienna', centre: VIENNA }]);
  src = core.addStop(src, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Inline', category: 'sight', place: { kind: 'inline', at: { lat: 1, lng: 2 } } }, C('ils'));
  const tgt0 = mintedTrip('trip-inline-t', 'ilt', [{ name: 'Vienna', centre: VIENNA }]);
  const after = copyAcross(tgt0, src, 'il2');
  const before = core.toJSON(after);
  const srcAt = src.days.find((d) => d.id === '2026-08-08').stops[0].place.at;
  ok('the two documents do not share one LatLng object', srcAt !== copiedStop(after).place.at);
  srcAt.lat = 99;
  const reached = core.toJSON(after) !== before;
  ok('mutating the SOURCE stop\'s inline `at` after the copy leaves the target unmoved',
    !reached, reached ? 'the mutation reached the target document' : '');
  const srcBefore = core.toJSON(src);
  copiedStop(after).place.at.lng = 77;
  ok('mutating the TARGET stop\'s inline `at` leaves the source unmoved', core.toJSON(src) === srcBefore);

  let n = mintedTrip('trip-none', 'nn', [{ name: 'Vienna', centre: VIENNA }]);
  n = core.addStop(n, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'No place', category: 'sight', place: { kind: 'none' } }, C('nns'));
  const an = copyAcross(mintedTrip('trip-none-t', 'nnt', [{ name: 'Vienna', centre: VIENNA }]), n, 'nn2');
  ok('{kind:\'none\'} is a fresh object too',
    n.days.find((d) => d.id === '2026-08-08').stops[0].place !== copiedStop(an).place);

  // A-15's own no-aliasing assertion, from the source side.
  const psrc = sourceWithPlace({ note: 'ordinary', hours: { weekly: [{ day: 1, open: '09:00', close: '17:00' }] } }, 'al');
  const ptgt = mintedTrip('trip-al', 'alt', [{ name: 'Vienna', centre: VIENNA }]);
  const ac = copyAcross(ptgt, psrc, 'al2');
  const b2 = core.toJSON(ac);
  psrc.places[0].at.lat = 0;
  psrc.places[0].hours.weekly[0].open = '00:00';
  psrc.places[0].name = 'CHANGED';
  ok('mutating the SOURCE place after the copy leaves the target unmoved', core.toJSON(ac) === b2);
}

line('§4.2 every other alias `copyStopInto` still holds (R14-3\'s neighbours)');
{
  let src = mintedTrip('trip-a', 'ali', [{ name: 'Vienna', centre: VIENNA }]);
  src = core.addStop(src, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    {
      id: 's-src', name: 'Tour', category: 'sight', place: { kind: 'none' },
      cost: { display: '€10', amounts: [{ lo: 10, hi: 10, currency: 'EUR', basis: 'per_person' }] },
      arrival: { mode: 'bus', mins: 20 }, links: [{ label: 'L', href: 'https://e.test/x' }], flags: ['ticketed'],
    }, C('alis'));
  const tgt = mintedTrip('trip-b', 'alt2', [{ name: 'Vienna', centre: VIENNA }]);
  const after = copyAcross(tgt, src, 'ali2');
  const s0 = src.days.find((d) => d.id === '2026-08-08').stops[0];
  const s1 = copiedStop(after);
  const pairs = [
    ['cost', s0.cost, s1.cost], ['cost.amounts[0]', s0.cost.amounts[0], s1.cost.amounts[0]],
    ['arrival', s0.arrival, s1.arrival], ['links[0]', s0.links[0], s1.links[0]], ['flags', s0.flags, s1.flags],
  ];
  for (const [label, a, b] of pairs) ok(`${label} is a fresh object in the target`, a !== b, a !== b ? '' : 'shared object');
}

/* =========================================================== §5 A-17 ==== */

line('§5.1 A-17\'s directional test vs the mechanism it is protecting (R15-5)');
{
  // A-17 point 3's safety argument has two halves: (a) a horizoned rule emits a resolvable
  // `{kind:'day'}` subject, and (b) `beyondHorizon` suppresses only when EVERY subject is
  // beyond. The shipped test catches (a). It cannot catch (b), because on its `duplicate_id`
  // fixture the ambiguous stop ref always resolves to the EARLIER of the two days — so the
  // ambiguous subject is always NEARER than the day the rule iterated, and `every` vs `some`
  // is unobservable. Reversing `days` puts the ambiguity in the other direction.
  const c = C('dup');
  let dup = core.createTrip({ title: 'D', startDate: '2026-05-01', endDate: '2026-09-01',
    cities: [{ name: 'Vienna', order: 0, centre: VIENNA }] }, c);
  const init = { id: 'stop-dup', name: 'Tick', category: 'sight', place: { kind: 'none' },
    cost: { display: '€10', amounts: [{ lo: 10, hi: 10, currency: 'EUR', basis: 'per_person' }] },
    links: [{ label: 'T', href: 'https://e.test/t' }] };
  dup = core.addStop(dup, { kind: 'scheduled', dayId: '2026-05-01', time: '10:00', order: 0 }, init, c);
  dup = core.addStop(dup, { kind: 'scheduled', dayId: '2026-09-01', time: '10:00', order: 0 }, init, c);
  const rev = reparse(dup, (raw) => { raw.days = raw.days.slice().reverse(); });

  const horizons = new Map(detectMod.RULES.filter((r) => r.horizonDays !== undefined).map((r) => [r.id, r.horizonDays]));
  const CLOCKS = ['2019-01-01', '2026-08-01', '2026-08-24', '2026-08-30', '2027-08-30', '2030-01-01']
    .concat(Array.from({ length: 400 }, (_, i) => new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10)));
  const sweep = (trip) => {
    let checked = 0, withheld = 0;
    for (const today of CLOCKS) {
      const gated = new Set(core.detectConflicts(trip, { today }).map((x) => x.id));
      for (const cf of detectMod.detectUngated(trip, { today })) {
        const h = horizons.get(cf.ruleId); if (h === undefined) continue;
        const d = Number(cf.params.daysOut);
        if (!Number.isFinite(d) || d < 0 || d > h) continue;
        checked++;
        if (!gated.has(cf.id)) withheld++;
      }
    }
    return { checked, withheld };
  };
  const a = sweep(dup), b = sweep(rev);
  note(`A-17's own fixture (days ascending):  ${a.checked} checks in the band, ${a.withheld} withheld`);
  note(`the same document, days reversed:     ${b.checked} checks in the band, ${b.withheld} withheld`);
  ok('both documents pass the assertion against the SHIPPED code, as they must',
    a.withheld === 0 && b.withheld === 0);
  note('Verified by mutation in a scratch worktree at bd195bd: changing `beyondHorizon`\'s ' +
    '`subjects.every(...)` to `subjects.some(...)` — an inversion of the exact asymmetry A-17 ' +
    'point 3 and §8.2 ruling 1 both rest on — leaves 568/568 tests GREEN, including A-17\'s own ' +
    'directional test. On the reversed-days document the same mutation withholds 61 findings ' +
    'inside their own horizon.');
  // ROUND 16 re-expression. Like R15-4, R15-5 was a statement about the SHIPPED SUITE and no
  // product change could turn the old `ok(..., false, ...)` line green. The builder added a
  // `duplicate-stop-id-far` fixture to `horizonGate.test.ts`'s `sweptDocuments()` — the same
  // duplicate_id construction with `days` REVERSED and dated 2026-08-15 / 2026-12-01, so one of
  // the six swept clocks lands in the discriminating band. Round 16 re-derived the mutation in a
  // scratch `git worktree` at bff7a81 rather than trusting the claim: `every` -> `some` now
  // turns A-17's own directional test red across the WHOLE suite (582 pass / 1 fail).
  ok('R15-5 CLOSED: `beyondHorizon`\'s `every` is now pinned in the shipped suite by ' +
    'horizonGate.test.ts\'s `duplicate-stop-id-far` fixture, and inverting it turns A-17\'s ' +
    'directional test red (mutation-verified, round 16)',
    /duplicate-stop-id-far/.test(readFileSync(HERE + 'packages/core/test/horizonGate.test.ts', 'utf8')),
    'the probe can only confirm the fixture EXISTS; the mutation is a scratch-worktree edit, never made in this tree');
  // The half it DOES catch, recorded so the next round does not re-derive it.
  note('The half it does catch, also verified by mutation: deleting `unbooked_ticketed`\'s ' +
    '{kind:\'day\'} subject turns A-11(3), A-11(5) and A-17 all red, and A-17 fails ON the ' +
    'duplicate_id document with its own message.');
  ok('§8.2\'s own `every` (suppressedAsPast) IS covered — 3 shipped tests go red when inverted', true);
}

/* ======================================================= §6 ceilings ==== */

line('§6.1 the export surface and the read-only boundary');
{
  // Round 22: 71 -> 73. Phase 2 I-5 (`897b928`) added `countryOf` and `COUNTRY_INDEX`.
  ok('§2.10 export surface is 73', Object.keys(core).length === 73, String(Object.keys(core).length));
  ok('`placeForCopy` and `refileCityKey` are module-private',
    !('placeForCopy' in core) && !('refileCityKey' in core));
  const src = readFileSync(HERE + 'packages/core/src/build/copyStop.ts', 'utf8');
  ok('neither is exported from its own module',
    !/export function placeForCopy/.test(src) && !/export function refileCityKey/.test(src));
  const rootDirty = execFileSync('git', ['status', '--porcelain', 'europe-2026-itinerary.html', 'docs', 'tickets'],
    { cwd: HERE + '..', encoding: 'utf8' });
  ok('the read-only boundary: repo-root planner, docs/ and tickets/ untouched', rootDirty.trim() === '', rootDirty.trim());
}

line('§6.2 the reference trip\'s ceilings, re-derived');
{
  const { trip } = loadEurope2026();
  const cs = core.detectConflicts(trip, { today: FIXTURE_TODAY });
  const counts = [cs.filter((c) => c.severity === 'blocker').length, cs.filter((c) => c.severity === 'warning').length,
    cs.filter((c) => c.severity === 'note').length].join('/');
  ok('2/4/11 at FIXTURE_TODAY', counts === '2/4/11', counts);
  ok('validateTrip: 11 issues, unmoved', core.validateTrip(trip).length === 11, String(core.validateTrip(trip).length));
  try {
    execFileSync('node', ['tools/gen-golden.mjs'], { cwd: HERE, stdio: 'pipe' });
    execFileSync('node', ['tools/gen-sample.mjs'], { cwd: HERE, stdio: 'pipe' });
    const dirty = execFileSync('git', ['status', '--porcelain', 'fixtures', 'apps'], { cwd: HERE, encoding: 'utf8' });
    ok('goldens and sample regenerate byte-identically', dirty.trim() === '', dirty.trim());
  } catch (e) { ok('goldens and sample regenerate byte-identically', false, String(e.message).slice(0, 200)); }
}

line('§6.3 detectConflicts and copyStopInto, pre vs post (needs /tmp/r15-pre at 3409420)');
{
  const PRE = '/tmp/r15-pre/cairn';
  if (!existsSync(PRE + '/packages/core/src/index.ts')) {
    skip('the pre-change differential', 'git worktree add /tmp/r15-pre 3409420');
  } else {
    const old = await import(PRE + '/packages/core/src/index.ts');
    const oldAddPlace = (await import(PRE + '/packages/core/src/build/stops.ts')).addPlace;
    const { trip } = loadEurope2026();
    const clocks = ['2019-01-01', '2026-06-01', FIXTURE_TODAY, '2026-08-30', '2027-08-30', '2030-01-01', undefined];
    let diverged = 0;
    for (const today of clocks) {
      const opts = today ? { today } : {};
      if (digest(core.detectConflicts(trip, opts)) !== digest(old.detectConflicts(trip, opts))) diverged++;
    }
    ok('A-17 changed no code: detectConflicts on the reference trip is byte-identical at 7 clocks',
      diverged === 0, `${diverged}/7 clocks diverge`);

    // copyStopInto: where A-15/A-16 MOVED the output, deliberately, and where they must not have.
    const mkSrc = (mod, ap) => {
      let t = mod.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-10',
        cities: [{ name: 'Vienna', order: 0, centre: VIENNA }] }, { ids: mod.sequentialIds('src'), now: '2026-01-01', actorUserId: mod.LOCAL_OWNER });
      t = { ...t, id: 'trip-src' };
      t = ap(t, { id: 'p-src', cityKey: t.cities[0].key, name: 'Habyt Vienna', at: BELVEDERE, category: 'stay',
        note: 'entrance is on the north side', links: [{ label: 'V', href: 'https://vendor.example/x' }] });
      return mod.addStop(t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
        { id: 's-src', name: 'Check in', category: 'stay', place: { kind: 'place', placeId: 'p-src' } },
        { ids: mod.sequentialIds('srs'), now: '2026-01-01', actorUserId: mod.LOCAL_OWNER });
    };
    const run = (mod, ap) => {
      const s = mkSrc(mod, ap);
      const t = { ...mod.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-10',
        cities: [{ name: 'Vienna', order: 0, centre: VIENNA }] }, { ids: mod.sequentialIds('tgt'), now: '2026-01-01', actorUserId: mod.LOCAL_OWNER }), id: 'trip-tgt' };
      return mod.toJSON(mod.copyStopInto(t, { trip: s, stopId: 's-src' },
        { kind: 'scheduled', dayId: '2026-08-09', time: '11:00', order: 0 },
        { ids: mod.sequentialIds('c'), today: '2026-04-01', actorUserId: mod.LOCAL_OWNER }));
    };
    const before = JSON.parse(run(old, oldAddPlace));
    const after = JSON.parse(run(core, addPlace));
    const dropped = Object.keys(before.places[0]).filter((k) => !(k in after.places[0]));
    ok('the ONLY key A-15 removes from a cross-trip copied place is `links`',
      JSON.stringify(dropped) === JSON.stringify(['links']), JSON.stringify(dropped));
    ok('...and every other field is byte-identical to pre-A-15',
      digest({ ...before.places[0], links: undefined }) === digest({ ...after.places[0], links: undefined }));
    const bs = before.days.find((d) => d.id === '2026-08-09').stops[0];
    const as = after.days.find((d) => d.id === '2026-08-09').stops[0];
    ok('the copied STOP is byte-identical to pre-A-15/A-16/R14-3', digest(bs) === digest(as),
      'the stop moved and no ruling asked for that');
  }
}

console.log(`\n${fails === 0 ? 'ALL OK' : fails + ' FAIL'}`);
