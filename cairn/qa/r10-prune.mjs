/**
 * Round 10 — A-6a (`removeStop` prunes the one `Place` a copied stop orphans), attacked past
 * `packages/core/test/geoCheck.test.ts`'s A-6a section. Run from `cairn/`:
 *
 *     node qa/r10-prune.mjs
 *
 *   §1  the four clauses one at a time: the POOL half of clause 3, an ACCEPTED copy, a
 *       REJECTED copy, a copy-of-a-copy, a stop id present in both a day and the pool,
 *       purity, and "revision bumped once".
 *   §2  the anti-sweep guards: a user-authored place is never touched; the `samePlace`-reuse
 *       case where a user place is the copy's link and the user still has a stop on it; and
 *       the ONE documented cost (user place, copy is its last linker) — with undo.
 *   §3  what the prune leaves behind: `addStop` re-linking the pruned placeId (a dangling
 *       reference), `validateTrip`, and whether any derive path throws.
 *   §4  the REAL fixture at scale, through the store: Browse -> Copy -> ×, the place count,
 *       and proof it is not a sweep (place-68 / Fisherman's Bastion still measured).
 *   §5  the adjacent door: `updateStop` (StopEditor's own patch) re-pointing a copied stop's
 *       `place` link — the same orphan, without `removeStop`.
 *
 * A "FAIL" means the probe found something.
 */
const core = await import('../packages/core/src/index.ts');
const client = await import('../packages/client/src/index.ts');

let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? '\n         ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

const TODAY = '2026-08-01';
const LAX = { lat: 33.9416, lng: -118.4085 };
const VIENNA = { lat: 48.2082, lng: 16.3738 };
const FAR_A = { lat: 21.3069, lng: -157.8583 };   // Honolulu

let idn = 0;
const ids = { newId: (k) => `${k}-n${++idn}` };
const ctx = () => ({ ids, now: TODAY, clock: { today: () => TODAY }, actorUserId: 'local:self' });

function baseTrip(id, title, ownerId = 'local:self') {
  const t = core.createTrip({
    title, startDate: '2026-08-07', endDate: '2026-08-08',
    cities: [{ key: 'vienna', name: 'Vienna', centre: VIENNA }],
    homeBase: { name: 'LAX', at: LAX },
  }, ctx());
  return { ...t, id, ownerId };
}

/** A friend's trip with one stop linking one place. */
function sourceTrip(id, owner, placeName, at) {
  let t = baseTrip(id, owner + "'s trip", 'user:' + owner);
  const place = { id: `place-${owner}`, name: placeName, cityKey: 'vienna', at, kind: 'sight' };
  t = { ...t, places: [...t.places, place] };
  t = core.addStop(t, { kind: 'scheduled', dayId: t.days[0].id, time: null, order: 1 },
    { name: placeName, category: 'sight', place: { kind: 'place', placeId: place.id } }, ctx());
  return t;
}

const findStop = (trip, id) => [...trip.days.flatMap((d) => d.stops), ...trip.pool].find((s) => s.id === id) ?? null;
const blockers = (trip) => core.detectConflicts(trip, { today: TODAY })
  .filter((c) => c.ruleId === 'geo_outlier' && c.severity === 'blocker');
const placeIds = (trip) => trip.places.map((p) => p.id);
const lastCopied = (trip) => [...trip.days.flatMap((d) => d.stops), ...trip.pool]
  .filter((s) => s.provenance.source === 'friend').slice(-1)[0];

// ---------------------------------------------------------------------------
line('§1 the four clauses, one at a time');
{
  // 1.1 — clause 3's POOL half. Copy a stop straight INTO the pool, then remove it there.
  const src = sourceTrip('trip-src', 'marta', 'Blue Cave', FAR_A);
  let mine = baseTrip('trip-mine', 'Mine');
  mine = core.copyStopInto(mine, { trip: src, stopId: src.days[0].stops[0].id }, { kind: 'pool', cityKey: 'vienna' }, ctx());
  const copied = mine.pool[mine.pool.length - 1];
  ok('1.1a precondition: the copy landed in the pool with a place link and brought a Place',
     copied.place.kind === 'place' && mine.places.some((p) => p.id === copied.place.placeId),
     `${copied.place.kind} places=${placeIds(mine).join(',')}`);
  const after = core.removeStop(mine, copied.id);
  ok('1.1b removing a copied stop FROM THE POOL prunes its place (no day/pool asymmetry)',
     !after.places.some((p) => p.id === copied.place.placeId), placeIds(after).join(','));
  ok('1.1c ...and mints no blocker', blockers(after).length === 0, JSON.stringify(blockers(after).map((c) => c.summary)));

  // 1.2 — a scheduled copy MOVED to the pool first, then removed from there.
  let m2 = baseTrip('trip-m2', 'Mine 2');
  m2 = core.copyStopInto(m2, { trip: src, stopId: src.days[0].stops[0].id }, { kind: 'scheduled', dayId: m2.days[0].id, time: null, order: 1 }, ctx());
  const c2 = lastCopied(m2);
  m2 = core.moveStop(m2, c2.id, { kind: 'pool', cityKey: 'vienna' });
  const a2 = core.removeStop(m2, c2.id);
  ok('1.2 a copy moved day -> pool, then removed, still prunes',
     !a2.places.some((p) => p.id === c2.place.placeId), placeIds(a2).join(','));
}
{
  // 1.3 — clause 2 against an ACCEPTED copy. `accept()` changes `state`, not `source`, so
  // `attribution()` is still non-null and the prune must still fire. If it did not, R9-2
  // would come straight back through "Copy -> Accept -> ×".
  const src = sourceTrip('trip-src2', 'marta', 'Blue Cave', FAR_A);
  let mine = baseTrip('trip-mine3', 'Mine 3');
  mine = core.copyStopInto(mine, { trip: src, stopId: src.days[0].stops[0].id }, { kind: 'scheduled', dayId: mine.days[0].id, time: null, order: 1 }, ctx());
  const copied = lastCopied(mine);
  const accepted = core.acceptCandidate(mine, { kind: 'stop', id: copied.id }, 'local:self', TODAY);
  ok('1.3a precondition: acceptance leaves the copy attributable', core.attribution(findStop(accepted, copied.id).provenance) !== null);
  const afterA = core.removeStop(accepted, copied.id);
  ok('1.3b removing an ACCEPTED copy prunes its place', !afterA.places.some((p) => p.id === copied.place.placeId), placeIds(afterA).join(','));
  ok('1.3c ...and mints no blocker', blockers(afterA).length === 0, JSON.stringify(blockers(afterA).map((c) => c.summary)));

  // 1.4 — a REJECTED copy that is then deleted. `rejectCandidate` alone prunes nothing
  // (geoCheck.test covers that); deleting the rejected stop must prune.
  const rejected = core.rejectCandidate(mine, { kind: 'stop', id: copied.id }, 'local:self', TODAY);
  const afterR = core.removeStop(rejected, copied.id);
  ok('1.4 removing a REJECTED copy prunes its place too', !afterR.places.some((p) => p.id === copied.place.placeId), placeIds(afterR).join(','));
}
{
  // 1.5 — a copy of a copy. Trip A copies from Marta; trip B copies from trip A. The chain
  // keeps `source: 'friend'`, so the prune must fire in B as well.
  const src = sourceTrip('trip-src3', 'marta', 'Blue Cave', FAR_A);
  let a = baseTrip('trip-a', 'A');
  a = core.copyStopInto(a, { trip: src, stopId: src.days[0].stops[0].id }, { kind: 'scheduled', dayId: a.days[0].id, time: null, order: 1 }, ctx());
  const inA = lastCopied(a);
  let b = baseTrip('trip-b', 'B');
  b = core.copyStopInto(b, { trip: { ...a, ownerId: 'user:ann' }, stopId: inA.id }, { kind: 'scheduled', dayId: b.days[0].id, time: null, order: 1 }, ctx());
  const inB = lastCopied(b);
  const afterB = core.removeStop(b, inB.id);
  ok('1.5 a copy-of-a-copy prunes its place on removal',
     inB.place.kind === 'place' && !afterB.places.some((p) => p.id === inB.place.placeId), placeIds(afterB).join(','));
}
{
  // 1.6 — a hand-built document where the SAME stop id sits in a day AND the pool. The
  // day copy is removed; the pool copy still links the place, so clause 3 must decline.
  const src = sourceTrip('trip-src4', 'marta', 'Blue Cave', FAR_A);
  let mine = baseTrip('trip-mine4', 'Mine 4');
  mine = core.copyStopInto(mine, { trip: src, stopId: src.days[0].stops[0].id }, { kind: 'scheduled', dayId: mine.days[0].id, time: null, order: 1 }, ctx());
  const copied = lastCopied(mine);
  const doubled = { ...mine, pool: [...mine.pool, { ...copied, placement: { kind: 'pool', cityKey: 'vienna' } }] };
  const after = core.removeStop(doubled, copied.id);
  ok('1.6 a stop id in BOTH a day and the pool: removing the day copy does NOT prune',
     after.places.some((p) => p.id === copied.place.placeId), placeIds(after).join(','));
}
{
  // 1.7 — purity and the revision bump. The ruling: "revision bumped ONCE for the whole
  // operation", and `removeStop` is pure.
  const src = sourceTrip('trip-src5', 'marta', 'Blue Cave', FAR_A);
  let mine = baseTrip('trip-mine5', 'Mine 5');
  mine = core.copyStopInto(mine, { trip: src, stopId: src.days[0].stops[0].id }, { kind: 'scheduled', dayId: mine.days[0].id, time: null, order: 1 }, ctx());
  const copied = lastCopied(mine);
  const before = { revision: mine.revision, places: placeIds(mine).join(','), stops: mine.days[0].stops.length };
  const after = core.removeStop(mine, copied.id);
  ok('1.7a revision bumped exactly once', after.revision === before.revision + 1, `${before.revision} -> ${after.revision}`);
  ok('1.7b the input trip is untouched (pure)',
     mine.revision === before.revision && placeIds(mine).join(',') === before.places && mine.days[0].stops.length === before.stops,
     `${mine.revision} ${placeIds(mine).join(',')} ${mine.days[0].stops.length}`);
  ok('1.7c the pruned document still serialises and round-trips',
     (() => { try { return core.fromJSON(core.toJSON(after)).places.length === after.places.length; } catch (e) { return 'threw: ' + e.message; } })() === true);
}

// ---------------------------------------------------------------------------
line('§2 the anti-sweep guards, and the ONE documented cost');
{
  // 2.1 — the user's own stop on their own place, deleted. Clause 2 must decline even when
  // that stop is the place's only linker, and the place must still be MEASURED afterwards.
  let mine = baseTrip('trip-u1', 'Mine');
  mine = { ...mine, places: [...mine.places, { id: 'place-user', name: 'My spot', cityKey: 'vienna', at: FAR_A, kind: 'sight' }] };
  mine = core.addStop(mine, { kind: 'scheduled', dayId: mine.days[0].id, time: null, order: 1 },
    { name: 'My spot', category: 'sight', place: { kind: 'place', placeId: 'place-user' } }, ctx());
  const own = mine.days[0].stops.find((s) => s.name === 'My spot');
  const after = core.removeStop(mine, own.id);
  ok('2.1a a USER-authored stop\'s place survives its own removal (never a sweep)',
     after.places.some((p) => p.id === 'place-user'), placeIds(after).join(','));
  const findings = core.geoCheck(after).filter((f) => f.ref.kind === 'place' && f.ref.id === 'place-user');
  ok('2.1b ...and is still measured afterwards', findings.length === 1, JSON.stringify(findings.map((f) => f.confidence)));
}
{
  // 2.2 — `samePlace` reuse: the copy links the USER'S existing place. Removing the copy
  // must leave it alone, because the user's own stop still links it (clause 3).
  const at = { lat: 48.2100, lng: 16.3700 };
  let mine = baseTrip('trip-u2', 'Mine');
  mine = { ...mine, places: [...mine.places, { id: 'place-user', name: 'Stephansdom', cityKey: 'vienna', at, kind: 'sight' }] };
  mine = core.addStop(mine, { kind: 'scheduled', dayId: mine.days[0].id, time: null, order: 1 },
    { name: 'Stephansdom', category: 'sight', place: { kind: 'place', placeId: 'place-user' } }, ctx());
  const src = sourceTrip('trip-src6', 'marta', 'Stephansdom', at);
  mine = core.copyStopInto(mine, { trip: src, stopId: src.days[0].stops[0].id }, { kind: 'scheduled', dayId: mine.days[0].id, time: null, order: 2 }, ctx());
  const copied = lastCopied(mine);
  ok('2.2a precondition: the copy REUSED the user\'s place (samePlace), no new row',
     copied.place.placeId === 'place-user' && mine.places.filter((p) => p.id === 'place-user').length === 1,
     `${copied.place.placeId} places=${placeIds(mine).join(',')}`);
  const after = core.removeStop(mine, copied.id);
  ok('2.2b removing the copy leaves the user\'s place alone (their own stop still links it)',
     after.places.some((p) => p.id === 'place-user'), placeIds(after).join(','));

  // 2.2c — the documented cost, verbatim from the ruling: the user deletes their OWN last
  // stop first, leaving the copy as the only referent; removing the copy then deletes a row
  // the user typed. This must be exactly that, and no more — and undo must restore it.
  const ownStop = mine.days[0].stops.find((s) => s.provenance.source !== 'friend' && s.place.kind === 'place');
  const noOwn = core.removeStop(mine, ownStop.id);
  ok('2.2c the user\'s own removal still does not prune (the copy keeps it alive)',
     noOwn.places.some((p) => p.id === 'place-user'), placeIds(noOwn).join(','));
  const gone = core.removeStop(noOwn, copied.id);
  ok('2.2d ...and removing the copy afterwards deletes the user\'s row — the ONE documented cost',
     !gone.places.some((p) => p.id === 'place-user'), placeIds(gone).join(','));
  ok('2.2e ...and only that row: every other place survives',
     gone.places.length === noOwn.places.length - 1, `${noOwn.places.length} -> ${gone.places.length}`);
}
{
  // 2.3 — two copies on one place: first removal survives, second prunes (the ruling's
  // point 3, "there is no window in which the orphan is measured"). Checked at BOTH steps
  // that no blocker exists at any intermediate point.
  const at = FAR_A;
  const src = sourceTrip('trip-src7', 'marta', 'Blue Cave', at);
  let mine = baseTrip('trip-u3', 'Mine');
  mine = core.copyStopInto(mine, { trip: src, stopId: src.days[0].stops[0].id }, { kind: 'scheduled', dayId: mine.days[0].id, time: null, order: 1 }, ctx());
  mine = core.copyStopInto(mine, { trip: src, stopId: src.days[0].stops[0].id }, { kind: 'pool', cityKey: 'vienna' }, ctx());
  const copies = [...mine.days.flatMap((d) => d.stops), ...mine.pool].filter((s) => s.provenance.source === 'friend');
  ok('2.3a precondition: two copies, one shared place row', copies.length === 2 && new Set(copies.map((s) => s.place.placeId)).size === 1,
     `${copies.length} copies, places=${placeIds(mine).join(',')}`);
  const one = core.removeStop(mine, copies[0].id);
  ok('2.3b after the first removal the place survives and mints no blocker',
     one.places.some((p) => p.id === copies[0].place.placeId) && blockers(one).length === 0,
     `${placeIds(one).join(',')} blockers=${blockers(one).length}`);
  const two = core.removeStop(one, copies[1].id);
  ok('2.3c after the second (day AND pool crossed) it is pruned, still no blocker',
     !two.places.some((p) => p.id === copies[0].place.placeId) && blockers(two).length === 0,
     `${placeIds(two).join(',')} blockers=${blockers(two).length}`);
}

// ---------------------------------------------------------------------------
line('§3 what the prune leaves behind — dangling references and derive');
{
  const src = sourceTrip('trip-src8', 'marta', 'Blue Cave', FAR_A);
  let mine = baseTrip('trip-d1', 'Mine');
  mine = core.copyStopInto(mine, { trip: src, stopId: src.days[0].stops[0].id }, { kind: 'scheduled', dayId: mine.days[0].id, time: null, order: 1 }, ctx());
  const copied = lastCopied(mine);
  const pid = copied.place.placeId;
  const after = core.removeStop(mine, copied.id);

  // 3.1 — re-add a stop pointing at the pruned id. The place row is gone, so this is a
  // dangling reference. Does anything throw, and does `validateTrip` see it?
  let threw = null, re = null;
  try {
    re = core.addStop(after, { kind: 'scheduled', dayId: after.days[0].id, time: null, order: 1 },
      { name: 'Back again', category: 'sight', place: { kind: 'place', placeId: pid } }, ctx());
  } catch (e) { threw = e.message; }
  ok('3.1a addStop against a pruned placeId does not throw', threw === null, threw ?? '');
  if (re) {
    const issues = core.validateTrip(re).filter((i) => i.params && i.params.placeId === pid);
    ok('3.1b ...and validateTrip reports the dangling reference', issues.length === 1,
       JSON.stringify(issues.map((i) => `${i.severity} ${i.code}`)));
    let dThrew = null;
    try { core.geoCheck(re); core.detectConflicts(re, { today: TODAY }); } catch (e) { dThrew = e.message; }
    ok('3.1c ...and no derive path throws on it', dThrew === null, dThrew ?? '');
  }

  // 3.2 — undo, at the store level: one Trip snapshot must bring back stop AND place.
  const store = client.createStore({
    ports: { storage: client.memoryStorage(), clock: client.fixedClockPort(TODAY), ids: { newId: (k) => `${k}-s${++idn}` } },
    debounceMs: 5,
  });
  await store.adoptTrip(baseTrip('trip-d2', 'Store trip'));
  store.dispatch({ type: 'copyStopInto', source: { trip: src, stopId: src.days[0].stops[0].id }, placement: { kind: 'scheduled', dayId: store.getState().doc.days[0].id, time: null, order: 1 } });
  const sCopied = lastCopied(store.getState().doc);
  const sPid = sCopied.place.placeId;
  store.dispatch({ type: 'removeStop', stopId: sCopied.id });
  ok('3.2a through the store, the × prunes the place', !store.getState().doc.places.some((p) => p.id === sPid), placeIds(store.getState().doc).join(','));
  store.undo();
  const back = store.getState().doc;
  ok('3.2b Ctrl+Z restores BOTH the stop and the place',
     back.places.some((p) => p.id === sPid) && findStop(back, sCopied.id) !== null,
     `place=${back.places.some((p) => p.id === sPid)} stop=${findStop(back, sCopied.id) !== null}`);
  const conf = core.geoCheck(back).find((f) => f.ref.kind === 'place' && f.ref.id === sPid);
  ok('3.2c ...and the restored place is measured "unanchored", not "certain"',
     conf && conf.confidence === 'unanchored', conf ? conf.confidence : 'no finding');
  store.redo();
  ok('3.2d ...and Ctrl+Shift+Z prunes it again', !store.getState().doc.places.some((p) => p.id === sPid), placeIds(store.getState().doc).join(','));
}

// ---------------------------------------------------------------------------
line('§4 the REAL fixture, at scale, through the store');
{
  const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
  const full = loadEurope2026().trip;
  const marta = { ...full, id: 'trip-marta', ownerId: 'user:marta', title: "Marta's Croatia" };
  const islandDay = full.days.find((d) => d.date === '2026-08-13');
  const jacob = {
    ...full,
    days: full.days.filter((d) => d.date !== '2026-08-13'),
    places: full.places.filter((p) => !/Blue Cave|Stiniva|Hvar Town/i.test(p.name)),
  };
  let n = 0;
  const store = client.createStore({
    ports: { storage: client.memoryStorage(), clock: client.fixedClockPort('2026-08-01'), ids: { newId: (k) => `${k}-copy-${++n}` } },
    debounceMs: 25,
  });
  await store.adoptTrip(jacob);
  await store.flush();
  const nb = () => store.getDerived().conflicts.filter((c) => c.severity === 'blocker');
  const before = { blockers: nb().length, places: store.getState().doc.places.length };
  ok('4.0 precondition: two blockers on the reference trip', before.blockers === 2, String(before.blockers));

  const src = islandDay.stops.find((s) => s.place.kind === 'place' && /Blue Cave/i.test(s.name));
  const splitDay = jacob.days.find((d) => d.cities.includes('split'));
  store.dispatch({ type: 'copyStopInto', source: { trip: marta, stopId: src.id }, placement: { kind: 'scheduled', dayId: splitDay.id, time: null, order: 99 } });
  const copied = store.getState().doc.days.find((d) => d.id === splitDay.id).stops.find((s) => s.provenance.state === 'candidate');
  store.dispatch({ type: 'removeStop', stopId: copied.id });
  const after = { blockers: nb().length, places: store.getState().doc.places.length };
  ok('4.1 Browse -> Copy -> × leaves exactly two blockers', after.blockers === 2,
     JSON.stringify(nb().map((c) => c.ruleId + ' ' + JSON.stringify(c.subjects))));
  ok('4.2 ...and `places.length` is back to what it was before the copy', after.places === before.places,
     `${before.places} -> ${after.places}`);

  // 4.3 — NOT a sweep, on the real data: the reference trip's ~60 orphaned places must all
  // still be there, and place-68 (Fisherman's Bastion) must still be measurable.
  const doc = store.getState().doc;
  const linked = new Set([...doc.days.flatMap((d) => d.stops), ...doc.pool]
    .filter((s) => s.place.kind === 'place').map((s) => s.place.placeId));
  const orphans = doc.places.filter((p) => !linked.has(p.id));
  ok('4.3a the trip\'s own orphaned places are untouched (not a sweep)', orphans.length >= 50, `${orphans.length} orphans survive`);
  const fb = doc.places.find((p) => /Fisherman/i.test(p.name));
  ok('4.3b place-68 (Fisherman\'s Bastion) is still in the document', !!fb, fb ? fb.id : 'MISSING');
  if (fb) {
    const bumped = { ...doc, places: doc.places.map((p) => (p.id === fb.id ? { ...p, at: { lat: p.at.lat + 1, lng: p.at.lng } } : p)) };
    const found = core.detectConflicts(bumped, { today: '2026-08-01' })
      .filter((c) => c.ruleId === 'geo_outlier' && c.subjects.some((s) => s.id === fb.id));
    ok('4.3c ...and a +1° injection into it still mints exactly one geo_outlier naming it', found.length === 1,
       JSON.stringify(found.map((c) => c.severity)));
  }

  // 4.4 — the same on a copy taken into the POOL on the real fixture.
  store.dispatch({ type: 'copyStopInto', source: { trip: marta, stopId: src.id }, placement: { kind: 'pool', cityKey: 'split' } });
  const pooled = store.getState().doc.pool.filter((s) => s.provenance.state === 'candidate').slice(-1)[0];
  store.dispatch({ type: 'removeStop', stopId: pooled.id });
  ok('4.4 a pool copy on the real fixture prunes too, still two blockers',
     nb().length === 2 && store.getState().doc.places.length === before.places,
     `${nb().length} blockers, ${store.getState().doc.places.length} places`);
}

// ---------------------------------------------------------------------------
line('§5 the adjacent door — `updateStop` re-pointing a copied stop\'s place link');
{
  // `apps/web/src/views/StopEditor.tsx:63-76` sends `place` in every edit patch: typing
  // coordinates into the editor for a COPIED stop replaces its `{kind:'place'}` link with
  // `{kind:'inline'}`. `removeStop` is never called, so A-6a never runs — and the place the
  // copy dragged in is orphaned exactly as R9-2 described.
  const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
  const full = loadEurope2026().trip;
  const marta = { ...full, id: 'trip-marta', ownerId: 'user:marta', title: "Marta's Croatia" };
  const islandDay = full.days.find((d) => d.date === '2026-08-13');
  const jacob = {
    ...full,
    days: full.days.filter((d) => d.date !== '2026-08-13'),
    places: full.places.filter((p) => !/Blue Cave|Stiniva|Hvar Town/i.test(p.name)),
  };
  let n = 0;
  const store = client.createStore({
    ports: { storage: client.memoryStorage(), clock: client.fixedClockPort('2026-08-01'), ids: { newId: (k) => `${k}-copy-${++n}` } },
    debounceMs: 25,
  });
  await store.adoptTrip(jacob);
  await store.flush();
  const nb = () => store.getDerived().conflicts.filter((c) => c.severity === 'blocker');
  const src = islandDay.stops.find((s) => s.place.kind === 'place' && /Blue Cave/i.test(s.name));
  const splitDay = jacob.days.find((d) => d.cities.includes('split'));
  store.dispatch({ type: 'copyStopInto', source: { trip: marta, stopId: src.id }, placement: { kind: 'scheduled', dayId: splitDay.id, time: null, order: 99 } });
  const copied = store.getState().doc.days.find((d) => d.id === splitDay.id).stops.find((s) => s.provenance.state === 'candidate');
  const pid = copied.place.placeId;
  ok('5.0 precondition: the copy brought a Place and mints no blocker', store.getState().doc.places.some((p) => p.id === pid) && nb().length === 2,
     `${nb().length} blockers`);

  // Exactly StopEditor's patch, with lat/lng filled in (Split's own coordinates).
  store.dispatch({
    type: 'updateStop',
    stopId: copied.id,
    patch: { name: copied.name, category: copied.category, note: copied.note ?? '', cost: copied.cost ?? null,
             place: { kind: 'inline', at: { lat: 43.5081, lng: 16.4402 } } },
  });
  const doc = store.getState().doc;
  const stillLinked = [...doc.days.flatMap((d) => d.stops), ...doc.pool].some((s) => s.place.kind === 'place' && s.place.placeId === pid);
  console.log(`         place ${pid} still in places=${doc.places.some((p) => p.id === pid)}, still linked=${stillLinked}`);
  const geo = nb().filter((c) => c.ruleId === 'geo_outlier');
  ok('5.1 editing a copied stop\'s coordinates does not orphan its Place into a blocker',
     nb().length === 2 && geo.length === 0,
     `${nb().length} blockers: ${JSON.stringify(nb().map((c) => c.ruleId + ' ' + JSON.stringify(c.subjects)))}`);
}

console.log('\n' + (fails === 0 ? 'ALL OK' : fails + ' FAIL'));
