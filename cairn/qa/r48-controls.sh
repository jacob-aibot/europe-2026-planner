#!/usr/bin/env bash
# QA round 48 — the two controls behind §F and behind the G2 note.
#
#   bash qa/r48-controls.sh            (from cairn/)
#
# **C1 — R48-2 is a REGRESSION, not a standing hole.** `qa/r48-i13d.mjs` §F is run in a throwaway
# worktree at `4430e34` (round 47's head, the last commit before the generation guard). All three
# of its producers must be GREEN there. A finding that reproduces at both commits is a hole; one
# that only reproduces after a fix is a regression, and this is what tells them apart.
#
# **C2 — the G2 note, resolved.** The I-13d builder reported that restoring `state.doc?.id !==
# tripId` at the step-5 dispatch guard ALONE does not turn G2 red, and flagged it as surprising.
# It is benign, and this is why: the step-4 ticket already stops the batch for every transition
# that lands during `derive`, so a step-5 mutation is invisible THERE. The one place the two
# checks differ is A-66 Part 10 item 3's residual — a transition that lands inside
# `ports.photo.write` itself, where `state.doc?.id === tripId` is true on both sides and only a
# generation can tell them apart. §H drives exactly that, so §H is where the mutant goes red.
# Nothing in the working tree is modified.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$CAIRN/.." && pwd)"
TMP="$(mktemp -d)"
rc=0

cleanup() {
  git -C "$ROOT" worktree remove --force "$TMP/c1" >/dev/null 2>&1
  git -C "$ROOT" worktree remove --force "$TMP/c2" >/dev/null 2>&1
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "== C1 — §F at 4430e34 (round 47's head): all three producers must be GREEN =="
git -C "$ROOT" worktree add --detach "$TMP/c1" 4430e34 >/dev/null 2>&1 || { echo "worktree failed"; exit 1; }
ln -s "$CAIRN/node_modules" "$TMP/c1/cairn/node_modules"
cp "$CAIRN/qa/r48-i13d.mjs" "$TMP/c1/cairn/qa/r48-i13d.mjs"
OUT1="$(cd "$TMP/c1/cairn" && R48_ONLY=F node --experimental-strip-types qa/r48-i13d.mjs 2>&1)"
echo "$OUT1" | grep -E '^\s+(ok|FAIL)' | sed 's/^/   /'
if echo "$OUT1" | grep -q 'FAIL'; then
  echo "   CONTROL FAILED — §F is also red at 4430e34, so R48-2 is a standing hole and not a regression."
  rc=1
else
  echo "   CONTROL SOUND — §F is green at 4430e34 and red at HEAD. R48-2 is a REGRESSION."
fi

echo
echo "== C2 — the G2 note: the step-5 ticket is not redundant with the step-4 one =="
git -C "$ROOT" worktree add --detach "$TMP/c2" HEAD >/dev/null 2>&1 || { echo "worktree failed"; exit 1; }
ln -s "$CAIRN/node_modules" "$TMP/c2/cairn/node_modules"
cp "$CAIRN/qa/r48-i13d.mjs" "$TMP/c2/cairn/qa/r48-i13d.mjs"
python3 - "$TMP/c2/cairn/packages/client/src/store/store.ts" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
# The step-5 guard is the `guard.current` break immediately before `this.dispatch({ type: 'addPhoto'`.
old = "              if (!guard.current('doc', g)) break;\n              this.dispatch({"
new = "              if (state.doc?.id !== tripId) break;\n              this.dispatch({"
assert old in s, 'could not find the step-5 guard'
open(p, 'w').write(s.replace(old, new, 1))
print("   mutant applied: step 5 asks `state.doc?.id !== tripId` again; step 4 keeps its ticket")
PY
[ $? -eq 0 ] || exit 1
OUT2="$(cd "$TMP/c2/cairn" && R48_ONLY=H node --experimental-strip-types qa/r48-i13d.mjs 2>&1)"
echo "$OUT2" | grep -E '^\s+(ok|FAIL)' | sed 's/^/   /'
if echo "$OUT2" | grep -q 'FAIL.*no record is filed'; then
  echo "   CONTROL SOUND — with the id comparison back, the record IS filed against a document"
  echo "   generation the batch never saw. The two checks are not redundant; G2 simply cannot see"
  echo "   the difference, because G2's transition lands during \`derive\` where step 4 fires first."
else
  echo "   CONTROL FAILED — the step-5 mutation changed nothing even here, so the check may be dead."
  rc=1
fi

echo
[ $rc -eq 0 ] && echo "BOTH CONTROLS SOUND." || echo "A CONTROL FAILED — see above."
exit $rc
