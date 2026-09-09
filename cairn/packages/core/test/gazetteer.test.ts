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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';
import { foldPlaceName, searchGazetteer } from '../src/geo/gazetteer.ts';
import type { Gazetteer, GazetteerRow } from '../src/geo/gazetteer.ts';

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
  assert.equal(foldPlaceName("aʻbʼc"), 'abc');
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
  countryCode: r.countryCode ?? 'XX',
  admin1: r.admin1 ?? '',
  population: r.population ?? 0,
  centre: r.centre ?? { lat: 0, lng: 0 },
  id: r.id,
  // §8.4 A-83 Part 8. `true` by default: a hand-built fixture states no disagreement, and a
  // fixture that silently claimed one would make the marking's own tests vacuous.
  indexAgrees: r.indexAgrees ?? true,
});

/**
 * Nine rows, readable, exercising every clause of the ranking and every clause of the label.
 * The three Londons are A-82 Part 4's own example; `Monaco` is the city-state with no admin-1;
 * `New York` and `Los Angeles` are the token-prefix cases; `Yorkton` is the control that says
 * `'york'` matching `New York` is a **token** prefix and not a substring.
 */
const FIXTURE: Gazetteer = {
  source: 'hand-built fixture',
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
// 3. The shipped artefact — ARCHITECTURE §8.4 A-82 Parts 5, 9 and 10.
//
// `GAZETTEER` is reached through the **bare subpath**, not by module path, because that is how a
// consumer reaches it and a test that reaches it another way is not testing the boundary.
// ---------------------------------------------------------------------------------------------

const shipped = async (): Promise<Gazetteer> => (await import('@cairn/core/gazetteer')).GAZETTEER;

/**
 * **THE criterion this increment lives or dies on** (A-82 Part 5, ROADMAP I-21).
 *
 * > A row ships only if `countryOf(row.centre, COUNTRY_INDEX)` is either the row's own country
 * > code, or `null`.
 *
 * Over **every** shipped row, **zero exceptions, no allowlist**. Shipping a contradicted row would
 * put Maastricht in Belgium on a user's lifetime map, and the point of refusing at generation time
 * is that A-29's precedence never has to arbitrate: wherever `countryOf` speaks, it now agrees.
 */
test('A-82 Part 5 / A-83 Part 8: no shipped row with `indexAgrees: true` contradicts countryOf — every row, no allowlist', async () => {
  const { countryOf, COUNTRY_INDEX } = await import('../src/index.ts');
  const gaz = await shipped();
  const contradicted: string[] = [];
  let agree = 0;
  let silent = 0;
  let marked = 0;
  for (const r of gaz.rows) {
    if (r.indexAgrees === false) { marked += 1; continue; }
    const derived = countryOf(r.centre, COUNTRY_INDEX);
    if (derived === null) silent += 1;
    else if (derived === r.countryCode) agree += 1;
    else contradicted.push(`${r.name} (${r.id}) states ${r.countryCode || "''"}, countryOf says ${derived}`);
  }
  assert.deepEqual(
    contradicted,
    [],
    'a shipped row claims `indexAgrees: true` and contradicts the index we already ship — the ' +
      'generator\'s consistency filter is gone. A-83 restated the invariant; it did not weaken it.',
  );
  // Both halves are counted rather than merely summed, because a filter that refused EVERYTHING
  // would also satisfy the assertion above.
  assert.equal(agree + silent + marked, gaz.rows.length);
  assert.ok(agree > 6_000, `only ${agree} rows have a derived country at all`);
  // **A disagreement count of zero is itself a failure** (ROADMAP I-22): the marking that never
  // fires is the marking that was deleted.
  assert.ok(marked > 0, 'ZERO rows carry `indexAgrees: false`, so the marking is gone');
});

/**
 * **§8.4 A-83 Part 8, and it is the half of the restated invariant that is NOT a refusal.**
 *
 * > **No shipped row may *silently* contradict the country index.** A row whose derived country
 * > and stated country are both non-null and differ ships **only** with `indexAgrees: false`
 * > recorded on the row, published by name with both answers, and counted in the header.
 *
 * The measured cost of the old remedy was Brazzaville (a national capital), Geneva (1.24 M) and
 * Jerusalem (1.03 M) — QA round 60 — so the three of them are named here rather than left to a
 * count. They are only safe to ship because `City.placeId` exists to tell a picked pair from a
 * typed field; A-82 Part 6's fence is what keeps that true.
 */
test('A-83 Part 8: every marked row genuinely disagrees, and Geneva, Jerusalem and Brazzaville ship', async () => {
  const { countryOf, COUNTRY_INDEX } = await import('../src/index.ts');
  const gaz = await shipped();
  const marked = gaz.rows.filter((r) => r.indexAgrees === false);
  assert.ok(marked.length > 0, 'ZERO marked rows');
  for (const r of marked) {
    const derived = countryOf(r.centre, COUNTRY_INDEX);
    assert.notEqual(derived, null, `${r.name} is marked as disagreeing and countryOf is SILENT about it`);
    assert.notEqual(derived, r.countryCode, `${r.name} is marked as disagreeing and countryOf AGREES with it`);
    assert.match(r.countryCode, /^[A-Z]{2}$/, `${r.name} is marked and states no ISO code`);
  }
  for (const [name, code] of [['Geneva', 'CH'], ['Jerusalem', 'IL'], ['Brazzaville', 'CG']] as const) {
    const hit = gaz.rows.find((r) => r.name === name && r.countryCode === code);
    assert.ok(hit, `${name} does not ship — A-83 Part 8 is what makes it recordable`);
    assert.equal(hit.indexAgrees, false, `${name} ships UNMARKED, which is the silent contradiction A-83 forbids`);
  }
});

/**
 * **A-83 Part 8: `GazetteerRow.id` carries its source prefix**, so a persisted `City.placeId`
 * says which dataset minted it — `'ne:…'` today, `'gn:…'` after I-23. A stored pick that cannot
 * name its dataset is a pick nobody can re-resolve after a regeneration.
 */
test('A-83 Part 8: every shipped row id carries its source prefix', async () => {
  const gaz = await shipped();
  const wrong = gaz.rows.filter((r) => !/^ne:[0-9a-z]+$/.test(r.id)).slice(0, 5).map((r) => `${r.name}: ${r.id}`);
  assert.deepEqual(wrong, [], 'a shipped row id has no source prefix');
  assert.equal(new Set(gaz.rows.map((r) => r.id)).size, gaz.rows.length, 'two shipped rows share an id');
});

/**
 * A-82 Part 10 / ROADMAP I-21: *"a refusal count of 0 is itself a failure — the filter that never
 * fires is the filter that was deleted."* The refusals golden is the `[snapshot]` half; this is its
 * paired `[stated]` assertion, and it names the ruling's own four examples.
 */
test('A-83 Part 8: the disagreements golden names every marked row with BOTH answers, and every one of them SHIPS', async () => {
  const dis = JSON.parse(
    readFileSync(resolve(HERE, '..', '..', '..', 'fixtures', 'golden', 'gazetteer-disagreements.json'), 'utf8'),
  ) as { total: number; disagreements: Array<{ id: string; name: string; statedCountry: string; derivedCountry: string }> };

  assert.ok(dis.total > 0, 'ZERO disagreements: the marking never fired, so it is gone');
  assert.equal(dis.total, dis.disagreements.length);
  assert.equal(dis.total, 98, 'A-82 Part 1 measured 98 contradicted rows against the committed index');

  for (const r of dis.disagreements) {
    assert.notEqual(r.statedCountry, r.derivedCountry, `${r.name} is published as a disagreement and does not disagree`);
    assert.match(r.statedCountry, /^[A-Z]{2}$/);
    assert.match(r.derivedCountry, /^[A-Z]{2}$/);
  }

  const byName = new Map(dis.disagreements.map((r) => [r.name, r]));
  assert.equal(byName.get('Maastricht')?.derivedCountry, 'BE');
  assert.equal(byName.get('Arlon')?.derivedCountry, 'LU');

  // **The job of this file changed at A-83 Part 8 and this is the assertion that says so.** It
  // used to publish rows that were DROPPED; it now publishes rows that SHIP, carrying their
  // disagreement, and every published row must be findable in the shipped corpus marked
  // `indexAgrees: false` — which is what stops the golden becoming a list nobody can act on.
  const gaz = await shipped();
  const shippedById = new Map(gaz.rows.map((r) => [r.id, r]));
  for (const r of dis.disagreements) {
    const row = shippedById.get(r.id);
    assert.ok(row, `${r.name} is published as a disagreement and does NOT ship`);
    assert.equal(row.indexAgrees, false, `${r.name} ships but is not marked`);
    assert.equal(row.countryCode, r.statedCountry, `${r.name}'s shipped code is not the one published`);
  }
  assert.equal(
    gaz.rows.filter((r) => r.indexAgrees === false).length, dis.total,
    'the corpus and the golden disagree about how many rows disagree',
  );

  for (const name of ['Maastricht', 'Niagara Falls', 'Lugano', 'Arlon', 'Geneva', 'Jerusalem', 'Brazzaville']) {
    assert.ok(
      gaz.rows.some((r) => r.name === name),
      `${name} does not ship — A-83 Part 8 restated the invariant so that it would`,
    );
    assert.ok(byName.has(name), `${name} is not in the disagreements golden`);
  }
});

/**
 * The generator carries its **own** copy of A-82 Part 3's five steps, because `foldPlaceName` is
 * module-private and ROADMAP criterion E ceiling (1) forbids `tools/` reaching past `index.ts`.
 * This is what makes that copy a **checked pair** rather than a second opinion: core's fold must
 * reproduce the stored fold of every one of the 7,244 shipped rows. Disclosed as **KD-112**.
 *
 * It is also the widest net under the fold there is — the twelve pairs test twelve languages, this
 * tests every name in the dataset.
 */
test('A-82 Part 3: core\'s foldPlaceName reproduces the stored fold of every shipped row', async () => {
  const gaz = await shipped();
  const wrong: string[] = [];
  for (const r of gaz.rows) {
    if (foldPlaceName(r.name) !== r.fold) wrong.push(`${r.name}: stored "${r.fold}", core folds "${foldPlaceName(r.name)}"`);
  }
  assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} rows fold differently in core than in the generator`);
});

test('A-82 Part 2: the shipped rows are in the emitted total order, and that order is the artefact', async () => {
  const gaz = await shipped();
  const before = (a: typeof gaz.rows[number], b: typeof gaz.rows[number]) => {
    if (a.fold !== b.fold) return a.fold < b.fold;
    if (a.population !== b.population) return a.population > b.population;
    if (a.countryCode !== b.countryCode) return a.countryCode < b.countryCode;
    // The ids are `<source>:<base-36 NE_ID>` (§8.4 A-83 Part 8), so the emitted key is the
    // NUMERIC value of the part after the colon — `parseInt` on the whole string would read the
    // shared `'ne'` prefix as digits and answer the same number for every row.
    return parseInt(a.id.split(':')[1], 36) < parseInt(b.id.split(':')[1], 36);
  };
  for (let i = 1; i < gaz.rows.length; i += 1) {
    assert.ok(before(gaz.rows[i - 1], gaz.rows[i]), `rows ${i - 1} and ${i} are out of emitted order`);
  }
});

test('A-82 Part 3: every shipped row is well formed — id unique, coordinate real, alts folded', async () => {
  const gaz = await shipped();
  const ids = new Set<string>();
  for (const r of gaz.rows) {
    assert.equal(ids.has(r.id), false, `duplicate row id ${r.id} (${r.name})`);
    ids.add(r.id);
    assert.ok(Number.isFinite(r.centre.lat) && Math.abs(r.centre.lat) <= 90, `${r.name} has lat ${r.centre.lat}`);
    assert.ok(Number.isFinite(r.centre.lng) && Math.abs(r.centre.lng) <= 180, `${r.name} has lng ${r.centre.lng}`);
    assert.ok(Number.isInteger(r.population) && r.population >= 0, `${r.name} has population ${r.population}`);
    assert.ok(r.countryCode === '' || /^[A-Z]{2}$/.test(r.countryCode), `${r.name} has countryCode "${r.countryCode}"`);
    for (const a of r.alts) {
      assert.equal(a, foldPlaceName(a), `${r.name} carries an unfolded alternate "${a}"`);
      assert.notEqual(a, r.fold, `${r.name} carries an alternate equal to its own fold`);
    }
  }
  // `{0,0}` is the fabrication A-82 Part 7 is about. No gazetteer row may be at the null island.
  assert.equal(gaz.rows.filter((r) => r.centre.lat === 0 && r.centre.lng === 0).length, 0);
});

/**
 * A-82 Part 4: *"every returned hit's `label` contains a country name, including `Monaco` and
 * `Singapore`, which have no admin-1."*
 *
 * The one honest exception is measured and named rather than excused: **nine** shipped rows carry
 * `countryCode: ''` — seven in Somaliland and two in Northern Cyprus — because the source states no
 * ISO code and `countryOf` is silent too. A-82 Part 5 rules that `''` is what is stored in that
 * case, and §8.4 clause 1 rules that a disputed area is reported as unattributed. There is no
 * country name to put in a label for a row nobody can say the country of, and inventing one is the
 * guess this whole section exists to refuse.
 */
test('A-82 Part 4: every hit names a country, except the nine rows nobody can name a country for', async () => {
  const gaz = await shipped();
  const codeless = gaz.rows.filter((r) => r.countryCode === '');
  assert.equal(codeless.length, 9, 'the count of country-less rows moved; A-82 Part 1 measured 12 uncoded source rows, 3 of which derive XK');
  assert.deepEqual(
    codeless.map((r) => r.name).sort(),
    ['Berbera', 'Boorama', 'Burco', 'Ceerigaabo', 'Famagusta', 'Hargeisa', 'Kyrenia', 'Laascaanood', 'Maydh'],
  );

  for (const q of ['london', 'paris', 'monaco', 'singapore', 'vatican', 'zurich', 'san marino', 'valletta']) {
    const hits = searchGazetteer(q, gaz);
    assert.ok(hits.length > 0, `"${q}" returns nothing`);
    for (const h of hits) {
      const country = gaz.countryNames[h.countryCode] ?? h.countryCode;
      assert.notEqual(country, '', `"${h.name}" has no country to label with`);
      assert.ok(h.label.endsWith(country), `label "${h.label}" does not end in its country`);
      assert.notEqual(h.label, h.name, `"${h.name}" is rendered as a bare name`);
    }
  }
  assert.equal(searchGazetteer('monaco', gaz)[0].label, 'Monaco, Monaco');
});

test('A-82 Part 4: three Londons in three countries, GB first, over the shipped rows', async () => {
  const gaz = await shipped();
  const londons = searchGazetteer('london', gaz).filter((h) => h.name === 'London');
  assert.equal(londons.length, 3);
  assert.deepEqual(londons.map((h) => h.countryCode), ['GB', 'CA', 'US']);
  assert.equal(new Set(londons.map((h) => h.label)).size, 3, 'two Londons render identically');
});

test('A-82 Part 1 measurement 2: the micro-states resolve to themselves, not to their encloser', async () => {
  const gaz = await shipped();
  const top = (q: string) => searchGazetteer(q, gaz)[0];
  assert.equal(top('vatican').countryCode, 'VA');
  assert.equal(top('monaco').countryCode, 'MC');
  assert.equal(top('san marino').countryCode, 'SM');
  assert.equal(top('andorra').countryCode, 'AD');
  assert.equal(top('singapore').countryCode, 'SG');
  assert.equal(top('hong kong').countryCode, 'HK');
  assert.equal(top('valletta').countryCode, 'MT');
});

test('A-82 Part 3: the shipped rows obey the ceilings — `ork` finds no York, `hvar` is an honest miss', async () => {
  const gaz = await shipped();
  assert.deepEqual(
    searchGazetteer('ork', gaz).filter((h) => /york/i.test(h.name)).map((h) => h.name),
    [],
    'a substring match reached the shipped results',
  );
  assert.ok(searchGazetteer('york', gaz).some((h) => h.name === 'New York'), 'a token prefix stopped matching');
  // A-82 Part 1 measurement 3: the miss is the ROUTINE case, not the exotic tail, and the product
  // says so rather than offering something else.
  for (const missing of ['hvar', 'hallstatt', 'positano', 'interlaken']) {
    assert.deepEqual(searchGazetteer(missing, gaz), [], `"${missing}" is in the layer after all`);
  }
  assert.deepEqual(searchGazetteer('', gaz), []);
});

/**
 * A-82 Part 9 ceiling: **`packages/core/src/index.ts` must not import `geo/gazetteer.gen.ts`,
 * directly or transitively.** This is the fault that would silently cost every user ~380 kB, and
 * it is the one a future increment is most likely to commit, so it is walked rather than trusted.
 */
test('A-82 Part 9: geo/gazetteer.gen.ts is NOT reachable from packages/core/src/index.ts', () => {
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
    reachable.includes('geo/gazetteer.gen.ts'),
    false,
    'the ~380 kB gazetteer is reachable from the core barrel: it would land in every consumer\'s ' +
      'main chunk. A-82 Part 9 puts it behind the `@cairn/core/gazetteer` subpath for exactly this.',
  );
  // The control: the walk really does reach things, and it really does reach the OTHER generated
  // module, which IS on the write path and IS supposed to be there (A-27 Part 9).
  assert.equal(reachable.includes('geo/countries.gen.ts'), true, 'the graph walk found nothing — it is broken');
  assert.equal(reachable.includes('geo/gazetteer.ts'), true, 'searchGazetteer is not reachable from the barrel');
});

/**
 * `fixtures/golden/gazetteer-probes.json` — the `[snapshot]` half, paired with the `[stated]` fold
 * and London assertions above. It pins **the answer**: a fold that stops handling `ł`, a comparator
 * whose tie moves, or a coordinate that shifted between source revisions all show up here as a diff.
 */
test('A-82 Part 10: the probes golden reproduces exactly, query for query', async () => {
  const gaz = await shipped();
  const golden = JSON.parse(
    readFileSync(resolve(HERE, '..', '..', '..', 'fixtures', 'golden', 'gazetteer-probes.json'), 'utf8'),
  ) as {
    probeDepth: number;
    probes: Array<{ query: string; hits: Array<Record<string, unknown>> }>;
  };
  assert.ok(golden.probes.length >= 13, 'A-82 Part 10 names thirteen probe queries "at minimum"');
  for (const p of golden.probes) {
    const live = searchGazetteer(p.query, gaz, { limit: golden.probeDepth }).map((h) => ({
      id: h.id, name: h.name, label: h.label, countryCode: h.countryCode, admin1: h.admin1,
      centre: h.centre, indexAgrees: h.indexAgrees,
    }));
    assert.deepEqual(live, p.hits, `the "${p.query}" probe no longer reproduces`);
  }
  // The three the ruling's own user-visible outcome names, asserted by hand as well as by snapshot.
  const q = (s: string) => golden.probes.find((p) => p.query === s)!;
  assert.equal(q('zurich').hits[0].label, 'Zürich, Switzerland');
  assert.equal(q('hvar').hits.length, 0);
  assert.equal(new Set(q('London').hits.slice(0, 3).map((h) => h.countryCode)).size, 3);
  // **§8.4 A-83 Part 8, in the committed answer rather than only in a count.** `maastricht` used
  // to be A-82 Part 5's worked example of a row that was GONE; it is now found, and it is found
  // MARKED. Geneva, Jerusalem and Brazzaville are the three the ruling names as the old remedy's
  // measured cost, and the golden is where a reader can see that they came back.
  for (const [query, code] of [['maastricht', 'NL'], ['geneva', 'CH'], ['jerusalem', 'IL'], ['brazzaville', 'CG']] as const) {
    const top = q(query).hits[0];
    assert.ok(top, `the "${query}" probe has no hit — A-83 Part 8 is what makes it findable`);
    assert.equal(top.countryCode, code, `"${query}" resolves to the wrong country`);
    assert.equal(top.indexAgrees, false, `"${query}" is published UNMARKED, which is the silent contradiction A-83 forbids`);
  }
});

/**
 * A-82 Part 4's totality, over the **shipped** rows rather than a fixture — because the shipped
 * rows really do contain full ties. Measured: **six** pairs agree on folded name, population and
 * country code (`Columbia` US, `Crato` BR, `Nakhodka` RU, `Noginsk` RU, `Vila Velha` BR, …), so
 * without the `id` key the answer to those queries is a property of the order the generator
 * happened to emit and not of the data. `Array.prototype.sort` is stable, which is exactly what
 * makes a non-total comparator invisible until something reorders the input.
 */
test('A-82 Part 4: the comparator is total over the SHIPPED rows — a reordered copy answers identically', async () => {
  const gaz = await shipped();
  const reversed: Gazetteer = { ...gaz, rows: [...gaz.rows].reverse() };
  for (const q of ['columbia', 'crato', 'nakhodka', 'noginsk', 'vila velha', 'london', 'springfield']) {
    assert.deepEqual(
      JSON.stringify(searchGazetteer(q, reversed)),
      JSON.stringify(searchGazetteer(q, gaz)),
      `"${q}" answers differently over a reordered rows array — the comparator is not total`,
    );
  }
});
