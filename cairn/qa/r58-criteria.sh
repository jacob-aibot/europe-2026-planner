#!/usr/bin/env bash
# QA round 58 — A-79 Part 10's three injected-fault criteria (N8, N9, N10) RE-DERIVED rather than
# taken on the builder's report, each in a form the builder did not write, plus two attacks on
# `NON_DOORS`'s new liveness mechanism that are NOT round 57's substitution.
#
#   §A  N8, my own shape: a class whose method returns `Trip`.            expect RED, names the export
#   §B  N9, my own shape: `autofix` as an ARROW PROPERTY on `Rule`.       expect RED, names 10 rules
#   §B2 N9 one field-shape sideways: `autofix?: { fix: … }`.              expect RED — MEASURED GREEN
#   §C  N10 substitution, a different door from the builder's.            expect RED
#   §D  the excuse is NAME-keyed: a SECOND door named `fromJSON`.         expect caught somewhere
#   §E  fake liveness: a `NON_DOORS` entry naming a non-door.             expect RED, names it
#
# Usage:  bash qa/r58-criteria.sh          # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
LIFE=packages/core/src/derive/lifecycle.ts
RULET=packages/core/src/conflict/rules/types.ts
STOR=packages/core/test/storable.test.ts
restore() { git checkout -- "$LIFE" "$RULET" "$STOR" 2>/dev/null; }
trap restore EXIT
restore

tsc_verdict() { npx tsc -p tsconfig.json --noEmit >"/tmp/r58c.$$" 2>&1; echo $?; }
show_names() { grep -o "do not exempt it: [^\"]*" "/tmp/r58c.$$" | head -1 | cut -c1-400; }

echo "== §A — N8 re-derived: a class method returning Trip (not the builder's TripArchiver) =="
cat >> "$LIFE" <<'EOF'

import type { ConflictResolution } from '../model/types.ts';
export class TripReviser {
  revise(trip: Trip, r: ConflictResolution): Trip {
    return { ...trip, resolutions: [...trip.resolutions, r] };
  }
}
EOF
if [ "$(tsc_verdict)" != "0" ]; then
  echo "   ok   RED — $(grep -o 'do not exempt it: [A-Za-z0-9]*' /tmp/r58c.$$ | head -1)"
else echo "   GAP  GREEN — the class-method carrier is invisible"; fi
restore

echo
echo "== §B — N9 re-derived: \`autofix\` as an ARROW PROPERTY on the Rule TYPE =="
python3 - "$RULET" <<'EOF'
import sys, re
p = sys.argv[1]; s = open(p).read()
s = s.replace("import type { Conflict, TripCtx } from '../../model/types.ts';",
              "import type { Conflict, TripCtx, Trip } from '../../model/types.ts';")
s = s.replace("  run: (ctx: TripCtx) => Conflict[];",
              "  autofix?: (t: Trip, c: Conflict) => Trip;\n  run: (ctx: TripCtx) => Conflict[];")
open(p, 'w').write(s)
EOF
if [ "$(tsc_verdict)" != "0" ]; then
  echo "   ok   RED — names: $(show_names)"
else echo "   GAP  GREEN"; fi
restore

echo
echo "== §B2 — the SAME criterion one field-shape sideways: \`autofix?: { fix: … }\` =="
echo "   (an optional property holding a carrier object — R58-1, in SHIPPED code)"
python3 - "$RULET" <<'EOF'
import sys
p = sys.argv[1]; s = open(p).read()
s = s.replace("import type { Conflict, TripCtx } from '../../model/types.ts';",
              "import type { Conflict, TripCtx, Trip } from '../../model/types.ts';")
s = s.replace("  run: (ctx: TripCtx) => Conflict[];",
              "  autofix?: { fix: (t: Trip, c: Conflict) => Trip };\n  run: (ctx: TripCtx) => Conflict[];")
open(p, 'w').write(s)
EOF
if [ "$(tsc_verdict)" != "0" ]; then
  echo "   ok   RED — names: $(show_names)"
else echo "   GAP  GREEN — ten rule objects can carry a Trip-producing callable with no census firing"; fi
restore

echo
echo "== §C — N10 substitution, a different door from the builder's (addStop, not addPlace) =="
python3 - "$STOR" <<'EOF'
import sys
p = sys.argv[1]; s = open(p).read()
s = s.replace("    name: 'fromJSON',\n    module: 'serialize/fromJSON.ts',",
              "    name: 'addStop',\n    module: 'build/stops.ts',")
open(p, 'w').write(s)
EOF
if [ "$(tsc_verdict)" != "0" ]; then
  echo "   ok   RED at compile time — $(grep -c 'error' /tmp/r58c.$$) error(s), first:"
  head -1 /tmp/r58c.$$ | sed 's/^/        /'
else echo "   GAP  typecheck GREEN"; fi
node --test "$STOR" 2>&1 | grep -E "^# (pass|fail)" | sed 's/^/        storable.test.ts /'
restore

echo
echo "== §D — the excuse is NAME-keyed: a SECOND door called \`fromJSON\` in another module =="
cat >> "$LIFE" <<'EOF'

/** r58 §D — a real door adopting the excused name. Does anything notice? */
export function fromJSON(trip: Trip): Trip { return { ...trip, revision: trip.revision + 1 }; }
EOF
V=$(tsc_verdict)
[ "$V" != "0" ] && echo "   typecheck RED" || echo "   typecheck GREEN (the name-keyed excuse covers it)"
node --test "$STOR" 2>&1 | grep -E "^# (pass|fail)|distinct function objects|different one under" | sed 's/^/        /' | cut -c1-160
restore

echo
echo "== §E — fake liveness: a NON_DOORS entry naming something that is not a door =="
python3 - "$STOR" <<'EOF'
import sys
p = sys.argv[1]; s = open(p).read()
s = s.replace("    name: 'fromJSON',\n    module: 'serialize/fromJSON.ts',",
              "    name: 'toDoc',\n    module: 'serialize/toJSON.ts',")
open(p, 'w').write(s)
EOF
if [ "$(tsc_verdict)" != "0" ]; then
  echo "   ok   RED — $(grep -o "excuses nothing and is a free slot[^\"]*" /tmp/r58c.$$ | head -1 | cut -c1-120)"
  grep -o 'error TS[0-9]*' /tmp/r58c.$$ | sort | uniq -c | sed 's/^/        /'
else echo "   GAP  GREEN — an inert entry is accepted"; fi
restore
rm -f "/tmp/r58c.$$"

echo
echo "done — tree restored:"
git status --porcelain packages/core | sed 's/^/   /'
