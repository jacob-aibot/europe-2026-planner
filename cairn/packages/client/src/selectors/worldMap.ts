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
 * partition is core's own `clusterPoints`, the single-linkage **connected-components** kernel
 * the day map clusters with (§4.4 **A-48** C3′ replaced the order-dependent rule it used to
 * have, after round 36 measured the row order as a second input to the answer); each pane's
 * extent is core's own `mapBounds`,
 * the same function the day map fits with; and at **I-8h** a country's own geometry arrives
 * the same way, as core's `countryParts` (§4.4 **A-49**). §4.4's *"the client never computes
 * bounds"* is honoured as written: there is no second bounds implementation, no second
 * clustering loop and no second guard. What this file adds on top of core is exactly three
 * things, all of them framing policy — `WORLD_CLUSTER_THRESHOLD_KM`, the dominance/ranking
 * rule, and `FRAME_PAD_FRACTION`.
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
  /**
   * SVG path data in the frame's own coordinate space. Renderer-agnostic: a string.
   *
   * **§4.4 A-49 Part 4: the parts of `code` drawn in THIS pane, never the whole country.** A
   * country whose geometry reaches somewhere its own pane does not frame is drawn in two rows,
   * one per pane; the rings across those rows are its full ring set, each exactly once (I11).
   */
  d: string;
  /** §8.4 A-34. Rendered visibly differently, and never in the confirmed fill. */
  provisional: boolean;
  /** Canonical row order, straight from `TravelStatsCountry`. Drives "tap a country for its trips". */
  tripIds: string[];
  /**
   * The pane this row is drawn in — **A-41 Part 5 / W3**. The renderer selects a pane's
   * countries by `country.paneId === pane.id` and by nothing else: no arithmetic, no
   * re-measurement. Within one pane a code appears exactly once (I2), so the renderer's
   * `key={c.code}` is still unique per pane.
   */
  paneId: string;
};

/**
 * One frame of the atlas — ARCHITECTURE §4.4 **A-41** Part 5.
 *
 * A pane is a rectangle to look through, plus the list of countries seen through it. There
 * are at most three **geographic** ones (C7): the primary, and up to two insets, the last of
 * which is the union of every remaining cluster — **plus the `detached` pane** when a drawn
 * country has geometry its own pane is not connected to (§4.4 **A-49** C8″/C7′), so
 * `panes.length` is 1…4. Placement and size on screen are CSS; nothing here is a pixel.
 */
export type WorldMapPane = {
  /** `'main' | 'inset-1' | 'inset-2' | 'detached'`. Positional, stable, deterministic. */
  id: string;
  /** **A-49 C8″** adds the third value, and a `'detached'` pane is always last (I5). */
  role: 'main' | 'inset' | 'detached';
  /** `"minX minY width height"`, padded per A-41 Part 4. The ONLY fit mechanism. */
  viewBox: string;
  /** Core's own `MapBounds` for this pane's countries, UNpadded. */
  bounds: core.MapBounds;
  /** The codes drawn in this pane, in canonical row order. The pane's caption is written from these. */
  codes: CountryCode[];
  /**
   * Σ `tripIds.length` over `codes` — the weight C6 ranked by, so the surface never re-derives
   * it.
   *
   * **A-49 Part 4 consequence 2: this no longer sums to `W` across panes.** The detached pane
   * repeats a weight already counted in the pane holding the same code's principal part. It is
   * kept per pane so a caption can honestly say *"US · 1 trip"*, and **nothing may re-derive
   * `W` from `panes`** — C5's total and C6's ordering run over clusters, before any pane
   * exists (I15).
   */
  weight: number;
  /**
   * `width / height` of the **padded** `viewBox` — §4.4 **A-48** Part 6.
   *
   * Carried so the view does no arithmetic: it cannot derive this from `viewBox` without
   * computing over coordinates, which A-40 Part 2 forbids, and without it the stylesheet has to
   * guess a height (the main pane painted 42.6% of its box at 390 px — QA R36-5). The view
   * passes it through as a CSS custom property and sets no other geometry.
   */
  aspect: number;
};

export type WorldMapFrame = {
  /** `=== panes[0].viewBox`. Kept so the existing consumer and its byte-identity test keep their meaning. */
  viewBox: string;
  /**
   * **The PAINT list** — §4.4 **A-49** Part 4: one entry per **(code, pane)**, so a country
   * with a detached part appears twice, with the same `tripIds` and `provisional` in both.
   *
   * Ordered by §4.4 **A-48** C9: descending index position, so the largest paints first and
   * the smallest ends up on top and stays hit-testable. It is NOT a country list and it is NOT
   * canonical row order — **a UI that wants a list of countries renders `codes`** (R37-3, which
   * is what happens when a view derives one from the other). `pane.codes` is what stayed
   * canonical (I2).
   */
  countries: WorldMapCountry[];
  /**
   * **Every DRAWN code exactly once, in canonical row order** — §4.4 **A-49** Part 5, and the
   * one source the code-chip list renders from. Disjoint from `missing` (I13).
   */
  codes: CountryCode[];
  /** `=== panes[0].bounds`. Core's own `MapBounds` — `clamped` included, and nothing renders it (A-42 (c)). */
  bounds: core.MapBounds;
  /**
   * 1…4 entries; `panes[0].role === 'main'`; the geographic insets follow in C6 order; a
   * `'detached'` pane, when it exists, is last and is the only one (A-49 C7′, I3, I5).
   */
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
 * (`clusterPoints`), the frame owns the policy.**
 *
 * **There is no margin, and A-41's claim of one is withdrawn** (§4.4 **A-48** Part 4, QA
 * R36-3): swept over all 28,441 key-point pairs the widest **merging** pair is `SO`–`TM` at
 * 3,999.8 km and the closest **splitting** pair is `CF`–`GW` at 4,000.0 km — a real margin of
 * **1.000×**. There is no natural gap in the distribution at 4,000 km or anywhere near it, so
 * any threshold is a presentation choice, and what this one is chosen to do is stated as
 * outcomes instead: re-derived at C2′'s keys it **separates** US–IS 5,707 · AU–JP 6,793 ·
 * US–GB 6,946 · US–BR 7,182 · GB–JP 9,175 km, and **merges** US–MX 1,622 · GB–GR 2,555 ·
 * GB–MA 2,912 · ES–FI 3,365 · PT–FI 3,569 km. Under C3′ it acts on a graph rather than on
 * pairs, so a component may be joined by a chain (`US CA GL IS GB` is one pane).
 *
 * It is a **presentation** constant: changing it changes no stored byte, no attribution, no
 * count, and no test of what a trip *is*.
 *
 * §4.4 **A-49** gives it a second job at the same value, deliberately: it is also the
 * threshold `countryParts` splits one country's own landmasses at, so that *"which countries
 * share a pane"* and *"what rectangle does that pane look through"* stop being two different
 * answers to the same question (QA R37-1).
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
 * its own longer side (A-41 Part 4), plus that rectangle's own aspect ratio (A-48 Part 6).
 * Pure.
 *
 * The empty box is the one case that is not padded — there is nothing to contain, and A-40's
 * `WHOLE_WORLD` constant is the honest answer to *"show me everywhere I have been"* when the
 * answer is nowhere (A-41 I7). Its aspect is the whole world's: 360 / 180.
 *
 * `aspect` is computed from the **emitted** numbers rather than from the raw ones, so the ratio
 * the stylesheet sizes the box with is the ratio of the `viewBox` the browser actually paints —
 * the two cannot disagree by a rounding step.
 */
function paneFrame(bounds: core.MapBounds): { viewBox: string; aspect: number } {
  if (bounds.empty) return { viewBox: WHOLE_WORLD, aspect: 2 };
  const w = bounds.east - bounds.west;
  const h = bounds.north - bounds.south;
  const pad = FRAME_PAD_FRACTION * Math.max(w, h);
  const width = frameNum(w + 2 * pad);
  const height = frameNum(h + 2 * pad);
  return {
    viewBox: `${frameNum(bounds.west - pad)} ${frameNum(-(bounds.north + pad))} ${width} ${height}`,
    aspect: Number(width) / Number(height),
  };
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
    provisional: boolean;
    tripIds: string[];
    /** A-49 P: the country's own landmasses, core's answer, at the frame's own threshold. */
    parts: core.CountryPart[];
    /** C2′: ONE key point per code, core's own `countryKeyPoint`. */
    key: core.LatLng;
  };
  const drawn: Drawn[] = [];
  const missing: CountryCode[] = [];

  for (const row of stats.countries) {
    // C2′ (A-48) and P (A-49): ONE key point and ONE set of parts per code, and **core**
    // decides both. The client may not derive either — where a country is, and which pieces
    // it is in, are geometric properties of the index exactly as `box` and `countryOf` are,
    // and computing them here would be the second bounds computation A-40 clause 2 forbids.
    // A code may carry more than one entry (§8.4 A-27's union) and both are the same country;
    // `countryParts` unions them for the same reason `countryKeyPoint` does.
    const key = core.countryKeyPoint(row.code, index);
    const parts = core.countryParts(row.code, index, WORLD_CLUSTER_THRESHOLD_KM);
    // `null` and `[]` are the same answer — the index cannot fill this code — and A-40
    // clause 3 says what happens then: it is stated, never dropped. A code whose every ring
    // is degenerate has a key point and no parts, and A-49 sends it here; KD-73.
    if (key === null || parts.length === 0) {
      missing.push(row.code);
      continue;
    }
    drawn.push({ code: row.code, provisional: row.provisional, tripIds: row.tripIds, parts, key });
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

  // ---- C8′ (A-49): a pane frames the parts its subject is CONNECTED TO. ----
  //
  // This is the clause A-48 did not reach, and R37-1 is what it cost: C2′ decided clustering
  // from a country's principal ring while C8 still fitted `mapBounds` over the union of every
  // index entry's box, so a pane that knew France was in France framed French Guiana anyway
  // (81.1° × 49.1° and 1.95% land for a France-and-Greece library). Both decisions are now the
  // same rule at the same threshold, over the same kind of point.
  //
  // For each pane: take every part of every member code, cluster their key points with the ONE
  // kernel at the ONE threshold, and keep the components that contain at least one member's
  // PRINCIPAL part. Everything else is detached and goes to its own pane (C8″) rather than
  // being cropped — constraint 1 and I4 cannot both hold any other way. This closes KD-70.
  type Assigned = { owner: number; part: core.CountryPart };
  const detachedParts: Assigned[] = [];

  const inFrameOf = (group: readonly number[]): Assigned[] => {
    const flat: Assigned[] = [];
    for (const k of group) for (const part of drawn[k].parts) flat.push({ owner: k, part });
    if (flat.length === 0) return flat;
    const components = core.clusterPoints(flat.map((f) => f.part.key), WORLD_CLUSTER_THRESHOLD_KM);
    const inFrame: Assigned[] = [];
    for (const component of components) {
      // A-49 Part 2's premise — "a pane's member codes are one component of the country graph"
      // — holds for a pane that IS one cluster, and not for the two panes C7 can build out of
      // several (the no-split pane, and `inset-2`'s union of clusters 3…N). C8′ is written as
      // the UNION of the components holding a principal part, which is well defined either
      // way, so this loop is the clause verbatim and needs no tie-break, scan order or choice.
      // KD-72.
      if (component.some((i) => flat[i].part.principal)) {
        for (const i of component) inFrame.push(flat[i]);
      } else {
        for (const i of component) detachedParts.push(flat[i]);
      }
    }
    return inFrame;
  };

  /** The four corners of a part's box — what `mapBounds` fits. */
  const cornersOf = (parts: readonly Assigned[]): core.LatLng[] =>
    parts.flatMap(({ part }) => {
      const [minLng, minLat, maxLng, maxLat] = part.box;
      return [
        { lat: minLat, lng: minLng }, { lat: minLat, lng: maxLng },
        { lat: maxLat, lng: maxLng }, { lat: maxLat, lng: minLng },
      ];
    });

  /** `(code, pane)` → the parts of that code drawn in that pane, in index order. */
  const partsPerPane: Array<Map<number, core.CountryPart[]>> = [];
  const push = (into: Map<number, core.CountryPart[]>, a: Assigned) => {
    const list = into.get(a.owner);
    if (list) list.push(a.part);
    else into.set(a.owner, [a.part]);
  };

  const panes: WorldMapPane[] = paneGroups.map((group, i) => {
    const inFrame = inFrameOf(group);
    const own = new Map<number, core.CountryPart[]>();
    for (const a of inFrame) push(own, a);
    partsPerPane.push(own);
    // The extent, unchanged in mechanism: `core.mapBounds` and nothing else, and the client
    // still computes no bounds. `mapBounds` brings `MIN_SPAN_KM` with it, which on this
    // surface is a degeneracy guard rather than a legibility one (A-42 (a)).
    const bounds = core.mapBounds(cornersOf(inFrame));
    const { viewBox, aspect } = paneFrame(bounds);
    return {
      id: i === 0 ? 'main' : `inset-${i}`,
      role: (i === 0 ? 'main' : 'inset') as 'main' | 'inset',
      viewBox,
      bounds,
      // Every member code keeps at least its principal part in frame, so `pane.codes` is the
      // group in canonical row order exactly as C7 left it.
      codes: group.map((k) => drawn[k].code),
      weight: weightOf(group),
      aspect,
    };
  });

  // ---- C8″: nothing is cropped. The detached pane, appended after the geographic ones. ----
  //
  // It exists iff at least one part is detached, is never `panes[0]`, is not ranked, and does
  // not participate in C5's `W` or C6's ordering (I15) — all three of those were computed
  // above, over clusters, before any pane existed.
  if (detachedParts.length > 0) {
    const own = new Map<number, core.CountryPart[]>();
    // Canonical row order: the owners are drawn indices, and `drawn` is C1's canonical list.
    for (const a of detachedParts.slice().sort((x, y) => x.owner - y.owner)) push(own, a);
    const bounds = core.mapBounds(cornersOf(detachedParts));
    const { viewBox, aspect } = paneFrame(bounds);
    const codes = [...own.keys()].map((k) => drawn[k].code);
    partsPerPane.push(own);
    panes.push({
      id: 'detached',
      role: 'detached',
      viewBox,
      bounds,
      codes,
      weight: [...own.keys()].reduce((n, k) => n + drawn[k].tripIds.length, 0),
      aspect,
    });
  }

  // ---- C9 (A-48 Part 5): paint order, and ONLY on the emitted array. ----
  //
  // The working list above stays canonical, because `pane.codes` is written from it and I2
  // says that order is the row order. What is sorted is the array the renderer paints, by
  // **descending index position** — the position of the code's LAST entry in `index.countries`.
  // The generated index is already ordered by ascending summed absolute ring area (§8.4 A-26
  // Part 4), so reading it backwards paints the large first and the small last, and a country
  // whose fill is contained in another's is therefore always on top of it. That is a proof
  // rather than a heuristic: if A's fill contains B's, `area(A) > area(B)`, so A is later in
  // the index and paints first. It costs no computation of its own.
  //
  // A-49 Part 4: the emitted array is now one row per **(code, pane)**. The rows are built in
  // canonical-code order, then pane order, and the sort below is stable — so the two rows of a
  // code with a detached part keep their pane order, and nothing depends on a tie-break.
  const lastEntryAt = new Map<string, number>();
  index.countries.forEach((entry, i) => lastEntryAt.set(entry.code, i));

  const rows: Array<{ owner: number; paneIndex: number }> = [];
  for (let k = 0; k < drawn.length; k++) {
    for (let p = 0; p < panes.length; p++) if (partsPerPane[p].has(k)) rows.push({ owner: k, paneIndex: p });
  }
  rows.sort((a, b) =>
    (lastEntryAt.get(drawn[b.owner].code) ?? -1) - (lastEntryAt.get(drawn[a.owner].code) ?? -1));

  const countries: WorldMapCountry[] = rows.map(({ owner, paneIndex }) => {
    let d = '';
    for (const part of partsPerPane[paneIndex].get(owner) as core.CountryPart[]) {
      for (const ring of part.rings) d += subpath(ring);
    }
    return {
      code: drawn[owner].code,
      d,
      provisional: drawn[owner].provisional,
      tripIds: drawn[owner].tripIds,
      paneId: panes[paneIndex].id,
    };
  });

  return {
    viewBox: panes[0].viewBox,
    countries,
    // A-49 Part 5 / I13: the country list, canonical and complete, so no UI ever derives one
    // from the paint list above.
    codes: drawn.map((x) => x.code),
    bounds: panes[0].bounds,
    panes,
    missing,
  };
}
