/**
 * QA round 33, part 4 — the tab shell's keyboard and a11y surface.
 *
 * The shell mounts EVERY panel at once and hides the inactive ones with `hidden`, on top of
 * `.tabpanel { display: contents }`. If the `[hidden]` rule ever loses that specificity race,
 * a keyboard user tabs straight into an invisible world map full of focusable <path>s. And
 * `display: contents` on the ACTIVE panel is itself the thing that historically dropped a
 * `role="tabpanel"` out of the accessibility tree.
 *
 *   Needs: npm run web:build && npm run serve
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r33-a11y.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';

const { chromium } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok    ${l}`); else { fails++; console.log(`  FAIL  ${l}${x === undefined ? '' : '  -> ' + JSON.stringify(x)}`); } };
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.tabbar');

// A library with many countries, so a leak into the hidden panel is unmissable.
const ALL = [...new Set(core.COUNTRY_INDEX.countries.map((c) => c.code))];
await page.evaluate(async (codes) => {
  const db = await new Promise((res) => { const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); });
  await new Promise((res) => {
    const tx = db.transaction('summaries', 'readwrite');
    tx.objectStore('summaries').put({
      id: 'all', title: 'all', startDate: '2019-01-01', endDate: '2019-01-10', datePrecision: 'exact',
      cityCount: 0, dayCount: 3, stopCount: 0, poolCount: 0, revision: 1, countryCodes: codes, cities: [],
      attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
      summaryVersion: 4,
    }, 'all');
    tx.oncomplete = res;
  });
  db.close();
}, ALL);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.tabbar');
await page.waitForTimeout(400);

head('the hidden panel must not be in the tab order');
const counts = await page.evaluate(() => ({
  paths: document.querySelectorAll('#tabpanel-map .worldmap__country').length,
  mapDisplay: getComputedStyle(document.querySelector('#tabpanel-map')).display,
  tripsDisplay: getComputedStyle(document.querySelector('#tabpanel-trips')).display,
}));
note(JSON.stringify(counts));
ok(counts.paths > 200, 'the hidden Map panel really is mounted with a big focusable payload', counts.paths);
ok(counts.mapDisplay === 'none', 'and it is display:none', counts.mapDisplay);
ok(counts.tripsDisplay === 'contents', 'while the ACTIVE panel is display:contents', counts.tripsDisplay);

await page.evaluate(() => document.body.focus());
const walk = [];
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab');
  const w = await page.evaluate(() => {
    const a = document.activeElement;
    if (!a) return null;
    const panel = a.closest('.tabpanel');
    return { tag: a.tagName, cls: (a.className && a.className.baseVal !== undefined ? a.className.baseVal : a.className) || '', panel: panel ? panel.id : '(chrome)', hidden: panel ? panel.hasAttribute('hidden') : false };
  });
  if (!w) break;
  walk.push(w);
  if (w.tag === 'BODY') break;
}
const leaked = walk.filter((w) => w.hidden);
note(`40 Tab presses visited: ${[...new Set(walk.map((w) => w.panel))].join(', ')}`);
ok(leaked.length === 0, 'focus NEVER lands inside a hidden tab panel', leaked.slice(0, 5));

head('the ARIA tab pattern');
const aria = await page.accessibility.snapshot({ interestingOnly: false });
const find = (n, role, acc = []) => { if (!n) return acc; if (n.role === role) acc.push(n); (n.children || []).forEach((c) => find(c, role, acc)); return acc; };
const panels = find(aria, 'tabpanel');
const tabs = find(aria, 'tab');
note(`accessibility tree: ${tabs.length} tab(s), ${panels.length} tabpanel(s)`);
ok(tabs.length === 2, 'both tabs are exposed as role=tab', tabs.map((t) => t.name));
ok(panels.length >= 1, 'the ACTIVE panel is exposed as role=tabpanel (display:contents does not drop it)', panels.length);

// APG: a tablist should be arrow-navigable and hold a single tab stop.
await page.locator('#tabbtn-trips').focus();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(120);
const afterArrow = await page.evaluate(() => ({ focused: document.activeElement.id, selected: document.querySelector('[aria-selected="true"]').id }));
note(JSON.stringify(afterArrow));
ok(afterArrow.focused === 'tabbtn-map' || afterArrow.selected === 'tabbtn-map',
   'ArrowRight moves between tabs (WAI-ARIA tablist pattern)', afterArrow);

const stops = await page.evaluate(() => [...document.querySelectorAll('.tabbar__tab')].map((t) => t.tabIndex));
note(`tab bar tabIndex values: ${JSON.stringify(stops)}`);
ok(stops.filter((t) => t >= 0).length === 1, 'the tablist is a single tab stop, not one per tab', stops);

head('the world map as a tab-stop payload');
await page.getByRole('tab', { name: 'Map' }).click();
await page.waitForTimeout(400);
const mapStops = await page.evaluate(() => document.querySelectorAll('#tabpanel-map [tabindex="0"], #tabpanel-map button').length);
note(`focusable elements inside the Map panel with a 239-country history: ${mapStops}`);
ok(mapStops < 60, 'the Map does not become a several-hundred-stop keyboard trap', mapStops);

await browser.close();
console.log(fails === 0 ? '\nall green' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
