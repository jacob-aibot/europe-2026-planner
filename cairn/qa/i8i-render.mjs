/**
 * I-8i — the rendered half of §4.4 **A-51** (one pane per geographic cluster), **A-52** and
 * **A-53** (home panes / extent panes, I18), driven through the **real app** rather than through
 * the selector.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8i-render.mjs
 *
 *   A  **R38-3's criterion, on the CELL and not on the `<svg>`.** A-50's rule measured the
 *      `<svg>`, and a flex row stretched every bordered cell to its tallest sibling — the
 *      shipped sample's US inset filled 44.1% of its cell at 390 px and a four-pane `inset-2`
 *      filled 21.3%. A-51 G7 makes the container a grid with `align-items: start` and one
 *      uniform `--pane-cap`. The assertion is
 *      `cell.height − svg.height − caption.height − padding <= 1 px` and
 *      `cell.width − svg.width − padding <= 1 px`, at 390 x 820 and 1440 x 700, over the
 *      reference sample, a four-pane library and all 239 single-country libraries.
 *   B  **The three libraries Jacob asked the breaker to re-attack**, end to end: `FR` alone,
 *      `FR`+`US`, and the 239-code worldwide ceiling. Every pane on screen, its caption, its
 *      order, and the rendered pixel area of each subject.
 *   C  **A-53 on screen.** An extent pane is captioned *"Distant parts of"*, never *"shown
 *      separately"*, never phrased as a destination; its `data-pane-weight` is 0; and every
 *      home pane precedes every extent pane in DOM order (I18).
 *   D  **Nothing is hidden.** Every pane of every library is in the document, has a non-zero
 *      rendered box, and every drawn code is reachable by tap in at least one pane and by the
 *      chip list unconditionally (A-48 residue 6).
 *   E  **R38-2's four libraries, as the pixel numbers the ROADMAP pins.** `FR`+`US`,
 *      `FR`+`NZ`, `GB`+`AU`, `US`+`JP` at 390 x 820.
 *
 * A FAIL line is a clause of A-51, A-52 or A-53 that does not hold on screen.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame, WORLD_CLUSTER_THRESHOLD_KM } from '../packages/client/src/selectors/worldMap.ts';

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

/** Opens the app, optionally replacing the stored summary rows. Same method as qa/i8h-render. */
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
        for (let t = 0; t < n; t++) st.put({ ...base, id: `i8i-${i}-${t}`, title: `${code} ${t}`, countryCodes: [code], cities: [] }, `i8i-${i}-${t}`);
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

/**
 * **The CELL measurement — R38-3's criterion.** For every pane on screen: the bordered cell, the
 * `<svg>` inside it, the caption under it, and the cell's own padding. The slack A-51 G7 must
 * remove is `cell.height − svg.height − caption.height − padding`.
 */
const measureCells = (page) => page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__pane')].map((cell) => {
  const cr = cell.getBoundingClientRect();
  const svg = cell.querySelector('.worldmap__svg');
  const sr = svg.getBoundingClientRect();
  const cap = cell.querySelector('.worldmap__panecap');
  const capH = cap ? cap.getBoundingClientRect().height : 0;
  const cs = getComputedStyle(cell);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const [, , vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
  const s = Math.min(sr.width / vw, sr.height / vh);
  // A-50's rule, re-derived from the real computed values, so "is this cell's leftover width
  // A-50 centring a narrow map, or is it a defect?" is measured rather than judged.
  const capPx = parseFloat(getComputedStyle(svg).maxHeight);
  const aspect = Number(getComputedStyle(svg).getPropertyValue('--pane-aspect')) || vw / vh;
  const a50Width = Math.min(cr.width - padX, capPx * aspect);
  return {
    id: cell.dataset.pane,
    kind: cell.dataset.paneKind,
    weight: Number(cell.dataset.paneWeight),
    codes: cell.dataset.paneCodes,
    caption: (cap?.textContent ?? '').trim(),
    ariaLabel: svg.getAttribute('aria-label'),
    cellW: cr.width, cellH: cr.height,
    svgW: sr.width, svgH: sr.height,
    capH, padX, padY,
    cap: capPx, aspect, a50Width,
    slackY: cr.height - sr.height - capH - padY,
    slackX: cr.width - sr.width - padX,
    /** True when the leftover width is A-50's `margin-inline: auto` centring a cap-limited map. */
    capLimited: Math.abs(sr.width - a50Width) <= 1 && capPx * aspect < cr.width - padX - 1,
    drawnW: vw * s, drawnH: vh * s,
    paths: cell.querySelectorAll('path[data-code]').length,
  };
}));

/** The rendered pixel box of one code inside its own pane, from the real `<path>`. */
const codeBox = (page, code) => page.evaluate((c) => {
  const out = [];
  for (const p of document.querySelectorAll(`#tabpanel-map path[data-code="${c}"]`)) {
    const r = p.getBoundingClientRect();
    out.push({ pane: p.dataset.pane, w: Math.round(r.width), h: Math.round(r.height), area: Math.round(r.width * r.height) });
  }
  return out;
}, code);

// ---------------------------------------------------------------------------
head('A  R38-3 — THE CELL IS THE MAP, IN BOTH DIRECTIONS, AT TWO VIEWPORTS');

const REFERENCE = ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US'];
const FOUR_PANE = ['FR', 'US'];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp });
  for (const [label, lib] of [['reference sample', REFERENCE], ['four-pane FR+US', FOUR_PANE]]) {
    const page = await openMap(ctx, lib.map((c) => [c, 1]));
    const cells = await measureCells(page);
    note(`${vp.width}x${vp.height} · ${label}: ${cells.map((c) => `${c.id}[${c.codes}] cell ${c.cellW.toFixed(0)}x${c.cellH.toFixed(0)} svg ${c.svgW.toFixed(0)}x${c.svgH.toFixed(0)} cap ${c.capH.toFixed(0)} slackY ${c.slackY.toFixed(1)}`).join(' | ')}`);
    ok(cells.every((c) => c.slackY <= 1),
      `${vp.width}x${vp.height} · ${label}: every CELL is filled vertically to within 1 px (R38-3: the US inset was 44.1%)`,
      cells.filter((c) => c.slackY > 1).map((c) => [c.id, c.slackY]));
    // **The width clause, as it is actually satisfiable.** ROADMAP I-8i asks for
    // `cell.width − svg.width − padding <= 1 px` unconditionally; A-51 G7 keeps A-50's `<svg>`
    // rule *"verbatim and unchanged"*, and that rule is
    // `width: min(100%, calc(var(--pane-cap) * var(--pane-aspect)))` + `margin-inline: auto`.
    // A pane narrower than `cellWidth / cap` is therefore **cap-limited by design** and is
    // centred with space either side — A-50 says so in as many words (*"this does NOT make a
    // narrow country bigger … `margin-inline: auto` centres what is left"*). So the assertion
    // is: a cell is filled horizontally, OR its `<svg>` is exactly the width A-50's rule
    // produces. See BUILD-NOTES **KD-75**.
    ok(cells.every((c) => c.slackX <= 1 || c.capLimited),
      `${vp.width}x${vp.height} · ${label}: every CELL is filled horizontally, or is A-50's centred cap-limited box`,
      cells.filter((c) => c.slackX > 1 && !c.capLimited).map((c) => [c.id, c.slackX, c.aspect, c.cap]));
    note(`  cap-limited (A-50 centring): ${cells.filter((c) => c.capLimited).map((c) => `${c.id} aspect ${c.aspect.toFixed(2)} svg ${c.svgW.toFixed(0)} of cell ${c.cellW.toFixed(0)}`).join(' | ') || 'none'}`);
    ok(cells.every((c) => Math.abs(c.drawnW - c.svgW) <= 1 && Math.abs(c.drawnH - c.svgH) <= 1),
      `${vp.width}x${vp.height} · ${label}: A-50 still holds — the painted map fills its own <svg>`,
      cells.filter((c) => Math.abs(c.drawnW - c.svgW) > 1 || Math.abs(c.drawnH - c.svgH) > 1).map((c) => c.id));
    // A-51 G7: equal cells. Every cell in the same grid row has the same width.
    const widths = [...new Set(cells.map((c) => Math.round(c.cellW)))];
    note(`  cell widths: ${widths.join(', ')}`);
    await page.close();
  }
  await ctx.close();
}

// The 239-single-country sweep, by the same method A-50's own probe uses: the box rule is a pure
// function of `--pane-aspect`, `--pane-cap` and the available width, so the sweep sets the real
// custom property on the real element in the real stylesheet and reads the real layout back.
{
  const aspects = [];
  for (const code of CODES) for (const pane of frameOf([[code, 1]]).panes) aspects.push([`${code}/${pane.id}`, pane.aspect]);
  note(`${CODES.length} single-country libraries produce ${aspects.length} panes; aspect ${Math.min(...aspects.map((a) => a[1])).toFixed(3)} … ${Math.max(...aspects.map((a) => a[1])).toFixed(3)}`);
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await openMap(ctx, [['FR', 1]]);
    const bad = await page.evaluate((specs) => {
      const cell = document.querySelector('#tabpanel-map .worldmap__pane');
      const svg = cell.querySelector('.worldmap__svg');
      const cap = cell.querySelector('.worldmap__panecap');
      const before = svg.style.getPropertyValue('--pane-aspect');
      const cs = getComputedStyle(cell);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const out = [];
      for (const [label, aspect] of specs) {
        svg.style.setProperty('--pane-aspect', String(aspect));
        const cr = cell.getBoundingClientRect();
        const sr = svg.getBoundingClientRect();
        const capH = cap ? cap.getBoundingClientRect().height : 0;
        const slackY = cr.height - sr.height - capH - padY;
        // The painted map inside its own box (A-50, unchanged).
        const s = Math.min(sr.width / aspect, sr.height / 1);
        if (slackY > 1 || Math.abs(s * aspect - sr.width) > 1 || Math.abs(s - sr.height) > 1) {
          out.push({ label, aspect, cell: [cr.width, cr.height], svg: [sr.width, sr.height], capH, slackY });
        }
      }
      svg.style.setProperty('--pane-aspect', before);
      return out;
    }, aspects);
    ok(bad.length === 0,
      `${vp.width}x${vp.height}: no pane of any of the ${CODES.length} single-country libraries letterboxes its CELL or its <svg> beyond 1 px`,
      bad.slice(0, 6));
    await page.close();
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
head('B  THE THREE LIBRARIES JACOB ASKED FOR — FR alone, FR+US, and the 239-code ceiling');

{
  const ctx = await browser.newContext({ viewport: VIEWPORTS[0] });

  // --- FR alone: I18's sharpest case. The RAW component order puts French Guiana first.
  {
    const page = await openMap(ctx, [['FR', 1]]);
    const cells = await measureCells(page);
    const frame = frameOf([['FR', 1]]);
    note(`FR alone: ${cells.map((c) => `${c.id}[${c.codes}] ${c.kind} w${c.weight} "${c.caption}"`).join(' | ')}`);
    ok(cells.length === 2, 'FR alone renders TWO panes', cells.length);
    ok(cells[0].kind === 'home' && cells[0].codes === 'FR' && cells[0].weight === 1,
      'A-53 I18: the FIRST pane on screen is continental France — the home pane, weight 1',
      [cells[0].kind, cells[0].codes, cells[0].weight]);
    ok(cells[1].kind === 'extent' && cells[1].weight === 0,
      'and French Guiana is SECOND, as an extent pane with weight 0', [cells[1].kind, cells[1].weight]);
    // The raw G3 order, from core, so the risk is measured rather than asserted.
    const raw = core.countryParts('FR', IDX, WORLD_CLUSTER_THRESHOLD_KM);
    ok(raw[0].principal === false,
      'the premise: the RAW part order really does put French Guiana first — without G5 the map opens on South America',
      raw.map((p) => p.principal));
    const fr = await codeBox(page, 'FR');
    note(`FR paths on screen: ${fr.map((b) => `${b.pane} ${b.w}x${b.h}=${b.area}px2`).join(' | ')}`);
    ok(fr.length === 2, 'FR is drawn in both panes (L4: nothing is cropped)', fr.length);
    ok(fr.every((b) => b.w >= 24 && b.h >= 24),
      'A-51 L3: every rendered part of France is at least WCAG 2.5.8\'s 24 x 24 px target', fr);
    ok(Math.min(...fr.map((b) => b.area)) > 20000,
      'R38-4: French Guiana\'s pane is a real rectangle, not the 7 x 8 = 56 px2 speck', fr);
    await page.close();
  }

  // --- FR+US: R38-2's headline, and A-53 Part 5's walked example.
  {
    const page = await openMap(ctx, [['FR', 1], ['US', 1]]);
    const cells = await measureCells(page);
    note(`FR+US: ${cells.map((c) => `${c.id}[${c.codes}] ${c.kind} w${c.weight} "${c.caption}"`).join(' | ')}`);
    ok(cells.length === 4, 'FR+US renders FOUR panes (the shipped model drew one 134.2 deg strip)', cells.length);
    ok(cells.map((c) => c.kind).join(',') === 'home,home,extent,extent',
      'A-53 I18: both home panes precede both extent panes, in DOM order', cells.map((c) => c.kind));
    ok(cells.map((c) => c.weight).join(',') === '1,1,0,0',
      'and the weights are 1 . 1 . 0 . 0 — the claim is `weight`, and the cell makes none',
      cells.map((c) => c.weight));
    ok(cells[0].codes === 'FR' && cells[1].codes === 'US',
      'the two panes carrying the record are the two read first, and they are France and the United States',
      cells.map((c) => c.codes));
    const fr = await codeBox(page, 'FR');
    const us = await codeBox(page, 'US');
    note(`FR: ${fr.map((b) => `${b.pane} ${b.w}x${b.h}=${b.area}`).join(' | ')} · US: ${us.map((b) => `${b.pane} ${b.w}x${b.h}=${b.area}`).join(' | ')}`);
    const france = fr.find((b) => b.pane === cells[0].id);
    ok(france.area >= 60000,
      `R38-2: continental France renders ${france.w}x${france.h} = ${france.area} px2 (it was 36 x 25 = 899)`, france);
    ok([...fr, ...us].every((b) => b.w >= 24 && b.h >= 24),
      'every drawn part of both countries clears WCAG 2.5.8\'s 24 x 24 px', [...fr, ...us]);
    // Equal cells: A-53 Part 7 — the cell is a viewport and asserts nothing.
    const w = [...new Set(cells.map((c) => Math.round(c.cellW)))];
    ok(w.length === 1, 'A-51 G7: every cell is the same width — no pane is drawn as a lesser frame', w);
    await page.close();
  }

  // --- the 239-code ceiling: one honest world map.
  {
    const page = await openMap(ctx, CODES.map((c) => [c, 1]));
    const cells = await measureCells(page);
    note(`239 codes: ${cells.length} pane(s); ${cells.map((c) => `${c.id} ${c.kind} ${c.paths} paths`).join(' | ')}`);
    ok(cells.length === 1, 'the 239-code ceiling is ONE pane — the world is one component at 4,000 km', cells.length);
    ok(cells[0].kind === 'home' && cells[0].weight === 239,
      'and it is a HOME pane carrying the whole record', [cells[0].kind, cells[0].weight]);
    ok(cells[0].paths === 239, 'every code is drawn in it', cells[0].paths);
    const chips = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .codelist .codechip')].map((e) => e.querySelector('.mono').textContent));
    ok(chips.length === 239, 'A-48 residue 6: the chip list names and reaches every drawn code, unconditionally', chips.length);
    await page.close();
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('C  A-53 ON SCREEN — the caption is the disclosure, and it never says "shown separately"');

{
  const ctx = await browser.newContext({ viewport: VIEWPORTS[0] });
  const LIBS = [
    ['FR alone', [['FR', 1]]],
    ['FR+US', [['FR', 1], ['US', 1]]],
    ['reference sample', REFERENCE.map((c) => [c, 1])],
    ['FR DE IT JP PE', [['DE', 1], ['FR', 1], ['IT', 1], ['JP', 1], ['PE', 1]]],
    ['FR+GR', [['FR', 2], ['GR', 1]]],
    ['AT CZ DE HR HU SI', ['AT', 'CZ', 'DE', 'HR', 'HU', 'SI'].map((c) => [c, 1])],
  ];
  for (const [label, lib] of LIBS) {
    const page = await openMap(ctx, lib);
    const cells = await measureCells(page);
    const expected = frameOf(lib);
    note(`${label}: ${cells.map((c) => `${c.id}[${c.codes}] ${c.kind} "${c.caption}"`).join(' | ')}`);
    ok(cells.length === expected.panes.length,
      `${label}: the DOM has exactly the frame's pane count — nothing is hidden`,
      [cells.length, expected.panes.length]);
    ok(cells.every((c) => c.cellW > 0 && c.cellH > 0 && c.svgW > 0 && c.svgH > 0),
      `${label}: every pane has a non-zero rendered box`, cells.map((c) => [c.id, c.cellW, c.cellH]));
    ok(cells.every((c) => c.caption.includes(c.codes.split(' ').join(' ')) || c.codes === ''),
      `${label}: every pane names its codes (A-41 constraint 3, applied uniformly by G8)`,
      cells.map((c) => [c.codes, c.caption]));
    for (const c of cells) {
      if (c.kind === 'extent') {
        ok(/^Distant parts of/.test(c.caption),
          `${label} · ${c.id}: an extent pane is captioned "Distant parts of"`, c.caption);
        ok(c.weight === 0, `${label} · ${c.id}: an extent pane carries weight 0`, c.weight);
        ok(/^Distant parts of/.test(c.ariaLabel ?? ''),
          `${label} · ${c.id}: and its aria-label says so too`, c.ariaLabel);
      } else {
        ok(!/Distant parts of/.test(c.caption),
          `${label} · ${c.id}: a home pane is NOT captioned as distant geography`, c.caption);
        ok(c.weight >= 1, `${label} · ${c.id}: a home pane carries at least one trip`, c.weight);
      }
    }
    ok(cells.every((c) => !/shown separately/i.test(c.caption) && !/shown separately/i.test(c.ariaLabel ?? '')),
      `${label}: no pane says "shown separately" — A-49 Part 4 consequence 3, unchanged by A-51`);
    // I18 in DOM order.
    const kinds = cells.map((c) => c.kind);
    const firstExtent = kinds.indexOf('extent');
    ok(firstExtent < 0 || !kinds.slice(firstExtent).includes('home'),
      `${label}: I18 — every home pane precedes every extent pane in DOM order`, kinds);
    await page.close();
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('D  NOTHING IS HIDDEN — every drawn code is tappable somewhere and chipped everywhere');

{
  const ctx = await browser.newContext({ viewport: VIEWPORTS[0] });
  for (const [label, lib] of [
    ['FR+US', [['FR', 1], ['US', 1]]],
    ['worldwide 12', [['AU', 1], ['BR', 1], ['EG', 1], ['FR', 1], ['GB', 1], ['IN', 1], ['JP', 1], ['NZ', 1], ['PE', 1], ['TH', 1], ['US', 2], ['ZA', 1]]],
  ]) {
    const page = await openMap(ctx, lib);
    const cells = await measureCells(page);
    const expected = frameOf(lib);
    note(`${label}: ${cells.length} panes on screen, ${expected.panes.length} in the frame; kinds ${cells.map((c) => c.kind).join(',')}`);
    ok(cells.length === expected.panes.length, `${label}: pane count on screen === the frame's`, [cells.length, expected.panes.length]);
    const chips = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .codelist .codechip')].map((e) => e.querySelector('.mono').textContent));
    ok(chips.join(',') === expected.codes.join(','), `${label}: the chip list is frame.codes, canonically`, [chips, expected.codes]);
    // Every drawn code has at least one <path> with a real box, and tapping it opens its trips.
    const boxes = {};
    for (const code of expected.codes) boxes[code] = await codeBox(page, code);
    const tiny = Object.entries(boxes).filter(([, bs]) => bs.length === 0 || bs.every((b) => b.area === 0));
    ok(tiny.length === 0, `${label}: every drawn code has a painted path with a non-zero box`, tiny);
    const first = expected.codes[0];
    await page.locator(`#tabpanel-map path[data-code="${first}"]`).first().click({ force: true });
    await page.waitForTimeout(150);
    const drill = await page.evaluate(() => document.querySelector('#tabpanel-map .worldmap__drill h2')?.textContent);
    ok(drill === first, `${label}: tapping ${first} in its own pane opens its drill-down (W2)`, drill);
    await page.close();
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('E  R38-2\'s FOUR LIBRARIES, AS THE PIXELS THE ROADMAP PINS (390 x 820)');

{
  const ctx = await browser.newContext({ viewport: VIEWPORTS[0] });
  const CASES = [
    ['FR+US', [['FR', 1], ['US', 1]], 'FR', 4, 60000],
    ['GB+AU', [['AU', 1], ['GB', 1]], 'GB', 2, 60000],
    ['US+JP', [['JP', 1], ['US', 1]], 'JP', 3, 70000],
    ['FR+NZ', [['FR', 1], ['NZ', 1]], 'NZ', 3, 20000],
  ];
  for (const [label, lib, subject, panes, minArea] of CASES) {
    const page = await openMap(ctx, lib);
    const cells = await measureCells(page);
    const boxes = await codeBox(page, subject);
    const biggest = boxes.reduce((a, b) => (b.area > a.area ? b : a), { area: 0 });
    note(`${label}: ${cells.length} panes; ${subject} at ${biggest.w}x${biggest.h} = ${biggest.area} px2`);
    ok(cells.length === panes, `${label}: ${panes} panes (the shipped model drew one)`, cells.length);
    ok(biggest.area >= minArea, `${label}: ${subject} renders >= ${minArea} px2`, biggest);
    ok(cells.every((c) => c.slackY <= 1), `${label}: no cell is letterboxed vertically`, cells.map((c) => [c.id, c.slackY]));
    ok(cells.every((c) => c.slackX <= 1 || c.capLimited),
      `${label}: and horizontally it is filled or A-50-centred`, cells.map((c) => [c.id, c.slackX, c.capLimited]));
    await page.close();
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}\n`);
process.exit(fails === 0 ? 0 : 1);
