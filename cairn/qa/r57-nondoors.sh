#!/usr/bin/env bash
# QA round 57 — A-78 Part 10's LAST residue: "`NON_DOORS` is the one remaining place a human
# judgement can hide a door. It is a three-name list with a stated rule and a fault aimed at it...
# **Trigger:** the fourth name."
#
# A-78 Part 9's fault N6 moves a door's name from `DOORS` into `NON_DOORS`, which takes the list to
# FOUR names and fires the trigger. The builder ran N6 twice, the second time as a "determined
# maintainer" who also deletes the behavioural and frozen rows, and reports the fourth-name trigger
# still fires alone.
#
# This is N6 with one more move: the determined maintainer keeps the list at THREE by EVICTING an
# inert name. After BUILD-NOTES KD-106, `mergeTrips` and `importLegacyDays` are wrapper-returning
# producers — `IsDoor` classifies neither as a door, so `ExcusedProducers` (the intersection) never
# needs them and half 3's identity check is the only thing that reads them. Evicting one costs
# nothing; the slot it frees hides a real door.
#
#   §A  N6 as ruled (add a 4th name)              -> expect RED  (the criterion, as a control)
#   §B  N6 by SUBSTITUTION (list stays at three)  -> ?
#   §C  and then delete the hidden door's `commit` call -> is a document lost with no test red?
#
# Usage:  bash qa/r57-nondoors.sh    # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
T=packages/core/test/storable.test.ts
S=packages/core/src/build/stops.ts
restore() { git checkout -- "$T" "$S" 2>/dev/null; }
trap restore EXIT

hide() {  # $1 = "add" (fourth name) | "substitute" (evict mergeTrips)
  restore
  python3 - "$T" "$1" <<'PY'
import sys
p, mode = sys.argv[1], sys.argv[2]
s = open(p).read()

# 1. addPlace leaves DOORS.
s = s.replace("'reorderStop', 'addPlace',", "'reorderStop',", 1)

# 2. addPlace joins NON_DOORS with a plausible reason.
entry = "  { name: 'addPlace', why: 'a producer — it constructs the place record wholesale rather than editing one, so there is no `before` to diff against' },\n"
merge = "  { name: 'mergeTrips', why: 'a producer, for importLegacyDays\\' reason' },\n"
assert merge in s, "mergeTrips row not found"
if mode == "add":
    s = s.replace(merge, merge + entry, 1)
else:                       # substitute: the list never grows
    s = s.replace(merge, entry, 1)

# 3. The determined maintainer also deletes the two rows driven by DOORS.
hostile = """  {
    door: 'addPlace', noun: 'place', path: '$.category', where: 'addPlace',
    hostile: () => {
      const { trip } = baseTrip();
      return StopsMod.addPlace(trip, { ...GOOD_PLACE, category: 'transport' as unknown as Place['category'] });
    },
  },
"""
assert hostile in s, "hostile row not found"
s = s.replace(hostile, "", 1)
frozen = "  { door: 'addPlace', before: () => baseTrip().trip, go: (t) => StopsMod.addPlace(t, GOOD_PLACE) },\n"
assert frozen in s, "frozen row not found"
s = s.replace(frozen, "", 1)
open(p, "w").write(s)
PY
}

report() {
  npx tsc -p tsconfig.json --noEmit >/tmp/r57n-tsc.$$ 2>&1; local tc=$?
  node --test packages/core/test/storable.test.ts >/tmp/r57n-t.$$ 2>&1
  printf '   typecheck=%-5s  %s   %s\n' "$([ $tc -eq 0 ] && echo GREEN || echo RED)" \
    "$(grep -m1 '^# pass' /tmp/r57n-t.$$)" "$(grep -m1 '^# fail' /tmp/r57n-t.$$)"
  grep "^not ok" /tmp/r57n-t.$$ | head -4 | sed 's/^/      /'
  rm -f /tmp/r57n-tsc.$$ /tmp/r57n-t.$$
}

echo "== r57 §D: can a door hide in NON_DOORS without tripping the fourth-name trigger? =="
echo
echo "§A  N6 as A-78 Part 9 rules it — addPlace becomes a FOURTH name:"
hide add
report

echo
echo "§B  N6 by SUBSTITUTION — mergeTrips is evicted, so the list is still THREE names:"
hide substitute
report

echo
echo "§C  ...and now delete the hidden door's own \`commit\` call (A-77 fault N1) —"
echo "    with addPlace mislabelled a producer, is there anything left to fire?"
python3 - "$S" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
old = "  return commit('addPlace', trip, { ...trip, places: [...trip.places, place], revision: trip.revision + 1 });"
new = "  return { ...trip, places: [...trip.places, place], revision: trip.revision + 1 };"
assert old in s, "addPlace commit call not found"
open(p, "w").write(s.replace(old, new, 1))
PY
report
echo "    full suite:"
npm run test:tap >/tmp/r57n-full.$$ 2>&1
grep -E '^# (pass|fail)' /tmp/r57n-full.$$ | sed 's/^/      /'
echo "    and the harm, driven:"
node --experimental-strip-types qa/r57-nondoors-harm.mjs 2>&1 | sed 's/^/      /'
rm -f /tmp/r57n-full.$$

restore
echo
echo "tree restored:"; git status --porcelain packages/core | sed 's/^/   /'
