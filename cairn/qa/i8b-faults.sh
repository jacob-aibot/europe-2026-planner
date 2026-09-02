#!/usr/bin/env bash
# I-8b — every criterion's INJECTED FAULT, measured rather than asserted.
#
#   Run: bash qa/i8b-faults.sh            (from cairn/; bare Node, no browser, no server)
#
# `docs/DESIGN.md` §3, §5 and §6, and ROADMAP I-8b's ship gate: *"every criterion above has its
# injected fault red."* A test that cannot go red is not a test, so each mutation below is applied
# to a throwaway copy of the tree, the suite is run, and the colour is compared to what the ruling
# says it should be. A MISMATCH line means a criterion is NOT load-bearing.
#
# **This file is the SOURCE-LEVEL half and it is deliberately not the whole matrix.** Three of
# I-8b's five criteria are claims about computed style and geometry, and §6's first line is that a
# design decision that was not rendered was not verified. The rendered half lives in
# `qa/i8b-render.mjs` section H, which injects each fault as a stylesheet over the shipped build
# (one page load per fault, no rebuild) and re-runs the assertion it belongs to. **One clause can
# only be shown there:** ROADMAP I-8b's touch-target fault must be red at the three touch contexts
# and **green at the two desktop ones**, which is what proves the probe measures the touch matrix
# rather than the page — no bare-Node grep can distinguish those.
#
#   Needs for the other half: npm run web:build && npm run serve, then
#   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8b-render.mjs
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
MISMATCH=""

say() { printf '\n== %s ==\n' "$1"; }

# A throwaway copy: source copied for real, `node_modules` HARD-LINKED so the copy is instant.
# Same helper as `qa/i8j-faults.sh`; kept local rather than sourced, because a fault matrix that
# depends on another fault matrix still running is one more thing that can quietly stop working.
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
# ROADMAP I-8b's five named criteria, in its own order.
# ---------------------------------------------------------------------------

say '1. TOUCH TARGETS — `.icon`'"'"'s 26 x 26 hit area is restored (§3.4'"'"'s named failure)'
# ROADMAP: *"restore `.icon`'s 26 x 26 hit area and the assertion goes red at the three touch
# contexts and STAYS GREEN at the two desktop ones."* The second half is `qa/i8b-render.mjs`
# section H fault 1; this is its source-level floor.
fault 'the 44 x 44 pseudo-element hit area is sized back to the visual box' \
  'apps/web/src/styles.css' \
  "s=s.replace('  width: var(--tap); height: var(--tap);\n  transform: translate(-50%, -50%);','  width: 26px; height: 26px;\n  transform: translate(-50%, -50%);')" \
  test/views.test.ts

say '2. NO vh/dvh ON A FIXED-HEIGHT SCROLL CONTAINER — `38vh` goes back on `--pane-cap`'
fault '--pane-cap returns to min(38vh, 300px)' \
  'apps/web/src/styles.css' \
  "s=s.replace('--pane-cap: min(38svh, 300px);','--pane-cap: min(38vh, 300px);')" \
  test/views.test.ts

say '2b. ... and the same rule'"'"'s other half: `100dvh` goes back on `.spine`'"'"'s max-height'
fault 'the spine is capped in dvh again (it resizes mid-scroll as Safari retracts)' \
  'apps/web/src/styles.css' \
  "s=s.replace('max-height: calc(100svh - var(--chrome-h));','max-height: calc(100dvh - var(--chrome-h));')" \
  test/views.test.ts

say '3. MOTION BUDGET — the country row expansion becomes a 600 ms bounce'
fault 'the row expansion is 600 ms' \
  'apps/web/src/styles.css' \
  "s=s.replace('--dur-row: 160ms;','--dur-row: 600ms;')" \
  test/views.test.ts

say '3b. ... and the curve half: a bare `ease-in` on the one animation'
fault 'the named curve is replaced by `ease-in`' \
  'apps/web/src/styles.css' \
  "s=s.replace('--ease-out: cubic-bezier(0.23, 1, 0.32, 1);','--ease-out: ease-in;')" \
  test/views.test.ts

say '4. THE PAST IS NOT DECAYED (P3) — `.chip--life-completed` drops to `--ink-faint`'
fault 'completed is the quietest ink on the screen again' \
  'apps/web/src/styles.css' \
  "s=s.replace('  color: var(--ink); border-color: var(--ink-dim);\n}','  color: var(--ink-faint); border-color: var(--ink-dim);\n}')" \
  test/views.test.ts

say '5. WIDE ADDS NO LAYOUT — a third column appears at >= 1600'
fault 'a fifth breakpoint introduces a layout at 1600' \
  'apps/web/src/styles.css' \
  "s=s+'\n@media (min-width: 1600px) { .profile__body { grid-template-columns: minmax(0,1fr) 14rem 14rem; } }\n'" \
  test/views.test.ts

# ---------------------------------------------------------------------------
# The responsive contract itself — §3.1's three measured defects, each as the fault that
# reintroduces it. These are what I-8b's *Built* list calls the five bounded shell items.
# ---------------------------------------------------------------------------

say '6. R1 — the tab bar goes back to the top of a phone, at the hardcoded offset'
# §3.1 defect 2, verbatim: a hardcoded number equal to the topbar's height at its current content.
fault 'position: sticky; top: 2.7rem' \
  'apps/web/src/styles.css' \
  "s=s.replace('  position: fixed; inset: auto 0 0 0; z-index: 480;','  position: sticky; top: 2.7rem; z-index: 480;')" \
  test/views.test.ts

say '7. R1 — the bottom bar stops clearing the home indicator (§3.1 defect 1)'
fault 'the bar loses its safe-area padding' \
  'apps/web/src/styles.css' \
  "s=s.replace('  padding-bottom: env(safe-area-inset-bottom, 0px);\n  padding-left: env(safe-area-inset-left, 0px);','  padding-left: env(safe-area-inset-left, 0px);')" \
  test/views.test.ts

say '8. §3.2 — a `max-width` media query comes back (the desktop-first stylesheet)'
fault 'one max-width rule' \
  'apps/web/src/styles.css' \
  "s=s+'\n@media (max-width: 900px) { .trip { grid-template-columns: 1fr; } }\n'" \
  test/views.test.ts

say '9. §9.2 fence 1 — a media query reaches the atlas frame'
# A per-screen-size CELL rule is one refactor away from a per-screen-size FRAME rule, which
# A-41 Part 7 and W1 forbid outright.
fault 'the pane container is sized per breakpoint' \
  'apps/web/src/styles.css' \
  "s=s+'\n@media (min-width: 900px) { .worldmap__panes { gap: 2px; } }\n'" \
  test/views.test.ts

say '10. §3.4 — the tablist stops being a single tab stop'
fault 'every tab is in the tab order again' \
  'apps/web/src/App.tsx' \
  "s=s.replace('tabIndex={t.id === tab ? 0 : -1}','tabIndex={0}')" \
  test/views.test.ts

say '10b. ... and the arrow keys go away entirely'
fault 'ArrowLeft is no longer handled' \
  'apps/web/src/App.tsx' \
  "s=s.replace(\"else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;\",'')" \
  test/views.test.ts

# ---------------------------------------------------------------------------
# The Profile's own composition — §5.2 and §5.3, and I-8's inherited criteria.
# ---------------------------------------------------------------------------

say '11. §5.3 — the identity line goes back to being three stat tiles'
fault 'the claim is a div of tiles rather than a dl of pairs' \
  'apps/web/src/views/Profile.tsx' \
  "s=s.replace('<dl className=\"claim\"','<div className=\"statrow claim\"')" \
  test/views.test.ts

say '12. P3 — the lifecycle counts stop leading with `completed`'
fault 'planned is listed first' \
  'apps/web/src/views/Profile.tsx' \
  "s=s.replace(\"    { stage: 'completed', label: 'Travelled', n: stats.trips.completed },\n    { stage: 'active', label: 'On now', n: stats.trips.active },\n    { stage: 'planned', label: 'Upcoming', n: stats.trips.planned },\",\"    { stage: 'planned', label: 'Upcoming', n: stats.trips.planned },\n    { stage: 'active', label: 'On now', n: stats.trips.active },\n    { stage: 'completed', label: 'Travelled', n: stats.trips.completed },\")" \
  test/views.test.ts

say '13. §5.5 — the two surfaces stop saying the same thing about an unreadable history'
# The duplication `Refusal.tsx` documents is only honest while something asserts it is a
# duplication. This is that something.
fault 'the world map rewords its refusal' \
  'apps/web/src/views/WorldMap.tsx' \
  "s=s.replace('We could not read your travel history.','Your travel history could not be read.')" \
  test/views.test.ts

say '14. §5.1 / §0 rule B — the Profile invents content the roadmap has not built'
fault 'an achievement shelf appears on the Profile' \
  'apps/web/src/views/Profile.tsx' \
  "s=s.replace('      <div className=\"profile__body\">','      <p>Achievement unlocked</p>\n      <div className=\"profile__body\">')" \
  test/views.test.ts

say '15. the vacuity control — the shell registry census moves'
# If the tab count changes, this increment is not what it says it is.
fault 'a fourth tab is registered' \
  'apps/web/src/App.tsx' \
  "s=s.replace(\"  {\n    id: 'profile',\",\"  {\n    id: 'discover',\n    label: 'Discover',\n    render: () => null,\n  },\n  {\n    id: 'profile',\")" \
  test/views.test.ts

if [ -n "$MISMATCH" ]; then
  printf '\nMISMATCHES — these criteria are NOT load-bearing:%b\n\n' "$MISMATCH"
  exit 1
fi
printf '\nALL FAULTS RED\n\n'
