#!/usr/bin/env bash
# QA round 64 — the mutation battery behind the two claims that are about a TEST rather than
# about the product: KD-116 ("the shipped line's own source text is lifted out and executed")
# and A-86 Part 6's `issuesForRef` tripwire ("it cannot pass vacuously").
#
# Each mutant is applied in a throwaway `git worktree` at the commit under test, never in the
# live tree. RED is what a live assertion looks like; GREEN on a mutant that breaks the claim
# is the finding.
#
#   usage:  bash qa/r64-mutants.sh [<commit>]
set -u
COMMIT="${1:-fcac762}"
WT="$(mktemp -d)/wt"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$HERE/.." && pwd)"

git -C "$REPO" worktree add "$WT" "$COMMIT" --detach >/dev/null 2>&1 || { echo "worktree failed"; exit 2; }
# Real (not symlinked-to-the-live-tree) module resolution: `node_modules/@cairn/*` are relative
# symlinks into `packages/`, so a copy resolves inside the worktree. Verified below.
cp -a "$HERE/node_modules" "$WT/cairn/node_modules"
C="$WT/cairn"
real=$(node -e "console.log(require('fs').realpathSync('$C/node_modules/@cairn/core'))")
case "$real" in "$C"/*) ;; *) echo "ABORT: @cairn/core resolves to $real, outside the worktree"; exit 2;; esac
echo "worktree: $C  (@cairn/core -> $real)"

run() {  # run <file> ; prints PASS/RED
  local f="$1"
  local o
  o=$(cd "$C" && node --test --test-reporter=tap "$f" 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' ')
  case "$o" in *"# fail 0"*) echo "GREEN  ($o)";; *) echo "RED    ($o)";; esac
}

restore() { git -C "$WT" checkout -- cairn; }

echo
echo "== baseline"
printf '  test/cli.test.ts          %s\n' "$(run test/cli.test.ts)"
printf '  test/stats-storage.test.ts %s\n' "$(run test/stats-storage.test.ts)"

echo
echo "== KD-116: can the shipped `cli.ts stats` line rot while `test/cli.test.ts` stays green?"

echo '-- M1  the three conditional lines are made UNREACHABLE (an early return above them)'
perl -0pi -e "s/(  if \(s\.unnamedCities\))/  return;\n\$1/" "$C/cli.ts"
printf '  test/cli.test.ts          %s   <- GREEN here means the pair of tests cannot see that the line never runs\n' "$(run test/cli.test.ts)"
restore

echo '-- M2  cmdStats prints NOTHING at all (its whole body replaced by a return)'
perl -0pi -e "s/(function cmdStats\(\) \{)/\$1\n  return;/" "$C/cli.ts"
printf '  test/cli.test.ts          %s   <- GREEN here means the end-to-end arm asserts only an ABSENCE\n' "$(run test/cli.test.ts)"
restore

echo "-- M3  the sentence itself is changed (control: this MUST be RED)"
perl -0pi -e "s/trips whose stored city list could not be read/trips we could not read/" "$C/cli.ts"
printf '  test/cli.test.ts          %s\n' "$(run test/cli.test.ts)"
restore

echo "-- M4  the field is read off the wrong name (control: this MUST be RED)"
perl -0pi -e "s/if \(s\.unreadableCityLists\)/if (s.unreadableCityDates)/" "$C/cli.ts"
printf '  test/cli.test.ts          %s\n' "$(run test/cli.test.ts)"
restore

echo
echo '== A-86 Part 6: can the issuesForRef tripwire pass VACUOUSLY?'

echo "-- M5  a REAL caller is added in packages/client/src (control: MUST be RED)"
perl -0pi -e "s/(export function issuesForRef)/const __probe = (d: unknown, id: string) => issuesForRef(d as never, id);\nvoid __probe;\n\$1/" "$C/packages/client/src/selectors/index.ts"
printf '  test/stats-storage.test.ts %s\n' "$(run test/stats-storage.test.ts)"
restore

echo "-- M6  a caller is added in a .tsx under apps/web/src (MUST be RED — the walk must read .tsx)"
mkdir -p "$C/apps/web/src/views" && printf 'export const x = () => issuesForRef(0 as never, "d1");\n' > "$C/apps/web/src/views/R64Scratch.tsx"
printf '  test/stats-storage.test.ts %s\n' "$(run test/stats-storage.test.ts)"
rm -f "$C/apps/web/src/views/R64Scratch.tsx"; restore

echo "-- M7  the SYMBOL is renamed (does the tripwire notice it is measuring nothing?)"
perl -0pi -e "s/\bissuesForRef\b/issuesForReference/g" "$C/packages/client/src/selectors/index.ts"
printf '  test/stats-storage.test.ts %s\n' "$(run test/stats-storage.test.ts)"
restore

echo "-- M8  the DECLARING FILE is moved (selectors/index.ts -> selectors/issues.ts)"
cp "$C/packages/client/src/selectors/index.ts" "$C/packages/client/src/selectors/issues.ts"
rm "$C/packages/client/src/selectors/index.ts"
printf '  test/stats-storage.test.ts %s\n' "$(run test/stats-storage.test.ts)"
rm -f "$C/packages/client/src/selectors/issues.ts"; restore

echo "-- M9  a caller is added in a file the walk does NOT read (.mjs beside the selector)"
printf 'export const x = () => issuesForRef(0, "d1");\n' > "$C/packages/client/src/selectors/caller.mjs"
printf '  test/stats-storage.test.ts %s   <- GREEN here means the walk is extension-scoped\n' "$(run test/stats-storage.test.ts)"
rm -f "$C/packages/client/src/selectors/caller.mjs"; restore

echo "-- M10 a caller is added in apps/web/src via a DYNAMIC property access (s['issuesForRef'])"
mkdir -p "$C/apps/web/src/views" && printf 'import * as s from "@cairn/client";\nexport const x = () => (s as never)["issues" + "ForRef"];\n' > "$C/apps/web/src/views/R64Dyn.tsx"
printf '  test/stats-storage.test.ts %s   <- GREEN here is expected: a dynamic access is outside a bare-identifier walk\n' "$(run test/stats-storage.test.ts)"
rm -f "$C/apps/web/src/views/R64Dyn.tsx"; restore

echo
echo "== N1 re-run: drop I-25's counter, keep everything else"
perl -0pi -e "s/    if \(storedCities !== undefined && storedCities !== null && !Array\.isArray\(storedCities\)\) \{\n      unreadableCityLists\+\+;\n    \}\n//" "$C/packages/core/src/derive/travelStats.ts"
printf '  packages/client/test/row-stats-readable.test.ts %s\n' "$(run packages/client/test/row-stats-readable.test.ts)"
printf '  packages/core/test/travelStats.test.ts         %s\n' "$(run packages/core/test/travelStats.test.ts)"
restore

echo
echo "cleaning up"
git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1
echo "COMPLETE"
