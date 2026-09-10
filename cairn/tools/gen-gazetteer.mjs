/**
 * gen-gazetteer.mjs — builds the sharded offline city gazetteer under
 * `packages/core/src/geo/gazetteer/` from **GeoNames** (ARCHITECTURE §8.4 **A-83**, with
 * **A-84** Parts 5 and 6; ROADMAP Phase 2 **I-23**).
 *
 * Run:
 *   node tools/gen-gazetteer.mjs               # fetch, verify, build, write the corpus + goldens
 *   node tools/gen-gazetteer.mjs --dry-run     # measure and audit, write nothing
 *   node tools/gen-gazetteer.mjs --audit-only  # audit the COMMITTED corpus, fetch nothing
 *   node tools/gen-gazetteer.mjs --audit-only --write
 *                                              # …and rewrite fixtures/golden/gazetteer-probes.json
 *   node tools/gen-gazetteer.mjs --repin       # the ONLY path from a checksum mismatch to a write
 *
 * `--cache <dir>` (or `CAIRN_GAZETTEER_CACHE`) keeps the five downloaded source files on disk
 * between runs. **It is not a way around the pin**: a cached file is checksummed on every run
 * exactly as a fetched one is, and a mismatch reports and refuses to write. It exists because the
 * ship gate runs this generator twice and re-downloading 625 MB to prove determinism proves
 * nothing about determinism.
 *
 * ---------------------------------------------------------------------------------------------
 * ## Attribution — this repository's FIRST licence obligation
 *
 * **GeoNames is licensed CC BY 4.0.** Natural Earth, which this generator's predecessor used and
 * which `tools/gen-countries.mjs` still uses, is public domain and needed none. Verified
 * 2026-09-09 from the dump's own `readme.txt`:
 *
 * > *"This work is licensed under a Creative Commons Attribution 4.0 License … The Data is
 * > provided 'as is' without warranty or any representation of accuracy, timeliness or
 * > completeness."*
 *
 * Two consequences, both binding (A-83 Part 2):
 *
 *  1. **The attribution rides on the DATA, not on this comment.** `meta.json`'s `$source` carries
 *     the attribution text and the licence URL, `Gazetteer.source` is that string, and **any
 *     surface that renders a hit must render the attribution**. `cli.ts cities` prints it once per
 *     run, which is what makes the obligation testable before a screen exists.
 *  2. **The "as is, no representation of accuracy" clause is ours to honour, not to repeat.** It
 *     is why a disagreement between this dataset and the shipped country index stays **visible**
 *     (`indexSays: 'differs'`) instead of being resolved silently, and why `population` is never
 *     rendered as a fact about a place.
 *
 * ## THE CORPUS CANNOT BE REBUILT FROM SOURCE — by anybody, including us
 *
 * Say that plainly rather than implying otherwise. §8.4 **A-90**, §0 position **11**. Verified
 * 2026-09-10 directly against `download.geonames.org`:
 *
 *  - the dump directory carries **one** generation of every file, all timestamped the same
 *    morning. **There is no dated archive of any dump.**
 *  - the only historical artefacts published are `modifications-<date>.txt` and
 *    `deletes-<date>.txt`, and **exactly one day of them is retained**. **A past state cannot be
 *    replayed either.**
 *
 * And no supplier fixes this by being a different supplier: Overture — the obvious upgrade —
 * publishes dated releases and **removes each one from public distribution after ~60 days**. A
 * free global gazetteer with durable byte-level pinning is not on the table. This is a property to
 * design around, not a supplier to swap.
 *
 * **So the distinction that was missed, stated once.** A checksum is a **fence**: it proves what a
 * build was made from, and refuses a build made from anything else. It is not a **pin**: it does
 * not let anyone obtain those bytes again. For a publisher that archives nothing the two are not
 * substitutes, and the difference surfaces exactly once — at the first regeneration, as a red
 * audit through no error of the person who ran it (**KD-123**: fixing R67-1/R67-2 changed the
 * fold, which changed every row's shard, so the corpus had to be rebuilt — and could not be, from
 * the bytes it named).
 *
 * ### What that makes true, and what it makes somebody's job
 *
 *  1. **The artefact of record is `packages/core/src/geo/gazetteer/` as committed** — 968
 *     reviewable, diffable JSON documents in git. **Every claim this product makes about its
 *     gazetteer is a claim about those bytes, checked against those bytes, offline.** No test,
 *     probe, golden or audit may require this generator to run, and none may require the network.
 *     **That is why the corpus being unreproducible from source costs the product nothing at
 *     rest.**
 *  2. **`$sourceSha256` RECORDS; it does not PIN.** The refusal-on-mismatch stays — that is the
 *     fence doing its job, and it is what caught this. `$fetched` and each source's **byte
 *     length** are published beside the hash, so a mismatch can be diagnosed rather than merely
 *     detected.
 *  3. **A re-pin is an explicit, reviewed act that publishes its own diff.** `--repin` is the
 *     **only** way a checksum mismatch results in a write, and a `--repin` run produces, **in the
 *     same commit**, an append-only `fixtures/golden/gazetteer-source-log.json` and a **row-level
 *     corpus diff**. **+15 shipped rows should have been a number in a golden, not a sentence in
 *     a build note.**
 *  4. **Determinism is narrowed to what it can promise, and it keeps its teeth**: *same fetched
 *     bytes ⇒ same corpus*, run inside one session against one fetch. It never meant *same day ⇒
 *     same corpus*, and it cannot mean *any day ⇒ same corpus*. Stated that way it is still the
 *     strongest determinism claim available here and it is still checkable — the ship gate runs
 *     this generator twice over one fetch and requires byte-identical output.
 *
 * **The two GeoNames dumps below were re-pinned on 2026-09-10** (QA round 67, KD-123); the three
 * other sources matched their recorded checksums byte for byte and did not move, which is worth
 * having: the instability is in the two large dumps, not in all five sources.
 *
 * ## Why the corpus changed at all
 *
 * QA round 60 measured the shipped Natural Earth gazetteer at **21.5 %** against 121 real travel
 * destinations and **100 %** against 50 large cities. `ne_10m_populated_places` is a
 * **cartographic** layer: it selects by administrative rank and by `POP_MAX`. Travel destinations
 * are selected by **notability**. Hallstatt has 779 residents and roughly a million visitors a
 * year; a same-sized village in Iowa has 779 residents. **The filter was on the wrong axis**, and
 * no amount of lowering a population threshold fixes an axis error — it only buys the Iowa village
 * first. A-83 Part 1 published the whole curve so the choice was Jacob's; he took
 * `l>=4 or (wikipedia and population >= 1,000)`, and refused the ~1 MB-gzipped always-loaded
 * option, which is why the corpus is **sharded** rather than bigger.
 *
 * ## Determinism
 *
 * No clock, no randomness, no reliance on source order or on `Map` iteration order. Every emission
 * order is a total order over the data. **Two runs against the SAME FETCHED BYTES produce
 * byte-identical output**, and the ship gate runs it twice and diffs. That is the whole claim —
 * see A-90 clause 4 above for why it is not, and never was, a claim about two different days.
 *
 * **This runs at generation time, by a human, once. Nothing in the shipped product runs it.**
 * `packages/core`, `packages/client`, `apps/web` and `cli.ts` never fetch anything for this
 * feature, in this phase or any other.
 */
import {
  closeSync,
  createReadStream,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { writeCorpusAtomically } from './corpus-write.mjs';
import { createInflateRaw } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const CORPUS_DIR = resolve(CAIRN, 'packages/core/src/geo/gazetteer');
const SHARD_MAP = resolve(CAIRN, 'packages/core/src/geo/gazetteerShards.gen.ts');
const DISAGREEMENTS_OUT = resolve(CAIRN, 'fixtures/golden/gazetteer-disagreements.json');
const PARENTS_OUT = resolve(CAIRN, 'fixtures/golden/gazetteer-parents.json');
const PROBES_OUT = resolve(CAIRN, 'fixtures/golden/gazetteer-probes.json');
const REFUSALS_OUT = resolve(CAIRN, 'fixtures/golden/gazetteer-refusals.json');
const SOURCE_LOG_OUT = resolve(CAIRN, 'fixtures/golden/gazetteer-source-log.json');
const MANIFEST_OUT = resolve(CAIRN, 'fixtures/golden/gazetteer-manifest.json');

// ---------------------------------------------------------------- the pins

/** The date the pinned bytes below were fetched. A constant, never a clock — determinism. */
const FETCHED = '2026-09-10';

/**
 * **The five source files, each pinned by sha256.** The four GeoNames files carry the
 * `Last-Modified` the server reported for the pinned bytes; they are regenerated daily and the
 * checksum is the only pin that means anything. `ne_10m_admin_0_countries.geojson` is pinned by
 * **tag** as well — it is the same file, the same tag and the same checksum
 * `tools/gen-countries.mjs` already pins, and it is read for A-84 Part 5's parent translation and
 * for nothing else.
 */
const SOURCES = {
  allCountries: {
    url: 'https://download.geonames.org/export/dump/allCountries.zip',
    file: 'allCountries.zip',
    entry: 'allCountries.txt',
    bytes: 421_190_719,
    sha256: '8864727474760039d91b60137fbe81fe203ae399a13289be4cf21afd0ebec826',
    lastModified: 'Thu, 10 Sep 2026 01:57:10 GMT',
    rows: 13_464_110,
  },
  alternateNames: {
    url: 'https://download.geonames.org/export/dump/alternateNamesV2.zip',
    file: 'alternateNamesV2.zip',
    entry: 'alternateNamesV2.txt',
    bytes: 204_011_299,
    sha256: '14386dea2d574f807d6e69fa269531ea427db2f61ebd59cf9b4d0e19e1aa40cf',
    lastModified: 'Thu, 10 Sep 2026 02:02:05 GMT',
    rows: 19_157_627,
  },
  admin1: {
    url: 'https://download.geonames.org/export/dump/admin1CodesASCII.txt',
    file: 'admin1CodesASCII.txt',
    bytes: 151_536,
    sha256: '590651498043f674accda2b7f46d21286cda0e290b02f8561c5005eee9a5448c',
  },
  countryInfo: {
    url: 'https://download.geonames.org/export/dump/countryInfo.txt',
    file: 'countryInfo.txt',
    bytes: 31_678,
    sha256: '93bafc525813f22e4711ff9ed6d626343094ce48c26388dc7c49189b3d7d5512',
  },
  admin0: {
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson',
    file: 'ne_10m_admin_0_countries.geojson',
    bytes: 13_287_234,
    sha256: '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255',
    tag: 'v5.1.2',
  },
};

/** CC BY 4.0. This string ships in `meta.json` and is what `Gazetteer.source` carries. */
const ATTRIBUTION =
  'GeoNames geographical database (allCountries, alternateNamesV2, admin1CodesASCII, ' +
  'countryInfo), https://www.geonames.org/ — licensed CC BY 4.0, ' +
  'https://creativecommons.org/licenses/by/4.0/. Provided "as is", without any representation of ' +
  'accuracy, timeliness or completeness. Country outlines: Natural Earth ' +
  'ne_10m_admin_0_countries v5.1.2, public domain.';

/** The row-id prefix. `'gn'` is GeoNames; it lives in `meta.json`, not in every row. */
const ID_PREFIX = 'gn';

/** Coordinate decimals kept. 1e-4° ≈ 11 m — A-83 Part 4: **the floor, and it does not move.** */
const DECIMALS = 4;

/**
 * **A-83 Part 3's selection rule, verbatim.** A candidate is a feature of class `P`, or of feature
 * code `ISL`/`ISLS`. A candidate is SELECTED if it clears any of three independent gates.
 */
const NOTABILITY = {
  /** Gate 1: distinct ISO-639 language codes carrying a name for the feature. */
  languages: 4,
  /** Gate 2: a Wikipedia link, and this population. */
  wikiPopulation: 1_000,
  /** Gate 3: class `P` at this population — the guard rail under the dial, not the dial. */
  floorPopulation: 20_000,
};

/**
 * The `alternateNamesV2.isolanguage` values that are **not** language codes and therefore do not
 * count toward gate 1 (A-83 Part 3). Measured over the pinned dump: 732 distinct values, of which
 * these seventeen — and only these — fail `^[a-z]{2,3}(-…)?$`.
 */
const NOT_A_LANGUAGE = new Set([
  '', 'wkdt', 'link', 'post', 'unlc', 'lauc', 'iata', 'icao', 'abbr',
  'uicn', 'fr_1793', 'faac', 'geoid', 'nuts', 'piny', 'phon', 'tcid',
]);

/**
 * How far off the pinned 1:10m coastline a settlement coordinate may be and still be located in
 * the feature it is beside. **ADOPTED into A-84 Part 5 step 1 at revision 70** (A-89 Part 4, QA
 * R67-11), which now reads *"locates the row's centre in the layer, **or the nearest feature
 * within 0.05°**"*: GeoNames settlement coordinates fall in water at 1:10m where Natural Earth's
 * label points did not — **Longyearbyen 0.4 km, Basse-Terre 1.4 km, Dzaoudzi 1.2 km offshore** —
 * and without this all three ship `countryCode: null`. 0.05° is ~5.5 km; the largest fallback the
 * shipped corpus actually uses is reported on every run, so the headroom is measured rather than
 * assumed.
 */
const NEAREST_TOLERANCE = 0.05;

/**
 * **A-83 Part 9 clause 4's match set, committed BY NAME AND BY GEONAMES ID — §8.4 A-93 Part 2 and
 * Part 8, ROADMAP `I-31`'s one stop-and-report condition. THE CAP IS ZERO IN EITHER DIRECTION.**
 *
 * `I-29` gated this clause behind `CLAUSE_4_ENABLED = false` and stopped, because A-89's predicate
 * — `X \ {S, C}` over every candidate — deletes **`Vatican City`** and 166 other correct rows
 * (**KD-124**; the stop was upheld and the ruling changed because of it). **The flag is gone with
 * the ruling that needed it**, and what replaces `I-29`'s *"anything over 100,000 people"*
 * threshold is this list: **a population threshold cannot see an 829-person capital.**
 *
 * The generator **stops and reports, writing nothing**, if the match set differs from these
 * sixteen rows at all, or if clause 4 ever matches a row of feature class `P` — which is
 * structurally impossible under A-93 Part 2 clause 1, and that is the point of checking it.
 *
 * Every one is a landmass that lies in, or is claimed by, more than one country; not one is a
 * settlement. Nine are disputes or shared islands rather than the archipelago case A-89 was
 * written about, and **the mitigation is measured rather than assumed: their settlements ship** —
 * `Świnoujście` (40,919, on Usedom) and `Yuzhno-Kurilsk` (7,777, on Kunashir) are both in the
 * corpus under their own names, and a test says so.
 */
const CLAUSE_4_SET = [
  [3491552, 'Antilles'],
  [1648148, 'Borneo'],
  [3504558, 'Hispaniola'],
  [2082514, 'New Guinea'],
  [2818108, 'Usedom Island'],
  [2124018, 'Kunashir Island'],
  [7284881, 'Hawar Islands'],
  [292983, 'Abu Musa Island'],
  [2121299, 'Shikotan Island'],
  [3834449, 'Isla Grande de Tierra del Fuego'],
  [3834451, 'Tierra del Fuego'],
  [1626052, 'Sunda Islands'],
  [5970356, 'Hans Island'],
  [8062537, 'Liancourt Rocks'],
  [2125177, 'Iturup Island'],
  [4031746, 'Diomede Islands'],
];

/** A-83 Part 6: **while** a shard's packed payload exceeds this, it is split. 96 KiB. */
const SHARD_BUDGET = 96 * 1024;

/**
 * A-82 Part 10's probe list, *"at minimum"* its thirteen queries, plus the ones that carry this
 * increment's own claims. These become `fixtures/golden/gazetteer-probes.json`, which pins **the
 * answer, not the mechanism**.
 */
const PROBES = [
  'zurich', 'Zürich', 'sao paulo', 'London', 'Paris', 'springfield', 'york',
  'lodz', 'istanbul', 'bac kan', 'vatican', 'nara', 'hvar',
  // The micro-states, and I-22's border town.
  'monaco', 'maastricht',
  // A-83 Part 8's three named costs of the old refusal.
  'geneva', 'jerusalem', 'brazzaville',
  // **The whole reason this increment exists**: the places round 60 measured as missing.
  'hallstatt', 'positano', 'zermatt', 'sintra', 'cesky krumlov', 'matera', 'carcassonne',
  'interlaken', 'obidos',
  // A-84 Part 5's parent translation, on the four rows the ruling names.
  'fort de france', 'longyearbyen', 'hargeisa',
];
const PROBE_DEPTH = 5;

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

// ---------------------------------------------------------------- the fold
//
// **This is a SECOND implementation of A-82 Part 3's five steps, and that is deliberate rather
// than careless.** `foldPlaceName` is module-private in `packages/core/src/geo/gazetteer.ts` (§2.10
// group 1: a caller that can reach both it and `normalizeCityName` will use the wrong one), and
// ROADMAP criterion E ceiling (1) forbids anything under `tools/` reaching past
// `packages/core/src/index.ts`. So the generator cannot import it.
//
// Disclosed as **KD-112**. It used to be made safe by SHIPPING each row's fold and asserting the
// two implementations agree over every row. **A-83 Part 4 dropped the bytes and kept the
// guarantee**: the fold is recomputed by `decodeGazetteer`, and each row is written into the shard
// of every token of *this* copy's fold — so if the two copies ever disagree, a decoded row lands
// in a shard its own fold does not resolve to, and `packages/core/test/gazetteer.test.ts` says so
// by name over every shipped row. You do not have to ship a value to verify it.

// **The okina family is all FIVE of its spellings** — U+02BB, U+02BC, U+2018, U+2019 and the
// ASCII grave U+0060 (**QA R67-2**). GeoNames spells it U+2019 (772 shipped rows), U+2018 (408),
// U+02BB (4) and U+0060 (6); A-82 Part 3's table carried only the two modifier letters, so step 5
// turned the rest into a space and 700 of the 763 rows they touched were unreachable by the query
// a person types. The ASCII apostrophe is deliberately absent: it is a word separator in
// `L'Aquila`, and 602 shipped rows use it that way.
const SUBSTITUTIONS = {
  'ł': 'l', 'ø': 'o', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ß': 'ss',
  'æ': 'ae', 'œ': 'oe', 'ı': 'i', 'ħ': 'h', 'ŀ': 'l',
  'ʻ': '', 'ʼ': '', '\u2018': '', '\u2019': '', '\u0060': '',
};

function foldPlaceName(name) {
  const lowered = name.toLowerCase();
  let substituted = '';
  for (const ch of lowered) substituted += SUBSTITUTIONS[ch] ?? ch;
  return substituted.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** A-83 Part 6's shard resolution — the same walk `gazetteer.ts` does, on the writing side. */
function shardKeyFor(token, splits) {
  let prefix = token.slice(0, 1);
  while (splits.has(prefix)) {
    if (token === prefix) return `${prefix}$`;
    prefix = token.slice(0, prefix.length + 1);
  }
  return prefix;
}

/**
 * A shard **key** may contain `$` (the terminal marker) and, for a name in a non-Latin script, any
 * Unicode letter. A shard **file name** may not usefully contain either: `$` is awkward in an
 * import specifier and a CJK file name is unreadable in a diff. The mapping is total and
 * injective, and the key itself is carried inside the document, so nothing infers one from the
 * other.
 *
 *  - `[a-z0-9]+`  → itself                (`ha.json`)
 *  - `[a-z0-9]+$` → the prefix plus `-`   (`ha-.json`; `-` cannot occur in a folded token)
 *  - anything else → `u-<code points in hex, dash-joined>` (`u-4e2d.json`)
 */
function fileNameFor(key) {
  if (/^[a-z0-9]+$/.test(key)) return key;
  if (/^[a-z0-9]+\$$/.test(key)) return `${key.slice(0, -1)}-`;
  const terminal = key.endsWith('$');
  const body = terminal ? key.slice(0, -1) : key;
  return `u-${[...body].map((c) => c.codePointAt(0).toString(16)).join('-')}${terminal ? '-' : ''}`;
}

// ---------------------------------------------------------------- main

async function main() {
  if (flag('audit-only')) {
    const corpus = readCommittedCorpus();
    console.log(`auditing the COMMITTED corpus: ${corpus.rows.length} rows in ${corpus.shards.length} shards`);
    console.log(`  ${corpus.meta.$source}`);
    await audit(corpus, { writeProbes: flag('write') });
    return;
  }

  const cacheDir = opt('cache', process.env.CAIRN_GAZETTEER_CACHE ?? join(tmpdir(), 'cairn-gazetteer-src'));
  mkdirSync(cacheDir, { recursive: true });
  const shas = {};
  const fetched = {};
  for (const [name, src] of Object.entries(SOURCES)) {
    const got = await ensureSource(cacheDir, src);
    shas[name] = got.sha;
    fetched[name] = got;
  }
  const moved = Object.entries(fetched).filter(([, g]) => g.moved).map(([name]) => name);
  const repin = flag('repin');
  if (repin && moved.length === 0) {
    console.log('--repin: no source moved — this run is an ordinary regeneration.');
  }
  // **The source log is READ AND VERIFIED HERE — before the build, before any write** (§8.4 A-94
  // Part 5 clause 3, QA R68-3). A run that cannot read it stops and reports, and stopping here
  // rather than at the write means it stops in seconds and the corpus on disk is untouched.
  const sourceLog = readSourceLog();
  console.log(`source log: ${sourceLog.entries.length} entries, verified` +
    `${repin ? ' — --repin, so this run may append to it' : ' — NOT written (no --repin)'}`);
  const { countryOf, COUNTRY_INDEX } = await import('../packages/core/src/index.ts');
  const draws = new Set(COUNTRY_INDEX.countries.map((c) => c.code));
  console.log(`the shipped index draws ${draws.size} country codes at scale ${COUNTRY_INDEX.scale}`);

  // **The corpus sha covers every input the corpus is a function of, and `COUNTRY_INDEX` is one
  // of them — QA R67-7.** It used to be sha256 over the five downloads alone. But the generator
  // reads the shipped index to decide `indexSays` for every row, to refuse a row that would
  // contradict it silently, and to decide which stated codes need A-84 Part 5's parent
  // translation; so two corpora built either side of a country-index regeneration were
  // **different documents carrying the same `$sourceSha256`**, and the loader's skew check —
  // which compares exactly that value — could not tell them apart. GeoNames has no pinnable
  // release tag, which makes these checksums the entire reproducibility guarantee; a gap in them
  // is a gap in the guarantee. The index is hashed by VALUE rather than by file bytes so that a
  // comment or a reformat in the generated module does not read as a data change.
  const indexSha = createHash('sha256').update(JSON.stringify(COUNTRY_INDEX)).digest('hex');
  const corpusSha = createHash('sha256')
    .update([
      ...Object.keys(SOURCES).sort().map((k) => `${k}:${shas[k]}`),
      `countryIndex:${indexSha}`,
    ].join('\n'))
    .digest('hex');
  console.log(`COUNTRY_INDEX sha256 (by value): ${indexSha}`);
  console.log(`corpus sha256 (over the five source checksums AND the country index): ${corpusSha}`);

  const built = await build(cacheDir, { countryOf, index: COUNTRY_INDEX, draws });
  report(built);

  const docs = shard(built, corpusSha, indexSha);
  console.log('');
  console.log(`shards         ${docs.shards.length}   (${docs.splits.length} split prefixes)`);
  console.log(`emitted rows   ${docs.emitted}   (duplication factor ${(docs.emitted / built.rows.length).toFixed(3)})`);
  console.log(`largest shard  ${docs.largest.bytes} bytes  "${docs.largest.key}"`);
  if (docs.largest.bytes > SHARD_BUDGET) {
    throw new Error(
      `shard "${docs.largest.key}" is ${docs.largest.bytes} bytes, over the ${SHARD_BUDGET}-byte ` +
        'budget, and could not be split further. A-83 Part 6: the budget is the invariant.',
    );
  }

  roundTrip(docs, built);
  console.log(`  round-trip: every emitted row re-parses, field by field, to the row that built it`);

  if (flag('dry-run')) {
    const total = docs.shards.reduce((n, s) => n + s.bytes, 0) + docs.metaBytes;
    console.log(`\ncorpus bytes: ${total}   (dry run — nothing written)`);
    await audit(inMemoryCorpus(docs, built), { writeProbes: false });
    return;
  }

  // **A-90 clause 3's row-level diff, taken BEFORE the write** — a diff needs the previous corpus
  // to diff against, and after `write()` there is no previous corpus on disk. A fresh clone at a
  // re-pin commit has one only because git does.
  const diff = corpusDiff(built);
  gateNamedSet(diff);

  write(docs, built);
  writeManifest(corpusSha);
  if (repin) writeSourceLog(sourceLog, fetched, moved);
  reportCorpusDiff(diff, moved.length > 0);
  writeDisagreements(built, corpusSha);
  writeParents(built, corpusSha);
  writeRefusals(built, corpusSha);

  // Audit the corpus that was actually written, in a CHILD PROCESS, because this process has
  // already imported `packages/core/src/index.ts` and a stale module cache would let the guard
  // read the files it just replaced. `gen-countries.mjs` learned this the expensive way at I-5a.
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--audit-only', '--write'], {
    stdio: 'inherit',
  });
  if (child.status !== 0) throw new Error(`the post-write audit exited ${child.status}`);
}

// ---------------------------------------------------------------- fetching

/**
 * Fetches a pinned source into the cache directory if it is not already there, and **checksums it
 * either way**. A cached file is not trusted: it is verified on every run exactly as a fetched one
 * is, which is what stops the cache from being a way around the pin.
 */
async function ensureSource(cacheDir, src) {
  const path = join(cacheDir, src.file);
  let buf = null;
  try {
    if (statSync(path).size === src.bytes) buf = readFileSync(path);
  } catch { /* not cached */ }
  if (buf === null) {
    console.log(`fetching ${src.url}`);
    const res = await fetch(src.url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${src.url}`);
    buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(path, buf);
  } else {
    console.log(`cached   ${src.file}`);
  }
  const sha = createHash('sha256').update(buf).digest('hex');
  console.log(`  ${buf.length} bytes, sha256 ${sha}`);
  if (sha === src.sha256 && buf.length === src.bytes) return { sha, bytes: buf.length, moved: false };

  // **A-90 clause 3: `--repin` is the ONLY path from a checksum mismatch to a write.**
  console.error(`  recorded: ${src.bytes} bytes, sha256 ${src.sha256}`);
  if (!flag('repin')) {
    console.error(
      'gen-gazetteer: THE FETCHED BYTES DO NOT MATCH THE ONES THIS CORPUS RECORDS. Not writing.\n' +
        '  GeoNames regenerates every dump daily and archives nothing, so this is EXPECTED to\n' +
        '  happen and it is NOT something to absorb. The checksum is a FENCE, not a pin: it proves\n' +
        '  what a build was made from and refuses a build made from anything else. It does not let\n' +
        '  anyone obtain those bytes again — nobody can, including us.\n' +
        '\n' +
        '  A re-pin is an explicit, REVIEWED act (§8.4 A-90):\n' +
        '    1. update SOURCES and FETCHED above to the bytes you actually fetched;\n' +
        '    2. re-run with --repin, which is the only flag that lets a mismatch write;\n' +
        '    3. commit fixtures/golden/gazetteer-source-log.json (append-only) AND the row-level\n' +
        '       corpus diff it prints, IN THE SAME COMMIT as the corpus.\n' +
        '  +15 shipped rows should have been a number in a golden, not a sentence in a build note.',
    );
    process.exit(3);
  }
  console.error(
    `  --repin: ${src.file} moved and this run is allowed to write it. The source log records ` +
      'both checksums and the corpus diff must be reviewed in the same commit.',
  );
  return { sha, bytes: buf.length, moved: true, previousSha256: src.sha256 };
}

// ---------------------------------------------------------------- reading the sources

/** Locates one entry inside a zip by walking the central directory (ZIP64 aware). */
function zipEntry(path, wanted) {
  const size = statSync(path).size;
  const fd = openSync(path, 'r');
  try {
    const tailLen = Math.min(size, 65_557);
    const tail = Buffer.alloc(tailLen);
    readSync(fd, tail, 0, tailLen, size - tailLen);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i -= 1) {
      if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error(`${path}: no end-of-central-directory record`);
    let count = tail.readUInt16LE(eocd + 10);
    let cdSize = tail.readUInt32LE(eocd + 12);
    let cdOff = tail.readUInt32LE(eocd + 16);
    if (cdOff === 0xffffffff || cdSize === 0xffffffff || count === 0xffff) {
      let loc = -1;
      for (let i = eocd - 20; i >= 0; i -= 1) {
        if (tail.readUInt32LE(i) === 0x07064b50) { loc = i; break; }
      }
      if (loc < 0) throw new Error(`${path}: ZIP64 sizes with no ZIP64 locator`);
      const z64 = Buffer.alloc(56);
      readSync(fd, z64, 0, 56, Number(tail.readBigUInt64LE(loc + 8)));
      if (z64.readUInt32LE(0) !== 0x06064b50) throw new Error(`${path}: bad ZIP64 EOCD`);
      count = Number(z64.readBigUInt64LE(32));
      cdSize = Number(z64.readBigUInt64LE(40));
      cdOff = Number(z64.readBigUInt64LE(48));
    }
    const cd = Buffer.alloc(cdSize);
    readSync(fd, cd, 0, cdSize, cdOff);
    let at = 0;
    for (let i = 0; i < count; i += 1) {
      if (cd.readUInt32LE(at) !== 0x02014b50) throw new Error(`${path}: bad central directory entry`);
      const method = cd.readUInt16LE(at + 10);
      let compressed = cd.readUInt32LE(at + 20);
      let uncompressed = cd.readUInt32LE(at + 24);
      const nameLen = cd.readUInt16LE(at + 28);
      const extraLen = cd.readUInt16LE(at + 30);
      const commentLen = cd.readUInt16LE(at + 32);
      let localOff = cd.readUInt32LE(at + 42);
      const name = cd.subarray(at + 46, at + 46 + nameLen).toString('utf8');
      if (uncompressed === 0xffffffff || compressed === 0xffffffff || localOff === 0xffffffff) {
        const extra = cd.subarray(at + 46 + nameLen, at + 46 + nameLen + extraLen);
        let e = 0;
        while (e + 4 <= extra.length) {
          const tag = extra.readUInt16LE(e);
          const len = extra.readUInt16LE(e + 2);
          if (tag === 0x0001) {
            let o = e + 4;
            if (uncompressed === 0xffffffff) { uncompressed = Number(extra.readBigUInt64LE(o)); o += 8; }
            if (compressed === 0xffffffff) { compressed = Number(extra.readBigUInt64LE(o)); o += 8; }
            if (localOff === 0xffffffff) { localOff = Number(extra.readBigUInt64LE(o)); o += 8; }
          }
          e += 4 + len;
        }
      }
      if (name === wanted) {
        if (method !== 8) throw new Error(`${path}: ${name} is not deflated (method ${method})`);
        const lh = Buffer.alloc(30);
        readSync(fd, lh, 0, 30, localOff);
        if (lh.readUInt32LE(0) !== 0x04034b50) throw new Error(`${path}: bad local header for ${name}`);
        return { dataOff: localOff + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28), compressed };
      }
      at += 46 + nameLen + extraLen + commentLen;
    }
    throw new Error(`${path}: no entry named ${wanted}`);
  } finally {
    closeSync(fd);
  }
}

/**
 * Streams one line at a time out of a zipped source, without ever holding the decompressed file.
 * `allCountries.txt` is 1.79 GB and `alternateNamesV2.txt` is 783 MB; a generator that buffers
 * either is a generator that only runs on a big machine.
 */
function eachLine(path, entry, onLine) {
  const { dataOff, compressed } = zipEntry(path, entry);
  return new Promise((res, rej) => {
    const s = createReadStream(path, { start: dataOff, end: dataOff + compressed - 1, highWaterMark: 1 << 22 })
      .pipe(createInflateRaw({ chunkSize: 1 << 22 }));
    let tail = '';
    s.setEncoding('utf8');
    s.on('data', (chunk) => {
      const lines = (tail + chunk).split('\n');
      tail = lines.pop();
      for (const line of lines) if (line !== '') onLine(line);
    });
    s.on('end', () => { if (tail !== '') onLine(tail); res(); });
    s.on('error', rej);
  });
}

// ---------------------------------------------------------------- building

const q = (n) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS;
const isIso = (c) => typeof c === 'string' && /^[A-Z]{2}$/.test(c);
/** A folded alternate ships only if it is Latin-script — A-82 Part 3 defers non-Latin to Part 11. */
const isLatinFold = (s) => /^[a-z0-9 ]+$/.test(s);
/** A-83 Part 4: `min(35, floor(log2(pop)))`, one base-36 character, decoding to `2 ** b`. */
const popBucket = (pop) => (pop > 0 ? Math.min(35, Math.floor(Math.log2(pop))) : 0);

/**
 * **`allCountries` column 10 (`cc2`), uppercased, trimmed, empties dropped** — A-83 Part 9 clause
 * 4's set `X`, and nothing more. Deduplicated and sorted so the refusals golden is a total order
 * over the data rather than over the source's field order.
 *
 * **This column is NOT an "is it multi-country" flag and clause 4 may not read it as one.** On
 * most of the rows that carry it, it names the **sovereign parent** rather than a second country
 * — `Longyearbyen` `cc=SJ cc2=[NO]`, `Grand-Case` `cc=MF cc2=[FR]` — which is why the refusal
 * subtracts both the row's stated code and the code we attribute it to. See the predicate at the
 * refusal site.
 *
 * **It is not validated against `countryInfo.txt`** (A-89 Part 8 residue 3): a junk or retired
 * code in the column refuses a row it should not. The cheap remedy when that fires is to publish
 * it in the audit rather than to filter it silently, so the audit prints the codes it saw.
 */
const cc2Of = (field) =>
  [...new Set((field ?? '').split(',').map((c) => c.trim().toUpperCase()).filter((c) => c !== ''))].sort();

/**
 * The whole pipeline: four streaming passes over the two big dumps, then the country resolution.
 *
 * Two passes each, rather than one, because the two facts are needed in the opposite order from
 * the one they arrive in: selection needs the alternate-name signal for **every** candidate, and
 * the display data is only wanted for the ~149k that are selected. Holding the display data for
 * all 5.4 million candidates to save a second pass is how this generator would need 8 GB.
 */
async function build(cacheDir, { countryOf, index, draws }) {
  const allCountries = join(cacheDir, SOURCES.allCountries.file);
  const altNames = join(cacheDir, SOURCES.alternateNames.file);

  // ---- pass A: candidates (class P, or ISL/ISLS), with population and class ----
  const ids = [];
  const pops = [];
  const classP = [];
  let features = 0;
  await eachLine(allCountries, SOURCES.allCountries.entry, (line) => {
    features += 1;
    const f = line.split('\t');
    const cls = f[6];
    if (cls !== 'P' && f[7] !== 'ISL' && f[7] !== 'ISLS') return;
    ids.push(+f[0]);
    pops.push(+f[14] || 0);
    classP.push(cls === 'P' ? 1 : 0);
  });
  if (features !== SOURCES.allCountries.rows) {
    throw new Error(`${features} features, pinned at ${SOURCES.allCountries.rows}`);
  }
  console.log(`  ${features} features read, ${ids.length} candidates (class P, ISL, ISLS)`);

  const n = ids.length;
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => ids[a] - ids[b]);
  const candId = new Int32Array(n);
  const candPop = new Int32Array(n);
  const candP = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    const j = order[i];
    candId[i] = ids[j];
    candPop[i] = pops[j];
    candP[i] = classP[j];
  }
  const at = (id) => {
    let lo = 0;
    let hi = n - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const v = candId[mid];
      if (v === id) return mid;
      if (v < id) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
  };

  // ---- pass B: the notability signal ----
  //
  // Distinct languages are counted EXACTLY but stored saturating: gate 1 only asks whether the
  // count reaches 4, so remembering the first `LANG_CAP` distinct codes per candidate answers it
  // for a fixed 4 bytes a candidate instead of a Set per row.
  // Sized off the gate, not guessed: a cap below `NOTABILITY.languages` would saturate the count
  // and make gate 1 silently unsatisfiable — measured, an injected `languages: 12` against a
  // hard-coded cap of 8 selected the population floor alone and looked like a much harsher dial
  // than it is.
  const LANG_CAP = Math.max(8, NOTABILITY.languages);
  const seen = new Int32Array(n * LANG_CAP).fill(-1);
  const nSeen = new Uint8Array(n);
  const wiki = new Uint8Array(n);
  const langId = new Map();
  let altRows = 0;
  await eachLine(altNames, SOURCES.alternateNames.entry, (line) => {
    altRows += 1;
    const t1 = line.indexOf('\t');
    const t2 = line.indexOf('\t', t1 + 1);
    const t3 = line.indexOf('\t', t2 + 1);
    const iso = line.slice(t2 + 1, t3);
    const i = at(+line.slice(t1 + 1, t2));
    if (i < 0) return;
    if (iso === 'link') {
      const t4 = line.indexOf('\t', t3 + 1);
      const value = t4 < 0 ? line.slice(t3 + 1) : line.slice(t3 + 1, t4);
      if (value.includes('wikipedia.org')) wiki[i] = 1;
      return;
    }
    if (NOT_A_LANGUAGE.has(iso)) return;
    // **A-83 Part 3: distinct ISO-639 codes.** `zh-CN` and `zh` are one ISO-639 code, so the
    // region suffix is dropped before counting; a (feature, language) pair counts once however
    // many spellings it has.
    const dash = iso.indexOf('-');
    const base = dash < 0 ? iso : iso.slice(0, dash);
    let lid = langId.get(base);
    if (lid === undefined) { lid = langId.size; langId.set(base, lid); }
    const k = nSeen[i];
    const off = i * LANG_CAP;
    for (let j = 0; j < k; j += 1) if (seen[off + j] === lid) return;
    if (k < LANG_CAP) { seen[off + k] = lid; nSeen[i] = k + 1; }
  });
  if (altRows !== SOURCES.alternateNames.rows) {
    throw new Error(`${altRows} alternate-name rows, pinned at ${SOURCES.alternateNames.rows}`);
  }
  console.log(`  ${altRows} alternate-name rows read, ${langId.size} distinct ISO-639 codes`);

  // ---- selection ----
  const selected = new Uint8Array(n);
  const gates = { languages: 0, wikiPop: 0, floor: 0 };
  let nSelected = 0;
  for (let i = 0; i < n; i += 1) {
    const byLanguage = nSeen[i] >= NOTABILITY.languages;
    const byWiki = wiki[i] === 1 && candPop[i] >= NOTABILITY.wikiPopulation;
    const byFloor = candP[i] === 1 && candPop[i] >= NOTABILITY.floorPopulation;
    if (!byLanguage && !byWiki && !byFloor) continue;
    selected[i] = 1;
    nSelected += 1;
    if (byLanguage) gates.languages += 1;
    if (byWiki) gates.wikiPop += 1;
    if (byFloor) gates.floor += 1;
  }
  console.log(`  selected ${nSelected} of ${n} candidates`);
  console.log(`    languages >= ${NOTABILITY.languages}          ${gates.languages}`);
  console.log(`    wikipedia and pop >= ${NOTABILITY.wikiPopulation}  ${gates.wikiPop}`);
  console.log(`    class P and pop >= ${NOTABILITY.floorPopulation}   ${gates.floor}   (the guard rail, not the dial)`);

  // ---- pass C: the display data for the selected rows ----
  const admin1Names = readAdmin1(cacheDir);
  const rows = [];
  const byId = new Map();
  await eachLine(allCountries, SOURCES.allCountries.entry, (line) => {
    const f = line.split('\t');
    const id = +f[0];
    const i = at(id);
    if (i < 0 || selected[i] !== 1) return;
    const cc = f[8];
    const row = {
      gid: id,
      name: f[1],
      lat: q(+f[4]),
      lng: q(+f[5]),
      stated: isIso(cc) ? cc : null,
      // **`allCountries` column 10 — `cc2`, "alternate country codes, comma separated".** A-83
      // Part 9 clause 4's whole input, and a column this corpus never shipped before I-29. It is
      // read here, with the rest of the display data, because clause 4 is a SHIPPING condition and
      // a shipping condition needs the row it is about.
      cc2: cc2Of(f[9]),
      // **`allCountries` column 7 — the GeoNames FEATURE CLASS.** A-93 Part 2 clause 1 scopes
      // clause 4 to the arm of A-83 Part 3's candidacy rule that has an *extent*: `ISL`/`ISLS`.
      // A class-`P` row denotes a **point**, and a point lies in one place on the ground — a
      // second jurisdictional claim on it is a dispute Cairn declines to adjudicate (A-84 Part 5's
      // `null` arm), not a place it deletes. Carried on the row rather than re-derived from
      // `candP`, because the refusal is decided here, beside the column it reads.
      cls: f[6],
      admin1: admin1Names.get(`${cc}.${f[10]}`) ?? '',
      population: +f[14] || 0,
      alt: '',
    };
    rows.push(row);
    byId.set(id, row);
  });
  console.log(`  ${rows.length} selected rows read back with their display data`);

  // ---- pass D: the English alternate, for the selected rows only ----
  //
  // Deterministic under ties: preferred beats unpreferred, a plain name beats a colloquial or
  // historic one, then the shortest, then lexicographic. `Map` iteration order is never relied on.
  const best = new Map();
  await eachLine(altNames, SOURCES.alternateNames.entry, (line) => {
    const f = line.split('\t');
    if (f[2] !== 'en') return;
    const id = +f[1];
    if (!byId.has(id)) return;
    const value = f[3];
    if (value === '') return;
    const rank = [
      f[4] === '1' ? 0 : 1,
      f[6] === '1' || f[7] === '1' ? 1 : 0,
      value.length,
      value,
    ];
    const held = best.get(id);
    if (held === undefined || less(rank, held.rank)) best.set(id, { rank, value });
  });
  for (const [id, { value }] of best) byId.get(id).alt = value;
  console.log(`  ${best.size} of ${rows.length} rows carry an English alternate name`);

  // ---- the country resolution (A-84 Part 5) and the index verdict (A-84 Part 6) ----
  const admin0 = readAdmin0(cacheDir);

  // **A-84 Part 5, resolved per CODE rather than per row — ADOPTED at revision 70 (A-89 Part 4,
  // QA R67-11). This is no longer a deviation disclosed in a build note; it is the rule.**
  //
  // The ruling as first written read the parent off *"the containing feature's `ISO_A2_EH`"*, one
  // row at a time. **The justification this generator published for departing from that is
  // WITHDRAWN.** KD-119 said the per-code mode existed because a per-row resolution splits Mayotte
  // 39 `FR` / 11 `null`. Re-derived with the coastal tolerance in — its own sibling change, in the
  // same commit — **`YT` is `FR × 51`**. The stated reason was discharged by the other half of the
  // change that stated it, and it is not repeated here.
  //
  // **What actually earns the rule is four rows of 152**: `Saint-Georges` `BR → FR`, `Devils
  // Island` `null → FR`, `Klovningen` `null → NO`, `Atafu` `NZ → null`. **Saint-Georges alone
  // earns it** — a French commune on a traveller's lifetime map as Brazil, because it sits across
  // a river from it. The honest sentence, and the one the ruling adopted: **a territory's parent
  // is a property of the territory, not of one settlement's coordinate, and the modal containing
  // feature is how the data says which.**
  //
  // So the layer is still the only source and nothing is typed: every row carrying an undrawable
  // code is located, and the code's parent is the **modal** answer over all of them, ties broken
  // alphabetically so the result is a property of the data and not of the row order. A row with no
  // stated code at all has no code to take a mode over and keeps its own answer.
  const located = new Map();
  const perCode = new Map();
  let maxNearest = 0;
  for (const r of rows) {
    // **A-84 Part 5's *"the empty code included"* is SCOPED, and the scoping is now RULED rather
    // than tolerated** (A-89 Part 5 sentence 1, QA R67-4): the translation runs for a row whose
    // source states **no** code **only where the layer contains that row's centre**, within the
    // coastal tolerance. This generator ships the strict form of that — a codeless row is not
    // located at all — and the two coincide on this corpus, because the codeless population here
    // is entirely outside the layer.
    //
    // A-84 Part 5 was written against a corpus in which the codeless rows were **Somaliland and
    // Northern Cyprus towns** — real cities the layer draws with no ISO code. **In GeoNames they
    // are not** (**KD-120**): Hargeysa states `SO`, Famagusta and Kyrenia state `CY`, and all
    // three ship those codes with `indexSays: 'silent'`. The rows GeoNames leaves codeless are a
    // different population entirely — **ocean features and multi-country archipelagos**: `Lesser
    // Antilles`, `French West Indies`, `Woody Island`, `Virgin Islands`. Translating *those* ships
    // *"Lesser Antilles, France"* and hands the disputed Paracels to China on a nearest-feature
    // test, which is A-84 Part 5's own *"Cairn does not adjudicate a sovereignty"* read backwards
    // — and it resurrects the exact rows **A-83 Part 9 clause 1 refuses by name**. A row that
    // states no country keeps `null` and meets the bare-name refusal.
    //
    // **A-84 Part 5's *"Picking Hargeisa reports `{null, null}`"* is WITHDRAWN as an example and
    // KEPT as a rule.** The rule — *Cairn does not adjudicate a sovereignty its own map cannot
    // draw* — is unchanged and is why the `null` arm exists. What exercises that arm in this
    // corpus is three Tokelau rows: `Atafu Village`, `Nukunonu`, `Fale old settlement`. **Any
    // future change that takes that count to zero is deleting the arm and must say so.**
    if (r.stated === null || draws.has(r.stated)) continue;
    const hit = admin0.locate(r.lng, r.lat);
    located.set(r.gid, hit);
    if (hit.via === 'nearest' && hit.degrees > maxNearest) maxNearest = hit.degrees;
    let ballot = perCode.get(r.stated);
    if (ballot === undefined) {
      ballot = { answers: new Map(), noIsoCode: 0, abstain: 0, candidates: 0 };
      perCode.set(r.stated, ballot);
    }
    ballot.candidates += 1;
    // **AN ABSTENTION IS NOT A VOTE** — §8.4 **A-94** Part 2 (QA R68-1), amending A-84 Part 5
    // step 1 / A-89 Part 4.
    //
    // This line used to read `const key = hit.code ?? ''` and the plurality below was taken over
    // every key including `''`. That counted *"the layer has no opinion about this row"* as a vote
    // for *"this row has no country"* — and **it deleted an entire inhabited territory**. The
    // layer carries no feature spelled `CC`; it carries `Indian Ocean Territories`
    // (`ISO_A2 = -99`, `ISO_A2_EH = AU`, `SOV_A3 = AU1`, `SOVEREIGNT = Australia`) whose polygons
    // ARE the Cocos atolls. `West Island` (0.0023°) and `South Island` (0.0059°) fall inside the
    // tolerance and answer `AU`; `Bantam Village` (0.0501°), `Horsburgh Island` (0.0510°) and
    // `Cocos Islands` (0.1267°) miss it. `null:3 AU:2` → `CC → null` → all five ship
    // `countryCode: null` with no region → **A-83 Part 9 clause 1 refuses all five as bare
    // names**, and `west island`, the territory's capital, returned NO MATCH. Two of those three
    // silences are **one ten-thousandth of a degree** — about eleven metres of coastline
    // generalisation at 1:10m — from the feature that contains their neighbours.
    //
    // The tie-break made it worse rather than better: `''` sorts first, so on a tie the silence
    // also won.
    //
    // **A row the layer neither contains nor places within the tolerance contributes NOTHING.**
    // It is not a vote for `null`; it is the layer declining to answer. A code ALL of whose
    // candidate rows abstain still has no modal parent and its rows still ship `null` — the arm
    // is unoccupied on this corpus, not deleted (A-94 Part 3).
    //
    // A row the layer DOES contain inside a feature it gives no ISO code (`ISO_A2_EH = -99`:
    // Somaliland, Northern Cyprus) is a different thing again — an **answer**, and one that cannot
    // be a parent. It is counted, published as `noIsoCode`, and it wins nothing, because the
    // plurality below only elects a code the shipped index can draw.
    if (hit.via === 'none') ballot.abstain += 1;
    else if (hit.code === null) ballot.noIsoCode += 1;
    else ballot.answers.set(hit.code, (ballot.answers.get(hit.code) ?? 0) + 1);
  }
  const codeParent = {};
  const codeTally = {};
  for (const code of [...perCode.keys()].sort()) {
    const ballot = perCode.get(code);
    // The plurality is over the ANSWERS. **A tie is broken by the lowest ISO code**, which is a
    // rule rather than an accident of `Map` order — and it is A-94 Part 9 fault 3: no shipped row
    // moves on this corpus if it is inverted, and the published tally is how anybody would know.
    const ranked = [...ballot.answers].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const best = ranked.length > 0 ? ranked[0][0] : null;
    codeParent[code] = best !== null && draws.has(best) ? best : null;
    codeTally[code] = {
      parent: codeParent[code],
      answers: Object.fromEntries(ranked),
      noIsoCode: ballot.noIsoCode,
      abstain: ballot.abstain,
      candidates: ballot.candidates,
    };
  }
  console.log(`  parent of each undrawable code, from the layer's own ISO_A2_EH:`);
  console.log(`  (the plurality is over ANSWERS; an abstention is not a vote — A-94 Part 2)`);
  for (const [code, t] of Object.entries(codeTally)) {
    const answers = Object.entries(t.answers).map(([c, n]) => `${c}:${n}`).join(' ');
    console.log(`    ${code} -> ${t.parent ?? 'null'}   ${answers || '(no answer)'}` +
      `${t.noIsoCode ? ` noIsoCode:${t.noIsoCode}` : ''} abstain:${t.abstain} of ${t.candidates}`);
  }
  console.log(`  coastal tolerance actually used: ${maxNearest.toFixed(4)}° of ${NEAREST_TOLERANCE}°`);

  const parents = [];
  const disagreements = [];
  const census = { agrees: 0, differs: 0, silent: 0 };
  const refusedRows = [];
  /** A-93 Part 3: rows kept ONLY by the `S` subtraction. Predicted empty; PUBLISHED, not assumed. */
  const keptByS = [];
  /** A-93 Part 3: rows kept ONLY by `P(C)` beyond `P(S)`. Predicted empty; PUBLISHED, not assumed. */
  const keptByPC = [];
  /** A-93 Part 3(b): the `c -> P(c)` pairs clause 4 ACTUALLY used on this corpus. 6 predicted. */
  const sovereignUsed = new Set();
  /** A-93 Part 3(a): the class-`P` rows the class restriction exempts. 141 predicted. */
  const classPExempt = [];
  /**
   * **Every row A-83 Part 9 clause 4 refuses.** `report()` prints this set in full on every run,
   * with each row's `cc2`, class and population, and the stop-and-report gate (A-93 Part 8) is
   * evaluated over it against the sixteen rows the ruling commits by name and by GeoNames id.
   */
  const clause4 = [];
  /**
   * **R67-10: a refusal is a RECORD, not a counter.** `{id, name, statedCode, admin1, cc2,
   * reason}`, `reason` from the closed set `'bare-name' | 'unreadable' | 'delimiter' |
   * 'multi-country'`, published in `fixtures/golden/gazetteer-refusals.json` — and **the header's
   * per-reason counts are the sizes of that file's groups, read from it**. A count in a header
   * that no file can be checked against is a census with no denominator, one artefact out.
   */
  const refuse = (r, reason, code) => {
    refusedRows.push({
      id: `${ID_PREFIX}:${r.gid.toString(36)}`,
      name: r.name,
      statedCode: r.stated,
      shippedCode: code ?? null,
      admin1: r.admin1,
      cc2: r.cc2,
      // **A-93 Part 2 clause 1, made checkable from the artefact rather than from a sentence.**
      // *"No refused row has feature class `P`"* is a claim about this file, and a claim a reader
      // cannot check in the file it is about is the same defect R67-10 filed against the counts.
      cls: r.cls,
      population: r.population,
      reason,
    });
  };
  const shipped = [];
  const atOrigin = [];
  let translated = 0;

  for (const r of rows) {
    let code = r.stated;
    let parent = null;
    if (code !== null && !draws.has(code)) {
      // **A-84 Part 5.** The parent is a fact the dataset the index is cut from already states,
      // and it is not a fact anybody has to type. `ISO_A2_EH` is the column `gen-countries.mjs`
      // already treats as *the* code column — France's own `ISO_A2` at 10m is literally `-99`.
      const hit = located.get(r.gid);
      const shippedCode = codeParent[code];
      parent = {
        id: `${ID_PREFIX}:${r.gid.toString(36)}`,
        name: r.name,
        statedCode: code,
        shippedCode,
        via: hit.via,
      };
      code = shippedCode;
    }

    const derived = countryOf({ lat: r.lat, lng: r.lng }, index);
    let says;
    if (derived === null || code === null) says = 'silent';
    else if (derived === code) says = 'agrees';
    else says = 'differs';

    const fold = foldPlaceName(r.name);
    const altFold = foldPlaceName(r.alt);
    const alts = altFold !== '' && altFold !== fold && isLatinFold(altFold) ? [altFold] : [];

    // **A-83 Part 9's two shipping conditions, and A-83 Part 11's delimiter refusal.** A refusal
    // is a row that never ships; each class is counted and the count is published.
    const text = [r.name, r.admin1, ...alts];
    if (text.some((s) => s.includes('�') || s.includes('?'))) {
      refuse(r, 'unreadable', code);
      continue;
    }
    if (text.some((s) => s.includes('|') || s.includes('\n') || s.includes('\r'))) {
      refuse(r, 'delimiter', code);
      continue;
    }
    // **QA R67-3 IS NOT FIXED HERE AND THE REASON IS THE RULE, NOT THIS LINE.** The finding is
    // that `Antilles` — the sea — ships as *"Antilles, Dominican Republic"*, rank 1 for its own
    // name, because it states the retired code `AN`, A-84 Part 5's translation resolved that to a
    // modal `DO`, and the row therefore no longer renders as a bare name by the time this test
    // runs. Moving the test before the translation was implemented and MEASURED, and it is not
    // the fix: **exactly ten shipped rows are "rescued" by the translation from this refusal, and
    // nine of them are right** — `Guadeloupe`, `Grande-Terre` and `La Désirade` (stating `GP`,
    // shipping `FR`), `Devils Island` in French Guiana (`GF` → `FR`), `Flying Fish Cove`, the
    // settlement on Christmas Island (`CX` → `AU`), `Bouvetøya` (`BV` → `NO`), `Hornsund` and
    // `Klovningen` (`SJ` → `NO`) and `Chissioua Mtsamboro` (`YT` → `FR`). Refusing a row *before*
    // the translation deletes all nine to remove one, and *"Guadeloupe, France"* is the exact
    // outcome A-84 Part 5 exists to produce.
    //
    // Nor does any ordering reach `Hispaniola`, the round's other case: it states `DO` outright,
    // never touches the translation, and renders *"Hispaniola, Dominican Republic"*, which is not
    // a bare name under any ordering of these tests. And a "refuse a retired code" rule does not
    // separate them either — `AN` is still a row of `countryInfo.txt`.
    //
    // So the mechanism A-83 Part 9 clause 1 states — *would this row render as a bare name* —
    // does not distinguish a multi-country landmass from a territory whose parent A-84 Part 5
    // deliberately fills in. That is a rule to widen, not a line to move, and ROADMAP `I-23`'s
    // instruction on this case is to STOP AND REPORT rather than decide it. Reported in
    // `docs/BUILD-NOTES.md`; this comment is here so the next person does not "fix" it in twenty
    // minutes and delete nine real islands. Disclosed as **KD-122**.
    if (code === null && r.admin1 === '') {
      refuse(r, 'bare-name', code);
      continue;
    }
    if (fold === '') {
      refuse(r, 'unreadable', code);
      continue;
    }

    // ---------------------------------------------------------------------------------------
    // **A-83 Part 9 CLAUSE 4 — a landmass the source itself says lies in more than one country
    // is not a city in any of them.** (§8.4 **A-93**, which supersedes A-89 Part 2's predicate
    // and depends on the rest of A-89; QA R67-3, MAJOR; ROADMAP I-31.)
    //
    // With `S` the row's stated code (possibly null), `C` the code it ships after A-84 Part 5's
    // parent translation (possibly null), `X` the non-empty codes of `cc2`, and `P(c)` the
    // **sovereign** of `c` as `ne_10m_admin_0_countries.geojson` states it at the pinned sha256:
    //
    //     REFUSE when the row's feature class is NOT `P`   AND   X \ {S, C, P(S), P(C)}  is non-empty
    //
    // **Both halves are load-bearing and each has its own injected fault.**
    //
    // **(1) The class restriction is A-83 Part 3's own axis, read rather than added.** Candidacy
    // is already *"feature class `P`, **or** feature code `ISL`/`ISLS`"*, and clause 4 applies to
    // the second arm. The defect this exists to fix is that **a name fails to say which country
    // you were in**, and that is a property of a name denoting an **extent**. A settlement's name
    // denotes a **point**; a point lies in one place, and a second jurisdictional claim on it is a
    // dispute about who governs it — which A-84 Part 5 already rules on by declining to name a
    // country rather than deleting the place. **Without this half the rule deletes `Vatican City`**
    // (`P/PPLC`, `cc=VA`, `cc2=[IT]`, 829 people), `Tórshavn`, `Saint Helier`, `Douglas`,
    // `Mariehamn`, `Laayoune`, `Dakhla` and 160 more: 169 rows, 167 of them false positives. That
    // is what `I-29` measured and stopped on (**KD-124**), and it is why A-89's form is not here.
    //
    // **(2) The sovereign subtraction closes the gap `C` cannot reach.** Subtracting `C` closes
    // the sovereign-parent case **only where the translation supplied the parent** — the whole of
    // what keeps `Longyearbyen` — and cannot close the case where the row already states a code
    // the index draws and `cc2` names its sovereign anyway. **Without this half the class
    // restriction alone deletes twelve correct terrain rows**: `Jersey` and `Guernsey` (`GB`),
    // `Alderney`, `Faroe Islands` (`DK`), `Signilskär` (`FI`), `Norfolk Island` (`AU`) and the six
    // French Southern islands (`FR`). A traveller who typed *Jersey* and got `NO MATCH` would be
    // meeting a worse defect than the one this fixes. **The direction of the relation is
    // load-bearing**: subtract `c` when `c == P(S)` (*"`cc2` names my sovereign"*), never when
    // `P(c) == S` (*"`cc2` names one of my dependencies"*) — inverted, all twelve are refused
    // again, because a sovereign has no sovereign.
    //
    // `Hispaniola`'s `cc2` is `HT,DO`: **the source names Haiti itself.** `Antilles`' names twenty
    // countries. **Every one of the nine rows the translation rescues from clause 1 leaves the
    // column empty** and is untouched by this. Four narrower rules were considered and each failed
    // on its own terms — refuse a retired code (`AN` is still a row of `countryInfo.txt`), refuse
    // feature code `ISLS` (`Guadeloupe` and `Hispaniola` are `ISL`), refuse an implausible
    // population (a dial wearing a rule's clothes), and refuse an island whose population exceeds
    // its country's (**it puts Taiwan inside 3 % of `TW`**).
    //
    // **CLAUSE 4's POSITION IS LAST AND IT IS DELIBERATE.** Clauses 1–3 and their ordering
    // against A-84 Part 5's translation **do not move** — that ordering is the whole of what
    // keeps the nine (KD-122), and clause 4 is orthogonal to it. Last, so a row that would render
    // as a bare name is published under `'bare-name'`, which is the reason a reviewer needs and
    // the reason A-83 Part 9's seven named archipelagos are recorded under.
    //
    // **What this deliberately does NOT do, at exactly the width of its mechanism.** It catches
    // only the landmasses GeoNames MARKS. **`Timor`** (`cc=ID`, `cc2` empty) still ships as
    // *"Timor, Indonesia"* although half of it is Timor-Leste, and **`Saint Martin`** (`cc=MF`,
    // `cc2` empty) still ships as `MF` although half of it is `SX` — the honest test is *"does
    // this feature's polygon cross a border in the index"*, and **we ship a coordinate, not a
    // polygon**. A-93 Part 9 residue 1 files both with their trigger; do not reach for a cheap
    // predicate here. And the class restriction leaves **141** class-`P` attributions this rule
    // does not defend (`Laayoune` `EH`, the Macau parishes `CN`, the Antarctic stations `AQ`);
    // they are published, grouped, in the audit below rather than left invisible.
    // **A-93 Part 2, in four lines.** `P(S)` and `P(C)` come from the layer already loaded above.
    const pS = admin0.sovereignOf(r.stated);
    const pC = admin0.sovereignOf(code);
    const subtract = new Set([r.stated, code, pS, pC].filter((c) => c !== null));
    const foreign = r.cc2.filter((c) => !subtract.has(c));

    // **A-93 Part 3(a)'s exempt population, published rather than invisible.** These are the
    // class-`P` rows A-89's form would have refused — `X \ {S, C}` non-empty — and which the class
    // restriction keeps. 141 predicted, grouped by `cc + foreign codes`. The group is computed on
    // A-89's predicate deliberately: it is the cost of the class restriction, and the sovereign
    // subtraction is the *other* half of the rule, priced separately.
    if (r.cls === 'P') {
      const a89 = r.cc2.filter((c) => c !== r.stated && c !== code);
      if (a89.length > 0) classPExempt.push({ name: r.name, key: `${r.stated ?? 'no code'}+${a89.join(',')}` });
    } else {
      // Rows kept **only** by one of the subtractions, each measured over clause 4's own
      // population. A-93 Part 3 predicts **0** for both and **prints them either way**: a non-zero
      // count is a result to report; a missing line is the failure.
      if (foreign.length === 0) {
        const withoutS = r.cc2.filter((c) => c !== code && c !== pS && c !== pC);
        if (withoutS.length > 0) keptByS.push(r.name);
        const withoutPC = r.cc2.filter((c) => c !== r.stated && c !== code && c !== pS);
        if (withoutPC.length > 0) keptByPC.push(r.name);
      }
      // The sovereign pairs this corpus's clause 4 **actually used** — a pair is recorded only
      // where it removed a code the row really carries. 6 predicted; a loaded pair becoming
      // load-bearing arrives as a new line here and a golden diff, not silently (A-93 Part 3(b)).
      if (pS !== null && r.cc2.includes(pS)) sovereignUsed.add(`${r.stated}->${pS}`);
      if (pC !== null && r.cc2.includes(pC)) sovereignUsed.add(`${code}->${pC}`);

      if (foreign.length > 0) {
        clause4.push({ ...r, shippedCode: code, foreign });
        refuse(r, 'multi-country', code);
        continue;
      }
    }

    if (r.lat === 0 && r.lng === 0) atOrigin.push(r.name);

    // **Every published count is over SHIPPED rows.** A refused row is not a row the corpus makes
    // a claim about, so it may not appear in the census, in the parents golden or in the
    // disagreements golden — a golden that names a row nobody can find is a golden that sends a
    // reviewer looking for it.
    census[says] += 1;
    if (parent !== null) {
      parents.push(parent);
      if (parent.shippedCode !== null) translated += 1;
    }
    if (says === 'differs') {
      disagreements.push({
        id: `${ID_PREFIX}:${r.gid.toString(36)}`,
        name: r.name,
        statedCountry: code,
        derivedCountry: derived,
      });
    }

    shipped.push({
      gid: r.gid,
      name: r.name,
      fold,
      alts,
      countryCode: code,
      admin1: r.admin1,
      bucket: popBucket(r.population),
      lat: r.lat,
      lng: r.lng,
      says,
      id: r.gid.toString(36),
    });
  }

  // **A-82 Part 2's total order, and it IS the artefact**: ascending folded name, then descending
  // population bucket (A-83 Part 4's substitution for population), then ascending country code,
  // then ascending id. Every key is needed and only the first two decide anything a reader would
  // notice; the last two exist so a regeneration cannot reshuffle.
  // The last key is the **emitted id string**, not the numeric GeoNames id, because that is what
  // `searchGazetteer`'s own comparator compares — base-36 `'z'` is numerically 35 and lexically
  // after `'10'`, so sorting the artefact numerically would put it in an order the shipped
  // comparator disagrees with, and the order is supposed to BE the artefact.
  shipped.sort((a, b) =>
    (a.fold < b.fold ? -1 : a.fold > b.fold ? 1 : 0) ||
    b.bucket - a.bucket ||
    ((a.countryCode ?? '') < (b.countryCode ?? '') ? -1 : (a.countryCode ?? '') > (b.countryCode ?? '') ? 1 : 0) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  disagreements.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : 1));
  parents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : 1));

  const admin1 = [...new Set(shipped.map((r) => r.admin1).filter((s) => s !== ''))].sort();
  const admin1At = new Map(admin1.map((s, i) => [s, i]));
  const countryNames = readCountryNames(cacheDir, new Set(shipped.map((r) => r.countryCode).filter((c) => c !== null)));

  return {
    rows: shipped, admin1, admin1At, countryNames,
    parents, disagreements, census, refusedRows, keptByS, keptByPC, sovereignUsed, classPExempt,
    clause4, atOrigin, codeParent, codeTally, sovereignPairs: admin0.sovereignPairs,
    stats: { candidates: n, selected: nSelected, gates, translated, features, altRows, maxNearest },
  };
}

const less = (a, b) => {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
};

/** `admin1CodesASCII.txt` → `"<CC>.<code>" → region name`. A-83 Part 3: this is where R60-9 died. */
function readAdmin1(cacheDir) {
  const out = new Map();
  const text = readFileSync(join(cacheDir, SOURCES.admin1.file), 'utf8');
  for (const line of text.split('\n')) {
    if (line === '') continue;
    const f = line.split('\t');
    out.set(f[0], f[1]);
  }
  return out;
}

/** `countryInfo.txt` → the code→name table, restricted to the codes the corpus actually ships. */
function readCountryNames(cacheDir, used) {
  const text = readFileSync(join(cacheDir, SOURCES.countryInfo.file), 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    if (line === '' || line.startsWith('#')) continue;
    const f = line.split('\t');
    if (used.has(f[0])) out[f[0]] = f[4];
  }
  const sorted = {};
  for (const code of Object.keys(out).sort()) sorted[code] = out[code];
  return sorted;
}

/**
 * The pinned 1:10m admin-0 layer, as a point locator over `ISO_A2_EH` — **A-84 Part 5**.
 *
 * This is not the country index and it does not become one: `COUNTRY_INDEX` does not move (A-84
 * Part 5's own *"what this deliberately does NOT do"*). It is read here only to answer *which
 * feature contains this row*, at generation time, for the rows whose stated code the shipped index
 * cannot draw.
 */
function readAdmin0(cacheDir) {
  const geo = JSON.parse(readFileSync(join(cacheDir, SOURCES.admin0.file), 'utf8'));

  // **A-93 Part 2's `P(c)` — the SOVEREIGN of a country code, read from the layer that already
  // states sovereigns, on the load this generator already does.** A-93: "no new source, no new
  // fetch, no new pin"; loading this layer a second time would be the defect.
  //
  // The join, and the one place the ruling's sentence and the pinned bytes disagree — disclosed in
  // BUILD-NOTES as KD-125. A-93 words it as *"the `ISO_A2_EH` of the feature whose `ADM0_A3` is
  // that code's `SOV_A3` and whose `ADMIN` equals its own `SOVEREIGNT`"*. **Taken literally that
  // join is empty**: at v5.1.2 a dependency's `SOV_A3` is the sovereign's *group* code — `GB1`,
  // `FR1`, `DN1` — and **no feature carries `ADM0_A3 = 'GB1'`** (the United Kingdom's is `GBR`).
  // The join that produces the ruling's own measured facts is on `SOV_A3`: the sovereign of `c` is
  // the feature in `c`'s **own `SOV_A3` group** whose `ADMIN` equals its `SOVEREIGNT` — i.e. the
  // group's self-governing member. That yields **41** codes with a distinct sovereign, which is
  // A-93 Part 3(b)'s own number, and `P(JE) = GB`, `P(FO) = DK`, `P(AX) = FI`, `P(NF) = AU`,
  // `P(TF) = FR`, `P(GG) = GB`, which are its own six load-bearing pairs.
  //
  // `null` where the layer names no distinct sovereign — a sovereign has no sovereign, which is
  // what makes A-93 Part 7 fault 5 (invert the relation) delete all twelve.
  const isoOf = (p) => (isIso(p.ISO_A2_EH) ? p.ISO_A2_EH : null);
  const selfGoverning = new Map();
  for (const f of geo.features) {
    const p = f.properties;
    if (p.ADMIN === p.SOVEREIGNT) selfGoverning.set(p.SOV_A3, p);
  }
  const sovereign = new Map();
  for (const f of geo.features) {
    const p = f.properties;
    const code = isoOf(p);
    if (code === null) continue;
    const head = selfGoverning.get(p.SOV_A3);
    const parent = head === undefined ? null : isoOf(head);
    if (parent !== null && parent !== code && !sovereign.has(code)) sovereign.set(code, parent);
  }

  const features = [];
  for (const f of geo.features) {
    const p = f.properties;
    const code = isIso(p.ISO_A2_EH) ? p.ISO_A2_EH : null;
    const g = f.geometry;
    if (!g) continue;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys) {
      const rings = poly.map((ring) => ring.map(([lng, lat]) => [lng, lat]));
      let minLng = Infinity; let minLat = Infinity; let maxLng = -Infinity; let maxLat = -Infinity;
      for (const [lng, lat] of rings[0]) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      features.push({ code, name: p.NAME, rings, box: [minLng, minLat, maxLng, maxLat] });
    }
  }
  const inRing = (ring, x, y) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const toSegment = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  return {
    /**
     * **A-93 Part 2's `P(c)`.** The sovereign of a country code as this layer states it, or `null`
     * where it names no distinct sovereign. Measured at the pinned sha256: 41 codes have one.
     */
    sovereignOf(code) {
      return code === null ? null : sovereign.get(code) ?? null;
    },
    /** Every `c -> P(c)` the layer names, for the audit's own reporting. */
    sovereignPairs: sovereign,
    /**
     * Where this point is, in the layer the index is cut from: `{code, via, degrees}`.
     *
     * **`via: 'nearest'` is a coastal tolerance, and it is here because measurement put it here.**
     * Natural Earth's populated-places layer carried *cartographic label points*, which sit on
     * drawn land by construction. GeoNames carries *settlement coordinates*, which do not: at
     * 1:10m, **Longyearbyen sits 400 m out into Adventfjorden, Basse-Terre 1.4 km offshore and
     * Dzaoudzi 2.2 km off Petite-Terre**, so a containment test alone answers `null` for a capital
     * whose country the layer draws perfectly well 400 m away. Within `NEAREST_TOLERANCE` the
     * nearest feature is taken, and the row records that it was — every one is published in
     * `gazetteer-parents.json` with its `via`, so the fallback is countable rather than invisible.
     */
    locate(lng, lat) {
      for (const f of features) {
        const [a, b, c, d] = f.box;
        if (lng < a || lng > c || lat < b || lat > d) continue;
        if (!inRing(f.rings[0], lng, lat)) continue;
        let hole = false;
        for (let i = 1; i < f.rings.length; i += 1) if (inRing(f.rings[i], lng, lat)) { hole = true; break; }
        if (!hole) return { code: f.code, via: 'contained', degrees: 0 };
      }
      let best = null;
      for (const f of features) {
        const [a, b, c, d] = f.box;
        if (lng < a - NEAREST_TOLERANCE || lng > c + NEAREST_TOLERANCE) continue;
        if (lat < b - NEAREST_TOLERANCE || lat > d + NEAREST_TOLERANCE) continue;
        for (const ring of f.rings) {
          for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
            const dist = toSegment(lng, lat, ring[j][0], ring[j][1], ring[i][0], ring[i][1]);
            if (best === null || dist < best.degrees) best = { code: f.code, via: 'nearest', degrees: dist };
          }
        }
      }
      return best !== null && best.degrees <= NEAREST_TOLERANCE
        ? best
        : { code: null, via: 'none', degrees: Infinity };
    },
  };
}

function report(built) {
  const { census, stats } = built;
  const refusals = buildRefusals(built);
  console.log('');
  console.log(`rows shipped   ${built.rows.length}`);
  console.log(`admin-1 dict   ${built.admin1.length}`);
  console.log(`country names  ${Object.keys(built.countryNames).length}`);
  console.log('');
  console.log('A-84 Part 6\'s census — what the shipped index says about each row\'s own claim:');
  console.log(`  agrees   ${String(census.agrees).padStart(6)}`);
  console.log(`  differs  ${String(census.differs).padStart(6)}   SHIPPED, marked — border towns`);
  console.log(`  silent   ${String(census.silent).padStart(6)}   the index has no answer, or the row has no code`);
  console.log('');
  console.log(`A-84 Part 5 — parent translation: ${built.parents.length} rows whose stated code the index cannot draw`);
  console.log(`  translated to a drawable parent   ${stats.translated}`);
  console.log(`  shipped countryCode: null         ${built.parents.length - stats.translated}`);
  console.log('');
  console.log('A-83 Part 9 / Part 11 — refusals, each published by name in the refusals golden:');
  for (const [reason, n] of Object.entries(refusals.byReason)) {
    console.log(`  ${reason.padEnd(15)} ${String(n).padStart(6)}`);
  }
  // **A-93 Part 8 — the stop-and-report is a NAMED SET and a CAP OF ZERO, because a population
  // threshold is what let this through.** `I-29`'s condition was *"anything over 100,000 people
  // that is not Antilles or Hispaniola"*; it fired correctly and it could not have seen Vatican
  // City (829). The condition is now A-93 Part 2's sixteen rows, by name and by GeoNames id, in
  // either direction — an added row or a missing one. A corpus swap that changes the set is a
  // reviewed golden update with the rows named in the commit message, never an automatic
  // regeneration.
  console.log('');
  console.log(
    `  A-83 Part 9 clause 4 (A-93 Part 2) — ${built.clause4.length} rows refused. ` +
      'Every one, with its class, cc2 and population:',
  );
  for (const r of built.clause4) {
    console.log(`    ${r.name} [${r.cls}] (${r.stated ?? 'no code'} -> ${r.shippedCode ?? 'null'}) cc2=[${r.cc2.join(',')}] pop=${r.population}`);
  }
  // **A-93 Part 3: the two inert subtractions, PRINTED rather than assumed.** Both are predicted
  // zero on this corpus and both stay in the rule, because the rule's sentence is "neither the
  // country it states, nor the country we attribute it to, nor the sovereign of either" and a rule
  // that does not say what it means is the next round's finding. A non-zero count is a result to
  // report; a MISSING line is the failure, so these print unconditionally.
  console.log(`  clause 4 — rows kept ONLY by the S subtraction: ${built.keptByS.length}` +
    (built.keptByS.length ? ` — ${built.keptByS.slice(0, 20).join(', ')}` : '  (A-93 Part 3 predicts 0)'));
  console.log(`  clause 4 — rows kept ONLY by P(C) beyond P(S): ${built.keptByPC.length}` +
    (built.keptByPC.length ? ` — ${built.keptByPC.slice(0, 20).join(', ')}` : '  (A-93 Part 3 predicts 0)'));
  // **A-93 Part 3(b): the sovereign pairs clause 4 actually USED.** The layer names 41; six are
  // load-bearing here. The politically loaded pairs it also carries — PS->IL, HK->CN, MO->CN,
  // GI->GB, FK->GB, IO->GB, NC->FR — are measured inert, and one of them becoming load-bearing
  // arrives as a new name on this line and a golden diff rather than silently.
  const used = [...built.sovereignUsed].sort();
  console.log(`  clause 4 — sovereign pairs used: ${used.length} of ${built.sovereignPairs.size} the layer names` +
    (used.length ? ` — ${used.join(', ')}` : ''));
  // **A-93 Part 3(a): the population the class restriction exempts, countable and nameable.**
  // These are the class-`P` rows A-89's form would have refused. Their attribution is not defended
  // by this ruling; the claim is only that this ruling does not touch it (A-84 Part 5 owns it).
  const exemptGroups = new Map();
  for (const r of built.classPExempt) exemptGroups.set(r.key, (exemptGroups.get(r.key) ?? 0) + 1);
  const biggest = [...exemptGroups].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  console.log(`  clause 4 — class-P rows the class restriction exempts: ${built.classPExempt.length}` +
    ` in ${exemptGroups.size} groups (cc + foreign codes); largest: ` +
    biggest.slice(0, 4).map(([k, n]) => `${k} ${n}`).join(', '));

  const set = new Map(built.clause4.map((r) => [r.gid, r.name]));
  const missing = CLAUSE_4_SET.filter(([gid]) => !set.has(gid)).map(([gid, name]) => `${name} (${gid})`);
  const added = [...set].filter(([gid]) => !CLAUSE_4_SET.some(([g]) => g === gid))
    .map(([gid, name]) => `${name} (${gid})`);
  if (missing.length || added.length) {
    console.log('');
    console.log('  !! ROADMAP I-31 / A-93 Part 8 STOP-AND-REPORT — clause 4\'s match set is not the');
    console.log('     sixteen rows A-93 Part 2 commits by name and by id. The cap is ZERO in either');
    console.log('     direction, because a threshold is what let Vatican City through.');
    for (const m of missing) console.log(`       MISSING (committed, not matched): ${m}`);
    for (const a of added) console.log(`       ADDED   (matched, not committed): ${a}`);
    throw new Error(
      `A-83 Part 9 clause 4 matched ${built.clause4.length} rows: ${missing.length} of A-93 Part 2's ` +
        `sixteen are missing and ${added.length} are new. STOP AND REPORT, writing nothing. A corpus ` +
        'swap that changes this set is a reviewed golden update with the rows named in the commit ' +
        'message (§0 position 11, sequencing rule 11), never an automatic regeneration.',
    );
  }
  // **A-93 Part 8 condition 1 — structurally impossible under Part 2, which is the point.** It is
  // the guard against the predicate being re-widened over the arm that denotes a point.
  //
  // **The condition is *"clause 4 matches any row of feature class `P`"*, and it is scoped to
  // clause 4 rather than to every refusal.** ROADMAP `I-31` states the criterion one notch wider —
  // *"no refused row of ANY reason has feature class `P`"* — and **that wider sentence is false on
  // this corpus and was false before this increment**: `Bantam Village` (Cocos (Keeling) Islands,
  // `P/PPL`) is refused under `'bare-name'`, because `CC` translates to `null` (the layer answers
  // `null:3 AU:2`) and the row carries no region. It is one of the 18 pre-existing `bare-name`
  // refusals and nothing here touches it. Disclosed in BUILD-NOTES as KD-126.
  const classP = built.refusedRows.filter((r) => r.reason === 'multi-country' && r.cls === 'P');
  if (classP.length) {
    throw new Error(
      `${classP.length} clause-4 refusal(s) have feature class P: ` +
        `${classP.slice(0, 10).map((r) => r.name).join(', ')}. A-93 Part 8 condition 1: clause 4 ` +
        'is scoped to the ISL/ISLS arm of A-83 Part 3\'s candidacy rule. STOP AND REPORT.',
    );
  }
  if (built.atOrigin.length) {
    console.log('');
    console.log(`  !! ${built.atOrigin.length} row(s) sit at exactly {0,0}: ${built.atOrigin.slice(0, 10).join(', ')}`);
  }
}

// ---------------------------------------------------------------- packing and sharding

/** One packed row — A-83 Part 4's field order, minus the fold, which is recomputed on decode. */
function pack(r, admin1At) {
  const b36 = (v) => (v < 0 ? `-${Math.abs(v).toString(36)}` : v.toString(36));
  return [
    r.name,
    r.alts.join(','),
    r.countryCode ?? '',
    r.admin1 === '' ? '' : admin1At.get(r.admin1).toString(36),
    r.bucket.toString(36),
    b36(Math.round(r.lat * 1e4)),
    b36(Math.round(r.lng * 1e4)),
    r.id,
    r.says === 'agrees' ? 'a' : r.says === 'differs' ? 'd' : 's',
  ].join('|');
}

/**
 * **A-83 Part 6: duplication, bounded by measurement, and no index.**
 *
 * A row is written into the shard of **every distinct token** of its folded name and of its folded
 * English alternate; a query is answered from **exactly one** shard, chosen by its first folded
 * token. That is complete: if the folded query is a prefix of the whole folded name it is a prefix
 * of its first token, and if it is a prefix of an interior token it is a single token itself.
 *
 * **The split is adaptive rather than fixed-width.** A shard starts as one character and splits
 * while its payload exceeds 96 KiB — *the budget is the invariant; the width is whatever the
 * budget requires*. Fixed widths were measured and rejected: one character gives a largest shard
 * of 600 kB–1.3 MB, and two characters still cannot answer an `isla` prefix at 306 kB.
 */
function shard(built, corpusSha, indexSha) {
  const packed = built.rows.map((r) => pack(r, built.admin1At));
  const cost = packed.map((s) => Buffer.byteLength(JSON.stringify(s), 'utf8') + 1);

  /** (token, row index) pairs, in row order, so every shard inherits the total order. */
  const pairs = [];
  for (let i = 0; i < built.rows.length; i += 1) {
    const r = built.rows[i];
    const tokens = new Set([...r.fold.split(' '), ...r.alts.flatMap((a) => a.split(' '))]);
    for (const token of tokens) if (token !== '') pairs.push([token, i]);
  }
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));

  const OVERHEAD = 64; // {"v":1,"k":"…","s":"<64 hex>","r":[]}
  const splits = new Set();
  const leaves = new Map();
  const overBudget = [];

  const recurse = (prefix, items) => {
    const bytes = items.reduce((n, [, i]) => n + cost[i], OVERHEAD + prefix.length + 64);
    const splittable = items.some(([t]) => t !== prefix);
    if (bytes <= SHARD_BUDGET || !splittable) {
      if (bytes > SHARD_BUDGET) overBudget.push({ key: prefix, bytes });
      leaves.set(prefix, items);
      return;
    }
    splits.add(prefix);
    const groups = new Map();
    const terminal = [];
    for (const item of items) {
      const [t] = item;
      if (t === prefix) { terminal.push(item); continue; }
      const c = t.slice(prefix.length, prefix.length + 1);
      const g = groups.get(c);
      if (g === undefined) groups.set(c, [item]); else g.push(item);
    }
    if (terminal.length) leaves.set(`${prefix}$`, terminal);
    for (const c of [...groups.keys()].sort()) recurse(prefix + c, groups.get(c));
  };

  const first = new Map();
  for (const item of pairs) {
    const c = item[0].slice(0, 1);
    const g = first.get(c);
    if (g === undefined) first.set(c, [item]); else g.push(item);
  }
  for (const c of [...first.keys()].sort()) recurse(c, first.get(c));

  const splitList = [...splits].sort();

  // **A terminal shard holds FIRST tokens only, and this is a correction to A-83 Part 6 that
  // measurement forced. Disclosed in BUILD-NOTES as KD-118.**
  //
  // Part 6's completeness argument — *"a query is answered from exactly one shard, chosen by the
  // query's first folded token"* — holds only where that token resolves to a leaf. It does not
  // always: `de` is a **split** prefix here, so the bare query `de` would resolve to `de$` and miss
  // Delhi, Denver and Detroit, which live in `del`, `den` and `det`. Part 6 already rules that
  // exact shape for **one character** (*"the correct answer is the terminal shard plus every shard
  // beneath it, which is a fetch of everything under that letter — this design refuses that"*) and
  // answers it with `null`, *"keep typing"*, not *"no match"*. The manifest makes the boundary
  // exact instead of assuming it is always one character.
  //
  // A terminal shard is still a real answer, to a query with a **second word**: `san marino` can
  // only match a row whose whole fold begins `san marino`, so its first token is exactly `san`.
  // That is the whole population a terminal shard has to hold — **rows whose FIRST token is the
  // prefix** — and dropping the interior-token copies is what takes `de$` from 104 kB, 6 % over the
  // budget, to a few hundred bytes: `Rio de Janeiro`'s `de` copy could only ever have answered a
  // query the loader refuses.
  const firstTokens = built.rows.map((r) => new Set([
    r.fold.split(' ')[0],
    ...r.alts.map((a) => a.split(' ')[0]),
  ]));
  const kept = pairs.filter(([token, i]) => !splits.has(token) || firstTokens[i].has(token));
  const terminal = kept.filter(([token]) => splits.has(token)).length;
  console.log(`  ${pairs.length - kept.length} unreachable token copies dropped, ${terminal} rows in a terminal shard`);

  const shards = [];
  let emitted = 0;
  let largest = { key: '', bytes: 0 };
  const keptKeys = new Map();
  for (const item of kept) {
    const key = shardKeyFor(item[0], splits);
    const g = keptKeys.get(key);
    if (g === undefined) keptKeys.set(key, [item]); else g.push(item);
  }
  for (const key of [...keptKeys.keys()].sort()) {
    const items = keptKeys.get(key);
    // A row that carries two tokens under the same shard is written once, not twice.
    const rows = [...new Set(items.map(([, i]) => i))].sort((a, b) => a - b);
    const doc = { v: 1, k: key, s: corpusSha, r: rows.map((i) => packed[i]) };
    const text = `${JSON.stringify(doc)}\n`;
    const bytes = Buffer.byteLength(text, 'utf8');
    emitted += rows.length;
    if (bytes > largest.bytes) largest = { key, bytes };
    shards.push({ key, file: `${fileNameFor(key)}.json`, text, bytes, rows });
  }

  const fileNames = new Set(shards.map((s) => s.file));
  if (fileNames.size !== shards.length) throw new Error('two shard keys map to one file name');

  const meta = {
    v: 1,
    $source: ATTRIBUTION,
    $sourceSha256: corpusSha,
    $countryIndexSha256: indexSha,
    $fetched: FETCHED,
    $what:
      'The session-once half of the sharded offline city gazetteer (ARCHITECTURE §8.4 A-83 Part 5). ' +
      'GENERATED by cairn/tools/gen-gazetteer.mjs — do not edit. Every shard beside this file ' +
      'carries the same $sourceSha256 and the loader refuses a pair that disagrees. ' +
      '$sourceSha256 RECORDS what this corpus was built from — sha256 over the five source ' +
      'checksums AND $countryIndexSha256, because the corpus is a function of the shipped ' +
      'COUNTRY_INDEX too: it decides indexSays, the silent-contradiction refusal and A-84 Part ' +
      "5's parent translation (QA R67-7). It is a FENCE, not a key: it refuses a build made from " +
      'anything else, and it does NOT assert those bytes can be obtained again. GeoNames rebuilds ' +
      'every dump daily and archives nothing, so THIS CORPUS CANNOT BE REBUILT FROM SOURCE by ' +
      'anybody, including us (\u00a78.4 A-90, \u00a70 position 11). $fetched and each source\'s ' +
      'byte length are published in fixtures/golden/gazetteer-source-log.json so a mismatch can ' +
      'be diagnosed rather than merely detected.',
    idPrefix: ID_PREFIX,
    rows: built.rows.length,
    shardCount: shards.length,
    indexSays: built.census,
    admin1: built.admin1,
    countryNames: built.countryNames,
    splits: splitList,
    files: Object.fromEntries(shards.map((s) => [s.key, s.file])),
  };
  const metaText = `${JSON.stringify(meta)}\n`;

  if (overBudget.length) {
    for (const o of overBudget) console.log(`  !! shard "${o.key}" is ${o.bytes} bytes and cannot split`);
  }
  return {
    shards, splits: splitList, emitted, largest, meta,
    metaText, metaBytes: Buffer.byteLength(metaText, 'utf8'), packed, corpusSha, indexSha,
  };
}

/**
 * **R60-5: the round trip compares STRUCTURES, not strings.** A-82's version compared the emitted
 * literal to `pack(built)` — two strings — so a `|` inside a name would shift every field of that
 * row and round-trip clean. It measured green on a row that was broken. This parses what was
 * written and compares it field by field to what was built.
 */
function roundTrip(docs, built) {
  let checked = 0;
  for (const s of docs.shards) {
    const doc = JSON.parse(s.text);
    if (doc.k !== s.key) throw new Error(`round-trip: shard ${s.key} names itself ${doc.k}`);
    if (doc.s !== docs.corpusSha) throw new Error(`round-trip: shard ${s.key} carries the wrong source sha`);
    if (doc.r.length !== s.rows.length) throw new Error(`round-trip: shard ${s.key} has ${doc.r.length} rows, built ${s.rows.length}`);
    for (let i = 0; i < doc.r.length; i += 1) {
      const f = doc.r[i].split('|');
      const r = built.rows[s.rows[i]];
      if (f.length !== 9) throw new Error(`round-trip: ${r.name} re-parses to ${f.length} fields, not 9`);
      const want = [
        r.name,
        r.alts.join(','),
        r.countryCode ?? '',
        r.admin1 === '' ? '' : built.admin1At.get(r.admin1).toString(36),
        r.bucket.toString(36),
        (Math.round(r.lat * 1e4) < 0 ? '-' : '') + Math.abs(Math.round(r.lat * 1e4)).toString(36),
        (Math.round(r.lng * 1e4) < 0 ? '-' : '') + Math.abs(Math.round(r.lng * 1e4)).toString(36),
        r.id,
        r.says === 'agrees' ? 'a' : r.says === 'differs' ? 'd' : 's',
      ];
      for (let k = 0; k < 9; k += 1) {
        if (f[k] !== want[k]) {
          throw new Error(
            `round-trip: ${JSON.stringify(r.name)} field ${k} re-parses to ${JSON.stringify(f[k])}, built ${JSON.stringify(want[k])}`,
          );
        }
      }
      // The row must be findable in the shard it was written to — which is what makes the
      // generator's copy of `foldPlaceName` a checked pair now that the fold is not shipped.
      const tokens = new Set([...r.fold.split(' '), ...r.alts.flatMap((a) => a.split(' '))]);
      const keys = new Set([...tokens].filter((t) => t !== '').map((t) => shardKeyFor(t, new Set(docs.splits))));
      if (!keys.has(s.key)) throw new Error(`round-trip: ${r.name} is in shard ${s.key}, which none of its tokens resolve to`);
      checked += 1;
    }
  }
  if (checked !== docs.emitted) throw new Error(`round-trip: checked ${checked} of ${docs.emitted} emitted rows`);
}

// ---------------------------------------------------------------- writing

/**
 * **The corpus is REPLACED, never deleted-then-written** — §8.4 **A-94** Part 6 / QA **R68-9**.
 *
 * This function used to `rmSync` every `.json` under the corpus directory and *then* write 963
 * documents into the hole. **That directory is the artefact of record** (A-90 clause 1): nobody,
 * including us, can rebuild it from source, so an interrupted run left an empty or partial corpus
 * recoverable only from git — and `git checkout` is a recovery step, not a property of a tool.
 *
 * `tools/corpus-write.mjs` builds the new corpus in a sibling directory and swaps it in with two
 * renames, so at every interruptible point one complete corpus is on disk. It is a separate module
 * because **an injected fault has to be executable**: `packages/core/test/gazetteerArtefact.test.ts`
 * imports it, throws from `beforeSwap`, and asserts the old corpus survived. That is `I-32`'s N8.
 */
function write(docs, built) {
  const files = [
    { name: 'meta.json', text: docs.metaText },
    ...docs.shards.map((s) => ({ name: s.file, text: s.text })),
  ];
  const swap = writeCorpusAtomically(CORPUS_DIR, files);

  const total = docs.shards.reduce((n, s) => n + s.bytes, 0) + docs.metaBytes;
  writeFileSync(SHARD_MAP, emitShardMap(docs, built, total));

  console.log('');
  console.log(`wrote packages/core/src/geo/gazetteer/  (${docs.shards.length + 1} documents, ` +
    `staged and swapped; ${swap.removed.length} stale document(s) dropped)`);
  console.log(`  meta.json      ${docs.metaBytes} bytes`);
  console.log(`  largest shard  ${docs.largest.bytes} bytes  "${docs.largest.key}"`);
  console.log(`  total          ${total} bytes`);
  console.log(`  ^ this is the number that goes in CORPUS_BYTES in`);
  console.log(`    packages/core/test/0-gazetteerBudget.test.ts, and in no document.`);
  console.log(`wrote packages/core/src/geo/gazetteerShards.gen.ts  (${statSync(SHARD_MAP).size} bytes)`);
}

function emitShardMap(docs, built, total) {
  const { census, stats } = built;
  // **R67-10: the header's per-reason counts are READ FROM the refusals golden**, not computed
  // beside it. `buildRefusals` derives `byReason` from the very array it writes, so deleting a row
  // from the file moves a number here. A count in a header that no file can be checked against is
  // a census with no denominator, one artefact out (§0 position 10a).
  const { byReason, total: refusedTotal } = buildRefusals(built);
  const refusedLine = Object.entries(byReason).map(([reason, n]) => `${n} ${reason}`).join(' \u00b7 ');
  const entries = docs.shards
    .map((s) => `  ${JSON.stringify(s.key)}: () => import('./gazetteer/${s.file}', { with: { type: 'json' } }),`)
    .join('\n');
  return `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by \`node tools/gen-gazetteer.mjs\`. Re-run that to change it; a hand edit here is lost
 * on the next run and untraceable to a source in the meantime.
 *
 * **The shard map for the offline city gazetteer** — ARCHITECTURE §8.4 **A-83** Parts 5, 6 and 7,
 * with **A-84** Parts 5 and 6; ROADMAP Phase 2 **I-23**. One lazy import per shard document, which
 * is the whole mechanism: a search fetches **one** shard, not the corpus.
 *
 * Source : GeoNames — allCountries, alternateNamesV2, admin1CodesASCII, countryInfo.
 *          **Licensed CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/), the first
 *          attribution obligation in this repository. The attribution rides on the DATA:
 *          \`gazetteer/meta.json\`'s \`$source\` carries it, \`Gazetteer.source\` is that string, and
 *          **any surface that renders a hit must render it**. Country outlines for A-84 Part 5's
 *          parent translation: Natural Earth ne_10m_admin_0_countries v5.1.2, public domain.
 * Pinned : GeoNames publishes no release tag — the dumps are regenerated daily — so each source
 *          file is pinned by **sha256 and by fetch date** rather than by a ref, and the generator
 *          REFUSES TO WRITE on a mismatch. Fetched ${FETCHED}.
${Object.entries(SOURCES).map(([k, s]) => ` *          ${k.padEnd(15)} ${s.sha256}`).join('\n')}
 *          countryIndex    ${docs.indexSha}  (sha256 of COUNTRY_INDEX by value)
 *          corpus sha256   ${docs.corpusSha}
 *          (the corpus sha is taken over the five source checksums **and the shipped
 *          \`COUNTRY_INDEX\`**, which the generator reads for \`indexSays\`, for the silent-
 *          contradiction refusal and for A-84 Part 5's parent translation — QA R67-7. \`meta.json\`
 *          and every shard carry it, and the loader refuses a pair that disagrees — A-83 Part 4's
 *          skew hazard.)
 * Filter : **notability, not population** (A-83 Parts 1 and 3). Class \`P\`, or feature code
 *          \`ISL\`/\`ISLS\`; selected on \`languages >= ${NOTABILITY.languages}\`, or a Wikipedia link with
 *          population >= ${NOTABILITY.wikiPopulation}, or class P with population >= ${NOTABILITY.floorPopulation}.
 *          ${stats.candidates} candidates → ${stats.selected} selected → ${built.rows.length} shipped.
 *          QA round 60 measured the population-filtered predecessor at **21.5 %** of a
 *          171-destination travel corpus. Hallstatt has 779 residents and a million visitors a
 *          year; the filter was on the wrong axis.
 * Shards : ${docs.shards.length} documents, ${docs.splits.length} split prefixes, ${docs.emitted} emitted rows
 *          (duplication ${(docs.emitted / built.rows.length).toFixed(3)}×, the price of one-search-one-shard).
 *          Largest ${docs.largest.bytes} bytes ("${docs.largest.key}") against a ${SHARD_BUDGET}-byte budget;
 *          ${total} bytes committed in total. **The budget is the invariant and the
 *          width is whatever the budget requires** (A-83 Part 6).
 * Census : ${census.agrees} agree with countryOf · ${census.differs} differ (shipped, marked) ·
 *          ${census.silent} silent. **Silence is not agreement** — §8.4 **A-84** Part 6: the field is
 *          \`indexSays: 'agrees' | 'differs' | 'silent'\`, because the boolean it replaces shipped
 *          all 436 index-silent rows claiming agreement. Every differing row is published with
 *          BOTH answers in \`fixtures/golden/gazetteer-disagreements.json\`; a row that would
 *          contradict the index without carrying that record is still REFUSED.
 * Parents: ${built.parents.length} rows carry a country code the shipped index cannot draw. Each is resolved
 *          against ne_10m_admin_0_countries' own \`ISO_A2_EH\` — ${stats.translated} ship the containing
 *          feature's code, ${built.parents.length - stats.translated} ship \`countryCode: null\`. **No row is refused for
 *          this**: Cairn does not adjudicate a sovereignty its own map cannot draw (A-84 Part 5).
 *          Published in \`fixtures/golden/gazetteer-parents.json\`.
 * Refused: ${refusedTotal} candidate rows, ${refusedLine}. **Every one is named in
 *          \`fixtures/golden/gazetteer-refusals.json\` and these counts ARE that file's group
 *          sizes, read from it** (A-89 Part 3, QA R67-10) — a count in a header no file can be
 *          checked against is a census with no denominator. \`bare-name\` is A-83 Part 9 clause 1,
 *          \`unreadable\` clause 2, \`delimiter\` A-83 Part 11, and **\`multi-country\` is clause 4**
 *          (§8.4 **A-89**, QA R67-3): a row whose \`cc2\` — \`allCountries\` column 10 — names a
 *          country that is neither the code it states nor the code we attribute it to. GeoNames'
 *          own \`Hispaniola\` row names Haiti; \`Antilles\`' names twenty countries. **It catches
 *          only the landmasses GeoNames MARKS**: \`Ireland\`, \`Borneo\`, \`New Guinea\` and
 *          \`Tierra del Fuego\` leave the column empty and survive, because the honest test needs
 *          a polygon and we ship a coordinate.
 * Rebuild: **THIS CORPUS CANNOT BE REBUILT FROM SOURCE — by anybody, including us** (§0 position
 *          11, §8.4 **A-90**). GeoNames regenerates every dump daily, retains **one day** of
 *          \`modifications\`/\`deletes\` and archives nothing, so a past state can be neither
 *          refetched nor replayed; Overture, the obvious upgrade, drops each release after ~60
 *          days. So **the committed corpus is the artefact of record** and every claim this
 *          product makes about its gazetteer is checked against these bytes, offline, with no
 *          network and no generator run. The checksums above are a **fence** — they prove what
 *          this build was made from and refuse a build made from anything else — and **not a
 *          pin**: they do not let anyone obtain those bytes again. Determinism means **same
 *          fetched bytes => same output**, which is checkable and is checked. A re-pin is an
 *          explicit \`--repin\` run that publishes \`gazetteer-source-log.json\` (append-only) and
 *          a row-level corpus diff **in the same commit**.
 * Order  : ascending folded name, then descending population bucket, then ascending country code,
 *          then ascending GeoNames id. A **total** order, so a regeneration cannot reshuffle the
 *          list, and it is a property of these files — \`decodeGazetteer\` preserves it.
 * Coords : ${DECIMALS} decimal places (~11 m), base-36 tenth-thousandths. \`countryOf\` was evaluated
 *          against the QUANTISED coordinate, so the invariant holds for the bytes that ship.
 * Budget : \`packages/core/test/0-gazetteerBudget.test.ts\`. **This module is not reachable from
 *          \`packages/core/src/index.ts\`**: it is the second declared entry point,
 *          \`@cairn/core/gazetteer\`, and every shard is behind a dynamic import, because unlike
 *          \`COUNTRY_INDEX\` the gazetteer is not on the write path (A-82 Part 9).
 *
 * The JSON documents are **not** TypeScript, which is why the corpus can be 8 MB while every
 * generated \`.ts\` file in this family stays far under the 1,048,576-byte type-stripping ceiling.
 */
import { loadGazetteer } from './gazetteer.ts';
import type { Gazetteer, GazetteerDocuments } from './gazetteer.ts';

/** One lazy import per shard document. A search touches exactly one of these. */
const SHARDS: Readonly<Record<string, () => Promise<{ default: unknown }>>> = {
${entries}
};

/**
 * The two documents, bound. Everything that decides *which* shard, decodes it, checks the pair's
 * checksums and refuses a query too short to resolve lives in the hand-written
 * \`geo/gazetteer.ts\` — this module is data and two thunks.
 */
const DOCUMENTS: GazetteerDocuments = {
  meta: () => import('./gazetteer/meta.json', { with: { type: 'json' } }),
  shard: (key) => (key in SHARDS ? SHARDS[key]() : Promise.resolve(null)),
};

/**
 * **The one runtime symbol \`@cairn/core/gazetteer\` carries** (A-83 Part 7). Resolves the query to
 * a single shard, fetches the meta document once, decodes both and returns a \`Gazetteer\` naming
 * the shard it answers for — or \`null\` for a folded query under two characters, which means
 * *"keep typing"* and **not** *"no match"*.
 */
export const loadGazetteerFor = (query: string): Promise<Gazetteer | null> =>
  loadGazetteer(query, DOCUMENTS);
`;
}

/** The in-memory equivalent of the committed corpus, for `--dry-run`'s audit. */
function inMemoryCorpus(docs) {
  return {
    meta: docs.meta,
    shards: docs.shards.map((s) => ({ key: s.key, doc: JSON.parse(s.text), bytes: s.bytes })),
    rows: decodeAll(docs.meta, docs.shards.map((s) => JSON.parse(s.text))),
  };
}

/** Reads the committed corpus off disk. `--audit-only` fetches nothing. */
function readCommittedCorpus() {
  const meta = JSON.parse(readFileSync(join(CORPUS_DIR, 'meta.json'), 'utf8'));
  const shards = [];
  for (const name of readdirSync(CORPUS_DIR).sort()) {
    if (name === 'meta.json' || !name.endsWith('.json')) continue;
    const text = readFileSync(join(CORPUS_DIR, name), 'utf8');
    shards.push({ key: JSON.parse(text).k, doc: JSON.parse(text), bytes: Buffer.byteLength(text, 'utf8'), file: name });
  }
  return { meta, shards, rows: decodeAll(meta, shards.map((s) => s.doc)) };
}

/**
 * Decodes every shard into one deduplicated row list — the generator's own reader, not core's.
 * ROADMAP's ceiling (1) under criterion E: nothing under `tools/` reaches past
 * `packages/core/src/index.ts`, and the decoder is not on §2.10's surface. What core's decoder
 * does with these bytes is `packages/core/test/gazetteer.test.ts`'s job, not this file's.
 */
function decodeAll(meta, docs) {
  const byId = new Map();
  for (const doc of docs) {
    if (doc.s !== meta.$sourceSha256) {
      throw new Error(`shard ${doc.k} carries $sourceSha256 ${doc.s}, meta.json carries ${meta.$sourceSha256}`);
    }
    for (const packed of doc.r) {
      const f = packed.split('|');
      const id = `${meta.idPrefix}:${f[7]}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        name: f[0],
        fold: foldPlaceName(f[0]),
        alts: f[1] === '' ? [] : f[1].split(','),
        countryCode: f[2] === '' ? null : f[2],
        admin1: f[3] === '' ? '' : meta.admin1[parseInt(f[3], 36)],
        population: 2 ** parseInt(f[4], 36),
        centre: { lat: parseInt(f[5], 36) / 1e4, lng: parseInt(f[6], 36) / 1e4 },
        id,
        indexSays: f[8] === 'a' ? 'agrees' : f[8] === 'd' ? 'differs' : 'silent',
      });
    }
  }
  return [...byId.values()];
}

// ---------------------------------------------------------------- the goldens

/**
 * **`fixtures/golden/gazetteer-manifest.json` — a digest over the artefact's OWN BYTES**, §8.4
 * **A-94** Part 6 item 2 (QA **R68-4**).
 *
 * The corpus was guarded off exactly one field: a length-preserving hand edit to a shipped row's
 * **country code** is caught by the `indexSays` cross-check, and the same edit to its **population
 * and coordinate** passed every test, the `CORPUS_BYTES` total and the row count. This is one
 * sha256, row count and byte length **per shipped corpus file**, recomputed from disk by
 * `packages/core/test/gazetteerArtefact.test.ts`.
 *
 * **It is a GOLDEN and deliberately not `meta.json`**: 967 hashes would add ~70 KB to a file every
 * client fetches, which A-82's byte discipline forbids for a check no client performs.
 *
 * **What it does not claim.** The manifest lives in the same repository as the corpus, so it
 * raises the cost of a silent edit from *one file* to *two files that must agree*; it does not
 * make one impossible. **The guarantee is still A-90 clause 1's** — 967 reviewable, diffable
 * documents in git, reviewed — and this is a tripwire under it, not a replacement for it.
 *
 * Called AFTER `write()`, and it hashes what is on disk rather than what was in memory: a digest
 * of the bytes the generator meant to write would not be a digest of the artefact.
 */
function writeManifest(sha) {
  const files = [];
  // **The DIRECTORY, not `*.json` in it — QA R69-5.** This used to filter on `.json`, which made
  // the manifest a digest over the corpus's JSON *documents* and left the corpus *directory*
  // unaudited: a `.mjs` parked in here was invisible to it, and round 67's M8 — the A-78 shard-map
  // guard passing a `.mjs` in this directory whose name appears in a doc comment — is still open.
  // A file that is not a JSON document is covered by its sha256 and byte length and carries
  // `rows: 0`.
  for (const name of readdirSync(CORPUS_DIR).sort()) {
    const bytes = readFileSync(join(CORPUS_DIR, name));
    let doc = {};
    try {
      doc = JSON.parse(bytes.toString('utf8'));
    } catch {
      doc = {}; // not a JSON document — still hashed, still counted, rows 0.
    }
    files.push({
      file: name,
      bytes: bytes.length,
      rows: Array.isArray(doc.r) ? doc.r.length : Number(doc.rows ?? 0),
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  const out = {
    $generatedBy: 'cairn/tools/gen-gazetteer.mjs',
    $source: ATTRIBUTION,
    $sourceSha256: sha,
    $fetched: FETCHED,
    $what:
      'One sha256, byte length and row count per FILE under ' +
      'packages/core/src/geo/gazetteer/ — the directory, not *.json in it (QA R69-5). ' +
      'ARCHITECTURE \u00a78.4 A-94 Part 6 (QA R68-4): the ' +
      'artefact of record had no digest over its own bytes, so a length-preserving hand edit to ' +
      "a shipped row's population and coordinate passed every test, the byte total and the row " +
      'count — the corpus was guarded off ONE field (indexSays) and not the others. A test ' +
      'recomputes this file from disk. It is a GOLDEN and NOT meta.json on purpose: 967 hashes ' +
      'would be ~70 KB added to a document every client fetches, for a check no client performs. ' +
      'IT DOES NOT MAKE A SILENT EDIT IMPOSSIBLE — it makes it cost two files that must agree. ' +
      'The guarantee is still A-90 clause 1: 967 reviewable, diffable documents in git. rows is ' +
      "the shard document's own row array length; for meta.json it is the corpus total meta " +
      'declares; for a file that is not a JSON document it is 0.',
    fileCount: files.length,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
    totalRows: files.filter((f) => f.file !== 'meta.json').reduce((n, f) => n + f.rows, 0),
    files,
  };
  writeFileSync(MANIFEST_OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote fixtures/golden/gazetteer-manifest.json  (${files.length} files, ` +
    `${out.totalBytes} bytes, ${out.totalRows} emitted rows)`);
}

/**
 * `fixtures/golden/gazetteer-disagreements.json` — the rows that **ship carrying a contradiction**.
 *
 * That is what *"no shipped row may SILENTLY contradict the index"* means in a file: the
 * contradiction is on the record, by name, countable and reviewable, and a count that changes when
 * the country index next changes is a diff a reviewer must look at.
 *
 * **Coordinates are not in this file and that is not a redaction** — `{id, name, statedCountry,
 * derivedCountry}` is A-82 Part 10's stated shape for it, and every one of these rows ships with
 * its coordinate in the corpus anyway.
 */
function writeDisagreements(built, sha) {
  const out = {
    $generatedBy: 'cairn/tools/gen-gazetteer.mjs',
    $source: ATTRIBUTION,
    $sourceSha256: sha,
    $fetched: FETCHED,
    $what:
      'Every shipped gazetteer row whose country code and countryOf(row.centre, COUNTRY_INDEX) ' +
      'are both non-null and DISAGREE. ARCHITECTURE §8.4 A-82 Part 5 refused such rows outright, ' +
      'which cost Brazzaville (a national capital), Geneva and Jerusalem; A-83 Part 8 RESTATES ' +
      'the invariant as "no shipped row may SILENTLY contradict the country index", so every row ' +
      'listed here SHIPS carrying indexSays: "differs", and is named here with BOTH answers. A ' +
      'row that would contradict the index without carrying that record is still REFUSED. Most ' +
      'are border towns the shipped index draws on the wrong side of a frontier, because A-26 ' +
      'Part 2 chose a coarse base scale and a coarse ring bulges outward. statedCountry is what ' +
      'the row ships; derivedCountry is what countryOf says. A picked city takes the former ' +
      '(City.pick, §8.4 A-84); a typed one still takes the latter.',
    total: built.disagreements.length,
    disagreements: built.disagreements,
  };
  writeFileSync(DISAGREEMENTS_OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote fixtures/golden/gazetteer-disagreements.json  (${built.disagreements.length} rows)`);
}

/**
 * **Read the committed source log, or STOP AND REPORT** — §8.4 **A-94** Part 5 clause 3 (QA
 * **R68-3**), amending A-90 clause 3.
 *
 * This function used to be a bare `catch {}` inside `writeSourceLog`, on the ORDINARY write path:
 * a run with no `--repin` and every checksum matching **re-seeded the log** whenever the file was
 * missing, empty or unparseable, and reported *"5 appended, 5 total"*. A-90 Part 5 residue 2
 * predicted a golden regeneration would destroy the history; what actually destroys it is an
 * ordinary corpus build, which is worse, because nobody reviewing that commit is looking at the
 * supply chain.
 *
 * **A missing, empty or unparseable log is a FINDING, not a condition to repair silently.** The
 * artefact of record is incomplete and the run stops, writing nothing. Seeding happened once, in
 * the increment that created the file, and never again.
 */
function readSourceLog() {
  const stop = (why) => new Error(
    `${why}\n  fixtures/golden/gazetteer-source-log.json is the record of what this corpus was ` +
    'built from, and §8.4 A-94 Part 5 clause 3 says a run that cannot read it STOPS AND REPORTS, ' +
    'writing nothing. It is NEVER re-seeded: a self-describing file cannot witness its own ' +
    'history, and the append-only witness is a prefix literal in packages/core/test/ that this ' +
    'generator does not write. Restore the file from git.',
  );
  let text;
  try {
    text = readFileSync(SOURCE_LOG_OUT, 'utf8');
  } catch {
    throw stop('the source log is MISSING.');
  }
  let log;
  try {
    log = JSON.parse(text);
  } catch (err) {
    throw stop(`the source log does not parse: ${err.message}.`);
  }
  if (!Array.isArray(log.entries) || log.entries.length === 0) throw stop('the source log is EMPTY.');
  for (const e of log.entries) {
    if (typeof e?.source !== 'string' || !/^[0-9a-f]{64}$/.test(e?.sha256 ?? '')) {
      throw stop(`the source log carries a malformed entry: ${JSON.stringify(e)}.`);
    }
  }
  return log;
}

/**
 * **`fixtures/golden/gazetteer-source-log.json` — A-90 clause 3, and it is APPEND-ONLY.**
 *
 * One entry per source per run that moved it: `{fetched, source, bytes, sha256, previousSha256}`.
 * It exists because *"re-pinning is a deliberate, reviewed act"* was true as an intention and
 * nothing made it true as a mechanism — so when the re-pin actually happened (**KD-123**), the
 * review was a sentence in a build note and **+15 shipped rows** was drift nobody could see in a
 * golden.
 *
 * **⚠ AMENDED AT REVISION 72 — §8.4 A-94 Part 5, QA R68-3.** This is called **only** under
 * `--repin`, and it appends to a log `readSourceLog` has already read and verified. Two things
 * that were here are gone: the seed branch, and the claim that the `previousSha256` chain is the
 * append-only witness. **The chain is provenance** — it says which bytes an entry replaced — and a
 * self-describing file cannot witness its own history: every truncation and every rewrite
 * produces a *consistent* file. The chain was green for a tail truncation, green for a heads-only
 * rewrite (byte-for-byte what the re-seed produced) and vacuous at five entries and zero links.
 * **The witness is a prefix literal in `packages/core/test/gazetteerArtefact.test.ts`, which this
 * generator does not write** — and extending it is part of the same reviewed commit as the re-pin.
 *
 * A run in which nothing moved appends nothing. The log records **movements**, not runs.
 */
function writeSourceLog(log, fetched, moved) {
  log.$what =
    'APPEND-ONLY. One entry per source per re-pin: what this corpus was built from, what it was ' +
    'built from before, and the byte length beside the hash so a mismatch can be DIAGNOSED rather ' +
    'than merely detected. ARCHITECTURE \u00a78.4 A-90 clause 3, AMENDED by A-94 Part 5 (QA ' +
    'R68-3). $sourceSha256 RECORDS a build\'s inputs; it does NOT pin bytes anyone can obtain ' +
    'again — GeoNames rebuilds every dump daily, retains one day of modifications/deletes and ' +
    'archives nothing, so THIS CORPUS CANNOT BE REBUILT FROM SOURCE by anybody, including us. ' +
    'THIS FILE IS WRITTEN ONLY UNDER --repin AND IS NEVER RE-SEEDED: an ordinary run that finds ' +
    'it missing, empty or unparseable STOPS AND REPORTS. A re-pin publishes this file AND a ' +
    'row-level corpus diff in the SAME COMMIT. previousSha256 is PROVENANCE — it says which bytes ' +
    'an entry replaced — and it is NOT the append-only witness: a self-describing file cannot ' +
    'witness its own history, because every truncation and every rewrite leaves a consistent ' +
    'chain. THE WITNESS IS A PREFIX LITERAL IN packages/core/test/gazetteerArtefact.test.ts, ' +
    'which the generator does not write, and extending it is part of the reviewed re-pin commit.';

  const last = new Map();
  for (const e of log.entries) last.set(e.source, e.sha256);
  let appended = 0;
  for (const source of moved) {
    const got = fetched[source];
    log.entries.push({
      fetched: FETCHED,
      source,
      bytes: got.bytes,
      sha256: got.sha,
      previousSha256: last.get(source) ?? null,
    });
    appended += 1;
  }
  // **No seed branch.** It used to sit here, and it is A-94 Part 9 fault 4: a run that finds the
  // log empty must stop, not fill it in. `readSourceLog` has already refused an empty file.
  writeFileSync(SOURCE_LOG_OUT, `${JSON.stringify(log, null, 2)}\n`);
  console.log(`wrote fixtures/golden/gazetteer-source-log.json  (${appended} appended, ${log.entries.length} total)`);
}

/**
 * **A-90 clause 3's row-level corpus diff, against the PREVIOUSLY COMMITTED corpus.**
 *
 * `{rowsAdded, rowsRemoved, rowsChanged}`, with every added and removed row named by
 * `{id, name, countryCode}` while the total is under the published cap, and the counts alone above
 * it. **A diff over the cap is a stop-and-report** — a data change nobody reviewed is a defect,
 * not a golden update.
 *
 * Reads the corpus off disk, so it must be called BEFORE `write()`.
 */
const DIFF_CAP = 200;

function corpusDiff(built) {
  let previous;
  try {
    previous = readCommittedCorpus().rows;
  } catch {
    return null; // no previous corpus — a first build, and there is nothing to diff.
  }
  const before = new Map(previous.map((r) => [r.id, r]));
  const after = new Map(built.rows.map((r) => [`${ID_PREFIX}:${r.id}`, r]));

  const added = [];
  const removed = [];
  const changed = [];
  for (const [id, r] of after) {
    const was = before.get(id);
    if (was === undefined) { added.push({ id, name: r.name, countryCode: r.countryCode }); continue; }
    if (was.name !== r.name || was.countryCode !== r.countryCode || was.admin1 !== r.admin1 ||
        was.centre.lat !== r.lat || was.centre.lng !== r.lng || was.indexSays !== r.says) {
      changed.push({ id, name: r.name, was: was.countryCode, now: r.countryCode });
    }
  }
  for (const [id, r] of before) {
    if (!after.has(id)) removed.push({ id, name: r.name, countryCode: r.countryCode });
  }
  const by = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : 1);
  added.sort(by); removed.sort(by); changed.sort(by);
  return { added, removed, changed };
}

/**
 * **§8.4 A-94 Part 10 / ROADMAP `I-32` — the named set, and it is a CAP OF ZERO in either
 * direction** (§0 position 12 (a)/(c), sequencing rule 12).
 *
 * A-94 moves **eight rows and nothing else in 149,085**, and it says which eight, by GeoNames id:
 * five that begin shipping because `CC → AU`, and three whose `countryCode` goes `null → NZ`
 * because `TK → NZ`. **The scope is provable from the repository without running anything**:
 * `codeParent` has twelve entries, exactly two are `null`, and dropping abstentions cannot reorder
 * the answers of the other ten — removing a key from a plurality does not change the ranking of
 * the keys that remain.
 *
 * So a row moving that is not one of these eight means the election change reached further than
 * the ruling measured, and **that is a stop-and-report, writing nothing** — not a golden update.
 * `I-29` is the worked example of why this is a named set and not a threshold: its condition was
 * *"anything over 100,000 people"*, which fired correctly and could not have seen an 829-person
 * capital.
 *
 * The gate is an **upper bound**, deliberately: a re-run against the corpus this increment commits
 * produces an empty diff, and an empty diff is not a failure.
 */
const A94_NAMED_SET = new Map([
  ['gn:x5xz', 'West Island (CC, begins shipping AU)'],
  ['gn:x5yu', 'Bantam Village (CC, begins shipping AU)'],
  ['gn:x5y5', 'South Island (CC, begins shipping AU)'],
  ['gn:x5yj', 'Horsburgh Island (CC, begins shipping AU)'],
  ['gn:x5xw', 'Cocos Islands (CC, begins shipping AU)'],
  ['gn:4h85j', 'Atafu Village (TK, null -> NZ)'],
  ['gn:2eefa', 'Fale old settlement (TK, null -> NZ)'],
  ['gn:4h85h', 'Nukunonu (TK, null -> NZ)'],
]);

function gateNamedSet(diff) {
  if (diff === null) return;
  const outside = [
    ...diff.added.filter((r) => !A94_NAMED_SET.has(r.id)).map((r) => `+ ${r.id} ${r.name}`),
    ...diff.removed.filter((r) => !A94_NAMED_SET.has(r.id)).map((r) => `- ${r.id} ${r.name}`),
    ...diff.changed.filter((r) => !A94_NAMED_SET.has(r.id)).map((r) => `~ ${r.id} ${r.name} (${r.was ?? 'null'} -> ${r.now ?? 'null'})`),
  ];
  const moved = [...diff.added, ...diff.removed, ...diff.changed].filter((r) => A94_NAMED_SET.has(r.id));
  console.log('');
  console.log(`  A-94 Part 10 — the named set: ${moved.length} of ${A94_NAMED_SET.size} named rows moved, ` +
    `${outside.length} rows moved outside it.`);
  for (const [id, what] of A94_NAMED_SET) {
    const hit = moved.find((r) => r.id === id);
    console.log(`    ${hit ? 'moved  ' : 'unmoved'} ${id}  ${what}`);
  }
  if (outside.length) {
    console.log('');
    console.log('  !! ROADMAP I-32 / A-94 Part 10 STOP-AND-REPORT — the corpus diff reaches outside the');
    console.log('     eight rows A-94 commits by GeoNames id. Writing nothing.');
    for (const line of outside.slice(0, 40)) console.log(`       ${line}`);
    throw new Error(
      `${outside.length} row(s) moved outside A-94 Part 10's named set of eight. STOP AND REPORT, ` +
        'writing nothing. A-94 Part 1 measures the scope of this change as exactly two stated ' +
        'codes (CC, TK); a third code moving means the election change reached further than the ' +
        'ruling measured, and that is a finding for the architect, not a golden update.',
    );
  }
}

function reportCorpusDiff(diff, isRepin) {
  console.log('');
  if (diff === null) {
    console.log('corpus diff: no previously committed corpus to diff against (first build).');
    return;
  }
  const total = diff.added.length + diff.removed.length;
  console.log(
    `corpus diff vs the previously committed corpus: ` +
      `+${diff.added.length} rows, -${diff.removed.length} rows, ~${diff.changed.length} changed`,
  );
  if (total <= DIFF_CAP) {
    for (const r of diff.added) console.log(`  + ${r.id}  ${r.name}  ${r.countryCode ?? 'null'}`);
    for (const r of diff.removed) console.log(`  - ${r.id}  ${r.name}  ${r.countryCode ?? 'null'}`);
    for (const r of diff.changed) console.log(`  ~ ${r.id}  ${r.name}  ${r.was ?? 'null'} -> ${r.now ?? 'null'}`);
  } else {
    console.log(
      `  ${total} added+removed rows is over the published cap of ${DIFF_CAP}, so the counts are\n` +
        '  published and the names are not. **STOP AND REPORT**: a data change this large is not a\n' +
        '  golden update, and A-90 clause 3 says the diff goes in the same commit as the corpus.',
    );
  }
  console.log(
    isRepin
      ? '  ^ this run RE-PINNED a source. This diff and the source log belong in the SAME COMMIT\n' +
        '    as the corpus — a re-pin whose diff is not in its own commit is an unreviewed change\n' +
        '    to the product\'s core data.'
      : '  ^ no source moved: this is the diff of a code change, not of a re-pin.',
  );
}

/**
 * **`fixtures/golden/gazetteer-refusals.json` — R67-10, and it is the artefact the refusals lost.**
 *
 * A-83 Part 11 repurposed this filename into `gazetteer-disagreements.json`, so from that moment
 * the rows the generator refuses were published **nowhere** except as three counts in a generated
 * header. A-82 Part 10's *"makes a deliberate hole countable, nameable and reviewable"* stopped
 * being true of the refusals, and KD-120's claim that A-83 Part 9's seven named archipelagos were
 * among them was **not checkable from this repository** — only the negative was.
 *
 * **`byReason` is derived HERE, from `refusals`, and the generated header is handed this object
 * rather than computing its own.** That is the whole of R67-10's second sentence: a count in a
 * header that no file can be checked against is a census with no denominator (§0 position 10a),
 * one artefact out. Compute them beside the golden instead and a row can be deleted from the file
 * without moving a number, which is the injected fault this shape closes.
 *
 * Pure — it reads `built` and writes nothing, so `report()` can call it before the write decision.
 */
function buildRefusals(built) {
  const refusals = [...built.refusedRows].sort((a, b) =>
    (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const byReason = { 'bare-name': 0, unreadable: 0, delimiter: 0, 'multi-country': 0 };
  for (const r of refusals) byReason[r.reason] += 1;
  return { total: refusals.length, byReason, refusals };
}

/**
 * **A-94 Part 6 (b) / KD-127 — the four audit numbers, in a GOLDEN rather than in a `console.log`
 * a test greps the generator's source for.**
 *
 * `I-31` asserted these four against the generator's **source text**, which catches a deleted or
 * renamed line and **cannot catch a line printing a wrong number**. They are numbers only a
 * 625 MB run can produce, and A-90 clause 1 forbids a test that needs the run — so the run writes
 * them into the artefact the offline tests read.
 *
 * **Every number here is derived from the list beside it**, exactly as `buildRefusals` derives
 * `byReason` from the array it writes: `classPExempt.rows` is the sum of its own groups, and the
 * pair count is the length of the named pairs. A count in a header that no file can be checked
 * against is a census with no denominator (§0 position 10a), one artefact out — and it is what
 * makes A-94 Part 9 fault 7 (print a wrong number in one audit line) reddens a test rather than
 * scrolling past.
 */
function buildAudit(built) {
  const groups = new Map();
  for (const r of built.classPExempt) groups.set(r.key, (groups.get(r.key) ?? 0) + 1);
  const list = [...groups]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([key, rows]) => ({ key, rows }));
  return {
    $what:
      'The four numbers A-93 Part 3 requires the generator to PUBLISH on every run, written here ' +
      'because they are numbers only a 625 MB generator run can produce and ARCHITECTURE §8.4 ' +
      'A-90 clause 1 forbids a test that needs the run (§8.4 A-94 Part 6, BUILD-NOTES KD-127). ' +
      'keptByS: rows kept ONLY by subtracting the row\'s own stated code S. keptByPC: rows kept ' +
      'ONLY by P(C) beyond P(S). Both are predicted EMPTY and both stay in the rule, because the ' +
      'rule says "neither the country it states, nor the country we attribute it to, nor the ' +
      'sovereign of either" — a non-zero list is a result to report, a missing list is the ' +
      'failure. sovereignPairsUsed: the c -> P(c) pairs clause 4 actually consulted, of the ' +
      'sovereignPairsAvailable the pinned layer names; a politically loaded pair becoming ' +
      'load-bearing arrives as a diff here. classPExempt: the class-P rows whose cc2 names a ' +
      'foreign country and which A-93 Part 3(a) exempts — NOT a claim that their attribution is ' +
      'right, only that this ruling does not touch it. rows IS the sum of groups.',
    keptByS: [...built.keptByS],
    keptByPC: [...built.keptByPC],
    sovereignPairsUsed: [...built.sovereignUsed].sort(),
    sovereignPairsAvailable: built.sovereignPairs.size,
    classPExempt: { rows: list.reduce((n, g) => n + g.rows, 0), groups: list },
  };
}

function writeRefusals(built, sha) {
  const { total, byReason, refusals } = buildRefusals(built);
  const out = {
    $generatedBy: 'cairn/tools/gen-gazetteer.mjs',
    $source: ATTRIBUTION,
    $sourceSha256: sha,
    $fetched: FETCHED,
    $what:
      'EVERY candidate row the generator REFUSED to ship, by name, with the reason. ARCHITECTURE ' +
      "\u00a78.4 A-89 Part 3 (QA R67-10): A-83 Part 11 reused this filename for the " +
      'disagreements, and from then on the refusals were published nowhere but as counts in a ' +
      'generated header — so "a deliberate hole, countable, nameable and reviewable" stopped ' +
      'being true of them. reason is drawn from a CLOSED set: bare-name (A-83 Part 9 clause 1 — ' +
      'no country and no region, so the label would be the name alone), unreadable (clause 2, or ' +
      'a name that folds to nothing), delimiter (A-83 Part 11 — a payload separator in a field), ' +
      'multi-country (clause 4, A-89 — cc2 names a country that is neither the row\'s stated ' +
      'code nor the code we would attribute it to). byReason IS the group sizes of the array ' +
      'below and the generated header is handed this object, not a second count beside it. ' +
      'cc2 is allCountries column 10 verbatim, uppercased and sorted; it is NOT validated ' +
      'against countryInfo.txt (A-89 Part 8 residue 3). NO COORDINATES: a refused row is not a ' +
      'row the corpus makes a claim about. audit carries A-93 Part 3\'s four published numbers ' +
      '(§8.4 A-94 Part 6, KD-127): they belong in an artefact the offline tests read, not in a ' +
      'console line nobody can re-run.',
    total,
    byReason,
    audit: buildAudit(built),
    refusals,
  };
  writeFileSync(REFUSALS_OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote fixtures/golden/gazetteer-refusals.json  (${total} rows: ` +
    `${Object.entries(byReason).map(([k, n]) => `${n} ${k}`).join(', ')})`);
}

/**
 * `fixtures/golden/gazetteer-parents.json` — **A-84 Part 5**, new at I-23.
 *
 * Every row whose stated country code is not one the shipped `COUNTRY_INDEX` can draw, with the
 * code it ships instead: the containing feature's `ISO_A2_EH` where the index draws it, and `null`
 * where it does not. `shippedCode: null` is included rather than omitted, because a row that says
 * nothing about its country is the interesting half of this ruling — Cairn does not adjudicate a
 * sovereignty its own map cannot draw, and the rows where it declines are the ones to review.
 */
function writeParents(built, sha) {
  const nulls = built.parents.filter((p) => p.shippedCode === null).length;
  const out = {
    $generatedBy: 'cairn/tools/gen-gazetteer.mjs',
    $source: ATTRIBUTION,
    $sourceSha256: sha,
    $fetched: FETCHED,
    $what:
      'Every shipped row whose SOURCE-STATED country code is not one COUNTRY_INDEX can draw — the ' +
      'empty code included — with the code it ships instead. ARCHITECTURE §8.4 A-84 Part 5 (QA ' +
      'R61-3): A-29 step 4 refused these codes on the stated ground that "the coordinate ' +
      'attribution already answers the parent", and for six of the eight codes it names the ' +
      'coordinate answers NOTHING. The parent is instead read from the dataset the index is cut ' +
      'from: the containing feature\'s ISO_A2_EH in ne_10m_admin_0_countries at v5.1.2. A row ' +
      'whose containing feature has no ISO code (Somaliland, Northern Cyprus) ships ' +
      'shippedCode: null and is NEVER REFUSED — its name and region still label it. NO ' +
      'COORDINATES: ids, names and codes only. codeTally PUBLISHES THE ELECTION (§8.4 A-94 ' +
      'Part 2, QA R68-1): per undrawable stated code, every answer the layer gave with its ' +
      'count, the abstentions beside them, and the electorate they are drawn from. AN ' +
      'ABSTENTION IS NOT A VOTE — a row the layer neither contains nor places within the 0.05° ' +
      'tolerance contributes NOTHING to the plurality, a tie between answers breaks on the ' +
      'lowest ISO code, and a code all of whose rows abstain has no parent and its rows ship ' +
      'null. Counting the silences made CC -> null (null:3 AU:2) and deleted the whole Cocos ' +
      '(Keeling) Islands territory from the picker via A-83 Part 9 clause 1; noIsoCode is a ' +
      'THIRD thing — the layer contains the row inside a feature it gives no ISO code — which ' +
      'is an answer and can never be a parent. candidates = answers + noIsoCode + abstain.',
    total: built.parents.length,
    translated: built.parents.length - nulls,
    shippedNull: nulls,
    codeParent: built.codeParent,
    codeTally: built.codeTally,
    parents: built.parents,
  };
  writeFileSync(PARENTS_OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote fixtures/golden/gazetteer-parents.json  (${built.parents.length} rows, ${nulls} shipping null)`);
}

// ---------------------------------------------------------------- the audit

/**
 * Re-derives this increment's measurable claims **from the artefact**, not from the build's own
 * bookkeeping. A generator that audits its own intermediate value cannot see an emit bug.
 */
async function audit(corpus, { writeProbes }) {
  const { countryOf, COUNTRY_INDEX, searchGazetteer } = await import('../packages/core/src/index.ts');
  const draws = new Set(COUNTRY_INDEX.countries.map((c) => c.code));
  const meta = corpus.meta;

  let agrees = 0;
  let differs = 0;
  let silent = 0;
  const violations = [];
  const undrawable = [];
  const bare = [];
  const origin = [];
  for (const r of corpus.rows) {
    const derived = countryOf(r.centre, COUNTRY_INDEX);
    if (r.countryCode !== null && !draws.has(r.countryCode)) undrawable.push(`${r.name} carries ${r.countryCode}`);
    if (r.countryCode === null && r.admin1 === '') bare.push(r.name);
    if (r.centre.lat === 0 && r.centre.lng === 0) origin.push(r.name);
    if (r.indexSays === 'differs') {
      differs += 1;
      if (derived === null || derived === r.countryCode) {
        violations.push(`${r.name} says "differs" and countryOf says ${derived ?? 'nothing'}`);
      }
    } else if (r.indexSays === 'agrees') {
      agrees += 1;
      if (derived !== r.countryCode) {
        violations.push(`${r.name} says "agrees" (${r.countryCode}) and countryOf says ${derived ?? 'nothing'}`);
      }
    } else {
      silent += 1;
      if (derived !== null && r.countryCode !== null) {
        violations.push(`${r.name} says "silent" and countryOf says ${derived}`);
      }
    }
  }
  console.log(`  indexSays: ${agrees} agree · ${differs} differ · ${silent} silent  (sums to ${agrees + differs + silent} of ${corpus.rows.length})`);
  for (const v of violations.slice(0, 20)) console.log(`    VIOLATION ${v}`);
  if (violations.length) throw new Error(`${violations.length} shipped rows mis-state what the index says`);
  if (undrawable.length) {
    for (const u of undrawable.slice(0, 20)) console.log(`    UNDRAWABLE ${u}`);
    throw new Error(`${undrawable.length} shipped rows carry a code COUNTRY_INDEX cannot draw`);
  }
  if (bare.length) throw new Error(`${bare.length} shipped rows would render as a bare name: ${bare.slice(0, 5).join(', ')}`);
  if (origin.length) {
    throw new Error(
      `${origin.length} shipped row(s) sit at exactly {0,0} — STOP AND REPORT (ROADMAP I-23, ` +
        `§8.4 A-85 Part 5): ${origin.slice(0, 5).join(', ')}`,
    );
  }
  // A marking that never fires is a marking that was deleted (A-83 Part 11).
  if (differs === 0) throw new Error('ZERO rows ship with indexSays "differs" — the marking is gone');
  if (agrees + differs + silent !== corpus.rows.length) throw new Error('the census triple does not sum to the row count');

  // **One search, one shard, and the answer is the same as the whole corpus's.** This is the
  // fault the design is most likely to commit and the one that would silently make the search
  // incomplete, so the generator measures it too rather than leaving it to the test alone.
  const splits = new Set(meta.splits);
  const whole = { source: meta.$source, shard: null, countryNames: meta.countryNames, rows: corpus.rows };
  const byKey = new Map();
  for (const s of corpus.shards) byKey.set(s.key, s.doc);
  const shardFor = (query) => {
    const token = foldPlaceName(query).split(' ')[0];
    // What `loadGazetteer` itself refuses: a token too short, or one that IS a split prefix, whose
    // true answer spans that prefix's whole subtree. `null` is "keep typing", never "no match".
    const q = foldPlaceName(query);
    if (token.length < 2 || (q === token && splits.has(token))) return null;
    const key = shardKeyFor(token, splits);
    const doc = byKey.get(key);
    return {
      source: meta.$source,
      shard: key,
      countryNames: meta.countryNames,
      rows: doc ? decodeAll(meta, [doc]) : [],
    };
  };
  let mismatched = 0;
  const keepTyping = [];
  for (const query of [...PROBES, 'york', 'angeles', 'new york', 'saint', 'san', 'de']) {
    const one = shardFor(query);
    if (one === null) { keepTyping.push(query); continue; }
    const a = JSON.stringify(searchGazetteer(query, whole, { limit: 20 }));
    const b = JSON.stringify(searchGazetteer(query, one, { limit: 20 }));
    if (a !== b) {
      mismatched += 1;
      console.log(`    CROSS-SHARD ${query}: the shard answers differently from the whole corpus`);
    }
  }
  if (keepTyping.length) console.log(`  "keep typing" (the token is a split prefix): ${keepTyping.join(', ')}`);
  if (mismatched) throw new Error(`${mismatched} queries answer differently from one shard than from the corpus`);
  console.log('  one-search-one-shard: every probe answers identically from its shard and from the whole corpus');

  // **Can a row be reached by typing its OWN NAME? Asked of every shipped row — QA R67-1.**
  //
  // The sweep above asks a fixed list of ~35 queries and reports only the ones the loader refuses
  // as a split prefix, which is the arm KD-118 discloses. It could not see the other arm: the
  // length test was applied to the query's FIRST TOKEN rather than to the folded query, so
  // `A Coruña` — eight characters, 245,000 people — was told to keep typing while the terminal
  // `a$` shard held the row. 152 shipped rows answered nothing when a user typed their full name
  // and no audit line said so, because no probe in the list has a one-character first token.
  //
  // A fixed probe list can only see the classes somebody thought of. This asks the whole corpus,
  // and it is the shape a reachability regression has: **a row the loader will not answer for, or
  // answers for out of a shard that does not hold it.** The third bucket is a hard failure — it
  // is the same incompleteness the round trip catches from the writing side, asked from the
  // reading side, through the loader's own refusal rule.
  const idsByKey = new Map();
  for (const s of corpus.shards) idsByKey.set(s.key, new Set(s.doc.r.map((packed) => packed.split('|')[7])));
  const unreachable = { short: [], splitPrefix: [], wrongShard: [] };
  for (const r of corpus.rows) {
    const f = foldPlaceName(r.name);
    const token = f.split(' ')[0];
    if (f.length < 2) { unreachable.short.push(r.name); continue; }
    if (f === token && splits.has(token)) { unreachable.splitPrefix.push(r.name); continue; }
    const ids = idsByKey.get(shardKeyFor(token, splits));
    const bare36 = r.id.slice(r.id.indexOf(':') + 1);
    if (ids === undefined || !ids.has(bare36)) {
      unreachable.wrongShard.push(`${r.name} → ${shardKeyFor(token, splits)}`);
    }
  }
  const say = (what, list) => {
    console.log(`  ${String(list.length).padStart(6)} ${what}${list.length ? `: ${list.slice(0, 6).join(', ')}` : ''}`);
  };
  console.log('  reachable by its own full name — every shipped row, through the loader\'s own rule:');
  say('rows whose whole folded name is under two characters ("keep typing")', unreachable.short);
  say('rows whose whole folded name IS a split prefix ("keep typing", KD-118)', unreachable.splitPrefix);
  say('rows the resolved shard DOES NOT HOLD', unreachable.wrongShard);
  if (unreachable.wrongShard.length) {
    throw new Error(
      `${unreachable.wrongShard.length} shipped rows resolve to a shard that does not hold them: ` +
        `${unreachable.wrongShard.slice(0, 5).join(', ')}`,
    );
  }

  const ambiguous = new Map();
  for (const r of corpus.rows) ambiguous.set(r.fold, (ambiguous.get(r.fold) ?? 0) + 1);
  console.log(`  ${[...ambiguous.values()].filter((n) => n > 1).length} folded names are carried by more than one row`);

  const probes = PROBES.filter((query) => shardFor(query) !== null).map((query) => ({
    query,
    shard: shardFor(query).shard,
    hits: searchGazetteer(query, shardFor(query), { limit: PROBE_DEPTH }).map((h) => ({
      id: h.id, name: h.name, label: h.label, countryCode: h.countryCode,
      admin1: h.admin1, centre: h.centre, indexSays: h.indexSays,
    })),
  }));
  console.log('  probes:');
  for (const p of probes) {
    const top = p.hits[0];
    console.log(`    ${p.query.padEnd(16)} ${String(p.hits.length).padStart(2)} hit(s)  ${top ? top.label : 'NO MATCH'}`);
  }

  const out = {
    $generatedBy: 'cairn/tools/gen-gazetteer.mjs --audit-only --write',
    $source: meta.$source,
    $sourceSha256: meta.$sourceSha256,
    $fetched: meta.$fetched,
    $what:
      'The top ' + PROBE_DEPTH + " hits searchGazetteer returns for each probe query, over the " +
      'ONE SHARD loadGazetteerFor resolves that query to — which is what a consumer gets. This ' +
      'pins THE ANSWER, not the mechanism: a fold that stops handling a letter, a comparator ' +
      'whose tie moves, a shard split that moves a row, or a coordinate that shifted between ' +
      'source revisions all show up here as a diff. COORDINATES ARE PUBLISHED here deliberately — ' +
      "A-82 Part 10: country-holes.json's NO COORDINATES line has the live planner's own records " +
      "as its subject, and this file's subject is a licensed public dataset already committed in " +
      'full.',
    probeDepth: PROBE_DEPTH,
    probes,
  };
  const json = `${JSON.stringify(out, null, 2)}\n`;
  if (writeProbes) {
    writeFileSync(PROBES_OUT, json);
    console.log(`wrote fixtures/golden/gazetteer-probes.json  (${probes.length} queries)`);
  } else {
    let current = null;
    try { current = readFileSync(PROBES_OUT, 'utf8'); } catch { /* not written yet */ }
    console.log(
      current === json
        ? '  probes golden: matches the committed file'
        : '  probes golden: DIFFERS from the committed file (re-run with --write to update)',
    );
  }
}

// Entry point, LAST in the file rather than first: `--audit-only` reaches `foldPlaceName` before
// its first `await`, and a `const` declared below a top-level call is in its temporal dead zone.
main().catch((err) => {
  console.error(`gen-gazetteer: ${err.message}`);
  process.exit(1);
});
