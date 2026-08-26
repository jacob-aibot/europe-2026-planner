/**
 * Build-function invariants that the type system claims but does not enforce at runtime.
 *
 * `StopPatch = Partial<Omit<Stop,'id'|'placement'>>` is a compile-time promise only. Every
 * caller that matters in Phase 3 — the ingest worker, an import, a JSON-driven action — is
 * `any`-shaped at the boundary, so the promise has to be checked where it can actually be
 * broken. §2.1: core throws on programmer error.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createTrip, updateStop, addStop, displayStatus, sequentialIds, systemSuggestion, userProvenance, LOCAL_OWNER, returnToPool, scheduleFromPool, poolFor, setDayMeta, validateTrip } from '../src/index.ts';
import type { BuildCtx, Trip } from '../src/index.ts';

const ctx = (): BuildCtx => ({ ids: sequentialIds('t'), now: '2026-08-01', actorUserId: LOCAL_OWNER });

function tripWithSuggestion(): { trip: Trip; stopId: string } {
  const base = createTrip(
    {
      id: 'trip-1',
      title: 'T',
      startDate: '2026-08-07',
      endDate: '2026-08-09',
      cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
    },
    ctx(),
  );
  const withStop = addStop(
    base,
    { kind: 'scheduled', dayId: '2026-08-07', time: '09:00', order: 0 },
    {
      id: 'stop-sug',
      name: 'A system suggestion',
      category: 'sight',
      provenance: systemSuggestion('2026-08-01', 'inferred'),
    },
    ctx(),
  );
  return { trip: withStop, stopId: 'stop-sug' };
}

// ---------------------------------------------------------------------------
// F-7 — the runtime patch escape
// ---------------------------------------------------------------------------

test('updateStop refuses to rewrite a stop id', () => {
  const { trip, stopId } = tripWithSuggestion();
  assert.throws(
    () => updateStop(trip, stopId, { id: 'HIJACKED' } as never),
    /updateStop: "id" may not be patched/,
  );
  assert.equal(trip.days[0].stops[0].id, 'stop-sug', 'the trip must be untouched');
});

test('updateStop refuses to rewrite provenance — a suggestion cannot be laundered into the user\'s own plan', () => {
  const { trip, stopId } = tripWithSuggestion();
  assert.equal(displayStatus(trip.days[0].stops[0]), 'suggested');
  assert.throws(
    () =>
      updateStop(trip, stopId, {
        provenance: userProvenance('2026-08-02', 'user:jacob'),
      } as never),
    /updateStop: "provenance" may not be patched/,
  );
  assert.equal(displayStatus(trip.days[0].stops[0]), 'suggested');
});

test('updateStop refuses to rewrite placement — moveStop is the one placement function', () => {
  const { trip, stopId } = tripWithSuggestion();
  assert.throws(
    () => updateStop(trip, stopId, { placement: { kind: 'pool', cityKey: 'vienna' } } as never),
    /updateStop: "placement" may not be patched/,
  );
});

test('the same guard protects a pool stop, not just a scheduled one', () => {
  const base = createTrip({ id: 'trip-2', title: 'T', startDate: '2026-08-07', endDate: '2026-08-08' }, ctx());
  const withPool = addStop(base, { kind: 'pool', cityKey: 'vienna' }, { id: 'stop-pool', name: 'P', category: 'sight' }, ctx());
  assert.throws(() => updateStop(withPool, 'stop-pool', { id: 'X' } as never), /"id" may not be patched/);
  assert.throws(
    () => updateStop(withPool, 'stop-pool', { placement: { kind: 'pool', cityKey: 'split' } } as never),
    /"placement" may not be patched/,
  );
});

test('updateStop still patches everything it is supposed to, including time', () => {
  const { trip, stopId } = tripWithSuggestion();
  const next = updateStop(trip, stopId, { name: 'Renamed', note: 'n', time: '11:30' });
  const s = next.days[0].stops[0];
  assert.equal(s.name, 'Renamed');
  assert.equal(s.note, 'n');
  assert.equal(s.placement.kind === 'scheduled' ? s.placement.time : null, '11:30');
  assert.equal(s.id, 'stop-sug');
  assert.equal(next.revision, trip.revision + 1);
});

test('an explicitly undefined forbidden key is still a programmer error, not a silent pass', () => {
  const { trip, stopId } = tripWithSuggestion();
  assert.throws(() => updateStop(trip, stopId, { id: undefined } as never), /"id" may not be patched/);
});

// ---------------------------------------------------------------------------
// F-11 — the calendar, not the shape
// ---------------------------------------------------------------------------

test('createTrip rejects dates that match the shape but are not days', () => {
  for (const bad of ['2026-13-45', '2026-02-30', '2026-00-10', '2026-04-31', '2026-02-29']) {
    assert.throws(
      () => createTrip({ title: 'T', startDate: bad, endDate: '2026-08-09' }, ctx()),
      /YYYY-MM-DD/,
      `startDate ${bad} was accepted`,
    );
    assert.throws(
      () => createTrip({ title: 'T', startDate: '2026-08-07', endDate: bad }, ctx()),
      /YYYY-MM-DD/,
      `endDate ${bad} was accepted`,
    );
  }
});

test('createTrip still accepts a leap day', () => {
  const t = createTrip({ title: 'T', startDate: '2024-02-28', endDate: '2024-02-29' }, ctx());
  assert.deepEqual(t.days.map((d) => d.id), ['2024-02-28', '2024-02-29']);
});

test('setTripMeta cannot move a trip onto an impossible date either', async () => {
  const { setTripMeta } = await import('../src/index.ts');
  const t = createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' }, ctx());
  assert.throws(() => setTripMeta(t, { endDate: '2026-02-30' }, ctx()), /YYYY-MM-DD/);
});

// ---------------------------------------------------------------------------
// R2-2 — a pooled stop must be reachable from the surface that pooled it.
//
// `returnToPool` filed under `day.primaryCity` unconditionally. A pure travel
// day carries the transit pseudo-city, which is never a member of `trip.cities`
// and therefore never a key the pool panel can be showing, so the stop left the
// plan and appeared nowhere: the tab counted 32, every panel listed 31, and
// `validateTrip` returned nothing at all. It hit every brand-new trip, whose
// days are all transit days until the user assigns cities.
// ---------------------------------------------------------------------------

/** The reachability rule, stated once: a pool key is either a trip city or the transit group. */
function reachable(trip: Trip): { viaCity: number; unfiled: number; total: number } {
  const known = new Set(trip.cities.map((c) => c.key));
  const pooled = trip.pool.filter((s) => s.placement.kind === 'pool');
  const viaCity = pooled.filter((s) => s.placement.kind === 'pool' && known.has(s.placement.cityKey)).length;
  return { viaCity, unfiled: pooled.length - viaCity, total: pooled.length };
}

function pooledFrom(init: Parameters<typeof createTrip>[0], dayIndex = 0): Trip {
  const c = ctx();
  let trip = createTrip(init, c);
  const dayId = trip.days[dayIndex].id;
  trip = addStop(trip, { kind: 'scheduled', dayId, time: '09:00', order: 0 }, { name: 'Arrive LAX', category: 'transit' }, c);
  return returnToPool(trip, trip.days[dayIndex].stops[0].id);
}

const CITIES = [
  { key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } },
  { key: 'split', name: 'Split', centre: { lat: 43.5081, lng: 16.4402 } },
];

test('R2-2: a brand-new trip with no cities — the pooled stop is still reachable', () => {
  const trip = pooledFrom({ title: 'New trip', startDate: '2026-08-07', endDate: '2026-08-08' });
  const r = reachable(trip);
  assert.equal(r.total, 1, 'the stop left the document entirely');
  assert.equal(r.viaCity + r.unfiled, r.total, 'a pooled stop belongs to no rendered group');
  assert.equal(r.unfiled, 1, 'a trip with no cities can only file under the transit group');
  // Legitimate state, not a broken document: the user simply has not added cities yet.
  assert.deepEqual(validateTrip(trip).map((i) => i.code), []);
  // And it is not a one-way trip: the stored hint still puts it back where it came from.
  const back = scheduleFromPool(trip, trip.pool[0].id);
  assert.equal(back.days[0].stops.length, 1);
  assert.equal(back.pool.length, 0);
});

test('R2-2: a transit day on a trip that HAS cities files under the transit group, not a guess', () => {
  const trip = pooledFrom({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-10', cities: CITIES });
  assert.equal(trip.days[0].primaryCity, 'transit', 'precondition: the day belongs to no city');
  const r = reachable(trip);
  assert.equal(r.unfiled, 1, 'the stop is not reachable through any group');
  // Filing it under Vienna because Vienna is first would be a guess about where the user
  // meant it to go. Flag, do not guess — the transit group says exactly what is true.
  assert.equal(trip.pool[0].placement.kind === 'pool' && trip.pool[0].placement.cityKey, 'transit');
  assert.deepEqual(validateTrip(trip).map((i) => i.code), []);
});

test('R2-2: a day WITH a real city still files under that city — unchanged', () => {
  const c = ctx();
  let trip = createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-10', cities: CITIES }, c);
  trip = setDayMeta(trip, trip.days[1].id, { primaryCity: 'vienna', cities: ['vienna'] });
  const dayId = trip.days[1].id;
  trip = addStop(trip, { kind: 'scheduled', dayId, time: '10:00', order: 0 }, { name: 'Belvedere', category: 'sight' }, c);
  const pooled = returnToPool(trip, trip.days[1].stops[0].id);

  assert.equal(pooled.pool[0].placement.kind === 'pool' && pooled.pool[0].placement.cityKey, 'vienna');
  assert.equal(poolFor(pooled, 'vienna').length, 1);
  assert.equal(reachable(pooled).unfiled, 0);
  assert.deepEqual(validateTrip(pooled).map((i) => i.code), []);
});

test('R2-2: an unreachable pool key is an ERROR, never silence', () => {
  // The shape a hand-edited document, a deleted city, or a future bug produces. Before the
  // fix this returned [] — the stop was gone and nothing in the app said so.
  const base = pooledFrom({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-10', cities: CITIES });
  const stop = base.pool[0];
  const broken: Trip = {
    ...base,
    pool: [{ ...stop, placement: { ...stop.placement, kind: 'pool', cityKey: 'atlantis' } }],
  };

  const issues = validateTrip(broken);
  const found = issues.filter((i) => i.code === 'pool_stop_unknown_city');
  assert.equal(found.length, 1, `expected exactly one pool_stop_unknown_city, got ${JSON.stringify(issues.map((i) => i.code))}`);
  assert.equal(found[0].level, 'error');
  assert.equal(found[0].ref.id, stop.id);
  assert.equal(found[0].params.cityKey, 'atlantis');
  assert.match(found[0].message, /nothing can show it/);

  // A ceiling, not a floor (ROADMAP rule 4): the transit group must NOT be reported. A
  // rule that fires on every brand-new trip is noise, and noise is what makes a real
  // finding invisible.
  assert.equal(validateTrip(base).filter((i) => i.code === 'pool_stop_unknown_city').length, 0);
});
