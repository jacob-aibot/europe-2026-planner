#!/usr/bin/env bash
# I-8h — every criterion's INJECTED FAULT, measured rather than asserted.
#
#   Run: bash qa/i8h-faults.sh            (from cairn/; bare Node, no browser, no server)
#
# ROADMAP I-8h's ship gate is *"every criterion above has its injected fault red"*. A test that
# cannot go red is not a test, so each mutation below is applied to a throwaway copy of the tree,
# the relevant suite is run, and the colour is compared to what the ROADMAP says it should be. A
# MISMATCH line means a criterion is not load-bearing.
#
# The browser-side criterion — A-50's symmetric no-letterboxing over 239 libraries at two
# viewports — needs `npm run web:build` and a server, so its fault (restore `width: 100%` with
# the static `max-height`) is injected against `qa/i8h-render.mjs` by hand and recorded in
# BUILD-NOTES rather than run here. Fault 12 below is its source-level floor.
#
# ONE OF A-49's OWN NAMED FAULTS CANNOT BE RED, and that is disclosed rather than faked:
# *"rank parts by summed area instead of by their greatest ring and `US` mismatches"* chooses the
# same part on every one of the 239 codes at every one of I12's five thresholds — see **KD-71**.
# Fault 3 below is the substitute that IS red, and `countryParts.test.ts` asserts the vacuity of
# the original so a future index regeneration makes it visible.
#
# `qa/i8g-faults.sh` and `qa/i8d-faults.sh` are the previous increments' matrices and both still
# run; four of I-8g's fourteen mutations were re-pointed at the lines A-49 replaced ([I-8h] there).
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

say '1. C8 (superseded) comes back — the extent is the union of every entry box again'
fault 'mapBounds over every entry box, per A-48 C8' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    const bounds = core.mapBounds(cornersOf(inFrame));','    const bounds = core.mapBounds(cornersOf(group.flatMap((k) => drawn[k].parts.map((part) => ({ owner: k, part })))));')" \
  packages/client/test/world-map.test.ts

say '2. C8\x27 — the in-frame set is seeded with EVERY part, so nothing ever detaches'
fault 'every component is in frame' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('      if (component.some((i) => flat[i].part.principal)) {','      if (true) {')" \
  packages/client/test/world-map.test.ts

say '3. A-49 P — a part keys off its own BOX rather than its greatest ring (the C2 error, one level down)'
fault 'part.key = the part box centre' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('      key: points[key],','      key: { lat: (s + n) / 2, lng: (w + e) / 2 },')" \
  packages/core/test/countryParts.test.ts packages/client/test/world-map.test.ts

say '4. C8\x27\x27 — the detached parts are DROPPED instead of drawn (I11 goes red for FR)'
fault 'detached parts are discarded' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('  if (detachedParts.length > 0) {','  if (false) {')" \
  packages/client/test/world-map.test.ts

say '5. C8\x27 — detachment is decided PER COUNTRY instead of per pane (CA MX US grows a pane it must not have)'
fault 'per-country detachment' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    for (const k of group) for (const part of drawn[k].parts) flat.push({ owner: k, part });','    for (const k of group) for (const part of drawn[k].parts) flat.push({ owner: k, part });\n    if (group.length > 1) {\n      const out = [];\n      for (const a of flat) { if (a.part.principal) out.push(a); else detachedParts.push(a); }\n      return out;\n    }')" \
  packages/client/test/world-map.test.ts

say '6. A-49 P — the parts are not clustered at all: every ring is its own part'
fault 'countryParts ignores the threshold' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('  return clusterPoints(points, thresholdKm).map((group) => {','  return clusterPoints(points, 0).map((group) => {')" \
  packages/core/test/countryParts.test.ts packages/client/test/world-map.test.ts

say '7. A-49 P — a code with no ring of three points is drawn anyway rather than stated as missing'
fault 'countryParts fabricates a part from the union box' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('  if (rings.length === 0) return [];','  if (rings.length === 0) return [{ box: [0, 0, 1, 1], key: { lat: 0, lng: 0 }, rings: [], principal: true }];')" \
  packages/core/test/countryParts.test.ts

say '8. A-49 Part 5 / I13 — `frame.codes` is derived from the PAINT list (so it duplicates and reorders)'
fault 'codes = the paint list\x27s codes' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    codes: drawn.map((x) => x.code),','    codes: countries.map((c) => c.code),')" \
  packages/client/test/world-map.test.ts

say '9. A-49 Part 5 / R37-3 — the chip list renders the paint list again'
fault 'the view renders frame.countries' \
  'apps/web/src/views/WorldMap.tsx' \
  "s=s.replace('{frame.codes.map((code) => {','{frame.countries.map((c) => { const code = c.code;')" \
  test/views.test.ts

say '10. A-49 I5 — the detached pane is an ordinary inset, and is not last'
fault 'the detached pane is unshifted and typed as an inset' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace(\"      id: 'detached',\n      role: 'detached',\",\"      id: 'inset-9',\n      role: 'inset',\")" \
  packages/client/test/world-map.test.ts

say '11. R37-5 — the union-box fallback returns NaN again'
fault 'the finite guard is removed' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('    if (!Number.isFinite(west) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(north)) {\n      return null;\n    }','    if (false) {\n      return null;\n    }')" \
  packages/core/test/countryParts.test.ts

say '12. A-50 — the pane box is full-width with a static clamp again (the wide direction only)'
fault 'width: 100% + static max-height' \
  'apps/web/src/styles.css' \
  "s=s.replace('  width: min(100%, calc(var(--pane-cap) * var(--pane-aspect, 2)));','  width: 100%;').replace('  max-height: var(--pane-cap);','  max-height: min(58vh, 460px);')" \
  test/views.test.ts

say '13. A-49 C8\x27\x27 — the detached pane is captioned "Shown separately"'
fault 'the detached caption is the outlier caption' \
  'apps/web/src/views/WorldMap.tsx' \
  "s=s.replace('<span className=\"worldmap__panecap-label\">Distant parts of</span>','<span className=\"worldmap__panecap-label\">Shown separately</span>')" \
  test/views.test.ts

say '14. the export surface — countryParts is not exported'
fault 'index.ts drops countryParts' \
  'packages/core/src/index.ts' \
  "s=s.replace('export { countryOf, countryKeyPoint, countryParts }','export { countryOf, countryKeyPoint }')" \
  packages/core/test/surface.test.ts

say '15. A-49 I12 — the principal part is chosen by ring COUNT rather than by greatest area'
fault 'principal = the part with the most rings' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('      principal: group.includes(principalRing),','      principal: group.length === Math.max(...clusterPoints(points, thresholdKm).map((g) => g.length)),')" \
  packages/core/test/countryParts.test.ts packages/client/test/world-map.test.ts

if [ -n "$MISMATCH" ]; then
  printf '\nMISMATCHES — these criteria are NOT load-bearing:%b\n\n' "$MISMATCH"
  exit 1
fi
printf '\nALL FAULTS RED\n\n'
