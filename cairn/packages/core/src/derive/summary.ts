/**
 * Derived summaries (ARCHITECTURE §2.5). `cityRange` replaces the hardcoded `CITY_RANGE`
 * map in the live app — the importer asserts the derived string matches for all six cities.
 */
import type { City, DatePrecision, Day, Trip } from '../model/types.ts';
import type { CityKey, IsoDate } from '../model/ids.ts';

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

export type TripSummaryRow = {
  id: string;
  title: string;
  startDate: IsoDate;
  endDate: IsoDate;
  /**
   * Carried, never branched on — §8.1's *"read by display and nothing else"* holds, and this
   * module is what hands the row to display. The Library lists `TripSummaryRow`s read back
   * from storage rather than `Trip`s, so without this the trip the user recorded as
   * *"March 2019"* was listed as `2019-03-01 → 2019-03-31` (QA P2-6).
   */
  datePrecision: DatePrecision;
  cityCount: number;
  dayCount: number;
  stopCount: number;
  poolCount: number;
  revision: number;
};

/** The cheap row the trip library lists. Pure. */
export function tripSummary(trip: Trip): TripSummaryRow {
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
