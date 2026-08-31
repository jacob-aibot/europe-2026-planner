/**
 * The civil calendar under `IsoDate` — ARCHITECTURE §2.1 **A-32** (QA **R28-1**, BLOCKER).
 *
 * `dayNumber`, `fromDayNumber` and `weekdayOf` used to go through `Date.UTC`/`new Date`, which
 * carries the ES **legacy two-digit-year rule**: a `year` argument of 0–99 *means* 1900–1999.
 * So `dayNumber('0001-01-01')` and `dayNumber('1901-01-01')` were the same number, and
 * `fromDayNumber` padded the month and the day but not the year, so `0500-06-01` round-tripped
 * to `"500-06-01"` — a string `parseIsoDate`, eight lines up in the same file, throws on. A past
 * trip typed as year `0202` was therefore written to storage and could never be read back.
 *
 * A-32 Part 4 states `IsoDate`'s domain for the first time: **proleptic Gregorian,
 * `0000-01-01` … `9999-12-31` inclusive**, which is what `isIsoDate` has always implemented.
 * The helpers are now Hinnant civil arithmetic with **no `Date` anywhere**, and `fromDayNumber`
 * stays **total** — an out-of-domain day number renders faithfully rather than throwing, because
 * the only path that reaches one runs through `validateTrip` on a document `fromJSON` accepted
 * and §2.1 forbids a throw there.
 *
 * The tests below are A-32 Part 6's list. `Date.UTC` appears in this file *deliberately* — it is
 * the differential oracle for the band it gets right (years >= 100), and it is the one place in
 * the repo where it may still be called.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, dateSpan, dayNumber, fromDayNumber, parseIsoDate, weekdayOf } from '../src/derive/summary.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE_SRC = resolve(HERE, '../src');

const p2 = (n: number) => String(n).padStart(2, '0');
const p4 = (n: number) => String(n).padStart(4, '0');
const iso = (y: number, m: number, d: number) => `${p4(y)}-${p2(m)}-${p2(d)}`;
/** The oracle, valid for years >= 100 only — which is the whole point of the two bands. */
const utcDayNumber = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);

// ---------------------------------------------------------------------------
// Fault 1 — the legacy two-digit-year rule, years 0000..0099.
// ---------------------------------------------------------------------------

test('A-32: year 0001 is year 1, not 1901', () => {
  assert.notEqual(
    dayNumber('0001-01-01'),
    dayNumber('1901-01-01'),
    'dayNumber went through Date.UTC, which reads year 1 as 1901',
  );
  assert.notEqual(dayNumber('0099-06-15'), dayNumber('1999-06-15'));
  // The proleptic Gregorian answer, derived rather than quoted: 1970-01-01 is day 0, and the
  // Gregorian calendar repeats exactly every 400 years (146,097 days), so year 1 January 1 is
  // five eras before 2001-01-01.
  assert.equal(dayNumber('0001-01-01'), dayNumber('2001-01-01') - 5 * 146097);
  assert.equal(dayNumber('0004-02-29'), dayNumber('2004-02-29') - 5 * 146097);
});

test('A-32: weekdayOf is proleptic Gregorian — 0001-01-01 is a Monday', () => {
  // The shipped code answered 'Tue', which is 1901-01-01's weekday.
  assert.equal(weekdayOf('0001-01-01'), 'Mon');
  assert.equal(weekdayOf('1901-01-01'), 'Tue');
  assert.notEqual(weekdayOf('0099-03-01'), weekdayOf('1999-03-01'));
  // A pre-epoch date exercises the double modulo in the weekday index.
  assert.equal(weekdayOf('1969-12-25'), 'Thu');
  assert.equal(weekdayOf('1970-01-01'), 'Thu');
});

// ---------------------------------------------------------------------------
// Fault 2 — the unpadded year, years 0000..0999.
// ---------------------------------------------------------------------------

test('A-32: fromDayNumber pads the year to four digits', () => {
  assert.equal(fromDayNumber(dayNumber('0500-06-01')), '0500-06-01');
  assert.equal(fromDayNumber(dayNumber('0001-01-01')), '0001-01-01');
  assert.equal(fromDayNumber(dayNumber('0099-12-31')), '0099-12-31');
  // …and what it emits re-parses, which the shipped code's `"500-06-01"` did not.
  assert.deepEqual(parseIsoDate(fromDayNumber(dayNumber('0500-06-01'))), { y: 500, m: 6, d: 1 });
});

test('A-32: the domain round-trips at both endpoints and at both fault bands\' edges', () => {
  for (const d of ['0000-01-01', '0000-12-31', '0001-01-01', '0099-12-31', '0100-01-01',
    '0999-12-31', '1000-01-01', '1969-12-31', '1970-01-01', '2026-08-07', '9999-12-31']) {
    assert.equal(fromDayNumber(dayNumber(d)), d, `${d} did not round-trip`);
  }
});

test('A-32: a sampled round trip over the whole domain emits YYYY-MM-DD every time', () => {
  const lo = dayNumber('0000-01-01');
  const hi = dayNumber('9999-12-31');
  assert.equal(hi - lo + 1, 3652425, 'the domain is 3,652,425 days — 25 Gregorian eras');
  for (let n = lo; n <= hi; n += 997) {
    const s = fromDayNumber(n);
    assert.match(s, /^\d{4}-\d{2}-\d{2}$/, `fromDayNumber(${n}) = ${JSON.stringify(s)}`);
    assert.equal(dayNumber(s), n);
  }
  assert.equal(fromDayNumber(hi), '9999-12-31');
  assert.equal(fromDayNumber(lo), '0000-01-01');
});

// ---------------------------------------------------------------------------
// The differential: the band `Date.UTC` gets right, this gets identically right.
// ---------------------------------------------------------------------------

test('A-32: dayNumber agrees with Date.UTC for every year >= 100', () => {
  let checked = 0;
  for (let y = 100; y <= 9999; y += 3) {
    for (let m = 1; m <= 12; m++) {
      for (const d of [1, 13, 28, m === 2 ? 28 : 30]) {
        assert.equal(dayNumber(iso(y, m, d)), utcDayNumber(y, m, d), `${iso(y, m, d)}`);
        checked++;
      }
    }
  }
  assert.ok(checked >= 150000, `only ${checked} dates compared`);
});

test('A-32: weekdayOf agrees with Date for every year >= 100', () => {
  const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let y = 100; y <= 9999; y += 7) {
    for (const [m, d] of [[1, 1], [2, 28], [6, 15], [12, 31]] as Array<[number, number]>) {
      assert.equal(weekdayOf(iso(y, m, d)), NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]);
    }
  }
});

// ---------------------------------------------------------------------------
// The roll-over `fromJSON` permits does not move — A-32 Part 3's month normalisation.
// ---------------------------------------------------------------------------

test('A-32: a shape-valid calendar-invalid date rolls over exactly as it always did', () => {
  // `fromJSON` accepts these (§2.9 A-20) and `validateTrip` REPORTS them rather than refusing,
  // so these helpers must stay total on them and must not move the day they answer with.
  assert.equal(dayNumber('2026-13-45'), dayNumber('2027-02-14'));
  assert.equal(dayNumber('2026-02-30'), dayNumber('2026-03-02'));
  assert.equal(dayNumber('2026-00-01'), dayNumber('2025-12-01'));
  assert.equal(dayNumber('2026-99-99'), dayNumber('2034-06-07'));
  assert.equal(dayNumber('2026-00-00'), dayNumber('2025-11-30'));
});

test('A-32: the roll-over differential vs Date.UTC, every shape-valid (m, d) pair', () => {
  for (const y of [100, 1583, 1970, 2026, 2100, 4000, 9000]) {
    for (let m = 0; m <= 99; m++) {
      for (let d = 0; d <= 99; d += 7) {
        assert.equal(dayNumber(`${p4(y)}-${p2(m)}-${p2(d)}`), utcDayNumber(y, m, d), `${y}-${m}-${d}`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Totality — A-32 Part 4. `fromDayNumber` renders out of the domain, never throws.
// ---------------------------------------------------------------------------

test('A-32: fromDayNumber is total — out of the domain it renders rather than throwing', () => {
  // The reachable path — corrected by **A-45** (revision 30), which closed the one this comment
  // used to name. `fromJSON` no longer accepts `endDate: '9999-13-45'`: its `isoDate()` calls
  // `isIsoDate` and refuses a date that is not a date. What remains reachable, and is why this
  // function stays total, is A-45 Part 3's list: a **stored `TripSummaryRow`** (§8.4 **A-37** —
  // a row minted before that fix still carries a rolled date, and a row is never revalidated),
  // `cli --today`, and any in-memory `Trip` that never passed a parser. `validateTrip`'s
  // `addDays(startDate, i)` carries such a year past 9999, and a throw there would be a throw
  // out of `validateTrip` on an object §2.1 says must come back as `Issue[]`.
  const past = dayNumber('9999-12-31') + 1;
  assert.equal(fromDayNumber(past), '10000-01-01');
  assert.equal(fromDayNumber(dayNumber('0000-01-01') - 1), '-0001-12-31');
  assert.doesNotThrow(() => fromDayNumber(-100000000));
  assert.doesNotThrow(() => fromDayNumber(100000000));
  // …and what it emits out there is a string every downstream `parseIsoDate` refuses, which is
  // where the refusal belongs (Part 8 residue 3).
  assert.throws(() => parseIsoDate(fromDayNumber(past)), /invalid IsoDate/);
});

test('A-32: addDays and dateSpan are unchanged and inherit the fix', () => {
  assert.equal(addDays('2026-08-07', 15), '2026-08-22');
  assert.equal(addDays('0202-01-01', 364), '0202-12-31');
  assert.equal(addDays('0500-06-01', 0), '0500-06-01');
  assert.equal(dateSpan('0202-01-01', '0202-12-31'), 365);
  assert.equal(dateSpan('2026-08-07', '2026-08-22'), 16);
  assert.equal(dateSpan('2026-08-22', '2026-08-07'), -14);
  // Year 0202 is not a leap year in the proleptic Gregorian calendar; 0204 is.
  assert.equal(dateSpan('0204-01-01', '0204-12-31'), 366);
});

// ---------------------------------------------------------------------------
// The determinism win A-32 did not set out to buy.
// ---------------------------------------------------------------------------

test('A-32: packages/core/src constructs no Date and calls no Date.UTC', () => {
  // Comments are stripped first: `model/ids.ts` and `build/createTrip.ts` both explain in prose
  // why they do NOT use `Date.UTC`, and prose that documents the absence must not read as the
  // presence. The determinism grep's long-standing two-site exception is deleted, not widened.
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const f = resolve(dir, e);
      if (statSync(f).isDirectory()) walk(f);
      else if (/\.tsx?$/.test(f)) files.push(f);
    }
  };
  walk(CORE_SRC);
  assert.ok(files.length > 40, `INCONCLUSIVE: only ${files.length} core sources found`);
  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    if (/\bnew Date\s*\(|\bDate\s*\.\s*UTC\s*\(/.test(src)) offenders.push(f.slice(CORE_SRC.length + 1));
  }
  assert.deepEqual(offenders, [], 'a Date construction is back in packages/core/src');
});
