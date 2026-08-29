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

test('I-8: a malformed date comes back ok:false with rowId null — travelStats names no row', () => {
  const library = [row({ id: 't-1', startDate: 'not-a-date' as IsoDate, endDate: '2026-01-05' })];
  const result = travelHistory({ library }, TODAY);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.message, /invalid IsoDate/);
  assert.equal(result.rowId, null);
});
