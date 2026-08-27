/**
 * Cross-trip city identity by display name (ARCHITECTURE §2.2 A-10, hoisted here by A-14).
 *
 * A `CityKey` is an opaque id minted per trip, so it means nothing outside the document that
 * minted it. When two trips have to be compared — a stop copied across a trip boundary
 * (§2.14 rule 4), a lifetime statistic grouping cities from many trips (§8.4) — the only
 * thing they share is the name the user typed. This is that comparison, and it lives here,
 * **once**, in the lowest layer so `build/` and `derive/` import the same one rather than
 * growing two subtly different copies.
 *
 * Deliberately **not** on `packages/core/src/index.ts`: §2.10's export surface stays at 71
 * runtime symbols. Nothing outside `packages/core` needs to fold a city name.
 */

/**
 * NFC-composes when the runtime can, and returns the string unchanged when it cannot.
 *
 * A-10 recorded that `String.prototype.normalize` is ES2015 and present in Node and every
 * browser, but that **whether Hermes ships it is unverified**; A-14 could not resolve it
 * either and left it as a Phase 5 check. Guarding costs three tokens and turns the unknown
 * into a bounded loss: on a runtime without it, two spellings that differ only in
 * composition form stop matching, so a copy takes A-14's step 3 and the place does not
 * travel. Never a throw, and never a wrong filing. A polyfill would be a dependency, which
 * is Jacob's decision and not ours.
 */
const nfc = (s: string): string => (typeof s.normalize === 'function' ? s.normalize('NFC') : s);

/**
 * Folds a city's display name to the form two trips may be compared on: NFC, internal
 * whitespace runs collapsed to one space, trimmed, lowercased.
 *
 * A name that folds to `''` is **not an identity** — callers must treat the empty result as
 * "no name to match on" rather than as a name two blank cities share (A-14, assertion 5).
 *
 * Pure. Throws nothing.
 */
export function normalizeCityName(name: string): string {
  return nfc(name).replace(/\s+/g, ' ').trim().toLowerCase();
}
