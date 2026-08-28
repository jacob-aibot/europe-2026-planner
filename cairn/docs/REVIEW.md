# Cairn — Phase 1 review

> **Status: CURRENT.** Manager, stage 4. Reviewed `master` @ `218c7f0`, 2026-08-27, Node v22.22.2,
> Chromium via the system Playwright over real elapsed time. **Verdict: SHIP. Phase 1 is closed.**
> Every claim below has a command in **Verified** that I ran myself, on this tree.
>
> The previous `REVIEW.md` (`82c1a4f`, SEND BACK on R11-1) is superseded by this document and is
> preserved in git history. Its routing is closed: **A-7 is ruled (ARCHITECTURE revision 8) and
> built (`218c7f0`), and I re-verified it against my own oracle rather than against the finding.**
> The two review items that rode with it — R8-4 and the *What rides* list — are unchanged and are
> carried forward below as disclosed Phase 2 entry items.

---

## Verdict: **SHIP**

Phase 1 is done. The engine, the client state machine and the web client deliver what the brief
and ROADMAP §4.5 name, the one blocker that held the last gate is closed, and nothing else that
is open is a data-loss, privacy or wrong-person's-data path.

### R11-1 / A-7 is closed, and I proved it with my own probe, not with the builder's

The ruling (ARCHITECTURE §2.2a **A-7**, §4.2 rule 4a) is implemented exactly as written, both
mechanisms, in the two places the ruling names and nowhere else:

- `packages/client/src/store/store.ts:432` — `if (!stillOurs && toWrite !== startedFrom)` sits
  immediately after `stillOurs` (`:419`) and before the `set` at `:440`: it upserts the library
  row from the write's own summary, sets `'conflict'` with the existing `CONFLICT_MESSAGE`, and
  returns. No install, no fence advance, no re-arm, no `lastMerge`.
- `store.ts:657` — `if (state.doc !== doc)` at the top of `doMerge`'s `chainOntoSaving`
  callback, **inside** the link and before the `try`, so the wide half of the window (the
  IndexedDB read, `fromJSON`, `mergeTrips`, `toJSON`, and anything queued ahead on the chain)
  is closed without a write being attempted at all.
- The deleted-trip branch (`:620-629`) is **not** modified, which A-7's scope paragraph
  explicitly requires — R8-4 rides on its own reachability argument and was not folded in.

I did not take the fix on the tests that ship with it. I wrote my own probe
(scratch, not committed) reproducing the measurement I made at the last gate — gate `load()`,
type during the read, then the **real 400 ms debounce with no explicit `flush()`** — and the
same again gating `saveIfVersion`. Against `218c7f0`: the other tab's edit survives in storage,
`savedVersion`/`savedDoc` do **not** move, `status` is `'conflict'`, `isDirty()` is true, the
local edit is still in `doc`, and a second press of *Merge and save* converges on both writers'
edits. Against the same probe with `store.ts` reverted to `bcf2beb` in a scratch worktree:
**8 FAIL**, `stored title=""` with `status=idle` — the loss, with the chip on *Saved*. That is a
red/green on an oracle the builder did not write.

The two ceilings hold, which is what stops the fix being a regression: the ordinary merge still
installs, still advances the fence, still reads `'idle'` with a `lastMerge` notice (in Node
**and** in real Chromium — `qa/r7-browser.mjs` drives the merge through the UI and both tabs'
edits are in IndexedDB with the chip reading *Saved*), and an edit landing during an **ordinary**
autosave still advances the fence and still re-arms.

### The breaker stage, stated honestly

**No full breaker round ran against the A-7 diff.** A targeted re-verification did. I am the gate
and that is my call to make, so here is the reasoning rather than an assertion: rounds 8, 9, 10
and 11 each found the shipped ruling correct and one adjacent door open, so the base rate says
attack the neighbourhood. I attacked it myself instead of ordering a round — five adjacent doors
after an A-7 refusal, all with real timers and all asserted on stored bytes: `closeTrip` (rule 6b
aborts, nothing lost), two `undo`s (storage intact), five further edits (every later autosave
refused by the fence), a **third** writer landing inside the merge window (not clobbered, the
conflict stands), and a concurrent merge against a concurrent write (no state where both edits
are gone). All clean. Plus the whole standing probe board, the 200-step dirty walk under three
seeds, and the full suite.

The residual risk is real but bounded: A-7 only ever *refuses*, in one branch, and its two
failure modes are "still loses data" (falsified twice, independently) and "over-refuses"
(falsified in Node and in a browser). I am not sending a phase back for a ceremonial round after
red/greening the fix on my own oracle. **Trigger, written down rather than left implicit: Phase
2's first breaker round takes `doMerge`/`writeAndSettle` as a named target**, because that is
where R3-3, R7-1, R8-4, R10-3 and R11-1 all lived.

---

## Routing

**Nothing is routed for Phase 1. Do not open a builder, breaker or architect task against this
verdict.** The items below are Phase 2 *entry* items, listed so nobody re-derives them, each
already disclosed by the agent that found it.

### Carried to Phase 2 — architect, at the point named, not now

- **R8-3** (MAJOR, unreachable today). Accepting a copied stop can *replace* the `adjacent_day`
  anchor and mint a `geo_outlier` blocker on a stop the user wrote. It violates A-1's
  monotonicity claim. **Trigger: it must be ruled on before any `acceptCandidate` control ships
  in `apps/web`** — and shipping that control is the cheap Phase 2 item Jacob may pull forward,
  so these two move together.
- **R8-4** (MAJOR, unreachable today). `doMerge`'s off-chain `load()` at `:612` lets a merge
  already in flight resurrect a trip the delete link just removed. A-7 deliberately did not
  reach it (its scope paragraph says so). **Trigger: whenever `deleteTrip` becomes reachable
  with a trip open, or when the `SyncPort` gives `load()` a second source.**
- **R10-1** (MINOR). Two Ctrl+Z's make A-5b clause 2 decline; either bless clause 2 or extend
  the rule. The render is identical to the one the user was already looking at.

### Carried to Phase 2 — breaker, before its first round

- **Probe repair, now five rounds overdue.** `qa/r6-flush.mjs` §6's static check and
  `qa/r7-chain.mjs`'s hardcoded structural counts report stale assertions, not defects;
  `qa/r5-freshness.mjs:602`, `qa/r2-copy2.mjs:86` and `qa/r2-import.mjs:51` are dead. Their
  FAIL counts are load-bearing in every status note in `QA-FINDINGS.md`, so a stale one costs a
  future round real time. Repair them in a commit of their own, or strike them.
- **`QA-FINDINGS.md`'s R11-1 row still records the window as *"the merge write is in flight"***.
  The authoritative statement is now ARCHITECTURE §2.2a A-7 (whole of `doMerge`); the QA row is
  the record of a closed finding and understates it. Correct it when you next touch the file.

### Carried to Phase 2 — builder, in the next pass that touches the file

- **`BUILD-NOTES.md` §4's table is stale in two rows**: *"Tests 387 pass"* (now 432) and
  *"Export surface 69 runtime symbols = §2.10's 69"* (now **70**, since A-5 added
  `reassertRetirements`). The status note at the top supersedes it and `cairn/CLAUDE.md`'s doc-cost
  map warns readers to check that note first, so this is disclosed debt rather than a false
  claim — but a number that is wrong on its face is worth one line to fix. No KD entry was added
  for A-7; none was owed, because the code matches the ruling with no divergence, and the status
  note carries the disclosure §1 exists for.

### What ships as a known, non-blocking limitation

Each is real, each is disclosed by the design or by an agent, none blocks the phase:

- **`acceptCandidate` is reachable from no control in `apps/web`**, so a copied stop stays badged
  *from a friend* forever. It fails safe — nothing of anyone else's is ever presented as Jacob's
  own — and ROADMAP §4.5's may-not-be-stubbed list does not name it. **Jacob's call** (below).
- **§6.6's stated cost:** the shipped sample is still recognisably Jacob's trip. Credentials are
  stripped by rule and the build is verified clean; personal prose is deliberately not stripped.
  Already a Phase 2 exit condition — the day a public host serves this build, the sample must be
  an invented trip.
- **A passively stale tab still reads "Saved"** (BUILD-NOTES §6). It holds an older document and
  nothing notifies it; its next write is refused, so no edit is at risk. Closing it properly
  needs cross-tab notification, which Phase 1 does not have.
- **The round-7 MINOR list** — R5-3, R5-4, R3-6…R3-9, R2-13…R2-21 and the five `r6-actor`
  residuals — unchanged and re-run this pass at exactly their disclosed counts.
- **Unverified environments, named rather than implied:** Safari and iOS (everything was driven
  in Chromium), real IndexedDB under quota exhaustion, map tiles (this sandbox has no route to
  `tile.openstreetmap.org`), `crypto.getRandomValues` over plain HTTP from a LAN address, and
  Node 24 (this environment is Node 22.22.2; `engines` says `>=22.18`).
- **Phase 2 scope by design:** RLS enforcement, sync, real friends, share revocation.

---

## Verified — what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `218c7f0`, in sync with `origin/master`.
`git status --porcelain` was **empty** before and after; `md5sum europe-2026-itinerary.html` =
`7c69df3208ef91c8be0fb59a56443188` before and after. The read-only boundary held through the full
suite, a web build, two Chromium sessions and ~30 probe runs.

| # | Command | Result |
|---|---|---|
| 1 | `npm run test:tap` | `# tests 432 · # pass 432 · # fail 0`, zero `not ok`. **BUILD-NOTES' number is accurate** |
| 2 | `npm run typecheck` | exit 0, both projects; `pretypecheck` regenerated the redacted sample first |
| 3 | `git diff --stat bcf2beb..218c7f0` | **5 files**: `store.ts` (+33), `merge-race.test.ts` (+223), and the three docs. **Exactly what A-7 authorized — no other product file moved** |
| 4 | read `store.ts:419-458`, `:609-682`; `grep -n 'writeAndSettle('` | Both A-7 mechanisms present, in the ruling's two places; the deleted-trip branch at `:620-629` **untouched** (R8-4 not folded in); three call sites, only `:667` has `startedFrom !== toWrite` |
| 5 | `node --test packages/client/test/merge-race.test.ts` | **12 pass / 0 fail**. The six new tests map 1:1 onto A-7's table of six and every one asserts on `core.fromJSON(<the port's bytes>)` |
| 6 | same file against `store.ts` reverted to `bcf2beb` (scratch worktree) | **exactly 4 fail** — cases 2, 3, 4, 5 — and the two ceilings pass either way, which is correct. **The builder's red/green claim is true and the tests are aimed at the real defect** |
| 7 | **my own probe**: gate `load()`, dispatch during the read, **real 400 ms debounce, no explicit flush**; then the same gating `saveIfVersion` | **0 FAIL.** `stored title="OTHER TAB"`, `savedVersion`/`savedDoc` unmoved, `status=conflict`, `isDirty()=true`, the local edit still in `doc`, and a second press converges on both edits |
| 8 | the same probe against `bcf2beb`'s `store.ts` | **8 FAIL** — `stored title=""` with `status=idle`. The loss reproduces on my own oracle and is closed by this fix |
| 9 | **my own adjacent-door probe** after an A-7 refusal: `closeTrip`, two `undo`s, five further edits, a **third** writer inside the window, a concurrent merge vs. a concurrent write | **0 FAIL.** Rule 6b aborts the transition with nothing lost; storage never regresses; every later autosave is refused by the fence; the third writer is not clobbered |
| 10 | `node qa/r11-recheck.mjs` | **0 FAIL** (was 2, both R11-1). §1.3b — the zero-undo control — now reports `stored title="OTHER TAB" status=conflict` |
| 11 | probe board, all my own runs | `r3-undo` `r3-loss` `r4-switch` `r2-copy` `r3-merge` `r2-resolutions` `r2-data` `r2-access` `r10-mergeundo` `r10-prune` `r9-geo` = **0 FAIL each**; `r10-redo` 3, `r9-ledger` 2, `r8-geo` 1, `r8-persist` 1, `r7-chain` 2, `r6-flush` 2, `r3-pool` 3, `r3-cas2` 3, `r6-actor` 5, `r2-constraints` 2 — **identical to the disclosed board. No undisclosed FAIL anywhere, no regression in the previously-closed chain** |
| 12 | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-views.mjs` | **0 FAIL, zero page errors**, my own Chromium run. Aug 8 renders `departs 14:30 · 1h 20m · arrives 15:50`; an `unknown` stop's control dispatches; the Optional panel and stop editor render *from a friend* **and** *From "Europe 2026"*; a dismissed conflict comes back **live**; the *Not saved* banner offers Retry and Export this copy. **B-1, B-2, B-3 still real** |
| 13 | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r7-browser.mjs` | **0 FAIL.** The merge driven through the real UI keeps **both** tabs' edits in IndexedDB and the chip reads *Saved*, at four press gaps. **A-7 does not over-refuse the ordinary merge in a browser** |
| 14 | `CAIRN_WALK_SEED={1,4242,20260827} node --test packages/client/test/dirty.test.ts` | 15 pass / 0 fail each. The 200-step oracle walk (`isDirty() === (toJSON(doc) !== the port's bytes)`) still holds under A-7 |
| 15 | `npm run web:build` | clean |
| 16 | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS.** 3 hits over 108 derived tokens, all `OPTIONAL`/`BOOKINGS` — KD-27's two named non-credentials. No PIN, no reference, no ticket URL in `dist/` |
| 17 | `Object.keys()` on `packages/core/src/index.ts` | **70 runtime symbols** — §2.10 and criterion E agree. A-7 added none, as specified |
| 18 | `node cli.ts trip` / `node cli.ts conflicts` | `16 days · 112 scheduled · 31 pooled · 95 places · 21 bookings`; `2 blockers, 4 warnings, 11 notes`; `1 error, 10 warnings`. Both blockers are `legacy_flag` — Jacob's own Aug 18 and Aug 20 flags. **No third blocker after five rounds of copy-path rulings** |
| 19 | `grep -rn 'acceptCandidate\|deleteTrip' apps/web/src --include=*.tsx` | `deleteTrip` only at `Library.tsx:101`; `acceptCandidate` **nowhere**. R8-3's and R8-4's unreachability claims still hold, on my own evidence |
| 20 | `git status -sb`, `git worktree list` | `master...origin/master`, in sync, no feature branch. The work is on `master`, per `CLAUDE.md` |

---

## For Jacob

**Phase 1 is done.** Open a browser and you get your real Europe trip, plus any number of other
trips: create one, switch between them, edit days and stops, see them on a map, copy an activity
out of one trip into another with the *"From Europe 2026"* credit following it everywhere it
appears, and get a conflicts panel and a validation report the current HTML page cannot give you.
The conflicts panel shows exactly two things you have to act on — your own Aug 18 and Aug 20 red
flags — and it took five rounds of design rulings to keep it honest at two rather than letting the
app cry wolf.

**The one thing that held it back last time is fixed, and I checked it the hard way.** There was a
moment where, if you had the trip open in two windows and kept typing during the fraction of a
second a merge took, the app could throw away the other window's saved work and still say *Saved*.
It now stops, keeps your typing on screen, tells you the trip was edited elsewhere, and one more
press of *Merge and save* brings both sides together. I reproduced the old bug myself, watched my
own test fail against the old code and pass against the new, and then went looking for four more
ways to reach the same loss around it. None of them worked.

**Nothing here is a stub pretending to be finished.** What is deliberately not built is written
down: no accounts, no server, no sync, no phone app, no email scanning — those are Phases 2 to 4
and always were.

**Two things worth knowing, and one is a decision only you can make.**

- **Decision: do you want an "accept" button before Phase 2?** Today, when you copy an activity
  from one of your trips into another, it stays labelled *from a friend* forever — there is no
  control that says "yes, this is mine now". That is the safe direction (nothing of anyone else's
  is ever shown as yours), but you will notice it the first time you use the feature. It is
  cheap to add, and adding it also forces one small design question we have already written down
  and parked. Say the word and it comes forward; otherwise it ships with the accounts work.
- **The demo trip is still recognisably yours.** Door PINs, booking references and ticket links
  are stripped by a rule with a test behind it, and I re-verified the build is clean today. Your
  prose is not stripped, on purpose, while this only runs on our machines. The day it serves a
  public page it has to become an invented trip — that is already written down as a Phase 2 exit
  condition, not something that can be forgotten.

Next up is Phase 2: accounts, a server, sync between your devices, and friends being able to open
your trip from a link. Phase 1 is closed and shipped.
