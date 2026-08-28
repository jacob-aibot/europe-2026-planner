#!/usr/bin/env bash
# QA rounds 23 and 24 — do `test/forgiveness.test.ts`'s injected-fault tests actually test what
# they claim?
#
# Reading the test is not evidence. This mutates the REAL `tools/forgiveness.mjs` — in a throwaway
# git worktree, never in the checkout — and records which tests go red for each mutation. A
# mutation that leaves the suite green is a gap in the guard.
#
#   bash cairn/qa/i5b-mutants.sh [<commit>]
#
# Prints one line per mutant: the edit, the test count, and the names that failed.
#
# ---------------------------------------------------------------------------------------------
# **Round 24 repair.** Written at I-5b against a one-arm filter 2, this script had five rows that
# matched no source text after I-5c (§8.4 A-28) split filter 2 into arms 2a and 2b and deleted the
# vertex means: the two `vertex MEAN removed` rows, `vertexMean truncates`, and the two
# `opts.filter2` / `filter 2 deleted` rows. A `perl -0pi -e s///` that matches nothing exits 0 and
# leaves the file untouched, so those rows ran an UNMUTATED module and printed `fail=0` — a green
# that looked like coverage and was the absence of a mutation. The builder disclosed this and
# correctly left `qa/` alone.
#
# Two changes, therefore, and the second matters more than the row edits:
#
#   1. The stale rows are re-expressed against the two-arm source, and the arms get rows of their
#      own (2a alone, 2b alone, both, the ORDER they run in, and the `against` label the drop
#      records carry).
#   2. **Every mutation is now verified to have applied.** `mutate` diffs the file against the
#      pristine copy and refuses to report a result for an edit that changed nothing; it prints
#      `MUTATION DID NOT APPLY` and counts it. The script exits non-zero if any row is stale, so
#      the next reader finds out from the exit code rather than from a false `fail=0`.
# ---------------------------------------------------------------------------------------------
set -u
COMMIT="${1:-99c2e84}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
WT="$(mktemp -d)/wt"
STALE=0

git -C "$REPO" worktree add --detach "$WT" "$COMMIT" >/dev/null 2>&1 || { echo "worktree add failed"; exit 1; }
SRC="$WT/cairn/tools/forgiveness.mjs"
cp "$SRC" "$SRC.orig"

run() {
  local name="$1"
  ( cd "$WT/cairn" && timeout 600 node --test test/forgiveness.test.ts 2>&1 ) > /tmp/i5b-mut.out
  local pass fail names
  pass=$(grep -c '^ok ' /tmp/i5b-mut.out)
  fail=$(grep -c '^not ok ' /tmp/i5b-mut.out)
  names=$(grep '^not ok ' /tmp/i5b-mut.out | sed 's/^not ok [0-9]* - //' | sed 's/I-5[bc]: //g' | paste -sd'|' -)
  printf '%-58s pass=%-3s fail=%-3s %s\n' "$name" "$pass" "$fail" "${names:0:220}"
  cp "$SRC.orig" "$SRC"
}

# Apply one or more perl substitutions, CONFIRM the file actually changed, then run the suite.
# A substitution that matches nothing is the failure mode this function exists to catch.
mutate() {
  local name="$1"; shift
  cp "$SRC.orig" "$SRC"
  perl -0pi -e "$*" "$SRC"
  if cmp -s "$SRC" "$SRC.orig"; then
    printf '%-58s MUTATION DID NOT APPLY — this row is stale against %s\n' "$name" "$COMMIT"
    STALE=$((STALE + 1))
    cp "$SRC.orig" "$SRC"
    return
  fi
  run "$name"
}

echo "=== baseline"
run "unmutated"

echo "=== the three faults ROADMAP criterion 4(e) names, injected in the SOURCE (not by argument)"
mutate "filter 1 deleted in source"      's/const filter1 = opts\.filter1 !== false;/const filter1 = false;/'
mutate "arm 2a deleted in source"        's/const filter2a = opts\.filter2a !== false;/const filter2a = false;/'
mutate "arm 2b deleted in source"        's/const filter2b = opts\.filter2b !== false;/const filter2b = false;/'
mutate "BOTH arms of filter 2 deleted"   's/const filter2a = opts\.filter2a !== false;/const filter2a = false;/; s/const filter2b = opts\.filter2b !== false;/const filter2b = false;/'
mutate "filter 1 and both arms deleted"  's/const filter1 = opts\.filter1 !== false;/const filter1 = false;/; s/const filter2a = opts\.filter2a !== false;/const filter2a = false;/; s/const filter2b = opts\.filter2b !== false;/const filter2b = false;/'

echo "=== the opts switches themselves — does the test notice if they stop working?"
mutate "opts.filter1 ignored (always on)"  's/const filter1 = opts\.filter1 !== false;/const filter1 = true;/'
mutate "opts.filter2a ignored (always on)" 's/const filter2a = opts\.filter2a !== false;/const filter2a = true;/'
mutate "opts.filter2b ignored (always on)" 's/const filter2b = opts\.filter2b !== false;/const filter2b = true;/'

echo "=== A-28's own machinery: the arm ORDER, the arm LABEL, and the empty-population guard"
# The arms run 2a then 2b and a drop is booked against the first that fires (A-28 Part 3).
# Swapping them changes only the four rings the arms disagree on — and `against` on any ring both
# would catch. If nothing goes red, the ORDER clause of the ruling is unasserted.
mutate "arm order swapped (2b runs before 2a)" \
  "s/\\[\\s*\\['coverage', coverageSets\\],\\s*\\['finest', finestSets\\],\\s*\\]/[['finest', finestSets], ['coverage', coverageSets]]/s"
# The label is what `forgiveness-drops.json` records and what the generator's run report counts.
mutate "every drop labelled 'coverage'"  "s/against = arm;/against = 'coverage';/"
mutate "every drop labelled 'finest'"    "s/against = arm;/against = 'finest';/"
mutate "against always null"             "s/against = arm;/against = null;/"
# A-28 Part 7: an accidentally-empty finest population is R23-1 exactly and must not be reachable.
mutate "the empty-finest-population guard removed" \
  "s/if \\(filter2b && \\(!finestOthers \\|\\| finestOthers\\.length === 0\\)\\) \\{/if (false) {/"
mutate "arm 2b's population silently emptied" \
  "s/const finestSets = filter2b \\? finestOthers\\.map\\(\\(e\\) => \\(\\{ code: e\\.code, set: prepSet\\(e\\.rings\\) \\}\\)\\) : \\[\\];/const finestSets = [];/"

echo "=== the predicate's three clauses, one at a time (R23-3 — each needs a fixture only it answers)"
mutate "clause (a) vertex loop removed"     's/if \(insideRings\(R\.pts\[i\], R\.pts\[i \+ 1\], near\)\) return true;/{}/'
mutate "clause (b) vertex loop removed"     's/if \(insideRing\(s\.pts\[i\], s\.pts\[i \+ 1\], R\.pts\)\) return true;/{}/'
mutate "clause (c) segment crossing removed" 's/for \(const s of near\) if \(ringsCross\(R\.pts, s\.pts\)\) return true;//'

echo "=== the arithmetic and the box reject"
mutate "the union-box reject removed (should be a no-op)" 's/if \(!boxesMeet\(R\.box, S\.box\)\) return false;//'
mutate "the per-ring box filter removed (should be a no-op)" \
  's/const near = S\.rings\.filter\(\(s\) => boxesMeet\(R\.box, s\.box\)\);/const near = S.rings;/'
mutate "boxesMeet made half-open (a touch is now disjoint)" \
  's/return !\(a\[2\] < b\[0\] \|\| b\[2\] < a\[0\] \|\| a\[3\] < b\[1\] \|\| b\[3\] < a\[1\]\);/return !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);/'
# R23-3's third arithmetic mutant, closed at I-5c by `overlaps() reaches the lattice by rounding`.
mutate "prepRing rounds with trunc instead of round" \
  's/const x = Math\.round\(ring\[i\] \* LATTICE\);/const x = Math.trunc(ring[i] * LATTICE);/'
mutate "prepRing rounds with floor instead of round" \
  's/const x = Math\.round\(ring\[i\] \* LATTICE\);/const x = Math.floor(ring[i] * LATTICE);/'
# R23-3's fourth is an EQUIVALENT mutant, not a gap: a probe vertex with `lhs === rhs` lies exactly
# on the other ring's edge, which makes clause (c) fire regardless. `qa/i5c-predicate.mjs` §3
# measures that over a million random ring pairs. `fail=0` on this row is the CORRECT result and
# the row stays so nobody chases it again.
mutate "insideRing's strict comparison made non-strict (KNOWN EQUIVALENT — fail=0 is correct)" \
  's/if \(dy > 0 \? lhs < rhs : lhs > rhs\) inside = !inside;/if (dy > 0 ? lhs <= rhs : lhs >= rhs) inside = !inside;/'

echo "=== the whole predicate defanged"
mutate "overlaps() always true"  's/^export function overlaps\(R, S\) \{/export function overlaps(R, S) { return true;/m'
mutate "overlaps() always false" 's/^export function overlaps\(R, S\) \{/export function overlaps(R, S) { return false;/m'

echo "=== the filter ORDER (KD-54's subject)"
mutate "filter 1 block deleted entirely" \
  's/    \/\/ Filter 1 — it must be the same place\.\n    if \(filter1 && !overlaps\(R, ownSet\)\) \{\n      drops\.push\(\{ index: i, filter: 1, code: null, against: null \}\);\n      continue;\n    \}\n//'

rm -f "$SRC.orig"
git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1
if [ "$STALE" -gt 0 ]; then
  echo "=== done; worktree removed. $STALE row(s) STALE — their mutation matched no source text."
  exit 1
fi
echo "=== done; worktree removed. Every row's mutation applied."
