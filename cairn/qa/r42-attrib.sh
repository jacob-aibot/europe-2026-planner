#!/usr/bin/env bash
# R42 — the attribution control `qa/i8b-faults.sh` does not run on itself.
#
#   Run: bash qa/r42-attrib.sh            (from cairn/; bare Node, no browser, no server)
#
# `fault()` in `qa/i8b-faults.sh` reads exactly one bit — *"did anything fail?"* — so a mutation
# can be RED for a reason that has nothing to do with the criterion its label names. That is
# KD-79's lesson (*"a mutation that is red for a different reason than its label says is a
# coverage gap wearing a green tick"*), and `baseline_gate` does not close it: the gate proves the
# copy starts green, not that the right assertion is what turned it red.
#
# This script re-applies every mutation in `qa/i8b-faults.sh` and prints the NAME of each failing
# test, so a human can read whether the red belongs to the label. It asserts nothing; the output
# is the evidence. Faults are addressed by their `==` heading number.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
ROOT="$(cd "$CAIRN/.." && pwd)"
ONLY="${1:-}"

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
  for f in europe-2026-itinerary.html docs tickets; do
    [ -e "$ROOT/$f" ] && ln -sfn "$ROOT/$f" "$(dirname "$wt")/$f"
  done
  printf '%s' "$wt"
}

# attrib <n> <file> <py>
attrib() {
  local n="$1" file="$2" py="$3"
  if [ -n "$ONLY" ] && [ "$ONLY" != "$n" ]; then return; fi
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
" ) || { printf '\n-- %s --\n  SETUP FAILED\n' "$n"; rm -rf "$(dirname "$wt")"; return; }
  local raw; raw="$(cd "$wt" && node --test test/views.test.ts 2>&1)"
  local counts; counts="$(printf '%s' "$raw" | grep -E '^# (pass|fail)' | tr '\n' ' ')"
  printf '\n-- fault %s --  %s\n' "$n" "$counts"
  printf '%s' "$raw" | grep -E '^not ok [0-9]+ - ' | sed 's/^not ok [0-9]* - /  RED TEST: /'
  printf '%s' "$raw" | grep -E "^\s+(error|expected|actual|operator):" | head -4 | sed 's/^/    /'
  rm -rf "$(dirname "$wt")"
}

attrib 1 'apps/web/src/styles.css' \
  "s=s.replace('  width: var(--tap); height: var(--tap);\n  transform: translate(-50%, -50%);','  width: 26px; height: 26px;\n  transform: translate(-50%, -50%);')"
attrib 2 'apps/web/src/styles.css' \
  "s=s.replace('--pane-cap: min(38svh, 300px);','--pane-cap: min(38vh, 300px);')"
attrib 2b 'apps/web/src/styles.css' \
  "s=s.replace('max-height: calc(100svh - var(--chrome-h));','max-height: calc(100dvh - var(--chrome-h));')"
attrib 3 'apps/web/src/styles.css' \
  "s=s.replace('--dur-row: 160ms;','--dur-row: 600ms;')"
attrib 3b 'apps/web/src/styles.css' \
  "s=s.replace('--ease-out: cubic-bezier(0.23, 1, 0.32, 1);','--ease-out: ease-in;')"
attrib 4 'apps/web/src/styles.css' \
  "s=s.replace('  color: var(--ink); border-color: var(--ink-dim);\n}','  color: var(--ink-faint); border-color: var(--ink-dim);\n}')"
attrib 5 'apps/web/src/styles.css' \
  "s=s+'\n@media (min-width: 1600px) { .profile__body { grid-template-columns: minmax(0,1fr) 14rem 14rem; } }\n'"
attrib 6 'apps/web/src/styles.css' \
  "s=s.replace('  position: fixed; inset: auto 0 0 0; z-index: 480;','  position: sticky; top: 2.7rem; z-index: 480;')"
attrib 7 'apps/web/src/styles.css' \
  "s=s.replace('  padding-bottom: env(safe-area-inset-bottom, 0px);\n  padding-left: env(safe-area-inset-left, 0px);','  padding-left: env(safe-area-inset-left, 0px);')"
attrib 8 'apps/web/src/styles.css' \
  "s=s+'\n@media (max-width: 900px) { .trip { grid-template-columns: 1fr; } }\n'"
attrib 9 'apps/web/src/styles.css' \
  "s=s+'\n@media (min-width: 900px) { .worldmap__panes { gap: 2px; } }\n'"
attrib 10 'apps/web/src/App.tsx' \
  "s=s.replace('tabIndex={t.id === tab ? 0 : -1}','tabIndex={0}')"
attrib 10b 'apps/web/src/App.tsx' \
  "s=s.replace(\"else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;\",'')"
attrib 11 'apps/web/src/views/Profile.tsx' \
  "s=s.replace('<dl className=\"claim\"','<div className=\"statrow claim\"')"
attrib 12 'apps/web/src/views/Profile.tsx' \
  "s=s.replace(\"    { stage: 'completed', label: 'Travelled', n: stats.trips.completed },\n    { stage: 'active', label: 'On now', n: stats.trips.active },\n    { stage: 'planned', label: 'Upcoming', n: stats.trips.planned },\",\"    { stage: 'planned', label: 'Upcoming', n: stats.trips.planned },\n    { stage: 'active', label: 'On now', n: stats.trips.active },\n    { stage: 'completed', label: 'Travelled', n: stats.trips.completed },\")"
attrib 13 'apps/web/src/views/WorldMap.tsx' \
  "s=s.replace('We could not read your travel history.','Your travel history could not be read.')"
attrib 14 'apps/web/src/views/Profile.tsx' \
  "s=s.replace('      <div className=\"profile__body\">','      <p>Achievement unlocked</p>\n      <div className=\"profile__body\">')"
attrib 15 'apps/web/src/App.tsx' \
  "s=s.replace(\"  {\n    id: 'profile',\",\"  {\n    id: 'discover',\n    label: 'Discover',\n    render: () => null,\n  },\n  {\n    id: 'profile',\")"
attrib 16 'apps/web/src/views/Profile.tsx' \
  "s=s.replace(\"[plural(stats.countries.length, 'Country', 'Countries'), stats.countries.length],\",\"['Countries', stats.countries.length],\")"
attrib 17 'apps/web/src/views/Profile.tsx' \
  "s=s.replace('{i > 0 && <span className=\"claim__sep\"','{i < pairs.length - 1 && <span className=\"claim__sep\"')"
attrib 18 'apps/web/src/styles.css' \
  "s=s.replace('.crow__span, .crow__count { white-space: nowrap; }','.crow__span { white-space: nowrap; }')"
attrib 19 'apps/web/src/views/Profile.tsx' \
  "s=s.replace('<span className=\"crow__code mono\">{c.code}</span>{\\' \\'}','<span className=\"crow__code mono\">{c.code}</span>')"
attrib 20 'apps/web/src/styles.css' \
  "s=s.replace('    display: grid; grid-template-columns: 1fr 1fr; column-gap: 2rem;','    columns: 2; column-gap: 2rem;')"
attrib 21 'apps/web/src/views/Profile.tsx' \
  "s=s.replace('        <h1 className=\"profile__kicker\">Your travel record</h1>','        <p className=\"eyebrow\">Travel record</p>\n        <h1>Your travel record</h1>')"
attrib 22 'apps/web/src/styles.css' \
  "s=s.replace('  grid-area: cities; font-size: var(--t-body); color: var(--ink-soft);\n  overflow-wrap: anywhere;','  grid-area: cities; font-size: var(--t-body); color: var(--ink-soft);')"
attrib 23 'apps/web/src/styles.css' \
  "s=s.replace('.row { display: flex; gap: .6rem; align-items: flex-end; flex-wrap: wrap; }','.row { display: flex; gap: .6rem; align-items: flex-end; }')"
attrib 24 'apps/web/src/styles.css' \
  "s=s.replace('  flex-wrap: wrap; row-gap: .15rem;\n  border: 0; border-radius: 0; background: none;','  border: var(--rule); border-radius: var(--radius); background: var(--card);')"
attrib 25 'apps/web/src/views/Refusal.tsx' \
  "s=s.replace('        <p className=\"hint mono\">{refusal.message}</p>','        <p className=\"hint mono\">{refusal.message}</p>\n        <p className=\"hint\">Your other trips are unaffected.</p>')"
attrib 26 'apps/web/src/views/Refusal.tsx' \
  "s=s.replace('          {refusal.rowId','          {!refusal.rowId')"

printf '\n(no verdict — read the RED TEST names against each fault.s label in qa/i8b-faults.sh)\n\n'
