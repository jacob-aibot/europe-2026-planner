/**
 * Round 27 — I-6a, part 4: **R26-1, R26-2 and R26-3 re-derived, with fresh repros.**
 *
 *   Run: node --experimental-strip-types qa/i6a-bookkeeping.mjs      (from cairn/)
 *
 * The builder's evidence for these three is `qa/i6-ghostrow.mjs`, `qa/i6-unreadable.mjs` and
 * `qa/i6-converge.mjs` — round 26's own probes, **re-expressed by the builder** under KD-61 to
 * assert the fix where they used to assert the defect. A probe the party being audited rewrote
 * is not independent evidence that the thing it now asserts is true, so these are written from
 * the findings' text rather than from the shipped probes, with different fixtures and different
 * measurements:
 *
 *   §1  R26-2(a) — a record another writer REPAIRED **and brought current**: no pass runs, so
 *       the clearing has to happen before the early return
 *   §2  R26-2(b) — a record that was unreadable and is then DELETED: the header must not read
 *       "0 trips are not up to date yet"
 *   §3  R26-2(c) — the clearing must not be a blanket amnesia: a record that is STILL
 *       unreadable must still be reported after a second pass
 *   §4  R26-3 — an ORPHAN ROW (summary present, document gone): passes and `load()`s spent,
 *       counted at the port, on this call and on the next one
 *   §5  R26-3's distinction — an orphan is `outdated`, NOT "could not be read"
 *   §6  R26-1 — the end-of-pass `listTrips()` parked, a delete released under it, no ghost row
 */
import {
  createStore, summaryScan, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort,
  immediateScheduler, core, RESCAN_MAX_PASSES,
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
  ids: sequentialIdPort(`b${++seq}-`), scheduler: immediateScheduler(),
});
const CITY = {
  vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
  dubrovnik: { key: 'dubrovnik', name: 'Dubrovnik', countryCode: 'HR', centre: { lat: 42.6507, lng: 18.0944 } },
  prague: { key: 'prague', name: 'Prague', countryCode: 'CZ', centre: { lat: 50.0755, lng: 14.4378 } },
};
const makeTrip = (id, city) =>
  core.createTrip(
    { id, title: `Trip ${id}`, startDate: '2026-08-07', endDate: '2026-08-09', homeCurrency: 'EUR', cities: [CITY[city]] },
    { ids: core.sequentialIds(`${id}-`), now: TODAY, actorUserId: core.LOCAL_OWNER },
  );
/** A row from before I-6: no `summaryVersion` field, so `needsRescan` selects it. */
const staleRow = (doc) => ({
  id: doc.id, title: doc.title, startDate: doc.startDate, endDate: doc.endDate,
  datePrecision: doc.datePrecision, cityCount: doc.cities.length, dayCount: doc.days.length,
  stopCount: 0, poolCount: 0, revision: doc.revision,
});
async function seed(storage, doc, body) {
  const r = await storage.saveIfVersion(doc.id, null, body ?? core.toJSON(doc), staleRow(doc));
  if (!r.ok) throw new Error(`seed ${doc.id} failed`);
  return r.version;
}
/** Counts every port call, and can park one method. */
function watch(storage) {
  const calls = [];
  const parked = [];
  const gates = new Set();
  for (const name of ['saveIfVersion', 'refreshSummary', 'delete', 'load', 'listTrips']) {
    const orig = storage[name].bind(storage);
    storage[name] = async (...args) => {
      calls.push({ name, id: args[0] });
      if (gates.has(name)) await new Promise((res) => parked.push({ name, res }));
      return orig(...args);
    };
  }
  return {
    calls, parked,
    count: (n, id) => calls.filter((c) => c.name === n && (id === undefined || c.id === id)).length,
    reset: () => calls.splice(0),
    open: (n) => gates.add(n), close: (n) => gates.delete(n),
    releaseAll() { for (const p of parked.splice(0)) p.res(); },
    async waitFor(name, tries = 400) {
      for (let i = 0; i < tries; i++) {
        if (parked.some((p) => p.name === name)) return true;
        await new Promise((r) => setImmediate(r));
      }
      return false;
    },
  };
}
const settle = async (n = 30) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

// ---------------------------------------------------------------------------
head('§1 — R26-2(a): a repaired-AND-current record stops being called unreadable');
{
  const storage = memoryStorage();
  const good = makeTrip('t-good', 'vienna');
  const bad = makeTrip('t-bad', 'dubrovnik');
  await seed(storage, good);
  await seed(storage, bad, '{"schemaVersion":1,"this":"is not a trip"}');
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();

  let scan = summaryScan(store.getState());
  ok(scan.unreadable.length === 1 && scan.unreadable[0].id === 't-bad', 'setup: the corrupt record is reported', scan.unreadable);
  ok(scan.phase === 'stale', 'setup: phase stale', scan.phase);

  // A SECOND TAB repairs it and brings the row current in one write — the exact shape the
  // finding names, and the one where no pass will run afterwards.
  const v = storage.versions.get('t-bad');
  const fixed = await storage.saveIfVersion('t-bad', v, core.toJSON(bad), core.tripSummary(bad, core.COUNTRY_INDEX));
  ok(fixed.ok, 'the second tab repaired the record');
  await store.refreshLibrary();
  ok(store.getState().library.every((r) => (r.summaryVersion ?? 0) >= core.SUMMARY_VERSION), 'every row is now current, so nothing needs a rescan');

  await store.rescanSummaries();          // early return — no pass runs
  scan = summaryScan(store.getState());
  ok(scan.unreadable.length === 0, 'R26-2(a) CLOSED: nothing is reported as unreadable any more', scan.unreadable);
  ok(scan.phase === 'complete', "and the phase is 'complete', not 'stale' forever", scan.phase);
  ok(store.getState().rescan.unreadable.length === 0, 'the RAW store field was cleared too, not just the selector', store.getState().rescan.unreadable);
}

// ---------------------------------------------------------------------------
head('§2 — R26-2(b): an unreadable record that is then DELETED');
{
  const storage = memoryStorage();
  await seed(storage, makeTrip('t-good', 'vienna'));
  await seed(storage, makeTrip('t-bad', 'dubrovnik'), 'not json at all');
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();
  ok(summaryScan(store.getState()).unreadable.length === 1, 'setup: reported');

  await store.deleteTrip('t-bad');
  const scan = summaryScan(store.getState());
  ok(scan.unreadable.length === 0, 'R26-2(b) CLOSED: a deleted trip is not reported as a file that could not be read', scan.unreadable);
  ok(scan.outdated.length === 0, 'nothing outdated either', scan.outdated);
  ok(scan.phase === 'complete', "phase 'complete' — so Library.tsx cannot render \"0 trips are not up to date yet\"", scan.phase);
  note(`the raw field still holds ${store.getState().rescan.unreadable.length} entry (KD-59: derived in the selector, not pruned in the store)`);
  ok(
    store.getState().rescan.unreadable.length === 1,
    'KD-59\'s disclosed cost is exactly as disclosed: the raw field and the selector differ',
    store.getState().rescan.unreadable,
  );
}

// ---------------------------------------------------------------------------
head('§3 — R26-2(c): the clearing is not blanket amnesia');
{
  const storage = memoryStorage();
  await seed(storage, makeTrip('t-good', 'vienna'));
  await seed(storage, makeTrip('t-bad', 'dubrovnik'), '{"nope":1}');
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();
  ok(summaryScan(store.getState()).unreadable.length === 1, 'first pass reports it');
  await store.rescanSummaries();
  const scan = summaryScan(store.getState());
  ok(scan.unreadable.length === 1 && scan.unreadable[0].id === 't-bad',
    'a record that is STILL broken is STILL reported after a second call — the clearing re-derives, it does not forget', scan.unreadable);
  ok(scan.phase === 'stale', 'and the phase stays honest', scan.phase);
  await store.rescanSummaries();
  ok(summaryScan(store.getState()).unreadable.length === 1, 'and after a third');
}

// ---------------------------------------------------------------------------
head('§4 — R26-3: an ORPHAN ROW, passes and loads counted at the port');
{
  const storage = memoryStorage();
  const keep = makeTrip('t-keep', 'vienna');
  const orphan = makeTrip('t-orphan', 'prague');
  await seed(storage, keep);
  await seed(storage, orphan);
  // The shape a half-completed delete or a partial restore leaves: the row and the envelope
  // survive, the document does not.
  storage.docs.delete('t-orphan');
  const w = watch(storage);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  w.reset();
  await store.rescanSummaries();

  const loads = w.count('load', 't-orphan');
  const passes = w.count('listTrips');
  ok(loads === 1, `R26-3 CLOSED: the orphan is loaded ONCE (was 6 across 5 passes)`, loads);
  ok(passes === 1, `the pass bound is spent ONCE, not ${RESCAN_MAX_PASSES} times`, passes);
  ok(w.count('refreshSummary', 't-orphan') === 0, 'and no write was attempted for it', w.count('refreshSummary', 't-orphan'));
  ok(w.count('refreshSummary', 't-keep') === 1, 'while the healthy row was brought current in one write');

  // A second explicit call re-derives from storage, so it costs one more load — bounded, and
  // that is the §0.6 trade the fix is built on. It must NOT cost the whole bound again.
  w.reset();
  await store.rescanSummaries();
  ok(w.count('load', 't-orphan') === 1, 'a SECOND rescanSummaries() costs one more load, not five', w.count('load', 't-orphan'));
  ok(w.count('listTrips') === 1, 'and one more pass, not five', w.count('listTrips'));
  note(`totals over two calls: ${w.calls.length} port calls in the second`);
}

// ---------------------------------------------------------------------------
head('§5 — R26-3\'s distinction: an orphan is `outdated`, never "could not be read"');
{
  const storage = memoryStorage();
  await seed(storage, makeTrip('t-keep', 'vienna'));
  await seed(storage, makeTrip('t-orphan', 'prague'));
  storage.docs.delete('t-orphan');
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();
  const scan = summaryScan(store.getState());
  ok(scan.unreadable.length === 0, 'not filed as unreadable', scan.unreadable);
  ok(scan.outdated.join() === 't-orphan', 'filed as outdated, named', scan.outdated);
  ok(scan.phase === 'stale', 'and the phase says so honestly', scan.phase);
}

// ---------------------------------------------------------------------------
head('§6 — R26-1: the end-of-pass listTrips parked, a delete released under it');
{
  const storage = memoryStorage();
  await seed(storage, makeTrip('t-keep', 'vienna'));
  await seed(storage, makeTrip('t-doomed', 'dubrovnik'));
  const w = watch(storage);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();

  // Park the END-OF-PASS read, which is the one R26-1 is about. Both rows are refreshed first.
  w.open('listTrips');
  const pass = store.rescanSummaries();
  ok(await w.waitFor('listTrips'), 'the pass reached its end-of-pass listTrips and is parked');
  ok(w.count('refreshSummary') === 2, 'both rows were refreshed before the park', w.count('refreshSummary'));

  // KD-60: awaiting the delete here would DEADLOCK, because the delete now queues behind the
  // parked link. Start it, release, then await.
  const del = store.deleteTrip('t-doomed');
  await settle();
  ok(w.count('delete') === 0, 'the delete has not reached the port — it is queued behind the parked link (KD-60)', w.count('delete'));
  w.close('listTrips');
  w.releaseAll();
  await settle();
  w.releaseAll();
  await pass;
  await del;

  const ids = store.getState().library.map((r) => r.id);
  ok(ids.join() === 't-keep', 'R26-1 CLOSED: no ghost row — the deleted trip is not back on screen', ids);
  ok((await storage.listTrips()).map((r) => r.id).join() === 't-keep', 'and storage agrees', (await storage.listTrips()).map((r) => r.id));
  const scan = summaryScan(store.getState());
  ok(scan.outdated.length === 0 && scan.unreadable.length === 0 && scan.phase === 'complete', 'the scan is complete and clean', scan);
  // The failure the finding described: clicking the ghost row.
  let threw = null;
  try { await store.openTrip('t-doomed'); } catch (e) { threw = e.message; }
  ok(threw !== null, 'opening the deleted id still refuses (it is gone from storage)', threw);
  ok(!ids.includes('t-doomed'), 'but no surface offers it, which is the finding', ids);
}

// ---------------------------------------------------------------------------
head('§7 — R27-1: the stale `unreadable` entry RESURFACES when the id comes back');
{
  // KD-59 discloses one direction of the cost of deriving `unreadable` in the selector instead
  // of pruning it in the store: *"the raw field may hold an id the selector does not report."*
  // The other direction is not disclosed and is the defect: the selector reports whatever is in
  // the raw field **for any id currently in the library**, and `importDoc` can put the same id
  // back. The sequence is the one a user would actually perform — the file could not be read,
  // so delete it and restore the backup (ARCHITECTURE §4.5).
  const storage = memoryStorage();
  const keep = makeTrip('t-keep', 'vienna');
  const bad = makeTrip('t-bad', 'dubrovnik');
  await seed(storage, keep);
  await seed(storage, bad, '{"garbage":1}');
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();
  ok(summaryScan(store.getState()).unreadable.length === 1, 'step 1: the corrupt file is reported');

  await store.deleteTrip('t-bad');
  ok(summaryScan(store.getState()).unreadable.length === 0, 'step 2: the user deletes it, and the report clears (R26-2(b))');
  ok(store.getState().rescan.unreadable.length === 1, "   …though the RAW field still holds it (KD-59's disclosed cost)");

  await store.importDoc(core.toJSON(bad));       // the user restores their own backup
  const scan = summaryScan(store.getState());
  const ids = store.getState().library.map((r) => `${r.id}@${r.summaryVersion}`);
  ok(ids.includes('t-bad@3'), 'step 3: the restore succeeded and the row is CURRENT', ids);

  const rendered =
    scan.phase === 'complete'
      ? '(no note)'
      : (scan.phase === 'recomputing'
          ? `Recomputing trip details… ${scan.current} of ${scan.total} up to date.`
          : `${scan.outdated.length} ${scan.outdated.length === 1 ? 'trip is' : 'trips are'} not up to date yet.`) +
        (scan.unreadable.length > 0 ? ` One trip’s file could not be read, so its details are the last ones we managed to work out.` : '');
  note(`Library.tsx ScanNote would render: ${JSON.stringify(rendered)}`);
  ok(
    scan.unreadable.length === 0,
    'R27-1: a restored trip is NOT reported as a file that could not be read',
    scan.unreadable,
  );
  ok(
    scan.phase === 'complete',
    "R27-1: and the phase is 'complete' — every row is at SUMMARY_VERSION and every document parses",
    { phase: scan.phase, outdated: scan.outdated },
  );
  ok(
    !rendered.includes('0 trips are not up to date yet'),
    'R27-1: the exact string R26-2 named must not be reachable',
    rendered,
  );
  // It does not self-heal within the session: nothing calls `rescanSummaries()` after boot.
  await store.rescanSummaries();
  ok(summaryScan(store.getState()).unreadable.length === 0, 'an explicit rescanSummaries() does clear it (the reload-shaped workaround)');
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`}`);
process.exit(fails === 0 ? 0 : 1);
