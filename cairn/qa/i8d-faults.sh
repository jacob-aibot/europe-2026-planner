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
fault '2*w(primary) > W  ->  ranked.length >= 2' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('const split = ranked.length >= 2 && 2 * weightOf(ranked[0]) > totalWeight;','const split = ranked.length >= 2;')" \
  packages/client/test/world-map.test.ts

say '5. C7 fold-in — drop clusters 3..N and a code becomes unrepresented'
fault 'panes[2] = ranked[2] only, not the union' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('paneGroups = [ranked[0], ranked[1], ranked.slice(2).flat().sort((a, b) => a - b)];','paneGroups = [ranked[0], ranked[1], ranked[2]];')" \
  packages/client/test/world-map.test.ts

say '6. C2 — key off the first entry box instead of the union of a code\x27s boxes'
fault 'key = entries[0] box centre' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('key: { lat: (south + north) / 2, lng: (west + east) / 2 },','key: { lat: (entries[0].box[1] + entries[0].box[3]) / 2, lng: (entries[0].box[0] + entries[0].box[2]) / 2 },')" \
  packages/client/test/world-map.test.ts

say '7. C6 — drop the lowest-ISO tie-break and ranking stops being total'
fault 'tie-break returns 0' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    const la = lowestCode(a), lb = lowestCode(b);\n    return la < lb ? -1 : la > lb ? 1 : 0;','    return 0;')" \
  packages/client/test/world-map.test.ts

say '8. C3 — clusterPoints becomes nearest-fit instead of first-fit'
fault 'nearest group wins' \
  'packages/core/src/derive/cluster.ts' \
  "s=s.replace('const g = groups.find((gr) => gr.some((j) => haversine(points[j], points[i]) < thresholdKm));','const cands = groups.filter((gr) => gr.some((j) => haversine(points[j], points[i]) < thresholdKm));\n    const g = cands.slice().sort((x, y) => Math.min(...x.map((j) => haversine(points[j], points[i]))) - Math.min(...y.map((j) => haversine(points[j], points[i]))))[0];')" \
  packages/core/test/clusterPoints.test.ts

say '9. C3 — the threshold comparison widens from < to <='
fault 'haversine <= thresholdKm' \
  'packages/core/src/derive/cluster.ts' \
  "s=s.replace('haversine(points[j], points[i]) < thresholdKm','haversine(points[j], points[i]) <= thresholdKm')" \
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
printf '\nALL FAULTS RED\n\n'
