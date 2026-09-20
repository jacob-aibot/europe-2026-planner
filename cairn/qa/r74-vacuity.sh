#!/usr/bin/env bash
# **QA round 74 — vacuity and strength attacks on I-30's gate instruments.**
#
#   bash cairn/qa/r74-vacuity.sh [row ...]      rows: V1 V2 V3 V4 V5 (default: all)
#
# `qa/i30-faults.sh` is the builder's own showing that N1/N2/N3/N4 fire. This file asks the
# complementary question: what does the instrument NOT notice? Each row mutates the real
# checkout (same reason as `i30-faults.sh` — a worktree's `node_modules/@cairn/core` symlink
# resolves back here), runs `qa/i30-attribution.mjs` against an already-running dev server, and
# says whether the mutation was caught.
#
#   V1  the credit is display:none        — expected RED; a [rendered] criterion that passes on an
#                                           invisible node is a criterion about the DOM, not the screen
#   V2  PARTIAL hard-code, HEAD spelled   — expected RED; N3's re-pin only touches the head
#   V3  PARTIAL hard-code, TAIL spelled   — expected RED
#   V4  the N3 control, measured          — the re-pinned token must appear in the rendered DOM
#   V5  the pick dropped on selection     — expected RED in phase 5 (is the Geneva chain vacuous?)
#
# Requires a dev server: (cd cairn/apps/web && npx vite --port 5399 --host 127.0.0.1 --strictPort)
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
cd "$CAIRN" || exit 1
URL="${R74_URL:-http://127.0.0.1:5399/}"

PICKER="apps/web/src/views/CitySelector.tsx"
META="packages/core/src/geo/gazetteer/meta.json"
CSS="apps/web/src/world.css"
TOUCHED=("$PICKER" "$META" "$CSS")

TMP="$(mktemp -d)"
for f in "${TOUCHED[@]}"; do mkdir -p "$TMP/orig/$(dirname "$f")"; cp "$f" "$TMP/orig/$f"; done
restore() { for f in "${TOUCHED[@]}"; do cp "$TMP/orig/$f" "$f"; done; sleep 2; }
trap 'restore; rm -rf "$TMP"' EXIT INT TERM

WANT=("$@"); [ ${#WANT[@]} -eq 0 ] && WANT=(V1 V2 V3 V4 V5)
want() { for w in "${WANT[@]}"; do [ "$w" = "$1" ] && return 0; done; return 1; }

BAD=0
UNMEASURED=0
mut() {
  node -e '
    const fs = require("node:fs");
    const [f, a, b] = process.argv.slice(1);
    const s = fs.readFileSync(f, "utf8");
    const at = s.indexOf(a);
    if (at < 0) { console.error("   MUTATION DID NOT APPLY to " + f); process.exit(3); }
    fs.writeFileSync(f, s.slice(0, at) + b + s.slice(at + a.length));
  ' "$1" "$2" "$3" || return 1
  sleep 2
  return 0
}

# **MGR-15, fixed at QA round 75.** This decided a red row on `code -ne 0` ALONE — which is
# R74-2's exact failure mode, live in the instrument this file used to FILE R74-2 against the
# builder. `i30-attribution.mjs` announces correctly that it measured nothing when the server does
# not answer, and exits 1; this wrapper scored that as CAUGHT and printed *"every mutation was
# caught"* with exit 0. A run that never started is not a fired fault.
#
# The rule is now the same three-part one the builder was made to implement, plus `FAIL >= 1`:
#
#   STARTED   the probe printed its `i30-attribution: <url>` banner, which it only reaches after
#             the server answered;
#   RAN       at least one real assertion was scored (a `MEASURED NOTHING` line is not one);
#   FINISHED  the probe printed its own terminating verdict line;
#   RED       and, for a row that expects red, at least one REAL `FAIL`.
#
# A row that fails STARTED/RAN/FINISHED is UNMEASURED: it is neither caught nor not-caught, it
# counts against `BAD`, and it may never be reported as a mutation the instrument caught.
probe() { # label expect
  local label="$1" expect="$2" out="$TMP/out.txt"
  node qa/i30-attribution.mjs --url="$URL" > "$out" 2>&1
  local code=$? fails oks started finished nothing real_fails
  fails=$(grep -c '^  FAIL' "$out"); oks=$(grep -c '^  ok  ' "$out")
  nothing=$(grep -c 'MEASURED NOTHING' "$out")
  real_fails=$((fails - nothing))
  started=$(grep -c '^i30-attribution: ' "$out")
  finished=$(grep -cE '^(all phases green|[0-9]+ FAILURE\(S\))$' "$out")
  printf '   %-44s exit=%s ok=%-3s FAIL=%-3s (real=%s started=%s finished=%s)\n' \
    "$label" "$code" "$oks" "$fails" "$real_fails" "$started" "$finished"
  grep '^  FAIL' "$out" | sed 's/^  FAIL /      red: /' | head -8
  if [ "$started" -eq 0 ] || [ "$finished" -eq 0 ] || [ $((oks + real_fails)) -eq 0 ]; then
    printf '   >>> UNMEASURED. started=%s ran=%s finished=%s — this run scored NOTHING, so it is\n' \
      "$started" "$((oks + real_fails))" "$finished"
    printf '       neither a caught mutation nor an uncaught one. Start a dev server:\n'
    printf '       (cd apps/web && npx vite --port 5399 --host 127.0.0.1 --strictPort)\n'
    BAD=$((BAD+1)); UNMEASURED=$((UNMEASURED+1)); return
  fi
  if [ "$expect" = red ] && { [ "$code" -eq 0 ] || [ "$real_fails" -lt 1 ]; }; then
    printf '   >>> NOT CAUGHT. The instrument is green on this mutation.\n'; BAD=$((BAD+1))
  fi
  if [ "$expect" = green ] && [ "$code" -ne 0 ]; then
    printf '   >>> expected green.\n'; BAD=$((BAD+1))
  fi
}

# The exact head of meta.json's $source, and its length, computed rather than spelled.
HEAD='GeoNames geographical database'
TAIL="$(node -e 'const s=JSON.parse(require("node:fs").readFileSync("packages/core/src/geo/gazetteer/meta.json","utf8")).$source; process.stdout.write(JSON.stringify(s.slice(30)))')"
REPIN_FROM='"$source":"GeoNames geographical database'
REPIN_TO='"$source":"GeoNames geographical database RE-PINNED-2027'

if want V1; then
echo "=== V1 — the credit rendered but display:none (is [rendered] about the screen?)"
if mut "$CSS" '.city-selector__message, .city-selector__source {' '.city-selector__source { display: none !important; }
.city-selector__message, .city-selector__source {'; then
  probe "V1 attribution display:none" red
fi
restore
fi

if want V2; then
echo
echo "=== V2 — PARTIAL hard-code: the HEAD spelled, the tail read, corpus re-pinned underneath"
if mut "$PICKER" '<span>{source}</span>' "<span>{'$HEAD' + source.slice(30)}</span>" \
  && mut "$META" "$REPIN_FROM" "$REPIN_TO"; then
  probe "V2 head hard-coded vs re-pin" red
fi
restore
fi

if want V3; then
echo
echo "=== V3 — PARTIAL hard-code: the TAIL spelled, the head read, corpus re-pinned underneath"
if mut "$PICKER" '<span>{source}</span>' "<span>{source.slice(0, 30) + $TAIL}</span>" \
  && mut "$META" "$REPIN_FROM" "$REPIN_TO"; then
  probe "V3 tail hard-coded vs re-pin" red
fi
restore
fi

if want V4; then
echo
echo "=== V4 — the N3 CONTROL, measured: does the rendered DOM carry the re-pinned token?"
if mut "$META" "$REPIN_FROM" "$REPIN_TO"; then
  node -e '
    const pw = require("/opt/node22/lib/node_modules/playwright/index.js");
    (async () => {
      const b = await pw.chromium.launch();
      const p = await (await b.newContext()).newPage();
      await p.route("**tile.openstreetmap.org/**", (r) => r.abort());
      await p.goto(process.env.R74_URL || "http://127.0.0.1:5399/", { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(2000);
      await p.getByRole("button", { name: /Add somewhere I.ve been/i }).first().click();
      await p.waitForTimeout(2500);
      const t = await p.getByTestId("gazetteer-attribution").first().innerText();
      const hit = t.includes("RE-PINNED-2027");
      console.log("   " + (hit ? "ok  " : "FAIL") + " the honest picker renders the RE-PINNED token in \"keep typing\"");
      console.log("      rendered: " + JSON.stringify(t.slice(0, 80)));
      await b.close();
      process.exit(hit ? 0 : 1);
    })();
  ' || BAD=$((BAD+1))
  probe "V4 control: re-pin only, honest picker" green
fi
restore
fi

if want V5; then
echo
echo "=== V5 — the pick DROPPED when a hit is chosen (is phase 5 vacuous?)"
if mut "$PICKER" 'onClick={() => add({ name: hit.name, pick: cityPickFromRow(hit) })}' 'onClick={() => add({ name: hit.name })}'; then
  probe "V5 picked city carries no pick" red
fi
restore
fi

echo
echo "=== restored — every touched file byte-identical to how this script found it"
D=0
for f in "${TOUCHED[@]}"; do
  cmp -s "$f" "$TMP/orig/$f" && printf '   unchanged  %s\n' "$f" || { printf '   MUTATED    %s\n' "$f"; D=1; }
done
[ "$D" -eq 0 ] || exit 1
echo
if [ "$UNMEASURED" -gt 0 ]; then
  echo "=== $UNMEASURED row(s) UNMEASURED — this run establishes NOTHING about the instrument."
  echo "    ($BAD row(s) scored against, of which $UNMEASURED never ran.)"
  exit 1
fi
[ "$BAD" -eq 0 ] && echo "=== every mutation was caught" || { echo "=== $BAD mutation(s) NOT caught"; exit 1; }
