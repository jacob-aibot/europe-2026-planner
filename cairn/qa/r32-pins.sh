#!/usr/bin/env bash
# QA round 32 — A-39 Part 6's THREE PINS, each broken on purpose, independently of BUILD-NOTES.
#
#   Run: bash qa/r32-pins.sh          (from cairn/)
#
# A-39 Part 6 names three pins that are supposed to make the generation ledger fail loudly:
#
#   pin 1  `LEDGER.at(-1).version === SUMMARY_VERSION`   — bumping the constant without the ledger
#   pin 2  `deepEqual(ageRow(fresh, currentGen), fresh)` — ageing to current is the IDENTITY
#   pin 3  every generation's key set = ROW_KEYS minus its cumulative removals
#
# A pin that does not fire is worse than no pin, so each is broken here and the colour recorded.
# The last two mutations are the breaker's own, not BUILD-NOTES': P2-COERCE asks whether pin 2
# is as strong as its STATED PURPOSE (*"the helper cannot silently mangle the shape it claims to
# reproduce"*) as opposed to its printed code, and DEV2 checks that BUILD-NOTES deviation (2)'s
# null-guard on G19 is a reachability fix rather than a neutered fault.
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

PINS='--test-name-pattern=A-39.pin'

# pin 1 — bump SUMMARY_VERSION in CORE and leave the ledger alone.
P1='
import sys
root = sys.argv[1]
p = root + "/packages/core/src/derive/summary.ts"
s = open(p).read()
a = "export const SUMMARY_VERSION = 4;"
assert a in s, "shape moved (SUMMARY_VERSION)"
open(p, "w").write(s.replace(a, "export const SUMMARY_VERSION = 5;", 1))
'

# pin 2 — make `ageRow` write a value it is forbidden to write.
P2='
import sys
root = sys.argv[1]
p = root + "/test/stats-storage.test.ts"
s = open(p).read()
a = "  if (gen.version !== null) row.summaryVersion = gen.version;"
assert a in s, "shape moved (ageRow assignment)"
open(p, "w").write(s.replace(a, "  row.cityCount = 0;\n" + a, 1))
'

# pin 3 — make `ageRow` ADD a key, which A-39 Part 6 forbids outright.
P3='
import sys
root = sys.argv[1]
p = root + "/test/stats-storage.test.ts"
s = open(p).read()
a = "  if (gen.version !== null) row.summaryVersion = gen.version;"
assert a in s, "shape moved (ageRow assignment)"
open(p, "w").write(s.replace(a, "  row.migratedAt = 1;\n" + a, 1))
'

# pin 3 — remove the DELETE loop entirely: version-only ageing, the fixture A-39 Part 6 forbids.
P3B='
import sys
root = sys.argv[1]
p = root + "/test/stats-storage.test.ts"
s = open(p).read()
a = "  for (const key of gen.absent) delete row[key];"
assert a in s, "shape moved (ageRow delete loop)"
open(p, "w").write(s.replace(a, "", 1))
'

# THE BREAKER\x27S OWN: pin 2 uses `assert.deepEqual`, which in Node is LOOSE. Coerce
# `summaryVersion` to a string in the ager. The shape it "claims to reproduce" is now wrong —
# a stored row would carry `summaryVersion: "4"` where the port writes `4`.
P2COERCE='
import sys
root = sys.argv[1]
p = root + "/test/stats-storage.test.ts"
s = open(p).read()
a = "  if (gen.version !== null) row.summaryVersion = gen.version;"
assert a in s, "shape moved (ageRow assignment)"
open(p, "w").write(s.replace(a, "  if (gen.version !== null) row.summaryVersion = String(gen.version);", 1))
'

run_fault "pin 1 — SUMMARY_VERSION bumped to 5, ledger untouched (expect RED)" "$P1" RED "$PINS $TEST"
run_fault "pin 2 — ageRow WRITES a value (\`row.cityCount = 0\`) (expect RED)" "$P2" RED "$PINS $TEST"
run_fault "pin 3 — ageRow ADDS a key (\`row.migratedAt = 1\`) (expect RED)" "$P3" RED "$PINS $TEST"
run_fault "pin 3 — ageRow's DELETE LOOP removed: version-only ageing (expect RED)" "$P3B" RED "$PINS $TEST"
run_fault "pin 2 — ageRow COERCES summaryVersion to a STRING (A-39 Part 6's stated purpose says: expect RED)" \
  "$P2COERCE" RED "$PINS $TEST"
run_fault "pin 2 — the same coercion, against the WHOLE gate (expect RED)" "$P2COERCE" RED

# BUILD-NOTES deviation (2): is the null-guard a REACHABILITY fix or a neutered fault? Build G19
# with A-39 Part 9's literal text (no `?.`) and see whether it throws rather than measuring.
DEV2='
import sys
root = sys.argv[1]
guard = "r.countryCodes.length === 0"
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
  "                  if (" + guard + ") sums.put({ ...r, daysTravelled: r.dayCount }, r.id);\n"
  "                }\n"
  "              };\n" + loop, 1)
open(p, "w").write(s)
'
run_fault "deviation (2) — G19 with A-39 Part 9's LITERAL text, no null-guard (expect RED either way; read the reason)" \
  "$DEV2" RED '--test-name-pattern=6b-1b-(2|3):.STARTING.STATE '"$TEST"

say "summary"
if [ -n "$MISMATCH" ]; then
  echo "  MEASURED != EXPECTED:$MISMATCH"
else
  echo "  every pin fired"
fi
[ "$UNRUN" -gt 0 ] && echo "  $UNRUN mutation(s) UNRUN — anchors drifted"
say "done"
[ "$UNRUN" -gt 0 ] && exit 1
[ -n "$MISMATCH" ] && exit 1
exit 0
