/**
 * `rowStatsReadable` — ARCHITECTURE §8.4 **A-59** Part 4, ROADMAP Phase 2 **I-12a**.
 *
 * A-46 and A-47 built three facts a surface can know about a stored `TripSummaryRow`, and QA
 * **R43-2** measured that **all three call a row with a corrupt `cities[].firstDay` healthy**:
 *
 *   F-B  the row's dates are not `YYYY-MM-DD`-shaped — `rowLifecycle(row, today) === null`;
 *   F-C  the row's dates are shape-valid but not real dates — `rowDatesReadable(row) === false`;
 *   F-D  a real open attempt failed — `state.openFailures`.
 *
 * F-B and F-C read **two** fields. A-56 put `2N` more on the row and nothing extended the gate
 * to them, so `travelHistory` refused the whole library over a Trips list of perfect-looking
 * cards with nothing anywhere naming the culprit — the anonymous failure the whole A-44 → A-46
 * → A-47 lineage exists to prevent, arriving through the one field nobody extended it to.
 *
 * `rowStatsReadable` is **F-E, a fifth fact**, and the count is the point: `2 + 2N` grows with
 * the row, so it is asked in ONE place and no surface re-derives it. It is deliberately **not**
 * folded into either of the two predicates beside it — A-59 Part 4 states both refusals and
 * this file asserts the ceiling they imply.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { core, rowDatesReadable, rowLifecycle, rowStatsReadable, rowUnopenable, travelHistory } from '../src/index.ts';
import type { CityKey, CountryCode, IsoDate, TripSummaryCity, TripSummaryRow } from '../src/deps.ts';

const TODAY: IsoDate = '2026-06-15';

let seq = 0;
function city(name: string, first: IsoDate | null = null, last: IsoDate | null = null): TripSummaryCity {
  return {
    key: `city-${++seq}` as CityKey,
    name,
    countryCode: 'AT' as CountryCode,
    countrySource: 'coordinate',
    centre: { lat: 0, lng: 0 },
    firstDay: first,
    lastDay: last,
  };
}

function row(init: { id: string; startDate: string; endDate: string; cities?: TripSummaryCity[] }): TripSummaryRow {
  return {
    id: init.id,
    title: init.id,
    startDate: init.startDate as IsoDate,
    endDate: init.endDate as IsoDate,
    datePrecision: 'exact',
    cityCount: (init.cities ?? []).length,
    dayCount: 0,
    stopCount: 0,
    poolCount: 0,
    revision: 1,
    countryCodes: ['AT' as CountryCode],
    cities: init.cities ?? [],
    attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
    summaryVersion: 5,
  };
}

/** Three cities with real dates, so the healthy row has `2 + 2·3 = 8` fields to read. */
const healthy = () =>
  row({
    id: 'ok',
    startDate: '2026-03-01',
    endDate: '2026-03-20',
    cities: [
      city('Vienna', '2026-03-02' as IsoDate, '2026-03-05' as IsoDate),
      city('Salzburg', '2026-03-08' as IsoDate, '2026-03-11' as IsoDate),
      city('Graz', '2026-03-14' as IsoDate, '2026-03-18' as IsoDate),
    ],
  });

test('A-59 Part 4: a row whose 2 + 2N date fields are all real calendar dates is readable', () => {
  assert.equal(rowStatsReadable(healthy()), true);
});

test('A-59 Part 4: each of the 2 + 2N fields matters — four separate corruptions, not one', () => {
  const corrupt: Array<[string, (r: TripSummaryRow) => void]> = [
    ['startDate', (r) => { (r as { startDate: unknown }).startDate = 'not-a-date'; }],
    ['endDate', (r) => { (r as { endDate: unknown }).endDate = '2026-3-1'; }],
    ['cities[1].firstDay', (r) => { (r.cities[1] as { firstDay: unknown }).firstDay = 'not-a-date'; }],
    ['cities[2].lastDay', (r) => { (r.cities[2] as { lastDay: unknown }).lastDay = 42; }],
  ];
  for (const [label, mutate] of corrupt) {
    const r = healthy();
    mutate(r);
    assert.equal(rowStatsReadable(r), false, `${label} did not make the row unreadable`);
  }
});

test('A-59 Part 4: `null` and an ABSENT key are values, not defects — the row stays readable', () => {
  const withNulls = row({ id: 'n', startDate: '2019-03-01', endDate: '2019-03-31', cities: [city('Kyoto')] });
  assert.equal(rowStatsReadable(withNulls), true, 'a city with no days was called unreadable');
  const gen4 = row({ id: 'g', startDate: '2020-02-01', endDate: '2020-02-09', cities: [city('Madrid')] });
  delete (gen4.cities[0] as Partial<TripSummaryCity>).firstDay;
  delete (gen4.cities[0] as Partial<TripSummaryCity>).lastDay;
  assert.equal(rowStatsReadable(gen4), true, 'a version-4 row carrying neither key was called unreadable');
  const noCities = row({ id: 'e', startDate: '2020-02-01', endDate: '2020-02-09' });
  assert.equal(rowStatsReadable(noCities), true);
});

/**
 * QA **R44-1**. `rowStatsReadable` shipped documented *"pure, total, never throws"* and walked
 * `row.cities` unguarded. A **version-1** row carries no `cities` key at all — that is the shape
 * `SUMMARY_VERSION`'s own ledger defines, the shape `qa/i7a-idb-rowkeys.mjs`'s `ROW_GEN1` fixture
 * holds, and the shape a browser mid-rescan legitimately hands `travelHistory`. Walking it threw a
 * `TypeError` **from inside `travelHistory`'s `catch`**, so the one boundary A-37 Part 2 mandates
 * propagated the throw it exists to absorb.
 *
 * `true` is the honest answer for a row carrying no cities: the question is *"does every
 * date-shaped field THIS ROW carries read as an `IsoDate`"*, and it carries none. `false` would
 * name a stale-but-fine version-1 row as a date suspect under a sentence about corruption.
 */
function versionOneRow(init: { id: string; startDate: string; endDate: string }): TripSummaryRow {
  const r = row(init) as Partial<TripSummaryRow>;
  // The ten Phase-1 / Phase-2a keys and nothing else; `cities` arrives at version 2.
  delete r.countryCodes;
  delete r.cities;
  delete r.attribution;
  delete r.summaryVersion;
  return r as TripSummaryRow;
}

test('R44-1: a version-1 row carries no `cities` key at all, and the predicate stays TOTAL over it', () => {
  const v1 = versionOneRow({ id: 't-v1', startDate: '2019-04-01', endDate: '2019-04-09' });
  assert.equal('cities' in v1, false, 'INCONCLUSIVE: the fixture is not a version-1 row');
  assert.equal(rowStatsReadable(v1), true, 'a version-1 row is not a date suspect');
});

test('R44-1: a version-1 row does not take `travelHistory`\'s refusal boundary down with it', () => {
  const v1 = versionOneRow({ id: 't-v1', startDate: '2019-04-01', endDate: '2019-04-09' });
  const res = travelHistory({ library: [v1] }, TODAY);
  assert.equal(res.ok, false, 'INCONCLUSIVE: `travelStats` no longer refuses a version-1 row');
  if (res.ok) return;
  assert.equal(res.rowId, null, 'a version-1 row was named as a date suspect');
  assert.deepEqual(res.unreadableRows, []);
});

test('R44-1: a `cities` that is not a list is a defect, not a walkable value', () => {
  // A string is iterable, so the unguarded loop ran over its characters, every `c.firstDay` read
  // `undefined`, and a garbage row came back READABLE — the same missing guard, silently.
  const strung = healthy();
  (strung as { cities: unknown }).cities = 'nope';
  assert.equal(rowStatsReadable(strung), false);

  const nulled = healthy();
  (nulled as { cities: unknown }).cities = null;
  assert.equal(rowStatsReadable(nulled), true, 'absent and null both mean "no cities recorded"');
});

test('R44-1: a malformed `cities` ENTRY is named rather than thrown over', () => {
  const r = healthy();
  (r as { cities: unknown }).cities = [null];
  assert.equal(rowStatsReadable(r), false);
  const res = travelHistory({ library: [r] }, TODAY);
  assert.equal(res.ok, false, 'INCONCLUSIVE: `travelStats` no longer refuses a null city entry');
  if (res.ok) return;
  assert.equal(res.rowId, 'ok', 'the single suspect row was not named');
});

test('A-59 residue 2: the predicate is `core.isIsoDate`, so a CALENDAR-invalid city date fails it', () => {
  // Stricter than the throw it replaces, deliberately — `2026-02-30` would have normalised to
  // `2026-03-02`, a date nobody typed. The same choice A-46 Part 2 made for the trip's own two.
  const r = healthy();
  (r.cities[0] as { firstDay: unknown }).firstDay = '2026-02-30';
  assert.equal(rowStatsReadable(r), false);
  assert.equal(core.isIsoDate('2026-02-30'), false, 'INCONCLUSIVE: isIsoDate accepts 2026-02-30');
});

test('A-59 Part 4: `rowDatesReadable` and `rowUnopenable` did NOT move — this is the ceiling on the fix', () => {
  // A row with good trip dates and a bad `cities[1].firstDay` has a **perfectly good range**.
  // Printing it raw would be R34-4 re-created (A-47 Part 4's meta-line split), and flagging the
  // document would hand the user a healthy trip under a `.cairn-unreadable.json` filename that
  // lies about it. F-E is a fifth fact, not a fourth instance of F-A…F-D.
  const r = healthy();
  (r.cities[1] as { firstDay: unknown }).firstDay = 'not-a-date';
  assert.equal(rowStatsReadable(r), false, 'INCONCLUSIVE: the new predicate did not fire');
  assert.equal(rowDatesReadable(r), true, '`rowStatsReadable` was folded into `rowDatesReadable`');
  assert.equal(rowLifecycle(r, TODAY), 'completed', 'A-44 moved');
  assert.equal(
    rowUnopenable({ rescan: { running: false, unreadable: [] }, openFailures: [] }, r),
    false,
    '`rowStatsReadable` was folded into `rowUnopenable` — the rescue export now covers a healthy document',
  );
});

/**
 * `travelHistory`'s refusal gains the attribution it has been unable to make — A-59 Part 4.
 *
 * `rowId` gains a **second populated case** and no surface changes: `WorldMap.tsx`'s
 * already-shipped named-row arm simply becomes reachable by a second fault, which is precisely
 * what A-46 Part 5 said should happen the moment `travelStats`' refusal set changed.
 */
test('A-59 Part 4: one shape-invalid row in a two-row library is named by `unreadableRows` and `rowId`', () => {
  const bad = row({ id: 't-bad', startDate: 'not-a-date', endDate: '2026-03-20' });
  const good = row({ id: 't-good', startDate: '2019-04-01', endDate: '2019-04-09' });
  const res = travelHistory({ library: [bad, good] }, TODAY);
  assert.equal(res.ok, false);
  if (res.ok) return;
  assert.match(res.message, /invalid IsoDate/);
  assert.deepEqual(res.unreadableRows, ['t-bad']);
  assert.equal(res.rowId, 't-bad');
});

test('A-59 Part 4: TWO bad rows are both named, in library order, and `rowId` stays null', () => {
  // *"One of these two"* is not an attribution, and the surface's copy names one row.
  const a = row({ id: 't-a', startDate: 'not-a-date', endDate: '2026-03-20' });
  const b = row({ id: 't-b', startDate: '2019-04-01', endDate: 'also-not-a-date' });
  const res = travelHistory({ library: [a, b] }, TODAY);
  assert.equal(res.ok, false);
  if (res.ok) return;
  assert.deepEqual(res.unreadableRows, ['t-a', 't-b']);
  assert.equal(res.rowId, null);
});

test('A-59 Part 4: the duplicate-id case still wins `rowId`, and `unreadableRows` is honestly empty', () => {
  const dup = () => row({ id: 'dup-1', startDate: '2026-01-01', endDate: '2026-01-05' });
  const res = travelHistory({ library: [dup(), dup()] }, TODAY);
  assert.equal(res.ok, false);
  if (res.ok) return;
  assert.match(res.message, /duplicate summary id "dup-1"/);
  assert.equal(res.rowId, 'dup-1');
  assert.deepEqual(res.unreadableRows, [], 'the refusal is not a date, and `[]` is the honest answer');
});

test('A-59 Part 2 + Part 4: a corrupt CITY date no longer refuses the library at all', () => {
  // The end-to-end shape R43-2 measured: `ok: false` over a Trips list of healthy cards.
  const rot = healthy();
  (rot.cities[0] as { firstDay: unknown }).firstDay = 'not-a-date';
  const other = row({ id: 't-other', startDate: '2019-04-01', endDate: '2019-04-09' });
  const res = travelHistory({ library: [rot, other] }, TODAY);
  assert.equal(res.ok, true, 'one corrupt city date still takes the whole library down');
  if (!res.ok) return;
  assert.equal(res.stats.unreadableCityDates, 1, 'the absorption was not counted');
  const vienna = res.stats.cities.find((c) => c.name === 'Vienna');
  assert.ok(vienna, 'the city was dropped rather than degraded');
  assert.deepEqual([vienna.firstVisit, vienna.lastVisit], ['2026-03-01', '2026-03-20'],
    'the fallback is the trip\'s own range');
});

test('A-59 Part 4: `unreadableRows` is computed only on the failure branch', () => {
  const res = travelHistory({ library: [healthy()] }, TODAY);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal('unreadableRows' in res, false, 'the success branch grew a field it does not have');
});
