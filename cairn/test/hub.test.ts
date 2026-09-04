/**
 * The status board's own guards.
 *
 * `cairn/docs/STATE.json` is the source of truth for "where is Cairn"; `tools/gen-hub.mjs`
 * renders it to `docs/HUB.html`. Both are cheap to update and therefore easy to update
 * *wrongly* — these are the properties that make the board trustworthy rather than merely
 * present.
 *
 * The reason this file exists at all: the board it replaces (`CAIRN_VISUAL_ROADMAP.md`) had
 * no guard of any kind, and `cairn/CLAUDE.md` says so outright — "nothing enforces that they
 * stay current automatically." Its step-2d cell "still read 'Not started' after three
 * increments had landed." A status board whose staleness is invisible is worse than none.
 *
 * What is NOT asserted here, deliberately: the *content* of the state (which round, which
 * verdict). That changes every pass and pinning it would make this file a second thing to
 * keep in sync — exactly the failure being fixed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GEN = resolve(ROOT, 'tools', 'gen-hub.mjs');
const state = JSON.parse(readFileSync(resolve(ROOT, 'docs', 'STATE.json'), 'utf8'));

const run = (...args: string[]) =>
  execFileSync('node', [GEN, ...args], { cwd: ROOT, encoding: 'utf8' });

test('STATE.json parses and carries the fields the renderer reads', () => {
  for (const key of ['updatedAt', 'commit', 'phases', 'now', 'rounds', 'decisions', 'owed', 'health', 'docs']) {
    assert.ok(key in state, `STATE.json is missing "${key}"`);
  }
  assert.match(state.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(state.commit, /^[0-9a-f]{7,40}$/);
});

test('every phase is numbered once, in order, and has a known state', () => {
  const ids = state.phases.map((p: any) => p.id);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b), 'phases are out of order');
  assert.equal(new Set(ids).size, ids.length, 'a phase id is repeated');
  for (const p of state.phases) {
    assert.ok(['shipped', 'in-progress', 'not-started'].includes(p.state), `phase ${p.id}: bad state "${p.state}"`);
  }
});

test('exactly one phase is in progress, and `now` points at it', () => {
  const active = state.phases.filter((p: any) => p.state === 'in-progress');
  assert.equal(active.length, 1, 'the board must name exactly one phase as current');
  assert.equal(active[0].id, state.now.phase, '`now.phase` disagrees with the phase marked in-progress');
  assert.ok(
    active[0].steps?.some((s: any) => s.id === state.now.step),
    `\`now.step\` (${state.now.step}) is not a step of phase ${state.now.phase}`
  );
});

/**
 * cairn/CLAUDE.md: keep "the same three-way distinction the doc already uses — built (code
 * exists) vs. verified (an adversarial round tried to break it) vs. shippable (a manager
 * verdict of SHIP) — rather than collapsing them into a single 'done'." The schema is where
 * that stops being a request.
 */
test('built / verified / shippable stay three separate facts, and cannot run ahead of each other', () => {
  for (const p of state.phases) {
    for (const s of p.steps ?? []) {
      for (const k of ['built', 'verified', 'shippable']) {
        assert.ok(k in s, `step ${s.id} is missing "${k}"`);
        assert.ok([true, false, 'partial'].includes(s[k]), `step ${s.id}.${k}: bad value ${JSON.stringify(s[k])}`);
      }
      if (s.verified === true) assert.notEqual(s.built, false, `step ${s.id} is verified but not built`);
      if (s.shippable === true) {
        assert.equal(s.verified, true, `step ${s.id} is shippable but not verified`);
        assert.equal(s.built, true, `step ${s.id} is shippable but not built`);
        assert.ok(s.verdict, `step ${s.id} is shippable with no manager verdict recorded`);
      }
    }
  }
});

test('a recorded verdict is SHIP or SEND BACK and names the commit it was made at', () => {
  const seen: any[] = [];
  for (const p of state.phases) {
    if (p.verdict) seen.push([`phase ${p.id}`, p.verdict]);
    for (const s of p.steps ?? []) if (s.verdict) seen.push([`step ${s.id}`, s.verdict]);
  }
  assert.ok(seen.length > 0, 'no verdicts recorded at all');
  for (const [who, v] of seen) {
    assert.ok(['SHIP', 'SEND BACK'].includes(v.value), `${who}: bad verdict "${v.value}"`);
    assert.match(v.at, /^[0-9a-f]{7,40}$/, `${who}: verdict has no commit`);
  }
});

test('rounds are consecutive, non-negative, and carry a verdict each', () => {
  const ns = state.rounds.map((r: any) => r.n);
  assert.deepEqual(ns, [...ns].sort((a: number, b: number) => a - b), 'rounds are out of order');
  for (let i = 1; i < ns.length; i++) {
    assert.equal(ns[i], ns[i - 1] + 1, `a round is missing between ${ns[i - 1]} and ${ns[i]}`);
  }
  for (const r of state.rounds) {
    assert.ok(['SHIP', 'SEND BACK'].includes(r.verdict), `round ${r.n}: bad verdict`);
    for (const k of ['blockers', 'major', 'minor']) {
      assert.ok(Number.isInteger(r[k]) && r[k] >= 0, `round ${r.n}.${k} is not a count`);
    }
  }
  assert.equal(ns.at(-1), state.now.round, '`now.round` is not the newest round in the history');
  assert.equal(
    state.rounds.at(-1).verdict, state.now.verdict,
    '`now.verdict` disagrees with the newest round'
  );
});

test('the current stage is one of the four pipeline agents', () => {
  assert.ok(['architect', 'builder', 'breaker', 'manager'].includes(state.now.stage));
});

test('a decision that blocks something says so, and every decision offers a choice', () => {
  for (const d of state.decisions) {
    assert.ok(d.question?.length > 10, `decision ${d.id} has no real question`);
    assert.ok(Array.isArray(d.options) && d.options.length >= 2, `decision ${d.id} offers no choice`);
    assert.ok(Array.isArray(d.blocking), `decision ${d.id} does not say what it blocks`);
  }
});

test('the generator is deterministic — the same state renders byte-identically', () => {
  const a = run();  // writes docs/HUB.html
  const first = readFileSync(resolve(ROOT, 'docs', 'HUB.html'), 'utf8');
  run();
  const second = readFileSync(resolve(ROOT, 'docs', 'HUB.html'), 'utf8');
  assert.equal(first, second, 'two runs over one state produced different bytes');
  assert.ok(a.includes('wrote'));
});

/**
 * The committed page must be a pure function of STATE.json.
 *
 * It briefly was not: the "N commits are not on master" count was rendered into the HTML, and
 * that number changes on EVERY commit — so the committed file was perpetually dirty, and a
 * regenerate-on-any-commit loop was the only way to keep it clean. A static page also cannot
 * re-check git at the moment someone opens it, so a live claim there is a claim that rots.
 * The live signal lives in `--check` and `--text`, which are run on demand.
 */
test('the page carries no live git state — only what STATE.json says', () => {
  const page = readFileSync(resolve(ROOT, 'docs', 'HUB.html'), 'utf8');
  assert.ok(page.includes(state.commit), 'the page does not name the commit it describes');
  assert.doesNotMatch(page, /commits? (are not on|behind)/, 'live git drift was rendered into the page');
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (head !== state.commit) {
    assert.ok(!page.includes(head), 'the live HEAD sha leaked into the committed page');
  }
});

test('the rendered page escapes state text rather than pasting it into the DOM', () => {
  const page = readFileSync(resolve(ROOT, 'docs', 'HUB.html'), 'utf8');
  // The state carries a literal double quote (the "accept" control decision); it must arrive escaped.
  assert.ok(page.includes('&quot;accept&quot;'), 'state text reached the page unescaped');
});

/**
 * The fragment is what gets published to a web host (which supplies its own document
 * skeleton). It is a SLICE of the same render, never a second copy — a fragment that lags the
 * page it came from would be exactly the drift this board exists to prevent.
 */
test('the publishable fragment carries no document wrapper', () => {
  const frag = readFileSync(resolve(ROOT, 'docs', 'HUB.fragment.html'), 'utf8');
  assert.match(frag.trimStart(), /^<title>/, 'the fragment should open with its title');
  for (const tag of [/<!doctype/i, /<html[\s>]/i, /<head>/i, /<body[\s>]/i]) {
    assert.doesNotMatch(frag, tag, `the fragment must not contain ${tag}`);
  }
});

test('the fragment and the standalone page render the same board', () => {
  const frag = readFileSync(resolve(ROOT, 'docs', 'HUB.fragment.html'), 'utf8').trimEnd();
  const page = readFileSync(resolve(ROOT, 'docs', 'HUB.html'), 'utf8');
  // Everything from <title> to the final </div> must appear in the page verbatim, modulo the
  // </head><body> seam the wrapper injects.
  const rejoined = frag.replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">');
  assert.ok(page.includes(rejoined), 'the fragment has drifted from the standalone page');
});

test('--text renders the whole board without a browser', () => {
  const out = run('--text');
  assert.match(out, /^CAIRN|STALE|NOT on master/m);
  assert.match(out, /NOW:/);
  assert.match(out, /NEXT:/);
  assert.match(out, new RegExp(`Phase ${state.now.phase} of ${state.phases.length}`));
  assert.ok(out.split('\n').length < 40, '--text should stay scannable in a terminal');
});

test('--check reports whether the board is current, and is silent about content', () => {
  try {
    const out = run('--check');
    assert.match(out, /current/i);
  } catch (err: any) {
    // A non-zero exit is the contract when the board is stale; it must say why.
    assert.match(String(err.stderr), /STALE/);
  }
});
