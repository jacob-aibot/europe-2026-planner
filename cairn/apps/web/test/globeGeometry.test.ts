import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRY_INDEX } from '../../../packages/core/src/index.ts';
import { constrainPose, globePaths, globeShapes, INITIAL_POSE } from '../src/world/globeGeometry.ts';

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
