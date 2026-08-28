/**
 * QA round 24 — **A-28 Part 5's predicate**, attacked with fresh geometry, plus the two R23-3
 * claims the builder closed at I-5c.
 *
 * A-28 Part 5 upgrades *"exact for simple rings"* from a claim to a theorem: with the vertex means
 * gone, if two simple closed rings have no crossing pair of segments they are disjoint or nested,
 * and nesting puts every vertex of the inner ring inside the outer, so (a) or (b) fires. This
 * probe tries to falsify that — in **both** directions, with ring pairs built here and not
 * inherited from round 23, round 24's builder, or the shipped test file.
 *
 * OFFLINE. Nothing here fetches. Run from `cairn/`:
 *
 *   node --experimental-strip-types qa/i5c-predicate.mjs
 *
 * Sections:
 *   §1  hand-built adversarial pairs: slivers, a shared collinear edge, a boundary through a
 *       vertex, interleaved combs, holes, and the concave cases the vertex means used to fail
 *   §2  randomised differential test against a raster reference that shares no code with the
 *       predicate — false negatives and false positives counted separately
 *   §3  R23-3's fourth mutant: is `insideRing`'s strictness genuinely an EQUIVALENT mutation?
 *       (measured against a mutated copy of the real module, not argued)
 *   §4  R23-3's third mutant: `prepRing` truncating instead of rounding — closed, or still open?
 *   §5  the shipped artefact under the narrowed claim: self-intersecting rings, and whether any
 *       of them sits in a forgiveness entry or in a filter's population
 *
 * A "FAIL" line means the probe found what it was looking for. See ../docs/QA-FINDINGS.md.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

import { COUNTRY_INDEX } from '../packages/core/src/index.ts';
import { overlapsRings } from '../tools/forgiveness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0;
let checks = 0;
const ok = (cond, label, detail = '') => {
  checks++;
  if (cond) console.log(`  OK    ${label}${detail ? `  — ${detail}` : ''}`);
  else {
    fails++;
    console.log(`  FAIL  ${label}${detail ? `  — ${detail}` : ''}`);
  }
};
const note = (s) => console.log(`        ${s}`);

/** Work in lattice units (1 unit = 1e-4°) and divide only at the call, so nothing rounds. */
const U = 1e-4;
const deg = (ring) => ring.map((n) => Number((n * U).toFixed(4)));
const hits = (R, S) => overlapsRings(deg(R), [deg(S)]);

// ------------------------------------------------------------------ §1 hand-built pairs

console.log('\n§1  Hand-built adversarial pairs — built for this probe, on the shipping lattice');

const cases = [
  // Two thin slivers crossing in an X. No vertex of either is inside the other: only clause (c).
  ['thin slivers crossing in an X', [0, 40, 200, 40, 200, 42, 0, 42, 0, 40], [98, 0, 100, 0, 100, 200, 98, 200, 98, 0], true],
  // A shared collinear edge, interiors strictly disjoint. A-28 calls a touch an overlap.
  ['a long shared collinear edge, interiors disjoint', [0, 0, 100, 0, 100, 50, 0, 50, 0, 0], [0, 50, 100, 50, 100, 90, 0, 90, 0, 50], true],
  // One ring's boundary passes exactly through the other's vertex, and nowhere else.
  ['S’s edge passes exactly through a vertex of R', [40, 40, 60, 20, 80, 40, 60, 60, 40, 40], [0, 40, 40, 40, 40, 0, 0, 0, 0, 40], true],
  // Vertex to vertex, one lattice point in common and nothing else.
  ['a single shared vertex and nothing else', [0, 0, 50, 0, 50, 50, 0, 50, 0, 0], [50, 50, 90, 50, 90, 90, 50, 90, 50, 50], true],
  // One lattice unit of clear air. The predicate must say no.
  ['one lattice unit of clear air', [0, 0, 50, 0, 50, 50, 0, 50, 0, 0], [51, 0, 90, 0, 90, 50, 51, 50, 51, 0], false],
  // Interleaved combs: the boxes overlap almost entirely and the rings share nothing.
  [
    'interleaved combs — boxes overlap, ground does not',
    [0, 0, 100, 0, 100, 10, 30, 10, 30, 40, 100, 40, 100, 50, 0, 50, 0, 0],
    [110, 12, 40, 12, 40, 38, 110, 38, 110, 12],
    false,
  ],
  // R23-2's class, rebuilt with different numbers: a deep C whose vertex mean lands in the notch.
  ['a deep C with the other ring parked in its notch', [0, 0, 100, 0, 100, 20, 30, 20, 30, 80, 100, 80, 100, 100, 0, 100, 0, 0], [45, 35, 85, 35, 85, 65, 45, 65, 45, 35], false],
  // The same shape the other way round, so clause (b)'s deleted mean cannot rescue it either.
  ['the same pair with the roles swapped', [45, 35, 85, 35, 85, 65, 45, 65, 45, 35], [0, 0, 100, 0, 100, 20, 30, 20, 30, 80, 100, 80, 100, 100, 0, 100, 0, 0], false],
  // A horseshoe bay: the mouth is open water and the other ring floats in it.
  ['a horseshoe bay with a ring floating in the mouth', [0, 0, 120, 0, 120, 100, 90, 100, 90, 30, 30, 30, 30, 100, 0, 100, 0, 0], [50, 50, 70, 50, 70, 95, 50, 95, 50, 50], false],
  // Nesting, both directions.
  ['S wholly inside R', [0, 0, 200, 0, 200, 200, 0, 200, 0, 0], [80, 80, 120, 80, 120, 120, 80, 120, 80, 80], true],
  ['R wholly inside S', [80, 80, 120, 80, 120, 120, 80, 120, 80, 80], [0, 0, 200, 0, 200, 200, 0, 200, 0, 0], true],
  ['identical rings', [0, 0, 50, 0, 50, 50, 0, 50, 0, 0], [0, 0, 50, 0, 50, 50, 0, 50, 0, 0], true],
  // A degenerate, zero-area ring (three collinear points) sitting inside the other.
  ['a zero-area collinear ring inside S', [20, 25, 40, 25, 30, 25, 20, 25], [0, 0, 50, 0, 50, 50, 0, 50, 0, 0], true],
  // A sliver whose quantised width collapses to nothing, still inside.
  ['a sliver that quantises to a line, inside S', [10, 10, 40, 10, 40, 10, 10, 10], [0, 0, 50, 0, 50, 50, 0, 50, 0, 0], true],
  // Shallow-angle crossing of two long thin slivers — clause (c) with almost-parallel segments.
  ['two long slivers crossing at a shallow angle', [0, 0, 400, 8, 400, 10, 0, 2, 0, 0], [0, 6, 400, 2, 400, 4, 0, 8, 0, 6], true],
];
for (const [label, R, S, want] of cases) {
  const got = hits(R, S);
  ok(got === want, `${label} → ${want}`, got === want ? '' : `got ${got}`);
}

// Holes: S is a ring-set, so these need the two-ring form.
{
  const outer = [0, 0, 200, 0, 200, 200, 0, 200, 0, 0];
  const hole = [50, 50, 150, 50, 150, 150, 50, 150, 50, 50];
  const inHole = [80, 80, 120, 80, 120, 120, 80, 120, 80, 80];
  const spanning = [120, 120, 180, 120, 180, 180, 120, 180, 120, 120];
  ok(overlapsRings(deg(inHole), [deg(outer), deg(hole)]) === false, 'a ring inside a hole of S is not an overlap → false');
  ok(overlapsRings(deg(spanning), [deg(outer), deg(hole)]) === true, 'a ring spanning the hole’s rim is an overlap → true');
  // A ring exactly ON the hole ring: every segment is shared, so clause (c) must fire even though
  // the even-odd count across {outer, hole} says "outside" at every one of its vertices.
  const onHole = [...hole];
  ok(overlapsRings(deg(onHole), [deg(outer), deg(hole)]) === true, 'a ring exactly ON the hole ring is a touch → true');
  // And a ring strictly inside the hole, one lattice unit clear of its rim, is still not an overlap.
  const clearOfRim = [51, 51, 149, 51, 149, 149, 51, 149, 51, 51];
  ok(overlapsRings(deg(clearOfRim), [deg(outer), deg(hole)]) === false, 'a ring one lattice unit inside the hole’s rim → false');
}
// Sub-lattice separation: two rings 0.00004° apart quantise onto the same column.
{
  const a = [0, 0, 0.005, 0, 0.005, 0.005, 0, 0.005, 0, 0];
  const b = [0.00504, 0, 0.01, 0, 0.01, 0.005, 0.00504, 0.005, 0.00504, 0];
  ok(overlapsRings(a, [b]) === true, 'a 0.00004° gap is BELOW the shipping lattice and quantises to a touch → true');
}

// ------------------------------------------------------------------ §2 randomised differential

console.log('\n§2  Randomised simple rings vs a raster reference that shares no code with overlaps()');

let seed = 0x5eed1c5c;
const rnd = () => {
  seed ^= seed << 13;
  seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed / 0x1_0000_0000;
};

/** A star-shaped polygon: simple by construction, then re-checked after rounding. */
const star = () => {
  const cx = 20 + rnd() * 60;
  const cy = 20 + rnd() * 60;
  const n = 5 + Math.floor(rnd() * 8);
  const angs = Array.from({ length: n }, () => rnd() * Math.PI * 2).sort((a, b) => a - b);
  const pts = [];
  for (const a of angs) {
    const r = 4 + rnd() * 26;
    pts.push(Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a)));
  }
  pts.push(pts[0], pts[1]);
  return pts;
};

/** Segment intersection by parametric determinants — a different algorithm from `orient`. */
const segInt = (ax, ay, bx, by, cx, cy, dx, dy) => {
  const rx = bx - ax;
  const ry = by - ay;
  const sx = dx - cx;
  const sy = dy - cy;
  const den = rx * sy - ry * sx;
  const qpx = cx - ax;
  const qpy = cy - ay;
  if (den === 0) {
    if (qpx * ry - qpy * rx !== 0) return false;
    const t0 = (qpx * rx + qpy * ry) / (rx * rx + ry * ry || 1);
    const t1 = t0 + (sx * rx + sy * ry) / (rx * rx + ry * ry || 1);
    const [lo, hi] = t0 <= t1 ? [t0, t1] : [t1, t0];
    return hi >= 0 && lo <= 1;
  }
  const t = (qpx * sy - qpy * sx) / den;
  const u = (qpx * ry - qpy * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};
const boundaryMeets = (A, B) => {
  for (let i = 0; i + 3 < A.length; i += 2) {
    for (let j = 0; j + 3 < B.length; j += 2) {
      if (segInt(A[i], A[i + 1], A[i + 2], A[i + 3], B[j], B[j + 1], B[j + 2], B[j + 3])) return true;
    }
  }
  return false;
};
/** Even-odd with a VERTICAL ray (the predicate casts horizontally). */
const insideV = (x, y, r) => {
  let inside = false;
  for (let i = 0, n = r.length; i + 3 < n; i += 2) {
    const [ix, iy, jx, jy] = [r[i], r[i + 1], r[i + 2], r[i + 3]];
    if (ix > x !== jx > x) {
      const yc = iy + ((x - ix) * (jy - iy)) / (jx - ix);
      if (yc > y) inside = !inside;
    }
  }
  return inside;
};
const simple = (r) => {
  const n = (r.length - 2) / 2;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      if (segInt(r[2 * i], r[2 * i + 1], r[2 * i + 2], r[2 * i + 3], r[2 * j], r[2 * j + 1], r[2 * j + 2], r[2 * j + 3])) return false;
    }
  }
  return true;
};

let pairs = 0;
let falsePos = 0;
let falseNeg = 0;
let touchOnly = 0;
const worst = [];
const GRID = 0.25;
/** A near-twin of `r`, shifted a few lattice units — this is what makes touches and near-misses
 *  common instead of vanishingly rare, which is where the theorem is worth attacking. */
const nudge = (r) => {
  const dx = Math.round((rnd() - 0.5) * 40);
  const dy = Math.round((rnd() - 0.5) * 40);
  return r.map((v, i) => v + (i % 2 === 0 ? dx : dy));
};
while (pairs < 2_000) {
  const A = star();
  const B = pairs % 2 === 0 ? star() : nudge(A);
  if (!simple(A) || !simple(B)) continue;
  pairs++;
  const got = hits(A, B);
  // The reference: a shared interior sample, or boundaries that meet.
  const bx0 = Math.max(Math.min(...A.filter((_, i) => i % 2 === 0)), Math.min(...B.filter((_, i) => i % 2 === 0)));
  const bx1 = Math.min(Math.max(...A.filter((_, i) => i % 2 === 0)), Math.max(...B.filter((_, i) => i % 2 === 0)));
  const by0 = Math.max(Math.min(...A.filter((_, i) => i % 2 === 1)), Math.min(...B.filter((_, i) => i % 2 === 1)));
  const by1 = Math.min(Math.max(...A.filter((_, i) => i % 2 === 1)), Math.max(...B.filter((_, i) => i % 2 === 1)));
  let shared = false;
  for (let x = bx0; x <= bx1 && !shared; x += GRID) {
    for (let y = by0; y <= by1; y += GRID) {
      if (insideV(x, y, A) && insideV(x, y, B)) {
        shared = true;
        break;
      }
    }
  }
  const touches = boundaryMeets(A, B);
  const want = shared || touches;
  if (!shared && touches) touchOnly++;
  if (got && !want) {
    falsePos++;
    if (worst.length < 3) worst.push(['false positive', A, B]);
  }
  if (!got && want) {
    falseNeg++;
    if (worst.length < 3) worst.push(['false negative', A, B]);
  }
}
note(`${pairs} simple ring pairs, raster step ${GRID} lattice units; ${touchOnly} of them touch without sharing area`);
ok(falsePos === 0, 'no false POSITIVE — the direction that makes filter 1 unsound', `${falsePos}`);
ok(falseNeg === 0, 'no false NEGATIVE — the direction that would let a neighbour’s ground through', `${falseNeg}`);
for (const [kind, A, B] of worst) note(`${kind}: A=${JSON.stringify(A)} B=${JSON.stringify(B)}`);

// ------------------------------------------------------------------ §3 the strictness mutant

console.log('\n§3  R23-3’s fourth mutant — is insideRing’s strictness an EQUIVALENT mutation?');

const SRC = readFileSync(resolve(CAIRN, 'tools/forgiveness.mjs'), 'utf8');
const TMP = mkdtempSync(join(tmpdir(), 'i5c-mut-'));
const loadMutant = async (name, from, to) => {
  ok(SRC.includes(from), `the mutation target for "${name}" is present in the real module`);
  const p = join(TMP, `${name}.mjs`);
  writeFileSync(p, SRC.replace(from, to));
  return import(pathToFileURL(p).href);
};

const strict = await loadMutant(
  'nonstrict',
  'if (dy > 0 ? lhs < rhs : lhs > rhs) inside = !inside;',
  'if (dy > 0 ? lhs <= rhs : lhs >= rhs) inside = !inside;',
);
// Small lattice on purpose: on a 7x7 board an on-boundary probe vertex is the COMMON case, which
// is the only configuration the mutation can reach.
let cmpPairs = 0;
let disagree = 0;
let onBoundary = 0;
const tiny = () => {
  const n = 3 + Math.floor(rnd() * 5);
  const cx = 3 + rnd() * 2;
  const cy = 3 + rnd() * 2;
  const angs = Array.from({ length: n }, () => rnd() * Math.PI * 2).sort((a, b) => a - b);
  const pts = [];
  for (const a of angs) {
    const r = 1 + rnd() * 3;
    pts.push(Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a)));
  }
  pts.push(pts[0], pts[1]);
  return pts;
};
while (cmpPairs < 500_000) {
  const A = tiny();
  const B = tiny();
  cmpPairs++;
  const a = overlapsRings(deg(A), [deg(B)]);
  const b = strict.overlapsRings(deg(A), [deg(B)]);
  if (a !== b) disagree++;
  if (a) onBoundary++;
}
note(`${cmpPairs.toLocaleString()} ring pairs on a small lattice; ${onBoundary.toLocaleString()} overlap`);
ok(disagree === 0, 'the non-strict mutant answers identically on every pair — an equivalent mutant, not a gap', `${disagree} disagreements`);

// ------------------------------------------------------------------ §4 the rounding mutant

console.log('\n§4  R23-3’s third mutant — prepRing truncating instead of rounding');

const trunc = await loadMutant(
  'trunc',
  'const x = Math.round(ring[i] * LATTICE);',
  'const x = Math.trunc(ring[i] * LATTICE);',
);
// The arithmetic the finding named: 0.0003 * 10000 is 2.9999999999999996 in a double.
note(`0.0003 * 10000 = ${0.0003 * 1e4}; round → ${Math.round(0.0003 * 1e4)}, trunc → ${Math.trunc(0.0003 * 1e4)}`);
const gap = [
  [0.0001, 0, 0.0002, 0, 0.0002, 0.0005, 0.0001, 0.0005, 0.0001, 0],
  [0.0003, 0, 0.0007, 0, 0.0007, 0.0005, 0.0003, 0.0005, 0.0003, 0],
];
ok(overlapsRings(gap[0], [gap[1]]) === false, 'two rings one clear lattice column apart are disjoint under the shipped rounding');
ok(trunc.overlapsRings(gap[0], [gap[1]]) === true, 'and the trunc mutant MERGES them — so the mutation is observable at all', `${trunc.overlapsRings(gap[0], [gap[1]])}`);
// Now: does the SHIPPED test file carry a fixture that sees it? `qa/i5b-mutants.sh` runs the real
// suite against the real mutant; this is the arithmetic behind that row, isolated.
const fixture = readFileSync(resolve(CAIRN, 'test/forgiveness.test.ts'), 'utf8');
ok(
  /reaches the lattice by rounding/.test(fixture),
  'test/forgiveness.test.ts carries a named fixture for the rounding, added at I-5c',
);
ok(!/vertexMean|vertex mean probe/.test(readFileSync(resolve(CAIRN, 'tools/forgiveness.mjs'), 'utf8')), 'vertexMean is gone from the module, so R23-3’s second arithmetic mutant is moot');

// ------------------------------------------------------------------ §5 the narrowed claim

console.log('\n§5  The narrowed claim — self-intersecting rings in the shipped artefact');

const DROPS = JSON.parse(readFileSync(resolve(CAIRN, 'fixtures/golden/forgiveness-drops.json'), 'utf8'));
const at = new Set(DROPS.forgivenessAt);
let nonSimple = 0;
let nonSimpleInForgiveness = 0;
const nonSimpleCodes = new Map();
COUNTRY_INDEX.countries.forEach((e, i) => {
  for (const ring of e.rings) {
    // Rings are in degrees; scale to the shipping lattice so the check is the exact integer one.
    const r = ring.map((n) => Math.round(n * 1e4));
    if (r.length > 400) continue; // the census below is O(n²); the big ones are checked separately
    if (!simple(r)) {
      nonSimple++;
      nonSimpleCodes.set(e.code, (nonSimpleCodes.get(e.code) ?? 0) + 1);
      if (at.has(i)) nonSimpleInForgiveness++;
    }
  }
});
note(`non-simple rings among the small ones: ${nonSimple} — ${[...nonSimpleCodes.entries()].map(([c, n]) => `${c}×${n}`).join(' ') || 'none'}`);
ok(nonSimpleInForgiveness === 0, 'no forgiveness entry carries a self-intersecting ring — the theorem’s precondition holds where the filters ran', `${nonSimpleInForgiveness}`);

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`} — ${checks} checks\n`);
