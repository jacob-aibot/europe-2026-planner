/**
 * Geographic primitives. A byte-exact port of the live planner's `haversine`
 * (ARCHITECTURE §2.5) — the tester diffs against the running page, so do not "improve"
 * the constants or the rounding.
 */
import type { LatLng, Place, PlaceLink, Stop, Trip } from '../model/types.ts';

export const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km. Pure. */
export function haversine(a: LatLng, b: LatLng): number {
  const R = EARTH_RADIUS_KM;
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Resolves a `PlaceLink` to coordinates, or null for `{kind:'none'}` / a dangling id. Pure. */
export function resolvePlaceLink(link: PlaceLink, places: readonly Place[]): LatLng | null {
  if (link.kind === 'inline') return link.at;
  if (link.kind === 'place') {
    const p = places.find((x) => x.id === link.placeId);
    return p && p.at ? p.at : null;
  }
  return null;
}

/** Coordinates of a stop within a trip, or null. Pure. */
export function stopLatLng(stop: Stop, trip: Trip): LatLng | null {
  return resolvePlaceLink(stop.place, trip.places);
}

/** True when a coordinate is inside the legal range. Pure. */
export function inRange(at: LatLng): boolean {
  return (
    Number.isFinite(at.lat) &&
    Number.isFinite(at.lng) &&
    at.lat >= -90 &&
    at.lat <= 90 &&
    at.lng >= -180 &&
    at.lng <= 180
  );
}
