#!/usr/bin/env bash
# QA round 59 — R59-1's harm, at R56-1's / R57-1's / R58-1's own bar.
#
# Injects THREE carriers into `packages/core/src/derive/lifecycle.ts` in which the DOOR IS A UNION
# MEMBER rather than one hop below one — a censused file, in a censused directory, ordinary
# TypeScript, no cast, no `any`, no overload set, nesting depth <= 2 — and then shows all four of:
#
#   1. `npm run typecheck`             exit 0   (all three census lines green)
#   2. `storable.test.ts`              all pass (behavioural / frozen / uniqueness halves green)
#   3. the hidden door is callable and bypasses `commit` entirely
#   4. the document it writes is UNOPENABLE — `fromJSON` refuses at `$.resolutions[0].state`
#
# SAFETY: restores from a byte-exact backup, not `git checkout --`. See `qa/r59-descent.sh`.
#
# Usage:  bash qa/r59-harm.sh          # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
TARGET=packages/core/src/derive/lifecycle.ts

BACKUP=$(mktemp -t r59-lifecycle.XXXXXX) || exit 1
cp "$TARGET" "$BACKUP"
restore() { cp "$BACKUP" "$TARGET"; }
cleanup() { restore; rm -f "$BACKUP"; }
trap cleanup EXIT

cat >> "$TARGET" <<'EOF'

import type { ConflictResolution } from '../model/types.ts';
/** r59 — R57-1's `archiveTrip`, moved sideways again: the door is now a UNION MEMBER. */
type R59Door = (t: Trip, r: ConflictResolution) => Trip;
type R59Inert = (t: Trip) => void;
const r59mk: R59Door = (trip, r) =>
  ({ ...trip, resolutions: [...trip.resolutions, r], revision: trip.revision + 1 });

/** (a) N9/N11's own feature, a THIRD field-shape sideways. N9 and N11 are both RED; this is GREEN. */
export type R59Rule = { id: string; autofix?: R59Door | R59Inert };
export const r59rule: R59Rule = { id: 'r59', autofix: r59mk };

/** (b) the union member in a required property. */
export const r59ops: { archive: R59Door | R59Inert } = { archive: r59mk };

/** (c) the union member as a Map value — DESCENT_CENSUS has `map-carrier-value` and it passes. */
export const r59map: Map<string, R59Door | R59Inert> = new Map([['a', r59mk]]);
EOF

echo "== r59 §C: three hidden doors in a censused file — what does the census say? =="
npx tsc -p tsconfig.json --noEmit >/tmp/r59-harm-tsc.$$ 2>&1
if [ $? -ne 0 ]; then
  echo "     typecheck            RED   — the census saw it"
  head -3 /tmp/r59-harm-tsc.$$ | sed 's/^/       /'
else
  echo "     typecheck            GREEN (all three census lines blind)"
fi
rm -f /tmp/r59-harm-tsc.$$
node --test packages/core/test/storable.test.ts 2>&1 | grep -E "^# (pass|fail)" | sed 's/^/     storable.test.ts     /'
node --experimental-strip-types qa/r59-harm.mjs 2>&1 | sed 's/^/     /'
HARM=$?
restore
echo
echo "tree restored (byte-exact, not by git checkout):"
git status --porcelain packages/core/src | sed 's/^/   /'
exit $HARM
