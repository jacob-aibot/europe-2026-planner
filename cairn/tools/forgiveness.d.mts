/**
 * Declarations for `tools/forgiveness.mjs`. The module itself is `.mjs` by design — it runs from
 * `gen-countries.mjs` at generation time with no compile step — so the types live here, the same
 * arrangement as `tools/redact.d.mts` and `fixtures/loadEurope2026.d.mts`.
 */
export type Ring = readonly number[];
export type Box = readonly [number, number, number, number];
export type PreppedRing = { pts: number[]; box: Box };
export type PreppedSet = { rings: PreppedRing[]; box: Box };
export type ForgivenessEntry = { code: string; rings: readonly Ring[] };
export type ForgivenessDrop = { index: number; filter: 1 | 2; code: string | null };

export declare const LATTICE: number;

export declare function prepRing(ring: Ring): PreppedRing;
export declare function prepSet(rings: readonly Ring[]): PreppedSet;
export declare function boxesMeet(a: Box, b: Box): boolean;
export declare function overlaps(R: PreppedRing, S: PreppedSet): boolean;
export declare function overlapsRings(ring: Ring, rings: readonly Ring[]): boolean;
export declare function forgivenessFor(
  candidates: readonly Ring[],
  own: readonly Ring[],
  others: readonly ForgivenessEntry[],
  opts?: { filter1?: boolean; filter2?: boolean },
): { kept: number[]; drops: ForgivenessDrop[] };
