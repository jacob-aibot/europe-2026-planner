/**
 * Round 2, attack 6 — the cairn-constraints rules that are directly testable, plus
 * behavioural determinism across processes.
 * Run: node qa/r2-constraints.mjs   (from cairn/)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
const CAIRN = resolve(import.meta.dirname, '..');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');
const walk = (d) => (!existsSync(d) ? [] : readdirSync(d).flatMap((n) => {
  const f = resolve(d, n);
  return statSync(f).isDirectory() ? walk(f) : /\.(ts|tsx|mts|mjs)$/.test(f) ? [f] : [];
}));
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

line('constraint 5 — packages/client touches no DOM (globals, not just imports)');
const domGlobals = [/\bdocument\s*\./, /\bwindow\s*\./, /\blocalStorage\b/, /\bsessionStorage\b/, /\bindexedDB\b/, /\bnavigator\s*\./, /\balert\s*\(/, /\bReact\b/];
let domHits = [];
for (const f of walk(resolve(CAIRN, 'packages/client/src'))) {
  const src = strip(readFileSync(f, 'utf8'));
  for (const re of domGlobals) if (re.test(src)) domHits.push(`${relative(CAIRN, f)}: ${re}`);
}
ok('no DOM globals in packages/client', domHits.length === 0, domHits.join(', '));

line('constraint 4 — determinism: the REDUCER is named in the rule; is it covered by the test?');
const bTest = readFileSync(resolve(CAIRN, 'test/boundaries.test.ts'), 'utf8');
const detBlock = bTest.slice(bTest.indexOf('core is deterministic'), bTest.indexOf('every rollUpCost'));
ok('the determinism grep walks packages/client too', /packages\/client/.test(detBlock),
  'it walks packages/core/src only — the reducer, which the constraint names, is not covered');
const ambient = [];
for (const f of walk(resolve(CAIRN, 'packages/client/src'))) {
  const src = strip(readFileSync(f, 'utf8'));
  for (const [re, l] of [[/\bDate\.now\s*\(/, 'Date.now'], [/\bMath\.random\s*\(/, 'Math.random'], [/\brandomUUID\s*\(/, 'randomUUID'], [/\bnew Date\s*\(\s*\)/, 'new Date()']]) {
    if (re.test(src)) ambient.push(`${relative(CAIRN, f)}: ${l}`);
  }
}
ok('no ambient clock/randomness in packages/client today', ambient.length === 0, ambient.join(', '));

line('behavioural determinism — two separate processes, byte-identical output');
const probe = `
const core = await import('${CAIRN}/packages/core/src/index.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('${CAIRN}/fixtures/loadEurope2026.mjs');
const { trip } = loadEurope2026();
const c = core.detectConflicts(trip, { today: FIXTURE_TODAY });
const v = core.validateTrip(trip);
const g = core.geoCheck(trip);
process.stdout.write(JSON.stringify([core.toJSON(trip).length, c.map(x=>x.id), v.map(i=>i.code), g.length]));
`;
const runs = [0, 1].map(() => execFileSync(process.execPath, ['--input-type=module', '-e', probe], { encoding: 'utf8' }));
ok('two processes agree exactly', runs[0] === runs[1]);
const cliRuns = [0, 1].map(() => execFileSync(process.execPath, ['cli.ts', 'conflicts'], { cwd: CAIRN, encoding: 'utf8' }));
ok('two CLI runs agree exactly', cliRuns[0] === cliRuns[1]);
const genGolden = () => execFileSync(process.execPath, ['tools/gen-sample.mjs'], { cwd: CAIRN, encoding: 'utf8' });
genGolden();
const s1 = readFileSync(resolve(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8');
genGolden();
const s2 = readFileSync(resolve(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8');
ok('gen-sample is byte-stable', s1 === s2);

line('constraint 2 — zero runtime deps declared');
for (const p of ['packages/core', 'packages/client', 'packages/tokens']) {
  const pkg = JSON.parse(readFileSync(resolve(CAIRN, p, 'package.json'), 'utf8'));
  ok(`${p} has no dependencies`, !pkg.dependencies || Object.keys(pkg.dependencies).length === 0, JSON.stringify(pkg.dependencies));
}

line('§2.10 export surface — the gap the builder enumerated (KD-19)');
const core = await import('../packages/core/src/index.ts');
const runtime = Object.keys(core).filter((k) => typeof core[k] !== 'undefined');
console.log(`  runtime exports: ${runtime.length}`);
const surfaceSrc = readFileSync(resolve(CAIRN, 'packages/core/test/surface.test.ts'), 'utf8');
const listed = (surfaceSrc.match(/'[A-Za-z_][A-Za-z0-9_]*'/g) || []).length;
console.log(`  surface.test.ts mentions ~${listed} quoted symbols across its two lists`);
console.log('  §2.10 names 50; the test asserts §2.10 ⊆ exports and enumerates the rest');

line('logging discipline — coordinates and mailbox content in output structures');
const conflicts = (await import('../packages/core/src/index.ts')).detectConflicts;
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
const { trip } = loadEurope2026();
const cs = conflicts(trip, { today: FIXTURE_TODAY });
const coordRe = /-?\d{1,3}\.\d{3,}/;
const cHits = cs.filter((c) => coordRe.test(JSON.stringify(c.params)));
ok('no coordinate-shaped floats in Conflict.params', cHits.length === 0, JSON.stringify(cHits.slice(0, 2)));
const issues = (await import('../packages/core/src/index.ts')).validateTrip(trip);
const iHits = issues.filter((i) => coordRe.test(JSON.stringify(i.params)));
ok('no coordinate-shaped floats in Issue.params', iHits.length === 0,
  `${iHits.length} issues carry raw lat/lng: ` + JSON.stringify(iHits.slice(0, 2).map((i) => [i.code, i.params])));
const golden = resolve(CAIRN, 'fixtures/golden');
for (const f of readdirSync(golden)) {
  const text = readFileSync(resolve(golden, f), 'utf8');
  const isIssues = /issue|validate/i.test(f) || /"code"/.test(text);
  if (/"params"/.test(text)) {
    const params = [...text.matchAll(/"params":\s*\{[^}]*\}/g)].map((m) => m[0]).filter((s) => coordRe.test(s));
    console.log(`  ${f}: ${params.length} params blocks with a coordinate-shaped float`, params.slice(0, 1));
  }
}
