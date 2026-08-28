/**
 * QA round 29 — I-7a: **A-34's `provisional`, R28-4's clamp and R28-5's unification, at the
 * boundaries the builder's own tests do not sit on.**
 *
 *   node --experimental-strip-types qa/i7a-provisional.mjs
 *
 * `qa/i7-edges.mjs` is round 28's battery over `travelStats`' algorithm and is re-run
 * unchanged. This is the new surface only: the boolean A-34 added, the two round-28 MINORs the
 * builder closed inside the fold, and what the clamp now hides.
 */
import * as core from '../packages/core/src/index.ts';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL  ' + m); } else console.log('ok    ' + m); };
const eq = (a, b, m) => ok(
  (a !== null && typeof a === 'object') ? JSON.stringify(a) === JSON.stringify(b) : Object.is(a, b),
  `${m} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`,
);
const head = (s) => console.log(`\n== ${s} ==`);

const census = (l = 0, a = 0) => ({ located: l, attributed: a });
function row(id, startDate, endDate, opts = {}) {
  return {
    id, title: id, startDate, endDate, datePrecision: 'exact',
    cityCount: (opts.cities ?? []).length, dayCount: 0, stopCount: 0, poolCount: 0, revision: 1,
    countryCodes: opts.countryCodes ?? [],
    cities: opts.cities ?? [],
    attribution: { places: opts.places ?? census(), stops: opts.stops ?? census() },
    summaryVersion: 4,
  };
}
const city = (name, cc) => ({ key: 'k-' + name, name, countryCode: cc, countrySource: cc ? 'coordinate' : null });
const byCode = (st, c) => st.countries.find((x) => x.code === c);
const byName = (st, n) => st.cities.filter((x) => x.name === n);

// ===========================================================================
head('1. A-34 — provisional at every lifecycle boundary');

// A country carried by ONE completed trip among several active/planned ones: NOT provisional.
{
  const T = '2026-08-14';
  const st = core.travelStats([
    row('done', '2019-01-01', '2019-01-10', { countryCodes: ['AT'], cities: [city('Vienna', 'AT')] }),
    row('now', '2026-08-07', '2026-08-22', { countryCodes: ['AT', 'GB'], cities: [city('Vienna', 'AT'), city('London', 'GB')] }),
    row('soon', '2027-01-01', '2027-01-10', { countryCodes: ['AT', 'JP'], cities: [city('Tokyo', 'JP')] }),
  ], T);
  eq(st.trips, { planned: 1, active: 1, completed: 1 }, 'the three-way partition');
  eq(byCode(st, 'AT').provisional, false, 'AT: one completed among an active and a planned is NOT provisional');
  eq(byCode(st, 'GB').provisional, true, 'GB: only an active trip carries it, so it IS provisional');
  ok(byCode(st, 'JP') === undefined, 'JP: only a PLANNED trip carries it, so it is absent entirely');
  eq(byName(st, 'Vienna')[0].provisional, false, 'the city half agrees for Vienna');
  eq(byName(st, 'London')[0].provisional, true, 'the city half agrees for London');
  eq(byName(st, 'Tokyo').length, 0, 'a planned trip contributes no city row');
}

// Order-independence: the completed trip arriving LAST in the caller's array must still clear
// the flag, and arriving FIRST must not let a later active trip set it again.
{
  const T = '2026-08-14';
  const done = row('z-done', '2019-01-01', '2019-01-10', { countryCodes: ['AT'], cities: [city('Vienna', 'AT')] });
  const live = row('a-now', '2026-08-07', '2026-08-22', { countryCodes: ['AT'], cities: [city('Vienna', 'AT')] });
  for (const [order, rows] of [['done first', [done, live]], ['active first', [live, done]]]) {
    const st = core.travelStats(rows, T);
    eq(byCode(st, 'AT').provisional, false, `AT is not provisional, ${order}`);
    eq(byName(st, 'Vienna')[0].provisional, false, `Vienna is not provisional, ${order}`);
  }
  // And the canonical sort must make the two orders produce identical output.
  ok(JSON.stringify(core.travelStats([done, live], T)) === JSON.stringify(core.travelStats([live, done], T)),
    'the two caller orders produce byte-identical stats');
}

// The exact day a trip stops being active.
{
  const r = [row('t', '2026-08-07', '2026-08-22', { countryCodes: ['AT'], cities: [city('Vienna', 'AT')] })];
  eq(byCode(core.travelStats(r, '2026-08-22'), 'AT').provisional, true, 'on the LAST day the trip is active -> provisional');
  eq(byCode(core.travelStats(r, '2026-08-23'), 'AT').provisional, false, 'the day AFTER endDate -> completed -> not provisional');
  ok(byCode(core.travelStats(r, '2026-08-06'), 'AT') === undefined, 'the day BEFORE startDate -> planned -> absent');
}

// A zero-day trip.
{
  const r = [row('t', '2026-08-14', '2026-08-14', { countryCodes: ['AT'], cities: [city('Vienna', 'AT')] })];
  eq(byCode(core.travelStats(r, '2026-08-14'), 'AT').provisional, true, 'a zero-day trip on its own day is active -> provisional');
  eq(byCode(core.travelStats(r, '2026-08-15'), 'AT').provisional, false, 'a zero-day trip the next day is completed');
  eq(core.travelStats(r, '2026-08-14').daysTravelled, 1, 'a zero-day trip is one day travelled');
}

// An INVERTED row (endDate before startDate) — A-31 says it degenerates to its start day.
{
  const r = [row('t', '2026-08-20', '2026-08-10', { countryCodes: ['AT'] })];
  const st = core.travelStats(r, '2026-08-30');
  eq(st.daysTravelled, 1, 'an inverted row degenerates to one day');
  eq(byCode(st, 'AT').firstVisit, '2026-08-20', 'firstVisit is the startDate');
  eq(byCode(st, 'AT').lastVisit, '2026-08-20', 'lastVisit is clamped up to the startDate, not left behind it');
  eq(byCode(st, 'AT').provisional, false, 'lifecycle says completed, so it is not provisional');
}

// Every row in the output carries the field, and it is a real boolean.
{
  const st = core.travelStats([
    row('a', '2019-01-01', '2019-01-05', { countryCodes: ['AT'], cities: [city('Vienna', 'AT')] }),
    row('b', '2026-08-07', '2026-08-22', { countryCodes: ['GB'], cities: [city('London', 'GB')] }),
  ], '2026-08-14');
  ok(st.countries.every((c) => typeof c.provisional === 'boolean'), 'every country row carries a boolean provisional');
  ok(st.cities.every((c) => typeof c.provisional === 'boolean'), 'every city row carries a boolean provisional');
  ok(JSON.stringify(st).includes('"provisional"'), 'provisional survives JSON.stringify');
}

// ===========================================================================
head('2. R28-4 — the clamp, and what it now hides');

// The invariant holds instead of going negative.
{
  const st = core.travelStats([row('a', '2020-01-01', '2020-01-05', { places: census(4, 8), stops: census(2, 9) })], '2030-01-01');
  eq(st.unattributed.places, 0, 'attributed > located no longer yields a negative places count');
  eq(st.unattributed.stops, 0, 'nor a negative stops count');
  eq(st.located.places, 4, 'and `located` is reported as given');
  ok(st.unattributed.places <= st.located.places && st.unattributed.stops <= st.located.stops,
    'the documented "never greater than located" invariant holds');
}

// The clamp is PER ROW, so an impossible row cannot pay for another row's genuine hole.
{
  const st = core.travelStats([
    row('bad', '2020-01-01', '2020-01-05', { places: census(10, 20) }),   // impossible: -10
    row('real', '2021-01-01', '2021-01-05', { places: census(10, 0) }),   // a genuine hole of 10
  ], '2030-01-01');
  eq(st.unattributed.places, 10, 'the genuine hole survives; the impossible row contributes 0, not -10');
  eq(st.located.places, 20, 'both rows count toward `located`');
}

// **What the clamp hides.** An impossible census is now indistinguishable, in the output, from
// a perfectly attributed one. There is no Issue, no flag, and `located` is still inflated by it.
{
  const impossible = core.travelStats([row('a', '2020-01-01', '2020-01-05', { places: census(10, 999) })], '2030-01-01');
  const perfect = core.travelStats([row('a', '2020-01-01', '2020-01-05', { places: census(10, 10) })], '2030-01-01');
  ok(JSON.stringify(impossible) === JSON.stringify(perfect),
    'NOTE (not a FAIL): a census of {located:10, attributed:999} is byte-identical in the output to ' +
    '{located:10, attributed:10} — the impossibility is silent. `TravelStats` has no Issue channel, ' +
    'which is why A-31 Part 2 ruled the clamp; recorded so the trade is on the record.');
}

// A missing / half-shaped census contributes nothing and never throws (R28-3), whatever `today`.
{
  for (const [label, today] of [['completed', '2030-01-01'], ['active', '2020-01-03'], ['planned', '2010-01-01']]) {
    const bare = row('a', '2020-01-01', '2020-01-05', { cities: [city('Split', 'HR')], countryCodes: ['HR'] });
    delete bare.attribution;
    let threw = null, st = null;
    try { st = core.travelStats([bare], today); } catch (e) { threw = e.message; }
    ok(threw === null, `a version-3 row does not throw when the trip is ${label} (threw: ${threw})`);
    if (st && label !== 'planned') {
      eq(st.located.places, 0, `${label}: no census invented for places`);
      eq(st.located.cities, 1, `${label}: the cities the row DOES carry still count`);
    }
  }
  // Half-shaped: `attribution` present but `stops` missing.
  const half = row('a', '2020-01-01', '2020-01-05', { places: census(6, 2) });
  delete half.attribution.stops;
  let threw = null, st = null;
  try { st = core.travelStats([half], '2030-01-01'); } catch (e) { threw = e.message; }
  ok(threw === null, `a half-shaped census does not throw (threw: ${threw})`);
  if (st) { eq(st.located.places, 6, 'the half that IS there counts'); eq(st.located.stops, 0, 'the half that is not contributes 0'); }
}

// ===========================================================================
head('3. R28-5 — `undefined` and `null` are one answer');
{
  const u = { key: 'k-u', name: 'Nowhere', countryCode: undefined, countrySource: null };
  const n = { key: 'k-n', name: 'Nowhere', countryCode: null, countrySource: null };
  const su = core.travelStats([row('a', '2020-01-01', '2020-01-05', { cities: [u] })], '2030-01-01');
  const sn = core.travelStats([row('a', '2020-01-01', '2020-01-05', { cities: [n] })], '2030-01-01');
  eq(su.unattributed.cities, 1, 'an `undefined` code is counted as unattributed');
  eq(sn.unattributed.cities, 1, 'as is a `null` one');
  eq(su.cities[0].countryCode, null, 'and it is EMITTED as null, so JSON.stringify keeps it');
  ok(JSON.stringify(su) === JSON.stringify(sn), 'undefined and null produce byte-identical output');
  ok(JSON.stringify(su.cities[0]).includes('"countryCode":null'), 'the key survives serialisation');
  // Both in one call: one row, not two.
  const both = core.travelStats([row('a', '2020-01-01', '2020-01-05', { cities: [u, n] })], '2030-01-01');
  eq(both.cities.length, 1, 'an undefined-coded and a null-coded city of the same name are ONE row');
  eq(both.unattributed.cities, 2, 'and both are counted as unattributed');
}

// ===========================================================================
head('4. the composite key — the sentinel, and the widths it assumes');
{
  // Round 28's open expectation, re-stated: a stored code of `--` collides with null.
  const st = core.travelStats([row('a', '2020-01-01', '2020-01-05', {
    cities: [city('Paris', '--'), { key: 'k2', name: 'Paris', countryCode: null, countrySource: null }],
  })], '2030-01-01');
  ok(st.cities.length === 2,
    `a stored countryCode of '--' does not collide with null (got ${st.cities.length} row(s)) — ` +
    'round 28 filed this and I-7a left it open; it needs a corrupt row to reach');
  // NEW: the code's docstring claims the country prefix "is always exactly two characters".
  // An empty-string code is neither null nor two characters, and `??` does not catch it.
  const empty = core.travelStats([row('a', '2020-01-01', '2020-01-05', {
    cities: [{ key: 'k1', name: 'Paris', countryCode: '', countrySource: null }],
  })], '2030-01-01');
  eq(empty.unattributed.cities, 0,
    "NOTE: a countryCode of '' is not counted as unattributed and is emitted as '' — `?? null` " +
    'only catches null/undefined, so the "always exactly two characters" comment on NO_COUNTRY is ' +
    'false for a value out of storage. Needs a corrupt row; recorded, not filed as a defect.');
  // The collision this actually enables: a one-character code plus a name starting with `|`.
  const collide = core.travelStats([row('a', '2020-01-01', '2020-01-05', {
    cities: [{ key: 'k1', name: 'x', countryCode: 'A|', countrySource: null },
             { key: 'k2', name: '|x', countryCode: 'A', countrySource: null }],
  })], '2030-01-01');
  console.log(`      note: countryCode 'A|' + name 'x' vs 'A' + '|x' -> ${collide.cities.length} row(s)`);
}

// ===========================================================================
head('5. the calendar under the row — years the old code destroyed');
{
  const st = core.travelStats([
    row('a', '0001-01-01', '0001-12-31', { countryCodes: ['JP'] }),
    row('b', '1901-01-01', '1901-12-31', { countryCodes: ['JP'] }),
  ], '2030-01-01');
  eq(st.daysTravelled, 730, 'a year-0001 trip and a year-1901 trip are 730 days, not 365');
  eq(byCode(st, 'JP').firstVisit, '0001-01-01', 'firstVisit is year 1, not 1901');
  eq(byCode(st, 'JP').lastVisit, '1901-12-31', 'lastVisit is 1901');
  const p = core.travelStats([row('a', '0500-06-01', '0500-06-10', { countryCodes: ['JP'] })], '2030-01-01');
  eq(byCode(p, 'JP').firstVisit, '0500-06-01', 'a year-0500 firstVisit is four digits, not "500-06-01"');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(byCode(p, 'JP').firstVisit) && /^\d{4}-\d{2}-\d{2}$/.test(byCode(p, 'JP').lastVisit),
    'and both dates parse as IsoDates');
}

// ===========================================================================
head('6. purity, after A-34');
{
  const rows = [
    row('a', '2019-01-01', '2019-01-05', { countryCodes: ['AT'], cities: [city('Vienna', 'AT')] }),
    row('b', '2026-08-07', '2026-08-22', { countryCodes: ['GB'], cities: [city('London', 'GB')] }),
  ];
  const frozen = rows.map((r) => {
    const deepFreeze = (o) => { Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
    return deepFreeze(structuredClone(r));
  });
  const before = JSON.stringify(frozen);
  let threw = null;
  try { core.travelStats(Object.freeze(frozen), '2026-08-14'); } catch (e) { threw = e.message; }
  ok(threw === null, `a deep-frozen readonly input does not throw (threw: ${threw})`);
  ok(JSON.stringify(frozen) === before, 'the input is unchanged');
  const s1 = core.travelStats(rows, '2026-08-14');
  s1.countries[0].provisional = !s1.countries[0].provisional;
  const s2 = core.travelStats(rows, '2026-08-14');
  ok(s2.countries[0].provisional !== s1.countries[0].provisional,
    'mutating an output row does not poison the next call');
}

// ===========================================================================
head('7. A-32 Part 8 residue 3 — can travelStats emit a non-IsoDate?');
{
  // A-32 Part 4 keeps `fromDayNumber` total, and Part 8 residue 3 bounds the reach of a
  // five-digit or negative year: *"the only way to reach it is a date that already carries an
  // `invalid_calendar_date` issue"*, with the trigger *"a second way to reach it that does
  // not"*. `travelStats`' input is not a document, it is a summary row — and a row carries no
  // issues, is never revalidated on read, and is exactly what I-8's Map and Profile render.
  const r = row('a', '9999-12-01', '9999-13-45', { countryCodes: ['JP'] });   // shape-valid, calendar-invalid
  const st = core.travelStats([r], '9999-99-99');
  const lv = byCode(st, 'JP').lastVisit;
  console.log(`      note: a row with endDate 9999-13-45 yields lastVisit = ${JSON.stringify(lv)}`);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(lv),
    'travelStats emits an IsoDate for `lastVisit` — a row is not a document and carries no ' +
    '`invalid_calendar_date` issue to bound residue 3 with');
  // `fromJSON` accepts the document that mints such a row, so no storage corruption is needed;
  // `validateTrip` does report `invalid_calendar_date` on the DOCUMENT, which is residue 3's
  // stated bound — but nothing carries that fact onto the row, or onto the statistic.
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}`);
process.exit(0);
