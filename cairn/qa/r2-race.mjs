/**
 * Round 2 — the revision guard's disclosed hole, reproduced in a real browser.
 *
 * `store.save()` is `load → compare → save` with no transaction (BUILD-NOTES §6). Two tabs
 * that edit at roughly the same moment both read the same stored revision, both pass the
 * compare, and the second write destroys the first — with BOTH tabs displaying "Saved".
 * That is the original F-1 symptom, at a smaller window.
 *
 * Needs: npm run web:build && npm run serve, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-race.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const browser = await chromium.launch();

const rename = async (page, dayLabel, text) => {
  await page.locator('button').filter({ hasText: dayLabel }).first().click();
  await page.waitForTimeout(300);
  await page.locator('button', { hasText: '✎' }).first().click();
  await page.waitForTimeout(250);
  await page.locator('input').first().fill(text);
  await page.locator('input').first().press('Enter');
};
const stored = (page) => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => { const g = r.result.transaction('docs').objectStore('docs').get('trip-europe-2026'); g.onsuccess = () => res(String(g.result || '')); };
}));

let losses = 0;
for (let round = 1; round <= 3; round++) {
  const ctx = await browser.newContext();
  const mk = async () => { const p = await ctx.newPage(); await p.route('**tile.openstreetmap.org/**', (r) => r.abort()); return p; };
  const a = await mk();
  await a.goto(URL, { waitUntil: 'domcontentloaded' });
  await a.getByRole('button', { name: /Load Europe 2026/i }).click();
  await a.waitForTimeout(1300);
  const b = await mk();
  await b.goto(URL, { waitUntil: 'domcontentloaded' });
  await b.waitForTimeout(800);
  await b.locator('button').filter({ hasText: /Europe 2026/ }).first().click();
  await b.waitForTimeout(1000);

  const A = `RACE-A-${round}`, B = `RACE-B-${round}`;
  await Promise.all([rename(a, /^08-16/, A), rename(b, /^08-17/, B)]);
  await a.waitForTimeout(2000);

  const doc = await stored(a);
  const aDom = await a.locator('body').innerText();
  const bDom = await b.locator('body').innerText();
  const head = (t) => t.split('\n').slice(0, 6).join(' ');
  const res = {
    round,
    'A in tab A screen': aDom.includes(A),
    'B in tab B screen': bDom.includes(B),
    'A in storage': doc.includes(A),
    'B in storage': doc.includes(B),
    'tab A says': (head(aDom).match(/Saved|Saving|Not saved|error/i) || ['?'])[0],
    'tab B says': (head(bDom).match(/Saved|Saving|Not saved|error/i) || ['?'])[0],
  };
  console.log(JSON.stringify(res));
  const lostA = res['A in tab A screen'] && !res['A in storage'] && /^Saved$/i.test(res['tab A says']);
  const lostB = res['B in tab B screen'] && !res['B in storage'] && /^Saved$/i.test(res['tab B says']);
  if (lostA || lostB) { losses++; console.log(`  round ${round}: an edit shown on screen is NOT in storage and the tab says "Saved"`); }
  await ctx.close();
}
console.log(`\n${losses} of 3 rounds lost an edit silently`);
await browser.close();
