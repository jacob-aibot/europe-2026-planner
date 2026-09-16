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
#   S0  the worktree claim, measured rather than accepted
#   S1  SIGINT mid-mutation           — the EXIT/INT/TERM trap must restore the tree
#   S2  SIGKILL mid-mutation          — the residue, stated (no trap can fire)
#   S3  two runs at once              — run B snapshots run A's mutation as its own "pristine"
#   S4  a mutation target that is absent — must be reported stale, not skipped silently
#
# S2 and S3 deliberately leave the tree mutated and then restore it with `git checkout --`, so
# this script REFUSES to start unless the three files it can touch are clean.
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

WANT=("$@"); [ ${#WANT[@]} -eq 0 ] && WANT=(S0 S1 S2 S3 S4 S5)
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

if want S0; then
echo "== S0 — the worktree claim, MEASURED rather than accepted"
# `i30-faults.sh` lines 23-26 justify mutating the real checkout with: *a worktree's
# `node_modules/@cairn/core` symlink resolves back to the MAIN checkout's `packages/core`, so a
# worktree mutation of `meta.json` would not be the file the dev server serves.* This row builds
# that worktree, mutates ONLY its `meta.json`, and reads the rendered credit out of Chromium.
WTROOT="$(mktemp -d)"; WT="$WTROOT/wt"
ROOT="$(cd "$CAIRN/.." && pwd)"
PORT="${R74_WT_PORT:-5401}"
git -C "$ROOT" worktree add --detach "$WT" HEAD >/dev/null 2>&1
if [ -d "$WT/cairn" ]; then
  ln -s "$CAIRN/node_modules" "$WT/cairn/node_modules"
  ln -s "$CAIRN/apps/web/node_modules" "$WT/cairn/apps/web/node_modules"
  ( cd "$WT/cairn" && node tools/gen-sample.mjs >/dev/null 2>&1 )   # `npm run dev`'s presample step
  node -e '
    const fs=require("node:fs");const f=process.argv[1];
    const s=fs.readFileSync(f,"utf8");
    const a=String.fromCharCode(34)+"$source"+String.fromCharCode(34)+":"+String.fromCharCode(34)+"GeoNames geographical database";
    const at=s.indexOf(a); if(at<0) process.exit(3);
    fs.writeFileSync(f, s.slice(0,at)+a+" WORKTREE-ONLY-TOKEN"+s.slice(at+a.length));
  ' "$WT/cairn/packages/core/src/geo/gazetteer/meta.json"
  [ -z "$(git -C "$ROOT" status --porcelain -- cairn/packages/core/src/geo/gazetteer/meta.json)" ]
  ok $? "the worktree mutation leaves THIS checkout's meta.json byte-identical"
  ( cd "$WT/cairn/apps/web" && setsid npx vite --port "$PORT" --host 127.0.0.1 --strictPort >/tmp/r74-wtvite.log 2>&1 & )
  sleep 20
  node -e '
    const pw = require("/opt/node22/lib/node_modules/playwright/index.js");
    (async () => {
      const b = await pw.chromium.launch();
      const p = await (await b.newContext()).newPage();
      await p.route("**tile.openstreetmap.org/**", (r) => r.abort());
      await p.goto("http://127.0.0.1:" + process.argv[1] + "/", { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(2500);
      await p.getByRole("button", { name: /Add somewhere I.ve been/i }).first().click();
      await p.waitForTimeout(3000);
      const t = await p.getByTestId("gazetteer-attribution").first().innerText();
      console.log("  note worktree server rendered: " + JSON.stringify(t.slice(0, 80)));
      await b.close();
      process.exit(t.includes("WORKTREE-ONLY-TOKEN") ? 0 : 1);
    })().catch((e) => { console.log("  note " + String(e).slice(0,120)); process.exit(2); });
  ' "$PORT"
  W=$?
  if [ "$W" -eq 0 ]; then
    printf '  note >>> the worktree dev server SERVES THE WORKTREE'"'"'S meta.json. vite.config.ts\n'
    printf '  note     aliases @cairn/core/gazetteer to resolve(import.meta.dirname, "../../packages/\n'
    printf '  note     core/src/geo/gazetteerShards.gen.ts") — a path relative to the CONFIG FILE, so\n'
    printf '  note     the node_modules/@cairn/core workspace link is never consulted for it.\n'
    ok 1 "the stated reason for mutating the real checkout does NOT hold"
  else
    ok 0 "the worktree server ignored the worktree meta.json (the stated reason holds)"
  fi
  pkill -f "vite --port $PORT" 2>/dev/null
  git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1
  rm -rf "$WTROOT"; git -C "$ROOT" worktree prune
else
  printf '  note could not create a worktree; S0 unmeasured\n'
fi
fi

# Start `i30-faults.sh` in its OWN session and record the session's pgid, so a signal can be
# sent to the WHOLE group — which is what Ctrl-C at a terminal does, and the only thing that
# reaches the `node` child the script is blocked on.
PGFILE="$(mktemp)"
start_faults() {
  setsid bash -c 'echo $$ > "$1"; exec bash qa/i30-faults.sh' _ "$PGFILE" > "$2" 2>&1 &
  for _ in $(seq 1 30); do [ -s "$PGFILE" ] && break; sleep 1; done
  cat "$PGFILE"
}

if want S1; then
echo
echo "== S1 — SIGINT to the whole group mid-mutation (what Ctrl-C does)"
: > "$PGFILE"
PG="$(start_faults "$PGFILE" /tmp/r74-s1.log)"
printf '  note i30-faults.sh session pgid=%s\n' "$PG"
if wait_for_mutation; then
  printf '  note mutation on disk: %s\n' "$(git status --porcelain -- "$PICKER" "$META" | tr '\n' ' ')"
  kill -INT -"$PG" 2>/dev/null
  for _ in $(seq 1 60); do kill -0 -"$PG" 2>/dev/null || break; sleep 1; done
  sleep 3
  D="$(git status --porcelain -- "$PICKER" "$META" "$UNAUTH")"
  [ -z "$D" ]; ok $? "after SIGINT the tree is clean (the EXIT/INT trap restored it)  ${D:+[$D]}"
  V="$(pgrep -f 'vite --port 5' | wc -l)"
  [ "$V" -eq 0 ]; ok $? "no orphaned vite dev server survives the interrupt (found $V)"
else
  ok 1 "no mutation appeared within 240 s — S1 unmeasured"
fi
pkill -f 'vite --port 5' 2>/dev/null
kill -9 -"$PG" 2>/dev/null
sleep 2
git checkout -- "$PICKER" "$META" "$UNAUTH" 2>/dev/null
fi

if want S2; then
echo
echo "== S2 — SIGKILL to the whole group mid-mutation: the residue, stated"
: > "$PGFILE"
PG="$(start_faults "$PGFILE" /tmp/r74-s2.log)"
if wait_for_mutation; then
  kill -KILL -"$PG" 2>/dev/null
  sleep 3
  D="$(git status --porcelain -- "$PICKER" "$META" "$UNAUTH" | tr '\n' ' ')"
  printf '  note after SIGKILL the tree is: %s\n' "${D:-clean}"
  if [ -n "$D" ]; then
    printf '  note >>> a hard kill leaves the CHECKOUT mutated — no trap can cover SIGKILL, and\n'
    printf '  note     the surviving edit is a hard-coded credit or a re-pinned CORPUS BYTE on\n'
    printf '  note     the branch being reviewed. The pristine copies are in a mktemp dir nobody\n'
    printf '  note     will find. Recovery is `git checkout --`, which is not stated anywhere.\n'
  fi
  pkill -f 'vite --port 5' 2>/dev/null
  git checkout -- "$PICKER" "$META" "$UNAUTH"
  [ -z "$(git status --porcelain -- "$PICKER" "$META" "$UNAUTH")" ]; ok $? "restored by hand afterwards (git checkout --)"
else
  ok 1 "no mutation appeared within 240 s — S2 unmeasured"
fi
fi

if want S3; then
echo
echo "== S3 — two runs at once: run B snapshots run A's mutation as its own pristine copy"
: > "$PGFILE"
PG="$(start_faults "$PGFILE" /tmp/r74-s3.log)"
if wait_for_mutation; then
  # i30-faults.sh line 40, verbatim, is `cp "$f" "$TMP/orig/$f"` — this is a second run doing it.
  B="$(mktemp -d)"
  cp "$PICKER" "$B/picker"; cp "$META" "$B/meta"
  printf '  note run B took its "pristine" copies while run A had a mutation on disk\n'
  kill -INT -"$PG" 2>/dev/null
  for _ in $(seq 1 60); do kill -0 -"$PG" 2>/dev/null || break; sleep 1; done
  sleep 3
  pkill -f 'vite --port 5' 2>/dev/null; kill -9 -"$PG" 2>/dev/null
  [ -z "$(git status --porcelain -- "$PICKER" "$META")" ]; ok $? "run A restored the tree on its way out"
  # Run B's own EXIT trap now fires, restoring from the copies it took.
  cp "$B/picker" "$PICKER"; cp "$B/meta" "$META"
  D="$(git status --porcelain -- "$PICKER" "$META" | tr '\n' ' ')"
  if [ -n "$D" ]; then
    printf '  note >>> run B'"'"'s restore RE-APPLIED run A'"'"'s mutation: %s\n' "$D"
    printf '  note     and run B'"'"'s closing "byte-identical to how this script found it" check\n'
    printf '  note     PASSES, because it compares against the copy taken mid-mutation.\n'
    ok 0 "the concurrent-run hazard reproduces: a mutation survives and the self-check stays green"
  else
    ok 1 "could not reproduce the concurrent-run hazard on this timing"
  fi
  rm -rf "$B"
  git checkout -- "$PICKER" "$META"
else
  ok 1 "no mutation appeared within 240 s — S3 unmeasured"
fi
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
