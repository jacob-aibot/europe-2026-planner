/**
 * `rowLifecycle` — the read gate ARCHITECTURE §8.4 **A-44** puts in `packages/client`, once,
 * beside `travelHistory`. ROADMAP Phase 2 **I-8c**.
 *
 * `core.lifecycle(row, today)` → `dayNumber` → `parseIsoDate` **throws** on a stored row whose
 * date is not even shape-valid (§8.4 **A-37** Part 2: a stored `TripSummaryRow` is not a
 * validated document). `LifecycleChip` called it with no gate, so one bad row took the whole
 * Trips tab down — QA **R33-3** measured the surviving control set as
 * `["BUTTON:CAIRN","BUTTON:TRIPS","BUTTON:MAP"]`.
 *
 * The gate is here rather than in `lifecycle` (A-44: clamping inside it would make an
 * out-of-domain row report as `active` forever, and a `Lifecycle | null` return would ripple
 * through `travelStats`, `cli.ts` and both trip forms) and rather than per call site (three
 * copies of a read gate is the defect A-20, A-21 and A-37 each treated once).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { core, rowLifecycle } from '../src/index.ts';
import type { IsoDate } from '../src/deps.ts';

const TODAY: IsoDate = '2026-08-31';

test('A-44: a readable row gets exactly the answer core.lifecycle gives', () => {
  const cases: Array<[string, string, core.Lifecycle]> = [
    ['2026-09-01', '2026-09-10', 'planned'],
    ['2026-08-31', '2026-09-10', 'active'],
    ['2026-08-01', '2026-08-31', 'active'],
    ['2026-08-01', '2026-08-30', 'completed'],
  ];
  for (const [startDate, endDate, expected] of cases) {
    assert.equal(rowLifecycle({ startDate, endDate }, TODAY), expected, `${startDate}→${endDate}`);
    assert.equal(
      rowLifecycle({ startDate, endDate }, TODAY),
      core.lifecycle({ startDate: startDate as IsoDate, endDate: endDate as IsoDate }, TODAY),
      'the gate must not be a second implementation of the classification',
    );
  }
});

test('A-44: a shape-invalid stored date comes back as null instead of throwing', () => {
  // Exactly the shapes `parseIsoDate` refuses. Each of these throws out of `core.lifecycle`,
  // which is the shipped behaviour this gate exists to catch — asserted, not assumed.
  const unreadable = ['garbage', '202-01-01', '', '2026-8-7', 'March 2019', '10000-01-04', '-0001-12-31'];
  for (const bad of unreadable) {
    assert.throws(
      () => core.lifecycle({ startDate: bad as IsoDate, endDate: '2026-09-10' as IsoDate }, TODAY),
      /invalid IsoDate/,
      `core.lifecycle stopped throwing on ${JSON.stringify(bad)} — this gate's premise moved`,
    );
    assert.equal(rowLifecycle({ startDate: bad, endDate: '2026-09-10' }, TODAY), null, `startDate ${bad}`);
    assert.equal(rowLifecycle({ startDate: '2026-01-01', endDate: bad }, TODAY), null, `endDate ${bad}`);
  }
});

test('A-44: an unreadable `today` is unreadable too — the gate covers the whole call', () => {
  assert.equal(rowLifecycle({ startDate: '2026-01-01', endDate: '2026-01-05' }, 'nope' as IsoDate), null);
});

test('A-44: a calendar-invalid but shape-valid stored date still classifies, exactly as core does', () => {
  // A-45 closed `fromJSON`'s acceptance of these, but A-37 says a row minted before that fix is
  // never revalidated, so one is still reachable from storage. `dayNumber` normalises rather
  // than throwing (§2.1 A-32 Part 4, deliberately unchanged), so this is NOT the unreadable
  // case and the gate must not invent one: `null` means "could not be read", and this was read.
  assert.equal(rowLifecycle({ startDate: '2026-13-01', endDate: '2026-13-02' }, TODAY), 'planned');
  assert.equal(
    rowLifecycle({ startDate: '2026-13-01', endDate: '2026-13-02' }, TODAY),
    core.lifecycle({ startDate: '2026-13-01' as IsoDate, endDate: '2026-13-02' as IsoDate }, TODAY),
  );
});

test('A-44: the gate is pure — it does not mutate the row it reads', () => {
  const row = { startDate: '2026-08-01', endDate: '2026-08-30' };
  const before = JSON.stringify(row);
  rowLifecycle(row, TODAY);
  assert.equal(JSON.stringify(row), before);
});
