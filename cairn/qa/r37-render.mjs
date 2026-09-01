/**
 * QA round 37 — the rendered half of the independent I-8g pass (§4.4 **A-48** Part 6, C9,
 * R36-5/R36-6, and KD-70).
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r37-render.mjs
 *
 * The builder measured the aspect fix at **one** viewport (390×820) and one library (the
 * shipped sample), and said so. This probe measures the same fix where it was not looked at:
 *
 *   A  the aspect fix across FIVE viewports, not one — is "100% of its box" a property of the
 *      rule or of the 390 px column?
 *   B  the aspect fix across LIBRARY SHAPES — a tall pane, a very wide pane, three panes with
 *      three different aspects side by side.
 *   C  KD-70 rendered and MEASURED: how many of the main pane's pixels are country, and how
 *      big is Greece on screen, against what I-8d gave the same library.
 *   D  KD-69: the chip list's order in the DOM, and whether every code is still reachable.
 *   E  the dark `--map-fill` token against every surface the map is actually drawn over.
 *
 * A FAIL line is a claim that does not hold. A NOTE is a measurement for the writeup.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame } from '../packages/client/src/selectors/worldMap.ts';

const URL = process.env.CAIRN_URL || 'http://localhost:4173/';
let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok     ${l}`); else { fails++; console.log(`  FAIL   ${l}${x === undefined ? '' : `  -> ${JSON.stringify(x)}`}`); } };
const note = (s) => console.log(`  NOTE   ${s}`);
const head = (s) => console.log(`\n== ${s} ==`);

const browser = await pw.chromium.launch();

const rowOf = (code, n) => [code, n];
const statRow = (code, n) => ({ code, firstVisit: '2020-01-01', lastVisit: '2020-01-10',
  tripIds: Array.from({ length: n }, (_, i) => `${code}-t${i}`), provisional: false });

/** Opens the app, optionally replacing the stored summary rows, and returns the page. */
async function openMap(ctx, rows) {
  const page = await ctx.newPage();
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  const load = page.getByRole('button', { name: /Load Europe 2026/i });
  if (await load.count()) { await load.click(); await page.waitForTimeout(600); }
  if (rows) {
    // Same method as qa/r36-render.mjs §D and qa/i8g-render.mjs: clone the real stored row and
    // move only `id`, `title` and `countryCodes`, so every planted row is a shape the app wrote.
    await page.evaluate(async (rs) => {
      const db = await new Promise((r) => { const q = indexedDB.open('cairn'); q.onsuccess = () => r(q.result); });
      const base = await new Promise((r) => {
        const q = db.transaction('summaries', 'readonly').objectStore('summaries').getAll();
        q.onsuccess = () => r(q.result[0]);
      });
      const tx = db.transaction('summaries', 'readwrite');
      const st = tx.objectStore('summaries');
      const keys = await new Promise((r) => { const q = st.getAllKeys(); q.onsuccess = () => r(q.result); });
      for (const k of keys) st.delete(k);
      rs.forEach(([code, n], i) => {
        for (let t = 0; t < n; t++) st.put({ ...base, id: `r37-${i}-${t}`, title: `${code} ${t}`, countryCodes: [code], cities: [] }, `r37-${i}-${t}`);
      });
      await new Promise((r) => { tx.oncomplete = r; });
      db.close();
    }, rows);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tabbar');
  }
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForSelector('#tabpanel-map path[data-code]');
  await page.waitForTimeout(300);
  return page;
}

/** Box vs painted geometry for every pane on screen. */
const measure = (page) => page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__svg')].map((svg) => {
  const r = svg.getBoundingClientRect();
  const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
  const s = Math.min(r.width / w, r.height / h);
  return { boxW: Math.round(r.width), boxH: Math.round(r.height), aspectVar: svg.style.getPropertyValue('--pane-aspect'),
    drawnW: Math.round(w * s), drawnH: Math.round(h * s), vb: svg.getAttribute('viewBox') };
}));

// ---------------------------------------------------------------------------
head('A  THE ASPECT FIX AT FIVE VIEWPORTS, NOT ONE');

for (const vp of [{ width: 390, height: 820 }, { width: 360, height: 640 }, { width: 768, height: 1024 },
                  { width: 1100, height: 900 }, { width: 1440, height: 700 }]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await openMap(ctx);
  const panes = await measure(page);
  const m = panes[0];
  const pct = (100 * m.drawnW * m.drawnH) / (m.boxW * m.boxH);
  note(`${vp.width}x${vp.height}: main box ${m.boxW}x${m.boxH}, painted ${m.drawnW}x${m.drawnH} = ${pct.toFixed(1)}% of the box`);
  if (vp.width === 390) ok(pct >= 99, 'R36-5 as the builder measured it: 390 px, main pane fills its box', pct.toFixed(1));
  else if (pct < 75) note(`  ^ at ${vp.width} px the main pane is BELOW the 75% the I-8g criterion asks for at 390 px`);
  await ctx.close();
}
note('the rule is `aspect-ratio` + a STATIC `max-height: min(58vh, 460px)`, so a viewport whose 58vh or 460px clamp bites before the aspect does still letterboxes — horizontally instead of vertically');

// ---------------------------------------------------------------------------
head('B  THE ASPECT FIX ACROSS LIBRARY SHAPES');

const IDX = core.COUNTRY_INDEX;
const statsFor = (rows) => ({ countries: rows, cities: [], trips: { planned: 0, active: 0, completed: 1 },
  daysTravelled: 10, located: { cities: 0, places: 0, stops: 0 }, unattributed: { cities: 0, places: 0, stops: 0 }, unnamedCities: 0 });
const CODES = [...new Set(IDX.countries.map((c) => c.code))].sort();
{
  // Bare-Node first: at 390 px the box is 356 wide, clamped at 460 tall, so a pane fills its
  // box exactly when aspect >= 356/460. How many of the 239 single-country libraries do not?
  const short = [];
  for (const c of CODES) {
    const a = worldMapFrame(statsFor([statRow(c, 1)]), IDX).panes[0].aspect;
    if (a < 356 / 460) short.push([c, a]);
  }
  note(`of 239 single-country libraries, ${short.length} have a main pane too TALL for the 356x460 clamp and therefore still letterbox at 390 px: ${short.slice(0, 12).map(([c, a]) => `${c} ${a.toFixed(2)}`).join(' · ')}${short.length > 12 ? ' …' : ''}`);
  const worst = short.slice().sort((a, b) => a[1] - b[1])[0];
  if (worst) note(`  worst: ${worst[0]} at aspect ${worst[1].toFixed(3)} -> ${(100 * worst[1] / (356 / 460)).toFixed(1)}% of its box`);
}
for (const [label, rows] of [
  ['a TALL library (CL alone)', [rowOf('CL', 1)]],
  ['a very WIDE library (RU alone)', [rowOf('RU', 1)]],
  ['three panes, three aspects (US, JP, GR, DE)', [rowOf('US', 3), rowOf('DE', 3), rowOf('JP', 1), rowOf('GR', 1)]],
]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const page = await openMap(ctx, rows);
  const panes = await measure(page);
  for (const p of panes) {
    const pct = (100 * p.drawnW * p.drawnH) / (p.boxW * p.boxH);
    note(`${label}: box ${p.boxW}x${p.boxH}, painted ${p.drawnW}x${p.drawnH} = ${pct.toFixed(1)}%  (aspect ${p.aspectVar})`);
  }
  ok(panes.every((p) => p.boxH >= 12), `${label}: no pane collapses to a hairline`, panes.map((p) => `${p.boxW}x${p.boxH}`));
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('C  KD-70 RENDERED AND MEASURED — {FR x2, GR x1}');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const page = await openMap(ctx, [rowOf('FR', 2), rowOf('GR', 1)]);
  const panes = await measure(page);
  ok(panes.length === 1, 'one pane, as the I-8g criterion words it', panes.length);
  note(`main pane box ${panes[0].boxW}x${panes[0].boxH}, viewBox ${panes[0].vb}`);
  // Every country's rendered bbox, in css px, and the pane's own.
  const bb = await page.evaluate(() => {
    const svg = document.querySelector('#tabpanel-map .worldmap__svg');
    const r = svg.getBoundingClientRect();
    return [...svg.querySelectorAll('path[data-code]')].map((p) => {
      const b = p.getBoundingClientRect();
      return { code: p.dataset.code, w: Math.round(b.width), h: Math.round(b.height), paneW: Math.round(r.width), paneH: Math.round(r.height) };
    });
  });
  for (const c of bb) note(`  ${c.code} renders ${c.w}x${c.h} css px inside a ${c.paneW}x${c.paneH} pane (${((100 * c.w * c.h) / (c.paneW * c.paneH)).toFixed(2)}% of the pane's area, bbox)`);
  // What fraction of the pane's pixels actually hit a country?
  const hit = await page.evaluate(() => {
    const svg = document.querySelector('#tabpanel-map .worldmap__svg');
    const r = svg.getBoundingClientRect();
    let land = 0, total = 0;
    for (let x = 2; x < r.width - 2; x += 3) for (let y = 2; y < r.height - 2; y += 3) {
      total++;
      const el = document.elementFromPoint(r.left + x, r.top + y);
      if (el && el.tagName === 'path' && el.dataset.code) land++;
    }
    return { land, total };
  });
  note(`KD-70 rendered: ${hit.land} of ${hit.total} sampled pane pixels hit a country = ${((100 * hit.land) / hit.total).toFixed(2)}% land, ${(100 - (100 * hit.land) / hit.total).toFixed(2)}% empty sea`);
  await page.screenshot({ path: '/tmp/cairn-r37/kd70-390.png', fullPage: false });
  note('screenshot: /tmp/cairn-r37/kd70-390.png');
  await ctx.close();
}
{
  // The same library as I-8d framed it — FR alone in the main pane, GR in an inset — measured
  // the same way, so "is I-8g's single pane better to look at" is a number and not a feeling.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const page = await openMap(ctx, [rowOf('FR', 2)]);
  const hit = await page.evaluate(() => {
    const svg = document.querySelector('#tabpanel-map .worldmap__svg');
    const r = svg.getBoundingClientRect();
    let land = 0, total = 0;
    for (let x = 2; x < r.width - 2; x += 3) for (let y = 2; y < r.height - 2; y += 3) {
      total++;
      const el = document.elementFromPoint(r.left + x, r.top + y);
      if (el && el.tagName === 'path' && el.dataset.code) land++;
    }
    return { land, total };
  });
  note(`I-8d's comparison (FR alone, which is what its main pane held): ${((100 * hit.land) / hit.total).toFixed(2)}% land`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('D  KD-69 — the chip list in the DOM');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const page = await openMap(ctx);
  const chips = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .codelist button')].map((b) => b.querySelector('.mono').textContent.trim()));
  note(`chip order on screen: ${chips.join(' ')}`);
  note(`alphabetical would be: ${[...chips].sort().join(' ')}`);
  ok(String(chips) !== String([...chips].sort()),
    'KD-69 confirmed on the rendered DOM: the chip list is NOT alphabetical, as A-48 C9 consequence 2 claims');
  const drawn = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map path[data-code]')].map((p) => p.dataset.code));
  ok(new Set(chips).size === new Set(drawn).size && drawn.every((c) => chips.includes(c)),
    'every drawn code is still in the list — R36-7 / A-41 constraint 3\'s fallback is intact', { chips, drawn });
  // The paths are grouped per pane in the DOM, so compare the chip order against the frame's
  // own `countries` order instead — that is the array both surfaces read.
  const rows = await page.evaluate(async () => {
    const db = await new Promise((r) => { const q = indexedDB.open('cairn'); q.onsuccess = () => r(q.result); });
    const out = await new Promise((r) => { const q = db.transaction('summaries', 'readonly').objectStore('summaries').getAll(); q.onsuccess = () => r(q.result); });
    db.close(); return out;
  });
  const want = worldMapFrame(core.travelStats(rows, new Date().toISOString().slice(0, 10)), core.COUNTRY_INDEX).countries.map((c) => c.code);
  ok(String(chips) === String(want),
    'the chip list renders `frame.countries` verbatim — so C9 reordered it, and nothing in the view sorts it back', { chips, want });
  note(`before I-8g, frame.countries was canonical row order, so this same list rendered ALPHABETICALLY: ${[...chips].sort().join(' ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('E  R36-6 — the dark token against every surface the map is drawn over');
{
  const lum = (rgb) => { const [r, g, b] = rgb.match(/\d+/g).map(Number).map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const cr = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 820 }, colorScheme: scheme });
    const page = await openMap(ctx);
    const t = await page.evaluate(() => {
      const probe = document.createElement('span');
      document.body.appendChild(probe);
      const r = (n) => { probe.style.color = `var(${n})`; return getComputedStyle(probe).color; };
      const out = { fill: r('--map-fill'), sea: r('--map-sea'), paper: r('--paper'), card: r('--card'),
        line: r('--map-line'), on: r('--map-on'), prov: r('--map-provisional-fill') };
      probe.remove();
      const sw = document.querySelector('.legend__key--confirmed');
      out.legendBg = sw ? getComputedStyle(sw.parentElement.parentElement).backgroundColor : null;
      out.legendSwatch = sw ? getComputedStyle(sw, '::before').backgroundColor : null;
      return out;
    });
    note(`${scheme}: fill vs sea ${cr(t.fill, t.sea).toFixed(2)}:1 · vs paper ${cr(t.fill, t.paper).toFixed(2)}:1 · vs card ${cr(t.fill, t.card).toFixed(2)}:1 · vs the legend swatch's own background ${t.legendBg ? cr(t.fill, t.legendBg).toFixed(2) + ':1' : 'n/a'}`);
    note(`${scheme}: country stroke (--map-line) vs fill ${cr(t.line, t.fill).toFixed(2)}:1 · hover ink vs sea ${cr(t.on, t.sea).toFixed(2)}:1`);
    ok(cr(t.fill, t.sea) >= 3, `${scheme}: fill vs sea clears WCAG 1.4.11's 3:1`, cr(t.fill, t.sea).toFixed(2));
    ok(!t.legendBg || cr(t.fill, t.legendBg) >= 3,
      `${scheme}: the legend's confirmed swatch clears 3:1 against ITS OWN background (the thing the builder could not check)`,
      t.legendBg ? cr(t.fill, t.legendBg).toFixed(2) : null);
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
process.exit(fails === 0 ? 0 : 1);
