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
 *    towards +∞ longitude and stops at the box; a point at lng −179.5 is tested against the rings
 *    that live at negative longitudes, which is where its half of the country is.
 *  - **The poles are not special-cased.** They are ordinary coordinates and get whatever answer
 *    the rings give — which for the north pole is `null`, there being no admin-0 polygon over the
 *    Arctic Ocean. `countryOf` does not know that; it just counts crossings.
 *  - **A point exactly on a boundary is arbitrary but deterministic.** The half-open crossing
 *    test (`(yi > lat) !== (yj > lat)`) gives one consistent answer per coordinate on every run
 *    and every machine, which is the property goldens need. It does not give the "right" one,
 *    because on a shared border there isn't one.
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
 * `(at, index)` always yields the same answer. Countries are tested in the index's own order,
 * which `countryIndex` fixes as ascending ISO code, so an overlap in the data resolves the same
 * way everywhere.
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
