/**
 * QA round 38 — the rendered half, independent of `qa/i8h-render.mjs`.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r38-render.mjs
 *
 * The builder's own §A does NOT do 478 page loads: it sets `--pane-aspect` on the main pane's
 * real `<svg>` and reads the computed layout back. That premise is checked here the expensive
 * way instead — **real page loads, real frames, every pane measured as it actually lands** —
 * over the cases the builder's six-library §B never reached:
 *
 *   A  the FOUR-PANE layout (A-49 residue 2's worst case), which BUILD-NOTES says was asserted
 *      in tests and never looked at in a browser. Three viewports, screenshots, per-pane box vs
 *      painted geometry, and the detached pane's caption with TWO codes in it.
 *   B  A-50 by real page load, on 14 libraries chosen for extreme aspect (`MV` 0.17 … `UM` 8.45)
 *      and for pane role, at FOUR viewports including two the builder never used.
 *   C  the browser's frame vs bare Node's — every `viewBox` on screen, string for string.
 *   D  the detached pane on the smallest pane there is: `UM`, whose detached pane is a 0.028°
 *      speck, and whose main pane is a 344°-wide 8.45:1 strip.
 *   E  reachability and attribution on the four-pane library: every code chip-listed once, every
 *      path tappable, both rows of a twice-drawn code carrying the same trips.
 *
 * A FAIL line is a clause of A-49 or A-50 that does not hold on screen.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame } from '../packages/client/src/selectors/worldMap.ts';

const URL = process.env.CAIRN_URL || 'http://localhost:4173/';
const SHOTS = '/tmp/cairn-r38';
mkdirSync(SHOTS, { recursive: true });
let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok     ${l}`); else { fails++; console.log(`  FAIL   ${l}${x === undefined ? '' : `  -> ${JSON.stringify(x)}`}`); } };
const note = (s) => console.log(`  NOTE   ${s}`);
const head = (s) => console.log(`\n== ${s} ==`);

const IDX = core.COUNTRY_INDEX;
const statsFor = (rows) => ({
  countries: rows, cities: [], trips: { planned: 0, active: 0, completed: 1 },
  daysTravelled: 10, located: { cities: 0, places: 0, stops: 0 },
  unattributed: { cities: 0, places: 0, stops: 0 }, unnamedCities: 0,
});
const statRow = (code, n = 1) => ({
  code, firstVisit: '2020-01-01', lastVisit: '2020-01-10',
  tripIds: Array.from({ length: n }, (_, i) => `${code}-t${i}`), provisional: false,
});
const frameOf = (spec) => worldMapFrame(statsFor(spec.map(([c, n]) => statRow(c, n))), IDX);

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
        for (let t = 0; t < n; t++) st.put({ ...base, id: `r38-${i}-${t}`, title: `${code} ${t}`, countryCodes: [code], cities: [] }, `r38-${i}-${t}`);
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

/** Every pane on screen: its box, the geometry actually painted in it, and its own attributes. */
const measure = (page) => page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__pane')].map((pane) => {
  const svg = pane.querySelector('.worldmap__svg');
  const r = svg.getBoundingClientRect();
  const vb = svg.getAttribute('viewBox');
  const [, , w, h] = vb.split(' ').map(Number);
  const s = Math.min(r.width / w, r.height / h);
  const cap = getComputedStyle(pane).getPropertyValue('--pane-cap').trim();
  return {
    id: pane.dataset.pane, role: pane.className.replace(/.*worldmap__pane--(\w+).*/, '$1'),
    viewBox: vb, codes: pane.dataset.paneCodes,
    boxW: Math.round(r.width * 100) / 100, boxH: Math.round(r.height * 100) / 100,
    drawnW: Math.round(w * s * 100) / 100, drawnH: Math.round(h * s * 100) / 100,
    top: Math.round(r.top), left: Math.round(r.left), cap,
    aspectVar: svg.style.getPropertyValue('--pane-aspect'),
    caption: pane.querySelector('.worldmap__panecap')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
    aria: svg.getAttribute('aria-label'),
    paths: [...pane.querySelectorAll('path[data-code]')].map((p) => p.dataset.code),
  };
}));

const VIEWPORTS = [
  { width: 390, height: 820, label: '390x820 (the builder\'s phone)' },
  { width: 360, height: 640, label: '360x640 (a smaller phone — NOT swept by the builder)' },
  { width: 1440, height: 700, label: '1440x700 (the builder\'s desktop)' },
  { width: 1100, height: 900, label: '1100x900 (R37-4 measured 87.1% here — NOT re-swept by the builder)' },
];

const FOUR = [['FR', 5], ['JP', 1], ['UM', 1], ['US', 1]];

// ---------------------------------------------------------------------------
head('A  the FOUR-PANE layout, looked at — A-49 residue 2\'s worst case');
{
  const bare = frameOf(FOUR);
  note(`bare Node says ${bare.panes.length} panes: ${bare.panes.map((p) => `${p.id}[${p.codes.join(',')}] aspect ${p.aspect.toFixed(3)}`).join(' · ')}`);
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await openMap(ctx, FOUR);
    const panes = await measure(page);
    await page.screenshot({ path: `${SHOTS}/four-${vp.width}x${vp.height}.png`, fullPage: true });
    ok(panes.length === 4, `${vp.label}: four panes are on screen`, panes.map((p) => p.id));
    for (const p of panes) {
      note(`${vp.width}px ${p.id} [${p.role}] codes=${p.codes} box ${p.boxW}x${p.boxH} painted ${p.drawnW}x${p.drawnH} at (${p.left},${p.top}) cap=${p.cap} paths=${p.paths.join(',')}`);
      ok(Math.abs(p.drawnW - p.boxW) <= 1 && Math.abs(p.drawnH - p.boxH) <= 1,
        `${vp.width}px ${p.id}: A-50 — no letterboxing in either direction`, [p.boxW, p.boxH, p.drawnW, p.drawnH]);
      ok(p.boxW >= 1 && p.boxH >= 1, `${vp.width}px ${p.id}: the pane has not collapsed`, [p.boxW, p.boxH]);
    }
    const det = panes.find((p) => p.role === 'detached');
    ok(det !== undefined && panes[panes.length - 1].role === 'detached', `${vp.label}: the detached pane is LAST`, panes.map((p) => p.role));
    ok(det.codes === 'FR US', `${vp.label}: it carries BOTH codes with a distant part`, det.codes);
    ok(/Distant parts of/i.test(det.caption ?? ''), `${vp.label}: captioned "Distant parts of", not "Shown separately"`, det.caption);
    ok(!/shown separately/i.test(det.caption ?? ''), `${vp.label}: and the outlier caption is absent from it`, det.caption);
    ok(/Distant parts of FR, US/.test(det.aria ?? ''), `${vp.label}: the aria-label names both codes`, det.aria);
    // legibility, stated as a number rather than as a feeling
    const strip = panes.filter((p) => p.boxH < 60);
    if (strip.length) note(`${vp.width}px: pane(s) under 60 px tall — ${strip.map((p) => `${p.id} ${p.boxW}x${p.boxH} (aspect ${Number(p.aspectVar).toFixed(2)})`).join(' · ')}`);
    // no two panes overlap
    let overlap = 0;
    for (let i = 0; i < panes.length; i++) for (let j = i + 1; j < panes.length; j++) {
      const a = panes[i], b = panes[j];
      if (a.left < b.left + b.boxW && b.left < a.left + a.boxW && a.top < b.top + b.boxH && b.top < a.top + a.boxH) overlap++;
    }
    ok(overlap === 0, `${vp.label}: no two panes overlap on screen`, overlap);
    await ctx.close();
  }
  note(`screenshots: ${SHOTS}/four-*.png`);
}

// ---------------------------------------------------------------------------
head('B  A-50 by REAL page load, at four viewports — the builder\'s §A shortcut checked the hard way');
{
  const LIBS = [
    ['MV', [['MV', 1]]], ['CL', [['CL', 1]]], ['RU', [['RU', 1]]], ['FJ', [['FJ', 1]]],
    ['UM', [['UM', 1]]], ['AQ', [['AQ', 1]]], ['KI', [['KI', 1]]], ['VA', [['VA', 1]]],
    ['NO', [['NO', 1]]], ['US', [['US', 1]]], ['FR+GR', [['FR', 2], ['GR', 1]]],
    ['R33-1', [['AT', 1], ['CZ', 1], ['DE', 1], ['GB', 1], ['HR', 1], ['HU', 1], ['US', 1]]],
    ['US+JP', [['US', 1], ['JP', 1]]], ['four-pane', FOUR],
  ];
  let bad = 0, measured = 0, worst = null;
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    for (const [label, spec] of LIBS) {
      const page = await openMap(ctx, spec);
      const panes = await measure(page);
      for (const p of panes) {
        measured++;
        const dw = Math.abs(p.drawnW - p.boxW), dh = Math.abs(p.drawnH - p.boxH);
        if (worst === null || Math.max(dw, dh) > worst[0]) worst = [Math.max(dw, dh), `${label}@${vp.width} ${p.id}`];
        if (dw > 1 || dh > 1) { bad++; console.log(`  FAIL   ${label} @${vp.width}px ${p.id}: letterboxed ${p.boxW}x${p.boxH} box, ${p.drawnW}x${p.drawnH} painted`); fails++; }
      }
      await page.close();
    }
    await ctx.close();
  }
  note(`${measured} panes measured on real page loads across ${VIEWPORTS.length} viewports and ${LIBS.length} libraries`);
  note(`largest box-vs-painted gap anywhere: ${worst[0].toFixed(3)} px (${worst[1]})`);
  ok(bad === 0, 'A-50 holds on every real page load, in both directions, at every viewport', bad);
}

// ---------------------------------------------------------------------------
head('C  the browser\'s frame vs bare Node\'s — string for string');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  for (const spec of [FOUR, [['FR', 2], ['GR', 1]], [['UM', 1]], [['US', 1], ['JP', 1]]]) {
    const page = await openMap(ctx, spec);
    // `travelStats` emits rows in canonical (ascending ISO) order, so the bare-Node reference
    // is built from the sorted spec — pane.codes is row order by I2, and the browser's rows
    // arrive sorted whatever order they were planted in.
    const sorted = [...spec].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const onScreen = (await measure(page)).map((p) => `${p.id}/${p.codes}/${p.viewBox}`);
    const bare = frameOf(sorted).panes.map((p) => `${p.id}/${p.codes.join(' ')}/${p.viewBox}`);
    ok(JSON.stringify(onScreen) === JSON.stringify(bare),
      `${spec.map((s) => s[0]).join('+')}: the rendered viewBoxes are exactly what bare Node computed`, [onScreen, bare]);
    await page.close();
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('D  UM — a 344°-wide main pane and a 0.028° detached speck, on screen');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const page = await openMap(ctx, [['UM', 1]]);
  const panes = await measure(page);
  await page.screenshot({ path: `${SHOTS}/um-390.png`, fullPage: true });
  for (const p of panes) note(`UM ${p.id} [${p.role}] box ${p.boxW}x${p.boxH} painted ${p.drawnW}x${p.drawnH} aspect ${Number(p.aspectVar).toFixed(3)} paths=${p.paths.join(',')}`);
  ok(panes.length === 2 && panes[1].role === 'detached', 'UM alone gets a detached pane (Navassa Island)', panes.map((p) => p.role));
  ok(panes[1].paths.length === 1 && panes[1].paths[0] === 'UM', 'and it draws UM', panes[1].paths);
  const mainH = panes[0].boxH;
  note(`UM's MAIN pane is ${panes[0].boxW} x ${mainH} px — a 344° world in a ${mainH} px strip (A-48 residue: there is no min-height)`);
  ok(mainH >= 1, 'the main pane has not collapsed to nothing', mainH);
  await ctx.close();
  note(`screenshot: ${SHOTS}/um-390.png`);
}

// ---------------------------------------------------------------------------
head('E  reachability and attribution on the four-pane library');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const page = await openMap(ctx, FOUR);
  const chips = await page.$$eval('#tabpanel-map .codelist .codechip', (n) => n.map((x) => x.querySelector('.mono').textContent.trim()));
  const paths = await page.$$eval('#tabpanel-map path[data-code]', (n) => n.map((x) => `${x.dataset.code}@${x.dataset.pane}`));
  note(`chips: ${chips.join(' ')}  ·  paths: ${paths.join(' ')}`);
  ok(JSON.stringify(chips) === JSON.stringify(['FR', 'JP', 'UM', 'US']), 'I13: one chip per drawn code, canonical row order', chips);
  ok(paths.filter((p) => p.startsWith('FR@')).length === 2 && paths.filter((p) => p.startsWith('US@')).length === 2,
    'and FR and US are each genuinely drawn twice', paths);
  const attrs = await page.$$eval('#tabpanel-map path[data-code="US"]', (n) => n.map((x) => x.getAttribute('aria-label')));
  ok(new Set(attrs).size === 1, 'both US rows carry the identical attribution', attrs);
  // every chip drills down
  let drilled = 0;
  for (const c of chips) {
    await page.click(`#tabpanel-map .codelist .codechip:has-text("${c}")`);
    const h = await page.textContent('#tabpanel-map .worldmap__drill h2');
    if (h.trim() === c) drilled++;
    await page.click('#tabpanel-map .worldmap__drill h2').catch(() => {});
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Map' }).click();
    await page.waitForSelector('#tabpanel-map path[data-code]');
  }
  ok(drilled === chips.length, 'every chip drills down to its own country', drilled);
  // duplicate React key warning
  const warns = [];
  page.on('console', (m) => { if (/duplicate|same key/i.test(m.text())) warns.push(m.text()); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForSelector('#tabpanel-map path[data-code]');
  await page.waitForTimeout(400);
  ok(warns.length === 0, 'React logs no duplicate-key warning with two codes drawn twice each', warns);
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('F  R38-3 — A-50 measures the <svg>, not the pane the user sees');
{
  // A-50's criterion is "the painted map's rendered width equals the <svg>'s rendered width and
  // its height equals the <svg>'s rendered height". That passes everywhere (§A/§B). The BOX the
  // user sees is the bordered `.worldmap__pane` cell, and a flex row stretches every cell to its
  // tallest sibling — so a wide inset beside a tall one letterboxes VERTICALLY inside its own
  // bordered cell, in card colour rather than sea colour. This is R37-4's shape one level out.
  const CASES = [
    ['Europe + JP + US (the realistic three-cluster history)', [['DE', 5], ['JP', 1], ['US', 1]], 390],
    ['four-pane', FOUR, 390],
    ['FR + GR (the ship gate)', [['FR', 2], ['GR', 1]], 390],
    ['R33-1 reference', [['AT', 1], ['CZ', 1], ['DE', 1], ['GB', 1], ['HR', 1], ['HU', 1], ['US', 1]], 390],
    ['R33-1 reference', [['AT', 1], ['CZ', 1], ['DE', 1], ['GB', 1], ['HR', 1], ['HU', 1], ['US', 1]], 1440],
  ];
  let worst = null;
  for (const [label, spec, vw] of CASES) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vw === 390 ? 820 : 700 } });
    const page = await openMap(ctx, spec);
    const cells = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__pane')].map((pane) => {
      const svg = pane.querySelector('.worldmap__svg');
      const pr = pane.getBoundingClientRect(), sr = svg.getBoundingClientRect();
      const cap = pane.querySelector('.worldmap__panecap');
      const cr = cap ? cap.getBoundingClientRect() : null;
      return {
        id: pane.dataset.pane,
        cell: [Math.round(pr.width), Math.round(pr.height)],
        svg: [Math.round(sr.width), Math.round(sr.height)],
        capH: cr ? Math.round(cr.height) : 0,
        fill: (sr.width * sr.height) / (pr.width * (pr.height - (cr ? cr.height : 0))),
      };
    }));
    for (const c of cells) {
      const pct = 100 * c.fill;
      note(`${vw}px ${label} · ${c.id}: cell ${c.cell.join('x')} (caption ${c.capH}px), <svg> ${c.svg.join('x')} — the map fills ${pct.toFixed(1)}% of the cell's map area`);
      if (worst === null || pct < worst[0]) worst = [pct, `${vw}px ${label} · ${c.id}`];
    }
    await page.close();
    await ctx.close();
  }
  note(`emptiest pane cell measured: ${worst[0].toFixed(1)}% full (${worst[1]}) — R37-4 filed CL at 33.4% of its box`);
  note('for the shipped sample at 390px this cell was 95.0% full at 09f7ce4 (I-8g) and is 44.1% now: the detached pane halves the inset\'s flex row and `align-items: stretch` keeps the cell tall. Reproduce with `git worktree add /tmp/cairn-r38-wt 09f7ce4`, build, serve on 4174.');
  ok(worst[0] >= 75, 'R38-3: no pane cell is more than a quarter empty once A-50 has landed', worst);
}

// ---------------------------------------------------------------------------
head('G  R38-4 — how big a detached part actually renders when the pane is shared');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const CASES = [
    ['FR + GR (A-49 Part 1\'s own table)', [['FR', 2], ['GR', 1]], 'FR', 'detached'],
    ['FR alone', [['FR', 1]], 'FR', 'detached'],
    ['FR + US (two countries, one trip each)', [['FR', 1], ['US', 1]], 'FR', 'detached'],
    ['four-pane', FOUR, 'FR', 'detached'],
  ];
  let worst = null;
  for (const [label, spec, code, paneId] of CASES) {
    const page = await openMap(ctx, spec);
    const sizes = await page.evaluate(({ code, paneId }) => [...document.querySelectorAll(`#tabpanel-map .worldmap__pane[data-pane="${paneId}"] path[data-code="${code}"]`)]
      .map((p) => { const r = p.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }), { code, paneId });
    for (const [w, h] of sizes) {
      note(`${label}: ${code}'s detached part renders ${w} x ${h} css px = ${w * h} px²`);
      if (worst === null || w * h < worst[0]) worst = [w * h, `${label} ${w}x${h}`];
    }
    await page.close();
  }
  note(`smallest detached part measured: ${worst[0]} px² (${worst[1]}). Round 37 filed R37-1 MAJOR on Greece at 783 px²; WCAG 2.5.8 asks 24x24 = 576 px² of target.`);
  ok(worst[0] >= 576, 'R38-4: every detached part is at least a 24x24 css px target', worst);
  await ctx.close();
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}`);
process.exit(0);
