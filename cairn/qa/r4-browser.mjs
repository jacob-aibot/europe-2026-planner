/**
 * Round 4, real Chromium against real IndexedDB.
 *
 *   1. R4-1 — Ctrl-Z, then a DIFFERENT edit, then "Cairn" (closeTrip). `dirty()` compares
 *      `Trip.revision` against `savedRevision`; undo rewinds the revision and the next
 *      edit re-issues it, so `flushForTransition()` skips the write and the edit is gone
 *      with "Saved" on screen. R3-2's symptom, through the counter §2.2a left in place.
 *   2. R4-2 — the page-exit leg BUILD-NOTES §6 says was never run in a browser: hide the
 *      tab (`visibilitychange` -> hidden) inside the debounce window and look for the edit
 *      in IndexedDB.
 *
 * Needs: npm run web:build && node tools/serve.mjs, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-browser.mjs
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
const rev = async (page) => { try { return JSON.parse(await stored(page)).revision; } catch { return null; } };
const indicator = async (page) => {
  const t = await page.locator('body').innerText();
  return (t.split('\n').slice(0, 6).join(' ').match(/Not saved[^\n]*|Saving…|Saved/i) || ['?'])[0];
};
const rename = async (page, dayLabel, text) => {
  await page.locator('button').filter({ hasText: dayLabel }).first().click();
  await page.waitForTimeout(300);
  await page.locator('button', { hasText: '✎' }).first().click();
  await page.waitForTimeout(250);
  await page.locator('input').first().fill(text);
  await page.locator('input').first().press('Enter');
};
const boot = async (ctx) => {
  const p = await ctx.newPage();
  await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: /Load Europe 2026/i }).click();
  await p.waitForTimeout(1800);
  return p;
};

// ---------------------------------------------------------------------------
line('1. R4-1: Ctrl-Z, a different edit, then "Cairn" — one tab, no race');
{
  const ctx = await browser.newContext();
  const p = await boot(ctx);

  await rename(p, /^08-16/, 'EDIT A');
  await p.waitForTimeout(1400);
  console.log('  after EDIT A saved: stored revision', await rev(p), '| indicator', JSON.stringify(await indicator(p)),
              '| stored has EDIT A =', (await stored(p)).includes('EDIT A'));

  // The loss window is the 400 ms debounce that follows the undo, so the second edit has
  // to be a SINGLE CLICK: DayTimeline.tsx:161's ↓ reorder button, which is one dispatch.
  // Ctrl-Z and the click go into the same batch of input, which is what "undo, then nudge
  // a stop" looks like from a keyboard.
  const stopOrderBefore = await p.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const g = r.result.transaction('docs').objectStore('docs').get('trip-europe-2026');
      g.onsuccess = () => { const d = JSON.parse(g.result); res(d.days.find((x) => x.date === '2026-08-16').stops.map((s) => s.id).join(',')); };
    };
  }));
  await p.keyboard.press('Control+z');            // back to the pre-EDIT-A snapshot
  await p.locator('button', { hasText: '↓' }).first().click();   // ~0 ms later: one dispatch
  await p.locator('button.topbar__brand').click();               // ~0 ms later: closeTrip
  await p.waitForTimeout(2500);

  const doc = await stored(p);
  const dom = await p.locator('body').innerText();
  const stopOrderAfter = JSON.parse(doc).days.find((x) => x.date === '2026-08-16').stops.map((s) => s.id).join(',');
  console.log('  library shown =', /Europe 2026/.test(dom));
  console.log('  stop order before =', stopOrderBefore.slice(0, 60));
  console.log('  stop order after  =', stopOrderAfter.slice(0, 60));
  console.log('  stored revision now', await rev(p));
  console.log('  anything on screen about an unsaved edit =', /unsaved|not saved|discard/i.test(dom) ? 'yes' : 'NOTHING');
  ok('the reorder survived the click, or the user was told it did not',
     stopOrderAfter !== stopOrderBefore || /unsaved|not saved|discard/i.test(dom),
     'the reorder is gone from IndexedDB and nothing on screen says so');
  await ctx.close();
}

// ---------------------------------------------------------------------------
line('2. R4-2: hide the tab inside the debounce window (BUILD-NOTES §6: never run)');
{
  const ctx = await browser.newContext();
  const p = await boot(ctx);

  await rename(p, /^08-17/, 'TYPED THEN TAB HIDDEN');
  // visibilitychange -> hidden, immediately, inside the 400 ms debounce.
  await p.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await p.waitForTimeout(2000);
  const doc = await stored(p);
  console.log('  the edit is in IndexedDB =', doc.includes('TYPED THEN TAB HIDDEN'));
  ok('hiding the tab flushed the pending edit to IndexedDB', doc.includes('TYPED THEN TAB HIDDEN'),
     'visibilitychange -> hidden did not land the edit');
  await ctx.close();
}

// ---------------------------------------------------------------------------
line('3. R4-2b: pagehide inside the debounce window');
{
  const ctx = await browser.newContext();
  const p = await boot(ctx);
  await rename(p, /^08-18/, 'TYPED THEN PAGEHIDE');
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await p.waitForTimeout(2000);
  const doc = await stored(p);
  console.log('  the edit is in IndexedDB =', doc.includes('TYPED THEN PAGEHIDE'));
  ok('pagehide flushed the pending edit to IndexedDB', doc.includes('TYPED THEN PAGEHIDE'),
     'pagehide did not land the edit');
  await ctx.close();
}

// ---------------------------------------------------------------------------
line('4. R4-2c: hide the tab AFTER an undo-recycled revision (1 and 2 combined)');
{
  const ctx = await browser.newContext();
  const p = await boot(ctx);
  await rename(p, /^08-16/, 'V1');
  await p.waitForTimeout(1400);
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(1400);
  await rename(p, /^08-16/, 'V2 — MUST SURVIVE');
  await p.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await p.waitForTimeout(2000);
  const doc = await stored(p);
  console.log('  V2 is in IndexedDB =', doc.includes('V2'));
  ok('an explicit flush() still writes even when dirty() says clean', doc.includes('V2'),
     'flush() is unconditional, so this one should pass — if it does not, the loss is wider than R4-1');
  await ctx.close();
}

console.log('');
await browser.close();
