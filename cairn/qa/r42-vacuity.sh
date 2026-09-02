#!/usr/bin/env bash
# R42 — independent re-derivation of the repair pass's "the i8b fault matrix was VACUOUS" claim,
# and of the fix that closes it.
#
#   Run: bash qa/r42-vacuity.sh            (from cairn/; bare Node, no browser, no server)
#
# Three measurements, none of which trusts `qa/i8b-faults.sh`'s own output:
#
#   A. The OLD `make_copy` (as shipped at 02b3259, no repo-root planner symlink), UNMUTATED,
#      running `test/views.test.ts` in a copy of the tree AT 02b3259. If the repair pass's
#      claim is true this is `# fail 1` with an ENOENT — a red before any mutation.
#   B. The NEW `make_copy` (with the symlink), UNMUTATED, at 02b3259 — must be green, which
#      isolates the symlink as the cause rather than something else about the copy.
#   C. The NEW `make_copy`, UNMUTATED, at HEAD — must be green, which is what `baseline_gate`
#      claims and what makes every RED below it meaningful.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
ROOT="$(cd "$CAIRN/.." && pwd)"
FAIL=0

# copy_from <src-cairn-dir> <link-planner: yes|no>
copy_from() {
  local src="$1" link="$2"
  local wt; wt="$(mktemp -d)/cairn"
  mkdir -p "$wt"
  local f
  for f in "$src"/*; do
    case "$(basename "$f")" in
      node_modules) cp -al "$f" "$wt/node_modules" 2>/dev/null || cp -r "$f" "$wt/node_modules" ;;
      *) cp -r "$f" "$wt/" ;;
    esac
  done
  rm -rf "$wt/apps/web/dist"
  if [ "$link" = yes ]; then
    for f in europe-2026-itinerary.html docs tickets; do
      [ -e "$ROOT/$f" ] && ln -sfn "$ROOT/$f" "$(dirname "$wt")/$f"
    done
  fi
  printf '%s' "$wt"
}

measure() {  # measure <label> <src> <link> <expected: green|red>
  local label="$1" src="$2" link="$3" want="$4"
  local wt; wt="$(copy_from "$src" "$link")"
  local raw; raw="$(cd "$wt" && node --test test/views.test.ts 2>&1)"
  local out; out="$(printf '%s' "$raw" | grep -E '^# (pass|fail)' | tr '\n' ' ')"
  local failed; failed="$(printf '%s' "$out" | sed -n 's/.*# fail \([0-9]*\).*/\1/p')"
  local got=green; [ "${failed:-1}" -gt 0 ] && got=red
  local enoent=''; printf '%s' "$raw" | grep -q 'ENOENT' && enoent=' (ENOENT seen)'
  if [ "$got" = "$want" ]; then
    printf '  ok    %-52s %s -> %s%s\n' "$label" "$want" "$out" "$enoent"
  else
    printf '  FAIL  %-52s want %s got %s -> %s%s\n' "$label" "$want" "$got" "$out" "$enoent"
    FAIL=$((FAIL + 1))
  fi
  rm -rf "$(dirname "$wt")"
}

WT02="${R42_WT_02B3259:-}"
if [ -z "$WT02" ] || [ ! -d "$WT02/cairn" ]; then
  echo "set R42_WT_02B3259 to a git worktree checked out at 02b3259 (its parent must hold the root planner)"
  exit 2
fi

printf '\n== A. the OLD copy, UNMUTATED, at 02b3259 — the vacuity claim ==\n'
measure 'no root planner in the copy' "$WT02/cairn" no red

printf '\n== B. the NEW copy, UNMUTATED, at 02b3259 — the symlink is the cause ==\n'
measure 'root planner symlinked in' "$WT02/cairn" yes green

printf '\n== C. the NEW copy, UNMUTATED, at HEAD — baseline_gate .s own claim ==\n'
measure 'root planner symlinked in' "$CAIRN" yes green

if [ "$FAIL" -gt 0 ]; then printf '\n%d FAIL\n\n' "$FAIL"; exit 1; fi
printf '\nALL AS EXPECTED\n\n'
