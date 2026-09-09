/**
 * The derive-path read gate — ARCHITECTURE §8.4 **A-87**, ROADMAP Phase 2 **I-26**.
 *
 * `travelStats` promised in its own docstring that it throws **two** ways and that *"the list is
 * exhaustive"*. Measured at `e1e1973` it threw at least four ways and silently published wrong
 * numbers two more, every one of them a stored value dereferenced before anything asked what
 * shape it was. A-87 rules the class: every stored field a derivation reads passes a gate that is
 * total over `unknown`, read exactly once, three-way — absent/`null` is a **value** taking the
 * field's documented fallback uncounted, the declared shape is the value, and anything else
 * present is a **defect** that takes the *same* fallback and is **reported** on
 * `TravelStats.absorbed`.
 *
 * This file is the five measured shapes plus the quiet half, the value arm, and the
 * lifecycle-blindness A-87 Part 5 rules. The **covering table** — the closure claim, over the
 * type's fields rather than over the code's reads — lives in `test/stats-storage.test.ts`,
 * beside the compiler-maintained `ROW_KEYS` it is denominated by.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { europe2026 } from './fixture.ts';
import { COUNTRY_INDEX, travelStats, tripSummary } from '../src/index.ts';
import type { IsoDate, TravelStats, TravelStatsAbsorption, TripSummaryCity, TripSummaryRow } from '../src/index.ts';

/** After the reference trip's `endDate` (2026-08-22), so the row is `completed` and travelled. */
const TODAY: IsoDate = '2026-09-09';

function refRow(): TripSummaryRow {
  return tripSummary(europe2026().trip, COUNTRY_INDEX);
}

/** The reference row with one stored value replaced — A-87 Part 1's own construction. */
function over(patch: Record<string, unknown>): TripSummaryRow {
  return { ...refRow(), ...patch } as unknown as TripSummaryRow;
}

/** The reference row with one field of its FIRST city entry replaced. */
function overCity(patch: Record<string, unknown>): TripSummaryRow {
  const base = refRow();
  const cities = base.cities.slice();
  cities[0] = { ...cities[0], ...patch } as unknown as TripSummaryCity;
  return { ...base, cities } as unknown as TripSummaryRow;
}

/** `{ ...row, [key]: undefined }` still CARRIES the key. This removes it. */
function without(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) if (k !== key) out[k] = v;
  return out;
}

/** The reference row with one top-level key genuinely absent. */
function rowWithout(key: string): TripSummaryRow {
  return without(refRow() as unknown as Record<string, unknown>, key) as unknown as TripSummaryRow;
}

/** The reference row whose first city entry has one key genuinely absent. */
function cityWithout(key: string): TripSummaryRow {
  const base = refRow();
  const cities = base.cities.slice();
  cities[0] = without(cities[0] as unknown as Record<string, unknown>, key) as unknown as TripSummaryCity;
  return { ...base, cities } as unknown as TripSummaryRow;
}

/** Every number a `TravelStats` publishes, as `path → value`. */
function numbers(value: unknown, path = ''): Array<[string, number]> {
  if (typeof value === 'number') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => numbers(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => numbers(v, path ? `${path}.${k}` : k));
  }
  return [];
}

function assertAllFinite(s: TravelStats, label: string): void {
  for (const [path, n] of numbers(s)) {
    assert.ok(Number.isFinite(n), `${label}: published a non-finite number at ${path} — ${String(n)}`);
  }
}

// ===========================================================================
// The five shapes A-87 Part 1 measured, which is the criterion this increment exists for.
// ===========================================================================

/**
 * **N1, injected:** remove the `name` gate in `readRow` and shape 3 throws again — the arm below
 * reddens on the throw, and `rowStatsReadable` goes back to reporting `true` for a row nothing
 * can name (`packages/client/test/row-stats-readable.test.ts` carries that half). That is R64-2
 * exactly.
 */
test('I-26 (A-87 Part 1): the five measured shapes RETURN, and each reports exactly one named absorption', () => {
  const cityish = { key: 'c1', name: 'Vienna', countryCode: 'AT', countrySource: 'stated', centre: null, firstDay: null, lastDay: null };
  const cases: Array<[label: string, patch: Record<string, unknown>, path: string, kind: TravelStatsAbsorption['kind']]> = [
    ["cities: ['Vienna']", { cities: ['Vienna'] }, 'cities[0]', 'entry'],
    ['cities: [null]', { cities: [null] }, 'cities[0]', 'entry'],
    ['cities: [{…, name: 42}]', { cities: [{ ...cityish, name: 42 }] }, 'cities[0].name', 'field'],
    ['countryCodes: 42', { countryCodes: 42 }, 'countryCodes', 'list'],
    ['attribution: {places: {}}', { attribution: { places: {} } }, 'attribution.places', 'census'],
  ];
  for (const [label, patch, path, kind] of cases) {
    const row = over(patch);
    const s = travelStats([row], TODAY);
    assertAllFinite(s, label);
    assert.deepEqual(
      s.absorbed,
      [{ rowId: row.id, path, kind }],
      `${label}: the row is not named on the SUCCESS path (A-87 Part 4)`,
    );
  }
});

/**
 * The quiet half, and it is a separate arm because it does not throw: nothing was ever fatal
 * here, the answers were just wrong. **N2, injected:** gate the container and not the entries and
 * the `'AT'` cell reddens on a *missing absorption* rather than on a throw.
 */
test('I-26 (A-87 Part 1 shapes 4 and 5): the QUIET half is absorbed too — no vanished list, no NaN, no "05"', () => {
  const walked = over({ countryCodes: 'AT' });
  const s = travelStats([walked], TODAY);
  assertAllFinite(s, "countryCodes: 'AT'");
  assert.deepEqual(s.absorbed, [{ rowId: walked.id, path: 'countryCodes', kind: 'list' }]);
  assert.deepEqual(s.countries, [], "a string is iterable, so the walk read CHARACTERS and the row's country list vanished");

  const census = over({ attribution: { places: { located: '5', attributed: 0 }, stops: { located: 0, attributed: 0 } } });
  const t = travelStats([census], TODAY);
  assertAllFinite(t, "attribution.places.located: '5'");
  assert.deepEqual(t.absorbed, [{ rowId: census.id, path: 'attribution.places.located', kind: 'census' }]);
  assert.equal(typeof t.located.places, 'number');
  assert.equal(t.located.places, 0, '`countOf` reads a stored `\'5\'` as 0 — never the string "05" by concatenation');
  assert.equal(t.seen.places, refRow().placeCount);
});

// ===========================================================================
// The value arm. A one-sided test on a classifier is a classifier that will be inverted
// (A-34 Part 4), so both arms are run.
// ===========================================================================

/**
 * **`countryCodes: null` is in this arm deliberately.** It **throws** at `e1e1973` and becomes a
 * *value* under A-87 Part 3 rule 5 — the row does not say which countries it holds, so it
 * contributes none, uncounted, exactly as `cities: null` already does. It is the one behaviour
 * change in this increment that is not a repair, and it is named so it is attacked rather than
 * inherited.
 *
 * **N3, injected:** treat `null` as a defect on any one field and the reference library below
 * reports absorptions and reddens.
 */
test('I-26 (A-87 Part 2 arm 1): absent and `null` are VALUES on every gated field — zero absorptions', () => {
  const cases: Array<[label: string, row: TripSummaryRow]> = [
    ['no `cities` key at all', rowWithout('cities')],
    ['cities: null', over({ cities: null })],
    ['no `countryCodes` key at all', rowWithout('countryCodes')],
    ['countryCodes: null', over({ countryCodes: null })],
    ['no `attribution` key at all', rowWithout('attribution')],
    ['attribution: undefined', over({ attribution: undefined })],
    ['attribution: null', over({ attribution: null })],
    ['cities[0].centre: null', overCity({ centre: null })],
    ['cities[0].centre absent', cityWithout('centre')],
    ['cities[0].firstDay: null', overCity({ firstDay: null })],
    ['cities[0].firstDay absent', cityWithout('firstDay')],
    ['cities[0].countryCode: null', overCity({ countryCode: null })],
    ['cities[0].name: null', overCity({ name: null })],
    ['cities[0].name absent', cityWithout('name')],
  ];
  for (const [label, row] of cases) {
    const s = travelStats([row], TODAY);
    assertAllFinite(s, label);
    assert.deepEqual(s.absorbed, [], `${label}: a value was reported as a defect (A-87 Part 3 rule 5)`);
  }
});

test('I-26: the committed reference library absorbs NOTHING', () => {
  const s = travelStats([refRow()], TODAY);
  assert.deepEqual(s.absorbed, []);
  assert.equal(s.unreadableCityDates, 0);
  assert.equal(s.unreadableCityLists, 0);
  assert.equal(s.unnamedCities, 0);
});

// ===========================================================================
// A-87 Part 5 — absorption is lifecycle-blind; every count about TRAVEL is not.
// ===========================================================================

/**
 * **N4, injected:** accumulate absorptions inside the travelled walk again and this reddens
 * **and** the Part 6 identity fails on the planned row — one change, two independent reds, which
 * is the evidence that Parts 5 and 6 are one decision.
 */
test('I-26 (A-87 Part 5): a corrupt PLANNED row is corrupt today — absorption is lifecycle-blind', () => {
  const travelled = over({ id: 'c-t', cities: 'nope' });
  const planned = over({ id: 'c-p', startDate: '2027-01-01' as IsoDate, endDate: '2027-01-10' as IsoDate, cities: 'nope' });
  const s = travelStats([travelled, planned], TODAY);
  assert.equal(s.unreadableCityLists, 2, 'the planned row\'s absorption is invisible (QA R64-3 §C3)');
  assert.deepEqual(s.absorbed.map((x) => x.rowId).sort(), ['c-p', 'c-t']);
  assert.equal(travelStats([planned], TODAY).unreadableCityLists, 1, 'QA R64-3 §C2');
});

test('I-26 (A-87 Part 5): every count about TRAVEL stays travelled-only — a healthy planned row contributes nothing', () => {
  const planned = over({ id: 'p', startDate: '2027-01-01' as IsoDate, endDate: '2027-01-10' as IsoDate });
  const s = travelStats([planned], TODAY);
  assert.deepEqual(s.absorbed, []);
  assert.equal(s.seen.cities, 0);
  assert.equal(s.countries.length, 0);
  assert.equal(s.unnamedCities, 0);
  assert.deepEqual(s.trips, { planned: 1, active: 0, completed: 0 });

  // …and `unnamedCities` is the control that proves Part 5 is a line and not a convenience: it
  // counts what the CENSUS lost, so a planned row's unnamed city is not counted, while the same
  // row's unreadable stored value IS.
  const cities = planned.cities.map((c, i) => (i === 0 ? { ...c, name: '  ', firstDay: 'not-a-date' } : c));
  const both = travelStats([{ ...planned, cities } as unknown as TripSummaryRow], TODAY);
  assert.equal(both.unnamedCities, 0, '`unnamedCities` is a census fact and stays travelled-only');
  assert.equal(both.unreadableCityDates, 1, 'an absorption is a fact about the stored row, whatever its lifecycle');
});

// ===========================================================================
// A-87 Part 3 rules 1, 2 and 3 — where an absorption lands, and how many.
// ===========================================================================

test('I-26 (A-87 Part 3 rule 1): one absorption per failing value, at the level the value failed', () => {
  // A list that is not an array is ONE `list` absorption — the entries are not there to fail.
  const list = over({ id: 'l', cities: 'Vienna,Split,Prague,Budapest' });
  assert.deepEqual(travelStats([list], TODAY).absorbed, [{ rowId: 'l', path: 'cities', kind: 'list' }]);

  // An entry that is not an object is ONE `entry` absorption and its five fields are not asked.
  const entry = over({ id: 'e', cities: [42] });
  assert.deepEqual(travelStats([entry], TODAY).absorbed, [{ rowId: 'e', path: 'cities[0]', kind: 'entry' }]);

  // A bad `name` beside a bad `centre` in ONE entry is TWO `field` absorptions: two independent
  // facts about two stored values.
  const two = over({ id: 'f', cities: [{ key: 'c1', name: 42, countryCode: 'AT', countrySource: 'stated', centre: 'here', firstDay: null, lastDay: null }] });
  assert.deepEqual(travelStats([two], TODAY).absorbed, [
    { rowId: 'f', path: 'cities[0].name', kind: 'field' },
    { rowId: 'f', path: 'cities[0].centre', kind: 'field' },
  ]);
});

test('I-26 (A-87 Part 3 rule 1): `seen.cities` stays the length of the STORED array, absorbed entries included', () => {
  const row = over({ id: 's', cities: [42, null, { key: 'c1', name: 'Vienna', countryCode: 'AT', countrySource: 'stated', centre: { lat: 48.2, lng: 16.37 }, firstDay: null, lastDay: null }] });
  const s = travelStats([row], TODAY);
  assert.equal(s.seen.cities, 3, 'an unreadable entry is still a record the row carries (A-85 Part 3)');
  assert.equal(s.located.cities, 1, 'an absorbed entry cannot be located');
  assert.ok(s.unattributed.cities <= s.located.cities && s.located.cities <= s.seen.cities);
});

test('I-26 (A-87 Part 3 rule 2): the date pair is ENTRY-scoped — one absorption per entry, never two', () => {
  const both = over({ id: 'd', cities: [{ key: 'c1', name: 'Vienna', countryCode: 'AT', countrySource: 'stated', centre: null, firstDay: 'nope', lastDay: 42 }] });
  const s = travelStats([both], TODAY);
  assert.deepEqual(s.absorbed, [{ rowId: 'd', path: 'cities[0]', kind: 'date' }]);
  assert.equal(s.unreadableCityDates, 1);
});

/**
 * A-87 Part 3 rule 3 — `name` is a **field** gate and not an entry gate (A-86 Part 1 reason 3: a
 * reader that kills the entry on `name` and degrades it on `centre` is a second convention on a
 * neighbouring field of one object). So an unreadable name behaves **exactly** as a name that
 * folds to `''` already does.
 */
test('I-26 (A-87 Part 3 rule 3): an unreadable `name` behaves exactly as a name that folds to `\'\'`', () => {
  const base = { key: 'c1', countryCode: 'AT', countrySource: 'stated', centre: { lat: 48.2, lng: 16.37 }, firstDay: null, lastDay: null };
  const folded = travelStats([over({ id: 'n1', cities: [{ ...base, name: '  ' }] })], TODAY);
  const unreadable = travelStats([over({ id: 'n2', cities: [{ ...base, name: 42 }] })], TODAY);
  for (const s of [folded, unreadable]) {
    assert.equal(s.seen.cities, 1, 'the entry still counts in `seen.cities`');
    assert.equal(s.located.cities, 1, 'it still counts in `located` when its centre is readable');
    assert.equal(s.unattributed.cities, 0);
    assert.equal(s.cities.length, 0, 'it produces no city row');
    assert.equal(s.unnamedCities, 1, 'and it increments `unnamedCities`');
  }
  assert.deepEqual(folded.absorbed, [], 'a name that folds to `\'\'` is a VALUE');
  assert.deepEqual(unreadable.absorbed, [{ rowId: 'n2', path: 'cities[0].name', kind: 'field' }]);
});

test('I-26 (A-31 Part 5 residue 2, discharged): a `countryCodes[]` entry that is not a minted code is a `field` absorption', () => {
  const row = over({ id: 'cc', countryCodes: ['AT', 'hr', 42, 'CZ'] });
  const s = travelStats([row], TODAY);
  assert.deepEqual(s.absorbed, [
    { rowId: 'cc', path: 'countryCodes[1]', kind: 'field' },
    { rowId: 'cc', path: 'countryCodes[2]', kind: 'field' },
  ]);
  assert.deepEqual(s.countries.map((c) => c.code), ['AT', 'CZ'], 'the documented fallback is unchanged: a non-minted entry is skipped');
});

// ===========================================================================
// A-87 Part 4 — the channel, its order, and the two scalars as views of it.
// ===========================================================================

test('I-26 (A-87 Part 4): `absorbed` is in canonical ROW order, then the order the reader visits fields', () => {
  const late = over({ id: 'zz', startDate: '2026-08-01' as IsoDate, cities: 'nope' });
  const early = over({ id: 'aa', startDate: '2026-01-01' as IsoDate, endDate: '2026-01-05' as IsoDate, countryCodes: 42, cities: [{ key: 'c1', name: 42, countryCode: 'AT', countrySource: 'stated', centre: 'x', firstDay: null, lastDay: null }] });
  const s = travelStats([late, early], TODAY);
  assert.deepEqual(s.absorbed, [
    { rowId: 'aa', path: 'cities[0].name', kind: 'field' },
    { rowId: 'aa', path: 'cities[0].centre', kind: 'field' },
    { rowId: 'aa', path: 'countryCodes', kind: 'list' },
    { rowId: 'zz', path: 'cities', kind: 'list' },
  ]);
  // Deterministic — the same reason every other output of this function is.
  assert.deepEqual(travelStats([early, late], TODAY).absorbed, s.absorbed);
});

test('I-26 (A-87 Part 4): the two scalars are computed FROM `absorbed` at one site and cannot drift', () => {
  const rows = [
    over({ id: 'a', cities: 'nope' }),
    over({ id: 'b', cities: [{ key: 'c1', name: 'Vienna', countryCode: 'AT', countrySource: 'stated', centre: null, firstDay: 'nope', lastDay: null }, { key: 'c2', name: 'Split', countryCode: 'HR', countrySource: 'stated', centre: null, firstDay: null, lastDay: 'nope' }] }),
  ];
  const s = travelStats(rows, TODAY);
  assert.equal(s.unreadableCityLists, new Set(s.absorbed.filter((x) => x.kind === 'list' && x.path === 'cities').map((x) => x.rowId)).size);
  assert.equal(s.unreadableCityDates, s.absorbed.filter((x) => x.kind === 'date').length);
  assert.equal(s.unreadableCityLists, 1);
  assert.equal(s.unreadableCityDates, 2);
});

// ===========================================================================
// A-87 Part 7 — the throw list, over the population that is reachable.
// ===========================================================================

test('I-26 (A-87 Part 7): the throw list is exhaustive at TWO over plain data — duplicate id, and a malformed TRIP date', () => {
  const dup = over({ id: 'same' });
  assert.throws(() => travelStats([dup, { ...dup } as TripSummaryRow], TODAY), /duplicate summary id/);
  assert.throws(() => travelStats([over({ startDate: 'not-a-date' as IsoDate })], TODAY), /IsoDate/);
  assert.throws(() => travelStats([over({ endDate: 42 as unknown as IsoDate })], TODAY), /IsoDate/);
  // …and nothing else on plain data. Every hostile shape of every other field is the covering
  // table's subject (`test/stats-storage.test.ts`).
});

test('I-26: a stored `countryCode` of `\'--\'` still cannot collide with the composite key sentinel', () => {
  const row = over({ id: 'sent', cities: [{ key: 'c1', name: 'Vienna', countryCode: '--', countrySource: 'stated', centre: null, firstDay: null, lastDay: null }] });
  const s = travelStats([row], TODAY);
  assert.deepEqual(s.absorbed, [{ rowId: 'sent', path: 'cities[0].countryCode', kind: 'field' }]);
  assert.deepEqual(s.cities.map((c) => c.countryCode), [null]);
});

test('I-26: `travelStats` is pure — the caller\'s rows come back untouched', () => {
  const row = over({ id: 'pure', cities: [42] });
  const before = JSON.stringify(row);
  travelStats([row], TODAY);
  assert.equal(JSON.stringify(row), before);
});
