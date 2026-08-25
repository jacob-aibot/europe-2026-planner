/**
 * Round 2 — a stop returned to the pool from a `transit` day vanishes from every view.
 *
 * Repro, in the real app: open Europe 2026 → day 08-07 → press ⇩ ("Back to the optional
 * list") on any stop → the stop leaves the timeline and appears in NO Optional panel,
 * because `returnToPool` files it under `day.primaryCity === 'transit'` and `PoolPanel`
 * only ever renders `poolFor(trip, ui.activeCityKey ?? trip.cities[0].key)` — and
 * `'transit'` is never in `trip.cities`, so it can never be the active city.
 *
 * Needs: npm run web:build && npm run serve, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-poolloss.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
await page.getByRole('button', { name: /Load Europe 2026/i }).click();
await page.waitForTimeout(1200);

line('day 08-07 (primaryCity = transit)');
await page.locator('button').filter({ hasText: /^08-07/ }).first().click();
await page.waitForTimeout(400);
const stopsBefore = await page.locator('.stop__name').allInnerTexts();
console.log('  stops on 08-07:', JSON.stringify(stopsBefore));

const victim = stopsBefore[0];
await page.locator('.stop').first().locator('button', { hasText: '⇩' }).first().click();
await page.waitForTimeout(600);
const stopsAfter = await page.locator('.stop__name').allInnerTexts();
console.log('  stops on 08-07 after ⇩:', JSON.stringify(stopsAfter));
console.log('  removed:', JSON.stringify(victim));

line('hunt for it in the Optional panel under every selectable group');
const groups = page.locator('.spine__city, .sidebar .city, nav .city');
const names = await page.locator('.spine__city, .sidebar .city, nav .city').allInnerTexts().catch(() => []);
console.log('  city groups:', JSON.stringify(names.map((t) => t.split('\n')[0])));
let found = false;
const count = await groups.count();
for (let i = 0; i < count; i++) {
  await groups.nth(i).click().catch(() => {});
  await page.waitForTimeout(200);
  await page.getByRole('tab', { name: /^Optional/ }).first().click().catch(() => {});
  await page.waitForTimeout(200);
  const t = await page.locator('.panel').first().innerText().catch(() => '');
  if (t.includes(victim)) { found = true; console.log(`  FOUND under group ${i}`); }
}
// Also every city button anywhere in the page.
const anyCity = page.locator('button').filter({ hasText: /Vienna|Dubrovnik|Split|Prague|Budapest|London|transit/i });
for (let i = 0; i < await anyCity.count(); i++) {
  await anyCity.nth(i).click().catch(() => {});
  await page.waitForTimeout(150);
  await page.getByRole('tab', { name: /^Optional/ }).first().click().catch(() => {});
  const t = await page.locator('.panel').first().innerText().catch(() => '');
  if (t.includes(victim)) { found = true; console.log(`  FOUND under city button ${i}: ${(await anyCity.nth(i).innerText()).split('\n')[0]}`); }
}
console.log(`  ${found ? 'ok   the stop is reachable again' : 'FAIL the stop is in no Optional panel — unreachable from the UI'}`);

line('it is still in the document, and the Optional tab count knows it');
const optionalTab = await page.getByRole('tab', { name: /^Optional/ }).first().innerText();
console.log('  Optional tab reads:', JSON.stringify(optionalTab.replace(/\n/g, ' ')));
const persisted = await page.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); });
  const rows = await new Promise((res) => { const r = db.transaction('docs').objectStore('docs').getAll(); r.onsuccess = () => res(r.result); });
  return rows.map((row) => {
    const doc = JSON.parse(typeof row === 'string' ? row : (row.doc ?? row.text ?? JSON.stringify(row)));
    return (doc.pool || []).filter((p) => p.placement.cityKey === 'transit').map((p) => p.name);
  });
});
console.log('  pool entries filed under "transit" in IndexedDB:', JSON.stringify(persisted));
console.log('  validation panel says:');
await page.getByRole('tab', { name: /^Validation/ }).first().click().catch(() => {});
await page.waitForTimeout(300);
console.log('   ', (await page.locator('.panel').first().innerText().catch(() => '')).slice(0, 200).replace(/\n/g, ' | '));
await browser.close();
