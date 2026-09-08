#!/usr/bin/env bash
# QA round 58 — R58-1's harm, at R56-1's / R57-1's own bar.
#
# Injects THREE carrier forms into `packages/core/src/derive/lifecycle.ts` — a censused file, in a
# censused directory, ordinary TypeScript, no cast, no `any`, no overload set, nesting depth 2 —
# and then shows all four of:
#
#   1. `npm run typecheck`             exit 0   (all three census lines green)
#   2. `storable.test.ts`              all pass (the behavioural / frozen / uniqueness halves green)
#   3. the hidden door is callable and bypasses `commit` entirely
#   4. the document it writes is UNOPENABLE — `fromJSON` refuses at `$.resolutions[0].state`
#
# Usage:  bash qa/r58-harm.sh          # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
TARGET=packages/core/src/derive/lifecycle.ts
restore() { git checkout -- "$TARGET" 2>/dev/null; }
trap restore EXIT
restore

cat >> "$TARGET" <<'EOF'

import type { ConflictResolution } from '../model/types.ts';
/** r58 — R57-1's `archiveTrip`, moved sideways into three carriers `Carries` cannot see. */
type R58Door = (t: Trip, r: ConflictResolution) => Trip;
const r58mk: R58Door = (trip, r) =>
  ({ ...trip, resolutions: [...trip.resolutions, r], revision: trip.revision + 1 });

/** (a) an OPTIONAL property holding a carrier — `T[K]` is `{...} | undefined`, so `Carries` stops. */
export const r58plugins: { archiver?: { archive: R58Door } } = { archiver: { archive: r58mk } };

/** (b) a union with a non-object member — neither `[T] extends [object]` nor the callable arm. */
export const r58maybe: { archive: R58Door } | undefined = { archive: r58mk };

/** (c) the model's own house idiom: a discriminated union — `keyof` a union is the INTERSECTION. */
export type R58Hook = { kind: 'archive'; run: R58Door } | { kind: 'none'; reason: string };
export const r58hook: R58Hook = { kind: 'archive', run: r58mk };
EOF

echo "== r58 §E: three hidden doors in a censused file — what does the census say? =="
npx tsc -p tsconfig.json --noEmit >/tmp/r58-harm-tsc.$$ 2>&1
if [ $? -ne 0 ]; then
  echo "     typecheck            RED   — the census saw it"
  head -3 /tmp/r58-harm-tsc.$$ | sed 's/^/       /'
else
  echo "     typecheck            GREEN (all three census lines blind)"
fi
rm -f /tmp/r58-harm-tsc.$$
node --test packages/core/test/storable.test.ts 2>&1 | grep -E "^# (pass|fail)" | sed 's/^/     storable.test.ts     /'
node --experimental-strip-types qa/r58-harm.mjs 2>&1 | sed 's/^/     /'
HARM=$?
restore
echo
echo "tree restored:"
git status --porcelain packages/core/src | sed 's/^/   /'
exit $HARM
