#!/usr/bin/env bash
# QA round 66 — is A-88 Part 2's residue's TRIGGER already fired?
#
#   bash qa/r66-prea45.sh          # run from `cairn/`; needs no network and no browser
#
# A-88 Part 2 records a residue and a trigger: `rowDatesReadable` is **stricter than the throw it
# names** — it rejects a calendar-invalid `'2026-02-30'` that `travelStats` normalises without
# throwing — so a library holding one such row AND one genuinely shape-invalid row reports two
# suspects and names neither, which is strictly narrower than both `e1e1973` and `ede933f`.
#
#   > **Trigger:** a measurement that a shipped write path can store a calendar-invalid but
#   > shape-valid date — at which point the population is real and core owns the predicate.
#
# `qa/r66-gate.mjs` §A4 measures every door shipping TODAY and all three refuse. This script asks
# the other half of the question, because a stored row is not written by today's build alone: it
# runs the SAME document through the build that shipped before §2.9 **A-45** added the calendar
# check to `fromJSON` (`068cb00` is A-45; `909b4a3` is the commit before it), and reads what that
# build wrote into the summary row that goes to storage.
#
# Everything happens in a throwaway `git worktree`; the live tree is never touched.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
PRE="${1:-909b4a3}"
TMP="$(mktemp -d)"
WT="$TMP/prea45"
trap 'git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$TMP"' EXIT

git -C "$REPO" worktree add --detach "$WT" "$PRE" >/dev/null 2>&1 || { echo "worktree failed at $PRE"; exit 2; }
cp -a "$HERE/node_modules" "$WT/cairn/node_modules"
C="$WT/cairn"
real=$(node -e "console.log(require('fs').realpathSync('$C/node_modules/@cairn/core'))")
case "$real" in "$C"/*) ;; *) echo "ABORT: @cairn/core resolves to $real, outside the worktree"; exit 2;; esac
echo "== the build before A-45 ($PRE): $(git -C "$REPO" log -1 --format=%s "$PRE")"

cat > "$TMP/pre.mjs" <<EOF
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const C = '$C';
const core = await import(pathToFileURL(join(C, 'packages/core/src/index.ts')).href);
const { loadEurope2026 } = await import(pathToFileURL(join(C, 'fixtures/loadEurope2026.mjs')).href);
const { trip } = loadEurope2026(core);
const doc = JSON.parse(core.toJSON(trip));
doc.startDate = '2026-02-30';   // shape-valid, calendar-invalid — Feb 30th
let parsed, err;
try { parsed = core.fromJSON(JSON.stringify(doc)); } catch (e) { err = e.message; }
console.log('  fromJSON("2026-02-30"):', err ? 'REFUSED — ' + err : 'ACCEPTED');
if (parsed) {
  const row = core.tripSummary.length >= 2 ? core.tripSummary(parsed, core.COUNTRY_INDEX) : core.tripSummary(parsed);
  console.log('  tripSummary(...).startDate, i.e. what went into storage:', JSON.stringify(row.startDate));
}
EOF
node --experimental-strip-types "$TMP/pre.mjs"

echo
echo "== the same row, read by the build that ships today"
cat > "$TMP/now.mjs" <<EOF
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const C = '$HERE';
const core = await import(pathToFileURL(join(C, 'packages/core/src/index.ts')).href);
const client = await import(pathToFileURL(join(C, 'packages/client/src/index.ts')).href);
const { loadEurope2026 } = await import(pathToFileURL(join(C, 'fixtures/loadEurope2026.mjs')).href);
const { trip } = loadEurope2026(core);
const REF = core.tripSummary(trip, core.COUNTRY_INDEX);
const at = (f) => { try { return { v: f() }; } catch (e) { return { e: String(e.message || e) }; } };
const aged = { ...REF, id: 'imported-before-A-45', startDate: '2026-02-30', endDate: '2026-03-05' };
const broken = { ...REF, id: 'the-broken-one', startDate: 'not-a-date' };
console.log('  travelStats([aged]) throws?', at(() => core.travelStats([aged], '2026-09-09')).e ?? 'no');
console.log('  rowDatesReadable(aged):', client.rowDatesReadable(aged), '  <- a suspect for a throw it cannot produce');
const h = at(() => client.travelHistory({ library: [broken, aged] }, '2026-09-09'));
console.log('  travelHistory({broken, aged}):', JSON.stringify({ rowId: h.v?.rowId, unreadableRows: h.v?.unreadableRows }));
// And the document behind that row does not open today, so no rescan can re-derive the row out
// of the state it is in: the population is permanent for whoever has one.
const doc = JSON.parse(core.toJSON(trip)); doc.startDate = '2026-02-30';
console.log('  today\`s fromJSON on the same document:', at(() => core.fromJSON(JSON.stringify(doc))).e ?? 'ACCEPTED');
EOF
node --experimental-strip-types "$TMP/now.mjs"
echo
echo "COMPLETE"
