/**
 * The store's **generation guard** — ARCHITECTURE §4.2 rule **6d** and **A-67**, ROADMAP
 * **I-13d**.
 *
 * A-67 Part 10's **G1…G9**, each with its fault injected rather than described. G1–G7 are
 * behavioural; G8 and G9 are the A-64 **S5**-shaped *"still true"* greps that make a refusal
 * checkable rather than merely written.
 *
 * Every one of these runs in plain Node against the in-memory ports — `cairn-constraints` §5.
 * The only injections are **parking**: a `derive` that has not finished yet (§10.4 makes it
 * seconds of canvas work per file by design), a `present` that has not answered yet, and a
 * `storage.load` that has not returned yet. No fault, no failing port, except where a test says
 * so.
 */
import { settlingTest as test, watch } from './settled-invariant.ts';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  createStore, memoryStorage, memoryFile, memoryPhotos,
  fixedClockPort, sequentialIdPort, photosFor, photoImport, photoByteKey, core,
} from '../src/index.ts';
import type { MemoryPhotos, MemoryStorage, Ports, StoredDoc } from '../src/index.ts';
import { createGenerationGuard } from '../src/store/generation.ts';
import { TRANSITION_IN_PROGRESS_MESSAGE, TRANSITION_SUPERSEDED_MESSAGE } from '../src/store/store.ts';

const TODAY = '2026-08-01';
const TRIP = {
  title: 'A',
  startDate: '2026-08-07',
  endDate: '2026-08-09',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
};

const tick = () => new Promise((r) => setTimeout(r, 0));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const taggedBytes = (name: string, n = 64) => {
  const out = new Uint8Array(n);
  for (let i = 0; i < name.length && i < n; i++) out[i] = name.charCodeAt(i) & 0x7f;
  return out;
};
const file = (name: string, type = 'image/jpeg') => ({ name, type, bytes: taggedBytes(name) });

// ---------------------------------------------------------------------------------------------
// The doubles. All three park; none of them fails unless a test asks.
// ---------------------------------------------------------------------------------------------

type GatedPhotos = MemoryPhotos & {
  /** Parked `derive` calls, in order. `release(n)` lets the next `n` finish. */
  gates: (() => Promise<void>)[];
  release(n?: number): Promise<void>;
  /** Parked `present` calls, in order. Each can be resolved or rejected independently. */
  presentGates: { run(): Promise<void>; fail(e: unknown): void }[];
  slowPresent: boolean;
};

function gatedPhotos(): GatedPhotos {
  const port = memoryPhotos() as GatedPhotos;
  const baseDerive = port.derive.bind(port);
  port.gates = [];
  port.derive = (b, t) => new Promise((res) => {
    port.gates.push(async () => { res(await baseDerive(b, t)); });
  });
  port.release = async (n = 1) => {
    for (let i = 0; i < n; i++) {
      const g = port.gates.shift();
      if (g) await g();
      await tick();
    }
  };
  const basePresent = port.present.bind(port);
  port.presentGates = [];
  port.slowPresent = false;
  port.present = (t, ids) => (port.slowPresent
    ? new Promise((res, rej) => {
      port.presentGates.push({ run: async () => { res(await basePresent(t, ids)); }, fail: (e) => rej(e) });
    })
    : basePresent(t, ids));
  return port;
}

type GatedStorage = MemoryStorage & {
  /** Set while `slowLoad`; call it to let the parked `load` return. */
  loadGate: (() => Promise<void>) | null;
  slowLoad: boolean;
  /** Per-id latency, for the two-opens-out-of-order case. */
  lag: Record<string, number>;
};

function gatedStorage(): GatedStorage {
  const s = memoryStorage() as GatedStorage;
  const base = s.load.bind(s);
  s.loadGate = null;
  s.slowLoad = false;
  s.lag = {};
  s.load = (id: string): Promise<StoredDoc | null> => {
    if (s.slowLoad) return new Promise((res) => { s.loadGate = async () => { res(await base(id)); }; });
    const ms = s.lag[id] ?? 0;
    return ms > 0 ? sleep(ms).then(() => base(id)) : base(id);
  };
  return s;
}

/**
 * `scheduler` is left OUT, so the store uses its own `defaultScheduler` —
 * `setTimeout(fn, debounceMs)`, which is exactly what `apps/web` runs on
 * (`apps/web/src/store.ts` passes no scheduler port). G1 and G2 depend on the debounce being
 * real: under `immediateScheduler` the window R47-1 measured is invisible, which is why the
 * shipped tests did not see it.
 */
function mk(prefix = '', shared: { storage?: GatedStorage; photo?: GatedPhotos; debounceMs?: number } = {}) {
  const p = {
    storage: shared.storage ?? gatedStorage(),
    file: memoryFile(),
    photo: shared.photo ?? gatedPhotos(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(prefix),
  } as Ports & { photo: GatedPhotos; storage: GatedStorage };
  const store = watch(createStore({ ports: p, ...(shared.debounceMs !== undefined ? { debounceMs: shared.debounceMs } : {}) }), p.photo);
  return { p, store };
}

const storedDoc = async (p: { storage: GatedStorage }, id: string) => {
  const rec = await p.storage.load(id);
  return rec === null ? null : core.fromJSON(rec.doc);
};

// ---------------------------------------------------------------------------------------------
// The module itself — A-67 Part 3's four claims, each asserted rather than described.
// ---------------------------------------------------------------------------------------------

test('A-67 Part 3 item 1: `current` does not consult `busy`, so a claimer can check its own ticket', () => {
  const g = createGenerationGuard();
  const t = g.claim('doc');
  // The claimer's window is open at the moment it checks its own ticket. Adding `busy === 0` to
  // `current` would break the claimer's own write — which is the whole install this exists for.
  assert.equal(g.current('doc', t), true, 'a claimer cannot see its own ticket while its window is open');
  g.release('doc');
  assert.equal(g.current('doc', t), true, 'releasing a claim must not invalidate the claim\'s own ticket');
});

test('A-67 Part 3: a later claim invalidates every earlier ticket, settled or not', () => {
  const g = createGenerationGuard();
  const first = g.claim('doc');
  const second = g.claim('doc');
  assert.equal(g.current('doc', first), false, 'an older transition can still install');
  assert.equal(g.current('doc', second), true);
  g.release('doc');
  g.release('doc');
  assert.equal(g.current('doc', first), false);
});

test('A-67 Part 3 item 2: `observe` is `null` inside somebody else\'s window, and `current(_, null)` is false', () => {
  const g = createGenerationGuard();
  assert.equal(g.observe('doc'), 0, 'an untouched slot observes as its own sequence');
  const t = g.claim('doc');
  assert.equal(g.observe('doc'), null, 'a ticket taken inside an open claim would survive that claim\'s install');
  assert.equal(g.current('doc', null), false, '`null` must not read as current');
  g.release('doc');
  const after = g.observe('doc');
  assert.equal(after, t, 'once the window closes, an observation is the claim\'s own generation');
  assert.equal(g.current('doc', after), true);
});

test('A-67 Part 3: `supersede` invalidates synchronously, with no window of its own', () => {
  const g = createGenerationGuard();
  const seen = g.observe('photoAvailability');
  g.supersede('photoAvailability');
  assert.equal(g.current('photoAvailability', seen), false);
  // And it opens nothing: an observation immediately after is valid.
  const next = g.observe('photoAvailability');
  assert.notEqual(next, null);
  assert.equal(g.current('photoAvailability', next), true);
});

test('A-67 Part 3: the three slots are independent, and two guards never share a sequence', () => {
  const g = createGenerationGuard();
  const d = g.observe('doc');
  g.claim('browsing');
  g.claim('photoAvailability');
  assert.equal(g.current('doc', d), true, 'a browse or an availability read invalidated a document observation');

  // Two stores over one `memoryStorage` is this project's standard two-tab fixture — A-67 Part 3
  // item 3. Module state here would make one tab's transition break the other tab's import.
  const other = createGenerationGuard();
  const mine = g.claim('doc');
  assert.equal(other.current('doc', mine), false, 'two guards share a sequence — the counters are module state');
  const theirs = other.claim('doc');
  assert.equal(g.current('doc', mine), true, 'another store\'s claim invalidated this store\'s ticket');
  assert.equal(other.current('doc', theirs), true);
});

// ---------------------------------------------------------------------------------------------
// G1 — the defect with no photographs in it. R47-1 face 1.
// ---------------------------------------------------------------------------------------------

/**
 * **G1.** `openTrip` is `await flushForTransition()` … `await ports.storage.load(id)` … the
 * reseeding `set`. An edit dispatched in that window used to be *accepted* and then discarded,
 * with `persistence.status` reading `'idle'` over the loss — `qa/r4-switch.mjs` §9's standing
 * assertion (*"no tab renders 'Saved' over a document storage does not hold"*) on a sequence
 * that probe does not drive.
 *
 * **Injected fault: remove `dispatch`'s window guard** → the edit is accepted and then lost.
 */
test('G1: an edit dispatched inside a transition window is refused, not silently discarded', async () => {
  const { p, store } = mk('', { debounceMs: 40 });
  await store.createTrip({ ...TRIP, title: 'A' });
  await store.createTrip({ ...TRIP, title: 'B', startDate: '2026-09-01', endDate: '2026-09-02' });
  await store.flush();
  const [A, B] = store.getState().library.map((r) => r.id).sort();
  await store.openTrip(A);

  p.storage.slowLoad = true;
  const open = store.openTrip(B);
  await tick(); await tick();
  assert.ok(p.storage.loadGate !== null, 'INCONCLUSIVE: openTrip did not park inside storage.load');

  const before = store.getState().doc;
  assert.throws(
    () => store.dispatch({ type: 'setTripMeta', patch: { title: 'EDITED IN THE WINDOW' } }),
    (err: unknown) => (err as Error).message === TRANSITION_IN_PROGRESS_MESSAGE,
    'a document mutation inside a transition window was accepted',
  );
  assert.equal(store.getState().doc, before, 'a refused dispatch moved state.doc');

  p.storage.slowLoad = false;
  await (p.storage.loadGate as () => Promise<void>)();
  await open;
  await sleep(200);
  await store.flush();

  assert.equal(store.getState().doc!.id, B, 'INCONCLUSIVE: the transition did not complete');
  const afterA = await storedDoc(p, A);
  assert.equal(afterA!.title, 'A', 'a refused edit reached storage anyway');
  // ROADMAP F's heuristic: an assertion on the dirty predicate sits beside one on the bytes.
  assert.ok(!(p.storage.docs.get(A) as string).includes('EDITED IN THE WINDOW'),
    'the refused edit is in the stored bytes');
  assert.equal(store.getState().doc!.title, (await storedDoc(p, B))!.title,
    'memory and storage disagree about the title of the trip that is open');
  assert.equal(store.getState().persistence.status, 'idle');
  assert.equal(store.isDirty(), false, "'idle' is being displayed over a document storage does not hold");
});

// ---------------------------------------------------------------------------------------------
// G2 / G3 — round 47's own measurement, inverted. R47-1 faces 2 and 3.
// ---------------------------------------------------------------------------------------------

/**
 * **G2.** Round 47 measured **four files picked, four decoded, four written to disk, three
 * lost, `failures: []`, `pending: 0`** — and it is repeatable indefinitely, because re-opening
 * the batch's **own** trip failed neither of R46-1's guards (`isLiveTrip('A')` is true and
 * `state.doc?.id === 'A'` is true on both sides of the transition). A bound that holds only
 * while a guard fails is not a bound (§10 A-66 Part 10).
 *
 * **Injected fault: restore `state.doc?.id !== tripId` in place of the ticket check** → three of
 * four lost, `failures: []`, `pending: 0`.
 */
test('G2: re-opening the trip a batch is importing into loses no photograph', async () => {
  const { p, store } = mk('w', { debounceMs: 40 });
  await store.createTrip({ ...TRIP, title: 'A' });
  const A = store.getState().doc!.id;
  await store.flush();

  p.photo.next = [1, 2, 3, 4].map((n) => file(`${n}.jpg`));
  const imp = store.importPhotos({ kind: 'trip' });
  await tick(); await tick();
  await p.photo.release(1);                        // file 1 decodes, is written and is dispatched
  const afterFirst = store.getState().doc!.photos.map((x) => x.id);
  assert.equal(afterFirst.length, 1, 'INCONCLUSIVE: file 1 never landed');

  // The library card, tapped again — the SAME trip, three times, exactly as round 47 drove it.
  for (let i = 0; i < 3; i++) {
    p.storage.slowLoad = true;
    const reopen = store.openTrip(A);
    await tick(); await tick();
    await p.photo.release(1);                      // a decode lands inside this load window
    p.storage.slowLoad = false;
    await (p.storage.loadGate as () => Promise<void>)();
    await reopen;
  }
  await p.photo.release(1);
  await imp;
  await sleep(200);
  await store.flush();

  const inMemory = store.getState().doc!.photos.map((x) => x.id);
  const persisted = (await storedDoc(p, A))!.photos.map((x) => x.id);
  assert.deepEqual(persisted, inMemory, 'memory and storage disagree about the photographs');
  assert.deepEqual(inMemory, afterFirst,
    'a photograph the dispatch guard accepted was discarded by the transition that followed it');
  // Nothing was decoded, written, and then lost: every byte pair on disk has a record naming it.
  assert.deepEqual([...p.photo.thumbs.keys()].sort(), inMemory.map((id) => photoByteKey(A, id)).sort(),
    'a derivative pair was written for a file whose record did not survive');
  assert.deepEqual(photoImport(store.getState()), { pending: 0, total: 0, failures: [] },
    'the abandoned batch was reported, or its fraction never settled');
});

/**
 * **G3.** The same, with the transition landing while the decode is still parked rather than
 * during the byte `write`. The step-4 guard now fires **before** `ports.photo.write`, and
 * §10.4's halving loop makes `derive` seconds of canvas work per file — so this is the
 * overwhelmingly likely place for a transition to land, and it costs **zero** bytes. §10
 * **A-66 Part 10** item 2, made checkable.
 *
 * **Injected fault: restore `isLiveTrip(tripId)` at the step-4 guard** → the trip still exists,
 * the guard passes, the write happens, and the dispatch guard behind it strands one pair.
 */
test('G3: a transition landing during `derive` strands no derivative pair at all', async () => {
  const { p, store } = mk('g3', { debounceMs: 40 });
  await store.createTrip({ ...TRIP, title: 'A' });
  const A = store.getState().doc!.id;
  await store.flush();

  p.photo.next = [file('1.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick(); await tick();
  assert.equal(p.photo.gates.length, 1, 'INCONCLUSIVE: the decode is not parked');

  await store.openTrip(A);          // the whole transition completes while the decode is parked
  await p.photo.release(1);         // and only then does the decode finish
  await imp;
  await sleep(200);

  assert.equal(p.photo.thumbs.size, 0,
    `bytes were written for a batch a transition had already superseded: ${JSON.stringify([...p.photo.thumbs.keys()])}`);
  assert.equal(p.photo.displays.size, 0);
  assert.deepEqual(store.getState().doc!.photos, [], 'a record landed for a superseded batch');
  assert.deepEqual(photoImport(store.getState()).failures, [],
    'a trip transition was reported as a file failure — A-66 U5');
});

// ---------------------------------------------------------------------------------------------
// G4 / G5 / G6 — R47-2's three faces. Two availability reads, resolving out of order.
// ---------------------------------------------------------------------------------------------

/**
 * **G4 — R47-2 face 1.** A double-tap on one library card: two reads for the **same** trip, the
 * earlier landing last. `state.doc?.id !== doc.id` is false for both, so the stale set stamps
 * and a photograph whose bytes are on disk under `[A, …]` reads `'missing'` — R45-4's exact
 * defect, reached through `readPhotoAvailability` instead of through `importPhotos`.
 *
 * **Injected fault: restore `state.doc?.id !== doc.id`.**
 */
test('G4: an older availability read for the SAME trip cannot overwrite a newer one', async () => {
  const { p, store } = mk('g4');
  await store.createTrip({ ...TRIP, title: 'A' });
  const A = store.getState().doc!.id;
  p.photo.next = [file('1.jpg')];
  const i0 = store.importPhotos({ kind: 'trip' });
  await tick(); await p.photo.release(1); await i0;
  await store.flush();
  await store.closeTrip();

  p.photo.slowPresent = true;
  const first = store.openTrip(A);
  await tick(); await tick();
  const second = store.openTrip(A);
  await tick(); await tick();
  assert.equal(p.photo.presentGates.length, 2, 'INCONCLUSIVE: two availability reads were not issued');

  await p.photo.presentGates.splice(1, 1)[0].run();          // the SECOND read lands first
  await tick();
  p.photo.slowPresent = false;
  await second;

  // A second photograph arrives while the first read is still parked, so the two answers differ.
  p.photo.next = [file('2.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick(); await p.photo.release(1); await imp;
  assert.equal(photosFor(store.getState(), { kind: 'trip' }).items.length, 2, 'INCONCLUSIVE: the second import did not land');

  await p.photo.presentGates.shift()!.run();                 // the FIRST read lands last
  await tick();
  await first;

  const listing = photosFor(store.getState(), { kind: 'trip' });
  assert.equal(listing.missing, 0,
    `a photograph whose bytes are on disk reads 'missing': ${JSON.stringify(listing.items.map((i) => i.availability))}`);
  assert.equal(listing.phase, 'ready');
  assert.equal(p.photo.thumbs.size, 2, 'INCONCLUSIVE: the bytes are not actually on disk');
});

/**
 * **G5 — R47-2 face 2.** An older `refreshPhotoAvailability` landing after `doMerge`'s own read
 * — which is **R46-2's own measured end state on R46-2's own fix**: `{phase:'ready', missing:1}`
 * over bytes held under the trip's own key.
 *
 * **Injected fault: restore `state.doc?.id !== doc.id`.**
 */
test('G5: `doMerge`\'s fresh read is not overwritten by an older read for the same trip', async () => {
  const storage = gatedStorage();
  const photo = gatedPhotos();
  const { store: tabA } = mk('a', { storage, photo });
  const { store: tabB } = mk('b', { storage, photo });

  await tabA.createTrip({ ...TRIP, title: 'T' });
  photo.next = [file('a.jpg')];
  const ia = tabA.importPhotos({ kind: 'trip' });
  await tick(); await photo.release(1); await ia;
  await tabA.flush();
  const T = tabA.getState().doc!.id;

  await tabB.openTrip(T);
  photo.next = [file('b.jpg')];
  const ib = tabB.importPhotos({ kind: 'trip' });
  await tick(); await photo.release(1); await ib;
  await tabB.flush();

  photo.slowPresent = true;
  const stale = tabA.refreshPhotoAvailability();      // tab A's read, issued before the merge
  await tick(); await tick();
  assert.equal(photo.presentGates.length, 1, 'INCONCLUSIVE: the older read is not parked');
  photo.slowPresent = false;

  tabA.dispatch({ type: 'setTripMeta', patch: { title: 'A edit' } });
  await tabA.flush().catch(() => {});
  assert.equal(tabA.getState().persistence.status, 'conflict', 'INCONCLUSIVE: this tab is not in conflict');
  await tabA.mergeWithStored();
  assert.equal(photosFor(tabA.getState(), { kind: 'trip' }).items.length, 2,
    'INCONCLUSIVE: the merge did not take in the other tab\'s photo record');

  await photo.presentGates.shift()!.run();            // the pre-merge answer lands last
  await tick();
  await stale;

  const listing = photosFor(tabA.getState(), { kind: 'trip' });
  assert.equal(listing.missing, 0,
    `a photograph on disk was reported gone after a merge: ${JSON.stringify(listing.items.map((i) => i.availability))}`);
  assert.equal(photo.thumbs.size, 2, 'INCONCLUSIVE: the bytes are not actually on disk');
});

/**
 * **G6 — R47-2 face 3.** Two *Try again* taps, the earlier failing and the later succeeding.
 * §10.6 property 6's *"an `'unreadable'` listing carries an action, not just a diagnosis"* is
 * defeated if the action works and is then undone by the failure that preceded it.
 * `refreshPhotoAvailability`'s own docstring says it deliberately has **no in-flight flag**, so
 * two overlapping reads is one gesture rather than a contrivance.
 *
 * **Injected fault: restore `state.doc?.id !== doc.id`.**
 */
test('G6: a retry that succeeded is not reverted to `unreadable` by an older read that failed', async () => {
  const { p, store } = mk('g6');
  await store.createTrip({ ...TRIP, title: 'T' });
  p.photo.next = [file('a.jpg')];
  const i0 = store.importPhotos({ kind: 'trip' });
  await tick(); await p.photo.release(1); await i0;
  await store.flush();

  p.photo.slowPresent = true;
  const firstTap = store.refreshPhotoAvailability();
  await tick();
  const secondTap = store.refreshPhotoAvailability();
  await tick();
  assert.equal(p.photo.presentGates.length, 2, 'INCONCLUSIVE: two reads were not issued');

  await p.photo.presentGates.splice(1, 1)[0].run();   // the SECOND tap succeeds first
  await tick();
  await secondTap;
  assert.equal(photosFor(store.getState(), { kind: 'trip' }).phase, 'ready', 'INCONCLUSIVE: the retry did not succeed');

  p.photo.presentGates.shift()!.fail(new Error('IndexedDB: UnknownError'));
  await tick();
  await firstTap;

  const listing = photosFor(store.getState(), { kind: 'trip' });
  assert.notEqual(listing.phase, 'unreadable',
    `a successful retry was reverted by the failing read that preceded it: ${listing.message}`);
  assert.equal(store.getState().photos.availabilityError, null);
});

// ---------------------------------------------------------------------------------------------
// G7 — the criterion the ruling found while designing itself.
// ---------------------------------------------------------------------------------------------

/**
 * **G7.** Two `openTrip` calls with the first one's `load` slower. R46-3 fixed the *symptom* of
 * this — the availability answer stamped for the wrong trip — and never fixed the ordering
 * underneath it: the older transition still installed its document over the newer one.
 *
 * **Injected fault: drop the pre-install `current('doc', t)` check** → A installs over B.
 */
test('G7: an older transition never installs its document over a newer one', async () => {
  const { p, store } = mk('g7');
  await store.createTrip({ ...TRIP, title: 'A' });
  const A = store.getState().doc!.id;
  await store.flush();
  await store.createTrip({ ...TRIP, title: 'B', startDate: '2026-09-01', endDate: '2026-09-02' });
  const B = store.getState().doc!.id;
  await store.flush();
  await store.closeTrip();

  p.storage.lag[A] = 40;                       // an ordinary latency difference. Nothing else.
  const [openedA, openedB] = await Promise.allSettled([store.openTrip(A), store.openTrip(B)]);

  const s = store.getState();
  assert.equal(s.doc!.id, B, 'the older transition installed its document over the newer one');
  assert.equal(s.activeTripId, B);
  assert.equal(s.photos.tripId, B, 'availability is stamped for a trip that is not the open one');
  assert.equal(openedB.status, 'fulfilled');
  assert.equal(openedA.status, 'fulfilled',
    'a superseded NAVIGATION threw — A-67 Part 6 splits creations (throw) from navigations (return)');
});

// ---------------------------------------------------------------------------------------------
// G8 / G9 — the closed lists, checkable rather than merely written (A-64's S5 shape).
// ---------------------------------------------------------------------------------------------

const STORE_SRC = readFileSync(new URL('../src/store/store.ts', import.meta.url), 'utf8');

/**
 * **G8.** `claimTransition` has exactly two call sites, and every reseeding `set` is either one
 * of §4.2 rule 6a's six transitions or `writeAndSettle`'s merge install. An eighth is a seventh
 * transition, which rule 6a calls a defect — and this is the first criterion that can see one.
 */
test('G8: exactly two claimTransition call sites, and exactly seven reseeding installs', () => {
  const calls = [...STORE_SRC.matchAll(/(?<!function )claimTransition\(/g)];
  assert.equal(calls.length, 2,
    `claimTransition call sites: flushForTransition's success exit and deleteTrip's rule-6c branch, and nothing else — found ${calls.length}`);
  assert.match(STORE_SRC, /if \(!state\.doc \|\| skip\) return claimTransition\(\);/,
    'the claim is no longer flushForTransition\'s last synchronous act beside the dirty() read — A-67 Part 5');
  // The predicate is hoisted into `wasActive` at revision 49 — **A-68 Part 6** gives this line
  // verbatim — so its failure path can re-read availability with the trip still open. Same
  // expression, same branch, same claim: only the name of the fact moved.
  assert.match(STORE_SRC, /const wasActive = state\.activeTripId === id;/,
    'A-68 Part 6: deleteTrip no longer hoists its own branch predicate, so its catch cannot read it');
  assert.match(STORE_SRC, /if \(wasActive\) \{ cancelTimer\(\); claimTransition\(\); \}/,
    'deleteTrip\'s rule-6c branch no longer claims — A-67 Part 6');

  assert.equal((STORE_SRC.match(/reseed:\s*true/g) ?? []).length, 7,
    '§4.2 rule 6a\'s six transitions plus writeAndSettle\'s merge install — an eighth is a seventh transition');

  // Two invariants that hold at every checked call site: the check is the last statement before
  // its write, and the release is in a `finally`. The second is grep-checkable; the first is what
  // every G1–G7 test above measures.
  const releases = (STORE_SRC.match(/releaseTransition\(\);/g) ?? []).length;
  const finallies = (STORE_SRC.match(/\} finally \{\n\s+releaseTransition\(\);/g) ?? []).length;
  assert.equal(releases, 6, 'the six transitions of §4.2 rule 6a each release exactly once');
  assert.equal(releases, finallies,
    'a releaseTransition() call is outside a `finally` — A-67 Part 6 requires every exit, including the throws');
});

/**
 * **G9.** The counters are ephemeral session state — A-67 Part 9. In `AppState` they would be
 * inside `history`'s snapshots, so `undo` would restore a **generation** (R8-1's defect class),
 * and a subscriber could render off a fact measured in milliseconds.
 */
test('G9: nothing leaked into AppState, history, toJSON, core or the export surface', () => {
  const reducer = readFileSync(new URL('../src/store/reducer.ts', import.meta.url), 'utf8');
  for (const needle of ['Ticket', 'claim(', 'observe(', 'supersede(', 'generation']) {
    assert.ok(!reducer.includes(needle),
      `\`${needle}\` reached reducer.ts — that is AppState, initialState() and history's snapshots`);
  }

  const index = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  assert.ok(!index.includes('generation.ts'), 'store/generation.ts is on packages/client\'s export surface — A-67 Part 9');
  for (const needle of ['Ticket', 'GenerationGuard', 'GuardedSlot']) {
    assert.ok(!index.includes(needle), `\`${needle}\` is exported from packages/client — A-67 Part 9`);
  }

  const coreSrc = new URL('../../core/src/', import.meta.url);
  for (const name of readdirSync(coreSrc, { recursive: true }) as string[]) {
    if (!name.endsWith('.ts')) continue;
    const text = readFileSync(new URL(name, coreSrc), 'utf8');
    for (const needle of ['GenerationGuard', 'GuardedSlot', 'createGenerationGuard']) {
      assert.ok(!text.includes(needle), `\`${needle}\` reached packages/core/src/${name} — core has no store`);
    }
  }
  assert.equal(Object.keys(core).length, 86, 'core\'s runtime export surface moved');
});

// ---------------------------------------------------------------------------------------------
// The split A-67 Part 6 makes: a creation throws, a navigation returns.
// ---------------------------------------------------------------------------------------------

test('A-67 Part 6: a superseded CREATION throws, and installs nothing', async () => {
  const { p, store } = mk('c');
  await store.createTrip({ ...TRIP, title: 'A' });
  const A = store.getState().doc!.id;
  await store.flush();
  await store.closeTrip();

  // `importDoc`'s window covers `fromJSON`, the ownership refusal and the whole id-minting loop.
  const backup = core.toJSON(core.createTrip({ ...TRIP, title: 'RESTORED' }, {
    ids: { newId: (k: string) => `restored-${k}` }, now: TODAY, actorUserId: core.LOCAL_OWNER,
  }));
  p.storage.lag[`restored-trip`] = 40;

  const restoring = store.importDoc(backup);
  await tick(); await tick();
  await store.openTrip(A);                       // a newer transition claims inside that window

  await assert.rejects(restoring, (err: unknown) => (err as Error).message === TRANSITION_SUPERSEDED_MESSAGE,
    'a superseded creation returned quietly — nothing on the screen would show it did not happen');
  assert.equal(store.getState().doc!.id, A, 'the superseded creation installed its document anyway');
  assert.equal(store.getState().doc!.title, 'A');
});

test('A-67 Part 6: `deleteTrip` claims and never checks — its delete is unconditional', async () => {
  const { p, store } = mk('d');
  await store.createTrip({ ...TRIP, title: 'A' });
  const A = store.getState().doc!.id;
  await store.flush();

  // An import in flight for the trip being deleted: R46-1 face 3, now met by the same check as
  // everything else. The delete itself is never conditional on a ticket.
  p.photo.next = [file('del.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick(); await tick();
  await store.deleteTrip(A);
  await p.photo.release(1);
  await imp;

  assert.equal(await p.storage.load(A), null, 'the delete was made conditional on a ticket');
  assert.deepEqual(store.getState().library, []);
  assert.equal(p.photo.thumbs.size, 0,
    `bytes outlived their trip: ${JSON.stringify([...p.photo.thumbs.keys()])}`);
  assert.deepEqual(photoImport(store.getState()).failures, [],
    'a trip transition was reported as a file failure');
});

test('A-67 Part 6: `browseTrip` claims its own slot, and an older browse never wins the pane', async () => {
  const { p, store } = mk('b');
  await store.createTrip({ ...TRIP, title: 'A' });
  const A = store.getState().doc!.id;
  await store.flush();
  await store.createTrip({ ...TRIP, title: 'B', startDate: '2026-09-01', endDate: '2026-09-02' });
  const B = store.getState().doc!.id;
  await store.flush();

  p.storage.lag[A] = 40;
  const [first, second] = await Promise.allSettled([store.browseTrip(A), store.browseTrip(B)]);
  assert.equal(first.status, 'fulfilled');
  assert.equal(second.status, 'fulfilled');
  assert.equal(store.getState().browsing!.id, B,
    'an older browse installed its pane over a newer one — and `copyStopInto` reads that pane');

  // `closeBrowse` is a synchronous replacement, so it supersedes rather than claims.
  p.storage.lag[A] = 40;
  const late = store.browseTrip(A);
  await tick();
  await store.closeBrowse();
  await late;
  assert.equal(store.getState().browsing, null, 'a browse still in flight installed its pane over a close');
});
