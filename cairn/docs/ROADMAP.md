# Cairn — Roadmap

Phased delivery. Every phase ships something usable on its own. Phase 1 needs no device, no cloud account,
no API keys and no network. Later phases may assume all of them.

Companion to `ARCHITECTURE.md`; section references point into it.

**Revision 2, 2026-08-25.** Phase 1 went back with five design defects. The largest of them was mine: every
Phase 1 acceptance criterion was a count or a golden diff, `core-conflicts.json` is a snapshot of our own
output, and that is how nine false-positive blockers passed a green acceptance run while a named criterion
sat at 37 %. **How a criterion is written** below is the fix, and it is applied to every phase.

**Revision 4, 2026-08-26.** QA round 4 found the same root cause for the third consecutive round, one level
upstream of where it was last patched. Three of Phase 1's own criteria were part of how it hid: ten tests
used the broken predicate as their proof of success, the derived-cache criterion named a mechanism instead
of an outcome, and the `displayStatus` criterion was ambiguous enough that two rounds read it two ways. All
three are rewritten below against **ARCHITECTURE §2.2b**, and R2-11's `displayStatus` half is ruled on in §D
rather than deferred a third time.

**Revision 9, 2026-08-27.** Phase 1 shipped (`REVIEW.md`, SHIP, `b32ef9a`) and Jacob gave the product
thesis in full — Cairn as the persistent record of a travel life, not a planner. That changes what comes
next and it **shifts the phase numbers by one from the accounts/server phase onward.** The product argument
is `PRODUCT-VISION.md`; the model is `ARCHITECTURE.md` §8; this file is the sequence and the gates.

**Revision 10, 2026-08-27.** Jacob approved the Phase 2 scope in revision 9 and asked for two things: the
approved scope **sequenced** as an implementation plan a builder can pick up increment by increment, and his
travel-distance clarification folded into the long-term architecture. Both are done and **neither re-scopes
anything**. Phase 2's boundaries are exactly as revision 9 left them; what is new is *§ Phase 2 — the
increment sequence*, which supersedes revision 9's six-line build order by spelling the same order out with
a ship gate on each step. The distance work is `ARCHITECTURE.md` **§8.10** and reaches this file as **three
one-line deliverable additions** — Phase 4, Phase 5b and Phase 7 — and **no new phase**. Nothing about
distance is in Phase 2, and the "Explicitly not in Phase 2" list now says so.

> **Phase numbers changed once, here.** Every heading below carries its old number, and every "Phase N"
> written in `ARCHITECTURE.md` §1–§7, `BUILD-NOTES.md` or `QA-FINDINGS.md` before revision 9 means the
> *named* phase it described: "Phase 2" = accounts/server (**now 3**), "Phase 3" = ingest (**now 4**),
> "Phase 4" = the phone (**now 5**), "Phase 5" = photos (**now 6**). Those documents are not being
> rewritten: editing forty cross-references inside settled rulings to correct a number is a worse risk than
> one mapping stated where everybody reads it.

| Phase | Ships | New external dependency |
|---|---|---|
| **1** ✅ | `packages/core` + `packages/client` + `apps/web`: a local-first, multi-trip planner Jacob can open and use | none — Node 24 and a browser |
| **2** | **Travel history, local-first**: past trips, the trip lifecycle, the lifetime map, travel identity, trip participants as data | **none** — still Node 24 and a browser |
| **3** *(was 2)* | `services/api` + Postgres/RLS: accounts, sync, friends, shares, public share links, the accept control | a managed Postgres/auth/storage account |
| **4** *(was 3)* | `services/ingest`: mailbox → candidate review queue → tickets | forward-in address, then Outlook OAuth, then Gmail |
| **5** *(was 4)* | `apps/mobile` (Expo): offline travel, then background location, observed visits, timezones | Apple/Google developer accounts, a physical phone, **a Play background-location declaration** |
| **6** *(was 5)* | Photos: on-device library scan, stop suggestions, opt-in attach | device photo library, **a Play broad-media-access review** |
| **7** *(was 6)* | Discovery through the network, the yearly recap, goals, trace sharing, share-page polish | — |

**Why a second local phase before the server**, in one line each, with the argument in `PRODUCT-VISION.md`
§1: nothing in the travel-history product needs a server; it is the only large capability left that a
single builder can finish and a tester can attack in plain Node with no cloud account; and it is what makes
an account worth creating, because a user with one trip has nothing to sync and a user with twelve past
trips has a travel history.

---

## How a criterion is written

Five rules. They apply to every phase in this document, and a criterion that breaks one is a defect routed
to me, not to whoever failed to meet it.

**1. Every count carries an outcome clause.** A number is satisfiable while the thing misbehaves. *"12
blockers"* was true and meant nothing. The clause names what must be true of each counted item, and for
anything the user is asked to act on, the golden must contain the justification:

> **conflicts:** the golden records the count **and one line per blocker saying why Jacob must act on it.**
> A blocker with no line fails the run. Nine cries of wolf would not have survived writing that line nine
> times.

**2. Every criterion declares its oracle.** One of three tags, on the criterion itself:

| Tag | Means | Standing |
|---|---|---|
| `[legacy]` | checked against output derived from the live planner's own code, run in a `node:vm` | a real external oracle |
| `[stated]` | the expected value is written by hand in `ARCHITECTURE.md` or in this file | a real oracle, as good as the reasoning behind it |
| `[snapshot]` | checked against a file our own code generated | **detects change; proves nothing** |

**No criterion may be `[snapshot]` alone.** Every snapshot criterion is paired with a `[stated]` value or an
injected-fault criterion. `fixtures/golden/core-*.json` are all snapshots and `tools/gen-golden.mjs` says so
in its own header — that honesty was in the repo the whole time and the criteria ignored it.

**3. Every rule that exists to catch a bug ships an injected-fault criterion.** Named fault in, exact output
out. *"`geo_outlier` returns the golden list"* passed while the rule could not see the bug it was written
for; *"inject `place-68` lat `47.5025 → 48.5025` and get exactly one blocker naming `place-68`"* could not
have. **A rule with no injected-fault criterion does not ship.**

**4. Where noise is the risk, the criterion states a ceiling, not a floor.** "Exactly 2 blockers and no
others", never "at least the 2 blockers".

**5. No criterion may demand a number the spec derives differently.** `rollUpCost` day-cost parity was
written as 16/16 while §2.6 *requires* ten of those days to diverge; the code was right and the criterion
was wrong, and the test suite quietly encoded 6 to stay green. Before writing a number, check that the
design does not already forbid it.

---

## Phase 1 — the core engine and a working multi-trip planner

**Goal.** The domain model of `ARCHITECTURE.md` §2 and the local-first client of §4, with the Europe 2026
itinerary loaded through both as the reference trip.

**Independently useful:** Jacob opens a browser, sees his real trip, creates a second one, edits days and
stops, sees them on a map, copies a stop from one trip into the other and sees it credited, and gets a
conflicts panel and a validation report the current HTML cannot give him. It is also the tool that would
have caught the Fisherman's Bastion typo — a claim this phase now has to *prove*, by re-introducing the
typo and getting a blocker (§2.13).

### Revision 2 — what the re-delivery adds

The engine from the first delivery stands. Five design changes land on top of it, all specified in
`ARCHITECTURE.md`:

| # | Change | § |
|---|---|---|
| 1 | `Stop.travelRole` and the schedule rules that read it. `impossible_transfer` goes from 4 blockers to 0. | 2.12 |
| 2 | `geoCheck` — one geography implementation, one consumer. `validateTrip.stop_far_from_city` is **deleted**. `Trip.homeBase` is added. | 2.13, 2.9 |
| 3 | `importDoc` becomes backup/restore and refuses a foreign `ownerId`; `copyStopInto` and the browse-another-trip pane become the sharing path. | 2.14 |
| 4 | Sample-data redaction as a rule with a test, in `tools/redact.mjs`. | 6.6 |
| 5 | `closed` is dropped; `syncResolutions` is added; runtime patch allowlists; no coordinates in `Conflict.params`; the export surface is widened and pinned by a set-equality test. | 2.7, 2.1, 2.10 |

### Revision 3 — what QA round 3 changed in the design

Two design changes, both in the persistence layer, both specified in `ARCHITECTURE.md`. Nothing in the
engine moves.

| # | Change | Closes | § |
|---|---|---|---|
| 6 | The compare-and-set fence stops being `Trip.revision` and becomes an opaque, storage-issued `StorageVersion` in the record envelope. `revision` keeps its content-counter meaning and loses the word "monotonic". `StoragePort.saveIfRevision` → `saveIfVersion`; `load()` returns `{doc, version}`; `revisionOf()` is deleted. **R3-1's narrow fix — `undo` synthesising `revision + 1` — is superseded and must not be built.** | R3-1, R3-4 | 2.2a, 4.2, 4.3 |
| 7 | A pending debounced write is never outlived by its document: the six document-changing paths flush first, a flush that cannot land aborts the transition, and `deleteTrip` of the active trip is the one stated exception. | R3-2 | 4.2 rule 6 |

### Revision 4 — what QA round 4 changed in the design

Round 4 found the round-3 fence itself solid and two places *upstream* of it still making the error the fence
was built to remove. Three design changes; the engine still does not move, and the third is a two-round-old
ruling finally made.

| # | Change | Closes | § |
|---|---|---|---|
| 8 | **§2.2b, the freshness rule** — F1 (nothing may *gate* a write with a document property, not just fence one), F2 (`revision` may prove difference, never sameness), F3 (no minted token may depend on a cached value). Each has a mechanical check. `persistence.savedRevision` is **deleted**; `savedDoc` replaces it and absorbs the store's `baseDoc`; `dirty()` is `doc !== savedDoc`. The derived cache re-keys on `(document identity, today)`. | R4-1 | 2.2a, 2.2b, 4.2 rules 3/4/6a′ |
| 9 | The `StorageVersion` becomes **16 bytes of fresh CSPRNG per mint**. The `epoch`, the storage-wide counter and the `meta` store are deleted — there is no longer anything a port has to remember, so there is nothing to go stale. `crypto.getRandomValues`, never `crypto.randomUUID` (secure-context-only; verified). | R4-2 | 2.2a rules 2/5, 4.3 |
| 10 | **The R2-11 ruling.** `acceptCandidate`/`rejectCandidate`/`copyStopInto` throw on a missing actor (`actorUserId: UserId`, not nullable). A non-member actor on an attributed record is `validateTrip`'s new `accepted_by_non_member` error. §2.14's invariant reads `actorUserId ∈ members(trip)`. | R2-11 (`displayStatus` half) | 2.9, 2.10, 2.14 |

### Revision 5 — the four rulings the Phase 1 gate review routed to the architect

The gate review (`REVIEW.md`, SEND BACK) sent four questions here. None is a redesign; three change client
behaviour on paths QA reached and one closes an acceptance criterion that has been "partially met" for three
rounds. The engine still does not move.

| # | Change | Closes | § |
|---|---|---|---|
| 11 | **A record `copyStopInto` produced anchors on nothing.** `geoCheck` gives any stop with `attribution(r) !== null` `confidence:'unanchored'`, so `geo_outlier` never publishes it, and such a stop is not an *anchor* for other records until it is accepted. Copying a stop from a distant trip is the feature working, not a defect (§0.5). | R2-9 | 2.13 |
| 12 | **The serialization chain's subject is every `StoragePort` mutation, not every write.** `delete()` becomes a link on the chain — drain, delete, forget — so a queued expect-absent write can no longer land behind a delete and resurrect the trip. Rule 6c's exception is about not *writing* on delete, not about not *ordering*. | R7-3 | 4.2 rule 6c, 4.3 |
| 13 | **`FLUSH_MAX_ATTEMPTS = 5` is blessed and named in the design**, with the reasoning that it is a bound and not a timeout. Exhausting it is a refusal *for display too*: `status:'error'` with a message, through the banner that already exists. And the debounce is re-armed on that exit while the document is dirty — the loop cancelled a timer the user's edit had scheduled. | R6-1, R6-2 | 4.2 rule 6a″ |
| 14 | **§2.10's export surface is settled at 69 runtime symbols**, derived by a stated principle (a caller outside `packages/core`, or a numbered section naming it) instead of enumerated against itself. 45 symbols come off the index. Criterion E below is rewritten to one list and real set equality. | R2-12, KD-19 | 2.10 |

*(Doc tidy in the same pass, no ruling: §2.2 gains `Stop.links` and `Stop.ticket` and corrects `Place.at` to
`LatLng | null`; §2.5's `computeLegs(day, ctx: TripCtx)` is corrected to the shipped `computeLegs(day, trip)`
— QA R2-21; §2.14 rule 5 gains `links`, which does copy.)*

### Revision 6 — the two rulings QA round 8 routed to the architect

Round 8 found four MAJORs and no BLOCKER. Two of them are user-reachable in four clicks each, and both
defeat a promise revision 5 made, so both come back here. R8-3 and R8-4 are **not** in this revision and are
not adjudicated by it. Neither ruling is a redesign; the engine still does not move.

| # | Change | Closes | § |
|---|---|---|---|
| 15 | **A-5 — retirement is monotone metadata, not document history.** `retiredAt` stays in the document (it has to persist) and a per-trip **retirement ledger** in `AppState`, outside `history` and never persisted, re-asserts it onto every restored snapshot inside the same `set()`. `reassertRetirements(trip, retired)` is a new pure core function; `set(next, {reseed})` is its one read/write site; `resolveConflict`/`unresolveConflict` release the key. §4.2 rule 5's byte-identity guarantee gains **one** carve-out — `resolutions[].retiredAt`, `null` → a date the ledger already held — and nothing else moves. Retirement still consumes **no** undo slot. | R8-1 | 2.7, 4.2 rule 5, 2.10 |
| 16 | **A-6 — a copy-borne `Place` is exempt too, and `Place`'s shape does not change.** Revision 5's *"Places need no row of their own"* paragraph is **withdrawn**: its premise (an unrecognised `cityKey` yields `nearest === null`) is false for any trip with a `homeBase`. A `Place` with ≥1 linking stop, **all** of them `attribution() !== null`, is measured but never `'certain'`. Derived in `geoCheck` at evaluation time — no `Place.provenance`. Keyed on `attribution()` and **not** on `provenance.state`, so acceptance still only ever adds anchors and can never mint a blocker. | R8-2 | 2.13 |

*(§2.10 moves 69 → 70 runtime symbols as a mechanical consequence of row 15 and for no other reason;
criterion E's list and its set-equality assertion take the one line. No other section moved.)*

### Revision 7 — the two addenda QA round 9 routed to the architect

Round 9 verified rows 15 and 16 and found one adjacent door open on each. Both are addenda to the rulings
already made, not new rulings; neither moves an engine, an export surface or a persisted shape.

| # | Change | Closes | § |
|---|---|---|---|
| 17 | **A-5b — `redo` releases the retirement ledger too.** A-5's *"nothing else releases"* closed list goes from two `dispatch` action types to **three sites**: `resolveConflict`, `unresolveConflict`, and `redo`. History holds `Trip` snapshots and no actions, so `redo`'s release keys off the **document delta** — release an id iff the redone document has a live row for it, the ledger holds it, and the row count for that id **rose**. A uniform veto rule cannot work: two reachable states have identical `(resolutions, marks)` and require opposite outcomes. **`undo` is not changed and must not be.** | R9-1 | 2.7 |
| 18 | **A-6a — `removeStop` prunes the one `Place` a copied stop orphans.** A-6 clause 1 **stands** (60 of the fixture's 94 coordinate-bearing places are orphans and `place-68` is one of them; exempting orphans would cost two thirds of the rule's detection and the blocker ROADMAP C names). Instead the orphan is never created: `removeStop` deletes the removed stop's place iff the stop was a copy, nothing else links it, and it exists. One row, never a sweep. `Place`'s shape, `packages/client` and §2.10 are all unchanged (`removeStop`'s signature does not move). | R9-2 | 2.13 |

### Revision 8 — the one ruling the Phase 1 gate re-review routed to the architect

The gate re-review (`REVIEW.md`, SEND BACK) sent exactly one question here, and everything else it left
standing. Not a redesign: no engine, no persisted shape, no export surface, and no change at either autosave
call site. R8-3, R8-4 and R10-1 are **not** adjudicated by this revision.

| # | Change | Closes | § |
|---|---|---|---|
| 19 | **A-7 — a write the store declines to install may not move the fence.** `savedDoc` and `savedVersion` advance **together**, and only to a document the store still holds (`state.doc === startedFrom`) or one it wrote itself (`toWrite === startedFrom`, true at both autosave sites and false only at the merged write). A successful write whose document is not installed advances neither, re-arms nothing, and leaves `'conflict'` — the merge **refuses** rather than rebasing, and the user presses the button they already have. The exposure is the whole of `doMerge`, not the write. | R11-1 | 2.2a A-7, 4.2 rule 4a |

*(Criterion F below gains an **eighth case** as the direct consequence, with the two ceilings that stop the
fix from becoming a regression. Nothing else in this document moves.)*

### Deliverables

```
cairn/
  package.json                  type:module; no runtime deps in core/client; devDep: typescript
  tsconfig.json                 strict, "erasableSyntaxOnly": true, "verbatimModuleSyntax": true
  packages/core/src/
    model/      types.ts ids.ts money.ts provenance.ts
    build/      createTrip.ts days.ts stops.ts bookings.ts pool.ts candidates.ts
    derive/     legs.ts cluster.ts cost.ts summary.ts display.ts geoCheck.ts
    conflict/   detect.ts resolve.ts rules/*.ts       (one file per rule in §2.7; closed.ts is deleted)
    validate/   validateTrip.ts
    access/     predicates.ts                          (defined now, enforced in Phase 2 — §6.2)
    serialize/  toJSON.ts fromJSON.ts migrate.ts
    import/     legacyDays.ts
    index.ts    the export surface in §2.10 — nothing else is public
  packages/client/src/
    store/      reducer.ts actions.ts history.ts persistence.ts
    ports/      types.ts memory.ts                     (in-memory ports for tests)
    selectors/  *.ts
  packages/tokens/src/          colors, category labels, mode icons
  apps/web/                     Vite + React; port implementations + views (§4.1)
  tools/extract-legacy.mjs      reads ../europe-2026-itinerary.html READ-ONLY
  tools/redact.mjs              redactForSample() + the pattern array — §6.6
  fixtures/europe2026.sha256    hash of the source file — no copy of DAYS is committed
  fixtures/europe2026.bookings.json   transcribed once from docs/BOOKINGS.md, with sourceDoc
  fixtures/golden/*.json        expected legs, costs, clusters, conflicts, validation
  cli.ts                        trip show | day <date> | conflicts | cost | validate | export
```

### Hard constraints on the builder

- **Zero runtime dependencies in `core` and `client`.** No date library, no zod, no lodash. `fromJSON`
  hand-validates and throws `TripParseError` with a JSON path. `apps/web` may take dependencies.
- **`node --test packages/core/test/*.ts packages/client/test/*.ts` must run directly on Node 24** via type
  stripping — which bans enums, parameter properties, namespaces and `declare` fields from both packages.
  `erasableSyntaxOnly` will tell you.
- **No `Date.now()`, `Math.random()` or `crypto.randomUUID()` inside core or the reducer.** Clock and
  `IdFactory` are injected. Deterministic output is what makes golden files possible.
- **`packages/client` must not import the DOM or React**, and must be fully exercisable with the in-memory
  ports. This is what keeps the tester's no-browser reach extending to the state machine.
- **Adjacent, not copied** (§2.11). The extractor *reads* `../europe-2026-itinerary.html`; no copy of `DAYS`
  is committed. Ticket PDFs are referenced by repo-relative path. `europe-2026-itinerary.html`, `docs/` and
  `tickets/` at the repo root are **read-only** — the live app on Jacob's phone.
- **`Trip.ownerId` and the `core/access` predicates ship in this phase** even though nothing enforces them
  yet. They are the definition the accounts phase's RLS policies (now Phase 3) are generated from and
  tested against (§6.2).
- Every exported function gets a doc comment stating whether it is pure and what it throws.

### Build order (spine first)

The builder's own rule is *runnable beats complete*. Build in this order so an incomplete phase is still a
working thing:

1. `model` + `serialize` + `import/legacyDays` + the extractor — the fixture loads and round-trips.
2. `derive` (legs, cost, clusters) + `validate` — the CLI reports on a real trip. **Useful already.**
3. `conflict` — the conflicts panel has something to show.
4. `client/store` + in-memory ports — the state machine, testable in Node.
5. `apps/web`: trip library → day view → day map → conflicts panel → export/backup-restore → browse-and-copy.

For the revision-2 rework specifically, in this order — each step leaves the repo runnable:

1. **The two data-loss bugs first** (compare-and-set on save; `importDoc` against stored state). Nothing
   else matters while the app can eat an edit.
2. **`travelRole`** — model field, importer derivation, `impossible_transfer` narrowed. Blockers 12 → 6.
3. **`geoCheck` + `Trip.homeBase`**, `geo_outlier` rewritten, `stop_far_from_city` deleted, `closed.ts`
   deleted. Blockers 6 → 2, validation issues 31 → ~11.
4. **`copyStopInto` + `importDoc`'s owner guard + `attribution`** — the provenance contract, in core first,
   then the pane.
5. **Redaction, the export-surface test, the dependency test, the runtime patch allowlists, and the
   remaining routed fixes.**

**May be stubbed, called out in BUILD-NOTES:** drag-reorder (buttons suffice), the city map, duplicate and
rename, any new-trip wizard beyond title + dates. **May not be stubbed:** multi-trip switching, stop editing,
the day map, the conflicts panel, JSON import/export.

### Acceptance criteria

Every criterion carries its oracle tag. See **How a criterion is written** above; the tags are load-bearing,
not decoration.

#### A. Import fidelity — the shape of the trip

- **16 days**, dense from `2026-08-07` to `2026-08-22`, `Day.id === Day.date` throughout `[stated]`
- **112 scheduled stops; 31 pool stops** (vienna 8, dubrovnik 3, split 3, prague 8, budapest 6, london 3)
  `[stated]`
- **95 places** (vienna 15, dubrovnik 12, split 15, prague 25, budapest 21, london 7) `[stated]`
- **5 multi-city days**: `08-10 vienna+dubrovnik`, `08-12 dubrovnik+split`, `08-15 split+prague`,
  `08-18 prague+budapest`, `08-21 budapest+london` `[stated]`
- **3 days** with `provenance.state === 'candidate'`; **21 stops** with `displayStatus() === 'suggested'`,
  **and every one of the 21 carries `source:'system'`** — the count alone does not distinguish a suggestion
  from a mis-stamped import `[stated]`
- **7 stops carrying a `Ticket`; 3 of them `kind:'bundled'`, over 2 distinct files.** `[stated]` *Revision
  1 said "2 bundled" and the repo's own `import.test.ts:63` asserted 3 with a comment explaining why; the
  spec was wrong and two reports repeated it. Three tickets, two files — one PDF is referenced twice.*
- **81 stops with an `arrival`**, and `travelRole` splits **21 journey / 81 transfer / 10 unknown** (§2.11);
  **49 with a non-null `cost`** `[stated]`
- `Trip.homeBase` is `{name:'Los Angeles (LAX)', at:{33.9425, -118.4081}}` `[stated]`
- `cityRange()` reproduces the six hardcoded `CITY_RANGE` strings exactly `[legacy]`

#### B. Parity with the live planner — the external oracle

- `computeLegs` reproduces the live app's minutes and kilometres for **all 16 days** `[legacy]`
- **`computeLegs` output is byte-identical before and after `travelRole` exists.** `[legacy]` The additive
  constraint of §2.12, as a check rather than a promise: regenerate `legacy-legs.json` from a clean clone
  and diff.
- **`rollUpCost(day)` matches the live app's `dayCost()` string on exactly 6 of 16 days, and diverges on
  the other 10 in the way §2.6 requires.** `[legacy + stated]` The golden lists **all 16 days**, and for
  each divergent day **names the §2.6 clause that causes it** — currency kept separate, per-party not
  summed with per-person, or one display string carrying two products. *A divergent day with no clause named
  fails the run.* Revision 1 demanded 16/16, which §2.6 forbids; the code was right and this criterion was
  wrong.
- Badge-only "free" stops contribute nothing to a roll-up `[legacy]`
- `rollUpCost` is always called with `{ target: trip.homeCurrency }`, and a `homeCurrency:'EUR'` trip never
  reports EUR in `missingRates` `[stated]`

#### C. Conflicts — the phase's headline feature

- **`detectConflicts` returns exactly 2 blockers on the unmodified reference trip: the `legacy_flag` days
  Aug 18 and Aug 20, and nothing else.** `[stated + snapshot]` The golden carries **one line per blocker
  saying why Jacob must act on it.** A third blocker cannot appear without someone writing that line.
- Non-blockers on the unmodified trip: `unverified_reference` ×2 (IU1TUY, I54C9A), `missing_lodging` ×2
  (Budapest, London), `superseded_booking` ×1 (YZGDTS), plus `unbooked_ticketed` notes `[stated]`
- **`booking_vs_plan` does not fire for Aug 15** — a resolved agreement `[stated]`
- **`impossible_transfer` returns 0 blockers and 0 warnings** on the unmodified trip, and the tightest
  remaining margin on any `travelRole:'transfer'` stop is **7 minutes** (Aug 14, Skradin) `[stated]`
- **Injected fault — the departure model:** set `travelRole:'transfer'` on the Aug 8 Condor DE4345 stop and
  `impossible_transfer` fires as a blocker; leave it `'journey'` and it does not. Set it `'unknown'` and it
  fires as a **warning** `[stated]`
- **Injected fault — the geography rule, the one that matters:** re-introduce the historical typo,
  `Place place-68` (Fisherman's Bastion) lat `47.5025 → 48.5025`, and `detectConflicts` returns **exactly
  one additional blocker, `geo_outlier`, naming `place-68`, with `km ≈ 110`** `[stated]`
- **`geoCheck` returns 0 findings on the unmodified trip** — 0 of 112 scheduled stops, 0 of 94
  coordinate-bearing places `[stated]`
- **Injected fault — the copy path must not mint a blocker** (rule 3; QA R2-9, §2.13's copied-record row).
  Two faults, one criterion, because the rule has to catch the bug it exists for *and* stop causing the one
  it caused:

  > **(a) The false blocker is gone.** Build a Lisbon-based trip (`homeBase` Lisbon, one city, ≥1 own stop),
  > `copyStopInto` the reference trip's **"Arrive LAX"** stop onto one of its days, then run `geoCheck` and
  > `detectConflicts`. The copied stop's finding has `confidence:'unanchored'` with `km ≈ 9140` and
  > `nearest !== null` (the distance is still measured; §2.13), and `detectConflicts` returns **zero**
  > `geo_outlier` conflicts — a ceiling, not a floor. Repeat after `acceptCandidate` on that stop: still zero.
  > A run producing one `geo_outlier` is the R2-9 defect; a run producing a finding with `nearest === null`
  > has implemented "skip the record" rather than "measure it and decline to publish".
  >
  > **(b) The un-accepted copy cannot suppress a real blocker.** On that same trip, copy a stop and place it
  > on a day, then inject a +1° latitude fault into an **own** stop on that day such that the faulted stop
  > lands within 35 km of the copied one and >35 km from every other anchor. `detectConflicts` returns
  > **exactly one** additional blocker, naming the faulted own stop. Then `acceptCandidate` the copied stop
  > and re-run: **zero** blockers, because acceptance adds an anchor. Assert both halves — the first is the
  > suppression the symmetric clause exists to prevent, the second is the stated consequence of accepting,
  > and a run where acceptance *creates* a blocker fails outright.
  >
  > **(c) The place the copy dragged in must not mint one either** (revision 6, §2.13 A-6, QA R8-2). On the
  > same Lisbon trip, copy a stop whose `PlaceLink` is `{kind:'place'}` — so `copyStopInto` rule 4 copies the
  > `Place` across — and assert all four of: `geoCheck` returns a finding for the copied place with
  > `confidence:'unanchored'`, `nearest !== null` and `km` equal to the real distance (a finding with
  > `nearest === null` is "skip the record", which is wrong); `detectConflicts` returns **zero**
  > `geo_outlier` conflicts, a ceiling; **`acceptCandidate` on the copied stop leaves it at zero** — a run in
  > which acceptance produces a `geo_outlier` naming that place fails outright, because A-6 keys on
  > `attribution()` and not on `provenance.state` for exactly this reason; and finally, add a stop the *user*
  > authored (`attribution() === null`) resolving through that same place, and the place becomes `'certain'`
  > again — with a +1° fault injected into it, **exactly one** `geo_outlier` naming that place. The last half
  > is what stops the exemption being a hole: `every`, not `some`.
  >
  > **And the four-click regression, on the real fixture:** the sequence QA measured — open the reference
  > trip, browse a second trip, copy one place-linked stop across — leaves `detectConflicts` at **2**
  > blockers, not 3. `[stated]` A run reporting 3 is R8-2.
  >
  > **(d) Deleting the copy takes its place with it** (revision 7, §2.13 A-6a, QA R9-2). Continue the same run
  > one click further — `removeStop` on the copied stop — and assert all four of: `detectConflicts` still
  > returns **2** blockers on the reference trip (a run reporting 3 is R9-2); `trip.places.length` is back to
  > its pre-copy value and the copied place's id is absent; **undo** restores stop *and* place together, with
  > `geoCheck` reporting that place `'unanchored'` again; and, the guard against a sweep, removing a stop the
  > **user** authored whose place has no other link leaves that place in `trip.places` and still measured —
  > inject +1° into it and get **exactly one** `geo_outlier` naming it. A run in which a user-authored place
  > disappears, or in which the fixture's other orphaned places are pruned, fails outright. Also assert two
  > copied stops on one place: the first removal leaves it present and `'unanchored'`, the second prunes it;
  > and `rejectCandidate` prunes nothing, because the stop stays in the document.
  >
  > **Ceiling on the reference trip:** it contains no record with `attribution(r) !== null`, so no place in it
  > can satisfy A-6's `every(isCopied)` either, and all of §2.13's existing numbers must be unchanged by both
  > rows — 0/112 and 0/94 clean, 112/112 and 92/94 under +1°, and the Fisherman's Bastion blocker still
  > fires. **Re-derive them; do not quote them.** A run in which any of those moves fails `[stated]`
- **`geoCheck` detection rate under a +1° latitude fault, injected on each record in turn: 112/112 scheduled
  stops and 92/94 places.** The two permitted misses are `Blue Cave, Biševo` and `Stiniva Cove, Vis`,
  named in §2.13 `[stated]`
- **`validateTrip` emits no `stop_far_from_city` — the code does not exist.** There is exactly one
  implementation of a coordinate-to-anchor distance in `packages/core`, in `derive/geoCheck.ts`; a grep for
  `haversine(` outside `derive/geo.ts`, `derive/geoCheck.ts` and `derive/legs.ts` returns nothing `[stated]`
- **No rule puts a coordinate in `Conflict.params` or `Conflict.values`.** Walk every conflict on the
  fixture for floats in `[-180,180]` with 3+ decimals; expect none, and expect none in
  `fixtures/golden/core-conflicts.json` `[stated]`
- **Conflict ids are stable across a genuine re-import** — a second `loadEurope2026()`, not a second
  `detectConflicts` call on one object `[stated]`
- **Acknowledgement follows the value, in both directions** `[stated]`, asserted on specific ids, not on
  array inequality:
  - acknowledge the Aug 20 `legacy_flag` blocker, then edit that day's subtitle → **that exact id is absent
    from the new set**, and `resolution` on the replacement id is `null`
  - acknowledge it, then edit the Aug 18 flight time → **that exact id is still present and still
    acknowledged**, because the edit does not touch its inputs. This half is the mechanism working; revision
    1's criterion mistook it for a failure.
- **A dismissal does not resurrect** `[stated]`: dismiss a conflict at value X, edit to Y, edit back to X →
  the conflict returns with `resolution === null` and a `detail` recording the earlier dismissal;
  `syncResolutions` has marked the old row `retiredAt`.
- **Injected fault — undo does not un-retire** (rule 3; revision 6, §2.7 A-5, QA R8-1). The exact four-action
  sequence QA measured, asserted in `packages/client` over the in-memory ports **and** repeated in Chromium
  (`qa/r8-undo.mjs` is the shape) `[stated]`:

  > Move a stop so a `booking_vs_plan` **blocker** appears; dismiss it; move the stop back (the next
  > `getDerived()` retires the resolution — assert `retiredAt !== null` here); press **undo**. Assert, on the
  > state the subscriber is handed and not on some later recompute: the restored resolution row still carries
  > `retiredAt` set to **the same date** it was retired with, the returned conflict's `resolution` is `null`,
  > and no rendered row anywhere reads *"Marked dismissed"* against a live blocker. Then press **redo** and
  > **undo** again and assert it twice more — the ledger is monotone, so it must hold at every depth, not
  > only the first.
  >
  > **Three ceilings on the same run, each of which fails it independently:** `history.past.length` moves by
  > **exactly one** across the retirement plus the undo — retirement consumes no undo slot; the subscriber is
  > called **once** for the undo, never once with the stale document and again with the corrected one; and
  > `state.retired` is absent from `toJSON(state.doc)` and from anything written to the `StoragePort`.
- **A re-answer is not stillborn** `[stated]`, the release half of A-5: after the sequence above,
  `unresolveConflict` then `resolveConflict` the same id → the new row's `retiredAt` is `null` and **stays**
  `null` across the next three `set()`s. A ledger that re-stamps a fresh answer has implemented "never
  un-retires" as "never resolve again".
- **A *redone* re-answer is not stillborn either** (revision 7, §2.7 A-5b, QA R9-1) `[stated]`. QA's seven
  actions, asserted in `packages/client` over the in-memory ports **and** in Chromium (`qa/r9-redo.mjs` is
  the shape): dismiss → retire → undo → dismiss again → undo → **redo**. The redone row's `retiredAt` is
  `null`, the conflict renders **resolved**, and both hold across three further `set()`s *and* across a
  storage round trip and reopen. Two ceilings on the same run: a redo that does **not** raise any row count
  releases nothing — with a mark held, the restored live row is still stamped (R8-1 at redo depth) — and
  **`undo()` never releases**, asserted at six undo/redo depths. Assert the invariant on every step of all
  three sequences: *for every id in `state.retired.marks`, `state.doc` holds no row for that id with
  `retiredAt === null`.* That single assertion fails on both R9-1 and KD-36 and is the cheapest guard here.

#### D. Provenance, import and copy

- `toJSON(fromJSON(toJSON(trip)))` is byte-identical `[stated]`
- `returnToPool` then `scheduleFromPool` restores a stop to the same day, time and position, losslessly
  `[stated]`
- **`importDoc` refuses a foreign owner:** a document with `ownerId:'user:marta'` throws
  `ForeignDocumentError`, nothing is written to storage, and the library is unchanged `[stated]`
- **`importDoc` never overwrites:** restoring a doc whose id is already in *storage* (not just in the
  boot-time snapshot) either mints a new id or refuses visibly; the stored trip's contents are unchanged
  either way `[stated]`
- **`copyStopInto` produces a badged, credited stop, always** `[stated]`: new id; `displayStatus()` is
  `'imported'`; `attribution()` names the source trip and stop; `bookingId` is `null` and no `Ticket`
  travelled; a referenced `Place` came with it.
- **Credit survives acceptance:** `acceptCandidate` on that stop makes `displayStatus()` return `'own'` and
  leaves `attribution()` non-null. `validateTrip` returns `origin_stripped` if `origin` is removed by hand
  `[stated]`
- **`updateStop` throws on `id`, `placement`, `provenance` and on any key outside `Stop`** — the runtime
  allowlist of §2.1, not the compile-time type `[stated]`
- **Nothing un-accepted and non-user ever returns `displayStatus() === 'own'`**, over the full provenance
  matrix *and* through `updateStop`, `moveStop`, pool round-trips, JSON round-trips, undo/redo and
  `copyStopInto` `[stated]`

  **Scope, ruled explicitly in revision 4 (QA R2-11).** *"Un-accepted and non-user"* means `source !== 'user'`
  **and** `state !== 'accepted'`. It is the contrapositive of §2.8's definition of `'own'` and nothing more:
  the cell set `{source ≠ user} × {state ≠ accepted}` of the provenance matrix. A record that
  `acceptCandidate` has stamped `accepted` **is** accepted, whoever stamped it, so a wrong-actor or
  null-actor acceptance returning `'own'` does not violate this criterion as written — and it is not going to
  be reinterpreted after the fact to say it did. Two rounds of the tester reading it the other way is
  itself the evidence that it was written ambiguously, which is my defect, not the builder's.

  **That does not make the behaviour acceptable, and calling it a Phase 2 deferral would be wrong.**
  ARCHITECTURE §2.14 states the third clause as an invariant *to attack*, ARCHITECTURE binds exactly as
  ROADMAP does, and the invariant is false — with no criterion behind it, which is a straight violation of
  **How a criterion is written, rule 3** (a rule that exists to catch a bug ships an injected-fault
  criterion). So: **a genuine unmet Phase 1 obligation, mine, and it is met by the two criteria below rather
  than by widening the sentence above.** Whether a second user exists is beside the point for the null-actor
  half — an acceptance with no accepter is a row whose ownership can never be established afterwards, and
  "ownership traceable on every row" is on the brief's day-one list precisely because it is the expensive
  retrofit.

- **An acceptance always records who accepted.** `acceptCandidate` and `rejectCandidate` take
  `actorUserId: UserId`, not `UserId | null`; `copyStopInto`'s `ctx.actorUserId` is checked the same way.
  `null`, `undefined` and `''` **throw**, over the full ref matrix (`day`, `stop`, `booking`) — and as a
  ceiling, **the input trip is unchanged and `revision` has not moved** after each throw, so there is no
  partially-mutated document behind the exception. A compile-time-only change does not satisfy this: the
  type was already non-nullable on `copyStopInto` and R2-11 went straight through it `[stated]`

- **Injected fault — acceptance by a non-member** (rule 3; QA R2-11). Hand-build a stop with
  `source:'friend'`, a valid `origin`, `state:'accepted'`, `acceptedAt` set, and
  `actorUserId:'user:someone-else'`, on a trip with `ownerId:'local:self'`. `validateTrip` returns **exactly
  one additional issue**: `level:'error'`, `code:'accepted_by_non_member'`, `ref` naming that stop, `params`
  carrying both the actor and the owner. As a ceiling, **zero additional issues on the unmodified reference
  trip** — `source:'user'` records with `actorUserId:null` are outside the rule's subject by design (§2.14)
  and a run in which the reference trip's issue count moves at all fails. `displayStatus()` on the faulted
  record still returns `'own'`, and the test asserts that on purpose: `displayStatus` is a pure function of
  one `Provenance`, cannot see the trip, and must not learn to — the invariant is a claim about which
  documents may exist, and `validateTrip` is where those are enforced `[stated]`

#### E. The build artifact

- **`redactForSample` output contains no match for any pattern in `tools/redact.mjs`**, and every pattern in
  that array is matched by at least one fixture string — a pattern that catches nothing is a failure
  `[stated]`
- **The built bundle is clean:** with `apps/web/dist/` present, no asset contains `PIN 0754`, `5814731574`,
  `YZGDTS`, `IU1TUY`, `cityairporttrain.com/en/account/order/`, or `ulaznice.hr/web/confirmFromMailGuest/`
  `[stated]`
- **`importLegacyDays` output is unchanged by redaction** — the CLI and every golden still see the real
  trip, so cost and leg parity are untouched `[legacy]`
- **`npm run typecheck` passes on a fresh clone**, before any build step `[stated]`
- **`cli export` refuses any path that normalises outside `cairn/`** `[stated]`
- **The dependency-direction test exists and passes**, including "nothing under `apps/` imports
  `tools/extract-legacy.mjs`" `[stated]`
- **`packages/core/src/index.ts`'s runtime exports equal §2.10's list exactly — 71 symbols** (69 in revision
  5; `reassertRetirements` joins in revision 6 under P1, §2.7 A-5; `lifecycle` joins in revision 10 under
  P2, §8.1/§8.9, counted in Phase 2 I-1's own pass), **one list, set
  equality in both directions** `[stated]`. Rewritten in revision 5, because the criterion as met was
  satisfied by construction: the test asserted equality against the **union** of `SECTION_2_10` (50) and
  `BEYOND_2_10` (60), which is 110 = 110 for any 110 exports, and QA found 42 of the 60 per-symbol
  justifications did not hold (R2-12, KD-19). So, mechanically:

  > `surface.test.ts` contains **exactly one** array of symbol names. Grep the file: zero occurrences of a
  > second list, of the identifier `BEYOND_2_10`, and of the string `INTERNAL` — a symbol the test itself
  > calls internal is a symbol that is not exported. The assertion is
  > `setEquals(Object.keys(runtimeExportsOf(index)), THE_LIST)` in both directions, and `THE_LIST` is §2.10's
  > list transcribed, **71 entries**. Type-only exports are excluded from the set by construction (they do
  > not exist at runtime) and the criterion says so rather than leaving a tester to discover it.
  >
  > **Plus the two ceilings that stop the list drifting back:** (1) grep `packages/client/src`,
  > `apps/web/src`, `cli.ts`, `fixtures/` and `tools/` for any import from a `packages/core/src/**` path
  > **other than** `index.ts` (or, for `packages/client`, its single `deps.ts` re-export of it) — expect
  > **zero**, which is what makes `tools/redact.mjs`'s deep import into `build/redactText.ts` fail until the
  > redaction four are on the index; (2) every name in `THE_LIST` satisfies §2.10's derivation — it is either
  > called from outside `packages/core` or named in a numbered section of `ARCHITECTURE.md`. The second half
  > is checkable by grep and is the *principle* being asserted, not 70 hand-written justifications; a symbol
  > that satisfies neither is removed from the index, not annotated. `cairn/test/` and `cairn/qa/` are
  > exempt from ceiling (1) by design: tests may import a module path directly, because tests do not create
  > surface `[stated]`

#### F. The client, without a browser

- every action dispatches to exactly one core build function; the reducer contains no domain logic `[stated]`
- `ui` state never appears in a persisted document (assert on the saved bytes) `[stated]`
- **`derived` is never read stale**, and revision 4 replaces the mechanism this criterion used to name: the
  cache key is `(document identity, today)`, not `(revision, tripId)` (§2.2b F2). Injected fault, the R4-1
  sequence aimed at the cache: call `getDerived()`, `undo()`, then dispatch a *different* edit that lands on
  the same `revision`, with **no** `getDerived()` call in between — then assert `getDerived()` reflects the
  new edit, on a value the new edit changes and the undone one did not (the day's leg order, or a conflict
  count under an injected `legacy_flag`). As a ceiling, over the 200-step walk below assert
  `getDerived()` deep-equals `computeDerived(state.doc, today)` at **every** step: zero divergences, not
  "converges by the end". A wrong implementation serves the pre-undo document's legs, costs, clusters and
  conflicts. Separately: `store.syncResolutions()` invoked at that point must not retire a resolution whose
  conflict is present in the *current* document — the stale cache there does not merely render, it writes
  `[stated]`
- **No view memoises on a revision either.** Grep `apps/web/src` for `revision` inside a React dependency
  array or any other memo key; expect none. `DayMap`'s effect was one, and a dependency array is `===`
  suppressing work, which is exactly what §2.2a rule 1 forbids `[stated]`
- undo/redo restores the previous `Trip` exactly, to a depth of 50 — **byte-identical, `revision` included**,
  because §2.2a makes `revision` content and not a fence `[stated]`. **One carve-out, revision 6 (§4.2 rule 5,
  §2.7 A-5, QA R8-1), and the criterion is written as a ceiling on it:** a `resolutions[]` row whose
  `retiredAt` was `null` may come back carrying the date the retirement ledger already holds for its
  `conflictId`, and `revision` is bumped when that happens. Assert it as **field-by-field equality over the
  whole document with `resolutions[].retiredAt` and `revision` excluded**, plus: the only rows that differ are
  rows the ledger has a key for, the value written equals the ledger's value exactly, and **no `retiredAt`
  ever goes from a date back to `null`**. A criterion that just skips `resolutions` would let a resolution's
  `state`, `by`, `at` or `note` drift through the same hole `[stated]`
- **Undo cannot readmit a refused write** (injected fault for §2.2a, QA R3-1). Two stores at the same
  starting point; A saves; B saves and is refused; **A presses undo and its autosave completes**; then B
  dispatches another edit and saves. B MUST still be `'conflict'`, B's indicator string MUST NOT be "Saved",
  and storage MUST contain A's document. As a ceiling: across the whole sequence there is **no moment at
  which two stores both render "Saved" while holding different documents** — assert both indicator strings
  and both `doc` values at each step, not just at the end. The same run repeated in Chromium against real
  IndexedDB (`qa/r3-browser.mjs` is the shape) `[stated]`
- **`persistence.savedVersion` and `persistence.savedDoc` are only ever assigned from a `StoragePort`
  result.** Grep the store for assignments to each and assert every one traces to a `load()` or a successful
  `saveIfVersion()` (for `savedDoc`, to the exact document that write carried); **the reducer contains no
  reference to either**, so no `undo`, `redo` or `set()` can move the fence or make the store believe an
  unwritten document was written. A criterion on behaviour alone would keep passing the day someone
  recomputes one from `doc` `[stated]`
- **`savedRevision` does not exist.** Grep `packages/client/src` and `apps/web/src`: **zero** occurrences of
  `savedRevision` (a ceiling — revision 3 left the field in place with one consumer, and that consumer was
  R4-1; a field that exists is a field the next person compares). Every remaining occurrence of `revision`
  in a `===`/`!==` outside `packages/core` is listed in the test with a one-line justification that the
  comparison can only ever cause *more* work to happen, never less — §2.2b F2's check, in the form of How a
  criterion is written rule 1. An unjustified occurrence fails the run; the expected list is empty `[stated]`
- a failing `StoragePort.save` puts `persistence.status = 'error'` and never drops the edit silently
  `[stated]`
- **two tabs, one trip, SEQUENTIALLY: the second save is refused, not silently applied.** Tab A saves, tab B
  saves, tab A saves again → tab A's write is refused, `status` is `'conflict'`, tab A's indicator does
  **not** say "Saved", and the stored document still contains tab B's edit `[stated]`
- **two tabs, one trip, CONCURRENTLY — both saves in flight at once.** The criterion above is satisfiable
  by a `load` → compare → `save` that has an interleaving point in the middle, and was: it passed for the
  whole of revision 2 while the same two tabs saving *at the same moment* lost an edit two runs in three
  and **both** displayed "Saved" (QA R2-1). So this criterion is written so that a sequential
  implementation cannot meet it:

  > Two stores over one `StoragePort`, both holding the same `savedVersion`, both editing, and **both writes issued
  > before either is awaited** — `await Promise.all([a.flush(), b.flush()])`, never `await a.flush(); await
  > b.flush()`. Then, asserted on named stores rather than on a count: **exactly one** store's edit is in
  > storage; the winner is `'idle'` and not dirty; the loser is `'conflict'`, is still dirty, still holds
  > its edit in memory, and **its indicator string is not "Saved"**; and `mergeWithStored()` carries the
  > loser's edit through. A run in which both stores agree, or in which neither wins, fails. `[stated]`

  The compare **must** happen inside `StoragePort.saveIfVersion(id, expectedVersion, doc, summary)`,
  atomically with the write. A guard in the client above two awaits does not satisfy this and cannot: the
  port is the only place the two steps can be made indivisible. The port contract carries its own
  criterion, because `apps/mobile`'s SQLite port and Phase 2's `SyncPort` must meet it too — **N
  concurrent `saveIfVersion` calls at the same expected version yield exactly one `ok:true`**, and a
  refusal reports the version actually found `[stated]`
- **The write fence is an opaque `StorageVersion`, never `Trip.revision`** (§2.2a). Five parts, the first
  three runnable against the in-memory port in plain Node:
  1. **Freshness.** Every `ok:true` returns a version not equal to any version that storage has ever
     returned before, for any id. Assert over 200 writes across 3 ids interleaved with a `delete()` — as a
     ceiling, **zero repeats**, not "mostly distinct". Revision 4 extends the same assertion across storage
     *instances*: construct the port, write, discard it, construct a **second** port over a fresh backing
     store, write again, 100 cycles — pool every token ever returned and assert **zero duplicates in the
     pool**. A fixed default `epoch` passes part 1 and fails this, which is R4-2 in one line.
  2. **ABA, injected fault** (QA R3-4): store a document, keep its version, `delete()` the id, write a
     *different* document under the same id, then attempt the held write. It MUST be refused, and the
     stored document MUST still be the newcomer's. Run it with the recreated document at the *same*
     `Trip.revision` as the deleted one — that exact case returned `ok:true` in revision 2.
  3. **Opacity.** `packages/client` contains no comparison of two `StorageVersion`s other than `===`/`!==`,
     no arithmetic on one, and no `JSON.parse` of one; and `revisionOf()` no longer exists. Grep-asserted.
     This is what lets the accounts phase substitute a server `ETag` and the phone phase a SQLite counter without touching the
     store. Revision 4 adds a ceiling: **no test, golden or fixture contains a `StorageVersion` literal** —
     zero occurrences of a string matching a minted token's shape outside the ports themselves. A test that
     pins `'mem.1'` is a test that will be "fixed" by making the token predictable again `[stated]`
  4. **Injected fault — the database is destroyed under a live tab** (QA R4-2, §2.2a rules 2/5, §2.2b F3).
     **In Chromium against real IndexedDB**; `qa/r4-epoch.mjs` is the shape, and this one cannot be proved in
     Node, because the fault is a real database going away. Port instance **P** (a tab that stays open)
     writes trip *T* and holds token `V`. `indexedDB.deleteDatabase('cairn')`. A second port instance **Q**
     (the tab that restores the backup) writes *T* with `saveIfVersion(T, null, …)` and receives `V2`.
     Assert, in order: **`V2 !== V`**; then `P.saveIfVersion(T, V, …)` returns `{ok:false}`; then the stored
     document is still Q's; then the store holding P renders an indicator that is **not** "Saved". A wrong
     implementation returns `V2 === V` — which is what QA measured, byte-identical — or returns a distinct
     `V2` and accepts `V` anyway. *The trigger is `deleteDatabase`, and the criterion says so: QA could not
     make Chromium evict on demand, so browser-initiated eviction is the same mechanism with a trigger we
     cannot fire, and this criterion does not pretend to cover it* `[stated]`
  5. **Static — nothing a token is built from is remembered** (§2.2b F3's check). On the path from entering
     `saveIfVersion` to producing the returned `version`, every identifier is a parameter, a local, or read
     inside the same transaction; **no identifier declared in the port factory's closure appears on it**.
     `ensureReady`'s memoised `Promise<void>` is explicitly permitted and named as the distinction: memoising
     *that* a one-time job ran is legal, memoising a *value* a token is derived from is not. And the mint is
     `crypto.getRandomValues`, **not** `crypto.randomUUID` — verified secure-context-only, therefore
     `undefined` over plain HTTP on a LAN address, which is how this app would be opened on a phone from
     `tools/serve.mjs`. Assert there is **no `Math.random()` fallback on the fence path**: a fence fails
     closed, and the store shows `'error'` `[stated]`
- **A store does not race itself.** Autosave and an explicit `flush()` overlapping must not put a tab into
  `'conflict'` against its own write — there is no other writer to merge with, so that state is
  unresolvable. Three overlapping `flush()` calls on one store end `'idle'`, with the last edit stored
  `[stated]`
- **Every `StoragePort` mutation is on the serialization chain, `delete()` included** (revision 5, §4.3,
  §4.2 rule 6c; QA R7-3). Two halves, structural and behavioural, because either alone has already been
  passed by a store that had the hole:

  > **Structural:** every `ports.storage.*` call in `packages/client/src` that is not `listTrips` or `load`
  > appears lexically inside a `chainOntoSaving` callback. Grep-asserted, expected count of violations
  > **zero**. This is the same shape as the R3-3 assertion (one `saveIfVersion` call site, all
  > `writeAndSettle` call sites inside the chain) and it now covers `delete`.
  >
  > **Injected fault — the delete that came undone:** queue a write for trip *T* on a `StoragePort` whose
  > `saveIfVersion` resolves on a latch you control, call `deleteTrip(T)`, then release the latch. Assert,
  > after everything settles: *T* is **absent from storage** and **absent from `library`**, and no
  > `saveIfVersion` for *T* returned `ok:true` after the delete. `qa/r7-chain.mjs` §10 is the shape and
  > currently reports `in storage=true in library=true`. Run it in both orders — write queued before the
  > delete, and a write attempted after it — and assert the same end state for both `[stated]`
  >
  > **And the exception survives:** `deleteTrip` of the *active* trip with `status:'conflict'` still
  > succeeds. A conflicted trip must not become undeletable, which is the whole reason rule 6c exists
  > `[stated]`
- **The flush loop's bound is a refusal the user can see, and it re-arms the debounce** (revision 5, §4.2
  rule 6a″; QA R6-1, R6-2). With a `StoragePort` that always leaves the document dirty after a write (or a
  scheduler that lands an edit inside every write's latency), so the loop reaches `FLUSH_MAX_ATTEMPTS`:

  > After `closeTrip()` returns: the transition **did not happen** (`activeTripId` unchanged, edit still in
  > `doc`, `isDirty()` true); `persistence.status` is `'error'` with a non-empty `lastError`; **the rendered
  > banner text is asserted, not the enum** — it names what happened and offers retry and export, per the NO
  > SILENT LOSS criterion's rule that a test reading the enum keeps passing when the view stops reading it.
  > A run in which the rendered output is unchanged from before the click fails.
  >
  > **And the write is rescheduled:** immediately after that same call, a debounce timer is pending, and with
  > real timers and a port that now succeeds, the edit reaches storage **with no further user input** —
  > assert the stored bytes, and assert that `status` returns to `'idle'` when it lands. Today: no write in
  > 200 ms with the user idle. As a ceiling, assert the two exits that must **not** re-arm — after a
  > `'conflict'` exit and after a port-failure `'error'` exit, **no timer is pending** — so a builder cannot
  > satisfy this by re-arming unconditionally and spinning against a fence that will refuse every 400 ms
  > `[stated]`
- **NO SILENT LOSS, as a criterion rather than a hope.** *A user's edit is never discarded, overwritten, or
  made unreachable without the app saying so, on screen, at the moment it happens.* Every write path is
  checked against it, and each of the four blockers this phase has produced — F-1, F-2, R2-1, R2-2 — is one
  violation of this one sentence. Testable form, and the shape every future write path inherits:

  > For each of: a refused concurrent save, a refused sequential save, a failing `StoragePort`, a restore
  > over an existing id, and a stop returned to the pool from a day belonging to no city — **the edit is
  > still in memory, some surface still reaches it, and the indicator does not read "Saved".** Assert the
  > *indicator string the view renders*, not `persistence.status`: a criterion that reads the enum keeps
  > passing when the view stops reading it. `[stated]`

  **Sixth case — the edit's container goes away** (QA R3-2, §4.2 rule 6). The five above all keep the edit
  in memory. This is the one where the *document* is replaced, closed or deleted while a debounced write is
  still pending, so there is no memory left to keep it in. It is one click and needs no second tab.

  > **The list is closed and asserted as a ceiling first:** `closeTrip`, `openTrip`, `createTrip`,
  > `adoptTrip`, `importDoc`, `deleteTrip` are the only store methods that assign `state.doc` to a
  > different document. Grep the store and fail the run on a seventh — a path added later without this
  > guarantee is the same bug again.
  >
  > Then, for **each of the six by name**, with an edit dispatched and the debounce timer still pending:
  > **(a)** the pending write completes *before* the active document changes — after the call returns, the
  > stored bytes for the outgoing trip contain the edit and `isDirty()` is false; **(b)** if that write is
  > refused (`'conflict'`) or fails (`'error'`), **the transition does not happen** — the outgoing trip is
  > still `activeTripId`, still holds the edit in `doc`, the rendered indicator does not read "Saved", and
  > the rendered text offers both recoveries by name (merge with the stored copy; export this copy). A run
  > in which the switch proceeds over an unsaved edit **fails, regardless of what is on screen**;
  > **(c)** `deleteTrip` of the *active* trip is the one exception and is asserted as one: the timer is
  > cancelled without writing, the transition proceeds, no write reaches the deleted id, and the
  > confirmation names the trip. `[stated]`

  **Injected fault for the sixth case** (rule 3 above): dispatch an edit and call `closeTrip()` inside the
  debounce window **with the real scheduler and real timers, not the manual one** — `qa/r3-loss.mjs` is the
  shape, and the manual scheduler is precisely what let this through. Storage MUST contain the edit and
  `isDirty()` MUST be false. Repeat with `openTrip` to a second trip and assert **trip A's** stored bytes,
  not trip B's — revision 2's pending write was executed against whatever `state.doc` had become. Then
  repeat both with a `StoragePort` whose `saveIfVersion` refuses, and assert the transition was **refused**.
  A test that only exercises the manual scheduler does not satisfy this criterion `[stated]`

  **Seventh case — the write that was never attempted** (QA R4-1, §2.2b F1/F2, §4.2 rule 6a′). The sixth
  case assumed that if a transition flushes, the edit is safe. It flushes *conditionally*, and the condition
  was a revision comparison, so the pending write was skipped rather than lost. The edit is gone by the same
  door with nothing on screen, and every one of the sixth case's own tests passed throughout.

  > **Injected fault, the exact sequence, with real timers and the real scheduler** — a manual scheduler
  > does not satisfy this, for the same reason it did not satisfy the sixth case. One store, autosave on.
  > Dispatch edit A; `await flush()`; record `r = state.doc.revision` and the stored bytes. `undo()`. Inside
  > the 400 ms debounce window dispatch **one** different edit B (a stop reorder is the shape the browser
  > repro uses). **Assert the precondition before continuing: `state.doc.revision === r` and
  > `toJSON(state.doc) !== the stored bytes`. A run where that precondition does not hold has not exercised
  > the defect and fails as inconclusive — it does not pass.** Then call `closeTrip()`.
  >
  > After it returns: the stored bytes for that trip **contain edit B**, `isDirty()` is false, and the
  > rendered indicator reads "Saved" only because it is now true. Repeat for `openTrip(other)` asserting
  > **trip A's** stored bytes, and for `deleteTrip(other)`. Repeat all three against a `StoragePort` whose
  > `saveIfVersion` refuses: **the transition does not happen** — `activeTripId` unchanged, edit B still in
  > `doc`, indicator not "Saved", both recoveries named on screen. Assert **bytes**, never a revision and
  > never `isDirty()` alone. A wrong implementation completes the switch with the pre-undo document in
  > storage and "Saved" on screen, which is what QA measured in Chromium. `[stated]`
  >
  > **And the same sequence in a real browser:** `qa/r4-browser.mjs` §1 is the shape — Ctrl-Z, one ↓ reorder
  > click, then the "Cairn" brand button, then read IndexedDB directly. Plus the `beforeunload` leg:
  > immediately after edit B, `isDirty()` must be `true`, because that handler is gated on it and R4-1
  > defeated the "Leave site?" prompt through exactly that gate. `[stated]`

  **Eighth case — the write the store declined to install** (QA R11-1, ARCHITECTURE §2.2a **A-7**, §4.2
  rule 4a). The first seven cases are all about a write that did not happen, or happened to the wrong
  document. This one is a write that **succeeded** and whose document the store then threw away, keeping the
  fence it minted — after which the user's *own next autosave* destroys another writer's saved edit with the
  chip reading *Saved*. It needs one dispatch inside `doMerge`, which spans a storage read, a parse, a merge,
  a serialization and anything already queued on the save chain.

  > Two tabs, a real conflict, *Merge and save*, and **one** dispatch landing inside the merge. Run it three
  > ways — with `saveIfVersion` gated, with **`load()`** gated (the wider half of the window, and the one a
  > reader will otherwise re-derive too narrow), and with an autosave already parked in the port when the
  > button is pressed — and in **all three**, with **zero** undo calls: the other tab's edit is still in the
  > **stored bytes** afterwards, `savedVersion` is not the version the merge minted, `savedDoc` is not the
  > merged document, and the indicator does not read "Saved". **The trailing autosave must be allowed to
  > run** — real 400 ms debounce, no explicit `flush()` — because that is the write that does the damage.
  > Then press *Merge and save* again and assert convergence on the stored bytes: both tabs' edits present.
  >
  > **Two ceilings, and the criterion is not met without them.** (a) The ordinary merge — no interleaving
  > dispatch — still installs the merged document, still advances both fields, still reads `'idle'` with
  > `isDirty()` false and a `lastMerge` notice; a fix that refuses here has over-refused. (b) An edit landing
  > during an **ordinary autosave** still advances `savedDoc`/`savedVersion` and still re-arms the debounce,
  > and the newer document reaches storage — the two autosave call sites write their own document forward
  > and that is correct. `qa/r11-recheck.mjs` §1.3b/§1.3c are the shape for the defect; the two ceilings are
  > what stop the fix from being a regression. `[stated]`

  **The dirty predicate is checked against an oracle, not against itself.** R4-1 survived 22 purpose-written
  tests because ten of them used `isDirty() === false` as their *proof* that a write had happened — the
  broken predicate asserting its own correctness. So:

  > Over a **200-step deterministic walk** (a seeded step chooser, so a failure is replayable) of
  > `dispatch` / `undo` / `redo` / `flush` / `closeTrip`+`openTrip` on one store over the in-memory port,
  > assert at **every** step: `store.isDirty() === (core.toJSON(state.doc) !== <the bytes the port currently
  > holds for that id>)`. Ceiling: **zero disagreements across 200 steps**, not "agreement at the end". This
  > is the exact-but-expensive answer (§2.2b F2) used as the oracle for the cheap runtime one, which is the
  > only thing that makes the cheap one trustworthy. `[stated]`
  >
  > **And no test proves a write with `isDirty()`.** Mechanically: in `packages/client/test`, every assertion
  > on `isDirty()` sits in a test that also asserts on the port's stored bytes for the id in question. This
  > one is a heuristic and is stated as one — it is greppable per test block and it is what would have made
  > round 4's suite catch its own blind spot. `[stated]`

  **Leaving the page is the same case, with a stated ceiling on what the platform allows.** `apps/web`
  registers `visibilitychange`→`hidden` and `pagehide` (deduped, both calling `store.flush()`) and a
  `beforeunload` that calls `preventDefault()` while `isDirty()`. Assert the listeners are registered and
  that the visibility handler calls `flush()` (jsdom or a spy is enough), plus one Chromium run: type a day
  title, hide the tab, and find the edit in IndexedDB. **The criterion explicitly does not claim the edit
  survives an arbitrary tab close** — an unload handler cannot await an asynchronous IndexedDB write, and
  `pagehide`/`beforeunload` are unreliable on mobile. The guarantee is the in-app one above plus a native
  "Leave site?" prompt when the user leaves dirty; a test asserting more than that would be asserting a
  platform behaviour that does not exist `[stated]`
- **Every pooled stop is reachable from some rendered group.** `poolFor(trip, city)` over `trip.cities`
  plus the catch-all equals `trip.pool.length`, on a brand-new trip with no cities, on a trip whose day
  belongs to no city, and on the reference trip. A pool key that is neither a trip city nor the transit
  group is `validateTrip` error `pool_stop_unknown_city` — and, as a ceiling, the transit group itself
  never reports one, or every new trip carries a false error `[stated]`
- two trips in the library do not leak state into each other when switching `[stated]`
- **`canView(principal, rel, now)` throws on a missing or non-`YYYY-MM-DD` `now`.** An expired share must
  not become live because a caller forgot the clock; these predicates are what Phase 2's RLS policies are
  generated from, and a definition that fails open generates a policy that fails open `[stated]`
- **`createTrip` rejects `'2026-13-45'` and `'2026-02-30'`** — calendar validity, not regex shape `[stated]`
- **`fromJSON` rejects unknown enum values and non-numeric coordinates**: `category:'nuclear'`,
  `source:'nsa'`, `kind:'telepathic'`, `lat:'33.9425'`, `lat:1e999` `[stated]`

### What the tester should attack (plain `node`, no network)

Zero-day trip · end date before start date · a day with zero stops · a stop with `PlaceLink {kind:'none'}`
through legs, clusters, cost and validation · two stops at the same time · `time: null` · an overnight leg
(LAX 16:45 → FRA 13:00+1) · a day spanning 621 km (Aug 8 — `focusCluster` must return the Vienna cluster)
and a day on one street (`fitSpanKm` must not fall below `MIN_SPAN_KM`) · a ±1° latitude typo on a `Place`,
a pool stop and a scheduled stop (`geo_outlier` must fire on all three; §2.13 permits exactly two named
misses) · a whole day of shifted coordinates (§2.13 says this is invisible — confirm that is *all* that is
invisible) · a stop 50 km out on a legitimate day trip (must be silent) · `travelRole` flipped on each of
the 31 vehicle stops in turn (`impossible_transfer` must move from silent to blocker only where the flip
says the time is an arrival) · a trip with `homeBase: null` · CZK and GBP costs with no rate table (`missingRates`, never a silent conversion) · the Danube
cruise's per-party price mixed with per-person amounts (`basisWarnings`) · two bookings with the same
reference and different dates (`superseded`, not `duplicate`) · malformed JSON, truncated JSON,
`schemaVersion: 99`, unknown enum values · unicode and emoji names (Vyšehrad, Széchenyi, Jiráskovo náměstí)
surviving a round-trip · `displayStatus` — assert **nothing un-accepted and non-user ever returns `'own'`** ·
input immutability after every build function · storage port failures, quota-exceeded, and a corrupted
document in the library · **every ordering of an edit, an undo, a redo, a trip switch and a tab close inside
the 400 ms debounce window, with real timers** — nothing may be lost without the screen saying so, and no
sequence may advance `savedVersion` without a port result behind it · **undo followed by a different edit
that lands on a revision number already used**, crossed with each of the six transitions and with
`getDerived()` (the two halves of round 4's blind spot were tested separately and never crossed — cross
them) · **the whole IndexedDB database deleted under a tab that stays open**, then a restore from another
tab, then a keystroke in the first · `acceptCandidate` / `copyStopInto` with `actorUserId` null, empty and
belonging to somebody else · **a stored record whose envelope
version is missing** (the pre-§2.2a upcast) and one whose envelope version is a number, an object, or the
empty string · **a foreign-owned document through every entry point** — `importDoc`, a
hand-edited stored record, `migrateDoc` from `schemaVersion` 0 — none may yield an unbadged stop ·
**`copyStopInto` with a source stop that is itself imported** (the credit must point at the trip it was
copied *from*, not chase the chain) · **`copyStopInto` from a trip into itself** · a copied stop whose
`Place` already exists in the target · redaction against a note that contains a booking reference inside a
URL inside a sentence.

### Explicitly not in Phase 1

No HTTP, no database, no accounts, no auth enforcement. No location, photo or email code — those directories
do not exist yet. No timezone handling, and therefore **no `journey_overrun`** (§2.12 — the rule
`travelRole` enables and a wall-clock model cannot support; the phone phase, now **5**). No `closed` rule (§2.7 — no hours
source exists). No sub-maps (Lokrum). No currency conversion. No native app. **No `forkTrip` and no
`TripFork`** — cut, not deferred (§2.14).

---

## Phase 2 — travel history: past trips, the lifetime map, and who you went with

**Goal.** `ARCHITECTURE.md` **§8.1–§8.4**. A trip stops being a plan that expires and becomes a record that
compounds. Still local-first: no server, no accounts, no device, no network. Everything in this phase is
attackable in plain Node with the in-memory ports, exactly as Phase 1 is.

**Independently useful:** Jacob records the trips he has already taken — dates, cities, who he went with —
and gets a map of everywhere he has been, a count of countries and cities derived from real trips rather
than typed, and a completed-trip view of Europe 2026 that is a record instead of an itinerary that has
expired. It is also the phase that stops the app telling him the trip he finished on 22 August is missing a
hotel.

Entry: Phase 1 shipped with a manager verdict of SHIP (`b32ef9a`) — done.

### Three steps, each shippable on its own, in this order

| Step | Ships | Useful alone because |
|---|---|---|
| **2a — past trips and the lifecycle** | `lifecycle()`, `Trip.datePrecision`, the feasibility/integrity rule class (§8.2), a "record a past trip" flow (title, dates, precision, cities — no day-by-day required) | you can enter a 2019 trip and it does not greet you with twenty warnings about a hotel you already slept in |
| **2b — the lifetime map and travel identity** | `countryOf` + the generated country index, `travelStats`, the widened `TripSummaryRow` + `SUMMARY_VERSION` rescan, the **Map** and **Profile** surfaces | *"show me everywhere I've been"* — the signature experience, from data that already exists |
| **2c — participants** | `Trip.participants`, three build functions, the participants editor, *"people you have travelled with"* on the profile | you can say the trip was with your girlfriend and her family, and it grants them nothing |

**Mapped onto the increment sequence below** (revision 10): **2a = I-1 → I-4**, **2b = I-5 → I-8**,
**2c = I-9 → I-10**, with **I-0** before all of them and **I-11** the gate. Each of the three steps is
genuinely shippable at its own increment — the phase can stop after I-4 or I-8 and still have delivered
something better than what it started with. *(Revision 11: **I-3a** and **I-4a** carry the two design
rulings QA round 12 routed to the architect — `ARCHITECTURE.md` §2.7 **A-9** and §2.2 **A-10**. They sit
inside 2a, which shipped with follow-ups rather than clean, and **both are owed before I-6**.)*

### Deliverables

```
packages/core/src/
  derive/     lifecycle.ts  country.ts  travelStats.ts     (+ summary.ts widens)
  geo/        countries.gen.ts          generated, committed, size-budgeted — §8.4
  build/      participants.ts           add/update/remove — one core fn per action
  conflict/   rules/*.ts                each gains `class`; detect.ts gates feasibility on ctx.today
              detect.ts / resolve.ts    detectUngated (private) + syncResolutions(trip, at) — §2.7 A-9
packages/client/src/
  store/      summary rescan on SUMMARY_VERSION; library selectors for travelStats
apps/web/src/views/
  WorldMap.tsx  Profile.tsx  PastTripForm.tsx  Participants.tsx
tools/gen-countries.mjs   Natural Earth admin-0 → countries.gen.ts, reports emitted bytes
fixtures/golden/          countries.json (per-stop attribution), travel-stats.json
```

### Hard constraints on the builder

All of Phase 1's stand — zero runtime dependencies in `core`/`client`, bare Node 24 type stripping, no
ambient clock or randomness, `packages/client` free of DOM and React, the root planner read-only — plus
five that are specific to this phase:

- **No new persisted structure.** Participants and `datePrecision` live in the trip document; the country
  index is generated code, not data at rest; statistics are derived. If this phase adds a second storage
  record, it has taken A-5's rejected option (§8.3).
- **`AppState` still holds exactly one trip document in memory.** The lifetime map reads
  `TripSummaryRow`s. A screen that needs forty documents is out of scope and needs a ruling, not a loop.
- **No stored count, anywhere, of anything.** §8.4.
- **The country index is injected, not imported by the function.** `countryOf(at, index)` stays pure and
  testable against a four-polygon fixture.
- **`node --test` still runs `packages/core` and `packages/client` directly.** A generated module that is
  megabytes of JSON in a `.ts` file breaks that; the size budget is a test, and it is the first test.

### The increment sequence — the implementation brief

**Revision 10.** Revision 9's six-line build order is superseded by the twelve increments below, which are
the same order spelled out. This is a **sequencing** document, not a scoping one: every increment implements
something `ARCHITECTURE.md` §8 has already decided, and an increment that seems to need a new decision is a
design defect routed to the architect (sequencing rule 5), not a judgement call taken in code.

**Four rules that apply to every increment, so they are not repeated twelve times:**

- **The repo is runnable and `npm run test:tap` is green at the end of every increment.** *Runnable beats
  complete* — an increment that leaves the suite red is not finished, it is abandoned mid-way.
- **An increment that adds an export updates §2.10's list and criterion E's count in the same commit**, and
  the count is obtained by **counting**, never by quoting §8.9 or this file (§2.10's own rule; §8.9 says so
  explicitly).
- **Any divergence from `ARCHITECTURE.md` gets a `BUILD-NOTES.md` entry under *Known divergences from the
  contract* in the same pass** — sequencing rule 6, and the grep check in `npm test` enforces it.
- **Ceilings are re-derived by running, never quoted.** Every increment that touches the engine re-runs the
  Phase 1 numbers; "unchanged" is a measurement.

---

#### I-0 — Probe repair and the measured baseline

- **Built.** The breaker's carried item: `qa/r6-flush.mjs` §6, `qa/r7-chain.mjs`'s hardcoded counts, and the
  three dead probes. Each probe is repaired or **deleted with a stated reason**. Nothing in `packages/` or
  `apps/` changes.
- **User-visible outcome.** **None — and this is the only increment with none.** It exists because Phase 2's
  opening ceiling is the whole Phase 1 probe board, and a stale FAIL count costs a QA round to rediscover.
- **Architecture / data model.** None. `qa/` and `BUILD-NOTES.md` only.
- **Verification.** The full board runs; every probe is PASS or gone; `npm run test:tap` and
  `npm run typecheck` are green and their numbers are recorded *from this run*. The four geography numbers
  (`geoCheck` 0/112 and 0/94 clean, 112/112 and 92/94 under +1°) and `detectConflicts` = **2 blockers at
  `FIXTURE_TODAY`** are re-derived here and become the baseline every later increment is measured against.
- **Dependencies / blockers.** None. It is owed *before Phase 2's first breaker round* — see the carried
  items table below.
- **Ship gate.** A one-line-per-probe table in `BUILD-NOTES.md` (PASS, or deleted and why), plus the six
  baseline numbers, each with the command that produced it.

#### I-1 — `lifecycle()`, in core and in the CLI

- **Built.** `packages/core/src/derive/lifecycle.ts`: `lifecycle(trip, today): 'planned' | 'active' |
  'completed'`, pure, exported. `cli.ts` prints the stage in `trip show`; the existing `--today` flag
  (already present, defaulting to `FIXTURE_TODAY`) is what drives it.
- **User-visible outcome.** `node --experimental-strip-types cli.ts trip --today 2026-08-27` says the
  reference trip is **completed**. Small, but it is the first time the product can say a trip has ended.
- **Architecture / data model.** §8.1. **No stored status field, and a builder must not add one** — a stored
  status is a copy of what the dates already say and goes stale at midnight with nothing to invalidate it
  (§0.6). Keyed on `today` exactly as `TripCtx` already is; no ambient clock in core.
- **Verification.** A table test over the three stages plus the four boundary days (day before start, start,
  end, day after end) with `endDate` inclusive; a zero-day trip (`start === end`); a trip whose dates are
  invalid is not `lifecycle`'s problem — `createTrip`/`setTripMeta` already reject it, and the test asserts
  that division of labour rather than duplicating the check.
- **Dependencies / blockers.** I-0 (baseline). Nothing external.
- **Ship gate.** `lifecycle` is on §2.10's list and criterion E's count is re-counted; the CLI prints the
  stage; no occurrence of `Date.now()` or `new Date()` reaches `packages/core` (existing grep, re-run).

#### I-2 — `Trip.datePrecision`

- **Built.** The one new stored field: `datePrecision: 'exact' | 'month' | 'year'`, default `'exact'`.
  `types.ts`, `fromJSON` (reject anything else), `toJSON`, `migrateDoc` (absent → `'exact'`),
  `setTripMeta`'s `TripMetaPatch`. Display formatting lives in `apps/web`, **not** in core.
- **User-visible outcome.** *"Japan, March 2019"* can be recorded honestly instead of as a false claim about
  the 1st to the 31st.
- **Architecture / data model.** §8.1. `startDate`/`endDate` stay **real calendar dates**, so no rule, derive
  or golden moves. Stored because it is not derivable and retrofitting date fuzziness after forty trips is
  the expensive migration. **Read by display and nothing else.** No `schemaVersion` bump: the field is
  additive with a total default and `migrateDoc` supplies it, which is the same treatment every additive
  field gets; a bump is reserved for a *value* widening that an older client would silently drop (§8.5's
  `source:'device'` is the one that earns it).
- **Verification.** `toJSON(fromJSON(toJSON(trip)))` byte-identical with the field present and absent;
  `fromJSON` rejects `datePrecision:'fortnight'`; a stored document from before this increment loads and
  comes back `'exact'`; undo/redo carries it at depth 50. **Ceiling, greppable:** `datePrecision` appears in
  `types.ts`, the three serialize files, `createTrip.ts` and `apps/web` — and **nowhere** under
  `conflict/`, `derive/` or `validate/`. A hit there is the field having grown a second meaning.
- **Dependencies / blockers.** I-1 is not strictly required but shares the same reviewers; keep the order.
- **Ship gate.** The grep ceiling is a test, not a promise; round-trip parity holds both ways; no export
  added (the field is data, not a symbol).

#### I-3 — The conflict rule `class`, and the feasibility gate

- **Built.** `Rule` gains `class: 'feasibility' | 'integrity'`; all ten rules in `RULES` are classified per
  §8.2's table; `detect.ts` gains `subjectDate(trip, ref)` and suppresses a feasibility conflict **iff
  `ctx.today` is present and every one of its subjects resolves to a date strictly before it**.
- **User-visible outcome.** **The live defect closes.** The conflicts panel stops telling Jacob that the trip
  he finished on 22 August is missing a hotel in Budapest.
- **Architecture / data model.** §8.2, including revision 10's three edge rulings: all-subjects (not
  any-subject); an undatable subject resolves to `trip.endDate`; no `today` means no gating. The gate lives
  **once**, in `detect.ts` — a rule that checks the clock itself is ten implementations of one idea and is
  the §2.13 mistake in a new place. `booking_vs_plan` going quiet on a completed trip is a **deliberate,
  named loss** (§8.2), not a bug to patch back in.
- **Verification.** The phase's second and third exit criteria in full — the same trip evaluated after
  `endDate` returns only `integrity` findings with the count stated and one line per finding, then moved
  back before `startDate` returns the original set **exactly**; a rule silent at both clocks has been
  deleted, not classified. Plus a straddling trip in **one call**: feasibility fires on the future half and
  not the past half.
- **Dependencies / blockers.** I-0's baseline. **The ceiling is achievable by construction** — the goldens
  run at `FIXTURE_TODAY = 2026-08-01`, before the trip starts, so every subject is in the future and the
  gate is a no-op there. A moved golden number means a misclassified rule, which is the criterion's own
  reading.
- **Ship gate.** All Phase 1 conflict numbers re-derived and **unchanged**; every rule carries a class;
  `subjectDate` has a test per `RefKind` including the pool-stop and trip-ref fallbacks.

#### I-4 — The past-trip flow in `apps/web` — **2a ships here**

- **Built.** `PastTripForm.tsx`: title, dates, `datePrecision`, cities — **no day-by-day required**. A
  lifecycle chip in `Library.tsx` and `TripView.tsx`. Nothing else in the web app changes.
- **User-visible outcome.** Jacob records a trip he took in 2019 in under a minute, and it does not greet him
  with a wall of warnings about a hotel he already slept in.
- **Architecture / data model.** Days stay **dense** — a 21-day 2019 trip gets 21 empty `Day` rows and
  `ensureDays` already mints them (§8.1); `days: []` is not permitted for "memory" trips and would put a hole
  in the invariant every derive relies on. The form dispatches `createTrip` + `setTripMeta` and **no new
  action invents domain logic** (§4.2 rule 1). **The closed list of six document-installing store methods
  stays six** — `createTrip` is already one of them.
- **Verification.** Exit criterion 3 end to end: a 21-day, one-city, zero-stop 2019 trip with
  `datePrecision:'month'` returns **zero** conflicts and **zero** validation issues — a ceiling — while
  `days` is dense and `Day.id === Day.date` throughout; add a stop dated after `today` and the feasibility
  rules return **for that day only**. Run it in the browser, not only in Node, because this increment is the
  first one a user touches.
- **Dependencies / blockers.** I-1, I-2, I-3. No external dependency.
- **Ship gate.** **2a is independently shippable here** and the phase could stop at this point with a
  product that is better than Phase 1's. Criteria 1, 2, 3 and the NO-SILENT-LOSS extension all pass.

---

**I-3a and I-4a are revision 11.** QA round 12's adversarial pass over the shipped 2a slice routed two
design findings to the architect; `ARCHITECTURE.md` **§2.7 A-9** and **§2.2 A-10** are the rulings, and these
two increments are where they get built. **Both are owed before I-6**, because I-6's summary widening
consumes exactly the day/city data A-10 governs. Everything else round 12 found (P2-3 through P2-8) is
routed to a builder against the finding itself and is not an increment.

#### I-3a — Retirement stops answering to the clock (§2.7 A-9, QA P2-1)

- **Built.** `detect.ts`'s body moves into one private `runRules(trip, opts, gate)` with
  `detectConflicts = runRules(…, true)` and a new module-level `detectUngated = runRules(…, false)` that is
  **not** on `index.ts`. `syncResolutions` becomes `(trip, at)` and detects the un-gated set itself, with
  two early returns (no live resolution row; no well-formed `at`). `store.ts`'s `retireResolutions` drops
  its conflict-set argument and runs only when `derivedFor` returned a **new** cache. `unbooked_ticketed`'s
  `delta < 0` guard — §8.2's gate, open-coded inside a rule — is deleted.
- **User-visible outcome.** Opening a trip you have finished no longer silently throws away the answers you
  gave it while it was live, and no longer schedules a write to a document you only looked at. If the trip's
  dates are later extended, the finding you dismissed comes back **still dismissed**, instead of accusing
  you of a dismissal the calendar undid.
- **Architecture / data model.** §2.7 **A-9**, read with §8.2. *Retirement is a claim about the document;
  the gate is a claim about the user's attention; they may not read the same set.* **The retirement ledger
  is not reopened** — A-5, A-5a, A-5b and A-8 are settled and this increment changes when retirement fires,
  never how a retirement behaves once it has. §2.10's runtime symbol count stays at **70**: one exported
  signature changes and no symbol is added or removed.
- **Verification.** A-9's six assertions in full — QA's `qa/p2b-gate.mjs` §1.10 and §1.11 re-expressed
  against the two-argument signature (the assertions are kept verbatim; only the calls change, and A-9 says
  why no correct fix can avoid that); a genuine fix on a completed trip **does** still retire; the extended-
  dates case renders dismissed with no *"it has come back"*; `detectConflicts` output byte-identical before
  and after the `unbooked_ticketed` deletion at three clocks; and `syncResolutions(trip, '')` a no-op with
  live rows present. **Greppable ceiling:** after this increment `ctx.today` appears in **exactly one** file
  under `conflict/rules/`.
- **Dependencies / blockers.** I-3 (the gate it adjudicates). None external.
- **Ship gate.** Every Phase 1 and 2a conflict number re-derived unchanged — 2 blockers / 4 warnings / 11
  notes at `FIXTURE_TODAY`, and exactly two suppressed `missing_lodging` warnings on the reference trip at
  the real clock; the A-5a and A-5b test sequences pass untouched; `npm run test:tap` green.

#### I-4a — City keys become minted ids, and duplicates become visible (§2.2 A-10, QA P2-2)

- **Built.** `CityInit.key` becomes optional and `createTrip` mints `ctx.ids.newId('city')` when it is
  absent; the `name.toLowerCase().replace(/[^a-z0-9]+/g,'-')` expression is **deleted** from both
  `PastTripForm.tsx` and `Library.tsx` (not repaired); `validateTrip` gains `duplicate_city_key`,
  `reserved_city_key` and `city_name_empty`, all `error`; `geoOutlier.ts`'s two label helpers resolve a key
  to `City.name` for display while `params.cityKey` keeps the id.
- **User-visible outcome.** *"日本 2019 — 東京, 京都"* records as two cities instead of one, in any script,
  and a document that already collapsed two cities into `"-"` says so on screen instead of silently
  mis-attributing every day of the trip.
- **Architecture / data model.** §2.2 **A-10**. A `CityKey` is an opaque minted id like every other id here;
  it is never derived from the display name and nothing may parse one. **No migration and no
  `schemaVersion` bump** — `CityKey` was and stays `string`, existing documents keep their keys, and
  `import/legacyDays.ts` still passes `vienna`/`split`/… explicitly. Cross-trip city identity is derived
  from the **normalised name** and the surface says so, which is §8.3's participant rule applied unchanged.
- **Verification.** A trip created with cities `東京` and `京都` yields two distinct keys, two distinct
  `daysForCity` results and zero validation issues; a hand-built document with two identical city keys, with
  a city keyed `transit`, and with a city named `''` each produce exactly one error and still **open**;
  `fromJSON` is unchanged and still parses all three (refusing to parse would make the document
  unopenable). **Ceiling, measured not asserted:** the reference trip's validation issue count, conflict
  counts at every clock, and the round-trip goldens and sample JSON are byte-identical; the only expected
  string that moves in the repo is the injected-fault `geo_outlier` case, now reading *"the Vienna map"*.
- **Dependencies / blockers.** I-4 (the form it corrects). None external.
- **Ship gate.** The slug expression appears **nowhere** in `apps/` or `packages/` (grep); no call site
  outside `packages/core` constructs a city key; each of the three new validation codes has an
  injected-fault test, because a rule with no injected-fault criterion does not ship.

---

#### I-5 — `tools/gen-countries.mjs` + `countryOf` + the attribution golden

- **Built.** The generator (Natural Earth admin-0 → `packages/core/src/geo/countries.gen.ts`, reporting
  emitted bytes), `derive/country.ts`'s `countryOf(at, index)` by ray-casting, and
  `fixtures/golden/countries.json`.
- **User-visible outcome.** None yet, deliberately — **the dataset is measured before any screen depends on
  it.** A map built on an unmeasured index is a map that is quietly wrong.
- **Architecture / data model.** §8.4 clause 1. Pure function, **index injected**, testable against a
  four-polygon fixture. **`null` is a first-class answer** and is never snapped to the nearest country.
  Public-domain source only; **no network geocoder in any phase** — sending a coordinate to a geocoder *is*
  transmitting a location (§6.1), and the free public service forbids this use anyway.
- **Verification.** **The size-budget test is written first**, with the number measured by the generator and
  living in the test — not in any document. Then exit criterion 4 in full: a golden naming **every distinct
  country and the stop that produced it** (a country with no stop named fails the run); a mid-Atlantic
  coordinate returns `null`; the Fisherman's Bastion typo changes the attributed country **and** still
  produces its `geo_outlier` blocker; the Dalmatian islands (`Blue Cave, Biševo`, `Stiniva Cove, Vis`,
  Lokrum) attribute to **HR** — if they do not, the generator moves to 1:50m and **the budget moves, not the
  criterion**. Attack list: the poles, the antimeridian, exactly `(0,0)`, an enclave, international waters.
- **Dependencies / blockers.** **One external item, and it is the phase's only one: the Natural Earth
  admin-0 download.** The generated module is committed, so this is a one-time fetch — but this environment's
  egress proxy blocks many hosts, so **confirm the download works before this increment starts**, not during.
  If it is blocked, that is a blocker to raise, not to route around by hand-typing polygons.
- **Ship gate.** Budget test passes and its number came from a measurement; the golden exists and every
  entry names its producing record; `node --test` still runs `packages/core` directly (a generated module
  that is megabytes of JSON in a `.ts` file breaks type stripping — the budget test is the guard and it is
  the *first* test).

#### I-6 — The widened `TripSummaryRow` and the `SUMMARY_VERSION` rescan

- **Built.** Core: `tripSummary(trip, index)` gains `countryCodes`, `summaryVersion` and
  `cities: Array<{ key: CityKey; name: string; countryCode: CountryCode | null }>` — **not** `cityKeys`
  (revision 11, §2.2 A-10: a `CityKey` is an opaque minted id, so a bare key can neither label a pin nor
  join two trips, and a row that must be resolved against a document it does not carry is not a summary) —
  and `SUMMARY_VERSION` becomes a core constant. Client: rows below the current version are rescanned — load the
  document, recompute, rewrite **through the ordinary chained write** — and the map says *"recomputing"*
  while it runs.
- **User-visible outcome.** The trip library knows which countries each trip touched without opening forty
  documents, and the day the attribution improves is the day the numbers improve rather than the day they
  silently stay wrong.
- **Architecture / data model.** §8.4 clause 3 and its four sub-clauses; this is **§0.6 applied to the one
  cache the lifetime map depends on**, and it is the riskiest increment in the phase for exactly that
  reason. **The index is a required second argument** (§8.4, revision 10): an optional one has a default,
  and the only available default is a row that claims completeness while having no countries. `AppState`
  still holds **exactly one trip document in memory** — the map reads rows, and a screen that needs forty
  documents is out of scope and needs a ruling, not a loop.
- **Verification.** Exit criterion 7's injected fault: write three trips, bump `SUMMARY_VERSION`, reopen.
  Every row below the version is recomputed **from its own document**; the rewrites go through
  `chainOntoSaving` (the §4.3 structural grep still finds **zero** `ports.storage.*` mutations outside it);
  the map does not claim completeness while the rescan runs; **ceiling** — a row is never computed from
  another row, from `AppState`, or from a document it is not about. Attack: `SUMMARY_VERSION` bumped
  mid-rescan with a write in flight; 40 summaries with one corrupt document (39 render, one is reported
  unreadable).
- **Dependencies / blockers.** I-5 (there is no `countryCodes` without an index) and **I-4a** (a row that
  carries a city key minted by the 2a slug carries `"-"` for every non-Latin city, and the rescan would
  copy that into the one cache the lifetime map reads).
- **Ship gate.** The freshness criterion passes; the 200-step dirty walk still holds; the closed list of six
  document-installing methods is still six; every new `StoragePort` interaction is on the chain.

#### I-7 — `travelStats`

- **Built.** `derive/travelStats.ts`: `travelStats(summaries, today): TravelStats`, exactly §8.4's shape —
  countries with first/last visit and trip ids, cities, trip counts by lifecycle, `daysTravelled`, and
  `unattributed`.
- **User-visible outcome.** None on screen yet; the numbers exist and are addressable from the CLI.
- **Architecture / data model.** **Every statistic is derived and nothing counts anything into storage**
  (§8.4 clause 2, §0.7). A stored `countriesVisited: 47` is a second source of truth that a user can inflate
  by typing. `unattributed` is **on the type on purpose** — the honest hole is a field, not an omission.
  **Cities group by `nameKey = normalizeCityName(name)`, not by `CityKey`** (revision 11, §2.2 A-10): keys
  are opaque and per-trip, so two trips to Tokyo carry two of them and only the name can join them — and the
  Profile states that it is grouping by name, exactly as *"people you have travelled with"* must.
- **Verification.** Exit criterion 6: greppable absence of any persisted field naming a count of countries,
  cities, trips or days; purity asserted by calling twice on one input and once on a mutated copy. Plus the
  attack the tester will bring: a trip with **no coordinate-bearing record at all** must produce *"no places
  yet"*, never *"0 countries"* as though zero had been measured. Two trips to the same city, entered with
  different capitalisation and spacing, are **one** row; the same city name in two countries is **two**, and
  the surface names the limitation in rendered text.
- **Dependencies / blockers.** I-6 (it consumes summary rows), I-1 (`lifecycle` supplies the trip counts).
- **Ship gate.** The no-stored-counts grep is a test; `travelStats` is on §2.10's list with the count
  re-counted; both goldens (`countries.json`, `travel-stats.json`) exist and were derived, not written.

#### I-8 — The Map and Profile surfaces — **2b ships here**

- **Built.** `WorldMap.tsx` and `Profile.tsx`. Navigation becomes **Trips · Map · Profile** — three tabs,
  not four. **No DISCOVER tab**: a slot that exists to promise something is the opposite of what this
  product's conventions say about presenting things that are not yet true.
- **User-visible outcome.** *"Show me everywhere I've been"* — filled countries, city pins, tap a country for
  its trips; and a travel identity that is countries, cities, trips, days travelled, first and last visit per
  country, and an honest count of what could not be attributed.
- **Architecture / data model.** The world map is **drawn from the bundled country index, with no tiles
  behind it** (§8.4, revision 10) — the trip map keeps its tiles and is untouched. It inherits both of
  `CLAUDE.md`'s map bugs (**never fit a hidden container; cluster before fitting**) plus its own min-span
  case: a history containing one country must not open at a rooftop zoom. **Same core functions, new caller,
  no second implementation** — bounds come from core (§4.4). **Provenance carries onto the map**: a pin for
  an unaccepted copied stop is dimmed exactly as its card is, and an unattributed coordinate renders as
  unattributed. The map is where the badge rule will first be forgotten.
- **Verification.** A hidden-then-shown map fits correctly on tab activation; a one-country history does not
  exceed the min-span guard; a `null` attribution renders as *unattributed* and never as the nearest
  country; a dimmed pin for a copied, unaccepted stop, asserted on the rendered output. The rescan indicator
  from I-6 is visible on screen and not merely in state.
- **Dependencies / blockers.** I-5, I-6, I-7.
- **Ship gate.** **2b is independently shippable here.** Criteria 4, 5, 6 and 7 all pass; the map bugs have
  a test each rather than a comment each.

#### I-9 — Participants in core

- **Built.** `Participant` and `Trip.participants` (§8.3); `build/participants.ts` with
  `addParticipant` / `updateParticipant` / `removeParticipant`, one core function per action;
  `validateTrip`'s new codes `duplicate_participant_id` and `participant_name_empty`, with *at most one
  `'self'`* riding on the same mechanism.
- **User-visible outcome.** None on screen yet — the model and its guards land first.
- **Architecture / data model.** **Embedded in the trip document, not a second persisted structure** — that
  is A-5's rejected option and it is rejected here for the same reasons; embedding gives round-trip parity,
  deletion and undo for free. **Participation grants nothing**: not a read, not a comment, not a coordinate.
  `userId` stays permanently `null` until Phase 3, and that is correct, not a gap.
- **Verification.** Round-trip byte-identical with participants present; `fromJSON` rejects a duplicate
  participant id; undo/redo restores participants exactly at depth 50; every new action maps 1:1 onto a core
  build function and the reducer holds no domain logic. Attack list: 200 participants; two participants with
  the same name and different ids, and the same id twice; a name of `''` and a name that is only an emoji;
  `kind:'self'` twice and zero times.
- **Dependencies / blockers.** None beyond a green suite. Could in principle precede I-5–I-8; **keep it
  here** so 2b is not held behind it.
- **Ship gate.** Three build functions on §2.10's list with the count re-counted; validation codes have
  injected-fault tests (a rule with no injected-fault criterion does not ship).

#### I-10 — The participants editor, the profile grouping, and the access double-run — **2c ships here**

- **Built.** `Participants.tsx`; *"people you have travelled with"* on the profile, grouped by `userId` where
  it is non-null and by a **normalised `displayName`** otherwise, **with the surface saying that is what it
  is doing**; and the §6.2 access conformance set run twice, with and without participants.
- **User-visible outcome.** Jacob can say the trip was with his girlfriend and her family — and it grants
  them nothing.
- **Architecture / data model.** §8.3 and §8.7. Cross-trip identity is **derived**, and two spellings of one
  person are two people until one is linked to an account — a **named** limitation, rendered, not a silent
  one. **Not in this phase, and named so it is not assumed:** participants on a *stop*, inviting a
  participant, and a participant contributing anything.
- **Verification.** Exit criterion 8, mechanically: the two conformance runs are **identical, cell for
  cell**, and a participant who is neither a member nor a share holder is denied every operation *including*
  `view`. This is principle 3 with a test behind it **before** there is any server that could get it wrong.
- **Dependencies / blockers.** I-9.
- **Ship gate.** **2c is independently shippable here.** The two conformance runs diff to nothing; the
  grouping surface states its own limitation in rendered text, not in a code comment.

#### I-11 — The phase gate

- **Built.** Nothing new. The full chain: a breaker round over the whole phase, then the manager's
  SHIP/SEND BACK — **no shortcuts from `cairn/CLAUDE.md`'s delegation table, which does not override
  `manager.md` at a phase boundary.**
- **User-visible outcome.** Phase 2 is *shippable*, which is a different claim from *built* and from
  *verified*.
- **Architecture / data model.** The export surface total is **pinned by counting** in this pass and written
  into §2.10 and criterion E together. `CAIRN_VISUAL_ROADMAP.md` and its `.html` twin are rebuilt against the
  post-revision-9 phase order **in the same pass** — that board is currently flying a staleness banner and
  this is the pass that clears it.
- **Verification.** All eight exit criteria below, each re-derived; the whole Phase 1 suite unchanged; the
  attack list for this phase run end to end.
- **Dependencies / blockers.** I-0 through I-10.
- **Ship gate.** A manager verdict of **SHIP**. Nothing else counts as the phase being done.

### Exit criteria — the Phase 2 ship gate

Tagged per **How a criterion is written**. The first two are ceilings on Phase 1 and are the ones that fail
first.

- **Phase 1's whole suite still passes, unchanged, and every number in §A–§F is re-derived rather than
  quoted.** Specifically: `detectConflicts` on the reference trip **at the goldens' fixed clock** still
  returns exactly 2 blockers (the Aug 18 and Aug 20 `legacy_flag` days) with the same warnings and notes,
  and `geoCheck` still returns 0/112 and 0/94 clean and 112/112 and 92/94 under +1°. A run in which the
  rule `class` moved any of them has classified a rule wrongly `[stated + legacy]`
- **Injected fault — the rule class does what it claims.** Evaluate the *same* reference trip at a `today`
  **after** `endDate`: every finding returned is from an `integrity` rule, the golden states the exact
  count and lists one line per finding, and **zero** findings come from `impossible_transfer`, `overlap`,
  `missing_lodging`, `unbooked_ticketed` or `booking_vs_plan`. Then move `today` back before `startDate`
  and assert the original set returns **exactly**. A rule that is silent at both clocks has been deleted,
  not classified `[stated]`
- **A past trip is silent.** Build a 21-day, one-city, zero-stop trip ending in 2019 with
  `datePrecision:'month'`: `detectConflicts` returns **zero** findings of any severity and `validateTrip`
  returns **zero** issues — a ceiling, not a floor — while `days` is dense over the range and
  `Day.id === Day.date` throughout. **Injected fault:** add one stop to it dated *after* `today` and the
  feasibility rules return for that day only `[stated]`
- **Country attribution is measured, and its holes are visible.** `countryOf` over the reference trip's 112
  stops and 94 places produces a golden listing **every distinct country with the stop that produced it**
  — a country with no stop named fails the run. Three injected faults: a mid-Atlantic coordinate returns
  **`null`** and the profile renders it as *unattributed*, never as the nearest country; the historical
  Fisherman's Bastion typo (`place-68`, lat `47.5025 → 48.5025`) changes the attributed country **and**
  still produces its `geo_outlier` blocker, so the map inherits the same protection the conflicts panel
  has; and the island places (`Blue Cave, Biševo`, `Stiniva Cove, Vis`, Lokrum) attribute to **HR** — if
  they do not, the generator is on the wrong Natural Earth scale and the budget moves, not the criterion
  `[stated]`
- **The generated index is inside its budget**, and the budget is a number in the test, measured by
  `tools/gen-countries.mjs` and not quoted from any document `[stated]`
- **Statistics cannot be stored.** Grep `packages/core`, `packages/client` and `apps/web` for a persisted
  field whose name is a count of countries, cities, trips or days; expect **zero**. `travelStats` is a pure
  function of the summaries it is handed, asserted by calling it twice on the same input and once on a
  mutated copy `[stated]`
- **Injected fault — the summary is only as fresh as the write that minted it** (§8.4, §0.6). Write three
  trips; bump `SUMMARY_VERSION`; reopen the library. Assert: every row below the version is recomputed
  **from its own document**, the rewritten rows go through the ordinary chained write (the §4.3 structural
  grep still finds zero `ports.storage.*` mutations outside `chainOntoSaving`), the map does **not** claim
  to be complete while the rescan runs, and — the ceiling — a row is never computed from another row, from
  `AppState`, or from a document other than the one being written `[stated]`
- **Participation grants nothing, asserted mechanically.** Run the §6.2 access conformance set twice, once
  with participants added to every trip and once without, over every (principal × relationship ×
  operation) cell: **the two runs are identical**, and a participant who is not also a member or a share
  holder is denied every operation including `view`. This is principle 3 with a test behind it before
  there is any server that could get it wrong `[stated]`
- **Round-trip and undo parity hold over the new fields.** `toJSON(fromJSON(toJSON(trip)))` is
  byte-identical with participants and `datePrecision` present; `fromJSON` rejects
  `datePrecision:'fortnight'` and a participant with a duplicate id; undo/redo restores participants
  exactly, at depth 50 `[stated]`
- **Every new action maps 1:1 onto a core build function and the reducer holds no domain logic** — §4.2
  rule 1, re-asserted because this is the first phase since Phase 1 to add actions `[stated]`
- **NO SILENT LOSS is unchanged and extended to the new write paths**: the 200-step dirty walk still holds
  with participant edits in the step chooser, and no new path assigns `state.doc` (the closed list of six
  is still six) `[stated]`

### What the tester should attack (plain `node`, no network)

A past trip with `endDate` before `startDate` · a trip whose dates straddle `today` (feasibility rules must
fire on the future half and not the past half, on the same document, in one call) · `datePrecision:'year'`
on a trip whose real dates are a single day · a participant list of 200 · two participants with the same
name and different ids, and the same id twice · a participant named `''` and one named with only an emoji ·
`kind:'self'` appearing twice, and zero times · coordinates at the poles, at the antimeridian, at exactly
`(0,0)` and inside a country's enclave · a stop in international waters · a city whose stops attribute to
two different countries (the FRA connect on a Vienna day) · a trip with no coordinate-bearing record at all
(the profile must say "no places yet", not "0 countries" as if that were measured) · `SUMMARY_VERSION`
bumped mid-rescan with a write in flight · a library of 40 summaries where one document is corrupt (the map
must render the other 39 and say one is unreadable) · the reference trip evaluated at a `today` inside the
trip, on each of its 16 days in turn · **a trip whose cities are `東京` and `京都`, and one whose city is
named `Transit`, `''` or a single emoji** (§2.2 A-10) · **a conflict dismissed while the trip is live and
then left alone while the clock crosses `endDate`, opened, reopened, undone and redone** (§2.7 A-9 × the
retirement ledger) · and every Phase 1 attack in the list above, re-run.

### Explicitly not in Phase 2

No server, no accounts, no auth *enforcement* (the predicates still only define), no sync, no location, no
photos, no device. **No stop-level participants.** No trip invitations. No public profile. No goals or
achievements — §8.8 architects them as derived and this phase does not implement them. **No in-trip delete
control** (see the routed items below). No renumbering of anything in Phase 1.

**And, added at revision 10: no travel distance or mileage of any kind, in any mode.** `ARCHITECTURE.md`
§8.10 architects it and schedules it across phases 4, 5b and 7; **nothing about it is built here.** In
particular this phase adds no `Journey` record, no airport index, no `Booking.route` endpoint codes and no
`TravelStats.distance` — and a `travelStats` that grows a kilometre field because the data was "right
there" has pulled a later phase forward and fabricated a statistic, which is what §8.10 exists to prevent.

### The carried-forward items, placed

`REVIEW.md`'s SHIP verdict carried three findings forward. This is where each belongs, with its trigger:

| Item | Where | Why there |
|---|---|---|
| **R10-1** (MINOR) | **Closed now** — `ARCHITECTURE.md` §2.7 **A-8** blesses A-5b clause 2, with the trigger that would reopen it | It is not user-visible, weakening clause 2 rebuilds R8-1, and the honest fix is a change to A-5's substrate that a defect nobody can see does not pay for |
| **R8-3** (MAJOR, unreachable today) | **Ruled by the architect before the accept control ships — Phase 3**, or before it if Jacob pulls the control forward | Its trigger is `acceptCandidate` becoming reachable in `apps/web`, and Phase 2 deliberately does not ship that control. **The direction the ruling should take, for the pass that makes it:** the `adjacent_day` anchor is one representative chosen by position, so acceptance can *replace* it; widening it to every coordinate-bearing stop of D−1 and D+1 is monotone in the safe direction — more anchors can only ever *remove* a finding, never mint one — so its only cost is detection, and the ruling must re-derive §2.13's four numbers (0/112, 0/94, 112/112, 92/94, and the `place-68` blocker) rather than quote them |
| **R8-4** (MAJOR, unreachable today) | **Phase 3**, with the `SyncPort` | Its trigger is *"whenever `deleteTrip` becomes reachable with a trip open, or when the `SyncPort` gives `load()` a second source"*. The `SyncPort` is a Phase 3 deliverable and fires the second clause on its own. **Phase 2 must therefore not add any control that deletes a trip while one is open** — that is why "no in-trip delete control" is a scope line above and not a UI preference |

The breaker's carried item — probe repair (`qa/r6-flush.mjs` §6, `qa/r7-chain.mjs`'s hardcoded counts,
the three dead probes) — is **owed before Phase 2's first breaker round**, in a commit of its own, because
this phase re-runs the whole board as its first ceiling and a stale FAIL count costs a round.

---

## Phase 3 *(was Phase 2)* — server, accounts, the social graph, and share links

**Ships:** `services/api` (Node 24, Postgres, RLS, managed auth and object storage), `packages/client` gains
a `SyncPort`, sign-in, multi-device sync, friends, per-trip shares (`viewer/commenter/editor`), ticket
upload, and **public share links a friend opens in a browser without installing anything** — the web
companion's other job per Jacob's answer. **Sharing is read + `copyStopInto`**; the browse-another-trip pane
from Phase 1 gains shared trips as a source and nothing else changes. `forkTrip` is not in this phase and is
not coming (§2.14).

**Also here, because it needs accounts and it needs a ruling:** the `acceptCandidate` control in
`apps/web`, which Phase 1 shipped without (`REVIEW.md`: an imported stop stays badged *from a friend*
forever). **R8-3 is ruled before it ships**, and **R8-4 is ruled before or with the `SyncPort`.** If Jacob
pulls the accept control forward into Phase 2, R8-3 moves with it — the two are one item.

**Five edges, and the pairs that must not be collapsed** (§8.7): `TripParticipant` (who travelled, shipped
in Phase 2, grants nothing), `TripMember`, `TripShare`, `Connection`, `LocationShare`. Phase 2's
participants become linkable to real `User`s here — `Participant.userId` stops being permanently null —
and linking a participant **still grants nothing**; a grant is a second row the user creates deliberately.

**Independently useful:** Jacob's trips stop living in one browser, and his friends can see them.

Entry: Phase 2 shipped, with a manager verdict of SHIP.

**Exit criteria**, tagged per **How a criterion is written**:

- **The access conformance matrix passes on every cell** — core predicates vs RLS policies, every principal
  × relationship × operation, and **the matrix is enumerated from the type definitions, not hand-listed**,
  so a new role or operation cannot be silently absent. Count criterion, outcome clause: *every cell names
  the principal, the relationship, the operation and the expected verdict; a cell that agrees because both
  sides are `false` for the wrong reason is a defect.* `[stated]`
- **The five edges are five tables and the matrix proves it** (§8.7). *"Participant with no share"*,
  *"follower with no share"* and *"member"* are three distinct principals, and the first two are denied
  **every** operation including `view`, in the predicates **and** in the policies. **Injected fault:** add
  a participant to a trip and a `Connection` from that user, and assert **no** operation's verdict changes
  anywhere in the matrix. A schema in which participation, friendship or membership can be inferred from
  one another fails this outright — that is principle 3, and it is cheaper to assert here than to migrate
  later `[stated]`
- **Injected fault:** revoke a share, go offline, reopen the cached trip → **an error, never stale content**;
  and expire a share by moving the clock, not by editing the row `[stated]`
- **Injected fault:** grant `services/ingest`'s database role and try to write a stop → refused by grant, not
  by application code `[stated]`
- **The deletion cascade of §6.3 passes an orphan sweep**, and the sweep is run after each of the five
  deletion kinds in the §6.3 table, not once at the end. Outcome clause: *a friend's copied stop survives
  the deletion of the trip it came from, and its `attribution` resolves to a tombstone rather than
  disappearing* `[stated]`
- **A full account export produces a readable zip** whose `trips/*.json` round-trip through Phase 1's
  `fromJSON` unchanged `[legacy from Phase 1]`
- **No service-role key appears in any client bundle**, checked by grepping the built assets `[stated]`
- **The shipped sample on the public share host is not Jacob's trip.** §6.6's deliberate gap closes here:
  redaction is enough while the build is his own; a public marketing surface needs an invented trip
  `[stated]`

Built here because it is expensive to retrofit and cheap now: tenancy columns on every table, RLS `FORCE`d
and default-deny, the `services/ingest` database role created **before** any ingest code exists, and the
export/deletion cascade. Not built here: moderation, rate limiting, billing, admin tooling (§6.5).

---

## Phase 4 *(was Phase 3)* — mailbox ingestion

**Ships:** `services/ingest`, the `IngestCandidate` review queue, parsers seeded from the real mail in this
trip (Condor, Ryanair, FlixBus, Smartwings/Amadeus, Booking.com, GetYourGuide), reissue-vs-duplicate
detection, and ticket storage on acceptance.

**Added at revision 10, as a direct consequence of `ARCHITECTURE.md` §8.10 and for no other reason:**
**structured flight endpoints.** `Booking.route` gains optional `fromCode` / `toCode` (IATA/ICAO), and the
flight parsers fill them **from the confirmation document**, plus a user-confirm control for bookings already
entered by hand. This is the *only* thing that can ever make an air distance `verified` (§8.10.4) — today
`route` is free text and `"Los Angeles (LAX)"` is a display string. **No distance is computed in this
phase.** A code the parser scraped out of prose rather than read from a structured field is a
`{source:'system', state:'candidate'}` suggestion like everything else here, and it is `verified` only once
the user has confirmed it.

**Independently useful:** the review queue itself — "here are 6 things I found, accept or reject" — is the
feature, before it is smart.

**Provider order, forced by the verified rules in §6.4 rather than chosen:**

1. **Forward-to-an-address.** Jacob forwards a confirmation; the parser runs; a candidate appears. Zero
   OAuth scopes, zero verification, no refresh tokens to protect — and it exercises every parser and the
   whole review queue. This is the first working version.
2. **Outlook / Microsoft Graph `Mail.Read`.** Publisher verification is free and there is no mandatory
   third-party security assessment, so this is the first provider that can serve the public.
3. **Gmail.** Every Gmail read scope is restricted — including `gmail.metadata`, so minimising scope does not
   help — and a restricted scope plus a third-party server means a CASA assessment (≈$540–$1,000 at Tier 2,
   4–12 weeks, **annual revalidation**). Until it is done, Gmail runs in Testing: ≤100 users and a
   re-consent tap every 7 days.

**Decision Jacob needs to make before step 3, not before the phase:** pay for CASA and revalidate annually,
or keep Gmail on the 100-user testing path and let Outlook carry public users. Steps 1 and 2 are unblocked
either way, which is why the phase is ordered like this.

**Exit criteria:**

- a confirmation email produces a candidate; accepting writes a `Booking` with
  `{source:'email', confidence:'confirmed'}` **and an `origin.messageId`** `[stated]`
- **Injected fault — the reissue:** feed the two real YZGDTS confirmations (16 Jul and 04 Aug) in either
  order. The second is presented **side by side, diff highlighted, as a reissue**, and never applied
  automatically. Feed two *different* references on the same route and date and get `duplicate_booking`
  instead. Getting these two the wrong way round is `HISTORY.md` Pass 5 `[stated]`
- **Injected fault — the confident wrong parse:** a parser that returns a plausible but wrong date must not
  be able to change a stop, because it has no write path to one. Prove it by trying with ingest's own
  database role `[stated]`
- **no raw message body survives 24 hours** — asserted against the scan buffer with the clock moved, not by
  reading the code `[stated]`
- the parser corpus covers the six operators in this trip, and **each parser has a negative case**: a
  message from that operator that is *not* a booking and must produce no candidate `[stated]`
- **the `closed` rule returns** if and only if this phase produces an hours source; otherwise it stays out
  and §2.7 keeps saying so `[stated]`

---

## Phase 5 *(was Phase 4)* — the native app, the live path, and observed travel

**Ships:** `apps/mobile` on Expo SDK 56, in two shippable halves:

- **5a — offline travel.** The trip on a phone, fully offline, `expo-sqlite`-backed, syncing when there is
  signal. Useful on its own: this is the version Jacob travels with, and the one that survives the flaky
  hotel wifi in `HISTORY.md`. It reuses the Phase 1 store unchanged — only the ports are new (§4.3).
- **5b — background location and observed visits.** `expo-location` + `expo-task-manager`, iOS
  `UIBackgroundModes: location`, Android foreground service, fixes to encrypted local SQLite,
  `segmentTrace()` in core, **gaps rendered as gaps** (§5.3). Nothing uploaded. Segments become **`Visit`
  candidates** (§8.5) — a separate record class that never mutates a `Stop` — and `Provenance.source`
  widens by its one new value, `'device'`, with a `schemaVersion` bump. Accepting a visit is what makes it
  trip content, and **acceptance is the transmission boundary**: an unaccepted observation never leaves the
  device.

  **Added at revision 10 (§8.10):** the same pass produces **`Journey` records — the movement counterpart of
  `Visit`** — from the travel segments `segmentTrace` already emits, carrying `mode`, endpoints and a
  `{km, basis:'observed', method:'track_sum'}` distance. Same record class rules, same acceptance boundary,
  **same gap discipline** — a track with a hole is summed as the sum of its measured segments and the hole is
  reported, never bridged (§5.3). This is what makes walking, cycling, road and boat distance possible at
  all; no ground mode has an honest number before it.

Entry: Phase 3 shipped (the app needs sync). First phase requiring developer accounts and a physical
device, so 5b must land with a recorded-fixture path — a canned fix stream through `segmentTrace` — that
*is* testable in plain Node.

**The store gate is part of the phase, not an afterthought** *(verified 2026-08-27)*. Google Play requires a
Play Console **permissions declaration** for `ACCESS_BACKGROUND_LOCATION`, reviewed against a
core-functionality justification with a video of the feature in use; without approval, updates are blocked
and the app can be removed. Apple rejects a declared background mode the app does not visibly use, and
ambiguous data requests unrelated to core functionality. Consequence for this roadmap: **5b's user-facing
feature — the live path over the planned one, and the travel history it builds — must be the thing the
declaration describes**, which it is; and the declaration is written *before* the build, because a rejected
declaration is a schedule event, not a bug. Sources: [Play — location in the
background](https://support.google.com/googleplay/android-developer/answer/9799150?hl=en) ·
[Android — access location in the
background](https://developer.android.com/develop/sensors-and-location/location/background).

Timezones (§7) are resolved here: a live "up next" across a border needs real instants, and so does any
honest mileage number (§8.8). **`journey_overrun` ships with them** (§2.12) — the rule `travelRole` makes possible and a wall-clock model cannot support. Its
injected-fault criterion is already known and measured: on the reference trip it must fire **zero** times,
and specifically must **not** fire on Aug 21 BA863 (Budapest 12:55 + 165 min, next stop 15:15) once the
CEST → BST crossing is modelled. Move that flight one hour later within Budapest's own timezone and it must
fire once. `[stated]`

**Exit criteria** beyond the two halves above: a canned fix stream through `segmentTrace` produces the same
segments in plain Node as on a device `[stated]`; a trace with a two-hour hole renders **as a hole**, and an
injected-fault criterion proves it — feed a stream with the middle removed and assert the output carries an
explicit `gap`, not an interpolated line across the Adriatic `[stated]`; and `git grep` finds no coordinate
in any log call in `apps/mobile` `[stated]`.

---

## Phase 6 *(was Phase 5)* — photos

**Ships:** on-device library enumeration by trip window, EXIF/location read, `suggestPhotoStops` scoring in
core, a suggestion queue, and opt-in attach with EXIF GPS stripped on upload (§5.4). The association model
is §8.6 and it is deliberately narrow: one trip, at most one of a stop/place/day, optionally participants,
candidate until accepted.

**Independently useful:** "here are 40 photos from Aug 13, and here is the stop you were standing at" is the
pillar-5 payoff and needs nothing from Phase 7.

**Two gates that are not engineering** *(the first verified 2026-08-27)*. Google Play's Photo and Video
Permissions policy restricts broad `READ_MEDIA_IMAGES` to apps that pass an **appropriate-access review**
demonstrating a core use case for persistent or frequent access; everything else is expected to use the
system photo picker — **and a picker cannot enumerate a library by timestamp and GPS, which is the whole of
pillar 5.** So on Android this phase either wins that review or degrades to "pick photos yourself", and the
degraded mode must be designed rather than discovered. Compliance is mandatory for apps targeting Android
17+ from 2026-10-28. Source: [Play — Photo and Video Permissions
policy](https://support.google.com/googleplay/android-developer/answer/14115180?hl=en).

**This phase fires a trigger already written down:** photos are `Place`'s second referent kind, so §2.13
A-6a's closing paragraph applies — `removeStop`'s single-row prune becomes a reference-counted delete with
a user-visible affordance. Re-read it; do not rediscover it.

Watch item: Android `ACCESS_MEDIA_LOCATION`. Without it coordinates come back empty *with no error*, which
will look like a matching bug and is a manifest bug. **Injected-fault criterion, precisely because it is
silent:** run the suggester against an asset list with every coordinate stripped and assert it degrades to
time-only with reduced confidence and **says so**, rather than returning confident wrong matches `[stated]`.
Every photo suggestion is `{source:'system', state:'candidate'}` and `displayStatus()` returns
`'suggested'` until accepted — the same invariant as Phase 1, on new data `[stated]`.

---

## Phase 7 *(was Phase 6)* — discovery through the network, the recap, and polish

Only meaningful once there *is* a network, which is why it is last rather than exciting. Ships, in rough
order of how well each is supported by data that will exist by then:

- **Discovery through people, not an algorithm.** *"Friends who have been here"*, *"people you follow are
  going here"*, *"trips from people you trust"* — every one of these is a **query over shares and the
  travel history that already exists** (§8.4's country and city attribution, joined to `Connection` and
  `TripShare`). No recommendation ML, no feed, no ranking model. The social unit stays the trip, the stop
  or the place.
- **The yearly recap and the travel passport.** Pure derive over `travelStats`; cheap once the statistics
  exist, worthless before.
- **Goals and achievements**, as §8.8 defines them: a declarative target evaluated against derived stats.
  No counters, no points, nothing that rewards typing.
- **Travel distance by mode** (added at revision 10; `ARCHITECTURE.md` §8.10). `tools/gen-airports.mjs` and
  the bundled airport index, `airportOf` and `journeyDistance`, `TravelStats.distance`, and the surfaces that
  render it. **Air distance becomes available the moment Phase 4's endpoint codes exist**; the ground modes
  arrive with Phase 5b's `Journey` records. Two things are criteria, not preferences: **no total is ever
  rendered across two provenance bases**, and a journey whose endpoints do not resolve is reported as
  *unmeasured* rather than back-filled from the plan. A distance goal (*"fly 25,000 miles"*) is the same
  declarative target as every other goal, filtered to physical bases. **Airline loyalty miles are not in this
  phase or any phase** — §8.10.7.
- **Opt-in simplified trace sharing** if it did not land in 5b; **share-page polish** with its own
  permission attack pass (the one surface where a mistake is publicly visible); a trip-level cost report
  with a stored `rateSetId`; and whatever the earlier phases proved was missing.

**Not in this phase and not in any phase yet: live presence** — *"people currently in the same
destination"*. §8.8 refuses it, in writing, with the bounded design it would have to take if it is ever
built.

---

## Sequencing rules

1. **Nothing skips Phase 1.** Every later phase consumes `packages/core` and `packages/client`. A second
   implementation of legs, costs, conflicts or trip state anywhere is a design defect, routed to the architect.
2. **No phase begins before the previous one has a manager verdict of SHIP.** A phase built on an unverified
   phase is where the pipeline stops being worth having.
3. **Privacy and authorization invariants are tested every phase, not audited at the end.** From the
   accounts phase (now **3**) the tester's brief includes grepping for coordinates and mailbox content in
   logs, requests and database rows, and running the access conformance matrix. Phase 2 runs the matrix too
   — twice, with and without participants, and the two runs must be identical.
4. **The live planner stays untouched throughout.** `europe-2026-itinerary.html`, `docs/` and `tickets/` at
   the repo root are Jacob's working app; Cairn reads them and never writes them, in any phase, until
   Jacob says the replacement is better. This includes write paths that only *could* reach it: `cli export`
   refuses any path normalising outside `cairn/`.
5. **A count is not a result.** Every criterion in this document obeys **How a criterion is written**, and
   a criterion that does not is a design defect routed to the architect — same as a second implementation.
   This rule exists because revision 1's Phase 1 passed a green acceptance run with nine false blockers, a
   headline criterion met at 37 %, and a stated count of "2 bundled" that the repo's own test suite
   asserted was 3.
6. **A caveat belongs where it is read.** A source comment recording a divergence from `ARCHITECTURE.md` or
   this file must have a matching entry in `BUILD-NOTES.md` under **Known divergences from the contract**,
   which is the first thing the manager reads, and a grep-based check in `npm test` keeps the two from
   drifting. Six files pointing at BUILD-NOTES for content it did not contain is how nine false blockers
   stayed invisible.
7. **Phase numbers shifted exactly once, at revision 9, and they do not shift again.** Every heading above
   carries its old number and the mapping is at the top of this file. A document written before revision 9
   means the phase it *described*. If a future change needs work inserted, it gets a letter (`2a`, `2b`),
   not a renumbering — forty cross-references inside settled rulings are not worth a tidy sequence.
8. **A capability with no data behind it does not get a phase.** Discovery, recaps, goals and distance are
   all derived from travel the product has not recorded yet, and each is scheduled *after* the phase that
   records it. **Distance is the worked example** (§8.10): air waits for Phase 4's endpoint codes, every
   ground mode waits for Phase 5b's observed tracks, and the surfaces wait for both — which is why revision
   10 added three deliverable lines and **no new phase**. This is the roadmap form of principle 10: the base product must be valuable before the
   automatic, social and gamified layers exist, and every one of those layers is only as good as the
   history underneath it.
