#!/usr/bin/env bash
# QA round 28 — I-7: **the builder's seven injected faults, re-run independently.**
#
#   Run: bash qa/i7-faults.sh          (from cairn/)
#
# BUILD-NOTES' I-7 addendum reports each of these applied alone and watched red. A self-report
# of a red test is the one thing a breaker must not take on trust — the fault might have been
# applied somewhere the test does not reach, or the reported count might be a different test.
# Each fault below is re-derived from A-31's own wording, applied alone in a throwaway
# `git worktree` at HEAD, and the WHOLE suite is run so the blast radius is measured rather
# than asserted.
#
#   M1  the pool dropped from the row census        (builder reported 4 red)
#   M2  the city key is `nameKey` alone             (builder reported 2 red)
#   M3  the sweep replaced by a naive sum           (builder reported 2 red)
#   M4  the `today` clamp removed                   (builder reported 2 red)
#   M5  planned rows admitted to the travelled set  (builder reported 4 red)
#   M6  a duplicate row id silently deduped         (builder reported 1 red)
#   M7  `sort()` on the caller's array, no slice()  (builder reported: green at first, then
#                                                    rewrote the purity test so it reds)
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"

say() { printf '\n== %s ==\n' "$1"; }

# QA **R29-4**. An injected fault whose anchor has drifted used to print
# `(patch failed to apply — shape moved)`, continue, and exit 0 — so an **unrun** fault read
# exactly like a caught one, in the output and in the exit code. **This harness is where that
# already cost a round:** M2 went unrun through round 28 and the builder repaired the instance
# rather than the class. An unrun fault is a FAILURE of the harness and says so, loudly and in
# the exit code. Same mechanism as `qa/i7a-exit6b.sh`.
UNRUN=0
UNRUN_LIST=""

run_fault() {
  local label="$1"; local script="$2"
  local wt; wt="$(mktemp -d)/wt"
  git -C "$REPO" worktree add --detach "$wt" HEAD >/dev/null 2>&1 || { echo "worktree failed"; return 1; }
  ln -s "$CAIRN/node_modules" "$wt/cairn/node_modules"
  say "$label"
  python3 - "$wt/cairn" <<PY
$script
PY
  if [ $? -ne 0 ]; then
    echo "  *** UNRUN — the anchor no longer applies. This is NOT a pass (R29-4). ***"
    UNRUN=$((UNRUN + 1))
    UNRUN_LIST="$UNRUN_LIST ${label%% *}"
  else
    ( cd "$wt/cairn" && node --test --test-reporter=tap packages/core/test/*.test.ts packages/client/test/*.test.ts test/*.test.ts 2>&1 \
        | grep -E '^(not ok|# (pass|fail))' | sed 's/^/  /' )
  fi
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
}

say "baseline"
node --test --test-reporter=tap packages/core/test/*.test.ts packages/client/test/*.test.ts test/*.test.ts 2>&1 \
  | grep -E '^# (tests|pass|fail)' | sed 's/^/  /'

run_fault "M1 — the pool is dropped from the row census" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/summary.ts'
s = open(p).read()
old = '  for (const s of trip.pool) add(stopLatLng(s, trip), stops);\n'
assert old in s, 'shape moved'
open(p,'w').write(s.replace(old, '', 1))
PY
)"

run_fault "M2 — the city group key is nameKey alone" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/travelStats.ts'
s = open(p).read()
# I-7a re-expressed this anchor: R28-5 made `null` and `undefined` one answer, read once into
# a local, so the key line no longer says `c.countryCode`. The FAULT is unchanged.
old = '      const key = `${countryCode ?? NO_COUNTRY}|${nameKey}`;'
assert old in s, 'shape moved'
open(p,'w').write(s.replace(old, '      const key = nameKey;', 1))
PY
)"

run_fault "M3 — daysTravelled is the SUM of the spans, not their union" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/travelStats.ts'
s = open(p).read()
old = '    else if (s.a <= cur.b) cur.b = Math.max(cur.b, s.b);'
assert old in s, 'shape moved'
open(p,'w').write(s.replace(old, '    else if (false) cur.b = Math.max(cur.b, s.b);', 1))
PY
)"

run_fault "M4 — the today clamp is removed from an active trip" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/travelStats.ts'
s = open(p).read()
# Re-derived at I-7b: §8.4 A-37 Part 2 wrapped this line's expression in `inDomain(...)`. The
# fault is unchanged — the `today` clamp comes out and nothing else does; the clamp INTO
# `IsoDate`'s domain stays, so this still isolates the one behaviour it always isolated.
old = "    const rawB = inDomain(stage === 'active' ? Math.min(dayNumber(row.endDate), todayNum) : dayNumber(row.endDate));"
assert old in s, 'shape moved'
open(p,'w').write(s.replace(old, '    const rawB = inDomain(dayNumber(row.endDate));', 1))
PY
)"

run_fault "M5 — planned rows are admitted to the travelled set" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/travelStats.ts'
s = open(p).read()
old = "    if (stage === 'planned') continue;\n"
assert old in s, 'shape moved'
open(p,'w').write(s.replace(old, '', 1))
PY
)"

run_fault "M6 — a duplicate row id is silently deduped instead of throwing" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/travelStats.ts'
s = open(p).read()
old = '    if (seen.has(r.id)) throw new Error(`travelStats: duplicate summary id ${JSON.stringify(r.id)}`);\n'
assert old in s, 'shape moved'
s = s.replace(old, '', 1)
old2 = '  const rows = summaries.slice().sort((x, y) => {'
assert old2 in s, 'shape 2 moved'
s = s.replace(old2, '  const rows = [...new Map(summaries.map((r) => [r.id, r])).values()].sort((x, y) => {', 1)
open(p,'w').write(s)
PY
)"

run_fault "M7 — sort() on the caller's own array, no slice()" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/travelStats.ts'
s = open(p).read()
old = '  const rows = summaries.slice().sort((x, y) => {'
assert old in s, 'shape moved'
open(p,'w').write(s.replace(old, '  const rows = (summaries as TripSummaryRow[]).sort((x, y) => {', 1))
PY
)"

# R29-4: the harness's own verdict, in the output AND in the exit code.
say "summary"
if [ "$UNRUN" -gt 0 ]; then
  echo "  *** $UNRUN fault(s) UNRUN — anchors drifted:$UNRUN_LIST ***"
  echo "  An unrun fault is not a caught fault. Re-derive the anchor (R29-4)."
  printf '\n== done ==\n'
  exit 1
fi
echo "  every fault ran (whether each was CAUGHT is the '# fail' line under it)"

printf '\n== done ==\n'
exit 0
