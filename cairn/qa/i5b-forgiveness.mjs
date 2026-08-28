/**
 * QA round 23 — the adversarial probe over Phase 2 **I-5b** (ARCHITECTURE §8.4 **A-27**:
 * the forgiveness entry, `tools/forgiveness.mjs`, the two filters, the ordering third key).
 *
 * OFFLINE. Nothing here fetches. Run from `cairn/`:
 *
 *   node --experimental-strip-types qa/i5b-forgiveness.mjs
 *
 * Sections:
 *   §1  additivity — strip the 54 recorded positions and compare to the pre-I-5b payload
 *   §2  ordering / composition — every forgiveness entry resolves to its own code, from points
 *       chosen inside its own rings (not capitals)
 *   §3  double coverage — does any forgiveness entry claim ground another *shipped* entry claims,
 *       including another forgiveness entry (filter 2 only ever saw the coverage-only index)
 *   §4  `overlaps()` against a brute-force reference, randomised, plus hand-built adversarial pairs
 *   §5  the drops fixture, re-derived
 *   §6  the shipped artefact's own hygiene under A-27
 *
 * A "FAIL" line means the probe found what it was looking for. See ../docs/QA-FINDINGS.md.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { COUNTRY_INDEX } from '../packages/core/src/index.ts';
import { countryOf } from '../packages/core/src/derive/country.ts';
import { overlapsRings, prepRing, prepSet, overlaps } from '../tools/forgiveness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const REPO = resolve(CAIRN, '..');

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

const DROPS = JSON.parse(readFileSync(resolve(CAIRN, 'fixtures/golden/forgiveness-drops.json'), 'utf8'));

// ------------------------------------------------------------------ §1 additivity

console.log('\n§1  Additivity — the coverage half of the new payload IS the pre-I-5b artefact');

// The committed module, decoded the way the product decodes it, is COUNTRY_INDEX. Pull the packed
// literal straight out of both files instead of trusting either decoder.
const packedOf = (text) => {
  const m = text.match(/JSON\.parse\(\s*'(\[.*?\])'\s*\)/s);
  if (m) return m[1];
  const m2 = text.match(/'(\[\[".*\]\])'/s);
  return m2 ? m2[1] : null;
};
const newSrc = readFileSync(resolve(CAIRN, 'packages/core/src/geo/countries.gen.ts'), 'utf8');
const oldSrc = execFileSync('git', ['show', 'b6200e6:cairn/packages/core/src/geo/countries.gen.ts'], {
  cwd: REPO,
  maxBuffer: 64 * 1024 * 1024,
}).toString('utf8');

const newPacked = packedOf(newSrc);
const oldPacked = packedOf(oldSrc);
ok(newPacked !== null && oldPacked !== null, 'both packed literals extracted from the module source');

const newArr = JSON.parse(newPacked);
const oldArr = JSON.parse(oldPacked);
note(`new payload ${newArr.length} entries / ${newPacked.length} bytes; old ${oldArr.length} / ${oldPacked.length}`);

const at = new Set(DROPS.forgivenessAt);
// I-5c (A-28): 54 -> 53. Arm 2b refuses `MO` the entry that claimed Zhuhai; the other 53 stand.
ok(at.size === 53 && DROPS.forgivenessAt.length === 53, 'forgivenessAt records exactly 53 positions', `${at.size}`);
const stripped = newArr.filter((_, i) => !at.has(i));
ok(
  JSON.stringify(stripped) === oldPacked,
  'stripping the 54 recorded positions yields JSON byte-identical to the pre-I-5b payload',
  `${JSON.stringify(stripped).length} vs ${oldPacked.length} bytes`,
);

// And independently of the fixture: is the old payload a *subsequence* of the new one at all?
// (If forgivenessAt were wrong, §1's assertion above would fail but this one localises why.)
let oi = 0;
for (let i = 0; i < newArr.length && oi < oldArr.length; i++) {
  if (JSON.stringify(newArr[i]) === JSON.stringify(oldArr[oi])) oi++;
}
ok(oi === oldArr.length, 'every pre-I-5b entry appears, in order, byte-identically in the new payload');

const flagged = newArr.filter((_, i) => at.has(i));
ok(
  flagged.every(([c]) => newArr.filter(([c2]) => c2 === c).length === 2),
  'every flagged position is one of exactly two entries carrying that code',
);

// ------------------------------------------------------------------ §2 ordering / composition

console.log('\n§2  Composition — every forgiveness entry resolves to its own code, from its OWN ground');

const entries = COUNTRY_INDEX.countries;
const forgivenessIdx = DROPS.forgivenessAt;
ok(entries.length === newArr.length, 'COUNTRY_INDEX entry count matches the packed literal', `${entries.length}`);
ok(
  forgivenessIdx.every((i) => entries[i].code === newArr[i][0]),
  'the recorded positions line up with COUNTRY_INDEX after decode',
);

/** even-odd across one entry's rings, on raw degrees (exactly `countryOf`'s inner loop). */
const insideEntry = (lng, lat, e) => {
  let inside = false;
  for (const ring of e.rings) {
    const n = ring.length;
    if (n < 6) continue;
    let jx = ring[n - 2];
    let jy = ring[n - 1];
    let c = false;
    for (let i = 0; i + 1 < n; i += 2) {
      const ix = ring[i];
      const iy = ring[i + 1];
      if (iy > lat !== jy > lat) {
        const x = ((jx - ix) * (lat - iy)) / (jy - iy) + ix;
        if (lng < x) c = !c;
      }
      jx = ix;
      jy = iy;
    }
    if (c) inside = !inside;
  }
  return inside;
};

let sampled = 0;
let wrongCode = 0;
let nullCode = 0;
let entriesWithNoSample = [];
const badExamples = [];
for (const i of forgivenessIdx) {
  const e = entries[i];
  const [minX, minY, maxX, maxY] = e.box;
  // A dense-enough grid over the entry's own box, plus every ring's vertex nudged inward toward
  // the ring's vertex mean. Points are kept only if they are inside THIS entry.
  const pts = [];
  const STEPS = 60;
  for (let a = 0; a <= STEPS; a++) {
    for (let b = 0; b <= STEPS; b++) {
      const lng = minX + ((maxX - minX) * a) / STEPS;
      const lat = minY + ((maxY - minY) * b) / STEPS;
      if (insideEntry(lng, lat, e)) pts.push([lng, lat]);
    }
  }
  for (const ring of e.rings) {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let k = 0; k + 1 < ring.length; k += 2) {
      sx += ring[k];
      sy += ring[k + 1];
      n++;
    }
    const cx = sx / n;
    const cy = sy / n;
    if (insideEntry(cx, cy, e)) pts.push([cx, cy]);
    for (let k = 0; k + 1 < ring.length; k += 2) {
      for (const t of [0.02, 0.1, 0.3]) {
        const lng = ring[k] + (cx - ring[k]) * t;
        const lat = ring[k + 1] + (cy - ring[k + 1]) * t;
        if (insideEntry(lng, lat, e)) pts.push([lng, lat]);
      }
    }
  }
  if (pts.length === 0) entriesWithNoSample.push(e.code);
  for (const [lng, lat] of pts) {
    sampled++;
    const got = countryOf({ lat, lng }, COUNTRY_INDEX);
    if (got === null) {
      nullCode++;
      if (badExamples.length < 8) badExamples.push(`${e.code}: (${lat},${lng}) -> null`);
    } else if (got !== e.code) {
      wrongCode++;
      if (badExamples.length < 8) badExamples.push(`${e.code}: (${lat},${lng}) -> ${got}`);
    }
  }
}
note(`${sampled} points sampled inside the 54 forgiveness entries' own rings`);
ok(entriesWithNoSample.length === 0, 'every forgiveness entry yields at least one interior sample point', entriesWithNoSample.join(' '));
ok(nullCode === 0, 'no point inside a forgiveness entry returns null', `${nullCode} did`);
ok(wrongCode === 0, 'no point inside a forgiveness entry returns another country', `${wrongCode} did`);
for (const b of badExamples) note(b);

// The same sweep, one level stricter: for every point inside a forgiveness entry, the answer must
// be reachable — i.e. no EARLIER entry of a different code contains it.
let shadowed = 0;
const shadowExamples = [];
for (const i of forgivenessIdx) {
  const e = entries[i];
  for (let j = 0; j < i; j++) {
    const o = entries[j];
    if (o.code === e.code) continue;
    if (e.box[2] < o.box[0] || o.box[2] < e.box[0] || e.box[3] < o.box[1] || o.box[3] < e.box[1]) continue;
    // boxes meet — check the ring geometry rather than guessing
    if (overlapsRings(e.rings[0].slice(), o.rings.map((r) => r.slice()))) {
      shadowed++;
      if (shadowExamples.length < 10) shadowExamples.push(`${e.code}@${i} shadowed by ${o.code}@${j}`);
    }
  }
}
ok(shadowed === 0, 'no forgiveness entry is preceded by an overlapping entry of a different code', shadowExamples.join('; '));

// ------------------------------------------------------------------ §3 double coverage

console.log('\n§3  Double coverage — does a forgiveness entry claim ground any OTHER shipped entry claims?');

const prepped = entries.map((e) => prepSet(e.rings.map((r) => r.slice())));
const contested = [];
for (const i of forgivenessIdx) {
  for (let j = 0; j < entries.length; j++) {
    if (j === i) continue;
    if (entries[j].code === entries[i].code) continue;
    if (!(prepped[i].box[2] < prepped[j].box[0] || prepped[j].box[2] < prepped[i].box[0] ||
          prepped[i].box[3] < prepped[j].box[1] || prepped[j].box[3] < prepped[i].box[1])) {
      let hit = false;
      for (const R of prepped[i].rings) if (overlaps(R, prepped[j])) { hit = true; break; }
      if (hit) contested.push([entries[i].code, i, entries[j].code, j, forgivenessIdx.includes(j) ? 'forgiveness' : 'coverage']);
    }
  }
}
ok(
  contested.filter((c) => c[4] === 'coverage').length === 0,
  'no forgiveness entry overlaps a COVERAGE entry of another code (filter 2, re-run over the artefact)',
  contested.filter((c) => c[4] === 'coverage').map((c) => `${c[0]}~${c[2]}`).join(' '),
);
ok(
  contested.filter((c) => c[4] === 'forgiveness').length === 0,
  'no forgiveness entry overlaps ANOTHER forgiveness entry — filter 2 never saw these (A-27 Part 6 residue 3)',
  contested.filter((c) => c[4] === 'forgiveness').map((c) => `${c[0]}@${c[1]}~${c[2]}@${c[3]}`).join(' '),
);

// ------------------------------------------------------------------ §4 overlaps() vs a reference

console.log('\n§4  `overlaps()` — adversarial pairs, and a randomised differential against brute force');

// Hand-built cases the ruling's three clauses must get right.
const cases = [
  // [name, ringR, ringsS, expected]
  ['R strictly inside S, no shared vertex', [4, 4, 6, 4, 6, 6, 4, 6], [[0, 0, 10, 0, 10, 10, 0, 10]], true],
  ['S strictly inside R, no shared vertex', [0, 0, 10, 0, 10, 10, 0, 10], [[4, 4, 6, 4, 6, 6, 4, 6]], true],
  ['identical rings', [0, 0, 1, 0, 1, 1, 0, 1], [[0, 0, 1, 0, 1, 1, 0, 1]], true],
  ['shared edge only', [0, 0, 1, 0, 1, 1, 0, 1], [[1, 0, 2, 0, 2, 1, 1, 1]], true],
  ['shared vertex only', [0, 0, 1, 0, 1, 1, 0, 1], [[1, 1, 2, 1, 2, 2, 1, 2]], true],
  ['one lattice step apart', [0, 0, 1, 0, 1, 1, 0, 1], [[1.0001, 0, 2, 0, 2, 1, 1.0001, 1]], false],
  ['disjoint, boxes meet', [0, 0, 4, 0, 4, 1, 0, 1], [[0, 2, 4, 2, 4, 3, 0, 3]], false],
  ['R in a hole of S', [4, 4, 5, 4, 5, 5, 4, 5], [[0, 0, 10, 0, 10, 10, 0, 10], [2, 2, 8, 2, 8, 8, 2, 8]], false],
  ['R spans the hole rim', [1, 1, 9, 1, 9, 9, 1, 9], [[0, 0, 10, 0, 10, 10, 0, 10], [2, 2, 8, 2, 8, 8, 2, 8]], true],
  ['R exactly fills the hole', [2, 2, 8, 2, 8, 8, 2, 8], [[0, 0, 10, 0, 10, 10, 0, 10], [2, 2, 8, 2, 8, 8, 2, 8]], true],
  // A concave "C" whose vertex mean falls in the notch. R sits in the notch, touching nothing.
  ['R inside the notch of a C-shaped S', [4, 4.5, 9, 4.5, 9, 5.5, 4, 5.5],
    [[0, 0, 10, 0, 10, 4, 3, 4, 3, 6, 10, 6, 10, 10, 0, 10]], false],
  // The same C, but R reaches the notch's back wall — a genuine overlap with NO vertex of R inside
  // S and no vertex of S inside R... except the crossing clause must catch it.
  ['R crosses the back wall of the C', [2, 4.5, 9, 4.5, 9, 5.5, 2, 5.5],
    [[0, 0, 10, 0, 10, 4, 3, 4, 3, 6, 10, 6, 10, 10, 0, 10]], true],
];
for (const [name, R, S, want] of cases) {
  const got = overlapsRings(R, S);
  ok(got === want, `overlaps(): ${name}`, `got ${got}, want ${want}`);
}

// Randomised differential. Reference: rasterise both rings on the SAME lattice at 1e-4 and ask
// whether any lattice cell centre is inside both under even-odd. That is a different algorithm
// from the predicate (area sampling vs vertex/crossing), so a disagreement is real.
const insideRaw = (x, y, ring) => {
  let inside = false;
  const n = ring.length;
  if (n < 6) return false;
  let jx = ring[n - 2];
  let jy = ring[n - 1];
  for (let i = 0; i + 1 < n; i += 2) {
    const ix = ring[i];
    const iy = ring[i + 1];
    if (iy > y !== jy > y) {
      const cx = ((jx - ix) * (y - iy)) / (jy - iy) + ix;
      if (x < cx) inside = !inside;
    }
    jx = ix;
    jy = iy;
  }
  return inside;
};
const insideSetRaw = (x, y, rings) => {
  let inside = false;
  for (const r of rings) if (insideRaw(x, y, r)) inside = !inside;
  return inside;
};

// Deterministic PRNG so the probe is reproducible.
let seed = 0x5eed1234;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
/** A random simple convex ring: a convex hull of random points, on the 1e-4 lattice. */
const convexRing = (cx, cy, r, k) => {
  const pts = [];
  for (let i = 0; i < k; i++) {
    const a = (2 * Math.PI * i) / k + rnd() * 0.4;
    const rr = r * (0.5 + rnd() * 0.5);
    pts.push([Math.round((cx + rr * Math.cos(a)) * 1e4) / 1e4, Math.round((cy + rr * Math.sin(a)) * 1e4) / 1e4]);
  }
  return pts.flat();
};

let diffChecked = 0;
let falseNeg = 0;
let falsePos = 0;
const diffExamples = [];
for (let t = 0; t < 4000; t++) {
  const A = convexRing(0, 0, 0.02 + rnd() * 0.05, 3 + Math.floor(rnd() * 6));
  const B = convexRing((rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.12, 0.02 + rnd() * 0.05, 3 + Math.floor(rnd() * 6));
  const pred = overlapsRings(A, [B]);
  // Reference: sample a fine grid over the intersection of the two boxes; if any sample is inside
  // both, they genuinely share area.
  const bx = (r) => {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (let i = 0; i + 1 < r.length; i += 2) {
      if (r[i] < a) a = r[i];
      if (r[i] > c) c = r[i];
      if (r[i + 1] < b) b = r[i + 1];
      if (r[i + 1] > d) d = r[i + 1];
    }
    return [a, b, c, d];
  };
  const ba = bx(A);
  const bb = bx(B);
  const lo = [Math.max(ba[0], bb[0]), Math.max(ba[1], bb[1])];
  const hi = [Math.min(ba[2], bb[2]), Math.min(ba[3], bb[3])];
  let share = false;
  if (lo[0] <= hi[0] && lo[1] <= hi[1]) {
    const N = 120;
    for (let i = 0; i <= N && !share; i++) {
      for (let j = 0; j <= N; j++) {
        const x = lo[0] + ((hi[0] - lo[0]) * i) / N;
        const y = lo[1] + ((hi[1] - lo[1]) * j) / N;
        if (insideRaw(x, y, A) && insideRaw(x, y, B)) { share = true; break; }
      }
    }
  }
  diffChecked++;
  // The reference can miss a slice thinner than the sample step, so a `pred && !share` is only
  // reported when the shared area is provably empty — i.e. the boxes do not even meet.
  if (share && !pred) {
    falseNeg++;
    if (diffExamples.length < 5) diffExamples.push(`FN A=${JSON.stringify(A)} B=${JSON.stringify(B)}`);
  }
  if (pred && !share && !(lo[0] <= hi[0] && lo[1] <= hi[1])) {
    falsePos++;
    if (diffExamples.length < 5) diffExamples.push(`FP A=${JSON.stringify(A)} B=${JSON.stringify(B)}`);
  }
}
note(`${diffChecked} random simple-ring pairs differential-tested against an area reference`);
ok(falseNeg === 0, 'no false negative: overlaps() never said "no" where the rings share area', `${falseNeg}`);
ok(falsePos === 0, 'no false positive against box-disjoint pairs', `${falsePos}`);
for (const d of diffExamples) note(d);

// The specific asymmetry the ruling's clause (b) is asked about: rings-of-S vertex mean.
// Construct S = an annulus-free ring so large that R sits inside it, and confirm clause (a) —
// not the mean — is what fires, i.e. the mean is not load-bearing for containment.
{
  const big = [0, 0, 1, 0, 1, 1, 0, 1];
  const small = [0.4, 0.4, 0.6, 0.4, 0.6, 0.6, 0.4, 0.6];
  ok(overlapsRings(small, [big]) === true, 'containment is caught by individual vertices (clause a)');
  ok(overlapsRings(big, [small]) === true, 'reverse containment is caught by clause (b)');
}

// Self-intersecting ("bow-tie") rings: R22-2 says quantisation makes 8 of MV's rings non-simple.
// The ruling only claims exactness for SIMPLE rings — measure how many shipped rings are not.
{
  const segsProperlyCross = (r) => {
    const n = r.length / 2;
    if (n > 400) return null; // O(n^2); the probe bounds the work, and reports what it skipped
    const o = (ax, ay, bx, by, cx, cy) => {
      const v = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      return v > 0 ? 1 : v < 0 ? -1 : 0;
    };
    for (let i = 0; i < n; i++) {
      const a = [r[2 * i], r[2 * i + 1]];
      const b = [r[(2 * i + 2) % (2 * n)], r[(2 * i + 3) % (2 * n)]];
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const c = [r[2 * j], r[2 * j + 1]];
        const d = [r[(2 * j + 2) % (2 * n)], r[(2 * j + 3) % (2 * n)]];
        const o1 = o(a[0], a[1], b[0], b[1], c[0], c[1]);
        const o2 = o(a[0], a[1], b[0], b[1], d[0], d[1]);
        const o3 = o(c[0], c[1], d[0], d[1], a[0], a[1]);
        const o4 = o(c[0], c[1], d[0], d[1], b[0], b[1]);
        if (o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0) return true;
      }
    }
    return false;
  };
  let nonSimple = 0;
  let skipped = 0;
  const byCode = new Map();
  entries.forEach((e, i) => {
    for (const ring of e.rings) {
      const r = segsProperlyCross(ring);
      if (r === null) { skipped++; continue; }
      if (r) {
        nonSimple++;
        byCode.set(`${e.code}@${i}`, (byCode.get(`${e.code}@${i}`) ?? 0) + 1);
      }
    }
  });
  note(`self-intersection census: ${nonSimple} non-simple rings, ${skipped} rings too large to test cheaply`);
  note(`  ${[...byCode].map(([k, v]) => `${k}:${v}`).join(' ') || 'none'}`);
  const inForgiveness = [...byCode.keys()].filter((k) => forgivenessIdx.includes(Number(k.split('@')[1])));
  ok(inForgiveness.length === 0, 'no FORGIVENESS entry ships a self-intersecting ring', inForgiveness.join(' '));
}

// ------------------------------------------------------------------ §5 the drops fixture

console.log('\n§5  The drops fixture — re-derived, and its filter-1 drops examined');

// I-5c (A-28): 11 -> 12 drops, and filter 2's nine become nine by arm 2a plus one by arm 2b.
ok(DROPS.drops.length === 12, 'twelve candidate rings were dropped', `${DROPS.drops.length}`);
ok(DROPS.drops.filter((d) => d.filter === 1).length === 2, 'two by filter 1', DROPS.drops.filter((d) => d.filter === 1).map((d) => d.code).join(' '));
ok(DROPS.drops.filter((d) => d.filter === 2).length === 10, 'ten by filter 2', DROPS.drops.filter((d) => d.filter === 2).map((d) => `${d.code}/${d.against}`).join(' '));
ok(DROPS.drops.filter((d) => d.against === 'coverage').length === 9, 'nine of them by arm 2a');
ok(
  DROPS.drops.filter((d) => d.against === 'finest').length === 1 &&
    DROPS.drops.find((d) => d.against === 'finest').code === 'MO',
  'one by arm 2b, and it is MO — R23-1 closed',
);

// For the two filter-1 drops: is the drop legitimate (the ring is somewhere else) or is it a real
// piece of that country's territory the coarse entry could have restored?
for (const d of DROPS.drops.filter((x) => x.filter === 1)) {
  const own = entries.find((e) => e.code === d.code);
  const rb = prepRing(d.ring).box;
  const ob = prepRing(own.rings[0].slice()).box;
  const ownAll = prepSet(own.rings.map((r) => r.slice())).box;
  note(
    `${d.code} filter-1 drop: dropped ring box ${(rb[0] / 1e4).toFixed(4)},${(rb[1] / 1e4).toFixed(4)}..` +
      `${(rb[2] / 1e4).toFixed(4)},${(rb[3] / 1e4).toFixed(4)}  vs entry box ` +
      `${(ownAll[0] / 1e4).toFixed(4)},${(ownAll[1] / 1e4).toFixed(4)}..${(ownAll[2] / 1e4).toFixed(4)},${(ownAll[3] / 1e4).toFixed(4)}`,
  );
  void ob;
  // Does the dropped ring's ground already attribute to this code, to another, or to nothing?
  const cx = (rb[0] + rb[2]) / 2e4;
  const cy = (rb[1] + rb[3]) / 2e4;
  note(`   its centre (${cy.toFixed(4)}, ${cx.toFixed(4)}) attributes to ${countryOf({ lat: cy, lng: cx }, COUNTRY_INDEX)}`);
}

// ------------------------------------------------------------------ §6 artefact hygiene

console.log('\n§6  Artefact hygiene under A-27');

const codes = entries.map((e) => e.code);
ok(new Set(codes).size === 239, 'still 239 distinct ISO codes', `${new Set(codes).size}`);
ok(entries.length === 292, '292 entries', `${entries.length}`);
ok(entries.length - new Set(codes).size === 53, '53 duplicate-code entries');
const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
ok(new Set(dupes).size === dupes.length, 'no ISO code appears three or more times');
ok(
  dupes.every((c) => DROPS.codes.includes(c)),
  'every duplicated code is one the generator reported as forgiven',
);
let rings = 0;
let points = 0;
let badRing = 0;
for (const e of entries) {
  for (const r of e.rings) {
    rings++;
    points += r.length / 2;
    if (r.length % 2 !== 0 || r.length < 6 || r.some((n) => !Number.isFinite(n))) badRing++;
    for (let i = 0; i + 1 < r.length; i += 2) {
      if (r[i] < -180 || r[i] > 180 || r[i + 1] < -90 || r[i + 1] > 90) badRing++;
    }
  }
}
ok(rings === 1033, '1,033 rings', `${rings}`);
ok(points === 22220, '22,220 points', `${points}`);
ok(badRing === 0, 'every ring is even-length, ≥3 points, finite and inside ±180/±90');

// The entry order is still ascending area, with the third key only breaking exact ties.
const areaOf = (e) => {
  // shoelace on a Lambert cylindrical equal-area projection — a DIFFERENT formula from the
  // generator's Chamberlain–Duquette line integral, as round 22 used.
  let a = 0;
  for (const r of e.rings) {
    let s = 0;
    const n = r.length;
    let jx = (r[n - 2] * Math.PI) / 180;
    let jy = Math.sin((r[n - 1] * Math.PI) / 180);
    for (let i = 0; i + 1 < n; i += 2) {
      const ix = (r[i] * Math.PI) / 180;
      const iy = Math.sin((r[i + 1] * Math.PI) / 180);
      s += jx * iy - ix * jy;
      jx = ix;
      jy = iy;
    }
    a += Math.abs(s / 2);
  }
  return a;
};
const areas = entries.map(areaOf);
let violations = 0;
for (let i = 1; i < areas.length; i++) if (areas[i] < areas[i - 1] * (1 - 1e-9)) violations++;
ok(violations === 0, 'entry order is still ascending by an independently computed area', `${violations} violations`);

// Where a code's two entries sit relative to each other.
const pairs = [];
for (const c of new Set(dupes)) {
  const idx = codes.map((x, i) => (x === c ? i : -1)).filter((i) => i >= 0);
  pairs.push([c, idx[0], idx[1], idx[1] - idx[0]]);
}
note(`same-code entry pairs: min gap ${Math.min(...pairs.map((p) => p[3]))}, max gap ${Math.max(...pairs.map((p) => p[3]))}`);
const forgivenessFirst = pairs.filter((p) => forgivenessIdx.includes(p[1])).length;
note(`forgiveness entry sorts FIRST of the pair in ${forgivenessFirst} of ${pairs.length} codes`);

// ------------------------------------------------------------------ §7 regression, old vs new

console.log('\n§7  Regression — the pre-I-5b index (reconstructed at §1) against the shipped one');

const { countryIndex } = await import('../packages/core/src/geo/countryIndex.ts');
const OLD = countryIndex({
  scale: 'ne_110m+10m',
  source: 'reconstructed from the shipped payload by removing the 54 forgiveness entries',
  countries: entries.filter((_, i) => !at.has(i)),
});
ok(OLD.countries.length === 239, 'the reconstructed pre-I-5b index has 239 entries');

// (iii) — the fine sweep over every forgiveness bounding box padded by 0.1 degrees.
let cells = 0;
let gained = 0;
let lost = 0;
let switched = 0;
const switches = [];
for (const i of forgivenessIdx) {
  const [x0, y0, x1, y1] = entries[i].box;
  const STEP = 0.02;
  for (let lng = x0 - 0.1; lng <= x1 + 0.1; lng += STEP) {
    for (let lat = y0 - 0.1; lat <= y1 + 0.1; lat += STEP) {
      cells++;
      const a = countryOf({ lat, lng }, OLD);
      const b = countryOf({ lat, lng }, COUNTRY_INDEX);
      if (a === b) continue;
      if (a === null) gained++;
      else if (b === null) lost++;
      else {
        switched++;
        if (switches.length < 10) switches.push(`(${lat.toFixed(3)},${lng.toFixed(3)}) ${a} -> ${b}`);
      }
    }
  }
}
note(`${cells} cells at 0.02 deg over the 54 padded forgiveness boxes`);
ok(lost === 0, 'no cell goes country -> null', `${lost}`);
ok(switched === 0, 'no cell goes one country -> another', `${switched} ${switches.join('; ')}`);
note(`${gained} cells go null -> a country (A-27 Part 5 predicted 704 at a denser step)`);

// A global grid, deliberately not the builder's: 0.29 deg step with a 0.11 deg offset.
let gcells = 0;
let ggain = 0;
let glost = 0;
let gswitch = 0;
for (let lng = -180 + 0.11; lng < 180; lng += 0.29) {
  for (let lat = -90 + 0.11; lat < 90; lat += 0.29) {
    gcells++;
    const a = countryOf({ lat, lng }, OLD);
    const b = countryOf({ lat, lng }, COUNTRY_INDEX);
    if (a === b) continue;
    if (a === null) ggain++;
    else if (b === null) glost++;
    else gswitch++;
  }
}
note(`global sweep: ${gcells} cells, ${ggain} gained, ${glost} lost, ${gswitch} switched`);
ok(glost === 0 && gswitch === 0, 'the global sweep loses and switches nothing', `${glost}/${gswitch}`);

// ------------------------------------------------------------------ §8 the reference trip

console.log('\n§8  The reference trip — every coordinate-bearing record, both indexes');

const sample = JSON.parse(readFileSync(resolve(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8'));
const coords = [];
const walk = (node) => {
  if (Array.isArray(node)) return node.forEach(walk);
  if (node && typeof node === 'object') {
    if (node.at && typeof node.at.lat === 'number' && typeof node.at.lng === 'number') coords.push(node.at);
    for (const v of Object.values(node)) walk(v);
  }
};
walk(sample);
note(`${coords.length} coordinate-bearing records found in the sample document`);
let moved = 0;
for (const c of coords) {
  if (countryOf(c, OLD) !== countryOf(c, COUNTRY_INDEX)) moved++;
}
ok(moved === 0, 'zero reference-trip answers change between the two indexes', `${moved} changed`);

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`} — ${checks} checks, ${fails} failed\n`);
process.exit(0);
