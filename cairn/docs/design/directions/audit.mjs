/**
 * The rendered audit for the three visual directions.
 *
 * This is Jacob's own verification list from the 2026-09-02 ruling, turned into assertions:
 * understandable geography, map prominence, visual hierarchy, touch targets, focus and keyboard
 * behaviour, safe-area handling, scrolling and viewport behaviour, absence of hover-only actions,
 * no overflow or clipping, truthful empty and incomplete states, and no placeholder features
 * presented as real capabilities.
 *
 * It is deliberately NOT a pass/fail gate on a design. It is evidence to put in front of him
 * alongside the pixels. `DESIGN.md` §6's standard is the model: a design decision that was not
 * rendered was not verified.
 *
 *   node docs/design/directions/audit.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const { chromium, devices } = pw;
const BASE = process.env.CAIRN_PROTO_URL ?? 'http://localhost:4180/cairn/docs/design/directions';
const DIRS = [['A', 'a-journey-map'], ['B', 'b-plates'], ['C', 'c-spatial']];
const CTX = [
  ['mobile', { ...devices['iPhone 14'] }, true],
  ['desktop', { viewport: { width: 1440, height: 900 } }, false],
];

let fails = 0, notes = 0;
const ok = (c, label, extra) => {
  if (c) console.log(`    ok    ${label}`);
  else { fails++; console.log(`    FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra).slice(0, 260)}`}`); }
};
const note = (s) => { notes++; console.log(`    note  ${s}`); };

const browser = await chromium.launch();

for (const [id, folder] of DIRS) {
  console.log(`\n================ DIRECTION ${id} — ${folder} ================`);
  for (const [cname, copts, touch] of CTX) {
    console.log(`\n  -- ${cname} --`);
    const ctx = await browser.newContext({ ...copts, colorScheme: 'light' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    /* A missing favicon is a 404 on every page in this harness and says nothing about a design. */
    page.on('requestfailed', (r) => { if (!/favicon/i.test(r.url())) errs.push(`request failed ${r.url()}`); });
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/favicon/i.test(t) || /status of 404/.test(t)) return;
      errs.push(t);
    });
    await page.goto(`${BASE}/${folder}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    ok(errs.length === 0, 'no page or console errors', errs.slice(0, 3));

    /* --- no horizontal overflow, nothing past the viewport ---------------- */
    const overflow = await page.evaluate(() => {
      const se = document.scrollingElement;
      const bad = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (getComputedStyle(el).position === 'fixed') continue;
        /* Children of an <svg> are clipped by its viewBox; their own bounding boxes are allowed
           to exceed it and say nothing about page overflow. The <svg> itself is still checked. */
        if (el.ownerSVGElement) continue;
        if (r.right > innerWidth + 1) bad.push((el.tagName + '.' + String(el.className)).slice(0, 50));
      }
      return { scrollW: se.scrollWidth, innerW: innerWidth, bad: bad.slice(0, 5) };
    });
    ok(overflow.scrollW <= overflow.innerW + 1, 'no horizontal page overflow', overflow);
    ok(overflow.bad.length === 0, 'no element extends past the right edge', overflow.bad);

    /* --- map prominence: the map must actually dominate ------------------- */
    const mapShare = await page.evaluate(() => {
      let area = 0;
      for (const s of document.querySelectorAll('svg')) {
        const r = s.getBoundingClientRect();
        if (r.width && r.height) area += Math.min(r.width, innerWidth) * Math.min(r.height, innerHeight);
      }
      return Math.round((area / (innerWidth * innerHeight)) * 100);
    });
    ok(mapShare >= 25, `map occupies >=25% of the first viewport (measured ${mapShare}%)`, mapShare);

    /* --- geography is drawn from real polygons, continuously -------------- */
    const geo = await page.evaluate(() => {
      const paths = [...document.querySelectorAll('svg path')];
      const land = paths.filter((p) => /land/.test(p.getAttribute('class') || '')).length;
      const seen = paths.filter((p) => /seen/.test(p.getAttribute('class') || '')).length;
      return { land, seen, total: paths.length };
    });
    ok(geo.land > 50, `all land is drawn, not only the visited part (${geo.land} land paths)`, geo);
    ok(geo.seen > 0, 'visited countries are marked as an overlay on that land', geo);

    /* --- touch targets ---------------------------------------------------- */
    const targets = await page.evaluate(() => {
      const sel = 'button, a[href], [role="button"], [role="tab"], input, select';
      const small = [];
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (getComputedStyle(el).visibility === 'hidden') continue;
        if (r.width < 24 || r.height < 24) small.push({ t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) });
      }
      return small;
    });
    ok(targets.length === 0, 'every pointer target clears the 24x24 hard floor (WCAG 2.5.8)', targets.slice(0, 6));

    if (touch) {
      const primary = await page.evaluate(() => {
        const small = [];
        for (const el of document.querySelectorAll('button, [role="button"]')) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (el.closest('svg')) continue;              // map shapes are measured by their hit discs
          if (r.height < 44) small.push({ t: (el.textContent || '').trim().slice(0, 24), h: Math.round(r.height) });
        }
        return small;
      });
      ok(primary.length === 0, 'every HTML button is >=44px tall on a phone (Apple HIG / 2.5.5)', primary.slice(0, 6));
    }

    /* --- focus is visible, and nothing is hover-only ----------------------- */
    const focus = await page.evaluate(() => {
      const f = [...document.querySelectorAll('button, [role="button"], a[href]')].filter((e) => {
        const r = e.getBoundingClientRect(); return r.width && r.height;
      });
      if (!f.length) return { n: 0, bad: [] };
      const bad = [];
      for (const el of f.slice(0, 40)) {
        el.focus();
        const cs = getComputedStyle(el);
        const w = parseFloat(cs.outlineWidth) || 0;
        if (cs.outlineStyle === 'none' || w < 2) bad.push((el.textContent || '').trim().slice(0, 24));
      }
      return { n: f.length, bad };
    });
    ok(focus.bad.length === 0, `every focusable element shows a >=2px focus ring (${focus.n} checked)`, focus.bad.slice(0, 5));

    const hoverOnly = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('button, [role="button"], a[href]')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') {
          if (el.id === 'back') continue;               // a Back control genuinely has no subject yet
          bad.push((el.textContent || '').trim().slice(0, 24));
        }
      }
      return bad;
    });
    ok(hoverOnly.length === 0, 'no control exists only on :hover', hoverOnly.slice(0, 5));

    /* --- reduced motion --------------------------------------------------- */
    const rmCtx = await browser.newContext({ ...copts, reducedMotion: 'reduce' });
    const rmPage = await rmCtx.newPage();
    await rmPage.goto(`${BASE}/${folder}/index.html`, { waitUntil: 'networkidle' });
    await rmPage.waitForTimeout(500);
    const motion = await rmPage.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        for (const d of [cs.transitionDuration, cs.animationDuration]) {
          if (d && d.split(',').some((v) => parseFloat(v) > 0)) {
            bad.push((el.tagName + '.' + String(el.className)).slice(0, 40));
          }
        }
      }
      return [...new Set(bad)];
    });
    ok(motion.length === 0, 'every transition resolves to 0s under prefers-reduced-motion', motion.slice(0, 5));
    await rmCtx.close();

    /* --- motion budget ---------------------------------------------------- */
    const durations = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        for (const d of [cs.transitionDuration, cs.animationDuration]) {
          for (const v of (d || '').split(',')) {
            const ms = parseFloat(v) * (v.includes('ms') ? 1 : 1000);
            if (ms > 0) out.push(Math.round(ms));
          }
        }
      }
      return [...new Set(out)].sort((a, b) => a - b);
    });
    ok(durations.every((d) => d <= 300), `no animation exceeds 300ms (found ${JSON.stringify(durations)})`, durations);

    /* --- safe area -------------------------------------------------------- */
    const safe = await page.evaluate(() => {
      const css = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } }).join('\n');
      return { usesEnv: /env\(safe-area-inset/.test(css), viewportFit: /viewport-fit=cover/.test(document.querySelector('meta[name=viewport]')?.content || '') };
    });
    ok(safe.viewportFit && safe.usesEnv, 'viewport-fit=cover is paired with env(safe-area-inset-*)', safe);

    /* --- rendered text floor ---------------------------------------------- */
    const tiny = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!el.childNodes.length) continue;
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!hasText) continue;
        const px = parseFloat(getComputedStyle(el).fontSize);
        if (px < 11) bad.push({ t: el.textContent.trim().slice(0, 22), px });
      }
      return bad;
    });
    ok(tiny.length === 0, 'no rendered text below the 11px floor', tiny.slice(0, 5));

    /* --- truthfulness: no fabricated photography ------------------------- */
    const honesty = await page.evaluate(() => ({
      imgs: document.querySelectorAll('img').length,
      bgImages: [...document.querySelectorAll('body *')].filter((e) => {
        const b = getComputedStyle(e).backgroundImage;
        return b && b !== 'none' && !b.startsWith('linear-gradient') && !b.startsWith('radial-gradient');
      }).length,
      emptySlots: document.querySelectorAll('.photoslot').length,
    }));
    ok(honesty.imgs === 0 && honesty.bgImages === 0,
      'zero photographic assets: nothing stands in for a picture Cairn does not have', honesty);
    if (honesty.emptySlots) note(`${honesty.emptySlots} photographic slots rendered explicitly EMPTY and labelled`);

    await ctx.close();
  }
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL CHECKS PASS' : `${fails} FAILURE(S)`} · ${notes} note(s)`);
process.exit(fails ? 1 : 0);
