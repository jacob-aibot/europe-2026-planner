#!/usr/bin/env bash
# A-38 (revision 27, QA R30-1) — **exit criterion 6's 6b-1b arms, attacked past G1..G12.**
#
#   Run: bash qa/a38-exit6d.sh          (from cairn/)
#
# `qa/i7a-exit6b.sh` builds G1..G6 and `qa/r30-exit6c.sh` builds G7..G12. This harness is the
# same shape and builds ARCHITECTURE §8.4 **A-38 Part 7**'s three, all of which live in
# `ensureReady()` — the port's third write path, the one that only executes against a database
# that ALREADY HOLDS RECORDS, which is every page load after the first:
#
#   G12  the widening applied to EVERY summary row from inside the upcast ("while we are in
#        here, bring the summaries current"). Round 30's own fault, rebuilt here so this
#        harness stands alone. Must be RED — 6b-1b arms 2, 3, 4 and 5.
#   G13  the SAME widening placed INSIDE THE STAMPING BRANCH, so it fires only for a document
#        with no envelope version. **This is the fault A-38 turns on.** Must be RED, and red by
#        6b-1b arms 3 and 4 and nothing else in the repo — which is what the two scoped
#        measurements below establish rather than assert.
#   G14  `ensureReady` stamps a record it should have skipped (the `have.has(...) continue`
#        removed), moving a fence the port was handed. Must be RED — arms 2 and 4, via the
#        byte-identical `StorageVersion` assertion (§0.6, §4.3 A-30 applied to the upcast).
#
# The two scoped G13 runs are the quantitative half of the ruling, and they are expected GREEN:
# under the pre-A-38 gate shape (arm 1 alone, the empty-database arm) and under 6b-2's two
# surviving assertions, G13 is invisible. That is R30-1, measured, and it is why the seeded arms
# exist. A run whose measured colour differs from its stated expectation is reported at the end.
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

# The three faults, as python heredocs, reused verbatim across the scoped runs so that what is
# measured under a narrow scope is the SAME source as what is measured under the whole file.
# ---------------------------------------------------------------------------
G12='
import sys
p = sys.argv[1] + "/apps/web/src/ports/storage.ts"
s = open(p).read()
old = "          const tx = db.transaction([DOCS, VERSIONS], \x27readwrite\x27);\n          const versions = tx.objectStore(VERSIONS);"
assert old in s, "shape moved (ensureReady tx)"
s = s.replace(old, "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], \x27readwrite\x27);\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);", 1)
old2 = "              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;"
assert old2 in s, "shape moved (upcast loop)"
s = s.replace(old2, """              const all = sums.getAll() as IDBRequest<TripSummaryRow[]>;
              all.onsuccess = () => {
                for (const r of all.result) {
                  sums.put({ ...r, countriesVisited: r.countryCodes.length, daysTravelled: r.dayCount }, r.id);
                }
              };
""" + old2, 1)
open(p, "w").write(s)
'

# G13 — the widening fires ONLY for a document with no envelope version. One `sums.get`/
# `sums.put` pair after the existing `versions.put(mintVersion(), key)`, inside the branch the
# `continue` above guards. `objectStore(SUMMARIES).put` is still written exactly twice in the
# file, so 6b-2's pinned site count and its bare-identifier capture are both untouched.
G13='
import sys
p = sys.argv[1] + "/apps/web/src/ports/storage.ts"
s = open(p).read()
old = "          const tx = db.transaction([DOCS, VERSIONS], \x27readwrite\x27);\n          const versions = tx.objectStore(VERSIONS);"
assert old in s, "shape moved (ensureReady tx)"
s = s.replace(old, "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], \x27readwrite\x27);\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);", 1)
old2 = "                versions.put(mintVersion(), key);"
assert old2 in s, "shape moved (the stamping branch)"
s = s.replace(old2, """                versions.put(mintVersion(), key);
                const one = sums.get(String(key)) as IDBRequest<TripSummaryRow>;
                one.onsuccess = () => {
                  const r = one.result;
                  sums.put({ ...r, countriesVisited: r.countryCodes.length, daysTravelled: r.dayCount }, String(key));
                };""", 1)
open(p, "w").write(s)
'

# G14 — the fence the port was HANDED is overwritten. Loss of a stored value, not a widening:
# only an arm that seeded a version and compares it byte-for-byte afterwards can see it.
G14='
import sys
p = sys.argv[1] + "/apps/web/src/ports/storage.ts"
s = open(p).read()
old = "              for (const key of docKeys.result) {\n                if (have.has(String(key))) continue;\n"
assert old in s, "shape moved (upcast skip)"
s = s.replace(old, "              for (const key of docKeys.result) {\n", 1)
open(p, "w").write(s)
'

# ---------------------------------------------------------------------------
run_fault "G12 — the widening applied to EVERY summary row from inside the upcast (expect: RED)" "$G12" RED

# ---------------------------------------------------------------------------
run_fault "G13 — the widening INSIDE THE STAMPING BRANCH: fires only for a versionless record (expect: RED)" "$G13" RED

# ---------------------------------------------------------------------------
# The quantitative half. Same fault, narrower scopes — what the repo had BEFORE A-38.
run_fault "G13 under the PRE-A-38 GATE SHAPE — 6b-1b arm 1 (empty database) alone (expect: GREEN — this is R30-1)" \
  "$G13" GREEN "--test-name-pattern=6b-1b-1 $TEST"

run_fault "G13 under 6b-2's two surviving assertions alone (expect: GREEN — a tripwire cannot see a value)" \
  "$G13" GREEN "--test-name-pattern=tripwire.6b-2 $TEST"

# ---------------------------------------------------------------------------
run_fault "G14 — the upcast stamps a record it should have skipped, moving a fence (expect: RED)" "$G14" RED

say "summary"
if [ -n "$MISMATCH" ]; then
  echo "  MEASURED != EXPECTED:$MISMATCH"
else
  echo "  every run measured the colour A-38 Part 7 states"
fi
[ "$UNRUN" -gt 0 ] && echo "  $UNRUN fault(s) UNRUN — anchors drifted"
say "done"
[ "$UNRUN" -gt 0 ] && exit 1
[ -n "$MISMATCH" ] && exit 1
exit 0
