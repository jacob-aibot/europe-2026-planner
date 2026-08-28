/**
 * QA round 28 (I-7) — `travelStats` boundary battery.
 *
 * Attacks A-31 Part 4 steps 2, 4, 5 and 7 at the places the shipped unit tests do not reach:
 * endpoint-touching intervals, the `today` clamp on its exact day, dates before the epoch,
 * the composite city key's separator, `undefined` where the type says `null`, the
 * `attributed > located` invariant, deep-freeze purity, and the *cost* of the year-0001 case
 * (the builder asserted its answer but not that it is not a `Set`).
 *
 *   node --experimental-strip-types qa/i7-edges.mjs
 */
import * as core from '../packages/core/src/index.ts';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const eq = (a, b, m) => ok(Object.is(a, b), `${m} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
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

// ---------------------------------------------------------------------------
head('daysTravelled — interval union at every boundary');
const T = '2030-01-01';
// [a,b] and [b,c] share exactly one day. Union must count it ONCE.
eq(core.travelStats([row('a', '2020-01-01', '2020-01-10'), row('b', '2020-01-10', '2020-01-20')], T).daysTravelled,
  20, 'endpoint-to-endpoint [1..10]+[10..20] is 20 days, not 21');
// Adjacent but not overlapping: no day between them, and none invented.
eq(core.travelStats([row('a', '2020-01-01', '2020-01-10'), row('b', '2020-01-11', '2020-01-20')], T).daysTravelled,
  20, 'adjacent [1..10]+[11..20] is 20 days');
// A real gap of one day.
eq(core.travelStats([row('a', '2020-01-01', '2020-01-10'), row('b', '2020-01-12', '2020-01-20')], T).daysTravelled,
  19, 'a one-day gap is not travelled');
// Containment.
eq(core.travelStats([row('a', '2020-01-01', '2020-01-31'), row('b', '2020-01-10', '2020-01-12')], T).daysTravelled,
  31, 'a trip wholly inside another adds nothing');
// Containment when the CONTAINED row sorts first by id but later by start (ordering trap).
eq(core.travelStats([row('z', '2020-01-01', '2020-01-31'), row('a', '2020-01-10', '2020-01-12')], T).daysTravelled,
  31, 'containment holds regardless of id order');
// Three-way: B extends A, C is inside A -- the sweep must not shrink `cur.b`.
eq(core.travelStats([
  row('a', '2020-01-01', '2020-01-20'), row('b', '2020-01-05', '2020-01-06'), row('c', '2020-01-15', '2020-02-01'),
], T).daysTravelled, 32, 'a short interval between two long ones does not truncate the run');
// Same day twice.
eq(core.travelStats([row('a', '2020-05-05', '2020-05-05'), row('b', '2020-05-05', '2020-05-05')], T).daysTravelled,
  1, 'two zero-day trips on the same day are one day');
// Month/year rollover.
eq(core.travelStats([row('a', '2019-12-28', '2020-01-03')], T).daysTravelled, 7, 'a year rollover is 7 days');
// Leap day.
eq(core.travelStats([row('a', '2020-02-28', '2020-03-01')], T).daysTravelled, 3, '2020 leap day is counted');
eq(core.travelStats([row('a', '2019-02-28', '2019-03-01')], T).daysTravelled, 2, '2019 has no Feb 29');

// ---------------------------------------------------------------------------
head('the `today` clamp, on its exact days');
const s = (r) => core.travelStats(r.rows, r.today);
eq(s({ rows: [row('a', '2026-08-07', '2026-08-22')], today: '2026-08-07' }).daysTravelled, 1,
  'active on day 1 contributes exactly 1 day');
eq(s({ rows: [row('a', '2026-08-07', '2026-08-22')], today: '2026-08-08' }).daysTravelled, 2,
  'active on day 2 contributes exactly 2 days (A-31 Part 3.1)');
eq(s({ rows: [row('a', '2026-08-07', '2026-08-22')], today: '2026-08-22' }).daysTravelled, 16,
  'today == endDate is still active and contributes the whole span');
eq(s({ rows: [row('a', '2026-08-07', '2026-08-22')], today: '2026-08-23' }).daysTravelled, 16,
  'today == endDate+1 is completed, same span');
eq(s({ rows: [row('a', '2026-08-07', '2026-08-22')], today: '2026-08-06' }).daysTravelled, 0,
  'today == startDate-1 is planned, contributes nothing');
{
  const st = s({ rows: [row('a', '2026-08-07', '2026-08-22', { countryCodes: ['AT'] })], today: '2026-08-09' });
  eq(st.countries[0].lastVisit, '2026-08-09', 'an active trip\'s lastVisit is `today`, not endDate');
  eq(st.countries[0].firstVisit, '2026-08-07', 'an active trip\'s firstVisit is startDate');
}
{
  // Two active trips, both clamped to today, overlapping.
  const st = s({ rows: [row('a', '2026-08-01', '2026-12-01'), row('b', '2026-08-05', '2026-12-01')], today: '2026-08-10' });
  eq(st.trips.active, 2, 'two active trips');
  eq(st.daysTravelled, 10, 'both clamped at today, union Aug 1..10');
}

// ---------------------------------------------------------------------------
head('dates outside the comfortable range');
{
  const st = core.travelStats([row('a', '1969-12-25', '1970-01-05', { countryCodes: ['US'] })], T);
  eq(st.daysTravelled, 12, 'a pre-epoch span is 12 days (negative day numbers)');
  eq(st.countries[0].firstVisit, '1969-12-25', 'fromDayNumber round-trips a negative day number');
  eq(st.countries[0].lastVisit, '1970-01-05', 'fromDayNumber round-trips across the epoch');
}
{
  const st = core.travelStats([row('a', '0001-01-01', '0001-12-31', { countryCodes: ['IT'] })], T);
  eq(st.daysTravelled, 365, 'year 0001 gives 365 days');
  // R28-1 lives here and is demonstrated properly in qa/i7-year.mjs and qa/i7-pastyear.mjs:
  // `Date.UTC` maps years 0..99 to 1900..1999, so this "365" is 1901's, not 0001's.
  console.log(`   note: year-0001 firstVisit comes back as ${JSON.stringify(st.countries[0].firstVisit)} — R28-1`);
}
{
  // COST, not answer: the builder flagged this as unverified. A Set-of-day-numbers or a
  // per-day loop over the widest interval an IsoDate admits is millions of iterations per row;
  // 200 such rows would not finish in a second. The sweep is O(n log n) in ROWS.
  // `today` is the far end so every row is `active` and clamps to it — one interval, max width.
  const FAR = '9999-12-31';
  const many = [];
  for (let i = 0; i < 200; i++) many.push(row('r' + i, '0001-01-01', FAR));
  const t0 = process.hrtime.bigint();
  const st = core.travelStats(many, FAR);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  // Expected span computed through the same helpers, so this asserts the SWEEP, not the calendar.
  const expected = core.travelStats([row('one', '0001-01-01', FAR)], FAR).daysTravelled;
  eq(st.daysTravelled, expected, `200 identical max-span rows union to one interval (${expected} days)`);
  ok(ms < 250, `200 max-span rows swept in ${ms.toFixed(1)}ms (<250ms => not per-day)`);
}
{
  // Scale in the number of ROWS: 50k rows must not be quadratic.
  const many = [];
  for (let i = 0; i < 50000; i++) {
    const d = new Date(Date.UTC(2000, 0, 1 + (i % 20000))).toISOString().slice(0, 10);
    many.push(row('r' + String(i).padStart(6, '0'), d, d));
  }
  const t0 = process.hrtime.bigint();
  core.travelStats(many, T);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  ok(ms < 3000, `50k rows in ${ms.toFixed(1)}ms (<3000ms => not quadratic)`);
}

// ---------------------------------------------------------------------------
head('the composite city key — separator and sentinel');
{
  // A-31 step 7: `(nameKey, countryCode)`, null distinct. Two REAL countries whose cities the
  // index could not attribute collapse into ONE row -- spec-conformant (residue 3) but the
  // spec never says which `name` wins beyond "first in canonical order".
  const st = core.travelStats([
    row('t1', '2020-01-01', '2020-01-02', { cities: [city('Paris', null)] }),
    row('t2', '2021-01-01', '2021-01-02', { cities: [city('paris', null)] }),
  ], T);
  eq(st.cities.length, 1, 'two unattributed same-name cities merge into ONE row');
  eq(st.cities[0].name, 'Paris', 'the display name is the first member in canonical order');
  eq(st.cities[0].countryCode, null, 'the merged row is honestly null');
  eq(st.cities[0].tripIds.join(','), 't1,t2', 'both trips are credited');
}
{
  // The `--` sentinel and the `|` separator: a city literally named "US|Paris" with a null
  // country must not collide with a city named "Paris" in "US".
  const st = core.travelStats([
    row('t1', '2020-01-01', '2020-01-02', { cities: [city('US|Paris', null)] }),
    row('t2', '2021-01-01', '2021-01-02', { cities: [city('Paris', 'US')] }),
  ], T);
  eq(st.cities.length, 2, 'the fixed-width country prefix keeps a piped name from colliding');
}
{
  // A hand-built row stating the sentinel itself as a country code. `travelStats` takes
  // `readonly TripSummaryRow[]` from any caller; A-29's two-letter gate runs in `tripSummary`.
  const st = core.travelStats([
    row('t1', '2020-01-01', '2020-01-02', { cities: [city('Paris', '--')] }),
    row('t2', '2021-01-01', '2021-01-02', { cities: [city('Paris', null)] }),
  ], T);
  ok(st.cities.length === 2, `a countryCode of '--' does not collide with null (got ${st.cities.length} rows)`);
}
{
  // `undefined` where the type says `CountryCode | null`. `?? NO_COUNTRY` treats it as null for
  // the KEY; `=== null` does not, for the unattributed COUNT. Two different answers, one field.
  const c = { key: 'k', name: 'Paris', countryCode: undefined, countrySource: null };
  const st = core.travelStats([row('t1', '2020-01-01', '2020-01-02', { cities: [c] })], T);
  ok(st.unattributed.cities === 1,
    `an \`undefined\` countryCode counts as unattributed (got ${st.unattributed.cities}) ` +
    `— key path says ${JSON.stringify(st.cities[0].countryCode)}`);
}
{
  // Whitespace-only names, in several flavours.
  for (const [label, name] of [['space', '  '], ['tab', '\t'], ['NBSP', ' '], ['empty', '']]) {
    const st = core.travelStats([row('t1', '2020-01-01', '2020-01-02', { cities: [city(name, 'FR')] })], T);
    eq(st.unnamedCities, 1, `a ${label}-only city name is unnamed, not a blank row`);
    eq(st.cities.length, 0, `a ${label}-only city name emits no row`);
    eq(st.located.cities, 1, `a ${label}-only city is still located`);
  }
}
{
  // NFC/NFD: the same city typed two ways must be ONE row (normalizeCityName NFC-composes).
  const st = core.travelStats([
    row('t1', '2020-01-01', '2020-01-02', { cities: [city('Zürich', 'CH')] }),
    row('t2', '2021-01-01', '2021-01-02', { cities: [city('Zürich', 'CH')] }),
  ], T);
  eq(st.cities.length, 1, 'NFC and NFD spellings of Zurich are one row');
}
{
  // Case-folding trap: Turkish dotted I. `toLowerCase()` is locale-invariant in JS, so
  // 'ISTANBUL' -> 'istanbul' and 'İSTANBUL' -> 'i̇stanbul' are DIFFERENT keys.
  const st = core.travelStats([
    row('t1', '2020-01-01', '2020-01-02', { cities: [city('Istanbul', 'TR')] }),
    row('t2', '2021-01-01', '2021-01-02', { cities: [city('İstanbul', 'TR')] }),
  ], T);
  console.log(`   note: 'Istanbul' vs 'İstanbul' -> ${st.cities.length} row(s) ` +
    `(${st.cities.map((c) => JSON.stringify(c.nameKey)).join(', ')})`);
}

// ---------------------------------------------------------------------------
head('census invariants');
{
  // AttributionCensus says "attributed: never greater than located". Nothing enforces it, and
  // `unattributed = located - attributed` goes NEGATIVE, which the Profile would render.
  const st = core.travelStats([row('t1', '2020-01-01', '2020-01-02', { places: census(1, 5) })], T);
  ok(st.unattributed.places >= 0,
    `attributed > located gives unattributed.places = ${st.unattributed.places} (want >= 0, or a throw)`);
}
{
  // Duplicate country codes on one row must credit the trip once.
  const st = core.travelStats([row('t1', '2020-01-01', '2020-01-02', { countryCodes: ['HR', 'HR', 'HR'] })], T);
  eq(st.countries.length, 1, 'a repeated code is one country');
  eq(st.countries[0].tripIds.length, 1, 'a repeated code credits the trip once');
}
{
  // A country carried by three trips: ids in canonical order, no duplicates.
  const st = core.travelStats([
    row('c', '2020-03-01', '2020-03-05', { countryCodes: ['JP'] }),
    row('a', '2020-01-01', '2020-01-05', { countryCodes: ['JP'] }),
    row('b', '2020-01-01', '2020-01-05', { countryCodes: ['JP'] }),
  ], T);
  eq(st.countries[0].tripIds.join(','), 'a,b,c', 'tripIds are in canonical (startDate, id) order');
  eq(st.countries[0].firstVisit, '2020-01-01', 'firstVisit is the earliest start');
  eq(st.countries[0].lastVisit, '2020-03-05', 'lastVisit is the latest end');
}
{
  // A row that is planned contributes nothing at all -- including to `located`.
  const st = core.travelStats([
    row('p', '2027-01-01', '2027-01-10', {
      countryCodes: ['JP'], cities: [city('Tokyo', 'JP')], places: census(9, 9), stops: census(9, 9),
    }),
  ], '2026-08-28');
  eq(JSON.stringify(st), JSON.stringify({
    countries: [], cities: [], trips: { planned: 1, active: 0, completed: 0 }, daysTravelled: 0,
    located: { cities: 0, places: 0, stops: 0 }, unattributed: { cities: 0, places: 0, stops: 0 },
    unnamedCities: 0,
  }), 'a planned trip contributes +1 planned and literally nothing else');
}
{
  // A planned row with NO attribution census must not throw -- it is never walked.
  const bad = row('p', '2027-01-01', '2027-01-10');
  delete bad.attribution;
  let threw = null;
  try { core.travelStats([bad], '2026-08-28'); } catch (e) { threw = e.message; }
  ok(threw === null, `a PLANNED version-3 row does not throw (threw: ${threw})`);
  const bad2 = row('c', '2020-01-01', '2020-01-10', { cities: [city('Split', 'HR')] });
  delete bad2.attribution;
  let threw2 = null;
  let st2 = null;
  try { st2 = core.travelStats([bad2], T); } catch (e) { threw2 = e.message; }
  // RE-EXPRESSED BY THE BUILDER OF I-7a, and the original expectation is kept here so nobody has
  // to diff to find out what moved. This line read:
  //
  //   ok(threw2 !== null && /attribution/.test(threw2), 'a COMPLETED version-3 row throws by name');
  //
  // …which was **R28-3 itself**: the throw fired only for rows that happened to be in the past,
  // and the probe's own next line said so. The finding was routed to the builder and the fix is
  // that the throw is **gone** — a version-3 row is reachable without a caller bug (the window
  // between `refreshLibrary()` and the rescan finishing), and §2.1 lets core throw on programmer
  // error only. So the assertion is inverted rather than deleted, and it now asserts the two
  // things that make the removal safe: uniformity, and that nothing is invented in place of the
  // census the row does not carry.
  ok(threw2 === null, `a COMPLETED version-3 row does not throw either — R28-3 (threw: ${threw2})`);
  if (st2) {
    ok(st2.located.places === 0 && st2.located.stops === 0 && st2.unattributed.places === 0,
      'a row with no census contributes no census — not a guess, not a throw',
      JSON.stringify({ located: st2.located, unattributed: st2.unattributed }));
    ok(st2.located.cities === 1 && st2.cities.length === 1,
      'and everything the row DOES carry still counts', JSON.stringify(st2.cities));
  }
  console.log('   note: the stale row is now treated identically whatever `today` is.');
}

// ---------------------------------------------------------------------------
head('purity — deep freeze, aliasing, and caller order');
{
  const rows = [
    row('b', '2020-02-01', '2020-02-10', { countryCodes: ['FR'], cities: [city('Lyon', 'FR')], places: census(2, 1) }),
    row('a', '2020-01-01', '2020-01-10', { countryCodes: ['FR', 'IT'], cities: [city('Rome', 'IT')], places: census(3, 3) }),
  ];
  const deepFreeze = (v) => {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); }
    return v;
  };
  const frozen = deepFreeze(rows.slice());
  Object.freeze(frozen);
  let threw = null;
  let r1, r2;
  try { r1 = core.travelStats(frozen, T); r2 = core.travelStats(frozen, T); } catch (e) { threw = e; }
  ok(threw === null, `a deep-frozen readonly input does not throw (${threw && threw.message})`);
  ok(JSON.stringify(r1) === JSON.stringify(r2), 'two calls on one input are deep-equal');
  eq(rows[0].id, 'b', 'the caller\'s array order is untouched by the internal sort');
  // Output must not alias the input.
  ok(r1.countries[0].tripIds !== r1.countries[1]?.tripIds, 'each country has its own tripIds array');
  ok(!Object.isFrozen(r1.countries[0].tripIds), 'the output arrays are fresh, not the frozen inputs');
  // Shuffle -> same answer.
  const shuffled = [frozen[1], frozen[0]];
  ok(JSON.stringify(core.travelStats(shuffled, T)) === JSON.stringify(r1), 'shuffling the caller\'s array changes nothing');
  // Mutating the OUTPUT must not affect the next call.
  r1.countries[0].tripIds.push('injected');
  ok(JSON.stringify(core.travelStats(frozen, T)) === JSON.stringify(r2), 'mutating the output does not poison the next call');
}

console.log(fails === 0 ? '\nALL OK' : `\n${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
