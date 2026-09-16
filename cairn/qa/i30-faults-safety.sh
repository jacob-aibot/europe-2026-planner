#!/usr/bin/env bash
# **The guard rails of `qa/i30-faults.sh`, after QA round 74 — measured, not asserted.**
#
#   bash cairn/qa/i30-faults-safety.sh [F1 F2 F3]      (default: all)
#
# Round 74 attacked `i30-faults.sh` with `qa/r74-faults-safety.sh`, whose rows S1, S2 and S3 all
# begin by waiting for a mutation to appear in **this checkout's** `git status`. After R74-4 no
# mutation ever appears there — every row runs inside a throwaway worktree — so those three rows
# now time out and report *unmeasured*, which is the correct reading of a hazard that no longer
# has a surface, and is **not** evidence that the two defects underneath them were fixed.
#
# This file is that evidence:
#
#   F1  SIGTERM to the whole group   — the trap must STOP the run (R74-1), take the worktree with
#                                      it, release the lock and leave this checkout untouched
#   F2  a second run while one runs  — must be REFUSED loudly, not quietly share state (R74-7)
#   F3  SIGINT to the whole group    — **the case a trap cannot cover.** POSIX starts an
#                                      asynchronous command with SIGINT ignored, and an
#                                      ignored-on-entry signal cannot be trapped, so the `INT`
#                                      trap is never installed in this launch. The run must stop
#                                      anyway, at the end of the row the interrupt landed in, and
#                                      must never reach its own success line.
#
# S0's and S5's subjects are measured elsewhere and deliberately not duplicated: the worktree's
# isolation is asserted by `i30-faults.sh` itself on every run, and `r74-faults-safety.sh` S5
# reads the port fix directly.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
cd "$CAIRN" || exit 1
ROOT="$(git -C "$CAIRN" rev-parse --show-toplevel)"
LOCK="${TMPDIR:-/tmp}/cairn-i30-faults.$(printf '%s' "$CAIRN" | cksum | cut -d' ' -f1).lock"

WANT=("$@"); [ ${#WANT[@]} -eq 0 ] && WANT=(F1 F2 F3)
want() { for w in "${WANT[@]}"; do [ "$w" = "$1" ] && return 0; done; return 1; }
FAIL=0
ok() { if [ "$1" = 0 ]; then printf '  ok   %s\n' "$2"; else printf '  FAIL %s\n' "$2"; FAIL=$((FAIL+1)); fi; }

STATUS_BEFORE="$(git -C "$ROOT" status --porcelain -- cairn)"
WT_BEFORE="$(git -C "$ROOT" worktree list | wc -l)"

PGFILE="$(mktemp)"
start_faults() { # logfile -> prints the session pgid
  : > "$PGFILE"
  setsid bash -c 'echo $$ > "$1"; exec bash qa/i30-faults.sh' _ "$PGFILE" > "$1" 2>&1 &
  for _ in $(seq 1 30); do [ -s "$PGFILE" ] && break; sleep 1; done
  cat "$PGFILE"
}
wait_for_lock() { for _ in $(seq 1 90); do [ -e "$LOCK/pid" ] && return 0; sleep 1; done; return 1; }
wait_for_row() { for _ in $(seq 1 240); do grep -q 'baseline' "$1" && return 0; sleep 1; done; return 1; }

# What every interrupt row must be able to say afterwards.
after_stop() { # log, signal-name
  local log="$1" sig="$2"
  local L1 L2
  L1="$(wc -c < "$log")"; sleep 15; L2="$(wc -c < "$log")"
  [ "$L1" = "$L2" ]; ok $? "$sig: no further output — execution did not resume ($L1 → $L2 bytes)"
  grep -q 'every fault fired' "$log"; [ $? -ne 0 ]; ok $? "$sig: the run did NOT reach its own success line"
  [ "$(git -C "$ROOT" worktree list | wc -l)" = "$WT_BEFORE" ]; ok $? "$sig: the throwaway worktree was removed on the way out"
  [ ! -e "$LOCK/pid" ]; ok $? "$sig: the lock was released on the way out"
  [ "$(git -C "$ROOT" status --porcelain -- cairn)" = "$STATUS_BEFORE" ]; ok $? "$sig: this checkout is exactly as it was"
}

interrupt_row() { # signal-name, log
  local sig="$1" log="$2" PG
  PG="$(start_faults "$log")"
  printf '  note i30-faults.sh session pgid=%s\n' "$PG"
  if wait_for_row "$log"; then
    sleep 12   # into the baseline probe, not into setup
    kill -s "$sig" -"$PG" 2>/dev/null
    for _ in $(seq 1 180); do kill -0 -"$PG" 2>/dev/null || break; sleep 1; done
    sleep 3
    kill -0 -"$PG" 2>/dev/null; [ $? -ne 0 ]; ok $? "$sig: the process group is GONE (it used to carry on to the next row)"
    after_stop "$log" "$sig"
  else
    ok 1 "$sig: the run never reached a row within 240 s — unmeasured"
  fi
  kill -9 -"$PG" 2>/dev/null
  sleep 2
  git -C "$ROOT" worktree prune
}

if want F1; then
echo "== F1 — SIGTERM to the whole group: the trap must stop the run (R74-1)"
interrupt_row TERM /tmp/i30-faults-safety-f1.log
grep -q 'interrupted (TERM)' /tmp/i30-faults-safety-f1.log; ok $? "TERM: the handler ran and said so"
fi

if want F2; then
echo
echo "== F2 — a second run while one is running must be REFUSED, loudly (R74-7)"
LOG=/tmp/i30-faults-safety-f2.log
PG="$(start_faults "$LOG")"
if wait_for_lock; then
  OUT="$(bash qa/i30-faults.sh 2>&1)"; C=$?
  wait_for_row "$LOG" || true   # let run A finish building its worktree before signalling it
  printf '%s\n' "$OUT" | head -4 | sed 's/^/      /'
  [ "$C" -eq 2 ]; ok $? "the second run exits 2 rather than starting (exit=$C)"
  printf '%s' "$OUT" | grep -q 'REFUSING'; ok $? "it says REFUSING and names the running pid"
  printf '%s' "$OUT" | grep -q 'R74-7'; ok $? "it names the finding, so the next reader knows why"
else
  ok 1 "the first run never took its lock — F2 unmeasured"
fi
kill -s TERM -"$PG" 2>/dev/null
for _ in $(seq 1 180); do kill -0 -"$PG" 2>/dev/null || break; sleep 1; done
kill -9 -"$PG" 2>/dev/null
sleep 2
git -C "$ROOT" worktree prune
fi

if want F3; then
echo
echo "== F3 — SIGINT, in the launch where a trap CANNOT be installed (R74-1's own repro shape)"
echo "   POSIX: an asynchronous command starts with SIGINT ignored, and an ignored-on-entry"
echo "   signal cannot be trapped. The run must stop anyway, at the end of its current row."
interrupt_row INT /tmp/i30-faults-safety-f3.log
grep -q 'SIGINT was ignored when this shell started' /tmp/i30-faults-safety-f3.log
ok $? "INT: the script SAYS Ctrl-C is invisible in this launch rather than implying a trap"
grep -q 'ABORTING' /tmp/i30-faults-safety-f3.log
ok $? "INT: the run aborted at a row boundary rather than measuring the remaining rows"
fi

echo
[ "$FAIL" -eq 0 ] && echo "i30-faults-safety: all clear" || echo "i30-faults-safety: $FAIL FAILURE(S)"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
