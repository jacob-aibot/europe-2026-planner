/**
 * QA round 67 — the sharded corpus, read from disk, with **no loader hook**.
 *
 * `I-23` deleted `packages/core/src/geo/gazetteer.gen.ts` and renamed the subpath's one symbol
 * `GAZETTEER` → `loadGazetteerFor(query)`. Two committed probes reached for a whole-corpus
 * `GAZETTEER` that no longer exists (`qa/r60-coverage.mjs`, `qa/r64-census.mjs` §F); the builder
 * ran them unmodified under a scratchpad `module.register` hook. `qa/` is the breaker's surface,
 * so this is the re-cut: four lines of `readdirSync` over the committed corpus, and the product's
 * own `decodeGazetteer`/`decodeGazetteerMeta` doing the decoding.
 *
 * Two shapes are exported, deliberately, because they are not the same measurement:
 *
 *  - `wholeCorpus()` — every shard, deduplicated by row id, as a `Gazetteer` with `shard: null`.
 *    This is what the hook synthesised and it is the number A-83 Part 1's curve is written in.
 *    It answers *"is the row in the corpus?"* and it **cannot see the shard boundary**.
 *  - `loadGazetteerFor(query)` — the real product path, unmodified, from `@cairn/core/gazetteer`.
 *    It answers *"can a user reach the row by typing that?"*, which is a strictly smaller claim:
 *    a query the loader answers with `null` reaches nothing at all.
 *
 * Nothing here writes to the repo. It reads `packages/core/src/geo/gazetteer/*.json` and nothing
 * else.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const CORPUS_DIR = join(HERE, '..', 'packages', 'core', 'src', 'geo', 'gazetteer');

const gz = await import('../packages/core/src/geo/gazetteer.ts');

export const { decodeGazetteer, decodeGazetteerMeta, foldPlaceName, shardKeyFor } = gz;

export const readDoc = (file) => JSON.parse(readFileSync(join(CORPUS_DIR, file), 'utf8'));

export const shardFiles = () =>
  readdirSync(CORPUS_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'meta.json')
    .sort();

export const rawMeta = () => readDoc('meta.json');

export const meta = () => decodeGazetteerMeta(rawMeta());

/** Every shard, decoded, deduplicated by row id. `shard: null` — a whole corpus. */
export function wholeCorpus() {
  const m = meta();
  const byId = new Map();
  let emitted = 0;
  for (const file of shardFiles()) {
    const g = decodeGazetteer(m, readDoc(file));
    for (const row of g.rows) {
      emitted += 1;
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
  }
  return {
    gazetteer: { source: m.source, shard: null, countryNames: m.countryNames, rows: [...byId.values()] },
    emitted,
    meta: m,
  };
}

/** Every shard, decoded, with the shard key each row was found under. No dedup. */
export function eachShard() {
  const m = meta();
  return shardFiles().map((file) => {
    const raw = readDoc(file);
    return { file, raw, gazetteer: decodeGazetteer(m, raw), bytes: statSync(join(CORPUS_DIR, file)).size };
  });
}

export const loadGazetteerFor = async (q) =>
  (await import('@cairn/core/gazetteer')).loadGazetteerFor(q);
