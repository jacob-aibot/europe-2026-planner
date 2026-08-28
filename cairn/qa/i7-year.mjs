/**
 * QA round 28 (I-7) — R28-1 root cause: `dayNumber`/`fromDayNumber` and years below 1000.
 *
 * A-31 Part 4 step 5 names year `0001` as the reason `daysTravelled` is a sweep and not a
 * `Set`, and `travelStats.test.ts` asserts the year-0001 answer. This probe shows the answer
 * is right for the wrong reason, and that the same pair of helpers can emit a `firstVisit`
 * that its own `parseIsoDate` rejects.
 *
 *   node --experimental-strip-types qa/i7-year.mjs
 */
import * as core from '../packages/core/src/index.ts';
import { dayNumber, fromDayNumber, parseIsoDate } from '../packages/core/src/derive/summary.ts';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const head = (s) => console.log(`\n== ${s} ==`);

head('1. Date.UTC maps years 0..99 to 1900..1999 — the ES legacy two-digit rule');
console.log('   Date.UTC(1, 0, 1)   ->', new Date(Date.UTC(1, 0, 1)).toISOString());
console.log('   Date.UTC(99, 0, 1)  ->', new Date(Date.UTC(99, 0, 1)).toISOString());
console.log('   Date.UTC(100, 0, 1) ->', new Date(Date.UTC(100, 0, 1)).toISOString());
ok(dayNumber('0001-01-01') !== dayNumber('1901-01-01') , 'dayNumber("0001-01-01") is distinct from "1901-01-01"');
ok(dayNumber('0099-06-15') !== dayNumber('1999-06-15'), 'dayNumber("0099-06-15") is distinct from "1999-06-15"');
console.log(`   dayNumber('0001-01-01') = ${dayNumber('0001-01-01')}  fromDayNumber -> ${fromDayNumber(dayNumber('0001-01-01'))}`);
console.log(`   dayNumber('1901-01-01') = ${dayNumber('1901-01-01')}`);

head('2. the consequence in travelStats');
{
  const mk = (id, a, b) => ({
    id, title: id, startDate: a, endDate: b, datePrecision: 'exact', cityCount: 0, dayCount: 0,
    stopCount: 0, poolCount: 0, revision: 1, countryCodes: ['IT'], cities: [],
    attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
    summaryVersion: 4,
  });
  const ancient = core.travelStats([mk('a', '0001-01-01', '0001-12-31')], '2026-08-28');
  console.log('   year-0001 row ->', JSON.stringify({
    days: ancient.daysTravelled, first: ancient.countries[0].firstVisit, last: ancient.countries[0].lastVisit,
  }));
  ok(ancient.countries[0].firstVisit === '0001-01-01',
    `firstVisit of a year-0001 trip round-trips (got ${ancient.countries[0].firstVisit})`);
  // Two DIFFERENT ancient trips 1900 years apart are reported as the same interval.
  const both = core.travelStats([mk('a', '0001-01-01', '0001-01-10'), mk('b', '1901-01-01', '1901-01-10')], '2026-08-28');
  ok(both.daysTravelled === 20,
    `a year-0001 trip and a year-1901 trip are 20 distinct days (got ${both.daysTravelled}) ` +
    '— the union collapsed two trips 1900 years apart into one');
}

head('3. years 100..999 emit a malformed IsoDate that parseIsoDate itself rejects');
{
  const n = dayNumber('0500-06-01');
  const back = fromDayNumber(n);
  console.log(`   dayNumber('0500-06-01') = ${n}; fromDayNumber -> ${JSON.stringify(back)}`);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(back), `fromDayNumber emits YYYY-MM-DD for year 500 (got ${JSON.stringify(back)})`);
  let reparsed = 'ok';
  try { parseIsoDate(back); } catch (e) { reparsed = e.message; }
  ok(reparsed === 'ok', `the emitted date re-parses (${reparsed})`);
  const mk = (id, a, b) => ({
    id, title: id, startDate: a, endDate: b, datePrecision: 'exact', cityCount: 0, dayCount: 0,
    stopCount: 0, poolCount: 0, revision: 1, countryCodes: ['IT'], cities: [],
    attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
    summaryVersion: 4,
  });
  const st = core.travelStats([mk('a', '0500-06-01', '0500-06-10')], '2026-08-28');
  console.log('   travelStats firstVisit ->', JSON.stringify(st.countries[0].firstVisit));
  ok(/^\d{4}-\d{2}-\d{2}$/.test(st.countries[0].firstVisit),
    `travelStats emits a well-formed IsoDate for a year-500 trip (got ${JSON.stringify(st.countries[0].firstVisit)})`);
}

head('4. is a sub-1000 year reachable through the product, or only hand-built?');
{
  const ctx = { ids: core.sequentialIds('x'), now: '2026-08-28' };
  let made = null, err = null;
  try {
    made = core.createTrip({ title: 'Ancient', startDate: '0500-06-01', endDate: '0500-06-03', homeCurrency: 'USD' }, ctx);
  } catch (e) { err = e.message; }
  ok(made !== null, `createTrip accepts a year-500 trip (err: ${err})`);
  if (made) {
    console.log(`   days[0].date = ${JSON.stringify(made.days[0].date)} (startDate ${made.startDate})`);
    let rt = null, rtErr = null;
    try { rt = core.fromJSON(core.toJSON(made)); } catch (e) { rtErr = `${e.name}: ${e.message} at ${e.path ?? '?'}`; }
    ok(rt !== null, `the created document survives toJSON -> fromJSON`, rtErr);
    if (rtErr) console.log('        ^^ the document is unloadable. Through the UI it is already in storage.');
    if (rt) {
      const st = core.travelStats([core.tripSummary(rt, core.COUNTRY_INDEX)], '2026-08-28');
      ok(st.daysTravelled === 3, `a real year-500 document reports 3 days (got ${st.daysTravelled})`);
    }
  }
  let made2 = null, err2 = null;
  try {
    made2 = core.createTrip({ title: 'Ancienter', startDate: '0001-01-01', endDate: '0001-01-03', homeCurrency: 'USD' }, { ids: core.sequentialIds('y'), now: '2026-08-28' });
  } catch (e) { err2 = e.message; }
  ok(made2 !== null, `createTrip accepts a year-0001 trip (err: ${err2})`);
  if (made2) {
    const st = core.travelStats([core.tripSummary(made2, core.COUNTRY_INDEX)], '2026-08-28');
    console.log('   year-0001 through createTrip:', JSON.stringify({ days: st.daysTravelled, trips: st.trips }));
    ok(st.trips.completed === 1, `a year-0001 trip is completed as of 2026 (got ${JSON.stringify(st.trips)})`);
  }
}

console.log(fails === 0 ? '\nALL OK' : `\n${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
