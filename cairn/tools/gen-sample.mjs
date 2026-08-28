/**
 * Generates the built-in Europe 2026 sample trip for `apps/web` (ARCHITECTURE §2.11,
 * ROADMAP "Europe 2026 loads as a built-in sample trip, derived from the adjacent HTML at
 * build time").
 *
 * Adjacent, not copied: this reads `../europe-2026-itinerary.html` READ-ONLY at build time
 * and writes a generated file that is **gitignored**. The written trip is passed through
 * `redactForSample` (§6.6) first — booking references, seats, tickets, link hrefs and any
 * credential-shaped token in free text are stripped, because §7 puts the public share-page
 * host on this same build in Phase 2. The check below fails the build, not a review.
 * BUILD-NOTES §1, KD-17 and KD-18. No copy of `DAYS` is committed. If
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
const { toJSON, fromJSON } = await import('../packages/core/src/index.ts');
const { redactForSample, redactionHits, allStrings } = await import('./redact.mjs');

const { trip, issues, sha256 } = loadEurope2026();

// ARCHITECTURE §6.6. Redaction happens HERE, between `importLegacyDays` and the JSON
// write — never inside `packages/core`. `importLegacyDays` output is unchanged, so the
// CLI, the tests and every golden keep reading the real trip and cost and leg parity are
// untouched. Redaction is a property of the build artifact, not of the model. KD-18.
const redacted = fromJSON(toJSON(redactForSample(trip)));

// Fail the BUILD, not a review. A sample that still carries a credential does not ship.
const leaks = [];
for (const str of allStrings(JSON.parse(toJSON(redacted)))) {
  const hits = redactionHits(str);
  if (hits.length) leaks.push(`${hits.join(',')}: ${str.slice(0, 80)}`);
}
if (leaks.length) {
  console.error(`gen-sample: ${leaks.length} redaction failures — refusing to write the sample:`);
  for (const l of leaks.slice(0, 10)) console.error(`  ${l}`);
  process.exit(1);
}

writeFileSync(OUT, `${toJSON(redacted)}\n`);
console.log(
  `gen-sample: ${trip.days.length} days, ` +
    `${trip.days.reduce((n, d) => n + d.stops.length, 0)} stops, ` +
    `${trip.pool.length} pool, ${trip.places.length} places, ` +
    `${issues.length} import issues → src/sample/europe2026.json ` +
    `(source ${sha256.slice(0, 12)}, REDACTED per ARCHITECTURE §6.6)`,
);
