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

/** One settlement, as the gazetteer stores it (A-82 Part 3). */
export type GazetteerRow = {
  /** Display form, the source's own spelling: `'Zürich'`, `'São Paulo'`. */
  readonly name: string;
  /** `foldPlaceName(name)` — the matching form: `'zurich'`, `'sao paulo'`. */
  readonly fold: string;
  /** Folded Latin-script alternates. A fold equal to `fold` is not one of them. */
  readonly alts: readonly string[];
  /** `''` is legal and honest — A-82 Part 5: the source carried no code and none was derivable. */
  readonly countryCode: CountryCode | '';
  /** `''` when the source has none (city-states). */
  readonly admin1: string;
  /** `POP_MAX`, **for ranking only**. Never displayed as a fact about a city (A-82 Part 4). */
  readonly population: number;
  readonly centre: LatLng;
  /**
   * The source's stable row id, **prefixed with the dataset that minted it**: `'ne:<NE_ID base 36>'`
   * today, `'gn:…'` after I-23 (§8.4 **A-83** Part 8).
   *
   * The prefix is not decoration. This value is what a `CityPick.rowId` persists, so a stored
   * pick has to say **which corpus** it came from — otherwise a regeneration onto a different source
   * turns every stored id into a collision waiting to be misread. It is also still what makes a
   * regeneration diff readable, which is A-82 Part 2's own reason for carrying it.
   */
  readonly id: string;
  /**
   * **Whether `countryOf(centre, COUNTRY_INDEX)` agrees with `countryCode`** — §8.4 **A-83**
   * Part 8, and it is the field that restated A-82 Part 5's invariant rather than weakening it.
   *
   * > **No shipped row may *silently* contradict the country index.**
   *
   * `true` when the index agrees or is silent. `false` when both answers are non-null and
   * **differ** — 98 rows today, among them Brazzaville, Geneva, Jerusalem, Maastricht, Lugano
   * and Arlon, every one of which A-82 Part 5 refused outright. A row that would contradict the
   * index *without* carrying this record is still **REFUSED**; what changed is that carrying it
   * is now possible, because `City.pick` lets `derive/summary.ts` tell a picked pair from a
   * typed field — §8.4 **A-84** Part 3: the pair is carried on the pick itself, so `summary.ts`
   * reads a different field rather than the same field under a flag.
   *
   * A coarse ring bulges outward (A-26 Part 2), so where the two disagree the gazetteer is
   * generally right and the polygon is generally wrong about a town near a frontier — which is
   * why a **picked** row's country outranks `countryOf` and a typed one's still does not.
   */
  readonly indexAgrees: boolean;
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
  readonly countryNames: Readonly<Record<string, string>>;
  readonly rows: readonly GazetteerRow[];
};

/**
 * A search result: the row, plus the **label `searchGazetteer` computed itself**.
 *
 * A-82 Part 4: *"No consumer composes a label from parts, and no consumer may render a hit by
 * `name` alone."* 199 folded names in the shipped layer are carried by more than one row and
 * three of them are called London.
 */
export type GazetteerHit = GazetteerRow & { readonly label: string };

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
 * `ʻ` (U+02BB) and `ʼ` (U+02BC) are **deleted** rather than spaced, which is what folds
 * `Nukuʻalofa` to `nukualofa` and not to `nuku alofa`.
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
 * **The ordering is load-bearing, and measurement narrows A-82's own statement of why — KD-113.**
 * The ruling says *"step 1 precedes step 3"* on the ground that `İ` decomposes; measured on this
 * runtime, `'İ'.normalize('NFD') === 'İ'` — U+0130 has **no canonical decomposition**, and the
 * `i` + U+0307 the ruling describes is produced by **step 1**, not step 3. So the dependency that
 * actually holds is **step 1 before step 4**: the combining mark `toLowerCase` mints must still be
 * there when the `Mn` strip runs. **Step 1 before step 2 is load-bearing too** — the table's keys
 * are lowercase, so `Ł` and `Đ` survive a substitution that runs first. **Steps 2–4 are not
 * commutative either** — `ø` must be substituted *before* NFD, because NFD leaves it alone and
 * step 4 would then have nothing to strip. All four claims are pinned by the twelve pairs in
 * `packages/core/test/gazetteer.test.ts`.
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
 * name the code, the code itself is used** — `'Hargeysa, Woqooyi Galbeed, SO'` is a worse label
 * than one with a country name in it and a far better one than a bare `'Hargeysa'`, which is the
 * thing this rule exists to make unrenderable. A row with neither a country code nor an admin-1 is
 * the only case that can produce a bare name, and A-82 Part 5 is why such a row is honest rather
 * than broken: nobody could say what country it is in.
 */
function labelFor(row: GazetteerRow, countryNames: Readonly<Record<string, string>>): string {
  const parts = [row.name];
  if (row.admin1 !== '' && row.admin1 !== row.name) parts.push(row.admin1);
  const country = countryNames[row.countryCode] ?? row.countryCode;
  if (country !== '') parts.push(country);
  return parts.join(', ');
}

/**
 * Searches the gazetteer for a place name the user is typing, and returns ranked hits each
 * carrying a `label` that names its country.
 *
 * The query is folded with `foldPlaceName`; a query that folds to `''` returns `[]`. A row matches
 * when the folded query is a prefix of the whole folded name, of any folded alternate, or of any
 * space-delimited token within either. **Never a substring, no fuzzy matching, no edit distance,
 * no phonetics, and no non-Latin scripts in v1** — A-82 Part 3 refuses each by name. The scan is
 * **linear over `gazetteer.rows` and there is no prefix tree**: measured scale is ~7,000 short
 * strings, and a trie is a second data structure to keep correct, to serialize and to test.
 *
 * **The ranking is a total order** (A-82 Part 4), which is what makes an answer pinnable in a
 * golden: exact fold before prefix; whole-name prefix before token prefix; name before alternate;
 * **descending population**; then ascending `fold`, ascending `countryCode`, ascending `id`. The
 * last three decide no answer a user will ever notice and exist only so that a regeneration cannot
 * reshuffle the list.
 *
 * **`population` is a ranking input and is never surfaced as a fact.** `POP_MAX` is a
 * metropolitan-area figure of uncertain vintage.
 *
 * **A hit is an offer, not an answer.** A-82 Part 6: a city created from a hit is the user's own
 * *because a human picked it*. Matching a typed name to a row **without** a human choosing — a bulk
 * import, an "we think you meant Paris, France", an auto-select-the-top-hit on blur — is a system
 * assertion, it is covered by the root `CLAUDE.md` badge rule, and it is **forbidden** without a
 * further ruling. Do not build it as a convenience on top of this function.
 *
 * Pure. Throws nothing.
 */
export function searchGazetteer(
  query: string,
  gazetteer: Gazetteer,
  opts?: GazetteerSearchOptions,
): GazetteerHit[] {
  const q = foldPlaceName(query);
  const limit = opts?.limit ?? 20;
  if (q === '' || limit <= 0) return [];

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
    if (a.row.countryCode !== b.row.countryCode) return a.row.countryCode < b.row.countryCode ? -1 : 1;
    return a.row.id < b.row.id ? -1 : a.row.id > b.row.id ? 1 : 0;
  });

  return matched
    .slice(0, limit)
    .map(({ row }) => ({ ...row, label: labelFor(row, gazetteer.countryNames) }));
}

/**
 * Decodes the packed payload the generated module carries. **Internal** — a caller needs to pass a
 * gazetteer, not to mint one (§2.10 group 1, `decodeCountryIndex`'s reason verbatim).
 *
 * The payload is one string literal in the `.ts` file, which is one token to Node's type stripper.
 * Its grammar, newline-separated so that a regeneration diff is one row on one key rather than a
 * wall of reordered text (A-82 Part 10):
 *
 * ```
 * line 0            nAdmin1|nCountries|nRows
 * next nAdmin1      one admin-1 name per line (the dictionary)
 * next nCountries   "CC Country Name"  (A-82 Part 4's code→name table, from ADM0NAME)
 * next nRows        name|fold|alts|iso|admin1Index|population|lat|lng|id|agrees
 * ```
 *
 * `alts` is comma-joined and already folded, so it can contain no `|` and no `,`. `admin1Index`,
 * `population`, `lat` and `lng` are **base 36**; `lat` and `lng` are the coordinate times
 * 10⁴ (~11 m), rounded — two orders of magnitude finer than any question a city centre answers.
 * `id` is the source prefix, a colon and the source's own row id in base 36.
 *
 * **`agrees` is `'1'` or `'0'`** — §8.4 A-83 Part 8's `indexAgrees`, one character per row so a
 * regeneration diff on it is one visible character on one stable id. It is written explicitly
 * rather than by omission: a field whose *absence* means `true` is a field a truncated line turns
 * into a silent claim, and the whole point of this one is that nothing is silent.
 *
 * Pure. Throws `Error` on a payload whose declared counts do not match its lines — that is a
 * programmer error (a hand-edited generated module), which §2.1 says is the one thing core throws
 * on.
 */
export function decodeGazetteer(meta: { source: string }, packed: string): Gazetteer {
  const lines = packed.split('\n');
  const header = (lines[0] ?? '').split('|');
  const nAdmin1 = Number(header[0]);
  const nCountries = Number(header[1]);
  const nRows = Number(header[2]);
  if (!Number.isInteger(nAdmin1) || !Number.isInteger(nCountries) || !Number.isInteger(nRows)) {
    throw new Error('decodeGazetteer: the payload has no "nAdmin1|nCountries|nRows" header');
  }
  if (lines.length !== 1 + nAdmin1 + nCountries + nRows) {
    throw new Error(
      `decodeGazetteer: the payload declares ${1 + nAdmin1 + nCountries + nRows} lines and carries ${lines.length}`,
    );
  }

  let at = 1;
  const admin1 = lines.slice(at, at + nAdmin1);
  at += nAdmin1;

  const countryNames: Record<string, string> = {};
  for (let i = 0; i < nCountries; i += 1) {
    const line = lines[at + i];
    countryNames[line.slice(0, 2)] = line.slice(3);
  }
  at += nCountries;

  const rows: GazetteerRow[] = [];
  for (let i = 0; i < nRows; i += 1) {
    const f = lines[at + i].split('|');
    rows.push({
      name: f[0],
      fold: f[1],
      alts: f[2] === '' ? [] : f[2].split(','),
      countryCode: f[3],
      admin1: f[4] === '' ? '' : admin1[parseInt(f[4], 36)],
      population: parseInt(f[5], 36),
      centre: { lat: parseInt(f[6], 36) / 1e4, lng: parseInt(f[7], 36) / 1e4 },
      id: f[8],
      indexAgrees: f[9] !== '0',
    });
  }
  return { source: meta.source, countryNames, rows };
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
 * coexist: the corpus carries `''` for a row whose source stated no code, and a pick carrying
 * `''` would be a document this build refuses to open.
 *
 * @throws nothing.
 */
export function cityPickFromRow(row: GazetteerRow): CityPick {
  const code = row.countryCode;
  return {
    rowId: row.id,
    centre: { lat: row.centre.lat, lng: row.centre.lng },
    countryCode: /^[A-Z]{2}$/.test(code) ? (code as CountryCode) : null,
  };
}
