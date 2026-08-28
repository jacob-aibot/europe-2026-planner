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
 *
 * **Moved at I-5b (§8.4 A-27), 346,455 → 374,826, +8.2 %.** 54 of those 64 filled codes now carry
 * a *second* entry: the same country's 1:50m rings, filtered to the ground that is uncontested.
 * 293 entries over 239 distinct ISO codes, 1,034 rings, 22,229 points; 369,688 bytes of that is
 * the packed literal. The forgiveness rings are the coarse, cheap ones — A-27 Part 3 measured the
 * alternatives at +19 % for a blanket second layer and 9.07 MB for a wholesale escalation.
 *
 * **Moved at I-5c (§8.4 A-28), 374,826 → 374,659 — downward, for the first time.** Filter 2 became
 * two arms and its second one, which compares a candidate against every other code at the pinned
 * family's *finest* scale rather than at whatever scale the mixed-resolution index draws it,
 * refuses `MO` the forgiveness ring that was claiming ~22.1 km² of Guangdong (QA R23-1). 53 codes
 * now carry a second entry, not 54: **292 entries over the same 239 distinct ISO codes, 1,033
 * rings, 22,220 points; 369,524 bytes of that is the packed literal.** One entry smaller, and the
 * one it lost was a wrong answer.
 */
const EMITTED_BYTES = 374_659;

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
 * Structural guards on the *representation*, because it is what makes the byte figure and the
 * parse cost track each other. The payload is a single string literal — one token to the type
 * stripper — rather than a 10,000-element array literal, which is the same bytes and a very
 * different parse.
 *
 * **Rewritten at I-5b for R22-4, and the finding was exactly right.** The old guard 1 asserted
 * *"bytes of TypeScript outside the packed literal < 3,600"* and blamed *"data leaked into
 * syntax"*. Neither half was true of what would trip it. Everything outside the literal is 87 %
 * generated **header comment**, and that comment is mostly ISO code lists that grow with the
 * dataset: I-5a raised the limit from 3,000 to 3,600 in the commit that tripped it and left 140
 * bytes of headroom, and A-27's forgiveness pass adds a 54-code list and a 10-code list on top.
 * A guard whose next failure will be caused by something its message does not name is a guard
 * that will be raised again rather than read.
 *
 * So the one number becomes three measurements of three different things, each with its own
 * failure message:
 *
 *  1. **The statements** — everything after the header comment — must stay small TypeScript.
 *     This is the one that means *"data leaked into syntax"*, and it is the one that does not
 *     move when the dataset grows.
 *  2. **The header comment, with its ISO code lists subtracted**, must stay bounded. Expressed
 *     this way it measures the *explanation*, which is written by a human and should not grow
 *     without one, while the code lists — which grow with the data, by design — are excluded
 *     rather than silently squeezing the allowance.
 *  3. **No `[` outside the literal**, unchanged, which is what actually catches rings arriving
 *     as TypeScript array literals whatever the byte counts say.
 *
 * The absolute bound on everything is still `EMITTED_BYTES`, and that has always worked.
 */
test('I-5: the payload is one string literal, not an object literal the stripper must walk', () => {
  const src = readFileSync(GENERATED, 'utf8');
  const packed = /const PACKED =\n\s*'([\s\S]*?)';/.exec(src);
  assert.ok(packed, 'the generated module has no single PACKED string literal');
  const outside = src.replace(packed[1], '');

  // The generated file is one leading block comment followed by the statements.
  const headerEnd = outside.indexOf('*/');
  assert.ok(headerEnd > 0, 'the generated module has no leading header comment');
  const header = outside.slice(0, headerEnd + 2);
  const statements = outside.slice(headerEnd + 2);

  // 1. Measured at I-5b: 579 bytes — two imports, the emptied `const PACKED`, one doc comment and
  //    the export. The limit is not a preference either: one country's rings written as a TS
  //    array literal is already more than this, so a leak cannot hide under it.
  assert.ok(
    statements.length < 1_500,
    `${statements.length} bytes of TypeScript after the generated header comment (was 579 when ` +
      'this limit was set) — ring data has leaked out of the packed string and into syntax the ' +
      'type stripper has to walk',
  );

  // 2. Measured at I-5b: 3,293 bytes of prose once the ISO code runs are removed. The runs are
  //    the fill list, the forgiveness list, the refusal list and the "codes, smallest first"
  //    list; together they are 1,247 bytes today and they are *supposed* to track the dataset.
  const CODE_RUNS = /\b[A-Z]{2}(?: [A-Z]{2})+\b/g;
  const prose = header.replace(CODE_RUNS, '');
  assert.ok(
    prose.length < 6_000,
    `${prose.length} bytes of prose in the generated header, excluding its ISO code lists (was ` +
      '3,293 when this limit was set). This is explanation text, not data: either the generator ' +
      'grew a paragraph that belongs in ARCHITECTURE.md, or something that is not an ISO code ' +
      'list is scaling with the dataset',
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
