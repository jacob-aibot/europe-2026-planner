/**
 * `overlaps` and the forgiveness filters — ARCHITECTURE §8.4 **A-28** Parts 3 and 5, ROADMAP
 * Phase 2 **I-5c** (replacing A-27 Part 4 / I-5b).
 *
 * This file exists as a module of its own, separate from `gen-countries.mjs`, for one reason:
 * ROADMAP exit criterion 4 part **e** asks for *injected-fault* assertions — delete filter 1 and
 * Vatican City gains a polygon a kilometre west of itself; delete both arms of filter 2 and the
 * bordered codes gain an entry; delete **arm 2b alone** and Macao claims 22 km² of Guangdong — and
 * a test cannot inject a fault into a filter it cannot import. `gen-countries.mjs` runs `main()`
 * at import time and fetches 13 MB when it does; this file fetches nothing, reads nothing and
 * holds no state, so `test/forgiveness.test.ts` can call the same functions the generator calls.
 *
 * ---
 *
 * **The predicate, verbatim from A-28 Part 5:**
 *
 * > `overlaps(ring R, ring-set S)` is true iff any of: (a) a vertex of `R` is inside `S` under the
 * > even-odd rule; (b) a vertex of any ring of `S` is inside `R`; (c) a segment of `R` crosses a
 * > segment of any ring of `S`. Rings whose bounding boxes are disjoint are rejected before any of
 * > this. It is evaluated on the **quantised** rings — the ones that ship — never the raw ones,
 * > and on the integer lattice those rings live on, so every clause is an exact integer comparison.
 * >
 * > **Exact for simple rings, as a theorem rather than a claim.** If two simple closed rings have
 * > no crossing pair of segments, they are either disjoint or one lies wholly inside the other; in
 * > the second case every vertex of the inner ring is inside the outer, so (a) or (b) fires.
 * > (a)–(c) are therefore complete and sound for simple rings, and the integer arithmetic makes
 * > each decision exact rather than nearly exact. **No claim is made for self-intersecting rings.**
 * > The artefact contains nine — eight in `MV`, one in `SD` (QA R22-2) — none of them a
 * > forgiveness candidate; where such a ring sits in a filter's *population* the predicate could in
 * > principle miss an overlap, bounded by the bow-ties' own lobes, which R22-2 measured at
 * > ~0.0196 km² lost / ~0.0118 km² gained in total.
 *
 * *(A-27's version of this predicate also probed the arithmetic **mean** of each ring's vertices.
 * QA R23-2 showed the mean of a concave ring can lie outside it, so those two probes could report
 * an overlap between rings that share no ground — a false positive, which is the direction that
 * makes filter 1 unsound. A-28 Part 5 removes them; re-measured over all 153 candidates under the
 * two-arm filter, **0 decisions change**.)*
 *
 * Two implementation notes, neither of which is a judgment call the ruling left open:
 *
 * 1. **The arithmetic is integer.** The rings that ship are quantised to `DECIMALS = 4`, so every
 *    coordinate is an exact multiple of 1e-4 — but stored as a double, `12.4527` is not exactly
 *    12.4527, and an orientation test on those doubles is not exact. Every point here is therefore
 *    scaled to the 1e-4 lattice and rounded to an integer once, and every predicate below is a
 *    comparison of integer products. The largest product any of them forms is ~1.3 × 10¹³, well
 *    inside the 2⁵³ range where doubles hold integers exactly, so *"exact for simple rings"* is a
 *    property of this code and not only of the ruling's prose.
 * 2. **The bounding-box reject is exact, not an approximation.** A ring of `S` whose box is
 *    disjoint from `R`'s box can contain no vertex of `R`, can have no vertex inside `R`, and can
 *    cross no segment of `R` — so dropping it changes no answer, including the even-odd count in
 *    (a): any ring that could enclose a point of `R` has a box containing that point.
 */

/** The quantisation lattice the shipped rings live on: 4 decimal places. */
export const LATTICE = 10_000;

/**
 * A flat `[lng, lat, …]` ring, moved onto the integer lattice and given its bounding box.
 * Pure; the input is not mutated.
 */
export function prepRing(ring) {
  const n = ring.length;
  const pts = new Array(n);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < n; i += 2) {
    const x = Math.round(ring[i] * LATTICE);
    const y = Math.round(ring[i + 1] * LATTICE);
    pts[i] = x;
    pts[i + 1] = y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { pts, box: [minX, minY, maxX, maxY] };
}

/** A ring-set prepared once: its rings, plus the box of their union. Pure. */
export function prepSet(rings) {
  const prepped = rings.map(prepRing);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of prepped) {
    if (r.box[0] < minX) minX = r.box[0];
    if (r.box[1] < minY) minY = r.box[1];
    if (r.box[2] > maxX) maxX = r.box[2];
    if (r.box[3] > maxY) maxY = r.box[3];
  }
  return { rings: prepped, box: [minX, minY, maxX, maxY] };
}

/** Two boxes share at least one lattice point. Closed on all four sides, deliberately: two rings
 *  that touch exactly at a vertex are not "disjoint", and A-27's predicate calls a touch an
 *  overlap. */
export function boxesMeet(a, b) {
  return !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
}

/**
 * Even-odd crossing count for one integer ring, with no division. This is
 * `derive/country.ts`'s `crossesOdd` rearranged so the intersection comparison
 * `lng < ix + (jx-ix)(lat-iy)/(jy-iy)` becomes a product comparison with the sign of `jy-iy`
 * carried explicitly — the same test, exactly, without the rounding a division introduces.
 */
function insideRing(x, y, r) {
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
}

/** Even-odd across a whole ring-set — holes cancel, exactly as `countryOf` does it. */
function insideRings(x, y, rings) {
  let inside = false;
  for (const r of rings) if (insideRing(x, y, r.pts)) inside = !inside;
  return inside;
}

/** Sign of the cross product (b−a)×(c−a): +1 left turn, −1 right turn, 0 collinear. Exact. */
function orient(ax, ay, bx, by, cx, cy) {
  const v = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/** `p` lies on segment `a→b`, given the three are already known to be collinear. */
function onSegment(ax, ay, bx, by, px, py) {
  return (
    px >= (ax < bx ? ax : bx) &&
    px <= (ax > bx ? ax : bx) &&
    py >= (ay < by ? ay : by) &&
    py <= (ay > by ? ay : by)
  );
}

/** Two closed segments intersect, touching included. Exact on the integer lattice. */
function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const o1 = orient(ax, ay, bx, by, cx, cy);
  const o2 = orient(ax, ay, bx, by, dx, dy);
  const o3 = orient(cx, cy, dx, dy, ax, ay);
  const o4 = orient(cx, cy, dx, dy, bx, by);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(ax, ay, bx, by, cx, cy)) return true;
  if (o2 === 0 && onSegment(ax, ay, bx, by, dx, dy)) return true;
  if (o3 === 0 && onSegment(cx, cy, dx, dy, ax, ay)) return true;
  if (o4 === 0 && onSegment(cx, cy, dx, dy, bx, by)) return true;
  return false;
}

/** Does any segment of `a` cross any segment of `b`? Boxes are assumed already to meet. */
function ringsCross(a, b) {
  const na = a.length;
  const nb = b.length;
  if (na < 4 || nb < 4) return false;
  let ax = a[na - 2];
  let ay = a[na - 1];
  for (let i = 0; i + 1 < na; i += 2) {
    const bx = a[i];
    const by = a[i + 1];
    const loX = ax < bx ? ax : bx;
    const hiX = ax > bx ? ax : bx;
    const loY = ay < by ? ay : by;
    const hiY = ay > by ? ay : by;
    let cx = b[nb - 2];
    let cy = b[nb - 1];
    for (let j = 0; j + 1 < nb; j += 2) {
      const dx = b[j];
      const dy = b[j + 1];
      // Segment-level box reject: same exactness argument as the ring-level one.
      if (
        !((cx < loX && dx < loX) || (cx > hiX && dx > hiX) || (cy < loY && dy < loY) || (cy > hiY && dy > hiY)) &&
        segmentsCross(ax, ay, bx, by, cx, cy, dx, dy)
      ) {
        return true;
      }
      cx = dx;
      cy = dy;
    }
    ax = bx;
    ay = by;
  }
  return false;
}

/**
 * **A-28 Part 5's predicate.** `R` is a prepared ring (`prepRing`), `S` a prepared ring-set
 * (`prepSet`). Pure, exact for simple rings, and evaluated on the lattice the rings ship on.
 */
export function overlaps(R, S) {
  if (!boxesMeet(R.box, S.box)) return false;
  const near = S.rings.filter((s) => boxesMeet(R.box, s.box));
  if (near.length === 0) return false;

  // (a) a vertex of R inside S, even-odd across S's rings.
  for (let i = 0; i + 1 < R.pts.length; i += 2) {
    if (insideRings(R.pts[i], R.pts[i + 1], near)) return true;
  }

  // (b) a vertex of a ring of S inside R.
  for (const s of near) {
    for (let i = 0; i + 1 < s.pts.length; i += 2) {
      if (insideRing(s.pts[i], s.pts[i + 1], R.pts)) return true;
    }
  }

  // (c) a segment of R crossing a segment of a ring of S.
  for (const s of near) if (ringsCross(R.pts, s.pts)) return true;

  return false;
}

/** Convenience for tests and one-off calls: the predicate over plain flat rings. Pure. */
export function overlapsRings(ring, rings) {
  return overlaps(prepRing(ring), prepSet(rings));
}

/**
 * **The forgiveness pass for one ISO code** — A-28 Part 3: filter 1, then filter 2's **two arms**,
 * each independently removable so ROADMAP exit criterion 4 part (e)'s three injected faults are a
 * call rather than a code edit.
 *
 * **Filter 2 is two comparisons, not one, and neither may be dropped in favour of the other**
 * (A-28 Part 3, on QA R23-1). The coverage-only index is deliberately mixed-resolution — 175 codes
 * at 1:110m, 64 at 1:10m — so *"do you overlap this neighbour"* asked of the index alone is a
 * question at whatever scale that neighbour happens to ship at, and for a coarse one it fails
 * **generously**: Macao's 1:50m ring was checked against China's 1:110m coastline, which is
 * generalised kilometres inland of the Pearl River delta, and ~22.1 km² of Guangdong came to
 * answer `MO`.
 *
 *  - **2a — against the shipped index**, each entry at the resolution it ships at. This is the
 *    **non-regression** guarantee: A-27 Part 3 property 2 (`country → other country` is impossible
 *    by construction) rests on it, and it is what refuses `HK[1]`, `HK[2]` and `SG[0]`, whose
 *    ground genuinely belongs to `CN` and `MY` *as the index draws them at 1:110m*.
 *  - **2b — against each other code's finest drawing** in the pinned family, whatever scale its
 *    own coverage entry uses. This is the **truth** guarantee, and it is what refuses `MO[0]`.
 *
 * A-28 Part 4 is the census: of the 151 candidate rings that survive filter 1, exactly four get
 * different verdicts from the two arms — `MO[0]` (2b only) and `HK[1]`, `HK[2]`, `SG[0]` (2a only).
 * Replacing 2a with 2b would trade one wrong answer for three.
 *
 * **The filters run 1, 2a, 2b and a drop is booked against the first one that fires.** One
 * consequence is worth stating where the code is rather than leaving it to be rediscovered:
 * removing filter 1 alone does not admit `VA`'s 1:50m polygon, because filter 2 then catches it
 * against Italy. See **KD-54** in BUILD-NOTES §1 for the measurement and what the test asserts
 * instead.
 *
 * @param candidates   flat quantised rings from a strictly coarser scale that carries this code
 * @param own          the code's own coverage rings (the ones already shipping for it)
 * @param others       every OTHER entry of the coverage-only index, at the resolution it ships
 *                     at: `[{ code, rings }]`
 * @param finestOthers every OTHER ISO code the coverage-only index carries, at the finest scale of
 *                     the pinned family that carries it: `[{ code, rings }]`
 * @param opts         `{ filter1, filter2a, filter2b }` — all default true; false *removes* that
 *                     filter
 * @throws when `filter2b` is enabled and `finestOthers` is absent or empty. An accidentally-empty
 *         finest population is R23-1 exactly, and it must not be reachable by forgetting an
 *         argument (A-28 Part 7).
 * @returns `{ kept: number[], drops: [{ index, filter, code, against }] }` — `kept` and
 *          `drops[].index` are indices into `candidates`, so the caller keeps whatever it carries
 *          alongside a ring (its raw, unquantised twin, for one). `filter` stays `1 | 2`;
 *          `against` is `'coverage' | 'finest' | null` and names the arm.
 */
export function forgivenessFor(candidates, own, others, finestOthers, opts = {}) {
  const filter1 = opts.filter1 !== false;
  const filter2a = opts.filter2a !== false;
  const filter2b = opts.filter2b !== false;
  if (filter2b && (!finestOthers || finestOthers.length === 0)) {
    throw new Error(
      'forgivenessFor: arm 2b is enabled but the finest population is empty. An empty one admits ' +
        'every ring it sees, which is QA R23-1 exactly — pass the other codes at the pinned ' +
        "family's finest scale, or disable filter2b deliberately (ARCHITECTURE §8.4 A-28 Part 7).",
    );
  }
  const ownSet = prepSet(own);
  const coverageSets = filter2a ? others.map((e) => ({ code: e.code, set: prepSet(e.rings) })) : [];
  const finestSets = filter2b ? finestOthers.map((e) => ({ code: e.code, set: prepSet(e.rings) })) : [];

  const kept = [];
  const drops = [];
  for (let i = 0; i < candidates.length; i++) {
    const R = prepRing(candidates[i]);
    // Filter 1 — it must be the same place.
    if (filter1 && !overlaps(R, ownSet)) {
      drops.push({ index: i, filter: 1, code: null, against: null });
      continue;
    }
    // Filter 2 — forgiveness may not be taken from a neighbour, and the arms run in this order.
    let taken = null;
    let against = null;
    for (const [arm, sets] of [
      ['coverage', coverageSets],
      ['finest', finestSets],
    ]) {
      for (const o of sets) {
        if (overlaps(R, o.set)) {
          taken = o.code;
          against = arm;
          break;
        }
      }
      if (taken !== null) break;
    }
    if (taken !== null) {
      drops.push({ index: i, filter: 2, code: taken, against });
      continue;
    }
    kept.push(i);
  }
  return { kept, drops };
}
