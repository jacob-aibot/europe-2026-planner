/**
 * QA round 28 (I-7) — R28-1, end to end: **the "record a past trip by year" form can mint a
 * document that can never be read back, and another that silently stores days 1900 years
 * away from the trip's own dates.**
 *
 * Root cause (see `qa/i7-year.mjs` for the isolated demonstration):
 *
 *   `derive/summary.ts:23`  `dayNumber`      -> `Date.UTC(y, m-1, d)`
 *   `derive/summary.ts:28`  `fromDayNumber`  -> `${dt.getUTCFullYear()}-…`, no year padding
 *
 * `Date.UTC` applies the ES legacy two-digit-year rule: a `year` of 0..99 means 1900..1999.
 * And `getUTCFullYear()` is stringified with no `padStart(4,'0')`, so a genuine year below
 * 1000 comes back as `"500-06-01"` — three digits, which `fromJSON`'s
 * `/^\d{4}-\d{2}-\d{2}$/` (serialize/fromJSON.ts:77) rejects.
 *
 * `apps/web/src/views/PastTripForm.tsx:76` accepts **any** `/^\d{4}$/` year and builds
 * `${year}-01-01` … `${year}-12-31` from it. `0202` is a plausible mistype of `2020`.
 *
 * This probe drives the real client store over the real memory port, exactly as the form
 * does (`createTrip` -> autosave -> `toJSON`), then re-opens the trip the way a cold start
 * does (`load` -> `fromJSON`).
 *
 *   node --experimental-strip-types qa/i7-pastyear.mjs
 */
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler, core,
} from '../packages/client/src/index.ts';
import { readFileSync } from 'node:fs';

let fails = 0;
const ok = (c, m, extra) => {
  if (c) console.log(`  ok    ${m}`);
  else { fails++; console.log(`  FAIL  ${m}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const TODAY = '2026-08-28';
let seq = 0;
const ports = (storage) => ({
  storage, file: memoryFile(), clock: fixedClockPort(TODAY),
  ids: sequentialIdPort(`c${++seq}-`), scheduler: immediateScheduler(),
});

/** `rangeFor(precision:'year')`, transcribed from PastTripForm.tsx:76-77 and pinned below. */
const rangeForYear = (year) =>
  (/^\d{4}$/.test(year) ? { startDate: `${year}-01-01`, endDate: `${year}-12-31` } : null);

head('0. the form really does accept these years (source pin)');
{
  const src = readFileSync(new URL('../apps/web/src/views/PastTripForm.tsx', import.meta.url), 'utf8');
  ok(src.includes('if (!/^\\d{4}$/.test(input.year)) return null;'),
    'PastTripForm gates the year on /^\\d{4}$/ and nothing else');
  ok(src.includes('.replace(/\\D/g, \'\').slice(0, 4)'),
    'the Year input strips non-digits and truncates to 4 — "0202" is typeable');
}

async function recordPastTrip(year) {
  const range = rangeForYear(year);
  if (!range) return { range: null };
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage) });
  await store.createTrip({
    title: `Trip ${year}`,
    startDate: range.startDate,
    endDate: range.endDate,
    cities: [{ name: 'Tokyo', order: 0 }],
  });
  await store.flush?.();
  const doc = store.getState().doc;
  const id = doc.id;
  // What actually reached storage, and whether a cold start can read it back.
  const stored = await storage.load(id);
  let reopened = null, parseError = null;
  try { reopened = core.fromJSON(stored.doc); } catch (e) { parseError = `${e.name}: ${e.message} at ${e.path ?? '?'}`; }
  const rows = await storage.listTrips();
  return { range, doc, stored, reopened, parseError, row: rows.find((r) => r.id === id) };
}

// ---------------------------------------------------------------------------
head('1. year "0202" — a plausible mistype of 2020');
{
  const r = await recordPastTrip('0202');
  note(`stored range: ${r.range.startDate} → ${r.range.endDate}`);
  note(`doc.days[0].date = ${JSON.stringify(r.doc.days[0].date)}, days[0].id = ${JSON.stringify(r.doc.days[0].id)}`);
  note(`doc.days.length = ${r.doc.days.length}`);
  ok(r.parseError === null,
    'the saved document can be read back on a cold start', r.parseError);
  if (r.parseError) {
    console.log('        ^^ the trip is in storage and is now permanently unopenable: DATA LOSS');
  }
}

head('2. year "0026" — inside the ES two-digit window, so it does not even error');
{
  const r = await recordPastTrip('0026');
  note(`stored range: ${r.range.startDate} → ${r.range.endDate}`);
  note(`doc.days[0].date = ${JSON.stringify(r.doc.days[0].date)}, last = ${JSON.stringify(r.doc.days.at(-1).date)}`);
  ok(r.parseError === null, 'the document round-trips', r.parseError);
  ok(r.doc.days[0].date === r.doc.startDate,
    'days[0].date equals the trip\'s own startDate (ARCHITECTURE §2.2: days are dense over [start,end])',
    { startDate: r.doc.startDate, day0: r.doc.days[0].date });
  const issues = core.validateTrip(r.doc, TODAY);
  const blockers = issues.filter((i) => i.severity === 'blocker');
  note(`validateTrip: ${issues.length} issue(s), ${blockers.length} blocker(s) — ` +
    JSON.stringify(issues.slice(0, 3).map((i) => i.code)));
  ok(blockers.length > 0,
    'validateTrip reports a document whose days are 1900 years from its dates as a blocker');
  // And what the lifetime map says about it.
  if (r.row) {
    const st = core.travelStats([core.tripSummary(r.reopened ?? r.doc, core.COUNTRY_INDEX)], TODAY);
    note(`travelStats: daysTravelled=${st.daysTravelled}, trips=${JSON.stringify(st.trips)}`);
    ok(st.daysTravelled === 365,
      `a 365-day year-0026 trip contributes 365 days (got ${st.daysTravelled})`);
  }
}

head('3. the control — year "2019" behaves');
{
  const r = await recordPastTrip('2019');
  ok(r.parseError === null, 'a 2019 past trip round-trips', r.parseError);
  ok(r.doc.days[0].date === '2019-01-01' && r.doc.days.length === 365, 'and has 365 correct days');
  const st = core.travelStats([core.tripSummary(r.doc, core.COUNTRY_INDEX)], TODAY);
  ok(st.daysTravelled === 365, `travelStats says 365 days (got ${st.daysTravelled})`);
}

console.log(fails === 0 ? '\nALL OK' : `\n${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
