/**
 * QA round 40 — the half of I-8f the builder states was **not** driven: `browseTrip`'s failure
 * path through the real Browse-and-copy UI, with an actual unopenable document.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r40-browse.mjs
 *
 * BUILD-NOTES (I-8f, "What I could not verify"): *"`browseTrip`'s failure path is exercised in
 * bare Node only — no shipped surface reaches it with an unopenable document today (the Browse &
 * copy pane lists the same library, but I did not drive it in the browser), so its rendered
 * consequence is untested."* This drives it.
 *
 *   A  The Browse pane's `<select>` lists an unopenable trip and selecting it produces an
 *      ERROR the user can read — not a blank pane, not a silent no-op, not a crash.
 *   B  The OPEN trip survives it: `browseTrip` failing must not close, replace or corrupt the
 *      document the user is working in. (This is the concrete risk of a `set` on a failure
 *      path — A-47 Part 2 requires the `set` to happen BEFORE the rethrow.)
 *   C  **F-D was recorded from the browse path**, and the consequence is visible on the Trips
 *      list once the user closes the trip: chip + hint + "Save a copy" + the Delete warning,
 *      on a card whose own two dates are perfectly readable. This is A-47 Part 4's divergence,
 *      established through the browse tap rather than the open tap.
 *   D  The rescue export from that card is byte-identical to the stored bytes.
 *   E  A second browse of a HEALTHY trip still works afterwards, and does not clear the other
 *      id's record.
 *
 * A "FAIL" line means the probe found what it was looking for.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const URL_ = process.env.CAIRN_URL ?? 'http://localhost:4173/';
let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok    ${l}`); else { fails++; console.log(`  FAIL  ${l}${x === undefined ? '' : `  -> ${JSON.stringify(x)}`}`); } };
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
await page.goto(URL_, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.tabbar');

// --- Two trips in the library: the sample, and one made through the real New-trip form. ---
await page.getByRole('button', { name: /Load Europe 2026/i }).click();
await page.waitForSelector('[data-testid="trip-range"]', { timeout: 15000 });
// The brand mark is the app's own "back to all trips" — it closes the open trip, which is what
// makes `Library` render at all (`App.tsx`: the Trips tab is `state.doc ? TripView : Library`).
await page.locator('.topbar__brand').click();
await page.waitForSelector('.triplist', { timeout: 15000 });
await page.getByRole('button', { name: 'New trip' }).click();
await page.getByLabel('Title').fill('Guest Trip');
await page.locator('input[type="date"]').nth(0).fill('2027-03-01');
await page.locator('input[type="date"]').nth(1).fill('2027-03-05');
await page.getByLabel(/Cities/).fill('Tokyo, Kyoto');
await page.getByRole('button', { name: 'Create' }).click();
await page.waitForSelector('[data-testid="trip-range"]', { timeout: 15000 });
await page.locator('.topbar__brand').click();
await page.waitForSelector('.triplist', { timeout: 15000 });
await page.waitForTimeout(400);

/** Rewrite `Guest Trip`'s stored `days[2].date`, leaving its summary row alone. */
const stored = await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const docStore = [...db.objectStoreNames].find((n) => n !== 'summaries');
  const read = (store, fn) => new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly'); const q = fn(tx.objectStore(store));
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  });
  const recs = await read(docStore, (s) => s.getAll());
  const keys = await read(docStore, (s) => s.getAllKeys());
  let hit = -1;
  for (let i = 0; i < recs.length; i++) {
    const raw = typeof recs[i] === 'string' ? recs[i] : recs[i].doc;
    if (JSON.parse(raw).title === 'Guest Trip') { hit = i; break; }
  }
  if (hit < 0) { db.close(); return null; }
  const rec = recs[hit];
  const raw = typeof rec === 'string' ? rec : rec.doc;
  const o = JSON.parse(raw);
  o.days[2].date = '2027-02-30';
  const bytes = JSON.stringify(o);
  const next = typeof rec === 'string' ? bytes : { ...rec, doc: bytes };
  await new Promise((res, rej) => {
    const tx = db.transaction(docStore, 'readwrite');
    tx.objectStore(docStore).put(next, keys[hit]);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
  db.close();
  return { bytes, key: keys[hit] };
});
ok(stored !== null, 'could not plant the unopenable document');
note(`planted ${stored.bytes.length} bytes under key ${JSON.stringify(stored.key)}`);

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.triplist', { timeout: 15000 });
await page.waitForTimeout(400);

// ---------------------------------------------------------------------------
head('A — the Browse pane offers the unopenable trip, and selecting it says so');
// Open the SAMPLE (the healthy trip), then reach the Browse pane.
await page.getByRole('button', { name: /Europe 2026/ }).first().click();
await page.waitForSelector('[data-testid="trip-range"]', { timeout: 15000 });
const browseBtn = page.getByRole('tab', { name: /Browse/i }).first();
ok(await browseBtn.count() > 0, 'no control opens the Browse pane');
await browseBtn.click();
await page.waitForSelector('.browse', { timeout: 10000 });
const select = page.getByLabel('Choose a trip to browse');
const options = await select.locator('option').allTextContents();
note(`browse options: ${JSON.stringify(options)}`);
ok(options.some((t) => /Guest Trip/.test(t)),
   'the unopenable trip is not even offered in the Browse pane', options);

const beforeTitle = await page.locator('[data-testid="trip-range"]').first().textContent();
await select.selectOption({ label: 'Guest Trip' });
await page.waitForTimeout(700);

const bannerText = await page.locator('.banner, .error, [role="alert"], .app__error').allTextContents();
note(`banner(s): ${JSON.stringify(bannerText)}`);
ok(bannerText.some((t) => /could not be read|calendar date|days\[2\]/i.test(t)),
   'selecting an unopenable trip to browse produced NO readable error', bannerText);
ok(pageErrors.length === 0, 'the browse failure threw an uncaught page error', pageErrors);

// ---------------------------------------------------------------------------
head('B — the OPEN trip survives the failed browse');
ok(await page.locator('[data-testid="trip-range"]').count() > 0,
   'the failed browse closed the open trip');
ok((await page.locator('[data-testid="trip-range"]').first().textContent()) === beforeTitle,
   'the failed browse REPLACED the open document');
const rows = await page.locator('.browse__row').count();
ok(rows === 0, 'a browse that failed still rendered stops from somewhere', rows);

// ---------------------------------------------------------------------------
head('C — F-D was recorded from the browse path, and the Trips list shows it');
await page.locator('.topbar__brand').click();
await page.waitForSelector('.triplist', { timeout: 15000 });
await page.waitForTimeout(400);
const cards = await page.locator('.tripcard').count();
const chips = await page.locator('[data-testid="row-unreadable"]').count();
const saves = await page.locator('[data-testid="save-copy"]').count();
note(`cards ${cards} · chips ${chips} · save controls ${saves}`);
ok(chips === 1, 'the browse failure did NOT flag exactly one card', chips);
ok(saves === 1, 'the browse failure did NOT offer exactly one rescue control', saves);

// A-47 Part 4's divergence, on screen: the NARROW predicate is still true, so the meta line
// must still be a formatted range and not two raw strings.
const guestCard = page.locator('.tripcard', { hasText: 'Guest Trip' }).first();
const meta = (await guestCard.locator('.tripcard__meta').allTextContents()).join(' | ');
note(`Guest Trip meta line: ${meta}`);
ok(/2027-03-01\s*→\s*2027-03-05/.test(meta),
   'the meta line dropped to raw strings on a row whose own dates are readable', meta);
ok(/could not be read/i.test(await guestCard.textContent()),
   'the flagged card does not carry the chip sentence');

// Delete's warning must carry "save a copy first" for this card.
let ask = null;
page.once('dialog', async (d) => { ask = d.message(); await d.dismiss(); });
await guestCard.getByRole('button', { name: 'Delete' }).click();
await page.waitForTimeout(300);
note(`delete confirm: ${JSON.stringify(ask)}`);
ok(ask !== null && /save a copy first/i.test(ask),
   'Delete on a browse-flagged card is still the ordinary silent confirmation', ask);

// ---------------------------------------------------------------------------
head('D — the rescue copy from that card is byte-identical to the stored bytes');
const dl = page.waitForEvent('download', { timeout: 15000 });
await guestCard.locator('[data-testid="save-copy"]').click();
const download = await dl;
note(`filename: ${download.suggestedFilename()}`);
const path = await download.path();
const got = (await import('node:fs')).readFileSync(path, 'utf8');
ok(got === stored.bytes, 'the rescue copy is NOT the stored bytes',
   { got: got.length, stored: stored.bytes.length });
ok(/\.cairn-unreadable\.json$/.test(download.suggestedFilename()),
   'the rescue filename does not mark the copy as unreadable', download.suggestedFilename());

// ---------------------------------------------------------------------------
head('E — a healthy browse still works, and does not clear the other id');
await page.getByRole('button', { name: /Europe 2026/ }).first().click();
await page.waitForSelector('[data-testid="trip-range"]', { timeout: 15000 });
await page.locator('.topbar__brand').click();
await page.waitForSelector('.triplist', { timeout: 15000 });
await page.waitForTimeout(400);
ok(await page.locator('[data-testid="row-unreadable"]').count() === 1,
   'opening a DIFFERENT healthy trip cleared the browse-recorded failure',
   await page.locator('[data-testid="row-unreadable"]').count());

// …and the session scoping (A-47 Part 8 residue 1) still holds after a browse-recorded failure.
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.triplist', { timeout: 15000 });
await page.waitForTimeout(500);
const afterReload = await page.locator('[data-testid="row-unreadable"]').count();
note(`chips after a reload: ${afterReload}`);
ok(afterReload === 0,
   'a browse-recorded failure SURVIVED a reload — openFailures is being persisted somewhere',
   afterReload);

await browser.close();
console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
process.exit(fails === 0 ? 0 : 1);
