/**
 * QA round 29 — A-32 (R28-1's fix) verified against THREE independent oracles, none of
 * which is `Date` and none of which is Hinnant's algorithm.
 *
 *   node --experimental-strip-types qa/i7a-calendar.mjs
 *
 * Round 28 measured the bug with `Date.UTC`; the architect measured the fix with `Date.UTC`;
 * the builder re-ran the architect's differentials. `Date.UTC` cannot see years below 100 at
 * all, which is the band the BLOCKER lived in — so the whole chain is blind exactly where it
 * matters. This probe uses:
 *
 *   O1  Fliegel–Van Flandern's Julian Day Number (a different derivation entirely, valid over
 *       the whole proleptic Gregorian calendar for y >= -4800), for `dayNumber`.
 *   O2  Zeller's congruence, for `weekdayOf` — including years 1..99, where `Date` is wrong.
 *   O3  A brute-force day-by-day walker from 0001-01-01, for the first 1200 years, which
 *       assumes nothing but the leap rule and the month lengths.
 *
 * Plus totality, the four-digit padding, and the exact strings A-32 Part 6 items 2 and 3 name.
 */
import {
  dayNumber, fromDayNumber, weekdayOf, addDays, dateSpan, parseIsoDate,
} from '../packages/core/src/derive/summary.ts';

let fails = 0, checks = 0;
const ok = (name, cond, detail = '') => {
  checks++;
  if (!cond) { fails++; console.log(`FAIL  ${name}${detail ? `  — ${detail}` : ''}`); }
  else console.log(`ok    ${name}${detail ? `  (${detail})` : ''}`);
};
const p = (x) => String(x).padStart(2, '0');
const iso = (y, m, d) => `${String(y).padStart(4, '0')}-${p(m)}-${p(d)}`;

// ---------------------------------------------------------------- O1: Fliegel–Van Flandern
/** JDN for a proleptic-Gregorian (y,m,d). Integer division truncating; all terms positive. */
function jdn(y, m, d) {
  const a = Math.trunc((m - 14) / 12);
  return Math.trunc((1461 * (y + 4800 + a)) / 4)
    + Math.trunc((367 * (m - 2 - 12 * a)) / 12)
    - Math.trunc((3 * Math.trunc((y + 4900 + a) / 100)) / 4)
    + d - 32075;
}
const oracleDayNumber = (y, m, d) => jdn(y, m, d) - 2440588;   // JDN of 1970-01-01

// ---------------------------------------------------------------- O2: Zeller's congruence
const ZELLER = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
function oracleWeekday(y, m, d) {
  let Y = y, M = m;
  if (M < 3) { M += 12; Y -= 1; }
  const K = ((Y % 100) + 100) % 100;
  const J = Math.floor(Y / 100);
  const h = (d + Math.floor((13 * (M + 1)) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) + 5 * J) % 7;
  return ZELLER[((h % 7) + 7) % 7];
}

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const mlen = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

console.log('== §1  dayNumber vs Fliegel–Van Flandern, every month of every year 0..9999 ==');
{
  let bad = 0, first = null, band0to99 = 0;
  for (let y = 0; y <= 9999; y++) {
    for (let m = 1; m <= 12; m++) {
      for (const d of [1, 15, mlen(y, m)]) {
        const got = dayNumber(iso(y, m, d));
        const want = oracleDayNumber(y, m, d);
        if (got !== want) { bad++; if (!first) first = `${iso(y, m, d)} got ${got} want ${want}`; }
        if (y < 100) band0to99++;
      }
    }
  }
  ok('dayNumber agrees with the JDN oracle on 360,000 dates', bad === 0, first ?? `0 mismatches, ${band0to99} of them in years 0-99`);
}

console.log('\n== §2  weekdayOf vs Zeller, including the band `Date` cannot see ==');
{
  let bad = 0, first = null;
  for (let y = 1; y <= 9999; y += 1) {
    for (const [m, d] of [[1, 1], [2, 28], [3, 1], [7, 4], [12, 31]]) {
      const got = weekdayOf(iso(y, m, d));
      const want = oracleWeekday(y, m, d);
      if (got !== want) { bad++; if (!first) first = `${iso(y, m, d)} got ${got} want ${want}`; }
    }
  }
  ok('weekdayOf agrees with Zeller on 49,995 dates', bad === 0, first ?? '0 mismatches');
  // Known proleptic-Gregorian anchors, from three sources that are not this codebase.
  const anchors = [
    ['0001-01-01', 'Mon'],   // A-32 Part 3's own claim, and the standard proleptic answer
    ['1000-01-01', 'Wed'],
    ['1582-10-15', 'Fri'],   // the first day of the real Gregorian calendar
    ['1600-02-29', 'Tue'],
    ['1900-03-01', 'Thu'],
    ['1970-01-01', 'Thu'],   // day 0
    ['2000-02-29', 'Tue'],
    ['2026-08-28', 'Fri'],   // today, per the session clock
    ['9999-12-31', 'Fri'],
  ];
  for (const [d, want] of anchors) ok(`weekdayOf(${d}) === ${want}`, weekdayOf(d) === want, weekdayOf(d));
  ok('weekdayOf(0099-03-01) !== weekdayOf(1999-03-01) — fault 1 is gone',
    weekdayOf('0099-03-01') !== weekdayOf('1999-03-01'),
    `${weekdayOf('0099-03-01')} vs ${weekdayOf('1999-03-01')}`);
}

console.log('\n== §3  a brute-force walker: 0001-01-01 .. 1200-12-31, day by day ==');
{
  // Assumes only the leap rule and the month lengths; no formula at all.
  let n = dayNumber('0001-01-01');
  let bad = 0, first = null, days = 0;
  for (let y = 1; y <= 1200; y++) {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= mlen(y, m); d++) {
        const s = iso(y, m, d);
        if (dayNumber(s) !== n) { bad++; if (!first) first = `${s}: dayNumber ${dayNumber(s)} walker ${n}`; }
        if (fromDayNumber(n) !== s) { bad++; if (!first) first = `${s}: fromDayNumber(${n}) = ${fromDayNumber(n)}`; }
        n++; days++;
      }
    }
  }
  ok(`the walker and the helpers agree on all ${days} days of years 1..1200`, bad === 0, first ?? '0 mismatches');
}

console.log('\n== §4  fromDayNumber: four-digit padding, totality, and the domain edges ==');
{
  const lo = dayNumber('0000-01-01'), hi = dayNumber('9999-12-31');
  ok('domain endpoints are [-719528, 2932896]', lo === -719528 && hi === 2932896, `${lo}, ${hi}`);
  let bad = 0, first = null;
  for (let k = lo; k <= hi; k++) {
    const s = fromDayNumber(k);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || dayNumber(s) !== k) {
      bad++; if (!first) first = `${k} -> ${s}`;
    }
  }
  ok(`all ${hi - lo + 1} in-domain day numbers round-trip and match /^\\d{4}-\\d{2}-\\d{2}$/`, bad === 0, first ?? 'exhaustive');
  // Out of domain: renders faithfully, never throws (A-32 Part 4).
  const outs = [lo - 1, hi + 1, -1e6, 1e7, -2440588, 0, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER];
  for (const k of outs) {
    let threw = null, s = null;
    try { s = fromDayNumber(k); } catch (e) { threw = e; }
    ok(`fromDayNumber(${k}) does not throw`, threw === null, threw ? String(threw) : s);
  }
  ok('fromDayNumber(-719529) is a negative year, refused by parseIsoDate',
    /^-\d{4}-/.test(fromDayNumber(lo - 1)) && (() => { try { parseIsoDate(fromDayNumber(lo - 1)); return false; } catch { return true; } })(),
    fromDayNumber(lo - 1));
  ok('fromDayNumber(2932897) is a five-digit year, refused by parseIsoDate',
    /^\d{5}-/.test(fromDayNumber(hi + 1)) && (() => { try { parseIsoDate(fromDayNumber(hi + 1)); return false; } catch { return true; } })(),
    fromDayNumber(hi + 1));
  // Non-integer and non-finite input: the OLD implementation was total on these (Date floors
  // fractional ms); this one is not. Reported, not asserted as a defect — no caller reaches it.
  for (const k of [0.5, -0.5, NaN, Infinity, -Infinity]) {
    let s = null, threw = null;
    try { s = fromDayNumber(k); } catch (e) { threw = e; }
    console.log(`      note  fromDayNumber(${k}) = ${threw ? `THREW ${threw}` : JSON.stringify(s)}`);
  }
}

console.log('\n== §5  the roll-over `fromJSON` permits is preserved exactly ==');
{
  const cases = [
    ['2026-13-45', '2027-02-14'], ['2026-02-30', '2026-03-02'],
    ['2026-00-00', '2025-11-30'], ['2026-01-00', '2025-12-31'],
    ['9999-99-99', null], ['0000-00-00', null],
  ];
  for (const [src, want] of cases) {
    const got = fromDayNumber(dayNumber(src));
    if (want) ok(`${src} rolls to ${want}`, got === want, got);
    else console.log(`      note  ${src} rolls to ${got} (out of domain)`);
  }
  // The month normalisation must match Date.UTC over the shape-valid grid, for years >= 100
  // (the only band Date.UTC is right in). 100,000 pairs, as A-32 claims.
  let bad = 0, first = null, n = 0;
  for (const y of [100, 337, 1000, 1583, 1900, 1970, 2000, 2026, 5000, 9000]) {
    for (let m = 0; m <= 99; m++) {
      for (let d = 0; d <= 99; d++) {
        const got = dayNumber(`${String(y).padStart(4, '0')}-${p(m)}-${p(d)}`);
        const want = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
        n++;
        if (got !== want) { bad++; if (!first) first = `${y}-${p(m)}-${p(d)}: ${got} vs ${want}`; }
      }
    }
  }
  ok(`roll-over matches Date.UTC on all ${n} shape-valid (m,d) pairs at 10 years >= 100`, bad === 0, first ?? '0 mismatches');
}

console.log('\n== §6  addDays / dateSpan across the bands that used to be wrong ==');
{
  ok('addDays("0202-01-01", 364) === "0202-12-31"', addDays('0202-01-01', 364) === '0202-12-31', addDays('0202-01-01', 364));
  ok('dateSpan("0202-01-01","0202-12-31") === 365', dateSpan('0202-01-01', '0202-12-31') === 365, String(dateSpan('0202-01-01', '0202-12-31')));
  ok('dateSpan("0004-01-01","0004-12-31") === 366 (year 4 is a leap year)', dateSpan('0004-01-01', '0004-12-31') === 366, String(dateSpan('0004-01-01', '0004-12-31')));
  ok('dateSpan("0100-01-01","0100-12-31") === 365 (year 100 is NOT)', dateSpan('0100-01-01', '0100-12-31') === 365, String(dateSpan('0100-01-01', '0100-12-31')));
  ok('addDays("0026-01-01", 0) === "0026-01-01" — no 1900-year shift', addDays('0026-01-01', 0) === '0026-01-01', addDays('0026-01-01', 0));
  ok('dayNumber("0001-01-01") !== dayNumber("1901-01-01")',
    dayNumber('0001-01-01') !== dayNumber('1901-01-01'),
    `${dayNumber('0001-01-01')} vs ${dayNumber('1901-01-01')}`);
  ok('fromDayNumber(dayNumber("0500-06-01")) === "0500-06-01"',
    fromDayNumber(dayNumber('0500-06-01')) === '0500-06-01', fromDayNumber(dayNumber('0500-06-01')));
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`} — ${checks} checks`);
process.exit(0);
