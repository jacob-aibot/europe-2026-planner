/**
 * Generates the built-in Europe 2026 sample trip for `apps/web` (ARCHITECTURE §2.11,
 * ROADMAP "Europe 2026 loads as a built-in sample trip, derived from the adjacent HTML at
 * build time").
 *
 * Adjacent, not copied: this reads `../europe-2026-itinerary.html` READ-ONLY at build time
 * and writes a generated file that is **gitignored**. No copy of `DAYS` is committed. If
 * the live planner is missing — someone cloned only `cairn/` — it writes `null` and the app
 * simply offers no sample trip rather than failing to build.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '..', 'apps', 'web', 'src', 'sample');
const OUT = resolve(OUT_DIR, 'europe2026.json');
const SOURCE = resolve(HERE, '..', '..', 'europe-2026-itinerary.html');

mkdirSync(OUT_DIR, { recursive: true });

if (!existsSync(SOURCE)) {
  writeFileSync(OUT, 'null\n');
  console.log('gen-sample: no europe-2026-itinerary.html next door — sample trip disabled');
  process.exit(0);
}

const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
const { toJSON } = await import('../packages/core/src/index.ts');

const { trip, issues, sha256 } = loadEurope2026();
writeFileSync(OUT, `${toJSON(trip)}\n`);
console.log(
  `gen-sample: ${trip.days.length} days, ` +
    `${trip.days.reduce((n, d) => n + d.stops.length, 0)} stops, ` +
    `${trip.pool.length} pool, ${trip.places.length} places, ` +
    `${issues.length} import issues → src/sample/europe2026.json (source ${sha256.slice(0, 12)})`,
);
