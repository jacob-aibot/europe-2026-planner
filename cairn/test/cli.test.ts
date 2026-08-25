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
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
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
