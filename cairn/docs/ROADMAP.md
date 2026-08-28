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

**Revision 12, 2026-08-27.** QA round 13 — the mandatory breaker pass over **I-3a** and **I-4a** — found
both increments faithful to their rulings and **neither finished**: four findings are holes in the rulings
themselves, and `ARCHITECTURE.md` revision 12 answers them as **A-11**, **A-12**, **A-13** (§2.7) and
**A-14** (§2.14). This file changes in exactly one way: **I-3a's and I-4a's Built / Verification / Ship-gate
lines**, so neither increment can be called shippable until the addenda land. **No new increment, no phase
re-scoped and no change to the order** — I-5 and I-6 are unblocked by all four, with the single exception
recorded under I-4a: no copy-heavy increment ships before A-14, because until it does every cross-trip copy
of a place-linked stop leaves an error the user cannot clear.

**Revision 13, 2026-08-27.** QA round 14 — the mandatory breaker pass over A-11…A-14 — closed **A-11, A-12
and A-13** and found A-14's mechanism right and its *"what does not change"* claim wrong, plus a credential
leak on the copy path that round 2 filed as a BLOCKER and only half-fixed. `ARCHITECTURE.md` revision 13
answers all three as **A-15** and **A-16** (§2.14) and **A-17** (§2.7). This file changes in exactly the same
one way revision 12 did: **I-3a's and I-4a's Built / Verification / Ship-gate lines**, so neither increment
is shippable until the addenda land. **No new increment, no phase re-scoped and no change to the order.**
The blocking relation moves rather than growing: I-3a's remaining work is A-17 and is documentation plus one
test, while **I-4a now blocks any share, friend or public-share-link work outright** — A-15 is the only place
in the design where data crosses a *person* boundary, and until it lands the copy hands a friend's door PIN,
confirmation number and voucher URL to the recipient's document.

**Revision 14, 2026-08-28.** QA round 15 — the breaker pass over A-15/A-16/A-17 — confirmed **A-16** and
**A-17** and could not break A-15's redaction of a copied `Place`; what it broke is the *reach* of A-15's
argument, twice, at depths the ruling's table did not recurse into. `ARCHITECTURE.md` revision 14 answers the
two design findings as **A-18** (the copied stop's own `cost` and `arrival` carry free text across the person
boundary — BLOCKER) and **A-19** (a `{kind:'pool'}` placement's `cityKey` is validated against the target,
never re-filed). This file changes in exactly the same one way revisions 12 and 13 did: **I-4a's Built /
Verification / Ship-gate lines.** **No new increment, no phase re-scoped and no change to the order.**
I-3a is untouched — A-17 held. **I-4a keeps its outright block on any share, friend or public-share-link
work**, and the reason is now stronger rather than merely repeated: two rounds running, the copy path has
handed a credential across the one boundary in this design where data reaches another person, each time
through a field the previous ruling assumed rather than enumerated.

**Revision 15, 2026-08-28.** QA round 16 — the breaker pass over A-18/A-19 — closed **both**, and with them
the entire R14/R15 chain, and left two MINOR findings: one a fixture a builder repairs in a line, the other a
design question. `ARCHITECTURE.md` revision 15 answers it as **A-20** (§2.9): `fromJSON` validates
`Place.hours` like every other field it parses, one predicate in `model/openingHours.ts` becomes the single
definition of a well-formed `OpeningHours` for the parser, `validateTrip` and the copy boundary, and the
builder-added `place_hours_malformed` is **ratified** with its meaning narrowed. This file changes in exactly
the same one way revisions 12, 13 and 14 did: **I-4a's Built / Verification / Ship-gate lines.** **No new
increment, no phase re-scoped and no change to the order.** I-4a's outright block on share/friend/
public-share-link work is **unchanged in scope and no longer the reason this increment is open** — the
credential carriers are all closed; what remains is one parser gap and one fixture, and neither is a
credential path. I-5 stays unblocked.

**Revision 16, 2026-08-28.** QA round 17 — the breaker pass over A-20 — closed A-20, R16-1 and R16-2 and
left four MINOR findings, three for a builder and one for an architect because its cause is A-20's own
printed function body. `ARCHITECTURE.md` revision 16 answers it as **A-21** (§2.9): a predicate over a
compound value **returns what it read** instead of a `boolean` its caller must re-read the value to act on,
and every field of a source record in `copyStop.ts` is read **once**. This file changes in exactly the same
one way revisions 12, 13, 14 and 15 did: **I-4a's Built / Verification / Ship-gate lines.** **No new
increment, no phase re-scoped and no change to the order.** I-4a's outright block on share/friend/
public-share-link work is **unchanged**, and the reason moves back one notch: the copy path has a live
credential path again — `cost.display` and `hours.weekly[*].open`, on a cast-built source — bounded to
in-process callers because JSON cannot express an accessor. I-5 stays unblocked.

**Revision 17, 2026-08-28.** QA round 18 — the breaker pass over A-21/A-21a — confirmed both are faithfully
built and falsified the claim they rest on: a mechanical read-count **census** over the shipped control flow
found **six** more fields of caller-supplied values read more than once in `copyStop.ts`, one of them
(`source.trip`, ×5) able to credit a copied stop to the wrong person. `ARCHITECTURE.md` revision 17 answers
it as **A-22** (the four missed sites, plus the `ctx` trio, plus A-21a's exception restated at the
granularity where the harm lands and **restored** by cloning the reuse probe's coordinate) and **A-23** (the
census becomes a **standing test** in `packages/core/test/readOnce.test.ts`, so this class of defect fails
the suite instead of waiting for the next breaker round). This file changes in exactly the same one way
revisions 12, 13, 14, 15 and 16 did: **I-4a's Built / Verification / Ship-gate lines.** **No new increment,
no phase re-scoped and no change to the order.** I-4a's outright block on share/friend/public-share-link work
is **unchanged**, and the reason is now the strongest it has been: the copy path can put **another person's
name on your credit** — §2.14 rule 7, one of the four things `BRIEF.md` calls non-negotiable — bounded to
in-process callers because JSON cannot express an accessor. I-5 stays unblocked.

**Revision 18, 2026-08-28.** QA round 19 — the breaker pass over A-22/A-23 — confirmed A-22 is faithfully and
completely built and that **A-23's census mechanism works** (20 planted defects inside its roots, all 20 red,
fourteen invisible to `copyStop.test.ts`, twelve in functions no ruling has ever touched). What it falsified
is the census's **reach**: the `opaque` set hid both whole `Trip` records on a justification that is false for
`Trip.id` and `Trip.ownerId`, the ten-row matrix assigned row 5 a cover its own reuse branch short-circuits
past, and the fixture omitted `Stop.ticket` — the one field §6.6 calls an access credential.
`ARCHITECTURE.md` revision 18 answers it as **A-24**: `opaque` narrows from the `Trip` to the `Trip`'s six
collections, the matrix goes to **14** rows, `ticket` joins the fixture and rule 3's fixture covers all three
`Ticket` kinds. This file changes in exactly the same one way revisions 12–17 did: **I-4a's Built /
Verification / Ship-gate lines.** **No new increment, no phase re-scoped and no change to the order.** I-4a's
outright block on share/friend/public-share-link work is **unchanged**, and the reason is unchanged with it —
what moves is that the *sixth* consecutive defect in this file (R19-1, the credit again) becomes a **red test
rather than a hand-found finding**, which is the only thing that ends the arc. I-5 stays unblocked.

**Revision 19, 2026-08-28.** QA round 20 — the breaker pass over A-24 — is the first round of this arc whose
findings are almost entirely about the **guard** rather than the guarded code: 22 further document shapes and
all **143** of the reference trip's real stops produced no eighth multi-read in `copyStop.ts`, and A-24's
two-sided acceptance check reproduced exactly. What it falsified is A-24's own maintenance clause (*"the
fixture populating every field of both records is part of this contract"* — a sentence with nothing behind
it, and the same ruling left `Trip.meta` absent and `Trip.homeBase` null on the roots it had just added) plus
one narrow product site (`refileCityKey`'s step-4 fold reads a candidate `City.order` twice, so a copied
place can file under the wrong one of two cities the recipient named identically, with `validateTrip` at 0).
`ARCHITECTURE.md` revision 19 answers it as **A-25**: fixture completeness becomes **structural** — a
compile-time `Record<keyof T, true>` map, a runtime key-set assertion and a declared-nulls list, in the idiom
`copyStop.test.ts` has used since A-15 — `City` **rows** become census roots, one hoist closes the site, a
fifteenth matrix row builds the three same-named cities no row built, and A-24's residue disclosure is
corrected and completed. **A-25 Part 6 declares the arc closed for I-4a's ship gate on a written
six-clause criterion**, with the remaining residue named and bounded and the re-opening condition narrowed to
one thing. This file changes in exactly the same one way revisions 12–18 did: **I-4a's Built / Verification /
Ship-gate lines** — and, for the first time in the arc, the Ship-gate line records a **closure** rather than
another round. **No new increment, no phase re-scoped and no change to the order.** I-4a's outright block on
share/friend/public-share-link work is **unchanged** until the manager's 2a gate. I-5 stays unblocked.

**Revision 19, corrected in place, 2026-08-28 — no revision 20.** QA round 21 ran A-25 Part 6's six-clause
criterion against `020ee37` and **all six hold**, with a fresh 22-shape adversarial pass finding nothing that
meets the re-opening condition. **I-4a's ship gate is therefore MET and the arc is closed** — the gate line
below now records that, with the numbers and the repros, instead of pointing forward at a round. The round's
one finding (**R21-1**, MINOR) is a completeness gap in `ARCHITECTURE.md` A-25 Part 5's residue prose, fixed
there in place with no revision bump and no code change; `ARCHITECTURE.md`'s own front matter says why that
is an in-place correction rather than a revision 20. **Nothing else in this file moves:** no new increment,
no phase re-scoped, no change to the order, and I-4a's outright block on share/friend/public-share-link work
stands until the manager's 2a verdict.

**Revision 20, 2026-08-28 — and this one corrects me, not a builder.** I-5 shipped and disclosed
(**BUILD-NOTES KD-51**) that **exit criterion 4's island clause is factually wrong**: it requires
`Blue Cave, Biševo` and `Stiniva Cove, Vis` to attribute to **HR** and prescribes *"the generator moves to
1:50m and the budget moves, not the criterion"* as the remedy — and neither half survives measurement. The
builder was right to route it rather than patch around it (sequencing rule 5), and right to refuse to
invent a coastal buffer. `ARCHITECTURE.md` revision 20 answers it as **§8.4 A-26**, and this file changes in
four ways. (1) **Exit criterion 4 is rewritten**, with its island clause **withdrawn as wrong** and replaced
by a `resolvesAt` disclosure that tells a reader whether a hole is a scale question or a dataset gap —
the exact question the old clause could not express. (2) **I-5's Verification and Ship-gate lines** record
what shipped and what it does not cover. (3) **One new increment, I-5a**, builds A-26's mixed-resolution
index: the 1:110m base cannot name **64** ISO codes — Malta, the Maldives, Mauritius, the Seychelles,
Macao, Hong Kong, Singapore, Bermuda, the Faroes and 55 more — and misnames **8** of them, which is a
bigger hole than the one that was routed and is invisible to a corpus of one Adriatic trip. (4) **I-6 is
blocked on I-5a**, because a summary row minted from a 175-code index needs a `SUMMARY_VERSION` rescan the
day the index is completed, and today there are zero summary rows to migrate. **No phase re-scoped, no
change to the order otherwise, and nothing in Phase 2's boundaries moves.**

**Revision 21, 2026-08-28 — and this one corrects me again, in the same paragraph.** QA round 22 found I-5
and I-5a sound everywhere it could measure them, and found that A-26 Part 4 chose the **fill** scale by
fiat, at the layer A-26 Part 2 had just measured and rejected for the **base** (`R22-1`, MAJOR). It costs
filled countries their capitals: Nuku'alofa, St John's, St George's and Diego Garcia all come back `null`.
`ARCHITECTURE.md` revision 21 answers it as **§8.4 A-27**, and — this is the part worth reading before
building anything — **the obvious remedy is measured and rejected there**: choosing a coarser scale per code
deletes 175 of the Maldives' 176 atolls, 24 of the Seychelles' 26 and 67 of French Polynesia's 88. The
ruling is that a filled code ships **both** scales, as two entries under one ISO code, which composes as a
union because `countryOf` returns on the first *entry* that matches. This file changes in four ways.
(1) **One new increment, I-5b**, builds A-27; it is **owed before I-6** for exactly the reason I-5a was —
fixing the index while zero summary rows exist costs one increment, and after I-6 it costs a migration.
(2) **Exit criterion 4 gains a part e** and part c is amended where it counts entries rather than codes.
(3) **I-5a's record** says what it shipped and what round 22 found in it. (4) **I-6's blockers** gain I-5b.
**No phase re-scoped and no change to the order.** Two of round 22's builder-routed MINORs are folded into
I-5b rather than run separately, because A-27 lands in the same lines: **R22-4** (the budget test's guard 1,
which A-27's header list would otherwise trip) is a **prerequisite**, and **R22-5** (the fill's unreported
dropped-ring count) is absorbed. **R22-6** is ruled on rather than scheduled — A-27 Part 9 accepts the
bundle share, with one standing obligation recorded in every affected ship gate below.

**Revision 22, 2026-08-28 — and this one corrects the correction.** QA round 23 found I-5b's implementation
faithful to A-27 and A-27's own **filter 2** broken (`R23-1`, MAJOR). The filter compares a candidate ring
against *"every other entry of the coverage-only index"*, and A-26 made that index **mixed-resolution** —
175 of its 239 entries at 1:110m. So Macao's 1:50m ring was checked against China's 1:110m coastline, which
is generalised kilometres inland of the Pearl River delta, and passed: **≈22.1 km² of Guangdong attributes
to Macao today**, on ground Natural Earth's own 1:10m layer calls `CN`. `ARCHITECTURE.md` revision 22 answers
it as **§8.4 A-28**, and the part to read before building anything is that **the obvious remedy is measured
and rejected there too**: comparing against the finest layer *instead* admits Hong Kong's two outlying-island
rings and Singapore's, moving 23 cells `CN`→`HK` and 42 `MY`→`SG` — the `country → other country` class A-27
declares impossible. Filter 2 becomes **two arms**, both required. This file changes in five ways.
(1) **One new increment, I-5c**, builds A-28; it is **owed before I-6** for the third time and for the
identical reason — the index is on I-6's *write* path, so fixing it while zero summary rows exist costs one
increment and afterwards costs a `SUMMARY_VERSION` migration. (2) **Exit criterion 4 part e** gains `MO` in
its injected-fault list and gains the assertion whose absence let R23-1 ship. (3) **I-5b's record** says what
it shipped and what round 23 found in it. (4) **I-6's blockers** gain I-5c. (5) **R23-4's wording fix**: the
I-5, I-5a and I-5b ship gates each attached two facts to one command that demonstrates only the first, and
each is now pointed at the command that proves it — **no new script and no change to what any gate runs**.
**No phase re-scoped and no change to the order.** Round 23's builder-routed MINOR **R23-3** (the seven
`overlaps()` tests cannot detect any of its three clauses being deleted) is **folded into I-5c** rather than
run separately, for the reason A-28 Part 5 gives: its cause is the surplus A-28 removes, and its fixtures are
fixtures for the clauses A-28 rewrites.

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
- **`packages/core/src/index.ts`'s runtime exports equal §2.10's list exactly — 73 symbols** (69 in revision
  5; `reassertRetirements` joins in revision 6 under P1, §2.7 A-5; `lifecycle` joins in revision 10 under
  P2, §8.1/§8.9, counted in Phase 2 I-1's own pass; `countryOf` under P2 and `COUNTRY_INDEX` under P1,
  §8.4 clause 1, counted in Phase 2 I-5's own pass), **one list, set
  equality in both directions** `[stated]`. Rewritten in revision 5, because the criterion as met was
  satisfied by construction: the test asserted equality against the **union** of `SECTION_2_10` (50) and
  `BEYOND_2_10` (60), which is 110 = 110 for any 110 exports, and QA found 42 of the 60 per-symbol
  justifications did not hold (R2-12, KD-19). So, mechanically:

  > `surface.test.ts` contains **exactly one** array of symbol names. Grep the file: zero occurrences of a
  > second list, of the identifier `BEYOND_2_10`, and of the string `INTERNAL` — a symbol the test itself
  > calls internal is a symbol that is not exported. The assertion is
  > `setEquals(Object.keys(runtimeExportsOf(index)), THE_LIST)` in both directions, and `THE_LIST` is §2.10's
  > list transcribed, **73 entries**. Type-only exports are excluded from the set by construction (they do
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

| Step | Ships | Useful alone because | State |
|---|---|---|---|
| **2a — past trips and the lifecycle** | `lifecycle()`, `Trip.datePrecision`, the feasibility/integrity rule class (§8.2), a "record a past trip" flow (title, dates, precision, cities — no day-by-day required) | you can enter a 2019 trip and it does not greet you with twenty warnings about a hotel you already slept in | **SHIPPED — manager verdict SHIP, `REVIEW.md` "Phase 2, step 2a", reviewed at `67f5588`, 2026-08-28.** Built, verified (rounds 12–21), shippable. Seven routed items, **none blocking**; the block on share/friend/public-share-link work is **not** lifted by this verdict — see A-2 in that routing table |
| **2b — the lifetime map and travel identity** | `countryOf` + the generated country index, `travelStats`, the widened `TripSummaryRow` + `SUMMARY_VERSION` rescan, the **Map** and **Profile** surfaces | *"show me everywhere I've been"* — the signature experience, from data that already exists | **UNBLOCKED** by 2a's SHIP. **In progress: I-5 shipped at `897b928`** and routed one design defect here (KD-51), ruled as §8.4 **A-26** and built as **I-5a** at `b6200e6`, which QA round 22 verified and which routed one more (R22-1), ruled as §8.4 **A-27** and built as **I-5b** at `38d23c9`, which QA round 23 verified and which routed one more (R23-1), ruled as §8.4 **A-28** and scheduled as **I-5c**. Four things are owed **before I-6**: **I-5c**, `REVIEW.md` 2a routing **A-1**, and the breaker board items **B-1**…**B-4** before 2b's next breaker round |
| **2c — participants** | `Trip.participants`, three build functions, the participants editor, *"people you have travelled with"* on the profile | you can say the trip was with your girlfriend and her family, and it grants them nothing | Not started; gated on 2b |

**Mapped onto the increment sequence below** (revision 10): **2a = I-1 → I-4**, **2b = I-5 → I-8**,
**2c = I-9 → I-10**, with **I-0** before all of them and **I-11** the gate. Each of the three steps is
genuinely shippable at its own increment — the phase can stop after I-4 or I-8 and still have delivered
something better than what it started with. *(Revision 11: **I-3a** and **I-4a** carry the two design
rulings QA round 12 routed to the architect — `ARCHITECTURE.md` §2.7 **A-9** and §2.2 **A-10**. They sit
inside 2a, which shipped with follow-ups rather than clean, and **both are owed before I-6**.)*
*(Revision 20: **I-5a** carries `ARCHITECTURE.md` §8.4 **A-26**, the ruling on the design defect I-5
disclosed as KD-51. It sits inside 2b, directly after I-5, and is **owed before I-6**.)*
*(Revision 21: **I-5b** carries §8.4 **A-27**, the ruling on the design defect QA round 22 found *in A-26* —
the fill scale, chosen by fiat at the layer A-26 Part 2 had measured and rejected. Same place in the
sequence, same reason, **owed before I-6**.)*
*(Revision 22: **I-5c** carries §8.4 **A-28**, the ruling on the design defect QA round 23 found *in A-27* —
filter 2 comparing a candidate against a neighbour at whatever scale the mixed-resolution index happened to
draw it. Same place in the sequence, same reason, **owed before I-6** — and this one for the stronger
version of the reason: I-5a and I-5b left holes a later index would fill, while A-28 fixes a **wrong
country**, which a rescan does not quietly forgive.)*

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
                          I-5a: a 1:110m base filled from 1:10m, emitted in test order — §8.4 A-26
                          I-5b: + a 1:50m forgiveness entry per filled code, two filters — §8.4 A-27
                          I-5c: filter 2 becomes two arms; the predicate loses its means — §8.4 A-28
tools/forgiveness.mjs     overlaps() + the filters, importable so a test can inject a fault (I-5b/I-5c)
fixtures/golden/          countries.json (per-stop attribution), country-holes.json (I-5a),
                          forgiveness-drops.json (I-5b; gains `against` at I-5c), travel-stats.json
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

**Both increments were re-opened at revision 12, and neither is closed by its first pass.** QA round 13 built
them, attacked them and found the *rulings* incomplete in four places: `ARCHITECTURE.md` **A-11** (the
far-future horizon is a second clock-driven suppression and the shipped clock is not monotone), **A-12** (a
crashed rule retires the dismissals it owned), **A-13** (A-9 assertion 4 named a mechanism no Phase 1 rule
can perform) and **A-14** (A-10's change table missed `copyStopInto`). The bullets below carry those
additions; the follow-up builder pass **completes I-3a and I-4a** rather than opening I-3b/I-4b, because a
half-built ruling is not a shipped increment.

**Revision 13 re-opens them once more, and for the last time on this evidence.** QA round 14 attacked the
four revision-12 rulings as built: **A-11, A-12 and A-13 are done and verified** (434 clocks × 10 documents,
ten simultaneous rule crashes, a tripwire forced red by a real increment), and A-14's mechanism is done. Two
findings survive in the rulings themselves and one is a BLOCKER: `ARCHITECTURE.md` **A-15** (the copied
`Place` carries `note` and `links` across the trip boundary unredacted — round 2's R2-3, half-fixed),
**A-16** (A-14's *"copying within one trip is unchanged"* is false) and **A-17** (A-11 assertion 5's proof
assumes a stop id is unique per document). The bullets below carry all three. **R14-3** is routed to a
builder against the finding itself and is not an increment.

#### I-3a — Retirement stops answering to the clock (§2.7 A-9, QA P2-1)

- **Built.** `detect.ts`'s body moves into one private `runRules(trip, opts, gate)` with
  `detectConflicts = runRules(…, true)` and a new module-level `detectUngated = runRules(…, false)` that is
  **not** on `index.ts`. `syncResolutions` becomes `(trip, at)` and detects the un-gated set itself, with
  two early returns (no live resolution row; no well-formed `at`). `store.ts`'s `retireResolutions` drops
  its conflict-set argument and runs only when `derivedFor` returned a **new** cache. `unbooked_ticketed`'s
  `delta < 0` guard — §8.2's gate, open-coded inside a rule — is deleted.
  **Revision 12 adds, and none of it is optional for this increment:** `Rule` gains `horizonDays?: number`,
  `unbooked_ticketed` declares it and deletes its `delta > 60` guard, and `detect.ts` applies it as
  `beyondHorizon` — a **second suppression under the same `gate` conjunct**, so `detectUngated` disables it
  (**A-11**); `detect.ts` gains one more internal function, `detectUngatedChecked`, returning
  `{ conflicts, crashed }` so `syncResolutions` returns the trip unchanged when any rule threw — with
  `detectUngated`'s array shape deliberately left alone so round 13's probe assertions keep running verbatim
  (**A-12**); and the retirement-gate test's
  inert `setTripMeta` call is deleted and the test renamed to the clock crossing it performs (**A-13**).
  **Revision 13 adds one thing and it is not code (§2.7 A-17):** A-11 assertion 5 is narrowed to documents
  `validateTrip` accepts, the `Rule` contract gains the obligation that a rule declaring `horizonDays` must
  emit a subject whose `subjectDate` resolution does not depend on an id being unique, and
  `horizonGate.test.ts` gains **one directional test** — every horizoned finding whose `params.daysOut` is
  within the horizon survives the gate, swept over the existing clocks plus a `duplicate_id` document.
  **`detect.ts`, `subjectDate`, `beyondHorizon` and every rule file are untouched**, deliberately: A-17
  weighs the blast radius of threading a subject date through `Conflict` against a divergence that
  over-reports only, on a document this system already reports as invalid, and refuses it.
- **User-visible outcome.** Opening a trip you have finished no longer silently throws away the answers you
  gave it while it was live, and no longer schedules a write to a document you only looked at. If the trip's
  dates are later extended, the finding you dismissed comes back **still dismissed**, instead of accusing
  you of a dismissal the calendar undid.
- **Architecture / data model.** §2.7 **A-9**, read with §8.2. *Retirement is a claim about the document;
  the gate is a claim about the user's attention; they may not read the same set.* **The retirement ledger
  is not reopened** — A-5, A-5a, A-5b and A-8 are settled and this increment changes when retirement fires,
  never how a retirement behaves once it has. §2.10's runtime symbol count stays at **71** (BUILD-NOTES
  KD-42: the count was already 71 pre-revision-11; a stale 70 in an earlier draft is corrected): one exported
  signature changes and no symbol is added or removed.
- **Verification.** A-9's six assertions in full — QA's `qa/p2b-gate.mjs` §1.10 and §1.11 re-expressed
  against the two-argument signature (the assertions are kept verbatim; only the calls change, and A-9 says
  why no correct fix can avoid that); a genuine fix on a completed trip **does** still retire;
  `detectConflicts` output byte-identical before and after the `unbooked_ticketed` deletion at three clocks;
  and `syncResolutions(trip, '')` a no-op with live rows present. **Assertion 4 is A-13's rewrite, not A-9's
  original**: the re-arming case is proven across the gate **boundary** (dismiss → clock past `endDate` →
  clock back inside the trip → renders dismissed, carrying the user's live row, with no *"it has come
  back"*), with a faithful pre-A-9 control that fails it, because extending `endDate` cannot un-gate any
  Phase 1 rule and A-13 proves why.
  **Revision 12 replaces this increment's greppable ceiling with the property it was standing in for.** The
  ceiling is no longer *"`ctx.today` appears in exactly one rule file"* — R13-1 satisfied that grep and
  broke anyway, because the surviving suppression was in the file the grep permits. It is now a **clock
  sweep**: for one document, `detectUngated`'s sorted id list is identical at `2019-01-01`, `2026-08-01`,
  `2026-08-24`, `2026-08-30`, `2027-08-30` and `2030-01-01`, run on the reference fixture **and** on each
  injected-fault fixture, and **failing if any rule contributed no finding at any clock in the sweep** — a
  sweep over a document that exercises three rules asserts nothing about the other seven. Plus: QA §1.1–§1.3
  verbatim (a backwards clock step across the 60-day boundary retires nothing, in core and through the
  store, and `isDirty()` stays false); the crash case, QA §4 verbatim (a throwing rule retires nothing, and
  the restored rule renders the dismissal with no *"it has come back"*); and A-13's tripwire — **no
  feasibility rule emits a subject that resolves through §8.2 ruling 2's fallback**, whose failure message
  says that A-9 assertion 4's literal mechanism has just become achievable and must be written.
- **Dependencies / blockers.** I-3 (the gate it adjudicates). None external.
- **Ship gate.** Every Phase 1 and 2a conflict number re-derived unchanged — 2 blockers / 4 warnings / 11
  notes at `FIXTURE_TODAY`, and exactly two suppressed `missing_lodging` warnings on the reference trip at
  the real clock; the A-5a and A-5b test sequences pass untouched; `npm run test:tap` green.
  **Added at revision 12:** `detectConflicts` is byte-identical at all six sweep clocks **and with no clock**
  (the goldens are the oracle and do not move); the horizon still bites where it should — at a clock 200 days
  before the trip, `detectConflicts` reports **no** `unbooked_ticketed` note while `detectUngated` reports
  **three**; and `qa/r13-gate-citykey.mjs` §1 and §4 are at **0 FAIL**, with §3's first line replaced by the
  tripwire rather than made to pass (A-13 — it asserts a mechanism the model does not have, and the
  replacement is the honest edit; nothing else in that probe may be weakened to reach 0).
  **Added at revision 13:** the directional test above is green on a `duplicate_id` document as well as on
  the reference and fault fixtures; and `qa/r14-horizon-copy.mjs` §1.5's `ok()` is **retired by A-17, not
  fixed** — replaced by the directional assertion with A-17 named in the comment, its measurement kept as a
  `console.log`, and §1.4's `duplicate-stop-id` differential re-labelled as the measurement of a documented
  divergence (123 of 435 clocks). Nothing else in that probe's §1 may be weakened.

#### I-4a — City keys become minted ids, and duplicates become visible (§2.2 A-10, QA P2-2)

- **Built.** `CityInit.key` becomes optional and `createTrip` mints `ctx.ids.newId('city')` when it is
  absent; the `name.toLowerCase().replace(/[^a-z0-9]+/g,'-')` expression is **deleted** from both
  `PastTripForm.tsx` and `Library.tsx` (not repaired); `validateTrip` gains `duplicate_city_key`,
  `reserved_city_key` and `city_name_empty`, all `error`; `geoOutlier.ts`'s two label helpers resolve a key
  to `City.name` for display while `params.cityKey` keeps the id.
  **Revision 12 adds (§2.14 A-14):** `copyStopInto`'s rule 4 **re-files** the copied `Place` against the
  target's own cities by normalised name — reuse search included — and a place that cannot be filed **does
  not travel**, the stop keeping its coordinate as `{kind:'inline'}` (or `{kind:'none'}` when the source had
  none). `normalizeCityName` lands here, once, in `packages/core/src/model/cityName.ts`, **off** `index.ts`
  (§2.10 stays at 71), and I-7 consumes that module instead of writing a second copy.
  **Revision 13 adds two more, and the first is a BLOCKER (§2.14 A-15, A-16):** rule 4 sanitises the copied
  `Place` field by field through one module-private `placeForCopy` — `note` through `redactText`, `links`
  **dropped entirely**, `hours.note` redacted, `at` cloned, `name`/`category`/`hours.weekly` verbatim — with
  a **key-set assertion** so a ninth `Place` field cannot travel un-classified (**A-15**); and
  `refileCityKey` gains one step, *the source's own key wins when `source.id === target.id` **and** the
  target still holds that key*, ahead of the name fold and behind the source-resolves-its-own-key check
  (**A-16**). Neither changes `Place`'s shape, `packages/client`, `tools/redact.mjs` or §2.10's 71.
  **Revision 14 adds two more, and the first is again a BLOCKER (§2.14 A-18, A-19):** the copied **stop**'s
  own `cost` and `arrival` stop being spread — one `costForCopy` and one `arrivalForCopy`, with `cost.note`
  and `arrival.label` redacted, `cost.display` crossing only when redaction leaves it byte-identical and
  `null` otherwise (`costLabel` fills the hole from `amounts`), `amounts`/`Link`/`StopPlacement` rebuilt field
  by field, one cast-free `redacted()` helper replacing **every** `as string` in the file, and **four
  key-set assertions** so the next field on `CostEstimate` or `MoveOverride` cannot travel un-classified
  (**A-18**); and `copyStopInto` validates a `{kind:'pool'}` placement's `cityKey` against `target.cities`
  the way it already validates `dayId` — `TRANSIT_CITY_KEY` exempt, a throw when it does not resolve, the
  placement rebuilt rather than aliased, and a `hint.dayId` the target lacks **dropped** instead of carried
  (**A-19**). Neither changes `Stop`'s shape, `fromJSON`, `tools/redact.mjs`, `packages/client`, `apps/web`
  or §2.10's 71. R15-1 and R15-2 ride along as builder work under A-15's existing table, not as new rulings.
  **Revision 15 adds one, and it is the only line here that changes `fromJSON` (§2.9 A-20, QA R16-2):**
  `parsePlace`'s raw `hours` cast — the one field of that parser that is not structurally checked, and the
  root cause of R15-1, R15-2 *and* R16-2 — is replaced by a `parseOpeningHours` that refuses a malformed
  `hours` with a JSON path like every other field; `model/openingHours.ts` lands beside `cityName.ts`, **off**
  `index.ts` (§2.10 stays 71), holding `isClockTime`/`isWeeklyEntry`/`isOpeningHours` as the **only**
  definition of a well-formed `OpeningHours` in the repo; `wellFormedHours` is **deleted** from
  `validateTrip` and `weeklyForCopy` keeps only its redaction test, which is a copy-boundary **policy** and
  not a shape check; `toJSON`'s `hours: p.hours` becomes a field-by-field rebuild, the same gap on the way
  out; and `clockOrNull` is rewritten onto `isClockTime` so exactly one clock regex exists in
  `packages/core`. **`place_hours_malformed` is ratified** — level, code, ref, message and params unchanged;
  only its doc comment moves, because the sentence it currently carries (*the parser's cast is deliberate,
  per A-10*) is what this ruling reverses. No `Place`/`OpeningHours` shape change, no `schemaVersion` bump,
  no new pattern or call site in `redactText`, no change to `tools/redact.mjs`, `packages/client` or
  `apps/web`.
  **Revision 16 adds one, and it corrects revision 15's own mechanism (§2.9 A-21, QA R17-1):**
  `isWeeklyEntry(v): boolean` becomes `readWeeklyEntry(v): WeeklyRead` — `absent` / `entry` / `malformed`,
  **one read per field**, handing back the entry it validated — because a boolean forces every consumer to
  re-read the field to use it, and a `weekly` entry whose `open` is an **accessor** is validated on one read
  and copied from another (a door PIN into the recipient's document, R15-1's harm on a cast-built source).
  `isClockTime` becomes a type predicate, which deletes the last `as {…}` shape cast from `copyStop.ts`
  rather than moving it; `isOpeningHours` stays a boolean **because its caller reports rather than uses**,
  and reads `weekly`/`note` once each. In `copyStop.ts` the rule is **file-wide**: `weeklyForCopy`,
  `costForCopy` (whose `display` leaks by the identical mechanism — A-18's own field), `arrivalForCopy`,
  `hoursForCopy`, `placeForCopy` and `copyStopInto`'s placement and place blocks read every source field
  once into a `const`, and the place block's ternary fallthrough — which **aliased the source's own
  `PlaceLink` object into the target** for an out-of-union `kind`, needing no accessor at all — becomes a
  `{kind:'none'}` default. `toJSON`'s `hours()` reads `weekly` once; the rest of `toJSON` is deliberately
  out of scope. **No new defensive guard is added anywhere** — A-21 governs *which value crosses*, not
  whether a type-lie throws. `fromJSON` is **unchanged** (it is already read-once-and-return, and its forty
  `...(o.x !== undefined ? { x: str(o.x, path) } : {})` sites are the *safe* double read, blessed in
  writing so nobody sweeps them). No `Place`/`OpeningHours`/`Stop` shape change, no `schemaVersion` bump, no
  `redactText` change, no `packages/client`, `apps/web` or §2.10 movement (**71**).
  **Revision 17 adds two, and the second is the one that ends this arc (§2.9 A-22, A-23; QA R18-1…R18-5):**
  the four sites A-21's and A-21a's searches missed are closed by hoists that are mechanical applications of
  rules already written — `source.trip` and `source.stopId` read **once** each at the top of `copyStopInto`
  (so the document the stop is copied **from** is the document `provenance.origin` **credits**, and
  `origin.sourceStopId` is the id the caller named rather than a second read of the found record),
  `srcPlace.at` hoisted in the `kind:'inline'` branch, `samePlace` reading each of its six fields once (it
  threw a raw `TypeError` out of core on a **recipient** row whose `at` flipped to `null`), and `ctx.ids` /
  `ctx.today` / `ctx.actorUserId` hoisted because their harmlessness today is a property of `addStop` rather
  than of this function. **A-21a's accepted exception is restated one level down and restored**: the reuse
  probe carries a **clone** of the coordinate, because `samePlace` reads `b.at.lat` once per candidate row —
  so `original.at.lat` was read N+1 times with N set by the **recipient's** document, and the residue was a
  *hybrid* coordinate rather than the disclosed duplicate row. Two is the ceiling again, at every level,
  independent of the other party's document; `samePlace`, `placeForCopy`, `refileCityKey` and A-15's single
  classification point are untouched in contract. And **A-23**: a new
  `packages/core/test/readOnce.test.ts` runs a **read-count census** — counting accessors over every field of
  the source stop, the source and target `Place` rows and all three arguments, recursing into nested records
  — across a ten-scenario matrix covering every branch of `copyStopInto`, with a five-entry allow-list whose
  every entry must be exercised. No `Place`/`Stop` shape change, no `schemaVersion` bump, no `redactText`
  change, no `fromJSON`/`toJSON`/`packages/client`/`apps/web` change, no §2.10 movement (**71**).
  **Revision 18 adds one, and it is the census's reach rather than its mechanism (§2.9 A-24; QA
  R19-3…R19-6):** two hoists in `copyStop.ts` that are mechanical applications of rules already written —
  `source.trip.id` read **once** across the credit and A-16 step 2's identity test (A-22 hoisted the
  container and left the field, so the credit can still name `trip-src` while the re-file decides *"the
  source IS the target"* and files a Vienna place under the recipient's Prague key, with `validateTrip`
  reporting 0), and the recipient's `Day` resolved **once** across `copyStopInto` → `addStop` (the pre-check
  passes and `withDay` then throws, naming the day the guard just accepted — §2.1 again). Then the guard
  itself: **`opaque` narrows from the whole `Trip` to the `Trip`'s six collections**, so `Trip.id` and
  `Trip.ownerId` — which cross verbatim into `provenance.origin` — are censused like any other value, with
  **two** new allow-list entries that are *irreducible structural counts* (a field of a document the function
  **spreads** has a floor of one read; a field it only **reads** has none) rather than blessed judgment
  calls; the matrix goes **10 → 14** rows for four ordinary document shapes it never built; `Stop.ticket`
  joins the census fixture so the source stop carries **15 of 15** `Stop` fields; and `copyStop.test.ts`'s
  rule-3 fixture covers **all three** `Ticket` kinds, because *"no ticket travels"* is a claim over the union
  and a kind-gated regression passed 615/615. No `Place`/`Stop`/`Ticket` shape change, no `schemaVersion`
  bump, no `redactText` change, no `fromJSON`/`toJSON`/`packages/client`/`apps/web` change, no §2.10 movement
  (**71** — `censusTrip` and `TRIP_SKELETON` are test-local).
  **Revision 19 adds one, and it is the guard's own completeness rather than its reach or its mechanism
  (§2.9 A-25; QA R20-1…R20-5):** **one line of product code** — `refileCityKey`'s step-4 fold hoists the
  candidate's `order` into a `const`, so the number the tie-break is decided on is the number the winning
  record carries (with two reads, three same-named target cities and a flipping `order` file the copied
  `Place` under the wrong city and `validateTrip` reports **0**, because a `Place` carries no provenance).
  Everything else is the census. **Fixture completeness stops being a sentence in a docstring**: four
  `Record<keyof T, true>` maps (`Trip`, `Stop`, `Place`, `City`) so a new field fails `npm run typecheck` in
  `readOnce.test.ts` as well as in `copyStop.test.ts`, a **runtime key-set assertion** tying each maximal
  fixture instance to its map with **no `filter`** (unlike `copyStop.test.ts`'s, which excludes `ticket`
  because that assertion is about what may *cross* and this one is about what is *watched*), a pinned list of
  row 14's deliberate absences, and a **declared-nulls** test — because a key-set assertion cannot see a
  `null`, and `homeBase: null` hid a named home coordinate. The fixtures gain `homeBase` and `meta` on all
  three `Trip`s, `countryCode`/`meta` on both documents' `City` rows, `note`/`links`/`hours` on the target's
  `Place` rows, and a **populated** `bookingId` rather than a declared null, because the regression shape this
  arc keeps meeting (`...(src.x && … ? { x: src.x } : {})`) short-circuits after one read against a null and
  is invisible exactly as `ticket` was. **`City` rows become roots** (`srcCity0…n`, `tgtCity0…n`) — A-24's
  trigger was written about the wrong verb, and a value that *decides where a crossed record is filed* is in
  scope exactly as one that crosses is, R18-4 being the precedent — with **one** new allow-list entry
  (`tgtCity0.key`, `max: 2`) and a fifteenth matrix row (three same-named target cities at orders 5/3/4; two
  do not reach the tie-break, because the first match short-circuits on `best === null`). A-24's residue
  disclosure is **corrected**: the recipient's `Day.id ×2` is not a residue but a **floor** under A-24's own
  spread-versus-read discriminator, and `reindex`/`insertionIndex`'s `placement` multi-read is ruled **out of
  scope** for this arc with three reasons and a trigger. No `Place`/`Stop`/`City`/`Trip`/`Ticket` shape
  change, no `schemaVersion` bump, no `redactText` change, no `fromJSON`/`toJSON`/`build/stops.ts`/
  `packages/client`/`apps/web` change, no §2.10 movement (**71**).
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
  unopenable) — **a claim about those three codes only, and revision 15 sharpens rather than contradicts it:
  a duplicate city key is a structurally perfect `Trip` that *means* something wrong, so it parses and
  `validateTrip` reports it; a `Place.hours` that is not an `OpeningHours` is not the declared type at all,
  so A-20 refuses it with a path. §2.9 A-20 draws that line.** **Ceiling, measured not asserted:** the reference trip's validation issue count, conflict
  counts at every clock, and the round-trip goldens and sample JSON are byte-identical; the only expected
  string that moves in the repo is the injected-fault `geo_outlier` case, now reading *"the Vienna map"*.
  **Added at revision 12, and it is the criterion this increment shipped without:** the ruling is exercised
  on the one path where a record **crosses a document boundary**. Two independently created *Vienna* trips,
  a place-linked stop copied between them → **zero `unknown_city_key` issues** and the copied place carries
  the **target's** key; the same copy when the target already holds that place **reuses** it
  (`places.length` unmoved — the cross-trip reuse A-10 silently disabled); a Croatian place-linked stop
  copied into a Prague-only trip adds **no** place row, keeps a resolvable coordinate, and produces zero
  issues and no `geo_outlier`; a target with two cities named *Vienna* re-files onto the lower `order`,
  deterministically.
  **Added at revision 13, and the first of these is what the increment shipped without noticing:** a place
  note reading *"Front door PIN 0754, conf 5814731574 — ask for jacob@example.com"* and a link
  `https://vendor.example/booking/…` copied into a friend's trip leave **no** `redactionHits` on the copied
  place, **no** `links` key at all, and none of the four credentials greppable anywhere in the recipient's
  `toJSON` — while a place note that is *not* credential-shaped crosses **byte-identical**, because a rule
  that redacts everything passes the first half and is wrong (**A-15**). And the within-trip cases: a copy on
  a trip holding two same-named cities keeps the place's own key and adds **no** row; a copy under a
  blank-named city keeps the place link; a copy of a place whose `cityKey` the source cannot resolve **still**
  takes step 3; and a copy whose `source.trip` is the same document re-parsed through `fromJSON` (equal by
  `.id`, a different object) is byte-identical to the same-object call — the assertion that fails under
  `===` (**A-16**).
  **Added at revision 14, and the first of these is what round 15 found by looking one record inward:** a
  stop whose `cost.note` reads *"paid with card, conf 5814731574"* and whose `arrival.label` reads *"Bus 8,
  booking GYGG45MLA9Q9"* copies with **no** `redactionHits` on either and neither number greppable in the
  recipient's `toJSON` — while *"tickets at the door"*, *"Bus 8"* and *"gardens free · palace €15–24"* all
  cross **byte-identical**, and a credential-shaped `display` becomes `null` with `amounts` unchanged, so
  `costLabel` still renders a correct price (**A-18**). And the placement: a cross-trip copy into a pool under
  the **source's** city key **throws** with the target unmoved; the same copy under `TRANSIT_CITY_KEY`
  succeeds, mints no `pool_stop_unknown_city` and lands in `unfiledPool`; a `hint.dayId` only the source has
  is dropped, so `scheduleFromPool` on the copy succeeds through `pickDay` instead of throwing; and the
  written placement is never the caller's object, on the scheduled branch as well as the pool one (**A-19**).
  **Added at revision 15, and the first of these is the criterion R16-2 asked for (A-20):** over a table of
  `weekly` entry shapes that includes the three round 16 measured (`close:'170000'`,
  `open:'https://vendor.test/x'`, `open:'YZGDTS'`), **an entry `isWeeklyEntry` calls well-formed is never
  dropped by the copy** — and that invariant is not satisfiable by weakening one side, because all **11 000**
  strings matching `/^\d{1,2}:\d{2}$/` are proved byte-identical under `redactText` in a test of their own,
  which is what makes the copy's redaction arm unreachable for a structurally valid entry. Then the parser:
  each of those three shapes makes `fromJSON` throw naming the exact path
  (`$.places[0].hours.weekly[0].close`, `…[0].open`), `hours: 'mon-fri'` and `hours: null` are refused at
  `$.places[0].hours`, a legal `hours` **round-trips byte-identically**, a `weekly` entry with an extra key
  parses with the key **dropped**, and an `undefined` slot parses to `null`. And the two things that must not
  regress: `copyStopInto` **still never throws** on any of round 15/16's 34 hostile `hours` shapes supplied as
  a **cast-built in-memory** document, and the reference trip stays at **11** `validateTrip` issues —
  `place_hours_malformed` does not fire, because 0 of its 95 places carry `hours` at all.
  **Added at revision 16, and the injected fault is a flipping accessor (A-21, §0.5):** a getter whose 4th
  read is *"Front door PIN 0754, conf 5814731574"* and whose first three are `'9:00'`, on a cast-built
  source place, copies as **exactly `'9:00'`** with neither number greppable in the recipient's `toJSON`;
  the same for a `cost.display` flipping to *"conf 5814731574"* → **`'€25'`**, `amounts` unmoved. A `weekly`
  flipping `[[], 'nope']` and an `at` flipping `[{lat,lng}, null]` make `copyStopInto`, `validateTrip`,
  `isOpeningHours` and `toJSON` **return rather than throw** (all four throw a raw `TypeError` today, out of
  three functions whose docstrings say they do not). A cast-built `place` of `{kind:'nope', pin:'…'}` copies
  as `{kind:'none'}` with `pin` absent from the recipient's document. And the accept set does not move:
  `readWeeklyEntry(v).kind !== 'malformed'` agrees with the deleted `isWeeklyEntry` on **every** row of the
  existing table, so A-20's contract sentence — `isOpeningHours` is true exactly when `fromJSON` accepts —
  is re-derived rather than assumed.
  **Added at revision 17 (A-22, A-23), and the first of these is the one `BRIEF.md` calls non-negotiable:**
  with `source.trip` an accessor flipping between two trips, the copied stop's `provenance.origin` names the
  document the stop was **found** in and the `Place` row written comes from that same document; with the
  source stop's `id` flipping to a credential, `origin.sourceStopId` is the id the caller named and no part
  of the credential is greppable in the recipient's `toJSON`; an **inline** `at` flipping `[{1,2}, null]`
  returns rather than throws and flipping `[{1,2},{3,4}]` copies `{lat:1,lng:2}` (it copied `{lat:1,lng:4}`
  — a pair no read produced); a **target** row whose `at` flips to `null` no longer throws out of core; and
  a source `at` whose `lat`/`lng` are counting accessors is read **exactly twice each against targets
  holding 0, 1 and 3 same-name rows** (it was 1, 2 and 4 for `lat` against 1 for `lng`, because
  `samePlace`'s `&&` short-circuits). Then the standing guard, which is verified **both ways** and not just
  asserted: `readOnce.test.ts` is **red against the tree as shipped**, naming each of round 18's five
  findings from the scenario that exercises it, and **green** once A-22 lands, with each allow-list entry
  observed at exactly its stated maximum.
  **Added at revision 18 (A-24), and the criterion is the guard catching its own subject:** with A-24 Part 1
  applied and the `source.trip.id` hoist **reverted**, `readOnce.test.ts` is **red naming
  `srcTrip.id ×2`** — the sixth consecutive defect in this file, found by running the guard instead of by
  widening it — and **green** with the hoist applied, with **all seven** allow-list entries observed at
  exactly their max across the 14 rows. Each of the four new rows is verified by outcome and not by its
  name: row 11 writes a `Place` with `at: null` (`placeForCopy`'s null arm, which row 5's reuse branch
  short-circuits past, and which is the shape of the live planner's one coordinate-less place); row 12 files
  the place under the **source's own** key with the row reused and `validateTrip` at **0** (A-16 step 2, two
  distinct objects for one `Trip.id`); row 13 takes the source stop from `trip.pool`; row 14 copies a stop
  whose `cost`, `arrival` and `links` are absent. And `copyStop.test.ts`'s rule 3 asserts, **once per
  `Ticket` kind**, that `stop.ticket` is null and that the kind's own payload (`href`, `path`,
  `mailMessageId`/`filename`) is absent from `JSON.stringify(trip)`, with a compile-time exhaustiveness map
  so a fourth kind fails `typecheck` before it fails a test.
  **Added at revision 19 (A-25), and the injected fault is R20-1's own four-step mutation, run end to end:**
  a 16th `Stop` field written by `makeStop` only when truthy (`voucher?: { code: string }` — exactly
  `ticket`'s shape) fails `npm run typecheck` at **two** sites rather than one; satisfying **both** maps the
  way a builder would leaves the census's fixture test **red** naming `srcStop`; populating the fixture makes
  it green; and R19-5's exact plant on the new field
  (`...(src.voucher && src.voucher.code ? { voucher: src.voucher } : {})`) then reds the census with
  `srcStop.voucher ×3` on **every** scenario row. All four steps, or Part 1 is not implemented — at
  `3d1be3b` the same mutation ended 618/618 green with the census blind. The null clause is verified the same
  way: a double read of `Trip.meta` and R18-5's hybrid-coordinate shape on `Trip.homeBase` — **both 2/2 green
  before** — are **both red** after, naming `srcTrip.meta ×4`, `srcTrip.meta.sourceHash ×2`,
  `srcTrip.homeBase ×4` and `srcTrip.homeBase.at ×2`, and `DECLARED_NULLS` is **empty**. Then the site
  itself, two-sided: with `City` rows censused and row 15 built, reverting the `refileCityKey` hoist reds
  assertion 1 naming **exactly** `15 · … : tgtCity1.order ×2` and nothing else, and applying it is green with
  **all eight** allow-list entries observed at exactly their max — the eighth (`tgtCity0.key`) on row 9, the
  only row that reaches both of its reads. Ceilings unmoved and measured, not asserted: **620** tests (618 +
  the two new ones), typecheck clean on both projects, 71 exports, reference trip 2/4/11, `validateTrip` 11,
  goldens and sample byte-identical at sha `40955ca0b182`.
- **Dependencies / blockers.** I-4 (the form it corrects). None external.
- **Ship gate.** The slug expression appears **nowhere** in `apps/` or `packages/` (grep); no call site
  outside `packages/core` constructs a city key; each of the three new validation codes has an
  injected-fault test, because a rule with no injected-fault criterion does not ship.
  **Added at revision 12:** `qa/r13-gate-citykey.mjs` §10 at **0 FAIL**, including its pre-A-10 control; and
  **no copy-heavy increment ships ahead of this one** — until A-14 lands, every cross-trip copy of a
  place-linked stop leaves a `validateTrip` **error** in the recipient's document that no control in the UI
  can clear, on the primitive `BRIEF.md` calls the social one.
  **Added at revision 13:** `qa/r14-horizon-copy.mjs` §5.1, §5.2, §5.7, §5.9 and §5.10 at **0 FAIL**, with
  §5.1 unmoved rather than adjusted — a ruling that makes A-14's cross-trip assertions fail is a wrong
  ruling; and **no share, friend or public-share-link work of any kind ships ahead of A-15**, which is a
  stronger bar than revision 12's. The copy is the one place in the design where data crosses a *person*
  boundary; until A-15 lands it hands a friend's door PIN, confirmation number and voucher URL into the
  recipient's document and every later export of it, on a record nothing badges (§2.14 A-6: a `Place` has no
  provenance).
  **Added at revision 14:** `qa/r15-place-copy.mjs` §2.1 at **0 FAIL** and §1.1/§1.2/§1.3 at 0 FAIL (R15-1
  and R15-2, the builder half of A-15); §5.1/§5.2/§5.7/§5.9/§5.10 of `qa/r14-horizon-copy.mjs` **unmoved**;
  and **no spread of a source record into the target document survives anywhere in `copyStop.ts`, at any
  depth** — the grep is `\.\.\.` inside `copyStop.ts`, and every remaining one must be an object-literal
  optional-key spread (`...(x === undefined ? {} : { … })`), never `{ ...sourceRecord }`. §3.4's first probe
  line meets A-19's throw and is **QA's to re-express**, not the builder's to satisfy; nothing under `qa/`
  is edited by the pass that lands this.
  **Added at revision 15 (A-20):** **exactly one clock regex exists in `packages/core`** — the grep is
  `\d{1,2}:` and it hits `model/openingHours.ts` and nothing else — `wellFormedHours` exists nowhere,
  `isOpeningHours` is not on `index.ts` (**71** unmoved), and no second copy of either predicate exists in
  `build/` or `validate/`; both of A-20's tests are **mutation-verified** (weakening either predicate on one
  side turns exactly one test red), because a test that cannot fail is what R15-4 and R15-5 were. And the
  same `qa/` rule as revision 14, now pointing the other way: **`qa/r15-place-copy.mjs` and
  `qa/r16-copy-depth.mjs` push hostile `hours` through `fromJSON` and will meet a `TripParseError` — that is
  the new correct behaviour, it is QA's to re-express in round 17, and a builder who "fixes" it by loosening
  the parser has reverted the ruling.** The builder reports the probe lines it expects to move; the
  re-expression is two-sided and both halves must survive it — `fromJSON` refuses with a path, and
  `copyStopInto` still never throws on the equivalent cast-built document.
  **Added at revision 16 (A-21):** **six mutations, at least one red test each** — re-reading `e.open` in
  `weeklyForCopy`, `c.display` in `costForCopy`, `o.weekly` in `isOpeningHours` and again in `hoursForCopy`,
  `p.at` in `placeForCopy`, and restoring `place = src.place` as the ternary fallthrough — each verified in
  a throwaway worktree, because
  a test that cannot fail is what R15-4, R15-5, R16-1 **and R17-2** all were and this pass will not add a
  sixth; a surviving mutation is reported in BUILD-NOTES as a missing fixture, not rounded down.
  `copyStop.ts` still contains **no `as string`** and, comments stripped, **exactly one** `{ ...x }` spread
  (`{ ...target }`), and it now contains one shape cast fewer than before. And the same `qa/` rule as
  revisions 14 and 15, pointing at three named lines: `qa/r16-copy-depth.mjs` §1.4's source greps for
  `isWeeklyEntry(w)` / `redacted(e.open) !== e.open` go **red on the rename** and are QA's to re-express
  (`readWeeklyEntry(w)` / `redacted(open) !== open`); `qa/r17-hours-parser.mjs` §3.2's **first** assertion
  must go **green** — if it does not, A-21 Part 4 is not implemented; and §3.2's **second** assertion
  (`warned || restores`) **stays red and is withdrawn by A-21 Part 6** as a claim about two traversals of an
  unstable document that no implementation can satisfy — **a builder who makes it pass by touching `toJSON`
  or `place_hours_malformed` has reverted A-20.** Nothing under `qa/` is edited by the pass that lands this.
  **Added at revision 17 (A-22, A-23), and this is the gate that changes what "closed" means for this
  increment:** **`packages/core/test/readOnce.test.ts` exists, is in the default `npm test` glob, and is
  mutation-verified in both directions** — reverting any one of A-22's five hoists turns it red on its own,
  and it is green with all five applied. **A `readOnce` allow-list entry may not be added or widened by the
  pass that lands this**, or by any later builder pass: a sixth entry is an architect's ruling, because it is
  the written form of *"this value may be read twice and here is why the second read cannot leak"* (A-23).
  Plus **five mutations with at least one red test each** in `copyStop.test.ts` (restoring `source.trip` at
  any of its five sites; `sourceStopId: src.id`; the inline `srcPlace.at` pair; `samePlace`'s `a.at` reads;
  the un-cloned probe `at`) — a survivor is reported in BUILD-NOTES as a missing fixture, not rounded down;
  and the sixth (restoring `actorUserId: ctx.actorUserId` in the `addStop` opts) is **expected to survive
  `copyStop.test.ts` and to be caught by `readOnce.test.ts` alone**, which is the point of the guard and is
  reported as such rather than papered over. And the same `qa/` rule as revisions 14, 15 and 16, pointing at
  three named lines that are **QA's to re-express in round 19, never the builder's to satisfy**:
  `qa/r18-readonce.mjs` §1.1's census assertion and §3.1–§3.4 must all go **green** with no edit; §2.3's
  first assertion (`latReads === 1`) **stays red and is re-expressed** as `latReads === lngReads === 2`,
  constant in N — a builder who drives that 2 to 1 has changed `placeForCopy`'s contract, which A-21a refused
  and A-22 does not reopen; §3.5's three *"recorded, not filed"* lines stay green and become vacuous.
  Nothing under `qa/` is edited by the pass that lands this.
  **Added at revision 18 (A-24):** the allow-list rule gains its converse and both halves are gates. **No
  eighth `ALLOWED` entry and no raised `max`** may be added by the pass that lands this or by any later
  builder pass — if A-24's four new rows surface a multi-read the seven entries do not name, that is a
  **finding routed to the architect**, not an entry. **And a now-dead entry is deleted in the same pass**:
  if the `source.trip.id` hoist also removes `refileCityKey`'s read of `target.id`, `tgtTrip.id` drops to 1,
  assertion 2 goes red, and the entry comes out — deleting a dead entry is a builder's obligation, not a
  widening. Plus the same `qa/` rule as revisions 14–17, pointing at named lines that are **QA's to
  re-express in round 20, never the builder's to satisfy**: `qa/r19-census-gaps.mjs` §1, §2, §3.1, §3.2, §4.1,
  §4.2 and §5 must all go **green** (§3.1's cross-check that QA's copy of the census agrees with
  `readOnce.test.ts` is re-derived against the *seven*-entry allow-list and the 14 rows, since A-23's
  *"a divergence between the two is itself a finding"* is unchanged); §6 is already green and stays green.
  Nothing under `qa/` is edited by the pass that lands this.
  **Added at revision 19 (A-25), and this is the line that closes the arc rather than extending it.** The
  same standing rules first: **no ninth `ALLOWED` entry and no raised `max`** by this pass or any later
  builder pass (a multi-read the eight entries do not name is a **finding routed to the architect**); a
  now-dead entry is deleted in the same pass; and nothing under `qa/` is edited — `qa/r19-census-gaps.mjs` §5
  pins *seven* entries and goes red at eight, `qa/r20-census-reach.mjs` §2 measures QA's own local copy of
  the fixtures, and R20-5's `qa/r14-horizon-copy.mjs` §7 ceiling (`kds.length === 49` → **50**) is one
  character, all three **QA's to re-express in round 21** under A-19 assertion 7, with the builder *reporting*
  the lines it expects to move. New, and it is a process gate rather than a code one: **a pass that mints a
  KD runs the probe that pins the KD count and says so** — two earlier passes declined to mint one *because
  of* that line, so it was known to be load-bearing, and the pass that broke it reported *"nothing in this
  pass went unrun."*
  **THE CLOSING CRITERION (§2.9 A-25 Part 6), stated here so it is verified rather than declared.** The
  read-once / credential-boundary arc is **closed for this increment's ship gate** when round 21 confirms all
  six of: **(1)** `test:tap` green with `readOnce.test.ts`'s **four** tests inside it, typecheck and
  `web:build` clean, **71** exports, 2/4/11, `validateTrip` 11, goldens and sample byte-identical at
  `40955ca0b182`; **(2)** the Part 3 hoist red-and-green two-sided, naming exactly `tgtCity1.order ×2`, with
  all **eight** entries at exactly their max; **(3)** R20-1's four-step mutation reproduced end to end, all
  four steps; **(4)** the `meta` and `homeBase` plants red and `DECLARED_NULLS` empty; **(5)** no ninth entry
  and no raised max; **(6)** the A-25 Part 5 residue re-derived by the breaker from a fully-opened census
  rather than inherited from this document. **The re-opening condition is exactly one thing** — a multi-read
  the shipped census structurally **cannot see**, of a value that crosses a person boundary or that decides
  where a crossed record is filed. A finding *inside* the census's roots is a normal regression routed as
  ordinary builder work, not a re-opened arc; a count that moves, a message that changes, or a residue A-25
  Part 5 already names are none of them re-openings. **Consequence for the manager's 2a gate:** with those
  six met, I-4a is closed on this class and the gate is a judgment about I-3a and I-4a as increments, not
  another round of this arc.
  **MET — this ship gate is closed (QA round 21, `master` @ `020ee37`, `QA-FINDINGS.md` "Round 21"; recorded
  here 2026-08-28).** All six clauses of the closing criterion **HOLD**, each verified by running the code in
  a throwaway worktree and each with a named repro (`qa/r21-closure.mjs` §1–§6, `qa/r21-clause3.sh`): (1) 620
  pass / 0 fail with `readOnce.test.ts`'s four tests **inside** the suite at 505–508, typecheck and
  `web:build` clean, **71** exports, 2/4/11, `validateTrip` **11**, goldens and sample byte-identical at
  `40955ca0b182` with `git status --porcelain` empty before and after; (2) the Part 3 hoist red-and-green
  two-sided, the reverted offender list a **one-element array** naming exactly `15 · … : tgtCity1.order ×2`,
  and all **eight** entries observed at exactly `max: 2`; (3) R20-1's four steps end to end — the 16th field
  now fails typecheck at **two** sites where round 20 measured one, and **there is no green-and-blind state to
  walk past**; (4) the `meta` and `homeBase` plants red on all fifteen rows (green at `3d1be3b`, so the
  clause is two-sided) and `DECLARED_NULLS` `{}`; (5) eight entries, all at `max: 2`, the diff against
  `3d1be3b` exactly one added line and zero removed or modified; (6) the residue re-derived from a
  fully-opened census — 19 distinct paths, nine covered, ten in classes A, B and C and **nothing else**.
  Beyond the criterion, the breaker's own fresh attack — **22 document shapes no row of the fifteen builds**,
  through both censuses — returned **0 throws, 0 unnamed multi-reads inside the roots, 0 paths outside the
  accounted set**, and `srcTrip.bookings` / `srcTrip.resolutions` / `Trip.homeBase` / `Trip.meta.poolNotes`
  are read **zero** times by this path. **Nothing found meets the re-opening condition.** The round's one
  finding, **R21-1** (MINOR, architect), is clause 6's own assigned re-derivation returning three further
  instances of an already-accepted class; it is folded into A-25 Part 5 **in place, with no revision bump and
  no code change**, and the breaker states explicitly that it does not re-open the arc.
  **So: the read-once / credential-boundary arc is CLOSED for this increment, and I-4a has no open item.**
  Its outright block on share, friend and public-share-link work stands as written until the manager's 2a
  verdict — that block is a scope rule, not an open defect, and closing this gate does not lift it. The next
  step for I-4a is the **manager's 2a SHIP / SEND BACK call**, which is now a judgment about I-3a and I-4a as
  increments, with **no further round of this arc owed to it**.
  **MANAGER VERDICT: SHIP** (`REVIEW.md` "Phase 2, step 2a", reviewed at `67f5588`, 2026-08-28). **2a is
  shipped and 2b may open.** I-3a's and I-4a's ship gates are met as written; the manager re-derived
  A-25 Part 6 **clause 2** (revert the `refileCityKey` step-4 hoist → `readOnce.test.ts` assertion 1 red
  with a **one-element** offender list naming exactly `15 · … : tgtCity1.order ×2`; restored → 4/4) and
  **clause 4's null clause** (plant `homeBase: null` on `sourceTrip` → test 4 red naming exactly
  `srcTrip.homeBase`; `DECLARED_NULLS` `{}`) in a throwaway worktree, and states in writing why clauses
  1, 3, 5 and 6 were **not** derived a third time. Independently re-run and reproduced: 620/620,
  typecheck clean both projects, `web:build` clean, **71** exports, **2/4/11** at `FIXTURE_TODAY`,
  `validateTrip` **11**, goldens + sample byte-identical at `40955ca0b182`, `detectUngated`'s id set
  identical at **eight** clocks, `qa/r13`…`qa/r20` all 0 FAIL / ALL OK.
  **Two things this verdict does NOT do, stated so they are not assumed.** (1) **The block on share,
  friend and public-share-link work is not lifted** — it is re-issued, now attached to `REVIEW.md`'s 2a
  routing item **A-2** (P2-8: an ownerless foreign document is adopted whole and unmarked;
  `packages/client/src/store/store.ts:1027-1028`), which is an **architect** item that must be ruled
  before any of that work ships. (2) It does not close the two items routed against 2a's own surface:
  **BLD-1** (P2-5, `apps/web/src/views/PastTripForm.tsx:107-143`, builder, in 2b's first builder pass)
  and **A-1** (§8.1's provenance table names `{source:'user', confidence:'asserted'}` for
  memory-entered travel and no path in the product produces it — `provenance.ts:18` hardcodes
  `'confirmed'` — architect, **owed before I-6**, together with the ruling on whether a day-city the
  past-trip form assigned may stand as evidence in `travelStats`). Four further items go to the
  **breaker before 2b's first round** (**B-1**…**B-4**): the probe board has re-rotted since I-0 cleared
  it — `qa/r11-recheck.mjs:207` aborts on A-19's throw and silently loses 9 of its 21 assertions, and
  `qa/r21-closure.mjs` §6 and `qa/p2b-gate.mjs` §2.1 carry stale ceilings.

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
  living in the test — not in any document. Then exit criterion 4 parts **a** and **d**: a golden naming
  **every distinct country and the stop that produced it** (a country with no stop named fails the run); a
  mid-Atlantic coordinate returns `null`; the Fisherman's Bastion typo changes the attributed country **and**
  still produces its `geo_outlier` blocker. Attack list: the poles, the antimeridian, exactly `(0,0)`, an
  enclave, international waters. ~~The Dalmatian islands attribute to **HR** — if they do not, the generator
  moves to 1:50m and the budget moves, not the criterion.~~ **Withdrawn at revision 20 as factually wrong;
  parts b and c of the rewritten criterion 4 replace it and are I-5a's, not I-5's.**
- **Dependencies / blockers.** **One external item, and it is the phase's only one: the Natural Earth
  admin-0 download.** The generated module is committed, so this is a one-time fetch — but this environment's
  egress proxy blocks many hosts, so **confirm the download works before this increment starts**, not during.
  If it is blocked, that is a blocker to raise, not to route around by hand-typing polygons.
  **Resolved 2026-08-28, before the increment started, and the answer is in §8.4's citation, which is the one
  to read** — `naturalearthdata.com` *is* proxy-blocked (403); the source is Natural Earth's own repository
  at **tag `v5.1.2`**, same dataset and all three scales, identity/scale/licence re-verified from content and
  the 110m/50m checksums recorded. **The builder fetches the pinned tag §8.4 names and does not substitute
  another host, ref or scale** — a scale change is still the correctness floor's decision, made by
  measurement, exactly as **Verification** above says.
- **Ship gate.** Budget test passes and its number came from a measurement; the golden exists and every
  entry names its producing record; **the generated module still type-strips with no build step**, which
  `node --test packages/core` demonstrates on its own — it imports the workspace entry point, registers no
  tests, and goes red if the module cannot be stripped. *(Revision 22, QA R23-4: that command is a
  **type-stripping gate, not a test run**. The suite is `npm run test:tap`, and it does not run in file
  order — the budget test lands around `ok 190` there. The claim that the budget test is **first** is true
  of `node --test --test-concurrency=1 packages/core/test/*.test.ts` and of no other command; it is
  fail-fast convenience, and the load-bearing half is the strip gate, which is order-independent because a
  module that will not strip fails every test that imports core.)*
  **SHIPPED at `897b928`, with the criterion it could not meet routed rather than worked around.** The
  generator, `countryOf`, the golden and the budget test are built at 1:110m (175,085 bytes measured, 3
  unattributed places / 4 unattributed stops); parts **a** and **d** of criterion 4 are met; the builder
  measured all three scales, shipped the best of them, and filed **KD-51** instead of inventing a
  tolerance §8.4 forbids. **What I-5 does not cover, and I-5a does:** the index carries 175 of the family's
  239 ISO codes, so 64 countries — Malta, the Maldives, Mauritius, the Seychelles, Macao, Hong Kong,
  Singapore, Bermuda, the Faroes and 55 more — are unreachable, and 8 of them return a wrong neighbour.
  `ARCHITECTURE.md` §8.4 **A-26** Part 3 has the measurement. **Nothing I-5 shipped is wrong; it is
  incomplete, and A-26 Part 4 changes none of its answers** — all 226 of the reference trip's
  coordinate-bearing records attribute identically before and after.

#### I-5a — A-26: the mixed-resolution index, and the order that resolves an enclave

- **Built.** `tools/gen-countries.mjs` gains a **fill**: after building the base scale (`110m`), it fetches
  the family's finest scale (`10m`, checksum already pinned in the file) and adds the polygons of every ISO
  code the base does not carry, then emits all entries in the order `countryOf` must test them — ascending
  summed absolute spherical ring area, ties by ISO code ascending. `geo/countryIndex.ts` stops re-sorting
  and preserves the order it is given. New `--holes` mode writes `fixtures/golden/country-holes.json`.
  **`derive/country.ts` is not touched** — if it grows a distance function, the increment has gone wrong.
- **User-visible outcome.** None yet, deliberately, exactly as I-5: the dataset is completed **before** any
  screen depends on it. What it buys is that the lifetime map I-6 and I-8 build can name Malta.
- **Architecture / data model.** §8.4 **A-26**, Parts 4 and 6, which are written as an implementation brief.
  A-26 Part 5 names the two residues that are **disclosed and pinned rather than fixed** — Vatican City is
  `IT` at every scale because Natural Earth's `VA` feature is a 110 m × 130 m sliver, and a filled country's
  border is biased toward the smaller state by the coarse layer's tolerance (~700 m at Monaco). Neither may
  be closed by a hand-authored polygon or an exclusion box: **`null` and a disclosed known-wrong answer are
  both acceptable; a hand-typed polygon is not** (I-5's dependency clause, unchanged).
- **Verification.** Exit criterion 4 parts **b** and **c** in full, plus the three measurements that make
  this a non-regression rather than a hope, each re-derived by the builder and not quoted from A-26:
  **(i)** over the reference trip's 226 coordinate-bearing records, **zero** answers change — so
  `fixtures/golden/countries.json` is byte-identical except its `index` header, and a diff anywhere else
  fails the increment; **(ii)** over a 0.25° global grid, the new index differs from the old in cells that
  are **only** `null → a country` or `a wrong country → the right one`, and **no cell gets worse**;
  **(iii)** the two injected faults of part c (drop `LI`; restore ISO order) each turn named tests red.
  `EMITTED_BYTES` is re-measured from the generator's own output and pasted into
  `0-countryBudget.test.ts` in the same commit — it is a **ceiling** assertion, so it must be raised, and
  the 1 MiB type-stripping ceiling stays where it is.
- **Dependencies / blockers.** I-5. No new external dependency: same repository, same pinned tag `v5.1.2`,
  same public-domain licence, one more file fetched at generation time by a human. **`--scale 10m` must
  keep working**, because A-26 Part 2's scale-selection rule is only honest while the comparison is still
  one command.
- **Ship gate.** Criterion 4 b and c pass; the three verification measurements are re-derived, not quoted;
  the golden's non-`index` bytes are unchanged; `node --test packages/core` is still green with the larger
  generated module, which is the type-stripping gate and nothing else (revision 22, QA R23-4 — see I-5's
  ship gate for what that command does and does not prove), and `npm run test:tap` is green.
  **BUILT at `b6200e6` and verified by QA round 22**, which could not break the artefact's reproducibility
  (a throwaway regeneration is byte-identical), the ray cast (1.2 M cells against an opposite-direction
  implementation, zero disagreements), the emission order (re-derived with a different area formula:
  strictly ascending, zero ties; ten overlapping country pairs swept, the smaller wins all ten) or the
  non-regression (674,541 cells, zero worse). **What round 22 found is the fill *scale*, which A-26 chose
  without measuring** — `R22-1`, MAJOR, ruled as §8.4 **A-27** and scheduled below as **I-5b**. Nothing I-5a
  shipped is wrong; like I-5 before it, it is incomplete, and A-27 adds to its output without changing one
  ring of it.

#### I-5b — A-27: the forgiveness entry, and why a filled code may not be made to choose

- **Built.** `tools/gen-countries.mjs` gains a **forgiveness pass**: for each filled ISO code — the codes the
  base scale does not carry, and only those — the same country's polygons at each strictly coarser scale of
  the pinned family are added as an **additional entry under the same ISO code**, ring by ring, subject to
  A-27 Part 4's two filters (a ring must overlap the code's own coverage rings; a ring must overlap no other
  entry). `orderEntries` gains a third sort key so the comparator stays a total order with duplicate codes.
  The run reports the forgiveness list, the kept/dropped ring counts **with the filter that dropped each**,
  and the fill's degenerate-ring count (R22-5). `packages/core` gains **no behavioural change at all**: two
  docstrings move — `geo/countryIndex.ts`'s fill paragraph, and `derive/country.ts`'s two false sentences,
  whose replacements A-27 Part 8 gives **verbatim** (R22-3).
- **User-visible outcome.** None yet, deliberately, exactly as I-5 and I-5a. What it buys is that a stop
  recorded on the waterfront in Nuku'alofa, St John's, St George's or Diego Garcia is attributed to its own
  country rather than to nothing — the failure mode a lifetime map of island travel is *made* of.
- **Architecture / data model.** §8.4 **A-27**, Parts 3, 4 and 7, written as an implementation brief.
  **Read Part 2 first**: it measures and rejects the remedy this finding looks like it wants (a per-code
  *choice* of scale), because substituting the coarser polygon deletes 175 of the Maldives' 176 landforms.
  `countryOf` **does not change**; if it grows a distance function, a buffer or a branch, the increment has
  gone wrong. A-27 Part 6 carries the three residues, one of them introduced by this increment and accepted
  in writing.
- **Verification.** Exit criterion 4 part **e** in full, plus four measurements re-derived by the builder
  from the generator itself and **not quoted from A-27**: **(i)** over the reference trip's 226
  coordinate-bearing records, **zero** answers change — `fixtures/golden/countries.json` is byte-identical
  except its `index` header, and so is `country-holes.json` including its hole count and every `resolvesAt`;
  **(ii)** every ring of the pre-I-5b index is present **byte-identical** in the new one, which is what makes
  `country → null` impossible rather than merely unobserved; **(iii)** a fine sweep (step ≤0.02°) over every
  forgiveness entry's bounding box padded by 0.1°: cells may go `null → a country` and **no cell may go
  `country → null` or `country → a different country`**; **(iv)** the four capitals above attribute to their
  own countries, St Peter's Basilica is still `IT`, and Zhuhai — Chinese ground beside Macao — is still
  `null`. **Injected faults:** delete filter 2 and `AD`, `HK`, `LI`, `MC`, `SG`, `SM`, `SX` acquire
  forgiveness entries, turning a named test red; delete filter 1 and Vatican City acquires the 1:50m polygon
  that sits a kilometre west of it, turning a named test red.
- **Dependencies / blockers.** I-5a. **R22-4 is a prerequisite inside this increment** — the budget test's
  guard 1 has 140 bytes of headroom and A-27 lengthens the generated header by a 54-code list, so guard 1 is
  re-expressed against the code list (or folded into guard 3) *before* the regeneration lands, or the
  increment fails on a guard that is measuring the wrong thing. No new external dependency: same repository,
  same pinned tag `v5.1.2`, same three files, all fetched at generation time by a human.
- **Ship gate.** Criterion 4 part e passes; the four verification measurements are re-derived, not quoted;
  the goldens' non-`index` bytes are unchanged; `EMITTED_BYTES` is re-measured from the generator's own
  output and pasted into `0-countryBudget.test.ts` in the same commit; `country.test.ts`'s code-count
  assertion is split into a **distinct-code** count (239) and an **entry** count (measured);
  `node --test packages/core` is still green with the larger generated module — the type-stripping gate, and
  nothing else (revision 22, QA R23-4) — and `npm run test:tap` is green. **And, per
  A-27 Part 9: `npm run web:build` is run and the resulting bundle figure is recorded here**, because this is
  an increment that moves `EMITTED_BYTES` and the bundle share is a tracked number from now on rather than
  something each QA round rediscovers.
  **BUILT at `38d23c9` and verified by QA round 23**, which could not break the increment's additivity (the
  coverage half of the new payload is the pre-I-5b artefact byte-for-byte), its composition under one ISO
  code (70,712 points inside the 54 forgiveness entries, every one answering its own code), the emission
  order's third key, `overlaps()`'s false *negatives* (0 in 4,000 randomised differential pairs), or filter
  1's and filter 2's drops. **What round 23 found is A-27's filter 2 itself** — `R23-1`, MAJOR, ruled as
  §8.4 **A-28** and scheduled below as **I-5c** — plus two MINORs, `R23-2` (the predicate's vertex-mean
  probes, ruled in A-28 Part 5) and `R23-3` (the `overlaps()` tests' mutation coverage, folded into I-5c).
  Everything I-5b shipped that is *kept* is right; one of its 142 admitted rings is not, and A-28 removes
  exactly that one.

#### I-5c — A-28: filter 2's second arm, and the predicate that is now what it claims

- **Built.** `tools/forgiveness.mjs`: `overlaps` loses its two vertex-mean probes (and `vertexMean` with
  them), and `forgivenessFor` becomes
  `forgivenessFor(candidates, own, others, finestOthers, opts = { filter1, filter2a, filter2b })` — filter 2
  is now **two arms**, 2a against the coverage-only index as it ships and 2b against every other ISO code at
  the **finest scale of the pinned family that carries it**, tested in that order, each independently
  removable, and the function **throws** if `filter2b` is on and `finestOthers` is empty. Drops gain
  `against: 'coverage' | 'finest' | null`; `filter` stays `1 | 2`. `tools/gen-countries.mjs` prepares the
  finest population **once** outside the per-code loop, asserts `FILL === FAMILY[FAMILY.length - 1]` (A-28
  Part 3's trigger — the day the fill is not the finest scale, filter *1* inherits R23-1), and reports the
  two arms separately. `packages/core` gains **no hand-written change in any file**; `countries.gen.ts` and
  the two goldens are regenerated.
- **User-visible outcome.** None yet, deliberately, exactly as I-5, I-5a and I-5b. What it buys is that a
  stop recorded in Zhuhai is not recorded as a visit to Macao — and, from I-6, not *persisted* as one.
- **Architecture / data model.** §8.4 **A-28**, Parts 3, 5 and 7, written as an implementation brief.
  **Read Part 2 first**: it measures and rejects the remedy this finding looks like it wants (replace filter
  2's population with the finest layer), because that admits `HK[1]`, `HK[2]` and `SG[0]` and moves 23 cells
  `CN`→`HK` and 42 `MY`→`SG`. **Both arms are required and neither substitutes for the other.** `countryOf`
  does not change; if it grows a distance function, a buffer or a branch, the increment has gone wrong.
- **Verification.** Exit criterion 4 part **e** in its revision-22 form, plus four measurements re-derived by
  the builder from the generator itself and **not quoted from A-28**: **(i)** over the reference trip's 226
  coordinate-bearing records, **zero** answers change — `fixtures/golden/countries.json` is byte-identical
  except its `index` header, and so is `country-holes.json`; **(ii)** every ring of the **pre-I-5b** index is
  still present byte-identical, and the forgiveness half is a strict subset of I-5b's, so the artefact is
  still additive against that baseline; **(iii)** a fine sweep (step ≤0.02°) over every forgiveness bounding
  box of the **I-5b** artefact padded by 0.1°: the *only* permitted difference is `MO` → `null`, and a cell
  changing anywhere else — in either direction — fails the increment; **(iv)** Zhuhai Nanping
  (22.221 N, 113.503 E) is `null`, Senado Square is `MO`, the four capitals of I-5b still attribute, St
  Peter's is still `IT`. **Injected faults, now three:** remove filter 1 and Vatican City gains its
  kilometre-west polygon; remove **both** arms of filter 2 and `AD`, `HK`, `LI`, `MC`, `MO`, `SG`, `SM`, `SX`
  gain entries; **remove arm 2b alone and `MO` alone gains an entry, and Zhuhai attributes to `MO`** — a
  named test red in each case. The third is the one whose absence let R23-1 ship and it is not optional.
  **R23-3 rides here:** each of `overlaps()`'s three clauses gets a fixture only that clause can answer, and
  `bash qa/i5b-mutants.sh`'s clause mutants go red.
- **Dependencies / blockers.** I-5b. No new external dependency: same repository, same pinned tag `v5.1.2`,
  same three files, all fetched at generation time by a human — the finest layer arm 2b needs is the fill
  layer the generator already downloads and parses.
- **Ship gate.** Criterion 4 part e passes in its revision-22 form; the four verification measurements are
  re-derived, not quoted; the goldens' non-`index` bytes are unchanged apart from the one removed drop
  record and the shifted `forgivenessAt` positions; `EMITTED_BYTES` is re-measured from the generator's
  output and pasted into `0-countryBudget.test.ts` in the same commit; `country.test.ts`'s **entry** count
  moves to the measured number while its **distinct-code** count stays at 239; `node --test packages/core` is
  green (the type-stripping gate) and `npm run test:tap` is green. **And, per A-27 Part 9: `npm run
  web:build` is run and the resulting bundle figure is recorded here**, because this increment moves
  `EMITTED_BYTES` — downward, for the first time.

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
- **Dependencies / blockers.** I-5 (there is no `countryCodes` without an index), **I-5a** (revision 20: a
  row minted from a 175-code index carries `null` for Malta and `MY` for Singapore, and completing the index
  afterwards costs a `SUMMARY_VERSION` rescan of every row a user has written — today there are zero rows,
  which is the cheapest this fix will ever be; §8.4 clause 3's own argument, applied to itself),
  **I-5b** (revision 21: the identical argument one step further — a row minted before A-27's forgiveness
  entries carries `null` for a stop on the Nuku'alofa waterfront, and the rescan that fixes it is free only
  while there are no rows), **I-5c** (revision 22: the same argument in its *wrong-answer* form, which is
  the worse one — a row minted before A-28 records a stop in Zhuhai as a visit to **Macao**, and a wrong
  country in a persisted summary is not a hole a later index quietly fills but a fact the profile asserts;
  §8.4 clause 3 computes the summary *inside* the write that carries it, so the moment I-6 lands the
  correction costs a `SUMMARY_VERSION` rescan) and
  **I-4a** (a row that carries a city key minted by the 2a slug carries `"-"` for every non-Latin city, and
  the rescan would copy that into the one cache the lifetime map reads).
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
- **Country attribution is measured, and its holes are visible.** *(Rewritten at revision 20. The old
  clause — "the island places `Blue Cave, Biševo`, `Stiniva Cove, Vis`, Lokrum attribute to **HR** — if
  they do not, the generator is on the wrong Natural Earth scale and the budget moves, not the criterion" —
  is **withdrawn as factually wrong**, not reinterpreted. `ARCHITECTURE.md` §8.4 **A-26** Part 1 has the
  measurement: those landforms have no admin-0 polygon at any scale in the pinned family, so no scale
  change reaches them and `null` is their correct answer.)* Four parts:
  - **a. The golden names its producers.** `countryOf` over the reference trip's coordinate-bearing stops
    and places produces a golden listing **every distinct country with the stop that produced it** — a
    country with no stop named fails the run `[snapshot + stated]`
  - **b. Every hole is named, and says whether a scale would fix it.** `fixtures/golden/country-holes.json`
    carries one row per unattributed record with `resolvesAt` — the coarsest scale in the pinned family
    that *does* attribute it, or `null` if none does — and a test asserts that the set of records it names
    is exactly the set the committed index leaves `null`, so the two artefacts cannot drift. **Stated
    values, measured at revision 20:** `Blue Cave, Biševo`, `Stiniva Cove, Vis` and
    `Budikovac / Blue Lagoon — snorkel stop` are `resolvesAt: null` — **a dataset gap, and `null` is the
    correct answer, not a defect and not a `TODO`** — and `Hvar Town` (both its stop and its place) is
    `resolvesAt: "10m"`. **The ceiling:** the count of holes with a *non-null* `resolvesAt` is the number
    that may not grow, because that is the one a scale change could have fixed `[stated]`
  - **c. Every ISO code the base scale omits is filled, and a filled country wins its own ground.** The
    shipped index carries every ISO code the pinned family's finest scale carries — a code present there
    and absent from the index fails the run — and a point inside a filled country returns that country,
    never its neighbour. **Two injected faults:** drop `LI` from the fill and Vaduz returns `AT`; restore
    ISO-ascending order and Vaduz returns `AT`, Singapore returns `MY` and Hong Kong returns `CN` — three
    named tests red in each case. **One known-wrong answer is pinned rather than fixed:** Vatican City
    returns `IT` at every scale, with A-26 Part 5's reason in the test's own text `[stated]`
    *(Revision 21: **"every ISO code" is a count of distinct codes, not of entries.** A-27 lets one code own
    more than one entry, so a test asserting `countries.length === <number of countries>` is asserting the
    wrong thing and must be split — `new Set(countries.map((c) => c.code)).size` for the semantic claim, a
    separate measured number for the artefact's length.)*
  - **d. The two original injected faults, unchanged.** A mid-Atlantic coordinate returns **`null`** and the
    profile renders it as *unattributed*, never as the nearest country; the historical Fisherman's Bastion
    typo (`place-68`, lat `47.5025 → 48.5025`) changes the attributed country **and** still produces its
    `geo_outlier` blocker, so the map inherits the same protection the conflicts panel has `[stated]`
  - **e. A filled country is forgiven at its waterline, and forgiveness is never taken from a neighbour.**
    *(Revision 21, §8.4 **A-27**, replacing nothing — this is the part A-26 had no measurement for.)* Each
    filled ISO code carries, in addition to its finest-scale rings, the same country's rings at each coarser
    scale of the pinned family that survives A-27 Part 4's two filters. Three assertions and two injected
    faults: **(i)** a waterfront coordinate in Nuku'alofa, St John's, St George's and Diego Garcia attributes
    to `TO`, `AG`, `GD` and `IO` — all four are `null` against the pre-I-5b index, and the test says so;
    **(ii)** every ring of the pre-I-5b index is present **byte-identical**, so the change is additive and a
    `country → null` regression is impossible by construction rather than merely unobserved — assert the ring
    sets, not a sample; **(iii)** a fine sweep over each forgiveness entry's bounding box finds **zero** cells
    that go `country → null` or `country → a different country`. **Injected fault 1:** remove filter 2 and
    `AD`, `HK`, `LI`, `MC`, `SG`, `SM`, `SX` gain forgiveness entries — a named test goes red, because
    forgiveness taken from an encloser is the wrong-answer class A-26 Part 5 residue 2 bounds.
    **Injected fault 2:** remove filter 1 and Vatican City gains the 1:50m polygon that lies ~1 km west of
    the state — a named test goes red. **The ceiling:** no code may acquire a forgiveness entry that the
    generator did not report, and no forgiveness entry may introduce an ISO code the coverage pass did not
    already emit `[stated]`
    *(**Revision 22, §8.4 A-28**, QA R23-1. Three corrections, and the third is the one that matters.
    **(1)** injected fault 1's list gains **`MO`**: it is a bordered filled code and A-27's enumeration was
    short by one. **(2)** filter 2 is **two arms**, so "remove filter 2" means removing both.
    **(3)** a **third injected fault** is now required, and it is the assertion whose absence let R23-1
    ship: **remove arm 2b alone — the comparison against each neighbour's finest drawing — and `MO` alone
    gains a forgiveness entry, and Zhuhai Nanping (22.221 N, 113.503 E) attributes to `MO` instead of
    `null`.** A named test goes red on the coordinate, not only on the entry count. **And one assertion this
    criterion did not have:** every sweep it asks for compares the index against **itself**, which is exactly
    why 22.1 km² of Guangdong could be gained without any of them noticing — a cell going `null → MO` books
    as a *gain*. So part e now also requires **one comparison against a third source**: for every ring a
    forgiveness entry admits, the finest layer in the pinned family must not attribute that ring's ground to
    another ISO code. That is arm 2b, asserted as a property of the shipped artefact rather than only run as
    a filter `[stated]`)*
- **The generated index is inside its budget**, and the budget is a number in the test, measured by
  `tools/gen-countries.mjs` and not quoted from any document `[stated]` *(Revision 21, §8.4 **A-27** Part 9:
  the index is ~36 % of the web bundle and has no consumer until I-6. That is **accepted, not deferred** —
  from I-6 the index is on the **write** path, so it can never be lazily loaded behind the map route, and
  splitting it now is work I-6 would undo in the one place §0.6 keeps synchronous. The obligation this
  creates is one line, not a task: **any increment that moves `EMITTED_BYTES` runs `npm run web:build` and
  records the resulting bundle figure in its own ship gate**, so the share is tracked rather than
  rediscovered.)*
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
on a trip whose real dates are a single day · **a stop in each of San Marino, Vatican City, Monaco,
Liechtenstein, Andorra, Gibraltar, Singapore, Hong Kong, Macao, Malta and the Maldives** (§8.4 A-26: seven
must return themselves, `VA` is a pinned known-wrong `IT`, and none may return `null` after I-5a) ·
**a stop on the waterfront in Nuku'alofa, St John's (Antigua), St George's (Grenada) and Diego Garcia**
(§8.4 A-27: all four are `null` before I-5b and must return `TO`, `AG`, `GD`, `IO` after it) · **a stop in
St Helier, Jersey**, which is `null` at every scale of the pinned family and must **stay** `null` — the same
class as the Dalmatian coves, and the one a tester is most likely to file as a bug ·
**a stop 500 m outside Monaco on the French side**, which A-26 Part 5 says will return `MC` and says why ·
**a stop a few kilometres out to sea from one of the 53 forgiven island territories**, which A-27 Part 6
residue 3 says will return that island and says why · **a stop in Zhuhai, on Chinese ground beside Macao**,
which must return **`null`** — it returns `MO` in the I-5b artefact, which is QA R23-1, and §8.4 A-28 Part 1
says why `null` and not `CN` is the right answer from an index that draws China at 1:110m ·
a participant list of 200 · two participants with the same
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
**Discharged by I-0 — and it has re-accumulated, which is why the obligation is now standing rather than
one-off.** The 2a manager gate ran the whole headless board (78 files) and found rot I-0 had cleared:
`qa/r11-recheck.mjs:207` aborts on A-19's throw, silently losing 9 of its 21 assertions including R10-2's
end-to-end store coverage. **The rule this makes explicit: the breaker runs the WHOLE board at each step
boundary, not only the probes in the round's scope, and records its state.** Eight consecutive scoped
rounds is how a probe stayed broken for seven commits with no status note mentioning it.

### The 2a gate's own carried items, placed (added 2026-08-28)

`REVIEW.md`'s 2a SHIP verdict routed seven items, none blocking. Where each belongs, with its trigger:

| Item | Agent | Where | Trigger |
|---|---|---|---|
| **A-1** — §8.1's provenance table claims `{source:'user', confidence:'asserted'}` for memory-entered travel; `model/provenance.ts:18` hardcodes `'confirmed'` and nothing produces `'asserted'`. Plus: whether a day-city the past-trip form assigned (not the user) may stand as evidence in `travelStats` | **architect** | §8.1 + §8.4 | **Before I-6.** I-6's summary widening consumes exactly this data — the same dependency ROADMAP already states for A-10/A-14 |
| **A-2** — **P2-8**: deleting `ownerId` from a foreign export turns `ForeignDocumentError` into adoption; 91 stops stay authored by the other user with 0 ownership issues reported. `packages/client/src/store/store.ts:1027-1028` | **architect** | §2.14 rule 1 / KD-40 | **Before any share, friend or public-share-link work**, and before 2b touches `importDoc`. This carries I-4a's block forward; 2a's SHIP does **not** lift it |
| **BLD-1** — **P2-5**: the past-trip form's per-day `setDayMeta` loop makes one press N+2 undo entries, so a year-length trip can never be undone past its own recording (measured: 400 undos, 315/365 days still assigned). `apps/web/src/views/PastTripForm.tsx:107-143` | **builder** | I-4's own file | **2b's first builder pass.** Repros already exist: `qa/p2b-past.mjs` §2f, `qa/p2b-gate.mjs` §3.4 |
| **B-1** — `qa/r11-recheck.mjs:207` crashes; §2.3's `withCopy({kind:'pool'})` passes no `cityKey` and A-19 correctly refuses it | **breaker** | `qa/` | **Before 2b's first breaker round**, with the whole-board re-run above |
| **B-2** — `qa/r21-closure.mjs:407-409` hardcodes *"NOT enumerated in Part 5"* for three paths `67f5588` enumerated | **breaker** | `qa/` | same |
| **B-3** — `qa/p2b-gate.mjs` §2.1's `datePrecision` ceiling does not honour `datePrecision.test.ts`'s single pinned exemption | **breaker** | `qa/` | same |
| **B-4** — `QA-FINDINGS.md`'s status note lists **R13-4** and **R13-5** as still open; both are closed in code and `qa/r13-gate-citykey.mjs` §7/§8 are green | **breaker** | `QA-FINDINGS.md` | same |

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
