/**
 * Shared test helpers. Loads the Europe 2026 fixture ONCE — the extractor reads the live
 * planner off disk and 16 tests re-reading it is wasteful, not wrong.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadEurope2026, FIXTURE_TODAY, FIXTURE_NOW } from '../../../fixtures/loadEurope2026.mjs';
import type { Trip } from '../src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '..', '..', '..');

export { FIXTURE_TODAY, FIXTURE_NOW };

let cached: ReturnType<typeof loadEurope2026> | null = null;

export function europe2026(): {
  trip: Trip;
  issues: unknown[];
  cityRangeCheck: Array<{ cityKey: string; derived: string | null; legacy: string; ok: boolean }>;
  unmatchedNames: string[];
  sha256: string;
  constants: Record<string, unknown>;
} {
  if (!cached) cached = loadEurope2026();
  return cached as never;
}

/** Reads a golden file. Throws loudly if it is missing — run `npm run golden`. */
export function golden<T = Record<string, unknown>>(name: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, 'fixtures', 'golden', name), 'utf8')) as T;
}

export function repoFile(relative: string): string {
  return readFileSync(resolve(ROOT, '..', relative), 'utf8');
}
