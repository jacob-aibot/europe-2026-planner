/**
 * **6b-4 — the ACTUAL PERSISTED BYTES of the actual shipped IndexedDB port, in real Chromium.**
 *
 *   Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *        node --experimental-strip-types qa/i7a-idb-rowkeys.mjs      (from cairn/)
 *   Faults: `--fault` (= `--fault=g1`, A-36's write-path class) or `--fault=g13` (A-38's
 *           upcast-path class). One per class, per A-38 Part 6.
 *
 * A-33 6b-4: *"read every record of the `summaries` store back out of the database and assert
 * `Object.keys(row)` equals `ROW_KEYS`. That is the only place in this repo where the actual
 * persisted bytes of the actual shipped port are checked."* **A-36 Part 4** promoted it from a
 * note to a **required, recorded ship-gate condition**: any increment touching
 * `apps/web/src/ports/storage.ts`, the recording double or `ROW_KEYS` runs this against a real
 * browser and records the measured result in `BUILD-NOTES.md`; no browser is a **disclosed gap**,
 * not a pass. It stays **out** of `npm run test:tap` deliberately and permanently — the gate must
 * run on bare Node (`BRIEF.md`'s phasing principle, `cairn-constraints` §2/§3, §1.3).
 *
 * **A-38 Part 6 (revision 27, QA R30-1) widened its SCOPE, not its status.** It ran one port
 * instance against a database it had just deleted, so it was blind to `ensureReady()`'s upcast
 * for the same structural reason 6b-1b was. It now runs **two phases**:
 *
 *   **Phase 1** — a fresh database, one instance, both mutating methods, raw read-back.
 *                 Unchanged from what this probe already did.
 *   **Phase 2** — a **legacy** database written RAW (a document and a summary row with **no**
 *                 `versions` entry), closed, and only *then* opened by the port. That is the
 *                 state `ensureReady()`'s stamping branch exists for, and it is what every real
 *                 page load after the first looks like.
 *
 * Both phases assert `ROW_KEYS` on the persisted records and on the rows `listTrips()` returns,
 * and both run the "no lifetime count of any name in the persisted bytes" blob check.
 *
 * **This probe is not made redundant by 6b-1b's seeded arms — its remaining job is sharper.**
 * The recording double cannot model the `versionchange` transaction (a real `onupgradeneeded`
 * writes through `request.transaction`, which the double does not implement), so a widening
 * placed in the port's `onupgradeneeded` is beyond the double's reach *by construction* and is
 * visible only here. That is A-38 Part 8 residue 1.
 *
 * Structure copied deliberately from `qa/i6a-idb.mjs` — one blank page from an ephemeral port
 * (IndexedDB is unavailable on `about:blank`), the shipped `apps/web/src/ports/storage.ts`
 * type-stripped and evaluated in it. The module under test is the shipped file, byte for byte.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const FAULT_ARG = process.argv.find((a) => a === '--fault' || a.startsWith('--fault='));
const FAULT = FAULT_ARG === undefined ? null : (FAULT_ARG.split('=')[1] ?? 'g1').toLowerCase();
if (FAULT !== null && FAULT !== 'g1' && FAULT !== 'g13') {
  throw new Error(`unknown fault ${JSON.stringify(FAULT)} — one of: g1 (write path), g13 (upcast path)`);
}
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

/** The port's own `DB_VERSION`, so phase 2 seeds an EXISTING database rather than an older one. */
const DB_VERSION = Number(/^const DB_VERSION = (\d+);$/m.exec(raw)?.[1]);
if (!Number.isInteger(DB_VERSION)) throw new Error('DB_VERSION could not be read from the port');

/**
 * **G1 — the write-path class (A-36, QA R29-1).** `refreshSummary`'s parameter renamed to `row`,
 * a local `const summary = { ...row, countriesVisited, daysTravelled }` above the unchanged
 * `put(summary, id)`. Exit criterion 6 was 14/14 green under it, the suite green, `tsc` clean.
 */
function applyG1(s) {
  const sig = `    async refreshSummary(
      id: string,
      expectedVersion: StorageVersion,
      summary: TripSummaryRow,`;
  if (!s.includes(sig)) throw new Error('the refreshSummary signature moved — re-derive the fault');
  s = s.replace(sig, sig.replace('summary: TripSummaryRow,', 'row: TripSummaryRow,'), 1);
  const put = '            tx.objectStore(SUMMARIES).put(summary, id);';
  if (s.split(put).length - 1 !== 2) throw new Error('the put sites moved — re-derive the fault');
  const i = s.lastIndexOf(put);
  return s.slice(0, i) +
    '            const summary = { ...row, countriesVisited: row.countryCodes.length, daysTravelled: row.dayCount };\n' +
    put + s.slice(i + put.length);
}

/**
 * **G13 — the upcast-path class (A-38, QA R30-1).** The widening placed *inside* `ensureReady`'s
 * stamping branch, so it fires only for a document with no envelope version. Green under the
 * pre-A-38 gate, green under both of 6b-2's surviving assertions, and green under **phase 1 of
 * this probe**, which deletes the database first. Phase 2 is what sees it.
 */
function applyG13(s) {
  const tx = "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);";
  if (!s.includes(tx)) throw new Error('the ensureReady transaction moved — re-derive the fault');
  s = s.replace(tx, "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);", 1);
  const stamp = '                versions.put(mintVersion(), key);';
  if (!s.includes(stamp)) throw new Error('the stamping branch moved — re-derive the fault');
  return s.replace(stamp, stamp + '\n'
    + '                const one = sums.get(String(key)) as IDBRequest<TripSummaryRow>;\n'
    + '                one.onsuccess = () => {\n'
    + '                  const r = one.result;\n'
    + '                  sums.put({ ...r, countriesVisited: r.countryCodes.length, daysTravelled: r.dayCount }, String(key));\n'
    + '                };', 1);
}

if (FAULT === 'g1') { raw = applyG1(raw); note('G1 (R29-1, write-path class) applied to the port source before stripping'); }
if (FAULT === 'g13') { raw = applyG13(raw); note('G13 (R30-1, upcast-path class) applied to the port source before stripping'); }

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

/** The two assertions both phases owe, over the RAW bytes and over what the port hands back. */
function assertClean(result, where) {
  for (const rec of result.persisted) {
    const keys = Object.keys(rec).sort();
    const extra = keys.filter((k) => !ROW_KEYS.includes(k));
    const missing = ROW_KEYS.filter((k) => !keys.includes(k));
    note(`persisted ${JSON.stringify(rec.id)}: ${keys.length} keys`);
    ok(extra.length === 0 && missing.length === 0,
      `${where}: the persisted record ${JSON.stringify(rec.id)} carries exactly ROW_KEYS`,
      { extra, missing });
  }
  for (const rec of result.viaPort) {
    const extra = Object.keys(rec).filter((k) => !ROW_KEYS.includes(k));
    ok(extra.length === 0, `${where}: the row listTrips() returns for ${JSON.stringify(rec.id)} carries no extra key`, extra);
  }
  // The literal thing A-31 clause 2 forbids.
  const blob = JSON.stringify(result.persisted);
  ok(!/countriesVisited|daysTravelled|citiesVisited|daysAbroad/.test(blob),
    `${where}: no lifetime count of any name is in the persisted bytes`,
    (blob.match(/countriesVisited|daysTravelled|citiesVisited|daysAbroad/g) ?? []).slice(0, 4));
  // And no coordinate (§5/§6, carried forward from rounds 26-28).
  const floats = (blob.match(/-?\d+\.\d+/g) ?? []);
  ok(floats.length === 0, `${where}: and no coordinate-shaped float`, floats.slice(0, 5));
}

const FAULT_TAG = FAULT === null ? '' : `  [${FAULT.toUpperCase()} FAULT APPLIED]`;

// ===========================================================================
// PHASE 1 — a FRESH database, one port instance, both mutating methods.
// ===========================================================================
head(`phase 1: a FRESH database — the summaries store, read straight out of IndexedDB${FAULT_TAG}`);
const phase1 = await page.evaluate(async (arg) => {
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

ok(phase1.seeded.every(Boolean) && phase1.persisted.length === 2, 'phase 1: two records were written', phase1.seeded);
assertClean(phase1, 'phase 1');
note(`persisted bytes for one row: ${JSON.stringify(phase1.persisted[1]).length}`);

// ===========================================================================
// PHASE 2 — a LEGACY database, written RAW, opened by the port afterwards.
//
// A-38 Part 6. The port did not create this database and there is no `versions` entry, so
// `ensureReady()`'s stamping branch — the write path phase 1 structurally cannot reach, because
// it deletes the database first — is what runs.
// ===========================================================================
head(`phase 2: a LEGACY database (no \`versions\` entry), seeded RAW, then opened by the port${FAULT_TAG}`);
const phase2 = await page.evaluate(async (arg) => {
  const rawTx = (db, names, mode, fn) => new Promise((res, rej) => {
    const tx = db.transaction(names, mode);
    const out = fn(tx);
    tx.oncomplete = () => res(out);
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
  await new Promise((res) => {
    const del = indexedDB.deleteDatabase('cairn');
    del.onsuccess = del.onerror = del.onblocked = () => res();
  });
  // --- the legacy state, written with a transaction that never touches the port ---
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn', arg.dbVersion);
    r.onupgradeneeded = () => {
      for (const n of ['docs', 'summaries', 'versions']) {
        if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n);
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  await rawTx(db, ['docs', 'summaries'], 'readwrite', (tx) => {
    tx.objectStore('docs').put(arg.doc, arg.id);
    tx.objectStore('summaries').put(arg.row, arg.id);
  });
  // Seed integrity, BEFORE the port is constructed: a seed that did not land degrades this
  // phase back into phase 1 while still reporting green (A-38 Part 4).
  const before = await rawTx(db, ['docs', 'summaries', 'versions'], 'readonly', (tx) => {
    const reqs = {};
    for (const n of ['docs', 'summaries', 'versions']) reqs[n] = tx.objectStore(n).getAllKeys();
    return reqs;
  });
  const seedKeys = Object.fromEntries(Object.entries(before).map(([n, r]) => [n, r.result.map(String)]));
  const seededRowKeys = Object.keys(arg.row).sort();
  db.close();

  // --- NOW the port opens it. `listTrips()` awaits `ensureReady()`. ---
  const storage = globalThis.indexedDbStorage();
  const viaPort = await storage.listTrips();
  let loadError = null;
  let loaded = null;
  try { loaded = await storage.load(arg.id); } catch (e) { loadError = String(e && e.message); }

  const after = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const d = r.result;
      const tx = d.transaction(['summaries', 'versions'], 'readonly');
      const rows = tx.objectStore('summaries').getAll();
      const vkeys = tx.objectStore('versions').getAllKeys();
      const vals = tx.objectStore('versions').getAll();
      tx.oncomplete = () => { d.close(); res({ persisted: rows.result, versionKeys: vkeys.result.map(String), versionValues: vals.result }); };
      tx.onerror = () => { d.close(); rej(tx.error); };
    };
    r.onerror = () => rej(r.error);
  });
  return { seedKeys, seededRowKeys, viaPort, loaded, loadError, ...after };
}, { dbVersion: DB_VERSION, id: 't-legacy', doc: JSON.stringify({ hello: 'legacy' }), row: ROW('t-legacy', 4) });

// The seed landed, and it landed CLEAN — which is what makes a red attributable to the port.
ok(phase2.seedKeys.docs.join() === 't-legacy' && phase2.seedKeys.summaries.join() === 't-legacy',
  'phase 2: the legacy seed landed in `docs` and `summaries`', phase2.seedKeys);
ok(phase2.seedKeys.versions.length === 0,
  'phase 2: and `versions` is EMPTY before the port runs — this is the legacy state', phase2.seedKeys.versions);
ok(phase2.seededRowKeys.join() === [...ROW_KEYS].sort().join(),
  'phase 2: the seeded row is ROW_KEYS-shaped BEFORE the port runs', phase2.seededRowKeys);
// The stamping branch ran.
ok(phase2.versionKeys.join() === 't-legacy' && typeof phase2.versionValues[0] === 'string' && phase2.versionValues[0].length > 0,
  'phase 2: the upcast stamped the versionless record exactly once', { keys: phase2.versionKeys, values: phase2.versionValues });
ok(phase2.loadError === null && phase2.loaded !== null && phase2.loaded.version === phase2.versionValues[0],
  'phase 2: load() resolves with the newly minted fence — which it cannot do unless the stamp landed',
  { loadError: phase2.loadError, loaded: phase2.loaded });
assertClean(phase2, 'phase 2');

await browser.close();
server.close();
console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}${FAULT === null ? '' : `  (fault: ${FAULT})`}`);
process.exit(0);
