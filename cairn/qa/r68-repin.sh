#!/usr/bin/env bash
# QA round 68 — **A-90: can the corpus, or its provenance, change without `--repin`?**
#
# A-90 clause 1 makes `packages/core/src/geo/gazetteer/` the artefact of record; clause 3 makes
# `--repin` the only path from a checksum mismatch to a write, and requires an append-only source
# log plus a row-level diff in the same commit. This attacks the paths AROUND that: a hand-edited
# shard, a truncated log, a log that is missing when an ORDINARY regeneration runs, and the write
# itself.
#
#   bash qa/r68-repin.sh              # cheap sections B, C, E   (~4 min: C runs the suite once)
#   CAIRN_R68_GEN=1 bash qa/r68-repin.sh   # + A and D, which run the generator (~12 min, 625 MB)
#
# Every mutation happens in a throwaway `git worktree` with a COPIED `node_modules` (a symlinked
# one resolves `@cairn/core` back to the live tree — round 61 paid for that once). It never touches
# the live tree. Needs the cached pinned sources at $CAIRN_GAZETTEER_CACHE for A and D.
set -uo pipefail
cd "$(dirname "$0")/.."
CAIRN="$PWD"
ROOT="$(git rev-parse --show-toplevel)"
COMMIT="$(git rev-parse HEAD)"
WT="$(mktemp -d)/r68"
CACHE="${CAIRN_GAZETTEER_CACHE:-/tmp/cairn-gazetteer-src}"

cleanup() { git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true; }
trap cleanup EXIT
git -C "$ROOT" worktree add --detach "$WT" "$COMMIT" >/dev/null 2>&1 || { echo "worktree failed"; exit 1; }
W="$WT/cairn"
cp -r "$CAIRN/node_modules" "$W/node_modules"
node -e "process.chdir('$W'); require.resolve('@cairn/core/package.json')" 2>/dev/null
readlink "$W/node_modules/@cairn/core" | grep -q '^\.\.' || { echo "ABORT: @cairn/core does not resolve inside the worktree"; exit 1; }

pass=0; fail=0
ok()   { pass=$((pass+1)); echo "  ok   $*"; }
bad()  { fail=$((fail+1)); echo "  FAIL $*"; }
note() { echo "  note $*"; }
reset_tree() { git -C "$W" checkout -- . >/dev/null 2>&1; git -C "$W" clean -fdq -- packages fixtures >/dev/null 2>&1; }
suite_green() { ( cd "$W" && npm run test:tap >/tmp/r68-suite.tap 2>&1 ); grep -q '^# fail 0$' /tmp/r68-suite.tap; }
log_test_green() { ( cd "$W" && node --test packages/core/test/gazetteerMultiCountry.test.ts >/dev/null 2>&1 ); }

echo "== A  --dry-run: is it dry?   (set CAIRN_R68_GEN=1 to run — ~5 min)"
if [ "${CAIRN_R68_GEN:-0}" = "1" ]; then
  ( cd "$W" && CAIRN_GAZETTEER_CACHE="$CACHE" node tools/gen-gazetteer.mjs --dry-run >/tmp/r68-dry.log 2>&1 )
  if [ -z "$(git -C "$W" status --porcelain)" ]; then ok "A1  --dry-run wrote nothing (git status clean)"
  else bad "A1  --dry-run wrote: $(git -C "$W" status --porcelain | head -3)"; fi
  grep -q 'dry run — nothing written' /tmp/r68-dry.log && ok "A2  it says so" || bad "A2  no dry-run line"
  note "clause-4 audit from the run: $(grep -c '^    ' /tmp/r68-dry.log) detail lines"
  grep -E 'clause 4 — (rows kept|sovereign pairs|class-P)' /tmp/r68-dry.log | sed 's/^/  note /'
  reset_tree
else
  note "SKIPPED — this section needs a real generator run"
fi

echo ""
echo "== B  A-90 Part 5 residue 2 — the append-only chain, attacked in the two directions the test does not cover"
python3 - "$W/fixtures/golden/gazetteer-source-log.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p))
print(f"  note the COMMITTED log holds {len(d['entries'])} entries and "
      f"{sum(1 for e in d['entries'] if e['previousSha256'] is not None)} links")
PY
# B1 — plant a real 2-link chain, then drop the NEWEST entry. That is a truncation.
python3 - "$W/fixtures/golden/gazetteer-source-log.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p))
base=[e for e in d['entries'] if e['source']=='allCountries'][0]
prev=base['sha256']
for day,h in (('2026-09-11','b'*64),('2026-09-12','c'*64)):
    n=dict(base); n['fetched']=day; n['previousSha256']=prev; n['sha256']=h; prev=h
    d['entries'].append(n)
json.dump(d,open(p,'w'),indent=2)
PY
log_test_green && ok "B0  control: a genuine 3-entry chain is GREEN" || bad "B0  the planted chain is already RED"
python3 - "$W/fixtures/golden/gazetteer-source-log.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p)); d['entries']=d['entries'][:-1]; json.dump(d,open(p,'w'),indent=2)
PY
if log_test_green; then bad "B1  dropping the NEWEST entry (a truncation) is GREEN — the chain test cannot see it"
else ok "B1  a tail truncation reddens"; fi
# B2 — the middle link, which the test IS written for.
reset_tree
python3 - "$W/fixtures/golden/gazetteer-source-log.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p))
base=[e for e in d['entries'] if e['source']=='allCountries'][0]
prev=base['sha256']
for day,h in (('2026-09-11','b'*64),('2026-09-12','c'*64)):
    n=dict(base); n['fetched']=day; n['previousSha256']=prev; n['sha256']=h; prev=h
    d['entries'].append(n)
d['entries']=[e for e in d['entries'] if e.get('sha256')!='b'*64]      # remove the MIDDLE link
json.dump(d,open(p,'w'),indent=2)
PY
if log_test_green; then bad "B2  removing a MIDDLE link is GREEN"
else ok "B2  removing a middle link reddens — the mechanism works where it was aimed"; fi
# B3 — rewrite the whole file as heads-only. That is what regenerating the golden produces.
reset_tree
python3 - "$W/fixtures/golden/gazetteer-source-log.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p))
base=[e for e in d['entries'] if e['source']=='allCountries'][0]
prev=base['sha256']
for day,h in (('2026-09-11','b'*64),('2026-09-12','c'*64)):
    n=dict(base); n['fetched']=day; n['previousSha256']=prev; n['sha256']=h; prev=h
    d['entries'].append(n)
last={}
for e in d['entries']: last[e['source']]=e
d['entries']=[dict(e, previousSha256=None) for e in last.values()]
json.dump(d,open(p,'w'),indent=2)
PY
if log_test_green; then bad "B3  a full rewrite to heads-only (every link destroyed) is GREEN — R68-3"
else ok "B3  a heads-only rewrite reddens"; fi
reset_tree

echo ""
echo "== C  A-90 clause 1 — is the artefact of record checked against itself?"
# A length-preserving edit to a shipped row. The byte total is unchanged, the row count is
# unchanged, and the country code — the only field with a cross-check — is untouched.
python3 - "$W/packages/core/src/geo/gazetteer/sal.json" <<'PY'
import sys
p=sys.argv[1]; s=open(p,encoding='utf8').read()
i=s.find('"Salzburg|'); e=s.find('"', i+1)
f=s[i+1:e].split('|')
before='|'.join(f)
f[4]='z'          # population bucket h -> z  (2**35 people)
f[5]='a8t0'       # move the latitude, same width
after='|'.join(f)
assert len(after)==len(before)
open(p,'w',encoding='utf8').write(s[:i+1]+after+s[e:])
print(f"  note planted: {before}"); print(f"  note      ->  {after}")
PY
BYTES_NOW=$(python3 -c "import glob,os;print(sum(os.path.getsize(p) for p in glob.glob('$W/packages/core/src/geo/gazetteer/*.json')))")
note "corpus byte total after the edit: $BYTES_NOW"
( cd "$W" && node cli.ts cities salzburg 2>&1 | head -1 | sed 's/^/  note cli: /' )
if suite_green; then bad "C1  a length-preserving hand edit to a shipped row passes the whole suite — R68-4"
else bad_line=$(grep -m1 '^not ok' /tmp/r68-suite.tap); ok "C1  caught: $bad_line"; fi
reset_tree
# C2 — the control: the same edit to the COUNTRY CODE is caught, so the corpus is not unguarded.
python3 - "$W/packages/core/src/geo/gazetteer/sal.json" <<'PY'
import sys
p=sys.argv[1]; s=open(p,encoding='utf8').read()
i=s.find('"Salzburg|'); j=s.find('|AT|', i)
assert 0 < j-i < 40
open(p,'w',encoding='utf8').write(s[:j]+'|DE|'+s[j+4:])
PY
if suite_green; then bad "C2  control: a hand-edited COUNTRY CODE also passes — nothing guards the corpus at all"
else ok "C2  control: a hand-edited country code IS caught, by the indexSays cross-check"
     grep -m1 '^not ok' /tmp/r68-suite.tap | sed 's/^/       /'; fi
reset_tree

echo ""
echo "== D  the append-only log when it is MISSING and an ORDINARY regeneration runs"
if [ "${CAIRN_R68_GEN:-0}" = "1" ]; then
  rm "$W/fixtures/golden/gazetteer-source-log.json"
  ( cd "$W" && CAIRN_GAZETTEER_CACHE="$CACHE" node tools/gen-gazetteer.mjs >/tmp/r68-reseed.log 2>&1 )
  grep -q -- '--repin' /tmp/r68-reseed.log && note "the run mentions --repin" || note "no --repin in this run"
  line=$(grep 'gazetteer-source-log.json' /tmp/r68-reseed.log | head -1)
  note "$line"
  if echo "$line" | grep -q '5 appended'; then
    bad "D1  a run with NO --repin re-seeded the append-only log from scratch — R68-3"
  else ok "D1  the log was not re-seeded"; fi
  if [ -z "$(git -C "$W" status --porcelain -- packages/core/src/geo/gazetteer)" ]; then
    ok "D2  the regenerated corpus is byte-identical to the committed one (A-90 clause 4, re-run)"
  else bad "D2  the regeneration moved the corpus: $(git -C "$W" status --porcelain -- packages/core/src/geo/gazetteer | wc -l) files"; fi
  reset_tree
else
  note "SKIPPED — this section needs a real generator run"
fi

echo ""
echo "== E  the write itself"
if grep -q 'rmSync(join(CORPUS_DIR, name))' "$W/tools/gen-gazetteer.mjs"; then
  note "write() deletes every .json in the corpus directory and THEN writes 963 documents;"
  note "there is no temp directory and no rename, so an interrupted run leaves a partial corpus."
  ok "E1  the non-atomic write is present and is recoverable only from git — recorded, not asserted away"
else bad "E1  the rm-then-write loop moved; re-read write()"; fi
if grep -q "writeSourceLog(fetched, moved);" "$W/tools/gen-gazetteer.mjs" \
   && ! grep -q "if (flag('repin')) writeSourceLog" "$W/tools/gen-gazetteer.mjs"; then
  ok "E2  writeSourceLog runs on EVERY write, not only on --repin (the code path behind D1)"
else bad "E2  writeSourceLog is gated after all; re-read main()"; fi
grep -n "log.entries.length === 0" "$W/tools/gen-gazetteer.mjs" | sed 's/^/  note gen-gazetteer.mjs:/'

echo ""
echo "== F  A-93 Part 7 fault 3, RUN — the class restriction dropped, four characters"
if [ "${CAIRN_R68_GEN:-0}" = "1" ]; then
  # A-93 Part 7 fault 3 is "drop the class restriction — run clause 4 over class P too", and it
  # states the refusal count goes "16 -> 169". 169 is A-89's PRE-CLASS count; with the sovereign
  # subtraction still in place the number is smaller. This runs the fault end to end rather than
  # arguing about it: one boolean in front of the class test, which is the four characters the
  # ruling says a future builder will re-derive.
  python3 - "$W/tools/gen-gazetteer.mjs" <<'FAULT3'
import sys
p = sys.argv[1]
s = open(p, encoding='utf8').read()
old = "    if (r.cls === 'P') {\n      const a89 = r.cc2.filter"
new = "    if (false && r.cls === 'P') {\n      const a89 = r.cc2.filter"
assert old in s, 'F: the class-restriction anchor moved'
open(p, 'w', encoding='utf8').write(s.replace(old, new, 1))
FAULT3
  if grep -q "if (false && r.cls === 'P')" "$W/tools/gen-gazetteer.mjs"; then
    ( cd "$W" && CAIRN_GAZETTEER_CACHE="$CACHE" node tools/gen-gazetteer.mjs >/tmp/r68-fault3.log 2>&1 )
    n=$(sed -n 's/.*A-93 Part 2).*[^0-9]\([0-9][0-9]*\) rows refused.*/\1/p' /tmp/r68-fault3.log)
    note "the generator itself reports: $n rows refused under fault 3"
    if [ "$n" = "102" ]; then ok "F1  fault 3 refuses 102, not 169 — A-93 Part 7 fault 3's arithmetic is wrong"
    else bad "F1  expected 102 under fault 3, generator says $n"; fi
    if grep -q 'Vatican City (6691831)' /tmp/r68-fault3.log; then ok "F2  Vatican City IS among them — the fault's stated EFFECT stands"
    else bad "F2  Vatican City is not refused under fault 3"; fi
    if grep -q 'Tórshavn' /tmp/r68-fault3.log; then bad "F3  Tórshavn is refused too"
    else ok "F3  Tórshavn is NOT — FO->DK is subtracted, which is what makes 169 too big"; fi
    if grep -q 'A-93 Part 8 STOP-AND-REPORT' /tmp/r68-fault3.log; then ok "F4  the named-set guard FIRED and named the added rows (an N1-class fault, run end to end)"
    else bad "F4  the named-set guard did not fire"; fi
    if [ -z "$(git -C "$W" status --porcelain -- packages fixtures)" ]; then ok "F5  the stopped run wrote nothing"
    else bad "F5  the stopped run wrote $(git -C "$W" status --porcelain -- packages fixtures | wc -l) files"; fi
    note "and PS->IL becomes load-bearing under this fault — A-93 Part 9 residue 3's own trigger:"
    grep -m1 'sovereign pairs used' /tmp/r68-fault3.log | sed 's/^/  note /'
  else
    bad "F0  the fault-3 plant did not apply"
  fi
  reset_tree
else
  note "SKIPPED — this section needs a real generator run"
fi

echo ""
echo "$pass ok, $fail FAIL"
[ "$fail" -eq 0 ]
