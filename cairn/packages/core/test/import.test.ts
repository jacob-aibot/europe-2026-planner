/**
 * The acceptance criteria of ROADMAP "Phase 1 — the numbers the tester will check".
 *
 * Where a number here disagrees with the roadmap, BUILD-NOTES §1 says which is right and
 * why — KD-3 for day-cost parity, KD-4 for the ticket census.
 * Nothing in this file was adjusted to make code pass.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { europe2026, golden, repoFile } from './fixture.ts';
import { cityRange, displayStatus, geoCheck, validateTrip } from '../src/index.ts';

test('16 days, dense 2026-08-07 → 2026-08-22, Day.id === Day.date throughout', () => {
  const { trip } = europe2026();
  assert.equal(trip.days.length, 16);
  assert.equal(trip.startDate, '2026-08-07');
  assert.equal(trip.endDate, '2026-08-22');
  for (const d of trip.days) assert.equal(d.id, d.date);
  const dates = trip.days.map((d) => d.date);
  assert.deepEqual(
    dates,
    Array.from({ length: 16 }, (_, i) => `2026-08-${String(7 + i).padStart(2, '0')}`),
  );
});

test('112 scheduled stops; 31 pool stops with the documented per-city split', () => {
  const { trip } = europe2026();
  assert.equal(trip.days.reduce((n, d) => n + d.stops.length, 0), 112);
  assert.equal(trip.pool.length, 31);
  const byCity: Record<string, number> = {};
  for (const s of trip.pool) {
    if (s.placement.kind !== 'pool') throw new Error('a pooled stop is not pool-placed');
    byCity[s.placement.cityKey] = (byCity[s.placement.cityKey] ?? 0) + 1;
  }
  assert.deepEqual(byCity, { vienna: 8, dubrovnik: 3, split: 3, prague: 8, budapest: 6, london: 3 });
});

test('95 places with the documented per-city split', () => {
  const { trip } = europe2026();
  assert.equal(trip.places.length, 95);
  const byCity: Record<string, number> = {};
  for (const p of trip.places) byCity[p.cityKey] = (byCity[p.cityKey] ?? 0) + 1;
  assert.deepEqual(byCity, { vienna: 15, dubrovnik: 12, split: 15, prague: 25, budapest: 21, london: 7 });
});

test('5 multi-city days, exactly the documented ones', () => {
  const { trip } = europe2026();
  const multi = trip.days.filter((d) => d.cities.length > 1).map((d) => `${d.id} ${d.cities.join('+')}`);
  assert.deepEqual(multi, [
    '2026-08-10 vienna+dubrovnik',
    '2026-08-12 dubrovnik+split',
    '2026-08-15 split+prague',
    '2026-08-18 prague+budapest',
    '2026-08-21 budapest+london',
  ]);
});

test('3 candidate days and 21 suggested stops, and every one of the 21 carries source:system', () => {
  const { trip } = europe2026();
  assert.equal(trip.days.filter((d) => d.provenance.state === 'candidate').length, 3);
  const suggested = trip.days.flatMap((d) => d.stops).filter((s) => displayStatus(s) === 'suggested');
  assert.equal(suggested.length, 21);
  // The count alone does not distinguish a suggestion from a mis-stamped import.
  assert.deepEqual([...new Set(suggested.map((s) => s.provenance.source))], ['system']);
});

test('travelRole splits 21 journey / 81 transfer / 10 unknown, and every unknown is genuinely ambiguous', () => {
  const { trip } = europe2026();
  const scheduled = trip.days.flatMap((d) => d.stops);
  const tally = (xs: typeof scheduled) => {
    const t: Record<string, number> = { transfer: 0, journey: 0, unknown: 0 };
    for (const s of xs) t[s.travelRole]++;
    return t;
  };
  assert.deepEqual(tally(scheduled), { transfer: 81, journey: 21, unknown: 10 });
  assert.equal(scheduled.length, 112);

  // A pool stop has no `move` in the legacy data, so all 31 are 'transfer' by §2.11's
  // first clause — not by accident.
  assert.deepEqual(tally(trip.pool), { transfer: 31, journey: 0, unknown: 0 });

  // Every 'unknown' is a vehicle mode on a non-transit category — the case §2.12 says the
  // data genuinely cannot resolve. None of them is a walk, and none is a cat:'transit'.
  for (const s of scheduled.filter((x) => x.travelRole === 'unknown')) {
    assert.ok(s.arrival, `${s.name} is 'unknown' with no arrival`);
    assert.notEqual(s.category, 'transit', `${s.name} is cat:transit and should be 'journey'`);
  }
  // And every 'journey' is a vehicle mode on a transit stop.
  for (const s of scheduled.filter((x) => x.travelRole === 'journey')) {
    assert.equal(s.category, 'transit');
    assert.ok(s.arrival);
  }
});

test('81 stops carry an arrival and 49 a non-null cost', () => {
  const { trip } = europe2026();
  const scheduled = trip.days.flatMap((d) => d.stops);
  assert.equal(scheduled.filter((s) => s.arrival).length, 81);
  assert.equal(scheduled.filter((s) => s.cost).length, 49);
});

test('7 stops carry a Ticket — 3 of them bundled, over 2 distinct repo files', () => {
  // ROADMAP says "2 of them kind:'bundled'". The live page has THREE stops pointing at
  // bundled PDFs (Aug 12 Gruž, Aug 14 → Skradin, Aug 14 → Split) because the Split↔Skradin
  // round trip is one PDF linked from both legs. 2 is the count of distinct FILES.
  // BUILD-NOTES §1, KD-4. This expectation is the source of truth, not the roadmap's figure:
  // 3 stops carry a bundled ticket, over 2 distinct files.
  const { trip } = europe2026();
  const ticketed = trip.days.flatMap((d) => d.stops).filter((s) => s.ticket);
  assert.equal(ticketed.length, 7);
  const bundled = ticketed.filter((s) => s.ticket?.kind === 'bundled');
  assert.equal(bundled.length, 3);
  const files = new Set(bundled.map((s) => (s.ticket as { path: string }).path));
  assert.equal(files.size, 2);
  for (const f of files) assert.match(f, /^tickets\/flixbus-.*\.pdf$/);
  assert.equal(ticketed.filter((s) => s.ticket?.kind === 'url').length, 4);
});

test('81 stops carry an arrival override; 49 carry a cost', () => {
  const { trip } = europe2026();
  const stops = trip.days.flatMap((d) => d.stops);
  assert.equal(stops.filter((s) => s.arrival).length, 81);
  assert.equal(stops.filter((s) => s.cost).length, 49);
});

test('cityRange() reproduces the six hardcoded CITY_RANGE strings exactly', () => {
  const { trip, cityRangeCheck } = europe2026();
  const legacy = golden<{ cityRange: Record<string, string> }>('legacy-cityrange.json').cityRange;
  for (const [key, expected] of Object.entries(legacy)) {
    assert.equal(cityRange(trip, key), expected, `cityRange(${key})`);
  }
  assert.ok(cityRangeCheck.every((c) => c.ok), 'importer asserted parity too');
});

test('every coordinate in the trip is anchored — the CLAUDE.md scripted check, generalised', () => {
  // Was: "within 35 km of one of its day's cities", read out of
  // `validateTrip.stop_far_from_city`. That code is deleted (§2.9); the check now lives in
  // `geoCheck` and is measured against the trip's own declared geography, so a Krka day
  // trip 50 km outside Split is not a finding and a one-digit latitude typo is.
  // The detection census is in `geoCheck.test.ts`.
  const { trip } = europe2026();
  assert.deepEqual(
    geoCheck(trip).filter((f) => f.confidence === 'certain').map((f) => `${f.ref.kind}:${f.ref.id}`),
    [],
  );
});

test('the source hash is committed and still matches the live planner', () => {
  const { sha256 } = europe2026();
  const committed = repoFile('cairn/fixtures/europe2026.sha256').trim().split(/\s+/)[0];
  assert.equal(
    sha256,
    committed,
    'europe-2026-itinerary.html changed — re-baseline with `npm run golden` and review every golden diff',
  );
});

test('every booking reference in the fixture still appears verbatim in docs/BOOKINGS.md', () => {
  const { trip } = europe2026();
  const doc = repoFile('docs/BOOKINGS.md');
  const refs = [...new Set(trip.bookings.map((b) => b.reference).filter(Boolean))] as string[];
  assert.ok(refs.length >= 16, `expected the transcribed references, found ${refs.length}`);
  for (const ref of refs) {
    assert.ok(doc.includes(ref), `reference ${ref} is no longer in docs/BOOKINGS.md — the transcription has drifted`);
  }
});

test('the two FlixBus tickets are referenced by repo path, never copied', () => {
  const { trip } = europe2026();
  const bundled = trip.days
    .flatMap((d) => d.stops)
    .map((s) => s.ticket)
    .filter((t): t is { kind: 'bundled'; path: string; label: string } => t?.kind === 'bundled');
  for (const t of bundled) {
    assert.doesNotThrow(() => repoFile(t.path), `${t.path} must exist at the repo root`);
  }
});

test('the import report is stable against its golden', () => {
  const { trip } = europe2026();
  const g = golden<{ counts: Record<string, number> }>('core-import.json');
  assert.equal(g.counts.days, trip.days.length);
  assert.equal(g.counts.scheduledStops, trip.days.reduce((n, d) => n + d.stops.length, 0));
  assert.equal(g.counts.poolStops, trip.pool.length);
  assert.equal(g.counts.places, trip.places.length);
  assert.equal(g.counts.bookings, trip.bookings.length);
});
