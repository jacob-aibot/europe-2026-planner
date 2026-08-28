/**
 * QA round 30 — **G12 in real Chromium: the upcast widening, and what 6b-4 cannot see.**
 *
 *   Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *        node --experimental-strip-types qa/r30-upcast-browser.mjs      (from cairn/)
 *   Add `--clean` to run the same script against the UNfaulted port (the control).
 *
 * `qa/r30-upcast.mjs` shows in Node, against A-36 Part 3's recording double, that a widening
 * placed inside `ensureReady`'s one-time upcast persists a 16-key summary record and that exit
 * criterion 6 reports `# fail 0` on it. This is the same fault in the browser's own IndexedDB,
 * because the double is a double and a claim about persisted bytes is only settled by bytes.
 *
 * The structure is `qa/i7a-idb-rowkeys.mjs`'s, with one difference, and the difference IS the
 * finding: **two port instances over the same database** — `indexedDbStorage()` twice, no
 * `deleteDatabase` in between — which is what every page load after the first one is.
 * `qa/i7a-idb-rowkeys.mjs` (A-36's 6b-4) deletes the database and then uses ONE instance, so
 * the upcast has nothing to walk and this fault is invisible there too.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const CLEAN = process.argv.includes('--clean');
let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const ROW_KEYS = ['attribution', 'cities', 'cityCount', 'countryCodes', 'datePrecision', 'dayCount',
  'endDate', 'id', 'poolCount', 'revision', 'startDate', 'stopCount', 'summaryVersion', 'title'];

let raw = readFileSync(new URL('../apps/web/src/ports/storage.ts', import.meta.url), 'utf8');
if (!CLEAN) {
  const a1 = "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);";
  if (!raw.includes(a1)) throw new Error('anchor moved (ensureReady tx) — re-derive the fault');
  raw = raw.replace(a1, "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);", 1);
  const a2 = '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;';
  if (!raw.includes(a2)) throw new Error('anchor moved (upcast loop) — re-derive the fault');
  raw = raw.replace(a2,
    '              const all = sums.getAll();\n'
    + '              all.onsuccess = () => {\n'
    + '                for (const r of all.result) {\n'
    + '                  sums.put({ ...r, countriesVisited: r.countryCodes.length, daysTravelled: r.dayCount }, r.id);\n'
    + '                }\n'
    + '              };\n' + a2, 1);
  note('G12 applied to the port source before stripping (the widening lives in the UPCAST)');
}

const src = stripTypeScriptTypes(raw, { mode: 'strip' });
const injected = src.replace('export function indexedDbStorage', 'function indexedDbStorage')
  + '\nglobalThis.indexedDbStorage = indexedDbStorage;\n';
if (!injected.includes('globalThis.indexedDbStorage')) throw new Error('the export shape moved');

const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<!doctype html><meta charset=utf-8><title>r30-upcast</title>');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`  page error: ${e.message}`));
await page.goto(`http://127.0.0.1:${port}/`);
await page.evaluate(injected);

const ROW = {
  id: 't1', title: 'T t1', startDate: '2026-08-07', endDate: '2026-08-09', datePrecision: 'exact',
  cityCount: 1, dayCount: 3, stopCount: 7, poolCount: 2, revision: 1,
  countryCodes: ['HR', 'AT'],
  cities: [{ key: 'hvar', name: 'Hvar', countryCode: 'HR', countrySource: 'stated' }],
  attribution: { places: { located: 9, attributed: 8 }, stops: { located: 7, attributed: 7 } },
  summaryVersion: 4,
};

head(`two port instances over one database${CLEAN ? '  [CONTROL: shipped port]' : '  [G12 APPLIED]'}`);
const result = await page.evaluate(async (arg) => {
  await new Promise((res) => {
    const del = indexedDB.deleteDatabase('cairn');
    del.onsuccess = del.onerror = del.onblocked = () => res();
  });
  const readRaw = () => new Promise((res, rej) => {
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
  // Page load 1 — exactly what 6b-4 does today.
  const p1 = globalThis.indexedDbStorage();
  const a = await p1.saveIfVersion('t1', null, arg.doc, arg.row);
  const afterWrite = await readRaw();
  // Page load 2 — a NEW port instance over the SAME database. `ensureReady` now has a record
  // to walk. Nothing else about the port is touched.
  const p2 = globalThis.indexedDbStorage();
  const viaPort = await p2.listTrips();
  const afterOpen = await readRaw();
  return { seeded: a.ok, afterWrite, afterOpen, viaPort };
}, { doc: JSON.stringify({ hello: 'world' }), row: ROW });

ok(result.seeded && result.afterWrite.length === 1, 'the first write landed', result.seeded);
note(`after the first write:      ${Object.keys(result.afterWrite[0]).length} keys`);
note(`after a SECOND port opens:  ${Object.keys(result.afterOpen[0]).length} keys`);
note(`listTrips() from port 2:    ${Object.keys(result.viaPort[0]).length} keys`);

const extraWrite = Object.keys(result.afterWrite[0]).filter((k) => !ROW_KEYS.includes(k));
ok(extraWrite.length === 0,
  'the FIRST write is clean — which is the only state A-36 6b-4 and 6b-1b ever observe', extraWrite);

const extraOpen = Object.keys(result.afterOpen[0]).filter((k) => !ROW_KEYS.includes(k));
ok(extraOpen.length === 0,
  'the persisted record after a second port opens carries exactly ROW_KEYS', extraOpen);
const extraPort = Object.keys(result.viaPort[0]).filter((k) => !ROW_KEYS.includes(k));
ok(extraPort.length === 0, 'and listTrips() hands back exactly ROW_KEYS', extraPort);
const blob = JSON.stringify(result.afterOpen);
ok(!/countriesVisited|daysTravelled|citiesVisited|daysAbroad/.test(blob),
  'no lifetime count of any name is in the persisted bytes',
  (blob.match(/countriesVisited|daysTravelled|citiesVisited|daysAbroad/g) ?? []).slice(0, 4));

await browser.close();
server.close();
console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}${CLEAN ? '' : ' — a FAIL here is the finding (R30-1)'}`);
process.exit(0);
