/**
 * QA round 34 — the rendered half of I-8c, in Chromium. The gaps the builder named as
 * unverified, plus the branch it explicitly did not drive.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r34-render.mjs
 *
 *   A  BLD-3's OTHER branch: a trip open, TripView forced to throw, "Close this trip"
 *   B  BLD-3 "Try again" in the doc-open context
 *   C  dark mode (prefers-color-scheme: dark) for the unreadable chip and the error banner
 *   D  reduced motion, and a 360 px viewport, for both
 *   E  TripView's own LifecycleChip, driven
 *   F  A-45's residue in the real app: a stored document that no longer parses
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';

const { chromium } = pw;
const URL_ = process.env.CAIRN_URL ?? 'http://localhost:4173/';
let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const browser = await chromium.launch();

const row = (id, startDate, endDate, countryCodes) => ({
  id, title: id, startDate, endDate, datePrecision: 'exact',
  cityCount: 1, dayCount: 3, stopCount: 0, poolCount: 0, revision: 1,
  countryCodes, cities: [],
  attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
  summaryVersion: core.SUMMARY_VERSION,
});

const plant = (page, rows, docs = []) =>
  page.evaluate(async ({ rows, docs }) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const names = [...db.objectStoreNames];
    await new Promise((res, rej) => {
      const stores = ['summaries', ...(docs.length ? names.filter((n) => n !== 'summaries') : [])];
      const tx = db.transaction(stores, 'readwrite');
      for (const row of rows) tx.objectStore('summaries').put(row, row.id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
    return names;
  }, { rows, docs });

async function fresh({ dark = false, reduced = false, width = 1280, height = 900 } = {}) {
  const ctx = await browser.newContext({
    colorScheme: dark ? 'dark' : 'light',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    viewport: { width, height },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  return { ctx, page, errors };
}

async function openSample(page) {
  await page.getByRole('button', { name: /Load Europe 2026/i }).click();
  await page.waitForSelector('[data-testid="trip-range"]', { timeout: 10000 });
}

// ===========================================================================
head('A — BLD-3 with a document OPEN: the "Close this trip" branch');
{
  const { ctx, page, errors } = await fresh();
  await openSample(page);
  ok(await page.locator('[data-testid="trip-range"]').count() === 1, 'the sample trip is open');

  // Force a render failure INSIDE TripView, from outside the app's own state, so that
  // "the cause is gone" and "the banner cleared" stay two facts. TripView renders
  // `PANELS.map(...)`; arm Array.prototype.map for the panel-id marker only.
  const armed = await page.evaluate(() => {
    const orig = Array.prototype.map;
    window.__cairnDisarm = () => { Array.prototype.map = orig; };
    Array.prototype.map = function map(fn, thisArg) {
      if (Array.isArray(this) && this.some((x) => x && x.key === 'conflicts')) {
        throw new Error('r34 probe: forced TripView render failure');
      }
      return orig.call(this, fn, thisArg);
    };
    return true;
  });
  ok(armed, 'the fault is armed');
  // Bounce tabs to force a re-render of the Trips panel.
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(150);
  await page.getByRole('tab', { name: 'Trips' }).click();
  await page.waitForTimeout(400);

  const down = await page.locator('#tabpanel-trips').innerText();
  ok(/could not be shown/i.test(down), 'the boundary caught it', down.slice(0, 160));
  note('banner text: ' + JSON.stringify(down.slice(0, 260)));
  ok(/close this trip/i.test(down), 'the shell offers "Close this trip", not "Reload Cairn"', down.slice(0, 200));
  ok(!/reload cairn/i.test(down), 'and does NOT offer the no-document recovery', down.slice(0, 200));

  // Drive the branch the builder did not.
  await page.getByRole('button', { name: 'Close this trip' }).click();
  await page.waitForTimeout(800);
  const after = await page.locator('#tabpanel-trips').innerText();
  note('after "Close this trip": ' + JSON.stringify(after.slice(0, 220)));
  const stillDown = /could not be shown/i.test(after);
  ok(!stillDown, 'the banner is gone after "Close this trip"', after.slice(0, 200));
  const docClosed = await page.locator('[data-testid="trip-range"]').count() === 0;
  ok(docClosed, 'the document is actually closed');
  const libraryBack = await page.locator('.tripcard').count() > 0;
  ok(libraryBack, 'the library renders — the user has a working state again',
     { cards: await page.locator('.tripcard').count(), text: after.slice(0, 160) });

  // ---- root cause, if it did not recover -------------------------------------------------
  // Hypothesis: `App.tsx`'s recovery.run() fires the ASYNC `store.closeTrip()` and
  // `TabBoundary` clears `message` synchronously in the same click. React re-renders the
  // children immediately, `state.doc` is still the open trip (the promise has not settled),
  // TripView throws again, `getDerivedStateFromError` re-latches — and when `closeTrip`
  // finally lands there is nothing left to clear `message`.
  if (stillDown) {
    note('ROOT-CAUSE DRILL');
    // 1. The recovery's own effect DID happen (the offer flipped to the no-document one).
    ok(/reload cairn/i.test(after),
       'r/c 1: the shell now offers "Reload Cairn", so closeTrip() DID land — only the banner is stale',
       after.slice(0, 160));
    // 2. A second, unassisted click on "Try again" recovers with no further user knowledge.
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.waitForTimeout(500);
    const twice = await page.locator('#tabpanel-trips').innerText();
    const cards = await page.locator('.tripcard').count();
    note('after a SECOND click ("Try again"): ' + JSON.stringify(twice.slice(0, 120)) + ' cards=' + cards);
    ok(!/could not be shown/i.test(twice) && cards > 0,
       'r/c 2: one extra click recovers — so the fault is ORDERING, not the recovery itself', { twice: twice.slice(0, 120), cards });
    // 3. And the Library never touches the armed fault, so the re-latch cannot be the Library.
    ok(cards > 0, 'r/c 3: the Library renders fine while the fault is still armed — it was TripView re-throwing', cards);
  }

  // Is the cause still armed? If so, the library must still be fine (Library does not hit it).
  const stillArmed = await page.evaluate(() => Array.prototype.map.name === 'map' && !!window.__cairnDisarm);
  note('fault still armed: ' + stillArmed);
  await page.evaluate(() => window.__cairnDisarm());
  await ctx.close();
  note('page errors: ' + JSON.stringify(errors.slice(0, 3)));
}

// ===========================================================================
head('B — "Try again" in the document-open context');
{
  const { ctx, page, errors } = await fresh();
  await openSample(page);
  await page.evaluate(() => {
    let on = true;
    const orig = Array.prototype.map;
    window.__cairnDisarm = () => { on = false; };
    Array.prototype.map = function map(fn, thisArg) {
      if (on && Array.isArray(this) && this.some((x) => x && x.key === 'conflicts')) {
        throw new Error('r34 probe: forced TripView render failure');
      }
      return orig.call(this, fn, thisArg);
    };
  });
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(120);
  await page.getByRole('tab', { name: 'Trips' }).click();
  await page.waitForTimeout(300);
  ok(/could not be shown/i.test(await page.locator('#tabpanel-trips').innerText()), 'boundary is up');

  // 1. Try again with the cause still there: the banner must come back (honest, not sticky).
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForTimeout(300);
  ok(/could not be shown/i.test(await page.locator('#tabpanel-trips').innerText()),
     'Try again with the cause still present re-raises rather than clearing');

  // 2. Remove the cause, Try again: must recover WITH the trip still open.
  await page.evaluate(() => window.__cairnDisarm());
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForTimeout(400);
  const t = await page.locator('#tabpanel-trips').innerText();
  ok(!/could not be shown/i.test(t), 'the banner does not outlive its cause', t.slice(0, 160));
  ok(await page.locator('[data-testid="trip-range"]').count() === 1,
     'and the trip is still open — "Try again" did not close it');
  note('page errors: ' + JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// ===========================================================================
head('C — dark mode: the unreadable chip and the error banner');
{
  const rows = [row('good-1', '2019-05-01', '2019-05-08', ['HR']), row('broken', 'not-a-date', '2019-05-08', ['AT'])];
  for (const dark of [false, true]) {
    const { ctx, page } = await fresh({ dark });
    await plant(page, rows);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tabbar');
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const contrast = (a, b) => {
        const lum = (c) => {
          const nums = c.match(/[\d.]+/g).map(Number);
          const srgb = /^color\(/.test(c);
          const [r, g, bl] = nums.slice(srgb ? 0 : 0, srgb ? 3 : 3).map((v) => {
            const s = srgb ? v : v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
        };
        const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (l1 + 0.05) / (l2 + 0.05);
      };
      const bg = (el) => {
        let n = el;
        while (n) {
          const c = getComputedStyle(n).backgroundColor;
          if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
          n = n.parentElement;
        }
        return 'rgb(255, 255, 255)';
      };
      const out = { scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', chips: [] };
      out.bodyBg = getComputedStyle(document.body).backgroundColor;
      for (const el of document.querySelectorAll('[data-testid="lifecycle-chip"]')) {
        const cs = getComputedStyle(el);
        out.chips.push({
          stage: el.getAttribute('data-stage'), color: cs.color, border: cs.borderTopColor,
          behind: bg(el), contrast: +contrast(cs.color, bg(el)).toFixed(2),
          fontSize: cs.fontSize,
        });
      }
      return out;
    });
    note(`${dark ? 'DARK ' : 'LIGHT'} body=${m.bodyBg} chips=${JSON.stringify(m.chips)}`);
    const un = m.chips.find((c) => c.stage === 'unreadable');
    const good = m.chips.find((c) => c.stage !== 'unreadable');
    ok(!!un, `${dark ? 'dark' : 'light'}: the unreadable chip renders`);
    if (un) {
      ok(un.color !== good?.color, `${dark ? 'dark' : 'light'}: it is not painted like a normal stage`, [un, good]);
      ok(un.contrast >= 3.0, `${dark ? 'dark' : 'light'}: the unreadable chip clears 3:1 against its own background`, un);
    }
    // and the error banner, in the same scheme
    await page.evaluate(() => {
      const orig = Array.prototype.join;
      Array.prototype.join = function join(s) {
        if (Array.isArray(this) && this.includes('AT')) throw new Error('r34 probe: banner');
        return orig.call(this, s);
      };
    });
    await page.getByRole('tab', { name: 'Map' }).click();
    await page.waitForTimeout(120);
    await page.getByRole('tab', { name: 'Trips' }).click();
    await page.waitForTimeout(300);
    const b = await page.evaluate(() => {
      const el = document.querySelector('.banner--error');
      if (!el) return null;
      const contrast = (a, bg) => {
        const lum = (c) => {
          const nums = c.match(/[\d.]+/g).map(Number);
          const srgb = /^color\(/.test(c);
          const [r, g, bl] = nums.slice(0, 3).map((v) => {
            const s = srgb ? v : v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
        };
        const [l1, l2] = [lum(a), lum(bg)].sort((x, y) => y - x);
        return (l1 + 0.05) / (l2 + 0.05);
      };
      const cs = getComputedStyle(el);
      let n = el, back = 'rgb(255,255,255)';
      while (n) { const c = getComputedStyle(n).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)') { back = c; break; } n = n.parentElement; }
      const btns = [...el.querySelectorAll('button')].map((x) => {
        const b2 = getComputedStyle(x);
        let p = x, bk = back;
        while (p) { const c = getComputedStyle(p).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)') { bk = c; break; } p = p.parentElement; }
        const r = x.getBoundingClientRect();
        return { label: x.innerText.trim(), color: b2.color, bg: bk, contrast: +contrast(b2.color, bk).toFixed(2), w: Math.round(r.width), h: Math.round(r.height) };
      });
      return { color: cs.color, bg: back, contrast: +contrast(cs.color, back).toFixed(2), btns };
    });
    note(`${dark ? 'DARK ' : 'LIGHT'} banner=${JSON.stringify(b)}`);
    ok(!!b, `${dark ? 'dark' : 'light'}: the error banner renders`);
    if (b) {
      ok(b.contrast >= 4.5, `${dark ? 'dark' : 'light'}: banner text clears 4.5:1`, b);
      for (const bt of b.btns) ok(bt.contrast >= 4.5, `${dark ? 'dark' : 'light'}: "${bt.label}" clears 4.5:1`, bt);
    }
    await ctx.close();
  }
}

// ===========================================================================
head('D — reduced motion, and a 360 px viewport');
{
  const rows = [row('good-1', '2019-05-01', '2019-05-08', ['HR']), row('broken', 'not-a-date', '2019-05-08', ['AT'])];
  const { ctx, page } = await fresh({ reduced: true, width: 360, height: 720 });
  await plant(page, rows);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const el = document.querySelector('[data-stage="unreadable"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      rect: { x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right) },
      docW: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth,
      transition: cs.transitionDuration, animation: cs.animationDuration,
      truncated: el.scrollWidth > el.clientWidth + 1,
      text: el.innerText.trim(),
    };
  });
  note('narrow/reduced: ' + JSON.stringify(m));
  ok(!!m, 'the unreadable chip renders at 360 px');
  if (m) {
    ok(m.rect.right <= m.docW + 1, 'the chip does not overflow the viewport', m);
    ok(m.scrollW <= m.docW + 1, 'the page does not scroll horizontally at 360 px', m);
    ok(!m.truncated, 'the chip text is not clipped', m);
    ok(m.animation === '0s' || m.animation === '0s, 0s', 'no animation on the chip under reduce', m);
  }
  // the banner at 360 px
  await page.evaluate(() => {
    const orig = Array.prototype.join;
    Array.prototype.join = function join(s) {
      if (Array.isArray(this) && this.includes('AT')) throw new Error('r34 probe: banner');
      return orig.call(this, s);
    };
  });
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(120);
  await page.getByRole('tab', { name: 'Trips' }).click();
  await page.waitForTimeout(300);
  const b = await page.evaluate(() => {
    const el = document.querySelector('.banner--error');
    if (!el) return null;
    const btns = [...el.querySelectorAll('button')].map((x) => {
      const r = x.getBoundingClientRect();
      return { label: x.innerText.trim(), x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && r.height > 0 };
    });
    return { docW: document.documentElement.clientWidth, scrollW: document.documentElement.scrollWidth, btns };
  });
  note('narrow banner: ' + JSON.stringify(b));
  ok(!!b && b.btns.length === 2, 'both recovery buttons render at 360 px', b);
  if (b) {
    for (const bt of b.btns) {
      ok(bt.visible && bt.right <= b.docW + 1, `"${bt.label}" is on screen at 360 px`, bt);
      ok(bt.h >= 24, `"${bt.label}" is at least 24 px tall`, bt);
    }
    ok(b.scrollW <= b.docW + 1, 'the banner does not force horizontal scroll', b);
  }
  await ctx.close();
}

// ===========================================================================
head('E — TripView\'s own LifecycleChip, driven in the browser');
{
  const { ctx, page, errors } = await fresh();
  await openSample(page);
  const chip = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="trip-range"]')?.parentElement
      ?.querySelector('[data-testid="lifecycle-chip"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { stage: el.getAttribute('data-stage'), text: el.innerText.trim(), color: cs.color,
             range: document.querySelector('[data-testid="trip-range"]').innerText.trim(),
             title: el.getAttribute('title') };
  });
  note('TripView chip: ' + JSON.stringify(chip));
  ok(!!chip, 'TripView renders a lifecycle chip');
  ok(chip && chip.stage !== 'unreadable', 'a real Trip never reads unreadable', chip);
  ok(chip && chip.title === null, 'the chip carries no raw-range tooltip (QA P2-6)', chip);
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3));
  await ctx.close();
}

// ===========================================================================
head('F — A-45\'s residue in the real app: a stored document that no longer parses');
{
  const { ctx, page, errors } = await fresh();
  // Load the sample so a real document exists, then rewrite its stored dates to a
  // calendar-invalid pair a pre-I-8c build would have written happily.
  await openSample(page);
  await page.waitForTimeout(600);
  const stores = await page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const names = [...db.objectStoreNames];
    db.close();
    return names;
  });
  note('IndexedDB stores: ' + JSON.stringify(stores));
  const mangled = await page.evaluate(async (names) => {
    const docStore = names.find((n) => n !== 'summaries');
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const all = await new Promise((res, rej) => {
      const tx = db.transaction(docStore, 'readonly');
      const req = tx.objectStore(docStore).getAll();
      req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
    });
    const keys = await new Promise((res, rej) => {
      const tx = db.transaction(docStore, 'readonly');
      const req = tx.objectStore(docStore).getAllKeys();
      req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
    });
    if (!all.length) { db.close(); return { store: docStore, n: 0 }; }
    const rec = all[0];
    const raw = typeof rec === 'string' ? rec : rec.doc;
    if (typeof raw !== 'string') { db.close(); return { store: docStore, n: all.length, shape: Object.keys(rec) }; }
    const o = JSON.parse(raw);
    o.startDate = '2026-02-30';
    const next = typeof rec === 'string' ? JSON.stringify(o) : { ...rec, doc: JSON.stringify(o) };
    await new Promise((res, rej) => {
      const tx = db.transaction(docStore, 'readwrite');
      tx.objectStore(docStore).put(next, keys[0]);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    db.close();
    return { store: docStore, n: all.length, ok: true, id: o.id };
  }, stores);
  note('mangled: ' + JSON.stringify(mangled));
  if (mangled.ok) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tabbar');
    await page.waitForTimeout(700);
    const view = await page.evaluate(() => ({
      trips: document.querySelector('#tabpanel-trips')?.innerText ?? '',
      cards: document.querySelectorAll('.tripcard').length,
      unreadableChip: document.querySelectorAll('[data-testid="row-unreadable"]').length,
      lifecycleStages: [...document.querySelectorAll('[data-testid="lifecycle-chip"]')].map((e) => e.getAttribute('data-stage')),
      scan: document.querySelector('[data-testid="summary-scan"]')?.innerText ?? null,
    }));
    note('library after mangling: ' + JSON.stringify(view).slice(0, 400));
    ok(view.cards >= 1, 'the row is still listed');
    ok(view.unreadableChip >= 1,
       'the library WARNS that the file could not be read (A-45 Part 4\'s claimed surface)', view);
    // Click it: what does the user get?
    await page.locator('.tripcard__open').first().click();
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({
      opened: document.querySelectorAll('[data-testid="trip-range"]').length,
      banner: [...document.querySelectorAll('.banner')].map((b) => b.innerText.trim().slice(0, 160)),
      body: document.querySelector('#tabpanel-trips')?.innerText.slice(0, 200) ?? '',
    }));
    note('after clicking the row: ' + JSON.stringify(after).slice(0, 500));
    ok(after.opened === 0, 'the trip does not open (expected — A-45 refuses it)');
    note('the message the user actually gets: ' + JSON.stringify(after.banner));
    ok(after.banner.some((b) => /trip|file|could not be (read|opened)/i.test(b)),
       'the message is a sentence about the trip, not a raw parser path', after.banner);
    const exportable = await page.evaluate(() =>
      [...document.querySelectorAll('button, a[href]')]
        .map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim())
        .filter((t) => /export|download|backup|save a copy/i.test(t)));
    note('export-ish controls available: ' + JSON.stringify(exportable));
    ok(exportable.some((t) => /export|download|save a copy/i.test(t)),
       'the user can still get their data OUT of an unopenable trip', exportable);
  }
  note('page errors: ' + JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// ===========================================================================
head('G — what the rest of the unreadable CARD says, beside the chip that says it cannot');
{
  const rows = [
    { ...row('exact', 'not-a-date', '2019-05-08', ['AT']) },
    { ...row('month', 'not-a-date', '2019-05-08', ['HR']), datePrecision: 'month' },
    { ...row('year', 'not-a-date', '2019-05-08', ['CZ']), datePrecision: 'year' },
  ];
  const { ctx, page } = await fresh();
  await plant(page, rows);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.waitForTimeout(300);
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('.tripcard')].map((c) => ({
      title: c.querySelector('.tripcard__title')?.innerText.trim(),
      chip: c.querySelector('[data-testid="lifecycle-chip"]')?.getAttribute('data-stage'),
      range: c.querySelector('[data-testid="tripcard-range"]')?.innerText.trim(),
    })));
  note('cards: ' + JSON.stringify(cards));
  for (const c of cards) {
    ok(c.chip === 'unreadable', `${c.title?.split('\n')[0]}: the chip says unreadable`, c);
    ok(/^(—|not recorded|unknown|dates could not)/i.test((c.range ?? '').trim()),
       `${c.title?.split('\n')[0]}: the card's range line does not print a label derived from the unreadable string`, c);
  }
  await ctx.close();
}

// ===========================================================================
head('H — the New trip form\'s own date predicate (a 4th copy, shape-only)');
{
  const { ctx, page, errors } = await fresh();
  await page.getByRole('button', { name: 'New trip' }).click();
  await page.waitForTimeout(200);
  const inputs = await page.evaluate(() =>
    [...document.querySelectorAll('form input')].map((i) => ({ type: i.type, ph: i.placeholder, name: i.name })));
  note('New trip inputs: ' + JSON.stringify(inputs));
  const boxes = page.locator('form input');
  const n = await boxes.count();
  if (n >= 3) {
    await boxes.nth(0).fill('Impossible');
    // `type="date"` refuses a malformed value through `fill()`, so set it the way a
    // scripted/autofilled/non-Chromium path would and let React see it.
    const accepted = await page.evaluate(() => {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const ins = [...document.querySelectorAll('form input')];
      set.call(ins[1], '2026-02-30');
      ins[1].dispatchEvent(new Event('input', { bubbles: true }));
      set.call(ins[2], '2026-03-05');
      ins[2].dispatchEvent(new Event('input', { bubbles: true }));
      return { start: ins[1].value, end: ins[2].value };
    });
    note('values the input actually holds: ' + JSON.stringify(accepted));
    await page.waitForTimeout(150);
    const submit = page.locator('form button[type="submit"], form button:has-text("Create")').first();
    const enabled = await submit.count() ? await submit.isEnabled() : null;
    note('submit enabled with 2026-02-30: ' + enabled);
    ok(enabled === false,
       'the form REFUSES a calendar-invalid date at the point of entry',
       'the shape-only regex at Library.tsx:231 accepts it; createTrip then throws');
    if (enabled) {
      await submit.click();
      await page.waitForTimeout(400);
      const banner = await page.evaluate(() =>
        [...document.querySelectorAll('.banner')].map((b) => b.innerText.trim().slice(0, 200)));
      note('after submitting 2026-02-30: ' + JSON.stringify(banner));
      ok(banner.some((b) => /date/i.test(b) && !/^createTrip:/.test(b)),
         'and if it does not, the message is a user sentence rather than a thrown programmer error',
         banner);
      ok(await page.locator('.tripcard').count() === 0, 'no trip was created');
    }
  } else {
    note('could not find the form inputs; skipped');
  }
  note('page errors: ' + JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// ===========================================================================
head('I — the "Reload Cairn" recovery actually reloads');
{
  const { ctx, page } = await fresh();
  await plant(page, [row('good-1', '2019-05-01', '2019-05-08', ['ZZ'])]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.evaluate(() => {
    window.__cairnLoads = (window.__cairnLoads ?? 0);
    const orig = Array.prototype.join;
    Array.prototype.join = function join(s) {
      if (Array.isArray(this) && this.includes('ZZ')) throw new Error('r34 probe: forced render failure');
      return orig.call(this, s);
    };
  });
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(120);
  await page.getByRole('tab', { name: 'Trips' }).click();
  await page.waitForTimeout(300);
  ok(/could not be shown/i.test(await page.locator('#tabpanel-trips').innerText()), 'boundary is up');
  const navPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null);
  await page.getByRole('button', { name: 'Reload Cairn' }).click();
  const nav = await navPromise;
  ok(nav !== null, 'clicking "Reload Cairn" actually navigates (window.location.reload)');
  await page.waitForSelector('.tabbar', { timeout: 10000 });
  await page.waitForTimeout(300);
  const after = await page.locator('#tabpanel-trips').innerText();
  ok(!/could not be shown/i.test(after), 'and the app comes back up with the fault gone', after.slice(0, 120));
  ok(await page.locator('.tripcard').count() === 1, 'the library is intact after the reload');
  await ctx.close();
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
process.exit(fails === 0 ? 0 : 1);
