#!/usr/bin/env bash
# QA round 40 — R33-4's control, re-run against `qa/i8j-faults.sh`.
#
#   Run: bash qa/r40-vacuity.sh            (from cairn/; bare Node, no browser, no server)
#
# `qa/i8f-faults.sh` grew a `baseline` step at I-8f (BUILD-NOTES **KD-78**) because an instrument
# that does not measure its own zero is not measuring. `qa/i8j-faults.sh`, written in the NEXT
# commit by the same builder, did **not** copy it — and it scopes its five G7′/G7″ faults (the
# whole MGR-1 half of I-8j) to `test/views.test.ts` alone.
#
# This script does two things and nothing else:
#
#   §1  Reproduces `i8j-faults.sh`'s own `make_copy` byte for byte and runs each targeted suite
#       **unmutated**. A suite that is already `# fail > 0` there makes every fault scoped to it
#       vacuous, because `fault()`'s only test is `failed > 0`.
#   §2  Re-runs the five views-scoped mutations against a copy that DOES carry the repo root's
#       read-only half, so the mutation's real colour is separable from the harness's noise
#       floor. This is the measurement `i8j-faults.sh` cannot currently make.
#
# Exit non-zero when §1 finds a non-zero noise floor, i.e. when a fault in that file is vacuous.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
ROOT="$(dirname "$CAIRN")"
BAD=0

# Byte-for-byte `i8j-faults.sh`'s make_copy (cairn/ alone, node_modules hard-linked).
make_copy_i8j() {
  local wt; wt="$(mktemp -d)/cairn"
  mkdir -p "$wt"
  local f
  for f in "$CAIRN"/*; do
    case "$(basename "$f")" in
      node_modules) cp -al "$f" "$wt/node_modules" ;;
      *) cp -r "$f" "$wt/" ;;
    esac
  done
  rm -rf "$wt/apps/web/dist"
  printf '%s' "$wt"
}

# `i8f-faults.sh`'s corrected make_copy: the repo root's read-only half beside it, copied.
make_copy_i8f() {
  local wt; wt="$(make_copy_i8j)"
  local parent; parent="$(dirname "$wt")"
  local f
  for f in europe-2026-itinerary.html docs tickets index.html manifest.json; do
    [ -e "$ROOT/$f" ] && cp -r "$ROOT/$f" "$parent/" 2>/dev/null
  done
  printf '%s' "$wt"
}

run() { (cd "$1" && shift && node --test "$@" 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' '); }
failcount() { printf '%s' "$1" | sed -n 's/.*# fail \([0-9]*\).*/\1/p'; }

printf '\n== 1. the noise floor of i8j-faults.sh'"'"'s own copy, UNMUTATED ==\n'
WT="$(make_copy_i8j)"
for s in test/views.test.ts packages/client/test/world-map.test.ts \
         packages/core/test/countryParts.test.ts packages/core/test/countryKeyPoint.test.ts; do
  out="$(run "$WT" "$s")"
  n="$(failcount "$out")"
  if [ "${n:-0}" -gt 0 ]; then
    printf '  VACUOUS BASE  %-46s %s\n' "$s" "$out"
    BAD=1
  else
    printf '  clean base    %-46s %s\n' "$s" "$out"
  fi
done
rm -rf "$(dirname "$WT")"

printf '\n== 2. the five views-scoped G7 mutations, measured against a copy that has a clean base ==\n'
mutate() { # <label> <python-body>
  local label="$1" py="$2"
  local wt; wt="$(make_copy_i8f)"
  ( cd "$wt" && python3 -c "
import sys
p='apps/web/src/styles.css'
s=open(p).read(); before=s
$py
if s==before: sys.exit('the mutation matched nothing')
open(p,'w').write(s)" ) || { printf '  SETUP FAILED  %s\n' "$label"; rm -rf "$(dirname "$wt")"; return; }
  local out; out="$(run "$wt" test/views.test.ts)"
  local n; n="$(failcount "$out")"
  if [ "${n:-0}" -gt 0 ]; then printf '  RED  (real)   %-52s %s\n' "$label" "$out"
  else printf '  GREEN (!!)    %-52s %s\n' "$label" "$out"; BAD=1; fi
  rm -rf "$(dirname "$wt")"
}

printf '  (baseline for this copy shape: '
WT2="$(make_copy_i8f)"; printf '%s)\n' "$(run "$WT2" test/views.test.ts)"; rm -rf "$(dirname "$WT2")"

mutate 'fault 1 — grid comes back' \
  "s=s.replace('  display: flex;\n  flex-wrap: wrap;','  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(var(--pane-min, 300px), 1fr));\n  align-items: start;')"
mutate 'fault 2 — the cell loses flex: 1 1 var(--pane-min)' \
  "s=s.replace('  flex: 1 1 var(--pane-min, 300px);\n','')"
mutate 'fault 3 — flex: 1 0 (grow, never shrink)' \
  "s=s.replace('flex: 1 1 var(--pane-min, 300px);','flex: 1 0 var(--pane-min, 300px);')"
mutate 'fault 4 — a 1 px border on .worldmap__pane' \
  "s=s.replace('  position: relative;\n  flex: 1 1','  position: relative;\n  border: 1px solid var(--line);\n  flex: 1 1')"
mutate 'fault 5 — grid-auto-flow: dense on the container' \
  "s=s.replace('  display: flex;\n  flex-wrap: wrap;','  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fill, minmax(var(--pane-min, 300px), 1fr));')"

printf '\n%s\n' "$([ $BAD -eq 0 ] && echo 'ALL CLEAR' || echo 'FINDING: i8j-faults.sh has a non-zero noise floor — see §1')"
exit $BAD
