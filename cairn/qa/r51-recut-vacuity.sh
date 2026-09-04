#!/usr/bin/env bash
# QA round 51 — the vacuity controls for this round's `qa/` re-cuts.
#
#   bash qa/r51-recut-vacuity.sh              (from cairn/)
#
# Round 51 re-cut six probe assertions across three files (BUILD-NOTES **KD-95**):
#
#   `qa/r48-i13d.mjs`  §E faces 1 and 2 — wait for the parked `present()` gate instead of counting
#                      ticks, because §4.2 A-71's `attempt()` adds one promise hop per classified
#                      port call. §A's file census, widened for the new commit range.
#   `qa/r49-i13e.mjs`  **F1** and **G1b** — both anchored on the literal
#                      `await ports.photo.remove(tripId, photoId);`, which A-71 Part 4c row 2
#                      replaced. Re-anchored on the byte delete however it is spelled, and G1b
#                      widened from one adjacency to *"no ungated write in the tail"*.
#   `qa/r50-i13h.mjs`  **E1** (a `setAvailability` argument laid out over three lines), **E2**
#                      (`setBatch`'s variable-argument hop — KD-94), and **J1**'s three lines,
#                      which asserted the SHAPE of R50-2/R50-3 while both were open.
#
# **A re-cut assertion that cannot go red is a probe that observed nothing** — R49-2's defect in the
# probe layer, and round 50 filed it once already. Each control below plants the fault the re-cut
# line exists to catch, in a throwaway worktree, and requires that line RED. A control that finds
# the line ABSENT is reported as ABSENT and not as a pass: a probe's silence is not a measurement.
#
# Nothing in the working tree is modified.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$CAIRN/.." && pwd)"
TMP="$(mktemp -d)"
BEFORE="${R51_BEFORE:-8d69ff1}"
sound=0
missing=0

cleanup() {
  for d in "$TMP"/wt-*; do git -C "$ROOT" worktree remove --force "$d" >/dev/null 2>&1; done
  rm -rf "$TMP"
}
trap cleanup EXIT

# make_wt <name> [<commit>]  — a detached worktree with this tree's `qa/` copied in.
make_wt() {
  local name="$1"
  local at="${2:-HEAD}"
  local d="$TMP/wt-$name"
  git -C "$ROOT" worktree add --detach "$d" "$at" >/dev/null 2>&1 || { echo "  could not create worktree"; return 1; }
  ln -s "$CAIRN/node_modules" "$d/cairn/node_modules"
  cp "$CAIRN"/qa/r4[89]-*.mjs "$CAIRN"/qa/r5[01]-*.mjs "$d/cairn/qa/" 2>/dev/null
  echo "$d"
}

# expect_red <label> <probe> <ONLY-env> <grep-key> <worktree>
expect_red() {
  local label="$1"
  local probe="$2"
  local only="$3"
  local key="$4"
  local d="$5"
  local out=""
  local line=""
  out="$( cd "$d/cairn" && env "$only" node --experimental-strip-types "qa/$probe" 2>&1 )"
  line="$(printf '%s\n' "$out" | grep -E "^  (ok|FAIL) +$key" | head -1)"
  if [ -z "$line" ]; then
    echo "  ABSENT  $label — no line matching /$key/; the control observed NOTHING"
    missing=$((missing + 1))
  elif printf '%s' "$line" | grep -q '^  FAIL'; then
    echo "  RED     $label"
    sound=$((sound + 1))
  else
    echo "  GREEN   $label — the planted fault did NOT redden it; this assertion is vacuous"
    missing=$((missing + 1))
  fi
}

echo "== C1 — \`qa/r49-i13e.mjs\` F1: re-nest \`removePhoto\`'s supersede inside R45-4's value guard =="
D="$(make_wt c1)" && {
  python3 - "$D/cairn/packages/client/src/store/store.ts" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
i = s.index('async removePhoto(photoId: string)'); j = s.index('async reclaimPhotoBytes')
seg = s[i:j].replace("          guard.supersede('photoAvailability');\n", '', 1)
seg = seg.replace("          if (state.photos.available !== null) {\n            const available",
                  "          if (state.photos.available !== null) {\n            guard.supersede('photoAvailability');\n            const available", 1)
open(p, 'w').write(s[:i] + seg + s[j:])
PY
  expect_red "F1 — the supersede is no longer hoisted out of the value guard" r49-i13e.mjs R49_ONLY=F "F1 \(re-cut, A-69 Part 6 item 2\)" "$D"
}

echo
echo "== C2 — \`qa/r49-i13e.mjs\` G1b: drop the \`current('doc', g)\` gate from removePhoto's FAILURE arm =="
D="$(make_wt c2)" && {
  python3 - "$D/cairn/packages/client/src/store/store.ts" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = """        if (guard.current('doc', g)) {
          setPhotos({
            orphans: state.photos.orphans.includes(photoId)"""
new = """        {
          setPhotos({
            orphans: state.photos.orphans.includes(photoId)"""
assert old in s
open(p, 'w').write(s.replace(old, new, 1))
PY
  expect_red "G1b — an orphan is appended with no gate, so a reclaim lands on the wrong trip" r49-i13e.mjs R49_ONLY=G "G1b: and NO" "$D"
}

echo
echo "== C3 — \`qa/r50-i13h.mjs\` E1: one incremental write of the availability triple outside \`setAvailability\` =="
D="$(make_wt c3)" && {
  python3 - "$D/cairn/packages/client/src/store/store.ts" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = "      setBatch({ pending: Math.max(0, state.photos.pending - 1) });"
assert old in s
open(p, 'w').write(s.replace(old, "      set({ ...state, photos: { ...state.photos, available: new Set<string>() } });\n" + old, 1))
PY
  expect_red "E1 — a triple write outside the fence reads UNCLASSIFIED" r50-i13h.mjs R50_ONLY=E "E1:" "$D"
}

echo
echo "== C4 — \`qa/r50-i13h.mjs\` E2: a \`setBatch(\` call site whose argument is a variable =="
D="$(make_wt c4)" && {
  python3 - "$D/cairn/packages/client/src/store/store.ts" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = """      setBatch({
        pending: state.photos.pending + picked.length,
        total: (joining ? state.photos.total : 0) + picked.length,
      });"""
new = """      const opening = {
        pending: state.photos.pending + picked.length,
        total: (joining ? state.photos.total : 0) + picked.length,
      };
      setBatch(opening);"""
assert old in s
open(p, 'w').write(s.replace(old, new, 1))
PY
  expect_red "E2 — a variable argument at a \`setBatch\` call site (KD-94's own escape hatch)" r50-i13h.mjs R50_ONLY=E "E2: and all four" "$D"
}

echo
echo "== C5 — \`qa/r50-i13h.mjs\` J1: delete \`setBatch\`'s gate, which is A-66 Part 11's whole mechanism =="
D="$(make_wt c5)" && {
  python3 - "$D/cairn/packages/client/src/store/store.ts" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = """      const setBatch = (patch: Parameters<typeof setPhotos>[0]): void => {
        if (!guard.current('doc', g)) return;
        setPhotos(patch);
      };"""
new = """      const setBatch = (patch: Parameters<typeof setPhotos>[0]): void => {
        setPhotos(patch);
      };"""
assert old in s
open(p, 'w').write(s.replace(old, new, 1))
PY
  expect_red "J1 — \`setBatch\` is no longer the gate" r50-i13h.mjs R50_ONLY=J "J1 \(re-cut\): and \`setBatch\`" "$D"
  expect_red "J2 — and R50-2 reproduces again on the running store" r50-i13h.mjs R50_ONLY=J "J2 \(re-cut" "$D"
}

echo
echo "== C6 — \`qa/r50-i13h.mjs\` J1: restore \`reclaimPhotoBytes\` to its pre-\`37cf4f0\` shape =="
D="$(make_wt c6)" && {
  python3 - "$D/cairn/packages/client/src/store/store.ts" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
i = s.index('async reclaimPhotoBytes('); j = s.index('async exportActive(')
seg = s[i:j].replace("      const g = guard.observe('doc');\n", '', 1)
seg = seg.replace("      if (guard.current('doc', g)) setPhotos({ orphans: kept });",
                  "      setPhotos({ orphans: kept });", 1)
open(p, 'w').write(s[:i] + seg + s[j:])
PY
  expect_red "J1 — the \`doc\` observation is gone again (R50-3 re-opened)" r50-i13h.mjs R50_ONLY=J "J1 \(re-cut\): \`reclaimPhotoBytes\`" "$D"
  expect_red "J4 — and the orphan lands on trip B again" r50-i13h.mjs R50_ONLY=J "J4 \(re-cut" "$D"
}

echo
echo "== C7 — \`qa/r48-i13d.mjs\` §E, RE-TIMED, run at \`$BEFORE\` (before A-71) =="
echo "  The re-timing must not change what §E measures. Green at the pre-A-71 store and green at"
echo "  HEAD is the whole claim: the hop \`attempt()\` adds moved WHEN the gate appears, not what"
echo "  the section proves."
D="$(make_wt c7 "$BEFORE")" && {
  out="$( cd "$D/cairn" && R48_ONLY=E node --experimental-strip-types qa/r48-i13d.mjs 2>&1 )"
  n="$(printf '%s\n' "$out" | grep -cE '^  FAIL')"
  printf '%s\n' "$out" | grep -E '^  (ok|FAIL) +R48-1 face' | sed 's/^/  /'
  if [ "$n" = "0" ]; then echo "  SOUND   §E is ALL CLEAR at $BEFORE with the re-timed drain"; sound=$((sound + 1));
  else echo "  BROKEN  §E prints $n FAIL at $BEFORE — the re-timing changed what it measures"; missing=$((missing + 1)); fi
}

echo
echo "== C8 — the same section at HEAD =="
D="$(make_wt c8)" && {
  out="$( cd "$D/cairn" && R48_ONLY=E node --experimental-strip-types qa/r48-i13d.mjs 2>&1 )"
  n="$(printf '%s\n' "$out" | grep -cE '^  FAIL')"
  printf '%s\n' "$out" | grep -E '^  (ok|FAIL) +R48-1 face' | sed 's/^/  /'
  if [ "$n" = "0" ]; then echo "  SOUND   §E is ALL CLEAR at HEAD too"; sound=$((sound + 1));
  else echo "  BROKEN  §E prints $n FAIL at HEAD"; missing=$((missing + 1)); fi
}

echo
if [ "$missing" = "0" ] && [ "$sound" -ge 10 ]; then echo "ALL CONTROLS SOUND ($sound)"; else echo "$missing CONTROL(S) NOT SOUND, $sound sound"; fi
echo "-- r51-recut-vacuity.sh COMPLETE --"
[ "$missing" = "0" ] && [ "$sound" -ge 10 ]
