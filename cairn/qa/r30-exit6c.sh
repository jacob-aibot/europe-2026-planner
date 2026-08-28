#!/usr/bin/env bash
# QA round 30 — I-7b: **exit criterion 6 in its A-36 (revision-26) form, attacked past G1..G6.**
#
#   Run: bash qa/r30-exit6c.sh          (from cairn/)
#
# `qa/i7a-exit6b.sh` builds G1..G6 (round 29's own). A-36 Part 5 names two more the ruling
# turns on and BUILD-NOTES reports counts for; this harness builds them independently rather
# than trusting the report, and then goes past both:
#
#   G7   the parameter REASSIGNED IN PLACE before an unchanged `put`. A-36's whole basis:
#        every static form of 6b-2 passes on it. Must be RED, and red by 6b-1b ALONE.
#   G7b  the same fault written as `Object.assign(summary, {...})` — A-36 Part 1's "second
#        one-line shape with the same property". Not in the builder's matrix at all.
#   G8   a THIRD `SUMMARIES.put(summary, id)` site writing a CORRECT row. Must be RED, and
#        red by 6b-2's pinned site count ALONE — which is what proves 6b-2 was not deleted.
#   G9   a lifetime cache in a SECOND OBJECT STORE **in the web port** — G3's shape, which
#        round 29 only ever built against the memory port, and written with no `: number`
#        annotation and no numeric literal so the name-based tripwire cannot see it.
#   G9m  the same in the memory port, to tell "the web port is uncovered" apart from "the
#        tripwire's catch of G3 was an artefact of how G3 was spelled".
#   G10  a widening gated on `typeof window !== 'undefined'` — clean under 6b-1b (which runs
#        in Node) and dirty in a real browser. Probes A-36 Part 6 residue 1 directly.
#   G11  `listTrips` DROPS a key rather than adding one. Loss, not leak; nothing in A-36's
#        matrix aims at this direction.
#
# A fault that produces `# fail 0` is a fault exit criterion 6 does not catch.
# An anchor that no longer applies is UNRUN and exits non-zero (R29-4's own rule).
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
REPO="$(cd .. && pwd)"
TEST='test/stats-storage.test.ts'
UNRUN=0
GREEN=""

say() { printf '\n== %s ==\n' "$1"; }

run_fault() {
  local label="$1"; local script="$2"; local scope="${3:-$TEST}"
  local wt; wt="$(mktemp -d)/wt"
  git -C "$REPO" worktree add --detach "$wt" HEAD >/dev/null 2>&1 || { echo "worktree failed"; return 1; }
  ln -s "$CAIRN/node_modules" "$wt/cairn/node_modules"
  say "$label"
  if ! python3 - "$wt/cairn" <<PY
$script
PY
  then
    echo "  *** UNRUN — the anchor no longer applies. This is NOT a pass. ***"
    UNRUN=$((UNRUN + 1))
  else
    local out
    out="$( cd "$wt/cairn" && node --test --test-reporter=tap $scope 2>&1 \
        | grep -E '^(not ok|# (tests|pass|fail))' )"
    echo "$out" | sed 's/^/  /'
    if echo "$out" | grep -qE '^# fail 0$'; then
      echo "  *** GREEN — exit criterion 6 does not catch this ***"
      GREEN="$GREEN $label"
    fi
  fi
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
}

say "baseline — exit criterion 6 on the shipped tree"
node --test --test-reporter=tap "$TEST" 2>&1 | grep -E '^(not ok|# (tests|pass|fail))' | sed 's/^/  /'

# ---------------------------------------------------------------------------
run_fault "G7 — web port: the parameter REASSIGNED IN PLACE before an unchanged put (expect: RED, 6b-1b alone)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
# A-36 Part 1's printed fault, verbatim in shape: the parameter is still named `summary`, the
# declaration `summary: TripSummaryRow` is still there, the capture at both puts is still the
# bare identifier, the site count is still 2. Every static form of 6b-2 passes.
anchor = '''    ): Promise<SaveOutcome> {
      await ensureReady();
      const db = await open();
      return new Promise<SaveOutcome>((resolve, reject) => {
        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');
        let outcome: SaveOutcome | null = null;
        const readKey = tx.objectStore(DOCS).getKey(id) as IDBRequest<IDBValidKey | undefined>;
        readKey.onsuccess = () => {
          if (readKey.result === undefined) {'''
assert anchor in s, 'shape moved (refreshSummary body)'
s = s.replace(anchor, '''    ): Promise<SaveOutcome> {
      await ensureReady();
      summary = { ...summary, countriesVisited: summary.countryCodes.length, daysTravelled: summary.dayCount } as TripSummaryRow;
      const db = await open();
      return new Promise<SaveOutcome>((resolve, reject) => {
        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');
        let outcome: SaveOutcome | null = null;
        const readKey = tx.objectStore(DOCS).getKey(id) as IDBRequest<IDBValidKey | undefined>;
        readKey.onsuccess = () => {
          if (readKey.result === undefined) {''', 1)
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G7b — web port: \`Object.assign(summary, …)\` in place (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
anchor = '''      summary: TripSummaryRow,
    ): Promise<SaveOutcome> {
      await ensureReady();
      const db = await open();
      return new Promise<SaveOutcome>((resolve, reject) => {
        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');
        let outcome: SaveOutcome | null = null;
        const readKey = tx.objectStore(DOCS).getKey(id) as IDBRequest<IDBValidKey | undefined>;
        readKey.onsuccess = () => {
          if (readKey.result === undefined) {'''
assert anchor in s, 'shape moved (refreshSummary signature+body)'
s = s.replace(anchor, anchor.replace(
  '      await ensureReady();\n      const db = await open();',
  '      await ensureReady();\n      Object.assign(summary, { countriesVisited: summary.countryCodes.length, daysTravelled: summary.dayCount });\n      const db = await open();'), 1)
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G8 — web port: a THIRD SUMMARIES.put site writing a CORRECT row (expect: RED, 6b-2 alone)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
# A third write site. The row is CORRECT — nothing widens, nothing is lost — so no runtime
# key assertion can see it. Only 6b-2's pinned site count can.
anchor = '''            tx.objectStore(DOCS).put(doc, id);
            tx.objectStore(SUMMARIES).put(summary, id);
            tx.objectStore(VERSIONS).put(version, id);'''
assert anchor in s, 'shape moved (saveIfVersion put block)'
s = s.replace(anchor, '''            tx.objectStore(DOCS).put(doc, id);
            tx.objectStore(SUMMARIES).put(summary, id);
            tx.objectStore(SUMMARIES).put(summary, `${id}:mirror`);
            tx.objectStore(VERSIONS).put(version, id);''', 1)
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G9 — web port: a lifetime cache in a SECOND object store, unannotated (expect: RED?)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
anchor = "const VERSIONS = 'versions';"
assert anchor in s, 'shape moved (store name constants)'
s = s.replace(anchor, anchor + "\nconst LIFETIME = 'lifetime';", 1)
old_up = "      if (!db.objectStoreNames.contains(VERSIONS)) db.createObjectStore(VERSIONS);"
assert old_up in s, 'shape moved (onupgradeneeded)'
s = s.replace(old_up, old_up + "\n      if (!db.objectStoreNames.contains(LIFETIME)) db.createObjectStore(LIFETIME);", 1)
s = s.replace('const DB_VERSION = 3;', 'const DB_VERSION = 4;', 1)
# Deliberately in `refreshSummary`, NOT `saveIfVersion`: the 6b-1b vacuity control's own
# replace-anchor sits on `saveIfVersion`'s preamble, and editing that makes THAT test fire for
# a reason that has nothing to do with this fault. Aim at the other method so the measurement
# is of the criterion and not of the anchor.
old_tx = """        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');
        let outcome: SaveOutcome | null = null;
        const readKey = tx.objectStore(DOCS).getKey(id) as IDBRequest<IDBValidKey | undefined>;
        readKey.onsuccess = () => {
          if (readKey.result === undefined) {"""
assert old_tx in s, 'shape moved (refreshSummary tx scope)'
s = s.replace(old_tx, old_tx.replace('[DOCS, SUMMARIES, VERSIONS]', '[DOCS, SUMMARIES, VERSIONS, LIFETIME]'), 1)
# The cache: an expression, not a numeric literal; no `: number` anywhere; and neither field
# name carries a domain noun the classifier looks for.
anchor2 = '''            tx.objectStore(SUMMARIES).put(summary, id);
            // The version now in storage'''
assert anchor2 in s, 'shape moved (refreshSummary put)'
s = s.replace(anchor2, '''            tx.objectStore(SUMMARIES).put(summary, id);
            tx.objectStore(LIFETIME).put({ visited: summary.countryCodes.length, elapsed: summary.dayCount }, id);
            // The version now in storage''', 1)
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G9m — memory port: the same second-store cache, unannotated (control for G9) (expect: RED?)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/packages/client/src/ports/memory.ts'
s = open(p).read()
anchor = '  const summaries = new Map<string, TripSummaryRow>();'
assert anchor in s, 'shape moved (summaries map)'
# No `: number` annotation anywhere, and neither field name is a domain noun the classifier
# knows. G3 spelled it `{ countriesVisited: number; daysTravelled: number }`, which the
# name-based tripwire CAN see; this is the same defect spelled so it cannot.
s = s.replace(anchor, anchor + '\n  const lifetime = new Map<string, Record<string, unknown>>();', 1)
old = '      summaries.set(id, summary);'
assert s.count(old) == 2, 'shape moved (set sites)'
s = s.replace(old, old + '\n      lifetime.set(id, { visited: summary.countryCodes.length, elapsed: summary.dayCount });')
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G10 — web port: widening gated on \`typeof window !== 'undefined'\` (expect: GREEN under 6b-1b — that is the point)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
anchor = '''      summary: TripSummaryRow,
    ): Promise<SaveOutcome> {
      await ensureReady();
      const db = await open();
      return new Promise<SaveOutcome>((resolve, reject) => {
        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');
        let outcome: SaveOutcome | null = null;
        const readKey = tx.objectStore(DOCS).getKey(id) as IDBRequest<IDBValidKey | undefined>;
        readKey.onsuccess = () => {
          if (readKey.result === undefined) {'''
assert anchor in s, 'shape moved (refreshSummary)'
s = s.replace(anchor, anchor.replace(
  '      await ensureReady();\n      const db = await open();',
  "      await ensureReady();\n      if (typeof window !== 'undefined') summary = { ...summary, countriesVisited: summary.countryCodes.length } as TripSummaryRow;\n      const db = await open();"), 1)
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G11 — web port: listTrips DROPS a key rather than adding one (expect: RED)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
old = "      const rows = await run<TripSummaryRow[]>(SUMMARIES, 'readonly', (s) => s.getAll() as IDBRequest<TripSummaryRow[]>);"
assert old in s, 'shape moved (listTrips getAll)'
s = s.replace(old, old + "\n      for (const r of rows) delete (r as Record<string, unknown>).attribution;", 1)
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G12 — web port: the widening lives in \`ensureReady\`'s one-time UPCAST (expect: ?)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
# The upcast walks records that ALREADY EXIST when a port instance opens the database. A
# migration that "brings the summaries current while we are in here" is an entirely ordinary
# thing to write. 6b-1b creates a fresh port over an EMPTY recorder, so `docKeys.result` is
# empty and this path writes nothing — the gate never reaches it.
old = "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);"
assert old in s, 'shape moved (ensureReady tx)'
s = s.replace(old, "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);\n          const sums = tx.objectStore(SUMMARIES);", 1)
old2 = """              for (const key of docKeys.result) {
                if (have.has(String(key))) continue;"""
assert old2 in s, 'shape moved (upcast loop)'
s = s.replace(old2, """              const all = sums.getAll() as IDBRequest<TripSummaryRow[]>;
              all.onsuccess = () => {
                for (const r of all.result) {
                  sums.put({ ...r, countriesVisited: r.countryCodes.length, daysTravelled: r.dayCount }, r.id);
                }
              };
              for (const key of docKeys.result) {
                if (have.has(String(key))) continue;""", 1)
open(p, 'w').write(s)
PY
)"

# ---------------------------------------------------------------------------
run_fault "G12b — the same upcast widening, spelled \`tx.objectStore(SUMMARIES).put(…)\` (expect: RED, 6b-2's site count)" "$(cat <<'PY'
import sys
p = sys.argv[1] + '/apps/web/src/ports/storage.ts'
s = open(p).read()
# G12 reaches the store through a HELD reference (`const sums = tx.objectStore(SUMMARIES)`),
# which is what a builder writes when the same store is touched twice in one transaction. This
# is the OTHER spelling — the literal `objectStore(SUMMARIES).put` — which puts a third
# occurrence in front of 6b-2's pinned site count. If this is red and G12 is green, then what
# tells the two apart is the SPELLING and not the property, which is the finding.
old = "          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);"
assert old in s, 'shape moved (ensureReady tx)'
s = s.replace(old, "          const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');\n          const versions = tx.objectStore(VERSIONS);", 1)
old2 = """              for (const key of docKeys.result) {
                if (have.has(String(key))) continue;"""
assert old2 in s, 'shape moved (upcast loop)'
s = s.replace(old2, """              const all = tx.objectStore(SUMMARIES).getAll() as IDBRequest<TripSummaryRow[]>;
              all.onsuccess = () => {
                for (const r of all.result) {
                  tx.objectStore(SUMMARIES).put({ ...r, countriesVisited: r.countryCodes.length, daysTravelled: r.dayCount }, r.id);
                }
              };
              for (const key of docKeys.result) {
                if (have.has(String(key))) continue;""", 1)
open(p, 'w').write(s)
PY
)"

say "summary"
if [ -n "$GREEN" ]; then
  echo "  GREEN (uncaught) faults:$GREEN"
else
  echo "  every fault was caught"
fi
[ "$UNRUN" -gt 0 ] && echo "  $UNRUN fault(s) UNRUN — anchors drifted"
say "done"
[ "$UNRUN" -gt 0 ] && exit 1
exit 0
