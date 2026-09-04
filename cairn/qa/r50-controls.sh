#!/usr/bin/env bash
# QA round 50 — the PRE-EXISTENCE controls for R50-2 and R50-3.
#
#   bash qa/r50-controls.sh                 (from cairn/)
#
# `qa/r50-i13h.mjs` §J reproduces two cross-trip session writes: an abandoned import batch reporting
# its file's failure and its remaining count against the trip the user moved to (**R50-2**), and a
# failed `reclaimPhotoBytes` reporting trip A's orphan against trip B (**R50-3**). §K5 reproduces a
# third: a subscriber's exception recorded as the photo port's failure message (**R50-5**). None is
# about the availability triple's LIVENESS, so none is inside §4.2 **A-69** Part 5's fence or
# **A-70**'s predicate — but a finding filed against an increment has to say whether that increment
# caused it.
#
# This runs §J unchanged against **`43d0d20`** (QA round 49's head — the last commit before A-69) in
# a throwaway worktree. Identical output there means the shipped code at HEAD did not introduce
# them, and they route as pre-existing.
#
#   C1  §J and §K at `43d0d20`: the same FAIL lines, same values.
#   C2  the same sections at HEAD, printed side by side.
#
# Nothing in the working tree is modified.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$CAIRN/.." && pwd)"
TMP="$(mktemp -d)"
BEFORE="${R50_BEFORE:-43d0d20}"

cleanup() { git -C "$ROOT" worktree remove --force "$TMP/before" >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

echo "== C1 — \`qa/r50-i13h.mjs\` §J at $BEFORE (round 49's head, before A-69/A-70) =="
git -C "$ROOT" worktree add --detach "$TMP/before" "$BEFORE" >/dev/null 2>&1 || { echo "could not create worktree"; exit 1; }
ln -s "$CAIRN/node_modules" "$TMP/before/cairn/node_modules"
cp "$CAIRN/qa/r50-i13h.mjs" "$TMP/before/cairn/qa/r50-i13h.mjs"
( cd "$TMP/before/cairn" && R50_ONLY=J,K node --experimental-strip-types qa/r50-i13h.mjs ) 2>&1 \
  | grep -E '^  (ok|FAIL) +(J2|J3|J4|J5|K5)' | sed 's/^/  /'

echo
echo "== C2 — the same sections at HEAD =="
( cd "$CAIRN" && R50_ONLY=J,K node --experimental-strip-types qa/r50-i13h.mjs ) 2>&1 \
  | grep -E '^  (ok|FAIL) +(J2|J3|J4|J5|K5)' | sed 's/^/  /'

echo
echo "Identical FAIL sets above = R50-2, R50-3 and R50-5 are PRE-EXISTING and are not caused by A-69/A-70."
echo "-- r50-controls.sh COMPLETE --"
