/**
 * **A claim is a promise to answer** — ARCHITECTURE §4.2 **A-68**, ROADMAP **I-13e**.
 *
 * A-67 reasoned about *ordering* — which of two answers wins — and never about *liveness* —
 * whether any answer arrives at all. A-68 Part 3 is the missing sentence (*a bump of a slot's
 * sequence is a promise to replace the answer it invalidated*) and this file is A-68 Part 10's
 * **G10…G16**, each with its fault injected rather than described, plus **Part 7's** invariant
 * asserted directly over a battery of gestures rather than over the two named repros.
 *
 * Everything here runs in plain Node against the in-memory ports — `cairn-constraints` §5. The
 * only injections are **parking** (a `present`, a `derive` or a `remove` that has not answered
 * yet) and two named port failures where a criterion asks for one.
 */
import { settlingTest as test, watch } from './settled-invariant.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createStore, memoryStorage, memoryFile, memoryPhotos,
  fixedClockPort, sequentialIdPort, photosFor, photoImport, orphanPhotoBytes, core,
} from '../src/index.ts';
import type { MemoryPhotos, MemoryStorage, Ports, StoredDoc, AppState, Store } from '../src/index.ts';

const TODAY = '2026-08-01';
const TRIP = {
  title: 'A',
  startDate: '2026-08-07',
  endDate: '2026-08-09',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
};

const tick = () => new Promise((r) => setTimeout(r, 0));

const taggedBytes = (name: string, n = 64) => {
  const out = new Uint8Array(n);
  for (let i = 0; i < name.length && i < n; i++) out[i] = name.charCodeAt(i) & 0x7f;
  return out;
};
const file = (name: string, type = 'image/jpeg') => ({ name, type, bytes: taggedBytes(name) });

// ---------------------------------------------------------------------------------------------
// The doubles. They park; none of them fails unless a test asks.
// ---------------------------------------------------------------------------------------------

type GatedPhotos = MemoryPhotos & {
  /** Parked `derive` calls, in order. */
  gates: (() => Promise<void>)[];
  release(n?: number): Promise<void>;
  /** Parked `present` calls, in order. Each resolves or rejects independently. */
  presentGates: { run(): Promise<void>; fail(e: unknown): void }[];
  slowPresent: boolean;
  /** Parked `remove` calls, in order — the window A-68 Part 5c's observation is taken across. */
  removeGates: { run(): Promise<void>; fail(e: unknown): void }[];
  slowRemove: boolean;
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
  port.present = (t, ids) => {
    if (!port.slowPresent) return basePresent(t, ids);
    // **The answer is snapshotted when the read is ISSUED, not when it is released**, because
    // that is what a real `present()` does: it reads the store as of the transaction it opens.
    // Computing it at release time would quietly repair every stale read this file exists to
    // measure — R48-1's whole subject is *"an availability read issued before those bytes
    // existed"*.
    const answer = basePresent(t, ids);
    return new Promise((res, rej) => {
      port.presentGates.push({ run: async () => { res(await answer); }, fail: (e) => rej(e) });
    });
  };
  const baseRemove = port.remove.bind(port);
  port.removeGates = [];
  port.slowRemove = false;
  port.remove = (t, id) => (port.slowRemove
    ? new Promise<void>((res, rej) => {
      port.removeGates.push({ run: async () => { res(await baseRemove(t, id)); }, fail: (e) => rej(e) });
    })
    : baseRemove(t, id));
  return port;
}

type GatedStorage = MemoryStorage & {
  /** Ids whose `load` rejects — A-68 Part 4.1 row 11. */
  failLoadFor: Set<string>;
  /** Ids whose `delete` rejects — A-68 Part 6's own path. */
  failDeleteFor: Set<string>;
};

function gatedStorage(): GatedStorage {
  const s = memoryStorage() as GatedStorage;
  const baseLoad = s.load.bind(s);
  const baseDelete = s.delete.bind(s);
  s.failLoadFor = new Set<string>();
  s.failDeleteFor = new Set<string>();
  s.load = async (id: string): Promise<StoredDoc | null> => {
    if (s.failLoadFor.has(id)) throw new Error(`load(${id}) failed`);
    return baseLoad(id);
  };
  s.delete = async (id: string): Promise<void> => {
    if (s.failDeleteFor.has(id)) throw new Error(`delete(${id}) failed`);
    return baseDelete(id);
  };
  return s;
}

function mk(prefix = '', shared: { storage?: GatedStorage; photo?: GatedPhotos } = {}) {
  const p = {
    storage: shared.storage ?? gatedStorage(),
    file: memoryFile(),
    photo: shared.photo ?? gatedPhotos(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(prefix),
  } as Ports & { photo: GatedPhotos; storage: GatedStorage };
  return { p, store: watch(createStore({ ports: p }), p.photo) };
}

const listing = (store: Store) => photosFor(store.getState(), { kind: 'trip' });

/** Trip A, open, one photograph whose bytes are on disk, availability read and terminal. */
async function tripWithOnePhoto(prefix: string, shared: Parameters<typeof mk>[1] = {}) {
  const { p, store } = mk(prefix, shared);
  await store.createTrip({ ...TRIP, title: 'A' });
  const A = store.getState().doc!.id;
  p.photo.next = [file('a.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick();
  await p.photo.release(1);
  await imp;
  await store.flush();
  assert.equal(listing(store).phase, 'ready', 'INCONCLUSIVE: the first import did not settle');
  assert.equal(listing(store).missing, 0, 'INCONCLUSIVE: the photograph is not readable to begin with');
  return { p, store, A };
}

/**
 * Two trips, **A** open with its establishing availability read **parked**: `photos.available`
 * is `null`, the listing says `'loading'`, one `present` is outstanding, and **B** is stored and
 * not active. This is the state every one of A-68 Part 4.1's nine stranding exits used to leave
 * permanently.
 *
 * `slowPresent` goes back to `false` before this returns: exactly ONE read is in flight, so a
 * gesture that issues its own answers immediately and the invariant is measured against the
 * gesture rather than against the fixture.
 */
async function parkedRead(prefix: string) {
  const { p, store } = mk(prefix);
  await store.createTrip({ ...TRIP, title: 'B', startDate: '2026-09-01', endDate: '2026-09-02' });
  const B = store.getState().doc!.id;
  await store.flush();
  await store.createTrip({ ...TRIP, title: 'A' });
  const A = store.getState().doc!.id;
  p.photo.next = [file('a.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick();
  await p.photo.release(1);
  await imp;
  await store.flush();
  await store.closeTrip();

  p.photo.slowPresent = true;
  const opening = store.openTrip(A);
  await tick(); await tick();
  assert.equal(p.photo.presentGates.length, 1, 'INCONCLUSIVE: the availability read is not parked');
  assert.equal(store.getState().doc?.id, A, 'INCONCLUSIVE: the trip is not open');
  assert.equal(listing(store).phase, 'loading', 'INCONCLUSIVE: the listing is not waiting on the read');
  p.photo.slowPresent = false;
  return { p, store, A, B, opening };
}

/** Lets the parked read answer and waits for the `openTrip` that issued it. */
async function releaseParkedRead(ctx: { p: { photo: GatedPhotos }; opening: Promise<AppState> }) {
  ctx.p.photo.slowPresent = false;
  const g = ctx.p.photo.presentGates.shift();
  if (g) await g.run();
  await tick();
  await ctx.opening;
}

// ---------------------------------------------------------------------------------------------
// G10 — R48-2 face 1. Deleting a trip that is not the open one.
// ---------------------------------------------------------------------------------------------

/**
 * **G10.** `deleteTrip` of a **non**-active trip installs no document and issues no replacement
 * read, and under A-67 it claimed `photoAvailability` anyway — so the read in flight for the
 * trip that stayed open was dropped and nothing ever answered. A-68 Part 4: the transition
 * claims `doc` and nothing else, and this exit closes **correctly** rather than by compensation
 * (the read was never stale — `removeTrip` is a key-range delete over *another* trip's keys).
 *
 * **Injected fault: restore `guard.claim('photoAvailability')` in `claimTransition`** →
 * `'loading'` forever.
 *
 * The disclosed false positive on the `doc` slot (A-67 Part 11 residue 2 — the delete stops an
 * import running for the **active** trip) is asserted in the same test, so nobody reads this fix
 * as having removed it.
 */
test('G10: deleting a non-active trip does not strand the open trip\'s availability read', async () => {
  const ctx = await parkedRead('g10');
  const { p, store, B } = ctx;

  // A batch in flight for the ACTIVE trip, so residue 2 is measured rather than assumed.
  p.photo.next = [file('b.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick();
  assert.equal(p.photo.gates.length, 1, 'INCONCLUSIVE: the decode is not parked');

  await store.deleteTrip(B);
  await releaseParkedRead(ctx);

  assert.equal(listing(store).phase, 'ready',
    'the availability read was dropped by a delete that installed nothing and never replaced — A-68 Part 4.1 row 3');
  assert.equal(listing(store).missing, 0);

  await p.photo.release(1);
  await imp;
  assert.equal(store.getState().doc!.photos.length, 1,
    'the delete no longer stops an import running for the active trip — A-67 Part 11 residue 2 is DISCLOSED and unchanged');
  assert.deepEqual(photoImport(store.getState()).failures, [],
    'a trip transition was reported as a file failure — §10 A-66 U5');
});

// ---------------------------------------------------------------------------------------------
// G11 — R48-2 faces 2 and 3, plus the five exits neither finding named.
// ---------------------------------------------------------------------------------------------

/**
 * **G11.** Every remaining exit of A-68 Part 4.1's table that installs no document: an
 * `openTrip` for an id that is not there, an `openTrip` for a corrupt document (§2.9 **A-47**'s
 * own designed banner path), `importDoc` on garbage, `importDoc` on a foreign owner, and an
 * `adoptTrip` whose `storage.load` rejects. All five fail exactly as they do today **and** the
 * open trip's listing reaches `'ready'`.
 *
 * **Same injected fault as G10 → five reds.**
 */
test('G11: openTrip(missing) fails as before and does not strand the open trip\'s read', async () => {
  const ctx = await parkedRead('g11a');
  await assert.rejects(ctx.store.openTrip('no-such-id'), /no trip no-such-id in storage/);
  await releaseParkedRead(ctx);
  assert.equal(listing(ctx.store).phase, 'ready', 'A-68 Part 4.1 row 4 still strands the read');
  assert.equal(ctx.store.getState().doc?.id, ctx.A, 'the trip that was open did not stay open');
});

test('G11: openTrip(corrupt) keeps A-47\'s chip and does not strand the open trip\'s read', async () => {
  const ctx = await parkedRead('g11b');
  ctx.p.storage.docs.set('corrupt-1', { nonsense: true } as never);
  await assert.rejects(ctx.store.openTrip('corrupt-1'));
  assert.deepEqual(ctx.store.getState().openFailures.map((f) => f.id), ['corrupt-1'],
    '§2.9 A-47\'s failure chip is no longer recorded where it happens');
  await releaseParkedRead(ctx);
  assert.equal(listing(ctx.store).phase, 'ready', 'A-68 Part 4.1 row 5 still strands the read');
});

test('G11: importDoc(garbage) fails as before and does not strand the open trip\'s read', async () => {
  const ctx = await parkedRead('g11c');
  await assert.rejects(ctx.store.importDoc('{{{'), (e: Error) => e instanceof core.TripParseError);
  await releaseParkedRead(ctx);
  assert.equal(listing(ctx.store).phase, 'ready', 'A-68 Part 4.1 row 6 still strands the read');
});

test('G11: importDoc(foreign owner) still refuses and does not strand the open trip\'s read', async () => {
  const ctx = await parkedRead('g11d');
  const exported = JSON.parse(await ctx.store.exportActive());
  const foreign = JSON.stringify({ ...exported, id: 'foreign-1', ownerId: 'somebody-else' });
  await assert.rejects(ctx.store.importDoc(foreign), (e: Error) => e instanceof core.ForeignDocumentError);
  await releaseParkedRead(ctx);
  assert.equal(listing(ctx.store).phase, 'ready', 'A-68 Part 4.1 row 7 still strands the read');
});

test('G11: an adoptTrip whose load rejects does not strand the open trip\'s read', async () => {
  const ctx = await parkedRead('g11e');
  const other = core.createTrip(
    { ...TRIP, title: 'Adopted' },
    { now: TODAY, ids: sequentialIdPort('adopt') },
  );
  ctx.p.storage.failLoadFor.add(other.id);
  await assert.rejects(ctx.store.adoptTrip(other), new RegExp(`load\\(${other.id}\\) failed`));
  await releaseParkedRead(ctx);
  assert.equal(listing(ctx.store).phase, 'ready', 'A-68 Part 4.1 row 11 still strands the read');
  assert.equal(ctx.store.getState().doc?.id, ctx.A, 'the trip that was open did not stay open');
});

/**
 * **G11, A-68 Part 4.1 row 12's *other* branch.** `deleteTrip` of a **non**-active trip whose
 * cascade rejects: the open trip's read must land, and — unlike G12's active branch — **no**
 * replacement read is owed, because `ports.photo.removeTrip(B)` is a key-range delete over B's
 * key space and cannot change what `present()` would answer for A (§10 **A-62**).
 */
test('G11: a non-active delete whose cascade rejects strands nothing and owes nothing', async () => {
  const ctx = await parkedRead('g11f');
  ctx.p.storage.failDeleteFor.add(ctx.B);
  const before = ctx.p.photo.presentCount;

  await assert.rejects(ctx.store.deleteTrip(ctx.B), new RegExp(`delete\\(${ctx.B}\\) failed`),
    'the delete no longer fails loudly');
  assert.equal(ctx.p.photo.presentCount - before, 0,
    'A-68 Part 6 is scoped to `wasActive`: a delete of another trip changed nothing about this one and owes no read');

  await releaseParkedRead(ctx);
  assert.equal(listing(ctx.store).phase, 'ready', 'A-68 Part 4.1 row 12 still strands the read');
  assert.equal(listing(ctx.store).missing, 0);
  assert.equal(ctx.store.getState().doc?.id, ctx.A, 'the trip that was open did not stay open');
});

// ---------------------------------------------------------------------------------------------
// G12 — the tenth exit, which is neither finding's (A-68 Part 6).
// ---------------------------------------------------------------------------------------------

/**
 * **G12.** `deleteTrip`'s cascade rejects at `ports.storage.delete` **after**
 * `ports.photo.removeTrip` has already run. The trip stays open, every byte it owns is gone,
 * and without A-68 Part 6's one line the listing keeps reading `'ready'` over them — §10
 * **A-65 T1**'s exact prohibition, reached by a fault rather than by a race.
 *
 * **Injected fault: drop Part 6's `catch` read** → `'ready'` over gone bytes.
 */
test('G12: a delete whose cascade rejects re-reads availability rather than reporting `ready` over gone bytes', async () => {
  const { p, store, A } = await tripWithOnePhoto('g12');
  p.storage.failDeleteFor.add(A);

  await assert.rejects(store.deleteTrip(A), new RegExp(`delete\\(${A}\\) failed`),
    'the delete no longer fails loudly');

  assert.equal(store.getState().doc?.id, A, 'the trip did not stay open after a failed delete');
  assert.equal(p.photo.thumbs.size, 0, 'INCONCLUSIVE: removeTrip did not run before the rejection');

  const l = listing(store);
  assert.equal(l.phase, 'ready');
  assert.equal(l.items[0]?.availability, 'missing',
    '§10 A-65 T1: a listing reported `ready` over bytes the cascade had already removed');
  assert.equal(l.missing, 1);
});

// ---------------------------------------------------------------------------------------------
// G13 / G14 — R48-1's two faces. The supersede comes out of the value guard.
// ---------------------------------------------------------------------------------------------

/**
 * **G13 — R48-1 face 1.** Availability **unread** — an establishing `present()` still parked — and
 * an import lands underneath it. The read was issued **before** the new bytes existed, so it must
 * not land after them and report `'missing'` over them; and because the import cannot write the
 * answer itself (`available === null` means *never read*), somebody still owes one.
 *
 * **Fault 1: put the `supersede` back inside R45-4's value guard** → the stale answer lands
 * mid-batch, `available` stops being `null`, the files behind it take R45-4's `if` branch and
 * build a set holding only themselves — and the file that went first reads `'missing'` over bytes
 * on disk, which is R45-4's own rendered defect. **The batch has to span the stale answer for that
 * to be visible**, which is why the release below is interleaved and not `release(3)`.
 * **Fault 2: make `settleAvailability` a no-op** → nothing replaces what the supersede
 * invalidated and the listing never leaves `'loading'`.
 *
 * **The fixture moved at I-13g (§4.2 A-69) and the move is the finding, not a tidy-up.** It used
 * to park a *Try again* behind a `present()` that had **failed**, which left `availabilityError`
 * set — and A-69 Part 4's predicate was false whenever `availabilityError !== null`, so the owed
 * read was not issued on that path (BUILD-NOTES **KD-84**, disclosed rather than patched).
 * **§4.2 A-70 ruled it**: the predicate now asks the slot's sequence rather than the error field,
 * and the failed fixture is **G26** below, which reaches the same outcome this one does.
 *
 * Three files, one owed read: the boundary is what keeps the batch at one port call.
 */
test('G13: an import with availability unread never reads `missing`, and owes exactly one read', async () => {
  const { p, store } = await parkedRead('g13');
  assert.equal(listing(store).phase, 'loading', 'INCONCLUSIVE: availability is not unread');

  const before = p.photo.presentCount;
  p.photo.next = [file('2.jpg'), file('3.jpg'), file('4.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick();
  await p.photo.release(1);                       // the first file's bytes are on disk

  // The stale answer lands INSIDE the batch and must already have been invalidated by the write
  // above. It knows nothing of any of these three photographs.
  await p.photo.presentGates.shift()!.run();
  await tick();

  await p.photo.release(2);                       // the two behind it
  await imp;
  await tick(); await tick();
  assert.equal(store.getState().doc!.photos.length, 4, 'INCONCLUSIVE: the batch did not land');
  assert.equal(p.photo.presentCount - before, 1,
    'A-69 Part 4: the owed read is once per BATCH, not once per file — the boundary, not a per-file await');

  const l = listing(store);
  assert.notEqual(l.phase, 'loading', '§10.6 property 5: the listing never reached a terminal state');
  assert.equal(l.phase, 'ready');
  assert.equal(l.missing, 0,
    `a photograph whose bytes are on disk reads 'missing': ${JSON.stringify(l.items.map((i) => i.availability))}`);
  assert.equal(p.photo.thumbs.size, 4, 'INCONCLUSIVE: the bytes are not actually on disk');
});

/**
 * **G26 — §4.2 A-70 Part 6, KD-84 face 1.** *(This is `G13b` re-cut: the fixture is unchanged and
 * is exactly right — a `present()` that **failed**, a *Try again* parked behind it, three files
 * imported underneath. What A-70 changes is the expected outcome and the injected fault.)*
 *
 * The *ordering* half of R48-1 face 1 is unmoved and is asserted throughout, not just at the end:
 * the stale answer is invalidated by the byte write and never lands, so **no photograph whose
 * bytes are on disk ever reads `'missing'`** at any observed instant.
 *
 * The *liveness* half is what A-70 restores. A-69's third conjunct
 * (`availabilityError === null`) declined to discharge the byte write's `supersede` because an
 * *earlier* read had failed, so the listing kept the **previous failure's message** over a trip
 * whose bytes had since changed — and the user's own parked *Try again* was eaten with it. A-70
 * replaces the conjunct with a disjunct over the **slot's sequence**: the answer on display was
 * written under a sequence a byte write has since bumped, so it is not an answer to the question
 * this store is now being asked, and the boundary re-asks it. **Once for the whole batch.**
 *
 * **Injected fault: restore `state.photos.availabilityError === null` as a conjunct of
 * `availabilityUnanswered` → zero extra reads and the previous failure's message stands → red.**
 */
test('G26: after a FAILED read, an import re-asks the question and costs exactly one read — A-70', async () => {
  const { p, store, A } = await tripWithOnePhoto('g26');
  await store.closeTrip();

  p.photo.slowPresent = true;
  const opening = store.openTrip(A);
  await tick(); await tick();
  p.photo.presentGates.shift()!.fail(new Error('IndexedDB: UnknownError'));
  await tick();
  await opening;
  assert.equal(listing(store).phase, 'unreadable', 'INCONCLUSIVE: availability did not fail');

  const retry = store.refreshPhotoAvailability();
  await tick();
  assert.equal(p.photo.presentGates.length, 1, 'INCONCLUSIVE: the retry is not parked');

  // The ordering half, watched at EVERY emitted state rather than only at the end. The subject is
  // the photograph that was already on disk before the batch: a stale answer landing mid-batch
  // knows nothing of any of the three new files, so **it** would report `'missing'` over bytes on
  // disk — R45-4's rendered defect, which is what A-68 Part 5a's hoisted `supersede` prevents and
  // which A-70 must not have moved. (A file *inside* the batch reads `'missing'` for the one emit
  // between its `addPhoto` and the optimistic availability write beside it; that transient is
  // `importPhotos`' own statement order and predates this arc.)
  const established = store.getState().doc!.photos[0]!.id;
  const missingOverBytes: string[] = [];
  const off = store.subscribe((s) => {
    for (const item of photosFor(s, { kind: 'trip' }).items) {
      if (item.asset.id === established && item.availability === 'missing') {
        missingOverBytes.push(`${item.asset.id}@${s.doc!.photos.length}`);
      }
    }
  });

  p.photo.slowPresent = false;
  const before = p.photo.presentCount;
  p.photo.next = [file('2.jpg'), file('3.jpg'), file('4.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick();
  await p.photo.release(1);
  await p.photo.presentGates.shift()!.run();
  await tick();
  await retry;
  await p.photo.release(2);
  await imp;
  await tick(); await tick();
  off();

  assert.equal(store.getState().doc!.photos.length, 4, 'INCONCLUSIVE: the batch did not land');
  assert.equal(p.photo.thumbs.size, 4, 'INCONCLUSIVE: the bytes are not actually on disk');

  const l = listing(store);
  assert.equal(l.phase, 'ready',
    'A-70 Part 4: a bump this store took invalidated the failure, so the boundary re-asked and the listing is terminal');
  assert.equal(l.missing, 0,
    `A-70 Part 1 face 1: a photograph whose bytes are on disk reads 'missing': ${JSON.stringify(l.items.map((i) => i.availability))}`);
  assert.equal(p.photo.presentCount - before, 1,
    'A-70 Part 2: the cost is ONE extra `present()` for the whole batch, regardless of file count');
  assert.deepEqual(missingOverBytes, [],
    'A-68 Part 5a still holds: the stale answer was invalidated by the byte write and must never have landed');

  // §10.6 property 6's exit still answers, and it now restates the ordinary path rather than a
  // disclosed defect: a second tap changes nothing because nothing is outstanding.
  const again = p.photo.presentCount;
  await store.refreshPhotoAvailability();
  const l2 = listing(store);
  assert.equal(l2.phase, 'ready');
  assert.equal(l2.missing, 0);
  assert.equal(p.photo.presentCount - again, 1,
    'INCONCLUSIVE: the explicit refresh is one read and one only');
});

/**
 * **G14 — R48-1 face 2, which is §10 A-65 T1**, as corrected by §4.2 **A-69 Part 10 item 1**.
 * Availability unread, then `removePhoto` and `undo`. A-65 rules that undo restores the **record**
 * and never the photograph, and requires the restored record to read **`'missing'`** — *"never
 * `'empty'`, never `'unreadable'`, never a throw"*.
 *
 * **A-69 Part 10 corrects this criterion to ONE mutation, and names it: make `settleAvailability`
 * a no-op → `'loading'` forever → red.** R45-4's value-guard mutation does not redden this and
 * never did (`removePhoto`'s supersede and the owed read's own claim sat in the same synchronous
 * block); it reddens **G13** alone, where the write is an add rather than a delete.
 *
 * **The fixture moved with the criterion** — it used to park a `present()` that had **failed**,
 * which sets `availabilityError` and made A-69 Part 4's predicate false, so the corrected
 * criterion's own stated fault (`'loading'` forever) could not be produced from it. The failed
 * fixture is **G27** below, and §4.2 **A-70 Part 6** makes their agreement the criterion: this is
 * §10 A-65 **T1** on the unread fixture and G27 is T1 on the previously-failed one.
 */
test('G14: removePhoto + undo reads `missing` even when availability was never read', async () => {
  const { p, store } = await parkedRead('g14');
  const photoId = store.getState().doc!.photos[0]!.id;
  assert.equal(listing(store).phase, 'loading', 'INCONCLUSIVE: availability is not unread');

  await store.removePhoto(photoId);
  assert.equal(p.photo.thumbs.size, 0, 'INCONCLUSIVE: the bytes were not removed');
  // The establishing read, dropped by `removePhoto`'s supersede, settles behind itself (site S2).
  p.photo.slowPresent = false;
  while (p.photo.presentGates.length > 0) { await p.photo.presentGates.shift()!.run(); await tick(); }
  await tick(); await tick();
  store.undo();

  const l = listing(store);
  assert.equal(store.getState().doc!.photos.length, 1, 'INCONCLUSIVE: undo did not restore the record');
  assert.equal(l.phase, 'ready', '§10 A-65 T1: never `empty`, never `unreadable`, never a throw');
  assert.equal(l.items[0]?.availability, 'missing',
    '§10 A-65 T1: a restored record read as though its bytes had come back');
});

/**
 * **G27 — §4.2 A-70 Part 6, KD-84 face 2, which is §10 A-65 T1.** *(This is `G14b` re-cut: the
 * fixture is unchanged and is exactly right — `removePhoto` + `undo` after a **failed**
 * availability read. What A-70 changes is the expected outcome and the injected fault.)*
 *
 * §10 **A-65 T1** requires the restored record to read **`'missing'`** — *"never `'empty'`, never
 * `'unreadable'`, never a throw"* — and **A-70 Part 5 item 6 upholds T1 unamended**, on both of
 * the availability fixtures a store can be in when the removal happens. **G14 above is T1 on the
 * unread fixture and this is T1 on the previously-failed one; the two must agree in outcome, and
 * that agreement is the criterion.**
 *
 * `removePhoto`'s `supersede` invalidates the failure the store was displaying — the bytes it is
 * *about* are the bytes this store has just deleted — so the boundary re-asks and answers, and it
 * answers **without** the explicit refresh the recovery path used to need.
 *
 * **Two injected faults, both red:** restore `availabilityError === null` as a conjunct of
 * `availabilityUnanswered` → `'unreadable'`; make `settleAvailability` a no-op → nothing answers.
 */
test('G27: after a FAILED read, removePhoto + undo reads `missing` — §10 A-65 T1, A-70', async () => {
  const { p, store, A } = await tripWithOnePhoto('g27');
  const photoId = store.getState().doc!.photos[0]!.id;
  await store.closeTrip();

  p.photo.slowPresent = true;
  const opening = store.openTrip(A);
  await tick(); await tick();
  p.photo.presentGates.shift()!.fail(new Error('IndexedDB: UnknownError'));
  await tick();
  await opening;
  p.photo.slowPresent = false;
  assert.equal(listing(store).phase, 'unreadable', 'INCONCLUSIVE: availability did not fail');

  await store.removePhoto(photoId);
  assert.equal(p.photo.thumbs.size, 0, 'INCONCLUSIVE: the bytes were not removed');
  store.undo();

  // **No `refreshPhotoAvailability()` between the undo and this assertion** — that is the half of
  // the criterion the previous revision could not meet.
  assert.equal(store.getState().doc!.photos.length, 1, 'INCONCLUSIVE: undo did not restore the record');
  const l = listing(store);
  assert.equal(l.phase, 'ready',
    '§10 A-65 T1: never `empty`, never `unreadable`, never a throw — the stale failure was invalidated by this store\'s own delete');
  assert.equal(l.items[0]?.availability, 'missing',
    '§10 A-65 T1: "the whole memory except the picture" — the record is back and the bytes are not');
  assert.equal(l.missing, 1);

  // §10.6 property 6's exit still works and now restates the same answer rather than repairing it.
  await store.refreshPhotoAvailability();
  const l2 = listing(store);
  assert.equal(l2.phase, 'ready', 'the ordinary path, one tap later');
  assert.equal(l2.items[0]?.availability, 'missing', '§10 A-65 T1, unchanged by an explicit re-read');
});

// ---------------------------------------------------------------------------------------------
// G15 — the site the hoist creates (A-68 Part 5c).
// ---------------------------------------------------------------------------------------------

/**
 * **G15.** A trip transition landing inside `ports.photo.remove`. `removePhoto` has never had a
 * ticket of any kind; under A-67 the value guard absorbed the race by accident. With the
 * supersede hoisted out of that guard it would fire against the trip the user moved to and drop
 * **that** trip's read — R48-2 committed from a new site by R48-1's own fix.
 *
 * **Injected fault: drop Part 5c's `current('doc', g)` around the tail** → the incoming trip's
 * read is dropped and never re-issued.
 */
test('G15: a transition landing inside `photo.remove` does not touch the trip the user moved to', async () => {
  const { p, store, A } = await tripWithOnePhoto('g15');
  const photoId = store.getState().doc!.photos[0]!.id;
  await store.flush();
  await store.createTrip({ ...TRIP, title: 'B', startDate: '2026-09-01', endDate: '2026-09-02' });
  const B = store.getState().doc!.id;
  p.photo.next = [file('b.jpg')];
  const seed = store.importPhotos({ kind: 'trip' });
  await tick(); await p.photo.release(1); await seed;
  await store.flush();
  await store.openTrip(A);

  p.photo.slowRemove = true;
  const removing = store.removePhoto(photoId);
  await tick();
  assert.equal(p.photo.removeGates.length, 1, 'INCONCLUSIVE: the byte remove is not parked');

  p.photo.slowPresent = true;
  const opening = store.openTrip(B);
  await tick(); await tick();
  assert.equal(store.getState().doc?.id, B, 'INCONCLUSIVE: B did not install');
  assert.equal(p.photo.presentGates.length, 1, 'INCONCLUSIVE: B\'s availability read is not parked');

  // The remove lands inside B's read.
  await p.photo.removeGates.shift()!.run();
  await tick();
  await removing;

  p.photo.slowPresent = false;
  await p.photo.presentGates.shift()!.run();
  await tick();
  await opening;

  const l = listing(store);
  assert.equal(l.phase, 'ready',
    'a `removePhoto` for the trip the user left dropped the incoming trip\'s availability read and never replaced it');
  assert.equal(l.missing, 0, 'the incoming trip\'s availability set was edited by another trip\'s removal');
  assert.deepEqual(orphanPhotoBytes(store.getState()), [],
    '§10 A-66 Part 3: an observation about trip A was reported against trip B');
});

/**
 * **G15, the catch arm.** The same race with a byte `remove` that **rejects**: the orphan it
 * observes belongs to the trip it happened to, and after a transition there is no longer a
 * `state.photos` for that trip to record it in. Reported against the trip the user moved to, it
 * would be a claim about a photograph B has never held.
 */
test('G15: a FAILING remove during a transition reports no orphan against the incoming trip', async () => {
  const { p, store, A } = await tripWithOnePhoto('g15b');
  const photoId = store.getState().doc!.photos[0]!.id;
  await store.flush();
  await store.createTrip({ ...TRIP, title: 'B', startDate: '2026-09-01', endDate: '2026-09-02' });
  const B = store.getState().doc!.id;
  await store.flush();
  await store.openTrip(A);

  p.photo.slowRemove = true;
  const removing = store.removePhoto(photoId);
  await tick();
  assert.equal(p.photo.removeGates.length, 1, 'INCONCLUSIVE: the byte remove is not parked');

  await store.openTrip(B);
  assert.equal(store.getState().doc?.id, B, 'INCONCLUSIVE: B did not install');

  p.photo.removeGates.shift()!.fail(new Error('remove failed'));
  await tick();
  await removing;

  assert.deepEqual(orphanPhotoBytes(store.getState()), [],
    '§10 A-66 Part 3: an orphan observed for trip A was appended to trip B\'s session');
  assert.equal(listing(store).phase, 'empty', 'the incoming trip\'s listing did not settle');
});

// ---------------------------------------------------------------------------------------------
// G17 — the ordering A-67 bought with the claim, carried by the supersede that replaced it.
// ---------------------------------------------------------------------------------------------

/**
 * **G17's own mutation, made behavioural.** A-67 Part 6's table gave the transition a
 * `photoAvailability` claim so an availability read issued for the **outgoing** document could
 * not land over the incoming one — QA **R46-3**'s cross-trip case. A-68 takes that claim away, so
 * something has to carry the ordering: the `supersede` one synchronous statement before the
 * reseed install, with no `await` between them (A-68 Part 4.2 item 3).
 *
 * A-67's own G1…G9 cannot see this — G4, G5 and G6 are all **same**-trip races — so it is
 * measured here rather than assumed from a grep.
 *
 * **Measured, and it is a disclosure:** deleting the `supersede` before an **installing**
 * transition's reseed does **not** turn this red, because A-68 Part 4.2 item 3's own last
 * sentence says why — *"after the install every installing transition issues a read whose claim
 * is newer than anything issued inside the window, which is what made the old claim redundant for
 * ordering in the first place."* The reseeds where the supersede is the **only** thing carrying
 * the ordering are the **document-less** ones, which issue no read of their own, and the test
 * below is those.
 */
test('G17: an availability read for the outgoing trip never lands over the incoming trip\'s state', async () => {
  const { p, store, A, B, opening } = await parkedRead('g17');
  await releaseParkedRead({ p, opening });
  assert.equal(store.getState().doc?.id, A, 'INCONCLUSIVE: A is not the open trip');

  p.photo.slowPresent = true;
  const stale = store.refreshPhotoAvailability();
  await tick();
  assert.equal(p.photo.presentGates.length, 1, 'INCONCLUSIVE: A\'s read is not parked');
  p.photo.slowPresent = false;

  await store.openTrip(B);
  assert.equal(store.getState().doc?.id, B, 'INCONCLUSIVE: B did not install');

  await p.photo.presentGates.shift()!.run();
  await tick();
  await stale;

  assert.equal(store.getState().photos.tripId, B,
    'a read issued for the outgoing document stamped its answer over the incoming one — A-68 Part 4.2 item 3');
  assert.notEqual(listing(store).phase, 'loading',
    'the incoming trip\'s listing went back to `loading` — its own answer was overwritten by the outgoing trip\'s');
});

/**
 * **G17, the reseed where the supersede is load-bearing.** `closeTrip` and `deleteTrip` of the
 * active trip install a **document-less** state and issue no replacement read — A-68 Part 4.1
 * row 2, *"no `doc`, no listing, and none is owed"*. Nothing behind them can invalidate a read
 * still in flight, so the `supersede` immediately before the install is the only thing that
 * stops an answer for the trip the user just left from being stamped into the reseeded state.
 *
 * **Injected fault: delete the `supersede` before `closeTrip`'s reseed install** → the outgoing
 * trip's answer lands in a store that holds no document.
 */
test('G17: a read for the trip that was closed never stamps its answer into the reseeded state', async () => {
  const { p, store, opening } = await parkedRead('g17b');
  await releaseParkedRead({ p, opening });

  p.photo.slowPresent = true;
  const stale = store.refreshPhotoAvailability();
  await tick();
  assert.equal(p.photo.presentGates.length, 1, 'INCONCLUSIVE: the read is not parked');
  p.photo.slowPresent = false;

  await store.closeTrip();
  assert.equal(store.getState().doc, null, 'INCONCLUSIVE: the trip did not close');

  await p.photo.presentGates.shift()!.run();
  await tick();
  await stale;

  const s = store.getState();
  assert.equal(s.photos.tripId, null,
    'a read issued for the outgoing document stamped its answer into the reseeded state — A-68 Part 4');
  assert.equal(s.photos.available, null,
    'a document-less store is holding an availability set for a trip it no longer has open');
});

// ---------------------------------------------------------------------------------------------
// G16 — the closed lists, checkable (A-64's S5 shape).
// ---------------------------------------------------------------------------------------------

const STORE_SRC = readFileSync(new URL('../src/store/store.ts', import.meta.url), 'utf8');

/**
 * **G16.** Every bump of a guarded slot's sequence, counted. A ninth `supersede` that does not
 * name the answer it owes is A-68 Part 3's defect, and this is the criterion that sees it — a
 * stray call site shows up as a count mismatch rather than shipping unnoticed.
 */
test('G16: exactly one claim and eight supersedes on `photoAvailability`, one and eight on `browsing`', () => {
  const count = (re: RegExp) => (STORE_SRC.match(re) ?? []).length;

  assert.equal(count(/guard\.claim\('photoAvailability'\)/g), 1,
    'A-68 Part 4: `readPhotoAvailability` is the ONLY claimer of `photoAvailability` — a transition supersedes it at the reseed');
  assert.equal(count(/guard\.claim\('browsing'\)/g), 1,
    'A-68 Part 4: `browseTrip` is the ONLY claimer of `browsing`');
  assert.equal(count(/guard\.supersede\('photoAvailability'\)/g), 8,
    'A-68 Part 7: the six reseed installs, `importPhotos` and `removePhoto` — and nothing else');
  assert.equal(count(/guard\.supersede\('browsing'\)/g), 8,
    'A-69 Part 8: the six reseed installs, `closeBrowse` and `deleteTrip`\'s non-active branch — and nothing else');
  assert.equal(count(/guard\.claim\('doc'\)/g), 1,
    'A-68 Part 4: `claimTransition` is the ONE place a live-document transition begins');

  // A-67 G8, restated here because A-68 narrows what the claim covers without moving its sites.
  assert.equal([...STORE_SRC.matchAll(/(?<!function )claimTransition\(/g)].length, 2,
    'claimTransition call sites: flushForTransition\'s success exit and deleteTrip\'s rule-6c branch');

  // A-68 Part 4.2 item 1, **narrowed by A-69 Part 8 and not withdrawn**: `deleteTrip`'s non-active
  // install still takes NO `photoAvailability` supersede — a builder "completing the set" there
  // reintroduces R48-2 — and now takes an unconditional `browsing` one with a conditional write
  // (QA R49-4). The shape is pinned rather than described.
  assert.match(STORE_SRC,
    /\n {12}guard\.supersede\('browsing'\);\n {12}set\(\{ \.\.\.state, library, openFailures,\n {14}browsing: state\.browsing\?\.id === id \? null : state\.browsing \}\);\n {10}\}/,
    'A-69 Part 8: `deleteTrip`\'s non-active install supersedes `browsing` unconditionally and clears only the deleted trip\'s pane');
  assert.doesNotMatch(STORE_SRC, /\n {12}guard\.supersede\('photoAvailability'\);\n {12}set\(\{ \.\.\.state, library, openFailures/,
    'A-68 Part 4.2 item 1: a `photoAvailability` supersede on `deleteTrip`\'s non-active branch is still FORBIDDEN');
  assert.equal(count(/reseed:\s*true/g), 7,
    'six transitions plus `writeAndSettle`\'s merge install — which is A-68 Part 4.2 item 2\'s odd one out and takes no supersede');
});

// ---------------------------------------------------------------------------------------------
// A-68 Part 7 — the liveness invariant, asserted directly and broadly.
// ---------------------------------------------------------------------------------------------

/**
 * **A-68 Part 7's invariant**, which is what makes this ruling checkable rather than believed:
 *
 * > when every promise this store has made has settled, either `state.doc === null`, or
 * > `photos.available !== null`, or `photos.availabilityError !== null`.
 *
 * `'loading'` is transient **by construction**. The architect flagged this as the thing most
 * worth stress-testing, so it is asserted over a battery of gestures rather than over the two
 * repros the findings happened to reach — including the six exits neither finding named, the
 * gestures that are *supposed* to leave no document, and the two byte-write sites.
 */
function assertLive(store: Store, label: string) {
  const s = store.getState();
  const live = s.doc === null || s.photos.available !== null || s.photos.availabilityError !== null;
  assert.ok(live,
    `A-68 Part 7: after ${label} the store settled with a document open, no availability answer and no error — §10.6 property 5's unresolving spinner`);
  if (s.doc !== null) {
    assert.notEqual(photosFor(s, { kind: 'trip' }).phase, 'loading',
      `A-68 Part 7: after ${label} the listing is still 'loading' with nothing in flight`);
  }
}

type Gesture = { name: string; run(ctx: Awaited<ReturnType<typeof parkedRead>>): Promise<void> };

const GESTURES: Gesture[] = [
  { name: 'deleteTrip of a non-active trip', async run(ctx) { await ctx.store.deleteTrip(ctx.B); } },
  { name: 'openTrip of a missing id', async run(ctx) { await ctx.store.openTrip('no-such-id').catch(() => {}); } },
  {
    name: 'openTrip of a corrupt document',
    async run(ctx) {
      ctx.p.storage.docs.set('corrupt-1', { nonsense: true } as never);
      await ctx.store.openTrip('corrupt-1').catch(() => {});
    },
  },
  { name: 'importDoc of garbage', async run(ctx) { await ctx.store.importDoc('{{{').catch(() => {}); } },
  {
    name: 'importDoc of a foreign owner',
    async run(ctx) {
      const exported = JSON.parse(await ctx.store.exportActive());
      await ctx.store.importDoc(JSON.stringify({ ...exported, id: 'foreign-1', ownerId: 'somebody-else' })).catch(() => {});
    },
  },
  {
    name: 'an adoptTrip whose load rejects',
    async run(ctx) {
      const other = core.createTrip({ ...TRIP, title: 'Adopted' }, { now: TODAY, ids: sequentialIdPort('ad') });
      ctx.p.storage.failLoadFor.add(other.id);
      await ctx.store.adoptTrip(other).catch(() => {});
    },
  },
  {
    name: 'a deleteTrip of a NON-active trip whose cascade rejects',
    async run(ctx) {
      ctx.p.storage.failDeleteFor.add(ctx.B);
      await ctx.store.deleteTrip(ctx.B).catch(() => {});
    },
  },
  {
    name: 'a deleteTrip of the ACTIVE trip whose cascade rejects',
    async run(ctx) {
      ctx.p.storage.failDeleteFor.add(ctx.store.getState().doc!.id);
      await ctx.store.deleteTrip(ctx.store.getState().doc!.id).catch(() => {});
    },
  },
  { name: 'closeTrip', async run(ctx) { await ctx.store.closeTrip(); } },
  {
    name: 'an import while availability is unknown',
    async run(ctx) {
      ctx.p.photo.next = [file('n.jpg')];
      const imp = ctx.store.importPhotos({ kind: 'trip' });
      await tick();
      await ctx.p.photo.release(1);
      await imp;
    },
  },
  {
    name: 'a removePhoto while availability is unknown',
    async run(ctx) {
      const id = ctx.store.getState().doc!.photos[0]!.id;
      await ctx.store.removePhoto(id);
    },
  },
  {
    name: 'a browse of another trip and a close of the browse pane',
    async run(ctx) {
      await ctx.store.browseTrip(ctx.B).catch(() => {});
      await ctx.store.closeBrowse();
    },
  },
  { name: 'a createTrip', async run(ctx) { await ctx.store.createTrip({ ...TRIP, title: 'C', startDate: '2026-10-01', endDate: '2026-10-02' }); } },
];

for (const g of GESTURES) {
  test(`A-68 Part 7 liveness: ${g.name}`, async () => {
    const ctx = await parkedRead(`live-${GESTURES.indexOf(g)}`);
    // The gesture happens with an availability read still in flight — the only state in which a
    // dropped read has anything to strand.
    await g.run(ctx);
    // Everything settles: the parked read answers (or is dropped by something newer), and the
    // `openTrip` that issued it returns.
    ctx.p.photo.slowPresent = false;
    while (ctx.p.photo.presentGates.length > 0) {
      await ctx.p.photo.presentGates.shift()!.run();
      await tick();
    }
    await ctx.opening.catch(() => {});
    await tick(); await tick();
    assertLive(ctx.store, g.name);
  });
}
