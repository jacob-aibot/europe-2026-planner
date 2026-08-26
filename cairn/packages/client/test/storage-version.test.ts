/**
 * R3-1 and R3-4 — the write fence is an opaque, storage-issued `StorageVersion`, never
 * `Trip.revision` (ARCHITECTURE §2.2a, ROADMAP Phase 1 F).
 *
 * Revision 2 used `Trip.revision` for two jobs: a content counter AND the compare-and-set
 * token. `undo()` restores a previous snapshot verbatim — revision included — so a revision
 * the guard had already spent on refusing another tab came back around and let that tab in
 * (R3-1). The same defect from the other side: delete a record and recreate it under the
 * same id at the same revision and a writer holding the dead record's token passes (R3-4).
 *
 * These tests are the four rules of §2.2a, exercised at the port and through the store.
 * Plain Node, in-memory ports, no browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
  core,
} from '../src/index.ts';
import type { Action } from '../src/index.ts';
import type { Ports, StorageVersion } from '../src/index.ts';
import type { TripSummaryRow } from '../src/deps.ts';

const TODAY = '2026-08-01';

function ports(storage = memoryStorage()): Ports & { storage: ReturnType<typeof memoryStorage> } {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(),
    scheduler: immediateScheduler(),
  } as Ports & { storage: ReturnType<typeof memoryStorage> };
}

const TRIP_INIT = {
  title: 'Fence trip',
  startDate: '2026-08-07',
  endDate: '2026-08-10',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
};

/** The save indicator exactly as `apps/web/src/App.tsx` renders it. */
function saveIndicator(store: ReturnType<typeof createStore>): string {
  const { status } = store.getState().persistence;
  if (status === 'conflict') return 'Not saved — edited elsewhere';
  if (status === 'error') return 'Not saved — retry';
  if (status === 'saving') return 'Saving…';
  return store.isDirty() ? 'Unsaved changes' : 'Saved';
}

function summaryFor(id: string, revision: number): TripSummaryRow {
  return {
    id, title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
    cityCount: 0, dayCount: 2, stopCount: 0, poolCount: 0, revision,
  };
}

// ---------------------------------------------------------------------------
// Rule 1 & 2 — storage issues the version, and it never repeats.
// ---------------------------------------------------------------------------

test('every successful write mints a version storage has never returned before', async () => {
  // ROADMAP F: "Assert over 200 writes across 3 ids interleaved with a delete() — as a
  // ceiling, ZERO repeats, not 'mostly distinct'."
  const storage = memoryStorage();
  const seen = new Set<StorageVersion>();
  const held = new Map<string, StorageVersion | null>([['a', null], ['b', null], ['c', null]]);

  for (let i = 0; i < 200; i++) {
    const id = ['a', 'b', 'c'][i % 3];
    const outcome = await storage.saveIfVersion(id, held.get(id) ?? null, JSON.stringify({ id, revision: i }), summaryFor(id, i));
    assert.equal(outcome.ok, true, `write ${i} to ${id} was refused`);
    if (!outcome.ok) return;
    assert.equal(seen.has(outcome.version), false, `version ${outcome.version} was issued twice`);
    seen.add(outcome.version);
    held.set(id, outcome.version);
    // Interleave a delete: the counter is storage-wide and must not rewind because of one.
    if (i % 37 === 36) {
      await storage.delete(id);
      held.set(id, null);
    }
  }
  assert.equal(seen.size, 200);
});

test('a version issued by one storage is never issued by another (the epoch)', async () => {
  // §2.2a: "clearing site data resets the counter while a tab holding an old token
  // survives, and that is the same ABA one level up."
  const first = memoryStorage(undefined, 'epoch-one');
  const second = memoryStorage(undefined, 'epoch-two');
  const a = await first.saveIfVersion('t', null, '{"id":"t","revision":0}', summaryFor('t', 0));
  const b = await second.saveIfVersion('t', null, '{"id":"t","revision":0}', summaryFor('t', 0));
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  if (!a.ok || !b.ok) return;
  assert.notEqual(a.version, b.version, 'two databases minted the same token');

  // And a token from the first database matches nothing in the second.
  const stale = await second.saveIfVersion('t', a.version, '{"id":"t","revision":1}', summaryFor('t', 1));
  assert.equal(stale.ok, false, "a token from another database was accepted");
});

test('saveIfVersion is atomic: N concurrent writers at one version, exactly one wins', async () => {
  const storage = memoryStorage();
  const seed = await storage.saveIfVersion('t1', null, JSON.stringify({ id: 't1', revision: 7 }), summaryFor('t1', 7));
  assert.equal(seed.ok, true);
  if (!seed.ok) return;

  // Five writers, all holding the same version, all firing before any is awaited.
  const attempts = ['a', 'b', 'c', 'd', 'e'].map((who) =>
    storage.saveIfVersion('t1', seed.version, JSON.stringify({ id: 't1', revision: 8, who }), summaryFor('t1', 8)),
  );
  const outcomes = await Promise.all(attempts);
  const wins = outcomes.filter((o) => o.ok);
  assert.equal(wins.length, 1, 'more than one writer was allowed to win');

  const winner = wins[0];
  assert.equal(winner.ok, true);
  if (!winner.ok) return;
  for (const o of outcomes.filter((o) => !o.ok)) {
    assert.equal(o.ok, false);
    // A refusal names the version it actually FOUND, not the one the caller hoped for.
    assert.equal((o as { storedVersion: StorageVersion | null }).storedVersion, winner.version);
  }
  assert.equal(storage.versions.get('t1'), winner.version);

  // Expect-absent is the same guard: only the first creator of an id may win.
  const creators = await Promise.all(
    ['x', 'y'].map((who) =>
      storage.saveIfVersion('t2', null, JSON.stringify({ id: 't2', revision: 0, who }), summaryFor('t2', 0)),
    ),
  );
  assert.equal(creators.filter((o) => o.ok).length, 1, 'two writers both created the same id');
});

test('load returns the stored document beside its version', async () => {
  const storage = memoryStorage();
  const w = await storage.saveIfVersion('t', null, '{"id":"t","revision":3}', summaryFor('t', 3));
  assert.equal(w.ok, true);
  if (!w.ok) return;
  const stored = await storage.load('t');
  assert.ok(stored, 'load returned null for a stored record');
  assert.equal(stored.doc, '{"id":"t","revision":3}');
  assert.equal(stored.version, w.version, 'load() and saveIfVersion() disagree about the version');
  assert.equal(await storage.load('nothing'), null);
});

test('a seeded record that predates the fence is stamped with a version before any read', async () => {
  // §2.2a: "Records written before this design existed carry no envelope version. The port
  // stamps every such record with a fresh version ... before serving any read."
  const storage = memoryStorage({ old: '{"id":"old","revision":9}' });
  const stored = await storage.load('old');
  assert.ok(stored, 'a pre-existing record disappeared');
  assert.equal(typeof stored.version, 'string');
  assert.notEqual(stored.version, '');
  // And `null` — "nothing is stored here yet" — must not open it.
  const clobber = await storage.saveIfVersion('old', null, '{"id":"old","revision":0}', summaryFor('old', 0));
  assert.equal(clobber.ok, false, 'an upcast record was treated as absent');
});

// ---------------------------------------------------------------------------
// R3-4 — delete then recreate under one id (ABA).
// ---------------------------------------------------------------------------

test('R3-4: a version from a deleted record cannot write to its recreated id', async () => {
  // ROADMAP F: "Run it with the recreated document at the SAME Trip.revision as the deleted
  // one — that exact case returned ok:true in revision 2."
  const storage = memoryStorage();
  const first = await storage.saveIfVersion('x', null, JSON.stringify({ id: 'x', revision: 4, body: 'ORIGINAL' }), summaryFor('x', 4));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const held = first.version;

  await storage.delete('x');
  const recreated = await storage.saveIfVersion('x', null, JSON.stringify({ id: 'x', revision: 4, body: 'NEWCOMER' }), summaryFor('x', 4));
  assert.equal(recreated.ok, true);

  const stale = await storage.saveIfVersion('x', held, JSON.stringify({ id: 'x', revision: 5, body: 'STALE WRITER' }), summaryFor('x', 5));
  assert.equal(stale.ok, false, 'the ABA writer was let in');
  assert.equal(JSON.parse(storage.docs.get('x') as string).body, 'NEWCOMER');
});

test('R3-4: export, delete, restore under the same id — the stale writer is still refused', async () => {
  // The `importDoc` "keep the original id when it is free" path, end to end through the store.
  const storage = memoryStorage();
  const a = createStore({ ports: ports(storage) });
  await a.createTrip(TRIP_INIT);
  const tripId = a.getState().activeTripId as string;
  const dayId = a.getState().doc?.days[0].id as string;
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'BEFORE THE BACKUP' } } as Action);
  await a.flush();
  const backup = await a.exportActive();

  // A second tab is holding this trip open — and therefore holding its version.
  const b = createStore({ ports: ports(storage) });
  await b.openTrip(tripId);

  // The trip is deleted and restored from the backup, which frees and reuses the id.
  await a.deleteTrip(tripId);
  assert.equal(storage.docs.has(tripId), false);
  const restorer = createStore({ ports: ports(storage) });
  await restorer.importDoc(backup);
  await restorer.flush();
  assert.equal(restorer.getState().activeTripId, tripId, 'the restore did not reuse the freed id');
  const restoredDay = restorer.getState().doc?.days[0].id as string;
  restorer.dispatch({ type: 'setDayMeta', dayId: restoredDay, patch: { title: 'AFTER THE RESTORE' } } as Action);
  await restorer.flush();

  // Tab B, still holding the dead record's token, tries to write.
  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'STALE TAB' } } as Action);
  await b.flush();

  assert.equal(b.getState().persistence.status, 'conflict', 'the ABA writer was let in through the store');
  assert.notEqual(saveIndicator(b), 'Saved');
  const stored = core.fromJSON(storage.docs.get(tripId) as string);
  assert.equal(stored.days[0].title, 'AFTER THE RESTORE', "the stale tab overwrote the restored trip");
});

// ---------------------------------------------------------------------------
// R3-1 — undo cannot readmit a refused write.
// ---------------------------------------------------------------------------

/** Two independent stores over ONE storage — the in-Node equivalent of two browser tabs. */
async function twoTabs() {
  const storage = memoryStorage();
  const a = createStore({ ports: ports(storage) });
  await a.createTrip(TRIP_INIT);
  const tripId = a.getState().activeTripId as string;
  const b = createStore({ ports: ports(storage) });
  await b.refreshLibrary();
  await b.openTrip(tripId);
  return { storage, a, b, tripId };
}

test('R3-1: undo cannot readmit a refused write', async () => {
  // ROADMAP F, verbatim: "A saves; B saves and is refused; A presses undo and its autosave
  // completes; then B dispatches another edit and saves. B MUST still be 'conflict', B's
  // indicator string MUST NOT be 'Saved', and storage MUST contain A's document."
  // A and B must start from the same point, and A's undo must land back on EXACTLY the
  // document B still holds — otherwise the scenario never re-offers B's spent token and the
  // test proves nothing. So: A saves 'AGREED', B opens on it, A edits once, A undoes.
  const storage = memoryStorage();
  const a = createStore({ ports: ports(storage) });
  await a.createTrip(TRIP_INIT);
  const tripId = a.getState().activeTripId as string;
  const dayId = a.getState().doc?.days[0].id as string;
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'A ONE' } } as Action);
  await a.flush();

  const b = createStore({ ports: ports(storage) });
  await b.refreshLibrary();
  await b.openTrip(tripId);
  const agreedRevision = b.getState().doc?.revision as number;

  /**
   * The ceiling ROADMAP F asks for — "no moment at which two stores both render 'Saved'
   * while holding different documents" — asserted at every step, in the form that is
   * actually true of a local-first app with no cross-tab notification:
   *
   *   1. a store that has just written MUST NOT read "Saved" unless what it holds is what
   *      is stored. This is R3-1 exactly.
   *   2. two stores that have *both* written MUST NOT both read "Saved" over different
   *      documents. This is R2-1's symptom sentence.
   *
   * A tab that has not written since storage last moved is passively stale and does read
   * "Saved" over an older document. Nothing can tell it otherwise until Phase 2's `SyncPort`
   * exists (§2.2a's Phase 2 row), and no edit is at risk: its next write is refused.
   */
  const written = new Set<string>();
  const holds = (s: typeof a) => core.toJSON(s.getState().doc as core.Trip);
  const ceiling = (where: string) => {
    const stored = storage.docs.get(tripId) as string;
    for (const [name, s] of [['A', a], ['B', b]] as const) {
      if (!written.has(name) || saveIndicator(s) !== 'Saved') continue;
      assert.equal(holds(s), stored, `tab ${name} reads "Saved" over a document that is not stored, ${where}`);
    }
    if (written.has('A') && written.has('B') && saveIndicator(a) === 'Saved' && saveIndicator(b) === 'Saved') {
      assert.equal(holds(a), holds(b), `both tabs read "Saved" over different documents ${where}`);
    }
  };

  written.add('A');
  ceiling('at the start');

  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'A KEEPS TYPING' } } as Action);
  await a.flush();
  ceiling('after A saved again');

  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'B EDIT' } } as Action);
  await b.flush();
  written.add('B');
  assert.equal(b.getState().persistence.status, 'conflict', 'precondition: B must be refused');
  ceiling('after B was refused');

  // A presses Ctrl-Z. The snapshot comes back verbatim — `Trip.revision` and all — and is
  // autosaved. In revision 2 that put a spent revision back into storage, at exactly the
  // number B was still holding, and B's next keystroke walked straight through the guard.
  a.undo();
  await a.flush();
  assert.equal(a.getState().persistence.status, 'idle', "A's own undo was refused");
  assert.equal(a.getState().doc?.revision, agreedRevision,
    'the undo did not land on the revision B holds — the scenario is not testing anything');
  assert.equal(core.fromJSON(storage.docs.get(tripId) as string).days[0].title, 'A ONE');
  ceiling("after A's undo landed");

  // B keeps typing, as a conflicted tab does on every keystroke.
  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'B EDIT AGAIN' } } as Action);
  await b.flush();

  assert.equal(b.getState().persistence.status, 'conflict', "undo readmitted B's refused write");
  assert.notEqual(saveIndicator(b), 'Saved');
  assert.equal(saveIndicator(b), 'Not saved — edited elsewhere');
  assert.equal(b.getState().doc?.days[0].title, 'B EDIT AGAIN', "B's edit vanished from memory");
  assert.equal(core.fromJSON(storage.docs.get(tripId) as string).days[0].title, 'A ONE',
    "storage no longer holds A's document");
  ceiling('at the end');
});

test('R3-1: a rewound Trip.revision never re-issues a spent StorageVersion', async () => {
  // The precise exploit: a refused writer must not later succeed merely because some other
  // operation put an older `Trip.revision` back into storage. Undo, redo and a fresh edit
  // all move `revision` around; none of them may hand back a token already spent.
  const { storage, a, b, tripId } = await twoTabs();
  const dayId = a.getState().doc?.days[0].id as string;
  const bHolds = b.getState().persistence.savedVersion;
  assert.ok(bHolds, 'B never agreed with storage');

  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'ONE' } } as Action);
  await a.flush();
  b.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'B' } } as Action);
  await b.flush();
  assert.equal(b.getState().persistence.status, 'conflict');

  const revisions: number[] = [];
  const versions: (StorageVersion | null)[] = [];
  const step = async (fn: () => void) => {
    fn();
    await a.flush();
    revisions.push(core.fromJSON(storage.docs.get(tripId) as string).revision);
    versions.push(storage.versions.get(tripId) ?? null);
    // B is still refused at every point along the way.
    b.dispatch({ type: 'setDayMeta', dayId, patch: { title: `B ${versions.length}` } } as Action);
    await b.flush();
    assert.equal(b.getState().persistence.status, 'conflict', `B was readmitted at step ${versions.length}`);
    assert.notEqual(saveIndicator(b), 'Saved');
  };

  await step(() => { a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'TWO' } } as Action); });
  await step(() => { a.undo(); });
  await step(() => { a.undo(); });
  await step(() => { a.redo(); });
  await step(() => { a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'THREE' } } as Action); });

  // `Trip.revision` genuinely went backwards — that is allowed, it is content.
  assert.ok(revisions.some((r, i) => i > 0 && r < revisions[i - 1]),
    'the scenario never rewound Trip.revision, so it did not test anything');
  // The fence did not. No version repeats, and none is ever the one B still holds.
  assert.equal(new Set(versions).size, versions.length, 'a StorageVersion was re-issued');
  assert.equal(versions.includes(bHolds), false, "B's spent version came back around");
  assert.equal(b.getState().persistence.savedVersion, bHolds, "B's fence moved without a port result");
});

test('undo and redo do not touch persistence.savedVersion', async () => {
  const p = ports();
  const store = createStore({ ports: p, autosave: false });
  await store.createTrip(TRIP_INIT);
  await store.flush();
  const dayId = store.getState().doc?.days[0].id as string;
  const fence = store.getState().persistence.savedVersion;
  assert.ok(fence);

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'X' } } as Action);
  assert.equal(store.getState().persistence.savedVersion, fence);
  store.undo();
  assert.equal(store.getState().persistence.savedVersion, fence, 'undo moved the write fence');
  store.redo();
  assert.equal(store.getState().persistence.savedVersion, fence, 'redo moved the write fence');
});

test('undo restores the Trip byte-identically, revision included', async () => {
  const store = createStore({ ports: ports() });
  await store.createTrip(TRIP_INIT);
  const dayId = store.getState().doc?.days[0].id as string;
  const before = store.getState().doc;
  assert.ok(before);
  const bytes = core.toJSON(before);
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'CHANGED' } } as Action);
  store.undo();
  const after = store.getState().doc;
  assert.ok(after);
  assert.equal(core.toJSON(after), bytes, 'undo did not restore the document byte-identically');
  assert.equal(after.revision, before.revision, 'undo synthesised a revision — §2.2a forbids this');
});

// ---------------------------------------------------------------------------
// Merge — the merged write carries the version load() returned, not a recomputed one.
// ---------------------------------------------------------------------------

test('a merge cannot write using a stale StorageVersion', async () => {
  // §2.2a: "A third writer landing in between moves the version, the port refuses, the
  // conflict stands unmerged and the edit stays in memory."
  const { storage, a, b, tripId } = await twoTabs();
  const dayA = a.getState().doc?.days[0].id as string;
  const dayB = a.getState().doc?.days[1].id as string;

  a.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'A EDIT' } } as Action);
  await a.flush();
  b.dispatch({ type: 'setDayMeta', dayId: dayB, patch: { title: 'B EDIT' } } as Action);
  await b.flush();
  assert.equal(b.getState().persistence.status, 'conflict');

  // A third writer lands between B's `load()` and B's merged write. The port's `load` is
  // wrapped so the interleaving point is real rather than hoped for.
  const realLoad = storage.load.bind(storage);
  let interleaved = false;
  storage.load = async (id: string) => {
    const out = await realLoad(id);
    if (!interleaved) {
      interleaved = true;
      const held = storage.versions.get(id) ?? null;
      const doc = core.fromJSON(storage.docs.get(id) as string);
      const third = core.setDayMeta(doc, dayA, { title: 'THIRD WRITER' });
      await storage.saveIfVersion(id, held, core.toJSON(third), core.tripSummary(third));
    }
    return out;
  };

  await b.mergeWithStored();
  storage.load = realLoad;

  assert.equal(b.getState().persistence.status, 'conflict', 'the stale merge was written anyway');
  assert.notEqual(saveIndicator(b), 'Saved');
  assert.equal(b.getState().doc?.days[1].title, 'B EDIT', "B's edit was dropped by the refused merge");
  assert.equal(core.fromJSON(storage.docs.get(tripId) as string).days[0].title, 'THIRD WRITER',
    "the merge clobbered the third writer");

  // And the retry, now that nothing is racing, carries B's edit through.
  await b.mergeWithStored();
  assert.equal(b.getState().persistence.status, 'idle');
  const finalDoc = core.fromJSON(storage.docs.get(tripId) as string);
  assert.equal(finalDoc.days[1].title, 'B EDIT');
});

// ---------------------------------------------------------------------------
// Rule 4 — the version is not part of `Trip`.
// ---------------------------------------------------------------------------

test('the StorageVersion never reaches the saved bytes or an export', async () => {
  const p = ports();
  const store = createStore({ ports: p });
  await store.createTrip(TRIP_INIT);
  const dayId = store.getState().doc?.days[0].id as string;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'CONTENT' } } as Action);
  await store.flush();
  const tripId = store.getState().activeTripId as string;

  const version = p.storage.versions.get(tripId) as string;
  assert.ok(version, 'nothing minted a version');

  const bytes = p.storage.docs.get(tripId) as string;
  assert.equal(bytes.includes(version), false, 'the StorageVersion is inside the serialized document');
  const parsed = JSON.parse(bytes) as Record<string, unknown>;
  for (const key of ['version', 'storageVersion', 'savedVersion', 'etag']) {
    assert.equal(key in parsed, false, `the saved bytes carry a "${key}" field`);
  }

  // An export is content: it carries no storage state either.
  const exported = await store.exportActive();
  assert.equal(exported.includes(version), false, 'an exported backup carries storage state');
  // And `toJSON` round-trips unchanged.
  assert.equal(core.toJSON(core.fromJSON(exported)), exported);
});

test('a document round-trips through fromJSON/toJSON with no version field', () => {
  const trip = core.createTrip(TRIP_INIT, {
    ids: { newId: (k: string) => `${k}-1` }, now: TODAY, actorUserId: core.LOCAL_OWNER,
  });
  const text = core.toJSON(trip);
  assert.equal('version' in (JSON.parse(text) as Record<string, unknown>), false);
  assert.equal(core.toJSON(core.fromJSON(text)), text);
});

// ---------------------------------------------------------------------------
// Rule 3 — opacity, asserted on the source (ROADMAP F, "Grep-asserted").
// ---------------------------------------------------------------------------

const CLIENT_SRC = new URL('../src/', import.meta.url);
const clientFiles = [
  'store/store.ts', 'store/reducer.ts', 'store/actions.ts', 'store/derived.ts',
  'ports/types.ts', 'ports/memory.ts', 'selectors/index.ts', 'index.ts', 'deps.ts',
];

test('packages/client compares StorageVersions with === only, and never parses one', () => {
  for (const rel of clientFiles) {
    const src = readFileSync(new URL(rel, CLIENT_SRC), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const bad of [/\bversion\s*[<>]=?[^=]/, /\bversion\s*[-+*/]\s*\d/, /parseInt\s*\(\s*\w*[Vv]ersion/, /JSON\.parse\s*\(\s*\w*[Vv]ersion/]) {
      assert.equal(bad.test(code), false, `${rel} treats a StorageVersion as ordered or parseable: ${bad}`);
    }
  }
});

test('revisionOf() no longer exists anywhere', async () => {
  const client = (await import('../src/index.ts')) as Record<string, unknown>;
  assert.equal('revisionOf' in client, false, 'revisionOf is still exported');
  for (const rel of [...clientFiles, ...['../../../apps/web/src/ports/storage.ts']]) {
    const src = readFileSync(new URL(rel, CLIENT_SRC), 'utf8');
    assert.equal(/revisionOf/.test(src), false, `${rel} still references revisionOf`);
  }
});

test('savedVersion is only ever assigned from a StoragePort result', () => {
  // ROADMAP F: "Grep the store for assignments to it and assert every one traces to a
  // load() or a successful saveIfVersion(); the reducer contains no reference to it at all."
  const store = readFileSync(new URL('store/store.ts', CLIENT_SRC), 'utf8');
  const assigned = [...store.matchAll(/savedVersion:\s*([^,\n}]+)/g)].map((m) => m[1].trim());
  assert.ok(assigned.length > 0, 'the store never assigns savedVersion — did it move?');
  const allowed = new Set(['outcome.version', 'stored.version']);
  for (const rhs of assigned) {
    assert.ok(allowed.has(rhs), `savedVersion is assigned from "${rhs}", which is not a port result`);
  }

  const reducer = readFileSync(new URL('store/reducer.ts', CLIENT_SRC), 'utf8');
  const reducerRefs = [...reducer.matchAll(/savedVersion/g)];
  // Only the type declaration and `initialState()`'s "nothing stored yet" null may name it.
  assert.equal(reducerRefs.length, 2, `the reducer names savedVersion ${reducerRefs.length} times`);
  assert.match(reducer, /savedVersion:\s*StorageVersion\s*\|\s*null;/);
  assert.match(reducer, /savedVersion:\s*null/);
  // And no reducer FUNCTION touches it: undo/redo/reduce/setUi bodies must be clean.
  const bodies = reducer.slice(reducer.indexOf('export function applyAction'));
  assert.equal(/savedVersion/.test(bodies), false, 'a reducer function moves the write fence');
});
