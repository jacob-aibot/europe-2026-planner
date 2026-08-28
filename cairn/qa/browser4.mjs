import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);
const SP = '.';

// The stale export: the sample trip exactly as generated, before any edit.
const sample = readFileSync('../apps/web/src/sample/europe2026.json', 'utf8').trim();
const STALE = SP + '/stale-europe-2026.cairn.json';
writeFileSync(STALE, sample);
const staleTitle = JSON.parse(sample).days.find((d) => d.id === '2026-08-13').title;
console.log('stale file trip id:', JSON.parse(sample).id, '| its 08-13 title:', JSON.stringify(staleTitle));

const browser = await chromium.launch();
const ctx = await browser.newContext();
const mk = async () => { const p = await ctx.newPage(); await p.route('**tile.openstreetmap.org/**', (r) => r.abort()); return p; };

// TAB 2 opens first, on an empty library.
const tab2 = await mk();
await tab2.goto(URL, { waitUntil: 'domcontentloaded' });
await tab2.waitForTimeout(800);
console.log('tab2 booted with an empty library:', /Nothing here yet/.test(await tab2.locator('body').innerText()));

// TAB 1 loads the sample and makes a real edit.
const tab1 = await mk();
await tab1.goto(URL, { waitUntil: 'domcontentloaded' });
await tab1.getByRole('button', { name: /Load Europe 2026/i }).click();
await tab1.waitForTimeout(1000);
await tab1.locator('button').filter({ hasText: /^08-13/ }).first().click();
await tab1.waitForTimeout(400);
// Edit the first stop's name through the stop editor (the pencil button).
await tab1.locator('button', { hasText: '✎' }).first().click();
await tab1.waitForTimeout(400);
const nameInput = tab1.locator('input').first();
await nameInput.fill('JACOBS REAL PLAN — do not lose this');
const saveBtn = tab1.getByRole('button', { name: /^(Save|Done|Apply)$/i }).first();
if (await saveBtn.count()) await saveBtn.click();
else await nameInput.press('Enter');
await tab1.waitForTimeout(1200);
const tab1Text = await tab1.locator('body').innerText();
ok('tab1 edit is on screen', /JACOBS REAL PLAN/.test(tab1Text));
const stored1 = await tab1.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => { const g = r.result.transaction('docs', 'readonly').objectStore('docs').getAll(); g.onsuccess = () => res(g.result.map((d) => (typeof d === 'string' ? d.length : 0))); };
}));
console.log('   docs in IndexedDB after tab1 edit:', stored1);
const has1 = await tab1.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => { const g = r.result.transaction('docs', 'readonly').objectStore('docs').get('trip-europe-2026'); g.onsuccess = () => res(/JACOBS REAL PLAN/.test(g.result || '')); };
}));
ok('tab1 edit is persisted to IndexedDB', has1);

// TAB 2 — library still the empty snapshot from its own boot — imports the stale file.
console.log('');
console.log('== tab2 imports the stale export ==');
const chooser = tab2.waitForEvent('filechooser');
await tab2.getByRole('button', { name: /Import JSON/i }).click();
const fc = await chooser;
await fc.setFiles(STALE);
await tab2.waitForTimeout(1500);
const tab2Text = await tab2.locator('body').innerText();
console.log('   tab2 now shows trip:', tab2Text.split('\n').slice(0, 3).join(' | '));

const after = await tab2.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => {
    const tx = r.result.transaction('docs', 'readonly');
    const g = tx.objectStore('docs').getAll();
    const k = tx.objectStore('docs').getAllKeys();
    g.onsuccess = () => { k.onsuccess = () => res({ keys: k.result, jacob: g.result.some((d) => /JACOBS REAL PLAN/.test(d || '')) }); };
  };
}));
console.log('   doc keys in IndexedDB now:', after.keys);
ok("tab1's edit still exists in storage after tab2's import", after.jacob,
  "tab2's import wrote over trip-europe-2026 and the edit is gone — keys: " + JSON.stringify(after.keys));

// And what tab1 shows when it saves again / reloads.
await tab1.reload({ waitUntil: 'domcontentloaded' });
await tab1.waitForTimeout(1200);
const card = tab1.locator('button').filter({ hasText: /Europe 2026/ }).first();
if (await card.count()) { await card.click(); await tab1.waitForTimeout(900); }
const reloaded = await tab1.locator('body').innerText();
ok('after a reload, tab1 still sees its edit', /JACOBS REAL PLAN/.test(reloaded),
  'the edit is gone from the reloaded app');
await tab1.screenshot({ path: SP + '/after-import.png' });
await browser.close();
