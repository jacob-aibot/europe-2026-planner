/**
 * `geoCheck` — the ONE implementation of coordinate-to-anchor distance in `packages/core`
 * (ARCHITECTURE §2.13). `geo_outlier` is its only consumer.
 *
 * **The principle, stated once:** every coordinate is measured to the nearest point in the
 * trip's own declared geography, and a coordinate far from everything the trip knows about
 * is a coordinate to look at. *Not* "far from its city" — a day trip is supposed to be far
 * from its city, and a flight lands wherever it lands.
 *
 * What this replaces: two implementations of the same idea (`geo_outlier` and
 * `validateTrip.stop_far_from_city`), both anchored on `day.primaryCity`, both wrong the
 * same way, and neither able to see the bug they existed for. The historical Fisherman's
 * Bastion typo — one digit of latitude, 111 km north, nothing visibly broken — was
 * reproduced exactly and neither check moved, because between them they examined 31 of 238
 * coordinate-bearing records and none of the 95 places, which is the record class the real
 * bug lived in.
 *
 * Every element of the anchor set below is load-bearing, and each was kept only because
 * removing it reintroduced a specific false positive:
 *
 *   - same-day and adjacent-day stops → the Frankfurt (FRA) connect (603 km from Vienna on
 *     a Vienna day) and the three Krka stops (48–54 km from Split on a Krka day trip);
 *   - `Trip.homeBase` → "Arrive LAX", 9,321 km from anything else in the trip.
 *
 * The limit is a flat 35 km everywhere. There is no second radius, no `daytrip` exemption
 * and no travel-mode exemption — §2.12's `travelRole` is deliberately NOT read here: two
 * independent defects, two independent fixes.
 *
 * BUILD-NOTES §1, KD-2 carries the measured detection census and the two permitted misses.
 *
 * Pure. No clock, no ids, no IO.
 */
import type { LatLng, Place, Ref, Stop, Trip } from '../model/types.ts';
import type { CityKey, StopId } from '../model/ids.ts';
import { haversine, resolvePlaceLink } from './geo.ts';

/** Flat, everywhere. §2.13. */
export const GEO_LIMIT_KM = 35;

export type GeoAnchor =
  /** A city centre the record's own day or filing claims. */
  | { kind: 'city'; cityKey: CityKey }
  /** `Trip.homeBase` — where the trip starts and ends from. */
  | { kind: 'home_base' }
  /** Another coordinate-bearing stop on the same day. */
  | { kind: 'same_day'; stopId: StopId }
  /** The last coordinate of D−1, or the first of D+1. */
  | { kind: 'adjacent_day'; stopId: StopId }
  /** For a pool stop or a Place: a scheduled stop on one of that city's days. */
  | { kind: 'city_stop'; stopId: StopId };

export type GeoFinding = {
  ref: Ref;
  /** Distance to the NEAREST anchor, rounded. */
  km: number;
  limitKm: number;
  /** `null` when the record has no anchor at all. */
  nearest: GeoAnchor | null;
  /**
   * `'certain'` — the trip offered anchors and this record is beyond the limit from all of
   * them. `'unanchored'` — the trip offered none, which is a property of an almost-empty
   * trip and not a defect; §2.13 says it is not published as a conflict in Phase 1.
   */
  confidence: 'certain' | 'unanchored';
};

type Anchored = { at: LatLng; anchor: GeoAnchor };

function nearestOf(at: LatLng, anchors: readonly Anchored[]): { km: number; anchor: GeoAnchor } | null {
  let best: { km: number; anchor: GeoAnchor } | null = null;
  for (const a of anchors) {
    const km = haversine(at, a.at);
    if (!best || km < best.km) best = { km, anchor: a.anchor };
  }
  return best;
}

function finding(ref: Ref, at: LatLng, anchors: readonly Anchored[]): GeoFinding | null {
  const near = nearestOf(at, anchors);
  if (!near) return { ref, km: 0, limitKm: GEO_LIMIT_KM, nearest: null, confidence: 'unanchored' };
  if (near.km <= GEO_LIMIT_KM) return null;
  return { ref, km: Math.round(near.km), limitKm: GEO_LIMIT_KM, nearest: near.anchor, confidence: 'certain' };
}

/**
 * Every record with a resolvable coordinate, measured against the nearest anchor its own
 * filing gives it. Records with no resolvable coordinate are not checked — `place_ref_dangling`
 * and the `PlaceLink {kind:'none'}` path already cover them. Pure.
 */
export function geoCheck(trip: Trip): GeoFinding[] {
  const out: GeoFinding[] = [];
  const centres = new Map<CityKey, LatLng>(trip.cities.map((c) => [c.key, c.centre]));
  const homeBase: Anchored[] = trip.homeBase ? [{ at: trip.homeBase.at, anchor: { kind: 'home_base' } }] : [];

  /** Coordinates of a stop, resolved through `trip.places`. */
  const coordOf = (s: Stop): LatLng | null => resolvePlaceLink(s.place, trip.places);

  // Per-day coordinate lists, computed once.
  const dayCoords = trip.days.map((d) => ({
    day: d,
    located: d.stops.map((s) => ({ s, at: coordOf(s) })).filter((x): x is { s: Stop; at: LatLng } => x.at !== null),
  }));

  // ---- scheduled stops ------------------------------------------------------
  for (let i = 0; i < dayCoords.length; i++) {
    const { day, located } = dayCoords[i];
    const prev = dayCoords[i - 1]?.located ?? [];
    const next = dayCoords[i + 1]?.located ?? [];
    const boundary: Anchored[] = [];
    if (prev.length) boundary.push({ at: prev[prev.length - 1].at, anchor: { kind: 'adjacent_day', stopId: prev[prev.length - 1].s.id } });
    if (next.length) boundary.push({ at: next[0].at, anchor: { kind: 'adjacent_day', stopId: next[0].s.id } });

    const cityAnchors: Anchored[] = [];
    for (const key of day.cities) {
      const c = centres.get(key);
      if (c) cityAnchors.push({ at: c, anchor: { kind: 'city', cityKey: key } });
    }

    for (const { s, at } of located) {
      const anchors: Anchored[] = [
        ...cityAnchors,
        ...homeBase,
        ...boundary,
        // every OTHER coordinate-bearing stop on this day
        ...located.filter((x) => x.s.id !== s.id).map((x) => ({ at: x.at, anchor: { kind: 'same_day' as const, stopId: x.s.id } })),
      ];
      const f = finding({ kind: 'stop', id: s.id }, at, anchors);
      if (f) out.push(f);
    }
  }

  /** Scheduled stops on any day that includes this city, as anchors. */
  const stopsForCity = (cityKey: CityKey, excludeVia?: (s: Stop) => boolean): Anchored[] => {
    const anchors: Anchored[] = [];
    for (const { day, located } of dayCoords) {
      if (!day.cities.includes(cityKey)) continue;
      for (const { s, at } of located) {
        if (excludeVia && excludeVia(s)) continue;
        anchors.push({ at, anchor: { kind: 'city_stop', stopId: s.id } });
      }
    }
    return anchors;
  };

  // ---- pool stops -----------------------------------------------------------
  for (const s of trip.pool) {
    const at = coordOf(s);
    if (!at) continue;
    const cityKey = s.placement.kind === 'pool' ? s.placement.cityKey : '';
    const centre = centres.get(cityKey);
    const anchors: Anchored[] = [
      ...(centre ? [{ at: centre, anchor: { kind: 'city' as const, cityKey } }] : []),
      ...homeBase,
      ...stopsForCity(cityKey),
    ];
    const f = finding({ kind: 'stop', id: s.id }, at, anchors);
    if (f) out.push(f);
  }

  // ---- places ---------------------------------------------------------------
  for (const p of trip.places as readonly Place[]) {
    if (!p.at || !Number.isFinite(p.at.lat) || !Number.isFinite(p.at.lng)) continue;
    const centre = centres.get(p.cityKey);
    // A stop that resolves ITS coordinate through this place would anchor the place to
    // itself and make the check vacuous.
    const anchors: Anchored[] = [
      ...(centre ? [{ at: centre, anchor: { kind: 'city' as const, cityKey: p.cityKey } }] : []),
      ...homeBase,
      ...stopsForCity(p.cityKey, (s) => s.place.kind === 'place' && s.place.placeId === p.id),
    ];
    const f = finding({ kind: 'place', id: p.id }, p.at, anchors);
    if (f) out.push(f);
  }

  return out;
}
