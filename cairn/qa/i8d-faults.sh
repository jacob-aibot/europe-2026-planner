#!/usr/bin/env bash
# I-8d — every criterion's INJECTED FAULT, measured rather than asserted.
#
#   Run: bash qa/i8d-faults.sh            (from cairn/; bare Node, no browser, no server)
#
# ROADMAP I-8d's ship gate is *"every criterion above has its injected fault red"*. A test
# that cannot go red is not a test, so each mutation below is applied to a throwaway copy of
# the tree, the relevant suite is run, and the colour is compared to what the ROADMAP says
# it should be. A MISMATCH line means a criterion is not load-bearing.
#
# The browser-side criterion (every pane's rendered viewBox is the Node string) has its fault
# in `qa/i8d-render.mjs` and needs a build; it is not run here.
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
$py
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

# [I-8i] retired <label> <clause> <what-the-fault-used-to-mutate>
# ARCHITECTURE §4.4 A-51 withdraws C5 (the dominance/split test), C6's lowest-ISO tie-break and
# C7's cap + union-of-the-rest pane, and A-51 Part 6 removes `countryKeyPoint`'s production
# caller. A mutation that matches nothing here is not a MISMATCH — the criterion did not stop
# being load-bearing, the clause it guarded was withdrawn — and the mutation text is kept rather
# than deleted. The live matrix for the model that replaced it is `qa/i8i-faults.sh`.
RETIRED=0
retired() {
  RETIRED=$((RETIRED + 1))
  printf '  RETIRED          %s\n                   withdrawn by %s; the fault mutated: %s\n' "$1" "$2" "$3"
}

say '1. the threshold — raise it to 8,000 km and the sample stops splitting'
fault 'WORLD_CLUSTER_THRESHOLD_KM = 8000' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('WORLD_CLUSTER_THRESHOLD_KM = 4000','WORLD_CLUSTER_THRESHOLD_KM = 8000')" \
  packages/client/test/world-map.test.ts

say '2. the padding term — drop it and containment stops being strict (A-42 (b), R33-6)'
fault 'FRAME_PAD_FRACTION = 0' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('FRAME_PAD_FRACTION = 0.02','FRAME_PAD_FRACTION = 0')" \
  packages/client/test/world-map.test.ts

say '3. the padding term — a constant number of degrees instead of a fraction'
fault 'pad = 0.5 degrees, not 0.02 x max(w,h)' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('const pad = FRAME_PAD_FRACTION * Math.max(w, h);','const pad = 0.5;')" \
  packages/client/test/world-map.test.ts

say '4. the dominance test — weaken it to "the primary is the largest" and a tie splits'
retired '2*w(primary) > W  ->  ranked.length >= 2' 'A-51 (C5 withdrawn — QA R38-2)' \
  "const split = ranked.length >= 2 && 2 * weightOf(ranked[0]) > totalWeight; -> const split = ranked.length >= 2;"
# The fault this stood for — "the frame splits on the wrong quantity" — is now unreachable
# because there is no split decision. `qa/i8i-faults.sh` fault 1 restores C5 wholesale instead.

say '5. C7 fold-in — drop clusters 3..N and a code becomes unrepresented'
retired 'panes[2] = ranked[2] only, not the union' 'A-51 G6 (the cap and the union pane are withdrawn)' \
  "paneGroups = [ranked[0], ranked[1], ranked.slice(2).flat()...] -> [ranked[0], ranked[1], ranked[2]]"
# The clause it guarded — "nothing is dropped" — survives as L4/I1 and is exercised by
# `qa/i8i-faults.sh` fault 3 (drop the zero-weight components) instead.

# [I-8g] Re-pointed: §4.4 A-48 C2′ replaced C2's union-box centre with `core.countryKeyPoint`,
# so the line this mutated is gone. The fault it stands for — the frame deciding where a country
# is from a box of its own — is injected at the call site instead. Also `qa/i8g-faults.sh` §7.
say '6. C2\x27 [I-8g] / [I-8i] — key off a bounding rectangle instead of the greatest ring'
# [I-8i] RE-POINTED again: A-51 Part 6 removes `countryKeyPoint`'s production caller (G3 clusters
# PARTS, and the principal part's key IS the country key point — I12). The clause is unchanged
# and the mutation moves one level down, onto the part key core hands over.
fault 'part key = the part box centre' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('      key: points[key],','      key: { lat: (s + n) / 2, lng: (w + e) / 2 },')" \
  packages/client/test/world-map.test.ts packages/core/test/countryParts.test.ts

say '7. C6 — drop the lowest-ISO tie-break and ranking stops being total'
# [I-8i] RE-POINTED. C6's lowest-ISO tie-break is withdrawn, because G5's third key — the
# component's position in the canonical part list — is total by construction and leaves no tie
# for an alphabet to break. The clause the fault guards is the same one: **the ordering must be
# total**. Drop G5's third key and it stops being.
# **Disclosed rather than faked (KD-74).** `return 0` here is NOT red, and it is not red for a
# reason worth writing down: `clusterPoints` already emits its components in ascending
# lowest-member-index order and `Array.prototype.sort` is stable, so G5's third key agrees with
# the array order it is sorting and removing it changes nothing on the shipped kernel. The key is
# still what makes the ordering total *as a statement* — it is what stops the answer depending on
# the kernel's output convention — so the fault that measures it is the one that makes it
# DISAGREE with that convention: reverse it, and two equal-weight panes swap.
fault 'G5\x27s third key is reversed — equal-weight panes come out in the wrong order' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    return a.members[0] - b.members[0];','    return b.members[0] - a.members[0];')" \
  packages/client/test/world-map.test.ts

# [I-8g] Re-pointed: A-48 C3′ made the kernel the connected components of the threshold graph,
# so "nearest-fit vs first-fit" is no longer the distinction to inject. The fault that matters now
# is the superseded rule itself. Also `qa/i8g-faults.sh` §5.
say '8. C3\x27 [I-8g] — clusterPoints goes back to first-fit'
fault 'first-fit, not connected components' \
  'packages/core/src/derive/cluster.ts' \
  "import re
s=re.sub(r'export function clusterPoints\(points: readonly LatLng\[\], thresholdKm: number\): number\[\]\[\] \{.*?\n\}\n', '''export function clusterPoints(points: readonly LatLng[], thresholdKm: number): number[][] {
  const groups: number[][] = [];
  for (let i = 0; i < points.length; i++) {
    const g = groups.find((gr) => gr.some((j) => haversine(points[j], points[i]) < thresholdKm));
    if (g) g.push(i);
    else groups.push([i]);
  }
  return groups;
}
''', s, count=1, flags=re.S)" \
  packages/core/test/clusterPoints.test.ts

say '9. C3 — the threshold comparison widens from < to <='
fault 'haversine <= thresholdKm' \
  'packages/core/src/derive/cluster.ts' \
  "s=s.replace('haversine(points[i], points[j]) < thresholdKm','haversine(points[i], points[j]) <= thresholdKm')" \
  packages/core/test/clusterPoints.test.ts

say '10. Part 6 — clusterStops stops delegating and writes the loop out again'
fault 'clusterStops re-implements the loop' \
  'packages/core/src/derive/cluster.ts' \
  "s=s.replace('  return clusterPoints(pts.map((p) => p.at), thresholdKm).map((g) => g.map((i) => pts[i].stop));','  const groups = [];\n  for (const p of pts) {\n    const g = groups.find((gr) => gr.some((q) => haversine(q.at, p.at) < thresholdKm));\n    if (g) g.push(p); else groups.push([p]);\n  }\n  return groups.map((g) => g.map((x) => x.stop));')" \
  packages/core/test/clusterPoints.test.ts

say '11. W3 — the renderer selects a pane\x27s countries by a coordinate comparison'
fault 'membership by d-string prefix, not paneId' \
  'apps/web/src/views/WorldMap.tsx' \
  "s=s.replace('.filter((c) => c.paneId === pane.id)','.filter((c) => Number(c.d.slice(1).split(\\',\\')[0]) > -30 === (pane.id === \\'main\\'))')" \
  test/views.test.ts

say '12. A-42 (c) — the withdrawn "readable minimum" note comes back'
fault 'legend prints the min-span claim again' \
  'apps/web/src/views/WorldMap.tsx' \
  "s=s.replace('          <span className=\\\"legend__key legend__key--provisional\\\">On a trip you are on now</span>','          <span className=\\\"legend__key legend__key--provisional\\\">On a trip you are on now</span>\n          {frame.bounds.clamped && <span className=\\\"legend__note\\\">Zoomed out to a readable minimum</span>}')" \
  test/views.test.ts

say '13. the export surface — clusterPoints is not exported'
fault 'index.ts drops clusterPoints' \
  'packages/core/src/index.ts' \
  "s=s.replace('export { clusterPoints, clusterStops','export { clusterStops')" \
  packages/core/test/surface.test.ts

if [ -n "$MISMATCH" ]; then
  printf '\nMISMATCHES — these criteria are NOT load-bearing:%b\n\n' "$MISMATCH"
  exit 1
fi
printf '\nALL FAULTS RED%s\n\n' "$([ "$RETIRED" -gt 0 ] && printf ' · %d RETIRED by A-51 (I-8i) — see qa/i8i-faults.sh' "$RETIRED")"
