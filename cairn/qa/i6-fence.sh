#!/usr/bin/env bash
# Round 26 part 3, re-expressed for I-6a: **the rescan's write fence, tested rather than believed.**
#
#   Run: bash qa/i6-fence.sh          (from cairn/)
#
# Round 26 asked whether KD-57 was right that the rescan may not reuse `writeAndSettle` for a
# non-active document. It was, and it was understated: §2.2a A-7's guard
# (`!stillOurs && toWrite !== startedFrom`) was written on the unstated assumption that every
# write is about the ACTIVE document, so a self-contained rewrite of a non-active trip Y
# satisfies the second disjunct literally (`toWrite === startedFrom`, both are Y) and moves
# trip X's fence to a version minted for Y.
#
# **§4.3 A-30 then removed the question rather than answering it again.** The rescan issues
# `refreshSummary` — no document argument, no mint — so there is no document write left to aim
# anywhere, and the `attemptSave` branch KD-57 was about is deleted. That makes this script two
# counterfactuals rather than one, each built in a throwaway `git worktree` at HEAD:
#
#   M-A  restore I-6's `saveIfVersion` rewrite in `runRescan`. This is A-30's own injected
#        fault, and it is R26-6: a background pass mints a version for a document it did not
#        change, and another tab's fence is what it mints against. The shipped fence tests must
#        go red. (Their absence is what let R26-6 ship.)
#   M-B  KD-57's refused option, `writeAndSettle(doc, doc, null, stored.version)`. Still
#        compiles, still invisible to `tsc`, and `qa/i6-fence-probe.mjs` shows the fence, the
#        dirty flag, the next keystroke and — the consequence KD-57 does not state — the
#        `mergeTrips` ancestor all land on the wrong trip.
#
# Nothing in the working tree is touched. **Both mutations are expected to FAIL loudly.**
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"

say() { printf '\n== %s ==\n' "$1"; }

WT=""
cleanup() { [ -n "$WT" ] && git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1; }
trap cleanup EXIT

new_worktree() {
  cleanup
  WT="$(mktemp -d)/wt"
  git -C "$REPO" worktree add --detach "$WT" HEAD >/dev/null 2>&1 || { echo "could not create worktree"; exit 1; }
  ln -s "$CAIRN/node_modules" "$WT/cairn/node_modules"
}

say "baseline — the shipped tree"
node --test --test-reporter=tap packages/client/test/summary-refresh.test.ts \
     packages/client/test/summary-rescan.test.ts 2>&1 | grep -E '^(not ok|# (tests|pass|fail))'

# ---------------------------------------------------------------------------
new_worktree
say "M-A — restore I-6's saveIfVersion rewrite (A-30's own injected fault; this is R26-6)"
python3 - "$WT/cairn" <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/store/store.ts'
s = open(p).read()
old = "            const outcome = await ports.storage.refreshSummary(id, stored.version, summary);"
assert old in s, 'the rescan write shape moved — re-derive this mutation'
new = "            const outcome = await ports.storage.saveIfVersion(id, stored.version, core.toJSON(doc), summary);"
open(p, 'w').write(s.replace(old, new, 1))
print('  mutated: refreshSummary -> saveIfVersion (a full document rewrite, which MINTS)')
PY
( cd "$WT/cairn" && npx tsc -p tsconfig.json --noEmit 2>&1 | head -5 ) || true
echo "  (no TS output above = the type system cannot see this either)"
( cd "$WT/cairn" && node --test --test-reporter=tap packages/client/test/*.test.ts 2>&1 \
    | grep -E '^(not ok|# (pass|fail))' | head -20 )

# ---------------------------------------------------------------------------
new_worktree
say "M-B — KD-57's refused option: route the rescan's write through writeAndSettle"
python3 - "$WT/cairn" <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/store/store.ts'
s = open(p).read()
old = """            const summary = core.tripSummary(doc, core.COUNTRY_INDEX);
            const outcome = await ports.storage.refreshSummary(id, stored.version, summary);
            if (!outcome.ok) return;
            set({ ...state, library: upsertSummary(state.library, summary), rescan: { running: true, unreadable: report() } });"""
assert old in s, 'the rescan write shape moved — re-derive this mutation'
new = """            // MUTATION (qa/i6-fence.sh): KD-57's refused option, reusing writeAndSettle.
            await writeAndSettle(doc, doc, null, stored.version);"""
open(p, 'w').write(s.replace(old, new, 1))
print('  mutated: runRescan -> writeAndSettle(doc, doc, null, stored.version)')
PY
say "M-B: it compiles (the type system does not catch this)"
( cd "$WT/cairn" && npx tsc -p tsconfig.json --noEmit 2>&1 | head -5 ) || true
echo "  (no TS output above = KD-57's failure mode is invisible to the compiler)"

say "M-B: the shipped suite under the mutation"
( cd "$WT/cairn" && node --test --test-reporter=tap packages/client/test/*.test.ts 2>&1 \
    | grep -E '^(not ok|# (pass|fail))' | head -20 )

say "M-B: the fence probe — where the fence, savedDoc and the merge ancestor end up"
cp "$CAIRN/qa/i6-fence-probe.mjs" "$WT/cairn/qa/i6-fence-probe.mjs"
( cd "$WT/cairn" && node --experimental-strip-types qa/i6-fence-probe.mjs )

echo
echo "worktrees discarded."
