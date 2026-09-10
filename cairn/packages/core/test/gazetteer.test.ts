/**
 * The bundled offline city gazetteer — ARCHITECTURE §8.4 **A-82**, ROADMAP Phase 2 **I-21**.
 *
 * Three things are under test here and they fail for different reasons, which is why they are
 * three groups rather than one file of assertions:
 *
 *  1. **`foldPlaceName`** — A-82 Part 3's five ordered steps, against the twelve pairs the ruling
 *     verified on 2026-09-09. A fold that stops handling `ł` stops this feature working for a
 *     whole language, silently, and the twelve pairs are the only thing that says so out loud.
 *  2. **`searchGazetteer`** — the match rule and the total order, against a hand-built fixture
 *     small enough to read. Ceilings, not floors: `'ork'` must return **zero** rows naming York.
 *  3. **The shipped artefact** — the consistency invariant over every row of `GAZETTEER`, which
 *     is the criterion A-82 says this increment lives or dies on, plus the probes golden.
 *
 * The internals are imported by module path deliberately: `foldPlaceName` and `decodeGazetteer`
 * are **not** on §2.10's surface (A-82 Part 9), and `packages/core/test` is exempt from ceiling
 * (1) by design — attacking an internal is a test's job.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';
import {
  decodeGazetteer,
  decodeGazetteerMeta,
  foldPlaceName,
  loadGazetteer,
  searchGazetteer,
  shardKeyFor,
} from '../src/geo/gazetteer.ts';
import type { Gazetteer, GazetteerHit, GazetteerRow } from '../src/geo/gazetteer.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------------------------
// 1. The fold (A-82 Part 3). The twelve pairs the ruling verified, reproduced verbatim.
// ---------------------------------------------------------------------------------------------

/**
 * A-82 Part 3: *"Verified on 2026-09-09 against this exact sequence."* Each pair is one language's
 * worth of reachability. `Łódź` and `Tromsø` are the substitution table; `İstanbul` and `Ağrı` are
 * the **ordering** — step 1 before step 3 — because `İ` lowercases to `i` + U+0307 which step 4
 * then removes, and doing it the other way round folds Turkish names wrong.
 */
const TWELVE = [
  ['Zürich', 'zurich'],
  ['São Paulo', 'sao paulo'],
  ['Łódź', 'lodz'],
  ['Malmö', 'malmo'],
  ['Tromsø', 'tromso'],
  ['Bærum', 'baerum'],
  ['Ağrı', 'agri'],
  ['İstanbul', 'istanbul'],
  ['Đông Hà', 'dong ha'],
  ['Bắc Kạn', 'bac kan'],
  ['Nukuʻalofa', 'nukualofa'],
  ['Ciudad Juárez', 'ciudad juarez'],
] as const;

for (const [input, expected] of TWELVE) {
  test(`A-82 Part 3: foldPlaceName(${JSON.stringify(input)}) === ${JSON.stringify(expected)}`, () => {
    assert.equal(foldPlaceName(input), expected);
  });
}

test('A-82 Part 3: the whole substitution table, each letter NFD cannot decompose', () => {
  // `ß` → `ss`, `þ` → `th`, `æ` → `ae` and `œ` → `oe` are the two-character expansions; the rest
  // are one-for-one. `ʻ` and `ʼ` are DELETED rather than spaced, which is what makes
  // `Nukuʻalofa` fold to `nukualofa` and not to `nuku alofa`.
  assert.equal(foldPlaceName('Łŀ'), 'll');
  assert.equal(foldPlaceName('Øø'), 'oo');
  assert.equal(foldPlaceName('Đđ'), 'dd');
  assert.equal(foldPlaceName('Ðð'), 'dd');
  assert.equal(foldPlaceName('Þþ'), 'thth');
  assert.equal(foldPlaceName('ß'), 'ss');
  assert.equal(foldPlaceName('Ææ'), 'aeae');
  assert.equal(foldPlaceName('Œœ'), 'oeoe');
  assert.equal(foldPlaceName('ı'), 'i');
  assert.equal(foldPlaceName('Ħħ'), 'hh');
  assert.equal(foldPlaceName("a\u02BBb\u02BCc"), 'abc');
  // **All four spellings of the okina, because the corpus uses the two the table used to miss**
  // (**QA R67-2**): U+02BB and U+02BC are the modifier letters A-82 Part 3 wrote down; U+2018 and
  // U+2019 are the typographic quotes GeoNames actually spells the same sound with, in 1,243
  // shipped rows. All four are DELETED, so `Nuku\u2018alofa` folds to `nukualofa` — one token —
  // exactly as `Nuku\u02BBalofa` does.
  assert.equal(foldPlaceName("a\u2018b\u2019c"), 'abc');
  assert.equal(foldPlaceName('a\u0060b'), 'ab');
  assert.equal(foldPlaceName('Nuku\u2018alofa'), 'nukualofa');
  assert.equal(foldPlaceName('Nuku\u2019alofa'), 'nukualofa');
  assert.equal(foldPlaceName('Xi\u2019an'), 'xian');
  assert.equal(foldPlaceName('O\u2018ahu'), 'oahu');
  // The ASCII apostrophe is NOT in the table and must stay a separator: it is a word boundary in
  // `L'Aquila` and `N'Djamena`, which 617 shipped rows spell that way.
  assert.equal(foldPlaceName("L'Aquila"), 'l aquila');
});

test('A-82 Part 3 step 5: every run of non-alphanumerics collapses to one space, and it trims', () => {
  assert.equal(foldPlaceName('  Saint-Denis   sur/Mer  '), 'saint denis sur mer');
  assert.equal(foldPlaceName("N'Djamena"), 'n djamena');
  assert.equal(foldPlaceName('---'), '');
  assert.equal(foldPlaceName(''), '');
  // Digits survive: `\p{N}` is kept.
  assert.equal(foldPlaceName('Sector 17'), 'sector 17');
});

/**
 * A-82 Part 3: *"`foldPlaceName` is NOT `normalizeCityName` and neither may be implemented in
 * terms of the other."* One is an identity key, the other a matching key, and their failure costs
 * are opposite — so the property that must hold is that they **disagree** where it matters, and
 * that neither module imports the other.
 */
test('A-82 Part 3: the fold is not normalizeCityName — they disagree on exactly the accents', async () => {
  const { normalizeCityName } = await import('../src/model/cityName.ts');
  assert.equal(normalizeCityName('Zürich'), 'zürich');
  assert.equal(foldPlaceName('Zürich'), 'zurich');
  assert.notEqual(normalizeCityName('Zürich'), foldPlaceName('Zürich'));
  assert.notEqual(normalizeCityName('Łódź'), foldPlaceName('Łódź'));
});

// ---------------------------------------------------------------------------------------------
// 2. The search contract (A-82 Parts 3 and 4), against a hand-built fixture.
// ---------------------------------------------------------------------------------------------

const row = (r: Partial<GazetteerRow> & { name: string; id: string }): GazetteerRow => ({
  name: r.name,
  fold: r.fold ?? foldPlaceName(r.name),
  alts: r.alts ?? [],
  countryCode: r.countryCode === undefined ? ('XX' as GazetteerRow['countryCode']) : r.countryCode,
  admin1: r.admin1 ?? '',
  population: r.population ?? 0,
  centre: r.centre ?? { lat: 0, lng: 0 },
  id: r.id,
  // §8.4 **A-84** Part 6. `'agrees'` by default: a hand-built fixture states no disagreement, and
  // a fixture that silently claimed one would make the marking's own tests vacuous. **`'silent'`
  // is not `'agrees'`** — that distinction is the whole of the field's revision-65 widening, and
  // a default of `'silent'` here would make the CLI's marker tests vacuous the other way.
  indexSays: r.indexSays ?? 'agrees',
});

/**
 * Nine rows, readable, exercising every clause of the ranking and every clause of the label.
 * The three Londons are A-82 Part 4's own example; `Monaco` is the city-state with no admin-1;
 * `New York` and `Los Angeles` are the token-prefix cases; `Yorkton` is the control that says
 * `'york'` matching `New York` is a **token** prefix and not a substring.
 */
const FIXTURE: Gazetteer = {
  source: 'hand-built fixture',
  // A-83 Part 7: *"A `Gazetteer` with `shard: null` is a whole corpus and is always accepted,
  // which is what keeps a hand-built five-row test fixture working unchanged."*
  shard: null,
  countryNames: { GB: 'United Kingdom', US: 'United States', CA: 'Canada', MC: 'Monaco', CH: 'Switzerland' },
  rows: [
    row({ name: 'London', id: 'a', countryCode: 'GB', admin1: 'Westminster', population: 8_961_989, centre: { lat: 51.5, lng: -0.1167 } }),
    row({ name: 'London', id: 'b', countryCode: 'CA', admin1: 'Ontario', population: 346_765, centre: { lat: 42.9836, lng: -81.2497 } }),
    row({ name: 'London', id: 'c', countryCode: 'US', admin1: 'Kentucky', population: 8_012, centre: { lat: 37.1284, lng: -84.0833 } }),
    row({ name: 'Londonderry', id: 'd', countryCode: 'GB', admin1: 'Derry', population: 90_000 }),
    row({ name: 'New York', id: 'e', countryCode: 'US', admin1: 'New York', population: 18_000_000 }),
    row({ name: 'Yorkton', id: 'f', countryCode: 'CA', admin1: 'Saskatchewan', population: 15_000 }),
    row({ name: 'Los Angeles', id: 'g', countryCode: 'US', admin1: 'California', population: 12_500_000 }),
    row({ name: 'Monaco', id: 'h', countryCode: 'MC', admin1: '', population: 36_371 }),
    row({ name: 'Zürich', id: 'i', countryCode: 'CH', admin1: 'Zürich', population: 1_108_000, alts: ['zurich city'] }),
    // `SO` is deliberately ABSENT from `countryNames` above — the degradation case.
    row({ name: 'Hargeysa', id: 'j', countryCode: 'SO', admin1: 'Woqooyi Galbeed', population: 477_876 }),
    // Two rows that tie on EVERY key but `id`. The shipped layer has six such pairs (Columbia US,
    // Crato BR, Nakhodka RU, Noginsk RU, Vila Velha BR, …), which is why the comparator's last key
    // is not decoration: without it the sort is stable-per-input, so a differently-ordered `rows`
    // array answers a query differently and the probes golden becomes a property of the source
    // file's row order rather than of the data.
    row({ name: 'Springfield', id: 'k', countryCode: 'US', admin1: 'Illinois', population: 166_000 }),
    row({ name: 'Springfield', id: 'l', countryCode: 'US', admin1: 'Missouri', population: 166_000 }),
  ],
};

const names = (q: string, opts?: { limit?: number }) => searchGazetteer(q, FIXTURE, opts).map((h) => h.id);

test('A-82 Part 3: prefix, never substring — `ork` returns nothing naming York', () => {
  const hits = searchGazetteer('ork', FIXTURE);
  assert.deepEqual(
    hits.filter((h) => /york/i.test(h.name)).map((h) => h.name),
    [],
    'an interior match reached the results: the matcher is doing `includes`, not a prefix',
  );
  assert.deepEqual(hits, [], 'nothing in this fixture starts with "ork" on any token');
});

test('A-82 Part 3: a token prefix matches — `york` finds New York, `angeles` finds Los Angeles', () => {
  // Ranking rule 2: a prefix of the WHOLE name (`Yorkton`) outranks a prefix of a token
  // (`New York`), even though New York is two thousand times larger. Population is rule 4.
  assert.deepEqual(names('york'), ['f', 'e']);
  assert.deepEqual(names('angeles'), ['g']);
});

test('A-82 Part 3: an empty query, and a query that folds to empty, return zero rows and do not throw', () => {
  assert.deepEqual(searchGazetteer('', FIXTURE), []);
  assert.deepEqual(searchGazetteer('   ', FIXTURE), []);
  assert.deepEqual(searchGazetteer('--- ///', FIXTURE), []);
});

test('A-82 Part 3: the query is folded, so `zurich` reaches `Zürich` and `ZÜRICH` does too', () => {
  assert.deepEqual(names('zurich'), ['i']);
  assert.deepEqual(names('ZÜRICH'), ['i']);
  assert.deepEqual(names('zür'), ['i']);
});

test('A-82 Part 4: three Londons, three distinct countries, GB first by population', () => {
  const hits = searchGazetteer('london', FIXTURE);
  const londons = hits.filter((h) => h.name === 'London');
  assert.equal(londons.length, 3);
  assert.deepEqual(londons.map((h) => h.countryCode), ['GB', 'CA', 'US']);
  assert.equal(new Set(londons.map((h) => h.countryCode)).size, 3);
  // The exact fold beats the prefix: Londonderry is a prefix match and comes last.
  assert.deepEqual(hits.map((h) => h.id), ['a', 'b', 'c', 'd']);
});

test('A-82 Part 4: every hit carries a label naming its country, including a city-state with no admin-1', () => {
  for (const h of searchGazetteer('lo', FIXTURE)) {
    assert.ok(h.label.includes(','), `label "${h.label}" is a bare name`);
    assert.ok(h.countryCode !== null, `${h.name} carries no country in this fixture`);
    const country = FIXTURE.countryNames[h.countryCode] ?? h.countryCode;
    assert.ok(h.label.endsWith(country), `label "${h.label}" does not end in its country`);
  }
  const [gb, ca, us] = searchGazetteer('london', FIXTURE);
  assert.equal(gb.label, 'London, Westminster, United Kingdom');
  assert.equal(ca.label, 'London, Ontario, Canada');
  assert.equal(us.label, 'London, Kentucky, United States');
  // No admin-1: the slot is OMITTED, not filled with the name and not left blank.
  assert.equal(searchGazetteer('monaco', FIXTURE)[0].label, 'Monaco, Monaco');
  // admin1 equal to the name is omitted too — 'Zürich, Zürich, ...' reads as a stutter.
  assert.equal(searchGazetteer('zurich', FIXTURE)[0].label, 'Zürich, Switzerland');
});

test('A-82 Part 4: an unknown country code degrades to the code itself rather than to a bare name', () => {
  // `SO` is deliberately absent from the fixture's `countryNames` table. The label must still
  // name a country slot — a bare `Hargeysa` is exactly what A-82 Part 4 forbids.
  assert.equal(searchGazetteer('hargeysa', FIXTURE)[0].label, 'Hargeysa, Woqooyi Galbeed, SO');
});

test('A-82 Part 3: a folded ALTERNATE matches, and ranks below a name match', () => {
  const hits = searchGazetteer('zurich city', FIXTURE);
  assert.deepEqual(hits.map((h) => h.id), ['i']);
});

test('A-82 Part 3: opts.limit truncates, default 20', () => {
  assert.equal(searchGazetteer('london', FIXTURE, { limit: 2 }).length, 2);
  assert.deepEqual(names('london', { limit: 1 }), ['a']);
  assert.equal(searchGazetteer('l', FIXTURE, { limit: 0 }).length, 0);
});

/**
 * A-82 Part 4: *"The ranking is a total order, so the same query returns the same rows in the
 * same sequence on every run and on every platform."* Shuffling `rows` may not change the answer
 * — that is what "total" means, and it is what makes the probes golden pinnable.
 */
test('A-82 Part 4: the comparator is total — a shuffled copy of `rows` gives a byte-identical answer', () => {
  const shuffled: Gazetteer = { ...FIXTURE, rows: [...FIXTURE.rows].reverse() };
  for (const q of ['london', 'l', 'york', 'new', 'o', 'springfield', 's']) {
    assert.deepEqual(
      JSON.stringify(searchGazetteer(q, shuffled)),
      JSON.stringify(searchGazetteer(q, FIXTURE)),
      `"${q}" answers differently over a reordered rows array — the comparator is not total`,
    );
  }
});

test('A-82 Part 4: the same query twice is byte-identical', () => {
  assert.equal(
    JSON.stringify(searchGazetteer('london', FIXTURE)),
    JSON.stringify(searchGazetteer('london', FIXTURE)),
  );
});

// ---------------------------------------------------------------------------------------------
// 2b. What I-23 adds to the search contract: distinct labels (A-83 Part 9 clause 3), a validated
//     `limit` (R60-6), and the shard pairing check (A-83 Part 7).
// ---------------------------------------------------------------------------------------------

/**
 * **A-83 Part 9 clause 3.** *"When two or more hits in the returned window would render the same
 * label, every member of that group gains ` (lat, lng)` at 2 dp."* Measured at the recommended
 * point, 803 labels are carried by more than one row and 23 of round 60's 171 queries return a
 * top-20 containing two identical labels — a list a user cannot choose between is the exact
 * failure A-82 Part 4 exists to prevent, arriving one level down.
 *
 * Population may **not** be used to break the tie (A-82 Part 4 forbids rendering it) and the
 * coordinate is the only other fact we have.
 */
const COLLIDING: Gazetteer = {
  source: 'hand-built fixture',
  shard: null,
  countryNames: { ID: 'Indonesia' },
  rows: [
    row({ name: 'Bandar Lampung', id: 'p', countryCode: 'ID', admin1: 'Lampung', population: 800_000, centre: { lat: -5.4297, lng: 105.2610 } }),
    row({ name: 'Bandar Lampung', id: 'q', countryCode: 'ID', admin1: 'Lampung', population: 800_000, centre: { lat: -5.45, lng: 105.2667 } }),
    row({ name: 'Bandung', id: 'r', countryCode: 'ID', admin1: 'West Java', population: 2_400_000, centre: { lat: -6.9222, lng: 107.6069 } }),
  ],
};

test('A-83 Part 9: two hits that would render the same label are disambiguated by coordinate', () => {
  const hits = searchGazetteer('bandar lampung', COLLIDING);
  assert.equal(hits.length, 2);
  assert.deepEqual(hits.map((h) => h.label), [
    'Bandar Lampung, Lampung, Indonesia (-5.43, 105.26)',
    'Bandar Lampung, Lampung, Indonesia (-5.45, 105.27)',
  ]);
  assert.equal(new Set(hits.map((h) => h.label)).size, 2);
});

test('A-83 Part 9: a label that collides with nothing in the window is left alone', () => {
  const hits = searchGazetteer('band', COLLIDING, { limit: 20 });
  const bandung = hits.find((h) => h.name === 'Bandung');
  assert.equal(bandung?.label, 'Bandung, West Java, Indonesia');
});

/**
 * The disambiguation is over the **returned window**, not the whole corpus: a row whose twin was
 * truncated away renders its plain label, because there is nothing on screen to confuse it with.
 */
test('A-83 Part 9: the window decides — a truncated twin does not disambiguate the survivor', () => {
  const hits = searchGazetteer('bandar lampung', COLLIDING, { limit: 1 });
  assert.deepEqual(hits.map((h) => h.label), ['Bandar Lampung, Lampung, Indonesia']);
});

/**
 * **R60-6.** `{limit: NaN}` used to return `[]` — indistinguishable from a genuine miss, which is
 * the one failure mode A-82's *"a miss is a miss and the product says so"* rule cares about.
 * §2.1: core throws only on programmer error, and a non-integer limit is one.
 */
test('A-83 Part 7 / R60-6: a non-integer `limit` is a programmer error, not a silent empty list', () => {
  assert.throws(() => searchGazetteer('london', FIXTURE, { limit: NaN }), /limit/);
  assert.throws(() => searchGazetteer('london', FIXTURE, { limit: 1.5 }), /limit/);
  assert.throws(() => searchGazetteer('london', FIXTURE, { limit: Infinity }), /limit/);
  // `limit <= 0` keeps its existing meaning: an empty list, not a throw.
  assert.deepEqual(searchGazetteer('london', FIXTURE, { limit: 0 }), []);
  assert.deepEqual(searchGazetteer('london', FIXTURE, { limit: -3 }), []);
});

/**
 * **A-83 Part 7's pairing check.** *"A consumer that fetches the wrong shard would get a silently
 * short answer, which is the same failure class as a wrong country on a map: quiet and wrong."*
 */
const shardOf = (key: string, rows: readonly GazetteerRow[]): Gazetteer =>
  ({ ...FIXTURE, shard: key, rows });

test('A-83 Part 7: searching a shard the query does not belong to THROWS, and does not return []', () => {
  const ha = shardOf('ha', []);
  assert.throws(() => searchGazetteer('york', ha), /shard/);
  // The same call over a whole corpus is fine — that is what `shard: null` means.
  assert.deepEqual(searchGazetteer('york', { ...ha, shard: null }), []);
});

test('A-83 Part 7: the check is on the query\'s FIRST folded token, and a prefix of the key passes', () => {
  assert.doesNotThrow(() => searchGazetteer('york', shardOf('yo', [])));
  assert.doesNotThrow(() => searchGazetteer('york town', shardOf('yo', [])));
  assert.throws(() => searchGazetteer('town york', shardOf('yo', [])), /shard/);
});

test('A-83 Part 7: a terminal `<prefix>$` shard accepts only the token that IS the prefix', () => {
  assert.doesNotThrow(() => searchGazetteer('yo', shardOf('yo$', [])));
  assert.throws(() => searchGazetteer('york', shardOf('yo$', [])), /shard/);
});

test('A-83 Part 7: a query that folds to empty answers [] over a shard rather than throwing', () => {
  assert.deepEqual(searchGazetteer('---', shardOf('ha', [])), []);
});

// ---------------------------------------------------------------------------------------------
// 2c. Sharding: key resolution, the two documents, and the loader (A-83 Parts 5, 6 and 7).
// ---------------------------------------------------------------------------------------------

/**
 * **A-83 Part 6.** A shard starts as one character and splits while its payload exceeds 96 KiB;
 * the manifest is the set of **split** prefixes. Resolution walks it: a token under a split
 * prefix descends one character, and a token that *is* a split prefix lands in the terminal
 * `<prefix>$` shard.
 */
test('A-83 Part 6: a token resolves to exactly one shard key, terminal shard included', () => {
  const splits = ['y', 'yo', 'l'];
  assert.equal(shardKeyFor('york', splits), 'yor');
  assert.equal(shardKeyFor('yo', splits), 'yo$');
  assert.equal(shardKeyFor('y', splits), 'y$');
  assert.equal(shardKeyFor('yankee', splits), 'ya');
  assert.equal(shardKeyFor('zurich', splits), 'z');
  assert.equal(shardKeyFor('london', splits), 'lo');
});

const META_DOC = {
  v: 1,
  $source: 'hand-built fixture',
  $sourceSha256: 'a'.repeat(64),
  $fetched: '2026-09-10',
  idPrefix: 'gn',
  admin1: ['Upper Austria', 'Westminster'],
  countryNames: { AT: 'Austria', GB: 'United Kingdom' },
  splits: ['h'],
};

const SHARD_DOC = {
  v: 1,
  k: 'ha',
  s: 'a'.repeat(64),
  r: [
    // name|alts|iso|admin1|popBucket|lat|lng|id|says
    'Hallstatt||AT|0|9|a6zq|2xbh|1abc|a',
    'Halle (Saale)|halle|||d|-15w9|mk76|1abd|d',
  ],
};

test('A-83 Parts 4 and 5: a shard document decodes, and the FOLD is recomputed rather than shipped', () => {
  const meta = decodeGazetteerMeta(META_DOC);
  const gaz = decodeGazetteer(meta, SHARD_DOC);
  assert.equal(gaz.shard, 'ha');
  assert.equal(gaz.rows.length, 2);
  const [hallstatt, halle] = gaz.rows;
  assert.equal(hallstatt.name, 'Hallstatt');
  // KD-112's guarantee, kept without KD-112's bytes: the fold is not in the payload.
  assert.equal(hallstatt.fold, 'hallstatt');
  assert.equal(halle.fold, 'halle saale');
  assert.deepEqual(hallstatt.alts, []);
  assert.deepEqual(halle.alts, ['halle']);
  assert.equal(hallstatt.countryCode, 'AT');
  // A-84 Part 5: `''` stops being a value of this field. An absent code decodes to `null`.
  assert.equal(halle.countryCode, null);
  assert.equal(hallstatt.admin1, 'Upper Austria');
  assert.equal(halle.admin1, '');
  // A-83 Part 4: the population is a coarse bucket and decodes to `2 ** b`.
  assert.equal(hallstatt.population, 2 ** 9);
  assert.equal(halle.population, 2 ** 13);
  assert.deepEqual(hallstatt.centre, { lat: 47.5622, lng: 13.6493 });
  assert.deepEqual(halle.centre, { lat: -5.4297, lng: 105.261 });
  // A-83 Part 4: the row-id prefix lives in the meta document, not in every row.
  assert.equal(hallstatt.id, 'gn:1abc');
  assert.equal(hallstatt.indexSays, 'agrees');
  assert.equal(halle.indexSays, 'differs');
});

test('A-83 Part 5: a payload row with the wrong field count is a programmer error', () => {
  const meta = decodeGazetteerMeta(META_DOC);
  assert.throws(() => decodeGazetteer(meta, { ...SHARD_DOC, r: ['Hallstatt|AT'] }), /field/);
});

test('A-83 Part 5: a document that is not a shard document is a programmer error', () => {
  const meta = decodeGazetteerMeta(META_DOC);
  assert.throws(() => decodeGazetteer(meta, { v: 1, k: 'ha' }), /shard/);
  assert.throws(() => decodeGazetteerMeta({ v: 1 }), /meta/);
});

/**
 * **A-83 Part 4's one skew hazard, closed by a check rather than by a duplicate.** The admin-1
 * dictionary is global — one 23 kB fetch per session rather than ~1.0 MB of per-shard copies —
 * so a shard built against a different corpus would decode its regions through the wrong table.
 * Both documents carry the same `$sourceSha256` and the loader refuses a pair that disagrees.
 */
const loaderFor = (meta: unknown, shards: Record<string, unknown>) => ({
  meta: () => Promise.resolve({ default: meta }),
  // The generated shard map knows its own keys, so an absent shard is `null` rather than a
  // rejection — which keeps a genuine load failure loud instead of looking like a miss.
  shard: (key: string) => Promise.resolve(key in shards ? { default: shards[key] } : null),
});

test('A-83 Part 7: the loader resolves the query to one shard and returns it named', async () => {
  const io = loaderFor(META_DOC, { ha: SHARD_DOC });
  const gaz = await loadGazetteer('Hallstatt', io);
  assert.ok(gaz);
  assert.equal(gaz.shard, 'ha');
  assert.equal(gaz.rows.length, 2);
  assert.equal(gaz.source, 'hand-built fixture');
  assert.equal(searchGazetteer('hallstatt', gaz)[0].label, 'Hallstatt, Upper Austria, Austria');
});

test('A-83 Part 6: a folded query under two characters is `null` — "keep typing", not "no match"', async () => {
  const io = loaderFor(META_DOC, { ha: SHARD_DOC });
  assert.equal(await loadGazetteer('h', io), null);
  assert.equal(await loadGazetteer(' ', io), null);
  assert.equal(await loadGazetteer('-', io), null);
  assert.notEqual(await loadGazetteer('ha', io), null);
});

test('A-83 Part 6: a shard nobody wrote is an honest empty answer, not a throw', async () => {
  const io = loaderFor(META_DOC, { ha: SHARD_DOC });
  const gaz = await loadGazetteer('qqqq', io);
  assert.ok(gaz);
  assert.deepEqual(gaz.rows, []);
  assert.deepEqual(searchGazetteer('qqqq', gaz), []);
});

test('A-83 Part 4: a shard whose $sourceSha256 disagrees with meta.json is REFUSED BY NAME', async () => {
  const io = loaderFor(META_DOC, { ha: { ...SHARD_DOC, s: 'b'.repeat(64) } });
  await assert.rejects(() => loadGazetteer('hallstatt', io), /ha/);
  await assert.rejects(() => loadGazetteer('hallstatt', io), /sha256/i);
});

test('A-83 Part 7: the meta document is fetched ONCE per loader, however many searches run', async () => {
  let metaFetches = 0;
  const io = {
    meta: () => { metaFetches += 1; return Promise.resolve({ default: META_DOC }); },
    shard: (key: string) =>
      Promise.resolve({ default: key === 'ha' ? SHARD_DOC : { v: 1, k: key, s: 'a'.repeat(64), r: [] } }),
  };
  await loadGazetteer('hallstatt', io);
  await loadGazetteer('halle', io);
  await loadGazetteer('zurich', io);
  assert.equal(metaFetches, 1);
});

// ---------------------------------------------------------------------------------------------
// 3. The shipped artefact — ARCHITECTURE §8.4 A-83 Parts 4–9, A-84 Parts 5 and 6, ROADMAP I-23.
//
// The corpus is **sharded**, so there are two ways in and both are exercised:
//
//  - `loadGazetteerFor(query)` through the **bare subpath**, which is how a consumer reaches it
//    and is therefore the only honest way to test the boundary; and
//  - the whole corpus, assembled from every shard document on disk, which is what a corpus-wide
//    invariant has to quantify over. **`ONE SEARCH, ONE SHARD` is asserted by comparing the two.**
// ---------------------------------------------------------------------------------------------

const CORPUS = resolve(HERE, '..', 'src', 'geo', 'gazetteer');

type MetaDoc = {
  $source: string;
  $sourceSha256: string;
  idPrefix: string;
  admin1: string[];
  countryNames: Record<string, string>;
  splits: string[];
  rows: number;
  indexSays: { agrees: number; differs: number; silent: number };
};

const metaDoc = (): MetaDoc =>
  JSON.parse(readFileSync(resolve(CORPUS, 'meta.json'), 'utf8')) as MetaDoc;

const shardDocs = (): Array<{ v: number; k: string; s: string; r: string[] }> =>
  readdirSync(CORPUS)
    .filter((n) => n !== 'meta.json' && n.endsWith('.json'))
    .sort()
    .map((n) => JSON.parse(readFileSync(resolve(CORPUS, n), 'utf8')));

/**
 * The whole corpus, assembled from every shard and deduplicated by row id — the thing no consumer
 * ever holds, built here so that a corpus-wide invariant can be quantified over it and so that
 * *"one search, one shard"* has something to be compared against.
 */
let WHOLE: Gazetteer | null = null;
const whole = (): Gazetteer => {
  if (WHOLE !== null) return WHOLE;
  const meta = decodeGazetteerMeta(metaDoc());
  const byId = new Map<string, GazetteerRow>();
  for (const doc of shardDocs()) {
    for (const row of decodeGazetteer(meta, doc).rows) if (!byId.has(row.id)) byId.set(row.id, row);
  }
  WHOLE = { source: meta.source, shard: null, countryNames: meta.countryNames, rows: [...byId.values()] };
  return WHOLE;
};

const load = async (query: string): Promise<Gazetteer | null> =>
  (await import('@cairn/core/gazetteer')).loadGazetteerFor(query);

/**
 * **THE criterion this feature lives or dies on** (A-83 Part 8, restated by A-84 Part 6 over three
 * values rather than two, and **not weakened**).
 *
 * > **No shipped row may *silently* contradict the country index.** Every row records what the
 * > index says about its own claim, and **silence is not agreement**.
 *
 * Over **every** shipped row, **zero exceptions, no allowlist**. The predecessor's boolean shipped
 * all 436 index-silent rows claiming agreement, which is the defect A-84 Part 6 exists to close.
 */
test('A-84 Part 6: every row\'s `indexSays` is what countryOf actually says — every row, no allowlist', async () => {
  const { countryOf, COUNTRY_INDEX } = await import('../src/index.ts');
  const wrong: string[] = [];
  const census = { agrees: 0, differs: 0, silent: 0 };
  for (const r of whole().rows) {
    const derived = countryOf(r.centre, COUNTRY_INDEX);
    census[r.indexSays] += 1;
    if (r.indexSays === 'agrees' && derived !== r.countryCode) {
      wrong.push(`${r.name} (${r.id}) says "agrees" as ${r.countryCode}, countryOf says ${derived ?? 'nothing'}`);
    }
    if (r.indexSays === 'differs' && (derived === null || derived === r.countryCode)) {
      wrong.push(`${r.name} (${r.id}) says "differs", countryOf says ${derived ?? 'nothing'}`);
    }
    if (r.indexSays === 'silent' && derived !== null && r.countryCode !== null) {
      wrong.push(`${r.name} (${r.id}) says "silent", countryOf says ${derived}`);
    }
  }
  assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} rows mis-state what the index says`);
  // **Silence is not agreement**, asserted as the property and not only as a count: no row the
  // index has no answer for may claim agreement. This is A-84 Part 6's whole subject.
  const silentAndAgreeing = whole().rows.filter((r) => r.indexSays === 'agrees' && r.countryCode === null);
  assert.deepEqual(silentAndAgreeing, [], 'a row with no country claims the index agrees with it');
  // The published triple sums to the row count, and every arm is non-empty — a marking that never
  // fires is a marking that was deleted.
  const meta = metaDoc();
  assert.deepEqual(census, meta.indexSays, 'the corpus census disagrees with the one meta.json publishes');
  assert.equal(census.agrees + census.differs + census.silent, whole().rows.length);
  assert.ok(census.differs > 0, 'ZERO rows ship marked as differing — the marking is gone');
  assert.ok(census.silent > 0, 'ZERO rows ship marked silent — the tri-state has collapsed');
});

/**
 * A-83 Part 8's own named costs of the refusal it replaced: a national capital, the second city of
 * Switzerland, and a second national capital, each shipping **with** its disagreement rather than
 * being dropped.
 */
test('A-83 Part 8: Geneva, Jerusalem and Brazzaville ship, each marked as a disagreement', async () => {
  const { searchGazetteer: search } = await import('../src/index.ts');
  for (const [query, code] of [['geneva', 'CH'], ['jerusalem', 'IL'], ['brazzaville', 'CG']] as const) {
    const gaz = await load(query);
    assert.ok(gaz, `${query} does not resolve to a shard`);
    const hit = search(query, gaz).find((h) => h.countryCode === code);
    assert.ok(hit, `${query} is not in the corpus as ${code}`);
    assert.equal(hit.indexSays, 'differs', `${hit.name} ships without its disagreement recorded`);
  }
});

test('A-83 Part 11: the disagreements golden names every differing row, and every one SHIPS', () => {
  const golden = JSON.parse(
    readFileSync(resolve(HERE, '..', '..', '..', 'fixtures', 'golden', 'gazetteer-disagreements.json'), 'utf8'),
  ) as { total: number; disagreements: Array<{ id: string; name: string; statedCountry: string; derivedCountry: string }> };
  const differing = whole().rows.filter((r) => r.indexSays === 'differs');
  assert.equal(golden.total, golden.disagreements.length, 'the golden\'s own total is wrong');
  assert.equal(golden.disagreements.length, differing.length, 'the golden and the corpus disagree on how many rows differ');
  const byId = new Map(whole().rows.map((r) => [r.id, r]));
  for (const d of golden.disagreements) {
    const row = byId.get(d.id);
    assert.ok(row, `${d.name} (${d.id}) is published as a disagreement and does not ship`);
    assert.equal(row.indexSays, 'differs', `${d.name} is published as a disagreement and does not carry one`);
    assert.equal(row.countryCode, d.statedCountry, `${d.name} ships a different code from the one published`);
    assert.notEqual(d.statedCountry, d.derivedCountry, `${d.name} is published with two identical answers`);
  }
});

/**
 * **A-84 Part 5 — the parent translation, as a ceiling** (*How a criterion is written*, rule 4).
 *
 * > **Every** shipped row's `countryCode` is `null` or a code `COUNTRY_INDEX` draws — **zero
 * > exceptions, no allowlist.**
 *
 * A row carrying `MQ` would put Fort-de-France on nobody's map: the shipped index does not draw
 * Martinique, so the code is resolved at generation time against the dataset the index is cut from
 * and the row ships `FR` — or `null`, and **never a guess**.
 */
test('A-84 Part 5: every shipped countryCode is null or a code COUNTRY_INDEX can DRAW', async () => {
  const { COUNTRY_INDEX } = await import('../src/index.ts');
  const draws = new Set(COUNTRY_INDEX.countries.map((c) => c.code));
  const undrawable = whole().rows
    .filter((r) => r.countryCode !== null && !draws.has(r.countryCode))
    .map((r) => `${r.name} (${r.id}) carries ${r.countryCode}`);
  assert.deepEqual(undrawable.slice(0, 10), [], `${undrawable.length} rows carry an undrawable code`);
  // `''` stops being one of this field's values — A-84 Part 5 says so in as many words.
  assert.deepEqual(whole().rows.filter((r) => (r.countryCode as unknown) === ''), []);
});

test('A-84 Part 5: the parents golden names every translated row, with both codes', () => {
  const golden = JSON.parse(
    readFileSync(resolve(HERE, '..', '..', '..', 'fixtures', 'golden', 'gazetteer-parents.json'), 'utf8'),
  ) as {
    total: number;
    translated: number;
    shippedNull: number;
    codeParent: Record<string, string | null>;
    parents: Array<{ id: string; name: string; statedCode: string; shippedCode: string | null }>;
  };
  assert.equal(golden.total, golden.parents.length);
  // **A parent count of zero is itself a failure** (ROADMAP I-23, a stop-and-report condition).
  assert.ok(golden.total > 0, 'the parent translation never fired — the mechanism is gone');
  assert.ok(golden.translated > 0, 'no row was translated to a drawable parent');
  const byId = new Map(whole().rows.map((r) => [r.id, r]));
  for (const p of golden.parents) {
    const row = byId.get(p.id);
    assert.ok(row, `${p.name} (${p.id}) is published as translated and does not ship`);
    assert.equal(row.countryCode, p.shippedCode, `${p.name} ships ${row.countryCode}, published ${p.shippedCode}`);
    assert.notEqual(p.statedCode, p.shippedCode, `${p.name} is published as translated and was not`);
  }
  // The eight codes A-84 Part 5 names, and where the layer the index is cut from puts them.
  assert.equal(golden.codeParent.MQ, 'FR');
  assert.equal(golden.codeParent.GP, 'FR');
  assert.equal(golden.codeParent.RE, 'FR');
  assert.equal(golden.codeParent.YT, 'FR');
  assert.equal(golden.codeParent.GF, 'FR');
  assert.equal(golden.codeParent.SJ, 'NO');
  assert.equal(golden.codeParent.BQ, 'NL');
  // **`TK → NZ` and `CC → AU` at I-32** (§8.4 A-94, QA R68-1). Both used to be `null`, and both
  // were `null` only because the parent election counted an **abstention** as a vote: `TK` is
  // `NZ:1 abstain:2` and `CC` is `AU:2 abstain:3`. Counting the silences deleted the entire Cocos
  // (Keeling) Islands territory from the picker. **A-84 Part 5's rule is unchanged** — Cairn does
  // not adjudicate a sovereignty its own map cannot draw — and what changed is that a row the
  // layer *does* answer for is no longer outvoted by the rows it is silent about.
  assert.equal(golden.codeParent.TK, 'NZ');
  assert.equal(golden.codeParent.CC, 'AU');
  // **`shippedNull` is the size of its own group and nothing else is asserted about it here.**
  // A-94 Part 3 item 4: a test may not assert that this count is zero, because a count of zero is
  // satisfied by DELETING the arm — which is the failure A-89 Part 5 sentence 3 was written
  // against. The arm is asserted by its mechanism in `gazetteerElection.test.ts` (the published
  // election) and `gazetteerMultiCountry.test.ts` (the 13 codeless refusals).
  assert.equal(golden.shippedNull, golden.parents.filter((p) => p.shippedCode === null).length);
  assert.equal(golden.translated, golden.parents.filter((p) => p.shippedCode !== null).length);
});

/**
 * A-84 Part 5's named outcomes, **re-derived through the door a picker will use**: the row is
 * found, `cityPickFromRow` mints a pick from it, `createTrip` stores it and `tripSummary` reports
 * the country. This is the whole chain, and it is what makes the translation a fact about a user's
 * map rather than a fact about a golden.
 */
test('A-84 Part 5: a picked Martinique, Svalbard or Guyane row reports its parent through tripSummary', async () => {
  const core = await import('../src/index.ts');
  const attribute = async (query: string, pick: (h: GazetteerHit) => boolean) => {
    const gaz = await load(query);
    assert.ok(gaz, `${query} does not resolve to a shard`);
    const hit = core.searchGazetteer(query, gaz).find(pick);
    assert.ok(hit, `${query} is not in the corpus`);
    const trip = core.createTrip(
      { title: 'T', startDate: '2026-03-01', endDate: '2026-03-05', ownerId: 'u1',
        cities: [{ name: hit.name, pick: core.cityPickFromRow(hit) }] },
      { ids: core.sequentialIds('p'), now: '2026-01-01' },
    );
    const row = core.tripSummary(trip, core.COUNTRY_INDEX).cities[0];
    return { code: row.countryCode, source: row.countrySource, hit };
  };

  const fdf = await attribute('fort de france', (h) => h.name === 'Fort-de-France');
  assert.deepEqual({ code: fdf.code, source: fdf.source }, { code: 'FR', source: 'picked' });

  const lyr = await attribute('longyearbyen', (h) => h.name === 'Longyearbyen');
  assert.deepEqual({ code: lyr.code, source: lyr.source }, { code: 'NO', source: 'picked' });

  // **Saint-Georges on the Oyapock**: the picked arm outranks a coarse ring, doing exactly the job
  // A-83 Part 8 gave it, on a case that is wrong without it — `countryOf` says Brazil.
  const sg = await attribute('saint georges', (h) => h.admin1 === 'Guyane');
  assert.deepEqual({ code: sg.code, source: sg.source }, { code: 'FR', source: 'picked' });
  assert.equal(sg.hit.indexSays, 'differs', 'Saint-Georges no longer disagrees with the index');
  assert.equal(core.countryOf(sg.hit.centre, core.COUNTRY_INDEX), 'BR');

  // **The two territories I-32 gave back, through the same chain** (§8.4 A-94, QA R68-1).
  // `Nukunonu` reported `{null, null}` until revision 72 — not because the layer had no answer for
  // Tokelau, but because two rows it was silent about outvoted the one it answered. `West Island`
  // did not report anything at all: the whole Cocos (Keeling) Islands territory shipped zero rows,
  // refused as bare names, and its capital returned NO MATCH.
  const tk = await attribute('nukunonu', (h) => h.name === 'Nukunonu');
  assert.deepEqual({ code: tk.code, source: tk.source }, { code: 'NZ', source: 'picked' });

  const cc = await attribute('west island', (h) => h.id === 'gn:x5xz');
  assert.deepEqual({ code: cc.code, source: cc.source }, { code: 'AU', source: 'picked' });
});

test('A-83 Part 8: every shipped row id carries its source prefix', () => {
  const bad = whole().rows.filter((r) => !/^gn:[0-9a-z]+$/.test(r.id));
  assert.deepEqual(bad.slice(0, 5).map((r) => r.id), [], 'a row id does not name the dataset that minted it');
  assert.equal(new Set(whole().rows.map((r) => r.id)).size, whole().rows.length, 'two rows share an id');
});

/**
 * **KD-112's guarantee, kept without KD-112's bytes** (A-83 Part 4, ROADMAP criterion N6).
 *
 * The fold is no longer shipped, so the two implementations of `foldPlaceName` — core's and the
 * generator's — can no longer be compared field by field. What replaces it is stronger and free:
 * every row was **written into the shard of every token of the generator's fold**, so if core's
 * fold disagrees, a decoded row lands in a shard none of its own tokens resolve to, and this test
 * names it. Change one character of `SUBSTITUTIONS` in `gazetteer.ts` alone and it reddens.
 */
test('A-83 Part 4: core\'s foldPlaceName puts every shipped row in the shard it was written to', () => {
  const meta = decodeGazetteerMeta(metaDoc());
  const stray: string[] = [];
  let checked = 0;
  for (const doc of shardDocs()) {
    for (const row of decodeGazetteer(meta, doc).rows) {
      checked += 1;
      const tokens = new Set([...row.fold.split(' '), ...row.alts.flatMap((a) => a.split(' '))]);
      const keys = new Set([...tokens].filter((t) => t !== '').map((t) => shardKeyFor(t, meta.splits)));
      if (!keys.has(doc.k)) stray.push(`${row.name} (${row.id}) is in shard "${doc.k}", folds to "${row.fold}"`);
    }
  }
  assert.deepEqual(stray.slice(0, 10), [], `${stray.length} rows are in a shard their own fold does not reach`);
  assert.ok(checked > 190_000, `only ${checked} emitted rows checked`);
});

/**
 * **QA R67-1 — the two-character rule is on the QUERY, not on its first token.**
 *
 * `loadGazetteer` read `foldPlaceName(query).split(' ')[0].length < 2`, so an eight-character
 * query with a one-character first word was told *"keep typing"* and **152 shipped rows answered
 * nothing when a user typed their own full name** — *A Coruña* (245,000 people), *L'Aquila*,
 * *L'Alcúdia*, *T'aebaek*. The answer was on disk the whole time: a one-character first token
 * resolves to the **terminal `a$` shard**, which by construction holds exactly the rows whose
 * first token *is* `a`, and searching it returns the row. A-83 Part 6 rules on the **folded
 * query**; a one-character *query* is still `null`.
 */
test('A-83 Part 6 / R67-1: a one-character FIRST TOKEN resolves to the terminal shard and finds the row', async () => {
  for (const [query, key] of [['A Coruña', 'a$'], ["L'Aquila", 'l$']] as const) {
    const g = await load(query);
    assert.ok(g, `"${query}" is ${query.length} characters and the loader answered "keep typing"`);
    assert.equal(g.shard, key, `"${query}" resolved to shard "${g.shard}"`);
    const hits = searchGazetteer(query, g, { limit: 20 });
    assert.ok(
      hits.some((h) => foldPlaceName(h.name) === foldPlaceName(query)),
      `"${query}" returns ${hits.length} hits and none of them is that place`,
    );
  }
  // The case A-83 Part 6 actually rules — a one-character QUERY — is unchanged.
  assert.equal(await load('a'), null);
  assert.equal(await load('A'), null);
  assert.equal(await load(' ł '), null, 'a query folding to one character is still "keep typing"');
});

/**
 * The ceiling behind R67-1, asked of the whole corpus rather than of three examples: **a row a
 * user cannot reach by typing its own full name is a row that does not exist to them.**
 *
 * Two classes are `null` by A-83 Part 6's own ruling and are counted rather than asserted away —
 * a fold under two characters, and a fold that *is* a split prefix (KD-118's disclosed arm, ten
 * rows: `Ål`, `Ba`, `Bo`, `Bø`, `Ha`, `Mo`, `Pa`, `Pô` …). Everything else must be **held by the
 * shard its own first token resolves to**, which is the path `loadGazetteerFor` actually walks.
 */
test('A-83 Parts 6 and 7 / R67-1: every shipped row is held by the shard its own full name resolves to', () => {
  const meta = decodeGazetteerMeta(metaDoc());
  const splits = new Set(meta.splits);
  const idsByKey = new Map<string, Set<string>>();
  for (const doc of shardDocs()) idsByKey.set(doc.k, new Set(doc.r.map((packed) => packed.split('|')[7])));

  const keepTyping: string[] = [];
  const unreachable: string[] = [];
  let checked = 0;
  for (const row of whole().rows) {
    checked += 1;
    const fold = row.fold;
    const token = fold.split(' ')[0];
    if (fold.length < 2 || (fold === token && splits.has(token))) { keepTyping.push(row.name); continue; }
    const key = shardKeyFor(token, meta.splits);
    if (!idsByKey.get(key)?.has(row.id.slice(row.id.indexOf(':') + 1))) {
      unreachable.push(`${row.name} (${row.id}) folds to "${fold}" and resolves to shard "${key}", which does not hold it`);
    }
  }
  assert.deepEqual(
    unreachable.slice(0, 10), [],
    `${unreachable.length} of ${checked} shipped rows cannot be reached by typing their own name`,
  );
  assert.ok(checked > 140_000, `only ${checked} rows checked`);
  assert.ok(
    keepTyping.length <= 12,
    `${keepTyping.length} rows are "keep typing" against their own name (KD-118's arm): ${keepTyping.slice(0, 20).join(', ')}`,
  );
});

/**
 * **QA R67-2 — a pinned verification pair that cannot see its own row verifies its own spelling.**
 *
 * A-82 Part 3 pins `foldPlaceName('Nuku\u02BBalofa') === 'nukualofa'` and that pair was **green**
 * while the query `nukualofa` returned **no rows at all**: the shipped row is spelled
 * `Nuku\u2018alofa`, U+2018 was not in the substitution table, and step 5 turned it into a space.
 * The pair asserted a fold of a string the test itself wrote. It now has to reach the row.
 */
test('A-82 Part 3 / R67-2: the pinned pair reaches the SHIPPED row it stands for', async () => {
  const rows = whole().rows.filter((r) => /^Nuku.alofa$/u.test(r.name));
  assert.ok(rows.length > 0, 'no Nuku\u2018alofa row ships — the pinned pair stands for nothing');
  const g = await load('nukualofa');
  assert.ok(g, '`nukualofa` is "keep typing" — the pinned pair produces a query the loader refuses');
  const hits = searchGazetteer('nukualofa', g, { limit: 20 });
  for (const r of rows) {
    assert.ok(
      hits.some((h) => h.id === r.id),
      `the pinned pair folds to "nukualofa" and ${JSON.stringify(r.name)} (${r.id}) is not among the ${hits.length} rows it returns`,
    );
  }
});

test('A-82 Part 3 / R67-2: the okina family is one mark, and omitting it still finds the place', async () => {
  for (const [query, name] of [
    ['xian', 'Xi\u2019an'],
    ['oahu', 'O\u2018ahu'],
    ['taif', 'Ta\u2019if'],
  ] as const) {
    const g = await load(query);
    assert.ok(g, `"${query}" is "keep typing"`);
    const hits = searchGazetteer(query, g, { limit: 20 });
    assert.ok(
      hits.some((h) => h.name === name),
      `"${query}" returns ${JSON.stringify(hits.slice(0, 3).map((h) => h.label))} and none of them is ${JSON.stringify(name)}`,
    );
  }
});

/**
 * The ceiling behind R67-2, over every row the mark touches: **de-punctuating a name is what a
 * person types**, and 700 of 763 such rows used to answer nothing.
 */
test('A-82 Part 3 / R67-2: every row spelled with an okina is reachable without it', async () => {
  const MARK = /[\u2018\u2019\u02BB\u02BC\u0060]/u;
  const rows = whole().rows.filter((r) => MARK.test(r.name));
  assert.ok(rows.length > 500, `only ${rows.length} shipped rows carry an okina-family mark`);
  const lost: string[] = [];
  for (const r of rows) {
    const q = foldPlaceName(r.name.replace(new RegExp(MARK, 'gu'), ''));
    const g = await load(q);
    const hits = g === null ? [] : searchGazetteer(q, g, { limit: 500 });
    if (!hits.some((h) => h.id === r.id)) lost.push(`${r.name} → typing "${q}" does not reach it`);
  }
  assert.deepEqual(lost.slice(0, 10), [], `${lost.length} of ${rows.length} okina rows are unreachable without the mark`);
});

test('A-82 Part 2: the shipped rows are in the emitted total order, and that order is the artefact', () => {
  const meta = decodeGazetteerMeta(metaDoc());
  for (const doc of shardDocs()) {
    const rows = decodeGazetteer(meta, doc).rows;
    for (let i = 1; i < rows.length; i += 1) {
      const a = rows[i - 1];
      const b = rows[i];
      const key = (r: GazetteerRow) => [r.fold, -r.population, r.countryCode ?? '', r.id];
      const ka = key(a);
      const kb = key(b);
      let ordered = false;
      for (let k = 0; k < ka.length; k += 1) {
        if (ka[k] !== kb[k]) { ordered = ka[k] < kb[k]; break; }
      }
      assert.ok(ordered, `shard ${doc.k}: ${a.name} sorts after ${b.name} — the emitted order is not total`);
    }
  }
});

/**
 * Every ceiling I-23 states over the corpus, in one walk (rule 4: they are ceilings, not floors).
 *
 * The `{0,0}` one matters more than it looks. **A-85 Part 5 ruled the origin-pick case out of
 * scope on the measured ground that no shipped row lies within a whole degree of the origin** —
 * a fact about the corpus this increment REPLACES. It is asserted here rather than inherited.
 */
test('A-83 Part 9 / A-85 Part 5: no bare name, no unreadable name, no delimiter, and nothing at {0,0}', () => {
  const bare: string[] = [];
  const unreadable: string[] = [];
  const delimited: string[] = [];
  const origin: string[] = [];
  for (const r of whole().rows) {
    if (r.countryCode === null && r.admin1 === '') bare.push(r.name);
    for (const text of [r.name, r.admin1, ...r.alts]) {
      if (text.includes('�') || text.includes('?')) unreadable.push(`${r.name}: ${text}`);
      if (text.includes('|') || text.includes('\n')) delimited.push(`${r.name}: ${text}`);
    }
    if (r.centre.lat === 0 && r.centre.lng === 0) origin.push(`${r.name} (${r.id})`);
  }
  assert.deepEqual(bare.slice(0, 5), [], `${bare.length} rows would render as a bare name`);
  assert.deepEqual(unreadable.slice(0, 5), [], `${unreadable.length} rows carry ? or U+FFFD`);
  assert.deepEqual(delimited.slice(0, 5), [], `${delimited.length} rows carry a payload delimiter`);
  assert.deepEqual(origin, [], 'a shipped row sits at exactly {0,0} — A-85 Part 5\'s dismissal reopens');
});

test('A-83 Part 4: every shipped row is well formed — real coordinate, folded alts, bucketed population', () => {
  const bad: string[] = [];
  for (const r of whole().rows) {
    if (!Number.isFinite(r.centre.lat) || Math.abs(r.centre.lat) > 90) bad.push(`${r.name} lat ${r.centre.lat}`);
    if (!Number.isFinite(r.centre.lng) || Math.abs(r.centre.lng) > 180) bad.push(`${r.name} lng ${r.centre.lng}`);
    // 4 dp is A-83 Part 4's floor and it does not move. Compared with a tolerance, because
    // `457589 / 1e4 * 1e4` is not `457589` in binary floating point.
    for (const [axis, v] of [['lat', r.centre.lat], ['lng', r.centre.lng]] as const) {
      if (Math.abs(v * 1e4 - Math.round(v * 1e4)) > 1e-6) bad.push(`${r.name} ${axis} is finer than 4 dp`);
    }
    if (r.alts.length > 1) bad.push(`${r.name} carries ${r.alts.length} alternates`);
    for (const a of r.alts) if (foldPlaceName(a) !== a) bad.push(`${r.name} alt "${a}" is not folded`);
    if (r.population !== 2 ** Math.round(Math.log2(r.population))) bad.push(`${r.name} population ${r.population} is not a bucket`);
    if (r.fold === '') bad.push(`${r.name} folds to nothing`);
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} malformed rows`);
});

/**
 * **The fault A-83 Part 6's design is most likely to commit, and the one that would silently make
 * the search incomplete** (ROADMAP I-23's fault N3): shard a row by its first token only, and `york`
 * stops finding *New York* — while every other query still looks right.
 *
 * So: for a named list of queries, the result of searching the **one shard `loadGazetteerFor`
 * returns** is identical, row for row and in order, to searching the whole corpus.
 */
test('A-83 Parts 6 and 7: one search, one shard, and the answer is the whole corpus\'s', async () => {
  const { searchGazetteer: search } = await import('../src/index.ts');
  const queries = [
    'york', 'angeles', 'new york', 'zurich', 'london', 'springfield', 'hallstatt', 'positano',
    'obidos', 'hvar', 'geneva', 'bac kan', 'lodz', 'san marino', 'de aar', 'rio de janeiro',
  ];
  for (const query of queries) {
    const one = await load(query);
    assert.ok(one, `"${query}" does not resolve to a shard`);
    assert.deepEqual(
      search(query, one, { limit: 20 }),
      search(query, whole(), { limit: 20 }),
      `"${query}" answers differently from its shard than from the whole corpus`,
    );
  }
  // The token-prefix case by name, because it is the one the sharding rule is hardest on: a row
  // whose SECOND token is `york` has to be in the shard `york` resolves to. Below the default
  // window, because the corpus holds more places actually called York than a window shows —
  // which is a fact about the corpus, not about the sharding.
  const yorkShard = await load('york');
  assert.ok(yorkShard);
  const deep = search('york', yorkShard, { limit: 500 });
  const interior = deep.filter((h) => h.fold.split(' ').indexOf('york') > 0);
  assert.ok(
    interior.some((h) => /^New York/.test(h.name)),
    '`york` does not find New York from its own shard — the row was sharded by its first token only',
  );
  assert.deepEqual(deep, search('york', whole(), { limit: 500 }), '`york` is short by a row from its shard');
});

test('A-83 Part 6: a bare split prefix is "keep typing", and a second word resolves it', async () => {
  // `san` and `de` are split prefixes in the shipped corpus: their true answer is a whole subtree.
  assert.equal(await load('san'), null);
  assert.equal(await load('de'), null);
  assert.equal(await load('s'), null);
  const sanMarino = await load('san marino');
  assert.ok(sanMarino, '`san marino` cannot be searched — a multi-word query lost its shard');
  assert.equal(sanMarino.shard, 'san$');
  const { searchGazetteer: search } = await import('../src/index.ts');
  assert.ok(
    search('san marino', sanMarino).some((h) => h.countryCode === 'SM'),
    'the republic of San Marino is not reachable by its own name',
  );
});

test('A-83 Part 7: the loader refuses a shard whose $sourceSha256 does not match meta.json', () => {
  const meta = decodeGazetteerMeta(metaDoc());
  const doc = shardDocs()[0];
  assert.equal(doc.s, meta.sourceSha256, 'a committed shard already disagrees with meta.json');
  // The refusal itself is exercised over a hand-built pair in section 2c; here the assertion is
  // that the shipped pair AGREES, which is what makes that refusal a guard rather than a wall.
  for (const d of shardDocs()) assert.equal(d.s, meta.sourceSha256, `shard ${d.k} carries a foreign checksum`);
});

test('A-82 Part 4: three Londons in three countries, GB first, over the shipped corpus', async () => {
  const { searchGazetteer: search } = await import('../src/index.ts');
  const gaz = await load('london');
  assert.ok(gaz);
  const londons = search('london', gaz, { limit: 20 }).filter((h) => h.name === 'London');
  assert.ok(londons.length >= 3, `only ${londons.length} Londons`);
  assert.equal(londons[0].countryCode, 'GB', 'the nine-million London is not first');
  assert.ok(new Set(londons.map((h) => h.countryCode)).size >= 3, 'the Londons are not in three countries');
});

/**
 * **A-83 Part 9 clause 3 over the real corpus**: 803 labels are carried by more than one row, so a
 * window that contains two of them must still be a list a user can choose from.
 */
test('A-83 Part 9: every label in a returned window is distinct, over the shipped corpus', async () => {
  const { searchGazetteer: search } = await import('../src/index.ts');
  for (const query of ['bandar lampung', 'springfield', 'san jose', 'santa cruz', 'london', 'obidos']) {
    const gaz = await load(query);
    assert.ok(gaz, `"${query}" does not resolve`);
    const labels = search(query, gaz, { limit: 20 }).map((h) => h.label);
    assert.equal(new Set(labels).size, labels.length, `"${query}" returns two identical labels`);
    for (const l of labels) assert.ok(l.includes(','), `"${l}" is a bare name`);
  }
});

test('A-82 Part 1 measurement 2: the micro-states resolve to themselves, not to their encloser', async () => {
  const { searchGazetteer: search } = await import('../src/index.ts');
  for (const [query, code] of [
    ['vatican', 'VA'], ['monaco', 'MC'], ['san marino', 'SM'], ['andorra la vella', 'AD'],
    ['singapore', 'SG'], ['hong kong', 'HK'], ['valletta', 'MT'],
  ] as const) {
    const gaz = await load(query);
    assert.ok(gaz, `"${query}" does not resolve`);
    assert.ok(
      search(query, gaz, { limit: 20 }).some((h) => h.countryCode === code),
      `"${query}" does not reach a row in ${code}`,
    );
  }
});

/**
 * The ceilings, over the shipped corpus. `ork` must find no York — a substring matcher would — and
 * a query for something that is genuinely not a place must be an **honest miss**, not silence and
 * not a "keep typing".
 */
test('A-82 Part 3: the shipped corpus obeys the ceilings — `ork` finds no York, and a miss is a miss', async () => {
  const { searchGazetteer: search } = await import('../src/index.ts');
  const ork = await load('ork');
  assert.ok(ork);
  assert.deepEqual(
    search('ork', ork, { limit: 20 }).filter((h) => /^York/.test(h.name)).map((h) => h.name),
    [],
    'an interior match reached the results: the matcher is doing `includes`, not a prefix',
  );
  const nowhere = await load('qzzzxwv');
  assert.ok(nowhere, 'a long query that matches nothing must still be SEARCHED, not refused');
  assert.deepEqual(search('qzzzxwv', nowhere), [], 'a miss is a miss and the product says so');
});

test('A-82 Part 10: the probes golden reproduces exactly, query for query', async () => {
  const { searchGazetteer: search } = await import('../src/index.ts');
  const golden = JSON.parse(
    readFileSync(resolve(HERE, '..', '..', '..', 'fixtures', 'golden', 'gazetteer-probes.json'), 'utf8'),
  ) as {
    probeDepth: number;
    probes: Array<{ query: string; shard: string; hits: Array<Record<string, unknown>> }>;
  };
  assert.ok(golden.probes.length >= 13, 'the probe list shrank below A-82 Part 10\'s minimum');
  for (const probe of golden.probes) {
    const gaz = await load(probe.query);
    assert.ok(gaz, `"${probe.query}" no longer resolves to a shard`);
    assert.equal(gaz.shard, probe.shard, `"${probe.query}" now resolves to a different shard`);
    const hits = search(probe.query, gaz, { limit: golden.probeDepth }).map((h) => ({
      id: h.id, name: h.name, label: h.label, countryCode: h.countryCode,
      admin1: h.admin1, centre: h.centre, indexSays: h.indexSays,
    }));
    assert.deepEqual(hits, probe.hits, `the answer to "${probe.query}" moved`);
  }
});

/**
 * A-82 Part 9's ceiling, widened by A-83 Part 5 to the whole generated family: **the corpus may
 * not be reachable from the core barrel**, or it lands in every consumer's main chunk.
 */
test('A-83 Part 5: neither the shard map nor any corpus document is reachable from src/index.ts', () => {
  const SRC = resolve(HERE, '..', 'src');
  const seen = new Set<string>();
  const walkGraph = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    // Static imports/exports AND dynamic `import('…')`: a lazy import from inside the barrel is
    // still a graph edge as far as a bundler that cannot prove it unreachable is concerned.
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) {
      walkGraph(resolve(dirname(file), m[1]));
    }
  };
  walkGraph(resolve(SRC, 'index.ts'));
  const reachable = [...seen].map((f) => relative(SRC, f).split(sep).join('/')).sort();
  assert.equal(
    reachable.includes('geo/gazetteerShards.gen.ts'),
    false,
    'the shard map is reachable from the core barrel: every consumer would pay for 966 lazy chunks. ' +
      'A-82 Part 9 puts it behind the `@cairn/core/gazetteer` subpath for exactly this.',
  );
  assert.deepEqual(reachable.filter((f) => f.startsWith('geo/gazetteer/')), [], 'a corpus document is in the barrel graph');
  // The control: the walk really does reach things, and it really does reach the OTHER generated
  // module, which IS on the write path and IS supposed to be there (A-27 Part 9).
  assert.equal(reachable.includes('geo/countries.gen.ts'), true, 'the graph walk found nothing — it is broken');
  assert.equal(reachable.includes('geo/gazetteer.ts'), true, 'searchGazetteer is not reachable from the barrel');
});

test('A-82 Part 4: the comparator is total over the SHIPPED rows — a reordered copy answers identically', async () => {
  const { searchGazetteer: search } = await import('../src/index.ts');
  for (const query of ['springfield', 'london', 'york', 'santa']) {
    const gaz = await load(query);
    assert.ok(gaz);
    const reversed: Gazetteer = { ...gaz, rows: [...gaz.rows].reverse() };
    assert.equal(
      JSON.stringify(search(query, reversed, { limit: 20 })),
      JSON.stringify(search(query, gaz, { limit: 20 })),
      `"${query}" answers differently over a reordered rows array — the comparator is not total`,
    );
  }
});
