/**
 * **The size budget for the generated country index — ROADMAP Phase 2 I-5's first test, and
 * deliberately the first file `node --test packages/core/test/*.test.ts` is handed.**
 *
 * The filename starts with `0-` for exactly one reason, and it is not tidiness: the glob the
 * `test`/`test:tap` scripts expand is alphabetical, so `0-` puts this file at the head of the
 * argv list. I-5's ship gate says *"`node --test` still runs `packages/core` directly (a
 * generated module that is megabytes of JSON in a `.ts` file breaks type stripping — the budget
 * test is the guard and it is the **first** test)"*.
 *
 * Two rules follow from that sentence and both are load-bearing here:
 *
 *  1. **This file never imports the generated module.** It reads the file's size off disk with
 *     `statSync`. A guard that has to load the thing it is guarding cannot report on a module
 *     too big to load — it just fails somewhere else, with a stripper error instead of a number.
 *  2. **The budget is a measurement, not a preference.** `EMITTED_BYTES` below is the number
 *     `tools/gen-countries.mjs` printed on its last run, copied from its output. It is not
 *     rounded to something comfortable, and it lives here rather than in any document, because
 *     ARCHITECTURE §8.4 says so in as many words: *"the builder measures, and the number goes in
 *     the test, not in this paragraph."*
 *
 * **When the scale changes, this number changes with it — and only in that direction.** §8.4:
 * *"Detection quality decides the dataset; the budget does not."* Moving the generator to another
 * Natural Earth scale means re-running it and pasting the new figure here, in the same commit.
 * What may never happen is the reverse: shaving the dataset to fit a number.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATED = resolve(HERE, '..', 'src', 'geo', 'countries.gen.ts');

/**
 * Bytes written by `node tools/gen-countries.mjs` at `--scale 110m`, as the generator reported
 * them. Re-run the generator to move it; do not guess it.
 *
 * **Moved at I-5a (§8.4 A-26), 175,085 → 346,455.** The index is now mixed-resolution: the 1:110m
 * base plus the 1:10m polygons of exactly the 64 ISO codes that layer does not carry. 239 codes,
 * 892 rings, 20,702 points. Roughly 2× the old budget and about 4 % of what a wholesale move to
 * 1:10m would have cost (9,072,727 bytes) — which is why this is a fill and not an escalation.
 */
const EMITTED_BYTES = 346_455;

/**
 * The ceiling the *budget itself* is measured against — the reason a budget exists at all.
 * Node's type stripping parses this file on every `node --test packages/core` run, and the
 * failure mode I-5 names is a module that is "megabytes of JSON in a `.ts` file". One MiB is
 * the line: it is far above what 1:110m needs and far below where a `.ts` file stops being a
 * reasonable thing to hand a parser. A scale that cannot fit under it is a scale that needs a
 * different representation, not a bigger number.
 */
const TYPE_STRIPPING_CEILING = 1_048_576;

test('I-5: the generated country index is within its measured size budget', () => {
  const bytes = statSync(GENERATED).size;
  assert.ok(
    bytes <= EMITTED_BYTES,
    `countries.gen.ts is ${bytes} bytes, budget ${EMITTED_BYTES}. If the scale moved, re-run ` +
      '`node tools/gen-countries.mjs` and paste its reported figure into EMITTED_BYTES.',
  );
});

test('I-5: the budget is itself under the type-stripping ceiling it exists to defend', () => {
  assert.ok(
    EMITTED_BYTES < TYPE_STRIPPING_CEILING,
    `the budget (${EMITTED_BYTES}) is above the ${TYPE_STRIPPING_CEILING}-byte ceiling; a module ` +
      'that large stops `node --test packages/core` running the .ts files directly',
  );
});

/**
 * The budget is only meaningful if the number is reproducible, which means the generated module
 * has to say what produced it and from which pinned ref. §8.4: a module fetched from a moving ref
 * is a measurement nobody can reproduce.
 */
test('I-5: the generated module declares its generator, source, pinned tag and checksum', () => {
  const head = readFileSync(GENERATED, 'utf8').slice(0, 4000);
  assert.match(head, /GENERATED FILE — DO NOT EDIT/, 'no generated-file marker');
  assert.match(head, /tools\/gen-countries\.mjs/, 'the generator is not named');
  assert.match(head, /nvkelso\/natural-earth-vector/, 'the source repository is not named');
  assert.match(head, /v5\.1\.2/, 'the pinned tag is not named');
  assert.match(head, /[0-9a-f]{64}/, 'the source checksum is not recorded');
});

/**
 * One structural guard on the *representation*, because it is what makes the byte figure and the
 * parse cost track each other. The payload is a single string literal — one token to the type
 * stripper — rather than a 10,000-element array literal, which is the same bytes and a very
 * different parse.
 */
test('I-5: the payload is one string literal, not an object literal the stripper must walk', () => {
  const src = readFileSync(GENERATED, 'utf8');
  const packed = /const PACKED =\n\s*'([\s\S]*?)';/.exec(src);
  assert.ok(packed, 'the generated module has no single PACKED string literal');
  // The payload is >99% of the file. What matters is that everything OUTSIDE it is ordinary,
  // small TypeScript: strip the one literal and what is left must be a few hundred bytes of
  // header and two statements, with no ring syntax in it.
  const outside = src.replace(packed[1], '');
  // 3,600 at I-5a, up from 3,000. Every byte of the increase is *comment*: the header now carries
  // two source checksums instead of one, the 64-code fill list, the reason the emission order is
  // ascending area, and a code list that went from 175 entries to 239. The two assertions below
  // are the ones that actually catch data leaking into syntax, and neither moves.
  assert.ok(
    outside.length < 3_600,
    `${outside.length} bytes of TypeScript outside the packed literal — data leaked into syntax`,
  );
  assert.equal(
    (outside.match(/\[/g) ?? []).length,
    0,
    "a '[' outside the packed string: the rings are being parsed as TS array literals",
  );
  assert.ok(
    packed[1].length / src.length > 0.98,
    'the packed literal is no longer the overwhelming majority of the file',
  );
});
