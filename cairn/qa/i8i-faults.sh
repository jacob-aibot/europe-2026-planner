#!/usr/bin/env bash
# I-8i — every criterion's INJECTED FAULT, measured rather than asserted.
#
#   Run: bash qa/i8i-faults.sh            (from cairn/; bare Node, no browser, no server)
#
# ARCHITECTURE §4.4 **A-51** (one pane per geographic cluster), **A-52** (a ring the index
# carries is a ring the frame draws) and **A-53** (home panes / extent panes, I18). ROADMAP
# I-8i's ship gate is *"every criterion above has its injected fault red"*: a test that cannot go
# red is not a test, so each mutation below is applied to a throwaway copy of the tree, the
# relevant suite is run, and the colour is compared to what the ruling says it should be. A
# MISMATCH line means a criterion is NOT load-bearing.
#
# What the previous matrices now cover, and what moved:
#   `qa/i8d-faults.sh`  — 2 faults RETIRED (C5's dominance test, C7's union pane); 2 re-pointed.
#   `qa/i8g-faults.sh`  — 2 re-pointed onto the part key and onto G2's canonical-part-list build.
#   `qa/i8h-faults.sh`  — 4 RETIRED (C8'/C8''/`role`); the rest unchanged and still red.
# Each retired fault names the clause that withdrew it and keeps its mutation text, so the record
# of what the old rule guaranteed is not lost. **This file is their successor**, and every fault
# below targets a clause that exists today.
#
# The browser-side criterion — A-51 G7's grid cell, no letterboxing in either direction at two
# viewports (QA R38-3) — needs `npm run web:build` and a server, so it lives in
# `qa/i8i-render.mjs`; fault 9 below is its source-level floor.
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

# ---------------------------------------------------------------------------
say '1. A-51 supersedes C5 — the dominance/split test comes back (R38-2, the headline)'
# Restore C5 wholesale: one pane unless one cluster carries a strict majority of the record.
# `FR`+`US` returns to a single 134.2°-wide pane with France at 899 px².
fault 'C5 restored: no split unless 2 x weight(primary) > W' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('  const components = core.clusterPoints(atoms.map((a) => a.part.key), WORLD_CLUSTER_THRESHOLD_KM);','  let components = core.clusterPoints(atoms.map((a) => a.part.key), WORLD_CLUSTER_THRESHOLD_KM);\n  {\n    const wOf = (m: number[]) => new Set(m.map((i) => atoms[i].owner)).size;\n    const total = drawn.length;\n    const top = components.slice().sort((a, b) => wOf(b) - wOf(a))[0];\n    if (!(components.length >= 2 && 2 * wOf(top ?? []) > total)) components = [atoms.map((_, i) => i)];\n  }')" \
  packages/client/test/world-map.test.ts

say '2. A-51 G3 — every component is folded into ONE pane (the no-split branch, C7 at its worst)'
fault 'one pane holding every component' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('  const components = core.clusterPoints(atoms.map((a) => a.part.key), WORLD_CLUSTER_THRESHOLD_KM);','  const components = atoms.length ? [atoms.map((_, i) => i)] : [];')" \
  packages/client/test/world-map.test.ts

say '3. A-51 L4 / I11 — the zero-weight components are dropped (C8\x27\x27 without its pane)'
fault 'extent components are discarded rather than drawn' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('  built.sort((a, b) =>','  for (let i = built.length - 1; i >= 0; i--) if (built[i].home.length === 0) built.splice(i, 1);\n  built.sort((a, b) =>')" \
  packages/client/test/world-map.test.ts

say '4. A-53 I18 — panes are ordered by canonical position instead of by G5 (FR opens on Guiana)'
# The fault the architect names: without G5's weight-first key an `FR`-only library opens on
# French Guiana's 2.87 x 3.70 rectangle, because the RAW component order puts Guiana at index 0.
fault 'order by canonical position, not by weight' \
  'packages/client/src/selectors/worldMap.ts' \
  "import re; s=re.sub(r'  built\\.sort\\(\\(a, b\\) => \\{.*?\\n  \\}\\);', '  built.sort((a, b) => a.members[0] - b.members[0]);', s, count=1, flags=re.S)" \
  packages/client/test/world-map.test.ts

say '5. A-51 I5 / A-53 — `weight` counts every code in the pane, not just the home ones'
# The pre-A-51 definition. It breaks additivity (a code drawn in two panes is counted twice) and
# it gives an extent pane a non-zero weight, which is the claim A-53 says a cell may never make.
fault 'weight = sum over `codes`, not over `home`' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('      weight: home.reduce((n, k) => n + drawn[k].tripIds.length, 0),','      weight: owners.reduce((n, k) => n + drawn[k].tripIds.length, 0),')" \
  packages/client/test/world-map.test.ts

say '6. A-53 Part 5 — a pane is EXTENT whenever it holds any non-principal part (FR DE IT JP PE)'
# The architect's own named fault. French Guiana is 2,700 km from Peru and joins Peru's
# component, so that pane's `home` is `["PE"]`; a rule keyed on "holds a non-principal part"
# calls it an extent pane, drops its weight to 0, and moves it behind every home pane.
fault 'home = only the codes whose parts are ALL principal here' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    const home = owners.filter((k) => members.some((i) => atoms[i].owner === k && atoms[i].part.principal));','    const home = members.some((i) => !atoms[i].part.principal) ? [] : owners.slice();')" \
  packages/client/test/world-map.test.ts

say '7. A-52 / R38-5 — the `ring.length >= 6` filter comes back (a two-point ring is dropped)'
# **RE-POINTED at I-8j.** The gather this mutated moved into `drawableRingsOf`, §4.4 A-54 Part 2's
# one private per-code gather shared by `countryParts` and `countryKeyPoint`. The fault is the
# same one and it still names A-52's clause: a ring the index carries is a ring the frame draws,
# and A-54's D adds no minimum vertex count.
fault 'countryParts skips a ring of fewer than three points' \
  'packages/core/src/derive/country.ts' \
  "s=s.replace('      if (!drawableRing(ring)) return null;\n      rings.push(ring);','      if (!drawableRing(ring)) return null;\n      if (ring.length >= 6) rings.push(ring);')" \
  packages/core/test/countryParts.test.ts packages/client/test/world-map.test.ts

say '8. A-51 G8 / A-53 — the extent pane is captioned as an ordinary pane'
fault 'the "Distant parts of" label is dropped' \
  'apps/web/src/views/WorldMap.tsx' \
  "s=s.replace('<span className=\"worldmap__panecap-label\">Distant parts of</span>','<span className=\"worldmap__panecap-label\">Shown separately</span>')" \
  test/views.test.ts

say '9. A-51 G7 — WITHDRAWN by A-54 G7\x27, and the mutation is kept as the record of what G7 guaranteed'
# **This fault is RETIRED.** A-51 G7 made the container a grid to stop a stretching flex row
# letterboxing every cell (R38-3), and §4.4 **A-54** Part 1 supersedes it IN FULL: a grid row is
# as tall as its tallest cell and a grid's last row has as many cells as it has items, so up to
# 66.7% of the card painted in the separator ink, and at 320 px every cell overflowed its
# container by 12 px. The successor mutation — restore the grid, which must now go RED — is
# `qa/i8j-faults.sh` fault 1, and the container criterion that catches it is `qa/i8j-render.mjs`
# section A. The mutation text is kept here so the record of what G7 guaranteed is not lost:
#
#   s.replace('  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(var(--pane-min, 300px), 1fr));\n  align-items: start;',
#             '  display: flex;\n  flex-wrap: wrap;')
#
# G7's other half — ONE uniform `--pane-cap`, no role-keyed pair — survives A-54 verbatim and is
# fault 10 below, which is unchanged and still red.
echo '  RETIRED (A-54 G7\x27)   display: grid -> display: flex on .worldmap__panes   -> superseded; see qa/i8j-faults.sh fault 1'

say '10. A-51 G7 — the two role-keyed height caps come back'
fault 'the uniform --pane-cap is replaced by the main/inset pair' \
  'apps/web/src/styles.css' \
  "s=s.replace('  --pane-cap: min(38vh, 300px);','  --pane-cap: min(58vh, 460px);')" \
  test/views.test.ts

say '11. A-51 G4 — `role` comes back on the pane, and the view reads it'
fault 'the pane carries a role again' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    return { id: \`p\${i}\`, viewBox, bounds, codes: group.codes, home: group.home, weight: group.weight, aspect };','    return { id: i === 0 ? \'main\' : \`inset-\${i}\`, viewBox, bounds, codes: group.codes, home: group.home, weight: group.weight, aspect };')" \
  packages/client/test/world-map.test.ts

say '12. A-51 Part 6 — the frame takes a SECOND geometric input again (countryKeyPoint at the call site)'
# A-49's own defect, one round on: two answers to "where is this country". The `missing` test
# stops agreeing with `countryParts`, which is exactly what A-52 fixed.
fault 'missing is decided by countryKeyPoint as well as countryParts' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    if (parts.length === 0) {','    if (parts.length === 0 || core.countryKeyPoint(row.code, index) === null) {')" \
  packages/client/test/world-map.test.ts

say '13. A-51 I16 — the partition is over COUNTRY key points again, not over parts (C3\x27)'
fault 'cluster the principal parts only, then attach the rest to their code\x27s pane' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('  const components = core.clusterPoints(atoms.map((a) => a.part.key), WORLD_CLUSTER_THRESHOLD_KM);','  const principalAt = atoms.map((a, i) => (a.part.principal ? i : -1)).filter((i) => i >= 0);\n  const components = core.clusterPoints(principalAt.map((i) => atoms[i].part.key), WORLD_CLUSTER_THRESHOLD_KM)\n    .map((g) => {\n      const owners = new Set(g.map((j) => atoms[principalAt[j]].owner));\n      return atoms.map((_, i) => i).filter((i) => owners.has(atoms[i].owner));\n    });')" \
  packages/client/test/world-map.test.ts

say '14. A-51 G2 — the canonical part list is built in paint order, so pane.codes stops being canonical'
# **RE-POINTED at I-8j, and the reason is a real loss of coverage worth writing down.** The
# mutation used to be *"push the atoms in descending index position"*:
#
#   s.replace('  for (let k = 0; k < drawn.length; k++) for (const part of drawn[k].parts) atoms.push({ owner: k, part });',
#             '  for (let k = drawn.length - 1; k >= 0; k--) for (const part of drawn[k].parts) atoms.push({ owner: k, part });')
#
# That never tested its own label — `owners` is sorted numerically, so `pane.codes` stayed
# canonical either way — and what it actually turned red was A-51 G5's THIRD key, `members[0]`,
# which reads the canonical part list. §4.4 **A-54** G5′ replaces that key with the pane's own
# `bounds`, so the old mutation is now unobservable: two parts of one code are >= the threshold
# apart by definition and therefore never share a pane, so no `d`, no `codes` and no order moves.
# The mutation is re-pointed onto the clause the label names — the `owners` sort, which is what
# makes `pane.codes` canonical row order (I2) — and IS red.
fault 'pane.codes is built in descending owner order' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('    const owners = [...new Set(members.map((i) => atoms[i].owner))].sort((a, b) => a - b);','    const owners = [...new Set(members.map((i) => atoms[i].owner))].sort((a, b) => b - a);')" \
  packages/client/test/world-map.test.ts

say '15. the export surface — countryKeyPoint is dropped now that it has no production caller'
# A-51 Part 6 is explicit that it STAYS on the surface as I12's oracle, even though the frame no
# longer calls it. This is the fault that catches "nothing uses it, so delete it".
fault 'index.ts drops countryKeyPoint' \
  'packages/core/src/index.ts' \
  "s=s.replace('export { countryOf, countryKeyPoint, countryParts }','export { countryOf, countryParts }')" \
  packages/core/test/surface.test.ts packages/core/test/countryParts.test.ts

say '16. the kernel — clusterPoints is called per pane again (A-51 calls it exactly ONCE)'
# **RE-POINTED at I-8j.** The `mapBounds` call this mutated moved up into the `built` map, because
# A-54 G5\x27's third and fourth keys are read off the pane's own `bounds` and the comparator runs
# before the pane array is assembled. It is still ONE call per component and still one
# `clusterPoints` call for the whole frame.
fault 'a second clusterPoints call inside the pane loop' \
  'packages/client/src/selectors/worldMap.ts' \
  "s=s.replace('      bounds: core.mapBounds(cornersOf(members)),','      bounds: core.mapBounds(cornersOf(core.clusterPoints(members.map((m) => atoms[m].part.key), WORLD_CLUSTER_THRESHOLD_KM)[0].map((j) => members[j]))),')" \
  packages/client/test/world-map.test.ts

if [ -n "$MISMATCH" ]; then
  printf '\nMISMATCHES — these criteria are NOT load-bearing:%b\n\n' "$MISMATCH"
  exit 1
fi
printf '\nALL FAULTS RED\n\n'
