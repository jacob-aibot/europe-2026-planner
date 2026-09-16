/**
 * **§8.4 A-91 item 3 — the CC BY 4.0 attribution the picker owes a user, held by the mechanism
 * rather than by the string.** ROADMAP Phase 2 `I-30`.
 *
 * GeoNames is CC BY 4.0 and this is the repository's first attribution obligation. The criterion
 * is `[rendered]` and it is three states — **at least one hit**, **a miss**, and **"keep
 * typing"** — so the instrument that actually satisfies it is a browser:
 * `qa/i30-attribution.mjs` **phase 1**, **phase 2** and **phase 3**, with the injected faults in
 * `qa/i30-faults.sh`. Node cannot render `apps/web`: `test/boundaries.test.ts` forbids importing
 * it from here, which is the boundary that keeps the live planner's data out of a bundle.
 *
 * **What this file holds is what a rendered check cannot hold: that the string on screen came
 * from the DATA, and that it will still be there after the next corpus re-pin.** A-91 names the
 * third injected fault as the one that matters — *hard-code the string instead of reading
 * `source`* passes every other assertion forever and goes stale at the next re-pin (A-90 clause
 * 3). Two properties, and each is one half of that fault:
 *
 *   1. **No fragment of the source string is written in the picker.** Comments stripped, so the
 *      docstring may say *GeoNames* and the code may not.
 *   2. **The one query the picker uses to learn `source` in the "keep typing" state still
 *      resolves, and its `source` is `meta.json`'s own `$source`.** Below two characters
 *      `loadGazetteerFor` returns `null` before it reads the meta document — `null` means *keep
 *      typing* and carries no attribution — so a picker with an empty input has nothing to
 *      render unless it asks a query that does resolve. `cli.ts` does exactly this and says why
 *      (`ATTRIBUTION_PROBE`, *"a query that is known to resolve stands in for the corpus that was
 *      not searched"*). If a re-pin ever makes that query stop resolving, **this test reddens**
 *      rather than the attribution silently disappearing from one of the three states.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const PICKER = resolve(CAIRN, 'apps/web/src/views/CitySelector.tsx');
const META = resolve(CAIRN, 'packages/core/src/geo/gazetteer/meta.json');
const LICENCE = 'https://creativecommons.org/licenses/by/4.0/';

/** Block and line comments removed, so a docstring's prose is not read as code. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const pickerSource = () => readFileSync(PICKER, 'utf8');
const metaSource = (): string => JSON.parse(readFileSync(META, 'utf8')).$source as string;

test('A-91 item 3: the picker writes no fragment of the attribution string in its code', () => {
  const code = stripComments(pickerSource());
  // Distinctive words of `meta.json`'s `$source`. Any of them in the CODE means the credit is
  // being spelled rather than read, which is A-91's third fault exactly.
  const spelled = ['GeoNames', 'geonames.org', 'alternateNamesV2', 'Natural Earth', 'admin1CodesASCII']
    .filter((w) => code.includes(w));
  assert.deepEqual(
    spelled,
    [],
    'CitySelector.tsx spells the attribution instead of reading `source` off the loaded ' +
      `gazetteer: ${spelled.join(', ')}. A hard-coded credit passes the rendered link and node ` +
      'assertions forever and goes stale at the next corpus re-pin (A-90 clause 3).',
  );
});

test('A-91 item 3: the picker carries the CC BY 4.0 licence URL, spelled exactly', () => {
  assert.ok(
    stripComments(pickerSource()).includes(LICENCE),
    `CitySelector.tsx does not name ${LICENCE}. The licence link is the half of the credit that ` +
      'is a URL rather than a string, and it is not readable off the corpus.',
  );
});

/**
 * The probe is a named export so this test reads the one the picker actually uses rather than a
 * copy of it. A copy would be a second source of truth for the thing this test exists to hold.
 */
test('A-91 item 3: the "keep typing" attribution probe still resolves, and carries meta.json\'s own $source', async () => {
  const code = stripComments(pickerSource());
  const declared = /ATTRIBUTION_PROBE\s*=\s*'([^']+)'/.exec(code);
  assert.ok(
    declared,
    'CitySelector.tsx declares no `ATTRIBUTION_PROBE`. Below two characters `loadGazetteerFor` ' +
      'returns null before it reads the meta document, so the "keep typing" state has no ' +
      'attribution unless the picker asks a query that resolves.',
  );
  const probe = declared[1];

  const { loadGazetteerFor } = await import('@cairn/core/gazetteer');
  const gazetteer = await loadGazetteerFor(probe);
  assert.ok(
    gazetteer !== null,
    `loadGazetteerFor(${JSON.stringify(probe)}) returns null, which means "keep typing" — so the ` +
      'picker learns no `source` and the attribution is absent from the state A-91 names third. ' +
      'Pick a query this corpus answers.',
  );
  assert.equal(
    gazetteer.source,
    metaSource(),
    'the probe resolves but its `source` is not meta.json\'s `$source`',
  );
  assert.ok(gazetteer.source.includes(LICENCE), 'the loaded `source` no longer carries the licence URL');
});

test('A-91 item 3: the rendered three-state criterion names its own instrument in the picker', () => {
  // A `[rendered]` criterion that no source file points at is a criterion nobody re-runs.
  // `test/qa-probes.test.ts` checks that the phases cited here are phases the probe runs.
  assert.match(
    pickerSource(),
    /qa\/i30-attribution\.mjs/,
    'CitySelector.tsx does not cite the rendered probe that holds A-91 item 3',
  );
});
