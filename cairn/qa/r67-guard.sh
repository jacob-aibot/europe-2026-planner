#!/usr/bin/env bash
# QA round 67 — **KD-121: can the corpus-directory exemption hide a non-corpus file?**
#
# `storable.test.ts`'s *"there is nothing else under `packages/core/src`"* guard is load-bearing
# from the A-76…A-81 arc: it refuses any file under `packages/core/src` that is not a
# namespace-importable `.ts` module, with the comment *"An architect rules on this file; do not
# exclude it."* `I-23` scoped it to exempt `geo/gazetteer/`, paired with a positive assertion that
# every file there is a `.json` document the generated shard map names.
#
# Six plants, each in a throwaway `git worktree`, each asserting that it applied. RED = the guard
# fired = good. A GREEN plant is the finding.
#
#   bash qa/r67-guard.sh          (from cairn/)
#
# It never touches the live tree.
set -uo pipefail
cd "$(dirname "$0")/.."
CAIRN="$PWD"
ROOT="$(git rev-parse --show-toplevel)"
WT="$(mktemp -d)/r67-guard"
COMMIT="$(git rev-parse HEAD)"

cleanup() { git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true; }
trap cleanup EXIT
git -C "$ROOT" worktree add --detach "$WT" "$COMMIT" >/dev/null 2>&1 || { echo "worktree failed"; exit 1; }
W="$WT/cairn"
ln -s "$CAIRN/node_modules" "$W/node_modules" 2>/dev/null || true

pass=0; fail=0
run_guard() {
  ( cd "$W" && node --test packages/core/test/storable.test.ts 2>&1 ) | tail -40
}
guard_green() {
  ( cd "$W" && node --test packages/core/test/storable.test.ts >/dev/null 2>&1 )
}
reset_tree() { git -C "$W" checkout -- . >/dev/null 2>&1; git -C "$W" clean -fdq . >/dev/null 2>&1; }

check() { # name expected(RED|GREEN)
  local name="$1" expect="$2"
  if guard_green; then got=GREEN; else got=RED; fi
  if [ "$got" = "$expect" ]; then pass=$((pass+1)); echo "  ok   $name — $got"; else fail=$((fail+1)); echo "  FAIL $name — expected $expect, got $got"; fi
  reset_tree
}

echo "== control: the unmodified guard at $COMMIT"
check "C0  the guard is GREEN on the unmodified tree" GREEN

echo "== plants"
# M1 — a .d.ts inside the exempt directory, not named by the shard map.
echo 'export declare const backdoor: unknown;' > "$W/packages/core/src/geo/gazetteer/backdoor.d.ts"
test -f "$W/packages/core/src/geo/gazetteer/backdoor.d.ts" || { echo "M1 did not apply"; exit 1; }
check "M1  a .d.ts planted INSIDE geo/gazetteer/, unnamed by the map" RED

# M2 — control: the same file one directory up, where the exemption does not reach.
echo 'export declare const backdoor: unknown;' > "$W/packages/core/src/geo/backdoor.d.ts"
check "M2  control: the same .d.ts one directory UP" RED

# M3 — the same file, with its name written into the generated shard map's DOC COMMENT.
#      The positive assertion is a text `includes` over that file, not a parse of SHARDS.
echo 'export declare const backdoor: unknown;' > "$W/packages/core/src/geo/gazetteer/backdoor.d.ts"
python3 - "$W/packages/core/src/geo/gazetteerShards.gen.ts" <<'EOF'
import sys
p = sys.argv[1]
s = open(p).read()
old = " * The JSON documents are **not** TypeScript"
new = " * (see './gazetteer/backdoor.d.ts' for the declaration overlay)\n * The JSON documents are **not** TypeScript"
assert old in s, "M3 anchor missing"
open(p, 'w').write(s.replace(old, new, 1))
EOF
grep -q "backdoor.d.ts" "$W/packages/core/src/geo/gazetteerShards.gen.ts" || { echo "M3 did not apply"; exit 1; }
check "M3  the same .d.ts, its name added to the shard map's DOC COMMENT only" RED

# M4 — a .ts module in a subdirectory of the corpus.
mkdir -p "$W/packages/core/src/geo/gazetteer/sub"
echo 'export const x = 1;' > "$W/packages/core/src/geo/gazetteer/sub/evil.ts"
check "M4  a .ts module in a SUBDIRECTORY of the corpus" RED

# M5 — an unnamed .json document parked in the corpus.
echo '{"v":1,"k":"zz","s":"x","r":[]}' > "$W/packages/core/src/geo/gazetteer/parked.json"
check "M5  an unnamed .json document parked in the corpus" RED

# M7 — a NON-`.ts` executable module parked in the corpus, unnamed by the map.
#      `.d.ts` (M1/M3) is caught by the neighbouring `.ts` CENSUS, not by the exemption's own
#      assertion, so it does not test the exemption. `.mjs` is invisible to that census.
printf 'export const backdoor = () => globalThis;\n' > "$W/packages/core/src/geo/gazetteer/backdoor.mjs"
check "M7  a .mjs parked in the corpus, unnamed by the map" RED

# M8 — **the same .mjs, with its name written into the shard map's DOC COMMENT.**
#      The positive assertion is `shardMap.includes("'./gazetteer/<name>'")` — a substring test
#      over the generated file's TEXT, not a check against the shard map's key set. Any name
#      mentioned anywhere in that file legalises a file of that name in the exempt directory.
printf 'export const backdoor = () => globalThis;\n' > "$W/packages/core/src/geo/gazetteer/backdoor.mjs"
python3 - "$W/packages/core/src/geo/gazetteerShards.gen.ts" <<'EOF'
import sys
p = sys.argv[1]
s = open(p).read()
old = " * The JSON documents are **not** TypeScript"
new = " * (see './gazetteer/backdoor.mjs' for the loader shim)\n" + old
assert old in s, "M8 anchor missing"
open(p, 'w').write(s.replace(old, new, 1))
EOF
grep -q "backdoor.mjs" "$W/packages/core/src/geo/gazetteerShards.gen.ts" || { echo "M8 did not apply"; exit 1; }
check "M8  the same .mjs, its name in the shard map's DOC COMMENT — THE FINDING if GREEN" RED

# M6 — a shard the map imports, DELETED. Does anything notice?
rm "$W/packages/core/src/geo/gazetteer/zz.json"
check "M6  a shard the map imports, deleted (storable.test.ts alone)" GREEN
echo "     ^ M6 is expected GREEN here — the guard walks what EXISTS. The load-side check is:"
( cd "$W" && rm -f packages/core/src/geo/gazetteer/zz.json && node --test packages/core/test/gazetteer.test.ts 2>&1 | grep -E '^# (pass|fail)' | sed 's/^/     /' )
reset_tree

echo ""
echo "$pass ok, $fail FAIL"
