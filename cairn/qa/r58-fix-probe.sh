#!/usr/bin/env bash
# SUPERSEDED AT ROUND 59, AND IT NO LONGER RUNS. The repair this probe measured SHIPPED in I-19
# (`386c459`), so the `old_members`/`old_carries` anchors below — the A-79 predicate — are gone
# from `storable.test.ts` and the `assert` on line ~30 now always raises. Kept as the record of
# what round 58 measured. **The living successor is `qa/r59-nonnullable.sh`**, which asks the
# question that matters now: is the SHIPPED repair's `NonNullable` half load-bearing at all?
# (Round 59 also removed this file's `git checkout --` restore — see R59-5.)
#
# QA round 58 — is R58-1 CHEAPLY closable, and does closing it false-positive on the shipped tree?
#
# NOT a fix. The breaker does not fix product code; this exists so the architect's ruling on R58-1
# is made against a measurement rather than a guess. It patches `Carries`/`Members` in a scratch
# copy of `packages/core/test/storable.test.ts`, runs the whole census, and restores the file.
#
# The patch is two lines and adds NO carrier form to any list:
#   1. `Members` walks `NonNullable<T[K]>`, not `T[K]` — `-?` strips the optional MODIFIER from the
#      mapped result, it does not strip `| undefined` from the SOURCE indexed access, so today an
#      optional property holding a carrier is invisible.
#   2. `Carries` DISTRIBUTES over a union and takes `true extends` of the result, instead of
#      bracket-guarding it. The bracket was there to stop a union export becoming a union of
#      verdicts that *loses* `false` (A-79 Part 3 detail 1) — `true extends (T extends unknown ? …)`
#      keeps that property and stops losing `true` as well.
#
# Usage:  bash qa/r58-fix-probe.sh          # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
STOR=packages/core/test/storable.test.ts
LIFE=packages/core/src/derive/lifecycle.ts
# --- round 59 process fix (R59-5). This probe used to restore with `git checkout --`, which
# --- silently reverts ANY uncommitted work in the target files, not just this probe's own edits.
# --- It destroyed the I-19 builder's in-progress work once. It now snapshots the targets at
# --- startup and restores those exact bytes, so running it on a dirty tree is safe.
__R59_BACKUP=$(mktemp -d -t qa-restore.XXXXXX) || exit 1
__r59_snapshot() { for f in "$@"; do mkdir -p "$__R59_BACKUP/$(dirname "$f")"; cp "$f" "$__R59_BACKUP/$f"; done; }
__r59_restore()  { for f in "$@"; do cp "$__R59_BACKUP/$f" "$f"; done; }
__r59_snapshot "$STOR" "$LIFE"
restore() { __r59_restore "$STOR" "$LIFE"; }
trap 'restore; rm -rf "$__R59_BACKUP"' EXIT
restore

python3 - "$STOR" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old_members = """type Members<T, D extends number> =
  true extends { [K in keyof T]-?: Carries<T[K], D> }[keyof T] ? true : false;"""
new_members = """type Members<T, D extends number> =
  true extends { [K in keyof T]-?: Carries<NonNullable<T[K]>, D> }[keyof T] ? true : false;"""
assert old_members in s, "Members anchor not found"
s = s.replace(old_members, new_members)
old_carries = """type Carries<T, D extends number = 12> =
  [D] extends [never] ? false :
    IsDoor<T> extends true ? true :
      [T] extends [(...a: never[]) => infer R]
        ? (Carries<Awaited<R>, Down[D]> extends true ? true : Members<T, Down[D]>)
        : [T] extends [object] ? Members<T, Down[D]> : false;"""
new_carries = """type Carries<T, D extends number = 12> =
  [D] extends [never] ? false :
    IsDoor<T> extends true ? true :
      true extends (T extends unknown ? CarriesOne<T, D> : never) ? true : false;
type CarriesOne<T, D extends number> =
  [T] extends [(...a: never[]) => infer R]
    ? (Carries<Awaited<R>, Down[D]> extends true ? true : Members<T, Down[D]>)
    : [T] extends [object] ? Members<T, Down[D]> : false;"""
assert old_carries in s, "Carries anchor not found"
s = s.replace(old_carries, new_carries)
open(p, 'w').write(s)
PY
echo "patched: Members walks NonNullable<T[K]>; Carries distributes over unions"
echo

echo "== 1. false positives over the shipped tree (must stay exit 0) =="
S=$(date +%s%N); npx tsc -p tsconfig.json --noEmit >/tmp/r58fix.$$ 2>&1; C=$?; E=$(date +%s%N)
if [ $C -eq 0 ]; then echo "   ok   typecheck exit 0 — AllHidden is still never over all 54 modules"
else echo "   GAP  the patch false-positives:"; head -5 /tmp/r58fix.$$ | sed 's/^/        /'; fi
echo "   cost: $(( (E-S)/1000000 )) ms (core project only)"
node --test "$STOR" 2>&1 | grep -E "^# (pass|fail)" | sed 's/^/   /'

echo
echo "== 2. does it now catch the carriers R58-1 filed? =="
HEADER='import type { ConflictResolution } from "../model/types.ts";
type R58Door = (t: Trip, r: ConflictResolution) => Trip;
const r58mk = (trip: Trip, r: ConflictResolution): Trip =>
  ({ ...trip, resolutions: [...trip.resolutions, r], revision: trip.revision + 1 });'
row() {
  local id="$1" body="$2"
  __r59_restore "$LIFE"
  { printf '\n%s\n' "$HEADER"; printf '%s\n' "$body"; } >> "$LIFE"
  npx tsc -p tsconfig.json --noEmit >/tmp/r58fix.$$ 2>&1
  local c=$?
  __r59_restore "$LIFE"
  printf '   %-34s %s %s\n' "$id" "$([ $c -ne 0 ] && echo RED || echo 'GREEN <- still invisible')" \
    "$(grep -o 'do not exempt it: [A-Za-z0-9]*' /tmp/r58fix.$$ | head -1)"
}
row "union carrier | undefined" 'export const r58maybe: { archive: R58Door } | undefined = { archive: r58mk };'
row "discriminated union carrier" 'export type R58Hook = { kind: "a"; run: R58Door } | { kind: "n"; why: string };
export const r58hook: R58Hook = { kind: "a", run: r58mk };'
row "optional nested carrier" 'export const r58plugins: { archiver?: { archive: R58Door } } = { archiver: { archive: r58mk } };'
row "Set of doors" 'export const r58set: Set<R58Door> = new Set([r58mk]);'
row "control: object-literal method" 'export const r58ops = { archive: r58mk };'
row "control: NON-door union (must stay GREEN)" 'export const r58plain: { run: (t: Trip) => string[] } | undefined = { run: () => [] };'
rm -f /tmp/r58fix.$$
restore
echo
echo "tree restored:"; git status --porcelain packages/core | sed 's/^/   /'
