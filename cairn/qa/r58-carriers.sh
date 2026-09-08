#!/usr/bin/env bash
# QA round 58 — A-79 / I-18. The successor to `qa/r57-doorforms.sh`.
#
# A-79 Part 11 makes a precise, falsifiable closure claim:
#
#   "A sixth finding on this class is legitimate only if it exhibits a `Trip`-producing callable
#    reachable from a censused export that `Carries` does not see, and there are exactly three ways
#    for that: an overload set whose last signature does not return `Trip`, a carrier nested more
#    than 12 property/return hops deep, and a cast."
#
# This script tests exactly that claim, by injecting one carrier form at a time into
# `packages/core/src/derive/lifecycle.ts` — a censused file, no new file, no new directory, no cast
# — and running a full `npx tsc -p tsconfig.json --noEmit`.
#
#   RED   = a census line fired = the carrier is seen.
#   GREEN = the carrier is INVISIBLE to `Carries`.
#
# Row 0 is A-78 fault N1 verbatim and MUST be RED, or the harness is lying.
# Rows marked `expected=RED` that come back GREEN are the finding.
#
# Usage:  bash qa/r58-carriers.sh          # from cairn/
set -u
cd "$(dirname "$0")/.." || exit 1
TARGET=packages/core/src/derive/lifecycle.ts
HEADER='import type { ConflictResolution } from "../model/types.ts";
type R58Door = (t: Trip, r: ConflictResolution) => Trip;
const r58mk = (trip: Trip, r: ConflictResolution): Trip =>
  ({ ...trip, resolutions: [...trip.resolutions, r], revision: trip.revision + 1 });'

restore() { git checkout -- "$TARGET" 2>/dev/null; }
trap restore EXIT

run_case() {
  local id="$1" expect="$2" body="$3"
  restore
  { printf '\n%s\n' "$HEADER"; printf '%s\n' "$body"; } >> "$TARGET"
  npx tsc -p tsconfig.json --noEmit >"/tmp/r58-tsc.$$" 2>&1
  local code=$?
  restore
  local verdict; [ $code -ne 0 ] && verdict=RED || verdict=GREEN
  local mark; [ "$verdict" = "$expect" ] && mark="ok  " || mark="GAP "
  printf '%s %-34s census=%-5s expected=%-5s %s\n' "$mark" "$id" "$verdict" "$expect" \
    "$( [ $code -ne 0 ] && head -1 "/tmp/r58-tsc.$$" | cut -c1-100 )"
  rm -f "/tmp/r58-tsc.$$"
}

echo "== r58 §A: is a Trip-producing callable reachable from a censused export ALWAYS seen? =="
echo "   (RED = seen.  GREEN = invisible = outside A-79 Part 11's three named exceptions.)"
echo

run_case "0-control-plain-fn" RED '
export function archiveTrip(trip: Trip, r: ConflictResolution): Trip { return r58mk(trip, r); }'

run_case "1-control-object-literal" RED '
export const r58ops = { archive: r58mk };'

# --- the union family: a carrier that is a union with ANY non-object member, or with a second
#     object type whose keys do not overlap. `[T] extends [object]` is bracketed to suppress
#     distribution (A-79 Part 3 detail 1), and `keyof` a union is the INTERSECTION of its keys.
run_case "2-union-carrier-or-undefined" RED '
export const r58maybe: { archive: R58Door } | undefined = { archive: r58mk };'

run_case "3-union-carrier-or-null" RED '
export const r58nullable: { archive: R58Door } | null = { archive: r58mk };'

run_case "4-discriminated-union-carrier" RED '
export type R58Hook = { kind: "archive"; run: R58Door } | { kind: "none"; reason: string };
export const r58hook: R58Hook = { kind: "archive", run: r58mk };'

run_case "5-optional-nested-carrier" RED '
export const r58plugins: { archiver?: { archive: R58Door } } = { archiver: { archive: r58mk } };'

run_case "6-set-of-doors" RED '
export const r58set: Set<R58Door> = new Set([r58mk]);'

run_case "7-iterable-of-doors" RED '
export const r58iter: Iterable<R58Door> = [r58mk];'

run_case "8-N9-as-a-union-not-a-method" RED '
export type R58Rule =
  | { id: string; run: (t: Trip) => string[] }
  | { id: string; autofix: R58Door };
export const r58rules: R58Rule[] = [{ id: "x", autofix: r58mk }];'

run_case "9-door-behind-a-Promise-union" RED '
export const r58async: { archive: (t: Trip, r: ConflictResolution) => Promise<Trip> } | undefined =
  { archive: async (t, r) => r58mk(t, r) };'

# --- the construct-signature family: `Carries` walks CALL signatures only.
run_case "10-construct-signature-door" RED '
export declare const R58Ctor: new (t: Trip, r: ConflictResolution) => Trip;'

# --- controls that MUST stay green: a too-eager predicate is a defect in I-18, not a door.
run_case "11-neg-control-non-door-union" GREEN '
export const r58plain: { run: (t: Trip) => string[] } | undefined = { run: () => [] };'

run_case "12-neg-control-optional-nested-nondoor" GREEN '
export const r58plain2: { inner?: { run: (t: Trip) => string[] } } = {};'

echo
echo "== r58 §B: the depth bound, at and past 12 (A-79 Part 11 exception 2 — EXPECTED gap at 13) =="
run_case "13-nested-12-hops" RED '
export const r58d12: {a1:{a2:{a3:{a4:{a5:{a6:{a7:{a8:{a9:{a10:{a11:{a12: R58Door}}}}}}}}}}}} =
  {a1:{a2:{a3:{a4:{a5:{a6:{a7:{a8:{a9:{a10:{a11:{a12: r58mk}}}}}}}}}}}};'
run_case "14-nested-13-hops (known residue)" GREEN '
export const r58d13: {a1:{a2:{a3:{a4:{a5:{a6:{a7:{a8:{a9:{a10:{a11:{a12:{a13: R58Door}}}}}}}}}}}}} =
  {a1:{a2:{a3:{a4:{a5:{a6:{a7:{a8:{a9:{a10:{a11:{a12:{a13: r58mk}}}}}}}}}}}}};'

echo
echo "== r58 §C: the overload residue, confirmed still open (A-79 Part 11 exception 1) =="
run_case "15-overload-set (known residue)" GREEN '
export function r58ov(trip: Trip, r: ConflictResolution): Trip;
export function r58ov(trip: Trip, n: number): number;
export function r58ov(trip: Trip, x: ConflictResolution | number): Trip | number {
  return typeof x === "number" ? x : r58mk(trip, x);
}'

echo
echo "== r58 §D: is the overload residue LIVE? — overload sets under packages/core/src =="
node - <<'EOF'
import('node:fs').then(({ readdirSync, readFileSync }) => {
  const root = 'packages/core/src';
  const files = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p);
    }
  })(root);
  // an overload set = two `export function NAME(` or `function NAME(` declarations of the same
  // name in one file, or a declaration with no body (`);` terminated signature).
  let hits = 0;
  for (const f of files) {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const counts = new Map();
    for (const m of src.matchAll(/^\s*(?:export\s+)?(?:declare\s+)?function\s+(\w+)\s*[<(]/gm)) {
      counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    }
    for (const [name, n] of counts) if (n > 1) { hits++; console.log(`   LIVE overload set: ${f} :: ${name} ×${n}`); }
    // a bodiless signature is the other half of an overload set
    for (const m of src.matchAll(/^\s*(?:export\s+)?function\s+(\w+)\s*\([^)]*\)\s*:\s*[^;{]+;\s*$/gm)) {
      console.log(`   bodiless signature: ${f} :: ${m[1]}`);
    }
  }
  console.log(hits === 0
    ? '   ok   ZERO overload sets under packages/core/src — the residue is theoretical, not live'
    : `   GAP  ${hits} overload set(s) LIVE — A-79 Part 11 exception 1 has fired`);
  console.log(`   (${files.length} .ts files scanned)`);
});
EOF

echo
echo "done — tree restored:"
git status --porcelain packages/core/src | sed 's/^/   /'
