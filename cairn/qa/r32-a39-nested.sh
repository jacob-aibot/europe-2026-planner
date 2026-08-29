#!/usr/bin/env bash
# QA round 32 — A-39 verification. Three faults `qa/a39-exit6e.sh` does not build, aimed at the
# covering set's own claims rather than at new architecture.
#
#   Run: bash qa/r32-a39-nested.sh          (from cairn/)
#
# Same shape as `qa/a39-exit6e.sh`: one shared template, worktree-isolated, R29-4's UNRUN rule.
# What differs is the guard AND, for G21, the *shape of the widening*.
#
#   G21n  guard `r.cities && r.cities.some((c) => !('countrySource' in c))` — the gen-2 shape
#         guard, one level down from G17. Widens the CITY entry: `c.countrySource = null`.
#         A-39 Part 6's ledger describes gen-2 as *"`attribution`, plus `countrySource` inside
#         each `cities[]` entry"*, so this key IS part of the generation's stated shape and
#         A-39 Part 10 says a key outside the record's own seeded key set must be caught.
#         **Expected by A-39: RED.**
#
#   G21t  the SAME guard, widening at TOP level (`daysTravelled`) instead. This is the vacuity
#         control: it proves the gen-2 city-shape guard is genuinely LIVE against the seed, so
#         a green G21n is the assertion missing it and not the fixture failing to reach it.
#         **Expected: RED.**
#
#   G22   guard `!('summaryVersion' in r)` — the gen-1-only guard, `needsRescan`'s own `?? 0`
#         idiom expressed as key presence. BUILD-NOTES deviation (3) discloses that G16 does not
#         fire on gen-1 in-suite; this asks whether ANY in-suite fault shape aimed at gen-1
#         alone is caught. **Expected: RED.**
#
#   G23   guard `r.revision === 0` — Axis C's `revision` ZERO cell. A-39 Part 4 names the
#         degenerate representative as carrying `revision: 0`; BUILD-NOTES deviation (1) drops it
#         as unreachable. `qa/r32-revision0.mjs` shows it IS reachable through `importDoc`.
#         **Expected by A-39 Part 4: RED. Measured: see below.**
#   G23c  the vacuity control, `r.revision === 1` — proves the guard shape is live against the
#         seed, so a green G23 is the missing fixture state and not a dead fault. **Expect RED.**
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"
TEST='test/stats-storage.test.ts'
UNRUN=0
MISMATCH=""

say() { printf '\n== %s ==\n' "$1"; }

run_fault() {
  local label="$1"; local script="$2"; local expect="$3"; local scope="${4:-$TEST}"
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
    local out got
    out="$( cd "$wt/cairn" && node --test --test-reporter=tap $scope 2>&1 \
        | grep -E '^(not ok|# (tests|pass|fail|skipped))' )"
    echo "$out" | sed 's/^/  /'
    if echo "$out" | grep -qE '^# fail 0$'; then got=GREEN; else got=RED; fi
    echo "  measured: $got   expected: $expect"
    if [ "$got" != "$expect" ]; then
      echo "  *** MISMATCH — $label measured $got, expected $expect ***"
      MISMATCH="$MISMATCH [$label: $got]"
    fi
  fi
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
}

say "baseline — exit criterion 6 on the shipped tree"
node --test --test-reporter=tap "$TEST" 2>&1 | grep -E '^(not ok|# (tests|pass|fail))' | sed 's/^/  /'

# `guard` and `body` are the only two things that differ between the faults below.
PRE='
import sys, re
root = sys.argv[1]
'

POST='
p = root + "/apps/web/src/ports/storage.ts"
s = open(p).read()
tx = "          const tx = db.transaction([DOCS, VERSIONS], \x27readwrite\x27);\n          const versions = tx.objectStore(VERSIONS);"
assert tx in s, "shape moved (ensureReady tx)"
s = s.replace(tx, "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], \x27readwrite\x27);\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);", 1)
loop = "              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;"
assert loop in s, "shape moved (upcast loop)"
s = s.replace(loop,
  "              const all = sums.getAll() as IDBRequest<TripSummaryRow[]>;\n"
  "              all.onsuccess = () => {\n"
  "                for (const r of all.result as any[]) {\n"
  "                  if (" + guard + ") { " + body + " }\n"
  "                }\n"
  "              };\n" + loop, 1)
open(p, "w").write(s)
'

GEN2_GUARD='guard = "Array.isArray(r.cities) && r.cities.some((c: any) => !(\x27countrySource\x27 in c))"'
NESTED_BODY='body = "for (const c of r.cities) { if (!(\x27countrySource\x27 in c)) c.countrySource = null; } sums.put(r, r.id);"'
TOP_BODY='body = "sums.put({ ...r, daysTravelled: r.dayCount }, r.id);"'

G21N="$PRE$GEN2_GUARD"'
'"$NESTED_BODY$POST"
G21T="$PRE$GEN2_GUARD"'
'"$TOP_BODY$POST"
G22="$PRE"'guard = "!(\x27summaryVersion\x27 in r)"
'"$TOP_BODY$POST"
G23="$PRE"'guard = "r.revision === 0"
'"$TOP_BODY$POST"
G23C="$PRE"'guard = "r.revision === 1"
'"$TOP_BODY$POST"

ARMS='--test-name-pattern=6b-1b-(2|3):.STARTING.STATE'

run_fault "G21t — gen-2 city-shape guard, TOP-LEVEL widening (vacuity control: expect RED — the guard is live)" \
  "$G21T" RED "$ARMS $TEST"
run_fault "G21n — the SAME guard, widening the cities[] ENTRY (A-39 Part 10 says: expect RED)" \
  "$G21N" RED "$ARMS $TEST"
run_fault "G21n — against the WHOLE gate (expect RED)" "$G21N" RED
run_fault "G22 — \`!('summaryVersion' in r)\`: the gen-1-only guard (expect RED)" \
  "$G22" RED "$ARMS $TEST"
run_fault "G23c — \`r.revision === 1\` (vacuity control: expect RED — the guard shape is live)" \
  "$G23C" RED "$ARMS $TEST"
run_fault "G23 — \`r.revision === 0\`: Axis C's revision ZERO cell (A-39 Part 4 says: expect RED)" \
  "$G23" RED "$ARMS $TEST"

say "summary"
if [ -n "$MISMATCH" ]; then
  echo "  MEASURED != EXPECTED:$MISMATCH"
else
  echo "  every run measured the colour A-39 Part 10 requires"
fi
[ "$UNRUN" -gt 0 ] && echo "  $UNRUN fault(s) UNRUN — anchors drifted"
say "done"
[ "$UNRUN" -gt 0 ] && exit 1
[ -n "$MISMATCH" ] && exit 1
exit 0
