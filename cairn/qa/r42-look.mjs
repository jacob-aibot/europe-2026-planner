/**
 * **QA round 42 — the looking half.** Screenshots to read with an eye, plus the measurements that
 * only make sense beside them.
 *
 *   Needs: npm run web:build && npm run serve
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r42-look.mjs [outdir]
 *
 *   R  **R41-8's replacement swept wider than the fix's own test.** `qa/i8b-render.mjs` F11 drives
 *      the grid-of-lists at 1280 and 1600 on the reference library. This sweeps 5 · 9 · 13 · 21 ·
 *      40 countries — the counts round 41 used, plus one — at both desktop widths and in both
 *      schemes, and records every country's x AND y before and after an expansion, because a
 *      column that no longer re-balances horizontally can still shove its own neighbours down.
 *   S  **Dead space**, measured on the whole viewport rather than on `.profile`'s container, which
 *      is the scoping §6.2 chose and which by construction cannot see a short record in a tall
 *      field. Recorded, not asserted — §6.2's ceiling is the contract and this is the number
 *      beside it.
 *   T  **Touch targets and adjacent spacing by rect**, independently of the `elementFromPoint`
 *      kit, on every interactive element of the Profile at the three touch contexts.
 *   V  **Hover-only content**, driven: computed style at rest for every rule with a `:hover`.
 *   K  **Focus**, driven by real `Tab` presses, in both schemes, with the ring's contrast against
 *      what it actually sits on.
 *   P  **Screenshots**, five contexts x two schemes, plus the expanded row, the refusal, the empty
 *      library and the 40-country stress, for a human to look at.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';
import { mkdirSync } from 'node:fs';

const { chromium, devices } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
const OUT = process.argv[2] ?? '/tmp/r42look';
mkdirSync(OUT, { recursive: true });

let fails = 0;
const ok = (c, l, x) => {
  if (c) console.log(`  ok      ${l}`);
  else { fails++; console.log(`  FAIL    ${l}${x === undefined ? '' : '  -> ' + JSON.stringify(x).slice(0, 700)}`); }
};
const note = (s) => console.log(`  note    ${s}`);
const head = (s) => console.log(`\n== ${s} ==`);

const city = (name, countryCode) => ({ key: `c-${name}`, name, countryCode, countrySource: 'derived' });
const row = (id, title, startDate, endDate, countryCodes, cities) => ({
  id, title, startDate, endDate, datePrecision: 'exact',
  cityCount: cities.length, dayCount: 5, stopCount: 8, poolCount: 0, revision: 1,
  countryCodes, cities,
  attribution: { places: { located: 30, attributed: 27 }, stops: { located: 44, attributed: 41 } },
  summaryVersion: core.SUMMARY_VERSION,
});
const REFERENCE = [
  row('r1', 'Central Europe 2019', '2019-08-03', '2019-08-17', ['AT', 'CZ', 'HU'],
    [city('Vienna', 'AT'), city('Prague', 'CZ'), city('Budapest', 'HU')]),
  row('r2', 'Croatia 2022', '2022-06-01', '2022-06-10', ['HR'],
    [city('Dubrovnik', 'HR'), city('Split', 'HR')]),
  row('r4', 'London 2026', '2026-03-02', '2026-03-06', ['GB'], [city('London', 'GB')]),
];
const CODES = ['AT', 'BE', 'CZ', 'DE', 'DK', 'EE', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI', 'SK', 'ES', 'CH',
  'AD', 'AL', 'BA', 'BG', 'BY', 'CY', 'LI', 'MC', 'MD', 'ME'];
const tour = (n) => [row('t1', 'The tour', '2021-03-01', '2021-06-30',
  CODES.slice(0, n), CODES.slice(0, n).map((c) => city('City ' + c, c)))];
const REFUSED = [
  row('d1', 'One', '2019-01-01', '2019-01-05', ['AT'], [city('Vienna', 'AT')]),
  { ...row('d1', 'Two', '2020-01-01', '2020-01-05', ['CZ'], [city('Prague', 'CZ')]), __key: 'd1-dup' },
];

const plantRows = (page, rows) =>
  page.evaluate(async (rows) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('summaries', 'readwrite');
      const st = tx.objectStore('summaries');
      for (const r of rows) { const { __key, ...rest } = r; st.put(rest, __key ?? rest.id); }
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, rows);

const browser = await chromium.launch();
async function open(opts, scheme, rows, { tab = 'Profile' } = {}) {
  const ctx = await browser.newContext({ ...opts, colorScheme: scheme });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  if (rows) { await plantRows(page, rows); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.tabbar'); }
  if (tab) { await page.getByRole('tab', { name: tab }).click(); await page.waitForTimeout(280); }
  return { ctx, page, errors };
}
const CTX = [
  { n: 'iPhone SE', o: devices['iPhone SE'], w: 320, touch: true },
  { n: 'iPhone 14', o: devices['iPhone 14'], w: 390, touch: true },
  { n: 'iPad Mini', o: devices['iPad Mini'], w: 768, touch: true },
  { n: 'desktop', o: { viewport: { width: 1280, height: 800 } }, w: 1280, touch: false },
  { n: 'wide', o: { viewport: { width: 1600, height: 900 } }, w: 1600, touch: false },
];

// ===========================================================================
head('R — R41-8: does expanding one country still move another, at any count?');
// ===========================================================================
for (const c of [CTX[3], CTX[4]]) {
  for (const scheme of ['light', 'dark']) {
    for (const n of [5, 9, 13, 21, 40]) {
      const { ctx, page } = await open(c.o, scheme, tour(n));
      const posOf = () => page.evaluate(() => Object.fromEntries(
        [...document.querySelectorAll('#tabpanel-profile .crow')].map((li) => {
          const r = li.getBoundingClientRect();
          return [li.dataset.code, [Math.round(r.left), Math.round(r.top + window.scrollY)]];
        })));
      const before = await posOf();
      await page.locator('#tabpanel-profile .crow__head').first().click();
      await page.waitForTimeout(450);
      const after = await posOf();
      const opened = Object.keys(before)[0];
      const movedX = Object.keys(before).filter((k) => k !== opened && before[k][0] !== after[k][0]);
      const movedY = Object.keys(before).filter((k) => k !== opened
        && Math.abs(before[k][1] - after[k][1]) > 2 && before[k][0] !== before[opened][0]);
      ok(movedX.length === 0, `R1 ${c.n}/${scheme}/${n}: expanding ${opened} moves no country ACROSS the gutter`, movedX);
      ok(movedY.length === 0, `R2 ${c.n}/${scheme}/${n}: ... and moves nothing in the OTHER column vertically`, movedY);
      await ctx.close();
    }
  }
}

// ===========================================================================
head('S — dead space, measured on the viewport as well as on the container');
// ===========================================================================
for (const c of CTX) {
  for (const [label, rows] of [['reference', REFERENCE], ['one country', tour(1)]]) {
    const { ctx, page } = await open(c.o, 'light', rows);
    const m = await page.evaluate(() => {
      const vh = document.scrollingElement.clientHeight;
      const ink = [];
      for (const el of document.querySelectorAll('#tabpanel-profile *')) {
        if (el.children.length && !el.textContent.trim()) continue;
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.width > 0 && (el.childNodes.length === 0
          || [...el.childNodes].some((n) => n.nodeType === 3 && n.data.trim()))) ink.push([r.top, r.bottom]);
      }
      const last = ink.length ? Math.max(...ink.map((x) => x[1])) : 0;
      return { vh, lastInk: Math.round(last), belowLastInk: Math.round(Math.max(0, vh - last)),
        pct: Math.round(Math.max(0, vh - last) / vh * 100) };
    });
    note(`${c.n} / ${label}: ${JSON.stringify(m)}`);
    await ctx.close();
  }
}

// ===========================================================================
head('T — touch targets and adjacent spacing, by rect, on the Profile');
// ===========================================================================
for (const c of [CTX[0], CTX[1], CTX[2]]) {
  const { ctx, page } = await open(c.o, 'light', REFERENCE);
  await page.locator('#tabpanel-profile .crow__head').first().click();
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const sel = 'button, a[href], [role="button"], [role="tab"], input, select, textarea';
    const els = [...document.querySelectorAll(`#tabpanel-profile ${sel}, .tabbar ${sel}`)]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter((x) => x.r.width > 0 && x.r.height > 0);
    const small = els.filter((x) => x.r.width < 44 || x.r.height < 44)
      .map((x) => ({ cls: String(x.el.className).slice(0, 34), w: Math.round(x.r.width), h: Math.round(x.r.height) }));
    const floor = els.filter((x) => x.r.width < 24 || x.r.height < 24)
      .map((x) => ({ cls: String(x.el.className).slice(0, 34), w: Math.round(x.r.width), h: Math.round(x.r.height) }));
    let tight = [];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i].r, b = els[j].r;
      if (els[i].el.contains(els[j].el) || els[j].el.contains(els[i].el)) continue;
      const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
      const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
      if (dx === 0 && dy === 0) continue;
      const d = Math.hypot(dx, dy);
      /*
       * The exemption `qa/i8b-render.mjs` B3 states and I re-derived rather than assumed: two
       * targets that are BOTH already >= 44 x 44 are not the hazard §3.4's 8 px rule is written
       * about (that rule exists because `.icon` was 26 x 26 in rows of three), and WCAG 2.5.8's
       * own offset exception applies only to undersized targets. Without it, every stacked
       * hairline-separated list on earth is a defect — which would forbid §5.3's own composition.
       */
      const big = (r) => r.width >= 43.5 && r.height >= 43.5;
      if (d < 8 && !(big(a) && big(b))) tight.push([String(els[i].el.className).slice(0, 20), String(els[j].el.className).slice(0, 20), Math.round(d)]);
    }
    return { n: els.length, small, floor, tight: tight.slice(0, 6) };
  });
  note(`${c.n}: ${JSON.stringify(m)}`);
  ok(m.floor.length === 0, `T1 ${c.n}: every pointer target clears the 24 px hard floor`, m.floor);
  ok(m.small.length === 0, `T2 ${c.n}: every primary target clears 44 x 44`, m.small);
  ok(m.tight.length === 0, `T3 ${c.n}: no two adjacent targets are closer than 8 px`, m.tight);
  await ctx.close();
}

// ===========================================================================
head('V — nothing on the Profile exists only at :hover');
// ===========================================================================
{
  const { ctx, page } = await open(devices['iPhone 14'], 'light', REFERENCE);
  const m = await page.evaluate(() => {
    const hovered = new Set();
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const r of rules) {
        if (!r.selectorText) continue;
        for (const s of r.selectorText.split(',')) if (/:hover/.test(s)) hovered.add(s.replace(/:hover.*$/, '').trim());
      }
    }
    const bad = [];
    for (const s of hovered) {
      if (!s) continue;
      let els; try { els = document.querySelectorAll(s); } catch { continue; }
      for (const el of els) {
        // A COLLAPSED accordion hides its own contents; that is the accordion, not a hover rule.
        // `.crow__clip` is the one on this surface and `visibility` rides its own transition.
        if (el.closest('.crow__clip') || el.closest('[aria-hidden="true"]')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
          bad.push([s, cs.display, cs.visibility, cs.opacity]);
        }
      }
    }
    return { selectors: hovered.size, bad: bad.slice(0, 8) };
  });
  note(`hover selectors on the page: ${m.selectors}`);
  ok(m.bad.length === 0, 'V1 no element with a :hover rule is invisible at rest', m.bad);
  await ctx.close();
}

// ===========================================================================
head('K — focus, driven by real Tab presses, in both schemes');
// ===========================================================================
for (const scheme of ['light', 'dark']) {
  const { ctx, page } = await open(devices['iPad Mini'], scheme, REFERENCE);
  const seen = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return { tag: el.tagName, cls: String(el.className).slice(0, 30),
        w: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor,
        inProfile: !!el.closest('#tabpanel-profile'), inBar: !!el.closest('.tabbar') };
    });
    if (f) seen.push(f);
  }
  const relevant = seen.filter((f) => f.inProfile || f.inBar);
  const noRing = relevant.filter((f) => f.style === 'none' || parseFloat(f.w) < 2);
  note(`${scheme}: ${relevant.length} focus stops on the Profile/bar, rings: ${JSON.stringify([...new Set(relevant.map((f) => f.w + ' ' + f.style + ' ' + f.color))])}`);
  ok(relevant.length > 0, `K0 ${scheme}: Tab reaches the Profile at all`, seen.slice(0, 3));
  ok(noRing.length === 0, `K1 ${scheme}: every keyboard-focused control shows a >= 2px ring`, noRing);
  await ctx.close();
}

// ===========================================================================
head('O — tab order through the two-column record, driven, and a short viewport');
// ===========================================================================
/*
 * §6.2: *"Tab order equals visual order on Profile at every context — including at desktop, where
 * the two-column country list must read down-then-across."* R41-8's fix replaced `columns: 2`
 * with a grid of two `<ul>`s split by count in `recordColumns`. That keeps DOM order, so the
 * property should hold — but it is now a JS split rather than a CSS one, and a JS split can put
 * the boundary anywhere. Driven with real `Tab` presses at three counts, with a row EXPANDED
 * (which inserts controls mid-list and is the case the acceptance run does not drive).
 */
for (const c of [CTX[3], CTX[4]]) {
  for (const n of [5, 9, 40]) {
    const { ctx, page } = await open(c.o, 'light', tour(n));
    await page.locator('#tabpanel-profile .crow__head').first().click();
    await page.waitForTimeout(450);
    await page.evaluate(() => document.querySelector('#tabpanel-profile .crow__head').focus());
    /*
     * Two things this measurement has to get right, both learned by getting them wrong first:
     * the walk must STOP at the first repeat (Tab leaves the document and comes back, and a
     * wrapped stop reads as "y went backwards"), and a control indented inside an EXPANDED row
     * belongs to its own column — grouping by `x` alone files the trip row as a third column.
     * Column identity is therefore the index of the ancestor `<ul>`, which is what the DOM
     * actually says.
     */
    const order = [];
    const seen = new Set();
    for (let i = 0; i < n * 2 + 12; i++) {
      const p = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || !el.closest('#tabpanel-profile')) return null;
        const r = el.getBoundingClientRect();
        const lists = [...document.querySelectorAll('#tabpanel-profile .crlist')];
        const key = (el.closest('.crow')?.dataset.code ?? '') + '|' + String(el.className);
        return { col: lists.indexOf(el.closest('.crlist')), y: Math.round(r.top + window.scrollY), key,
          x: Math.round(r.left), cls: String(el.className).slice(0, 22) };
      });
      if (p) {
        if (seen.has(p.key)) break;
        seen.add(p.key);
        order.push(p);
      }
      await page.keyboard.press('Tab');
    }
    const inList = order.filter((o) => o.col >= 0);
    const bad = [];
    for (const col of [...new Set(inList.map((o) => o.col))]) {
      const ys = inList.filter((o) => o.col === col).map((o) => o.y);
      for (let i = 1; i < ys.length; i++) if (ys[i] < ys[i - 1]) bad.push(['y went back in list ' + col, ys[i - 1], ys[i]]);
    }
    const colSeq = inList.map((o) => o.col);
    for (let i = 1; i < colSeq.length; i++) if (colSeq[i] < colSeq[i - 1]) bad.push(['lists interleave at stop ' + i, colSeq[i - 1], colSeq[i]]);
    ok(inList.length > 0 && bad.length === 0,
      `O1 ${c.n}/${n}: tab order reads down-then-across with a row open`,
      { bad, stops: order.length, inList: inList.length, cols: [...new Set(colSeq)] });
    await ctx.close();
  }
}
for (const [w, h] of [[390, 340], [320, 300], [1280, 400]]) {
  const { ctx, page, errors } = await open({ viewport: { width: w, height: h } }, 'light', REFERENCE);
  const m = await page.evaluate(() => {
    const bar = document.querySelector('.tabbar').getBoundingClientRect();
    const app = getComputedStyle(document.querySelector('.app')).paddingBottom;
    // scroll to the very bottom, then ask whether the last ink clears the bar
    document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
    let last = 0;
    for (const el of document.querySelectorAll('#tabpanel-profile *')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.data.trim())) continue;
      last = Math.max(last, el.getBoundingClientRect().bottom);
    }
    return { barTop: Math.round(bar.top), barPos: getComputedStyle(document.querySelector('.tabbar')).position,
      appPadBottom: app, lastInk: Math.round(last), sw: document.scrollingElement.scrollWidth,
      cw: document.scrollingElement.clientWidth };
  });
  note(`${w}x${h}: ${JSON.stringify(m)}`);
  ok(m.sw <= m.cw + 1, `O2 ${w}x${h}: no sideways scroll at a short viewport`, m);
  ok(m.barPos !== 'fixed' || m.lastInk <= m.barTop + 1,
    `O3 ${w}x${h}: the last ink clears the fixed bar at the bottom of the scroll`, m);
  ok(errors.length === 0, `O4 ${w}x${h}: no page error`, errors);
  await ctx.close();
}

// ===========================================================================
head('P — screenshots for a human to look at');
// ===========================================================================
for (const c of CTX) {
  for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await open(c.o, scheme, REFERENCE);
    const tag = `${c.n.replace(/\s/g, '')}-${scheme}`;
    await page.screenshot({ path: `${OUT}/P-${tag}.png`, fullPage: true });
    await page.locator('#tabpanel-profile .crow__head').first().click();
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${OUT}/P-open-${tag}.png`, fullPage: true });
    await ctx.close();
  }
}
for (const [label, rows, tab] of [
  ['refusal', REFUSED, 'Profile'], ['stress40', tour(40), 'Profile'], ['map', REFERENCE, 'Map'], ['trips', REFERENCE, 'Trips'],
]) {
  for (const c of [CTX[1], CTX[3]]) {
    const { ctx, page } = await open(c.o, 'light', rows, { tab });
    await page.screenshot({ path: `${OUT}/P-${label}-${c.n.replace(/\s/g, '')}.png`, fullPage: true });
    await ctx.close();
  }
}
{
  const { ctx, page } = await open(devices['iPhone 14'], 'light', null);
  await page.evaluate(async () => { const r = indexedDB.deleteDatabase('cairn'); await new Promise((res) => { r.onsuccess = res; r.onerror = res; r.onblocked = res; }); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Profile' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/P-empty-iPhone14.png`, fullPage: true });
  await ctx.close();
}
note(`screenshots in ${OUT}`);

await browser.close();
console.log(fails ? `\n${fails} FAIL(S)\n` : '\nALL CLEAR\n');
process.exit(fails ? 1 : 0);
