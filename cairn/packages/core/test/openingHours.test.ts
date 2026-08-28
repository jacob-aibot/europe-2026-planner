/**
 * `model/openingHours.ts` — the one definition of a well-formed `OpeningHours`
 * (ARCHITECTURE §2.14 **A-20**, revision 15; QA R15-1, R15-2, R16-2).
 *
 * A-20's finding was that this repo held **three** answers to *"what is a well-formed
 * `OpeningHours`"* — the parser's (anything, via `o.hours as Place['hours']`), `validateTrip`'s
 * (`wellFormedHours`, loose) and the copy's (`weeklyForCopy`, strict) — and no two agreed. The
 * ruling collapses them onto this module, which is deliberately **off**
 * `packages/core/src/index.ts` (§2.10 stays at 71 runtime symbols).
 *
 * The predicate's contract is one sentence: **`isOpeningHours(v)` is true exactly when
 * `fromJSON` accepts `v` as a `Place.hours`.** Both halves are pinned below — the predicate's
 * own table, and the same table put through the parser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isClockTime, isOpeningHours, isWeeklyEntry } from '../src/model/openingHours.ts';
import { redactText } from '../src/build/redactText.ts';
import { fromJSON, toJSON, TripParseError } from '../src/index.ts';
import { europe2026 } from './fixture.ts';

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

test('isWeeklyEntry: absence is the model\'s own unknown; a present entry is three named fields', () => {
  // §7: "Missing day = unknown, never a conflict." Absence is not malformed.
  assert.equal(isWeeklyEntry(null), true);
  assert.equal(isWeeklyEntry(undefined), true, 'fromJSON normalises an undefined slot to null');

  assert.equal(isWeeklyEntry({ day: 1, open: '09:00', close: '17:00' }), true);
  assert.equal(isWeeklyEntry({ day: 0, open: '9:00', close: '23:59' }), true);
  // A-20: extra keys on an entry are NOT malformed — the parser drops them, exactly as
  // `parseLinks` drops a third key on a `Link`, and reporting them would be over-reporting.
  assert.equal(isWeeklyEntry({ day: 1, open: '09:00', close: '17:00', note: 'x' }), true);
  // A-20: no `day` range check. `0 ≤ day ≤ 6` is a claim about MEANING, and a rule with no
  // consumer has no injected-fault criterion (§0.5).
  assert.equal(isWeeklyEntry({ day: 99, open: '09:00', close: '17:00' }), true);
  assert.equal(isWeeklyEntry({ day: -3.5, open: '09:00', close: '17:00' }), true);

  // The three shapes R16-2 measured as dropped-by-the-copy-and-unwarned-by-validateTrip. The
  // whole point of A-20 is that all three are now false HERE, in one place, for both readers.
  assert.equal(isWeeklyEntry({ day: 1, open: '9:00', close: '170000' }), false);
  assert.equal(isWeeklyEntry({ day: 1, open: 'https://vendor.test/x', close: '17:00' }), false);
  assert.equal(isWeeklyEntry({ day: 1, open: 'YZGDTS', close: '17:00' }), false);

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
    assert.equal(isWeeklyEntry(bad), false, `${JSON.stringify(bad)} is not a weekly entry`);
  }
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
  // no `undefined`, so this is `fromJSON`'s already-parsed-object input, which is a live route
  // (`store.importDoc` and `cli` both pass one).
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

test('A-20 assertion 6: isOpeningHours is NOT on the public surface (§2.10 stays at 71)', async () => {
  const core = await import('../src/index.ts');
  assert.equal(Object.keys(core).length, 71);
  for (const name of ['isClockTime', 'isWeeklyEntry', 'isOpeningHours']) {
    assert.equal(name in core, false, `${name} widened §2.10's surface`);
  }
});
