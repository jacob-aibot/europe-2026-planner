#!/usr/bin/env bash
# QA round 58 — the vacuity control for round 58's two re-cuts.
#
# `qa/r47-i13c.mjs` and `qa/r51-i13i.mjs` §H1 used to assert *the test count BUILD-NOTES §2
# publishes equals the count the command returns*. A-79 Part 9 DELETED that count, so both were
# asserting against a line that no longer exists. They are re-cut to the property that replaces it
# — **§2 publishes no test count at all** — and a line that asserts the absence of something is
# exactly the kind that passes for the wrong reason. So: plant a figure back on that line and both
# re-cuts must go RED, naming it.
#
# Usage:  bash qa/r58-recut-vacuity.sh          # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
BN=docs/BUILD-NOTES.md
# --- round 59 process fix (R59-5). This probe used to restore with `git checkout --`, which
# --- silently reverts ANY uncommitted work in the target files, not just this probe's own edits.
# --- It destroyed the I-19 builder's in-progress work once. It now snapshots the targets at
# --- startup and restores those exact bytes, so running it on a dirty tree is safe.
__R59_BACKUP=$(mktemp -d -t qa-restore.XXXXXX) || exit 1
__r59_snapshot() { for f in "$@"; do mkdir -p "$__R59_BACKUP/$(dirname "$f")"; cp "$f" "$__R59_BACKUP/$f"; done; }
__r59_restore()  { for f in "$@"; do cp "$__R59_BACKUP/$f" "$f"; done; }
__r59_snapshot "$BN"
restore() { __r59_restore "$BN"; }
trap 'restore; rm -rf "$__R59_BACKUP"' EXIT
restore

echo "== control A: on the shipped tree, both re-cuts are GREEN =="
node --experimental-strip-types qa/r47-i13c.mjs --fast 2>&1 | grep -E "publishes NO" | sed 's/^/   r47  /'

echo
echo "== control B: restore a figure to §2's npm test line — both must go RED =="
python3 - "$BN" <<'EOF'
import sys
p = sys.argv[1]; s = open(p).read()
s = s.replace("npm test          # Plain node, no browser, no network.",
              "npm test          # 1637 tests as of I-18. Plain node, no browser, no network.", 1)
open(p, 'w').write(s)
EOF
grep -n "npm test  " "$BN" | head -2 | sed 's/^/   planted: /'
node --experimental-strip-types qa/r47-i13c.mjs --fast 2>&1 | grep -E "publishes NO" | sed 's/^/   r47  /'
node - <<'EOF'
// r51's §H1 in isolation — the whole probe shells out to five sibling probes and takes minutes.
import('node:fs').then(({ readFileSync }) => {
  const bn = readFileSync('docs/BUILD-NOTES.md', 'utf8');
  const sec2 = bn.slice(bn.indexOf('## 2. How to run it'), bn.indexOf('## 3.'));
  const restored = (sec2.match(/^\s*npm (?:test|run test:tap)[^\n]*?#[^\n]*?\b(\d{3,})\s+tests?\b/m) ?? [])[1] ?? null;
  console.log(`   r51  H1 predicate: publishedInSection2=${restored} -> ${restored === null ? 'ok (GREEN)' : 'FAIL (RED)'}`);
});
EOF
restore
echo
echo "tree restored:"; git status --porcelain docs/BUILD-NOTES.md | sed 's/^/   /'
