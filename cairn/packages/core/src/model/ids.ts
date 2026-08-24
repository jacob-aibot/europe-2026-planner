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
export type CityKey = string;
export type RuleId = string;

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
