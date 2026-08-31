/**
 * `clusterPoints` — ARCHITECTURE §4.4 **A-41** Part 6, ROADMAP Phase 2 **I-8d**.
 *
 * A-41 C3 calls the partition *"single-linkage first-fit — the identical rule `clusterStops`
 * has used since Phase 1, extracted rather than re-written"*, and Part 6 says the loop must
 * exist **once**: `clusterStops` and `focusCluster` delegate to this kernel, and
 * `packages/client`'s `worldMapFrame` calls it rather than hand-rolling a third copy (which
 * would also mean a hand-rolled haversine, because `haversine` is internal).
 *
 * These tests pin the three properties the extraction must preserve exactly — first-fit
 * (not nearest-fit), single-linkage (not diameter), and input order in both dimensions —
 * plus the strictness of the threshold comparison, because `<` vs `<=` is the one character
 * that silently changes every day map's clustering.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { LatLng } from '../src/model/types.ts';
import { clusterPoints, clusterStops, DEFAULT_CLUSTER_THRESHOLD_KM } from '../src/derive/cluster.ts';
import { haversine, stopLatLng } from '../src/derive/geo.ts';
import { europe2026 } from './fixture.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

const at = (lat: number, lng: number): LatLng => ({ lat, lng });

test('clusterPoints returns groups of INDICES into the input, not the points', () => {
  const groups = clusterPoints([at(0, 0), at(0, 0.1), at(0, 40)], 90);
  assert.deepEqual(groups, [[0, 1], [2]]);
});

test('no points is no groups', () => {
  assert.deepEqual(clusterPoints([], 90), []);
});

test('one point is one group of one', () => {
  assert.deepEqual(clusterPoints([at(48.2, 16.37)], 90), [[0]]);
});

/**
 * The discriminating case for **first**-fit. `p2` is within the threshold of a member of
 * group 0 *and* of group 1; the rule says it joins the first group it matches, never the
 * nearer one. A "nearest group" implementation returns `[[0],[1,2]]` here.
 */
test('a point joins the FIRST group with a member in range, not the nearest one', () => {
  const p0 = at(0, 0);
  const p1 = at(0, 1.5);
  const p2 = at(0, 0.76); // ~84.6 km from p0, ~82.3 km from p1 — nearer to p1
  assert.ok(haversine(p2, p1) < haversine(p2, p0), 'fixture is wrong: p2 must be nearer p1');
  assert.deepEqual(clusterPoints([p0, p1, p2], 90), [[0, 2], [1]]);
});

/**
 * Single-linkage, not diameter: three points 0.7° apart in a row are one group at 90 km even
 * though the ends are 155 km apart. This is what makes a day that walks across a city one
 * cluster rather than two.
 */
test('single linkage — a chain joins up even when its ends are further apart than the threshold', () => {
  const pts = [at(0, 0), at(0, 0.7), at(0, 1.4)];
  assert.ok(haversine(pts[0], pts[2]) > 90, 'fixture is wrong: the ends must exceed the threshold');
  assert.deepEqual(clusterPoints(pts, 90), [[0, 1, 2]]);
});

test('groups keep input order, and members keep input order within a group', () => {
  const groups = clusterPoints([at(0, 40), at(0, 0), at(0, 40.1), at(0, 0.1)], 90);
  assert.deepEqual(groups, [[0, 2], [1, 3]]);
});

/**
 * The comparison is **strict**: `haversine < thresholdKm`. At exactly the threshold the
 * points separate. Phase 1's `clusterStops` has always been `<` and the extraction may not
 * quietly widen it — every day map's clustering hangs off this character.
 */
test('the threshold is exclusive: a pair exactly at it separates, a hair above it joins', () => {
  const a = at(0, 0);
  const b = at(0, 1);
  const d = haversine(a, b);
  assert.deepEqual(clusterPoints([a, b], d), [[0], [1]], 'exactly at the threshold must NOT join');
  assert.deepEqual(clusterPoints([a, b], d * (1 + 1e-9)), [[0, 1]], 'just above it must join');
});

test('the threshold is a parameter — the same points partition differently at 90 km and 4000 km', () => {
  const pts = [at(48.2, 16.4), at(45.8, 15.98), at(38.9, -77.0)];
  assert.deepEqual(clusterPoints(pts, 90), [[0], [1], [2]]);
  assert.deepEqual(clusterPoints(pts, 4000), [[0, 1], [2]]);
});

test('clusterPoints is pure — it does not mutate the array it was handed', () => {
  const pts = [at(0, 0), at(0, 40)];
  const before = JSON.stringify(pts);
  clusterPoints(pts, 90);
  assert.equal(JSON.stringify(pts), before);
});

/**
 * A-41 Part 6's real content: **`clusterStops` delegates**, so the two answers cannot drift.
 * Asserted against the shipped fixture trip rather than a hand-made one, because that is the
 * data the day map's goldens are cut from.
 */
test('clusterStops agrees with clusterPoints over the same points, on the fixture trip', () => {
  const trip = europe2026().trip;
  for (const day of trip.days) {
    const stops = day.stops;
    for (const threshold of [30, DEFAULT_CLUSTER_THRESHOLD_KM, 400]) {
      const grouped = clusterStops(stops, trip, threshold);
      // The located subsequence, in order — what `clusterStops` clusters over.
      const located = stops.filter((s) => stopLatLng(s, trip) !== null);
      const points = located.map((s) => stopLatLng(s, trip) as LatLng);
      const viaKernel = clusterPoints(points, threshold).map((g) => g.map((i) => located[i]));
      assert.deepEqual(grouped, viaKernel, `day ${day.id} at ${threshold} km`);
    }
  }
});

/**
 * The ceiling that keeps Part 6 true after this pass. `haversine` is the loop's only
 * distance call, and it may appear exactly twice in `cluster.ts`: once inside `clusterPoints`
 * and once inside `rawSpanKm` (a different computation — the widest gap, not a partition).
 * A third occurrence means someone wrote the partition out again.
 */
test('A-41 Part 6: cluster.ts holds ONE clustering loop — `haversine` occurs exactly twice', () => {
  const src = readFileSync(resolve(HERE, '..', 'src', 'derive', 'cluster.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const calls = src.split('haversine(').length - 1;
  assert.equal(calls, 2, `cluster.ts calls haversine ${calls} times; A-41 Part 6 allows clusterPoints + rawSpanKm`);
});
