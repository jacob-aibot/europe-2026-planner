#!/usr/bin/env bash
# QA round 29 — I-7a: **the three re-expressed `qa/` probes, mutation-tested.**
#
#   Run: bash qa/i7a-reexpressed.sh          (from cairn/)
#
# BUILD-NOTES **KD-67** discloses that three round-28 probe expectations changed at the same
# commit as the code they were probing:
#
#   * `qa/i7-edges.mjs` — "a COMPLETED version-3 row throws by name" is INVERTED
#   * `qa/i7-pastyear.mjs` §2 — the blocker assertion is REPLACED
#   * `qa/i7-faults.sh` — M2's anchor is MOVED
#
# That is the shape of change a breaker distrusts by default: it either legitimately re-targets
# a probe whose target moved, or it launders away a probe that would otherwise still be failing.
# The only way to tell is to revert the IMPLEMENTATION fix alone, leave the probe as the builder
# left it, and see whether the probe still catches the defect it was routed for.
#
#   R1  restore R28-3's throw           -> `qa/i7-edges.mjs` must go red
#   R2  restore R28-1's `Date.UTC`      -> `qa/i7-pastyear.mjs` must go red
#   R3  restore R28-5's `c.countryCode` -> `qa/i7-faults.sh` M2's re-pointed anchor must still
#                                          apply, and the fault it applies must still be M2
#   R4  the same M2 fault with the OLD anchor -> must be reported as UNRUN, not as a pass.
#       `qa/i7-faults.sh` prints "(patch failed to apply — shape moved)" and exits 0; this is
#       R29-4 and it is what let M2 go unrun for a whole round.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"

say() { printf '\n== %s ==\n' "$1"; }
mkwt() {
  local wt; wt="$(mktemp -d)/wt"
  git -C "$REPO" worktree add --detach "$wt" HEAD >/dev/null 2>&1 || { echo "worktree failed" >&2; return 1; }
  ln -s "$CAIRN/node_modules" "$wt/cairn/node_modules"
  echo "$wt"
}

say "R0 — baseline: the three probes on the shipped tree"
node --experimental-strip-types qa/i7-edges.mjs 2>&1 | tail -2 | sed 's/^/  i7-edges:    /'
node --experimental-strip-types qa/i7-pastyear.mjs 2>&1 | tail -2 | sed 's/^/  i7-pastyear: /'

# ---------------------------------------------------------------------------
WT="$(mkwt)" || exit 1
say "R1 — R28-3's throw restored; i7-edges.mjs UNCHANGED from the builder's version"
python3 - "$WT/cairn" <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/travelStats.ts'
s = open(p).read()
old = '''    const census = row.attribution;
    if (census) {'''
assert old in s, 'shape moved (census guard)'
s = s.replace(old, '''    const census = row.attribution;
    if (!census || !census.places || !census.stops) {
      throw new Error(
        `travelStats: summary row ${JSON.stringify(row.id)} carries no \\`attribution\\` census.`,
      );
    }
    if (census) {''', 1)
open(p, 'w').write(s)
print('  R28-3 throw restored')
PY
if [ $? -ne 0 ]; then echo "  *** UNRUN ***"; else
  ( cd "$WT/cairn" && node --experimental-strip-types qa/i7-edges.mjs 2>&1 | grep -E "^(FAIL|ok .*version-3|[0-9]+ FAIL|ALL OK)" | sed 's/^/  /' )
fi
git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1

# ---------------------------------------------------------------------------
WT="$(mkwt)" || exit 1
say "R2 — R28-1's Date.UTC restored in dayNumber; i7-pastyear.mjs UNCHANGED"
python3 - "$WT/cairn" <<'PY'
import sys
p = sys.argv[1] + '/packages/core/src/derive/summary.ts'
s = open(p).read()
old = '''export function dayNumber(d: IsoDate): number {
  const { y, m, d: dd } = parseIsoDate(d);
  return daysFromCivil(y, m, dd);
}'''
assert old in s, 'shape moved (dayNumber)'
s = s.replace(old, '''export function dayNumber(d: IsoDate): number {
  const { y, m, d: dd } = parseIsoDate(d);
  return Math.floor(Date.UTC(y, m - 1, dd) / 86400000);
}''', 1)
open(p, 'w').write(s)
print('  R28-1 Date.UTC restored in dayNumber alone')
PY
if [ $? -ne 0 ]; then echo "  *** UNRUN ***"; else
  ( cd "$WT/cairn" && node --experimental-strip-types qa/i7-pastyear.mjs 2>&1 | grep -E "^(FAIL|[0-9]+ FAIL|ALL OK)" | sed 's/^/  /' )
fi
git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1

# ---------------------------------------------------------------------------
say "R3 — is qa/i7-faults.sh M2 still the same fault? (anchor applies, fault text identical)"
python3 - "$CAIRN" <<'PY'
import subprocess, sys, re
cairn = sys.argv[1]
old = subprocess.run(['git', '-C', cairn, 'show', '18a92e5:cairn/qa/i7-faults.sh'],
                     capture_output=True, text=True).stdout
new = open(cairn + '/qa/i7-faults.sh').read()
def m2(src):
    i = src.index('M2 — the city group key is nameKey alone')
    j = src.index('run_fault', i)
    return src[i:j]
a, b = m2(old), m2(new)
grab = lambda blk: re.search(r"replace\(old, (.*?), 1\)", blk).group(1)
print('  round-28 replacement:', grab(a))
print('  round-29 replacement:', grab(b))
print('  the FAULT is byte-identical:', grab(a) == grab(b))
anchor = re.search(r"^old = (.*)$", b, re.M).group(1)
print('  new anchor:', anchor)
src = open(cairn + '/packages/core/src/derive/travelStats.ts').read()
print('  new anchor applies to the shipped file:', eval(anchor) in src)
old_anchor = re.search(r"^old = (.*)$", a, re.M).group(1)
print('  OLD anchor applies to the shipped file:', eval(old_anchor) in src, '(this is why it had to move)')
PY

# ---------------------------------------------------------------------------
say "R4 — a drifted anchor is reported as a PASS by qa/i7-faults.sh (R29-4)"
WT="$(mkwt)" || exit 1
python3 - "$WT/cairn" <<'PY'
import sys, re
p = sys.argv[1] + '/qa/i7-faults.sh'
s = open(p).read()
# Put M2's anchor back to the round-28 text, which no longer exists in the source. The fault
# is now UNRUN. What does the harness print?
s = s.replace("old = '      const key = `${countryCode ?? NO_COUNTRY}|${nameKey}`;'",
              "old = '      const key = `${c.countryCode ?? NO_COUNTRY}|${nameKey}`;'", 1)
open(p, 'w').write(s)
# Keep only the baseline and M2, so this is quick.
lines = s.split('\n')
PY
( cd "$WT/cairn" && sed -n '/^run_fault "M3/,$d;p' qa/i7-faults.sh > /tmp/m2only.sh 2>/dev/null; true )
( cd "$WT/cairn" && awk '/^run_fault "M3/{exit} {print}' qa/i7-faults.sh > qa/i7-faults-m2.sh && bash qa/i7-faults-m2.sh 2>&1 | tail -12 | sed 's/^/  /'; echo "  harness exit code: $?" )
git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1

say "done"
