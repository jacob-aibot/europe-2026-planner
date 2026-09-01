/**
 * I-8h — the rendered half of §4.4 **A-49** (the detached pane) and **A-50** (the pane box in
 * both directions), driven through the **real app** rather than through the selector.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8h-render.mjs
 *
 *   A  A-50, the symmetric criterion, over ALL 239 single-country libraries at TWO viewports:
 *      the painted map's rendered width equals its `<svg>`'s rendered width and its height
 *      equals its `<svg>`'s rendered height, to within 1 px. **Method is stated, because it is
 *      not one page load per library:** the box A-50 produces is a pure function of
 *      `--pane-aspect`, `--pane-cap` and the available width, all three of which are already on
 *      the real element in the real stylesheet — so the sweep sets the real custom property on
 *      the real `<svg>` and reads the real computed layout back. Section B then drives six
 *      libraries end to end, planting rows and reloading, so the sweep's premise is checked
 *      against the app rather than assumed.
 *   B  Six real libraries end to end at both viewports, including the two A-50 names (`MV` at
 *      aspect 0.170 and `CL` at 0.258) and the shipped reference sample.
 *   C  A-49 C8″ on screen: the detached pane exists, is last, is captioned "Distant parts of"
 *      rather than "Shown separately", is tappable, and draws the parts the main pane does not.
 *   D  A-49 Part 5 / R37-3: the chip list on a library that draws a code twice — `FR` must be
 *      ONE chip with ONE React key, and two `<path>`s.
 *
 * A FAIL line is a clause of A-49 or A-50 that does not hold on screen.
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

const VIEWPORTS = [{ width: 390, height: 820 }, { width: 1440, height: 700 }];

const browser = await pw.chromium.launch();

/** Opens the app, optionally replacing the stored summary rows. Same method as qa/r37-render. */
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
        for (let t = 0; t < n; t++) st.put({ ...base, id: `i8h-${i}-${t}`, title: `${code} ${t}`, countryCodes: [code], cities: [] }, `i8h-${i}-${t}`);
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

/** Box vs painted geometry for every pane on screen — the same measurement r37-render uses. */
const measure = (page) => page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__svg')].map((svg) => {
  const r = svg.getBoundingClientRect();
  const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
  const s = Math.min(r.width / w, r.height / h);
  return {
    id: svg.closest('.worldmap__pane').dataset.pane,
    boxW: r.width, boxH: r.height, drawnW: w * s, drawnH: h * s,
    aspectVar: svg.style.getPropertyValue('--pane-aspect'),
  };
}));

// ---------------------------------------------------------------------------
head('A  A-50 — NO LETTERBOXING IN EITHER DIRECTION, ALL 239 LIBRARIES x 2 VIEWPORTS');

// The aspects the frame produces for every single-country library, computed in bare Node. These
// are the ONLY frame input the box rule reads (A-50: `width: min(100%, calc(cap * aspect))`,
// `aspect-ratio: aspect`, `max-height: cap`), so the sweep below varies exactly this and nothing
// else on the real element.
const aspects = [];
for (const code of CODES) {
  // [I-8i] `role` is withdrawn (A-51 G4); a pane's standing is `home` (A-53 Part 4).
  for (const pane of frameOf([[code, 1]]).panes) aspects.push([`${code}/${pane.id}`, pane.aspect, pane.home.length > 0 ? 'home' : 'extent']);
}
note(`${CODES.length} single-country libraries produce ${aspects.length} panes; aspect range ${Math.min(...aspects.map((a) => a[1])).toFixed(3)} … ${Math.max(...aspects.map((a) => a[1])).toFixed(3)}`);

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await openMap(ctx);
  const bad = await page.evaluate((specs) => {
    const svg = document.querySelector('#tabpanel-map .worldmap__pane .worldmap__svg');
    const before = svg.style.getPropertyValue('--pane-aspect');
    const out = [];
    for (const [label, aspect] of specs) {
      svg.style.setProperty('--pane-aspect', String(aspect));
      const r = svg.getBoundingClientRect();
      // `preserveAspectRatio="xMidYMid meet"` paints the largest box of the viewBox's own aspect
      // that fits, so the painted size is exactly this. `aspect` IS the viewBox's aspect (I-8g
      // Part 6 asserts that identity in bare Node), so no viewBox parsing is needed here.
      const s = Math.min(r.width / aspect, r.height / 1);
      const drawnW = s * aspect;
      const drawnH = s;
      if (Math.abs(drawnW - r.width) > 1 || Math.abs(drawnH - r.height) > 1) {
        out.push({ label, aspect, box: [r.width, r.height], painted: [drawnW, drawnH] });
      }
    }
    svg.style.setProperty('--pane-aspect', before);
    return out;
  }, aspects.map(([label, aspect]) => [label, aspect]));
  ok(bad.length === 0,
    `${vp.width}x${vp.height}: no pane of any of the ${CODES.length} single-country libraries is letterboxed beyond 1 px`,
    bad.slice(0, 6));
  // …and the four A-50 names, printed as the box each one now gets.
  const sample = await page.evaluate((specs) => {
    const svg = document.querySelector('#tabpanel-map .worldmap__pane .worldmap__svg');
    const before = svg.style.getPropertyValue('--pane-aspect');
    const out = specs.map(([label, aspect]) => {
      svg.style.setProperty('--pane-aspect', String(aspect));
      const r = svg.getBoundingClientRect();
      return `${label} ${r.width.toFixed(0)}x${r.height.toFixed(0)}`;
    });
    svg.style.setProperty('--pane-aspect', before);
    return out;
  }, aspects.filter(([l]) => /^(MV|CL|BZ|RU|FJ)\//.test(l)).map(([label, aspect]) => [label, aspect]));
  note(`  ${vp.width}px boxes: ${sample.join(' · ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('B  THE SAME CRITERION END TO END, ON SIX REAL LIBRARIES');

const LIBRARIES = [
  ['MV alone (aspect 0.170 — A-50\'s worst case)', [['MV', 1]]],
  ['CL alone (aspect 0.258 — measured at 33.4% under A-48 Part 6)', [['CL', 1]]],
  ['RU alone (aspect 6.87 — the wide direction)', [['RU', 1]]],
  ['FR + GR (the ship-gate library)', [['FR', 2], ['GR', 1]]],
  ['US alone (CONUS + a detached pane)', [['US', 1]]],
  ['the reference sample', null],
];
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp });
  for (const [label, rows] of LIBRARIES) {
    const page = await openMap(ctx, rows ?? undefined);
    const panes = await measure(page);
    const worst = panes.reduce((m, p) => Math.max(m, Math.abs(p.drawnW - p.boxW), Math.abs(p.drawnH - p.boxH)), 0);
    note(`  ${vp.width}px ${label}: ${panes.map((p) => `${p.id} ${p.drawnW.toFixed(0)}x${p.drawnH.toFixed(0)} in ${p.boxW.toFixed(0)}x${p.boxH.toFixed(0)}`).join(' · ')}`);
    ok(worst <= 1, `${vp.width}px ${label}: no letterboxing in either direction, to within 1 px`, worst.toFixed(2));
    ok(panes.every((p) => p.boxW > 8 && p.boxH > 8), `${vp.width}px ${label}: no pane collapses`, panes.map((p) => [p.boxW, p.boxH]));
    await page.close();
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('C  A-49 C8″ — THE DETACHED PANE ON SCREEN');

{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const page = await openMap(ctx, [['FR', 2], ['GR', 1]]);
  const panes = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__pane')].map((el) => ({
    id: el.dataset.pane,
    cls: el.className,
    kind: el.dataset.paneKind,
    caption: el.querySelector('.worldmap__panecap')?.textContent ?? null,
    aria: el.querySelector('svg').getAttribute('aria-label'),
    codes: [...el.querySelectorAll('path[data-code]')].map((p) => p.dataset.code),
    keys: [...el.querySelectorAll('path[data-code]')].length,
  })));
  note(`panes: ${panes.map((p) => `${p.id}[${p.codes}]`).join('  ')}`);
  // [I-8i] RE-POINTED. A-51 G3 supersedes C8'' — a detached part is a component, therefore an
  // ordinary pane — and A-51 G4 withdraws `role` and the role-keyed CSS modifiers. The claim is
  // unchanged and is read off `data-pane-kind`, which is a `home.length` check in the view.
  ok(panes.length === 2 && panes[1].id === 'p1', 'the extent pane is on screen and is LAST', panes.map((p) => p.id));
  ok(panes[1].kind === 'extent' && panes[0].kind === 'home',
    'it is typed by `home`, not by a role modifier — one kind of pane, two kinds of claim',
    panes.map((p) => p.kind));
  ok(/Distant parts of/i.test(panes[1].caption ?? ''), 'A-49 Part 4 consequence 3: it is NOT captioned "Shown separately"', panes[1].caption);
  ok(!/Shown separately/i.test(panes.map((p) => p.caption).join(' ')), 'and nothing on this library says "Shown separately"');
  ok(/Distant parts of FR/i.test(panes[1].aria ?? ''), 'its aria-label has the matching third branch', panes[1].aria);
  ok(String(panes[1].codes) === 'FR', 'it draws FR, and FR is the only code in it', panes[1].codes);
  ok(String(panes[0].codes.slice().sort()) === 'FR,GR', 'and the main pane still draws both countries', panes[0].codes);
  // A-49 Part 4 consequence 1: the same tap handler and the same attribution in both panes.
  const labels = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map path[data-code="FR"]')].map((p) => p.getAttribute('aria-label')));
  ok(labels.length === 2 && labels[0] === labels[1],
    'both FR paths carry the identical attribution — the tap is the same fact in both panes', labels);
  await page.locator('#tabpanel-map [data-pane-kind="extent"] path[data-code="FR"]').click();
  const drill = await page.locator('#tabpanel-map .worldmap__drill h2').textContent();
  ok(drill.trim() === 'FR', 'the detached pane is tappable and drills down to the same country', drill);
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('D  A-49 PART 5 / R37-3 — ONE CHIP PER COUNTRY, EVEN WHEN A COUNTRY IS DRAWN TWICE');

{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const page = await openMap(ctx, [['FR', 2], ['GR', 1]]);
  // `.codechip__n` is also `.mono` (it carries the trip count), so the code is the FIRST span.
  const chips = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .codelist button')].map((b) => b.querySelector('.mono').textContent.trim()));
  const paths = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map path[data-code]')].map((p) => p.dataset.code));
  note(`chips: ${chips.join(' ')}  ·  paths: ${paths.join(' ')}`);
  ok(String(chips) === 'FR,GR', 'FR is ONE chip, in canonical order, however many panes draw it', chips);
  ok(paths.filter((c) => c === 'FR').length === 2, 'and it is genuinely drawn twice — the duplicate is real', paths);
  // React would warn on two children with the same key; a duplicated key is the defect A-49
  // Part 5 exists to make impossible, so assert the console stayed silent.
  const warnings = [];
  page.on('console', (m) => { if (/same key|duplicate key/i.test(m.text())) warnings.push(m.text()); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForSelector('#tabpanel-map path[data-code]');
  await page.waitForTimeout(400);
  ok(warnings.length === 0, 'React logs no duplicate-key warning for the twice-drawn country', warnings);
  await ctx.close();
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}\n`);
process.exit(fails === 0 ? 0 : 1);
