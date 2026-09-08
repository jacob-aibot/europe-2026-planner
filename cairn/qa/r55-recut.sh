#!/usr/bin/env bash
# QA round 55 (I-15 / §2.1 A-76) — R55-6's seven re-cut probes, each run from the directory it
# needs. `p2b-gate.mjs` reads `packages/core/src` RELATIVELY and must be run from `cairn/`; the
# other six are `qa/`-relative. That difference is why `p2b-gate`'s abort was invisible to a
# `qa/`-relative board sweep, and it is recorded here rather than fixed, because the probe's own
# path assumption is round 2b's and not this round's to move.
#
#   bash cairn/qa/r55-recut.sh
#
# Expected after the re-cut (each is that probe's OWN baseline, unchanged by I-15):
#   r54-integration  0 FAIL, COMPLETE
#   r54-gate         3 FAIL  (the three criterion-as-written rows ROADMAP revision 60 corrected)
#   r52-participants 1 FAIL  (R53-1 — I-9c, queued and unbuilt)
#   r16-copy-depth   1 FAIL  (the stale `76` export pin — R53-3's class)
#   r21-closure      2 FAIL  (the same pin, plus R21-1's disclosed class-A instance)
#   i6-summary       1 FAIL  (the round-26 SUMMARY_VERSION pin — R53-3's class)
#   p2b-gate         5 FAIL  (round 2b's own findings, byte-identical to `fd07340`)
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAIRN="$(dirname "$HERE")"
run() { # run <cwd> <script>
  echo "=== $2 (from $(basename "$1"))"
  ( cd "$1" && node --experimental-strip-types "$2" 2>&1 | tail -n 4 )
}
run "$HERE"  r54-integration.mjs
run "$HERE"  r54-gate.mjs
run "$HERE"  r52-participants.mjs
run "$HERE"  r16-copy-depth.mjs
run "$HERE"  r21-closure.mjs
run "$HERE"  i6-summary.mjs
run "$CAIRN" qa/p2b-gate.mjs
