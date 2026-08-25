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

import { createTrip, updateStop, addStop, displayStatus, sequentialIds, systemSuggestion, userProvenance, LOCAL_OWNER } from '../src/index.ts';
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
