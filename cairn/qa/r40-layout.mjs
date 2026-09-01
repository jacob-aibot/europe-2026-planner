/**
 * QA round 40 — I-8j's **G7′/G7″** attacked at widths and libraries `qa/i8j-render.mjs` does
 * not use, and in the colour scheme it does not use.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r40-layout.mjs
 *
 * The builder measured A-54 Part 1's own 8 libraries × its own 5 representative widths, and
 * recorded *"the 12-width sweep A-54 used is not re-run — the other seven are stated to lie
 * between them and I did not check that."* This probe checks that, and goes past it:
 *
 *   A  **The seven widths the builder skipped**, plus three outside A-54's range entirely
 *      (280 px — narrower than any A-54 case; 2560 px; and 1919 px, an odd number so the
 *      1 px gaps cannot divide the container evenly). Eight libraries of my own choosing,
 *      picked for pane counts A-54's matrix does not produce (2, 3, 5, 7, 9, 11) and for the
 *      aspect extremes residue 11 names.
 *   B  **G7″ in DARK MODE**, which the builder states was not measured at all: no cell may draw
 *      a border/outline/shadow, and its background must equal `.worldmap__figure`'s in *both*
 *      schemes — otherwise the slack inside a cell reads as a letterbox again, which is R38-3.
 *   C  **The separator is the ONLY container ink.** A-54's own claim is that the 0.2–0.5%
 *      residue *"is the 1 px gap — the separator itself — and it is the floor, not a tolerance."*
 *      Asserted as an equation rather than as a bound: `container − Σcells` must equal the gap
 *      area the line/column count predicts, to within 2 px².
 *   D  **No cell overflows its container at any width**, i.e. `right` edge inside, which is the
 *      320 px defect A-54 Part 1 found and the reason `min-width: 0` is in the rule.
 *   E  **Reading order** — geometric top-left order equals DOM order at every column count the
 *      sweep produces, including the ones A-54's five widths never reach.
 *
 * A FAIL line is a clause of A-54 Part 1 that does not hold on screen.
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
const statsFor = (rows) => ({
  countries: rows, cities: [], trips: { planned: 0, active: 0, completed: 1 },
  daysTravelled: 10, located: { cities: 0, places: 0, stops: 0 },
  unattributed: { cities: 0, places: 0, stops: 0 }, unnamedCities: 0,
});
const statRow = (code) => ({
  code, firstVisit: '2020-01-01', lastVisit: '2020-01-10', tripIds: [`${code}-t0`], provisional: false,
});
const frameOf = (codes) => worldMapFrame(statsFor(codes.map(statRow)), IDX);

/** Libraries chosen for pane counts and aspect extremes A-54's own matrix never produces. */
const LIBS = {
  'JP+NZ (2 panes)':            ['JP', 'NZ'],
  'IS+KE+AR (3 panes)':         ['IS', 'KE', 'AR'],
  'CA+MA+IN+ID+PE (5 panes)':   ['CA', 'MA', 'IN', 'ID', 'PE'],
  'AQ+CL (aspect extremes)':    ['AQ', 'CL'],
  '7 scattered':                ['GL', 'ZA', 'MN', 'PY', 'PG', 'IS', 'MG'],
  '9 scattered':                ['CA', 'BR', 'NO', 'ZA', 'JP', 'AU', 'MG', 'IS', 'HI'.slice(0, 2) === 'HI' ? 'KI' : 'KI'],
  '11 scattered':               ['US', 'BR', 'GB', 'ZA', 'RU', 'JP', 'AU', 'NZ', 'IS', 'MG', 'PF'],
  'microstates':                ['AI', 'BL', 'MF', 'SX', 'JE'],
};
/** The seven A-54 swept and the builder skipped, plus three outside the range entirely. */
const WIDTHS = [280, 360, 375, 480, 560, 768, 820, 900, 1024, 1280, 1600, 1919, 2560];

const browser = await pw.chromium.launch();

async function openMap(ctx, codes) {
  const page = await ctx.newPage();
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  const load = page.getByRole('button', { name: /Load Europe 2026/i });
  if (await load.count()) { await load.click(); await page.waitForTimeout(600); }
  await page.evaluate(async (cs) => {
    const db = await new Promise((r) => { const q = indexedDB.open('cairn'); q.onsuccess = () => r(q.result); });
    const base = await new Promise((r) => {
      const q = db.transaction('summaries', 'readonly').objectStore('summaries').getAll();
      q.onsuccess = () => r(q.result[0]);
    });
    const tx = db.transaction('summaries', 'readwrite');
    const st = tx.objectStore('summaries');
    const keys = await new Promise((r) => { const q = st.getAllKeys(); q.onsuccess = () => r(q.result); });
    for (const k of keys) st.delete(k);
    cs.forEach((code, i) => st.put(
      { ...base, id: `r40-${i}`, title: `${code}`, countryCodes: [code], cities: [] }, `r40-${i}`));
    await new Promise((r) => { tx.oncomplete = r; });
    db.close();
  }, codes);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForSelector('#tabpanel-map .worldmap__panes');
  await page.waitForTimeout(200);
  return page;
}

const measure = (page) => page.evaluate(() => {
  const panes = document.querySelector('#tabpanel-map .worldmap__panes');
  const figure = document.querySelector('#tabpanel-map .worldmap__figure');
  const pr = panes.getBoundingClientRect();
  const cs0 = getComputedStyle(panes);
  const cells = [...panes.querySelectorAll('.worldmap__pane')].map((cell) => {
    const cr = cell.getBoundingClientRect();
    const cs = getComputedStyle(cell);
    return {
      id: cell.dataset.pane, codes: cell.dataset.paneCodes,
      x: +(cr.x - pr.x).toFixed(3), y: +(cr.y - pr.y).toFixed(3),
      w: cr.width, h: cr.height, right: cr.right,
      borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth],
      outline: cs.outlineStyle, shadow: cs.boxShadow, bg: cs.backgroundColor,
    };
  });
  return {
    container: { w: pr.width, h: pr.height, right: pr.right, bg: cs0.backgroundColor },
    display: cs0.display, wrap: cs0.flexWrap, alignItems: cs0.alignItems, gap: cs0.gap,
    figureBg: getComputedStyle(figure).backgroundColor,
    figureRight: figure.getBoundingClientRect().right,
    cells,
  };
});

// ---------------------------------------------------------------------------
head('A  the seven widths the builder skipped, plus three outside A-54\'s range');

let worstEmpty = { frac: -1 }, worstOver = { over: -1 }, worstCell = { fill: 2 };
const rows = [];
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 820 } });
  for (const [name, codes] of Object.entries(LIBS)) {
    const page = await openMap(ctx, codes);
    const m = await measure(page);
    const sum = m.cells.reduce((n, c) => n + c.w * c.h, 0);
    const area = m.container.w * m.container.h;
    const frac = area > 0 ? sum / area : 0;
    const empty = 1 - frac;
    // lines: distinct y offsets
    const lines = new Set(m.cells.map((c) => c.y)).size;
    const perLine = {};
    for (const c of m.cells) (perLine[c.y] ??= []).push(c);
    const maxCols = Math.max(...Object.values(perLine).map((a) => a.length));
    rows.push({ name, width, panes: m.cells.length, lines, maxCols, fill: +frac.toFixed(5) });
    if (empty > worstEmpty.frac) worstEmpty = { frac: empty, name, width };
    if (frac - 1 > worstOver.over) worstOver = { over: frac - 1, name, width };
    if (frac < worstCell.fill) worstCell = { fill: frac, name, width };
    ok(frac >= 0.985 && frac <= 1.0005,
       `${name} @ ${width}: Σ cell area ÷ container is outside [0.985, 1.0005]`,
       { fill: +frac.toFixed(4), panes: m.cells.length, lines, maxCols });
    // D — no cell may cross the container's right edge (the 320 px defect).
    const over = m.cells.filter((c) => c.right > m.container.right + 0.5);
    ok(over.length === 0, `${name} @ ${width}: a cell OVERFLOWS the container`,
       over.map((c) => ({ id: c.id, right: c.right, containerRight: m.container.right })));
    // G7″ — no cell ink.
    const bordered = m.cells.filter((c) => c.borders.some((b) => b !== '0px')
      || c.outline !== 'none' || c.shadow !== 'none' || c.bg !== m.figureBg);
    ok(bordered.length === 0, `${name} @ ${width}: a cell draws a boundary of its own (G7″)`,
       bordered.map((c) => ({ id: c.id, borders: c.borders, outline: c.outline, shadow: c.shadow, bg: c.bg, fig: m.figureBg })));
    // C — the residue must be exactly the gap the line/column count predicts.
    const gapArea = Object.entries(perLine).reduce((n, [, cs]) => {
      const h = Math.max(...cs.map((c) => c.h));
      return n + (cs.length - 1) * 1 * h;                    // vertical separators on this line
    }, 0) + (lines - 1) * 1 * m.container.w;                 // horizontal separators between lines
    const residue = area - sum;
    ok(Math.abs(residue - gapArea) <= Math.max(4, area * 0.0005),
       `${name} @ ${width}: the container residue is NOT the 1 px gap`,
       { residue: Math.round(residue), predictedGap: Math.round(gapArea), lines, maxCols });
    // E — geometric top-left order equals DOM order.
    const sorted = [...m.cells].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    ok(sorted.map((c) => c.id).join(',') === m.cells.map((c) => c.id).join(','),
       `${name} @ ${width}: reading order is not DOM order`, sorted.map((c) => c.id));
    // the rule itself
    ok(m.display === 'flex' && m.wrap === 'wrap' && m.alignItems === 'normal',
       `${name} @ ${width}: the container is not a wrapping flex line box with stretch`,
       { display: m.display, wrap: m.wrap, alignItems: m.alignItems });
    await page.close();
  }
  await ctx.close();
}
note(`worst empty fraction over ${rows.length} (library, width) pairs: ${(worstEmpty.frac * 100).toFixed(3)}% (${worstEmpty.name} @ ${worstEmpty.width})`);
note(`worst overflow: ${(Math.max(0, worstOver.over) * 100).toFixed(3)}%`);
note('column counts reached: ' + [...new Set(rows.map((r) => r.maxCols))].sort((a, b) => a - b).join(', '));
note('line counts reached:   ' + [...new Set(rows.map((r) => r.lines))].sort((a, b) => a - b).join(', '));
ok(worstEmpty.frac < 0.015, 'the worst empty fraction exceeds A-54\'s stated 0.5% floor by more than 1%',
   { pct: +(worstEmpty.frac * 100).toFixed(3), where: `${worstEmpty.name}@${worstEmpty.width}` });
ok(worstOver.over <= 0.0005, 'a cell overflowed the container at some width',
   { pct: +(worstOver.over * 100).toFixed(3) });

// ---------------------------------------------------------------------------
head('B  G7″ in DARK MODE — the scheme the builder states was not measured at all');
{
  const ctx = await browser.newContext({ viewport: { width: 900, height: 820 }, colorScheme: 'dark' });
  for (const [name, codes] of Object.entries(LIBS)) {
    const page = await openMap(ctx, codes);
    const m = await measure(page);
    const bad = m.cells.filter((c) => c.borders.some((b) => b !== '0px')
      || c.outline !== 'none' || c.shadow !== 'none' || c.bg !== m.figureBg);
    ok(bad.length === 0, `dark / ${name}: a cell draws a boundary or a different background`,
       bad.map((c) => ({ id: c.id, bg: c.bg, fig: m.figureBg, borders: c.borders })));
    const sum = m.cells.reduce((n, c) => n + c.w * c.h, 0);
    const frac = sum / (m.container.w * m.container.h);
    ok(frac >= 0.985 && frac <= 1.0005, `dark / ${name}: the cells do not tile the container`, +frac.toFixed(4));
    if (name === 'JP+NZ (2 panes)') note(`dark: cell bg ${m.cells[0].bg} · figure bg ${m.figureBg} · container ink ${m.container.bg}`);
    await page.close();
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('C  the frame is byte-identical in bare Node at every width (W1 / A-41 Part 7)');
{
  for (const [name, codes] of Object.entries(LIBS)) {
    const f = frameOf(codes);
    note(`${name}: ${f.panes.length} pane(s) · ${f.panes.map((p) => p.viewBox).join(' | ').slice(0, 110)}`);
  }
  const ctx = await browser.newContext({ viewport: { width: 360, height: 820 } });
  const p1 = await openMap(ctx, LIBS['11 scattered']);
  const a = await p1.$$eval('#tabpanel-map .worldmap__svg', (ns) => ns.map((n) => n.getAttribute('viewBox')));
  await p1.close();
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 2560, height: 820 } });
  const p2 = await openMap(ctx2, LIBS['11 scattered']);
  const b = await p2.$$eval('#tabpanel-map .worldmap__svg', (ns) => ns.map((n) => n.getAttribute('viewBox')));
  await p2.close();
  await ctx2.close();
  ok(JSON.stringify(a) === JSON.stringify(b),
     'the viewBoxes DIFFER between 360 px and 2560 px — a per-screen-size frame rule', { a, b });
  ok(JSON.stringify(a) === JSON.stringify(frameOf(LIBS['11 scattered']).panes.map((p) => p.viewBox)),
     'the rendered viewBoxes do not match the bare-Node frame', a);
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAIL(S)`}`);
process.exit(fails === 0 ? 0 : 1);
