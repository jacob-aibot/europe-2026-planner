#!/usr/bin/env bash
# QA round 33 — the VACUITY CONTROL `qa/i8a-faults.sh` does not run on itself.
#
#   Run: bash qa/r33-vacuity.sh      (from cairn/)
#
# `i8a-faults.sh` decides a mutant's colour with `if '# fail 0' then GREEN else RED`
# (line 58). That is "the suite failed", not "the named criterion failed". Three of its ten
# faults are scoped to `test/views.test.ts`, and BUILD-NOTES discloses that that suite has an
# unrelated failure inside a copied tree. If that is true, those three faults are measured by
# an instrument that reads RED with NO mutation applied at all — i.e. they are vacuous.
#
# This script makes the SAME throwaway copy the harness makes, applies NO mutation, and runs
# the same scope. A "# fail 0" here means the harness is sound. Anything else means three of
# the ten ship-gate faults prove nothing.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"

wt="$(mktemp -d)/cairn"; mkdir -p "$wt"
for f in "$CAIRN"/*; do
  case "$(basename "$f")" in
    node_modules) cp -al "$f" "$wt/node_modules" ;;
    *) cp -r "$f" "$wt/" ;;
  esac
done
rm -rf "$wt/apps/web/dist"

echo "== the UNMUTATED copy, at the harness's own \$VIEWS scope =="
out="$( cd "$wt" && node --test --test-reporter=tap test/views.test.ts 2>&1 | grep -E '^(not ok|# (pass|fail))' )"
echo "$out" | sed 's/^/  /'
if echo "$out" | grep -qE '^# fail 0$'; then
  echo "  measured: GREEN  -> the harness's RED/GREEN test is SOUND for the views-scoped faults"
  rc=0
else
  echo "  measured: RED with NO fault injected"
  echo "  *** i8a-faults.sh would score ALL THREE views-scoped faults RED even if the"
  echo "  *** injected fault were entirely green. Those three measurements are VACUOUS."
  rc=1
fi

echo
echo "== the same scope in the WORKING TREE (the control) =="
( cd "$CAIRN" && node --test --test-reporter=tap test/views.test.ts 2>&1 | grep -E '^(not ok|# (pass|fail))' ) | sed 's/^/  /'

echo
echo "== which test is it, and why does it fail only in a copy? =="
( cd "$wt" && node --test --test-reporter=tap test/views.test.ts 2>&1 | grep -A 12 '^not ok' | head -20 ) | sed 's/^/  /'

rm -rf "$(dirname "$wt")"
exit $rc
