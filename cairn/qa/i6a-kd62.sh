#!/usr/bin/env bash
# Round 27 — I-6a: **is KD-62's hole real, is it live, and is it actually unclosable?**
#
#   Run: bash qa/i6a-kd62.sh          (from cairn/, or from anywhere)
#
# BUILD-NOTES KD-62 discloses that `switch.test.ts`'s `insideChain` is a lexical test, so a
# `ports.storage` mutation wrapped in a thunk created inside a `chainOntoSaving` callback and
# invoked after it returns passes the grep while running off the chain — and that nothing else
# in the repo catches it either (*"the whole client suite is 216 pass / 0 fail"*). This script
# builds exactly that mutation in a throwaway worktree and measures three things:
#
#   1. the §4.3 structural grep                   — must stay GREEN (that is the hole)
#   2. the whole client suite                     — the builder says GREEN (no backstop)
#   3. `qa/i6a-chain.mjs`, this round's probe     — must go RED (a backstop DOES exist)
#
# Plus a static census of the live tree for the shape the hole needs: does any `ports.storage`
# mutation in the shipped store actually sit inside a function that is not invoked inline?
#
# Nothing in the checkout is written; the mutation lives and dies in a `git worktree`.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"
say() { printf '\n== %s ==\n' "$1"; }

say "0 — the live tree: is there a thunk-deferred storage mutation TODAY?"
python3 - "$CAIRN" <<'PY'
import re, sys
p = sys.argv[1] + '/packages/client/src/store/store.ts'
s = open(p).read()
# Strip comments and strings so a prose mention is not counted (same idea as switch.test.ts).
out, i = [], 0
while i < len(s):
    two = s[i:i+2]
    if two == '//':
        j = s.find('\n', i); j = len(s) if j < 0 else j
        out.append(re.sub(r'[^\n]', ' ', s[i:j])); i = j; continue
    if two == '/*':
        j = s.find('*/', i+2); j = len(s) if j < 0 else j+2
        out.append(re.sub(r'[^\n]', ' ', s[i:j])); i = j; continue
    q = s[i]
    if q in "'\"`":
        j = i+1
        while j < len(s) and s[j] != q:
            j += 2 if s[j] == '\\' else 1
        j = min(j+1, len(s))
        out.append(re.sub(r'[^\n]', ' ', s[i:j])); i = j; continue
    out.append(s[i]); i += 1
code = ''.join(out)
sites = [(m.start(), m.group(1)) for m in re.finditer(r'ports\.storage\.(\w+)\(', code)]
muts = [(i, n) for i, n in sites if n not in ('load', 'listTrips')]
print(f"  {len(sites)} ports.storage call sites, {len(muts)} of them mutations:")
for i, n in muts:
    line = code[:i].count('\n') + 1
    # The enclosing statement: is the call `await`ed directly, or assigned to something?
    stmt_start = max(code.rfind('\n', 0, i), 0)
    stmt = code[stmt_start:i].strip()
    inline = stmt.startswith('await ') or stmt.startswith('const ') or stmt.startswith('return ')
    print(f"    {n:<15} line {line:<5} enclosing statement: {stmt[:60]!r}  awaited-inline={inline}")
# The shape KD-62 needs: a function EXPRESSION assigned to a name, holding a storage mutation.
danger = re.findall(r'(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{', code)
print(f"  named async function EXPRESSIONS assigned inside the store: {danger or 'none'}")
print(f"  -> the thunk shape KD-62 describes is {'PRESENT' if danger else 'ABSENT'} in the shipped store")
PY

WT="$(mktemp -d)/wt"
git -C "$REPO" worktree add --detach "$WT" HEAD >/dev/null 2>&1 || { echo "worktree failed"; exit 1; }
ln -s "$CAIRN/node_modules" "$WT/cairn/node_modules"
cp "$CAIRN/qa/i6a-chain.mjs" "$WT/cairn/qa/i6a-chain.mjs"

say "1 — planting KD-62's mutation: the refresh deferred into a thunk invoked after the link"
python3 - "$WT/cairn" <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/store/store.ts'
s = open(p).read()
head = "        for (const id of ids) {\n          await chainOntoSaving(async () => {"
assert head in s, 'the rescan loop moved — re-derive this mutation'
s = s.replace(head, "        for (const id of ids) {\n          let deferred: (() => Promise<void>) | null = null;\n          await chainOntoSaving(async () => {", 1)

old = """            const outcome = await ports.storage.refreshSummary(id, stored.version, summary);
            if (!outcome.ok) return;
            set({ ...state, library: upsertSummary(state.library, summary), rescan: { running: true, unreadable: report() } });
          });"""
assert old in s, 'the write moved — re-derive this mutation'
new = """            deferred = async () => {
              const outcome = await ports.storage.refreshSummary(id, stored.version, summary);
              if (!outcome.ok) return;
              set({ ...state, library: upsertSummary(state.library, summary), rescan: { running: true, unreadable: report() } });
            };
          });
          if (deferred !== null) await (deferred as () => Promise<void>)();"""
s = s.replace(old, new, 1)
open(p, 'w').write(s)
print("  planted: the `ports.storage.refreshSummary(` call site is STILL lexically inside the")
print("           chainOntoSaving callback's argument list; the write now runs after it resolves.")
PY

cd "$WT/cairn" || exit 1

say "2 — does it even compile? (KD-57's lesson: tsc cannot see an ordering bug)"
npm run typecheck >/tmp/i6a-kd62-tsc.log 2>&1 && echo "  typecheck: CLEAN — the type system does not see it" \
  || { echo "  typecheck: FAILED"; tail -5 /tmp/i6a-kd62-tsc.log; }

say "3 — the §4.3 structural grep (must stay GREEN — that IS the hole)"
node --test --test-reporter=tap packages/client/test/switch.test.ts 2>&1 \
  | grep -E '^(not ok|# (pass|fail))' | head -8

say "4 — the WHOLE client suite (the builder's 'no behavioural backstop' claim)"
node --test --test-reporter=tap packages/client/test/*.ts 2>&1 \
  | grep -E '^(not ok|# (tests|pass|fail))' | head -12

say "5 — qa/i6a-chain.mjs, this round's runtime ordering probe (must go RED)"
timeout 180 node --experimental-strip-types qa/i6a-chain.mjs 2>&1 \
  | grep -vE 'ExperimentalWarning|trace-warnings' | grep -E '^(==|  FAIL|ALL OK|[0-9]+ FAIL)'

cd "$CAIRN" || exit 1
git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1
say "worktree removed"
git -C "$REPO" worktree list | sed 's/^/  /'
