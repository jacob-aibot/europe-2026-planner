/**
 * **6b-4 — the ACTUAL PERSISTED BYTES of the actual shipped IndexedDB port, in real Chromium.**
 *
 *   Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *        node --experimental-strip-types qa/i7a-idb-rowkeys.mjs      (from cairn/)
 *   Faults: `--fault` (= `--fault=g1`, A-36's write-path class), `--fault=g13` (A-38's
 *           upcast-path class), `--fault=g16` (A-39's stale-row class) or `--fault=g26`
 *           (§10 A-57 Part 8's orphan-sweep class). One per class, per A-38 Part 6, A-39
 *           Part 8 and A-57 Part 8.
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
 * **§10 A-57 Part 8 (revision 40, ROADMAP I-13) adds a THIRD PHASE, and it is the phase this
 * probe exists for.** I-13 fired A-39 Part 11 item 4 — `apps/web/src/ports/storage.ts` went
 * `DB_VERSION` **3 → 4** and `onupgradeneeded` now creates `photos` and `photoThumbs` (§10.3).
 * The covering set is re-derived over the new state in `test/stats-storage.test.ts`, in plain
 * Node; what plain Node cannot do is run a **real `versionchange` transaction**, and every
 * installed copy of Cairn runs exactly one of those on its first page load after the update:
 *
 *   **Phase 3** — a database at `DB_VERSION - 1`, holding **v1 documents** (`SCHEMA_VERSION`
 *                 went to 2 and `DB_VERSION` went to 4 in the same commit, so a version-3
 *                 database predates `Trip.photos` too), with a dead `meta` store and **no photo
 *                 stores at all**, written raw and closed. The port then opens it, Chromium runs
 *                 the real upgrade, and the probe asserts that the two stores arrive **empty**,
 *                 that `meta` is gone, and that not one summary row, document or fence moved.
 *
 * **Phase 2 gains photo BYTES**, for the same reason: a `present` derivative pair and an
 * **orphaned** one — a byte record no document references, which §10.2 calls reclaimable and
 * rules is *"deleted only by an explicit user action, never swept silently"*. `ensureReady()`
 * opens a `readwrite` transaction on every page load; the assertion is that both stores come out
 * of it byte for byte as they went in, orphan included. That is what `--fault=g26` attacks.
 *
 * Every phase asserts the seeded key set on the persisted records and on the rows `listTrips()`
 * returns, and every phase runs the "no lifetime count of any name in the persisted bytes" check.
 *
 * **This probe is not made redundant by 6b-1b's seeded arms — its remaining job is sharper.**
 * The recording double cannot model the `versionchange` transaction (a real `onupgradeneeded`
 * writes through `request.transaction`, which the double does not implement), so a widening
 * placed in the port's `onupgradeneeded` is beyond the double's reach *by construction* and is
 * visible only here. That is A-38 Part 8 residue 1, and phase 3 is the first phase to stand in
 * front of it.
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
const FAULTS = ['g1', 'g13', 'g16', 'g26'];
if (FAULT !== null && !FAULTS.includes(FAULT)) {
  throw new Error(`unknown fault ${JSON.stringify(FAULT)} — one of: g1 (write path), g13 (upcast path), g16 (stale-row path), g26 (orphan sweep)`);
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

/**
 * **G26 — the orphan-sweep class (§10 A-57 Part 8, ROADMAP I-13).** *"While we are in here, tidy
 * up the byte records nothing points at."* It is not a row widening: it is a **silent delete of a
 * derivative that has no original** — §10.4 stores none — and §10.2 forbids it in as many words:
 * orphaned bytes are *"reported by a selector and deleted only by an explicit user action, never
 * swept silently."* It is the most natural mistaken edit the two new stores admit, because
 * `ensureReady()` already has a `readwrite` transaction open on every page load.
 *
 * **Phase 2's orphaned byte record is what sees it.** Phase 1 writes no photo bytes and phase 3
 * starts from a database that has no photo stores at all, so both are green under it — which is
 * the negative measurement A-39 Part 9 requires, obtained by construction.
 */
function applyG26(s) {
  const anchor = "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);";
  if (!s.includes(anchor)) throw new Error('the ensureReady transaction moved — re-derive the fault');
  s = s.replace(anchor,
    "          const tx = db.transaction([DOCS, VERSIONS, PHOTOS, PHOTO_THUMBS], 'readwrite');\n"
    + '          const versions = tx.objectStore(VERSIONS);\n'
    + '          const docsStore = tx.objectStore(DOCS);\n'
    + '          const thumbs = tx.objectStore(PHOTO_THUMBS);\n'
    + '          const blobs = tx.objectStore(PHOTOS);', 1);
  const loop = '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;';
  if (!s.includes(loop)) throw new Error('the upcast loop moved — re-derive the fault');
  return s.replace(loop,
    '              const photoKeys = thumbs.getAllKeys() as IDBRequest<IDBValidKey[]>;\n'
    + '              photoKeys.onsuccess = () => {\n'
    + '                const docsAll = docsStore.getAll() as IDBRequest<unknown[]>;\n'
    + '                docsAll.onsuccess = () => {\n'
    + '                  const referenced = new Set<string>();\n'
    + '                  for (const rawDoc of docsAll.result) {\n'
    + '                    try {\n'
    + '                      const parsedDoc = JSON.parse(String(rawDoc)) as { photos?: Array<{ id?: unknown }> };\n'
    + '                      if (Array.isArray(parsedDoc.photos)) for (const p of parsedDoc.photos) referenced.add(String(p?.id));\n'
    + '                    } catch { /* a document we cannot read references nothing */ }\n'
    + '                  }\n'
    + '                  for (const k of photoKeys.result) {\n'
    + '                    if (referenced.has(String(k))) continue;\n'
    + '                    thumbs.delete(k);\n'
    + '                    blobs.delete(k);\n'
    + '                  }\n'
    + '                };\n'
    + '              };\n'
    + loop, 1);
}

if (FAULT === 'g1') { raw = applyG1(raw); note('G1 (R29-1, write-path class) applied to the port source before stripping'); }
if (FAULT === 'g13') { raw = applyG13(raw); note('G13 (R30-1, upcast-path class) applied to the port source before stripping'); }
if (FAULT === 'g16') { raw = applyG16(raw); note('G16 (R31-1, stale-row class) applied to the port source before stripping'); }
if (FAULT === 'g26') { raw = applyG26(raw); note('G26 (A-57 Part 8, orphan-sweep class) applied to the port source before stripping'); }

const src = stripTypeScriptTypes(raw, { mode: 'strip' });
/**
 * The module is evaluated as a plain script in the page, so **every** `export` has to go — not
 * just the one this probe calls.
 *
 * **This was a real break, found by running it (I-13 follow-up).** §10.2 put the storage half of
 * `PhotoPort` beside `indexedDbStorage` in this same file, so the shipped source has carried a
 * second `export function indexedDbPhotoBytes` since commit `1820813`, and this probe — which
 * stripped one export by name — has died with `SyntaxError: Unexpected token 'export'` ever
 * since. It is stripped by pattern now, and the count is asserted, so the next export added to
 * the port is an UNRUN error here rather than a stack trace.
 */
const EXPORTED = [...src.matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
if (!EXPORTED.includes('indexedDbStorage')) throw new Error('the export shape moved — `indexedDbStorage` is not an exported function');
const injected = src.replace(/^export function /gm, 'function ') +
  `\n${EXPORTED.map((n) => `globalThis.${n} = ${n};`).join('\n')}\n`;
if (/^export /m.test(injected)) throw new Error('an export survived the strip — the page evaluates this as a script');
note(`port exports evaluated in the page: ${EXPORTED.join(', ')}`);

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

// ===========================================================================
// **§10 A-57 Part 8 — the two byte stores.** Names read from the port's own source rather than
// transcribed, so a rename is an UNRUN error here rather than a silently-skipped assertion.
// ===========================================================================
const PHOTOS = /^const PHOTOS = '(\w+)';$/m.exec(raw)?.[1];
const PHOTO_THUMBS = /^const PHOTO_THUMBS = '(\w+)';$/m.exec(raw)?.[1];
if (PHOTOS === undefined || PHOTO_THUMBS === undefined) {
  throw new Error('the photo store names could not be read from the port (§10.3) — re-derive them');
}

/** A `PhotoId` in a document whose bytes ARE stored. */
const PHOTO_PRESENT = 'photo-present-1';
/** A byte record no document references — §10.2's reclaimable orphan, and G26's target. */
const PHOTO_ORPHAN = 'photo-orphan-nothing-references-me';

/**
 * A document whose `photos[]` references `ids`, at the current `schemaVersion`. Deliberately
 * minimal: `ensureReady()` reads document KEYS and never a document VALUE, so what matters here
 * is that a fault which *does* parse one finds a real reference list. No caption, **no
 * coordinate, no capture time** — §10.5's cross-cutting rule, at the one place a fixture can
 * break it by accident.
 */
const DOC_WITH_PHOTOS = (ids) => JSON.stringify({
  hello: 'legacy',
  schemaVersion: 2,
  photos: ids.map((id) => ({ id })),
});

/** The v1 shape: no `photos` key at all, and `schemaVersion: 1`. Phase 3's document. */
const DOC_V1 = JSON.stringify({ hello: 'pre-i13', schemaVersion: 1 });

/**
 * **The assertion the two new stores oblige every phase to carry (§10 A-57 Part 8).**
 *
 * `ensureReady()` neither writes nor deletes a derivative. The failure mode here is not a
 * widening but a **deletion**, and it is unrecoverable: §10.4 stores no original, so a swept
 * derivative is a photograph Cairn cannot get back. §10.2 rules that orphaned bytes are
 * *"reported by a selector and deleted only by an explicit user action, never swept silently"*.
 */
function assertBytesIntact(result, where, expected) {
  const want = [...expected].sort();
  for (const [store, keys] of Object.entries(result.photoKeys ?? {})) {
    ok(keys.slice().sort().join() === want.join(),
      `${where}: the byte store \`${store}\` holds exactly the records it was seeded with — ` +
        'an orphan is reclaimable, not sweepable (§10.2)',
      { got: keys, want });
  }
}

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
  // **§10 A-57 Part 8.** The two byte stores, read raw. `indexedDbStorage` never writes them —
  // that is `indexedDbPhotoBytes`, a different export with a different fence (§10.2) — so a key
  // here after a pure document write means the document path grew a byte write.
  const photoKeys = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction([arg.photos, arg.photoThumbs], 'readonly');
      const p = tx.objectStore(arg.photos).getAllKeys();
      const t = tx.objectStore(arg.photoThumbs).getAllKeys();
      tx.oncomplete = () => { db.close(); res({ [arg.photos]: p.result.map(String), [arg.photoThumbs]: t.result.map(String) }); };
      tx.onerror = () => { db.close(); rej(tx.error); };
    };
    r.onerror = () => rej(r.error);
  });
  const storeNames = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => { const db = r.result; const n = [...db.objectStoreNames].sort(); db.close(); res(n); };
    r.onerror = () => rej(r.error);
  });
  return { persisted, viaPort: await storage.listTrips(), seeded: [a.ok, b.ok], photoKeys, storeNames };
}, {
  doc: JSON.stringify({ hello: 'world' }), rowA: ROW('t1', 4), rowA5: ROW('t1', 5), rowB: ROW('t2', 5),
  photos: PHOTOS, photoThumbs: PHOTO_THUMBS,
});

ok(phase1.seeded.every(Boolean) && phase1.persisted.length === 2, 'phase 1: two records were written', phase1.seeded);
assertClean(phase1, 'phase 1');
// **§10.3, measured rather than read out of the source.** A fresh database created by the SHIPPED
// `onupgradeneeded` carries exactly five object stores, and `meta` is not one of them.
ok(phase1.storeNames.join() === ['docs', 'summaries', 'versions', PHOTOS, PHOTO_THUMBS].sort().join(),
  'phase 1: a database the port created holds exactly its five object stores, and no `meta`',
  phase1.storeNames);
assertBytesIntact(phase1, 'phase 1', []);
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
  const ALL = ['docs', 'summaries', 'versions', arg.photos, arg.photoThumbs];
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn', arg.dbVersion);
    r.onupgradeneeded = () => {
      for (const n of ALL) {
        if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n);
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  await rawTx(db, ['docs', 'summaries', arg.photos, arg.photoThumbs], 'readwrite', (tx) => {
    for (const rec of arg.records) {
      tx.objectStore('docs').put(rec.doc, rec.id);
      tx.objectStore('summaries').put(rec.row, rec.id);
    }
    // **§10 A-57 Part 8, Axis B and Axis O.** A referenced derivative pair, and an ORPHANED one.
    // Stored as `ArrayBuffer`s, which is what §10.3 stores and what a structured clone carries.
    for (const id of arg.bytes) {
      tx.objectStore(arg.photoThumbs).put(new Uint8Array([1, 2, 3]).buffer, id);
      tx.objectStore(arg.photos).put(new Uint8Array([4, 5, 6, 7]).buffer, id);
    }
  });
  // Seed integrity, BEFORE the port is constructed: a seed that did not land degrades this
  // phase back into phase 1 while still reporting green (A-38 Part 4).
  const before = await rawTx(db, ALL, 'readonly', (tx) => {
    const reqs = {};
    for (const n of ALL) reqs[n] = tx.objectStore(n).getAllKeys();
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
      const tx = d.transaction(['summaries', 'versions', arg.photos, arg.photoThumbs], 'readonly');
      const rows = tx.objectStore('summaries').getAll();
      const vkeys = tx.objectStore('versions').getAllKeys();
      const vals = tx.objectStore('versions').getAll();
      const pk = tx.objectStore(arg.photos).getAllKeys();
      const tk = tx.objectStore(arg.photoThumbs).getAllKeys();
      const pv = tx.objectStore(arg.photos).getAll();
      tx.oncomplete = () => {
        d.close();
        res({
          persisted: rows.result,
          versionKeys: vkeys.result.map(String).sort(),
          versionValues: vals.result,
          photoKeys: { [arg.photos]: pk.result.map(String), [arg.photoThumbs]: tk.result.map(String) },
          // §10.3's *"a bare `ArrayBuffer`"*, measured on the way back out of a real database.
          photoTypes: pv.result.map((v) => Object.prototype.toString.call(v)),
        });
      };
      tx.onerror = () => { d.close(); rej(tx.error); };
    };
    r.onerror = () => rej(r.error);
  });
  return { seedKeys, seededRowKeys, viaPort, loads, ...after };
  }, {
  dbVersion: DB_VERSION,
  photos: PHOTOS,
  photoThumbs: PHOTO_THUMBS,
  // **A-39 Part 8.** Two records, the widest separation on Axis S, differing in KEY SET as well
  // as in version — so both a numeric staleness guard (G16) and a key-presence guard are live.
  //
  // **§10 A-57 Part 8 gives them Axis B positions too.** `t-legacy`'s document references a
  // photo whose bytes ARE stored (`present`); `t-legacy-g1`'s references none (`none`). Both are
  // v2 documents — a v1 one is phase 3's business, because a v1 document belongs to a database
  // that also predates the two stores.
  records: [
    { id: 't-legacy', row: ROW('t-legacy', 5), doc: DOC_WITH_PHOTOS([PHOTO_PRESENT]) },
    { id: 't-legacy-g1', row: ROW_GEN1('t-legacy-g1'), doc: DOC_WITH_PHOTOS([]) },
  ],
  // The referenced pair, and the ORPHAN — Axis O's live cell.
  bytes: [PHOTO_PRESENT, PHOTO_ORPHAN],
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
// **§10 A-57 Part 8.** The seed landed on Axis B and Axis O, before the port ran…
ok(phase2.seedKeys[PHOTO_THUMBS].join() === [PHOTO_PRESENT, PHOTO_ORPHAN].sort().join()
  && phase2.seedKeys[PHOTOS].join() === [PHOTO_PRESENT, PHOTO_ORPHAN].sort().join(),
  'phase 2: a REFERENCED derivative pair and an ORPHANED one landed before the port ran — ' +
    'without the orphan, the sweep fault has nothing to sweep and reports green',
  { thumbs: phase2.seedKeys[PHOTO_THUMBS], photos: phase2.seedKeys[PHOTOS] });
// …and it is all still there afterwards. This is the assertion G26 dies on.
assertBytesIntact(phase2, 'phase 2', [PHOTO_PRESENT, PHOTO_ORPHAN]);
ok(phase2.photoTypes.every((t) => t === '[object ArrayBuffer]'),
  'phase 2: a derivative comes back out of a REAL database as a bare ArrayBuffer (§10.3)', phase2.photoTypes);
}

// ===========================================================================
// PHASE 3 — a database at `DB_VERSION - 1`: the two photo stores DO NOT EXIST, and the port's
// real `onupgradeneeded` has to create them.
//
// **§10 A-57 Part 8 / A-39 Part 11 item 4.** This is the phase the covering set cannot reach
// from Node: the recording double models `createObjectStore`, but a real `versionchange`
// transaction — its lifetime, its interaction with the pending open, and the fact that a write
// inside it goes through `request.transaction` — is exactly the class A-38 Part 6 says this
// probe exists for and A-38 Part 8 residue 1 names.
//
// Its records are **v1 documents**, because that is the only thing a version-3 database can
// hold: `SCHEMA_VERSION` → 2 and `DB_VERSION` → 4 shipped in the same commit. It also carries
// the dead `meta` store, whose unconditional deletion has never been executed by anything before
// now (phase 1 creates a fresh database; phase 2 seeds one already at `DB_VERSION`).
// ===========================================================================
head(`phase 3: a database at DB_VERSION ${DB_VERSION - 1} — no photo stores, a dead \`meta\` store, v1 documents — then opened by the port${FAULT_TAG}`);
let phase3 = null;
let phase3Error = null;
try {
phase3 = await page.evaluate(async (arg) => {
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
  // --- a pre-I-13 database, at the PREVIOUS version, written without the port ---
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn', arg.oldVersion);
    r.onupgradeneeded = () => {
      for (const n of ['docs', 'summaries', 'versions', 'meta']) {
        if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n);
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  await rawTx(db, ['docs', 'summaries', 'meta'], 'readwrite', (tx) => {
    for (const rec of arg.records) {
      tx.objectStore('docs').put(arg.doc, rec.id);
      tx.objectStore('summaries').put(rec.row, rec.id);
    }
    tx.objectStore('meta').put('a value R4-2 deleted', 'epoch');
  });
  const beforeNames = [...db.objectStoreNames].sort();
  const beforeVersion = db.version;
  const before = await rawTx(db, ['docs', 'summaries', 'versions'], 'readonly', (tx) => {
    const reqs = {};
    for (const n of ['docs', 'summaries', 'versions']) reqs[n] = tx.objectStore(n).getAllKeys();
    return reqs;
  });
  const seedKeys = Object.fromEntries(Object.entries(before).map(([n, r]) => [n, r.result.map(String).sort()]));
  const seededRowKeys = Object.fromEntries(arg.records.map((rec) => [rec.id, Object.keys(rec.row).sort()]));
  db.close();

  // --- NOW the port opens it. `open()` runs the REAL upgrade before `ensureReady()`'s tx. ---
  const storage = globalThis.indexedDbStorage();
  const viaPort = await storage.listTrips();
  const docs = {};
  for (const rec of arg.records) {
    try { docs[rec.id] = { loaded: await storage.load(rec.id), error: null }; }
    catch (e) { docs[rec.id] = { loaded: null, error: String(e && e.message) }; }
  }

  const after = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const d = r.result;
      const names = [...d.objectStoreNames].sort();
      const version = d.version;
      const tx = d.transaction(['summaries', 'versions', arg.photos, arg.photoThumbs], 'readonly');
      const rows = tx.objectStore('summaries').getAll();
      const vals = tx.objectStore('versions').getAll();
      const vkeys = tx.objectStore('versions').getAllKeys();
      const pk = tx.objectStore(arg.photos).getAllKeys();
      const tk = tx.objectStore(arg.photoThumbs).getAllKeys();
      tx.oncomplete = () => {
        d.close();
        res({
          names, version, persisted: rows.result, versionValues: vals.result,
          versionKeys: vkeys.result.map(String).sort(),
          photoKeys: { [arg.photos]: pk.result.map(String), [arg.photoThumbs]: tk.result.map(String) },
        });
      };
      tx.onerror = () => { d.close(); rej(tx.error); };
    };
    r.onerror = () => rej(r.error);
  });
  return { beforeNames, beforeVersion, seedKeys, seededRowKeys, viaPort, docs, ...after };
}, {
  oldVersion: DB_VERSION - 1,
  photos: PHOTOS,
  photoThumbs: PHOTO_THUMBS,
  doc: DOC_V1,
  records: [
    { id: 't-old', row: ROW('t-old', 5) },
    { id: 't-old-g1', row: ROW_GEN1('t-old-g1') },
  ],
});
} catch (e) {
  phase3Error = String((e && e.message) || e);
}

const PHASE3_IDS = ['t-old', 't-old-g1'];
ok(phase3 !== null,
  'phase 3: the port ran to completion in the browser — an upgrade that THREW is not green',
  phase3Error === null ? undefined : phase3Error.split('\n')[0].slice(0, 160));
if (phase3 !== null) {
// The starting state is genuinely pre-I-13, or this phase is phase 2 wearing its name.
ok(phase3.beforeVersion === DB_VERSION - 1 && phase3.beforeNames.join() === ['docs', 'meta', 'summaries', 'versions'].join(),
  `phase 3: BEFORE the port ran, the database is at version ${DB_VERSION - 1} with no photo store and a dead \`meta\``,
  { version: phase3.beforeVersion, names: phase3.beforeNames });
ok(phase3.seedKeys.docs.join() === PHASE3_IDS.join() && phase3.seedKeys.versions.length === 0,
  'phase 3: both records landed and `versions` is empty — the stamping branch has work to do', phase3.seedKeys);
// The upgrade ran, and it created exactly the two stores and destroyed exactly the one.
ok(phase3.version === DB_VERSION,
  `phase 3: the port's open() upgraded the database to DB_VERSION ${DB_VERSION}`, phase3.version);
ok(phase3.names.join() === ['docs', 'summaries', 'versions', PHOTOS, PHOTO_THUMBS].sort().join(),
  'phase 3: onupgradeneeded created BOTH byte stores and deleted `meta` — measured on a real ' +
    'versionchange transaction, which is the class the recording double cannot model',
  phase3.names);
// And it created them EMPTY. A byte record arriving from an upgrade is a blob with no tenancy
// reference, which is the one thing §6.3 exists to make impossible.
assertBytesIntact(phase3, 'phase 3', []);
// An upgrade is not a rewrite: no row, no document and no fence moved through it.
assertClean(phase3, 'phase 3', phase3.seededRowKeys);
ok(phase3.versionKeys.join() === PHASE3_IDS.join()
  && phase3.versionValues.length === 2
  && new Set(phase3.versionValues).size === 2,
  'phase 3: the upcast still stamped each versionless record exactly once ACROSS the upgrade',
  { keys: phase3.versionKeys, values: phase3.versionValues });
for (const id of PHASE3_IDS) {
  const l = phase3.docs[id];
  ok(l.error === null && l.loaded !== null && l.loaded.doc === DOC_V1,
    `phase 3: load(${JSON.stringify(id)}) hands back the v1 document BYTE FOR BYTE — the upgrade migrated no document, which is core's job and not the port's`,
    l);
}
}

await browser.close();
server.close();
console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}${FAULT === null ? '' : `  (fault: ${FAULT})`}`);
process.exit(0);
