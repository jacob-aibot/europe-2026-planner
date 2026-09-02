/**
 * **I-8b — the rendered acceptance standard.** `docs/DESIGN.md` §6 in full, plus ROADMAP I-8b's
 * five named criteria and the Profile half of I-8's own spec.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8b-render.mjs
 *   Faults only: ... node qa/i8b-render.mjs --faults
 *
 * §6's first line is the reason this file is long: **a design decision that was not rendered was
 * not verified.** `test/views.test.ts` holds the source-level ceilings and they are a floor, not
 * a substitute — what a stylesheet says and what a browser computes are different claims.
 *
 *   A  **Layout integrity** — no horizontal overflow, nothing past the viewport, no clipping, no
 *      dead space, and `wide` (1600) differs from `desktop` (1280) in the container's left
 *      offset and in nothing else.
 *   B  **Touch and pointer** — the 24 × 24 hard floor everywhere and the 44 × 44 primary target
 *      at the three touch contexts, measured with `elementFromPoint` rather than with
 *      `getBoundingClientRect`, because `.icon`'s hit area is a pseudo-element and a rect cannot
 *      see it. Adjacent-target spacing, and no control that exists only at `:hover`.
 *   C  **Safe area and viewport units** — see §6.4 and the honest gap below.
 *   D  **Focus, keyboard and semantics** — visible focus in both schemes, tab order equals visual
 *      order (column-major at desktop), arrow-key tab traversal, one `<main>`, `<dl>` pairs.
 *   E  **Visual identity** — the 11 px floor, the two permanent removals, WCAG AA in both
 *      schemes, P3 (`completed` ≥ `planned`), P4 (a ≥ 2.5× type ratio), the nesting ceiling and
 *      P6's motion budget including `prefers-reduced-motion`.
 *   F  **Driven interaction** — the row expands and collapses under a real tap and under `Enter`,
 *      all three tabs cycle and the world map's `viewBox` survives being hidden, and the refusal,
 *      empty and provisional paths are driven rather than inspected.
 *   G  **The map gesture ceiling** — a vertical drag starting on a country still scrolls.
 *   H  **THE INJECTED FAULTS, RENDERED.** Each of ROADMAP I-8b's five criteria is re-run with the
 *      fault applied as an injected stylesheet, and the expected colour is RED. A criterion that
 *      stays green with its own fault applied is not load-bearing. **The touch-target fault has a
 *      second half no bare-Node test can show**: it must be red at the three touch contexts and
 *      **green at the two desktop ones**, which is what proves the probe measures the touch
 *      matrix and not the page.
 *
 * **THE HONEST GAP — §6.4, and it is stated rather than skipped.** Only Chromium is installed
 * here (`/opt/pw-browsers`: chromium + headless shell + ffmpeg; `webkit` and `firefox` are
 * absent and `browserType.launch` fails on both). Chromium's iPhone device profiles emulate
 * viewport, DPR, touch and UA. They do **not** emulate iOS Safari's retracting chrome, its
 * `dvh`/`svh` behaviour, its virtual-keyboard viewport resize, or `env(safe-area-inset-*)`,
 * which it reports as `0px`. So section C asserts what *is* checkable — that the declaration
 * survives into the used value, and that the layout is correct with the inset **forced non-zero**
 * — and the real-device behaviour is recorded in BUILD-NOTES as an unverified claim.
 *
 * A FAIL line in A–G is a clause of DESIGN.md that does not hold on screen. A MISMATCH line in
 * H is a criterion that cannot go red.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';

const { chromium, devices } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
const FAULTS_ONLY = process.argv.includes('--faults');

let fails = 0;
let mismatches = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok      ${label}`);
  else { fails++; console.log(`  FAIL    ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra).slice(0, 400)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note    ${s}`);

// ---------------------------------------------------------------------------
// §6.1 — five contexts, and they are DEVICE PROFILES rather than bare widths. A bare
// `newContext({ viewport })` emulates no touch, no device pixel ratio and no coarse pointer,
// which is exactly what a touch-target criterion needs to see.
// ---------------------------------------------------------------------------
const CONTEXTS = [
  { name: 'iPhone SE 320x568', opts: devices['iPhone SE'], touch: true, w: 320 },
  { name: 'iPhone 14 390x664', opts: devices['iPhone 14'], touch: true, w: 390 },
  { name: 'iPad Mini 768x1024', opts: devices['iPad Mini'], touch: true, w: 768 },
  { name: 'desktop 1280x800', opts: { viewport: { width: 1280, height: 800 } }, touch: false, w: 1280 },
  { name: 'wide 1600x900', opts: { viewport: { width: 1600, height: 900 } }, touch: false, w: 1600 },
];
const SCHEMES = ['light', 'dark'];

// ---------------------------------------------------------------------------
// The libraries. Planted directly into IndexedDB, in the shape `qa/i8c-render.mjs` established.
// ---------------------------------------------------------------------------
const city = (name, countryCode) => ({ key: `c-${name}`, name, countryCode, countrySource: 'derived' });
const row = (id, title, startDate, endDate, countryCodes, cities, census) => ({
  id, title, startDate, endDate, datePrecision: 'exact',
  cityCount: cities.length, dayCount: 5, stopCount: 8, poolCount: 0, revision: 1,
  countryCodes, cities,
  attribution: census ?? {
    places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 },
  },
  summaryVersion: core.SUMMARY_VERSION,
});

/** The reference library for the matrix: three travelled trips, one planned, and real holes. */
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

/** I-8's inherited provisional criterion: one `completed` trip to AT, one `active` to AT + GB. */
const PROVISIONAL = [
  row('p-done', 'Vienna 2024', '2024-05-01', '2024-05-08', ['AT'], [city('Vienna', 'AT')]),
  row('p-now', 'On the road', '2026-08-28', '2026-09-30', ['AT', 'GB'],
    [city('Vienna', 'AT'), city('London', 'GB')]),
];

/**
 * QA **R41-3**: a city name is free text on an imported `TripSummaryRow`, and this is a real,
 * signposted UK place name. 58 characters with no break opportunity in them.
 */
const LONGCITY = [
  row('lc', 'Wales 2023', '2023-05-01', '2023-05-06', ['GB'],
    [city('Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch', 'GB')]),
];

/** A-31 Part 4's duplicate-row-id throw, which is the one that carries a row id in its message. */
const REFUSED = [
  row('dup', 'One', '2020-01-01', '2020-01-05', ['AT'], []),
  { ...row('dup', 'Two', '2020-02-01', '2020-02-05', ['CZ'], []), __key: 'dup-2' },
];

/**
 * The **other** refusal branch — `rowId: null`. `travelStats`'s malformed-date throw names no
 * row (`packages/client` §`travelHistory` says why, and says the alternative is a second
 * implementation of `parseIsoDate`), so the two surfaces print the generic sentence. DESIGN §6.2
 * requires the equivalence check on **both** branches, and this is the second one.
 */
const REFUSED_NO_ROW = [
  row('bad', 'A trip with dates we cannot read', 'not-a-date', 'also-not-a-date', ['AT'], []),
];

/** A row minted by an older build — the I-6 rescan indicator, on screen and not merely in state. */
const STALE = [
  { ...row('s1', 'Old row', '2021-04-01', '2021-04-08', ['AT'], [city('Vienna', 'AT')]), summaryVersion: 1 },
];

const plantRows = (page, rows) =>
  page.evaluate(async (rows) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('summaries', 'readwrite');
      const st = tx.objectStore('summaries');
      for (const r of rows) {
        const { __key, ...rest } = r;
        st.put(rest, __key ?? rest.id);
      }
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, rows);

const browser = await chromium.launch();

/**
 * Opens the app with a planted library and lands on the Profile.
 *
 * `faultCss` is section H's mechanism: the fault is injected as a stylesheet rather than built
 * into the bundle, so a fault matrix costs one page load instead of one `vite build`. It reaches
 * exactly the declarations the ruling names.
 */
async function openProfile(ctxSpec, scheme, rows, { faultCss = null, tab = 'Profile' } = {}) {
  const ctx = await browser.newContext({ ...ctxSpec.opts, colorScheme: scheme });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  if (rows !== null) {
    await plantRows(page, rows);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tabbar');
  }
  if (faultCss) await page.addStyleTag({ content: faultCss });
  if (tab) {
    await page.getByRole('tab', { name: tab }).click();
    await page.waitForTimeout(250);
  }
  return { ctx, page, errors };
}

// ---------------------------------------------------------------------------
// The in-page measurement kit. Installed once per page; every assertion below is a
// `page.evaluate` over it, so a criterion is a number rather than a screenshot.
// ---------------------------------------------------------------------------
const KIT = () => {
  const w = window;
  w.__cairn = {
    /** Every element in the subtree with a non-zero box. */
    boxes(root) {
      return [...root.querySelectorAll('*')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0.5 && r.height > 0.5;
      });
    },
    rgb(s) {
      const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s);
      return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
    },
    lum([r, g, b]) {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    },
    /** The first opaque background painted behind `el`, walking up. */
    bgOf(el) {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = w.__cairn.rgb(getComputedStyle(n).backgroundColor);
        if (c && c[3] > 0.9) return c;
        n = n.parentElement;
      }
      const c = w.__cairn.rgb(getComputedStyle(document.body).backgroundColor);
      return c ?? [255, 255, 255, 1];
    },
    contrast(el) {
      const fg = w.__cairn.rgb(getComputedStyle(el).color);
      const bg = w.__cairn.bgOf(el);
      if (!fg || !bg) return null;
      const a = w.__cairn.lum(fg), b = w.__cairn.lum(bg);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    },
    /** Elements carrying their own text, i.e. the ones whose ink and size are their own. */
    inked(root) {
      return w.__cairn.boxes(root).filter((el) =>
        [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0));
    },
    /**
     * §3.4's hit area, measured the way a finger measures it: is the required box, centred on the
     * control, actually **hit-testable to that control**? `getBoundingClientRect` cannot answer
     * this — `.icon`'s hit area is a pseudo-element, which has no rect of its own and belongs to
     * its originating element for hit-testing purposes.
     */
    hits(el, size) {
      // Bring the control fully on screen first: a hit test is a claim about a control the user
      // can reach, and "off the bottom of a 568 px viewport" is not a target-size defect.
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const h = size / 2 - 0.5;
      /*
        **Edge midpoints, not corners, and the reason is `--radius`.** Hit-testing honours
        `border-radius`, so a probe at the corner of the required box misses a 26 × 26 control
        with a 6 px radius by 1.5 px and reports a target-size defect that is really a rounding
        artefact. The criterion is *"is the required box WIDE enough and TALL enough to be hit"*,
        which the four edge midpoints answer exactly and the corners answer with a false negative.
      */
      const pts = [[cx - h, cy], [cx + h, cy], [cx, cy - h], [cx, cy + h], [cx, cy]];
      for (const [x0, y0] of pts) {
        // Genuinely off screen is a fail; sitting flush against the viewport edge is not — a
        // bottom bar's own bottom edge IS `innerHeight`, and `elementFromPoint` rejects that
        // coordinate. Nudge inside by a sub-pixel rather than failing the bar for being a bar.
        if (x0 < -1 || y0 < -1 || x0 > innerWidth + 1 || y0 > innerHeight + 1) return false;
        const x = Math.max(0.6, Math.min(x0, innerWidth - 0.6));
        const y = Math.max(0.6, Math.min(y0, innerHeight - 0.6));
        const hit = document.elementFromPoint(x, y);
        if (!(hit === el || el.contains(hit))) return false;
      }
      return true;
    },
    /**
     * Does this element draw a **box**?
     *
     * The nesting ceiling is P4's — *"a bordered box inside a bordered box inside a bordered box
     * is a hierarchy failure"* — and it is about **enclosure**, not about ink. A hairline
     * separator under a row is one side and encloses nothing; counting it would forbid the exact
     * composition §5.3 asks for (hairline-separated rows) and would say nothing about hierarchy.
     * So: three or more visible sides. Stated here rather than left implicit, because a criterion
     * that measures the wrong thing passes for the wrong reason.
     */
    boxed(el) {
      const cs = getComputedStyle(el);
      let sides = 0;
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        if (cs[`border${side}Style`] === 'none' || cs[`border${side}Style`] === 'hidden') continue;
        if (parseFloat(cs[`border${side}Width`]) <= 0) continue;
        const c = w.__cairn.rgb(cs[`border${side}Color`]);
        if (c && c[3] > 0.05) sides++;
      }
      return sides >= 3;
    },
    label(el) {
      return (el.tagName + '.' + (el.className || '').toString().split(' ')[0]).slice(0, 48);
    },
  };
};

/**
 * **What a reader actually sees inside an element**, as one normalised string: the text nodes
 * *and* the `::before`/`::after` content, in document order. `textContent` skips pseudo-elements
 * entirely, which would let a sentence painted by CSS sit on one surface and not the other while
 * an equivalence check compared the two as equal — measured, not assumed: rendered fault 11 is
 * exactly that mutation, and it stays GREEN against `textContent`. §5.5's ruling is about the
 * **words on screen**, so the measurement has to be too.
 */
const PAINTED_TEXT = (sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const pseudo = (el, which) => {
    const c = getComputedStyle(el, which).content;
    return !c || c === 'none' || c === 'normal' ? '' : c.replace(/^"|"$/g, '');
  };
  const walk = (el) => {
    let s = pseudo(el, '::before');
    for (const n of el.childNodes) {
      if (n.nodeType === 3) s += n.data;
      else if (n.nodeType === 1) s += walk(n);
    }
    return s + pseudo(el, '::after');
  };
  return walk(root).replace(/\s+/g, ' ').trim();
};

const INTERACTIVE = 'button, a[href], [role="button"], [role="tab"], input, select, textarea';
/**
 * §6.2: 44 × 44 applies *"to anything tagged as a primary target"* — §3.4 defines that as
 * *"every tab, every button that is the main action of a row, and every map country chip."*
 * Named here rather than inferred, so the criterion is falsifiable.
 */
const PRIMARY = [
  '.tabbar__tab', '.icon:not(.icon--select)', '.btn:not(.stop__role .btn)', 'button.chip', 'label.chip',
  '.crow__head', '.triprow__open', '.tripcard__open', '.codechip', '.banner button',
].join(', ');

if (!FAULTS_ONLY) {
  // =========================================================================
  head('A/B/D/E — the five-context × two-scheme matrix, on the Profile');
  // =========================================================================
  /** §6.2's "wide changes nothing but margins": measured against this, filled at 1280. */
  const widthsAt1280 = {};

  for (const c of CONTEXTS) {
    for (const scheme of SCHEMES) {
      const tag = `${c.name} / ${scheme}`;
      const { ctx, page, errors } = await openProfile(c, scheme, REFERENCE);
      await page.evaluate(KIT);
      await page.waitForSelector('#tabpanel-profile .profile');

      // ---- A. layout integrity ------------------------------------------
      const layout = await page.evaluate((declaredWidth) => {
        const root = document.querySelector('#tabpanel-profile .profile');
        const K = window.__cairn;
        /*
         * **QA R41-1 — the denominator, and it is the whole assertion.** A1 and A2 used to
         * compare against `innerWidth`. Under a §6.1 DEVICE PROFILE (`isMobile: true`, which
         * §6.1 mandates over a bare viewport) `innerWidth` is the LAYOUT viewport, and Chromium
         * widens the layout viewport to shrink-to-fit whatever overflows — so `scrollWidth` and
         * `innerWidth` grew together and the difference was always ≤ 1. Injecting a 2,400 px box
         * into `.profile` left A1 **green at iPhone SE, iPhone 14 and iPad Mini** and red only
         * at 1280/1600, where the viewport is fixed regardless of content. Three of the five
         * contexts §6.1 exists for could not fail the first assertion §6.2 names.
         *
         * The correct denominator is the **visible** viewport, which does not grow with content:
         * `document.scrollingElement.clientWidth`, cross-checked against the context's own
         * declared `viewport.width` so a bug in one cannot hide a bug in the other. Fault 6
         * below is the standing vacuity control, and it is red at all five contexts.
         */
        const vw = Math.min(
          document.scrollingElement.clientWidth,
          visualViewport ? visualViewport.width : Infinity,
          declaredWidth,
        );
        const past = K.boxes(document.body)
          .filter((el) => el.getBoundingClientRect().right > vw + 1)
          .map(K.label);
        /*
         * Deliberate clippers, **per axis** (QA R41-2). A collapsed accordion is clipping on
         * purpose on the VERTICAL axis — that is where `grid-template-rows: 0fr` lives — and an
         * ellipsised title on the HORIZONTAL one. Written for both axes, the exemption also
         * blanket-forgave the horizontal clip that sliced the `Past trip` chip in half, which is
         * exactly the defect §6.2's clause is for. One axis each, named.
         */
        const CLIP_OK = { crow__clip: 'y', topbar__title: 'x' };
        const clipped = [];
        for (const el of K.boxes(document.body)) {
          const cs = getComputedStyle(el);
          if (!/hidden|clip|auto|scroll/.test(cs.overflowX + cs.overflowY)) continue;
          const cls = (el.className || '').toString();
          const exempt = Object.keys(CLIP_OK).filter((k) => cls.includes(k)).map((k) => CLIP_OK[k]);
          if (!exempt.includes('x') && el.scrollWidth > el.clientWidth + 1) {
            clipped.push(K.label(el) + ' x');
          }
          if (!exempt.includes('y') && /hidden|clip/.test(cs.overflowY)
            && el.scrollHeight > el.clientHeight + 1) {
            clipped.push(K.label(el) + ' y');
          }
        }
        // Dead space: the tallest run inside the surface's own box carrying no ink.
        const rr = root.getBoundingClientRect();
        const top = rr.top + scrollY, bottom = rr.bottom + scrollY;
        const spans = K.inked(root).concat([...root.querySelectorAll('svg, img')])
          .map((el) => { const r = el.getBoundingClientRect(); return [r.top + scrollY, r.bottom + scrollY]; })
          .sort((a, b) => a[0] - b[0]);
        let gap = 0, cursor = top;
        for (const [a, b] of spans) {
          if (a > cursor) gap = Math.max(gap, a - cursor);
          cursor = Math.max(cursor, b);
        }
        gap = Math.max(gap, bottom - cursor);
        // Every element in the content column, keyed by a stable identity, for the wide check.
        const widths = {};
        for (const el of K.boxes(root)) {
          const key = K.label(el) + '#' + [...el.parentElement.children].indexOf(el);
          widths[key] = Math.round(el.getBoundingClientRect().width * 100) / 100;
        }
        return {
          scrollWidth: document.scrollingElement.scrollWidth,
          inner: vw,
          layoutWidth: innerWidth,
          past, clipped, gap, vh: innerHeight,
          left: Math.round(rr.left),
          widths,
        };
      }, c.w);
      ok(layout.scrollWidth <= layout.inner + 1, `A1 no horizontal overflow — ${tag}`,
        [layout.scrollWidth, layout.inner, `layoutViewport=${layout.layoutWidth}`]);
      ok(layout.past.length === 0, `A2 nothing extends past the viewport — ${tag}`, layout.past);
      /*
       * **A2b — no separator is left dangling at the end of a line** (QA R41-5). Measured by
       * GEOMETRY and not by DOM position: a `·` dangles when nothing on its own line box sits
       * to its right. Stated that way it is independent of which pair the separator lives in,
       * which matters because the fix moves it from the pair it followed to the pair it leads —
       * a predicate written around the old DOM order reports the corrected markup as broken.
       */
      const sep = await page.evaluate(() => {
        const items = [...document.querySelectorAll('#tabpanel-profile .claim__pair > *')]
          .map((el) => { const r = el.getBoundingClientRect(); return { el, top: r.top, l: r.left, r: r.right }; });
        return items.filter((s) => s.el.classList.contains('claim__sep'))
          .filter((s) => !items.some((o) => o !== s && Math.abs(o.top - s.top) < 4 && o.l >= s.r - 1))
          .map((s) => Math.round(s.l) + ',' + Math.round(s.top));
      });
      ok(sep.length === 0, `A2b no claim separator ends a line — ${tag}`, sep);
      ok(layout.clipped.length === 0, `A3 nothing is clipped — ${tag}`, layout.clipped);
      const deadCap = c.touch ? 0.25 : 0.33;
      ok(layout.gap <= layout.vh * deadCap,
        `A4 dead space ${(layout.gap / layout.vh * 100).toFixed(1)}% ≤ ${deadCap * 100}% — ${tag}`, layout.gap);
      if (c.w === 1280) widthsAt1280[scheme] = { widths: layout.widths, left: layout.left };
      if (c.w === 1600) {
        const base = widthsAt1280[scheme];
        const moved = Object.keys(layout.widths)
          .filter((k) => base.widths[k] !== undefined && base.widths[k] !== layout.widths[k])
          .map((k) => [k, base.widths[k], layout.widths[k]]);
        ok(moved.length === 0, `A5 wide adds no layout — every content width identical at 1280 and 1600 (${scheme})`, moved);
        ok(layout.left > base.left, `A5b ... and only the container's left offset differs (${scheme})`,
          [base.left, layout.left]);
      }

      // ---- B. touch and pointer ------------------------------------------
      const touch = await page.evaluate(({ INTERACTIVE, PRIMARY, want }) => {
        window.scrollTo(0, 0);
        const K = window.__cairn;
        const vis = [...document.querySelectorAll(INTERACTIVE)].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0.5 && r.height > 0.5 && getComputedStyle(el).visibility !== 'hidden';
        });
        const primary = new Set([...document.querySelectorAll(PRIMARY)]);
        /*
          Adjacent spacing, measured BEFORE the hit tests, which scroll. Two qualifications, both
          stated rather than quietly applied:
            - **Same layer only.** A `position: fixed` bar and a scrolling row are not adjacent
              targets; their separation is whatever the scroll offset happens to be, and content
              passing beneath an opaque fixed bar is what a bottom bar IS.
            - **Both already full-size is not the hazard.** §3.4's rule exists because `.icon`
              *"appears in rows of three with ~2px gaps, so the [WCAG 2.5.8] offset exception does
              not save it."* A flush segmented bar of 44 × 44 targets has no undersized target to
              save, and forbidding it would forbid every bottom navigation bar ever shipped.
        */
        const layer = (el) => (el.closest('.tabbar') ? 'bar' : el.closest('.chrome') ? 'chrome' : 'page');
        const near = [];
        for (let i = 0; i < vis.length; i++) {
          for (let j = i + 1; j < vis.length; j++) {
            if (layer(vis[i]) !== layer(vis[j])) continue;
            const a = vis[i].getBoundingClientRect(), b = vis[j].getBoundingClientRect();
            const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
            const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
            const d = Math.hypot(dx, dy);
            const big = (r) => r.width >= 43.5 && r.height >= 43.5;
            if (d < 8 && !(big(a) && big(b))) near.push([K.label(vis[i]), K.label(vis[j]), Math.round(d)]);
          }
        }
        // Nothing exists only at :hover — every visible control is already visible at rest.
        const hidden = vis.filter((el) => {
          const cs = getComputedStyle(el);
          return cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0;
        }).map(K.label);
        const floor = vis.filter((el) => !K.hits(el, 24)).map(K.label);
        const target = vis.filter((el) => primary.has(el) && !K.hits(el, want)).map(K.label);
        window.scrollTo(0, 0);
        return { n: vis.length, floor, target, near, hidden };
      }, { INTERACTIVE, PRIMARY, want: c.touch ? 44 : 24 });
      ok(touch.n > 0, `B0 there are controls to measure — ${tag}`, touch.n);
      ok(touch.floor.length === 0, `B1 every pointer target clears 24 × 24 — ${tag}`, touch.floor);
      ok(touch.target.length === 0,
        `B2 every primary target clears ${c.touch ? '44 × 44' : '24 × 24'} — ${tag}`, touch.target);
      ok(touch.near.length === 0, `B3 adjacent targets ≥ 8 px apart (or both full-size) — ${tag}`, touch.near);
      ok(touch.hidden.length === 0, `B4 no control exists only at :hover — ${tag}`, touch.hidden);

      // ---- D. focus, keyboard and semantics ------------------------------
      const sem = await page.evaluate(() => {
        const mains = [...document.querySelectorAll('main')]
          .filter((el) => el.getBoundingClientRect().height > 0);
        const claim = document.querySelector('[data-testid="profile-claim"]');
        const pairs = claim ? [...claim.querySelectorAll('div')].map((d) => ({
          dt: d.querySelector('dt')?.textContent, dd: d.querySelector('dd')?.textContent,
        })) : [];
        return {
          mains: mains.length,
          tablists: document.querySelectorAll('[role="tablist"]').length,
          tabs: document.querySelectorAll('[role="tab"]').length,
          selected: document.querySelectorAll('[role="tab"][aria-selected="true"]').length,
          claimIsDl: claim?.tagName === 'DL',
          pairs,
          lifecycleIsDl: document.querySelector('[data-testid="profile-lifecycle"]')?.tagName === 'DL',
        };
      });
      ok(sem.mains === 1, `D1 exactly one visible <main> — ${tag}`, sem.mains);
      ok(sem.tablists === 1 && sem.tabs === 3 && sem.selected === 1,
        `D2 one tablist, three tabs, exactly one selected — ${tag}`, sem);
      ok(sem.claimIsDl && sem.pairs.length === 3 && sem.pairs.every((p) => p.dt && p.dd),
        `D3 every claim statistic is a dt/dd pair — ${tag}`, sem.pairs);
      ok(sem.lifecycleIsDl, `D4 the lifecycle counts are a <dl> too — ${tag}`);

      // Tab order equals visual order. At desktop the record is two columns of rows and the
      // order §5.4 requires is **down-then-across**, so "visual order" is column-major — a
      // row-major comparison would assert the opposite of the ruling.
      const order = await page.evaluate(() => {
        const root = document.querySelector('#tabpanel-profile .profile');
        const els = [...root.querySelectorAll('button, a[href], input, select, [tabindex="0"]')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0.5 && r.height > 0.5 && getComputedStyle(el).visibility !== 'hidden';
          });
        const lefts = [...new Set(els.map((el) => Math.round(el.getBoundingClientRect().left / 10)))]
          .sort((a, b) => a - b);
        const key = (el) => {
          const r = el.getBoundingClientRect();
          return [lefts.indexOf(Math.round(r.left / 10)), Math.round(r.top + scrollY)];
        };
        const dom = els.map((el, i) => ({ i, k: key(el) }));
        const visual = [...dom].sort((a, b) => (a.k[0] - b.k[0]) || (a.k[1] - b.k[1]));
        return { n: els.length, columns: lefts.length, same: visual.every((v, i) => v.i === i) };
      });
      ok(order.n > 0 && order.same,
        `D5 tab order equals visual order (down-then-across, ${order.columns} column(s)) — ${tag}`, order);

      // Visible focus, in BOTH colour schemes — the criterion is per-scheme by construction.
      //
      // Driven with real `Tab` presses rather than `el.focus()`: `:focus-visible` is a heuristic
      // about HOW focus arrived, and a scripted `.focus()` does not match it in Chromium. A probe
      // that used `.focus()` would be measuring a rule that never applies.
      const focusBad = [];
      const seen = [];
      await page.evaluate(() => { window.scrollTo(0, 0); document.body.focus(); });
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          return {
            id: (el.tagName + '.' + (el.className || '').toString().split(' ')[0]).slice(0, 40),
            w: parseFloat(cs.outlineWidth), style: cs.outlineStyle, vis: !!el.matches(':focus-visible'),
          };
        });
        if (!f) break;
        seen.push(f.id);
        if (!(f.vis && f.w >= 2 && f.style !== 'none')) focusBad.push(f);
      }
      ok(seen.length > 0 && focusBad.length === 0,
        `D6 every keyboard-focused control has a ≥ 2 px visible ring — ${tag}`, { focusBad, seen });

      // ---- E. visual identity and hierarchy -------------------------------
      const ident = await page.evaluate(() => {
        const K = window.__cairn;
        const root = document.querySelector('#tabpanel-profile .profile');
        const inked = K.inked(root);
        const sizes = [...new Set(inked.map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100))]
          .sort((a, b) => a - b);
        const small = inked.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 10.99)
          .map((el) => [K.label(el), getComputedStyle(el).fontSize]);
        // The two I-8a removals, permanent.
        const glass = K.boxes(document.body)
          .filter((el) => getComputedStyle(el).backdropFilter !== 'none').map(K.label);
        const grad = K.boxes(document.body)
          .filter((el) => !el.closest('.worldmap__figure'))
          .filter((el) => /gradient/.test(getComputedStyle(el).backgroundImage)).map(K.label);
        // Contrast, per element, against its own composited background.
        const low = inked
          .map((el) => [K.label(el), K.contrast(el), parseFloat(getComputedStyle(el).fontSize),
            getComputedStyle(el).fontWeight])
          .filter(([, ratio, size, weight]) => {
            const large = size >= 24 || (size >= 18.66 && Number(weight) >= 700);
            return ratio !== null && ratio < (large ? 3 : 4.5);
          });
        // Nesting ceiling: no visible border more than two deep inside other visible borders.
        let deepest = 0, worst = null;
        for (const el of K.boxes(root)) {
          if (!K.boxed(el)) continue;
          let d = 0;
          for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
            if (K.boxed(n)) d++;
          }
          if (d > deepest) { deepest = d; worst = K.label(el); }
        }
        // P3: `completed` may not be quieter than `planned`.
        const chip = (s) => document.querySelector(`.chip--life-${s}`);
        const p3 = { completed: K.contrast(chip('completed')), planned: K.contrast(chip('planned')) };
        // Motion budget on this surface.
        const durations = [];
        for (const el of K.boxes(root)) {
          const cs = getComputedStyle(el);
          for (const v of (cs.transitionDuration + ',' + cs.animationDuration).split(',')) {
            const s = v.trim();
            if (!s || s === '0s') continue;
            durations.push({ el: K.label(el), ms: s.endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000 });
          }
          if (/\bease-in\b/.test(cs.transitionTimingFunction)) durations.push({ el: K.label(el), ease: 'ease-in' });
        }
        return { sizes, small, glass, grad, low, deepest, worst, p3, durations };
      });
      ok(ident.small.length === 0, `E1 no rendered text below the 11 px floor — ${tag}`, ident.small);
      ok(ident.glass.length === 0, `E2 no backdrop-filter (I-8a removal 1) — ${tag}`, ident.glass);
      ok(ident.grad.length === 0, `E3 no gradient on a chrome element (I-8a removal 2) — ${tag}`, ident.grad);
      ok(ident.low.length === 0, `E4 all text meets WCAG AA against its own background — ${tag}`, ident.low);
      const ratio = ident.sizes[ident.sizes.length - 1] / ident.sizes[0];
      ok(ratio >= 2.5, `E5 P4 type ratio ${ratio.toFixed(2)}× ≥ 2.5 — ${tag}`, ident.sizes);
      const flat = [];
      for (let i = 0; i + 2 < ident.sizes.length; i++) {
        if (ident.sizes[i + 2] - ident.sizes[i] <= 2) flat.push(ident.sizes.slice(i, i + 3));
      }
      ok(flat.length === 0, `E6 P4 no three consecutive type levels within 2 px — ${tag}`, flat);
      ok(ident.deepest <= 2, `E7 nesting ceiling: no border more than two deep — ${tag}`,
        [ident.deepest, ident.worst]);
      ok(ident.p3.completed !== null && ident.p3.completed >= ident.p3.planned,
        `E8 P3 completed (${ident.p3.completed?.toFixed(2)}) ≥ planned (${ident.p3.planned?.toFixed(2)}) — ${tag}`,
        ident.p3);
      const overBudget = ident.durations.filter((d) => d.ms > 300 || d.ease);
      ok(overBudget.length === 0, `E9 P6 motion budget (≤ 300 ms, no bare ease-in) — ${tag}`, overBudget);
      ok(errors.length === 0, `E10 no uncaught page errors — ${tag}`, errors.slice(0, 2));
      await ctx.close();
    }
  }

  // =========================================================================
  head('C — safe area and viewport units (§6.4: what Chromium can and cannot discharge)');
  // =========================================================================
  {
    const c = CONTEXTS[1];
    const { ctx, page } = await openProfile(c, 'light', REFERENCE);
    const used = await page.evaluate(() => {
      const bar = document.querySelector('.tabbar');
      const chrome = document.querySelector('.chrome');
      const app = document.querySelector('.app');
      // The declaration, as the cascade resolved it — Chromium reports every inset as 0px, so
      // the USED value is the fallback and the assertion is that the declaration is in the
      // cascade at all, not that it resolved to something.
      const decl = (el, prop) => {
        for (const sheet of document.styleSheets) {
          let rules; try { rules = sheet.cssRules; } catch { continue; }
          for (const r of rules) {
            if (!r.selectorText || !r.style) continue;
            try { if (!el.matches(r.selectorText)) continue; } catch { continue; }
            const v = r.style.getPropertyValue(prop);
            if (v && v.includes('safe-area-inset')) return v;
          }
        }
        return null;
      };
      return {
        barPadding: decl(bar, 'padding-bottom'),
        barLeft: decl(bar, 'padding-left'),
        chromeTop: decl(chrome, 'padding-top'),
        appBottom: decl(app, 'padding-bottom'),
        usedBarPadding: getComputedStyle(bar).paddingBottom,
        barTop: bar.getBoundingClientRect().top,
        vh: innerHeight,
      };
    });
    note('safe-area declarations: ' + JSON.stringify(used));
    ok(/env\(safe-area-inset-bottom/.test(used.barPadding ?? ''),
      'C1 the bottom bar\'s padding-bottom resolves through env(safe-area-inset-bottom)');
    ok(/env\(safe-area-inset-left/.test(used.barLeft ?? ''), 'C1b ... and the landscape cutout too');
    ok(/env\(safe-area-inset-top/.test(used.chromeTop ?? ''), 'C1c the chrome pads for the notch');
    ok(/env\(safe-area-inset-bottom/.test(used.appBottom ?? ''),
      'C1d the page reserves the bar height PLUS the inset, so the last row is reachable');
    ok(used.usedBarPadding === '0px', 'C1e (Chromium reports the inset as 0px — §6.4, not a pass for iOS)');

    // §6.4 option 2: force the inset non-zero and assert the layout is still correct. This is
    // NOT a claim about iOS Safari; it is a claim that the arithmetic around the inset is right.
    await page.addStyleTag({
      content: ':root { --forced-inset: 34px } .tabbar { padding-bottom: 34px } ' +
        '.app { padding-bottom: calc(var(--tabbar-h) + 34px) }',
    });
    await page.waitForTimeout(120);
    const forced = await page.evaluate(async () => {
      window.scrollTo(0, document.scrollingElement.scrollHeight);
      await new Promise((r) => requestAnimationFrame(r));
      const bar = document.querySelector('.tabbar').getBoundingClientRect();
      const rows = [...document.querySelectorAll('.crow__head')];
      const last = rows[rows.length - 1].getBoundingClientRect();
      const gapBlock = document.querySelector('[data-testid="profile-gap"]').getBoundingClientRect();
      return {
        barHeight: Math.round(bar.height),
        lastRowBottom: Math.round(last.bottom),
        gapBottom: Math.round(gapBlock.bottom),
        barTop: Math.round(bar.top),
        overflow: document.scrollingElement.scrollWidth - innerWidth,
      };
    });
    note('with a forced 34 px inset: ' + JSON.stringify(forced));
    ok(forced.gapBottom <= forced.barTop + 1,
      'C2 with the inset forced to 34 px, the last content still clears the bar', forced);
    ok(forced.overflow <= 1, 'C3 ... and nothing overflows sideways', forced.overflow);
    await ctx.close();
  }

  // =========================================================================
  head('F — driven interaction');
  // =========================================================================
  {
    // F1–F3: the row expansion, under a real tap and under the keyboard.
    const { ctx, page, errors } = await openProfile(CONTEXTS[1], 'light', REFERENCE);
    await page.waitForSelector('.crow__head');
    const rowSel = '.crow[data-code="AT"] .crow__head';
    const before = await page.evaluate(() => scrollY);
    ok(await page.getAttribute(rowSel, 'aria-expanded') === 'false', 'F1a the row starts collapsed');
    await page.tap(rowSel);
    await page.waitForTimeout(260);
    const opened = await page.evaluate(() => {
      const panel = document.querySelector('.crow[data-code="AT"] .crow__trips');
      return {
        expanded: document.querySelector('.crow[data-code="AT"] .crow__head').getAttribute('aria-expanded'),
        h: Math.round(panel.getBoundingClientRect().height),
        vis: getComputedStyle(panel).visibility,
        trips: panel.querySelectorAll('.triprow').length,
        scroll: scrollY,
      };
    });
    ok(opened.expanded === 'true', 'F1b a tap expands the row', opened);
    ok(opened.h > 20 && opened.vis === 'visible' && opened.trips >= 1,
      'F1c ... and its trips are actually on screen', opened);
    ok(Math.abs(opened.scroll - before) < 2, 'F1d ... and the page did not jump', [before, opened.scroll]);
    await page.tap(rowSel);
    await page.waitForTimeout(260);
    ok(await page.getAttribute(rowSel, 'aria-expanded') === 'false', 'F2 a second tap collapses it');
    await page.focus(rowSel);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(260);
    ok(await page.getAttribute(rowSel, 'aria-expanded') === 'true', 'F3 Enter does the same thing');

    // F4: reduced motion turns the one animation off entirely.
    await ctx.close();
    const reduced = await browser.newContext({ ...CONTEXTS[1].opts, reducedMotion: 'reduce' });
    const rp = await reduced.newPage();
    await rp.route('**tile.openstreetmap.org/**', (r) => r.abort());
    await rp.goto(URL, { waitUntil: 'domcontentloaded' });
    await rp.waitForSelector('.tabbar');
    await plantRows(rp, REFERENCE);
    await rp.reload({ waitUntil: 'domcontentloaded' });
    await rp.getByRole('tab', { name: 'Profile' }).click();
    // `.crow__trips` is `visibility: hidden` while collapsed, so it is never "visible" to
    // Playwright — waiting on the row's own head is the state this section is about.
    await rp.waitForSelector('.crow__head');
    const rm = await rp.evaluate(() => [...document.querySelectorAll('#tabpanel-profile .profile *')]
      .flatMap((el) => {
        const cs = getComputedStyle(el);
        return (cs.transitionDuration + ',' + cs.animationDuration).split(',').map((s) => s.trim());
      })
      .filter((s) => s && s !== '0s'));
    ok(rm.length === 0, 'F4 under prefers-reduced-motion every duration resolves to 0s', rm.slice(0, 6));
    await reduced.close();

    // F5: the arrow keys move between tabs; Home/End go to the ends.
    const { ctx: kc, page: kp } = await openProfile(CONTEXTS[3], 'light', REFERENCE, { tab: null });
    await kp.focus('#tabbtn-trips');
    await kp.keyboard.press('ArrowRight');
    ok(await kp.evaluate(() => document.activeElement.id) === 'tabbtn-map', 'F5a ArrowRight moves to the next tab');
    await kp.keyboard.press('End');
    ok(await kp.evaluate(() => document.activeElement.id) === 'tabbtn-profile', 'F5b End goes to the last tab');
    await kp.keyboard.press('ArrowRight');
    ok(await kp.evaluate(() => document.activeElement.id) === 'tabbtn-trips', 'F5c ... and the arrows wrap');
    await kp.keyboard.press('Home');
    ok(await kp.evaluate(() => document.activeElement.id) === 'tabbtn-trips', 'F5d Home goes to the first tab');
    ok(await kp.evaluate(() => document.querySelectorAll('[role="tab"][aria-selected="true"]').length) === 1,
      'F5e exactly one tab is selected throughout');

    // F6: all three panels render, nothing throws, and the world map's viewBox survives being
    // hidden — the shipped hidden-container assertion, re-run because Profile adds a third panel.
    await kp.getByRole('tab', { name: 'Map' }).click();
    await kp.waitForSelector('#tabpanel-map .worldmap__panes');
    const vb1 = await kp.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__svg')]
      .map((s) => s.getAttribute('viewBox')));
    await kp.getByRole('tab', { name: 'Profile' }).click();
    await kp.waitForTimeout(150);
    await kp.getByRole('tab', { name: 'Trips' }).click();
    await kp.waitForTimeout(150);
    await kp.getByRole('tab', { name: 'Map' }).click();
    await kp.waitForTimeout(200);
    const vb2 = await kp.evaluate(() => [...document.querySelectorAll('#tabpanel-map .worldmap__svg')]
      .map((s) => s.getAttribute('viewBox')));
    ok(vb1.length > 0 && JSON.stringify(vb1) === JSON.stringify(vb2),
      'F6 cycling all three tabs leaves the world map\'s viewBox identical', [vb1, vb2]);
    ok(errors.length === 0, 'F6b no uncaught page errors while cycling', errors.slice(0, 2));
    await kc.close();
  }

  /*
   * **F11 — expanding one country moves no OTHER country.** QA R41-8, and P6's last clause:
   * *"nothing changes layout of other content unless it is the thing the user just opened."*
   * `columns: 2` re-flows the whole list on any height change, so opening `AT` threw an
   * unrelated country ~314 px across the gutter. Driven at the two contexts where the record is
   * two columns, and it is the assertion fault 8 below has to be able to turn red.
   */
  for (const ci of [3, 4]) {
    const c = CONTEXTS[ci];
    const { ctx, page } = await openProfile(c, 'light', REFERENCE);
    await page.waitForSelector('.crow__head');
    const at = (sel) => page.evaluate((s) => Object.fromEntries(
      [...document.querySelectorAll(s)].map((el) => {
        const r = el.getBoundingClientRect();
        return [el.dataset.code, Math.round(r.left) + ',' + Math.round(r.top + scrollY)];
      })), sel);
    const before = await at('.crow');
    await page.click('.crow[data-code="AT"] .crow__head');
    await page.waitForTimeout(300);
    const after = await at('.crow');
    const moved = Object.keys(before)
      .filter((k) => k !== 'AT' && before[k].split(',')[0] !== after[k].split(',')[0])
      .map((k) => [k, before[k], after[k]]);
    ok(moved.length === 0,
      `F11 expanding one country moves no other country between columns — ${c.name}`, moved);
    await ctx.close();
  }

  /*
   * **F12 — the refusal equivalence criterion.** `DESIGN.md` revision 2 §5.5's ruling on R41-14:
   * §5.6's zero-line fence on `WorldMap.tsx` wins, §5.5 *"yields its mechanism and keeps its
   * words"*, and while the duplication exists the two surfaces are held equal by a **rendered**
   * assertion over **both** refusal branches — not by a source-substring check, which R41-13
   * mutation-tested green against an added sentence and an inverted `rowId` conditional.
   *
   * Compared: the `.banner--error` subtree's normalised text content, on Map and on Profile, in
   * the same session and from the same planted library. The subtree only — §5.5 is explicit that
   * the two surfaces' own `<h1>`s differ by design — and the map's banner is found by class
   * because it carries no test id and **may not be given one**: that would be a `WorldMap.tsx`
   * diff, which is the fence this criterion exists underneath.
   */
  for (const [branch, rows] of [['rowId non-null (duplicate summary id)', REFUSED],
    ['rowId null (malformed stored date)', REFUSED_NO_ROW]]) {
    const { ctx, page, errors } = await openProfile(CONTEXTS[1], 'light', rows, { tab: null });
    const bannerText = async (tab, panel) => {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForSelector(`${panel} .banner--error`, { timeout: 4000 });
      return page.evaluate(([fn, p]) => new Function('sel', `return (${fn})(sel)`)(`${p} .banner--error`),
        [PAINTED_TEXT.toString(), panel]);
    };
    const mapText = await bannerText('Map', '#tabpanel-map');
    const profileText = await bannerText('Profile', '#tabpanel-profile');
    ok(mapText.length > 0 && mapText === profileText,
      `F12 Map and Profile refuse in identical words — ${branch}`, [mapText, profileText]);
    // …and the branch really is the one this case is for, so neither run is silently the other.
    const named = /The stored record for trip /.test(profileText);
    ok(named === /non-null/.test(branch),
      `F12b ... and it is the ${/non-null/.test(branch) ? 'named-row' : 'generic'} sentence`, profileText);
    ok(errors.length === 0, `F12c ... with no page error on either tab — ${branch}`, errors.slice(0, 2));
    await ctx.close();
  }

  // =========================================================================
  head('F7–F10 — the refusal, empty, provisional and rescan paths, driven');
  // =========================================================================
  {
    // F7: refusal. The Profile refuses in the same words as the map, names the row, and the
    // OTHER TWO TABS STILL WORK — which is what the per-tab error boundary is for.
    const { ctx, page } = await openProfile(CONTEXTS[1], 'light', REFUSED);
    const text = await page.locator('#tabpanel-profile').innerText();
    ok(/could not read your travel history/i.test(text), 'F7a the Profile refuses in words', text.slice(0, 160));
    ok(/dup/.test(text), 'F7b ... and names the offending row id', text.slice(0, 200));
    ok(!/could not be shown/i.test(text), 'F7c ... through the surface, not through the error boundary');
    ok(await page.locator('#tabpanel-profile .crow').count() === 0, 'F7d ... and draws no record it cannot justify');
    await page.getByRole('tab', { name: 'Trips' }).click();
    await page.waitForTimeout(200);
    ok(await page.locator('#tabpanel-trips .tripcard').count() === 2,
      'F7e the Trips tab still works with an unreadable aggregate');
    await ctx.close();

    // F8: empty. Zeroes, not placeholders, and the two ways forward.
    const { ctx: ec, page: ep } = await openProfile(CONTEXTS[1], 'light', []);
    const etext = await ep.locator('#tabpanel-profile').innerText();
    ok(await ep.locator('#tabpanel-profile .crow').count() === 0, 'F8a an empty library renders zero country rows');
    ok(/\b0\b/.test(etext), 'F8b the claim prints zeroes rather than placeholders', etext.slice(0, 200));
    ok(/record a past trip/i.test(etext) && /open one you have already taken/i.test(etext),
      'F8c ... and names the two ways to fill it', etext.slice(0, 300));
    ok(!/coming soon|placeholder/i.test(etext), 'F8d ... with nothing promised that does not exist');
    ok(/no places yet/i.test(etext), 'F8e "no places yet" is distinguishable from "everything attributed"',
      etext.slice(0, 400));
    await ec.close();

    // F9: provisional — I-8b's inherited criterion, on the Profile, with the map asserted in the
    // same pass. One completed trip to AT, one active trip to AT + GB.
    const { ctx: pc, page: pp } = await openProfile(CONTEXTS[1], 'light', PROVISIONAL);
    await pp.waitForSelector('.crow');
    const prov = await pp.evaluate(() => {
      const of = (code) => {
        const li = document.querySelector(`.crow[data-code="${code}"]`);
        if (!li) return null;
        const cs = getComputedStyle(li);
        return {
          flag: li.getAttribute('data-provisional'),
          borderLeft: `${cs.borderLeftStyle} ${cs.borderLeftWidth} ${cs.borderLeftColor}`,
          // RENDERED, not merely present: `display: none` leaves the node in the DOM, and
          // "renders differently" is a claim about paint. Section H's fault 5 hides the mark
          // exactly that way, so a presence check would let the fault stay green.
          mark: (li.querySelector('[data-testid="profile-provisional"]')?.getClientRects().length ?? 0) > 0,
          markText: li.querySelector('[data-testid="profile-provisional"]')?.textContent ?? null,
          // P5: provisional may NEVER be the confirmed ink at lower strength.
          codeColour: getComputedStyle(li.querySelector('.crow__code')).color,
          opacity: cs.opacity,
        };
      };
      return { AT: of('AT'), GB: of('GB') };
    });
    note('provisional treatment: ' + JSON.stringify(prov));
    ok(prov.AT && prov.GB, 'F9a both countries are on the record');
    ok(prov.AT.flag === 'false' && prov.GB.flag === 'true', 'F9b AT is confirmed and GB is provisional', prov);
    ok(prov.GB.borderLeft !== prov.AT.borderLeft && prov.GB.mark && !prov.AT.mark,
      'F9c a provisional row renders DIFFERENTLY from a confirmed one', prov);
    ok(prov.GB.codeColour === prov.AT.codeColour && prov.GB.opacity === prov.AT.opacity,
      'F9d ... by a different treatment, not by lower ink (P5 channel 3)', prov);
    await pp.getByRole('tab', { name: 'Map' }).click();
    await pp.waitForSelector('#tabpanel-map path[data-code]');
    const mapProv = await pp.evaluate(() => {
      const f = (c) => {
        const p = document.querySelector(`#tabpanel-map path[data-code="${c}"]`);
        return p ? [p.getAttribute('data-provisional'), getComputedStyle(p).fill] : null;
      };
      return { AT: f('AT'), GB: f('GB') };
    });
    ok(mapProv.AT && mapProv.GB && mapProv.AT[1] !== mapProv.GB[1],
      'F9e ... and the map says the same thing in the same pass', mapProv);
    await pc.close();

    // F10: the I-6 rescan indicator, on screen and not merely in state.
    const { ctx: sc, page: sp } = await openProfile(CONTEXTS[1], 'light', STALE);
    const stext = await sp.locator('#tabpanel-profile').innerText();
    const phase = await sp.getAttribute('#tabpanel-profile .profile', 'data-scan');
    note(`rescan phase on the Profile: ${phase}`);
    ok(phase !== null, 'F10a the Profile publishes the rescan phase it read');
    ok(/recomputing|not up to date/i.test(stext) || phase === 'complete',
      'F10b a stale library says so on the Profile, in words', stext.slice(0, 300));
    await sc.close();
  }

  // =========================================================================
  head('G — the map gesture ceiling (§6.3)');
  // =========================================================================
  {
    const { ctx, page } = await openProfile(CONTEXTS[1], 'light', REFERENCE, { tab: 'Map' });
    await page.waitForSelector('#tabpanel-map path[data-code]');
    const g = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('#tabpanel-map .worldmap__figure, #tabpanel-map .worldmap__svg, #tabpanel-map path[data-code]')) {
        const ta = getComputedStyle(el).touchAction;
        if (ta === 'none' || ta === 'pinch-zoom') bad.push([el.tagName, ta]);
      }
      return bad;
    });
    ok(g.length === 0, 'G1 no element in the map subtree sets touch-action: none', g);
    await ctx.close();
  }
}

// =========================================================================
head('H — the injected faults, rendered. Expected colour: RED');
// =========================================================================
/**
 * Each fault is applied as a stylesheet on top of the shipped build, so the matrix costs one
 * page load per fault instead of one `vite build`. `check` returns the boolean the criterion
 * asserts; the fault is load-bearing when it returns **false**.
 */
const FAULTS = [
  {
    name: '1. touch targets — `.icon`\'s 26 × 26 hit area is restored',
    css: '.icon::after { content: none !important }',
    // ROADMAP I-8b: red at the three touch contexts, GREEN at the two desktop ones — which is
    // what proves the probe measures the touch matrix and not the page.
    contexts: [0, 1, 2, 3, 4],
    expectRed: [true, true, true, false, false],
    tab: 'Trips',
    setup: async (page) => {
      const load = page.getByRole('button', { name: /Load Europe 2026/i });
      if (await load.count()) { await load.click(); await page.waitForTimeout(900); }
      await page.waitForSelector('.icon');
    },
    check: (page, want) => page.evaluate((w) => {
      const K = window.__cairn;
      const els = [...document.querySelectorAll('.icon:not(.icon--select)')]
        .filter((el) => el.getBoundingClientRect().height > 0);
      return els.length > 0 && els.every((el) => K.hits(el, w));
    }, want),
  },
  {
    name: '2. motion budget — the row expansion becomes a 600 ms bounce',
    css: '.crow__trips { transition: grid-template-rows 600ms cubic-bezier(.68,-.55,.27,1.55) !important }',
    contexts: [1],
    expectRed: [true],
    check: (page) => page.evaluate(() => [...document.querySelectorAll('#tabpanel-profile .profile *')]
      .flatMap((el) => getComputedStyle(el).transitionDuration.split(','))
      .map((s) => s.trim())
      .filter((s) => s && s !== '0s')
      .every((s) => (s.endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000) <= 300)),
  },
  {
    name: '3. P3 — `.chip--life-completed` drops to `--ink-faint`',
    css: '.chip--life-completed { color: var(--ink-faint) !important }',
    contexts: [1],
    expectRed: [true],
    check: (page) => page.evaluate(() => {
      const K = window.__cairn;
      return K.contrast(document.querySelector('.chip--life-completed'))
        >= K.contrast(document.querySelector('.chip--life-planned'));
    }),
  },
  {
    name: '4. wide adds no layout — a third column appears at ≥ 1600',
    css: '@media (min-width: 1600px) { .profile__body { grid-template-columns: minmax(0,1fr) 14rem 14rem } }',
    contexts: [4],
    expectRed: [true],
    // The criterion compares against 1280; here it is expressed locally as *"the record column is
    // the same fraction of the container at 1600 as the stylesheet gives it at 1280"*.
    check: (page) => page.evaluate(() => {
      const body = document.querySelector('.profile__body');
      return getComputedStyle(body).gridTemplateColumns.split(' ').length <= 2;
    }),
  },
  {
    name: '5. provisional — a provisional row renders identically to a confirmed one',
    css: '.crow--provisional { border-left: 0 !important; padding-left: 0 !important } ' +
      '.crow__prov { display: none !important }',
    contexts: [1],
    expectRed: [true],
    rows: PROVISIONAL,
    check: (page) => page.evaluate(() => {
      const of = (c) => {
        const li = document.querySelector(`.crow[data-code="${c}"]`);
        const cs = getComputedStyle(li);
        const mark = li.querySelector('[data-testid="profile-provisional"]');
        return [cs.borderLeftStyle, cs.borderLeftWidth, cs.paddingLeft,
          (mark?.getClientRects().length ?? 0) > 0].join('|');
      };
      return of('AT') !== of('GB');
    }),
  },
  /*
   * **6 — the standing vacuity control for §6.2's FIRST assertion** (QA R41-1). This is the
   * fault that was missing: A1 as originally written compared `scrollWidth` against
   * `innerWidth`, and under a device profile Chromium widens the layout viewport to absorb
   * overflow, so both grew together and the assertion could not fail at iPhone SE, iPhone 14 or
   * iPad Mini — three of the five contexts §6.1 exists for. A 2,400 px box is not a subtle
   * fault; the point is that the criterion has to be able to see even this one. It runs at
   * **all five contexts and is red at all five**, which is the property the old form lacked.
   */
  {
    name: '6. no horizontal overflow — a deliberate 2,400 px box is injected into the Profile',
    css: '#tabpanel-profile .profile::after { content: ""; display: block; width: 2400px; height: 4px; background: red }',
    contexts: [0, 1, 2, 3, 4],
    expectRed: [true, true, true, true, true],
    check: (page, want, c) => page.evaluate((declaredWidth) => {
      const vw = Math.min(
        document.scrollingElement.clientWidth,
        visualViewport ? visualViewport.width : Infinity,
        declaredWidth,
      );
      return document.scrollingElement.scrollWidth <= vw + 1;
    }, c.w),
  },
  /*
   * **7 — the clipping criterion's HORIZONTAL axis** (QA R41-2). `.crow__clip` is clipping on
   * purpose vertically; the exemption was written for both axes, so it also forgave the
   * horizontal clip that sliced the `Past trip` chip to `PAST TRI` at 1280 and 1600. This
   * restores the card box and the non-wrapping row that put a 299 px min-content floor under a
   * 270 px column, and the narrowed exemption has to see it.
   */
  {
    name: '7. no clipping (x) — the trip row goes back to a non-wrapping card inside a 270 px column',
    css: '.crow__triplist .triprow { flex-wrap: nowrap !important; border: var(--rule) !important;'
      + ' border-radius: var(--radius) !important; background: var(--card) !important }'
      + ' .crow__triplist .triprow__open { padding-left: .7rem !important; padding-right: .7rem !important }'
      + ' .crow__triplist .chip--life { margin-right: .6rem !important }',
    contexts: [3, 4],
    expectRed: [true, true],
    check: (page) => page.evaluate(() => [...document.querySelectorAll('.crow__clip')]
      .every((el) => el.scrollWidth <= el.clientWidth + 1)),
  },
  /*
   * **8 — the two-column record does not rebalance** (QA R41-8). Puts CSS multi-column back
   * over the grid of lists; F11's assertion has to turn red.
   */
  {
    name: '8. the record rebalances — `columns: 2` is put back over the grid of lists',
    css: '.crcols { display: block !important; columns: 2 !important; column-gap: 2.75rem !important }'
      + ' .crcols .crlist { border-bottom: 0 !important }',
    contexts: [3],
    expectRed: [true],
    check: async (page) => {
      const at = () => page.evaluate(() => Object.fromEntries(
        [...document.querySelectorAll('.crow')].map((el) => {
          const r = el.getBoundingClientRect();
          return [el.dataset.code, Math.round(r.left)];
        })));
      const before = await at();
      await page.click('.crow[data-code="AT"] .crow__head');
      await page.waitForTimeout(300);
      const after = await at();
      return Object.keys(before).every((k) => k === 'AT' || before[k] === after[k]);
    },
  },
  /*
   * **9 — the claim's separator goes back to trailing the pair before it** (QA R41-5). `order`
   * is the whole mechanism, so inverting it is the whole fault.
   */
  {
    name: '9. a `·` trails its pair again and dangles at the end of a wrapped line',
    css: '.claim__sep { order: 99 !important }',
    contexts: [0, 1],
    expectRed: [true, true],
    check: (page) => page.evaluate(() => {
      const items = [...document.querySelectorAll('#tabpanel-profile .claim__pair > *')]
        .map((el) => { const r = el.getBoundingClientRect(); return { el, top: r.top, l: r.left, r: r.right }; });
      return items.filter((s) => s.el.classList.contains('claim__sep'))
        .every((s) => items.some((o) => o !== s && Math.abs(o.top - s.top) < 4 && o.l >= s.r - 1));
    }),
  },
  /*
   * **10 — one long city name widens the document** (QA R41-3, the MAJOR). Free text off an
   * imported row, and without `overflow-wrap: anywhere` a single unbreakable token widens the
   * LAYOUT viewport, which the `position: fixed` bar then sizes itself to. Red at the two phone
   * contexts, which is where the bar is fixed and where the Profile tab left the screen.
   */
  {
    name: '10. no horizontal overflow — `.crow__cities` stops wrapping a 58-character city name',
    css: '.crow__cities { overflow-wrap: normal !important; word-break: normal !important }',
    contexts: [0, 1],
    expectRed: [true, true],
    rows: LONGCITY,
    check: (page, want, c) => page.evaluate((declaredWidth) => {
      const vw = Math.min(
        document.scrollingElement.clientWidth,
        visualViewport ? visualViewport.width : Infinity,
        declaredWidth,
      );
      const bar = document.querySelector('.tabbar').getBoundingClientRect();
      return document.scrollingElement.scrollWidth <= vw + 1 && bar.right <= vw + 1;
    }, c.w),
  },
  /*
   * **11 — the two refusals drift apart on screen** (`DESIGN.md` rev 2 §6.2's equivalence
   * criterion, the one R41-14's ruling put in place of the source allow-list). The *source*
   * faults are `qa/r41-refusal-drift.sh`'s three, which the ruling names as this criterion's
   * fault harness; this is the **rendered** half, and it is the case that harness cannot reach:
   * one surface's banner gains a sentence at paint time. F12 has to see it.
   */
  {
    name: '11. refusal equivalence — the Profile\'s banner gains a sentence the map has not got',
    css: '#tabpanel-profile .banner--error p.hint:first-of-type::after'
      + ' { content: " Your other trips are unaffected." }',
    contexts: [1],
    expectRed: [true],
    rows: REFUSED,
    tab: null,
    check: async (page) => {
      const read = async (tab, panel) => {
        await page.getByRole('tab', { name: tab }).click();
        await page.waitForSelector(`${panel} .banner--error`, { timeout: 4000 });
        return page.evaluate(([fn, p]) => new Function('sel', `return (${fn})(sel)`)(`${p} .banner--error`),
          [PAINTED_TEXT.toString(), panel]);
      };
      return (await read('Map', '#tabpanel-map')) === (await read('Profile', '#tabpanel-profile'));
    },
  },
];

for (const f of FAULTS) {
  for (let i = 0; i < f.contexts.length; i++) {
    const c = CONTEXTS[f.contexts[i]];
    const wantRed = f.expectRed[i];
    const want = c.touch ? 44 : 24;
    const { ctx, page } = await openProfile(c, 'light', f.rows ?? REFERENCE, {
      faultCss: f.css, tab: f.tab ?? 'Profile',
    });
    await page.evaluate(KIT);
    if (f.setup) await f.setup(page);
    await page.evaluate(KIT);
    const green = await f.check(page, want, c);
    const colour = green ? 'GREEN' : 'RED';
    const expected = wantRed ? 'RED' : 'GREEN';
    if (colour === expected) {
      console.log(`  ${colour.padEnd(5)} (expected)   ${f.name}   @ ${c.name}`);
    } else {
      mismatches++;
      console.log(`  ${colour.padEnd(5)} (MISMATCH)   ${f.name}   @ ${c.name} — expected ${expected}`);
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${fails} FAIL, ${mismatches} MISMATCH\n`);
process.exit(fails + mismatches > 0 ? 1 : 0);
