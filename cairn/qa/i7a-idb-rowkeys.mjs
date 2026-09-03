/**
 * **6b-4 — the ACTUAL PERSISTED BYTES of the actual shipped IndexedDB port, in real Chromium.**
 *
 *   Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *        node --experimental-strip-types qa/i7a-idb-rowkeys.mjs      (from cairn/)
 *   Faults: `--fault` (= `--fault=g1`, A-36's write-path class), `--fault=g13` (A-38's
 *           upcast-path class) or `--fault=g16` (A-39's stale-row class). One per class, per
 *           A-38 Part 6 and A-39 Part 8.
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
 * **A-39 Part 8 (revision 28, QA R31-1) un-blinds phase 2, at the smallest honest cost.** Phase 2
 * hard-coded `row: ROW('t-legacy', 4)` — one freshly-shaped record — which is why R31-1's H4
 * measured `ALL OK` here on both phases. This probe is **not** the coverage mechanism (that is
 * `test/stats-storage.test.ts`'s 15-state covering table, in plain Node); its job is the classes
 * the double cannot model — structured clone, real transaction lifetimes, `versionchange`. So it
 * does **not** take the 15-state array. It seeds **two** records instead of one:
 *
 *   `t-legacy`     `ROW(id, 5)`      — the current shape (gen-5, §8.4 A-56)
 *   `t-legacy-g1`  `ROW_GEN1(id)`    — the gen-1 shape: no `summaryVersion`, no `countryCodes`,
 *                                      no `cities`, no `attribution`
 *
 * That is the widest separation on A-39's Axis S, and the pair differs in **key set** as well as
 * in version — so both a numeric staleness guard and a key-presence guard are live in a real
 * browser. Each record's key set is asserted **against the key set it was seeded with**, per id,
 * exactly as A-39 Part 7 point 2 requires of the Node arms.
 *
 * Both phases assert the seeded key set on the persisted records and on the rows `listTrips()`
 * returns, and both run the "no lifetime count of any name in the persisted bytes" blob check.
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
if (FAULT !== null && FAULT !== 'g1' && FAULT !== 'g13' && FAULT !== 'g16') {
  throw new Error(`unknown fault ${JSON.stringify(FAULT)} — one of: g1 (write path), g13 (upcast path), g16 (stale-row path)`);
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

/** `SUMMARY_VERSION`, read from core rather than transcribed, so G16's guard cannot go stale. */
const SUMMARY_VERSION = Number(
  /^export const SUMMARY_VERSION = (\d+);$/m.exec(
    readFileSync(new URL('../packages/core/src/derive/summary.ts', import.meta.url), 'utf8'),
  )?.[1],
);
if (!Number.isInteger(SUMMARY_VERSION)) throw new Error('SUMMARY_VERSION could not be read from core');

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

/**
 * **G16 — the stale-row class (A-39, QA R31-1).** *"While we are in here, bring stale rows
 * current."* The same transaction-scope widening G13 makes, guarded on `summaryVersion` instead
 * of on the stamping branch, so it fires for every row below the current generation. It measured
 * `ALL OK` in real Chromium on both phases of this probe before A-39, because phase 1 deletes the
 * database and phase 2 seeded a single freshly-shaped row. **`t-legacy-g1` is what sees it.**
 */
function applyG16(s) {
  const tx = "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);";
  if (!s.includes(tx)) throw new Error('the ensureReady transaction moved — re-derive the fault');
  s = s.replace(tx, "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);", 1);
  const loop = '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;';
  if (!s.includes(loop)) throw new Error('the upcast loop moved — re-derive the fault');
  return s.replace(loop,
    '              const all = sums.getAll() as IDBRequest<TripSummaryRow[]>;\n'
    + '              all.onsuccess = () => {\n'
    + '                for (const r of all.result) {\n'
    + `                  if ((r.summaryVersion ?? 0) < ${SUMMARY_VERSION}) sums.put({ ...r, daysTravelled: r.dayCount }, r.id);\n`
    + '                }\n'
    + '              };\n'
    + loop, 1);
}

if (FAULT === 'g1') { raw = applyG1(raw); note('G1 (R29-1, write-path class) applied to the port source before stripping'); }
if (FAULT === 'g13') { raw = applyG13(raw); note('G13 (R30-1, upcast-path class) applied to the port source before stripping'); }
if (FAULT === 'g16') { raw = applyG16(raw); note('G16 (R31-1, stale-row class) applied to the port source before stripping'); }

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
  // **§8.4 A-56 (I-12).** The gen-5 `cities[]` entry: `centre` (the document's own
  // `City.centre`, copied verbatim) plus `firstDay`/`lastDay`. This literal is the CURRENT
  // shape, so it has to carry them or phase 2's "gen-current vs gen-1" pair stops being the
  // widest separation on Axis S that it claims to be.
  cities: [{
    key: 'hvar', name: 'Hvar', countryCode: 'HR', countrySource: 'stated',
    centre: { lat: 43.1729, lng: 16.4413 }, firstDay: '2026-08-07', lastDay: '2026-08-08',
  }],
  attribution: { places: { located: 9, attributed: 8 }, stops: { located: 7, attributed: 7 } },
  summaryVersion: ver,
});

/**
 * **A-39 Part 8.** The gen-1 shape from the ledger in `SUMMARY_VERSION`'s own docstring: the same
 * literal as `ROW`, with `summaryVersion`, `countryCodes`, `cities` and `attribution` **absent**.
 * Like `ROW` it is a hand-typed literal and stays one — this file is out of suite, it is pinned
 * against its own `ROW_KEYS` above, and A-38 Part 4's mint-don't-type rule was never about it.
 */
const ROW_GEN1 = (id) => ({
  id, title: `T ${id}`, startDate: '2026-08-07', endDate: '2026-08-09', datePrecision: 'exact',
  cityCount: 1, dayCount: 3, stopCount: 7, poolCount: 2, revision: 1,
});

/**
 * The two assertions both phases owe, over the RAW bytes and over what the port hands back.
 *
 * **A-39 Part 7 point 2 / Part 8:** `expected` maps id → the key set that record was SEEDED
 * with. Where it has no entry the record is one the PORT minted, and `ROW_KEYS` is the right
 * oracle because for those the port is the author.
 */
function assertClean(result, where, expected = {}) {
  for (const rec of result.persisted) {
    const keys = Object.keys(rec).sort();
    const want = (expected[rec.id] ?? ROW_KEYS).slice().sort();
    const extra = keys.filter((k) => !want.includes(k));
    const missing = want.filter((k) => !keys.includes(k));
    note(`persisted ${JSON.stringify(rec.id)}: ${keys.length} keys (expected ${want.length})`);
    ok(extra.length === 0 && missing.length === 0,
      `${where}: the persisted record ${JSON.stringify(rec.id)} carries exactly the key set it was seeded with`,
      { extra, missing });
  }
  for (const rec of result.viaPort) {
    const want = expected[rec.id] ?? ROW_KEYS;
    const extra = Object.keys(rec).filter((k) => !want.includes(k));
    ok(extra.length === 0, `${where}: the row listTrips() returns for ${JSON.stringify(rec.id)} carries no extra key`, extra);
  }
  // The literal thing A-31 clause 2 forbids.
  const blob = JSON.stringify(result.persisted);
  ok(!/countriesVisited|daysTravelled|citiesVisited|daysAbroad/.test(blob),
    `${where}: no lifetime count of any name is in the persisted bytes`,
    (blob.match(/countriesVisited|daysTravelled|citiesVisited|daysAbroad/g) ?? []).slice(0, 4));
  // And no coordinate (§5/§6, carried forward from rounds 26-28) **outside `cities[].centre`**.
  //
  // **Narrowed at §8.4 A-56 (I-12), and narrowed rather than dropped.** A-56 Part 2 puts the
  // city's own `City.centre` on the row deliberately — *"the same coordinate the document
  // already stores, in the same database, on the same device"* — and Part 5 makes the ceiling
  // mechanical somewhere else: no golden, no log line, no CLI. What this probe still owes is
  // that no OTHER float reaches the persisted bytes.
  //
  // **The strip is keyed to the PATH `cities[].centre`, not to the name `centre` (round 43,
  // R43-3).** It used to be a `JSON.stringify` replacer testing `k === 'centre'`, which
  // exempted a `centre` key at any depth in any context — while the bare-`{lat, lng}` shape
  // assertion below, the thing that is supposed to make the exemption safe, only ever walks
  // `rec.cities[].centre`. A float under, say, a `home.centre` key was therefore invisible to
  // both halves. The two now cover exactly the same path: one record's `cities` array, one
  // level down, and nowhere else. (A float smuggled INSIDE `cities[].centre` is still the
  // shape assertion's job, by design — that is the division of labour, not a gap.)
  const withoutCityCentres = result.persisted.map((rec) => {
    if (!Array.isArray(rec.cities)) return rec;
    return {
      ...rec,
      cities: rec.cities.map((c) => {
        if (c === null || typeof c !== 'object' || !('centre' in c)) return c;
        const { centre, ...rest } = c;
        return rest;
      }),
    };
  });
  const floats = (JSON.stringify(withoutCityCentres).match(/-?\d+\.\d+/g) ?? []);
  ok(floats.length === 0, `${where}: and no coordinate-shaped float outside cities[].centre`, floats.slice(0, 5));
  // The narrowing is not a hole: a centre that is NOT a bare {lat, lng} pair still fails.
  for (const rec of result.persisted) {
    for (const c of rec.cities ?? []) {
      if (c.centre === undefined) continue;
      ok(Object.keys(c.centre).sort().join() === 'lat,lng',
        `${where}: cities[].centre is a bare {lat, lng} and nothing else`, Object.keys(c.centre));
    }
  }
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
  await storage.refreshSummary('t1', a.version, arg.rowA5);
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
}, { doc: JSON.stringify({ hello: 'world' }), rowA: ROW('t1', 4), rowA5: ROW('t1', 5), rowB: ROW('t2', 5) });

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
head(`phase 2: a LEGACY database (no \`versions\` entry), TWO records — gen-5 and gen-1 — seeded RAW, then opened by the port${FAULT_TAG}`);
// **Wrapped, from A-39 Part 8 on.** Phase 2 now holds a **gen-1** record, and a fault whose
// guard dereferences a key that generation never carried — A-38's own G13 reads
// `r.countryCodes.length` — throws inside the browser instead of widening a row. A throw is not
// green, but an uncaught one kills the probe before it can print a summary, which turns a
// recorded measurement into a stack trace. So it is caught and REPORTED as a failure. Nothing
// about the faults themselves changes; only the probe's ability to still report.
let phase2 = null;
let phase2Error = null;
try {
phase2 = await page.evaluate(async (arg) => {
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
    for (const rec of arg.records) {
      tx.objectStore('docs').put(arg.doc, rec.id);
      tx.objectStore('summaries').put(rec.row, rec.id);
    }
  });
  // Seed integrity, BEFORE the port is constructed: a seed that did not land degrades this
  // phase back into phase 1 while still reporting green (A-38 Part 4).
  const before = await rawTx(db, ['docs', 'summaries', 'versions'], 'readonly', (tx) => {
    const reqs = {};
    for (const n of ['docs', 'summaries', 'versions']) reqs[n] = tx.objectStore(n).getAllKeys();
    return reqs;
  });
  const seedKeys = Object.fromEntries(Object.entries(before).map(([n, r]) => [n, r.result.map(String).sort()]));
  const seededRowKeys = Object.fromEntries(arg.records.map((rec) => [rec.id, Object.keys(rec.row).sort()]));
  db.close();

  // --- NOW the port opens it. `listTrips()` awaits `ensureReady()`. ---
  const storage = globalThis.indexedDbStorage();
  const viaPort = await storage.listTrips();
  const loads = {};
  for (const rec of arg.records) {
    try { loads[rec.id] = { loaded: await storage.load(rec.id), error: null }; }
    catch (e) { loads[rec.id] = { loaded: null, error: String(e && e.message) }; }
  }

  const after = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const d = r.result;
      const tx = d.transaction(['summaries', 'versions'], 'readonly');
      const rows = tx.objectStore('summaries').getAll();
      const vkeys = tx.objectStore('versions').getAllKeys();
      const vals = tx.objectStore('versions').getAll();
      tx.oncomplete = () => { d.close(); res({ persisted: rows.result, versionKeys: vkeys.result.map(String).sort(), versionValues: vals.result }); };
      tx.onerror = () => { d.close(); rej(tx.error); };
    };
    r.onerror = () => rej(r.error);
  });
  return { seedKeys, seededRowKeys, viaPort, loads, ...after };
  }, {
  dbVersion: DB_VERSION,
  doc: JSON.stringify({ hello: 'legacy' }),
  // **A-39 Part 8.** Two records, the widest separation on Axis S, differing in KEY SET as well
  // as in version — so both a numeric staleness guard (G16) and a key-presence guard are live.
  records: [
    { id: 't-legacy', row: ROW('t-legacy', 5) },
    { id: 't-legacy-g1', row: ROW_GEN1('t-legacy-g1') },
  ],
  });
} catch (e) {
  phase2Error = String((e && e.message) || e);
}

const PHASE2_IDS = ['t-legacy', 't-legacy-g1'];
ok(phase2 !== null,
  'phase 2: the port ran to completion in the browser — a fault that THREW is not green, but a ' +
    'throw is not a key-set measurement either',
  phase2Error === null ? undefined : phase2Error.split('\n')[0].slice(0, 160));
if (phase2 !== null) {
const PHASE2_EXPECTED = phase2.seededRowKeys;

// The seed landed, and it landed as the shape each record NAMES — which is what makes a red
// attributable to the port, per id (A-39 Part 7 point 1).
ok(phase2.seedKeys.docs.join() === PHASE2_IDS.join() && phase2.seedKeys.summaries.join() === PHASE2_IDS.join(),
  'phase 2: both legacy records landed in `docs` and `summaries`', phase2.seedKeys);
ok(phase2.seedKeys.versions.length === 0,
  'phase 2: and `versions` is EMPTY before the port runs — this is the legacy state', phase2.seedKeys.versions);
ok(PHASE2_EXPECTED['t-legacy'].join() === [...ROW_KEYS].sort().join(),
  'phase 2: the gen-5 seeded row is ROW_KEYS-shaped BEFORE the port runs', PHASE2_EXPECTED['t-legacy']);
{
  const g1 = PHASE2_EXPECTED['t-legacy-g1'];
  const gone = ['summaryVersion', 'countryCodes', 'cities', 'attribution'];
  ok(gone.every((k) => !g1.includes(k)) && g1.length === ROW_KEYS.length - gone.length,
    'phase 2: the gen-1 seeded row genuinely LACKS the four keys that generation never carried — ' +
      'a fixture aged by a number alone is invisible to a key-presence guard (§8.4 A-39 Part 6)', g1);
}
// The stamping branch ran, for BOTH records.
ok(phase2.versionKeys.join() === PHASE2_IDS.join()
  && phase2.versionValues.length === 2
  && phase2.versionValues.every((v) => typeof v === 'string' && v.length > 0)
  && new Set(phase2.versionValues).size === 2,
  'phase 2: the upcast stamped each versionless record exactly once, with distinct tokens',
  { keys: phase2.versionKeys, values: phase2.versionValues });
for (const id of PHASE2_IDS) {
  const l = phase2.loads[id];
  ok(l.error === null && l.loaded !== null && phase2.versionValues.includes(l.loaded.version),
    `phase 2: load(${JSON.stringify(id)}) resolves with a newly minted fence — which it cannot do unless the stamp landed`,
    l);
}
assertClean(phase2, 'phase 2', PHASE2_EXPECTED);
}

await browser.close();
server.close();
console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}${FAULT === null ? '' : `  (fault: ${FAULT})`}`);
process.exit(0);
