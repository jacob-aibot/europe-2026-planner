/**
 * QA round 33 — is the `lifecycle`-throws-on-a-stored-row gap REACHABLE from a shipped
 * write path, or is it a caller bug?
 *
 * The builder's I-8a report says `core.lifecycle` throws on the same class of shape-invalid
 * stored row `travelStats` throws on, and `Library.tsx` calls it per row with no read gate.
 * A-37 Part 2 says a stored row is not a validated document. But this project's standard for
 * severity is REACHABILITY (R32-2's own argument: "`createTrip` is not the only write path
 * into the database"). So: find a write path a real user has, that mints a summary row whose
 * `startDate`/`endDate` `parseIsoDate` refuses.
 *
 *   cd cairn && node --experimental-strip-types qa/r33-reach.mjs
 */
import * as core from '../packages/core/src/index.ts';
import { addDays, dayNumber } from '../packages/core/src/derive/summary.ts';

let fail = 0;
const ok = (c, m, extra) => {
  console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${extra === undefined ? '' : '  -> ' + JSON.stringify(extra)}`);
  if (!c) fail++;
};
let _n = 0;
const ctx = { now: '2026-08-31', ids: { newId: () => `id${++_n}` } };

// ---------------------------------------------------------------------------
// 1. The primitive: does `fromDayNumber` emit a string `parseIsoDate` refuses?
//    A-32 Part 4 says so IN WRITING ("the caller gets a string `parseIsoDate` refuses
//    instead of a plausible wrong date"). Confirm it rather than quoting it.
// ---------------------------------------------------------------------------
const overflow = addDays('9999-12-25', 10);
console.log(`# addDays('9999-12-25', 10) = ${JSON.stringify(overflow)}`);
ok(!/^\d{4}-\d{2}-\d{2}$/.test(overflow), 'addDays past 9999 emits a NON-IsoDate string');
let threw = null;
try { dayNumber(overflow); } catch (e) { threw = e.message; }
ok(threw !== null, `and dayNumber refuses it: ${threw}`);

// ---------------------------------------------------------------------------
// 2. Write path A — `createTrip`, the New Trip form. The date range comes from two
//    <input type="date"> fields, which accept 5-digit years natively.
// ---------------------------------------------------------------------------
let trip = null, err = null;
try {
  trip = core.createTrip(
    { title: 'Year 10000', startDate: '9999-12-25', endDate: '10000-01-04', cities: [{ name: 'Vienna' }] },
    ctx,
  );
} catch (e) { err = e.message; }
console.log(`# createTrip('9999-12-25' -> '10000-01-04'): ${err ? 'threw: ' + err : 'ACCEPTED'}`);
ok(err === null, 'createTrip ACCEPTS a range that crosses year 9999 (A-35 caps span, not year)');

if (trip) {
  console.log(`# minted ${trip.days.length} days; last day id = ${JSON.stringify(trip.days.at(-1).id)}`);
  const row = core.tripSummary(trip, core.COUNTRY_INDEX);
  console.log(`# summary row: startDate=${JSON.stringify(row.startDate)} endDate=${JSON.stringify(row.endDate)}`);
  ok(!/^\d{4}-\d{2}-\d{2}$/.test(row.endDate), 'the SUMMARY ROW carries a non-IsoDate endDate');

  // 2a. `lifecycle` — what Library.tsx calls per row.
  let lErr = null;
  try { core.lifecycle(row, ctx.now); } catch (e) { lErr = e.message; }
  ok(lErr !== null, `core.lifecycle THROWS on that row: ${lErr}`);

  // 2b. `travelStats` — what the Map's read gate catches.
  let tErr = null;
  try { core.travelStats([row], ctx.now); } catch (e) { tErr = e.message; }
  ok(tErr !== null, `core.travelStats THROWS on that row: ${tErr}`);

  // 2c. Does the row round-trip through storage? (toJSON/fromJSON is the import path.)
  let jErr = null, back = null;
  try { back = core.fromJSON(core.toJSON(trip)); } catch (e) { jErr = e.message; }
  console.log(`# fromJSON round trip: ${jErr ? 'REFUSED: ' + jErr : 'ACCEPTED, endDate=' + JSON.stringify(back.endDate)}`);
  ok(jErr === null, 'and core.fromJSON ACCEPTS the document back, so backup/restore carries it too');

  // 2d. Can the trip even be REOPENED once saved? ensureDays runs on edit.
  let eErr = null;
  try { core.addStop(back ?? trip, { kind: 'day', dayId: (back ?? trip).days[0].id }, { title: 'x' }, ctx); }
  catch (e) { eErr = e.message; }
  console.log(`# a later edit (addStop -> ensureDays path): ${eErr ? 'threw: ' + eErr : 'ok'}`);
}

// ---------------------------------------------------------------------------
// 3. Write path B — how far can a SINGLE mistyped digit get, from a plausible trip?
//    The user means 2026-08-07 -> 2026-08-22 and fats the year field.
// ---------------------------------------------------------------------------
for (const [s, e] of [['9999-12-31', '10000-01-01'], ['9999-12-28', '9999-12-31'], ['0001-01-01', '0001-01-10']]) {
  let t = null, x = null;
  try { t = core.createTrip({ title: 't', startDate: s, endDate: e, cities: [{ name: 'V' }] }, ctx); }
  catch (er) { x = er.message; }
  if (!t) { console.log(`#   ${s} -> ${e}: refused (${x.slice(0, 60)})`); continue; }
  const r = core.tripSummary(t, core.COUNTRY_INDEX);
  let bad = false;
  try { core.lifecycle(r, ctx.now); } catch { bad = true; }
  console.log(`#   ${s} -> ${e}: minted ${t.days.length} days, row ${r.startDate}..${r.endDate}, lifecycle ${bad ? 'THROWS' : 'ok'}`);
}

// ---------------------------------------------------------------------------
// 4. Write path C — PastTripForm's month/year precision. Does a `datePrecision` row
//    still carry IsoDate-shaped bounds?
// ---------------------------------------------------------------------------
try {
  const past = core.createTrip(
    { title: 'March 2019', startDate: '2019-03-01', endDate: '2019-03-31', datePrecision: 'month', cities: [{ name: 'Rome' }] },
    ctx,
  );
  const r = core.tripSummary(past, core.COUNTRY_INDEX);
  console.log(`# past trip row: ${r.startDate}..${r.endDate} precision=${r.datePrecision}`);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(r.startDate), 'the month-precision path stays IsoDate-shaped (no defect here)');
} catch (e) { console.log('# past trip path: ' + e.message); }

// ---------------------------------------------------------------------------
// 5. Write path D — `importDoc` / `fromJSON`. R32-2 established this is a real second
//    write path into the database (a shipped backup/restore feature) and used it to prove
//    `revision: 0` reachable. Does it also let a non-IsoDate date through?
// ---------------------------------------------------------------------------
{
  const good = core.createTrip(
    { title: 'Europe', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ name: 'Vienna' }] }, ctx);
  for (const bad of ['10000-01-04', '2026-8-7', '2026-02-30', '', 'March 2019', '202-01-01']) {
    const j = JSON.parse(core.toJSON(good));
    j.endDate = bad;
    let e = null, back = null;
    try { back = core.fromJSON(j); } catch (er) { e = er.message; }
    if (e) { console.log(`#   fromJSON endDate=${JSON.stringify(bad)}: REFUSED (${e.slice(0,70)})`); continue; }
    let lc = 'ok';
    try { core.lifecycle(core.tripSummary(back, core.COUNTRY_INDEX), ctx.now); } catch { lc = 'THROWS'; }
    console.log(`#   fromJSON endDate=${JSON.stringify(bad)}: ACCEPTED, lifecycle ${lc}`);
    ok(lc === 'ok', `importDoc path with endDate ${JSON.stringify(bad)} does NOT reach a throwing row`);
  }
}

console.log(fail === 0 ? '\n# ALL GREEN (every claim above CONFIRMED)' : `\n# ${fail} claim(s) NOT confirmed`);
process.exit(0);
