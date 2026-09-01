/**
 * I-8f's rendered criteria — the builder's own probe.
 * ROADMAP Phase 2 **I-8f**, ARCHITECTURE §2.9 **A-47** (read with **A-46**).
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8f-render.mjs
 *
 * The population is QA **R35-1**'s, and it is the one A-46 could not see: the summary ROW's two
 * dates are perfectly readable and the DOCUMENT carries `days[3].date: '2026-02-30'` — a value
 * `store.importDoc` accepted and wrote before A-45. On the shipped sample that is 16 day-date
 * fields against 2 trip-date fields, so A-46's `rowDatesReadable` proxy covered roughly an
 * eighth of what `fromJSON` refuses while reading as a guarantee.
 *
 *   A  **I-8f criterion 1** — the rescue is reachable for the population A-46 missed. Before the
 *      tap the card is honestly unflagged (A-47 Part 8 residue 1, the stated floor); after the
 *      tap, on the SAME screen, the banner is up AND the chip is there AND "Save a copy" is
 *      there AND its bytes are byte-identical to what storage holds.
 *   B  **I-8f criterion 2** — Delete stops being silent on that population: after the tap its
 *      confirmation carries the "save a copy first" sentence; a healthy card's is the ordinary
 *      one.
 *   C  **I-8f criterion 3** — the meta line did not regress. On that same card the range still
 *      reads `2026-08-07 → 2026-08-22 · 6 cities` through `dateRangeLabel`, because those two
 *      dates are real; a row whose OWN startDate is `2026-02-30` still prints it verbatim, so
 *      R34-4 stays discharged. This is A-47 Part 4's split, driven from both sides.
 *   D  **I-8f criterion 4, the session half** — the fact dies with the session: a reload puts the
 *      card back to the honest floor.
 *   E  **A-46 is unregressed** — a bad ROW is still flagged with no tap at all, and a healthy
 *      library renders 0 chips and 0 rescue controls.
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

/**
 * **Round 35's exact plant.** The DOCUMENT's `days[3].date` is rewritten and the summary row is
 * left alone — which is not "two records disagreeing": `core.tripSummary` copies `trip.startDate`
 * and `trip.endDate` into the row and never looks at a day's date, so a pre-A-45 build that wrote
 * this document wrote exactly this row in the same transaction. Returns the stored bytes.
 */
const mangleStoredDayDate = (page) => page.evaluate(async () => {
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
  if (!o.days || o.days.length < 4) { db.close(); return null; }
  o.days[3].date = '2026-02-30';
  const bytes = JSON.stringify(o);
  const next = typeof rec === 'string' ? bytes : { ...rec, doc: bytes };
  await new Promise((res, rej) => {
    const tx = db.transaction(docStore, 'readwrite');
    tx.objectStore(docStore).put(next, keys[0]);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
  db.close();
  return { id: o.id, bytes, title: o.title, startDate: o.startDate, endDate: o.endDate };
});

const cardView = (page) => page.evaluate(() => ({
  cards: document.querySelectorAll('.tripcard').length,
  unreadable: document.querySelectorAll('[data-testid="row-unreadable"]').length,
  save: document.querySelectorAll('[data-testid="save-copy"]').length,
  range: document.querySelector('[data-testid="tripcard-range"]')?.innerText.trim() ?? null,
  hint: document.querySelector('[data-testid="row-unreadable-hint"]')?.innerText.trim() ?? null,
  banner: [...document.querySelectorAll('.banner')].map((b) => b.innerText.trim().slice(0, 200)),
  controls: [...document.querySelectorAll('.tripcard button')].map((b) => b.innerText.trim().replace(/\s+/g, ' ')),
}));

/**
 * Rewrites the one summary row's `datePrecision`. **This is what makes §C discriminating**, and
 * it is not a contrivance: `datePrecision` is a stored row field and a trip recorded as
 * "August 2026" is an ordinary product state (P2-6). At `exact` precision `dateRangeLabel` and
 * `storedDatesLabel` produce the *same* string for two real dates, so the meta line cannot tell
 * the two gates apart and a fault pointed at it reads GREEN for the wrong reason — measured.
 */
const setRowPrecision = (page, precision) => page.evaluate(async (precision) => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const rows = await new Promise((res, rej) => {
    const tx = db.transaction('summaries', 'readonly');
    const req = tx.objectStore('summaries').getAll();
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
  await new Promise((res, rej) => {
    const tx = db.transaction('summaries', 'readwrite');
    for (const r of rows) tx.objectStore('summaries').put({ ...r, datePrecision: precision }, r.id);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
  db.close();
  return rows.length;
}, precision);

/** Loads the sample, plants the bad `days[3].date`, reloads onto the Trips list. */
async function plantedSample({ precision, ...opts } = {}) {
  const h = await fresh(opts);
  await openSample(h.page);
  await h.page.waitForTimeout(600);
  const m = await mangleStoredDayDate(h.page);
  if (precision) await setRowPrecision(h.page, precision);
  await h.page.reload({ waitUntil: 'domcontentloaded' });
  await h.page.waitForSelector('.tabbar');
  await h.page.waitForTimeout(700);
  return { ...h, m };
}

// ===========================================================================
head('A — I-8f criterion 1: the rescue is reachable for the population A-46 missed');
{
  const { ctx, page, errors, m } = await plantedSample();
  ok(!!m, 'the sample document was rewritten in storage', m && { id: m.id });
  ok(m && m.startDate === '2026-08-07' && m.endDate === '2026-08-22',
     'the ROW dates are untouched — this is the readable-row / unopenable-document population', m);

  // The stated floor (A-47 Part 8 residue 1). F-D is session-scoped, so before anything tries to
  // open it the card is honestly unflagged. That is the honest half of R35-1, not the defect.
  const before = await cardView(page);
  note('BEFORE the tap: ' + JSON.stringify(before));
  ok(before.cards === 1, 'the row is listed', before);
  ok(before.unreadable === 0, 'nothing claims to know it will not open before anything has tried', before);
  ok(before.save === 0, 'and no rescue control is offered on a claim nothing has established', before);

  // The tap. THIS is the moment the fact is established, and A-47's guarantee is that the card
  // behind the banner has changed by the time the user reads the banner.
  await page.locator('.tripcard__open').first().click();
  await page.waitForTimeout(700);
  const after = await cardView(page);
  note('AFTER the tap: ' + JSON.stringify(after));

  ok(after.banner.some((b) => /could not be read/i.test(b)),
     'the refusal reads as a sentence', after.banner);
  ok(after.banner.some((b) => /\$\.days\[3\]\.date/.test(b)),
     'and names WHERE — the day-date site A-46 could not see', after.banner);
  ok(await page.locator('[data-testid="trip-range"]').count() === 0, 'the trip did not open');
  // The three assertions round 35 measured as 0, on the same screen as the banner.
  ok(after.unreadable === 1, 'the card SAYS the file could not be read (I-8f criterion 1)', after);
  ok(after.save === 1, 'a rescue export is offered (I-8f criterion 1)', after);
  ok(/cannot re-?read/i.test(after.hint ?? ''), 'and the card says the copy is not a backup', after);
  ok(after.controls.some((c) => /Save a copy/.test(c)),
     'round 35 enumerated ["Europe 2026 PAST TRIP","Delete"] here', after.controls);

  // …and the bytes are the document's own.
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.locator('[data-testid="save-copy"]').first().click(),
  ]);
  const name = download.suggestedFilename();
  const bytes = readFileSync(await download.path(), 'utf8');
  note(`download: ${name} (${bytes.length} bytes)`);
  ok(bytes === m.bytes, 'the exported bytes are BYTE-IDENTICAL to what is stored — no parse, no repair',
     { sameLength: bytes.length === m.bytes.length });
  ok(name.endsWith('.cairn-unreadable.json'), 'the filename says it is a rescue copy, not a backup', name);
  let refused = null;
  try { core.fromJSON(bytes); } catch (e) { refused = e.message; }
  ok(refused !== null && /days\[3\]\.date/.test(refused),
     'and Cairn itself still refuses to reopen it, at the same site (A-45)', refused);

  await ctx.close();
  note('page errors: ' + JSON.stringify(errors.slice(0, 3)));
}

// ===========================================================================
head('B — I-8f criterion 2: Delete stops being silent on the same population');
{
  const { ctx, page, m } = await plantedSample();
  const asked = [];
  page.on('dialog', async (d) => { asked.push(d.message()); await d.dismiss(); });

  // Before the tap: the ordinary sentence, and the card carries no rescue control either. The
  // two are consistent, which is A-47 Part 4's whole point — one wide boolean, both consumers.
  await page.locator('.tripcard').first().getByRole('button', { name: 'Delete' }).click();
  await page.waitForTimeout(200);
  const beforeMsg = asked[asked.length - 1] ?? '';
  note('BEFORE the tap, confirm: ' + JSON.stringify(beforeMsg));
  ok(!/save a copy first/i.test(beforeMsg), 'the warning fires without a control to point at', beforeMsg);
  ok(/cannot be undone/i.test(beforeMsg), 'and the ordinary confirmation still warns', beforeMsg);

  await page.locator('.tripcard__open').first().click();
  await page.waitForTimeout(700);
  await page.locator('.tripcard').first().getByRole('button', { name: 'Delete' }).click();
  await page.waitForTimeout(200);
  const afterMsg = asked[asked.length - 1] ?? '';
  note('AFTER the tap, confirm: ' + JSON.stringify(afterMsg));
  ok(/only one/i.test(afterMsg), 'the confirmation says the stored copy is the only one', afterMsg);
  ok(/save a copy first/i.test(afterMsg), 'and points at the rescue export', afterMsg);
  ok(await page.locator('[data-testid="save-copy"]').count() === 1,
     '…which is on screen beside it — the conflation R35-1 measured is gone', m && m.id);
  ok(await page.locator('.tripcard').count() === 1, 'the row survives a dismissed confirm');
  await ctx.close();
}

// ===========================================================================
head('C — I-8f criterion 3: the meta line did not regress (A-47 Part 4\'s narrow gate)');
{
  const { ctx, page } = await plantedSample();
  await page.locator('.tripcard__open').first().click();
  await page.waitForTimeout(700);
  const v = await cardView(page);
  note('flagged card at EXACT precision, meta line: ' + JSON.stringify(v.range));
  ok(v.unreadable === 1, 'premise: the card IS flagged', v);
  ok(/2026-08-07\s*→\s*2026-08-22/.test(v.range ?? ''),
     'the range is still the row\'s real one', v);
  ok(/6 cities/.test(v.range ?? ''), 'and the counts are unchanged', v);
  note('(at exact precision the two labels agree — the discriminating case is below)');
  await ctx.close();
}
{
  // **The discriminating case, and the reason this block exists.** At `exact` precision
  // `dateRangeLabel(row)` prints `start → end`, which is character-for-character what
  // `storedDatesLabel(row)` prints, so the meta line cannot tell A-47 Part 4's two gates apart
  // and criterion 3's injected fault reads GREEN for the wrong reason (measured, not assumed —
  // BUILD-NOTES KD-77).
  // At **month** precision `dateRangeLabel` prints `MONTHS[m-1] + ' ' + y`, so the two diverge:
  // correct → "August 2026"; meta line re-pointed at `rowUnopenable` → "2026-08-07 → 2026-08-22".
  const { ctx, page } = await plantedSample({ precision: 'month' });
  const before = await cardView(page);
  note('BEFORE the tap, month precision: ' + JSON.stringify(before.range));
  ok(/August 2026/.test(before.range ?? ''), 'premise: P2-6\'s month label is what this row renders', before);
  await page.locator('.tripcard__open').first().click();
  await page.waitForTimeout(700);
  const v = await cardView(page);
  note('AFTER the tap, month precision: ' + JSON.stringify(v.range));
  ok(v.unreadable === 1, 'premise: the card IS flagged', v);
  ok(v.save === 1, 'premise: and the rescue control is there — the WIDE gate did fire', v);
  ok(/August 2026/.test(v.range ?? ''),
     'the meta line kept its honest label — the narrow gate did NOT widen (I-8f criterion 3)', v);
  ok(!/2026-08-07/.test(v.range ?? ''),
     'the meta line fell back to raw strings for a row whose own dates are perfectly readable', v);
  await ctx.close();
}
{
  // The other side: a row whose OWN startDate is calendar-invalid still prints both stored
  // strings verbatim, with no month-name lookup. R34-4 stays discharged.
  const { ctx, page } = await withLibrary([
    row('bad-row', '2026-02-30', '2026-03-05', ['AT'], { datePrecision: 'month' }),
    row('good-row', '2019-03-01', '2019-03-31', ['CZ'], { datePrecision: 'month' }),
  ]);
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('.tripcard')].map((c) => ({
      title: c.querySelector('.tripcard__title')?.childNodes[0]?.textContent?.trim() ?? '',
      range: c.querySelector('[data-testid="tripcard-range"]')?.innerText.trim(),
      unreadable: c.querySelectorAll('[data-testid="row-unreadable"]').length,
      save: c.querySelectorAll('[data-testid="save-copy"]').length,
    })));
  note('cards: ' + JSON.stringify(cards));
  const bad = cards.find((c) => c.title === 'bad-row');
  const good = cards.find((c) => c.title === 'good-row');
  ok(bad && bad.unreadable === 1 && bad.save === 1, 'A-46\'s own population is still flagged and rescuable', bad);
  ok(bad && /2026-02-30\s*→\s*2026-03-05/.test(bad.range), 'and prints its two stored strings verbatim', bad);
  ok(bad && !/January|February|March|April|May|June|July|August|September|October|November|December/.test(bad.range),
     'naming no month — R34-4 stays discharged', bad);
  ok(good && good.unreadable === 0 && /March 2019/.test(good.range),
     'while a readable month-precision row still reads "March 2019" — P2-6 unmoved', good);
  await ctx.close();
}

// ===========================================================================
head('D — I-8f criterion 4: the fact dies with the session (A-47 Part 8 residue 1)');
{
  const { ctx, page } = await plantedSample();
  await page.locator('.tripcard__open').first().click();
  await page.waitForTimeout(700);
  ok(await page.locator('[data-testid="row-unreadable"]').count() === 1, 'premise: flagged after the tap');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.waitForTimeout(700);
  const v = await cardView(page);
  note('after reload: ' + JSON.stringify({ unreadable: v.unreadable, save: v.save }));
  ok(v.unreadable === 0 && v.save === 0,
     'the flag survived a reload — it is persisted, which A-47 Part 2 refuses (it goes stale on repair)', v);
  ok(v.cards === 1, 'and the row is still listed', v);
  await ctx.close();
}

// ===========================================================================
head('E — nothing is claimed that is not known: a healthy library is untouched');
{
  const { ctx, page } = await withLibrary([
    row('healthy-a', '2026-08-07', '2026-08-22', ['AT']),
    row('healthy-b', '2019-05-01', '2019-05-08', ['HR']),
  ]);
  const v = await cardView(page);
  note('healthy library: ' + JSON.stringify({ cards: v.cards, unreadable: v.unreadable, save: v.save }));
  ok(v.cards === 2, 'both rows render', v);
  ok(v.unreadable === 0, 'no chip is invented', v);
  ok(v.save === 0, 'and no rescue control appears on a card that does not need one', v);
  await ctx.close();
}

console.log(fails === 0 ? '\nALL CLEAR' : `\n${fails} FAIL(S)`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
