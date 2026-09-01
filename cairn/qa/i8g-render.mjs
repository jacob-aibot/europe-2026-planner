/**
 * I-8g — the two libraries A-48 exists for, driven through the **real app** rather than through
 * the selector, because ROADMAP I-8g's ship gate asks for exactly that: *"the two-France-and-one-
 * Greece library, driven through the real app and looked at, is a map of Europe rather than of
 * the Atlantic."*
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8g-render.mjs
 *
 *   A  R36-1 — {FR ×2, GR ×1}: one pane, no "Shown separately", both countries tappable, and
 *      the honest measurement of what C2′ did NOT fix (A-48 residue 1′: the extent, not the key).
 *   B  R36-2 — {AE, AT, GR} planted in three different row orders, read off the DOM each time.
 *
 * Screenshots are written next to this file's output directory so the frame can actually be
 * looked at rather than only measured. A FAIL is a clause of A-48 that does not hold on screen.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame } from '../packages/client/src/selectors/worldMap.ts';

const { chromium } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
const SHOTS = process.env.CAIRN_SHOTS ?? '/tmp/cairn-i8g';
let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok     ${label}`);
  else { fails++; console.log(`  FAIL   ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note   ${s}`);

const browser = await chromium.launch();

/** Boot the app, plant a library of `[code, trips]` rows, and open the Map tab. */
async function bootWith(spec, viewport = { width: 390, height: 820 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.getByRole('button', { name: /Load Europe 2026/i }).click();
  await page.waitForTimeout(600);
  // Clone the real stored row into the planted library, so every row is a shape the app itself
  // wrote — only `id`, `title` and `countryCodes` move (the method qa/r36-render.mjs §D uses).
  await page.evaluate(async (rows) => {
    const db = await new Promise((res) => { const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); });
    const base = await new Promise((res) => {
      const q = db.transaction('summaries', 'readonly').objectStore('summaries').getAll();
      q.onsuccess = () => res(q.result[0]);
    });
    const tx = db.transaction('summaries', 'readwrite');
    const st = tx.objectStore('summaries');
    const keys = await new Promise((res) => { const q = st.getAllKeys(); q.onsuccess = () => res(q.result); });
    for (const k of keys) st.delete(k);
    rows.forEach(([code, n], i) => {
      for (let t = 0; t < n; t++) {
        st.put({ ...base, id: `i8g-${i}-${t}`, title: `${code} trip ${t}`, countryCodes: [code], cities: [] }, `i8g-${i}-${t}`);
      }
    });
    await new Promise((res) => { tx.oncomplete = res; });
    db.close();
  }, spec);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForSelector('#tabpanel-map path[data-code]');
  await page.waitForTimeout(300);
  return { ctx, page };
}

const readPanes = () => [...document.querySelectorAll('#tabpanel-map .worldmap__pane')].map((p) => {
  const svg = p.querySelector('.worldmap__svg');
  const r = svg.getBoundingClientRect();
  return {
    id: p.getAttribute('data-pane'),
    codes: p.getAttribute('data-pane-codes'),
    viewBox: svg.getAttribute('viewBox'),
    aspect: svg.style.getPropertyValue('--pane-aspect'),
    box: { w: Math.round(r.width), h: Math.round(r.height) },
    caption: p.querySelector('.worldmap__panecap')?.textContent ?? null,
    paths: [...svg.querySelectorAll('path[data-code]')].map((n) => n.dataset.code),
  };
});

// ---------------------------------------------------------------------------
head('A  R36-1 — {FR ×2, GR ×1} ON A PHONE');
{
  const { ctx, page } = await bootWith([['FR', 2], ['GR', 1]]);
  const panes = await page.evaluate(readPanes);
  console.log(`  panes: ${panes.map((p) => `${p.id}[${p.codes}] ${p.box.w}×${p.box.h} vb="${p.viewBox}"`).join('  ')}`);
  ok(panes.length === 1, 'ONE pane on screen — Greece is not in a "Shown separately" inset', panes.length);
  ok(panes[0].codes === 'FR GR' && panes[0].paths.sort().join(',') === 'FR,GR',
    'both countries are drawn in it', { codes: panes[0].codes, paths: panes[0].paths });
  ok(panes.every((p) => p.caption === null), 'no pane carries the outlier caption', panes.map((p) => p.caption));
  // The frame is the selector's, byte for byte — the view computes nothing.
  const want = worldMapFrame(
    core.travelStats(await page.evaluate(async () => {
      const db = await new Promise((res) => { const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); });
      const out = await new Promise((res) => {
        const q = db.transaction('summaries', 'readonly').objectStore('summaries').getAll();
        q.onsuccess = () => res(q.result);
      });
      db.close(); return out;
    }), new Date().toISOString().slice(0, 10)),
    core.COUNTRY_INDEX,
  );
  ok(panes[0].viewBox === want.panes[0].viewBox, 'the rendered viewBox is the bare-Node string, byte for byte',
    { got: panes[0].viewBox, want: want.panes[0].viewBox });
  ok(Number(panes[0].aspect) === want.panes[0].aspect, 'the pane carries the frame\'s own aspect',
    { got: panes[0].aspect, want: want.panes[0].aspect });
  // What C2′ fixed, and what it did not: A-48 residue 1′, measured on screen.
  const b = want.panes[0].bounds;
  note(`the pane spans ${(b.east - b.west).toFixed(1)}° × ${(b.north - b.south).toFixed(1)}° — A-48 residue 1′: C2′ fixed the KEY, not the EXTENT, and FR's own box reaches French Guiana (${b.west.toFixed(1)}°E)`);
  // Tap Greece: the drill-down must reach it from the map itself, not only from the chip list.
  await page.click('#tabpanel-map path[data-code="GR"]', { force: true });
  await page.waitForTimeout(200);
  ok((await page.textContent('.worldmap__drill h2')) === 'GR', 'Greece is tappable on the map');
  await page.screenshot({ path: `${SHOTS}/i8g-fr-gr-390.png`, fullPage: true });
  note(`screenshot: ${SHOTS}/i8g-fr-gr-390.png`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('B  R36-2 — {AE, AT, GR} IN THREE ROW ORDERS, READ OFF THE DOM');
{
  const orders = [[['AE', 1], ['AT', 1], ['GR', 3]], [['GR', 3], ['AT', 1], ['AE', 1]], [['AT', 1], ['GR', 3], ['AE', 1]]];
  const seen = [];
  for (const spec of orders) {
    const { ctx, page } = await bootWith(spec, { width: 1100, height: 900 });
    const panes = await page.evaluate(readPanes);
    const shape = panes.map((p) => `${p.id}[${(p.codes ?? '').split(' ').sort().join(',')}]`).join(' ');
    console.log(`  planted ${spec.map(([c, n]) => `${c}×${n}`).join(' ')} -> ${shape}`);
    seen.push(shape);
    if (spec === orders[0]) await page.screenshot({ path: `${SHOTS}/i8g-ae-at-gr.png`, fullPage: true });
    await ctx.close();
  }
  ok(new Set(seen).size === 1, 'every row order renders the identical frame (A-48 I9, on screen)', seen);
  ok(seen[0] === 'main[AE,AT,GR]', 'and the frame is one pane holding all three — Austria is not the outlier', seen[0]);
}

await browser.close();
console.log(`\n${fails} FAIL\n`);
process.exit(fails === 0 ? 0 : 1);
