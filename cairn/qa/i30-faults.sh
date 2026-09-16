#!/usr/bin/env bash
# **I-30 / §8.4 A-91 — the four injected faults, SHOWN TO FIRE.**
#
#   bash cairn/qa/i30-faults.sh            (from anywhere)
#
# ROADMAP `I-30` names four faults and *How a criterion is written* rule 9 says a stated fault is
# shown to fire or is declared unfireable at its site. This script is that showing. For each
# fault it mutates the real source, CONFIRMS the mutation applied, runs the instrument that is
# supposed to notice, records whether it went red, and restores.
#
#   N1  the attribution node deleted          → qa/i30-attribution.mjs phases 1, 2 and 3 all redden
#   N2  the text kept, the licence link gone  → only the link assertions redden
#   N3  the string hard-coded instead of read → the corpus's $source is changed and the rendered
#                                               text does not follow it
#   N4  an unauthorised loader consumer       → test/boundaries.test.ts reddens, naming the module
#
# **N3 is the one that matters** (A-91): a hard-coded credit passes N1's and N2's assertions
# forever and goes stale at the next corpus re-pin (A-90 clause 3). So N3 is injected as a PAIR —
# the picker is made to spell the corpus's *current* string, and then the corpus is re-pinned
# underneath it. Either half alone proves nothing, which is why the control row below re-pins
# without the hard-coding and requires the probe to stay GREEN.
#
# **This mutates the checkout rather than a throwaway worktree, unlike `qa/i5b-mutants.sh`, and
# the reason is npm workspaces.** The probe needs a Vite dev server, which needs `node_modules`;
# a worktree's `node_modules/@cairn/core` symlink resolves back to the MAIN checkout's
# `packages/core`, so a worktree mutation of `meta.json` would not be the file the server serves.
# Every mutation is therefore taken from a pristine copy, restored by an EXIT trap that fires on
# interrupt and on error, and the script ends by asserting `git status --porcelain` is clean for
# every file it touched. If it is not, it says so and exits non-zero.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
cd "$CAIRN" || exit 1

PICKER="apps/web/src/views/CitySelector.tsx"
META="packages/core/src/geo/gazetteer/meta.json"
UNAUTH="apps/web/src/format.ts"
TOUCHED=("$PICKER" "$META" "$UNAUTH")

TMP="$(mktemp -d)"
for f in "${TOUCHED[@]}"; do mkdir -p "$TMP/orig/$(dirname "$f")"; cp "$f" "$TMP/orig/$f"; done
restore() { for f in "${TOUCHED[@]}"; do cp "$TMP/orig/$f" "$f"; done; }
trap 'restore; rm -rf "$TMP"' EXIT INT TERM

RED=0
STALE=0

# Literal find-and-replace, which REFUSES an edit whose target is not in the file. A perl
# substitution that matches nothing exits 0 and leaves the source untouched — a green that looks
# like coverage and is the absence of a mutation (`qa/i5b-mutants.sh`'s round-24 lesson, which
# cost it five stale rows for a year).
mut() {
  node -e '
    const fs = require("node:fs");
    const [f, a, b] = process.argv.slice(1);
    const s = fs.readFileSync(f, "utf8");
    const at = s.indexOf(a);
    if (at < 0) { console.error("   MUTATION DID NOT APPLY to " + f + " — this row is stale"); process.exit(3); }
    fs.writeFileSync(f, s.slice(0, at) + b + s.slice(at + a.length));
  ' "$1" "$2" "$3" || { STALE=$((STALE + 1)); return 1; }
  return 0
}

# Run the rendered probe and report. `expect` is what this row claims should happen.
probe() {
  local label="$1" expect="$2"
  local out="$TMP/out.txt"
  node qa/i30-attribution.mjs > "$out" 2>&1
  local code=$? fails oks
  fails=$(grep -c '^  FAIL' "$out")
  oks=$(grep -c '^  ok  ' "$out")
  printf '   %-46s exit=%s ok=%-3s FAIL=%-3s\n' "$label" "$code" "$oks" "$fails"
  grep '^  FAIL' "$out" | sed 's/^  FAIL /      red: /' | head -24
  if [ "$expect" = "red" ] && [ "$code" -eq 0 ]; then
    printf '   >>> THE FAULT DID NOT FIRE. The criterion is not held by this instrument.\n'
    RED=$((RED + 1))
  fi
  if [ "$expect" = "green" ] && [ "$code" -ne 0 ]; then
    printf '   >>> expected GREEN and got red; nothing else in this run means anything.\n'
    RED=$((RED + 1))
  fi
}

# One node test file, expected red.
nodetest() {
  local label="$1" file="$2" needle="${3:-}"
  node --test "$file" > "$TMP/t.txt" 2>&1
  local code=$?
  printf '   %-46s exit=%s\n' "$label" "$code"
  grep '^not ok' "$TMP/t.txt" | sed 's/^/      red: /' | head -8
  if [ -n "$needle" ]; then
    grep -o "$needle" "$TMP/t.txt" | head -1 | sed 's/^/      the failure message names: /'
  fi
  if [ "$code" -eq 0 ]; then printf '   >>> THE FAULT DID NOT FIRE.\n'; RED=$((RED + 1)); fi
}

echo "=== baseline — the unmutated sources"
probe "no mutation" green
restore

echo
echo "=== N1 — the attribution node deleted (all three states must redden)"
if mut "$PICKER" '{source && <p className="city-selector__source"' '{false && <p className="city-selector__source"'; then
  probe "N1 attribution node deleted" red
fi
restore

echo
echo "=== N2 — the text rendered, the licence link dropped (only the link assertions redden)"
if mut "$PICKER" "{' '}<a href={LICENCE_URL} target=\"_blank\" rel=\"noreferrer\">CC BY 4.0 license</a>" ''; then
  probe "N2 licence link dropped" red
fi
restore

echo
echo "=== N3 — the string HARD-CODED instead of read, and the corpus re-pinned underneath it"
echo "    (A-91: the fault that passes N1 and N2 forever and goes stale at the next re-pin)"
SPELLED="<span>{$(node -e 'process.stdout.write(JSON.stringify(JSON.parse(require("node:fs").readFileSync("packages/core/src/geo/gazetteer/meta.json","utf8")).$source))')}</span>"
if mut "$PICKER" '<span>{source}</span>' "$SPELLED" \
  && mut "$META" '"$source":"GeoNames geographical database' '"$source":"GeoNames geographical database RE-PINNED-2027'; then
  probe "N3 hard-coded string vs a re-pinned corpus" red
fi
restore

echo
echo "    N3 control — the SAME re-pin with the picker left honest: it must stay green"
if mut "$META" '"$source":"GeoNames geographical database' '"$source":"GeoNames geographical database RE-PINNED-2027'; then
  probe "N3 control: re-pin only, source read from data" green
fi
restore

echo
echo "    N3 standing guard — does the node suite catch the hard-coding on its own?"
if mut "$PICKER" '<span>{source}</span>' "$SPELLED"; then
  nodetest "test/attribution.test.ts" "test/attribution.test.ts"
fi
restore

echo
echo "=== N4 — an UNAUTHORISED module reaches the loader (the allowlist is the denominator)"
echo "    apps/web/src/format.ts is not in GAZETTEER_CONSUMERS; it now names a door."
if mut "$UNAUTH" '/**' "import { loadGazetteerFor } from '@cairn/core/gazetteer';
void loadGazetteerFor;
/**"; then
  nodetest "unauthorised consumer added" "test/boundaries.test.ts" 'apps/web/src/format.ts'
fi
restore

echo
echo "=== restored — every touched file must be byte-identical to how this script found it"
# Compared against THIS SCRIPT'S pristine copies, not against git: the picker is normally dirty
# in the working tree of whoever is building it, and a git comparison would report their own
# uncommitted work as a surviving mutation.
DIRTY=0
for f in "${TOUCHED[@]}"; do
  if cmp -s "$f" "$TMP/orig/$f"; then
    printf '   unchanged  %s\n' "$f"
  else
    printf '   MUTATED    %s — a mutation survived this script\n' "$f"; DIRTY=1
  fi
done
[ "$DIRTY" -eq 0 ] || exit 1

if [ "$STALE" -gt 0 ] || [ "$RED" -gt 0 ]; then
  echo
  echo "=== $STALE stale row(s), $RED fault(s) that did not fire"
  exit 1
fi
echo
echo "=== every fault fired"
