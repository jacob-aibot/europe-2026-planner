/**
 * **QA round 41 — the looking probe.** I-8b (`c08c70f`) adversarial pass.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r41-look.mjs [outdir]
 *
 * `qa/i8b-render.mjs` is the builder's own acceptance run and it is green. This file is the
 * complement: it takes the SCREENSHOTS that run does not take, at the same five §6.1 device
 * contexts in both schemes, and it feeds the surface data shapes the reference library does not
 * contain — a country with no city, a 60-character city name, a 30-country library, a
 * 180-character trip title, a one-country library, a library whose only trip is planned.
 *
 * It also measures four things `i8b-render.mjs` does not:
 *
 *   Z  **200 % browser zoom on a 390 px viewport** — `DESIGN.md` §3.5's last clause, which that
 *      document calls *"a §6 assertion, not an aspiration"* and which no assertion in the
 *      acceptance run covers.
 *   L  **A landscape phone** (844 × 390), which §3.4 rules is *"simply a wide phone"*.
 *   B  **The bottom bar's own border** against `.app`'s reserved padding.
 *   N  **The accessible name of a country row**, which is what a screen reader actually says.
 *
 * Output: PNGs in `outdir` (default `/tmp/r41`), plus one line per measurement.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';
import { mkdirSync } from 'node:fs';

const { chromium, devices } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
const OUT = process.argv[2] ?? '/tmp/r41';
mkdirSync(OUT, { recursive: true });

let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok      ${l}`); else { fails++; console.log(`  FAIL    ${l}${x === undefined ? '' : '  -> ' + JSON.stringify(x).slice(0, 500)}`); } };
const note = (s) => console.log(`  note    ${s}`);
const head = (s) => console.log(`\n== ${s} ==`);

const city = (name, countryCode) => ({ key: `c-${name}`, name, countryCode, countrySource: 'derived' });
const row = (id, title, startDate, endDate, countryCodes, cities, census) => ({
  id, title, startDate, endDate, datePrecision: 'exact',
  cityCount: cities.length, dayCount: 5, stopCount: 8, poolCount: 0, revision: 1,
  countryCodes, cities,
  attribution: census ?? { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
  summaryVersion: core.SUMMARY_VERSION,
});

/** The builder's own reference library, so the screenshots are of the same subject it looked at. */
const REFERENCE = [
  row('r1', 'Central Europe 2019', '2019-08-03', '2019-08-17', ['AT', 'CZ', 'HU'],
    [city('Vienna', 'AT'), city('Prague', 'CZ'), city('Budapest', 'HU')],
    { places: { located: 40, attributed: 36 }, stops: { located: 60, attributed: 57 } }),
  row('r2', 'Croatia 2022', '2022-06-01', '2022-06-10', ['HR'],
    [city('Dubrovnik', 'HR'), city('Split', 'HR'), city('Somewhere at sea', null)],
    { places: { located: 12, attributed: 12 }, stops: { located: 20, attributed: 20 } }),
  row('r4', 'London 2026', '2026-03-02', '2026-03-06', ['GB'], [city('London', 'GB')],
    { places: { located: 9, attributed: 9 }, stops: { located: 14, attributed: 14 } }),
  row('r3', 'Japan 2027', '2027-04-01', '2027-04-12', ['JP'], [city('Tokyo', 'JP')]),
];

/** Real shapes the reference library has none of. Every value here is legal `TripSummaryRow`. */
const LONGEST_CITY = 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch';
const STRESS = [
  row('s-long', 'A trip whose title is long enough to be a sentence, because a user typed a sentence into the title field and nothing stopped them',
    '2018-01-01', '2018-01-20', ['GB'], [city(LONGEST_CITY, 'GB'), city('Kingston upon Thames', 'GB')],
    { places: { located: 5, attributed: 1 }, stops: { located: 7, attributed: 2 } }),
  row('s-nocity', 'A country with nothing named in it', '2020-05-01', '2020-05-04', ['VA'], []),
  row('s-many', 'The grand tour', '2021-03-01', '2021-06-30',
    ['AL', 'AD', 'AM', 'AZ', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'GE', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'KZ', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD'],
    [city('Tirana', 'AL'), city('Andorra la Vella', 'AD'), city('Yerevan', 'AM'),
      city('Baku', 'AZ'), city('Minsk', 'BY'), city('Brussels', 'BE')]),
];

/** One country, one trip — the thinnest non-empty record the screen can be asked to hold. */
const THIN = [row('t1', 'A weekend', '2023-09-01', '2023-09-03', ['AT'], [city('Vienna', 'AT')])];

/** Nothing travelled: one future trip only. The claim prints zeroes and the record is empty. */
const FUTURE_ONLY = [row('f1', 'Next year', '2027-06-01', '2027-06-10', ['IT'], [city('Rome', 'IT')])];

const plantRows = (page, rows) =>
  page.evaluate(async (rows) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
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
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  if (rows !== null) {
    await plantRows(page, rows);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tabbar');
  }
  if (tab) { await page.getByRole('tab', { name: tab }).click(); await page.waitForTimeout(250); }
  return { ctx, page, errors };
}

const CONTEXTS = [
  { name: 'se', opts: devices['iPhone SE'], w: 320 },
  { name: 'ip14', opts: devices['iPhone 14'], w: 390 },
  { name: 'ipad', opts: devices['iPad Mini'], w: 768 },
  { name: 'desk', opts: { viewport: { width: 1280, height: 800 } }, w: 1280 },
  { name: 'wide', opts: { viewport: { width: 1600, height: 900 } }, w: 1600 },
];

/** Overflow / clipping, re-derived here so a screenshot always has a number beside it. */
const overflowOf = (page) => page.evaluate(() => {
  const se = document.scrollingElement;
  const past = [];
  for (const el of document.querySelectorAll('.profile *')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0.5 && r.height > 0.5 && r.right > innerWidth + 1) {
      past.push({ cls: el.className && String(el.className).slice(0, 40), right: Math.round(r.right) });
    }
  }
  // Anything whose own content is wider than its box, i.e. text clipped by `overflow:hidden`
  // or by a nowrap run in a narrower column.
  const clipped = [];
  for (const el of document.querySelectorAll('.profile *')) {
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      clipped.push({ cls: String(el.className).slice(0, 40), sw: el.scrollWidth, cw: el.clientWidth });
    }
  }
  return { docOverflow: se.scrollWidth - innerWidth, past, clipped };
});

// ===========================================================================
head('S — screenshots at the five §6.1 contexts, both schemes, on the reference library');
for (const c of CONTEXTS) {
  for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await open(c.opts, scheme, REFERENCE);
    await page.screenshot({ path: `${OUT}/S-${c.name}-${scheme}.png`, fullPage: true });
    const m = await overflowOf(page);
    ok(m.docOverflow <= 1 && m.past.length === 0, `S ${c.name}/${scheme}: nothing past the viewport`, m);
    if (m.clipped.length) note(`${c.name}/${scheme} clipped runs: ${JSON.stringify(m.clipped)}`);
    await ctx.close();
  }
}

// ===========================================================================
head('S2 — the expanded row, and the tail of the page (where the bottom bar lands)');
for (const c of CONTEXTS) {
  const { ctx, page } = await open(c.opts, 'light', REFERENCE);
  await page.locator('.crow[data-code="AT"] .crow__head').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/S2-open-${c.name}.png`, fullPage: true });
  const m = await overflowOf(page);
  ok(m.docOverflow <= 1 && m.past.length === 0, `S2 ${c.name}: expanded row does not overflow`, m);
  if (m.clipped.length) note(`${c.name} expanded clipped runs: ${JSON.stringify(m.clipped)}`);
  await ctx.close();
}

// ===========================================================================
head('D — the data shapes the reference library does not contain');
for (const [label, rows] of [['stress', STRESS], ['thin', THIN], ['futureonly', FUTURE_ONLY]]) {
  for (const c of [CONTEXTS[0], CONTEXTS[1], CONTEXTS[3]]) {
    const { ctx, page, errors } = await open(c.opts, 'light', rows);
    await page.screenshot({ path: `${OUT}/D-${label}-${c.name}.png`, fullPage: true });
    const m = await overflowOf(page);
    ok(errors.length === 0, `D ${label}/${c.name}: no page error`, errors);
    ok(m.docOverflow <= 1 && m.past.length === 0, `D ${label}/${c.name}: nothing past the viewport`, m);
    if (m.clipped.length) note(`${label}/${c.name} clipped: ${JSON.stringify(m.clipped)}`);
    await ctx.close();
  }
}

// The longest city name, inside an EXPANDED row at the narrowest desktop column.
{
  const { ctx, page } = await open(CONTEXTS[3].opts, 'light', STRESS);
  await page.locator('.crow[data-code="GB"] .crow__head').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/D-stress-open-desk.png`, fullPage: true });
  const m = await overflowOf(page);
  ok(m.docOverflow <= 1 && m.past.length === 0, 'D stress/desk: the long title in a 2-column record does not overflow', m);
  if (m.clipped.length) note(`stress/desk expanded clipped: ${JSON.stringify(m.clipped)}`);
  await ctx.close();
}

// ===========================================================================
head('Z — DESIGN §3.5: 200 % browser zoom on a 390 px viewport, nothing clipped or unreachable');
{
  // 200 % browser zoom halves the CSS viewport: 390 × 664 becomes 195 × 332. There is no zoom
  // control in Playwright, so the CSS viewport the zoom produces is the emulation. Deliberately
  // NOT a mobile context here — see Z3, which is the mobile half of the same question.
  const ctx = await browser.newContext({ viewport: { width: 195, height: 332 } });
  const page = await ctx.newPage();
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await plantRows(page, REFERENCE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  const whole = await page.evaluate(() => ({
    sw: document.scrollingElement.scrollWidth, cw: document.scrollingElement.clientWidth,
    past: [...document.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
      .map((e) => String(e.className).slice(0, 30) + '@' + Math.round(e.getBoundingClientRect().right)).slice(0, 6),
  }));
  await page.screenshot({ path: `${OUT}/Z-zoom200-trips.png`, fullPage: true });
  ok(whole.sw <= whole.cw + 1, 'Z1 §6.2: the DOCUMENT does not scroll sideways at 200 % zoom', whole);
  await page.getByRole('tab', { name: 'Profile' }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/Z-zoom200.png`, fullPage: true });
  const m = await overflowOf(page);
  // Elements inside an `overflow: hidden` ancestor are R41-2's subject, not this one — exclude
  // them here so a Z2 FAIL means "the page scrolls sideways" and nothing else.
  const past = await page.evaluate(() => {
    const clipped = (el) => { let n = el.parentElement; while (n) { if (/hidden|clip/.test(getComputedStyle(n).overflowX)) return true; n = n.parentElement; } return false; };
    return [...document.querySelectorAll('.profile *')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > .5 && r.right > document.scrollingElement.clientWidth + 1 && !clipped(e); })
      .map((e) => String(e.className).slice(0, 30)).slice(0, 5);
  });
  ok(m.docOverflow <= 1 && past.length === 0, 'Z2 at 200 % zoom nothing on the Profile extends past the viewport', { ...m, past });
  const unreachable = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('.profile button, .tabbar__tab')) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) bad.push(String(el.className).slice(0, 40));
    }
    return bad;
  });
  ok(unreachable.length === 0, 'Z3 every control still has a box at 200 % zoom', unreachable);
  await ctx.close();
}

// ===========================================================================
head('Z4 — the fixed bottom bar under shrink-to-fit: the bar takes the LAYOUT viewport width');
for (const [label, opts] of [['iPhone SE', devices['iPhone SE']], ['iPhone 14', devices['iPhone 14']]]) {
  const { ctx, page } = await open(opts, 'light', REFERENCE, { tab: null });
  const m = await page.evaluate(() => {
    const bar = document.querySelector('.tabbar');
    return {
      layoutVw: innerWidth, visualVw: Math.round(visualViewport.width),
      docScrollW: document.scrollingElement.scrollWidth,
      barWidth: Math.round(bar.getBoundingClientRect().width),
      tabs: [...document.querySelectorAll('.tabbar__tab')].map((t) => {
        const r = t.getBoundingClientRect();
        return `${t.textContent}:${Math.round(r.left)}-${Math.round(r.right)}`;
      }),
    };
  });
  note(`${label}: ${JSON.stringify(m)}`);
  await page.screenshot({ path: `${OUT}/Z4-${label.replace(/\s/g, '')}-trips.png` });
  ok(m.barWidth <= m.visualVw + 1,
    `Z4 ${label}: the whole tab bar is inside the visible viewport on the Trips tab`, m);
  await ctx.close();
}

// ===========================================================================
head('L — DESIGN §3.4: a landscape phone is "simply a wide phone"');
{
  const ctx = await browser.newContext({
    ...devices['iPhone 14 landscape'], colorScheme: 'light',
  });
  const page = await ctx.newPage();
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await plantRows(page, REFERENCE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.getByRole('tab', { name: 'Profile' }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/L-landscape.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/L-landscape-full.png`, fullPage: true });
  const m = await page.evaluate(() => ({
    vw: innerWidth, vh: innerHeight,
    chromeH: document.querySelector('.chrome').getBoundingClientRect().height,
    barPos: getComputedStyle(document.querySelector('.tabbar')).position,
    barH: document.querySelector('.tabbar').getBoundingClientRect().height,
    claimH: document.querySelector('.claim').getBoundingClientRect().height,
    claimFs: getComputedStyle(document.querySelector('.claim')).fontSize,
  }));
  note(`landscape: ${JSON.stringify(m)}`);
  const contentH = m.vh - m.chromeH - m.barH;
  ok(contentH > 120, `L1 a landscape phone leaves usable content height (${Math.round(contentH)}px)`, m);
  // §5.2 movement 2 is the record. `--t-claim` scales on WIDTH (`clamp(30px, 9vw, 58px)`), and in
  // landscape the constraint is HEIGHT, so the claim takes the whole first screen.
  const rows = await page.evaluate(() => {
    const bar = document.querySelector('.tabbar').getBoundingClientRect().top;
    return [...document.querySelectorAll('.crow')]
      .filter((r) => r.getBoundingClientRect().top < bar).length;
  });
  note(`country rows visible above the bar, landscape: ${rows}`);
  ok(rows > 0, 'L2 a landscape phone shows at least one country row without scrolling', { rows, ...m });
  await ctx.close();
}

// ===========================================================================
head('B — the bottom bar vs. the padding `.app` reserves for it');
for (const c of [CONTEXTS[0], CONTEXTS[1], CONTEXTS[2]]) {
  const { ctx, page } = await open(c.opts, 'light', REFERENCE);
  const m = await page.evaluate(() => {
    const bar = document.querySelector('.tabbar');
    const app = document.querySelector('.app');
    const cs = getComputedStyle(app);
    // Scroll to the very bottom; then measure the last piece of ink against the bar's top edge.
    scrollTo(0, document.scrollingElement.scrollHeight);
    const barTop = bar.getBoundingClientRect().top;
    const last = [...document.querySelectorAll('.profile *')]
      .filter((e) => e.getBoundingClientRect().height > 0.5 && e.textContent.trim())
      .map((e) => e.getBoundingClientRect().bottom);
    return {
      barHeight: bar.getBoundingClientRect().height,
      appPadBottom: cs.paddingBottom,
      barTop, lastInk: Math.max(...last),
      overlap: Math.max(...last) - barTop,
    };
  });
  note(`${c.name}: ${JSON.stringify(m)}`);
  ok(m.overlap <= 0.5, `B1 ${c.name}: no rendered ink sits under the bottom bar`, m);
  await ctx.close();
}

// ===========================================================================
head('N — what a screen reader is actually handed');
{
  const { ctx, page } = await open(devices['iPhone 14'], 'light', REFERENCE);
  const snap = await page.accessibility.snapshot({ root: await page.$('.crlist') });
  const flat = [];
  (function walk(n) { if (!n) return; flat.push({ role: n.role, name: n.name }); (n.children ?? []).forEach(walk); })(snap);
  note('country rows as the a11y tree sees them: ' + JSON.stringify(flat.filter((f) => f.role === 'button')));
  const claim = await page.accessibility.snapshot({ root: await page.$('.claim') });
  const cflat = [];
  (function walk(n) { if (!n) return; cflat.push({ role: n.role, name: n.name, value: n.value }); (n.children ?? []).forEach(walk); })(claim);
  note('the claim as the a11y tree sees it: ' + JSON.stringify(cflat));
  // §3.5: "a screen reader must get 'Countries, 7', not '7'."
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('.crow__head')].map((b) => b.getAttribute('aria-label') ?? b.innerText.replace(/\s+/g, ' ').trim()));
  note('crow accessible names: ' + JSON.stringify(names));
  ok(true, 'N reported (judgement, not an assertion)');
  await ctx.close();
}

// ===========================================================================
head('T — the tail of the composition: dead space, and where the ink stops');
for (const c of CONTEXTS) {
  const { ctx, page } = await open(c.opts, 'light', THIN);
  const m = await page.evaluate(() => {
    const prof = document.querySelector('.profile');
    const r = prof.getBoundingClientRect();
    const inks = [...prof.querySelectorAll('*')]
      .filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0.5 && b.width > 0.5 && (e.childElementCount === 0 ? e.textContent.trim() : false); })
      .map((e) => e.getBoundingClientRect());
    const bottom = Math.max(...inks.map((b) => b.bottom));
    return {
      vh: innerHeight, profileBottom: r.bottom, lastInk: bottom,
      pageScrollH: document.scrollingElement.scrollHeight,
      tail: innerHeight - bottom,
    };
  });
  note(`thin library @ ${c.name}: ${JSON.stringify(m)}`);
  await page.screenshot({ path: `${OUT}/T-thin-${c.name}.png`, fullPage: false });
  await ctx.close();
}

await browser.close();
console.log(`\n${fails} FAIL`);
console.log(`screenshots in ${OUT}`);
process.exit(fails ? 1 : 0);
