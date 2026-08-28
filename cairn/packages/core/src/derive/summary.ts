/**
 * Derived summaries (ARCHITECTURE §2.5). `cityRange` replaces the hardcoded `CITY_RANGE`
 * map in the live app — the importer asserts the derived string matches for all six cities.
 */
import type { City, DatePrecision, Day, LatLng, Trip } from '../model/types.ts';
import type { CityKey, CountryCode, IsoDate } from '../model/ids.ts';
import type { CountryIndex } from '../geo/countryIndex.ts';
import { countryOf } from './country.ts';
import { stopLatLng } from './geo.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parses `YYYY-MM-DD` without touching `Date`. Pure; throws on a malformed date. */
export function parseIsoDate(d: IsoDate): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) throw new Error(`invalid IsoDate: ${JSON.stringify(d)}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Days since 1970-01-01 for a `YYYY-MM-DD`. Pure, timezone-free. */
export function dayNumber(d: IsoDate): number {
  const { y, m, d: dd } = parseIsoDate(d);
  return Math.floor(Date.UTC(y, m - 1, dd) / 86400000);
}

/** `YYYY-MM-DD` for a day number. Pure, timezone-free. */
export function fromDayNumber(n: number): IsoDate {
  const dt = new Date(n * 86400000);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

/** Adds days to an ISO date. Pure. */
export function addDays(d: IsoDate, n: number): IsoDate {
  return fromDayNumber(dayNumber(d) + n);
}

/** Inclusive day count between two ISO dates; negative if end precedes start. Pure. */
export function dateSpan(start: IsoDate, end: IsoDate): number {
  return dayNumber(end) - dayNumber(start) + 1;
}

/** Three-letter weekday, Sun-first index. Pure. */
export function weekdayOf(d: IsoDate): string {
  const { y, m, d: dd } = parseIsoDate(d);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
}

/**
 * The date range a city occupies, formatted as the live app formatted `CITY_RANGE`
 * ("Aug 8–10", "Aug 30–Sep 2"). Pure; returns null when the city has no days.
 */
export function cityRange(trip: Trip, cityKey: CityKey): string | null {
  const days = trip.days.filter((d) => d.cities.includes(cityKey));
  if (days.length === 0) return null;
  const first = parseIsoDate(days[0].date);
  const last = parseIsoDate(days[days.length - 1].date);
  const head = `${MONTHS[first.m - 1]} ${first.d}`;
  const tail = first.m === last.m ? String(last.d) : `${MONTHS[last.m - 1]} ${last.d}`;
  return first.d === last.d && first.m === last.m ? head : `${head}–${tail}`;
}

/**
 * The derivation version every minted row is stamped with (ARCHITECTURE §8.4 clause 3).
 *
 * **Bumped whenever any summary field's derivation changes** — a new field, a changed
 * country index, a changed rule about which records are counted. The client rescans every
 * stored row below it (load the document, recompute, rewrite through the ordinary chained
 * write) *before* anything claims the lifetime map is complete, and says *"recomputing"*
 * while it runs. Without the stamp the day `countryOf` improves is the day the map silently
 * keeps the old answer, which is §0.6's whole subject: a summary is a **copy**, and a copy
 * that cannot say when it was made cannot be repaired.
 *
 *   - **1** — the Phase 1 / Phase 2a row: `{id, title, startDate, endDate, datePrecision,
 *     cityCount, dayCount, stopCount, poolCount, revision}`. Rows minted then carry no
 *     `summaryVersion` field at all, so a reader treats an absent value as *below* this and
 *     rescans it.
 *   - **2** — Phase 2 I-6: `countryCodes`, `cities` and `summaryVersion` themselves, over the
 *     index I-5c settled (§8.4 A-26/A-27/A-28).
 *   - **3** — Phase 2 I-6a (§8.4 **A-29**): a city's *stated* `City.countryCode` may fill a gap
 *     `countryOf` cannot answer, so both `cities[].countryCode` and `countryCodes` can differ
 *     from a version-2 row over the same document; and `cities[]` gains `countrySource`.
 *   - **4** — Phase 2 I-7 (§8.4 **A-31**): the row gains `attribution`, the coordinate-bearing
 *     record census `countryCodes` was computed from. No existing field's derivation moved;
 *     the stamp goes up because a version-3 row cannot answer a question a version-4 row can,
 *     and `travelStats` reads that answer.
 */
export const SUMMARY_VERSION = 4;

/**
 * A city's **stated** country code, accepted or refused — §8.4 **A-29** Part 3. Module-private:
 * §2.10's export surface does not move, and every clause below is reachable through
 * `tripSummary` with a hand-built `City`.
 *
 * Total, in order, and the last step is the one that makes the rest affordable:
 *
 *   1. not a string ⇒ `null`. `fromJSON` guarantees a string for a *stored* document; a
 *      hand-built fixture does not, and this helper may not crash on one.
 *   2. `trim()`, then `/^[A-Za-z]{2}$/` or `null`. This is what refuses `''` (`createTrip`'s
 *      own default), `'HRV'`, `'Croatia'`, `'H1'` and `'H R'`.
 *   3. uppercase.
 *   4. **the shipped index must carry the code**, or `null`. §8.4 clause 3's second consequence
 *      draws the lifetime map from this index's own rings with no tiles behind it, so a code the
 *      index does not carry is a country the map cannot fill — the row would name a country the
 *      signature screen silently omits. The codes this refuses are the ISO codes Natural Earth
 *      folds into a parent state (`RE`, `GF`, `GP`, `MQ`, `YT`, `SJ`, `TK`, `BQ`), for which the
 *      coordinate attribution already answers the parent and is the better answer.
 *
 * `codes` is the membership set built once per `tripSummary` call, not per city.
 */
function acceptStatedCountry(raw: unknown, codes: ReadonlySet<string>): CountryCode | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!/^[A-Za-z]{2}$/.test(t)) return null;
  const u = t.toUpperCase();
  return codes.has(u) ? (u as CountryCode) : null;
}

export type TripSummaryCity = {
  /**
   * Opaque and per-trip (§2.2 A-10). Carried so a drill-down can name the city it is about
   * inside its own document; it is never parsed, and it is never a join key across trips —
   * that is `travelStats`' `nameKey`.
   */
  key: CityKey;
  /** The label. §2.2 A-10: a key alone cannot label a pin, which is why this field exists. */
  name: string;
  /**
   * The answer, whatever its source. `null` is first-class and never a guess.
   *
   * **Not the same field as the document's `City.countryCode`** (§8.4 A-29 Part 4, point 4).
   * That one is stated, unvalidated and defaults to `''`; this one is the *attribution*, and
   * `countrySource` says which of the two produced it.
   */
  countryCode: CountryCode | null;
  /**
   * Where that answer came from — §8.4 **A-29**. `null` exactly when `countryCode` is null.
   *
   * `'coordinate'` is `countryOf(city.centre, index)`, which is evaluated first and wins
   * whenever it is non-null. `'stated'` is the city's own `countryCode` through the acceptance
   * gate, consulted **only** where the coordinate is silent. Carried and not branched on by any
   * surface in this increment (§8.1's precedent for `datePrecision`); nothing may ever *gate* a
   * country's inclusion on it, because inclusion is decided here.
   */
  countrySource: 'coordinate' | 'stated' | null;
};

/**
 * Two numbers about one record class of one document — §8.4 **A-31** Part 2.
 *
 * `located` is the denominator and it is the field that exists so `unattributed: 0` stops being
 * ambiguous between *"everything was attributed"* and *"there was nothing to attribute"*. The
 * second is what the Profile has to be able to say (*"no places yet"*), and against a row that
 * carries only `countryCodes: []` the two states are the same value.
 */
export type AttributionCensus = {
  /** Records bearing a resolvable coordinate. The denominator. */
  located: number;
  /** Of those, the ones `countryOf` gave a country. Never greater than `located`. */
  attributed: number;
};

export type TripSummaryRow = {
  id: string;
  title: string;
  startDate: IsoDate;
  endDate: IsoDate;
  /**
   * Carried, never branched on — §8.1's *"read by display and nothing else"* holds, and this
   * module is what hands the row to display. The Library lists `TripSummaryRow`s read back
   * from storage rather than `Trip`s, so without this the trip the user recorded as
   * *"March 2019"* was listed as `2019-03-01 → 2019-03-31` (QA P2-6). This is the one
   * exemption in §8.1's greppable ceiling — BUILD-NOTES KD-41 records why.
   */
  datePrecision: DatePrecision;
  cityCount: number;
  dayCount: number;
  stopCount: number;
  poolCount: number;
  revision: number;
  /**
   * Every country the trip itself accounts for, distinct and sorted (§8.4 clause 3). Sorted so
   * two rows for the same document are byte-identical wherever they were minted.
   *
   * The union is every non-null `cities[].countryCode` — **of either source**, §8.4 A-29 — plus
   * `countryOf` over `places[].at`, every scheduled stop and every pooled stop. `null` never
   * enters it, and a stated code enters only through its own city's entry: the union is not
   * additive, so a typo'd code on a city the index *can* attribute can never reach it.
   */
  countryCodes: CountryCode[];
  /**
   * The trip's cities in display order — `{key, name, countryCode, countrySource}`, never a
   * bare key.
   */
  cities: TripSummaryCity[];
  /**
   * The coordinate-bearing record census `countryCodes` was computed from (§8.4 **A-31**).
   *
   * A count *about this one document*, minted inside the write that carries it and stamped
   * with `summaryVersion` — which is what separates it from a lifetime statistic, and why
   * A-31 Part 6's rule permits it to be stored at all. Cities are absent on purpose:
   * `City.centre` is non-nullable, so `located` is `cities.length` and `attributed` is the
   * count of non-null `cities[].countryCode`.
   *
   * The two walks are **the same records `countryCodes` unions over**, record for record:
   * `trip.places` with an `at`, and every scheduled *and* pooled stop with a `stopLatLng`. A
   * census whose denominator excluded the pool could report fewer attributed records than the
   * same row claims countries (§8.4 clause 3). That a pooled stop is a plan rather than travel
   * is inherited from clause 3's own definition of `countryCodes`, not decided here, and A-31
   * Part 5 residue 4 records it with the trigger that would reopen it.
   */
  attribution: { places: AttributionCensus; stops: AttributionCensus };
  /** The `SUMMARY_VERSION` in force when this row was computed. */
  summaryVersion: number;
};

/**
 * The cheap row the trip library lists. Pure.
 *
 * **`index` is required, and that is a ruling rather than an oversight** (§8.4 clause 3's
 * first consequence, revision 10). An optional index needs a default, and the only available
 * default is *"emit a row with no countries"* — a row that claims to be complete and is not,
 * which is exactly the confident-wrong-answer shape this project's conventions refuse. With
 * it required there is no way to mint a summary that silently forgot the countries.
 *
 * The row is computed **only from `trip`** (§8.4 clause 1): never from another row, never
 * from client state, never from a document it is not about. That is what makes it safe for
 * the client to rewrite one inside the write that carries it.
 *
 * `homeBase` is deliberately **not** a source of countries. It is where the trip starts and
 * ends from and it is a `geoCheck` anchor (§2.13); counting it would put the traveller's own
 * country on the lifetime map for every trip they ever record, which is a claim the trip's
 * data does not make. A home airport that is also a *stop* still counts, through the stop.
 * §8.4 does not say either way, so this is a choice — BUILD-NOTES **KD-55** records it, and
 * §8.4 **A-29** re-affirms it verbatim.
 *
 * **A-29's one addition, and its precedence.** A `City`'s *stated* `countryCode` is a second,
 * independent piece of evidence the document already carries, and it is admitted **only** where
 * `countryOf(city.centre, index)` is `null` and only through `acceptStatedCountry`'s gate. It
 * never overrides a coordinate, it is never read for any record other than the `City` that
 * carries it, and it reaches `countryCodes` only through that city's own entry.
 *
 * @throws {Error} programmer error only: a missing country index.
 */
export function tripSummary(trip: Trip, index: CountryIndex): TripSummaryRow {
  if (!index || !Array.isArray((index as { countries?: unknown }).countries)) {
    throw new Error(
      'tripSummary: the country index is a required argument (ARCHITECTURE §8.4 clause 3) — ' +
        'there is deliberately no default, because the only available default is a row that ' +
        'claims to be complete while carrying no countries',
    );
  }
  // Built once per call, not per city — 292 entries, 239 distinct codes (§8.4 A-29 Part 3).
  const drawable = new Set<string>(index.countries.map((e) => e.code));
  const cities: TripSummaryCity[] = orderedCities(trip).map((c) => {
    // §8.4 A-29: the coordinate is asked first and its answer is final when it has one. Only
    // where it is `null` — the dataset has no evidence, which A-26 ruled is the *correct*
    // answer rather than a hole to fill by snapping — is the city's own stated code consulted.
    const derived = countryOf(c.centre, index);
    if (derived !== null) {
      return { key: c.key, name: c.name, countryCode: derived, countrySource: 'coordinate' };
    }
    const stated = acceptStatedCountry(c.countryCode, drawable);
    return {
      key: c.key,
      name: c.name,
      countryCode: stated,
      countrySource: stated === null ? null : 'stated',
    };
  });
  const codes = new Set<CountryCode>();
  // §8.4 A-31 Part 2: the census is accumulated in the walk that already visits these records.
  // One traversal, not a second pass — a second pass is a second definition of "the records
  // `countryCodes` was computed from", and two definitions is how the row comes to contradict
  // itself.
  const places: AttributionCensus = { located: 0, attributed: 0 };
  const stops: AttributionCensus = { located: 0, attributed: 0 };
  const add = (at: LatLng | null, census: AttributionCensus) => {
    if (!at) return;
    census.located++;
    const code = countryOf(at, index);
    if (code !== null) {
      census.attributed++;
      codes.add(code);
    }
  };
  for (const c of cities) if (c.countryCode !== null) codes.add(c.countryCode);
  for (const p of trip.places) add(p.at, places);
  for (const d of trip.days) for (const s of d.stops) add(stopLatLng(s, trip), stops);
  for (const s of trip.pool) add(stopLatLng(s, trip), stops);
  return {
    id: trip.id,
    title: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
    datePrecision: trip.datePrecision,
    cityCount: trip.cities.length,
    dayCount: trip.days.length,
    stopCount: trip.days.reduce((n, d) => n + d.stops.length, 0),
    poolCount: trip.pool.length,
    revision: trip.revision,
    countryCodes: [...codes].sort(),
    cities,
    attribution: { places, stops },
    summaryVersion: SUMMARY_VERSION,
  };
}

/** Days grouped under a city tab, exactly the live app's nesting. Pure. */
export function daysForCity(trip: Trip, cityKey: CityKey): Day[] {
  return trip.days.filter((d) => d.cities.includes(cityKey));
}

/** Cities in display order. Pure. */
export function orderedCities(trip: Trip): City[] {
  return trip.cities.slice().sort((a, b) => a.order - b.order);
}
