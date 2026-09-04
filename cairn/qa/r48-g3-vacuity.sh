#!/usr/bin/env bash
# QA round 48 — the vacuity control for the ONE line this round re-cut.
#
# A-67 **Part 7a** (revision 48) rules that `qa/r46-i13b.mjs` §D face 1 must stop asserting
# "exactly one stranded derivative pair" and start asserting "no bytes at all", and that the
# re-cut **carries a vacuity control**: the inverted line must be watched **red** against a build
# with `isLiveTrip(tripId)` restored at `importPhotos`' step-4 guard, which is ROADMAP **G3**'s own
# mutant. An assertion that a key set is empty passes trivially against a probe that never imported
# anything; this is what separates the two.
#
#   bash qa/r48-g3-vacuity.sh            (from cairn/)
#
# It builds a throwaway worktree at HEAD, applies the mutant there, runs §D of the CURRENT probe
# (the re-cut one, copied in from the working tree) and requires the re-cut line to FAIL.
# Nothing in the working tree is modified. Exit 0 = the control is sound.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$CAIRN/.." && pwd)"
WT="$(mktemp -d)/r48-g3"

cleanup() { git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$(dirname "$WT")"; }
trap cleanup EXIT

git -C "$ROOT" worktree add --detach "$WT" HEAD >/dev/null 2>&1 || { echo "could not create worktree"; exit 1; }
ln -s "$CAIRN/node_modules" "$WT/cairn/node_modules"

STORE="$WT/cairn/packages/client/src/store/store.ts"

# The mutant, exactly G3's: `isLiveTrip` back, and the step-4 generation check replaced by it, so
# the guard once again fires AFTER `ports.photo.write` rather than before it.
python3 - "$STORE" <<'PY'
import sys, re
p = sys.argv[1]
s = open(p).read()
live = """  function isLiveTrip(id: string): boolean {
    return state.activeTripId === id || state.library.some((r) => r.id === id);
  }

  /** `err.name` is the platform's own word for a full disk."""
s2 = s.replace("  /** `err.name` is the platform's own word for a full disk.", live, 1)
assert s2 != s, 'could not re-insert isLiveTrip'
# The step-4 guard is the FIRST of the two `guard.current('doc', g)` breaks — the one immediately
# before `const id = ports.ids.newId('photo');`.
old = "              if (!guard.current('doc', g)) break;\n              const id = ports.ids.newId('photo');"
new = "              const id = ports.ids.newId('photo');"
assert old in s2, 'could not find the step-4 guard'
s3 = s2.replace(old, new, 1)
# ...and re-armed after the write, where R46-1 put it.
oldw = """                await ports.photo.write(tripId, id, derived.thumb.bytes, derived.display.bytes);"""
neww = """                await ports.photo.write(tripId, id, derived.thumb.bytes, derived.display.bytes);
                if (!isLiveTrip(tripId)) break;"""
assert oldw in s3
s4 = s3.replace(oldw, neww, 1)
open(p, 'w').write(s4)
print('mutant applied: isLiveTrip(tripId) restored, step-4 generation check removed')
PY
[ $? -eq 0 ] || exit 1

# `break` inside the inner try/catch is not legal there, so the mutant instead re-checks after the
# write and before the dispatch — which is precisely where R46-1's step-4 guard sat.
cp "$CAIRN/qa/r46-i13b.mjs" "$WT/cairn/qa/r46-i13b.mjs"

OUT="$(cd "$WT/cairn" && node --experimental-strip-types qa/r46-i13b.mjs 2>&1)"
echo "$OUT" | grep -E 'FAIL  FINDING R46-1 \(re-cut' || true

if echo "$OUT" | grep -q 'FAIL  FINDING R46-1 (re-cut at round 48'; then
  echo
  echo "VACUITY CONTROL SOUND — the re-cut line is RED against G3's own mutant."
  exit 0
fi
echo
echo "VACUITY CONTROL FAILED — the re-cut line passed against the mutant, so it asserts nothing."
echo "$OUT" | grep -E 'FAIL|ALL OK' | head -20
exit 1
