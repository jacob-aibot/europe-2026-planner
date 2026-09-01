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
 */
import type { CountryCode } from '../model/ids.ts';
import type { LatLng } from '../model/types.ts';
import type { CountryIndex, CountryRing } from '../geo/countryIndex.ts';
import { inRange } from './geo.ts';

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
 * The union-box centre survives only as the **fallback** for a code carrying no ring of three
 * points, so the function is total on any index. It fires on **zero** of the 239 shipped codes.
 */
export function countryKeyPoint(code: CountryCode, index: CountryIndex): LatLng | null {
  let principal: CountryRing | null = null;
  let principalArea = -1;
  let seen = false;
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;

  for (const entry of index.countries) {
    if (entry.code !== code) continue;
    seen = true;
    const box = entry.box;
    if (box[0] < west) west = box[0];
    if (box[1] < south) south = box[1];
    if (box[2] > east) east = box[2];
    if (box[3] > north) north = box[3];
    for (const ring of entry.rings) {
      if (ring.length < 6) continue;
      const area = ringAreaKm2(ring);
      // Strictly greater, so a tie keeps the earlier ring — index order, as C2′ specifies.
      if (area > principalArea) { principalArea = area; principal = ring; }
    }
  }

  if (!seen) return null;
  if (principal === null) return { lat: (south + north) / 2, lng: (west + east) / 2 };

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
