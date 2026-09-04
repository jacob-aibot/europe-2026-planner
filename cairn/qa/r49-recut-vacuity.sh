#!/usr/bin/env bash
# QA round 49 — the vacuity controls for the FOUR lines this round re-cut in `qa/r47-i13c.mjs`.
#
# §4.2 **A-68 Part 9** rules that three assertions invert and that the round-49 breaker watches
# each one **red first** against a named mutant — because *"an assertion that a set is empty passes
# trivially against a probe that imported nothing, and the control is what separates the two."*
# Applying Part 9's own predicate rather than its list found a **fourth** (§K's U4), so four lines
# are controlled here, not three.
#
#   bash qa/r49-recut-vacuity.sh            (from cairn/)
#
# Two mutants, each in its own throwaway worktree at HEAD, each running the CURRENT (re-cut) probe
# copied in from the working tree. Nothing in the working tree is modified. Exit 0 = both controls
# sound.
#
#   M1  `isLiveTrip(tripId)` restored and the step-4 generation check deleted, so the guard fires
#       AFTER `ports.photo.write` again — A-68 Part 9's own mutant for the three clause-(i) lines
#       (§B `:210`, §C `:263`, §K's `U4`). Each must go RED, reporting the OLD expected value.
#   M2  **The deleted mechanism restored WHOLE** — `isLiveTrip(tripId)` at step 4 *and*
#       `state.doc?.id !== tripId` at step 5 — for the clause-(ii) line (§B, the `A → B → A`
#       return trip). A-68 Part 9's stated mutant is *"restores `state.doc?.id !== tripId` at step
#       5"* alone, and **that mutant does not reproduce** (QA R49-3): A-67 replaced BOTH of R46-1's
#       guards with generation checks, and the **step-4** one fires first, so the batch is already
#       stopped before step 5 is reached. Only the pair restores the old outcome, which is the one
#       the round-47 assertion was measuring. Measured, not assumed: `M2_STEP5_ONLY=1` runs Part
#       9's mutant as worded and shows it green.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$CAIRN/.." && pwd)"
TMP="$(mktemp -d)"
FAILED=0

cleanup() {
  for w in "$TMP"/m1 "$TMP"/m2; do git -C "$ROOT" worktree remove --force "$w" >/dev/null 2>&1; done
  rm -rf "$TMP"
}
trap cleanup EXIT

mkwt() {                                    # $1 = name
  local w="$TMP/$1"
  git -C "$ROOT" worktree add --detach "$w" HEAD >/dev/null 2>&1 || { echo "could not create worktree"; exit 1; }
  ln -s "$CAIRN/node_modules" "$w/cairn/node_modules"
  cp "$CAIRN/qa/r47-i13c.mjs" "$w/cairn/qa/r47-i13c.mjs"
  echo "$w"
}

# --------------------------------------------------------------------- M1
W1="$(mkwt m1)"
python3 - "$W1/cairn/packages/client/src/store/store.ts" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
live = """  function isLiveTrip(id: string): boolean {
    return state.activeTripId === id || state.library.some((r) => r.id === id);
  }

  /** `err.name` is the platform's own word for a full disk."""
s2 = s.replace("  /** `err.name` is the platform's own word for a full disk.", live, 1)
assert s2 != s, 'could not re-insert isLiveTrip'
old = "              if (!guard.current('doc', g)) break;\n              const id = ports.ids.newId('photo');"
assert old in s2, 'could not find the step-4 guard'
s3 = s2.replace(old, "              const id = ports.ids.newId('photo');", 1)
oldw = "                await ports.photo.write(tripId, id, derived.thumb.bytes, derived.display.bytes);"
assert oldw in s3
s4 = s3.replace(oldw, oldw + "\n                if (!isLiveTrip(tripId)) break;", 1)
open(p, 'w').write(s4)
print('M1 applied: isLiveTrip(tripId) restored AFTER the write, step-4 generation check deleted')
PY
[ $? -eq 0 ] || exit 1

OUT1="$(cd "$W1/cairn" && timeout 900 node --experimental-strip-types qa/r47-i13c.mjs --fast 2>&1)"
for pat in 'A-66 Part 10 item 2 (re-cut at round 49)' 'A-66 \*\*U4\*\* (re-cut at round 49): the abandoned files strand NO' 'A-66 \*\*U4\*\* (re-cut at round 49): the guard precedes'; do
  if echo "$OUT1" | grep -qF "FAIL  ${pat//\\/}"; then
    echo "  RED under M1   ${pat//\\/}"
  else
    echo "  NOT RED under M1 — the line asserts nothing:   ${pat//\\/}"
    FAILED=1
  fi
done
echo "$OUT1" | grep -F 'FAIL  A-66' | sed 's/^/    /'

# --------------------------------------------------------------------- M2
W2="$(mkwt m2)"
python3 - "$W2/cairn/packages/client/src/store/store.ts" "${M2_STEP5_ONLY:-0}" <<'PY'
import sys
p, step5only = sys.argv[1], sys.argv[2] == '1'
s = open(p).read()
if not step5only:
    # Step 4 first: A-67's generation check fires BEFORE the write and stops the batch on the
    # outward leg, so restoring step 5 alone can never be reached on the return trip.
    live = """  function isLiveTrip(id: string): boolean {
    return state.activeTripId === id || state.library.some((r) => r.id === id);
  }

  /** `err.name` is the platform's own word for a full disk."""
    s2 = s.replace("  /** `err.name` is the platform's own word for a full disk.", live, 1)
    assert s2 != s, 'could not re-insert isLiveTrip'
    old4 = "              if (!guard.current('doc', g)) break;\n              const id = ports.ids.newId('photo');"
    assert old4 in s2, 'could not find the step-4 guard'
    s = s2.replace(old4, "              const id = ports.ids.newId('photo');", 1)
    oldw = "                await ports.photo.write(tripId, id, derived.thumb.bytes, derived.display.bytes);"
    assert oldw in s
    s = s.replace(oldw, oldw + "\n                if (!isLiveTrip(tripId)) break;", 1)
# The step-5 guard is the LAST `guard.current('doc', g)) break;` — immediately before
# `this.dispatch({`. R46-1's shipped form, which id-identity makes true on a return trip.
old5 = "              if (!guard.current('doc', g)) break;\n              this.dispatch({"
assert old5 in s, 'could not find the step-5 guard'
s = s.replace(old5, "              if (state.doc?.id !== tripId) break;\n              this.dispatch({", 1)
open(p, 'w').write(s)
print('M2 applied: ' + ('step-5 `state.doc?.id !== tripId` ONLY (A-68 Part 9 as worded)'
                        if step5only else
                        'the deleted mechanism restored WHOLE — isLiveTrip at step 4 and state.doc?.id !== tripId at step 5'))
PY
[ $? -eq 0 ] || exit 1

OUT2="$(cd "$W2/cairn" && timeout 900 node --experimental-strip-types qa/r47-i13c.mjs --fast 2>&1)"
if echo "$OUT2" | grep -qF 'FAIL  A → B → A (re-cut at round 49)'; then
  echo "  RED under M2   A → B → A (the return trip)"
  echo "$OUT2" | grep -F 'FAIL  A → B → A' | sed 's/^/    /'
else
  echo "  NOT RED under M2 — the inverted return-trip line asserts nothing"
  FAILED=1
fi

echo
if [ "$FAILED" -eq 0 ]; then
  echo "VACUITY CONTROLS SOUND — all four re-cut lines are RED against A-68 Part 9's own mutants."
  exit 0
fi
echo "VACUITY CONTROL FAILED — at least one re-cut line passed against its mutant."
exit 1
