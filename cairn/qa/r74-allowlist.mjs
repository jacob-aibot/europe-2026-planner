/**
 * **QA round 74 — how wide is A-91 item 2's allowlist predicate, really?**
 *
 *   node qa/r74-allowlist.mjs        (from cairn/)
 *
 * `qa/i30-faults.sh`'s N4 adds one import of `loadGazetteerFor` to a non-allowlisted module and
 * shows `test/boundaries.test.ts` redden. That establishes the predicate fires on the shape the
 * fault uses. This asks the complementary question A-92 Part 3 says a mechanism must answer in
 * public: **which ways of reaching the corpus does it NOT see?** Each row plants one reach into
 * `apps/web/src/format.ts` (not on the list, and imported by four modules that are also not on
 * it), runs the boundaries test, and records whether it reddened.
 *
 * A row that is NOT caught is not automatically a defect — it is the width of the claim, stated.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const TARGET = resolve(CAIRN, 'apps/web/src/format.ts');
const BACKUP = `${TARGET}.r74.bak`;
const Q = String.fromCharCode(39);

const ROWS = [
  ['N4 as shipped — a named import of the door',
   `import { loadGazetteerFor } from ${Q}@cairn/core/gazetteer${Q};\nvoid loadGazetteerFor;\n`, 'red'],
  ['a namespace import of the subpath',
   `import * as gz from ${Q}@cairn/core/gazetteer${Q};\nvoid gz;\n`, 'red'],
  ['a dynamic import whose specifier is CONCATENATED',
   `export const reach = async () => (await import(${Q}@cairn/core${Q} + ${Q}/gazetteer${Q})).loadGazetteerFor;\n`, 'red'],
  ['a dynamic import, concatenated, door reached by computed key',
   `const k = ${Q}loadGazetteerFor${Q};\nexport const reach2 = async () => (await import(${Q}@cairn/core${Q} + ${Q}/gaz${Q} + ${Q}etteer${Q}))[k];\n`, 'red'],
  ['a SHARD document imported directly, bypassing both doors',
   `import shard from ${Q}../../../packages/core/src/geo/gazetteer/ge.json${Q} with { type: ${Q}json${Q} };\nvoid shard;\n`, 'red'],
  ['meta.json imported directly — the credit string without the loader',
   `import meta from ${Q}../../../packages/core/src/geo/gazetteer/meta.json${Q} with { type: ${Q}json${Q} };\nexport const credit = meta.$source;\n`, 'red'],
  ['a control: no reach at all',
   '', 'green'],
];

copyFileSync(TARGET, BACKUP);
const pristine = readFileSync(TARGET, 'utf8');
let uncaught = 0;
try {
  for (const [label, planted, expect] of ROWS) {
    writeFileSync(TARGET, planted + pristine);
    let code = 0;
    let out = '';
    try {
      out = execFileSync('node', ['--test', 'test/boundaries.test.ts'], { cwd: CAIRN, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { code = e.status ?? 1; out = `${e.stdout ?? ''}${e.stderr ?? ''}`; }
    const named = /apps\/web\/src\/format\.ts/.test(out);
    const got = code === 0 ? 'green' : 'red';
    const good = got === expect;
    if (!good) uncaught++;
    console.log(`  ${good ? 'ok  ' : 'FAIL'} ${label}\n         boundaries test: ${got} (expected ${expect})${got === 'red' ? `; names format.ts: ${named}` : ''}`);
  }
} finally {
  copyFileSync(BACKUP, TARGET);
  rmSync(BACKUP);
}
console.log(`\n${uncaught === 0 ? 'r74-allowlist: every planted reach behaved as expected' : `r74-allowlist: ${uncaught} row(s) did not`}`);
process.exit(uncaught === 0 ? 0 : 1);
