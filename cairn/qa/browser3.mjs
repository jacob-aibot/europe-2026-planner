import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);
const browser = await chromium.launch();
const ctx = await browser.newContext();

async function newPage() {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('   PAGEERROR: ' + e.message.slice(0, 160)));
  await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
  return p;
}

const page = await newPage();
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /Load Europe 2026/i }).click();
await page.waitForTimeout(1200);

console.log('== map bounds actually applied on Aug 8 ==');
await page.locator('button').filter({ hasText: /^08-08/ }).first().click();
await page.waitForTimeout(800);
const bounds = await page.evaluate(() => {
  const el = document.querySelector('.leaflet-container');
  const key = Object.keys(el).find((k) => k.startsWith('__') || k.startsWith('_leaflet'));
  // Leaflet stores the map on the container via an internal id; use the marker positions instead.
  const pins = [...document.querySelectorAll('.leaflet-marker-icon')].map((m) => m.getBoundingClientRect());
  const box = el.getBoundingClientRect();
  const inside = pins.filter((p) => p.left >= box.left - 40 && p.right <= box.right + 40 && p.top >= box.top - 40 && p.bottom <= box.bottom + 40);
  return { pins: pins.length, insideViewport: inside.length, w: box.width, h: box.height };
});
console.log('   ', JSON.stringify(bounds));
ok('all Aug 8 focus pins sit inside the visible map', bounds.pins > 0 && bounds.insideViewport === bounds.pins,
  bounds.insideViewport + ' of ' + bounds.pins + ' pins visible — a whole-day 621 km fit would push the Vienna cluster into a corner');

console.log('');
console.log('== hidden-container refit: switch away and back ==');
const before = await page.evaluate(() => [...document.querySelectorAll('.leaflet-marker-icon')].map((m) => m.getBoundingClientRect().left | 0));
await page.locator('button').filter({ hasText: /^08-13/ }).first().click();
await page.waitForTimeout(400);
await page.locator('button').filter({ hasText: /^08-08/ }).first().click();
await page.waitForTimeout(800);
const after = await page.evaluate(() => [...document.querySelectorAll('.leaflet-marker-icon')].map((m) => m.getBoundingClientRect().left | 0));
console.log('   pin x-positions before:', before.slice(0, 5), 'after:', after.slice(0, 5));
ok('map re-fits identically after a tab round trip', JSON.stringify(before) === JSON.stringify(after),
  'the map did not return to the same fit — the display:none refit bug class');

console.log('');
console.log('== conflicts panel exists and acknowledging does not auto-fix ==');
const allButtons = await page.locator('button').allInnerTexts();
console.log('   buttons on the trip view:', JSON.stringify(allButtons.filter((t) => t && t.length < 30).slice(0, 25)));

console.log('');
console.log('== TWO TABS: import a stale export over a live trip ==');
// Tab 1 exports the trip, then edits it.
const exported = await page.evaluate(async () => {
  const dbs = await indexedDB.databases();
  return new Promise((res) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const tx = r.result.transaction('docs', 'readonly');
      const g = tx.objectStore('docs').getAll();
      g.onsuccess = () => res({ dbs: dbs.map((d) => d.name), docs: g.result.length, doc: g.result[0] });
    };
  });
});
console.log('   IndexedDB:', exported.dbs, 'docs stored:', exported.docs);

// Tab 2 opens BEFORE tab 1 makes its edit, so its in-memory library is a snapshot.
const page2 = await newPage();
await page2.goto(URL, { waitUntil: 'domcontentloaded' });
await page2.waitForTimeout(800);

// Tab 1 renames a day — a real edit Jacob would care about.
await page.locator('button').filter({ hasText: /^08-13/ }).first().click();
await page.waitForTimeout(300);
const edited = await page.evaluate(async () => {
  // drive the store the way the UI does, through a title edit if one is exposed;
  // otherwise write through the store on window if present.
  return typeof window.__cairnStore !== 'undefined';
});
console.log('   store exposed on window?', edited);

// Tab 2 imports the stale export.
const importResult = await page2.evaluate(async (docText) => {
  // Simulate the file-picker path: the app reads text and calls store.importDoc.
  // Without a store handle we drive IndexedDB directly to show what a stale write does.
  return { len: docText.length };
}, exported.doc || '');
console.log('   (browser-level import needs the file picker; the mechanism was proven in Node — see F-?)');

console.log('');
console.log('== a corrupted document in the library ==');
await page2.evaluate(async () => {
  await new Promise((res) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const tx = r.result.transaction(['docs', 'summaries'], 'readwrite');
      tx.objectStore('docs').put('{"schemaVersion":1,"id":"corrupt","days":', 'corrupt');
      tx.objectStore('summaries').put({ id: 'corrupt', title: 'Corrupted trip', startDate: '2026-01-01', endDate: '2026-01-02', cityCount: 0, dayCount: 0, stopCount: 0, poolCount: 0, revision: 1 }, 'corrupt');
      tx.oncomplete = res;
    };
  });
});
await page2.reload({ waitUntil: 'domcontentloaded' });
await page2.waitForTimeout(900);
const listed = await page2.locator('body').innerText();
console.log('   library lists the corrupt trip:', /Corrupted trip/.test(listed));
const card = page2.locator('button').filter({ hasText: /Corrupted trip/ }).first();
if (await card.count()) {
  await card.click();
  await page2.waitForTimeout(700);
  const t = await page2.locator('body').innerText();
  const blank = t.trim().length < 40;
  console.log('   after clicking it, page text:', JSON.stringify(t.slice(0, 220).replace(/\n+/g, ' | ')));
  ok('a corrupt document produces a visible error, not a blank/broken app', /not a Cairn trip|Could not|error|invalid|schemaVersion|JSON/i.test(t) && !blank,
    'the app shows no explanation');
}
await page2.screenshot({ path: './corrupt.png' });
await browser.close();
