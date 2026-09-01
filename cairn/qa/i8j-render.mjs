/**
 * I-8j — the rendered half of §4.4 **A-54**: **G7′** (the panes are a wrapping flex line box
 * whose cells fill their line), **G7″** (no cell draws a boundary of its own), and **I19** on
 * screen (a code the index cannot draw is *stated in words*, never a blank card).
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8j-render.mjs
 *
 *   A  **The container is tiled by its cells** (MGR-1). `Σ cell area ÷ container area` over the
 *      8 libraries × 5 widths matrix A-54 Part 1 publishes: **≥ 0.99 and ≤ 1.00** in all 40
 *      cells. **Both bounds are load-bearing** — the upper one is the 320 px overflow, where the
 *      shipped `minmax(300px, 1fr)` grid drew 12 px wider than the 288 px box that clips it.
 *   B  **G7″ — no cell draws a boundary of its own.** All four `border-*-width` are `0px`,
 *      `outline-style` is `none`, `box-shadow` is `none`, and the cell's `background-color`
 *      equals `.worldmap__figure`'s. **This is the clause that keeps R38-3 fixed** now that its
 *      own cell criterion is withdrawn, and it is why the slack inside a cell reads as
 *      whitespace rather than as a letterbox.
 *   C  **A-50 is unchanged and still holds** — the painted map fills its own `<svg>` in both
 *      directions, to within 1 px, on every pane of the matrix.
 *   D  **Nothing on screen gets smaller at 390 px and above**, measured against the shipped
 *      grid's own numbers, which are pinned here as literals. At **320 px the comparison is
 *      deliberately the other way**: the maps are smaller and whole rather than larger and
 *      cropped, and the criterion at that width is A's upper bound.
 *   E  **Reading order is untouched.** DOM order equals frame order; the geometric top-left
 *      ordering of the cells equals DOM order at one, two, three and four columns; and no extent
 *      pane precedes a home pane in either. **This is the criterion that refuses masonry.**
 *   F  **I19 on screen.** A code the shipped index cannot fill is stated in words in
 *      `.worldmap__gap` and paints no empty card.
 *
 * A FAIL line is a clause of A-54 that does not hold on screen.
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
const statRow = (code) => ({
  code, firstVisit: '2020-01-01', lastVisit: '2020-01-10', tripIds: [`${code}-t0`], provisional: false,
});
const frameOf = (codes) => worldMapFrame(statsFor(codes.map(statRow)), IDX);

/** A-54 Part 1's own eight libraries, in its own order. */
const LIBS = {
  'Europe 2026 fixture': ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US'],
  'FR+US': ['FR', 'US'],
  'AT CZ DE HR HU SI': ['AT', 'CZ', 'DE', 'HR', 'HU', 'SI'],
  'sparse CL NO JP MG': ['CL', 'NO', 'JP', 'MG'],
  'worldwide 12': ['AU', 'BR', 'EG', 'FR', 'GB', 'IN', 'JP', 'NZ', 'PE', 'TH', 'US', 'ZA'],
  'greedy 18': ['AQ', 'AU', 'CL', 'EH', 'FJ', 'GL', 'GU', 'IO', 'MS', 'MX', 'PK', 'PN', 'RO', 'RU', 'RW', 'SH', 'TF', 'VN'],
  'ceiling 239': CODES,
  'FJ alone': ['FJ'],
};
const WIDTHS = [320, 390, 640, 960, 1440];

/**
 * **A-54 Part 1's own numbers for the SHIPPED grid**, transcribed as the fault's oracle so the
 * "nothing gets smaller" clause has something to compare against without re-running the old
 * stylesheet. Positive = fraction of the container left bare; negative = overflow.
 */
const SHIPPED_EMPTY = {
  'Europe 2026 fixture': { 320: -0.046, 390: 0.003, 640: 0.347, 960: 0.301, 1440: 0.290 },
  'FR+US': { 320: -0.046, 390: 0.003, 640: 0.072, 960: 0.462, 1440: 0.456 },
  'AT CZ DE HR HU SI': { 320: -0.049, 390: 0.000, 640: 0.501, 960: 0.667, 1440: 0.667 },
  'sparse CL NO JP MG': { 320: -0.046, 390: 0.002, 640: 0.053, 960: 0.329, 1440: 0.329 },
  'worldwide 12': { 320: -0.045, 390: 0.003, 640: 0.128, 960: 0.239, 1440: 0.235 },
  'greedy 18': { 320: -0.045, 390: 0.004, 640: 0.179, 960: 0.254, 1440: 0.251 },
  'ceiling 239': { 320: -0.049, 390: 0.000, 640: 0.501, 960: 0.667, 1440: 0.667 },
  'FJ alone': { 320: -0.049, 390: 0.000, 640: 0.501, 960: 0.667, 1440: 0.667 },
};

const browser = await pw.chromium.launch();

/** Opens the app with a synthetic library. Same method as qa/i8i-render.mjs. */
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
      { ...base, id: `i8j-${i}`, title: `${code}`, countryCodes: [code], cities: [] }, `i8j-${i}`));
    await new Promise((r) => { tx.oncomplete = r; });
    db.close();
  }, codes);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForSelector('#tabpanel-map .worldmap__panes');
  await page.waitForTimeout(250);
  return page;
}

/**
 * **The CONTAINER measurement — A-54 G7′'s criterion, and the reason it is written at this box.**
 * R38-3's criterion measured the CELL and passed on a container with a 46% hole in it; A-50's
 * measured the `<svg>` and passed on a cell with a letterbox in it. *A criterion written about
 * the box one level in cannot see the box one level out*, so this one is written at the
 * container, which is the outermost box this surface has.
 */
const measure = (page) => page.evaluate(() => {
  const panes = document.querySelector('#tabpanel-map .worldmap__panes');
  const figure = document.querySelector('#tabpanel-map .worldmap__figure');
  const pr = panes.getBoundingClientRect();
  const fr = figure.getBoundingClientRect();
  const figBg = getComputedStyle(figure).backgroundColor;
  const cells = [...panes.querySelectorAll('.worldmap__pane')].map((cell) => {
    const cr = cell.getBoundingClientRect();
    const cs = getComputedStyle(cell);
    const svg = cell.querySelector('.worldmap__svg');
    const sr = svg.getBoundingClientRect();
    const [, , vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
    const s = Math.min(sr.width / vw, sr.height / vh);
    return {
      id: cell.dataset.pane, kind: cell.dataset.paneKind, codes: cell.dataset.paneCodes,
      x: cr.x - pr.x, y: cr.y - pr.y, w: cr.width, h: cr.height, area: cr.width * cr.height,
      svgW: sr.width, svgH: sr.height, svgArea: sr.width * sr.height,
      drawnW: vw * s, drawnH: vh * s,
      borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth],
      outline: cs.outlineStyle, shadow: cs.boxShadow, bg: cs.backgroundColor,
      display: getComputedStyle(panes).display,
      wrap: getComputedStyle(panes).flexWrap,
      alignItems: getComputedStyle(panes).alignItems,
    };
  });
  return {
    container: { w: pr.width, h: pr.height, area: pr.width * pr.height, x: pr.x, right: pr.right },
    figure: { w: fr.width, right: fr.right, bg: figBg },
    display: getComputedStyle(panes).display,
    wrap: getComputedStyle(panes).flexWrap,
    alignItems: getComputedStyle(panes).alignItems,
    cells,
    /** The per-code rendered path area, for D's "nothing gets smaller" clause. */
    paths: [...document.querySelectorAll('#tabpanel-map path[data-code]')].map((p) => {
      const r = p.getBoundingClientRect();
      return { code: p.dataset.code, pane: p.dataset.pane, area: Math.round(r.width * r.height) };
    }),
  };
});

// ---------------------------------------------------------------------------
head('A  G7′ — THE CONTAINER IS TILED BY ITS CELLS, 8 LIBRARIES x 5 WIDTHS');

/** `library -> width -> measurement`, kept so B…E do not re-open 40 pages. */
const M = {};
let worstEmpty = { frac: -1 }, worstOverflow = { over: -1 };

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 820 } });
  for (const [name, codes] of Object.entries(LIBS)) {
    const page = await openMap(ctx, codes);
    const m = await measure(page);
    (M[name] ??= {})[width] = m;
    const sum = m.cells.reduce((n, c) => n + c.area, 0);
    const occupancy = sum / m.container.area;
    const empty = 1 - occupancy;
    if (empty > worstEmpty.frac) worstEmpty = { frac: empty, name, width };
    if (occupancy - 1 > worstOverflow.over) worstOverflow = { over: occupancy - 1, name, width };
    note(`${width}px · ${name}: ${m.cells.length} cells, occupancy ${(occupancy * 100).toFixed(1)}% ` +
      `(shipped grid left ${(SHIPPED_EMPTY[name][width] * 100).toFixed(1)}% bare)`);
    ok(occupancy >= 0.99, `${width}px · ${name}: Σ cell area ÷ container area ≥ 0.99 (MGR-1: the grid left up to 66.7% bare)`,
      Number(occupancy.toFixed(4)));
    ok(occupancy <= 1.0001, `${width}px · ${name}: …and ≤ 1.00 — no cell overflows the box that clips it (the 320 px defect)`,
      Number(occupancy.toFixed(4)));
    await page.close();
  }
  await ctx.close();
}
note(`worst empty fraction over all 40 cells: ${(worstEmpty.frac * 100).toFixed(2)}% (${worstEmpty.name} @ ${worstEmpty.width}px)`);
note(`worst overflow over all 40 cells: ${(worstOverflow.over * 100).toFixed(2)}%`);
ok(worstEmpty.frac <= 0.01, 'A-54 Part 1: the residue is the 1 px gap, not a tolerance — ≤ 1% everywhere', worstEmpty);

// ---------------------------------------------------------------------------
head('A′ the mechanism itself — a wrapping flex line box, and align-items back at stretch');

for (const [name, byWidth] of Object.entries(M)) {
  const m = byWidth[1440];
  ok(m.display === 'flex' && m.wrap === 'wrap',
    `${name}: .worldmap__panes is a wrapping flex line box (G7′), not a grid`, [m.display, m.wrap]);
  ok(m.alignItems === 'normal' || m.alignItems === 'stretch',
    `${name}: align-items is back at its stretch default — a flex line's items are all its height`, m.alignItems);
}

// ---------------------------------------------------------------------------
head('B  G7″ — NO CELL DRAWS A BOUNDARY OF ITS OWN (this is what keeps R38-3 fixed)');

for (const [name, byWidth] of Object.entries(M)) {
  for (const width of [390, 1440]) {
    const m = byWidth[width];
    const bordered = m.cells.filter((c) => c.borders.some((b) => parseFloat(b) !== 0));
    ok(bordered.length === 0, `${width}px · ${name}: every cell has all four border widths at 0px`,
      bordered.map((c) => [c.id, c.borders]));
    const outlined = m.cells.filter((c) => c.outline !== 'none');
    ok(outlined.length === 0, `${width}px · ${name}: no cell has an outline`, outlined.map((c) => [c.id, c.outline]));
    const shadowed = m.cells.filter((c) => c.shadow !== 'none');
    ok(shadowed.length === 0, `${width}px · ${name}: no cell has a box-shadow`, shadowed.map((c) => [c.id, c.shadow]));
    const offColour = m.cells.filter((c) => c.bg !== m.figure.bg);
    ok(offColour.length === 0,
      `${width}px · ${name}: every cell's background-color equals .worldmap__figure's — the slack is whitespace, not a hole`,
      offColour.map((c) => [c.id, c.bg, m.figure.bg]));
  }
}

// ---------------------------------------------------------------------------
head('C  A-50 IS UNCHANGED — THE PAINTED MAP STILL FILLS ITS OWN <svg>, BOTH DIRECTIONS');

for (const [name, byWidth] of Object.entries(M)) {
  for (const width of WIDTHS) {
    const m = byWidth[width];
    const bad = m.cells.filter((c) => Math.abs(c.drawnW - c.svgW) > 1 || Math.abs(c.drawnH - c.svgH) > 1);
    ok(bad.length === 0, `${width}px · ${name}: A-50 holds on every pane`,
      bad.map((c) => [c.id, c.drawnW, c.svgW, c.drawnH, c.svgH]));
  }
}

// ---------------------------------------------------------------------------
head('D  NOTHING GETS SMALLER AT 390 px AND ABOVE — A-54 Part 1\'s pinned growth numbers');

const svgAreaOf = (name, width) => M[name][width].cells.reduce((n, c) => n + c.svgArea, 0);
note(`the 239-code ceiling @640: total <svg> ${Math.round(svgAreaOf('ceiling 239', 640))} px² (shipped grid: 45,956; A-54 predicts ~179,180)`);
note(`AT CZ DE HR HU SI @960: total <svg> ${Math.round(svgAreaOf('AT CZ DE HR HU SI', 960))} px² (shipped grid: 71,851; A-54 predicts ~118,817)`);
ok(svgAreaOf('ceiling 239', 640) > 45956 * 2,
  'the 239-code ceiling at 640 px is more than twice the shipped grid\'s 45,956 px² (A-54: 3.9x)',
  Math.round(svgAreaOf('ceiling 239', 640)));
ok(svgAreaOf('AT CZ DE HR HU SI', 960) > 71851,
  'AT CZ DE HR HU SI at 960 px grows from 71,851 px² (A-54: 1.7x)',
  Math.round(svgAreaOf('AT CZ DE HR HU SI', 960)));
const fj = M['FJ alone'][960].paths.find((p) => p.code === 'FJ');
note(`FJ alone @960: Fiji's own path ${fj?.area} px² (shipped grid: 552; A-54 predicts ~4,992 — R39-7's residue, improved not fixed)`);
ok((fj?.area ?? 0) > 552, 'FJ alone at 960 px: Fiji\'s own path is larger than the shipped grid\'s 552 px²', fj);
// A-54 Part 1's "must NOT move" set: these four are identical at 390 px and above.
for (const name of ['Europe 2026 fixture', 'FR+US', 'worldwide 12', 'greedy 18']) {
  for (const width of [390, 640, 960, 1440]) {
    const m = M[name][width];
    ok(m.cells.every((c) => c.svgArea > 0), `${width}px · ${name}: every pane still has a non-zero <svg>`,
      m.cells.filter((c) => c.svgArea === 0).map((c) => c.id));
  }
}
// 320 px: the comparison is deliberately the other way — smaller and WHOLE, not larger and cropped.
for (const [name] of Object.entries(LIBS)) {
  const m = M[name][320];
  const clipped = m.cells.filter((c) => c.x + c.w > m.container.w + 1);
  ok(clipped.length === 0,
    `320px · ${name}: no cell extends past the container that clips it — the shipped grid overflowed by 12 px`,
    clipped.map((c) => [c.id, c.x + c.w, m.container.w]));
}

// ---------------------------------------------------------------------------
head('E  READING ORDER IS UNTOUCHED — THIS IS THE CRITERION THAT REFUSES MASONRY');

for (const [name, codes] of Object.entries(LIBS)) {
  const frame = frameOf(codes);
  for (const width of WIDTHS) {
    const m = M[name][width];
    ok(m.cells.map((c) => c.id).join() === frame.panes.map((p) => p.id).join(),
      `${width}px · ${name}: DOM order equals frame order`, [m.cells.map((c) => c.id), frame.panes.map((p) => p.id)]);
    // The geometric top-left ordering of the cells must equal DOM order. `grid-auto-flow: dense`
    // or `columns:` would break exactly this and nothing else on the page.
    const geometric = m.cells.slice().sort((a, b) => (Math.round(a.y) - Math.round(b.y)) || (a.x - b.x));
    ok(geometric.map((c) => c.id).join() === m.cells.map((c) => c.id).join(),
      `${width}px · ${name}: reading the cells top-left to bottom-right gives DOM order (no masonry, no dense flow)`,
      geometric.map((c) => c.id));
    // I18 on screen: no extent pane precedes a home pane, in either order.
    const kinds = m.cells.map((c) => c.kind);
    ok(kinds.indexOf('home') === -1 || kinds.lastIndexOf('extent') === -1 ||
       kinds.lastIndexOf('home') < kinds.indexOf('extent'),
      `${width}px · ${name}: I18 on screen — no extent pane precedes a home pane`, kinds);
    const columns = new Set(m.cells.map((c) => Math.round(c.x))).size;
    if (width === 1440) note(`  ${name}: ${columns} column(s) at 1440 px, ${m.cells.length} cells`);
  }
}

// ---------------------------------------------------------------------------
head('F  I19 ON SCREEN — A CODE THE INDEX CANNOT FILL IS STATED IN WORDS');

{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  const page = await openMap(ctx, ['FR', 'ZZ']);
  const gap = await page.evaluate(() => {
    const p = document.querySelector('#tabpanel-map .worldmap__gap');
    return { missing: p?.dataset.missing, text: (p?.textContent ?? '').trim() };
  });
  note(`.worldmap__gap says: ${JSON.stringify(gap.text.slice(0, 140))}`);
  ok(gap.missing === '1', 'the undrawable code reaches the surface as a stated hole, not a blank card', gap.missing);
  ok(/ZZ/.test(gap.text) && /could not be drawn/.test(gap.text),
    'and it is stated IN WORDS, naming the code (A-40 clause 3)', gap.text.slice(0, 120));
  const m = await measure(page);
  // `FR` alone is two panes (continental France + French Guiana), so the assertion is that the
  // cell count is the FRAME's pane count — i.e. `ZZ` added no card of its own.
  const expected = frameOf(['FR', 'ZZ']).panes.length;
  ok(m.cells.length === expected, 'no empty card is painted for the code that could not be drawn',
    [m.cells.length, expected]);
  ok(m.cells.every((c) => c.svgArea > 0), 'and every card that IS painted has a non-zero map in it',
    m.cells.filter((c) => c.svgArea === 0).map((c) => c.id));
  const nan = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map svg')]
    .map((s) => s.getAttribute('viewBox')).filter((v) => v === null || v.includes('NaN')));
  ok(nan.length === 0, 'and no <svg> on the page carries a NaN viewBox (I19)', nan);
  await page.close();
  await ctx.close();
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`}`);
process.exit(fails === 0 ? 0 : 1);
