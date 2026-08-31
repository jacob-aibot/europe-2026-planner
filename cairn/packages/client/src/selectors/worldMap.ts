/**
 * The lifetime map's frame — ARCHITECTURE §4.4 **A-40** Part 3, ROADMAP Phase 2 **I-8a**.
 *
 * **This is not a port.** A-40 Part 2: a port abstracts a platform capability the shared
 * layer cannot express, and *"draw a filled path from an SVG `d` string"* is not one — it is
 * a string, and a web `<svg>` and `react-native-svg`'s `<Path d>` consume the same one. So
 * the world map is a plain component over this pure function, and **everything geometric
 * happens here**: the renderer contains no arithmetic over coordinates at all.
 *
 * That split is also what makes CLAUDE.md's *"never fit a hidden container"* bug **absent**
 * rather than re-solved (A-40 Part 4). Leaflet's bug is a *measurement* bug — a zoom computed
 * from a 0×0 container is nonsense and is cached. A `viewBox` is not measured; the browser
 * maps it onto whatever box the element has, at paint, every time. Nothing in this file or in
 * `WorldMap.tsx` reads layout, so there is no measurement to take at the wrong moment. The
 * ceiling that keeps it that way (W1: no `getBoundingClientRect`, `offsetWidth`,
 * `offsetHeight` or `ResizeObserver` in the renderer) is asserted in `test/views.test.ts`.
 *
 * The other inherited bug — *"cluster before fitting"*, with a min-span guard — is inherited
 * literally: the extent comes from core's own `mapBounds`, the same function the day map fits
 * with, and `MIN_SPAN_KM` comes with it. §4.4's *"the client never computes bounds"* is
 * honoured as written; there is no second bounds implementation and no second guard.
 *
 * Zero dependencies, no DOM, no React, no ambient clock. `node --test`-able with no browser.
 */
import * as core from '../deps.ts';
import type { CountryCode } from '../deps.ts';

export type WorldMapCountry = {
  code: CountryCode;
  /** SVG path data in the frame's own coordinate space. Renderer-agnostic: a string. */
  d: string;
  /** §8.4 A-34. Rendered visibly differently, and never in the confirmed fill. */
  provisional: boolean;
  /** Canonical row order, straight from `TravelStatsCountry`. Drives "tap a country for its trips". */
  tripIds: string[];
};

export type WorldMapFrame = {
  /** `"minX minY width height"`. The ONLY fit mechanism — A-40 Part 4. */
  viewBox: string;
  countries: WorldMapCountry[];
  /** Core's own `MapBounds`, carried so the surface can say "zoomed out to a readable minimum". */
  bounds: core.MapBounds;
  /** Codes `travelStats` named that the shipped index cannot fill. Rendered as a stated hole. */
  missing: CountryCode[];
};

/**
 * The whole world, used only when there is nothing to fit.
 *
 * `mapBounds([])` returns `empty: true` with a zeroed box and its own docstring says callers
 * *"must not fit"* — a `viewBox` of `0 0 0 0` has zero area and paints nothing. A constant
 * frame is not a bounds computation (there is no input to compute from), and *"the whole
 * world"* is the honest answer to *"show me everywhere I have been"* when the answer is
 * nowhere: the map is still a map, and the surface says the rest in words.
 */
const WHOLE_WORLD = '-180 -90 360 180';

/**
 * Trims floating-point noise off a frame coordinate. Four decimal places is ≈11 m at the
 * equator, which is finer than the coarsest polygons in the shipped index by three orders of
 * magnitude.
 *
 * This rounds the **frame**, never the geometry: `d` carries each ring's numbers verbatim.
 * A-40 Part 5 forbids hand-simplifying geometry — *"a simplifier is the second geometry
 * implementation this ruling exists to prevent"* — and a `viewBox` is a frame, not geometry.
 * Without it `east - west` prints as `7.000000000000001` and the string the renderer paints
 * cannot be compared to the string this function returned. Pure.
 */
function frameNum(n: number): string {
  const r = Math.round(n * 1e4) / 1e4;
  return Object.is(r, -0) ? '0' : String(r);
}

/**
 * One ring, flattened `[lng, lat, …]`, as one closed SVG subpath.
 *
 * The projection, in one place: `x = lng`, `y = -lat`, no scaling constant (A-40 clause 1).
 * Negating the latitude is what puts north at the top, because SVG's y axis grows downward.
 * Coordinates are emitted verbatim — no rounding, no simplification. Pure.
 */
function subpath(ring: core.CountryRing): string {
  let out = '';
  for (let i = 0; i + 1 < ring.length; i += 2) {
    const x = ring[i];
    const y = ring[i + 1] === 0 ? 0 : -ring[i + 1];
    out += `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }
  return out === '' ? '' : `${out}Z`;
}

/**
 * The lifetime map's whole frame: one path per visited country, a `viewBox` that fits them,
 * and the list of codes this index could not draw.
 *
 * **Pure. Never throws**, including for a code that is not in the index and for a code that
 * is not a plausible ISO code at all: §8.4 A-29's acceptance gate runs at the *mint* and a
 * stored row is not revalidated (A-37), so a row minted against a different index can name a
 * code this one cannot fill. A-40 clause 3 says what happens then — the code goes into
 * `missing` and is stated on screen, because silently omitting it makes the map disagree with
 * the Profile's count. `travelStats` itself is the throwing boundary and the client catches
 * it in `travelHistory`, one layer up; by the time a `TravelStats` exists there is nothing
 * left here to refuse.
 *
 * **No memoisation** (A-40 clause 4, §4.2 rule 3, §2.2b F2): the frame is recomputed from the
 * library or cached by object identity by the caller, never keyed on a revision counter.
 *
 * @param stats what `core.travelStats` derived from the library — never a document.
 * @param index the bundled country index, or a test fixture; an argument, never a global.
 */
export function worldMapFrame(stats: core.TravelStats, index: core.CountryIndex): WorldMapFrame {
  const countries: WorldMapCountry[] = [];
  const missing: CountryCode[] = [];
  const corners: Array<{ lat: number; lng: number }> = [];

  for (const row of stats.countries) {
    // A code may carry more than one entry (§8.4 A-27's union), and both are the same
    // country: one row, one `d`, every ring.
    const entries = index.countries.filter((c) => c.code === row.code);
    if (entries.length === 0) {
      missing.push(row.code);
      continue;
    }
    let d = '';
    for (const entry of entries) {
      for (const ring of entry.rings) d += subpath(ring);
      const [minLng, minLat, maxLng, maxLat] = entry.box;
      corners.push(
        { lat: minLat, lng: minLng }, { lat: minLat, lng: maxLng },
        { lat: maxLat, lng: maxLng }, { lat: maxLat, lng: minLng },
      );
    }
    countries.push({ code: row.code, d, provisional: row.provisional, tripIds: row.tripIds });
  }

  // §4.4, literally: the client never computes bounds. `mapBounds` brings `MIN_SPAN_KM` and
  // the `clamped` flag with it, which is how "a one-country history must not open at a
  // rooftop zoom" is satisfied — by the guard that already exists, not by a second one.
  const bounds = core.mapBounds(corners);
  const viewBox = bounds.empty
    ? WHOLE_WORLD
    : `${frameNum(bounds.west)} ${frameNum(-bounds.north)} ` +
      `${frameNum(bounds.east - bounds.west)} ${frameNum(bounds.north - bounds.south)}`;

  return { viewBox, countries, bounds, missing };
}
