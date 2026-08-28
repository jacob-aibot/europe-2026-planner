#!/usr/bin/env bash
# QA rounds 24 and 25 — **R24-3**: does `FILL === FAMILY[FAMILY.length - 1]` guard the invariant it
# stands for, or only the sentence A-28 Part 3 wrote?
#
# A-28 Part 3's trigger: *"the moment `FILL` is not `FAMILY`'s last element, filter 1 acquires
# exactly this defect and needs its own second arm."* The generator asserts exactly that equality.
# The invariant behind it is **"FILL is the family's FINEST scale"**, and the two are the same
# statement only while `FAMILY` is ordered coarsest-first.
#
# **Round 25: R24-3 is CLOSED and this script is now its regression guard, not its report.**
# `tools/gen-countries.mjs` gained a second start-up assertion — `FAMILY`'s pinned byte counts must
# strictly increase, a coarser admin-0 layer being a smaller file — and case **B**, which ran
# straight past the constants at `99c2e84`, now exits 2 before fetching anything. Cases **D**, **E**
# and **F** are round 25's: three further ways to break the same invariant that the *first*
# assertion cannot see. All six must exit 2, and this script exits non-zero if any of them does not.
#
#   bash cairn/qa/i5c-family.sh [<commit>]        # default: HEAD
#
# Case **G** is the one thing neither assertion catches, and it is a report line rather than a
# failure — see R25-2. It needs the network (it runs the generator to completion); it prints SKIP
# if the pinned layers are unreachable.
#
# Expected at `32efd1e`: **A–F exit 2**, G exits 0 and prints a `forgiveness: none` line that
# contradicts the `fill from 10m` line three lines above it.
set -u
COMMIT="${1:-HEAD}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
WT="$(mktemp -d)/wt"
BAD=0

git -C "$REPO" worktree add --detach "$WT" "$COMMIT" >/dev/null 2>&1 || { echo "worktree add failed"; exit 1; }
SRC="$WT/cairn/tools/gen-countries.mjs"
cp "$SRC" "$SRC.orig"

show() { grep -E "^const (FAMILY|FILL) " "$SRC" | sed 's/^/      /'; }

# $1 label, $2 the message fragment the failure must name, $3.. the perl substitutions.
# Asserts the mutation applied (a `perl -0pi -e s///` that matches nothing exits 0 and would run an
# UNMUTATED generator — the failure mode qa/i5b-mutants.sh exists to catch, in this file too).
guard() {
  local name="$1" want="$2"; shift 2
  cp "$SRC.orig" "$SRC"
  perl -0pi -e "$*" "$SRC"
  if cmp -s "$SRC" "$SRC.orig"; then
    echo "      MUTATION DID NOT APPLY — this case is stale against $COMMIT"
    BAD=$((BAD + 1))
    return
  fi
  show
  local out status
  out=$( cd "$WT/cairn" && timeout 300 node tools/gen-countries.mjs --dry-run 2>&1 >/dev/null )
  status=$?
  echo "$out" | head -1 | cut -c1-200 | sed 's/^/      /'
  if [ "$status" -ne 2 ]; then
    echo "      exit=$status  <-- EXPECTED 2. The generator ran past its constants."
    BAD=$((BAD + 1))
  elif ! echo "$out" | grep -q "$want"; then
    echo "      exit=2 but the message does not name \"$want\"  <-- the guard fired for the wrong reason"
    BAD=$((BAD + 1))
  else
    echo "      exit=2, before any fetch, naming \"$want\"  — OK"
  fi
  cp "$SRC.orig" "$SRC"
}

echo "=== A  FILL = '50m' — A-28 Part 3's literal trigger"
guard "A" "finest scale" "s/^const FILL = '10m';/const FILL = '50m';/m"

echo
echo "=== B  FAMILY reordered so FILL is still LAST but no longer FINEST — R24-3's hole, now closed"
echo "      (at 99c2e84 this exited 0 and the run's own log line read"
echo "       'arm 2b population: 237 codes at the finest scale that carries each — 237 from 50m'"
echo "       while the candidates came from 1:10m. That is R23-1's class, with the assertion green.)"
guard "B" "coarsest-first" \
  "s/^const FAMILY = \['110m', '50m', '10m'\];/const FAMILY = ['110m', '10m', '50m'];/m; s/^const FILL = '10m';/const FILL = '50m';/m"

echo
echo "=== C  a new FINEST scale appended to the family — the FIRST assertion fires, correctly"
guard "C" "finest scale" "s/^const FAMILY = \['110m', '50m', '10m'\];/const FAMILY = ['110m', '50m', '10m', '5m'];/m"

echo
echo "=== D  (round 25) a scale with no SCALES entry spliced into FAMILY — no byte count to order by"
guard "D" "not a pinned scale" "s/^const FAMILY = \['110m', '50m', '10m'\];/const FAMILY = ['110m', '5m', '10m'];/m"

echo
echo "=== E  (round 25) FAMILY repeats the fill — 'strictly increasing' has to mean strictly"
guard "E" "is not finer than" "s/^const FAMILY = \['110m', '50m', '10m'\];/const FAMILY = ['110m', '10m', '10m'];/m"

echo
echo "=== F  (round 25) the PINS swapped, FAMILY untouched — a bad re-pin, not a bad order"
echo "      The guard reasons from SCALES's byte counts, so a re-pin that inverts two of them is"
echo "      indistinguishable to it from a reordered FAMILY. It fails closed, which is what matters;"
echo "      the message names the wrong cause, which is worth knowing before someone re-pins."
guard "F" "is not finer than" \
  "s/bytes: 3083490,/bytes: 13287234,/; s/bytes: 13287234,\n    sha256: '239eec/bytes: 3083490,\n    sha256: '239eec/s"

echo
echo "=== G  (round 25) FAMILY = ['10m'] — BOTH assertions pass and the run completes (R25-2)"
echo "      FILL is FAMILY's last scale and a one-element family is trivially ordered, so neither"
echo "      guard has anything to say. FORGIVE is empty, the forgiveness pass is skipped entirely,"
echo "      and the run reports the skip as 'no filled codes' three lines after saying it filled 64."
cp "$SRC.orig" "$SRC"
perl -0pi -e "s/^const FAMILY = \['110m', '50m', '10m'\];/const FAMILY = ['10m'];/m" "$SRC"
show
G=$( cd "$WT/cairn" && timeout 600 node tools/gen-countries.mjs --dry-run 2>&1 )
GSTATUS=$?
if echo "$G" | grep -qi "fetch failed\|ENOTFOUND\|DOWNLOAD DOES NOT MATCH"; then
  echo "      SKIP — the pinned layers are not reachable from here."
else
  echo "$G" | grep -E "fill from|forgiveness:|emitted bytes" | sed 's/^/      /'
  echo "      exit=$GSTATUS  (0 = both assertions passed and a DIFFERENT index was produced)"
fi
cp "$SRC.orig" "$SRC"

echo
echo "=== §2 (round 25)  does the SUITE notice if each arm of the guard is removed?"
echo "      A guard is only as good as the test that watches it. Reading test/forgiveness.test.ts"
echo "      is not evidence; this neuters each arm in the real generator and re-runs the suite."
suite() {
  ( cd "$WT/cairn" && timeout 300 node --test test/forgiveness.test.ts 2>&1 ) > /tmp/i5c-guard.out
  printf '      %-44s pass=%-3s fail=%-3s %s\n' "$1" \
    "$(grep -c '^ok ' /tmp/i5c-guard.out)" "$(grep -c '^not ok ' /tmp/i5c-guard.out)" \
    "$(grep '^not ok ' /tmp/i5c-guard.out | sed 's/^not ok [0-9]* - //' | paste -sd'|' - | cut -c1-90)"
}
mut() {
  local name="$1"; shift
  cp "$SRC.orig" "$SRC"
  perl -0pi -e "$*" "$SRC"
  if cmp -s "$SRC" "$SRC.orig"; then
    echo "      $name: MUTATION DID NOT APPLY — this row is stale against $COMMIT"
    BAD=$((BAD + 1))
    return
  fi
  suite "$name"
  cp "$SRC.orig" "$SRC"
}
cp "$SRC.orig" "$SRC"
suite "baseline (unmutated)"
mut "R24-3: the byte-ordering comparison neutered" \
  "s/  if \(i > 0 && here\.bytes <= SCALES\[FAMILY\[i - 1\]\]\.bytes\) \{/  if (false) {/"
mut "R24-3: the unpinned-scale arm neutered" "s/  if \(!here\) fail\(/  if (false) fail(/"
mut "A-28 Part 3's own assertion neutered" "s/^if \(FILL !== FAMILY\[FAMILY\.length - 1\]\) \{/if (false) {/m"
echo "      ^ R25-3: the unpinned-scale arm turns 0 of 697 tests red. Case D above is its only"
echo "        coverage, and qa/ is not run by npm test. Two of the three arms are watched by the"
echo "        suite; the third is watched by this file alone."

rm -f "$SRC.orig"
git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1
echo
if [ "$BAD" -gt 0 ]; then
  echo "=== done; worktree removed. $BAD of 6 guarded cases did NOT behave — R24-3 has reopened."
  exit 1
fi
echo "=== done; worktree removed. All six guarded cases exit 2 before fetching. R24-3 stays closed."
echo "What the guard still cannot see, measured in round 25 rather than argued: it proves the"
echo "ordering of the LAYERS by file size, while arm 2b needs it PER CODE — 'the finest drawing of"
echo "country c'. On the pinned layers the two agree: of 237 codes at both 1:50m and 1:10m, 0 are"
echo "drawn with fewer vertices at 1:10m, and the 2 drawn with the same count (BL, NF) have the same"
echo "perimeter to 0.03 %. A dataset where they disagreed would satisfy this guard and still hand"
echo "arm 2b a coarser neighbour. Re-derive with qa/i5c-filter2.mjs's layer loader if a pin ever moves."
