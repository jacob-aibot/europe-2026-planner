#!/usr/bin/env bash
# QA round 24 — **R24-3**: does `FILL === FAMILY[FAMILY.length - 1]` guard the invariant it stands
# for, or only the sentence A-28 Part 3 wrote?
#
# A-28 Part 3's trigger: *"the moment `FILL` is not `FAMILY`'s last element, filter 1 acquires
# exactly this defect and needs its own second arm."* The generator asserts exactly that equality.
# The invariant behind it is **"FILL is the family's FINEST scale"**, and the two are the same
# statement only because `FAMILY` is ordered coarsest-first — which its own comment says
# (*"Coarsest first."*) and nothing asserts.
#
# Three mutations, in a throwaway worktree, never in the checkout:
#
#   A  FILL = '50m'                      — the literal trigger. Must exit 2 before fetching.
#   B  FAMILY reordered, FILL still last — the invariant broken, the assertion satisfied.
#   C  a NEW finest scale appended        — the assertion fires, correctly.
#
#   bash cairn/qa/i5c-family.sh [<commit>]
#
# B is the finding: the run proceeds, and its own log line says arm 2b is comparing candidates
# taken from 1:10m against neighbours drawn at 1:50m — QA R23-1's class, inside the arm A-28 added
# to prevent it, and in filter 1 as well.
set -u
COMMIT="${1:-99c2e84}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
WT="$(mktemp -d)/wt"
git -C "$REPO" worktree add --detach "$WT" "$COMMIT" >/dev/null 2>&1 || { echo "worktree add failed"; exit 1; }
SRC="$WT/cairn/tools/gen-countries.mjs"
cp "$SRC" "$SRC.orig"

show() { grep -E "^const (FAMILY|FILL) " "$SRC" | sed 's/^/      /'; }

echo "=== A  FILL = '50m' — A-28 Part 3's literal trigger"
perl -0pi -e "s/^const FILL = '10m';/const FILL = '50m';/m" "$SRC"
show
( cd "$WT/cairn" && timeout 300 node tools/gen-countries.mjs --dry-run 2>&1 | head -3 | sed 's/^/      /' )
( cd "$WT/cairn" && timeout 300 node tools/gen-countries.mjs --dry-run >/dev/null 2>&1 ); echo "      exit=$?  (2 = the assertion fired, before any fetch)"
cp "$SRC.orig" "$SRC"

echo
echo "=== B  FAMILY reordered so FILL is still LAST but no longer FINEST — the hole"
perl -0pi -e "s/^const FAMILY = \['110m', '50m', '10m'\];/const FAMILY = ['110m', '10m', '50m'];/m; s/^const FILL = '10m';/const FILL = '50m';/m" "$SRC"
show
( cd "$WT/cairn" && timeout 600 node tools/gen-countries.mjs --dry-run 2>&1 |
  grep -E "gen-countries: FILL|arm 2b population|forgiveness from|fill from" | sed 's/^/      /' )
( cd "$WT/cairn" && timeout 600 node tools/gen-countries.mjs --dry-run >/dev/null 2>&1 ); echo "      exit=$?  (0 = the assertion did NOT fire)"
echo "      ^ arm 2b's population is the 1:50m layer while the candidates come from 1:10m."
echo "        Filter 1 likewise compares a 1:10m candidate against the code's 1:50m own coverage."
echo "        That is R23-1's class, reintroduced, with the guard green."
cp "$SRC.orig" "$SRC"

echo
echo "=== C  a new FINEST scale appended to the family — the assertion fires, correctly"
perl -0pi -e "s/^const FAMILY = \['110m', '50m', '10m'\];/const FAMILY = ['110m', '50m', '10m', '5m'];/m" "$SRC"
show
( cd "$WT/cairn" && timeout 300 node tools/gen-countries.mjs --dry-run 2>&1 | head -2 | sed 's/^/      /' )
( cd "$WT/cairn" && timeout 300 node tools/gen-countries.mjs --dry-run >/dev/null 2>&1 ); echo "      exit=$?"
cp "$SRC.orig" "$SRC"

rm -f "$SRC.orig"
git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1
echo
echo "=== done; worktree removed."
echo "The cheap close: assert FAMILY is ordered coarsest-first as well. SCALES already pins each"
echo "layer's byte count and they are strictly increasing with resolution (838,726 / 3,083,490 /"
echo "13,287,234), so the ordering is checkable from data the generator already holds."
