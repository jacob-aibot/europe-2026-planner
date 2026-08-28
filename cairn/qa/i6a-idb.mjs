/**
 * Round 27 — I-6a, part 1: **`apps/web/src/ports/storage.ts`'s `refreshSummary`, EXECUTED.**
 *
 *   Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i6a-idb.mjs     (from cairn/)
 *
 * BUILD-NOTES I-6a "What I could not verify" item 1: *"the `apps/web` IndexedDB
 * `refreshSummary` was not executed … asserted by construction and by review against
 * `saveIfVersion`, which it is a strict subset of."* An unexecuted write path against a real
 * database is exactly the kind of claim that is true right up until it is not, and this repo
 * has a precedent for running one (`qa/browser*.mjs`, `qa/r3-browser.mjs`, `qa/r4-browser.mjs`
 * all drive real Chromium and real IndexedDB).
 *
 * This probe needs **no web build and no `tools/serve.mjs`**: it serves one blank page from an
 * ephemeral port purely to get a real origin (IndexedDB is unavailable on `about:blank`), then
 * type-strips `apps/web/src/ports/storage.ts` — whose only imports are `import type`, so it is
 * dependency-free once stripped — and evaluates it in the page. The module under test is the
 * shipped file, byte for byte, not a transcription of it.
 *
 *   §1  the happy path: the row moves, the DOCUMENT BYTES and the VERSION do not
 *   §2  the refusals: absent record, wrong expectation, and the two half-deleted shapes
 *   §3  `refreshSummary` vs `delete` on the SAME record, issued without an await between them,
 *       in both orders — the atomic CAS racing the delete itself
 *   §4  two `refreshSummary` calls for the same record, concurrent, same expectation
 *   §5  `refreshSummary` vs `saveIfVersion` — A-30 Part 6's residue, measured
 *   §6  divergence sweep against `packages/client/src/ports/memory.ts`: the same 14 calls
 *       against both ports, outcomes compared field by field
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { memoryStorage } from '../packages/client/src/index.ts';

const { chromium } = pw;
let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

// ---------------------------------------------------------------------------
const src = stripTypeScriptTypes(readFileSync(new URL('../apps/web/src/ports/storage.ts', import.meta.url), 'utf8'), {
  mode: 'strip',
});
const injected = src.replace('export function indexedDbStorage', 'function indexedDbStorage') +
  '\nglobalThis.indexedDbStorage = indexedDbStorage;\n';
if (!injected.includes('globalThis.indexedDbStorage')) throw new Error('the export shape moved — re-derive this probe');

const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<!doctype html><meta charset=utf-8><title>i6a-idb</title>');
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
  cityCount: 1, dayCount: 3, stopCount: 0, poolCount: 0, revision: 1,
  countryCodes: ['HR'],
  cities: [{ key: 'hvar', name: 'Hvar', countryCode: 'HR', countrySource: 'stated' }],
  summaryVersion: ver,
});

/** Runs `fn` in the page with a FRESH `cairn` database. Returns whatever `fn` returns. */
const inPage = (fn, arg) =>
  page.evaluate(async ({ body, arg }) => {
    await new Promise((res) => {
      const del = indexedDB.deleteDatabase('cairn');
      del.onsuccess = del.onerror = del.onblocked = () => res();
    });
    // `work(tx)` returns an IDBRequest, or a plain object of them; this resolves with their
    // `.result`s once the transaction has COMMITTED, so nothing is read mid-transaction.
    const raw = (store, mode, work) =>
      new Promise((res, rej) => {
        const r = indexedDB.open('cairn');
        r.onsuccess = () => {
          const db = r.result;
          const tx = db.transaction(store, mode);
          const reqs = work(tx);
          tx.oncomplete = () => {
            db.close();
            if (reqs && typeof reqs === 'object' && !('result' in reqs)) {
              const out = {};
              for (const k of Object.keys(reqs)) out[k] = reqs[k] && 'result' in reqs[k] ? reqs[k].result : reqs[k];
              return res(out);
            }
            res(reqs && 'result' in reqs ? reqs.result : reqs);
          };
          tx.onerror = () => { db.close(); rej(tx.error); };
        };
        r.onerror = () => rej(r.error);
      });
    // eslint-disable-next-line no-new-func
    const f = new Function('storage', 'raw', 'arg', `return (${body})(storage, raw, arg);`);
    return await f(globalThis.indexedDbStorage(), raw, arg);
  }, { body: fn.toString(), arg });

// ---------------------------------------------------------------------------
head('§1 — the happy path, against a real IndexedDB');
{
  const r = await inPage(async (storage, raw, arg) => {
    const seed = await storage.saveIfVersion('t1', null, arg.doc, arg.rowV2);
    const snap = () => raw(['docs', 'versions'], 'readonly', (tx) => ({
      d: tx.objectStore('docs').get('t1'), v: tx.objectStore('versions').get('t1'),
    }));
    const before = await snap();
    const outcome = await storage.refreshSummary('t1', seed.version, arg.rowV3);
    const after = await snap();
    const rows = await storage.listTrips();
    return {
      seedVersion: seed.version, outcome,
      docSame: before.d === after.d, docLen: String(after.d).length,
      versionSame: before.v === after.v, versionNow: after.v,
      rows: rows.map((x) => ({ id: x.id, summaryVersion: x.summaryVersion, cities: x.cities })),
    };
  }, { doc: JSON.stringify({ hello: 'world', pad: 'x'.repeat(200) }), rowV2: ROW('t1', 2), rowV3: ROW('t1', 3) });

  ok(r.outcome.ok === true, 'refreshSummary succeeded');
  ok(r.outcome.version === r.seedVersion, 'the outcome carries back the version it was handed — nothing minted', r.outcome);
  ok(r.versionSame === true && r.versionNow === r.seedVersion, 'the VERSIONS row did not move', { now: r.versionNow });
  ok(r.docSame === true, 'the DOCS row is byte-identical', { len: r.docLen });
  ok(r.rows.length === 1 && r.rows[0].summaryVersion === 3, 'the SUMMARIES row IS current', r.rows);
  ok(
    JSON.stringify(r.rows[0].cities) === JSON.stringify(ROW('t1', 3).cities),
    "A-29's `countrySource` survives the structured clone",
    r.rows[0].cities,
  );
}

// ---------------------------------------------------------------------------
head('§2 — the four refusals');
{
  const r = await inPage(async (storage, raw, arg) => {
    const seed = await storage.saveIfVersion('t1', null, arg.doc, arg.row);
    const absent = await storage.refreshSummary('nope', seed.version, arg.row);
    const rowsAfterAbsent = (await storage.listTrips()).length;
    const wrong = await storage.refreshSummary('t1', 'not-the-version', arg.row);
    // Half-deleted A: the envelope survives a DOCS deletion (what a partial restore leaves).
    await raw('docs', 'readwrite', (tx) => tx.objectStore('docs').delete('t1'));
    const halfA = await storage.refreshSummary('t1', seed.version, arg.row);
    // Half-deleted B: the document survives without an envelope.
    await raw('docs', 'readwrite', (tx) => tx.objectStore('docs').put(arg.doc, 't2'));
    const halfB = await storage.refreshSummary('t2', seed.version, arg.row);
    const summaries = await raw('summaries', 'readonly', (tx) => tx.objectStore('summaries').getAllKeys());
    return { absent, rowsAfterAbsent, wrong, halfA, halfB, seed: seed.version, summaryKeys: summaries };
  }, { doc: '{"a":1}', row: ROW('t1', 3) });

  ok(r.absent.ok === false && r.absent.storedVersion === null, 'absent record: {ok:false, storedVersion:null}', r.absent);
  ok(r.rowsAfterAbsent === 1, 'listTrips did not grow — a refresh cannot create a row', r.rowsAfterAbsent);
  ok(r.wrong.ok === false && r.wrong.storedVersion === r.seed, 'wrong expectation: refused, and reports the version found', r.wrong);
  ok(r.halfA.ok === false && r.halfA.storedVersion === null, 'half-deleted (envelope without document): refused', r.halfA);
  ok(r.halfB.ok === false && r.halfB.storedVersion === null, 'half-deleted (document without envelope): refused', r.halfB);
  ok(!r.summaryKeys.includes('t2'), 'no summary row was created for the envelope-less document', r.summaryKeys);
}

// ---------------------------------------------------------------------------
head('§3 — refreshSummary vs delete on the SAME record, no await between them');
{
  const r = await inPage(async (storage, raw, arg) => {
    const out = {};
    for (const order of ['refresh-first', 'delete-first']) {
      await new Promise((res) => { const d = indexedDB.deleteDatabase('cairn'); d.onsuccess = d.onerror = () => res(); });
      const seed = await storage.saveIfVersion('t1', null, arg.doc, arg.rowV2);
      let refresh, del;
      if (order === 'refresh-first') {
        refresh = storage.refreshSummary('t1', seed.version, arg.rowV3);
        del = storage.delete('t1');
      } else {
        del = storage.delete('t1');
        refresh = storage.refreshSummary('t1', seed.version, arg.rowV3);
      }
      const outcome = await refresh.catch((e) => ({ threw: String(e) }));
      await del;
      const keys = await raw(['docs', 'summaries', 'versions'], 'readonly', (tx) => ({
        d: tx.objectStore('docs').getAllKeys(),
        s: tx.objectStore('summaries').getAllKeys(),
        v: tx.objectStore('versions').getAllKeys(),
      }));
      out[order] = { outcome, docs: keys.d, summaries: keys.s, versions: keys.v };
    }
    return out;
  }, { doc: '{"a":1}', rowV2: ROW('t1', 2), rowV3: ROW('t1', 3) });

  for (const order of ['refresh-first', 'delete-first']) {
    const x = r[order];
    note(`${order}: outcome=${JSON.stringify(x.outcome)}  docs=${JSON.stringify(x.docs)} summaries=${JSON.stringify(x.summaries)}`);
    ok(x.docs.length === 0, `${order}: the document is gone`, x.docs);
    ok(
      x.summaries.length === 0,
      `${order}: NO ORPHAN SUMMARY ROW — the refresh did not resurrect a deleted trip`,
      x.summaries,
    );
    ok(x.versions.length === 0, `${order}: no envelope left behind`, x.versions);
    ok(x.outcome.threw === undefined, `${order}: the refresh settled rather than throwing`, x.outcome);
  }
}

// ---------------------------------------------------------------------------
head('§4 — two concurrent refreshSummary calls for the same record');
{
  const r = await inPage(async (storage, raw, arg) => {
    const seed = await storage.saveIfVersion('t1', null, arg.doc, arg.rowV2);
    const a = storage.refreshSummary('t1', seed.version, arg.rowA);
    const b = storage.refreshSummary('t1', seed.version, arg.rowB);
    const [oa, ob] = await Promise.all([a, b]);
    const rows = await storage.listTrips();
    const v = await raw('versions', 'readonly', (tx) => tx.objectStore('versions').get('t1'));
    return { seed: seed.version, oa, ob, row: rows[0], version: v };
  }, { doc: '{"a":1}', rowV2: ROW('t1', 2), rowA: { ...ROW('t1', 3), title: 'A' }, rowB: { ...ROW('t1', 3), title: 'B' } });

  ok(r.oa.ok === true && r.ob.ok === true, 'both succeed — a refresh is idempotent and does not invalidate its twin', { a: r.oa, b: r.ob });
  ok(r.oa.version === r.seed && r.ob.version === r.seed, 'both carry the SAME unchanged version back', { a: r.oa.version, b: r.ob.version });
  ok(r.version === r.seed, 'the record fence never moved across two concurrent refreshes', r.version);
  ok(r.row.title === 'B', 'last writer wins on the row, in issue order', r.row.title);
  ok(r.row.summaryVersion === 3, 'the row is current', r.row.summaryVersion);
}

// ---------------------------------------------------------------------------
head('§5 — refreshSummary vs saveIfVersion (A-30 Part 6 residue)');
{
  const r = await inPage(async (storage, raw, arg) => {
    const seed = await storage.saveIfVersion('t1', null, arg.doc, arg.rowV2);
    // The refresh's expectation is the version its own load returned; a document write landing
    // in between must refuse it, and the rescan does not retry over another writer's work.
    const save = storage.saveIfVersion('t1', seed.version, arg.doc2, arg.rowV2);
    const refresh = storage.refreshSummary('t1', seed.version, arg.rowV3);
    const [os, or] = await Promise.all([save, refresh]);
    const rows = await storage.listTrips();
    const doc = await raw('docs', 'readonly', (tx) => tx.objectStore('docs').get('t1'));
    // …and the other order.
    const seed2 = await storage.saveIfVersion('t2', null, arg.doc, arg.rowV2);
    const refresh2 = storage.refreshSummary('t2', seed2.version, arg.rowV3);
    const save2 = storage.saveIfVersion('t2', seed2.version, arg.doc2, arg.rowV2);
    const [or2, os2] = await Promise.all([refresh2, save2]);
    return { seed: seed.version, os, or, row: rows[0], doc, or2, os2 };
  }, { doc: '{"a":1}', doc2: '{"a":2}', rowV2: ROW('t1', 2), rowV3: ROW('t1', 3) });

  ok(r.os.ok === true, 'the DOCUMENT write wins when it is issued first');
  ok(r.or.ok === false && r.or.storedVersion === r.os.version, 'the refresh behind it is REFUSED, naming the new version', r.or);
  ok(r.row.summaryVersion === 2, "the refused row stays below the version — 'picked up by the next pass'", r.row.summaryVersion);
  ok(r.doc === '{"a":2}', "the document write's bytes are the ones in storage", r.doc);
  ok(r.or2.ok === true && r.os2.ok === true, 'refresh-then-save: BOTH succeed, because a refresh does not mint', { r: r.or2, s: r.os2 });
}

// ---------------------------------------------------------------------------
head('§6 — divergence sweep: the IndexedDB port against the memory port, same 14 calls');
{
  const script = [
    ['save', 'a', null, 'DOC1', 2],
    ['refresh', 'a', '@a', 3],          // happy path
    ['refresh', 'a', '@a', 3],          // twice — idempotent
    ['refresh', 'b', '@a', 3],          // absent id
    ['refresh', 'a', 'bogus', 3],       // wrong expectation
    ['save', 'b', null, 'DOC2', 2],
    ['refresh', 'b', '@b', 3],
    ['save', 'a', '@a', 'DOC3', 2],     // moves a's fence
    ['refresh', 'a', '@a', 3],          // stale expectation now
    ['refresh', 'a', '@a2', 3],         // the new one
    ['delete', 'a'],
    ['refresh', 'a', '@a2', 3],         // deleted
    ['save', 'a', null, 'DOC4', 2],     // recreated
    ['refresh', 'a', '@a3', 3],
  ];
  const runScript = async (storage, ROWS) => {
    const seen = { a: [], b: [] };
    const out = [];
    const resolve = (tok) => {
      if (typeof tok !== 'string' || !tok.startsWith('@')) return tok;
      const id = tok[1];
      const n = tok.length > 2 ? Number(tok.slice(2)) : 1;
      return seen[id][n - 1] ?? null;
    };
    for (const step of script) {
      if (step[0] === 'save') {
        const o = await storage.saveIfVersion(step[1], resolve(step[2]), step[3], ROWS(step[1], step[4]));
        if (o.ok) seen[step[1]].push(o.version);
        out.push({ step: step.join(','), ok: o.ok, minted: o.ok });
      } else if (step[0] === 'refresh') {
        const o = await storage.refreshSummary(step[1], resolve(step[2]) ?? 'bogus', ROWS(step[1], step[3]));
        out.push({
          step: step.join(','), ok: o.ok,
          sameVersionBack: o.ok ? o.version === (resolve(step[2]) ?? 'bogus') : null,
          storedIsNull: o.ok ? null : o.storedVersion === null,
        });
      } else {
        await storage.delete(step[1]);
        out.push({ step: step.join(','), ok: true });
      }
    }
    const rows = await storage.listTrips();
    out.push({ step: 'listTrips', ids: rows.map((r) => `${r.id}:${r.summaryVersion}`).sort() });
    return out;
  };

  const idb = await page.evaluate(async ({ body, script }) => {
    await new Promise((res) => { const d = indexedDB.deleteDatabase('cairn'); d.onsuccess = d.onerror = () => res(); });
    const ROWS = (id, v) => ({
      id, title: `T ${id}`, startDate: '2026-08-07', endDate: '2026-08-09', datePrecision: 'exact',
      cityCount: 1, dayCount: 3, stopCount: 0, poolCount: 0, revision: 1, countryCodes: ['HR'],
      cities: [{ key: 'hvar', name: 'Hvar', countryCode: 'HR', countrySource: 'stated' }], summaryVersion: v,
    });
    // eslint-disable-next-line no-new-func
    const f = new Function('script', `return ${body}`);
    return await f(script)(globalThis.indexedDbStorage(), ROWS);
  }, { body: runScript.toString().replace(/\bscript\b/g, 'script'), script });

  const ROWS = (id, v) => ({ ...ROW(id, v), title: `T ${id}` });
  const mem = await runScript(memoryStorage(), ROWS);

  const a = JSON.stringify(idb, null, 1);
  const b = JSON.stringify(mem, null, 1);
  ok(a === b, 'the two ports answer the 14-call script IDENTICALLY, outcome by outcome');
  if (a !== b) {
    for (let i = 0; i < Math.max(idb.length, mem.length); i++) {
      const x = JSON.stringify(idb[i]); const y = JSON.stringify(mem[i]);
      if (x !== y) console.log(`      step ${i}: idb=${x}\n                mem=${y}`);
    }
  } else {
    note(`${idb.length} steps, identical: ${idb.map((s) => `${s.step}${s.ok === false ? '(refused)' : ''}`).join(' | ')}`);
  }
}

await browser.close();
server.close();
console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`}`);
process.exit(fails === 0 ? 0 : 1);
