/**
 * I-8e's rendered criteria, plus QA **R34-1**'s fix — the builder's own probe.
 * ROADMAP Phase 2 **I-8e**, ARCHITECTURE §2.9 **A-46**.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8e-render.mjs
 *
 *   A  **R34-1** — BLD-3's *"Close this trip"* recovers in ONE click, and *"Try again"* still
 *      behaves in both directions. Round 34 measured the banner still up, `.tripcard` count 0,
 *      and a second unassisted click recovering; that is what must not happen again.
 *   B  **I-8e criterion 1** — R34-2's exact repro: Europe 2026 with its stored `startDate`
 *      rewritten to `2026-02-30`. The card must say it cannot be read, print the stored string
 *      verbatim, and not be presented as healthy.
 *   C  **I-8e criterion 3/5** — the rescue export end to end, through a real download: the
 *      bytes are byte-identical to what is stored, they parse as raw JSON, `core.fromJSON`
 *      still refuses them, and the filename says `.cairn-unreadable.json`.
 *   D  **I-8e criterion 4** — nothing is claimed that is not known: a healthy library renders
 *      0 chips and 0 rescue controls.
 *   E  **R34-7** — the warn chip's contrast, measured against its own composited background,
 *      light and dark.
 *   F  **A-46 Part 3 clause 4** — Delete's confirmation says the stored copy is the only one.
 *   G  **I-8c criterion 3b, confirmed rather than changed** — the Map refuses the aggregate in
 *      words and draws zero countries; the arm that NAMES a row is reached by a duplicate
 *      summary id (A-31 Part 4), not by a date fault.
 *
 * A "FAIL" line means the probe found what it was looking for.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { readFileSync } from 'node:fs';
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

async function fresh({ dark = false } = {}) {
  const ctx = await browser.newContext({ colorScheme: dark ? 'dark' : 'light', acceptDownloads: true });
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
  await page.waitForSelector('[data-testid="trip-range"]', { timeout: 15000 });
};

/** The fault round 34 used: thrown from OUTSIDE the app's state, so "the cause is gone" and
 *  "the banner cleared" stay two separate facts. */
const armTripViewFault = (page) => page.evaluate(() => {
  const orig = Array.prototype.map;
  window.__cairnDisarm = () => { Array.prototype.map = orig; };
  Array.prototype.map = function map(fn, thisArg) {
    if (Array.isArray(this) && this.some((x) => x && x.key === 'conflicts')) {
      throw new Error('i8e probe: forced TripView render failure');
    }
    return orig.call(this, fn, thisArg);
  };
  return true;
});

const bounceTabs = async (page, ms = 400) => {
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(150);
  await page.getByRole('tab', { name: 'Trips' }).click();
  await page.waitForTimeout(ms);
};

/**
 * Rewrites the one stored trip's `startDate` to a shape-valid, calendar-invalid date — a value
 * `store.importDoc` accepted and wrote before I-8c. Returns the exact stored document bytes.
 *
 * **Both records, deliberately.** `core.tripSummary` copies `trip.startDate` straight into the
 * row (`derive/summary.ts:378`), so a pre-A-45 build that wrote such a document wrote a row
 * carrying the same string in the same transaction. Round 34's §F probe rewrote the *document*
 * only, which leaves the two records disagreeing — a state no write path has ever produced.
 * That case is real and is asserted separately in §B2 below, as A-46 Part 3's stated
 * incompleteness rather than as this population.
 *
 * `row: false` reproduces round 34's partial plant instead.
 */
const mangleStoredStart = (page, { row = true } = {}) => page.evaluate(async ({ row }) => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const docStore = [...db.objectStoreNames].find((n) => n !== 'summaries');
  const read = (fn) => new Promise((res, rej) => {
    const tx = db.transaction(docStore, 'readonly');
    const req = fn(tx.objectStore(docStore));
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
  const all = await read((s) => s.getAll());
  const keys = await read((s) => s.getAllKeys());
  if (!all.length) { db.close(); return null; }
  const rec = all[0];
  const raw = typeof rec === 'string' ? rec : rec.doc;
  const o = JSON.parse(raw);
  o.startDate = '2026-02-30';
  const bytes = JSON.stringify(o);
  const next = typeof rec === 'string' ? bytes : { ...rec, doc: bytes };
  await new Promise((res, rej) => {
    const tx = db.transaction(docStore, 'readwrite');
    tx.objectStore(docStore).put(next, keys[0]);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
  if (row) {
    const summary = await new Promise((res, rej) => {
      const tx = db.transaction('summaries', 'readonly');
      const req = tx.objectStore('summaries').get(o.id);
      req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('summaries', 'readwrite');
      tx.objectStore('summaries').put({ ...summary, startDate: '2026-02-30' }, o.id);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
  }
  db.close();
  return { id: o.id, bytes, title: o.title };
}, { row });

// ===========================================================================
head('A — R34-1: "Close this trip" recovers in ONE click; "Try again" still behaves');
{
  const { ctx, page, errors } = await fresh();
  await openSample(page);
  ok(await page.locator('[data-testid="trip-range"]').count() === 1, 'the sample trip is open');
  await armTripViewFault(page);
  await bounceTabs(page);

  const down = await page.locator('#tabpanel-trips').innerText();
  ok(/could not be shown/i.test(down), 'the boundary caught it', down.slice(0, 160));
  ok(/close this trip/i.test(down), 'the shell offers "Close this trip" (the document-open branch)');
  ok(!/reload cairn/i.test(down), 'and not the no-document branch');

  // THE branch round 34 measured as broken. One click, and the count of clicks is the finding.
  await page.getByRole('button', { name: 'Close this trip' }).click();
  await page.waitForTimeout(900);
  const after = await page.locator('#tabpanel-trips').innerText();
  const cards = await page.locator('.tripcard').count();
  note('after ONE click on "Close this trip": ' + JSON.stringify(after.slice(0, 160)) + ` cards=${cards}`);
  ok(!/could not be shown/i.test(after), 'the banner is gone after ONE click', after.slice(0, 200));
  ok(await page.locator('[data-testid="trip-range"]').count() === 0, 'the document is actually closed');
  ok(cards > 0, 'the library renders — the user has a working state again, unassisted', { cards });

  // …and the fault is still armed, so the recovery worked rather than the cause disappearing.
  const stillArmed = await page.evaluate(() => !!window.__cairnDisarm && Array.prototype.map.name === 'map');
  ok(stillArmed, 'the fault was STILL ARMED throughout — the recovery recovered, the cause did not vanish');

  // "Try again" in the same context: honest, not sticky.
  await page.evaluate(() => window.__cairnDisarm());
  await ctx.close();
  note('page errors: ' + JSON.stringify(errors.slice(0, 3)));
}
{
  const { ctx, page } = await fresh();
  await openSample(page);
  await page.evaluate(() => {
    let on = true;
    const orig = Array.prototype.map;
    window.__cairnDisarm = () => { on = false; };
    Array.prototype.map = function map(fn, thisArg) {
      if (on && Array.isArray(this) && this.some((x) => x && x.key === 'conflicts')) {
        throw new Error('i8e probe: forced TripView render failure');
      }
      return orig.call(this, fn, thisArg);
    };
  });
  await bounceTabs(page, 300);
  ok(/could not be shown/i.test(await page.locator('#tabpanel-trips').innerText()), 'boundary is up');
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForTimeout(300);
  ok(/could not be shown/i.test(await page.locator('#tabpanel-trips').innerText()),
     '"Try again" with the cause still present re-raises rather than clearing');
  await page.evaluate(() => window.__cairnDisarm());
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForTimeout(400);
  const t = await page.locator('#tabpanel-trips').innerText();
  ok(!/could not be shown/i.test(t), '"Try again" clears once the cause is gone', t.slice(0, 160));
  ok(await page.locator('[data-testid="trip-range"]').count() === 1,
     'and the trip is still open — "Try again" closed nothing');
  await ctx.close();
}

// ===========================================================================
head('B — I-8e criterion 1: R34-2\'s exact repro, on rendered output');
{
  const { ctx, page, errors } = await fresh();
  await openSample(page);
  await page.waitForTimeout(600);
  const m = await mangleStoredStart(page);
  ok(!!m, 'the sample document was rewritten in storage', m && { id: m.id });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.waitForTimeout(700);

  const view = await page.evaluate(() => ({
    cards: document.querySelectorAll('.tripcard').length,
    unreadable: document.querySelectorAll('[data-testid="row-unreadable"]').length,
    range: document.querySelector('[data-testid="tripcard-range"]')?.innerText.trim() ?? null,
    stages: [...document.querySelectorAll('[data-testid="lifecycle-chip"]')].map((e) => e.getAttribute('data-stage')),
    save: document.querySelectorAll('[data-testid="save-copy"]').length,
    hint: document.querySelector('[data-testid="row-unreadable-hint"]')?.innerText.trim() ?? null,
  }));
  note('card: ' + JSON.stringify(view));
  ok(view.cards === 1, 'the row is still listed — one bad document costs one row', view);
  ok(view.unreadable === 1, 'the card SAYS the file could not be read (I-8e criterion 1)', view);
  ok((view.range ?? '').includes('2026-02-30'), 'the meta line prints the stored string verbatim', view);
  ok(!/January|February|March|April|May|June|July|August|September|October|November|December/
      .test(view.range ?? ''), 'and names no month — R34-4', view);
  ok(view.save === 1, 'a rescue export is offered on the card (A-46 Part 4)', view);
  ok(/cannot re-?read/i.test(view.hint ?? ''), 'the card says the copy is not a backup', view);

  // Tapping it still refuses — and the message is a sentence now, not a bare JSON path (R34-2 builder half).
  await page.locator('.tripcard__open').first().click();
  await page.waitForTimeout(600);
  const banner = await page.evaluate(() =>
    [...document.querySelectorAll('.banner')].map((b) => b.innerText.trim().slice(0, 200)));
  note('banner on tap: ' + JSON.stringify(banner));
  ok(await page.locator('[data-testid="trip-range"]').count() === 0, 'the trip does not open (A-45 refuses it)');
  ok(banner.some((b) => /could not be read/i.test(b)), 'the refusal reads as a sentence', banner);
  ok(banner.some((b) => /\$\.startDate/.test(b)), 'and still names WHERE, which is the only thing the path is for', banner);
  await ctx.close();
  note('page errors: ' + JSON.stringify(errors.slice(0, 3)));
}

// ===========================================================================
head('B1 — R34-4, at the precision where the old label was plausible AND false');
{
  // The discriminating case, and it is the reason this section exists. At `exact` precision
  // `dateRangeLabel` prints `start → end` — identical to `storedDatesLabel`, so the meta line
  // cannot tell the two apart. At **month** precision it prints `MONTHS[m-1] + ' ' + y`, so a
  // row storing `2026-02-30` reads a confident, plausible, **false** "February 2026" — a month
  // the user's file does not contain a real date in. Under the fix the same row prints what is
  // stored. **Injected fault:** the `rowLifecycle(...) === null` predicate — it classifies
  // `2026-02-30` as `completed`, so the branch is not taken and "February 2026" comes back.
  const rows = [
    row('bad-month', '2026-02-30', '2026-03-05', ['AT'], { datePrecision: 'month' }),
    row('bad-year', '2026-13-01', '2026-13-02', ['HR'], { datePrecision: 'year' }),
    row('good-month', '2019-03-01', '2019-03-31', ['CZ'], { datePrecision: 'month' }),
  ];
  const { ctx, page } = await withLibrary(rows);
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('.tripcard')].map((c) => ({
      title: c.querySelector('.tripcard__title')?.childNodes[0]?.textContent?.trim() ?? '',
      range: c.querySelector('[data-testid="tripcard-range"]')?.innerText.trim(),
      unreadable: c.querySelectorAll('[data-testid="row-unreadable"]').length,
    })));
  note('cards: ' + JSON.stringify(cards));
  const bad = cards.filter((c) => c.title.startsWith('bad-'));
  ok(bad.length === 2, 'both fuzzy-precision rows render', cards);
  for (const c of bad) {
    ok(c.unreadable === 1, `${c.title}: flagged`, c);
    ok(!/January|February|March|April|May|June|July|August|September|October|November|December/.test(c.range),
       `${c.title}: names no month — the old label said "February 2026" for a date that is not one`, c);
    ok(/→/.test(c.range), `${c.title}: prints both stored strings, joined`, c);
  }
  const good = cards.find((c) => c.title === 'good-month');
  ok(good.unreadable === 0 && /March 2019/.test(good.range),
     'and a readable month-precision row still reads "March 2019" — P2-6 is unmoved', good);
  await ctx.close();
}

// ===========================================================================
head('B2 — A-46 Part 3\'s stated incompleteness, asserted rather than hidden');
{
  // Round 34's §F plant: the DOCUMENT rewritten, the row left alone — two records disagreeing,
  // which no shipped write path produces. The row is genuinely readable, so the card is NOT
  // flagged, and A-46 Part 3 says so in as many words: "a row can be readable while its
  // document is not; only opening it finds that." What must still hold is that opening it
  // refuses in a sentence, and that the rescue copy is reachable from the card either way —
  // which here means through Delete's confirm and the banner, not through a chip.
  const { ctx, page, errors } = await fresh();
  await openSample(page);
  await page.waitForTimeout(600);
  await mangleStoredStart(page, { row: false });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.waitForTimeout(700);
  const view = await page.evaluate(() => ({
    unreadable: document.querySelectorAll('[data-testid="row-unreadable"]').length,
    range: document.querySelector('[data-testid="tripcard-range"]')?.innerText.trim() ?? null,
  }));
  note('doc-only fault: ' + JSON.stringify(view));
  ok(view.unreadable === 0,
     'the card is NOT flagged — the row is readable, and the signal never claimed to be complete', view);
  await page.locator('.tripcard__open').first().click();
  await page.waitForTimeout(600);
  const banner = await page.evaluate(() =>
    [...document.querySelectorAll('.banner')].map((b) => b.innerText.trim().slice(0, 200)));
  ok(banner.some((b) => /could not be read/i.test(b) && /\$\.startDate/.test(b)),
     'and opening it still refuses, in a sentence, with the path', banner);
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3));
  await ctx.close();
}

// ===========================================================================
head('C — I-8e criteria 3 and 5: the rescue export, through a real download');
{
  const { ctx, page, errors } = await fresh();
  await openSample(page);
  await page.waitForTimeout(600);
  const m = await mangleStoredStart(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.waitForTimeout(700);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.locator('[data-testid="save-copy"]').first().click(),
  ]);
  const name = download.suggestedFilename();
  const path = await download.path();
  const bytes = readFileSync(path, 'utf8');
  note(`download: ${name} (${bytes.length} bytes)`);

  ok(name.endsWith('.cairn-unreadable.json'), 'the filename says it is a rescue copy, not a backup', name);
  ok(!name.endsWith('.cairn.json'), 'and is distinguishable from a backup', name);
  ok(bytes === m.bytes, 'the exported bytes are BYTE-IDENTICAL to what is stored — no parse, no repair',
     { got: bytes.slice(0, 80), want: m.bytes.slice(0, 80), sameLength: bytes.length === m.bytes.length });

  // Round-trip readable as raw JSON, and still refused by Cairn — both, which is the point.
  let parsed = null;
  try { parsed = JSON.parse(bytes); } catch (e) { parsed = { __err: String(e) }; }
  ok(parsed && !parsed.__err, 'the rescue file is readable as raw JSON — hand-editable, mailable', parsed && parsed.__err);
  ok(parsed && parsed.startDate === '2026-02-30', 'and it carries the unreadable date, untouched', parsed && parsed.startDate);
  let refused = null;
  try { core.fromJSON(bytes); } catch (e) { refused = e.message; }
  ok(refused !== null && /calendar date/.test(refused), 'Cairn itself still refuses to reopen it (A-45)', refused);
  ok(/\$\.startDate/.test(refused ?? ''), 'with the JSON path that says where', refused);

  // The library is unmoved: an export is a read.
  const after = await page.evaluate(() => ({
    cards: document.querySelectorAll('.tripcard').length,
    unreadable: document.querySelectorAll('[data-testid="row-unreadable"]').length,
    open: document.querySelectorAll('[data-testid="trip-range"]').length,
    banner: [...document.querySelectorAll('.banner--error')].map((b) => b.innerText.slice(0, 80)),
  }));
  ok(after.cards === 1 && after.unreadable === 1 && after.open === 0 && after.banner.length === 0,
     'saving a copy changed nothing on screen — no transition, no error', after);
  await ctx.close();
  note('page errors: ' + JSON.stringify(errors.slice(0, 3)));
}

// ===========================================================================
head('D — I-8e criterion 4: nothing is claimed that is not known');
{
  const rows = [
    row('good-1', '2019-05-01', '2019-05-08', ['HR']),
    row('good-2', '2024-03-01', '2024-03-09', ['AT']),
    row('good-3', '2026-09-01', '2026-09-10', ['CZ']),
  ];
  const { ctx, page, errors } = await withLibrary(rows);
  const view = await page.evaluate(() => ({
    cards: document.querySelectorAll('.tripcard').length,
    unreadable: document.querySelectorAll('[data-testid="row-unreadable"]').length,
    save: document.querySelectorAll('[data-testid="save-copy"]').length,
    ranges: [...document.querySelectorAll('[data-testid="tripcard-range"]')].map((e) => e.innerText.trim()),
    stages: [...document.querySelectorAll('[data-testid="lifecycle-chip"]')].map((e) => e.getAttribute('data-stage')),
  }));
  note('healthy library: ' + JSON.stringify(view));
  ok(view.cards === 3, 'three rows render');
  ok(view.unreadable === 0, 'no row claims it could not be read', view);
  ok(view.save === 0, 'and no rescue control appears on a healthy card', view);
  ok(view.stages.every((s) => s !== 'unreadable'), 'no lifecycle chip reads unreadable', view);
  ok(view.ranges.every((r) => /→/.test(r)), 'the honest range label still renders', view);
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3));
  await ctx.close();
}

// ===========================================================================
head('E — R34-7: the warn chip\'s contrast against its own composited background');
{
  for (const dark of [false, true]) {
    const rows = [row('bad', '2026-02-30', '2026-03-05', ['AT'])];
    const { ctx, page } = await withLibrary(rows, { dark });
    const m = await page.evaluate(() => {
      const contrast = (a, b) => {
        const lum = (c) => {
          const [r, g, bl] = c.match(/[\d.]+/g).slice(0, 3).map((v) => {
            const s = Number(v) / 255;
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
      const out = [];
      for (const el of document.querySelectorAll('.chip--warn')) {
        const cs = getComputedStyle(el);
        out.push({
          testid: el.getAttribute('data-testid'), color: cs.color, behind: bg(el),
          fontSize: cs.fontSize, contrast: +contrast(cs.color, bg(el)).toFixed(2),
        });
      }
      return { scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', chips: out };
    });
    note(`${dark ? 'DARK ' : 'LIGHT'} ${JSON.stringify(m)}`);
    ok(m.chips.length >= 1, `${dark ? 'dark' : 'light'}: a warn chip renders`, m);
    for (const c of m.chips) {
      ok(c.contrast >= 4.5, `${dark ? 'dark' : 'light'}: ${c.testid ?? 'chip'} clears WCAG 1.4.3's 4.5:1`, c);
    }
    await ctx.close();
  }
}

// ===========================================================================
head('F — A-46 Part 3 clause 4: Delete says what Delete costs');
{
  const rows = [row('bad', '2026-02-30', '2026-03-05', ['AT']), row('good', '2019-05-01', '2019-05-08', ['HR'])];
  const { ctx, page } = await withLibrary(rows);
  const asked = [];
  page.on('dialog', async (d) => { asked.push(d.message()); await d.dismiss(); });
  // The unreadable row is listed first (`listTrips` sorts by startDate; 2019 < 2026), so find
  // the card by its chip rather than by position.
  const cards = page.locator('.tripcard');
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const c = cards.nth(i);
    const bad = await c.locator('[data-testid="row-unreadable"]').count() > 0;
    await c.getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(150);
    const msg = asked[asked.length - 1] ?? '';
    note(`${bad ? 'UNREADABLE' : 'healthy   '} row confirm: ${JSON.stringify(msg)}`);
    if (bad) {
      ok(/only one/i.test(msg), 'the unreadable row\'s confirm says the stored copy is the only one', msg);
      ok(/save a copy first/i.test(msg), 'and points at the rescue export', msg);
    } else {
      ok(!/only one/i.test(msg), 'a healthy row\'s confirm is unchanged', msg);
      ok(/cannot be undone/i.test(msg), 'and still warns', msg);
    }
  }
  ok(await page.locator('.tripcard').count() === 2, 'both rows survive a dismissed confirm');
  await ctx.close();
}

// ===========================================================================
head('G — I-8c criterion 3b, confirmed rather than changed (A-46 Part 5)');
{
  // (i) the aggregate refusal: a shape-invalid row makes `travelStats` refuse the WHOLE library.
  const rows = [
    row('good-1', '2019-05-01', '2019-05-08', ['HR']),
    row('broken', 'not-a-date', '2019-05-08', ['AT']),
    row('good-2', '2024-03-01', '2024-03-09', ['AT']),
  ];
  const { ctx, page, errors } = await withLibrary(rows);
  const trips = await page.locator('#tabpanel-trips').innerText();
  ok(!/could not be shown/i.test(trips), '3a: the Trips tab does not go down');
  ok(await page.locator('.tripcard').count() === 3, '3a: all three rows render');
  ok(await page.locator('[data-testid="row-unreadable"]').count() === 1,
     '3a: exactly one row says it could not be read',
     await page.locator('[data-testid="row-unreadable"]').count());
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(500);
  const mapText = await page.locator('#tabpanel-map').innerText();
  ok(/could not read your travel history/i.test(mapText), '3b(i): the Map refuses IN WORDS', mapText.slice(0, 160));
  ok(await page.locator('#tabpanel-map path[data-code]').count() === 0,
     '3b(i): and draws zero countries — there is no drill-down to reach');
  ok(!/could not be shown/i.test(mapText), '3b(i): the Map tab does not go down either');
  await ctx.close();
  note('page errors: ' + JSON.stringify(errors.slice(0, 3)));
}
{
  // (ii) the arm that NAMES a row, reached by the fault that actually reaches it: a duplicate
  // summary id (A-31 Part 4) — not a date fault, which round 34 proved cannot separate the two.
  const dup = [row('same', '2019-05-01', '2019-05-08', ['HR']), row('same', '2024-03-01', '2024-03-09', ['AT'])];
  const { ctx, page } = await fresh();
  // Two rows with one key cannot be planted through `put(row, row.id)`; the store's own
  // `listTrips` is what must return them, so plant under distinct keys and rewrite the id.
  await page.evaluate(async (rows) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('summaries', 'readwrite');
      rows.forEach((row, i) => tx.objectStore('summaries').put(row, `key-${i}`));
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, dup);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.waitForTimeout(400);
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(500);
  const mapText = await page.locator('#tabpanel-map').innerText();
  note('duplicate-id Map text: ' + JSON.stringify(mapText.slice(0, 240)));
  ok(/same/.test(mapText), '3b(ii): the surface NAMES the offending row', mapText.slice(0, 200));
  ok(!/could not be shown/i.test(mapText), '3b(ii): and refuses rather than throwing');
  await ctx.close();
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
