#!/usr/bin/env bash
# QA round 50 — the vacuity controls for the NINE lines this round re-cut in `qa/r49-i13e.mjs`,
# plus the three that carry `qa/r50-i13h.mjs`'s own new claims.
#
#   bash qa/r50-recut-vacuity.sh            (from cairn/)
#
# Everything runs in throwaway `git worktree`s; **nothing in the working tree is modified**.
# Exit 0 = every control sound.
#
# The nine re-cut lines split into two kinds, and each kind gets the control that fits it:
#
#   C1  **the five SOURCE-SHAPE lines** — §F1 ×2 and §H ×3 (the eighth `supersede('browsing')`,
#       `availabilityOwed === 0`, the two settling sites, A-69 Part 8's pane clear). Their old
#       expected values were the shape of machinery A-69 Part 6 item 1 DELETED. The control checks
#       out `packages/client/src/store/store.ts` **at `4398de5`** (round 49's head, the last commit
#       before A-69) into a worktree at HEAD and runs the re-cut probe against it: every one must go
#       **RED**, and an assertion of an empty set that stayed green against the code that filled it
#       would be exactly the vacuity A-68 Part 9 warns about.
#   C2  **the four DOCUMENT-CLAIM lines** — §F1's G14 correction and §J ×3. They assert that A-69
#       Parts 9/10 and A-68's revision-50 amendment banner exist. The control checks out
#       `docs/ARCHITECTURE.md` **at `4398de5`** (revision 49, before A-69 was written) and runs the
#       re-cut probe: all four must go **RED**, because the corrections they assert did not exist.
#   C3  **`qa/r50-i13h.mjs` §B2** — *"every function on the returned object is `settling`'s
#       wrapper"*. Mutant: `settling` skips one method by name, which is precisely the
#       "a method added carelessly bypasses the boundary" hazard the check exists for. Must go RED
#       **and name the escaped method**.
#   C4  **`qa/r50-i13h.mjs` §C1/§C6** — A-70's eaten retry. Mutant: A-70 Part 6 **G26**'s own
#       published fault, `availabilityError === null` restored as a conjunct of
#       `availabilityUnanswered`. Both must go RED, which is this round confirming A-70's fix is
#       load-bearing rather than decorative.
#   C5  **`qa/r50-i13h.mjs` §E1** — the type fence census. Mutant: one incremental write of
#       `available` outside `setAvailability`. Must go RED and name the new site.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$CAIRN/.." && pwd)"
TMP="$(mktemp -d)"
FAILED=0
OLD="${R50_OLD:-4398de5}"

cleanup() {
  for w in "$TMP"/c1 "$TMP"/c1b "$TMP"/c2 "$TMP"/c3 "$TMP"/c4 "$TMP"/c5; do
    git -C "$ROOT" worktree remove --force "$w" >/dev/null 2>&1
  done
  rm -rf "$TMP"
}
trap cleanup EXIT

mkwt() {                                    # $1 = name, $2… = probes to copy in
  local n="$1"; shift
  local w="$TMP/$n"
  git -C "$ROOT" worktree add --detach "$w" HEAD >/dev/null 2>&1 || { echo "could not create worktree"; exit 1; }
  ln -s "$CAIRN/node_modules" "$w/cairn/node_modules"
  for f in "$@"; do cp "$CAIRN/qa/$f" "$w/cairn/qa/$f"; done
  echo "$w"
}

# **A-69 Part 9's requirement applied to this script itself**: a line that never RAN is not a line
# that came out green, and conflating the two is exactly R49-2. Three outcomes here, never two.
expect_red() {                              # $1 = output, $2 = fragment, $3 = human name
  if ! grep -qF "$2" "$1"; then
    echo "  ABSENT $3   <-- the assertion never executed; the mutant killed the probe before it"
    FAILED=1
  elif grep -F "$2" "$1" | grep -q '^  FAIL'; then
    echo "  RED   $3"
  else
    echo "  GREEN $3   <-- VACUOUS: the assertion does not distinguish the mutant"
    FAILED=1
  fi
}
expect_green() {                            # a line this control must deliberately NOT move
  if grep -F "$2" "$1" | grep -q '^  ok'; then echo "  GREEN $3 (expected — see the comment above)"
  else echo "  MOVED $3   <-- this control was supposed to leave it alone"; FAILED=1; fi
}

# ------------------------------------------------------------------ C1: the five source-shape lines
echo "== C1 — the five source-shape re-cuts, against \`store.ts\` at $OLD (pre-A-69) =="
W1="$(mkwt c1 r49-i13e.mjs)"
git -C "$ROOT" show "$OLD:cairn/packages/client/src/store/store.ts" > "$W1/cairn/packages/client/src/store/store.ts"
( cd "$W1/cairn" && R49_ONLY=F,H node --experimental-strip-types qa/r49-i13e.mjs ) > "$TMP/c1.out" 2>&1
# §F1's first line is a NON-REGRESSION check of A-68 Part 5a, which A-69 Part 6 item 2 keeps
# verbatim — so the pre-A-69 source satisfies it too and it must stay GREEN here. Its own mutant is
# C1b below; separating them is the point, because a control that cannot fail is not a control.
expect_green "$TMP/c1.out" "F1 (re-cut, A-69 Part 6 item 2)" "§F1 — the hoisted supersede + nested value guard"
expect_red "$TMP/c1.out" "F1 (re-cut, A-69 Part 6 item 1)" "§F1 — \`availabilityOwed\`/discharge deleted from \`removePhoto\`"
expect_red "$TMP/c1.out" "exactly eight \`supersede('browsing')\`" "§H — seven -> eight (A-69 Part 8)"
expect_red "$TMP/c1.out" "A-69 Part 8 (QA R49-4): and it now clears a pane" "§H — the pane clear on the non-active delete"
expect_red "$TMP/c1.out" "\`availabilityOwed\` is DELETED" "§H — \`availabilityOwed\` 7 -> 0"
expect_red "$TMP/c1.out" "A-68 Part 5b's \`doc\`-slot discharge is gone from BOTH" "§H — the two discharge lines 2 -> 0"
expect_red "$TMP/c1.out" "and both settling sites are present in their ruled shapes" "§H — S1's two arms and S2's \`finally\`"
grep -c '^  FAIL' "$TMP/c1.out" | sed 's/^/  note  total FAIL lines against the old source: /'

# ------------------------------------------------------------------ C1b: §F1's own mutant
echo
echo "== C1b — §F1's non-regression line, against the supersede put BACK inside R45-4's value guard =="
W1B="$(mkwt c1b r49-i13e.mjs)"
python3 "$CAIRN/qa/r50-mutate.py" nest-supersede "$W1B/cairn/packages/client/src/store/store.ts"
( cd "$W1B/cairn" && R49_ONLY=F node --experimental-strip-types qa/r49-i13e.mjs ) > "$TMP/c1b.out" 2>&1
expect_red "$TMP/c1b.out" "F1 (re-cut, A-69 Part 6 item 2)" "§F1 — the supersede re-nested inside the value guard (A-68 Part 5a undone, which is R48-1)"

# ------------------------------------------------------------------ C2: the four document-claim lines
echo
echo "== C2 — the four document-claim re-cuts, against \`ARCHITECTURE.md\` at $OLD (revision 49) =="
W2="$(mkwt c2 r49-i13e.mjs)"
git -C "$ROOT" show "$OLD:cairn/docs/ARCHITECTURE.md" > "$W2/cairn/docs/ARCHITECTURE.md"
( cd "$W2/cairn" && R49_ONLY=F,J node --experimental-strip-types qa/r49-i13e.mjs ) > "$TMP/c2.out" 2>&1
expect_red "$TMP/c2.out" "F1 (re-cut): A-69 Part 10 item 1 CORRECTS G14" "§F1 — G14's correction exists"
expect_red "$TMP/c2.out" "R49-2 (re-cut): A-68's revision-50 amendment banner" "§J — A-68's banner declares \"§K is green\" false"
expect_red "$TMP/c2.out" "R49-2 (re-cut): and A-69 Part 9 rules it" "§J — A-69 Part 9 + the terminal-marker requirement"
expect_red "$TMP/c2.out" "R49-3a (re-cut): A-69 Part 10 item 1 corrects G14" "§J — Part 10 item 1"
expect_red "$TMP/c2.out" "R49-3c (re-cut): A-69 Part 10 item 3" "§J — Part 10 item 3's corrected \`:231\` control"

# ------------------------------------------------------------------ C3: S1's totality check
echo
echo "== C3 — \`r50-i13h.mjs\` §B2, against a \`settling\` that skips one method =="
W3="$(mkwt c3 r50-i13h.mjs)"
python3 "$CAIRN/qa/r50-mutate.py" skip-one-method "$W3/cairn/packages/client/src/store/store.ts"
( cd "$W3/cairn" && R50_ONLY=B node --experimental-strip-types qa/r50-i13h.mjs ) > "$TMP/c3.out" 2>&1
expect_red "$TMP/c3.out" "B2: **every** function on the returned object" "§B2 — one escaped method"
grep -F 'B2: **every**' "$TMP/c3.out" | sed 's/^/  note  /'

# ------------------------------------------------------------------ C4: A-70's own G26 fault
echo
echo "== C4 — \`r50-i13h.mjs\` §C, against A-70 G26's published fault (the conjunct restored) =="
W4="$(mkwt c4 r50-i13h.mjs)"
python3 "$CAIRN/qa/r50-mutate.py" restore-conjunct "$W4/cairn/packages/client/src/store/store.ts"
( cd "$W4/cairn" && R50_ONLY=C node --experimental-strip-types qa/r50-i13h.mjs ) > "$TMP/c4.out" 2>&1
expect_red "$TMP/c4.out" "C1: **the retry is not eaten**" "§C1 — the eaten retry comes back"
expect_red "$TMP/c4.out" "C6: A-65 T1 holds on the failed fixture" "§C6 — A-65 T1 regresses to \`unreadable\`"
grep -F 'C1: **the retry is not eaten**' "$TMP/c4.out" | sed 's/^/  note  /'
grep -F 'C6: A-65 T1 holds' "$TMP/c4.out" | sed 's/^/  note  /'

# ------------------------------------------------------------------ C5: the type fence census
echo
echo "== C5 — \`r50-i13h.mjs\` §E1, against one incremental write outside \`setAvailability\` =="
W5="$(mkwt c5 r50-i13h.mjs)"
python3 "$CAIRN/qa/r50-mutate.py" fourth-writer "$W5/cairn/packages/client/src/store/store.ts"
( cd "$W5/cairn" && R50_ONLY=E node --experimental-strip-types qa/r50-i13h.mjs ) > "$TMP/c5.out" 2>&1
expect_red "$TMP/c5.out" "E1: every \`available\`/\`availabilityError\` site" "§E1 — a fourth incremental writer"
grep -F 'UNCLASSIFIED' "$TMP/c5.out" | head -2 | sed 's/^/  note  /'

echo
if [ "$FAILED" -eq 0 ]; then echo "ALL CONTROLS SOUND — every re-cut line distinguishes its mutant"; else echo "A CONTROL IS VACUOUS — see the GREEN line(s) above"; fi
echo "-- r50-recut-vacuity.sh COMPLETE --"
exit "$FAILED"
