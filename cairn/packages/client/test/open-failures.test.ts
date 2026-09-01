/**
 * `openFailures`, `noteOpenFailure` and `rowUnopenable` — ARCHITECTURE §2.9 **A-47**,
 * ROADMAP Phase 2 **I-8f**.
 *
 * A-46 gave the Trips list three facts about a stored `TripSummaryRow` and a predicate over
 * two of them. QA **R35-1** measured the cost: `rowDatesReadable` reads `startDate` and
 * `endDate`, and **three of A-45's five refusal sites have no counterpart on that record at
 * all** (`$.days[n].date`, `$.bookings[n].startsAt.date`, `$.bookings[n].endsAt.date`). On the
 * shipped Europe 2026 sample that is 16 day-date fields against 2 trip-date fields — roughly
 * 8:1 — so A-46's predicate covered an eighth of its target while reading as a guarantee.
 *
 * A-47's answer is **to stop proxying and start recording**: a fourth fact, F-D, *"we tried to
 * open this document and `fromJSON` threw"*, written at the point of failure and never
 * persisted. This file is that fact and the predicate over it:
 *
 *   Part 2  `openFailures` is written by `noteOpenFailure` and by nothing else; the original
 *           error is rethrown unchanged; the entry is cleared on a successful open and on
 *           delete; it survives every `...initialState()` transition; a fresh store has none.
 *   Part 3  `rowUnopenable(state, row)` is the union of F-B/F-C, F-A and F-D, computed once,
 *           and it opens nothing.
 *   Part 5  `exportStoredDoc(id)` refuses the **active** trip as a programmer error.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
  core, rowDatesReadable, rowUnopenable,
} from '../src/index.ts';
import type { Ports, StoragePort } from '../src/ports/types.ts';

const TODAY = '2026-08-01';

function ports(storage = memoryStorage(), file: ReturnType<typeof memoryFile> | undefined = memoryFile()) {
  return { storage, file, clock: fixedClockPort(TODAY), ids: sequentialIdPort(), scheduler: immediateScheduler() } as
    Ports & { storage: ReturnType<typeof memoryStorage>; file?: ReturnType<typeof memoryFile> };
}

const TRIP_INIT = {
  title: 'Europe 2026',
  startDate: '2026-08-07',
  endDate: '2026-08-10',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
};

/**
 * **Round 35's exact repro population**, and the one A-46 could not see: the summary row's own
 * two dates are perfectly readable, and the *document* carries `days[3].date: '2026-02-30'` —
 * a value `store.importDoc` accepted and wrote before A-45. Planted straight into storage,
 * because no shipped write path can mint one any more, which is the point.
 */
async function storeWithBadDayDate() {
  const p = ports();
  const store = createStore({ ports: p });
  const state = await store.createTrip(TRIP_INIT);
  const id = state.doc!.id;
  await store.flush();
  await store.closeTrip();
  const stored = await p.storage.load(id);
  assert.ok(stored, 'the trip was not stored');
  const parsed = JSON.parse(stored.doc) as { days: Array<{ date: string }> };
  assert.ok(parsed.days.length >= 4, 'the fixture no longer has a days[3] to corrupt');
  const healthy = stored.doc;
  parsed.days[3].date = '2026-02-30';
  const mangled = JSON.stringify(parsed);
  p.storage.docs.set(id, mangled);
  await store.refreshLibrary();
  const row = store.getState().library.find((r) => r.id === id)!;
  // The premise, asserted rather than assumed — this is what makes it round 35's population.
  assert.ok(row, 'the library row vanished, so this is not the population R35-1 measured');
  assert.equal(rowDatesReadable(row), true, 'the ROW is unreadable too, so A-46 would already have caught it');
  assert.throws(() => core.fromJSON(mangled), /calendar date/, 'the planted document still opens');
  return { p, store, id, row, mangled, healthy };
}

/** A document whose ROW dates are bad too — A-46's own, narrower population. */
async function storeWithBadRowDates() {
  const p = ports();
  const store = createStore({ ports: p });
  const state = await store.createTrip(TRIP_INIT);
  const id = state.doc!.id;
  await store.flush();
  await store.closeTrip();
  const stored = await p.storage.load(id);
  p.storage.docs.set(id, JSON.stringify({ ...JSON.parse(stored!.doc), startDate: '2026-02-30' }));
  await store.refreshLibrary();
  return { p, store, id };
}

// ---------------------------------------------------------------------------
// Part 2 — the fact is written where the failure is.
// ---------------------------------------------------------------------------

test('A-47 Part 2: a fresh store has no open failures', () => {
  const store = createStore({ ports: ports() });
  assert.deepEqual(store.getState().openFailures, []);
});

test('A-47 Part 2: openTrip records the failure and rethrows the ORIGINAL error unchanged', async () => {
  const { store, id } = await storeWithBadDayDate();

  let thrown: Error | null = null;
  await assert.rejects(() => store.openTrip(id), (e: Error) => { thrown = e; return true; });

  const err = thrown as unknown as Error;
  // `App.tsx`'s banner path and `Library.tsx`'s `openRow` catch are unmoved: same class, same
  // message, same JSON path. A wrapped error here is a user-visible regression.
  assert.equal(err.name, 'TripParseError', `the error class changed to ${err.name}`);
  assert.match(err.message, /calendar date/);
  assert.match(err.message, /\$\.days\[3\]\.date/);

  const after = store.getState();
  assert.deepEqual(after.openFailures.map((f) => f.id), [id]);
  assert.equal(after.openFailures[0].message, err.message, 'the recorded message is not the parser’s own');
  assert.equal(after.doc, null, 'a document that would not parse was installed anyway');
  assert.equal(after.activeTripId, null);
});

test('A-47 Part 2: the set happens BEFORE the rethrow — a subscriber sees the card change', async () => {
  const { store, id } = await storeWithBadDayDate();
  const seen: number[] = [];
  store.subscribe((s) => seen.push(s.openFailures.length));
  await store.openTrip(id).catch(() => {});
  assert.ok(seen.includes(1), `no subscriber ever saw the failure recorded: ${JSON.stringify(seen)}`);
});

test('A-47 Part 2: browseTrip records its own failure, and rethrows unchanged', async () => {
  const { store, id } = await storeWithBadDayDate();
  await assert.rejects(() => store.browseTrip(id), (e: Error) => {
    assert.equal(e.name, 'TripParseError');
    return true;
  });
  assert.deepEqual(store.getState().openFailures.map((f) => f.id), [id]);
  assert.equal(store.getState().browsing, null, 'an unparsed document was installed as the browse target');
});

test('A-47 Part 2: an ABSENT document is not recorded — that is R26-3’s `missing`, a different fact', async () => {
  const store = createStore({ ports: ports() });
  await assert.rejects(() => store.openTrip('t-nope'), /no trip t-nope in storage/);
  await assert.rejects(() => store.browseTrip('t-nope'), /no trip t-nope in storage/);
  assert.deepEqual(store.getState().openFailures, [], 'an absent document has no bytes to rescue');
});

test('A-47 Part 2: one entry per id — a second failed open does not accumulate', async () => {
  const { store, id } = await storeWithBadDayDate();
  await store.openTrip(id).catch(() => {});
  await store.openTrip(id).catch(() => {});
  await store.browseTrip(id).catch(() => {});
  assert.equal(store.getState().openFailures.length, 1);
});

test('A-47 Part 2: a successful openTrip of a repaired document clears the entry', async () => {
  const { p, store, id, healthy } = await storeWithBadDayDate();
  await store.openTrip(id).catch(() => {});
  assert.equal(store.getState().openFailures.length, 1);

  // Repaired underneath us — hand-edited, or restored over. R26-2's lesson: nothing has to
  // remember that it was broken.
  p.storage.docs.set(id, healthy);
  await store.openTrip(id);
  assert.deepEqual(store.getState().openFailures, []);
});

test('A-47 Part 2: a successful browseTrip clears the entry too', async () => {
  const { p, store, id, healthy } = await storeWithBadDayDate();
  await store.browseTrip(id).catch(() => {});
  assert.equal(store.getState().openFailures.length, 1);
  p.storage.docs.set(id, healthy);
  await store.browseTrip(id);
  assert.deepEqual(store.getState().openFailures, []);
});

test('A-47 Part 2: deleteTrip drops the entry — an observation about a record that is gone is not one', async () => {
  const { store, id } = await storeWithBadDayDate();
  await store.openTrip(id).catch(() => {});
  await store.deleteTrip(id);
  assert.deepEqual(store.getState().openFailures, []);
});

/**
 * **The carry test** (A-47 Part 2). `openFailures` is library-scoped exactly as `rescan` is, so
 * every `set({ ...initialState(), … })` site must carry it. There are six of them; a carry that
 * is missed is a fact silently lost on the next transition, and the card the user just tapped
 * goes back to looking healthy.
 */
test('A-47 Part 2: closeTrip PRESERVES the record — the six ...initialState() carry sites', async () => {
  const { store, id } = await storeWithBadDayDate();
  await store.openTrip(id).catch(() => {});
  await store.closeTrip();
  assert.deepEqual(store.getState().openFailures.map((f) => f.id), [id], 'closeTrip dropped it');
});

test('A-47 Part 2: createTrip, adoptTrip and importDoc all carry it across', async () => {
  const { store, id } = await storeWithBadDayDate();
  await store.openTrip(id).catch(() => {});

  await store.createTrip({ ...TRIP_INIT, title: 'Japan 2027' });
  assert.deepEqual(store.getState().openFailures.map((f) => f.id), [id], 'createTrip dropped it');

  const exported = await store.exportActive();
  await store.closeTrip();
  await store.importDoc(exported);
  assert.deepEqual(store.getState().openFailures.map((f) => f.id), [id], 'importDoc dropped it');

  await store.closeTrip();
  const fresh = core.createTrip({ ...TRIP_INIT, title: 'Peru 2028' }, {
    ids: { newId: (k: string) => `adopted-${k}` }, now: TODAY as core.IsoDate, actorUserId: core.LOCAL_OWNER,
  });
  await store.adoptTrip(fresh);
  assert.deepEqual(store.getState().openFailures.map((f) => f.id), [id], 'adoptTrip dropped it');

  // …and openTrip of a HEALTHY OTHER trip carries it too: the clear is per id, not a wipe.
  const other = store.getState().activeTripId!;
  await store.closeTrip();
  await store.openTrip(other);
  assert.deepEqual(store.getState().openFailures.map((f) => f.id), [id], 'openTrip cleared the wrong id');
});

/**
 * A-47 Part 2's load-bearing half: **not persisted, not exported, not in `history`**. A durable
 * *"this failed to parse once"* is a reader's inference written into the record (§0.6) and goes
 * stale the moment the document is repaired — word for word the R26-2 defect.
 */
test('A-47 Part 2: the fact dies with the session — nothing is written, nothing is exported', async () => {
  const { p, store, id, mangled } = await storeWithBadDayDate();
  const savesBefore = p.storage.saveCount;
  await store.openTrip(id).catch(() => {});
  assert.equal(p.storage.saveCount, savesBefore, 'recording a parse failure wrote to storage');
  assert.equal(p.storage.docs.get(id), mangled, 'recording a parse failure rewrote the document');

  const row = (await p.storage.listTrips()).find((r) => r.id === id)!;
  assert.equal(JSON.stringify(row).includes('openFailure'), false, 'the summary row grew a flag');

  // A second store over the same storage starts clean: the fact is session-scoped, which is
  // A-47 Part 8 residue 1's stated floor rather than a defect.
  const second = createStore({ ports: p });
  await second.refreshLibrary();
  assert.deepEqual(second.getState().openFailures, []);
});

test('A-47 Part 2: it is not in history — undo/redo cannot restore or erase it', async () => {
  const { store, id } = await storeWithBadDayDate();
  await store.openTrip(id).catch(() => {});
  await store.createTrip({ ...TRIP_INIT, title: 'Japan 2027' });
  await store.dispatch({ type: 'setTripMeta', patch: { title: 'Japan 2027 (renamed)' } });
  store.undo();
  assert.deepEqual(store.getState().openFailures.map((f) => f.id), [id]);
  store.redo();
  assert.deepEqual(store.getState().openFailures.map((f) => f.id), [id]);
});

// ---------------------------------------------------------------------------
// Part 3 — one shared predicate, over the union of three facts.
// ---------------------------------------------------------------------------

const EMPTY = { rescan: { running: false, unreadable: [] }, openFailures: [] };
const ROW = { id: 't-1', startDate: '2026-08-07', endDate: '2026-08-22' };

test('A-47 Part 3: nothing known — the predicate is false, and it never means "it will open"', () => {
  assert.equal(rowUnopenable(EMPTY, ROW), false);
});

test('A-47 Part 3: F-B/F-C — the row’s own dates are not IsoDates', () => {
  for (const bad of ['2026-02-30', '2026-13-01', '0000-00-00', 'not-a-date', '']) {
    assert.equal(rowUnopenable(EMPTY, { ...ROW, startDate: bad }), true, `startDate ${bad}`);
    assert.equal(rowUnopenable(EMPTY, { ...ROW, endDate: bad }), true, `endDate ${bad}`);
  }
});

test('A-47 Part 3: F-A — a rescan opened it and fromJSON threw', () => {
  const state = { ...EMPTY, rescan: { running: false, unreadable: [{ id: 't-1', message: 'bad' }] } };
  assert.equal(rowUnopenable(state, ROW), true);
  assert.equal(rowUnopenable(state, { ...ROW, id: 't-2' }), false, 'the flag leaked to another row');
});

test('A-47 Part 3: F-D — a real open attempt in this session failed', () => {
  const state = { ...EMPTY, openFailures: [{ id: 't-1', message: 'bad' }] };
  assert.equal(rowUnopenable(state, ROW), true);
  assert.equal(rowUnopenable(state, { ...ROW, id: 't-2' }), false, 'the flag leaked to another row');
});

/**
 * **A-47 Part 4's boundary, driven directly rather than as a union.** The two predicates are
 * not the same question and they must come apart in *both* directions:
 *
 *   - a good row over a bad document  → unopenable, dates readable  (round 35's population;
 *     the chip/rescue/Delete-warning fire, and the meta line keeps its proper label);
 *   - a bad row                        → unopenable, dates unreadable (A-46's population; the
 *     meta line prints the two stored strings verbatim — R34-4 stays discharged).
 */
test('A-47 Part 4: the two predicates come apart — a good row over an unopenable document', () => {
  const state = { ...EMPTY, openFailures: [{ id: 't-1', message: 'at $.days[3].date' }] };
  assert.equal(rowUnopenable(state, ROW), true, 'the wide predicate missed round 35’s population');
  assert.equal(rowDatesReadable(ROW), true, 'the narrow predicate widened — R34-4’s label would regress');
});

test('A-47 Part 4: …and a bad row is caught by BOTH, so the meta line still prints it verbatim', () => {
  const bad = { ...ROW, startDate: '2026-02-30', endDate: '2026-03-05' };
  assert.equal(rowUnopenable(EMPTY, bad), true);
  assert.equal(rowDatesReadable(bad), false);
});

test('A-47 Part 3: pure, total and never throws over hostile row shapes', () => {
  const hostile: unknown[] = [undefined, null, 42, {}, [], { toString: () => '2026-08-07' }, '2026-08-07\n', ' 2026-08-07'];
  for (const v of hostile) {
    const row = { id: 't-1', startDate: v, endDate: v } as unknown as typeof ROW;
    assert.equal(rowUnopenable(EMPTY, row), true, `${String(v)} was treated as openable`);
  }
});

/**
 * A-47 Part 2's *"nothing here opens a document that was not going to be opened anyway"*, and
 * §8.4 clause 3's prohibition on loading forty documents to render a list. The predicate is a
 * pure function of state — asking it about N rows performs **0** `load()` calls.
 */
test('A-47 Part 3: the predicate opens nothing — 0 load() calls for a whole library', async () => {
  const p = ports();
  let loads = 0;
  const counting: StoragePort = { ...p.storage, async load(id: string) { loads++; return p.storage.load(id); } };
  const store = createStore({ ports: { ...p, storage: counting } });
  for (const title of ['A', 'B', 'C']) {
    await store.createTrip({ ...TRIP_INIT, title });
    await store.flush();
  }
  await store.closeTrip();
  await store.refreshLibrary();
  const state = store.getState();
  assert.equal(state.library.length, 3, 'the library did not build');

  loads = 0;
  for (const row of state.library) rowUnopenable(state, row);
  assert.equal(loads, 0, 'rendering the flag opened documents');
});

// ---------------------------------------------------------------------------
// Part 5 — the precondition on `exportStoredDoc`.
// ---------------------------------------------------------------------------

test('A-47 Part 5: exportStoredDoc refuses the ACTIVE trip and names exportActive()', async () => {
  const p = ports();
  const store = createStore({ ports: p });
  const state = await store.createTrip(TRIP_INIT);
  const id = state.doc!.id;
  await store.flush();

  await assert.rejects(() => store.exportStoredDoc(id), (e: Error) => {
    assert.match(e.message, /exportStoredDoc/);
    assert.match(e.message, /active trip/);
    assert.match(e.message, /exportActive\(\)/, 'the refusal does not say what to use instead');
    assert.ok(e.message.includes(JSON.stringify(id)), `the refusal does not name the id: ${e.message}`);
    return true;
  });
  assert.equal(p.file!.exported.length, 0, 'the refused export still handed bytes to the FilePort');
});

test('A-47 Part 5: the refusal is the ONLY thing added — a non-active trip still exports', async () => {
  const { p, store, id } = await storeWithBadRowDates();
  // Nothing open at all.
  assert.equal(store.getState().activeTripId, null);
  assert.equal(await store.exportStoredDoc(id), p.storage.docs.get(id));

  // …and with some OTHER trip open, which is the shape `Library.tsx` can never reach today but
  // a Phase-2 surface could.
  await store.createTrip({ ...TRIP_INIT, title: 'Japan 2027' });
  assert.equal(await store.exportStoredDoc(id), p.storage.docs.get(id));
});

test('A-47 Part 5: the precondition is checked before storage is touched', async () => {
  const p = ports();
  let loads = 0;
  const counting: StoragePort = { ...p.storage, async load(id: string) { loads++; return p.storage.load(id); } };
  const store = createStore({ ports: { ...p, storage: counting } });
  const state = await store.createTrip(TRIP_INIT);
  await store.flush();
  loads = 0;
  await store.exportStoredDoc(state.doc!.id).catch(() => {});
  assert.equal(loads, 0, 'the refused export still read storage');
});
