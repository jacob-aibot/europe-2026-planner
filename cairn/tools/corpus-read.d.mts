/**
 * Declarations for `tools/corpus-read.mjs`. The module itself is `.mjs` by design — it runs from
 * `gen-gazetteer.mjs` at generation time with no compile step — so the types live here, the same
 * arrangement as `tools/corpus-write.d.mts` and `tools/elect-parent.d.mts`.
 */
export declare function readPreviousCorpus<T>(args: {
  corpusDir: string;
  witnessPath: string;
  read: () => T;
}): T | null;

export declare function corpusExists(corpusDir: string): boolean;
