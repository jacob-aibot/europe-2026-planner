#!/usr/bin/env bash
# QA round 66 — A-88 Part 4's covering claim, at ALL FOUR of its denominators.
#
#   bash qa/r66-axes.sh [commit]        # run from `cairn/`; default HEAD
#
# A-88 Part 4: "a covering claim over a reader names every record class that reader descends
# into, and each class is denominated by a constant the compiler maintains." `I-28` Part 4 adds
# the two missing axes — `Record<keyof TripSummaryRow['attribution'], true>` and
# `Record<keyof AttributionCensus, true>` — beside the two that were already there.
#
# This is `qa/r65-axes.sh` with two things added: the fourth injection (a key on
# `TripSummaryCity`, which round 65 never ran because it was not the class in dispute), and an
# **assertion that each injection applied**. Round 65's three used `python3 … s.replace(old, new)`
# with no check; a `replace` that matches nothing rewrites the file unchanged, the run reports
# "tsc clean" and that IS the finding shape those injections were looking for — so an unapplied
# mutant there would have manufactured a MAJOR. All four below abort instead.
#
# The question each asks: when a key is added to a stored record class the reader descends into,
# does `tsc` point INSIDE the covering table (`test/stats-storage.test.ts`)?
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
CAIRN="$PWD"
ROOT="$(cd .. && pwd)"
COMMIT="${1:-HEAD}"
TMP="$(mktemp -d)"
WT="$TMP/r66-axes"

cleanup() { cd "$ROOT"; git worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

git -C "$ROOT" worktree add --detach "$WT" "$COMMIT" >/dev/null 2>&1 || { echo "could not create worktree at $COMMIT"; exit 1; }
cp -R "$CAIRN/node_modules" "$WT/cairn/node_modules"
node -e "require.resolve('@cairn/core', {paths:['$WT/cairn']})" >/dev/null 2>&1 \
  || { echo "ABORT: @cairn/core does not resolve inside the worktree — it would audit the live tree"; exit 1; }

SUMMARY="$WT/cairn/packages/core/src/derive/summary.ts"
reset() { git -C "$WT" checkout -- cairn >/dev/null 2>&1; }

# Insert <new> after the first occurrence of <anchor>, and ABORT if <anchor> is not there.
inject() { python3 -c '
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
if sys.argv[2] not in s:
    sys.stderr.write("INJECTION DID NOT APPLY: %r\n" % sys.argv[2][:70]); sys.exit(3)
p.write_text(s.replace(sys.argv[2], sys.argv[2] + sys.argv[3], 1))' "$@" \
  || { echo "  ABORT: injection did not apply — the literal moved"; exit 3; }; }

run() {   # run <label>
  local label="$1" tc
  tc=$( (cd "$WT/cairn" && npx tsc -p tsconfig.json --noEmit 2>&1); echo "exit:$?" )
  if grep -q 'exit:0' <<<"$tc"; then
    printf '  %-46s tsc CLEAN   <-- nothing demands a cell for it\n' "$label"
  else
    local sites; sites=$(grep -oP '^\S+\.tsx?' <<<"$tc" | sort -u | tr '\n' ' ')
    if grep -q 'test/stats-storage.test.ts' <<<"$sites"; then
      printf '  %-46s tsc ERRORS  INSIDE the covering table: %s\n' "$label" "$sites"
      # WHERE in that file — a fixture literal is not the covering table, and A-88 Part 4's own
      # repro turns on the difference. `ROW_KEYS`, `ROW_TABLE`, `CITY_TABLE` and the two new
      # `Record<keyof …, true>` axes are the table; anything else in the file is not.
      grep -oP '^test/stats-storage\.test\.ts\(\d+' <<<"$tc" | sort -u -t'(' -k2 -n | while read -r site; do
        ln="${site##*(}"
        printf '        %s: %s\n' "$site" "$(sed -n "${ln}p" "$WT/cairn/test/stats-storage.test.ts" | cut -c1-90)"
      done
    else
      printf '  %-46s tsc ERRORS  but NOT in the covering table: %s\n' "$label" "$sites"
    fi
  fi
}

echo "== control — $COMMIT unmodified"
run "no injection"

echo
echo "== axis 1 — a sixteenth key on \`TripSummaryRow\` (denominated by ROW_KEYS since I-12)"
reset
inject "$SUMMARY" 'export type TripSummaryRow = {' '
  /** injected by qa/r66-axes.sh */
  homeCode: string;'
run "TripSummaryRow.homeCode"

echo
echo "== axis 2 — an eighth key on \`TripSummaryCity\` (denominated since A-87 Part 7)"
reset
inject "$SUMMARY" 'export type TripSummaryCity = {' '
  /** injected by qa/r66-axes.sh */
  nickname: string;'
run "TripSummaryCity.nickname"

echo
echo "== axis 3 — a third census class on the \`attribution\` CONTAINER (NEW at I-28 Part 4)"
reset
python3 - "$SUMMARY" <<'PY' || { echo "  ABORT: injection did not apply"; exit 3; }
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
decl = "attribution: { places: AttributionCensus; stops: AttributionCensus };"
mint = "attribution: { places, stops },"
if decl not in s or mint not in s:
    sys.stderr.write("INJECTION DID NOT APPLY\n"); sys.exit(3)
s = s.replace(decl, "attribution: { places: AttributionCensus; stops: AttributionCensus; days: AttributionCensus };", 1)
s = s.replace(mint, "attribution: { places, stops, days: { located: 0, attributed: 0 } },", 1)
p.write_text(s)
PY
run "attribution.days added AND minted"

echo
echo "== axis 4 — a third number on \`AttributionCensus\` (NEW at I-28 Part 4)"
reset
inject "$SUMMARY" 'export type AttributionCensus = {' '
  /** injected by qa/r66-axes.sh */
  disputed: number;'
run "AttributionCensus.disputed"
echo "  (round 65 measured this one tsc-CLEAN once every named site was satisfied; the axis"
echo "   I-28 Part 4 adds is what is supposed to make it point at the table instead)"

reset
echo
echo "COMPLETE"
