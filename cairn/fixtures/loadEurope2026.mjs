/**
 * The Europe 2026 fixture, assembled from sources that are READ read-only:
 *
 *   - `../../europe-2026-itinerary.html`  — the live planner (never written, never copied)
 *   - `./europe2026.bookings.json`        — transcribed once from `docs/BOOKINGS.md`
 *
 * Deterministic: ids come from `sequentialIds`, and `now` is a fixed date, so the same
 * inputs always produce byte-identical output and golden files are meaningful.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { extractLegacy } from '../tools/extract-legacy.mjs';
import { importLegacyDays, sequentialIds } from '../packages/core/src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The date stamped as `addedAt` on every imported item. Fixed so output is reproducible. */
export const FIXTURE_NOW = '2026-08-24';
/** The `today` the conflict rules that need a horizon are given. Before the trip starts. */
export const FIXTURE_TODAY = '2026-08-01';

export const COUNTRY_CODES = {
  vienna: 'AT',
  dubrovnik: 'HR',
  split: 'HR',
  prague: 'CZ',
  budapest: 'HU',
  london: 'GB',
};

/** Reads the transcribed bookings. Pure apart from one file read. */
export function loadBookingFixture() {
  const raw = JSON.parse(readFileSync(resolve(HERE, 'europe2026.bookings.json'), 'utf8'));
  return raw.bookings;
}

/** The committed hash of the live planner, or null if it has not been baselined yet. */
export function committedHash() {
  try {
    return readFileSync(resolve(HERE, 'europe2026.sha256'), 'utf8').trim().split(/\s+/)[0];
  } catch {
    return null;
  }
}

/**
 * Builds the Europe 2026 trip through `importLegacyDays`.
 * @returns `{ trip, issues, cityRangeCheck, unmatchedNames, sha256, constants }`
 */
export function loadEurope2026() {
  const { sha256, constants } = extractLegacy();
  const result = importLegacyDays(constants, {
    ids: sequentialIds(),
    year: 2026,
    now: FIXTURE_NOW,
    tripId: 'trip-europe-2026',
    title: 'Europe 2026',
    homeCurrency: 'EUR',
    party: { adults: 1, children: 0 },
    countryCodes: COUNTRY_CODES,
    bookings: loadBookingFixture(),
    sourceHash: sha256,
  });
  return { ...result, sha256, constants };
}
