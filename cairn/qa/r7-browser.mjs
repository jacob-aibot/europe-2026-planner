/**
 * Round 7, real Chromium against real IndexedDB — R3-3's fix through the shipped UI, and the
 * reachability of R7-1 ("Merge and save" pressed twice).
 *
 *   §1  the R3-3 scenario end to end: two tabs, tab B refused, tab B presses "Merge and save"
 *       ONCE while its own autosave is unsettled. Both tabs' edits must survive AND the chip
 *       must not read "Not saved — edited elsewhere" over a saved document.
 *   §2  R7-1 — is the "Merge and save" button still in the DOM for a second real click? The
 *       gap is swept (0 / 30 / 80 / 150 ms) rather than guessed, because the button only
 *       leaves the DOM once `mergeWithStored`'s `await load()` resolves and React re-renders.
 *
 * Needs: npm run web:build && node tools/serve.mjs, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r7-browser.mjs
 * A "FAIL" line means the probe found what it was looking for.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();
const stored = (page) => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => {
    const g = r.result.transaction('docs').objectStore('docs').get('trip-europe-2026');
    g.onsuccess = () => res(String(g.result?.doc ?? g.result ?? ''));
  };
}));
const chip = async (page) => {
  const t = await page.locator('body').innerText();
  return (t.split('\n').slice(0, 8).join(' ').match(/Not saved[^\n]*|Saving…|Unsaved changes|Saved/i) || ['?'])[0];
};
const rename = async (page, dayLabel, text) => {
  await page.locator('button').filter({ hasText: dayLabel }).first().click();
  await page.waitForTimeout(300);
  await page.locator('button', { hasText: '✎' }).first().click();
  await page.waitForTimeout(250);
  await page.locator('input').first().fill(text);
  await page.locator('input').first().press('Enter');
};

/** Two tabs on the Europe trip, with tab B refused and holding a fresh unwritten edit. */
async function twoTabsInConflict(ctx) {
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
  await rename(a, /^08-16/, 'A EDIT');
  await a.waitForTimeout(1200);
  await rename(b, /^08-17/, 'B EDIT');
  await b.waitForTimeout(1400);
  return { a, b };
}

// ---------------------------------------------------------------------------
line('1. R3-3 through the UI: one press of "Merge and save" with an autosave unsettled');
{
  const ctx = await browser.newContext();
  const { a, b } = await twoTabsInConflict(ctx);
  const before = await chip(b);
  console.log('  precondition, tab B chip:', JSON.stringify(before));
  ok('precondition: tab B was refused', /Not saved/i.test(before), before);

  // One more keystroke arms tab B's 400 ms autosave, then the button is pressed inside it.
  await rename(b, /^08-17/, 'B EDIT AGAIN');
  await b.waitForTimeout(120);                       // well inside the 400 ms debounce
  await b.getByRole('button', { name: /Merge and save/i }).click();
  await b.waitForTimeout(2500);

  const doc = await stored(b);
  const after = await chip(b);
  console.log(`  storage: A EDIT=${doc.includes('A EDIT')} "B EDIT AGAIN"=${doc.includes('B EDIT AGAIN')}`);
  console.log('  tab B chip after the merge:', JSON.stringify(after));
  ok('the merge kept BOTH tabs\' edits', doc.includes('A EDIT') && doc.includes('B EDIT AGAIN'),
     `A EDIT=${doc.includes('A EDIT')} B EDIT AGAIN=${doc.includes('B EDIT AGAIN')}`);
  ok('the chip does NOT read "Not saved — edited elsewhere" over a saved document',
     !(doc.includes('A EDIT') && doc.includes('B EDIT AGAIN') && /edited elsewhere/i.test(after)),
     `chip=${JSON.stringify(after)}`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
line('2. R7-1 reachability: "Merge and save" pressed twice, gap swept');
for (const gap of [0, 30, 80, 150]) {
  const ctx = await browser.newContext();
  const { b } = await twoTabsInConflict(ctx);
  const btn = b.getByRole('button', { name: /Merge and save/i });
  let secondLanded = false;
  await btn.click();
  if (gap) await b.waitForTimeout(gap);
  try {
    await btn.click({ timeout: 400 });
    secondLanded = true;
  } catch { /* the banner was already gone — the second press could not land */ }
  await b.waitForTimeout(2500);
  const doc = await stored(b);
  const after = await chip(b);
  const merged = doc.includes('A EDIT') && doc.includes('B EDIT');
  console.log(`  gap=${String(gap).padStart(3)}ms  second press landed=${secondLanded}` +
              `  merged=${merged}  chip=${JSON.stringify(after)}`);
  ok(`gap=${gap}ms: the chip agrees with storage`,
     !(merged && /edited elsewhere/i.test(after)),
     `merged=${merged} chip=${JSON.stringify(after)} — R7-1: the second press is refused against a stale expectation and the banner comes back over a fully-saved document`);
  await ctx.close();
}

await browser.close();
console.log(`\n== r7-browser: ${fails} FAIL ==\n`);
