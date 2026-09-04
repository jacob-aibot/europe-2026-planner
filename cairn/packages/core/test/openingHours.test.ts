/**
 * `model/openingHours.ts` — the one definition of a well-formed `OpeningHours`
 * (ARCHITECTURE §2.14 **A-20**, revision 15; QA R15-1, R15-2, R16-2).
 *
 * A-20's finding was that this repo held **three** answers to *"what is a well-formed
 * `OpeningHours`"* — the parser's (anything, via `o.hours as Place['hours']`), `validateTrip`'s
 * (`wellFormedHours`, loose) and the copy's (`weeklyForCopy`, strict) — and no two agreed. The
 * ruling collapses them onto this module, which is deliberately **off**
 * `packages/core/src/index.ts` (§2.10 is 73 runtime symbols since Phase 2 I-5; this is not one).
 *
 * The predicate's contract is one sentence: **`isOpeningHours(v)` is true exactly when
 * `fromJSON` accepts `v` as a `Place.hours`.** Both halves are pinned below — the predicate's
 * own table, and the same table put through the parser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isClockTime, isOpeningHours, readWeeklyEntry } from '../src/model/openingHours.ts';
import { redactText } from '../src/build/redactText.ts';
import { fromJSON, toJSON, validateTrip, TripParseError } from '../src/index.ts';
import type { Place, Trip } from '../src/index.ts';
import { europe2026 } from './fixture.ts';

/** A getter that returns a different value on each read — A-21's injected fault. The last value
 *  repeats forever, so a call site's read COUNT cannot change the outcome. */
function flipping<T>(values: readonly T[]): () => T {
  let i = 0;
  return () => { const v = values[Math.min(i, values.length - 1)] as T; i += 1; return v; };
}

/**
 * A-21's own definition of "well-formed entry", expressed through the reader that replaced the
 * boolean predicate: `readWeeklyEntry(v).kind !== 'malformed'` ⟺ the old `isWeeklyEntry(v)`.
 * The table below is A-20's, row for row, and no row's verdict moves.
 */
const wellFormedEntry = (v: unknown): boolean => readWeeklyEntry(v).kind !== 'malformed';

// ---------------------------------------------------------------------------
// The predicates themselves.
// ---------------------------------------------------------------------------

test('isClockTime: H:MM and HH:MM, and nothing else', () => {
  for (const s of ['9:00', '09:00', '17:00', '0:00', '23:59', '99:99']) {
    assert.equal(isClockTime(s), true, `${s} is a clock time`);
  }
  for (const s of ['', '170000', '9:0', '9:000', '099:00', ' 9:00', '9:00 ', '9:00am',
    'https://vendor.test/x', 'YZGDTS', 'PIN 0754', '9.00', '09:00:00']) {
    assert.equal(isClockTime(s), false, `${JSON.stringify(s)} is not a clock time`);
  }
  for (const v of [null, undefined, 900, {}, [], ['9:00'], new String('9:00')]) {
    assert.equal(isClockTime(v), false, `${JSON.stringify(v)} is not a clock time`);
  }
});

test('readWeeklyEntry: absence is the model\'s own unknown; a present entry is three named fields', () => {
  // §7: "Missing day = unknown, never a conflict." Absence is not malformed — and A-21 gives it
  // its own arm, because `null` cannot mean both "absent, and that is valid" and "malformed".
  assert.deepEqual(readWeeklyEntry(null), { kind: 'absent' });
  assert.deepEqual(readWeeklyEntry(undefined), { kind: 'absent' }, 'fromJSON normalises an undefined slot to null');
  assert.equal(wellFormedEntry(null), true);
  assert.equal(wellFormedEntry(undefined), true);

  assert.equal(wellFormedEntry({ day: 1, open: '09:00', close: '17:00' }), true);
  assert.equal(wellFormedEntry({ day: 0, open: '9:00', close: '23:59' }), true);
  // A-20: extra keys on an entry are NOT malformed — the parser drops them, exactly as
  // `parseLinks` drops a third key on a `Link`, and reporting them would be over-reporting.
  assert.equal(wellFormedEntry({ day: 1, open: '09:00', close: '17:00', note: 'x' }), true);
  // A-20: no `day` range check. `0 ≤ day ≤ 6` is a claim about MEANING, and a rule with no
  // consumer has no injected-fault criterion (§0.5).
  assert.equal(wellFormedEntry({ day: 99, open: '09:00', close: '17:00' }), true);
  assert.equal(wellFormedEntry({ day: -3.5, open: '09:00', close: '17:00' }), true);

  // A-21: the reader HANDS BACK what it read, and it hands back three named fields — never the
  // caller's own object, so nothing unenumerated rides out of it either.
  assert.deepEqual(
    readWeeklyEntry({ day: 1, open: '09:00', close: '17:00', note: 'PIN 0754' }),
    { kind: 'entry', entry: { day: 1, open: '09:00', close: '17:00' } },
  );

  // The three shapes R16-2 measured as dropped-by-the-copy-and-unwarned-by-validateTrip. The
  // whole point of A-20 is that all three are now false HERE, in one place, for both readers.
  assert.equal(wellFormedEntry({ day: 1, open: '9:00', close: '170000' }), false);
  assert.equal(wellFormedEntry({ day: 1, open: 'https://vendor.test/x', close: '17:00' }), false);
  assert.equal(wellFormedEntry({ day: 1, open: 'YZGDTS', close: '17:00' }), false);

  for (const bad of [
    { open: '09:00', close: '17:00' },                       // no day
    { day: 1, close: '17:00' },                              // no open
    { day: 1, open: '09:00' },                               // no close
    { day: '1', open: '09:00', close: '17:00' },             // day as a string
    { day: NaN, open: '09:00', close: '17:00' },             // numOf refuses NaN
    { day: Infinity, open: '09:00', close: '17:00' },
    { day: 1, open: 9, close: 17 },
    { day: 1, open: '', close: '17:00' },                    // an opening time that exists is a time
    [{ day: 1, open: '09:00', close: '17:00' }],             // an array is not an entry
    'mon 9-5', 7, true,
  ]) {
    assert.deepEqual(readWeeklyEntry(bad), { kind: 'malformed' }, `${JSON.stringify(bad)} is not a weekly entry`);
  }
});

// ---------------------------------------------------------------------------
// A-21 (revision 16, QA R17-1) — the value that was CHECKED is the value that is USED.
//
// A-20 printed `isWeeklyEntry(v): boolean`, which validates a value and then throws it away, so
// every consumer had to go back to the caller's object and read the field again to use it. For a
// plain data object every read is equal; for an ACCESSOR property they are different values, and
// the entry that passed the check is not the entry that crosses. `readWeeklyEntry` returns what
// it read, so there is no second read to disagree with the first.
//
// Here that is measured on the two functions this file owns — the predicate itself, and the two
// traversals A-21 says must not throw out of an export or out of `validateTrip`.
// ---------------------------------------------------------------------------

test('A-21: readWeeklyEntry reads each field exactly ONCE, and returns what it read', () => {
  const counts = { day: 0, open: 0, close: 0 };
  const openFlip = flipping(['09:00', 'Front door PIN 0754, conf 5814731574']);
  const closeFlip = flipping(['17:00', 'https://vendor.example/booking/GYGG45MLA9Q9']);
  const entry = {};
  Object.defineProperty(entry, 'day', { enumerable: true, get: () => { counts.day++; return 1; } });
  Object.defineProperty(entry, 'open', { enumerable: true, get: () => { counts.open++; return openFlip(); } });
  Object.defineProperty(entry, 'close', { enumerable: true, get: () => { counts.close++; return closeFlip(); } });

  const read = readWeeklyEntry(entry);
  assert.deepEqual(counts, { day: 1, open: 1, close: 1 }, 'A-21: one read per field, no more');
  assert.deepEqual(read, { kind: 'entry', entry: { day: 1, open: '09:00', close: '17:00' } },
    'the reader must hand back the values it validated, not a second read of them');
});

test('A-21: isOpeningHours does not throw on a flipping `weekly` — its docstring says it throws nothing', () => {
  // `o.weekly` ×2 was `Array.isArray(o.weekly)` then `o.weekly.every(...)`: read 1 says "array",
  // read 2 is a string, and `.every is not a function` came out of a predicate documented not to
  // throw — and out of `validateTrip`, whose docstring says "Nothing here throws".
  // Each object is asked EXACTLY ONCE: a second call is a second traversal, and A-21 Part 6 is
  // explicit that two traversals of an unstable document may legitimately disagree.
  const hostile = {};
  Object.defineProperty(hostile, 'weekly', { enumerable: true, get: flipping<unknown>([[], 'nope']) });
  let weeklyAnswer: unknown;
  assert.doesNotThrow(() => { weeklyAnswer = isOpeningHours(hostile); });
  assert.equal(weeklyAnswer, true, 'the value it TESTED is the value it answered about');

  // `note` ×2 is the same shape one field over: read 1 `!== undefined`, read 2 `typeof`.
  const noteHostile: Record<string, unknown> = { weekly: [] };
  Object.defineProperty(noteHostile, 'note', { enumerable: true, get: flipping<unknown>(['ok', 7]) });
  let noteAnswer: unknown;
  assert.doesNotThrow(() => { noteAnswer = isOpeningHours(noteHostile); });
  assert.equal(noteAnswer, true);
});

test('A-21: toJSON and validateTrip both survive a flipping `weekly`, and neither throws', () => {
  const { trip } = europe2026();
  const hostileHours = {};
  Object.defineProperty(hostileHours, 'weekly', {
    enumerable: true, get: flipping<unknown>([[], 'nope']),
  });
  const src: Trip = {
    ...trip,
    places: trip.places.map((p, i) => (i === 0 ? { ...p, hours: hostileHours as Place['hours'] } : p)),
  };

  // §2.1: core throws on programmer error. A document shape is not programmer error, and an
  // export may not throw on one.
  let doc = '';
  assert.doesNotThrow(() => { doc = toJSON(src); }, 'toJSON threw on a flipping weekly');
  assert.deepEqual(JSON.parse(doc).places[0].hours, { weekly: [] },
    'the array `Array.isArray` accepted is the array that was mapped');

  let issues: ReturnType<typeof validateTrip> | null = null;
  assert.doesNotThrow(() => { issues = validateTrip(src); }, 'validateTrip threw on a flipping weekly');
  assert.ok(Array.isArray(issues), 'validateTrip must return an Issue[], not throw');
});

test('isOpeningHours: an object with a weekly ARRAY and, if present, a string note', () => {
  assert.equal(isOpeningHours({ weekly: [] }), true);
  assert.equal(isOpeningHours({ weekly: [null, { day: 1, open: '09:00', close: '17:00' }] }), true);
  assert.equal(isOpeningHours({ weekly: [], note: 'closed in winter' }), true);
  assert.equal(isOpeningHours({ weekly: [], note: '' }), true);
  assert.equal(isOpeningHours({ weekly: [], extra: 'dropped by the parser' }), true);

  // R15-2's six shapes, which `fromJSON` used to accept and `copyStopInto` used to throw on.
  for (const bad of [{}, 'closed mondays', 7, [1, 2], null, { weekly: 'mon-fri' }]) {
    assert.equal(isOpeningHours(bad), false, `${JSON.stringify(bad)} is not an OpeningHours`);
  }
  assert.equal(isOpeningHours(undefined), false, 'absence is the caller\'s question, not this one\'s');
  assert.equal(isOpeningHours({ weekly: [], note: 7 }), false);
  assert.equal(isOpeningHours({ weekly: [], note: { pin: 'PIN 0754' } }), false);
  assert.equal(isOpeningHours({ weekly: [{ day: 1, open: '9:00', close: '170000' }] }), false);
});

// ---------------------------------------------------------------------------
// A-20 Part 5(a) — the redaction arm of `weeklyForCopy` is UNREACHABLE for a structurally
// valid entry, proved exhaustively rather than sampled.
//
// This is the assertion that makes R16-2 unrepeatable: `weeklyForCopy` keeps a redaction check
// as a copy-boundary POLICY, and this says that policy and the shape predicate cannot disagree
// about any string the shape predicate accepts. The day someone adds a `REDACTION_PATTERN`
// that breaks it, this goes red — which makes the divergence an architect's problem again, on
// purpose, instead of a silent `null` at a boundary the user never sees.
// ---------------------------------------------------------------------------

test('A-20 5(a): all 11 000 strings isClockTime accepts are byte-identical under redactText', () => {
  const hours: string[] = [];
  for (let h = 0; h <= 9; h++) hours.push(String(h));            // H
  for (let h = 0; h <= 99; h++) hours.push(String(h).padStart(2, '0')); // HH
  assert.equal(hours.length, 110);

  let checked = 0;
  for (const h of hours) {
    for (let m = 0; m <= 99; m++) {
      const s = `${h}:${String(m).padStart(2, '0')}`;
      assert.equal(isClockTime(s), true, `${s} must be in the accepted set`);
      assert.equal(redactText(s), s, `redactText altered the clock time ${s}`);
      checked++;
    }
  }
  assert.equal(checked, 11000, 'the whole accepted set must be covered, not a sample of it');
});

// ---------------------------------------------------------------------------
// A-20's contract sentence, put through the parser: `isOpeningHours(v)` is true EXACTLY when
// `fromJSON` accepts `v`.
// ---------------------------------------------------------------------------

type Doc = Record<string, unknown>;
const withHours = (hours: unknown): string => {
  const d = JSON.parse(toJSON(europe2026().trip)) as Doc;
  (d.places as Doc[])[0].hours = hours;
  return JSON.stringify(d);
};

/** A-20's own list, path by path. `$.places[0].hours` is where the reference trip's first place is. */
const REFUSED: Array<[string, unknown, string]> = [
  ['a string', 'mon-fri', '$.places[0].hours'],
  ['null', null, '$.places[0].hours'],
  ['a number', 7, '$.places[0].hours'],
  ['an array', [1, 2], '$.places[0].hours'],
  ['no weekly at all', {}, '$.places[0].hours.weekly'],
  ['weekly as a string', { weekly: 'mon-fri' }, '$.places[0].hours.weekly'],
  ['weekly as an object', { weekly: { mon: '9-5' } }, '$.places[0].hours.weekly'],
  ['a non-string note', { weekly: [], note: 7 }, '$.places[0].hours.note'],
  ['an object note (R15-1\'s carrier)', { weekly: [], note: { pin: 'PIN 0754' } }, '$.places[0].hours.note'],
  ['a close that is not a time', { weekly: [{ day: 1, open: '9:00', close: '170000' }] }, '$.places[0].hours.weekly[0].close'],
  ['an open that is a URL', { weekly: [{ day: 1, open: 'https://vendor.test/x', close: '17:00' }] }, '$.places[0].hours.weekly[0].open'],
  ['an open that is a reference', { weekly: [{ day: 1, open: 'YZGDTS', close: '17:00' }] }, '$.places[0].hours.weekly[0].open'],
  ['an open that is blank', { weekly: [{ day: 1, open: '', close: '17:00' }] }, '$.places[0].hours.weekly[0].open'],
  ['a non-string open', { weekly: [{ day: 1, open: 900, close: '17:00' }] }, '$.places[0].hours.weekly[0].open'],
  ['a non-numeric day', { weekly: [{ day: 'mon', open: '9:00', close: '17:00' }] }, '$.places[0].hours.weekly[0].day'],
  ['a NaN day', { weekly: [{ day: NaN, open: '9:00', close: '17:00' }] }, '$.places[0].hours.weekly[0].day'],
  ['an entry that is a string', { weekly: ['mon 9-5'] }, '$.places[0].hours.weekly[0]'],
  ['an entry that is an array', { weekly: [[]] }, '$.places[0].hours.weekly[0]'],
  ['a second entry that is malformed', { weekly: [null, { day: 2, open: '9:00', close: 'x' }] }, '$.places[0].hours.weekly[1].close'],
];

test('A-20 assertion 2: fromJSON refuses a malformed hours with the exact JSON path', () => {
  for (const [label, hours, path] of REFUSED) {
    assert.equal(isOpeningHours(hours), false, `${label}: the predicate must agree with the parser`);
    assert.throws(
      () => fromJSON(withHours(hours)),
      (e: unknown) => {
        assert.equal((e as Error).name, 'TripParseError', `${label} threw ${(e as Error).name}`);
        assert.equal((e as TripParseError).path, path, `${label}: path was "${(e as TripParseError).path}"`);
        return true;
      },
      `${label} was ACCEPTED by fromJSON`,
    );
  }
});

test('A-20 assertion 3: fromJSON accepts a legal hours, drops an extra key, normalises an absent slot', () => {
  const legal = { weekly: [null, { day: 1, open: '09:00', close: '17:00' }], note: 'closed in winter' };
  assert.equal(isOpeningHours(legal), true);
  const trip = fromJSON(withHours(legal));
  assert.deepEqual(trip.places[0].hours, legal);
  // Byte-identical round trip: what came in is what goes back out.
  assert.equal(toJSON(fromJSON(toJSON(trip))), toJSON(trip));
  assert.equal(JSON.parse(toJSON(trip)).places[0].hours.note, 'closed in winter');

  // An unenumerated key on a weekly entry — R15-1's actual carrier — does not survive parsing.
  const extra = fromJSON(withHours({
    weekly: [{ day: 1, open: '09:00', close: '17:00', note: 'PIN ZZTOP01', href: 'https://v.test/ZZTOP02' }],
  }));
  assert.deepEqual(Object.keys(extra.places[0].hours!.weekly[0]!).sort(), ['close', 'day', 'open']);
  for (const needle of ['ZZTOP01', 'ZZTOP02']) {
    assert.equal(toJSON(extra).includes(needle), false, `an extra key (${needle}) survived the parser`);
  }

  // An `undefined` slot is ABSENCE, which the parser normalises rather than refuses. JSON has
  // no `undefined`, so this exercises `fromJSON`'s already-parsed-object arm.
  //
  // **R17-4 (QA round 17): that arm is NOT a live route today, and this comment used to claim it
  // was.** Every shipped caller hands `fromJSON` a string — `store.importDoc` calls
  // `core.fromJSON(text)`, `store.ts`'s three internal calls pass `stored.doc` whose type is
  // `TripDoc = string` (`packages/client/src/ports/types.ts`), `cli.ts:37` passes
  // `readFileSync(file, 'utf8')`, `apps/web/src/sample.ts` passes `JSON.stringify(raw)` and
  // `tools/gen-sample.mjs` passes `toJSON(...)`. The distinction is load-bearing precisely because
  // this project keeps making reachability arguments out of it (*"a document can do this"* vs
  // *"only an in-process caller can"*) — R17-1's own severity turned on it. So: the object arm is
  // an IN-PROCESS entry point with no shipped caller, kept because `parseTrip` accepts one and an
  // untested accepted input is how the last four rounds of findings started.
  const raw = JSON.parse(withHours({ weekly: [] })) as Doc;
  (raw.places as Doc[])[0].hours = { weekly: [undefined, null] };
  const undef = fromJSON(raw);
  assert.deepEqual(undef.places[0].hours!.weekly, [null, null]);
  assert.equal('note' in undef.places[0].hours!, false, 'an absent note must not become a present one');
});

// ---------------------------------------------------------------------------
// A-20 assertion 5 — exactly ONE clock regex in `packages/core`.
//
// A second copy of the predicate is the disease this ruling treats; a source grep is the only
// thing that can say there is not a third one next year. `I-4: no view calls new Date()` in
// `packages/client/test` is the same class of test.
// ---------------------------------------------------------------------------

test('A-20 assertion 5: the clock-shape regex appears exactly once in packages/core/src', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

  const files: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith('.ts')) files.push(p);
    }
  };
  await walk(root);
  assert.ok(files.length > 20, 'the walk found no source to grep');

  const matches: string[] = [];
  for (const f of files) {
    const src = await readFile(f, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (line.includes('\\d{1,2}:')) matches.push(`${f.slice(root.length + 1)}:${i + 1}`);
    });
  }
  assert.equal(
    matches.length, 1,
    `the clock regex must exist exactly once, and in model/openingHours.ts — found: ${matches.join(', ')}`,
  );
  assert.match(matches[0], /^model\/openingHours\.ts:/);
});

test('A-20 assertion 6: isOpeningHours is NOT on the public surface (§2.10 is 86, and none of them is this)', async () => {
  const core = await import('../src/index.ts');
  // 71 at revision 19; 73 since Phase 2 I-5 added `countryOf` and `COUNTRY_INDEX` under §8.4
  // clause 1; 74 since Phase 2 I-6 added `SUMMARY_VERSION` under §8.4 clause 3; 75 since
  // Phase 2 I-7 added `travelStats` under §8.4 clause 2 / A-31; 76 since Phase 2 I-8d added
  // `clusterPoints` under §4.4 A-41 Part 6; **77 since Phase 2 I-8e added `isIsoDate` under
  // §2.9 A-46 Part 2** — the date predicate `packages/client`'s `rowDatesReadable` calls, so
  // that the Trips list can ask the question A-45 made `fromJSON` answer without growing a
  // second calendar; **78 since Phase 2 I-8g added `countryKeyPoint` under §4.4 A-48 Part 2**,
  // the atlas frame's key point, which is a geometric property of the index and may not be
  // recomputed in `packages/client`; **79 since Phase 2 I-8h added `countryParts` under §4.4
  // A-49 Part 9; 83 since Phase 2 I-13 added `addPhoto`, `removePhoto`, `updatePhoto` and
  // `readExif` under §10.1/§10.2, A-57 Part 6** — the photo record class's three build
  // functions and the pure EXIF reader A-58 keeps in core rather than take a dependency for;
  // **86 since Phase 2 I-9 added `addParticipant`, `updateParticipant` and `removeParticipant`
  // under §8.3/§8.9** — one build function per action, which is what §4.2 rule 1 needs from the
  // reducer's side.
  // The assertion
  // this test exists for is the loop below — the size is the tripwire that says a widening
  // happened at all, and it is re-derived by counting, never quoted.
  assert.equal(Object.keys(core).length, 86);
  for (const name of ['isClockTime', 'readWeeklyEntry', 'isOpeningHours']) {
    assert.equal(name in core, false, `${name} widened §2.10's surface`);
  }
});
