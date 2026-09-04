/**
 * Generates `cairn/docs/HUB.html` — the Cairn status board — from `cairn/docs/STATE.json`.
 *
 * Why this exists: `CAIRN_VISUAL_ROADMAP.md` was the status board, and it grew to 2,671 lines of
 * 320 append-only blocks with its actual status sections buried at line 2212. The archive ended up
 * on top of the status. This splits the two: STATE.json is small, structured and cheap to update
 * (~15 lines of JSON per pipeline verdict instead of ~500 words of prose in two files), and this
 * script renders it. The visual roadmap stays as the narrative archive.
 *
 * Zero dependencies (`cairn-constraints` §1). Deterministic: every date and sha comes from
 * STATE.json or from git, never from the clock — running this twice must produce a byte-identical
 * file, and `test/hub.test.ts` asserts it.
 *
 * Reads nothing at the repo root: the read-only boundary against the live planner is not touched.
 *
 *   node tools/gen-hub.mjs          # write docs/HUB.html + docs/HUB.fragment.html
 *   node tools/gen-hub.mjs --text   # print the same state to stdout, ~20 lines
 *   node tools/gen-hub.mjs --check  # exit 1 if the board is stale (for CI or a hook)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE = resolve(HERE, '..', 'docs', 'STATE.json');
const OUT = resolve(HERE, '..', 'docs', 'HUB.html');
const FRAGMENT = resolve(HERE, '..', 'docs', 'HUB.fragment.html'); // the publishable payload — no document wrapper

const state = JSON.parse(readFileSync(STATE, 'utf8'));

/* ---------- git: staleness and branch drift, both best-effort ---------- */

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: HERE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null; // no git, shallow clone, or no such ref — the board still renders
  }
}

const head = git('rev-parse', '--short', 'HEAD');
// Commits that touch ONLY the board's own files cannot invalidate the board — otherwise
// re-anchoring STATE.json would itself mark the board stale, forever, one commit at a time.
const BOARD_FILES = [
  ':(top,exclude)cairn/docs/STATE.json',
  ':(top,exclude)cairn/docs/HUB.html',
  ':(top,exclude)cairn/tools/gen-hub.mjs',
  ':(top,exclude)cairn/test/hub.test.ts',
];
const behind =
  head && head !== state.commit
    ? Number(git('rev-list', '--count', `${state.commit}..HEAD`, '--', ...BOARD_FILES)) || 0
    : 0;
const stale = behind > 0;
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const aheadOfMaster = Number(git('rev-list', '--count', 'master..HEAD')) || 0;
const offMaster = branch && branch !== 'master' && aheadOfMaster > 0;

/* ---------- shared derivations ---------- */

const phase = state.phases.find((p) => p.id === state.now.phase);
const steps = phase?.steps ?? [];
const STAGES = ['architect', 'builder', 'breaker', 'manager'];
const triad = (s) => [
  ['built', s.built],
  ['verified', s.verified],
  ['shippable', s.shippable],
];
const mark = (v) => (v === true ? '✅' : v === 'partial' ? '⚠️' : '❌');
const severity = (r) => r.blockers * 3 + r.major * 2 + r.minor;

/* ---------- the terminal view ---------- */

function text() {
  const L = [];
  if (stale) L.push(`!! STALE: board written at ${state.commit}, HEAD is ${head} (${behind} commit${behind === 1 ? '' : 's'} ahead). Update STATE.json and re-run.`);
  if (offMaster) L.push(`!! ${aheadOfMaster} commit${aheadOfMaster === 1 ? '' : 's'} on '${branch}' are NOT on master.`);
  if (L.length) L.push('');

  L.push(`CAIRN  ${state.updatedAt}  @ ${state.commit}`);
  L.push('');
  L.push(`Phase ${phase.id} of ${state.phases.length} - ${phase.name}`);
  L.push(state.phases.map((p) => (p.state === 'shipped' ? '#' : p.id === phase.id ? '>' : '.')).join(' '));
  L.push('');
  for (const s of steps) {
    const t = triad(s).map(([k, v]) => `${v === true ? '+' : v === 'partial' ? '~' : '-'}${k}`).join(' ');
    L.push(`  ${s.id}  ${s.name.padEnd(38)} ${t}`);
  }
  L.push('');
  L.push(`NOW: ${state.now.increment} (step ${state.now.step}) - round ${state.now.round} returned ${state.now.verdict}`);
  L.push(`     ${state.now.findings.blockers} blockers, ${state.now.findings.major} major, ${state.now.findings.minor} minor`);
  L.push(`     ${STAGES.map((s) => (s === state.now.stage ? `[${s}]` : s)).join(' -> ')}`);
  L.push(`     ${state.now.headline}`);
  L.push(`NEXT: ${state.now.next}`);
  if (state.decisions.length) {
    L.push('');
    L.push(`WAITING ON YOU (${state.decisions.length}):`);
    for (const d of state.decisions) L.push(`  - ${d.question}${d.blocking.length ? `  [blocks: ${d.blocking.join(', ')}]` : ''}`);
  }
  L.push('');
  L.push(`${state.health.tests} tests passing, typecheck ${state.health.typecheck}, at ${state.health.asOf}`);
  return L.join('\n');
}

/* ---------- the page ---------- */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function fragment() {
  const maxSeverity = Math.max(...state.rounds.map(severity), 1);

  // The page is a PURE FUNCTION OF STATE.json — no HEAD sha, no drift count, nothing that
  // moves with every commit. Baking live git state into a committed file makes the file
  // perpetually dirty (the master-drift count alone changes on every single commit) and makes
  // it lie the moment anyone opens it, since a static page cannot re-check git at view time.
  // The live signal belongs to `--check` and `--text`, which are run on demand.
  const banners = `<div class="banner anchor"><strong>This board describes <code>${esc(state.commit)}</code></strong>,
       written ${esc(state.updatedAt)}. It is only as current as its last update —
       run <code>node cairn/tools/gen-hub.mjs --check</code> to confirm, or
       <code>npm run hub</code> to rebuild it.</div>`;

  const stepper = state.phases
    .map((p) => {
      const cls = p.state === 'shipped' ? 'done' : p.state === 'in-progress' ? 'active' : 'todo';
      return `<li class="${cls}"><span class="pip">${p.state === 'shipped' ? '✓' : p.id}</span><span class="pname">${esc(p.name)}</span></li>`;
    })
    .join('\n');

  const stepRows = steps
    .map(
      (s) => `<tr class="${s.shippable === true ? 'shipped' : s.built ? 'partial' : 'idle'}">
      <th><code>${esc(s.id)}</code><br><span class="sname">${esc(s.name)}</span></th>
      <td class="triad">${triad(s).map(([k, v]) => `<span class="chip ${v === true ? 'y' : v === 'partial' ? 'p' : 'n'}">${mark(v)} ${k}</span>`).join(' ')}</td>
      <td class="note">${s.verdict ? `<span class="verdict ${s.verdict.value === 'SHIP' ? 'ship' : 'back'}">${esc(s.verdict.value)}</span> <code>${esc(s.verdict.at)}</code>${s.verdict.scope ? ` <em>(${esc(s.verdict.scope)})</em>` : ''} ` : ''}${s.note ? esc(s.note) : ''}</td>
    </tr>`
    )
    .join('\n');

  const pipeline = STAGES.map(
    (s) => `<li class="${s === state.now.stage ? 'on' : ''}">${s}</li>`
  ).join('<li class="arr">→</li>');

  const bars = state.rounds
    .map((r) => {
      const h = Math.round((severity(r) / maxSeverity) * 100);
      const title = `Round ${r.n} · ${r.increment} · ${r.verdict} · ${r.blockers}B ${r.major}M ${r.minor}m`;
      return `<li title="${esc(title)}"><span class="bar ${r.verdict === 'SHIP' ? 'ship' : 'back'}" style="height:${Math.max(h, 6)}%"></span><span class="rn">${r.n}</span></li>`;
    })
    .join('\n');

  const decisions = state.decisions
    .map(
      (d) => `<article class="decision">
      <h3>${esc(d.question)}</h3>
      <p>${esc(d.why)}</p>
      <ol>${d.options.map((o) => `<li>${esc(o)}</li>`).join('')}</ol>
      <p class="meta">${d.blocking.length ? `Blocks ${d.blocking.map(esc).join(' and ')}.` : 'Blocks nothing.'} Open since ${esc(d.since)}.</p>
    </article>`
    )
    .join('\n');

  const owed = state.owed.map((o) => `<li><strong>${esc(o.what)}</strong> <span class="meta">${esc(o.id)} — ${esc(o.note)}</span></li>`).join('\n');

  const docs = state.docs
    .map((d) => `<tr><th><code>${esc(d.file)}</code></th><td>${esc(d.size)}</td><td>${esc(d.read)}</td><td>${d.how ? `<code>${esc(d.how)}</code>` : '—'}</td></tr>`)
    .join('\n');

  return `<title>Cairn — where we are</title>
<style>
:root{
  --bg:#fbfaf8; --panel:#fff; --ink:#1a1a19; --dim:#6b6a66; --line:#e5e2dc;
  --ship:#1d7a4c; --back:#b3261e; --warn:#b0862a; --accent:#1f5f8b;
  --ship-bg:#eaf5ee; --back-bg:#fdecea; --warn-bg:#fdf6e7;
}
@media (prefers-color-scheme:dark){:root{
  --bg:#16161a; --panel:#1e1e23; --ink:#eceae6; --dim:#9d9b95; --line:#33323a;
  --ship:#5cc98c; --back:#ff8a80; --warn:#e0b455; --accent:#7fb5dd;
  --ship-bg:#17301f; --back-bg:#341b1a; --warn-bg:#332a15;
}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  -webkit-text-size-adjust:100%}
.wrap{max-width:56rem;margin:0 auto;padding:1.25rem 1rem 4rem}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86em;
  background:color-mix(in srgb,var(--ink) 7%,transparent);padding:.1em .35em;border-radius:4px}
h1{font-size:1.5rem;margin:.2rem 0 .1rem;letter-spacing:-.01em}
h2{font-size:.78rem;text-transform:uppercase;letter-spacing:.09em;color:var(--dim);
  margin:2.4rem 0 .7rem;font-weight:600}
h3{font-size:1rem;margin:0 0 .4rem}
.sub{color:var(--dim);font-size:.9rem;margin:0 0 1.4rem}
.banner{border-radius:9px;padding:.7rem .9rem;margin:.5rem 0;font-size:.9rem;border:1px solid}
.banner.bad{background:var(--back-bg);border-color:color-mix(in srgb,var(--back) 40%,transparent)}
.banner.ok{background:var(--ship-bg);border-color:color-mix(in srgb,var(--ship) 35%,transparent)}
.banner.anchor{background:var(--panel);border-color:var(--line);color:var(--dim)}
.banner.anchor code{color:var(--ink)}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:1rem 1.1rem}

/* phase stepper */
ol.stepper{list-style:none;display:flex;gap:.3rem;padding:0;margin:0;overflow-x:auto}
ol.stepper li{flex:1 1 0;min-width:5.4rem;text-align:center}
.pip{display:grid;place-items:center;width:1.85rem;height:1.85rem;margin:0 auto .4rem;
  border-radius:50%;border:2px solid var(--line);font-size:.82rem;font-weight:650;color:var(--dim)}
.stepper .done .pip{background:var(--ship);border-color:var(--ship);color:#fff}
.stepper .active .pip{border-color:var(--accent);color:var(--accent);
  box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 18%,transparent)}
.pname{display:block;font-size:.7rem;line-height:1.3;color:var(--dim)}
.stepper .active .pname{color:var(--ink);font-weight:600}

/* now */
.now{border-left:4px solid var(--warn);background:var(--warn-bg)}
.now .kicker{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--dim)}
.now h3{font-size:1.12rem;margin:.3rem 0 .5rem;line-height:1.35}
.counts{display:flex;gap:.45rem;flex-wrap:wrap;margin:.6rem 0}
.count{font-size:.8rem;padding:.16rem .55rem;border-radius:20px;border:1px solid var(--line);background:var(--panel)}
.count.b{color:var(--back);border-color:color-mix(in srgb,var(--back) 45%,transparent)}
ol.pipe{list-style:none;display:flex;gap:.45rem;padding:0;margin:.7rem 0 0;flex-wrap:wrap;
  font-size:.82rem;color:var(--dim)}
ol.pipe .on{color:var(--ink);font-weight:700;background:var(--panel);
  border:1px solid var(--accent);border-radius:20px;padding:.05rem .6rem}
ol.pipe .arr{opacity:.45}

/* steps table */
table{width:100%;border-collapse:collapse;font-size:.88rem}
th{text-align:left;font-weight:600;vertical-align:top}
td,th{padding:.6rem .5rem;border-top:1px solid var(--line)}
.sname{font-weight:400;color:var(--dim);font-size:.82rem}
.chip{display:inline-block;font-size:.74rem;padding:.1rem .45rem;border-radius:20px;
  border:1px solid var(--line);white-space:nowrap;margin:.1rem .1rem 0 0}
.chip.y{color:var(--ship)} .chip.p{color:var(--warn)} .chip.n{color:var(--dim);opacity:.75}
.verdict{font-weight:700;font-size:.76rem}
.verdict.ship{color:var(--ship)} .verdict.back{color:var(--back)}
.note{color:var(--dim);font-size:.83rem}
tr.shipped th code{color:var(--ship)}

/* rounds */
ol.rounds{list-style:none;display:flex;gap:.35rem;align-items:flex-end;padding:0;margin:0;
  height:6.5rem;overflow-x:auto}
ol.rounds li{flex:1 0 1.7rem;display:flex;flex-direction:column;justify-content:flex-end;
  align-items:center;height:100%}
.bar{width:100%;border-radius:3px 3px 0 0;min-height:4px}
.bar.ship{background:var(--ship)} .bar.back{background:var(--back);opacity:.85}
.rn{font-size:.62rem;color:var(--dim);margin-top:.25rem}
.legend{font-size:.78rem;color:var(--dim);margin:.6rem 0 0}

/* decisions */
.decision{border:1px solid color-mix(in srgb,var(--warn) 40%,transparent);background:var(--warn-bg);
  border-radius:10px;padding:.9rem 1rem;margin-bottom:.8rem}
.decision p{margin:.35rem 0;font-size:.89rem}
.decision ol{margin:.5rem 0 .3rem;padding-left:1.2rem;font-size:.87rem}
.decision li{margin:.15rem 0}
.meta{color:var(--dim);font-size:.8rem}
ul.owed{padding-left:1.1rem;font-size:.88rem} ul.owed li{margin:.3rem 0}
footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--line);
  color:var(--dim);font-size:.8rem}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
@media (max-width:36rem){
  .pname{display:none}
  ol.stepper li{min-width:0}
  /* the step table stops being a table: three tight columns at 390px is unreadable */
  table.steps,table.steps tbody,table.steps tr,table.steps th,table.steps td{display:block;width:auto}
  table.steps tr{border-top:1px solid var(--line);padding:.75rem 0}
  table.steps tr:first-child{border-top:0}
  table.steps th,table.steps td{border:0;padding:.15rem 0}
  table.steps .triad{margin:.35rem 0}
  table.docs{min-width:34rem}
}
</style>
<div class="wrap">

<h1>Cairn — where we are</h1>
<p class="sub">Generated from <code>cairn/docs/STATE.json</code> by <code>npm run hub</code>. Do not edit this file by hand.</p>

${banners}

<h2>The seven phases</h2>
<ol class="stepper">
${stepper}
</ol>

<h2>Right now</h2>
<div class="panel now">
  <div class="kicker">Phase ${phase.id} · step ${esc(state.now.step)} · increment ${esc(state.now.increment)} · QA round ${state.now.round}</div>
  <h3>${esc(state.now.headline)}</h3>
  <p>${esc(state.now.detail)}</p>
  <div class="counts">
    <span class="count ${state.now.findings.blockers ? 'b' : ''}">${state.now.findings.blockers} blockers</span>
    <span class="count">${state.now.findings.major} major</span>
    <span class="count">${state.now.findings.minor} minor</span>
    <span class="count b">round ${state.now.round}: ${esc(state.now.verdict)}</span>
  </div>
  <p><strong>Next:</strong> ${esc(state.now.next)}</p>
  ${state.now.nothingChangesOnYourPhone ? '<p class="meta">Nothing on your phone changes yet — there is no photo screen, which is why this is being fixed now rather than after one exists.</p>' : ''}
  <ol class="pipe">${pipeline}</ol>
</div>

<h2>Phase ${phase.id} — ${esc(phase.name)}</h2>
<div class="panel">
<table class="steps">
<tbody>
${stepRows}
</tbody>
</table>
</div>

<h2>Adversarial rounds — last ${state.rounds.length}</h2>
<div class="panel">
<ol class="rounds">
${bars}
</ol>
<p class="legend">Bar height is finding severity (blockers×3 + major×2 + minor). Green shipped, red sent back.
${state.roundsBefore.count} earlier rounds are not shown: ${esc(state.roundsBefore.note)}</p>
</div>

<h2>⚠️ Waiting on you — ${state.decisions.length}</h2>
${decisions}

<h2>Deliberately owed</h2>
<div class="panel"><ul class="owed">
${owed}
</ul></div>

<h2>Health</h2>
<div class="panel">
<p><strong>${state.health.tests}</strong> automated tests passing · typecheck <strong>${esc(state.health.typecheck)}</strong> · measured at <code>${esc(state.health.asOf)}</code></p>
<p class="meta">${esc(state.health.note)}</p>
</div>

<h2>Where to read more</h2>
<div class="panel scroll">
<table class="docs">
<thead><tr><th>Document</th><th>Size</th><th>Read</th><th>How</th></tr></thead>
<tbody>
${docs}
</tbody>
</table>
</div>

<footer>
State written ${esc(state.updatedAt)} against <code>${esc(state.commit)}</code>.
Terminal view: <code>node cairn/tools/gen-hub.mjs --text</code>.
</footer>

</div>
`;
}

/**
 * The standalone file, for `cairn/docs/HUB.html` — opened by double-clicking, with no server.
 * A publishing host supplies its own document skeleton, so `fragment()` is what gets published;
 * this is
 * the same body in a document wrapper, never a second copy of it.
 */
function html() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${fragment().trimEnd().replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">')}
</body>
</html>
`;
}

/* ---------- entry ---------- */

const argv = process.argv.slice(2);
if (argv.includes('--text')) {
  console.log(text());
} else if (argv.includes('--check')) {
  if (stale) {
    console.error(`STALE: STATE.json is ${behind} commit(s) behind HEAD (${state.commit} -> ${head}).`);
    process.exit(1);
  }
  console.log('Board is current.');
} else {
  // Both outputs, always — a fragment that lags the page it was sliced from is the drift
  // this whole board exists to prevent.
  writeFileSync(OUT, html());
  writeFileSync(FRAGMENT, fragment());
  console.log(`wrote ${OUT}\nwrote ${FRAGMENT}${stale ? `  (STALE: ${behind} commit(s) behind)` : ''}`);
}
