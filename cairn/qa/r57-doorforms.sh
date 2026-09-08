#!/usr/bin/env bash
# QA round 57 — A-78 / I-17.
#
# The claim under attack is A-78 Part 1 half 1's: "So does a door in any directory that exists,
# **in any declaration syntax**" — and Part 10's "There is no enclosing scope left to widen to."
#
# The type-level census classifies a module member M[K] with
#     IsDoor<F> = IsExact<Exclude<Awaited<ReturnType-ish<F>>, null|undefined>, Trip>
# where the ReturnType-ish step is `F extends (...a: never[]) => infer R`. That conditional only
# matches a member that is ITSELF a directly-callable function value. This script injects seven
# `Trip`-producing declaration forms into `derive/lifecycle.ts` — a censused file, no new file, no
# new directory — and reports, for each, whether `npm run typecheck` reddens.
#
# Row 0 is the control: A-78 Part 9's fault N1 verbatim. It MUST be RED or the harness is lying.
#
# Usage:  bash qa/r57-doorforms.sh          # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
TARGET=packages/core/src/derive/lifecycle.ts
HEADER='import type { ConflictResolution } from "../model/types.ts";'

restore() { git checkout -- "$TARGET" 2>/dev/null; }
trap restore EXIT

run_case() {
  local id="$1" expect="$2" body="$3"
  restore
  { printf '\n%s\n' "$HEADER"; printf '%s\n' "$body"; } >> "$TARGET"
  npx tsc -p tsconfig.json --noEmit >/tmp/r57-tsc.$$ 2>&1
  local code=$?
  restore
  local verdict; [ $code -ne 0 ] && verdict=RED || verdict=GREEN
  local mark; [ "$verdict" = "$expect" ] && mark="ok  " || mark="GAP "
  printf '%s %-26s census=%-5s expected=%-5s %s\n' "$mark" "$id" "$verdict" "$expect" \
    "$( [ $code -ne 0 ] && head -1 /tmp/r57-tsc.$$ | cut -c1-90 )"
  rm -f /tmp/r57-tsc.$$
}

echo "== r57 §A: does the type-level door census see a door in EVERY declaration syntax? =="
echo "   (RED = census fires = the door is discovered.  GREEN = the door is INVISIBLE.)"
echo

run_case "0-control-plain-fn" RED '
export function archiveTrip(trip: Trip, r: ConflictResolution): Trip {
  return { ...(trip as Trip), resolutions: [...(trip as Trip).resolutions, r] };
}'

run_case "1-class-method" RED '
export class TripArchiver {
  archive(trip: Trip, r: ConflictResolution): Trip {
    return { ...trip, resolutions: [...trip.resolutions, r] };
  }
}'

run_case "2-object-literal-method" RED '
export const tripOps = {
  archive(trip: Trip, r: ConflictResolution): Trip {
    return { ...trip, resolutions: [...trip.resolutions, r] };
  },
};'

run_case "3-higher-order" RED '
export function makeArchiver(): (trip: Trip, r: ConflictResolution) => Trip {
  return (trip, r) => ({ ...trip, resolutions: [...trip.resolutions, r] });
}'

run_case "4-overload-set" RED '
export function archiveOv(trip: Trip, r: ConflictResolution): Trip;
export function archiveOv(trip: Trip, n: number): number;
export function archiveOv(trip: Trip, x: ConflictResolution | number): Trip | number {
  return typeof x === "number" ? x : { ...trip, resolutions: [...trip.resolutions, x] };
}'

run_case "5-static-method" RED '
export class TripArchive2 {
  static archive(trip: Trip, r: ConflictResolution): Trip {
    return { ...trip, resolutions: [...trip.resolutions, r] };
  }
}'

run_case "6-namespace-member" RED '
export const archives: Record<string, (t: Trip, r: ConflictResolution) => Trip> = {
  archive: (trip, r) => ({ ...trip, resolutions: [...trip.resolutions, r] }),
};'

run_case "7-getter-returning-door" RED '
export const lazyOps = {
  get archive(): (t: Trip, r: ConflictResolution) => Trip {
    return (trip, r) => ({ ...trip, resolutions: [...trip.resolutions, r] });
  },
};'

echo
echo "== r57 §A2: the same question against GENERATED code (geo/countries.gen.ts is censused) =="
restore
G=packages/core/src/geo/countries.gen.ts
cp "$G" /tmp/r57-gen.$$
cat >> "$G" <<'EOF'

import type { Trip } from '../model/types.ts';
import type { ConflictResolution } from '../model/types.ts';
export function archiveGen(trip: Trip, r: ConflictResolution): Trip {
  return { ...trip, resolutions: [...trip.resolutions, r] };
}
EOF
npx tsc -p tsconfig.json --noEmit >/dev/null 2>&1 && echo "GAP  a plain door in generated code is INVISIBLE" || echo "ok   a plain door in geo/countries.gen.ts reddens typecheck — no generated-code blind spot"
cp /tmp/r57-gen.$$ "$G"; rm -f /tmp/r57-gen.$$

echo
echo "== r57 §B: control — the module census still sees a NEW FILE (A-78 fault N2) =="
mkdir -p packages/core/src/sync
cat > packages/core/src/sync/apply.ts <<'EOF'
import type { Trip } from '../model/types.ts';
export function applySync(t: Trip): Trip { return t; }
EOF
node --test packages/core/test/storable.test.ts >/tmp/r57-mod.$$ 2>&1
if grep -q "sync/apply.ts" /tmp/r57-mod.$$; then echo "ok   module census RED, names sync/apply.ts"; else echo "GAP  module census did not name sync/apply.ts"; fi
rm -rf packages/core/src/sync /tmp/r57-mod.$$
echo
echo "== r57 §C: the HARM, at R56-1's own bar — a class-method door writes a document that"
echo '           fromJSON refuses, while typecheck and storable.test.ts stay green =='
restore
cat >> "$TARGET" <<'EOF'

import type { ConflictResolution } from '../model/types.ts';
/** r57 §C — R56-1's `archiveTrip`, moved one declaration form sideways. */
export class TripArchiver {
  archive(trip: Trip, r: ConflictResolution): Trip {
    return { ...trip, resolutions: [...trip.resolutions, r], revision: trip.revision + 1 };
  }
}
EOF
npx tsc -p tsconfig.json --noEmit >/dev/null 2>&1 && echo "     typecheck            GREEN  (the door is invisible)" || echo "     typecheck            RED"
node --test packages/core/test/storable.test.ts 2>&1 | grep -E "^# (pass|fail)" | sed 's/^/     storable.test.ts     /'
node --experimental-strip-types qa/r57-harm.mjs 2>&1 | sed 's/^/     /'
restore
echo
echo "done — tree restored:"
git status --porcelain packages/core/src | sed 's/^/   /'
