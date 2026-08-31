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
 * The other inherited bug — *"cluster before fitting"* — is inherited literally, and at
 * **I-8d** it becomes the whole shape of this file (§4.4 **A-41**, the atlas frame). The
 * partition is core's own `clusterPoints`, the same single-linkage first-fit kernel the day
 * map clusters with; each pane's extent is core's own `mapBounds`, the same function the day
 * map fits with. §4.4's *"the client never computes bounds"* is honoured as written: there is
 * no second bounds implementation, no second clustering loop and no second guard. What this
 * file adds on top of core is exactly three things, all of them framing policy —
 * `WORLD_CLUSTER_THRESHOLD_KM`, the dominance/ranking rule, and `FRAME_PAD_FRACTION`.
 *
 * `MIN_SPAN_KM` still arrives with `mapBounds`, but **A-42** withdrew the claim A-40 made
 * about it: on this surface it is a **degeneracy guard** — it is what stops `mapBounds`
 * returning a zero-area box, which is what makes the padding term and `preserveAspectRatio`
 * well defined for a single-country pane — and **not** a legibility guard. Exactly one code
 * in 239 (`VA`) reaches it, at 1.2 km, which is itself a rooftop window. The guarantee this
 * surface actually makes is A-42 (b): every pane's `viewBox` has positive area and strictly
 * contains every vertex it draws, on all four sides.
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
  /**
   * The pane this country is drawn in — **A-41 Part 5 / W3**. The renderer selects a pane's
   * countries by `country.paneId === pane.id` and by nothing else: no arithmetic, no
   * re-measurement. Every drawn country has exactly one, always (I2).
   */
  paneId: string;
};

/**
 * One frame of the atlas — ARCHITECTURE §4.4 **A-41** Part 5.
 *
 * A pane is a rectangle to look through, plus the list of countries seen through it. There
 * are at most three (C7): the primary, and up to two insets, the last of which is the union
 * of every remaining cluster. Placement and size on screen are CSS; nothing here is a pixel.
 */
export type WorldMapPane = {
  /** `'main' | 'inset-1' | 'inset-2'`. Positional, stable, deterministic. */
  id: string;
  role: 'main' | 'inset';
  /** `"minX minY width height"`, padded per A-41 Part 4. The ONLY fit mechanism. */
  viewBox: string;
  /** Core's own `MapBounds` for this pane's countries, UNpadded. */
  bounds: core.MapBounds;
  /** The codes drawn in this pane, in canonical row order. The pane's caption is written from these. */
  codes: CountryCode[];
  /** Σ `tripIds.length` over `codes` — the weight C6 ranked by, so the surface never re-derives it. */
  weight: number;
};

export type WorldMapFrame = {
  /** `=== panes[0].viewBox`. Kept so the existing consumer and its byte-identity test keep their meaning. */
  viewBox: string;
  countries: WorldMapCountry[];
  /** `=== panes[0].bounds`. Core's own `MapBounds` — `clamped` included, and nothing renders it (A-42 (c)). */
  bounds: core.MapBounds;
  /** 1…3 entries; `panes[0].role === 'main'`; the rest are insets in C6 order. */
  panes: WorldMapPane[];
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
 * **A-41 C4.** Two key points closer than this are the same geographic cluster.
 *
 * It lives here rather than in `packages/core` on purpose: **core owns the algorithm
 * (`clusterPoints`), the frame owns the policy.** The value is measured, not taste — on the
 * shipped index the nearest inter-continental key-point pair I could find is US–IS at
 * 5,998 km, so 4,000 km sits with a ≥1.5× margin on the split side, while merging every
 * European set measured (`PT/ES/FR/DE/PL/FI/GR/IS/TR` → 1, `AT/CZ/DE/GB/HR/HU` → 1) and
 * North America (`US/CA/MX` → 1) into one cluster each.
 *
 * It is a **presentation** constant: changing it changes no stored byte, no attribution, no
 * count, and no test of what a trip *is*.
 */
export const WORLD_CLUSTER_THRESHOLD_KM = 4000;

/**
 * **A-41 Part 4.** Each pane's `viewBox` is its `bounds` expanded on all four sides by this
 * fraction of the pane's own longer side.
 *
 * This is not a bounds computation and does not go in core: `mapBounds` answers *where the
 * countries are*, the frame answers *what rectangle to look through*. `mapBounds` gains no
 * padding concept, so the day map is untouched by it.
 *
 * It answers QA R33-6 — the shipped inset between `bounds.east` and the easternmost drawn
 * vertex was exactly **0.000000**, so with `overflow: hidden` and a non-scaling stroke the
 * outer half of the extreme country's stroke was clipped. A-42 (b) turns that into the
 * guarantee this surface actually makes: every pane strictly contains what it draws.
 *
 * No floor constant is needed beside it: `mapBounds` never returns a zero-area box for a
 * non-empty input (it widens about the centre to `MIN_SPAN_KM`), so `max(w, h) > 0` for every
 * pane that exists, and the empty case is `WHOLE_WORLD`, which is not padded.
 */
const FRAME_PAD_FRACTION = 0.02;

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
 * One pane's rectangle: its `bounds`, expanded on all four sides by `FRAME_PAD_FRACTION` of
 * its own longer side (A-41 Part 4). Pure.
 *
 * The empty box is the one case that is not padded — there is nothing to contain, and A-40's
 * `WHOLE_WORLD` constant is the honest answer to *"show me everywhere I have been"* when the
 * answer is nowhere (A-41 I7).
 */
function paneViewBox(bounds: core.MapBounds): string {
  if (bounds.empty) return WHOLE_WORLD;
  const w = bounds.east - bounds.west;
  const h = bounds.north - bounds.south;
  const pad = FRAME_PAD_FRACTION * Math.max(w, h);
  return `${frameNum(bounds.west - pad)} ${frameNum(-(bounds.north + pad))} ` +
    `${frameNum(w + 2 * pad)} ${frameNum(h + 2 * pad)}`;
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
  // ---- C1: the population. Canonical row order, minus the codes the index cannot fill. ----
  type Drawn = {
    code: CountryCode;
    d: string;
    provisional: boolean;
    tripIds: string[];
    /** The four corners of every entry's box — what `mapBounds` fits (C8). */
    corners: Array<{ lat: number; lng: number }>;
    /** C2: ONE key point per code, the centre of the union of its entries' boxes. */
    key: { lat: number; lng: number };
  };
  const drawn: Drawn[] = [];
  const missing: CountryCode[] = [];

  for (const row of stats.countries) {
    // A code may carry more than one entry (§8.4 A-27's union), and both are the same
    // country: one row, one `d`, every ring, and — C2 — one key point.
    const entries = index.countries.filter((c) => c.code === row.code);
    if (entries.length === 0) {
      missing.push(row.code);
      continue;
    }
    let d = '';
    const corners: Array<{ lat: number; lng: number }> = [];
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    for (const entry of entries) {
      for (const ring of entry.rings) d += subpath(ring);
      const [minLng, minLat, maxLng, maxLat] = entry.box;
      corners.push(
        { lat: minLat, lng: minLng }, { lat: minLat, lng: maxLng },
        { lat: maxLat, lng: maxLng }, { lat: maxLat, lng: minLng },
      );
      west = Math.min(west, minLng); east = Math.max(east, maxLng);
      south = Math.min(south, minLat); north = Math.max(north, maxLat);
    }
    // C2, in one line: the box centre of the UNION. Not per entry, not per ring — a country
    // is one thing on this map, and per-ring points would let an archipelago outvote a
    // continent.
    drawn.push({
      code: row.code,
      d,
      provisional: row.provisional,
      tripIds: row.tripIds,
      corners,
      key: { lat: (south + north) / 2, lng: (west + east) / 2 },
    });
  }

  // ---- C3/C4: the partition. Core owns the algorithm; this file owns the threshold. ----
  const clusters = core.clusterPoints(drawn.map((x) => x.key), WORLD_CLUSTER_THRESHOLD_KM);
  const weightOf = (group: readonly number[]) => group.reduce((n, i) => n + drawn[i].tripIds.length, 0);
  const lowestCode = (group: readonly number[]) =>
    group.map((i) => drawn[i].code).reduce((a, b) => (b < a ? b : a), group.length ? drawn[group[0]].code : '');
  const totalWeight = weightOf(drawn.map((_, i) => i));

  // ---- C6: ranking — weight desc, then country count desc, then lowest ISO code asc. The
  // last key is a tie-break only and encodes nothing about any country's identity. ----
  const ranked = clusters.slice().sort((a, b) => {
    const wa = weightOf(a), wb = weightOf(b);
    if (wa !== wb) return wb - wa;
    if (a.length !== b.length) return b.length - a.length;
    const la = lowestCode(a), lb = lowestCode(b);
    return la < lb ? -1 : la > lb ? 1 : 0;
  });

  // ---- C5: the dominance test. Clusters alone never split the frame — a frame HAS a subject
  // only when one part of the history dominates it, and a genuine tie is not broken by
  // alphabet, because that would demote half a traveller's history on a coin flip. ----
  const split = ranked.length >= 2 && 2 * weightOf(ranked[0]) > totalWeight;

  // ---- C7: at most three panes, and every drawn country is in exactly one of them. The
  // third is the union of every remaining cluster, re-sorted into canonical row order. ----
  let paneGroups: number[][];
  if (!split) {
    paneGroups = [drawn.map((_, i) => i)];
  } else if (ranked.length === 2) {
    paneGroups = [ranked[0], ranked[1]];
  } else {
    paneGroups = [ranked[0], ranked[1], ranked.slice(2).flat().sort((a, b) => a - b)];
  }

  const panes: WorldMapPane[] = paneGroups.map((group, i) => {
    // C8: the extent, unchanged in mechanism — three calls where there was one, and the
    // client still computes no bounds. `mapBounds` brings `MIN_SPAN_KM` with it, which on
    // this surface is a degeneracy guard rather than a legibility one (A-42 (a)).
    const bounds = core.mapBounds(group.flatMap((k) => drawn[k].corners));
    return {
      id: i === 0 ? 'main' : `inset-${i}`,
      role: i === 0 ? 'main' : 'inset',
      viewBox: paneViewBox(bounds),
      bounds,
      codes: group.map((k) => drawn[k].code),
      weight: weightOf(group),
    };
  });

  const paneIdOf = new Array<string>(drawn.length);
  for (let i = 0; i < paneGroups.length; i++) for (const k of paneGroups[i]) paneIdOf[k] = panes[i].id;

  const countries: WorldMapCountry[] = drawn.map((x, i) => ({
    code: x.code,
    d: x.d,
    provisional: x.provisional,
    tripIds: x.tripIds,
    paneId: paneIdOf[i],
  }));

  return { viewBox: panes[0].viewBox, countries, bounds: panes[0].bounds, panes, missing };
}
