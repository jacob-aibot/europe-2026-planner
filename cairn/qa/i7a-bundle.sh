#!/usr/bin/env bash
# QA round 29 — I-7a: **the +416-byte bundle delta, bisected rather than reasoned about.**
#
#   Run: bash qa/i7a-bundle.sh          (from cairn/)
#
# BUILD-NOTES I-7a "What I could not verify" item 2: *"the +416-byte bundle delta is attributed
# by reasoning, not by bisection … the cause is A-32 rather than A-34: `derive/summary.ts` is in
# the bundle and its three date helpers grew … while **`travelStats` has no consumer in
# `apps/web` at all**."*
#
# The conclusion is right and the premise is wrong: `travelStats` IS in the bundle. It is
# re-exported from `packages/core/src/index.ts`, which `apps/web` imports as `@cairn/core`, and
# rolldown does not drop it — `grep -o travelStats dist/assets/*.js` is 2 and `provisional` is 6.
# So the delta is bisected here instead, by building four trees that differ only in which of the
# two changed core sources is at I-7 (`db9dc1d`) and which is at HEAD.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"
BASE=${BASE:-db9dc1d}

build() {
  local label="$1"; shift
  local wt; wt="$(mktemp -d)/wt"
  git -C "$REPO" worktree add --detach "$wt" HEAD >/dev/null 2>&1 || { echo "worktree failed"; return 1; }
  ln -s "$CAIRN/node_modules" "$wt/cairn/node_modules"
  for f in "$@"; do git -C "$wt" checkout "$BASE" -- "cairn/$f"; done
  ( cd "$wt/cairn" && node tools/gen-sample.mjs >/dev/null 2>&1 && npx vite build apps/web >/dev/null 2>&1 )
  printf '  %-44s %s bytes\n' "$label" "$(stat -c%s "$wt"/cairn/apps/web/dist/assets/index-*.js)"
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
}

printf '\n== the four builds ==\n'
build "HEAD (A-32 + the travelStats rewrite)"
build "A-32 reverted (summary.ts @ $BASE)"        packages/core/src/derive/summary.ts
build "travelStats reverted (@ $BASE)"            packages/core/src/derive/travelStats.ts
build "both reverted (= I-7 sources)"             packages/core/src/derive/summary.ts packages/core/src/derive/travelStats.ts

printf '\n== is travelStats in the bundle at all? ==\n'
( cd "$CAIRN" && ls apps/web/dist/assets/index-*.js >/dev/null 2>&1 || npx vite build apps/web >/dev/null 2>&1
  f=$(ls apps/web/dist/assets/index-*.js | head -1)
  printf '  %s\n' "$f"
  printf '  travelStats  x%s\n' "$(grep -o travelStats "$f" | wc -l)"
  printf '  provisional  x%s\n' "$(grep -o provisional "$f" | wc -l)" )
printf '\n== done ==\n'
