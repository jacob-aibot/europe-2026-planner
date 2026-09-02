/**
 * **QA round 41 — the independent measurements.** I-8b (`c08c70f`) adversarial pass.
 *
 *   Needs: npm run web:build && npm run serve
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r41-shell.mjs
 *
 * Everything here is re-derived rather than re-run: `qa/i8b-render.mjs` is the builder's own
 * acceptance probe and is green, so this file only measures what that one does not, or measures
 * the same thing with a different denominator.
 *
 *   V  **The vacuity control on §6.2's first assertion.** `i8b-render.mjs` A1 asks
 *      `scrollingElement.scrollWidth <= innerWidth + 1`. Under Playwright's mobile emulation
 *      `innerWidth` is the LAYOUT viewport, which grows to absorb overflow (shrink-to-fit), so
 *      the assertion cannot go red at contexts 1–3. Proved by injecting a 900 px box.
 *   O  **Real horizontal overflow**, measured against `clientWidth`, on both the Profile and the
 *      Trips tab, and with one long unbreakable city name.
 *   C  **The clipped `.triprow`** inside an expanded country row at the desktop column width.
 *   S  **The same-month claim line** (the builder's own fix 1, re-derived rather than trusted).
 *   K  **Focus visibility** on every focusable element on the Profile, in both schemes.
 *   H  **Touch-only interaction:** every control reached and used with `page.tap` alone.
 *   R  **`columns: 2` rebalancing** on expansion at 1280.
 *   F  **`--ink-faint` as text** — the contrast the builder flagged and left out of scope.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';

const { chromium, devices } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';

let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok      ${l}`); else { fails++; console.log(`  FAIL    ${l}${x === undefined ? '' : '  -> ' + JSON.stringify(x).slice(0, 600)}`); } };
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

const REFERENCE = [
  row('r1', 'Central Europe 2019', '2019-08-03', '2019-08-17', ['AT', 'CZ', 'HU'],
    [city('Vienna', 'AT'), city('Prague', 'CZ'), city('Budapest', 'HU')],
    { places: { located: 40, attributed: 36 }, stops: { located: 60, attributed: 57 } }),
  row('r2', 'Croatia 2022', '2022-06-01', '2022-06-10', ['HR'],
    [city('Dubrovnik', 'HR'), city('Split', 'HR')],
    { places: { located: 12, attributed: 12 }, stops: { located: 20, attributed: 20 } }),
  row('r4', 'London 2026', '2026-03-02', '2026-03-06', ['GB'], [city('London', 'GB')]),
];

/** Every visit inside one calendar month, which is the builder's own "Aug 2026 to Aug 2026" fix. */
const SAME_MONTH = [
  row('m1', 'A fortnight', '2019-08-03', '2019-08-10', ['AT'], [city('Vienna', 'AT')]),
  row('m2', 'The other fortnight', '2019-08-17', '2019-08-24', ['CZ'], [city('Prague', 'CZ')]),
];

/** A real, signposted place name. City names are free text on an imported row. */
const LONG_CITY = 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch';
const LONG = [row('l1', 'Wales', '2018-01-01', '2018-01-20', ['GB', 'FR'],
  [city(LONG_CITY, 'GB'), city('Paris', 'FR')])];

/** Enough countries that `columns: 2` has a balance to re-decide. Odd counts are the ones that
 *  move a row across the gutter; `N` is swept below rather than fixed, because whether a row
 *  crosses depends on the parity and not on the number. */
const CODES = ['AT', 'BE', 'CZ', 'DE', 'DK', 'EE', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'NO'];
const tour = (n) => [row('t1', 'The tour', '2021-03-01', '2021-06-30',
  CODES.slice(0, n), CODES.slice(0, n).map((c) => city('City' + c, c)))];

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
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  if (rows) { await plantRows(page, rows); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.tabbar'); }
  if (tab) { await page.getByRole('tab', { name: tab }).click(); await page.waitForTimeout(250); }
  return { ctx, page };
}

const CTX = [
  { n: 'iPhone SE', o: devices['iPhone SE'], touch: true },
  { n: 'iPhone 14', o: devices['iPhone 14'], touch: true },
  { n: 'iPad Mini', o: devices['iPad Mini'], touch: true },
  { n: 'desktop', o: { viewport: { width: 1280, height: 800 } }, touch: false },
  { n: 'wide', o: { viewport: { width: 1600, height: 900 } }, touch: false },
];

// ===========================================================================
head('V — the vacuity control on §6.2\'s "no horizontal overflow" assertion');
for (const c of CTX) {
  const { ctx, page } = await open(c.o, 'light', null);
  await page.addStyleTag({ content: '.profile::before{content:"";display:block;width:2400px;height:8px}' });
  await page.waitForTimeout(120);
  const m = await page.evaluate(() => ({
    innerWidth, clientWidth: document.scrollingElement.clientWidth,
    scrollWidth: document.scrollingElement.scrollWidth,
    asWritten: document.scrollingElement.scrollWidth <= innerWidth + 1,
    againstClientWidth: document.scrollingElement.scrollWidth <= document.scrollingElement.clientWidth + 1,
  }));
  note(`${c.n}: ${JSON.stringify(m)}`);
  ok(m.asWritten === false,
    `V ${c.n}: a deliberate 2400 px box makes A1 (as written, vs innerWidth) go RED`, m);
  await ctx.close();
}

// ===========================================================================
head('O — real horizontal overflow, measured against the VISIBLE viewport');
for (const c of CTX) {
  for (const [label, rows, tab] of [
    ['Trips, empty library', null, 'Trips'],
    ['Profile, one long city name', LONG, 'Profile'],
  ]) {
    const { ctx, page } = await open(c.o, 'light', rows, { tab });
    const m = await page.evaluate(() => {
      const se = document.scrollingElement;
      const offenders = [];
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0.5 && r.height > 0.5 && r.right > se.clientWidth + 1) {
          offenders.push(String(el.className).slice(0, 30) + '@' + Math.round(r.right));
        }
      }
      return { clientWidth: se.clientWidth, scrollWidth: se.scrollWidth, offenders: offenders.slice(0, 5) };
    });
    ok(m.scrollWidth <= m.clientWidth + 1, `O ${c.n} / ${label}: the page does not scroll sideways`, m);
    await ctx.close();
  }
}

// ===========================================================================
head('O2 — the fixed bottom bar takes the LAYOUT viewport width, not the visible one');
for (const c of CTX.filter((c) => c.touch)) {
  const { ctx, page } = await open(c.o, 'light', null, { tab: 'Trips' });
  const m = await page.evaluate(() => {
    const bar = document.querySelector('.tabbar').getBoundingClientRect();
    return {
      visible: document.scrollingElement.clientWidth, layout: innerWidth,
      barWidth: Math.round(bar.width),
      profileTab: (() => { const r = document.getElementById('tabbtn-profile').getBoundingClientRect(); return `${Math.round(r.left)}-${Math.round(r.right)}`; })(),
    };
  });
  note(`${c.n}: ${JSON.stringify(m)}`);
  ok(m.barWidth <= m.visible + 1, `O2 ${c.n}: the whole tab bar is inside the visible viewport`, m);
  await ctx.close();
}

// ===========================================================================
head('C — §6.2 "no clipping": the reused `.triprow` inside an expanded country row');
for (const c of CTX) {
  const { ctx, page } = await open(c.o, 'light', REFERENCE);
  await page.locator('.crow[data-code="AT"] .crow__head').click();
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const clip = document.querySelector('.crow--open .crow__clip');
    const chip = document.querySelector('.crow--open .chip--life');
    const cr = clip.getBoundingClientRect();
    return {
      clipWidth: Math.round(cr.width), rowMinWidth: clip.scrollWidth,
      chipRight: Math.round(chip.getBoundingClientRect().right), clipRight: Math.round(cr.right),
      cutBy: Math.round(chip.getBoundingClientRect().right - cr.right), chipText: chip.textContent,
    };
  });
  ok(m.cutBy <= 1, `C ${c.n}: the lifecycle chip inside an expanded row is not cut off`, m);
  await ctx.close();
}

// ===========================================================================
head('S — the claim\'s span line when every visit is inside one calendar month');
{
  const { ctx, page } = await open(devices['iPhone 14'], 'light', SAME_MONTH);
  const t = await page.locator('[data-testid="profile-span"]').innerText();
  note(`span line: ${JSON.stringify(t)}`);
  ok(!/from (\w+ \d{4}) to \1/.test(t), 'S1 the span line does not print a degenerate range', t);
  ok(/in Aug 2019/.test(t), 'S2 ... it states the month instead', t);
  const rows = await page.locator('.crow__facts').allInnerTexts();
  note(`row facts: ${JSON.stringify(rows)}`);
  ok(!rows.some((r) => /(\w+ \d{4}) – \1/.test(r)), 'S3 no country row prints "Aug 2019 – Aug 2019"', rows);
  await ctx.close();
}

// ===========================================================================
head('K — a visible focus indicator, driven by real Tab presses, in both schemes');
// `el.focus()` from script does NOT set `:focus-visible` in Chromium, so a probe built on it
// reports every control as unfocusable. The indicator has to be driven by the keyboard.
for (const scheme of ['light', 'dark']) {
  for (const c of [CTX[1], CTX[3]]) {
    const { ctx, page } = await open(c.o, scheme, REFERENCE);
    const seen = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const f = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return null;
        const cs = getComputedStyle(a);
        const r = a.getBoundingClientRect();
        return {
          el: String(a.className || a.tagName).slice(0, 26),
          fv: a.matches(':focus-visible'),
          w: parseFloat(cs.outlineWidth), style: cs.outlineStyle,
          x: Math.round(r.left), y: Math.round(r.top),
        };
      });
      if (f) seen.push(f);
    }
    const bad = seen.filter((f) => !(f.fv && f.w >= 2 && f.style !== 'none'));
    note(`${c.n}/${scheme} tab order: ${seen.map((f) => `${f.el}@${f.x},${f.y}`).join(' → ')}`);
    ok(seen.length > 0 && bad.length === 0,
      `K ${c.n}/${scheme}: every keyboard-focused element shows a ≥ 2px outline`, bad);
    // Tab order equals visual order — down-then-across at desktop's two-column record. The
    // tablist wraps, so dedupe before comparing: the same row appears twice in ten presses.
    const rows = [];
    for (const f of seen.filter((f) => f.el.startsWith('crow__head'))) {
      if (rows.some((r) => r.x === f.x && r.y === f.y)) break;
      rows.push(f);
    }
    const sorted = [...rows].sort((a, b) => (a.x - b.x) || (a.y - b.y));
    ok(JSON.stringify(rows) === JSON.stringify(sorted),
      `K2 ${c.n}/${scheme}: tab order through the record is down-then-across`, rows);
    await ctx.close();
  }
}

// ===========================================================================
head('H — touch-only: every control on the Profile reached with `tap`, no mouse, no hover');
for (const c of CTX.filter((c) => c.touch)) {
  const { ctx, page } = await open(c.o, 'light', REFERENCE);
  const before = await page.locator('.crow--open').count();
  await page.locator('.crow[data-code="AT"] .crow__head').tap();
  await page.waitForTimeout(300);
  const openState = await page.evaluate(() => {
    const r = document.querySelector('.crow[data-code="AT"]');
    return {
      expanded: r.querySelector('.crow__head').getAttribute('aria-expanded'),
      codeColour: getComputedStyle(r.querySelector('.crow__code')).color,
      otherCode: getComputedStyle(document.querySelector('.crow[data-code="CZ"] .crow__code')).color,
      tripsVisible: getComputedStyle(r.querySelector('.crow__trips')).visibility,
    };
  });
  ok(before === 0 && openState.expanded === 'true' && openState.tripsVisible === 'visible',
    `H ${c.n}: a tap opens the row`, openState);
  ok(openState.codeColour !== openState.otherCode,
    `H ${c.n}: ... and the open state is visible without a hover`, openState);
  // The trip inside it, reached by tap.
  await page.locator('.crow--open .triprow__open').first().tap();
  await page.waitForTimeout(500);
  const landed = await page.evaluate(() => ({
    tab: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
    trip: !!document.querySelector('.trip'),
  }));
  ok(landed.tab === 'Trips', `H ${c.n}: ... and tapping a trip inside it opens that trip`, landed);
  await ctx.close();
}

// ===========================================================================
head('R — `columns: 2` re-balances when an unrelated row is expanded (builder observation b)');
for (const c of [CTX[3], CTX[4]]) {
  for (const n of [5, 9, 13, 21]) {
    const { ctx, page } = await open(c.o, 'light', tour(n));
    const snap = () => page.evaluate(() =>
      Object.fromEntries([...document.querySelectorAll('.crow')].map((r) =>
        [r.dataset.code, Math.round(r.getBoundingClientRect().left)])));
    const before = await snap();
    await page.locator('.crow[data-code="AT"] .crow__head').click();
    await page.waitForTimeout(400);
    const after = await snap();
    const crossed = Object.keys(before).filter((k) => k !== 'AT' && before[k] !== after[k]);
    ok(crossed.length === 0,
      `R ${c.n} / ${n} countries: expanding AT does not move a DIFFERENT country between columns`,
      { crossed, before: Object.fromEntries(crossed.map((k) => [k, before[k]])), after: Object.fromEntries(crossed.map((k) => [k, after[k]])) });
    await ctx.close();
  }
}

// ===========================================================================
head('F — `--ink-faint` used as a text colour outside this surface');
{
  const { ctx, page } = await open({ viewport: { width: 1280, height: 800 } }, 'light', REFERENCE, { tab: 'Trips' });
  const m = await page.evaluate(() => {
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const rgb = (s) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(s); return m ? [+m[1], +m[2], +m[3]] : null; };
    const bgOf = (el) => { let n = el; while (n) { const c = rgb(getComputedStyle(n).backgroundColor); const a = /rgba?\([^)]*,\s*([\d.]+)\)/.exec(getComputedStyle(n).backgroundColor); if (c && (!a || +a[1] > 0.5)) return c; n = n.parentElement; } return [255, 255, 255]; };
    const out = [];
    for (const el of document.querySelectorAll('.tripcard__meta--dim')) {
      const fg = rgb(getComputedStyle(el).color), bg = bgOf(el);
      const L1 = lum(fg), L2 = lum(bg);
      out.push({ text: el.textContent.slice(0, 30), fs: getComputedStyle(el).fontSize, ratio: +(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)) });
    }
    return { count: out.length, out: out.slice(0, 3), faint: getComputedStyle(document.documentElement).getPropertyValue('--ink-faint') };
  });
  note(`.tripcard__meta--dim: ${JSON.stringify(m)}`);
  ok(m.count === 0 || m.out.every((o) => o.ratio >= 4.5),
    'F1 `--ink-faint` as body text clears WCAG AA (pre-existing, not I-8b\'s surface)', m);
  await ctx.close();
}
// And on the Profile itself, which is I-8b's own surface.
{
  const { ctx, page } = await open({ viewport: { width: 1280, height: 800 } }, 'light', REFERENCE);
  const uses = await page.evaluate(() => {
    const faint = getComputedStyle(document.documentElement).getPropertyValue('--ink-faint').trim();
    const rgb = (s) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(s); return m ? `#${[+m[1], +m[2], +m[3]].map((v) => v.toString(16).padStart(2, '0')).join('')}` : null; };
    const out = [];
    for (const el of document.querySelectorAll('#tabpanel-profile *')) {
      if (!el.textContent.trim() || el.childElementCount) continue;
      if (rgb(getComputedStyle(el).color) === faint.toLowerCase()) out.push(String(el.className).slice(0, 30));
    }
    return { faint, out };
  });
  ok(uses.out.length === 0, 'F2 nothing on the Profile uses `--ink-faint` as a text ink', uses);
  await ctx.close();
}

// ===========================================================================
head('P — the claim, read as prose: plural agreement and a dangling separator');
{
  const ONE = [row('o1', 'A weekend', '2023-09-01', '2023-09-01', ['AT'], [city('Vienna', 'AT')])];
  const { ctx, page } = await open(devices['iPhone 14'], 'light', ONE);
  // The VISUAL order is value-then-label (`.claim__pair dd { order: -1 }`), so the sentence the
  // reader sees is "1 COUNTRIES", not the DOM's "COUNTRIES 1". Read it in rendered order.
  const pairs = await page.evaluate(() =>
    [...document.querySelectorAll('.claim__pair')].map((p) => {
      const dt = p.querySelector('dt'), dd = p.querySelector('dd');
      return `${dd.textContent} ${dt.textContent}`;
    }));
  note(`claim, as rendered: ${JSON.stringify(pairs)}`);
  ok(!pairs.includes('1 Countries'), 'P1 the claim does not print "1 COUNTRIES"', pairs);
  ok(!pairs.includes('1 Cities'), 'P2 the claim does not print "1 CITIES"', pairs);
  ok(!pairs.includes('1 Days travelled'), 'P3 the claim does not print "1 DAYS TRAVELLED"', pairs);
  await ctx.close();
}
for (const c of [CTX[0], CTX[1], CTX[3]]) {
  const { ctx, page } = await open(c.o, 'light', REFERENCE);
  const dangling = await page.evaluate(() =>
    [...document.querySelectorAll('.claim__sep')].filter((s) => {
      const sr = s.getBoundingClientRect();
      const next = s.closest('.claim__pair').nextElementSibling;
      return next && next.getBoundingClientRect().top > sr.top + 2;
    }).length);
  ok(dangling === 0, `P4 ${c.n}: no separator is left dangling at the end of a wrapped line`, { dangling });
  await ctx.close();
}

// ===========================================================================
head('Q — a country row\'s facts line, and the name a screen reader is handed');
{
  const SPAN = [row('s1', 'Tour', '2021-03-01', '2021-06-30', ['AT', 'CZ', 'DE', 'FR', 'GB', 'HU'],
    ['AT', 'CZ', 'DE', 'FR', 'GB', 'HU'].map((k) => city('City' + k, k)))];
  for (const c of [CTX[3], CTX[4]]) {
    const { ctx, page } = await open(c.o, 'light', SPAN);
    const m = await page.evaluate(() => {
      const e = document.querySelector('.crow__facts');
      const lh = parseFloat(getComputedStyle(e).lineHeight) || 18;
      const r = document.createRange();
      const tn = []; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) tn.push(n);
      const lines = []; let prev = null; let cur = '';
      for (const t of tn) for (let i = 0; i < t.data.length; i++) {
        r.setStart(t, i); r.setEnd(t, i + 1);
        const top = Math.round(r.getBoundingClientRect().top);
        if (prev === null || top === prev) cur += t.data[i]; else { lines.push(cur); cur = t.data[i]; }
        prev = top;
      }
      lines.push(cur);
      return { text: e.textContent.replace(/\s+/g, ' ').trim(), lines: lines.filter((l) => l.trim()) };
    });
    note(`${c.n}: ${JSON.stringify(m)}`);
    ok(!m.lines.some((l) => /\d\s*$/.test(l.trim())) ,
      `Q1 ${c.n}: the trip count does not break away from its unit ("1" / "trip")`, m);
    await ctx.close();
  }
}
{
  const { ctx, page } = await open(devices['iPhone 14'], 'light', REFERENCE);
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('.crow__head')].map((b) => {
      // The accessible name is the text content with `aria-hidden` subtrees removed.
      const clone = b.cloneNode(true);
      clone.querySelectorAll('[aria-hidden="true"]').forEach((e) => e.remove());
      return clone.textContent.replace(/\s+/g, ' ').trim();
    }));
  note(`accessible names: ${JSON.stringify(names)}`);
  ok(!names.some((n) => /\d{4}\d/.test(n)),
    'Q2 hiding the `·` separator does not fuse the year and the trip count into one number', names);
  await ctx.close();
}

await browser.close();
console.log(`\n${fails} FAIL`);
process.exit(fails ? 1 : 0);
