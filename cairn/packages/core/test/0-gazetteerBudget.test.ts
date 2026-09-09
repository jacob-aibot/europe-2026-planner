/**
 * **The size budget for the generated city gazetteer — ROADMAP Phase 2 I-21, ARCHITECTURE §8.4
 * A-82 Part 9 clause 3.** On `0-countryBudget.test.ts`'s model, including both of the rules that
 * file states, because both are load-bearing here for the same reasons:
 *
 *  1. **This file never imports the module it guards.** It reads the size off disk with
 *     `statSync`. A guard that has to load the thing it is guarding cannot report on a module too
 *     big to load — it just fails somewhere else, with a stripper error instead of a number.
 *  2. **The budget is a measurement, not a preference.** `EMITTED_BYTES` below is the number
 *     `tools/gen-gazetteer.mjs` printed on its last run, pasted. Not rounded, not chosen, and not
 *     in any document: §8.4's rule is *"the builder measures, and the number goes in the test, not
 *     in this paragraph."*
 *
 * The `0-` prefix is the same mechanism as its sibling: the test glob expands alphabetically, so
 * both budget guards run before anything that could be slowed down by a module that got too large.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATED = resolve(HERE, '..', 'src', 'geo', 'gazetteer.gen.ts');

/**
 * Bytes written by `node tools/gen-gazetteer.mjs`, as the generator reported them on 2026-09-09:
 * **7,244 rows shipped, 98 refused**, 2,500 admin-1 names, 223 country names.
 *
 * **A-82 Part 9 records the architect's prototype at 306,531 bytes and this measurement is above
 * it, by 85,225.** The difference is one deliberate representation choice, stated here so it is not
 * mistaken for drift: **each row carries its own fold**, rather than the decoder recomputing it
 * from the name. That buys the property `gazetteer.test.ts` calls *"core's `foldPlaceName`
 * reproduces the stored fold of every shipped row"* — the generator must hold a second copy of
 * A-82 Part 3's algorithm (`foldPlaceName` is module-private and ceiling (1) forbids `tools/`
 * reaching past `index.ts`), and storing the output turns those two copies into a **checked pair**
 * over 7,244 real names instead of two implementations nobody compares. A-82 Part 9 says of its own
 * figure: *"That is an estimate and the budget is not it."*
 *
 * Re-run the generator to move this number; do not guess it, and never shave the dataset to fit it.
 */
const EMITTED_BYTES = 391_756;

/**
 * The ceiling the *budget itself* is measured against, and it is **the same 1,048,576 bytes**
 * `0-countryBudget.test.ts` defends — A-82 Part 9 clause 3 says so by name. Node's type stripping
 * parses this file on every `node --test packages/core` run that reaches the gazetteer, and a
 * module that is megabytes of data in a `.ts` file breaks that. A dataset that cannot fit under it
 * is a dataset that needs a different representation — a fetched asset rather than a `.ts` module —
 * and that is an architect's ruling, not a builder's. A-82 Part 1 measurement 4 is the live example:
 * GeoNames `cities15000` packs to 1,705,329 bytes *before* alternate names.
 */
const TYPE_STRIPPING_CEILING = 1_048_576;

test('I-21: the generated gazetteer is within its measured size budget', () => {
  const bytes = statSync(GENERATED).size;
  assert.ok(
    bytes <= EMITTED_BYTES,
    `gazetteer.gen.ts is ${bytes} bytes, budget ${EMITTED_BYTES}. If the dataset moved, re-run ` +
      '`node tools/gen-gazetteer.mjs` and paste its reported figure into EMITTED_BYTES.',
  );
});

test('I-21: the budget is itself under the type-stripping ceiling it exists to defend', () => {
  assert.ok(
    EMITTED_BYTES < TYPE_STRIPPING_CEILING,
    `the budget (${EMITTED_BYTES}) is above the ${TYPE_STRIPPING_CEILING}-byte ceiling; a module ` +
      'that large stops `node --test packages/core` running the .ts files directly',
  );
});

/**
 * The budget is only meaningful if the number is reproducible, which means the generated module has
 * to say what produced it and from which pinned ref. §8.4: a module fetched from a moving ref is a
 * measurement nobody can reproduce.
 */
test('I-21: the generated module declares its generator, source, pinned tag and checksum', () => {
  const head = readFileSync(GENERATED, 'utf8').slice(0, 4000);
  assert.match(head, /GENERATED FILE — DO NOT EDIT/, 'no generated-file marker');
  assert.match(head, /tools\/gen-gazetteer\.mjs/, 'the generator is not named');
  assert.match(head, /nvkelso\/natural-earth-vector/, 'the source repository is not named');
  assert.match(head, /v5\.1\.2/, 'the pinned tag is not named');
  assert.match(head, /ne_10m_populated_places\.geojson/, 'the source layer is not named');
  assert.match(head, /[0-9a-f]{64}/, 'the source checksum is not recorded');
  // The refusal count is provenance too: it is the one number in this artefact that says a
  // deliberate hole was cut, and a reader who cannot see it will not go looking for the golden.
  assert.match(head, /Refused: \d+/, 'the refusal count is not recorded in the header');
});

/**
 * Structural guards on the *representation*, because it is what makes the byte figure and the parse
 * cost track each other. The payload is a single template literal — one token to the type stripper
 * — rather than a 7,000-element array literal, which is the same bytes and a very different parse.
 *
 * It is newline-separated, one row per line, which its sibling's payload is not: A-82 Part 10 wants
 * a regeneration diff to be *"one row changing on one key"* rather than a wall of reordered text,
 * and `NE_ID` is carried as `GazetteerRow.id` precisely so that diff is readable.
 */
test('I-21: the payload is one template literal, not an array literal the stripper must walk', () => {
  const src = readFileSync(GENERATED, 'utf8');
  const packed = /const PACKED = `([\s\S]*)`;\n/.exec(src);
  assert.ok(packed, 'the generated module has no single PACKED template literal');
  const outside = src.replace(packed[1], '');

  const headerEnd = outside.indexOf('*/');
  assert.ok(headerEnd > 0, 'the generated module has no leading header comment');
  const statements = outside.slice(headerEnd + 2);

  // Two imports, the emptied `const PACKED`, one doc comment and the export. One row written as a
  // TypeScript object literal is already more than this, so a leak cannot hide under it.
  assert.ok(
    statements.length < 1_500,
    `${statements.length} bytes of TypeScript after the generated header comment — row data has ` +
      'leaked out of the packed literal and into syntax the type stripper has to walk',
  );
  assert.equal(
    (outside.match(/\[/g) ?? []).length,
    0,
    "a '[' outside the packed literal: the rows are being parsed as TS array literals",
  );
  assert.ok(
    packed[1].length / src.length > 0.98,
    'the packed literal is no longer the overwhelming majority of the file',
  );
  // One row per line, and the count is the header's own declared row count plus its two
  // dictionaries — the property that makes the diff readable, asserted rather than hoped for.
  const lines = packed[1].split('\n');
  const [nAdmin1, nCountries, nRows] = lines[0].split('|').map(Number);
  assert.equal(lines.length, 1 + nAdmin1 + nCountries + nRows, 'the payload is not one row per line');
  assert.ok(nRows > 7_000, `${nRows} rows: the dataset shrank rather than the file`);
});
