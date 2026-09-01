#!/usr/bin/env bash
# I-8j — every criterion's INJECTED FAULT, measured rather than asserted.
#
#   Run: bash qa/i8j-faults.sh            (from cairn/; bare Node, no browser, no server)
#
# ARCHITECTURE §4.4 **A-54**: **G7′/G7″** (the cells tile the container, and no cell draws a
# boundary of its own), **D** (a ring the index cannot draw is stated rather than blanked — I19),
# and **G5′** (the last tie is broken by latitude, and the alphabet is named where it survives).
# ROADMAP I-8j's ship gate is *"every criterion above has its injected fault red"*: a test that
# cannot go red is not a test, so each mutation below is applied to a throwaway copy of the tree,
# the relevant suite is run, and the colour is compared to what the ruling says it should be. A
# MISMATCH line means a criterion is NOT load-bearing.
#
# What the previous matrices cover, and what moved:
#   `qa/i8i-faults.sh`  — fault 7 (A-52's ring filter), fault 9 (A-51 G7's grid) and fault 16
#                         (the second `clusterPoints` call) are RE-POINTED there onto the lines
#                         A-54 moved. Faults 1–6, 8, 10–15 are untouched and still red.
# **This file is the successor for the three clauses A-54 changes**, and every fault below
# targets a clause that exists today.
#
# The browser-side criteria — G7′'s container-occupancy matrix over 8 libraries x 5 widths, and
# G7″'s computed-style check — need `npm run web:build` and a server, so they live in
# `qa/i8j-render.mjs`; faults 1 and 2 below are their source-level floor.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
MISMATCH=""

say() { printf '\n== %s ==\n' "$1"; }

# A throwaway copy: source copied for real, `node_modules` HARD-LINKED so the copy is instant.
make_copy() {
  local wt; wt="$(mktemp -d)/cairn"
  mkdir -p "$wt"
  local f
  for f in "$CAIRN"/*; do
    case "$(basename "$f")" in
      node_modules) cp -al "$f" "$wt/node_modules" ;;
      *) cp -r "$f" "$wt/" ;;
    esac
  done
  rm -rf "$wt/apps/web/dist"
  printf '%s' "$wt"
}

# fault <label> <file> <python-replace-script> <test-files...>
fault() {
  local label="$1" file="$2" py="$3"; shift 3
  local wt; wt="$(make_copy)"
  ( cd "$wt" && python3 -c "
import sys
p='$file'
s=open(p).read()
before=s
$py
if s==before:
    sys.exit('the mutation matched nothing')
open(p,'w').write(s)
" ) || { echo "  SETUP FAILED: $label"; MISMATCH="$MISMATCH\n  $label (setup)"; rm -rf "$(dirname "$wt")"; return; }
  local out
  out="$(cd "$wt" && node --test "$@" 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' ')"
  local failed; failed="$(printf '%s' "$out" | sed -n 's/.*# fail \([0-9]*\).*/\1/p')"
  if [ "${failed:-0}" -gt 0 ]; then
    echo "  RED (expected)   $label   -> $out"
  else
    echo "  GREEN (MISMATCH) $label   -> $out"
    MISMATCH="$MISMATCH\n  $label"
  fi
  rm -rf "$(dirname "$wt")"
}

# control <label> <file> <python-replace-script> <test-files...>
#
# **A mutation that must stay GREEN, and saying so is the point.** A-54 Part 3 measures the
# canonical-position key as deciding **0** adjacent pairs over 30,680 libraries — reachable in
# principle, unreached in practice on any library the shipped index can produce. A fault matrix
# that filed that as a red fault would be claiming a coverage it does not have. So the mutation
# is run, the expected colour is GREEN, and a RED here is the MISMATCH: it would mean the key IS
# reachable and the census is wrong.
control() {
  local label="$1" file="$2" py="$3"; shift 3
  local wt; wt="$(make_copy)"
  ( cd "$wt" && python3 -c "
import sys
p='$file'
s=open(p).read()
before=s
$py
if s==before:
    sys.exit('the mutation matched nothing')
open(p,'w').write(s)
" ) || { echo "  SETUP FAILED: $label"; MISMATCH="$MISMATCH\n  $label (setup)"; rm -rf "$(dirname "$wt")"; return; }
  local out
  out="$(cd "$wt" && node --test "$@" 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' ')"
  local failed; failed="$(printf '%s' "$out" | sed -n 's/.*# fail \([0-9]*\).*/\1/p')"
  if [ "${failed:-0}" -eq 0 ]; then
    echo "  GREEN (expected) $label   -> $out"
  else
    echo "  RED (MISMATCH)   $label   -> $out"
    MISMATCH="$MISMATCH\n  $label (expected GREEN)"
  fi
  rm -rf "$(dirname "$wt")"
}

# ---------------------------------------------------------------------------
# G7′ / G7″ — the layout. A-54 Part 1, the manager's MGR-1.
# ---------------------------------------------------------------------------

say '1. A-54 G7′ — A-51 G7'"'"'s grid comes back (the container goes back to 66.7% separator ink)'
# The exact rule A-54 supersedes. In Chromium this returns the occupancy matrix to 66.7% empty
# (`AT CZ DE HR HU SI`, the 239-code ceiling and `FJ` alone at 960 and 1440), 45.6% (`FR`+`US` at
# 1440), 29.0% (Europe 2026 at 1440) and 104.6% — i.e. OVERFLOW — at 320.
fault 'display: flex -> the auto-fill grid with align-items: start' \
  'apps/web/src/styles.css' \
  "s=s.replace('  display: flex;\n  flex-wrap: wrap;','  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(var(--pane-min, 300px), 1fr));\n  align-items: start;')" \
  test/views.test.ts

say '2. A-54 G7′ — the cell stops growing to fill its line (a flex row with no flex)'
fault 'the cell loses `flex: 1 1 var(--pane-min)`' \
  'apps/web/src/styles.css' \
  "s=s.replace('  flex: 1 1 var(--pane-min, 300px);\n','')" \
  test/views.test.ts

say '3. A-54 G7′ — the 320 px overflow comes back (a cell that cannot shrink below its basis)'
fault 'flex: 1 0 var(--pane-min) — grow, but never shrink' \
  'apps/web/src/styles.css' \
  "s=s.replace('  flex: 1 1 var(--pane-min, 300px);','  flex: 1 0 var(--pane-min, 300px);')" \
  test/views.test.ts

say '4. A-54 G7″ — the cell draws a boundary of its own again (R38-3'"'"'s letterbox returns)'
# R38-3's harm was a map painting 44.1% of a VISIBLY DELIMITED box. G7″ is the clause that keeps
# it fixed now that R38-3's own cell criterion is withdrawn.
fault 'a 1 px border on .worldmap__pane' \
  'apps/web/src/styles.css' \
  "s=s.replace('  flex: 1 1 var(--pane-min, 300px);','  border: var(--rule);\n  flex: 1 1 var(--pane-min, 300px);')" \
  test/views.test.ts

say '5. A-54 G7′ — masonry: the sequence the eye follows stops being the DOM order'
# Refused on A-53's ground, not on support: I18's claim is a claim about that sequence. The
# source-level floor is that the container is not a grid at all; the rendered oracle is
# `qa/i8j-render.mjs` section E, which compares geometric top-left order to DOM order.
fault 'grid-auto-flow: dense on the pane container' \
  'apps/web/src/styles.css' \
  "s=s.replace('  display: flex;\n  flex-wrap: wrap;','  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fill, minmax(var(--pane-min, 300px), 1fr));')" \
  test/views.test.ts

# ---------------------------------------------------------------------------
# D / I19 — the ring guard. A-54 Part 2, QA R39-1 and R39-2.
# ---------------------------------------------------------------------------

say '6. A-54 D — the predicate is removed (R39-1 reproduced: viewBox "NaN NaN NaN NaN", missing: [])'
# The finding itself. `countryParts` is a public export taking an INJECTED index; A-52 rested its
# safety on `tools/gen-countries.mjs` dropping short rings at the mint, which is true of today's
# artefact and is not a property of the function.
fault 'drawableRing always returns true' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('  if (n < 2 || n % 2 !== 0) return false;\n  for (let i = 0; i < n; i++) if (!Number.isFinite(ring[i])) return false;\n  return true;','  return true;')" \
  packages/core/test/countryParts.test.ts packages/client/test/world-map.test.ts

say '7. A-54 D — the finiteness half only (an odd-length ring is caught, a NaN is not)'
fault 'the Number.isFinite scan is dropped' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('  for (let i = 0; i < n; i++) if (!Number.isFinite(ring[i])) return false;\n','')" \
  packages/core/test/countryParts.test.ts packages/client/test/world-map.test.ts

say '8. A-54 D — the parity half only (a NaN is caught, `[1,2,3]` is not)'
fault 'the even-length / >= 2 test is dropped' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('  if (n < 2 || n % 2 !== 0) return false;\n','')" \
  packages/core/test/countryParts.test.ts packages/client/test/world-map.test.ts

say '9. A-54 D — ALL-OR-STATED becomes "draw the good rings" (R38-5, one round on)'
# The lost vertex ends up outside the frame it was dropped from and nothing on screen hints at
# it, and I11 gains an "except the ones we skipped" clause it does not have.
fault 'an undrawable ring is skipped rather than making the code undrawable' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('      if (!drawableRing(ring)) return null;\n      rings.push(ring);','      if (drawableRing(ring)) rings.push(ring);')" \
  packages/core/test/countryParts.test.ts packages/client/test/world-map.test.ts

say '10. A-54 Part 2 — countryKeyPoint keeps its own `ring.length < 6` filter (R39-2'"'"'s I12 break)'
# The inconsistency A-52 left behind: a 2-point ring made the principal part'"'"'s `key`
# `{5.5, 5.5}` while `countryKeyPoint` answered the union box'"'"'s `{0, 0}`.
fault 'the < 6 filter is restored in countryKeyPoint' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('  let principal = rings[0];\n  let principalArea = ringAreaKm2(rings[0]);\n  for (let i = 1; i < rings.length; i++) {','  const long = rings.filter((r) => r.length >= 6);\n  if (long.length === 0) return { lat: 0, lng: 0 };\n  let principal = long[0];\n  let principalArea = ringAreaKm2(long[0]);\n  for (let i = 1; i < long.length; i++) {')" \
  packages/core/test/countryParts.test.ts packages/core/test/countryKeyPoint.test.ts

say '11. A-54 Part 2 — the entry-box fallback comes back (a box centre is not a point of the country, I8)'
fault 'countryKeyPoint falls back to the union of its entry boxes' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('  const rings = drawableRingsOf(code, index);\n  if (rings === null) return null;\n\n  let principal = rings[0];','  const rings = drawableRingsOf(code, index);\n  if (rings === null) {\n    let w = Infinity, so = Infinity, e = -Infinity, n2 = -Infinity, seen = false;\n    for (const entry of index.countries) {\n      if (entry.code !== code) continue;\n      seen = true;\n      if (entry.box[0] < w) w = entry.box[0];\n      if (entry.box[1] < so) so = entry.box[1];\n      if (entry.box[2] > e) e = entry.box[2];\n      if (entry.box[3] > n2) n2 = entry.box[3];\n    }\n    if (!seen || !Number.isFinite(w) || !Number.isFinite(so) || !Number.isFinite(e) || !Number.isFinite(n2)) return null;\n    return { lat: (so + n2) / 2, lng: (w + e) / 2 };\n  }\n\n  let principal = rings[0];')" \
  packages/core/test/countryParts.test.ts packages/core/test/countryKeyPoint.test.ts

say '12. A-54 Part 2 — the guard lives in the build tool again (the frame'"'"'s `missing` test is not total)'
# A second runtime check in `packages/client` would be the belt on a belt (A-54 Part 2), so the
# only place the biconditional can be broken is core. This is the vacuity control for I19: if the
# frame still states the code with D gone, something else is doing D's job.
fault 'drawableRingsOf returns whatever the index carries' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('  return rings.length === 0 ? null : rings;','  return rings;')" \
  packages/core/test/countryParts.test.ts packages/client/test/world-map.test.ts

# ---------------------------------------------------------------------------
# G5′ — the tie-break. A-54 Part 3, QA R39-5.
# ---------------------------------------------------------------------------

say '13. A-54 G5′ — the geographic keys are dropped (the alphabet decides again, 11,456 libraries reorder)'
fault 'bounds.north / bounds.west removed from the comparator' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    if (a.bounds.north !== b.bounds.north) return b.bounds.north - a.bounds.north;\n    if (a.bounds.west !== b.bounds.west) return a.bounds.west - b.bounds.west;\n','')" \
  packages/client/test/world-map.test.ts

say '14. A-54 G5′ — latitude ascending (the map is read south to north)'
fault 'bounds.north sorted ascending' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    if (a.bounds.north !== b.bounds.north) return b.bounds.north - a.bounds.north;','    if (a.bounds.north !== b.bounds.north) return a.bounds.north - b.bounds.north;')" \
  packages/client/test/world-map.test.ts

say '15. A-54 G5′ — longitude FIRST (the ±180 seam decides, and hands AQ/FJ/RU back to the alphabet)'
# A-54's own reason for the key order: three single-country panes sit exactly on the seam, so a
# westmost primary key ties precisely the codes A-51 residue 3 already discloses as broken.
fault 'bounds.west is promoted above bounds.north' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    if (a.bounds.north !== b.bounds.north) return b.bounds.north - a.bounds.north;\n    if (a.bounds.west !== b.bounds.west) return a.bounds.west - b.bounds.west;','    if (a.bounds.west !== b.bounds.west) return a.bounds.west - b.bounds.west;\n    if (a.bounds.north !== b.bounds.north) return b.bounds.north - a.bounds.north;')" \
  packages/client/test/world-map.test.ts

say '16. A-54 G5′ — `bounds.south` instead of `bounds.north` (a pane is read by its bottom edge)'
fault 'the third key is the pane south edge' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    if (a.bounds.north !== b.bounds.north) return b.bounds.north - a.bounds.north;','    if (a.bounds.south !== b.bounds.south) return b.bounds.south - a.bounds.south;')" \
  packages/client/test/world-map.test.ts

say '17. A-54 G5′ — the geographic keys are promoted ABOVE weight (I18 falls, FR opens on Guiana)'
# I18 is a theorem of key 1 and G5′ may not reach it. Alaska is at N 71.4, so a latitude-first
# order puts a weight-0 extent pane in front of every home pane.
fault 'bounds.north promoted above weight' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    if (a.weight !== b.weight) return b.weight - a.weight;\n    if (a.home.length !== b.home.length) return b.home.length - a.home.length;\n    if (a.bounds.north !== b.bounds.north) return b.bounds.north - a.bounds.north;','    if (a.bounds.north !== b.bounds.north) return b.bounds.north - a.bounds.north;\n    if (a.weight !== b.weight) return b.weight - a.weight;\n    if (a.home.length !== b.home.length) return b.home.length - a.home.length;')" \
  packages/client/test/world-map.test.ts

say '18. A-54 G5′ — the canonical position, and this one is a CONTROL that must stay GREEN'
# A-54 Part 3 keeps this key, NAMED as the alphabet, precisely because two panes with identical
# `weight`, `home.length`, `north` and `west` are not provably impossible on an arbitrary index —
# and it measures the key as deciding **0** adjacent pairs over 30,680 libraries. So no test on
# the shipped index can turn a mutation of it red, and filing it as a red fault would claim a
# coverage this suite does not have. It stays as a control: GREEN confirms the census, and a RED
# would mean the key IS reachable and A-54 Part 3's "canonical decides 0" is wrong.
# (`qa/i8d-faults.sh` fault 7 was its red half when it was the ONLY tie-break; it no longer is.)
control 'the last key is removed and the sort falls back to input order' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    return a.members[0] - b.members[0];','    return 0;')" \
  packages/client/test/world-map.test.ts

# ---------------------------------------------------------------------------
# The vacuity controls — A-54 Part 4's corrected numbers, and the index census.
# ---------------------------------------------------------------------------

say '19. A-54 Part 4 / R39-3 — the greedy ceiling is asserted at A-51'"'"'s 14 rather than at 18'
fault 'the 18-code library is replaced by A-51\x27s 14-code one' \
  'packages/client/test/world-map.test.ts' \
  "s=s.replace(\"  const worst = ['AQ', 'AU', 'CL', 'EH', 'FJ', 'GL', 'GU', 'IO', 'MS', 'MX', 'PK', 'PN', 'RO', 'RU', 'RW', 'SH', 'TF', 'VN'];\",\"  const worst = ['AD', 'AE', 'AG', 'AO', 'AQ', 'AR', 'AS', 'AU', 'CA', 'CN', 'FM', 'IO', 'PN', 'TF'];\")" \
  packages/client/test/world-map.test.ts

say '20. A-54 Part 4 / R39-4 — I-8i'"'"'s set-equality criterion is asserted instead of the true one'
# *"every remaining >120° pane traces to `AQ FJ KI RU UM`"* is false on 49 panes, 48 of which
# span more than 180° and one of which (`CA`+`GL`, 128.8°) is an honest wide frame.
fault 'the >120° census asserts the five-code set equality' \
  'packages/client/test/world-map.test.ts' \
  "s=s.replace('  assert.deepEqual({ wide, withFive, without, over180 }, { wide: 1236, withFive: 1187, without: 49, over180: 48 });','  assert.deepEqual({ without }, { without: 0 });')" \
  packages/client/test/world-map.test.ts

say '21. the vacuity control — the shipped index census moves (the guard would be out of scope)'
# If any of the six numbers moves, the index changed and this increment is not what it says it is.
fault 'the census asserts 291 entries instead of 292' \
  'packages/core/test/countryParts.test.ts' \
  "s=s.replace('{ entries: 292, rings: 1033, odd: 0, nonFinite: 0, noRings: 0, shortest: 8 }','{ entries: 291, rings: 1033, odd: 0, nonFinite: 0, noRings: 0, shortest: 8 }')" \
  packages/core/test/countryParts.test.ts

if [ -n "$MISMATCH" ]; then
  printf '\nMISMATCHES — these criteria are NOT load-bearing:%b\n\n' "$MISMATCH"
  exit 1
fi
printf '\nALL FAULTS RED\n\n'
