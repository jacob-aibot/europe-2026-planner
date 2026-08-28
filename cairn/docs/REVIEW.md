# Cairn — manager reviews

**Two verdicts live in this file, newest first.** Phase 2 step **2a** is the current one; the
Phase 1 verdict below it is **closed and kept for the record**, not superseded — its routing
discharged and its carried items are re-placed in 2a's routing table.

| Verdict | Scope | Commit reviewed | Date | Result |
|---|---|---|---|---|
| **2a — past trips and the lifecycle** (I-0 … I-4a) | `cairn/docs/ROADMAP.md` Phase 2, first of three steps | `67f5588` | 2026-08-28 | **SHIP** |
| **Phase 1** — core engine + local-first client | whole phase | `218c7f0` | 2026-08-27 | **SHIP** (closed) |

---

# Phase 2, step 2a — past trips and the lifecycle

> **Status: CURRENT.** Manager, stage 4. Reviewed `master` @ `67f5588`, 2026-08-28, Node v22.22.2.
> **Verdict: SHIP. 2a is closed; 2b (I-5 … I-8) may open.**
> Scope was I-0 through I-4a and nothing else — I-5 … I-11 are not started and were not judged.
> Every claim below has a command in **Verified — 2a** that I ran myself, on this tree.
>
> **What I did not run:** the Chromium probes (`qa/p2-pasttrip.mjs`, `qa/p2b-past.mjs`,
> `qa/browser*.mjs`, `qa/r8-views.mjs`, `qa/r9-redo.mjs`, `qa/r10-editdoor.mjs`, and the other
> browser-driven files). **`playwright` is not installed in this environment** — `require('playwright')`
> fails with `Cannot find module`. I-4's *"run it in the browser, not only in Node"* clause is
> therefore taken on round 12's and round 13's own Chromium evidence rather than re-derived by me,
> and I say so rather than implying I checked it. Every headless assertion in those probes' Node
> equivalents I did run.

---

## Verdict: **SHIP**

**2a is what `BRIEF.md` and `ARCHITECTURE.md` §8.1–§8.2 say it should be, it is built, and the
reported state is true.** I re-derived every headline number rather than quoting one, and every
one of them reproduced. Nothing named in the 2a row of ROADMAP's three-steps table is missing,
stubbed, or misreported.

Concretely, on my own runs:

- **`lifecycle()`** — pure, in `derive/`, no stored status field, three stages correct at the
  boundaries, and `node cli.ts trip --today 2026-08-27` prints `[completed]` / `stage: completed`.
- **`Trip.datePrecision`** — stored, defaulted, refused when malformed, byte-identical through
  `toJSON(fromJSON(toJSON(t)))`, carried through undo/redo at depth 50, and its grep ceiling is a
  test with **one pinned exemption** (`derive/summary.ts`, which §8.4 names and which carries the
  field without branching on it).
- **The feasibility/integrity rule class** — all ten rules classified per §8.2's table; at a clock
  after `endDate` the reference trip returns **5 findings, 0 of them feasibility**; at the goldens'
  clock it returns the Phase 1 set **unmoved**.
- **The live defect closes.** This is the reason 2a exists and it is the thing I most wanted to see
  fail. It does not: at the real clock the reference trip's two `missing_lodging` warnings go to
  **zero**, and both `legacy_flag` blockers — Jacob's own Aug 18 and Aug 20 flags — stay.
- **The past-trip flow** — a real form, not a stub: 255 lines, wired into `Library.tsx`, dispatching
  only `createTrip` / `setTripMeta` / `setDayMeta`, with lifecycle chips on both `Library` and
  `TripView`. End to end in core, my own run: *"Japan, March 2019 — 東京, 京都"* mints **two distinct
  keys**, 31 dense days, **0 conflicts and 0 validation issues**, round-trip byte-identical.
- **Phase 1's ceiling is unchanged, re-derived not quoted:** 620/620, typecheck clean on both
  projects, goldens and sample byte-identical at sha `40955ca0b182`, 2/4/11 at `FIXTURE_TODAY`,
  `validateTrip` 11, `geoCheck` 0 on the clean trip and 112/112 + 92/94 under the +1° fault,
  **71** exports.

### On I-3a and I-4a's long history, and why I am not adding a round to it

Both were re-opened repeatedly (I-3a through A-9/A-11/A-12/A-13/A-17; I-4a through
A-10/A-14 … A-25, nine breaker rounds). Length is not evidence in either direction, so I judged the
**final state**, and I re-derived the two clauses of A-25 Part 6 that are cheapest to fake and most
expensive to be wrong about:

- **Clause 2, two-sided, in a throwaway worktree at `67f5588`.** Reverting `refileCityKey`'s step-4
  `order` hoist turns `readOnce.test.ts` assertion 1 red with a **one-element** offender list naming
  exactly `15 · three same-named target cities — the step-4 order tie-break: tgtCity1.order ×2` and
  nothing else. Restored, 4/4. The census catches its own subject.
- **Clause 4's null clause, my own mutation.** Planting `homeBase: null` back onto the source fixture
  reds test 4 naming exactly `srcTrip.homeBase` — i.e. the R20-2 blindness A-25 Part 1 was written to
  close is genuinely closed by a test rather than by a docstring. `DECLARED_NULLS` is `{}`.

Worktree removed; `git worktree list` shows none of mine.

**I did not re-derive clauses 1, 3, 5 and 6 a third time, and here is the reason rather than an
assertion.** Clause 1 is a set of ceilings I ran independently anyway (they are in **Verified**
below). Clauses 3, 5 and 6 were each derived twice already — once by the builder in a discarded
worktree (`BUILD-NOTES` on `f515768`) and once, independently and adversarially, by round 21
(`qa/r21-closure.mjs`, `qa/r21-clause3.sh`) — and round 21's own fresh attack of 22 document shapes
beyond the matrix returned 0 throws and 0 unnamed multi-reads. A third derivation of a clause two
independent parties already produced identical numbers for is the work §0.5 warns about: not
distinguishable from progress. What I checked instead is the thing a third derivation could not have
caught — whether the *guard* is live — and both mutations above say it is.

### The residues, checked one at a time

Each is a principled, disclosed boundary rather than something that should have been fixed:

- **A-15's `Stop.links`** — classified out loud, with a key-set assertion so a ninth `Place` field
  cannot travel unclassified. `links` is **dropped entirely**, not emptied. Verified: `qa/r15-place-copy.mjs`
  ALL OK.
- **A-21 Part 3's `toJSON` scope boundary** — drawn around one function with a stated reason, and
  A-25 Part 5 class C draws the identical boundary around `build/stops.ts` with three reasons **and a
  trigger** (the day a `Stop.placement` is built by something other than a person's own hand). A
  boundary with a trigger is a decision; one without is a gap. These have triggers.
- **A-25's classes A, B and C** — A is the skeleton scan (closing it needs `max: 5` on an array,
  which is a licence, not an exception); B is reclassified from "residue" to "floor" under A-24's own
  spread-versus-read discriminator, which is a correction rather than an excuse; C is out of scope with
  a trigger. I confirmed by running that class A's list is now complete by instance as well as by class
  after `67f5588`.

Nothing in that set is a defect wearing a disclosure.

### Why this is not a SEND BACK

I found six things. **None of them is in 2a's shipped product surface as a defect that 2a's own gate
should have caught** — four are in the *record and the verification apparatus*, and two are product
items that already had a routing which nobody executed for nine rounds. The correct manager action
for the latter is to **place them with a trigger**, which nine consecutive status notes failed to do
and which is exactly what a gate is for. Blocking a phase step that has met every criterion written
for it, in order to force work on two MINORs that a routing already exists for, would be manufacturing
a SEND BACK rather than making one.

Stated plainly so it cannot be read as a soft SHIP: **if any one of the six had been a data-loss, a
privacy leak, a wrong-person's-data path, or a named 2a deliverable that was not built, this would be
a SEND BACK.** None is.

---

## Routing — 2a

Seven items. **None blocks 2b from opening.** Each names its agent, its file, and its trigger.

### breaker — before 2b's first breaker round, in a commit of its own

This is I-0's obligation recurring inside the phase I-0 opened. I-0 exists as a whole increment with
*"user-visible outcome: NONE"* precisely because a stale FAIL costs a later round real time, and its
ship gate says **"the full board runs; every probe is PASS or gone."** I ran the full board. It does
not. Rounds 14–21 each ran only the probes in their own narrow scope, so the rot re-accumulated
unnoticed and no status note discloses it.

- **B-1. `qa/r11-recheck.mjs` dies mid-run and silently loses 9 of its 21 assertions.**
  `qa/r11-recheck.mjs:207` — `withCopy({ kind: 'pool' })` passes a pool placement with **no `cityKey`**,
  which `copyStopInto` has correctly refused since A-19 landed (revision 14): the probe aborts with
  `Error: copyStopInto: no such city undefined in trip-mine` at `packages/core/src/build/copyStop.ts:537`.
  12 of 21 assertions run; **§2.3, §2.4, §2.5 and §2.6 never execute**, which includes R10-2's entire
  end-to-end coverage through the store's own dispatch path with undo/redo. This is a stale probe, not
  a product defect — A-19's throw is correct and `StopPlacement`'s pool variant requires `cityKey` in
  the type, so only a `.mjs` caller can reach it. **Fix:** give §2.3's `withCopy` call a `cityKey` the
  target actually holds, exactly as ROADMAP revision 14 assigned `qa/r15-place-copy.mjs` §3.4 to QA.
  Do not change `copyStop.ts`.
- **B-2. `qa/r21-closure.mjs` reports 1 FAIL for a finding that closed one commit ago.**
  `qa/r21-closure.mjs:407-409` hardcodes the label `'class A — NOT enumerated in Part 5'` for
  `tgtTrip.cities.<n>`, `tgtTrip.pool` and `tgtTrip.days.<n>.stops.<n>`; the probe does not read
  `ARCHITECTURE.md`. Commit `67f5588` folded R21-1 into A-25 Part 5 and all three **are** now
  enumerated there. Re-express §6's assertion (and preferably read the list out of A-25 Part 5 rather
  than restating it) so the probe is at **0 FAIL**. Its §6b measurement stays as a `console.log`.
- **B-3. `qa/p2b-gate.mjs` §2.1's `datePrecision` ceiling is stale.** It fails on
  `packages/core/src/derive/summary.ts`, which P2-6's own fix put there and which §8.4 blesses in
  writing (*"carried and never branched on"*). `packages/core/test/datePrecision.test.ts:241` already
  pins that as the **single** permitted exemption and asserts the exemption list cannot grow silently.
  Re-express §2.1 against the same one-entry allow-list.
- **B-4. `QA-FINDINGS.md`'s status note carries two false "STILL OPEN" claims.** Nine consecutive
  rounds wrote *"STILL OPEN, unchanged and not re-litigated: R13-4, R13-5, …"*. **Both are closed.**
  `packages/core/src/conflict/detect.ts:248` reads *"stays at 71"*, and `geoOutlier.ts`'s two label
  sites are distinguishable (*"the map for a city this trip does not have"* vs *"the optional list
  for …"*). `qa/r13-gate-citykey.mjs` §7 and §8 are green and assert exactly those two things. The
  status note is the first thing a manager reads; correct it.
- **B-5 (housekeeping, no commit needed).** Four worktrees from earlier rounds are still registered:
  `/tmp/r14-pre`, `/tmp/r14-tw`, `/tmp/r15-pre`, `/tmp/r16-pre`. They are the documented differential
  fixtures for `qa/r14-horizon-copy.mjs`, `qa/r15-place-copy.mjs` §6.3 and `qa/r16-copy-depth.mjs`
  §5.3, all of which skip gracefully without them — so this is not a defect, and my "ALL OK" on those
  three is the **stronger** reading because the differential sections ran. Noted only so the next
  session knows why they exist.

### architect — before I-6, which consumes the data

- **A-1. §8.1's provenance table claims a capability the product does not have, and I-6 is the
  increment that will consume it.** §8.1 argues *"there is no `Trip.kind`, and manually-entered travel
  needs no new provenance value … the certainty of a record is already `provenance.confidence`, and it
  already means exactly the right things"*, and its first table row maps *manually entered from
  memory* → `{source:'user', confidence:'asserted'}`. **No path in the product produces that.**
  `packages/core/src/model/provenance.ts:18` — `userProvenance` hardcodes `confidence: 'confirmed'`,
  and it is what `createTrip`, `ensureDays`, `addStop` and `setDayMeta` all use. Measured, my own run:
  a trip recorded through `PastTripForm` comes back with every one of its 31 days at
  `{source:'user', state:'accepted', confidence:'confirmed'}` — the same value a booked, documented
  trip carries. The only `'asserted'` producers in `packages/core/src` are `systemSuggestion` and
  `copyStop.ts`'s `demote`. **Nothing is user-visible in 2a** (`confidence` is read by no surface in
  `apps/web`, and `displayStatus` does not consult it), which is why this is not a 2a blocker — but
  §8.4's `travelStats` and the lifetime map are derived from exactly this data, and Jacob's own
  principle is *"treat manually entered, imported, and observed travel as potentially different
  provenance rather than pretending all data has identical certainty."*
  **Second half of the same ruling, because it is the same data:** `PastTripForm` assigns the trip's
  **first** city to **every** day (KD-38, disclosed on screen and in BUILD-NOTES). Measured: for
  *"東京, 京都"*, `daysForCity(東京) = 31` and `daysForCity(京都) = 0`. Those 31 day-city facts are
  **ours, not the user's**, and they will be the lifetime map's input. Rule on whether a day-city the
  form assigned may stand as evidence in `travelStats`, and if so how the surface says which it is.
  Do not patch this in code — sequencing rule 5 makes it an architect's call.
  **Trigger: before I-6 widens `TripSummaryRow`.** ROADMAP already requires A-10/A-14 to land before
  I-6 for this exact reason; this is the same dependency, one field over.

### architect — before any share, friend or public-share-link work, and before 2b touches `importDoc`

- **A-2. P2-8 has been routed to the architect since round 12 and has never been ruled.** Nine status
  notes list it as *"still open, not re-litigated"*; ROADMAP's carried-forward table does not contain
  it; so it currently has no home at all. Reproduced by me, `qa/p2b-gate.mjs` §4.6: with
  `"ownerId":"user:marta"` present the file is refused with `ForeignDocumentError`; **delete that one
  key and the same file is adopted whole as `local:self`**, carrying 91 stops whose
  `provenance.actorUserId` is still `user:marta`, with `validateTrip` reporting **0** ownership issues
  (21 of 112 stops do not render as the importer's own; 91 do). `BRIEF.md` states as settled that
  *"`importDoc` … refuses a document owned by someone else, **visibly**"* — deleting one key defeats
  "visibly". `packages/client/src/store/store.ts:1027-1028`; KD-40's reasoning for *allowing* an
  absent owner is sound and is not what is being questioned. The open question is the one round 12
  wrote: does *allowed* also mean *adopt its foreign provenance unexamined*.
  **This is the same class of block I-4a already carries** and it deserves the same wording: it is a
  scope rule, not an open defect, and 2a's SHIP does not lift it.

### builder — in 2b's first builder pass

- **BLD-1. P2-5, `apps/web/src/views/PastTripForm.tsx:107-143`.** Routed to a builder at round 12,
  with a `file:line` and **two repro scripts already in `cairn/qa/`** — which by `cairn/CLAUDE.md`'s
  delegation table is the cheapest route this project has — and never executed. Reproduced by me,
  `qa/p2b-gate.mjs` §3.4: after recording a one-year trip, **400 undos accepted, 315 of 365 days still
  carry the city.** The city assignment is one `setDayMeta` per day, so one press is N+2 undo entries
  and the 50-entry history means a year-length trip can **never** be undone back past its own
  recording. With the form's default `'month'` precision it is 33 presses — annoying rather than
  broken — so the sharp edge is `'year'` only, which is why it is MINOR and not more. It is still a
  defect in the one flow 2a exists to deliver, in the first minute of using it.
  Repros: `qa/p2b-past.mjs` §2f (Chromium) and `qa/p2b-gate.mjs` §3.4 (headless).

### Carried forward, re-placed rather than re-derived

| Item | Status at this gate | Where it now belongs |
|---|---|---|
| **R10-1** (MINOR) | **Closed.** ARCHITECTURE §2.7 **A-8** blesses A-5b clause 2 with a reopening trigger. Nothing owed. | — |
| **R8-3** (MAJOR, unreachable) | Unchanged. `acceptCandidate` still has no control in `apps/web` — re-verified. | **Architect, Phase 3**, or earlier if Jacob pulls the accept control forward. Trigger unchanged. |
| **R8-4** (MAJOR, unreachable) | Unchanged. 2a added no in-trip delete control. | **Phase 3, with the `SyncPort`.** Trigger unchanged. |
| **R13-4, R13-5** | **Closed in code**, and QA's status note is wrong to list them. | Nothing owed to a builder — **B-4** above corrects the record. |
| **R2-18** (`qa/r2-constraints.mjs`, 1 FAIL) | Unchanged and correctly classified. The determinism grep in `test/boundaries.test.ts` walks `packages/core/src` only, so the reducer — which `cairn-constraints` §4 names — is not covered by it. The probe's own next line confirms `packages/client` is clean **today**, so this is a guard gap, not a live defect. | **Phase 1 carried list.** Not a 2a item. |
| **P2-5, P2-8** | Real, open, both routed at round 12 and neither executed. | **BLD-1** and **A-2** above. They now have a home and a trigger for the first time. |
| **`qa/p2b-gate.mjs` §1.7** (un-padded `today`) | Real and correctly not gated on: `detectConflicts(today:"2019-3-5")` returns 3 where `"2019-03-05"` returns 2, because the gate compares `IsoDate` strings while `lifecycle()` parses. Reachable only past the types — `cairn-constraints` §6 makes `YYYY-MM-DD` the contract and `apps/web`'s only clock is `ports/env.ts`. | Fold into **A-1**'s pass if the architect is in `§8.1` anyway; otherwise leave disclosed. Not owed. |
| The Phase 1 MINOR list (R6-1/2, R5-2, R11-1's record, R3-6…R3-9, the `r6-actor` residuals) | Re-run this pass at exactly their disclosed counts. **No undisclosed FAIL anywhere on the headless board.** | Unchanged. |

---

## Exit criteria — which apply to 2a, and how I checked each

ROADMAP's Phase 2 exit criteria are the **phase** gate (I-11), not 2a's. Four of the ten are 2b/2c
work and I did not judge 2a against them, per this review's stated scope. The table says which is
which and what I ran.

| # | Criterion | Applies to 2a? | Result |
|---|---|---|---|
| 1 | Phase 1's whole suite passes unchanged, every number re-derived | **Yes — sequencing rule 3** | **PASS.** 620/620; 2/4/11 at `FIXTURE_TODAY`; `geoCheck` 0 clean and 112/112 + 92/94 under +1°; `validateTrip` 11; goldens + sample byte-identical at `40955ca0b182`. All re-derived by running, none quoted |
| 2 | Injected fault — the rule class does what it claims | **Yes — I-3** | **PASS.** After `endDate`: 5 findings, **0** feasibility, composition `legacy_flag 2 / superseded_booking 1 / unverified_reference 2`, both blockers intact. Back at the goldens' clock: the original 17 exactly. `ruleClass.test.ts` states the count and one line per finding, and reasons explicitly about why *"before `startDate`"* means `FIXTURE_TODAY` |
| 3 | A past trip is silent | **Yes — I-4** | **PASS**, my own end-to-end run: 31 dense days, `Day.id === Day.date`, **0** conflicts and **0** validation issues. Injected fault (a stop after `today`) returns feasibility for that day only — `past-trip.test.ts` 49/50/51/52/53 |
| 4 | Country attribution measured, holes visible | No — **I-5/2b** | Not judged |
| 5 | Generated index inside its budget | No — **I-5/2b** | Not judged |
| 6 | Statistics cannot be stored | No — **I-7/2b** | Not judged. Spot-checked negatively anyway: no `travelStats`, no `countries.gen.ts`, nothing counting into storage exists yet |
| 7 | Injected fault — the summary is only as fresh as its write | No — **I-6/2b** | Not judged |
| 8 | Participation grants nothing | No — **2c** | Not judged |
| 9 | Round-trip and undo parity over the new fields | **Partly — the `datePrecision` half is 2a** | **PASS.** `toJSON(fromJSON(toJSON(t)))` byte-identical with the field present and absent; `fromJSON` rejects `datePrecision:'fortnight'` with `$.datePrecision`; undo/redo at depth 50 carries it (test 146); a pre-`datePrecision` document loads as `'exact'`. The participants half is 2c |
| 10 | Every new action maps 1:1 onto a core build function | **Yes — I-4** | **PASS.** The form adds **no** action: `setTripMeta` → `core.setTripMeta`, `setDayMeta` → `core.setDayMeta`, both pre-existing (test 54). The closed list of document-installing store methods is still **six**, asserted structurally at `retirement-ledger.test.ts:219` (`adoptTrip, closeTrip, createTrip, deleteTrip, importDoc, openTrip`, plus `doMerge` = exactly 7 `reseed: true` sites) |
| 11 | NO SILENT LOSS unchanged and extended to the new write paths | **Partly — the participant half is 2c** | **PASS for 2a.** The 200-step dirty-walk oracle holds; no new path assigns `state.doc`. **One note, not a finding:** the walk's step chooser dispatches `setDayMeta` only, so a `setTripMeta{datePrecision}` step is not in it — that path is covered instead by `store.test.ts` 147 (save + reopen) and `merge.test.ts` 485/486. The criterion's own wording is about participant edits, so I am not manufacturing a 2c item out of it |

### I-1 … I-4a's own ship gates, as ROADMAP states them

| Increment | Ship gate | Result |
|---|---|---|
| **I-0** | Full board runs; every probe PASS or gone; six baseline numbers with their commands | **PASS at the time; NOT true today** — see routing **B-1**/**B-2**/**B-3**. The six baseline numbers all reproduce |
| **I-1** | `lifecycle` on §2.10's list, count re-counted; CLI prints the stage; no `Date.now()`/`new Date()` in `packages/core` | **PASS.** 71 exports counted; CLI verified at three clocks; the only `Date` uses in core are `derive/summary.ts`'s pure UTC arithmetic — no ambient read anywhere, and `test/boundaries.test.ts` asserts it |
| **I-2** | The grep ceiling is a test not a promise; round-trip parity both ways; no export added | **PASS.** 0 hits under `conflict/` and `validate/`; one pinned exemption under `derive/`; the exemption list itself cannot grow silently; 71 unmoved |
| **I-3** | All Phase 1 conflict numbers unchanged; every rule carries a class; `subjectDate` tested per `RefKind` | **PASS.** 2/4/11 unmoved; 10/10 classified against §8.2's transcribed table; `subjectDate` covers day/stop/booking/trip/place/pool-stop and both unknown-id fallbacks |
| **I-4** | 2a independently shippable; criteria 1, 2, 3 and the NO-SILENT-LOSS extension pass | **PASS** — with **BLD-1** open against the same file, MINOR, routed |
| **I-3a** | Every Phase 1 and 2a conflict number unchanged; 2 suppressed `missing_lodging` at the real clock; `detectConflicts` byte-identical at all sweep clocks; the horizon still bites; `qa/r13-gate-citykey.mjs` §1/§4 at 0 FAIL | **PASS**, re-derived. `detectUngated`'s id set is **identical at all 8 clocks I swept** (17 findings each); at 200 days before the trip `detectConflicts` reports **0** `unbooked_ticketed` while `detectUngated` reports **10**; the real clock suppresses exactly the two `missing_lodging` warnings; `r13-gate-citykey` **0 FAIL** |
| **I-4a** | The slug expression nowhere in `apps/`/`packages/`; no call site outside core mints a city key; three validation codes each with an injected-fault test; A-25 Part 6's six clauses | **PASS.** The slug survives only inside a test docstring explaining what was deleted; `cityKey.test.ts` 262 asserts the no-outside-minting rule; 246/247/248 are the three injected faults; clauses 2 and 4 re-derived by me above, 1 measured, 3/5/6 taken on two prior independent derivations with the reason stated |

**On the ROADMAP's own arithmetic, one correction worth recording rather than routing.** I-3a's ship
gate says *"at a clock 200 days before the trip, `detectConflicts` reports **no** `unbooked_ticketed`
note while `detectUngated` reports **three**."* I measure **10**, not three.
`horizonGate.test.ts:200-207` already caught this and documents it: *three* is §2.7's rule table
naming the three fixture **cases** (Széchenyi, Prague Castle, Windsor), and the rule fires ten times
on the reference trip. The test asserts the three by name **and** the measured count. That is the
correct handling of a document number that is off, and I am recording it here so nobody re-derives it
a fourth time — not routing it.

---

## `cairn-constraints`, re-verified directly

| Constraint | How I checked | Result |
|---|---|---|
| §1 read-only boundary | `md5sum europe-2026-itinerary.html` before and after the full suite, a web build, a golden regen and ~78 probe runs; `git status --porcelain -- . ':(exclude)cairn'` | `7c69df3208ef91c8be0fb59a56443188` **unchanged** — byte-identical to the hash in Phase 1's own verdict; root diff **empty** |
| §1 write paths that *could* reach it | `node --test test/cli.test.ts` | **16/16.** `cli export` refuses a path escaping `cairn/`, through a symlinked file, through a symlinked parent, and under `--force`; *"the live planner is not writable through any cli command"* is a test |
| §2 zero runtime deps | `package.json` of both packages | `core` `{}`; `client` `{"@cairn/core":"*"}` — a workspace sibling that installs nothing |
| §3 bare-Node type stripping | the whole suite and every probe ran under `node --experimental-strip-types`, no build step | clean |
| §4 no ambient clock / randomness | grep over `packages/core/src` + `packages/client/src` | **zero** `Date.now()`, `Math.random()`, `crypto.randomUUID()` or zero-arg `new Date()`. The two `Date` uses are `derive/summary.ts`'s pure `Date.UTC` arithmetic. Behavioural proof: two separate processes and two CLI runs produce byte-identical output (`qa/r2-constraints.mjs`) |
| §5 no DOM/React in `packages/client` | grep for `document`/`window`/`React`/`localStorage`/`HTMLElement` | every hit is prose in a comment; `pageExit.ts` takes its targets as **arguments** rather than reaching for `window` |
| §6 export surface | `Object.keys(core).length` | **71**, and §2.10's own group counts sum to 71 (`7+17+22+6+2+2+7+3+1+4`) |
| §6.6 credentials may not reach a build | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS.** 3 hits over 108 derived tokens, all `OPTIONAL`/`BOOKINGS` — KD-27's two named non-credentials. No door PIN, no booking reference, no ticket URL in `dist/`. `dist/` and the generated sample are both gitignored |

---

## Verified — 2a: what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `67f5588`, Node v22.22.2.

| # | Command | Result |
|---|---|---|
| 1 | `npm run test:tap` | `# tests 620 · # pass 620 · # fail 0 · # skipped 0`, 8.9 s. **BUILD-NOTES' and QA's 620 are both accurate** |
| 2 | grep the TAP stream for `readOnce.test.ts`'s tests | `ok 505` / `ok 506` / `ok 507` / `ok 508` — **all four inside the suite**, not standalone. A-25 clause 1 |
| 3 | `npm run typecheck` | exit 0, **both** projects; `pretypecheck` regenerated the sample first (`16 days, 112 stops, 31 pool, 95 places, 120 import issues, source 40955ca0b182, REDACTED per §6.6`) |
| 4 | `npm run golden` then `git status --porcelain` | all 8 goldens + `fixtures/europe2026.sha256` = `40955ca0b182dddcc33540accadf2a65a329bc20b9e6ca109c9884e776bb06d2`; tree **clean** — byte-identical regeneration |
| 5 | `npm run web:build` | exit 0. `dist/assets/index-ok4BX8GA.js` 598.73 kB; the pre-existing >500 kB advisory is unchanged |
| 6 | `Object.keys(core).length` | **71** |
| 7 | `detectConflicts(trip, {today: FIXTURE_TODAY})` | **2 blocker / 4 warning / 11 note**, 17 total; `legacy_flag 2, missing_lodging 2, superseded_booking 1, unbooked_ticketed 10, unverified_reference 2` |
| 8 | `validateTrip(trip)` | **11** issues |
| 9 | `detectConflicts` at `2026-08-30` (after `endDate`) | **5** findings, **0** from any feasibility rule; `legacy_flag 2, superseded_booking 1, unverified_reference 2`. **Exit criterion 2** |
| 10 | `detectConflicts` at `2026-08-27` (the real clock) | `missing_lodging` **2 → 0**, both blockers intact. **The live defect §8.2 was written to close, closed** |
| 11 | `detectConflicts` with **no** `today` | 7 findings, feasibility present — edge ruling 3 holds, the gate invents no clock |
| 12 | **my own clock sweep**: `detectUngated` id-list at `2019-01-01`, `2026-01-01`, `2026-02-13`, `2026-08-01`, `2026-08-24`, `2026-08-30`, `2027-08-30`, `2030-01-01` | **identical at all eight**, 17 findings each. A-11's property, re-derived rather than quoted |
| 13 | same, 200 days before `startDate` (`2026-01-19`) | `detectConflicts` **0** `unbooked_ticketed`; `detectUngated` **10**. The horizon still bites, and it bites in the gate |
| 14 | `node cli.ts trip --today {2026-08-01, 2026-08-10, 2026-08-27}` | `[planned]` / `[active]` / `[completed]`, with `stage:` printed and the clock echoed. At the completed clock: `2 blockers, 2 warnings, 1 notes` |
| 15 | **my own end-to-end past-trip build** in core: *"Japan 2019"*, `2019-03-01…31`, cities `東京`/`京都`, precision `month`, `setDayMeta` per day | two **distinct** keys (`tcity-1`, `tcity-2`); 31 dense days; **0 conflicts, 0 validation issues**; `lifecycle` = `completed`; `toJSON(fromJSON(toJSON(t)))` **byte-identical**. **Exit criterion 3 and A-10's headline case, on my own oracle** |
| 16 | the same run, `daysForCity` per city | `東京 = 31`, `京都 = 0` — the input to routing **A-1** |
| 17 | the same run, `days[0].provenance` | `{source:'user', state:'accepted', confidence:'confirmed'}` — the other input to **A-1**. §8.1's table says memory-entry is `'asserted'`; nothing produces it |
| 18 | **A-25 clause 2, two-sided**, throwaway worktree at `67f5588`: revert `refileCityKey`'s step-4 `order` hoist | **red**, offender list a **one-element array**: `15 · three same-named target cities — the step-4 order tie-break: tgtCity1.order ×2`, and nothing else. Restored: **4/4** |
| 19 | **A-25 clause 4's null clause, my own mutation**: plant `homeBase: null` back on `sourceTrip` | test 4 **red** naming exactly `srcTrip.homeBase`. Worktree removed; `git worktree list` shows none of mine |
| 20 | `qa/r13-gate-citykey` `r14-horizon-copy` `r15-place-copy` `r16-copy-depth` `r17-hours-parser` `r18-readonce` `r19-census-gaps` `r20-census-reach` | **0 FAIL / ALL OK each.** r14/r15/r16 ran **with** their differential worktrees present, so §7, §6.3 and §5.3 executed rather than skipping |
| 21 | `qa/r21-closure.mjs` | **1 FAIL — stale, not a finding.** §6 hardcodes `'NOT enumerated in Part 5'` at `:407-409`; `67f5588` enumerated all three. Routing **B-2** |
| 22 | **the whole headless board**, all 78 `qa/*.mjs` | Every FAIL is disclosed and reproduces at its documented count: `p2b-gate` 5 (P2-5, P2-8 ×2, §1.7, §2.1), `r2-constraints` 1 (R2-18), `r10-redo` 3 (R10-1), `r3-cas2` 3, `r3-pool` 3, `r5-freshness` 4, `r6-actor` 5, `r7-r6recheck` 3, `r6-flush` 1, `r8-geo` 1, `r8-persist` 1, `r9-ledger` 2, `r21-closure` 1. **One undisclosed defect: `r11-recheck` crashes** — routing **B-1** |
| 23 | `qa/p2b-gate.mjs` §3.4, read in full | **400 undos accepted, 315 of 365 days still carry the city.** P2-5 reproduced on my own run — routing **BLD-1** |
| 24 | `qa/p2b-gate.mjs` §4.6, read in full | `ownerId` present → `ForeignDocumentError`; key deleted → **adopted as `local:self`**, 91 stops still `user:marta`, **0** ownership validation issues, 21/112 not rendering as the importer's own. P2-8 reproduced — routing **A-2** |
| 25 | `qa/r13-gate-citykey.mjs` §7 and §8 | Both **green**: no source comment claims 70, and the two `geo_outlier` label sites are distinguishable. **R13-4 and R13-5 are closed** — routing **B-4** |
| 26 | `node --test test/cli.test.ts` | **16/16**, including the four `cli export` escape refusals and *"the live planner is not writable through any cli command"* |
| 27 | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS**; 3 hits, all `OPTIONAL`/`BOOKINGS` |
| 28 | `md5sum europe-2026-itinerary.html`; `git status --porcelain -- . ':(exclude)cairn'` | `7c69df3208ef91c8be0fb59a56443188`, unchanged; root diff **empty** |
| 29 | `grep` for the slug expression across `apps/` and `packages/` | one hit, inside `cityKey.test.ts`'s docstring explaining what was deleted. **The expression exists nowhere in product code** |
| 30 | `grep datePrecision` under `conflict/`, `derive/`, `validate/` | 0, 1, 0 — the one being `derive/summary.ts`, pinned as the single exemption by `datePrecision.test.ts:241`, which also asserts the exemption list cannot grow |
| 31 | `require('playwright')` | `Cannot find module`. **The Chromium half of the board could not run here** — stated in the status note rather than implied |

---

## For Jacob — 2a

**You can now record trips you have already taken, and the app stops nagging you about a trip you
have already been on.** That is step one of three in the current phase, and it is done.

Three things changed, and one of them you will feel immediately:

- **The app knows a trip can be over.** Your Europe trip ended on 22 August. Until now the app kept
  telling you, forever, that you were missing a hotel in Budapest — for nights you had already slept
  through. It no longer does. I checked this by running it: the two "missing lodging" warnings are
  gone, and your own two red flags for Aug 18 and Aug 20 are still there, which is exactly right —
  those are yours, and nothing of yours gets silenced.
- **There is a "record a past trip" form.** Title, roughly-when, and the cities. No day-by-day
  required. I entered *"Japan, March 2019 — 東京, 京都"* myself and it came back with **zero warnings
  and zero problems** — which is the whole point: a trip from seven years ago should be a record, not
  a to-do list.
- **"Roughly when" is recorded honestly.** If you only remember *March 2019*, the app stores that as
  March 2019 and says so on screen — it does not quietly claim you were there from the 1st to the
  31st.

**Nothing here is a stub.** I ran the tests (620, all passing), the type checker, the build, and 78
separate attack scripts myself rather than taking anyone's word for it.

**Two rough edges, both small, both now scheduled rather than floating:**

- **Undo, straight after recording a past trip, behaves badly.** If you record a whole *year* and
  then press Ctrl+Z, it peels the trip apart one day at a time and you cannot get all the way back.
  A month-long trip is fine, just fiddly. It was found nine rounds ago and quietly never got picked
  up; it is now assigned with a name on it.
- **The app assumes every day of a recorded past trip was in the first city you listed.** So *"Tokyo,
  Kyoto"* records 31 days in Tokyo and none in Kyoto. The form does tell you this before you press the
  button, which is the right instinct — but the next step is the *map of everywhere you have been*,
  and it will be built from exactly that data. So I have asked the architect to settle, before that
  map is built, how the app should tell the difference between *"I said I was in Kyoto"* and *"the app
  filled that in for me."* That is your own rule — never present our guess as your plan — applied one
  step ahead of where it would have bitten.

**One decision I would like from you, and it is not urgent.**

Right now, if someone sends you a trip file they exported, the app correctly refuses it as *"this
belongs to someone else."* But if that file happens to have no owner recorded in it, the app adopts
the whole thing as yours, and 91 of the activities in it stay quietly stamped with the other person's
name underneath. Nothing leaks and nothing breaks — but the app would be telling you the trip is
yours when it is not. **Do you want it to (a) refuse anything that is not provably yours, (b) accept
it but visibly badge the whole trip as imported from someone else, or (c) leave it as is until real
accounts exist in Phase 3?** I have blocked all friend-sharing and public-link work until this is
settled either way, so nothing is waiting on you today.

**Still open from Phase 1, unchanged:** the *"accept"* button question from last time is still sitting
unanswered. Not blocking anything.

**Next:** step 2b — the map of everywhere you have been, and a count of countries and cities derived
from your real trips rather than typed in. It is unblocked as of this verdict.

---
---

# Phase 1 review *(closed 2026-08-27 — kept for the record)*

> **Status: CLOSED.** Manager, stage 4. Reviewed `master` @ `218c7f0`, 2026-08-27, Node v22.22.2,
> Chromium via the system Playwright over real elapsed time. **Verdict: SHIP. Phase 1 is closed.**
> Every claim below has a command in **Verified** that I ran myself, on this tree.
>
> The previous `REVIEW.md` (`82c1a4f`, SEND BACK on R11-1) is superseded by this document and is
> preserved in git history. Its routing is closed: **A-7 is ruled (ARCHITECTURE revision 8) and
> built (`218c7f0`), and I re-verified it against my own oracle rather than against the finding.**
> The two review items that rode with it — R8-4 and the *What rides* list — are unchanged and are
> carried forward below as disclosed Phase 2 entry items.
>
> **Superseded by the 2a verdict above only where they overlap:** its "Carried to Phase 2" lists are
> re-placed in 2a's routing table, and the probe-repair item it named was discharged by I-0 and has
> **re-accumulated** (2a routing B-1).

---

## Verdict: **SHIP** *(Phase 1)*

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

## Routing — Phase 1

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

## Verified — Phase 1: what I ran, and what happened

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

## For Jacob — Phase 1

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
