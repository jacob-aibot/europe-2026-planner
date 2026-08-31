/**
 * I-8d's rendered criteria — the builder's own probe. ROADMAP Phase 2 I-8d,
 * ARCHITECTURE §4.4 **A-41** (W3) and **A-42** (b)/(c).
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8d-render.mjs
 *
 * Four things, all of them driven through the real *"Load Europe 2026"* button so the
 * subject is the shipped sample rather than a planted fixture:
 *
 *   A  THE HIDDEN-CONTAINER RESULT, OVER N PANES. Boot on Trips with the Map tab mounted and
 *      `display:none`; every pane's `viewBox` is already the string `worldMapFrame` returned
 *      in bare Node, and it does not move when the container gains a size. I-8a's strongest
 *      single result, re-run over 2 panes instead of 1.
 *   B  THE ATLAS IS ON SCREEN AND NOTHING IS LOST. Two panes; six countries in the main one
 *      and the United States in the inset; the inset names its code; every path in either
 *      pane carries the same tap-for-its-trips handler.
 *   C  CONTAINMENT WITH MARGIN, ON THE RENDERED SVG (A-42 (b) / A-41 I4). Each path's
 *      `getBBox()` — the browser's own measurement of what it painted, in user units — is
 *      strictly inside its pane's `viewBox` on all four sides. R33-6 measured 0.000000.
 *   D  THE WITHDRAWN CLAIM IS GONE (A-42 (c)).
 *
 * A "FAIL" line means the probe found what it was looking for.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame } from '../packages/client/src/selectors/worldMap.ts';

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
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.route('**tile.openstreetmap.org/**', (r) => r.abort());

// ---------------------------------------------------------------------------
head('A  THE SAMPLE, LOADED THROUGH THE REAL BUTTON, WITH THE MAP TAB HIDDEN AT MOUNT');

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.tabbar');
await page.getByRole('button', { name: /Load Europe 2026/i }).click();
await page.waitForTimeout(600);
// Reload so we boot on Trips with the sample already in the library and the Map tab mounted
// but `display:none` — the container state Leaflet cannot be fitted in.
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#tabpanel-map', { state: 'attached' });
await page.waitForTimeout(400);

// The independent oracle: the stored row, read straight out of IndexedDB, put through
// `travelStats` and `worldMapFrame` in bare Node.
const rows = await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const out = await new Promise((res, rej) => {
    const req = db.transaction('summaries', 'readonly').objectStore('summaries').getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  db.close();
  return out;
});
ok(rows.length === 1, 'the library holds the one sample row', rows.map((r) => r.id));
note(`row: ${rows[0]?.id} · ${rows[0]?.startDate}→${rows[0]?.endDate} · ${(rows[0]?.countryCodes ?? []).join(' ')}`);

const today = new Date().toISOString().slice(0, 10);
const want = worldMapFrame(core.travelStats(rows, today), core.COUNTRY_INDEX);
note(`oracle: ${want.panes.length} panes — ${want.panes.map((p) => `${p.id}[${p.codes}] "${p.viewBox}"`).join('  ')}`);

const hidden = await page.evaluate(() => {
  const panel = document.querySelector('#tabpanel-map');
  const svgs = [...document.querySelectorAll('#tabpanel-map .worldmap__svg')];
  return {
    display: getComputedStyle(panel).display,
    count: svgs.length,
    viewBoxes: svgs.map((s) => s.getAttribute('data-viewbox')),
    widths: svgs.map((s) => s.getBoundingClientRect().width),
  };
});
ok(hidden.display === 'none', 'the Map panel is display:none at mount', hidden.display);
ok(hidden.count === want.panes.length, `${want.panes.length} panes are mounted while hidden`, hidden.count);
ok(hidden.widths.every((w) => w === 0), 'every pane has zero measured width at mount', hidden.widths);
ok(JSON.stringify(hidden.viewBoxes) === JSON.stringify(want.panes.map((p) => p.viewBox)),
  'and every pane already carries the viewBox worldMapFrame returned in Node',
  { got: hidden.viewBoxes, want: want.panes.map((p) => p.viewBox) });

await page.getByRole('tab', { name: 'Map' }).click();
await page.waitForTimeout(300);

const shown = await page.evaluate(() => {
  const svgs = [...document.querySelectorAll('#tabpanel-map .worldmap__svg')];
  return svgs.map((s) => {
    const r = s.getBoundingClientRect();
    return { viewBox: s.getAttribute('viewBox'), w: Math.round(r.width), h: Math.round(r.height) };
  });
});
ok(JSON.stringify(shown.map((s) => s.viewBox)) === JSON.stringify(want.panes.map((p) => p.viewBox)),
  'after the tab switch every RENDERED viewBox is byte-identical to the Node string',
  { got: shown.map((s) => s.viewBox), want: want.panes.map((p) => p.viewBox) });
ok(shown.every((s) => s.w > 100 && s.h > 50), 'every pane is painted at a usable size', shown);

// ---------------------------------------------------------------------------
head('B  THE ATLAS IS ON SCREEN, AND NOTHING IS LOST');

const drawn = await page.evaluate(() => {
  const panes = [...document.querySelectorAll('#tabpanel-map .worldmap__pane')];
  return panes.map((p) => ({
    id: p.getAttribute('data-pane'),
    cls: p.className,
    codes: [...p.querySelectorAll('path[data-code]')].map((el) => el.getAttribute('data-code')),
    caption: p.querySelector('.worldmap__panecap')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
  }));
});
console.log('  ' + JSON.stringify(drawn));
ok(drawn.length === 2, 'two panes are drawn', drawn.length);
ok(String(drawn[0]?.codes) === 'AT,CZ,DE,GB,HR,HU', 'the main pane draws the six European countries', drawn[0]?.codes);
ok(String(drawn[1]?.codes) === 'US', 'the inset draws the United States', drawn[1]?.codes);
ok(/main/.test(drawn[0]?.cls ?? '') && /inset/.test(drawn[1]?.cls ?? ''), 'the roles reach the class names', drawn.map((d) => d.cls));
ok(/US/.test(drawn[1]?.caption ?? ''), 'the inset NAMES its code on screen', drawn[1]?.caption);
ok(drawn.flatMap((d) => d.codes).length === 7, 'all seven countries are still on the map', drawn.flatMap((d) => d.codes));

// A-41 constraint 3: the inset's country carries the identical tap handler.
await page.click('#tabpanel-map .worldmap__pane--inset path[data-code="US"]');
await page.waitForTimeout(200);
const drill = await page.locator('.worldmap__drill').innerText();
ok(/US/.test(drill), 'tapping the inset country drills down to its trips', drill.replace(/\s+/g, ' ').slice(0, 140));
ok(/Europe 2026/i.test(drill), 'and the trip it names is the sample', drill.replace(/\s+/g, ' ').slice(0, 140));

// ---------------------------------------------------------------------------
head('C  CONTAINMENT WITH MARGIN, MEASURED BY THE BROWSER (A-42 (b) / A-41 I4)');

const insets = await page.evaluate(() => {
  const out = [];
  for (const pane of document.querySelectorAll('#tabpanel-map .worldmap__pane')) {
    const svg = pane.querySelector('.worldmap__svg');
    const [minX, minY, w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
    let worst = Infinity, at = null;
    for (const path of pane.querySelectorAll('path[data-code]')) {
      const b = path.getBBox();
      const m = Math.min(b.x - minX, minX + w - (b.x + b.width), b.y - minY, minY + h - (b.y + b.height));
      if (m < worst) { worst = m; at = path.getAttribute('data-code'); }
    }
    out.push({ pane: pane.getAttribute('data-pane'), worst, at, viewBox: svg.getAttribute('viewBox') });
  }
  return out;
});
for (const i of insets) {
  ok(i.worst > 0, `pane ${i.pane}: tightest rendered inset ${i.worst.toFixed(6)}° at ${i.at} — must be > 0`, i);
  note(`${i.pane}: viewBox "${i.viewBox}", tightest inset ${i.worst.toFixed(6)}° at ${i.at} (R33-6 measured 0.000000)`);
}

// ---------------------------------------------------------------------------
head('D  THE WITHDRAWN CLAIM IS GONE (A-42 (c))');
const legend = await page.locator('.worldmap__legend').innerText();
ok(!/readable minimum/i.test(legend), 'the legend makes no "readable minimum" claim', legend.replace(/\s+/g, ' '));
note(`legend: ${legend.replace(/\s+/g, ' ')}`);

ok(errors.length === 0, 'no page errors anywhere in this run', errors);

const shot = process.env.I8D_SHOT;
if (shot) { await page.screenshot({ path: shot, fullPage: false }); note(`screenshot → ${shot}`); }

await ctx.close();
await browser.close();
console.log(fails === 0 ? '\nALL CLEAR\n' : `\n${fails} FAIL(S)\n`);
process.exit(fails === 0 ? 0 : 1);
