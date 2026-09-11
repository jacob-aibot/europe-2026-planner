/**
 * R60 — the fold, the match rule, the ranking's totality and the label rule, attacked beyond
 * A-82 Part 3's twelve verified pairs.
 *
 * Sections:
 *   A  the fold, on scripts/diacritics NOT in the twelve, both directions of the Turkish pair,
 *      `ß`/`ss`, ligatures, and the NFD-vs-substitution-table split
 *   B  `foldPlaceName` vs `normalizeCityName` — still genuinely independent, and still divergent
 *   C  the match rule as a CEILING: prefix, token prefix, never substring, no fuzzy
 *   D  the ranking is TOTAL — shuffle the shipped rows N times and require byte-identical answers
 *      over a wide query set, and count the rows that actually reach the `id` tie-break
 *   E  the label rule — every hit labelled; how many labels are BARE names; how many hits in one
 *      answer share an IDENTICAL label (a list a user cannot disambiguate)
 *   F  `--limit` / degenerate-argument behaviour
 *
 * Run: node qa/r60-fold-search.mjs        (from cairn/)
 */
// QA round 70: `I-23` renamed the subpath's one symbol `GAZETTEER` -> `loadGazetteerFor(query)`,
// which left this probe crashing at import. `qa/corpus.mjs`'s `wholeCorpus()` is the re-cut five
// other probes already use: every committed shard, deduplicated by row id, decoded by the
// product's own decoder. It answers *is the row in the corpus?*, which is what this file asks.
const { wholeCorpus } = await import('./corpus.mjs');
const GAZETTEER = wholeCorpus().gazetteer;
const core = await import('../packages/core/src/index.ts');
const { searchGazetteer } = core;
const { normalizeCityName } = await import('../packages/core/src/model/cityName.ts');

// `foldPlaceName` is module-private by A-82 Part 3, so this probe reaches it through the module
// path directly — a TEST reach-in, never a product one. Nothing here is shipped.
const { foldPlaceName } = await import('../packages/core/src/geo/gazetteer.ts');

let fails = 0;
const check = (cond, msg) => {
  if (!cond) {
    fails += 1;
    console.log(`  FAIL  ${msg}`);
  } else {
    console.log(`  ok    ${msg}`);
  }
};

console.log('## A — the fold, outside A-82 Part 3\'s twelve pairs');
const FOLDS = [
  // Turkish, both directions of the dotted/dotless pair
  ['İstanbul', 'istanbul', 'A-82 pair (control)'],
  ['İzmir', 'izmir', 'dotted capital I'],
  ['Iğdır', 'igdir', 'DOTLESS ı in the name, ASCII I at the front'],
  ['Kırıkkale', 'kirikkale', 'three dotless ı'],
  ['ısparta', 'isparta', 'lowercase dotless ı at position 0'],
  ['IĞDIR', 'igdir', 'all-caps Turkish'],
  // German sharp s, both cases
  ['Großenhain', 'grossenhain', 'ß -> ss'],
  ['GROSSENHAIN', 'grossenhain', 'the ss spelling folds the same'],
  ['Weißenfels', 'weissenfels', 'ß mid-word'],
  ['STRAßE', 'strasse', 'uppercase word with a lowercase ß'],
  // Nordic / Icelandic
  ['Þórshöfn', 'thorshofn', 'þ + ö'],
  ['Ísafjörður', 'isafjordur', 'ð and ö'],
  ['Ålesund', 'alesund', 'Å (NFD-decomposable)'],
  ['Kópavogur', 'kopavogur', 'ó'],
  // Central / Eastern European
  ['Timișoara', 'timisoara', 'ș comma-below (NFD)'],
  ['Chișinău', 'chisinau', 'ș + ă'],
  ['Gdańsk', 'gdansk', 'ń'],
  ['Plzeň', 'plzen', 'ň'],
  ['Székesfehérvár', 'szekesfehervar', 'Hungarian double acutes'],
  ['Győr', 'gyor', 'ő'],
  // Vietnamese stacked marks
  ['Đà Nẵng', 'da nang', 'Đ + stacked tone marks'],
  ['Huế', 'hue', 'ế'],
  // Catalan / Maltese / French
  ['Coŀlegi', 'collegi', 'ŀ middle dot'],
  ['Ħamrun', 'hamrun', 'ħ'],
  ['Œuf', 'oeuf', 'œ ligature IS in the table'],
  ['Æbeltoft', 'aebeltoft', 'Æ'],
  // punctuation, spacing, apostrophes
  ["Coeur d'Alene", 'coeur d alene', "ASCII ' becomes a space (step 5)"],
  ['Nukuʻalofa', 'nukualofa', 'U+02BB DELETED, not spaced'],
  ['Mont-Saint-Michel', 'mont saint michel', 'hyphens -> spaces'],
  ['  Zürich  ', 'zurich', 'leading/trailing space trimmed'],
  ['St. John’s', 'st john s', 'U+2019 curly apostrophe is NOT in the table -> a space'],
  // the deferred cases, asserted as deferred rather than as working
  ['Ｔｏｋｙｏ', 'ｔｏｋｙｏ', 'FULLWIDTH letters survive: NFD is not NFKD (deferred, Part 11)'],
  ['ﬁrenze', 'ﬁrenze', 'the fi LIGATURE U+FB01 survives: NFD is not NFKD (deferred)'],
  ['東京', '東京', 'CJK folds to itself — A-82 Part 3 defers non-Latin'],
  ['Αθήνα', 'αθηνα', 'Greek lowercases and strips marks but does NOT transliterate (deferred)'],
  ['Москва', 'москва', 'Cyrillic folds to itself (deferred)'],
  ['', '', 'the empty string'],
  ['   ', '', 'whitespace only'],
  ['---', '', 'punctuation only'],
];
for (const [input, want, why] of FOLDS) {
  const got = foldPlaceName(input);
  check(got === want, `foldPlaceName(${JSON.stringify(input)}) = ${JSON.stringify(got)} — ${why}`);
}

console.log('');
console.log('## B — foldPlaceName vs normalizeCityName: independent, and still divergent');
const src = (await import('node:fs')).readFileSync(
  new URL('../packages/core/src/geo/gazetteer.ts', import.meta.url),
  'utf8',
);
check(!/from '\.\.\/model\/cityName/.test(src), 'gazetteer.ts does not import model/cityName.ts');
check(!/normalizeCityName/.test(src.replace(/\/\*\*[\s\S]*?\*\//g, '')), 'gazetteer.ts names normalizeCityName only in prose');
const cityNameSrc = (await import('node:fs')).readFileSync(
  new URL('../packages/core/src/model/cityName.ts', import.meta.url),
  'utf8',
);
check(!/gazetteer/i.test(cityNameSrc), 'cityName.ts does not reach the gazetteer');
const DIVERGE = ['Zürich', 'São Paulo', 'Łódź', 'Malmö', 'İstanbul', 'Đông Hà', 'Großenhain'];
let diverged = 0;
for (const n of DIVERGE) {
  const a = foldPlaceName(n);
  const b = normalizeCityName(n);
  if (a !== b) diverged += 1;
  console.log(`  fold=${JSON.stringify(a).padEnd(18)} normalize=${JSON.stringify(b).padEnd(18)} ${n}`);
}
check(diverged === DIVERGE.length, `all ${DIVERGE.length} accented names fold DIFFERENTLY from normalizeCityName — they have not collapsed`);

console.log('');
console.log('## C — the match rule as a ceiling');
const { hits: ork } = searchGazetteer('ork', GAZETTEER, { limit: 100 });
check(ork.every((h) => !/york/i.test(h.name)), `'ork' returns ${ork.length} rows, none of them a York (substring is refused)`);
const { hits: york } = searchGazetteer('york', GAZETTEER, { limit: 100 });
check(york.some((h) => h.name === 'New York'), `'york' finds New York at rank ${york.findIndex((h) => h.name === 'New York') + 1} (token prefix)`);
check(searchGazetteer('', GAZETTEER).hits.length === 0, `'' returns 0`);
check(searchGazetteer('   ', GAZETTEER).hits.length === 0, `'   ' returns 0`);
check(searchGazetteer('!!!', GAZETTEER).hits.length === 0, `'!!!' folds to '' and returns 0`);
check(searchGazetteer('東京', GAZETTEER).hits.length === 0, `a CJK query returns 0 (deferred, not a crash)`);
// fuzzy / edit distance must NOT be present
check(searchGazetteer('zurick', GAZETTEER).hits.length === 0, `'zurick' (one typo) returns 0 — no fuzzy matching`);
check(searchGazetteer('londin', GAZETTEER).hits.length === 0, `'londin' returns 0 — no edit distance`);
// interior-token prefix only, never interior-character
const { hits: angeles } = searchGazetteer('angeles', GAZETTEER, { limit: 50 });
check(angeles.some((h) => h.name === 'Los Angeles'), `'angeles' finds Los Angeles (A-82's own example)`);
check(searchGazetteer('ngeles', GAZETTEER, { limit: 50 }).hits.every((h) => h.name !== 'Los Angeles'), `'ngeles' does NOT find Los Angeles`);

console.log('');
console.log('## D — the ranking is total');
const QUERIES = [
  'a', 'b', 'san', 'santa', 'new', 'london', 'paris', 'springfield', 'york', 'nara', 'saint',
  'port', 'north', 'el', 'la', 'al', 'ba', 'ko', 'vi', 'columbia', 'crato', 'nakhodka',
  'noginsk', 'vila velha', 'zurich', 'sao', 'i', 'e', 'ne', 'ha',
];
const shuffle = (arr, seed) => {
  const a = arr.slice();
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const key = (hits) => hits.map((h) => `${h.id}|${h.label}`).join('\n');
let unstable = 0;
for (const qy of QUERIES) {
  const base = key(searchGazetteer(qy, GAZETTEER, { limit: 200 }).hits);
  for (const seed of [1, 7, 99, 12345, 987654321]) {
    const shuffled = { ...GAZETTEER, rows: shuffle(GAZETTEER.rows, seed) };
    if (key(searchGazetteer(qy, shuffled, { limit: 200 }).hits) !== base) {
      unstable += 1;
      console.log(`  FAIL  '${qy}' reorders under a shuffled rows array (seed ${seed})`);
    }
  }
  // reversed, too — the builder's own N7 strengthening
  const rev = { ...GAZETTEER, rows: GAZETTEER.rows.slice().reverse() };
  if (key(searchGazetteer(qy, rev, { limit: 200 }).hits) !== base) {
    unstable += 1;
    console.log(`  FAIL  '${qy}' reorders under a reversed rows array`);
  }
}
check(unstable === 0, `${QUERIES.length} queries x 6 permutations: the answer never reorders`);

// how many pairs actually reach each tie-break — is the id key non-vacuous on real data?
const byFPC = new Map();
for (const r of GAZETTEER.rows) {
  const k = `${r.fold} :: ${r.population} :: ${r.countryCode}`;
  byFPC.set(k, (byFPC.get(k) ?? 0) + 1);
}
const fullTies = [...byFPC.entries()].filter(([, n]) => n > 1);
console.log(`  rows tying on (fold, population, countryCode) — the id key decides these: ${fullTies.reduce((s, [, n]) => s + n, 0)} rows in ${fullTies.length} groups`);
for (const [k, n] of fullTies) console.log(`      ${n}x  ${k.split(' :: ')[0]} (${k.split(' :: ')[2]}, pop ${k.split(' :: ')[1]})`);
check(fullTies.length > 0, 'the final id tie-break is NON-VACUOUS on the shipped data');

// the id key is a STRING compare over base-36 of varying length; the generator's emission order
// uses a NUMERIC compare on NE_ID. Measure whether the two orders can disagree.
const idLens = new Set(GAZETTEER.rows.map((r) => r.id.length));
console.log(`  base-36 id lengths present: ${[...idLens].sort().join(', ')}`);

console.log('');
console.log('## E — the label rule');
let bare = 0;
const bareNames = [];
const allHits = [];
for (const qy of ['a', 'b', 'c', 'ha', 'be', 'ky', 'fa', 'ma', 'la']) {
  allHits.push(...searchGazetteer(qy, GAZETTEER, { limit: 500 }).hits);
}
for (const r of GAZETTEER.rows) {
  const hit = searchGazetteer(r.name, GAZETTEER, { limit: 500 }).hits.find((h) => h.id === r.id);
  if (!hit) continue;
  if (typeof hit.label !== 'string' || hit.label === '') { bare += 1; bareNames.push(`${r.name} (EMPTY LABEL)`); continue; }
  if (hit.label === hit.name) { bare += 1; bareNames.push(r.name); }
}
console.log(`  shipped rows whose own label is a BARE NAME (no admin1, no country): ${bare}`);
for (const n of bareNames) console.log(`      ${n}`);
check(
  bare === 0,
  `A-82 Part 4 / ROADMAP I-21: "every returned hit's label contains a country name" — ${bare} shipped rows render as a bare name`,
);

// identical labels inside ONE answer: a list the user cannot disambiguate
let collidingQueries = 0;
const collisions = [];
for (const r of GAZETTEER.rows) {
  const { hits } = searchGazetteer(r.fold, GAZETTEER, { limit: 20 });
  const labels = hits.map((h) => h.label);
  const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
  if (dupes.length) {
    collidingQueries += 1;
    if (collisions.length < 25) collisions.push(`${r.fold} -> ${[...new Set(dupes)].join(' | ')}`);
  }
}
console.log(`  queries (one per shipped fold) whose top-20 contains TWO ROWS WITH THE SAME LABEL: ${collidingQueries}`);
for (const c of collisions) console.log(`      ${c}`);

console.log('');
console.log('## F — degenerate options');
check(searchGazetteer('london', GAZETTEER, { limit: 0 }).hits.length === 0, 'limit 0 -> []');
check(searchGazetteer('london', GAZETTEER, { limit: -5 }).hits.length === 0, 'limit -5 -> []');
const { hits: frac } = searchGazetteer('san', GAZETTEER, { limit: 2.5 });
console.log(`  limit 2.5 -> ${frac.length} rows (Array.slice truncates; not validated by searchGazetteer)`);
const { hits: nan } = searchGazetteer('san', GAZETTEER, { limit: Number.NaN });
console.log(`  limit NaN -> ${nan.length} rows`);
const { hits: inf } = searchGazetteer('san', GAZETTEER, { limit: Number.POSITIVE_INFINITY });
console.log(`  limit Infinity -> ${inf.length} rows`);
check(Object.isFrozen(GAZETTEER) || true, 'note only');
const before = GAZETTEER.rows.length;
searchGazetteer('london', GAZETTEER).hits.forEach((h) => { try { h.alts.push?.('x'); } catch { /* readonly */ } });
check(GAZETTEER.rows.length === before, 'searchGazetteer did not mutate the injected gazetteer length');

console.log('');
console.log(fails === 0 ? 'ALL CLEAR' : `${fails} FAILURE(S)`);
process.exitCode = fails === 0 ? 0 : 1;

console.log('');
console.log('## G — label quality the ruling does not cover');
const mojibake = GAZETTEER.rows.filter((r) => /[?�]/.test(r.admin1));
const distinct = [...new Set(mojibake.map((r) => r.admin1))].sort();
console.log(`  shipped rows whose ADM1NAME is CORRUPTED in the source (contains ? or U+FFFD): ${mojibake.length} rows, ${distinct.length} distinct names`);
for (const r of mojibake.slice(0, 6)) {
  const hit = searchGazetteer(r.name, GAZETTEER, { limit: 50 }).hits.find((h) => h.id === r.id);
  console.log(`      label as rendered: "${hit ? hit.label : '?'}"`);
}
console.log(`  A-82 Part 12 residue 4 covers "not localised"; it does not cover "not readable".`);

console.log('');
console.log('## H — the payload\'s own delimiters are not guarded by the generator');
const gensrc = (await import('node:fs')).readFileSync(new URL('../tools/gen-gazetteer.mjs', import.meta.url), 'utf8');
const guarded = (needle) => gensrc.includes(`packed.includes(${needle})`);
console.log(`  emit() guards a backslash : ${guarded(String.fromCharCode(39) + '\\\\' + String.fromCharCode(39))}`);
console.log(`  emit() guards "\${"        : ${guarded("'\${'")}`);
console.log(`  emit() guards "|"          : ${guarded("'|'")}   <-- the FIELD separator`);
console.log(`  emit() guards a newline    : ${guarded("'\\n'")}   <-- the ROW separator`);
console.log('  roundTrip() compares the emitted literal to pack(built) — two strings — so a `|` inside');
console.log('  a NAME would shift every field of that row and round-trip clean. No occurrence today.');

console.log('');
console.log('## I — the coverage miss and the wrong-country hit, as a user meets them');
for (const q of ['obidos', 'windsor', 'saint-georges', 'geneva', 'brazzaville', 'jerusalem']) {
  const { hits } = searchGazetteer(q, GAZETTEER, { limit: 3 });
  console.log(`  ${q.padEnd(15)} ${hits.length === 0 ? 'no match' : hits.map((h) => h.label).join('  ·  ')}`);
}
