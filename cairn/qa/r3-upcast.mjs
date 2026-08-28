/**
 * R3-1, the migration half — §2.2a: "Records written before this design existed (they exist
 * in Jacob's IndexedDB) carry no envelope version. The port stamps every such record with a
 * fresh version in one `readwrite` transaction at open, once, before serving any read."
 *
 * This seeds a genuine **version-1** `cairn` database — `docs` + `summaries` only, exactly
 * the shape shipped before the fence existed — then loads the app over it and checks that
 * the trip still opens, gets stamped, and can be edited and saved.
 *
 * Needs: npm run web:build && node tools/serve.mjs, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-upcast.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.route('**tile.openstreetmap.org/**', (r) => r.abort());

// Boot once to get a same-origin document, then wipe and reseed at version 1 so the app
// meets a database that genuinely predates the fence.
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

line('1. seed a pre-§2.2a (version 1) database: docs + summaries, no envelope version');
const seeded = await page.evaluate(() => new Promise((res, rej) => {
  const wipe = indexedDB.deleteDatabase('cairn');
  wipe.onblocked = () => rej(new Error('deleteDatabase blocked — a connection is still open'));
  wipe.onerror = () => rej(wipe.error);
  wipe.onsuccess = () => {
  const doc = {
    id: 'legacy-trip', title: 'Jacobs old trip', ownerId: 'local:self',
    startDate: '2026-08-07', endDate: '2026-08-08', homeCurrency: 'EUR', homeBase: null,
    party: { adults: 1, children: 0 },
    cities: [{ key: 'vienna', name: 'Vienna', countryCode: 'AT',
               centre: { lat: 48.2082, lng: 16.3738 }, order: 0 }],
    pool: [], places: [], bookings: [],
    resolutions: [], revision: 41, schemaVersion: 1,
    days: [
      { id: '2026-08-07', date: '2026-08-07', primaryCity: 'vienna', cities: ['vienna'],
        title: 'BEFORE THE FENCE EXISTED', subtitle: '', stops: [],
        provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-08-01' } },
      { id: '2026-08-08', date: '2026-08-08', primaryCity: 'vienna', cities: ['vienna'],
        title: 'Day two', subtitle: '', stops: [],
        provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-08-01' } },
    ],
  };
  const req = indexedDB.open('cairn', 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs');
    if (!db.objectStoreNames.contains('summaries')) db.createObjectStore('summaries');
  };
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction(['docs', 'summaries'], 'readwrite');
    tx.objectStore('docs').put(JSON.stringify(doc), 'legacy-trip');
    tx.objectStore('summaries').put({
      id: 'legacy-trip', title: 'Jacobs old trip', startDate: '2026-08-07', endDate: '2026-08-08',
      cityCount: 1, dayCount: 2, stopCount: 0, poolCount: 0, revision: 41,
    }, 'legacy-trip');
    tx.oncomplete = () => { db.close(); res({ stores: 2, revision: doc.revision }); };
    tx.onerror = () => rej(tx.error);
  };
  req.onerror = () => rej(req.error);
  };
}));
console.log('  seeded a version-1 database:', JSON.stringify(seeded));

line('2. boot the app over it — the record must open, not disappear or throw');
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
const libraryText = await page.locator('body').innerText();
console.log('  library shows:', JSON.stringify(libraryText.split('\n').filter((l) => /Jacobs old trip/.test(l))[0] ?? 'NOT LISTED'));
ok('the pre-fence trip is still in the library', /Jacobs old trip/.test(libraryText), libraryText.slice(0, 200));
if (!/Jacobs old trip/.test(libraryText)) { await ctx.close(); await browser.close(); process.exit(1); }

const envelope = () => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => {
    const db = r.result;
    if (!db.objectStoreNames.contains('versions')) return res({ version: null, doc: '' });
    const tx = db.transaction(['versions', 'docs'], 'readonly');
    const v = tx.objectStore('versions').get('legacy-trip');
    const d = tx.objectStore('docs').get('legacy-trip');
    tx.oncomplete = () => res({ version: v.result ?? null, doc: String(d.result ?? '') });
  };
}));

const stamped = await envelope();
console.log('  envelope version after open:', JSON.stringify(stamped.version));
ok('the versionless record was stamped at open', typeof stamped.version === 'string' && stamped.version !== '');
ok('the stamp did NOT change the document bytes', stamped.doc.includes('BEFORE THE FENCE EXISTED'));
ok('the version is not inside the document', !stamped.doc.includes(String(stamped.version)));

line('3. open it and edit it — the stamped version must fence the write');
await page.locator('button').filter({ hasText: /Jacobs old trip/ }).first().click();
await page.waitForTimeout(1200);
await page.locator('button').filter({ hasText: /^08-07/ }).first().click().catch(() => {});
await page.waitForTimeout(400);
// Add a stop — a plain, always-available write path on any trip.
await page.getByRole('button', { name: /Add a stop/i }).first().click();
await page.waitForTimeout(400);
await page.locator('input').first().fill('EDITED AFTER THE UPCAST');
await page.getByRole('button', { name: /^(Add|Save)/i }).first().click();
await page.waitForTimeout(1800);

const after = await envelope();
const indicator = (await page.locator('body').innerText()).split('\n').slice(0, 6).join(' ');
console.log('  envelope version after the edit:', JSON.stringify(after.version));
console.log('  indicator:', JSON.stringify((indicator.match(/Not saved[^\n]*|Saving…|Saved/i) || ['?'])[0]));
ok('the edit reached storage', after.doc.includes('EDITED AFTER THE UPCAST'), after.doc.slice(0, 160));
ok('the write minted a fresh version', after.version !== stamped.version, `${stamped.version} -> ${after.version}`);
ok('the trip did not go into conflict against itself', !/Not saved/i.test(indicator), indicator.slice(0, 160));

await ctx.close();
await browser.close();
console.log('');
