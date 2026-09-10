#!/usr/bin/env bash
# QA round 69 — **can the corpus still move without passing a witness?**
#
# `I-32` / §8.4 A-94 gave the corpus two new guards and moved a third:
#   * Part 10's **named-set gate** — the generator stops and reports, writing nothing, if the
#     row-level diff reaches outside the eight rows A-94 commits by GeoNames id;
#   * Part 6's **manifest golden** — one sha256, byte length and row count per corpus document,
#     recomputed from disk by an offline test;
#   * Part 5's **prefix witness** — the source log's history as a literal in `packages/core/test/`,
#     which the generator does not write.
#
# This attacks what each one does NOT see.
#
#   bash qa/r69-gate.sh                  # cheap sections B..E (~4 min: two suite runs)
#   CAIRN_R69_GEN=1 bash qa/r69-gate.sh  # + A, one real generator run (~8 min, 625 MB)
#
# Same discipline as `qa/r68-repin.sh`: every mutation happens in a throwaway `git worktree` with a
# COPIED `node_modules`, and it aborts unless `@cairn/core` resolves inside the worktree. It never
# writes to the live tree.
set -uo pipefail
cd "$(dirname "$0")/.."
CAIRN="$PWD"
ROOT="$(git rev-parse --show-toplevel)"
COMMIT="$(git rev-parse HEAD)"
WT="$(mktemp -d)/r69"
CACHE="${CAIRN_GAZETTEER_CACHE:-/tmp/cairn-gazetteer-src}"

cleanup() { git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true; }
trap cleanup EXIT
git -C "$ROOT" worktree add --detach "$WT" "$COMMIT" >/dev/null 2>&1 || { echo "worktree failed"; exit 1; }
W="$WT/cairn"
cp -r "$CAIRN/node_modules" "$W/node_modules"
readlink "$W/node_modules/@cairn/core" | grep -q '^\.\.' || { echo "ABORT: @cairn/core does not resolve inside the worktree"; exit 1; }

pass=0; fail=0
ok()   { pass=$((pass+1)); echo "  ok   $*"; }
bad()  { fail=$((fail+1)); echo "  FAIL $*"; }
note() { echo "  note $*"; }
reset_tree() { git -C "$W" checkout -- . >/dev/null 2>&1; git -C "$W" clean -fdq -- packages fixtures >/dev/null 2>&1; }
artefact_green() { ( cd "$W" && node --test packages/core/test/gazetteerArtefact.test.ts >/tmp/r69-art.tap 2>&1 ); grep -q '^# fail 0$' /tmp/r69-art.tap; }
election_green() { ( cd "$W" && node --test packages/core/test/gazetteerElection.test.ts >/tmp/r69-elec.tap 2>&1 ); grep -q '^# fail 0$' /tmp/r69-elec.tap; }
suite_green() { ( cd "$W" && npm run test:tap >/tmp/r69-suite.tap 2>&1 ); grep -q '^# fail 0$' /tmp/r69-suite.tap; }

echo "== A  the named-set gate and A-90 clause 3's row diff FAIL OPEN on an unreadable previous corpus"
# `corpusDiff()` wraps `readCommittedCorpus()` in `catch { return null }`, and `gateNamedSet(null)`
# returns immediately. `decodeAll` throws if any shard's `s` disagrees with meta.json's
# `$sourceSha256` — so ONE hand-edited byte in ONE shard turns both of A-94 Part 10's and A-90
# clause 3's ship gates into no-ops, and the run still writes the corpus.
if [ "${CAIRN_R69_GEN:-0}" = "1" ]; then
  python3 - "$W/packages/core/src/geo/gazetteer/zw.json" <<'PY'
import json,sys,os
p=sys.argv[1]
if not os.path.exists(p):
    import glob; p=sorted(glob.glob(os.path.dirname(p)+'/*.json'))[-1]
d=json.load(open(p)); d['s']='0'*64
json.dump(d,open(p,'w'),separators=(',',':'))
print(f"  note planted: {os.path.basename(p)} carries a $sourceSha256 meta.json does not")
PY
  ( cd "$W" && CAIRN_GAZETTEER_CACHE="$CACHE" node tools/gen-gazetteer.mjs >/tmp/r69-gen.log 2>&1 )
  st=$?
  note "generator exited $st"
  if grep -q 'A-94 Part 10 — the named set' /tmp/r69-gen.log; then
    ok "A1  the named-set gate ran"
  else
    bad "A1  the named-set gate DID NOT RUN — one edited shard byte disabled A-94 Part 10 entirely"
  fi
  if grep -q 'no previously committed corpus to diff against' /tmp/r69-gen.log; then
    bad "A2  the run reported 'first build' over a 963-document corpus and published NO row diff"
  else
    ok "A2  a row-level diff was published"
  fi
  if [ -f "$W/packages/core/src/geo/gazetteer/meta.json" ] && grep -q 'wrote fixtures/golden/gazetteer-manifest.json' /tmp/r69-gen.log; then
    bad "A3  and it WROTE the corpus anyway — an ungated write to the artefact of record"
  else
    ok "A3  the run wrote nothing"
  fi
  grep -E 'corpus diff|named set|rows refused|stop' /tmp/r69-gen.log | head -8 | sed 's/^/  note /'
  reset_tree
else
  note "SKIPPED — needs one real generator run (CAIRN_R69_GEN=1)"
fi

echo ""
echo "== B  the manifest covers *.json only, so the corpus directory is not what it audits"
cp "$W/qa/corpus.mjs" "$W/packages/core/src/geo/gazetteer/loader.mjs"
if artefact_green; then
  bad "B1  an unrelated .mjs planted INSIDE the corpus directory is invisible to the manifest"
else
  ok "B1  the manifest sees a non-.json file in the corpus directory"
fi
reset_tree
# The control: a planted .json IS seen, so B1 is about the filter and not about the test.
echo '{"k":"zz","s":"0","r":[]}' > "$W/packages/core/src/geo/gazetteer/r69probe.json"
if artefact_green; then bad "B2  control: a planted .json shard is invisible too"; else ok "B2  control: a planted .json shard reddens the manifest"; fi
reset_tree

echo ""
echo "== C  the prefix witness pins three fields of five"
python3 - "$W/fixtures/golden/gazetteer-source-log.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p))
d['entries'][0]['bytes']=1
d['entries'][0]['previousSha256']='f'*64
json.dump(d,open(p,'w'),indent=2)
PY
if artefact_green; then
  bad "C1  bytes and previousSha256 can be rewritten in the committed history with every test green"
else
  ok "C1  the witness sees a rewritten bytes/previousSha256"
fi
reset_tree
# C2 — append a fabricated entry AFTER the pinned prefix, for a source already at that sha.
python3 - "$W/fixtures/golden/gazetteer-source-log.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p))
e=[x for x in d['entries'] if x['source']=='admin0'][0]
n=dict(e); n['fetched']='2099-01-01'; n['previousSha256']=None
d['entries'].append(n)
json.dump(d,open(p,'w'),indent=2)
PY
if artefact_green; then
  bad "C2  a fabricated entry appended after the prefix is GREEN — the witness pins the past, and nothing pins the present"
else
  ok "C2  a fabricated appended entry reddens"
fi
reset_tree

echo ""
echo "== D  A-94 Part 9 fault 3 — invert the tie-break; the ruling says the published tally catches it"
python3 - "$W/packages/core/test/gazetteerElection.test.ts" "$W/tools/gen-gazetteer.mjs" <<'PY'
import sys
for p in sys.argv[1:]:
    s=open(p).read()
    n=s.replace("b[1] - a[1] || (a[0] < b[0] ? -1 : 1)","b[1] - a[1] || (a[0] < b[0] ? 1 : -1)")
    print(f"  note {p.split('/')[-1]}: {'patched' if n!=s else 'NO SITE FOUND'}")
    open(p,'w').write(n)
PY
if election_green; then
  bad "D1  the tie-break is inverted in BOTH the generator and the re-derivation and every election test is GREEN"
else
  ok "D1  inverting the tie-break reddens"
fi
reset_tree

echo ""
echo "== E  the whole suite, under D's mutation — is anything at all pinning the tie-break?"
python3 - "$W/packages/core/test/gazetteerElection.test.ts" "$W/tools/gen-gazetteer.mjs" <<'PY'
import sys
for p in sys.argv[1:]:
    s=open(p).read()
    open(p,'w').write(s.replace("b[1] - a[1] || (a[0] < b[0] ? -1 : 1)","b[1] - a[1] || (a[0] < b[0] ? 1 : -1)"))
PY
if suite_green; then
  bad "E1  all 1,880 tests pass with A-94 Part 2's tie-break rule inverted in the generator"
else
  ok "E1  some test pins the tie-break"
  grep '^not ok' /tmp/r69-suite.tap | head -5 | sed 's/^/  note /'
fi
reset_tree

echo ""
echo "== F  A-94 Part 5 clause 3's pin is a GREP over the generator's source (the weakness KD-127 names)"
# The test counts /^\s*(?:if \(repin\) )?writeSourceLog\(/gm and asserts the count is 1. A second
# call that does not START a line is invisible to both halves of it.
python3 - "$W/tools/gen-gazetteer.mjs" <<'PY2'
import sys
p=sys.argv[1]; s=open(p).read()
old="  if (repin) writeSourceLog(sourceLog, fetched, moved);"
new="  if (repin) writeSourceLog(sourceLog, fetched, moved); else writeSourceLog(sourceLog, fetched, []);"
assert old in s, "site not found"
open(p,'w').write(s.replace(old,new))
PY2
if artefact_green; then
  bad "F1  the ordinary path writes the source log again and A-94 Part 5 clause 3's pin is GREEN"
else
  ok "F1  the re-introduced ordinary-path write reddens"
fi
reset_tree

echo ""
echo "== G  a --repin that appends nothing still rewrites the log — is the rewrite a no-op?"
node "$CAIRN/qa/r69-repin-noop.mjs" "$W" && pass=$((pass+1)) || fail=$((fail+1))

echo ""
echo "  $pass ok, $fail FAIL"
