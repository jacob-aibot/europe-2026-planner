/**
 * Round 9 — **A-6** (`ARCHITECTURE` §2.13 revision 6), the copy-borne `Place`, attacked past
 * `geoCheck.test.ts` and `qa/r8-geo.mjs` §1. Run from `cairn/`:
 *
 *     node qa/r9-geo.mjs
 *
 * A-6's rule is `copyBorne = linking.length > 0 && linking.every(isCopied)`, with four
 * load-bearing clauses. The claims it makes, each attacked below:
 *
 *   §1  two copied stops from TWO DIFFERENT source trips linking the same place
 *   §2  accepting ONE of two copied stops while the other stays a candidate
 *   §3  a place that starts user-authored and becomes copy-only when the user deletes
 *       their own stop (and the reverse: a copy-borne place the user then adopts)
 *   §4  rejection, and removal — clause 1's `linking.length > 0` against the copy path
 *
 * A "FAIL" means the probe found something A-6 says must not happen.
 */
const core = await import('../packages/core/src/index.ts');
const client = await import('../packages/client/src/index.ts');

let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? '\n         ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

const TODAY = '2026-08-01';
const LAX = { lat: 33.9416, lng: -118.4085 };
const VIENNA = { lat: 48.2082, lng: 16.3738 };
/** ~9,100 km from Vienna and ~1,300 km from LAX — outside GEO_LIMIT_KM of either. */
const FAR_A = { lat: 21.3069, lng: -157.8583 };   // Honolulu
const FAR_B = { lat: -33.8688, lng: 151.2093 };   // Sydney

let idn = 0;
const ids = { newId: (k) => `${k}-n${++idn}` };
const ctx = () => ({ ids, clock: { today: () => TODAY }, actorUserId: 'local:self' });

/** A minimal Vienna trip with a home base, so `homeBase` is in the anchor set as on the real trip. */
function baseTrip(id, title, ownerId = 'local:self') {
  let t = core.createTrip({
    title, startDate: '2026-08-07', endDate: '2026-08-08',
    cities: [{ key: 'vienna', name: 'Vienna', centre: VIENNA }],
    homeBase: { name: 'LAX', at: LAX },
  }, ctx());
  return { ...t, id, ownerId };
}

/** A source trip owned by somebody else, holding one stop that links a far-away place. */
function sourceTrip(id, owner, placeName, at) {
  let t = baseTrip(id, owner + "'s trip", 'user:' + owner);
  const place = { id: `place-${owner}`, name: placeName, cityKey: 'vienna', at, kind: 'sight' };
  t = { ...t, places: [...t.places, place] };
  const day = t.days[0];
  t = core.addStop(t, { kind: 'scheduled', dayId: day.id, time: null, order: 1 },
    { name: placeName, category: 'sight', place: { kind: 'place', placeId: place.id } }, ctx());
  return t;
}

const geoOf = (trip) => core.geoCheck(trip);
const placeFindings = (trip) => geoOf(trip).filter((f) => f.ref.kind === 'place');
const blockers = (trip) => core.detectConflicts(trip, { today: TODAY })
  .filter((c) => c.ruleId === 'geo_outlier' && c.severity === 'blocker');
const fmt = (fs) => JSON.stringify(fs.map((f) => `${f.ref.kind}:${f.ref.id} ${f.km}km ${f.confidence}`));

/** Copies `stopName` from `src` into `target` on its first day. */
function copyIn(target, src, order = 10) {
  const stop = src.days[0].stops[0];
  return core.copyStopInto(target,
    { trip: src, stopId: stop.id },
    { kind: 'scheduled', dayId: target.days[0].id, time: null, order },
    ctx());
}

// ---------------------------------------------------------------------------
line('§1 two copied stops, from TWO DIFFERENT source trips, linking the same place');
{
  // Marta and Ana each have a stop at the SAME far-away place (same name, same cityKey, same
  // coordinate) — so `copyStopInto` rule 4's `samePlace` REUSES the first copy's place row
  // for the second copy. `linkedBy` then holds two stops with two different `copiedFrom` trips.
  const marta = sourceTrip('trip-marta', 'marta', 'Diamond Head', FAR_A);
  const ana = sourceTrip('trip-ana', 'ana', 'Diamond Head', FAR_A);
  let jacob = baseTrip('trip-jacob', 'Jacob');
  jacob = copyIn(jacob, marta, 10);
  const afterOne = placeFindings(jacob);
  jacob = copyIn(jacob, ana, 11);

  const copiedPlaces = jacob.places.filter((p) => p.name === 'Diamond Head');
  console.log(`  places named "Diamond Head" in Jacob's trip: ${copiedPlaces.length} (rule 4 reuse)`);
  console.log(`  linking stops: ${jacob.days[0].stops.filter((s) => s.place.kind === 'place' && s.place.placeId === copiedPlaces[0].id).length}`);
  ok('1.1 one copy leaves the place exempt', !afterOne.some((f) => f.confidence === 'certain'), fmt(afterOne));
  ok('1.2 two copies from two DIFFERENT source trips still leave it exempt',
     !placeFindings(jacob).some((f) => f.confidence === 'certain'), fmt(placeFindings(jacob)));
  ok('1.3 no geo_outlier blocker after two Browse-and-copy clicks', blockers(jacob).length === 0,
     JSON.stringify(blockers(jacob).map((c) => c.summary)));
  ok('1.4 the finding is still MEASURED, not skipped (A-6 clause 4)',
     placeFindings(jacob).length === 1 && placeFindings(jacob)[0].km > 0, fmt(placeFindings(jacob)));
}
{
  // Two copies onto two DIFFERENT places (different names) — two exempt rows, not one.
  const marta = sourceTrip('trip-marta', 'marta', 'Diamond Head', FAR_A);
  const ana = sourceTrip('trip-ana', 'ana', 'Opera House', FAR_B);
  let jacob = baseTrip('trip-jacob', 'Jacob');
  jacob = copyIn(jacob, marta, 10);
  jacob = copyIn(jacob, ana, 11);
  const pf = placeFindings(jacob);
  ok('1.5 two copies onto two distinct far places: both exempt, both measured',
     pf.length === 2 && pf.every((f) => f.confidence === 'unanchored' && f.km > 0), fmt(pf));
  ok('1.6 ...and no blocker', blockers(jacob).length === 0, JSON.stringify(blockers(jacob).map((c) => c.summary)));
}

// ---------------------------------------------------------------------------
line('§2 accepting ONE of two copied stops on the same place, the other still a candidate');
{
  const marta = sourceTrip('trip-marta', 'marta', 'Diamond Head', FAR_A);
  const ana = sourceTrip('trip-ana', 'ana', 'Diamond Head', FAR_A);
  let jacob = baseTrip('trip-jacob', 'Jacob');
  jacob = copyIn(jacob, marta, 10);
  jacob = copyIn(jacob, ana, 11);
  const before = geoOf(jacob);
  const placeId = jacob.places.find((p) => p.name === 'Diamond Head').id;
  const copies = jacob.days[0].stops.filter((s) => s.place.kind === 'place' && s.place.placeId === placeId);
  ok('2.0 precondition: two candidate copies on one place', copies.length === 2 && copies.every((s) => s.provenance.state === 'candidate'));

  jacob = core.acceptCandidate(jacob, { kind: 'stop', id: copies[0].id }, 'local:self', TODAY);
  const after = geoOf(jacob);
  const pf = after.filter((f) => f.ref.kind === 'place' && f.ref.id === placeId);
  ok('2.1 accepting ONE copy does NOT flip the place to certain (A-6 clause 3)',
     pf.every((f) => f.confidence !== 'certain'), fmt(pf));
  ok('2.2 acceptance mints no blocker anywhere (A-1/A-6 monotonicity)',
     blockers(jacob).length === 0, JSON.stringify(blockers(jacob).map((c) => c.summary)));
  ok('2.3 acceptance did not ADD any finding at all',
     after.length <= before.length, `before ${fmt(before)} after ${fmt(after)}`);

  // ...then accept the second one too. Still exempt: the clause keys on attribution, and
  // attribution survives acceptance.
  jacob = core.acceptCandidate(jacob, { kind: 'stop', id: copies[1].id }, 'local:self', TODAY);
  const pf2 = geoOf(jacob).filter((f) => f.ref.kind === 'place' && f.ref.id === placeId);
  ok('2.4 accepting BOTH still leaves the place exempt', pf2.every((f) => f.confidence !== 'certain'), fmt(pf2));
  ok('2.5 ...and still no blocker', blockers(jacob).length === 0, JSON.stringify(blockers(jacob).map((c) => c.summary)));
}

// ---------------------------------------------------------------------------
line('§3 a place that changes hands — user-authored -> copy-only, and back');
{
  // Jacob types a stop of his own at a far-away place: that IS the Fisherman's Bastion case
  // and MUST be a blocker.
  let jacob = baseTrip('trip-jacob', 'Jacob');
  const mine = { id: 'place-mine', name: 'Diamond Head', cityKey: 'vienna', at: FAR_A, kind: 'sight' };
  jacob = { ...jacob, places: [...jacob.places, mine] };
  jacob = core.addStop(jacob, { kind: 'scheduled', dayId: jacob.days[0].id, time: null, order: 1 },
    { name: 'Diamond Head', category: 'sight', place: { kind: 'place', placeId: mine.id } }, ctx());
  const onPlace = (t) => blockers(t).filter((c) => c.subjects.some((s) => s.kind === 'place'));
  ok('3.1 a user-authored stop on a far place IS a blocker on the PLACE (the rule still works)',
     onPlace(jacob).length === 1, JSON.stringify(blockers(jacob).map((c) => c.summary)));

  // A friend's copy of the same place lands beside it — rule 4 reuses `place-mine`.
  const marta = sourceTrip('trip-marta', 'marta', 'Diamond Head', FAR_A);
  jacob = copyIn(jacob, marta, 10);
  ok('3.2 rule 4 reused the user\'s own place row', jacob.places.filter((p) => p.name === 'Diamond Head').length === 1,
     JSON.stringify(jacob.places.map((p) => p.id + ':' + p.name)));
  ok('3.3 `every`, not `some`: the user\'s own stop keeps the place measured at certain',
     onPlace(jacob).length === 1, JSON.stringify(blockers(jacob).map((c) => c.summary)));

  // Now Jacob deletes HIS stop. Only the copy is left -> the place becomes copy-borne and the
  // blocker must disappear (A-6: "the only reason this record is here is a copy").
  const withoutMine = core.removeStop(jacob, jacob.days[0].stops.find((s) => s.provenance.state === 'own' || !core.attribution?.(s.provenance)).id, ctx());
  const pf = placeFindings(withoutMine);
  ok('3.4 deleting the user\'s own stop makes the place copy-borne and drops the blocker',
     blockers(withoutMine).length === 0 && pf.length === 1 && pf[0].confidence === 'unanchored',
     `blockers=${JSON.stringify(blockers(withoutMine).map((c) => c.summary))} findings=${fmt(pf)}`);

  // ...and the reverse: the user adds a stop of their own onto a copy-borne place. A-6 says
  // that is exactly when the exemption ends and a genuine outlier is reported.
  let adopted = core.addStop(withoutMine, { kind: 'scheduled', dayId: withoutMine.days[0].id, time: null, order: 20 },
    { name: 'my own visit', category: 'sight', place: { kind: 'place', placeId: mine.id } }, ctx());
  ok('3.5 the user authoring their own stop on a copy-borne place ends the exemption',
     blockers(adopted).length >= 1, JSON.stringify(blockers(adopted).map((c) => c.summary)));
}

// ---------------------------------------------------------------------------
line('§4 rejection and removal — clause 1 (`linking.length > 0`) against the copy path');
{
  const marta = sourceTrip('trip-marta', 'marta', 'Diamond Head', FAR_A);
  let jacob = baseTrip('trip-jacob', 'Jacob');
  jacob = copyIn(jacob, marta, 10);
  const copyStop = jacob.days[0].stops.find((s) => s.provenance.state === 'candidate');
  const placeId = jacob.places.find((p) => p.name === 'Diamond Head').id;
  ok('4.0 precondition: exempt, no blocker', blockers(jacob).length === 0);

  // (a) REJECT it. `rejectCandidate` leaves the stop in the document, badged — so `linkedBy`
  // still names it and `isCopied` is still true.
  const rejected = core.rejectCandidate(jacob, { kind: 'stop', id: copyStop.id }, 'local:self', TODAY);
  const stillThere = rejected.days[0].stops.some((s) => s.id === copyStop.id);
  console.log(`  after rejectCandidate: stop present=${stillThere}, state=${rejected.days[0].stops.find((s) => s.id === copyStop.id)?.provenance.state}`);
  ok('4.1 rejecting a copied stop does not mint a blocker on its place',
     blockers(rejected).length === 0, JSON.stringify(blockers(rejected).map((c) => c.summary)));

  // (b) REMOVE it — the user throws the copied stop away. The Place rule 4 dragged in stays
  // in `trip.places` with nothing pointing at it. Clause 1 says `linking.length === 0` is
  // measured at 'certain' "exactly as today". Does the copy path therefore mint a blocker
  // one click after the copy is undone?
  const removed = core.removeStop(rejected, copyStop.id, ctx());
  const orphan = removed.places.find((p) => p.id === placeId);
  console.log(`  after removeStop: place still in trip.places=${!!orphan}, stops linking it=${
    removed.days.flatMap((d) => d.stops).concat(removed.pool).filter((s) => s.place.kind === 'place' && s.place.placeId === placeId).length}`);
  const bl = blockers(removed);
  ok('4.2 deleting the copied stop does not leave a geo_outlier BLOCKER behind on the orphaned copied place',
     bl.length === 0,
     bl.length ? `A-6 clause 1 measures an orphan at 'certain'; the orphan here was created BY the copy path: ${
       JSON.stringify(bl.map((c) => `${c.summary} :: ${JSON.stringify(c.subjects)}`))}` : '');

  // (c) the same, without the rejection step — plain copy then delete.
  let j2 = baseTrip('trip-jacob2', 'Jacob');
  j2 = copyIn(j2, marta, 10);
  const s2 = j2.days[0].stops.find((s) => s.provenance.state === 'candidate');
  const j3 = core.removeStop(j2, s2.id, ctx());
  ok('4.3 copy then delete (no reject) — same question, same answer', blockers(j3).length === 0,
     JSON.stringify(blockers(j3).map((c) => c.summary)));
}

// ---------------------------------------------------------------------------
line('§5 §4.2/§4.3 on the REAL fixture, through the store — copy, then press "×"');
{
  // `qa/r8-geo.mjs` §1's setup exactly, plus one more click: the DayTimeline "×" button
  // (`apps/web/src/views/DayTimeline.tsx:192`). Browse -> Copy -> ×.
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
    ports: {
      storage: client.memoryStorage(),
      clock: client.fixedClockPort('2026-08-01'),
      ids: { newId: (k) => `${k}-copy-${++n}` },
    },
    debounceMs: 25,
  });
  await store.adoptTrip(jacob);
  await store.flush();
  const nb = () => store.getDerived().conflicts.filter((c) => c.severity === 'blocker');
  console.log(`  before the copy: ${nb().length} blockers`);
  ok('5.0 precondition: the reference trip carries exactly two blockers', nb().length === 2);

  const src = islandDay.stops.find((s) => s.place.kind === 'place' && /Blue Cave/i.test(s.name));
  const splitDay = jacob.days.find((d) => d.cities.includes('split'));
  store.dispatch({ type: 'copyStopInto', source: { trip: marta, stopId: src.id }, placement: { kind: 'scheduled', dayId: splitDay.id, time: null, order: 99 } });
  console.log(`  after Browse & copy:  ${nb().length} blockers  (A-6 closed R8-2 here)`);
  ok('5.1 the copy alone mints no blocker (A-6/R8-2, re-confirmed on the fixture)', nb().length === 2,
     JSON.stringify(nb().map((c) => c.summary)));

  const copied = store.getState().doc.days.find((d) => d.id === splitDay.id).stops.find((s) => s.provenance.state === 'candidate');
  const copiedPlaceId = copied.place.placeId;
  store.dispatch({ type: 'removeStop', stopId: copied.id });
  const after = nb();
  console.log(`  after pressing "×":   ${after.length} blockers`);
  for (const c of after.filter((x) => x.ruleId === 'geo_outlier')) console.log(`    ${JSON.stringify(c.subjects)} — ${c.summary}`);
  ok('5.2 undoing the copy by deleting the stop does not leave a third blocker on the fixture',
     after.length === 2 && !after.some((c) => c.ruleId === 'geo_outlier'),
     `the orphaned copied Place ${copiedPlaceId} is measured at 'certain' — a blocker naming a record `
     + 'the user never typed a coordinate into, on ROADMAP C\'s two-blocker ceiling');

  // Ctrl+Z is the other way a user "undoes" the copy, and it is a snapshot restore, so the
  // place goes with it. Stated for contrast: the defect is specific to `removeStop`.
  store.undo();
  console.log(`  after Ctrl+Z instead: ${nb().length} blockers`);
  ok('5.3 (contrast) Ctrl+Z after the copy restores the pre-copy snapshot and is clean', nb().length === 2);
}

console.log('\n' + (fails === 0 ? 'ALL OK' : fails + ' FAIL'));
