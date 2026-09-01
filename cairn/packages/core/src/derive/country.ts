/**
 * `countryOf` — attributing a coordinate to a country, on-device, from a bundled dataset
 * (ARCHITECTURE §8.4 clause 1).
 *
 * ```ts
 * countryOf(at: LatLng, index: CountryIndex): CountryCode | null    // pure; index injected
 * ```
 *
 * **Why there is no network in here, in any phase.** Sending a coordinate to a geocoding service
 * *is* transmitting a location, which §6.1 forbids; and the free public Nominatim service's usage
 * policy forbids systematic reverse queries independently of that. §8.4 settles it: the index is
 * generated once at build time into a committed module and the lookup is local. There is no
 * fallback path, no "if the index misses, ask someone" — a miss is `null`.
 *
 * **`null` is a first-class answer and is never widened into a guess.** A coordinate the rings do
 * not contain — mid-ocean, an island the scale dropped, a disputed area with no ISO code, a typed
 * digit that is wrong — comes back unattributed. §8.4: *"It is never snapped to the nearest
 * country … a system that guesses a country is a system whose lifetime map is quietly wrong, and
 * a wrong map is worse than an honest hole."* This is §2.7's rule about `unknown` in a different
 * costume, and it is why this file contains no distance function at all: there is nothing here
 * for a "nearest" to be computed from, so the shortcut cannot be taken by accident later.
 *
 * **Three edge behaviours, stated rather than discovered:**
 *
 *  - **No antimeridian wrapping.** Admin-0 rings are clipped at ±180°, so a country that straddles
 *    the line arrives as two polygons and the ray cast never needs to cross it. The ray is cast
 *    towards +∞ longitude and is unbounded; the entry's bounding box is a *point* reject applied
 *    before the cast, never a clip on the ray. A point at lng −179.5 is tested against the rings
 *    that live at negative longitudes, which is where its half of the country is.
 *  - **The poles are not special-cased.** They are ordinary coordinates and get whatever answer
 *    the rings give — which for the north pole is `null`, there being no admin-0 polygon over the
 *    Arctic Ocean. `countryOf` does not know that; it just counts crossings.
 *  - **A point exactly on a boundary is arbitrary but deterministic.** The half-open crossing
 *    test (`(yi > lat) !== (yj > lat)`) gives one consistent answer per coordinate on every run
 *    and every machine, which is the property goldens need. It does not give the "right" one,
 *    because on a shared border there isn't one.
 *
 * **`countryKeyPoint` joins this file at §4.4 A-48 and the guard above is extended, not
 * weakened.** A key point is a *label for a country* — *"where is this country, for the purpose
 * of drawing it"* — and may never answer *"which country is this coordinate in"*. That is
 * `countryOf`, whose `null` stays first-class. There is still **no distance function in this
 * file**: nothing here may snap a coordinate to the nearest key, and the ring-area helper is
 * module-private so a caller that can measure a ring cannot grow a second geometry engine.
 *
 * **`countryParts` joins at §4.4 A-49 Part 9 on exactly the same terms.** A part is a *label
 * for a country's geometry* — *"which pieces is this country in, and where is each"* — and is
 * never an answer about a coordinate either. The guard is unchanged in every clause: the
 * ring-area helper stays module-private, and the linkage is `clusterPoints`', imported from
 * `derive/cluster.ts`, so **no distance function enters this file** even now that a
 * connected-components question is asked in it.
 */
import type { CountryCode } from '../model/ids.ts';
import type { LatLng } from '../model/types.ts';
import type { CountryIndex, CountryBox, CountryRing } from '../geo/countryIndex.ts';
import { inRange } from './geo.ts';
import { clusterPoints } from './cluster.ts';

/**
 * Even-odd crossing count for one flat ring. Casts a ray towards +∞ longitude from `(lng, lat)`
 * and returns true for an odd number of crossings.
 */
function crossesOdd(lng: number, lat: number, ring: CountryRing): boolean {
  let inside = false;
  const n = ring.length;
  if (n < 6) return false; // fewer than three points is not a polygon
  let jx = ring[n - 2];
  let jy = ring[n - 1];
  for (let i = 0; i + 1 < n; i += 2) {
    const ix = ring[i];
    const iy = ring[i + 1];
    if (iy > lat !== jy > lat) {
      const x = ((jx - ix) * (lat - iy)) / (jy - iy) + ix;
      if (lng < x) inside = !inside;
    }
    jx = ix;
    jy = iy;
  }
  return inside;
}

/**
 * The country whose rings contain `at`, or `null`.
 *
 * Pure: the index is injected, nothing is read from disk or the network, and the same
 * `(at, index)` always yields the same answer. Entries are tested in the index's own order, which
 * `countryIndex` **preserves** exactly as the committed artefact emits it — ascending polygon
 * area, ties by ISO code (§8.4 A-26 Part 4) — so an overlap in the data resolves the same way on
 * every machine and every run. An ISO code may appear on **more than one entry** (§8.4 A-27): the
 * first entry containing the point wins, and same-code entries carry the same answer, so which
 * one wins is not observable.
 */
export function countryOf(at: LatLng, index: CountryIndex): CountryCode | null {
  // §2.9 A-21's read-once rule: `at` is caller-supplied, so each field is read exactly once and
  // the values that were range-checked are the values the ray cast uses. `inRange` stays the one
  // implementation of "is this a legal coordinate" (§2.13) — it is handed the snapshot, not the
  // caller's object, so it cannot observe a different number than the loop below does.
  const lat = at.lat;
  const lng = at.lng;
  if (!inRange({ lat, lng })) return null;
  for (const country of index.countries) {
    const box = country.box;
    if (lng < box[0] || lng > box[2] || lat < box[1] || lat > box[3]) continue;
    let inside = false;
    for (const ring of country.rings) if (crossesOdd(lng, lat, ring)) inside = !inside;
    if (inside) return country.code;
  }
  return null;
}

/** Mean Earth radius, km — the only constant the area helper needs. */
const EARTH_R_KM = 6371;
const DEG = Math.PI / 180;

/**
 * Absolute spherical area of one closed flat ring, in km². Module-private (§2.10: a caller
 * that can measure a ring is a caller that will grow a second geometry engine).
 *
 * The standard closed-form polygon area on a sphere,
 * `|R²/2 · Σᵢ (λᵢ₊₁ − λᵢ)(2 + sin φᵢ + sin φᵢ₊₁)|` — one pass, no iteration. Absolute, so
 * winding order is not trusted: a hole comes back positive and simply loses to the outer ring
 * that contains it, which is A-26 Part 4's *"an enclave is always smaller than the thing
 * enclosing it"* one level down.
 *
 * **It is correct here because admin-0 rings are clipped at ±180°** — the same fact
 * `crossesOdd` above already rests on — so no edge crosses the antimeridian. If the index ever
 * ships unclipped rings, §4.4 A-48 C2′ reopens with this function.
 */
function ringAreaKm2(ring: CountryRing): number {
  const n = ring.length;
  if (n < 6) return 0; // fewer than three points is not a polygon
  let sum = 0;
  for (let i = 0; i + 1 < n; i += 2) {
    const j = (i + 2) % n; // the ring is closed implicitly; the last edge wraps to vertex 0
    sum += (ring[j] - ring[i]) * DEG * (2 + Math.sin(ring[i + 1] * DEG) + Math.sin(ring[j + 1] * DEG));
  }
  return Math.abs((sum * EARTH_R_KM * EARTH_R_KM) / 2);
}

/**
 * **D — a ring is *drawable* iff its length is even, at least 2, and every element is a finite
 * number** (§4.4 **A-54** Part 2, QA R39-1/R39-2). Module-private, like the area helper.
 *
 * No other test, and in particular **no minimum vertex count**: A-52's principle stands — a ring
 * the index carries is a ring the frame draws — and a 1- or 2-point ring has real vertices that
 * belong in its part's `box` and in its `d`. What D excludes is a ring that is not geometry at
 * all: no coordinate pair, a half pair, or a coordinate that is not a number.
 */
function drawableRing(ring: CountryRing): boolean {
  const n = ring.length;
  if (n < 2 || n % 2 !== 0) return false;
  for (let i = 0; i < n; i++) if (!Number.isFinite(ring[i])) return false;
  return true;
}

/**
 * Every ring the index carries for `code`, in index order (entry order, then ring order), or
 * `null` when **this index has no wholly drawable geometry for this code** — §4.4 **A-54** Part 2.
 *
 * `null` covers exactly three shapes, and they are one answer rather than three: the code has no
 * entry, it has no ring, or **any** of its rings fails **D**. That last clause is *all-or-stated*
 * and it is a judgement rather than a mechanism: a code with *some* drawable rings is **not**
 * drawn from the good ones, because drawing a country minus a ring is R38-5's finding — the lost
 * vertex ends up outside the frame it was dropped from and nothing on screen hints at it — and
 * A-40 clause 3 prefers a stated hole to a silent one. It also keeps **I11** exactly as written:
 * for every *drawn* code the emitted ring multiset is the index's ring set for that code, with no
 * *"except the ones we skipped"* clause.
 *
 * **Why this lives here and not in `tools/gen-countries.mjs`.** `countryParts` and
 * `countryKeyPoint` are public exports (§2.10) taking an **injected** index. A-52 rested their
 * safety on the generator's `< 6` filter, which is true of today's artefact and is not a property
 * of either function: on an injected index whose only ring for a code is `[]` or `[7]`, `ringBox`
 * returned `[Infinity, Infinity, -Infinity, -Infinity]` and the frame emitted
 * `viewBox: "NaN NaN NaN NaN"`, `aspect: NaN`, `d: ""` and `missing: []` — a blank map, no error,
 * nothing stated. The generator's filter is not the guarantee; **D is** (A-54 Part 7 residue 13
 * keeps both, deliberately).
 *
 * Called by **both** public functions, so **I12**'s biconditional —
 * `countryParts(…) === []` ⇔ `countryKeyPoint(…) === null` — is true by construction rather than
 * by two implementations agreeing.
 */
function drawableRingsOf(code: CountryCode, index: CountryIndex): CountryRing[] | null {
  const rings: CountryRing[] = [];
  for (const entry of index.countries) {
    if (entry.code !== code) continue;
    for (const ring of entry.rings) {
      if (!drawableRing(ring)) return null;
      rings.push(ring);
    }
  }
  return rings.length === 0 ? null : rings;
}

/**
 * Where a country *is*, as one point: the bounding-box centre of its **principal ring** —
 * §4.4 **A-48** C2′.
 *
 * Pure; the index is injected; `null` for a code the index does not carry, which is the same
 * first-class `null` `countryOf` gives and is never widened into a guess.
 *
 * The principal ring is the ring of greatest absolute spherical area across **every entry**
 * carrying the code (§8.4 A-27 allows a code two entries; they are one country), ties broken by
 * index order — entry order, then ring order. One point per **code**: per-entry or per-ring
 * points would let an archipelago outvote a continent, which is A-41 C2's argument and is why
 * C2′ narrows to one ring rather than widening to many points.
 *
 * **Why not the union of the code's boxes** (A-41 C2, superseded): that is a point about a
 * *rectangle*, and a rectangle inflated by a distant secondary territory is not where the
 * country is. Measured at QA R36-1: `FR`'s union-box key lands 2,633 km out in the Atlantic and
 * inverts near and far (FR–MA 1,339 km against FR–CZ 4,137 km). Under C2′ the worst key point
 * in the shipped index is 203 km from its own country (`NO`), against 16,598 km (`KI`).
 *
 * **§4.4 A-54 Part 2 (QA R39-2) withdraws the union-box fallback and the `ring.length < 6`
 * filter that made it reachable.** `null` now means exactly one thing — **D** says this index has
 * no wholly drawable geometry for this code — and that is the same condition `countryParts`
 * answers `[]` to, which is what makes **I12**'s biconditional true in both directions for the
 * first time. Two reasons, and the first is the ruling one:
 *
 *  - **A box centre is not a point of the country.** The centre of a union of entry boxes is a
 *    point about a *rectangle*, which is exactly what C2′ superseded A-41 C2 for, and **I8** —
 *    *every key point lies within the bounding box of its own principal ring* — is the invariant
 *    that says a fallback cannot honour it. R37-5's non-finite guard on that fallback goes with
 *    it, unreachable.
 *  - **The `< 6` filter was an inconsistency, not a rule.** A-52 removed it from `countryParts`
 *    and left it here, so a 2-point ring made the principal part's `key` `{5.5, 5.5}` while this
 *    function answered the union box's `{0, 0}` — I12 broken on an index A-52 itself admits
 *    (R39-2). D replaces it, and D has no minimum vertex count.
 */
export function countryKeyPoint(code: CountryCode, index: CountryIndex): LatLng | null {
  const rings = drawableRingsOf(code, index);
  if (rings === null) return null;

  let principal = rings[0];
  let principalArea = ringAreaKm2(rings[0]);
  for (let i = 1; i < rings.length; i++) {
    const area = ringAreaKm2(rings[i]);
    // Strictly greater, so a tie keeps the earlier ring — index order, as C2′ specifies.
    if (area > principalArea) { principalArea = area; principal = rings[i]; }
  }

  let rw = Infinity, rs = Infinity, re = -Infinity, rn = -Infinity;
  for (let i = 0; i + 1 < principal.length; i += 2) {
    const lng = principal[i];
    const lat = principal[i + 1];
    if (lng < rw) rw = lng;
    if (lng > re) re = lng;
    if (lat < rs) rs = lat;
    if (lat > rn) rn = lat;
  }
  return { lat: (rs + rn) / 2, lng: (rw + re) / 2 };
}

/**
 * One landmass of a country — §4.4 **A-49** Part 2.
 *
 * A country is not one shape and it is not one rectangle either. It is a set of **parts**, and
 * a part is what a frame can honestly be drawn around.
 */
export type CountryPart = {
  /** `[minLng, minLat, maxLng, maxLat]` over this part's rings. Derived, never hand-written. */
  box: CountryBox;
  /** The box centre of this part's greatest-absolute-spherical-area ring; ties by index order. */
  key: LatLng;
  /** This part's rings, in index order (entry order, then ring order). */
  rings: readonly CountryRing[];
  /** The part holding the code's greatest-area ring. Exactly one part per code carries it. */
  principal: boolean;
};

/** The bounding box of one flat `[lng, lat, …]` ring. Module-private, like the area helper. */
function ringBox(ring: CountryRing): CountryBox {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    const lng = ring[i];
    const lat = ring[i + 1];
    if (lng < w) w = lng;
    if (lng > e) e = lng;
    if (lat < s) s = lat;
    if (lat > n) n = lat;
  }
  return [w, s, e, n];
}

/**
 * The **parts** of a country: the connected components of its own rings — §4.4 **A-49** Part 2.
 *
 * Pure; the index and the threshold are both injected. **`[]` iff this index has no wholly
 * drawable geometry for the code** — §4.4 **A-54** Part 2's biconditional, which replaces A-52's
 * *"`[]` iff the index carries no ring at all"*. `[]` therefore covers exactly three shapes and
 * they are one answer: no entry, no ring, or **any** ring that fails **D** (even length, ≥ 2,
 * every element finite). It is the same condition `countryKeyPoint`'s `null` has — both call the
 * same private gather — so a caller treats `[]` as *"the index cannot fill this code"*: stated as
 * unfillable, never dropped (A-40 clause 3), and `worldMapFrame`'s `missing` test therefore has
 * one answer rather than two. **A-52 clause 1 is superseded**: its stated justification for
 * removing the length filter — *"a degenerate ring … contributes its own points to its part's
 * `box`"* — is false for a ring that has no points, and the safety of a public export taking an
 * injected index may not rest on what `tools/gen-countries.mjs` happens to emit.
 *
 * **The rule, and it is the one A-48 already introduced, generalised.** A-48 ruled that a
 * country's *position* is a property of its principal landmass rather than of its bounding
 * rectangle. A-49 is that one level up: a country's *geometry* is a set of landmasses, and both
 * *"which countries share a pane"* and *"what rectangle does that pane look through"* are
 * answered by single linkage at the same threshold over the same kind of point. Nothing here
 * reads which country a code is; there is no list, no carve-out and no second constant. QA
 * R37-1 is what happens without it: C2′ decided clustering from France's principal ring while
 * the extent still fitted the union of every entry box, so a pane that knew France was in
 * France framed French Guiana anyway — 81.1° × 49.1° at 1.95% land.
 *
 * Take every ring of every entry carrying the code (§8.4 A-27 allows two entries; they are one
 * country), give each the centre of its own bounding box, and take
 * `clusterPoints`' connected components of those centres. **That is the one kernel** (A-41
 * Part 6, A-48 C3′) — not a second implementation, and the reason there is still no distance
 * function in this file.
 *
 * Parts come back in ascending order of their lowest ring position in the index, which is
 * `clusterPoints`' own output convention rather than a sort of ours.
 *
 * **I12, which is the load-bearing property:** the principal part's `key` **is**
 * `countryKeyPoint(code, index)`, on both fields under `Object.is`, at every threshold — the
 * greatest-area ring of a country is the greatest-area ring of its own part. Verified over all
 * 239 shipped codes at `t ∈ {1, 100, 1000, 4000, 20000}` km: 0 mismatches. That identity is
 * what makes A-48's C2′, I8, C4′ and every pane's *membership* untouched by A-49 rather than
 * merely believed untouched.
 *
 * @param thresholdKm framing policy, so it is an argument: the threshold lives in
 *   `packages/client` (A-41 C4), and this function owns no constant of its own.
 */
export function countryParts(
  code: CountryCode,
  index: CountryIndex,
  thresholdKm: number,
): CountryPart[] {
  // Index order: entry order, then ring order. **A-52 (QA R38-5): EVERY ring, with no length
  // filter** — a ring the index carries is a ring the frame draws, because the `ring.length >= 6`
  // filter that used to be here dropped a degenerate ring from `d` AND from its part's `box`, so
  // the lost vertex ended up outside the frame it was dropped from and nothing on screen hinted
  // at it. A degenerate ring has zero spherical area, so the strict `>` below already keeps the
  // earlier ring and such a ring can never be principal.
  //
  // **A-54 Part 2 (QA R39-1) adds the one test A-52 left to a build tool: D.** Every ring the
  // gather returns is drawable, so every `ringBox` below is finite in all four components — which
  // is the property this function's callers already assume and the frame had no way to check.
  const rings = drawableRingsOf(code, index);
  if (rings === null) return [];

  const boxes = rings.map(ringBox);
  const points = boxes.map((b) => ({ lat: (b[1] + b[3]) / 2, lng: (b[0] + b[2]) / 2 }));
  const areas = rings.map(ringAreaKm2);

  // The code's principal ring — C2′'s own rule, strictly greater so a tie keeps the earlier.
  let principalRing = 0;
  for (let i = 1; i < rings.length; i++) if (areas[i] > areas[principalRing]) principalRing = i;

  return clusterPoints(points, thresholdKm).map((group) => {
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    let key = group[0];
    for (const i of group) {
      const b = boxes[i];
      if (b[0] < w) w = b[0];
      if (b[1] < s) s = b[1];
      if (b[2] > e) e = b[2];
      if (b[3] > n) n = b[3];
      if (areas[i] > areas[key]) key = i;
    }
    return {
      box: [w, s, e, n] as CountryBox,
      key: points[key],
      rings: group.map((i) => rings[i]),
      principal: group.includes(principalRing),
    };
  });
}
