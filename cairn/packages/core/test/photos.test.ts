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
  SCHEMA_VERSION, copyStopInto, acceptCandidate, rejectCandidate,
} from '../src/index.ts';
import { readFileSync } from 'node:fs';
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

/**
 * **A-72 S5, pin 1.** The number this test pins is `photos`' — A-57 Part 5 is what put it at 2 and
 * is not superseded. What moved it to **3** is §8.3 **A-72**, one record class later: `participants`
 * is an array of records on `TripDoc` and earns a bump on A-57 Part 5's own argument.
 *
 * **It may not be relaxed to `assert.equal(SCHEMA_VERSION, SCHEMA_VERSION)`.** A pin that reads the
 * value it is pinning is not a pin, and this one plus `datePrecision.test.ts`'s is what makes A-72
 * Part 4's rule catch its own violation: a records class added without a bump reddens nothing at
 * all if these two stop naming a literal.
 */
test('SCHEMA_VERSION is 3 — A-57 Part 5 put it at 2, A-72 moved it for `participants`', () => {
  assert.equal(SCHEMA_VERSION, 3);
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
 * **Both bounds are the ruled ones** (ARCHITECTURE §10 **A-61** Parts 5 and 7; ROADMAP
 * **I-13a**). The 4 KB figure this test used to record a divergence from was **withdrawn at
 * revision 43**: it costed the record without its 150-byte `Provenance` block and budgeted as
 * if the document were compact when `toJSON`'s default indent — the one `saveIfVersion` writes
 * — is 2. Measured over a fully-populated record (caption, `capturedAt`, `at`, `metaSource`,
 * `source`, both derivatives and full `Provenance`): **768 B per photo pretty-printed, 439
 * compact**, so the ceiling is **20,480 B for 20 photos, i.e. 1,024 B per photo** — about one
 * more `Provenance`-sized block of headroom. **KD-81 is closed by A-61**; nothing here routes
 * to the architect any more, but a run *over* the ceiling does: it is a record class that has
 * grown, and widening the number is a ruling, not a test edit.
 *
 * **A ceiling that speaks only when it fails publishes nothing when it passes**, which is how
 * the 4 KB figure stayed wrong for a whole revision — nobody had printed what the record
 * actually costs. So the measured delta, the per-photo figure and the longest string are
 * emitted with `t.diagnostic` **before** their assertions, and a green run therefore reports
 * them: `npm run test:tap`, grep `A-61`. (`npm test`'s dot reporter suppresses diagnostics and
 * stdout alike — that is the reporter's choice, not this test's.)
 *
 * What the criterion is actually FOR is asserted exactly, and it is the second and third
 * assertions: kilobytes rather than megabytes, and **no string anywhere in the serialized
 * document is longer than a caption** — which is what "no base64 in `TripDoc`" means when you
 * check it instead of promising it.
 */
test('20 photos cost kilobytes, not megabytes, and put no byte payload in the document', (t) => {
  const { trip, c } = tripWithDays();
  const bare = toJSON(trip).length;
  let tr = trip;
  for (let i = 0; i < 20; i++) tr = addPhoto(tr, { attach: { kind: 'trip' }, ...basePhoto }, c);
  const text = toJSON(tr);
  const delta = text.length - bare;
  t.diagnostic(`A-61 growth: 20 photos add ${delta} B at toJSON indent 2 = ${(delta / 20).toFixed(1)} B/photo (§10.1 states 768; ceiling 20480 B = 1024 B/photo)`);
  assert.ok(delta > 0, 'INCONCLUSIVE: the photos were not serialized at all');
  assert.ok(delta < 20_480, `20 photos added ${delta} bytes to the document (${Math.round(delta / 20)} each)`);
  // The real property: `TripDoc` is a string, and a derivative encoded into it would show up
  // as one very long string. The longest string in this document is a field value, not a file.
  const longest = (JSON.stringify(JSON.parse(text)).match(/"[^"]*"/g) ?? []).reduce((m, s) => Math.max(m, s.length), 0);
  t.diagnostic(`A-61 payload: longest string in the document is ${longest} characters, quotes included (fixture-scoped bound 128)`);
  // **128 is a property of THIS FIXTURE, not an invariant on a user's document** — A-61 Part 5,
  // and Part 8 residue 1 is why: `caption` is uncapped free text, exactly like `Stop.note`,
  // `Trip.title` and `Place.name`, and core caps no free-text field anywhere. A real document
  // may legitimately carry a 500-character caption and be perfectly well-formed.
  //
  // The bound is meaningful *here* because every string this fixture serializes is short **by
  // construction**: captions under 32 characters, ids from `sequentialIds`. 128 is chosen to sit
  // comfortably above the longest of them — the diagnostic above prints what that actually is,
  // so the margin is a measurement and not a claim in a comment — while still being one to four
  // orders of magnitude below any encoded derivative (§10.4's `thumb` inlines to ~24 KB of
  // base64).
  //
  // So: a builder who lengthens a fixture caption **re-derives this bound against the fixture**.
  // Raising it to fit is how a check stops meaning anything, and it is the failure A-61 Part 4's
  // table exists to prevent — a byte total alone passes a 200-byte data URI on every record.
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

/**
 * P11 — both halves. **The numbers moved at I-9a and the property did not** (§8.3 A-72): a v1
 * document now climbs the whole ladder to 3 rather than stopping at photos' rung, which is the
 * half `participants.test.ts`'s S1 states against the real v1 fixture.
 */
test('P11: a v1 document migrates to photos: [], and a document from a later version is refused', () => {
  const { trip, c } = tripWithDays();
  const current = JSON.parse(toJSON(addPhoto(trip, { attach: { kind: 'trip' }, ...basePhoto }, c)));
  const v1 = { ...current, schemaVersion: 1 };
  delete v1.photos;
  delete v1.participants;
  const migrated = migrateDoc(v1) as { schemaVersion: number; photos: unknown[]; participants: unknown[] };
  assert.equal(migrated.schemaVersion, 3, 'the ladder stopped at photos\' rung');
  assert.deepEqual(migrated.photos, []);
  assert.deepEqual(migrated.participants, []);
  assert.equal(fromJSON(migrated).photos.length, 0);
  // The other half: a build that reads up to 3 refuses a 4. `migrateDoc` states that in the
  // message the existing "Update the app." sentence was written for.
  assert.throws(() => migrateDoc({ ...current, schemaVersion: 4 }), /this build reads up to 3\. Update the app\./);
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
  assert.throws(() => fromJSON(JSON.stringify({ ...doc, schemaVersion: 4 })), /Update the app\./);
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

// ---------------------------------------------------------------- A-64 (QA R45-6)

/**
 * **A-64 — the withdrawn claim, and its four checkable consequences (S1–S5).**
 *
 * A-57 Part 4 appended one sentence to its second reason: *"`acceptCandidate`/`rejectCandidate`
 * then work on photos unchanged."* They do not, and revision 44 **withdraws the sentence rather
 * than implementing it**: `RefKind` gains no `'photo'` arm in this phase, because nothing yet
 * produces a `{source:'system'}` photo for the transitions to act on and *"reject"* does not yet
 * have a meaning for a record whose derivatives are megabytes. What lands is three corrected
 * strings — and the field itself, which every one of Part 4's three real reasons is about, does
 * not move.
 */
test('A-64 / S1: an unsupported ref reached from rejectCandidate names rejectCandidate', () => {
  const { trip, c } = tripWithDays();
  void c;
  const grab = (f: () => unknown): string => {
    try { f(); return ''; } catch (e) { return (e as Error).message; }
  };
  const fromReject = grab(() => rejectCandidate(trip, { kind: 'place', id: 'nope' }, 'u1', '2026-03-02'));
  const fromAccept = grab(() => acceptCandidate(trip, { kind: 'place', id: 'nope' }, 'u1', '2026-03-02'));
  assert.match(fromReject, /^rejectCandidate:/, 'the throw named another function');
  assert.doesNotMatch(fromReject, /acceptCandidate/);
  assert.match(fromAccept, /^acceptCandidate:/);
});

test('A-64 / S2: a `photo` ref names this ruling and its trigger, not "unsupported ref kind"', () => {
  const { trip, c } = tripWithDays();
  const withPhoto = addPhoto(trip, { ...basePhoto }, c);
  const id = withPhoto.photos[0].id;
  // `{kind:'photo'}` does not typecheck — S5 is exactly that — so this is the untyped caller
  // every runtime guard in this project exists for (§2.1).
  const photoRef = { kind: 'photo', id } as unknown as Parameters<typeof acceptCandidate>[1];
  for (const [name, fn] of [['acceptCandidate', acceptCandidate], ['rejectCandidate', rejectCandidate]] as const) {
    let message = '';
    try { fn(withPhoto, photoRef, 'u1', '2026-03-02'); } catch (e) { message = (e as Error).message; }
    assert.match(message, new RegExp(`^${name}:`), 'the throw named another function');
    assert.match(message, /A-64/, 'the message does not say where the reason lives');
    assert.match(message, /Phase 6/, 'the message does not name the trigger');
    assert.doesNotMatch(message, /^\w+: unsupported ref kind photo$/, 'the message still reads as an omission');
  }
});

test('A-64 / S3: updatePhoto still refuses `provenance`, without naming two functions that throw', () => {
  const { trip, c } = tripWithDays();
  const withPhoto = addPhoto(trip, { ...basePhoto }, c);
  let message = '';
  try {
    updatePhoto(withPhoto, withPhoto.photos[0].id, {
      provenance: withPhoto.photos[0].provenance,
    } as unknown as Parameters<typeof updatePhoto>[2]);
  } catch (e) { message = (e as Error).message; }
  assert.notEqual(message, '', 'the refusal itself was dropped — it is correct and it stays');
  assert.doesNotMatch(message, /acceptCandidate|rejectCandidate/, 'the remedy still points at two functions that throw');
  assert.match(message, /A-64/);
});

test('A-64 / S4: addPhoto still accepts any Provenance, and a candidate photo round-trips', () => {
  const { trip, c } = tripWithDays();
  const suggested = {
    source: 'system' as const, state: 'candidate' as const, confidence: 'inferred' as const,
    addedAt: '2026-03-01', acceptedAt: null, actorUserId: null,
  };
  const withPhoto = addPhoto(trip, { ...basePhoto, provenance: suggested }, c);
  assert.deepEqual(withPhoto.photos[0].provenance, suggested, '`addPhoto` narrowed the provenance it was handed');
  assert.equal(displayStatus(withPhoto.photos[0].provenance), 'suggested');
  const back = fromJSON(toJSON(withPhoto));
  assert.equal(toJSON(back), toJSON(withPhoto), 'a candidate photo did not round-trip byte-identically');
  assert.equal(displayStatus(back.photos[0].provenance), 'suggested', 'the candidate state did not survive fromJSON');
});

test('A-64 / S5: `RefKind` has no `photo` arm — the deferral is checkable', () => {
  const src = readFileSync(new URL('../src/model/types.ts', import.meta.url), 'utf8');
  const refKind = /export type RefKind = ([^\n;]+);/.exec(src)?.[1];
  assert.ok(refKind, 'RefKind is no longer a one-line type alias — re-derive this check');
  assert.doesNotMatch(
    refKind,
    /'photo'/,
    'a `photo` arm was added to `RefKind`. That widens core\'s export surface (§2.10) and is an ' +
      'architect\'s ruling: A-64 Part 3 names the trigger — the first code path that produces a ' +
      '`{source:\'system\'}` PhotoAsset — and that increment adds the arm, the `mapRef` branch and ' +
      'the reject semantics together.',
  );
});
