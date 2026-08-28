/**
 * Round 27 — I-6a, part 6: **the whole rescan path in a real browser, over real IndexedDB.**
 *
 *   Needs: npm run web:build && node tools/serve.mjs   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i6a-browser.mjs
 *
 * `qa/i6a-idb.mjs` executes `apps/web/src/ports/storage.ts` directly. This one executes it
 * *through the app*: `App.tsx`'s boot (`refreshLibrary()` then `rescanSummaries()`), the store's
 * `runRescan`, and the real `indexedDbStorage().refreshSummary` — the wiring BUILD-NOTES lists
 * under "what I could not verify".
 *
 *   §1  a row knocked back below `SUMMARY_VERSION` is brought current on the next boot, and
 *       the record's ENVELOPE VERSION and DOCUMENT BYTES do not move while it happens
 *   §2  the R26-6 two-tab scenario, end to end in two real browser contexts: tab A holds the
 *       trip open and idle, tab B boots and rescans, tab A then types and saves
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

/** Everything the three object stores hold for one id, read straight out of IndexedDB. */
const record = (page, id) =>
  page.evaluate(async (id) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const out = await new Promise((res, rej) => {
      const tx = db.transaction(['docs', 'summaries', 'versions'], 'readonly');
      const d = tx.objectStore('docs').get(id);
      const s = tx.objectStore('summaries').get(id);
      const v = tx.objectStore('versions').get(id);
      tx.oncomplete = () => res({ doc: d.result ?? null, summary: s.result ?? null, version: v.result ?? null });
      tx.onerror = () => rej(tx.error);
    });
    db.close();
    return out;
  }, id);

/** Writes ONLY the summary row, leaving `docs` and `versions` untouched — a stale-row plant. */
const plantStaleRow = (page, id, row) =>
  page.evaluate(async ({ id, row }) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('summaries', 'readwrite');
      tx.objectStore('summaries').put(row, id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, { id, row });

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log(`  page error: ${e.message}`));
await page.goto(URL);
await page.waitForSelector('.tripcard, button:has-text("Load Europe 2026")', { timeout: 15000 });

// Seed the sample if the library is empty.
if (await page.locator('button:has-text("Load Europe 2026")').count()) {
  // Loading the sample opens the trip; a reload comes back to the library.
  await page.locator('button:has-text("Load Europe 2026")').click();
  await page.waitForSelector('button:has-text("Add a stop")', { timeout: 20000 });
  await page.goto(URL);
  await page.waitForSelector('.tripcard', { timeout: 15000 });
}
const id = await page.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); });
  const keys = await new Promise((res) => {
    const q = db.transaction('docs', 'readonly').objectStore('docs').getAllKeys();
    q.onsuccess = () => res(q.result);
  });
  db.close();
  return keys[0] ?? null;
});
if (id === null) { console.log('  no trip in IndexedDB — is the sample generated?'); process.exit(1); }
note(`trip under test: ${id}`);

// ---------------------------------------------------------------------------
head('§1 — a knocked-back row is brought current on boot, with no fence movement');
{
  const before = await record(page, id);
  ok(before.summary?.summaryVersion === 3, 'precondition: the row is at SUMMARY_VERSION 3', before.summary?.summaryVersion);
  ok(Array.isArray(before.summary?.countryCodes), 'precondition: the row carries countryCodes', before.summary?.countryCodes);

  // The shape a build older than I-6a leaves: version 1, no countries, no `countrySource`.
  const stale = { ...before.summary };
  delete stale.countryCodes;
  delete stale.cities;
  delete stale.summaryVersion;
  await plantStaleRow(page, id, stale);
  const planted = await record(page, id);
  ok(planted.summary.summaryVersion === undefined, 'planted: a pre-I-6 row with no summaryVersion field');
  ok(planted.version === before.version && planted.doc === before.doc, 'planted: the document and its envelope are untouched');

  await page.reload();
  await page.waitForSelector('.tripcard', { timeout: 15000 });
  // The rescan is deliberately not awaited before render, so wait for the note to clear.
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="summary-scan"]');
    return el === null;
  }, { timeout: 20000 }).catch(() => {});

  const after = await record(page, id);
  ok(after.summary.summaryVersion === 3, 'the real IndexedDB refreshSummary brought the row to SUMMARY_VERSION 3', after.summary.summaryVersion);
  ok(
    Array.isArray(after.summary.countryCodes) && after.summary.countryCodes.length > 0,
    'and the row carries its countries',
    after.summary.countryCodes,
  );
  ok(
    after.summary.cities?.every((c) => c.countrySource === 'coordinate'),
    "A-29's countrySource reached real storage, and every reference city is 'coordinate'",
    after.summary.cities?.map((c) => [c.key, c.countrySource]),
  );
  ok(after.version === before.version, 'A-30, IN A REAL BROWSER: the envelope version did NOT move', { before: before.version, after: after.version });
  ok(after.doc === before.doc, 'and the document bytes are byte-identical', { len: String(after.doc).length });
  ok(
    JSON.stringify(after.summary.countryCodes) === JSON.stringify(before.summary.countryCodes),
    'the recomputed row equals the one the build wrote',
    { before: before.summary.countryCodes, after: after.summary.countryCodes },
  );
  const codes = await page.locator('.tripcard__meta--dim').first().innerText();
  ok(/AT|HR|CZ/.test(codes), 'and the library card renders the codes', codes);

  // §5/§6: what the row PERSISTS. `TripSummaryRow` must not have grown a coordinate.
  ok(
    Object.keys(after.summary.cities[0]).sort().join(',') === 'countryCode,countrySource,key,name',
    'the persisted city entry is {key,name,countryCode,countrySource} and NOTHING else — no `centre`',
    Object.keys(after.summary.cities[0]).sort(),
  );
  const floats = JSON.stringify(after.summary).match(/-?\d+\.\d+/g) ?? [];
  ok(floats.length === 0, 'and no coordinate-shaped float anywhere in the stored row', floats.slice(0, 5));
  note(`stored row: ${JSON.stringify(after.summary).length} bytes`);
}

// ---------------------------------------------------------------------------
head('§2 — R26-6 end to end: tab A open and idle, tab B boots and rescans');
{
  // Tab A opens the trip and sits there. Same browser context = same IndexedDB.
  const pageA = await ctx.newPage();
  pageA.on('pageerror', (e) => console.log(`  A page error: ${e.message}`));
  await pageA.goto(URL);
  await pageA.waitForSelector('.tripcard', { timeout: 15000 });
  await pageA.locator('.tripcard__open').first().click();
  await pageA.waitForSelector('button:has-text("Add a stop")', { timeout: 20000 });
  const fenceBefore = (await record(pageA, id)).version;
  ok(await pageA.locator('.banner--error').count() === 0, 'setup: tab A is open with no banner');

  // Tab B knocks the row back and boots, which runs the rescan against the record A holds.
  const pageB = await ctx.newPage();
  await pageB.goto(URL);
  await pageB.waitForSelector('.tripcard', { timeout: 15000 });
  const cur = (await record(pageB, id)).summary;
  const stale = { ...cur };
  delete stale.summaryVersion;
  await plantStaleRow(pageB, id, stale);
  await pageB.reload();
  await pageB.waitForSelector('.tripcard', { timeout: 15000 });
  await pageB.waitForFunction(() => document.querySelector('[data-testid="summary-scan"]') === null, { timeout: 20000 }).catch(() => {});

  const afterRescan = await record(pageB, id);
  ok(afterRescan.summary.summaryVersion === 3, "B's rescan brought the row current", afterRescan.summary.summaryVersion);
  ok(afterRescan.version === fenceBefore, "and it did NOT move the fence tab A is holding", { before: fenceBefore, after: afterRescan.version });

  // Tab A now makes ONE edit — reordering a stop, the cheapest real document mutation the
  // day view offers. Under I-6 this was the keystroke that got the CONFLICT banner.
  const docBefore = (await record(pageA, id)).doc;
  await pageA.locator('button[aria-label*="own"], button:has-text("\u2193")').first().click();
  await pageA.waitForTimeout(1500);          // past the 400 ms autosave debounce
  const banner = await pageA.locator('.banner--error').count();
  const bannerText = banner ? await pageA.locator('.banner--error').first().innerText() : '';
  ok(banner === 0, "R26-6 CLOSED IN A REAL BROWSER: tab A's next edit raises no conflict banner", bannerText);
  ok(
    (await pageA.locator('.savestate').first().innerText()) === 'Saved',
    'and the indicator says Saved',
    await pageA.locator('.savestate').first().innerText().catch(() => 'n/a'),
  );
  const stored = await record(pageA, id);
  ok(stored.doc !== docBefore, "tab A's edit reached IndexedDB", { changed: stored.doc !== docBefore });
  ok(stored.version !== fenceBefore, "A's own write DID mint a new version — the fence still works for DOCUMENT writes");
  await pageA.close();
  await pageB.close();
}

await browser.close();
console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`}`);
process.exit(fails === 0 ? 0 : 1);
