#!/usr/bin/env bash
# **QA round 74 — the safety of `qa/i30-faults.sh`, which mutates the REAL checkout.**
#
#   bash cairn/qa/r74-faults-safety.sh [S1 S2 S3 S4]      (default: all)
#
# `i30-faults.sh` cannot use a throwaway worktree (a worktree's `node_modules/@cairn/core`
# symlink resolves back to this checkout, so a worktree mutation of `meta.json` is not the file
# the dev server serves). That reasoning is sound — S0 below re-measures it — so the mutations
# land on the working tree Jacob's branch lives in, and the blast radius of a failure is the
# repository. These rows attack the guard rails.
#
#   S0  the worktree claim                — **RETIRED at round 75**: its subject was fixed (R74-4)
#   S1  SIGINT mid-mutation               — **RETIRED**: replaced by i30-faults-safety.sh F1/F3
#   S2  SIGKILL mid-mutation              — **RETIRED**: replaced by i30-faults-safety.sh F1
#   S3  two runs at once                  — **RETIRED**: replaced by i30-faults-safety.sh F2
#   S4  a mutation target that is absent — must be reported stale, not skipped silently
#
# S4 restores with `git checkout --`, so this script REFUSES to start unless the three files it
# can touch are clean. (S2 and S3, which used to be the reason for that refusal, are retired.)
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
cd "$CAIRN" || exit 1
PICKER="apps/web/src/views/CitySelector.tsx"
META="packages/core/src/geo/gazetteer/meta.json"
UNAUTH="apps/web/src/format.ts"

if [ -n "$(git status --porcelain -- "$PICKER" "$META" "$UNAUTH")" ]; then
  echo "REFUSING: $PICKER / $META / $UNAUTH are not clean. This script restores with git checkout."
  exit 2
fi

WANT=("$@"); [ ${#WANT[@]} -eq 0 ] && WANT=(S0 S1 S2 S3 S4 S5)   # S0-S3 are RETIRED; see the block below
want() { for w in "${WANT[@]}"; do [ "$w" = "$1" ] && return 0; done; return 1; }
FAIL=0
ok() { if [ "$1" = 0 ]; then printf '  ok   %s\n' "$2"; else printf '  FAIL %s\n' "$2"; FAIL=$((FAIL+1)); fi; }

# Wait until i30-faults.sh has a mutation on disk, or give up.
wait_for_mutation() {
  for _ in $(seq 1 240); do
    if [ -n "$(git status --porcelain -- "$PICKER" "$META")" ]; then return 0; fi
    sleep 1
  done
  return 1
}

# ===========================================================================================
# **S0, S1, S2 and S3 are RETIRED at QA round 75. They are kept, not deleted.**
#
# A breaker's evidence board records what was measured and when it stopped being measurable. All
# four rows scored FAIL at HEAD, and none of the four FAILs was a live defect:
#
#   S0  asserted against a HEADER CLAIM that `qa/i30-faults.sh` no longer contains. Its verdict
#       line is *"the stated reason for mutating the real checkout does NOT hold"* — and the
#       script no longer mutates the real checkout and no longer states that reason: R74-4 was
#       accepted, `i30-faults.sh` lines 24-32 now record the claim as measured and REFUTED and
#       every mutation lands in a throwaway worktree. A row that fails because its subject was
#       fixed is a stale verdict.
#       REPLACED BY: `qa/i30-faults.sh`'s own per-run isolation assertion (it asserts the
#       worktree's `@cairn/core` resolves to the worktree, on every run) plus S5 below, which
#       still reads a live property.
#
#   S1  SIGINT mid-mutation · S2 SIGKILL mid-mutation · S3 two runs at once.
#       All three begin with `wait_for_mutation`, which polls THIS checkout's
#       `git status --porcelain -- $PICKER $META` for 240 s. After R74-4's worktree fix, no
#       mutation ever appears there. **Measured at round 75, not reasoned about:** a full
#       `qa/i30-faults.sh` run was watched for its whole duration and this checkout's porcelain
#       for those two paths never moved once (`SEEN=0`). So all three rows time out and report
#       *"unmeasured"*, which scores FAIL — a hazard that no longer has a surface, reported as a
#       defect.
#       REPLACED BY, row for row, in `qa/i30-faults-safety.sh`:
#         S1 (SIGINT, trap restores the tree)      -> F1 (SIGTERM) and F3 (SIGINT, where POSIX
#                                                     starts an asynchronous command with SIGINT
#                                                     IGNORED so no trap can install at all —
#                                                     the case S1 assumed away)
#         S2 (SIGKILL residue in the checkout)     -> F1's worktree/lock/porcelain assertions;
#                                                     a SIGKILL now abandons a throwaway worktree
#                                                     rather than a mutated review branch
#         S3 (two runs share state)                -> F2 (a second concurrent run must be REFUSED
#                                                     loudly, which is the fix for the hazard S3
#                                                     was written to demonstrate)
#
# The four rows below print their record and score NOTHING. `bash qa/i30-faults-safety.sh` is the
# live evidence; this file keeps S4 and S5, which still measure live properties.
# ===========================================================================================
retired() { # id, what it measured, what replaced it
  printf '  RETIRED %s\n    was: %s\n    now: %s\n' "$1" "$2" "$3"
}

if want S0; then
echo "== S0 — RETIRED (round 75)"
retired "S0 the worktree claim, measured rather than accepted" \
  "a FAIL asserting that i30-faults.sh's stated reason for mutating the real checkout does not hold" \
  "the claim was withdrawn by the builder at R74-4; i30-faults.sh asserts its own worktree isolation on every run"
fi

if want S1; then
echo
echo "== S1 — RETIRED (round 75)"
retired "S1 SIGINT mid-mutation" \
  "wait_for_mutation over THIS checkout, which no longer sees a mutation (measured: SEEN=0 over a full run)" \
  "qa/i30-faults-safety.sh F1 (SIGTERM) and F3 (SIGINT, where no trap can install)"
fi

if want S2; then
echo
echo "== S2 — RETIRED (round 75)"
retired "S2 SIGKILL mid-mutation, the residue stated" \
  "the same wait_for_mutation; and the residue it described is now a throwaway worktree, not the review branch" \
  "qa/i30-faults-safety.sh F1's worktree / lock / porcelain assertions"
fi

if want S3; then
echo
echo "== S3 — RETIRED (round 75)"
retired "S3 two runs at once share state" \
  "the same wait_for_mutation; the hazard was a shared pristine snapshot of the real checkout" \
  "qa/i30-faults-safety.sh F2 — a second concurrent run is REFUSED loudly"
fi

if want S4; then
echo
echo "== S4 — a mutation target that is absent must be reported STALE"
# Make N3's and the standing guard's target disappear without changing behaviour.
node -e '
  const fs=require("node:fs"); const f=process.argv[1];
  const s=fs.readFileSync(f,"utf8");
  if(!s.includes("<span>{source}</span>")) process.exit(3);
  fs.writeFileSync(f, s.replace("<span>{source}</span>","<span>{ source }</span>"));
' "$PICKER" || { ok 1 "could not plant S4"; }
bash qa/i30-faults.sh > /tmp/r74-s4.log 2>&1
C=$?
grep -c 'MUTATION DID NOT APPLY' /tmp/r74-s4.log | sed 's/^/  note "MUTATION DID NOT APPLY" lines: /'
grep 'stale row' /tmp/r74-s4.log | sed 's/^/  note /'
[ "$C" -ne 0 ]; ok $? "i30-faults.sh exits non-zero when a mutation target is absent (exit=$C)"
pkill -f 'vite --port 51' 2>/dev/null
git checkout -- "$PICKER"
fi

if want S5; then
echo
echo "== S5 — a probe that never ran scores as \"the fault fired\""
# `i30-faults.sh`'s `probe()` decides a row by EXIT CODE alone. `i30-attribution.mjs` picks a
# random port in 5100-5499 with --strictPort and no retry, so an occupied port is a 90 s timeout
# and a non-zero exit with ZERO assertions run — which every `expect=red` row reads as a pass.
# Interrupting a run produces the same shape (exit 130, ok=0, FAIL=0); this row makes it
# deterministic without a signal.
node -e '
  const net = require("node:net");
  const servers = [];
  let left = 400;
  for (let p = 5100; p < 5500; p++) {
    const s = net.createServer(() => {});
    s.listen(p, "127.0.0.1", () => { if (--left === 0) console.log("ports 5100-5499 occupied"); });
    s.on("error", () => { if (--left === 0) console.log("ports occupied (some already in use)"); });
    servers.push(s);
  }
  setTimeout(() => process.exit(0), 150000);
' &
BLOCKER=$!
sleep 4
OUT="$(mktemp)"
node qa/i30-attribution.mjs > "$OUT" 2>&1
C=$?
OKS=$(grep -c '^  ok  ' "$OUT"); FL=$(grep -c '^  FAIL' "$OUT")
printf '   i30-attribution with no free port            exit=%s ok=%-3s FAIL=%-3s\n' "$C" "$OKS" "$FL"
tail -2 "$OUT" | sed 's/^/      /'
kill "$BLOCKER" 2>/dev/null
rm -f "$OUT"
if [ "$C" -ne 0 ] && [ "$OKS" -eq 0 ] && [ "$FL" -eq 0 ]; then
  printf '   note >>> probe() scores exit!=0 as "the fault fired". A row that measured NOTHING\n'
  printf '   note     is indistinguishable from a row that caught the fault. Gate 2 rests on it.\n'
  ok 1 "a run that never started is scored as a fired fault"
else
  ok 0 "a run that cannot start is distinguishable from a fired fault (exit=$C ok=$OKS FAIL=$FL)"
fi
fi

echo
[ "$FAIL" -eq 0 ] && echo "r74-faults-safety: all clear" || echo "r74-faults-safety: $FAIL FAILURE(S)"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
