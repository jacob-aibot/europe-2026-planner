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
 */
export const SUMMARY_VERSION = 2;

export type TripSummaryCity = {
  /**
   * Opaque and per-trip (§2.2 A-10). Carried so a drill-down can name the city it is about
   * inside its own document; it is never parsed, and it is never a join key across trips —
   * that is `travelStats`' `nameKey`.
   */
  key: CityKey;
  /** The label. §2.2 A-10: a key alone cannot label a pin, which is why this field exists. */
  name: string;
  /** `countryOf(city.centre, index)`. `null` is a first-class answer and never a guess. */
  countryCode: CountryCode | null;
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
   * Every country the trip's own coordinates resolve to, distinct and sorted (§8.4 clause 3).
   * Sorted so two rows for the same document are byte-identical wherever they were minted.
   */
  countryCodes: CountryCode[];
  /** The trip's cities in display order — `{key, name, countryCode}`, never a bare key. */
  cities: TripSummaryCity[];
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
 * §8.4 does not say either way, so this is a choice — BUILD-NOTES **KD-55** records it.
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
  const cities = orderedCities(trip).map((c) => ({
    key: c.key,
    name: c.name,
    countryCode: countryOf(c.centre, index),
  }));
  const codes = new Set<CountryCode>();
  const add = (at: LatLng | null) => {
    if (!at) return;
    const code = countryOf(at, index);
    if (code !== null) codes.add(code);
  };
  for (const c of cities) if (c.countryCode !== null) codes.add(c.countryCode);
  for (const p of trip.places) add(p.at);
  for (const d of trip.days) for (const s of d.stops) add(stopLatLng(s, trip));
  for (const s of trip.pool) add(stopLatLng(s, trip));
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
