/**
 * Types for the fixture loader. The loader itself is `.mjs` — it runs under plain `node`
 * with no build step, which is the property the roadmap asks for — so its shape is declared
 * here rather than inferred. Keep the two in step.
 */
import type { ImportResult } from '../packages/core/src/index.ts';

export const FIXTURE_NOW: string;
export const FIXTURE_TODAY: string;
export const COUNTRY_CODES: Record<string, string>;

export function loadBookingFixture(): unknown;
export function committedHash(): string | null;

export function loadEurope2026(): ImportResult & {
  /** sha256 of `europe-2026-itinerary.html` as read this run. */
  sha256: string;
  /** The raw constant block lifted out of the live planner. */
  constants: Record<string, unknown>;
};
