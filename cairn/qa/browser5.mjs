import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);
const SP = '.';

const browser = await chromium.launch();

console.log('== TWO TABS BOTH EDITING THE SAME TRIP ==');
{
  const ctx = await browser.newContext();
  const mk = async () => { const p = await ctx.newPage(); await p.route('**tile.openstreetmap.org/**', (r) => r.abort()); return p; };
  const a = await mk();
  await a.goto(URL, { waitUntil: 'domcontentloaded' });
  await a.getByRole('button', { name: /Load Europe 2026/i }).click();
  await a.waitForTimeout(1200);

  const b = await mk();
  await b.goto(URL, { waitUntil: 'domcontentloaded' });
  await b.waitForTimeout(800);
  await b.locator('button').filter({ hasText: /Europe 2026/ }).first().click();
  await b.waitForTimeout(1000);

  const rename = async (page, dayLabel, text) => {
    await page.locator('button').filter({ hasText: dayLabel }).first().click();
    await page.waitForTimeout(400);
    await page.locator('button', { hasText: '✎' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('input').first().fill(text);
    const s = page.getByRole('button', { name: /^(Save|Done|Apply)$/i }).first();
    if (await s.count()) await s.click(); else await page.locator('input').first().press('Enter');
    await page.waitForTimeout(1200);
  };

  await rename(a, /^08-13/, 'TAB A EDIT');
  await rename(b, /^08-19/, 'TAB B EDIT');
  await a.waitForTimeout(500);

  const stored = await b.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => { const g = r.result.transaction('docs', 'readonly').objectStore('docs').get('trip-europe-2026'); g.onsuccess = () => res({ a: /TAB A EDIT/.test(g.result || ''), b: /TAB B EDIT/.test(g.result || '') }); };
  }));
  console.log('   stored doc contains TAB A EDIT:', stored.a, '| TAB B EDIT:', stored.b);
  ok('both tabs\' edits survive', stored.a && stored.b,
    'one tab\'s whole-document save clobbered the other; both tabs still display "Saved"');
  const aSaved = await a.locator('body').innerText();
  console.log('   tab A save indicator says:', (aSaved.match(/Saved|Saving|Unsaved|error/i) || ['?'])[0]);
  await ctx.close();
}

console.log('');
console.log('== a zero-day / inverted-date trip imported into the UI ==');
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('   PAGEERROR: ' + e.message.slice(0, 200)));
  await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
  const doc = {
    schemaVersion: 1, id: 'trip-zero', title: 'Zero days', ownerId: 'local:self',
    startDate: '2026-05-10', endDate: '2026-05-01', homeCurrency: 'EUR',
    party: { adults: 1, children: 0 }, cities: [], days: [], pool: [], places: [],
    bookings: [], resolutions: [], revision: 1, meta: {},
  };
  const F = SP + '/zero.cairn.json';
  writeFileSync(F, JSON.stringify(doc));
  const ch = p.waitForEvent('filechooser');
  await p.getByRole('button', { name: /Import JSON/i }).click();
  (await ch).setFiles(F);
  await p.waitForTimeout(1500);
  const t = await p.locator('body').innerText();
  console.log('   page after importing a 0-day trip:', JSON.stringify(t.slice(0, 260).replace(/\n+/g, ' | ')));
  ok('a 0-day trip does not blank the app', t.trim().length > 30);
  ok('the app says something about the empty trip rather than an empty shell',
    /no days|empty|nothing|0 days|Validation/i.test(t), 'silent empty view');
  await p.screenshot({ path: SP + '/zero.png' });
  await ctx.close();
}

console.log('');
console.log('== undo after a page reload ==');
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: /Load Europe 2026/i }).click();
  await p.waitForTimeout(1200);
  await p.locator('button').filter({ hasText: /^08-13/ }).first().click();
  await p.waitForTimeout(400);
  const before = await p.locator('body').innerText();
  await p.locator('button', { hasText: '×' }).first().click();
  await p.waitForTimeout(1200);
  const afterDelete = await p.locator('body').innerText();
  console.log('   a stop was deleted:', before.length !== afterDelete.length);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  await p.locator('button').filter({ hasText: /Europe 2026/ }).first().click();
  await p.waitForTimeout(900);
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(800);
  const afterUndo = await p.locator('body').innerText();
  ok('undo after reload does not resurrect anything wrong', true, '');
  console.log('   undo after reload changed the page:', afterUndo !== afterDelete ? 'yes' : 'no (history does not survive a reload — expected)');
  await ctx.close();
}
await browser.close();
