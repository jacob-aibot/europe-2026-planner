#!/usr/bin/env bash
# QA round 65 — A-87 Part 7's coverage claim, tested at its own denominators.
#
#   bash qa/r65-axes.sh [commit]        # run from `cairn/`; default HEAD
#
# The claim: "The row axis is `ROW_KEYS` … and the city axis is its new sibling
# `Record<keyof TripSummaryCity, true>` … Both are exhaustive by type, so **a field added to
# either record breaks the build until the table has a row for it**."
#
# The reader descends into FOUR stored record classes, not two: `TripSummaryRow`,
# `TripSummaryCity`, the `attribution` container `{places, stops}`, and `AttributionCensus`
# `{located, attributed}` — and it gates the last one PER KEY, by name, emitting
# `attribution.places.located` absorptions. This injects one field into each of the two the
# table does not denominate, and prints WHERE tsc points. `ROW_KEYS` (M3, the control) is
# inside the covering table; nothing M1 or M2 names is.
#
# Everything happens in a throwaway `git worktree`; the live tree is never touched. It aborts
# unless `@cairn/core` resolves inside the worktree (round 61 paid for a symlinked
# `node_modules` silently auditing the live tree).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
CAIRN="$PWD"
ROOT="$(cd .. && pwd)"
COMMIT="${1:-HEAD}"
TMP="$(mktemp -d)"
WT="$TMP/r65-axes"

cleanup() { cd "$ROOT"; git worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

git -C "$ROOT" worktree add --detach "$WT" "$COMMIT" >/dev/null 2>&1 || { echo "could not create worktree at $COMMIT"; exit 1; }
cp -R "$CAIRN/node_modules" "$WT/cairn/node_modules"
node -e "require.resolve('@cairn/core', {paths:['$WT/cairn']})" >/dev/null 2>&1 \
  || { echo "ABORT: @cairn/core does not resolve inside the worktree — it would audit the live tree"; exit 1; }

SUMMARY="$WT/cairn/packages/core/src/derive/summary.ts"
reset() { git -C "$WT" checkout -- cairn >/dev/null 2>&1; }

run() {   # run <label>
  local label="$1" tc tc_res tests pass fail
  tc=$( (cd "$WT/cairn" && npm run typecheck 2>&1); echo "exit:$?" )
  if grep -q 'exit:0' <<<"$tc"; then tc_res="clean"; else tc_res="ERRORS"; fi
  tests=$( (cd "$WT/cairn" && npm run test:tap 2>&1 | tail -40) )
  pass=$(grep -oP '^# pass \K\d+' <<<"$tests" | tail -1)
  fail=$(grep -oP '^# fail \K\d+' <<<"$tests" | tail -1)
  printf '  %-56s tsc %-6s   tests %s pass / %s fail\n' "$label" "$tc_res" "${pass:-?}" "${fail:-?}"
  if [ "$tc_res" = ERRORS ]; then
    echo "        tsc points at:"
    grep -oP '^\S+\.tsx?\(\d+,\d+\)' <<<"$tc" | sort -u | sed 's/^/          /'
  fi
}

echo "== control — $COMMIT unmodified"
run "no injection"

echo
echo "== M1 — a THIRD number on \`AttributionCensus\`, the class the reader gates PER KEY"
reset
python3 - "$SUMMARY" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
s = s.replace("export type AttributionCensus = {",
              "export type AttributionCensus = {\n  /** injected by qa/r65-axes.sh */\n  disputed: number;", 1)
open(p, 'w').write(s)
PY
run "AttributionCensus.disputed added"
# Satisfy every site tsc names, exactly as a builder adding a census number would: a literal
# gains `disputed: 0`, and `readCensus`'s return gains a hardcoded fallback. Then ask what is
# left owed. Nothing: no gate, no absorption path, no covering-table cell, and the suite is green.
python3 - "$WT/cairn" <<'PY'
import sys, pathlib, re
root = pathlib.Path(sys.argv[1])
pat = re.compile(r"\{\s*located:\s*([^,}]+),\s*attributed:\s*([^,}]+)\s*\}")
for p in list(root.rglob('*.ts')) + list(root.rglob('*.tsx')):
    if 'node_modules' in str(p): continue
    s = p.read_text()
    n = pat.sub(lambda m: "{ located: %s, attributed: %s, disputed: 0 }" % (m.group(1).strip(), m.group(2).strip()), s)
    n = n.replace("{ located: number; attributed: number }", "{ located: number; attributed: number; disputed: number }")
    n = n.replace("return { located, attributed };", "return { located, attributed, disputed: 0 };")
    if n != s: p.write_text(n)
PY
run "…every site tsc named, satisfied the obvious way"
echo "        ^ if this line is green, a stored census number reached the derivation UNGATED,"
echo "          unreported, and with no cell in the covering table — which M3 below cannot do."

echo
echo "== M2 — a THIRD census class on the \`attribution\` container"
reset
python3 - "$SUMMARY" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
s = s.replace("attribution: { places: AttributionCensus; stops: AttributionCensus };",
              "attribution: { places: AttributionCensus; stops: AttributionCensus; days: AttributionCensus };", 1)
s = s.replace("attribution: { places, stops },",
              "attribution: { places, stops, days: { located: 0, attributed: 0 } },", 1)
open(p, 'w').write(s)
PY
run "attribution.days added AND minted"

echo
echo "== M3 — the CONTROL: a sixteenth key on \`TripSummaryRow\`"
reset
python3 - "$SUMMARY" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
i = s.index("export type TripSummaryRow = {"); j = s.index("\n", i)
s = s[:j+1] + "  /** injected by qa/r65-axes.sh */\n  homeCode: string;\n" + s[j+1:]
open(p, 'w').write(s)
PY
run "TripSummaryRow.homeCode added"
echo "        ^ note \`test/stats-storage.test.ts\` in that list — that is \`ROW_KEYS\`, INSIDE"
echo "          the covering table. It is the mechanism A-87 Part 7 claims, and only M3 hits it."
reset
