#!/usr/bin/env bash
# QA round 56 — §2.1 **A-77** Part 6's door census, attacked.
#
#   bash cairn/qa/r56-census.sh          # ~10 min: one full `tsc -p tsconfig.json --noEmit` per row
#
# A-77 Part 6 replaced A-76's source-text collector (which round 55 evaded three ways, R55-4) with
# two halves that fail at different times:
#
#   1. a TYPE-LEVEL census — `IsExact<DoorsOf<Censused>, DOORS | 'commit'>` — that fails
#      `npm run typecheck` when a censused module gains a `Trip`-returning export, in any syntax;
#   2. a runtime MODULE census that reads `packages/core/src/build/` from disk and asserts the file
#      list equals the modules half 1 imports, plus an existence check on the explicitly-named
#      extra door files (`EXTRA_DOOR_FILES = ['conflict/resolve.ts']`).
#
# This script injects a door fourteen ways and records, for each, whether EITHER half sees it.
# `EXPECT=red` rows are the ruling's own criterion N2/N3. `EXPECT=green` rows are round 56's
# findings: the census still holds a hand-written enumeration, it has just moved from *doors* to
# *files* and *one exact return type*.
#
# Nothing is left behind: every file is restored in a trap, and the script refuses to start on a
# dirty `packages/core` tree so a failed run can never be mistaken for a source edit.
set -uo pipefail
cd "$(dirname "$0")/.."

if ! git diff --quiet -- packages/core || ! git diff --cached --quiet -- packages/core; then
  echo "refusing to run: packages/core has uncommitted changes, and this script edits it in place" >&2
  exit 2
fi

POOL=packages/core/src/build/pool.ts
LIFE=packages/core/src/derive/lifecycle.ts
NEWFILE=packages/core/src/build/__r56_sneaky.ts
NEWDIR=packages/core/src/mutate
restore() { git checkout -- packages/core >/dev/null 2>&1; rm -f "$NEWFILE"; rm -rf "$NEWDIR"; }
trap restore EXIT

fails=0
# $1 label   $2 expected verdict (red|green)   $3 file to append to   $4 the injected source
row() {
  local label="$1" expect="$2" file="$3" src="$4"
  restore
  if [ -n "$file" ]; then mkdir -p "$(dirname "$file")"; printf '\n%s\n' "$src" >> "$file"; fi
  local tc mod
  npx tsc -p tsconfig.json --noEmit >/dev/null 2>&1 && tc=green || tc=red
  node --test packages/core/test/storable.test.ts >/dev/null 2>&1 && mod=green || mod=red
  local got=green
  [ "$tc" = red ] && got=red
  [ "$mod" = red ] && got=red
  local verdict="ok  "
  if [ "$got" != "$expect" ]; then verdict="FAIL"; fails=$((fails+1)); fi
  printf '%s %-58s typecheck=%-5s module-census=%-5s (want %s)\n' "$verdict" "$label" "$tc" "$mod" "$expect"
}

echo "=== A — the four syntaxes A-77 Part 6.1 / criterion N2 names (all must go RED) ==="
row "N2a export function"                 red "$POOL" 'export function sneakyDoor(t: Trip): Trip { return t; }'
row "N2b export const = arrow"            red "$POOL" 'export const sneakyDoor = (t: Trip): Trip => t;'
row "N2c function d(){}; export { d }"    red "$POOL" 'function sneakyDoor(t: Trip): Trip { return t; }
export { sneakyDoor };'
row "N2d export default function"         red "$POOL" 'export default function sneakyDoor(t: Trip): Trip { return t; }'

echo
echo "=== B — five syntaxes round 56 adds, which the builder did not try (all must go RED) ==="
row "R56 export { x as y } from another file" red "$POOL" 'export { latestVisitDate as sneakyDoor } from "../derive/lifecycle.ts";'
row "R56 an overload pair"                red "$POOL" 'export function sneakyDoor(t: Trip): Trip;
export function sneakyDoor(t: Trip): Trip { return t; }'
row "R56 a typed const, untyped arrow"    red "$POOL" 'export const sneakyDoor: (t: Trip) => Trip = (t) => t;'
row "R56 export default, anonymous arrow" red "$POOL" 'export default (t: Trip): Trip => t;'
row "R56 a generic passthrough"           red "$POOL" 'export function sneakyDoor<T extends Trip>(t: T): T { return t; }'

echo
echo "=== C — a NEW FILE in build/, which is criterion N3 (must go RED, naming the file) ==="
row "N3  a new file in packages/core/src/build/" red "$NEWFILE" 'import type { Trip } from "../model/types.ts";
export function sneakyDoor(t: Trip): Trip { return t; }'

echo
echo "=== D — round 56's findings: what the census still cannot see ==="
echo "    R56-1: the census enumerates FILES by hand (build/*.ts + EXTRA_DOOR_FILES). A door"
echo "           anywhere else in packages/core/src is invisible to BOTH halves — which is the"
echo "           conflict/resolve.ts failure that decided A-77 Part 2, unfixed one level up."
row "R56-1 a door in derive/lifecycle.ts (an EXISTING file)" green "$LIFE" 'export function sneakyDoor(t: Trip): Trip { return { ...t, revision: t.revision + 1 }; }'
row "R56-1 a door in a NEW directory packages/core/src/mutate/" green "$NEWDIR/door.ts" 'import type { Trip } from "../model/types.ts";
export function sneakyDoor(t: Trip): Trip { return { ...t, revision: t.revision + 1 }; }'
echo "    R56-2: the classifier is an EXACT return type, so two natural door signatures are not"
echo "           doors — including the async one a Phase 3 ingest worker would be written in."
row "R56-2 (t: Trip) => Trip | null, in a CENSUSED file"   green "$POOL" 'export function sneakyDoor(t: Trip): Trip | null { return t; }'
row "R56-2 async (t: Trip) => Promise<Trip>, censused file" green "$POOL" 'export async function sneakyDoor(t: Trip): Promise<Trip> { return t; }'

echo
echo "=== E — vacuity control: with nothing injected, both halves are green ==="
row "CONTROL clean tree" green "" ''

echo
echo "COMPLETE  fails=$fails"
exit $(( fails > 0 ? 1 : 0 ))
