/**
 * **QA round 42 — the re-breaker pass over I-8b's repair** (`652c2c3`).
 *
 *   Needs: npm run web:build && npm run serve
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r42-attack.mjs [outdir]
 *
 * Nothing here re-runs a builder assertion. Each section re-derives a repair claim with a
 * DIFFERENT instrument, different data and a different magnitude from the one the repair pass
 * used, on the theory that a fix verified only by the test written alongside it is verified once.
 *
 *   A  **R41-1's new denominator, attacked with four techniques and five magnitudes.** The repair
 *      verifies it with one 2,400 px `::after` box. 2,400 px is not the interesting case — the two
 *      real overflows this round's predecessor found were 157 px and 12 px. A is the same
 *      assertion driven at 12, 40, 137, 400 and 2,400 px by four different mechanisms, at all five
 *      contexts, with an UNINJECTED control so a permanently-red assertion cannot pass as a fix.
 *   B  **R41-2's chip, read as painted glyphs rather than as a rect.** Is the chip's own text
 *      visually complete, in both schemes, at all five contexts — and is the narrowed `CLIP_OK`
 *      exemption genuinely axis-specific, i.e. does anything clip on the axis it no longer forgives?
 *   C  **R41-3 with a name the repair pass has never seen** — a 69-character German compound and
 *      a 300-character single token, at 320 and 390, with every tab DRIVEN (tapped, and the panel
 *      change confirmed) rather than measured for its rect.
 *   D  **200 % and 400 % zoom, by CSS `zoom` on the root inside a real device profile**, which is
 *      what a browser's zoom control does to layout — a different technique from §Z's halved
 *      viewport.
 *   E  **Jacob-shaped data the fixture has none of:** a zero-day trip, the same trip imported
 *      twice, a trip that ends before it starts, a country with no city, 40 countries, a row whose
 *      city list is one 300-char token, and an empty library.
 *   F  **The separator question, answered geometrically and independently of P4's DOM assumption**
 *      — for every `·`, is anything painted to its right on its own line box?
 *   G  **Refusal equivalence, attacked from the map's side and through pseudo-content**, which is
 *      the direction fault 11 does not drive.
 *
 * A FAIL line is a round-42 finding. Screenshots land in `outdir` (default `/tmp/r42`).
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';
import { mkdirSync } from 'node:fs';

const { chromium, devices } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
const OUT = process.argv[2] ?? '/tmp/r42';
mkdirSync(OUT, { recursive: true });

let fails = 0;
const ok = (c, l, x) => {
  if (c) console.log(`  ok      ${l}`);
  else { fails++; console.log(`  FAIL    ${l}${x === undefined ? '' : '  -> ' + JSON.stringify(x).slice(0, 700)}`); }
};
const note = (s) => console.log(`  note    ${s}`);
const head = (s) => console.log(`\n== ${s} ==`);

const city = (name, countryCode) => ({ key: `c-${name}`, name, countryCode, countrySource: 'derived' });
const row = (id, title, startDate, endDate, countryCodes, cities, extra = {}) => ({
  id, title, startDate, endDate, datePrecision: 'exact',
  cityCount: cities.length, dayCount: 5, stopCount: 8, poolCount: 0, revision: 1,
  countryCodes, cities,
  attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
  summaryVersion: core.SUMMARY_VERSION,
  ...extra,
});

const REFERENCE = [
  row('r1', 'Central Europe 2019', '2019-08-03', '2019-08-17', ['AT', 'CZ', 'HU'],
    [city('Vienna', 'AT'), city('Prague', 'CZ'), city('Budapest', 'HU')]),
  row('r2', 'Croatia 2022', '2022-06-01', '2022-06-10', ['HR'],
    [city('Dubrovnik', 'HR'), city('Split', 'HR')]),
  row('r4', 'London 2026', '2026-03-02', '2026-03-06', ['GB'], [city('London', 'GB')]),
];

/** Not the breaker's Welsh name and not the repair pass's: a real 69-character German compound. */
const GERMAN = 'Schifffahrtselektrizitaetenhauptbetriebswerkbauunterbeamtengesellschaft';
/** And the pathological one: 300 characters, no break opportunity anywhere. */
const TOKEN300 = 'M'.repeat(300);

const REFUSED = [
  { ...row('d1', 'One', '2019-01-01', '2019-01-05', ['AT'], [city('Vienna', 'AT')]) },
  { ...row('d1', 'Two', '2020-01-01', '2020-01-05', ['CZ'], [city('Prague', 'CZ')]), __key: 'd1-dup' },
];
const REFUSED_NO_ROW = [row('n1', 'Bad', 'not-a-date', '2019-01-05', ['AT'], [city('Vienna', 'AT')])];

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

async function open(opts, scheme, rows, { tab = 'Profile', zoom = null } = {}) {
  const ctx = await browser.newContext({ ...opts, colorScheme: scheme });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  if (rows) { await plantRows(page, rows); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.tabbar'); }
  if (zoom) { await page.addStyleTag({ content: `:root { zoom: ${zoom} }` }); await page.waitForTimeout(150); }
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

/** The SHIPPED denominator, re-implemented here from `qa/i8b-render.mjs`'s own words so that a
 *  change to that file cannot silently change what this probe measures. */
const overflow = (page, declaredWidth) => page.evaluate((dw) => {
  const vw = Math.min(document.scrollingElement.clientWidth,
    typeof visualViewport !== 'undefined' && visualViewport ? visualViewport.width : Infinity, dw);
  return {
    vw, sw: document.scrollingElement.scrollWidth, inner: innerWidth,
    clean: document.scrollingElement.scrollWidth <= vw + 1,
  };
}, declaredWidth);

// ===========================================================================
head('A — R41-1: the overflow instrument at five magnitudes and four mechanisms');
// ===========================================================================
/*
 * The repair verifies the new denominator with ONE fault: a 2,400 px `::after` block. That proves
 * the assertion is not vacuous; it does not prove it is SENSITIVE, and 12 px is the size of the
 * overflow round 41 actually found (R41-11). Each mechanism below is a different way for real
 * content to widen a page, and the control is the one that matters most: with nothing injected the
 * assertion must be GREEN, or "red at all five" would be worthless.
 */
const MECHANISMS = [
  { k: 'abs-positioned child past the right edge',
    css: (px) => `#tabpanel-profile .profile { position: relative } #tabpanel-profile .profile::after { content:""; position:absolute; top:0; left:100%; width:${px}px; height:6px; background:#c00 }` },
  { k: 'a nowrap text run wider than the column',
    css: (px) => `#tabpanel-profile .crow__cities { white-space: nowrap !important; overflow-wrap: normal !important; word-break: normal !important; min-width: calc(100% + ${px}px) }` },
  { k: 'a negative right margin on the content column',
    css: (px) => `#tabpanel-profile .profile { margin-right: -${px}px; padding-right: ${px}px }` },
  { k: 'a transform that translates ink off the right',
    css: (px) => `#tabpanel-profile .claim { transform: translateX(${px}px) }` },
];
const SIZES = [12, 40, 137, 400, 2400];
for (const c of CTX) {
  const { ctx, page } = await open(c.o, 'light', REFERENCE);
  const base = await overflow(page, c.w);
  ok(base.clean, `A0 ${c.n}: the UNINJECTED page does not scroll sideways (the control)`, base);
  for (const m of MECHANISMS) {
    const missed = [];
    const inert = [];
    for (const px of SIZES) {
      const tag = await page.addStyleTag({ content: m.css(px) });
      await page.waitForTimeout(90);
      const r = await overflow(page, c.w);
      /*
       * A mechanism only counts as a fault when it actually pushed ink past the VISIBLE edge
       * without a clipping ancestor swallowing it. Injecting 12 px into an element that sits
       * inside a centred column three hundred pixels narrower than the viewport moves nothing
       * off screen, and calling that a missed detection would be the probe lying about the
       * assertion. So: measure the real escape first, and only then require a red.
       */
      const escaped = await page.evaluate((vw) => {
        const clipped = (el) => { let n = el.parentElement; while (n) { if (/hidden|clip/.test(getComputedStyle(n).overflowX)) return true; n = n.parentElement; } return false; };
        let worst = 0;
        for (const el of document.querySelectorAll('body *')) {
          const b = el.getBoundingClientRect();
          if (b.width > 0.5 && b.right > vw + 1 && !clipped(el)) worst = Math.max(worst, b.right - vw);
        }
        return Math.round(worst);
      }, r.vw);
      if (escaped > 1 && r.clean) missed.push({ px, escaped, ...r });
      if (escaped <= 1) inert.push(px);
      await tag.evaluate((n) => n.remove());
      await page.waitForTimeout(60);
    }
    if (inert.length) note(`${c.n} / ${m.k}: inert at ${JSON.stringify(inert)} px (no ink escaped — not a missed detection)`);
    ok(missed.length === 0, `A1 ${c.n}: the assertion sees ${m.k} whenever ink really escapes`, missed);
  }
  await ctx.close();
}

// ===========================================================================
head('B — R41-2: the lifecycle chip as painted glyphs, and the axis of the exemption');
// ===========================================================================
for (const c of CTX) {
  for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await open(c.o, scheme, REFERENCE);
    await page.locator('.crow__head').first().click();
    await page.waitForTimeout(420);
    const m = await page.evaluate(() => {
      const chips = [...document.querySelectorAll('#tabpanel-profile .crow__trips .chip--life')];
      const clippedBy = (el) => {
        // the nearest ancestor that actually clips on X, and by how much this element exceeds it
        let n = el.parentElement;
        const r = el.getBoundingClientRect();
        while (n) {
          const cs = getComputedStyle(n);
          if (/hidden|clip|auto|scroll/.test(cs.overflowX)) {
            const p = n.getBoundingClientRect();
            const pad = parseFloat(cs.borderRightWidth) || 0;
            const over = r.right - (p.right - pad);
            if (over > 1) return { by: String(n.className).slice(0, 30), over: Math.round(over) };
            return null;
          }
          n = n.parentElement;
        }
        return null;
      };
      return chips.map((el) => ({
        text: el.textContent.trim(),
        // a text element whose scrollWidth exceeds its clientWidth is printing fewer glyphs than
        // it holds — the "PAST TRI" signature, independent of any ancestor
        selfCut: el.scrollWidth > el.clientWidth + 1,
        cut: clippedBy(el),
      }));
    });
    note(`${c.n}/${scheme}: ${JSON.stringify(m)}`);
    ok(m.length > 0, `B0 ${c.n}/${scheme}: an expanded row shows at least one lifecycle chip`, m);
    ok(m.every((x) => !x.selfCut), `B1 ${c.n}/${scheme}: no lifecycle chip prints fewer glyphs than it holds`, m.filter((x) => x.selfCut));
    ok(m.every((x) => !x.cut), `B2 ${c.n}/${scheme}: no lifecycle chip is cut by a clipping ancestor`, m.filter((x) => x.cut));

    // The axis question, asked of the two exempted classes directly.
    const axes = await page.evaluate(() => {
      const out = {};
      for (const k of ['crow__clip', 'topbar__title']) {
        out[k] = [...document.querySelectorAll(`.${k}`)].map((el) => ({
          x: el.scrollWidth - el.clientWidth, y: el.scrollHeight - el.clientHeight,
          h: Math.round(el.getBoundingClientRect().height),
        }));
      }
      return out;
    });
    note(`${c.n}/${scheme} exempt axes: ${JSON.stringify(axes)}`);
    ok((axes.crow__clip ?? []).every((e) => e.x <= 1),
      `B3 ${c.n}/${scheme}: .crow__clip (exempt on Y only) does not clip on X`, axes.crow__clip);
    ok((axes.topbar__title ?? []).every((e) => e.y <= 1),
      `B4 ${c.n}/${scheme}: .topbar__title (exempt on X only) does not clip on Y`, axes.topbar__title);
    if (c.n === 'desktop' || c.n === 'iPhone SE') {
      await page.screenshot({ path: `${OUT}/B-open-${c.n.replace(/\s/g, '')}-${scheme}.png`, fullPage: true });
    }
    await ctx.close();
  }
}

// ===========================================================================
head('C — R41-3 with names the repair pass has not seen, and every tab DRIVEN');
// ===========================================================================
for (const [label, name] of [['69-char German compound', GERMAN], ['300-char single token', TOKEN300]]) {
  const rows = [row('w1', 'A long name', '2018-01-01', '2018-01-20', ['DE', 'FR'],
    [city(name, 'DE'), city('Paris', 'FR')])];
  for (const c of [CTX[0], CTX[1], CTX[3]]) {
    const { ctx, page, errors } = await open(c.o, 'light', rows);
    const m = await overflow(page, c.w);
    ok(m.clean, `C1 ${c.n} / ${label}: the document does not scroll sideways`, m);
    const bar = await page.evaluate(() => {
      const b = document.querySelector('.tabbar').getBoundingClientRect();
      const tabs = [...document.querySelectorAll('.tabbar__tab')].map((t) => {
        const r = t.getBoundingClientRect();
        return { name: t.textContent.trim(), l: Math.round(r.left), r: Math.round(r.right) };
      });
      return { barRight: Math.round(b.right), vis: document.scrollingElement.clientWidth, tabs };
    });
    ok(bar.barRight <= bar.vis + 1, `C2 ${c.n} / ${label}: the tab bar fits the visible viewport`, bar);
    ok(bar.tabs.every((t) => t.r <= bar.vis + 1), `C3 ${c.n} / ${label}: every tab is on screen`, bar);
    // Driven, not measured: tap each tab and confirm the panel really changed.
    const reached = [];
    for (const t of ['Trips', 'Map', 'Profile']) {
      const el = page.getByRole('tab', { name: t });
      if (c.touch) await el.tap(); else await el.click();
      await page.waitForTimeout(280);
      const sel = await page.getAttribute(`#tabpanel-${t.toLowerCase()}`, 'aria-hidden').catch(() => 'missing');
      const active = await page.evaluate((n) => {
        const b = [...document.querySelectorAll('.tabbar__tab')].find((x) => x.textContent.trim() === n);
        return b ? b.getAttribute('aria-selected') : 'no-tab';
      }, t);
      reached.push({ t, active, sel });
    }
    ok(reached.every((r) => r.active === 'true'), `C4 ${c.n} / ${label}: all three tabs are reachable by tap`, reached);
    ok(errors.length === 0, `C5 ${c.n} / ${label}: no page error`, errors);
    if (c.n === 'iPhone SE') await page.screenshot({ path: `${OUT}/C-${label.slice(0, 3)}-se.png`, fullPage: true });
    await ctx.close();
  }
}

// ===========================================================================
head('D — 200 % zoom, as a real device profile at the halved CSS viewport, and its fault control');
// ===========================================================================
/*
 * Browser zoom at N % divides the CSS viewport by N. `qa/r41-look.mjs` §Z emulates that with a
 * BARE `viewport:` context at 195 × 332 — no touch, no DPR. This runs the same arithmetic as a
 * real **device profile** (§6.1's own rule about bare viewports), at two starting widths §Z does
 * not use, on both tabs, in both schemes. CSS `zoom` on `:root` was tried first and discarded:
 * Chromium does not shrink the initial containing block for it, so it produces overflow that
 * browser zoom does not, which would have been a false finding.
 */
const ZOOMS = [
  { n: 'iPhone SE @200%', base: devices['iPhone SE'], w: 160, h: 284 },
  { n: 'iPhone 14 @200%', base: devices['iPhone 14'], w: 195, h: 332 },
  { n: 'iPhone 14 @150%', base: devices['iPhone 14'], w: 260, h: 442 },
];
for (const z of ZOOMS) {
  for (const tab of ['Trips', 'Profile']) {
    for (const scheme of ['light', 'dark']) {
      const c = { n: z.n, o: { ...z.base, viewport: { width: z.w, height: z.h } }, w: z.w };
      const { ctx, page, errors } = await open(c.o, scheme, REFERENCE, { tab });
      const m = await overflow(page, c.w);
      ok(m.clean, `D1 ${c.n} / ${tab} / ${scheme}: the document does not scroll sideways`, m);
      const past = await page.evaluate(() => {
        const clipped = (el) => { let n = el.parentElement; while (n) { if (/hidden|clip/.test(getComputedStyle(n).overflowX)) return true; n = n.parentElement; } return false; };
        return [...document.querySelectorAll('main *')]
          .filter((e) => { const r = e.getBoundingClientRect(); return r.width > .5 && r.right > document.scrollingElement.clientWidth + 1 && !clipped(e); })
          .map((e) => String(e.className).slice(0, 34) + '@' + Math.round(e.getBoundingClientRect().right)).slice(0, 6);
      });
      ok(past.length === 0, `D2 ${c.n} / ${tab} / ${scheme}: no unclipped ink past the visible edge`, past);
      ok(errors.length === 0, `D3 ${c.n} / ${tab} / ${scheme}: no page error`, errors);
      /*
       * D4 — the fault control for the repair pass's own unfiled §Z1 fix. It claims `.triplist`'s
       * `minmax(17rem, 1fr)` was a 272 px floor on the track and that `minmax(min(17rem, 100%),
       * 1fr)` is what closed it. Putting the old floor back must reopen it, or the fix is not the
       * thing that closed it.
       */
      if (tab === 'Trips' && scheme === 'light') {
        const tag = await page.addStyleTag({ content: '.triplist { grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)) !important }' });
        await page.waitForTimeout(140);
        const back = await overflow(page, c.w);
        ok(z.w >= 272 || !back.clean,
          `D4 ${c.n}: restoring .triplist's 17rem track floor reopens the §Z1 overflow`, back);
        await tag.evaluate((n) => n.remove());
      }
      await page.screenshot({ path: `${OUT}/D-${c.n.replace(/[\s@%]/g, '')}-${tab}-${scheme}.png`, fullPage: true });
      await ctx.close();
    }
  }
}

// ===========================================================================
head('E — the data shapes the fixture has none of');
// ===========================================================================
const SHAPES = {
  'a zero-day trip (start === end)': [row('z1', 'A day trip', '2024-05-05', '2024-05-05', ['AT'], [city('Vienna', 'AT')], { dayCount: 1 })],
  'the same trip imported twice under two ids': [
    row('x1', 'Croatia 2022', '2022-06-01', '2022-06-10', ['HR'], [city('Split', 'HR')]),
    row('x2', 'Croatia 2022', '2022-06-01', '2022-06-10', ['HR'], [city('Split', 'HR')]),
  ],
  'a trip that ends before it starts': [row('b1', 'Backwards', '2022-06-10', '2022-06-01', ['HR'], [city('Split', 'HR')])],
  'a country with no city at all': [row('c1', 'Transit', '2022-06-01', '2022-06-03', ['HR', 'SI'], [city('Split', 'HR')])],
  'forty countries': [row('f1', 'The grand tour', '2021-01-01', '2021-12-31',
    ['AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI'],
    ['AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI'].map((k) => city('City ' + k, k)))],
  'a 300-char title and a 300-char city': [row('t1', TOKEN300, '2020-01-01', '2020-01-09', ['FR'], [city(TOKEN300, 'FR')])],
  'an empty library': [],
};
for (const [label, rows] of Object.entries(SHAPES)) {
  for (const c of [CTX[1], CTX[3]]) {
    const { ctx, page, errors } = await open(c.o, 'light', rows.length ? rows : null);
    if (!rows.length) { await page.evaluate(async () => { const r = indexedDB.deleteDatabase('cairn'); await new Promise((res) => { r.onsuccess = res; r.onerror = res; r.onblocked = res; }); }); await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('tab', { name: 'Profile' }).click(); await page.waitForTimeout(280); }
    const m = await overflow(page, c.w);
    const text = await page.locator('#tabpanel-profile').innerText().catch(() => '');
    ok(errors.length === 0, `E1 ${c.n} / ${label}: no page error`, errors);
    ok(m.clean, `E2 ${c.n} / ${label}: no sideways scroll`, m);
    ok(!/NaN|undefined|Infinity|\[object/.test(text), `E3 ${c.n} / ${label}: no NaN/undefined printed`, text.slice(0, 260));
    ok(text.trim().length > 0, `E4 ${c.n} / ${label}: the surface says something`, text.slice(0, 120));
    if (c.n === 'iPhone 14') note(`${label}: ${JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 200))}`);
    await ctx.close();
  }
}

// ===========================================================================
head('F — the `·` separators, judged by line box rather than by DOM position');
// ===========================================================================
/*
 * `qa/r41-shell.mjs` §P4 asks *"is the pair after the separator's own pair on a lower line?"*,
 * which is a question about a separator that TRAILS. The repair moved it to LEAD, so P4 answers
 * the wrong question. This asks the one that survives either mechanism: **is anything painted to
 * the right of this separator, on this separator's own line?** If the answer is no, the reader
 * sees a line ending in a dot.
 */
for (const c of [CTX[0], CTX[1], CTX[2], CTX[3], CTX[4]]) {
  for (const rows of [REFERENCE, SHAPES['forty countries']]) {
    const { ctx, page } = await open(c.o, 'light', rows);
    const bad = await page.evaluate(() => {
      const claim = document.querySelector('.claim');
      if (!claim) return 'no claim';
      const ink = [...claim.querySelectorAll('dt, dd, .claim__sep')]
        .map((el) => ({ el, r: el.getBoundingClientRect(), t: el.textContent.trim() }))
        .filter((x) => x.r.width > 0);
      return ink.filter((x) => x.el.classList.contains('claim__sep')).filter((s) => {
        const sameLine = ink.filter((o) => o !== s && Math.abs(o.r.top - s.r.top) < s.r.height * 0.6);
        return !sameLine.some((o) => o.r.left >= s.r.right - 1);
      }).map((s) => ({ sep: s.t, top: Math.round(s.r.top), right: Math.round(s.r.right) }));
    });
    ok(Array.isArray(bad) && bad.length === 0,
      `F1 ${c.n} (${rows.length} rows): no separator ends its own line`, bad);
    /*
     * F2 — the mirror question, which nothing asks. R41-5's fix moved the `·` from trailing the
     * pair before it to LEADING the pair after it, so the glyph no longer ends a line. It now
     * BEGINS one: at 320 the claim reads `5 COUNTRIES` / `· 6 CITIES` / `· 30 DAYS TRAVELLED`,
     * with the separator sitting in the left margin of a 30–58 px display line where it reads as
     * a bullet. `A2b` in `qa/i8b-render.mjs` asks *"is anything to this separator's right on its
     * own line?"* and is satisfied by exactly the arrangement that produces this.
     */
    const leading = await page.evaluate(() => {
      const claim = document.querySelector('.claim');
      if (!claim) return 'no claim';
      const ink = [...claim.querySelectorAll('dt, dd, .claim__sep')]
        .map((el) => ({ el, r: el.getBoundingClientRect(), t: el.textContent.trim() }))
        .filter((x) => x.r.width > 0);
      return ink.filter((x) => x.el.classList.contains('claim__sep')).filter((s) => {
        const sameLine = ink.filter((o) => o !== s && Math.abs(o.r.top - s.r.top) < s.r.height * 0.6);
        return !sameLine.some((o) => o.r.right <= s.r.left + 1);
      }).map((s) => ({ sep: s.t, top: Math.round(s.r.top), left: Math.round(s.r.left) }));
    });
    ok(Array.isArray(leading) && leading.length === 0,
      `F2 ${c.n} (${rows.length} rows): no separator BEGINS its own line either`, leading);
    await ctx.close();
  }
}

// ===========================================================================
head('G — refusal equivalence, attacked from the map side and through pseudo-content');
// ===========================================================================
/*
 * `qa/i8b-render.mjs` fault 11 paints a sentence onto the PROFILE's banner. If the comparison had
 * been written asymmetrically — say, "every sentence of the Profile's banner appears in the map's"
 * — that fault would still be red and a sentence added to the MAP would slip through. Driven from
 * both sides, on both branches, with three kinds of divergence.
 */
const PAINTED = (sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const pseudo = (el, which) => {
    const cc = getComputedStyle(el, which).content;
    return !cc || cc === 'none' || cc === 'normal' ? '' : cc.replace(/^"|"$/g, '');
  };
  const walk = (el) => {
    let s = pseudo(el, '::before');
    for (const n of el.childNodes) { if (n.nodeType === 3) s += n.data; else if (n.nodeType === 1) s += walk(n); }
    return s + pseudo(el, '::after');
  };
  return walk(root).replace(/\s+/g, ' ').trim();
};
const DIVERGE = [
  { k: 'map banner gains a ::after sentence',
    css: '#tabpanel-map .banner--error p:first-of-type::after { content: " Your other trips are unaffected." }' },
  { k: 'map banner gains a ::before sentence',
    css: '#tabpanel-map .banner--error::before { content: "Something went wrong. " }' },
  { k: 'profile banner gains a ::before sentence',
    css: '#tabpanel-profile .banner--error::before { content: "Something went wrong. " }' },
  { k: 'map banner drops a paragraph entirely (display: none)',
    css: '#tabpanel-map .banner--error p.mono { display: none }' },
  { k: 'map banner hides a paragraph (visibility: hidden)',
    css: '#tabpanel-map .banner--error p.hint:not(.mono) { visibility: hidden }' },
  { k: 'profile banner shouts its first sentence (text-transform)',
    css: '#tabpanel-profile .banner--error b { text-transform: uppercase }' },
];
for (const [branch, rows] of [['rowId non-null', REFUSED], ['rowId null', REFUSED_NO_ROW]]) {
  const { ctx, page } = await open(devices['iPhone 14'], 'light', rows, { tab: null });
  /*
   * Both measurements are taken while the tab is ACTIVE. That is not fussiness: an inactive
   * `role="tabpanel"` is `display: none`, and `innerText` on a hidden subtree degrades to
   * `textContent` semantics — so reading the map's banner after switching to Profile would
   * silently answer a different question.
   */
  const read = async (tab, panel) => {
    await page.getByRole('tab', { name: tab }).click();
    await page.waitForSelector(`${panel} .banner--error`, { timeout: 5000 });
    await page.waitForTimeout(120);
    return page.evaluate(([fn, p]) => {
      const painted = new Function('sel', `return (${fn})(sel)`)(`${p} .banner--error`);
      const el = document.querySelector(`${p} .banner--error`);
      return { painted, reader: el ? el.innerText.replace(/\s+/g, ' ').trim() : null };
    }, [PAINTED.toString(), panel]);
  };
  const m0 = await read('Map', '#tabpanel-map');
  const p0 = await read('Profile', '#tabpanel-profile');
  note(`${branch}: ${JSON.stringify(m0.painted).slice(0, 220)}`);
  ok(m0.painted && m0.painted.length > 0 && m0.painted === p0.painted,
    `G1 ${branch}: Map and Profile refuse in identical painted words`, [m0, p0]);
  for (const d of DIVERGE) {
    const tag = await page.addStyleTag({ content: d.css });
    await page.waitForTimeout(120);
    const m = await read('Map', '#tabpanel-map');
    const p = await read('Profile', '#tabpanel-profile');
    /*
     * `reader` is `innerText` on the ACTIVE panel — what a sighted reader gets. It honours
     * `display: none`, `visibility: hidden` and `text-transform`, where a text-node walk does
     * not. Recorded beside the criterion's own measurement so a G2 FAIL can be told apart from a
     * selector that matched nothing: a finding needs `readerDiverged` true and `criterionSaw`
     * equal.
     */
    const readerDiverged = m.reader !== p.reader;
    ok(m.painted !== p.painted, `G2 ${branch}: the criterion sees "${d.k}"`,
      { criterionSaw: [m.painted, p.painted], readerSees: [m.reader, p.reader], readerDiverged });
    await tag.evaluate((n) => n.remove());
    await page.waitForTimeout(80);
  }
  await ctx.close();
}

// ===========================================================================
head('H — the vacuity control on §6.2\'s "no control exists only at :hover"');
// ===========================================================================
/*
 * §6.2, verbatim: *"For each element with a `:hover` rule, its computed style at rest has
 * non-`none` `display`, non-`hidden` `visibility` and non-`0` `opacity`."* Three conditions.
 * `qa/i8b-render.mjs` B4 computes them over `vis`, which is already filtered to
 * `width > .5 && height > .5 && visibility !== 'hidden'` — so a control that is `display: none`
 * has no rect and never enters the set, and one that is `visibility: hidden` is filtered out by
 * name. Two of the three conditions can therefore never fire. Driven rather than argued: each
 * mechanism below is injected as a stylesheet and B4's own predicate is re-run over it.
 *
 * H0 is the control: with nothing injected the predicate must be GREEN, or a red below means
 * nothing.
 */
{
  const { ctx, page } = await open(devices['iPhone 14'], 'light', REFERENCE);
  const B4 = () => page.evaluate((INTERACTIVE) => {
    const vis = [...document.querySelectorAll(INTERACTIVE)].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0.5 && r.height > 0.5 && getComputedStyle(el).visibility !== 'hidden';
    });
    return vis.filter((el) => {
      const cs = getComputedStyle(el);
      return cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0;
    }).map((el) => String(el.className).slice(0, 30));
  }, 'button, a[href], [role="button"], [role="tab"], input, select, textarea');
  /** What §6.2 actually asks for, over elements that carry a `:hover` rule. */
  const asWritten = () => page.evaluate(() => {
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
        // a collapsed accordion's own contents are hidden BY THE ACCORDION, not by a hover rule
        if (el.closest('[aria-hidden="true"]') || el.closest('.crow__clip')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) {
          bad.push([s, cs.display, cs.visibility, cs.opacity]);
        }
      }
    }
    return bad.slice(0, 6);
  });
  ok((await B4()).length === 0, 'H0 B4 is green with nothing injected (the control)', await B4());
  ok((await asWritten()).length === 0, 'H0b ... and so is §6.2 as written', await asWritten());
  // `.crow__head` is a real control on the surface under test, it already carries a `:hover` rule,
  // and it is inside `#tabpanel-profile` rather than in a collapsed accordion.
  const MECH = [
    { k: 'display: none at rest, shown on hover', css: '.crow__head { display: none !important } .crow:hover .crow__head { display: grid !important }' },
    { k: 'visibility: hidden at rest, shown on hover', css: '.crow__head { visibility: hidden !important } .crow:hover .crow__head { visibility: visible !important }' },
    { k: 'opacity: 0 at rest, shown on hover', css: '.crow__head { opacity: 0 !important } .crow:hover .crow__head { opacity: 1 !important }' },
  ];
  for (const m of MECH) {
    const tag = await page.addStyleTag({ content: m.css });
    await page.waitForTimeout(120);
    const b4 = await B4();
    const aw = await asWritten();
    ok(b4.length > 0, `H1 B4 sees "${m.k}"`, { b4, asWrittenSaw: aw.length });
    ok(aw.length > 0, `H2 §6.2 as written sees "${m.k}"`, aw);
    await tag.evaluate((n) => n.remove());
    await page.waitForTimeout(80);
  }
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} FAIL(S)\n` : '\nALL CLEAR\n');
process.exit(fails ? 1 : 0);
