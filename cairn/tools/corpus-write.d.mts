/**
 * Declarations for `tools/corpus-write.mjs`. The module itself is `.mjs` by design — it runs from
 * `gen-gazetteer.mjs` at generation time with no compile step — so the types live here, the same
 * arrangement as `tools/forgiveness.d.mts` and `fixtures/loadEurope2026.d.mts`.
 */
export type CorpusFile = { name: string; text: string };
export type CorpusWriteHooks = { beforeSwap?: () => void };
export type CorpusWriteResult = { written: number; removed: string[] };

export declare function writeCorpusAtomically(
  dir: string,
  files: readonly CorpusFile[],
  hooks?: CorpusWriteHooks,
): CorpusWriteResult;
