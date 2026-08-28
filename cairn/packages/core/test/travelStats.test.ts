/**
 * `travelStats` — ARCHITECTURE §8.4 clause 2 and **A-31**, ROADMAP Phase 2 **I-7**.
 *
 * Every statistic is derived and nothing counts anything into storage. The function is handed
 * the library's summary rows and an injected `today`, and it derives the lifetime map from the
 * **travelled** rows only: a `planned` trip contributes no country, no city and no day, and an
 * `active` trip's days and `lastVisit` are clamped at `today`. A map of everywhere you have
 * been may not include a trip you have booked.
 *
 * The rows here are hand-built, because the multi-trip cases are the whole subject and there is
 * exactly one real trip. The single real-trip row is exercised too, against a golden produced by
 * a *different* program (`gen-golden.mjs` walks the document; `tripSummary` walks it again).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { europe2026, golden } from './fixture.ts';
import { COUNTRY_INDEX, tripSummary, travelStats } from '../src/index.ts';
import type { CityKey, CountryCode, IsoDate, TripSummaryCity, TripSummaryRow } from '../src/index.ts';
// §2.10's "tests do not create surface": `normalizeCityName` is deliberately off `index.ts`
// (§2.14 A-14) and a test that checks the folding is exactly the case that exemption is for.
import { normalizeCityName } from '../src/model/cityName.ts';

const TODAY: IsoDate = '2026-06-15';

let seq = 0;
function city(name: string, countryCode: CountryCode | null): TripSummaryCity {
  return {
    key: `city-${++seq}` as CityKey,
    name,
    countryCode,
    countrySource: countryCode === null ? null : 'coordinate',
  };
}

/** A row with every field present, so nothing under test is reading an `undefined`. */
function row(init: {
  id: string;
  startDate: IsoDate;
  endDate: IsoDate;
  countryCodes?: CountryCode[];
  cities?: TripSummaryCity[];
  places?: { located: number; attributed: number };
  stops?: { located: number; attributed: number };
}): TripSummaryRow {
  return {
    id: init.id,
    title: init.id,
    startDate: init.startDate,
    endDate: init.endDate,
    datePrecision: 'exact',
    cityCount: (init.cities ?? []).length,
    dayCount: 0,
    stopCount: 0,
    poolCount: 0,
    revision: 1,
    countryCodes: init.countryCodes ?? [],
    cities: init.cities ?? [],
    attribution: {
      places: init.places ?? { located: 0, attributed: 0 },
      stops: init.stops ?? { located: 0, attributed: 0 },
    },
    summaryVersion: 4,
  };
}

// ---------------------------------------------------------------- the empty case

test('I-7: an empty library gives zeroes and empty arrays, never a throw', () => {
  const s = travelStats([], TODAY);
  assert.deepEqual(s.countries, []);
  assert.deepEqual(s.cities, []);
  assert.deepEqual(s.trips, { planned: 0, active: 0, completed: 0 });
  assert.equal(s.daysTravelled, 0);
  assert.deepEqual(s.located, { cities: 0, places: 0, stops: 0 });
  assert.deepEqual(s.unattributed, { cities: 0, places: 0, stops: 0 });
  assert.equal(s.unnamedCities, 0);
});

// ---------------------------------------------------------------- the population rule

/**
 * A-31 Part 3 — **the half clause 2 left open, and every field depends on it.**
 *
 * Injected fault: include planned trips and `JP` appears in `countries`; drop the `today` clamp
 * and `daysTravelled` jumps from the active trip's elapsed span to its whole span.
 */
test('I-7: a planned trip counts as planned and contributes NOTHING else', () => {
  const past = row({
    id: 'past', startDate: '2026-01-01', endDate: '2026-01-05',
    countryCodes: ['HR' as CountryCode], cities: [city('Split', 'HR' as CountryCode)],
  });
  const now = row({
    // Starts 4 days before `today` and ends 9 days after it: `active`, and clamped.
    id: 'now', startDate: '2026-06-11', endDate: '2026-06-24',
    countryCodes: ['AT' as CountryCode], cities: [city('Vienna', 'AT' as CountryCode)],
  });
  const soon = row({
    id: 'soon', startDate: '2026-09-01', endDate: '2026-09-14',
    countryCodes: ['JP' as CountryCode], cities: [city('Tokyo', 'JP' as CountryCode)],
    places: { located: 9, attributed: 9 }, stops: { located: 20, attributed: 20 },
  });
  const s = travelStats([past, now, soon], TODAY);

  assert.deepEqual(s.trips, { planned: 1, active: 1, completed: 1 });
  assert.deepEqual(s.countries.map((c) => c.code), ['AT', 'HR'], 'a planned country reached the map');
  assert.deepEqual(s.cities.map((c) => c.name), ['Split', 'Vienna']);
  // 5 days of `past` (Jan 1–5) + 5 days of `now` (Jun 11–15 inclusive, clamped at today).
  assert.equal(s.daysTravelled, 10);
  // …and the planned trip's own census is invisible too.
  assert.deepEqual(s.located, { cities: 2, places: 0, stops: 0 });
});

test('I-7: an active trip contributes days to `today` INCLUSIVE and its lastVisit is `today`', () => {
  const now = row({
    id: 'now', startDate: '2026-06-11', endDate: '2026-06-24',
    countryCodes: ['AT' as CountryCode],
  });
  const s = travelStats([now], TODAY);
  assert.equal(s.daysTravelled, 5, 'Jun 11, 12, 13, 14, 15 — inclusive of both ends');
  assert.equal(s.countries[0].firstVisit, '2026-06-11');
  assert.equal(s.countries[0].lastVisit, TODAY, 'lastVisit ran past today into the future');
});

test('I-7: a completed trip reports its own end date, unclamped', () => {
  const s = travelStats(
    [row({ id: 'past', startDate: '2026-01-01', endDate: '2026-01-05', countryCodes: ['HR' as CountryCode] })],
    TODAY,
  );
  assert.equal(s.countries[0].firstVisit, '2026-01-01');
  assert.equal(s.countries[0].lastVisit, '2026-01-05');
  assert.equal(s.daysTravelled, 5);
});

// ---------------------------------------------------------------- countries

test('I-7: a country spanning two trips takes the earliest start and the latest end', () => {
  const a = row({ id: 'a', startDate: '2024-05-01', endDate: '2024-05-10', countryCodes: ['HR' as CountryCode] });
  const b = row({ id: 'b', startDate: '2025-09-01', endDate: '2025-09-04', countryCodes: ['HR' as CountryCode, 'AT' as CountryCode] });
  const s = travelStats([b, a], TODAY);
  assert.deepEqual(s.countries.map((c) => c.code), ['AT', 'HR'], 'countries are not sorted by code');
  const hr = s.countries.find((c) => c.code === 'HR');
  assert.equal(hr?.firstVisit, '2024-05-01');
  assert.equal(hr?.lastVisit, '2025-09-04');
  assert.deepEqual(hr?.tripIds, ['a', 'b'], 'tripIds is not in canonical row order');
});

// ---------------------------------------------------------------- cities

/**
 * ROADMAP I-7, **grouping, both directions** — a ceiling and a floor in one test.
 *
 * Injected fault: group on `nameKey` alone and the two Springfields collapse to one row; group
 * on `CityKey` (which is opaque and per-trip, §2.2 A-10) and the two Tokyos become two.
 */
test('I-7: two trips to the same city in the same country are ONE row with both trip ids', () => {
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-05', cities: [city('  TOKYO  ', 'JP' as CountryCode)] });
  const b = row({ id: 'b', startDate: '2025-04-01', endDate: '2025-04-05', cities: [city('Tokyo', 'JP' as CountryCode)] });
  const s = travelStats([a, b], TODAY);
  assert.equal(s.cities.length, 1, 'two spellings of one city did not join');
  assert.equal(s.cities[0].nameKey, normalizeCityName('Tokyo'));
  assert.equal(s.cities[0].name, '  TOKYO  ', 'the display name is the FIRST member in canonical order');
  assert.deepEqual(s.cities[0].tripIds, ['a', 'b']);
});

test('I-7: the same name in two countries is TWO rows — the country is part of the key', () => {
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-02', cities: [city('Springfield', 'US' as CountryCode)] });
  const b = row({ id: 'b', startDate: '2024-06-01', endDate: '2024-06-02', cities: [city('Springfield', 'CA' as CountryCode)] });
  const s = travelStats([a, b], TODAY);
  assert.equal(s.cities.length, 2, 'two Springfields collapsed into one row');
  assert.deepEqual(s.cities.map((c) => c.countryCode), ['CA', 'US'], 'cities are not sorted by countryCode within a nameKey');
  assert.deepEqual(s.cities.map((c) => c.tripIds), [['b'], ['a']]);
});

test('I-7: an unattributed city sorts after the attributed one of the same name (null last)', () => {
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-02', cities: [city('Tokyo', null)] });
  const b = row({ id: 'b', startDate: '2024-06-01', endDate: '2024-06-02', cities: [city('Tokyo', 'JP' as CountryCode)] });
  const s = travelStats([a, b], TODAY);
  assert.deepEqual(s.cities.map((c) => c.countryCode), ['JP', null]);
});

test('I-7: a name that folds to \'\' is ZERO rows and one unnamedCities — never a blank row', () => {
  // §2.14 A-14 assertion 5: a name folding to `''` is **not an identity**. Grouping on it would
  // put every blank city in every trip into one row labelled with nothing; skipping it without
  // counting would be silent loss, which is why the count is a field.
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-02', cities: [city('   ', 'JP' as CountryCode)] });
  const s = travelStats([a], TODAY);
  assert.deepEqual(s.cities, []);
  assert.equal(s.unnamedCities, 1);
  assert.equal(s.located.cities, 1, 'a blank city still had a coordinate, so it was still located');
});

test('I-7: one trip holding two cities that fold to the same key adds its id ONCE', () => {
  const a = row({
    id: 'a', startDate: '2024-04-01', endDate: '2024-04-02',
    cities: [city('Tokyo', 'JP' as CountryCode), city('tokyo', 'JP' as CountryCode)],
  });
  const s = travelStats([a], TODAY);
  assert.equal(s.cities.length, 1);
  assert.deepEqual(s.cities[0].tripIds, ['a'], 'one trip appeared twice in a city row');
  assert.equal(s.located.cities, 2, 'the census counts records, not groups');
});

// ---------------------------------------------------------------- the censuses

/**
 * ROADMAP I-7, **"no places yet" is a different answer from "0 countries"**.
 *
 * Injected fault: derive `located` from `countries.length === 0 ? 0 : …` and the first trip
 * reports the second trip's answer.
 */
test('I-7: a trip with one city and nothing else is NOT the same as a trip with nothing', () => {
  const oneCity = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-02', cities: [city('Nowhere', null)] });
  const nothing = row({ id: 'b', startDate: '2024-04-01', endDate: '2024-04-02' });
  assert.deepEqual(travelStats([oneCity], TODAY).located, { cities: 1, places: 0, stops: 0 });
  assert.deepEqual(travelStats([nothing], TODAY).located, { cities: 0, places: 0, stops: 0 });
  // The sentence I-8 is built against, stated here so it is not a judgment call there.
  const noPlacesYet = (s: { located: { cities: number; places: number; stops: number } }) =>
    s.located.cities + s.located.places + s.located.stops === 0;
  assert.equal(noPlacesYet(travelStats([oneCity], TODAY)), false);
  assert.equal(noPlacesYet(travelStats([nothing], TODAY)), true);
  assert.equal(travelStats([oneCity], TODAY).countries.length, 0, 'both trips report 0 countries — that is the point');
});

/** ROADMAP I-7, **the honest hole is a count, not a silence**. */
test('I-7: an unattributed city is counted in BOTH located and unattributed', () => {
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-02', cities: [city('Hvar Town', null)] });
  const s = travelStats([a], TODAY);
  assert.equal(s.located.cities, 1);
  assert.equal(s.unattributed.cities, 1, 'the hole became invisible');
  assert.deepEqual(s.countries, []);
});

test('I-7: the place and stop censuses are the row\'s own, summed over travelled trips only', () => {
  const a = row({
    id: 'a', startDate: '2024-04-01', endDate: '2024-04-02',
    places: { located: 10, attributed: 7 }, stops: { located: 30, attributed: 28 },
  });
  const b = row({
    id: 'b', startDate: '2024-06-01', endDate: '2024-06-02',
    places: { located: 4, attributed: 4 }, stops: { located: 5, attributed: 1 },
  });
  const planned = row({
    id: 'z', startDate: '2027-01-01', endDate: '2027-01-02',
    places: { located: 99, attributed: 99 }, stops: { located: 99, attributed: 99 },
  });
  const s = travelStats([a, b, planned], TODAY);
  assert.deepEqual(s.located, { cities: 0, places: 14, stops: 35 });
  assert.deepEqual(s.unattributed, { cities: 0, places: 3, stops: 6 });
});

/**
 * QA **R28-4**, §8.4 A-31 Part 2's clamp. `attributed <= located` is an invariant of the *mint*
 * — `tripSummary` increments both in one walk and guards the second by the first — but
 * `travelStats` is handed rows out of **storage**, and a row that arrives with
 * `attributed > located` (hand-edited, half-migrated) made `unattributed` **negative**, which is
 * a number no surface can render honestly. The read clamps at zero. Not a throw: the row came
 * from storage, not from a caller.
 */
test('R28-4: an impossible census clamps at zero and never goes negative', () => {
  const bad = row({
    id: 'bad', startDate: '2024-04-01', endDate: '2024-04-02',
    places: { located: 1, attributed: 5 }, stops: { located: 2, attributed: 6 },
  });
  const s = travelStats([bad], TODAY);
  assert.equal(s.unattributed.places, 0, 'unattributed.places went negative');
  assert.equal(s.unattributed.stops, 0, 'unattributed.stops went negative');
  // `located` is still summed as given, so a row whose census is impossible still shows up in
  // the denominator rather than disappearing.
  assert.deepEqual(s.located, { cities: 0, places: 1, stops: 2 });
});

test('R28-4: the clamp is per class and does not mask a real hole in the other one', () => {
  const mixed = row({
    id: 'mixed', startDate: '2024-04-01', endDate: '2024-04-02',
    places: { located: 1, attributed: 9 }, stops: { located: 10, attributed: 4 },
  });
  const s = travelStats([mixed], TODAY);
  assert.equal(s.unattributed.places, 0);
  assert.equal(s.unattributed.stops, 6, 'the clamp swallowed a real hole');
});

test('R28-4: the clamp is per ROW, so one impossible row cannot cancel another row\'s hole', () => {
  // Summing first and clamping once would let `attributed - located = -4` on row A pay for
  // row B's genuine 4 unattributed places. Clamping inside the fold is what stops that.
  const impossible = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-02', places: { located: 1, attributed: 5 } });
  const honest = row({ id: 'b', startDate: '2024-05-01', endDate: '2024-05-02', places: { located: 10, attributed: 6 } });
  assert.equal(travelStats([impossible, honest], TODAY).unattributed.places, 4);
});

/**
 * QA **R28-5**. One field, two answers: `c.countryCode === null` decided `unattributed.cities`
 * while `?? NO_COUNTRY` decided the group key, so an `undefined` code was grouped as
 * unattributed and not counted as one — and came back out as `undefined`, which
 * `JSON.stringify` silently **drops**, corrupting any golden it reached. `null` and `undefined`
 * are now one answer everywhere the field is read.
 */
test('R28-5: an `undefined` countryCode is treated exactly as `null`, everywhere', () => {
  const undef = { key: 'k-u' as CityKey, name: 'Paris', countryCode: undefined, countrySource: null };
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-02' });
  a.cities = [undef as unknown as TripSummaryCity];
  const s = travelStats([a], TODAY);
  assert.equal(s.located.cities, 1);
  assert.equal(s.unattributed.cities, 1, 'an undefined code was grouped as unattributed but not counted as one');
  assert.equal(s.cities[0].countryCode, null, 'the row came back carrying `undefined`');
  // The consequence that reaches a file: `JSON.stringify` drops an `undefined` value, so the
  // key would vanish from the golden entirely rather than reading `null`.
  assert.ok('countryCode' in JSON.parse(JSON.stringify(s.cities[0])), 'countryCode was dropped by JSON.stringify');
  assert.equal(JSON.parse(JSON.stringify(s.cities[0])).countryCode, null);
});

test('R28-5: an `undefined` and a `null` code with the same name are ONE row, and it is null', () => {
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-02' });
  a.cities = [{ key: 'k-a' as CityKey, name: 'Paris', countryCode: undefined, countrySource: null } as unknown as TripSummaryCity];
  const b = row({ id: 'b', startDate: '2024-05-01', endDate: '2024-05-02', cities: [city('Paris', null)] });
  const s = travelStats([a, b], TODAY);
  assert.equal(s.cities.length, 1);
  assert.equal(s.cities[0].countryCode, null);
  assert.deepEqual(s.cities[0].tripIds, ['a', 'b']);
  assert.equal(s.unattributed.cities, 2, 'both cities are unattributed and both are counted');
});

// ---------------------------------------------------------------- provisional (A-34)

/**
 * §8.4 **A-34** (QA R28-7). A-31 Part 5 residue 2 licenses an `active` trip contributing all of
 * its countries un-clamped by the day it has reached — and that licence holds *only because the
 * contribution is marked*. `provisional` is true exactly when **no `completed` trip contributed
 * the row**; a surface renders a provisional row visibly differently and never as a visited fact.
 *
 * Both directions are asserted, because a boolean with a test on one side only is a boolean that
 * will be inverted.
 */
test('A-34: a country only an active trip contributes is provisional; one a completed trip did is not', () => {
  const done = row({
    id: 'done', startDate: '2024-04-01', endDate: '2024-04-10',
    countryCodes: ['AT' as CountryCode], cities: [city('Vienna', 'AT' as CountryCode)],
  });
  const now = row({
    id: 'now', startDate: '2026-06-01', endDate: '2026-06-30',
    countryCodes: ['AT' as CountryCode, 'GB' as CountryCode],
    cities: [city('Vienna', 'AT' as CountryCode), city('London', 'GB' as CountryCode)],
  });
  const s = travelStats([done, now], TODAY);   // TODAY = 2026-06-15, so `now` is active
  assert.equal(s.trips.active, 1);
  assert.equal(s.trips.completed, 1);
  const by = Object.fromEntries(s.countries.map((c) => [c.code, c.provisional]));
  assert.deepEqual(by, { AT: false, GB: true });
  const byCity = Object.fromEntries(s.cities.map((c) => [c.nameKey, c.provisional]));
  assert.deepEqual(byCity, { london: true, vienna: false });
});

test('A-34: provisional is per row, not per library — a lone completed trip marks nothing', () => {
  const done = row({
    id: 'done', startDate: '2024-04-01', endDate: '2024-04-10',
    countryCodes: ['AT' as CountryCode], cities: [city('Vienna', 'AT' as CountryCode)],
  });
  const s = travelStats([done], TODAY);
  assert.equal(s.countries[0].provisional, false);
  assert.equal(s.cities[0].provisional, false);
});

test('A-34: a library of nothing but active trips marks every row provisional', () => {
  const now = row({
    id: 'now', startDate: '2026-06-01', endDate: '2026-06-30',
    countryCodes: ['HR' as CountryCode], cities: [city('Split', 'HR' as CountryCode)],
  });
  const s = travelStats([now], TODAY);
  assert.equal(s.countries[0].provisional, true);
  assert.equal(s.cities[0].provisional, true);
});

test('A-34: a planned trip cannot make a row provisional, because it contributes no row at all', () => {
  const soon = row({
    id: 'soon', startDate: '2027-01-01', endDate: '2027-01-10',
    countryCodes: ['JP' as CountryCode], cities: [city('Tokyo', 'JP' as CountryCode)],
  });
  const done = row({
    id: 'done', startDate: '2024-04-01', endDate: '2024-04-10',
    countryCodes: ['JP' as CountryCode], cities: [city('Tokyo', 'JP' as CountryCode)],
  });
  const s = travelStats([soon, done], TODAY);
  assert.equal(s.countries.length, 1);
  assert.equal(s.countries[0].provisional, false, 'a planned trip should not even be in the fold');
  assert.equal(s.cities[0].provisional, false);
});

test('A-34: the order the rows arrive in does not decide provisional', () => {
  const done = row({ id: 'z-done', startDate: '2026-01-01', endDate: '2026-01-10', countryCodes: ['AT' as CountryCode] });
  const now = row({ id: 'a-now', startDate: '2026-06-01', endDate: '2026-06-30', countryCodes: ['AT' as CountryCode] });
  // `a-now` sorts first by id but last by start date; the completed row is seen second.
  assert.equal(travelStats([now, done], TODAY).countries[0].provisional, false);
  assert.equal(travelStats([done, now], TODAY).countries[0].provisional, false);
});

// ---------------------------------------------------------------- daysTravelled

/**
 * ROADMAP I-7, **`daysTravelled` is a union**.
 *
 * Injected fault: sum the spans and the number moves by exactly the overlap. Residue 5 is
 * deliberate and asserted here: `trips.completed` counts overlapping trips separately while
 * `daysTravelled` counts their shared days once. They are counts of different things.
 */
test('I-7: two overlapping trips contribute the UNION of their days, not the sum', () => {
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-10' });   // 10 days
  const b = row({ id: 'b', startDate: '2024-04-08', endDate: '2024-04-12' });   // 5 days, 3 shared
  const s = travelStats([a, b], TODAY);
  assert.equal(s.daysTravelled, 12, 'Apr 1–12 inclusive; the sum would be 15');
  assert.equal(s.trips.completed, 2, 'the union of days is not a merge of trips');
});

test('I-7: a trip wholly inside another adds nothing to daysTravelled', () => {
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-30' });
  const b = row({ id: 'b', startDate: '2024-04-10', endDate: '2024-04-12' });
  assert.equal(travelStats([a, b], TODAY).daysTravelled, 30);
});

test('I-7: two disjoint trips are added; adjacency does not merge into a gap that is not there', () => {
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-02' });
  const b = row({ id: 'b', startDate: '2024-04-04', endDate: '2024-04-05' });
  assert.equal(travelStats([a, b], TODAY).daysTravelled, 4, 'Apr 3 was never travelled');
});

test('I-7: a year 0001 trip does not allocate a day-number set — the sweep is by interval', () => {
  // An `IsoDate` admits `0001-01-01`, and a `Set` of day numbers over it would allocate
  // ~720,000 entries per such row. This is a timing-free way to say the same thing: the answer
  // is right and the call returns.
  //
  // **§2.1 A-32 Part 6 (QA R28-1).** `365` was green here for the wrong reason: `Date.UTC` read
  // year 1 as **1901**, which also has 365 days, so the number could not discriminate. The
  // country code and the two date assertions below are what make this test measure what its own
  // name says — under the shipped code they were `'1901-01-01'` / `'1901-12-31'`.
  const a = row({ id: 'a', startDate: '0001-01-01', endDate: '0001-12-31', countryCodes: ['JP' as CountryCode] });
  const s = travelStats([a], TODAY);
  assert.equal(s.daysTravelled, 365, 'year 1 is not a leap year in the proleptic Gregorian calendar');
  assert.equal(s.countries[0].firstVisit, '0001-01-01');
  assert.equal(s.countries[0].lastVisit, '0001-12-31');
});

test('I-7: a year 0500 trip reports the year it was given, padded to four digits', () => {
  // The padding half of R28-1, which the year-0001 case cannot reach: `fromDayNumber` padded the
  // month and the day and not the year, so this row's `firstVisit` came back as `"500-06-01"` —
  // a string `parseIsoDate`, in the same file, throws on. §2.1 **A-32** Part 6 item 3.
  const a = row({ id: 'a', startDate: '0500-06-01', endDate: '0500-06-10', countryCodes: ['IT' as CountryCode] });
  const s = travelStats([a], TODAY);
  assert.equal(s.countries[0].firstVisit, '0500-06-01');
  assert.equal(s.countries[0].lastVisit, '0500-06-10');
  assert.equal(s.daysTravelled, 10);
});

test('I-7: two trips 1900 years apart are two intervals, not one', () => {
  // The consequence of the same fault inside `daysTravelled`: `Date.UTC` collapsed year 0001 and
  // year 1901 onto the same day numbers, so the interval union reported 10 days for 20.
  const a = row({ id: 'a', startDate: '0001-01-01', endDate: '0001-01-10' });
  const b = row({ id: 'b', startDate: '1901-01-01', endDate: '1901-01-10' });
  assert.equal(travelStats([a, b], TODAY).daysTravelled, 20);
});

// ---------------------------------------------------------------- totality and throws

/** ROADMAP I-7, **totality on malformed input**. */
test('I-7: endDate before startDate degenerates to one day and does NOT throw', () => {
  // `validateTrip` reports it (`expected = 0`) and does not reject it; `fromJSON` accepts it. So
  // it reaches this function, and counting zero would make a malformed row *invisible*.
  const bad = row({
    id: 'backwards', startDate: '2024-04-10', endDate: '2024-04-01',
    countryCodes: ['HR' as CountryCode], cities: [city('Split', 'HR' as CountryCode)],
  });
  const s = travelStats([bad], TODAY);
  assert.equal(s.daysTravelled, 1);
  assert.equal(s.countries[0].firstVisit, '2024-04-10');
  assert.equal(s.countries[0].lastVisit, '2024-04-10', 'a backwards row reported a lastVisit before its firstVisit');
  assert.deepEqual(s.cities.map((c) => c.name), ['Split']);
  assert.equal(s.trips.completed, 1);
});

test('I-7: a duplicate row id throws and names the id', () => {
  const a = row({ id: 'twice', startDate: '2024-04-01', endDate: '2024-04-02' });
  const b = row({ id: 'twice', startDate: '2024-06-01', endDate: '2024-06-02' });
  assert.throws(
    () => travelStats([a, b], TODAY),
    /duplicate summary id "twice"/,
    'a duplicated row was silently deduped — trips.completed would be one too low with nothing said',
  );
});

/**
 * QA **R28-3**. A row minted before `SUMMARY_VERSION` 4 used to **throw**, and only when the
 * trip happened to be `active` or `completed` — a `planned` one passed silently, because the
 * census walk only visits travelled rows. That throw was neither uniform nor programmer error:
 * `refreshLibrary()` installs the stored rows and the rescan brings them current *afterwards*,
 * so between the two the library legitimately holds version-3 rows and I-8's Profile would have
 * thrown on a state the client itself produces. §2.1 lets core throw on programmer error only.
 */
test('R28-3: a row minted before SUMMARY_VERSION 4 does not throw, whatever its lifecycle', () => {
  const strip = (r: TripSummaryRow) => {
    const s = { ...r } as TripSummaryRow;
    delete (s as { attribution?: unknown }).attribution;
    return s;
  };
  const completed = strip(row({
    id: 'old', startDate: '2024-04-01', endDate: '2024-04-10',
    countryCodes: ['HR' as CountryCode], cities: [city('Split', 'HR' as CountryCode)],
  }));
  const planned = strip(row({ id: 'soon', startDate: '2027-01-01', endDate: '2027-01-10' }));
  assert.doesNotThrow(() => travelStats([completed], TODAY));
  assert.doesNotThrow(() => travelStats([planned], TODAY));
  assert.doesNotThrow(() => travelStats([completed, planned], TODAY));

  // What it contributes instead of throwing: everything the row does carry, and nothing it
  // does not. The census it has no numbers for stays at zero rather than being invented.
  const s = travelStats([completed], TODAY);
  assert.equal(s.daysTravelled, 10);
  assert.deepEqual(s.countries.map((c) => c.code), ['HR']);
  assert.deepEqual(s.cities.map((c) => c.name), ['Split']);
  assert.equal(s.located.cities, 1, 'the city census comes from cities[], which a version-3 row has');
  assert.deepEqual(
    { places: s.located.places, stops: s.located.stops },
    { places: 0, stops: 0 },
    'a row with no census contributes no census — it is not guessed at',
  );
  assert.deepEqual(s.unattributed, { cities: 0, places: 0, stops: 0 });
});

test('R28-3: a row carrying a HALF census is treated the same way, not dereferenced', () => {
  // `{places}` with no `stops` is what a partial hand edit or a half-finished migration leaves.
  const half = row({ id: 'half', startDate: '2024-04-01', endDate: '2024-04-10', places: { located: 4, attributed: 3 } });
  delete (half.attribution as { stops?: unknown }).stops;
  const s = travelStats([half], TODAY);
  assert.equal(s.located.places, 4);
  assert.equal(s.unattributed.places, 1);
  assert.equal(s.located.stops, 0, 'the missing half is zero, not a TypeError and not a throw');
});

test('I-7: a malformed date is a throw, not a zero', () => {
  const bad = row({ id: 'a', startDate: '2024-4-1' as IsoDate, endDate: '2024-04-02' });
  assert.throws(() => travelStats([bad], TODAY), /invalid IsoDate/);
  assert.throws(() => travelStats([], 'yesterday' as IsoDate), /invalid IsoDate/);
});

// ---------------------------------------------------------------- purity (exit criterion 6c)

test('I-7: travelStats is pure — twice on one input is deep-equal, and the input is untouched', () => {
  // Deliberately NOT in canonical order: `b` starts after `a`, so a sort that ran on the
  // caller's own array instead of on a `slice()` would reorder these two and the assertion
  // below would see it. That is the whole reason the order is written this way.
  const rows = [
    row({ id: 'b', startDate: '2024-06-01', endDate: '2024-06-02', countryCodes: ['AT' as CountryCode] }),
    row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-10', countryCodes: ['HR' as CountryCode], cities: [city('Split', 'HR' as CountryCode)] }),
  ];
  const before = JSON.stringify(rows);
  const x = travelStats(rows, TODAY);
  const y = travelStats(rows, TODAY);
  assert.deepEqual(x, y);
  assert.notEqual(x, y, 'the same object came back twice — something is memoising');
  assert.equal(JSON.stringify(rows), before, 'the input array or its rows were mutated');
});

test('I-7: the output does not depend on the order the caller built the list', () => {
  const mk = (id: string, start: IsoDate, end: IsoDate, code: string) =>
    row({ id, startDate: start, endDate: end, countryCodes: [code as CountryCode], cities: [city(id, code as CountryCode)] });
  const rows = [
    mk('a', '2024-04-01', '2024-04-10', 'HR'),
    mk('b', '2024-06-01', '2024-06-02', 'AT'),
    mk('c', '2025-01-01', '2025-01-03', 'HR'),
  ];
  const forwards = travelStats(rows, TODAY);
  const backwards = travelStats(rows.slice().reverse(), TODAY);
  assert.deepEqual(backwards, forwards, 'the answer moved with the caller\'s array order');
});

test('I-7: a structurally mutated copy gives a DIFFERENT answer — the assertion is not vacuous', () => {
  const rows = [row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-10', countryCodes: ['HR' as CountryCode] })];
  const mutated = [{ ...rows[0], endDate: '2024-04-20' as IsoDate }];
  assert.notDeepEqual(travelStats(mutated, TODAY), travelStats(rows, TODAY));
});

test('I-7: two rows with the same start date order by id, deterministically', () => {
  const b = row({ id: 'b', startDate: '2024-04-01', endDate: '2024-04-02', cities: [city('Same', 'HR' as CountryCode)] });
  const a = row({ id: 'a', startDate: '2024-04-01', endDate: '2024-04-02', cities: [city('SAME', 'HR' as CountryCode)] });
  const s = travelStats([b, a], TODAY);
  assert.deepEqual(s.cities[0].tripIds, ['a', 'b']);
  assert.equal(s.cities[0].name, 'SAME', 'the display name did not come from the canonically-first row');
});

// ---------------------------------------------------------------- the one real trip

/**
 * A-31 Part 7's last paragraph, reached through `travelStats` rather than through the row.
 * Four numbers, two programs, one trip — `gen-golden.mjs` walks the document directly and
 * `tripSummary` walks it again inside the write that mints the row.
 *
 * The clock is **after** the reference trip's `endDate`, deliberately: at `FIXTURE_TODAY`
 * (2026-08-01) the trip is `planned`, so under A-31 Part 3 it contributes nothing and there is
 * nothing to cross-check. That is the population rule working, and it is asserted below.
 */
const AFTER_THE_TRIP: IsoDate = '2026-08-24';

test('I-7: the reference trip\'s census equals countries.json — four numbers, two programs', () => {
  const { trip } = europe2026();
  const s = travelStats([tripSummary(trip, COUNTRY_INDEX)], AFTER_THE_TRIP);
  const g = golden<{
    stops: { withCoordinates: number };
    places: { withCoordinates: number };
    unattributedStops: unknown[];
    unattributedPlaces: unknown[];
  }>('countries.json');
  assert.equal(s.located.stops, g.stops.withCoordinates);
  assert.equal(s.unattributed.stops, g.unattributedStops.length);
  assert.equal(s.located.places, g.places.withCoordinates);
  assert.equal(s.unattributed.places, g.unattributedPlaces.length);
});

test('I-7: the reference trip at FIXTURE_TODAY is planned, so it contributes nothing', () => {
  const { trip } = europe2026();
  const s = travelStats([tripSummary(trip, COUNTRY_INDEX)], '2026-08-01');
  assert.deepEqual(s.trips, { planned: 1, active: 0, completed: 0 });
  assert.deepEqual(s.countries, []);
  assert.deepEqual(s.cities, []);
  assert.equal(s.daysTravelled, 0);
  assert.deepEqual(s.located, { cities: 0, places: 0, stops: 0 });
});

/**
 * The golden is **derived, not written**: `gen-golden.mjs` produces it by calling `travelStats`,
 * and this test recomputes it. Its job is the ordinary one — make a change in behaviour visible
 * — while the cross-check above is the one that has an independent oracle behind it.
 */
test('I-7: travel-stats.json is what travelStats produces at the two fixture clocks', () => {
  const { trip } = europe2026();
  const g = golden<{
    clocks: Record<string, { today: string; stats: unknown }>;
  }>('travel-stats.json');
  const rows = [tripSummary(trip, COUNTRY_INDEX)];
  assert.deepEqual(Object.keys(g.clocks).sort(), ['afterTheTrip', 'fixtureToday']);
  for (const [name, block] of Object.entries(g.clocks)) {
    assert.deepEqual(
      block.stats,
      JSON.parse(JSON.stringify(travelStats(rows, block.today as IsoDate))),
      `${name}: the committed golden and travelStats disagree — run \`npm run golden\``,
    );
  }
});

test('I-7: no coordinate reached travel-stats.json — the same rule countries.json has', () => {
  const raw = golden<Record<string, unknown>>('travel-stats.json');
  const floats: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'number') {
      if (!Number.isInteger(v)) floats.push(`${path}=${v}`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(raw, '');
  assert.deepEqual(floats, [], 'a coordinate reached the committed golden');
});

test('I-7: the reference trip after it ends puts its seven countries and six cities on the map', () => {
  const { trip } = europe2026();
  const s = travelStats([tripSummary(trip, COUNTRY_INDEX)], AFTER_THE_TRIP);
  assert.deepEqual(s.trips, { planned: 0, active: 0, completed: 1 });
  assert.deepEqual(s.countries.map((c) => c.code), ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US']);
  for (const c of s.countries) {
    assert.equal(c.firstVisit, trip.startDate);
    assert.equal(c.lastVisit, trip.endDate);
    assert.deepEqual(c.tripIds, [trip.id]);
  }
  assert.equal(s.cities.length, 6);
  assert.equal(s.unnamedCities, 0);
  assert.equal(s.daysTravelled, 16, 'Aug 7–22 inclusive');
});
