/**
 * QA round 30 — **is G12 a real leak, or a no-op that only looks uncaught?**
 *
 *   node --experimental-strip-types qa/r30-upcast.mjs      (from cairn/)
 *
 * `qa/r30-exit6c.sh`'s **G12** puts the widening inside `ensureReady`'s one-time upcast — the
 * path a port runs when it opens a database that ALREADY HAS RECORDS. Exit criterion 6's
 * 6b-1b arm reports `# fail 0` on it, but a fault that is uncaught because it does nothing is
 * not a finding. This drives the faulted port the way the product does — **write, then open a
 * SECOND port instance over the same database**, which is what happens on the next page load —
 * and reads the summary store back.
 *
 * It uses the same loader and the same recording double 6b-1b uses, so the only difference
 * between this and the gate is the call SHAPE: two port instances instead of one.
 */
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRY_INDEX, createTrip, tripSummary, sequentialIds } from '../packages/core/src/index.ts';

const CAIRN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (c, m, extra) => { if (c) console.log(`  ok    ${m}`); else { fails++; console.log(`  FAIL  ${m}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); } };
const note = (s) => console.log(`  note  ${s}`);

/** A-36 Part 3's recorder, transcribed from `test/stats-storage.test.ts`. */
function recordingIdb() {
  const stores = new Map();
  const at = (n) => { if (!stores.has(n)) stores.set(n, new Map()); return stores.get(n); };
  let version = 0;
  function makeTx(names) {
    let pending = 0, done = false;
    const tx = { error: null, oncomplete: null, onerror: null, onabort: null };
    const settle = () => { if (!done && pending === 0) { done = true; tx.oncomplete?.(); } };
    const request = (fn) => {
      const req = { result: undefined, error: null, onsuccess: null, onerror: null };
      pending++;
      queueMicrotask(() => {
        try { req.result = fn(); } catch (e) { req.error = e; }
        pending--;
        if (req.error) req.onerror?.(); else req.onsuccess?.();
        queueMicrotask(settle);
      });
      return req;
    };
    tx.objectStore = (name) => {
      if (!names.includes(name)) throw new Error(`store ${name} not in transaction scope`);
      const m = at(name);
      return {
        put: (v, k) => request(() => { m.set(k, v); return k; }),
        get: (k) => request(() => m.get(k)),
        getKey: (k) => request(() => (m.has(k) ? k : undefined)),
        getAll: () => request(() => [...m.values()]),
        getAllKeys: () => request(() => [...m.keys()]),
        delete: (k) => request(() => { m.delete(k); return undefined; }),
      };
    };
    return tx;
  }
  return {
    open(_name, want) {
      const req = { result: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      queueMicrotask(() => {
        req.result = {
          objectStoreNames: { contains: (n) => stores.has(n) },
          createObjectStore: (n) => at(n),
          deleteObjectStore: (n) => stores.delete(n),
          transaction: (n) => makeTx(Array.isArray(n) ? n : [n]),
          close: () => {},
        };
        if (version < want) { version = want; req.onupgradeneeded?.(); }
        req.onsuccess?.();
      });
      return req;
    },
    _summaries: () => at('summaries'),
  };
}

const RAW = readFileSync(resolve(CAIRN, 'apps/web/src/ports/storage.ts'), 'utf8');

/** G12, applied to the source exactly as `qa/r30-exit6c.sh` applies it. */
function applyG12(s) {
  const old = "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);";
  if (!s.includes(old)) throw new Error('anchor moved (ensureReady tx)');
  s = s.replace(old, "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);");
  const old2 = '              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;';
  if (!s.includes(old2)) throw new Error('anchor moved (upcast loop)');
  return s.replace(old2,
    '              const all = sums.getAll() as IDBRequest<TripSummaryRow[]>;\n'
    + '              all.onsuccess = () => {\n'
    + '                for (const r of all.result) {\n'
    + '                  sums.put({ ...r, countriesVisited: r.countryCodes.length, daysTravelled: r.dayCount }, r.id);\n'
    + '                }\n'
    + '              };\n' + old2);
}

async function load(src) {
  const js = stripTypeScriptTypes(src, { mode: 'strip' });
  const mod = await import(`data:text/javascript,${encodeURIComponent(js)}`);
  return mod.indexedDbStorage;
}

const trip = createTrip(
  { id: 't1', title: 'Upcast', startDate: '2026-03-01', endDate: '2026-03-04', homeCurrency: 'EUR',
    cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }] },
  { ids: sequentialIds('u-'), now: '2026-06-15' },
);
const summary = tripSummary(trip, COUNTRY_INDEX);
const ROW_KEYS = Object.keys(summary).sort();

async function drive(src, label) {
  const db = recordingIdb();
  globalThis.indexedDB = db;
  try {
    const make = await load(src);
    // Page load 1: a fresh port, a fresh database, one write.
    const p1 = make();
    const saved = await p1.saveIfVersion(trip.id, null, JSON.stringify(trip), summary);
    if (!saved.ok) throw new Error('seed failed');
    const afterWrite = Object.keys(db._summaries().get(trip.id)).sort();
    // Page load 2: a NEW port instance over the SAME database — which is every page load after
    // the first, and the only shape in which `ensureReady`'s upcast has anything to walk.
    const p2 = make();
    const rows = await p2.listTrips();
    const afterOpen = Object.keys(db._summaries().get(trip.id)).sort();
    console.log(`\n== ${label} ==`);
    note(`after the first write:      ${afterWrite.length} keys`);
    note(`after a SECOND port opens:  ${afterOpen.length} keys`);
    note(`listTrips() from port 2:    ${Object.keys(rows[0]).length} keys`);
    return { afterWrite, afterOpen, listed: Object.keys(rows[0]).sort() };
  } finally { delete globalThis.indexedDB; }
}

const clean = await drive(RAW, 'the shipped port (control)');
ok(clean.afterOpen.join() === ROW_KEYS.join(), 'the shipped port persists exactly ROW_KEYS across a second open', clean.afterOpen);

const faulted = await drive(applyG12(RAW), 'the port with G12 applied');
ok(faulted.afterWrite.join() === ROW_KEYS.join(),
  'G12 leaves the FIRST write clean — which is the only write 6b-1b ever observes', faulted.afterWrite);
const extra = faulted.afterOpen.filter((k) => !ROW_KEYS.includes(k));
ok(extra.length === 0,
  'THE FINDING: the second port instance persists a lifetime count into the summary store, and '
  + 'exit criterion 6 reports `# fail 0` on it (qa/r30-exit6c.sh, G12) because 6b-1b only ever '
  + 'opens ONE port over an EMPTY database, so `ensureReady`\'s upcast has nothing to walk',
  extra);
ok(faulted.listed.filter((k) => !ROW_KEYS.includes(k)).length === 0,
  'and listTrips() hands the widened row back to every consumer', faulted.listed);

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`} — a FAIL here is the finding, not a broken probe`);
process.exit(0);
