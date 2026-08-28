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

import { createTrip, updateStop, addStop, displayStatus, sequentialIds, LOCAL_OWNER, returnToPool, scheduleFromPool, poolFor, setDayMeta, validateTrip, ensureDays } from '../src/index.ts';
// The provenance constructors are off the surface in §2.10 revision 5 — they stamp
// provenance with no gate. Tests reach the module path directly. BUILD-NOTES KD-33.
import { systemSuggestion, userProvenance } from '../src/model/provenance.ts';
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

// ===========================================================================
// §2.3 **A-35** — the day skeleton is bounded (QA R29-2).
//
// `ensureDays` is the only function that mints `Day` records and the number it mints is
// bounded: at most 3,653 days — ten Gregorian years, inclusive of both endpoints. The bound
// lives here, at the mint, and **not** in the two forms: `0202-01-01 → 2020-12-31` is one
// mistyped digit, passes both forms' two-check validation, and minted 664,377 `Day` objects
// (266.7 MB of JSON) that `validateTrip` reported nothing about.
//
// The constant is deliberately NOT exported (§2.10's surface does not move), so the numbers
// are transcribed here — which is also what makes the off-by-one visible in both directions.
// ===========================================================================

const SPAN = { title: 'span', homeCurrency: 'EUR' } as const;

test('A-35: exactly the cap — 2020-01-01 → 2029-12-31 is 3,653 days and creates', async () => {
  const { createTrip: create } = await import('../src/index.ts');
  const t = create({ ...SPAN, startDate: '2020-01-01', endDate: '2029-12-31' }, ctx());
  assert.equal(t.days.length, 3653);
});

test('A-35: one day past the cap — 2020-01-01 → 2030-01-01 is 3,654 days and throws', () => {
  assert.throws(
    () => createTrip({ ...SPAN, startDate: '2020-01-01', endDate: '2030-01-01' }, ctx()),
    /would cover 3654 days/,
    'the comparison is against `span + 1`; comparing the exclusive span is off by one exactly here',
  );
});

test('A-35: the R29-2 mistype throws, and the message names the span, the cap and both dates', () => {
  let message = '';
  assert.throws(
    () => createTrip({ ...SPAN, startDate: '0202-01-01', endDate: '2020-12-31' }, ctx()),
    (err: unknown) => {
      message = (err as Error).message;
      return err instanceof Error;
    },
  );
  assert.match(message, /664377/, 'the message tells the user how many days they asked for');
  assert.match(message, /3653/, 'and what the cap is');
  assert.match(message, /0202-01-01/);
  assert.match(message, /2020-12-31/);
  assert.match(message, /year/i, 'and names the likely cause — it is written for a person');
});

test('A-35: the bound is NOT in the view — the forms\' own validation still accepts the mistype', () => {
  // `rangeFor(precision:'exact')`, transcribed from `views/PastTripForm.tsx` (and open-coded a
  // second time in `views/Library.tsx`). This is the whole reason the bound is at the mint:
  // both forms say yes, and the thing that allocates is what says no.
  const rangeForExact = (a: string, b: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(a) && /^\d{4}-\d{2}-\d{2}$/.test(b) && b >= a ? { startDate: a, endDate: b } : null;
  assert.notEqual(rangeForExact('0202-01-01', '2020-12-31'), null);
  assert.notEqual(rangeForExact('0000-01-01', '9999-12-31'), null);
});

test('A-35: setTripMeta cannot widen an existing trip past the cap either', async () => {
  const { setTripMeta } = await import('../src/index.ts');
  const t = createTrip({ ...SPAN, startDate: '2026-08-07', endDate: '2026-08-09' }, ctx());
  assert.throws(() => setTripMeta(t, { endDate: '2226-08-09' }, ctx()), /at most 3653/);
  // …and a move inside the cap still works, so the guard is not simply refusing everything.
  const ok = setTripMeta(t, { endDate: '2026-08-20' }, ctx());
  assert.equal(ok.days.length, 14);
});

test('A-35: the check reads the WIDENED endpoints, not the stated ones', () => {
  // `ensureDays` widens `[start,end]` to keep a day that still holds stops rather than
  // destroying content, so the span that matters is the one that will actually be minted.
  const base = addStop(
    createTrip({ ...SPAN, startDate: '2020-01-01', endDate: '2020-01-02' }, ctx()),
    { kind: 'scheduled', dayId: '2020-01-01', order: 0, time: null },
    { name: 'a stop that pins the day to the calendar', category: 'sight' },
    ctx(),
  );
  const stray: Trip['days'][number] = { ...base.days[0], id: '2040-01-01', date: '2040-01-01' };
  const widened: Trip = { ...base, days: [{ ...base.days[0], stops: [] }, base.days[1], stray] };
  assert.throws(() => ensureDays(widened, ctx()), /would cover 7306 days \(2020-01-01 → 2040-01-01\)/);
  // The same document with the stray day EMPTY drops it instead of widening, and is fine.
  const empty: Trip = { ...widened, days: widened.days.map((d) => ({ ...d, stops: [] })) };
  assert.equal(ensureDays(empty, ctx()).days.length, 2);
});

test('A-35: the cap refuses nothing anybody would type on purpose — a three-year past trip creates', () => {
  const t = createTrip({ ...SPAN, startDate: '2019-01-01', endDate: '2021-12-31' }, ctx());
  assert.equal(t.days.length, 1096);
});
