/**
 * Declarations for `tools/elect-parent.mjs`. The module itself is `.mjs` by design — it runs from
 * `gen-gazetteer.mjs` at generation time with no compile step — so the types live here, the same
 * arrangement as `tools/corpus-write.d.mts` and `tools/forgiveness.d.mts`.
 */
export declare function electParent(
  answers: Iterable<readonly [string, number]>,
  draws: ReadonlySet<string>,
): { parent: string | null; ranked: Array<[string, number]> };
