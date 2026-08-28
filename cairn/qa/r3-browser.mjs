/**
 * Round 3, in a real browser against a real IndexedDB — the two blockers the plain-Node
 * probes found in the a746d75 fix.
 *
 *   1. Ctrl-Z lowers the stored revision, so the CAS lets a tab that was correctly in
 *      'conflict' back in. Both tabs then display "Saved" over different documents —
 *      the exact R2-1 symptom, through the guard that was added to close it.
 *   2. An edit made inside the 400 ms autosave debounce is discarded, with no warning,
 *      when the user clicks the "Cairn" brand button (App.tsx:46 -> store.closeTrip()).
 *
 * Needs: npm run web:build && node tools/serve.mjs, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-browser.mjs
 * A "FAIL" line means the probe found what it was looking for.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();
const stored = (page) => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => {
    const g = r.result.transaction('docs').objectStore('docs').get('trip-europe-2026');
    g.onsuccess = () => res(String(g.result || ''));
  };
}));
const rev = async (page) => {
  const t = await stored(page);
  try { return JSON.parse(t).revision; } catch { return null; }
};
/** The §2.2a envelope fence, read straight out of the `versions` object store. */
const fence = (page) => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => {
    const g = r.result.transaction('versions').objectStore('versions').get('trip-europe-2026');
    g.onsuccess = () => res(String(g.result ?? ''));
  };
}));
const rename = async (page, dayLabel, text) => {
  await page.locator('button').filter({ hasText: dayLabel }).first().click();
  await page.waitForTimeout(300);
  await page.locator('button', { hasText: '✎' }).first().click();
  await page.waitForTimeout(250);
  await page.locator('input').first().fill(text);
  await page.locator('input').first().press('Enter');
};
const indicator = async (page) => {
  const t = await page.locator('body').innerText();
  return (t.split('\n').slice(0, 6).join(' ').match(/Not saved[^\n]*|Saving…|Saved/i) || ['?'])[0];
};

// ---------------------------------------------------------------------------
line('1. Ctrl-Z lowers the stored revision and lets a conflicting tab back in');
{
  const ctx = await browser.newContext();
  const mk = async () => { const p = await ctx.newPage(); await p.route('**tile.openstreetmap.org/**', (r) => r.abort()); return p; };
  const a = await mk();
  await a.goto(URL, { waitUntil: 'domcontentloaded' });
  await a.getByRole('button', { name: /Load Europe 2026/i }).click();
  await a.waitForTimeout(1500);

  const b = await mk();
  await b.goto(URL, { waitUntil: 'domcontentloaded' });
  await b.waitForTimeout(900);
  await b.locator('button').filter({ hasText: /Europe 2026/ }).first().click();
  await b.waitForTimeout(1200);
  const agreed = await fence(a);
  console.log('  both tabs opened at stored revision', await rev(a), '| fence', JSON.stringify(agreed));

  // Tab A edits and saves; tab B, which was already open, then edits and is refused.
  await rename(a, /^08-16/, 'A EDIT');
  await a.waitForTimeout(1200);
  await rename(b, /^08-17/, 'B EDIT');
  await b.waitForTimeout(1200);
  const bSays = await indicator(b);
  console.log('  after B is refused: tab B says', JSON.stringify(bSays), '| stored revision', await rev(a));
  ok('precondition: tab B was told', /Not saved/i.test(bSays), bSays);

  // Tab A presses Ctrl-Z.
  await a.keyboard.press('Control+z');
  await a.waitForTimeout(1500);
  const afterUndo = await fence(a);
  console.log('  after tab A pressed Ctrl-Z: stored revision', await rev(a), '| fence', JSON.stringify(afterUndo),
              '(tab B still expects', JSON.stringify(agreed) + ')');
  // §2.2a: `Trip.revision` may rewind — it is content. The FENCE may not be re-issued.
  ok('the StorageVersion fence is never re-issued', afterUndo !== agreed && afterUndo !== '',
     `${agreed} -> ${afterUndo}`);

  // Tab B types again — every keystroke reschedules its autosave.
  await rename(b, /^08-17/, 'B EDIT AGAIN');
  await b.waitForTimeout(1500);
  const doc = await stored(a);
  const aSays = await indicator(a);
  const bSays2 = await indicator(b);
  const aDom = await a.locator('body').innerText();
  console.log(`  storage now contains: A EDIT=${doc.includes('A EDIT')} B EDIT AGAIN=${doc.includes('B EDIT AGAIN')}`);
  console.log(`  tab A says ${JSON.stringify(aSays)}; tab B says ${JSON.stringify(bSays2)}`);
  ok('two tabs do not both display "Saved" over different documents',
     !(/^Saved$/i.test(aSays) && /^Saved$/i.test(bSays2) && doc.includes('B EDIT AGAIN') && aDom.includes('08-16')),
     'tab B was let back in by a recycled revision, and both tabs read "Saved" — R2-1, reopened');
  await ctx.close();
}

// ---------------------------------------------------------------------------
line('2. an edit inside the 400 ms debounce, then a click on "Cairn" (closeTrip)');
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: /Load Europe 2026/i }).click();
  await p.waitForTimeout(1500);

  await p.locator('button').filter({ hasText: /^08-16/ }).first().click();
  await p.waitForTimeout(300);
  await p.locator('button', { hasText: '✎' }).first().click();
  await p.waitForTimeout(250);
  await p.locator('input').first().fill('TYPED THEN CLICKED AWAY');
  await p.locator('input').first().press('Enter');
  // No wait: click the brand button immediately, well inside the 400 ms debounce.
  await p.locator('button.topbar__brand').click();
  await p.waitForTimeout(2000);

  const doc = await stored(p);
  const dom = await p.locator('body').innerText();
  console.log('  after closing: the library is shown =', /Europe 2026/.test(dom));
  console.log('  the edit is in storage =', doc.includes('TYPED THEN CLICKED AWAY'));
  console.log('  anything on screen about an unsaved edit =',
              /unsaved|not saved|discard/i.test(dom) ? 'yes' : 'NOTHING');
  ok('the edit survived the click, or the user was told it did not',
     doc.includes('TYPED THEN CLICKED AWAY') || /unsaved|not saved|discard/i.test(dom),
     'the edit is gone from storage and nothing on screen says so');
  await ctx.close();
}

console.log('');
await browser.close();
