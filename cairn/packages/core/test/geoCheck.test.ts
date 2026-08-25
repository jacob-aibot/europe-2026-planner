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
import { geoCheck, detectConflicts, validateTrip } from '../src/index.ts';
import type { Place, Stop, Trip } from '../src/index.ts';

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
