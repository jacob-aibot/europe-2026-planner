#!/usr/bin/env bash
# QA round 65 — the mutation battery behind `I-26`'s claims that are about a TEST rather than
# about the product. A-87 Part 7 says the closure claim is COVERAGE; a covering table only
# covers what its cells can detect, so each mutant below breaks one stated property of the
# reader or the channel and asks whether anything reddens.
#
# RED is what a live assertion looks like. GREEN on a mutant that breaks a stated claim is the
# finding.
#
#   usage:  bash qa/r65-mutants.sh [<commit>]        # run from `cairn/`; default HEAD
set -u
COMMIT="${1:-HEAD}"
TMP="$(mktemp -d)"
WT="$TMP/wt"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
trap 'git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$TMP"' EXIT

git -C "$REPO" worktree add "$WT" "$COMMIT" --detach >/dev/null 2>&1 || { echo "worktree failed"; exit 2; }
cp -a "$HERE/node_modules" "$WT/cairn/node_modules"
C="$WT/cairn"
real=$(node -e "console.log(require('fs').realpathSync('$C/node_modules/@cairn/core'))")
case "$real" in "$C"/*) ;; *) echo "ABORT: @cairn/core resolves to $real, outside the worktree"; exit 2;; esac
echo "worktree: $C  (@cairn/core -> $real)"

TS="$C/packages/core/src/derive/travelStats.ts"
CLI="$C/cli.ts"

# Exact-literal replacement, and it ABORTS if the text is not there. A mutant that silently
# fails to apply reads as GREEN and would be reported as a hole in the tests — round 65 caught
# itself doing exactly that with a `perl -0pi` whose backtick escaping never matched.
mut() { python3 -c '
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
if sys.argv[2] not in s:
    sys.stderr.write("MUTANT DID NOT APPLY: %r\n" % sys.argv[2][:70]); sys.exit(3)
p.write_text(s.replace(sys.argv[2], sys.argv[3], 1))' "$@" || { echo "  ABORT: mutant did not apply"; exit 3; }; }

suite() {   # suite — every file that could possibly hold the assertion
  local o
  o=$(cd "$C" && node --experimental-strip-types --test --test-reporter=tap \
        packages/core/test/absorption.test.ts packages/core/test/travelStats.test.ts \
        packages/client/test/row-stats-readable.test.ts test/stats-storage.test.ts test/cli.test.ts \
        2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' ')
  case "$o" in *"# fail 0"*) echo "GREEN  ($o)";; *) echo "RED    ($o)";; esac
}

restore() { git -C "$WT" checkout -- cairn; }

echo
echo "== baseline"
printf '  %-62s %s\n' "unmutated" "$(suite)"

echo
echo "== the CHANNEL's stated properties"

echo '-- M1  `absorbed` is returned in REVERSE order (A-87 Part 4: "in the canonical row order'
echo '        `travelStats` already computes … and within a row in the order the reader visits'
echo '        its fields. It is deterministic for the same reason every other output is")'
mut "$TS" '
    absorbed,
    unnamedCities,' '
    absorbed: absorbed.slice().reverse(),
    unnamedCities,'
printf '  %-62s %s\n' "absorbed reversed" "$(suite)"
restore

echo '-- M2  every absorption is stamped `kind: "field"` (the type says five kinds and the'
echo '        docstring assigns each a level)'
mut "$TS" 'absorbed.push({ rowId, path, kind });' "absorbed.push({ rowId, path, kind: 'field' });"
printf '  %-62s %s\n' "kind always 'field'" "$(suite)"
restore

echo '-- M3  the row is not named: `rowId` is blanked (A-87 Part 4: "THIS is what makes the row'
echo '        nameable without a throw")'
mut "$TS" 'absorbed.push({ rowId, path, kind });' "absorbed.push({ rowId: '', path, kind });"
printf '  %-62s %s\n' "rowId blanked" "$(suite)"
restore

echo
echo "== the READER's stated rules"

echo '-- M4  A-87 Part 3 rule 1: `seen.cities` stays the length of the STORED array, absorbed'
echo '        entries included ("the one number a builder would be tempted to adjust")'
mut "$TS" '    seenCities += g.cityRecords;' '    seenCities += g.cities.length;'
printf '  %-62s %s\n' "seen.cities excludes absorbed entries" "$(suite)"
restore

echo '-- M5  the `countryCodes[i]` ENTRY gate stops reporting (A-31 Part 5 residue 2, discharged'
echo '        by this ruling: a non-minted code is a `field` absorption)'
mut "$TS" "        else absorb(\`countryCodes[\${i}]\`, 'field');" '        else { /* silent again */ }'
printf '  %-62s %s\n' "countryCodes entry gate silent again" "$(suite)"
restore

echo '-- M6  A-87 Part 3 rule 1: a bad `name` beside a bad `centre` in ONE entry is TWO field'
echo '        absorptions. Mutant: the entry reports only its first'
mut "$TS" "        else if (rawCentre !== undefined && rawCentre !== null) absorb(\`cities[\${i}].centre\`, 'field');" "        else if (rawCentre !== undefined && rawCentre !== null && typeof rawName === 'string') absorb(\`cities[\${i}].centre\`, 'field');"
printf '  %-62s %s\n' "one absorption per entry, not one per value" "$(suite)"
restore

echo '-- M7  A-87 Part 3 rule 2: the date pair is ENTRY-scoped, at most one per entry. Mutant:'
echo '        report it at the FIELD level instead (two paths, two absorptions)'
mut "$TS" "        if (unreadableDays) absorb(\`cities[\${i}]\`, 'date');" "        if (isUnreadableDay(c.firstDay)) absorb(\`cities[\${i}].firstDay\`, 'date');
        if (isUnreadableDay(c.lastDay)) absorb(\`cities[\${i}].lastDay\`, 'date');"
printf '  %-62s %s\n' "date absorption reported per FIELD" "$(suite)"
restore

echo
echo "== the two BEHAVIOUR changes"

echo '-- M8  A-87 Part 5 control: `unnamedCities` is a CENSUS fact and stays travelled-only.'
echo '        Mutant: make it lifecycle-blind like the absorptions beside it'
perl -0pi -e "s/^  for \(const \{ g, row, a, b, done \} of travelled\) \{\$/  for (const { g, row, a, b, done } of [...travelled, ...gatedRows.filter((x) => !travelled.some((t) => t.g === x)).map((g) => ({ g, row: g.row, a: 0, b: 0, done: false }))]) {/m" "$TS"
printf '  %-62s %s\n' "unnamedCities counted for planned rows too" "$(suite)"
restore

echo '-- M9  A-87 Part 3 rule 5: the value arm is `undefined` AND `null`, uniformly. Mutant:'
echo '        treat `null` as a defect on `countryCodes` — the field the ruling names as the'
echo '        one a builder would carve out (N3 in the literal form the criterion could not run)'
perl -0pi -e "s/  if \(storedCodes !== undefined && storedCodes !== null\) \{/  if (storedCodes !== undefined) {\n    if (storedCodes === null) absorb('countryCodes', 'list');\n    else/" "$TS"
printf '  %-62s %s\n' "countryCodes: null treated as a defect" "$(suite)"
restore

echo
echo "== the SURFACE"

echo '-- M10 `cli.ts` prints only the FIRST path per row (the criterion says it names "the exact'
echo '        field it could not read")'
perl -0pi -e "s/\\\$\{paths\.join\(', '\)\}/\\\${paths[0]}/" "$C/cli.ts"
printf '  %-62s %s\n' "cli prints one path per row" "$(suite)"
restore

echo '-- M11 `cli.ts` names the wrong row (control: this MUST be RED)'
perl -0pi -e "s/out\(\`  trip \\\$\{rowId\}: unreadable stored values/out(\`  trip UNKNOWN: unreadable stored values/" "$C/cli.ts"
printf '  %-62s %s\n' "cli names UNKNOWN instead of the row id" "$(suite)"
restore
