/**
 * QA round 75 — **the whole `qa/` board, walked and run.**
 *
 *   node qa/r75-board.mjs            run every headless probe
 *   node qa/r75-board.mjs --list     classify only, run nothing
 *
 * ROADMAP's carried-forward obligation is *"the breaker runs the WHOLE board at each step
 * boundary, not only the probes in the round's scope"*, and the manager's I-30 verdict found that
 * obligation nineteen rounds unhonoured on the one probe that is the phase gate. There has never
 * been a runner: every previous whole-board pass was done by hand, which is why the gaps between
 * them are measured in rounds. This is the runner.
 *
 * Three classes, decided by reading each file rather than by a list:
 *   RUN      — plain Node, no server, no browser, does not write to the checkout
 *   BROWSER  — names playwright/chromium, or needs a dev server or a built `dist`
 *   MUTATES  — writes to tracked files (even if it restores them); never run unattended here
 *
 * A probe is RED if it exits non-zero. Many `qa/` probes are round-specific evidence and are
 * *expected* red — each round's note in `QA-FINDINGS.md` says which. This runner reports the
 * state; it does not adjudicate it.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const LIST_ONLY = process.argv.includes('--list');
const ONLY = process.argv.filter((a) => !a.startsWith('--')).slice(2);

const BROWSERY = /playwright|chromium|puppeteer|npm run serve|web:build|apps\/web\/dist|--port 5\d\d\d|vite --port/i;
const MUTATING = /\bfs\.writeFileSync\(|writeFileSync\(\s*(?:resolve|join|`|')|git checkout --|worktree add|cp "\$TMP\/orig/;
const SELF = 'r75-board.mjs';

const files = readdirSync(HERE)
  .filter((f) => /\.(mjs|sh)$/.test(f) && f !== SELF)
  .filter((f) => statSync(resolve(HERE, f)).isFile())
  .sort();

const classed = files.map((f) => {
  const src = readFileSync(resolve(HERE, f), 'utf8');
  let cls = 'RUN';
  if (BROWSERY.test(src)) cls = 'BROWSER';
  else if (MUTATING.test(src)) cls = 'MUTATES';
  return { f, cls };
});

const census = classed.reduce((a, c) => ((a[c.cls] = (a[c.cls] ?? 0) + 1), a), {});
console.log(`board: ${files.length} files — ${JSON.stringify(census)}`);
if (LIST_ONLY) {
  for (const { f, cls } of classed) console.log(`${cls.padEnd(8)} ${f}`);
  process.exit(0);
}

const results = [];
for (const { f, cls } of classed) {
  if (ONLY.length && !ONLY.includes(f)) continue;
  if (cls !== 'RUN') { results.push({ f, cls, code: null, note: 'not run here' }); continue; }
  const t0 = Date.now();
  let code = 0;
  let out = '';
  try {
    out = f.endsWith('.sh')
      ? execFileSync('bash', [resolve(HERE, f)], { cwd: CAIRN, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
      : execFileSync('node', ['--experimental-strip-types', resolve(HERE, f)], { cwd: CAIRN, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    code = e.status ?? (e.killed ? 124 : 1);
    out = String(e.stdout ?? '') + String(e.stderr ?? '');
  }
  const ms = Date.now() - t0;
  const fails = (out.match(/^\s*FAIL\b/gm) ?? []).length;
  const complete = /\bCOMPLETE\b|ALL CLEAR|all phases green|every fault fired|^=== /m.test(out);
  const crashed = /^(?:[A-Za-z]*Error|Uncaught|node:internal)/m.test(out.split('\n').slice(-25).join('\n'));
  results.push({ f, cls, code, fails, complete, crashed, ms, tail: out.split('\n').filter(Boolean).slice(-2).join(' | ').slice(0, 180) });
  console.log(`${code === 0 ? 'ok  ' : 'RED '} ${f.padEnd(28)} exit=${String(code).padEnd(4)} FAIL=${String(fails).padEnd(4)} ${crashed ? 'CRASHED ' : ''}${ms}ms`);
}

const ran = results.filter((r) => r.code !== null);
const red = ran.filter((r) => r.code !== 0);
const crashed = ran.filter((r) => r.crashed);
console.log(`\nBOARD COMPLETE  walked=${files.length} ran=${ran.length} green=${ran.length - red.length} red=${red.length} crashed=${crashed.length} notRun=${results.length - ran.length}`);
if (red.length) console.log('RED:\n  ' + red.map((r) => `${r.f} exit=${r.code} FAIL=${r.fails}${r.crashed ? ' CRASHED' : ''} — ${r.tail}`).join('\n  '));
