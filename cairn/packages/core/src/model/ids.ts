/**
 * Opaque id aliases and the injected `IdFactory`.
 *
 * Core NEVER generates an id itself — no `crypto.randomUUID()`, no `Math.random()`,
 * no counters keyed off wall-clock time. Callers inject a factory so that golden
 * files are reproducible (ARCHITECTURE §2.1, ROADMAP "hard constraints").
 */

export type TripId = string;
export type DayId = string;
export type StopId = string;
export type PlaceId = string;
export type BookingId = string;
export type ConflictId = string;
export type UserId = string;
/** §10.1. Opaque, like every other id here; minted by the injected `IdFactory`, never parsed. */
export type PhotoId = string;
/**
 * §8.3. Opaque, like every other id here; minted by the injected `IdFactory`, never parsed.
 *
 * It is **not** a `UserId` and may never be treated as one. A participant is a statement about
 * who was on the trip; `Participant.userId` is the separate, nullable link to an account, and
 * collapsing the two is the first of the five collapses §8.7 forbids.
 */
export type ParticipantId = string;
export type CityKey = string;
export type RuleId = string;
/**
 * An ISO 3166-1 alpha-2 country code, uppercase (§8.4). An alias, not a brand: `City.countryCode`
 * has been a plain `string` since revision 1 and hand-supplied at import (§2.13), and widening
 * that field to a branded type would be a migration, not a naming change. What this alias buys is
 * that `countryOf`'s return type says what it returns.
 */
export type CountryCode = string;

/**
 * The pseudo-city a day carries when it belongs to no city on the trip — a pure travel day
 * (Aug 7 of Europe 2026 is `cities: ['transit']`), or any day of a trip that has no cities
 * yet. It is deliberately NOT a member of `Trip.cities`: it is the absence of a city, not
 * a city, and `blankDay`/`ensureDays` mint it for every day the user has not placed.
 *
 * It is a named constant because four files compared against the bare string `'transit'`
 * and a fifth forgot to, which is how a pooled stop filed under it became unreachable from
 * every surface (QA R2-2). Not exported from `index.ts` — it is not part of §2.10's
 * surface, and a caller outside core should ask "is this key one of `trip.cities`?"
 * rather than know this value.
 */
export const TRANSIT_CITY_KEY = 'transit';

/** `YYYY-MM-DD`. */
export type IsoDate = string;
/** `HH:MM`, 24h, wall-clock at the stop's location. */
export type ClockTime = string;
/** ISO 4217-ish, uppercase. Core never converts between them. */
export type Currency = string;

/** Injected id source. Pure from core's point of view: core only calls it. */
export type IdFactory = { newId: (kind: string) => string };

/** Injected clock. `today()` is the only "now" core is ever allowed to see. */
export type ClockPort = { today: () => IsoDate };

/**
 * A deterministic `IdFactory` for tests, fixtures and imports.
 * Pure constructor; the returned factory is stateful but reproducible.
 */
export function sequentialIds(prefix = ''): IdFactory {
  const counters = new Map<string, number>();
  return {
    newId(kind: string): string {
      const n = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, n);
      return `${prefix}${kind}-${n}`;
    },
  };
}

/** A fixed clock. Pure. */
export function fixedClock(date: IsoDate): ClockPort {
  return { today: () => date };
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days in a month. Proleptic Gregorian, no `Date`. Pure. */
function daysInMonth(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/**
 * True for a real calendar date in `YYYY-MM-DD`. Pure.
 *
 * The shape check alone is not enough: `2026-13-45` and `2026-02-30` both match
 * `/^\d{4}-\d{2}-\d{2}$/` and both roll over silently through `Date.UTC`, which produced a
 * 2-day trip starting 2027-02-14 and a 0-day trip that validated clean (F-11). This is the
 * ONE date validator in core — `createTrip`, `validateTrip` and the access predicates all
 * call it, so there is no second implementation to disagree with.
 */
export function isIsoDate(v: unknown): v is IsoDate {
  if (typeof v !== 'string') return false;
  const m = ISO_DATE_RE.exec(v);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}
