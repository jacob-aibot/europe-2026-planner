/**
 * Geographic clustering and map bounds (ARCHITECTURE §2.5, §4.4).
 *
 * A day spanning Frankfurt→Vienna would otherwise fit a 621 km rectangle showing nothing
 * useful, so a day map focuses the cluster where the day is actually spent. The min-span
 * guard lives here rather than in a view layer — both of the live app's map bugs came from
 * view-layer map maths, and every surface now takes its bounds from core.
 *
 * Ports of `clusterStops` / `focusCluster` / the span guard inside `applyDayFit`.
 */
import type { LatLng, Stop, Trip } from '../model/types.ts';
import { haversine, stopLatLng } from './geo.ts';

/** Below this, a bounds fit is meaningless — a day spent on one street. */
export const MIN_SPAN_KM = 1.2;

export const DEFAULT_CLUSTER_THRESHOLD_KM = 90;

type Located = { stop: Stop; at: LatLng };

function located(stops: readonly Stop[], trip: Trip): Located[] {
  const out: Located[] = [];
  for (const s of stops) {
    const at = stopLatLng(s, trip);
    if (at) out.push({ stop: s, at });
  }
  return out;
}

/**
 * Single-linkage groups over points, as **indices** into `points`. Pure; never throws.
 *
 * The rule — §4.4 **A-48** C3′: the **connected components** of the graph whose vertices are
 * the points and whose edges join pairs strictly closer than `thresholdKm`. Output order is
 * the convention this function has always had: each group's indices ascending, groups ordered
 * by their smallest member. Single linkage, not diameter. No k-means, no dendrogram, no
 * library, no seed and no iteration to convergence — one pass over the `n(n−1)/2` pairs and a
 * union-find (28,441 distance computations at the 239-country ceiling A-48 measured).
 *
 * **It used to be first-fit** — *"a point joins the FIRST group containing a member within the
 * threshold"* — and QA R36-2 is why it is not. First-fit is not transitive, so the input order
 * is part of the answer: the atlas frame's rows arrive in ascending ISO code, which made the
 * alphabet a second input to a partition A-41 constraint 2 says is a function of coordinates
 * (`{AE, AT, GR}` gave three different partitions across its six orderings, framing the UAE
 * with Greece and exiling Austria). Connected components is the only cheap partition that is a
 * function of the point set alone, and order-independence cannot be recovered by sorting the
 * input, because a geometric sort would still not make first-fit transitive.
 *
 * `clusterStops` and `focusCluster` inherit the correction **deliberately** (A-48 Part 3): the
 * day map had the same latent defect over `Stop.order`. Measured before the change: over the
 * Europe 2026 fixture at `DEFAULT_CLUSTER_THRESHOLD_KM` the two rules agree on all 16 days with
 * two or more located stops and on the whole 112-stop set; at 60 km exactly one day differs.
 *
 * §4.4 **A-41** Part 6 — this is the ONE clustering kernel in the system. `clusterStops` and
 * `focusCluster` below both delegate to it, and `packages/client`'s `worldMapFrame` calls it
 * for the atlas frame's country clusters, which is why it is on §2.10's surface: a third copy
 * of this loop in the client would also mean a hand-rolled haversine there.
 *
 * Indices rather than points because every caller has a richer record — a `Stop`, a country
 * row — that it needs to get back, and indices are the only answer that does not force the
 * kernel to know about any of them.
 */
export function clusterPoints(points: readonly LatLng[], thresholdKm: number): number[][] {
  const n = points.length;
  // Union-find over the point indices. The root of a component is always its SMALLEST index,
  // which is what makes the output order fall out of one ascending pass below rather than out
  // of a sort — and out of no `Map` or `Set` iteration order at all (A-41 I6).
  const parent = new Array<number>(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (start: number): number => {
    let i = start;
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]; // path halving
      i = parent[i];
    }
    return i;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (haversine(points[i], points[j]) < thresholdKm) {
        const a = find(i);
        const b = find(j);
        if (a !== b) parent[a < b ? b : a] = a < b ? a : b;
      }
    }
  }
  const groups: number[][] = [];
  const slotOfRoot = new Array<number>(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (slotOfRoot[root] === -1) {
      slotOfRoot[root] = groups.length;
      groups.push([]);
    }
    groups[slotOfRoot[root]].push(i);
  }
  return groups;
}

/**
 * Groups stops geographically: two stops are in the same group when a chain of stops less than
 * `thresholdKm` apart connects them. Stops without coordinates are dropped. Pure.
 *
 * The partition itself is `clusterPoints` (A-41 Part 6); this function is the stop-shaped
 * wrapper around it — drop the unlocated, cluster, map the indices back. It was first-fit from
 * Phase 1 until §4.4 **A-48** C3′, which is why this docstring no longer says *"the first group
 * containing any member"*: the day's clusters no longer depend on `Stop.order`.
 */
export function clusterStops(
  stops: readonly Stop[],
  trip: Trip,
  thresholdKm: number = DEFAULT_CLUSTER_THRESHOLD_KM,
): Stop[][] {
  const pts = located(stops, trip);
  return clusterPoints(pts.map((p) => p.at), thresholdKm).map((g) => g.map((i) => pts[i].stop));
}

export type FocusResult = {
  /** The cluster a day map should open on. */
  focus: Stop[];
  groups: Stop[][];
  split: boolean;
  /** Raw widest gap across `focus`, in km. NOT clamped — see `fitSpanKm`. */
  spanKm: number;
};

/**
 * Picks the cluster the day is actually spent in. Straight port, including the heuristic
 * that the cluster containing the LAST stop wins if it is within one of the largest, and
 * the fallback when the winner has fewer than two points. Pure.
 */
export function focusCluster(stops: readonly Stop[], trip: Trip): FocusResult {
  const pts = located(stops, trip);
  // The same one kernel — A-41 Part 6. This loop used to be written out a second time here.
  const groupsL: Located[][] = clusterPoints(pts.map((p) => p.at), DEFAULT_CLUSTER_THRESHOLD_KM)
    .map((g) => g.map((i) => pts[i]));
  const groups = groupsL.map((g) => g.map((x) => x.stop));
  if (groupsL.length < 2) {
    return { focus: pts.map((p) => p.stop), groups, split: false, spanKm: rawSpanKm(pts.map((p) => p.at)) };
  }
  const lastPt = pts[pts.length - 1];
  const last = groupsL.find((g) => g.includes(lastPt));
  const biggest = groupsL.slice().sort((a, b) => b.length - a.length)[0];
  let pick = last && last.length >= biggest.length - 1 ? last : biggest;
  if (pick.length < 2) pick = biggest.length > 1 ? biggest : pts;
  return {
    focus: pick.map((p) => p.stop),
    groups,
    split: true,
    spanKm: rawSpanKm(pick.map((p) => p.at)),
  };
}

/** Widest gap between any two points, in km. Pure. */
export function rawSpanKm(points: readonly LatLng[]): number {
  let span = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      span = Math.max(span, haversine(points[i], points[j]));
    }
  }
  return span;
}

/**
 * The span a map should actually fit: the widest gap between points, never below
 * `MIN_SPAN_KM`. Pure.
 *
 * The live app expressed this as `span < 0.6 ? setView(centre, 16) : fitBounds(...)`;
 * a zoom-16 window is ≈1.2 km wide, so clamping the span is the same guard expressed as
 * data instead of as a Leaflet call. The returned box is ALREADY widened to `MIN_SPAN_KM`
 * and says so via `clamped`; a port that adds its own minimum double-clamps.
 * BUILD-NOTES §1, KD-7.
 */
export function fitSpanKm(points: readonly LatLng[]): number {
  return Math.max(rawSpanKm(points), MIN_SPAN_KM);
}

export type MapBounds = {
  centre: LatLng;
  /** The span this box was built to cover, in km — always ≥ MIN_SPAN_KM. */
  spanKm: number;
  north: number;
  south: number;
  east: number;
  west: number;
  /** True when the box was widened by the min-span guard. */
  clamped: boolean;
  empty: boolean;
};

/**
 * The bounds a map port should fit. The client NEVER computes this itself (§4.4). Pure.
 *
 * @returns `empty: true` with a zeroed box when there are no points; callers must not fit.
 */
export function mapBounds(points: readonly LatLng[]): MapBounds {
  if (points.length === 0) {
    return { centre: { lat: 0, lng: 0 }, spanKm: MIN_SPAN_KM, north: 0, south: 0, east: 0, west: 0, clamped: true, empty: true };
  }
  const raw = rawSpanKm(points);
  const centre = {
    lat: points.reduce((a, p) => a + p.lat, 0) / points.length,
    lng: points.reduce((a, p) => a + p.lng, 0) / points.length,
  };
  const north = Math.max(...points.map((p) => p.lat));
  const south = Math.min(...points.map((p) => p.lat));
  const east = Math.max(...points.map((p) => p.lng));
  const west = Math.min(...points.map((p) => p.lng));
  if (raw >= MIN_SPAN_KM) {
    return { centre, spanKm: raw, north, south, east, west, clamped: false, empty: false };
  }
  // Widen symmetrically about the centre to MIN_SPAN_KM.
  const halfLat = MIN_SPAN_KM / 2 / 110.574;
  const cosLat = Math.max(0.01, Math.cos((centre.lat * Math.PI) / 180));
  const halfLng = MIN_SPAN_KM / 2 / (111.32 * cosLat);
  return {
    centre,
    spanKm: MIN_SPAN_KM,
    north: centre.lat + halfLat,
    south: centre.lat - halfLat,
    east: centre.lng + halfLng,
    west: centre.lng - halfLng,
    clamped: true,
    empty: false,
  };
}

/** Coordinates of every stop that has them, in order. Pure. */
export function stopPoints(stops: readonly Stop[], trip: Trip): LatLng[] {
  const out: LatLng[] = [];
  for (const s of stops) {
    const at = stopLatLng(s, trip);
    if (at) out.push(at);
  }
  return out;
}
