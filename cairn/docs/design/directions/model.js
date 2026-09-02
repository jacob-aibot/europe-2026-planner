/* =============================================================================
   The model all three directions render.

   Jacob's requirement: "Each direction must include the same representative Cairn content so I
   can compare design rather than data differences." That is enforced here rather than promised —
   there is exactly one derivation of the record, and the three directions import it.

   Nothing in this file invents a fact. Where the product does not hold something (a city
   coordinate for a past-trip record, a photograph, a distance by mode), this file returns
   nothing and the directions render the absence.
   ========================================================================== */

import { lifecycleOf, nights } from './shared.js';

/** ISO code → the name a person would say. Only the codes this record actually contains. */
const NAMES = {
  AT: 'Austria', CZ: 'Czechia', HU: 'Hungary', HR: 'Croatia', GB: 'United Kingdom',
  US: 'United States', DE: 'Germany', JP: 'Japan',
};

export function buildModel({ cairn }) {
  const TODAY = cairn.today;
  const trip = cairn.trip;

  const journeys = [
    {
      id: trip.id, name: trip.title, start: trip.start, end: trip.end,
      countries: [...new Set(trip.cities.map((c) => c.country))],
      detail: 'full', cities: trip.cities, days: trip.days, counts: trip.counts,
    },
    ...cairn.devLibrary.map((t) => ({
      id: t.id, name: t.title, start: t.start, end: t.end, countries: t.countries,
      detail: 'country', points: t.points, cityNames: t.cities, census: t.census,
      unnamed: t.unnamed ?? 0,
    })),
  ].sort((a, b) => (a.start < b.start ? 1 : -1));

  for (const j of journeys) j.state = lifecycleOf(j.start, j.end, TODAY);

  const home = trip.homeBase?.at ?? (trip.homeBase?.lat !== undefined ? trip.homeBase : null);

  const visited = new Set(journeys.filter((j) => j.state !== 'planned').flatMap((j) => j.countries));
  /* The trip flies out of and back into its home base, so that country is on the record for a
     real reason — a leg, not a coordinate that happened to land there. */
  if (trip.homeBase?.countryCode) visited.add(trip.homeBase.countryCode);
  const plannedOnly = new Set(journeys.filter((j) => j.state === 'planned')
    .flatMap((j) => j.countries).filter((c) => !visited.has(c)));

  const daysTravelled = journeys.filter((j) => j.state !== 'planned')
    .reduce((n, j) => n + nights(j.start, j.end) + 1, 0);

  const cityCount = new Set([
    ...trip.cities.map((c) => c.name),
    ...cairn.devLibrary.filter((t) => lifecycleOf(t.start, t.end, TODAY) !== 'planned')
      .flatMap((t) => t.cities),
  ]).size;

  /* Summed from what each record actually reports. The real trip's 112 stops all carry a
     coordinate, so it contributes no shortfall — that is a measured fact, not a flattering one. */
  const census = cairn.devLibrary.filter((t) => t.census).reduce(
    (a, t) => ({ located: a.located + t.census.located, attributed: a.attributed + t.census.attributed }),
    { located: trip.counts.located, attributed: trip.counts.located });
  const unattributed = census.located - census.attributed;
  const unnamedPlaces = cairn.devLibrary.reduce((n, t) => n + (t.unnamed ?? 0), 0);

  const years = journeys.flatMap((j) => [+j.start.slice(0, 4), +j.end.slice(0, 4)]);

  return {
    today: TODAY,
    journeys,
    realTrip: journeys.find((j) => j.detail === 'full'),
    home,
    homeName: (trip.homeBase?.name ?? 'Home').replace(/\s*\(.*\)$/, ''),
    visited,
    plannedOnly,
    daysTravelled,
    cityCount,
    census,
    unattributed,
    unnamedPlaces,
    firstYear: Math.min(...years),
    lastYear: Math.max(...years),

    countryName: (c) => NAMES[c] ?? c,
    stateLabel: (s) => (s === 'completed' ? 'Travelled' : s === 'active' ? 'On now' : 'Planned'),
    cityName: (j, d) => j.cities.find((c) => c.key === d.city)?.name ?? '—',

    /** The points a journey can be anchored to on a world view. */
    anchorsOf: (j) => (j.detail === 'full'
      ? j.cities.map((c) => c.at)
      : (j.points ?? []).map((p) => p.at).filter(Boolean)),

    /** The ordered places a journey's route runs through, at the requested granularity. */
    sequence: (j, dayId) => {
      if (j.detail !== 'full') {
        return (j.points ?? []).filter((p) => p.at).map((p) => ({ ...p.at, name: NAMES[p.code] ?? p.code }));
      }
      if (dayId) {
        return j.days.find((d) => d.id === dayId).stops.filter((s) => s.at)
          .map((s) => ({ ...s.at, name: s.name }));
      }
      return j.cities.map((c) => ({ ...c.at, name: c.name }));
    },

    framePoints: (j, dayId) => {
      if (j.detail !== 'full') return (j.points ?? []).map((p) => p.at).filter(Boolean);
      if (dayId) return j.days.find((d) => d.id === dayId).stops.filter((s) => s.at).map((s) => s.at);
      return j.cities.map((c) => c.at);
    },

    /**
     * An explicit bounding window with padding. Stated as a literal by the caller's own points —
     * it measures no container and consults no rendered size, so it cannot reintroduce the
     * hidden-container bug the shipped map is fenced against.
     */
    padWindow: (pts, pad, minSpan = 1.2) => {
      let w = 180, s = 90, e = -180, n = -90;
      for (const p of pts) {
        if (!p) continue;
        w = Math.min(w, p.lng); e = Math.max(e, p.lng);
        s = Math.min(s, p.lat); n = Math.max(n, p.lat);
      }
      /* `minSpan` is a FLOOR on how tight the frame may get, and it exists because a record whose
         only precision is "a country" was being framed to a 50km box around that country's key
         point — a picture claiming far more precision than the data has. */
      const dx = Math.max(e - w, minSpan) * pad, dy = Math.max(n - s, minSpan) * pad;
      const cx = (w + e) / 2, cy = (s + n) / 2;
      const halfX = Math.max((e - w) / 2 + dx, minSpan / 2), halfY = Math.max((n - s) / 2 + dy, minSpan / 2);
      return [cx - halfX, cy - halfY, cx + halfX, cy + halfY];
    },
  };
}
