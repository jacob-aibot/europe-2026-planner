/**
 * `lifecycle(trip, today)` — ARCHITECTURE §8.1, ROADMAP Phase 2 I-1.
 *
 * The stage is **derived**, never stored. The table below is the whole contract: the three
 * stages plus the four boundary days, with `endDate` **inclusive**, and a zero-day trip.
 *
 * A trip whose dates are invalid is deliberately NOT tested here as `lifecycle`'s problem —
 * `createTrip` / `setTripMeta` reject those, and the last test asserts that division of labour
 * rather than duplicating the check inside a derive function that would then have two jobs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrip, lifecycle, sequentialIds, setTripMeta } from '../src/index.ts';
import type { BuildCtx } from '../src/index.ts';
import type { Trip } from '../src/index.ts';

const ctx = (): BuildCtx => ({ ids: sequentialIds('l'), now: '2026-01-01', actorUserId: 'local:self' });

const tripOver = (startDate: string, endDate: string): Trip =>
  createTrip({ title: 'T', startDate, endDate, homeCurrency: 'EUR', cities: [] }, ctx());

test('the three stages and all four boundary days, with endDate inclusive', () => {
  const trip = tripOver('2026-08-07', '2026-08-22');
  const cases: Array<[string, 'planned' | 'active' | 'completed']> = [
    ['2019-01-01', 'planned'],       // long before
    ['2026-08-06', 'planned'],       // the day before startDate
    ['2026-08-07', 'active'],        // startDate itself
    ['2026-08-15', 'active'],        // the middle
    ['2026-08-22', 'active'],        // endDate itself — INCLUSIVE
    ['2026-08-23', 'completed'],     // the day after endDate
    ['2030-01-01', 'completed'],     // long after
  ];
  for (const [today, expected] of cases) {
    assert.equal(lifecycle(trip, today), expected, `${today} on 2026-08-07..2026-08-22`);
  }
});

test('a zero-day trip (start === end) is active on exactly that one day', () => {
  const trip = tripOver('2026-08-07', '2026-08-07');
  assert.equal(lifecycle(trip, '2026-08-06'), 'planned');
  assert.equal(lifecycle(trip, '2026-08-07'), 'active');
  assert.equal(lifecycle(trip, '2026-08-08'), 'completed');
});

test('a past trip entered from memory is completed', () => {
  const trip = tripOver('2019-03-01', '2019-03-21');
  assert.equal(lifecycle(trip, '2026-08-27'), 'completed');
});

test('lifecycle is pure — it reads the trip and returns a string, nothing else', () => {
  const trip = tripOver('2026-08-07', '2026-08-22');
  const before = JSON.stringify(trip);
  lifecycle(trip, '2026-08-15');
  lifecycle(trip, '2026-08-15');
  assert.equal(JSON.stringify(trip), before, 'lifecycle mutated its input');
  assert.equal(lifecycle(trip, '2026-08-15'), lifecycle(trip, '2026-08-15'));
});

test('lifecycle compares calendar dates, not string prefixes across year/month rollovers', () => {
  const nye = tripOver('2025-12-30', '2026-01-02');
  assert.equal(lifecycle(nye, '2025-12-31'), 'active');
  assert.equal(lifecycle(nye, '2026-01-02'), 'active');
  assert.equal(lifecycle(nye, '2026-01-03'), 'completed');
  assert.equal(lifecycle(nye, '2025-12-29'), 'planned');
});

/**
 * The division of labour §8.1 names: an invalid range is rejected where documents are made,
 * so `lifecycle` never has to answer for one. This asserts the guard exists rather than
 * asserting what `lifecycle` would do with a document that cannot be built.
 */
test('an inverted or malformed date range is createTrip/setTripMeta\'s problem, not lifecycle\'s', () => {
  assert.throws(
    () => tripOver('2026-08-22', '2026-08-07'),
    /end|start|range|date/i,
    'createTrip accepted endDate before startDate',
  );
  assert.throws(
    () => tripOver('2026-02-30', '2026-03-02'),
    /date/i,
    'createTrip accepted an impossible calendar date',
  );
  const ok = tripOver('2026-08-07', '2026-08-22');
  assert.throws(
    () => setTripMeta(ok, { endDate: '2026-08-01' }, ctx()),
    /end|start|range|date/i,
    'setTripMeta accepted endDate before startDate',
  );
});
