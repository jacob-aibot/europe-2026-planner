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
  /**
   * **§8.4 A-56** Part 7. The earliest `cities[].firstDay` over the contributing rows, clamped
   * exactly as a country's is — and this is what closes **A-31 Part 5 residue 1 for cities**.
   *
   * A row that carries no day range for the city (`firstDay === null`, or a version-4 row with
   * no such key) falls back to **the trip's own range**: *"this city has no days"* is not
   * *"this city has no dates"*. The answer is then never worse than residue 1's own behaviour,
   * and a past trip recorded without a day skeleton still gets a date on its stamp.
   */
  firstVisit: IsoDate;
  /** The latest `lastDay`, clamped — never after `today`, never before `firstVisit`. */
  lastVisit: IsoDate;
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
 * exactly two characters — **because the value has been read through `isMintedCode` below and
 * is either two ASCII capitals or this two-character sentinel** — so the split is unambiguous
 * whatever the folded city name contains.
 *
 * §8.4 **A-37** Part 3. This docstring used to cite the *mint* (*"a `CountryCode` is
 * `/^[A-Za-z]{2}$/`, §8.4 A-29's gate"*), which is a true statement about a **document** and a
 * false one about a row: A-29's gate runs at the mint and nothing revalidates a stored row on
 * the way back in. A stored `'--'` collided with this sentinel exactly. The guarantee is made
 * true by the gate rather than withdrawn, because withdrawing it leaves the key ambiguous.
 */
const NO_COUNTRY = '--';

// ---------------------------------------------------------------------------
// §8.4 **A-37** — the two read gates. A `TripSummaryRow` is not a validated document: it is
// read out of storage by `listTrips()`, it passes through no parser and no validator on the
// way in, and `SUMMARY_VERSION` tells a reader WHEN a row was minted, never THAT it is
// well-formed. Every claim this function makes about a field value it read is discharged here,
// on the read. Both are module-private: no new export, no new type, no `Issue` channel, no
// throw, and no `SUMMARY_VERSION` bump — a gate on the read of a field is not a change to the
// field, and `tripSummary` is unchanged (residue 3).
// ---------------------------------------------------------------------------

/** `IsoDate`'s domain, computed from A-32 Part 4's statement rather than transcribed as two
 * magic integers, so it cannot drift from the statement it implements. */
const DOMAIN_MIN = dayNumber('0000-01-01' as IsoDate); // -719528
const DOMAIN_MAX = dayNumber('9999-12-31' as IsoDate); //  2932896
/** §8.4 A-37 Part 2. A row is not a document: its dates carry no issues and were never revalidated. */
const inDomain = (n: number): number => Math.min(DOMAIN_MAX, Math.max(DOMAIN_MIN, n));

/**
 * §8.4 A-37 Part 3. A *minted* `cities[].countryCode` is `/^[A-Z]{2}$/` — A-29's gate checks
 * `/^[A-Za-z]{2}$/`, uppercases, and then requires index membership, so uppercase is the shape
 * the mint emits. A *stored* one is whatever is in the database. This is deliberately the
 * MINT'S OUTPUT shape and not A-29's acceptance shape: they are different rules on different
 * sides, and sharing one predicate would make a lowercase stored code a second city row.
 *
 * Index membership is NOT re-checked here: `travelStats` takes no index, stays pure and
 * index-free (A-31 Part 4), and membership is the mint's job.
 */
const isMintedCode = (v: unknown): v is CountryCode => typeof v === 'string' && /^[A-Z]{2}$/.test(v);

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
 * **A row is not a validated document** (§8.4 **A-37**). It is read out of storage by
 * `listTrips()`, it passes through no parser and no validator on the way in, and
 * `SUMMARY_VERSION` tells a reader *when* a row was minted, never *that it is well-formed*. So
 * the two shapes this function used to take on trust are checked on the read: a day number it
 * derives from a string it did not mint is clamped into `IsoDate`'s domain (`inDomain`), and a
 * stored `countryCode` is read through the mint's own output shape (`isMintedCode`) — a
 * non-matching one is `null` for a city (counted in `unattributed.cities`) and skipped for a
 * `countryCodes[]` entry. Read-side only: `tripSummary` is unchanged.
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
  // **A-37 Part 2**, site 1 of 3. Every day number this function lets reach an output is
  // clamped into `IsoDate`'s domain, so every date it emits is `IsoDate`-shaped by construction
  // rather than by an argument about who validated the input. Everything downstream — the union
  // sweep, `firstVisit`, `lastVisit` — reads these three and inherits the property, so the four
  // `fromDayNumber` call sites need no change and cannot be forgotten one at a time.
  const todayNum = inDomain(dayNumber(today));

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
  //    **A-37 Part 2, deliberately NOT clamped**: this comparator decides ORDER and never
  //    reaches an output, and `id` is the tie-break so the order stays total either way.
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
    // **A-37 Part 2, deliberately NOT clamped**: `lifecycle` decides how a row is CLASSIFIED,
    // which is a different function's contract, and clamping inside it would make an
    // out-of-domain row report as `active` forever.
    const stage = lifecycle(row, today);
    trips[stage]++;
    if (stage === 'planned') continue;
    // **A-37 Part 2**, sites 2 and 3 of 3.
    const a = inDomain(dayNumber(row.startDate));
    const rawB = inDomain(stage === 'active' ? Math.min(dayNumber(row.endDate), todayNum) : dayNumber(row.endDate));
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
      // **A-37 Part 3**, read 2 of 2. An entry that is not a minted code is SKIPPED:
      // `TravelStatsCountry.code` is what I-8 looks up in the index to fill a country, and a
      // code the index cannot contain has no honest rendering. Skipped silently — there is no
      // `unreadableCodes` counter, and that is Part 5 residue 2.
      if (!isMintedCode(code)) continue;
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
  const cityMap = new Map<string, TravelStatsCity & { firstNum: number; lastNum: number }>();
  let unnamedCities = 0;
  let locatedCities = 0;
  let unattributedCities = 0;
  let locatedPlaces = 0;
  let unattributedPlaces = 0;
  let locatedStops = 0;
  let unattributedStops = 0;
  for (const { row, a, b, done } of travelled) {
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
      //
      // **§8.4 A-37 Part 3**, read 1 of 2, and it is still exactly ONE read deciding the count,
      // the group key and the emitted value together. `?? null` was a check on *presence*; a
      // row is not a document, so this is a check on *shape*. A `'--'` (which collided with the
      // composite key's sentinel), `''` (grouped as unattributed without being counted as one),
      // `'A|'` (which made two different rows one), `'hr'` or a `42` is **null**.
      const countryCode = isMintedCode(c.countryCode) ? c.countryCode : null;
      if (countryCode === null) unattributedCities++;
      const nameKey = normalizeCityName(c.name);
      // A name that folds to `''` is **not an identity** (§2.14 A-14 assertion 5). Grouping on
      // it would put every blank city in every trip into one row labelled with nothing; skipping
      // it without counting would be silent loss, which is why the count is a field.
      if (nameKey === '') {
        unnamedCities++;
        continue;
      }
      // **§8.4 A-56 Part 7 clause 1**, and the clamp is A-31 Part 4 step 4's, unchanged: the
      // row's own `[a, b]` is already `today`-clamped for an active trip and already collapsed
      // to its start day for a row whose `endDate` precedes its `startDate`. A city's dates are
      // then clamped INTO that interval, so an active trip cannot report a city visit in the
      // future and a hand-edited row whose `firstDay` sits outside its own trip cannot either.
      //
      // **Clause 2.** `firstDay === null` — or absent, on a version-4 row the rescan has not
      // reached yet — is *"this city has no days"*, not *"this city has no dates"*. The trip has
      // dates and the city is in it, so the fallback is the trip's own range.
      //
      // **A-37 Part 2**, sites 4 and 5. `inDomain` for the same reason `startDate` gets it: a
      // stored row is not a validated document and these two strings were never revalidated.
      const cityA = Math.min(b, Math.max(a, inDomain(dayNumber(c.firstDay ?? row.startDate))));
      const cityB = Math.max(cityA, Math.min(b, Math.max(a, inDomain(dayNumber(c.lastDay ?? row.endDate)))));
      const key = `${countryCode ?? NO_COUNTRY}|${nameKey}`;
      const hit = cityMap.get(key);
      if (!hit) {
        // `provisional` accumulates as for a country (**A-34**), per row and not per city.
        cityMap.set(key, {
          nameKey,
          name: c.name,
          countryCode,
          tripIds: [row.id],
          provisional: !done,
          firstVisit: fromDayNumber(cityA),
          lastVisit: fromDayNumber(cityB),
          firstNum: cityA,
          lastNum: cityB,
        });
      } else {
        if (done) hit.provisional = false;
        // The earliest first and the latest last over every contributing row — the same fold a
        // country's dates take, one granularity down.
        if (cityA < hit.firstNum) {
          hit.firstNum = cityA;
          hit.firstVisit = fromDayNumber(cityA);
        }
        if (cityB > hit.lastNum) {
          hit.lastNum = cityB;
          hit.lastVisit = fromDayNumber(cityB);
        }
        if (hit.tripIds[hit.tripIds.length - 1] !== row.id) {
          // At most once per trip, even if the trip holds two cities that fold to the same key.
          hit.tripIds.push(row.id);
        }
      }
    }
  }
  const cities: TravelStatsCity[] = [...cityMap.values()]
    .sort((x, y) => {
      if (x.nameKey !== y.nameKey) return x.nameKey < y.nameKey ? -1 : 1;
      // `null` last: an unattributed row is the honest hole, and it sorts after the answer.
      if (x.countryCode === y.countryCode) return 0;
      if (x.countryCode === null) return 1;
      if (y.countryCode === null) return -1;
      return x.countryCode < y.countryCode ? -1 : 1;
    })
    // The two day numbers are the fold's own bookkeeping and are not on the type — projected
    // out here exactly as a country's are, so no output carries a field §2.10 does not name.
    .map((c) => ({
      nameKey: c.nameKey,
      name: c.name,
      countryCode: c.countryCode,
      tripIds: c.tripIds,
      provisional: c.provisional,
      firstVisit: c.firstVisit,
      lastVisit: c.lastVisit,
    }));

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
