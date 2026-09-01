/**
 * QA round 36 — I-8d's atlas frame in real Chromium, on the three things the builder wrote
 * down as unverified: **dark mode**, **reduced motion**, and **a phone-sized viewport**; plus
 * the three-pane frame, which the builder said "is exercised only by fixtures … never on
 * screen".
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r36-render.mjs
 *
 * **Re-pointed at I-8g (2026-08-31), by the builder, at the manager's instruction.** §4.4 **A-48**
 * fixes R36-5 (the pane carries its own `aspect`), R36-6 (the dark `--map-fill` token) and half of
 * R36-7 (C9's paint order), so the three assertions that encoded the defect now encode the fix, each
 * marked `[I-8g]`, with the measured "before" figure kept beside it. The `MF`/`SX` half of R36-7 is
 * A-48 residue 6 — a shared screen pixel, not a containment — and is deliberately still open: it is
 * asserted as the ONE stated exception plus its code-chip route, so a second one would be a finding.
 *
 *   A  DARK MODE — the inset pane, its caption, and the contrast of every new text element.
 *   B  REDUCED MOTION — the one transition I-8d's countries carry.
 *   C  390 px — the phone. The builder's own "observation 2 for the manager", measured
 *      rather than described: how much of the map box the map actually occupies.
 *   D  THREE PANES ON SCREEN, by planting a five-cluster library in IndexedDB. Containment
 *      with margin (A-42 (b)) is re-asserted on pane 3 from the browser's own getBBox().
 *   E  A-42 (b) cross-check on the shipped sample from getBBox(), against the bare-Node
 *      numbers — the I-8a/I-8c breaker rounds' method, re-run on I-8d's output.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame } from '../packages/client/src/selectors/worldMap.ts';

const { chromium } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
let fails = 0, founds = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok     ${label}`);
  else { fails++; console.log(`  FAIL   ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const found = (l) => { founds++; console.log(`  FOUND  ${l}`); };
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note   ${s}`);

// WCAG relative luminance / contrast, over `rgb()` strings.
const rgb = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const lum = (c) => {
  const f = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const browser = await chromium.launch();

async function boot(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`  note   pageerror: ${e.message}`));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.getByRole('button', { name: /Load Europe 2026/i }).click();
  await page.waitForTimeout(600);
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(400);
  return { ctx, page };
}

const readPanes = () => [...document.querySelectorAll('#tabpanel-map .worldmap__pane')].map((p) => {
  const svg = p.querySelector('.worldmap__svg');
  const cap = p.querySelector('.worldmap__panecap');
  const r = svg.getBoundingClientRect();
  const cs = getComputedStyle(svg);
  return {
    id: p.getAttribute('data-pane'),
    codes: p.getAttribute('data-pane-codes'),
    viewBox: svg.getAttribute('viewBox'),
    box: { w: Math.round(r.width), h: Math.round(r.height) },
    sea: cs.backgroundColor,
    paths: [...svg.querySelectorAll('path[data-code]')].map((n) => ({
      code: n.dataset.code,
      fill: getComputedStyle(n).fill,
      transition: getComputedStyle(n).transitionDuration,
      bbox: (() => { const b = n.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })(),
    })),
    caption: cap ? {
      text: cap.textContent,
      colour: getComputedStyle(cap).color,
      bg: getComputedStyle(cap.closest('.worldmap__figure')).backgroundColor,
      size: getComputedStyle(cap).fontSize,
      codeColour: getComputedStyle(cap.querySelector('.mono')).color,
    } : null,
  };
});

// ---------------------------------------------------------------------------
head('A  DARK MODE — THE NEW INSET AND ITS CAPTION (builder: "could not verify")');

for (const scheme of ['light', 'dark']) {
  const { ctx, page } = await boot({ viewport: { width: 1100, height: 900 }, colorScheme: scheme });
  const panes = await page.evaluate(readPanes);
  console.log(`  -- ${scheme} --`);
  ok(panes.length === 2, `${scheme}: two panes are on screen`, panes.length);
  const inset = panes.find((p) => p.id === 'inset-1');
  ok(!!inset && /Shown separately/i.test(inset.caption?.text ?? ''), `${scheme}: the inset carries its caption`, inset?.caption?.text);
  ok(inset?.caption?.text?.includes('US'), `${scheme}: the caption names the code (A-41 constraint 3)`, inset?.caption?.text);
  ok(inset?.paths.length === 1 && inset.paths[0].code === 'US', `${scheme}: the inset draws the United States`, inset?.paths.map((p) => p.code));
  // Every fill and the sea must be a real colour, not a broken var() fallback.
  const badFill = panes.flatMap((p) => p.paths).filter((x) => !/^rgba?\(/.test(x.fill) || /rgba\(0, 0, 0, 0\)/.test(x.fill));
  ok(badFill.length === 0, `${scheme}: every country path resolves to an opaque fill`, badFill.slice(0, 2));
  ok(panes.every((p) => !/rgba\(0, 0, 0, 0\)/.test(p.sea)), `${scheme}: every pane's sea background resolves`, panes.map((p) => p.sea));
  // The main pane's fill and the inset's must be the same ink — an inset is not a dimmer map.
  const mainFill = panes[0].paths[0]?.fill, insetFill = inset?.paths[0]?.fill;
  ok(mainFill === insetFill, `${scheme}: the inset uses the same confirmed ink as the main pane`, { mainFill, insetFill });
  // Contrast of the two new text elements (A-41's caption), measured against the composited figure.
  if (inset?.caption) {
    const cLabel = contrast(inset.caption.colour, inset.caption.bg);
    const cCode = contrast(inset.caption.codeColour, inset.caption.bg);
    note(`${scheme}: caption "SHOWN SEPARATELY" ${inset.caption.colour} on ${inset.caption.bg} = ${cLabel.toFixed(2)}:1 at ${inset.caption.size}; the code span = ${cCode.toFixed(2)}:1`);
    if (cLabel < 4.5) found(`${scheme}: the "SHOWN SEPARATELY" caption is ${cLabel.toFixed(2)}:1 at ${inset.caption.size} — under WCAG AA's 4.5:1 for text below 18.66 px`);
    ok(cCode >= 4.5, `${scheme}: the code span beside it clears 4.5:1`, cCode.toFixed(2));
  }
  // Country fill vs sea: the map has to be legible as a map.
  const seaVsInk = contrast(panes[0].paths[0].fill, panes[0].sea);
  note(`${scheme}: country ink ${panes[0].paths[0].fill} on sea ${panes[0].sea} = ${seaVsInk.toFixed(2)}:1`);
  // [I-8g] R36-6: dark measured 2.87:1 here, under WCAG 1.4.11's 3:1 for a graphical object.
  ok(seaVsInk >= 3, `${scheme}: filled country vs sea clears WCAG's 3:1 floor for a graphical object (dark was 2.87:1)`, seaVsInk.toFixed(2));
  // [I-8g] A-34: the provisional treatment must stay a DIFFERENT ink in BOTH schemes, which is
  // the half of R36-6 a token change could break. The shipped sample has no active trip, so the
  // tokens are read from :root and compared rather than sampled off a path that is not there.
  const tokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    const resolve = (name) => { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; };
    const out = {
      fill: resolve('--map-fill'), sea: resolve('--map-sea'),
      prov: resolve('--map-provisional-fill'), provLine: resolve('--map-provisional-line'),
      raw: cs.getPropertyValue('--map-fill').trim(),
    };
    probe.remove();
    return out;
  });
  ok(tokens.fill !== tokens.prov, `${scheme}: A-34's provisional fill is not the confirmed ink`, tokens);
  note(`${scheme}: --map-fill ${tokens.raw} · confirmed vs provisional = ${contrast(tokens.fill, tokens.prov).toFixed(2)}:1 · provisional stroke vs sea = ${contrast(tokens.provLine, tokens.sea).toFixed(2)}:1`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('B  REDUCED MOTION (builder: "could not verify")');
{
  const { ctx, page } = await boot({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
  const panes = await page.evaluate(readPanes);
  const durs = [...new Set(panes.flatMap((p) => p.paths).map((x) => x.transition))];
  ok(durs.every((d) => d === '0s'), 'under prefers-reduced-motion every country path has a 0s transition, in BOTH panes', durs);
  await ctx.close();
  const { ctx: c2, page: p2 } = await boot({ viewport: { width: 1100, height: 900 }, reducedMotion: 'no-preference' });
  const d2 = [...new Set((await p2.evaluate(readPanes)).flatMap((p) => p.paths).map((x) => x.transition))];
  ok(d2.some((d) => d !== '0s'), 'and the control: without the preference the transition is present (so the query is doing work)', d2);
  await c2.close();
}

// ---------------------------------------------------------------------------
head('C  390 px — THE PHONE (builder observation 2, measured)');
{
  const { ctx, page } = await boot({ viewport: { width: 390, height: 820 } });
  const panes = await page.evaluate(readPanes);
  const painted = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__svg')].map((s) => {
    const r = s.getBoundingClientRect();
    const [, , w, h] = s.getAttribute('viewBox').split(' ').map(Number);
    // `preserveAspectRatio="xMidYMid meet"` — the frame is fitted inside the box, letterboxed.
    const scale = Math.min(r.width / w, r.height / h);
    return { boxW: Math.round(r.width), boxH: Math.round(r.height), frameW: w, frameH: h,
      drawnW: Math.round(w * scale), drawnH: Math.round(h * scale) };
  }));
  for (const p of painted) {
    const usedPct = 100 * (p.drawnW * p.drawnH) / (p.boxW * p.boxH);
    note(`box ${p.boxW}×${p.boxH} px, frame ${p.frameW.toFixed(1)}:${p.frameH.toFixed(1)} → map paints ${p.drawnW}×${p.drawnH} px = ${usedPct.toFixed(1)}% of the box`);
  }
  // [I-8g] R36-5: the main pane painted 356×196 inside a 356×460 box — 42.6%, 264 px of empty
  // sea — because the height was a constant. A-48 Part 6 puts `aspect` on the pane and the
  // stylesheet sizes the box with it. The ROADMAP criterion is ≥ 75% on the main pane.
  const mainUsed = 100 * (painted[0].drawnW * painted[0].drawnH) / (painted[0].boxW * painted[0].boxH);
  ok(mainUsed >= 75, `the main pane paints ≥75% of its box at 390 px (it was 42.6%)`, `${mainUsed.toFixed(1)}%`);
  const aspectVar = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__svg')]
    .map((s) => ({ set: s.style.getPropertyValue('--pane-aspect'), used: getComputedStyle(s).aspectRatio })));
  ok(aspectVar.every((a) => a.set !== '' && Number(a.set) > 0),
    'A-48 Part 6: every pane carries its own `--pane-aspect`, straight from the frame', aspectVar);
  ok(panes.length === 2, 'both panes still render at 390 px', panes.length);
  ok(panes.every((p) => p.box.w > 0 && p.box.h > 0), 'neither pane collapses', panes.map((p) => p.box));
  // The caption must not overflow its pane at 390 px.
  const overflow = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__panecap')]
    .map((c) => ({ scroll: c.scrollWidth, client: c.clientWidth })));
  ok(overflow.every((o) => o.scroll <= o.client + 1), 'the inset caption does not overflow at 390 px', overflow);
  // The inset pane must still be big enough to be a map rather than a smear.
  const inset = panes.find((p) => p.id === 'inset-1');
  note(`inset pane box at 390 px: ${inset.box.w}×${inset.box.h} px`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('D  THREE PANES ON SCREEN (builder: "never on screen")');
{
  const { ctx, page } = await boot({ viewport: { width: 1100, height: 900 } });
  // Take the real stored row and clone it into a five-cluster library, so every row is a
  // shape the app itself wrote — only `id`, `title` and `countryCodes` move.
  const planted = await page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const base = await new Promise((res, rej) => {
      const q = db.transaction('summaries', 'readonly').objectStore('summaries').getAll();
      q.onsuccess = () => res(q.result[0]); q.onerror = () => rej(q.error);
    });
    const spec = [['euro', ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU']], ['oz', ['AU']], ['br', ['BR']],
      ['jp', ['JP']], ['us', ['US']], ['za', ['ZA']]];
    const tx = db.transaction('summaries', 'readwrite');
    const st = tx.objectStore('summaries');
    for (const [id, codes] of spec) {
      st.put({ ...base, id: `plant-${id}`, title: `Planted ${id}`, countryCodes: codes,
        cities: (base.cities ?? []).map((c) => ({ ...c, countryCode: codes[0] })) }, `plant-${id}`);
    }
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    db.close();
    return spec.length;
  });
  note(`planted ${planted} summary rows spanning five clusters`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(500);
  const panes = await page.evaluate(readPanes);
  console.log(`  panes on screen: ${panes.map((p) => `${p.id}[${p.codes}] ${p.box.w}×${p.box.h}`).join('  ')}`);
  ok(panes.length === 3, 'a five-cluster library renders exactly three panes (C7/I3), on screen', panes.length);
  ok(panes.filter((p) => p.caption).length === 2, 'both insets carry a caption', panes.map((p) => !!p.caption));
  const drawn = panes.flatMap((p) => p.paths.map((x) => x.code)).sort();
  ok(new Set(drawn).size === drawn.length, 'no country is drawn in two panes', drawn);
  // I4 on pane 3, from the browser's own measurement.
  for (const p of panes) {
    const [mx, my, w, h] = p.viewBox.split(' ').map(Number);
    let tight = Infinity, at = '';
    for (const path of p.paths) {
      const m = Math.min(path.bbox.x - mx, mx + w - (path.bbox.x + path.bbox.w),
        path.bbox.y - my, my + h - (path.bbox.y + path.bbox.h));
      if (m < tight) { tight = m; at = path.code; }
    }
    ok(tight > 0, `A-42 (b) on ${p.id} from getBBox(): tightest margin ${tight.toFixed(6)}° at ${at}`, tight);
  }
  // Every pane's third-pane countries are still tappable — A-41 constraint 3.
  const third = panes.find((p) => p.id === 'inset-2');
  if (third && third.paths.length) {
    await page.click(`#tabpanel-map .worldmap__pane[data-pane="inset-2"] path[data-code="${third.paths[0].code}"]`);
    await page.waitForTimeout(200);
    const h2 = await page.textContent('.worldmap__drill h2');
    ok(h2 === third.paths[0].code, 'tapping a country in the THIRD pane drills down to its trips', h2);
  }
  // Clean up so the next probe in this file is not affected.
  await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); });
    const tx = db.transaction('summaries', 'readwrite');
    for (const id of ['plant-euro', 'plant-oz', 'plant-br', 'plant-jp', 'plant-us', 'plant-za']) {
      tx.objectStore('summaries').delete(id);
    }
    await new Promise((res) => { tx.oncomplete = res; });
    db.close();
  });
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('E  A-42 (b) ON THE SHIPPED SAMPLE, FROM getBBox(), AGAINST THE NODE NUMBERS');
{
  const { ctx, page } = await boot({ viewport: { width: 1100, height: 900 } });
  const rows = await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); });
    const out = await new Promise((res) => {
      const q = db.transaction('summaries', 'readonly').objectStore('summaries').getAll();
      q.onsuccess = () => res(q.result);
    });
    db.close(); return out;
  });
  const want = worldMapFrame(core.travelStats(rows, new Date().toISOString().slice(0, 10)), core.COUNTRY_INDEX);
  const panes = await page.evaluate(readPanes);
  ok(JSON.stringify(panes.map((p) => p.viewBox)) === JSON.stringify(want.panes.map((p) => p.viewBox)),
    'every rendered viewBox is byte-identical to the bare-Node string',
    { got: panes.map((p) => p.viewBox), want: want.panes.map((p) => p.viewBox) });
  for (const p of panes) {
    const [mx, my, w, h] = p.viewBox.split(' ').map(Number);
    let tight = Infinity, at = '';
    for (const path of p.paths) {
      const m = Math.min(path.bbox.x - mx, mx + w - (path.bbox.x + path.bbox.w),
        path.bbox.y - my, my + h - (path.bbox.y + path.bbox.h));
      if (m < tight) { tight = m; at = path.code; }
    }
    note(`${p.id}: browser getBBox() tightest margin ${tight.toFixed(6)}° at ${at}`);
    ok(tight > 0, `${p.id}: strictly contained on all four sides (R33-6 measured 0.000000)`, tight);
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('F  A-41 CONSTRAINT 1 — "STILL DRAWN, STILL ATTRIBUTED, STILL TAPPABLE"');
{
  const { ctx, page } = await boot({ viewport: { width: 1400, height: 1000 } });
  const codes = [...new Set(core.COUNTRY_INDEX.countries.map((c) => c.code))].sort();
  await page.evaluate(async (all) => {
    const db = await new Promise((r) => { const q = indexedDB.open('cairn'); q.onsuccess = () => r(q.result); });
    const base = await new Promise((r) => {
      const q = db.transaction('summaries', 'readonly').objectStore('summaries').getAll();
      q.onsuccess = () => r(q.result[0]);
    });
    const tx = db.transaction('summaries', 'readwrite');
    all.forEach((code, i) => tx.objectStore('summaries')
      .put({ ...base, id: `hit-${i}`, title: `T${i}`, countryCodes: [code], cities: [] }, `hit-${i}`));
    await new Promise((r) => { tx.oncomplete = r; });
    db.close();
  }, codes);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForSelector('#tabpanel-map path[data-code]');
  await page.waitForTimeout(1000);
  // For every drawn country, sample its own filled interior and ask the browser — which is
  // what W2 delegates hit testing to — what is actually on top there.
  const res = await page.evaluate(() => {
    const out = [];
    for (const path of document.querySelectorAll('#tabpanel-map path[data-code]')) {
      const code = path.dataset.code, bb = path.getBBox();
      const svg = path.ownerSVGElement, ctm = path.getScreenCTM();
      if (!ctm) { out.push({ code, inside: 0, self: 0, over: null }); continue; }
      let inside = 0, self = 0, over = null;
      for (let i = 1; i < 40; i++) for (let j = 1; j < 40; j++) {
        const q = svg.createSVGPoint();
        q.x = bb.x + bb.width * i / 40; q.y = bb.y + bb.height * j / 40;
        if (!path.isPointInFill(q)) continue;
        inside++;
        const s = q.matrixTransform(ctm);
        const el = document.elementFromPoint(s.x, s.y);
        if (el?.dataset?.code === code) self++; else if (!over) over = el?.dataset?.code ?? null;
      }
      out.push({ code, inside, self, over });
    }
    return out;
  });
  const untappable = res.filter((r) => r.inside > 0 && r.self === 0);
  const tooSmall = res.filter((r) => r.inside === 0).map((r) => r.code);
  ok(res.length === codes.length, `all ${codes.length} codes are drawn`, res.length);
  note(`${tooSmall.length} codes are smaller than a 40×40 sample of their own bbox and are inconclusive: ${tooSmall.join(' ')}`);
  // [I-8g] C9 fixes the CONTAINMENT half of R36-7: `AD` had 0 self-hits under `FR` and now paints
  // on top of it. The `MF`/`SX` half is A-48 residue 6 — two halves of one 90 km² island sharing a
  // screen pixel — and is the ONE stated exception; a second entry here is a new finding.
  const ad = res.find((r) => r.code === 'AD');
  ok(ad && ad.self > 0, 'R36-7: AD hit-tests to itself where it had 0 self-hits under canonical paint order', ad);
  ok(untappable.length <= 1 && untappable.every((r) => r.code === 'MF' || r.code === 'SX'),
    'the only country with no self-hit-testable pixel is the MF/SX pair A-48 residue 6 defers',
    untappable.map((r) => `${r.code} under ${r.over}`));
  for (const r of untappable) note(`  A-48 residue 6: ${r.code} has ${r.inside} interior sample points, 0 self-hits, ${r.over} on top at every one — a scale collision, which no paint order fixes`);
  // The fallback that keeps this a rough edge rather than a lost country: the code chip list.
  for (const r of untappable) {
    await page.click(`.codelist button:has(span:text-is("${r.code}"))`);
    await page.waitForTimeout(150);
    const h2 = await page.textContent('.worldmap__drill h2');
    ok(h2 === r.code, `${r.code} is still reachable from the code-chip list below the map`, h2);
    await page.click(`#tabpanel-map path[data-code="${r.code}"]`, { force: true }).catch(() => {});
    await page.evaluate(() => document.querySelectorAll('.codelist').length);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tabbar');
    await page.getByRole('tab', { name: 'Map' }).click();
    await page.waitForSelector('.codelist');
  }
  // [I-8g] Why: paint order is now DESCENDING INDEX POSITION (A-48 C9), and the index is ordered
  // by ascending summed ring area, so a country whose fill contains another's is painted first and
  // the contained one ends up on top. Asserted on the DOM, in the order the browser paints it.
  const order = await page.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__pane--main path[data-code]')].map((n) => n.dataset.code));
  const lastPos = new Map();
  core.COUNTRY_INDEX.countries.forEach((e, i) => lastPos.set(e.code, i));
  const positions = order.map((c) => lastPos.get(c));
  ok(positions.every((p, i) => i === 0 || p < positions[i - 1]),
    'A-48 C9: paths are painted in descending index position — the large first, the small on top');
  ok(String(order) !== String([...order].sort()),
    'and the canonical-ISO order this replaced is measurably gone (the vacuity control)');
  for (const [small, host] of [['AD', 'FR'], ['MC', 'FR'], ['VA', 'IT'], ['SM', 'IT'], ['LI', 'AT'], ['GI', 'ES']]) {
    ok(order.indexOf(host) < order.indexOf(small), `A-48 I10: ${host} is painted before ${small}`,
      { host: order.indexOf(host), small: order.indexOf(small) });
  }
  await page.evaluate(async () => {
    const db = await new Promise((r) => { const q = indexedDB.open('cairn'); q.onsuccess = () => r(q.result); });
    const tx = db.transaction('summaries', 'readwrite');
    const st = tx.objectStore('summaries');
    const keys = await new Promise((r) => { const q = st.getAllKeys(); q.onsuccess = () => r(q.result); });
    for (const k of keys) if (String(k).startsWith('hit-')) st.delete(k);
    await new Promise((r) => { tx.oncomplete = r; });
    db.close();
  });
  await ctx.close();
}

await browser.close();
console.log(`\n${fails} FAIL, ${founds} FOUND\n`);
// A FAIL is a clause of A-41/A-42 that does not hold as implemented. A FOUND is a finding:
// the code does what the ruling says and the ruling produces the wrong map. Either exits 1.
process.exit(fails === 0 && founds === 0 ? 0 : 1);
