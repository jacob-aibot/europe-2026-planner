/**
 * The built-in Europe 2026 sample trip.
 *
 * Generated at build time by `tools/gen-sample.mjs`, which reads the adjacent planner
 * READ-ONLY. The generated file is gitignored — adjacent, not copied (ARCHITECTURE §2.11).
 * It is `null` when the planner is not next door, and the UI then offers no sample.
 */
import raw from './sample/europe2026.json';
import { fromJSON } from '@cairn/core';
import type { Trip } from '@cairn/core';

export function sampleTrip(): Trip | null {
  if (!raw) return null;
  try {
    return fromJSON(JSON.stringify(raw));
  } catch {
    return null;
  }
}

export const hasSample = raw !== null;
