/**
 * Round 4 — the §2.2a `epoch` is read once and cached in the port's closure, so a surviving
 * tab stamps a RECREATED database with the DEAD one's epoch while the counter has genuinely
 * rewound to 0. The fence then re-issues a token it has already issued.
 *
 * `apps/web/src/ports/storage.ts:86-135` — `ensureReady()` memoises `ready` and assigns the
 * module-closure `epoch` exactly once; `saveIfVersion` (line 205) mints `` `${epoch}.${n}` ``
 * from that cached value and a counter it re-reads from `meta`, which a recreated database
 * has reset. §2.2a rule 2 is explicit: a version "never repeats within one storage, ever —
 * not after a `delete()`, not after the record is recreated under the same id, **not after
 * the whole database is recreated**", and the epoch is named as the mechanism for exactly
 * the "clearing site data resets the counter while a tab holding an old token survives"
 * case. It does not cover it, because the surviving tab never re-reads it.
 *
 * ARCHITECTURE §1.1 records that a non-installed tab's storage may be evicted after 7 days,
 * so this is not only "the user pressed Clear site data".
 *
 * Needs: npm run web:build && node tools/serve.mjs, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-epoch.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();
const ctx = await browser.newContext();
const mk = async () => { const p = await ctx.newPage(); await p.route('**tile.openstreetmap.org/**', (r) => r.abort()); return p; };

const idbGet = (page, store, key) => page.evaluate(([s, k]) => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => {
    try {
      const g = r.result.transaction(s).objectStore(s).get(k);
      g.onsuccess = () => res(g.result === undefined ? null : String(g.result));
      g.onerror = () => res(null);
    } catch { res(null); }
  };
  r.onerror = () => res(null);
}), [store, key]);

const stored = (page) => idbGet(page, 'docs', 'trip-europe-2026');
const fence = (page) => idbGet(page, 'versions', 'trip-europe-2026');
const epochOf = (page) => idbGet(page, 'meta', 'epoch');
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
  await page.waitForTimeout(1400);
};

line('a token issued by a destroyed database is accepted by its replacement');

// Tab A boots and creates the trip. Tab C boots and sits on the library. Both cache the epoch.
const a = await mk();
await a.goto(URL, { waitUntil: 'domcontentloaded' });
await a.getByRole('button', { name: /Load Europe 2026/i }).click();
await a.waitForTimeout(1800);

const c = await mk();
await c.goto(URL, { waitUntil: 'domcontentloaded' });
await c.waitForTimeout(1200);        // refreshLibrary() -> ensureReady() -> epoch cached

const epoch0 = await epochOf(a);
const fence0 = await fence(a);
const backup = await stored(a);      // the exported bytes, byte-for-byte what `toJSON` writes
console.log(`  epoch=${JSON.stringify(epoch0)}  fence=${JSON.stringify(fence0)}`);

// Tab B opens the trip and holds that exact token as its `savedVersion`.
const b = await mk();
await b.goto(URL, { waitUntil: 'domcontentloaded' });
await b.waitForTimeout(1000);
await b.locator('button').filter({ hasText: /Europe 2026/ }).first().click();
await b.waitForTimeout(1500);
console.log(`  tab B is open on the trip, holding ${JSON.stringify(fence0)}`);

// Storage is evicted / cleared. No tab reloads.
await a.evaluate(() => new Promise((res) => {
  const r = indexedDB.deleteDatabase('cairn');
  r.onsuccess = () => res(); r.onerror = () => res(); r.onblocked = () => res();
}));
await a.waitForTimeout(800);
console.log(`  database deleted. docs record = ${JSON.stringify(await stored(c))}`);

// Tab C — booted BEFORE the wipe, so its port still holds the dead epoch — restores the
// backup. `importDoc` keeps the original id because nothing is stored under it any more.
const file = path.join(os.tmpdir(), 'r4-europe-2026.cairn.json');
fs.writeFileSync(file, backup);
const chooser = c.waitForEvent('filechooser');
await c.getByRole('button', { name: /Restore from a backup/i }).click();
await (await chooser).setFiles(file);
await c.waitForTimeout(2500);

const epoch1 = await epochOf(c);
const fence1 = await fence(c);
console.log(`  after the restore: epoch=${JSON.stringify(epoch1)} fence=${JSON.stringify(fence1)} (pre-wipe fence was ${JSON.stringify(fence0)})`);
ok('the recreated database issues a token it has never issued before', fence1 !== fence0,
   `the fence is back to ${JSON.stringify(fence1)} — §2.2a rule 2 says this may never happen, "not after the whole database is recreated"`);
ok('the recreated database records an epoch at all', epoch1 !== null,
   'meta.epoch is empty: the surviving tab minted versions against an epoch nothing persisted');

// Tab B, holding the pre-wipe token, edits. If the fence rewound it walks straight through.
await rename(b, /^08-17/, 'B WROTE THROUGH A DEAD TOKEN');
const bSays = await indicator(b);
const doc = await stored(b);
console.log(`  tab B says ${JSON.stringify(bSays.slice(0, 40))}`);
console.log(`  storage holds tab B's edit = ${String(doc).includes('B WROTE THROUGH A DEAD TOKEN')}`);
ok('tab B was refused', /Not saved/i.test(bSays),
   'a token minted by a database that no longer exists was accepted by its replacement');

console.log('');
await browser.close();
