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
 * One record class is exempt, both ways (§2.13 revision 5, QA R2-9): a stop `copyStopInto`
 * produced — `attribution(stop) !== null` — is measured but never `'certain'`, and it is not
 * an anchor for anything else until it is accepted. See `isCopied` and `anchorsOthers`.
 * **`Place` needs no equivalent and gets none**: a Place carries no `provenance` (§2.2), so
 * a copied place is not identifiable as one and does not need to be. `copyStopInto` rule 4
 * copies the place with its `cityKey` verbatim, so in the destination trip it is either
 * filed under a city that trip does have — meaningful anchors, the check should run — or
 * under a key that trip never heard of, in which case the existing Place row already yields
 * `nearest === null` and `'unanchored'`. Both outcomes are already correct.
 *
 * BUILD-NOTES §1, KD-2 carries the measured detection census and the two permitted misses;
 * KD-23 carries the copied-record row.
 *
 * Pure. No clock, no ids, no IO.
 */
import type { LatLng, Place, Ref, Stop, Trip } from '../model/types.ts';
import type { CityKey, StopId } from '../model/ids.ts';
import { haversine, resolvePlaceLink } from './geo.ts';
import { attribution } from './display.ts';

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
   *
   * `'unanchored'` carries TWO cases and a consumer tells them apart by `nearest`
   * (revision 5): `nearest === null` is *"this trip offered the record no anchor"*;
   * `nearest !== null` is *"anchors exist and this record is deliberately not measured
   * against them"* — the copied-record case below. Both mean the same thing to
   * `geo_outlier`, which publishes neither.
   */
  confidence: 'certain' | 'unanchored';
};

/**
 * A record `copyStopInto` produced — §2.13's copied-record row (revision 5, QA R2-9). Pure.
 *
 * Copying "Arrive LAX" into a Lisbon-based trip produced `geo_outlier: 9140 km, certain` —
 * a blocker on the phase's newest primitive, seconds after a human deliberately asked for
 * that record to be there. §0.5 governs: a rule that cannot tell *"the data says something
 * impossible"* from *"the data is shaped oddly by design"* degrades to a warning rather than
 * asserting a defect, and a stop copied from another trip being far from this trip's
 * geography is not odd, it is the point of the feature.
 *
 * It keys on `attribution()` and NOT on `provenance.state`, deliberately: keying on state
 * would make the same document produce different conflicts either side of a provenance
 * transition, so accepting a stop could *create* a blocker with nobody writing down why. The
 * stated cost is one blind spot — a coordinate typed INTO a copied stop after the copy —
 * on records the user has already been told came from somewhere else.
 */
function isCopied(s: Stop): boolean {
  return attribution(s.provenance) !== null;
}

/**
 * May this stop stand as an anchor for other records? §2.13's symmetric clause.
 *
 * An anchor asserts *"the trip's geography includes this point"*, and an un-accepted
 * candidate is by construction not yet part of the user's plan (§2.14). Letting one into
 * the anchor set would let a stop the user has not accepted **suppress a real blocker** on
 * a stop they wrote themselves. Once `acceptCandidate` runs it joins the set like any other
 * stop — and note the direction that moves in: acceptance only ever ADDS anchors, so it can
 * only ever remove a blocker, never create one. Pure.
 */
function anchorsOthers(s: Stop): boolean {
  return !isCopied(s) || s.provenance.state === 'accepted';
}

type Anchored = { at: LatLng; anchor: GeoAnchor };

function nearestOf(at: LatLng, anchors: readonly Anchored[]): { km: number; anchor: GeoAnchor } | null {
  let best: { km: number; anchor: GeoAnchor } | null = null;
  for (const a of anchors) {
    const km = haversine(at, a.at);
    if (!best || km < best.km) best = { km, anchor: a.anchor };
  }
  return best;
}

/**
 * `never` forces `confidence: 'unanchored'` while still MEASURING `km` and `nearest`, which
 * is §2.13's copied-record row in one word: *"km and nearest are still measured so a view
 * can say how far it is, but `geo_outlier` never publishes it"*. An implementation that
 * skips the record instead would return `nearest === null` and lose the distance.
 */
function finding(
  ref: Ref,
  at: LatLng,
  anchors: readonly Anchored[],
  confidence: 'certain' | 'unanchored' = 'certain',
): GeoFinding | null {
  const near = nearestOf(at, anchors);
  if (!near) return { ref, km: 0, limitKm: GEO_LIMIT_KM, nearest: null, confidence: 'unanchored' };
  if (near.km <= GEO_LIMIT_KM) return null;
  return { ref, km: Math.round(near.km), limitKm: GEO_LIMIT_KM, nearest: near.anchor, confidence };
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

  // Per-day coordinate lists, computed once. `anchorable` is the subset that may stand as
  // an anchor for OTHER records — §2.13's symmetric clause drops un-accepted copies out of
  // it, so a stop the user has not accepted cannot silence a blocker on one they wrote.
  const dayCoords = trip.days.map((d) => {
    const located = d.stops
      .map((s) => ({ s, at: coordOf(s) }))
      .filter((x): x is { s: Stop; at: LatLng } => x.at !== null);
    return { day: d, located, anchorable: located.filter((x) => anchorsOthers(x.s)) };
  });

  // ---- scheduled stops ------------------------------------------------------
  for (let i = 0; i < dayCoords.length; i++) {
    const { day, located } = dayCoords[i];
    const prev = dayCoords[i - 1]?.anchorable ?? [];
    const next = dayCoords[i + 1]?.anchorable ?? [];
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
        // every OTHER coordinate-bearing stop on this day that may serve as an anchor
        ...dayCoords[i].anchorable
          .filter((x) => x.s.id !== s.id)
          .map((x) => ({ at: x.at, anchor: { kind: 'same_day' as const, stopId: x.s.id } })),
      ];
      const f = finding({ kind: 'stop', id: s.id }, at, anchors, isCopied(s) ? 'unanchored' : 'certain');
      if (f) out.push(f);
    }
  }

  /** Scheduled stops on any day that includes this city, as anchors. */
  const stopsForCity = (cityKey: CityKey, excludeVia?: (s: Stop) => boolean): Anchored[] => {
    const anchors: Anchored[] = [];
    for (const { day, anchorable } of dayCoords) {
      if (!day.cities.includes(cityKey)) continue;
      for (const { s, at } of anchorable) {
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
    const f = finding({ kind: 'stop', id: s.id }, at, anchors, isCopied(s) ? 'unanchored' : 'certain');
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
