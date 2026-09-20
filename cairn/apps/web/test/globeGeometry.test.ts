/**
 * `apps/web/src/world/globeGeometry.ts` — the only guard on the globe, which nobody has driven.
 *
 * Every number asserted below was measured against the shipped `COUNTRY_INDEX`
 * (`ne_110m+10m+50m`, **292 entries / 1,033 rings**) before it was written down, and each test
 * names the behaviour it is protecting rather than the line of source that produces it. The
 * arity/uniqueness/no-mutation assertions from the original file are kept; the rest is new.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { geoArea, geoContains } from 'd3-geo';
import { COUNTRY_INDEX } from '../../../packages/core/src/index.ts';
import type { CountryIndex } from '../../../packages/core/src/index.ts';
import {
  constrainPose, globePaths, globeShapes, GLOBE_RADIUS, GLOBE_SIZE, INITIAL_POSE,
  type GlobePose, type GlobeShape,
} from '../src/world/globeGeometry.ts';

const CENTRE = GLOBE_SIZE / 2;

/** Every ring of a shape, as a plain GeoJSON Polygon, so `geoArea`/`geoContains` can read it. */
function polygonsOf(shape: GlobeShape): { type: 'Polygon'; coordinates: number[][][] }[] {
  const collection = shape.geometry as { geometries: { type: 'Polygon'; coordinates: number[][][] }[] };
  return collection.geometries;
}

/** Spherical area a shape covers, summed over its rings. Holes add rather than subtract here,
 *  which is fine: every use below only needs a monotone measure of how big an entry is. */
function sphericalArea(shape: GlobeShape): number {
  return polygonsOf(shape).reduce((total, polygon) => total + geoArea(polygon), 0);
}

/** Furthest any drawn point of these paths sits from the centre of the disc, in px. */
function maxRadius(paths: { d: string }[]): number {
  let furthest = 0;
  for (const path of paths) {
    const numbers = path.d.match(/-?\d+(?:\.\d+)?/g);
    if (!numbers) continue;
    const values = numbers.map(Number);
    for (let i = 0; i + 1 < values.length; i += 2) {
      const r = Math.hypot(values[i] - CENTRE, values[i + 1] - CENTRE);
      if (r > furthest) furthest = r;
    }
  }
  return furthest;
}

function indexOf(rings: number[][]): CountryIndex {
  return {
    scale: 'test', source: 'test',
    countries: [{ code: 'XX' as CountryIndex['countries'][number]['code'], rings, box: [0, 0, 0, 0] }],
  };
}

test('World globe clamps tilt and scale and wraps longitude', () => {
  assert.deepEqual(constrainPose({ longitude: 373, latitude: 90, zoom: 9 }), {
    longitude: 13, latitude: 70, zoom: 2.8,
  });
  assert.deepEqual(constrainPose({ longitude: -373, latitude: -90, zoom: 0 }), {
    longitude: -13, latitude: -70, zoom: 1,
  });
});

test('World globe projects every bundled index entry without changing its order or geometry', () => {
  const before = JSON.stringify(COUNTRY_INDEX);
  const shapes = globeShapes(COUNTRY_INDEX);
  const paths = globePaths(shapes, INITIAL_POSE);
  assert.equal(shapes.length, COUNTRY_INDEX.countries.length);
  assert.equal(paths.length, shapes.length);
  assert.equal(new Set(paths.map((path) => path.key)).size, paths.length);
  assert.ok(paths.some((path) => path.code === 'HR' && path.d.length > 0), 'Croatia is not visible in the approved opening pose');
  assert.equal(JSON.stringify(COUNTRY_INDEX), before, 'globe projection mutated the canonical country index');
});

/**
 * The index stores a ring flat as `[lng, lat, lng, lat, …]`. Read in the other order every
 * country lands somewhere else on Earth, and nothing about the *shape* of the output changes —
 * same entry count, same key set, same non-empty `d` for Croatia — so this is checked against
 * the world rather than against the output's shape. Six landmarks, each in exactly one country.
 */
test('World globe reads a ring as longitude-then-latitude: landmarks fall inside their own country', () => {
  const shapes = globeShapes(COUNTRY_INDEX);
  const landmarks: [string, [number, number], string][] = [
    ['HR', [16.44, 45.81], 'Zagreb'],
    ['BR', [-47.93, -15.78], 'Brasília'],
    ['AU', [133.88, -23.70], 'Uluru'],
    ['JP', [139.69, 35.69], 'Tokyo'],
    ['ZA', [28.19, -25.75], 'Pretoria'],
    ['CA', [-106.0, 55.0], 'central Saskatchewan'],
  ];
  for (const [code, point, name] of landmarks) {
    const hits = shapes.filter((shape) => polygonsOf(shape).some((polygon) => geoContains(polygon, point)));
    assert.deepEqual([...new Set(hits.map((hit) => hit.code))], [code],
      `${name} ${JSON.stringify(point)} must be attributed to ${code} and to nothing else`);
    const swapped: [number, number] = [point[1], point[0]];
    assert.ok(!shapes.filter((shape) => shape.code === code)
      .some((shape) => polygonsOf(shape).some((polygon) => geoContains(polygon, swapped))),
      `${code} must not contain ${name}'s coordinates read latitude-first`);
  }
});

/**
 * Winding normalisation. A ring stated with the winding that makes it the *rest of the planet*
 * renders as the rest of the planet: one ring in the shipped index is like this — South Africa's
 * Lesotho hole, 12 vertices, raw spherical area 12.5657 sr against a whole sphere's 4π = 12.5664.
 * Unnormalised it swallows the globe, and every landmark above then reads as South African.
 */
test('World globe normalises ring winding: no projected ring covers more than a hemisphere', () => {
  const shapes = globeShapes(COUNTRY_INDEX);
  let rings = 0;
  let largest = 0;
  let largestCode = '';
  for (const shape of shapes) {
    for (const polygon of polygonsOf(shape)) {
      rings += 1;
      const area = geoArea(polygon);
      if (area > largest) { largest = area; largestCode = shape.code; }
    }
  }
  assert.equal(rings, 1033, 'the shipped index no longer has the 1,033 rings this test was measured against');
  assert.ok(largest <= 2 * Math.PI,
    `${largestCode} covers ${largest.toFixed(4)} sr, more than a hemisphere (${(2 * Math.PI).toFixed(4)} sr)`);
  assert.ok(largest < 0.5, `largest ring measured 0.4066 sr; got ${largest.toFixed(4)}`);

  // The same property stated as the mistake it prevents, on a ring built to have it.
  const backwards = [[0, 0, 0, 10, 10, 10, 10, 0]].map((ring) => ring);
  const wound = globeShapes(indexOf(backwards));
  assert.ok(geoArea(polygonsOf(wound[0])[0]) <= 2 * Math.PI,
    'a ring whose stated winding makes it the complement of a small box was not flipped back');
});

/**
 * `CountryRing`'s own contract: *"A closed ring, flattened … The closing point may be omitted."*
 * All 1,033 shipped rings state it, so this is only reachable through a fixture — and it matters,
 * because d3's polygon stream drops the last vertex of every ring assuming it repeats the first.
 * Omit the closing point and the final vertex is silently deleted from the drawn outline.
 */
test('World globe closes a ring that omits its closing point, drawing it identically', () => {
  const open = [0, 0, 10, 0, 10, 10, 0, 10];
  const closed = [...open, 0, 0];
  const pose: GlobePose = { longitude: 5, latitude: 5, zoom: 1 };

  const openShapes = globeShapes(indexOf([open]));
  const closedShapes = globeShapes(indexOf([closed]));
  const ring = polygonsOf(openShapes[0])[0].coordinates[0];
  assert.deepEqual(ring[0], ring[ring.length - 1], 'the projected ring was left open');
  assert.equal(ring.length, 5, 'closing an open 4-vertex ring must yield 5 positions, not drop one');

  assert.equal(
    globePaths(openShapes, pose)[0].d,
    globePaths(closedShapes, pose)[0].d,
    'a ring that omits its closing point must draw exactly as one that states it',
  );
  assert.equal(geoArea(polygonsOf(openShapes[0])[0]), geoArea(polygonsOf(closedShapes[0])[0]));
});

/**
 * Paint order. SVG paints in document order, so a small country drawn before a large one that
 * overlaps it disappears. `globeShapes` reverses the index so the largest entry is painted first
 * and the smallest last. Measured on the shipped index: entry areas run 0.41696 sr (RU) down to
 * 2.88e-10 sr (VA) with **exactly one** inversion in 291 adjacent pairs — assert the property
 * that holds, not a strict sort the honest data would fail.
 */
test('World globe paints large entries first and small entries last', () => {
  const shapes = globeShapes(COUNTRY_INDEX);
  const areas = shapes.map(sphericalArea);
  assert.equal(areas.length, 292, 'the shipped index no longer has the 292 entries this test was measured against');

  assert.equal(areas[0], Math.max(...areas), `${shapes[0].code} is painted first but is not the largest entry`);
  assert.equal(areas[areas.length - 1], Math.min(...areas),
    `${shapes[shapes.length - 1].code} is painted last but is not the smallest entry`);

  let inversions = 0;
  for (let i = 0; i + 1 < areas.length; i += 1) if (areas[i] < areas[i + 1]) inversions += 1;
  assert.ok(inversions <= 1,
    `${inversions} of ${areas.length - 1} adjacent pairs paint a larger entry after a smaller one; 1 is the measured floor`);
});

/**
 * Zoom. The disc the globe draws into has radius `GLOBE_RADIUS * zoom`: at the shipped poses some
 * geometry always reaches the limb, so the furthest drawn point *is* that radius, to within the
 * 0.5° adaptive resampling. A projection that ignores zoom draws the same 174 px disc at 2.8×.
 */
test('World globe scales the drawn disc with zoom', () => {
  const shapes = globeShapes(COUNTRY_INDEX);
  const measured: number[] = [];
  for (const zoom of [1, 1.7, 2.8]) {
    const paths = globePaths(shapes, { ...INITIAL_POSE, zoom });
    const radius = maxRadius(paths);
    measured.push(radius);
    assert.ok(Math.abs(radius - GLOBE_RADIUS * zoom) < 0.5,
      `at zoom ${zoom} the drawn extent is ${radius.toFixed(3)} px, not ${GLOBE_RADIUS * zoom} px`);
  }
  assert.ok(measured[2] > measured[0] * 2.5, 'zoom 2.8 draws no larger than zoom 1');

  // One country, off the limb, scales about the centre by exactly the zoom factor.
  const croatia = shapes.filter((shape) => shape.code === 'HR');
  const near = maxRadius(globePaths(croatia, { ...INITIAL_POSE, zoom: 1 }));
  const far = maxRadius(globePaths(croatia, { ...INITIAL_POSE, zoom: 2.8 }));
  assert.ok(Math.abs(far / near - 2.8) < 0.01, `Croatia grew ${(far / near).toFixed(3)}× between zoom 1 and 2.8`);
});

/**
 * Backface culling — the far side of the globe is not drawn through the near side. Measured:
 * **233 drawn / 59 clipped** at `INITIAL_POSE` (longitude 12), and **90 / 202** at longitude 180,
 * with Croatia and New Zealand trading places. NOTE: this does NOT catch the deletion of
 * `.clipAngle(90)`, because d3-geo 3.1.1's `geoOrthographic()` already defaults to
 * `clipAngle(90 + 1e-6)` — see KD-132. It catches clipping being lost or widened for real.
 */
test('World globe culls the far side of the sphere', () => {
  const shapes = globeShapes(COUNTRY_INDEX);
  const at = (longitude: number) => {
    const paths = globePaths(shapes, { ...INITIAL_POSE, longitude });
    return {
      drawn: paths.filter((path) => path.d.length > 0).length,
      d: (code: string) => paths.filter((path) => path.code === code).map((path) => path.d).join(''),
    };
  };
  const near = at(12);
  const far = at(180);

  assert.ok(near.drawn > 0 && near.drawn < shapes.length,
    `nothing is culled at the opening pose: ${near.drawn} of ${shapes.length} drawn`);
  assert.ok(near.drawn > far.drawn + 100,
    `a Europe-facing pose (${near.drawn}) should draw far more entries than a Pacific-facing one (${far.drawn})`);

  for (const code of ['NZ', 'FJ', 'AU']) {
    assert.equal(near.d(code), '', `${code} is on the far side at the opening pose and must not be drawn`);
  }
  assert.ok(near.d('HR').length > 0, 'Croatia must be drawn at the opening pose');
  assert.ok(far.d('NZ').length > 0, 'New Zealand must be drawn from a Pacific-facing pose');
  assert.equal(far.d('HR'), '', 'Croatia is on the far side at longitude 180 and must not be drawn');
});
