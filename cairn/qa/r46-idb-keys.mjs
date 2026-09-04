/**
 * **QA round 46 — A-62's compound byte key, attacked in a real engine.**
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *     node --experimental-strip-types qa/r46-idb-keys.mjs                (from cairn/)
 *     node --experimental-strip-types qa/r46-idb-keys.mjs --engine=webkit
 *
 * `qa/i7a-idb-rowkeys.mjs` phase 4 is the builder's own Q8: two trips, `'t'` vs `'t2'`, one
 * range read each. This probe is the adversarial half — it does not re-run phase 4, it attacks
 * the three claims phase 4 rests on and the migration arm phase 4 does not exercise at all:
 *
 *   §A  **the ordering claim, measured rather than cited.** A-62 Part 5 point 1 asserts
 *       `number < date < string < binary < array` from a search result, and
 *       `apps/web/src/ports/storage.ts:77` says it is *"a measurement in
 *       `qa/i7a-idb-rowkeys.mjs` phase 5"* — a phase that does not exist. `indexedDB.cmp` is
 *       the engine's own answer and this section asks it.
 *   §B  **the range bound against an adversarial neighbourhood of trip ids** — not one prefix
 *       pair but eleven ids chosen to break a string-prefix range, a lexical range, a
 *       case-folding one and a Unicode-normalising one, all seeded into ONE store at once.
 *   §C  **adversarial photo ids** — empty, 4 KB long, U+0000-bearing, numeric-looking. Each one
 *       must still be reachable by `read` and swept by `removeTrip`.
 *   §D  **Q6 in a real engine.** The builder measured the 4 → 5 migration against the recording
 *       double in `test/stats-storage.test.ts`. This seeds a genuine `DB_VERSION` 4 database
 *       with genuine BARE-keyed byte records and runs a genuine `versionchange`.
 *   §E  **an INTERRUPTED upgrade** — the versionchange transaction aborted half way — then the
 *       port opening the wreckage. A migration that is not atomic leaves a store that exists
 *       with the old key shape.
 *   §F  **a database from a FUTURE build** (`DB_VERSION` 6) opened by this build.
 *   §G  a database at `DB_VERSION` **3** — before the byte stores existed at all.
 *
 * Sections §A–§C evaluate raw IndexedDB in the page. §D–§G evaluate the SHIPPED port source,
 * stripped and injected the way `qa/i7a-idb-rowkeys.mjs` does it, so the `onupgradeneeded` under
 * test is the one that ships.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const ENGINE_ARG = process.argv.find((a) => a.startsWith('--engine='));
const ENGINE = ENGINE_ARG === undefined ? 'chromium' : ENGINE_ARG.split('=')[1];
if (ENGINE !== 'chromium' && ENGINE !== 'webkit') throw new Error(`unknown engine ${JSON.stringify(ENGINE)}`);
const launcher = ENGINE === 'webkit' ? pw.webkit : pw.chromium;

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const raw = readFileSync(new URL('../apps/web/src/ports/storage.ts', import.meta.url), 'utf8');
const DB_VERSION = Number(/^const DB_VERSION = (\d+);$/m.exec(raw)?.[1]);
const PHOTOS = /^const PHOTOS = '(\w+)';$/m.exec(raw)?.[1];
const PHOTO_THUMBS = /^const PHOTO_THUMBS = '(\w+)';$/m.exec(raw)?.[1];
if (!Number.isInteger(DB_VERSION) || PHOTOS === undefined || PHOTO_THUMBS === undefined) {
  throw new Error('DB_VERSION / the byte store names could not be read from the port');
}
const src = stripTypeScriptTypes(raw, { mode: 'strip' });
const EXPORTED = [...src.matchAll(/^export (?:async )?function (\w+)/gm)].map((m) => m[1]);
if (!EXPORTED.includes('indexedDbPhotoBytes')) throw new Error('`indexedDbPhotoBytes` is not an exported function — the port moved');
const injected = src.replace(/^export (async )?function /gm, '$1function ') +
  `\n${EXPORTED.map((n) => `globalThis.${n} = ${n};`).join('\n')}\n`;
if (/^export /m.test(injected)) throw new Error('an export survived the strip');

const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<!doctype html><meta charset=utf-8><title>r46-idb-keys</title>');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const httpPort = server.address().port;
const browser = await launcher.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`  page error: ${e.message}`));
await page.goto(`http://127.0.0.1:${httpPort}/`);
await page.evaluate(injected);

const NUL = String.fromCharCode(0);

// ===========================================================================
head('§A — the key ORDERING A-62 Part 5 asserts, asked of the engine itself');
// ===========================================================================
{
  const r = await page.evaluate(() => {
    const c = (a, b) => indexedDB.cmp(a, b);
    const safe = (f) => { try { return f(); } catch (e) { return `THREW ${e.name}`; } };
    return {
      numberBeforeDate: safe(() => c(1, new Date(0))),
      dateBeforeString: safe(() => c(new Date(0), '')),
      stringBeforeBinary: safe(() => c('￿￿', new Uint8Array([0]))),
      binaryBeforeArray: safe(() => c(new Uint8Array([255]), [])),
      stringBeforeArray: safe(() => c('￿'.repeat(64), [])),
      emptyArrayVsOneItem: safe(() => c([], [''])),
      prefixSortsFirst: safe(() => c(['t'], ['t', ''])),
      itemwise: safe(() => c(['t', 'a'], ['t', 'b'])),
      // The exact bound the port uses, against the widest string a photo id could be.
      upperBoundBeatsAnyString: safe(() => c(['t', '￿'.repeat(1024)], ['t', []])),
      // …and does NOT reach the next trip.
      upperBoundBelowNextTrip: safe(() => c(['t', []], ['t2'])),
      arrayIsAValidKey: safe(() => { indexedDB.cmp(['t', 'p'], ['t', 'p']); return 0; }),
    };
  });
  note(`indexedDB.cmp answers: ${JSON.stringify(r)}`);
  ok(r.numberBeforeDate === -1, 'number < date', r.numberBeforeDate);
  ok(r.dateBeforeString === -1, 'date < string', r.dateBeforeString);
  ok(r.stringBeforeBinary === -1, 'string < binary — even for a string of U+FFFF', r.stringBeforeBinary);
  ok(r.binaryBeforeArray === -1, 'binary < array', r.binaryBeforeArray);
  ok(r.stringBeforeArray === -1, 'string < array — the fact `[tripId, []]` as an upper bound rests on', r.stringBeforeArray);
  ok(r.emptyArrayVsOneItem === -1, 'a shorter array that is a prefix sorts first', r.emptyArrayVsOneItem);
  ok(r.prefixSortsFirst === -1, '`[t]` < `[t, ""]`, so the lower bound `[tripId]` is below every record', r.prefixSortsFirst);
  ok(r.itemwise === -1, 'two arrays compare item by item', r.itemwise);
  ok(r.upperBoundBeatsAnyString === -1,
    '`[t, []]` outranks `[t, "\\uffff"×1024]` — no photo id can escape above the upper bound',
    r.upperBoundBeatsAnyString);
  ok(r.upperBoundBelowNextTrip === -1, '`[t, []]` < `[t2]` — the range cannot reach the next trip', r.upperBoundBelowNextTrip);
  ok(r.arrayIsAValidKey === 0, 'an array of strings is a valid key in this engine', r.arrayIsAValidKey);
}

// ===========================================================================
head('§B — `removeTrip` / `present` against an adversarial neighbourhood of trip ids');
// ===========================================================================
{
  // Chosen to break, in order: a string-prefix range, a lexical range, a case-folding one, a
  // Unicode-normalising one, an empty key, and the memory double's own NUL separator.
  const IDS = ['', 't', 't2', 't-', 'ta', 'T', `t${NUL}x`, 't￿', 'trip-1', 'trip-10', 'é'];
  const r = await page.evaluate(async (arg) => {
    const { ids, PHOTOS, PHOTO_THUMBS, DB_VERSION } = arg;
    await new Promise((res) => { const d = indexedDB.deleteDatabase('cairn'); d.onsuccess = d.onerror = d.onblocked = () => res(); });
    const port = globalThis.indexedDbPhotoBytes();
    const bytes = (s) => new TextEncoder().encode(s);
    for (const t of ids) await port.write(t, 'photo-1', bytes(`${t}|thumb`), bytes(`${t}|display`));
    const out = { seeded: null, reads: {}, presents: {}, afterRemove: {}, removed: null, err: null };
    const rawKeys = async () => new Promise((res, rej) => {
      const rq = indexedDB.open('cairn', DB_VERSION);
      rq.onsuccess = () => {
        const db = rq.result;
        const tx = db.transaction(PHOTO_THUMBS, 'readonly');
        const k = tx.objectStore(PHOTO_THUMBS).getAllKeys();
        tx.oncomplete = () => { db.close(); res(k.result.map((a) => JSON.stringify(a))); };
        tx.onerror = () => { db.close(); rej(tx.error); };
      };
      rq.onerror = () => rej(rq.error);
    });
    out.seeded = await rawKeys();
    for (const t of ids) {
      const b = await port.read(t, 'photo-1', 'thumb');
      out.reads[t] = b === null ? null : new TextDecoder().decode(b);
      out.presents[t] = [...(await port.present(t, ['photo-1']))];
    }
    try { await port.removeTrip('t'); } catch (e) { out.err = String(e); }
    out.afterRemove = await rawKeys();
    for (const t of ids) {
      const b = await port.read(t, 'photo-1', 'thumb');
      out.removed = out.removed ?? {};
      out.removed[t] = b === null ? null : new TextDecoder().decode(b);
    }
    return out;
  }, { ids: IDS, PHOTOS, PHOTO_THUMBS, DB_VERSION });

  ok(r.err === null, '§B ran to completion — every one of these ids is a writable key', r.err);
  ok(r.seeded.length === IDS.length, `all ${IDS.length} adversarial trip ids stored a distinct record`, r.seeded);
  const badRead = IDS.filter((t) => r.reads[t] !== `${t}|thumb`);
  ok(badRead.length === 0, '`read(tripId, "photo-1")` returns each trip\'s OWN bytes for all of them', badRead.map((t) => [t, r.reads[t]]));
  const badPresent = IDS.filter((t) => r.presents[t].join() !== 'photo-1');
  ok(badPresent.length === 0, '`present` finds exactly its own trip\'s record for all of them', badPresent);
  const survivors = IDS.filter((t) => r.removed[t] !== null);
  ok(r.removed[''] !== null, 'a trip id of `""` is not swept by `removeTrip("t")`', r.removed['']);
  ok(survivors.length === IDS.length - 1 && r.removed['t'] === null,
    '`removeTrip("t")` took EXACTLY `"t"` — not `"t2"`, `"t-"`, `"ta"`, `"T"`, `"t\\u0000x"`, `"t\\uffff"` or `""`',
    { swept: IDS.filter((t) => r.removed[t] === null) });
}

// ===========================================================================
head('§C — adversarial PHOTO ids under the same range');
// ===========================================================================
{
  const PIDS = ['', 'p', 'p'.repeat(4096), `p${NUL}q`, '0', '1e3', '￿', 'photo-1'];
  const r = await page.evaluate(async (arg) => {
    const { pids, PHOTO_THUMBS, DB_VERSION } = arg;
    await new Promise((res) => { const d = indexedDB.deleteDatabase('cairn'); d.onsuccess = d.onerror = d.onblocked = () => res(); });
    const port = globalThis.indexedDbPhotoBytes();
    const bytes = (s) => new TextEncoder().encode(s);
    for (const p of pids) await port.write('t', p, bytes(`t|${p.length}`), bytes('d'));
    await port.write('t2', 'photo-1', bytes('t2|keepme'), bytes('d'));
    const out = { reads: {}, present: null, keysBefore: null, keysAfter: null, other: null, err: null };
    const rawKeys = async () => new Promise((res, rej) => {
      const rq = indexedDB.open('cairn', DB_VERSION);
      rq.onsuccess = () => {
        const db = rq.result; const tx = db.transaction(PHOTO_THUMBS, 'readonly');
        const k = tx.objectStore(PHOTO_THUMBS).getAllKeys();
        tx.oncomplete = () => { db.close(); res(k.result.length); };
        tx.onerror = () => { db.close(); rej(tx.error); };
      };
      rq.onerror = () => rej(rq.error);
    });
    out.keysBefore = await rawKeys();
    for (const p of pids) {
      const b = await port.read('t', p, 'thumb');
      out.reads[p.length > 32 ? `len${p.length}` : p] = b === null ? null : new TextDecoder().decode(b);
    }
    out.present = [...(await port.present('t', pids))].map((p) => (p.length > 32 ? `len${p.length}` : p));
    try { await port.removeTrip('t'); } catch (e) { out.err = String(e); }
    out.keysAfter = await rawKeys();
    const o = await port.read('t2', 'photo-1', 'thumb');
    out.other = o === null ? null : new TextDecoder().decode(o);
    return out;
  }, { pids: PIDS, PHOTO_THUMBS, DB_VERSION });

  ok(r.err === null, '§C ran to completion', r.err);
  ok(r.keysBefore === PIDS.length + 1, `${PIDS.length} adversarial photo ids + one other trip's record stored`, r.keysBefore);
  const bad = Object.entries(r.reads).filter(([, v]) => v === null);
  ok(bad.length === 0, 'every adversarial photo id reads back its own bytes — including `""` and a 4096-char id', bad);
  ok(r.present.length === PIDS.length, '`present` finds all of them in ONE bounded request', r.present);
  ok(r.keysAfter === 1, '`removeTrip("t")` swept every one of them — a 4096-char id does not escape the upper bound', r.keysAfter);
  ok(r.other === 't2|keepme', 'and the other trip\'s record survived untouched', r.other);
}

// ===========================================================================
head(`§D — Q6 in a REAL engine: a genuine DB_VERSION ${DB_VERSION - 1} database with BARE-keyed byte records`);
// ===========================================================================
const seedV4 = `
  window.__seed = async (version, bareKeys) => {
    await new Promise((res) => { const d = indexedDB.deleteDatabase('cairn'); d.onsuccess = d.onerror = d.onblocked = () => res(); });
    await new Promise((res, rej) => {
      const rq = indexedDB.open('cairn', version);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        for (const s of ['docs', 'summaries', 'versions']) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
        if (version >= 4) { db.createObjectStore('photos'); db.createObjectStore('photoThumbs'); }
      };
      rq.onsuccess = () => {
        const db = rq.result;
        const stores = version >= 4 ? ['docs', 'summaries', 'versions', 'photos', 'photoThumbs'] : ['docs', 'summaries', 'versions'];
        const tx = db.transaction(stores, 'readwrite');
        tx.objectStore('docs').put(JSON.stringify({ id: 't-old', schemaVersion: 2, photos: [{ id: 'photo-1' }, { id: 'photo-2' }] }), 't-old');
        tx.objectStore('summaries').put({ id: 't-old', title: 'T', dayCount: 3 }, 't-old');
        tx.objectStore('versions').put('v-seeded-token', 't-old');
        if (version >= 4) for (const k of bareKeys) {
          tx.objectStore('photos').put(new TextEncoder().encode('display:' + k).buffer, k);
          tx.objectStore('photoThumbs').put(new TextEncoder().encode('thumb:' + k).buffer, k);
        }
        tx.oncomplete = () => { db.close(); res(); };
        tx.onerror = () => { db.close(); rej(tx.error); };
      };
      rq.onerror = () => rej(rq.error);
    });
  };
  window.__dump = async () => {
    return await new Promise((res, rej) => {
      const rq = indexedDB.open('cairn');
      rq.onsuccess = () => {
        const db = rq.result;
        const names = [...db.objectStoreNames];
        const tx = db.transaction(names, 'readonly');
        const out = { version: db.version, stores: names, keys: {}, values: {} };
        for (const n of names) {
          const k = tx.objectStore(n).getAllKeys();
          const v = tx.objectStore(n).getAll();
          k.onsuccess = () => { out.keys[n] = k.result.map((x) => JSON.stringify(x)); };
          v.onsuccess = () => {
            out.values[n] = v.result.map((x) => (x instanceof ArrayBuffer ? 'AB:' + new TextDecoder().decode(x) : (typeof x === 'string' ? x : JSON.stringify(x))));
          };
        }
        tx.oncomplete = () => { db.close(); res(out); };
        tx.onerror = () => { db.close(); rej(tx.error); };
      };
      rq.onerror = () => rej(rq.error);
    });
  };
`;
await page.evaluate(seedV4);
{
  const before = await page.evaluate(async ([v, keys]) => { await window.__seed(v, keys); return await window.__dump(); },
    [DB_VERSION - 1, ['photo-1', 'photo-2', 'photo-orphan']]);
  ok(before.version === DB_VERSION - 1, `seeded a database at version ${DB_VERSION - 1}`, before.version);
  ok(before.keys.photoThumbs.length === 3, 'seeded three BARE-keyed thumb records', before.keys.photoThumbs);

  const after = await page.evaluate(async () => {
    // The shipped port's own `open()` — reached through a real method, not by re-implementing it.
    const port = globalThis.indexedDbPhotoBytes();
    let err = null;
    let present = null;
    try { present = [...(await port.present('t-old', ['photo-1', 'photo-2']))]; } catch (e) { err = String(e); }
    return { err, present, dump: await window.__dump() };
  });
  ok(after.err === null, 'the port opened the old database and ran the 4 → 5 upgrade without throwing', after.err);
  ok(after.dump.version === DB_VERSION, `the database is at version ${DB_VERSION} afterwards`, after.dump.version);
  ok(after.dump.keys.photos.length === 0 && after.dump.keys.photoThumbs.length === 0,
    'both byte stores are EMPTY — the bare-keyed records are dropped, not left readable under the wrong shape',
    { photos: after.dump.keys.photos, thumbs: after.dump.keys.photoThumbs });
  ok(after.dump.values.docs.join() === before.values.docs.join(),
    '`docs` is byte-identical across the upgrade', { before: before.values.docs, after: after.dump.values.docs });
  ok(JSON.stringify(after.dump.values.summaries) === JSON.stringify(before.values.summaries),
    '`summaries` is byte-identical across the upgrade', after.dump.values.summaries);
  ok(after.dump.values.versions.join() === before.values.versions.join(),
    '`versions` is byte-identical — the fence token survived the migration', after.dump.values.versions);
  ok(Array.isArray(after.present) && after.present.length === 0,
    '`present` answers `{}` for the migrated trip — a `ready` listing with `missing: N`, never a throw and never `empty`',
    after.present);
}

// ===========================================================================
head('§E — an INTERRUPTED upgrade: the versionchange transaction aborted half way');
// ===========================================================================
{
  await page.evaluate(async ([v, keys]) => { await window.__seed(v, keys); }, [DB_VERSION - 1, ['photo-1', 'photo-2']]);
  const abort = await page.evaluate(async (target) => {
    // The shape of a real interruption: the tab is closed, or the engine kills the upgrade,
    // AFTER `deleteObjectStore` has run and BEFORE the transaction commits.
    const out = { aborted: false, openErr: null };
    await new Promise((res) => {
      const rq = indexedDB.open('cairn', target);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        if (db.objectStoreNames.contains('photos')) db.deleteObjectStore('photos');
        if (db.objectStoreNames.contains('photoThumbs')) db.deleteObjectStore('photoThumbs');
        db.createObjectStore('photos');
        // …and now it dies, before the second store is created.
        rq.transaction.abort();
      };
      rq.onerror = () => { out.aborted = true; out.openErr = rq.error && rq.error.name; res(); };
      rq.onsuccess = () => { rq.result.close(); res(); };
      rq.onblocked = () => res();
    });
    return { ...out, dump: await window.__dump() };
  }, DB_VERSION);
  ok(abort.aborted, 'the aborted upgrade surfaced as an open ERROR, not a silent success', abort);
  ok(abort.dump.version === DB_VERSION - 1,
    `the abort rolled the whole versionchange back — still at version ${DB_VERSION - 1}`, abort.dump.version);
  ok(abort.dump.stores.includes('photos') && abort.dump.stores.includes('photoThumbs'),
    'both byte stores are still there, with their OLD key shape — no half-migrated database', abort.dump.stores);
  ok(abort.dump.keys.photoThumbs.length === 2,
    'and the bare-keyed records the abort rolled back are still present', abort.dump.keys.photoThumbs);

  const retry = await page.evaluate(async () => {
    const port = globalThis.indexedDbPhotoBytes();
    let err = null;
    try { await port.present('t-old', ['photo-1']); } catch (e) { err = String(e); }
    return { err, dump: await window.__dump() };
  });
  ok(retry.err === null, 'the port re-runs the migration on the next open and does not throw', retry.err);
  ok(retry.dump.version === DB_VERSION, `and it reaches version ${DB_VERSION}`, retry.dump.version);
  ok(retry.dump.keys.photos.length === 0 && retry.dump.keys.photoThumbs.length === 0,
    'both stores end up empty and correctly shaped — an interrupted migration is retried, not skipped',
    { photos: retry.dump.keys.photos, thumbs: retry.dump.keys.photoThumbs });
  ok(retry.dump.values.docs.length === 1 && retry.dump.values.versions.length === 1,
    'the document and its fence token survived both the abort and the retry', retry.dump.values);
}

// ===========================================================================
head(`§F — a database written by a FUTURE build (version ${DB_VERSION + 1})`);
// ===========================================================================
{
  await page.evaluate(async ([v, keys]) => { await window.__seed(v, keys); }, [DB_VERSION + 1, ['photo-1']]);
  const r = await page.evaluate(async () => {
    const port = globalThis.indexedDbPhotoBytes();
    let err = null, name = null, present = null;
    try { present = [...(await port.present('t-old', ['photo-1']))]; }
    catch (e) { err = String(e); name = e && e.name; }
    return { err, name, present, dump: await window.__dump() };
  });
  note(`the port's answer to a newer database: ${JSON.stringify({ err: r.err, name: r.name })}`);
  ok(r.err !== null, 'a database from a newer build is REFUSED rather than silently downgraded', r);
  ok(r.dump.version === DB_VERSION + 1, 'and the newer database is left at its own version', r.dump.version);
  ok(r.dump.keys.photoThumbs.length === 1, 'with its records intact — no destructive downgrade', r.dump.keys);
}

// ===========================================================================
head('§G — a database at version 3, before the byte stores existed at all');
// ===========================================================================
{
  await page.evaluate(async () => { await window.__seed(3, []); });
  const r = await page.evaluate(async () => {
    const port = globalThis.indexedDbPhotoBytes();
    let err = null;
    try { await port.write('t-old', 'photo-1', new TextEncoder().encode('th'), new TextEncoder().encode('di')); }
    catch (e) { err = String(e); }
    return { err, dump: await window.__dump() };
  });
  ok(r.err === null, 'a version-3 database upgrades straight to 5 with no delete attempted on an absent store', r.err);
  ok(r.dump.version === DB_VERSION, `it lands at version ${DB_VERSION}`, r.dump.version);
  ok(r.dump.keys.photoThumbs.length === 1 && r.dump.keys.photoThumbs[0] === '["t-old","photo-1"]',
    'and the first write lands under a COMPOUND key', r.dump.keys.photoThumbs);
  ok(r.dump.values.docs.length === 1, 'the version-3 document is untouched by the upgrade', r.dump.values.docs);
}

await browser.close();
server.close();
console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}  [engine: ${ENGINE}]`);
process.exit(fails === 0 ? 0 : 1);
