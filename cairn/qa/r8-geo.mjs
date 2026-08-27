/**
 * Round 8 — the architect's **A-1** ruling (`ARCHITECTURE` §2.13 revision 5), attacked.
 *
 * A-1 makes two promises about `geoCheck`:
 *
 *   1. the copy primitive never mints a `geo_outlier` blocker — *"a stop copied from another
 *      trip being far from this trip's geography is not odd, it is the point of the feature"*;
 *   2. acceptance is monotone — *"acceptance can only ever ADD anchors, so it can only ever
 *      remove a blocker, never create one. A transition that can mint a blocker is exactly
 *      what this ruling exists to stop."*
 *
 * Both are falsifiable, and both are falsified here. Run from `cairn/`:
 *
 *     node qa/r8-geo.mjs
 *
 * A "FAIL" means the probe found what it was looking for — see `docs/QA-FINDINGS.md` R8-2
 * and R8-3 before assuming the script is broken.
 */
const core = await import('../packages/core/src/index.ts');
const client = await import('../packages/client/src/index.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');

let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? '\n         ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

// ---------------------------------------------------------------------------
line('§1 R8-2 — one Browse-and-copy click mints a blocker, on the REAL fixture');
{
  // Marta planned the Aug 13 island day (Blue Cave, Biševo — a `place` link, 64 km from the
  // Split centre it is filed under). Jacob's trip has Split but no island day. He browses her
  // trip and copies the one stop. `copyStopInto` rule 4 drags the Place across with its
  // `cityKey` verbatim — and §2.13's copied-record row exempts the STOP, not the Place.
  const full = loadEurope2026().trip;
  const marta = { ...full, id: 'trip-marta', ownerId: 'user:marta', title: "Marta's Croatia" };
  const islandDay = full.days.find((d) => d.date === '2026-08-13');
  const jacob = {
    ...full,
    days: full.days.filter((d) => d.date !== '2026-08-13'),
    places: full.places.filter((p) => !/Blue Cave|Stiniva|Hvar Town/i.test(p.name)),
  };

  let idn = 0;
  const store = client.createStore({
    ports: {
      storage: client.memoryStorage(),
      clock: client.fixedClockPort('2026-08-01'),
      // NOT `sequentialIdPort()`: it restarts at 1 and would collide with the adopted trip's
      // own `place-1`, which produces a different (spurious) finding.
      ids: { newId: (k) => `${k}-copy-${++idn}` },
    },
    debounceMs: 25,
  });
  await store.adoptTrip(jacob);
  await store.flush();

  const before = store.getDerived().conflicts;
  const geoBefore = before.filter((c) => c.ruleId === 'geo_outlier');
  console.log(`  before: ${before.filter((c) => c.severity === 'blocker').length} blockers, ${geoBefore.length} geo_outlier`);
  ok('precondition: the reference trip carries exactly two blockers, both Jacob\'s own flags',
     before.filter((c) => c.severity === 'blocker').length === 2 && geoBefore.length === 0);

  const src = islandDay.stops.find((s) => s.place.kind === 'place' && /Blue Cave/i.test(s.name));
  const splitDay = jacob.days.find((d) => d.cities.includes('split'));
  console.log(`  copying "${src.name}" from Marta onto ${splitDay.date} (Split)`);
  store.dispatch({
    type: 'copyStopInto',
    source: { trip: marta, stopId: src.id },
    placement: { kind: 'scheduled', dayId: splitDay.id, time: null, order: 99 },
  });

  const after = store.getDerived().conflicts;
  const geo = after.filter((c) => c.ruleId === 'geo_outlier');
  console.log(`  after:  ${after.filter((c) => c.severity === 'blocker').length} blockers, ${geo.length} geo_outlier`);
  for (const c of geo) console.log(`    ${c.severity} ${JSON.stringify(c.subjects)} — ${c.summary}`);
  ok('the copy primitive does not mint a geo_outlier blocker (A-1 promise 1)',
     geo.length === 0,
     geo.length ? 'a third blocker appeared, on a record the user deliberately asked for, seconds after asking for it' : '');
  ok('the copied STOP itself is correctly exempt (the half A-1 did implement)',
     !geo.some((c) => c.subjects.some((s) => s.kind === 'stop')));
}

// ---------------------------------------------------------------------------
line('§2 R8-3 — accepting a copied stop REMOVES an anchor and mints a blocker');
{
  // §2.13's anchor table gives day D "the last coordinate-bearing stop of D-1". `geoCheck`
  // takes that representative from the ANCHORABLE list, and `anchorsOthers()` drops
  // un-accepted copies out of it. So accepting a copy can REPLACE the representative rather
  // than add to the anchor set — the adjacent-day anchor is min-of-one-by-position, not
  // min-over-all, and monotonicity does not hold for it.
  const prov = () => ({ source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-01-01', acceptedAt: '2026-01-01', actorUserId: 'local:self' });
  const copiedProv = (state) => ({
    source: 'friend', state, confidence: 'asserted',
    origin: { friendUserId: 'user:marta', sourceTripId: 'trip-x', sourceStopId: 'stop-x' },
    addedAt: '2026-01-01', acceptedAt: state === 'accepted' ? '2026-01-02' : null, actorUserId: 'local:self',
  });
  const stop = (id, name, lat, lng, order, provenance, dayId) => ({
    id, name, category: 'sight', place: { kind: 'inline', at: { lat, lng } },
    note: '', cost: null, arrival: null, travelRole: 'transfer', bookingId: null,
    flags: [], provenance, durationMins: null,
    placement: { kind: 'scheduled', dayId, time: null, order },
  });
  const trip = (copiedState) => ({
    schemaVersion: 1, id: 'trip-1', ownerId: 'local:self', title: 'T',
    startDate: '2026-08-01', endDate: '2026-08-02', cities: [], homeBase: null,
    days: [
      { id: 'd1', date: '2026-08-01', primaryCity: 'transit', cities: [], title: 'D1', subtitle: '', provenance: prov(),
        stops: [
          stop('s-own', 'Lisbon office', 38.72, -9.14, 0, prov(), 'd1'),
          stop('s-copy', 'Paris, copied from a friend', 48.85, 2.35, 1, copiedProv(copiedState), 'd1'),
        ] },
      { id: 'd2', date: '2026-08-02', primaryCity: 'transit', cities: [], title: 'D2', subtitle: '', provenance: prov(),
        stops: [stop('s-victim', 'My own Lisbon lunch', 38.73, -9.15, 0, prov(), 'd2')] },
    ],
    pool: [], places: [], bookings: [], resolutions: [], revision: 1,
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
  });

  const blockersOn = (t, id) => core.detectConflicts(t, { today: '2026-07-01' })
    .filter((c) => c.ruleId === 'geo_outlier' && c.subjects.some((s) => s.id === id));

  const bBefore = blockersOn(trip('candidate'), 's-victim');
  const bAfter = blockersOn(trip('accepted'), 's-victim');
  console.log('  s-victim (a stop the user wrote themselves): candidate ->', bBefore.length, 'blockers; accepted ->', bAfter.length);
  console.log('  geoCheck, after accept:', JSON.stringify(core.geoCheck(trip('accepted'))));
  ok('acceptance is monotone: it can only remove a blocker, never create one (A-1 promise 2)',
     bAfter.length <= bBefore.length,
     'accepting a copied stop made it the "last coordinate of D-1", REPLACING the anchor the '
     + 'user\'s own stop was measured against — geoCheck.ts:177 / :178 take one representative '
     + 'by position from the anchorable list');
}

// ---------------------------------------------------------------------------
line('§3 the parts of A-1 that DO hold');
{
  const prov = () => ({ source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-01-01', acceptedAt: '2026-01-01', actorUserId: 'local:self' });
  const day = (id, date, cities, stops) => ({ id, date, primaryCity: cities[0] ?? 'transit', cities, title: id, subtitle: '', provenance: prov(), stops });
  const st = (id, name, placeId, order, dayId) => ({
    id, name, category: 'sight', place: { kind: 'place', placeId }, note: '', cost: null,
    arrival: null, travelRole: 'transfer', bookingId: null, flags: [], provenance: prov(),
    durationMins: null, placement: { kind: 'scheduled', dayId, time: null, order },
  });
  const pl = (id, name, cityKey, lat, lng) => ({ id, name, cityKey, category: 'sight', at: { lat, lng }, note: '' });
  const base = (id, owner, title, days, places) => ({
    schemaVersion: 1, id, ownerId: owner, title, startDate: '2026-08-01', endDate: '2026-08-02',
    cities: [{ key: 'london', name: 'London', centre: { lat: 51.5072, lng: -0.1276 } }], homeBase: null,
    days, pool: [], places, bookings: [], resolutions: [], revision: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01',
  });
  let n = 0;
  const ids = { newId: (k) => `${k}-c${++n}` };
  const a = base('trip-a', 'user:marta', 'A', [day('ad1', '2026-08-01', ['london'], [st('as1', 'Stonehenge', 'ap1', 0, 'ad1')])], [pl('ap1', 'Stonehenge', 'london', 51.1789, -1.8262)]);
  const b = base('trip-b', 'local:self', 'B', [day('bd1', '2026-08-01', ['london'], [])], []);
  const b2 = core.copyStopInto(b, { trip: a, stopId: 'as1' }, { kind: 'scheduled', dayId: 'bd1', time: null, order: 0 }, { ids, today: '2026-07-01', actorUserId: 'local:self' });
  const c = base('trip-c', 'user:sam', 'C', [day('cd1', '2026-08-01', ['london'], [])], []);
  const copiedId = b2.days[0].stops[0].id;
  const c2 = core.copyStopInto(c, { trip: b2, stopId: copiedId }, { kind: 'scheduled', dayId: 'cd1', time: null, order: 0 }, { ids, today: '2026-07-01', actorUserId: 'user:sam' });
  const s2 = c2.days[0].stops[0];
  ok('a copy of a copy resolves its place reference in the new trip',
     s2.place.kind === 'place' && c2.places.some((p) => p.id === s2.place.placeId), JSON.stringify(s2.place));
  ok('and its credit names the trip it was copied FROM, not the head of the chain',
     core.attribution(s2.provenance)?.sourceTripId === 'trip-b', JSON.stringify(core.attribution(s2.provenance)));
  ok('a copied stop is measured but never `certain` (the half A-1 did implement)',
     core.geoCheck(c2).filter((f) => f.ref.kind === 'stop').every((f) => f.confidence === 'unanchored'),
     JSON.stringify(core.geoCheck(c2)));
}

console.log(`\n== r8-geo: ${fails} FAIL ==`);
