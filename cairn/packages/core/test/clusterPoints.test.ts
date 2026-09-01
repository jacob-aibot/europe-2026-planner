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
 * **A-48 C3′, the discriminating case.** `p2` is within the threshold of `p0` and of `p1`,
 * which are 167 km apart. First-fit — A-41 C3, superseded — answers `[[0,2],[1]]`: `p2` joins
 * the first group it matches and the two groups never merge, so the answer depends on the
 * order the points arrived in. Connected components answers `[[0,1,2]]`, because the threshold
 * graph is connected. This single assertion is the whole behavioural change.
 */
test('A-48 C3′: a point that links two groups MERGES them — the partition is the components', () => {
  const p0 = at(0, 0);
  const p1 = at(0, 1.5);
  const p2 = at(0, 0.76); // ~84.6 km from p0, ~82.3 km from p1; p0–p1 is ~167 km
  assert.ok(haversine(p0, p1) > 90, 'fixture is wrong: the ends must exceed the threshold');
  assert.deepEqual(clusterPoints([p0, p1, p2], 90), [[0, 1, 2]]);
  // First-fit's answer, named so the regression is unmistakable.
  assert.notDeepEqual(clusterPoints([p0, p1, p2], 90), [[0, 2], [1]]);
});

/**
 * **A-48 I9 — order-independence.** *"For any input, permuting `points` permutes
 * `clusterPoints`' answer and changes nothing else: the induced partition of the points is
 * identical under every ordering."* This is the property A-41 constraint 2 asserted and
 * first-fit did not have (QA R36-2). Asserted over every permutation of a five-point set whose
 * threshold graph is a chain plus a bridge — the shape first-fit gets wrong.
 */
test('A-48 I9: every permutation of the same points induces the identical partition', () => {
  const pts = [at(0, 0), at(0, 1.5), at(0, 0.76), at(0, 40), at(0, 40.5)];
  /** The partition as a set of sets of the POINTS, so it can be compared across orderings. */
  const partitionOf = (order: number[]): string => {
    const groups = clusterPoints(order.map((i) => pts[i]), 90);
    return groups
      .map((g) => g.map((j) => order[j]).sort((a, b) => a - b).join(','))
      .sort()
      .join(' | ');
  };
  const permutations = (xs: number[]): number[][] =>
    xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
  const perms = permutations([0, 1, 2, 3, 4]);
  assert.equal(perms.length, 120);
  const answers = new Set(perms.map(partitionOf));
  assert.deepEqual([...answers], ['0,1,2 | 3,4'], `${answers.size} distinct partitions across 120 orderings`);
});

test('A-48 C3′: the output-order convention is unchanged — members ascending, groups by smallest member', () => {
  // Point 3 bridges 1 and 4; point 0 and 2 are their own island. Whatever order they connect
  // in, group 0 starts at index 0 and every group's members come back ascending.
  const pts = [at(0, 40), at(0, 0), at(0, 40.1), at(0, 0.7), at(0, 1.4)];
  assert.deepEqual(clusterPoints(pts, 90), [[0, 2], [1, 3, 4]]);
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
 * **A-48 Part 3's measured blast radius on the day map, as a test rather than as a claim.**
 *
 * `clusterStops` and `focusCluster` inherit C3′ deliberately — they had the same latent
 * order-dependence over `Stop.order` — so the question this answers is *how much of the day
 * map moves*. Over the Europe 2026 fixture at `DEFAULT_CLUSTER_THRESHOLD_KM` the two rules
 * agree on every day with two or more located stops and on the whole located set; at 60 km
 * exactly one day differs.
 *
 * **The 60 km arm is the vacuity control.** If it also reported zero differences, the two
 * implementations below would be the same code and the agreement at 90 km would prove nothing.
 */
function firstFit(points: readonly LatLng[], thresholdKm: number): number[][] {
  const groups: number[][] = [];
  for (let i = 0; i < points.length; i++) {
    const g = groups.find((gr) => gr.some((j) => haversine(points[j], points[i]) < thresholdKm));
    if (g) g.push(i);
    else groups.push([i]);
  }
  return groups;
}

test('A-48 Part 3: connected components and first-fit agree on the whole fixture at 90 km', () => {
  const trip = europe2026().trip;
  const pointsOf = (stops: readonly typeof trip.days[number]['stops'][number][]) =>
    stops.map((s) => stopLatLng(s, trip)).filter((p): p is LatLng => p !== null);

  const all = pointsOf(trip.days.flatMap((d) => d.stops));
  assert.equal(all.length, 112, 'the fixture no longer has 112 located stops');

  const multi = trip.days.filter((d) => pointsOf(d.stops).length >= 2);
  assert.equal(multi.length, 16, 'the fixture no longer has 16 days with two or more located stops');

  let differ90 = 0;
  for (const day of multi) {
    const pts = pointsOf(day.stops);
    if (JSON.stringify(clusterPoints(pts, 90)) !== JSON.stringify(firstFit(pts, 90))) differ90++;
  }
  assert.equal(differ90, 0, 'the day map moved at DEFAULT_CLUSTER_THRESHOLD_KM');
  assert.equal(clusterPoints(all, 90).length, 8, 'the whole located set is 8 groups');
  assert.equal(JSON.stringify(clusterPoints(all, 90)), JSON.stringify(firstFit(all, 90)));

  // The vacuity control: the two rules ARE different code, and 60 km reaches the difference.
  const differ60 = multi.filter((d) => {
    const pts = pointsOf(d.stops);
    return JSON.stringify(clusterPoints(pts, 60)) !== JSON.stringify(firstFit(pts, 60));
  });
  assert.equal(differ60.length, 1, 'at 60 km exactly one day must differ, or this check is vacuous');
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
