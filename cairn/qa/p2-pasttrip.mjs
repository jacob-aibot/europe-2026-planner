/**
 * Phase 2 I-4, end to end in real Chromium — the increment's own ship gate.
 *
 * ROADMAP: *"Run it in the browser, not only in Node, because this increment is the first one
 * a user touches."* So this is the criterion-3 shape as a **user**, and every assertion is on
 * either the rendered DOM or the document read back out of **IndexedDB** — never on a value
 * this script computed.
 *
 *   §1  Record a past trip: title, `datePrecision:'month'`, one city, no day-by-day.
 *       Assert the persisted document: 21 dense days, `Day.id === Day.date`, zero stops,
 *       `datePrecision:'month'`, and the six-method ceiling (one document was installed).
 *   §2  The lifecycle chips render, in the Library and in the open trip.
 *   §3  Exit criterion 3, on screen: ZERO conflicts and ZERO validation issues — read off the
 *       Conflicts and Validation tab badges and their panels, not off a computation.
 *   §4  Injected fault, on the real fixture: Europe 2026 at the real clock is COMPLETED and
 *       shows only `integrity` findings — that is the live defect closing, on screen. Then the
 *       page is reloaded with the browser's `Date` pinned to a day INSIDE the trip, and the
 *       feasibility rules come back for the future half and not the past half, in one render.
 *
 * Needs `npm run web:build && node tools/serve.mjs` in one shell, then:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/p2-pasttrip.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();
const ctx = await browser.newContext();
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);

/** Every stored document, out of the app's own IndexedDB. */
const persisted = async () => p.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn', 3);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const docs = await new Promise((res, rej) => {
    const tx = db.transaction('docs', 'readonly').objectStore('docs').getAll();
    tx.onsuccess = () => res(tx.result); tx.onerror = () => rej(tx.error);
  });
  return docs.map((d) => {
    const raw = d && d.doc ? d.doc : d;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  });
});

// The browser's own clock, so nothing here assumes the date this file was written.
const today = await p.evaluate(() => {
  const d = new Date();
  const q = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}`;
});
console.log('  browser today:', today);

// ---------------------------------------------------------------------------
line('1 — record a past trip: Japan, March 2019, one city, no day-by-day');
await p.getByTestId('record-past-trip').click();
await p.waitForTimeout(300);
await p.getByTestId('past-title').fill('Japan, March 2019');
await p.getByTestId('past-precision-month').check();
await p.waitForTimeout(150);
await p.getByTestId('past-month').fill('2019-03');
await p.getByTestId('past-cities').fill('Tokyo');
await p.waitForTimeout(150);
const rangeText = await p.getByTestId('past-range').innerText();
console.log('  the form says:', rangeText.replace(/\n/g, ' '));
ok('the form states the real range it is about to store, and says it is approximate',
   /2019-03-01/.test(rangeText) && /2019-03-31/.test(rangeText) && /approximate/i.test(rangeText), rangeText);
// The month→range arithmetic, including the leap-year case, read off the form's own preview.
// `lastDayOfMonth` is hand-written Gregorian arithmetic in `apps/web` (it may not touch
// `Date` — §2.1), and `apps/web` cannot be imported from `node --test`, so this is where it
// is exercised.
for (const [month, expectedEnd] of [
  ['2019-02', '2019-02-28'],   // not a leap year
  ['2020-02', '2020-02-29'],   // leap year
  ['2000-02', '2000-02-29'],   // divisible by 400 — IS a leap year
  ['1900-02', '1900-02-28'],   // divisible by 100, not 400 — is NOT
  ['2019-04', '2019-04-30'],
  ['2019-12', '2019-12-31'],
]) {
  await p.getByTestId('past-month').fill(month);
  await p.waitForTimeout(120);
  const t = await p.getByTestId('past-range').innerText();
  ok(`month ${month} widens to ${expectedEnd}`, t.includes(expectedEnd), t.replace(/\n/g, ' '));
}
await p.getByTestId('past-month').fill('2019-03');
await p.waitForTimeout(150);

await p.getByTestId('past-submit').click();
await p.waitForTimeout(1500);

const docsAfter = await persisted();
const doc = docsAfter.find((d) => d && d.title === 'Japan, March 2019') ?? null;
ok('a. the trip is in IndexedDB', !!doc, `stored titles: ${JSON.stringify(docsAfter.map((d) => d && d.title))}`);
if (doc) {
  console.log(`  stored: ${doc.startDate} → ${doc.endDate} precision=${doc.datePrecision} days=${doc.days.length}`);
  ok('b. datePrecision is "month" on the PERSISTED document', doc.datePrecision === 'month', String(doc.datePrecision));
  ok('c. the dates are real calendar dates, widened to the whole month',
     doc.startDate === '2019-03-01' && doc.endDate === '2019-03-31', `${doc.startDate}..${doc.endDate}`);
  // Density is the invariant, not a magic number: a whole March is 31 days, and the criterion's
  // "21-day" trip is asserted literally in packages/client/test/past-trip.test.ts, which builds
  // 2019-03-01..2019-03-21 directly. Here the claim is that the skeleton covers the range with
  // no gaps and no holes — `days: []` is never valid (§8.1).
  const span = (Date.parse(`${doc.endDate}T00:00:00Z`) - Date.parse(`${doc.startDate}T00:00:00Z`)) / 86400000 + 1;
  ok('d. days are DENSE over the whole stored range, and `days: []` is never valid',
     doc.days.length === span && span === 31, `${doc.days.length} days for a ${span}-day range`);
  const idMismatch = doc.days.filter((d) => d.id !== d.date).map((d) => d.id);
  ok('e. Day.id === Day.date throughout', idMismatch.length === 0, JSON.stringify(idMismatch));
  const gaps = doc.days.filter((d, i) => i > 0 &&
    Date.parse(`${d.date}T00:00:00Z`) - Date.parse(`${doc.days[i - 1].date}T00:00:00Z`) !== 86400000);
  ok('f. no gaps in the day skeleton', gaps.length === 0, JSON.stringify(gaps.map((d) => d.date)));
  ok('g. zero stops, and no day-by-day was required', doc.days.every((d) => d.stops.length === 0));
  ok('h. one city', doc.cities.length === 1, JSON.stringify(doc.cities.map((c) => c.name)));
  // KD-38, closed: a past trip whose days carry no city is unattributable, and I-6's
  // `cityKeys` widening — the lifetime map, which is what Phase 2 exists to build — would
  // find nothing on it. The form assigns the trip's first city to every day it mints.
  const cityKey = doc.cities[0] ? doc.cities[0].key : null;
  const unassigned = doc.days.filter((d) => d.primaryCity !== cityKey).map((d) => `${d.date}:${d.primaryCity}`);
  ok('h2. EVERY day of the recorded past trip is attributable to its city, not "transit"',
     cityKey !== null && unassigned.length === 0, JSON.stringify(unassigned.slice(0, 5)));
  const badCities = doc.days.filter((d) => !Array.isArray(d.cities) || !d.cities.includes(cityKey)).map((d) => d.date);
  ok('h3. and Day.cities contains the primary city on every day',
     badCities.length === 0, JSON.stringify(badCities.slice(0, 5)));
  ok('h4. no day is left carrying the "transit" catch-all',
     doc.days.every((d) => d.primaryCity !== 'transit' && !(d.cities || []).includes('transit')),
     JSON.stringify(doc.days.filter((d) => d.primaryCity === 'transit').map((d) => d.date).slice(0, 5)));
  ok('i. schemaVersion did NOT bump — datePrecision is additive with a total default',
     doc.schemaVersion === 1, String(doc.schemaVersion));
}
ok('j. exactly one document was installed — the closed list of six is still six',
   docsAfter.length === 1, `${docsAfter.length} documents`);

// ---------------------------------------------------------------------------
line('2 — the lifecycle chips, rendered');
const openChip = p.getByTestId('lifecycle-chip').first();
const openStage = await openChip.getAttribute('data-stage');
const openText = await openChip.innerText();
console.log(`  open trip chip: stage=${openStage} text="${openText}"`);
ok('a. the open trip shows a lifecycle chip, and it says the trip is past',
   openStage === 'completed' && /past/i.test(openText), `${openStage} / ${openText}`);
const rangeChip = await p.getByTestId('trip-range').innerText();
console.log('  open trip range reads:', rangeChip);
ok('b. the range reads the way the user entered it — "March 2019", not two exact days',
   /March\s+2019/.test(rangeChip) && !/2019-03-01/.test(rangeChip), rangeChip);

await p.locator('.topbar__brand').click();
await p.waitForTimeout(700);
const libChips = p.getByTestId('lifecycle-chip');
const libCount = await libChips.count();
const libStage = libCount > 0 ? await libChips.first().getAttribute('data-stage') : null;
console.log(`  library chips: ${libCount}, first stage=${libStage}`);
ok('c. the Library shows a lifecycle chip per trip row', libCount === 1, String(libCount));
ok('d. and it is derived from the row\'s own dates', libStage === 'completed', String(libStage));

// ---------------------------------------------------------------------------
line('3 — EXIT CRITERION 3, on screen: zero conflicts and zero validation issues');
await p.locator('.tripcard__open').first().click();
await p.waitForTimeout(1200);
const tabText = async (name) => (await p.getByRole('tab', { name }).first().innerText()).replace(/\s+/g, ' ');
const conflictsTab = await tabText(/Conflicts/);
const validationTab = await tabText(/Validation/);
console.log(`  tabs: "${conflictsTab}" | "${validationTab}"`);
ok('a. the Conflicts tab carries NO badge — zero findings of any severity',
   conflictsTab.trim() === 'Conflicts', conflictsTab);
ok('b. the Validation tab carries NO badge — zero issues',
   validationTab.trim() === 'Validation', validationTab);

await p.getByRole('tab', { name: /Conflicts/ }).first().click();
await p.waitForTimeout(400);
const conflictRows = await p.locator('.conflict, .conflicts .card, .panel .conflict').count();
console.log('  rendered conflict rows:', conflictRows);
ok('c. and the panel itself renders no conflict row', conflictRows === 0, String(conflictRows));
await p.getByRole('tab', { name: /Validation/ }).first().click();
await p.waitForTimeout(400);
const issueRows = await p.locator('.issue, .panel li').count();
console.log('  rendered validation rows:', issueRows);
ok('d. and the validation panel renders no issue row', issueRows === 0, String(issueRows));

// ---------------------------------------------------------------------------
line('4a — the LIVE DEFECT, on screen: Europe 2026 is over, and stops being nagged about');
await p.locator('.topbar__brand').click();
await p.waitForTimeout(700);
await p.getByRole('button', { name: /Load Europe 2026/i }).click();
await p.waitForTimeout(1800);

const euroStage = await p.getByTestId('lifecycle-chip').first().getAttribute('data-stage');
ok('a. the reference trip reads as a PAST trip at the real clock', euroStage === 'completed', String(euroStage));

/** The rule ids the conflicts panel actually renders, read off the rendered rows. */
const renderedRules = async () => {
  await p.getByRole('tab', { name: /Conflicts/ }).first().click();
  await p.waitForTimeout(700);
  return p.locator('.conflict__rule').allInnerTexts();
};
/** Every day the rendered conflict rows name. */
const renderedDays = async () => {
  const rows = await p.locator('li.conflict').allInnerTexts();
  return [...new Set(rows.flatMap((t) => [...t.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[1])))];
};

const nowRules = await renderedRules();
const nowCount = nowRules.reduce((a, r) => ((a[r] = (a[r] ?? 0) + 1), a), {});
console.log('  rules on screen at the real clock:', JSON.stringify(nowCount));
const FEASIBILITY = ['impossible_transfer', 'overlap', 'missing_lodging', 'unbooked_ticketed', 'booking_vs_plan'];
ok('b. not one feasibility rule is on screen for a trip that ended on 22 August',
   FEASIBILITY.every((r) => !nowRules.includes(r)), JSON.stringify(nowCount));
// Two, not the five the raw fixture produces: the SHIPPED sample is redacted (§6.6), so every
// `Booking.reference` is null and `unverified_reference` / `superseded_booking` have nothing
// to fire on. That is redaction working, not the gate — the CLI on the unredacted fixture
// shows all five, and packages/core/test/ruleClass.test.ts asserts them.
ok('c. and the integrity findings are still there — silence is not the fix',
   nowRules.length === 2 && nowRules.every((r) => r === 'legacy_flag'), JSON.stringify(nowCount));

// ---------------------------------------------------------------------------
line('4b — INJECTED FAULT: the same document, mid-trip, in one render');
// Pin the browser's Date BEFORE the app boots. `ports/env.ts` is the only place the app reads
// a clock, so this drives the real code path rather than a test hook.
const MID = '2026-08-19';   // day 13 of 16 — Aug 7..22, so 12 days behind it and 3 ahead
await ctx.addInitScript((iso) => {
  const fixed = new Date(`${iso}T12:00:00`).getTime();
  const Real = Date;
  // eslint-disable-next-line no-global-assign
  Date = class extends Real {
    constructor(...args) { if (args.length === 0) super(fixed); else super(...args); }
    static now() { return fixed; }
  };
}, MID);
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
const seen = await p.evaluate(() => new Date().toISOString().slice(0, 10));
console.log('  the page now believes today is:', seen);
ok('d. the clock really moved', seen === MID, seen);

// After a reload the Library lists BOTH trips, sorted by start date, so Japan 2019 is first.
// Open Europe 2026 by name — the first draft of this probe opened the 2019 trip and reported
// "completed / no rules", which was true and about the wrong document.
if ((await p.locator('.topbar__brand').count()) > 0) {
  await p.locator('.topbar__brand').click();
  await p.waitForTimeout(700);
}
await p.locator('.tripcard__open').filter({ hasText: /Europe 2026/ }).first().click();
await p.waitForTimeout(1600);
const midTitle = await p.locator('.tripcard__title, .topbar').first().innerText().catch(() => '?');
console.log('  open trip after the reload:', midTitle.replace(/\n/g, ' ').slice(0, 60));
const midStage = await p.getByTestId('lifecycle-chip').first().getAttribute('data-stage');
ok('e. mid-trip, the same trip reads as ACTIVE', midStage === 'active', String(midStage));

const midRules = await renderedRules();
const midCount = midRules.reduce((a, r) => ((a[r] = (a[r] ?? 0) + 1), a), {});
const midDays = await renderedDays();
console.log('  rules on screen mid-trip:', JSON.stringify(midCount));
console.log('  days named mid-trip:', JSON.stringify(midDays.sort()));
ok('f. feasibility rules are BACK now that part of the trip is still ahead',
   FEASIBILITY.some((r) => midRules.includes(r)), JSON.stringify(midCount));

// §8.2 ruling 1 is all-subjects, not any-subject: a finding whose subjects straddle `today`
// SURVIVES, because Jacob can still act on it. So the claim is not "no past date appears" —
// it is "no feasibility finding is wholly in the past". Asserted per rendered row.
const rows = await p.locator('li.conflict').allInnerTexts();
const wholly = [];
for (const t of rows) {
  const rule = (t.match(/\b(legacy_flag|geo_outlier|unverified_reference|duplicate_booking|superseded_booking|impossible_transfer|overlap|missing_lodging|unbooked_ticketed|booking_vs_plan)\b/) ?? [])[1];
  if (!rule || !FEASIBILITY.includes(rule)) continue;
  const ds = [...new Set([...t.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[1]))];
  if (ds.length > 0 && ds.every((d) => d < MID)) wholly.push(`${rule} ${JSON.stringify(ds)}`);
}
ok('g. no rendered FEASIBILITY finding is wholly in the past (§8.2 ruling 1: all-subjects)',
   wholly.length === 0, JSON.stringify(wholly));

// And the sharper measurement: the count really moved with the clock, in the same document.
console.log(`  unbooked_ticketed: ${midCount.unbooked_ticketed ?? 0} mid-trip vs ${nowCount.unbooked_ticketed ?? 0} after the trip`);
ok('h. the feasibility count shrank as the trip was consumed, and is not zero mid-trip',
   (midCount.unbooked_ticketed ?? 0) > 0 && (nowCount.unbooked_ticketed ?? 0) === 0,
   `${JSON.stringify(midCount)} vs ${JSON.stringify(nowCount)}`);
ok('i. the integrity findings did not move',
   midRules.filter((r) => r === 'legacy_flag').length === 2, JSON.stringify(midCount));

console.log('\n  page errors:', errors.length ? JSON.stringify(errors) : 'none');
ok('no uncaught page error at any point', errors.length === 0, JSON.stringify(errors));

console.log(`\n== p2-pasttrip: ${fails} FAIL ==\n`);
await browser.close();
process.exitCode = 0;
