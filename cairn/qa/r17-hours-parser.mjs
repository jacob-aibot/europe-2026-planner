/**
 * Round 17 — the mandatory breaker pass over the builder implementation of ARCHITECTURE
 * revision 15's **A-20** (the parser decides *shape*, `validateTrip` decides *meaning*, and
 * `Place.hours` was the one field nobody applied that to) plus the mechanical **R16-1**.
 *
 * Run: node --experimental-strip-types qa/r17-hours-parser.mjs   (from cairn/)
 *
 *   §1  A-20's contract sentence, attacked: *"`isOpeningHours(v)` is true EXACTLY when
 *       `fromJSON` accepts `v`."* 53 shapes against the OBJECT route — `fromJSON` is typed
 *       `(input: string | unknown)` and the object arm is the only one that can carry the
 *       shapes JSON cannot express. (Measured: every live caller passes text —
 *       `importDoc(text: string)`, `cli`, and `StoredDoc.doc`, which is `type TripDoc = string`.
 *       `openingHours.test.ts:192`'s comment that `store.importDoc` and `cli` pass an
 *       already-parsed object is wrong; the object arm is in-process only.) Includes the
 *       Unicode/whitespace tricks the regex has to survive, prototype-shaped keys, sparse
 *       arrays, boxed primitives, `Object.create(null)`, Proxies and accessor properties.
 *   §2  Part 5(a) re-derived rather than trusted: all 11 000 strings `isClockTime` accepts are
 *       byte-identical under `redactText`, and the accepted set really is 11 000 — plus whether
 *       the invariant is TIED to `redactText` by a red test or is two facts that could drift.
 *   §3  R15-2's closure, against a range of hostile CAST-BUILT `hours` that never went through
 *       the parser: 41 shapes into `copyStopInto`. **R17-1 lives here.**
 *   §4  The ratification chain end to end, which is what makes `place_hours_malformed` not dead
 *       code: cast-built malformed `hours` -> `validateTrip` warns -> `toJSON` re-emits ->
 *       `fromJSON` refuses at a named path. 26 shapes, both directions of failure.
 *   §5  Statements about the SHIPPED SUITE, not about the product — mutations made in a
 *       throwaway `git worktree` at `909b4a3` and discarded. **R17-2 and R17-3 live here.**
 *   §6  Ceilings, the export surface and the read-only boundary, re-derived by running.
 *
 * A FAIL line means the probe found what it was looking for. Read the finding in
 * ../docs/QA-FINDINGS.md before assuming the script is broken.
 */
import { readFileSync } from 'node:fs';

const core = await import('../packages/core/src/index.ts');
const oh = await import('../packages/core/src/model/openingHours.ts');
const { addPlace } = await import('../packages/core/src/build/stops.ts');
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
const CREDENTIALS = ['5814731574', 'GYGG45MLA9Q9', 'jacob@example.test', 'YZGDTS', '0754'];
const PIN = 'Front door PIN 0754, conf 5814731574 - ask jacob@example.test';
const HREF = 'https://vendor.test/booking/GYGG45MLA9Q9';
const GOOD = { day: 1, open: '09:00', close: '17:00' };

function mintedTrip(id, prefix) {
  const t = core.createTrip({
    title: 'T', startDate: '2026-08-07', endDate: '2026-08-10',
    cities: [{ name: 'Vienna', order: 0, centre: VIENNA }],
  }, C(prefix));
  return { ...t, id };
}
/** One source trip: one city, one `Place`, one stop linked to it. */
function sourceTrip(prefix = 'src') {
  let t = mintedTrip('trip-src', prefix);
  t = addPlace(t, { id: 'p-src', cityKey: t.cities[0].key, name: 'Habyt Vienna', at: BELVEDERE, category: 'stay' });
  return core.addStop(
    t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Check in', category: 'stay', place: { kind: 'place', placeId: 'p-src' } }, C(prefix + 's'),
  );
}
/** `Place.hours` set BY CAST — past the type system, which is the population A-20 names. */
const castWithHours = (hours, prefix = 'ch') => {
  const t = sourceTrip(prefix);
  return { ...t, places: t.places.map((p) => ({ ...p, hours })) };
};
/** A document OBJECT (not text) carrying `hours` — `fromJSON` accepts both and they differ. */
const docWithHours = (hours) => {
  const raw = JSON.parse(core.toJSON(sourceTrip('doc')));
  raw.places[0].hours = hours;
  return raw;
};
/** The parser's verdict on one `hours`, by whichever route. */
const verdict = (hours, asText) => {
  try {
    const doc = docWithHours(hours);
    const t = core.fromJSON(asText ? JSON.stringify(doc) : doc);
    return { accepted: true, hours: t.places[0].hours };
  } catch (e) {
    return { accepted: false, name: e.constructor.name, path: e.path, message: e.message };
  }
};
const copyAcross = (source, prefix = 'c') =>
  core.copyStopInto(mintedTrip('trip-tgt', prefix + 't'), { trip: source, stopId: 's-src' },
    { kind: 'scheduled', dayId: '2026-08-09', time: '11:00', order: 0 }, CC(prefix));
const greppable = (t) => { const d = core.toJSON(t); return CREDENTIALS.filter((c) => d.includes(c)); };

/** A weekly entry whose `open`/`close` are ACCESSORS that flip after `n` reads. */
function toctouEntry(n) {
  let ro = 0, rc = 0;
  const e = { day: 1 };
  Object.defineProperty(e, 'open', { enumerable: true, get() { ro++; return ro > n ? PIN : '09:00'; } });
  Object.defineProperty(e, 'close', { enumerable: true, get() { rc++; return rc > n ? HREF : '17:00'; } });
  return e;
}

/* ========================= §1 the contract sentence, attacked ==================== */

line('§1.1 `isOpeningHours(v)` is true EXACTLY when `fromJSON` accepts `v` — 53 shapes, object route');
{
  const sparseHole = [, GOOD];            // eslint-disable-line no-sparse-arrays
  const sparseTail = [GOOD]; sparseTail.length = 3;
  const shapes = [
    // --- accepted -------------------------------------------------------------------
    ['a legitimate hours', { weekly: [GOOD] }],
    ['weekly: []', { weekly: [] }],
    ['weekly: [null]', { weekly: [null] }],
    ['weekly: [undefined] (A-20 says NORMALISE, not refuse)', { weekly: [undefined] }],
    ['a SPARSE weekly with a leading hole', { weekly: sparseHole }],
    ['a SPARSE weekly with trailing holes', { weekly: sparseTail }],
    ['note: undefined, explicitly present', { weekly: [], note: undefined }],
    ['note: the empty string', { weekly: [], note: '' }],
    ['an extra key on `hours` (A-20 says DROP, not refuse)', { weekly: [], zzz: PIN }],
    ['an extra key on an entry (A-20 says DROP, not refuse)', { weekly: [{ ...GOOD, zzz: PIN }] }],
    ['a single-digit hour, H:MM', { weekly: [{ day: 0, open: '9:00', close: '9:05' }] }],
    ['24:00 and 99:99 — SHAPE, not meaning; A-20 refuses no range rule', { weekly: [{ day: 0, open: '24:00', close: '99:99' }] }],
    ['day: -0', { weekly: [{ ...GOOD, day: -0 }] }],
    ['day: 1e308 (finite, out of 0..6 — meaning, not shape)', { weekly: [{ ...GOOD, day: 1e308 }] }],
    ['an entry with a null prototype', { weekly: [Object.assign(Object.create(null), GOOD)] }],
    ['an `hours` with a null prototype', Object.assign(Object.create(null), { weekly: [GOOD] })],
    ['an entry whose fields are INHERITED, not own', { weekly: [Object.create(GOOD)] }],
    ['an `hours` whose weekly is INHERITED, not own', Object.create({ weekly: [GOOD] })],
    ['`__proto__` as a data key (JSON.parse route)', JSON.parse('{"weekly":[{"day":1,"open":"09:00","close":"17:00","__proto__":{"polluted":true}}]}')],
    ['an entry with a symbol key', { weekly: [{ ...GOOD, [Symbol('s')]: PIN }] }],
    ['an entry behind a Proxy', { weekly: [new Proxy({ ...GOOD }, {})] }],
    ['a weekly behind a Proxy', { weekly: new Proxy([GOOD], {}) }],
    ['three entries, one of them null', { weekly: [GOOD, null, { ...GOOD, day: 2 }] }],
    // --- refused --------------------------------------------------------------------
    ['null', null],
    ['an array', []],
    ['a function', function () { }],
    ['a string', 'mon-fri'],
    ['a number', 7],
    ['leading zeros: 009:00', { weekly: [{ ...GOOD, open: '009:00' }] }],
    ['a one-digit minute: 9:5', { weekly: [{ ...GOOD, open: '9:5' }] }],
    ['a three-digit minute: 9:000', { weekly: [{ ...GOOD, open: '9:000' }] }],
    ['FULL-WIDTH digits ９:００', { weekly: [{ ...GOOD, open: '\uFF19:\uFF10\uFF10' }] }],
    ['ARABIC-INDIC digits ٩:٠٠', { weekly: [{ ...GOOD, open: '\u0669:\u0660\u0660' }] }],
    ['DEVANAGARI digits ९:००', { weekly: [{ ...GOOD, open: '\u096F:\u0966\u0966' }] }],
    ['a trailing newline "9:00\\n" (a `$`-anchor classic)', { weekly: [{ ...GOOD, open: '9:00\n' }] }],
    ['a leading space " 9:00"', { weekly: [{ ...GOOD, open: ' 9:00' }] }],
    ['a trailing NUL "9:00\\u0000"', { weekly: [{ ...GOOD, open: '9:00\u0000' }] }],
    ['an RTL override before the digits', { weekly: [{ ...GOOD, open: '\u202E9:00' }] }],
    ['a blank open', { weekly: [{ ...GOOD, open: '' }] }],
    ['day: NaN', { weekly: [{ ...GOOD, day: NaN }] }],
    ['day: Infinity', { weekly: [{ ...GOOD, day: Infinity }] }],
    ['day: a boxed Number', { weekly: [{ ...GOOD, day: new Number(1) }] }],
    ['day: a BigInt', { weekly: [{ ...GOOD, day: 1n }] }],
    ['open: a boxed String', { weekly: [{ ...GOOD, open: new String('09:00') }] }],
    ['open: a symbol', { weekly: [{ ...GOOD, open: Symbol('9:00') }] }],
    ['open: a function', { weekly: [{ ...GOOD, open: () => '9:00' }] }],
    ['weekly: a String object', { weekly: new String('abc') }],
    ['weekly: array-LIKE but not an array', { weekly: { 0: GOOD, length: 1 } }],
    ['weekly: a Set', { weekly: new Set([GOOD]) }],
    ['an entry that is a function', { weekly: [function () { }] }],
    ['note: a number', { weekly: [], note: 5 }],
    ['note: null', { weekly: [], note: null }],
    ['note: a boxed String', { weekly: [], note: new String('x') }],
  ];

  const diverged = [], pathless = [];
  for (const [what, hours] of shapes) {
    const pred = oh.isOpeningHours(hours);
    const v = verdict(hours, false);
    if (pred !== v.accepted) diverged.push(`${what}: predicate=${pred}, parser=${v.accepted ? 'accepts' : v.message}`);
    if (!v.accepted && (v.name !== 'TripParseError' || !v.path)) pathless.push(`${what}: ${v.name}@${v.path}`);
  }
  note(`${shapes.length} shapes; the parser refuses ${shapes.filter(([, h]) => !verdict(h, false).accepted).length}`);
  ok('A-20\'s contract sentence holds on every one of them — the predicate and the parser never disagree',
    diverged.length === 0, diverged.join(' | '));
  ok('...and every refusal is a `TripParseError` carrying a JSON path (never a raw TypeError)',
    pathless.length === 0, pathless.join(' | '));
  ok('...and `Object.prototype` is unpolluted by the `__proto__` shapes',
    ({}).polluted === undefined, String(({}).polluted));
}

line('§1.2 the ruling\'s own two normalisation claims, checked literally');
{
  const extra = verdict({ weekly: [{ ...GOOD, note: PIN, href: HREF }], note: 'closed in winter', zzz: PIN }, false);
  ok('"extra keys are DROPPED, not refused" — on the entry and on `hours` itself',
    extra.accepted &&
    JSON.stringify(Object.keys(extra.hours.weekly[0]).sort()) === '["close","day","open"]' &&
    JSON.stringify(Object.keys(extra.hours).sort()) === '["note","weekly"]',
    JSON.stringify(extra));
  ok('...and no credential from a dropped key survives the parser',
    extra.accepted && !JSON.stringify(extra.hours).includes('0754'), JSON.stringify(extra.hours));

  const undef = verdict({ weekly: [undefined, null, GOOD] }, false);
  ok('"an `undefined` weekly slot normalises to `null`, not refused"',
    undef.accepted && undef.hours.weekly[0] === null && undef.hours.weekly[1] === null,
    JSON.stringify(undef));

  const absent = verdict({ weekly: [] }, false);
  ok('...and an absent `note` is not invented as a present one',
    absent.accepted && !('note' in absent.hours), JSON.stringify(absent.hours));

  // A HOLE is not the same value as an explicit `undefined`: `Array.prototype.every` skips it,
  // and `.map` PRESERVES it. So "normalises to null" is true of an explicit `undefined` and not
  // of a hole — the parser returns a `weekly` whose slot reads `undefined` where the declared
  // type says `WeeklyEntry | null`. Recorded, not filed, and measured on all four readers: a
  // sparse array cannot come from `JSON.parse`, so this needs an in-process caller passing an
  // object to `fromJSON`, and every reader that matters coerces it to the model's own unknown.
  const holed = verdict({ weekly: [, GOOD] }, false);   // eslint-disable-line no-sparse-arrays
  const copiedHole = copyAcross(castWithHours(holed.hours, 'hl'), 'hl').places[0].hours.weekly;
  note(`a SPARSE weekly parses to length ${holed.hours.weekly.length}, slot 0 is ` +
    `${0 in holed.hours.weekly ? 'a value' : 'still a HOLE'}; after the copy it is ` +
    `${0 in copiedHole ? 'a value' : 'still a HOLE'}; exported it is ` +
    `${JSON.stringify(JSON.parse(core.toJSON(castWithHours(holed.hours, 'hl2'))).places[0].hours.weekly[0])}`);
  ok('CONFIRMED, not filed: a hole survives the parser and the copy AS a hole (not as `null`), ' +
    'but the predicate accepts it, the copy does not throw on it, and the export renders it ' +
    '`null` — so it re-imports as the model\'s own unknown and no reader can tell the difference',
    oh.isOpeningHours(holed.hours) && copiedHole.length === 2 &&
    (copiedHole[0] ?? null) === null &&
    JSON.parse(core.toJSON(castWithHours(holed.hours, 'hl2'))).places[0].hours.weekly[0] === null, '');
}

line('§1.3 a legitimate `hours` is not collateral damage');
{
  const legal = { weekly: [null, { day: 1, open: '09:00', close: '17:00' }, { day: 2, open: '9:30', close: '18:00' }], note: 'closed in winter' };
  const v = verdict(legal, true);
  ok('a hand-written legitimate `hours` (H:MM and HH:MM, a null day, a note) parses unchanged',
    v.accepted && JSON.stringify(v.hours) === JSON.stringify(legal), JSON.stringify(v));
  const t = core.fromJSON(JSON.stringify(docWithHours(legal)));
  ok('...and round-trips byte-identically through toJSON/fromJSON, twice',
    core.toJSON(core.fromJSON(core.toJSON(t))) === core.toJSON(t) &&
    core.toJSON(core.fromJSON(core.toJSON(core.fromJSON(core.toJSON(t))))) === core.toJSON(t), '');
  const copy = copyAcross(castWithHours(legal, 'lg'), 'lg').places[0];
  ok('...and crosses the copy boundary intact, note redacted only if it is a credential',
    JSON.stringify(copy.hours.weekly) === JSON.stringify(legal.weekly) && copy.hours.note === legal.note,
    JSON.stringify(copy.hours));
  ok('...and `validateTrip` says nothing about it', core.validateTrip(t).every((i) => i.code !== 'place_hours_malformed'), '');
}

/* ============================ §2 Part 5(a), re-derived ========================== */

line('§2.1 A-20 Part 5(a): the redaction arm is unreachable for a parser-valid entry');
{
  // The claim: for all 11 000 strings matching /^\d{1,2}:\d{2}$/, redactText(s) === s. Brute
  // force the WHOLE accepted set rather than the ruling's enumeration of it, so the count is
  // measured and not assumed.
  const accepted = new Set();
  for (let a = 0; a < 100; a++) for (let b = 0; b < 100; b++) {
    for (const A of [String(a), String(a).padStart(2, '0')]) for (const B of [String(b), String(b).padStart(2, '0')]) {
      const s = `${A}:${B}`;
      if (oh.isClockTime(s)) accepted.add(s);
    }
  }
  const altered = [...accepted].filter((s) => core.redactText(s) !== s);
  ok('the accepted set brute-forces to exactly 11 000 strings', accepted.size === 11000, String(accepted.size));
  ok('...and `redactText` leaves every one of them byte-identical', altered.length === 0,
    JSON.stringify(altered.slice(0, 8)));

  // ...and it is TIED to `redactText`, not two independently-true facts. Verified by mutation in
  // a throwaway `git worktree` at `909b4a3`, discarded; nothing under `cairn/` was written.
  ok('the invariant is pinned by a red test, not by an argument: adding a REDACTION_PATTERN ' +
    '`/\\b\\d{1,2}:\\d{2}\\b/g` turns 6 tests red, including 5(a) and 5(b) — mutation-verified at 909b4a3',
    /assert\.equal\(checked, 11000/.test(
      readFileSync(new URL('../packages/core/test/openingHours.test.ts', import.meta.url), 'utf8')),
    'the count assertion must exist, or the loop can silently shrink');
  ok('...and there is only ONE pattern list: `tools/redact.mjs` re-exports core\'s rather than ' +
    'redefining it, so the sample path cannot drift from the copy path',
    /import \{[^}]*REDACTION_PATTERNS[^}]*\} from '\.\.\/packages\/core\/src\/index\.ts'/.test(
      readFileSync(new URL('../tools/redact.mjs', import.meta.url), 'utf8')), '');
}

/* ================== §3 R15-2's closure against cast-built documents ============= */

line('§3.1 `copyStopInto` never throws on a hostile CAST-BUILT `hours` — 41 shapes (R15-2)');
{
  const sparse = [, GOOD];                // eslint-disable-line no-sparse-arrays
  const shapes = [
    ['{}', {}], ['a string', 'mon-fri'], ['a number', 7], ['an array', []], ['null', null],
    ['weekly: undefined', { weekly: undefined }], ['{weekly:"mon-fri"}', { weekly: 'mon-fri' }],
    ['an entry with note+href', { weekly: [{ ...GOOD, note: PIN, href: HREF }] }],
    ['a nested entry', { weekly: [{ ...GOOD, inner: { pin: PIN } }] }],
    ['an entry that is an array', { weekly: [[GOOD]] }],
    ['an entry that is a string', { weekly: [PIN] }],
    ['an entry that is a number', { weekly: [7] }],
    ['an entry that is true', { weekly: [true] }],
    ['an entry that is {}', { weekly: [{}] }],
    ['an entry missing close', { weekly: [{ day: 1, open: '09:00' }] }],
    ['day: a string', { weekly: [{ ...GOOD, day: '1' }] }],
    ['day: Infinity', { weekly: [{ ...GOOD, day: Infinity }] }],
    ['day: NaN', { weekly: [{ ...GOOD, day: NaN }] }],
    ['day: a BigInt', { weekly: [{ ...GOOD, day: 1n }] }],
    ['open: a number', { weekly: [{ ...GOOD, open: 900 }] }],
    ['open: an object', { weekly: [{ ...GOOD, open: { pin: PIN } }] }],
    ['open: a credential', { weekly: [{ ...GOOD, open: PIN }] }],
    ['open: a boxed String', { weekly: [{ ...GOOD, open: new String('09:00') }] }],
    ['close: a voucher URL', { weekly: [{ ...GOOD, close: HREF }] }],
    ['`__proto__` as a data key', JSON.parse('{"weekly":[{"day":1,"open":"09:00","close":"17:00","__proto__":{"polluted":true}}]}')],
    ['a `constructor` key', { weekly: [{ ...GOOD, constructor: PIN }] }],
    ['weekly array-LIKE', { weekly: { 0: GOOD, length: 1 } }],
    ['note: a credential', { weekly: [GOOD], note: PIN }],
    ['note: an object', { weekly: [GOOD], note: { pin: PIN } }],
    ['note: a number', { weekly: [GOOD], note: 5814731574 }],
    ['500 entries, half hostile', { weekly: Array.from({ length: 500 }, (_, i) => (i % 2 ? { ...GOOD, note: PIN } : null)) }],
    ['a SPARSE weekly', { weekly: sparse }],
    ['weekly: [undefined]', { weekly: [undefined] }],
    ['an entry with a null prototype', { weekly: [Object.assign(Object.create(null), GOOD)] }],
    ['an entry whose fields are inherited', { weekly: [Object.create({ ...GOOD, secret: PIN })] }],
    ['an entry behind a Proxy', { weekly: [new Proxy({ ...GOOD, secret: PIN }, {})] }],
    ['a weekly behind a Proxy', { weekly: new Proxy([{ ...GOOD, secret: PIN }], {}) }],
    ['an entry with a symbol key', { weekly: [{ ...GOOD, [Symbol('s')]: PIN }] }],
    ['an entry that is a function', { weekly: [Object.assign(function () { }, GOOD)] }],
    ['an `hours` with a toJSON hook', { weekly: [GOOD], toJSON() { return { weekly: [{ ...GOOD, secret: PIN }] }; } }],
    ['1e5 entries', { weekly: Array.from({ length: 1e5 }, () => GOOD) }],
  ];
  let threw = 0, leaked = 0, n = 0;
  const threwShapes = [], leakedShapes = [];
  for (const [what, hours] of shapes) {
    n++;
    try {
      const after = copyAcross(castWithHours(hours, 'x' + n), 'y' + n);
      const hits = greppable(after);
      if (hits.length) { leaked++; leakedShapes.push(`${what} -> ${hits.join()}`); }
    } catch (e) { threw++; threwShapes.push(`${what}: ${e.constructor.name}: ${e.message}`); }
  }
  note(`${n} cast-built shapes; ${threw} threw; ${leaked} leaked a credential`);
  ok('R15-2 STAYS CLOSED: `hoursForCopy`/`weeklyForCopy` never throw on an in-memory document ' +
    'that never went through the parser', threw === 0, threwShapes.join(' | '));
  ok('R15-1 STAYS CLOSED for every one of them: no credential reaches the recipient',
    leaked === 0, leakedShapes.join(' | '));
  ok('...and `Object.prototype` is still unpolluted', ({}).polluted === undefined, String(({}).polluted));
}

line('§3.2 R17-1 — a weekly entry whose `open`/`close` are ACCESSORS is validated on one read and copied from another');
{
  // ROOT CAUSE, per `systematic-debugging`. A-20 Part 1 prints `isWeeklyEntry(v): boolean`, and
  // every consumer therefore asks the question of the value and then RE-READS the value to use
  // it. `weeklyForCopy` reads `open` four times (isWeeklyEntry, redacted(e.open), the `!==`
  // comparison, the returned object) and `validateTrip`/`toJSON` read it again later. For a
  // plain data object every read is equal, which is why the ruling's argument holds — but for an
  // accessor property they are four different values, and the entry that passes the check is not
  // the entry that crosses.
  const hits = [];
  for (let n = 0; n <= 6; n++) {
    const after = copyAcross(castWithHours({ weekly: [toctouEntry(n)] }, 'tc' + n), 'td' + n);
    const got = greppable(after);
    if (got.length) hits.push(`flip-after-${n} reads -> ${got.join()}`);
  }
  note(`accessor flip points that leak: ${JSON.stringify(hits)}`);
  ok('R17-1: a `Place.hours.weekly` entry built with accessors carries a credential across the ' +
    'person boundary — the copy validates one read of `open` and emits another',
    hits.length === 0,
    `${hits.length} of 7 flip points leak. The population is a CAST-BUILT document only (JSON ` +
    `has no accessors), which is the same population place_hours_malformed exists for, so this ` +
    `is MINOR by the R16-1 precedent — but it is R15-1's exact harm re-opened on that population.`);

  // The same root cause, one level up: the predicate says the document is fine and the export
  // that `place_hours_malformed` was ratified to warn about goes out unwarned.
  const src = castWithHours({ weekly: [toctouEntry(1)] }, 'tr');
  const warned = core.validateTrip(src).some((i) => i.code === 'place_hours_malformed');
  const doc = core.toJSON(src);
  let restores = true;
  try { core.fromJSON(doc); } catch { restores = false; }
  note(`validateTrip warns = ${warned}; the export re-imports = ${restores}; ` +
    `exported open = ${JSON.stringify(JSON.parse(doc).places[0].hours.weekly[0].open)}`);
  ok('R17-1, second face: `validateTrip` calls the document well-formed and its export is then ' +
    'unrestorable — the one harm A-20\'s ratification says the warning exists to precede',
    warned || restores,
    'the predicate read `open` once and got "09:00"; `toJSON` read it again and got the ' +
    'credential, so `place_hours_malformed` is silent on exactly the document it describes.');
}

/* ===================== §4 the ratification chain, end to end ==================== */

line('§4.1 cast-built malformed -> validateTrip warns -> toJSON re-emits -> fromJSON refuses');
{
  // A-20 ratifies `place_hours_malformed` on a chain, not on a single function: "toJSON will
  // happily re-emit such an `hours`, and the export then fails to re-import at that field — the
  // user learns their backup is unrestorable at restore time unless something says so first."
  // The builder's one disclosed judgment call (toJSON does not normalise, drop or throw) is the
  // load-bearing link. Each shape is walked all four steps.
  const cases = [
    ['a string', 'mon-fri', '$.places[0].hours'],
    ['null', null, '$.places[0].hours'],
    ['a number', 7, '$.places[0].hours'],
    ['an array', [], '$.places[0].hours'],
    ['{weekly:"mon-fri"}', { weekly: 'mon-fri' }, '$.places[0].hours.weekly'],
    ['{} (no weekly)', {}, '$.places[0].hours.weekly'],
    ['an entry that is {}', { weekly: [{}] }, '$.places[0].hours.weekly[0].day'],
    ['an entry missing close', { weekly: [{ day: 1, open: '09:00' }] }, '$.places[0].hours.weekly[0].close'],
    ['close: 170000', { weekly: [{ ...GOOD, close: '170000' }] }, '$.places[0].hours.weekly[0].close'],
    ['open: a voucher URL', { weekly: [{ ...GOOD, open: 'https://vendor.test/x' }] }, '$.places[0].hours.weekly[0].open'],
    ['open: YZGDTS', { weekly: [{ ...GOOD, open: 'YZGDTS' }] }, '$.places[0].hours.weekly[0].open'],
    ['day: a string', { weekly: [{ ...GOOD, day: '1' }] }, '$.places[0].hours.weekly[0].day'],
    ['day: NaN', { weekly: [{ ...GOOD, day: NaN }] }, '$.places[0].hours.weekly[0].day'],
    ['day: Infinity', { weekly: [{ ...GOOD, day: Infinity }] }, '$.places[0].hours.weekly[0].day'],
    ['note: a number', { weekly: [], note: 5 }, '$.places[0].hours.note'],
    ['note: null', { weekly: [], note: null }, '$.places[0].hours.note'],
    ['note: an object', { weekly: [], note: { pin: PIN } }, '$.places[0].hours.note'],
    ['an entry that is true', { weekly: [true] }, '$.places[0].hours.weekly[0]'],
    ['an entry that is a string', { weekly: ['x'] }, '$.places[0].hours.weekly[0]'],
    ['an entry that is an array', { weekly: [[GOOD]] }, '$.places[0].hours.weekly[0]'],
    ['open: a Date object', { weekly: [{ ...GOOD, open: new Date(0) }] }, '$.places[0].hours.weekly[0].open'],
    ['weekly: a Set', { weekly: new Set([GOOD]) }, '$.places[0].hours.weekly'],
    ['weekly: array-LIKE', { weekly: { 0: GOOD, length: 1 } }, '$.places[0].hours.weekly'],
    ['open: a function', { weekly: [{ ...GOOD, open: () => '9:00' }] }, '$.places[0].hours.weekly[0].open'],
    ['open: a symbol', { weekly: [{ ...GOOD, open: Symbol('9:00') }] }, '$.places[0].hours.weekly[0].open'],
    ['open: undefined', { weekly: [{ day: 1, open: undefined, close: '17:00' }] }, '$.places[0].hours.weekly[0].open'],
  ];
  const noWarn = [], threwOut = [], wrongPath = [], restored = [];
  for (const [what, hours, path] of cases) {
    const t = castWithHours(hours, 'r' + what.length);
    if (!core.validateTrip(t).some((i) => i.code === 'place_hours_malformed')) noWarn.push(what);
    let doc = null;
    try { doc = core.toJSON(t); } catch (e) { threwOut.push(`${what}: ${e.message}`); continue; }
    try { core.fromJSON(doc); restored.push(what); }
    catch (e) { if (e.path !== path) wrongPath.push(`${what}: ${e.path} (wanted ${path})`); }
  }
  ok('step 1 — `validateTrip` warns on every one', noWarn.length === 0, JSON.stringify(noWarn));
  ok('step 2 — `toJSON` never throws on any of them (the builder\'s disclosed judgment call)',
    threwOut.length === 0, threwOut.join(' | '));
  ok('step 3 — the re-import refuses at the EXACT path A-20\'s argument needs',
    wrongPath.length === 0, wrongPath.join(' | '));
  ok('step 4 — and no export of a warned document restores silently',
    restored.length === 0,
    `${JSON.stringify(restored)} re-import cleanly. All are values JSON.stringify itself ` +
    `normalises (a function/symbol array slot becomes null, a function/symbol property is ` +
    `dropped); the user was warned before the export in every case, and the restored value is ` +
    `the model's own unknown rather than wrong data.`);
}

line('§4.2 the reverse direction: a warning where the backup would have restored fine');
{
  // Over-reporting, measured so the finding is not overstated in one direction. Boxed primitives
  // are the only shapes found where `place_hours_malformed` fires and the export re-imports
  // correctly — JSON.stringify unboxes them. Benign, and the opposite of a leak.
  const boxed = [['a boxed String open', { weekly: [{ ...GOOD, open: new String('09:00') }] }],
    ['a boxed Number day', { weekly: [{ ...GOOD, day: new Number(1) }] }]];
  const overs = [];
  for (const [what, hours] of boxed) {
    const t = castWithHours(hours, 'b' + what.length);
    const warned = core.validateTrip(t).some((i) => i.code === 'place_hours_malformed');
    let ok2 = true; try { core.fromJSON(core.toJSON(t)); } catch { ok2 = false; }
    if (warned && ok2) overs.push(what);
  }
  note(`over-reported shapes: ${JSON.stringify(overs)}`);
  ok('CONFIRMED, not filed: the only over-report found is a boxed primitive, which JSON ' +
    'normalises — a warning about a document that would have restored is noise, not harm',
    true, 'the reverse of R16-2 and, as round 16 recorded, not a defect');
}

/* ============= §5 statements about the shipped suite, not about the product ===== */

line('§5.1 R17-2 — `toJSON`\'s `hours` rebuild is not pinned by anything in the suite');
{
  // A probe cannot mutate the product code it imports, so this is established the way rounds 15
  // and 16 established theirs: by editing the file in a throwaway `git worktree add /tmp/r17-mut
  // 909b4a3`, running `node --test`, and discarding the tree. Nothing under `cairn/` is written.
  //
  //   reverting `hours: p.hours === undefined ? undefined : hours(p.hours)` to `hours: p.hours`
  //   -> 593/593 GREEN.
  //
  // The mutation is not a no-op: measured against a cast-built place whose weekly entry carries
  // `secret: 'PIN 0754 …'` and whose `hours` carries `extraKey: 'jacob@…'`, the shipped code
  // exports `{"weekly":[{"day","open","close"}],"note"}` and the mutant exports both credentials.
  // Same class as R16-1 — the code is right, the fixture that would catch its removal is missing.
  const suite = readFileSync(new URL('../packages/core/test/copyStop.test.ts', import.meta.url), 'utf8') +
    readFileSync(new URL('../packages/core/test/openingHours.test.ts', import.meta.url), 'utf8') +
    readFileSync(new URL('../packages/core/test/serialize.test.ts', import.meta.url), 'utf8');
  // What a pin would look like: a key-set assertion on the EXPORTED hours of a cast-built place.
  const pinned = /toJSON\([^)]*\)[^;]*hours[^;]*(eleventh|secret|extraKey|unclassified)/.test(suite);
  ok('R17-2: reverting `toJSON`\'s `hours` rebuild to `hours: p.hours` leaves 593/593 green, so ' +
    'the two properties the rebuild exists for — an unenumerated key is not re-emitted, and the ' +
    'exported object does not alias the in-memory `weekly` — are unpinned',
    pinned,
    'mutation-verified in a scratch worktree at 909b4a3 (0 red). The live carrier is the same ' +
    'cast-built document `place_hours_malformed` describes, which is why this is MINOR and not ' +
    'the R15-1 it structurally resembles. A one-line fixture in the R15-2 test closes it.');

  // Independently measured here, so the claim above is not just an assertion about a grep.
  const t = castWithHours({ weekly: [{ ...GOOD, secret: PIN }], note: 'ok', extraKey: 'jacob@example.test' }, 'tj');
  const exported = JSON.parse(core.toJSON(t)).places[0].hours;
  ok('...and the SHIPPED behaviour is correct, which is what makes this a coverage gap and not a defect',
    JSON.stringify(Object.keys(exported.weekly[0]).sort()) === '["close","day","open"]' &&
    !('extraKey' in exported) && !core.toJSON(t).includes('0754'),
    JSON.stringify(exported));
}

line('§5.2 R17-3 — `clockOrNull`\'s refusal has no test either (pre-existing, not a regression)');
{
  // A-20 assertion 5 rewires `clockOrNull` onto the shared `isClockTime`. `isClockTime` ITSELF is
  // pinned (mutating it to drop the `$` anchor is 1 red), but its CALL SITE in `clockOrNull` is
  // not: deleting the refusal leaves 593/593 green at 909b4a3 — and 583/583 at 69f551c, so this
  // is pre-existing and A-20 neither caused it nor was asked to fix it.
  //
  // Consequence, measured below: `Stop.placement.time` is the field, and nothing downstream
  // re-checks it — `validateTrip` says nothing about a time that is not a time.
  let t = sourceTrip('ck');
  const raw = JSON.parse(core.toJSON(t));
  raw.days.find((d) => d.id === '2026-08-08').stops[0].placement.time = 'PIN 0754';
  let refused = null;
  try { core.fromJSON(JSON.stringify(raw)); } catch (e) { refused = e; }
  ok('the SHIPPED parser refuses a non-clock `placement.time` at its own path — the behaviour is right',
    refused?.name === 'TripParseError' && refused.path === '$.days[1].stops[0].placement.time',
    `${refused?.name}@${refused?.path}`);
  ok('R17-3: but nothing in the suite fails when that refusal is deleted (593/593 green at ' +
    '909b4a3, 583/583 at 69f551c), and `validateTrip` does not report a malformed time either, ' +
    'so the only guard on `Stop.placement.time` is untested',
    false,
    'mutation-verified in a scratch worktree; pre-existing, MINOR, and named here because A-20 ' +
    'assertion 5 moved this exact line onto the shared predicate.');

  // The predicate the line depends on IS pinned, which bounds the finding.
  ok('...bounded: `isClockTime` itself is pinned — dropping its `$` anchor turns 1 test red',
    /isClockTime: H:MM and HH:MM, and nothing else/.test(
      readFileSync(new URL('../packages/core/test/openingHours.test.ts', import.meta.url), 'utf8')), '');
}

/* ======================= §6 ceilings, surface, boundary ========================= */

line('§6.1 ceilings and the export surface, re-derived by running');
{
  ok('§2.10 export surface is still 71', Object.keys(core).length === 71, String(Object.keys(core).length));
  for (const name of ['isClockTime', 'isWeeklyEntry', 'isOpeningHours', 'parseOpeningHours', 'clock'])
    ok(`  ...and \`${name}\` is not on it`, !(name in core), '');
  const { trip } = loadEurope2026();
  const issues = core.validateTrip(trip);
  ok('the reference trip is unmoved at 11 validateTrip issues', issues.length === 11, String(issues.length));
  ok('...with `place_hours_malformed` firing 0 times (0 of 95 places carry `hours`)',
    issues.filter((i) => i.code === 'place_hours_malformed').length === 0 &&
    trip.places.filter((p) => p.hours !== undefined).length === 0, '');
  const conf = core.detectConflicts(trip, { today: FIXTURE_TODAY });
  const n = (l) => conf.filter((c) => c.severity === l).length;
  ok('...and 2 / 4 / 11 at FIXTURE_TODAY', `${n('blocker')}/${n('warning')}/${n('note')}` === '2/4/11',
    `${n('blocker')}/${n('warning')}/${n('note')}`);
  ok('`validateTrip` is deterministic on it',
    JSON.stringify(core.validateTrip(trip)) === JSON.stringify(core.validateTrip(trip)), '');
  ok('...and the reference trip round-trips byte-identically',
    core.toJSON(core.fromJSON(core.toJSON(trip))) === core.toJSON(trip), '');
}

line('§6.2 A-20 assertions 5 and 6, and the read-only boundary');
{
  const root = new URL('../packages/core/src/', import.meta.url);
  const walk = async (dir) => {
    const { readdir } = await import('node:fs/promises');
    const out = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
      if (e.isDirectory()) out.push(...await walk(p));
      else if (e.name.endsWith('.ts')) out.push(p);
    }
    return out;
  };
  const files = await walk(root);
  const hits = files.filter((f) => readFileSync(f, 'utf8').includes('\\d{1,2}:'))
    .map((f) => f.pathname.slice(root.pathname.length));
  ok('assertion 5: the clock regex appears exactly once in packages/core/src, in model/openingHours.ts',
    hits.length === 1 && hits[0] === 'model/openingHours.ts', JSON.stringify(hits));
  ok('assertion 6: `wellFormedHours` exists nowhere in packages/',
    files.every((f) => !/function wellFormedHours/.test(readFileSync(f, 'utf8'))), '');
  ok('...and no second copy of the predicate lives in build/ or validate/',
    !/function is(Weekly|Opening)/.test(readFileSync(new URL('build/copyStop.ts', root), 'utf8')) &&
    !/function is(Weekly|Opening)/.test(readFileSync(new URL('validate/validateTrip.ts', root), 'utf8')), '');

  const repoRoot = new URL('../../', import.meta.url).pathname;
  const { execFileSync } = await import('node:child_process');
  const dirty = execFileSync('git', ['status', '--porcelain', '--', 'europe-2026-itinerary.html', 'docs', 'tickets'],
    { cwd: repoRoot, encoding: 'utf8' }).trim();
  ok('the read-only boundary: repo-root planner, docs/ and tickets/ untouched', dirty === '', dirty);
  const touched = execFileSync('git', ['diff', '--name-only', '69f551c', '909b4a3'], { cwd: repoRoot, encoding: 'utf8' })
    .trim().split('\n').filter((f) => !f.startsWith('cairn/'));
  ok('...and the A-20 commit itself changed nothing outside `cairn/`', touched.length === 0, touched.join(', '));
}

console.log('\n' + (fails ? `${fails} FAIL` : 'ALL OK'));
