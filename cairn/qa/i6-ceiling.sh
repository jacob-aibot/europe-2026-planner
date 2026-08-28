#!/usr/bin/env bash
# Round 26 — I-6, part 4: **the §4.3 structural ceiling, mutation-tested three ways.**
#
#   Run: bash qa/i6-ceiling.sh        (from cairn/)
#
# `switch.test.ts`'s clause 1 reads *"every `saveIfVersion` call site is inside `writeAndSettle`,
# and every other `ports.storage` mutation is lexically inside a `chainOntoSaving` callback"*.
# **Since I-6a (§4.3 A-30) the rescan's write is `refreshSummary`, not `saveIfVersion`** — one
# document-write call site, one summary-refresh call site, and `refreshSummary` is explicitly
# NOT on §4.3's exemption list (which stays `listTrips` and `load`). An assertion is only as
# good as what it still catches, so this plants three defects it must catch:
#
#   M1  the rescan's link becomes a bare `await (async () => {…})()` — same code, no chain.
#   M2  an EXTRA `saveIfVersion` call site, off the chain entirely.
#   M3  the subtle one: the rescan's `refreshSummary` is hoisted into a helper, and the helper
#       is called from inside the chain callback. The write IS ordered; the call site is not
#       lexically inside the callback. A "lexically inside" assertion must red on this, or the
#       ceiling is a grep a builder can walk around by extracting a function.
#
# Each mutation runs in a throwaway `git worktree` at HEAD; nothing in the tree is touched.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"

TEST='packages/client/test/switch.test.ts'
LEDGER='packages/client/test/retirement-ledger.test.ts'

say() { printf '\n== %s ==\n' "$1"; }

run_mutation() {
  local label="$1"; local script="$2"
  local wt; wt="$(mktemp -d)/wt"
  git -C "$REPO" worktree add --detach "$wt" HEAD >/dev/null 2>&1 || { echo "worktree failed"; return 1; }
  ln -s "$CAIRN/node_modules" "$wt/cairn/node_modules"
  say "$label"
  python3 - "$wt/cairn" <<PY
$script
PY
  ( cd "$wt/cairn" && node --test --test-reporter=tap "$TEST" "$LEDGER" 2>&1 \
      | grep -E '^(not ok|# (pass|fail))' | head -10 )
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
}

say "baseline — the two ceiling files on the shipped tree"
node --test --test-reporter=tap "$TEST" "$LEDGER" 2>&1 | grep -E '^(not ok|# (tests|pass|fail))'
echo "  retirement-ledger.test.ts byte-identical since 4eabf08:"
git -C "$REPO" diff --stat 4eabf08 HEAD -- "cairn/$LEDGER" | sed 's/^/    /'
echo "    (no diffstat line above = byte-identical)"
echo "  document-installing methods the ledger test finds:"
node --test --test-reporter=tap "$LEDGER" 2>&1 | grep -c 'reseed' >/dev/null
grep -c 'reseed: true' packages/client/src/store/store.ts | sed 's/^/    reseed: true occurrences = /'

run_mutation "M1 — the rescan's link becomes a bare async IIFE (no chain)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/store/store.ts'
s = open(p).read()
old = "          await chainOntoSaving(async () => {\n            const stored = await ports.storage.load(id);"
assert old in s, 'shape moved'
s = s.replace(old, "          await (async () => {\n            const stored = await ports.storage.load(id);", 1)
# close the IIFE: the matching `});` for that call becomes `})();`
i = s.index("          await (async () => {")
j = s.index("\n          });\n", i)
s = s[:j] + "\n          })();\n" + s[j + len("\n          });\n"):]
open(p, 'w').write(s)
print('  mutated: chainOntoSaving(...) -> (async () => {...})()')
PY
)"

run_mutation "M2 — an EXTRA saveIfVersion call site, off the chain" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/store/store.ts'
s = open(p).read()
anchor = "  /** Starts a rescan, or joins the one already running. Never two passes at once. */"
assert anchor in s
extra = """  /** MUTATION (qa/i6-ceiling.sh): a third write path, off the chain. */
  async function touchRow(id: string): Promise<void> {
    const stored = await ports.storage.load(id);
    if (stored === null) return;
    const doc = core.fromJSON(stored.doc);
    await ports.storage.saveIfVersion(id, stored.version, core.toJSON(doc), core.tripSummary(doc, core.COUNTRY_INDEX));
  }
  void touchRow;

"""
open(p, 'w').write(s.replace(anchor, extra + anchor, 1))
print('  mutated: added an off-chain saveIfVersion call site')
PY
)"

run_mutation "M3 — the rescan's write hoisted into a helper called FROM inside the chain" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/store/store.ts'
s = open(p).read()
old = """            const summary = core.tripSummary(doc, core.COUNTRY_INDEX);
            const outcome = await ports.storage.refreshSummary(id, stored.version, summary);
            if (!outcome.ok) return;
            set({ ...state, library: upsertSummary(state.library, summary), rescan: { running: true, unreadable: report() } });"""
assert old in s, 'shape moved'
new = """            await writeRescannedRow(id, stored.version, doc, report);"""
s = s.replace(old, new, 1)
anchor = "  /** Starts a rescan, or joins the one already running. Never two passes at once. */"
helper = """  /** MUTATION (qa/i6-ceiling.sh): the same write, one stack frame out of the callback. */
  async function writeRescannedRow(
    id: string,
    expected: StorageVersion,
    doc: Trip,
    report: () => Array<{ id: string; message: string }>,
  ): Promise<void> {
    const summary = core.tripSummary(doc, core.COUNTRY_INDEX);
    const outcome = await ports.storage.refreshSummary(id, expected, summary);
    if (!outcome.ok) return;
    set({ ...state, library: upsertSummary(state.library, summary), rescan: { running: true, unreadable: report() } });
  }

"""
open(p, 'w').write(s.replace(anchor, helper + anchor, 1))
print('  mutated: refreshSummary hoisted out of the chainOntoSaving callback (still ordered)')
PY
)"

echo
echo "worktrees discarded."
