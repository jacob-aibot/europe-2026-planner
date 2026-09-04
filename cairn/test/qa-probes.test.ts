/**
 * The `qa/` probes as **evidence**, checked mechanically.
 *
 * A shipped source file may cite a probe as the measurement behind a platform claim — the way
 * `apps/web/src/ports/storage.ts` cites `qa/i7a-idb-rowkeys.mjs` for A-62's key ordering — and a
 * citation nothing checks rots the moment a phase is renumbered. Two properties, both of which
 * were false at `70b9ee6` (QA round 46, **R46-5** and **R46-7**):
 *
 *   1. **Every probe phase a shipped source cites exists.** The port pointed at a *phase 5* the
 *      probe does not run, for the one claim A-62 Part 5 marks as a search result rather than a
 *      measurement.
 *   2. **Every probe is text a reviewer can read in a diff.** A single literal NUL byte makes git
 *      classify a file as binary and print `Bin 0 -> 17304 bytes` instead of its diff, which is
 *      how the increment's own ship-gate probe became the one unreviewable file in a 36-file
 *      commit. `\u0000` inside a template is the identical value with a reviewable diff.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const QA = resolve(CAIRN, 'qa');

/** Files that may cite a probe phase as their evidence. Sources, not documents. */
const CITING = ['apps/web/src/ports/storage.ts'];

/**
 * `qa/x.mjs phase 4`, `` `qa/x.mjs` **phase 4** `` — the shapes a source uses to cite a
 * measurement. Deliberately tolerant of the markdown these docstrings are written in: a citation
 * this pattern misses is a citation nothing checks, which is the defect itself.
 */
const CITATION = /qa\/([\w.-]+\.mjs)`?\s+\*{0,2}phase\s+(\d+)/gi;

/** The phases a probe actually runs, from its own `head('phase N…')` calls. */
function phasesOf(probe: string): number[] {
  return [...probe.matchAll(/^head\(`?phase (\d+)/gm)].map((m) => Number(m[1]));
}

test('R46-5: every qa probe phase a shipped source cites as its evidence exists', () => {
  let citations = 0;
  for (const rel of CITING) {
    const src = readFileSync(resolve(CAIRN, rel), 'utf8');
    for (const [, probeName, phase] of src.matchAll(CITATION)) {
      citations++;
      const phases = phasesOf(readFileSync(resolve(QA, probeName), 'utf8'));
      assert.ok(phases.includes(Number(phase)),
        `${rel} cites qa/${probeName} phase ${phase} as a measurement; that probe runs phases ${phases.join(', ')}`);
    }
  }
  assert.ok(citations > 0, 'INCONCLUSIVE: no source cites a probe phase, so this test measured nothing');
});

test('R46-5: a probe does not describe a phase it does not run', () => {
  for (const name of readdirSync(QA).filter((n) => n.endsWith('.mjs'))) {
    const probe = readFileSync(resolve(QA, name), 'utf8');
    const phases = phasesOf(probe);
    if (phases.length === 0) continue;
    for (const [, described] of probe.matchAll(/\bPhase (\d+) asserts\b/g)) {
      assert.ok(phases.includes(Number(described)),
        `qa/${name} says "Phase ${described} asserts …" and runs phases ${phases.join(', ')}`);
    }
  }
});

test('R46-7: no qa probe holds a literal NUL byte, so git can diff every one of them', () => {
  const binary = readdirSync(QA)
    .filter((n) => /\.(mjs|js|ts|sh)$/.test(n))
    .filter((n) => readFileSync(resolve(QA, n)).includes(0));
  assert.deepEqual(binary, [],
    'git classifies these as binary and prints `Bin 0 -> N bytes` instead of a diff a reviewer can read');
});
