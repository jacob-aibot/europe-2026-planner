#!/usr/bin/env bash
# Round 26 — I-6, part 3: **KD-57 tested, not believed.**
#
#   Run: bash qa/i6-fence.sh          (from cairn/)
#
# KD-57 claims the rescan may not reuse `writeAndSettle`, because §2.2a A-7's guard
# (`!stillOurs && toWrite !== startedFrom`) was written on the unstated assumption that every
# write is about the ACTIVE document — so a rescan write for a non-active trip Y satisfies
# A-7's second disjunct literally (`toWrite === startedFrom`) and moves trip X's fence to a
# version minted for Y.
#
# The builder did not build it that way, so the claim is a counterfactual and cannot be
# reproduced against the shipped tree. This script builds the counterfactual in a throwaway
# `git worktree` at HEAD, runs it, and prints what actually happens. Nothing in the working
# tree is touched.
#
#   step 1 — mutate `runRescan`'s NON-ACTIVE branch to `await writeAndSettle(doc, doc, null,
#            stored.version)`, exactly the reuse KD-57 refuses. One replacement, four lines.
#   step 2 — assert the mutation compiles and the shipped suite still passes except where the
#            invariant it broke is asserted.
#   step 3 — run the fence probe: trip X active, rescan rewrites trip Y, then look at
#            `persistence.savedDoc` / `savedVersion` and at what the next keystroke does.
#   step 4 — the consequence KD-57 does NOT state: `savedDoc` is `doMerge`'s three-way
#            ancestor, so the corrupted fence makes the next *Merge and save* on trip X
#            compute a merge whose ancestor is trip Y's document.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"
WT="$(mktemp -d)/wt"

say() { printf '\n== %s ==\n' "$1"; }

git -C "$REPO" worktree add --detach "$WT" HEAD >/dev/null 2>&1 || { echo "could not create worktree"; exit 1; }
trap 'git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1' EXIT
ln -s "$CAIRN/node_modules" "$WT/cairn/node_modules"
W="$WT/cairn"

say "step 1 — route the rescan's non-active write through \`writeAndSettle\` (KD-57's refused option)"
python3 - "$W" <<'PY'
import sys
W = sys.argv[1]
p = W + '/packages/client/src/store/store.ts'
s = open(p).read()
old = """            const summary = core.tripSummary(doc, core.COUNTRY_INDEX);
            const outcome = await ports.storage.saveIfVersion(id, stored.version, core.toJSON(doc), summary);
            if (!outcome.ok) return;
            set({ ...state, library: upsertSummary(state.library, summary), rescan: { running: true, unreadable: report() } });"""
assert old in s, 'the rescan write shape moved — re-derive this mutation'
new = """            // MUTATION (qa/i6-fence.sh): KD-57's refused option, reusing writeAndSettle.
            await writeAndSettle(doc, doc, null, stored.version);"""
open(p, 'w').write(s.replace(old, new, 1))
print('  mutated packages/client/src/store/store.ts: runRescan -> writeAndSettle(doc, doc, null, stored.version)')
PY

say "step 2 — it compiles (the type system does not catch this)"
( cd "$W" && npx tsc -p tsconfig.json --noEmit 2>&1 | head -5 ) || true
echo "  (no TS output above = KD-57's failure mode is invisible to the compiler)"

say "step 2b — the shipped suite under the mutation"
( cd "$W" && node --test --test-reporter=tap packages/client/test/*.test.ts 2>&1 | grep -E '^# (tests|pass|fail)' )
echo "  failing tests:"
( cd "$W" && node --test --test-reporter=tap packages/client/test/*.test.ts 2>&1 | grep -E '^not ok ' | head -20 )

say "step 3 + 4 — the fence probe"
cp "$CAIRN/qa/i6-fence-probe.mjs" "$W/qa/i6-fence-probe.mjs"
( cd "$W" && node --experimental-strip-types qa/i6-fence-probe.mjs )

echo
echo "worktree discarded."
