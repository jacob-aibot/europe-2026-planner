#!/usr/bin/env bash
# QA round 58 — R57-6's second half, measured as a DELTA rather than as a description.
#
# BUILD-NOTES' I-18 addendum says: *"an async door that mutates **in a continuation after its first
# `await`** now produces **one named failing row** — `not ok 66 … returnToPool: Cannot add property
# 0, object is not extensible`, file exit 1 — **instead of an unhandled rejection taking the file
# down**."*  The phrase after "instead of" is round 57's own detached-continuation symptom
# (QA-FINDINGS round 57, KD-107 row). So there are two cases, not one, and this script runs both at
# `77ef3ba` (I-18) and at `9b4d358` (the commit before it) in a throwaway worktree:
#
#   case A — the door mutates AFTER an `await`, so the promise the runner awaits REJECTS
#   case B — the door mutates in a DETACHED continuation (`void Promise.resolve().then(...)`),
#            which nothing awaits — round 57's case verbatim
#
# Usage:  bash qa/r58-async.sh          # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
ROOT=$(git rev-parse --show-toplevel)
WT=/tmp/r58-wt-$$
T=packages/core/src/conflict/resolve.ts

# --- round 59 process fix (R59-5). `measure` was called with "$ROOT/cairn" — the LIVE tree, not
# --- only the throwaway worktree — and restored with `git checkout --`, which silently reverts any
# --- uncommitted work in `$T`, not just this probe's own edits. It now restores byte-exact bytes
# --- snapshotted at startup, so running it on a dirty tree is safe.
__R59_BACKUP=$(mktemp -d -t qa-restore.XXXXXX) || exit 1
cp "$ROOT/cairn/$T" "$__R59_BACKUP/live"
__r59_restore() {  # $1 = tree root (a cairn/ dir)
  if [ "$1" = "$ROOT/cairn" ]; then cp "$__R59_BACKUP/live" "$1/$T";
  else (cd "$1" && git checkout -- "$T" 2>/dev/null); fi
}
trap 'cp "$__R59_BACKUP/live" "$ROOT/cairn/$T"; rm -rf "$__R59_BACKUP"' EXIT

inject() {  # $1 = tree root (a cairn/ dir), $2 = extra statement
  python3 - "$1/$T" "$2" <<'PY'
import sys
p, extra = sys.argv[1], sys.argv[2]
s = open(p).read()
old = "export function reassertRetirements(trip: Trip, retired: ReadonlyMap<ConflictId, IsoDate>): Trip {"
new = "export async function reassertRetirements(trip: Trip, retired: ReadonlyMap<ConflictId, IsoDate>): Promise<Trip> {"
assert old in s, "anchor not found"
open(p, "w").write(s.replace(old, new + "\n  " + extra))
PY
}

measure() {  # $1 = label, $2 = tree root, $3 = extra statement
  __r59_restore "$2"
  inject "$2" "$3"
  local out; out=$(cd "$2" && node --test packages/core/test/storable.test.ts 2>&1)
  __r59_restore "$2"
  local named; named=$(printf '%s' "$out" | grep -cE "^not ok .*reassertRetirements")
  local filedown; filedown=$(printf '%s' "$out" | grep -cE "^not ok .*storable\.test\.ts$")
  local unhandled; unhandled=$(printf '%s' "$out" | grep -c "unhandledRejection")
  printf '  %-42s named-row=%s file-level-not-ok=%s unhandledRejection=%s  %s / %s\n' \
    "$1" "$named" "$filedown" "$unhandled" \
    "$(printf '%s' "$out" | grep -m1 '^# pass')" "$(printf '%s' "$out" | grep -m1 '^# fail')"
}

echo "== r58 §F — R57-6's second half, at I-18 and at the commit before it =="
echo "   (named-row=1 is the mechanism naming the door; file-level-not-ok=1 is the file going down)"
echo
echo "at HEAD ($(git rev-parse --short HEAD)):"
measure "A  mutates after an await" "$ROOT/cairn" 'await Promise.resolve();
  (trip as unknown as {days: {title: string}[]}).days[0].title = "x";'
measure "B  mutates in a DETACHED continuation" "$ROOT/cairn" 'void Promise.resolve().then(() => { (trip as unknown as {days: {title: string}[]}).days[0].title = "x"; });'

git worktree add -f --detach "$WT" 9b4d358 >/dev/null 2>&1 || { echo "could not create worktree"; exit 1; }
echo
echo "at 9b4d358 (the commit BEFORE I-18):"
measure "A  mutates after an await" "$WT/cairn" 'await Promise.resolve();
  (trip as unknown as {days: {title: string}[]}).days[0].title = "x";'
measure "B  mutates in a DETACHED continuation" "$WT/cairn" 'void Promise.resolve().then(() => { (trip as unknown as {days: {title: string}[]}).days[0].title = "x"; });'
git worktree remove --force "$WT" >/dev/null 2>&1

echo
echo "read: case A names the door at BOTH commits (the pre-I-18 runner already awaited a thenable"
echo "      inside its try and its assertion message already carried \`\${row.door}\`), and case B —"
echo "      round 57's own case — is UNCHANGED: the file still goes down on an unhandledRejection."
git status --porcelain packages/core/src | sed 's/^/   /'
