#!/usr/bin/env bash
# **I-30 / §8.4 A-91 — the four injected faults, SHOWN TO FIRE.**
#
#   bash cairn/qa/i30-faults.sh            (from anywhere)
#
# ROADMAP `I-30` names four faults and *How a criterion is written* rule 9 says a stated fault is
# shown to fire or is declared unfireable at its site. This script is that showing. For each
# fault it mutates the source, CONFIRMS the mutation applied, runs the instrument that is
# supposed to notice, records whether it went red, and moves on.
#
#   N1  the attribution node deleted          → qa/i30-attribution.mjs phases 1, 2, 3 and 6 redden
#   N2  the text kept, the licence link gone  → only the link assertions redden
#   N3  the string hard-coded instead of read → the corpus's $source is changed and the rendered
#                                               text does not follow it
#   N3b a PARTIAL hard-code (head spelled)    → same, and it is why N3's re-pin replaces the WHOLE
#                                               $source rather than prefixing it (QA R74-6)
#   N4  an unauthorised loader consumer       → test/boundaries.test.ts reddens, naming the module
#
# **N3 is the one that matters** (A-91): a hard-coded credit passes N1's and N2's assertions
# forever and goes stale at the next corpus re-pin (A-90 clause 3). So N3 is injected as a PAIR —
# the picker is made to spell the corpus's *current* string, and then the corpus is re-pinned
# underneath it. Either half alone proves nothing, which is why the control row below re-pins
# without the hard-coding and requires the probe to stay GREEN.
#
# **NOTHING IS WRITTEN TO THE CHECKOUT YOU RAN THIS FROM.** Every mutation is applied inside a
# throwaway `git worktree` built from HEAD **plus your uncommitted changes under `cairn/`**, with
# `node_modules` mirrored into it entry by entry so both the dev server and `node --test` resolve
# the worktree's own `packages/*`. Revision history: this script used to mutate the real checkout,
# and the reason it gave — *"a worktree's `node_modules/@cairn/core` symlink resolves back to the
# MAIN checkout"* — was measured and **refuted** (QA **R74-4**, `qa/r74-faults-safety.sh` S0).
# `apps/web/vite.config.ts` aliases `@cairn/core/gazetteer` to a path relative to the **config
# file**, so the workspace link is never consulted for it at all; and the `node --test` half of
# the claim is answered by mirroring `node_modules` rather than symlinking it whole.
#
# It ends by asserting that this checkout's `git status --porcelain` for `cairn/` is **exactly
# what it was when the script started** — not that it is empty, because the working tree of
# whoever is building the picker is normally dirty and their own uncommitted work is not a
# surviving mutation. The three files the mutations name are additionally compared byte for byte
# against copies taken before any worktree existed. If either check moves, it says so and exits
# non-zero.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
cd "$CAIRN" || exit 1
ROOT="$(git -C "$CAIRN" rev-parse --show-toplevel)" || { echo "not a git checkout"; exit 1; }
RELCAIRN="$(git -C "$CAIRN" rev-parse --show-prefix)"; RELCAIRN="${RELCAIRN%/}"

PICKER="apps/web/src/views/CitySelector.tsx"
META="packages/core/src/geo/gazetteer/meta.json"
UNAUTH="apps/web/src/format.ts"
TOUCHED=("$PICKER" "$META" "$UNAUTH")

# --------------------------------------------------------------------- one run at a time
# **QA R74-7.** Two concurrent runs used to share one working tree: run B's `cp` could snapshot
# run A's mutation as B's own "pristine" copy, and B's closing self-check then compared against
# that snapshot and called a surviving mutation *unchanged*. Each run now owns a private worktree,
# which removes the shared file; this lock removes the rest (one shared `.vite` cache, one shared
# port range, one shared pile of `npx vite` children) and makes a second run fail LOUDLY.
LOCK="${TMPDIR:-/tmp}/cairn-i30-faults.$(printf '%s' "$CAIRN" | cksum | cut -d' ' -f1).lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  OTHER="$(cat "$LOCK/pid" 2>/dev/null || true)"
  if [ -n "$OTHER" ] && kill -0 "$OTHER" 2>/dev/null; then
    echo "REFUSING: qa/i30-faults.sh is already running against this checkout (pid $OTHER)."
    echo "  Two runs at once share a port range and a dev-server cache, and used to share the"
    echo "  working tree itself (QA R74-7). Wait for it, or kill it."
    exit 2
  fi
  echo "note clearing a stale lock left by pid ${OTHER:-unknown}"
  rm -rf "$LOCK"; mkdir "$LOCK" || { echo "REFUSING: cannot take $LOCK"; exit 2; }
fi
printf '%s\n' "$$" > "$LOCK/pid"

# ------------------------------------------------------- what this checkout looked like before
TMP="$(mktemp -d)"
for f in "${TOUCHED[@]}"; do mkdir -p "$TMP/orig/$(dirname "$f")"; cp "$f" "$TMP/orig/$f"; done
git -C "$ROOT" status --porcelain -- "${RELCAIRN:-.}" > "$TMP/status.before"

WT=""
cleanup() {
  if [ -n "$WT" ]; then
    # Remove, then remove again unconditionally, then prune: `worktree remove` refuses a
    # half-finished `worktree add`, and a registration whose directory still exists is not
    # stale, so `prune` alone would leave it behind.
    git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1
    rm -rf "$WT"
    git -C "$ROOT" worktree prune >/dev/null 2>&1
  fi
  rm -rf "$TMP" "$LOCK"
}
# **QA R74-1.** `trap '…' EXIT INT TERM` with no `exit` meant an interrupt ran the handler and
# then **carried on**: every later mutation was unrestorable and every later row was measured on
# a stacked mutation. A signal handler now clears every trap first (so EXIT cannot run the same
# cleanup a second time), cleans up, and re-raises the signal with the default disposition — so
# the script dies of the signal it was sent, with the right exit status.
on_signal() {
  trap - EXIT INT TERM HUP
  echo; echo "=== interrupted ($1) — removing the worktree and stopping"
  cleanup
  trap - "$1"
  kill -s "$1" "$$"
}
trap 'cleanup' EXIT
trap 'on_signal INT' INT
trap 'on_signal TERM' TERM
trap 'on_signal HUP' HUP

# **AND A TRAP IS NOT ENOUGH, WHICH R74-1 DOES NOT SAY AND THIS SCRIPT MUST.** POSIX requires a
# shell to start an asynchronous command with SIGINT and SIGQUIT **ignored**, and a signal that
# was ignored on entry *cannot be trapped or reset* — so when this script is launched in the
# background by another script (which is exactly how `qa/r74-faults-safety.sh` S1 and
# `qa/i30-faults-safety.sh` drive it) the `INT` trap above is never installed and Ctrl-C's signal
# is invisible to this shell. Measured, not assumed: `SigIgn: …06` in /proc/<pid>/status. The
# second mechanism is `abort` below, which stops the run at the END OF THE ROW an interrupt
# lands in, whether or not the signal reached this shell — the EXIT trap still fires, so the
# worktree still goes and the lock is still released.
SIGIGN_HEX="$(awk '/^SigIgn:/ {print $2}' /proc/$$/status 2>/dev/null || echo 0)"
if [ $(( 0x${SIGIGN_HEX:-0} & 2 )) -ne 0 ]; then
  echo "note SIGINT was ignored when this shell started, so no trap can catch Ctrl-C in this"
  echo "     launch (POSIX: an asynchronous command from a non-interactive shell). Stop this run"
  echo "     with SIGTERM. A run started from a terminal traps INT normally."
fi

# A row that measured nothing, or a control that went red, invalidates every row after it. Stop
# rather than print more rows nobody can read — the EXIT trap removes the worktree on the way.
abort() {
  echo
  echo "=== ABORTING: $1"
  echo "    Nothing after this point would mean anything, so this run does not produce it."
  exit 1
}

# ------------------------------------------------------------------------- the private worktree
echo "=== building a throwaway worktree (this checkout is never written to)"
WT="$TMP/wt"
if ! git -C "$ROOT" worktree add --detach "$WT" HEAD >/dev/null 2>&1; then
  echo "   could not create a worktree. REFUSING to fall back to mutating this checkout."
  WT=""; exit 1
fi
WTC="$WT/${RELCAIRN:-.}"
# HEAD is not what is being reviewed — the working tree is. Carry the uncommitted changes and the
# untracked (non-ignored) files under cairn/ across, so this measures the picker you are editing.
if ! git -C "$ROOT" diff HEAD -- "${RELCAIRN:-.}" > "$TMP/dirty.patch"; then
  echo "   could not read this checkout's uncommitted changes"; exit 1
fi
if [ -s "$TMP/dirty.patch" ]; then
  if git -C "$WT" apply "$TMP/dirty.patch"; then
    printf '   carried %s line(s) of uncommitted change into the worktree\n' "$(wc -l < "$TMP/dirty.patch")"
  else
    echo "   could not apply this checkout's uncommitted changes to the worktree — REFUSING to"
    echo "   measure a source that is not the one you are editing."
    exit 1
  fi
fi
while IFS= read -r f; do
  [ -n "$f" ] || continue
  mkdir -p "$WT/$(dirname "$f")" && cp "$ROOT/$f" "$WT/$f"
done < <(git -C "$ROOT" ls-files --others --exclude-standard -- "${RELCAIRN:-.}")

# `node_modules` is mirrored entry by entry rather than symlinked whole, because the ONE entry
# that must not point back here is `@cairn`: `node --test` resolves `@cairn/core/gazetteer`
# through it, and a link to this checkout's `packages/core` would run the node half of every row
# against unmutated sources. The workspace links are recreated relative to the worktree.
mkdir -p "$WTC/node_modules" "$WTC/apps/web/node_modules"
for n in $(ls -1A "$CAIRN/node_modules"); do
  [ "$n" = "@cairn" ] && continue
  ln -s "$CAIRN/node_modules/$n" "$WTC/node_modules/$n"
done
mkdir -p "$WTC/node_modules/@cairn"
ln -s ../../packages/core "$WTC/node_modules/@cairn/core"
ln -s ../../packages/client "$WTC/node_modules/@cairn/client"
ln -s ../../packages/tokens "$WTC/node_modules/@cairn/tokens"
ln -s ../../apps/web "$WTC/node_modules/@cairn/web"
( cd "$WTC" && node tools/gen-sample.mjs ) | sed 's/^/   /'   # `npm run dev`'s presample step
# The isolation is asserted, not assumed: a sentinel written into the worktree's `meta.json` must
# come back out of `@cairn/core/gazetteer` when `node` resolves it from inside the worktree, and
# this checkout's copy must be untouched. If that fails the rest of the script is meaningless.
node -e '
  const fs=require("node:fs"); const f=process.argv[1];
  const s=fs.readFileSync(f,"utf8"); const a="\"$source\":\"";
  const at=s.indexOf(a); if(at<0) process.exit(3);
  fs.writeFileSync(f, s.slice(0,at+a.length)+"WORKTREE-ISOLATION-SENTINEL "+s.slice(at+a.length));
' "$WTC/$META" || { echo "   could not write the isolation sentinel"; exit 1; }
( cd "$WTC" && node --input-type=module -e '
  const { loadGazetteerFor } = await import("@cairn/core/gazetteer");
  const g = await loadGazetteerFor("zurich");
  if (!g.source.startsWith("WORKTREE-ISOLATION-SENTINEL")) {
    console.error("   node resolved @cairn/core OUTSIDE the worktree — refusing to go on");
    process.exit(1);
  }
' ) || exit 1
grep -q 'WORKTREE-ISOLATION-SENTINEL' "$META" && { echo "   the sentinel reached THIS checkout — refusing to go on"; exit 1; }
cp "$TMP/orig/$META" "$WTC/$META"
printf '   worktree: %s (node_modules mirrored, @cairn re-pointed, isolation asserted)\n' "$WTC"

RED=0
STALE=0

# Literal find-and-replace, which REFUSES an edit whose target is not in the file. A perl
# substitution that matches nothing exits 0 and leaves the source untouched — a green that looks
# like coverage and is the absence of a mutation (`qa/i5b-mutants.sh`'s round-24 lesson, which
# cost it five stale rows for a year). Paths are relative to the WORKTREE.
mut() {
  node -e '
    const fs = require("node:fs");
    const [f, a, b] = process.argv.slice(1);
    const s = fs.readFileSync(f, "utf8");
    const at = s.indexOf(a);
    if (at < 0) { console.error("   MUTATION DID NOT APPLY to " + f + " — this row is stale"); process.exit(3); }
    fs.writeFileSync(f, s.slice(0, at) + b + s.slice(at + a.length));
  ' "$WTC/$1" "$2" "$3" || { STALE=$((STALE + 1)); return 1; }
  return 0
}
restore() { for f in "${TOUCHED[@]}"; do cp "$TMP/orig/$f" "$WTC/$f"; done; }
restore   # the worktree starts from the same three files this checkout holds

# Run the rendered probe and report. `expect` is what this row claims should happen.
#
# **A row is decided by the ASSERTIONS, not by the exit code — QA R74-2.** `i30-attribution.mjs`
# used to pick one random port in 5100-5499 with `--strictPort` and no retry, so an occupied port
# was a timeout and a non-zero exit with `ok=0 FAIL=0` — which this function read as *the fault
# fired*, for every `expect=red` row, with nothing measured at all. Two guards: the probe must
# have STARTED (it prints `i30-attribution: <url>` only once its server answers), and a red row
# must carry at least one assertion that actually ran and failed.
probe() {
  local label="$1" expect="$2"
  local out="$TMP/out.txt"
  ( cd "$WTC" && node qa/i30-attribution.mjs ) > "$out" 2>&1
  local code=$? fails oks started finished
  fails=$(grep -c '^  FAIL' "$out")
  oks=$(grep -c '^  ok  ' "$out")
  started=$(grep -c '^i30-attribution: ' "$out")
  # The probe's last line is its own verdict; its absence means the run did not finish, which is
  # what an interrupt, a crash or a timeout looks like from here.
  finished=$(grep -cE '^(all phases green|[0-9]+ FAILURE\(S\))$' "$out")
  printf '   %-46s exit=%s ok=%-3s FAIL=%-3s\n' "$label" "$code" "$oks" "$fails"
  grep '^  FAIL' "$out" | sed 's/^  FAIL /      red: /' | head -24
  if [ "$code" -ge 128 ]; then
    printf '   >>> the probe was KILLED by signal %s.\n' "$((code - 128))"
    RED=$((RED + 1))
    abort "a row was interrupted"
  fi
  if [ "$started" -eq 0 ] || [ $((oks + fails)) -eq 0 ]; then
    printf '   >>> THE PROBE NEVER RAN — no assertion was evaluated, so this row measured NOTHING.\n'
    printf '   >>> Whatever the exit code says, it is not evidence about the fault.\n'
    tail -4 "$out" | sed 's/^/       /'
    RED=$((RED + 1))
    abort "a row measured nothing"
  fi
  if [ "$finished" -eq 0 ]; then
    printf '   >>> THE PROBE DID NOT FINISH — it printed no verdict line, so these counts are a\n'
    printf '   >>> FRAGMENT of a run (interrupted, crashed or timed out), not a measurement.\n'
    tail -4 "$out" | sed 's/^/       /'
    RED=$((RED + 1))
    abort "a row did not run to completion"
  fi
  if [ "$expect" = "red" ] && { [ "$code" -eq 0 ] || [ "$fails" -eq 0 ]; }; then
    printf '   >>> THE FAULT DID NOT FIRE. The criterion is not held by this instrument.\n'
    RED=$((RED + 1))
  fi
  if [ "$expect" = "green" ] && { [ "$code" -ne 0 ] || [ "$fails" -ne 0 ]; }; then
    printf '   >>> expected GREEN and got red; nothing else in this run means anything.\n'
    RED=$((RED + 1))
    abort "a control row went red"
  fi
}

# One node test file, expected red. Run inside the worktree so `@cairn/*` resolves there.
nodetest() {
  local label="$1" file="$2" needle="${3:-}"
  ( cd "$WTC" && node --test "$file" ) > "$TMP/t.txt" 2>&1
  local code=$?
  printf '   %-46s exit=%s\n' "$label" "$code"
  grep '^not ok' "$TMP/t.txt" | sed 's/^/      red: /' | head -8
  if [ -n "$needle" ]; then
    grep -o "$needle" "$TMP/t.txt" | head -1 | sed 's/^/      the failure message names: /'
  fi
  if [ "$code" -eq 0 ]; then printf '   >>> THE FAULT DID NOT FIRE.\n'; RED=$((RED + 1)); fi
}

echo
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
# **The re-pin replaces the WHOLE `$source` value — QA R74-6.** It used to insert a token after a
# fixed head, which left a partial hard-code that SPELLS that head and interpolates the tail
# rendering exactly the re-pinned string: correct output from a stale mechanism, invisible to any
# rendered check. A replacement that shares neither a prefix nor a suffix with the old value
# leaves no fragment a partial hard-code can spell — see N3b, which plants one.
SPELLED="<span>{$(node -e 'process.stdout.write(JSON.stringify(JSON.parse(require("node:fs").readFileSync("packages/core/src/geo/gazetteer/meta.json","utf8")).$source))')}</span>"
REPIN_FROM="$(node -e 'process.stdout.write("\"$source\":" + JSON.stringify(JSON.parse(require("node:fs").readFileSync("packages/core/src/geo/gazetteer/meta.json","utf8")).$source))')"
REPIN_TO='"$source":"RE-PINNED-2027 provenance sentence, sharing no prefix and no suffix with the one it replaced, so that no fragment of the old string can be spelled and still be right."'
if mut "$PICKER" '<span>{source}</span>' "$SPELLED" \
  && mut "$META" "$REPIN_FROM" "$REPIN_TO"; then
  probe "N3 hard-coded string vs a re-pinned corpus" red
fi
restore

echo
echo "    N3b — a PARTIAL hard-code: the head SPELLED, the tail read, same re-pin (QA R74-6)"
echo "    (this is the shape that passed 35/35 while the re-pin only prefixed the old string)"
HEAD_LIT="$(node -e 'process.stdout.write(JSON.stringify(JSON.parse(require("node:fs").readFileSync("packages/core/src/geo/gazetteer/meta.json","utf8")).$source.slice(0, 30)))')"
if mut "$PICKER" '<span>{source}</span>' "<span>{$HEAD_LIT + source.slice(30)}</span>" \
  && mut "$META" "$REPIN_FROM" "$REPIN_TO"; then
  probe "N3b partial hard-code vs the widened re-pin" red
fi
restore

echo
echo "    N3 control — the SAME re-pin with the picker left honest: it must stay green"
if mut "$META" "$REPIN_FROM" "$REPIN_TO"; then
  probe "N3 control: re-pin only, source read from data" green
fi
restore

echo
echo "    N3 standing guard — does the node suite catch the hard-coding on its own?"
echo "    (it is the half that catches N3b without a re-pin: a word list, not a comparison)"
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
echo "=== this checkout must be exactly as this script found it"
# Not "clean": the working tree of whoever is building the picker is normally dirty, and their
# own uncommitted work is not a surviving mutation. What must hold is that NOTHING MOVED — the
# same porcelain status, and the three named files byte for byte.
DIRTY=0
git -C "$ROOT" status --porcelain -- "${RELCAIRN:-.}" > "$TMP/status.after"
if cmp -s "$TMP/status.before" "$TMP/status.after"; then
  printf '   unchanged  git status --porcelain -- %s\n' "${RELCAIRN:-.}"
else
  printf '   MOVED      git status --porcelain -- %s\n' "${RELCAIRN:-.}"
  diff "$TMP/status.before" "$TMP/status.after" | sed 's/^/      /'
  DIRTY=1
fi
for f in "${TOUCHED[@]}"; do
  if cmp -s "$f" "$TMP/orig/$f"; then
    printf '   unchanged  %s\n' "$f"
  else
    printf '   MUTATED    %s — a mutation escaped the worktree\n' "$f"; DIRTY=1
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
