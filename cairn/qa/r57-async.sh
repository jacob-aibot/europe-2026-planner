#!/usr/bin/env bash
# QA round 57 — A-78 Part 2's `Promise<Trip>` widening, and BUILD-NOTES KD-107.
#
# A-78 Part 2 widened `IsDoor` to admit `Promise<Trip>` although NO door is async today, on the
# ground that "an incomplete census does not fail loudly when the case arrives". KD-107 says the
# runners had to be widened too (`isThenable` + `await`). This checks the widening is SAFE and not
# merely permissive: it turns a real door async and asks whether each of the four census halves
# still does its job, including the frozen-input (Invariant R) half.
#
# Rows:
#   A  async door, no mutation           -> everything GREEN (the widening reclassifies nothing)
#   B  async door that mutates BEFORE it returns  -> frozen row RED, naming the door
#   C  async door that mutates in a DETACHED continuation -> ?  (the interesting one)
#
# Usage:  bash qa/r57-async.sh    # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
T=packages/core/src/conflict/resolve.ts
restore() { git checkout -- "$T" 2>/dev/null; }
trap restore EXIT

mkasync() {   # $1 = extra statement injected at the top of the body
  restore
  python3 - "$T" "$1" <<'PY'
import sys
p, extra = sys.argv[1], sys.argv[2]
s = open(p).read()
old = "export function reassertRetirements(trip: Trip, retired: ReadonlyMap<ConflictId, IsoDate>): Trip {"
new = "export async function reassertRetirements(trip: Trip, retired: ReadonlyMap<ConflictId, IsoDate>): Promise<Trip> {"
assert old in s, "anchor not found"
s = s.replace(old, new + ("\n  " + extra if extra else ""))
open(p, "w").write(s)
PY
}

report() {
  local id="$1"
  npx tsc -p tsconfig.json --noEmit >/tmp/r57a-tsc.$$ 2>&1; local tc=$?
  node --test packages/core/test/storable.test.ts >/tmp/r57a-t.$$ 2>&1; local tt=$?
  local frozen; frozen=$(grep -c "^not ok .*Invariant R" /tmp/r57a-t.$$)
  local behav;  behav=$(grep -c "^not ok .*refuses a" /tmp/r57a-t.$$)
  local nf;     nf=$(grep -m1 "^# fail" /tmp/r57a-t.$$)
  printf '%-30s typecheck=%s  storable(%s)  frozen-rows-red=%s behavioural-rows-red=%s\n' \
    "$id" "$([ $tc -eq 0 ] && echo GREEN || echo RED)" "$nf" "$frozen" "$behav"
  grep -m2 "^not ok" /tmp/r57a-t.$$ | sed 's/^/     /'
  rm -f /tmp/r57a-tsc.$$ /tmp/r57a-t.$$
}

echo "== r57 §C: is the Promise<Trip> widening safe, or only permissive? =="
echo "baseline (no injection):"
report "baseline"

mkasync ""
report "A async, no mutation"

mkasync '(trip as unknown as {days: {title: string}[]}).days[0].title = "x";'
report "B async, mutates before return"

mkasync 'void Promise.resolve().then(() => { (trip as unknown as {days: {title: string}[]}).days[0].title = "x"; });'
report "C async, mutates in a DETACHED continuation"

restore
echo "tree restored:"; git status --porcelain packages/core/src | sed 's/^/   /'
