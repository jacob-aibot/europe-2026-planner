/**
 * Round 2, attack 1c — the Browse & copy pane driven in real Chromium, over real elapsed
 * time (no --virtual-time-budget: virtual time stalls the app at "Opening your trips…"
 * because IndexedDB never settles).
 *
 * Needs: npm run web:build && npm run serve, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-browser.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.route('**tile.openstreetmap.org/**', (r) => r.abort());

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);

line('load the sample, then create a second trip');
await page.getByRole('button', { name: /Load Europe 2026/i }).click();
await page.waitForTimeout(900);
console.log('  active trip:', (await page.locator('h1, .trip__title').first().innerText().catch(() => '?')).slice(0, 60));
// Back to the library and make a second trip.
await page.locator('.topbar__brand').click();
await page.waitForTimeout(500);
const bodyNow = await page.locator('body').innerText();
console.log('  library screen?', /New trip|Create|Load Europe/i.test(bodyNow));
const newTripBtn = page.getByRole('button', { name: /^New trip$/ }).first();
if (await newTripBtn.count()) {
  await newTripBtn.click();
  await page.waitForTimeout(400);
  const inputs = page.locator('form input, .wizard input');
  const n = await inputs.count();
  console.log('  new-trip fields:', n);
  if (n >= 3) {
    await inputs.nth(0).fill('Marta trip');
    await inputs.nth(1).fill('2026-09-01');
    await inputs.nth(2).fill('2026-09-03');
    if (n >= 4) await inputs.nth(3).fill('lisbon');
  }
  const create = page.getByRole('button', { name: /^Create$/ }).first();
  await create.click();
  await page.waitForTimeout(900);
}
console.log('  after create, body head:', (await page.locator('body').innerText()).slice(0, 120).replace(/\n/g, ' | '));

line('open the Browse pane and copy one stop');
const browseTab = page.getByRole('tab', { name: /Browse & copy/ }).first();
console.log('  browse control found:', await browseTab.count());
await browseTab.click();
await page.waitForTimeout(500);
const select = page.locator('select[aria-label="Choose a trip to browse"]');
console.log('  browse select found:', await select.count());
const options = await select.locator('option').allInnerTexts();
console.log('  options:', JSON.stringify(options));
await select.selectOption({ index: 1 });
await page.waitForTimeout(800);
const rows = page.locator('.browse__row');
console.log('  browsable stops listed:', await rows.count());
const firstRowText = await rows.first().innerText();
console.log('  first row:', JSON.stringify(firstRowText.replace(/\n/g, ' ')));
await rows.first().getByRole('button', { name: /Copy/ }).click();
await page.waitForTimeout(600);

line('what does the copied stop render as?');
await page.getByRole('tab', { name: /^Day/ }).first().click();
await page.waitForTimeout(500);
const timeline = await page.locator('body').innerText();
const credits = await page.locator('.stop__credit').allInnerTexts();
const pills = await page.locator('.pill').allInnerTexts();
console.log('  credit lines:', JSON.stringify(credits));
console.log('  badges on the page:', JSON.stringify([...new Set(pills)].slice(0, 12)));
ok('the copied stop shows a "from a friend" badge', pills.includes('from a friend'), JSON.stringify(pills.slice(0, 8)));
ok('the copied stop shows a credit line', credits.length > 0);

line('return the copied stop to the POOL and look again (§2.14 rule 7)');
const dump = await page.locator('.stop').first().innerHTML();
const poolBtn = page.locator('.stop').filter({ hasText: /.*/ }).last().locator('button[title*="pool" i], button:has-text("⇩")').first();
console.log('  return-to-pool control found:', await poolBtn.count());
if (await poolBtn.count()) {
  await poolBtn.click();
  await page.waitForTimeout(600);
  await page.getByRole('tab', { name: /^Optional/ }).first().click();
  await page.waitForTimeout(500);
  const cityBtns = await page.locator('.sidebar button, .spine button').allInnerTexts();
  console.log('  sidebar groups:', JSON.stringify([...new Set(cityBtns.map((t) => t.split('\n')[0]))].slice(0, 8)));
  const poolText = await page.locator('.panel, .pool').first().innerText().catch(() => '');
  const poolCredits = await page.locator('.pool .stop__credit, .pool__item .stop__credit').allInnerTexts();
  console.log('  pool panel text:', JSON.stringify(poolText.slice(0, 260).replace(/\n/g, ' | ')));
  ok('the pool item still renders its credit line', poolCredits.length > 0,
    'PoolPanel renders the badge but never `attribution` — §2.14 rule 7 says any view that renders the record renders the credit');
  // Try every selectable city group, then read the persisted document out of IndexedDB.
  const groups = page.locator('.city, .sidebar .city button, .spine__city');
  console.log('  city groups clickable:', await groups.count());
  for (let i = 0; i < await groups.count(); i++) {
    await groups.nth(i).click().catch(() => {});
    await page.waitForTimeout(200);
    await page.getByRole('tab', { name: /^Optional/ }).first().click().catch(() => {});
    const t = await page.locator('.panel').first().innerText().catch(() => '');
    console.log(`   group ${i}: ${JSON.stringify(t.slice(0, 90).replace(/\n/g, ' | '))}`);
  }
  const stored = await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    const out = [];
    for (const d of dbs) {
      const db = await new Promise((res, rej) => { const r = indexedDB.open(d.name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      for (const s of [...db.objectStoreNames]) {
        const rows = await new Promise((res) => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => res(r.result); });
        out.push([d.name, s, rows.length, JSON.stringify(rows).length]);
      }
    }
    return out;
  });
  console.log('  IndexedDB:', JSON.stringify(stored));
  const poolDump = await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); });
    const store = [...db.objectStoreNames][0];
    const rows = await new Promise((res) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result); });
    return rows.map((row) => { const doc = JSON.parse(typeof row === 'string' ? row : (row.doc ?? row.text ?? JSON.stringify(row))); return [doc.id, doc.title, (doc.pool || []).map((p) => [p.name, p.placement.cityKey, p.provenance.source])]; });
  }).catch((e) => 'evaluate failed: ' + e.message);
  console.log('  persisted pools:', JSON.stringify(poolDump));
}

line('reload out of IndexedDB');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
const after = await page.locator('body').innerText();
console.log('  after reload, first 200 chars:', JSON.stringify(after.slice(0, 200).replace(/\n/g, ' | ')));

line('sensitive strings in the running page');
const html = await page.content();
for (const s of ['PIN 0754', '5814731574', 'YZGDTS', 'IU1TUY', 'ulaznice.hr', 'cityairporttrain']) {
  console.log(`  ${s}: ${html.includes(s) ? 'PRESENT' : 'absent'}`);
}

line('page errors');
console.log(errors.length ? errors.slice(0, 8).join('\n  ') : '  (none)');
await browser.close();
