/**
 * `geo_outlier` — a coordinate far from everything the trip knows about. Blocker.
 *
 * This rule holds no geography of its own. It is a thin publisher over `geoCheck`
 * (§2.13), which is the single implementation of coordinate-to-anchor distance in
 * `packages/core`. Revision 1 had two implementations of that idea — this rule and
 * `validateTrip.stop_far_from_city` — both anchored on `day.primaryCity`, both producing
 * false positives on legitimate stops, and neither able to see the bug they existed for.
 *
 * This is the rule that would have caught Fisherman's Bastion sitting 111 km north of
 * Budapest because of a single-digit latitude typo, with nothing visibly broken — and now
 * it does: `geoCheck.test.ts` injects that exact fault and asserts exactly one blocker
 * naming `place-68`.
 *
 * `confidence:'unanchored'` findings are NOT published. A record whose trip offers it no
 * anchor at all is a property of an almost-empty trip, not a defect.
 *
 * **No coordinate goes into `params` or `values`** (§2.7, §6.1): `Conflict.params` is what
 * gets logged, alerted on, committed to a golden and shipped to a server in Phase 2. The
 * record id is in `subjects`; `params` carries `km`, `limitKm`, `anchorKind` and `cityKey`.
 */
import type { Conflict, Trip } from '../../model/types.ts';
import { geoCheck } from '../../derive/geoCheck.ts';
import type { GeoAnchor } from '../../derive/geoCheck.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

function anchorCity(anchor: GeoAnchor | null): string {
  return anchor && anchor.kind === 'city' ? anchor.cityKey : '';
}

/**
 * A city key rendered for a person (§2.2 **A-10**).
 *
 * A `CityKey` is a minted opaque id — `city-7`, not `vienna` — so interpolating one into a
 * summary put an id in front of the user. `City.name` is the city's only human identity;
 * `null` here means the trip has no city for this key (`validateTrip` is what reports the
 * document as broken — this function only has to keep the sentence legible). The caller
 * composes the fallback phrase itself, since `` `the ${label} map` `` cannot host a full
 * sentence in the label's place.
 *
 * `params.cityKey` keeps the **key**: it is structured data and §2.7 requires the id there.
 * Pure.
 */
function cityLabel(trip: Trip, key: string): string | null {
  return trip.cities.find((c) => c.key === key)?.name ?? null;
}

function nameOf(trip: Trip, kind: string, id: string): string {
  if (kind === 'place') return trip.places.find((p) => p.id === id)?.name ?? id;
  for (const d of trip.days) {
    const s = d.stops.find((x) => x.id === id);
    if (s) return s.name;
  }
  return trip.pool.find((x) => x.id === id)?.name ?? id;
}

// A raw, unresolvable cityKey never reaches the summary sentence — it composes as "the <id> map",
// which reads as a real place name rather than a broken document. `params.cityKey` still carries
// the id for anything structured; this is the sentence a person reads.
const UNRESOLVED_CITY = 'a city this trip does not have';

function whereOf(trip: Trip, kind: string, id: string): string {
  if (kind === 'place') {
    const key = trip.places.find((p) => p.id === id)?.cityKey;
    if (key === undefined) return 'the ? map';
    const label = cityLabel(trip, key);
    return label === null ? UNRESOLVED_CITY : `the ${label} map`;
  }
  for (const d of trip.days) if (d.stops.some((x) => x.id === id)) return d.date;
  const pooled = trip.pool.find((x) => x.id === id);
  if (pooled && pooled.placement.kind === 'pool') {
    const label = cityLabel(trip, pooled.placement.cityKey);
    return label === null ? UNRESOLVED_CITY : `the ${label} optional list`;
  }
  return 'this trip';
}

export const geoOutlier: Rule = {
  id: 'geo_outlier',
  description: 'A coordinate sits far outside everything else in the trip.',
  /** §8.2: a coordinate typo is wrong forever, and the lifetime map now renders it. */
  class: 'integrity',
  run(ctx) {
    const out: Conflict[] = [];
    for (const f of geoCheck(ctx.trip)) {
      if (f.confidence !== 'certain') continue;
      const name = nameOf(ctx.trip, f.ref.kind, f.ref.id);
      const where = whereOf(ctx.trip, f.ref.kind, f.ref.id);
      out.push(
        makeConflict({
          ruleId: 'geo_outlier',
          kind: 'geography',
          severity: 'blocker',
          subjects: [f.ref],
          summary:
            `“${name}” on ${where} is ${f.km} km from the nearest place this trip knows about — ` +
            `more than the ${f.limitKm} km this check allows. A single wrong digit in a latitude ` +
            `looks exactly like this.`,
          params: {
            km: f.km,
            limitKm: f.limitKm,
            anchorKind: f.nearest ? f.nearest.kind : 'none',
            cityKey: anchorCity(f.nearest),
            name,
            where,
          },
          detail:
            f.nearest && f.nearest.kind === 'city'
              ? 'Measured to a city centre, because no stop on a relevant day was nearer.'
              : 'Measured to the nearest other point in the trip, not to a city centre — a day trip ' +
                'is allowed to be far from its city.',
          values: { km: f.km, anchorKind: f.nearest ? f.nearest.kind : 'none' },
        }),
      );
    }
    return out;
  },
};
