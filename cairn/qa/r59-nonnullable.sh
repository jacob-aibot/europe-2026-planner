#!/usr/bin/env bash
# QA round 59 — the I-19 builder's own disclosed objection, re-derived independently.
#
# BUILD-NOTES' I-19 addendum discloses: *"`NonNullable<T[K]>` in `Members` is not independently
# load-bearing once `Carries` distributes, and no row in `DESCENT_CENSUS` pins it."* A-80 Part 2
# point 1 and ROADMAP I-19 part 1 both state it as one of FOUR load-bearing things.
#
# This probe removes the `NonNullable` wrapper from `Members` — reverting exactly that one token,
# leaving A-80's distribution and its three `CarriesOne` arms untouched — and measures whether the
# round's own verification apparatus can tell the difference:
#
#   1. `DESCENT_CENSUS`  — all 35 rows must still be green, or the objection is refuted
#   2. the shipped tree  — `npx tsc -p tsconfig.json --noEmit` exit 0
#   3. `storable.test.ts`— 107 pass / 0 fail
#   4. N11 (`autofix?: { fix(t, c): Trip }`) — must still be RED naming eleven
#
# If all four hold, HALF THE STATED MECHANISM CAN BE DELETED WITHOUT COSTING A SINGLE ROW, which
# is the "a criterion that cannot fail when the thing it protects is broken" shape this arc exists
# to remove.
#
# SAFETY: restores from a byte-exact backup, not `git checkout --`.
#
# Usage:  bash qa/r59-nonnullable.sh          # from cairn/, ~40 s
set -u
cd "$(dirname "$0")/.." || exit 1
STOR=packages/core/test/storable.test.ts
RULET=packages/core/src/conflict/rules/types.ts

BACKUP=$(mktemp -d -t r59-nn.XXXXXX) || exit 1
cp "$STOR" "$BACKUP/stor.ts"; cp "$RULET" "$BACKUP/rulet.ts"
restore() { cp "$BACKUP/stor.ts" "$STOR"; cp "$BACKUP/rulet.ts" "$RULET"; }
cleanup() { restore; rm -rf "$BACKUP"; }
trap cleanup EXIT

drop_nonnullable() {
  python3 - "$STOR" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = "true extends { [K in keyof T]-?: Carries<NonNullable<T[K]>, D> }[keyof T] ? true : false;"
new = "true extends { [K in keyof T]-?: Carries<T[K], D> }[keyof T] ? true : false;"
assert s.count(old) == 1, f"expected exactly one Members body, found {s.count(old)}"
open(p, 'w').write(s.replace(old, new))
PY
}

inject_n11() {
  python3 - "$RULET" <<'PY'
import sys, re
p = sys.argv[1]; s = open(p).read()
s = s.replace("import type { Conflict, TripCtx } from '../../model/types.ts';",
              "import type { Conflict, TripCtx, Trip } from '../../model/types.ts';", 1)
m = re.search(r'export type Rule = \{', s)
assert m, 'Rule type not found'
i = m.end()
s = s[:i] + "\n  autofix?: { fix(t: Trip, c: Conflict): Trip };" + s[i:]
open(p, 'w').write(s)
PY
}

report() {
  local label="$1"
  npx tsc -p tsconfig.json --noEmit >"/tmp/r59nn.$$" 2>&1
  local code=$?
  if [ $code -eq 0 ]; then
    printf '  %-46s typecheck GREEN\n' "$label"
  else
    printf '  %-46s typecheck RED  %s\n' "$label" "$(head -1 "/tmp/r59nn.$$" | cut -c1-70)"
    local labels; labels=$(grep -o 'no longer behaves\|stopped descending it' "/tmp/r59nn.$$" | head -1)
    [ -n "$labels" ] && echo "       DESCENT_CENSUS fired"
    local names; names=$(grep -o 'do not exempt it: [A-Za-z_][A-Za-z0-9_]*' "/tmp/r59nn.$$" | sed 's/.*: //' | sort -u)
    printf '       hidden-door names (%s): %s\n' "$(echo "$names" | grep -c .)" "$(echo "$names" | tr '\n' ' ')"
  fi
  rm -f "/tmp/r59nn.$$"
}

echo "== r59 SectionD: is NonNullable<T[K]> in Members load-bearing? =="
echo

echo "-- baseline, shipped tree, unmodified --"
report "shipped"

echo
echo "-- (1) NonNullable removed from Members, distribution left in --"
drop_nonnullable
report "Members walks bare T[K]"
node --test "$STOR" 2>&1 | grep -E "^# (pass|fail)" | sed 's/^/       storable.test.ts /'

echo
echo "-- (2) NonNullable removed AND N11 injected: must still be RED naming eleven --"
inject_n11
report "no NonNullable + N11"

restore
echo
echo "-- (3) control: NonNullable KEPT and N11 injected --"
inject_n11
report "shipped + N11"
restore

echo
echo "tree restored (byte-exact, not by git checkout):"
git status --porcelain packages/core | sed 's/^/   /'
