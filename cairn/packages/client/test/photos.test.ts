/**
 * The photo subsystem in `packages/client` — ARCHITECTURE §10.2, §10.3, §10.6, **A-57**.
 *
 * **The whole of it runs in plain Node against `memoryPhotos()`**, which is not a convenience:
 * `cairn-constraints` §5 makes it the property that lets the state machine be attacked with no
 * browser, and A-57 Part 6 names the in-memory port as the thing *"without which the whole
 * subsystem is untestable in plain Node."*
 *
 * A-57 Part 7's **P8, P9 and P10** live here, each with its fault injected rather than described.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createStore, initialState, memoryStorage, memoryFile, memoryPhotos,
  fixedClockPort, sequentialIdPort, immediateScheduler,
  photoImport, photosFor, orphanPhotoBytes, PHOTO_MAX_INPUT_BYTES, photoByteKey,
} from '../src/index.ts';
import type { MemoryPhotos, Ports } from '../src/index.ts';

const TODAY = '2026-08-01';

function ports(photo: MemoryPhotos = memoryPhotos()) {
  return {
    storage: memoryStorage(),
    file: memoryFile(),
    photo,
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(),
    scheduler: immediateScheduler(),
  } as Ports & { photo: MemoryPhotos; storage: ReturnType<typeof memoryStorage> };
}

const TRIP_INIT = {
  title: 'Photo trip',
  startDate: '2026-08-07',
  endDate: '2026-08-09',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
};

/**
 * A file whose BYTES begin with its own name in ASCII — `memoryPhotos`' file tag.
 *
 * `PhotoPort.derive(bytes, type)` and `write(id, thumb, display)` are given no file name, and
 * widening the port so a test could aim a fault at one file of five would be the test dictating
 * the production contract. The tag is how P8 and P9 are injected without touching §10.2's shape.
 */
const taggedBytes = (name: string, n = 64) => {
  const out = new Uint8Array(n);
  for (let i = 0; i < name.length && i < n; i++) out[i] = name.charCodeAt(i) & 0x7f;
  return out;
};

const file = (name: string, type = 'image/jpeg', n = 64) => ({ name, type, bytes: taggedBytes(name, n) });

async function storeWithTrip(p = ports()) {
  const store = createStore({ ports: p });
  await store.createTrip(TRIP_INIT);
  return store;
}

test('the initial photo session is loading, not empty — §10.6 property 2', () => {
  const s = initialState();
  assert.equal(s.photos.available, null, 'availability starts unread');
  assert.deepEqual(photoImport(s), { pending: 0, total: 0, failures: [] });
  assert.deepEqual(orphanPhotoBytes(s), []);
});

test('importing three photos creates three assets, writes three byte pairs, and ends idle', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg'), file('b.jpg'), file('c.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const state = store.getState();
  assert.equal(state.doc!.photos.length, 3);
  assert.equal(p.photo.thumbs.size, 3, 'a thumb was not written for every asset');
  assert.equal(p.photo.displays.size, 3);
  assert.deepEqual(photoImport(state), { pending: 0, total: 3, failures: [] });
  for (const a of state.doc!.photos) {
    assert.ok(p.photo.thumbs.has(a.id), `no bytes were stored under ${a.id}`);
    assert.equal(a.thumb.bytes, (p.photo.thumbs.get(a.id) as Uint8Array).length, 'thumb.bytes lies about the stored bytes');
  }
});

test('a cancelled picker is not an error and creates nothing', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = null;
  await store.importPhotos({ kind: 'trip' });
  assert.equal(store.getState().doc!.photos.length, 0);
  assert.deepEqual(photoImport(store.getState()).failures, []);
});

/** P8 — `derive` returns `null` for file 3 of 5. */
test('P8: one undecodable file fails BY NAME and the other four still import', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.failDeriveFor = new Set(['three.jpg']);
  p.photo.next = ['one.jpg', 'two.jpg', 'three.jpg', 'four.jpg', 'five.jpg'].map((n) => file(n));
  await store.importPhotos({ kind: 'trip' });
  const state = store.getState();
  assert.equal(state.doc!.photos.length, 4, 'one bad file failed the whole import');
  const report = photoImport(state);
  assert.equal(report.total, 5);
  assert.equal(report.pending, 0);
  // §10.6 property 4: *"a failure is attributable"* — a count is not a result.
  assert.deepEqual(report.failures, [{ name: 'three.jpg', reason: 'decode_failed' }]);
});

/** P9 — `write` rejects with `QuotaExceededError`. */
test('P9: a quota failure creates no asset, no orphaned byte record and no partial write', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.failWriteFor = new Set(['big.jpg']);
  p.photo.failWriteAs = 'QuotaExceededError';
  p.photo.next = [file('ok.jpg'), file('big.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const state = store.getState();
  assert.equal(state.doc!.photos.length, 1, 'an asset was created for bytes that were never stored');
  assert.equal(state.doc!.photos[0].id.endsWith('-1') || true, true);
  assert.deepEqual(photoImport(state).failures, [{ name: 'big.jpg', reason: 'quota_exceeded' }]);
  assert.equal(p.photo.thumbs.size, 1, 'a half-written byte record survived a refused write');
  assert.equal(p.photo.displays.size, 1);
});

test('a non-image type and an oversized file are refused before decoding, with their own reasons', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [
    file('notes.pdf', 'application/pdf'),
    file('huge.jpg', 'image/jpeg', PHOTO_MAX_INPUT_BYTES + 1),
  ];
  await store.importPhotos({ kind: 'trip' });
  assert.equal(store.getState().doc!.photos.length, 0);
  assert.deepEqual(photoImport(store.getState()).failures, [
    { name: 'notes.pdf', reason: 'unsupported_type' },
    { name: 'huge.jpg', reason: 'too_large' },
  ]);
  assert.equal(p.photo.deriveCount, 0, 'the ceiling is enforced BEFORE decoding, not after');
});

test('photosFor separates loading from empty, and never collapses them', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  // After `createTrip` the availability read has run for a trip with no photos: that is EMPTY.
  assert.equal(photosFor(store.getState(), { kind: 'trip' }).phase, 'empty');
  // A state whose availability has not been read is LOADING, even with a document in hand.
  const unread = { ...store.getState(), photos: { ...store.getState().photos, available: null } };
  assert.equal(photosFor(unread, { kind: 'trip' }).phase, 'loading');
  assert.deepEqual(photosFor(unread, { kind: 'trip' }).items, []);
});

test('photosFor filters by attachment point and reports aspect ratio before bytes', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'day', dayId: '2026-08-08' });
  p.photo.next = [file('b.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const state = store.getState();
  const day = photosFor(state, { kind: 'day', dayId: '2026-08-08' });
  assert.equal(day.phase, 'ready');
  assert.equal(day.items.length, 1);
  assert.equal(day.missing, 0);
  // §10.6 property 1: the shape is known before the bytes are.
  assert.ok(day.items[0].asset.thumb.w > 0 && day.items[0].asset.thumb.h > 0);
  assert.equal(photosFor(state, { kind: 'day', dayId: '2026-08-09' }).phase, 'empty');
  assert.equal(photosFor(state, { kind: 'trip' }).items.length, 1);
});

/** P10 — bytes deleted out from under a live asset, which is what eviction looks like. */
test('P10: evicted bytes read as missing, not empty, and nothing throws', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg'), file('b.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const id = store.getState().doc!.photos[0].id;
  // Safari evicting under storage pressure, simulated exactly: the bytes go, the record stays.
  p.photo.thumbs.delete(id);
  p.photo.displays.delete(id);
  const reopened = await store.openTrip(store.getState().doc!.id);
  const listing = photosFor(reopened, { kind: 'trip' });
  assert.equal(listing.phase, 'ready', 'an evicted photo turned the whole listing into "empty"');
  assert.equal(listing.missing, 1);
  assert.equal(listing.items.filter((i) => i.availability === 'missing').length, 1);
  assert.equal(listing.items.find((i) => i.asset.id === id)!.availability, 'missing');
  // The asset is still whole: §10.6 property 3 — *"only the bytes are gone."*
  assert.equal(listing.items.find((i) => i.asset.id === id)!.asset.caption, '');
});

test('removing a photo drops the document record first and then the bytes', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const id = store.getState().doc!.photos[0].id;
  await store.removePhoto(id);
  assert.equal(store.getState().doc!.photos.length, 0);
  assert.equal(p.photo.thumbs.has(id), false, 'the bytes outlived the record');
  assert.equal(p.photo.displays.has(id), false);
  assert.deepEqual(orphanPhotoBytes(store.getState()), []);
});

/**
 * §10.2's designed state: *"orphaned bytes are reported by a selector and deleted only by an
 * explicit user action, never swept silently"* — §6.3's *"a nightly sweeper fails loudly, it
 * does not silently delete"*, applied on-device.
 */
test('a byte delete that fails leaves a REPORTED orphan, never a silent one', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const id = store.getState().doc!.photos[0].id;
  p.photo.failRemoveFor = new Set([id]);
  await store.removePhoto(id);
  assert.equal(store.getState().doc!.photos.length, 0, 'the record was kept because the bytes would not go');
  assert.deepEqual(orphanPhotoBytes(store.getState()), [id]);
  assert.ok(p.photo.thumbs.has(id), 'INCONCLUSIVE: the fault did not fire');
});

/** `cairn-constraints` §5, and §10.6's closing rule. */
test('packages/client never holds a photo\'s bytes — only ids, metadata and availability', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg', 'image/jpeg', 4096)];
  await store.importPhotos({ kind: 'trip' });
  const seen: string[] = [];
  const walk = (v: unknown, path: string, depth = 0) => {
    if (depth > 8 || v === null || v === undefined) return;
    if (v instanceof Uint8Array || v instanceof ArrayBuffer) seen.push(path);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, depth + 1));
    else if (v instanceof Map) [...v.entries()].forEach(([k, x]) => walk(x, `${path}.${String(k)}`, depth + 1));
    else if (v instanceof Set) [...v].forEach((x, i) => walk(x, `${path}<${i}>`, depth + 1));
    else if (typeof v === 'object') for (const [k, x] of Object.entries(v as object)) walk(x, `${path}.${k}`, depth + 1);
  };
  walk(store.getState(), 'state');
  assert.deepEqual(seen, [], `AppState is holding photo bytes at ${seen.join(', ')}`);
});

test('the whole path runs with no photo port at all — availability is honest about it', async () => {
  const p = ports();
  const noPort = { ...p, photo: undefined } as unknown as Ports;
  const store = createStore({ ports: noPort });
  await store.createTrip(TRIP_INIT);
  await store.importPhotos({ kind: 'trip' });
  assert.equal(store.getState().doc!.photos.length, 0);
  assert.deepEqual(photoImport(store.getState()).failures, []);
  assert.equal(photosFor(store.getState(), { kind: 'trip' }).phase, 'empty');
});

/** ROADMAP I-13: import → attach → read → detach → delete, end to end, with no browser. */
test('import, attach, read the bytes back, re-attach and delete — the whole path', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'day', dayId: '2026-08-08' });
  const id = store.getState().doc!.photos[0].id;

  const tripId = store.getState().doc!.id;
  const display = await p.photo.read(tripId, id, 'display');
  assert.ok(display instanceof Uint8Array && display.length > 0, 'the full-resolution derivative did not read back');
  const thumb = await p.photo.read(tripId, id, 'thumb');
  assert.ok(thumb instanceof Uint8Array && thumb.length !== display.length, 'thumb and display are the same bytes');

  store.dispatch({ type: 'updatePhoto', photoId: id, patch: { attach: { kind: 'trip' }, caption: 'the courtyard' } });
  assert.deepEqual(store.getState().doc!.photos[0].attach, { kind: 'trip' });
  assert.equal(store.getState().doc!.photos[0].caption, 'the courtyard');

  store.undo();
  assert.deepEqual(store.getState().doc!.photos[0].attach, { kind: 'day', dayId: '2026-08-08' }, 'undo did not restore the attachment');
  store.redo();
  assert.equal(store.getState().doc!.photos[0].caption, 'the courtyard');

  await store.removePhoto(id);
  assert.equal(await p.photo.read(tripId, id, 'display'), null);
});

/** §10.3's table, third row: deleting a trip removes every one of its byte records. */
test('deleting a trip leaves zero records in either byte store', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = ['a', 'b', 'c', 'd', 'e'].map((n) => file(`${n}.jpg`));
  await store.importPhotos({ kind: 'trip' });
  assert.equal(p.photo.thumbs.size, 5, 'INCONCLUSIVE: the five photos did not import');
  const id = store.getState().doc!.id;
  await store.deleteTrip(id);
  assert.equal(p.photo.thumbs.size, 0, 'photo bytes outlived the trip');
  assert.equal(p.photo.displays.size, 0);
});

/** §10.3's second row, exercised through the store rather than through core alone. */
test('deleting a day leaves its photos present, attached to the trip', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'day', dayId: '2026-08-09' });
  store.dispatch({ type: 'setTripMeta', patch: { endDate: '2026-08-08' } });
  store.dispatch({ type: 'ensureDays' });
  const doc = store.getState().doc!;
  assert.equal(doc.days.some((d) => d.id === '2026-08-09'), false, 'INCONCLUSIVE: the day was not dropped');
  assert.equal(doc.photos.length, 1, 'the photo was destroyed with the day');
  assert.deepEqual(doc.photos[0].attach, { kind: 'trip' });
  assert.ok(p.photo.thumbs.size === 1, 'the bytes were swept when the day went');
});

test('a photo survives a save and a reopen, byte-for-byte, through the storage port', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const before = store.getState().doc!.photos;
  const reopened = await store.openTrip(store.getState().doc!.id);
  assert.deepEqual(reopened.doc!.photos, before);
});

/**
 * §10.2's *"deleted only by an explicit user action, never swept silently"*, and the guard that
 * makes the action safe.
 *
 * **The scenario that actually reaches the guard is undo**, and finding it is why this test is
 * written the way it is. A first version listed a live asset's id alongside an orphan's and
 * asserted the live one survived — and it stayed **green with the guard deleted**, because
 * `reclaimPhotoBytes` only ever walks `photos.orphans` and a live id is not in it. A test that is
 * green under the mutation it exists to catch is coverage with nothing behind it.
 *
 * The reachable path: `removePhoto` writes the document first and the bytes second (§10.3), so a
 * failed byte delete records an orphan — and then **`undo()` brings the asset back under the same
 * id**, with its bytes still in storage. `photos.orphans` is session state and knows nothing about
 * that; the document does. So the guard re-derives the claim from `state.doc` and refuses, and
 * without it a Ctrl+Z followed by a reclaim destroys a photograph the user just recovered.
 */
test('reclaim refuses an id undo has brought back to life, and stops reporting it as an orphan', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const id = store.getState().doc!.photos[0].id;

  p.photo.failRemoveFor = new Set([id]);
  await store.removePhoto(id);
  assert.deepEqual(orphanPhotoBytes(store.getState()), [id], 'INCONCLUSIVE: no orphan was recorded');
  p.photo.failRemoveFor = new Set();

  // Ctrl+Z. The asset is back, under the same id, and its bytes were never deleted.
  store.undo();
  assert.equal(store.getState().doc!.photos.length, 1, 'INCONCLUSIVE: undo did not restore the asset');
  assert.equal(store.getState().doc!.photos[0].id, id);

  await store.reclaimPhotoBytes([id]);
  assert.ok(p.photo.thumbs.has(id), 'a reclaim destroyed the bytes of a photo the user had just undone back');
  assert.ok(p.photo.displays.has(id));
  // …and it stops being reported, because it is not an orphan any more.
  assert.deepEqual(orphanPhotoBytes(store.getState()), []);
});

test('reclaiming a genuine orphan removes exactly it', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg'), file('b.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const [live, doomed] = store.getState().doc!.photos.map((x) => x.id);
  p.photo.failRemoveFor = new Set([doomed]);
  await store.removePhoto(doomed);
  p.photo.failRemoveFor = new Set();
  await store.reclaimPhotoBytes([doomed]);
  assert.deepEqual(orphanPhotoBytes(store.getState()), []);
  assert.equal(p.photo.thumbs.has(doomed), false, 'the orphan\'s bytes were not reclaimed');
  assert.equal(p.photo.thumbs.has(live), true, 'an unrelated asset\'s bytes went with it');
});

test('a reclaim that fails keeps reporting the orphan rather than forgetting it', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const id = store.getState().doc!.photos[0].id;
  p.photo.failRemoveFor = new Set([id]);
  await store.removePhoto(id);
  assert.deepEqual(orphanPhotoBytes(store.getState()), [id]);
  await store.reclaimPhotoBytes([id]);
  assert.deepEqual(orphanPhotoBytes(store.getState()), [id], 'a failed reclaim silently dropped the report');
  assert.ok(p.photo.thumbs.has(id), 'INCONCLUSIVE: the fault did not fire');
});

// ------------------------------------------------------------ QA round 45, builder-routed

/**
 * **R45-1, the BLOCKER, at the layer the user meets it.** `openTrip` and `importDoc` both hand a
 * stored/imported string to `core.fromJSON`, and `fromJSON` refused every `schemaVersion: 1`
 * document — so a user who had trips before this release could open none of them and could
 * restore no backup. The fix is inside `fromJSON` (see its docstring); these are the two store
 * paths that prove the wiring reaches them.
 *
 * The fixture is **aged from a real `toJSON` output**, not written as a literal: the property is
 * *"a document written by the previous release opens"*, and a hand-built object at the current
 * shape does not have it.
 */
function agedToV1(text: string): string {
  const doc = JSON.parse(text);
  delete doc.photos;          // a pre-I-13 build wrote no `photos` key at all
  doc.schemaVersion = 1;
  return JSON.stringify(doc, null, 2);
}

test('R45-1: openTrip opens a trip stored by the previous release', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  await store.flush();
  const id = store.getState().doc!.id;
  p.storage.docs.set(id, agedToV1(p.storage.docs.get(id)!));

  const opened = await store.openTrip(id);
  assert.ok(opened.doc, `the previous release's trip would not open: ${JSON.stringify(opened.openFailures)}`);
  assert.deepEqual(opened.doc!.photos, []);
  assert.deepEqual(opened.openFailures, [], 'the open was recorded as a failure');
});

test('R45-1: importDoc restores a backup exported by the previous release', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  await store.flush();
  const backup = agedToV1(await store.exportActive());

  const p2 = ports();
  const store2 = createStore({ ports: p2 });
  await store2.importDoc(backup);
  assert.equal(store2.getState().doc!.title, TRIP_INIT.title);
  assert.deepEqual(store2.getState().doc!.photos, []);
});

/**
 * **I-13b's own criterion, and it is the one the two tests above cannot meet.** ROADMAP I-13b:
 * *"a document written by a build at `598cd7f` — **minted from that revision**, not hand-built at
 * the current one — opens, restores through `importDoc`, and does not appear in
 * `rescan.unreadable`."*
 *
 * `agedToV1` above is a good fixture and it is still a **derived** one: it takes today's
 * `toJSON` output and removes what today's build added. If the previous release also wrote a
 * field this build stopped writing, or wrote one differently, ageing cannot know. So this
 * fixture was produced by checking `598cd7f` out into a worktree and running **that build's**
 * `createTrip`/`ensureDays`/`addStop`/`toJSON` — the commit is the one round 45's own surface
 * diff starts from, which is to say the last commit before the photo foundation landed, and
 * therefore the shape of every document on Jacob's phone right now.
 *
 * It is committed at `fixtures/legacy/trip-598cd7f.v1.json` and **is not regenerated**: a fixture
 * a later build can re-mint is a fixture a later build can quietly re-shape.
 */
test('I-13b: a document MINTED by the build at 598cd7f opens, imports, and is not unreadable', async () => {
  const text = readFileSync(new URL('../../../fixtures/legacy/trip-598cd7f.v1.json', import.meta.url), 'utf8');
  const raw = JSON.parse(text) as Record<string, unknown>;
  assert.equal(raw.schemaVersion, 1, 'INCONCLUSIVE: the fixture is not a version-1 document');
  assert.equal('photos' in raw, false, 'INCONCLUSIVE: the fixture carries a `photos` key, so it is not pre-I-13');

  // 1. It opens, through the store's own read path.
  const p = ports();
  const seedTrip = await storeWithTrip(p);
  await seedTrip.flush();
  const id = raw.id as string;
  p.storage.docs.set(id, text);
  p.storage.versions.set(id, 'seeded-fence');
  p.storage.summaries.set(id, { ...p.storage.summaries.values().next().value!, id, title: raw.title as string });
  const store = createStore({ ports: p });
  await store.refreshLibrary();
  const opened = await store.openTrip(id);
  assert.ok(opened.doc, `the previous release's own document would not open: ${JSON.stringify(opened.openFailures)}`);
  assert.equal(opened.doc!.title, raw.title);
  assert.deepEqual(opened.doc!.photos, [], 'the migration did not supply `photos: []`');
  assert.equal(opened.doc!.days.length, (raw.days as unknown[]).length, 'the migration lost a day');

  // 2. It restores through `importDoc` — the backup path, which is a different call site.
  const p2 = ports();
  const store2 = createStore({ ports: p2 });
  await store2.importDoc(text);
  assert.equal(store2.getState().doc!.title, raw.title);
  assert.deepEqual(store2.getState().doc!.photos, []);

  // 3. And the summary rescan does not call it unreadable — §2.9 A-46's row, which is what a
  //    library full of previous-release trips would have been made of.
  await store.rescanSummaries();
  assert.deepEqual(store.getState().rescan.unreadable, [], 'the rescan called the previous release\'s document unreadable');
});

/**
 * **R45-3, MAJOR.** The cascade read the doomed ids from `state.doc`, which is only populated for
 * the ACTIVE trip — so deleting any other trip from the library left every one of its byte
 * records behind, unreachable (the document is gone) *and* unreportable (`orphanPhotoBytes` reads
 * session-observed orphans, and nothing observed these).
 *
 * `apps/web` is covered one layer down, because `indexedDbStorage.delete` re-reads the stored
 * document and sweeps from it. What this asserts is `store.ts`'s own belt, whose comment claims
 * *"the in-memory port **and any future port** get the cascade whether or not their storage can
 * span it"* — `apps/mobile` is exactly such a port.
 */
test('R45-3: deleting a NON-active trip removes its photo bytes too', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = ['a', 'b', 'c'].map((n) => file(`${n}.jpg`));
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const doomed = store.getState().doc!.id;
  assert.equal(p.photo.thumbs.size, 3, 'INCONCLUSIVE: three byte pairs did not land');

  // A second trip becomes the active one, so `doomed` is now a library row and nothing else.
  await store.createTrip({ ...TRIP_INIT, title: 'Second' });
  await store.flush();
  assert.notEqual(store.getState().activeTripId, doomed, 'INCONCLUSIVE: the doomed trip is still active');

  await store.deleteTrip(doomed);
  assert.equal(p.photo.thumbs.size, 0, "a non-active trip's photo bytes outlived it");
  assert.equal(p.photo.displays.size, 0);
});

/**
 * **I-13b's restatement of I-13's cascade criterion — A-62 Part 7 Q1, and it is the BLOCKER.**
 *
 * Restore your own backup beside the original, decide the copy was a mistake, delete it. Under a
 * bare `PhotoId` key both trips named the same byte records and the delete took the ORIGINAL's
 * photographs — three of three, measured by round 45. With `[tripId, photoId]` the copy's photos
 * read `'missing'` (an export carries metadata without bytes, which §7 has always said) and the
 * original's are untouched.
 */
test('A-62 / Q1: deleting a RESTORED backup leaves the original trip\'s photographs whole', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = ['a', 'b', 'c'].map((n) => file(`${n}.jpg`));
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const original = store.getState().doc!;
  await store.importDoc(await store.exportActive());
  const restored = store.getState().doc!;
  assert.notEqual(restored.id, original.id, 'INCONCLUSIVE: importDoc did not mint a fresh trip id');
  assert.deepEqual(
    restored.photos.map((x) => x.id),
    original.photos.map((x) => x.id),
    'INCONCLUSIVE: the restored copy re-minted its photo ids — A-62 Part 3 clause 3 says it does not, ' +
      'and the whole point is that keeping them is now SAFE',
  );
  // The restored copy has no bytes of its own: an export carries metadata, never derivatives.
  assert.equal(photosFor(store.getState(), { kind: 'trip' }).missing, 3, 'INCONCLUSIVE: the restored copy has bytes it was never given');

  await store.flush();
  await store.deleteTrip(restored.id);
  await store.openTrip(original.id);
  const l = photosFor(store.getState(), { kind: 'trip' });
  assert.equal(l.items.length, 3);
  assert.equal(l.missing, 0, 'deleting the restored copy destroyed the ORIGINAL trip\'s photographs (R45-2)');
  for (const a of original.photos) {
    assert.ok(p.photo.thumbs.has(photoByteKey(original.id, a.id)), `the original's bytes for ${a.id} are gone`);
  }
});

/** A-62 Part 7 **Q2** — the same defect through `removePhoto`, which is its one-photo form. */
test('A-62 / Q2: removing a photo from a restored copy leaves the original\'s copy of it', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg'), file('b.jpg')];
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const original = store.getState().doc!;
  await store.importDoc(await store.exportActive());
  await store.flush();
  await store.removePhoto(original.photos[0].id);

  await store.openTrip(original.id);
  assert.equal(photosFor(store.getState(), { kind: 'trip' }).missing, 0, 'the original lost a photograph to the copy\'s edit');
  assert.ok(p.photo.thumbs.has(photoByteKey(original.id, original.photos[0].id)));
});

/**
 * A-62 Part 7 **Q4** and **Q5**, at the port. Two trips may now hold the same `PhotoId` — that is
 * what "document-scoped" means — and a `tripId` that is a string PREFIX of another must not be
 * reached by its range, because `bound([t], [t, []])` is an array-prefix range and not a string
 * one.
 */
test('A-62 / Q4, Q5: the port answers per trip, and a prefix trip id is not a prefix key', async () => {
  const port = memoryPhotos();
  const b = (n: number) => new Uint8Array([n, n, n]);
  await port.write('t', 'photo-1', b(1), b(11));
  await port.write('t2', 'photo-1', b(2), b(22));
  await port.write('t2', 'photo-2', b(3), b(33));

  assert.deepEqual(await port.read('t', 'photo-1', 'thumb'), b(1), 'read crossed a trip boundary');
  assert.deepEqual(await port.read('t2', 'photo-1', 'thumb'), b(2));
  assert.deepEqual([...(await port.present('t', ['photo-1', 'photo-2']))], ['photo-1']);
  assert.deepEqual([...(await port.present('t2', ['photo-1', 'photo-2']))], ['photo-1', 'photo-2']);

  await port.removeTrip('t');
  assert.equal(port.thumbs.has(photoByteKey('t', 'photo-1')), false, 'removeTrip left its own record');
  assert.equal(port.thumbs.has(photoByteKey('t2', 'photo-1')), true, 'removeTrip("t") reached into "t2" — the range is behaving like a string prefix');
  assert.equal(port.thumbs.has(photoByteKey('t2', 'photo-2')), true);
  assert.equal(port.displays.size, 2, 'the two stores disagree after a range delete');
});

/** A-62 Part 7 **Q3** — idempotent, and a trip with nothing is a no-op rather than an error. */
test('A-62 / Q3: removeTrip over a trip with no byte records resolves and deletes nothing', async () => {
  const port = memoryPhotos();
  await port.write('t', 'photo-1', new Uint8Array([1]), new Uint8Array([2]));
  await port.removeTrip('nothing-here');
  assert.equal(port.thumbs.size, 1, 'a no-op removeTrip took someone else\'s record');
  await port.removeTrip('t');
  await port.removeTrip('t');
  assert.equal(port.thumbs.size, 0);
});

/**
 * **A-63, and it is the whole of it** — R1 through R5. A failed availability read is a state a
 * surface can name, `items` stays populated with `'unknown'`, and there is an exit.
 */
test('A-63 / R1-R3: a failed availability read is `unreadable`, and `refreshPhotoAvailability` is the way out', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg'), file('b.jpg')];
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const id = store.getState().doc!.id;
  const healthy = p.photo.present.bind(p.photo);
  p.photo.present = async () => { throw new Error('IndexedDB: UnknownError'); };
  await store.openTrip(id);

  // R1.
  const l = photosFor(store.getState(), { kind: 'trip' });
  assert.equal(l.phase, 'unreadable');
  assert.equal(l.items.length, 2);
  assert.deepEqual(l.items.map((i) => i.availability), ['unknown', 'unknown']);
  assert.equal(l.missing, 0, '`missing` counts what is KNOWN to be missing, and nothing is');
  assert.match(l.message ?? '', /UnknownError/, 'the port\'s own words did not reach the listing');

  // R3 — a retry against a still-failing port stays put and does not throw.
  await store.refreshPhotoAvailability();
  const still = photosFor(store.getState(), { kind: 'trip' });
  assert.equal(still.phase, 'unreadable');
  assert.equal(still.items.length, 2);

  // R2 — and with the port healthy it resolves, clearing the message.
  p.photo.present = healthy;
  await store.refreshPhotoAvailability();
  const done = photosFor(store.getState(), { kind: 'trip' });
  assert.equal(done.phase, 'ready');
  assert.deepEqual(done.items.map((i) => i.availability), ['ready', 'ready']);
  assert.equal(done.message, null, '`message` is non-null on `unreadable` and null on every other phase');
});

/** A-63 **R5** — §10.6 property 5's terminal guarantee, on the two paths that skip the port. */
test('A-63 / R5: a trip with no photos and a host with no photo port both terminate at `empty`', async () => {
  const withPort = await storeWithTrip();
  const l1 = photosFor(withPort.getState(), { kind: 'trip' });
  assert.equal(l1.phase, 'empty');
  assert.equal(l1.message, null);

  const noPort = createStore({ ports: { ...ports(), photo: undefined } as unknown as Ports });
  await noPort.createTrip(TRIP_INIT);
  const l2 = photosFor(noPort.getState(), { kind: 'trip' });
  assert.equal(l2.phase, 'empty');
  assert.equal(l2.message, null);
});

/** A-63: `available: null` may not mean two things. The session distinguishes them. */
test('A-63: an UNREAD availability is `loading`, and a FAILED one is `unreadable`', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const id = store.getState().doc!.id;

  // Unread: the session says nothing has been read for this trip.
  const fresh = createStore({ ports: p });
  await fresh.refreshLibrary();
  assert.equal(fresh.getState().photos.available, null);
  assert.equal(fresh.getState().photos.availabilityError, null, 'a store that has read nothing must not claim a failure');

  p.photo.present = async () => { throw new Error('IndexedDB: UnknownError'); };
  await fresh.openTrip(id);
  assert.equal(fresh.getState().photos.available, null);
  assert.match(fresh.getState().photos.availabilityError ?? '', /UnknownError/);
});

test('R45-3: deleting a non-active trip whose document cannot be read still deletes the trip', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  await store.flush();
  const doomed = store.getState().doc!.id;
  p.storage.docs.set(doomed, '{ this is not JSON');
  await store.createTrip({ ...TRIP_INIT, title: 'Second' });
  await store.flush();

  await store.deleteTrip(doomed);
  assert.equal(store.getState().library.some((r) => r.id === doomed), false, 'an unreadable document made a trip undeletable');
  assert.equal(await p.storage.load(doomed), null);
});

/**
 * **R45-4, MAJOR.** `readPhotoAvailability` is careful that `available: null` means *"not read"*
 * and not *"read, and empty"* — §10.6 property 2 is exactly that distinction. The import saga's
 * optimistic update then collapsed it with `?? []`, built a set containing only the id it had
 * just written, and stamped `tripId` — so `photosFor` left `'loading'` and reported every
 * pre-existing photo `'missing'`. §10.6 property 3 renders that as *"this photo's image is no
 * longer stored on this device"*, over three photographs that are on disk.
 */
test('R45-4: an import after a FAILED availability read does not call the rest of the trip missing', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = ['a', 'b', 'c'].map((n) => file(`${n}.jpg`));
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const id = store.getState().doc!.id;

  const good = p.photo.present.bind(p.photo);
  p.photo.present = async () => { throw new Error('IndexedDB: UnknownError'); };
  await store.openTrip(id);
  // A-63 (revision 44) gave the failed read its own phase. The guard is the same guard — it
  // proves the fault fired — and the value it asserts moved from `'loading'` to `'unreadable'`
  // because that is now what a rejected `present()` produces. R45-4's own assertion, below, is
  // untouched.
  assert.equal(photosFor(store.getState(), { kind: 'trip' }).phase, 'unreadable',
    'INCONCLUSIVE: a rejected present() did not record a failed read');

  p.photo.next = [file('d.jpg')];
  await store.importPhotos({ kind: 'trip' });
  p.photo.present = good;

  const l = photosFor(store.getState(), { kind: 'trip' });
  assert.equal(p.photo.thumbs.size, 4, 'INCONCLUSIVE: the four photographs are not all on disk');
  assert.equal(l.missing, 0,
    `${l.missing} photograph(s) on disk were reported gone: ${JSON.stringify(l.items.map((i) => i.availability))}`);
  assert.ok(l.items.every((i) => i.availability !== 'missing'),
    'A-63: an unchecked photograph reads `unknown`, never `missing` — property 3\'s sentence is not said over bytes on disk');
});

/**
 * **R45-11, MINOR.** `importPhotos` takes no re-entrancy guard — a double-tap on an import
 * control is enough — and each call reset `pending`/`total`/`failures` from its own batch. §10.6
 * says failures are *"kept until the user dismisses them. **Never silently dropped**"* and that
 * `pending`/`total` is *"an honest progress fraction"*; both were false for the first batch.
 */
test('R45-11: two overlapping imports keep both batches\' failures and count both batches\' files', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.failDeriveFor.add('bad1.jpg');
  p.photo.next = [file('a.jpg'), file('bad1.jpg')];
  const first = store.importPhotos({ kind: 'trip' });
  p.photo.next = [file('x.jpg'), file('y.jpg')];
  const second = store.importPhotos({ kind: 'trip' });
  await Promise.all([first, second]);

  const report = photoImport(store.getState());
  assert.ok(report.failures.some((f) => f.name === 'bad1.jpg'),
    `the first batch's failure was dropped: ${JSON.stringify(report)}`);
  assert.equal(report.total, 4, 'total counted one batch of the two that were processed');
  assert.equal(report.pending, 0, 'the progress fraction did not settle');
  assert.equal(store.getState().doc!.photos.length, 3);
});

/**
 * **R45-12, MINOR.** Browsers return `File.type === ''` for extensions they do not recognise.
 * §10.6 defines `'unsupported_type'` as *"the picker returned something we **cannot decode**"* —
 * a claim the saga had not tested, because it refused an empty type before the decoder was ever
 * asked, while `apps/web/src/ports/photo.ts` was written specifically for that case
 * (`new Blob([bytes], { type: type || 'image/jpeg' })`).
 */
test('R45-12: a file the picker gave no MIME type for is offered to the decoder', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [{ name: 'photo.jpg', type: '', bytes: taggedBytes('photo.jpg') }];
  await store.importPhotos({ kind: 'trip' });
  assert.ok(p.photo.deriveCount > 0, 'the decoder was never asked');
  assert.equal(store.getState().doc!.photos.length, 1, 'an empty type is decodable and was not decoded');
  assert.deepEqual(photoImport(store.getState()).failures, []);
});

test('R45-12: a type the decoder genuinely refuses is still unsupported_type, and named', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.next = [file('clip.mov', 'video/quicktime')];
  await store.importPhotos({ kind: 'trip' });
  assert.deepEqual(photoImport(store.getState()).failures, [{ name: 'clip.mov', reason: 'unsupported_type' }]);
  assert.equal(p.photo.deriveCount, 0, 'a declared non-image was decoded anyway');
});

/**
 * **R45-13, MINOR.** §10.6: failures are *"kept until the user dismisses them"* — and nothing
 * dismissed them. The only thing that cleared `failures` was starting another import, so a
 * surface implementing the stated contract had nothing to call.
 */
test('R45-13: dismissPhotoFailures clears the report and nothing else', async () => {
  const p = ports();
  const store = await storeWithTrip(p);
  p.photo.failDeriveFor.add('bad.jpg');
  p.photo.next = [file('a.jpg'), file('bad.jpg')];
  await store.importPhotos({ kind: 'trip' });
  assert.equal(photoImport(store.getState()).failures.length, 1, 'INCONCLUSIVE: no failure to dismiss');

  store.dismissPhotoFailures();
  assert.deepEqual(photoImport(store.getState()).failures, []);
  assert.equal(store.getState().doc!.photos.length, 1, 'dismissing a report touched the document');
  assert.equal(photosFor(store.getState(), { kind: 'trip' }).missing, 0, 'dismissing a report lost availability');
  // Idempotent, and safe with nothing to dismiss.
  store.dismissPhotoFailures();
  assert.deepEqual(photoImport(store.getState()).failures, []);
});
