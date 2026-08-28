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

run_fault() {
  local label="$1"; local script="$2"
  local wt; wt="$(mktemp -d)/wt"
  git -C "$REPO" worktree add --detach "$wt" HEAD >/dev/null 2>&1 || { echo "worktree failed"; return 1; }
  ln -s "$CAIRN/node_modules" "$wt/cairn/node_modules"
  say "$label"
  python3 - "$wt/cairn" <<PY
$script
PY
  if [ $? -ne 0 ]; then echo "  (patch failed to apply — shape moved)"; else
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
old = '      const key = `${c.countryCode ?? NO_COUNTRY}|${nameKey}`;'
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
old = "    const rawB = stage === 'active' ? Math.min(dayNumber(row.endDate), todayNum) : dayNumber(row.endDate);"
assert old in s, 'shape moved'
open(p,'w').write(s.replace(old, '    const rawB = dayNumber(row.endDate);', 1))
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

printf '\n== done ==\n'
