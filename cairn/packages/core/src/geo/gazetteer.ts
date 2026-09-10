/**
 * The bundled offline city gazetteer — its shape, its fold, and its search
 * (ARCHITECTURE §8.4 **A-82**).
 *
 * Nothing here fetches, reads a file, or knows what Natural Earth is. `packages/core` has zero
 * runtime dependencies and no `fs`; the rows arrive as *data*, either from the committed generated
 * module (`geo/gazetteer.gen.ts`, produced by `tools/gen-gazetteer.mjs`) or from a hand-written
 * fixture in a test. `searchGazetteer(query, gazetteer, opts?)` takes the gazetteer as an argument
 * for exactly the reason `countryOf(at, index)` takes an index — A-82 Part 9 says so in as many
 * words: *"which is `countryOf(at, index)`'s shape verbatim — pure, index injected, testable
 * against a hand-built five-row fixture."*
 *
 * **This module is NOT imported by `packages/core/src/index.ts`'s data path.** `searchGazetteer`
 * and the three types are on §2.10's surface; `GAZETTEER` is reached through a **second declared
 * entry point**, `@cairn/core/gazetteer`, and is dynamically imported by its consumers. Unlike
 * `COUNTRY_INDEX`, the gazetteer is **not on the write path** — nothing inside a document write
 * needs it — so its ~300 kB stays out of the main chunk (A-82 Part 9, against A-27 Part 9's
 * contrast).
 *
 * **`foldPlaceName` is NOT `normalizeCityName` and neither may be implemented in terms of the
 * other** (A-82 Part 3). `normalizeCityName` (§2.2 A-10, §2.14 A-14) is an **identity** key: it
 * decides whether two trips are about the same city, and folding accents into it would silently
 * merge two genuinely different cities across a user's whole history. `foldPlaceName` is a
 * **matching** key: it decides whether what a person typed reaches a row in a list they are about
 * to choose from, where being generous costs one extra row on screen. Same shape, opposite failure
 * cost. Both stay module-private, and this module imports nothing from `model/cityName.ts`.
 */
import type { CountryCode } from '../model/ids.ts';
import type { CityPick, LatLng } from '../model/types.ts';

/**
 * What the shipped country index says about a row's own country claim — §8.4 **A-84** Part 6.
 *
 * It replaces `indexAgrees: boolean`, which stated something it never checked: **all 436 rows the
 * index was SILENT about shipped claiming agreement**, and `cli.ts cities` rendered the absence of
 * its marker as agreement. A-83 Part 8's invariant is *"agrees **or is silent**"* and the boolean
 * recorded that disjunction as if it were its first arm.
 *
 * > **Silence is not agreement.**
 *
 *  - `'agrees'`  — `countryOf(centre, COUNTRY_INDEX)` is non-null and **is** the row's own code;
 *  - `'differs'` — it is non-null and is a **different** country. The row ships anyway, carrying
 *    the disagreement, published by name in `fixtures/golden/gazetteer-disagreements.json`;
 *  - `'silent'`  — no comparison was made: the index has no answer at this point, **or** the row
 *    carries no country code to compare (A-84 Part 5's `countryCode: null`).
 */
export type IndexVerdict = 'agrees' | 'differs' | 'silent';

/** One settlement or island, as the gazetteer stores it (A-82 Part 3, A-83 Part 4). */
export type GazetteerRow = {
  /** Display form, the source's own spelling: `'Zürich'`, `'São Paulo'`. */
  readonly name: string;
  /**
   * `foldPlaceName(name)` — the matching form: `'zurich'`, `'sao paulo'`.
   *
   * **COMPUTED ON DECODE, not shipped** (A-83 Part 4). KD-112 spent ~12 bytes a row shipping it so
   * that the generator's second copy of the fold was a *checked pair*; round 60 confirmed the
   * checking is real, and A-83's answer is that **you do not have to ship a value to verify it**.
   * The check moved to where checks belong: the generator asserts `foldPlaceName(name)` equals the
   * fold it sharded the row under, and a test asserts it over the shipped rows by decoding them.
   */
  readonly fold: string;
  /**
   * At most one: the folded **English** alternate, and only when it folds differently from the
   * name (A-83 Part 4). A fold equal to `fold` is not one of them.
   */
  readonly alts: readonly string[];
  /**
   * **A code the shipped `COUNTRY_INDEX` can DRAW, or `null`** — §8.4 **A-84** Part 5. `''` is no
   * longer one of this field's values.
   *
   * A row whose source states a code the index cannot draw (`YT`, `GP`, `RE`, `MQ`, `SJ`, `GF`,
   * `BQ`, `CC`, `TK`, `BV`, `CX`, and the empty code) is resolved **at generation time** against
   * the dataset the index is cut from — the containing feature's `ISO_A2_EH` in the pinned
   * `ne_10m_admin_0_countries.geojson` — and ships with that code where the index draws it. Where
   * it does not (Somaliland, Northern Cyprus), the row ships with `null` and is **never refused**:
   * Hargeisa is the capital of Somaliland and Famagusta is a real city, and **Cairn does not
   * adjudicate a sovereignty its own map cannot draw.** Its name and its region still label it.
   */
  readonly countryCode: CountryCode | null;
  /** `''` when the source has none (city-states). Resolved from the meta document's dictionary. */
  readonly admin1: string;
  /**
   * A **coarse bucket**, `2 ** min(35, floor(log2(pop)))`, **for ranking only**. Never displayed
   * as a fact about a city (A-82 Part 4, A-83 Part 4).
   */
  readonly population: number;
  readonly centre: LatLng;
  /**
   * The source's stable row id, **prefixed with the dataset that minted it**: `'gn:<base-36
   * GeoNames id>'`. The prefix lives in the meta document and is prepended on decode.
   *
   * The prefix is not decoration. This value is what a `CityPick.rowId` persists, so a stored
   * pick has to say **which corpus** it came from — otherwise a regeneration onto a different
   * source turns every stored id into a collision waiting to be misread. It is also what makes a
   * regeneration diff readable, which is A-82 Part 2's own reason for carrying it.
   */
  readonly id: string;
  /** What the country index says about this row's own claim — §8.4 **A-84** Part 6. */
  readonly indexSays: IndexVerdict;
};

/**
 * A decoded gazetteer. `source` is provenance, carried so a golden or a bug report can name the
 * dataset that produced a coordinate.
 *
 * **`countryNames` is A-82 Part 4's code→name table** and it rides here rather than in a consumer
 * because `searchGazetteer` computes the `label` itself: *"the alternative — a consumer mapping
 * `GB` to 'United Kingdom' — is a fourth place in this repo that knows what a country is called."*
 * A pure function that must produce a country name has to be handed one.
 */
export type Gazetteer = {
  readonly source: string;
  /**
   * **The shard prefix this document answers for, or `null` for a whole corpus** (A-83 Part 7).
   *
   * A `Gazetteer` carrying a shard is a *partial* corpus: it holds every row reachable under that
   * token prefix and no others. `searchGazetteer` **throws** when handed a query that does not
   * belong to it, because a consumer that fetched the wrong shard would otherwise get a silently
   * short answer — the same failure class as a wrong country on a map: quiet and wrong.
   *
   * `null` is a whole corpus and is always accepted, which is what keeps a hand-built five-row
   * test fixture working unchanged.
   */
  readonly shard: string | null;
  readonly countryNames: Readonly<Record<string, string>>;
  readonly rows: readonly GazetteerRow[];
};

/**
 * The session-once document: the attribution, the source checksum every shard is checked against,
 * the row-id prefix, the **global** admin-1 dictionary, the code→country-name table and the split
 * manifest (A-83 Parts 4 and 5).
 *
 * The dictionary is global rather than per-shard because per-shard copies cost ~1.0 MB of disk
 * against a 23 kB fetch that happens once — and the one skew hazard that buys is closed by a
 * check rather than by a duplicate: both documents carry the same `$sourceSha256` and
 * `loadGazetteer` refuses a pair that disagrees.
 */
export type GazetteerMeta = {
  readonly source: string;
  /**
   * **The checksum of every input the corpus is a function of** — not only of the downloads.
   *
   * It is sha256 over the five pinned source checksums **and over the shipped `COUNTRY_INDEX`**
   * (**QA R67-7**). The index is a real input: the generator reads it to decide `indexSays` for
   * all 149,086 rows, to refuse a silent contradiction, and to decide which stated codes need
   * A-84 Part 5's parent translation. While it was outside this value, two corpora built either
   * side of a country-index regeneration were **different documents carrying the same
   * `$sourceSha256`** — and since GeoNames has no pinnable release tag, checksums are the entire
   * reproducibility guarantee, so a gap in them is a gap in the guarantee.
   */
  readonly sourceSha256: string;
  readonly idPrefix: string;
  readonly admin1: readonly string[];
  readonly countryNames: Readonly<Record<string, string>>;
  /** The **split** prefixes, ascending. A prefix in this set has children; a prefix not in it is a shard. */
  readonly splits: readonly string[];
};
/**
 * A search result: the row, plus the **label `searchGazetteer` computed itself**.
 *
 * A-82 Part 4: *"No consumer composes a label from parts, and no consumer may render a hit by
 * `name` alone."* 199 folded names in the shipped layer are carried by more than one row and
 * three of them are called London.
 */
export type GazetteerHit = GazetteerRow & { readonly label: string };

/**
 * What `searchGazetteer` answers with — **§8.4 A-91 item 1**, the mechanism for this repository's
 * first attribution obligation.
 *
 * GeoNames is CC BY 4.0. `Gazetteer.source` carries the credit on every loaded shard **including a
 * miss**, and while `searchGazetteer` returned a bare array nothing in code made a consumer see it:
 * a screen had to reach for `gazetteer.source` **deliberately**, and nothing noticed when it did
 * not. Wrapping the answer means **`hits` is not reachable without `source` being in the same
 * destructuring** — a screen that does not render it has had to *drop* it, which is a different act
 * from never having seen it.
 *
 * **`GazetteerHit` deliberately does NOT carry `source`.** 149,101 copies of one constant is the
 * second source of truth this repository refuses everywhere else, and a **miss** has no hit to
 * carry it — which is exactly the case `cli.ts cities` already gets right.
 *
 * `source` is always read off the `Gazetteer` that was searched, never a module constant: a
 * hard-coded attribution passes every other assertion forever and goes stale at the next re-pin
 * (§8.4 **A-90** clause 3).
 */
export type GazetteerResult = {
  readonly source: string;
  readonly hits: readonly GazetteerHit[];
};

/** Options for `searchGazetteer`. `limit` defaults to 20 (A-82 Part 3). */
export type GazetteerSearchOptions = { readonly limit?: number };

/**
 * NFD-decomposes when the runtime can, and returns the string unchanged when it cannot —
 * **guarded exactly as `normalizeCityName` guards its NFC** (A-82 Part 3 step 3, A-10's reasoning).
 * Whether Hermes ships `String.prototype.normalize` is still unverified; on a runtime without it
 * an accented query stops reaching an accented row, which costs a search result and never a wrong
 * one. A polyfill would be a dependency, which is Jacob's decision and not ours.
 */
const nfd = (s: string): string => (typeof s.normalize === 'function' ? s.normalize('NFD') : s);

/**
 * A-82 Part 3's substitution table, **verbatim**, and the reason it exists: NFD does not decompose
 * a letter whose diacritic is part of the glyph, and those are exactly the letters that make this
 * feature fail silently for a whole language.
 *
 * **The okina family is deleted rather than spaced, and the table carries all FOUR spellings of
 * it** — `ʻ` U+02BB, `ʼ` U+02BC, `‘` U+2018 and `’` U+2019 (**QA R67-2**). A-82 Part 3 wrote the
 * table against a corpus that spelled the mark U+02BB, and its pinned pair `Nukuʻalofa →
 * nukualofa` is written with U+02BB. **The corpus that ships spells it U+2019 (808 rows) and
 * U+2018 (435).** With only the first two in the table, step 5 turned each of the others into a
 * **space**, and 700 of the 763 rows they touch were unreachable by the query a person actually
 * types: `xian` reached *Xiangyang* and not *Xi’an*, `oahu` reached nothing, and the shipped
 * `Nuku‘alofa` — the row the pinned pair stands for — could not be found by `nukualofa` while the
 * pinned pair itself stayed green. **A verification pair that cannot see its own row is a pair
 * that verifies its own spelling**; `gazetteer.test.ts` now asserts the pair *and* the row.
 *
 * These five are one mark in five encodings, not five marks: U+02BB/U+02BC are the modifier
 * letters, U+2018/U+2019 the typographic quotes data sources reach for when they have no keyboard
 * for the first two, and U+0060 the ASCII grave a transliteration reaches for when it has neither
 * (six shipped rows: Al-`Ula, Giv`at H̱ananya, Qal`at al Ḩişn, Slov`yanoserbsk, Ta`ū, Ra`s
 * Ghārib). **The ASCII apostrophe U+0027 is deliberately NOT here** —
 * it is a word separator in `L'Aquila` and `N'Djamena`, and 602 shipped rows use it that way, so
 * deleting it would merge two tokens a person types as two.
 *
 * Uppercase forms are absent on purpose: step 1 has already lowercased. `İ` is *not* here — it is
 * the case the ordering handles, not the table (see `foldPlaceName`).
 */
const SUBSTITUTIONS: Readonly<Record<string, string>> = {
  'ł': 'l',
  'ø': 'o',
  'đ': 'd',
  'ð': 'd',
  'þ': 'th',
  'ß': 'ss',
  'æ': 'ae',
  'œ': 'oe',
  'ı': 'i',
  'ħ': 'h',
  'ŀ': 'l',
  'ʻ': '',
  'ʼ': '',
  '‘': '',
  '’': '',
  '`': '',
};

/** Step 4: every Unicode `Mn` (combining mark) NFD produced. */
const COMBINING = /\p{Mn}/gu;
/** Step 5: every run that is neither a letter nor a number becomes one space. */
const NON_ALNUM = /[^\p{L}\p{N}]+/gu;

/**
 * Folds a place name to the form a query is matched against — A-82 Part 3's five steps, **in that
 * order**.
 *
 * ```
 * 1. s.toLowerCase()                 locale-invariant. 'İstanbul' → 'i' + U+0307 + 'stanbul'
 * 2. substitute from SUBSTITUTIONS   the letters NFD cannot decompose
 * 3. .normalize('NFD')               guarded, as normalizeCityName guards its NFC
 * 4. delete every Unicode Mn         the combining marks steps 1 and 3 produced
 * 5. non-alphanumeric runs → ' '     then trim
 * ```
 *
 * **What the ordering actually pins was measured over all 24 permutations — §8.4 A-83 Part 10.**
 * Six of the 24 fold A-82 Part 3's twelve pairs correctly, so most of the ordering is free. What
 * the pairs pin is exactly two dependencies and two presences:
 *
 *  - **step 1 before step 2** — the substitution table's keys are lowercase, so `Ł` and `Đ`
 *    survive a substitution that runs first (`Łódź`, `Đông Hà`, and **only** those two);
 *  - **the combining-mark strip after `normalize('NFD')`**, never before (seven pairs);
 *  - **`normalize('NFD')` present at all** — 8 of the 12 redden without it;
 *  - **the substitution table present at all** (`Łódź`, `Tromsø`, `Bærum`, `Ağrı`, `Đông Hà`,
 *    `Nukuʻalofa`).
 *
 * **`normalize('NFD')`'s position relative to `toLowerCase` is pinned by nothing**, and
 * **`İstanbul` pins nothing about the ordering**: it reddens in no permutation where six other
 * pairs are already red. Keep the pair — it proves the Turkish dotted capital folds at all — and
 * do not cite it as evidence for an ordering claim. The sentence this docstring used to carry,
 * *"U+0130 has no canonical decomposition"* (**KD-113**), is **false**: measured on this runtime,
 * `String.fromCodePoint(0x0130).normalize('NFD')` is `U+0049 U+0307`, and Unicode's own mapping is
 * `0130 ; 0049 0307`. **KD-113's own replacement claim — step 1 before step 4 — is withdrawn with
 * it**, by A-83 Part 10: its fault permutation reddens `Łódź` and `Đông Hà` and leaves
 * `İstanbul` green, so it is dependency one in a different costume. The conclusion held; both
 * stated reasons did not.
 *
 * **Module-private** (§2.10 group 1, A-82 Part 9). It is not on `index.ts` and must not become
 * reachable: a caller that can reach both this and `normalizeCityName` will use the wrong one.
 *
 * A name that folds to `''` is **not a match key** — `searchGazetteer` returns `[]` for one rather
 * than treating it as a name every blank row shares (A-14 assertion 5, one module over).
 *
 * Pure. Throws nothing.
 */
export function foldPlaceName(name: string): string {
  const lowered = name.toLowerCase();
  let substituted = '';
  for (const ch of lowered) substituted += SUBSTITUTIONS[ch] ?? ch;
  return nfd(substituted).replace(COMBINING, '').replace(NON_ALNUM, ' ').trim();
}

/**
 * How a candidate string matched, as the first three keys of A-82 Part 4's total order. Lower is
 * better in every position, and the tuple is compared lexicographically.
 *
 *  - `exact`  — 0 when the folded query IS the candidate, 1 when it is only a prefix (rule 1);
 *  - `token`  — 0 for a prefix of the whole candidate, 1 for a prefix of an interior token (rule 2);
 *  - `alt`    — 0 when the candidate is the name, 1 when it is an alternate (rule 3).
 */
type MatchKey = readonly [exact: number, token: number, alt: number];

const NO_MATCH: MatchKey = [9, 9, 9];

/**
 * **Prefix, and token prefix. Never substring** (A-82 Part 3).
 *
 * *"ork"* must not return *"New York"*: an interior match is noise at every useful query length,
 * and a list whose top rows are unexplainable is a list the user stops trusting. *"york"* finding
 * *"New York"* is the one generosity that pays for itself, because a person recalling a trip types
 * the distinctive word.
 */
function matchOne(candidate: string, q: string, alt: number): MatchKey {
  if (candidate === q) return [0, 0, alt];
  if (candidate.startsWith(q)) return [1, 0, alt];
  const tokens = candidate.split(' ');
  for (let i = 1; i < tokens.length; i += 1) {
    if (tokens[i].startsWith(q)) return [1, 1, alt];
  }
  return NO_MATCH;
}

function betterKey(a: MatchKey, b: MatchKey): MatchKey {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? a : b;
  }
  return a;
}

/**
 * A-82 Part 4's label rule, computed here and nowhere else:
 * `[name, admin1 (omitted when '' or equal to name), countryName] joined ', '`.
 *
 * The country name comes from the gazetteer's own `countryNames` table. **When the table cannot
 * name the code, the code itself is used** — a label with a bare code in it is worse than one with
 * a country name and far better than a bare name, which is the thing this rule exists to make
 * unrenderable.
 *
 * **A row with neither a country code nor an admin-1 would render as a bare name, and no such row
 * ships** (A-83 Part 9 clause 1): the generator REFUSES it and publishes the count. The
 * `'Hargeysa, Woqooyi Galbeed, SO'` fallback this docstring used to describe as the codeless case
 * is a *different* case — a code the table cannot name — and it is still live; what is gone is the
 * claim that a bare name is a case this function has to handle at all.
 */
function labelFor(row: GazetteerRow, countryNames: Readonly<Record<string, string>>): string {
  const parts = [row.name];
  if (row.admin1 !== '' && row.admin1 !== row.name) parts.push(row.admin1);
  const code = row.countryCode;
  if (code !== null) parts.push(countryNames[code] ?? code);
  return parts.join(', ');
}

/** Two decimals of a coordinate, for A-83 Part 9 clause 3's disambiguator. */
const dp2 = (n: number): string => (Math.round(n * 100) / 100).toFixed(2);

/**
 * **A-83 Part 9 clause 3 — labels are distinct within one result set.**
 *
 * Measured at the recommended point, **803 labels are carried by more than one row and 23 of round
 * 60's 171 queries return a top-20 containing two identical labels**. A list a user cannot choose
 * from is the exact failure A-82 Part 4 exists to prevent, arriving one level down.
 *
 * When two or more hits **in the returned window** would render the same label, every member of
 * that group gains ` (lat, lng)` at 2 dp. `population` may not be used — A-82 Part 4 forbids
 * rendering it — and the coordinate is the only other fact we actually have. It costs nothing when
 * there is no collision, it is total, and it is testable.
 */
function distinguish(hits: readonly GazetteerHit[]): GazetteerHit[] {
  const counts = new Map<string, number>();
  for (const h of hits) counts.set(h.label, (counts.get(h.label) ?? 0) + 1);
  return hits.map((h) =>
    (counts.get(h.label) ?? 0) > 1
      ? { ...h, label: `${h.label} (${dp2(h.centre.lat)}, ${dp2(h.centre.lng)})` }
      : h,
  );
}

/**
 * **A-83 Part 6's shard resolution, and it is the same function on both sides** — the generator
 * writes a row into the shard of every one of its tokens, and a query is answered from the shard
 * its **first** folded token resolves to. That is complete: if the folded query is a prefix of the
 * whole folded name it is a prefix of its first token, and if it is a prefix of an interior token
 * it is a single token itself — either way the row is in the shard the query resolves to.
 *
 * `splits` is the manifest of prefixes that were split because their payload exceeded 96 KiB. A
 * token under a split prefix descends one character; a token that **is** a split prefix lands in
 * that prefix's terminal `<prefix>$` shard.
 *
 * Pure. Throws nothing. Module-private for group 1's reason: a caller needs a gazetteer, not the
 * ability to mint a shard key.
 */
export function shardKeyFor(token: string, splits: readonly string[]): string {
  const split = new Set(splits);
  let prefix = token.slice(0, 1);
  while (split.has(prefix)) {
    if (token === prefix) return `${prefix}$`;
    prefix = token.slice(0, prefix.length + 1);
  }
  return prefix;
}

/**
 * Searches the gazetteer for a place name the user is typing, and returns a `GazetteerResult` —
 * the corpus's CC BY 4.0 `source` **and** ranked hits each carrying a `label` that names its
 * country. §8.4 **A-91** item 1: the attribution is in the value rather than beside it, so `hits`
 * cannot be destructured without `source` being on the same line.
 *
 * The query is folded with `foldPlaceName`; a query that folds to `''` returns `{source, hits: []}`
 * — **never a bare `[]`, never `{source: ''}` and never `null`**: a miss is the case the licence
 * obligation is easiest to lose in, and `cli.ts cities` has always printed the credit on it. A row matches
 * when the folded query is a prefix of the whole folded name, of any folded alternate, or of any
 * space-delimited token within either. **Never a substring, no fuzzy matching, no edit distance,
 * no phonetics, and no non-Latin scripts in v1** — A-82 Part 3 refuses each by name and A-83 keeps
 * every refusal. **A linear scan over `gazetteer.rows` and no prefix tree**: after A-83 Part 6 a
 * caller holds **one shard** — a few hundred rows — not the whole corpus, so the scan got smaller
 * rather than larger when the dataset grew twentyfold.
 *
 * **The ranking is a total order** (A-82 Part 4), which is what makes an answer pinnable in a
 * golden: exact fold before prefix; whole-name prefix before token prefix; name before alternate;
 * **descending population bucket**; then ascending `fold`, ascending `countryCode`, ascending
 * `id`. The last three decide no answer a user will ever notice and exist only so that a
 * regeneration cannot reshuffle the list.
 *
 * **`population` is a ranking input and is never surfaced as a fact** — it is a coarse power-of-two
 * bucket, and A-83 Part 4 measured that no correct hit falls below rank 5 because of it.
 *
 * **A hit is an offer, not an answer.** A-82 Part 6: a city created from a hit is the user's own
 * *because a human picked it*. Matching a typed name to a row **without** a human choosing — a bulk
 * import, an "we think you meant Paris, France", an auto-select-the-top-hit on blur — is a system
 * assertion, it is covered by the root `CLAUDE.md` badge rule, and it is **forbidden** without a
 * further ruling. Do not build it as a convenience on top of this function.
 *
 * Pure and synchronous.
 *
 * @throws `Error` — a **programmer error** (§2.1), never a domain answer — when `opts.limit` is
 *   present and not an integer (**R60-6**: `{limit: NaN}` used to return `[]`, which is
 *   indistinguishable from a genuine miss), or when `gazetteer.shard` is non-null and the query's
 *   first folded token does not belong to that shard (A-83 Part 7: a consumer that fetched the
 *   wrong shard gets a silently short answer otherwise).
 */
export function searchGazetteer(
  query: string,
  gazetteer: Gazetteer,
  opts?: GazetteerSearchOptions,
): GazetteerResult {
  // **A-91 item 1.** Every return below carries this, including the three early ones and the miss:
  // the attribution is a property of the corpus that was searched, not of whether it answered.
  const source = gazetteer.source;
  const limit = opts?.limit ?? 20;
  if (!Number.isInteger(limit)) {
    throw new Error(
      `searchGazetteer: opts.limit must be an integer, got ${JSON.stringify(opts?.limit)}. ` +
        'A non-integer limit used to return [], which is indistinguishable from a genuine miss.',
    );
  }
  const q = foldPlaceName(query);
  if (q === '') return { source, hits: [] };

  // **A-83 Part 7's pairing check**, before any row is read: a short answer from the wrong shard
  // is the same failure class as a wrong country on a map — quiet and wrong.
  const shard = gazetteer.shard;
  if (shard !== null) {
    const token = q.split(' ')[0];
    const terminal = shard.endsWith('$');
    const prefix = terminal ? shard.slice(0, -1) : shard;
    if (terminal ? token !== prefix : !token.startsWith(prefix)) {
      throw new Error(
        `searchGazetteer: this gazetteer is the "${shard}" shard and "${token}" does not belong ` +
          'to it. Resolve the query with loadGazetteerFor(query) rather than reusing a shard.',
      );
    }
  }
  if (limit <= 0) return { source, hits: [] };

  const matched: Array<{ row: GazetteerRow; key: MatchKey }> = [];
  for (const row of gazetteer.rows) {
    let key = matchOne(row.fold, q, 0);
    for (const alt of row.alts) {
      if (key[0] === 0 && key[1] === 0 && key[2] === 0) break;
      key = betterKey(key, matchOne(alt, q, 1));
    }
    if (key[0] !== NO_MATCH[0]) matched.push({ row, key });
  }

  matched.sort((a, b) => {
    for (let i = 0; i < 3; i += 1) {
      if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i];
    }
    if (a.row.population !== b.row.population) return b.row.population - a.row.population;
    if (a.row.fold !== b.row.fold) return a.row.fold < b.row.fold ? -1 : 1;
    const ac = a.row.countryCode ?? '';
    const bc = b.row.countryCode ?? '';
    if (ac !== bc) return ac < bc ? -1 : 1;
    return a.row.id < b.row.id ? -1 : a.row.id > b.row.id ? 1 : 0;
  });

  return {
    source,
    hits: distinguish(
      matched.slice(0, limit).map(({ row }) => ({ ...row, label: labelFor(row, gazetteer.countryNames) })),
    ),
  };
}

/** A record read out of a JSON document: unknown until every field has been read. */
type Doc = Readonly<Record<string, unknown>>;

const isDoc = (v: unknown): v is Doc => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Decodes `packages/core/src/geo/gazetteer/meta.json` — the session-once document (A-83 Part 5).
 *
 * ```
 * { v, $source, $sourceSha256, $fetched, idPrefix, admin1[], countryNames{}, splits[] }
 * ```
 *
 * **Internal** — a caller needs to pass a gazetteer, not to mint one (§2.10 group 1,
 * `decodeCountryIndex`'s reason verbatim).
 *
 * Pure. Throws `Error` on a document that is not a meta document — a programmer error (a
 * hand-edited generated file), which §2.1 says is the one thing core throws on.
 */
export function decodeGazetteerMeta(doc: unknown): GazetteerMeta {
  if (!isDoc(doc)) throw new Error('decodeGazetteerMeta: the meta document is not an object');
  const source = doc.$source;
  const sha = doc.$sourceSha256;
  const idPrefix = doc.idPrefix;
  const admin1 = doc.admin1;
  const countryNames = doc.countryNames;
  const splits = doc.splits;
  if (
    typeof source !== 'string' ||
    typeof sha !== 'string' ||
    typeof idPrefix !== 'string' ||
    !Array.isArray(admin1) ||
    !isDoc(countryNames) ||
    !Array.isArray(splits)
  ) {
    throw new Error('decodeGazetteerMeta: the meta document is missing a required field');
  }
  return {
    source,
    sourceSha256: sha,
    idPrefix,
    admin1: admin1 as readonly string[],
    countryNames: countryNames as Readonly<Record<string, string>>,
    splits: splits as readonly string[],
  };
}

/** The number of `|`-separated fields one packed row carries. A-83 Part 4's type, in order. */
const ROW_FIELDS = 9;

/**
 * Decodes one shard document against the meta document (A-83 Parts 4 and 5).
 *
 * ```
 * { "v": 1, "k": "<shard key>", "s": "<$sourceSha256>", "r": ["<row>", …] }
 * ```
 *
 * A row is one string, `|`-separated, in the order of `GazetteerRow` **minus the fold**:
 *
 * ```
 * name | alts | iso | admin1Index | populationBucket | lat | lng | id | indexSays
 * ```
 *
 * `alts` is comma-joined and already folded, so it can contain neither `|` nor `,`; the generator
 * **refuses** any row whose name, region or alternate carries the payload's own two delimiters
 * (`|`, a newline) rather than escaping them blind. `admin1Index`, `populationBucket`, `lat` and
 * `lng` are **base 36**; `lat` and `lng` are the coordinate times 10⁴ (~11 m), which is the floor
 * A-83 Part 4 refuses to move. `iso` is `''` for a row that carries no drawable country (A-84
 * Part 5). `id` is the source's row id in base 36, and the **prefix comes from the meta document**
 * rather than from every row. `indexSays` is one character: `a`, `d` or `s`.
 *
 * **The fold is recomputed here rather than shipped** (A-83 Part 4) — KD-112's guarantee, kept
 * without KD-112's bytes.
 *
 * **Internal**, for `decodeGazetteerMeta`'s reason.
 *
 * Pure. Throws `Error` on a malformed document — a programmer error.
 */
export function decodeGazetteer(meta: GazetteerMeta, doc: unknown): Gazetteer {
  if (!isDoc(doc) || typeof doc.k !== 'string' || !Array.isArray(doc.r)) {
    throw new Error('decodeGazetteer: the shard document is missing "k" or "r"');
  }
  const rows: GazetteerRow[] = [];
  for (const packed of doc.r as readonly string[]) {
    const f = packed.split('|');
    if (f.length !== ROW_FIELDS) {
      throw new Error(
        `decodeGazetteer: a row of shard "${doc.k}" has ${f.length} fields, expected ${ROW_FIELDS}`,
      );
    }
    const iso = f[2];
    rows.push({
      name: f[0],
      fold: foldPlaceName(f[0]),
      alts: f[1] === '' ? [] : f[1].split(','),
      countryCode: iso === '' ? null : (iso as CountryCode),
      admin1: f[3] === '' ? '' : (meta.admin1[parseInt(f[3], 36)] ?? ''),
      population: 2 ** parseInt(f[4], 36),
      centre: { lat: parseInt(f[5], 36) / 1e4, lng: parseInt(f[6], 36) / 1e4 },
      id: `${meta.idPrefix}:${f[7]}`,
      indexSays: f[8] === 'a' ? 'agrees' : f[8] === 'd' ? 'differs' : 'silent',
    });
  }
  return { source: meta.source, shard: doc.k, countryNames: meta.countryNames, rows };
}

/**
 * The two dynamic imports `loadGazetteer` needs, injected rather than reached for — which is what
 * keeps this module pure and keeps `packages/core/src/index.ts` off the generated family.
 *
 * `shard` returns `null` for a key nobody wrote: the generated map knows its own keys, so an
 * absent shard is an honest empty answer and a genuine load failure stays loud.
 */
export type GazetteerDocuments = {
  readonly meta: () => Promise<{ default: unknown }>;
  readonly shard: (key: string) => Promise<{ default: unknown } | null>;
};

/**
 * One meta document per `GazetteerDocuments`, however many searches run — A-83 Part 5's *"fetched
 * once per session"*. Keyed on the injected object rather than on module scope so a test can hand
 * in a second corpus and not get the first one's dictionary.
 */
const META_ONCE = new WeakMap<GazetteerDocuments, Promise<GazetteerMeta>>();

/**
 * **Resolves a query to exactly one shard and returns it, decoded** — §8.4 **A-83** Part 7.
 *
 * This is the impure half of the gazetteer and the only one: it awaits two dynamic imports.
 * `searchGazetteer(query, gazetteer, opts?)` stays pure, synchronous and index-injected, exactly
 * as `countryOf(at, index)` is. `@cairn/core/gazetteer` carries one runtime symbol,
 * `loadGazetteerFor(query)`, which is this function with the generated documents bound to it.
 *
 * **A query that cannot resolve to a single shard returns `null`, and `null` means "keep
 * typing"** (A-83 Part 6). That is two cases and they are one rule:
 *
 *  - a **folded query** under **two characters** — Part 6's own case, stated by length, and it is
 *    the *query* that is measured, not its first token (**QA R67-2**: this used to read
 *    `q.split(' ')[0].length < 2`, so `A Coruña` — eight characters, 245,000 people — was told to
 *    keep typing, and 152 shipped rows answered nothing when a user typed their own full name.
 *    The answer was on disk the whole time: a one-character first token resolves to the terminal
 *    `a$` shard, which holds exactly the rows whose first token *is* `a`, and searching it returns
 *    the row. A one-character *query* still returns `null`, which is the case Part 6 actually
 *    rules);
 *  - a **one-token query that IS a split prefix** — the same case, stated by the manifest instead
 *    of by an assumption about how deep the tree goes. `de` is a split prefix in the shipped
 *    corpus, so the true answer to `de` spans that prefix's whole subtree — `del`, `den`, `det`
 *    and the rest — and Part 6's answer to exactly that shape is *"the correct answer is a fetch
 *    of everything under that prefix; this design refuses that."*
 *
 * **A query with a SECOND word is not that case, and the difference is load-bearing.** `san` is a
 * split prefix, but `san marino` can only match a row whose whole fold begins `san marino`, so its
 * first token is exactly `san` — and every such row is in the terminal `san$` shard. A terminal
 * shard is therefore a real answer to a multi-word query and is refused only for the bare prefix.
 *
 * The distinction matters because A-82's rule is that *a miss is a miss and the product says so*,
 * and **"I have not looked yet" is not a miss.**
 *
 * > **What this buys, stated as the property a test can hold it to:** for every query this
 * > function answers with a `Gazetteer`, searching that one shard returns exactly what searching
 * > the whole corpus would — row for row and in order.
 *
 * **The two documents are checked against each other.** The admin-1 dictionary is global, so a
 * shard built against a different corpus would decode its regions through the wrong table; both
 * documents carry the same `$sourceSha256` and a pair that disagrees is **refused by name**.
 *
 * @throws `Error` when the two documents' checksums disagree, or when either is malformed — both
 *   programmer errors (§2.1), because both mean a hand-edited or half-regenerated generated file.
 */
export async function loadGazetteer(
  query: string,
  docs: GazetteerDocuments,
): Promise<Gazetteer | null> {
  const q = foldPlaceName(query);
  if (q.length < 2) return null;
  const token = q.split(' ')[0];

  let metaOnce = META_ONCE.get(docs);
  if (metaOnce === undefined) {
    metaOnce = docs.meta().then((m) => decodeGazetteerMeta(m.default));
    META_ONCE.set(docs, metaOnce);
  }
  const meta = await metaOnce;

  // A bare prefix that the corpus split has no single shard: its true answer is the subtree.
  // A query with a second word does — see the docstring.
  if (q === token && meta.splits.includes(token)) return null;

  const key = shardKeyFor(token, meta.splits);
  const mod = await docs.shard(key);
  if (mod === null) {
    return { source: meta.source, shard: key, countryNames: meta.countryNames, rows: [] };
  }
  const doc = mod.default;
  const sha = isDoc(doc) ? doc.s : undefined;
  if (sha !== meta.sourceSha256) {
    throw new Error(
      `loadGazetteer: shard "${key}" carries $sourceSha256 ${JSON.stringify(sha)} and meta.json ` +
        `carries ${JSON.stringify(meta.sourceSha256)}. Refusing to decode it: the admin-1 ` +
        'dictionary is global, so a mismatched pair labels rows with another corpus’s regions.',
    );
  }
  return decodeGazetteer(meta, doc);
}

/**
 * **The only mint for a `CityPick`** — §8.4 **A-84** Part 3 clause 4. Pure, synchronous, no
 * corpus, no network, no id factory.
 *
 * **It takes a ROW, not a string, and that is the enforcement.** A-82 Part 6 forbids an
 * auto-match — a system pairing a typed name with a row without a human choosing it — and this
 * signature turns that prohibition into a shape: a caller that does not hold a `GazetteerRow`
 * cannot produce a pick, and the only way to hold one is `searchGazetteer`, which is what a human
 * is looking at when they choose.
 *
 * It copies three things and derives nothing: the row's id, a **fresh** copy of the row's centre
 * (never the row's own object — an aliased corpus is a write to a trip landing in the gazetteer),
 * and the row's country code, with any value that is not two uppercase letters mapped to `null`.
 * That last clause is what makes the mint and `parseCityPick` **agree** rather than merely
 * coexist. **After §8.4 A-84 Part 5 the corpus itself carries `null` rather than `''`** for a row
 * whose country the shipped index cannot draw, so the clause has less to do; it stays because a
 * hand-built row is still a row, and a pick carrying `''` is a document this build refuses to
 * open.
 *
 * @throws nothing.
 */
export function cityPickFromRow(row: GazetteerRow): CityPick {
  const code = row.countryCode;
  return {
    rowId: row.id,
    centre: { lat: row.centre.lat, lng: row.centre.lng },
    countryCode: code !== null && /^[A-Z]{2}$/.test(code) ? code : null,
  };
}
