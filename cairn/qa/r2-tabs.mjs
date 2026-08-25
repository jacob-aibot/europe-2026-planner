/**
 * Round 2 — the revision guard (F-1) against the NEW contract: the second writer must be
 * refused, must not say "Saved", and must offer an explicit merge. Then the race the
 * builder discloses: load → compare → save with no transaction.
 *
 * Needs: npm run web:build && npm run serve, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-tabs.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');
const browser = await chromium.launch();

const rename = async (page, dayLabel, text) => {
  await page.locator('button').filter({ hasText: dayLabel }).first().click();
  await page.waitForTimeout(400);
  await page.locator('button', { hasText: '✎' }).first().click();
  await page.waitForTimeout(300);
  await page.locator('input').first().fill(text);
  const s = page.getByRole('button', { name: /^(Save|Done|Apply)$/i }).first();
  if (await s.count()) await s.click(); else await page.locator('input').first().press('Enter');
  await page.waitForTimeout(1100);
};
const stored = (page) => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => { const g = r.result.transaction('docs').objectStore('docs').get('trip-europe-2026'); g.onsuccess = () => res(String(g.result || '')); };
}));

line('two tabs, sequential edits — the loser must be refused and must say so');
const ctx = await browser.newContext();
const mk = async () => { const p = await ctx.newPage(); await p.route('**tile.openstreetmap.org/**', (r) => r.abort()); return p; };
const a = await mk();
await a.goto(URL, { waitUntil: 'domcontentloaded' });
await a.getByRole('button', { name: /Load Europe 2026/i }).click();
await a.waitForTimeout(1300);
const b = await mk();
await b.goto(URL, { waitUntil: 'domcontentloaded' });
await b.waitForTimeout(900);
await b.locator('button').filter({ hasText: /Europe 2026/ }).first().click();
await b.waitForTimeout(1100);

await rename(a, /^08-13/, 'TAB A EDIT');
await rename(b, /^08-19/, 'TAB B EDIT');
await a.waitForTimeout(600);
const doc1 = await stored(b);
console.log('  stored has A:', /TAB A EDIT/.test(doc1), '| has B:', /TAB B EDIT/.test(doc1));
const bText = await b.locator('body').innerText();
console.log('  tab B banner:', JSON.stringify((bText.match(/This trip was saved somewhere else[^\n]*/) || ['(none)'])[0].slice(0, 140)));
console.log('  tab B indicator:', JSON.stringify((bText.match(/\b(Saved|Saving…?|Unsaved|Not saved|Conflict|error)\b/i) || ['?'])[0]));
ok('the losing tab does NOT display "Saved"', !/\bSaved\b/.test(bText.split('\n').slice(0, 6).join(' ')), bText.slice(0, 120).replace(/\n/g, ' | '));
const mergeBtn = b.getByRole('button', { name: /Merge and save/i });
ok('the losing tab offers an explicit merge', await mergeBtn.count() > 0);

line('press Merge and save — both edits must survive');
if (await mergeBtn.count()) {
  await mergeBtn.first().click();
  await b.waitForTimeout(1500);
  const doc2 = await stored(b);
  console.log('  stored has A:', /TAB A EDIT/.test(doc2), '| has B:', /TAB B EDIT/.test(doc2));
  ok('merge keeps both tabs\' work', /TAB A EDIT/.test(doc2) && /TAB B EDIT/.test(doc2));
  const after = await b.locator('body').innerText();
  console.log('  tab B after merge:', JSON.stringify(after.slice(0, 160).replace(/\n/g, ' | ')));
}

line('now tab A keeps editing, unaware — does it clobber the merged document?');
await rename(a, /^08-14/, 'TAB A SECOND EDIT');
await a.waitForTimeout(800);
const doc3 = await stored(a);
console.log('  stored has A1:', /TAB A EDIT/.test(doc3), '| A2:', /TAB A SECOND EDIT/.test(doc3), '| B:', /TAB B EDIT/.test(doc3));
const aText = await a.locator('body').innerText();
console.log('  tab A indicator:', JSON.stringify((aText.match(/\b(Saved|Saving…?|Unsaved|Conflict|error)\b/i) || ['?'])[0]));
ok('tab A cannot silently destroy the merged result', !( /TAB A SECOND EDIT/.test(doc3) && !/TAB B EDIT/.test(doc3) ),
  'tab A wrote over the merge and B\'s edit is gone');

line('the disclosed race: two tabs saving inside the same instant');
const c1 = await mk(); const c2 = await mk();
for (const p of [c1, c2]) { await p.goto(URL, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700); await p.locator('button').filter({ hasText: /Europe 2026/ }).first().click(); await p.waitForTimeout(900); }
await Promise.all([rename(c1, /^08-16/, 'RACE ONE'), rename(c2, /^08-17/, 'RACE TWO')]);
await c1.waitForTimeout(1200);
const doc4 = await stored(c1);
console.log('  stored has RACE ONE:', /RACE ONE/.test(doc4), '| RACE TWO:', /RACE TWO/.test(doc4));
const t1 = await c1.locator('body').innerText(); const t2 = await c2.locator('body').innerText();
const saysSaved = (t) => /Saved/.test(t.split('\n').slice(0, 6).join(' '));
console.log('  tab1 says Saved:', saysSaved(t1), '| tab2 says Saved:', saysSaved(t2));
const lost = (/RACE ONE/.test(doc4) ? 0 : 1) + (/RACE TWO/.test(doc4) ? 0 : 1);
ok('no edit was lost silently', lost === 0 || !(saysSaved(t1) && saysSaved(t2)),
  `${lost} edit(s) missing from storage while both tabs display "Saved"`);
await browser.close();
