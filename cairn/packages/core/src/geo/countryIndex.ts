/**
 * The shape of the country-attribution index, and the two ways to build one
 * (ARCHITECTURE §8.4 clause 1).
 *
 * Nothing here fetches, reads a file, or knows what Natural Earth is. `packages/core` has zero
 * runtime dependencies and no `fs`; the polygons arrive as *data*, either from the committed
 * generated module (`geo/countries.gen.ts`, produced by `tools/gen-countries.mjs`) or from a
 * hand-written fixture in a test. `countryOf` takes an index as an argument for exactly that
 * reason — §8.4 requires the function to be pure and "testable against the four-polygon fixture".
 *
 * **Representation.** A country is a code plus a flat list of rings; a ring is a flat array of
 * `[lng, lat, lng, lat, …]`. Flat, because a ring of 231 two-element arrays is 231 objects the
 * ray cast would chase pointers through, and because the packed form the generator emits is
 * flat anyway.
 *
 * **Holes and multi-part countries need no special case, and that is deliberate.** Every ring a
 * country owns — outer rings, island rings, and the hole rings that cut enclaves out of it —
 * goes into one list, and `countryOf` runs the even-odd rule across all of them at once. A point
 * inside Lesotho crosses South Africa's outer ring once and its Lesotho-shaped hole once: two
 * crossings, even, outside. A point on an island crosses that island's ring only. The rule is
 * exact whenever a country's rings do not overlap each other, which is the property a valid
 * admin-0 layer already has, so there is nothing to reconstruct and no winding order to trust.
 */
import type { CountryCode } from '../model/ids.ts';

/** A closed ring, flattened: `[lng, lat, lng, lat, …]`. The closing point may be omitted. */
export type CountryRing = readonly number[];

/** `[minLng, minLat, maxLng, maxLat]` — a reject box, derived, never hand-written. */
export type CountryBox = readonly [number, number, number, number];

/** What a caller supplies to build an index: a code and its rings. */
export type CountryEntryInit = {
  readonly code: CountryCode;
  readonly rings: readonly CountryRing[];
};

/** An entry as the index stores it: the init plus its derived bounding box. */
export type CountryEntry = CountryEntryInit & { readonly box: CountryBox };

/**
 * A built index. `scale` and `source` are provenance, carried so that a golden, a summary row or
 * a bug report can say *which* dataset produced an attribution — an index that cannot name
 * itself makes the day the attribution changes indistinguishable from the day it was always
 * wrong (§8.4 clause 3's `SUMMARY_VERSION` argument, one layer down).
 */
export type CountryIndex = {
  readonly scale: string;
  readonly source: string;
  readonly countries: readonly CountryEntry[];
};

function boxOf(rings: readonly CountryRing[]): CountryBox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const ring of rings) {
    for (let i = 0; i + 1 < ring.length; i += 2) {
      const lng = ring[i];
      const lat = ring[i + 1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Builds an index from entries, deriving each bounding box. Pure.
 *
 * **The order of `init.countries` is preserved exactly.** That is not indifference: `countryOf`
 * returns the FIRST country whose rings contain the point, so where two countries' rings overlap
 * the order *is* the tie-break, and it has to be the same on every machine and every run.
 *
 * This function used to impose that determinism itself, by sorting on ISO code. §8.4 **A-26**
 * Part 4 withdrew that: the key was deterministic and arbitrary, and the arbitrariness was the
 * defect. The shipped index is 1:110m filled with 1:10m polygons for the 64 ISO codes the coarse
 * layer does not carry, which creates overlaps the source data never had — a Vaduz point is
 * inside both Austria's coarse ring and Liechtenstein's fine one — and **alphabetical order
 * resolves seven of those eight overlaps in favour of the encloser** (`AT` before `LI`, `CN`
 * before `HK`, `ES` before `GI`, `FR` before `MC`, `IT` before `SM`, `MY` before `SG`).
 *
 * So the order is decided where the polygons are: `tools/gen-countries.mjs` emits entries in
 * **ascending summed absolute spherical ring area, ties by ISO code ascending, then by scale
 * coarsest first** — non-arbitrary, because an enclave is always smaller than the thing enclosing
 * it. Determinism is not weakened by moving the decision here; it is strengthened, because the
 * order becomes part of the committed artefact, so a reorder is a diff a reviewer sees rather
 * than a comparison a reviewer trusts. A hand-written test fixture is tested in the order it was
 * written, which is what a four-polygon fixture wants.
 *
 * **An ISO code may appear on more than one entry, and nothing here treats a code as a key**
 * (§8.4 **A-27**). The fill takes the family's *finest* scale, which tracks the waterline — so a
 * coordinate a few hundred metres offshore of a small island state came back `null` at its own
 * capital. A-27 measured the obvious remedy, choosing a coarser scale per code, and rejected it:
 * the coarse polygon deletes whole landforms (175 of the Maldives' 176 atolls). Instead, 54 of
 * the 64 filled codes carry a **second entry** holding the same country's coarser rings, filtered
 * at generation time so they claim only ground that touches the country's own fine rings and no
 * other country's at all. Two entries of one code compose as a **union**, because `countryOf`
 * returns the first *entry* whose rings contain the point and the even-odd rule runs *within* an
 * entry — which is also why the coarse rings are a separate entry rather than merged into the
 * fine ones: merged, the two would cancel exactly where the forgiveness is wanted.
 */
export function countryIndex(init: {
  scale: string;
  source: string;
  countries: readonly CountryEntryInit[];
}): CountryIndex {
  const countries = init.countries.map((c) => ({ code: c.code, rings: c.rings, box: boxOf(c.rings) }));
  return { scale: init.scale, source: init.source, countries };
}

/**
 * Decodes the packed payload the generated module carries. `packed` is JSON of the form
 * `[["AD",[[lng,lat,…],…]],…]` — one string literal in the `.ts` file, which is one token to
 * Node's type stripper. The same bytes written as a TypeScript array literal would be tens of
 * thousands of tokens for the same information, which is the parse cost the I-5 budget test
 * exists to keep off `node --test packages/core`.
 */
export function decodeCountryIndex(
  meta: { scale: string; source: string },
  packed: string,
): CountryIndex {
  const raw = JSON.parse(packed) as Array<[string, number[][]]>;
  return countryIndex({
    scale: meta.scale,
    source: meta.source,
    countries: raw.map(([code, rings]) => ({ code, rings })),
  });
}
