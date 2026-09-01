#!/usr/bin/env bash
# I-8f — every criterion's INJECTED FAULT, measured rather than asserted.
#
#   Run: bash qa/i8f-faults.sh            (from cairn/; bare Node, no browser, no server)
#
# ROADMAP I-8f's ship gate is *"every criterion above has its injected fault red — in particular
# the first two, whose injected fault is I-8e's own shipped predicate."* A test that cannot go
# red is not a test, so each mutation below is applied to a throwaway copy of the tree, the
# relevant suite is run, and the colour is compared to what the ROADMAP says it should be. A
# MISMATCH line means a criterion is not load-bearing.
#
# The three RENDERED faults (the chip/control and Delete's warning re-gated on `rowDatesReadable`
# alone, and the meta line re-gated on `rowUnopenable`) are each injected twice: here, against
# `test/views.test.ts`'s source-level floors, and by hand against `qa/i8f-render.mjs` with a
# rebuilt bundle — the results of that second run are recorded in BUILD-NOTES, because it needs
# `npm run web:build` and a server.
set -u
cd "$(dirname "$0")/.." || exit 1
CAIRN="$PWD"
MISMATCH=""

say() { printf '\n== %s ==\n' "$1"; }

# A throwaway copy: source copied for real, `node_modules` HARD-LINKED so the copy is instant.
#
# **The repo root's read-only half is copied too**, and that is not cosmetic: `test/cli.test.ts`
# resolves the live planner as `../europe-2026-itinerary.html` and `fixtures/loadEurope2026.mjs`
# reads it, so in a bare `cairn`-only copy **24 of its 27 tests fail before any mutation** and
# every `cli.ts` fault would read RED for the wrong reason. Measured, not assumed — the
# `baseline` check below re-measures it on every run. Copies, never symlinks: a mutation that
# broke `cmdExport`'s path guard must destroy a throwaway, not Jacob's phone. BUILD-NOTES KD-78.
make_copy() {
  local root; root="$(mktemp -d)"
  local wt="$root/cairn"
  mkdir -p "$wt"
  local f
  for f in "$CAIRN"/*; do
    case "$(basename "$f")" in
      node_modules) cp -al "$f" "$wt/node_modules" ;;
      *) cp -r "$f" "$wt/" ;;
    esac
  done
  rm -rf "$wt/apps/web/dist"
  for f in europe-2026-itinerary.html docs tickets index.html manifest.json; do
    [ -e "$CAIRN/../$f" ] && cp -r "$CAIRN/../$f" "$root/"
  done
  printf '%s' "$wt"
}

# The instrument's own zero. A suite that is already red in a throwaway copy cannot measure a
# mutation, which is exactly the trap `test/cli.test.ts` sets.
baseline() {
  local wt; wt="$(make_copy)"
  local out; out="$(cd "$wt" && node --test "$@" 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' ')"
  local failed; failed="$(printf '%s' "$out" | sed -n 's/.*# fail \([0-9]*\).*/\1/p')"
  if [ "${failed:-0}" -gt 0 ]; then
    echo "  BASELINE NOT GREEN for $*  -> $out"
    MISMATCH="$MISMATCH\n  baseline $* is red in a throwaway copy — no fault below it means anything"
  else
    echo "  baseline green   $*   -> $out"
  fi
  rm -rf "$(dirname "$wt")"
}

# fault <label> <file> <python-replace-script> <test-files...>
fault() {
  local label="$1" file="$2" py="$3"; shift 3
  local wt; wt="$(make_copy)"
  ( cd "$wt" && python3 -c "
import sys
p='$file'
s=open(p).read()
before=s
$py
if s==before:
    sys.exit('the mutation matched nothing')
open(p,'w').write(s)
" ) || { echo "  SETUP FAILED: $label"; MISMATCH="$MISMATCH\n  $label (setup)"; rm -rf "$(dirname "$wt")"; return; }
  local out
  out="$(cd "$wt" && node --test "$@" 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' ')"
  local failed; failed="$(printf '%s' "$out" | sed -n 's/.*# fail \([0-9]*\).*/\1/p')"
  if [ "${failed:-0}" -gt 0 ]; then
    echo "  RED (expected)   $label   -> $out"
  else
    echo "  GREEN (MISMATCH) $label   -> $out"
    MISMATCH="$MISMATCH\n  $label"
  fi
  rm -rf "$(dirname "$wt")"
}

# ---------------------------------------------------------------------------
say 'the instrument\x27s own zero — every suite below is green in an UNMUTATED copy'
baseline test/views.test.ts
baseline test/cli.test.ts
baseline packages/client/test/open-failures.test.ts

# ---------------------------------------------------------------------------
say 'criterion 1 — the chip and the rescue control, re-gated on I-8e SHIPPED predicate'
fault 'unopenable = !rowDatesReadable(row)  (this is the code that shipped)' \
  'apps/web/src/views/Library.tsx' \
  "s=s.replace('const unopenable = rowUnopenable(state, row);','const unopenable = !rowDatesReadable(row);')" \
  test/views.test.ts

say 'criterion 1 — the union is inlined in the view instead of asked once in the selector'
fault 'Library.tsx re-derives the union from state.openFailures' \
  'apps/web/src/views/Library.tsx' \
  "s=s.replace('const unopenable = rowUnopenable(state, row);','const unopenable = !rowDatesReadable(row) || state.openFailures.some((f) => f.id === row.id);')" \
  test/views.test.ts

say 'criterion 2 — Delete\x27s warning re-gated on the NARROW predicate (R35-1\x27s conflation)'
fault 'const ask = !datesReadable ? …' \
  'apps/web/src/views/Library.tsx' \
  "s=s.replace('const ask = unopenable','const ask = !datesReadable')" \
  test/views.test.ts

say 'criterion 3 — the meta line re-gated on the WIDE predicate (R34-4 would over-fire)'
fault 'meta line = unopenable ? storedDatesLabel : dateRangeLabel' \
  'apps/web/src/views/Library.tsx' \
  "s=s.replace('{datesReadable ? dateRangeLabel(row) : storedDatesLabel(row)}','{unopenable ? storedDatesLabel(row) : dateRangeLabel(row)}')" \
  test/views.test.ts

# ---------------------------------------------------------------------------
say 'criterion 4 — the fact is not written at all (openTrip swallows the record)'
fault 'openTrip drops noteOpenFailure' \
  'packages/client/src/store/store.ts' \
  "s=s.replace('''      } catch (err) {
        noteOpenFailure(id, err);
        throw err;
      }
      cache = null;''','''      } catch (err) {
        throw err;
      }
      cache = null;''')" \
  packages/client/test/open-failures.test.ts

say 'criterion 4 — browseTrip does not record its own failure'
fault 'browseTrip drops noteOpenFailure' \
  'packages/client/src/store/store.ts' \
  "s=s.replace('''      } catch (err) {
        noteOpenFailure(id, err);
        throw err;
      }
      set({ ...state, browsing: doc''','''      } catch (err) {
        throw err;
      }
      set({ ...state, browsing: doc''')" \
  packages/client/test/open-failures.test.ts

say 'criterion 4 — the record is written WITHOUT emitting, so the card never comes back changed'
fault 'noteOpenFailure assigns state instead of calling set()' \
  'packages/client/src/store/store.ts' \
  "s=s.replace('    set({ ...state, openFailures: [...state.openFailures.filter((f) => f.id !== id), { id, message }] });','    state = { ...state, openFailures: [...state.openFailures.filter((f) => f.id !== id), { id, message }] };')" \
  packages/client/test/open-failures.test.ts

say 'criterion 4 — THE CARRY: openFailures dropped from closeTrip\x27s ...initialState() site'
fault 'closeTrip drops the carry' \
  'packages/client/src/store/store.ts' \
  "s=s.replace('set({ ...initialState(), library: state.library, rescan: state.rescan, openFailures: state.openFailures }, { reseed: true });','set({ ...initialState(), library: state.library, rescan: state.rescan }, { reseed: true });')" \
  packages/client/test/open-failures.test.ts

say 'criterion 4 — a successful open does not clear the entry (R26-2, one surface over)'
fault 'openTrip success keeps the stale record' \
  'packages/client/src/store/store.ts' \
  "s=s.replace('        openFailures: clearOpenFailure(id),','        openFailures: state.openFailures,')" \
  packages/client/test/open-failures.test.ts

say 'criterion 4 — deleteTrip leaves an observation about a record that no longer exists'
fault 'deleteTrip drops the clear' \
  'packages/client/src/store/store.ts' \
  "s=s.replace('        const openFailures = clearOpenFailure(id);','        const openFailures = state.openFailures;')" \
  packages/client/test/open-failures.test.ts

say 'criterion 4 — an ABSENT document is recorded too (R26-3\x27s `missing` merged in)'
fault 'openTrip records a null load as an open failure' \
  'packages/client/src/store/store.ts' \
  "s=s.replace('''      if (stored === null) throw new Error(\`openTrip: no trip \${id} in storage\`);''','''      if (stored === null) {
        const e = new Error(\`openTrip: no trip \${id} in storage\`);
        noteOpenFailure(id, e);
        throw e;
      }''')" \
  packages/client/test/open-failures.test.ts

# ---------------------------------------------------------------------------
say 'the predicate — rowUnopenable drops F-D, which is the whole of A-47'
fault 'rowUnopenable without state.openFailures' \
  'packages/client/src/selectors/index.ts' \
  "s=s.replace('''    state.rescan.unreadable.some((u) => u.id === row.id) ||
    state.openFailures.some((f) => f.id === row.id)''','''    state.rescan.unreadable.some((u) => u.id === row.id)''')" \
  packages/client/test/open-failures.test.ts

say 'the predicate — rowUnopenable drops F-A (the rescan\x27s own observation)'
fault 'rowUnopenable without state.rescan.unreadable' \
  'packages/client/src/selectors/index.ts' \
  "s=s.replace('    state.rescan.unreadable.some((u) => u.id === row.id) ||\n','')" \
  packages/client/test/open-failures.test.ts

say 'the predicate — rowUnopenable drops F-B/F-C (A-46\x27s population stops being flagged)'
fault 'rowUnopenable without !rowDatesReadable(row)' \
  'packages/client/src/selectors/index.ts' \
  "s=s.replace('    !rowDatesReadable(row) ||\n','')" \
  packages/client/test/open-failures.test.ts

# ---------------------------------------------------------------------------
say 'criterion 6 — exportStoredDoc stops refusing the active trip (R35-5 back)'
fault 'the precondition is removed' \
  'packages/client/src/store/store.ts' \
  "s=s.replace('      if (id === state.activeTripId) {','      if (false) {')" \
  packages/client/test/open-failures.test.ts

# ---------------------------------------------------------------------------
say 'criterion 7 — the weekdayOf-only guard is restored (2026-13-45 prints statistics again)'
fault 'todayIsValid = try { core.weekdayOf(today) }' \
  'cli.ts' \
  "s=s.replace('''  if (core.isIsoDate(today)) return true;''','''  try { core.weekdayOf(today); return true; } catch { /* fall through */ }''')" \
  test/cli.test.ts

say 'criterion 7 — the check becomes a SHAPE regex of its own (A-32 Part 5\x27s second definition)'
fault 'todayIsValid = /^\\d{4}-\\d{2}-\\d{2}$/' \
  'cli.ts' \
  "s=s.replace('  if (core.isIsoDate(today)) return true;','  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}\$/.test(today)) return true;')" \
  test/cli.test.ts

if [ -n "$MISMATCH" ]; then
  printf '\nMISMATCHES — these criteria are NOT load-bearing:%b\n\n' "$MISMATCH"
  exit 1
fi
printf '\nALL FAULTS RED\n\n'
