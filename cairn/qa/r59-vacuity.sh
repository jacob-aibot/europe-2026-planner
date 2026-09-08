#!/usr/bin/env bash
# QA round 59 — is `DESCENT_CENSUS` non-vacuous, and does its message (KD-109's adapted sentence)
# actually render? A-80 Part 9's N13, re-derived by the breaker rather than taken on report, on
# rows and mutations the builder did NOT use.
#
# Also drives the KD-109 question directly: the two `NonDescent` rows fail in the OPPOSITE
# direction, so §C forces one of them to start descending and reads the sentence it prints.
#
# SAFETY: restores from a byte-exact backup, not `git checkout --`.
#
# Usage:  bash qa/r59-vacuity.sh          # from cairn/, ~35 s (5 full tsc runs)
set -u
cd "$(dirname "$0")/.." || exit 1
STOR=packages/core/test/storable.test.ts

BACKUP=$(mktemp -t r59-stor.XXXXXX) || exit 1
cp "$STOR" "$BACKUP"
restore() { cp "$BACKUP" "$STOR"; }
cleanup() { restore; rm -f "$BACKUP"; }
trap cleanup EXIT

mutate() { python3 - "$STOR" "$1" "$2" <<'PY'
import sys
p, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p).read()
assert s.count(old) == 1, f"expected exactly 1 occurrence of {old!r}, found {s.count(old)}"
open(p, 'w').write(s.replace(old, new))
PY
}

run() {
  local id="$1" want="${WANT:-RED}"; shift
  restore
  "$@" || { printf 'ERR  %-40s mutation failed\n' "$id"; return 1; }
  npx tsc -p tsconfig.json --noEmit >"/tmp/r59v.$$" 2>&1
  local code=$?
  restore
  if [ $code -eq 0 ]; then
    printf '%s %-40s typecheck GREEN%s\n' "$( [ "$want" = GREEN ] && echo 'ok  ' || echo 'GAP ' )" "$id" \
      "$( [ "$want" = GREEN ] || echo ' — the census did not notice' )"
  else
    local labels; labels=$(tr -d '\n' < "/tmp/r59v.$$" | grep -o 'descending: [a-z0-9-]*' | sed 's/descending: //' | sort -u | tr '\n' ' ')
    printf 'ok   %-40s RED  labels=[%s]\n' "$id" "$labels"
    if [ "${SHOW:-0}" = 1 ]; then sed -n '1,6p' "/tmp/r59v.$$" | sed 's/^/       /'; fi
  fi
  rm -f "/tmp/r59v.$$"
}

echo "== r59 SectionE: DESCENT_CENSUS non-vacuity, on rows the builder did not mutate =="
echo

# (1) a POSITIVE fixture emptied — the row must name itself and nothing else.
run "readonly-set positive broken" mutate \
  "Descent<'readonly-set', ReadonlySet<Door>, ReadonlySet<Doorless>>" \
  "Descent<'readonly-set', ReadonlySet<Doorless>, ReadonlySet<Doorless>>"

# (2) a NEGATIVE twin poisoned with a door — the same row must name itself. This is the failure
#     direction KD-109 says A-80 Part 4's original sentence never named.
run "index-signature-symbol twin poisoned" mutate \
  "Descent<'index-signature-symbol', { [k: symbol]: Door }, { [k: symbol]: Doorless }>" \
  "Descent<'index-signature-symbol', { [k: symbol]: Door }, { [k: symbol]: Door }>"

# (3) the `Members` walk deleted entirely — should take out most property-side rows at once.
run "Members made vacuously false" mutate \
  "true extends { [K in keyof T]-?: Carries<NonNullable<T[K]>, D> }[keyof T] ? true : false;" \
  "false;"

# (4) KD-109's own case: force a ruled NON-descent to start descending. `parameter-position`'s
#     fixture is replaced by one the walk DOES descend, so the row fires in the direction A-80
#     Part 4's verbatim sentence would have described falsely.
SHOW=1 run "parameter-position starts descending" mutate \
  "NonDescent<'parameter-position', (cb: Door) => void>," \
  "NonDescent<'parameter-position', { cb: Door }>,"

# (5) control: no mutation at all.
WANT=GREEN run "control (no mutation)" true

echo
echo "tree restored (byte-exact, not by git checkout):"
git status --porcelain packages/core | sed 's/^/   /'
