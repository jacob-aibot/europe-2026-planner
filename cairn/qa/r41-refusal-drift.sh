#!/usr/bin/env bash
# QA round 41 — R41-13. Does the refusal duplication guard catch what it is said to catch?
#
#   Run: bash qa/r41-refusal-drift.sh          (from cairn/; bare Node, no browser, no server)
#
# `apps/web/src/views/Refusal.tsx`'s header and the I-8b BUILD-NOTES row both describe
# `test/views.test.ts` as asserting that *"every sentence this component renders appears verbatim
# in `WorldMap.tsx`"*. It asserts that **three hardcoded strings** appear in **both** files. This
# script mutates `Refusal.tsx` three ways in a throwaway worktree and reads the colour:
#
#   (a) reword one of the three listed sentences        -> expected RED   (the described case)
#   (b) add a fourth sentence WorldMap.tsx does not have -> measured GREEN (the gap)
#   (c) invert the `rowId` conditional, so the Profile
#       prints "trip undefined is not readable"          -> measured GREEN (the worse gap)
#
# (b) and (c) leave all three listed sentences present, which is all the assertion looks at.
# A GREEN on (a) or a RED on (b)/(c) means this finding is stale and should be re-derived.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
ROOT="$(git rev-parse --show-toplevel)"
REF="$(git rev-parse HEAD)"
WT="$(mktemp -d)/wt"

cleanup() { cd "$ROOT" || exit; git worktree remove --force "$WT" >/dev/null 2>&1; }
trap cleanup EXIT

git worktree add --detach "$WT" "$REF" >/dev/null 2>&1 || { echo "could not make a worktree"; exit 1; }
ln -sfn "$ROOT/cairn/node_modules" "$WT/cairn/node_modules"
cd "$WT/cairn" || exit 1

FILE=apps/web/src/views/Refusal.tsx

run() { node --test test/views.test.ts 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' '; }
colour() { case "$1" in *"# fail 0"*) echo GREEN;; *) echo RED;; esac; }

printf '\n== baseline, unmutated ==\n'
B="$(run)"; printf '  %s -> %s\n' "$B" "$(colour "$B")"
[ "$(colour "$B")" = GREEN ] || { echo "  baseline is not green; the rest of this run means nothing"; exit 1; }

printf '\n== (a) reword a listed sentence in Refusal.tsx  [expected RED] ==\n'
sed -i 's/We could not read your travel history\./We were unable to read your travel history./' "$FILE"
A="$(run)"; printf '  %s -> %s\n' "$A" "$(colour "$A")"
git checkout -- "$FILE"

printf '\n== (b) add a sentence WorldMap.tsx does not have  [described as RED] ==\n'
perl -0pi -e 's{\{refusal\.message\}</p>}{{refusal.message}</p>\n        <p className="hint">Your other trips are unaffected.</p>}' "$FILE"
grep -q 'unaffected' "$FILE" || { echo "  mutation did not apply"; exit 1; }
Bm="$(run)"; printf '  %s -> %s\n' "$Bm" "$(colour "$Bm")"
git checkout -- "$FILE"

printf '\n== (c) invert the rowId branch in Refusal.tsx only  [described as RED] ==\n'
sed -i 's/^\( *\){refusal\.rowId$/\1{!refusal.rowId/' "$FILE"
grep -q '{!refusal.rowId' "$FILE" || { echo "  mutation did not apply"; exit 1; }
C="$(run)"; printf '  %s -> %s\n' "$C" "$(colour "$C")"
printf '  (with this mutation the Profile prints "The stored record for trip undefined is not\n'
printf '   readable." whenever there IS no row id, and the generic sentence whenever there is.)\n'
git checkout -- "$FILE"

printf '\n== verdict ==\n'
if [ "$(colour "$A")" = RED ] && [ "$(colour "$Bm")" = GREEN ] && [ "$(colour "$C")" = GREEN ]; then
  echo "  R41-13 REPRODUCED: the guard is a three-sentence allow-list, not an equivalence check."
  exit 1
fi
echo "  R41-13 did NOT reproduce — re-derive the finding before acting on it."
exit 0
