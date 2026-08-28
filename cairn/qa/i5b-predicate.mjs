/**
 * QA round 23 — is A-27 Part 4's `overlaps()` predicate actually *exact for simple rings*, and
 * does the answer change any decision the shipped artefact rests on?
 *
 * OFFLINE. Run from `cairn/`:
 *
 *   node --experimental-strip-types qa/i5b-predicate.mjs
 *
 * §1  The claim, attacked directly: a hand-built pair of disjoint simple rings for which the
 *     predicate returns true.
 * §2  Why: the two "or the arithmetic mean of the vertices" phrases. A mean-free predicate is
 *     re-derived here and shown to be the exact one for simple rings.
 * §3  Blast radius: re-run BOTH filters over every one of the 153 candidate rings with the
 *     mean-free predicate and diff the decisions against the shipped ones.
 * §4  The direction of harm: which filter is made unsound by a false positive, and which is only
 *     made lossy.
 *
 * A "FAIL" line means the probe found what it was looking for.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { COUNTRY_INDEX } from '../packages/core/src/index.ts';
import { overlapsRings, prepRing, prepSet } from '../tools/forgiveness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const DROPS = JSON.parse(readFileSync(resolve(CAIRN, 'fixtures/golden/forgiveness-drops.json'), 'utf8'));

let fails = 0;
let checks = 0;
const ok = (cond, label, detail = '') => {
  checks++;
  console.log(`  ${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!cond) fails++;
};
const note = (s) => console.log(`        ${s}`);

// ------------------------------------------------------------------ a mean-free reference

const LATTICE = 10_000;
const prep = (ring) => {
  const pts = [];
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    const x = Math.round(ring[i] * LATTICE);
    const y = Math.round(ring[i + 1] * LATTICE);
    pts.push(x, y);
    if (x < a) a = x;
    if (x > c) c = x;
    if (y < b) b = y;
    if (y > d) d = y;
  }
  return { pts, box: [a, b, c, d] };
};
const meet = (p, q) => !(p[2] < q[0] || q[2] < p[0] || p[3] < q[1] || q[3] < p[1]);
const insideRing = (x, y, r) => {
  const n = r.length;
  if (n < 6) return false;
  let inside = false;
  let jx = r[n - 2];
  let jy = r[n - 1];
  for (let i = 0; i + 1 < n; i += 2) {
    const ix = r[i];
    const iy = r[i + 1];
    if (iy > y !== jy > y) {
      const dy = jy - iy;
      const lhs = (x - ix) * dy;
      const rhs = (jx - ix) * (y - iy);
      if (dy > 0 ? lhs < rhs : lhs > rhs) inside = !inside;
    }
    jx = ix;
    jy = iy;
  }
  return inside;
};
const insideRings = (x, y, rs) => {
  let inside = false;
  for (const r of rs) if (insideRing(x, y, r.pts)) inside = !inside;
  return inside;
};
const orient = (ax, ay, bx, by, cx, cy) => {
  const v = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return v > 0 ? 1 : v < 0 ? -1 : 0;
};
const onSeg = (ax, ay, bx, by, px, py) =>
  px >= Math.min(ax, bx) && px <= Math.max(ax, bx) && py >= Math.min(ay, by) && py <= Math.max(ay, by);
const segCross = (ax, ay, bx, by, cx, cy, dx, dy) => {
  const o1 = orient(ax, ay, bx, by, cx, cy);
  const o2 = orient(ax, ay, bx, by, dx, dy);
  const o3 = orient(cx, cy, dx, dy, ax, ay);
  const o4 = orient(cx, cy, dx, dy, bx, by);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSeg(ax, ay, bx, by, cx, cy)) return true;
  if (o2 === 0 && onSeg(ax, ay, bx, by, dx, dy)) return true;
  if (o3 === 0 && onSeg(cx, cy, dx, dy, ax, ay)) return true;
  if (o4 === 0 && onSeg(cx, cy, dx, dy, bx, by)) return true;
  return false;
};
const ringsCross = (a, b) => {
  const na = a.length;
  const nb = b.length;
  if (na < 4 || nb < 4) return false;
  let ax = a[na - 2];
  let ay = a[na - 1];
  for (let i = 0; i + 1 < na; i += 2) {
    const bx = a[i];
    const by = a[i + 1];
    let cx = b[nb - 2];
    let cy = b[nb - 1];
    for (let j = 0; j + 1 < nb; j += 2) {
      const dx = b[j];
      const dy = b[j + 1];
      if (segCross(ax, ay, bx, by, cx, cy, dx, dy)) return true;
      cx = dx;
      cy = dy;
    }
    ax = bx;
    ay = by;
  }
  return false;
};

/**
 * **A-27 Part 4's predicate with the two vertex-mean probes removed.** For simple rings this is
 * the exact "do these share interior area, or touch" test: if two simple closed curves neither
 * cross nor touch, one interior contains the other or they are disjoint — and containment puts
 * every vertex of the contained ring inside the container, which clause (a) or (b) sees.
 */
const overlapsExact = (R, S) => {
  if (!meet(R.box, S.box)) return false;
  const near = S.rings.filter((s) => meet(R.box, s.box));
  if (!near.length) return false;
  for (let i = 0; i + 1 < R.pts.length; i += 2) if (insideRings(R.pts[i], R.pts[i + 1], near)) return true;
  for (const s of near) for (let i = 0; i + 1 < s.pts.length; i += 2) if (insideRing(s.pts[i], s.pts[i + 1], R.pts)) return true;
  for (const s of near) if (ringsCross(R.pts, s.pts)) return true;
  return false;
};
const prepS = (rings) => {
  const rs = rings.map(prep);
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const r of rs) {
    if (r.box[0] < a) a = r.box[0];
    if (r.box[1] < b) b = r.box[1];
    if (r.box[2] > c) c = r.box[2];
    if (r.box[3] > d) d = r.box[3];
  }
  return { rings: rs, box: [a, b, c, d] };
};
const overlapsExactRings = (ring, rings) => overlapsExact(prep(ring), prepS(rings));

// ------------------------------------------------------------------ §1 the counterexample

console.log('\n§1  A-27 Part 4 claims the predicate is "exact for simple rings". It is not.');

// A "C" opening east. The notch — x in (3,10), y in (4,6) — is OUTSIDE the ring.
const C = [0, 0, 10, 0, 10, 4, 3, 4, 3, 6, 10, 6, 10, 10, 0, 10];
// A bar sitting entirely inside the notch. It shares no point at all with C's interior or boundary.
const bar = [4, 4.5, 9, 4.5, 9, 5.5, 4, 5.5];

const meanOf = (r) => {
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i + 1 < r.length; i += 2) { sx += r[i]; sy += r[i + 1]; n++; }
  return [sx / n, sy / n];
};
note(`C's vertex mean is (${meanOf(C).join(', ')}) — inside the bar, and OUTSIDE C itself`);
note(`the bar's own vertex mean is (${meanOf(bar).join(', ')}) — in the notch, outside C`);
ok(overlapsRings(bar, [C]) === false, 'overlaps(bar, [C]) should be false — the bar is in the notch', `got ${overlapsRings(bar, [C])}`);
ok(overlapsExactRings(bar, [C]) === false, 'the mean-free predicate gets it right', `got ${overlapsExactRings(bar, [C])}`);

// The symmetric case: R concave, S a small ring in R's notch. Clause (a)'s own mean fires.
const bar2 = [4, 4.5, 9, 4.5, 9, 5.5, 4, 5.5];
ok(overlapsRings(C, [bar2]) === false, 'overlaps(C, [bar]) should be false too — clause (a)\'s mean of C', `got ${overlapsRings(C, [bar2])}`);

// A shape closer to what the data actually holds: a horseshoe-shaped coastline with an island in
// the bay. This is the class the filters meet — a coarse polygon with a deep inlet.
const horseshoe = [
  0, 0, 10, 0, 10, 10, 7, 10, 7, 3, 3, 3, 3, 10, 0, 10,
];
const islandInBay = [4.5, 5, 5.5, 5, 5.5, 6, 4.5, 6];
note(`horseshoe vertex mean = (${meanOf(horseshoe).map((n) => n.toFixed(3)).join(', ')}) — in the bay`);
ok(
  overlapsRings(islandInBay, [horseshoe]) === false,
  'an island in a horseshoe bay does not overlap the horseshoe',
  `got ${overlapsRings(islandInBay, [horseshoe])}`,
);
ok(overlapsExactRings(islandInBay, [horseshoe]) === false, 'the mean-free predicate gets the bay right');

// ------------------------------------------------------------------ §2 the means are redundant

console.log('\n§2  Are the vertex-mean probes ever LOAD-BEARING? (a randomised search for a case');
console.log('    where the mean fires and no vertex/crossing clause does, on genuinely overlapping rings)');

let seed = 0x1234beef;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const randRing = (cx, cy, r, k, jag) => {
  const pts = [];
  for (let i = 0; i < k; i++) {
    const a = (2 * Math.PI * i) / k;
    const rr = r * (1 - jag * rnd());
    pts.push(Math.round((cx + rr * Math.cos(a)) * 1e4) / 1e4, Math.round((cy + rr * Math.sin(a)) * 1e4) / 1e4);
  }
  return pts;
};
let disagree = 0;
let meanOnlyTrue = 0;
let exactOnlyTrue = 0;
const examples = [];
for (let t = 0; t < 20000; t++) {
  const A = randRing(0, 0, 0.02 + rnd() * 0.05, 5 + Math.floor(rnd() * 10), rnd() * 0.9);
  const B = randRing((rnd() - 0.5) * 0.14, (rnd() - 0.5) * 0.14, 0.02 + rnd() * 0.05, 5 + Math.floor(rnd() * 10), rnd() * 0.9);
  const p = overlapsRings(A, [B]);
  const e = overlapsExactRings(A, [B]);
  if (p !== e) {
    disagree++;
    if (p && !e) meanOnlyTrue++;
    else exactOnlyTrue++;
    if (examples.length < 3) examples.push(`predicate=${p} exact=${e}  A=${JSON.stringify(A)}  B=${JSON.stringify(B)}`);
  }
}
note(`20,000 random star-shaped/jagged simple ring pairs: ${disagree} disagreements`);
note(`  predicate true & exact false (a FALSE POSITIVE from the mean): ${meanOnlyTrue}`);
note(`  exact true & predicate false (the mean rescuing a real overlap): ${exactOnlyTrue}`);
ok(
  exactOnlyTrue === 0,
  'the vertex-mean probes never rescue a real overlap the vertex/crossing clauses miss — they are pure surplus',
  `${exactOnlyTrue} cases`,
);
ok(meanOnlyTrue === 0, 'the vertex-mean probes never invent an overlap', `${meanOnlyTrue} cases did`);
for (const e of examples) note(e);

// ------------------------------------------------------------------ §3 blast radius

console.log('\n§3  Blast radius — re-run BOTH filters over all 153 candidates with the mean-free predicate');

const entries = COUNTRY_INDEX.countries;
const at = new Set(DROPS.forgivenessAt);
const coverage = entries.filter((_, i) => !at.has(i)); // the pre-I-5b index, exactly (§1 of the sibling probe)
const forgiven = entries.filter((_, i) => at.has(i));
ok(coverage.length === 239 && forgiven.length === 54, 'coverage/forgiveness split reconstructed', `${coverage.length}/${forgiven.length}`);

/** Every candidate ring the generator saw, with the decision it got. */
const candidates = [];
for (const e of forgiven) for (const r of e.rings) candidates.push({ code: e.code, ring: r.slice(), shipped: 'kept', filter: null });
for (const d of DROPS.drops) candidates.push({ code: d.code, ring: d.ring, shipped: 'dropped', filter: d.filter, takenFrom: d.takenFrom });
ok(candidates.length === 153, 'all 153 candidate rings recovered', `${candidates.length}`);

const covByCode = new Map(coverage.map((e) => [e.code, e]));
const covPrep = new Map(coverage.map((e) => [e.code, prepS(e.rings.map((r) => r.slice()))]));

let changed = 0;
const changes = [];
for (const c of candidates) {
  const own = covByCode.get(c.code);
  const R = prep(c.ring);
  // filter 1 with the exact predicate
  const f1 = overlapsExact(R, covPrep.get(c.code));
  let taken = null;
  if (f1) {
    for (const o of coverage) {
      if (o.code === c.code) continue;
      if (overlapsExact(R, covPrep.get(o.code))) { taken = o.code; break; }
    }
  }
  const verdict = !f1 ? 'drop1' : taken ? `drop2:${taken}` : 'kept';
  const was = c.shipped === 'kept' ? 'kept' : c.filter === 1 ? 'drop1' : `drop2:${c.takenFrom}`;
  if (verdict !== was) {
    changed++;
    changes.push(`${c.code}: shipped ${was}, exact predicate says ${verdict}`);
  }
  void own;
}
ok(changed === 0, 'no shipped decision changes under the exact predicate', `${changed} would change`);
for (const ch of changes) note(ch);

// The same question asked one step earlier: for each of the 142 KEPT rings, is filter 1's
// "yes" a genuine touch or a vertex-mean artefact?
let keptByMeanOnly = 0;
for (const c of candidates.filter((x) => x.shipped === 'kept')) {
  const R = prep(c.ring);
  if (!overlapsExact(R, covPrep.get(c.code))) keptByMeanOnly++;
}
ok(keptByMeanOnly === 0, 'no kept ring was admitted by filter 1 on a vertex-mean probe alone', `${keptByMeanOnly}`);

// …and for each of the 9 filter-2 drops, is the drop genuine or a vertex-mean artefact?
let droppedByMeanOnly = 0;
for (const d of DROPS.drops.filter((x) => x.filter === 2)) {
  const R = prep(d.ring);
  if (!overlapsExact(R, covPrep.get(d.takenFrom))) {
    droppedByMeanOnly++;
    note(`${d.code}: filter 2 named ${d.takenFrom} but the exact predicate finds no overlap with it`);
  }
}
ok(droppedByMeanOnly === 0, 'every filter-2 drop names a country the ring genuinely reaches', `${droppedByMeanOnly}`);

// ------------------------------------------------------------------ §4 direction of harm

console.log('\n§4  Which filter a false positive breaks');
note('filter 1 keeps a ring when overlaps() is TRUE  -> a false positive ADMITS a ring that does');
note('  not touch the country at all. That is exactly the Vatican failure filter 1 exists to stop.');
note('filter 2 drops a ring when overlaps() is TRUE  -> a false positive DROPS a legitimate ring.');
note('  Lossy, never wrong. So the unsound direction is filter 1, and it is unsound only for a');
note('  concave coverage ring-set whose vertex mean lands inside the candidate — measured above.');

// How concave are the shipped coverage entries, really? Count entries whose vertex mean is
// outside the entry — those are the ones where clause (b)'s mean is a live false-positive risk.
let meanOutside = 0;
const meanOutsideCodes = [];
for (const e of coverage) {
  const S = prepS(e.rings.map((r) => r.slice()));
  for (const r of S.rings) {
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i + 1 < r.pts.length; i += 2) { sx += r.pts[i]; sy += r.pts[i + 1]; n++; }
    const mx = Math.round(sx / n);
    const my = Math.round(sy / n);
    if (!insideRing(mx, my, r.pts)) {
      meanOutside++;
      if (meanOutsideCodes.length < 25) meanOutsideCodes.push(e.code);
      break;
    }
  }
}
note(`${meanOutside} of ${coverage.length} coverage entries have at least one ring whose vertex mean falls OUTSIDE that ring`);
note(`  e.g. ${meanOutsideCodes.join(' ')}`);
note('Each of those is a live clause-(b) false-positive site. None fires on the shipped data (§3),');
note('so the defect is latent: it is in the ruling\'s prose and in the code, not in this artefact.');

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`} — ${checks} checks, ${fails} failed\n`);
process.exit(0);
