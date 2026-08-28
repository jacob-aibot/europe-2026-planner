/**
 * Round 26 — I-6, part 2: the rescan write path under concurrency.
 *
 *   Run: node --experimental-strip-types qa/i6-race.mjs      (from cairn/)
 *
 * The builder attacked two races (version bumped mid-rescan with a write in flight; 40 rows
 * with one corrupt). These are the ones he did not:
 *
 *   A  the ACTIVE trip's identity changes mid-rescan — `openTrip` lands between two rows
 *   B  `closeTrip` on the very document being rescanned
 *   C  a delete arriving through STORAGE (a second tab's port), not through `deleteTrip`,
 *      between the rescan's `load` and its `saveIfVersion`
 *   D  two stores on one storage: does a background rescan push the OTHER tab into 'conflict'?
 *   E  the active trip already in 'conflict' — does the rescan converge, or spin the bound?
 *   F  does the rescan persist the active document's UNSAVED in-memory edit ahead of the debounce?
 *   G  substance of the "six document-installing methods" claim: is `doc`/`activeTripId`/
 *      `persistence` ever touched for a document that is NOT the active one?
 *   H  a storage failure (not a parse failure) mid-rescan — degrade or collapse?
 *   I  two overlapping `rescanSummaries()` with a different document edited under each
 */
import {
  createStore, RESCAN_MAX_PASSES, summaryScan, memoryStorage, memoryFile,
  fixedClockPort, sequentialIdPort, immediateScheduler, manualScheduler, core,
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
const ports = (storage, scheduler) => ({
  storage,
  file: memoryFile(),
  clock: fixedClockPort(TODAY),
  ids: sequentialIdPort(`q${++seq}-`),
  scheduler: scheduler ?? immediateScheduler(),
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

/** The row a pre-I-6 build wrote: no `summaryVersion` field at all. */
const preI6Row = (doc) => ({
  id: doc.id, title: doc.title, startDate: doc.startDate, endDate: doc.endDate,
  datePrecision: doc.datePrecision, cityCount: doc.cities.length, dayCount: doc.days.length,
  stopCount: 0, poolCount: 0, revision: doc.revision,
});

async function seed(storage, doc, body) {
  const r = await storage.saveIfVersion(doc.id, null, body ?? core.toJSON(doc), preI6Row(doc));
  if (!r.ok) throw new Error(`seed ${doc.id} failed`);
}

/** Wraps a MemoryStorage so a named method can be parked and released. */
function gate(storage) {
  const parked = [];
  const gates = new Set();
  const wrap = (name) => {
    const orig = storage[name].bind(storage);
    storage[name] = async (...args) => {
      if (gates.has(name)) {
        await new Promise((res) => parked.push({ name, args, res }));
      }
      return orig(...args);
    };
  };
  for (const n of ['saveIfVersion', 'load', 'listTrips', 'delete']) wrap(n);
  return {
    storage,
    open: (n) => gates.add(n),
    close: (n) => gates.delete(n),
    parked,
    releaseAll() { const p = parked.splice(0); for (const x of p) x.res(); },
    async waitFor(name, tries = 400) {
      for (let i = 0; i < tries; i++) {
        if (parked.some((p) => p.name === name)) return true;
        await new Promise((r) => setImmediate(r));
      }
      return false;
    },
  };
}

const tick = () => new Promise((r) => setImmediate(r));

// ---------------------------------------------------------------------------
head('A — the ACTIVE trip changes identity mid-rescan (openTrip between two rows)');
{
  const storage = memoryStorage();
  const [a, b, c] = [makeTrip('t-at', 'vienna'), makeTrip('t-hr', 'dubrovnik'), makeTrip('t-cz', 'prague')];
  for (const d of [a, b, c]) await seed(storage, d);
  const g = gate(storage);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.openTrip('t-at');

  // Park the rescan on its first `saveIfVersion`, then switch the active trip to t-cz —
  // a row the same pass has not reached yet.
  g.open('saveIfVersion');
  const pass = store.rescanSummaries();
  ok(await g.waitFor('saveIfVersion'), 'the rescan reached a write');
  g.close('saveIfVersion');
  g.releaseAll();
  await tick();
  await store.openTrip('t-cz');
  await pass;

  const rows = await storage.listTrips();
  const bad = rows.filter((r) => (r.summaryVersion ?? 0) < core.SUMMARY_VERSION);
  ok(bad.length === 0, 'every row still converged after the switch', bad.map((r) => r.id));
  // The killer: does any row carry another trip's countries?
  const expect = { 't-at': ['AT'], 't-hr': ['HR'], 't-cz': ['CZ'] };
  for (const r of rows) {
    ok(JSON.stringify(r.countryCodes) === JSON.stringify(expect[r.id]),
      `${r.id} carries its OWN countries`, { id: r.id, got: r.countryCodes });
    const doc = core.fromJSON((await storage.load(r.id)).doc);
    ok(r.id === doc.id && r.title === doc.title, `${r.id}'s row is about ${r.id}'s document`);
  }
  const s = store.getState();
  ok(s.doc.id === 't-cz', 'the store still holds the trip the user switched to', s.doc.id);
  ok(s.persistence.status === 'idle', 'no spurious conflict from the switch', s.persistence);
  ok(s.persistence.savedDoc === s.doc, 'the fence is the document the store holds');
  ok(s.persistence.savedVersion === storage.versions.get('t-cz'),
    'and savedVersion is t-cz\'s own stored version — NOT one minted for another trip',
    { fence: s.persistence.savedVersion, stored: storage.versions.get('t-cz') });
  ok(summaryScan(s).phase === 'complete', 'summaryScan settles complete', summaryScan(s));
}

// ---------------------------------------------------------------------------
head('B — closeTrip on the very document being rescanned');
{
  const storage = memoryStorage();
  const [a, b] = [makeTrip('t-at', 'vienna'), makeTrip('t-hr', 'dubrovnik')];
  for (const d of [a, b]) await seed(storage, d);
  const g = gate(storage);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.openTrip('t-at');

  g.open('saveIfVersion');
  const pass = store.rescanSummaries();
  await g.waitFor('saveIfVersion');
  const closing = store.closeTrip();
  await tick();
  g.close('saveIfVersion');
  g.releaseAll();
  await Promise.all([pass, closing]);
  await tick();
  g.releaseAll();

  const rows = await storage.listTrips();
  const bad = rows.filter((r) => (r.summaryVersion ?? 0) < core.SUMMARY_VERSION);
  ok(bad.length === 0, 'both rows converged across the close', bad.map((r) => r.id));
  const s = store.getState();
  ok(s.doc === null, 'the trip really did close', s.doc && s.doc.id);
  ok(s.persistence.savedDoc === null && s.persistence.savedVersion === null,
    'the fence was cleared with the document, not left pointing at a rescanned trip', s.persistence);
  ok(s.rescan.running === false, 'the rescan flag is not stuck on after a close');
}

// ---------------------------------------------------------------------------
head('C — a delete arriving through STORAGE between the rescan\'s load and its write');
{
  const storage = memoryStorage();
  const [a, b] = [makeTrip('t-at', 'vienna'), makeTrip('t-hr', 'dubrovnik')];
  for (const d of [a, b]) await seed(storage, d);
  const g = gate(storage);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();

  g.open('saveIfVersion');
  const pass = store.rescanSummaries();
  await g.waitFor('saveIfVersion');
  const target = g.parked.find((p) => p.name === 'saveIfVersion').args[0];
  // A DIFFERENT tab destroys it — straight at the port, never through `deleteTrip`.
  await storage.delete(target);
  g.close('saveIfVersion');
  g.releaseAll();
  await pass;

  const stored = await storage.load(target);
  ok(stored === null, `${target} stayed deleted — the rescan did not resurrect it`, stored && 'RESURRECTED');
  const rows = await storage.listTrips();
  ok(!rows.some((r) => r.id === target), 'and no summary row for it survives in storage', rows.map((r) => r.id));
  const s = store.getState();
  note(`in-memory library after the pass: ${JSON.stringify(s.library.map((r) => r.id))}`);
  ok(!s.library.some((r) => r.id === target), 'the in-memory library dropped it too', s.library.map((r) => r.id));
  ok(s.rescan.running === false, 'the pass stopped');
}

// ---------------------------------------------------------------------------
head('D — two tabs: does a background rescan push the OTHER tab into conflict?');
{
  const storage = memoryStorage();
  const [a, b] = [makeTrip('t-at', 'vienna'), makeTrip('t-hr', 'dubrovnik')];
  for (const d of [a, b]) await seed(storage, d);

  // Tab A: has t-hr open, clean, idle. It never asked for a rescan.
  const tabA = createStore({ ports: ports(storage) });
  await tabA.refreshLibrary();
  await tabA.openTrip('t-hr');
  const fenceBefore = tabA.getState().persistence.savedVersion;

  // Tab B boots and rescans (this is exactly App.tsx's boot sequence).
  const tabB = createStore({ ports: ports(storage) });
  await tabB.refreshLibrary();
  await tabB.rescanSummaries();

  // Tab A's user types one character.
  await tabA.dispatch({ type: 'setTripMeta', patch: { title: 'Croatia, renamed by the user' } });
  await tabA.flush();
  const s = tabA.getState();
  note(`tab A fence before rescan: ${fenceBefore}; storage now: ${storage.versions.get('t-hr')}`);
  note(`tab A status after its own edit: ${s.persistence.status} / ${s.persistence.lastError ?? '—'}`);
  const stored = core.fromJSON((await storage.load('t-hr')).doc);
  ok(s.persistence.status === 'conflict', 'REPRODUCED: the other tab is refused, with no user on the other side', s.persistence.status);
  ok(stored.title === 'Trip t-hr', 'and the edit is NOT in storage (correctly refused, not lost)', stored.title);
  ok(s.doc.title === 'Croatia, renamed by the user', 'the edit is still in memory — nothing was destroyed');
  note('Severity turns on whether a rescan is allowed to invalidate another tab\'s fence.');
  note('§8.4 clause 3 mandates the rewrite, so this is a consequence of the design, not of');
  note('the code — but the rewrite is byte-identical to what storage already held.');
  const sameBytes = JSON.stringify(core.toJSON(core.fromJSON(storage.docs.get('t-hr')))) === JSON.stringify(storage.docs.get('t-hr'));
  ok(sameBytes, 'the rescan rewrote byte-identical document content (only the summary changed)');
}

// ---------------------------------------------------------------------------
head('E — the ACTIVE trip is already in conflict: does the rescan converge?');
{
  const storage = memoryStorage();
  const [a, b] = [makeTrip('t-at', 'vienna'), makeTrip('t-hr', 'dubrovnik')];
  for (const d of [a, b]) await seed(storage, d);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.openTrip('t-at');
  // Another writer moves t-at's version behind this store's back.
  const cur = await storage.load('t-at');
  await storage.saveIfVersion('t-at', cur.version, cur.doc, preI6Row(a));
  await store.dispatch({ type: 'setTripMeta', patch: { title: 'edited' } });
  await store.flush();
  ok(store.getState().persistence.status === 'conflict', 'precondition: the active trip is in conflict');

  const before = storage.saveCount;
  await store.rescanSummaries();
  const spent = storage.saveCount - before;
  const s = store.getState();
  const scan = summaryScan(s);
  note(`saveIfVersion attempts spent by the rescan: ${spent} (RESCAN_MAX_PASSES=${RESCAN_MAX_PASSES})`);
  note(`summaryScan: ${JSON.stringify(scan)}`);
  ok(scan.phase === 'stale', 'the library honestly reports itself out of date', scan.phase);
  ok(scan.outdated.includes('t-at'), 'and names the row it could not bring current', scan.outdated);
  ok(s.persistence.status === 'conflict', 'the user\'s conflict is not cleared or masked', s.persistence.status);
  ok(s.doc.title === 'edited', 'the user\'s edit is intact');
  ok(spent <= RESCAN_MAX_PASSES + 2, 'the bound holds — it does not spin', spent);
  ok(!scan.unreadable.some((u) => u.id === 't-at'),
    'a refused write is NOT reported as an unreadable document (they are different facts)');
  note('The row can never converge while the conflict stands: `attemptSave` writes against');
  note('`persistence.savedVersion`, which is stale by definition in this state. Every future');
  note('rescan re-spends the bound. Reported honestly, but it is a permanent stale row.');
}

// ---------------------------------------------------------------------------
head('F — does the rescan persist the active document\'s UNSAVED edit ahead of the debounce?');
{
  const storage = memoryStorage();
  const a = makeTrip('t-at', 'vienna');
  await seed(storage, a);
  const sched = manualScheduler();
  const store = createStore({ ports: ports(storage, sched) });
  await store.refreshLibrary();
  await store.openTrip('t-at');
  await store.dispatch({ type: 'setTripMeta', patch: { title: 'half-typed, debounce still pending' } });
  const storedBefore = core.fromJSON((await storage.load('t-at')).doc);
  ok(storedBefore.title === 'Trip t-at', 'precondition: the edit is NOT yet in storage');
  ok(sched.pending.length > 0, 'precondition: the debounce is armed', sched.pending.length);

  await store.rescanSummaries();
  const storedAfter = core.fromJSON((await storage.load('t-at')).doc);
  note(`title in storage after the rescan: ${JSON.stringify(storedAfter.title)}`);
  ok(storedAfter.title === 'half-typed, debounce still pending',
    'CONFIRMED: the rescan wrote the in-flight edit early, through attemptSave', storedAfter.title);
  note('Not a loss — it is the same write the debounce would have made. Worth stating because');
  note('the rescan is documented as a summary refresh, and it is also a document write.');
  const s = store.getState();
  ok(s.persistence.status === 'idle' && s.persistence.savedDoc === s.doc, 'and the store is left clean and consistent', s.persistence.status);
}

// ---------------------------------------------------------------------------
head('G — a rescan write for a NON-active document never touches doc/activeTripId/persistence');
{
  const storage = memoryStorage();
  const [a, b, c] = [makeTrip('t-at', 'vienna'), makeTrip('t-hr', 'dubrovnik'), makeTrip('t-cz', 'prague')];
  for (const d of [a, b, c]) await seed(storage, d);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.openTrip('t-at');
  const base = store.getState();
  const seen = [];
  const un = store.subscribe((s) => seen.push(s));
  await store.rescanSummaries();
  un();

  const foreign = seen.filter((s) => s.doc !== base.doc || s.activeTripId !== base.activeTripId);
  note(`${seen.length} emissions during the pass; ${foreign.length} moved doc/activeTripId`);
  // t-at IS the active trip, so its own `attemptSave` legitimately moves `persistence`.
  // Nothing else may.
  const docChanges = seen.filter((s) => s.activeTripId !== 't-at');
  ok(docChanges.length === 0, 'activeTripId never left t-at during the pass', docChanges.length);
  const wrongDoc = seen.filter((s) => s.doc && s.doc.id !== 't-at');
  ok(wrongDoc.length === 0, 'state.doc was never a non-active trip\'s document', wrongDoc.map((s) => s.doc.id));
  const fences = new Set(seen.map((s) => s.persistence.savedVersion));
  note(`distinct savedVersion values observed: ${JSON.stringify([...fences])}`);
  const final = store.getState();
  ok(final.persistence.savedVersion === storage.versions.get('t-at'),
    'the final fence is t-at\'s own stored version', { fence: final.persistence.savedVersion, stored: storage.versions.get('t-at') });
  ok(final.persistence.savedDoc && final.persistence.savedDoc.id === 't-at', 'and savedDoc is t-at\'s document');
  ok(final.retired === null || final.retired.tripId === 't-at', 'the retirement ledger did not cross a trip', final.retired && final.retired.tripId);
  ok(final.history.past.length === base.history.past.length, 'the undo stack was not cleared or grown by the rescan',
    { before: base.history.past.length, after: final.history.past.length });
}

// ---------------------------------------------------------------------------
head('H — a STORAGE failure (not a parse failure) mid-rescan');
{
  const storage = memoryStorage();
  const [a, b] = [makeTrip('t-at', 'vienna'), makeTrip('t-hr', 'dubrovnik')];
  for (const d of [a, b]) await seed(storage, d);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  storage.failAll = 'IndexedDB: QuotaExceededError';
  let threw = null;
  try { await store.rescanSummaries(); } catch (e) { threw = e; }
  const s = store.getState();
  note(`rescanSummaries() ${threw ? `THREW: ${threw.message}` : 'resolved'}`);
  note(`rescan state after: ${JSON.stringify(s.rescan)}`);
  note(`summaryScan: ${JSON.stringify(summaryScan(s))}`);
  ok(s.rescan.running === false, 'running is cleared even on a throw (the finally does its job)');
  ok(summaryScan(s).phase === 'stale', 'and the library reports itself stale rather than complete');
  ok(threw !== null, 'the failure is surfaced to the caller rather than swallowed', threw && threw.message);
  ok(s.rescan.unreadable.length === 0,
    'a storage failure is NOT filed as an unreadable document', s.rescan.unreadable);
  // Does the store still work afterwards?
  storage.failAll = null;
  await store.rescanSummaries();
  ok(summaryScan(store.getState()).phase === 'complete', 'a later pass recovers — the chain was not poisoned', summaryScan(store.getState()));
}

// ---------------------------------------------------------------------------
head('I — two overlapping rescanSummaries() with a different document edited under each');
{
  const storage = memoryStorage();
  const [a, b, c] = [makeTrip('t-at', 'vienna'), makeTrip('t-hr', 'dubrovnik'), makeTrip('t-cz', 'prague')];
  for (const d of [a, b, c]) await seed(storage, d);
  const g = gate(storage);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.openTrip('t-at');

  g.open('saveIfVersion');
  const p1 = store.rescanSummaries();
  await g.waitFor('saveIfVersion');
  const p2 = store.rescanSummaries();     // joins, must not start a second pass
  const p3 = store.rescanSummaries();
  ok(p1 !== null && p2 !== null && p3 !== null, 'three calls returned');
  const edit = store.dispatch({ type: 'setTripMeta', patch: { title: 'typed under the rescan' } });
  g.close('saveIfVersion');
  g.releaseAll();
  await tick();
  g.releaseAll();
  await Promise.all([p1, p2, p3, edit]);
  await store.flush();

  const rows = await storage.listTrips();
  const bad = rows.filter((r) => (r.summaryVersion ?? 0) < core.SUMMARY_VERSION);
  ok(bad.length === 0, 'all three rows converged', bad.map((r) => r.id));
  const expect = { 't-at': ['AT'], 't-hr': ['HR'], 't-cz': ['CZ'] };
  for (const r of rows) ok(JSON.stringify(r.countryCodes) === JSON.stringify(expect[r.id]), `${r.id} owns its countries`, r.countryCodes);
  const stored = core.fromJSON((await storage.load('t-at')).doc);
  ok(stored.title === 'typed under the rescan', 'the edit made under the rescan survived to storage', stored.title);
  const row = rows.find((r) => r.id === 't-at');
  ok(row.title === 'typed under the rescan', 'and the row agrees with the document it is about', row.title);
  ok(store.getState().rescan.running === false, 'nothing is left running');
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}`);
process.exitCode = fails === 0 ? 0 : 1;
