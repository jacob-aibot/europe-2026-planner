#!/usr/bin/env bash
# A-39 (revision 28, QA R31-1) — **exit criterion 6's 6b-1b arms, attacked past G1..G14.**
#
#   Run: bash qa/a39-exit6e.sh          (from cairn/)
#
# `qa/i7a-exit6b.sh` builds G1..G6, `qa/r30-exit6c.sh` builds G7..G12 and `qa/a38-exit6d.sh`
# builds G12..G14. This harness is the same shape and builds ARCHITECTURE §8.4 **A-39 Part 9**'s
# five — **one per axis state the covering set of A-39 Part 5 exists to reach**, so the cover is
# *demonstrated* rather than asserted. Every one of them is the transaction-scope widening G12
# already makes, with a different guard on the put:
#
#   G16  `r.summaryVersion < SUMMARY_VERSION` — "while we are in here, bring stale rows
#        current." **This is R31-1's own H4.** Must be RED — arms 2 and 3, on the gen-2/gen-3
#        records. Proves Axis S's below-current states are live.
#   G17  `!('attribution' in r)` — a KEY-PRESENCE guard, no version read at all. Must be RED.
#        Proves the ageing is SHAPE-FAITHFUL rather than version-stamped: a fixture aged by
#        setting a number alone is green here, which is why A-39 Part 6 forbids one.
#   G18  `r.summaryVersion !== SUMMARY_VERSION`. Must be RED — and it fires on **gen-future** as
#        well, which is what makes gen-future a distinct state from stale (`<` vs `!==`).
#   G19  `r.countryCodes?.length === 0`. Must be RED — Axis C's zero cell.
#   G20  `attribution.stops.attributed < attribution.stops.located`. Must be RED — Axis C's
#        third cell, the one neither `rich` nor `degenerate` reaches.
#
# **The negative measurements are the quantitative half, and they are expected GREEN.** A fault
# that would be caught anyway proves nothing about the axis it was added for (A-39 Part 9), so:
#
#   - every one of the five is GREEN under the **pre-A-38 gate shape** (arm 1 alone, the
#     empty-database arm) and under **6b-2's two surviving assertions** — a tripwire cannot see
#     a value;
#   - **G16 is GREEN under the pre-A-39 gate shape** — A-38's same five arms, seeded with
#     *freshly minted* rows. That is R31-1 itself, measured: the mechanism was not short an arm,
#     the fixtures were all current.
#
# G17's *"green against version-only-aged fixtures"* and G19/G20's *"green against rich-only
# fixtures"* are asserted **inside the suite** rather than measured here, because they must hold
# on every run and not only when someone remembers to run a shell script — see the three
# `exit 6b-1b: … is GREEN against …` tests in `test/stats-storage.test.ts`.
#
# A fault that produces `# fail 0` where RED was expected is a fault exit criterion 6 does not
# catch. An anchor that no longer applies is **UNRUN** and exits non-zero (R29-4's own rule):
# a fault that silently did not apply reads as a pass.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"
TEST='test/stats-storage.test.ts'
UNRUN=0
MISMATCH=""

say() { printf '\n== %s ==\n' "$1"; }

# $1 label   $2 python fault script   $3 expected colour (RED|GREEN)   $4 node --test scope
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

# ---------------------------------------------------------------------------
# The five faults. Each is generated from one shared template so that what differs between them
# is EXACTLY the guard — which is A-39 Part 9's claim, expressed as code rather than asserted.
# `SUMMARY_VERSION` is read out of core, so the two version guards cannot go stale silently.
# ---------------------------------------------------------------------------
PRE='
import sys, re
root = sys.argv[1]
sv = re.search(r"^export const SUMMARY_VERSION = (\d+);$",
               open(root + "/packages/core/src/derive/summary.ts").read(), re.M)
assert sv, "SUMMARY_VERSION could not be read from core"
SV = sv.group(1)
guard = '

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
  "                for (const r of all.result) {\n"
  "                  if (" + guard + ") sums.put({ ...r, daysTravelled: r.dayCount }, r.id);\n"
  "                }\n"
  "              };\n" + loop, 1)
open(p, "w").write(s)
'

G16="$PRE"'"r.summaryVersion < " + SV'"$POST"
G17="$PRE"'"!(\x27attribution\x27 in r)"'"$POST"
G18="$PRE"'"r.summaryVersion !== " + SV'"$POST"
G19="$PRE"'"r.countryCodes?.length === 0"'"$POST"
G20="$PRE"'"!!r.attribution && r.attribution.stops.attributed < r.attribution.stops.located"'"$POST"

# ---------------------------------------------------------------------------
# The positives: every one of the five must be caught by the covering table.
#
# Measured TWICE, and the second is the one that means something. A whole-file run is red partly
# for a bookkeeping reason — the in-file vacuity controls build their own faulted source from the
# shipped port, and in a pre-faulted worktree their anchors no longer apply, which is R29-4's
# UNRUN rule firing exactly as designed. So each fault is ALSO measured against the two seeded
# arms alone (`ARMS`), where a red can only mean *the covering table caught the widening*.
# ---------------------------------------------------------------------------
ARMS='--test-name-pattern=6b-1b-(2|3):.STARTING.STATE'

run_fault "G16 — \`summaryVersion < SUMMARY_VERSION\`: R31-1's own H4, WHOLE GATE (expect: RED)" "$G16" RED
run_fault "G16 — against the two SEEDED ARMS alone (expect: RED — the covering table caught it)" "$G16" RED "$ARMS $TEST"
run_fault "G17 — \`!('attribution' in r)\`: a KEY-PRESENCE guard, no version read (expect: RED)" "$G17" RED "$ARMS $TEST"
run_fault "G18 — \`summaryVersion !== SUMMARY_VERSION\`: fires on gen-future too (expect: RED)" "$G18" RED "$ARMS $TEST"
run_fault "G19 — \`countryCodes.length === 0\`: Axis C's zero cell (expect: RED)" "$G19" RED "$ARMS $TEST"
run_fault "G20 — \`stops.attributed < stops.located\`: Axis C's third cell (expect: RED)" "$G20" RED "$ARMS $TEST"

# ---------------------------------------------------------------------------
# The negatives, part 1: the pre-A-38 gate shape (arm 1 alone) and 6b-2. All GREEN.
# ---------------------------------------------------------------------------
run_fault "G16 under the PRE-A-38 GATE SHAPE — 6b-1b arm 1 (empty database) alone (expect: GREEN)" \
  "$G16" GREEN "--test-name-pattern=6b-1b-1 $TEST"
run_fault "G17 under the PRE-A-38 GATE SHAPE — arm 1 alone (expect: GREEN)" \
  "$G17" GREEN "--test-name-pattern=6b-1b-1 $TEST"
run_fault "G18 under the PRE-A-38 GATE SHAPE — arm 1 alone (expect: GREEN)" \
  "$G18" GREEN "--test-name-pattern=6b-1b-1 $TEST"
run_fault "G19 under the PRE-A-38 GATE SHAPE — arm 1 alone (expect: GREEN)" \
  "$G19" GREEN "--test-name-pattern=6b-1b-1 $TEST"
run_fault "G20 under the PRE-A-38 GATE SHAPE — arm 1 alone (expect: GREEN)" \
  "$G20" GREEN "--test-name-pattern=6b-1b-1 $TEST"

run_fault "G16 under 6b-2's two surviving assertions alone (expect: GREEN — a tripwire cannot see a value)" \
  "$G16" GREEN "--test-name-pattern=tripwire.6b-2 $TEST"

# ---------------------------------------------------------------------------
# The negative that IS R31-1: the **pre-A-39 gate shape**. A-38's same five arms, with the same
# per-arm assertions, seeded with FRESHLY MINTED rows instead of aged ones. The seed keeps its
# 8/7 split and its 15 documents; only Axis S collapses to `gen-4`. G16 is invisible to it.
#
# The two "INCONCLUSIVE: the seeded generations…" assertions come out with the ageing, because
# they are the assertions that NAME the degradation — leaving them in would measure them rather
# than the fault. Both anchors are asserted, so a drifted anchor is UNRUN rather than a pass.
# ---------------------------------------------------------------------------
PRE_A39_G16="$G16"'
q = root + "/test/stats-storage.test.ts"
t = open(q).read()
aged = "      summary: ageRow(tripSummary(trip, COUNTRY_INDEX), gen),\n      version: cell.v === \x27present\x27 ? SEEDED_FENCE : null,\n      gen,"
assert aged in t, "shape moved (coveringSeed)"
t = t.replace(aged, "      summary: tripSummary(trip, COUNTRY_INDEX),\n      version: cell.v === \x27present\x27 ? SEEDED_FENCE : null,\n      gen: CURRENT_GEN,", 1)
for arm in ("2", "3"):
    incon = ("      assert.deepEqual(\n"
             "        records.map((r) => r.gen.name),\n"
             "        COVERING_SET.filter((c) => c.arm === " + arm + ").map((c) => c.s),\n"
             "        \x27INCONCLUSIVE: the seeded generations are not the ones the table assigns to arm " + arm + "\x27,\n"
             "      );\n")
    assert incon in t, "shape moved (arm " + arm + " inconclusiveness assertion)"
    t = t.replace(incon, "", 1)
open(q, "w").write(t)
'

run_fault "G16 under the PRE-A-39 GATE SHAPE — A-38's five arms with FRESHLY MINTED rows (expect: GREEN — THIS IS R31-1)" \
  "$PRE_A39_G16" GREEN "$ARMS $TEST"

say "summary"
if [ -n "$MISMATCH" ]; then
  echo "  MEASURED != EXPECTED:$MISMATCH"
else
  echo "  every run measured the colour A-39 Part 9 states"
fi
[ "$UNRUN" -gt 0 ] && echo "  $UNRUN fault(s) UNRUN — anchors drifted"
say "done"
[ "$UNRUN" -gt 0 ] && exit 1
[ -n "$MISMATCH" ] && exit 1
exit 0
