/**
 * Round 10 — the A-6a adjacent door in real Chromium: a copied stop's `Place` is orphaned by
 * the **stop editor**, not by `×`, so `removeStop`'s prune never runs.
 *
 * Five user actions: Load Europe 2026 -> New trip -> Browse & copy one place-linked stop ->
 * ✎ on the copied stop -> type a latitude and longitude -> Save. `StopEditor.tsx:63-76` puts
 * `place` in EVERY update patch, so filling the (always-empty, for a place-linked stop)
 * lat/lng fields replaces `{kind:'place', placeId}` with `{kind:'inline'}`. The `Place` the
 * copy dragged in (`copyStopInto` rule 4) is then linked by nothing, and §2.13 A-6 clause 1
 * measures a zero-link place at `'certain'` — R9-2's state, reached without `removeStop`.
 *
 * The document is read back out of IndexedDB, so this asserts on the persisted trip, not on
 * a rendering.
 *
 * Needs `npm run web:build && node tools/serve.mjs` in one shell, then:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r10-editdoor.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();
const ctx = await browser.newContext();
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);

line('load the sample, then create a second trip to copy INTO');
await p.getByRole('button', { name: /Load Europe 2026/i }).click();
await p.waitForTimeout(1200);
await p.locator('.topbar__brand').click();
await p.waitForTimeout(500);
await p.getByRole('button', { name: /^New trip$/ }).first().click();
await p.waitForTimeout(400);
const inputs = p.locator('form input, .wizard input');
await inputs.nth(0).fill('Copy target');
await inputs.nth(1).fill('2026-09-01');
await inputs.nth(2).fill('2026-09-03');
if ((await inputs.count()) >= 4) await inputs.nth(3).fill('vienna');
await p.getByRole('button', { name: /^Create$/ }).first().click();
await p.waitForTimeout(1000);

line('Browse & copy a place-linked stop');
await p.getByRole('tab', { name: /Browse & copy/ }).first().click();
await p.waitForTimeout(500);
await p.locator('select[aria-label="Choose a trip to browse"]').selectOption({ index: 1 });
await p.waitForTimeout(900);
const rows = p.locator('.browse__row');
console.log('  browsable stops:', await rows.count());
// A stop that resolves through a `Place` (not an inline coordinate) — the only shape
// `copyStopInto` rule 4 copies a `Place` for.
const row = rows.filter({ hasText: 'Blue Cave' }).first();
console.log('  copying:', (await row.innerText()).replace(/\n/g, ' ').slice(0, 60));
await row.getByRole('button', { name: /Copy/ }).click();
await p.waitForTimeout(800);

/** The persisted document for the active (second) trip. */
const persisted = async () => p.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn', 3);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const docs = await new Promise((res, rej) => {
    const tx = db.transaction('docs', 'readonly').objectStore('docs').getAll();
    tx.onsuccess = () => res(tx.result); tx.onerror = () => rej(tx.error);
  });
  return docs.map((d) => {
    const raw = d && d.doc ? d.doc : d;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  });
});

const target = async () => {
  const all = await persisted();
  return all.find((t) => t && t.title === 'Copy target') ?? null;
};

const linkedPlaceIds = (t) => new Set([...t.days.flatMap((d) => d.stops), ...(t.pool ?? [])]
  .filter((s) => s.place && s.place.kind === 'place').map((s) => s.place.placeId));

const allDocs = await persisted();
console.log('  stored docs:', JSON.stringify(allDocs.map((d) => d && (d.title ?? Object.keys(d).slice(0, 6)))));
console.log('  active title:', await p.locator('h1, .trip__title').first().innerText().catch(() => '?'));
let doc = await target();
ok('a. the copy landed and brought a Place row', !!doc && doc.places.length > 0,
   doc ? `${doc.places.length} places, ${linkedPlaceIds(doc).size} linked` : 'no stored doc');
const copiedPlaceId = doc ? [...linkedPlaceIds(doc)][0] : null;
console.log('  copy-borne place:', copiedPlaceId, JSON.stringify(doc?.places.map((x) => x.name)));

line('✎ the copied stop and type coordinates — the StopEditor patch carries `place`');
await p.getByRole('tab', { name: /^Day/ }).first().click();
await p.waitForTimeout(600);
await p.locator('.stop').filter({ hasText: 'Blue Cave' }).first().locator('button[title="Edit"]').click();
await p.waitForTimeout(500);
const form = p.locator('form.editor').first();
const labelled = async (name) => form.locator('label').filter({ hasText: name }).locator('input').first();
const lat = await labelled(/Lat/i);
const lng = await labelled(/L(ng|on)/i);
console.log('  lat field present:', await lat.count(), ' value:', JSON.stringify(await lat.inputValue().catch(() => null)));
ok('b. the editor offers empty Lat/Lng fields on a place-linked copied stop',
   (await lat.count()) === 1 && (await lat.inputValue()) === '');
await lat.fill('48.2100');
await lng.fill('16.3700');
await form.getByRole('button', { name: /^Save$/ }).click().catch(async () => { await form.locator('button[type="submit"]').first().click(); });
await p.waitForTimeout(1200);

doc = await target();
const linked = doc ? linkedPlaceIds(doc) : new Set();
const orphaned = doc ? doc.places.filter((x) => !linked.has(x.id)) : [];
console.log('  after Save: places =', doc?.places.length, ' linked =', linked.size,
            ' orphaned =', JSON.stringify(orphaned.map((x) => x.name)));
ok('c. saving coordinates does NOT leave the copy-borne Place orphaned in the document',
   orphaned.length === 0,
   `${orphaned.length} orphan(s): ${JSON.stringify(orphaned.map((x) => `${x.id} ${x.name}`))} — `
   + 'no `removeStop` ran, so A-6a\'s prune never fired; §2.13 A-6 clause 1 measures a zero-link place at \'certain\'');

console.log('  page errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
console.log(`\n== ${fails} FAIL ==`);
