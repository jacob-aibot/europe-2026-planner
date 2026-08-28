#!/usr/bin/env bash
# QA round 28 — I-7: **exit criterion 6, mutation-tested from the outside.**
#
#   Run: bash qa/i7-exit6.sh          (from cairn/)
#
# A-31 Part 6 replaces "grep for a persisted count" with two mechanical halves in
# `test/stats-storage.test.ts`. BUILD-NOTES KD-64 discloses that 6b's source allow-list needed
# two entries A-31 did not enumerate (`horizonDays`, and `TravelStats`'s own fields) and that
# the builder chose a **wide classifier plus a reasoned allow-list**. The question that decides
# whether that is a judgement call or a hole is not "is the allow-list justified" but "what can
# a real persisted count hide behind". So: seven faults, each applied alone in a throwaway
# `git worktree` at HEAD, each the shape a builder would actually write.
#
#   F1  `countriesVisited: number` on `Trip`                     (the builder's own fault 8)
#   F2  `daysTravelled: number` on the client's persisted AppState-adjacent record
#   F3  `citiesVisited: number` added to `TripSummaryRow` and MINTED                (6a's job)
#   F4  `daysAbroad: number` added to `TripSummaryRow` and minted — a count whose NAME
#       carries no counting suffix and no plural domain noun
#   F5  the same lifetime count persisted with **no type annotation at all** — an object
#       literal written straight to storage, which is how this mistake is actually made
#   F6  the same count declared through a type ALIAS (`countriesVisited: Tally`)
#   F7  a lifetime statistic imported by a storage port (the assertion 6b's travelStats.ts
#       allow-list entries rest on)
#   F8  the same lifetime tally WRITTEN to IndexedDB by the web port, with no annotation
#       anywhere — a spread onto the record actually put into the store
#
# Round 28 found F4, F6 and F8 GREEN, which is R28-2. ARCHITECTURE §8.4 **A-33** (revision 25)
# replaced criterion 6's mechanism, and A-33 Part 6 adds two faults here, because the ruling
# introduces two checks nothing in this harness attacked:
#
#   F9  the same spread in `memory.ts`'s `summaries.set` — caught by 6b-1 (a value read back
#       out of a real port) AND by 6b-2: two independent checks, deliberately, because 6b-1 can
#       only see ports that run in Node and 6b-2 can only see source text
#   F10 a THIRD `SUMMARIES.put(summary, id)` site in the web port — caught by 6b-2's pinned
#       site count and by nothing else, because the argument itself is innocent
#
# All ten must be RED. A fault caught by exactly one check is fine; a fault caught by none is a
# hole and is a finding.
#
# A fault that produces `# fail 0` is a fault exit criterion 6 does not catch.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"
TEST='test/stats-storage.test.ts'

say() { printf '\n== %s ==\n' "$1"; }

# QA **R29-4**. An injected fault whose anchor has drifted used to print
# `(patch failed to apply — shape moved)`, continue, and exit 0 — so an **unrun** fault read
# exactly like a caught one, in the output and in the exit code. That already cost a round: M2
# went unrun through round 28 in the sibling harness. An unrun fault is a FAILURE of the harness
# and says so, loudly and in the exit code. Same mechanism as `qa/i7a-exit6b.sh`.
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
    ( cd "$wt/cairn" && node --test --test-reporter=tap "$TEST" 2>&1 \
        | grep -E '^(not ok|# (pass|fail))' | head -8 | sed 's/^/  /' )
  fi
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
}

say "baseline — exit criterion 6 on the shipped tree"
node --test --test-reporter=tap "$TEST" 2>&1 | grep -E '^(not ok|# (tests|pass|fail))' | sed 's/^/  /'

run_fault "F1 — countriesVisited: number on Trip (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/model/types.ts'
s = open(p).read()
old = '  revision: number;'
assert old in s, 'shape moved'
s = s.replace(old, '  countriesVisited: number;\n' + old, 1)
open(p,'w').write(s)
PY
)"

run_fault "F2 — daysTravelled: number on a client store record (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/ports/types.ts'
s = open(p).read()
old = '  listTrips(): Promise<TripSummaryRow[]>;'
assert old in s, 'shape moved'
s = s.replace(old, '  daysTravelled: number;\n' + old, 1)
open(p,'w').write(s)
PY
)"

run_fault "F3 — citiesVisited: number added to TripSummaryRow and minted (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/summary.ts'
s = open(p).read()
assert '  summaryVersion: number;\n};' in s, 'shape moved'
s = s.replace('  summaryVersion: number;\n};', '  citiesVisited: number;\n  summaryVersion: number;\n};', 1)
assert '    summaryVersion: SUMMARY_VERSION,' in s
s = s.replace('    summaryVersion: SUMMARY_VERSION,',
              '    citiesVisited: cities.length,\n    summaryVersion: SUMMARY_VERSION,', 1)
open(p,'w').write(s)
PY
)"

run_fault "F4 — daysAbroad: number added to TripSummaryRow and minted (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/summary.ts'
s = open(p).read()
assert '  summaryVersion: number;\n};' in s, 'shape moved'
s = s.replace('  summaryVersion: number;\n};', '  daysAbroad: number;\n  summaryVersion: number;\n};', 1)
s = s.replace('    summaryVersion: SUMMARY_VERSION,',
              '    daysAbroad: trip.days.length,\n    summaryVersion: SUMMARY_VERSION,', 1)
open(p,'w').write(s)
PY
)"

run_fault "F5 — a lifetime count persisted with NO type annotation (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/store/store.ts'
s = open(p).read()
old = 'function needsRescan('
assert old in s, 'shape moved'
inject = '''/**
 * The Profile's lifetime totals, cached so the map does not recompute them on every render.
 * Written to storage beside the library. (This is the fault: a count that summarises a SET of
 * documents, with nothing to recompute it from.)
 */
export const lifetimeTotals = { countriesVisited: 0, citiesVisited: 0, daysTravelled: 0, tripsTotal: 0 };

'''
s = s.replace(old, inject + old, 1)
open(p,'w').write(s)
PY
)"

run_fault "F6 — countriesVisited declared through a type alias (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/ports/types.ts'
s = open(p).read()
old = '  listTrips(): Promise<TripSummaryRow[]>;'
assert old in s, 'shape moved'
s = s.replace(old, '  countriesVisited: Tally;\n  daysTravelled: Tally;\n' + old, 1)
s = 'type Tally = number;\n' + s
open(p,'w').write(s)
PY
)"

run_fault "F7 — a storage port imports TravelStats (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/ports/types.ts'
s = open(p).read()
s = s.replace("import type { IsoDate, TripSummaryRow } from '../deps.ts';",
              "import type { IsoDate, TripSummaryRow } from '../deps.ts';\nimport type { TravelStats } from '../../../core/src/derive/travelStats.ts';", 1)
old = '  listTrips(): Promise<TripSummaryRow[]>;'
s = s.replace(old, '  saveStats(s: TravelStats): Promise<void>;\n' + old, 1)
open(p,'w').write(s)
PY
)"


run_fault "F8 — a lifetime tally WRITTEN to IndexedDB, no annotation (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
old = "            tx.objectStore(SUMMARIES).put(summary, id);"
assert s.count(old) == 2, 'shape moved'
# THE FAULT: counts that summarise the library, spread onto the record actually written to
# IndexedDB. No `: number` anywhere, so no declaration-shaped grep can see them.
new = ("            tx.objectStore(SUMMARIES).put(\n"
       "              { ...summary, countriesVisited: summary.countryCodes.length, daysTravelled: summary.dayCount },\n"
       "              id,\n"
       "            );")
s = s.replace(old, new)
open(p,'w').write(s)
PY
)"

run_fault "F9 — the same lifetime tally spread into memory.ts's summaries.set (expect: RED)" "$(cat <<'PYF9'
import sys
p = sys.argv[1] + '/packages/client/src/ports/memory.ts'
s = open(p).read()
old = "      summaries.set(id, summary);"
assert s.count(old) == 2, 'shape moved'
# THE FAULT: the in-Node port, which 6b-1 drives and then reads back. No `: number` anywhere,
# so no declaration-shaped grep can see it either.
new = ("      summaries.set(id, { ...summary, countriesVisited: summary.countryCodes.length,\n"
       "        daysTravelled: summary.dayCount });")
s = s.replace(old, new)
open(p,'w').write(s)
PYF9
)"

run_fault "F10 — a THIRD SUMMARIES.put site in the web port (expect: RED)" "$(cat <<'PYF10'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
old = "            tx.objectStore(SUMMARIES).put(summary, id);"
assert s.count(old) == 2, 'shape moved'
# THE FAULT: the argument is innocent, so only the PINNED SITE COUNT can see this. A third
# write site is where the next spread gets added without a recipe.
s = s.replace(old, old + "\n            tx.objectStore(SUMMARIES).put(summary, id + '-shadow');", 1)
open(p,'w').write(s)
PYF10
)"

say "F8, continued — does anything ELSE in the suite catch it, and does it typecheck?"
{
  wt="$(mktemp -d)/wt"
  git -C "$REPO" worktree add --detach "$wt" HEAD >/dev/null 2>&1
  ln -s "$CAIRN/node_modules" "$wt/cairn/node_modules"
  python3 - "$wt/cairn" <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
old = "            tx.objectStore(SUMMARIES).put(summary, id);"
new = ("            tx.objectStore(SUMMARIES).put(\n"
       "              { ...summary, countriesVisited: summary.countryCodes.length, daysTravelled: summary.dayCount },\n"
       "              id,\n"
       "            );")
s = s.replace(old, new)
open(p,'w').write(s)
PY
  echo "  full suite:"
  ( cd "$wt/cairn" && node --test --test-reporter=tap packages/core/test/*.test.ts packages/client/test/*.test.ts test/*.test.ts 2>&1 \
      | grep -E '^(not ok|# (tests|pass|fail))' | head -12 | sed 's/^/    /' )
  echo "  apps/web typecheck (the europe2026.json error is a worktree artefact — no sample built):"
  ( cd "$wt/cairn" && npx tsc -p apps/web/tsconfig.json --noEmit 2>&1 | grep -v 'europe2026.json' | head -5 | sed 's/^/    /' )
  echo "    (no storage.ts line above = the fault typechecks clean)"
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
}

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
