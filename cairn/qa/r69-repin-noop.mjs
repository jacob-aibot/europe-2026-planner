/**
 * QA round 69 §G — **`--repin` with nothing moved still calls `writeSourceLog`.**
 *
 * `tools/gen-gazetteer.mjs` prints *"--repin: no source moved — this run is an ordinary
 * regeneration"* and then runs `if (repin) writeSourceLog(...)` anyway, with an empty `moved`.
 * The function resets `$what` to its literal and re-serialises the whole log. This asks whether
 * that rewrite is byte-identical to the committed file — i.e. whether a re-pin that appends
 * nothing is genuinely a no-op on the artefact of record, or a silent golden edit.
 *
 *   node qa/r69-repin-noop.mjs [tree]     # default: the live tree
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TREE = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(resolve(TREE, 'fixtures/golden/gazetteer-source-log.json'), 'utf8');
const gen = readFileSync(resolve(TREE, 'tools/gen-gazetteer.mjs'), 'utf8');
const m = gen.match(/log\.\$what =\r?\n([\s\S]*?);\r?\n\r?\n {2}const last/);
if (m === null) {
  console.log('  note G1 could not lift the $what literal from the generator — SKIPPED');
  process.exit(0);
}
// eslint-disable-next-line no-new-func
const what = new Function(`return (${m[1].trim()});`)();
const log = JSON.parse(raw);
log.$what = what;
const rewritten = `${JSON.stringify(log, null, 2)}\n`;
if (rewritten === raw) {
  console.log('  ok   G1  a --repin with nothing moved rewrites the log byte-identically (a true no-op)');
  process.exit(0);
}
console.log(`  FAIL G1  a --repin with nothing moved rewrites the committed log: ${raw.length} -> ${rewritten.length} bytes`);
process.exit(1);
