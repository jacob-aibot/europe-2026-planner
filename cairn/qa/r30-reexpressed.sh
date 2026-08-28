#!/usr/bin/env bash
# QA round 30 — **the three re-expressed probes, mutation-tested.**
#
#   Run: bash qa/r30-reexpressed.sh          (from cairn/)
#
# A probe whose EXPECTATION changes in the same round as the code it probes is the shape a
# breaker distrusts by default, and round 29 set the rule for settling it: **revert the
# implementation fix alone, leave the probe exactly as re-expressed, and see whether it still
# reds.** If it does, the re-expression is a legitimate re-target rather than a laundered
# assertion.
#
# The three, all named as owed to round 30 (two by ARCHITECTURE §8.4 A-37 Part 4, one by
# BUILD-NOTES I-7b):
#
#   R1  `qa/i7-edges.mjs`       — the `'--'` sentinel expectation (A-37 Part 3 read 1)
#   R2  `qa/i7a-provisional.mjs` — the same, plus the `''` and `'A|'` halves
#   R3  `qa/i7a-span.mjs`       — §§2–3 asserted the PRESENCE of R29-2 (A-35)
#
# Each mutation reverts ONE implementation line in a throwaway worktree, copies the
# re-expressed probe in over the worktree's own copy, and runs it. Nothing in the working tree
# is touched.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"
UNRUN=0
LAUNDERED=""

say() { printf '\n== %s ==\n' "$1"; }

# $1 label · $2 python mutation · $3..N probes to run in the mutated tree
run_revert() {
  local label="$1"; local script="$2"; shift 2
  local wt; wt="$(mktemp -d)/wt"
  git -C "$REPO" worktree add --detach "$wt" HEAD >/dev/null 2>&1 || { echo "worktree failed"; return 1; }
  ln -s "$CAIRN/node_modules" "$wt/cairn/node_modules"
  say "$label"
  if ! python3 - "$wt/cairn" <<PY
$script
PY
  then
    echo "  *** UNRUN — the anchor no longer applies. This is NOT a pass. ***"
    UNRUN=$((UNRUN + 1))
  else
    for probe in "$@"; do
      # The probe as THIS ROUND re-expressed it, against the REVERTED implementation.
      cp "$CAIRN/qa/$probe" "$wt/cairn/qa/$probe"
      local out
      out="$( cd "$wt/cairn" && node --experimental-strip-types "qa/$probe" 2>&1 \
          | grep -E 'FAIL|ALL OK' | head -8 )"
      echo "  $probe:"
      echo "$out" | sed 's/^/    /'
      if echo "$out" | grep -q 'ALL OK'; then
        echo "    *** STILL GREEN — the re-expression does not discriminate. LAUNDERED. ***"
        LAUNDERED="$LAUNDERED $probe"
      fi
    done
  fi
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
}

say "baseline — the three probes on the shipped tree (all must be ALL OK)"
for p in i7-edges.mjs i7a-provisional.mjs i7a-span.mjs; do
  echo "  $p: $(node --experimental-strip-types "qa/$p" 2>/dev/null | grep -E 'FAIL|ALL OK' | tail -1)"
done

# ---------------------------------------------------------------------------
run_revert "R1/R2 — revert A-37 Part 3 read 1 (\`isMintedCode\` → \`?? null\`) ALONE" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/travelStats.ts'
s = open(p).read()
old = '      const countryCode = isMintedCode(c.countryCode) ? c.countryCode : null;'
assert old in s, 'shape moved (cities[].countryCode read)'
open(p, 'w').write(s.replace(old, '      const countryCode = c.countryCode ?? null;', 1))
PY
)" i7-edges.mjs i7a-provisional.mjs

# ---------------------------------------------------------------------------
run_revert "R3 — revert A-35's refusal (delete the \`if\`) ALONE" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/build/days.ts'
s = open(p).read()
old = """  if (span + 1 > MAX_TRIP_SPAN_DAYS) {
    throw new Error(
      `ensureDays: this trip would cover ${span + 1} days (${start} → ${end}), and one trip may ` +
        `cover at most ${MAX_TRIP_SPAN_DAYS} (about ten years). Check the year in the dates.`,
    );
  }
"""
assert old in s, 'shape moved (A-35 refusal)'
open(p, 'w').write(s.replace(old, '', 1))
PY
)" i7a-span.mjs

say "summary"
if [ -n "$LAUNDERED" ]; then
  echo "  *** re-expressions that do NOT discriminate:$LAUNDERED ***"
else
  echo "  every re-expression still reds when its implementation fix alone is reverted"
fi
[ "$UNRUN" -gt 0 ] && { echo "  $UNRUN mutation(s) UNRUN — anchors drifted"; printf '\n== done ==\n'; exit 1; }
printf '\n== done ==\n'
[ -n "$LAUNDERED" ] && exit 1
exit 0
