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
    placeCount: 0,
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

/**
 * **N1 — ARCHITECTURE §8.4 A-88 Parts 1 and 2 (QA R65-1, MAJOR). The regression `I-28` exists
 * for, pinned in BOTH directions.**
 *
 * `I-26` widened `rowStatsReadable` in place and the ruling never named this caller. The suspect
 * set was then computed from the **widened** predicate while the thing being attributed — the
 * throw — still came from the **narrow** one, so a row whose only fault is *absorbed* (non-fatal
 * by that very ruling) became a suspect for a failure it could not have caused. Measured:
 * `rowId` was `"the-broken-one"` at `e1e1973` and `null` at `ede933f`, and `WorldMap.tsx:100`
 * reads `rowId` and nothing else — so one sentence on a shipped screen went vague.
 *
 * **Injected (arm 1):** point the filter back at `rowStatsReadable` → `rowId: null` and
 * `unreadableRows` gains `"merely-absorbed"`; the first arm reddens.
 * **Injected (arm 2), the other side:** return `[]` unconditionally → the second arm's *"two or
 * more stays `null`"* still passes but its `unreadableRows` assertion reddens, and arm 1 loses
 * its name. A one-sided test on an attribution is an attribution that will be inverted
 * (A-34 Part 4).
 */
test('I-28 (A-88 Part 2): the suspect population is `rowDatesReadable`, so the row that took the library down is NAMED', () => {
  const broken = row({ id: 'the-broken-one', startDate: 'not-a-date' as IsoDate, endDate: '2026-01-05' });
  const absorbedOnly = row({ id: 'merely-absorbed', startDate: '2026-03-01', endDate: '2026-03-10' });
  (absorbedOnly as unknown as { cities: unknown[] }).cities = [
    { key: 'c1', name: 'Vienna', countryCode: 'at', countrySource: 'stated', centre: null, firstDay: null, lastDay: null },
  ];
  // The second row really is absorbed-but-not-fatal: core names it on the SUCCESS path, which is
  // where the wide fact lives now (A-87 Part 4). If this stops holding the library is the wrong
  // library and the arm below proves nothing.
  assert.deepEqual(
    core.travelStats([absorbedOnly], TODAY).absorbed,
    [{ rowId: 'merely-absorbed', path: 'cities[0].countryCode', kind: 'field' }],
    'INCONCLUSIVE: `merely-absorbed` is not an absorbed-only row',
  );

  const result = travelHistory({ library: [broken, absorbedOnly] }, TODAY);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.rowId, 'the-broken-one', 'the named-row arm went dark for a fault one row caused');
  assert.deepEqual(result.unreadableRows, ['the-broken-one']);
});

/**
 * **QA R66-3 (MINOR) — the duplicate-id arm MISATTRIBUTES, which is worse in kind than the
 * vagueness R65-1 was about.**
 *
 * `travelStats` embeds the offending id with `JSON.stringify`, which quotes a string and does
 * **not** quote a number, a boolean, `null` or `undefined`. `DUPLICATE_ROW_ID_RE` required the
 * quotes, so all four escaped their own arm, fell through to the date filter, and the surface
 * named whichever OTHER row had an unreadable date — a row that reads perfectly and did not cause
 * the refusal. Measured at `ca9a64d`: message *"duplicate summary id 42"*, `rowId:
 * "has-a-bad-date"`.
 *
 * The regex now matches the encoded id whatever its JSON shape, and the arm answers with the id
 * only when the stored id **is** a string — `TravelHistoryResult.rowId` is `string | null` and a
 * stored `42` is not a row id anything else can look up. `unreadableRows` stays `[]`, which is
 * the same *"the refusal is not a date"* answer the string case already gives.
 *
 * Reachable only from hand-edited storage (a stored row id that is not a string, twice).
 *
 * **Injected:** put the quotes back in the regex and every non-string case below names
 * `"has-a-bad-date"`; return `JSON.parse(m[1])` unconditionally and `undefined` throws while
 * `42`/`true`/`null` break the declared type.
 */
test('I-28 (QA R66-3): a duplicate id that is not a string never names an innocent row', () => {
  const innocent = row({ id: 'has-a-bad-date', startDate: '2026-02-30' as IsoDate, endDate: '2026-03-04' });
  // The control: the innocent row really is the one the date filter would name, so a fall-through
  // is visible rather than accidentally correct.
  const control = travelHistory({ library: [row({ id: 'dup', startDate: '2026-01-01', endDate: '2026-01-05' }), row({ id: 'dup', startDate: '2026-03-01', endDate: '2026-03-10' }), innocent] }, TODAY);
  assert.equal(control.ok, false);
  if (control.ok) return;
  assert.equal(control.rowId, 'dup', 'INCONCLUSIVE: the string control does not name itself');
  assert.deepEqual(control.unreadableRows, []);

  for (const id of [42, null, true, undefined, { id: 'x' }] as unknown[]) {
    const dup = () => ({ ...row({ id: 'placeholder', startDate: '2026-01-01', endDate: '2026-01-05' }), id }) as TripSummaryRow;
    const result = travelHistory({ library: [dup(), dup(), innocent] }, TODAY);
    assert.equal(result.ok, false, `id ${String(id)}`);
    if (result.ok) return;
    assert.match(result.message, /duplicate summary id/, `id ${String(id)}: not the duplicate-id refusal`);
    assert.equal(result.rowId, null, `id ${String(id)}: the arm named a row that did not cause the refusal`);
    assert.deepEqual(result.unreadableRows, [], `id ${String(id)}: the refusal is not a date`);
  }
});

test('I-28 (A-88 Part 2): two rows that could each have caused the throw stays `null` — the rule is unchanged', () => {
  const library = [
    row({ id: 'bad-a', startDate: 'not-a-date' as IsoDate, endDate: '2026-01-05' }),
    row({ id: 'bad-b', startDate: '2026-03-01', endDate: 'also-not-a-date' as IsoDate }),
  ];
  const result = travelHistory({ library }, TODAY);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.rowId, null, '"one of these two" is not an attribution');
  assert.deepEqual(result.unreadableRows, ['bad-a', 'bad-b']);
});
