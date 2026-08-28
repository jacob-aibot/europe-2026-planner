#!/usr/bin/env bash
# QA round 29 — I-7a: **exit criterion 6 in its A-33 (revision-25) form, attacked past F1..F10.**
#
#   Run: bash qa/i7a-exit6b.sh          (from cairn/)
#
# `qa/i7-exit6.sh` re-runs the ten faults the ARCHITECTURE §8.4 A-33 Part 6 matrix names, and
# all ten are red. That matrix is the architect's own list, so passing it proves the criterion
# catches the faults it was designed against — not that it catches the faults a builder would
# write next. These six are new, each one aimed at a seam A-33 states a claim about:
#
#   G1  the local-`summary` shadow, in the ONE method whose parameter is renamed.
#       A-33 6b-2 says the parameter grep "closes 'declare a local `const summary = {...spread}`
#       above the put'". The grep is a WHOLE-FILE existence test and the file has two methods,
#       so renaming one method's parameter leaves the other method's declaration to satisfy it.
#   G2  the same shadow in `memory.ts`, which 6b-1 CAN see. The control for G1: if G2 is red and
#       G1 is green, the gap is exactly "the web port does not run in Node", not the recipe.
#   G3  a lifetime count persisted by a port into a store that is NOT the summaries store —
#       a `lifetime` cache the Profile screen can read without recomputing. The most natural
#       way this mistake is actually made, and neither `SUMMARIES.put` nor `summaries.set`.
#   G4  the web port widening rows on READ (`listTrips`) rather than on write. Nothing is
#       persisted; every consumer sees the count anyway.
#   G5  the same read-side widening in `memory.ts` — the control for G4.
#   G6  a count-shaped field added to `TripSummaryRow` and minted, named so the tripwire's
#       classifier cannot see it AND typed through the row's own existing numeric alias-free
#       path — F4's shape with a different name, to check 6a' is name-blind as claimed.
#
# A fault that produces `# fail 0` is a fault exit criterion 6 does not catch.
#
# Unlike `qa/i7-exit6.sh` and `qa/i7-faults.sh`, an anchor that no longer applies is reported
# as **UNRUN** and makes this script exit non-zero — see R29-4. A fault that silently did not
# apply reads as a pass, which is the same class of defect as the criterion it is testing.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"
TEST='test/stats-storage.test.ts'
UNRUN=0
GREEN=""

say() { printf '\n== %s ==\n' "$1"; }

run_fault() {
  local label="$1"; local script="$2"; local scope="${3:-$TEST}"
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
    local out
    out="$( cd "$wt/cairn" && node --test --test-reporter=tap $scope 2>&1 \
        | grep -E '^(not ok|# (tests|pass|fail))' )"
    echo "$out" | sed 's/^/  /'
    if echo "$out" | grep -qE '^# fail 0$'; then
      echo "  *** GREEN — exit criterion 6 does not catch this ***"
      GREEN="$GREEN $label"
    fi
  fi
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
}

say "baseline — exit criterion 6 on the shipped tree"
node --test --test-reporter=tap "$TEST" 2>&1 | grep -E '^(not ok|# (tests|pass|fail))' | sed 's/^/  /'

# ---------------------------------------------------------------------------
run_fault "G1 — web port: parameter renamed, local \`summary\` shadow with a count (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
# refreshSummary's parameter becomes `row`; a local `summary` is built from it, widened, and
# put. `saveIfVersion` is untouched, so `summary: TripSummaryRow` is still in the file and the
# 6b-2 parameter grep is still satisfied.
old_sig = '''    async refreshSummary(
      id: string,
      expectedVersion: StorageVersion,
      summary: TripSummaryRow,'''
assert old_sig in s, 'shape moved (refreshSummary signature)'
s = s.replace(old_sig, '''    async refreshSummary(
      id: string,
      expectedVersion: StorageVersion,
      row: TripSummaryRow,''', 1)
old_put = '            tx.objectStore(SUMMARIES).put(summary, id);'
assert s.count(old_put) == 2, 'shape moved (put sites)'
# only the SECOND occurrence is inside refreshSummary
i = s.rindex(old_put)
s = s[:i] + '''            const summary = { ...row, countriesVisited: row.countryCodes.length, daysTravelled: row.dayCount };
''' + old_put + s[i + len(old_put):]
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G2 — memory port: same local-\`summary\` shadow (control for G1) (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/ports/memory.ts'
s = open(p).read()
old = '    async refreshSummary(id, expectedVersion, summary) {'
assert old in s, 'shape moved (refreshSummary signature)'
s = s.replace(old, '    async refreshSummary(id, expectedVersion, row) {', 1)
old_set = '      summaries.set(id, summary);'
assert s.count(old_set) == 2, 'shape moved (set sites)'
i = s.rindex(old_set)
s = s[:i] + '''      const summary = { ...row, countriesVisited: row.countryCodes.length, daysTravelled: row.dayCount };
''' + old_set + s[i + len(old_set):]
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G3 — a lifetime cache in a SECOND store in the memory port (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/ports/memory.ts'
s = open(p).read()
anchor = '  const summaries = new Map<string, TripSummaryRow>();'
assert anchor in s, 'shape moved (summaries map)'
s = s.replace(anchor, anchor + '\n  const lifetime = new Map<string, { countriesVisited: number; daysTravelled: number }>();', 1)
old = '      summaries.set(id, summary);'
assert s.count(old) == 2, 'shape moved (set sites)'
s = s.replace(old, old + '\n      lifetime.set(id, { countriesVisited: summary.countryCodes.length, daysTravelled: summary.dayCount });')
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G4 — web port widens rows on READ, not on write (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
old = '      const rows = await run<TripSummaryRow[]>(SUMMARIES, \'readonly\', (s) => s.getAll() as IDBRequest<TripSummaryRow[]>);'
assert old in s, 'shape moved (listTrips getAll)'
s = s.replace(old, old + '\n      for (const r of rows) (r as Record<string, unknown>).countriesVisited = r.countryCodes.length;', 1)
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G5 — memory port widens rows on READ (control for G4) (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/ports/memory.ts'
s = open(p).read()
old = '      return [...summaries.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));'
assert old in s, 'shape moved (listTrips)'
s = s.replace(old, '''      return [...summaries.values()]
        .map((r) => ({ ...r, countriesVisited: r.countryCodes.length }) as unknown as TripSummaryRow)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));''', 1)
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G6 — \`abroadTally\` on the row and minted: F4's shape, a name the classifier cannot see (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/summary.ts'
s = open(p).read()
assert '  summaryVersion: number;\n};' in s, 'shape moved (TripSummaryRow tail)'
s = s.replace('  summaryVersion: number;\n};', '  summaryVersion: number;\n  abroadTally: number;\n};', 1)
old = '    summaryVersion: SUMMARY_VERSION,'
assert old in s, 'shape moved (mint)'
s = s.replace(old, old + '\n    abroadTally: countryCodes.length,', 1)
open(p, 'w').write(s)
PY
)"

say "summary"
if [ -n "$GREEN" ]; then
  echo "  GREEN (uncaught) faults:$GREEN"
else
  echo "  every fault was caught"
fi
[ "$UNRUN" -gt 0 ] && echo "  $UNRUN fault(s) UNRUN — anchors drifted"
say "done"
[ "$UNRUN" -gt 0 ] && exit 1
exit 0
