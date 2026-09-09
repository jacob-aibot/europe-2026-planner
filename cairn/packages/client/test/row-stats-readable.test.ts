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
    // Generation 8's key (§8.4 A-85 Part 3). `row()` mints a row at the CURRENT generation, so it
    // carries it and says so one field down — a fixture may be aged, but only deliberately, and
    // then by its keys as well as by its number (QA R63-3).
    placeCount: 0,
    revision: 1,
    countryCodes: ['AT' as CountryCode],
    cities: init.cities ?? [],
    attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
    summaryVersion: core.SUMMARY_VERSION,
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
  // The ten Phase-1 / Phase-2a keys and nothing else; `cities` arrives at version 2, and
  // `placeCount` at version 8 (§8.4 A-85 Part 3). **QA R63-3**: `row()` mints at the current
  // generation, so a fixture aged to version 1 has to shed every key minted since — aging it by
  // the version NUMBER alone leaves a "version-1 row" carrying a key that arrives seven
  // generations later, which is invisible to exactly the key-presence guard this fixture exists
  // to stand under.
  delete r.countryCodes;
  delete r.cities;
  delete r.attribution;
  delete r.summaryVersion;
  delete r.placeCount;
  return r as TripSummaryRow;
}

test('R44-1: a version-1 row carries no `cities` key at all, and the predicate stays TOTAL over it', () => {
  const v1 = versionOneRow({ id: 't-v1', startDate: '2019-04-01', endDate: '2019-04-09' });
  assert.equal('cities' in v1, false, 'INCONCLUSIVE: the fixture is not a version-1 row');
  assert.equal(rowStatsReadable(v1), true, 'a version-1 row is not a date suspect');
});

/**
 * **§8.4 A-87 Part 3 rule 5, ROADMAP I-26 — this arm moved, and it is the increment's one
 * behaviour change that is not a repair.** A version-1 row carries no `countryCodes` key, and at
 * `e1e1973` that was a raw `TypeError: row.countryCodes is not iterable` out of `travelStats`,
 * taking the whole library's travel history down — A-87 Part 1 shape 3, on the population this
 * fixture exists for. Absent and `null` are **values** on every gated field now, so the row
 * contributes nothing, absorbs nothing, and the library comes back `ok: true`.
 */
test('R44-1 → I-26: a version-1 row is a VALUE on every gated field — `ok: true`, nothing absorbed', () => {
  const v1 = versionOneRow({ id: 't-v1', startDate: '2019-04-01', endDate: '2019-04-09' });
  const res = travelHistory({ library: [v1] }, TODAY);
  assert.equal(res.ok, true, 'a stale-but-fine version-1 row still refuses the whole library');
  if (!res.ok) return;
  assert.deepEqual(res.stats.absorbed, [], 'a missing key is a value, not a defect (A-87 Part 3 rule 5)');
  assert.equal(rowStatsReadable(v1), true);
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

/**
 * **§8.4 A-87 Part 4, ROADMAP I-26 (QA R64-2) — the row is named on the SUCCESS path.** At
 * `e1e1973` a `cities` entry that is not an object threw a raw engine `TypeError` into
 * `travelHistory`'s catch, where `rowStatsReadable` named it; the *other* half of the same
 * population — an entry whose `name` is not a string — threw identically and `rowStatsReadable`
 * called it **readable**, so `rowId` was `null` and `unreadableRows` was `[]` and **nothing named
 * the row**. Naming stops being a property of the failure path: both are absorbed, `ok: true`,
 * and `absorbed` carries the id *and* the path.
 */
test('R44-1 → I-26: a malformed `cities` ENTRY is named without a throw, and so is a malformed `name`', () => {
  const entry = healthy();
  (entry as { cities: unknown }).cities = [null];
  assert.equal(rowStatsReadable(entry), false);
  const res = travelHistory({ library: [entry] }, TODAY);
  assert.equal(res.ok, true, 'one corrupt entry still takes the whole library down');
  if (!res.ok) return;
  assert.deepEqual(res.stats.absorbed, [{ rowId: 'ok', path: 'cities[0]', kind: 'entry' }]);

  // R64-2's second shape: readable at `e1e1973`, and nothing anywhere could name it.
  const named = healthy();
  (named.cities[0] as { name: unknown }).name = 42;
  assert.equal(rowStatsReadable(named), false, 'R64-2: `rowStatsReadable` called a garbage row healthy');
  const second = travelHistory({ library: [named] }, TODAY);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.deepEqual(second.stats.absorbed, [{ rowId: 'ok', path: 'cities[0].name', kind: 'field' }]);
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

// ---------------------------------------------------------------------------
// **ROADMAP I-25 Part 1 — §8.4 A-86 Part 4 item 2 (QA R63-9): the two predicates over one fact
// agree BY CONSTRUCTION, and that is asserted rather than written in a comment.**
//
// `rowStatsReadable` draws a three-way line over a stored `cities`: `undefined`/`null` are
// readable (a row minted before generation 3 carries no such key), an array is walked, and
// anything else present is unreadable. `core.travelStats`' `unreadableCityLists` counts exactly
// the third case. Two predicates over one fact that agree only in prose is how R28-5 happened,
// so the table below is the pin.
// ---------------------------------------------------------------------------

/** A-86 Part 4's own eight values, in its own order. */
const STORED_CITIES: Array<[label: string, value: unknown]> = [
  ['undefined', undefined],
  ['null', null],
  ['[]', []],
  ['a well-formed array', [city('Vienna', '2026-03-02', '2026-03-05')]],
  ["'nope'", 'nope'],
  ['{}', {}],
  ['0', 0],
  ['NaN', NaN],
];

test('I-25 Part 1 (A-86 Part 4 item 2): `unreadableCityLists` increments on exactly the values `rowStatsReadable` calls unreadable', () => {
  // **TRAVELLED rows — QA R64-3.** Every fixture below starts in 2026-03 against a
  // `TODAY` of 2026-06-15, so every one of them is `completed` and therefore inside the walk
  // that accumulates the count. That is the population the pin holds over, and the arm below
  // states what happens outside it rather than leaving it uncovered.
  for (const [label, value] of STORED_CITIES) {
    // The DATES are held readable deliberately: `rowStatsReadable` answers two questions and
    // this assertion is about one of them. A row with a bad `startDate` would be `false` for a
    // reason `unreadableCityLists` is not about — and would throw before the walk reached it.
    const r = { ...row({ id: `t-${label}`, startDate: '2026-03-01', endDate: '2026-03-20' }), cities: value } as unknown as TripSummaryRow;
    assert.equal(rowDatesReadable(r), true, `${label}: the fixture's own dates are not readable`);
    const readable = rowStatsReadable(r);
    const counted = core.travelStats([r], TODAY).unreadableCityLists;
    assert.equal(counted, readable ? 0 : 1,
      `cities = ${label}: rowStatsReadable says ${readable}, core counted ${counted} — the two ` +
        'predicates over one fact have drifted (A-86 Part 4 item 2)');
  }
});

test('I-25 Part 1: the corrupt row is now sayable end to end — `ok: true`, and the count names how many', () => {
  // The exact shape R63-9 measured: since `I-24` Part 4's guard, `travelHistory` returns
  // `ok: true` with no banner and no named row, so `rowStatsReadable` — which does know — is
  // never asked. The guard is not reopened; the census now carries the fact instead.
  const good = healthy();
  const corrupt = { ...healthy(), id: 't-corrupt', cities: 'AT,HR,CZ' } as unknown as TripSummaryRow;
  assert.equal(rowStatsReadable(corrupt), false, 'the client predicate stopped naming it');
  const res = travelHistory({ library: [good, corrupt] }, TODAY);
  assert.equal(res.ok, true, 'the guard was reverted — one corrupt row took the library down again');
  if (!res.ok) return;
  assert.equal(res.stats.unreadableCityLists, 1, 'the absorption is still silent — R63-9 exactly');
});

/**
 * **§8.4 A-87 Part 5 (QA R64-3 §C2/§C3), ROADMAP I-26 — this arm's ANSWER changed, and the
 * change is the architect's.** It used to record a measured disagreement: `unreadableCityLists`
 * was accumulated inside the travelled walk on A-31 Part 3's authority, so a corrupt **planned**
 * row was `rowStatsReadable === false` and counted **0**.
 *
 * A-31 Part 3 governs the **lifetime map** and its argument is about *inflation*; an absorption is
 * not inflatable by planning. A corrupt planned row is corrupt today, its repair is available
 * today, and it will be travelled later carrying the same corruption — and the shipped
 * alternative is the exact non-uniformity `travelStats.ts`' own `attribution` comment condemns
 * about QA R28-3. **`unnamedCities` is the control**: it stays travelled-only, because it counts
 * what the census lost rather than what the storage cannot say.
 */
test('I-26 (A-87 Part 5): absorption is lifecycle-blind — a corrupt PLANNED row is `false` and counts 1', () => {
  const planned = { ...row({ id: 't-planned', startDate: '2027-03-01', endDate: '2027-03-20' }), cities: 'nope' } as unknown as TripSummaryRow;
  assert.equal(rowLifecycle(planned, TODAY), 'planned', 'the fixture is not planned, so it proves nothing');
  assert.equal(rowStatsReadable(planned), false, '`rowStatsReadable` has no lifecycle and never had one');
  assert.equal(core.travelStats([planned], TODAY).unreadableCityLists, 1, 'QA R64-3 §C2');
  const travelled = { ...planned, id: 't-travelled', startDate: '2019-04-01', endDate: '2019-04-09' } as unknown as TripSummaryRow;
  assert.equal(core.travelStats([travelled], TODAY).unreadableCityLists, 1);
  // A library holding one of each counts BOTH — R64-3 §C3, which measured 1.
  const both = core.travelStats([planned, travelled], TODAY);
  assert.equal(both.unreadableCityLists, 2);
  assert.deepEqual(both.absorbed.map((x) => x.rowId).sort(), ['t-planned', 't-travelled']);
  // …and the census half of the same library is untouched: a planned row contributes no city.
  assert.equal(both.seen.cities, 0);
  assert.equal(both.unnamedCities, 0);
});

// ---------------------------------------------------------------------------
// **ROADMAP I-26 Part 3 — §8.4 A-87 Part 6: the predicate and the counter are ONE
// implementation, so the pin above is an IDENTITY rather than an assertion.**
//
// `rowStatsReadable`'s body is now `core.travelStats([row], row.startDate).absorbed.length === 0`
// behind the existing `rowDatesReadable` guard. A-59 Part 7 residue 1 asked whether the predicate
// should become `rowUsable`; the answer is **no rename, no sibling** — the second implementation
// it has always been is *deleted* rather than widened, which is what sequencing rule 1 requires.
//
// **N5, injected:** re-inline the three-way `cities` split in `packages/client` and the assertion
// that must redden is this identity, not a fixture table.
// ---------------------------------------------------------------------------

/** The six shapes A-87 Part 6 widens the predicate to — every one of them `true` at `e1e1973`. */
const WIDENED: Array<[label: string, patch: (r: TripSummaryRow) => void]> = [
  ['countryCodes: 42', (r) => { (r as { countryCodes: unknown }).countryCodes = 42; }],
  ["countryCodes: 'AT'", (r) => { (r as { countryCodes: unknown }).countryCodes = 'AT'; }],
  ['attribution: 42', (r) => { (r as { attribution: unknown }).attribution = 42; }],
  ['cities[0].name: 42', (r) => { (r.cities[0] as { name: unknown }).name = 42; }],
  ["cities[0].countryCode: 'hr'", (r) => { (r.cities[0] as { countryCode: unknown }).countryCode = 'hr'; }],
  ['cities[0].centre: "x"', (r) => { (r.cities[0] as { centre: unknown }).centre = 'x'; }],
];

test('I-26 Part 3 (A-87 Part 6): `rowStatsReadable` is FALSE iff `travelStats` absorbed something — an identity', () => {
  const rows: Array<[string, TripSummaryRow]> = [];
  for (const [label, value] of STORED_CITIES) {
    const r = { ...row({ id: `id-${label}`, startDate: '2026-03-01', endDate: '2026-03-20' }), cities: value } as unknown as TripSummaryRow;
    rows.push([`cities = ${label}`, r]);
  }
  for (const [label, patch] of WIDENED) {
    const r = healthy();
    (r as { id: string }).id = `id-${label}`;
    patch(r);
    rows.push([label, r]);
  }
  for (const [label, r] of rows) {
    // The DATES are held readable deliberately: the predicate answers two questions and this
    // assertion is about one of them.
    assert.equal(rowDatesReadable(r), true, `${label}: the fixture's own dates are not readable`);
    const readable = rowStatsReadable(r);
    const absorbed = core.travelStats([r], r.startDate).absorbed;
    assert.equal(readable, absorbed.length === 0,
      `${label}: rowStatsReadable says ${readable}, core absorbed ${JSON.stringify(absorbed)} — the ` +
        'predicate has grown a second implementation again (A-87 Part 6)');
  }
});

test('I-26 Part 3 (A-87 Part 6): the six widened shapes were all `true` at `e1e1973` and are `false` now', () => {
  for (const [label, patch] of WIDENED) {
    const r = healthy();
    patch(r);
    assert.equal(rowStatsReadable(r), false, `${label}: still called healthy`);
  }
  // …and the three A-87 Part 6 names as still TRUE stay true: absent/`null` containers, and a
  // hostile value in a field no derivation reads.
  for (const [label, patch] of [
    ['cities: null', (r: TripSummaryRow) => { (r as { cities: unknown }).cities = null; }],
    ['countryCodes: null', (r: TripSummaryRow) => { (r as { countryCodes: unknown }).countryCodes = null; }],
    ['attribution: null', (r: TripSummaryRow) => { (r as { attribution: unknown }).attribution = null; }],
    // `as Record<string, unknown>` rather than `as { key: … }`: `cityKey.test.ts`' A-10 ship gate
    // greps for a `cities:` init that also assigns a `key`, and an inline type annotation naming
    // that field trips it. Nothing here mints a `CityKey`.
    ['a hostile `cities[0].key` — nothing reads it', (r: TripSummaryRow) => { (r.cities[0] as unknown as Record<string, unknown>).key = 42; }],
    ['a hostile `cities[0].countrySource` — nothing reads it', (r: TripSummaryRow) => { (r.cities[0] as { countrySource: unknown }).countrySource = 42; }],
  ] as Array<[string, (r: TripSummaryRow) => void]>) {
    const r = healthy();
    patch(r);
    assert.equal(rowStatsReadable(r), true, `${label}: a value or an unread field was called a defect`);
  }
});

test('I-26 Part 3: `rowStatsReadable` is still TOTAL — a row whose own dates are garbage is `false`, not a throw', () => {
  const bad = { ...healthy(), startDate: 'nope' } as unknown as TripSummaryRow;
  assert.equal(rowStatsReadable(bad), false);
  assert.equal(rowDatesReadable(bad), false, 'the guard above the call is what answers, not the catch');
});

test('I-26 (A-87 Part 4): `travelHistory` returns `ok: true` for all five measured shapes', () => {
  const cityish = { key: 'c1', name: 'Vienna', countryCode: 'AT', countrySource: 'stated', centre: null, firstDay: null, lastDay: null };
  const shapes: Array<[string, Record<string, unknown>, string]> = [
    ["cities: ['Vienna']", { cities: ['Vienna'] }, 'cities[0]'],
    ['cities: [null]', { cities: [null] }, 'cities[0]'],
    ['cities: [{…, name: 42}]', { cities: [{ ...cityish, name: 42 }] }, 'cities[0].name'],
    ['countryCodes: 42', { countryCodes: 42 }, 'countryCodes'],
    ['attribution: {places: {}}', { attribution: { places: {} } }, 'attribution.places'],
  ];
  for (const [label, patch, path] of shapes) {
    const r = { ...healthy(), ...patch } as unknown as TripSummaryRow;
    const res = travelHistory({ library: [r] }, TODAY);
    assert.equal(res.ok, true, `${label}: took the whole library's travel history down`);
    if (!res.ok) continue;
    assert.deepEqual(res.stats.absorbed.map((x) => [x.rowId, x.path]), [['ok', path]], label);
  }
});
