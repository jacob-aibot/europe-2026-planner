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
    // A-87 Part 1 shape 5 is `{places: {}}` **or `{places: 'x'}`**, and **I-28 (A-88 Part 5)
    // moves the first of the two from *absorbed* to *inert* by ruling**: a census declaring
    // neither of its numbers is the same answer as no census at all, and reporting an ABSENT
    // number as a defect inverted A-87 Part 2 arm 1. Shape 5's other form is the one that still
    // absorbs at this path — present, and not a stored record — and the moved cell is pinned
    // beside it in `I-28 (A-88 Part 5)` below.
    ["attribution: {places: 'x'}", { attribution: { places: 'x' } }, 'attribution.places', 'census'],
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

// ===========================================================================
// (I-28) A-88 Parts 5 and 6 — the census gates its two numbers independently, and one
// stored-record predicate stands at all three object gates.
// ===========================================================================

/**
 * **N2 — §8.4 A-88 Part 5 (QA R65-3).** `readCensus` gated its two numbers as a **unit**: an
 * **absent** number was reported as a defect and the readable number beside it was thrown away.
 * That inverts A-87 Part 2 arm 1 — absent and `null` are a *value* — for exactly one record
 * class, and it deletes a real observation to arrive at a less precise version of the same
 * invention (A-60 Part 6.2's refusal, one record over).
 *
 * The decisive argument is A-87 Part 3 rule 5's own: **the value arm's outcome must equal the
 * outcome of the legitimate value it stands in for.** `{located: 5}` ≡ `{located: 5,
 * attributed: 0}` — five located records, none recorded as attributed — which publishes
 * `unattributed.places` **5**, the honest hole.
 *
 * **Injected:** restore the both-numbers arm (`if either is absent or null → absorb at the
 * census path and return null`) and the first two cases redden on a published `0` and on an
 * absorption the table now calls inert.
 */
test('I-28 (A-88 Part 5): `readCensus` gates its two numbers INDEPENDENTLY — an absent half is a value', () => {
  const stops = { located: 0, attributed: 0 };

  // The half-census: the readable observation survives, and nothing is reported.
  const half = over({ attribution: { places: { located: 5 }, stops } });
  const h = travelStats([half], TODAY);
  assertAllFinite(h, 'attribution: {places: {located: 5}}');
  assert.deepEqual(h.absorbed, [], 'an ABSENT census number was reported as a defect');
  assert.equal(h.located.places, 5, 'the readable observation beside the absent one was discarded');
  assert.equal(h.unattributed.places, 5, '`{located: 5}` ≡ `{located: 5, attributed: 0}` — the honest hole');

  // …and it is literally the same answer as the row that stored the zero.
  const explicit = over({ attribution: { places: { located: 5, attributed: 0 }, stops } });
  assert.deepEqual(h, travelStats([explicit], TODAY), 'the value arm did not equal the value it stands in for');

  // Neither number declared is INERT, by ruling: the same answer as `places: null` and as a
  // pre-SUMMARY_VERSION-4 row. This cell moved from *absorbed* at `ede933f`.
  for (const [label, attribution] of [
    ['{places: {}}', { places: {}, stops }],
    ['{places: null}', { places: null, stops }],
  ] as Array<[string, unknown]>) {
    const s = travelStats([over({ attribution })], TODAY);
    assertAllFinite(s, label);
    assert.deepEqual(s.absorbed, [], `${label}: a census declaring neither number is inert`);
    assert.equal(s.located.places, 0, label);
  }

  // Present-and-wrong is unchanged: one absorption at the NUMBER's own path, value 0, and the
  // readable sibling beside it still survives.
  const wrong = over({ attribution: { places: { located: '5', attributed: 2 }, stops } });
  const w = travelStats([wrong], TODAY);
  assertAllFinite(w, "{places: {located: '5', attributed: 2}}");
  assert.deepEqual(w.absorbed, [{ rowId: wrong.id, path: 'attribution.places.located', kind: 'census' }]);
  assert.equal(w.located.places, 0, '`countOf` reads a stored `\'5\'` as 0');
  assert.equal(w.unattributed.places, 0, 'attributed 2 against located 0 clamps at 0 (QA R28-4), never negative');
});

/**
 * **N3 — §8.4 A-88 Part 6 (QA R65-5, plus the architect's own find).** `isPlainObject` was not a
 * plain-object test: it asked `typeof v === 'object' && v !== null && !Array.isArray(v)` and
 * nothing more. A-87 Part 7 excused that with *"storage returns plain data from structured clone
 * or `JSON.parse`"* — **the accessor half of that premise is right and the "plain data" half is
 * false**: structured clone carries `Date`, `Map`, `Set`, `RegExp` and `Error`, all verified in
 * this Node, and `structuredClone(Object.create(null))` comes back carrying `Object.prototype`,
 * which is why the prototype test has no false positive.
 *
 * Measured at `ede933f`: `attribution: new Date()` read as *"this row carries no census"* and
 * dropped both censuses in silence; `cities: [new Error('boom')]` put a city named **"Error"** on
 * the lifetime map (`Error.prototype.name`, through the prototype chain) absorbing nothing. Those
 * are not a sixth hostile shape — they are A-87 Part 2 arm 3 not being honoured, one convention
 * at one level and another at the level below, inside one record.
 *
 * **Injected:** relax the predicate back to `typeof === 'object'` and both halves redden from one
 * change, which is the evidence that this is one decision and not two.
 */
test('I-28 (A-88 Part 6): a present value that is not a STORED RECORD is a defect at its OWN level', () => {
  // The `cities` entry gate. An entry that fails at its own level is not asked for its `name`
  // (A-87 Part 3 rule 1), so `unnamedCities` FALLS to 0 for these shapes — the same treatment
  // `cities: [42]` already gets, which is the point.
  for (const [label, entry] of [
    ['an Error', new Error('boom')],
    ['a Date', new Date(0)],
    ['a Map', new Map()],
    ['a Set', new Set()],
    ['a RegExp', /x/],
    ['an array', []],
  ] as Array<[string, unknown]>) {
    const r = over({ cities: [entry] });
    const s = travelStats([r], TODAY);
    assertAllFinite(s, `cities: [${label}]`);
    assert.deepEqual(s.absorbed, [{ rowId: r.id, path: 'cities[0]', kind: 'entry' }], `cities: [${label}]`);
    assert.deepEqual(s.cities, [], `cities: [${label}]: a non-record entered the lifetime map`);
    assert.equal(s.seen.cities, 1, `cities: [${label}]: A-87 Part 3 rule 1 — \`seen.cities\` is the stored length`);
    assert.equal(s.unnamedCities, 0, `cities: [${label}]: an entry that failed at its own level was asked for its name`);
  }

  // The `attribution` container gate, and the census gate one level down.
  for (const [label, attribution] of [
    ['a Date', new Date(0)],
    ['a Map', new Map()],
    ['a RegExp', /x/],
  ] as Array<[string, unknown]>) {
    const r = over({ attribution });
    const s = travelStats([r], TODAY);
    assertAllFinite(s, `attribution: ${label}`);
    assert.deepEqual(s.absorbed, [{ rowId: r.id, path: 'attribution', kind: 'census' }], `attribution: ${label}`);
    assert.equal(s.located.places, 0, `attribution: ${label}`);
    assert.equal(s.located.stops, 0, `attribution: ${label}`);
  }
  const nested = over({ attribution: { places: new Date(0), stops: { located: 0, attributed: 0 } } });
  assert.deepEqual(travelStats([nested], TODAY).absorbed,
    [{ rowId: nested.id, path: 'attribution.places', kind: 'census' }]);

  // A null-prototype object IS a stored record — `structuredClone` cannot produce one, but
  // `JSON.parse` with a reviver can, and refusing it would be a false positive on the gate.
  const bare = Object.assign(Object.create(null) as Record<string, unknown>, { located: 3, attributed: 1 });
  const b = travelStats([over({ attribution: { places: bare, stops: { located: 0, attributed: 0 } } })], TODAY);
  assert.deepEqual(b.absorbed, [], 'a null-prototype object was refused as a stored record');
  assert.equal(b.located.places, 3);
});

/**
 * **N4 — §8.4 A-88 Part 6's closing clause, which is the architect's own find and which no round
 * reported.** `stopCount`, `poolCount` and `placeCount` were read through `countOf` outside the
 * reader, so a stored `'x'` read **0** and was **reported by nothing** — a third convention for a
 * stored number, beside the census numbers, which absorb. Measured at `b96a54e`:
 * `stopCount: 'x'` → `absorbed = 0`, silently 0; `attribution.places.located: '5'` →
 * `absorbed = 1`, reported.
 *
 * The three counts move into the reader with the rest. **The published value does not change**:
 * `countOf` still floors and does not cap (A-86 Part 5's *no ceiling*, untouched) and the count
 * still reads `0`. What changes is that the absorption is on the channel.
 *
 * **Injected:** make the gate change the value as well as adding the report — `stopCount: 'x'`
 * reading anything but `0` — and the *every published number is finite* arm of the covering table
 * reddens beside this one.
 *
 * **QA R66-2 (MINOR): the *value is unchanged* pin was vacuous below the fixture's own clamp, and
 * this is where that is fixed.** The published total is
 * `seenStops += Math.max(stopRecords, rowLocatedStops)` (`travelStats.ts:947`, R28-4's per-row
 * clamp), and the reference row's `attribution.stops.located` is **132** — so on that row **any**
 * wrong count in `[0, 132]` publishes exactly what `0` publishes. Measured by the breaker: a gate
 * returning `7` was **GREEN** across all six test files, the same gate returning `100000` was
 * **RED**, and the arm A-88 names as the catcher — *every published number is finite* — cannot
 * see it either, because `7` is finite. The pin is therefore taken on a row whose census is
 * **zero**, where `Math.max` is the identity and every wrong count is visible; the `NO_CENSUS`
 * liveness check below fails the test rather than passing it if that ever stops being true.
 */
const NO_CENSUS = { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } };

test('I-28 (A-88 Part 6): the three stored counts are the reader\'s last exception, and they go with the rest', () => {
  const baseline = travelStats([refRow()], TODAY);
  for (const key of ['stopCount', 'poolCount', 'placeCount'] as const) {
    // **The pin's own liveness (QA R66-2).** On this base a count of `7` MUST publish something
    // other than what `0` publishes, or the `deepEqual` below cannot see the fault it names.
    assert.notDeepEqual(
      travelStats([over({ attribution: NO_CENSUS, [key]: 7 })], TODAY),
      travelStats([over({ attribution: NO_CENSUS, [key]: 0 })], TODAY),
      `${key}: INCONCLUSIVE — a clamp hides a wrong count on this base, so the pin below is vacuous`,
    );
    for (const [label, value] of [['a string', 'x'], ['a negative', -1], ['a NaN', Number.NaN], ['an object', {}], ['a Date', new Date(0)]] as Array<[string, unknown]>) {
      const r = over({ attribution: NO_CENSUS, [key]: value });
      const s = travelStats([r], TODAY);
      assertAllFinite(s, `${key} = ${label}`);
      assert.deepEqual(s.absorbed, [{ rowId: r.id, path: key, kind: 'field' }], `${key} = ${label}: silently 0`);
      // The VALUE is unchanged — this adds the report and nothing else.
      const zeroed = travelStats([over({ attribution: NO_CENSUS, [key]: 0 })], TODAY);
      assert.deepEqual({ ...s, absorbed: [] }, zeroed, `${key} = ${label}: the gate changed the published value`);
    }
    // absent and `null` are values, uniformly, exactly as everywhere else on this path.
    for (const [label, row] of [[`${key} absent`, rowWithout(key)], [`${key}: null`, over({ [key]: null })]] as Array<[string, TripSummaryRow]>) {
      assert.deepEqual(travelStats([row], TODAY).absorbed, [], label);
    }
  }
  // A healthy row absorbs nothing — over the whole committed reference library.
  assert.deepEqual(baseline.absorbed, []);
});

/**
 * **N7 — §8.4 A-88 Part 9's R65-4.** *Read exactly once* is half of A-87 Part 2's rule, and
 * `cities[i].firstDay` and `.lastDay` were each read **twice** inside the increment whose subject
 * is that rule: once by the pair predicate, once again to build the gated entry. R64-1's own fix
 * applies — **bind the value once** — and this is the same counting-accessor measurement
 * `packages/core/test/readOnce.test.ts` makes one model layer up.
 *
 * A counting accessor returning a **stable** value is a measurement device, not the hostile
 * accessor A-87 Part 7 excludes: it answers the same thing every time, so it cannot change what
 * the reader computes — only how many times the reader asked.
 *
 * **Injected:** re-inline `c.firstDay` / `c.lastDay` at the push site and this reddens at
 * `{firstDay: 2, lastDay: 2}`, which is the measurement R65-4 reported.
 */
test('I-28 (A-88 Part 9, R65-4): every gated field of a `cities` entry is read EXACTLY once', () => {
  const values: Record<string, unknown> = {
    key: 'c1', name: 'Vienna', countryCode: 'AT', countrySource: 'stated',
    centre: { lat: 48.2, lng: 16.4 }, firstDay: '2026-08-08', lastDay: '2026-08-10',
  };
  const reads: Record<string, number> = {};
  const entry: Record<string, unknown> = {};
  for (const k of Object.keys(values)) {
    reads[k] = 0;
    Object.defineProperty(entry, k, {
      enumerable: true,
      get() { reads[k] += 1; return values[k]; },
    });
  }
  const s = travelStats([over({ cities: [entry] })], TODAY);
  assert.deepEqual(s.absorbed, [], 'the counting entry is healthy, so the read counts are about reads');
  assert.deepEqual(reads, {
    key: 0, countrySource: 0,            // nothing reads these — A-87 Part 3's control half
    name: 1, countryCode: 1, centre: 1,  // gated, once each
    firstDay: 1, lastDay: 1,             // R65-4: these were 2 and 2
  });
});
