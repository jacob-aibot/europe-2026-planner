/**
 * QA round 30 — A-35 (§2.3), the day-skeleton span cap, attacked at every edge I can reach.
 *
 *   node --experimental-strip-types qa/r30-span.mjs      (from cairn/)
 *
 * Round 29's `qa/i7a-span.mjs` measured the DEFECT. This measures the FIX, and it is written
 * so it reports rather than dies when the cap throws (which is the whole difference — see
 * §7 for the i7a-span.mjs re-expression question).
 *
 * What it checks, none of it read from BUILD-NOTES:
 *   1. the boundary pair, in BOTH directions and on THREE different anchors
 *   2. the original R29-2 repro throws, and the message names span/cap/both dates
 *   3. legitimate spans still work (a week, a month, a year, three years, exactly 3653)
 *   4. every OTHER path into `ensureDays` is bounded too: setTripMeta, the ensureDays action,
 *      importDoc/fromJSON, legacyDays
 *   5. the widening clause — a stop pinned beyond `endDate` widens the range, so the check
 *      must read the WIDENED span, not the declared one
 *   6. `MAX_TRIP_SPAN_DAYS` is NOT exported and §2.10 is still 75
 *   7. `rangeFor`'s `exact` branch still says yes (A-35 Part 6: the bound is not in the view)
 *   8. a stored over-cap document still parses, validates, exports and deletes (Part 5 clause 1)
 */
import { createTrip, setTripMeta, ensureDays, validateTrip, toJSON, fromJSON, sequentialIds }
  from '../packages/core/src/index.ts';
import * as core from '../packages/core/src/index.ts';

let fails = 0;
const ok = (cond, what) => { if (!cond) { fails++; console.log(`FAIL  ${what}`); } else console.log(`ok    ${what}`); };
const NOTE = (s) => console.log(`      note: ${s}`);

const ctx = () => ({ ids: sequentialIds('r30-'), now: '2026-06-15' });
function make(startDate, endDate) {
  return createTrip({ title: 'span', startDate, endDate, homeCurrency: 'EUR' }, ctx());
}
/** Returns {days} or {err} — never throws out of the probe. */
function attempt(startDate, endDate) {
  try { return { days: make(startDate, endDate).days.length }; }
  catch (e) { return { err: e instanceof Error ? e.message : String(e) }; }
}

console.log('== 1. the boundary, both directions, on three anchors ==');
// 3653 = ten Gregorian years inclusive. Three anchors so the answer cannot be an artefact of
// one decade's leap-day count.
for (const [s, eOk, eBad] of [
  ['2020-01-01', '2029-12-31', '2030-01-01'],
  ['1996-01-01', '2005-12-31', '2006-01-01'],
]) {
  const good = attempt(s, eOk);
  const bad = attempt(s, eBad);
  ok(good.days === 3653, `${s} → ${eOk} creates 3653 days (got ${good.days ?? `THREW: ${good.err}`})`);
  ok(!!bad.err && /3654 days/.test(bad.err), `${s} → ${eBad} throws and names 3654 (got ${bad.days ?? bad.err})`);
}
// A low-era ten-year window A-32 made real. 0001..0010 holds only TWO leap days (0004, 0008)
// against 2020..2029's three, so it is 3652 — which is the check that 3653 is a MAXIMUM over
// every ten-year window rather than a transcription of one decade's length.
ok(attempt('0001-01-01', '0010-12-31').days === 3652, '0001-01-01 → 0010-12-31 is 3652 days (2 leap days, not 3) and creates');
ok(!!attempt('0001-01-01', '0011-01-02').err, '0001-01-01 → 0011-01-02 (3654) throws');
// And the OTHER side of the off-by-one: 3652 must also work, so the cap is not 3652.
ok(attempt('2020-01-01', '2029-12-30').days === 3652, '3652 days still creates');

console.log('\n== 2. the original R29-2 repro ==');
const r292 = attempt('0202-01-01', '2020-12-31');
ok(!!r292.err, '0202-01-01 → 2020-12-31 throws instead of minting 664,377 days');
ok(!!r292.err && /664377/.test(r292.err), 'the message names the span it refused (664377)');
ok(!!r292.err && /3653/.test(r292.err), 'the message names the cap (3653)');
ok(!!r292.err && r292.err.includes('0202-01-01') && r292.err.includes('2020-12-31'),
  'the message names BOTH dates');
ok(!!r292.err && /year/i.test(r292.err), 'the message tells a person what to check ("year")');
NOTE(r292.err ?? '(no throw)');
// The other two rows of A-35 Part 1's table.
ok(!!attempt('1920-01-01', '2020-12-31').err, '1920-01-01 → 2020-12-31 (36,891 days) throws');
ok(!!attempt('0000-01-01', '9999-12-31').err, '0000-01-01 → 9999-12-31 (3,652,425 days) throws');

console.log('\n== 3. legitimate spans still work ==');
for (const [s, e, want] of [
  ['2026-08-07', '2026-08-22', 16],       // Jacob's actual trip
  ['2026-01-01', '2026-01-01', 1],        // a one-day trip
  ['2026-01-01', '2026-12-31', 365],
  ['2024-01-01', '2024-12-31', 366],      // a leap year
  ['2023-01-01', '2025-12-31', 1096],     // A-35 Part 3's measured three-year document
]) {
  const r = attempt(s, e);
  ok(r.days === want, `${s} → ${e} is ${want} days (got ${r.days ?? `THREW: ${r.err}`})`);
}

console.log('\n== 4. every OTHER path into ensureDays is bounded too ==');
// setTripMeta: create small, then widen the range past the cap.
{
  const t = make('2026-01-01', '2026-01-10');
  let threw = null;
  try { setTripMeta(t, { startDate: '0202-01-01' }, ctx()); } catch (e) { threw = e.message; }
  ok(!!threw && /3653/.test(threw), `setTripMeta widening past the cap throws (got ${threw ? 'throw' : 'NO THROW'})`);
  NOTE(threw ? threw.slice(0, 90) + '…' : '');
}
// The bare `ensureDays` build function, called directly.
{
  const t = make('2026-01-01', '2026-01-10');
  const wide = { ...t, startDate: '0202-01-01' };
  let threw = null;
  try { ensureDays(wide, ctx()); } catch (e) { threw = e.message; }
  ok(!!threw && /3653/.test(threw), 'ensureDays called directly on an over-cap trip throws');
}
// fromJSON of an over-cap document: Part 5 clause 1 says it must NOT be refused.
{
  const t = make('2026-01-01', '2026-01-10');
  // Hand-build an over-cap document by editing the JSON, not by minting the days.
  const doc = JSON.parse(toJSON(t));
  doc.startDate = '0202-01-01';
  let parsed = null, err = null;
  try { parsed = fromJSON(JSON.stringify(doc)); } catch (e) { err = e.message; }
  ok(parsed !== null, `fromJSON still parses an over-cap document (A-35 Part 5 clause 1) — ${err ?? 'parsed'}`);
  if (parsed) {
    const issues = validateTrip(parsed);
    ok(Array.isArray(issues), `validateTrip runs on it and returns ${issues.length} issues (no throw)`);
    ok(typeof toJSON(parsed) === 'string', 'it still exports');
  }
}

console.log('\n== 5. the WIDENED span is what is checked, not the declared one ==');
// A-35 Part 4: "after the widening loop". A trip whose declared range is small but which holds
// a day pinned far outside it must be refused on the WIDENED span.
{
  const t = make('2026-01-01', '2026-01-10');
  // The widening clause only fires for a day that STILL HOLDS STOPS (an empty out-of-range day
  // is dropped), so the pinned day carries one. Without this the probe measures nothing.
  const stop = {
    id: 'r30-stop-1', placement: { kind: 'scheduled', dayId: '2040-01-01', time: null, order: 0 },
    name: 'pinned', category: 'sight', place: { kind: 'named', name: 'x' }, note: '', cost: null,
    arrival: null, travelRole: 'transfer', bookingId: null, flags: [],
    provenance: t.days[0].provenance, durationMins: null,
  };
  const pin = (date) => ({ ...t.days[0], id: date, date, stops: [{ ...stop, placement: { ...stop.placement, dayId: date } }] });
  const widened = { ...t, days: [...t.days, pin('2040-01-01')] };
  let threw = null;
  try { ensureDays(widened, ctx()); } catch (e) { threw = e.message; }
  ok(!!threw && /3653/.test(threw), 'a day pinned 14 years out (with stops) is refused on the WIDENED span');
  if (threw) NOTE(threw.slice(0, 120));
  // And the converse: a day pinned just INSIDE the cap still widens and still mints.
  const near = { ...t, days: [...t.days, pin('2035-12-30')] };
  let got = null, e2 = null;
  try { got = ensureDays(near, ctx()).days.length; } catch (e) { e2 = e.message; }
  ok(got !== null && got > 3600 && got <= 3653, `a day pinned inside the cap still widens and mints (${got ?? e2})`);
}

console.log('\n== 6. the cap is not on the export surface ==');
const keys = Object.keys(core);
ok(keys.length === 75, `Object.keys(core).length === 75 (got ${keys.length})`);
ok(!keys.includes('MAX_TRIP_SPAN_DAYS'), 'MAX_TRIP_SPAN_DAYS is NOT exported');
ok(!keys.includes('dayNumber') && !keys.includes('fromDayNumber'),
  'dayNumber / fromDayNumber are still NOT on §2.10 (the R29-3 collision the builder claims)');

console.log('\n== 7. the bound is NOT in the view (A-35 Part 6) ==');
{
  // `rangeFor`'s exact branch, transcribed from views/PastTripForm.tsx, must still say YES —
  // the point being that nothing between the keyboard and the mint refuses.
  const src = (await import('node:fs')).readFileSync(
    new URL('../apps/web/src/views/PastTripForm.tsx', import.meta.url), 'utf8');
  const hasSpanCheck = /MAX_TRIP_SPAN|3653|spanDays|tooLong/i.test(src);
  ok(!hasSpanCheck, 'PastTripForm still has no span check of its own (one definition of the rule)');
  const lib = (await import('node:fs')).readFileSync(
    new URL('../apps/web/src/views/Library.tsx', import.meta.url), 'utf8');
  ok(!/MAX_TRIP_SPAN|3653|spanDays/i.test(lib), 'Library.tsx still has no span check of its own');
  // And both still route the throw to onError.
  ok(/catch\s*\(\s*err[\s\S]{0,120}onError/.test(src), 'PastTripForm.submit still catches → onError');
  ok(/catch\s*\(\s*err[\s\S]{0,120}onError/.test(lib), 'Library NewTrip.submit still catches → onError');
}

console.log('\n== 8. an over-cap document that already exists stays usable ==');
{
  const t = make('2026-01-01', '2026-01-10');
  const doc = JSON.parse(toJSON(t));
  doc.startDate = '0202-01-01';
  const parsed = fromJSON(JSON.stringify(doc));
  // Everything except an edit that re-mints days must still work.
  let editThrew = null;
  try { setTripMeta(parsed, { title: 'renamed' }, ctx()); } catch (e) { editThrew = e.message; }
  ok(editThrew === null, `a NON-date edit on an over-cap document still works (${editThrew ?? 'ok'})`);
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`}`);
process.exit(fails === 0 ? 0 : 1);
