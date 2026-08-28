/**
 * QA round 29 — I-7a: **`cli.ts --today`, KD-66, and R28-9's calendar half.**
 *
 *   node --experimental-strip-types qa/i7a-today.mjs
 *
 * BUILD-NOTES **KD-66** states two things this probe tests rather than reads:
 *
 *   (1) "`--today 2026-13-45` produces byte-identical output to `--today 2027-02-14`."
 *   (2) closing R28-9's calendar half would need either §2.10 to widen or the CLI to
 *       re-implement `isIsoDate` — "the one place where two contract rules leave a fix
 *       narrower than it reads".
 *
 * §1 runs the CLI. §2 tests whether (2) is true, by building a complete calendar check out of
 * `dayNumber` and `fromDayNumber` — both already on §2.10's surface, both already imported by
 * `cli.ts` — and differentially comparing it against `isIsoDate` itself.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dayNumber, fromDayNumber } from '../packages/core/src/derive/summary.ts';
import { isIsoDate } from '../packages/core/src/model/ids.ts';

const CAIRN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL  ' + m); } else console.log('ok    ' + m); };
const head = (s) => console.log(`\n== ${s} ==`);

const cli = (...args) => {
  const r = spawnSync('node', ['cli.ts', ...args], { cwd: CAIRN, encoding: 'utf8' });
  return { out: r.stdout ?? '', err: r.stderr ?? '', code: r.status };
};

head('1. the CLI on a shape-valid, calendar-invalid --today');
{
  const rolled = cli('stats', '--today', '2026-13-45');
  const real = cli('stats', '--today', '2027-02-14');
  console.log(`      rolled line 1: ${JSON.stringify(rolled.out.split('\n')[0])}`);
  console.log(`      real   line 1: ${JSON.stringify(real.out.split('\n')[0])}`);
  ok(rolled.out === real.out,
    'KD-66: `--today 2026-13-45` produces BYTE-IDENTICAL output to `--today 2027-02-14`');
  ok(rolled.out.split('\n').slice(1).join('\n') === real.out.split('\n').slice(1).join('\n'),
    '…and the body below line 1 is identical (which is all test/cli.test.ts:308 compares)');
  ok(!rolled.out.startsWith('travel statistics as of 2026-13-45'),
    'the header does not report a `--today` the program did not use');

  const t = cli('trip', '--today', '2026-13-45');
  console.log(`      trip line 2:   ${JSON.stringify(t.out.split('\n')[1])}`);
  ok(!/as of 2026-13-45/.test(t.out),
    '`trip --today 2026-13-45` does not label its lifecycle verdict with the un-normalised date');

  const c = cli('conflicts', '--today', '2026-13-45');
  ok(!/today = 2026-13-45/.test(c.out),
    '`conflicts --today 2026-13-45` does not print `(today = 2026-13-45)` — R28-9\'s second half');

  // The half that IS closed: genuinely malformed shapes.
  for (const bad of ['bogus', '', '2026-8-7', '26-08-07', '2026/08/07', 'null', '  ']) {
    const r = cli('stats', '--today', bad);
    ok(r.code === 2 && !/at .*cli\.ts/.test(r.err),
      `--today ${JSON.stringify(bad)} exits 2 with a message and no stack trace`);
  }
}

head('2. is R28-9\'s calendar half really out of reach? (KD-66 claim 2)');
{
  // A complete calendar check out of TWO functions §2.10 already exports and `cli.ts` already
  // imports. It is not a second definition of `IsoDate`'s domain — it is the round-trip
  // identity against the ONE implementation, which is exactly what A-32 Part 5 asks for.
  const roundTrips = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && fromDayNumber(dayNumber(s)) === s;

  let n = 0, disagree = 0, first = null;
  const p = (x) => String(x).padStart(2, '0');
  const YEARS = [0, 1, 3, 4, 99, 100, 101, 200, 400, 999, 1000, 1582, 1600, 1700, 1900, 1970,
    1999, 2000, 2019, 2024, 2026, 2027, 2100, 2400, 3000, 4000, 5000, 8000, 9999];
  for (const y of YEARS) {
    for (let m = 0; m <= 99; m++) {
      for (let d = 0; d <= 99; d++) {
        const s = `${String(y).padStart(4, '0')}-${p(m)}-${p(d)}`;
        const a = roundTrips(s), b = isIsoDate(s);
        n++;
        if (a !== b) { disagree++; if (!first) first = `${s}: roundTrip=${a} isIsoDate=${b}`; }
      }
    }
  }
  ok(disagree === 0,
    `the round-trip check agrees with isIsoDate on all ${n} shape-valid strings at ${YEARS.length} years` +
    (first ? ` — first disagreement ${first}` : ''));

  // Every Feb 29 in the domain, which is where a leap-rule re-implementation goes wrong.
  let leapBad = 0;
  for (let y = 0; y <= 9999; y++) {
    const s = `${String(y).padStart(4, '0')}-02-29`;
    if (roundTrips(s) !== isIsoDate(s)) leapBad++;
  }
  ok(leapBad === 0, 'and on all 10,000 Feb-29 strings — the leap rule needs no re-implementation');

  // …and on the exact strings the CLI is asked about.
  for (const [s, want] of [['2026-13-45', false], ['2026-02-30', false], ['2026-00-00', false],
    ['9999-99-99', false], ['0000-00-00', false], ['2026-08-14', true], ['0004-02-29', true],
    ['0100-02-29', false], ['0202-01-01', true], ['9999-12-31', true], ['0000-01-01', true]]) {
    ok(roundTrips(s) === want, `roundTrips(${s}) === ${want}`);
  }
  console.log('      => KD-66 claim 2 does not hold: the calendar half is one line built from');
  console.log('         `dayNumber` and `fromDayNumber`, both already on §2.10 and already');
  console.log('         imported by cli.ts. No deep import, no second domain definition.');
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}`);
process.exit(0);
