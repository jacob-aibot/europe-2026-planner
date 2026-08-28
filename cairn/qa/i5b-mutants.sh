#!/usr/bin/env bash
# QA round 23 — do `test/forgiveness.test.ts`'s injected-fault tests actually test what they claim?
#
# Reading the test is not evidence. This mutates the REAL `tools/forgiveness.mjs` — in a throwaway
# git worktree, never in the checkout — and records which tests go red for each mutation. A
# mutation that leaves the suite green is a gap in the guard.
#
#   bash cairn/qa/i5b-mutants.sh [<commit>]
#
# Prints one line per mutant: the edit, the test count, and the names that failed.
set -u
COMMIT="${1:-38d23c9}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
WT="$(mktemp -d)/wt"

git -C "$REPO" worktree add --detach "$WT" "$COMMIT" >/dev/null 2>&1 || { echo "worktree add failed"; exit 1; }
SRC="$WT/cairn/tools/forgiveness.mjs"
cp "$SRC" "$SRC.orig"

run() {
  local name="$1"
  ( cd "$WT/cairn" && timeout 600 node --test test/forgiveness.test.ts 2>&1 ) > /tmp/i5b-mut.out
  local pass fail
  pass=$(grep -c '^ok ' /tmp/i5b-mut.out)
  fail=$(grep -c '^not ok ' /tmp/i5b-mut.out)
  local names
  names=$(grep '^not ok ' /tmp/i5b-mut.out | sed 's/^not ok [0-9]* - //' | sed 's/I-5b//g' | paste -sd'|' -)
  printf '%-58s pass=%-3s fail=%-3s %s\n' "$name" "$pass" "$fail" "${names:0:200}"
  cp "$SRC.orig" "$SRC"
}

echo "=== baseline"
run "unmutated"

echo "=== the two faults ROADMAP criterion 4(e) names, injected in the SOURCE (not by argument)"
# filter 1 permanently removed
perl -0pi -e "s/const filter1 = opts\.filter1 !== false;/const filter1 = false;/" "$SRC"
run "filter 1 deleted in source"
perl -0pi -e "s/const filter2 = opts\.filter2 !== false;/const filter2 = false;/" "$SRC"
run "filter 2 deleted in source"
perl -0pi -e "s/const filter1 = opts\.filter1 !== false;/const filter1 = false;/; s/const filter2 = opts\.filter2 !== false;/const filter2 = false;/" "$SRC"
run "both filters deleted in source"

echo "=== the opts switches themselves — does the test notice if they stop working?"
perl -0pi -e "s/const filter1 = opts\.filter1 !== false;/const filter1 = true;/" "$SRC"
run "opts.filter1 ignored (always on)"
perl -0pi -e "s/const filter2 = opts\.filter2 !== false;/const filter2 = true;/" "$SRC"
run "opts.filter2 ignored (always on)"

echo "=== the predicate's three clauses, one at a time"
perl -0pi -e "s/if \(insideRings\(R\.pts\[i\], R\.pts\[i \+ 1\], near\)\) return true;/{}/" "$SRC"
run "clause (a) vertex loop removed"
perl -0pi -e "s/if \(mR && insideRings\(mR\[0\], mR\[1\], near\)\) return true;//" "$SRC"
run "clause (a) vertex MEAN removed"
perl -0pi -e "s/if \(insideRing\(s\.pts\[i\], s\.pts\[i \+ 1\], R\.pts\)\) return true;/{}/" "$SRC"
run "clause (b) vertex loop removed"
perl -0pi -e "s/if \(mS && insideRing\(mS\[0\], mS\[1\], R\.pts\)\) return true;//" "$SRC"
run "clause (b) vertex MEAN removed"
perl -0pi -e "s/for \(const s of near\) if \(ringsCross\(R\.pts, s\.pts\)\) return true;//" "$SRC"
run "clause (c) segment crossing removed"

echo "=== the arithmetic and the box reject"
perl -0pi -e "s/if \(!boxesMeet\(R\.box, S\.box\)\) return false;//" "$SRC"
run "the union-box reject removed (should be a no-op)"
perl -0pi -e "s/const near = S\.rings\.filter\(\(s\) => boxesMeet\(R\.box, s\.box\)\);/const near = S.rings;/" "$SRC"
run "the per-ring box filter removed (should be a no-op)"
perl -0pi -e "s/return !\(a\[2\] < b\[0\] \|\| b\[2\] < a\[0\] \|\| a\[3\] < b\[1\] \|\| b\[3\] < a\[1\]\);/return !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);/" "$SRC"
run "boxesMeet made half-open (a touch is now disjoint)"
perl -0pi -e "s/const x = Math\.round\(ring\[i\] \* LATTICE\);/const x = Math.trunc(ring[i] * LATTICE);/" "$SRC"
run "prepRing rounds with trunc instead of round"
perl -0pi -e "s/return n === 0 \? null : \[Math\.round\(sx \/ n\), Math\.round\(sy \/ n\)\];/return n === 0 ? null : [Math.trunc(sx \/ n), Math.trunc(sy \/ n)];/" "$SRC"
run "vertexMean truncates instead of rounding"
perl -0pi -e "s/if \(dy > 0 \? lhs < rhs : lhs > rhs\) inside = !inside;/if (dy > 0 ? lhs <= rhs : lhs >= rhs) inside = !inside;/" "$SRC"
run "insideRing's strict comparison made non-strict"

echo "=== the whole predicate defanged"
perl -0pi -e "s/^export function overlaps\(R, S\) \{/export function overlaps(R, S) { return true;/m" "$SRC"
run "overlaps() always true"
perl -0pi -e "s/^export function overlaps\(R, S\) \{/export function overlaps(R, S) { return false;/m" "$SRC"
run "overlaps() always false"

echo "=== the filter ORDER (KD-54's subject)"
perl -0pi -e "s/    \/\/ Filter 1 — it must be the same place\.\n    if \(filter1 && !overlaps\(R, ownSet\)\) \{\n      drops\.push\(\{ index: i, filter: 1, code: null \}\);\n      continue;\n    }\n//" "$SRC"
grep -q "Filter 1 — it must be the same place" "$SRC" && echo "  (order mutation did not apply — skipped)" || run "filter 1 block deleted entirely"
cp "$SRC.orig" "$SRC"

rm -f "$SRC.orig"
git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1
echo "=== done; worktree removed"
