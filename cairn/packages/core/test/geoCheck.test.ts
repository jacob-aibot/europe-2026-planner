/**
 * `geoCheck` (ARCHITECTURE §2.13) — the ONE implementation of coordinate-to-anchor
 * distance in `packages/core`, and `geo_outlier`'s only input.
 *
 * The rule it replaces was measured against `day.primaryCity` alone. It produced 6 blockers
 * on the reference trip, all 6 legitimate stops, and it could not see the bug it existed
 * for: re-introducing the historical Fisherman's Bastion typo (`place-68`, lat
 * 47.5025 → 48.5025, 111 km north) changed nothing at all, because the rule examined 31 of
 * 238 coordinate-bearing records and none of the 95 places.
 *
 * The criteria below are ROADMAP C's, including the detection-rate census, which is the
 * only kind of check that would have caught the old rule.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { europe2026, FIXTURE_TODAY } from './fixture.ts';
import {
  acceptCandidate, addStop, attribution, copyStopInto, createTrip, detectConflicts, geoCheck,
  rejectCandidate, removeStop, sequentialIds, validateTrip,
} from '../src/index.ts';
import type { BuildCtx, Place, Stop, Trip } from '../src/index.ts';

const PERMITTED_PLACE_MISSES = ['Blue Cave, Biševo', 'Stiniva Cove, Vis'];

function withPlaceMoved(trip: Trip, placeId: string, dLat: number): Trip {
  return {
    ...trip,
    places: trip.places.map((p) =>
      p.id === placeId && p.at ? ({ ...p, at: { lat: p.at.lat + dLat, lng: p.at.lng } } as Place) : p,
    ),
  };
}

/** Moves one scheduled stop by displacing whatever coordinate it resolves through. */
function withStopMoved(trip: Trip, stopId: string, dLat: number): Trip | null {
  for (const day of trip.days) {
    const stop = day.stops.find((s) => s.id === stopId);
    if (!stop) continue;
    const link = stop.place;
    if (link.kind === 'inline') {
      const moved = { lat: link.at.lat + dLat, lng: link.at.lng };
      const stops = day.stops.map((s) => (s.id === stopId ? { ...s, place: { kind: 'inline' as const, at: moved } } : s));
      return { ...trip, days: trip.days.map((d) => (d.id === day.id ? { ...d, stops } : d)) };
    }
    if (link.kind === 'place') return withPlaceMoved(trip, link.placeId, dLat);
    return null; // {kind:'none'} — no coordinate to displace
  }
  return null;
}

test('geoCheck returns 0 findings on the unmodified reference trip', () => {
  const { trip } = europe2026();
  const findings = geoCheck(trip);
  assert.deepEqual(
    findings.filter((f) => f.confidence === 'certain').map((f) => `${f.ref.kind}:${f.ref.id} ${f.km}km`),
    [],
  );
});

test('geo_outlier returns 0 blockers on the unmodified reference trip', () => {
  const { trip } = europe2026();
  assert.deepEqual(
    detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier').map((c) => c.summary),
    [],
  );
});

test('the Fisherman\'s Bastion typo is caught: exactly one extra blocker, naming place-68, km ~110', () => {
  const { trip } = europe2026();
  const bastion = trip.places.find((p) => p.id === 'place-68');
  assert.ok(bastion, 'place-68 must exist');
  assert.match(bastion.name, /Fisherman|Bastion/i, `place-68 is "${bastion.name}"`);

  const before = detectConflicts(trip, { today: FIXTURE_TODAY });
  const typo = withPlaceMoved(trip, 'place-68', 1);
  const after = detectConflicts(typo, { today: FIXTURE_TODAY });

  const added = after.filter((c) => !before.some((b) => b.id === c.id));
  assert.equal(added.length, 1, `expected exactly one new conflict, got ${added.map((c) => c.ruleId).join(', ')}`);
  assert.equal(added[0].ruleId, 'geo_outlier');
  assert.equal(added[0].severity, 'blocker');
  assert.deepEqual(added[0].subjects, [{ kind: 'place', id: 'place-68' }]);
  assert.ok(Math.abs(Number(added[0].params.km) - 110) < 3, `km was ${added[0].params.km}`);
});

test('detection rate under a +1° latitude fault: 112/112 scheduled stops', () => {
  const { trip } = europe2026();
  const missed: string[] = [];
  let checked = 0;
  for (const day of trip.days) {
    for (const stop of day.stops) {
      const faulted = withStopMoved(trip, stop.id, 1);
      if (!faulted) continue; // no coordinate at all
      checked++;
      const hit = geoCheck(faulted).some((f) => f.confidence === 'certain');
      if (!hit) missed.push(`${day.id} ${stop.name}`);
    }
  }
  assert.equal(checked, 112, `only ${checked} scheduled stops carry a coordinate`);
  assert.deepEqual(missed, [], `${missed.length} of ${checked} stops went undetected`);
});

test('detection rate under a +1° latitude fault: 92/94 places, and the 2 misses are the named ones', () => {
  const { trip } = europe2026();
  const coordPlaces = trip.places.filter((p) => p.at && Number.isFinite(p.at.lat));
  const missed: string[] = [];
  for (const p of coordPlaces) {
    const faulted = withPlaceMoved(trip, p.id, 1);
    const hit = geoCheck(faulted).some((f) => f.confidence === 'certain' && f.ref.id === p.id);
    if (!hit) missed.push(p.name);
  }
  assert.equal(coordPlaces.length, 94, `${coordPlaces.length} coordinate-bearing places`);
  assert.deepEqual(missed.sort(), [...PERMITTED_PLACE_MISSES].sort(),
    'the permitted misses are named in §2.13; anything else is a regression');
});

test('a pool stop with a ±1° typo is caught — the record class the old rule skipped entirely', () => {
  const { trip } = europe2026();
  const pooled = trip.pool.filter((s: Stop) => s.place.kind !== 'none');
  assert.ok(pooled.length > 0);
  const missed: string[] = [];
  for (const s of pooled) {
    let faulted: Trip;
    const link = s.place;
    if (link.kind === 'inline') {
      const at = { lat: link.at.lat + 1, lng: link.at.lng };
      faulted = { ...trip, pool: trip.pool.map((x) => (x.id === s.id ? { ...x, place: { kind: 'inline' as const, at } } : x)) };
    } else if (link.kind === 'place') {
      faulted = withPlaceMoved(trip, link.placeId, 1);
    } else continue;
    if (!geoCheck(faulted).some((f) => f.confidence === 'certain')) missed.push(s.name);
  }
  assert.deepEqual(missed, []);
});

test('a legitimate day trip 50 km out stays silent — Krka, Aug 14', () => {
  const { trip } = europe2026();
  const krka = trip.days.find((d) => d.id === '2026-08-14')!.stops.map((s) => s.id);
  const findings = geoCheck(trip).filter((f) => krka.includes(f.ref.id));
  assert.deepEqual(findings, []);
});

test('a whole day of shifted coordinates is invisible — §2.13 says so, and that is ALL that is invisible', () => {
  const { trip } = europe2026();
  const day = trip.days.find((d) => d.id === '2026-08-11')!; // a single-city day
  let shifted: Trip = trip;
  for (const stop of day.stops) shifted = withStopMoved(shifted, stop.id, 1) ?? shifted;
  const findings = geoCheck(shifted).filter((f) => f.confidence === 'certain');
  // The day's own stops anchor each other, so they are silent. But places filed under that
  // city are NOT part of the shift and the shifted stops become their far anchors — the
  // check must not go quiet across the whole trip.
  assert.equal(findings.some((f) => day.stops.some((s) => s.id === f.ref.id)), false,
    'a bulk shift is invisible, as documented — this is the limitation, not a surprise');
});

test('geoCheck reports km, limitKm and the anchor kind — and never a coordinate', () => {
  const { trip } = europe2026();
  const typo = withPlaceMoved(trip, 'place-68', 1);
  const f = geoCheck(typo).find((x) => x.ref.id === 'place-68')!;
  assert.ok(f);
  assert.equal(f.limitKm, 35);
  assert.equal(f.confidence, 'certain');
  assert.ok(f.nearest, 'a place in a six-city trip always has an anchor');
  assert.equal(typeof f.km, 'number');
});

test('a trip with homeBase null still works, and LAX is the reason homeBase exists', () => {
  const { trip } = europe2026();
  assert.deepEqual(trip.homeBase, { name: 'Los Angeles (LAX)', at: { lat: 33.9425, lng: -118.4081 } });
  const orphaned = { ...trip, homeBase: null };
  const findings = geoCheck(orphaned).filter((f) => f.confidence === 'certain');
  const names = findings.map((f) => f.ref.id);
  assert.ok(findings.length >= 1, 'without homeBase, the LAX stops lose their only anchor');
  assert.ok(names.length > 0);
  // and it must not throw
  assert.equal(validateTrip(orphaned).some((i) => (i.code as string) === 'stop_far_from_city'), false);
});

test('validateTrip no longer emits stop_far_from_city — the code does not exist', () => {
  const { trip } = europe2026();
  const typo = withPlaceMoved(trip, 'place-68', 1);
  for (const t of [trip, typo]) {
    assert.deepEqual(validateTrip(t).filter((i) => (i.code as string) === 'stop_far_from_city'), []);
  }
});

// ---------------------------------------------------------------------------
// §2.13's copied-record row (revision 5, QA R2-9). Two faults, one criterion:
// the rule has to stop causing the bug it caused, AND the fix must not open a
// way for an un-accepted copy to SUPPRESS a real blocker.
// ---------------------------------------------------------------------------

/** A Lisbon trip with one own stop, plus "Arrive LAX" copied in from the reference trip. */
function lisbonWithCopiedLax(): { trip: Trip; copiedId: string; ownStopId: string; dayId: string } {
  const { trip: europe } = europe2026();
  const ctx: BuildCtx = { ids: sequentialIds('d'), now: '2026-08-25', actorUserId: 'local:self' };
  let t = createTrip(
    {
      id: 'trip-lisbon', title: 'Lisbon', ownerId: 'local:self',
      startDate: '2026-09-01', endDate: '2026-09-03',
      homeBase: { name: 'Lisbon', at: { lat: 38.7223, lng: -9.1393 } },
      cities: [{ key: 'lisbon', name: 'Lisbon', countryCode: 'PT', centre: { lat: 38.7223, lng: -9.1393 } }],
    },
    ctx,
  );
  const dayId = t.days[0].id;
  t = addStop(
    t,
    { kind: 'scheduled', dayId, time: '10:00', order: 0 },
    { name: 'Jerónimos Monastery', category: 'sight', place: { kind: 'inline', at: { lat: 38.6979, lng: -9.2065 } } },
    ctx,
  );
  const ownStopId = t.days[0].stops[0].id;

  const lax = europe.days.flatMap((d) => d.stops).find((s) => /LAX/.test(s.name));
  assert.ok(lax, 'the reference trip must carry an "Arrive LAX" stop or this proves nothing');
  t = copyStopInto(
    t,
    { trip: europe, stopId: lax.id },
    { kind: 'scheduled', dayId, time: null, order: 9 },
    { ids: sequentialIds('c'), today: '2026-09-01', actorUserId: 'local:self' },
  );
  const copied = t.days[0].stops.find((s) => attribution(s) !== null);
  assert.ok(copied, 'the copy did not land with an attribution');
  return { trip: t, copiedId: copied.id, ownStopId, dayId };
}

test('R2-9 (a): a copied stop is measured but never certain, so the copy path mints no blocker', () => {
  const { trip, copiedId } = lisbonWithCopiedLax();
  const finding = geoCheck(trip).find((f) => f.ref.id === copiedId);
  assert.ok(finding, 'the copied stop must still produce a finding — the distance is measured, not skipped');
  assert.equal(finding.confidence, 'unanchored', 'a copied stop may never be `certain`');
  assert.notEqual(
    finding.nearest,
    null,
    'nearest === null means "skip the record"; §2.13 asks for "measure it and decline to publish"',
  );
  assert.ok(finding.km > 8000 && finding.km < 10000, `expected ~9140 km, got ${finding.km}`);

  assert.deepEqual(
    detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier'),
    [],
    'copying a stop from a distant trip is the feature working, not a defect (§0.5)',
  );
});

test('R2-9 (a): accepting the copy still mints no blocker', () => {
  const { trip, copiedId } = lisbonWithCopiedLax();
  const accepted = acceptCandidate(trip, { kind: 'stop', id: copiedId }, 'local:self', '2026-09-02');
  assert.deepEqual(
    detectConflicts(accepted, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier'),
    [],
    'acceptance must never CREATE a blocker — §2.13 makes that a monotonicity property',
  );
  const finding = geoCheck(accepted).find((f) => f.ref.id === copiedId);
  assert.equal(finding?.confidence, 'unanchored',
    'the row keys on attribution(), which acceptance preserves — not on provenance.state');
});

test('R2-9 (b): an UN-ACCEPTED copy cannot suppress a real blocker on the user\'s own stop', () => {
  // The symmetric half of §2.13's ruling. An anchor asserts "the trip's geography includes
  // this point", and an un-accepted candidate is by construction not yet part of the plan.
  // Place the faulted own stop within 35 km of the copied one and >35 km from everything
  // else, so the copy is the ONLY thing that could silence it.
  const { trip, copiedId, dayId } = lisbonWithCopiedLax();
  const copied = trip.days[0].stops.find((s) => s.id === copiedId);
  assert.ok(copied && copied.place.kind === 'inline', 'the copied stop must carry an inline coordinate');
  const at = copied.place.at;

  const ctx: BuildCtx = { ids: sequentialIds('f'), now: '2026-08-25', actorUserId: 'local:self' };
  const faulted = addStop(
    trip,
    { kind: 'scheduled', dayId, time: '15:00', order: 8 },
    // ~11 km north of the copied stop, and an ocean away from Lisbon.
    { name: 'Typo Beach', category: 'sight', place: { kind: 'inline', at: { lat: at.lat + 0.1, lng: at.lng } } },
    ctx,
  );
  const faultedId = faulted.days[0].stops.find((s) => s.name === 'Typo Beach')!.id;

  const blockers = detectConflicts(faulted, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier');
  assert.equal(blockers.length, 1, 'an un-accepted copy silenced a real blocker on the user\'s own stop');
  assert.deepEqual(blockers[0].subjects.map((s) => s.id), [faultedId]);

  // …and accepting the copy removes it, because acceptance only ever ADDS anchors.
  const accepted = acceptCandidate(faulted, { kind: 'stop', id: copiedId }, 'local:self', '2026-09-02');
  assert.deepEqual(
    detectConflicts(accepted, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier'),
    [],
    'once accepted, the copy joins the anchor set like any other stop',
  );
});

test('R2-9 ceiling: the reference trip has no attributed record, so none of §2.13\'s numbers move', () => {
  const { trip } = europe2026();
  assert.equal(
    trip.days.flatMap((d) => d.stops).concat(trip.pool).filter((s) => attribution(s) !== null).length,
    0,
    'the reference trip gained an attributed record; §2.13\'s census no longer applies as written',
  );
  assert.deepEqual(geoCheck(trip), [], '0 findings on the unmodified trip, unchanged by the new row');
  const typo = withPlaceMoved(trip, 'place-68', 1);
  const extra = detectConflicts(typo, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier');
  assert.equal(extra.length, 1, 'the Fisherman\'s Bastion blocker must still fire');
  assert.deepEqual(extra[0].subjects.map((s) => s.id), ['place-68']);
});

// ---------------------------------------------------------------------------
// A-6 (revision 6, QA R8-2) — the COPY-BORNE PLACE.
//
// Revision 5's "Places need no row of their own" paragraph is withdrawn: its premise (an
// unrecognised `cityKey` yields `nearest === null`) is false for any trip with a `homeBase`,
// and the reference trip has one. One Browse-and-copy click therefore put a THIRD
// `geo_outlier` blocker on the reference trip, naming a `Place` the user never typed a
// coordinate into and never accepted.
//
// A `Place` is copy-borne iff at least one stop in this trip resolves through it AND every
// one of them is `attribution(stop) !== null`. Copy-borne places are measured — `km` and
// `nearest` are real — and never published.
// ---------------------------------------------------------------------------

/** A Lisbon trip with one own stop, plus a PLACE-LINKED stop copied in from the reference trip. */
function lisbonWithCopiedPlaceStop(): {
  trip: Trip; copiedStopId: string; copiedPlaceId: string; ownStopId: string; dayId: string;
} {
  const { trip: europe } = europe2026();
  const ctx: BuildCtx = { ids: sequentialIds('d'), now: '2026-08-25', actorUserId: 'local:self' };
  let t = createTrip(
    {
      id: 'trip-lisbon', title: 'Lisbon', ownerId: 'local:self',
      startDate: '2026-09-01', endDate: '2026-09-03',
      homeBase: { name: 'Lisbon', at: { lat: 38.7223, lng: -9.1393 } },
      cities: [{ key: 'lisbon', name: 'Lisbon', countryCode: 'PT', centre: { lat: 38.7223, lng: -9.1393 } }],
    },
    ctx,
  );
  const dayId = t.days[0].id;
  t = addStop(
    t,
    { kind: 'scheduled', dayId, time: '10:00', order: 0 },
    { name: 'Jerónimos Monastery', category: 'sight', place: { kind: 'inline', at: { lat: 38.6979, lng: -9.2065 } } },
    ctx,
  );
  const ownStopId = t.days[0].stops[0].id;

  const src = europe.days.flatMap((d) => d.stops).find((s) => s.place.kind === 'place');
  assert.ok(src, 'the reference trip must carry a place-linked stop or this proves nothing');
  const before = new Set(t.places.map((p) => p.id));
  t = copyStopInto(
    t,
    { trip: europe, stopId: src.id },
    { kind: 'scheduled', dayId, time: null, order: 9 },
    { ids: sequentialIds('c'), today: '2026-09-01', actorUserId: 'local:self' },
  );
  const copiedPlace = t.places.find((p) => !before.has(p.id));
  assert.ok(copiedPlace, 'rule 4 must have dragged the Place across, or the scenario is not R8-2\'s');
  const copied = t.days[0].stops.find((s) => attribution(s) !== null);
  assert.ok(copied, 'the copy did not land with an attribution');
  assert.equal(copied.place.kind, 'place', 'the copied stop must resolve through the copied Place');
  return { trip: t, copiedStopId: copied.id, copiedPlaceId: copiedPlace.id, ownStopId, dayId };
}

test('A-6 (R8-2): the Place a copy drags in is measured but never certain, and mints no blocker', () => {
  const { trip, copiedPlaceId } = lisbonWithCopiedPlaceStop();
  const finding = geoCheck(trip).find((f) => f.ref.kind === 'place' && f.ref.id === copiedPlaceId);
  assert.ok(finding, 'the copied place must still produce a finding — measured, not skipped');
  assert.equal(finding.confidence, 'unanchored', 'a copy-borne Place may never be `certain`');
  assert.notEqual(
    finding.nearest,
    null,
    '`nearest === null` is "skip the record"; §2.13 asks for "measure it and decline to publish"',
  );
  assert.ok(finding.km > 35, `the distance must still be real, got ${finding.km}`);

  assert.deepEqual(
    detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier'),
    [],
    'one Browse-and-copy click may not mint a geo_outlier blocker — §0.5, ROADMAP C(c)',
  );
});

test('A-6: accepting the copied stop does NOT make its place certain — the clause keys on attribution()', () => {
  const { trip, copiedStopId, copiedPlaceId } = lisbonWithCopiedPlaceStop();
  const accepted = acceptCandidate(trip, { kind: 'stop', id: copiedStopId }, 'local:self', '2026-09-02');
  assert.deepEqual(
    detectConflicts(accepted, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier'),
    [],
    'acceptance must never CREATE a blocker — had A-6 keyed on provenance.state, it would here',
  );
  const finding = geoCheck(accepted).find((f) => f.ref.kind === 'place' && f.ref.id === copiedPlaceId);
  assert.equal(finding?.confidence, 'unanchored',
    'acceptance preserves attribution(), so the exemption is monotone across the transition');
});

test('A-6: `every`, not `some` — one stop the user wrote themselves ends the exemption', () => {
  const { trip, copiedPlaceId, dayId } = lisbonWithCopiedPlaceStop();
  const ctx: BuildCtx = { ids: sequentialIds('o'), now: '2026-08-25', actorUserId: 'local:self' };
  const withOwn = addStop(
    trip,
    { kind: 'scheduled', dayId, time: '14:00', order: 5 },
    { name: 'My own visit', category: 'sight', place: { kind: 'place', placeId: copiedPlaceId } },
    ctx,
  );
  const finding = geoCheck(withOwn).find((f) => f.ref.kind === 'place' && f.ref.id === copiedPlaceId);
  assert.equal(finding?.confidence, 'certain',
    'the user\'s own plan now rests on this coordinate — this is the Fisherman\'s Bastion case');

  const named = detectConflicts(withOwn, { today: FIXTURE_TODAY })
    .filter((c) => c.ruleId === 'geo_outlier' && c.subjects.some((s) => s.kind === 'place' && s.id === copiedPlaceId));
  assert.equal(named.length, 1, 'exactly one geo_outlier must name the place once a non-copied stop links it');
  assert.equal(named[0].severity, 'blocker');
});

test('A-6 clause 1: a Place with NO linking stop is untouched — still measured at `certain`', () => {
  const { trip, copiedPlaceId } = lisbonWithCopiedPlaceStop();
  // Strip every stop that resolves through the copied place. `linking.length > 0` fails, so
  // the place is an orphan the user keeps for its own sake and the rule does not touch it.
  const orphaned: Trip = {
    ...trip,
    days: trip.days.map((d) => ({
      ...d,
      stops: d.stops.filter((s) => !(s.place.kind === 'place' && s.place.placeId === copiedPlaceId)),
    })),
  };
  const finding = geoCheck(orphaned).find((f) => f.ref.kind === 'place' && f.ref.id === copiedPlaceId);
  assert.ok(finding, 'the orphan place must still be measured');
  assert.equal(finding.confidence, 'certain', 'clause 1: a place no stop points at is measured exactly as before');
});

test('A-6: a POOL stop counts as a linking stop too — the index spans days then pool', () => {
  const { trip, copiedPlaceId, dayId } = lisbonWithCopiedPlaceStop();
  const ctx: BuildCtx = { ids: sequentialIds('p'), now: '2026-08-25', actorUserId: 'local:self' };
  // The user's own POOL stop links the copied place. `every(isCopied)` must be false.
  const withPooled = addStop(
    trip,
    { kind: 'pool', cityKey: 'lisbon' },
    { name: 'Maybe later', category: 'sight', place: { kind: 'place', placeId: copiedPlaceId } },
    ctx,
  );
  void dayId;
  const finding = geoCheck(withPooled).find((f) => f.ref.kind === 'place' && f.ref.id === copiedPlaceId);
  assert.equal(finding?.confidence, 'certain', 'a pool stop the user wrote is still the user\'s own claim');
});

test('A-6, the four-click regression on the REAL fixture: 2 blockers, not 3', () => {
  // QA R8-2's own sequence: Jacob's trip is the reference trip without Marta's island day
  // and its places; he browses hers and copies one place-linked stop across.
  const { trip: full } = europe2026();
  const marta: Trip = { ...full, id: 'trip-marta', ownerId: 'user:marta', title: "Marta's Croatia" };
  const islandDay = full.days.find((d) => d.date === '2026-08-13');
  assert.ok(islandDay, 'the fixture lost the Aug 13 island day');
  const jacob: Trip = {
    ...full,
    days: full.days.filter((d) => d.date !== '2026-08-13'),
    places: full.places.filter((p) => !/Blue Cave|Stiniva|Hvar Town/i.test(p.name)),
  };
  assert.equal(
    detectConflicts(jacob, { today: FIXTURE_TODAY }).filter((c) => c.severity === 'blocker').length,
    2,
    'precondition: the reference trip carries exactly two blockers, both Jacob\'s own flags',
  );

  const src = islandDay.stops.find((s) => s.place.kind === 'place' && /Blue Cave/i.test(s.name));
  assert.ok(src, 'the fixture lost the Blue Cave stop');
  const splitDay = jacob.days.find((d) => d.cities.includes('split'));
  assert.ok(splitDay, 'the fixture lost its Split days');
  const copied = copyStopInto(
    jacob,
    { trip: marta, stopId: src.id },
    { kind: 'scheduled', dayId: splitDay.id, time: null, order: 99 },
    { ids: sequentialIds('copy'), today: FIXTURE_TODAY, actorUserId: 'local:self' },
  );
  const after = detectConflicts(copied, { today: FIXTURE_TODAY });
  assert.deepEqual(
    after.filter((c) => c.ruleId === 'geo_outlier').map((c) => c.summary),
    [],
    'the copy path minted a geo_outlier — R8-2',
  );
  assert.equal(after.filter((c) => c.severity === 'blocker').length, 2, 'a third blocker appeared on one click');
});

// ---------------------------------------------------------------------------
// A-6a (revision 7 addendum, QA R9-2) — deleting the copy takes its Place with it.
//
// A-6 clause 1 stands: 60 of the reference trip's 94 coordinate-bearing places have no
// linking stop, and `place-68` (Fisherman's Bastion) is one of them, so an orphan is measured
// exactly as before. Instead `removeStop` prunes the ONE place a copied stop orphans, and
// only that one — never a sweep.
// ---------------------------------------------------------------------------

test('A-6a (R9-2): removing the copied stop prunes its place — 2 blockers, not 3, one click further', () => {
  const { trip, copiedStopId, copiedPlaceId } = lisbonWithCopiedPlaceStop();
  // Precondition, per A-6: the copy alone is silent.
  assert.deepEqual(
    detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier'),
    [],
  );
  const after = removeStop(trip, copiedStopId);
  assert.equal(
    after.places.some((p) => p.id === copiedPlaceId),
    false,
    'the orphaned copied place must be gone from trip.places',
  );
  assert.deepEqual(
    detectConflicts(after, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier'),
    [],
    'deleting the copy must not mint a geo_outlier — R9-2',
  );
  assert.equal(
    geoCheck(after).some((f) => f.ref.kind === 'place' && f.ref.id === copiedPlaceId),
    false,
    'a pruned place produces no finding at all — it is gone, not measured',
  );
});

test('A-6a: removing the USER\'s own stop is never a sweep — the place survives and stays measured', () => {
  const { trip, ownStopId } = lisbonWithCopiedPlaceStop();
  // `ownStopId` resolves through an INLINE coordinate, not a Place, so this exercises clause 1
  // (no place link at all) — the cheapest way removeStop can be asked to prune nothing.
  const before = trip.places.length;
  const after = removeStop(trip, ownStopId);
  assert.equal(after.places.length, before, 'removing a stop with no place link prunes nothing');
});

test('A-6a: removing a user-authored stop that links a place never prunes it, even when it is the only linker', () => {
  const { trip, copiedPlaceId, dayId } = lisbonWithCopiedPlaceStop();
  const ctx: BuildCtx = { ids: sequentialIds('u'), now: '2026-08-25', actorUserId: 'local:self' };
  // The user's own stop is now the ONLY thing linking the copied place — the exact state A-6's
  // "every, not some" test builds. Removing THIS stop must not prune the place: clause 2
  // (`attribution(removed.provenance) !== null`) fails for a stop the user wrote themselves.
  const withOwn = addStop(
    trip,
    { kind: 'scheduled', dayId, time: '14:00', order: 5 },
    { name: 'My own visit', category: 'sight', place: { kind: 'place', placeId: copiedPlaceId } },
    ctx,
  );
  const ownStop = withOwn.days.find((d) => d.id === dayId)!.stops.find((s) => s.name === 'My own visit')!;
  const after = removeStop(withOwn, ownStop.id);
  assert.ok(after.places.some((p) => p.id === copiedPlaceId), 'a user-authored removal must never prune a Place');
  const finding = geoCheck(after).find((f) => f.ref.kind === 'place' && f.ref.id === copiedPlaceId);
  assert.equal(finding?.confidence, 'unanchored', 'the copied stop is still the only linker left, so it is still exempt');
});

test('A-6a: two copied stops on one place — the first removal survives, the second prunes', () => {
  const { trip: europe } = europe2026();
  const { trip: base, copiedPlaceId, dayId } = lisbonWithCopiedPlaceStop();
  // The exact same selection `lisbonWithCopiedPlaceStop` used — copying it a SECOND time must
  // reuse the already-copied place via rule 4's `samePlace` branch, not duplicate the row.
  const src = europe.days.flatMap((d) => d.stops).find((s) => s.place.kind === 'place');
  assert.ok(src, 'the fixture lost its place-linked stop');
  const placesBefore = base.places.length;
  const trip = copyStopInto(
    base,
    { trip: europe, stopId: src.id },
    { kind: 'scheduled', dayId, time: null, order: 10 },
    { ids: sequentialIds('c2'), today: '2026-09-01', actorUserId: 'local:self' },
  );
  assert.equal(trip.places.length, placesBefore, 'copying the same source place again must reuse the row, not duplicate it');
  const linking = trip.days.find((d) => d.id === dayId)!.stops
    .filter((s) => s.place.kind === 'place' && s.place.placeId === copiedPlaceId);
  assert.equal(linking.length, 2, 'the place must now be linked by two copied stops');

  const afterFirst = removeStop(trip, linking[0].id);
  assert.ok(afterFirst.places.some((p) => p.id === copiedPlaceId), 'the place survives while one copy still links it');
  assert.equal(
    geoCheck(afterFirst).find((f) => f.ref.kind === 'place' && f.ref.id === copiedPlaceId)?.confidence,
    'unanchored',
  );

  const afterSecond = removeStop(afterFirst, linking[1].id);
  assert.equal(afterSecond.places.some((p) => p.id === copiedPlaceId), false, 'the second removal prunes it');
});

test('A-6a: rejectCandidate prunes nothing — the stop stays in the document', () => {
  const { trip, copiedStopId, copiedPlaceId } = lisbonWithCopiedPlaceStop();
  const rejected = rejectCandidate(trip, { kind: 'stop', id: copiedStopId }, 'local:self', '2026-09-02');
  assert.ok(
    rejected.days.some((d) => d.stops.some((s) => s.id === copiedStopId)),
    'rejectCandidate must not remove the stop — only removeStop does',
  );
  assert.ok(rejected.places.some((p) => p.id === copiedPlaceId), 'a rejected-but-present stop keeps its place');
  assert.deepEqual(
    detectConflicts(rejected, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier'),
    [],
    'rejection alone must not mint a blocker either — the place is still copy-borne',
  );
});
