/**
 * QA round 39 — the rendered half of the I-8i breaker pass (§4.4 **A-51** G7/G8, **A-53**
 * Part 4 and **I18**), driven through the real app.
 *
 *   Needs: npm run web:build && node tools/serve.mjs   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r39-render.mjs
 *
 * Deliberately NOT the builder's `qa/i8i-render.mjs` attack list. What it goes after:
 *
 *   A  **Nothing is hidden, occluded or off-canvas.** Every pane cell is in the document, has a
 *      non-zero box, does not overlap a sibling, and every `<path data-code>` inside it has a
 *      non-empty rendered box. Checked over ten libraries INCLUDING the 14-pane worst case,
 *      which A-51 residue 7 discloses and BUILD-NOTES says nobody scrolled.
 *   B  **I18 on screen, not in the data structure.** DOM order, and the geometric top-left
 *      order the eye actually follows, at one column and at three.
 *   C  **A-53's caption contract.** An extent pane says "Distant parts of", is never phrased as
 *      a destination, carries `weight 0`, and its accessible name makes the same claim its
 *      visible caption does and no larger one.
 *   D  **The `--pane-min` sweep BUILD-NOTES says was not done.** 21 viewport widths from 320 to
 *      1600 px, over three libraries, watching the `auto-fill` column count change: no cell may
 *      letterbox vertically, collapse, or leave a pane unrendered at any of them.
 *   E  **KD-76 checked rather than relayed.** The 35% figure, and chip-list reachability for all
 *      five of `MF SX AI BL JE`, by clicking the chip and reading the drill-down.
 *   F  **The pixel floor.** Every pane's rendered `<svg>` box and every home subject's rendered
 *      bounding box at 390 x 820, looking for anything under WCAG 2.5.8's 24 px.
 *
 * A FAIL is a clause of A-51/A-53 or of BUILD-NOTES that does not hold on screen.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame } from '../packages/client/src/selectors/worldMap.ts';

const URL = process.env.CAIRN_URL || 'http://localhost:4173/';
let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok     ${l}`); else { fails++; console.log(`  FAIL   ${l}${x === undefined ? '' : `  -> ${JSON.stringify(x)}`}`); } };
const note = (s) => console.log(`  NOTE   ${s}`);
const head = (s) => console.log(`\n== ${s} ==`);

const IDX = core.COUNTRY_INDEX;
const CODES = [...new Set(IDX.countries.map((c) => c.code))].sort();
const statRow = (code, n = 1) => ({
  code, firstVisit: '2020-01-01', lastVisit: '2020-01-10',
  tripIds: Array.from({ length: n }, (_, i) => `${code}-t${i}`), provisional: false,
});
/**
 * `travelStats` emits `countries` in ascending ISO order and G2's canonical part list is built
 * from that order, so the spec is sorted here before the frame is computed. It matters: G5's
 * third key is a position in that list, so an unsorted spec produces a different PANE ORDER from
 * the one the app renders — see `qa/r39-a51.mjs` §L.
 */
const frameOf = (spec) => worldMapFrame({
  countries: [...spec].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([c, n]) => statRow(c, n)), cities: [],
  trips: { planned: 0, active: 0, completed: 1 }, daysTravelled: 10,
  located: { cities: 0, places: 0, stops: 0 }, unattributed: { cities: 0, places: 0, stops: 0 }, unnamedCities: 0,
}, IDX);

const LIBS = {
  'reference sample': [['AT', 1], ['CZ', 1], ['DE', 1], ['GB', 1], ['HR', 1], ['HU', 1], ['US', 1]],
  'FR': [['FR', 1]],
  'FR+US': [['FR', 1], ['US', 1]],
  'sparse IS NZ MN': [['IS', 1], ['NZ', 1], ['MN', 1]],
  'sparse CL NO JP MG': [['CL', 1], ['NO', 1], ['JP', 1], ['MG', 1]],
  'sparse SG GL UY': [['SG', 1], ['GL', 1], ['UY', 1]],
  'worldwide 12': [['US', 2], ['BR', 1], ['GB', 1], ['FR', 1], ['ZA', 1], ['EG', 1], ['IN', 1], ['JP', 1], ['AU', 1], ['NZ', 1], ['TH', 1], ['PE', 1]],
  'greedy 14': [['AD', 1], ['AE', 1], ['AG', 1], ['AO', 1], ['AQ', 1], ['AR', 1], ['AS', 1], ['AU', 1], ['CA', 1], ['CN', 1], ['FM', 1], ['IO', 1], ['PN', 1], ['TF', 1]],
  'ceiling 239': CODES.map((c) => [c, 1]),
  'microstates': [['MF', 1], ['SX', 1], ['AI', 1], ['BL', 1], ['JE', 1], ['FR', 1]],
};

const browser = await pw.chromium.launch();

async function openMap(ctx, rows) {
  const page = await ctx.newPage();
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  const load = page.getByRole('button', { name: /Load Europe 2026/i });
  if (await load.count()) { await load.click(); await page.waitForTimeout(600); }
  if (rows) {
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
        for (let t = 0; t < n; t++) st.put({ ...base, id: `r39-${i}-${t}`, title: `${code} ${t}`, countryCodes: [code], cities: [] }, `r39-${i}-${t}`);
      });
      await new Promise((r) => { tx.oncomplete = r; });
      db.close();
    }, rows);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tabbar');
  }
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForSelector('#tabpanel-map path[data-code]');
  await page.waitForTimeout(250);
  return page;
}

/** Every pane cell as the browser actually laid it out, plus every drawn path's own box. */
const readPanes = (page) => page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__pane')].map((cell) => {
  const cr = cell.getBoundingClientRect();
  const svg = cell.querySelector('.worldmap__svg');
  const sr = svg.getBoundingClientRect();
  const cs = getComputedStyle(cell);
  const cap = cell.querySelector('.worldmap__panecap');
  return {
    id: cell.dataset.pane,
    kind: cell.dataset.paneKind,
    weight: Number(cell.dataset.paneWeight),
    codes: cell.dataset.paneCodes,
    caption: (cap?.textContent ?? '').trim(),
    aria: svg.getAttribute('aria-label'),
    visibility: cs.visibility, display: cs.display, opacity: cs.opacity,
    // absolute document coordinates, so scroll position cannot make a pane look absent
    top: cr.top + scrollY, left: cr.left + scrollX, w: cr.width, h: cr.height,
    svgW: sr.width, svgH: sr.height,
    paths: [...cell.querySelectorAll('path[data-code]')].map((p) => {
      const b = p.getBBox();
      const r = p.getBoundingClientRect();
      return { code: p.dataset.code, bbW: b.width, bbH: b.height, pxW: r.width, pxH: r.height };
    }),
  };
}));

const pageHeight = (page) => page.evaluate(() => document.documentElement.scrollHeight);

// ===========================================================================
head('A  nothing is hidden, occluded, collapsed or off-canvas');
// ===========================================================================
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  for (const [name, spec] of Object.entries(LIBS)) {
    const page = await openMap(ctx, spec);
    const frame = frameOf(spec);
    const panes = await readPanes(page);
    const H = await pageHeight(page);
    ok(panes.length === frame.panes.length,
      `${name}: every one of the selector's ${frame.panes.length} panes is in the document`, [panes.length, frame.panes.length]);
    ok(panes.map((p) => p.id).join() === frame.panes.map((p) => p.id).join(),
      `${name}: DOM pane order === selector pane order`, [panes.map((p) => p.id), frame.panes.map((p) => p.id)]);
    const dead = panes.filter((p) => p.w < 1 || p.h < 1 || p.display === 'none' || p.visibility === 'hidden' || Number(p.opacity) === 0);
    ok(dead.length === 0, `${name}: no pane is collapsed, display:none, hidden or transparent`, dead.map((p) => [p.id, p.w, p.h, p.display, p.visibility]));
    // overlap: no two cells may share document area
    let over = [];
    for (let i = 0; i < panes.length; i++) for (let j = i + 1; j < panes.length; j++) {
      const a = panes[i], b = panes[j];
      if (a.left < b.left + b.w - 0.5 && b.left < a.left + a.w - 0.5 && a.top < b.top + b.h - 0.5 && b.top < a.top + a.h - 0.5) over.push([a.id, b.id]);
    }
    ok(over.length === 0, `${name}: no two pane cells overlap`, over);
    // every drawn path has an actual rendered extent
    const empties = panes.flatMap((p) => p.paths.filter((q) => q.bbW === 0 && q.bbH === 0).map((q) => [p.id, q.code]));
    ok(empties.length === 0, `${name}: every drawn country path has a non-zero geometric bounding box`, empties);
    // the paint list and the DOM agree, pane by pane
    const domRows = panes.flatMap((p) => p.paths.map((q) => `${q.code}@${p.id}`)).sort();
    const selRows = frame.countries.map((c) => `${c.code}@${c.paneId}`).sort();
    ok(domRows.join() === selRows.join(), `${name}: every (code, pane) row the selector emitted is painted, and no others`,
      { missingInDom: selRows.filter((r) => !domRows.includes(r)).slice(0, 8) });
    note(`${name}: ${panes.length} panes, page ${H} px tall, smallest cell ${Math.min(...panes.map((p) => p.h)).toFixed(0)} px`);
    await page.close();
  }
  await ctx.close();
}

// ===========================================================================
head('B  I18 on screen — DOM order and reading order at one column and three');
// ===========================================================================
for (const vp of [{ width: 390, height: 820 }, { width: 1440, height: 700 }]) {
  const ctx = await browser.newContext({ viewport: vp });
  for (const name of ['FR', 'FR+US', 'reference sample', 'worldwide 12', 'microstates']) {
    const page = await openMap(ctx, LIBS[name]);
    const panes = await readPanes(page);
    const kinds = panes.map((p) => (p.kind === 'extent' ? 0 : 1));
    ok(!kinds.join('').includes('01'), `${vp.width}px ${name}: every home pane precedes every extent pane in DOM order (I18)`, panes.map((p) => [p.id, p.kind]));
    // the eye's order on a grid: sort by (row band, then left). A row band is a top within 4 px.
    const byEye = [...panes].sort((a, b) => (Math.abs(a.top - b.top) > 4 ? a.top - b.top : a.left - b.left));
    ok(byEye.map((p) => p.id).join() === panes.map((p) => p.id).join(),
      `${vp.width}px ${name}: the top-left-first reading order of the laid-out grid IS the DOM order`, byEye.map((p) => [p.id, +p.top.toFixed(0), +p.left.toFixed(0)]));
    const eyeKinds = byEye.map((p) => (p.kind === 'extent' ? 0 : 1));
    ok(!eyeKinds.join('').includes('01'), `${vp.width}px ${name}: and therefore I18 holds for the eye as well as for the DOM`, byEye.map((p) => [p.id, p.kind]));
    // panes[0] is the top-left one and is a home pane
    ok(panes[0].kind === 'home', `${vp.width}px ${name}: panes[0] is a HOME pane`, panes[0]);
    await page.close();
  }
  await ctx.close();
}

// ===========================================================================
head('C  A-53 Part 4 — the extent pane\'s caption and its accessible name');
// ===========================================================================
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const DESTINATIONY = /\bvisited\b|\btrip\b|\bwent\b|\bdestination\b|\byou have been\b|\bcountries visited\b/i;
  for (const name of ['FR', 'FR+US', 'reference sample', 'worldwide 12']) {
    const page = await openMap(ctx, LIBS[name]);
    const panes = await readPanes(page);
    for (const p of panes.filter((x) => x.kind === 'extent')) {
      ok(p.weight === 0, `${name}/${p.id}: an extent pane's published weight is 0`, p.weight);
      ok(/^Distant parts of/.test(p.caption), `${name}/${p.id}: its visible caption begins "Distant parts of" — "${p.caption}"`, p.caption);
      ok(!/shown separately/i.test(p.caption), `${name}/${p.id}: the caption does not say "shown separately"`, p.caption);
      ok(!DESTINATIONY.test(p.caption), `${name}/${p.id}: the caption is not phrased as a destination`, p.caption);
      ok(!DESTINATIONY.test(p.aria), `${name}/${p.id}: neither is its accessible name — "${p.aria}"`, p.aria);
      ok(!/separate|separately/i.test(p.aria),
        `${name}/${p.id}: and the accessible name makes the SAME claim as the visible caption, not a larger one`, p.aria);
    }
    for (const p of panes.filter((x) => x.kind === 'home')) {
      ok(p.weight >= 1, `${name}/${p.id}: a home pane's published weight is >= 1`, p.weight);
      ok(!/Distant parts of/.test(p.caption), `${name}/${p.id}: a home pane is NOT captioned "Distant parts of"`, p.caption);
    }
    await page.close();
  }
  await ctx.close();
}

// ===========================================================================
head('D  the `--pane-min` sweep BUILD-NOTES says was not done (320…1600 px)');
// ===========================================================================
{
  const WIDTHS = [320, 340, 360, 390, 420, 480, 560, 640, 720, 800, 880, 900, 960, 1024, 1100, 1200, 1280, 1366, 1440, 1520, 1600];
  const cases = ['FR+US', 'worldwide 12', 'greedy 14'];
  let bad = 0, colSeen = {};
  for (const name of cases) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await openMap(ctx, LIBS[name]);
      const panes = await readPanes(page);
      const frame = frameOf(LIBS[name]);
      const cols = new Set(panes.map((p) => Math.round(p.left))).size;
      colSeen[`${name}@${width}`] = cols;
      if (panes.length !== frame.panes.length) { bad++; note(`  ${name}@${width}: ${panes.length} panes rendered, ${frame.panes.length} expected`); }
      for (const p of panes) {
        if (p.w < 1 || p.h < 1) { bad++; note(`  ${name}@${width}: ${p.id} is ${p.w}x${p.h}`); }
        // vertical letterboxing — the criterion R38-3 is about. Caption height is inside the cell.
        const slack = p.h - p.svgH - (await page.evaluate((id) => {
          const cell = document.querySelector(`[data-pane="${id}"]`);
          const cap = cell.querySelector('.worldmap__panecap');
          const cs = getComputedStyle(cell);
          return (cap ? cap.getBoundingClientRect().height : 0) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        }, p.id));
        if (slack > 1.01) { bad++; note(`  ${name}@${width}: ${p.id} letterboxes vertically by ${slack.toFixed(1)} px`); }
      }
      await page.close();
      await ctx.close();
    }
  }
  note(`column counts observed: ${JSON.stringify(colSeen)}`);
  ok(bad === 0, `${WIDTHS.length} widths x ${cases.length} libraries: no missing pane, no collapsed cell, no vertical letterbox`, bad);
}

// ===========================================================================
head('E  KD-76 — the 35% figure and the five deferred microstates');
// ===========================================================================
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  // A ONE-pane library: A-50's main cap was min(58vh, 460px); A-51 G7's is min(38vh, 300px).
  const page = await openMap(ctx, [['AT', 1], ['CZ', 1], ['DE', 1], ['HR', 1], ['HU', 1], ['SI', 1]]);
  const [pane] = await readPanes(page);
  const cap = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.worldmap__svg')).maxHeight));
  note(`one-pane library: --pane-cap resolves to ${cap} px, svg is ${pane.svgW.toFixed(0)}x${pane.svgH.toFixed(0)}`);
  ok(Math.abs(cap - 300) < 1, 'the cap is min(38vh, 300px) = 300 px at 820 px tall', cap);
  note(`KD-76's "35% shorter": 300/460 = ${(100 * (1 - 300 / 460)).toFixed(1)}% shorter than A-50's main-pane cap`);
  ok(Math.abs((1 - 300 / 460) - 0.35) < 0.01, 'the 35% figure re-derives', 1 - 300 / 460);
  await page.close();

  // Reachability of all five, by clicking the chip and reading the drill-down.
  const p2 = await openMap(ctx, LIBS['microstates']);
  for (const code of ['MF', 'SX', 'AI', 'BL', 'JE']) {
    const chip = p2.locator(`#tabpanel-map .codelist .codechip:has(span.mono:text-is("${code}"))`);
    const n = await chip.count();
    ok(n === 1, `A-48 residue 6: \`${code}\` has exactly one chip in the code list`, n);
    if (n !== 1) continue;
    await chip.first().click();
    const h2 = (await p2.locator('#tabpanel-map .worldmap__drill h2').textContent()).trim();
    ok(h2 === code, `and clicking it opens \`${code}\`'s drill-down — unconditional reachability holds`, h2);
    await p2.locator('#tabpanel-map .worldmap__drill h2').evaluate(() => {});
    await p2.reload({ waitUntil: 'domcontentloaded' });
    await p2.getByRole('tab', { name: 'Map' }).click();
    await p2.waitForSelector('#tabpanel-map path[data-code]');
  }
  await p2.close();
  await ctx.close();
}

// ===========================================================================
head('F  the pixel floor at 390 x 820');
// ===========================================================================
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const CASES = { ...LIBS, FJ: [['FJ', 1]], RU: [['RU', 1]], UM: [['UM', 1]], MV: [['MV', 1]] };
  const small = [];
  for (const [name, spec] of Object.entries(CASES)) {
    if (name === 'ceiling 239') continue;
    const page = await openMap(ctx, spec);
    const panes = await readPanes(page);
    const frame = frameOf(spec);
    for (const p of panes) {
      if (p.svgW < 24 || p.svgH < 24) small.push({ lib: name, pane: p.id, kind: p.kind, codes: p.codes, svg: [+p.svgW.toFixed(0), +p.svgH.toFixed(0)] });
      // L3 is about a code's HOME pane. `codes` includes a code present only by a non-principal
      // part (A-53 residue 9 — `FR` in the `BR FR PE` pane is French Guiana), which is not it.
      const homeCodes = frame.panes.find((x) => x.id === p.id)?.home ?? [];
      for (const q of p.paths) {
        if (!homeCodes.includes(q.code)) continue;
        if (q.pxW < 24 || q.pxH < 24) small.push({ lib: name, pane: p.id, subject: q.code, px: [+q.pxW.toFixed(1), +q.pxH.toFixed(1)] });
      }
    }
    await page.close();
  }
  note(`rendered boxes under 24 px at 390 x 820: ${JSON.stringify(small)}`);
  ok(small.filter((s) => s.subject === undefined).length === 0,
    'A-51 L3: no PANE renders below 24 px in either dimension', small.filter((s) => s.subject === undefined));
  ok(small.filter((s) => s.subject !== undefined).length === 0,
    'A-51 L3: no HOME subject renders below 24 x 24 px in its own home pane', small.filter((s) => s.subject !== undefined));
  await ctx.close();
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}`);
