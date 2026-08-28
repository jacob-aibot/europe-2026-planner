/**
 * Round 26 — I-6, part 5: **does the rescan converge, and is `RESCAN_MAX_PASSES = 5` (KD-56)
 * enough for the convergence properties this loop actually has?**
 *
 *   Run: node --experimental-strip-types qa/i6-converge.mjs      (from cairn/)
 *
 * KD-56 borrows the number and the reasoning from `FLUSH_MAX_ATTEMPTS`. The two loops are not
 * the same shape: a flush retries ONE document against one user typing, and a rescan retries
 * N documents against anything at all. So the question is whether a pass's residue is always
 * "the rows that failed", or whether it can be bigger than that.
 *
 *   1  the arithmetic: how many storage calls does one pass cost, per row and in total
 *   2  a transient refusal — one row raced once — must converge in 2 passes, not 5
 *   3  rows arriving BELOW the version while a pass runs (a second, older tab)
 *   4  a hostile writer that re-lowers a row every pass — the bound must hold and the
 *      library must keep saying so
 *   5  an ORPHAN row: a summary in storage whose document is gone. `load()` returns null, so
 *      the row is never written, never marked unreadable, and never leaves `listTrips()`.
 *      Does the loop spend all five passes on it every single boot?
 *   6  40 rows: the pass cost at the scale §8.4 talks about
 */
import {
  createStore, RESCAN_MAX_PASSES, summaryScan, memoryStorage, memoryFile,
  fixedClockPort, sequentialIdPort, immediateScheduler, core,
} from '../packages/client/src/index.ts';

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const TODAY = '2026-08-01';
let seq = 0;
const ports = (storage) => ({
  storage, file: memoryFile(), clock: fixedClockPort(TODAY),
  ids: sequentialIdPort(`c${++seq}-`), scheduler: immediateScheduler(),
});
const CITY = {
  vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
  dubrovnik: { key: 'dubrovnik', name: 'Dubrovnik', countryCode: 'HR', centre: { lat: 42.6507, lng: 18.0944 } },
};
const makeTrip = (id, city = 'vienna') =>
  core.createTrip(
    { id, title: `Trip ${id}`, startDate: '2026-08-07', endDate: '2026-08-09', homeCurrency: 'EUR', cities: [CITY[city]] },
    { ids: core.sequentialIds(`${id}-`), now: TODAY, actorUserId: core.LOCAL_OWNER },
  );
const preI6Row = (doc) => ({
  id: doc.id, title: doc.title, startDate: doc.startDate, endDate: doc.endDate,
  datePrecision: doc.datePrecision, cityCount: doc.cities.length, dayCount: doc.days.length,
  stopCount: 0, poolCount: 0, revision: doc.revision,
});
async function seed(storage, doc) {
  const r = await storage.saveIfVersion(doc.id, null, core.toJSON(doc), preI6Row(doc));
  if (!r.ok) throw new Error('seed failed');
}
/** Counts every port call by name. */
function count(storage) {
  const n = { load: 0, listTrips: 0, saveIfVersion: 0, delete: 0 };
  for (const k of Object.keys(n)) {
    const orig = storage[k].bind(storage);
    storage[k] = async (...a) => { n[k]++; return orig(...a); };
  }
  return n;
}

// ---------------------------------------------------------------------------
head('1 — one clean pass over 3 rows: the port-call arithmetic');
{
  const storage = memoryStorage();
  for (const d of [makeTrip('a'), makeTrip('b'), makeTrip('c')]) await seed(storage, d);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const n = count(storage);
  await store.rescanSummaries();
  note(`3 rows, no contention: ${JSON.stringify(n)}`);
  ok(n.saveIfVersion === 3, 'one write per row, no retries', n.saveIfVersion);
  ok(n.load === 3, 'one document load per row — never two rows in memory at once', n.load);
  ok(n.listTrips === 1, 'one library re-read per pass, and exactly one pass was needed', n.listTrips);
  ok(summaryScan(store.getState()).phase === 'complete', 'complete');
}

// ---------------------------------------------------------------------------
head('2 — a transient refusal: one row raced once must converge in TWO passes');
{
  const storage = memoryStorage();
  for (const d of [makeTrip('a'), makeTrip('b')]) await seed(storage, d);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const n = count(storage);
  // Move `b`'s version between its load and its write, exactly once.
  let armed = true;
  const origLoad = storage.load.bind(storage);
  storage.load = async (id) => {
    const r = await origLoad(id);
    if (armed && id === 'b' && r) {
      armed = false;
      await storage.saveIfVersion('b', r.version, r.doc, preI6Row(makeTrip('b')));   // a third writer
    }
    return r;
  };
  await store.rescanSummaries();
  const scan = summaryScan(store.getState());
  note(`ports: ${JSON.stringify(n)}; scan: ${JSON.stringify(scan)}`);
  ok(scan.phase === 'complete', 'a single transient refusal still converges', scan);
  ok(n.listTrips === 2, 'and it took exactly two passes, not five', n.listTrips);
}

// ---------------------------------------------------------------------------
head('3 — rows arriving BELOW the version while a pass runs (an older second tab)');
{
  const storage = memoryStorage();
  for (const d of [makeTrip('a'), makeTrip('b')]) await seed(storage, d);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const n = count(storage);
  let dropped = false;
  const origSave = storage.saveIfVersion.bind(storage);
  storage.saveIfVersion = async (...a) => {
    const r = await origSave(...a);
    if (!dropped && a[0] === 'a') {
      dropped = true;
      const c = makeTrip('c');                                     // an OLD tab writes a pre-I-6 row
      await origSave('c', null, core.toJSON(c), preI6Row(c));
    }
    return r;
  };
  await store.rescanSummaries();
  const scan = summaryScan(store.getState());
  note(`ports: ${JSON.stringify(n)}; scan: ${JSON.stringify(scan)}`);
  ok(scan.phase === 'complete', 'the row that arrived behind the pass was picked up', scan);
  ok(scan.total === 3, 'and the library knows about all three', scan.total);
  ok(n.listTrips === 2, 'and it took two passes — the arriving row was swept up by the re-read', n.listTrips);
}

// ---------------------------------------------------------------------------
head('4 — a writer that re-lowers a row on EVERY pass: the bound holds, honestly');
{
  const storage = memoryStorage();
  for (const d of [makeTrip('a'), makeTrip('b')]) await seed(storage, d);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const n = count(storage);
  const origList = storage.listTrips.bind(storage);
  storage.listTrips = async () => {
    const rows = await origList();
    // After every pass, an adversary re-lowers `a`.
    const cur = await storage.load('a');
    if (cur) await storage.saveIfVersion('a', cur.version, cur.doc, preI6Row(makeTrip('a')));
    return origList();
  };
  await store.rescanSummaries();
  const scan = summaryScan(store.getState());
  note(`ports: ${JSON.stringify(n)}; scan: ${JSON.stringify(scan)}`);
  ok(scan.phase === 'stale', 'exhausting the bound leaves the library saying "not up to date"', scan.phase);
  ok(scan.outdated.includes('a'), 'and names the row', scan.outdated);
  // The adversary calls the counted `listTrips` twice per store call, so the counter reads 2x.
  ok(n.listTrips / 2 === RESCAN_MAX_PASSES, `exactly ${RESCAN_MAX_PASSES} passes were run, then it stopped`, n.listTrips / 2);
  ok(store.getState().rescan.running === false, 'nothing is left running');
}

// ---------------------------------------------------------------------------
head('5 — an ORPHAN row: a summary in storage whose document is gone');
{
  const storage = memoryStorage();
  for (const d of [makeTrip('a'), makeTrip('ghost')]) await seed(storage, d);
  // Destroy the document but leave the row — the shape a half-completed delete leaves.
  storage.docs.delete('ghost');
  storage.versions.delete('ghost');
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const n = count(storage);
  await store.rescanSummaries();
  const scan = summaryScan(store.getState());
  note(`ports: ${JSON.stringify(n)}; scan: ${JSON.stringify(scan)}`);
  ok(scan.phase === 'stale', 'the library reports itself out of date rather than complete', scan.phase);
  ok(scan.outdated.length === 1 && scan.outdated[0] === 'ghost', 'and names the orphan', scan.outdated);
  ok(scan.unreadable.length === 0, 'it is "outdated", not "unreadable" — different facts, kept apart', scan.unreadable);
  ok(n.listTrips === RESCAN_MAX_PASSES, `the loop spends ALL ${RESCAN_MAX_PASSES} passes on it, every boot`, n.listTrips);
  note(`a null \`load\` is the ONE non-convergent outcome that is not filtered out of the next`);
  note(`pass the way an unreadable document is. Cost is bounded (${n.load} loads) and the user`);
  note(`is told the truth, but the work is repeated in full on every single boot.`);
  ok(store.getState().rescan.running === false, 'the pass stops');
}

// ---------------------------------------------------------------------------
head('6 — 40 rows: what one pass costs at §8.4\'s stated scale');
{
  const storage = memoryStorage();
  for (let i = 0; i < 40; i++) await seed(storage, makeTrip(`t${String(i).padStart(2, '0')}`, i % 2 ? 'dubrovnik' : 'vienna'));
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const n = count(storage);
  const t0 = process.hrtime.bigint();
  await store.rescanSummaries();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const scan = summaryScan(store.getState());
  note(`40 rows: ${JSON.stringify(n)} in ${ms.toFixed(0)} ms (in-memory port)`);
  ok(scan.phase === 'complete', 'all 40 converged', scan.phase);
  ok(n.load === 40 && n.saveIfVersion === 40, 'exactly one load and one write each', n);
  const rows = await storage.listTrips();
  const mixed = rows.filter((r) => {
    const want = Number(r.id.slice(1)) % 2 ? 'HR' : 'AT';
    return JSON.stringify(r.countryCodes) !== JSON.stringify([want]);
  });
  ok(mixed.length === 0, 'and no row carries another row\'s countries', mixed.map((r) => r.id));
  note(`40 documents were serialized and rewritten to bring a SUMMARY field current — the`);
  note(`port has no summary-only write, so §8.4 clause 3's rescan is a full document rewrite`);
  note(`per row. On the reference trip that is ~230 KB each.`);
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}`);
process.exitCode = fails === 0 ? 0 : 1;
