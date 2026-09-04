/**
 * `travelHistory` — the read boundary ROADMAP's **I-8** requires around `travelStats`,
 * ARCHITECTURE §8.4 **A-31** Part 4 and **A-37** Part 2.
 *
 * `travelStats` itself is exhaustively tested in `packages/core/test/travelStats.test.ts`; this
 * file does not re-derive its arithmetic. What it tests is the boundary: that success passes
 * `state.library`/`today` through unchanged, and that each of `travelStats`'s two documented
 * throw shapes — a duplicate row id, and a malformed date — comes back as a typed `ok: false`
 * result instead of an exception, with the offending row id surfaced where the thrown message
 * actually carries one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { core, travelHistory } from '../src/index.ts';
import type { CountryCode, IsoDate, TripSummaryRow } from '../src/deps.ts';

const TODAY: IsoDate = '2026-06-15';

/** A row with every field present, mirroring `packages/core/test/travelStats.test.ts`'s own. */
function row(init: { id: string; startDate: IsoDate; endDate: IsoDate }): TripSummaryRow {
  return {
    id: init.id,
    title: init.id,
    startDate: init.startDate,
    endDate: init.endDate,
    datePrecision: 'exact',
    cityCount: 0,
    dayCount: 0,
    stopCount: 0,
    poolCount: 0,
    revision: 1,
    countryCodes: [] as CountryCode[],
    cities: [],
    attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
    summaryVersion: 4,
  };
}

test('I-8: success passes state.library and today straight through to travelStats', () => {
  const library = [
    row({ id: 't-1', startDate: '2026-01-01', endDate: '2026-01-05' }),
    row({ id: 't-2', startDate: '2026-03-01', endDate: '2026-03-10' }),
  ];
  const result = travelHistory({ library }, TODAY);
  assert.equal(result.ok, true);
  if (!result.ok) return; // narrows for the type checker; the assert above is the real check
  assert.deepEqual(result.stats, core.travelStats(library, TODAY));
});

test('I-8: an empty library is success, not a throw', () => {
  const result = travelHistory({ library: [] }, TODAY);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.stats.trips, { planned: 0, active: 0, completed: 0 });
});

test("I-8: a duplicate row id comes back ok:false with the row's own id", () => {
  const library = [
    row({ id: 'dup-1', startDate: '2026-01-01', endDate: '2026-01-05' }),
    row({ id: 'dup-1', startDate: '2026-03-01', endDate: '2026-03-10' }),
  ];
  const result = travelHistory({ library }, TODAY);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.message, /duplicate summary id "dup-1"/);
  assert.equal(result.rowId, 'dup-1');
});

/**
 * **Amended at I-12a (§8.4 A-59 Part 4).** This test used to assert `rowId === null` here, on
 * the reasoning that *"nothing on `@cairn/core`'s surface lets a caller re-validate a date"* —
 * false since `isIsoDate` joined §2.10 at revision 31. `rowId` now gains its second populated
 * case: the message is not the duplicate-id one, `rowStatsReadable` finds exactly one suspect
 * row, and that row is named. The `null` answer survives where it is honest — two suspects, or
 * none — and `row-stats-readable.test.ts` pins both of those.
 */
test('A-59: a malformed date comes back ok:false, and the single suspect row is now NAMED', () => {
  const library = [row({ id: 't-1', startDate: 'not-a-date' as IsoDate, endDate: '2026-01-05' })];
  const result = travelHistory({ library }, TODAY);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.message, /invalid IsoDate/);
  assert.equal(result.rowId, 't-1');
  assert.deepEqual(result.unreadableRows, ['t-1']);
});
