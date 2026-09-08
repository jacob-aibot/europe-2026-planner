#!/usr/bin/env bash
# QA round 57 — BUILD-NOTES **KD-106** verified independently, with a THIRD wrapper-returning
# producer rather than `mergeTrips` / `importLegacyDays`.
#
# KD-106: the ruling writes the expected set as `DOORS ∪ CENSUS_MECHANISM ∪ NON_DOORS[].name` on
# the ground that all three named producers "return `Trip` and their modules are now censused".
# Two of them return WRAPPERS, so the literal equation does not compile on a healthy tree; the
# builder replaced the union term with `NON_DOORS[].name ∩ AllDoors`.
#
# Three questions, each driven:
#   §A  a third wrapper producer — is it correctly NOT a door, with no false "unaccounted" red?
#   §B  ...and does the ILLEGAL-SHAPE line stay silent about it? (A-78 Part 2 says a wrapper is
#       "refused by rule, not detected" — so silence here is CORRECT, and the rule is the guard.)
#   §C  can the wrapper smuggle an UNVALIDATED `Trip` out? (the residue, measured rather than
#       assumed) — and the `Trip | Day` control, which MUST redden.
#   §D  after KD-106's intersection, does ANYTHING still check that a `NON_DOORS` name is a
#       `Trip`-returning function at all? This is R57-2's root cause.
#
# Usage:  bash qa/r57-kd106.sh    # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
T=packages/core/src/derive/lifecycle.ts
TEST=packages/core/test/storable.test.ts
restore() { git checkout -- "$T" "$TEST" 2>/dev/null; }
trap restore EXIT

inject() { restore; { printf '\n'; cat; } >> "$T"; }

tc() {  # $1 = label, $2 = expected GREEN|RED
  npx tsc -p tsconfig.json --noEmit >/tmp/r57k.$$ 2>&1
  local code=$? v; [ $code -eq 0 ] && v=GREEN || v=RED
  local m; [ "$v" = "$2" ] && m="ok  " || m="GAP "
  printf '%s %-42s typecheck=%-5s expected=%-5s %s\n' "$m" "$1" "$v" "$2" \
    "$(grep -o 'storable.test.ts([0-9]*,[0-9]*)' /tmp/r57k.$$ | tr '\n' ' ')"
  rm -f /tmp/r57k.$$
}

echo "== r57 §E: KD-106's equation, checked with a third wrapper-returning producer =="
echo "   (census line 532 = DOOR_CENSUS, 584 = ILLEGAL_SHAPE_CENSUS)"
echo

inject <<'EOF'
import type { Issue } from '../model/types.ts';
/** r57 §A — a THIRD wrapper-returning producer, in the shape a Phase 3 ingest worker would take. */
export type IngestResult = { trip: Trip; issues: Issue[] };
export function ingestInto(trip: Trip, note: string): IngestResult {
  return { trip: { ...trip, title: note, revision: trip.revision + 1 }, issues: [] };
}
EOF
tc "A/B  {trip, issues} wrapper producer" GREEN

inject <<'EOF'
/** r57 §A2 — the tuple form of the same thing. */
export function ingestPair(trip: Trip, note: string): [Trip, string[]] {
  return [{ ...trip, title: note, revision: trip.revision + 1 }, []];
}
EOF
tc "A2   [Trip, string[]] tuple producer" GREEN

inject <<'EOF'
import type { Day } from '../model/types.ts';
/** r57 control — A-78 Part 9's fault N4. */
export function wrapped(t: Trip): Trip | Day { return t; }
EOF
tc "N4   control: Trip | Day must be refused" RED

inject <<'EOF'
/** r57 — a door RE-EXPORTED into the censused tree from outside it. */
export { applyAction as smuggled } from '../../../client/src/store/reducer.ts';
EOF
tc "R    a re-export from outside packages/core" RED
echo "     (applyAction returns a bare Trip, and the census sees it through the re-export:"
echo "      a namespace import carries re-exported members, so this face is CLOSED.)"

inject <<'EOF'
/** r57 — the same, with a function that DOES return a bare Trip, defined outside core/src. */
export { outsideDoor } from '../../../../qa/r57-outside-door.ts';
EOF
tc "R2   a re-export of a Trip-returning fn from OUTSIDE the tree" RED

echo
echo "== §C: does the wrapper smuggle an unvalidated Trip? =="
inject <<'EOF'
import type { Issue } from '../model/types.ts';
export type IngestResult = { trip: Trip; issues: Issue[] };
export function ingestInto(trip: Trip, kind: string): IngestResult {
  return {
    trip: { ...trip, bookings: [...trip.bookings, { ...(trip.bookings[0] ?? {}), id: 'bk-x', kind } as never], revision: trip.revision + 1 },
    issues: [],
  };
}
EOF
npx tsc -p tsconfig.json --noEmit >/dev/null 2>&1 && echo "     typecheck GREEN — the wrapper is invisible to both census lines"
node --test packages/core/test/storable.test.ts 2>&1 | grep -E '^# (pass|fail)' | sed 's/^/     storable.test.ts  /'
node --experimental-strip-types qa/r57-kd106-harm.mjs 2>&1 | sed 's/^/     /'

restore
echo
echo "tree restored:"; git status --porcelain packages/core | sed 's/^/   /'
