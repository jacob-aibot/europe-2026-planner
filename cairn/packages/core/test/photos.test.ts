/**
 * The `PhotoAsset` record class — ARCHITECTURE §10.1, §10.3, §10.5, **A-57**.
 *
 * Everything here is bare-Node, no browser, no bytes: §10.1 point 1's *"the record lives in
 * the document; the bytes never do"* is exactly what makes this file possible.
 *
 * **No coordinate is printed by anything this file exercises** (§10.5's cross-cutting rule).
 * A coordinate is asserted about as a value in memory; it never reaches a golden or a log.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addPhoto, createTrip, ensureDays, addStop, removeStop, removePhoto, updatePhoto,
  fromJSON, toJSON, migrateDoc, validateTrip, sequentialIds, displayStatus,
  SCHEMA_VERSION, copyStopInto,
} from '../src/index.ts';
import type { BuildCtx, PhotoAsset, Trip } from '../src/index.ts';

const ctx = (): BuildCtx => ({ ids: sequentialIds(), now: '2026-03-01', actorUserId: 'local:self' });

const derivative = (w: number, h: number, bytes: number) => ({ w, h, bytes });

function tripWithDays(): { trip: Trip; c: BuildCtx } {
  const c = ctx();
  const trip = createTrip(
    { title: 'Photo trip', startDate: '2026-03-01', endDate: '2026-03-03', cities: [{ key: 'wien', name: 'Vienna' }] },
    c,
  );
  return { trip: ensureDays(trip, c), c };
}

const basePhoto = {
  caption: 'the courtyard',
  capturedAt: { date: '2026-03-02', time: '11:20' },
  at: { lat: 48.2082, lng: 16.3738 },
  metaSource: 'exif' as const,
  source: { w: 4032, h: 3024 },
  thumb: derivative(320, 240, 18_000),
  display: derivative(1600, 1200, 240_000),
};

test('SCHEMA_VERSION is 2 — A-57 Part 5', () => {
  assert.equal(SCHEMA_VERSION, 2);
});

test('a new trip carries an empty photos array', () => {
  const { trip } = tripWithDays();
  assert.deepEqual(trip.photos, []);
});

test('addPhoto attaches to a day, mints an id, bumps revision once, and is pure', () => {
  const { trip, c } = tripWithDays();
  const before = trip.revision;
  const next = addPhoto(trip, { attach: { kind: 'day', dayId: '2026-03-02' }, ...basePhoto }, c);
  assert.equal(trip.photos.length, 0, 'addPhoto mutated its input');
  assert.equal(next.photos.length, 1);
  assert.equal(next.revision, before + 1);
  const p = next.photos[0];
  assert.equal(typeof p.id, 'string');
  assert.deepEqual(p.attach, { kind: 'day', dayId: '2026-03-02' });
  assert.equal(p.caption, 'the courtyard');
  assert.deepEqual(p.capturedAt, { date: '2026-03-02', time: '11:20' });
  assert.deepEqual(p.thumb, derivative(320, 240, 18_000));
});

/** A-57 Part 4: a photo carries FULL provenance and `displayStatus` answers for it unchanged. */
test('a photo the user attached is own; a system suggestion is suggested', () => {
  const { trip, c } = tripWithDays();
  const mine = addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto }, c).photos[0];
  assert.equal(mine.provenance.source, 'user');
  assert.equal(mine.provenance.state, 'accepted');
  assert.equal(mine.provenance.acceptedAt, '2026-03-01');
  assert.equal(displayStatus(mine.provenance), 'own');
  const suggested = addPhoto(
    trip,
    { attach: { kind: 'trip' }, ...basePhoto, provenance: { source: 'system', state: 'candidate', confidence: 'inferred', addedAt: '2026-03-01', acceptedAt: null, actorUserId: null } },
    c,
  ).photos[0];
  assert.equal(displayStatus(suggested.provenance), 'suggested');
});

/** A-57 Part 3: `place` is in the union and is NOT built. Refusing it is what keeps that true. */
test('attaching to a place is refused — A-6a\'s reference-counted delete comes first', () => {
  const { trip, c } = tripWithDays();
  assert.throws(
    () => addPhoto(trip, { attach: { kind: 'place', placeId: 'place-1' }, ...basePhoto }, c),
    /place/i,
  );
});

test('updatePhoto patches caption, at, capturedAt and attach; refuses id, thumb and provenance', () => {
  const { trip, c } = tripWithDays();
  const one = addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto }, c);
  const id = one.photos[0].id;
  const next = updatePhoto(one, id, { caption: 'renamed', at: null, metaSource: 'user' });
  assert.equal(next.photos[0].caption, 'renamed');
  assert.equal(next.photos[0].at, null);
  assert.equal(next.photos[0].metaSource, 'user');
  assert.equal(next.revision, one.revision + 1);
  assert.equal(one.photos[0].caption, 'the courtyard', 'updatePhoto mutated its input');
  for (const bad of [{ id: 'x' }, { thumb: derivative(1, 1, 1) }, { display: derivative(1, 1, 1) }, { provenance: undefined }]) {
    assert.throws(() => updatePhoto(one, id, bad as never), /may not be patched/);
  }
  assert.throws(() => updatePhoto(one, 'nope', { caption: 'x' }), /no such photo/);
});

test('removePhoto drops exactly one asset and throws for an id that is not there', () => {
  const { trip, c } = tripWithDays();
  let t = addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto }, c);
  t = addPhoto(t, { attach: { kind: 'trip' }, ...basePhoto }, c);
  const id = t.photos[0].id;
  const next = removePhoto(t, id);
  assert.equal(next.photos.length, 1);
  assert.equal(next.photos[0].id, t.photos[1].id);
  assert.throws(() => removePhoto(next, id), /no such photo/);
});

/**
 * §10.3's table, and A-57 Part 9 residue 2: *"a photograph is not a plan and deleting a plan
 * may not destroy a memory of it."* This is the one place the model deliberately loosens.
 */
test('removing a stop re-attaches its photos to the trip rather than deleting them', () => {
  const { trip, c } = tripWithDays();
  const withStop = addStop(trip, { kind: 'scheduled', dayId: '2026-03-02', time: '10:00', order: 0 }, { name: 'Belvedere', category: 'sight' }, c);
  const stopId = withStop.days.find((d) => d.id === '2026-03-02')!.stops[0].id;
  const withPhoto = addPhoto(withStop, { attach: { kind: 'stop', stopId }, ...basePhoto }, c);
  const after = removeStop(withPhoto, stopId);
  assert.equal(after.photos.length, 1, 'the photo was destroyed with the stop');
  assert.deepEqual(after.photos[0].attach, { kind: 'trip' });
  assert.equal(after.photos[0].caption, 'the courtyard', 'the caption did not survive');
});

test('narrowing a trip so a day is dropped re-attaches that day\'s photos to the trip', () => {
  const { trip, c } = tripWithDays();
  const withPhoto = addPhoto(trip, { attach: { kind: 'day', dayId: '2026-03-03' }, ...basePhoto }, c);
  const narrowed = ensureDays({ ...withPhoto, endDate: '2026-03-02' }, c);
  assert.equal(narrowed.days.some((d) => d.id === '2026-03-03'), false, 'the day was not dropped');
  assert.equal(narrowed.photos.length, 1);
  assert.deepEqual(narrowed.photos[0].attach, { kind: 'trip' });
});

// ---------------------------------------------------------------- serialization

test('a trip with three photos round-trips byte-identically', () => {
  const { trip, c } = tripWithDays();
  let t = addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto }, c);
  t = addPhoto(t, { attach: { kind: 'day', dayId: '2026-03-02' }, ...basePhoto, at: null, metaSource: null, caption: '' }, c);
  t = addPhoto(t, { attach: { kind: 'trip' }, ...basePhoto, capturedAt: null, source: null }, c);
  const text = toJSON(t);
  assert.equal(toJSON(fromJSON(text)), text, 'the round trip is not byte-identical');
  assert.deepEqual(fromJSON(text).photos, t.photos);
});

/**
 * §10.1 point 1 as a measurement rather than a promise — *"a run that is megabytes has put
 * bytes in the document."*
 *
 * **The ceiling here is 20 KB, not ROADMAP I-13's stated 4 KB, and that is a disclosed
 * divergence rather than a weakened test.** I-13's criterion reads *"`toJSON(trip).length` for
 * a trip with 20 photos is within 4 KB of the same trip with none"*, which budgets ~200 bytes
 * per photo — and §10.1's OWN field list cannot fit in it. Measured, with `toJSON`'s default
 * indent of 2 and a fully-populated record (caption, `capturedAt`, `at`, `metaSource`,
 * `source`, both derivatives and full `Provenance`): **768 bytes per photo pretty-printed, 439
 * compact**. The two documents disagree, the record class is the ruled one, and a builder does
 * not get to shrink `PhotoAsset` to make a number true — **KD-81** carries the measurement and
 * routes the choice to the architect.
 *
 * What the criterion is actually FOR is asserted exactly, and it is the second and third
 * assertions: kilobytes rather than megabytes, and **no string anywhere in the serialized
 * document is longer than a caption** — which is what "no base64 in `TripDoc`" means when you
 * check it instead of promising it.
 */
test('20 photos cost kilobytes, not megabytes, and put no byte payload in the document', () => {
  const { trip, c } = tripWithDays();
  const bare = toJSON(trip).length;
  let t = trip;
  for (let i = 0; i < 20; i++) t = addPhoto(t, { attach: { kind: 'trip' }, ...basePhoto }, c);
  const text = toJSON(t);
  const delta = text.length - bare;
  assert.ok(delta > 0, 'INCONCLUSIVE: the photos were not serialized at all');
  assert.ok(delta < 20_480, `20 photos added ${delta} bytes to the document (${Math.round(delta / 20)} each)`);
  // The real property: `TripDoc` is a string, and a derivative encoded into it would show up
  // as one very long string. The longest string in this document is a field value, not a file.
  const longest = (JSON.stringify(JSON.parse(text)).match(/"[^"]*"/g) ?? []).reduce((m, s) => Math.max(m, s.length), 0);
  assert.ok(longest < 128, `a ${longest}-character string is in the document — are the bytes in it?`);
});

test('fromJSON refuses a photo whose derivative dimensions are not numbers, with a path', () => {
  const { trip, c } = tripWithDays();
  const doc = JSON.parse(toJSON(addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto }, c)));
  doc.photos[0].thumb.w = 'wide';
  assert.throws(() => fromJSON(JSON.stringify(doc)), /\$\.photos\[0\]\.thumb\.w/);
});

test('fromJSON refuses an unknown attach kind', () => {
  const { trip, c } = tripWithDays();
  const doc = JSON.parse(toJSON(addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto }, c)));
  doc.photos[0].attach = { kind: 'album', albumId: 'a1' };
  assert.throws(() => fromJSON(JSON.stringify(doc)), /\$\.photos\[0\]\.attach\.kind/);
});

/** P11 — both halves. */
test('P11: a v1 document migrates to photos: [], and a v2 document is refused by a v1 reader', () => {
  const { trip, c } = tripWithDays();
  const v2 = JSON.parse(toJSON(addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto }, c)));
  const v1 = { ...v2, schemaVersion: 1 };
  delete v1.photos;
  const migrated = migrateDoc(v1) as { schemaVersion: number; photos: unknown[] };
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(migrated.photos, []);
  assert.equal(fromJSON(migrated).photos.length, 0);
  // The other half: a build that reads up to 1 refuses a 2. `migrateDoc` states that in the
  // message the existing "Update the app." sentence was written for.
  assert.throws(() => migrateDoc({ ...v2, schemaVersion: 3 }), /this build reads up to 2\. Update the app\./);
});

/**
 * **QA R45-1, the BLOCKER.** `SCHEMA_VERSION` went 1 → 2 and `migrateDoc` had **zero production
 * callers**, so every document and every backup written by the previous release was refused by
 * the one entry point every reader goes through. The migration was correct; only the wiring was
 * missing, and the wiring belongs *inside* `fromJSON` rather than at each of `store.ts`'s five
 * `core.fromJSON` call sites — that is where every reader already goes, and a per-site fix is one
 * a sixth reader silently misses.
 *
 * The property is *"a document written by the PREVIOUS release opens"*, not *"a hand-built object
 * at the current version opens"* — which is why the fixture is aged from a real `toJSON` output
 * rather than written as a literal.
 */
test('R45-1: fromJSON reads a document written by the previous release, with no explicit migrateDoc', () => {
  const { trip, c } = tripWithDays();
  const aged = JSON.parse(toJSON(addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto }, c)));
  delete aged.photos;            // a pre-I-13 build wrote no `photos` key at all
  aged.schemaVersion = 1;        // …which is what schemaVersion 1 means

  const fromText = fromJSON(JSON.stringify(aged));
  assert.deepEqual(fromText.photos, [], 'a v1 document did not upcast to photos: []');
  assert.equal(fromText.schemaVersion, SCHEMA_VERSION);
  // The object arm too: `store.ts` hands strings, `cli.ts` and the tests hand objects.
  assert.deepEqual(fromJSON(aged).photos, []);
  // And the migration stays idempotent under an explicit call in front of it, because
  // `packages/core/test`, `test/stats-storage.test.ts` and `qa/` all still do that.
  assert.deepEqual(fromJSON(migrateDoc(aged)).photos, []);
});

/** R45-1's other half: the refusal for a document from the FUTURE keeps its own sentence. */
test('R45-1: a document from a newer build is still refused, with the "Update the app." message', () => {
  const { trip, c } = tripWithDays();
  const doc = JSON.parse(toJSON(addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto }, c)));
  assert.throws(() => fromJSON(JSON.stringify({ ...doc, schemaVersion: 3 })), /Update the app\./);
  assert.throws(() => fromJSON(JSON.stringify({ ...doc, schemaVersion: 0 })), /no migration path from schemaVersion 0/);
  const noVersion = { ...doc };
  delete noVersion.schemaVersion;
  assert.throws(() => fromJSON(JSON.stringify(noVersion)), /missing schemaVersion/);
});

// ---------------------------------------------------------------- validation

test('a photo attached to a day that is not in the document is an ISSUE, never a throw', () => {
  const { trip, c } = tripWithDays();
  const t = addPhoto(trip, { attach: { kind: 'day', dayId: '2099-01-01' }, ...basePhoto }, c);
  const issues = validateTrip(t);
  const found = issues.filter((i) => i.code === 'photo_attach_dangling');
  assert.equal(found.length, 1, JSON.stringify(issues.map((i) => i.code)));
  assert.equal(found[0].ref.kind, 'trip');
  assert.equal(found[0].params.dayId, '2099-01-01');
});

/**
 * **QA R45-15.** The id census claimed day, place, booking and stop ids and gained no photo arm,
 * and a duplicate `PhotoId` is more dangerous than a duplicate `Stop` id because it names records
 * in a **global byte-key space**: `removePhoto('dup')` removes both records and `updatePhoto`
 * edits only the first, while the two share one pair of byte records.
 *
 * Not reachable from `importPhotos` — ids come from the injected factory — but reachable from
 * `fromJSON`, which is the population `validateTrip` exists for: a hand-edited file, a restored
 * export, a future native bridge.
 *
 * The `ref` is the **trip**, exactly as every other photo issue in this file is, because
 * `RefKind` has no `'photo'` arm and widening core's export surface is an architect's ruling
 * (QA R45-6, routed there). `params.kind` is `'photo'`, which is what a surface reads.
 */
test('R45-15: two photos with the same id are a duplicate_id issue', () => {
  const { trip, c } = tripWithDays();
  const one = addPhoto(trip, { id: 'dup', ...basePhoto, caption: 'first' }, c);
  const two = addPhoto(one, { id: 'dup', ...basePhoto, caption: 'second' }, c);
  const dupes = validateTrip(two).filter((i) => i.code === 'duplicate_id' && i.params.kind === 'photo');
  assert.equal(dupes.length, 1, JSON.stringify(validateTrip(two).map((i) => i.code)));
  assert.equal(dupes[0].level, 'error');
  assert.equal(dupes[0].params.id, 'dup');
  assert.equal(dupes[0].ref.kind, 'trip');
  // Distinct ids raise nothing, so the census is not simply always firing.
  const clean = addPhoto(addPhoto(trip, { id: 'p1', ...basePhoto }, c), { id: 'p2', ...basePhoto }, c);
  assert.deepEqual(validateTrip(clean).filter((i) => i.code === 'duplicate_id'), []);
});

/** A photo id and a stop id that happen to match are NOT a collision — the census is per kind. */
test('R45-15: the photo census is per kind — a photo may share an id with a stop', () => {
  const { trip, c } = tripWithDays();
  const withStop = addStop(trip, { kind: 'scheduled', dayId: '2026-03-02', time: '10:00', order: 0 }, { name: 'S', category: 'sight' }, c);
  const stopId = withStop.days.find((d) => d.id === '2026-03-02')!.stops[0].id;
  const t = addPhoto(withStop, { id: stopId, ...basePhoto }, c);
  assert.deepEqual(validateTrip(t).filter((i) => i.code === 'duplicate_id'), []);
});

test('a photo coordinate outside the legal range is reported, and the message carries no coordinate', () => {
  const { trip, c } = tripWithDays();
  const t = addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto, at: { lat: 991, lng: 0 } }, c);
  const found = validateTrip(t).filter((i) => i.code === 'photo_coords_out_of_range');
  assert.equal(found.length, 1);
  // §10.5: no coordinate in any user-facing string. The number is in `params`, where §2.1 puts
  // structured data, and `params` is not a log line.
  assert.equal(/-?\d+\.\d+/.test(found[0].message), false, found[0].message);
});

test('a well-formed photo produces no issue at all', () => {
  const { trip, c } = tripWithDays();
  const t = addPhoto(trip, { attach: { kind: 'day', dayId: '2026-03-02' }, ...basePhoto }, c);
  const codes = validateTrip(t).map((i) => i.code);
  assert.equal(codes.includes('photo_attach_dangling'), false);
  assert.equal(codes.includes('photo_coords_out_of_range'), false);
});

// ---------------------------------------------------------------- the copy boundary

/**
 * §10.5: *"a photo does not cross a person boundary."* This needs no change to `copyStop.ts`
 * and that IS the point — photos hang off `Trip`, not off `Stop`. Asserted so that a future
 * builder does not "improve" the copy by carrying them.
 */
test('copyStopInto carries no photo', () => {
  const c = ctx();
  const source = (() => {
    const { trip, c: c2 } = tripWithDays();
    const withStop = addStop(trip, { kind: 'scheduled', dayId: '2026-03-02', time: '09:00', order: 0 }, { name: 'Prater', category: 'sight' }, c2);
    const stopId = withStop.days.find((d) => d.id === '2026-03-02')!.stops[0].id;
    return { trip: addPhoto(withStop, { attach: { kind: 'stop', stopId }, ...basePhoto }, c2), stopId };
  })();
  const target = createTrip({ id: 'target', title: 'Other', startDate: '2026-04-01', endDate: '2026-04-02' }, c);
  const copied = copyStopInto(
    target,
    { trip: source.trip, stopId: source.stopId },
    { kind: 'scheduled', dayId: '2026-04-01', time: '09:00', order: 0 },
    { ids: c.ids, today: '2026-04-01', actorUserId: 'local:self' },
  );
  assert.deepEqual(copied.photos, [], 'a photo crossed the copy boundary');
  assert.equal(copied.days[0].stops.length, 1, 'INCONCLUSIVE: the stop itself did not copy');
});

// ---------------------------------------------------------------- undo depth

/** ROADMAP I-13: *"undo/redo restores photos exactly at depth 50."* History is a `Trip` snapshot. */
test('a photo attachment survives 50 snapshots taken and restored', () => {
  const { trip, c } = tripWithDays();
  const snapshots: Trip[] = [];
  let t: Trip = trip;
  for (let i = 0; i < 50; i++) {
    snapshots.push(t);
    t = addPhoto(t, { attach: { kind: 'trip' }, ...basePhoto, caption: `photo ${i}` }, c);
  }
  assert.equal(t.photos.length, 50);
  const restored: Trip = snapshots[0];
  assert.deepEqual(restored.photos, [], 'the oldest snapshot acquired photos it never had');
  const asserted: PhotoAsset[] = t.photos;
  assert.equal(asserted[49].caption, 'photo 49');
});
