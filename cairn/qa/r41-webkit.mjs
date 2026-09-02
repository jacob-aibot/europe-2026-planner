/**
 * **QA round 41 — the WebKit half of `DESIGN.md` §6.4.**
 *
 *   Needs: npm run web:build && npm run serve
 *   Setup (once, needs root): PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *       node /opt/node22/lib/node_modules/playwright/cli.js install-deps webkit
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r41-webkit.mjs
 *
 * `BUILD-NOTES.md`'s I-8b entry records iOS/WebKit as **UNVERIFIED**: the builder downloaded
 * WebKit and could not launch it, because the host was missing ~20 system libraries and
 * `playwright install-deps` needs root apt. This round has root, so the deps were installed and
 * WebKit 26.0 launches. That closes the **engine** half of the gap and not the **device** half:
 *
 *   - WebKit is the engine iOS Safari uses, so `svh`/`dvh`/`lvh` resolution, `env()` parsing,
 *     `grid-template-rows: 0fr → 1fr` interpolation, `visibility` transitions, `display: contents`
 *     on a `role="tabpanel"`, multi-column with `break-inside: avoid`, and `position: fixed`
 *     inside a `position: sticky` ancestor are all really evaluated by the right engine here.
 *   - It is still **not a phone**: there is no notch and no home indicator, so
 *     `env(safe-area-inset-*)` is `0px` in this engine too, and there is no retracting browser
 *     chrome to make `svh ≠ lvh`. **Those two remain UNVERIFIED and this file does not claim them.**
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';

const { webkit, devices } = pw;

const city = (name, countryCode) => ({ key: `c-${name}`, name, countryCode, countrySource: 'derived' });
const trow = (id, title, startDate, endDate, countryCodes, cities) => ({
  id, title, startDate, endDate, datePrecision: 'exact',
  cityCount: cities.length, dayCount: 5, stopCount: 8, poolCount: 0, revision: 1,
  countryCodes, cities,
  attribution: { places: { located: 40, attributed: 36 }, stops: { located: 60, attributed: 57 } },
  summaryVersion: core.SUMMARY_VERSION,
});
const REFERENCE = [
  trow('r1', 'Central Europe 2019', '2019-08-03', '2019-08-17', ['AT', 'CZ', 'HU'],
    [city('Vienna', 'AT'), city('Prague', 'CZ'), city('Budapest', 'HU')]),
  trow('r2', 'Croatia 2022', '2022-06-01', '2022-06-10', ['HR'], [city('Dubrovnik', 'HR')]),
];
const plantRows = (page, rows) =>
  page.evaluate(async (rows) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('summaries', 'readwrite');
      const st = tx.objectStore('summaries');
      for (const r of rows) st.put(r, r.id);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, rows);
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';

let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok      ${l}`); else { fails++; console.log(`  FAIL    ${l}${x === undefined ? '' : '  -> ' + JSON.stringify(x).slice(0, 500)}`); } };
const note = (s) => console.log(`  note    ${s}`);
const head = (s) => console.log(`\n== ${s} ==`);

const browser = await webkit.launch();
note(`WebKit ${browser.version()}`);

const CTX = [
  { n: 'iPhone SE', o: devices['iPhone SE'] },
  { n: 'iPhone 14', o: devices['iPhone 14'] },
  { n: 'iPad Mini', o: devices['iPad Mini'] },
  { n: 'desktop 1280', o: { viewport: { width: 1280, height: 800 } } },
  { n: 'wide 1600', o: { viewport: { width: 1600, height: 900 } } },
];

async function open(o, scheme, tab = 'Profile', rows = REFERENCE) {
  const ctx = await browser.newContext({ ...o, colorScheme: scheme });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  if (rows) {
    await plantRows(page, rows);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tabbar');
  }
  if (tab) { await page.getByRole('tab', { name: tab }).click(); await page.waitForTimeout(300); }
  return { ctx, page, errors };
}

// ---------------------------------------------------------------------------
head('W1 — the app boots and the three tabs render in WebKit at all five contexts');
for (const c of CTX) {
  for (const scheme of ['light', 'dark']) {
    const { ctx, page, errors } = await open(c.o, scheme);
    const m = await page.evaluate(() => ({
      tabs: [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent),
      profile: !!document.querySelector('#tabpanel-profile .profile'),
      mains: document.querySelectorAll('.tabpanel:not([hidden]) main').length,
      claimFs: getComputedStyle(document.querySelector('.claim')).fontSize,
    }));
    ok(errors.length === 0 && m.tabs.length === 3 && m.profile && m.mains === 1,
      `W1 ${c.n}/${scheme}: three tabs, one <main>, no page error`, { ...m, errors });
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
head('W2 — R1/R2: the bar is fixed at the bottom at base and returns to the stack from split');
for (const c of CTX) {
  const { ctx, page } = await open(c.o, 'light');
  const m = await page.evaluate(() => {
    const bar = document.querySelector('.tabbar');
    const chrome = document.querySelector('.chrome');
    const cs = getComputedStyle(bar);
    return {
      vw: document.scrollingElement.clientWidth, vh: innerHeight,
      barPos: cs.position, barTop: Math.round(bar.getBoundingClientRect().top),
      barBottom: Math.round(bar.getBoundingClientRect().bottom),
      chromePos: getComputedStyle(chrome).position,
      appPadBottom: getComputedStyle(document.querySelector('.app')).paddingBottom,
      chromeH: getComputedStyle(document.documentElement).getPropertyValue('--chrome-h'),
    };
  });
  note(`${c.n}: ${JSON.stringify(m)}`);
  const wantFixed = m.vw < 900;
  ok(m.barPos === (wantFixed ? 'fixed' : 'static'), `W2 ${c.n}: bar position is right for the width`, m);
  if (wantFixed) ok(Math.abs(m.barBottom - m.vh) <= 1, `W2b ${c.n}: ... and it is on the bottom edge`, m);
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('W3 — the ONE animation actually animates in WebKit (grid-template-rows 0fr → 1fr)');
{
  const { ctx, page } = await open(devices['iPhone 14'], 'light');
  const before = await page.evaluate(() => {
    const t = document.querySelector('.crow__trips');
    return t ? { rows: getComputedStyle(t).gridTemplateRows, vis: getComputedStyle(t).visibility, h: Math.round(t.getBoundingClientRect().height) } : null;
  });
  if (before === null) { note('no country row in the default (empty) library — W3 needs the sample'); }
  else {
    await page.locator('.crow__head').first().click();
    await page.waitForTimeout(60);
    const mid = await page.evaluate(() => {
      const t = document.querySelector('.crow--open .crow__trips');
      return { rows: getComputedStyle(t).gridTemplateRows, h: +t.getBoundingClientRect().height.toFixed(1) };
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const t = document.querySelector('.crow--open .crow__trips');
      return { rows: getComputedStyle(t).gridTemplateRows, vis: getComputedStyle(t).visibility, h: Math.round(t.getBoundingClientRect().height) };
    });
    note(`before ${JSON.stringify(before)} / mid ${JSON.stringify(mid)} / after ${JSON.stringify(after)}`);
    ok(after.h > before.h && after.vis === 'visible', 'W3a the row opens in WebKit', { before, after });
    ok(mid.h > 0 && mid.h < after.h, 'W3b ... and the height genuinely interpolates (not a step)', { mid, after });
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('W4 — svh/dvh and env(): what WebKit resolves, stated rather than claimed');
{
  const { ctx, page } = await open(devices['iPhone 14'], 'light');
  const m = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:100svh;width:100dvh';
    document.body.appendChild(probe);
    const svh = probe.getBoundingClientRect().height;
    probe.style.height = '100dvh';
    const dvh = probe.getBoundingClientRect().height;
    probe.style.height = '100lvh';
    const lvh = probe.getBoundingClientRect().height;
    probe.remove();
    const bar = document.querySelector('.tabbar');
    return {
      innerHeight, svh, dvh, lvh,
      barPadBottom: getComputedStyle(bar).paddingBottom,
      chromePadTop: getComputedStyle(document.querySelector('.chrome')).paddingTop,
      appPadBottom: getComputedStyle(document.querySelector('.app')).paddingBottom,
      paneCap: getComputedStyle(document.documentElement).getPropertyValue('--pane-cap'),
    };
  });
  note(`WebKit resolves: ${JSON.stringify(m)}`);
  ok(m.svh > 0 && m.dvh > 0 && m.lvh > 0, 'W4a svh/dvh/lvh all resolve in WebKit', m);
  note('env(safe-area-inset-*) is 0px here too — WebKit on Linux is the right ENGINE, not a phone. '
    + 'The real notch/home-indicator inset and the retracting-chrome svh≠lvh case stay UNVERIFIED.');
  ok(true, 'W4b (stated, not asserted)');
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('W5 — layout with the safe-area inset FORCED to 34 px, in WebKit');
{
  const ctx = await browser.newContext({ ...devices['iPhone 14'], colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await plantRows(page, REFERENCE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  // The §6.4 option-2 substitute: force the fallback so the declaration has a non-zero value.
  await page.addStyleTag({
    content: `.tabbar{padding-bottom:34px}.app{padding-bottom:calc(var(--tabbar-h) + 34px)}.chrome{padding-top:34px}`,
  });
  await page.getByRole('tab', { name: 'Profile' }).click();
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    scrollTo(0, document.scrollingElement.scrollHeight);
    const bar = document.querySelector('.tabbar').getBoundingClientRect();
    const ink = [...document.querySelectorAll('.profile *')]
      .filter((e) => e.getBoundingClientRect().height > 0.5 && e.textContent.trim())
      .map((e) => e.getBoundingClientRect().bottom);
    return {
      barHeight: Math.round(bar.height), barTop: Math.round(bar.top),
      lastInk: Math.round(Math.max(...ink)),
      overlap: Math.round(Math.max(...ink) - bar.top),
      overflowX: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
    };
  });
  note(`forced 34 px inset: ${JSON.stringify(m)}`);
  ok(m.overlap <= 1, 'W5a with a 34 px inset the last content still clears the bar', m);
  ok(m.overflowX <= 1, 'W5b ... and nothing overflows sideways', m);
  await ctx.close();
}

// ---------------------------------------------------------------------------
head('W6 — horizontal overflow in WebKit, against the VISIBLE viewport');
for (const c of CTX) {
  for (const tab of ['Trips', 'Profile']) {
    const { ctx, page } = await open(c.o, 'light', tab);
    const m = await page.evaluate(() => ({
      clientWidth: document.scrollingElement.clientWidth,
      scrollWidth: document.scrollingElement.scrollWidth,
      offenders: [...document.querySelectorAll('*')]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width > .5 && r.right > document.scrollingElement.clientWidth + 1; })
        .map((e) => String(e.className).slice(0, 26)).slice(0, 4),
    }));
    ok(m.scrollWidth <= m.clientWidth + 1, `W6 ${c.n} / ${tab}: no sideways scroll in WebKit`, m);
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
head('W7 — the clipped `.triprow`, re-derived in WebKit');
for (const c of CTX) {
  const { ctx, page } = await open(c.o, 'light');
  const has = await page.locator('.crow__head').count();
  if (!has) { note(`${c.n}: no country rows in the default library`); await ctx.close(); continue; }
  await page.locator('.crow__head').first().click();
  await page.waitForTimeout(350);
  const m = await page.evaluate(() => {
    const clip = document.querySelector('.crow--open .crow__clip');
    const chip = document.querySelector('.crow--open .chip--life');
    if (!clip || !chip) return null;
    return { cutBy: Math.round(chip.getBoundingClientRect().right - clip.getBoundingClientRect().right), text: chip.textContent };
  });
  if (m === null) { note(`${c.n}: no trip row inside the expansion`); await ctx.close(); continue; }
  ok(m.cutBy <= 1, `W7 ${c.n}: the lifecycle chip is not cut off in WebKit`, m);
  await ctx.close();
}

await browser.close();
console.log(`\n${fails} FAIL`);
process.exit(fails ? 1 : 0);
