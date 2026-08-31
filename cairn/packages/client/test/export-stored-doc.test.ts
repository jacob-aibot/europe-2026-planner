/**
 * `store.exportStoredDoc(id)` — ARCHITECTURE §2.9 **A-46** Part 4, ROADMAP Phase 2 **I-8e**.
 *
 * The gap it closes, measured by QA **R34-2**: `store` exposed `exportActive()` and nothing
 * else, `exportActive` requires `openTrip`, and `openTrip` is exactly what A-45 made throw for
 * a document carrying a calendar-invalid date. So the only affordance on that card was
 * **Delete**, with the bytes sitting intact in IndexedDB. The brief's *"deletion and export as
 * a designed cascade"* is public-grade-from-day-one, and an export that works only for
 * documents we can already read is not that cascade.
 *
 * Five clauses, and this file is one test per clause:
 *
 *   1. `ports.storage.load(id)` then `ports.file.exportDoc(name, bytes)` — **no new port
 *      method**, and the text is returned even when `ports.file` is absent, which is what makes
 *      it checkable in bare Node.
 *   2. The bytes are `stored.doc` **verbatim** — no re-serialisation, no normalisation, no
 *      repair, no envelope, no `StorageVersion` (§2.2a rule 4). Any transformation would be a
 *      guess about a document we have just said we cannot read.
 *   3. The filename is deliberately **not** a backup's: `.cairn-unreadable.json`.
 *   4. **No ownership check**, stated rather than skipped — parsing is the thing that fails, and
 *      this is safe only while storage is single-owner (`LOCAL_OWNER`).
 *   5. It touches no state: no flush, no `set()`, no transition, no `activeTripId`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler, core,
} from '../src/index.ts';
import type { Ports } from '../src/ports/types.ts';

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
 * The exact population A-46 is about: a document that was written before A-45 and carries a
 * date `fromJSON` now refuses. Written straight into storage, because no shipped write path
 * can mint one any more — which is the point.
 */
async function storeWithUnreadableDoc() {
  const p = ports();
  const store = createStore({ ports: p });
  const state = await store.createTrip(TRIP_INIT);
  const id = state.doc!.id;
  await store.flush();
  await store.closeTrip();
  const stored = await p.storage.load(id);
  assert.ok(stored, 'the trip was not stored');
  const mangled = JSON.stringify({ ...JSON.parse(stored.doc), startDate: '2026-02-30' });
  p.storage.docs.set(id, mangled);
  await store.refreshLibrary();
  return { p, store, id, mangled };
}

test('A-46 Part 4: a trip that cannot be opened can still be saved — the exact stored bytes', async () => {
  const { p, store, id, mangled } = await storeWithUnreadableDoc();

  // The premise, asserted rather than assumed: this document really is unopenable.
  await assert.rejects(
    () => store.openTrip(id),
    /calendar date/,
    'A-45 no longer refuses this document, so this test is not driving the population it is about',
  );

  const before = store.getState();
  const text = await store.exportStoredDoc(id);

  assert.equal(text, mangled, 'the export is not byte-for-byte what was stored');
  assert.equal(p.file!.exported.length, 1, 'the FilePort was not handed the document');
  assert.equal(p.file!.exported[0].text, mangled, 'the bytes handed to the FilePort are not the stored bytes');

  // …and it is genuinely unreadable, so this is a rescue copy and not a backup (Part 3 below).
  assert.throws(() => core.fromJSON(text), /calendar date/);

  const after = store.getState();
  assert.equal(after.activeTripId, before.activeTripId, 'exportStoredDoc moved activeTripId');
  assert.equal(after.doc, before.doc, 'exportStoredDoc opened a document');
  assert.deepEqual(after.library, before.library, 'exportStoredDoc rewrote the library');
  assert.deepEqual(after.persistence, before.persistence, 'exportStoredDoc touched persistence');
});

test('A-46 Part 4: no parse — a document that is not even JSON comes back verbatim', async () => {
  const p = ports();
  const store = createStore({ ports: p });
  p.storage.docs.set('t-raw', '{ this is not JSON at all');
  const text = await store.exportStoredDoc('t-raw');
  assert.equal(text, '{ this is not JSON at all');
  assert.equal(p.file!.exported[0].text, '{ this is not JSON at all');
});

test('A-46 Part 4: it writes nothing — storage is untouched and the record still parses the same', async () => {
  const { p, store, id, mangled } = await storeWithUnreadableDoc();
  const savesBefore = p.storage.saveCount;
  const versionBefore = p.storage.versions.get(id);
  await store.exportStoredDoc(id);
  assert.equal(p.storage.saveCount, savesBefore, 'exportStoredDoc wrote to storage');
  assert.equal(p.storage.versions.get(id), versionBefore, 'exportStoredDoc moved the storage fence');
  assert.equal(p.storage.docs.get(id), mangled, 'exportStoredDoc rewrote the stored document');
});

test('A-46 Part 4: it does not disturb an open trip — no flush, no transition', async () => {
  const { p, store, id } = await storeWithUnreadableDoc();
  // A second, perfectly readable trip, open.
  const open = await store.createTrip({ ...TRIP_INIT, title: 'Japan 2027' });
  const openId = open.doc!.id;
  const beforeDoc = store.getState().doc;

  const text = await store.exportStoredDoc(id);
  assert.match(text, /2026-02-30/);

  const after = store.getState();
  assert.equal(after.activeTripId, openId, 'the open trip changed');
  assert.equal(after.doc, beforeDoc, 'the open document was replaced');
  assert.equal(p.file!.exported.length, 1, 'the wrong document was exported');
  assert.match(p.file!.exported[0].name, /europe-2026\.cairn-unreadable\.json$/);
});

test('A-46 Part 3: the filename says it is a rescue copy, not a backup', async () => {
  const { p, store, id } = await storeWithUnreadableDoc();
  await store.exportStoredDoc(id);
  const { name } = p.file!.exported[0];
  assert.ok(name.endsWith('.cairn-unreadable.json'), `${name} does not name itself a rescue copy`);
  assert.ok(!name.endsWith('.cairn.json'), `${name} is indistinguishable from a backup`);
  // Slugged from the row's title exactly as `exportActive` slugs the open document's.
  assert.equal(name, 'europe-2026.cairn-unreadable.json');
});

test('A-46 Part 3: the rescue copy is refused by restore, with A-45\'s message and its path', async () => {
  const { p, store, id } = await storeWithUnreadableDoc();
  const text = await store.exportStoredDoc(id);
  // Feeding it back through "Restore from a backup" must refuse — a rescue file that silently
  // looked restorable would be the promise broken one screen later.
  await assert.rejects(() => store.importDoc(text), (e: Error) => {
    assert.match(e.message, /calendar date/);
    assert.match(e.message, /\$\.startDate/);
    return true;
  });
  assert.equal(p.storage.docs.size, 1, 'a refused restore still wrote something');
});

test('A-46 Part 4: with no FilePort the text still comes back — checkable in bare Node', async () => {
  const p = ports(memoryStorage(), undefined);
  const store = createStore({ ports: p });
  p.storage.docs.set('t-nofile', '{"id":"t-nofile"}');
  assert.equal(await store.exportStoredDoc('t-nofile'), '{"id":"t-nofile"}');
});

test('A-46 Part 4: nothing stored under that id throws, rather than exporting an empty file', async () => {
  const p = ports();
  const store = createStore({ ports: p });
  await assert.rejects(() => store.exportStoredDoc('t-nope'), /nothing is stored|no stored/i);
  assert.equal(p.file!.exported.length, 0, 'an empty file was handed to the FilePort');
});

/**
 * A-46 Part 4, stated rather than skipped: **no ownership check on this path**. `importDoc`
 * already refuses a foreign `ownerId`, so Phase 1 storage holds only this user's documents, and
 * the check cannot be performed anyway — parsing is the thing that fails. This test exists so
 * the absence is deliberate and greppable, and so **Phase 3 breaks here**: the moment accounts
 * can put another person's document on the device, this is the line that must be revisited.
 */
test('A-46 Part 4: no ownership check — and storage is single-owner, which is what makes that safe', async () => {
  const p = ports();
  const store = createStore({ ports: p });
  const foreign = JSON.stringify({ id: 't-foreign', ownerId: 'user:someone-else', title: 'Not mine' });
  p.storage.docs.set('t-foreign', foreign);
  assert.equal(await store.exportStoredDoc('t-foreign'), foreign);
  // The invariant this rests on: nothing but `importDoc`/`createTrip` puts documents here, and
  // `importDoc` refuses a foreign owner outright.
  assert.equal(core.LOCAL_OWNER, 'local:self');
  const mine = core.fromJSON(core.toJSON((await store.createTrip(TRIP_INIT)).doc!));
  const theirs = core.toJSON({ ...mine, id: 'trip-marta', ownerId: 'user:marta' });
  await assert.rejects(() => store.importDoc(theirs), (e: Error) => {
    assert.equal(e.name, 'ForeignDocumentError');
    return true;
  });
});
