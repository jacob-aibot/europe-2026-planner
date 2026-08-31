/**
 * I-8c's rendered criteria — the builder's own probe. ROADMAP Phase 2 I-8c, criteria 3 and 4.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8c-render.mjs
 *
 * Two things only, because the other two criteria (the parser's refusals, and the shipped
 * write path) are covered in plain Node by `packages/core/test/serialize.test.ts` and by
 * `store.importDoc`, and neither needs a browser:
 *
 *   A  ONE UNREADABLE ROW COSTS ONE ROW — §8.4 **A-44**. A library of three rows, one with a
 *      shape-invalid date: the Trips tab renders the two good rows, the bad row shows the
 *      unreadable chip, the tab does not go down, and the Map tab's drill-down renders the
 *      same row the same way. This is QA **R33-3** turned around — round 33 measured the
 *      surviving control set as ["BUTTON:CAIRN","BUTTON:TRIPS","BUTTON:MAP"].
 *   B  THE BOUNDARY HAS A WAY OUT — **BLD-3**. With a tab forced to throw, the fallback names
 *      two recoveries, and "Try again" clears the banner once the cause is gone. Round 33
 *      watched the banner survive its own cause; that is what must not happen again.
 *
 * A "FAIL" line means the probe found what it was looking for.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';

const { chromium } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const browser = await chromium.launch();

const row = (id, startDate, endDate, countryCodes) => ({
  id, title: id, startDate, endDate, datePrecision: 'exact',
  cityCount: 1, dayCount: 3, stopCount: 0, poolCount: 0, revision: 1,
  countryCodes, cities: [],
  attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
  summaryVersion: core.SUMMARY_VERSION,
});

const plantRows = (page, rows) =>
  page.evaluate(async (rows) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('summaries', 'readwrite');
      for (const row of rows) tx.objectStore('summaries').put(row, row.id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, rows);

async function withLibrary(rows) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await plantRows(page, rows);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  return { ctx, page, errors };
}

// ===========================================================================
head('A — one unreadable row costs one row (A-44)');
{
  const rows = [
    row('good-1', '2019-05-01', '2019-05-08', ['HR']),
    row('broken', 'not-a-date', '2019-05-08', ['AT']),
    row('good-2', '2024-03-01', '2024-03-09', ['AT']),
  ];
  const { ctx, page, errors } = await withLibrary(rows);
  await page.waitForTimeout(300);

  const trips = await page.locator('#tabpanel-trips').innerText();
  ok(await page.locator('.tabbar').count() === 1, 'the shell survives');
  ok(!/could not be shown/i.test(trips), 'the Trips tab did NOT go down', trips.slice(0, 160));
  ok(await page.locator('.tripcard').count() === 3, 'all three rows render',
     await page.locator('.tripcard').count());

  const chips = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="lifecycle-chip"]')]
      .map((el) => ({ stage: el.getAttribute('data-stage'), text: el.innerText.trim() })));
  note('lifecycle chips: ' + JSON.stringify(chips));
  ok(chips.filter((c) => c.stage === 'unreadable').length === 1, 'exactly one unreadable chip', chips);
  ok(chips.filter((c) => c.stage === 'completed').length === 2, 'the two good rows still classify', chips);
  ok(chips.some((c) => c.stage === 'unreadable' && /could not be read/i.test(c.text)),
     'the unreadable chip says what happened', chips);

  // No CSS was added for this chip: `.chip--life` sets typography only, so `.chip--warn`'s
  // colour is supposed to survive composition. Measured rather than read off the cascade.
  const colours = await page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll('[data-testid="lifecycle-chip"]')) {
      const cs = getComputedStyle(el);
      out[el.getAttribute('data-stage')] = [cs.color, cs.borderTopColor, cs.textTransform];
    }
    const warn = document.querySelector('.chip--warn:not(.chip--life)');
    out.__rowWarn = warn ? getComputedStyle(warn).color : null;
    return out;
  });
  note('chip computed styles: ' + JSON.stringify(colours));
  ok(colours.unreadable && colours.unreadable[0] !== colours.completed[0],
     'the unreadable chip is not painted like a lifecycle stage', colours);
  ok(colours.unreadable && colours.unreadable[2] === 'uppercase',
     'and it keeps the lifecycle chip typography', colours);

  // The delete/export controls the whole finding was about are back.
  const controls = await page.evaluate(() =>
    [...document.querySelectorAll('button, a[href], input, select')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width || r.height; })
      .map((el) => (el.tagName + ':' + (el.innerText || el.getAttribute('aria-label') || el.type || '')).trim().slice(0, 40)));
  ok(controls.some((c) => /delete/i.test(c)), 'the user can still delete the offending trip', controls);

  // And the Map tab does not go down either. It *refuses in words* rather than drilling
  // down, and that is the shipped, correct behaviour, not a gap this increment left: the
  // same shape fault that makes `rowLifecycle` return null makes `core.travelStats` throw
  // for the WHOLE library (§8.4 A-31 Part 4 — there is no per-row partial answer for a
  // lifetime aggregate), and `travelHistory` catches that. So a library containing an
  // unreadable row has no country paths to click, and `WorldMap.tsx`'s own `LifecycleChip`
  // gate is defence in depth for the day that changes. Recorded rather than asserted away.
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(300);
  const mapText = await page.locator('#tabpanel-map').innerText();
  ok(!/could not be shown/i.test(mapText), 'the Map tab did not go down either', mapText.slice(0, 160));
  ok(/could not read your travel history/i.test(mapText),
     'the Map refuses the aggregate in words (pre-existing, A-31 Part 4)', mapText.slice(0, 160));
  ok(await page.locator('#tabpanel-map path[data-code]').count() === 0,
     'and it draws no map it cannot justify');
  ok(errors.length === 0, 'no uncaught page errors', errors.slice(0, 3));
  await ctx.close();
}

// ===========================================================================
head('A2 — the Map drill-down still works when every row is readable');
{
  const rows = [
    row('good-1', '2019-05-01', '2019-05-08', ['AT']),
    row('good-2', '2024-03-01', '2024-03-09', ['AT']),
  ];
  const { ctx, page, errors } = await withLibrary(rows);
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(400);
  const country = page.locator('#tabpanel-map path[data-code="AT"]');
  ok(await country.count() === 1, 'the visited country is drawn');
  await country.first().click();
  await page.waitForTimeout(200);
  const drill = await page.evaluate(() =>
    [...document.querySelectorAll('#tabpanel-map [data-testid="lifecycle-chip"]')]
      .map((el) => el.getAttribute('data-stage')));
  note('drill-down chips: ' + JSON.stringify(drill));
  ok(drill.length === 2 && drill.every((s) => s === 'completed'),
     'the drill-down renders both rows through the same gate, unchanged', drill);
  ok(errors.length === 0, 'no uncaught page errors', errors.slice(0, 3));
  await ctx.close();
}

// ===========================================================================
head('B — the boundary has a way out (BLD-3)');
{
  // The fault has to be one the A-44 gate does NOT catch — otherwise the boundary never
  // fires and this section tests nothing — and it has to be *removable* without touching app
  // state, so that "the cause is gone" and "the banner cleared" are two different facts.
  // `Library.tsx` renders `row.countryCodes.join(' ')`; the probe arms `Array.prototype.join`
  // to throw for one marker code, and disarms it later. Nothing in the app changes.
  const { ctx, page, errors } = await withLibrary([row('good-1', '2019-05-01', '2019-05-08', ['ZZ'])]);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    let armed = true;
    window.__cairnDisarm = () => { armed = false; };
    const orig = Array.prototype.join;
    Array.prototype.join = function join(sep) {
      if (armed && Array.isArray(this) && this.includes('ZZ')) {
        throw new Error('i8c probe: forced render failure');
      }
      return orig.call(this, sep);
    };
  });
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(150);
  await page.getByRole('tab', { name: 'Trips' }).click();
  await page.waitForTimeout(300);

  const down = await page.locator('#tabpanel-trips').innerText();
  note('boundary text: ' + JSON.stringify(down.slice(0, 240)));
  ok(/could not be shown/i.test(down), 'the boundary caught it', down.slice(0, 120));
  ok(/try again/i.test(down), 'the fallback names "Try again"');
  ok(/reload cairn|close this trip/i.test(down), 'the fallback names a second recovery outside the tab');

  const inBoundary = await page.evaluate(() =>
    [...document.querySelectorAll('#tabpanel-trips button')].map((b) => b.innerText.trim()));
  ok(inBoundary.length >= 2, 'at least two recovery controls are rendered', inBoundary);

  // Remove the cause, press Try again: the banner must go and the tab must render.
  await page.evaluate(() => window.__cairnDisarm());
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForTimeout(300);
  const after = await page.locator('#tabpanel-trips').innerText();
  note('after Try again: ' + JSON.stringify(after.slice(0, 120)));
  ok(!/could not be shown/i.test(after), 'the banner does NOT outlive its cause', after.slice(0, 120));
  ok(await page.locator('.tripcard').count() === 1, 'and the library is back');
  note('page errors seen: ' + JSON.stringify(errors.slice(0, 2)));
  await ctx.close();
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
process.exit(fails === 0 ? 0 : 1);
