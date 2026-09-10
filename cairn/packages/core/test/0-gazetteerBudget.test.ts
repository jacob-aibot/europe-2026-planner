/**
 * **The size budget for the sharded city gazetteer — ROADMAP Phase 2 I-23, ARCHITECTURE §8.4
 * A-83 Part 5.** On `0-countryBudget.test.ts`'s model, including both of the rules that file
 * states, because both are load-bearing here for the same reasons:
 *
 *  1. **This file never imports what it guards.** It reads sizes off disk with `statSync`. A guard
 *     that has to load the thing it is guarding cannot report on a module too big to load — it
 *     just fails somewhere else, with a stripper error instead of a number.
 *  2. **Every budget is a measurement, not a preference.** The numbers below are what
 *     `tools/gen-gazetteer.mjs` printed on its last run, pasted. Not rounded, not chosen, and not
 *     in any document: §8.4's rule is *"the builder measures, and the number goes in the test, not
 *     in this paragraph."*
 *
 * **A-83 Part 5 moved the ceiling that matters and gave it two companions.** The 1,048,576-byte
 * type-stripping ceiling is a limit on `.ts` source handed to Node's type stripper by
 * `node --test packages/core`; **it does not bind a `.json` file, because a `.json` file is not
 * TypeScript**. That is what lets the corpus be 8.6 MB while the only generated `.ts` in the
 * family — the shard map — is 76 kB. The two ceilings that now do the work are the **96 KiB
 * per-shard budget**, which is what keeps a search cheap, and the **total** committed size.
 *
 * The `0-` prefix is the same mechanism as its sibling: the test glob expands alphabetically, so
 * both budget guards run before anything that could be slowed down by data that got too large.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEO = resolve(HERE, '..', 'src', 'geo');
const CORPUS = join(GEO, 'gazetteer');
const SHARD_MAP = join(GEO, 'gazetteerShards.gen.ts');

/**
 * Bytes written by `node tools/gen-gazetteer.mjs`, as the generator reported them on 2026-09-10:
 * **149,101 rows in 962 shard documents plus `meta.json`**, 3,665 admin-1 names, 239 country
 * names, 201,620 emitted rows at a duplication factor of 1.352.
 *
 * **8,761,994 → 8,749,255 at the QA round 67 repair.** Two causes, both measured: **QA R67-2** put
 * U+2018, U+2019 and U+0060 into the fold's substitution table, so 763 rows whose names GeoNames
 * spells with a typographic okina fold to **one** token instead of two and are written into one
 * shard instead of two (−400 emitted rows, −4 shard documents); and the two GeoNames dumps were re-pinned
 * on the same day, because they are regenerated daily and the previous day's bytes are no longer
 * served (+15 shipped rows). The duplication factor fell with the token count, which is the fold
 * fix showing up in the bytes.
 *
 * **434,212 → 8,761,994, and that is the increment, not drift.** The predecessor was 7,342 rows of
 * `ne_10m_populated_places` — a **cartographic** layer selected by administrative rank and
 * population, which QA round 60 measured at **21.5 %** of a 171-destination travel corpus. This is
 * GeoNames under A-83 Part 3's notability filter, and the bytes buy 20× the rows. **Nobody
 * downloads them**: A-83 Part 6 shards the corpus so a search fetches **one** document of ~20 kB
 * gzipped, against the predecessor's 197 kB chunk fetched in full the first time anyone typed a
 * letter. The per-session cost went *down* while coverage went up more than fourfold.
 *
 * Re-run the generator to move these numbers; do not guess them, and never shave the dataset to
 * fit one.
 */
const CORPUS_BYTES = 8_749_255;

/** A-83 Part 5 ceiling 1: **no single shard document may exceed 96 KiB raw.** */
const SHARD_BUDGET = 96 * 1024;

/**
 * The ceiling the generated **TypeScript** is measured against, and it is **the same 1,048,576
 * bytes** `0-countryBudget.test.ts` defends. Node's type stripping parses every `.ts` in this
 * package on a `node --test packages/core` run, and a module that is megabytes of data in a `.ts`
 * file breaks that. A-82 Part 1 measurement 4 is why this is not theoretical: GeoNames
 * `cities15000` packs to 1,705,329 bytes *before* alternate names, which is **over** it — and is
 * exactly why A-83 Part 5 changed the representation instead of raising the number.
 */
const TYPE_STRIPPING_CEILING = 1_048_576;

const documents = () =>
  readdirSync(CORPUS)
    .filter((n) => n.endsWith('.json'))
    .map((n) => ({ name: n, bytes: statSync(join(CORPUS, n)).size }));

test('I-23: the committed corpus is within its measured size budget', () => {
  const total = documents().reduce((n, d) => n + d.bytes, 0);
  assert.ok(
    total <= CORPUS_BYTES,
    `packages/core/src/geo/gazetteer/ is ${total} bytes, budget ${CORPUS_BYTES}. If the dataset ` +
      'moved, re-run `node tools/gen-gazetteer.mjs` and paste its reported total into CORPUS_BYTES.',
  );
});

test('I-23: no single shard document exceeds the 96 KiB budget that keeps a search cheap', () => {
  const over = documents().filter((d) => d.bytes > SHARD_BUDGET);
  assert.deepEqual(
    over.map((d) => `${d.name} is ${d.bytes} bytes`),
    [],
    'A-83 Part 6: the budget is the invariant and the shard width is whatever the budget requires. ' +
      'A shard over it is a search that fetches too much, and the generator is what splits it.',
  );
});

test('I-23: every generated .ts file in the family is under the type-stripping ceiling', () => {
  const generated = readdirSync(GEO).filter((n) => n.endsWith('.gen.ts'));
  assert.ok(generated.includes('gazetteerShards.gen.ts'), 'the shard map is not where it is guarded');
  for (const name of generated) {
    const bytes = statSync(join(GEO, name)).size;
    assert.ok(
      bytes < TYPE_STRIPPING_CEILING,
      `${name} is ${bytes} bytes, over the ${TYPE_STRIPPING_CEILING}-byte ceiling; a module that ` +
        'large stops `node --test packages/core` running the .ts files directly',
    );
  }
});

test('I-23: the budget is itself under the ceiling it exists to defend, for the .ts half', () => {
  assert.ok(
    statSync(SHARD_MAP).size < TYPE_STRIPPING_CEILING,
    'the shard map is over the type-stripping ceiling',
  );
  // And the corpus is deliberately far ABOVE it, which is the point of A-83 Part 5: JSON is not
  // TypeScript, so the ceiling that bound the old representation does not bind this one.
  assert.ok(CORPUS_BYTES > TYPE_STRIPPING_CEILING, 'the corpus would fit in a .ts module — check the dataset');
});

/**
 * The budget is only meaningful if the number is reproducible, which means the generated files
 * have to say what produced them and from which pinned bytes. **GeoNames has no release tag** —
 * the dumps are regenerated daily — so the pin is a **checksum plus a fetch date**, and that is
 * asserted here rather than left to a reader's assumption.
 *
 * **And the licence citation, which is new in this repository.** GeoNames is CC BY 4.0; Natural
 * Earth was public domain and needed none. A-83 Part 2: the attribution rides on the **data**, so
 * it is asserted in `meta.json` and not only in a comment.
 */
test('I-23: the generated shard map declares its generator, source, checksum and fetch date', () => {
  const head = readFileSync(SHARD_MAP, 'utf8').slice(0, 6000);
  assert.match(head, /GENERATED FILE — DO NOT EDIT/, 'no generated-file marker');
  assert.match(head, /tools\/gen-gazetteer\.mjs/, 'the generator is not named');
  assert.match(head, /GeoNames/, 'the source is not named');
  assert.match(head, /CC BY 4\.0/, 'the licence is not cited');
  assert.match(head, /[0-9a-f]{64}/, 'no source checksum is recorded');
  assert.match(head, /Fetched \d{4}-\d{2}-\d{2}/, 'the fetch date is not recorded');
  assert.match(head, /ne_10m_admin_0_countries v5\.1\.2/, 'the parent-translation source is not named');
  // **The census is provenance too** (A-84 Part 6). Zero differing rows would mean the marking is
  // gone, and a reader who cannot see the number will not go looking for the golden.
  const census = /(\d+) agree with countryOf · (\d+) differ/.exec(head);
  assert.ok(census, 'the indexSays census is not recorded in the header');
  assert.ok(Number(census[2]) > 0, 'the header records ZERO differing rows, so the marking is gone');
  assert.match(head, /gazetteer-disagreements\.json/, 'the header does not name the disagreements golden');
  assert.match(head, /gazetteer-parents\.json/, 'the header does not name the parents golden');
});

/**
 * `meta.json` carries the attribution as **data**, which is what makes the CC BY obligation
 * survive a consumer that never reads a comment. A-83 Part 2 clause 1: *"any surface that renders
 * a hit must render the attribution"*, and `Gazetteer.source` is this string.
 */
test('I-23: meta.json carries the CC BY 4.0 attribution as data, not as a comment', () => {
  const meta = JSON.parse(readFileSync(join(CORPUS, 'meta.json'), 'utf8')) as Record<string, unknown>;
  const source = String(meta.$source);
  assert.match(source, /GeoNames/);
  assert.match(source, /CC BY 4\.0/);
  assert.match(source, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(String(meta.$sourceSha256), /^[0-9a-f]{64}$/);
  assert.match(String(meta.$fetched), /^\d{4}-\d{2}-\d{2}$/);
});

/**
 * Structural guards on the *representation*. A shard document is one JSON object with one packed
 * string per row — not an array of objects, which is the same information at several times the
 * bytes and a very different parse. And every shard names itself and carries the corpus checksum,
 * which is what `loadGazetteer`'s skew refusal reads.
 */
test('I-23: a shard document is one packed row per string, and names itself', () => {
  const meta = JSON.parse(readFileSync(join(CORPUS, 'meta.json'), 'utf8')) as {
    $sourceSha256: string;
    files: Record<string, string>;
    shardCount: number;
    rows: number;
  };
  const names = readdirSync(CORPUS).filter((n) => n.endsWith('.json') && n !== 'meta.json');
  assert.equal(names.length, meta.shardCount, 'meta.json disagrees with the corpus about shard count');
  assert.equal(Object.keys(meta.files).length, meta.shardCount, 'the file manifest is a different size');

  let rows = 0;
  for (const name of names) {
    const doc = JSON.parse(readFileSync(join(CORPUS, name), 'utf8')) as {
      v: number; k: string; s: string; r: unknown[];
    };
    assert.equal(doc.v, 1, `${name} is not a v1 document`);
    assert.equal(typeof doc.k, 'string');
    assert.equal(doc.s, meta.$sourceSha256, `${name} carries a different $sourceSha256 from meta.json`);
    assert.equal(meta.files[doc.k], name, `${name} is not the file meta.json names for shard ${doc.k}`);
    for (const r of doc.r) assert.equal(typeof r, 'string', `${name} holds a row that is not a packed string`);
    rows += doc.r.length;
  }
  assert.ok(rows > meta.rows, 'fewer emitted rows than shipped rows — a row is missing from every shard');
});
