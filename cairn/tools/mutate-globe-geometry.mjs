/**
 * mutate-globe-geometry.mjs — does `apps/web/test/globeGeometry.test.ts` guard anything?
 *
 * QA round 74 recorded that the globe "was not opened by the builder and was not tested by me",
 * and the test that stood over it caught **0 of 6** injected defects — it asserted arity, key
 * uniqueness, one non-empty string and that the index was not mutated, all of which survive
 * swapping longitude and latitude for every vertex on Earth. This harness is the instrument that
 * measured that, kept so the claim can be re-measured rather than remembered.
 *
 * It copies the product file and its test into a temp directory, applies one mutation per run to
 * the COPY, and reports whether the suite noticed. **It never writes inside the checkout.**
 *
 *   node tools/mutate-globe-geometry.mjs
 *
 * A mutant reported as PASS is a mutant the suite does not catch. M6 is expected to survive, and
 * that is a finding about the mutation rather than about the test: see **KD-132** and the
 * equivalence sweep this harness prints after the table.
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const CAIRN = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(CAIRN, 'apps/web/src/world/globeGeometry.ts');
const TEST = join(CAIRN, 'apps/web/test/globeGeometry.test.ts');
const D3 = join(CAIRN, 'node_modules/d3-geo/src/index.js');
const CORE = join(CAIRN, 'packages/core/src/index.ts');

/** [label, exact source to find (null = control), replacement]. Each site must be unique. */
const MUTANTS = [
  ['M0 (control — unmutated)', null, null],
  ['M1 drop winding normalisation', '\n        if (geoArea(polygon) > 2 * Math.PI) coordinates.reverse();', ''],
  ['M2 drop ring closure', '\n        if (first && (first[0] !== last[0] || first[1] !== last[1])) coordinates.push([...first]);', ''],
  ['M3 swap lng/lat on every vertex', 'coordinates.push([ring[i], ring[i + 1]])', 'coordinates.push([ring[i + 1], ring[i]])'],
  ['M5 drop paint order', '})).reverse();', '}));'],
  ['M6 drop .clipAngle(90)', '.clipAngle(90)', ''],
  ['M7 ignore zoom', '.scale(GLOBE_RADIUS * p.zoom)', '.scale(GLOBE_RADIUS)'],
];

const srcText = readFileSync(SRC, 'utf8');
const testText = readFileSync(TEST, 'utf8');
const root = mkdtempSync(join(tmpdir(), 'globe-mutants-'));
let survived = 0;

for (const [name, find, replace] of MUTANTS) {
  let body = srcText;
  if (find !== null) {
    const hits = body.split(find).length - 1;
    if (hits !== 1) {
      console.log(`${name}: MUTATION SITE NOT UNIQUE (${hits} matches) — the harness has drifted from the source`);
      process.exitCode = 1;
      continue;
    }
    body = body.replace(find, replace);
  }
  const dir = join(root, name.split(' ')[0]);
  mkdirSync(dir, { recursive: true });
  // Bare specifiers are rewritten to absolute paths only because the copy lives outside the
  // workspace. Nothing else about either file is changed.
  writeFileSync(join(dir, 'globeGeometry.ts'),
    body.replace("from 'd3-geo'", `from '${D3}'`).replace("from '@cairn/core'", `from '${CORE}'`));
  writeFileSync(join(dir, 'globeGeometry.test.ts'), testText
    .replaceAll("from 'd3-geo'", `from '${D3}'`)
    .replaceAll("from '../../../packages/core/src/index.ts'", `from '${CORE}'`)
    .replaceAll("from '../src/world/globeGeometry.ts'", "from './globeGeometry.ts'"));

  let out = '';
  let green = true;
  try {
    out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', join(dir, 'globeGeometry.test.ts')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    green = false;
    out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
  const failing = [...out.matchAll(/^not ok \d+ - (.+)$/gm)].map((match) => match[1]);
  const pass = (out.match(/^# pass (\d+)/m) ?? [])[1] ?? '?';
  const fail = (out.match(/^# fail (\d+)/m) ?? [])[1] ?? '?';
  if (find === null) {
    console.log(`${name}: ${green ? 'PASS (control is green)' : 'CONTROL IS RED — the harness proves nothing'} — ${pass} pass / ${fail} fail`);
    if (!green) process.exitCode = 1;
  } else if (green) {
    console.log(`${name}: PASS >>> MUTANT SURVIVES <<< — ${pass} pass / ${fail} fail`);
    survived += 1;
  } else {
    console.log(`${name}: FAIL (caught) — ${pass} pass / ${fail} fail`);
    for (const one of failing) console.log(`    caught by: ${one}`);
  }
}
console.log(`\nsurvivors: ${survived} of ${MUTANTS.length - 1}`);
console.log(`mutant copies written under ${root} (never in the checkout)`);

// --- Why M6 survives ---------------------------------------------------------
// KD-132. d3-geo 3.1.1's geoOrthographic() is
// `projection(orthographicRaw).scale(249.5).clipAngle(90 + epsilon)` with epsilon = 1e-6, so deleting
// `.clipAngle(90)` moves the clip by one millionth of a degree. Backface culling is not lost.
// This sweep is the evidence, re-measured on every run.
const probe = join(root, 'M6', 'equivalence.ts');
writeFileSync(probe, `
import { COUNTRY_INDEX } from '${CORE}';
import * as ORIG from '${join(root, 'M0', 'globeGeometry.ts')}';
import * as MUT from '${join(root, 'M6', 'globeGeometry.ts')}';
const a = ORIG.globeShapes(COUNTRY_INDEX), b = MUT.globeShapes(COUNTRY_INDEX);
let poses = 0, differing = 0, countMismatch = 0, worst = 0;
for (let lng = -180; lng < 180; lng += 15) for (let lat = -60; lat <= 60; lat += 30) for (const zoom of [1, 2.8]) {
  const pose = { longitude: lng, latitude: lat, zoom };
  const x = ORIG.globePaths(a, pose), y = MUT.globePaths(b, pose);
  let d = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) { if (x[i].d !== y[i].d) d++; if (x[i].d) dx++; if (y[i].d) dy++; }
  if (dx !== dy) countMismatch++;
  if (d > worst) worst = d;
  differing += d; poses++;
}
console.log('M6 equivalence sweep: ' + poses + ' poses x ' + a.length + ' entries = ' + (poses * a.length) + ' path strings');
console.log('  poses where the DRAWN/CLIPPED count differs at all: ' + countMismatch);
console.log('  path strings that differ (limb resampling only): ' + differing + '; worst single pose: ' + worst + ' of ' + a.length);
`);
console.log('');
console.log(execFileSync(process.execPath, [probe], { encoding: 'utf8' }).trim());
