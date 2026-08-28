/**
 * Lifetime travel statistics (ARCHITECTURE §8.4 clause 2, specified by **A-31**).
 *
 * **Every statistic is derived. Nothing counts anything into storage.** A stored
 * `countriesVisited: 47` is a second source of truth that can disagree with the trips it
 * summarises, and — the reason it matters for this product specifically — it is a number a user
 * can inflate by typing. Principle 1 says real-world travel is the source of truth, so a derived
 * statistic cannot drift from the travel it is derived from. The same rule pre-decides goals and
 * achievements (§8.8): a goal is a declarative target evaluated against `TravelStats`, never a
 * counter that is incremented.
 *
 * The input is the library's **summary rows** and not documents: §4.2's *"exactly ONE trip in
 * memory at a time"* is not negotiable, and the lifetime map is precisely the screen that would
 * want forty. Everything this function needs was minted inside the write that carried each
 * document (§8.4 clause 1) and stamped with `SUMMARY_VERSION` (clause 3).
 *
 * Zero dependencies, no ambient clock: `today` is injected, exactly as `lifecycle`'s is.
 */
import type { CountryCode, IsoDate } from '../model/ids.ts';
import type { TripSummaryRow } from './summary.ts';
import { dayNumber, fromDayNumber } from './summary.ts';
import { lifecycle } from './lifecycle.ts';
// By module path on purpose. `normalizeCityName` is deliberately **off** `index.ts` (§2.14
// A-14): nothing outside `packages/core` needs to fold a city name, and §2.10's surface does
// not grow to let one module inside core call another.
import { normalizeCityName } from '../model/cityName.ts';

export type TravelStatsCountry = {
  code: CountryCode;
  /** The `startDate` of the earliest travelled trip carrying this code. */
  firstVisit: IsoDate;
  /** The clamped end of the latest travelled trip carrying it — never after `today`. */
  lastVisit: IsoDate;
  /** In canonical row order. `TripSummaryRow.id` is a plain `string`, so this is too. */
  tripIds: string[];
  /**
   * **A-34.** True when no `completed` trip contributed this row.
   *
   * A-31 Part 5 residue 2 licenses an `active` trip contributing **all** of its countries,
   * un-clamped by the day it has actually reached, because the row carries no day-level
   * attribution. That licence holds only because the contribution is **marked**: a surface
   * renders a provisional row visibly differently and never as a visited fact with dates.
   * It is a caveat — *"the evidence is from a trip you are on"* — and not a negation.
   */
  provisional: boolean;
};

export type TravelStatsCity = {
  /** `normalizeCityName(name)` — a grouping key, never a `CityKey`, never `''`. */
  nameKey: string;
  /** The raw display name from the first member in canonical row order. */
  name: string;
  countryCode: CountryCode | null;
  tripIds: string[];
  /** **A-34.** True when no `completed` trip contributed this row. See `TravelStatsCountry`. */
  provisional: boolean;
};

/**
 * What there was to attribute, and what could not be — the same three record classes twice.
 *
 * These fields are count-shaped and live in `packages/core`, so ROADMAP exit criterion 6b's scan
 * finds them; they are allow-listed there as the **return type of a pure function**, which has no
 * storage representation at all. That is the criterion rather than an exception to it, and the
 * allow-list's own reasoning — including the two entries A-31 Part 6 did not enumerate — is
 * BUILD-NOTES **KD-64**. `test/stats-storage.test.ts` pins the thing it rests on: nothing under
 * `ports/`, `serialize/` or `store` may import `TravelStats`.
 */
export type TravelRecordCensus = { cities: number; places: number; stops: number };

export type TravelStats = {
  countries: TravelStatsCountry[];
  cities: TravelStatsCity[];
  trips: { planned: number; active: number; completed: number };
  daysTravelled: number;
  /** What there was to attribute. The denominator, and the *"no places yet"* test. */
  located: TravelRecordCensus;
  /** The honest hole, on screen. Never greater than `located`, per class. */
  unattributed: TravelRecordCensus;
  /** Cities whose name folds to `''` — counted, never merged into a blank row. */
  unnamedCities: number;
};

/**
 * `null` is a distinct group key. The country goes FIRST in the composite key and is always
 * exactly two characters — a `CountryCode` is `/^[A-Za-z]{2}$/` (§8.4 A-29's gate) and this
 * sentinel is two characters no code can be — so the split is unambiguous whatever the folded
 * city name contains.
 */
const NO_COUNTRY = '--';

/**
 * Everywhere the traveller has actually been, derived from the library's summary rows. Pure.
 *
 * **The population is the travelled rows only** (§8.4 A-31 Part 3). `lifecycle(row, today)`
 * partitions every row three ways for `trips`; a `planned` trip then contributes **no country,
 * no city, no day and nothing to either census** — a country you have not been to is not on the
 * map of everywhere you have been, and a trip booked for next spring is the same inflation
 * clause 2 refuses `countriesVisited: 47` for, reached by planning instead of by typing.
 *
 * **An `active` trip is clamped at `today`.** A 14-day trip on its second day contributes 2 days
 * to `daysTravelled`, not 14, and its `lastVisit` is `today`. It does contribute all of its
 * countries and cities, unclamped: refining that needs day-level attribution, which the row does
 * not carry and §8.5's `Visit` has not been built (A-31 Part 5 residue 2).
 *
 * **A row whose `endDate` precedes its `startDate` degenerates to its start day.**
 * `validateTrip` reports it and does not reject it, and `fromJSON` accepts it, so it reaches
 * here and this function may not throw on it. Counting zero would make a malformed row
 * *invisible*, which is worse than counting it small.
 *
 * `daysTravelled` is the **union** of the trips' date intervals, not their sum: two trips
 * overlapping in time are not two days of your life. `trips.completed` still counts them
 * separately, and that is not a discrepancy — they are counts of different things, and the
 * alternative is the one that inflates (residue 5).
 *
 * **A row out of storage is never a reason to throw** (QA R28-3, R28-4). A row minted before
 * `SUMMARY_VERSION` 4 carries no `attribution` census and contributes none; a row whose census
 * is impossible (`attributed > located`) contributes `0` to `unattributed` and its `located` as
 * given. Both used to be a throw or a negative number, and both are reachable without a caller
 * bug — `refreshLibrary()` installs the stored rows and the rescan brings them current
 * *afterwards*, so the library legitimately holds a stale row in between.
 *
 * @throws {Error} programmer error only — a duplicate row id, or a malformed date. **Two, and
 *         the list is exhaustive** (A-31 Part 4).
 */
export function travelStats(summaries: readonly TripSummaryRow[], today: IsoDate): TravelStats {
  const todayNum = dayNumber(today);

  // 1. Duplicate ids throw. A library is keyed by id, so two rows with one id is a caller bug,
  //    and a silent dedupe would make `trips.completed` quietly wrong for whoever built the
  //    list. §2.1: core throws on programmer error and returns `Issue[]` for everything else.
  const seen = new Set<string>();
  for (const r of summaries) {
    if (seen.has(r.id)) throw new Error(`travelStats: duplicate summary id ${JSON.stringify(r.id)}`);
    seen.add(r.id);
  }

  // 2. Canonical order, computed once. Everything downstream reads THIS array, so no output
  //    depends on the order the caller happened to pass — which is what makes the golden stable
  //    and the purity assertion meaningful. `slice()` before `sort()`: the input is `readonly`
  //    and comes back untouched.
  const rows = summaries.slice().sort((x, y) => {
    const d = dayNumber(x.startDate) - dayNumber(y.startDate);
    if (d !== 0) return d;
    return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });

  // 3. `trips` — over EVERY row, using the existing `lifecycle` and not a second implementation
  //    of trip state (sequencing rule 1). `TripSummaryRow` structurally satisfies `DatedTrip`.
  const trips = { planned: 0, active: 0, completed: 0 };
  // 4. The travelled set: `active` or `completed`, with the clamped interval each contributes.
  const travelled: Array<{ row: TripSummaryRow; a: number; b: number; done: boolean }> = [];
  for (const row of rows) {
    const stage = lifecycle(row, today);
    trips[stage]++;
    if (stage === 'planned') continue;
    const a = dayNumber(row.startDate);
    const rawB = stage === 'active' ? Math.min(dayNumber(row.endDate), todayNum) : dayNumber(row.endDate);
    // `done` is A-34's evidence, carried once per row rather than re-derived per country and
    // per city: `lifecycle` is called exactly here, and the folds below only read this flag.
    travelled.push({ row, a, b: Math.max(a, rawB), done: stage === 'completed' });
  }

  // 5. `daysTravelled` — the size of the UNION of the intervals, by sort-and-sweep. Sweep and
  //    not a `Set` of day numbers because an `IsoDate` admits year `0001` and a hand-written row
  //    would otherwise allocate millions of entries.
  const spans = travelled.map((t) => ({ a: t.a, b: t.b })).sort((x, y) => x.a - y.a);
  let daysTravelled = 0;
  let cur: { a: number; b: number } | null = null;
  for (const s of spans) {
    if (cur === null) cur = { a: s.a, b: s.b };
    else if (s.a <= cur.b) cur.b = Math.max(cur.b, s.b);
    else {
      daysTravelled += cur.b - cur.a + 1;
      cur = { a: s.a, b: s.b };
    }
  }
  if (cur !== null) daysTravelled += cur.b - cur.a + 1;

  // 6. `countries` — first/last visit are the TRIP's range, not the country's (residue 1): the
  //    row carries no per-country dates and cannot without carrying the day→city edges.
  const countryMap = new Map<CountryCode, TravelStatsCountry & { firstNum: number; lastNum: number }>();
  for (const { row, a, b, done } of travelled) {
    for (const code of row.countryCodes) {
      const hit = countryMap.get(code);
      if (!hit) {
        countryMap.set(code, {
          code,
          firstVisit: fromDayNumber(a),
          lastVisit: fromDayNumber(b),
          tripIds: [row.id],
          // **A-34**, accumulated in the fold rather than in a second pass: the row starts
          // provisional and stops being so the first time a `completed` trip contributes it.
          provisional: !done,
          firstNum: a,
          lastNum: b,
        });
        continue;
      }
      if (a < hit.firstNum) {
        hit.firstNum = a;
        hit.firstVisit = fromDayNumber(a);
      }
      if (b > hit.lastNum) {
        hit.lastNum = b;
        hit.lastVisit = fromDayNumber(b);
      }
      if (done) hit.provisional = false;
      if (hit.tripIds[hit.tripIds.length - 1] !== row.id) hit.tripIds.push(row.id);
    }
  }
  const countries: TravelStatsCountry[] = [...countryMap.values()]
    .sort((x, y) => (x.code < y.code ? -1 : x.code > y.code ? 1 : 0))
    .map((c) => ({
      code: c.code,
      firstVisit: c.firstVisit,
      lastVisit: c.lastVisit,
      tripIds: c.tripIds,
      provisional: c.provisional,
    }));

  // 7. `cities` — grouped on the pair `(nameKey, countryCode)`. A `CityKey` is opaque and
  //    per-trip (§2.2 A-10), so two trips to Tokyo carry two of them and only the name can join
  //    them; the country is in the key because the same name in two countries must be two rows.
  const cityMap = new Map<string, TravelStatsCity>();
  let unnamedCities = 0;
  let locatedCities = 0;
  let unattributedCities = 0;
  let locatedPlaces = 0;
  let unattributedPlaces = 0;
  let locatedStops = 0;
  let unattributedStops = 0;
  for (const { row, done } of travelled) {
    // **QA R28-3.** A row minted before `SUMMARY_VERSION` 4 carries no `attribution`, and this
    // used to throw — non-uniformly, because only travelled rows are walked, so the same stale
    // row was fatal when the trip was `completed` and silent when it was `planned`. It is not a
    // caller bug: `refreshLibrary()` installs the stored rows and the rescan brings them current
    // *afterwards*, so between the two the library legitimately holds version-3 rows and §2.1
    // lets core throw on programmer error only. A missing census contributes **nothing** to
    // either side of the place/stop hole rather than being invented; the row's cities are still
    // walked, because `cities[]` has been on the row since version 3.
    const census = row.attribution;
    if (census) {
      if (census.places) {
        locatedPlaces += census.places.located;
        // **QA R28-4**, A-31 Part 2's clamp, applied per row rather than to the total: a row out
        // of storage with `attributed > located` (hand-edited, half-migrated) would otherwise
        // make `unattributed` negative, or pay for another row's genuine hole.
        unattributedPlaces += Math.max(0, census.places.located - census.places.attributed);
      }
      if (census.stops) {
        locatedStops += census.stops.located;
        unattributedStops += Math.max(0, census.stops.located - census.stops.attributed);
      }
    }
    // `City.centre` is non-nullable, so every city entry is a located record and the city census
    // is derivable from `cities[]` alone. That is why the row carries no city census.
    for (const c of row.cities) {
      locatedCities++;
      // **QA R28-5.** `null` and `undefined` are ONE answer, read once, here. The two used to
      // disagree — `=== null` decided this count while `?? NO_COUNTRY` decided the group key —
      // so an `undefined` code was grouped as unattributed without being counted as one, and
      // came back out as `undefined`, which `JSON.stringify` silently drops.
      const countryCode = c.countryCode ?? null;
      if (countryCode === null) unattributedCities++;
      const nameKey = normalizeCityName(c.name);
      // A name that folds to `''` is **not an identity** (§2.14 A-14 assertion 5). Grouping on
      // it would put every blank city in every trip into one row labelled with nothing; skipping
      // it without counting would be silent loss, which is why the count is a field.
      if (nameKey === '') {
        unnamedCities++;
        continue;
      }
      const key = `${countryCode ?? NO_COUNTRY}|${nameKey}`;
      const hit = cityMap.get(key);
      if (!hit) {
        // `provisional` accumulates as for a country (**A-34**), per row and not per city.
        cityMap.set(key, { nameKey, name: c.name, countryCode, tripIds: [row.id], provisional: !done });
      } else {
        if (done) hit.provisional = false;
        if (hit.tripIds[hit.tripIds.length - 1] !== row.id) {
          // At most once per trip, even if the trip holds two cities that fold to the same key.
          hit.tripIds.push(row.id);
        }
      }
    }
  }
  const cities = [...cityMap.values()].sort((x, y) => {
    if (x.nameKey !== y.nameKey) return x.nameKey < y.nameKey ? -1 : 1;
    // `null` last: an unattributed row is the honest hole, and it sorts after the answer.
    if (x.countryCode === y.countryCode) return 0;
    if (x.countryCode === null) return 1;
    if (y.countryCode === null) return -1;
    return x.countryCode < y.countryCode ? -1 : 1;
  });

  return {
    countries,
    cities,
    trips,
    daysTravelled,
    located: { cities: locatedCities, places: locatedPlaces, stops: locatedStops },
    unattributed: {
      cities: unattributedCities,
      places: unattributedPlaces,
      stops: unattributedStops,
    },
    unnamedCities,
  };
}
