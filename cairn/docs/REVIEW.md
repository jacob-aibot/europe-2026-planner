# Cairn — Phase 1 review

> **Status: CURRENT.** Manager, stage 4. Reviewed `master` @ `8a65a53`, 2026-08-26, Node v22.22.2,
> Chromium via the system Playwright over real elapsed time. **Verdict: SEND BACK** — a short,
> closed list, not a restart. Every claim below has a command in **Verified** that I ran myself.
>
> The previous `REVIEW.md` (round 1, `0c68d6f`, SEND BACK) is superseded by this document and is
> preserved in git history. Its routing table is history, not instructions.

---

## Verdict: **SEND BACK**

The engine is right and the persistence spine is, at last, sound. I re-derived every Section A
count against the live planner, reproduced the Fisherman's Bastion blocker, ran the reference
trip through the CLI, drove the app in a real browser, and cloned the repo from scratch to check
the build claims. `npm test` really is 333/0, `npm run typecheck` really is clean on both
projects from a fresh clone, and the two blockers on Jacob's trip really are his own two red-flag
days. Seven adversarial rounds have closed every BLOCKER and every MAJOR in the write path, and
the tester's round-7 numbers matched mine exactly. That is real work and it is not in question.

It goes back for one reason, and it is the reason this role exists:

**Three features that `ARCHITECTURE.md` §2 and `ROADMAP.md` §4.5 name did not get built, are not
disclosed as unbuilt, and two of them were reported in QA round 2 and survived five more rounds
without ever being routed to anyone.** Rounds 3–7 were all scoped to `store.ts`. Nothing in that
scope was wrong; the problem is that the product surface went unattended for five rounds while
the persistence spine got six passes.

**1. `travelRole` is not rendered anywhere in `apps/web`.** I opened Aug 8 in Chromium at
`8a65a53`. The Condor stop renders:

```
14:30
Condor [redacted] → Vienna (VIE)
✈️ Flight · 1h 20m · 621 km
```

That is a leg drawn *into* the stop with 14:30 reading as an arrival — the exact misreading
`ARCHITECTURE` §2.12 was written to correct. §2.12's consumer table says the day view *"renders
it: a `'journey'` stop shows 'departs 14:30 · 1 h 20 · arrives 15:50'… `'unknown'` renders with a
one-tap control to set it, which is the only new editing affordance this field needs."*
`grep -rn travelRole apps/web/src packages/tokens/src` returns **nothing**. The model half is
excellent — I re-derived 21 journey / 81 transfer / 10 unknown and `impossible_transfer` at 0/0 —
and Jacob can see none of it. The 10 `'unknown'` stops have no affordance, so the field can never
improve from the app. This is not on ROADMAP's closed stub list and it is not in `BUILD-NOTES`
KD-13.

**2. `store.syncResolutions()` has no caller, so the conflicts panel resurrects dismissals.**
The panel ships **Acknowledge** and **Not a problem** buttons (`Panels.tsx:69`, `:72`). §2.7 says
`syncResolutions` is *"a build function the client calls whenever it recomputes the derived
conflict set"*. Nothing calls it — not the reducer, not `App.tsx`, not the panel. I reproduced the
consequence: dismiss a conflict, edit the value away, edit it back, and **the conflict returns
already dismissed with no user action**. `BUILD-NOTES` §5 lists F-10 as fixed with core-level proof
only, and `packages/client`'s own store method carries a doc comment describing a call that does
not happen. The conflicts panel is the phase's headline feature and `ROADMAP` §4.5 puts it on the
may-not-be-stubbed list.

**3. §2.14 rule 7's credit line is missing in two of the four views that render stops.** In
Chromium I copied "Check in — Habyt Vienna" from Europe 2026 into a new trip. The day view is
correct and impressive — badge *from a friend*, credit *From "Europe 2026"*, and the note's
credentials redacted to `[redacted], [redacted]`. Then I pressed ⇩ and the same stop in the
Optional panel renders the badge and **no credit line**. `StopEditor` renders neither.
`ROADMAP` §4.5: *"May not be stubbed: … the copy path's provenance badge and credit line."*

Three secondary things travel with it, all cheap and all named below: a real booking reference of
Jacob's is in a build artifact (§6.6's rule is still a six-string scrub), `cli export` can be
walked out of `cairn/` through a symlink, and the copy path manufactures a false `geo_outlier`
blocker on first use.

### And a governance finding, because this is the second time

`BUILD-NOTES` §1 exists because round 1 was sent back for exactly this. Its own contract is
*"Every entry is a place where the shipped code does not do what `ARCHITECTURE.md` or `ROADMAP.md`
says"*. None of the three features above has a `KD-` entry. Worse, §3 — the table a reviewer
scans — reads `apps/web | … **Browse & copy with the credit line**` and `packages/client | …
syncResolutions`, both of which are true of the code and false of the product. §6 does carry an
honest one-line caveat about the PoolPanel probe; §3 contradicts it. A caveat that only appears in
§6 while §3 says the feature shipped is the same disclosure failure with a new address.

---

## Routing

Everything here is closed and specific. Architect first (three rulings block the builder's pass),
then builder, then breaker on the named surface.

### Architect — four rulings, none of them a redesign

**A-1. Rule on the copy path × `geo_outlier`, and write the anchor row (QA R2-9).**
Repro, run by me: `node qa/r2-data.mjs` → copying *"Arrive LAX"* into a Lisbon-based trip yields
`geoCheck: dstop-1 9140km certain` → `blocker: geo_outlier`. §2.13's anchor table has no row for a
record whose `provenance.origin.sourceTripId` says a human chose it seconds ago, and §0.5 governs:
a rule that cannot tell *"the data says something impossible"* from *"the data is shaped oddly"*
degrades to a warning. This also punctures §2.7's promise — *"the reference trip carries exactly
two blockers… a third can only appear if somebody can write down why he must act on it"* — on the
phase's own new primitive, with nobody writing anything. **Deliverable:** one row in §2.13's anchor
table (a `source:'friend'` record either anchors on nothing and is `'unanchored'`, or gains an
anchor from its origin trip — your call, state which), plus an injected-fault criterion in ROADMAP
C per *How a criterion is written* rule 3.

**A-2. The serialization chain's subject is every `StoragePort` mutation, not every write
(QA R7-3).** `store.ts:185`'s `chainOntoSaving` is a good invariant and I verified the tester's
structural claim: one `saveIfVersion` call site, three `writeAndSettle` call sites, all inside it.
But `deleteTrip` calls `ports.storage.delete(id)` off the chain (`store.ts:618`), so a queued
expect-absent write lands after the delete and `upsertSummary` puts the row back in the library —
the trip is resurrected and the delete is silently undone (`node qa/r7-chain.mjs` §10, which I ran:
`in storage=true in library=true`). It is not reachable through the shipped UI today, and that is
luck, not design. **Deliverable:** one sentence in §4.3 — *every `StoragePort` mutation, including
`delete()`, goes on the store's serialization chain* — and the matching clause in §4.2 rule 6c
(the exception is about not *writing*, not about not *waiting*). Then B-6 implements it.

**A-3. Bless or replace `FLUSH_MAX_ATTEMPTS = 5`.** The bound is a builder-chosen constant on the
data-safety path with two user-visible consequences the design does not mention (R6-1: the
transition aborts with `status === 'idle'` and `App.tsx` renders no banner, so the click does
nothing and says nothing; R6-2: the loop cancels the debounce on its last pass and never re-arms,
leaving a dirty document with no scheduled autosave). Same shape as KD-8's
`BOOKING_TIME_TOLERANCE_MINS = 30`. §4.2 rule 6b says an unsuccessful flush aborts the transition
*and tells the user*; the bound-exhausted exit is the one path that aborts without telling.
**Deliverable:** name the bound in §4.2 rule 6a″, state that exhausting it is a refusal for
*display* purposes as well as control-flow purposes, and state that the debounce is re-armed when
the loop gives up while dirty. Then B-4 implements it.

**A-4. Settle the §2.10 export surface — the criterion has been "partially met" for three
rounds.** I counted it: `packages/core/src/index.ts` exports **110** runtime symbols;
`surface.test.ts`'s `SECTION_2_10` list is 50 and `BEYOND_2_10` is 60. ROADMAP E asks for set
equality against §2.10's list; the test asserts set equality against the *union* of two lists, and
KD-19 says so honestly. That is a criterion enumerated rather than met, and QA R2-12 found the
per-symbol justifications wrong for 42 of them. Six are marked `INTERNAL` by the builder's own test
(`blankDay`, `canonical`, `conflictId`, `digest`, `makeConflict`, `toDoc`). **Deliverable:** decide
the real Phase 1 surface — widen §2.10 to what `client`/`cli`/`views` demonstrably call, and name
the residue as private. This is a boundary the native app and the server will be written against;
"110 against 50, enumerated" is not a boundary. It does not block Phase 1 shipping *behaviour*, but
it blocks the phase's own acceptance criterion E, so it must be closed before the next gate.

*(Doc tidy, same pass, no ruling needed: `Stop` carries `ticket?: Ticket | null` and `links?:
Link[]` in `types.ts:149-150`, neither of which is in §2.2's `Stop`. §2.11's mapping implies both.
Add them to §2.2 or add a KD entry. And §2.5's `computeLegs(day, ctx: TripCtx)` vs the shipped
`computeLegs(day, trip)` — QA R2-21 — is still open and §2.5 is the section a native port gets
written from.)*

### Builder — one pass, seven items

**B-1. Render `travelRole` in the day view (QA R2-10, ARCHITECTURE §2.12).**
`apps/web/src/views/DayTimeline.tsx`. A `'journey'` stop must render *"departs 14:30 · 1 h 20 ·
arrives 15:50"* rather than today's `14:30 … ✈️ Flight · 1h 20m`; a `'transfer'` stop keeps today's
string; an `'unknown'` stop renders a one-tap control that dispatches `updateStop` to set the role.
That control is the only new editing affordance the field needs — §2.12 says so in as many words.
Verify against Aug 8 (`Condor DE4345 → Vienna`, `journey`) and Aug 18 (`Airport Express bus →
Václav Havel`, `journey`), and against the ten `'unknown'` stops the importer produces. **Add the
KD entry that should have existed since round 2.**

**B-2. Call `store.syncResolutions()` (QA R2-7, ARCHITECTURE §2.7).**
`apps/web` never invokes it. Wire it where §2.7 says — after the derived conflict set is
recomputed. Acceptance: the exact sequence in `node qa/r2-resolutions.mjs` §4 must flip from
`FAIL a conflict the user dismissed once is LIVE again after the data returns to that value` to
`resolution attached after revert: none (correct)`, **through the app's own dispatch path, not by
calling the method by hand** (§5 of that probe already shows the by-hand call works — that is not
the fix). Watch the interaction §2.2b F2 already warns about: `syncResolutions` reads the derived
cache and *writes the document*, so it must not run against a stale cache; `derived.ts` is keyed on
`(document identity, today)` now, which is the property that makes this safe.

**B-3. Render the credit line wherever an attributed record renders (QA R2-8, §2.14 rule 7).**
`apps/web/src/views/Panels.tsx:121` (`PoolPanel`) calls `STATUS_BADGE[displayStatus(...)]` and never
`attribution`; `StopEditor.tsx` renders neither badge nor credit. `DayTimeline.tsx:102` and
`BrowsePane.tsx:96` do it correctly — copy that. Repro I ran: copy a stop, press ⇩, open Optional —
the badge *from a friend* is there and *From "Europe 2026"* is not.

**B-4. Tell the user when a transition aborts on the exhausted bound, and re-arm the debounce
(QA R6-1, R6-2).** After A-3's ruling. `store.ts:290`, `:299`; `App.tsx:85`, `:93`. Today the click
does nothing and says nothing, and the store is left dirty, idle and with no scheduled autosave
(verified: no further write in 200 ms with the user idle). The three backstops the tester found —
next keystroke, `pageExit`, `beforeunload` — are why this is not data loss, and they are not a
reason to leave it.

**B-5. Make §6.6's bundle check a rule instead of a six-string scrub (QA R2-4).**
`test/redact.test.ts` greps `apps/web/dist` for six literals and **never applies
`redactionHits`**, which §6.6's enforcement clause 2 requires. I rebuilt and ran
`node qa/r2-redact.mjs`: 7 hits, including **`Booking 338 441 5948` — Jacob's real FlixBus booking
reference — in `dist/assets/index-*.js.map`**, put there by a comment the builder wrote at
`packages/core/src/build/redactText.ts:52` as an example while implementing the redactor. `DE4345`
leaks the same way from `packages/core/src/model/types.ts:111`. KD-18 claims *"the test greps maps
as well as scripts so a fourth cannot creep back"*; a fourth crept back. **The implementable rule is
already written and QA hands it to you:** derive the credential set by running the redactor over
the *unredacted* trip, then assert none of those tokens appears in any emitted asset — that grows
with the data instead of being a list. (`qa/r2-redact.mjs` does it in twenty lines.) Applying
`REDACTION_PATTERNS` verbatim to a minified bundle is not implementable and QA says why; do not try.
**No exposure exists today** — `dist/` is gitignored and nothing is deployed — but §6.6 is Jacob's
own answer, written after the last review, and it says *"a rule applied by the sample generator,
covered by a test, not a one-off scrub."*

**B-6. Close the two write-path holes A-2 rules on, plus the unhandled rejection (R7-1, R7-2,
R7-3).** `await saving` before `ports.storage.delete` (R7-3); an in-flight guard on
`mergeWithStored` so a second entry before the first settles cannot leave `status='conflict'` over
a correctly merged document (R7-1); `try/catch` per listener in `emit()` or a `.catch` on
`scheduleSave`'s `void save(...)`, which today turns a throwing subscriber into an unhandled promise
rejection (R7-2, observed: `unhandledRejection: BOOM in a subscriber`). All three reproduce with
`node qa/r7-chain.mjs` §3b/§7/§10 and none is reachable through the shipped UI — fix them while the
file is open, not because a user is hitting them.

**B-7. Two one-line guards that protect stated boundaries.**
- `cli.ts:158` `safeWritePath` is lexical. I reproduced the escape: `ln -s <outside> cairn/qa/
  escape-link.json` then `node cli.ts export qa/escape-link.json` → *"wrote …/cairn/qa/
  escape-link.json (233801 bytes)"* and the file **outside** `cairn/` was overwritten with the trip
  JSON. One `realpathSync(dirname(abs))` before the prefix test closes it. Root `CLAUDE.md` calls the
  read-only boundary *"the one rule that must never drift"*; a lexical guard on a symlinked path is
  drift waiting to happen, and `BUILD-NOTES` §7 records that this boundary was already crossed once
  by a test. While you are there: `export` overwrites an existing file inside `cairn/` with no
  prompt and exit code 0 (QA R2-5, second half).
- `packages/core/src/access/predicates.ts` — `effectiveRole`'s `if (s.expiresAt && s.expiresAt < now)`
  is a lexical compare against an unvalidated string, so `expiresAt: "9999-99-99"`, `"tomorrow"` and
  `"never"` all read as *not yet expired* and grant access (verified: `node qa/r2-access.mjs`,
  1 FAIL). **I am overruling the tester's Phase-2 scoping on this one.** ROADMAP defers *enforcement*
  to Phase 2; it does not defer the correctness of the definition, and §6.2.4 makes these predicates
  *"the definition the Phase 2 RLS policies are generated from and tested against"*. A definition that
  fails open generates a policy that fails open — the identical argument F-13 was fixed under, one
  field over, in the same function. Validate `expiresAt` and `revokedAt` with `isIsoDate` and fail
  closed on anything that is present and not a calendar date. (`null`/`""`/absent legitimately mean
  "no expiry" and must keep meaning that.)

**Disclosure, non-optional, applies to the whole pass:** every item above gets a `KD-` entry, and
`BUILD-NOTES` §3's `apps/web` and `packages/client` rows are corrected so they do not claim a
feature §6 caveats away. §4 ("Verified, by running it") still reports **231 pass**; regenerate it or
delete it — a stale table under that heading is the thing round 1 was sent back for.

### Breaker — one pass, and it is a surface you have not attacked

Six rounds went into `store.ts` and they were worth it. **`apps/web/src/views/` has never had a
systematic pass against §2.12, §2.14 and §4.5**, and all three of this review's blocking findings
live there — two of them filed by you in round 2 and then carried forward as one-line "open,
unchanged" rows for five rounds without a severity re-assessment against the phase gate. Round 8:

1. **Verify B-1, B-2, B-3 as a user, in Chromium.** For B-2 specifically: the fix must hold through
   the app's dispatch path, and the crossing nobody has made is `syncResolutions` × the derived
   cache × undo — §2.2b F2 says a stale cache there *writes the document*. Cross them.
2. **Walk §4.5's "what Jacob can do" list end to end and report each item as built / stubbed /
   absent**, against `ROADMAP`'s closed stub list. That list is the phase's definition of done and
   nobody has checked it item by item. Include: is `acceptCandidate` reachable from any control?
   (It is not, today — an imported stop stays badged forever. That fails safe and I am not routing
   it, but the next round should say so out loud rather than leave me to find it.)
3. **Re-attack §2.14 rule 7 as a ceiling, not a spot check**: enumerate every view that renders a
   `Stop` or a `Booking` and assert each one either renders the credit or cannot receive an
   attributed record. A grep-shaped assertion beats four hand checks.
4. **Re-run the standing set** (`r3-undo`, `r3-loss`, `r4-switch`, `r2-copy`, `r3-merge`,
   `r7-chain`, `r6-flush`, `r6-actor`, `r5-freshness`, `r3-pool`, `r3-cas2`, `r2-access`,
   `r2-redact`, `r2-constraints`) and confirm nothing regressed. My counts at `8a65a53` are in
   **Verified** — use them as the baseline.
5. **One framing change in `QA-FINDINGS.md`.** Round 7's gate paragraph is scoped correctly —
   *"no open BLOCKER and no open MAJOR anywhere in the write/persistence path"* — and then
   recommends the gate review. Five MAJORs outside that path were open the whole time. Future gate
   recommendations state the whole board, not the scope of the round.
6. **Patch the rotten probes** before round 8 rather than during it: `qa/r6-flush.mjs` §6's static
   check false-positives on `chainOntoSaving`'s own `saving = run;`, and `qa/r5-freshness.mjs:602`,
   `qa/r2-copy2.mjs:86` and `qa/r2-import.mjs:51` have been dead since rounds 5 and 2. Your ruling
   that a probe repair does not belong in a QA commit is right; it belongs in a commit of its own,
   before the round.

### What rides — accepted as Phase 1 residue, not to be worked

I am not manufacturing work. These stay open, with the reason:

- **R5-3** (a store in `'conflict'` with nothing unwritten cannot leave the trip) — the
  implementation matches §4.2 rule 6b as written; the escape hatches (*Merge and save*, delete)
  exist. Architect may fold a not-dirty exception into A-3's pass if it is free; otherwise Phase 2.
- **R5-4** (no re-render across midnight) — the cache key is right, the screen is not consulted.
  Cosmetic in a single-user local app.
- **R3-6, R3-7, R3-8** (pool edge cases reachable only from the client API/CLI, not the web UI),
  **R3-9** (the indicator string is transcribed in the test rather than shared — real, and the fix
  is a shared `saveIndicator(state)`; take it whenever `App.tsx` is next open),
  **R2-13** (redaction eats flight designators — the sample reads `Condor [redacted] → Vienna`;
  ugly, honest, and cheaper than a second pattern class),
  **R2-14, R2-15, R2-16, R2-17, R2-19, R2-20, R2-21**, and the five `r6-actor` residuals
  (a non-string actor is flagged but `params.actorUserId` reads `""`). All MINOR, all disclosed,
  none of them touching data safety or provenance.
- **Everything explicitly Phase-2-scoped by ROADMAP** — RLS, sync, real friends, share revocation.

---

## Verified — what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `8a65a53`. `git status --porcelain` was empty
before and after; `md5sum europe-2026-itinerary.html` = `7c69df3208ef91c8be0fb59a56443188` before
and after. The read-only boundary held through a full suite, two web builds, six Chromium sessions,
a fresh clone and ~20 probe runs.

| # | Command | Result |
|---|---|---|
| 1 | `npm run test:tap \| grep '^# '` | `# tests 333 · # pass 333 · # fail 0` — **BUILD-NOTES and QA round 7 are accurate** |
| 2 | `npm run typecheck` | exit 0, both projects, `pretypecheck` generates the sample first |
| 3 | `git clone` to scratch → `npm install` → `npm run typecheck` → `npm run test:tap` | **fresh clone: typecheck exit 0, 333/333.** Criterion E's clean-clone clause is met |
| 4 | `npm run web:build` | clean; `dist/assets/index-*.js` 583 kB |
| 5 | `grep -rlF` on `dist/` for the six known strings | **all six CLEAN** — `PIN 0754`, `5814731574`, `YZGDTS`, `IU1TUY`, `cityairporttrain.com/en/account/order/`, `ulaznice.hr/web/confirmFromMailGuest/`. ROADMAP E's literal criterion is met |
| 6 | `node qa/r2-redact.mjs` | **7 hits.** `dist/assets/index-*.js.map` carries `Booking 338 441 5948`, `338 441 5948`, `DE4345`, `OPTIONAL`, `BOOKINGS`. Sources: `packages/core/src/build/redactText.ts:52` (a comment) and `model/types.ts:111`. §6.6 enforcement clause 2 **not met** → B-5 |
| 7 | walk the generated sample JSON for `ticket`/`href`/`reference`/`seat`/`https?://` | `0 / 0 / 0 / 0 / 0`; 45 `[redacted]`; `sourceDoc` absent. **The sample data itself is clean** |
| 8 | `node cli.ts trip` | `16 days · 112 scheduled · 31 pooled · 95 places · 21 bookings`; `2 blockers, 4 warnings, 11 notes`; `1 error, 10 warnings` |
| 9 | `node cli.ts conflicts` | both blockers are `legacy_flag`, Aug 18 and Aug 20, each carrying Jacob's own words. **No third blocker** |
| 10 | independent re-derivation of Section A through `loadEurope2026()` | 16 days dense `2026-08-07`→`2026-08-22`, `Day.id===Day.date`; **travelRole 21 journey / 81 transfer / 10 unknown**; 81 `arrival`; 49 `cost`; pool `vienna 8, dubrovnik 3, split 3, prague 8, budapest 6, london 3`; places `15/12/15/25/21/7`; 5 multi-city days exactly as ROADMAP names them; 3 candidate days; 21 suggested, **all `source:'system'`**; `homeBase {Los Angeles (LAX), 33.9425, -118.4081}`; all six `cityRange()` strings exact. **Section A passes, every line** |
| 11 | ticket census | 3 bundled stops over 2 files (`flixbus-dubrovnik-split-…`, `flixbus-split-skradin-…`) + 4 url = 7 ticketed. **Matches ROADMAP's corrected 7/3/2, not revision 1's "2 bundled"** |
| 12 | `node qa/r2-data.mjs` | Fisherman's Bastion typo → **exactly one new blocker, `geo_outlier`, `place-68`, `km:109`, no coordinate in `params`.** The phase's headline claim holds. Same run: copying "Arrive LAX" into a Lisbon trip → **`blocker: geo_outlier`** → A-1 |
| 13 | `node qa/{r3-undo,r3-loss,r4-switch,r2-copy,r3-merge}.mjs` | **0 FAIL each.** R3-1, R3-2, R3-4, R4-1, R2-11, R3-3 confirmed closed on my own run |
| 14 | `node qa/{r3-pool,r3-cas2,r2-access,r5-freshness,r6-actor,r6-flush,r7-chain,r2-constraints}.mjs` | 3 / 3 / 1 / 4 / 5 / 3 / 3 / 2 FAIL — **identical to QA round 7's table**, including its note that one `r6-flush` FAIL and one `r2-constraints` FAIL are stale probes |
| 15 | `node qa/r2-resolutions.mjs` | **FAIL reproduces at HEAD:** dismiss → edit away → edit back = *"resolution attached: dismissed"* with no user action. §5 shows a hand call to `syncResolutions` fixes it; §6 shows the only call sites are its own definition → B-2 |
| 16 | `grep -rn travelRole apps/web/src packages/tokens/src` | **zero hits** → B-1 |
| 17 | Chromium: load app → *Load Europe 2026* → Aug 8 | renders `14:30 / Condor [redacted] → Vienna (VIE) / ✈️ Flight · 1h 20m · 621 km`. **A `journey` stop rendered as a transfer** → B-1. Zero page errors across every session |
| 18 | Chromium: new trip → *Browse & copy* → copy "Check in — Habyt Vienna" | day view: badge **from a friend**, credit **From "Europe 2026"**, note redacted to `booked, [redacted], [redacted], 2 nights`, no ticket, no booking. **The copy path is correct and KD-20's fix is real** |
| 19 | …then ⇩ into the pool → *Optional* | badge **from a friend**, **credit line absent** → B-3 |
| 20 | `ln -s <scratch>/victim.txt cairn/qa/escape-link.json; node cli.ts export qa/escape-link.json` | *"wrote …/cairn/qa/escape-link.json (233801 bytes)"* — **the file outside `cairn/` was overwritten with the trip JSON** → B-7. Symlink removed; `git status` clean |
| 21 | `node cli.ts export` against `../europe-2026-itinerary.html`, `../docs/BOOKINGS.md`, `../tickets/x.pdf`, `/etc/passwd` | all four **refused**. The lexical half of the guard works |
| 22 | `Object.keys(core)` on `packages/core/src/index.ts` | **110 runtime exports**; `surface.test.ts` holds 50 + 60 → A-4. `accept`/`reject` are confirmed gone (R5-5 closed) |
| 23 | `grep -rn "acceptCandidate\|Accept" apps/web/src` | no view dispatches it — there is no accept control in the app. Fails safe; noted, not routed |

---

## For Jacob

**Where this actually stands.** Cairn's engine is done and it is good. It reads your real Europe
2026 trip out of the live planner without touching it, reproduces the old app's legs and distances
exactly, and finds the two days you flagged yourself — and nothing else it can't justify. The old
rule that cried wolf twelve times now cries twice, both times correctly. It also passes the test
we set it: put the historical Fisherman's Bastion typo back in and it flags it, 109 km off, by
name. The old app never would have.

The web app works. I opened it, loaded your trip, made a second one, browsed yours from inside it
and copied a stop across; the copy arrived labelled *from a friend*, credited to *"Europe 2026"*,
and — this is the good part — the door PIN and confirmation number in that stop's note were
stripped out on the way. Save-and-lose-your-work has been hunted for seven rounds and I could not
break it either.

**Why it is going back.** Three things the plan names did not get built, and nobody wrote them
down as missing:

1. Open Aug 8 and the Condor flight reads *"14:30 · Flight · 1h 20m"* — which looks like you
   arrive at 14:30 after an 80-minute journey. You don't; 14:30 is when the plane leaves Frankfurt.
   A whole design revision went into teaching the model the difference, and then the screen was
   never taught it. That is the single thing most likely to mislead you on a travel day.
2. The conflicts panel has a *Not a problem* button, and if you dismiss something, change the plan
   so it goes away, then change your mind back — it comes back **already dismissed**, with no
   action from you. The mechanism that prevents that exists and is simply never called.
3. Copy a stop from one trip to another and push it into the Optional list, and the *"from Europe
   2026"* credit disappears. It still carries the badge, so nothing of yours gets passed off as
   someone else's or vice versa — but the rule you set says the credit shows wherever the stop shows.

Plus one thing worth your knowing even though it is harmless today: your FlixBus booking reference
is sitting in a build file, because whoever wrote the redaction rule used your real reference as
the example in a code comment. Nothing is published and nothing is deployed, so there is no
exposure — but the rule you asked for after the last review ("redact by rule, not by scrubbing the
five strings we happened to find") is still, in that one place, a scrub of five strings. It's on
the list.

**Nothing needs a decision from you right now.** All of the above is ours to fix and none of it
changes anything you've already settled. Two things you may want to *know* rather than decide:

- **The demo trip still reads as recognisably yours.** Credentials are stripped, personal prose is
  not — deliberately, and the architecture says so. That's fine while the build runs on our laptop.
  The day it serves a public page, the sample has to become an invented trip. That's already
  written down as a Phase 2 exit condition; flag it now if you'd rather it happened sooner.
- **The redaction currently eats flight numbers too** — the sample shows *"Condor [redacted] →
  Vienna"* — because a six-character all-caps code looks the same whether it's `DE2081` or
  `YZGDTS`. We chose safety over readability. Say the word if you'd rather the demo read properly
  and we'll carve out flight designators specifically.

The work left is small and specific: roughly a day for the builder, three short rulings for the
architect, and one QA round pointed at the screens rather than the save path. I'd expect this back
in front of you shipped, not rewritten.
