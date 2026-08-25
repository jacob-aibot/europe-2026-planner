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
 * Groups stops geographically. Straight port: a stop joins the first group containing any
 * member within `thresholdKm`, otherwise starts a new one. Stops without coordinates are
 * dropped. Pure.
 */
export function clusterStops(
  stops: readonly Stop[],
  trip: Trip,
  thresholdKm: number = DEFAULT_CLUSTER_THRESHOLD_KM,
): Stop[][] {
  const pts = located(stops, trip);
  const groups: Located[][] = [];
  for (const p of pts) {
    const g = groups.find((gr) => gr.some((q) => haversine(q.at, p.at) < thresholdKm));
    if (g) g.push(p);
    else groups.push([p]);
  }
  return groups.map((g) => g.map((x) => x.stop));
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
  const groupsL: Located[][] = [];
  for (const p of pts) {
    const g = groupsL.find((gr) => gr.some((q) => haversine(q.at, p.at) < DEFAULT_CLUSTER_THRESHOLD_KM));
    if (g) g.push(p);
    else groupsL.push([p]);
  }
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
