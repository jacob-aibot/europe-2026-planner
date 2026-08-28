#!/usr/bin/env bash
# Round 21 — A-25 Part 6 **clause 3**, run end to end: R20-1's own four-step mutation.
#
#   Run: bash qa/r21-clause3.sh      (from cairn/)
#
# A-25 Part 1 claims that a new field on a censused record can no longer reach a
# green-and-blind state. Clause 3 makes that checkable as four steps, and this script is
# those four steps. It works in a throwaway `git worktree` at HEAD and removes it at the
# end; nothing in the working tree is touched.
#
#   1. Add a 16th `Stop` field — `voucher?: { code: string }` — written by `makeStop` only
#      when truthy. Exactly `ticket`'s shape, which is how R19-5 stayed invisible.
#   2. `npm run typecheck` must fail at TWO sites (round 20 measured ONE):
#      `copyStop.test.ts` and `readOnce.test.ts`, both `TS2741`.
#   3. Satisfy both maps the way a builder would. The census's fixture test must stay RED —
#      there is no green-and-blind state to walk past.
#   4. Populate the fixture (and classify `voucher` into `MINIMAL_STOP_ABSENT`). 4/4 green.
#      Then plant R19-5's exact shape and the census must red assertion 1 with
#      `srcStop.voucher ×3` on every row whose source stop is maximal (14 of 15 — row 14 is
#      the minimal fixture and carries no `voucher` by construction).
#
# Round 21 ran this and all four steps reproduce.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"
WT="$(mktemp -d)/wt"

say() { printf '\n== %s ==\n' "$1"; }

git -C "$REPO" worktree add --detach "$WT" HEAD >/dev/null 2>&1 || { echo "could not create worktree"; exit 1; }
trap 'git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1' EXIT
ln -s "$CAIRN/node_modules" "$WT/cairn/node_modules"
W="$WT/cairn"
RO="$W/packages/core/test/readOnce.test.ts"
CP="$W/packages/core/test/copyStop.test.ts"

say "step 1 — a 16th \`Stop\` field, written by \`makeStop\` only when truthy"
python3 - "$W" <<'PY'
import sys
W = sys.argv[1]
p = W + '/packages/core/src/model/types.ts'; s = open(p).read()
assert '  ticket?: Ticket | null;\n' in s
open(p, 'w').write(s.replace('  ticket?: Ticket | null;\n', '  ticket?: Ticket | null;\n  voucher?: { code: string };\n', 1))
p = W + '/packages/core/src/build/stops.ts'; s = open(p).read()
s = s.replace("  ticket?: Stop['ticket'];", "  ticket?: Stop['ticket'];\n  voucher?: Stop['voucher'];", 1)
s = s.replace("    ...(init.ticket ? { ticket: init.ticket } : {}),",
              "    ...(init.ticket ? { ticket: init.ticket } : {}),\n    ...(init.voucher ? { voucher: init.voucher } : {}),", 1)
open(p, 'w').write(s)
print('  added Stop.voucher + StopInit.voucher + makeStop\'s truthy write')
PY

say "step 2 — \`npm run typecheck\` must fail at TWO sites, both TS2741"
( cd "$W" && npm run typecheck 2>&1 | grep -E 'error TS2741' )
N=$( cd "$W" && npm run typecheck 2>&1 | grep -cE 'error TS2741' )
echo "  TS2741 sites: $N  (clause 3 requires 2; round 20 measured 1)"

say "step 3 — satisfy both maps the way a builder would; the fixture test must stay RED"
python3 - "$W" <<'PY'
import sys
W = sys.argv[1]
p = W + '/packages/core/test/copyStop.test.ts'; s = open(p).read()
s = s.replace("  durationMins: true, links: true, ticket: true,\n};\nconst COST_FIELDS",
              "  durationMins: true, links: true, ticket: true, voucher: true,\n};\nconst COST_FIELDS", 1)
s = s.replace(".filter((k) => k !== 'ticket').sort(),", ".filter((k) => k !== 'ticket' && k !== 'voucher').sort(),", 1)
open(p, 'w').write(s)
p = W + '/packages/core/test/readOnce.test.ts'; s = open(p).read()
open(p, 'w').write(s.replace("  durationMins: true, links: true, ticket: true,\n};",
                             "  durationMins: true, links: true, ticket: true, voucher: true,\n};", 1))
PY
( cd "$W" && npm run typecheck 2>&1 | grep -E 'error TS' ) ; echo "  typecheck now clean (no output above)"
node --experimental-strip-types --test "$RO" 2>&1 | grep -E '^(not )?ok [0-9]+ '
node --experimental-strip-types --test "$RO" 2>&1 | sed -n "/not ok 3/,/'voucher'/p" | tail -4

say "step 4a — populate the fixture and classify \`voucher\` out of the minimal row: 4/4 green"
python3 - "$W" <<'PY'
import sys
W = sys.argv[1]
p = W + '/packages/core/test/readOnce.test.ts'; s = open(p).read()
s = s.replace("      ticket: { kind: 'bundled', path: 'tickets/entry.pdf', label: 'Entry' },",
              "      ticket: { kind: 'bundled', path: 'tickets/entry.pdf', label: 'Entry' },\n      voucher: { code: 'VCH-0754' },", 1)
s = s.replace("const MINIMAL_STOP_ABSENT: ReadonlyArray<keyof Stop> = ['links', 'ticket'];",
              "const MINIMAL_STOP_ABSENT: ReadonlyArray<keyof Stop> = ['links', 'ticket', 'voucher'];", 1)
open(p, 'w').write(s)
PY
node --experimental-strip-types --test "$RO" 2>&1 | grep -E '^(not )?ok [0-9]+ |^# (pass|fail)'

say "step 4b — plant R19-5's exact shape on the new field: assertion 1 must red"
python3 - "$W" <<'PY'
import sys
W = sys.argv[1]
p = W + '/packages/core/src/build/copyStop.ts'; s = open(p).read()
old = "    // no `ticket`: §6.6, a ticket is an access credential\n  };"
assert old in s
open(p, 'w').write(s.replace(old, "    ...(src.voucher && src.voucher.code ? { voucher: src.voucher } : {}),\n" + old, 1))
PY
node --experimental-strip-types --test "$RO" 2>&1 | grep -E '^(not )?ok [0-9]+ |^# (pass|fail)'
echo "  offenders:"
node --experimental-strip-types --test "$RO" 2>&1 | sed -n "/actual:/,/operator/p" | grep 'voucher' | head -20
echo
echo "worktree discarded."
