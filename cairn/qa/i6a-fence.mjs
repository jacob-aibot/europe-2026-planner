/**
 * Round 27 — I-6a, part 5: **the write fence under A-30, with scenarios the shipped tests and
 * `qa/i6-fence.sh` do not cover.**
 *
 *   Run: node --experimental-strip-types qa/i6a-fence.mjs      (from cairn/)
 *
 * `qa/i6-fence.sh` proves the two counterfactuals (restore I-6's rewrite; KD-57's
 * `writeAndSettle`) by mutating the store in a worktree. This file does not repeat that. It
 * builds the two-tab scenario from scratch and then goes at the races nobody has run:
 *
 *   §1  the baseline, re-derived: A idle on Y, B boots and rescans — no fence movement, and
 *       A's next keystroke settles `'idle'`
 *   §2  the same assertion given TEETH without touching product code: swap the port's
 *       `refreshSummary` for a minting one (what I-6 did) and watch A land in `'conflict'`
 *   §3  **two tabs rescanning the same rows at the same time** — two independent chains, one
 *       storage, both passes live
 *   §4  **a `refreshSummary` racing a `deleteTrip` for the SAME document**, through two stores:
 *       the CAS itself against the delete, not "a delete during a rescan pass"
 *   §5  **a `refreshSummary` racing a document save for the same id** — A-30 Part 6's residue,
 *       measured at the store level, including whether the loser ever converges
 *   §6  a refresh that REJECTS (not refuses) mid-pass: does the pass degrade or collapse?
 */
import {
  createStore, summaryScan, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort,
  immediateScheduler, core,
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
  ids: sequentialIdPort(`f${++seq}-`), scheduler: immediateScheduler(),
});
const CITY = {
  vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
  dubrovnik: { key: 'dubrovnik', name: 'Dubrovnik', countryCode: 'HR', centre: { lat: 42.6507, lng: 18.0944 } },
};
const makeTrip = (id, city) =>
  core.createTrip(
    { id, title: `Trip ${id}`, startDate: '2026-08-07', endDate: '2026-08-09', homeCurrency: 'EUR', cities: [CITY[city]] },
    { ids: core.sequentialIds(`${id}-`), now: TODAY, actorUserId: core.LOCAL_OWNER },
  );
const staleRow = (doc) => ({
  id: doc.id, title: doc.title, startDate: doc.startDate, endDate: doc.endDate,
  datePrecision: doc.datePrecision, cityCount: doc.cities.length, dayCount: doc.days.length,
  stopCount: 0, poolCount: 0, revision: doc.revision,
});
async function seed(storage, doc) {
  const r = await storage.saveIfVersion(doc.id, null, core.toJSON(doc), staleRow(doc));
  if (!r.ok) throw new Error(`seed ${doc.id} failed`);
}
function gate(storage, names = ['refreshSummary', 'saveIfVersion', 'delete', 'load', 'listTrips']) {
  const parked = [];
  const gates = new Set();
  for (const name of names) {
    const orig = storage[name].bind(storage);
    storage[name] = async (...args) => {
      if (gates.has(name)) await new Promise((res) => parked.push({ name, id: args[0], res }));
      return orig(...args);
    };
  }
  return {
    parked, open: (n) => gates.add(n), close: (n) => gates.delete(n),
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
head('§1 — baseline: A idle on Y, B boots and rescans');
{
  const storage = memoryStorage();
  const y = makeTrip('t-hr', 'dubrovnik');
  const x = makeTrip('t-at', 'vienna');
  await seed(storage, y);
  await seed(storage, x);

  // A holds Y open and IDLE — no write of its own, so its fence is the seeded version and
  // Y's row is still the stale one B's pass must bring current. (Flushing here would make Y's
  // row current and B would skip it, which is how this scenario passes for the wrong reason.)
  const A = createStore({ ports: ports(storage), autosave: false });
  await A.refreshLibrary();
  await A.openTrip('t-hr');
  const fenceBefore = storage.versions.get('t-hr');
  const docBefore = storage.docs.get('t-hr');
  const savesBefore = storage.saveCount;
  ok(
    A.getState().persistence.status === 'idle' && A.getState().persistence.savedVersion === fenceBefore,
    "setup: A is idle, holding the record's own fence, which it never wrote itself",
    { status: A.getState().persistence.status, held: A.getState().persistence.savedVersion === fenceBefore },
  );
  ok(
    (await storage.listTrips()).every((r) => (r.summaryVersion ?? 0) < core.SUMMARY_VERSION),
    'setup: BOTH rows are below SUMMARY_VERSION, so the pass really does write for Y',
    (await storage.listTrips()).map((r) => [r.id, r.summaryVersion ?? null]),
  );

  const B = createStore({ ports: ports(storage), autosave: false });
  await B.refreshLibrary();
  await B.rescanSummaries();

  ok(storage.versions.get('t-hr') === fenceBefore, "A-30: the rescan did NOT move Y's fence", {
    before: fenceBefore, after: storage.versions.get('t-hr'),
  });
  ok(storage.docs.get('t-hr') === docBefore, "and Y's document bytes are identical");
  ok(storage.saveCount === savesBefore, 'saveCount did not move — no document was written', { before: savesBefore, after: storage.saveCount });
  ok(storage.refreshCount === 2, 'refreshCount moved by exactly 2 — both rows brought current by the summary-only write', storage.refreshCount);
  ok((await storage.listTrips()).every((r) => r.summaryVersion === core.SUMMARY_VERSION), 'both rows reached SUMMARY_VERSION');

  A.dispatch({ type: 'setTripMeta', patch: { title: "A's edit" } });
  await A.flush();
  ok(A.getState().persistence.status === 'idle', "A's next keystroke settles 'idle' — no phantom conflict", A.getState().persistence.status);
  ok(core.fromJSON(storage.docs.get('t-hr')).title === "A's edit", "and A's edit reached storage");
}

// ---------------------------------------------------------------------------
head('§2 — the same assertion, given teeth: a MINTING refreshSummary (what I-6 did)');
{
  const storage = memoryStorage();
  const y = makeTrip('t-hr', 'dubrovnik');
  await seed(storage, y);
  // No product file is touched: the PORT is swapped for one that mints, which is exactly the
  // shape `saveIfVersion(id, v, toJSON(doc), summary)` had. If §1's assertion had no teeth,
  // this would pass too.
  const real = storage.saveIfVersion.bind(storage);
  storage.refreshSummary = async (id, expected, summary) => {
    const doc = storage.docs.get(id);
    if (doc === undefined) return { ok: false, storedVersion: null };
    return real(id, expected, doc, summary);
  };

  const A = createStore({ ports: ports(storage), autosave: false });
  await A.refreshLibrary();
  await A.openTrip('t-hr');            // open and idle, exactly as in §1
  const fenceBefore = storage.versions.get('t-hr');

  const B = createStore({ ports: ports(storage), autosave: false });
  await B.refreshLibrary();
  await B.rescanSummaries();

  ok(storage.versions.get('t-hr') !== fenceBefore, 'the minting port DID move the fence (the counterfactual holds)');
  A.dispatch({ type: 'setTripMeta', patch: { title: "A's edit" } });
  await A.flush();
  ok(
    A.getState().persistence.status === 'conflict',
    "R26-6 reproduced through the port alone: A is refused with 'conflict' over a byte-identical stored document",
    A.getState().persistence.status,
  );
  note(`A's banner: ${JSON.stringify((A.getState().persistence.lastError ?? '').slice(0, 60))}…`);
  note('§1 therefore measures something real: the same scenario differs only in whether the write mints');
}

// ---------------------------------------------------------------------------
head('§3 — two tabs rescanning the SAME rows at the same time');
{
  const storage = memoryStorage();
  const y = makeTrip('t-hr', 'dubrovnik');
  const x = makeTrip('t-at', 'vienna');
  await seed(storage, y);
  await seed(storage, x);
  const fences = { 't-hr': storage.versions.get('t-hr'), 't-at': storage.versions.get('t-at') };
  const savesBefore = storage.saveCount;   // the two seeds are writes too

  const A = createStore({ ports: ports(storage), autosave: false });
  const B = createStore({ ports: ports(storage), autosave: false });
  await A.refreshLibrary();
  await B.refreshLibrary();
  // Two independent chains, deliberately started without an await between them.
  const [pa, pb] = [A.rescanSummaries(), B.rescanSummaries()];
  await Promise.all([pa, pb]);

  ok(storage.versions.get('t-hr') === fences['t-hr'] && storage.versions.get('t-at') === fences['t-at'],
    'neither fence moved under two concurrent passes', { now: [storage.versions.get('t-hr'), storage.versions.get('t-at')] });
  ok(storage.saveCount === savesBefore, 'no document was written by either pass', { before: savesBefore, after: storage.saveCount });
  const rows = await storage.listTrips();
  ok(rows.every((r) => r.summaryVersion === core.SUMMARY_VERSION), 'both rows converged');
  ok(rows.find((r) => r.id === 't-hr').countryCodes.join() === 'HR', 'and each row carries its OWN countries', rows.map((r) => [r.id, r.countryCodes]));
  ok(rows.find((r) => r.id === 't-at').countryCodes.join() === 'AT', 'no cross-contamination between the two passes');
  for (const [name, S] of [['A', A], ['B', B]]) {
    const scan = summaryScan(S.getState());
    ok(scan.phase === 'complete', `${name}'s scan is complete`, scan);
  }
}

// ---------------------------------------------------------------------------
head('§4 — a `refreshSummary` racing a `deleteTrip` for the SAME document, two tabs');
{
  const storage = memoryStorage();
  const y = makeTrip('t-hr', 'dubrovnik');
  const x = makeTrip('t-at', 'vienna');
  await seed(storage, y);
  await seed(storage, x);
  const g = gate(storage);

  const A = createStore({ ports: ports(storage), autosave: false });   // the deleter
  const B = createStore({ ports: ports(storage), autosave: false });   // the rescanner
  await A.refreshLibrary();
  await B.refreshLibrary();

  // Park B's pass on the write for t-hr specifically.
  g.open('refreshSummary');
  const pass = B.rescanSummaries();
  ok(await g.waitFor('refreshSummary'), "B's pass reached a write");
  // A is a DIFFERENT store, so its chain is not B's: the delete really does land underneath.
  const target = g.parked.find((p) => p.name === 'refreshSummary').id;
  const del = A.deleteTrip(target);
  await settle();
  g.close('refreshSummary');
  g.releaseAll();
  await settle();
  g.releaseAll();
  await del;
  await pass;

  const ids = (await storage.listTrips()).map((r) => r.id);
  ok(!ids.includes(target), `THE KILLER: the deleted trip (${target}) did not come back as a summary row`, ids);
  ok(!storage.docs.has(target), 'and no document was resurrected', [...storage.docs.keys()]);
  ok(!storage.versions.has(target), 'and no envelope was left behind', [...storage.versions.keys()]);
  ok(B.getState().library.every((r) => r.id !== target), "B's on-screen library dropped it too", B.getState().library.map((r) => r.id));
  ok(summaryScan(B.getState()).phase === 'complete', "B's scan still completes", summaryScan(B.getState()));
}

// ---------------------------------------------------------------------------
head('§5 — a `refreshSummary` racing a document save for the same id (A-30 Part 6)');
{
  const storage = memoryStorage();
  const y = makeTrip('t-hr', 'dubrovnik');
  await seed(storage, y);
  const g = gate(storage);

  const A = createStore({ ports: ports(storage), autosave: false });   // the writer
  const B = createStore({ ports: ports(storage), autosave: false });   // the rescanner
  await A.refreshLibrary();
  await A.openTrip('t-hr');
  await B.refreshLibrary();

  g.open('refreshSummary');
  const pass = B.rescanSummaries();
  ok(await g.waitFor('refreshSummary'), "B's pass reached its write");
  A.dispatch({ type: 'setTripMeta', patch: { title: "A's title" } });
  await A.flush();                                  // A's document write lands underneath
  ok(A.getState().persistence.status === 'idle', "A's write succeeded", A.getState().persistence.status);
  g.close('refreshSummary');
  g.releaseAll();
  await settle();
  g.releaseAll();
  await pass;

  const row = (await storage.listTrips())[0];
  ok(row.title === "A's title", "the row describes A's document — the refresh did not write a stale row over it", row.title);
  ok(row.summaryVersion === core.SUMMARY_VERSION, "and it is current, because A's own save carried a current summary", row.summaryVersion);
  note('A-30 Part 6: the refusal is correct and the refused row is picked up by the next pass — here there was nothing left to pick up');

  // And the residue's own case: the refused row genuinely converges on a later pass when the
  // document writer did NOT carry a current summary (a second tab running an older build).
  const storage2 = memoryStorage();
  const z = makeTrip('t-zz', 'vienna');
  await seed(storage2, z);
  const g2 = gate(storage2);
  const C = createStore({ ports: ports(storage2), autosave: false });
  await C.refreshLibrary();
  g2.open('refreshSummary');
  const pass2 = C.rescanSummaries();
  await g2.waitFor('refreshSummary');
  // An "older build" writes the document with a version-2 row, straight at the port.
  const v = storage2.versions.get('t-zz');
  await storage2.saveIfVersion('t-zz', v, core.toJSON(z), { ...staleRow(z), summaryVersion: 2 });
  g2.close('refreshSummary');
  g2.releaseAll();
  await settle();
  g2.releaseAll();
  await pass2;
  const row2 = (await storage2.listTrips())[0];
  ok(row2.summaryVersion === core.SUMMARY_VERSION,
    'the refused row DOES converge inside the same pass bound, without a reboot', row2.summaryVersion);
  ok(summaryScan(C.getState()).phase === 'complete', "and C's scan reports complete", summaryScan(C.getState()));
}

// ---------------------------------------------------------------------------
head('§6 — a refresh that REJECTS mid-pass: degrade or collapse?');
{
  const storage = memoryStorage();
  for (const [id, c] of [['t-a', 'vienna'], ['t-b', 'dubrovnik'], ['t-c', 'vienna']]) await seed(storage, makeTrip(id, c));
  const savesBefore = storage.saveCount;   // the three seeds are writes too
  const store = createStore({ ports: ports(storage), autosave: false });
  await store.refreshLibrary();
  storage.failNextRefresh = 'disk on fire';

  let threw = null;
  try { await store.rescanSummaries(); } catch (e) { threw = e.message; }
  ok(threw === 'disk on fire', 'the failure surfaces to the caller rather than being swallowed', threw);
  ok(store.getState().rescan.running === false, "`rescan.running` is cleared by the finally — no stuck 'Recomputing…'", store.getState().rescan);
  const scan = summaryScan(store.getState());
  ok(scan.phase === 'stale', "and the scan says 'stale', not 'complete'", scan.phase);
  ok(scan.unreadable.length === 0, 'a STORAGE failure is not mis-filed as an unreadable document', scan.unreadable);
  note(`rows brought current before the failure: ${(await storage.listTrips()).filter((r) => r.summaryVersion === core.SUMMARY_VERSION).length} of 3`);

  // The queue must not be poisoned: a later pass completes normally.
  await store.rescanSummaries();
  ok(summaryScan(store.getState()).phase === 'complete', 'a later pass completes normally — the chain was not poisoned', summaryScan(store.getState()));
  ok((await storage.listTrips()).every((r) => r.summaryVersion === core.SUMMARY_VERSION), 'and every row converged');
  ok(storage.saveCount === savesBefore, 'no document was written at any point in this section', { before: savesBefore, after: storage.saveCount });
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`}`);
process.exit(fails === 0 ? 0 : 1);
