/**
 * `cli export` may not write outside `cairn/`.
 *
 * Sequencing rule 4 and `CLAUDE.md`: `europe-2026-itinerary.html`, `docs/` and `tickets/`
 * at the repo root are the live app on Jacob's phone. Cairn reads them and never writes
 * them. `cmdExport` used to be `writeFileSync(argv[1], text)` with no normalisation, so
 * `npm run cli -- export ../europe-2026-itinerary.html` overwrote the planner (F-16).
 *
 * This is an end-to-end test on purpose: it runs the real CLI in a child process, because
 * the property being protected is "this command cannot destroy that file", not "this
 * function returns false".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const REPO = resolve(CAIRN, '..');
const PLANNER = join(REPO, 'europe-2026-itinerary.html');

function cli(...args: string[]) {
  const r = spawnSync(process.execPath, [join(CAIRN, 'cli.ts'), ...args], {
    cwd: CAIRN,
    encoding: 'utf8',
    timeout: 120_000,
  });
  return { code: r.status, out: r.stdout ?? '', err: r.stderr ?? '' };
}

const ESCAPES = [
  '../europe-2026-itinerary.html',
  '../docs/BOOKINGS.md',
  '../tickets/anything.pdf',
  '/etc/passwd',
  '../../tmp/escape.json',
  'subdir/../../europe-2026-itinerary.html',
];

for (const target of ESCAPES) {
  test(`cli export refuses to write to ${target}`, () => {
    // Snapshot-and-restore: if this test ever fails it must not ALSO leave Jacob's live
    // planner destroyed. Restoring first, then asserting, is what makes the regression
    // loud instead of expensive. (It cost the file once while this test was being written.)
    const before = existsSync(PLANNER) ? readFileSync(PLANNER) : null;
    const r = cli('export', target);
    const after = existsSync(PLANNER) ? readFileSync(PLANNER) : null;
    let clobbered = false;
    if (before && after && !before.equals(after)) {
      writeFileSync(PLANNER, before);
      clobbered = true;
    }
    assert.equal(clobbered, false, 'THE LIVE PLANNER WAS MODIFIED (restored, but the guard is gone)');
    assert.notEqual(r.code, 0, `exit code was ${r.code}; the write was not refused`);
    assert.match(r.out + r.err, /refus|outside/i);
  });
}

test('cli export still writes a file inside cairn/', () => {
  const dir = mkdtempSync(join(CAIRN, 'export-test-'));
  try {
    const target = join(dir, 'trip.cairn.json');
    const r = cli('export', target);
    assert.equal(r.code, 0, r.err);
    assert.ok(existsSync(target), `nothing was written: ${r.out} ${r.err}`);
    assert.ok(statSync(target).size > 1000);
    assert.match(r.out, /wrote/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('cli export with no target still prints to stdout', () => {
  const r = cli('export');
  assert.match(r.out.slice(0, 60), /^\{\s*"schemaVersion": 1/);
});

test('the live planner is not writable through any cli command', () => {
  const before = readFileSync(PLANNER);
  for (const cmd of ['trip', 'conflicts', 'validate', 'import']) cli(cmd);
  assert.deepEqual(readFileSync(PLANNER), before);
});

// ---------------------------------------------------------------------------
// QA R2-5 — the guard was LEXICAL, and a symlink is not lexical.
// ---------------------------------------------------------------------------

test('cli export refuses a path that escapes cairn/ THROUGH A SYMLINK', () => {
  // `resolve()` normalises `..` and a leading `/`. It does not follow symlinks, so a link
  // planted inside `cairn/` passed the prefix test and `writeFileSync` then wrote through
  // it — the reviewer reproduced exactly this and the file outside `cairn/` was overwritten
  // with the trip JSON. `CLAUDE.md` calls the read-only boundary "the one rule that must
  // never drift"; a lexical guard on a symlinked path is drift waiting to happen.
  const outside = mkdtempSync(join(tmpdir(), 'cairn-escape-'));
  const victim = join(outside, 'victim.txt');
  writeFileSync(victim, 'DO NOT OVERWRITE ME');
  const link = join(CAIRN, 'qa', 'escape-link.json');
  rmSync(link, { force: true });
  symlinkSync(victim, link);
  try {
    const r = cli('export', 'qa/escape-link.json');
    assert.equal(readFileSync(victim, 'utf8'), 'DO NOT OVERWRITE ME',
      'THE FILE OUTSIDE cairn/ WAS OVERWRITTEN through a symlink');
    assert.notEqual(r.code, 0, `exit code was ${r.code}; the write was not refused`);
    // Specifically the BOUNDARY refusal, not the no-clobber one: the no-clobber guard added
    // in the same pass would also stop this write, and a test that cannot tell which guard
    // fired would keep passing with the symlink hole open.
    assert.match(r.out + r.err, /refusing to write outside/i,
      'refused, but for the wrong reason — the boundary guard is not what stopped it');
  } finally {
    rmSync(link, { force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('cli export refuses a path whose PARENT DIRECTORY is a symlink out of cairn/', () => {
  const outside = mkdtempSync(join(tmpdir(), 'cairn-escape-dir-'));
  const link = join(CAIRN, 'qa', 'escape-dir');
  rmSync(link, { force: true });
  symlinkSync(outside, link);
  try {
    const r = cli('export', 'qa/escape-dir/trip.json');
    assert.equal(existsSync(join(outside, 'trip.json')), false,
      'the CLI wrote into a directory outside cairn/ reached through a symlinked parent');
    assert.notEqual(r.code, 0, `exit code was ${r.code}`);
  } finally {
    rmSync(link, { force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// QA R2-5, second half — `export <existing file>` overwrote it silently, exit 0.
// ---------------------------------------------------------------------------

test('cli export refuses to clobber an existing file, and says so', () => {
  const dir = mkdtempSync(join(CAIRN, 'export-test-'));
  try {
    const target = join(dir, 'trip.cairn.json');
    writeFileSync(target, 'SOMETHING THE USER ALREADY HAD');
    const r = cli('export', target);
    assert.equal(readFileSync(target, 'utf8'), 'SOMETHING THE USER ALREADY HAD',
      'an existing file was overwritten with no prompt');
    assert.notEqual(r.code, 0, `exit code was ${r.code}; a silent clobber must not report success`);
    assert.match(r.out + r.err, /exists/i, 'the refusal does not say why');
    assert.match(r.out + r.err, /--force/, 'the refusal does not name the way through');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('cli export --force overwrites deliberately', () => {
  const dir = mkdtempSync(join(CAIRN, 'export-test-'));
  try {
    const target = join(dir, 'trip.cairn.json');
    writeFileSync(target, 'STALE');
    const r = cli('export', target, '--force');
    assert.equal(r.code, 0, r.err);
    assert.match(readFileSync(target, 'utf8').slice(0, 40), /^\{\s*"schemaVersion": 1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--force still cannot write outside cairn/, through a symlink or otherwise', () => {
  const outside = mkdtempSync(join(tmpdir(), 'cairn-force-'));
  const victim = join(outside, 'victim.txt');
  writeFileSync(victim, 'SAFE');
  const link = join(CAIRN, 'qa', 'escape-link.json');
  rmSync(link, { force: true });
  symlinkSync(victim, link);
  try {
    for (const target of ['qa/escape-link.json', '../europe-2026-itinerary.html']) {
      const r = cli('export', target, '--force');
      assert.notEqual(r.code, 0, `--force wrote to ${target}`);
    }
    assert.equal(readFileSync(victim, 'utf8'), 'SAFE');
  } finally {
    rmSync(link, { force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
