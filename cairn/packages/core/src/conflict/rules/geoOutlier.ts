/**
 * `geo_outlier` — a stop more than 35 km from its day's primary city centre with no
 * `arrival` override explaining how it got there. Blocker.
 *
 * This is the rule that would have caught Fisherman's Bastion sitting 111 km north of
 * Budapest because of a single-digit latitude typo, with nothing visibly broken.
 *
 * Measured against the PRIMARY city, per §2.7. On the Europe 2026 fixture that also flags
 * the deliberate first-stop-of-a-travel-day cases (a Split morning on a Prague day, a
 * Budapest sunrise on a London day). See BUILD-NOTES for the objection: measuring against
 * the nearest of `day.cities` removes those two without weakening the typo check.
 */
import type { Conflict } from '../../model/types.ts';
import { haversine, stopLatLng } from '../../derive/geo.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

export const GEO_OUTLIER_KM = 35;

export const geoOutlier: Rule = {
  id: 'geo_outlier',
  description: 'A stop is far outside the city its day belongs to.',
  run(ctx) {
    const out: Conflict[] = [];
    const centres = new Map(ctx.trip.cities.map((c) => [c.key, c.centre]));
    for (const day of ctx.trip.days) {
      const centre = centres.get(day.primaryCity);
      if (!centre) continue; // 'transit' days and unknown cities have no anchor
      for (const stop of day.stops) {
        if (stop.arrival) continue;
        const at = stopLatLng(stop, ctx.trip);
        if (!at) continue;
        const km = haversine(centre, at);
        if (km <= GEO_OUTLIER_KM) continue;
        out.push(
          makeConflict({
            ruleId: 'geo_outlier',
            kind: 'geography',
            severity: 'blocker',
            subjects: [
              { kind: 'stop', id: stop.id },
              { kind: 'day', id: day.id },
            ],
            summary:
              `“${stop.name}” on ${day.date} is ${Math.round(km)} km from the centre of ` +
              `${day.primaryCity}, and nothing on the stop says how you get there.`,
            params: {
              stopName: stop.name,
              date: day.date,
              cityKey: day.primaryCity,
              km: Math.round(km),
              lat: at.lat,
              lng: at.lng,
            },
            detail: 'Either the coordinates are wrong, or the stop needs a travel override.',
            values: { lat: at.lat, lng: at.lng, city: day.primaryCity },
          }),
        );
      }
    }
    return out;
  },
};
