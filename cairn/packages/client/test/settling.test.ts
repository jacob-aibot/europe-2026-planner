/**
 * **The enumeration is the defect: a settling boundary replaces the table of exits** —
 * ARCHITECTURE §4.2 **A-69**, ROADMAP **I-13g**.
 *
 * A-68 answered *liveness* with a flag (`availabilityOwed`) discharged at two hand-written call
 * sites, gated on the `doc` slot — the slot every one of its own Part 4.1 exits bumps. Seven of
 * its nine exits came back (QA **R49-1**) and an eleventh exit that *installs* its document and
 * still answers nothing (QA **R49-5**, a subscriber throwing inside `emit()`) was never in the
 * table at all, because an exception is not a returned outcome.
 *
 * A-69 Part 3 is the standing rule this file is written against: **no correctness argument in the
 * store may rest on an exhaustive enumeration of control-flow exits.** So the mechanism under test
 * is a boundary (`settling(...)` around `createStore`'s literal, plus `readPhotoAvailability`'s own
 * tail) and the criteria below are A-69 Part 12's **G18…G25**, each with its fault injected rather
 * than described.
 *
 * The exit battery in G18 is **evidence, not the mechanism** — it is A-68 Part 4.1's demoted table
 * re-run to show the boundary covers what the enumeration used to, not to claim the list is
 * complete. G20 is the case no list could contain.
 *
 * Plain Node against the in-memory ports — `cairn-constraints` §5. The only injections are parking
 * (a `present`, a `derive`), two named port failures, and one throwing subscriber.
 */
import { settlingTest as test, watch, assertSettled } from './settled-invariant.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createStore, memoryStorage, memoryFile, memoryPhotos,
  fixedClockPort, sequentialIdPort, photosFor, core,
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
// The doubles — the same shapes `liveness.test.ts` uses, plus `collideAll` for Part 4.1 row 8.
// ---------------------------------------------------------------------------------------------

type GatedPhotos = MemoryPhotos & {
  gates: (() => Promise<void>)[];
  release(n?: number): Promise<void>;
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
  port.present = (t, ids) => {
    if (!port.slowPresent) return basePresent(t, ids);
    const answer = basePresent(t, ids);
    return new Promise((res, rej) => {
      port.presentGates.push({ run: async () => { res(await answer); }, fail: (e) => rej(e) });
    });
  };
  return port;
}

type GatedStorage = MemoryStorage & {
  failLoadFor: Set<string>;
  failDeleteFor: Set<string>;
  /** Every `load` of an unknown id answers with SOMETHING — A-68 Part 4.1 row 8's minting loop. */
  collideAll: boolean;
};

function gatedStorage(): GatedStorage {
  const s = memoryStorage() as GatedStorage;
  const baseLoad = s.load.bind(s);
  const baseDelete = s.delete.bind(s);
  s.failLoadFor = new Set<string>();
  s.failDeleteFor = new Set<string>();
  s.collideAll = false;
  s.load = async (id: string): Promise<StoredDoc | null> => {
    if (s.failLoadFor.has(id)) throw new Error(`load(${id}) failed`);
    const found = await baseLoad(id);
    if (found || !s.collideAll) return found;
    const any = [...s.docs.keys()][0];
    return any === undefined ? null : baseLoad(any);
  };
  s.delete = async (id: string): Promise<void> => {
    if (s.failDeleteFor.has(id)) throw new Error(`delete(${id}) failed`);
    return baseDelete(id);
  };
  return s;
}

function mk(prefix = '') {
  const p = {
    storage: gatedStorage(),
    file: memoryFile(),
    photo: gatedPhotos(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(prefix),
  } as Ports & { photo: GatedPhotos; storage: GatedStorage };
  return { p, store: watch(createStore({ ports: p })) };
}

const listing = (store: Store) => photosFor(store.getState(), { kind: 'trip' });

/**
 * Trip **A** open with **one photograph on disk** and its establishing availability read
 * **parked**, plus trip **B** stored and not active. `available` is `null`, the listing is
 * `'loading'`, exactly one `present` is outstanding.
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

type Ctx = Awaited<ReturnType<typeof parkedRead>>;

/** Drains everything still parked and awaits the `openTrip` that issued the establishing read. */
async function drain(ctx: Ctx) {
  ctx.p.photo.slowPresent = false;
  while (ctx.p.photo.gates.length > 0) await ctx.p.photo.release(1);
  while (ctx.p.photo.presentGates.length > 0) {
    await ctx.p.photo.presentGates.shift()!.run();
    await tick();
  }
  await ctx.opening.catch(() => {});
  await tick(); await tick();
}

// ---------------------------------------------------------------------------------------------
// G18 — R49-1, all of it. Nine exits, measured mid-batch.
// ---------------------------------------------------------------------------------------------

/**
 * Availability unknown, a **two-file** import into the open trip, paused inside **file 2's**
 * `derive` — which is the state R49-1 measured: file 1's byte `write` has already superseded the
 * establishing read (A-68 Part 5a, which stays), so the only answer this trip had is invalidated
 * and, under A-68, owed to a discharge line that no exit below ever reaches.
 */
async function midBatch(prefix: string) {
  const ctx = await parkedRead(prefix);
  ctx.p.photo.next = [file('f1.jpg'), file('f2.jpg')];
  const imp = ctx.store.importPhotos({ kind: 'trip' });
  await tick();
  assert.equal(ctx.p.photo.gates.length, 1, 'INCONCLUSIVE: file 1\'s decode is not parked');
  await ctx.p.photo.release(1);
  assert.equal(ctx.p.photo.gates.length, 1, 'INCONCLUSIVE: file 2\'s decode is not parked');
  assert.equal(ctx.store.getState().photos.available, null,
    'INCONCLUSIVE: the batch answered availability itself — R45-4\'s guard is what stops it');
  return { ...ctx, imp };
}

type Exit = { row: string; name: string; run(ctx: Ctx): Promise<void> };

const EXITS: Exit[] = [
  {
    row: '3',
    name: 'deleteTrip of a non-active trip',
    async run(ctx) { await ctx.store.deleteTrip(ctx.B); },
  },
  {
    row: '4',
    name: 'openTrip of an id that is not in storage',
    async run(ctx) { await assert.rejects(ctx.store.openTrip('no-such-id'), /no trip no-such-id in storage/); },
  },
  {
    row: '5',
    name: 'openTrip of a corrupt document',
    async run(ctx) {
      ctx.p.storage.docs.set('corrupt-1', { nonsense: true } as never);
      await assert.rejects(ctx.store.openTrip('corrupt-1'));
      assert.deepEqual(ctx.store.getState().openFailures.map((f) => f.id), ['corrupt-1'],
        '§2.9 A-47\'s failure chip is no longer recorded where it happens');
    },
  },
  {
    row: '6',
    name: 'importDoc of garbage',
    async run(ctx) { await assert.rejects(ctx.store.importDoc('{{{'), (e: Error) => e instanceof core.TripParseError); },
  },
  {
    row: '7',
    name: 'importDoc of a foreign owner',
    async run(ctx) {
      const exported = JSON.parse(await ctx.store.exportActive());
      await assert.rejects(
        ctx.store.importDoc(JSON.stringify({ ...exported, id: 'foreign-1', ownerId: 'somebody-else' })),
        (e: Error) => e instanceof core.ForeignDocumentError,
      );
    },
  },
  {
    row: '8',
    name: 'importDoc whose id minting is exhausted',
    async run(ctx) {
      const exported = await ctx.store.exportActive();
      ctx.p.storage.collideAll = true;
      await assert.rejects(ctx.store.importDoc(exported), /could not mint a free trip id/);
      ctx.p.storage.collideAll = false;
    },
  },
  {
    row: '11',
    name: 'adoptTrip whose storage load rejects',
    async run(ctx) {
      const other = core.createTrip({ ...TRIP, title: 'Adopted' }, { now: TODAY, ids: sequentialIdPort('adopt') });
      ctx.p.storage.failLoadFor.add(other.id);
      await assert.rejects(ctx.store.adoptTrip(other), new RegExp(`load\\(${other.id}\\) failed`));
    },
  },
  {
    row: '12a',
    name: 'deleteTrip of a NON-active trip whose cascade rejects',
    async run(ctx) {
      ctx.p.storage.failDeleteFor.add(ctx.B);
      await assert.rejects(ctx.store.deleteTrip(ctx.B), new RegExp(`delete\\(${ctx.B}\\) failed`));
    },
  },
  {
    row: '12b',
    name: 'deleteTrip of the ACTIVE trip whose cascade rejects',
    async run(ctx) {
      ctx.p.storage.failDeleteFor.add(ctx.A);
      await assert.rejects(ctx.store.deleteTrip(ctx.A), new RegExp(`delete\\(${ctx.A}\\) failed`));
    },
  },
];

// **A-69 Part 12's G18 says this battery gives "nine reds" under its fault; it gives EIGHT** —
// **KD-86**. Row `12b` (a delete of the ACTIVE trip whose cascade rejects) stays green because
// A-68 Part 6's `catch` read answers it directly, which A-69 Part 6 item 4 explicitly keeps. It is
// red under its own fault instead, and that is `liveness.test.ts`'s **G12**.
for (const exit of EXITS) {
  test(`G18 (A-68 Part 4.1 row ${exit.row}): ${exit.name} leaves no permanent spinner`, async () => {
    const ctx = await midBatch(`g18-${exit.row}`);
    await exit.run(ctx);
    await ctx.p.photo.release(1);      // file 2's decode returns; the batch breaks or finishes
    await ctx.imp;
    await drain(ctx);

    assert.equal(ctx.store.getState().doc?.id, ctx.A,
      'INCONCLUSIVE: the trip that was open did not stay open, so there is no listing to strand');
    assertSettled(ctx.store, `A-68 Part 4.1 row ${exit.row}`);
  });
}

/**
 * **G18, site S2 on its own** — *"landing S1 without S2 leaves R49-1's shape reachable"*
 * (ROADMAP I-13g group 1 item 3).
 *
 * Every `readPhotoAvailability` in this store is awaited by the method that issued it, so an
 * ordinary dropped read is caught by that method's S1 on the way out. **The one read with no
 * method behind it is the read the boundary itself issued**: it is awaited inside `settling`'s own
 * handler, which is *after* S1 has run for that method and cannot run again. Drop that read and
 * only `readPhotoAvailability`'s own tail is left.
 *
 * Built here in five steps, because the shape is not reachable by a single gesture:
 *   1. the establishing read is parked and a byte write has already invalidated it;
 *   2. a non-installing exit ends the batch;
 *   3. the parked read is released **into a parked replacement** — that replacement is the read
 *      the boundary issued, and nothing is behind it;
 *   4. a second import supersedes it. That import's own S1 correctly declines: a read is in
 *      flight, so somebody is already responsible;
 *   5. the replacement is released and drops. **S2 is the only thing left.**
 *
 * **Injected fault: delete the `await settleAvailability();` after `readPhotoAvailability`'s
 * `finally` → `phase: 'loading'` forever.**
 */
test('G18/S2: a read the BOUNDARY issued, then dropped, has no S1 behind it', async () => {
  const ctx = await midBatch('g18-s2');
  await assert.rejects(ctx.store.openTrip('no-such-id'), /no trip no-such-id in storage/);
  await ctx.p.photo.release(1);
  await ctx.imp;

  // 3 — the establishing read drops into a replacement that parks.
  ctx.p.photo.slowPresent = true;
  await ctx.p.photo.presentGates.shift()!.run();
  await tick(); await tick();
  assert.equal(ctx.p.photo.presentGates.length, 1,
    'INCONCLUSIVE: the boundary did not issue a replacement read for the one it found dropped');
  assert.equal(ctx.store.getState().photos.available, null, 'INCONCLUSIVE: the replacement already answered');

  // 4 — a second import invalidates the replacement while it is still in flight.
  ctx.p.photo.slowPresent = false;
  ctx.p.photo.next = [file('s2.jpg')];
  const second = ctx.store.importPhotos({ kind: 'trip' });
  await tick();
  await ctx.p.photo.release(1);
  await second;
  assert.equal(ctx.p.photo.presentGates.length, 1,
    'INCONCLUSIVE: the second import answered availability itself, so nothing is left to strand');

  // 5 — the replacement drops with no method exit behind it.
  await ctx.p.photo.presentGates.shift()!.run();
  await tick(); await tick();
  await drain(ctx);

  assert.equal(ctx.store.getState().doc?.id, ctx.A, 'INCONCLUSIVE: the trip did not stay open');
  assertSettled(ctx.store, 'a boundary-issued read dropped with no S1 behind it');
  assert.equal(listing(ctx.store).missing, 0, 'a photograph whose bytes are on disk reads `missing`');
});

// ---------------------------------------------------------------------------------------------
// G19 — two overlapping batches, both owing, ended by one gesture.
// ---------------------------------------------------------------------------------------------

test('G19: two overlapping owing batches settle on one gesture and cost ONE extra read', async () => {
  const ctx = await midBatch('g19');
  // A second batch joins the first, and is also parked inside its own decode.
  ctx.p.photo.next = [file('s1.jpg'), file('s2.jpg')];
  const second = ctx.store.importPhotos({ kind: 'trip' });
  await tick();
  assert.equal(ctx.p.photo.gates.length, 2, 'INCONCLUSIVE: the second batch is not parked beside the first');

  const before = ctx.p.photo.presentCount;
  await assert.rejects(ctx.store.openTrip('no-such-id'), /no trip no-such-id in storage/);

  await ctx.p.photo.release(2);
  await ctx.imp;
  await second;
  await drain(ctx);

  assert.equal(ctx.p.photo.presentCount - before, 1,
    'A-69 Part 4: the boundary is at most ONE `present()` per settling event — two owing batches must not cost two reads');
  assertSettled(ctx.store, 'two overlapping batches ended by one gesture');
});

// ---------------------------------------------------------------------------------------------
// G20 — R49-5. The exit no enumeration of returns can contain.
// ---------------------------------------------------------------------------------------------

/**
 * A subscriber that throws **once**, on the first emit that installs a document. `set` assigns
 * `state` before it calls `emit()`, so the document is installed and control flow leaves through
 * an exception — past the `await readPhotoAvailability(...)` every installing transition ends in.
 * Under A-68 the listing stayed `'loading'` with `presentCalls: 0`, and **no row of Part 4.1's
 * table described it, because Part 4.1 enumerates non-installing exits and this one installs.**
 */
function throwOnceOnInstall(store: Store, want: (s: AppState) => boolean) {
  let fired = false;
  const off = store.subscribe((s) => {
    if (fired || !want(s)) return;
    fired = true;
    throw new Error('subscriber exploded');
  });
  return { off, fired: () => fired };
}

test('G20: a subscriber throwing inside openTrip\'s reseed still leaves a terminal listing', async () => {
  const ctx = await parkedRead('g20a');
  await drain(ctx);
  assert.equal(listing(ctx.store).phase, 'ready', 'INCONCLUSIVE: the fixture did not settle');
  await ctx.store.closeTrip();

  const sub = throwOnceOnInstall(ctx.store, (s) => s.doc?.id === ctx.A);
  const before = ctx.p.photo.presentCount;
  await assert.rejects(ctx.store.openTrip(ctx.A), /subscriber exploded/,
    'the subscriber\'s original error did not propagate unchanged');
  sub.off();

  assert.ok(sub.fired(), 'INCONCLUSIVE: the subscriber never threw');
  assert.equal(ctx.store.getState().doc?.id, ctx.A, 'the document was not installed');
  assert.ok(ctx.p.photo.presentCount - before >= 1,
    'R49-5: the reseed installed a document and nothing ever asked the port about it');
  assertSettled(ctx.store, 'a subscriber throwing inside openTrip\'s reseed');
});

test('G20: a subscriber throwing inside createTrip\'s reseed still leaves a terminal listing', async () => {
  const ctx = await parkedRead('g20b');
  await drain(ctx);

  const sub = throwOnceOnInstall(ctx.store, (s) => s.doc?.title === 'C');
  await assert.rejects(
    ctx.store.createTrip({ ...TRIP, title: 'C', startDate: '2026-10-01', endDate: '2026-10-02' }),
    /subscriber exploded/,
  );
  sub.off();

  assert.ok(sub.fired(), 'INCONCLUSIVE: the subscriber never threw');
  assert.equal(ctx.store.getState().doc?.title, 'C', 'the document was not installed');
  assertSettled(ctx.store, 'a subscriber throwing inside createTrip\'s reseed');
});

test('G20: a subscriber throwing inside adoptTrip\'s reseed still leaves a terminal listing', async () => {
  const ctx = await parkedRead('g20c');
  await drain(ctx);

  const other = core.createTrip({ ...TRIP, title: 'Adopted' }, { now: TODAY, ids: sequentialIdPort('ad20c') });
  const sub = throwOnceOnInstall(ctx.store, (s) => s.doc?.id === other.id);
  await assert.rejects(ctx.store.adoptTrip(other), /subscriber exploded/);
  sub.off();

  assert.ok(sub.fired(), 'INCONCLUSIVE: the subscriber never threw');
  assert.equal(ctx.store.getState().doc?.id, other.id, 'the document was not installed');
  assertSettled(ctx.store, 'a subscriber throwing inside adoptTrip\'s reseed');
});

test('G20: a subscriber throwing inside importDoc\'s reseed still leaves a terminal listing', async () => {
  const ctx = await parkedRead('g20d');
  await drain(ctx);

  // A's own export, re-imported: the id collides, so it lands under a fresh id with one photo
  // record and no bytes — a document `present()` is genuinely asked about.
  const exported = await ctx.store.exportActive();
  const sub = throwOnceOnInstall(ctx.store, (s) => s.doc?.title?.endsWith('(imported)') === true);
  const before = ctx.p.photo.presentCount;
  await assert.rejects(ctx.store.importDoc(exported), /subscriber exploded/);
  sub.off();

  assert.ok(sub.fired(), 'INCONCLUSIVE: the subscriber never threw');
  assert.match(ctx.store.getState().doc?.title ?? '', /\(imported\)$/, 'the document was not installed');
  assert.ok(ctx.p.photo.presentCount - before >= 1,
    'R49-5: the reseed installed a document with photographs and nothing ever asked the port about it');
  assertSettled(ctx.store, 'a subscriber throwing inside importDoc\'s reseed');
});

// ---------------------------------------------------------------------------------------------
// G21 — the type fence's greppable half. The compile error itself is a typecheck transcript.
// ---------------------------------------------------------------------------------------------

const STORE_SRC = readFileSync(new URL('../src/store/store.ts', import.meta.url), 'utf8');

test('G21: the availability triple has exactly one writer, called from exactly three places', () => {
  assert.match(STORE_SRC,
    /function setPhotos\(patch: Partial<Omit<PhotoSession, 'tripId' \| 'available' \| 'availabilityError'>>\)/,
    'A-69 Part 5: `setPhotos` can still write the availability triple, so the compile error G21 measures does not exist');
  // **A-69 Part 12 G21 says "exactly three call sites, all inside `readPhotoAvailability`,
  // `importPhotos` and `removePhoto`", and the textual count is SIX** — Part 5's own body says
  // why: *"`readPhotoAvailability`'s four branches become the three arms"*, so the three is the
  // number of **functions** (and of union arms), not of `setAvailability(` tokens. Both numbers
  // are pinned here so a fourth writing *function* and a fifth branch are each a red line, and the
  // discrepancy is a documentation finding recorded as **KD-83** rather than a silent re-count.
  assert.equal([...STORE_SRC.matchAll(/(?<!function )setAvailability\(/g)].length, 6,
    'A-69 Part 5 / G21: six `setAvailability(` calls — four branches of `readPhotoAvailability` plus the two optimistic writes. A seventh is a defect until it names how it settles');
  assert.equal((STORE_SRC.match(/setAvailability\(\s*\{\s*\n?\s*kind: '(ready|unreadable|cleared)'/g) ?? []).length, 6,
    'A-69 Part 5: every call names one of the three arms');
  // The two writers that are store methods rather than top-level functions, pinned by shape so a
  // fourth writing site shows up as a count mismatch above rather than shipping unnoticed.
  assert.equal((STORE_SRC.match(/setAvailability\(\{ kind: 'ready', tripId: state\.doc\.id, available \}\);/g) ?? []).length, 2,
    'A-69 Part 5: `importPhotos`\' and `removePhoto`\'s optimistic writes go through the fence');
  assert.match(STORE_SRC, /const exhaustive: never = answer;/,
    'A-69 Part 5: the `never` arm is the compile error a fourth answer produces and is not decoration');
});

// ---------------------------------------------------------------------------------------------
// G22 — R49-4. The browse pane that outlived its trip.
// ---------------------------------------------------------------------------------------------

test('G22: deleting a non-active trip closes the browse pane over it', async () => {
  const ctx = await parkedRead('g22');
  await drain(ctx);

  await ctx.store.browseTrip(ctx.B);
  assert.equal(ctx.store.getState().browsing?.id, ctx.B, 'INCONCLUSIVE: the pane did not open');

  await ctx.store.deleteTrip(ctx.B);

  assert.equal(ctx.store.getState().browsing, null,
    'A-69 Part 8 (R49-4): a trip with no row, no record and no bytes is still readable — and §2.14\'s `copyStopInto` copies stops OUT of it');
  assert.equal(ctx.store.getState().library.find((r) => r.id === ctx.B), undefined,
    'INCONCLUSIVE: the library row survived the delete');
  assertSettled(ctx.store, 'deleteTrip of the browsed trip');
});

test('G22 control: deleting a DIFFERENT non-active trip leaves the pane intact', async () => {
  const ctx = await parkedRead('g22b');
  await drain(ctx);
  // A third trip, stored and not active, so the delete has a subject that is not the browsed one.
  await ctx.store.createTrip({ ...TRIP, title: 'C', startDate: '2026-11-01', endDate: '2026-11-02' });
  const C = ctx.store.getState().doc!.id;
  await ctx.store.flush();
  await ctx.store.openTrip(ctx.A);

  await ctx.store.browseTrip(ctx.B);
  assert.equal(ctx.store.getState().browsing?.id, ctx.B, 'INCONCLUSIVE: the pane did not open');

  await ctx.store.deleteTrip(C);

  assert.equal(ctx.store.getState().browsing?.id, ctx.B,
    'A-69 Part 8: the write is CONDITIONAL — only the deleted trip\'s pane is stale');
  assertSettled(ctx.store, 'deleteTrip of an unrelated trip');
});

// ---------------------------------------------------------------------------------------------
// G23 — the cost bound. This is what stops the repair becoming a port call per file.
// ---------------------------------------------------------------------------------------------

// **A-69 Part 12's stated fault for G23 — "move the settle inside the import loop" — is a no-op**
// (**KD-86**): `settleAvailability` is predicate-guarded and the predicate is false throughout this
// path, which is A-69 Part 4's own cost argument. The faults that DO redden it are an *unguarded*
// per-file `readPhotoAvailability` in the loop (three extra reads) and deleting the
// `state.photos.available === null` conjunct from `availabilityUnanswered`. Both measured.
test('G23: an ordinary import of three files into an answered trip costs ZERO extra reads', async () => {
  const ctx = await parkedRead('g23');
  await drain(ctx);
  assert.equal(listing(ctx.store).phase, 'ready', 'INCONCLUSIVE: the open did not answer availability');

  const before = ctx.p.photo.presentCount;
  ctx.p.photo.next = [file('1.jpg'), file('2.jpg'), file('3.jpg')];
  const imp = ctx.store.importPhotos({ kind: 'trip' });
  await tick();
  await ctx.p.photo.release(3);
  await imp;
  await tick(); await tick();

  assert.equal(ctx.p.photo.presentCount - before, 0,
    'A-69 Part 4: the predicate is false throughout an ordinary import, so the boundary costs NOTHING — a settle inside the import loop is a port call per file');
  assert.equal(ctx.store.getState().doc!.photos.length, 4, 'INCONCLUSIVE: the batch did not land');
  assert.equal(listing(ctx.store).missing, 0, 'a photograph whose bytes are on disk reads `missing`');
  assertSettled(ctx.store, 'an ordinary three-file import');
});

// ---------------------------------------------------------------------------------------------
// G24 — the closed lists, checkable. A-69 Part 11's proof depends on exactly these.
// ---------------------------------------------------------------------------------------------

test('G24: the three greppable facts A-69 Part 11\'s proof rests on', () => {
  const count = (re: RegExp) => (STORE_SRC.match(re) ?? []).length;

  // (i) `createStore` returns `settling(...)` and nothing else.
  assert.equal(count(/\n {2}return settling\(\{/g), 1,
    'A-69 Part 11 (i): `createStore` must have exactly ONE return of its literal and it must be `return settling(`');
  assert.equal(count(/\n {2}return \{/g), 0,
    'A-69 Part 4 site S1: a bare `return {` at `createStore`\'s top level is a store whose methods bypass the boundary');
  // **A-69 Part 12 G24 says "exactly two call sites" and the textual count is THREE**, because S1
  // is one site with two arms — `settling`'s resolution arm and its rejection arm, and dropping the
  // rejection arm is G20's own injected fault. Both numbers are pinned; **KD-83**.
  assert.equal([...STORE_SRC.matchAll(/(?<!function )settleAvailability\(\)/g)].length, 3,
    'A-69 Part 4: `settleAvailability` has exactly two call SITES — the wrapper (S1, both arms) and `readPhotoAvailability`\'s tail (S2). Landing S1 without S2 leaves R49-1\'s shape reachable');
  assert.match(STORE_SRC,
    /async \(v\) => \{ await settleAvailability\(\); return v; \},\n\s*async \(e\) => \{ await settleAvailability\(\); throw e; \},/,
    'A-69 Part 4 site S1: the boundary must settle on the REJECTION arm too — that arm is the whole of R49-5');
  // **A-69 Part 4 prints S2 as a statement below the `try`/`finally`, where it is DEAD CODE on all
  // four drop paths** — a `return` inside a `try` runs the `finally` and leaves the function
  // (BUILD-NOTES **KD-85**). It ships as a `finally` of its own, one frame above the claim's
  // release, which is the placement A-69's own words describe. Pinned by shape so it cannot drift
  // back inside the claim's window.
  assert.match(STORE_SRC,
    /async function readPhotoAvailability\(doc: Trip \| null\): Promise<void> \{\n {4}try \{\n {6}await readAvailabilityOnce\(doc\);\n {4}\} finally \{\n(?:.*\n)*? {6}await settleAvailability\(\);\n {4}\}\n {2}\}/,
    'A-69 Part 4 site S2: the tail must run on EVERY exit of a read, including the four drops, and after the claim has been released');
  assert.doesNotMatch(STORE_SRC, /guard\.release\('photoAvailability'\);\n {4}\}\n(?: *\/\/.*\n)* {4}await settleAvailability\(\);/,
    'KD-85: S2 below the claim\'s own `try`/`finally` is unreachable from the four `return`s inside it');

  // (iii) the deletion A-69 pays for the boundary with.
  assert.equal(count(/availabilityOwed/g), 0,
    'A-69 Part 6: `availabilityOwed` is DELETED, not left beside the boundary');

  // A-68 G16, unchanged in force: the bumps this ruling must not have moved.
  assert.equal(count(/guard\.supersede\('photoAvailability'\)/g), 8,
    'A-69 Part 6 item 2: the byte-write supersedes carry ORDERING and stay — removing one re-opens R48-1');
  assert.equal(count(/guard\.claim\('photoAvailability'\)/g), 1,
    'A-68 Part 4: `readPhotoAvailability` is still the ONLY claimer of `photoAvailability`');
  assert.equal(count(/guard\.supersede\('browsing'\)/g), 8,
    'A-69 Part 8: the six reseed installs, `closeBrowse` and `deleteTrip`\'s non-active branch — and nothing else');
});
