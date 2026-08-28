/**
 * QA round 29 — I-7a: **A-33 6b-4, the assertion the builder stubbed — the ACTUAL PERSISTED
 * BYTES of the actual shipped IndexedDB port.**
 *
 *   Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *        node --experimental-strip-types qa/i7a-idb-rowkeys.mjs      (from cairn/)
 *   Add `--fault` to apply R29-1's G1 mutation to the port before evaluating it.
 *
 * A-33 6b-4: *"read every record of the `summaries` store back out of the database and assert
 * `Object.keys(row)` equals `ROW_KEYS`. That is the only place in this repo where the actual
 * persisted bytes of the actual shipped port are checked, and it is where F8 dies at runtime
 * rather than by grep."*
 *
 * BUILD-NOTES I-7a "What I stubbed" declines it — *"I cannot run it here"*. It runs here:
 * `qa/i6a-idb.mjs` has driven this exact port in real Chromium since round 27 and is **ALL OK**
 * on this tree, and Playwright is at the absolute path that probe already imports.
 *
 * Structure copied deliberately from `qa/i6a-idb.mjs` — one blank page from an ephemeral port
 * (IndexedDB is unavailable on `about:blank`), the shipped `apps/web/src/ports/storage.ts`
 * type-stripped and evaluated in it. The module under test is the shipped file, byte for byte.
 *
 * `--fault` is R29-1: `refreshSummary`'s parameter renamed to `row`, a local `const summary =
 * { ...row, countriesVisited, daysTravelled }` above the unchanged `put(summary, id)`. Exit
 * criterion 6 is 14/14 green under it, the 835-test suite is green under it, and `tsc` is clean
 * under it. This probe is the one thing in the repo that sees it.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const FAULT = process.argv.includes('--fault');
let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

/** A-33 Part 2 assertion 1, transcribed. Fourteen keys, no more, no fewer. */
const ROW_KEYS = ['attribution', 'cities', 'cityCount', 'countryCodes', 'datePrecision', 'dayCount',
  'endDate', 'id', 'poolCount', 'revision', 'startDate', 'stopCount', 'summaryVersion', 'title'];

let raw = readFileSync(new URL('../apps/web/src/ports/storage.ts', import.meta.url), 'utf8');
if (FAULT) {
  const sig = `    async refreshSummary(
      id: string,
      expectedVersion: StorageVersion,
      summary: TripSummaryRow,`;
  if (!raw.includes(sig)) throw new Error('the refreshSummary signature moved — re-derive the fault');
  raw = raw.replace(sig, sig.replace('summary: TripSummaryRow,', 'row: TripSummaryRow,'), 1);
  const put = '            tx.objectStore(SUMMARIES).put(summary, id);';
  if (raw.split(put).length - 1 !== 2) throw new Error('the put sites moved — re-derive the fault');
  const i = raw.lastIndexOf(put);
  raw = raw.slice(0, i) +
    '            const summary = { ...row, countriesVisited: row.countryCodes.length, daysTravelled: row.dayCount };\n' +
    put + raw.slice(i + put.length);
  note('R29-1 (G1) applied to the port source before stripping');
}

const src = stripTypeScriptTypes(raw, { mode: 'strip' });
const injected = src.replace('export function indexedDbStorage', 'function indexedDbStorage') +
  '\nglobalThis.indexedDbStorage = indexedDbStorage;\n';
if (!injected.includes('globalThis.indexedDbStorage')) throw new Error('the export shape moved');

const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<!doctype html><meta charset=utf-8><title>i7a-idb-rowkeys</title>');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`  page error: ${e.message}`));
await page.goto(`http://127.0.0.1:${port}/`);
await page.evaluate(injected);

const ROW = (id, ver) => ({
  id, title: `T ${id}`, startDate: '2026-08-07', endDate: '2026-08-09', datePrecision: 'exact',
  cityCount: 1, dayCount: 3, stopCount: 7, poolCount: 2, revision: 1,
  countryCodes: ['HR', 'AT'],
  cities: [{ key: 'hvar', name: 'Hvar', countryCode: 'HR', countrySource: 'stated' }],
  attribution: { places: { located: 9, attributed: 8 }, stops: { located: 7, attributed: 7 } },
  summaryVersion: ver,
});

head(`the summaries store, read straight out of IndexedDB${FAULT ? '  [R29-1 FAULT APPLIED]' : ''}`);
const result = await page.evaluate(async (arg) => {
  await new Promise((res) => {
    const del = indexedDB.deleteDatabase('cairn');
    del.onsuccess = del.onerror = del.onblocked = () => res();
  });
  const storage = globalThis.indexedDbStorage();
  // Both mutating methods, so both `SUMMARIES.put` sites are exercised.
  const a = await storage.saveIfVersion('t1', null, arg.doc, arg.rowA);
  const b = await storage.saveIfVersion('t2', null, arg.doc, arg.rowB);
  await storage.refreshSummary('t1', a.version, arg.rowA4);
  // Read the raw records, bypassing the port entirely: this is the persisted bytes.
  const persisted = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction('summaries', 'readonly');
      const req = tx.objectStore('summaries').getAll();
      tx.oncomplete = () => { db.close(); res(req.result); };
      tx.onerror = () => { db.close(); rej(tx.error); };
    };
    r.onerror = () => rej(r.error);
  });
  return { persisted, viaPort: await storage.listTrips(), seeded: [a.ok, b.ok] };
}, { doc: JSON.stringify({ hello: 'world' }), rowA: ROW('t1', 3), rowA4: ROW('t1', 4), rowB: ROW('t2', 4) });

ok(result.seeded.every(Boolean) && result.persisted.length === 2, 'two records were written', result.seeded);
for (const rec of result.persisted) {
  const keys = Object.keys(rec).sort();
  const extra = keys.filter((k) => !ROW_KEYS.includes(k));
  const missing = ROW_KEYS.filter((k) => !keys.includes(k));
  note(`persisted ${JSON.stringify(rec.id)}: ${keys.length} keys`);
  ok(extra.length === 0 && missing.length === 0,
    `the persisted record ${JSON.stringify(rec.id)} carries exactly ROW_KEYS (A-33 6b-4)`,
    { extra, missing });
}
for (const rec of result.viaPort) {
  const extra = Object.keys(rec).filter((k) => !ROW_KEYS.includes(k));
  ok(extra.length === 0, `the row listTrips() returns for ${JSON.stringify(rec.id)} carries no extra key`, extra);
}
// The literal thing A-31 clause 2 forbids.
const blob = JSON.stringify(result.persisted);
ok(!/countriesVisited|daysTravelled|citiesVisited|daysAbroad/.test(blob),
  'no lifetime count of any name is in the persisted bytes',
  (blob.match(/countriesVisited|daysTravelled|citiesVisited|daysAbroad/g) ?? []).slice(0, 4));
// And no coordinate (§5/§6, carried forward from rounds 26-28).
const floats = (blob.match(/-?\d+\.\d+/g) ?? []);
ok(floats.length === 0, 'and no coordinate-shaped float', floats.slice(0, 5));
note(`persisted bytes for one row: ${JSON.stringify(result.persisted[1]).length}`);

await browser.close();
server.close();
console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}`);
process.exit(0);
