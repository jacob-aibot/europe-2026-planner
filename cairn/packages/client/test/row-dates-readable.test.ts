/**
 * `rowDatesReadable` — ARCHITECTURE §2.9 **A-46** Part 2, ROADMAP Phase 2 **I-8e**.
 *
 * The Trips list can know three things about a stored `TripSummaryRow` (A-46 Part 1):
 *
 *   F-A  *we opened this document and `fromJSON` threw*  — `summaryScan(state).unreadable`,
 *        available **only** during a `SUMMARY_VERSION` rescan, i.e. only for rows already
 *        stale by version.
 *   F-B  *these dates are not even `YYYY-MM-DD`-shaped*  — `rowLifecycle(row, today) === null`.
 *   F-C  *these dates are shape-valid but are not real calendar dates* — nothing computed it,
 *        and it is the whole of QA **R34-2**'s population.
 *
 * F-C is not F-B: `rowLifecycle` is `core.lifecycle` in a `try/catch`, `lifecycle` reaches
 * `parseIsoDate`, and §2.1 **A-32** Part 4's month normalisation makes that total over anything
 * shape-valid — so `2026-02-30 → 2026-03-01` classifies as `completed` and renders as a
 * perfectly healthy card. This predicate is F-C ∪ F-B, and it is **core's own**: its body is
 * `core.isIsoDate(start) && core.isIsoDate(end)` and it may be nothing else. A hand-rolled
 * calendar check in `packages/client` is the second-implementation defect A-20, A-21, A-37 and
 * A-45 have each treated once already.
 *
 * **A-44 is unchanged and is not what this file tests.** `rowLifecycle` answers *"can this row
 * be classified?"*; this answers *"is what this row stores a date?"*.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { core, rowDatesReadable, rowLifecycle } from '../src/index.ts';
import type { IsoDate } from '../src/deps.ts';

const TODAY: IsoDate = '2026-08-31';

test('A-46 Part 2: a row whose two dates are real calendar dates is readable', () => {
  const good: Array<[string, string]> = [
    ['2026-08-07', '2026-08-22'],
    ['0000-02-29', '9999-12-31'], // A-32's domain, both ends, including the Gregorian leap year
    ['2024-02-29', '2024-03-01'],
    ['2019-05-01', '2019-05-08'],
  ];
  for (const [startDate, endDate] of good) {
    assert.equal(rowDatesReadable({ startDate, endDate }), true, `${startDate} → ${endDate}`);
  }
});

/**
 * A-46 Part 1's table, run against the shipped selectors. Every row here is what R34-2
 * measured as *"one perfectly healthy card"* — the predicate's whole reason to exist.
 */
test('A-46 Part 1: a shape-valid but calendar-invalid row is UNREADABLE, and rowLifecycle still classifies it', () => {
  const table: Array<[string, string, core.Lifecycle]> = [
    ['2026-02-30', '2026-03-01', 'completed'],
    ['2026-02-31', '2026-03-05', 'completed'],
    ['2026-13-01', '2026-13-02', 'planned'],
    ['0000-00-00', '0000-00-00', 'completed'],
  ];
  for (const [startDate, endDate, stage] of table) {
    assert.equal(
      rowLifecycle({ startDate, endDate }, TODAY),
      stage,
      `A-44's premise moved: ${startDate} → ${endDate} no longer classifies as ${stage}, so this ` +
        'predicate is no longer strictly wider than rowLifecycle === null',
    );
    assert.equal(rowDatesReadable({ startDate, endDate }), false, `${startDate} → ${endDate}`);
  }
});

test('A-46 Part 2: it strictly CONTAINS rowLifecycle === null — every shape-invalid string fails it', () => {
  const shapeInvalid = ['garbage', '202-01-01', '', '2026-8-7', 'March 2019', '10000-01-04', '-0001-12-31', 'not-a-date'];
  for (const bad of shapeInvalid) {
    assert.equal(rowLifecycle({ startDate: bad, endDate: '2026-09-10' }, TODAY), null, `rowLifecycle ${bad}`);
    assert.equal(rowDatesReadable({ startDate: bad, endDate: '2026-09-10' }), false, `startDate ${bad}`);
    assert.equal(rowDatesReadable({ startDate: '2026-01-01', endDate: bad }), false, `endDate ${bad}`);
  }
});

/**
 * QA **R34-5**, discharged at the surface (A-46 Part 2's last paragraph). `core.lifecycle`
 * returns `'planned'` before it ever evaluates `endDate`, so a future-dated row with an
 * unreadable `endDate` gets a confident `PLANNED` chip. This predicate reads **both** fields
 * unconditionally, so there is no short-circuit to hide behind.
 */
test('A-46 Part 2 / R34-5: an unreadable endDate on a future-dated row is caught, where rowLifecycle cannot see it', () => {
  const row = { startDate: '2026-09-01', endDate: 'not-a-date' };
  assert.equal(rowLifecycle(row, TODAY), 'planned', "R34-5's premise moved");
  assert.equal(rowDatesReadable(row), false);
  // The same blind spot with a calendar-invalid tail, which rowLifecycle cannot see either.
  assert.equal(rowDatesReadable({ startDate: '2026-09-01', endDate: '2026-11-31' }), false);
});

test('A-46 Part 2: pure and total — no input throws, and nothing is mutated', () => {
  const weird: unknown[] = [null, undefined, 0, [], {}, { toString: () => '2026-01-01' }, NaN, '2026-01-01 '];
  for (const v of weird) {
    const row = { startDate: v as string, endDate: v as string };
    const frozen = Object.freeze({ ...row });
    assert.doesNotThrow(() => rowDatesReadable(frozen));
    assert.equal(rowDatesReadable(frozen), false, `${String(v)} is not a date`);
  }
});

test('A-46 Part 2: it IS core.isIsoDate on both fields — not a second answer', () => {
  const samples = ['2026-08-07', '2026-02-30', '2026-13-01', 'not-a-date', '0000-02-29', '1900-02-29', '9999-12-31'];
  for (const a of samples) {
    for (const b of samples) {
      assert.equal(
        rowDatesReadable({ startDate: a, endDate: b }),
        core.isIsoDate(a) && core.isIsoDate(b),
        `${a} / ${b}`,
      );
    }
  }
});

/**
 * The forbidden shape, asserted rather than trusted (A-46 Part 2: *"a hand-rolled calendar
 * check in `packages/client` is forbidden"*, and I-8e's second criterion states the grep).
 * Comments are stripped first, because the ruling's own vocabulary quotes these strings.
 */
test('A-46 Part 2: packages/client carries no calendar of its own', () => {
  const HERE = dirname(fileURLToPath(import.meta.url));
  const SRC = resolve(HERE, '..', 'src');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts')) files.push(p);
    }
  };
  walk(SRC);
  const offenders: string[] = [];
  for (const f of files) {
    const stripped = readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    if (/\\d\{4\}-\\d\{2\}-\\d\{2\}/.test(stripped) || /daysInMonth/.test(stripped)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], 'a second date implementation has appeared in packages/client');
});
