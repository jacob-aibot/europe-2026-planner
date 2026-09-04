#!/usr/bin/env bash
# QA round 51 — the PRE-EXISTENCE control for R51-4, and R51-2's own before/after.
#
#   bash qa/r51-controls.sh                 (from cairn/)
#
# A finding filed against an increment has to say whether that increment caused it.
#
#   C1  `qa/r51-i13i.mjs` §G at **`8d69ff1`** — revision 52's ruling commit, i.e. the last commit
#       before the I-13i build. If R51-4's stranded fraction is identical there, A-71 Part 4d's
#       `finally` did not introduce it; what A-71 did was make *"the fraction settles on EVERY
#       exit"* a **stated property**, which is why the one exit it does not cover is now a finding
#       rather than an unremarked behaviour.
#   C2  the same section at HEAD, printed beside it.
#   C3  §B at `8d69ff1`, for R51-2 — the false-positive brand cannot exist before the brand does,
#       so this control is expected to be INAPPLICABLE and says so rather than printing a pass.
#
# Nothing in the working tree is modified.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$CAIRN/.." && pwd)"
TMP="$(mktemp -d)"
BEFORE="${R51_BEFORE:-8d69ff1}"

cleanup() { git -C "$ROOT" worktree remove --force "$TMP/before" >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

git -C "$ROOT" worktree add --detach "$TMP/before" "$BEFORE" >/dev/null 2>&1 || { echo "could not create worktree"; exit 1; }
ln -s "$CAIRN/node_modules" "$TMP/before/cairn/node_modules"
cp "$CAIRN/qa/r51-i13i.mjs" "$TMP/before/cairn/qa/r51-i13i.mjs"

echo "== C1 — \`qa/r51-i13i.mjs\` §G at $BEFORE (revision 52 ruled, I-13i not yet built) =="
( cd "$TMP/before/cairn" && R51_ONLY=G node --experimental-strip-types qa/r51-i13i.mjs ) 2>&1 \
  | grep -E '^  (ok|FAIL) +(R51-4|G3|G4)' | sed 's/^/  /'

echo
echo "== C2 — the same section at HEAD =="
( cd "$CAIRN" && R51_ONLY=G node --experimental-strip-types qa/r51-i13i.mjs ) 2>&1 \
  | grep -E '^  (ok|FAIL) +(R51-4|G3|G4)' | sed 's/^/  /'

echo
echo "  R51-4 red in BOTH = the stranded fraction is PRE-EXISTING and A-71 Part 4d did not cause it."
echo "  G3 RED at $BEFORE and GREEN at HEAD = A-71 Part 4d's \`finally\` is load-bearing and did close"
echo "  a real exit (a throw on the per-file decrement used to strand the fraction at 2 of 3). The one"
echo "  exit it cannot see is the emit ABOVE the \`try\`, which is R51-4's whole subject."

echo
echo "== C3 — §B at $BEFORE, for R51-2 =="
echo "  INAPPLICABLE by construction: there is no \`WeakSet\` at $BEFORE, so a false positive on a"
echo "  brand that does not exist is not measurable. R51-2 is NEW WITH A-71 and is filed against"
echo "  A-71 Part 4a's own sentence rather than against the code it describes. §B's own control is"
echo "  inside the probe: the identical port failure with an UNBRANDED object, printed beside it."
( cd "$CAIRN" && R51_ONLY=B node --experimental-strip-types qa/r51-i13i.mjs ) 2>&1 \
  | grep -E '^  note +B2' | sed 's/^/  /'

echo
echo "-- r51-controls.sh COMPLETE --"
