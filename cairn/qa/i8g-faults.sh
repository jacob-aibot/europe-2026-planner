#!/usr/bin/env bash
# I-8g — every criterion's INJECTED FAULT, measured rather than asserted.
#
#   Run: bash qa/i8g-faults.sh            (from cairn/; bare Node, no browser, no server)
#
# ROADMAP I-8g's ship gate is *"every criterion above has its injected fault red"*. A test that
# cannot go red is not a test, so each mutation below is applied to a throwaway copy of the tree,
# the relevant suite is run, and the colour is compared to what the ROADMAP says it should be. A
# MISMATCH line means a criterion is not load-bearing.
#
# The two browser-side criteria — the main pane filling ≥75% of its box (R36-5) and dark mode
# clearing 3:1 (R36-6) — need `npm run web:build` and a server, so their faults are injected by
# hand against `qa/r36-render.mjs` §A/§C and recorded in BUILD-NOTES rather than run here.
#
# `qa/i8d-faults.sh` is the previous increment's matrix and still runs; three of its thirteen
# mutations were re-pointed at the lines A-48 replaced (marked [I-8g] there).
#
# [I-8h] Four of the fourteen mutations below target lines §4.4 A-49 rewrote (the union-box
# fallback's finite guard, the paint sort's move onto (code, pane) rows, and the export line).
# Each is re-pointed at the line that replaced it and marked [I-8h] in the mutation itself; the
# fault each one injects is unchanged, and all fourteen are still RED. `qa/i8h-faults.sh` is
# I-8h's own matrix.
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

say '1. C2 (superseded) comes back in core — the key is the union of the code\x27s boxes'
fault 'countryKeyPoint returns the union-box centre' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('  if (!seen) return null;\n  if (principal === null) {','  if (!seen) return null;\n  if (true) {  // [I-8h] re-pointed: the fallback is a block since R37-5\x27s finite guard landed')" \
  packages/core/test/countryKeyPoint.test.ts

say '2. C2\x27 — the principal ring is the SMALLEST rather than the greatest'
fault 'area < principalArea' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('if (area > principalArea) { principalArea = area; principal = ring; }','if (principalArea < 0 || area < principalArea) { principalArea = area; principal = ring; }')" \
  packages/core/test/countryKeyPoint.test.ts

say '3. C2\x27 — the area is PLANAR (degrees squared), not spherical'
fault 'ringAreaKm2 drops the sin terms' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('sum += (ring[j] - ring[i]) * DEG * (2 + Math.sin(ring[i + 1] * DEG) + Math.sin(ring[j + 1] * DEG));','sum += (ring[j] - ring[i]) * (ring[i + 1] + ring[j + 1]);')" \
  packages/core/test/countryKeyPoint.test.ts

say '4. C2\x27 — ties break by the LAST occurrence rather than by index order'
fault 'area >= principalArea' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('if (area > principalArea) { principalArea = area; principal = ring; }','if (area >= principalArea) { principalArea = area; principal = ring; }')" \
  packages/core/test/countryKeyPoint.test.ts

say '5. C3\x27 (superseded) comes back — clusterPoints is first-fit again'
fault 'clusterPoints = the A-41 C3 loop' \
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
  packages/core/test/clusterPoints.test.ts packages/client/test/world-map.test.ts

say '6. C3\x27 — the threshold comparison widens from < to <='
fault 'haversine <= thresholdKm' \
  'packages/core/src/derive/cluster.ts' \
  "s=s.replace('haversine(points[i], points[j]) < thresholdKm','haversine(points[i], points[j]) <= thresholdKm')" \
  packages/core/test/clusterPoints.test.ts

say '7. the frame keys off the first entry\x27s box instead of core\x27s countryKeyPoint'
fault 'key = entries[0] box centre' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('const key = core.countryKeyPoint(row.code, index);','const e0 = index.countries.find((c) => c.code === row.code);\n    const key = e0 ? { lat: (e0.box[1] + e0.box[3]) / 2, lng: (e0.box[0] + e0.box[2]) / 2 } : null;')" \
  packages/client/test/world-map.test.ts

say '8. C9 — countries are emitted in canonical order again (AD paints under FR)'
fault 'no paint sort' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('  rows.sort((a, b) =>\n    (lastEntryAt.get(drawn[b.owner].code) ?? -1) - (lastEntryAt.get(drawn[a.owner].code) ?? -1));','  // [I-8h] re-pointed: the emitted array is now one row per (code, pane) and is BUILT in\n  // canonical order, so removing the comparator restores canonical paint order exactly.\n  rows.sort(() => 0);')" \
  packages/client/test/world-map.test.ts

say '9. C9 — paint order is ASCENDING index position (the small painted first)'
fault 'ascending, not descending' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('(lastEntryAt.get(drawn[b.owner].code) ?? -1) - (lastEntryAt.get(drawn[a.owner].code) ?? -1));','(lastEntryAt.get(drawn[a.owner].code) ?? -1) - (lastEntryAt.get(drawn[b.owner].code) ?? -1));  // [I-8h] re-pointed')" \
  packages/client/test/world-map.test.ts

say '10. C9 implementation note — sort `drawn` before clustering and pane.codes stops being canonical (I2)'
fault 'drawn sorted into paint order before C3\x27' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('  // ---- C3/C4: the partition. Core owns the algorithm; this file owns the threshold. ----','  {\n    const pos = new Map<string, number>();\n    index.countries.forEach((e, i) => pos.set(e.code, i));\n    drawn.sort((a, b) => (pos.get(b.code) ?? -1) - (pos.get(a.code) ?? -1));\n  }\n  // ---- C3/C4: the partition. Core owns the algorithm; this file owns the threshold. ----')" \
  packages/client/test/world-map.test.ts

say '11. Part 6 — the pane\x27s aspect is height / width'
fault 'aspect inverted' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('aspect: Number(width) / Number(height),','aspect: Number(height) / Number(width),')" \
  packages/client/test/world-map.test.ts

say '12. Part 6 — the aspect is a constant the view could have guessed'
fault 'aspect = 1' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('aspect: Number(width) / Number(height),','aspect: 1,')" \
  packages/client/test/world-map.test.ts

say '13. the export surface — countryKeyPoint is not exported'
fault 'index.ts drops countryKeyPoint' \
  'packages/core/src/index.ts' \
  "s=s.replace('export { countryOf, countryKeyPoint, countryParts }','export { countryOf, countryParts }')" \
  packages/core/test/surface.test.ts

say '14. the standing guard — a distance function reaches derive/country.ts'
fault 'countryOf snaps to the nearest key' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('const EARTH_R_KM = 6371;','const EARTH_R_KM = 6371;\nexport function nearestKey(): null { return null; }')" \
  packages/core/test/countryKeyPoint.test.ts

if [ -n "$MISMATCH" ]; then
  printf '\nMISMATCHES — these criteria are NOT load-bearing:%b\n\n' "$MISMATCH"
  exit 1
fi
printf '\nALL FAULTS RED\n\n'
