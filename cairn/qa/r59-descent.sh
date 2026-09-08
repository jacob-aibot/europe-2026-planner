#!/usr/bin/env bash
# QA round 59 — A-80 / I-19. The successor to `qa/r58-carriers.sh`.
#
# A-80 Part 10 withdrew A-79's enumerated-exceptions closure claim and replaced it with a COVERAGE
# claim:
#
#   "`Carries` descends through every place a TypeScript type holds another type on its OUTPUT
#    side: union members, intersection members, properties, index signatures, array and tuple
#    elements, a call signature's return type (awaited), and a construct signature's instance
#    type ... checked by `DESCENT_CENSUS`, not by this paragraph."
#
# and it states what a seventh finding must look like:
#
#   "either a place a TypeScript type holds another type on its output side that `DESCENT_CENSUS`
#    has no row for, OR a row whose positive fixture passes while a structurally equivalent shipped
#    shape is missed."
#
# This script exhibits BOTH kinds, by injecting one shape at a time into
# `packages/core/src/derive/lifecycle.ts` — a censused file, no new file, no cast, no `any`, no
# overload set, nesting depth <= 2 — and running a full `npx tsc -p tsconfig.json --noEmit`.
#
#   RED   = a census line fired = the shape is seen.
#   GREEN = the shape is INVISIBLE to all three censuses.
#
# Rows 0-1 are the controls that must be RED or the harness is lying. Rows marked `expected=RED`
# that come back GREEN are the finding.
#
# SAFETY (round 59 process fix, see `qa/README.md`): this probe restores its target from a
# byte-exact backup taken at startup, NOT with `git checkout --`. Round 58's probes used
# `git checkout` and destroyed the I-19 builder's uncommitted work once. Running this on a dirty
# tree is safe: whatever was in the file when the probe started is what is in it when it exits.
#
# Usage:  bash qa/r59-descent.sh          # from cairn/, ~90 s (13 full tsc runs)
set -u
cd "$(dirname "$0")/.." || exit 1
TARGET=packages/core/src/derive/lifecycle.ts

BACKUP=$(mktemp -t r59-lifecycle.XXXXXX) || exit 1
cp "$TARGET" "$BACKUP"
restore() { cp "$BACKUP" "$TARGET"; }
cleanup() { restore; rm -f "$BACKUP"; }
trap cleanup EXIT

HEADER='import type { ConflictResolution } from "../model/types.ts";
type R59Door = (t: Trip, r: ConflictResolution) => Trip;
type R59Inert = (t: Trip) => void;
const r59mk = (trip: Trip, r: ConflictResolution): Trip =>
  ({ ...trip, resolutions: [...trip.resolutions, r], revision: trip.revision + 1 });'

FAILURES=0
run_case() {
  local id="$1" expect="$2" body="$3"
  restore
  { printf '\n%s\n' "$HEADER"; printf '%s\n' "$body"; } >> "$TARGET"
  npx tsc -p tsconfig.json --noEmit >"/tmp/r59-tsc.$$" 2>&1
  local code=$?
  restore
  local verdict; [ $code -ne 0 ] && verdict=RED || verdict=GREEN
  local mark; if [ "$verdict" = "$expect" ]; then mark="ok  "; else mark="GAP "; FAILURES=$((FAILURES+1)); fi
  printf '%s %-38s census=%-5s expected=%-5s %s\n' "$mark" "$id" "$verdict" "$expect" \
    "$( [ $code -ne 0 ] && head -1 "/tmp/r59-tsc.$$" | cut -c1-90 )"
  rm -f "/tmp/r59-tsc.$$"
}

echo "== r59 §A: the door is a UNION MEMBER, not one hop below one (R59-1) =="
echo "   A-80's Carries docstring: 'Asked of every member of a union, answered true if ANY says so'."
echo

run_case "0-control-plain-fn" RED '
export function archiveTrip(trip: Trip, r: ConflictResolution): Trip { return r59mk(trip, r); }'

run_case "1-control-N12-union-carrier" RED '
export const r59maybe: { archive: R59Door } | undefined = { archive: r59mk };'

# --- the finding: the DOOR ITSELF as a union member, beside a second CALLABLE whose return is not
#     Trip. `IsDoor` is applied to the whole union before distribution and `TripishReturn` unions
#     the members returns (`Trip | void`), so the union is not a door; `CarriesOne`, which is what
#     distribution reaches, never re-applies `IsDoor`. Every DESCENT_CENSUS union row puts the door
#     one hop BELOW the member (`{run: Door} | undefined`), so no row can fail on this.
# Row 2 comes back RED, but read the LINE: it is `storable.test.ts(769,7)` = ILLEGAL_SHAPE_CENSUS,
# not (1047,7) = HIDDEN_DOOR_CENSUS. A top-level `Door | Inert` is refused as a return shape core
# does not permit — an ACCIDENTAL catch by a different census, and A-80 Part 7's own lesson is that
# "a carrier caught by accident is evidence of nothing". It does not survive one hop of nesting:
# rows 3-8 put the same union inside a property and every one of them is GREEN.
run_case "2-door-as-union-member" RED '
export const r59either: R59Door | R59Inert = r59mk;'

run_case "3-N9-N11-a-THIRD-shape-sideways" RED '
export type R59Rule = { id: string; autofix?: R59Door | R59Inert };
export const r59rule: R59Rule = { id: "r59", autofix: r59mk };'

run_case "4-union-member-door-in-property" RED '
export const r59ops: { archive: R59Door | R59Inert } = { archive: r59mk };'

run_case "5-union-member-door-in-array" RED '
export const r59list: (R59Door | R59Inert)[] = [r59mk];'

run_case "6-union-member-door-in-record" RED '
export const r59reg: Record<string, R59Door | R59Inert> = { a: r59mk };'

run_case "7-union-member-door-in-map" RED '
export const r59map: Map<string, R59Door | R59Inert> = new Map([["a", r59mk]]);'

run_case "8-union-member-door-behind-discriminant" RED '
export type R59Hook = { kind: "a"; run: R59Door | R59Inert } | { kind: "n"; why: string };
export const r59hook: R59Hook = { kind: "a", run: r59mk };'

run_case "9-negative-control-two-inert-callables" GREEN '
export const r59inert: R59Inert | ((t: Trip) => string[]) = () => {};'

echo
echo "== r59 §B: the abstract-new arm is unreachable behind a call signature (R59-2) =="
echo "   CarriesOne arms are ordered and exclusive: the callable arm matches first."
echo

run_case "10-ctor-only-produces-Trip-control" RED '
export declare const r59ctor: new (t: Trip, r: ConflictResolution) => Trip;'

run_case "11-hybrid-call-and-ctor-produces-Trip" RED '
export declare const r59hybrid: { (): string; new (t: Trip, r: ConflictResolution): Trip };'

run_case "12-hybrid-call-and-ctor-carrier-instance" RED '
export declare const r59hybrid2: { (): string; new (): { archive: R59Door } };'

echo
echo "== r59 SectionC: ILLEGAL_SHAPE_CENSUS reads declarations, not reachability (R59-3) =="
echo "   A-78 Part 2 forbids a Trip|Day return; A-79/I-18 taught the DOOR census to ask whether a"
echo "   door is REACHABLE rather than how it is declared. The illegal-shape census never learned."
echo

run_case "13-illegal-return-top-level-control" RED '
export function r59mixed(t: Trip): Trip | { id: string } { return t; }'

run_case "14-illegal-return-one-hop-down" RED '
export const r59mixedOps = { mixed(t: Trip): Trip | { id: string } { return t; } };'

run_case "15-illegal-return-in-a-Rule-shaped-type" RED '
export type R59Rule2 = { id: string; autofix?(t: Trip, r: ConflictResolution): Trip | { id: string } };
export const r59rule2: R59Rule2 = { id: "x", autofix: (t) => t };'

echo
echo "tree restored (byte-exact, not by git checkout):"
git status --porcelain packages/core/src | sed 's/^/   /'
echo
echo "gaps: $FAILURES"
exit $([ "$FAILURES" -eq 0 ] && echo 0 || echo 1)
