#!/usr/bin/env bash
# I-8a — every criterion's INJECTED FAULT, measured rather than asserted.
#
#   Run: bash qa/i8a-faults.sh            (from cairn/; needs PLAYWRIGHT_BROWSERS_PATH set
#                                          for the browser half, and nothing else)
#
# ROADMAP I-8a's ship gate is *"every criterion above has its injected fault red"*. A test
# that cannot go red is not a test, so each mutation below is applied in a throwaway git
# worktree, the relevant suite or probe is run, and the colour is compared to what the
# ROADMAP says it should be. A MISMATCH line means a criterion is not load-bearing.
#
# The browser half builds and serves the mutated tree on its own port, so it never touches
# the working copy and never collides with a server you already have running.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
PORT="${I8A_FAULT_PORT:-4184}"
MISMATCH=""
UNRUN=0

say() { printf '\n== %s ==\n' "$1"; }

# ---------------------------------------------------------------------------
# A throwaway copy of `cairn/`: the source tree copied for real, `node_modules`
# HARD-LINKED so the copy is instant. Every mutation below REWRITES its file, so
# a hard link is never followed back into the working tree.
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

apply_mutation() { python3 -c "$2" "$1"; }

# ---------------------------------------------------------------- node faults
run_node_fault() {
  local label="$1" script="$2" expect="$3" scope="$4"
  local wt; wt="$(make_copy)"
  say "$label"
  if ! apply_mutation "$wt" "$script"; then
    echo "  *** UNRUN - the anchor no longer applies. This is NOT a pass. ***"
    UNRUN=$((UNRUN + 1)); rm -rf "$(dirname "$wt")"; return
  fi
  local out got
  out="$( cd "$wt" && node --test --test-reporter=tap $scope 2>&1 | grep -E '^(not ok|# (pass|fail))' )"
  echo "$out" | sed 's/^/  /'
  if [ -z "$out" ]; then
    echo "  *** UNRUN - the suite produced no result ***"; UNRUN=$((UNRUN + 1)); rm -rf "$(dirname "$wt")"; return
  fi
  if echo "$out" | grep -qE '^# fail 0$'; then got=GREEN; else got=RED; fi
  echo "  measured: $got   expected: $expect"
  [ "$got" != "$expect" ] && MISMATCH="$MISMATCH [$label: $got]"
  rm -rf "$(dirname "$wt")"
}

# ------------------------------------------------------------- browser faults
run_browser_fault() {
  local label="$1" script="$2" expect="$3" section="$4"
  local wt; wt="$(make_copy)"
  say "$label"
  if ! apply_mutation "$wt" "$script"; then
    echo "  *** UNRUN - the anchor no longer applies. This is NOT a pass. ***"
    UNRUN=$((UNRUN + 1)); rm -rf "$(dirname "$wt")"; return
  fi
  # `vite build` directly rather than `npm run web:build`: the latter regenerates the sample,
  # and the generated sample was copied with the tree.
  if ! ( cd "$wt/apps/web" && ../../node_modules/.bin/vite build >/dev/null 2>&1 ); then
    echo "  *** UNRUN - the mutated tree does not build ***"; UNRUN=$((UNRUN + 1)); rm -rf "$(dirname "$wt")"; return
  fi
  # A stale server from an interrupted run would serve a DELETED tree and answer 404 to
  # everything, which reads as "the probe found nothing" rather than as the harness failure
  # it is. So: refuse to start on an occupied port. (This happened, and it is why the check
  # exists rather than a comment saying it might.)
  if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/"; then
    echo "  *** UNRUN - port $PORT is already in use ***"; UNRUN=$((UNRUN + 1)); rm -rf "$(dirname "$wt")"; return
  fi
  ( PORT="$PORT" node "$wt/tools/serve.mjs" >/dev/null 2>&1 & echo $! > "$wt/serve.pid" )
  sleep 1.5
  if ! curl -s -o /dev/null --max-time 2 "http://localhost:$PORT/"; then
    echo "  *** UNRUN - the mutated tree is not being served ***"
    kill "$(cat "$wt/serve.pid")" 2>/dev/null
    UNRUN=$((UNRUN + 1)); rm -rf "$(dirname "$wt")"; return
  fi
  local out got
  out="$( cd "$wt" && CAIRN_URL="http://localhost:$PORT/" node qa/i8a-signals.mjs 2>&1 \
          | awk -v s="== §$section " 'index($0,s)==1{f=1;next} index($0,"== ")==1{f=0} f' \
          | grep -E '^  (ok|FAIL)' )"
  kill "$(cat "$wt/serve.pid")" 2>/dev/null
  pkill -f "$wt/tools/serve.mjs" 2>/dev/null
  sleep 0.3
  echo "$out" | sed 's/^/  /'
  if [ -z "$out" ]; then
    echo "  *** UNRUN - the probe produced no result for section $section ***"
    UNRUN=$((UNRUN + 1)); rm -rf "$(dirname "$wt")"; return
  fi
  if echo "$out" | grep -q 'FAIL'; then got=RED; else got=GREEN; fi
  echo "  measured: $got   expected: $expect"
  [ "$got" != "$expect" ] && MISMATCH="$MISMATCH [$label: $got]"
  rm -rf "$(dirname "$wt")"
}

SEL='packages/client/test/world-map.test.ts'
VIEWS='test/views.test.ts'

# ---------------------------------------------------------------------------
# A-40 clause 2 — "build the extent from the country box directly instead of
# through mapBounds and it goes red".
F_BOUNDS='
import sys
p = sys.argv[1] + "/packages/client/src/selectors/worldMap.ts"
s = open(p).read()
a = "  const bounds = core.mapBounds(corners);"
assert a in s, "shape moved (mapBounds call)"
b = """  const lats = corners.map((c) => c.lat);
  const lngs = corners.map((c) => c.lng);
  const bounds = corners.length === 0
    ? core.mapBounds([])
    : {
        centre: { lat: 0, lng: 0 }, spanKm: 0,
        north: Math.max(...lats), south: Math.min(...lats),
        east: Math.max(...lngs), west: Math.min(...lngs),
        clamped: false, empty: false,
      };"""
open(p, "w").write(s.replace(a, b, 1))
'
run_node_fault "clause 2 — the extent built from the raw box, not through mapBounds (expect RED)" \
  "$F_BOUNDS" RED "$SEL"

# A-40 clause 3 — "drop it silently and the count disagrees with the row".
F_MISSING='
import sys
p = sys.argv[1] + "/packages/client/src/selectors/worldMap.ts"
s = open(p).read()
a = "      missing.push(row.code);"
assert a in s, "shape moved (missing.push)"
open(p, "w").write(s.replace(a, "      // dropped", 1))
'
run_node_fault "clause 3 — a code the index cannot fill is dropped silently (expect RED)" \
  "$F_MISSING" RED "$SEL"

# A-34 — "render provisional rows identically to confirmed ones".
F_PROV='
import sys
p = sys.argv[1] + "/packages/client/src/selectors/worldMap.ts"
s = open(p).read()
a = "provisional: row.provisional,"
assert a in s, "shape moved (provisional carry)"
open(p, "w").write(s.replace(a, "provisional: false,", 1))
'
run_node_fault "A-34 — the provisional flag dropped between core and the frame (expect RED)" \
  "$F_PROV" RED "$SEL"

# A-40 clause 1 — the projection.
F_PROJ='
import sys
p = sys.argv[1] + "/packages/client/src/selectors/worldMap.ts"
s = open(p).read()
a = "    const y = ring[i + 1] === 0 ? 0 : -ring[i + 1];"
assert a in s, "shape moved (projection)"
open(p, "w").write(s.replace(a, "    const y = ring[i + 1];", 1))
'
run_node_fault "clause 1 — the latitude is not negated, so the map is upside down (expect RED)" \
  "$F_PROJ" RED "$SEL"

# W1 — "compute the viewBox from a measured client rect in the component".
F_W1='
import sys
p = sys.argv[1] + "/apps/web/src/views/WorldMap.tsx"
s = open(p).read()
a = "          viewBox={frame.viewBox}"
assert a in s, "shape moved (viewBox prop)"
b = "          viewBox={`0 0 ${document.body.getBoundingClientRect().width} 400`}"
open(p, "w").write(s.replace(a, b, 1))
'
run_node_fault "W1 — the viewBox computed from a measured client rect (expect RED)" \
  "$F_W1" RED "$VIEWS"

# The signal-collision fix, source level.
F_OPACITY='
import sys
p = sys.argv[1] + "/apps/web/src/styles.css"
s = open(p).read()
a = ".stop--unaccepted {\n  border-style: dashed;"
assert a in s, "shape moved (.stop--unaccepted)"
open(p, "w").write(s.replace(a, ".stop--unaccepted {\n  opacity: .72;\n  border-style: dashed;", 1))
'
run_node_fault "the fix — the shared opacity restored on the provenance class (expect RED)" \
  "$F_OPACITY" RED "$VIEWS"

F_BLUR='
import sys
p = sys.argv[1] + "/apps/web/src/styles.css"
s = open(p).read()
a = "  background: var(--paper);\n  border-bottom: var(--rule);\n}"
assert a in s, "shape moved (.topbar)"
open(p, "w").write(s.replace(a, "  background: var(--paper);\n  backdrop-filter: blur(8px);\n  border-bottom: var(--rule);\n}", 1))
'
run_node_fault "removal 1 — backdrop-filter restored on the topbar (expect RED)" \
  "$F_BLUR" RED "$VIEWS"

# ---------------------------------------------------------------------------
# The browser half. Each rebuilds and reserves the mutated tree.

run_browser_fault "the fix, RENDERED — the shared opacity restored (expect RED on §6)" \
  "$F_OPACITY" RED 6

F_SAME_INK='
import sys
p = sys.argv[1] + "/apps/web/src/styles.css"
s = open(p).read()
a = """.worldmap__country--provisional {
  fill: var(--map-provisional-fill);
  stroke: var(--map-provisional-line);
  stroke-width: 1.4;
  stroke-dasharray: 3.5 2.5;
}"""
assert a in s, "shape moved (provisional fill)"
b = """.worldmap__country--provisional {
  fill: var(--map-fill);
  stroke: var(--map-line);
  stroke-width: .75;
}"""
open(p, "w").write(s.replace(a, b, 1))
'
run_browser_fault "A-34, RENDERED — a provisional country painted in the confirmed ink (expect RED on §3)" \
  "$F_SAME_INK" RED 3

run_browser_fault "W1, RENDERED — the viewBox measured at 0x0 while the tab was hidden (expect RED on §1)" \
  "$F_W1" RED 1

say "summary"
if [ -n "$MISMATCH" ]; then echo "  MEASURED != EXPECTED:$MISMATCH"; else echo "  every injected fault fired"; fi
[ "$UNRUN" -gt 0 ] && echo "  $UNRUN mutation(s) UNRUN — anchors drifted"
[ "$UNRUN" -gt 0 ] && exit 1
[ -n "$MISMATCH" ] && exit 1
exit 0
