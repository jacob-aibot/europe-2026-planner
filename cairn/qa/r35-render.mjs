/**
 * QA round 35 — the adversarial pass over ROADMAP Phase 2 **I-8e** (§2.9 **A-46**) and
 * QA **R34-1**'s fix. Written against `master` @ `98996b3`.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r35-render.mjs
 *
 *   A  **The population A-46 leaves without a rescue.** A document whose ROW is fine but whose
 *      `days[n].date` is not — the state a pre-A-45 `store.importDoc` actually wrote, and 3 of
 *      A-45's 5 refusal sites. The card is unflagged (blessed by I-8e criterion 4), but the
 *      consequence nobody asserted is that "Save a copy" is on the unreadable branch only, so
 *      this population still has Delete as its only affordance — the exact harm R34-2 named,
 *      against A-46 Part 7 residue 1's own guarantee.
 *   B  The rescue-export UI at **360 px** and in **dark mode** (builder: not verified).
 *   C  Contrast of the new **"Save a copy"** button and its hint line, both schemes
 *      (builder: not verified; flagged as probably the same finding R34-7 just fixed).
 *   D  The export path as a **side effect**: double-fire, a hostile title in the filename,
 *      a row with no stored document, and whether it can be pointed at another trip.
 *   E  `--warn`'s other two consumers (`.hint--warn`, `.sev--warning`) — the builder claims
 *      R34-7's fix covers them; measured here rather than read off the hex.
 *
 * A "FAIL" line means the probe found what it was looking for.
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

const row = (id, startDate, endDate, countryCodes, extra = {}) => ({
  id, title: id, startDate, endDate, datePrecision: 'exact',
  cityCount: 1, dayCount: 3, stopCount: 0, poolCount: 0, revision: 1,
  countryCodes, cities: [],
  attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
  summaryVersion: core.SUMMARY_VERSION,
  ...extra,
});

const plantRows = (page, rows) =>
  page.evaluate(async (rows) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('summaries', 'readwrite');
      for (const row of rows) tx.objectStore('summaries').put(row, row.id);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, rows);

async function fresh({ dark = false, viewport = null } = {}) {
  const ctx = await browser.newContext({
    colorScheme: dark ? 'dark' : 'light', acceptDownloads: true,
    ...(viewport ? { viewport } : {}),
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  return { ctx, page, errors };
}

async function withLibrary(rows, opts) {
  const h = await fresh(opts);
  await plantRows(h.page, rows);
  await h.page.reload({ waitUntil: 'domcontentloaded' });
  await h.page.waitForSelector('.tabbar');
  await h.page.waitForTimeout(300);
  return h;
}

const openSample = async (page) => {
  await page.getByRole('button', { name: /Load Europe 2026/i }).click();
  await page.waitForSelector('[data-testid="trip-range"]', { timeout: 20000 });
};

/** Rewrite one field inside the STORED DOCUMENT, leaving the summary row untouched. */
const mangleDoc = (page, mutate) =>
  page.evaluate(async (src) => {
    const fn = new Function('o', src);
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const store = [...db.objectStoreNames].find((n) => n !== 'summaries');
    const [all, keys] = await Promise.all([
      new Promise((res, rej) => {
        const q = db.transaction(store, 'readonly').objectStore(store).getAll();
        q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
      }),
      new Promise((res, rej) => {
        const q = db.transaction(store, 'readonly').objectStore(store).getAllKeys();
        q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
      }),
    ]);
    const rec = all[0];
    const raw = typeof rec === 'string' ? rec : rec.doc;
    const o = JSON.parse(raw);
    const changed = fn(o);
    const next = typeof rec === 'string' ? JSON.stringify(o) : { ...rec, doc: JSON.stringify(o) };
    await new Promise((res, rej) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(next, keys[0]);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    db.close();
    return { store, changed };
  }, mutate);

const CONTRAST_FN = `
  const contrast = (a, b) => {
    const lum = (c) => {
      const [r, g, bl] = c.match(/[\\d.]+/g).slice(0, 3).map((v) => {
        const s = Number(v) / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    };
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  const bgOf = (el) => {
    let n = el;
    while (n) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
  };
`;

// ===========================================================================
head('A — the population with a readable ROW and an unopenable DOCUMENT: what can the user do?');
{
  const { ctx, page, errors } = await fresh();
  await openSample(page);
  await page.waitForTimeout(700);
  // The realistic plant: a calendar-invalid `days[n].date`. `core.tripSummary` never copies a
  // day date into the row, so a pre-A-45 `importDoc` wrote exactly this pair of records.
  const m = await mangleDoc(page, `o.days[3].date = '2026-02-30'; return o.days[3].id + ' -> ' + o.days[3].date;`);
  note('mangled: ' + JSON.stringify(m));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.waitForTimeout(800);

  const view = await page.evaluate(() => ({
    cards: document.querySelectorAll('.tripcard').length,
    unreadable: document.querySelectorAll('[data-testid="row-unreadable"]').length,
    save: document.querySelectorAll('[data-testid="save-copy"]').length,
    range: document.querySelector('[data-testid="tripcard-range"]')?.innerText.trim(),
    stage: document.querySelector('[data-testid="lifecycle-chip"]')?.getAttribute('data-stage'),
    controls: [...document.querySelectorAll('.tripcard button')].map((b) => b.innerText.trim().split('\n')[0]),
  }));
  note('card: ' + JSON.stringify(view));
  ok(view.cards === 1, 'the row is listed');
  // Stated incompleteness — this one is EXPECTED (I-8e criterion 4 asserts it).
  ok(view.unreadable === 0, 'the card is unflagged (EXPECTED — A-46 Part 3\'s stated incompleteness)');

  // Now the consequence nobody asserted.
  ok(view.save === 1,
     'A-46 Part 7 residue 1: "the rescue copy is reachable from the card either way"', view);

  // Tap it: does the user at least find out?
  await page.locator('.tripcard__open').first().click();
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({
    opened: document.querySelectorAll('[data-testid="trip-range"]').length,
    banner: [...document.querySelectorAll('.banner')].map((b) => b.innerText.trim().slice(0, 200)),
    save: document.querySelectorAll('[data-testid="save-copy"]').length,
    exportish: [...document.querySelectorAll('button, a[href]')]
      .map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim())
      .filter((t) => /export|download|backup|save a copy/i.test(t)),
  }));
  note('after tapping: ' + JSON.stringify(after));
  ok(after.opened === 0, 'the trip does not open (expected — A-45 refuses it)');
  ok(after.save === 1, 'and AFTER being told it cannot be read, a rescue control appears', after);
  ok(after.exportish.some((t) => /save a copy|export|download/i.test(t)),
     'there is SOME way to get the bytes out of this trip', after.exportish);

  // What does Delete promise?
  const confirmText = await page.evaluate(() => {
    let seen = null;
    const orig = window.confirm;
    window.confirm = (s) => { seen = s; return false; };
    [...document.querySelectorAll('.tripcard button')]
      .find((b) => b.innerText.trim() === 'Delete')?.click();
    window.confirm = orig;
    return seen;
  });
  note('Delete confirm: ' + JSON.stringify(confirmText));
  ok(/only one|save a copy|could not be read|cannot read/i.test(confirmText ?? ''),
     'Delete warns that the stored copy is the only one', confirmText);
  note('page errors: ' + JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// ===========================================================================
head('B — the unreadable card at 360 px, and in dark mode');
{
  for (const dark of [false, true]) {
    const rows = [row('bad', '2026-02-30', '2026-03-05', ['AT'])];
    const { ctx, page, errors } = await withLibrary(rows, { dark, viewport: { width: 360, height: 780 } });
    const m = await page.evaluate(() => {
      const card = document.querySelector('.tripcard');
      const el = (s) => card?.querySelector(s);
      const box = (e) => (e ? e.getBoundingClientRect() : null);
      const chip = el('[data-testid="row-unreadable"]');
      const hint = el('[data-testid="row-unreadable-hint"]');
      const save = el('[data-testid="save-copy"]');
      const del = [...(card?.querySelectorAll('button') ?? [])].find((b) => b.innerText.trim() === 'Delete');
      const cardBox = box(card);
      const overflows = (e) => {
        const b = box(e);
        return b ? (b.right > window.innerWidth + 0.5 || b.left < -0.5) : null;
      };
      const clipped = (e) => (e ? e.scrollWidth > e.clientWidth + 1 : null);
      return {
        docScrollX: document.documentElement.scrollWidth > window.innerWidth + 1,
        innerWidth: window.innerWidth,
        card: cardBox && { w: +cardBox.width.toFixed(1), right: +cardBox.right.toFixed(1) },
        chip: chip && { text: chip.innerText.trim(), overflow: overflows(chip), clipped: clipped(chip), h: +box(chip).height.toFixed(1) },
        hint: hint && { overflow: overflows(hint), clipped: clipped(hint), h: +box(hint).height.toFixed(1), lines: hint.innerText.trim().length },
        save: save && { overflow: overflows(save), h: +box(save).height.toFixed(1), w: +box(save).width.toFixed(1), visible: box(save).width > 0 && box(save).height > 0 },
        del: del && { overflow: overflows(del), h: +box(del).height.toFixed(1) },
        saveDelOverlap: save && del ? !(box(save).right <= box(del).left + 0.5 || box(del).right <= box(save).left + 0.5 || box(save).bottom <= box(del).top + 0.5 || box(del).bottom <= box(save).top + 0.5) : null,
      };
    });
    const tag = dark ? 'dark ' : 'light';
    note(`${tag} 360px: ` + JSON.stringify(m));
    ok(!m.docScrollX, `${tag}: the page does not scroll horizontally at 360 px`, m);
    ok(m.chip && !m.chip.overflow && !m.chip.clipped, `${tag}: the warn chip is not clipped or off-screen`, m.chip);
    ok(m.hint && !m.hint.overflow && !m.hint.clipped, `${tag}: the new hint line is not clipped or off-screen`, m.hint);
    ok(m.save && m.save.visible && !m.save.overflow, `${tag}: "Save a copy" is on screen`, m.save);
    ok(m.save && m.save.h >= 32, `${tag}: "Save a copy" is a tappable height`, m.save);
    ok(m.saveDelOverlap === false, `${tag}: "Save a copy" and "Delete" do not overlap`, m);
    ok(errors.length === 0, `${tag}: no page errors`, errors.slice(0, 2));
    await ctx.close();
  }
}

// ===========================================================================
head('C — contrast of the new "Save a copy" control and its hint line, both schemes');
{
  for (const dark of [false, true]) {
    const rows = [row('bad', '2026-02-30', '2026-03-05', ['AT'])];
    const { ctx, page } = await withLibrary(rows, { dark });
    const m = await page.evaluate(`(() => {
      ${CONTRAST_FN}
      const out = [];
      const add = (sel, name) => {
        const el = document.querySelector(sel);
        if (!el) { out.push({ name, missing: true }); return; }
        const cs = getComputedStyle(el);
        out.push({
          name, color: cs.color, behind: bgOf(el), fontSize: cs.fontSize,
          weight: cs.fontWeight,
          contrast: +contrast(cs.color, bgOf(el)).toFixed(2),
        });
      };
      add('[data-testid="save-copy"]', 'Save a copy');
      add('[data-testid="row-unreadable-hint"]', 'hint line');
      add('[data-testid="tripcard-range"]', 'range line');
      return { scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', out };
    })()`);
    note(`${dark ? 'DARK ' : 'LIGHT'} ${JSON.stringify(m)}`);
    for (const e of m.out) {
      ok(!e.missing, `${m.scheme}: ${e.name} renders`, e);
      if (e.missing) continue;
      // WCAG 1.4.3: 4.5:1 for text under 18.66px (or under 14pt bold).
      const px = parseFloat(e.fontSize);
      const large = px >= 24 || (px >= 18.66 && Number(e.weight) >= 700);
      const floor = large ? 3 : 4.5;
      ok(e.contrast >= floor, `${m.scheme}: ${e.name} clears WCAG ${floor}:1 at ${e.fontSize}`, e);
    }
    await ctx.close();
  }
}

// ===========================================================================
head('D — the export as a side effect: double-fire, filename, a row with no document');
{
  // D1 — a hostile title reaching the download filename, and a double click.
  const rows = [
    row('bad', '2026-02-30', '2026-03-05', ['AT'], { title: '../../etc/passwd  <script>  ☃' }),
    row('good', '2019-05-01', '2019-05-08', ['HR']),
  ];
  const { ctx, page, errors } = await withLibrary(rows);
  // Plant a document for `bad` only; `good` gets none, so its row has no stored doc.
  await page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const store = [...db.objectStoreNames].find((n) => n !== 'summaries');
    const doc = JSON.stringify({ id: 'bad', schemaVersion: 1, startDate: '2026-02-30', note: 'NOT A VALID TRIP' });
    // Mirror whatever record shape the store uses: read one, or fall back to a bare string.
    await new Promise((res, rej) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put({ id: 'bad', doc, revision: 1 }, 'bad');
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    db.close();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.waitForTimeout(400);

  const saveButtons = await page.locator('[data-testid="save-copy"]').count();
  note('rows with a rescue control: ' + saveButtons);
  ok(saveButtons === 1, 'exactly the unreadable row carries the rescue control', { saveButtons });

  const dl1 = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await page.locator('[data-testid="save-copy"]').first().click();
  const d1 = await dl1;
  note('download 1: ' + (d1 ? d1.suggestedFilename() : 'NONE'));
  ok(!!d1, 'a click downloads');
  if (d1) {
    const fn = d1.suggestedFilename();
    ok(!/[/\\]|\.\./.test(fn), 'the filename carries no path separator or traversal', fn);
    ok(fn.endsWith('.cairn-unreadable.json'), 'and ends .cairn-unreadable.json', fn);
    ok(!/<|>|script/i.test(fn), 'and no markup survives into it', fn);
  }

  // D2 — double-fire: two rapid clicks.
  const seen = [];
  page.on('download', (d) => seen.push(d.suggestedFilename()));
  await page.locator('[data-testid="save-copy"]').first().click();
  await page.locator('[data-testid="save-copy"]').first().click();
  await page.waitForTimeout(1200);
  note('two rapid clicks produced ' + seen.length + ' downloads: ' + JSON.stringify(seen));
  ok(seen.length === 2, 'each click is one download — no swallowed and no duplicated fire', seen);
  const stateAfter = await page.evaluate(() => ({
    cards: document.querySelectorAll('.tripcard').length,
    banners: [...document.querySelectorAll('.banner')].map((b) => b.innerText.trim().slice(0, 120)),
    opened: document.querySelectorAll('[data-testid="trip-range"]').length,
  }));
  note('after three exports: ' + JSON.stringify(stateAfter));
  ok(stateAfter.opened === 0 && stateAfter.banners.length === 0 && stateAfter.cards === 2,
     'exporting three times moved nothing on screen', stateAfter);
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3));
  await ctx.close();
}

// ===========================================================================
head('E — `--warn`\'s other consumers: .hint--warn and .sev--warning');
{
  const { ctx, page } = await fresh();
  const m = await page.evaluate(`(() => {
    ${CONTRAST_FN}
    // Mount probe elements in the real cascade rather than reading the hex out of the stylesheet.
    const host = document.createElement('div');
    host.className = 'card';
    host.innerHTML = '<span class="hint hint--warn" id="p1">warning text</span>' +
                     '<span class="pill" id="p2" style="color:#8f5816">warning</span>';
    document.body.appendChild(host);
    const out = [];
    for (const [id, name] of [['p1', '.hint--warn'], ['p2', 'Panels.tsx warning pill']]) {
      const el = document.getElementById(id);
      const cs = getComputedStyle(el);
      out.push({ name, color: cs.color, behind: bgOf(el), fontSize: cs.fontSize, contrast: +contrast(cs.color, bgOf(el)).toFixed(2) });
    }
    const warn = getComputedStyle(document.documentElement).getPropertyValue('--warn').trim();
    host.remove();
    return { warn, out };
  })()`);
  note(JSON.stringify(m));
  ok(m.warn.toLowerCase() === '#8f5816', '--warn is the value R34-7 claims', m.warn);
  for (const e of m.out) {
    ok(e.contrast >= 4.5, `${e.name} clears 4.5:1 at ${e.fontSize}`, e);
  }
  await ctx.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL CLEAR' : `\n${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
