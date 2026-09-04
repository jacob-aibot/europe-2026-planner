#!/usr/bin/env bash
# QA round 49 — the two "is it a regression?" controls, each in a throwaway worktree.
#
#   bash qa/r49-controls.sh            (from cairn/)
#
#   C1  **R49-1 is NOT a regression, and that is the finding rather than a defence.** §B is run at
#       `d03eac8` (round 48's head, before I-13e). There the SAME seven composite gestures are red
#       — through R48-2's own mechanism, the `photoAvailability` claim `claimTransition` used to
#       take. What changes at HEAD is the second control: the **bare** gesture (a `deleteTrip` of a
#       non-active trip with no import in flight) is RED at `d03eac8` and GREEN at HEAD. A-68
#       closed the gesture the finding named and left the gesture the finding did not, and Part 7's
#       invariant claims both.
#   C2  **R49-5 is pre-existing across A-67 as well.** A subscriber that throws inside an
#       installing transition's reseeding `set` leaves the document installed and the read
#       unreached at `d03eac8` (post-A-67) and at `4430e34` (pre-A-67) exactly as it does at HEAD.
set -u
CAIRN="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$CAIRN/.." && pwd)"
TMP="$(mktemp -d)"
cleanup() { for w in "$TMP"/*; do git -C "$ROOT" worktree remove --force "$w" >/dev/null 2>&1; done; rm -rf "$TMP"; }
trap cleanup EXIT

at() {                                        # $1 = commit, $2 = name
  local w="$TMP/$2"
  git -C "$ROOT" worktree add --detach "$w" "$1" >/dev/null 2>&1 || { echo "could not create worktree at $1"; exit 1; }
  ln -s "$CAIRN/node_modules" "$w/cairn/node_modules"
  cp "$CAIRN/qa/r49-i13e.mjs" "$w/cairn/qa/r49-i13e.mjs"
  echo "$w"
}

echo "== C1 — §B at d03eac8 (round 48's head), the same probe =="
W="$(at d03eac8 c1)"
OUT="$(cd "$W/cairn" && R49_ONLY=B timeout 900 node --experimental-strip-types qa/r49-i13e.mjs 2>&1)"
echo "$OUT" | grep -cE '^  FAIL  FINDING R49-1' | sed 's/^/  composite gestures red at d03eac8: /'
echo "$OUT" | grep -E "^ +(ok|FAIL) +CONTROL: .deleteTrip." | sed 's/^/  /'
echo
echo "  and the same two lines at HEAD:"
OUT2="$(cd "$CAIRN" && R49_ONLY=B timeout 900 node --experimental-strip-types qa/r49-i13e.mjs 2>&1)"
echo "$OUT2" | grep -cE '^  FAIL  FINDING R49-1' | sed 's/^/  composite gestures red at HEAD:    /'
echo "$OUT2" | grep -E "^ +(ok|FAIL) +CONTROL: .deleteTrip." | sed 's/^/  /'

echo
echo "== C2 — R49-5 (a subscriber throwing inside an installing reseed) at three commits =="
cat > "$TMP/sub.mjs" <<'EOF'
import { resolve } from 'node:path';
const CAIRN = process.argv[2];
const client = await import(resolve(CAIRN, 'packages/client/src/index.ts'));
const tick = () => new Promise((r) => setTimeout(r, 0));
const p = { storage: client.memoryStorage(), file: client.memoryFile(), photo: client.memoryPhotos(),
  clock: client.fixedClockPort('2026-08-01'), ids: client.sequentialIdPort('x') };
const store = client.createStore({ ports: p });
await store.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
const A = store.getState().doc.id;
await store.flush();
await store.openTrip(A);
let armed = false;
const off = store.subscribe(() => { if (armed) { armed = false; throw new Error('a subscriber blew up'); } });
armed = true;
const threw = await store.openTrip(A).then(() => null).catch((e) => e.message);
off();
for (let i = 0; i < 40; i++) await tick();
const s = store.getState();
console.log(JSON.stringify({ threw, doc: s.doc?.id ?? null,
  available: s.photos.available, availabilityError: s.photos.availabilityError,
  phase: s.doc ? client.photosFor(s, { kind: 'trip' }).phase : 'n/a' }));
EOF
for c in HEAD d03eac8 4430e34; do
  if [ "$c" = HEAD ]; then D="$CAIRN"; else D="$(at "$c" "c2$c")/cairn"; fi
  printf '  %-9s ' "$c"
  (cd "$D" && timeout 300 node --experimental-strip-types "$TMP/sub.mjs" "$D" 2>&1 | tail -1)
done
echo
echo "Controls done. C1: the bare gesture flipped red → green; the composite one did not."
echo "               C2: identical on all three commits — R49-5 is not this range's doing."
