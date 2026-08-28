/**
 * The `SUMMARY_VERSION` rescan — ARCHITECTURE §8.4 clause 3, ROADMAP Phase 2 **I-6**.
 *
 * A summary row is a **copy**, so §0.6 governs it: *a fact about a resource is only valid at
 * the moment, and in the place, the resource itself stated it.* A row minted by an older
 * build carries an older answer forever unless something goes back to the document and asks
 * again. That something is this: every stored row below `core.SUMMARY_VERSION` is reloaded,
 * recomputed **from its own document**, and rewritten through the store's ordinary chained
 * write — and nothing claims the library is complete while that is still running.
 *
 * **How "bump `SUMMARY_VERSION`" is expressed here.** The constant is compile-time, so a test
 * cannot raise it. It does not need to: the only thing any reader can observe is *a stored
 * row whose version is below the constant*, and that is reached identically by lowering the
 * row. Every test below writes rows the way a pre-I-6 build wrote them — with no
 * `summaryVersion` field at all — or stamps an explicitly lower number, which is the same
 * observation from the other side.
 *
 * The ceiling this file exists to hold: **a row is never computed from another row, from
 * `AppState`, or from a document it is not about.** Every trip here is given a city in a
 * different country precisely so cross-contamination would be visible rather than plausible.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, RESCAN_MAX_PASSES, summaryScan,
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
  core,
} from '../src/index.ts';
import type { MemoryStorage, Ports, StorageVersion, TripDoc } from '../src/index.ts';

type TripSummaryRow = core.TripSummaryRow;

const TODAY = '2026-08-01';
let seq = 0;

function ports(storage: MemoryStorage): Ports {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(`r${++seq}-`),
    scheduler: immediateScheduler(),
  };
}

/** Three cities in three different countries, so a mixed-up row is visible, not plausible. */
const PLACES = {
  vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
  dubrovnik: { key: 'dubrovnik', name: 'Dubrovnik', countryCode: 'HR', centre: { lat: 42.6507, lng: 18.0944 } },
  prague: { key: 'prague', name: 'Prague', countryCode: 'CZ', centre: { lat: 50.0755, lng: 14.4378 } },
};

function makeTrip(id: string, city: keyof typeof PLACES): core.Trip {
  return core.createTrip(
    {
      id,
      title: `Trip ${id}`,
      startDate: '2026-08-07',
      endDate: '2026-08-09',
      homeCurrency: 'EUR',
      cities: [PLACES[city]],
    },
    { ids: core.sequentialIds(`${id}-`), now: TODAY, actorUserId: core.LOCAL_OWNER },
  );
}

/**
 * The row exactly as a build older than I-6 wrote it — **no `summaryVersion` field at all.**
 * That absence is the realistic starting state for every row a user already has, and it must
 * read as *below* the current version rather than as "unknown, leave it alone".
 */
function preI6Row(doc: core.Trip): TripSummaryRow {
  return {
    id: doc.id,
    title: doc.title,
    startDate: doc.startDate,
    endDate: doc.endDate,
    datePrecision: doc.datePrecision,
    cityCount: doc.cities.length,
    dayCount: doc.days.length,
    stopCount: 0,
    poolCount: 0,
    revision: doc.revision,
  } as unknown as TripSummaryRow;
}

/** Puts a document into storage under a row minted by `row`, bypassing the store entirely. */
async function seed(
  storage: MemoryStorage,
  doc: core.Trip,
  row: TripSummaryRow = preI6Row(doc),
  body: TripDoc = core.toJSON(doc),
): Promise<void> {
  const outcome = await storage.saveIfVersion(doc.id, null, body, row);
  assert.equal(outcome.ok, true, `seeding ${doc.id} failed`);
}

const rowFor = (s: { library: TripSummaryRow[] }, id: string) =>
  s.library.find((r) => r.id === id) as TripSummaryRow;

// ---------------------------------------------------------------------------
// Exit criterion 7, part 1 — write three trips, bump the version, reopen.
// ---------------------------------------------------------------------------

test('I-6: every row below SUMMARY_VERSION is recomputed FROM ITS OWN DOCUMENT', async () => {
  const storage = memoryStorage();
  const docs = [makeTrip('t-at', 'vienna'), makeTrip('t-hr', 'dubrovnik'), makeTrip('t-cz', 'prague')];
  for (const d of docs) await seed(storage, d);

  // Precondition — the criterion is worthless if the rows started correct.
  for (const r of await storage.listTrips()) {
    assert.equal((r as { summaryVersion?: number }).summaryVersion, undefined);
    assert.equal((r as { countryCodes?: string[] }).countryCodes, undefined);
  }

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();

  const state = store.getState();
  assert.equal(state.library.length, 3);
  for (const d of docs) {
    const row = rowFor(state, d.id);
    const expected = core.tripSummary(d, core.COUNTRY_INDEX);
    assert.equal(row.summaryVersion, core.SUMMARY_VERSION);
    assert.deepEqual(row.countryCodes, expected.countryCodes, `${d.id} carries another trip's countries`);
    assert.deepEqual(row.cities, expected.cities);
    assert.equal(row.title, d.title);
  }
  // The three answers are genuinely different, so "recomputed from its own document" is a
  // claim this assertion could have caught being false.
  assert.deepEqual(rowFor(state, 't-at').countryCodes, ['AT']);
  assert.deepEqual(rowFor(state, 't-hr').countryCodes, ['HR']);
  assert.deepEqual(rowFor(state, 't-cz').countryCodes, ['CZ']);

  // …and storage holds the rewritten rows, not just the in-memory library.
  const stored = await storage.listTrips();
  assert.deepEqual(
    stored.map((r) => [r.id, r.countryCodes]).sort(),
    [['t-at', ['AT']], ['t-cz', ['CZ']], ['t-hr', ['HR']]],
  );
});

test('I-6 ceiling: a row is not computed from AppState — no document is ever active', async () => {
  const storage = memoryStorage();
  const docs = [makeTrip('a-at', 'vienna'), makeTrip('a-hr', 'dubrovnik')];
  for (const d of docs) await seed(storage, d);

  const store = createStore({ ports: ports(storage) });
  const seen: Array<core.Trip | null> = [];
  store.subscribe((s) => seen.push(s.doc));
  await store.refreshLibrary();
  await store.rescanSummaries();

  assert.ok(seen.length > 0, 'INCONCLUSIVE: the rescan emitted nothing');
  assert.deepEqual([...new Set(seen)], [null], 'the rescan installed a document as the active one');
  assert.equal(store.getState().doc, null);
  assert.equal(store.getState().browsing, null);
  assert.deepEqual(rowFor(store.getState(), 'a-at').countryCodes, ['AT']);
  assert.deepEqual(rowFor(store.getState(), 'a-hr').countryCodes, ['HR']);
});

test('I-6: the rescan rewrites through the ordinary write path — one write per stale row', async () => {
  const storage = memoryStorage();
  const docs = [makeTrip('w-at', 'vienna'), makeTrip('w-hr', 'dubrovnik'), makeTrip('w-cz', 'prague')];
  for (const d of docs) await seed(storage, d);
  // One row is already current: it must not be rewritten at all.
  await seed(storage, makeTrip('w-ok', 'vienna'), core.tripSummary(makeTrip('w-ok', 'vienna'), core.COUNTRY_INDEX));

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const before = storage.saveCount;
  await store.rescanSummaries();
  assert.equal(storage.saveCount - before, 3, 'the rescan wrote a row that was already current');

  // A second rescan finds nothing to do — the pass is idempotent, not a rewrite loop.
  const after = storage.saveCount;
  await store.rescanSummaries();
  assert.equal(storage.saveCount, after);
});

// ---------------------------------------------------------------------------
// Exit criterion 7, part 3 — the map does not claim completeness while it runs.
// ---------------------------------------------------------------------------

test('I-6: nothing claims completeness while a rescan is in flight', async () => {
  const storage = memoryStorage();
  for (const d of [makeTrip('p-at', 'vienna'), makeTrip('p-hr', 'dubrovnik')]) await seed(storage, d);

  const store = createStore({ ports: ports(storage) });
  const phases: string[] = [];
  store.subscribe((s) => phases.push(summaryScan(s).phase));

  await store.refreshLibrary();
  // Reading the library is not rescanning it: the rows are honestly out of date, and the
  // one thing that may never happen is a frame that reads "complete".
  assert.equal(phases[0], 'stale', `first emission was ${phases[0]}`);
  assert.equal(summaryScan(store.getState()).phase, 'stale');

  await store.rescanSummaries();

  assert.ok(phases.length >= 3, 'INCONCLUSIVE: too few emissions to observe the transition');
  assert.equal(phases[phases.length - 1], 'complete');
  assert.equal(
    phases.slice(0, -1).includes('complete'),
    false,
    `the library claimed completeness mid-rescan: ${phases.join(' → ')}`,
  );
  assert.ok(phases.slice(0, -1).includes('recomputing'), 'nothing ever said "recomputing"');
});

test('I-6: a library that was never rescanned reads "stale", never "complete"', async () => {
  const storage = memoryStorage();
  await seed(storage, makeTrip('s-at', 'vienna'));
  const rows = await storage.listTrips();
  // The selector's answer is derived from the ROWS, never from "a pass finished" — so a
  // library nobody has rescanned is honestly out of date rather than quietly complete.
  const scan = summaryScan({ library: rows, rescan: { running: false, unreadable: [] } });
  assert.equal(scan.phase, 'stale');
  assert.deepEqual(scan.outdated, ['s-at']);
});

// ---------------------------------------------------------------------------
// Exit criterion 7 — the active trip's write fence is not collateral damage.
// ---------------------------------------------------------------------------

test('I-6: rescanning while a trip is open never moves that trip\'s write fence behind it', async () => {
  const storage = memoryStorage();
  const open = makeTrip('f-open', 'vienna');
  await seed(storage, open);
  await seed(storage, makeTrip('f-other', 'dubrovnik'));

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.openTrip('f-open');
  await store.rescanSummaries();

  // The open trip's OWN row is brought up to date like any other — being open is not an
  // exemption, it only changes which write path carries it.
  const scan = summaryScan(store.getState());
  assert.equal(scan.phase, 'complete', `the open trip's row was left behind: ${scan.outdated.join(', ')}`);
  assert.equal(rowFor(store.getState(), 'f-open').summaryVersion, core.SUMMARY_VERSION);
  assert.deepEqual(rowFor(store.getState(), 'f-open').countryCodes, ['AT']);

  assert.equal(store.getState().persistence.status, 'idle', 'the rescan conflicted with the open trip');
  assert.equal(
    store.getState().persistence.savedVersion,
    storage.versions.get('f-open'),
    'the fence and storage disagree — the next autosave would be refused',
  );
  // …and the very next edit still saves cleanly, which is the property the fence exists for.
  store.dispatch({ type: 'setTripMeta', patch: { title: 'Renamed' } });
  await store.flush();
  assert.equal(store.getState().persistence.status, 'idle');
  assert.equal(rowFor(store.getState(), 'f-open').title, 'Renamed');
  assert.deepEqual(rowFor(store.getState(), 'f-open').countryCodes, ['AT']);
  assert.deepEqual(rowFor(store.getState(), 'f-other').countryCodes, ['HR']);
});

// ---------------------------------------------------------------------------
// Attack 1 — `SUMMARY_VERSION` bumped mid-rescan, with a write in flight.
// ---------------------------------------------------------------------------

/**
 * A storage port that lets the test stand inside one `saveIfVersion` call.
 *
 * `gate` resolves when the Nth write has been entered but not yet performed, and `release`
 * lets it proceed — which is the only way to be genuinely *mid-rescan with a write in
 * flight* rather than merely between two of them.
 */
function pausableStorage(inner: MemoryStorage, pauseOnWrite: number) {
  let writes = 0;
  let releaseFn: () => void = () => {};
  let enteredFn: () => void = () => {};
  const released = new Promise<void>((r) => { releaseFn = r; });
  const entered = new Promise<void>((r) => { enteredFn = r; });
  const port: MemoryStorage = {
    ...inner,
    async listTrips() { return inner.listTrips(); },
    async load(id) { return inner.load(id); },
    async saveIfVersion(id, expected, doc, summary) {
      if (++writes === pauseOnWrite) {
        enteredFn();
        await released;
      }
      return inner.saveIfVersion(id, expected, doc, summary);
    },
    async delete(id) { return inner.delete(id); },
  };
  return { port, entered, release: () => releaseFn() };
}

test('ATTACK 1: SUMMARY_VERSION moves again mid-rescan, with a write in flight', async () => {
  // Three stale rows. The rescan is stopped inside its SECOND write; while it is held there,
  // another writer stores a row for a trip the rescan has ALREADY finished, at a version
  // below the constant — which is exactly what a further bump looks like from the only side
  // any reader can see it from. The defined answer is:
  //
  //   1. the held write still lands, against the expectation it was issued with;
  //   2. the pass does NOT report completeness merely because it reached its own end — it
  //      re-reads the library from storage and re-derives what is still below the version
  //      (§0.6: completeness is a fact about the rows, not about "a pass finished");
  //   3. the newly-stale row is picked up by a further pass and ends correct;
  //   4. and at no point does anything read "complete".
  const inner = memoryStorage();
  const docs = [makeTrip('m-at', 'vienna'), makeTrip('m-hr', 'dubrovnik'), makeTrip('m-cz', 'prague')];
  for (const d of docs) await seed(inner, d);
  const { port, entered, release } = pausableStorage(inner, 2);

  const store = createStore({ ports: ports(port as MemoryStorage) });
  const phases: string[] = [];
  store.subscribe((s) => phases.push(summaryScan(s).phase));
  await store.refreshLibrary();
  const run = store.rescanSummaries();

  await entered;
  // The rescan is parked inside a write. Which row has already landed is an implementation
  // detail; what matters is that one that HAS landed is knocked back below the version.
  const landed = (await inner.listTrips()).find((r) => r.summaryVersion === core.SUMMARY_VERSION);
  assert.ok(landed, 'INCONCLUSIVE: nothing had landed, so nothing could be knocked back');
  const stale = { ...landed } as Record<string, unknown>;
  delete stale.countryCodes;
  delete stale.cities;
  stale.summaryVersion = core.SUMMARY_VERSION - 1;
  inner.summaries.set(landed.id, stale as unknown as TripSummaryRow);
  assert.equal(summaryScan(store.getState()).phase, 'recomputing');

  release();
  await run;

  const state = store.getState();
  assert.equal(summaryScan(state).phase, 'complete', 'the second bump was never picked up');
  assert.equal(
    phases.slice(0, -1).includes('complete'),
    false,
    `completeness was claimed mid-rescan: ${phases.join(' → ')}`,
  );
  for (const d of docs) {
    const row = rowFor(state, d.id);
    assert.equal(row.summaryVersion, core.SUMMARY_VERSION, `${d.id} was left below the version`);
    assert.deepEqual(row.countryCodes, core.tripSummary(d, core.COUNTRY_INDEX).countryCodes);
  }
  // The re-read is bounded, not a spin: it converges well inside the bound.
  assert.ok(RESCAN_MAX_PASSES >= 2, 'the bound cannot express a second pass at all');
});

test('ATTACK 1b: a row another writer moves under the rescan is left alone, not clobbered', async () => {
  // The rescan's write is a compare-and-set against the version it read, exactly like every
  // other write in this store. If someone else has written since, the port refuses, the
  // rescan does NOT retry over them, and their row — which their own write computed at the
  // current version — stands.
  const inner = memoryStorage();
  const doc = makeTrip('x-at', 'vienna');
  await seed(inner, doc);
  await seed(inner, makeTrip('x-hr', 'dubrovnik'));
  const { port, entered, release } = pausableStorage(inner, 1);

  const store = createStore({ ports: ports(port as MemoryStorage) });
  await store.refreshLibrary();
  const run = store.rescanSummaries();
  await entered;
  // Another tab writes both records while our first write is parked mid-flight.
  for (const id of ['x-at', 'x-hr']) {
    const held = inner.versions.get(id) as StorageVersion;
    const d = core.fromJSON((await inner.load(id))!.doc);
    const moved = { ...d, title: 'From the other tab' };
    const out = await inner.saveIfVersion(id, held, core.toJSON(moved), core.tripSummary(moved, core.COUNTRY_INDEX));
    assert.equal(out.ok, true);
  }
  release();
  await run;

  // Nothing crashed, nothing was overwritten, and the library reflects storage.
  for (const id of ['x-at', 'x-hr']) {
    assert.equal((await inner.load(id))!.doc.includes('From the other tab'), true, `${id} was clobbered`);
    assert.equal((inner.summaries.get(id) as TripSummaryRow).summaryVersion, core.SUMMARY_VERSION);
  }
  assert.equal(summaryScan(store.getState()).phase, 'complete');
  assert.equal(rowFor(store.getState(), 'x-at').title, 'From the other tab');
});

// ---------------------------------------------------------------------------
// Attack 2 — 40 summaries, one unreadable document.
// ---------------------------------------------------------------------------

test('ATTACK 2: 40 rows, one corrupt document — 39 recompute, the corrupt one is REPORTED', async () => {
  const storage = memoryStorage();
  const cities = ['vienna', 'dubrovnik', 'prague'] as const;
  const docs: core.Trip[] = [];
  for (let i = 0; i < 40; i++) {
    const d = makeTrip(`big-${String(i).padStart(2, '0')}`, cities[i % 3]);
    docs.push(d);
    // Row 17's *document* is truncated JSON — the row itself is perfectly well-formed, which
    // is what makes this the interesting case: nothing is wrong until something opens it.
    await seed(storage, d, preI6Row(d), i === 17 ? core.toJSON(d).slice(0, 120) : core.toJSON(d));
  }

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();          // must not throw

  const state = store.getState();
  assert.equal(state.library.length, 40, 'the corrupt trip was dropped from the library');
  const corrupt = docs[17].id;
  for (const d of docs) {
    const row = rowFor(state, d.id);
    assert.ok(row, `${d.id} vanished`);
    if (d.id === corrupt) continue;
    assert.equal(row.summaryVersion, core.SUMMARY_VERSION, `${d.id} was not recomputed`);
    assert.deepEqual(row.countryCodes, core.tripSummary(d, core.COUNTRY_INDEX).countryCodes);
  }

  // The corrupt one is REPORTED — not silently dropped, and not silently left looking fine.
  const scan = summaryScan(state);
  assert.equal(scan.unreadable.length, 1);
  assert.equal(scan.unreadable[0].id, corrupt);
  assert.ok(scan.unreadable[0].message.length > 0, 'no reason was given for the unreadable row');
  assert.deepEqual(scan.outdated, [corrupt]);
  assert.equal(scan.phase, 'stale', 'a library with an unreadable document must not read "complete"');
  assert.equal(scan.current, 39);
  assert.equal(scan.total, 40);
  // Its row is still the one storage holds, untouched — nothing guessed a replacement.
  assert.equal(rowFor(state, corrupt).summaryVersion, undefined);
});

test('ATTACK 2b: an unreadable document is retried on the next rescan, not blacklisted forever', async () => {
  const storage = memoryStorage();
  const doc = makeTrip('heal-at', 'vienna');
  await seed(storage, doc, preI6Row(doc), '{ "not": "a trip"');

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await store.rescanSummaries();
  assert.equal(summaryScan(store.getState()).unreadable.length, 1);

  // Another writer repairs the record. The next rescan re-reads it and the report clears —
  // the unreadable list is an observation about the last pass, never a stored verdict.
  const held = storage.versions.get('heal-at') as StorageVersion;
  const out = await storage.saveIfVersion('heal-at', held, core.toJSON(doc), preI6Row(doc));
  assert.equal(out.ok, true);
  await store.refreshLibrary();
  await store.rescanSummaries();

  const scan = summaryScan(store.getState());
  assert.deepEqual(scan.unreadable, []);
  assert.equal(scan.phase, 'complete');
  assert.deepEqual(rowFor(store.getState(), 'heal-at').countryCodes, ['AT']);
});

test('I-6: a trip deleted under the rescan is not resurrected and does not throw', async () => {
  const storage = memoryStorage();
  const doc = makeTrip('gone-at', 'vienna');
  await seed(storage, doc);
  await seed(storage, makeTrip('stay-hr', 'dubrovnik'));

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  await storage.delete('gone-at');        // vanishes between listTrips and the rescan's load
  await store.rescanSummaries();

  assert.equal((await storage.load('gone-at')), null, 'the rescan resurrected a deleted trip');
  assert.equal((await storage.listTrips()).some((r) => r.id === 'gone-at'), false);
  assert.deepEqual(rowFor(store.getState(), 'stay-hr').countryCodes, ['HR']);
  assert.equal(store.getState().library.some((r) => r.id === 'gone-at'), false);
});

test('I-6: concurrent rescan calls join one pass — the store never runs two at once', async () => {
  const storage = memoryStorage();
  for (const d of [makeTrip('j-at', 'vienna'), makeTrip('j-hr', 'dubrovnik')]) await seed(storage, d);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();

  const before = storage.saveCount;
  await Promise.all([store.rescanSummaries(), store.rescanSummaries(), store.rescanSummaries()]);
  assert.equal(storage.saveCount - before, 2, 'three calls wrote each row more than once');
  assert.equal(summaryScan(store.getState()).phase, 'complete');
});
