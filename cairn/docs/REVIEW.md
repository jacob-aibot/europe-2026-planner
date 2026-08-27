# Cairn — Phase 1 review

> **Status: CURRENT.** Manager, stage 4. Reviewed `master` @ `82c1a4f`, 2026-08-27, Node v22.22.2,
> Chromium via the system Playwright over real elapsed time. **Verdict: SEND BACK** — **one
> blocker, one ruling, nothing else.** Every claim below has a command in **Verified** that I ran
> myself.
>
> The previous `REVIEW.md` (round 2, `8a65a53`, SEND BACK) is superseded by this document and is
> preserved in git history. Its routing table is closed: **B-1 … B-7 and A-1 … A-4 are all
> verified done, by me, in this pass.** Nothing from it is re-opened here.

---

## Verdict: **SEND BACK**

Everything the last gate sent back has come back built, and I checked it as a user rather than
as a diff. The three features that were named-but-absent are on the screen: Aug 8 now reads
*"departs 14:30 · 1h 20m · arrives 15:50"*, the ten `unknown` stops carry a control that
actually dispatches, a dismissed conflict comes back **live** through the app's own dispatch
path, and the credit line renders in the Optional panel and the stop editor as well as the day
view and the browse pane. `dist/` no longer carries Jacob's FlixBus reference. `cli export` no
longer walks out of `cairn/` through a symlink. Four further adversarial rounds (8 → 11) closed
a chain of six findings — A-5, A-5a, A-5b, A-6, A-6a, then R10-3 and R10-2 — and I re-ran every
one of their probes unedited and unassisted: `qa/r10-mergeundo.mjs` **0 FAIL**,
`qa/r10-prune.mjs` **ALL OK**, `qa/r9-geo.mjs` **ALL OK**, `qa/r8-views.mjs` **0 FAIL in
Chromium with zero page errors**. `npm run test:tap` really is **426 / 0** and `npm run
typecheck` really is clean. That is the real state and it is not in question.

It goes back for exactly one thing.

### R11-1 blocks, and it blocks on the criterion the phase wrote for itself

**A merge can commit a document to storage that the store never installs, and then hand the
write fence to it — after which the user's own next autosave overwrites another writer's saved
edit, silently, with the chip reading *Saved*.**

`doMerge` (`packages/client/src/store/store.ts:589`) captures `doc` at entry and passes it to
`writeAndSettle` as `startedFrom`, with `merged.trip` as `toWrite`. The write commits. Then
`stillOurs` (`:419`) finds `state.doc !== startedFrom` — the user dispatched something in the
interval — so the merged document is **not** installed in memory (`:422`). But `savedDoc` and
`savedVersion` are updated to the merged document and the version it just minted (`:429-431`)
regardless, and `:437` re-arms the ordinary debounce. That debounced write then carries the
**local, un-merged** document under a `savedVersion` minted by a document that is not its
ancestor. The fence has nothing to object to, because this tab owns that version. The other
tab's edit is gone from storage, unrecoverably, and `persistence.status` is `'idle'`.

This is the only one of `writeAndSettle`'s three call sites where `startedFrom !== toWrite`
(`:373`, `:602`, `:634` — I checked all three). On the two autosave sites `!stillOurs` →
`scheduleSave()` is correct: the newer document descends from the one just written, so writing
it forward is right. On the merge site it is not, and that asymmetry is the whole defect.

**I widened the finding.** The breaker recorded the window as *"the ~tens-of-milliseconds a
merge write is in flight"*. It is not. `startedFrom` is captured at `:590`, **before** `await
ports.storage.load(doc.id)` at `:592`, so the window is the whole of `doMerge`: a 234 KB
IndexedDB read, `fromJSON`, `mergeTrips`, `toJSON`, whatever is already queued ahead of it on
`chainOntoSaving`, and only then the write. I reproduced the loss with the **`load()`** gated
and the write untouched, and again with the shipped 400 ms debounce and **no explicit flush at
all** — the loss lands through the ordinary autosave with the user doing nothing after the one
keystroke. CPU floor alone on the real fixture is 5.7 ms before either IndexedDB round trip; if
an autosave was already queued when the button was pressed, the window is unbounded.

**Reachability, stated honestly.** I did not land it in Chromium either, and it is a race rather
than a keystroke sequence. What I did establish: nothing in `apps/web` disables the editing
surface during a save (`grep disabled apps/web/src` returns only form validity and the
undo/redo/export buttons), the merge banner is not modal and sits above a fully live day view,
and *one* dispatch is enough — a single ↑/↓ reorder click qualifies. The path is reached only
while a *"Not saved — edited elsewhere"* banner is on screen, which is precisely the moment a
user is most likely to keep working rather than sit still.

**Why that is enough to block.** ROADMAP's NO SILENT LOSS criterion is one sentence — *"a user's
edit is never discarded, overwritten, or made unreachable without the app saying so, on screen,
at the moment it happens"* — and it is written as a property of the write path, not as a
probability. Four of this phase's blockers (F-1, F-2, R2-1, R2-2) and both of round 10's are
violations of that sentence, and every one of them was argued down to "narrow" at some point.
I am not shipping a seventh over a window measured in milliseconds when the loss is another
person's work, in storage, with the UI saying *Saved*.

### Not a regression, and not the tester's fault

R11-1 reproduces byte-identically at `83627f7` — I take the breaker's word for that and the
mechanism makes it obvious, since neither the R10-3 nor the R10-2 diff touches `:419-437`. It
is a pre-existing hole in the original `mergeWithStored`/`writeAndSettle` design, found because
round 11 went looking. The breaker did the right thing filing it and declining to patch it.

---

## Routing

**Architect first, and the builder does not start until the ruling lands.** This is a design
question — what a merge write owes a document the user has kept editing since the merge
began — of exactly the class §2.2a's merge row already answered once.

### Architect — one ruling, `A-7`

**A-7. Rule on the merge write whose document was never installed (QA R11-1).**

The defect in one sentence, for the ruling to reason from: `writeAndSettle` advances
`persistence.savedDoc` and `persistence.savedVersion` to a document that `state.doc` is not,
and is not descended from, and then re-arms a write that inherits that fence.

**Deliverable — all four, in `ARCHITECTURE.md` §4.2 (rule 4 or a new 4a) and §2.2a's *Merge*
row, which today says only *"On success the merged write mints a new version, which becomes
`savedVersion`, and `baseDoc` becomes the merged document"* and does not contemplate the branch
where it does not:**

1. **State the invariant the code must satisfy**, not the patch. The shape I would expect, and
   you may overrule it: *`savedDoc` and `savedVersion` may only be advanced together to a
   document that is `state.doc` or an ancestor of `state.doc` along this store's own edit
   chain.* Today they are advanced to `toWrite` unconditionally, which is true of the two
   autosave sites and false of the merge site.
2. **Decide what happens to the merge result.** Three options are on the table and the ruling
   picks one and says why: re-queue the merge against the document the user now holds
   (`mergeTrips(savedDoc, state.doc, merged.trip)` — cheap, 1.3 ms on the real fixture, but it
   is a second merge the user did not press a button for); refuse — leave `status:'conflict'`
   with the user's edit intact and make them press *Merge and save* again (honest, matches rule
   6b's "the transition does not happen", costs a click); or install the merged document and
   surface the loss of the in-flight keystroke (rejected on sight, I think — it discards the
   user's content, which §4.2 rule 6b already refuses in the transition case for stated reasons).
3. **Say what the fence does in the meantime**, explicitly. The failure is not the merge
   result being discarded — it is `savedVersion` moving anyway. Whatever option 2 picks, state
   whether the store may keep a version minted by a write whose document it declined to install.
4. **Note the window's real width in the ruling**, because a future reader will otherwise
   re-derive it wrong as the breaker and I both nearly did: `startedFrom` is captured before
   `load()`, so the exposure is the whole of `doMerge`, not the write.

**Second item on the same ruling, only if it falls out of it: R8-4.** `doMerge`'s off-chain
`load()` at `:592` lets a merge already in flight resurrect a trip the delete link just removed
— MAJOR, open since round 8, unreachable in the shipped UI (I confirmed: `deleteTrip` appears
only at `Library.tsx:101`, and `App.tsx` renders `Library` only when `state.doc === null`).
It is the same function and the same root shape — state read across `doMerge`'s three awaits —
so if A-7's ruling naturally covers it, close it. **Do not widen A-7's scope to reach it if it
does not.** R8-4 rides otherwise, on the reachability argument, unchanged.

**Not routed to you, deliberately:** R8-3, R10-1, and everything on the *What rides* list below.
Do not adjudicate them in this pass.

### Builder — nothing yet

**Do not start.** When A-7 lands: implement it in `packages/client/src/store/store.ts`
(`writeAndSettle` `:395-437` and `doMerge` `:589-649`), add a `KD-` entry, and write the
regression **on the bytes the port holds**, not on `state` — the exact shape of
`qa/r11-recheck.mjs` §1.3b, the control with **zero** undo calls, plus my `load()`-gated variant
(gate `load` rather than `saveIfVersion`, type during the read; it loses the same edit and it is
the wider window). The suite is 426/0 today; that is your baseline.

### Breaker — three items, and two of them are on the finding you filed

1. **Correct R11-1's window claim in `QA-FINDINGS.md`.** The entry says the loss needs a
   keystroke while *"the merge write is in flight"*. `doMerge:590` captures `startedFrom` before
   `await ports.storage.load()` at `:592`, so the window is load + parse + merge + serialize +
   queue + write. My probe gating `load()` instead of `saveIfVersion` loses the same edit. A
   BLOCKER's own reachability paragraph understating its window by an IndexedDB read and a
   234 KB parse is the kind of thing that gets a finding argued down; fix the row.
2. **Attempt the browser leg you marked UNVERIFIED.** Two tabs, a real conflict, click *Merge
   and save*, then a single ↓ reorder click in `DayTimeline` inside the window, then read
   IndexedDB. `qa/r7-browser.mjs` already drives the merge sequence and `qa/r10-editdoor.mjs`
   already reads the record back out — the two halves exist. If it will not land by hand, say
   so with the number of attempts and the measured window, and the finding stands on the
   mechanism as it does now.
3. **After the fix, re-run the standing set against my counts** in **Verified** below, which are
   my own runs at `82c1a4f`, not the builder's: `r10-mergeundo` 0, `r10-prune` ALL OK, `r9-geo`
   ALL OK, `r8-views` 0 (Chromium), `r7-chain` 2, `r6-flush` 2, `r3-pool` 3, `r3-cas2` 3,
   `r6-actor` 5, `r2-constraints` 2, `r10-redo` 3, `r9-ledger` 2, `r8-geo` 1, `r8-persist` 1,
   and 0 for `r3-undo`, `r3-loss`, `r4-switch`, `r2-copy`, `r3-merge`, `r2-resolutions`,
   `r2-data`, `r2-access`, `r2-redact`.

*(One framing note, not a routing. Round 11's gate row states the whole board, which is what
round 8's review asked for and it is right. It stops short of a recommendation, where rounds 9
and 10 gave one. Give one; a round that files a BLOCKER and does not say what it thinks the gate
should do is making the manager guess.)*

**Probe repair, still owed and still not urgent:** `qa/r6-flush.mjs` §6's static check and
`qa/r7-chain.mjs`'s hardcoded structural counts have been reporting stale assertions since
rounds 7 and 8, and `qa/r5-freshness.mjs:602` / `qa/r2-copy2.mjs:86` / `qa/r2-import.mjs:51`
have been dead for longer. Your ruling that this belongs in a commit of its own is right and
still stands. It has now survived four rounds of being right; do it before the next round or
strike the probes.

### What rides — accepted as Phase 1 residue, not to be worked

I am not manufacturing work. These stay open, each with the reason, each already disclosed:

- **R8-3** (MAJOR) — accepting a copied stop can *replace* the `adjacent_day` anchor and mint a
  blocker on a stop the user wrote. Unreachable: `acceptCandidate` is dispatched by no control
  in `apps/web` (my own grep). Real, and it violates A-1's monotonicity claim. **Its trigger is
  explicit: it must be ruled on before any accept control ships.**
- **R8-4** (MAJOR) — see the architect note above. Unreachable today (confirmed by me).
- **R10-1** (MINOR) — two Ctrl+Z's make A-5b clause 2 decline; the render is identical to the one
  the user was already looking at, and pressing *Not a problem* again works.
- **`acceptCandidate` has no control in the app**, so a copied stop stays badged *from a friend*
  forever. It fails safe, it is on BUILD-NOTES §3, and ROADMAP §4.5's may-not-be-stubbed list
  does not name it. Not routed — but it is named to Jacob below, because he will notice it.
- **The round-7 MINOR list** (R5-3, R5-4, R3-6…R3-9, R2-13…R2-21, the five `r6-actor`
  residuals) and everything ROADMAP scopes to Phase 2 (RLS enforcement, sync, real friends,
  share revocation).
- **§6.6's stated cost:** the shipped sample is still recognisably Jacob's trip. Credentials are
  stripped by rule; personal prose is not, deliberately. Already a Phase 2 exit condition.

---

## Verified — what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `82c1a4f`. `git status --porcelain` was
empty before and after; `md5sum europe-2026-itinerary.html` = `7c69df3208ef91c8be0fb59a56443188`
before and after. The read-only boundary held through the full suite, a web build, two Chromium
sessions and ~25 probe runs.

| # | Command | Result |
|---|---|---|
| 1 | `npm run test:tap \| grep '^# '` | `# tests 426 · # pass 426 · # fail 0` — **BUILD-NOTES and QA round 11 are accurate** |
| 2 | `npm run typecheck` | exit 0, both projects, `pretypecheck` generates the sample first |
| 3 | `git diff --stat 8a65a53..82c1a4f -- package.json tsconfig.json apps/web/tsconfig.json apps/web/package.json` | **empty** — no build-config drift since the fresh-clone check at `8a65a53`, so criterion E's clean-clone clause still holds by inspection |
| 4 | `npm run web:build` | clean |
| 5 | `node qa/r11-recheck.mjs` | **2 FAIL, both R11-1** (§1.3b the zero-undo CONTROL, §1.3c). Everything else in §1 and §2 ok. **The finding reproduces on my own run** |
| 6 | my own probe: gate `load()` instead of `saveIfVersion`, one dispatch during the read, **400 ms debounce, no explicit flush** | `stored title=""` — tab B's saved title **destroyed**, `status: idle`. **The window is the whole of `doMerge`, not the write; and the loss lands through the ordinary autosave.** Wider than the breaker recorded |
| 7 | measured `doMerge`'s CPU legs on the real fixture | document **233 801 bytes**; `toJSON` 1.4 ms, `fromJSON` 1.6 ms, `mergeTrips` 1.3 ms → **5.7 ms CPU floor before either IndexedDB round trip**, plus anything queued ahead on `chainOntoSaving` |
| 8 | read `store.ts:395-437`, `:589-649`; `grep -n 'writeAndSettle('` | **three call sites**; only `:634` (the merge branch) has `startedFrom !== toWrite`. That asymmetry is R11-1, confirmed by reading, not by the doc |
| 9 | `grep -rn disabled apps/web/src --include=*.tsx` | only form validity and the undo/redo/export buttons. **Nothing disables editing during a save** — the window is open in the shipped UI |
| 10 | `node qa/r10-mergeundo.mjs` | **0 FAIL** — R10-3 closed on my own run; storage keeps `title="OTHER TAB"` after the merge + Ctrl+Z |
| 11 | `node qa/r10-prune.mjs` | **ALL OK** — R10-2 closed; §5.1 on the real fixture reports **2 blockers**, both `legacy_flag` |
| 12 | `node qa/r9-geo.mjs` | **ALL OK** — A-6a holds |
| 13 | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-views.mjs` | **0 FAIL, zero page errors**, my own Chromium run. Aug 8 renders `departs 14:30 · 1h 20m · arrives 15:50`; an `unknown` stop renders the control and one tap dispatches (4 → 3); the Optional panel and the stop editor both render *from a friend* **and** *From "Europe 2026"*; a dismissed conflict comes back **live**. **B-1, B-2, B-3 are real** |
| 14 | probe board, my own runs | `r3-undo` `r3-loss` `r4-switch` `r2-copy` `r3-merge` `r2-resolutions` `r2-data` `r2-access` `r2-redact` = **0 FAIL each**; `r7-chain` 2, `r6-flush` 2, `r3-pool` 3, `r3-cas2` 3, `r6-actor` 5, `r2-constraints` 2, `r10-redo` 3 (R10-1), `r9-ledger` 2 (R10-1), `r8-geo` 1 (R8-3), `r8-persist` 1 (R8-4) — **identical to the disclosed board**, no undisclosed FAIL anywhere |
| 15 | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS.** 3 hits over 108 derived tokens, all `OPTIONAL` / `BOOKINGS` — the two named non-credentials of KD-27. **`Booking 338 441 5948` and `DE4345` are gone from `dist/`.** B-5 holds |
| 16 | `Object.keys()` on `packages/core/src/index.ts` | **70 runtime symbols** — §2.10 and criterion E agree, one list. A-4 holds |
| 17 | `node cli.ts trip` | `16 days · 112 scheduled · 31 pooled · 95 places · 21 bookings`; `2 blockers, 4 warnings, 11 notes`; `1 error, 10 warnings`. **Section A unmoved** |
| 18 | `node cli.ts conflicts` | both blockers are `legacy_flag`, Aug 18 and Aug 20, each carrying Jacob's own words. **No third blocker after four rounds of copy-path rulings** |
| 19 | `grep -n 'realpath\|safeWritePath' cli.ts`; `grep -n symlink test/cli.test.ts` | `realpathSync` on the parent **and** on an existing target; two symlink-escape tests in the suite that passed in run #1. B-7 holds |
| 20 | `grep -rn 'deleteTrip\|acceptCandidate' apps/web/src --include=*.tsx` | `deleteTrip` only at `Library.tsx:101`; `acceptCandidate` **nowhere**. R8-3's and R8-4's unreachability claims are true, on my own evidence |

---

## For Jacob

**Where this actually stands.** Everything that went back last time came back, and I checked it
by using the app rather than by reading the diff. Open Aug 8 and the Condor flight now reads
*"departs 14:30 · 1h 20m · arrives 15:50"* — it no longer looks like you land at 14:30. The ten
stops where the app genuinely can't tell whether a time is a departure or an arrival now ask
you, with two buttons, and answering sticks. Dismiss a conflict, change the plan so it goes
away, change your mind back, and it returns **live** rather than pre-dismissed. Copy a stop
between trips and the *"From Europe 2026"* credit follows it into every list it appears in. Your
FlixBus booking reference is out of the build. And three more rounds of hard adversarial work
went into the save path since you last saw this — six separate ways to lose an edit were found
and closed, and I re-ran every one of those tests myself.

**Why it is going back, and it is one thing.** There is a specific, narrow moment where the app
can throw away somebody else's saved work without telling anyone. It needs you to have the trip
open in two places (two windows, or a laptop and a phone later on), for the app to notice they
disagree, for you to press **Merge and save** — and then to keep typing during the fraction of a
second the merge takes. If you do, the merge result gets written to disk and then immediately
overwritten by what was on your screen, and the app says *Saved*. The other window's edit is
gone and there is no way back to it.

That window is milliseconds long and I could not reproduce it by hand in a browser — only by
holding the save open artificially. But the reason I'm not letting it ship is that this is the
exact thing we wrote a rule against at the start of this project — *"never lose a user's edit
without saying so, on screen, at the moment it happens"* — and six of this phase's seven
worst bugs have been that same rule broken in a different place. Every one of them looked
narrow until somebody hit it. I would rather spend one design decision and a day than explain
this to you after it eats a day of planning.

**Nothing needs a decision from you.** It is ours to fix; the design question is ours to answer;
none of it changes anything you've settled.

Two things worth *knowing* rather than deciding:

- **You can't yet "accept" a copied stop.** Copy an activity from one of your trips into
  another and it stays labelled *from a friend* forever — there's no button that says "yes, this
  is mine now". That's deliberately the safe direction (nothing of anyone else's ever gets
  presented as yours), it's written down, and it's cheap to add. Say the word if you'd like it
  in before Phase 2 and we'll pull it forward; otherwise it goes with the accounts work.
- **The demo trip is still recognisably yours.** Door PINs, booking references and ticket links
  are stripped by rule and I re-verified that the build is clean. Your prose is not stripped —
  on purpose, while this runs on our machines. The day it serves a public page it has to become
  an invented trip, and that's already written down as a Phase 2 exit condition.

The work left is one architect ruling and one builder change with a regression test, then one
QA round pointed at the merge path. Days, not weeks. I'd expect the next thing you hear about
Phase 1 to be that it shipped.
