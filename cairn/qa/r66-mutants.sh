#!/usr/bin/env bash
# QA round 66 — the mutation battery for `I-28` (§8.4 A-88), and the RE-CUT of round 65's.
#
#   usage:  bash qa/r66-mutants.sh [<commit>]        # run from `cairn/`; default HEAD
#
# Two things happen here, and the first is the reason the file exists.
#
# **Stage 1 — the audit.** A mutant that silently fails to apply is a test that reports success
# for doing nothing, and it is worse than a missing test: it is a missing test wearing the badge
# of a passing one. Round 65's own harness caught itself doing this once and fixed it for the
# mutants it routed through `mut()` — but four of its eleven went through a bare `perl -0pi`,
# which exits 0 when it matches nothing. `I-28` Part 5 renamed `${paths.join(', ')}` to
# `${shown.join(', ')}` and M10's `perl` line has been a no-op ever since. Stage 1 checks EVERY
# literal every mutation harness still in use replaces, at the commit that harness targets, and
# says APPLIES or DOES-NOT-APPLY for each.
#
# **Stage 2 — the battery.** Round 65's eleven, re-cut so that all eleven go through `mut()` and
# ABORT if their literal is gone, plus nine for `I-28`'s own claims. RED is what a live assertion
# looks like; GREEN on a mutant that breaks a stated property is the finding.
set -u
COMMIT="${1:-HEAD}"
TMP="$(mktemp -d)"
WT="$TMP/wt"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
trap 'git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$TMP"' EXIT

# ---------------------------------------------------------------------------
# Stage 1 — does every mutation in every harness still APPLY?
# ---------------------------------------------------------------------------
echo "== stage 1: do the mutation harnesses' literals still exist at the commits they target?"
audit() {  # audit <harness> <commit> <file-in-cairn> <literal>
  local n; n=$(git -C "$REPO" show "$2:cairn/$3" | grep -cF -- "$4" || true)
  if [ "$n" -gt 0 ]; then printf '  APPLIES         %-18s %-44s (%s x%s)\n' "$1" "$(echo "$4" | cut -c1-44)" "$3" "$n"
  else printf '  DOES-NOT-APPLY  %-18s %-44s (%s)  <-- silently a no-op\n' "$1" "$(echo "$4" | cut -c1-44)" "$3"; fi
}
TS=packages/core/src/derive/travelStats.ts
SEL=packages/client/src/selectors/index.ts
SUM=packages/core/src/derive/summary.ts

# r65-mutants.sh, targeted at HEAD — its four bare-`perl` mutants (M8, M9, M10, M11).
audit r65-mutants/M8  "$COMMIT" "$TS"  'for (const { g, row, a, b, done } of travelled) {'
audit r65-mutants/M9  "$COMMIT" "$TS"  'if (storedCodes !== undefined && storedCodes !== null) {'
audit r65-mutants/M10 "$COMMIT" cli.ts '${paths.join('"'"', '"'"')}'
audit r65-mutants/M11 "$COMMIT" cli.ts 'out(`  trip ${rowId}: unreadable stored values'
# r65-axes.sh, targeted at HEAD — three python `s.replace(...)` with no assertion. These are
# R65-2's whole evidence: a silent no-op there reads as "tsc clean", which IS the finding it
# reported, so an unapplied mutant would have invented a MAJOR.
audit r65-axes/M1     "$COMMIT" "$SUM" 'export type AttributionCensus = {'
audit r65-axes/M2     "$COMMIT" "$SUM" 'attribution: { places: AttributionCensus; stops: AttributionCensus };'
audit r65-axes/M2b    "$COMMIT" "$SUM" 'attribution: { places, stops },'
audit r65-axes/M3     "$COMMIT" "$SUM" 'export type TripSummaryRow = {'
# r64-mutants.sh, targeted at fcac762 — eight bare-`perl` mutants. M1 reads GREEN by design and
# is R64-4's evidence, so whether it applies decides whether R64-4 was real.
audit r64-mutants/M1  fcac762 cli.ts '  if (s.unnamedCities)'
audit r64-mutants/M2  fcac762 cli.ts 'function cmdStats() {'
audit r64-mutants/M3  fcac762 cli.ts 'trips whose stored city list could not be read'
audit r64-mutants/M4  fcac762 cli.ts 'if (s.unreadableCityLists)'
audit r64-mutants/M5  fcac762 "$SEL" 'export function issuesForRef'
audit r64-mutants/M7  fcac762 "$SEL" 'issuesForRef'
audit r64-mutants/N1  fcac762 "$TS"  'unreadableCityLists++;'

# ---------------------------------------------------------------------------
# Stage 2 — the battery, in a throwaway worktree.
# ---------------------------------------------------------------------------
echo
echo "== stage 2: the battery at $COMMIT"
git -C "$REPO" worktree add "$WT" "$COMMIT" --detach >/dev/null 2>&1 || { echo "worktree failed"; exit 2; }
cp -a "$HERE/node_modules" "$WT/cairn/node_modules"
C="$WT/cairn"
real=$(node -e "console.log(require('fs').realpathSync('$C/node_modules/@cairn/core'))")
case "$real" in "$C"/*) ;; *) echo "ABORT: @cairn/core resolves to $real, outside the worktree"; exit 2;; esac
echo "worktree: $C  (@cairn/core -> $real)"

TSF="$C/packages/core/src/derive/travelStats.ts"
SELF="$C/packages/client/src/selectors/index.ts"
CLIF="$C/cli.ts"

# Exact-literal replacement, and it ABORTS if the text is not there. EVERY mutant below goes
# through this — round 65's four `perl` exceptions are what stage 1 above exists to catch.
mut() { python3 -c '
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
if sys.argv[2] not in s:
    sys.stderr.write("MUTANT DID NOT APPLY: %r\n" % sys.argv[2][:70]); sys.exit(3)
p.write_text(s.replace(sys.argv[2], sys.argv[3], 1))' "$@" || { echo "  ABORT: mutant did not apply"; exit 3; }; }

suite() {   # every file that could hold the assertion, INCLUDING travel-history.test.ts, which
            # is where `I-28` Part 1's own assertions live and which round 65's battery did not run
  local o
  o=$(cd "$C" && node --experimental-strip-types --test --test-reporter=tap \
        packages/core/test/absorption.test.ts packages/core/test/travelStats.test.ts \
        packages/client/test/row-stats-readable.test.ts packages/client/test/travel-history.test.ts \
        test/stats-storage.test.ts test/cli.test.ts \
        2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' ')
  case "$o" in *"# fail 0"*) echo "GREEN  ($o)";; *) echo "RED    ($o)";; esac
}
restore() { git -C "$WT" checkout -- cairn; }
run() { printf '  %-56s %s\n' "$1" "$(suite)"; restore; }

echo
printf '  %-56s %s\n' "baseline (unmutated)" "$(suite)"

echo
echo "-- round 65's eleven, re-cut so every one of them aborts if its literal is gone"
mut "$TSF" '
    absorbed,
    unnamedCities,' '
    absorbed: absorbed.slice().reverse(),
    unnamedCities,'; run "M1  absorbed reversed"
mut "$TSF" 'absorbed.push({ rowId, path, kind });' "absorbed.push({ rowId, path, kind: 'field' });"; run "M2  kind always 'field'"
mut "$TSF" 'absorbed.push({ rowId, path, kind });' "absorbed.push({ rowId: '', path, kind });"; run "M3  rowId blanked"
mut "$TSF" '    seenCities += g.cityRecords;' '    seenCities += g.cities.length;'; run "M4  seen.cities excludes absorbed entries"
mut "$TSF" "        else absorb(\`countryCodes[\${i}]\`, 'field');" '        else { /* silent again */ }'; run "M5  countryCodes entry gate silent"
mut "$TSF" "        else if (rawCentre !== undefined && rawCentre !== null) absorb(\`cities[\${i}].centre\`, 'field');" "        else if (rawCentre !== undefined && rawCentre !== null && typeof rawName === 'string') absorb(\`cities[\${i}].centre\`, 'field');"; run "M6  one absorption per entry, not per value"
mut "$TSF" "        if (unreadableDays) absorb(\`cities[\${i}]\`, 'date');" "        if (isUnreadableDay(rawFirstDay)) absorb(\`cities[\${i}].firstDay\`, 'date');
        if (isUnreadableDay(rawLastDay)) absorb(\`cities[\${i}].lastDay\`, 'date');"; run "M7  date absorption reported per FIELD"
mut "$TSF" '  for (const { g, row, a, b, done } of travelled) {' '  for (const { g, row, a, b, done } of [...travelled, ...gatedRows.filter((x) => !travelled.some((t) => t.g === x)).map((g) => ({ g, row: g.row, a: 0, b: 0, done: false }))]) {'; run "M8  unnamedCities counted for planned rows too"
mut "$TSF" '  if (storedCodes !== undefined && storedCodes !== null) {' "  if (storedCodes !== undefined) {
    if (storedCodes === null) absorb('countryCodes', 'list');
    else"; run "M9  countryCodes: null treated as a defect"
# **M10, RE-CUT.** Round 65's line replaced `\${paths.join(', ')}`, which `I-28` Part 5 renamed
# to `\${shown.join(', ')}`; the `perl` matched nothing and read GREEN for doing nothing. The
# property it was pinning — the line names EVERY path it could not read, not just the first —
# is now stated over the capped list.
mut "$CLIF" '${shown.join('"'"', '"'"')}' '${shown[0]}'; run "M10 cli prints one path per row (RE-CUT)"
mut "$CLIF" 'out(`  trip ${rowId}: unreadable stored values' 'out(`  trip UNKNOWN: unreadable stored values'; run "M11 cli names UNKNOWN instead of the row id"

echo
echo "-- I-28's own five parts"
# Part 1 (R65-1), both sides — A-88 Part 12 item 1.
mut "$SELF" 'state.library.filter((r) => !rowDatesReadable(r))' 'state.library.filter((r) => !rowStatsReadable(r))'; run "M12 Part 1 reverted: suspects from rowStatsReadable"
mut "$SELF" 'state.library.filter((r) => !rowDatesReadable(r))' 'state.library.filter(() => false)'; run "M13 Part 1 from the other side: no suspects at all"
# Part 2 (R65-3) — A-88 Part 12 item 2: the both-numbers arm restored.
mut "$TSF" '  let located = 0;
  let attributed = 0;' '  if (rawLocated === undefined || rawLocated === null || rawAttributed === undefined || rawAttributed === null) {
    absorb(path, "census");
    return null;
  }
  let located = 0;
  let attributed = 0;'; run "M14 Part 2 reverted: a half-census is not a census"
# Part 3 (R65-5) — A-88 Part 12 item 3: the predicate relaxed to A-87's.
mut "$TSF" "  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto: unknown = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;" "  return typeof v === 'object' && v !== null && !Array.isArray(v);"; run "M15 Part 3 reverted: isPlainObject again"
# Part 3's closing clause — the three counts stop reporting (the value is already right).
mut "$TSF" "  if (!isCount(value) && value !== undefined && value !== null) absorb(path, 'field');" '  // silent again'; run "M16 the three count gates report nothing"
# A-88 Part 12 item 5 — the count gate changes the VALUE as well as adding the report.
mut "$TSF" '  // The value stays `countOf`'"'"'s, deliberately: this adds the report and changes nothing else.
  return countOf(value);' '  return isCount(value) ? countOf(value) : 7;'; run "M17 the count gate changes the value too"
# M17b — the SAME fault, above the clamp. `seenStops += Math.max(stopRecords, rowLocatedStops)`
# (travelStats.ts:947), and the reference row's `located.stops` is 132, so any wrong count in
# [0, 132] publishes exactly what 0 publishes. M17 (7) is inside that interval and M17b (100000)
# is outside it: the pin is not dead, it is VACUOUS below the fixture's own clamp.
mut "$TSF" '  // The value stays `countOf`'"'"'s, deliberately: this adds the report and changes nothing else.
  return countOf(value);' '  return isCount(value) ? countOf(value) : 100000;'; run "M17b the count gate publishes 100000 instead of 0"
# Part 5 (R65-6) — the cap removed.
mut "$CLIF" 'const shown = paths.slice(0, 5);' 'const shown = paths.slice(0);'; run "M18 the CLI cap removed"
# Part 5 (R65-4) — the date pair read twice again, which is the state the increment fixed.
mut "$TSF" '        const unreadableDays = isUnreadableDay(rawFirstDay) || isUnreadableDay(rawLastDay);' '        const unreadableDays = isUnreadableDay(c.firstDay) || isUnreadableDay(c.lastDay);'; run "M19 firstDay/lastDay read twice again"

echo
echo "-- the disclosure the builder asked to be adjudicated: was the tripwire telling the truth?"
# `GatedRow` carries the three gated counts as `stopRecords`/`placeRecords` rather than as
# `stopCount`/`poolCount`/`placeCount`, because — the builder says — declaring `stopCount: number`
# outside `TripSummaryRow` trips `test/stats-storage.test.ts`' name-based source tripwire. This
# mutant changes ONLY the type declaration, which type-stripping erases at runtime, so a RED here
# is the tripwire and nothing else.
mut "$TSF" '  stopRecords: number;' '  stopCount: number;'; run "M20 GatedRow declares \`stopCount: number\`"

echo
echo "COMPLETE"
