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

**Revision 23, 2026-08-28 — the first of these that is not about the country index.** QA round 26 attacked
**I-6** and found the write path sound: no summary computed from the wrong document, no fence moved to the
wrong trip, across six concurrency shapes and forty rows. What it found is one MAJOR and five MINORs in the
*bookkeeping* around the write, four of them the same bug — a fact about the last pass outliving the thing
it was a fact about — and two design defects routed to the architect. `ARCHITECTURE.md` revision 23 answers
those two as **§8.4 A-29** and **§4.3 A-30**. This file changes in four ways.

(1) **One new increment, I-6a**, builds both rulings *and* round 26's four builder-routed findings as one
pass, because A-30 rewrites the exact lines R26-1…R26-4 are filed against and doing them apart means
touching `runRescan` twice. (2) **I-6's record** says what it shipped and what round 26 found in it.
(3) **Exit criterion 7 gains its missing half**: it asserts that a stale row is brought current and never
asserted what that *may not cost*, which is why a rescan that moved another tab's write fence passed it.
(4) **I-7's dependency** on I-6 becomes a dependency on **I-6a**, because `travelStats` consumes summary
rows and A-29 changes what a row says.

**No phase re-scoped, no change to the order, and no new external dependency.** Two things worth reading
before building: **A-30 subsumes R26-4** — with the rescan's `attemptSave` branch gone there is no stale
fence for a conflicted trip to be refused by, so R26-4's proposed one-line skip is *not* implemented and its
repro becomes A-30's own criterion — and **A-30 Part 4 measures and refuses the remedy R26-6 names**
(*skip the write when the row is unchanged*), because a row the rescan selects is by construction changed in
the one field the rescan exists to change.

**Revision 24, 2026-08-28 — not a QA round.** This is the architect pass that specifies **I-7**
(`travelStats`) down to a signature and an algorithm, and it found that **two of the six fields
`ARCHITECTURE.md` §8.4 clause 2 has promised since revision 9 cannot be computed from the summary row
clause 3 defines.** The row carries `countryCodes` and `cities[]` and nothing about the *records* those
codes came from — no place census, no coordinate-bearing stop count — so a trip with fifty unattributable
stops and a trip with nothing in it are the same value, `countryCodes: []`. I-7's own verification line
forbids exactly that (*"must produce 'no places yet', never '0 countries'"*), which makes it a criterion my
design had already made unsatisfiable. **How a criterion is written**, rule 5, and the defect is mine.
`ARCHITECTURE.md` revision 24 answers it as **§8.4 A-31**. This file changes in four ways.

(1) **I-7 grows a row widening and a `SUMMARY_VERSION` bump** — `attribution: {places: {located,
attributed}, stops: {located, attributed}}`, `SUMMARY_VERSION = 4` — and its Built / Verification /
Ship-gate lines are rewritten around them. **No new increment**: the widening is forced by `travelStats`,
consumed by nothing else, and shipping it separately would mean a rescan for a field with no reader
followed immediately by a second increment. (2) **Exit criterion 6 is rewritten.** As written it greps for
*"a persisted field whose name is a count of countries, cities, trips or days; expect zero"* — and
`cityCount` and `dayCount` have been on `TripSummaryRow` since Phase 1, so the criterion has been passing
only because nobody ran it as written. A-31 Part 6 restates the principle it was reaching for and gives the
two-part check that replaces it. (3) **I-7's dependency list gains its consequences**: it now touches
`derive/summary.ts`, so it inherits I-6a's non-regression obligations. (4) **The 2a routing item A-1's
`travelStats` half is closed** where it is placed, because A-31 settles what evidence `travelStats` reads
and the answer makes the question moot.

**No phase re-scoped, no change to the order, no new external dependency and no client change** — the
rescan already selects on `row.summaryVersion < core.SUMMARY_VERSION` and does not care what the constant
is. Two things worth reading before building: **A-31 Part 3** (a `planned` trip contributes no country, no
city and no day, and an `active` trip's contribution is clamped at `today`) and **A-31 Part 7's last
paragraph** — `fixtures/golden/countries.json` already holds the same four numbers, computed by a different
program, and that cross-check is worth more than the new golden.

**Revision 25, 2026-08-28.** QA round 28 — the mandatory breaker pass over I-7 — returned **SEND BACK**
with 1 BLOCKER, 1 MAJOR and 7 MINOR. `travelStats` itself held at every boundary the breaker could
construct; what did not hold is **the calendar underneath it** and **the ship gate that is supposed to
police it**. `ARCHITECTURE.md` revision 25 answers the three design findings as §2.1 **A-32**, §8.4
**A-33** and §8.4 **A-34**. This file changes in five ways.

(1) **A new increment, `I-7a`**, carrying the three rulings and round 28's four builder findings. Same
shape and same reason as I-5a, I-5b, I-5c and I-6a: the increment shipped, the adversarial pass found the
design under it wrong, and the fix is a named increment rather than a patch inside the next one. **I-8 is
blocked on it** — I-8 renders `travelStats` on screen, and both A-32 (dates that round-trip) and A-34
(`provisional`) are things a surface would otherwise ship wrong.

(2) **Exit criterion 6 is rewritten again**, and this time against a measurement rather than an argument.
Its revision-24 form could not catch its own bug: the breaker wrote `countriesVisited` and `daysTravelled`
into every IndexedDB summary record and the criterion, the 795-test suite and `tsc` were all green. §8.4
**A-33** replaces it with six parts: the row's whole key set, **the rows a real port actually holds after a
real write**, the argument every port hands its summary store, a port census, the import assertion, and
the old grep demoted to a secondary tripwire.

(3) **Criterion E's export count moves 73 → 75**, which is a correction and not a change: `Object.keys(core).length`
is **75**, counted, and `ARCHITECTURE.md` §2.10's list has been at 75 and complete since revision 24.
`SUMMARY_VERSION` joined at I-6 and `travelStats` at I-7; criterion E was never updated in either commit,
which the rule four lines above the increment sequence makes mandatory. Recorded as BUILD-NOTES **KD-65**
and escalated by round 28 because the same drift is now in a **contract** document (QA **R28-8**).

(4) **I-8 gains a requirement** (QA **R28-7**): a country or city contributed only by an un-clamped active
trip is **visually distinguished** from one actually reached. Today `cli.ts stats` prints a country the
traveller reaches next week as a visited fact with dates; I-8 is where that would become the product's
headline claim. §8.4 **A-34** gives it a field to render rather than a judgement to make.

(5) **I-7's ship gate is recorded as not met**, with the four findings it is now waiting on, so a reader
does not take the increment's own Ship-gate line as a verdict.

**No phase re-scoped, no change to the order, no new external dependency, no `SUMMARY_VERSION` bump and no
movement on the export surface.**

**Revision 26, 2026-08-28.** QA round 29 — the mandatory breaker pass over I-7a — returned **SEND BACK**
with 0 BLOCKERS, 2 MAJOR and 5 MINOR. **A-32 held** against three oracles that are not `Date` and 4.5M
evaluations; **A-34 held** at every lifecycle boundary; **A-33 did not** — a one-line variant of the fault
it was written for still lands two lifetime counts in real IndexedDB with the criterion at 14/0, the suite
at 835/0 and `tsc` clean. `ARCHITECTURE.md` revision 26 answers the four design findings as §2.3 **A-35**
(R29-2), §8.4 **A-36** (R29-1) and §8.4 **A-37** (R29-6, R29-7). This file changes in four ways.

(1) **A new increment, `I-7b`**, carrying the three rulings and round 29's three builder findings
(**R29-3**, **R29-4**, **R29-5**). Same shape and same reason as I-5a/b/c, I-6a and I-7a. **I-8 is blocked
on it** as it was on I-7a.

(2) **Exit criterion 6's port half is rewritten** — parts **b′** and **b″** below. b′ stops being *"the
memory port"* and becomes **every implementation the census names, executed**: the web port has no runtime
imports and reads `indexedDB` off the global, so it runs on bare Node against a recording double, and
*that* is the check with teeth. b″ (the static grep) is demoted to a tripwire and loses the parameter
assertion whose failure message claimed coverage it does not have. The Chromium read-back is **named as a
required, recorded ship-gate condition** for any increment touching the web port — and stays out of `npm
run test:tap` permanently, because the gate must run on bare Node.

(3) **I-7b gains a criterion nothing in Phase 2 had**: a bound on the day skeleton. `0202-01-01 →
2020-12-31` — one mistyped digit in the past-trip form's *exact* branch — mints 664,377 `Day` records and
266.7 MB, and `validateTrip` reports nothing. §2.3 **A-35** caps it in `ensureDays`, in core, so every
caller inherits it.

(4) **I-7a's ship gate is recorded as not met**, with the findings it is waiting on, so a reader does not
take the increment's own Ship-gate line as a verdict.

**No phase re-scoped, no change to the order, no new external dependency, no `SUMMARY_VERSION` bump and no
movement on the export surface (still 75) — `MAX_TRIP_SPAN_DAYS` and both of A-37's read gates are
module-private.**

**Revision 27, 2026-08-31 — not a QA round.** An architect pass over the I-8 front end, after I-7 shipped.
Two things change, and neither re-scopes the phase.

(1) **`ARCHITECTURE.md` §4.4 gains A-40**, which answers the question I-8 could not be built without: the
lifetime map is **not a second `MapPort`**. It is a pure `worldMapFrame` in `packages/client` plus a plain
`WorldMap.tsx` that contains no coordinate arithmetic; the extent is core's own `mapBounds`/`MIN_SPAN_KM`
(so *"same core functions, no second implementation"* is honoured exactly where it was meant to be); the
Leaflet trip map and `MapPort` are untouched, with no shared interface forced between them; and the
*fit-while-hidden* bug is made structurally absent by an SVG `viewBox` rather than re-solved by a second
`pendingFit` — the binding clause is that the world map may read **no layout geometry at all**. A-40 also
rules out one thing I-8's own text promised: **city pins**. `TripSummaryRow.cities[]` carries no coordinate,
the lifetime surface may not open every document (§4.2), and adding a centre to the row is a
`SUMMARY_VERSION` bump and a separate ruling. Filled countries ship; the pin half is deferred in writing.

(2) **I-8 is split into I-8a and I-8b**, in the same shape and for the same reason as I-5a/b/c, I-6a and
I-7a/b: one increment a builder can finish and a breaker can attack, then the next. **I-8a** is the
three-tab shell, `WorldMap.tsx`, and the token layer that the visual language has been living without;
**I-8b** is `Profile.tsx`. I-8's spec below is **not rewritten** — it stays as the shared specification both
increments are measured against, and the two increments say which half of it each carries. **2b now ships at
the end of I-8b, not at the end of I-8a.**

No phase re-scoped, no change to the order, **no new external dependency**, no `SUMMARY_VERSION` bump, no
`StoragePort` change, no engine change and no movement on the export surface (still 75) — `worldMapFrame`
is a `packages/client` selector.

**Revision 28, 2026-08-31 — not a QA round.** The I-8a gate returned **SHIP** and routed five items to the
architect, four of them gating I-8b (`REVIEW.md` § I-8a). Jacob decided the one question that was his — the
lifetime map frames itself **atlas-style** — and `ARCHITECTURE.md` revision 30 rules the rest as **A-41**,
**A-42**, **A-44** and **A-45**. Three things change here, and the phase is not re-scoped.

(1) **Two increments are inserted, and both run before I-8b.** **I-8c** carries the two data-integrity
gates — A-45 (`fromJSON` accepts `"2026-02-30"`, which is a **shipped write path** that mis-classifies a
past trip as `planned` and drops all of its countries and days out of the map I-8a just built) and A-44
(`lifecycle`'s read gate, R33-3's design half) — plus BLD-3's recovery half, because it is the same screen.
**I-8d** carries A-41 and A-42, the atlas frame. They are separate increments because they share no file,
have different oracles, and I-8c is small enough to ship on its own the day it is written.

(2) **I-8a's second verification criterion is rewritten**, which is mine under sequencing rule 5: it named
`AT` as the one-country clamp case and **`VA` is the only code among the shipped 239 that clamps**
(re-derived across all 239 in round 33 and re-verified twice; `AT` is 630.97 km and never clamps), so the
criterion was **unsatisfiable as written and its injected fault was green**. The builder's `AT`→`VA`
substitution in the test was sound and reporting it rather than editing the criterion was correct. The new
criterion asserts containment-with-margin, which has a rendered consequence; it is discharged by **I-8d**,
not by I-8a as shipped, and it says so.

(3) **I-8b's dependency line gains I-8c and I-8d.** *"2b does not ship until the map is a map of the right
subject and the numbers on it are true."*

No phase re-scoped, no change to the order, **no new external dependency**, no `SUMMARY_VERSION` bump, no
`schemaVersion` bump, no `StoragePort` change, no `MapPort` change and no engine change. The export surface
moves **75 → 76** in I-8d, for `clusterPoints` and nothing else (§2.10, §4.4 A-41 Part 6).

**Revision 29, 2026-08-31.** QA round 34 — the breaker pass over I-8c — could not break A-45 or A-44 and
returned **SEND BACK** on two things, one of which is mine. `ARCHITECTURE.md` revision 31 rules it as
**A-46** (§2.9, under A-45). Three changes here, and the phase is not re-scoped.

(1) **I-8c's third verification criterion is rewritten as 3a and 3b**, which is mine under sequencing rule
5. Its Map half was **unmeetable as literally written** — round 34 swept the 7 × 6 grid of date-fault
shapes and found **no** input where `travelStats` succeeds while `rowLifecycle` returns `null`, because
`travelStats` calls `dayNumber` in its sort comparator and `lifecycle` on every row, so the two refusals
are one refusal and the drill-down the criterion describes can never be reached by that input. No builder
could ever have discharged it and no injected fault could ever have made it red. **3a** is the Trips-list
half, unchanged in substance and now checkable on its own; **3b** says what the Map actually does with that
input (refuses the whole aggregate, in words, drawing zero countries) and drives the arm that *names* a row
with the fault that actually reaches it — a duplicate summary id (A-31 Part 4).

(2) **One increment is inserted: `I-8e`**, carrying A-46. It runs **after I-8d** — only because both widen
§2.10 and ordering them keeps the count arithmetic honest (75 → 76 → **77**) — and **before I-8b**. It is
what closes R34-2: today a stored document with a calendar-invalid date renders as a **healthy trip card**
whose only affordance is Delete, because `summaryScan`'s `unreadable` list is fed solely by the
`SUMMARY_VERSION` rescan and never visits a current row.

(3) **I-8b's dependency line gains I-8e**, for the reason round 34 gave: I-8b puts a second surface on the
same rows, and a document that is silently unopenable **and** unexportable is a worse story once the
Profile is claiming to summarise a user's whole travel life.

I-8c's own remaining items — **R34-1** (BLD-3's *"Close this trip"* does not recover; an ordering bug in
four lines this increment wrote) and round 34's MINORs — are builder work against the increment as
written and do **not** wait for I-8e. No phase re-scoped, no change to the order, **no new external
dependency**, no `SUMMARY_VERSION` bump, no `schemaVersion` bump, no `StoragePort`/`FilePort`/`MapPort`
change and no engine change. The export surface moves **76 → 77** in I-8e, for `isIsoDate` and nothing
else (§2.10, §2.9 A-46 Part 2).

**Revision 32, 2026-08-31.** QA round 35 — the breaker pass over I-8e — found **0 blockers** and could not
break anything the increment was contracted to build, but it measured **A-46's own Part 7 residue 1 as
false**, and false for the *majority* of what A-45 refuses rather than for an edge case. That is mine under
sequencing rule 5, twice over: the residue and A-46 Part 4 clause 5 contradicted each other, and I-8e's own
criterion 4 blessed the wrong outcome in writing. `ARCHITECTURE.md` revision 32 rules it as **A-47** (§2.9,
under A-46). Four changes here, and the phase is not re-scoped.

(1) **I-8e's user-visible outcome line and its fourth verification criterion are corrected in place**, and
marked as corrected. Criterion 4 asserted that a document whose *row* is fine but whose `days[3].date` is
not *"still opens to a refusal, with the card unflagged: that is the stated incompleteness … not a bug"*.
It is a bug — that population is **8:1 larger** than the one I-8e flags, and it left a card that looks
healthy, warns nothing before Delete, and offers no rescue even *after* the refusal is on screen.

(2) **One increment is inserted: `I-8f`**, carrying A-47. It runs **after I-8e** and **before I-8b**.
*(If the manager's verdict on I-8e is SEND BACK rather than SHIP, this is that send-back's scope and it
lands as part of I-8e; the content below is identical either way and nothing in it depends on which.)*

(3) **I-8b's dependency line gains I-8f**, for the reason it already names for I-8e, one degree stronger: a
trip that is silently unopenable **and** unrescuable is the worse story once the Profile is also summarising
it, and I-8f is what makes it not silent.

(4) **Two of round 35's four MINORs are ruled and ride I-8f** — `cli.ts --today` refusing a
calendar-invalid date (R35-4, A-47 Part 6) and `exportStoredDoc`'s active-trip precondition (R35-5, A-47
Part 5). The other two, **R35-2** (the hint's 2.63:1 contrast) and **R35-3** (one bad row inflating every
card from 95.3 px to 446.0 px), are **builder** findings against I-8e as written and do not wait for I-8f.

No phase re-scoped, no change to the order, **no new external dependency**, no `SUMMARY_VERSION` bump, no
`schemaVersion` bump, no `StoragePort`/`FilePort`/`MapPort` change and no engine change. **The export
surface does not move: 77 stays 77**, and `packages/core` has **zero** diff lines in I-8f.

**Revision 33, 2026-08-31.** QA round 36 — the **first** adversarial pass over I-8d — found **0 blockers**,
confirmed **R33-1 genuinely fixed**, and confirmed that every clause of A-41 and A-42 is implemented exactly
as written. It then returned **SEND BACK to the architect**, because the two MAJORs are defects in the
*ruling*: A-41 **C2**'s key point lands in the ocean for a country with a distant overseas territory (`FR`,
2,633 km out, which makes France cluster with Morocco rather than Czechia and renders a 64.1°-wide main pane
for one country), and A-41 **C3**'s first-fit partition makes the main/inset split depend on the **row
order**, which A-41 constraint 2 forbids. `ARCHITECTURE.md` revision 33 rules both as **A-48** (§4.4, under
A-42). Four changes here, and the phase is not re-scoped.

(1) **One increment is inserted: `I-8g`**, carrying A-48. It runs **after I-8f** and **before I-8b**. It is
the smallest increment that can carry the ruling: three clauses of one selector, one new core function, one
changed core kernel, one CSS rule and one token.

(2) **I-8d's verification block gains a correction note rather than being rewritten.** Everything it
asserted is true of the build and was independently re-derived by round 36 — including the reference panes
and the 30.2827° × 16.1550° main span, which **A-48 must not move**. What changed is the design underneath
two of its criteria, and I-8g re-asserts both with the corrected rule plus the new invariants.

(3) **I-8b's dependency line gains I-8g**, for the reason round 36 gave: I-8b puts a second surface on the
same `travelStats`, and R36-1/R36-2 decide *which countries the product calls "shown separately"* — a claim
the Profile inherits.

(4) **Three of round 36's five MINORs are ruled into A-48 and ride I-8g** — C4's false margin claim (R36-3,
a documentation correction, no code), `weight`'s under-disclosure (R36-4, no code), and the paint order that
stops an enclave being unreachable (R36-7, A-48 C9). **R36-6** (dark-mode map fill at 2.87:1) and the build
half of **R36-5** (the main pane painting 42.6% of its box) are **builder** work and ride I-8g because a
builder is already in those two files; neither waits on anything else.

No phase re-scoped, no change to the order, **no new external dependency**, no `SUMMARY_VERSION` bump, no
`schemaVersion` bump, no `StoragePort`/`FilePort`/`MapPort` change, **no stored byte of any trip**, and no
change to what is drawn once framed. The export surface moves **77 → 78** in I-8g, for `countryKeyPoint`
and nothing else.

**Revision 34, 2026-09-01.** QA round 37 — the adversarial pass over I-8g — found **0 blockers**, confirmed
R36-1's clustering half and R36-2 closed, and confirmed **every clause of A-48 implemented exactly as
written**. It then broke A-48 in the clause A-48 did not touch: C2′ moved the *key point* onto the country
and **C8 still fitted the extent over every entry box**, so the France-and-Greece library named in I-8g's own
ship gate renders one pane at **81.1° × 49.1°** and **1.95% land**, with Greece at **783 px²**.
`ARCHITECTURE.md` revision 34 rules it as **A-49**, with **A-50** beside it for R37-4. Four changes here, and
the phase is not re-scoped.

(1) **One increment is inserted: `I-8h`**, carrying A-49 and A-50. It runs **after I-8g** and, unlike I-8g,
**does not gate I-8b** — round 37 established that R37-1 is about how wide a pane is, not which countries are
in it, and I-8b inherits the second. It must land before the Phase 2 exit gate.

(2) **I-8g's block gains a correction note rather than being rewritten.** Everything it asserts is true of
the build and was re-derived by round 37 to the digit; what moved is the design under two of its criteria
(the reference frame's US inset, and *"the main pane fills its box"*), and I-8h re-asserts both under the
corrected rules.

(3) **The last sentence of I-8g's ship gate is what failed.** *"The two-France-and-one-Greece library, driven
through the real app and looked at, is a map of Europe rather than of the Atlantic"* was written as
plain English and measured false while every mechanical criterion around it passed. I-8h's version of it is
**measured, not looked at**: a stated land-fraction floor, a stated extent, and a stated area for the second
country.

(4) **Two of round 37's four MINORs ride I-8h as architect rulings** — R37-3 (the chip list, A-49 Part 5) and
R37-4 (the pane box, A-50). **R37-2** (three false sentences in `worldMap.ts`'s own comments) and **R37-5**
(`countryKeyPoint`'s union-box fallback returning `NaN` on a zero-ring fixture code) are **builder** findings
against I-8g, routed separately; neither is carried by A-49, neither blocks I-8h, and R37-5's guard is what
A-49's *"a code with no parts goes to `missing`"* clause assumes has landed.

No phase re-scoped, no change to the order, **no new external dependency**, no `SUMMARY_VERSION` bump, no
`schemaVersion` bump, no `StoragePort`/`FilePort`/`MapPort` change, **no stored byte of any trip**, and no
change to what is drawn once framed. The export surface moves **78 → 79** in I-8h, for `countryParts` and
nothing else.

**Revision 35, 2026-09-01.** QA round 38 — the adversarial pass over I-8h — found **0 blockers** and could
not dent the build: an independently written second `worldMapFrame` reproduced the shipped one **string for
string on 11 libraries**, I1…I15 held over **643** libraries, and the Alaska rule survived an index with
every ISO code permuted. It then filed **R38-2 (MAJOR)**: A-49 fixed every pane **C5 decides to split**, and
on the **80.0% (22,765 / 28,441)** of two-country / one-trip-each libraries where C5 declines, the original
*"map of the wrong subject"* is **untouched** — `FR`+`US` frames **France at 899 px²**, `FR`+`NZ` is
**0.48% land**. **Jacob called a stop to the pattern** — four rounds of *"add one more condition to A-41"* —
and instructed the architect to reconsider the framing abstraction itself from first principles. Three
changes here, and **the phase is not re-scoped**.

(1) **One increment is inserted: `I-8i`**, carrying `ARCHITECTURE.md` §4.4 **A-51** and **A-52**. A-51
withdraws the split test (C5), the pane cap and the union-of-the-rest pane (C7/C7′), the detached pane
(C8″) and the `main`/`inset`/`detached` hierarchy, and makes the frame **one pane per connected component
of country parts** — equally weighted, laid out as a grid, **ordered** by weight rather than framed by it.
It **supersedes I-8h's design in three of its criteria and re-pins the rest**; it also carries **R38-3** and
**R38-4** as structural consequences rather than as separate fixes. A-52 is R38-5.

(2) **`I-8i` IS NOT DISPATCHABLE YET.** Jacob asked to approve the framing model **before** a builder pass,
because A-51 overturns the *mechanism* half of his own 2026-08-30 direction (*"preserving meaningful
outliers visibly through an inset"*) while keeping its purpose clause. **No builder session may be opened
against I-8i until he has ruled.** If he declines, A-41…A-50 stand and R38-2 stays open as a disclosed
defect with its numbers on the record.

(3) **I-8h's block gains a correction note rather than being rewritten.** Everything it asserts is true of
the build and round 38 re-derived every number in it to the digit; what moves is the design under three of
its criteria (the pane count, the detached pane, and A-50's box criterion), and I-8i re-asserts all three
under the corrected rules. **I-8h is not re-opened and is not un-shipped.**

**R38-1** is a **builder** finding against I-8h's own test (`countryParts.test.ts:228` samples five
thresholds and asserts a property of the whole index; the two rankings differ at seven (code, threshold)
pairs, sharpest `ID`@900 km) and rides I-8i as a one-line fix, not as an architect ruling.

No phase re-scoped, no change to the order, **no new external dependency**, no `SUMMARY_VERSION` bump, no
`schemaVersion` bump, no `StoragePort`/`FilePort`/`MapPort` change, **no stored byte of any trip**, and no
change to what is drawn once framed. **The export surface does not move: it stays at 79.**

**Revision 36, 2026-09-01.** Jacob put **one bounded question** to A-51 before approving it — whether
*"one pane per connected component of country geometry"* promotes territories into equal-weight travel
subjects, with `FR`+`US` → 4 panes as the concrete case. One ruling, `ARCHITECTURE.md` §4.4 **A-53**, and
**A-51 and A-52 stand as written; nothing is superseded.** The finding: `worldMapFrame`'s entire input
(`TravelStats` + `CountryIndex`) **carries no coordinate at all**, so an ISO code is the finest geographic
fact the lifetime map can hold, every component of a visited country is exactly as attributed as every
other, and A-51 **already** refuses to promote them — Guiana and Alaska come back `home: []`, `weight: 0`,
captioned *"distant parts of"* and ordered **last**. A-53 names that distinction (**home pane / extent
pane**, derived from `home.length`, no new field), adds **I18** (home panes strictly precede extent panes —
without it an `FR`-only library opens on French Guiana, which is the raw component order), and bounds the
worry: at 4,000 km only `FR`, `UM` and `US` have more than one part, so **at most 3 extent panes can exist
in any library, ever**, and the **14-pane worst case contains zero**. Prior art (`d3-geo`, Turf) was
investigated against real source and **rejected on semantics before the zero-dependency rule is reached**;
**no dependency is added** and none is requested.

**The consequence for `I-8i` is two verification criteria and one docstring sentence. No executable line of
its "Built" bullet moves, and its scope does not grow.** The 🛑 gate is **lifted in substance**: the
remaining condition is Jacob's approval of A-51 itself, and **no further architect round is owed**.

**Revision 37, 2026-09-01.** The **I-8i gate shipped** (`REVIEW.md`, SHIP, `10455b9`) and routed **ten
items, three of which gate I-8b**. Two are architect items and are ruled as `ARCHITECTURE.md` §4.4
**A-54**; the third (**MGR-2**, I-8f was never built) is a builder pass and is **not** in scope here. This
file changes in three ways and **re-scopes nothing**: a new increment **I-8j** below I-8i, one corrected
criterion **inside I-8i** (R39-4 — its census counts panes where it says libraries and is unsatisfiable as
written), and **I-8j added to I-8b's blockers** beside I-8f.

**What A-54 rules, in one paragraph.** **(1) MGR-1** — A-51 G7's grid leaves up to **66.7 %** of the map
card as bare separator ink (a one-pane library gets one of three columns at ≥ 960 px; 45.6 % on `FR`+`US`,
29.0 % on the Europe 2026 fixture, **0 %** before I-8i) and **overflows and clips** at 320 px.
`.worldmap__panes` becomes a **wrapping flex line box whose cells fill their line**, which makes
`Σ cell area = container area − gaps` *structurally*: measured **0.0–0.5 % empty, 0 % overflow** over 8
libraries × 12 widths, with no map anywhere smaller and several larger. **(2) R39-1/R39-2** — a written
predicate replaces the unwritten precondition A-52 left in a build tool, so an index carrying a malformed
ring produces a **stated** `missing` entry instead of a silently blank map. **(3) R39-5** — the pane
tie-break stops being the alphabet one indirection out and becomes the pane's own rectangle, read north to
south then west to east. **A-51's geometry does not move**: pane membership, count, `viewBox` and `aspect`
are byte-identical on every library, the Europe 2026 fixture is unchanged end to end, and the export
surface, dependencies and stored data are all untouched.

**Revision 38, 2026-09-01.** A bounded **design-foundation** pass at Jacob's instruction, opened after the
I-8f/I-8j gate permitted I-8b. It **adds no increment, cuts none, reorders none, and does not touch Phase 2's
scope or its exit criteria.** One increment is rewritten — **I-8b** — and only in its *Built* and
*Verification* bullets, which now name a spec instead of implying one. The spec is
**`cairn/docs/DESIGN.md`**, a new contract-grade document that `ARCHITECTURE.md` **§9** makes binding, and
which exists because Cairn's visual direction previously lived only in `styles.css` comments, one bullet of
I-8a below, and an explicitly advisory checklist — i.e. it did not survive a fresh session. It carries the
nine visual principles, the shipped I-8a baseline, the **mobile-first responsive contract**, the **I-8b
Profile design target** (§5) and the **rendered acceptance standard** (§6). `ARCHITECTURE.md` **A-55** rules
the frontend tooling stack alongside it: **no new runtime dependency in `apps/web`**, no build-tool change,
two vendored agent skills, and the zero-dep rule confirmed as `packages/core`/`packages/client` only.
**Nothing in the settled map arc (A-40 → A-54) is reopened** — §9.2 fences it explicitly, and I-8b's
`WorldMap.tsx` diff stays at zero lines for a fourth increment.

**Revision 39, 2026-09-02.** One finding, one ruling, nothing else: QA round 41's **R41-14**, the genuine
contradiction between `DESIGN.md` §5.5 (*"the same component and the same words"* as the world map's
refusal) and §5.6 (`WorldMap.tsx` is a zero-line diff). **§5.6 wins and is not narrowed** — its worth is
that it needs no judgement to check, and the exception on offer was a text-only extraction that would have
to be re-argued next time. §5.5 keeps its *words* and yields its *mechanism*: the shared component ships on
the Profile, the map keeps its copy, and the two are held equal by a **rendered** equivalence assertion over
both refusal branches instead of the three-sentence source allow-list that shipped at `c08c70f` and that
round 41 mutation-tested green against an added sentence and an inverted branch (**R41-13**). **No increment
is added, cut or reordered; Phase 2's scope and exit criteria are untouched; nothing in A-40 → A-54 is
reopened.** Only I-8b's *Verification* bullet moves here; the ruling itself lives in `DESIGN.md` §5.3, §5.5,
§5.6, §6.2 and §7, with `ARCHITECTURE.md` §9.2 fence 1 recording why the fence held.

**Revision 40, 2026-09-03.** **A fourth step in Phase 2 — `2d`, the memory data layer — and one narrowing
of Phase 6.** Opened while the visual direction is paused (Jacob rejected I-8b's aesthetic on 2026-09-02 and
has not yet selected a replacement), on the principle that the work which does not depend on that decision
should not wait for it. Two capabilities, `ARCHITECTURE.md` revision 40:

- **I-12 — city-level history**, `ARCHITECTURE.md` §8.4 **A-56**. A completed trip's `TripSummaryRow` keeps
  its cities' **names** (it has since A-10) and throws away their **coordinates** and their **dates**, so
  nothing can say *where in a country* or *when* without opening the document. The city entry gains
  `centre`, `firstDay` and `lastDay`; `SUMMARY_VERSION` goes to **5**, which is itself the rescan trigger
  for every already-summarised trip; A-33's `ROW_PATHS` allow-list is widened; **stop-level geometry is
  refused**, with the reason and the trigger written down; and A-31 Part 5 residue 1 closes **for cities**.
- **I-13 — the photo foundation**, `ARCHITECTURE.md` **§10** (**A-57**, **A-58**). Cairn has no photo
  capability of any kind. I-13 builds the record class, the multi-file import over the existing
  Safari-compatible `FilePort` shape, two object stores for bytes, a hand-rolled EXIF reader in
  `packages/core`, the two-derivative resolution discipline, and the selectors an eventual UI needs for
  honest loading, empty and error states. **No new dependency, anywhere** — A-58, decided on merits and not
  on the zero-dep rule, which A-55 Part 0 already established does not reach `apps/web`.

**Neither increment opens a `.tsx` file, and that is a fence rather than an accident**: no surface is
scheduled until Jacob has selected a visual direction, so building one now would be building against a
direction he rejected. `git diff --stat` decides it, the same way §9.2 fence 1 is decided.

**Phase 6 is narrowed, not gutted**: library enumeration, `suggestPhotoStops`, the suggestion queue, the
Android `ACCESS_MEDIA_LOCATION` fault criterion and the Play Store access review all stay exactly where they
are. What moves earlier is the record class those things suggest **into** — the same shape as
`copyStopInto` shipping in Phase 1 with no friend to exercise it.

**I-12 and I-13 are numbered above the gate and sequenced below it.** Sequencing rule 7 forbids renumbering
forty cross-references for a tidy sequence, so the numbers are labels: the order is
I-0 … I-10, **I-12, I-12a, I-13, I-13a, I-13b, I-13c, I-13d, I-13e, I-13g, I-13h, I-13i**, then **I-11, the gate**, which now depends on all of them. (**I-13f** is a queued `.tsx` follow-up, not a scheduled increment — revision 49. **`I-10` is deferred at revision 55, by Jacob's decision** — it is the one screen left in this phase, the `.tsx` fence bars it, and the gate does not wait for it; the order above is otherwise unchanged and I-10 keeps its place in it for whenever its trigger fires. **`I-9a` is added at revision 56** — the builder follow-up carrying `ARCHITECTURE.md` A-72 and A-73 — and sits directly after **I-9**; it does **not** block **I-11**, but it should land before the gate rather than after it.)

*(**I-12a** is revision 41, from QA round 43's breaker pass over I-12 — `ARCHITECTURE.md` §8.4 **A-59** and
**A-60**. Two narrow gaps in what `travelStats` does with the fields I-12 added: an unreadable stored city
date throws anonymously and takes the whole library's statistics down, and a city range the clock has
clamped entirely away prints a specific day the traveller was not there. It reopens nothing in A-56 and
opens no view. **Orderable before or after I-13**; it is placed after I-12 because it only exists because of
it.)*

**Revision 41, 2026-09-03.** **One increment added, nothing re-scoped: `I-12a`.** QA round 43 shipped I-12
(SHIP, 0 blockers, 6 MINOR) and routed three of the six to me. Two are design gaps in what `travelStats`
does with the fields I-12 added, and they are ruled as `ARCHITECTURE.md` §8.4 **A-59** (an unreadable stored
city date throws anonymously and takes the whole library's statistics down, with no selector in the
A-44/A-46/A-47 lineage able to name the row) and **A-60** (a city range the clock has clamped entirely away
prints as a specific day the traveller was not there — strictly more assertive than the country line beside
it). The third was documentation-only and is corrected in place inside A-56 with no fixture, test, field or
clause moving. **Phase 2's scope, boundaries and gates are exactly as revision 40 left them**; I-12a opens
no view, bumps no version and adds no runtime symbol.

**Revision 42, 2026-09-04.** **No increment added, no increment re-scoped, one clause folded into `I-12a`.**
QA round 44's breaker pass over I-12a returned **SEND BACK** (0 blockers, 1 MAJOR, 3 MINOR), so I-12a is
already owed a repair pass. One of the MINORs was architect-routed and is ruled at `ARCHITECTURE.md`
revision 42 as §8.4 **A-60 Part 6** (R44-2): A-60 Part 2's pseudocode and its closing claim contradicted each
other on a half-null city date pair, and **nothing in a 1235-test suite pinned either reading**. Ruled — the
shipped per-field fallback for a `null` edge is **upheld** and the literal pair-wide reading refused, while
A-60's disjointness test is generalised to read the edges the row **supplied** rather than the substitutes
standing in for the missing ones. That lands in I-12a as **Built item 5** plus three verification bullets,
one of which **corrects a criterion this document had wrong** — I-12a's A-60 rendered-output bullet asserted
*"no city line may be narrower than its country's"*, which Split's own genuine single day falsifies, and the
property is restated as escape rather than width.

**Phase 2's scope, boundaries, sequence and gates are untouched.** No increment is added, cut or reordered;
`SUMMARY_VERSION` does not move; no runtime symbol is added; A-39 Part 11 does not fire; no `.tsx` file is
opened. **R44-3 — I-12a's own Ship-gate wording, also architect-routed — is deliberately NOT ruled here**
and stays open: it is a change to how a criterion may be written (sequencing rule 5's own subject) and it
deserves its own pass rather than a footnote in someone else's.

**Revision 43, 2026-09-04.** **One criterion of mine was wrong and is replaced; one increment is added and
it is the smallest in this document.** I-13 shipped (`1820813`) and its builder reported **KD-81**: I-13's
*"20 photos within **4 KB** of the same trip with none"* budgets ~200 bytes per `PhotoAsset`, and
`ARCHITECTURE.md` §10.1's own field list — ruled as **A-57** and implemented faithfully — measures **768
bytes at `toJSON`'s default indent, 439 compact**. The builder implemented the ruled record, refused both
to shrink it and to quietly relax the number, and routed the inconsistency to me. **Ruled as
`ARCHITECTURE.md` §10 A-61** (revision 43): the 4 KB figure ties to no other constraint anywhere in this
repository — not a sync budget, not a quota, not a mobile-data figure — it is §10.1's own *"a few hundred
bytes"* × 20, costed without the `Provenance` block A-57 Part 4 put on the record and as if the
serialization were compact when the persisted document is indent-2. That is **How a criterion is written**
rule 5, and the defect is mine. **The record does not move by one field**; the criterion becomes the two
below, and **I-13a** — a test-and-comment pass over `packages/core/test/photos.test.ts`, no source file, no
assertion value changed — carries what is still owed. Phase 2's scope, boundaries, sequence and gates are
otherwise untouched; no version moves, no runtime symbol is added, no `.tsx` file is opened.

**Revision 44, 2026-09-04.** **One increment added — `I-13b`, the round-45 repair pass — and nothing
re-scoped.** QA round 45 broke I-13 and returned **SEND BACK**: 2 BLOCKERS, 4 MAJOR, 12 MINOR. Three
findings were design defects and all three were mine, ruled at `ARCHITECTURE.md` revision 44 as **A-62**
(R45-2: the photo byte stores were keyed by bare `PhotoId`, so restoring your own backup put two trips over
one key space and deleting the restored copy destroyed the original's photographs — the key becomes
`[tripId, photoId]`, `PhotoPort`'s byte methods take the owning `TripId` and gain `removeTrip`, and
`DB_VERSION` goes 4 → **5**), **A-63** (R45-5: `PhotoListing` could not say *"the availability read
failed"*, which forces the unresolving spinner §10.6 opens by forbidding — `phase` gains `'unreadable'`,
`availability` gains `'unknown'`, the listing gains `message`, and the store gains
`refreshPhotoAvailability()`) and **A-64** (R45-6: A-57 Part 4's claim that the provenance transitions work
on photos is false; the field stays, `RefKind` does **not** gain a `'photo'` arm, and three error messages
stop pointing at functions that throw). A fourth, **R45-18**, is a wording correction to §8.4 A-38 Part 5's
checkable line and needs no code. **`I-13b` carries every code consequence of the three rulings** and the
builder-routed findings that overlap them; the remaining builder-routed findings of round 45 (R45-1 the
other BLOCKER, R45-3, R45-4 and the MINORs) are ordinary repair work against `QA-FINDINGS.md` round 45 and
are listed under I-13b's *Built* so nothing in the round is unowned. **I-13 stays SEND BACK until I-13b
lands.** Phase 2's scope, boundaries and order are otherwise untouched: no phase moves, `SCHEMA_VERSION`
stays 2, `SUMMARY_VERSION` stays 5, no `PhotoAsset` field moves and A-58's no-dependency verdict is
unchanged.

**Revision 45, 2026-09-04.** **One increment added — `I-13c`, the round-46 repair pass — and nothing
re-scoped.** QA round 46, the confirmation pass over the whole I-13 arc, returned **SEND BACK** with 0
BLOCKERS, 3 MAJOR and 4 MINOR, and could not break A-62's compound key on either engine. Exactly one
finding was routed to the architect — **R46-4**, ruled at `ARCHITECTURE.md` revision 45 as a **fourth
residue on A-62 Part 8**: a failed `removeTrip` inside `deleteTrip` strands that trip's byte records with
no document and no report, under a comment that calls them reclaimable when nothing shipped can reclaim
them. **The ruling adds no mechanism.** The trip is still deleted (§4.2 rule 6c's reason); the failure is
not pushed into `orphanPhotoBytes` and the id list A-62 Part 4 removed is not re-introduced to feed it;
the whole class — which also holds R46-1 face 3 and `closeTrip`-mid-decode — is answered by residue 2's
unbuilt sweep, whose trigger is widened in place to name it. So I-13c's architect-owned item is **one
comment correction, explicitly non-blocking**; the increment's weight is round 46's six builder-routed
findings, one of them a regression this arc introduced. **I-13 and I-13b stay SEND BACK until I-13c
lands.** Phase 2's scope, boundaries and order are otherwise untouched: no phase moves, `SCHEMA_VERSION`
stays 2, `SUMMARY_VERSION` stays 5, no `PhotoAsset` field moves, `RefKind` does not move, and A-58's
no-dependency verdict is unchanged.

**Revision 46, 2026-09-04.** **No increment added, no scope moved: `I-13c` gains a third group of two
items and both are non-blocking.** The two design questions the photo arc had left open — one since round
45, one raised by the round-46 fix-pass builder — are ruled at `ARCHITECTURE.md` revision 46 as **A-65**
and **A-66**, and **both refuse to add a mechanism.** A-65 (QA **R45-14**): undo restores a removed
photo's record and not its bytes, the **deferred** byte delete the finding proposed is refused, §10.3's
synchronous cascade row is upheld, and what lands is `removePhoto`'s docstring plus one obligation on the
unbuilt remove affordance. A-66 (BUILD-NOTES **KD-82**, QA **R46-1**): `PhotoImportFailure` is closed at
**exactly five arms**, a batch abandoned because the user left the trip is correctly reported as nothing,
and what lands is one comment pointer. **Neither ruling moves a type, a field, a selector, a port method
or a test value**, and neither gates I-13's confirmation — but **both of the round's two remaining `FAIL`
lines are now measuring rulings that exist**, so the §K probe lines that assert the refused proposal are
re-cut by the **breaker**, not by a builder, exactly as round 46 re-cut six lines of `qa/r45-i13.mjs`
after revision 44. `SCHEMA_VERSION` stays 2, `DB_VERSION` stays 5, `SUMMARY_VERSION` stays 5, `RefKind`
does not move, and A-58's no-dependency verdict is unchanged.

**Revision 47, 2026-09-04.** **One increment added — `I-13d`, and it is the first in this arc that is not
a photo increment.** QA round 47, the confirmation pass over I-13c, returned **SEND BACK** with 0
BLOCKERS, 2 MAJOR and 1 MINOR, and both MAJORs are the same defect in two directions: **R47-1** (a
document mutation dispatched between `flushForTransition()`'s return and the reseeding `set` is silently
discarded, measured at four photographs picked and **three lost** with `persistence.status` reading
`'idle'`, and **unbounded** because re-opening the batch's own trip passes the round-46 identity check) and
**R47-2** (`readPhotoAvailability` orders answers by trip and not by time, so two overlapping reads for the
*same* trip let the older win — one of its faces is R46-2's own end state on R46-2's own fix). **This is
the fourth consecutive round to find a face of one gap**, so `ARCHITECTURE.md` revision 47 rules the class
rather than the face: §4.2 rule **6d** and **A-67**, the store's **generation guard** — `flushForTransition`
returns a **ticket** instead of a boolean, three guarded slots order every asynchronous install, and
**R46-1's and R46-3's shipped point-fixes are deleted rather than layered under**. `I-13d` builds it. It is
**a `packages/client` store increment, not a photo one**: it opens `store/generation.ts`, `store/store.ts`
and their tests, fixes `setTripMeta`'s and `browseTrip`'s latent instances of the same shape while it is
there, and **opens no `.tsx`**, adds no dependency, and moves no `SCHEMA_VERSION`, `DB_VERSION`,
`SUMMARY_VERSION`, `RefKind` or core export. **I-13, I-13b and I-13c stay SEND BACK until I-13d lands**,
and I-13c group 1 item 1 (R47-3, still owed) is folded into it so the arc has one open increment rather
than two. §10 **A-66 Part 7**'s *"bounded at one derivative pair"* is corrected in place by A-66 **Part 10**
and needs no separate work.

**Revision 48, 2026-09-04.** **No increment added, no scope moved, nothing re-sequenced: `I-13d` gains a
fifth group of exactly two assertion corrections, and it blocks nothing.** The I-13d builder (`4316167`)
found that `ARCHITECTURE.md` A-67 **Part 7**'s *"every existing R46-1/R46-3 test stays exactly as it is"*
and this increment's own ship gate **G3** (*"zero stranded derivative pairs… mutation: restore
`isLiveTrip(tripId)` → one pair stranded → red"*) make **opposite** predictions about one scenario — a trip
transition landing during `derive` — and correctly declined to resolve it by editing either artifact.
`ARCHITECTURE.md` revision 48 rules it as A-67 **Part 7a**: **G3 is right, Part 7's blanket claim is what
moves.** The new step-4 guard fires *before* `ports.photo.write`, so the abandoned file's byte pair is
never created — fewer photographs lost, which is the whole point — and the two places asserting the old
guard's *one stranded pair* now correctly read empty. Part 7 is narrowed to **final-state** assertions
(which trip a record lands in, a listing's phase, `pending`/`total`/`failures`, readability), all of which
are green unedited. **Two lines change and they are the same observable**:
`packages/client/test/photos.test.ts:864` is a **builder** correction (group 5 below);
`qa/r46-i13b.mjs:259` §D face 1 is a **breaker** re-cut, flagged for the confirming round, per this arc's
own precedent (round 44's `qa/r43-a56.mjs`, round 46's six lines of `qa/r45-i13.mjs`, A-65 Part 8's two §K
lines) that a builder never edits an adversarial probe so it reports the builder's own fix as green.
**I-13d's ship gate is narrowed by exactly one line** — `qa/r46-i13b.mjs` printing a single `FAIL` on that
one assertion is a disclosed expected result rather than a hold; a `FAIL` anywhere else in either probe
still blocks. **No mechanism, slot, call site, type, field, selector, port method or criterion moves**, no
`SCHEMA_VERSION`/`DB_VERSION`/`SUMMARY_VERSION`/`RefKind`/core-export movement, and no `.tsx`.

**Revision 49, 2026-09-04.** **Two increments added — `I-13e`, the round-48 repair pass, and `I-13f`, a
queued two-line `.tsx` follow-up that is deliberately not scheduled alone.** QA round 48, the confirmation
pass over the generation guard, returned **SEND BACK** with 0 BLOCKERS, 2 MAJOR and 3 MINOR — **and it
could not break the mechanism.** A four-transition sequence, three out-of-order answers, two writers on one
slot and a nine-case release battery all held; `generation.ts` does not change in `I-13e`. Both MAJORs are
**wiring at A-67's own call sites**, and `ARCHITECTURE.md` revision 49 rules them as one missing sentence —
**A-68**: *a bump of a slot's sequence is a promise to replace the answer it invalidated.* **R48-1**: A-67
Part 6 placed `supersede('photoAvailability')` **inside** R45-4's value guard, so a byte write or remove
invalidates nothing in the one case that needs it — a photograph whose bytes are on disk reads `'missing'`,
and `removePhoto` + `undo` reads `'ready'` over bytes that are gone, against §10 **A-65 T1**. **R48-2**, a
regression I-13d introduced: `claimTransition()` claimed `photoAvailability` on **every** transition while
**nine** of its exits install no document and issue no replacement read, so the invalidated read is dropped
and nothing answers — **A-63's unresolving spinner**, reached by deleting another trip, by opening a
missing id, and by §2.9 **A-47**'s own designed corrupt-document banner path. **I-13e** narrows the claim to
`doc` (the reseed supersedes the other two slots, which is A-67 Part 4's own criterion applied to the
transition's own write), hoists the two byte-write supersedes out of the value guard and gives them the one
port read they owe, gives `removePhoto` the `observe('doc')` it never had, and adds one line to
`deleteTrip`'s failing cascade. **R48-4 is BUILD-NOTES §2's stale `npm test` count** and is a one-line
builder fix folded into I-13e's diff. **R48-5** — A-67 Part 7a item 4's *"no other test changes"* is wrong
for the second revision running; three more `qa/` assertions move, and A-68 Part 9 rules all three
(two are Part 7a's own inversion at new sites; the third is the `A → B → A` return trip, which is correct
behaviour and A-67 residue 3's disclosed cost paid by a case residue 3 did not name). **They are the
round-49 breaker's re-cut, not a builder's**, and their `FAIL`s are disclosed rather than a hold.
**I-13, I-13b, I-13c and I-13d stay SEND BACK until I-13e lands** and the confirming round runs over all
five together. **No `.tsx` in I-13e, no `qa/` file in I-13e, no dependency, no version movement, and no
change to `packages/core`.**

**Revision 50, 2026-09-04.** **One increment added — `I-13g`, and it is the first one in this arc that
changes the *shape of the argument* rather than the code the argument is about.** QA round 49, the
confirmation pass over A-68, returned **SEND BACK** with 0 BLOCKERS, 1 MAJOR and 4 MINOR — and again **could
not break the mechanism**, nor any of A-68's three groups on the case each was written for. **R49-1** is the
finding and its shape is the point: A-68 Part 5b discharges `importPhotos`' owed availability read under
`guard.current('doc', g)`, a check on the **`doc`** slot, and Part 4.1's nine stranding exits all bump
exactly that slot — so **the fix for R48-2 re-opened seven of the nine exits R48-2 was written to close**,
leaving the trip the user is still looking at at `phase: 'loading'` permanently, including through §2.9
**A-47**'s own designed banner path. **R49-5** found an **eleventh** exit that Part 4.1 could never have
held: a transition that *installs* its document and still never reaches its read, because the reseeding
`set`'s own `emit()` threw. **That is three enumerations of "the sites that need special handling" in three
rounds, each wrong within one round**, so `ARCHITECTURE.md` revision 50 rules the class rather than the
instance. **A-69** — *no correctness argument in the store may rest on an exhaustive enumeration of
control-flow exits.* §10.6 property 5 becomes a predicate over live state, repaired at two sites nobody
opts into: a wrapper applied once to `createStore`'s whole returned literal (so every async method settles
on **every** exit, including its throws — which is what an exhaustive union over "transition outcomes"
could not have done, since an exception is not an outcome), and `readPhotoAvailability`'s own tail.
`availabilityOwed` and both discharge lines are **deleted**, and `setAvailability` becomes the sole,
typed writer of the availability triple, so a fourth answer or a fourth writer is a **compile error**.
**R49-4 is fixed in the same increment rather than tracked**: a browse pane survives the deletion of the
trip it shows and §2.14's `copyStopInto` copies stops out of it — a hole in a deletion cascade
`BRIEF.md` names as public-grade from day one, and two lines in a function I-13g already opens. **R49-2**
and **R49-3** are corrections to A-68's own text: its *"§K is green"* was written from a probe that had
been dying at its own §D since `4316167` (so round 48's naming of §K was right), and three of its published
injected-fault mutants do not reproduce as worded — the code is right in all three, the criteria were not.
**I-13, I-13b, I-13c, I-13d and I-13e stay SEND BACK until I-13g lands** and the confirming round runs over
all six together. **No `.tsx` in I-13g, no `qa/` file in I-13g, no dependency, no version movement, no
change to `packages/core`, and `generation.ts` still does not change by a character.**

**Revision 51, 2026-09-04.** **One increment added — `I-13h`, and it is the smallest in the arc: one
disjunct, one stamp and one read-only accessor.** I-13g built A-69 correctly and its builder disclosed four
things rather than papering over any of them (**KD-83**…**KD-86**). One of them is a real contradiction
between two shipped rulings and it is now ruled as `ARCHITECTURE.md` §4.2 **A-70**. A-69's predicate is
false whenever `availabilityError` is set — which correctly stops the boundary re-running a read *because
it failed*, and **incorrectly** stops it discharging a **byte write's** `supersede` after an earlier
failure. So an import lands under a failed read and the listing keeps the *previous* failure's message over
a trip whose bytes have since changed, **eating the user's own *Try again* in the process**; and
`removePhoto` + `undo` on that path reads `'unreadable'`, where §10 **A-65 T1** says never. **A-70 upholds
A-65 T1 unamended and narrows the predicate**: a store that has just deleted a photograph's bytes does not
get to withhold what it did on the strength of an unrelated earlier failure. The mechanism is A-69's own
diagnosis applied one level down — A-69 read the **error field** as a proxy for *"is an answer
outstanding?"* when the record of that obligation is the **slot's sequence** — so the answer is stamped at
`setAvailability` (the one writer A-69's type fence closed) and the predicate asks the guard. **A-69 is
otherwise upheld whole**, and `generation.ts` gains **one read-only accessor** after three revisions of not
moving. The other three disclosures are text corrections to A-69, already applied in `ARCHITECTURE.md` and
mirrored into I-13g's entry below: **site S2's printed placement is unreachable** (every drop path is a
`return` inside a `try`) and the shipped `finally`-around-a-helper is the ruled shape; **G18's nine reds are
eight** and **G23's stated fault is a no-op**; and **G21's "three" and G24's "two" are counts of writing
functions and logical sites**, not of grep tokens. **I-13, I-13b, I-13c, I-13d, I-13e and I-13g stay SEND
BACK until I-13h lands** and the confirming round runs over all seven together. **No `.tsx` in I-13h, no
`qa/` file in I-13h, no dependency, no version movement, no change to `packages/core`.**

**Revision 52, 2026-09-04.** **One increment added — `I-13i` — and for the first time in six revisions it
is not about the generation guard.** QA round 50 attacked the A-67…A-70 mechanism as a mechanism rather
than as a list, could not break it on any axis, and **closed the arc**. Its two MAJORs are older than the
arc and measured identical before it, and both route to `ARCHITECTURE.md`. **§4.2 A-71** (**R50-5**):
`emit()` runs subscribers **synchronously**, so a subscriber that throws while rendering a *successful*
answer throws from inside whatever `try` the store was holding, and the `catch` records the view's
exception as its own subject's failure and then swallows it. Round 50 measured one face; I looked for the
**shape** and measured **five, in two subsystems** — a `present()` that succeeded read as *"the photo store
could not be read"* with a *Try again* that can never clear it; **deleted** bytes read as an unremovable
orphan; a photograph that **landed** read as `'storage_failed'` **by name**; and a write that **landed with
the write fence advanced** read as `persistence.status: 'error'`. All five **resolve**, so A-69 Part 7's
*"the caller sees the subscriber's error"* was false on every one of them. **The fix is not five narrowed
`try` blocks** — that is A-69 Part 3's forbidden enumeration, and this arc has been overturned three times
for writing one: `emit` **brands** what a subscriber throws and one classifier, **`attempt`**, rethrows a
branded error and returns everything else as a value, which **deletes seven `catch` blocks** and moves
every failure-naming line out of one. **§10 A-66 Part 11** (**R50-2**): A-66 Part 3 refused a sixth
`PhotoImportFailure` arm because a report written after a transition *"would land in the session state of
the trip the user moved to"* — and **two of the five arms it kept already do exactly that**, plus the
batch's progress settlement, which subtracts trip A's remaining files from trip B's own in-flight fraction
(measured `4 → 0` with four of B's files still to come). Part 3's conclusion stands; **its argument becomes
a check** — one gated writer, `setBatch` — and Part 8 gains **U6**/**U7**, written so the shipped code
fails them, because **U1 and U2 do not**. **R50-1** is two numbers: A-70 Part 7 item 3's *"six"* and
*"three"* are **call** counts and the literal commands return **7** and **4**; every number on those rows
now ships with the command that produces it, which is the only form that has not drifted twice.
**I-13, I-13b, I-13c, I-13d, I-13e, I-13g and I-13h stay SEND BACK until I-13i lands** and the confirming
round runs over all eight together. **No `.tsx` in I-13i, no `qa/` file in I-13i, no dependency, no version
movement, no change to `packages/core`, and `generation.ts` does not change by a character.**

**Revision 53, 2026-09-04.** **No increment added, and that is the news: for the first time in nine
increments the I-13 arc owes no repair pass.** QA round 51 ran the confirming round over I-13i and the
whole arc, attacked A-71's brand and A-66 Part 11's `setBatch` as mechanisms, and **could not break
either** — **0 BLOCKERS, 0 MAJOR, 6 MINOR, every one of them a wrong sentence or a wrong number in a
document rather than a defect in code**. Five are corrected in `ARCHITECTURE.md` revision 53 (**R51-1**
G35's control names the tests it actually reddens, and why widening `attempt` to make the old wording
reproduce would violate A-71's own Part 4b; **R51-2** a false-positive brand is not *"the conservative
arm"* — it trades a visible error for a stuck `'saving'`, and it is residue 5; **R51-3** the method this
document and A-71 both called **`saveAs`** has never existed and is `doMerge`'s two chained writes;
**R51-4** Part 4d's *"settles on EVERY exit"* is false for the exit above the `try`, pre-existing, and is
residue 6 with its fix written out; **R51-6** A-70 Part 7 item 3's correction table was wrong in the
revision that published it, for the third consecutive revision, so **the number is not fixed a fourth time
— the *count rule* replaces it**: a contract document states design counts and never the value a grep
returns over source, and this document's criteria are written to that rule from here on). **R51-5 is a
builder's**, one row of BUILD-NOTES' I-13i addendum, and blocks nothing. **What this changes about status:
the I-13 store arc is built and verified with no owed fix, and what remains before Phase 2's gate is
I-11's full chain plus `I-13f`'s two `.tsx` lines — which were never scheduled here, are ship conditions of
the first increment that opens `App.tsx`, and are not a claim about the store mechanism's soundness.**
**No code, no `.tsx`, no `qa/`, no test, no dependency, no version movement.**

**Revision 54, 2026-09-04.** **No increment added, no increment re-scoped, one bullet rewritten — `I-11`'s
*Dependencies / blockers* — and the sentence revision 53 closed on is withdrawn.** The gate was about to be
dispatched, so I-11's dependency chain was checked increment by increment **against `git log` on `master`
rather than against this document's own status cells**, which is the check that has never been run on it.
Two results.

**One is a naming gap and it is the small half.** `I-13i` — built at `032a4cb`, ruled at architecture
revision 52 as §4.2 **A-71** and §10 **A-66 Part 11**, confirmed at QA round 51 — **was not on I-11's
dependency list**, which stopped at I-13h. It is now named, with the same *why-it-gates* clause the
I-13e/I-13g/I-13h entries carry: A-71 Part 1 measured five shipped surfaces stating a false fact about the
user's own data, one of them **a write that landed with the fence advanced, reported as
`persistence.status: 'error'`** — a phase gated with that unbuilt would be certifying a phase that lies
about whether the traveller's work is saved. **`I-13f` stays off the list and that is deliberate, not an
oversight** — two `.tsx` lines, a ship condition of the first increment that opens `App.tsx`, and no such
increment exists in Phase 2 because *Explicitly not in Phase 2* refuses any photo screen while the visual
direction is unsettled. The revision-49 framing of it is unchanged and still correct.

**The other is why this revision exists. Four of the dependencies I-11 already named are NOT BUILT**, and
three separate places in this repository were saying otherwise. **`I-9` and `I-10` — the whole of step 2c —
are not started**: no `Participant` type, no `build/participants.ts`, no `Participants.tsx`, and **two of
this phase's exit criteria cannot be run without them**. **`I-12a` item 5 (§8.4 A-60 Part 6) is not
built** — the repair pass it was owed by landed *before* revision 42 wrote the item, and `travelStats.ts`
still tests disjointness on the `??` substitutes rather than on the supplied edges. **`I-13a` is not
built** — the *"may land inside any earlier commit that opens `photos.test.ts`"* clause was written so it
could not be dropped and is exactly what dropped it: two commits opened that file afterwards, neither
carried it, and BUILD-NOTES **KD-81**, which I-13a closes, is still open and still routed to me.
**Revision 53's closing sentence — *"what remains before Phase 2's gate is I-11's full chain plus I-13f's
two `.tsx` lines"* — is therefore false and is withdrawn**, along with the same claim in the 2d status cell
and in `CAIRN_VISUAL_ROADMAP.md`'s two newest blocks, which additionally call I-13f *"the actual photo
screen"*, which it has never been. **I-11's dependency bullet is now the authoritative list and says so.**
**No code, no `.tsx`, no `qa/`, no `cairn/docs/design/`, no test, no dependency, no version movement — and
no criterion changed**; what changed is that the gate can no longer be ordered against an unbuilt chain,
which is stated as a precondition on I-11's *Ship gate* rather than left to be discovered by the breaker.

**Revision 55, 2026-09-04.** **One increment deferred by Jacob's decision — `I-10` — and step `2c` is
narrowed rather than dropped.** Revision 54 found the whole of 2c unbuilt and named it as blocking the
gate. Jacob was asked directly which of three things to do: **(a)** defer I-10 and build only I-9, **(b)**
authorise a one-off `.tsx` exception for `Participants.tsx`, or **(c)** pause all Phase 2 gate work. **He
chose (a).** This revision records that so it is durable and does not get silently re-litigated.

**What was decided, and the reasoning behind the determination this revision had to make.** I-10 is the
only increment left in Phase 2 that needs a **screen** — a new `Participants.tsx` plus a new grouping on
`Profile.tsx` — and the fence against opening any `.tsx` while the visual direction is unresolved predates
it (Jacob rejected I-8b's aesthetic on 2026-09-02; *Explicitly not in Phase 2* therefore schedules no
surface of any kind). So the question this revision had to answer was **not** *may we skip a screen* but
**does skipping it make Phase 2's gate un-runnable** — because two of this phase's exit criteria mention
participants and revision 54 said both were blocked on I-9 **and** I-10. **The answer is that the gate can
proceed on I-9 alone**, and it is a measured answer rather than a convenient one: **four** criteria in this
phase touch participants — the §6.2 access conformance double-run, the round-trip/undo parity clause, §4.2
rule 1's action↔build-function mapping, and NO SILENT LOSS's 200-step dirty walk — and **every one of them
runs in plain Node with no browser and no screen**. The conformance set is `packages/core/test/access.test.ts`
and `qa/access.mjs`, whose predicates take a `TripRelationship` and a clock and never a rendered surface;
the dirty walk is `packages/client/test/dirty.test.ts`'s seeded step chooser. **No exit criterion names
`Participants.tsx`, the profile grouping, or any rendered text.** The double-run sat in I-10's *Built*
bullet because 2c *shipped* there — placement, not dependency. What genuinely needs I-10 is **I-10's own
ship gate**, which is a step gate and not a phase gate.

**So: `2c` ships narrowed at I-9 — participants as a core-and-store capability with no editor — `I-10` is
deferred with a written trigger, and `I-11` is NOT deferred.** I-11's *Dependencies / blockers* is
corrected accordingly and I-10 is moved onto the same footing revision 54 gave **I-13f**: named, explained,
explicitly not blocking, with the difference between the two triggers stated (I-13f rides along in a file
someone else opens; a screen rides along with nobody). **This is not a claim about I-9's soundness or
completeness** — I-9 is unaffected by the fence, its scope is unchanged, and the store-side half it already
owes in its own *Verification* bullet (actions, undo/redo at depth 50) is what the third and fourth criteria
above rest on. **No criterion is changed, weakened or removed**; what changed is which increment discharges
each. **No code, no `.tsx`, no `qa/`, no `cairn/docs/design/`, no test, no dependency, no version movement,
and `ARCHITECTURE.md` is untouched** — §8.3's *"cross-trip identity is derived and the view says so"* is an
obligation on a surface, so with no surface it is **unfired rather than violated**, and it becomes a ship
condition of I-10 the day I-10 lands.

**Revision 56, 2026-09-04.** **One increment added — `I-9a` — from the two objections the I-9 builder
disclosed rather than resolved, and both are upheld.** `ARCHITECTURE.md` revision 54 rules them as §8.3's
**A-72** and **A-73**; this revision queues the code. **KD-96 / A-72:** `participants` **is records**, and
the silent-loss scenario the builder feared **is reachable** — `migrateDoc`'s refusals are all keyed on the
version *number*, so a pre-I-9 build reads a post-I-9 document as its own version, passes it through,
drops the field it has never heard of and re-emits without it; and because I-9 moved no `DB_VERSION`, that
build opens the live library rather than failing on it, which is the channel photos never had. So
**`SCHEMA_VERSION` goes to 3**, `migrateDoc` becomes a **ladder** rather than a second `if`, and two test
pins and the generated sample move with it. **KD-97 / A-73:** `duplicate_participant_id` gets **one home,
`validateTrip`**, and the parser refusal comes out — **and the defect is in this document**, not in the
builder's work: **I-9's *Verification* bullet ordered the parser refusal by name, against `ARCHITECTURE.md`
§8.3's own text**, which had already put the code in `validateTrip`. That bullet is **withdrawn and
replaced** below. **No phase, step, gate, criterion or dependency moves**; I-11 does not wait on I-9a
(*Dependencies / blockers*, below); `I-10` stays deferred exactly as revision 55 left it; and one item —
A-39 Part 11 item 2's Axis-D assignment in `qa/i7a-idb-rowkeys.mjs` — is **routed to the breaker**, not to
I-9a's builder, because that file is the breaker's.

**Revision 57, 2026-09-04.** **One increment added — `I-9b` — and it is one test, because the defect it
answers turned out not to exist.** `ARCHITECTURE.md` revision 55's **A-74** rules on BUILD-NOTES **KD-99**,
the third and last objection from the participants arc: should `validateTrip` report a participant `kind`
outside `PARTICIPANT_KINDS`? **No — it can never see one.** `parseParticipant` has read `kind` through
`oneOf(o.kind, PARTICIPANT_KINDS, …)` since I-9, A-73 Part 6 item 2 preserved that refusal by name, and
`packages/core/test/participants.test.ts` already asserts it at `$.participants[0].kind`, so the
hand-crafted-document channel KD-99 worried about was closed **before** R52-3 shut the two build-function
doors. A-74 prints the full eight-row producer census for `Trip.participants` and every rung is closed;
`migrateDoc` is not a rung at all, because it returns a **document** and not a `Trip`. **So: no new
`IssueCode`, no `src` change, no export-surface movement, nothing under `qa/`, and no phase, step, gate,
criterion or dependency moves.** What is queued is the one rung of that census nothing stands on —
`importLegacyDays` emits `participants: []` — because A-74's ruling rests entirely on the census being
right, and §0.5 does not let a claim like that ship without a check that reddens when it stops being true.
The residue A-74 names is general rather than participants': eighteen `oneOf`-constrained fields share the
shape, and the answer when one of them acquires a *reachable* unvalidated caller is **another door guard in
`build/` on R52-3's model, not an `Issue`.** **One item is routed to the breaker rather than to I-9b's
builder** — `qa/r52-participants.mjs`'s *"validateTrip reports the unrestorable kind"* assertion, which is
the executable form of KD-99, is withdrawn by A-74 **and** is already dead code under R52-3's throw. That
file is the breaker's; the routing is stated in I-9b so it is not discovered later.

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

Six rules. They apply to every phase in this document, and a criterion that breaks one is a defect routed
to me, not to whoever failed to meet it. **Rule 6 is revision 53's and it is the newest**; the other five
are unchanged.

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

**6. No criterion states the value a command returns over live source — the count rule** (revision 53,
§4.2 **A-70 Part 7 item 3**, QA **R51-6**; it supersedes revision 52's *"publish the command beside the
number"*). A **design** count is fine and belongs here — *"three writing functions"*, *"exactly five
arms"*, *"one legitimate caller"* — because a ruling owns it and only a ruling changes it. **The value a
grep returns is owned by the assertion that checks it**: name the assertion and publish the command with
**what it means**, or publish the drift-proof **relationship** (*"the literal form also matches the
declaration, so it returns one more than the call count"*), never the arithmetic result. A measured value
belongs in `BUILD-NOTES.md` or the test, and may appear in a contract document only **labelled as history
against a fixed commit**, with no criterion depending on it. **The evidence is four rounds on one row**:
KD-83, R50-1, and R51-6 — where the correction published to stop the drift was itself made wrong, in the
same revision, by the other ruling in that revision.

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
- **`packages/core/src/index.ts`'s runtime exports equal §2.10's list exactly — 86 symbols** (69 in revision
  5; `reassertRetirements` joins in revision 6 under P1, §2.7 A-5; `lifecycle` joins in revision 10 under
  P2, §8.1/§8.9, counted in Phase 2 I-1's own pass; `countryOf` under P2 and `COUNTRY_INDEX` under P1,
  §8.4 clause 1, counted in Phase 2 I-5's own pass; **`SUMMARY_VERSION` under P1 at I-6** — the client's
  rescan compares against it — **and `travelStats` under both P1 and P2 at I-7**, §8.4 clause 2 / A-31;
  `clusterPoints` at I-8d, `isIsoDate` at I-8e, `countryKeyPoint` at I-8g and `countryParts` at I-8h take it
  to **79**; **`addPhoto`, `removePhoto`, `updatePhoto` and `readExif` at I-13** under §10.1/§10.2, A-57
  Part 6, take it to **83**; **`addParticipant`, `updateParticipant` and `removeParticipant` at I-9** under
  §8.3/§8.9 take it to **86**, re-counted in I-9's own pass and written into §2.10 and this line in the same
  commit),
  **one list, set equality in both directions** `[stated]`. *(**Revision 25, QA R28-8.** This number said
  **73** from I-5 until now: the count was not updated in I-6's commit or I-7's, which the increment
  sequence's own rule — *"an increment that adds an export updates §2.10's list and criterion E's count in
  the same commit"* — makes mandatory. §2.10's list was corrected to 75 at ARCHITECTURE revision 24 and is
  complete; this file was the one left behind, which is worse, because a stale number in a **contract**
  document is the number a future session re-derives *from*. The rule stands unchanged: the count is
  obtained by **counting** — `node --experimental-strip-types -e "import('./packages/core/src/index.ts').then(m
  => console.log(Object.keys(m).length))"` — and never by quoting this line, §2.10's prose, or §8.9. Nine
  `qa/` scripts carry the same stale pin and are I-7a's to fix.)* Rewritten in revision 5, because the criterion as met was
  satisfied by construction: the test asserted equality against the **union** of `SECTION_2_10` (50) and
  `BEYOND_2_10` (60), which is 110 = 110 for any 110 exports, and QA found 42 of the 60 per-symbol
  justifications did not hold (R2-12, KD-19). So, mechanically:

  > `surface.test.ts` contains **exactly one** array of symbol names. Grep the file: zero occurrences of a
  > second list, of the identifier `BEYOND_2_10`, and of the string `INTERNAL` — a symbol the test itself
  > calls internal is a symbol that is not exported. The assertion is
  > `setEquals(Object.keys(runtimeExportsOf(index)), THE_LIST)` in both directions, and `THE_LIST` is §2.10's
  > list transcribed, **75 entries**. Type-only exports are excluded from the set by construction (they do
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
| **2b — the lifetime map and travel identity** | `countryOf` + the generated country index, `travelStats`, the widened `TripSummaryRow` + `SUMMARY_VERSION` rescan, the **Map** and **Profile** surfaces | *"show me everywhere I've been"* — the signature experience, from data that already exists | **UNBLOCKED** by 2a's SHIP. **In progress: I-5 shipped at `897b928`** and routed one design defect here (KD-51), ruled as §8.4 **A-26** and built as **I-5a** at `b6200e6`, which QA round 22 verified and which routed one more (R22-1), ruled as §8.4 **A-27** and built as **I-5b** at `38d23c9`, which QA round 23 verified and which routed one more (R23-1), ruled as §8.4 **A-28** and built as **I-5c**, which QA rounds 24 and 25 closed. **I-6 then shipped and QA round 26 verified it**: the write path is sound, the bookkeeping around it is not, and round 26 routed two design defects here — ruled as §8.4 **A-29** and §4.3 **A-30** and scheduled with round 26's four builder findings as **I-6a**, which QA round 27 verified (0 blockers, 3 MINOR). **I-7 then shipped and QA round 28 verified it**: `travelStats` itself held at every boundary, and the round returned **SEND BACK** on what is underneath it — **R28-1 (BLOCKER)**, the two-digit-year rule inside `dayNumber`, and **R28-2 (MAJOR)**, an exit criterion 6 that cannot catch a persisted `countriesVisited`. Ruled at revision 25 as §2.1 **A-32**, §8.4 **A-33** and §8.4 **A-34**, and scheduled with round 28's four builder findings and two stale ceilings as **I-7a**. **I-7a then shipped and QA round 29 verified it**: **A-32 held** against three oracles that are not `Date` and **A-34** held at every lifecycle boundary, and the round returned **SEND BACK** again on **R29-1 (MAJOR)** — A-33's port grep is a whole-file check and the fault it forbids still reaches a real IndexedDB record with every gate green — and **R29-2 (MAJOR)** — the *exact*-date branch of both trip forms mints 664,377 days from one mistyped digit. Ruled at revision 26 as §2.3 **A-35**, §8.4 **A-36** and §8.4 **A-37**, and scheduled with round 29's three builder findings as **I-7b**, which is **owed before I-8**. Still owed: `REVIEW.md` 2a routing **A-1**'s provenance half (its `travelStats` half is closed by A-31), round 27's **R27-1** and **R27-2** (both builder, both MINOR, neither blocking I-7a), and the breaker board items **B-1**…**B-4** before 2b's next breaker round. **I-7b then shipped (2b's data layer, manager verdict SHIP at `69e44d4`), I-8 was split, and I-8a shipped at `6b89c91` with a manager verdict of SHIP** — the tab shell, the world map and the token layer — routing nine items, four of which gate I-8b. Ruled at revision 28 as §4.4 **A-41**/**A-42**, §8.4 **A-44** and §2.9 **A-45**, and scheduled as **I-8c** (the date parser and the lifecycle read gate) and **I-8d** (the atlas frame). **2b still has not shipped: it ships at the end of I-8b, and I-8b is now gated on I-8c, I-8d and I-8e. **I-8c then shipped and QA round 34 verified it**: A-45 and A-44
both held under a 140,042-date differential test and an injected-fault reproduction of R33-3, and the round
returned **SEND BACK** on **R34-1** (BLD-3's *"Close this trip"* does not recover — a builder ordering bug)
and **R34-2** (A-45's cost paragraph names a warning surface that never fires, so a document with a
calendar-invalid date renders as a healthy card whose only affordance is Delete, with no way to export it).
Ruled at revision 31 as §2.9 **A-46** and scheduled as **I-8e**, which is owed before I-8b; **R34-8** rewrote
I-8c's own criterion 3 into 3a/3b. **I-8e then shipped and QA round 35 verified it**: everything it was
contracted to build held (R34-1 fixed in both branches, the rescue export honest end to end, `rowDatesReadable`
total over twelve hostile row shapes), **0 blockers** — and the round found **R35-1 (MAJOR)**, A-46's own Part
7 residue 1 measurably false for the *majority* of what A-45 refuses: a bad `days[n].date` leaves a card that
looks healthy, refuses on tap, and still offers no rescue, with Delete's warning gated on the same too-narrow
boolean. Ruled at revision 32 as §2.9 **A-47** and scheduled as **I-8f** — the trigger stops being a proxy
and becomes a fact recorded when a real open fails — which is owed before I-8b, and which also carries
round 35's **R35-4** (`cli.ts --today` refuses) and **R35-5** (`exportStoredDoc` refuses the active trip).
**I-8d then got its own round, and QA round 36 sent it back to the architect**: the build is faithful to
A-41 and A-42 clause by clause and **R33-1 is genuinely fixed**, but the ruling produces wrong maps for a
whole class of libraries — **R36-1 (MAJOR)**, a key point that is the centre of a *rectangle* and so lands
2,633 km out in the Atlantic for France, and **R36-2 (MAJOR)**, a first-fit partition that lets the
alphabet decide which country the surface calls *"shown separately"*. Ruled at revision 33 as §4.4 **A-48**
— the key point becomes a point of the country's principal landmass, the partition becomes the connected
components of the threshold graph — and scheduled as **I-8g**, which is owed before I-8b and which also
carries round 36's **R36-3**, **R36-4**, **R36-5**, **R36-6** and half of **R36-7**. **I-8g then shipped and
QA round 37 verified it**: **0 blockers**, every clause of A-48 implemented exactly as written, the key
point, the partition and the paint order all confirmed fixed against independently written second
implementations, and the day map byte-identical — and the round found **R37-1 (MAJOR)**, the one clause A-48
did not touch: C8 still takes the extent over every entry box, so the France-and-Greece library A-48 was
written for renders **81.1° × 49.1°** at **1.95% land**. Ruled at revision 34 as §4.4 **A-49** — a country's
geometry is its *parts*, a pane frames the parts its subject is connected to, and the rest get a pane of
their own — and **A-50** (the pane box in both directions), and scheduled as **I-8h**, which carries round
37's **R37-3** and **R37-4**, is **not** owed before I-8b, and is owed before the phase gate. **I-8h then
shipped and QA round 38 verified it**: **0 blockers**, a second `worldMapFrame` written from scratch matching
the shipped one string for string on 11 libraries, I1…I15 over 643 libraries, the Alaska rule proven
code-blind — and **R38-2 (MAJOR)**, which is the finding that stopped the arc. A-49 fixed every pane C5
decides to **split**; on the **80.0%** of two-country libraries where C5 declines, the defect is untouched
(`FR`+`US` frames France at **899 px²**, `FR`+`NZ` at **0.48% land**). **Jacob called a stop to the
four-round patch pattern and asked for the framing abstraction itself to be reconsidered.** Ruled at
revision 35 as §4.4 **A-51** — the split test, the pane cap, the union-of-the-rest pane, the detached pane
and the main/inset hierarchy are all withdrawn, and the frame becomes **one pane per connected component of
country parts**, equally weighted, ordered by weight rather than framed by it — with **A-52** beside it for
R38-5, and scheduled as **I-8i**, which carries R38-3 and R38-4 as structural consequences and R38-1 as a
builder line. **Revision 36** answers his one follow-up — whether a component of a country's *geometry*
becomes an equal-weight travel *subject* — as §4.4 **A-53**: the frame's input holds no coordinate, so an
ISO code is the only geographic evidence there is, A-51 already separates the claim (`home`/`weight`/
caption/order) from the cell, and **at most 3 extent panes can exist planet-wide**. A-51 and A-52 are
unchanged; A-53 adds **I18**, two criteria and a docstring. **I-8i is gated on Jacob's approval of A-51 and
on nothing else — the design is closed and no further architect round is owed** |
| **2c — participants** | `Trip.participants`, three build functions and their actions (**I-9**); the two rulings on I-9's disclosed objections — `SCHEMA_VERSION` → 3 and one home for `duplicate_participant_id` (**I-9a**, revision 56); ~~the participants editor, *"people you have travelled with"* on the profile~~ (**I-10 — deferred at revision 55**) | **narrowed at revision 55**: the model can say the trip was with your girlfriend and her family, and it grants them nothing — provable in plain Node — but **nothing on screen enters or shows a participant** until I-10 lands | **Narrowed to I-9 at revision 55, by Jacob's decision.** I-9 dispatched 2026-09-04; **I-10 deferred, with its trigger written into its own entry**. I-11's *Dependencies / blockers* is the authoritative status |
| **2d — the memory data layer** *(revision 40)* | **I-12**: `TripSummaryCity` gains `centre` + `firstDay`/`lastDay`, `SUMMARY_VERSION` → 5, `TravelStatsCity` gains dates (§8.4 **A-56**). **I-13**: the `PhotoAsset` record class, multi-file import, two byte stores, a pure EXIF reader, the two-derivative resolution rule, the loading-state selectors (**§10**, **A-57**, **A-58**). **I-12a** *(revision 41, QA round 43; amended at revision 42 by QA round 44)*: an unreadable stored city date stops taking the whole library's statistics down anonymously, and a city range the clock erased stops printing as a specific day (§8.4 **A-59**, **A-60**). **I-12a is SEND BACK at round 44** — a repair pass is owed for R44-1, and revision 42 folds §8.4 **A-60 Part 6** (R44-2) into it as item 5. **I-13 is SEND BACK at round 45**; its builder's KD-81 is ruled at revision 43 as §10 **A-61** — the 4 KB document-growth criterion was mine and wrong, the `PhotoAsset` record does not move by one field, and **I-13a** is the one-file test-and-comment pass that closes it. **I-13b** *(revision 44, QA round 45)*: the photo byte stores get their tenancy in the key so restoring a backup cannot destroy the original trip's photographs, a failed availability read becomes a state a surface can name and retry, and A-57 Part 4's false claim about provenance transitions is withdrawn (§10 **A-62**, **A-63**, **A-64**). **I-13b is SEND BACK at round 46** — the key held under every attack, but three photo writes cross a trip boundary a key cannot police, one of them a regression this arc introduced; **I-13c** *(revision 45, QA round 46)* is the repair pass, and its one architect-owned item is §10 **A-62 Part 8 residue 4** — a failed byte cascade during a trip delete does not block the delete and is answered only by residue 2's unbuilt sweep, so what lands is a corrected comment and no new machinery. **Revision 46 adds group 3 to I-13c** — §10 **A-65** (undo restores a removed photo's record, never its bytes; the deferred byte delete is refused and §10.3's synchronous cascade is upheld) and **A-66** (`PhotoImportFailure` is closed at five arms; a batch abandoned because the user left the trip is correctly reported as nothing, because the report would land against the trip they moved to) — **two more comment corrections, no new machinery, and the arc has no unruled question left**. **I-13c is SEND BACK at round 47**, and the two MAJORs are one defect that is **not in the photo code**: a document mutation dispatched between `flushForTransition()`'s return and the reseeding `set` is silently discarded (unbounded — every re-open of the batch's own trip costs one more photograph), and `readPhotoAvailability` orders answers by trip and not by time. Four consecutive rounds have now found four faces of that one gap, so revision 47 rules the class: §4.2 rule **6d** and **A-67**, the store's **generation guard** — `flushForTransition` returns a **ticket** instead of a boolean, three guarded slots order every asynchronous install, and R46-1's and R46-3's point-fixes are **deleted** rather than layered under. **I-13d** *(revision 47)* builds it, folds in I-13c's one still-owed comment, and is a `packages/client` **store** increment that opens no `.tsx` | a past trip stops being a list of country codes — it knows *where in* each country and *when* — and a photograph can be attached to a day of it at all, which it could not before. Both are exercisable end to end with `node --test` and the CLI, on a machine with no browser | **In progress** *(status corrected at revision 43 — this cell still read "Not started" after three increments had landed; re-stated at revision 44)*: I-12 SHIP (`8b50889`), I-12a **SEND BACK** and owed a repair pass, I-13 **SEND BACK at round 45** (`497c116`) and owed I-13b, **I-13a queued**; **I-13b built (`70b9ee6`) and SEND BACK at round 46**, owed **I-13c**, whose group 2 built at **`a6c5d04`** and whose three documentation items are still owed *(re-stated at revision 46)*; **I-13c SEND BACK at round 47 (`4430e34`) and owed I-13d** *(revision 47 — the generation guard, §4.2 **A-67**; two of I-13c's three owed documentation items landed at `c440170`, and the third is folded into I-13d as its group 4)*; **I-13d built (`4316167`) and SEND BACK at round 48 (`d03eac8`), owed I-13e** *(revision 48 — the builder found A-67 Part 7's "no existing test moves" contradicting this increment's own **G3** and correctly declined to resolve it; A-67 **Part 7a** rules it, and I-13d gains a **group 5** of two assertion inversions — one builder, one breaker — that gate nothing. **Revision 49**: round 48 attacked the generation guard itself and **could not break it** — every slot releases, the newest claim always wins — but both of its MAJORs are A-67's **wiring** at its own call sites: the byte-write `supersede` shipped inside R45-4's value guard so it does not fire when availability is unknown (**R48-1**, R47-2's fourth face), and `claimTransition` claimed the photo slot on **every** transition while nine of its exits install nothing and issue no replacement read, which is **A-63's unresolving spinner** rebuilt (**R48-2**, a regression). §4.2 **A-68** rules both as one missing sentence — *a bump of a slot's sequence is a promise to replace the answer it invalidated* — and **I-13e** builds it; **I-13f** is the queued two-line `.tsx` follow-up nobody owned)*; **I-13e built (`106bbd3`/`4398de5`) and SEND BACK at round 49 (`43d0d20`), owed I-13g** *(revision 50 — round 49 could not break the mechanism or any of A-68's three groups either, but A-68's **own discharge gate** for the owed availability read is a check on the `doc` slot, which is the slot all nine of its Part 4.1 exits bump, so the fix for R48-2 re-opened seven of the nine (**R49-1**); and an eleventh exit exists that installs its document and still answers nothing (**R49-5**). **Three enumerations of "the sites that need special handling" in three rounds, each wrong within one round**, so §4.2 **A-69** rules the class: *no correctness argument in this store may rest on an enumeration of control-flow exits.* The invariant is repaired at a boundary every path must pass through, `availabilityOwed` is deleted, the availability triple gets a single typed writer, and **R49-4** — a browse pane outliving the trip it shows, with `copyStopInto` reading it — is fixed in the same pass rather than tracked)*; **I-13g built (`ae075db`) and owed I-13h** *(revision 51 — not a QA finding but the I-13g **builder's own disclosure**, which is the pipeline working: they implemented A-69's predicate verbatim, found it could not keep §10 **A-65 T1** and two shipped criteria green at once, declined to pick a side, and pinned both paths with tests (BUILD-NOTES **KD-84**). §4.2 **A-70** rules it — A-69's `availabilityError === null` conjunct also declines to discharge a **byte write's** `supersede` after an earlier failed read, so an import leaves a stale failure standing over changed bytes and `removePhoto` + `undo` reads `'unreadable'` where A-65 T1 says never. **T1 is upheld unamended and the predicate is narrowed**: the record of the obligation is the **slot's sequence**, not the value of the error field, so the answer is stamped at `setAvailability` and the predicate asks the guard. Three of the builder's other disclosures are text corrections to A-69, applied in place)*; **I-13h built (`e051306`), QA round 50 run (`08b09fb`) with its MINOR fix pass at `37cf4f0`, and owed I-13i** *(revision 52 — **round 50 closed the A-67…A-70 arc**: it attacked the settling boundary as a mechanism rather than as a list, on every axis it could construct, and could not break it. Its two MAJORs are **pre-existing, outside that arc's subject, and measured identical before it landed**. **R50-5**: `emit()` runs subscribers synchronously, so a subscriber throwing while rendering a **successful** answer throws from inside whatever `try` the store was holding and the `catch` records the view's exception as its own subject's failure — then swallows it. §4.2 **A-71** measured **five faces in two subsystems**, including a **write that landed with the fence advanced** reported as `persistence.status: 'error'`, and rules the class rather than the site: `emit` **brands** what a subscriber throws, one classifier **`attempt`** rethrows a branded error, and **seven `catch` blocks are deleted**. **R50-2**: §10 A-66 Part 3 refused a sixth failure arm to avoid a misattribution that **two of the five arms it kept already ship**, plus the batch's progress settlement — **A-66 Part 11** rules one gated writer, `setBatch`, and adds the two criteria U1/U2 were too weak to catch. **I-13i** builds both)*; **I-13i built (`032a4cb`) and CONFIRMED at round 51 (`119d336`)** *(revision 53 — the breaker attacked A-71's brand and A-66 Part 11's `setBatch` as mechanisms and **could not break either**: 0 BLOCKERS, 0 MAJOR, 6 MINOR, and **all six are wrong sentences or wrong numbers in documents, not defects in code**. Five are corrected in `ARCHITECTURE.md` revision 53 and one is a builder's BUILD-NOTES row. **No repair pass is owed** — the first time in nine increments — and what stands between this arc and Phase 2's gate is **I-11**'s full chain plus **I-13f**'s two queued `.tsx` lines, which are ship conditions of the first increment that opens `App.tsx` and are not a claim about the store mechanism)*. **Gated on 2b's *data layer*, which shipped (`REVIEW.md` "2b (data layer)", SHIP, `69e44d4`) — not on 2b's surfaces and not on 2c.** Orderable before or after 2c. **Opens no `.tsx` file** |

**Mapped onto the increment sequence below** (revision 10): **2a = I-1 → I-4**, **2b = I-5 → I-8**,
**2c = I-9 → I-9a → ~~I-10~~** *(revision 55: **2c = I-9 alone** for this phase; I-10 is deferred and keeps its number for whenever its trigger fires. Revision 56 adds **I-9a**, the builder follow-up for A-72/A-73 — it re-scopes nothing in I-9 and does not block the gate)*, **2d = I-12 → I-12a → I-13 → I-13a → I-13b → I-13c → I-13d → I-13e** *(revision 40; I-12a added at revision 41, I-13a at revision 43, I-13b at revision 44, I-13c at revision 45, I-13d at revision 47, I-13e at revision 49 — and the last two are `packages/client` **store** increments that happen to close the arc, not photo ones)*, with **I-0** before all of them and **I-11** the
gate — which is now numbered below two increments it waits for; sequencing rule 7 is why the labels are not
renumbered. Each of the three steps is
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
*(Revision 25: **I-7a** carries §2.1 **A-32**, §8.4 **A-33** and §8.4 **A-34**, the three rulings on the
design defects QA round 28 found *under* I-7 — a `dayNumber` that reads year `0001` as 1901, and a ship
gate that greps declarations while the danger is a value. It sits directly after I-7 and is **owed before
I-8**, for the I-5c version of the reason: A-32 is data loss on a path a user reaches in four clicks, and
a rescan does not quietly forgive a document that cannot be parsed.)*

*(Revision 28: **I-8c** carries §2.9 **A-45** and §8.4 **A-44**, and **I-8d** carries §4.4 **A-41** and
**A-42** — the four rulings on what the I-8a gate found *under* I-8a. They sit inside 2b, directly after
I-8a, and **both are owed before I-8b**, which is where 2b finally ships. The reason is the I-5c/I-7a
version and not the softer one: A-45 is **wrong data written through a shipped path** — an imported trip
with a date that does not exist can classify as `planned` and drop all of its countries and days out of the
lifetime map, and a rescan does not forgive it because the row is minted from the same bad dates — and
I-8b's Profile is the second surface to print those numbers. A-41 is the frame itself: on the only real
library we have, the map I-8a shipped is **a map of the United States** with the trip it is about squeezed
into 149.2 px of 958.)*

*(Revision 29: **I-8e** carries §2.9 **A-46**, the one design finding QA round 34 found *under* I-8c. It
sits directly after I-8d and is **owed before I-8b** for the I-8c reason one level out: A-45 refuses the
bad document, and until I-8e the user is never told they have one — the card is healthy, the only
affordance is Delete, and there is no way to get the bytes out of a trip that will not open.)*

*(Revision 32: **I-8f** carries §2.9 **A-47**, the one design finding QA round 35 found *under* I-8e — the
same pattern a third time, and each time one level further out. I-8e closes the story for a bad
`startDate`/`endDate`, which is **two** of the sixteen-plus date fields a real document carries; the other
population renders as a healthy card, refuses on tap, and still offers no rescue. I-8f stops proxying the
question — it records the fact when a real open actually fails, and gates the chip, the rescue and Delete's
warning on that. It sits directly after I-8e and is **owed before I-8b**.)*

*(Revision 33: **I-8g** carries §4.4 **A-48**, the two design findings QA round 36 found *in* I-8d's own
ruling — the first round in this chain where the build was faithful and the **ruling** was the defect. A-41
C2 keys a country off the centre of its bounding **rectangle**, so France keys off the open Atlantic and
clusters with Morocco rather than Czechia; A-41 C3's first-fit partition is not transitive, so the row order
decides which country the map calls *"shown separately"*. It sits directly after I-8f and is **owed before
I-8b**, for A-41's own reason: the map is still of the wrong subject for any traveller whose countries
include one with a distant overseas territory, and the Profile inherits the same claim.)*

*(Revision 34: **I-8h** carries §4.4 **A-49** and **A-50**, the design finding QA round 37 found in A-48 —
the fourth round in this chain, and the third in a row where the build was faithful and the ruling was the
defect. A-48 moved the **key point** onto the country and left **C8**, the extent, taking the union of every
entry box, so the same pane used two different answers to *"where is this country"* for two different
purposes. A-49 makes them one rule at one threshold: a country's geometry is its **parts**, a pane frames
the parts its subject is connected to, and the rest get a pane of their own rather than being cropped. It
sits directly after I-8g and, unlike I-8g, is **not** owed before I-8b: which countries a pane holds is
settled, and only how wide it is is not.)*

*(Revision 35: **I-8i** carries §4.4 **A-51** and **A-52** — and it is **not** the fifth patch in this
chain, it is the reopening Jacob asked for after round 38 measured the fourth one as reaching only the
minority of libraries. A-51 withdraws the split test, the pane cap, the union-of-the-rest pane, the detached
pane and the whole main/inset hierarchy, and makes the frame **one pane per connected component of country
parts** — a smaller rule than what it replaces: one partition instead of three, one kind of pane instead of
four, no dominance test, no cap, no alphabet tie-break. It sits directly after I-8h, is **not** owed before
I-8b, and is owed before the phase gate. **It is gated on Jacob's written approval of A-51** — the ruling
overturns the mechanism half of his own framing direction while keeping its purpose clause, and he asked to
decide that himself before a builder pass. Until he rules, A-41…A-50 are what ships and R38-2 is an open,
disclosed defect.)*

*(Revision 36: **I-8i** also carries §4.4 **A-53**, which answers Jacob's one question about A-51 —
*does a component of a country's geometry become an equal-weight travel subject?* — and **changes no clause
of A-51 or A-52**. Membership stays country geometry because the frame's input carries no coordinate finer
than an ISO code; standing is `home`, priority is order, disclosure is the caption; **I18** pins that home
panes come first; and the census pins that only `FR`, `UM` and `US` are multi-part, so **at most 3 extent
panes exist planet-wide** and the greedy worst case has none *(revision 37: that ceiling is **18** panes,
not 14 — A-54 Part 4, QA R39-3; all 18 are home panes, so the claim survives the number)*. d3-geo and Turf were investigated against
real source and rejected on semantics — `geoBounds` is winding-order sensitive and bounds great-circle
arcs, `fitExtent` emits pixels the design exists to not compute, and turf's DBSCAN drops a lone part as
*noise* — so **no dependency is added and the zero-dependency rule is not broken**. The increment's scope
does not grow: two criteria and one docstring.)*

*(Revision 37: **I-8j** carries §4.4 **A-54**, the two architect items the manager's I-8i gate routed as
gating I-8b. It is not a fifth framing ruling — **A-51's geometry does not move**. What moves is the box the
panes sit in (the grid left up to **66.7%** of the map card as bare background and clipped at 320 px; the
container is now a wrapping flex line box whose cells fill their line, measured **0.0–0.5%** empty at every
width), the tie-break (the pane's own latitude instead of the alphabet one indirection out), and one written
predicate in `packages/core` so a malformed ring is **stated** rather than blanking the map silently. It
sits directly after I-8i and is **owed before I-8b**, because I-8b puts a second surface on the same
`travelStats`/index pair and neither failure mode is one to widen. **It is independent of I-8f** — different
files, different finding, either order, never one session.)*

*(Revision 26: **I-7b** carries §2.3 **A-35**, §8.4 **A-36** and §8.4 **A-37**, the four design findings QA
round 29 found *under* I-7a — an exit criterion whose static port check a reassigned parameter walks past,
an unbounded day skeleton behind a `<input type="date">`, and two bounds stated over documents that are
applied to rows. It sits directly after I-7a and is **owed before I-8** for the same reason: A-36 is the
gate that would otherwise certify the increment that puts `travelStats` on a screen, and A-37 is what stops
that screen rendering a five-digit year.)*

### Deliverables

```
packages/core/src/
  derive/     lifecycle.ts  country.ts  travelStats.ts     (+ summary.ts widens)
              cluster.ts    + clusterPoints(points, thresholdKm) — I-8d, the ONE single-linkage
                            kernel; clusterStops and focusCluster delegate — §4.4 A-41 Part 6
                            I-8g: becomes the CONNECTED COMPONENTS of the threshold graph, so the
                            answer stops depending on input order — §4.4 A-48 C3′
              country.ts    + countryKeyPoint(code, index) — I-8g, §4.4 A-48 C2′: the box centre of
                            the code's principal ring. A label, never an attribution.
                            + countryParts(code, index, thresholdKm) — I-8h, §4.4 A-49 Part 2: the
                            code's rings as connected components, via clusterPoints. Still no
                            distance function in this file; the principal part's key IS the key point.
                            I-8i: keeps EVERY ring (the >= 6 filter comes out), so [] means "the
                            index carries no ring for this code" and core's two functions agree
                            — §4.4 A-52. countryKeyPoint is NOT modified and stays exported.
                            I-8j: ONE private predicate — a ring is drawable iff its length is
                            even, >= 2 and every element finite — used by BOTH functions, so []
                            <=> null and a malformed ring reaches `missing` instead of a NaN
                            viewBox. countryKeyPoint loses its >= 6 filter AND its entry-box
                            fallback (a box centre is not a point of the country, I8)
                            — §4.4 A-54 Part 2. No signature moves.
  serialize/  fromJSON.ts   isoDate() calls isIsoDate — I-8c, §2.9 A-45
  index.ts      + isIsoDate re-exported (76 → 77) — I-8e, §2.9 A-46; no new code in core
                + countryKeyPoint (77 → 78) — I-8g, §4.4 A-48 Part 2
                + countryParts (78 → 79) — I-8h, §4.4 A-49 Part 2
                I-8i: NO MOVEMENT (stays 79). countryKeyPoint loses its production caller and
                stays on the surface under P2 alone — §4.4 A-51 Part 6
  geo/        countries.gen.ts          generated, committed, size-budgeted — §8.4
  build/      participants.ts           add/update/remove — one core fn per action
  conflict/   rules/*.ts                each gains `class`; detect.ts gates feasibility on ctx.today
              detect.ts / resolve.ts    detectUngated (private) + syncResolutions(trip, at) — §2.7 A-9
packages/client/src/
  store/      summary rescan on SUMMARY_VERSION; library selectors for travelStats
  selectors/  worldMap.ts   worldMapFrame — I-8a; + panes/clustering/padding — I-8d, §4.4 A-41
                            I-8g: keys off countryKeyPoint, emits countries in paint order, and
                            carries pane.aspect — §4.4 A-48 C2′/C9/Part 6
                            I-8h: each pane's extent is over its IN-FRAME PARTS, the parts it is
                            not connected to get a 'detached' pane, and the frame carries `codes`
                            for the chip list — §4.4 A-49 C8′/C8″/C7′/Part 5
                            I-8i: ONE clusterPoints call over the canonical PART list, and every
                            component is a pane. C5/C6/C7/C7′/C8′/C8″ and `role` come OUT; the
                            pane gains `home` and an additive `weight` — §4.4 A-51 G2…G5
                            (SHIPPED at 10455b9)
                            I-8j: the pane comparator gains bounds.north desc + bounds.west asc
                            between home.length and the canonical position, so the last tie is
                            geography and the alphabet is the named last resort — §4.4 A-54 G5′
              index.ts      travelHistory — I-8a; + rowLifecycle — I-8c, §8.4 A-44
                            + rowDatesReadable — I-8e, §2.9 A-46 (isIsoDate on both stored dates)
                            + rowUnopenable(state, row) — I-8f, §2.9 A-47: the ONE union of the
                              three facts; rowDatesReadable stays, narrow, for the meta line
  store/      + exportStoredDoc(id) — I-8e: the stored bytes verbatim, no parse — §2.9 A-46 Part 4
                              I-8f: + refuses state.activeTripId (A-47 Part 5)
              + AppState.openFailures + noteOpenFailure() — I-8f, §2.9 A-47: F-D, written where
                the open fails, session-scoped, never persisted
cli.ts        --today refuses a calendar-invalid date via isIsoDate — I-8f, §2.9 A-47 Part 6
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
  (§2.10 stayed at 71 for this change), and I-7 consumes that module **by module path** instead of writing a
  second copy — and it stays off the surface there too (§8.4 A-31 Part 7).
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
  `'confirmed'` — architect; **its `travelStats` half is closed at revision 24 by §8.4 A-31, which fixes
  what `travelStats` reads and never reads a day→city edge, and the provenance half no longer blocks an
  increment**). Four further items go to the
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
  two arms separately. `packages/core` gains **one hand-written change and no other**; `countries.gen.ts` and
  the two goldens are regenerated. *(Corrected 2026-08-28, QA R24-1: as written this said "no hand-written
  change in any file", and A-28 Part 7 item 3 said `countryIndex.ts`'s A-27 text must not be touched. Its
  docstring's forgiveness census — "**54** of the 64 filled codes carry a second entry" — is precisely what
  this increment changes to **53**. The number is now 53; see A-28 Part 7 item 3's correction note.)*
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
  **BUILT at `0f52c4c` and verified by QA round 26**, which could not break the mechanism: over six
  concurrency shapes and forty rows every row was computed from its own document, no row carried another
  row's countries, `activeTripId` never moved, `state.doc` was never a non-active document, the retirement
  ledger never crossed a trip, and the fence ended on the active trip's own stored version. It also *built*
  the option BUILD-NOTES KD-57 refuses — reusing `writeAndSettle` for a non-active document — and confirmed
  it compiles clean and fails five ways, so KD-57 is pinned rather than argued. **What round 26 found is the
  bookkeeping around the write**: one MAJOR (`R26-1`, a deleted trip's card resurrected by an end-of-pass
  library snapshot installed off-chain) and three MINORs of the same shape (`R26-2`, `R26-3`, `R26-4`), plus
  two design defects routed to the architect and ruled as §8.4 **A-29** (`R26-5`) and §4.3 **A-30**
  (`R26-6`). All six are scheduled below as **I-6a**. **This increment is not re-opened**: what it shipped is
  what §8.4 clause 3 asked for, and I-6a repairs the pass around it.

#### I-6a — A-29 and A-30, and round 26's four bookkeeping bugs, as one pass

- **Built.** **Core (A-29):** `derive/summary.ts` gains a module-private acceptance gate for a city's
  **stated** `countryCode` — trim, `/^[A-Za-z]{2}$/`, uppercase, and *the shipped index must carry the code*
  — consulted **only** where `countryOf(city.centre, index)` is `null` and **never** over a non-null one.
  `TripSummaryCity` gains `countrySource: 'coordinate' | 'stated' | null`; `SUMMARY_VERSION` becomes **3**.
  `countryOf`, the index, the generator and `homeBase`'s exclusion (KD-55) do not move.
  **Client (A-30):** `StoragePort` gains
  `refreshSummary(id, expectedVersion: StorageVersion, summary): Promise<SaveOutcome>` — the same atomic
  compare-and-set, writing the summary row only, **carrying no document argument and minting no version** —
  implemented in `ports/memory.ts` (its own `refreshCount`, a new `failNextRefresh`, `saveCount` untouched)
  and in `apps/web/src/ports/storage.ts` (one `readwrite` transaction, put on `SUMMARIES` only).
  `runRescan`'s per-row link becomes uniform — `load` → `fromJSON` → `tripSummary` → `refreshSummary` —
  and the `attemptSave` branch for the active trip is **deleted**. **Client (round 26's four):** R26-1 the
  end-of-pass `listTrips()` result is installed on the chain or reconciled row-by-row rather than replacing
  `state.library` with an earlier snapshot; R26-2 `rescan.unreadable` is cleared **before** the early return
  and ids that have left the library are dropped; R26-3 a `null` `load` is as final as an unparseable one;
  R26-4 needs **no** condition — A-30 removes the stale fence it is about.
- **User-visible outcome.** A trip whose cities the dataset cannot draw — the Dalmatian islands are the
  measured case — stops claiming it visited no countries, and says which of its answers it worked out and
  which the user stated. A background rescan stops raising a conflict banner, with a *Merge* button and
  nothing to merge, in a tab nobody was typing in. A deleted trip's card stays deleted.
- **Architecture / data model.** §8.4 **A-29** and §4.3 **A-30**, both written as implementation briefs.
  **Read A-29 Part 2 first** — it is the census of what `City.countryCode` actually is (unvalidated,
  defaulting to `''`, written by no UI), and it is why the answer is a gate rather than a copy. **Read A-30
  Part 4 before "optimising" the write** — the finding's own remedy is measured and refused there, and the
  definition "unchanged" would have had to take is written down so the question does not reopen. A-30
  narrows §2.2a rule 1 by three words and amends §8.4 clause 1 by name; **no §4.2 rule changes**, the closed
  list of six document-installing methods is still six, and the rescan gets *further* from it.
- **Verification.** Exit criterion 7 in its revision-23 form, both halves. Plus the injected faults each
  ruling ships with, run individually and watched red:
  **A-29** — delete the stated fallback and the Hvar fixture goes back to `countryCodes: []`; let the stated
  value win and a Vienna city stating `HU` reports `HU`; `'hr'`/`'  HR  '` normalise, `''`/`'HRV'`/
  `'Croatia'`/`'ZZ'`/`'RE'` are refused, with `RE`'s reason in the test's own text.
  **A-30** — restore the `saveIfVersion` rewrite in `runRescan` and the two-tab fence test goes red (the
  assertion whose absence let R26-6 ship); make `refreshSummary` a no-op and the row never reaches
  `SUMMARY_VERSION`; drop its existence check and a summary appears for a document that is gone; hoist it
  one frame out of `chainOntoSaving` and the §4.3 structural grep goes red.
  **Round 26's four** — each of `qa/i6-ghostrow.mjs`, `qa/i6-unreadable.mjs` (§1 and §3),
  `qa/i6-converge.mjs` (§5 and §6) and `qa/i6-race.mjs` (§D and §E) passes, and each was watched failing at
  the parent commit first.
  **And the non-regression that is the strongest single check:** on the reference trip `countryCodes` is
  unchanged at `['AT','CZ','DE','GB','HR','HU','US']`, every city reports `countrySource: 'coordinate'`, and
  `npm run golden` regenerates with no diff apart from `summaryVersion` and the new field.
- **Dependencies / blockers.** I-6. No new external dependency. **`qa/` is in scope for this increment** —
  KD-58 records seven `core.tripSummary(trip)` call sites across five `qa/` scripts that still need
  `, core.COUNTRY_INDEX` appended, and the round-26 repros above cannot be re-run until they do.
- **Ship gate.** Exit criterion 7 passes in its revision-23 form; the 200-step dirty walk still holds; the
  closed list of six document-installing methods is still six and `retirement-ledger.test.ts` is
  byte-unmodified; the §4.3 structural grep finds **zero** `ports.storage.*` mutations outside
  `chainOntoSaving` with `refreshSummary` **not** on its exemption list; `Object.keys(core).length` is
  unchanged (A-29 adds no export — the gate helper is module-private); `npm run typecheck` and
  `npm run test:tap` are green; `npm run golden` diffs only where A-29 says it may. `EMITTED_BYTES` does not
  move, so A-27 Part 9's bundle-figure obligation does **not** apply to this increment.

#### I-7 — `travelStats`, and the record census the row was missing

*(Rewritten at revision 24 against `ARCHITECTURE.md` §8.4 **A-31**, which is the implementation brief. The
revision-23 entry asked for a function that could not be written from the row it was to be handed; what is
added is the row field that makes it writable, not a new capability.)*

- **Built.** Two core files and a CLI command.
  **`derive/summary.ts`:** `TripSummaryRow` gains
  `attribution: {places: {located, attributed}, stops: {located, attributed}}` — coordinate-bearing records
  and how many of them `countryOf` named — accumulated **in the walk that already visits them**, no second
  traversal and no new argument; `SUMMARY_VERSION` becomes **4**. Cities get no such field: `City.centre` is
  non-nullable, so the city census is already derivable from `cities[]`.
  **`derive/travelStats.ts`:** `travelStats(summaries: readonly TripSummaryRow[], today: IsoDate):
  TravelStats` — A-31 Part 4 verbatim. `countries` (code, `firstVisit`, `lastVisit`, `tripIds`), `cities`
  (`nameKey`, `name`, `countryCode`, `tripIds`), `trips` by lifecycle, `daysTravelled`, `located` and
  `unattributed` (each `{cities, places, stops}`), and `unnamedCities`.
  **`cli.ts stats`**, honouring `--today` and `--file`. **No client change and no port change.**
- **User-visible outcome.** None on screen yet; the numbers exist and are addressable from the CLI.
- **Architecture / data model.** **Every statistic is derived and nothing counts anything into storage**
  (§8.4 clause 2, §0.7) — and A-31 Part 6 states what that rule actually forbids, because *"no counts in
  storage"* was never it: a count may be stored only if it is a property of **exactly one document**, minted
  inside the write that carries it and stamped with `SUMMARY_VERSION`. `cityCount` qualifies and can be
  repaired by the rescan; `countriesVisited: 47` summarises a set of documents, has nothing to be recomputed
  from, and is the number a user can inflate by typing. `unattributed` is **on the type on purpose** — the
  honest hole is a field, not an omission — and `located` is its twin because `unattributed: 0` is otherwise
  ambiguous between *"everything was attributed"* and *"there was nothing to attribute"*.
  **Cities group by the pair `(nameKey, countryCode)` where `nameKey = normalizeCityName(name)`, never by
  `CityKey`** (§2.2 A-10): keys are opaque and per-trip, so two trips to Tokyo carry two of them and only
  the name can join them; the country is in the key because the same name in two countries must be two rows.
  A name folding to `''` **is not an identity** (§2.14 A-14 assertion 5) and is counted in `unnamedCities`
  rather than merged into a blank row. **A `planned` trip contributes no country, no city and no day**, and
  an `active` trip's days and `lastVisit` are **clamped at `today`** — A-31 Part 3; a map of everywhere you
  have been may not include a trip you have booked. `normalizeCityName` and the country index stay off
  §2.10 (§2.14 A-14); `lifecycle` is called, not reimplemented (sequencing rule 1).
- **Verification.** Exit criterion 6 in its revision-24 form, both halves. Plus, each with the fault that
  makes it red:
  - **The census matches a second program over the same trip** `[snapshot + stated]`. `travelStats` over the
    reference trip's single row reports `located.places`, `unattributed.places`, `located.stops` and
    `unattributed.stops` **equal to `fixtures/golden/countries.json`'s `places.withCoordinates`,
    `unattributedPlaces.length`, `stops.withCoordinates` and `unattributedStops.length`** — four numbers,
    two independent walks (`gen-golden.mjs` walks the document, `tripSummary` walks it again), one trip.
    **Injected fault:** drop `trip.pool` from the row census and the stop numbers diverge, because
    `countries.json` counts pooled stops and §8.4 clause 3's `countryCodes` union does too.
  - **"No places yet" is a different answer from "0 countries"** `[stated]`. A trip with one city, no
    places and no coordinate-bearing stop yields `located = {cities: 1, places: 0, stops: 0}`; a trip with
    **no city, no place and no stop** yields `located = {cities: 0, places: 0, stops: 0}` and that — not
    `countries.length === 0` — is the "no places yet" condition. **Injected fault:** make `located` a
    derived `countries.length === 0 ? 0 : …` and the first trip reports the second trip's answer.
  - **The honest hole is a count, not a silence** `[stated]`. A trip whose only city is at Hvar Town's
    coordinate with `countryCode: ''` (A-29's gate refuses `''`) reports
    `unattributed.cities: 1`, `located.cities: 1` and `countries: []`. **Injected fault:** count
    unattributed cities out of `located` as well and the hole becomes invisible.
  - **Grouping, both directions** `[stated]`. Two trips to `'  TOKYO  '` and `'Tokyo'`, both attributed
    `JP`, are **exactly one** row with **both** trip ids — a ceiling, not a floor. `'Springfield'` attributed
    `US` and `'Springfield'` attributed `CA` are **exactly two** rows. A city whose name folds to `''` is
    **zero** rows and `unnamedCities: 1`. **Injected fault:** group on `nameKey` alone and the two
    Springfields collapse to one; group on `CityKey` and the two Tokyos become two.
  - **A planned trip is not travel** `[stated]`. Three rows — one ending before `today`, one straddling it,
    one starting after it — give `trips: {planned: 1, active: 1, completed: 1}`, and the planned trip's
    countries, cities and days appear **nowhere else** in the output. The active trip contributes days from
    its `startDate` to `today` **inclusive** and no more, and its `lastVisit` is `today`. **Injected fault:**
    include planned trips and the planned trip's country appears in `countries`; drop the clamp and
    `daysTravelled` jumps to the active trip's full span.
  - **`daysTravelled` is a union** `[stated]`. Two completed trips overlapping by three days report
    `dayNumber` union, not the sum, while `trips.completed` is **2**. **Injected fault:** sum the spans and
    the number moves by exactly the overlap.
  - **Totality on malformed input** `[stated]`. A row with `endDate` before `startDate` — `validateTrip`
    reports it and `fromJSON` accepts it, so it reaches this function — contributes **one** day, a same-day
    `firstVisit`/`lastVisit`, and its countries; **no throw**. A duplicate row id **does** throw, naming the
    id. **Injected fault:** dedupe silently instead and a library with a duplicated row reports
    `trips.completed` one too low with nothing said.
  - **Purity** `[stated]`. Called twice on one input, deep-equal both times; called once on a
    structurally-mutated copy, the result differs; and the input array and its rows are **byte-identical
    after the call** (the sort is on a `slice()`). Output is independent of the caller's array order:
    the same rows shuffled give a deep-equal result.
  - **Non-regression on the only real trip we have** `[snapshot + legacy]`. `countryCodes` stays
    `['AT','CZ','DE','GB','HR','HU','US']`, every city still reports `countrySource: 'coordinate'`, and
    `npm run golden` diffs only in `summaryVersion`, the new `attribution` block, and the new
    `travel-stats.json`.
- **Dependencies / blockers.** **I-6a** (it consumes summary rows, and §8.4 A-29 changed what a row says),
  I-1 (`lifecycle` supplies the trip counts and is *called*, not reimplemented). No new external dependency.
  **This increment touches `derive/summary.ts`**, so it inherits I-6a's non-regression obligations — the
  A-29 gate tests must stay green untouched, and the country index, the generator, `countryOf` and
  `homeBase`'s exclusion (KD-55) do not move.
- **Ship gate.** Exit criterion 6 passes in its revision-24 form, both halves, including the
  `TripSummaryRow` count-field allow-list test with A-31 Part 6's block-quoted rule in its own text.
  `travelStats` is on §2.10's list and `Object.keys(core).length` is **75**, re-counted rather than quoted.
  Both goldens exist and were **derived, not written**: `countries.json` is unchanged and
  `travel-stats.json` is produced by calling `travelStats`, carries no coordinate, and passes the same
  no-float test `countries.json` has. `npm run typecheck` and `npm run test:tap` are green; the 200-step
  dirty walk still holds; the §4.3 structural grep is unchanged (this increment issues no storage
  mutation). `EMITTED_BYTES` does not move, so A-27 Part 9's bundle-figure obligation does **not** apply.
- **Ship gate — status at revision 25: NOT MET, and `travelStats` is not the reason.** QA round 28
  returned **SEND BACK** (1 BLOCKER, 1 MAJOR, 7 MINOR) at `db9dc1d`. The algorithm survived every attack —
  the interval union at eight boundaries, the `today` clamp on its five exact days, the composite city key,
  purity against a deep-frozen input, and a four-number oracle re-derived by a **third** program. What
  failed is the substrate and the gate: **R28-1 (BLOCKER)** — `dayNumber`/`fromDayNumber`/`weekdayOf` are
  wrong for every year below 1000, so `travelStats.test.ts:280`'s year-`0001` assertion is green while
  measuring **1901**, and a past trip recorded as year `0202` is written to storage unopenable; and
  **R28-2 (MAJOR)** — exit criterion 6, the gate in the line above, cannot catch a persisted
  `countriesVisited`. Both are ruled (§2.1 **A-32**, §8.4 **A-33**), together with **R28-6** (a residue
  A-31 Part 5 did not disclose), **R28-7** (§8.4 **A-34**) and **R28-8** (criterion E's stale count), and
  the four builder MINORs **R28-3**, **R28-4**, **R28-5** and **R28-9**. **All of it is I-7a.** I-7's own
  gate is re-run there and not here; nothing in this increment's Built or Verification lines is withdrawn.

#### I-7a — the calendar under the row, and a ship gate with teeth

*(Revision 25. Carries `ARCHITECTURE.md` §2.1 **A-32**, §8.4 **A-33** and §8.4 **A-34** — the three design
findings QA round 28 routed to the architect — plus round 28's four builder findings and two stale
ceilings. Same shape and same reason as I-5a, I-5b, I-5c and I-6a. **Owed before I-8**, which is the
increment that puts `travelStats` on screen.)*

- **Built.** Four files and two `qa/` numbers.
  **`packages/core/src/derive/summary.ts`:** `dayNumber`, `fromDayNumber` and `weekdayOf` re-implemented on
  the module-private `daysFromCivil` / `civilFromDays` pair A-32 Part 3 prints verbatim — proleptic
  Gregorian civil arithmetic, **no `Date` anywhere**, the year padded to four digits, and an explicit
  month normalisation so a shape-valid calendar-invalid date rolls over exactly as it always has.
  `parseIsoDate`, `addDays` and `dateSpan` are untouched. **`packages/core/src/derive/travelStats.ts`:**
  A-34's `provisional` on both row types, accumulated in the folds Part 4 steps 6 and 7 already run;
  A-31 Part 2's `Math.max(0, located - attributed)` clamp (R28-4); R28-3's third throw disclosed or
  removed; R28-5's `undefined`/`null` answer made one answer. **`test/stats-storage.test.ts`:** rewritten to
  A-33 — the row's whole key set, the memory port read back, the port argument and census, the import
  assertion, and the source sweep demoted to a tripwire over four roots. **`cli.ts`:** A-34's marker and
  legend on the `stats` output; R28-9's `--today bogus` exits with a message instead of a stack trace.
  **No client change, no port change, no engine, no `SUMMARY_VERSION` bump, no export surface movement.**
- **User-visible outcome.** A past trip recorded with a mistyped year is readable instead of destroyed, and
  the CLI stops claiming the traveller has been to a country they reach next week.
- **Architecture / data model.** **`IsoDate`'s domain is stated for the first time** — proleptic Gregorian,
  `0000-01-01` … `9999-12-31`, which is what `isIsoDate` has always implemented — and narrowing it instead
  (a floor at 1000 or 1900) is costed and refused in A-32 Part 2: an `IsoDate` is minted from user input
  at more than a dozen sites across **two** validators that do not share code, and the arithmetic is 30
  lines. `fromDayNumber` stays **total** — it renders an out-of-domain year faithfully rather than throwing
  — because the only path that reaches one runs through `validateTrip` on a document `fromJSON` accepted,
  and §2.1 forbids a throw there. A-33 moves exit criterion 6 from *what is declared* to *what is written*.
  A-34 puts the caveat **on the statistic** rather than in each surface, because a caller that recomputes
  it is a second expression of A-31 Part 3's population rule (sequencing rule 1).
- **Verification.** Exit criterion 6 in its **revision-25** form, all six parts, and `bash qa/i7-exit6.sh`
  with **all eight** faults red plus the two A-33 Part 6 adds (F9, F10). Plus, each with the fault that
  makes it red:
  - **Years below 1000 are real years** `[stated]`. `travelStats.test.ts`'s year-`0001` row keeps
    `daysTravelled === 365` and **gains the assertion that discriminates**: with a country code on the row,
    `firstVisit === '0001-01-01'` and `lastVisit === '0001-12-31'`. A second row spanning
    `0500-06-01`…`0500-06-10` reports `firstVisit === '0500-06-01'`. **Injected fault:** restore
    `Date.UTC(y, m-1, dd)` in `dayNumber` alone and the first goes red naming `1901-01-01`; restore the
    unpadded year in `fromDayNumber` alone and the second goes red naming `"500-06-01"`.
  - **`weekdayOf` is proleptic Gregorian** `[stated]`. `weekdayOf('0001-01-01') === 'Mon'`, where the
    shipped code answers `'Tue'` (1901's). **Injected fault:** restore the `new Date(Date.UTC(...))`
    construction.
  - **The roll-over `fromJSON` permits does not move** `[legacy]`. `dayNumber('2026-13-45')` is
    `2027-02-14`'s and `dayNumber('2026-02-30')` is `2026-03-02`'s, exactly as before; `validateTrip` throws
    on no document `fromJSON` accepts. **Injected fault:** drop A-32 Part 3's month-normalisation lines and
    `2026-13-45` moves by a day or two with nothing else failing.
  - **`packages/core/src` contains no `new Date(` and no `Date.UTC`** `[stated]` — the determinism grep's
    long-standing two-site exception is deleted rather than widened. **Injected fault:** either
    construction returning.
  - **A round trip over the domain** `[stated]`. `fromDayNumber(dayNumber(d)) === d` at `0000-01-01`,
    `0099-12-31`, `0100-01-01`, `0999-12-31`, `1000-01-01`, `1970-01-01` and `9999-12-31` — the two fault
    bands' edges by name.
  - **A past trip recorded as year `0202` survives a cold start** `[stated]`. Through the real client store
    and the real port: `createTrip`, write, reload, `fromJSON` — the trip opens, its days are
    `0202-01-01`…, and `validateTrip` reports what it should. This is `qa/i7-pastyear.mjs`, which is 3 FAIL
    by design today and must be ALL OK. **Injected fault:** any of the three helpers reverted.
  - **`provisional`, both directions** `[stated]`. A two-row library — one completed trip to `AT`, one
    active trip to `AT` and `GB` — reports `GB` provisional and `AT` **not** provisional. **Injected
    fault:** hardcode either value and one of the two assertions goes red. The CLI prints the marker and
    the legend, and prints neither when nothing is provisional.
  - **A stored row whose census is impossible does not produce a negative number** `[stated]`. A row with
    `attributed > located` contributes `0` to `unattributed` and its `located` unchanged; no throw.
  - **Non-regression** `[snapshot + legacy]`. `npm run golden` diffs **only** in `travel-stats.json`'s new
    `provisional` fields; `countries.json` is byte-identical; the sample's source sha does not move;
    `Object.keys(core).length` is still **75**; the reference row is still 864 bytes with 0
    coordinate-shaped floats.
- **The two stale ceilings** (QA **R28-8**, BUILD-NOTES **KD-65**), both one-line edits, both re-derived by
  running rather than quoted: nine `qa/` scripts pin `Object.keys(core).length === 73` and must say **75**
  (`qa/r13-gate-citykey.mjs:451` and `:456` — the second is §2.10's group-count sum, which is also 75 —
  `qa/r14-horizon-copy.mjs:916`, `qa/r15-place-copy.mjs:682`, `qa/r16-copy-depth.mjs:741`,
  `qa/r17-hours-parser.mjs:628`, `qa/r18-readonce.mjs:549`, `qa/r19-census-gaps.mjs:490`,
  `qa/r20-census-reach.mjs:499`, `qa/r21-closure.mjs:139`); and `qa/r14-horizon-copy.mjs:954` pins
  `kds.length === 53` where BUILD-NOTES now holds **65**, contiguous `1..65`, verified by counting. Both
  ceilings stay strict equalities — never relaxed to `>=` — and the comment above each records which
  increment moved it and why.
- **Dependencies / blockers.** I-7. No new external dependency. **Touches `derive/summary.ts` and
  `derive/travelStats.ts`**, so it inherits I-6a's and I-7's non-regression obligations: the A-29 gate
  tests stay green untouched, the country index, the generator, `countryOf` and `homeBase`'s exclusion
  (KD-55) do not move, and the four-number `countries.json` cross-check still holds.
- **Ship gate.** I-7's ship gate re-run in full, plus: exit criterion 6 in its revision-25 form with
  `qa/i7-exit6.sh` at **10 of 10 faults red**; `qa/i7-year.mjs` and `qa/i7-pastyear.mjs` **ALL OK** where
  they are 8 and 3 FAIL by design today; `qa/i7-edges.mjs`'s **R28-4 and R28-5 sections** green and
  `qa/i7-rescan.mjs`'s **R28-3 section** green (each is FAIL by design today — the remaining `i7-edges`
  failure is the breaker's own sentinel-collision expectation and is theirs to re-express, not a gate
  condition here); `npm run typecheck` and `npm run test:tap`
  green; `Object.keys(core).length` re-counted; `qa/r2-constraints.mjs` no worse than its one known
  R2-18 FAIL. ~~**A-33 6b-4's Chromium read-back is *named* here and is not a gate condition** — it is a
  `qa/` probe, it needs a browser, and the gate is 6b-1…6b-3.~~ *(Revision 26: the first half stands — it
  stays out of `npm run test:tap` — and the second is **superseded by §8.4 A-36 Part 4**: it is a required,
  **recorded** ship-gate condition for any increment touching the web port, and round 29 both wrote it
  (`qa/i7a-idb-rowkeys.mjs`) and ran it here, so *"there is no browser in this environment"* is no longer
  a reason.)*
- **Ship gate — status at revision 26: NOT MET, and the calendar is not the reason.** QA round 29 returned
  **SEND BACK** (0 BLOCKERS, 2 MAJOR, 5 MINOR) at `527d3a1`. **A-32 is closed end to end and closed
  properly** — re-derived against Fliegel–Van Flandern, Zeller and a brute-force walker rather than against
  `Date.UTC`, which is blind below year 100 and had therefore been blind in exactly the band the BLOCKER
  lived in; `packages/core/src` now contains zero `Date` constructions and `validateTrip` can see a
  day-drift again. **A-34 holds at every lifecycle boundary.** R28-3, R28-4, R28-5, R28-6, R28-8 are closed.
  What did not close is **R28-2, reopened as R29-1 (MAJOR)**: A-33's 6b-2 is a whole-file grep, and the
  fault it exists to forbid still reaches a real IndexedDB record with exit criterion 6 at **14/0**, the
  suite at **835/0** and `tsc` clean on both projects. Round 29 added **R29-2 (MAJOR)** — the *exact*-date
  branch of both trip forms is unbounded — plus **R29-6** and **R29-7**. All four are ruled (§2.3 **A-35**,
  §8.4 **A-36**, §8.4 **A-37**) and scheduled with the three builder findings **R29-3**, **R29-4** and
  **R29-5** as **I-7b**. Nothing in this increment's Built or Verification lines is withdrawn; I-7a's own
  gate is re-run in I-7b and not here.

#### I-7b — a gate that executes the port, and a bound on the day skeleton

*(Revision 26. Carries `ARCHITECTURE.md` §2.3 **A-35**, §8.4 **A-36** and §8.4 **A-37** — the four design
findings QA round 29 routed to the architect — plus round 29's three builder findings. **Owed before
I-8**, for the same reason I-7a was: I-8 is where `travelStats` reaches a screen.)*

- **Built.** Three sources (two in core, plus `cli.ts`), one test file, two `qa/` harness fixes, plus prose.
  **`packages/core/src/build/days.ts`:** the module-private `MAX_TRIP_SPAN_DAYS = 3653` and A-35's
  refusal, placed **after** the widening loop and **before** the allocation loop, comparing `span + 1`;
  `createTrip`'s and `setTripMeta`'s `@throws` lines gain the third throw by name. **No export**, so
  §2.10 does not move and neither form changes.
  **`packages/core/src/derive/travelStats.ts`:** A-37's two module-private read gates — `inDomain()`
  applied to `todayNum`, `a` and `rawB`, and `isMintedCode()` applied to `row.cities[].countryCode` (read
  once, deciding the count, the key and the emitted value together) and to each `row.countryCodes[]`
  entry; the composite-key docstring rewritten to cite the gate instead of the mint, and `lifecycle`'s
  `@throws` prose corrected where it claims a document's validators stand behind a row.
  **`test/stats-storage.test.ts`:** A-36 — 6b-1 gains its **web-port arm** (the shipped port,
  type-stripped and evaluated as a `data:` module, driven against the recording double, with the double's
  own fidelity assertions beside it); 6b-2 keeps its site count and its bare-identifier capture, loses its
  parameter assertion, and says in its own prose that it is a tripwire; 6b-3's failure message asks for an
  **executed arm**, not a recipe.
  **`cli.ts`:** R29-3 — `--today` is normalised or refused, so the header and the lifecycle verdict cannot
  name a date the numbers below them were not computed for.
  **`qa/i7-faults.sh`, `qa/i7-exit6.sh`:** R29-4 — a fault whose patch does not apply is a **failure**,
  loudly and in the exit code, not a line that reads like a pass.
  **`docs/BUILD-NOTES.md`:** R29-5 — the two "could not verify" items that were verifiable, corrected with
  the measurements round 29 made (the bundle delta bisected: A-32 **+511**, `travelStats` **−95**).
  **No client change, no port change, no engine, no `SUMMARY_VERSION` bump, no export-surface movement.**
- **User-visible outcome.** A mistyped year in the trip form says so instead of quietly building a
  quarter-gigabyte trip; and the ship gate can, for the first time, catch a lifetime count on its way into
  the browser's own database.
- **Architecture / data model.** **The bound on the day skeleton is a bound on the mint, not on the type.**
  A-35 refuses a floor on `IsoDate` for A-32 Part 2's reasons and because a year floor would not have
  caught this (`1900-01-01 → 2500-12-31` is 219,000 days of ordinary years); the cap is on **span**, it is
  3,653 days for the reasons A-35 Part 3 measures, and it is a refusal boundary rather than a product rule
  about how long a trip may be. **The gate stops reading source text for the one port it could not run.**
  A-36's finding is that re-scoping the grep does not enforce the invariant either — a reassigned parameter
  defeats every static form of it — so the ruling is that *execution* is the mechanism and the static check
  is a tripwire. **A row is not a document** (A-37): nothing revalidates a `TripSummaryRow` on read, so
  every claim `travelStats` makes about a field it read is discharged on the read.
- **Verification.** Exit criterion 6 in its **revision-26** form, and the new day-skeleton criterion. Plus,
  each with the fault that makes it red:
  - **The span cap holds at both edges** `[stated]`. `2020-01-01 → 2029-12-31` creates (3,653 days);
    `2020-01-01 → 2030-01-01` throws (3,654); `0202-01-01 → 2020-12-31` throws and the message names the
    span, the cap and both dates. Through the product path as well as the unit: `store.createTrip` rejects
    and `PastTripForm`'s existing `catch → onError` puts the message on screen. **Injected fault:** delete
    the check → 664,377 days and no issue from `validateTrip`; compare the exclusive span → the 3,653 case
    goes red.
  - **The web port is executed and read back** `[stated]`. `qa/i7a-exit6b.sh`'s **G1** and **G4** go red,
    as do **G7** (the parameter reassigned before an unchanged put) and **G8** (a third `SUMMARIES.put`
    site writing a *correct* row, which only 6b-2's site count sees). The ten A-33 Part 6 faults stay red.
    **Injected fault:** each of the four, applied alone in a throwaway worktree, with the count recorded.
  - **The double is not lying** `[stated]`. Beside the key assertions: a stale `expectedVersion` refuses
    and writes nothing; `refreshSummary` on an absent record refuses; `refreshSummary` leaves the record's
    `StorageVersion` unchanged (§4.3 A-30). **Injected fault:** break the double's transaction settling and
    these go red before the key assertions can give a false green.
  - **The real bytes, recorded** `[stated]`. `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node
    --experimental-strip-types qa/i7a-idb-rowkeys.mjs` is **ALL OK**, and `--fault` is **3 FAIL**, both
    recorded in BUILD-NOTES with the measured key count. A disclosed gap if no browser exists; not a pass.
  - **A stored row cannot emit a non-`IsoDate`** `[stated]`. A row with `endDate: '9999-13-45'` reports
    `lastVisit === '9999-12-31'` and every emitted date matches `/^\d{4}-\d{2}-\d{2}$/`; the row still
    counts, still contributes its countries, and nothing throws. **Injected fault:** remove `inDomain` and
    `lastVisit` is `"10000-02-14"`.
  - **A stored country code is read through the mint's own shape** `[stated]`. `'--'`, `''`, `'A|'` and
    `'hr'` all read as `null`: counted in `unattributedCities`, emitted as `null`, and `'--'` + `Paris`
    groups with `null` + `Paris` into **one** row (A-31 Part 5 residue 6, not a collision); `'A|'` + `'x'`
    and `'A'` + `'|x'` are **two** rows. A malformed `countryCodes[]` entry produces no
    `TravelStatsCountry`. **Injected fault:** drop the gate and the merge and the collision both come back.
  - **`--today` is normalised or refused** `[stated]`, R29-3. `stats --today 2026-13-45` and `trip --today
    2026-13-45` never print a date the numbers were not computed for. **Injected fault:** echo the raw
    argument.
  - **An unrun fault is a failure** `[stated]`, R29-4. Drift an anchor in `qa/i7-faults.sh` and
    `qa/i7-exit6.sh` and both report FAIL and exit non-zero, where today they print
    `(patch failed to apply — shape moved)` and exit 0.
  - **Non-regression** `[snapshot + legacy]`. `npm run golden` produces no diff (A-37's gates change no
    number on the reference corpus — the row's codes are minted and in-domain — and if one moves, that is a
    finding, not a golden to regenerate); the sample's source sha does not move;
    `Object.keys(core).length` is still **75**; the reference row is unchanged and still
    `summaryVersion: 4`; `npm run typecheck` and `npm run test:tap` green; `qa/r2-constraints.mjs` no worse
    than its one known R2-18 FAIL.
- **Dependencies / blockers.** I-7a. **No new external dependency, and specifically not a browser in the
  gate** — the recording double is ~80 lines of test-only code with no imports beyond `node:*`, and the
  Chromium probe stays in `qa/`. Touches `derive/travelStats.ts` and `build/days.ts`, so it inherits I-7a's
  and I-6a's non-regression obligations: the A-29 gate tests stay green untouched, the country index, the
  generator and `countryOf` do not move, the four-number `countries.json` cross-check still holds, and
  A-32's date helpers are not edited by this increment at all.
- **Ship gate.** I-7a's ship gate re-run in full, plus: exit criterion 6 in its revision-26 form with
  `qa/i7-exit6.sh` at 10 of 10 red and `qa/i7a-exit6b.sh` at **G1, G4 and G7 red** (G2, G3, G5, G6 stay
  red); the new day-skeleton criterion at both edges; `qa/i7a-span.mjs` **ALL OK** where it is 2 FAIL by
  design today; `qa/i7a-provisional.mjs` §4 and `qa/i7-edges.mjs` re-expressed to A-37 Part 4's stated
  answer **by the breaker, not by the builder** — a builder who edits a probe's expectation to match their
  own output has removed the check; and the Chromium read-back run and recorded, or its absence disclosed.
  *(Manager, 2026-08-29: `qa/i7a-today.mjs` **ALL OK** is withdrawn as a required I-7 criterion. It was
  written into this gate at the same revision-26 commit that scheduled R29-3 into I-7b expecting R29-3 to
  close here; R29-3 did not close — the builder declined it as a contract collision (fixing it as specified
  would move `Object.keys(core).length` from 75 to 77, contradicting this increment's own non-regression
  line), round 30's breaker independently confirmed that reasoning, and no architect ruling has ever been
  issued on it. The manager accepts the existing deferral rather than reopening it or implementing R29-3
  just to satisfy this line. **R29-3 is not dropped**: it stays open and tracked in `QA-FINDINGS.md`
  exactly as every round since 29 has carried it — "STILL OPEN," "validly deferred" — and remains available
  to route to the architect in a future increment. This edit changes only what I-7's ship gate requires; it
  is not a ruling on R29-3 and does not touch A-39 or any other verification gate.)*

#### I-8 — The Map and Profile surfaces — **split at revision 27 into I-8a and I-8b**

*(**This spec is not superseded and is not rewritten.** It is the shared specification both halves are
measured against; I-8a and I-8b below say which half of it each carries, and add only what the split and
`ARCHITECTURE.md` §4.4 **A-40** make necessary. **2b ships at the end of I-8b**, not of I-8a. One clause of
what follows is overruled by A-40 Part 5 and only one: **city pins are not built** — the row carries no
coordinate. Everything else stands as written.)*

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
  **A country or city the traveller has not been to yet is never rendered as one they have** (revision 25,
  QA **R28-7**, §8.4 **A-34**). An `active` trip contributes **all** of its countries, un-clamped by the day
  it has reached, because the summary row carries no day-level attribution — A-31 Part 5 residue 2, and it
  is not reopened here. What that residue is licensed on is that the contribution is **marked**:
  `travelStats` hands every country and city row a `provisional: boolean`, true exactly when no `completed`
  trip contributed it, and **this surface renders a provisional row visibly differently from a confirmed
  one** — the same *"not yet true"* treatment the product already uses for an unaccepted copied stop
  (§2.14), not a novel one, and **not** the same ink on the filled map. The rule is the root `CLAUDE.md`
  convention — never present a plan as an accomplished fact — reaching the one surface that summarises a
  whole travel life. Provisional rows are **marked, not hidden**: excluding them is the alternative residue
  2 already refused, because it tells a traveller standing in Vienna that they have never been.
- **Verification.** A hidden-then-shown map fits correctly on tab activation; a one-country history does not
  exceed the min-span guard; a `null` attribution renders as *unattributed* and never as the nearest
  country; a dimmed pin for a copied, unaccepted stop, asserted on the rendered output. The rescan indicator
  from I-6 is visible on screen and not merely in state.
  **A provisional country is asserted on the rendered output** `[stated]`: a library of one completed trip
  to `AT` and one active trip to `AT` and `GB` renders `GB` in the provisional treatment and `AT` in the
  confirmed one, on both the map and the profile, in the same pass. **Injected fault:** render
  `provisional` rows identically to confirmed ones and the assertion goes red — which is the fault that
  shipped in `cli.ts stats` and was found by a breaker rather than by a test.
  **And `travelStats` is rendered behind a boundary that can refuse** (revision 26, §8.4 **A-37** Part 2).
  A stored summary row is not a validated document, and a row whose date is not even shape-valid still
  throws out of `travelStats` by A-31 Part 4's sanctioned `@throws` — there is no honest lifecycle for it
  and `TravelStats` has no `Issue` channel to degrade into. So the Map and Profile catch it and show
  *"we could not read your travel history"* with the offending row id, rather than a blank screen or an
  unhandled rejection. Every other malformation A-37 handles inside `travelStats` and this surface never
  sees.
- **Dependencies / blockers.** I-5, I-6, I-7, **I-7a**, **I-7b** — A-32's dates round-trip and A-34's
  `provisional` land in I-7a, A-37's read gates in I-7b, and this is the increment that would otherwise
  render all three wrong on screen.
- **Ship gate.** **2b is independently shippable here.** Criteria 4, 5, 6 and 7 all pass; the map bugs have
  a test each rather than a comment each.

#### I-8a — The tab shell, the world map, and the token layer

*(Revision 27. Carries `ARCHITECTURE.md` §4.4 **A-40**. Takes the map half of I-8's spec above, plus the
visual-language work the surface cannot be built honestly without. **Not** the Profile — that is I-8b.)*

- **Built.** **`packages/client/src/selectors/worldMap.ts`:** `worldMapFrame` to A-40 Part 3 — the
  equirectangular projection, the `viewBox`, the `d` strings, `provisional`, `tripIds`, `missing`, and the
  extent from core's own `mapBounds`. Pure, zero-dependency, `node --test`-able with no browser.
  **`apps/web/src/views/WorldMap.tsx`:** the renderer, under A-40 Part 4's W1/W2 — no layout geometry, no
  coordinate arithmetic, hit testing on the `<path>`. **The tab shell:** navigation becomes tabs rather than
  one screen, sized for **Trips · Map · Profile** and no fourth slot (I-8's *"no DISCOVER tab"* stands). It
  renders the two tabs that have content; **Profile is registered by I-8b, not stubbed here** — an empty tab
  is the promise-of-something-not-yet-true this product refuses, and the shell is built so adding it is a
  registration, not a second shell. **The token layer:** the type scale, rule weights, radii and the signal
  channels declared once as custom properties in `apps/web/src/styles.css`, recovering the live planner's
  editorial-cartographic language rather than inventing one; `packages/tokens` moves only if a value is
  needed by both CSS and the Leaflet port. **Two removals, named:** the `.topbar__mark` gradient-plus-glow
  and the `.topbar` `backdrop-filter: blur(8px)`. **And the signal-collision fix** — see below.
  **No engine change, no `StoragePort` change, no `MapPort` change, no change to `apps/web/src/ports/map.ts`,
  no `SUMMARY_VERSION` bump, no export-surface movement, and no new runtime dependency.**
- **User-visible outcome.** *"Show me everywhere I've been"* — the countries filled from the bundled index,
  a country tapped for its trips, a provisional country visibly not a visited one, and an honest statement
  of what could not be filled. Plus a planner that stops signalling two different things with one channel.
- **Architecture / data model.** A-40 in full, and its Part 5 is the scope line: **filled countries, no city
  pins**, because `TripSummaryRow.cities[]` carries no coordinate and manufacturing one is a
  `SUMMARY_VERSION` ruling, not a UI decision. **The signal-collision fix is a design defect, not polish:**
  `.stop--dim { opacity: .72 }` is today the *only* mechanism for *"not yet accepted"*, and it composes on
  the same element with `.stop--flag`, so a copied stop that also has a conflict renders **both** signals
  degraded — opacity multiplies the blocker's own colour. Provenance and severity are **orthogonal channels**
  and must be carried by orthogonal means: provenance is a mark (badge, hairline, credit line) that does not
  attenuate anything composed with it; severity keeps its full-strength colour whatever the provenance. This
  is load-bearing for this increment specifically, because A-34's `provisional` is a **third** thing that
  needs a channel on the same surface — with three signals and one opacity multiplier they cannot all be
  read. **Big Shoulders / Public Sans / IBM Plex Mono are candidates**, validated against rendered I-8a
  output in this increment and settled only after it — not assumed.
- **Verification.** A-40's clauses, each with the fault that makes it red:
  - **The world map fits correctly when its tab was hidden at mount** `[stated]`. Boot on Trips, switch to
    Map, and the rendered `viewBox` equals the one `worldMapFrame` returned. **Injected fault:** compute the
    `viewBox` from a measured client rect in the component and the assertion goes red at 0×0. W1 also has a
    greppable ceiling: `getBoundingClientRect`, `offsetWidth`, `offsetHeight` and `ResizeObserver` do not
    appear in `WorldMap.tsx`.
  - **~~A one-country history does not exceed the min-span guard~~** — **rewritten at revision 28 under
    §4.4 A-42; the old text is struck rather than deleted because I-8a was scored against it.** It named
    `AT`, and `AT` is **630.97 km** and never clamps: re-derived across all 239 shipped codes, **`VA` is the
    only code that clamps**, at exactly `MIN_SPAN_KM` = 1.2 km — which is itself a rooftop window
    (`cluster.ts:104`: *"a zoom-16 window is ≈1.2 km wide"*). So the criterion was **unsatisfiable as
    written and its injected fault was green**, and the surface has no scale reference for it to have
    measured anyway. Replaced by:
  - **Every pane's frame contains what it draws, with margin** `[stated]`. For each pane of
    `worldMapFrame`'s output: the `viewBox` has strictly positive width and height, and **strictly
    contains, on all four sides, every vertex of every `d` string drawn in that pane** (§4.4 A-41
    invariant I4, A-42 ruling (b)). Asserted in bare Node against the shipped sample *and* against the
    single-country library `VA` — the one code in 239 whose box is narrower than `MIN_SPAN_KM`, which is
    the degenerate case the guard actually exists for. **Injected fault:** drop A-41 Part 4's padding term
    and the containment assertion goes red on the extreme country in every pane. *(R33-6 measured the
    shipped inset at exactly **0.000000**, so this criterion is **discharged by I-8d, not by I-8a as
    shipped** — I-8a's measured state is recorded as R33-6 and is not re-scored here.)*
  - **A provisional country renders differently from a confirmed one, on the map, asserted on the rendered
    output** `[stated]` — I-8's own criterion, map half. One completed trip to `AT` and one active trip to
    `AT` and `GB`: `GB` provisional, `AT` confirmed, different fills. **Injected fault:** render them alike.
  - **A code the index cannot fill appears in `missing` and on screen** `[stated]`. **Injected fault:** drop
    it silently and the count disagrees with the row.
  - **`travelStats` is rendered behind a boundary that can refuse** — I-8's A-37 criterion, map half: the
    Map tab shows *"we could not read your travel history"* with the row id rather than a blank screen.
  - **The two signals are separable** `[stated]`. A copied, unaccepted stop **that also has a blocker**
    renders the blocker at full strength *and* the unaccepted mark, asserted on rendered output — the
    existing Playwright probes are where this lands. **Injected fault:** restore the shared opacity and the
    blocker's computed colour moves.
  - **Neither removal comes back:** no `backdrop-filter` and no `linear-gradient` in a chrome fill, asserted
    over computed style in the same probe. These are the first two of the five computed-style assertions in
    `docs/VISUAL-TELLS.md` — an advisory checklist, read once before writing CSS and once at rendered
    verification, which **does not outrank a design decision this document or an approved design pass made**.
  - **The payload ceiling** (A-40 Part 5): the emitted `d` total for the reference library is **measured and
    recorded** in `BUILD-NOTES.md`. Over 512 KB is a finding, not a licence to simplify geometry.
- **Dependencies / blockers.** I-7b (shipped). Nothing else.
- **Ship gate.** A-40's W1 grep is clean; every criterion above has its injected fault red; the map bugs have
  a test each rather than a comment each. **2b does not ship here** — the phase's map/identity pair is only
  half delivered until I-8b.

#### I-8c — the two data-integrity gates: the date parser, the lifecycle read, and a way out of a dead tab

*(Revision 28. Carries `ARCHITECTURE.md` §2.9 **A-45** and §8.4 **A-44**, plus **BLD-3** from the I-8a
routing, which is the same screen. **Runs before I-8b.** Small on purpose: it touches one core function, one
client selector and one component, and it is shippable on its own the day it is written. It is independent
of I-8d — they share no file — but it goes first, because it is the one that stops wrong data being written.)*

- **Built.** **`packages/core/src/serialize/fromJSON.ts`:** the local `isoDate()` helper stops hand-rolling
  `/^\d{4}-\d{2}-\d{2}$/` and calls **`isIsoDate`** — the file's own *"ONE date validator in core"* — so a
  calendar-invalid date is refused with a `TripParseError` and its JSON path, at every date field the parser
  reads (A-45). **`packages/client`'s selectors:** `rowLifecycle(row, today): Lifecycle | null`, beside
  `travelHistory` and built the same way, and `LifecycleChip` renders an explicit **unreadable** chip for
  `null` instead of throwing (A-44). **`apps/web/src/App.tsx`:** `TabBoundary` gets a reset — a *"Try
  again"* that clears `message` — and the user gets **one** recovery control that does not live inside the
  surface that threw (BLD-3). **No `SUMMARY_VERSION` bump, no `schemaVersion` bump, no export-surface
  movement (still 75), no engine change, no `StoragePort` or `MapPort` change, no new dependency.**
- **User-visible outcome.** A backup file with a date that does not exist is refused, in words, naming the
  field — instead of loading and quietly telling you that a trip you took never happened. And a single
  unreadable stored row stops taking the whole app down with no way back.
- **Architecture / data model.** A-45 and A-44 in full. A-45 is A-20's own sentence applied to the one field
  it was never applied to (*"`fromJSON` decides whether a document IS a `Trip`"*, and §2.1 A-32 says an
  `IsoDate` is a real proleptic-Gregorian date); it **narrows** A-20 in one field and contradicts nothing.
  **What deliberately does not move:** `parseIsoDate`/`dayNumber`/`fromDayNumber` stay total and keep their
  exact answers, A-32's month normalisation is not removed, `validateTrip`'s `invalid_calendar_date` is not
  deleted (it is defence in depth for objects that never met the parser), and **no plausibility floor, clamp
  or auto-repair is added** — A-32 Part 5 refused one and this does not reopen it.
- **Verification.**
  - **The parser refuses a date that does not exist, and says where** `[stated]`. Exactly these outcomes,
    as a ceiling and not a floor: `"2026-02-30"`, `"2026-02-31"`, `"2026-02-29"`, `"2026-04-31"`,
    `"2026-13-01"` and `"2026-00-00"` are each **refused** with a `TripParseError` whose path names the
    field (`$.startDate`, `$.days[n].date`, `$.bookings[n].startsAt.date`); the six already refused
    (`"202-01-01"`, `"10000-01-04"`, `"2026-8-7"`, `""`, `"March 2019"`, `"not-a-date"`) still are; and a
    valid document round-trips byte-identically. **Injected fault:** restore the local regex and the six new
    refusals go green — which is the state I-8a shipped in.
  - **The wrong answer is unreachable from the shipped write path** `[stated]`. Measured before the fix, my
    own run: `2026-13-01 → 2026-13-02` imports clean, `lifecycle` says **`planned`**, and `travelStats`
    contributes **0 days and none of its countries** — a trip taken in 2026 is silently absent from
    *everywhere you have been*. After: `store.importDoc` refuses and the message with its path reaches the
    screen. **Injected fault:** as above.
  - **3a. One unreadable row costs one row, on the Trips list** `[stated]`. A library of three rows, one
    with a shape-invalid date: the Trips tab renders the two good rows, the bad row shows the **unreadable**
    chip, and the tab does not go down — the surviving control set contains the two good cards and their
    Delete controls, not `["BUTTON:CAIRN","BUTTON:TRIPS","BUTTON:MAP"]`. **Injected fault:** call
    `core.lifecycle` directly inside `LifecycleChip` and the tab blanks — this is R33-3 reproduced, so the
    fault is the shipped behaviour and must measure red.
    *(Revision 29: this was one criterion with a Map clause welded on. The clause was **unmeetable as
    literally written** — see 3b — so it is split rather than quietly dropped, and 3a is the half that was
    always real. 3a says nothing about a **calendar**-invalid row, which renders as a healthy card in this
    increment and is **I-8e**'s subject, not this one — §2.9 **A-46**.)*
  - **3b. The Map refuses the aggregate, and the arm that names a row is driven by the fault that reaches
    it** `[stated]`. Two assertions, because there are two arms and one input cannot reach both:
    (i) with 3a's library loaded, `travelHistory` returns `{ok:false, rowId:null}`, the Map tab renders its
    refusal **in words** (*"We could not read your travel history"*) and draws **0** `path[data-code]`
    elements — there is no drill-down to reach, because `core.travelStats` refuses the whole library for the
    same reason `rowLifecycle` refuses the row (round 34 swept 7 × 6 date-fault pairs and found no input
    that separates them); (ii) a library carrying a **duplicate summary id** — A-31 Part 4's *other* refusal
    — returns `{ok:false, rowId:'<the id>'}` and the surface names that row. **Injected fault:** remove
    `WorldMap.tsx`'s `if (!history.ok)` arm and (i) becomes an unhandled throw and a blank tab; drop the
    `rowId` parse in `travelHistory` and (ii) stops naming the row.
    **`LifecycleChip`'s gate stays in the Map drill-down and is not asserted here.** It is defence in depth
    that no input can currently exercise — a drill-down lists only a country's `tripIds`, which contains
    only rows `travelStats` accepted — and A-46 Part 5 states the trigger that would make it load-bearing
    again (an `Issue` channel on `travelStats`, a per-row skip instead of a throw, or a drill-down fed by
    anything other than `tripIds`). Removing it as dead code reopens A-46.
  - **The boundary has a way out** `[stated]`, on rendered output. With the bad row planted, the set of
    visible controls contains at least one recovery control **outside** the tab that threw; after the cause
    is removed, pressing *"Try again"* clears the banner and the tab renders. **Injected fault:** remove the
    reset and the banner survives the cause — round 33 watched that happen (`qa/r33-render.mjs` §F).
  - **Nothing else moved** `[stated]`. `npm run golden && npm run sample && git status --porcelain` leaves
    the tree clean at sha `40955ca0b182…`; `Object.keys(core).length` is **75**; `npm run typecheck` and
    `npm run test:tap` are green. **The tests that legitimately move are named in advance and are exactly
    these:** `packages/core/test/serialize.test.ts:154` (rewritten to assert the refusal and its path, with
    the `invalid_calendar_date` reporting test re-pointed at a `Trip` built directly) and
    `packages/core/test/dates.test.ts:153`'s comment about the reachable path (corrected to name the
    stored-row route). **Any other red test is a finding, not a licence to edit it.**
- **Dependencies / blockers.** I-8a (shipped). Nothing else.
- **Ship gate.** Every criterion above has its injected fault red; the moved-test list is exactly the two
  named; goldens and sample byte-stable; export surface **75**, re-counted rather than quoted; the root
  read-only boundary and §6.6 unchanged (`qa/r2-redact.mjs` still **0 KNOWN_LEAKS**).

#### I-8d — the atlas frame: the world map stops being a map of the wrong subject

*(Revision 28. Carries `ARCHITECTURE.md` §4.4 **A-41** and **A-42** — Jacob's atlas-style decision and the
withdrawal of the min-span claim — and answers QA **R33-1** and **R33-6**. **Runs before I-8b.** A builder
reads A-40 Parts 3–5, then A-41 and A-42, and needs nothing else in `ARCHITECTURE.md` except §2.10's list.)*

> **Built, verified, and found not shippable as designed — revision 33.** QA round 36 attacked this
> increment and could not find a single place where the code disagrees with A-41 or A-42; **R33-1 is
> genuinely fixed** and every criterion below was independently re-derived, including the reference panes
> and the 30.2827° × 16.1550° main span. It then found **two MAJOR defects in the ruling itself** — a key
> point that lands in the ocean (R36-1) and a partition that depends on the row order (R36-2) — ruled as
> `ARCHITECTURE.md` §4.4 **A-48** and scheduled as **I-8g**. Nothing below is rewritten: it is all true of
> the build. The two criteria whose *design* moved are re-asserted under the corrected rule in I-8g, and
> the reference numbers in this block are what I-8g must reproduce byte for byte.

- **Built.** **`packages/core/src/derive/cluster.ts`:** `clusterPoints(points, thresholdKm): number[][]` —
  the single-linkage first-fit kernel, extracted, with **`clusterStops` and `focusCluster` both delegating
  to it** so the loop exists once instead of the twice it exists today (A-41 Part 6). Exported from
  `index.ts`: **75 → 76**, and §2.10's list is updated in the same commit. **The delegation must be
  byte-neutral** — if `npm run golden && npm run sample` moves a byte, the extraction is wrong and the
  builder stops and reports rather than regenerating a golden.
  **`packages/client/src/selectors/worldMap.ts`:** A-41 Part 3's clustering (one key point per country, the
  4,000 km threshold, the strict-weight-majority dominance test, the ranking, the three-pane cap), Part 4's
  2% padding, and Part 5's `panes[]` / `paneId` / `WorldMapPane` shape. **`apps/web/src/views/WorldMap.tsx`:**
  one `<svg>` per pane under **W3** — a string-equality filter and nothing else — inset placement and size in
  CSS, each inset captioned from `pane.codes`, and inset countries carrying the identical tap handler.
  **And one deletion (A-42 ruling c):** the legend's *"Zoomed out to a readable minimum"* line, which asserts
  something this surface's geometry does not support. **No `SUMMARY_VERSION` bump, no `schemaVersion` bump,
  no `StoragePort` or `MapPort` change, no change to `apps/web/src/ports/map.ts`, no new dependency, and no
  change to what is drawn once framed** — A-34/A-40 Part 6's provisional treatment is untouched.
- **User-visible outcome.** The lifetime map opens on where you have actually been, with a distant country
  shown beside it in its own small frame that names it — instead of a map of one country with the trip
  squeezed against the edge. Nothing is dropped and nothing is hidden.
- **Architecture / data model.** A-41 and A-42 in full, and A-41 Part 7 is the scope line: **no interactive
  re-clustering, no threshold control, no "zoom to Europe" button, no continuous zoom, no per-screen-size
  rule, no projection change, no dateline-aware bounds, no geometry simplification, no fourth pane, and no
  option that drops a country.** A-40's W1 and W2 stand unchanged; W3 joins them.
- **Verification.** Every criterion here is `[stated]` against A-41, and every one has a fault that must
  measure red:
  - **The shipped sample splits, and the arithmetic says why.** Reference library
    `["AT","CZ","DE","GB","HR","HU","US"]` → **2 clusters** at 4,000 km, weights **6** and **1**, dominance
    `12 > 7` → `panes.length === 2`; `panes[0].codes === ["AT","CZ","DE","GB","HR","HU"]`,
    `panes[1].codes === ["US"]`; `panes[0].bounds` spans **30.2827° × 16.155°** (my own measurement, 4 dp)
    against the 194.5016° single frame it replaces. **Injected fault:** raise the threshold to 8,000 km and
    it comes back as one pane.
  - **The dominance test refuses to split a tie.** A library of one US trip and one Japan trip →
    `panes.length === 1` (no cluster carries a majority, so there is no subject to prioritise); the same
    library with twelve further US trips → `panes.length === 2` with `US` primary. **Injected fault:**
    weaken `2 × weight(primary) > W` to *"primary is the largest"* and the tie case splits.
  - **A single-cluster history is A-40's frame plus padding, and nothing else.** A Europe-only library →
    one pane, and its `viewBox` equals its `bounds` expanded by `0.02 × max(w, h)` on all four sides,
    computed independently in the test. **Injected fault:** apply the padding as a constant number of
    degrees and the assertion goes red on a small frame.
  - **Every pane's frame contains what it draws, with margin** — the rewritten I-8a criterion 2, run here
    against the shipped sample **and** against the single-country library `VA`. **Injected fault:** drop
    the padding term; the strict-containment assertion goes red. *(R33-6 measured the pre-ruling inset at
    exactly 0.000000.)*
  - **Nothing is lost, at any cluster count** (a ceiling, not a floor). For each of a fixture set covering
    **1, 2, 3 and ≥4 clusters**: every code in `stats.countries` appears **exactly once** across
    `panes[*].codes`, or exactly once in `missing`, and never in both or neither (A-41 I1/I2); with ≥4
    clusters `panes.length === 3` and `panes[2].codes` is the union of the remaining clusters in canonical
    order (I3, C7). **Injected fault:** drop the fold-in and a code becomes unrepresented.
  - **The renderer computes nothing** — the greppable ceiling, widened. W1's ten identifiers still return
    **0** hits in `WorldMap.tsx` (comments included), there is still no arithmetic over coordinates in the
    file, and the only `viewBox` expression in it is `pane.viewBox`; pane membership is a `===` on
    `paneId`. **Injected fault:** select a pane's countries by a coordinate comparison in the component and
    the ceiling goes red.
  - **The hidden-container result extends to every pane** `[stated]`, in Chromium. Booting on Trips, each
    pane's rendered `viewBox` attribute is byte-identical to the string `worldMapFrame` returned in bare
    Node, before **and** after the tab switch — I-8a's strongest single result, re-run over N panes instead
    of one. **Injected fault:** compute an inset's `viewBox` from a measured client rect and it goes red at
    0×0.
  - **The extraction changed nothing in core.** `npm run golden && npm run sample && git status
    --porcelain` leaves the tree clean at sha `40955ca0b182…`; `Object.keys(core).length` is **76**;
    `git diff --stat` on `packages/core/` touches **`derive/cluster.ts` and `index.ts` and no other file**.
- **Dependencies / blockers.** I-8a (shipped). Independent of I-8c, which shares no file with it; build
  I-8c first anyway.
- **Ship gate.** Every criterion above has its injected fault red; the day map's goldens are byte-identical
  after the `clusterPoints` extraction; the export surface is **76**, re-counted; W1's grep is clean and W3's
  ceiling holds; and the shipped sample, driven through the real *"Load Europe 2026"* button and
  **looked at**, is a map of the trip with the United States beside it — not the other way round.

#### I-8e — the row that says it cannot be read, and the trip you can save but not open

*(Revision 29. Carries `ARCHITECTURE.md` §2.9 **A-46** and answers QA **R34-2**, plus **R34-4** and
**R34-5** which fall out of the same predicate. **Runs after I-8d** — only so the two §2.10 widenings are
sequenced rather than racing — and **before I-8b**. A builder reads A-46, then A-45's amended Part 4, then
§8.4 A-44, and needs nothing else. Small on purpose: one core re-export, one client selector, one client
store method, one component branch. **Builder + breaker, mandatory** — it adds an export surface, which is
`cairn/CLAUDE.md`'s delegation table's own trigger.)*

- **Built.** **`packages/core/src/index.ts`:** re-exports **`isIsoDate`** — no new code, no behaviour
  change; the export surface goes **76 → 77** and §2.10's list is updated in the same commit (A-46 Part 2).
  **`packages/client`'s selectors:** `rowDatesReadable(row): boolean`, whose body is
  `core.isIsoDate(row.startDate) && core.isIsoDate(row.endDate)` and may be nothing else — **a hand-rolled
  calendar check in `packages/client` is the defect this closes, not the fix.** **`packages/client`'s
  store:** `exportStoredDoc(id): Promise<string>` — `ports.storage.load(id)` then `ports.file.exportDoc`,
  the stored bytes **verbatim**, no parse, no state touched. **`apps/web/src/views/Library.tsx`:** one
  boolean per row, `scan.unreadable.has(row.id) || !rowDatesReadable(row)`, driving the **existing**
  `chip--warn` / *"This trip's file could not be read"* chip, a **"Save a copy"** control beside Delete on
  that branch only, a Delete confirmation that says the stored copy is the only one, and a meta line that
  prints the two stored date strings **verbatim** instead of calling `dateRangeLabel` (R34-4).
  **No new chip, no new token, no new colour, no `SUMMARY_VERSION` bump, no `schemaVersion` bump, no
  `StoragePort`/`FilePort`/`MapPort` change, no reducer action, no new dependency, and no change to what
  `fromJSON` refuses.**
- **User-visible outcome.** A trip whose file Cairn cannot read says so **on the card**, before you tap it —
  and you can save a copy of it off the device instead of choosing between a dead screen and Delete.
  > **Corrected at revision 32 (QA R35-1, `ARCHITECTURE.md` §2.9 A-47).** True **only when the unreadable
  > date is one of the row's own two.** For the larger population — a bad `days[n].date` or
  > `bookings[n].*.date`, 16 fields against 2 on the shipped sample — the card is healthy, *"before you tap
  > it"* is false, and after the tap there is still no way to save the copy. **I-8f** is what makes this
  > sentence true, by widening the trigger; read it with this line.
- **Architecture / data model.** A-46 in full. The scope line is A-46 Part 6: **no repair path, no clamp,
  no plausibility floor, no re-plumbing of `summaryScan`, no widening of `rowLifecycle` (A-44 is unchanged),
  no second export control on readable cards, and no ownership check on the rescue export** — the last
  stated rather than skipped, and safe only while storage is single-owner (§2.9 A-46 Part 4).
- **Verification.**
  - **The card tells the truth about a date that is not a date** `[stated]`, on rendered output. Plant
    Europe 2026 with its stored `startDate` rewritten to `2026-02-30` — R34-2's exact repro — and reload:
    `data-testid="row-unreadable"` count is **1**, the meta line contains the literal string `2026-02-30`
    and no month name, and the card is not presented as healthy. **Injected fault:** implement the row
    predicate as `rowLifecycle(row, today) !== null` and it goes green-to-red the wrong way — the count
    returns to **0**, because `rowLifecycle('2026-02-30', …)` is `completed` (measured, A-46 Part 1). *This
    is the fault that must be red, and it is the fix a reasonable builder would have written.*
  - **The predicate is core's, once** `[stated]`. `rowDatesReadable` contains no regex, no month table and
    no arithmetic; `Object.keys(core).length` is **77**; and a grep for `\d{4}-\d{2}-\d{2}` or `daysInMonth`
    across `packages/client/src` returns **0** hits outside comments. **Injected fault:** inline the check
    and the grep goes red.
  - **A trip that cannot be opened can still be saved** `[stated]`, in bare Node against `ports/memory.ts`
    (no browser, no `FilePort`): store a document, corrupt one stored date so `openTrip` throws, and assert
    `await store.exportStoredDoc(id)` returns **the exact bytes that were stored** — byte equality, not a
    round-trip — while `openTrip` still throws and `state` is unchanged (same `activeTripId`, same
    `library`, same `persistence`). **Injected fault:** route the export through `core.fromJSON`/`toJSON`
    and it throws on exactly the document it exists to rescue.
  - **Nothing is claimed that is not known** `[stated]`. A library whose rows are all readable renders
    **0** `row-unreadable` chips and **0** "Save a copy" controls, and the shipped sample's cards are
    byte-identical to I-8d's — the signal is silent on healthy data. And a document whose *row* is fine but
    whose `days[3].date` is not still opens to a refusal, with the card unflagged: that is the stated
    incompleteness (A-46 Part 3), not a bug, and the test asserts it rather than hiding it.
    > **The last sentence is withdrawn as wrong at revision 32 (QA R35-1, §2.9 A-47).** It is a bug, and
    > this criterion blessing it in writing is why a round was spent finding it. The first sentence stands
    > — the signal must still be silent on healthy data. What replaces the last: **before** any open
    > attempt the card is legitimately unflagged (nothing has established anything, and A-47 Part 8 residue
    > 1 owns that floor); **after** the refusal is on screen the card must carry the chip and the rescue
    > control. I-8f criterion 1 asserts exactly that, and its injected fault is this criterion's own
    > predicate.
  - **The rescue file is not offered as a backup** `[stated]`. The downloaded name ends
    `.cairn-unreadable.json`, not `.cairn.json`, and the control's own text says Cairn cannot re-read it.
    Feeding it back through *"Restore from a backup"* is refused with A-45's message and its JSON path —
    asserted, because a rescue that silently looks restorable is the promise broken one screen later.
  - **Nothing else moved** `[stated]`. `npm run golden && npm run sample && git status --porcelain` leaves
    the tree clean at sha `40955ca0b182…`; `npm run typecheck` and `npm run test:tap` are green;
    `git diff --stat` on `packages/core/` touches **`index.ts` and no other file**; `qa/r2-redact.mjs`
    still reports **0 KNOWN_LEAKS**.
- **Dependencies / blockers.** I-8d (for the export-surface count only — the code is independent). I-8c's
  own R34-1 fix does not block this and is not blocked by it.
- **Ship gate.** Every criterion above has its injected fault red; the export surface is **77**, re-counted
  rather than quoted; the breaker pass is **mandatory** because this adds an export path; and the round-34
  repro (`qa/r34-render.mjs` §F) is re-run and reports the card flagged and the copy saved.

#### I-8f — the rescue is reachable whenever anything knows the trip will not open

*(Revision 32. Carries `ARCHITECTURE.md` §2.9 **A-47** and answers QA **R35-1**, plus **R35-4** and
**R35-5** which the same ruling settles. **Runs after I-8e** — it corrects I-8e in place — and **before
I-8b**. A builder reads A-47, then A-46, and needs nothing else in `ARCHITECTURE.md`; A-47 names which of
A-46's sentences it supersedes. Small on purpose: one client state field, one store helper with three
callers, one client selector, one component's gates rewired, three lines in `cli.ts`. **Builder + breaker,
mandatory** — it changes who can reach an export surface, which is `cairn/CLAUDE.md`'s delegation trigger.
`packages/core` is **not touched at all**: zero diff lines, and the export surface stays at **77**.)*

- **Built.**
  - **`packages/client/src/store/reducer.ts`:** `AppState` gains `openFailures: ReadonlyArray<{ id: string;
    message: string }>`, library-scoped exactly as `rescan` is, `[]` in `initialState()`, **not persisted,
    not exported, not in `history`** (A-47 Part 2).
  - **`packages/client/src/store/store.ts`:** one module-local `noteOpenFailure(id, err)` — **the only
    site that assigns the field** — called from `openTrip`'s and `browseTrip`'s `core.fromJSON` catch, each
    of which **rethrows the original error unchanged** after the `set`; the entry is cleared on
    `openTrip`/`browseTrip` **success** and on `deleteTrip`; **all six `...initialState()` transitions carry
    `openFailures: state.openFailures`** the way they already carry `rescan`. `importDoc` gains **no**
    clear (it mints a fresh id on collision, so it can never repair one). Plus `exportStoredDoc(id)`'s
    active-trip precondition throw (A-47 Part 5).
  - **`packages/client/src/selectors/index.ts`:** `rowUnopenable(state, row): boolean` — the union of
    `!rowDatesReadable(row)`, `state.rescan.unreadable` and `state.openFailures`, and nothing else.
    **`rowDatesReadable` is unchanged and stays exported** (A-47 Part 3).
  - **`apps/web/src/views/Library.tsx`:** A-46's single `unreadableRow` becomes **two correctly-scoped
    gates** (A-47 Part 4) — the meta line's verbatim-dates branch stays on `!rowDatesReadable(row)`; the
    `chip--warn`, its hint, the **"Save a copy"** control and **Delete's confirmation warning** all move to
    `rowUnopenable(state, row)`. `ScanNote`'s header count stays on `scan.unreadable.length` and does
    **not** widen.
  - **`cairn/cli.ts`:** `todayIsValid()` becomes `core.isIsoDate(today)`, message *"--today must be a real
    calendar date in YYYY-MM-DD, got …"*, exit code 2 unchanged; the `weekdayOf` try/catch is **replaced,
    not stacked**; the now-false comment block above it is deleted for a pointer to A-47 Part 6 (R35-4).
  - **No new chip, no new token, no new colour, no new port method, no new reducer action, no
    `SUMMARY_VERSION` bump, no `schemaVersion` bump, no new dependency, no core change of any kind, and no
    change to what `fromJSON` refuses.**
- **User-visible outcome.** Tapping a trip that will not open now leaves you looking at a card that says so
  and offers to save the copy — instead of a refusal message over a card that still looks healthy and
  whose only button is Delete.
- **Architecture / data model.** A-47 in full. The scope line is A-47 Part 7: **no full-library parse at
  boot, no persisted unreadable flag, no re-plumbing of `summaryScan`, no widening of `rowLifecycle` or
  `rowDatesReadable`, no repair path, no per-card parser message, no flush inside `exportStoredDoc`, and
  no widening of the `ScanNote` header** — the boot-time floor is stated as A-47 Part 8 residue 1 rather
  than closed.
- **Verification.**
  - **The rescue is reachable for the population A-46 missed** `[stated]`, on rendered output. Round 35's
    exact repro: the shipped sample with its stored `days[3].date` rewritten to `2026-02-30` — a value the
    pre-A-45 `importDoc` accepted and wrote. Assert **before** the tap the card is unflagged (that is the
    stated floor, A-47 residue 1), then tap it, then assert on the **same** screen: the refusal banner is
    present **and** `data-testid="row-unreadable"` is **1** **and** `data-testid="save-copy"` is **1**
    **and** clicking it yields bytes **byte-identical** to what storage holds. **Injected fault:** gate the
    chip and the control on `rowDatesReadable(row)` alone — I-8e's shipped predicate — and the post-tap
    counts go to **0** while the banner stays. *That is the fault that must be red, and it is the code
    that shipped.*
  - **Delete stops being silent on the same population** `[stated]`. On that card, after the tap, the
    confirmation text contains the *"save a copy first"* sentence; on a healthy card it is the ordinary
    one. **Injected fault:** gate the confirmation on `rowDatesReadable` and it reverts to the ordinary
    sentence with the rescue control still on screen beside it — the exact conflation R35-1 measured.
  - **The meta line did not regress** `[stated]`. On that same card the range still reads
    `2026-08-07 → 2026-08-22 · 6 cities` through `dateRangeLabel` — **not** two raw strings — because those
    two dates are real; and a row whose *own* `startDate` is `2026-02-30` still prints
    `2026-02-30 → 2026-03-05` verbatim, so R34-4 stays discharged. **Injected fault:** point the meta line
    at `rowUnopenable` and the first assertion goes red.
  - **The fact is written where the failure is, and dies with the session** `[stated]`, in bare Node
    against `ports/memory.ts`. `openTrip` on a corrupt document rejects with the **same error class and
    message** as before and leaves `state.openFailures` holding that id; a subsequent successful
    `openTrip` of a repaired document clears it; `deleteTrip` clears it; `closeTrip` **preserves** it (the
    carry test); a fresh store starts empty. **Injected fault:** drop `openFailures` from any one of the
    six `...initialState()` carry sites and the `closeTrip` case goes red.
  - **Nothing opens that was not going to open** `[stated]`. With a recording `StoragePort`, rendering a
    library of N rows performs **0** `load()` calls and **0** `fromJSON` calls; the count is unchanged from
    I-8e's. **Injected fault:** compute the flag by loading each row and the count goes to N.
  - **The predicate is still one expression** `[stated]`. A grep of `apps/web/src` finds **0** occurrences
    of `rescan.unreadable` or `openFailures` outside `ScanNote`'s header count, and `rowUnopenable` has
    exactly the one definition. **Injected fault:** inline the union in `Library.tsx` and the grep goes red.
  - **`exportStoredDoc` refuses the active trip** `[stated]`, bare Node: with a trip open, the call
    rejects and names `exportActive()`; with no trip open it behaves exactly as I-8e shipped it, including
    for a foreign-`ownerId` document. `qa/r35-store.mjs` §A is re-pointed at the refusal and stops
    reporting a FAIL.
  - **`--today` refuses a calendar-invalid date** `[stated]`. `node cli.ts stats --today 2026-13-45` prints
    the refusal and exits **2**; `--today 2027-02-14` and `--today 2026-02-28` still work; `--today
    not-a-date` is unchanged. A test asserts `core.weekdayOf` does not throw at `0000-01-01` or
    `9999-12-31` — the containment the replaced guard depends on. **Injected fault:** restore the
    `weekdayOf`-only guard and the `2026-13-45` case prints statistics again.
  - **Nothing else moved** `[stated]`. `git diff --stat` shows **0** lines in `packages/core/`;
    `Object.keys(core).length` is **77**; `npm run golden && npm run sample && git status --porcelain`
    leaves the tree clean; `npm run typecheck` and `npm run test:tap` are green; `qa/r2-redact.mjs` still
    reports **0 KNOWN_LEAKS**; the root planner's md5 is unmoved.
- **Dependencies / blockers.** I-8e (this corrects it in place). Round 35's **R35-2** and **R35-3** are
  builder findings against I-8e and neither blocks nor is blocked by this.
- **Ship gate.** Every criterion above has its injected fault red — in particular the first two, whose
  injected fault is I-8e's own shipped predicate; the export surface is **77**, re-counted rather than
  quoted; `packages/core` is byte-unchanged; and the breaker pass is **mandatory**, because this changes
  which rows can reach an export path.

#### I-8g — the key point stops being a rectangle, and the alphabet stops deciding the panes

*(Revision 33. Carries `ARCHITECTURE.md` §4.4 **A-48** and answers QA **R36-1** and **R36-2**, plus
**R36-3**, **R36-4**, **R36-5**, **R36-6** and **R36-7**. **Runs after I-8f and before I-8b.** A builder
reads **A-48 first** — it names which of A-41's clauses it supersedes — then A-41's C1/C5/C6/C7/C8 and
Parts 4–7, then A-40 Parts 3–5, and needs nothing else in `ARCHITECTURE.md` except §2.10's list.
**Builder + breaker, mandatory**: it widens the export surface and changes a core kernel two shipped
surfaces already depend on.)*

> **Correction note, revision 34 (QA round 37).** I-8g is **built and attacked**: 0 blockers, every clause
> of A-48 implemented exactly as written, and every number below re-derived to the digit against a second,
> independently written implementation. **Two of its criteria rest on design that has since moved**, and
> both are re-asserted under the corrected rules in **I-8h** (`ARCHITECTURE.md` §4.4 **A-49** and **A-50**):
> the *"R33-1 is not regressed, byte for byte"* criterion — whose **main** pane is still byte-identical and
> whose **US inset** narrows from 104.83° to 57.72° with a third pane appearing — and *"the main pane fills
> its box"*, whose 75% floor is replaced by a symmetric no-letterboxing criterion. **The last sentence of
> the ship gate is what failed**: *"a map of Europe rather than of the Atlantic"* measured **1.95% land** at
> **81.1° × 49.1°**, because A-48 corrected the key point and not the extent (R37-1). Nothing below is
> rewritten — it is all true of the build — and **I-8g is not re-opened**: A-49 changes no key point, no
> partition and no paint order.

- **Built.** **`packages/core/src/derive/country.ts`:** `countryKeyPoint(code, index): LatLng | null` —
  A-48 C2′, the box centre of the code's **principal ring** (greatest absolute spherical area, ties by index
  order), with the union-box fallback for a code with no ring of three points. The area helper is
  module-private; **no distance function enters this file** and the key point may never be used to attribute
  a coordinate. Exported from `index.ts`: **77 → 78**, and §2.10's list is updated in the same commit.
  **`packages/core/src/derive/cluster.ts`:** `clusterPoints` becomes the **connected components** of the
  threshold graph (A-48 C3′) in the same output-order convention — groups by smallest member index, members
  ascending — so `clusterStops` and `focusCluster` inherit order-independence and the one-kernel rule
  (A-41 Part 6) is unchanged. **If `npm run golden && npm run sample` moves a byte the builder stops and
  reports rather than regenerating a golden** — measured expectation: it does not.
  **`packages/client/src/selectors/worldMap.ts`:** C2 calls `countryKeyPoint`; `WorldMapPane` gains
  `aspect`; `frame.countries` is emitted in **descending index position** (C9) while `pane.codes` stays
  canonical. **`apps/web`:** the view passes `pane.aspect` through as a CSS custom property and does no
  arithmetic (A-40 Part 2); `styles.css` uses `aspect-ratio: var(--pane-aspect)` with a static `max-height`
  clamp (R36-5) and re-pairs the dark-mode `--map-fill` against `--map-sea` (R36-6). **No `viewBox`
  computation moves out of `worldMapFrame`, no `SUMMARY_VERSION` bump, no `schemaVersion` bump, no
  `StoragePort`/`FilePort`/`MapPort` change, no reducer action, no new dependency, and no change to what is
  drawn once framed** (A-34's provisional treatment untouched).
- **User-visible outcome.** The map frames where you actually went. A traveller with France and Greece gets
  **one** map of Europe instead of an Atlantic rectangle with Greece exiled to the corner; three countries
  arriving in a different order give the same two panes; and no country can hide underneath the one that
  surrounds it.
- **Architecture / data model.** A-48 in full. A-41 Part 7's do-not-build list still binds, with Part 6's
  one clarification: it forbids a **frame** that depends on a measurement, not a CSS box that resolves at
  layout. Still no manual reframe control, no re-clustering UI, no dateline-aware bounds, no projection
  change, no geometry simplification and no fourth pane.
- **Verification.** Every criterion is `[stated]` against A-48, and every one has a fault that must measure
  red:
  - **The key point is a point of the country** `[stated]`, over all **239** codes in bare Node. Each key
    point lies inside its principal ring's bounding box; the maximum distance from a key point to the
    nearest vertex of its own geometry (zero when the point is inside its own rings) is **≤ 250 km**, and
    the argmax is `NO` at **203 km** — against **16,598 km** at `KI` under C2. **176 of 239** key points
    fall inside their own rings. **Injected fault:** key off the union of the code's boxes and the maximum
    returns to 16,598 km.
  - **France clusters with Europe, and the R36-1 library is one pane** `[stated]`. Key distances FR–DE
    **804**, FR–CZ **1,075**, FR–MA **2,227** km (they were 3,891 / 4,137 / **1,339**), so the near/far
    ordering is no longer inverted. A library of two France trips and one Greece trip returns
    `panes.length === 1` containing `FR` and `GR`, not a 64.1°-wide main pane with `GR` in an inset.
    **Injected fault:** restore C2 and the pane count goes to 2 and the main span to 64.1°.
  - **The partition is a function of the point set** `[stated]` (A-48 I9). For `{AE, AT, GR}` all **six**
    orderings return the identical partition — one pane containing all three — and over a five-code fixture
    every permutation agrees. `{FR, HU, SI}` is one pane; `HU` and `SI` (350 km apart) are never separated.
    **Injected fault:** restore first-fit and `{AE, AT, GR}` returns **three** distinct partitions across
    its six orderings, one of which puts Austria in the inset.
  - **R33-1 is not regressed, byte for byte** `[stated]`. The reference library
    `["AT","CZ","DE","GB","HR","HU","US"]` still gives `panes.length === 2`,
    `panes[0].codes === ["AT","CZ","DE","GB","HR","HU"]`, `panes[1].codes === ["US"]`, weights **6** and
    **1**, dominance `12 > 7`, main span **30.2827° × 16.1550°**, and both `viewBox` strings byte-identical
    to the ones I-8d shipped. **Injected fault:** make `weight` the count of **distinct** trips — R36-4's
    proposed alternative — and the sample stops splitting altogether (it is one trip: 1 vs 1, and C5
    correctly refuses to split a tie), which is the measurement that refuses that alternative.
  - **The day map is byte-neutral, and the check is not vacuous** `[snapshot]` + `[stated]`.
    `npm run golden && npm run sample && git status --porcelain` leaves the tree clean at sha
    `40955ca0b182…`. Beside it, the stated measurement: over the Europe 2026 fixture at
    `DEFAULT_CLUSTER_THRESHOLD_KM = 90`, first-fit and connected components agree on **all 16 days with two
    or more located stops** and on the whole **112**-stop set (8 groups either way); at **60 km** exactly
    **one** day differs. **Injected fault:** the 60 km arm *is* the vacuity control — if it also reports
    zero differences, the two implementations are the same code and the test proves nothing.
  - **Nothing is painted out of reach** `[stated]` (A-48 I10). In bare Node over a 239-code library, no
    country's fill is entirely contained in the fill of a country emitted after it. In Chromium, sampling
    each drawn country's own interior on a 40×40 grid and asking `elementFromPoint`, **`AD` hit-tests to
    itself** where it previously had **0** self-hits under `FR`. `MF`/`SX` is recorded as the stated
    exception (A-48 residue 6: two halves of one 90 km² island sharing a screen pixel), and both remain
    reachable from the code-chip list, which is asserted. **Injected fault:** emit `countries` in canonical
    order and `AD` returns to 0 self-hits.
  - **Nothing is lost, and every A-41 invariant still holds** `[stated]` — a ceiling, not a floor. I1, I2
    (with `pane.codes` still canonical), I3, I4, I5, I6, I7 re-run over the fixture set covering **1, 2, 3
    and ≥4** clusters plus a `missing` code, exactly as I-8d's criteria did. **Injected fault:** sort
    `drawn` into paint order before clustering instead of sorting only the emitted array, and `pane.codes`
    stops being canonical — I2 goes red.
  - **The main pane fills its box** `[stated]`, Chromium at 390×820: the reference main pane paints
    **≥ 75%** of its CSS box, against the measured **42.6%** (356×196 inside 356×460). No pane's `viewBox`
    string changes between this criterion and the bare-Node one — the frame is untouched. **Injected
    fault:** remove the `aspect-ratio` rule and the fill returns under 50%.
  - **Dark mode clears the graphical-object floor** `[stated]`: `--map-fill` against `--map-sea` measures
    **≥ 3:1** in dark (it is **2.87:1** today), light stays at **7.16:1**, and A-34's provisional treatment
    is still visibly distinct from the confirmed fill in **both** schemes. **Injected fault:** restore the
    old dark token and the ratio goes back under 3:1.
  - **The renderer still computes nothing** `[stated]`. W1's ten identifiers return **0** hits in
    `WorldMap.tsx` (comments included), there is no arithmetic over coordinates in the file, the only
    `viewBox` expression is `pane.viewBox`, and the only new expression is passing `pane.aspect` into a
    style value. W2 and W3 unchanged. **Injected fault:** derive the aspect in the component by parsing
    `pane.viewBox` and the ceiling goes red.
  - **Nothing else moved** `[stated]`. `Object.keys(core).length` is **78**; `git diff --stat` on
    `packages/core/` touches **`derive/country.ts`, `derive/cluster.ts` and `index.ts` and no other source
    file**; `npm run typecheck` and `npm run test:tap` green; `qa/r2-redact.mjs` **0 KNOWN_LEAKS**;
    `qa/r2-constraints.mjs` unchanged; the root planner's md5 unmoved and `git diff` over
    `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root empty.
- **Dependencies / blockers.** I-8d (shipped) and I-8f. Independent of I-8b, which it blocks.
- **Ship gate.** Every criterion above has its injected fault red; the export surface is **78**, re-counted
  rather than quoted; the day map's goldens are byte-identical; **the reference frame is byte-identical to
  I-8d's** (R33-1 stays fixed); `node qa/r36-atlas.mjs` and `qa/r36-render.mjs` are re-run and the two MAJOR
  sections report clean; and the two-France-and-one-Greece library, driven through the real app and **looked
  at**, is a map of Europe rather than of the Atlantic.

#### I-8h — the frame stops framing what the grouping already decided is somewhere else

*(Revision 34. Carries `ARCHITECTURE.md` §4.4 **A-49** and **A-50** and answers QA **R37-1**, **R37-3** and
**R37-4**. **Runs after I-8g.** It does **not** gate I-8b — R37-1 is about how wide a pane is, not which
countries are in it — but it must land before the Phase 2 exit gate. A builder reads **A-49 and A-50 first**
— A-49 names which of A-41's and A-48's clauses it supersedes — then A-48's C2′/C3′/C9 and Part 6, then
A-41's C1/C5/C6/C7 and Parts 4–7, and needs nothing else in `ARCHITECTURE.md` except §2.10's list.
**Builder + breaker, mandatory**: it widens the export surface and changes the shape of a frame two surfaces
consume.)*

- **Built.** **`packages/core/src/derive/country.ts`:** `countryParts(code, index, thresholdKm): CountryPart[]`
  — A-49 Part 2, the connected components of the code's rings (ring-box centres, `clusterPoints`,
  A-41 Part 6's one kernel), each part carrying its `box`, its greatest-area ring's box centre as `key`, its
  `rings` in index order, and a `principal` flag. The ring-area helper stays the module-private one
  `countryKeyPoint` already uses; **no distance function enters this file**; `countryKeyPoint` itself is
  **not modified**. Exported from `index.ts`: **78 → 79**, and §2.10's list is updated in the same commit.
  **`packages/client/src/selectors/worldMap.ts`:** each pane's `bounds` is `mapBounds` over its **in-frame
  parts** (C8′); the detached parts of every pane form one further pane, `id: 'detached'`,
  `role: 'detached'`, appended last (C8″, C7′); `frame.countries` becomes one entry per **(code, pane)**;
  `frame.codes` is added. **`apps/web`:** the chip list renders `frame.codes`; `WorldMap.tsx` gains the
  third `role` branch for the detached pane's caption and `aria-label`; `styles.css` sizes the pane box from
  `--pane-cap` and `--pane-aspect` in both directions (A-50). **No `viewBox` computation moves out of
  `worldMapFrame`, no change to `clusterPoints`, `clusterStops` or `focusCluster`, no `SUMMARY_VERSION`
  bump, no `schemaVersion` bump, no `StoragePort`/`FilePort`/`MapPort` change, no reducer action, no new
  dependency, and no change to what is drawn once framed.**
- **User-visible outcome.** The map frames where you went at the scale you went there. A traveller with
  France and Greece gets a map of western and southern Europe, not a rectangle of Atlantic — and French
  Guiana, which used to be a speck in that rectangle's corner, gets a small frame of its own that says so.
- **Architecture / data model.** A-49 and A-50 in full. A-41 Part 7's do-not-build list still binds, with
  A-50's clarification of Part 6 and A-49 C7′'s single change to the pane cap: still no manual reframe
  control, no re-clustering UI, no dateline-aware bounds, no projection change, no geometry simplification,
  no *"drop the outlier"* option, and no fifth pane.
- **Verification.** Every criterion is `[stated]` against A-49/A-50, and every one has a fault that must
  measure red:
  - **The ship-gate library is a map of Europe, and the sentence is now a number** `[stated]`. Two France
    trips and one Greece trip return `panes.length === 2`: `main` with `codes === ["FR","GR"]` at extent
    **31.20° × 16.23°** (`viewBox` width **32.4444**, height **17.4764**), and `detached` with
    `codes === ["FR"]` at **2.87° × 3.70°**. The main pane samples **≥ 12% land** on an even-odd sweep of
    its own rectangle (measured **14.02%**, against **1.95%** under A-48), and Greece's own box is **≥ 7%**
    of that pane's area (measured **7.86%**, against **1.009%**). Driven through the real app at 390 px,
    Greece's rendered bounding box is **≥ 4,000 px²** (against **783**). **Injected fault:** take the
    extent over every entry `box` — A-48's C8 — and the extent returns to 81.13° × 49.10° and 1.95%.
  - **No solo country regresses, and the outlier is bigger than it was** `[stated]`. `FR` alone:
    `main` **14.15° × 9.77°** + `detached` **2.87° × 3.70°** (it was one pane at 64.08° × 49.10°). Over
    **all 239** single-country libraries, no pane's extent is **wider** than the pane A-48 produced for the
    same library, and exactly **3** libraries (`UM`, `FR`, `US`) produce a detached pane. **Injected fault:**
    seed the in-frame set with every part rather than the principal one and all three detached panes vanish
    while the extents return to A-48's.
  - **It generalises with no count of companions anywhere** `[stated]`. `AT CZ DE ES FR IT` gives one pane at
    **28.25° × 19.04°** (it was 73.38° × 52.93°) and the same **2.87° × 3.70°** detached pane. No branch in
    `worldMapFrame` reads `codes.length`, `panes.length` or `parts.length` to decide an extent — asserted as
    a review of the diff and as a property: adding a country to a pane never changes whether another
    country's part is detached, unless that country's own geometry is what connects it. **Injected fault:**
    special-case the single-country pane and the six-country case stops matching the one-country case.
  - **A huge secondary landmass is not a special case, and connectivity is evaluated per pane** `[stated]` —
    this is the criterion that says the rule is geometric rather than a carve-out. `US` alone:
    `main` **57.72° × 24.31°** (CONUS) + `detached` **41.81° × 52.44°** (Alaska, Hawaii, the Aleutians —
    1.5 M km², 19% of the country). `CA MX US`: **one** pane at **119.14° × 68.69°**, **unchanged from
    A-48, with no detached pane**, because Alaska is genuinely connected to the pane's subject once Canada
    is in it. **Injected fault:** decide detachment per country instead of per pane and the `CA MX US` case
    grows a detached pane it must not have.
  - **The key point is preserved bit-for-bit, so A-48 is not reopened** `[stated]` (A-49 I12). For all
    **239** codes and thresholds `{1, 100, 1000, 4000, 20000}` km,
    `countryParts(code, index, t).find(p => p.principal).key` equals `countryKeyPoint(code, index)` on both
    fields under `Object.is` — **0 mismatches**. A-48's I8, C3′, C4′'s ten pinned pairs, C5 and C6 are
    therefore untouched, and every pane's **membership** is unchanged. **Injected fault:** rank parts by
    summed area instead of by their greatest ring and `US` mismatches.
  - **Nothing is cropped and nothing is drawn twice** `[stated]` (A-49 I11). For every drawn code, the
    multiset of rings across all its `WorldMapCountry` entries is exactly the code's ring set from the
    index, each ring once — over the reference sample, over `FR`+`GR`, and over a 239-code library.
    **Injected fault:** drop the detached parts instead of emitting them and I11 goes red for `FR`, which is
    the one failure this increment could plausibly cause.
  - **R33-1 is not regressed, and what does move is stated** `[stated]`. The reference library
    `["AT","CZ","DE","GB","HR","HU","US"]` still gives `panes[0].codes === ["AT","CZ","DE","GB","HR","HU"]`,
    weights **6** and **1**, dominance `12 > 7`, main span **30.2827° × 16.1550°** and
    `viewBox "-8.1779 -59.2407 31.494 17.3663"` — **byte-identical to I-8d's and I-8g's**. What moves and is
    re-pinned here: `panes.length === 3`; `panes[1]` is `["US"]` at `viewBox
    "-125.8416 -50.5435 60.0314 26.618"`; `panes[2]` is the detached pane, `["US"]`, at `viewBox
    "-172.8399 -72.4066 43.9088 54.5393"`. **Injected fault:** restore C8 and `panes[1]` returns to
    `"-173.8876 -73.4543 109.0195 56.6347"` with no third pane.
  - **The day map and the kernel are untouched by construction** `[snapshot]` + `[stated]`.
    `npm run golden && npm run sample && git status --porcelain` leaves the tree clean at sha
    `40955ca0b182…`; `git diff` on `packages/core/src/derive/cluster.ts` is **0 lines**; A-48's I9 re-runs
    green. **Injected fault:** the vacuity control is the diff itself — if `cluster.ts` moved, this
    increment is out of scope and the builder stops and reports.
  - **The chip list is complete, canonical, and the view derives it from nothing** `[stated]` (A-49 I13,
    R37-3). On the reference sample the rendered chips read **`AT CZ DE GB HR HU US`**, one per drawn code,
    every one drilling down; over a 239-code library `MF` and `SX` are both present exactly once.
    `frame.codes` is asserted equal to `stats.countries`' codes minus `missing`, in canonical order.
    `.sort(`, `new Set(` and `Object.keys(` return **0** hits in `WorldMap.tsx`. **Injected fault:** render
    `frame.countries` again and the chips return to `US DE GB HU AT CZ HR` **and** print `FR` twice on the
    `FR`+`GR` library.
  - **No pane is letterboxed, in either direction** `[stated]` (A-50). In Chromium at **390 × 820 and
    1440 × 700**, for the reference sample and for **all 239** single-country libraries, the painted map's
    rendered width equals its `<svg>`'s rendered width and its height equals its `<svg>`'s rendered height,
    to within **1 px**. The measured starting points this replaces: `MV` **22.0%**, `CL` **33.4%**, the
    sample **76.8%** at 1440 × 700. **Injected fault:** restore `width: 100%` with the static `max-height`
    and `MV`, `CL` and the desktop sample all return to those three numbers.
  - **Nothing is lost, and every invariant still holds** `[stated]` — a ceiling, not a floor. I1 (restated),
    I2 (restated), I3 (restated, 1…4 panes), I4, I5 (restated), I6, I7, I8, I9, I10 and the new I11–I15,
    over the fixture set covering **1, 2, 3 and ≥4** clusters, a `missing` code, an empty library, an
    all-missing library and a 239-code library — plus `FR`-alone and `FR`+`GR`, which are the two this
    increment exists for. **Injected fault:** let the detached pane into C5's `W` and I15 goes red on the
    reference sample.
  - **The renderer still computes nothing** `[stated]`. W1's ten identifiers return **0** hits in
    `WorldMap.tsx`, there is no arithmetic over coordinates in the file, the only `viewBox` expression is
    `pane.viewBox`, and the only geometry-shaped values crossing into the view are `pane.aspect` and
    `frame.codes`. W2 and W3 unchanged; the pane's countries are still selected by
    `country.paneId === pane.id` and by nothing else. **Injected fault:** compute the detached pane in the
    component and the ceiling goes red.
  - **Nothing else moved** `[stated]`. `Object.keys(core).length` is **79**; `git diff --stat` on
    `packages/core/` touches **`derive/country.ts` and `index.ts` and no other source file**;
    `npm run typecheck` and `npm run test:tap` green; `qa/r2-redact.mjs` **0 KNOWN_LEAKS**;
    `qa/r2-constraints.mjs` unchanged; the root planner's md5 unmoved and `git diff` over
    `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root empty.
- **Dependencies / blockers.** I-8g (shipped). **Does not block I-8b.** R37-2 and R37-5 are separately
  routed builder findings against I-8g; R37-5's one-line guard is the thing A-49's *"a code with no parts
  goes to `missing`"* assumes, so if it has not landed by then, this increment lands it as part of its own
  totality check rather than leaving two answers for an empty code.
- **Ship gate.** Every criterion above has its injected fault red; the export surface is **79**, re-counted
  rather than quoted; the day map's goldens are byte-identical and `cluster.ts` has a zero-line diff; the
  reference frame's **main** pane is byte-identical to I-8d's and the two moved panes match the strings
  pinned above; `node qa/r36-atlas.mjs`, `qa/r36-render.mjs`, `qa/r37-a48.mjs` and `qa/r37-render.mjs` are
  re-run and the assertions that survive A-49 report clean, with each superseded assertion named rather than
  deleted; and the two-France-and-one-Greece library, driven through the real app, measures **≥ 12% land**
  with Greece at **≥ 4,000 px²** at 390 px — the sentence I-8g's gate asked a reader to judge by eye, stated
  as three numbers a test can hold.

> **Correction note, revision 35 (QA round 38).** I-8h is **built, attacked and not re-opened**: 0 blockers,
> every clause of A-49/A-50 implemented exactly as written, and every number above re-derived by round 38 to
> the digit. What moved is the **design** under three of its criteria — the pane count and the detached pane
> (A-49 C7′/C8″, both withdrawn by A-51) and A-50's box criterion (which measured the `<svg>` and not the
> bordered cell, R38-3). All three are re-asserted under the corrected rules in **I-8i**
> (`ARCHITECTURE.md` §4.4 **A-51** and **A-52**). The two criteria that survive **unchanged and are re-pinned
> in I-8i** are R33-1's byte-identity (all three `viewBox` strings still hold) and I12's key-point
> preservation. **The criterion that failed is the one nobody wrote:** every gate in this arc measured *one*
> library, and R38-2 is only visible by comparing *two* — which is why A-51 Part 7's **I17 (locality)** is
> now a named invariant rather than a property of the algorithm.

#### I-8i — the frame stops having a "main" pane, because that is what made a country's size depend on the rest of the library

*(Revision 35; **revision 36** adds A-53. Carries `ARCHITECTURE.md` §4.4 **A-51**, **A-52** and **A-53**
and answers QA **R38-2** (MAJOR), **R38-3**, **R38-4** and **R38-5**, plus **R38-1** as a routed builder
line. **Runs after I-8h.** It does **not** gate I-8b — which countries are attributed is unchanged; only
how many rectangles they are drawn in moves — but it must land before the Phase 2 exit gate. A builder
reads **A-51 first** — it names which of A-41/A-48/A-49 to skip — then A-52, then **A-53 Parts 4 and 8**
(the pane-membership contract; it supersedes nothing and is two tests and a comment), then A-41 C1 + Part 4,
A-48 C2′/C3′/C4′/C9 + Part 6, A-49 Part 2, A-50 and A-40 Parts 2–5, and needs nothing else in
`ARCHITECTURE.md` except §2.10's list. **Builder + breaker, mandatory**: it changes the shape of a frame
two surfaces consume.)*

> **🛑 GATE: NOT DISPATCHABLE UNTIL JACOB APPROVES A-51.** He asked for the framing abstraction to be
> reconsidered rather than patched a fifth time, and to approve the answer **before** a builder pass. A-51
> overturns the *mechanism* half of his own framing direction (insets) while keeping its purpose clause
> (no distant point compresses the primary geography). **Do not open a builder session against this
> increment until he has ruled.** If he declines it, A-41…A-50 stand unchanged, this increment is struck,
> and R38-2 stays open as a disclosed defect.
>
> **Revision 36 — the pane-membership question is closed and no further architect round is owed.** Jacob's
> follow-up (*does a component of a country's geometry become an equal-weight travel subject?*) is ruled in
> **A-53**: `worldMapFrame`'s input holds no coordinate, so an ISO code is the only geographic evidence
> there is; A-51 already separates the **claim** (`home`/`weight`/caption/order) from the **cell**; and at
> most **3** extent panes can exist planet-wide. **A-51 and A-52 are unchanged**, this increment's "Built"
> bullet is unchanged line for line, and **two criteria and one docstring sentence** are added below. The
> only condition still on this gate is Jacob's own approval of A-51.

- **Built.** **`packages/client/src/selectors/worldMap.ts`:** the C5/C6/C7 block (`weightOf`, `lowestCode`,
  `totalWeight`, `ranked`, `split`, `paneGroups`), `inFrameOf`'s per-pane second `clusterPoints` call and
  the `detachedParts` block are **deleted** and replaced by **one** `clusterPoints` call over the canonical
  part list plus one `.map` to panes (A-51 G2/G3/G4). `WorldMapPane` loses `role` and gains `home`;
  `weight` becomes `Σ tripIds.length` over `home` and is additive again. **`home` carries A-53 Part 4's
  block quote as its docstring** — *a pane is a rectangle to look through, not a destination; a **home
  pane** has `home.length > 0`; an **extent pane** has `home.length === 0`, `weight === 0`, and holds only
  geography belonging to a country visited elsewhere; `weight` is the claim and the grid cell is not* — so
  *"one kind of pane"* can never be read as *"every pane is a place you went"*. **Comment only: A-53
  supersedes no clause of A-51, adds no field and brings back no `role`.** `frameNum`, `subpath`, `paneFrame`,
  `cornersOf`, `WHOLE_WORLD`, `FRAME_PAD_FRACTION`, `WORLD_CLUSTER_THRESHOLD_KM`, C1's population loop, the
  `missing` handling and the C9 emit block are **unchanged**. **The file gets shorter.**
  **`packages/core/src/derive/country.ts`:** A-52 — `countryParts` drops the `ring.length >= 6` filter, so
  `[]` means *"the index carries no ring for this code"* and nothing else. **`countryKeyPoint` is not
  modified** and stays exported (A-51 Part 6). **`apps/web/src/views/WorldMap.tsx`:** the three `role`
  branches collapse to two keyed on `pane.home.length`; every pane carries a caption.
  **`apps/web/src/styles.css`:** `.worldmap__panes` flex → `grid` with `repeat(auto-fill, minmax(var(--pane-min,
  300px), 1fr))` and `align-items: start`; one `--pane-cap: min(38vh, 300px)` replaces the two role-keyed
  ones; `.worldmap__svg` is **A-50's rule, unchanged**. **`packages/core/test/countryParts.test.ts`:** R38-1
  — put `900` in the threshold list, restore A-49 I12's own injected fault as the red one, name `ID` rather
  than `US`, and correct KD-71's wording to *"vacuous on `US` and at 4,000 km"*.
  **No change to `clusterPoints`, `clusterStops`, `focusCluster`, `mapBounds` or `derive/cluster.ts`; no
  export-surface movement (79); no `SUMMARY_VERSION` bump, no `schemaVersion` bump, no
  `StoragePort`/`FilePort`/`MapPort` change, no reducer action, no new dependency, and no change to what is
  drawn once framed.**
- **User-visible outcome.** The map stops having a headline panel and a footnote panel. Every place you have
  been gets its own frame, at its own scale, in a grid — the region you travel most in first. A traveller
  with France and the United States sees a map of France and a map of the United States, instead of one
  strip of Atlantic with France 36 px wide in the corner of it.
- **Architecture / data model.** A-51 and A-52 in full. A-41 Part 7's do-not-build list still binds, minus
  the pane cap: still no manual reframe control, no re-clustering UI, no threshold slider, no continuous
  zoom or pan, no per-screen-size **frame** rule, no projection change, no dateline-aware bounds, no
  geometry simplification, and no *"drop the outlier"* option.
- **Verification.** Every criterion is `[stated]` against A-51/A-52, and every one has a fault that must
  measure red:
  - **R38-2's own libraries, as numbers** `[stated]`. `FR`+`US`: **4 panes**; France's home pane is
    **14.15° × 9.77°** at **≥ 40% land** (measured 43.17%) and France renders **≥ 60,000 px²** at 390 × 820
    (measured 342 × 236 = **80,712**, against **899**). `FR`+`NZ`: **3 panes**, **no pane below 15% land**
    (measured worst 18.98%, against **0.48%**). `GB`+`AU`: **2 panes**, GB **≥ 60,000 px²** (measured
    307 × 288 = 88,416, against 360). `US`+`JP`: **3 panes**, Japan **≥ 300 × 250 px** (measured 319 × 287,
    against 20 × 18). **Injected fault:** restore C5 and C7 and all four return to one pane at 134.2°,
    183.1°, 161.1° and 270.2°.
  - **The census, not the anecdote** `[stated]`. Over **all 28,441** two-country / one-trip-each libraries:
    pane-count histogram **{1: 5,564 · 2: 22,360 · 3: 516 · 4: 1}** (shipped: **one** geographic pane in
    **100%**), and panes wider than 120° fall **8,364 → 1,229**. ~~**Every** one of the 1,229 contains one of
    `AQ`, `FJ`, `KI`, `RU`, `UM` — the five antimeridian-box codes A-51 residue 3 declares out of scope —
    which is asserted as a set equality, not as a count.~~ **Injected fault:** re-introduce the dominance test
    and the histogram collapses to `{1: 28,441}`.
    > **Corrected by revision 37 (QA R39-4, `ARCHITECTURE.md` A-54 Part 4). The struck sentence counts
    > panes where it says libraries and is unsatisfiable as written.** Re-derived twice independently, on
    > the same 28,441 pairs: **1,236 panes** exceed 120° by **unpadded** bounds (**1,237** padded), of which
    > **1,187 contain one of the five** and **49 do not**; **1,229** is the number of *libraries* holding at
    > least one such pane, which is the figure the sentence above it uses and the reason the two got mixed.
    > **What the criterion asserts is the three-way decomposition, with its base stated:** of the **1,236**
    > panes, **1,187** contain one of `AQ FJ KI RU UM`; of the remaining **49**, **48 span more than 180°**
    > — the planar-bounding-box artefact of a trans-antimeridian pair, e.g. `AS`+`MH` at 343.1° — and
    > **exactly one is an honest wide frame, `CA`+`GL` at 128.8°**, two large neighbouring countries, which
    > is not a defect and must not be counted as one. **Injected fault:** assert the old set equality and it
    > goes red on 49 panes, which is what it should always have done.
  - **Tightness, as a theorem a test can hold** `[stated]` (A-51 **I16**). For every library in the fixture
    set, every pane's member parts admit a spanning tree over their key points with every edge
    `< WORLD_CLUSTER_THRESHOLD_KM`, and every cross-pane part pair is `≥` it. **Injected fault:** merge any
    two panes and the spanning-tree edge across them exceeds the threshold.
  - **Home panes come first, and an `FR`-only library does not open on French Guiana** `[stated]`
    (**A-53**, A-51 **I18**). Over the fixture set and all 239 single-country libraries: every pane with
    `home.length > 0` precedes every pane with `home.length === 0`, strictly, and `panes[0].home.length > 0`
    whenever any code is drawn. Pinned concretely: on `["FR"]` the **raw** G3 component order is
    `[French Guiana (home []), continental France (home [FR])]` and the **framed** order after G5 is the
    reverse, `panes[0].bounds` spanning **14.15° × 9.77°**; on `["FR","US"]` the order is
    **FR · US · Guiana · Alaska** with weights **1 · 1 · 0 · 0**. **Injected fault:** order panes by their
    component's canonical position instead of by G5 and the `FR` library opens on a 2.87° × 3.70° rectangle
    of South America — which is what the un-ordered partition actually produces, not a hypothetical.
  - **Territories cannot flood the grid, and the bound is a property of the index** `[stated]` (**A-53**
    Part 5). At `WORLD_CLUSTER_THRESHOLD_KM` the only codes with more than one part are **`FR`, `UM`, `US`**
    (asserted as a set equality over all 239 codes, not as a count), so over all 239 single-country and all
    **28,441** two-country libraries the number of panes with `home.length === 0` is **≤ 3** in every
    library and is **> 0 only** for a library containing one of those three codes. Re-pinned on the named
    fixtures: `AT CZ DE GB HR HU US` → 3 panes / **1** extent; the 12-code worldwide library → 8 panes /
    **1** extent; **the 14-pane greedy worst case → 14 panes / 0 extent**; all 239 codes → 1 pane / 0
    extent. **Injected fault:** count a pane as extent whenever it holds any non-principal part and the
    `FR DE IT JP PE` South-American pane (`home === ["PE"]`) goes red — which is the case that proves
    membership is decided by geometry and never by a territory list.
  - **Locality — the invariant three rounds could not see** `[stated]` (A-51 **I17**). For **200** random
    (library `A`, code `x ∉ A`) pairs: in `A ∪ {x}`, every pane of `A` whose component gains no part of `x`
    has a **byte-identical** `viewBox`, `bounds` and `codes`. **This criterion must be written over a pair of
    libraries, and that is the point** — R38-2 is exactly its violation and every gate in this arc so far
    measured one library at a time. **Injected fault:** compute the extent over the union of all drawn
    countries and `FR`'s pane moves the moment `US` is added.
  - **R33-1 is not regressed, and the sample's geometry does not move at all** `[stated]`. The reference
    library `["AT","CZ","DE","GB","HR","HU","US"]` still gives **3 panes** whose `viewBox` strings are
    **byte-identical to I-8d's, I-8g's and I-8h's**: `"-8.1779 -59.2407 31.494 17.3663"`,
    `"-125.8416 -50.5435 60.0314 26.618"`, `"-172.8399 -72.4066 43.9088 54.5393"`. `panes[0].codes ===
    ["AT","CZ","DE","GB","HR","HU"]`, weights **6 · 1 · 0**, `Σ weight === 7 === W`. What moves and is
    re-pinned here: ids become `p0/p1/p2`, `role` is gone, `panes[2].home === []`, and the third pane is laid
    out **242 × 300 px** instead of 137 × 170. **Injected fault:** order panes by anything but A-51 G5 and
    `p0` stops being the European pane.
  - **A genuinely single-cluster history is untouched, and a 239-code library is one honest world map**
    `[stated]`. `AT CZ DE HR HU SI` → **1 pane**, `16.72° × 12.50°`, byte-identical to I-8h's. All **239**
    codes → **1 pane**, `360.0° × 173.6°`, **byte-identical to I-8h's**, 30.3% land. **Injected fault:**
    make the pane count a function of `codes.length` and the 239-code case fragments.
  - **The detached-part speck is fixed by construction, not by a rule** `[stated]` (R38-4). French Guiana on
    `FR`+`US` renders **≥ 200 × 250 px** (measured 223 × 288, against **7 × 8 = 56 px²**), and the same
    223 × 288 on `FR` alone — i.e. **its size no longer depends on what else is in the library**, which is
    I17 again. On `FR DE IT JP PE` it is **inside the Peru pane** (2,700 km, genuinely connected), which is
    A-49 residue 1's own reopen trigger answered. **Injected fault:** restore C8″'s union pane and it returns
    to 7 × 8 on `FR`+`US`.
  - **No pane cell is letterboxed, in either direction** `[stated]` (A-50 extended, R38-3). In Chromium at
    **390 × 820** and **1440 × 700**, for the reference sample, for a four-pane library and for all **239**
    single-country libraries: `cell.height − svg.height − caption.height − padding ≤ 1 px` and
    `cell.width − svg.width − padding ≤ 1 px`. The measured starting points this replaces: the sample's US
    inset at **44.1%** of its cell and a four-pane `inset-2` at **21.3%**. **Injected fault:** restore
    `display: flex` on `.worldmap__panes` and both numbers come back.
  - **Nothing is cropped, and the invariant can now fail** `[stated]` (A-51 **I11** restated, A-52). For
    every drawn code, the multiset of rings across all its `WorldMapCountry` entries equals the code's ring
    set **read from `index`** — over the reference sample, `FR`+`GR`, `FR`+`US`, a 239-code library, **and a
    fixture carrying a two-point ring**, which round 38 proved A-49's version could not see. **Injected
    fault:** restore the `ring.length >= 6` filter and the fixture goes red *(under A-49's oracle it stayed
    green, which is the finding)*.
  - **The kernel and the day map are untouched by construction** `[snapshot]` + `[stated]`.
    `git diff` on `packages/core/src/derive/cluster.ts` is **0 lines**; inside `packages/core/src` only
    `derive/country.ts` moved; `npm run golden && npm run sample && git status --porcelain` leaves the tree
    clean at sha `40955ca0b182…`; A-48's I9 re-runs green. **Injected fault:** the vacuity control is the
    diff — if `cluster.ts` moved, this increment is out of scope and the builder stops and reports.
  - **Nothing is lost, and every invariant still holds** `[stated]` — a ceiling, not a floor. A-51 Part 7's
    consolidated **I1–I13, I16, I17** over the fixture set covering 1, 2, 3, 4 and ≥8 panes, a `missing`
    code, an empty library, an all-missing library, a 239-code library, `FR`-alone, `FR`+`GR`, `FR`+`US` and
    the micro-state library `FR DE IT LU MC VA AD`. **I12** re-runs at 8 thresholds including **900** (R38-1)
    with `ID` as the named fault. **Code-blindness (L5):** permute every ISO code in the index and every pane
    is byte-identical — round 38's own test, re-pointed. **Injected fault:** any single invariant's own
    named fault, each of which must be red.
  - **The renderer still computes nothing** `[stated]`. W1's ten identifiers return **0** hits in
    `WorldMap.tsx`; `.sort(`, `new Set(` and `Object.keys(` return 0; there is no arithmetic over
    coordinates; the only `viewBox` expression is `pane.viewBox`; the only geometry-shaped values crossing
    into the view are `pane.aspect` and `frame.codes`; and the pane's countries are still selected by
    `country.paneId === pane.id` and by nothing else (W3). The one new read is `pane.home.length === 0`,
    which is a length check and not a coordinate. **Injected fault:** derive the caption from `pane.bounds`
    and the ceiling goes red.
  - **Nothing else moved** `[stated]`. `Object.keys(core).length` is **79**, re-counted rather than quoted;
    `npm run typecheck` and `npm run test:tap` green; `qa/r2-redact.mjs` **0 KNOWN_LEAKS**;
    `qa/r2-constraints.mjs` unchanged; the root planner's md5 unmoved and `git diff` over
    `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root empty.
- **Dependencies / blockers.** **Jacob's approval of A-51 — a hard gate, see the box above.** Then I-8h
  (shipped). **Does not block I-8b.** R38-1 rides along as a builder line.
- **Ship gate.** Jacob has approved A-51 in writing; every criterion above has its injected fault red; the
  export surface is **79**, re-counted; `cluster.ts` has a zero-line diff and the day map's goldens are
  byte-identical; the reference sample's **three** `viewBox` strings and the 239-code and `AT CZ DE HR HU SI`
  frames are byte-identical to I-8h's; `node qa/r36-atlas.mjs`, `qa/r37-a48.mjs`, `qa/r38-a49.mjs` and the
  three render probes are re-run with every assertion that survives A-51 reporting clean and **each
  superseded assertion named rather than deleted** (in particular `r38-a49.mjs` §J's census line, which is
  R38-2's own oracle and must flip); and the four libraries R38-2 named, driven through the real app at
  390 × 820, measure the four numbers pinned in the first criterion.

#### I-8j — the cells tile the container, a malformed ring is stated instead of blanking the map, and the last tie is broken by latitude

*(Revision 37. Carries `ARCHITECTURE.md` §4.4 **A-54** and answers the manager's I-8i gate items **MGR-1**
(MAJOR) and **MGR-4**, plus QA **R39-1**, **R39-2**, **R39-3**, **R39-4**, **R39-5** and **R39-7**. **Runs
after I-8i** (shipped) and **gates I-8b**. **Builder + breaker, mandatory** — it changes the semantics of
two `packages/core` exports and the invariant a public one rests on, which is `cairn/CLAUDE.md`'s own
trigger. **Scope discipline, stated because two gate items are open at once: this increment is layout +
tie-break + the ring guard, and nothing else. `MGR-2` / `I-8f` is a separate builder pass on different
files and may not be folded in.** A builder reads **A-54** first — it names which sentences of A-51, A-52
and A-53 it supersedes — then A-51 G5/G7 and Part 8, then A-50, then A-40 Parts 2–5, and needs nothing else
in `ARCHITECTURE.md` except §2.10's list.)*

- **Built.** **`apps/web/src/styles.css`** — A-54 **G7′**: `.worldmap__panes` becomes `display: flex;
  flex-wrap: wrap` with the existing `gap: 1px` and `background: var(--line)`; `grid-template-columns` and
  `align-items: start` are **deleted** (`align-items` returns to its `stretch` default);
  `.worldmap__pane` gains `flex: 1 1 var(--pane-min, 300px)` and `min-width: 0`. **G7″**: the cell keeps
  `background: var(--card)` and gains **no** border, outline or box-shadow. `--pane-cap`, `--pane-min`, the
  caption rule and **A-50's `.worldmap__svg` rule are unchanged, verbatim**; the comment block above
  `.worldmap__panes` is rewritten to say why the container is a flex line box rather than why it is a grid.
  **`packages/core/src/derive/country.ts`** — A-54 Part 2: one **module-private** predicate (a ring is
  drawable iff its length is even, `>= 2`, and every element is a finite number) and one private per-code
  gather, called by **both** `countryParts` and `countryKeyPoint`. `countryParts` returns `[]` when the code
  has no entry, no ring, or **any** non-drawable ring. `countryKeyPoint` returns `null` under exactly the
  same condition: its `ring.length < 6` filter and its `principal === null` entry-box fallback (with R37-5's
  now-unreachable non-finite guard) come **out**. The A-52 docstring's *"`[]` iff the index carries no ring
  at all"* is rewritten to A-54's biconditional. **No signature changes, no new export.**
  **`packages/client/src/selectors/worldMap.ts`** — A-54 Part 3: the pane comparator gains
  `bounds.north` descending and `bounds.west` ascending **between** `home.length` and the canonical
  position, and the G5 comment block says which key is the alphabet and that it is the last one.
  **Tests:** `packages/core/test/countryParts.test.ts` gains the four malformed-ring fixtures and the
  biconditional; `packages/client/test/world-map.test.ts` gains the tie-break census and — **R39-5's builder
  half, which does not wait on this increment** — replaces its order-**preserving** ISO relabel with an
  order-**destroying** one. A render probe gains the container-occupancy assertion.
  **No change to `WorldMap.tsx` (zero lines), `clusterPoints`, `clusterStops`, `focusCluster`, `mapBounds`,
  `derive/cluster.ts`, the day map, `MapPort` or `tools/gen-countries.mjs`; no export-surface movement (79);
  no `SUMMARY_VERSION` or `schemaVersion` bump; no port change, no reducer action, no new dependency, and no
  stored byte of any trip.**
- **User-visible outcome.** The map card stops having grey holes in it. On a laptop or tablet the panels
  fill the card instead of leaving up to two thirds of it looking like a map that failed to load, and on a
  small phone the map stops being clipped at the edge. Where two places tie, they are read **north to
  south** — the way a map is read — instead of alphabetically. And an index that cannot draw a country now
  says so, where before it drew nothing at all and said nothing.
- **Architecture / data model.** A-54 in full. A-51's geometry (G1–G4, G6, G8, L1/L2/L4, I1–I18) and A-53
  are untouched; A-41 Part 7's do-not-build list still binds in full.
- **Verification.** Every criterion is `[stated]` against A-54, and every one has a fault that must measure red:
  - **The container is tiled by its cells** `[stated]` (A-54 **G7′**, MGR-1). In Chromium, over **8**
    libraries — Europe 2026, `FR`+`US`, `AT CZ DE HR HU SI`, sparse `CL NO JP MG`, worldwide 12, the
    18-pane greedy library, the 239-code ceiling and `FJ` alone — at **320 · 390 · 640 · 960 · 1440 px**:
    `Σ cell area ÷ container area` is **≥ 0.99 and ≤ 1.00** in every one of the 40 cells of that matrix
    (measured: 0.995–1.000; the 0–0.5 % residue is the 1 px gap). **Both bounds are load-bearing** — the
    upper one is the 320 px overflow. **Injected fault:** restore `display: grid` +
    `grid-template-columns: repeat(auto-fill, minmax(var(--pane-min), 1fr))` + `align-items: start` and the
    matrix returns to **66.7 %** empty (`AT CZ DE HR HU SI`, the 239-code ceiling and `FJ` at 960 and
    1440), **45.6 %** (`FR`+`US` at 1440), **29.0 %** (Europe 2026 at 1440) and **104.6 %** occupancy —
    i.e. overflow — at 320.
  - **No cell draws a boundary of its own** `[stated]` (A-54 **G7″**). Computed style of every
    `.worldmap__pane`: all four `border-*-width` are `0px`, `outline-style` is `none`, `box-shadow` is
    `none`, and `background-color` equals `.worldmap__figure`'s. This is the clause that keeps **R38-3**
    fixed now that its own cell criterion is withdrawn, and it is why the slack inside a cell is whitespace
    rather than a letterbox. **Injected fault:** give `.worldmap__pane` a 1 px border and it goes red.
  - **A-50 is unchanged and still holds** `[stated]`. Its criterion, verbatim: the painted map's rendered
    width equals the `<svg>`'s rendered width and its height equals its height, to within 1 px, over all
    **239** single-country libraries and the reference sample at **390 × 820** and **1440 × 700**.
    **Injected fault:** A-50's own — restore `width: 100%` + a static `max-height` and `MV` returns to
    22.0 % and `CL` to 33.4 %.
  - **Nothing on screen gets smaller** `[stated]`. For every library in the occupancy matrix at
    **390 px and above**, every pane's rendered `<svg>` area is **≥** the area the shipped grid gives it.
    **At 320 px the comparison is deliberately the other way and must be stated as such**: the shipped
    grid draws 12 px wider than the container that clips it, so the maps there are *smaller and whole*
    rather than larger and cropped (Europe 2026 39,905 → 36,268 px²), and the criterion at that width is
    the occupancy upper bound above, not this one. Pinned where it grows:
    the 239-code ceiling **45,956 → 179,180 px²** at 640, `AT CZ DE HR HU SI` **71,851 → 118,817 px²** at
    960, and `FJ` alone's own path **552 → 4,992 px²** at 960. Pinned where it must **not** move: Europe
    2026, `FR`+`US`, worldwide 12 and the 18-pane library are **identical at every width**.
  - **Reading order is untouched, and I18 still reads on screen** `[stated]`. DOM order equals frame order;
    the geometric top-left ordering of the cells equals DOM order at one, two, three and four columns; and
    no extent pane precedes a home pane in either. **This is the criterion that refuses masonry**, so it is
    written even though nothing in the diff threatens it. **Injected fault:** `grid-auto-flow: dense` (or
    `columns:`) on the container and the geometric order stops matching the DOM order.
  - **A malformed ring is stated, not blanked** `[stated]` (A-54 **I19**, R39-1). Against a hand-built
    index — not the shipped one — carrying, for one code, each of `rings: []`, `[[]]`, `[[7]]`, `[[1,2,3]]`
    and `[[1, NaN]]`: `countryParts` returns `[]`, `countryKeyPoint` returns `null`, the code appears in
    `frame.missing` **exactly once and never in `countries`**, and **no `viewBox` contains `NaN` and no
    `aspect` is non-finite** anywhere in the frame. Driven to the DOM for at least the single-code case:
    the surface **states the code in words** rather than painting an empty card. **Injected fault:** remove
    the predicate and the same fixtures produce `viewBox: "NaN NaN NaN NaN"`, `aspect: NaN`, `d: ""` and
    `missing: []` — which is the finding, reproduced.
  - **The two core functions agree on every index, not just the shipped one** `[stated]` (R39-2, **I12**).
    `countryParts(code, index, t) === []` **⇔** `countryKeyPoint(code, index) === null`, asserted in both
    directions over all **239** shipped codes at the eight thresholds I12 already uses **and** over the
    malformed fixtures above **and** over the two cases A-52 got wrong: an entry with a finite `box` and
    `rings: []`, and a code whose only ring has two points. On the second, the principal part's `key` and
    `countryKeyPoint`'s answer are **identical under `Object.is`** — which is what R39-2 measured as
    `{5.5, 5.5}` vs `{0, 0}`. **Injected fault:** restore the `ring.length < 6` filter in `countryKeyPoint`
    and the two-point case goes red.
  - **The shipped index is untouched by the guard, and the guard does not depend on the generator**
    `[stated]`. Asserted on `COUNTRY_INDEX` itself: **292 entries, 1,033 rings, shortest ring 8 elements,
    0 odd-length rings, 0 non-finite coordinates, 0 entries with no ring** — so every ring is drawable and
    **every frame in the suite is byte-identical to I-8i's**. The three reference `viewBox` strings still
    read `"-8.1779 -59.2407 31.494 17.3663"`, `"-125.8416 -50.5435 60.0314 26.618"` and
    `"-172.8399 -72.4066 43.9088 54.5393"`, and `npm run golden && npm run sample && git status --porcelain`
    leaves the tree clean at sha `40955ca0b182…`. **Injected fault:** the vacuity control is the index
    census — if any of those six numbers moves, the index changed and this increment is out of scope.
  - **The tie-break is geography, and the alphabet is named where it survives** `[stated]` (A-54 **G5′**,
    R39-5). Over **all 239** single-country, **all 28,441** two-country and **2,000** random 2–25-code
    libraries: the third key is reached in **24,204** libraries and decides **25,454** adjacent pairs;
    **`bounds.north` resolves every one**, `bounds.west` decides **0**, and the canonical-list position
    decides **0**. **I18 is violated in 0**, and `panes[0].home.length > 0` wherever any code is drawn.
    Pinned: the Europe 2026 fixture's pane order and all three `viewBox` strings are **unchanged**;
    `FR`+`US` reads **FR · US · Alaska · Guiana** (France still first, now because N 51.1 > N 49.4, and the
    two weight-0 panes swap); the 18-pane library reads **`GL RU RO PK MX EH VN MS GU RW IO SH AU FJ CL PN
    TF AQ`**, Greenland to Antarctica. **Injected fault:** drop the `north`/`west` keys and 11,456 of the
    30,680 libraries reorder, 10,636 of them at `panes[0]`.
  - **Code-blindness, with the obligation L5 can actually carry** `[stated]` (A-54 Part 3, R39-5's builder
    half). Under an **order-destroying** ISO relabel of the whole index, every pane's `viewBox`, `bounds`,
    `codes`, `home` and `weight` is byte-identical **and — new under G5′ — so is pane order**, over the
    library set round 38 used. **Injected fault:** the test must fail if run against the pre-G5′ comparator,
    which is what makes it a real obligation rather than the order-preserving relabel that proved less than
    it read.
  - **The corrected numbers are asserted, not just written down** `[stated]` (R39-3, R39-4). The greedy
    search's best independent library is **18 codes → 18 panes, all 18 `home`** (`AQ AU CL EH FJ GL GU IO
    MS MX PK PN RO RU RW SH TF VN`), so A-53 Part 5's *"the ceiling contains zero extent panes"* holds at
    the real ceiling. Over all 28,441 pairs, panes wider than 120° unpadded: **1,236**, of which **1,187**
    contain one of `AQ FJ KI RU UM`; of the **49** that do not, **48 span more than 180°** and **exactly
    one (`CA`+`GL`, 128.8°) does not**. **Injected fault:** assert I-8i's original set equality and it goes
    red on 49 panes.
  - **Nothing else moved** `[stated]`. `Object.keys(core).length` is **79**, re-counted rather than quoted;
    `git diff` on `packages/core/src/derive/cluster.ts` is **0 lines** (third increment running);
    `WorldMap.tsx` has a **0-line** diff and W1's ten identifiers still return 0 hits; `npm run typecheck`
    and `npm run test:tap` green; `qa/r2-redact.mjs` **0 KNOWN_LEAKS**; `package.json`/`package-lock.json`
    diff **0 lines**; the root planner's md5 is `7c69df3208ef91c8be0fb59a56443188` and `git diff` over
    `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root is empty.
- **Dependencies / blockers.** I-8i (shipped). **Independent of I-8f / MGR-2** — different files, different
  finding, and the two may be built in either order or in parallel, but **not in one session**.
- **Ship gate.** Every criterion above has its injected fault red; the occupancy matrix is **≥ 0.99 and
  ≤ 1.00 in all 40 cells**; the malformed-index fixtures all reach `missing` and no frame anywhere is
  non-finite; the tie-break census reports **north 25,454 / west 0 / canonical 0**; the Europe 2026
  fixture's three `viewBox` strings, its pane order and the day map's goldens are **byte-identical**; the
  export surface is **79**, re-counted; and `qa/i8i-render.mjs` and `qa/r39-render.mjs` are re-run with
  **every superseded assertion named rather than deleted** — in particular R38-3's cell criterion, which
  A-54 withdraws and which must be replaced by the container criterion in the same pass rather than simply
  removed.

#### I-8b — Profile

*(Revision 27. Takes the Profile half of I-8's spec above, unchanged, plus the tab registration I-8a left
for it. **2b ships here.** Revision 28 adds I-8c and I-8d to its blockers; revision 33 adds I-8g;
**revision 38 gives it a design spec — `cairn/docs/DESIGN.md` §5 — and a rendered acceptance standard,
§6.** Revision 38 adds **no data, no domain concept and no backend**: the *Built* list below is I-8's own
Profile half plus the four shell items §5.6 enumerates, and nothing else.)*

- **Built.** `Profile.tsx` — countries, cities, trips, days travelled, first and last visit per country, and
  the honest count of what could not be attributed; the Profile tab registered into I-8a's shell; the rescan
  indicator from I-6 visible on screen and not merely in state. Cities appear as **text**, which is where
  they need no geometry (A-40 Part 5). **Built to `DESIGN.md` §5**, which is the spec rather than a
  suggestion: the four movements (the claim · the record · its shape over time · what we do not know), the
  identity line as **one typographic statement rather than three stat tiles**, the country record as
  **hairline-separated rows rather than cards**, cities grouped under their country, and the unattributed
  block as **content rather than a footnote**. Plus the five bounded shell items §5.6 enumerates and closes:
  the third tab registration; the **bottom-anchored tab bar at phone widths** with safe-area padding
  (§3.3 R1) and the sticky-stack fix that removes `.tabbar`'s hardcoded `top: 2.7rem` (R2);
  `--pane-cap: min(38vh → 38svh, 300px)` (R3, one token, no `viewBox` moves); the **touch-target floors**
  (§3.4 — `.icon`'s 26 × 26 hit area is the named failure); and arrow-key traversal on the tablist.
  **No engine change, no `packages/core` or `packages/client` diff, no `SUMMARY_VERSION` bump, no export-surface
  movement, no new runtime dependency, and `WorldMap.tsx` stays a zero-line diff** — fourth increment running.
- **User-visible outcome.** A travel identity, and a screen that says what it does not know. **On a phone
  first**: this is the increment where Cairn's navigation becomes reachable one-handed and its visual
  direction becomes a written contract rather than a set of comments.
- **Architecture / data model.** No new *domain* ruling — I-8's spec as written, minus the map clauses I-8a
  discharged. Two documents bind that did not exist at revision 27: **`DESIGN.md`** (the design contract,
  made binding by `ARCHITECTURE.md` §9.1) and **A-55** (the tooling ruling — which is why this increment
  adds no dependency and needs no modal, no drawer and no component library; §5.5 rules the country
  drill-down as an **inline expansion**, which is both the better interaction and the reason the standing
  shadcn revisit trigger is not hit). **§9.2's fences apply**: the world map's geometry is closed, and no
  media query may be added to `.worldmap__panes`.
- **Verification.** I-8's remaining criteria, on this surface: the provisional treatment asserted on the
  rendered Profile with the same injected fault; the `travelStats` refusal boundary — **including revision
  39's equivalence criterion**: the Map's and the Profile's refusal banners must render **identical text**,
  asserted on both branches of the message and on rendered output rather than on source substrings
  (`DESIGN.md` §5.5, §6.2); `unattributed` and
  `unnamedCities` rendered rather than hidden, with the *"no places yet"* case distinguishable from *"all
  attributed"*; and the tab shell still carrying exactly three tabs. **Plus `DESIGN.md` §6 in full**, which
  is the rendered acceptance standard and is where this increment's new criteria live rather than being
  restated here. The five that carry an injected fault, named so the ship gate can be checked without
  opening §6:
  - **Touch targets** `[stated]`. Every `button, a[href], [role="button"], [role="tab"], input, select`
    has a hit box **≥ 24 × 24 CSS px** at all five contexts (WCAG 2.2 SC 2.5.8) and **≥ 44 × 44** at the
    three touch contexts for any primary target. **Injected fault:** restore `.icon`'s 26 × 26 hit area and
    the assertion goes red at the three touch contexts and **stays green at the two desktop ones** — which
    is what proves the probe is measuring the touch matrix and not the page.
  - **No `vh`/`dvh` on a fixed-height scroll container** `[stated]`. A greppable ceiling over `styles.css`
    in W1's shape: `38vh` may not appear on `--pane-cap` and `100dvh` may not appear on `.spine`'s
    `max-height`. **Injected fault:** put `38vh` back and the grep goes red.
  - **Motion budget** `[stated]`. Every non-zero `transition-duration`/`animation-duration` on the surface
    is **≤ 300 ms**, no timing function is a bare `ease-in`, and under
    `newContext({ reducedMotion: 'reduce' })` **every one resolves to `0s`**. **Injected fault:** give the
    country-row expansion a 600 ms bounce and both halves go red.
  - **The past is not decayed** (`DESIGN.md` P3) `[stated]`. The computed contrast of the `completed`
    lifecycle chip is **≥** that of `planned`, in **both** colour schemes. **Injected fault:** drop
    `.chip--life-completed` to `--ink-faint` and it goes red. *(This is a real risk on this screen: it is
    the first surface where completed trips are the majority of the content.)*
  - **`wide` adds no layout** `[stated]`. Every element inside the content column has an identical computed
    width at **1280** and **1600**; only the container's left offset differs. **Injected fault:** add a
    third column at `min-width: 1600px` and it goes red. *(A ceiling, not a floor — rule 4.)*

  **Five contexts, and they are device profiles rather than bare widths** (§6.1): `devices['iPhone SE']`
  320 × 568 · `devices['iPhone 14']` 390 × 664 · `devices['iPad Mini']` 768 × 1024 · `1280 × 800` ·
  `1600 × 900`, each in **both** colour schemes. Interaction is **driven**, not inspected: tap the country
  row, tap it again, reach it with `Enter`, cycle all three tabs, and drive the refusal, empty and
  provisional paths. **The honest gap, which must be reported rather than claimed** (§6.4): only Chromium is
  installed here, and it emulates neither iOS Safari's retracting chrome nor `env(safe-area-inset-*)`, which
  it reports as `0px`. So the **safe-area assertions are not discharged by a Chromium run.** §6.4 gives the
  order: install WebKit first (`playwright install webkit` — the CDN resolves through the proxy, probed
  2026-09-01), and if it will not install, assert the declaration plus a forced-inset override and **record
  the residue in `BUILD-NOTES.md` as an unverified claim**, which is this project's existing convention for
  something that could not be run.
- **Dependencies / blockers.** I-8a, **I-8c, I-8d, I-8e, I-8f, I-8g and I-8j** (revision 28 for the first two, revision
  29 for I-8e, revision 32 for I-8f, revision 33 for I-8g, **revision 37 for I-8j**; this is a hard gate rather than a preference).
  **I-8j**, because the manager's I-8i gate routed three items that gate this increment and two of them are
  ruled in it: I-8b puts a **second** surface on the same `travelStats`/index pair, and neither *"the map
  card is two-thirds bare"* (MGR-1) nor *"the map is blank and says nothing"* (R39-1) is a failure mode to
  widen onto a new screen. The third, **MGR-2 / I-8f**, is a builder pass and is already in this list. I-8c, because the Profile renders
  `travelStats`-derived numbers as a claim about the user's travel identity and would otherwise inherit
  A-45's wrong ones — and because it registers a **third** surface into a shell where one unreadable stored
  row still takes the whole app down (A-44). I-8d, because 2b ships here and the map is half of what 2b is.
  **I-8e**, because this increment puts a second surface on the same rows, and a trip that is silently
  unopenable *and* unexportable is a worse story once the Profile is summarising a whole travel life (QA
  R34-2). **I-8f**, for the same reason one degree stronger: I-8e closes that story only for a bad
  `startDate`/`endDate`, and round 35 measured the `days[n].date` population — **8:1 larger on the shipped
  sample** — still rendering as a healthy card with Delete as its only exit (QA R35-1). **I-8g**, because
  round 36 found that I-8d framed the *wrong* subject for a whole class of libraries and that the alphabet
  decided which country the surface calls *"shown separately"* — a claim this second surface inherits
  (QA R36-1, R36-2). *2b does not ship until the map is a map of the right subject, the numbers on it are
  true, and no trip in the library can be lost without being offered.* **Revision 38 adds no blocker** — the
  design pass produced a spec, not a dependency, and `REVIEW.md`'s I-8f/I-8j gate already recorded that
  nothing on this line is outstanding.
- **Ship gate.** **2b is independently shippable here.** Criteria 4, 5, 6 and 7 all pass. **Plus:**
  `DESIGN.md` §6's matrix is run at all five contexts in both colour schemes, every criterion above has its
  injected fault red, and any §6 assertion that could not be discharged in Chromium is **named as
  unverified in `BUILD-NOTES.md`** rather than reported as passing.

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
- **Verification.** Round-trip byte-identical with participants present; ~~`fromJSON` rejects a duplicate
  participant id~~ *(**withdrawn at revision 56** — this bullet contradicted `ARCHITECTURE.md` §8.3, which
  had already put the code in `validateTrip`, and it is the defect **A-73** rules on. **Replaced by:**
  `fromJSON` **opens** a document with a duplicate participant id and `validateTrip` reports
  `duplicate_participant_id` at `level:'error'` naming both people — I-9a)*; undo/redo restores participants
  exactly at depth 50; every new action maps 1:1 onto a core
  build function and the reducer holds no domain logic. Attack list: 200 participants; two participants with
  the same name and different ids, and the same id twice; a name of `''` and a name that is only an emoji;
  `kind:'self'` twice and zero times.
- **Dependencies / blockers.** None beyond a green suite. Could in principle precede I-5–I-8; **keep it
  here** so 2b is not held behind it.
- **Ship gate.** Three build functions on §2.10's list with the count re-counted; validation codes have
  injected-fault tests (a rule with no injected-fault criterion does not ship).

**2c ships narrowed, at I-9 — revision 55.** With **I-10 deferred** (below), step 2c's shippable unit is
I-9 by itself: `Trip.participants` exists, validates, round-trips, undoes at depth 50 and **grants
nothing**, and all of that is provable with `node --test` and `qa/access.mjs` on a machine with no browser.
What 2c does **not** ship in this phase is its **surface** — no participant can be entered or seen in the
app. That is a capability with no screen, which is the same trade step 2d already made for §10's photo
record class, made for the same stated reason, and it is stated here so nobody reads "2c shipped" as
"participants are usable." **Nothing in this note re-scopes I-9**, whose bullets above are unchanged.

#### I-9a — The two rulings on I-9's disclosed objections: `SCHEMA_VERSION` 3, and one home for `duplicate_participant_id` (revision 56)

**A builder follow-up, not a new capability.** It is the code for `ARCHITECTURE.md` revision 54's **A-72**
(BUILD-NOTES **KD-96**) and **A-73** (BUILD-NOTES **KD-97**). Both objections were disclosed by the I-9
builder rather than resolved in code, which was the correct behaviour; both are upheld. **Read A-72 Parts
5–7 and A-73 Parts 6–7 and nothing else in `ARCHITECTURE.md`** — they carry the file lists and every
criterion below.

- **Built — group 1, A-72 (`SCHEMA_VERSION` → 3).**
  - `packages/core/src/model/types.ts`: `SCHEMA_VERSION = 3`; `Trip.schemaVersion`'s **literal type** `2` →
    `3`; the ledger docstring above the constant gains a v2 → v3 entry citing A-72.
  - `packages/core/src/serialize/migrate.ts`: `v2ToV3` in `v1ToV2`'s exact shape, including the *"a
    document that somehow already carries the field keeps it"* clause; **`migrateDoc` becomes a ladder**
    (a version-indexed table applied while `v < SCHEMA_VERSION`, then `withDefaults`) **and not a second
    `if`** — a v1 document must arrive at 3, and the next bump must not depend on anyone remembering;
    the docstring's rule is restated in A-72 Part 4's **three clauses**.
  - **All four existing refusal messages and their JSON paths are preserved byte-for-byte**, including
    `no migration path from schemaVersion 0` naming the **original** version. They are the only
    user-visible artifact of this increment and `qa/attack7.mjs` asserts them.
  - `packages/core/src/serialize/fromJSON.ts`: the comment beside `participants:` reasoning *"this earns no
    `SCHEMA_VERSION` bump"* is now false and is replaced by a pointer to A-72. The
    `o.participants === undefined ? []` default **stays**, exactly as `photos`' does.
  - Pins: `packages/core/test/photos.test.ts`'s *"SCHEMA_VERSION is 2 — A-57 Part 5"* (retitled to cite
    A-72 for why the number moved) and `packages/core/test/datePrecision.test.ts`'s
    `assert.equal(SCHEMA_VERSION, 2)`. **Neither may be relaxed to compare the constant against itself.**
  - `npm run sample` regenerates `apps/web/src/sample/europe2026.json` at `"schemaVersion": 3`, **committed
    in the same commit** — `pretypecheck` regenerates it, so otherwise the tree is dirty on the next
    typecheck. `fixtures/legacy/trip-598cd7f.v1.json` **does not move**; it is the v1 fixture the ladder is
    tested with.
- **Built — group 2, A-73 (one home for the duplicate check).**
  - `packages/core/src/serialize/fromJSON.ts`: the seen-set comes out of `parseParticipants`, which becomes
    the `map` over `parseParticipant` and nothing else. **Every per-field refusal inside `parseParticipant`
    stays** — this moves an id-uniqueness check, not a type check.
  - `packages/core/src/validate/validateTrip.ts`: **unchanged.** It was already the ruling's home; its
    comment's sentence about `fromJSON` refusing at the parser is the one line that is corrected.
  - `packages/core/test/participants.test.ts`: *"fromJSON rejects a document with a duplicate participant
    id, naming the path"* is **inverted, not deleted** (A-73 T1). Deleting it trades a wrong assertion for
    no assertion.
- **User-visible outcome.** None on screen — I-9 shipped no surface and this ships none. The one
  user-facing change is that a build older than this one now refuses a document written by it, loudly and
  with the existing *"Update the app."* sentence, instead of opening it and deleting the participants.
- **Architecture / data model.** No field, no type, no port, no selector, no action, no export symbol.
  §2.10's count does not move and §8.9's re-count rule does not fire. `DB_VERSION` and `SUMMARY_VERSION` do
  not move. `build/participants.ts` is not touched.
- **Verification.** A-72 Part 7's **S1–S5** and A-73 Part 7's **T1–T4**, each already written as a fault
  and its required output. The two that carry the most weight and must not be softened: **S1** (the real
  v1 fixture arrives at `schemaVersion === 3` with `photos: []` **and** `participants: []` — this is the
  only thing that catches the ladder built as a second `if`) and **T2** (a document with a duplicated id
  survives `toJSON` → `fromJSON` → `toJSON` byte-identical, which is what makes the withdrawn
  *"the export would fail to re-import"* justification demonstrably false rather than merely dropped).
- **Dependencies / blockers.** I-9, which is built (`0e556a0`). **Does not block `I-11`, the phase gate**:
  no Phase 2 exit criterion names `SCHEMA_VERSION`, `migrateDoc` or the parser's duplicate refusal, and the
  four criteria that touch participants (the §6.2 access double-run, round-trip/undo parity, §4.2 rule 1's
  action↔build-function mapping, NO SILENT LOSS's 200-step dirty walk) are discharged by I-9 as shipped and
  are unaffected by either group. It should land **before** the gate rather than after, because a
  `SCHEMA_VERSION` bump taken after a gate is a bump taken against a larger corpus of documents.
- **Routed to the breaker, not to this builder.** **A-39 Part 11 item 2 fires a second time** — Axis D is
  no longer degenerate (domain 3) and needs assigning across the existing 15-row covering set in
  `qa/i7a-idb-rowkeys.mjs`. **Zero new rows** (15 ≥ 3×5 and 15 ≥ 3×3). That file is the breaker's, so it
  belongs to the adversarial pass over I-9a. In the same pass, four `qa/` probes assert `SCHEMA_VERSION`
  is 2 as tripwires for **their own** increments (`r45-i13.mjs`, `i13b-gate.mjs`, `r48-i13d.mjs`,
  `r50-i13h.mjs`); they are **expected to fire**, because the number moved by a ruling, and a probe that
  fires for the reason it was written for is working. They are not in `npm test` and do not redden the
  suite.
- **Ship gate.** `npm test` green; `npm run typecheck` green **with the regenerated sample committed**;
  S1–S5 and T1–T4 all present as tests with the fault they catch named in the test, per *How a criterion is
  written*; the four refusal messages unchanged, asserted rather than assumed.

#### I-9b — One test: the last unpinned rung of A-74's producer census (revision 57)

**The smallest increment in this document, and it is a test and nothing else.** It is the whole code
consequence of `ARCHITECTURE.md` revision 55's **A-74** (BUILD-NOTES **KD-99**), which ruled that a
participant `kind` outside `PARTICIPANT_KINDS` **cannot reach `validateTrip`** and therefore earns **no new
`Issue` code**. **Read A-74 Parts 5–6 and nothing else in `ARCHITECTURE.md`.**

- **Built.** **One test** in `packages/core/test/participants.test.ts`, asserting that
  **`importLegacyDays` emits `participants: []`**. It is the single row of A-74 Part 2's eight-row producer
  census that no existing test stands on — `createTrip`'s is pinned by *"a new trip carries an empty
  participants array"*, `fromJSON`'s by *"fromJSON rejects an unknown participant kind"*, the two build
  doors by R52-3's tests, `copyStopInto`'s by *"a participant crossed the copy boundary"*, and
  `mergeTrips`' needs none because it can only propagate a value that was already inside a `Trip`.
- **Not built, and named so nobody adds it.** **No new `IssueCode`** — §2.9's list does not move. **No
  change to any file under `packages/core/src`**, in particular not `validate/validateTrip.ts`,
  `serialize/fromJSON.ts`, `build/participants.ts` or `import/legacyDays.ts` itself. Zero `.tsx`, zero
  `qa/`, zero `docs/design/`, zero new dependency. `SCHEMA_VERSION`, `DB_VERSION`, `SUMMARY_VERSION` and
  §2.10's export surface do not move, so **§8.9's re-count rule does not fire**.
- **User-visible outcome.** None, and that is the point: A-74's finding is that the user-visible outcome the
  round-52 repro was reaching for **already exists**, in the parser, with its JSON path.
- **Architecture / data model.** Unchanged. This increment exists so that A-74's one load-bearing claim —
  *the producer census is closed* — has a mechanical check, per §0.5.
- **Verification.** A-74 Part 6's **K1**, and it is the only criterion: make `import/legacyDays.ts` emit a
  participant derived from any legacy field, and **the new test must redden while nothing else in the suite
  does**. A test that stays green under that injection is not the test A-74 asked for. Run red-before-green
  against the injected fault rather than asserting it.
- **Dependencies / blockers.** None. I-9 is built (`0e556a0`) and I-9a is queued independently; this
  increment touches neither's files and can land before or after either. **Does not block `I-11`.**
- **Routed to the breaker, not to this builder.** `qa/r52-participants.mjs`'s assertion *"R52:
  `validateTrip` reports the unrestorable kind (`place_hours_malformed`'s shape)"* is **withdrawn by
  A-74** — there is no such `Issue` and there will not be one — and it is **already dead code**, because
  the `core.updateParticipant(t1, id1, { kind: 'owner' })` two lines above it now throws under R52-3, so
  the chain beneath it does not execute what it claims. It comes out, or is re-pointed at the refusal that
  *is* real: `fromJSON` at `$.participants[n].kind`. **That file is the breaker's**, so it belongs to the
  next adversarial pass and **not** to this increment. A builder who edits `qa/` on this increment has gone
  outside it.
- **Ship gate.** `npm test` green with exactly one test added; the test names `importLegacyDays` and the
  census row it stands for, per *How a criterion is written* rule 3. **Zero files touched outside
  `packages/core/test/participants.test.ts`** — no `src`, no `qa/`, no `.tsx`, no `docs/design/`.

#### I-10 — The participants editor, the profile grouping, and the access double-run — **DEFERRED at revision 55; 2c ships without it**

> **Status: DEFERRED, by Jacob's decision of 2026-09-04.** Asked directly whether to **(a)** defer I-10 and
> build only I-9, **(b)** authorise a one-off `.tsx` exception for `Participants.tsx`, or **(c)** pause all
> Phase 2 gate work, Jacob chose **(a)**. **This entry is not withdrawn and not weakened** — it is real, it
> is fully specified below, and it is what completes 2c. It is **not built now**, and **it does not block
> `I-11`**. Its trigger is the last bullet of this entry.
>
> **Why it is deferred.** I-10 is the only increment left in Phase 2 that requires a UI screen: a new
> `Participants.tsx` **and** a new grouping on `Profile.tsx`. The project-wide fence — no `.tsx` is opened
> while the visual-direction track is unresolved — **predates this increment** (Jacob rejected I-8b's
> aesthetic on 2026-09-02 and is redoing the direction separately, with other tools), and it is why
> *Explicitly not in Phase 2* schedules **no surface of any kind** and why **I-13f**'s two `.tsx` lines have
> stayed queued through nine increments. Building I-10 now is building a screen against a direction that
> does not exist yet, and then rebuilding it. Nothing in the backend or data work may assume any outcome of
> that track, and this deferral assumes none.
>
> **What this is not.** It is **not a claim about I-9** — not about its soundness, its completeness or its
> scope. I-9 is core-and-store work with no screen, the fence does not touch it, and **every Phase 2 exit
> criterion that mentions participants is discharged by I-9 alone**; the enumeration and the reasoning are
> in I-11's *Dependencies / blockers*, which is the authoritative list. Deferring I-10 defers a **surface**,
> not a capability and not a guarantee. It is also **not** a deferral of `I-11`: the gate proceeds without
> this increment, and revision 55's ledger entry says why in full.

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
- **Dependencies / blockers.** I-9 — **and, since revision 55, a resolved visual direction**, which is the
  blocker that deferred this increment rather than one it waits on incidentally.
- **Ship gate.** ~~**2c is independently shippable here.**~~ *(Withdrawn at revision 55: 2c is
  independently shippable at **I-9**, narrowed — see the note above this entry. What ships **here**,
  whenever this lands, is 2c's **surface** half.)* The two conformance runs diff to nothing; the grouping
  surface states its own limitation in rendered text, not in a code comment. **The double-run half of this
  gate is not deferred with the rest** — it is a Phase 2 exit criterion, it runs in plain Node against
  `qa/access.mjs` and `packages/core/test/access.test.ts`, and **I-9 discharges it**; re-running it here is
  then a re-derivation, not a first run.
- **Trigger — and it is deliberately not `I-13f`'s shape.** I-13f is two lines inside a file that some
  later increment opens anyway, so a ride-along trigger works for it. **A screen rides along with nobody**,
  so I-10's trigger is stated as an event rather than as an inheritance. **Whichever of these comes first:**
  1. **The visual-direction track resuming** — Jacob selecting a direction — at which point I-10 is
     scheduled as an ordinary increment against that direction, in whatever phase is current then. This is
     the expected trigger.
  2. **The first increment that opens `Participants.tsx` or `Profile.tsx` for a reason of its own** and can
     carry this work in the same pass. Possible, not expected: no surface is scheduled while the direction
     is unselected, which is exactly why this deferral exists.
  3. **The first surface anywhere that groups participants across trips.** That fires `ARCHITECTURE.md`
     §8.3's *"cross-trip identity is derived, and the view says so"* clause — the rendered-limitation half
     of this entry — and **no such surface may ship without it**. Until then that obligation is **unfired,
     not violated**, because there is no view to mislead anyone.

  Until one of the three fires, `Trip.participants` is a capability with no surface, and **this entry is
  where it is tracked so that "deferred forever because nobody owns it" cannot happen to it** — the same
  reason I-13f is written down.

**I-12 and I-13 are revision 40, and are step 2d.** They sit here in the sequence — after I-10, before the
gate — and carry their numbers from above it, per sequencing rule 7. **Neither is gated on 2c**; both are
gated on 2b's data layer, which has a manager verdict of SHIP at `69e44d4`. **I-12 before I-13, and the
dependency is real rather than a preference** — see I-13's *Dependencies* bullet.

#### I-12 — a city keeps its place and its dates when the trip is over (§8.4 A-56)

- **Built.** `TripSummaryCity` gains `centre: LatLng` and `firstDay`/`lastDay: IsoDate | null`, populated in
  `tripSummary`'s existing `orderedCities` walk from a day index built **once per call**;
  `SUMMARY_VERSION = 5` with its own docstring line; `TravelStatsCity` gains `firstVisit`/`lastVisit`,
  clamped by A-31 Part 4 step 4's existing rule and falling back to the trip's own range when the city has
  no days; A-33 Part 2's `ROW_PATHS` widened by four leaves with `ROW_KEYS` unchanged; a **fourth** union
  fixture (a trip with one city and **no days**) so the null branch is exercised; `cli.ts stats` prints
  city dates; `travel-stats.json` regenerated.
- **User-visible outcome.** On the CLI today: *"Vienna, AT — Aug 8–10"* instead of *"Vienna, AT"*. On any
  future memory, route or stamp surface: the two facts such a surface is made of, available without loading
  forty documents. **No screen changes in this increment and none may.**
- **Architecture / data model.** §8.4 **A-56**, read with **A-31** Parts 2 and 4 and **A-33** Part 2. Three
  things a builder does not get to decide, because A-56 decided them: **stop-level geometry is refused**
  (Part 4); **countries get no date range** while cities do, because a country can be attributed through a
  `Place.at` that carries no day edge (Part 7 clause 3); and **`centre` may not reach a golden, a log line
  or the CLI** (Part 5). A-56 Part 3 is the answer to *"what triggers a rescan of already-summarised
  trips"*: **the bump is the trigger**, the mechanism is the one I-6 shipped, and **no client file changes**
   — a builder editing one has found a third reader of `SUMMARY_VERSION`, which is a finding.
- **Verification.**
  - `[stated]` `row.cities[i].centre` is **identical to** `orderedCities(trip)[i].centre` for every city of
    the reference trip — an equality against the source, which is why the golden does not carry the
    coordinate and does not need to.
  - `[stated]` For each of the reference trip's six cities, `firstDay`/`lastDay` reproduce the ends of the
    existing `cityRange(trip, key)` string, which is a **second program's** answer to the same question and
    is the closest thing to an external oracle available here — the same move A-31's `countries.json`
    cross-check makes.
  - `[stated]` **Injected fault, the null branch:** a trip with one city and zero days yields
    `firstDay === null && lastDay === null`, and `travelStats` over its row reports that city's
    `firstVisit`/`lastVisit` **equal to the trip's own clamped range** — not `null`, not a throw, not year
    zero.
  - `[stated]` **Injected fault, the clamp:** an `active` trip whose city days run past `today` reports
    `lastVisit === today`, not the future date, and `firstVisit <= lastVisit` holds for **every** row.
  - `[stated]` **Ceiling:** `ROW_PATHS` is exactly the 24 leaves A-56 Part 6 transcribes, and
    `ROW_PATHS.filter(countShaped)` is still exactly the **eight** entries `ROW_COUNT_FIELDS` names — a
    ninth means someone stored a count instead of deriving one.
  - `[stated]` **The rescan, end to end, in plain Node:** seed `memoryStorage` with a version-4 row, boot
    the store, and assert `summaryScan` goes `'stale'` → `'recomputing'` → `'complete'` with **every** row
    reading `summaryVersion === 5` — and that the recomputed row's `centre` came from the **document**, by
    seeding a version-4 row whose stale fields disagree with it.
  - `[stated]` **No coordinate escapes:** grep `fixtures/golden/*.json` and the output of `cli.ts stats`
    for a coordinate-shaped float pair; expect **zero**. §6.1 cross-cutting rule 1.
  - `[stated]` **The fence:** `git diff --stat` shows **zero** files under `apps/web/src/views/`.
- **Dependencies / blockers.** 2b's data layer (SHIP, `69e44d4`). Not I-8b, not I-8i/I-8j, not the visual
  direction. **`ARCHITECTURE.md` §8.4 A-39 Part 11 item 1 fires**: axis S gains a state, `SUMMARY_VERSION`'s
  ledger gains an entry, and the pairwise covering table goes **15 → 18**. Part 6's pin 1 fails the moment
  the constant moves, so this cannot be skipped by forgetting it.
- **Ship gate.** Every criterion above; the A-39 covering set re-derived at 18 rows with its faults still
  red; `qa/i7a-idb-rowkeys.mjs` re-run and its result **recorded** (A-36 Part 4 makes it a required,
  recorded condition for anything touching `ROW_KEYS`, and "no browser available" is a disclosed gap, not a
  pass); §2.10's export total **unmoved** — I-12 adds no runtime symbol, and a builder adding one has found
  a design question.

#### I-12a — a city date that cannot be read names its row, and a city range the clock erased says so (§8.4 A-59, A-60)

*Revision 41, from QA round 43's breaker pass over I-12 (**R43-2**, **R43-4**). I-12 shipped with a manager
verdict of SHIP and this does not reopen it: A-56's data model, its refusal of stop-level geometry and its
refusal to widen country date ranges are all unchanged. Two narrow gaps in what `travelStats` does with the
fields A-56 added, plus one docstring correction. **It opens no view and adds no screen.***

> **Status: SEND BACK at QA round 44** (0 blockers, 1 MAJOR, 3 MINOR — `QA-FINDINGS.md` round 44). A repair
> pass is owed, and **revision 42 adds one clause to it**: `ARCHITECTURE.md` §8.4 **A-60 Part 6** rules
> R44-2, the ambiguity round 44 found in A-60's own Part 2. The clause is item **5** below. It is folded
> into this increment rather than given its own, because I-12a is already going back to a builder for the
> MAJOR (R44-1) and this is one expression in the same function; splitting it would cost two passes over
> `travelStats.ts` to save nothing. **R44-3 — this increment's own Ship gate wording — is architect-routed
> and still open**; it is not ruled at revision 42 and the gate below is unchanged pending it.

- **Built.**
  1. **A-59 Part 2** — `travelStats` reads `cities[].firstDay`/`lastDay` through `core.isIsoDate` and treats
     a present-but-unreadable value as *"no usable day edge"*, taking A-56 Part 7 clause 2's existing
     fallback to the trip's range. One unreadable end makes the pair unusable. `inDomain` at sites 4 and 5
     **stays**.
  2. **A-59 Part 3** — `TravelStats` gains `unreadableCityDates: number`, counted per `cities[]` entry;
     `cli.ts stats` prints it on the conditional line beside `unnamedCities`. **No `SUMMARY_VERSION` bump.**
  3. **A-59 Part 4** — `packages/client`'s selectors gain `rowStatsReadable(row)` (`2 + 2N` date fields,
     `core.isIsoDate` and nothing else) beside `rowDatesReadable`, which is **unchanged**;
     `TravelHistoryResult`'s failure branch gains `unreadableRows: readonly string[]`, and `rowId` gains its
     second populated case — the single suspect. `travelHistory`'s docstring sentence claiming core exposes
     no way to re-validate a date is deleted; it has been false since `isIsoDate` joined §2.10 at revision 31.
  4. **A-60 Part 2** — a city range disjoint from its row's clamp interval `[a, b]` takes the same fallback
     instead of collapsing onto the interval's edge.
  5. **A-60 Part 6** *(revision 42, QA **R44-2** — owed by the repair pass, not yet built)*. Two halves,
     and the first one is a **no-op that must be pinned rather than assumed**:
     - **6.2 upholds what shipped.** A `null` or absent `firstDay`/`lastDay` keeps A-56 Part 7 clause 1's
       **per-field** `??`; the pair-wide fallback stays scoped to A-59's *unreadable*. **No code change**,
       and `unreadableCityDates` still counts a half-null pair as **0**. What is owed is a **test**: nothing
       in the suite currently distinguishes this from the literal pair-wide reading, which is why the fork
       was live at all.
     - **6.3 is the one behaviour change.** A-60's disjointness test is evaluated over the edges the entry
       **supplied**, not over the substitutes `??` manufactures for the missing ones. Build from **A-60
       Part 6.3's block, whole** — it computes `obsA`/`obsB` first and `rawA`/`rawB` last, and that ordering
       is the fix. Exactly one input shape moves: a `null`/absent `firstDay` beside a readable `lastDay`
       **strictly before `a`**, which prints `[a, a]` today — a single day neither end of which the row
       supplied — and must print `[a, b]`.
- **User-visible outcome.** On the CLI today, `stats --today 2026-08-12`: **Budapest, London and Prague stop
  claiming `2026-08-12 → 2026-08-12`** — a specific day the traveller is provably elsewhere — and print
  their trip's range, exactly as their country lines already do; **Split keeps `2026-08-12 → 2026-08-12`**,
  because that is its real arrival day. And a library with one hand-corrupted city date keeps working
  instead of refusing wholesale, with the affected entries counted.
- **Architecture / data model.** §8.4 **A-59** and **A-60**, read with **A-56** Part 7 and §2.9 **A-47**
  Part 3. Four things a builder does not get to decide, because the rulings decided them: **`rowStatsReadable`
  is not folded into `rowDatesReadable` or `rowUnopenable`** (A-59 Part 4 states both refusals, and the
  second would put a healthy document behind a `.cairn-unreadable.json` rescue export); **the fallback is
  clause 2's, not a new rule** — three triggers, one answer; **`cli.ts` does not re-derive the clamp** to
  decide what to print (A-34 Part 2); and **no *"not yet reached"* indicator** is invented (A-60 Part 3).
  The Trips-list treatment A-59 Part 5 specifies is **deliberately not in this increment** — it opens
  `Library.tsx` and needs a new store method, which is builder **and** breaker under `cairn/CLAUDE.md`'s
  delegation table.
- **Verification.**
  - `[stated]` **Injected fault, the gate, both directions (A-59 Part 6).** Gate always-true: a row with
    `cities[0].firstDay: 'not-a-date'` throws out of `travelStats` again and the fallback test goes red.
    Gate always-false: the reference trip's six cities all report the trip's range and
    `unreadableCityDates` reads **6**, so the *"a city's dates are ITS OWN days"* test goes red. Both
    directions asserted — a boolean tested on one side is a boolean that will be inverted (A-34 Part 4).
  - `[stated]` **Four corrupt shapes, one answer.** `'not-a-date'`, `'2026-3-1'`, a number and an object in
    `cities[0].firstDay` each yield: no throw; that city reporting its **trip's** range;
    `unreadableCityDates === 1`; and **every other row in the library unaffected**, which is the property
    R43-2 measured as absent.
  - `[stated]` `null`, an **absent key** (a gen-4 row) and a **valid** date each leave
    `unreadableCityDates` at **0**. An absent key is a value, not a defect.
  - `[stated]` **Attribution.** A two-row library, one row with a shape-invalid `startDate`:
    `travelHistory` returns `ok: false` with `unreadableRows` naming exactly that row and `rowId` equal to
    it. With **two** bad rows: `unreadableRows` names both, in library order, and `rowId` is `null`.
    Injected fault — return `[]` from `unreadableRows` unconditionally and the first assertion goes red.
  - `[stated]` **`rowStatsReadable` reads `2 + 2N` fields, and each one matters.** Over a row with three
    cities: corrupting `startDate`, `endDate`, `cities[1].firstDay` or `cities[2].lastDay` each makes it
    `false` independently, and a clean row is `true`. Four separate corruptions, not one.
  - `[stated]` **`rowDatesReadable` did not move.** A row with good trip dates and a corrupt
    `cities[1].firstDay` is still `rowDatesReadable === true` and still `rowUnopenable === false` — the
    A-47 Part 4 meta-line split and the rescue-export gate are both unchanged. This is the ceiling on the
    fix, and it is what fails if someone folds the new predicate into an old one.
  - `[stated]` **A-60's rendered output, all six cities, `--today 2026-08-12`:** Vienna `08-08 → 08-10`,
    Dubrovnik `08-10 → 08-12`, Split `08-12 → 08-12`, and Prague, Budapest and London all `08-07 → 08-12`.
    **Corrected at revision 42 (A-60 Part 6.4).** This bullet used to close *"a ceiling, not a floor: no
    city line may be narrower than its country's"*, which is **false and always was** — Split's genuine
    `08-12 → 08-12` is narrower than HR's `08-10 → 08-12`, and that narrowness is the precision A-56 was
    built to buy. The property is about **escaping**, not width: **no day a city line names may fall
    outside its row's `[a, b]`**, so no city line escapes the country line beside it at the same clock.
    Asserted as a property over the reference trip at six clocks, not as six literals.
  - `[stated]` **A-60 Part 6.2 — a supplied edge is kept, and this is the assertion that pins the fork.**
    `{firstDay: null, lastDay: '2026-03-14'}` in a trip `[2026-03-10, 2026-03-20]` reports
    `2026-03-10 → 2026-03-14`, and `{firstDay: '2026-03-14', lastDay: null}` reports
    `2026-03-14 → 2026-03-20`. Both keep the real edge. `unreadableCityDates` is **0** for each — a `null`
    is a value. **Injected fault:** take the literal pair-wide reading (fall back whenever *either* edge is
    `null`/absent) and both assertions go red. Round 44 measured that this fault is currently **invisible**
    to the whole 1235-test suite; a criterion that leaves it invisible has not been written.
  - `[stated]` **A-60 Part 6.3 — a substituted edge does not rescue a pair from the disjointness test.**
    `{firstDay: null, lastDay: '2020-01-01'}` in a trip `[2026-03-10, 2026-03-20]` reports
    `2026-03-10 → 2026-03-20`, not `2026-03-10 → 2026-03-10`. **Injected faults, three:** (a) revert to the
    post-substitution test (`rawB < a || rawA > b`) and this goes red — it is R44-2's repro, `qa/r44-a59.mjs`
    §F; (b) widen either ray arm to `<=`/`>=` and round 44 §G's touching-`a` and touching-`b` cases go red,
    because a range touching `[a, b]` on one day names a real arrival or departure day; (c) increment
    `unreadableCityDates` on a half-null pair and the counting tests go red.
  - `[stated]` **A-60 Part 6 breaks nothing fully-supplied, and it is asserted rather than hoped.** All nine
    of `qa/r44-a59.mjs` §G's boundary assertions and all three A-56 clamp tests pass **unmodified**, and
    `qa/r44-a59.mjs` §F's FAIL line goes green **without the probe being edited** — §F asserts the contract
    Part 6 establishes, not one it removes, which is the distinction R44-3 is about.
  - `[stated]` **A-60 breaks no shipped test, and that is asserted rather than hoped.** The three A-56
    clamp tests (`A-56 Part 7 clause 1: an ACTIVE trip's city visit is clamped at today`, `… dated OUTSIDE
    its own row's range`, `… lastDay precedes its firstDay`) all pass **unmodified**. A builder who edits
    one of them to go green has found a defect in the implementation, not in the ruling.
  - `[snapshot]` + `[stated]` **The golden moves exactly once, for exactly one reason.**
    `fixtures/golden/travel-stats.json` gains `unreadableCityDates: 0` in both clock blocks (A-59) and
    **nothing else changes in it** (A-60's two clocks are `planned` and `completed`, so nothing clamps).
    `npm run golden && npm run sample && git status --porcelain` is empty on the second run. **A-60 Part 6
    contributes zero to the golden as well, for a stronger reason** — `tripSummary` sets both city edges or
    neither, so no minted row can reach the shape 6.3 changes at all.
  - `[stated]` **The fences.** `git diff --stat` shows **zero** files under `apps/web/src/`;
    `SUMMARY_VERSION` still reads **5** and `ROW_PATHS` still has exactly **24** entries with
    `ROW_COUNT_FIELDS` at **eight**; §2.10's export total is **unmoved at 77** — `unreadableCityDates` is a
    type field and `rowStatsReadable` is a `packages/client` selector, so neither is a core symbol.
  - `[stated]` **`unreadableCityDates` is not count-shaped and `SOURCE_ALLOW` gains no entry** —
    `countShaped('unreadableCityDates')` is `false` under `test/stats-storage.test.ts`'s own classifier, and
    a test asserts that rather than leaving the absence to be read as an omission.
- **Dependencies / blockers.** I-12 (SHIP, `8b50889`). **Not** gated on I-13, 2c or any surface. **A-39 Part
  11 does not fire** — no `SUMMARY_VERSION`/`SCHEMA_VERSION` bump, no new store, no new port, no fourth
  write path — so the covering set stays at **18** and `qa/i7a-idb-rowkeys.mjs` needs no change. If a builder
  finds themselves editing it, that is a finding.
- **Ship gate.** Every criterion above; `npm test` and `npm run typecheck` clean; the golden regenerating
  idempotently with the single documented diff; and the **breaker's own `qa/r43-a56.mjs` §F, §H and §M
  re-run**, where the four finding lines it currently emits for R43-2 and R43-4 must go green **without the
  probe being edited** — it is the breaker's instrument, and a fix that needs it rewritten has not fixed
  what it measured.

#### I-13 — the photo foundation: a record class, bytes that are not in the document, and no new dependency (§10, A-57, A-58)

> **Status: SEND BACK at QA round 45** (`master` @ `497c116`; 2 BLOCKERS, 4 MAJOR, 12 MINOR —
> `QA-FINDINGS.md` round 45). **The repair pass is `I-13b`, below**, and this increment is not shippable
> until it lands. Three of the findings were design defects and are ruled at `ARCHITECTURE.md` revision 44
> as **A-62**, **A-63** and **A-64**; two clauses of this increment's *Built* line are superseded by them
> and are struck in place below. **What round 45 could NOT break is worth recording here rather than only
> in the findings**: `readExif` survived 200,000 hostile inputs with 0 throws, 0 out-of-range coordinates
> and a 0.68 ms worst call; §10.5's privacy mechanism holds (no metadata in a stored derivative, no photo
> in the sample build, no photo on the copy path); and A-61's arithmetic re-derived at 748.2 B/photo
> against a stated 768 and a ceiling of 1,024. **None of the findings is a photograph reaching somewhere it
> should not.**

> **Status (superseded): BUILT at `1820813`, not yet broken.** One criterion below was **replaced at revision 43** — the
> builder's **KD-81** measured I-13's original *"20 photos within 4 KB"* against `ARCHITECTURE.md` §10.1's
> own field list and found it short by 2–4×. Ruled as §10 **A-61**: the figure was mine and wrong, the
> record does not move by one field, and the two `[stated]` bullets in *Verification* are what replaced it.
> **I-13a** carries the small remainder.

- **Built.** `ARCHITECTURE.md` **§10** in full — A-57 Part 6 is the file-by-file list and it is the brief.
  In summary: `PhotoId`, `PhotoAsset`, `PhotoDerivative`, `Trip.photos` and `SCHEMA_VERSION = 2` with its
  `migrateDoc` case; `packages/core/src/photo/exif.ts` — a pure, total, bounded JPEG/TIFF-EXIF reader;
  `build/photos.ts` (`addPhoto`, `removePhoto`, `updatePhoto`); serializer and validator support;
  `PhotoPort` and `memoryPhotos()`; the import saga and its session state; `photoImport`, `photosFor` and
  `orphanPhotoBytes`; `apps/web/src/ports/photo.ts` (picker + canvas derive) and ~~`DB_VERSION` 3 → 4 with the
  `photos` and `photoThumbs` stores~~ *(revision 44: `DB_VERSION` 3 → 4 → **5**, and the two stores are
  keyed `[tripId, photoId]` — A-62; I-13b)* and the trip-delete cascade; `redactForSample` dropping
  `photos`; and a committed corpus of **JPEG headers, not photographs**, for the `readExif` golden.
- **User-visible outcome.** **None on screen** — the model and its guards land first, exactly as I-9's do,
  and no surface is scheduled while the visual direction is unselected. On the CLI: `cli.ts photos <file>`
  reports what a JPEG's metadata actually says, which is the fastest way to see A-58's central fact for
  yourself on your own photos.
- **Architecture / data model.** **§10** whole; it is self-contained and a builder needs nothing else from
  `ARCHITECTURE.md` except §2.8, §2.10's list, `serialize/migrate.ts`'s docstring, §8.6 and §8.4 A-39 Part
  11. Five things a builder does not get to decide: **bytes are never in `TripDoc`** (§10.1); there is **no
  `PhotoAsset.status` field** (§10.1 point 4 — liveness is A-47-shaped session or derived state);
  **`place` attachment is not built** and the increment that adds it does §2.13 A-6a's reference-counted
  delete first (A-57 Part 3); **`copyStopInto` carries no photo** and needs no change to do so (§10.5); and
  **no dependency is added to any package** (A-58).
- **Verification.** A-57 Part 7's fault matrix — **P1 through P13, each one red before the fix and green
  after, each recorded** — is the spine, and it is not optional: it is the price of A-58's refusal to take a
  parsing dependency. Plus:
  - `[stated]` **Round-trip:** a trip with three photos, two attachments and one `at` survives
    `toJSON`→`fromJSON` **byte-identical**; undo/redo restores photos exactly at depth 50.
  - `[stated]` **No byte payload in the document — the structural check, and it is the primary one**
    *(revision 43, replacing the 4 KB figure; `ARCHITECTURE.md` §10 **A-61**, BUILD-NOTES **KD-81**)*. Over a
    fixture whose every string is short **by construction** — captions under 32 characters, ids from
    `sequentialIds` — the longest string anywhere in `toJSON(trip)` is **under 128 characters**. Outcome
    clause: a derivative encoded into the document fails this by one to four orders of magnitude, where a
    byte total alone can be passed by a small payload on every record or a large one on a single record
    (A-61 Part 4's table). **The 128 is a property of the fixture, not an invariant on user documents** —
    `caption` is uncapped free text, like `Stop.note` — so a builder who lengthens a fixture caption
    re-derives the bound against the fixture rather than raising it to fit.
  - `[stated]` **Growth, measured and recorded, with the ceiling derived from §10.1's field list**
    *(revision 43; the same replacement)*. A trip with 20 fully-populated photos is within **20 KB
    (20,480 B)** of the same trip with none, and the run **records the measured delta and the per-photo
    figure** rather than only asserting the ceiling. The stated value is §10.1's **768 B per photo at
    `toJSON`'s default indent** — which is what `saveIfVersion` writes — so **15,354 B** is expected and the
    ceiling is **1,024 B per photo**: 33 % headroom, about one more `Provenance`-sized block. Outcome
    clause: a run over the ceiling is a record class that has grown, and widening it is an architect's
    ruling, not a test edit. A run that is megabytes has put bytes in the document, which is what the
    withdrawn 4 KB figure was reaching for and could not express.
  - `[stated]` **The port is exercisable with no browser:** the whole import → attach → read → detach →
    delete path runs against `memoryPhotos()` under `node --test`. `packages/client` must never hold a
    photo's bytes — assert it holds ids and metadata only.
  - `[stated]` **The cascade:** deleting a trip with 5 photos leaves **zero** records in `photos` and
    `photoThumbs`; deleting a **day** leaves its photos present with `attach.kind === 'trip'`.
    *(Revision 44, QA R45-3: this was met only for the trip that happened to be **open**, because the
    criterion did not say which trip. **I-13b restates it** — the deletion is asserted for a trip that is
    a library row and not the active document, which is the case a criterion has to name because it is the
    one a passing test can miss.)*
  - `[stated]` **Resolution, measured, not asserted:** import a 4000 × 3000 JPEG and assert the stored
    `thumb` is ≤ 320 px on its long edge and the stored `display` ≤ 1600 px, that both decode, and that
    `thumb.bytes` is **at least 20× smaller** than the source. §10.4 exists to be measured.
  - `[stated]` **The re-encode carries no metadata:** run `readExif` over the **stored derivative** of a
    photo that had GPS and a date, and assert `reason: 'no_exif'` with every field `null`. This is §10.5's
    whole mechanism and it is one assertion.
  - `[stated]` **Redaction:** P12 — `redactForSample` over a trip carrying a captioned, placed, dated photo
    emits `photos: []`; the §6.6 recursive string walk finds nothing; the `dist` grep finds no coordinate.
  - `[stated]` **The fence:** `git diff --stat` shows **zero** files under `apps/web/src/views/`.
- **Dependencies / blockers.** **I-12 first, and the reason is the storage gate rather than the code.** The
  two increments touch different files and neither imports the other; but I-13 fires **A-39 Part 11 items 2
  and 4** (a `SCHEMA_VERSION` bump, and *"a new object store … a genuinely new axis; Part 3's table is
  re-derived"*) while I-12 fires **item 1**. Landing them together means the covering set is re-derived once
  for three tangled causes and nobody can say which change a red arm is about. Sequenced, the gate reopens
  twice for two stated reasons, and I-12's `ROW_PATHS` widening is proven before a schema change lands on
  top of it. **Not gated on 2c, not on the visual direction, not on I-8i/I-8j.**
- **Ship gate.** P1–P13 recorded with their measured results; A-39 Part 3's table **re-derived** over the
  two new stores and the new schema version, with the arms' starting states restated; §2.10's export total
  **re-counted in this pass** and written into §2.10 and criterion E in the same commit (§8.9's rule — no
  number is quoted in advance, in this file or in `ARCHITECTURE.md`); `npm test`, `npm run typecheck` and
  the sample build all green with **no `package.json` diff and no lockfile movement**, which is A-58's
  verdict as a mechanical check.

*(**I-14 — the photo surface — is deliberately not written.** It is a screen, and no screen is scheduled
until Jacob has selected a visual direction. Writing its criteria now would bake in assumptions about a
direction he has rejected. §10.6 exists so that whoever writes it has honest signals to build honest states
from.)*

#### I-13a — the photo document-growth criterion says what it measured (§10 A-61, BUILD-NOTES KD-81)

> **The smallest increment in this document, and it exists because the defect was mine.** I-13's builder met
> both halves of A-61's replacement criterion **before it was written** — `packages/core/test/photos.test.ts`
> already asserts `delta < 20_480` and `longest < 128` — so **no assertion value changes and no source file
> is touched**. What is owed is the part that makes them criteria rather than assertions.

- **Built.** Two changes to `packages/core/test/photos.test.ts` and nothing else in the repository:
  1. The size case **reports** the measured delta and the per-photo figure on a **passing** run — into the
     test's own output and from there into `BUILD-NOTES.md` — not only in an assertion message that speaks
     when it fails. **How a criterion is written** rule 1: a ceiling that publishes nothing when it passes
     is a number nobody can check has drifted.
  2. The 128-character bound gains the comment saying it is **fixture-scoped** — `caption` is uncapped free
     text (A-61 Part 8 residue 1) — so the next builder who lengthens a fixture caption re-derives the bound
     against the fixture instead of raising it to fit.
- **User-visible outcome.** None, and it is not pretending otherwise. What it buys is that the next person
  to read a green run learns what the record actually costs, which is the fact the 4 KB figure got wrong for
  a whole revision because nobody had printed it.
- **Architecture / data model.** **Nothing moves.** `PhotoAsset` keeps every field A-57 ruled;
  `SCHEMA_VERSION` stays 2; no fixture, golden, port, selector or export symbol changes. A builder reads
  `ARCHITECTURE.md` §10 **A-61 Parts 5 and 7** and needs nothing else in that document.
- **Verification.** `npm test` green with the two criteria above stated in I-13's *Verification* list; the
  measured delta and per-photo figure recorded in `BUILD-NOTES.md` beside KD-81, which is thereby closed;
  `git diff --stat` shows **one file**, under `packages/core/test/`.
- **Dependencies / blockers.** I-13 (shipped, `1820813`). **Orderable anywhere after it**, including as a
  ride-along in any later pass that opens `photos.test.ts` for another reason — it is listed as its own
  increment so it cannot be silently dropped, not because it deserves a session of its own. **Route: builder
  only** (`cairn/CLAUDE.md`'s delegation table, row 1 — behaviour is unchanged).

#### I-13b — the photo repair pass: bytes get an owner, a failed read gets a name, and a false claim about provenance is withdrawn (§10 **A-62**, **A-63**, **A-64**; QA round 45)

*Revision 44, from QA round 45's breaker pass over I-13 (**SEND BACK** — 2 BLOCKERS, 4 MAJOR, 12 MINOR).
This does **not** reopen A-57's record class or A-58's dependency verdict: no `PhotoAsset` field moves,
`SCHEMA_VERSION` stays 2, A-61's two criteria and their measured numbers stand, and `package.json` and the
lockfile keep a zero-line diff. **It opens no view and adds no screen.** Three rulings plus the round's
builder-routed findings, worked as one pass because they are the same three files.*

> **Read order for the builder.** `ARCHITECTURE.md` §10.2, §10.3 and §10.6 (all three amended in place at
> revision 44) plus **A-62**, **A-63** and **A-64** whole; §8.4 **A-38** Part 5 and **A-39** Part 5 for the
> fixture re-cut; `QA-FINDINGS.md` round 45 for the findings not named in a ruling. `cairn/qa/r45-i13.mjs`
> is the breaker's own instrument and **the sections named below must go green without the probe being
> edited** — §C, §D, §E, §F and §G all assert the contract this pass delivers, not the one it replaces, so
> R44-3's failure mode does not apply to them.

- **Built.** Four groups. The first three are the rulings; the fourth is the round's remaining
  builder-routed work, listed here so nothing in round 45 is unowned.

  **1. A-62 — the byte key gains its tenancy (R45-2, BLOCKER).**
  1. `PhotoPort`'s `read`/`write`/`remove`/`present` take the owning `TripId` **first**, and the interface
     gains `removeTrip(tripId)`. `packages/client/src/ports/types.ts`, `memory.ts`, every call site in
     `store/store.ts`, and `apps/web/src/ports/storage.ts`.
  2. `photos` and `photoThumbs` are keyed **`[tripId, photoId]`**. `present` is still **one** call —
     `getAllKeys(IDBKeyRange.bound([tripId], [tripId, []]))`, intersected with the id list.
  3. `DB_VERSION` 4 → **5**, whose upgrade arm **deletes and recreates** both stores and writes no record.
     A-62 Part 6 is the argument, including why the document-walking re-key is refused (it is A-39 Part 11
     item 7, which is out of the double's reach by construction).
  4. The trip-delete cascade becomes `removeTrip` on both halves. **This supersedes the narrow R45-3 fix**
     (reading the doomed ids from `ports.storage.load(id)`): if that landed first it is **deleted here**,
     and `apps/web`'s `photoIdsOf` goes with it — a key-range delete needs no document parse. If it has not
     landed, it is not written.
  5. `reclaimPhotoBytes` passes the active trip's id; its `live` guard is unchanged and becomes sound.
  6. **`importDoc` is not touched.** A-62 Part 3 clause 3 — a restored copy keeps its photo ids on purpose,
     and a second mechanism in a caller is what the key shape now makes unnecessary.
  7. **R45-15's `validateTrip` arm** (`claim('photo', p.id, 'trip')`) — if it has not already landed with
     the round's other builder-routed fixes, it lands here, because **A-62 is what makes the per-document
     census the *complete* uniqueness check rather than half of one**, and that sentence belongs beside it.

  **2. A-63 — a failed availability read can be said out loud (R45-5, MAJOR).**
  1. `PhotoListing.phase` gains `'unreadable'`; `items[].availability` gains `'unknown'`; the listing gains
     `message: string | null`, non-null on that phase only.
  2. `PhotoSession` stops using `available: null` for two different facts. The shape is the builder's; the
     constraint is that *"not read yet"* and *"read, and it failed"* are distinguishable.
  3. `store.refreshPhotoAvailability()` — five lines over the existing `readPhotoAvailability`. **No
     automatic retry and no in-flight flag** (A-63 Part 3).

  **3. A-64 — the provenance claim is withdrawn, and three strings stop lying (R45-6, MAJOR).**
  1. **`RefKind` does not change.** `grep "'photo'"` against it must find nothing — S5.
  2. `mapRef`'s throw names the **calling** function instead of hard-coding `acceptCandidate:`.
  3. `mapRef`'s message for a `'photo'` ref, and `updatePhoto`'s `FORBIDDEN_PHOTO_PATCH_KEYS` message for
     `provenance`, both stop pointing at two functions that throw and say what A-64 Part 3 rules: no
     transition in this phase, the trigger, and where the reason lives. The refusal itself stays.

  **4. Round 45's remaining builder-routed findings**, worked in the same pass because they are the same
  files: **R45-1 (BLOCKER)** — `migrateDoc` has zero production callers, so every document and every backup
  written by the previous release is refused; the narrow fix is inside `fromJSON`, and **whatever lands
  needs a test that opens a document written by the previous release rather than one hand-built at the
  current version**. **R45-4** (the import saga's `?? []` collapsing *"not read"* into *"read, and empty"*)
  and **R45-3** (see group 1 item 4) if they have not already landed. **R45-8/R45-9/R45-10** (`exif.ts`:
  a bad sub-IFD pointer discarding a date that read; the scan running past EOI; `capturedAt.time` unranged
  — A-58 Part 6 clause 2's threshold is met and the breaker explicitly does **not** ask for the verdict to
  be reversed, so these are three one-line fixes and not a dependency question). **R45-11**, **R45-12**,
  **R45-13**, **R45-14**, **R45-16**, **R45-17** and **R45-7**'s BUILD-NOTES correction, per
  `QA-FINDINGS.md` round 45's routing column.
- **User-visible outcome.** **None on screen** — there is still no photo surface. What changes for Jacob is
  that restoring his own backup stops destroying the photographs in the trip he restored it beside, and
  that every trip he already has opens again.
- **Architecture / data model.** `ARCHITECTURE.md` §10.2, §10.3, §10.6 and A-62/A-63/A-64. **Five things a
  builder does not get to decide:** `SCHEMA_VERSION` stays **2** (this pass changes storage keys, not the
  document); no `PhotoAsset` field is added, dropped or renamed; **`RefKind` does not gain a `'photo'`
  arm** — widening core's export surface is an architect's ruling and A-64 states the trigger; **no
  document-walking migration in `onupgradeneeded`** (A-62 Part 6); and **no dependency is added to any
  package** (A-58, unchanged).
- **Verification.** A-62 Part 7's **Q1–Q8**, A-63 Part 4's **R1–R6** and A-64 Part 5's **S1–S5**, each red
  before the fix and green after, each recorded. Plus:
  - `[stated]` **The breaker's own probe, unedited.** `node --experimental-strip-types qa/r45-i13.mjs`
    §C (3 FAIL), §D (2), §E (1), §F (1) and §G (3) all go green **without the probe being edited**, because
    every one of those ten lines asserts the contract this pass delivers. Outcome clause: a line that
    cannot be made green without editing it is a ruling this pass has misread, and it routes back rather
    than being edited.
  - `[stated]` **The cascade, for the trip that is NOT open.** Create trip A with 5 photos, create trip B,
    then delete A while B is the active document: **zero** `[A, …]` records in either store, on the
    in-memory port and on the web port, and `orphanPhotoBytes` is `[]` rather than silently empty. This is
    I-13's own cascade criterion with the case it failed to name (R45-3) written into it.
  - `[stated]` **The upgrade, driven rather than reasoned about.** A seeded `DB_VERSION` **4** database
    holding bare-keyed byte records is opened by the port: both stores are empty afterwards and `docs`,
    `summaries` and `versions` are **byte-identical** to their seeded values — a new arm on A-38 Part 3's
    list, whose starting state is stated like every other arm's. Outcome clause: a migration that touches a
    document is A-39 Part 11 item 7 and is not what was ruled.
  - `[stated]` **The compound key in a real browser, both engines.** `qa/i7a-idb-rowkeys.mjs` gains a phase
    that writes two trips' byte records and range-reads each, asserting it gets exactly its own — run on
    **Chromium and WebKit** (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, which R45-7 established is
    installed). Outcome clause: A-62 Part 5's key-ordering facts are search-result verifications until this
    runs, and this is what makes them measurements.
  - `[stated]` **The previous release's document opens.** A document written by a build at `598cd7f` —
    minted from that revision, not hand-built at the current one — opens, restores through `importDoc`, and
    does not appear in `rescan.unreadable`. `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-upcast.mjs`
    reaches *"Add a stop"*. Outcome clause: a test that hand-builds a v1 document at the current version is
    the test that was already green while nobody's data could be opened.
  - `[stated]` **The fence:** `git diff --name-only` shows **zero** files under `apps/web/src/views/`, zero
    under `cairn/docs/design/`, and no `package.json`/lockfile movement.
  - §2.10's export total **re-counted in this pass** and written into §2.10 and criterion E in the same
    commit if it moves (§8.9's rule). It should not move: A-62 changes port signatures, not core's surface.
- **Dependencies / blockers.** I-13 (built, `1820813`). **Nothing else** — it is orderable immediately and
  it blocks I-11. **It does not fire A-39 Part 11.** Item 4 does not fire (no object store is added — two
  existing stores change key shape); item 7 does not fire (the upgrade writes no record); item 2 does not
  fire (`SCHEMA_VERSION` does not move). What is owed is a **fixture re-cut**: the Axis B and Axis O seed
  records added at `497c116` are keyed by bare `PhotoId` and must be re-keyed, which is builder work
  against A-39 Part 5's table with the table as its own oracle — A-39 Part 11's *"not a legitimate reason"*
  clause, read forwards. **Route: builder + breaker, mandatory** — `cairn/CLAUDE.md`'s delegation table row
  3 (`mapRef`/`updatePhoto` are provenance-transition files) and row 4 (a port surface and the reducer).
- **Ship gate.** Q1–Q8, R1–R6 and S1–S5 recorded with their measured results; `qa/r45-i13.mjs` §C–§G green
  unedited; `qa/i7a-idb-rowkeys.mjs` green on **both** engines with its new phase and its faults recorded
  per phase (A-36 Part 4's standing condition, unchanged); `qa/r3-upcast.mjs` green; `npm test`,
  `npm run typecheck` and the sample build green with **no `package.json` diff and no lockfile movement**.
  Then a **breaker round over I-13 and I-13b together** — round 45 returned SEND BACK on I-13 and it is
  I-13b that has to earn the reversal, not this file.

#### I-13c — the round-46 repair pass: an import stops crossing a trip boundary, `'loading'` becomes transient again, and three comments stop promising things the design refuses (QA round 46; §10 **A-62 Part 8 residue 4**, **A-65**, **A-66**)

*Revision 46 status: **group 2 built at `a6c5d04`**; group 1 item 1 and group 3's two items are still
owed, and all three are non-blocking documentation corrections. Group 3 was added at revision 46, when
`ARCHITECTURE.md` **A-65** and **A-66** closed the arc's last two unruled questions.*

*Revision 45, from QA round 46's confirmation pass over I-13 + I-13b (**SEND BACK** — 0 BLOCKERS, 3 MAJOR,
4 MINOR). The key A-62 ruled survived every attack the round could construct, on Chromium and WebKit; what
did not survive is the three places a photo write crosses a trip boundary that a key cannot police. **One
finding was the architect's and it is ruled without new machinery** — everything else here is builder
repair against `QA-FINDINGS.md` round 46's routing column. No `PhotoAsset` field moves, `SCHEMA_VERSION`
stays 2, `DB_VERSION` stays 5, `RefKind` does not move, and `package.json` and the lockfile keep a
zero-line diff. **It opens no view and adds no screen.***

> **Read order for the builder.** `QA-FINDINGS.md` round 46 (the table, plus the R46-1 prose below it —
> the reasoning there *is* the evidence). Then `ARCHITECTURE.md` §10 **A-62 Part 8 residue 4** — and
> **residue 4 alone**, not A-62 whole, because it changes no mechanism. §10.6 properties 3, 5 and 6 for
> R46-2 and R46-3. `cairn/qa/r46-i13b.mjs` and `qa/r46-idb-keys.mjs` are the breaker's own instruments and
> the sections named below go green **without the probes being edited**. **For group 3 (revision 46):
> §10 A-65 Part 5 and A-66 Part 6, those two Parts alone** — each entry's other Parts are the argument
> for a refusal, and a builder making a comment edit does not need them.

- **Built.** Three groups: the architect's one item, round 46's builder-routed findings, then the two
  rulings that had been owed since rounds 45 and 46 *(group 3, added at revision 46)*.

  **1. A-62 Part 8 residue 4 — the comment in `deleteTrip` stops claiming a reclaim it cannot deliver
  (R46-4, MINOR). NON-BLOCKING.**
  1. `packages/client/src/store/store.ts`, `deleteTrip`: the `catch`'s
     `/* orphaned bytes are reclaimable; a failed byte delete may not block one */` is replaced by the two
     facts residue 4 rules. **The trip goes either way** — that half was already right and is now ruled,
     with §4.2 rule 6c's reason (an ancillary storage failure may not make a trip undeletable) and the
     fact that the port's `removeTrip` is one transaction, so a rejection means it aborted whole and there
     is nothing to roll back. **The bytes are NOT reclaimable on this path** — `reclaimPhotoBytes` needs
     an active document and an observed id and a deleted trip has neither, so residue 2's unbuilt sweep is
     the only recovery; on `apps/web` the `ports.storage.delete` below repeats the same range delete in
     the transaction that drops the document, so the bytes usually go anyway and the belt-only hosts are
     `memoryStorage` and a future native port. The paragraph above the `chainOntoSaving` call that says
     *"A failure here leaves reclaimable orphans"* is corrected in the same edit and for the same reason.
  2. **Five things this item does not get to do**, and they are the ruling rather than a preference: **no
     rollback or abort of the trip delete**; **no entry in `state.photos.orphans` and no change to
     `orphanPhotoBytes`** (the list is `PhotoId`-scoped to the active trip and `reclaimPhotoBytes`'
     `live` guard would be asked to read a document that does not exist); **no re-introduction of the
     doomed-id list** (that is the superseded R45-3 fix A-62 Part 4 deleted); **no new `AppState` field
     and no new selector**; and **no cascade added to `memoryStorage`** — the belt's only test coverage is
     that the double does not have one, which is what round 46's M4 mutant measures.
  3. **Scheduling: this item blocks nothing.** A false comment is a MINOR documentation defect. It is
     listed first because it is one edit in a function group 2 is already opening, not because it gates
     the increment; if it slipped a pass it would be a tracked residue and not a ship condition.

  **2. Round 46's builder-routed findings**, per `QA-FINDINGS.md` round 46's routing column, worked in the
  same pass because they are the same two files: **R46-1 (MAJOR, a regression this arc introduced)** —
  `importPhotos` pins the byte side to the trip captured before its first `await` and lets the record side
  land in whatever trip is open when the decode finishes; three faces, including one that writes a
  document `validateTrip` calls invalid. **R46-2 (MAJOR)** — `doMerge` takes in the other tab's photo
  records against a stale availability set, which is R45-4's defect on the one path the fix pass missed;
  the fix is the line `importDoc` already got. **R46-3 (MAJOR)** — two overlapping `openTrip` calls let
  the earlier trip's availability answer land last, so `'loading'` becomes terminal and §10.6 property 5's
  *"true by construction"* is false. **R46-5**, **R46-6** and **R46-7** (MINOR) — a dangling probe-phase
  citation in the shipped port, the in-memory double's flattened byte key disagreeing with the array key
  for an id `fromJSON` will accept, and a literal NUL byte making the increment's own ship-gate probe a
  binary file to git.

  **3. A-65 and A-66 — the two rulings that had been owed, and both land as English (revision 46).
  NON-BLOCKING, and neither opens a `.tsx` file, a type, a selector or a port.**

  *This group was added at revision 46, after group 2 shipped at `a6c5d04`. Read
  `ARCHITECTURE.md` §10 **A-65 Part 5** and **A-66 Part 6** — those two Parts alone are the brief; the
  rest of each entry is the argument, and a builder does not need it to make the edit.*

  1. **A-65 (QA R45-14, MINOR) — `removePhoto`'s docstring stops naming a future ruling that went the
     other way.** `packages/client/src/store/store.ts`, `removePhoto`. The shipped disclosure is correct
     about the **behaviour** and wrong about the **future**: it says *"The fix is a **deferred** byte
     delete (hold the derivatives until the removal leaves the undo window), and that is not written here
     because §10.3's cascade table rules the opposite … **Trigger:** that ruling."* The ruling exists and
     it **refuses the deferred delete**. That clause comes out and is replaced by the four facts A-65
     Part 3 rules: undo restores the record and not the photograph; the byte delete is synchronous **by
     design**; the resulting `availability: 'missing'` with §10.6 property 3's offer to re-import is the
     honest state, not a degraded one; and the deferral is refused, with a pointer to **A-65 Part 4**
     rather than a re-argument in the docstring. **No sentence in that docstring may name a future ruling
     that will change when the bytes go.**
  2. **Five things A-65 does not get to do**, and they are the ruling rather than a preference: **no
     change to `removePhoto`'s code**; **no deferral, queue, tombstone, trash can or timer anywhere in
     the photo path**; **no `PhotoAsset` liveness field** (§10.1 point 4, refused a second time); **no
     change to `orphanPhotoBytes`, `reclaimPhotoBytes`, `photosFor`, `PhotoSession` or `PhotoPort`**; and
     **no edit to `qa/r46-i13b.mjs` §K or `qa/r45-i13.mjs` §K** — those two lines assert the refused
     proposal and are re-cut **by the breaker** to assert A-65 Part 6's **T1**, which is round 46's own
     stated precedent for a prior round's probe.
  3. **A-66 (BUILD-NOTES KD-82, QA R46-1) — the abandoned-import comment points at a ruling instead of an
     open question.** Same file, `importPhotos`: the two `break` comments say *"see KD-82 for what the
     abandoned files do and do not report"* and *"The bytes stay under their own trip's key, where they
     are that trip's to reclaim (KD-82)"*. KD-82 is a build note recording an **unruled** judgement; it is
     now ruled, so both citations name **§10.6 A-66** as well, so that a reader lands on the decision
     rather than on the question. **That is the entire code change for A-66 — a citation.**
  4. **Four things A-66 does not get to do**: **no sixth arm on `PhotoImportFailure`** (it is closed at
     five, and A-66 Part 8's **U5** is the checkable form of that); **no failure entry, of any reason, for
     an abandoned file** — the report would land in the session state of the trip the user moved to, which
     is R45-4's and R46-1's defect in the reporting layer; **no tenancy on `PhotoSession.failures` and no
     new library-scoped `AppState` field** to give it somewhere honest to live; and **no `remove()` call
     for the mid-flight file's bytes** — they stay under their own trip's key, bounded at one derivative
     pair and swept by `removeTrip`, which A-66 Part 7 rules and discloses.
  5. **Scheduling: this group blocks nothing.** Both items are documentation defects of the same class as
     group 1 item 1 — a comment that says something untrue about the design. They are listed so the ship
     gate has a line for them, and their absence is a tracked residue rather than a hold. **What is *not*
     optional at the confirming round is the probe re-cut in item 2**, because a `FAIL` line asserting a
     refused proposal measures nothing.

- **User-visible outcome.** **None on screen** — there is still no photo surface. What changes is that a
  photograph imported while the user navigates away is no longer lost, and a trip opened twice in quick
  succession no longer shows a spinner that never resolves.
- **Architecture / data model.** `ARCHITECTURE.md` §10 **A-62 Part 8 residue 4** and nothing else moved at
  revision 45; **A-65 and A-66** at revision 46, and they amend §10.1 point 1, §10.3's cascade row and
  §10.6's `PhotoImportFailure` block **in place** and move nothing else. **Six things a builder does not
  get to decide:** the five refusals in group 1 item 2; the five in group 3 item 2 and the four in group 3
  item 4; that R46-1's fix narrows a window rather than closing the orphan class residue 4 names (so a
  builder does not also owe a sweeper); that the byte delete in `removePhoto` is **synchronous and stays
  synchronous** (A-65) and that `PhotoImportFailure` has **five arms and stays at five** (A-66);
  `SCHEMA_VERSION`, `DB_VERSION`, `SUMMARY_VERSION` and core's export surface all stay where they are; and
  **no dependency is added to any package** (A-58, unchanged).
- **Verification.**
  - `[stated]` **The breaker's own probes, unedited.** `node --experimental-strip-types qa/r46-i13b.mjs`
    §D, §E, §F, §H, §I and §J go green **without the probe being edited**. **§G is the exception and it is
    the point**: residue 4 rules that the measured state is *documented*, not fixed, so §G asserting a
    reclaim that does not exist is a line the **breaker** re-cuts to assert the residue — it is not a
    builder edit and it is not a defect in this pass. ~~§K (R45-14) stays red; that ruling is still
    owed.~~ **Superseded at revision 46:** A-65 rules R45-14 and refuses the deferred delete, so **§K is
    the second exception and it has the same shape as §G** — the line asserts `bytesBack === true`, which
    is the proposal the ruling refuses, and the **breaker** inverts it to assert A-65 Part 6's **T1**
    (record back, `read()` `null`, `{phase:'ready', missing:1}` after a fresh `refreshPhotoAvailability()`,
    never `'empty'`, never a throw). Same for `qa/r45-i13.mjs` §K, which is that probe's one remaining
    `FAIL`. **A builder edits neither.**
  - `[stated]` **R46-1, driven rather than reasoned about.** All three faces of the round's §D, with a
    slow `derive` and nothing else injected: trip-switch mid-import, the `{kind:'day'}` variant that
    produces `photo_attach_dangling`, and a delete mid-decode. Outcome clause: a fix that pins the record
    side without pinning the attach ref leaves face 2 open.
  - `[stated]` **The comment says what residue 4 says.** A reviewer reading `deleteTrip`'s `catch` learns
    that the trip goes either way and that the bytes are not reclaimable by any shipped mechanism. This is
    checkable by reading and it is stated so the ship gate has a line for it, not because a test can
    assert English.
  - `[stated]` **The two docstrings say what A-65 and A-66 say** *(revision 46, group 3)*. A reviewer
    reading `removePhoto` learns that undo restores the record and not the photograph, that the byte
    delete is synchronous **by design**, and that the deferral is **refused** — and finds **no** sentence
    promising a future ruling that will change when the bytes go. A reviewer reading `importPhotos`' two
    `break` comments is pointed at **A-66** and not only at an open build note. Checkable by reading,
    stated so the gate has a line for it.
  - `[stated]` **The two refusals are checkable, not merely written.** `PhotoImportFailure`'s declaration
    has **exactly five** string-literal arms (A-66 **U5**), and the photo path contains **no** timer, no
    pending-delete queue and no tombstone field (A-65 **T5**). Outcome clause: a sixth arm or a deferral
    is an architect's decision taken by a builder, and both greps find it in one line.
  - `[stated]` **The fence:** `git diff --name-only` shows **zero** files under `cairn/docs/design/` and
    no `package.json`/lockfile movement.
- **Dependencies / blockers.** I-13b (built, `70b9ee6`); group 2 built at **`a6c5d04`**. **Nothing else** —
  orderable immediately, and it blocks I-11. **It does not fire A-39 Part 11**: no store is added, no version moves, and the upgrade
  writes no record.
- **Ship gate.** Round 46's six builder-routed findings each red before and green after, recorded;
  `qa/r46-i13b.mjs` green with **§G and §K re-cut by the breaker** (*revision 46 — §K is no longer an
  owed ruling; A-65 ruled it and the line asserted the refused proposal*), and `qa/r45-i13.mjs` green
  after the same re-cut to its §K; `qa/r46-idb-keys.mjs`,
  `qa/i13b-gate.mjs`, `qa/i7a-idb-rowkeys.mjs` and `qa/i13-photo-browser.mjs` green on **both** engines;
  `npm test`, `npm run typecheck` and the sample build green with **no `package.json` diff and no lockfile
  movement**. Then a **breaker round over I-13, I-13b and I-13c together** — rounds 45 and 46 both returned
  SEND BACK and it is I-13c that has to earn the reversal. **Group 1 item 1 and both of group 3's items
  are not gate conditions**; they are checked at the gate and reported, and their absence is a tracked
  residue rather than a hold. **The probe re-cut is not in that category** — a `FAIL` line asserting a
  proposal an architect has refused measures nothing, so the confirming round carries it.

#### I-13d — the store's generation guard: a flush stops returning a boolean and starts returning a ticket (QA round 47; §4.2 rule **6d** and **A-67**, §10 **A-66 Part 10**)

*Revision 47, from QA round 47's confirmation pass over I-13 + I-13b + I-13c (**SEND BACK** — 0 BLOCKERS,
2 MAJOR, 1 MINOR). Everything round 46 routed is genuinely fixed and round 47 could not break any of it on
the case it was written for; what it broke is the two neighbouring cases those fixes could not see.
**Both MAJORs are the same defect and this increment builds one mechanism for both** — a builder who
writes two narrow patches here has taken the decision A-67 Part 2 refuses. **This is not a photo
increment**: the window R47-1 opens predates the photo arc, `setTripMeta` and `browseTrip` have the
identical latent shape, and `importPhotos` is only the first thing in this app that dispatches from a
promise the user did not just create. It opens **no `.tsx`**, adds no dependency, and moves no
`SCHEMA_VERSION`, `DB_VERSION`, `SUMMARY_VERSION`, `RefKind` or core export.*

> **Read order for the builder.** `ARCHITECTURE.md` §4.2 **rule 6 whole** (6a through the new 6d — the
> mechanism is a generalisation of 6a″ and does not read without it), then **A-67 Parts 3, 4, 5, 6, 7 and
> 10** — Part 6's table is the contract and Part 7's table is what to delete. Then §10 **A-66 Part 10**
> alone, for what the fix changes about the abandoned-batch bound; **not A-66 whole**, and not §10 at all
> otherwise. Then `QA-FINDINGS.md` round 47's table plus the R47-1 prose below it — the reasoning there
> *is* the evidence, and it names the repro. **A-67 Parts 1, 2, 8, 9 and 11 are the argument and the
> disclosures**; read Part 2 if you are tempted by the fix the finding itself proposes, and Part 8 before
> you add a guard to anything not in Part 6's table.

- **Built.** Four groups. Group 1 is the mechanism, group 2 is its application, group 3 is the deletion of
  what it replaces, group 4 is one owed comment from I-13c.

  **1. The guard itself — `packages/client/src/store/generation.ts`, new file (A-67 Part 3).**
  1. `GuardedSlot` (`'doc' | 'browsing' | 'photoAvailability'`), `Ticket` (an opaque `number`),
     `GenerationGuard` and `createGenerationGuard()` — **exactly as A-67 Part 3 writes them**, five
     methods, two `Record`s of counters, no dependency, no DOM, no `Date`, no `Math.random`.
  2. **`current` is one comparison and does not consult `busy`** — A-67 Part 3 item 1 proves why, and
     adding the extra term breaks a claimer's own write. **`observe` returning `null` while a claim is
     open is load-bearing** — Part 3 item 2. Neither is a defensive flourish and neither may be
     "simplified".
  3. **Created inside `createStore`, per store instance**, held as closure state beside `merging`,
     `rescanning`, `saving` and `cancelPending`. Never module state: the two-store-over-one-`memoryStorage`
     fixture is this project's standard two-tab test and the two must not share a sequence.
  4. It is exported from `store/generation.ts` for its own unit test and **not** from
     `packages/client/src/index.ts`. Core's runtime export surface does not move.

  **2. The application — `packages/client/src/store/store.ts` (A-67 Parts 5 and 6).**
  1. **`flushForTransition` changes signature to `Promise<Ticket | null>`** and returns
     `claimTransition()` on **both** success exits (`!state.doc` and `skip`), `null` on all three
     refusals. **The claim is its last synchronous act, in the same block as the `dirty()` read it
     attests to** — A-67 Part 5 is the whole argument for that placement and rules out both the
     transition's first line and the line after the flush. Callers compare against `null`, never on
     truthiness.
  2. `claimTransition()` and `releaseTransition()` — the two helpers, claiming and releasing all three
     slots, because "the fields a reseed replaces" is a rule a builder can apply without judgement.
  3. **Every row of A-67 Part 6's table**, verbatim: `createTrip`, `adoptTrip`, `openTrip`, `closeTrip`,
     `importDoc`, `deleteTrip`, `browseTrip`, `closeBrowse`, `readPhotoAvailability`, `importPhotos`,
     `importPhotos`' optimistic `setPhotos({available})`, `removePhoto`'s `setPhotos({available})`, and
     `dispatch`/`undo`/`redo`. **Two invariants hold at every one of them**: the check is the last
     statement before its write with **no `await` between them**, and the release is in a `finally` that
     covers every exit including the throws and the rethrows.
  4. **A supersession throws for a creation and returns for a navigation**, per A-67 Part 6's split —
     `createTrip`/`adoptTrip`/`importDoc` throw `TRANSITION_SUPERSEDED_MESSAGE`,
     `openTrip`/`closeTrip`/`browseTrip` install nothing and return. **`deleteTrip` claims and never
     checks**, because its install is already computed from `state` at the instant of writing; its
     `ports.storage.delete` and library-row removal are **never** conditional on a ticket.
  5. Two exported message constants beside `CONFLICT_MESSAGE` and `FLUSH_EXHAUSTED_MESSAGE`, with the
     text A-67 Part 6 gives.
  6. **The docstrings say what the mechanism is for.** `flushForTransition`'s R5-1 paragraph gains the
     sentence that generalises it — the loop re-asserts `dirty()` after every write, and the ticket is
     what carries that assertion past the closing brace. `readPhotoAvailability`'s R46-3 paragraph is
     rewritten to say *by time, not by trip*. No docstring may leave a reader believing the trip-identity
     comparison is still the guard.

  **3. What comes out, and it is deletion rather than layering (A-67 Part 7).**
  1. **`isLiveTrip` is deleted** — function and its one call site. **`importPhotos`' two identity checks
     are deleted**, both replaced by `guard.current('doc', g)`. `tripId` itself **stays**: it is the byte
     key, it is captured in the same synchronous block as the ticket, and the two agree by construction.
  2. **`readPhotoAvailability`'s two `state.doc?.id !== doc.id` checks are deleted**, both replaced.
     Neither may be kept as belt-and-braces: A-67 Part 7 states why — it is not a weaker independent
     check, it is the same check with a coarser key, and it is false in exactly the direction that costs
     data.
  3. **Four guards stay untouched and a builder must not "unify" them**: R45-4's
     `available !== null && photos.tripId === state.doc.id` in `importPhotos` and its counterpart in
     `removePhoto` (they answer *"was availability ever read"*, which no ticket encodes),
     `attemptSave`'s `forTripId` drop (it guards a timer, which holds no ticket), and `doMerge`'s
     `state.doc !== doc` inside its `chainOntoSaving` link (**it is the precedent this ruling
     generalises**, which is why a merge is not a transition and claims nothing).
  4. **No existing test is deleted, and exactly one assertion is adjusted** *(narrowed at revision 48 —
     A-67 **Part 7a**; the original read "no existing test is deleted or adjusted" and was too strong)*.
     Every test written for R46-1 and R46-3 that asserts a **final state** — which trip a record lands in,
     a listing's phase, `pending`/`total`/`failures`, readability — stays exactly as it is and must be
     green with the point-fixes removed. **That is the proof of subsumption and it is a required, reported
     result.** The **one** assertion that pins the *old* guard's byte-write side effect moves, and group 5
     is it: a test that only passes because a guard was deleted was measuring the guard rather than the
     behaviour, and the builder reports that rather than editing it — **which is exactly what the I-13d
     builder did at `4316167`, and Part 7a is the answer.**

  **4. I-13c group 1 item 1, still owed (QA R47-3, MINOR). NON-BLOCKING.** `deleteTrip`'s two sentences
  that A-62 Part 8 residue 4a rules false and orders removed — the paragraph's *"A failure here leaves
  reclaimable orphans, not a broken delete"* and the `catch`'s
  `/* orphaned bytes are reclaimable; a failed byte delete may not block one */`. It is folded in here
  because this increment is already opening that function, exactly as I-13c listed it first for the same
  reason. **It gates nothing** and its five refusals are unchanged (I-13c group 1 item 2).

  **5. One assertion inverts, because the fix landed (revision 48; §4.2 A-67 **Part 7a**). TINY, and it
  blocks nothing.** Two lines in two files assert the *old* guard's byte-write side effect — that a trip
  transition landing during `derive` strands exactly **one** derivative pair. Under A-67 the step-4 guard
  fires **before** `ports.photo.write`, so **zero** bytes are written and both read empty. That is what
  **G3** requires and what §10 **A-66 Part 10** item 2 already states. **Fold this into the confirming
  round rather than giving it an increment** — it is one assertion each, and the two halves have different
  owners:
  1. **Builder** — `packages/client/test/photos.test.ts:864`, inside the test *"R46-1: a trip switch
     mid-decode does not file the record in the trip the user switched to"*.
     `deepEqual([...p.photo.thumbs.keys()], [photoByteKey(A, 'photo-1')])` becomes
     `deepEqual([...p.photo.thumbs.keys()], [])`, **and the same assertion is added over the `display`
     store** — one `write` call produces both, and asserting over one store only is how a half-write goes
     unseen. The message changes from *"the bytes belong to the trip the files were picked from, and stay
     there"* to **"no bytes are written at all for a file whose decode outlives the trip it was picked
     from — the guard precedes the `write`"**, citing A-67 Part 7a. **The test's other four assertions do
     not move** (record not in B, `doc.photos` empty, listing `'empty'`, `pending` 0) — they are the
     final-state assertions Part 7a keeps, and if any of them moves, that is a finding against A-67 and it
     routes to the architect.
  2. **Breaker, not a builder** — `qa/r46-i13b.mjs:259` (§D face 1), the same inversion:
     `keys(p).join() === \`${A}/photo-1\`` becomes an assertion that `keys(p)` is **empty**, with the
     `FINDING R46-1` string gaining the reason so a reader does not mistake an empty set for a probe that
     observed nothing. **A builder does not touch `qa/`** — round 44 (`qa/r43-a56.mjs`), round 46 (six
     lines of `qa/r45-i13.mjs`) and A-65 Part 8 (`qa/r46-i13b.mjs` §K) are three standing precedents that
     editing an adversarial probe so it reports your own fix as green is the breaker's call. **The re-cut
     carries a vacuity control**, as round 47's did: watched red against a build with
     `isLiveTrip(tripId)` restored at the step-4 guard, which is G3's own mutant. Until the breaker cuts
     it, that one `FAIL` is expected and disclosed — see the ship gate.

- **User-visible outcome.** **None on screen** — there is still no photo surface, and no view is opened.
  What changes is that **tapping your own trip again while its photographs are importing no longer loses
  them silently**: the import stops with everything it had already added kept and written, instead of
  swallowing one more photograph per tap while the indicator says "saved". And a trip whose photo
  availability is being re-checked twice at once stops being able to answer with the older check — so
  *"this photo's image is no longer stored on this device"* can no longer appear over bytes that are on
  disk, and a successful **Try again** can no longer be reverted by the failure that preceded it.
- **Architecture / data model.** `ARCHITECTURE.md` §4.2 gains rule **6d** and **A-67**; §10 **A-66** gains
  **Part 10**, which supersedes Part 7's first sentence, narrows Part 5 item 3 and widens Part 6 — and
  changes no type, no field and no selector. **Eight things a builder does not get to decide:** that the
  two fixes R47-1's own text proposes are **refused** (A-67 Part 2 — one of them manufactures §2.2b F2's
  unresolvable self-conflict and a builder who implements it has shipped a worse defect than the one they
  closed); that the claim lives inside `flushForTransition` and not at either obvious alternative (Part 5);
  that there are **three** slots and what the criterion for a fourth is (Part 4); that R46-1's and
  R46-3's guards come **out** (Part 7); that `deleteTrip` claims and never checks (Part 6); that the
  guard is **never** in `AppState`, `history`, `toJSON` or the export surface (Part 9); that
  `PhotoImportFailure` still has **five arms** and gains none from this (A-66 Part 10, `U5` unchanged);
  and that **no dependency is added to any package** (A-58, unchanged).
- **Verification.** **A-67 Part 10's G1…G9, each red before and green after, recorded.** G1–G7 are
  behavioural and belong in `packages/client/test/`; G8 and G9 are `S5`-shaped greps.
  - `[stated]` **G1 — the defect with no photographs in it.** Park `openTrip`'s `storage.load`;
    `dispatch({type:'setTripMeta', …})` inside the window. The dispatch **throws**
    `TRANSITION_IN_PROGRESS_MESSAGE`, `state.doc` is untouched, and after the transition settles memory
    and storage agree on the title with `persistence.status` honestly `'idle'`. **Injected fault: remove
    `dispatch`'s window guard** → the edit is accepted and then lost, and `qa/r4-switch.mjs` §9's standing
    assertion (*"no tab renders 'Saved' over a document storage does not hold"*) fails.
  - `[stated]` **G2 — round 47's own measurement, inverted.** Slow `derive`; import **4** files into trip
    A; `openTrip('A')` — the **same** trip — after file 1 has landed, driven with the store's own
    `defaultScheduler` and its real debounce. Every file that reached its dispatch is in the document
    **and in storage**; the batch stops at the first file whose decode completes on or after the re-open;
    **no file is decoded, written and then lost**; `failures` is `[]`; `pending`/`total` settle to `0/0`.
    **Injected fault: restore `state.doc?.id !== tripId` in place of the ticket check** → three of four
    lost, `failures: []`, `pending: 0`.
  - `[stated]` **G3 — the byte-write guard moved one step earlier.** The same, with the re-open landing
    during `derive` rather than during `write`: **zero** stranded derivative pairs. **Injected fault:
    restore `isLiveTrip(tripId)` at the step-4 guard** → one pair stranded. This is A-66 **Part 10** item
    2 made checkable.
  - `[stated]` **G4/G5/G6 — R47-2's three faces**, each with its two reads resolving out of order: two
    `openTrip('A')` calls; an older `refreshPhotoAvailability` against `doMerge`'s newer read; two *Try
    again* taps where the earlier fails and the later succeeds. In all three the **later** answer is the
    one that stands, a photograph whose bytes are on disk never reads `'missing'`, and an
    `'unreadable'` never returns after a successful retry. **Injected fault, all three: restore
    `state.doc?.id !== doc.id`.**
  - `[stated]` **G7 — the ordering R46-3 fixed the symptom of and never fixed.** `openTrip('A')` and
    `openTrip('B')` with A's `load` slower: `state.doc.id`, `activeTripId` and `photos.tripId` are all
    `'B'`, and A installs nothing and throws nothing. **Injected fault: drop the pre-install
    `current('doc', t)` check** → A installs over B.
  - `[stated]` **G8 — the closed list, checkable for the first time.** `grep` finds **exactly two**
    `claimTransition(` call sites (`flushForTransition`'s success exit and `deleteTrip`'s rule-6c
    branch), and **exactly seven** `set(…, { reseed: true })` sites in `store.ts` — the six transitions of
    §4.2 rule 6a plus `writeAndSettle`'s merge install. Outcome clause: an eighth is a seventh transition,
    which rule 6a calls a defect, and this is the first criterion that can see one.
  - `[stated]` **G9 — nothing leaked into the model.** `Ticket`, `claim(`, `observe(` and `supersede(`
    appear in no `AppState` field, no `initialState()`, no `toJSON`/`fromJSON`, no `history` snapshot, no
    `packages/core` file and not in `packages/client/src/index.ts`'s exports. Core's runtime export
    surface is unchanged at **83**.
  - `[stated]` **The subsumption is measured, not asserted** *(narrowed at revision 48 — A-67 **Part
    7a**)*. `qa/r46-i13b.mjs` and `qa/r45-i13.mjs` are green end to end **without being edited, with one
    named exception**: `qa/r46-i13b.mjs:259` §D face 1 asserts the *old* guard's stranded pair and reads
    empty under A-67, so it prints **one expected `FAIL`** until the confirming breaker re-cuts it (group
    5 item 2). Every **other** R46-1/R46-3 assertion in both probes and in
    `packages/client/test/photos.test.ts` is green with the point-fixes removed. Outcome clause,
    unchanged in force: a red line **anywhere else** means the general mechanism does **not** cover what
    the point-fix covered, and that is a finding against A-67 Part 7 routed to the architect — not
    something a builder patches by putting the old guard back. **The exception is exactly one line and it
    is named here; a builder may not widen it by one more.**
  - `[stated]` **R47-3's comment says what residue 4 says.** A reviewer reading `deleteTrip`'s `catch`
    learns that the trip goes either way and that the bytes are **not** reclaimable by any shipped
    mechanism.
  - `[stated]` **The fence:** `git diff --name-only` shows **zero** `.tsx` files, zero files under
    `cairn/docs/design/`, and no `package.json`/lockfile movement. `npm run test:tap`, `npm run
    typecheck` and the sample build green; `qa/r46-idb-keys.mjs`, `qa/i13b-gate.mjs`,
    `qa/i7a-idb-rowkeys.mjs` and `qa/i13-photo-browser.mjs` green on **both** engines — this increment
    touches no port and no key, so a change in any of them is a regression.
- **Dependencies / blockers.** I-13c group 2 (built, `a6c5d04`). **Nothing else** — orderable
  immediately, and it blocks I-11. **It does not fire A-39 Part 11**: no store is added, no version
  moves, and no upgrade writes a record.
- **Ship gate.** G1…G9 each red before and green after, recorded; the two probes green unedited **except
  `qa/r46-i13b.mjs:259`, which is the one disclosed `FAIL`** *(narrowed at revision 48 — A-67 Part 7a;
  it is a breaker re-cut, not a hold)*; `npm test`, `npm run typecheck` and the sample build green with no
  `package.json` diff and no lockfile movement. Then a **breaker round over I-13, I-13b, I-13c and I-13d
  together** — rounds 45, 46 and 47 all returned SEND BACK and it is I-13d that has to earn the reversal;
  **that round cuts group 5 item 2.** **Group 4 is not a gate condition, and neither is group 5**; both are
  checked at the gate and reported, and their absence is a tracked residue rather than a hold — group 5
  item 1 is one builder assertion that should simply be in the diff by then. **Everything else here is.** A-67 Part 11's four residues are read at the gate and none of them is a
  ship condition; residue 3 (`App.tsx` calling `openTrip` for the trip that is already open) is the one
  that hands work to a later increment and it must be recorded as such rather than absorbed quietly.

> **Outcome, added at revision 49: I-13d built at `4316167` (+ `ae62326`) and is SEND BACK at QA round 48
> — 0 BLOCKERS, 2 MAJOR, 3 MINOR.** The mechanism itself is **confirmed**: round 48's release battery,
> three-way races and out-of-order answers could not break `generation.ts` on any property A-67 Part 3
> claims. What failed is the **wiring** — the two MAJORs are at A-67's own call sites — and **I-13e**
> below is the repair pass, ruled as §4.2 **A-68**. G1…G9 stand and are re-run there as **G17**.

#### I-13e — a claim becomes a promise to answer: the generation guard's wiring, at four call sites (QA round 48; §4.2 **A-68**)

*Revision 49, from QA round 48's confirmation pass over I-13 + I-13b + I-13c + I-13d (**SEND BACK** — 0
BLOCKERS, 2 MAJOR, 3 MINOR). **The mechanism held.** The round threw a four-transition sequence, three
out-of-order answers, two writers on one slot and a nine-case release battery at `generation.ts` and could
not break any of it; `packages/client/src/store/generation.ts` **does not change by a character in this
increment**. Both MAJORs are in how A-67 was **wired up** at its own call sites, and they are two halves of
one question: what happens to the read you just invalidated. **This is a `packages/client/src/store/store.ts`
increment plus the tests that measure it.** It opens **no `.tsx`**, touches **no `qa/` file**, adds no
dependency, and moves no `SCHEMA_VERSION`, `DB_VERSION`, `SUMMARY_VERSION`, `RefKind`, selector, port method
or core export.*

> **Read order for the builder.** `ARCHITECTURE.md` §4.2 **A-68 whole** (~11k, and it is the contract:
> Part 3 is the rule, Parts 4–6 are the three code changes with the exact lines, Part 7 is the proof you
> are done, Part 10 is the criteria). Then **A-67 Parts 3, 4, 5, 6 and 7** for the mechanism A-68 wires —
> read them **with A-68's amendment markers**, which name every line of A-67 that no longer holds. Then
> `QA-FINDINGS.md` round 48's table and the R48-2 prose under it. **You do not need §10, §4.4, or any
> other part of §4.** A-68 Parts 8 and 9 are rulings about `App.tsx` and `qa/` and are **not yours to
> implement** — read them so you do not implement them by accident.

- **Built.** Three code groups, one comment group. Group 1 is R48-2, group 2 is R48-1, group 3 is the
  ninth exit neither finding named, group 4 is the docstrings the first three make wrong.

  **1. The transition claims one slot, and the reseed supersedes the other two (A-68 Part 4, QA R48-2).**
  1. `claimTransition()` becomes `return guard.claim('doc');` and `releaseTransition()` becomes
     `guard.release('doc');` — **one line each.** The `browsing` and `photoAvailability` claims and
     releases are **deleted**, not moved.
  2. **Each of the six `set(…, { reseed: true })` transitions** — `createTrip`, `adoptTrip`, `openTrip`,
     `closeTrip`, `deleteTrip`'s **active** branch, `importDoc` — gains `guard.supersede('photoAvailability')`
     and `guard.supersede('browsing')` immediately before its `set`, **after** the ticket check, with **no
     `await` between them and the `set`**. A-68 Part 4.2 gives the exact block.
  3. **Two sites deliberately get nothing, and a builder who "completes the set" has introduced R48-2 at a
     new site**: `deleteTrip`'s non-active `else set({ ...state, library, openFailures })`, which replaces
     neither slot (and whose `photo.removeTrip` is a key-range delete over *another* trip's keys — §10
     A-62), and `writeAndSettle`'s merge install, which spreads `...state` and is answered by `doMerge`'s
     own `readPhotoAvailability`. A-68 Part 4.2 items 1 and 2 say why, in writing.
  4. **`browsing` moves for the same reason and it is not collateral** — a browse in flight when a
     transition *fails* now completes and installs its pane, because nothing replaced it. `closeBrowse`
     has used `supersede` for this write since revision 47 and is the precedent, not the exception.

  **2. The two byte-write sites: the supersede comes out of the value guard and gains the read it owes
  (A-68 Part 5, QA R48-1). All three clauses, or none — landing 5a alone converts R48-1's wrong answer
  into R48-2's absent one, at a new site.**
  1. **`importPhotos`.** `guard.supersede('photoAvailability')` moves **out** of
     `if (state.photos.available !== null && state.photos.tripId === state.doc.id)`, which is **kept
     verbatim and nested inside it**. The `else` sets a new `let availabilityOwed = false;` (declared
     beside `let remaining = picked.length;`) to `true`; the `if` sets it to `false`. **After** the
     `remaining > 0` settle:
     `if (availabilityOwed && guard.current('doc', g)) await readPhotoAvailability(state.doc);` — **one**
     port read per batch, never one per file, and only when availability was unknown.
  2. **`removePhoto` gains a `const g = guard.observe('doc');`** immediately after its
     `this.dispatch({ type: 'removePhoto', … })`, and `guard.current('doc', g)` gates its **whole tail** —
     the supersede, the availability write, both orphan writes. It has never had a ticket of any kind, and
     the hoist is what makes that load-bearing: without it the supersede fires against the trip the user
     moved to. Same `availabilityOwed` discharge after the `try`/`catch`. A-68 Part 5c is the code.
  3. **`removePhoto`'s value guard stays `available !== null` with no `tripId` conjunct added** — A-68
     Part 5c says why a conjunct that cannot change an outcome is refused, and A-67 Part 7 row 6 keeps the
     guard itself.

  **3. The ninth exit (A-68 Part 6).** `deleteTrip` hoists `state.activeTripId === id` into
  `const wasActive` on its first line, and its `chainOntoSaving` call gains a `catch (err)` that runs
  `if (wasActive) await readPhotoAvailability(state.doc);` and **rethrows unchanged**, before the existing
  `finally { releaseTransition(); }`. This is the path where `ports.storage.delete` rejects after
  `photo.removeTrip` has already run: the trip stays open with its bytes gone, and without this line the
  listing reads `'ready'` over them — §10 **A-65 T1**'s exact prohibition, reached by a fault rather than a
  race. **The happy path is unchanged and costs nothing.**

  **4. The docstrings the first three groups make true or false. NON-BLOCKING, and in the same diff.**
  1. `readPhotoAvailability`'s *"Every branch writes an answer, which is what makes property 5's … true by
     construction rather than by inspection"* — the sentence A-67 falsified by putting a `return` in front
     of all four branches. It becomes true again for a **different** reason and must say so: every branch
     writes an answer **or** a newer bump of the slot has taken responsibility for one (A-68 Part 3 and
     Part 7's table).
  2. `removePhoto`'s `@throws` list gains `TRANSITION_IN_PROGRESS_MESSAGE`, which it throws through its own
     `this.dispatch` (QA R48-3's second note).
  3. `claimTransition`/`releaseTransition`'s doc comments say **why** they claim one slot and not three,
     citing A-68 Part 4 — a reader who finds a one-slot claim with no explanation will "restore" the other
     two.
  4. Nothing else in this file's comments moves. A-67's own paragraphs stay; A-68's amendment markers are
     in `ARCHITECTURE.md`, not duplicated here.
  5. **QA R48-4, one line, folded in because it is one line.** `docs/BUILD-NOTES.md` §2's code block still
     says `npm test  # 1359 tests as of the round-46 fix pass`; the suite is **1376**, which the newest
     addenda already say. This is **R45-17 re-opened** — the same line, closed by the round-46 fix pass and
     stale one increment later — and it is why two older probes report a `FAIL` against a figure they read
     rather than pin. **Re-measure it at the end of this increment rather than copying the number from
     here**, since this increment adds tests of its own.

- **What the builder does NOT do**, each with its reason:
  - **No `qa/` file is touched.** `qa/r47-i13c.mjs:210`, `:231` and `:263` are red and stay red — A-68
    Part 9 rules all three as inversions and hands the re-cut, with its vacuity controls, to the **round-49
    breaker**. Four standing precedents (round 44, round 46, A-65 Part 8, A-67 Part 7a) say a builder does
    not edit a probe so it reports their own fix as green.
  - **No `.tsx` file is opened.** A-68 Part 8's two-line `catch` in `App.tsx` is real work with a named
    home and it is **not this increment** — see the follow-up below.
  - **No fourth slot, no new method on `GenerationGuard`, no `busy` term in `current`, no ticket in
    `AppState`.** A-68 Part 11 items 1, 2 and 6, and A-67 Parts 3, 8 and 9, all still hold.
- **User-visible outcome.** **Still nothing on screen** — there is no photo surface yet, which is exactly
  why these are worth closing now: §10.6's properties are the contract that surface will be built against.
  What changes underneath: **a photo listing always stops loading.** Deleting a *different* trip, tapping a
  library row whose document is corrupt, or opening a trip id that is no longer there no longer leaves the
  trip you still have open with a spinner that never resolves. And **a photograph whose bytes are on disk
  never reads *"no longer stored on this device"***, even when availability had not been read yet — the
  case where an import raced a *Try again*, and the case where an undone deletion used to claim the bytes
  were back.
- **Architecture / data model.** `ARCHITECTURE.md` §4.2 gains **A-68** and §4.2 rule 6d gains its second
  half; A-67 is amended in place at Part 4, Part 5, Part 6, Part 7a item 4 and Part 11 residues 3 and 4.
  **No type, no field, no selector, no port method, no version.** **Six things a builder does not get to
  decide:** that the answer to R48-2 is **narrowing the claim** and not re-issuing dropped reads or writing
  `'unreadable'` (A-68 Part 4 refuses both, with reasons — the second one lies); that `deleteTrip`'s
  non-active install and the merge install take **no** supersede (Part 4.2); that R45-4's value guards are
  **kept**, nested inside the hoisted supersede rather than deleted (Part 5a); that the owed read is
  **once per batch** and is not a retry A-63 forbids (Part 5b, 5d); that `removePhoto` observes rather than
  claims (Part 5c); and that the `dispatch`/`undo`/`redo` refusal **stays a throw** (Part 8, which refuses
  both a silent no-op and a queued undo).
- **Verification.** **A-68 Part 10's G10…G17, each red before and green after, recorded.** G10–G15 are
  behavioural and belong in `packages/client/test/`; G16 and G17 are `S5`-shaped greps and re-runs.
  - `[stated]` **G10 — R48-2 face 1.** Trip A open with a slow `present()` in flight; `deleteTrip(B)`.
    A's listing reaches `{phase:'ready'}`, not `'loading'`. **Injected fault: restore
    `guard.claim('photoAvailability')` in `claimTransition`** → `'loading'` forever. A-67 Part 11 residue
    2's disclosed false positive (the delete stops an import running for the active trip) is **unchanged**
    and is asserted in the same test, so nobody reads this fix as having removed it.
  - `[stated]` **G11 — R48-2 faces 2 and 3, plus the five exits the finding did not name.** The same
    in-flight read against `openTrip('no-such-id')`, `openTrip(corrupt)`, `importDoc('{{{')`,
    `importDoc(foreignOwner)` and an `adoptTrip` whose `storage.load` rejects: all five fail exactly as
    they do today — §2.9 **A-47**'s chip and banner unchanged, `ForeignDocumentError` unchanged — **and
    A's listing reaches `'ready'` in every one.** **Same injected fault** → five reds.
  - `[stated]` **G12 — the ninth exit.** `deleteTrip` of the **active** trip with `ports.storage.delete`
    rejecting and photographs on disk: the delete still fails loudly, the trip is still open, and the
    listing does not report `'ready'` over removed bytes. **Injected fault: drop group 3's `catch` read.**
  - `[stated]` **G13 — R48-1 face 1.** Availability unknown (a failed `present()`, or a first read still
    in flight); import one file. The new photograph never reads `'missing'`, the listing reaches a
    terminal state, and **exactly one** extra `present()` is issued for the whole batch regardless of file
    count. **Two injected faults: put the `supersede` back inside R45-4's guard** → `'missing'` over bytes
    on disk, which is R45-4's own rendered defect; **and drop the owed read** → `'loading'` forever.
  - `[stated]` **G14 — R48-1 face 2, which is §10 A-65 T1.** The same unknown availability;
    `removePhoto` then `undo`: the restored record reads **`'missing'`** — *"never `'empty'`, never
    `'unreadable'`, never a throw"*. **Both faults above** → red.
  - `[stated]` **G15 — the site the hoist creates.** A trip transition landing inside `ports.photo.remove`:
    the trip the user moved to keeps its listing, no orphan is reported against it, and its availability
    set is not edited. **Injected fault: drop group 2's `current('doc', g)` in `removePhoto`.**
  - `[stated]` **G16 — the closed lists, checkable.** `claim('photoAvailability')` **exactly one** site
    (`readPhotoAvailability`); `claim('browsing')` **exactly one** (`browseTrip`);
    `supersede('photoAvailability')` **exactly eight** (six reseeds, `importPhotos`, `removePhoto`);
    `supersede('browsing')` **exactly seven** (six reseeds, `closeBrowse`); `claimTransition(` still
    **exactly two** call sites. Outcome clause: a ninth supersede that does not name the answer it owes is
    A-68 Part 3's defect, and this is the criterion that sees it.
  - `[stated]` **G17 — A-67's own nine, unmoved.** G1…G9 re-run, each still red-before/green-after.
    **G4, G5, G6 and G7 are the ones this increment could plausibly have broken** and must be green with
    the transition's `photoAvailability` claim gone; **the injected fault that proves the replacement
    carries them is deleting the `supersede` before a reseed install** → an older read lands over a newer
    trip's state.
  - `[stated]` **The suite and the probes.** `npm test`, `npm run typecheck` and the sample build green
    with no `package.json` diff and no lockfile movement. `qa/r46-i13b.mjs`, `qa/r45-i13.mjs` and
    `qa/r48-i13d.mjs` green **except** the lines already disclosed: `qa/r47-i13c.mjs`'s three R48-5 lines
    (breaker work, A-68 Part 9) and R48-4's `npm test` count until the BUILD-NOTES line is corrected.
    Outcome clause, unchanged in force: a red line **anywhere else** is a finding against A-68 routed to
    the architect, not a line to re-cut and not a guard to put back.
  - `[stated]` **The fence:** `git diff --name-only` shows **zero** `.tsx` files, **zero** `qa/` files,
    zero files under `cairn/docs/design/`, and `packages/client/src/store/generation.ts` **unchanged**.
- **Dependencies / blockers.** I-13d (built, `4316167`; group 5 item 1 at `ae62326`). **Nothing else** —
  orderable immediately, and it blocks I-11. **It does not fire A-39 Part 11**: no store is added, no
  version moves, no upgrade writes a record.
- **Ship gate.** G10…G17 each red before and green after, recorded; group 4 is checked and reported but is
  **not** a hold. Then a **breaker round over I-13, I-13b, I-13c, I-13d and I-13e together** — rounds 45,
  46, 47 and 48 all returned SEND BACK and it is I-13e that has to earn the reversal. **That round cuts
  the three `qa/r47-i13c.mjs` lines A-68 Part 9 names**, each watched red first against its own mutant.
  A-68 Part 11's residues and A-67 Part 11's four (as amended) are read at the gate; **none is a ship
  condition**, and residues 3 and 4 are the two that hand `.tsx` work to a later increment and must be
  recorded as such rather than absorbed quietly.

> **Outcome, added at revision 50: I-13e built at `106bbd3`/`4398de5` and is SEND BACK at QA round 49
> (`43d0d20`) — 0 BLOCKERS, 1 MAJOR, 4 MINOR.** All three of A-68's groups are built correctly and the
> round could not break any of them on the case each was written for; the two deliberate no-op sites and
> the tenth site's `catch` were attacked from both sides and held. What failed is **A-68's own discharge
> gate**: Part 5b's owed read is guarded on the `doc` slot, which every one of Part 4.1's nine stranding
> exits bumps, so seven of the nine were re-opened by the fix for the other half of the same finding
> (**R49-1**), and an eleventh exit exists that Part 4.1's axis could not contain (**R49-5**).
> `ARCHITECTURE.md` revision 50 rules the class as **A-69**, and **I-13g** builds it.

#### I-13g — the enumeration is the defect: a settling boundary replaces the table of exits (QA round 49; §4.2 **A-69**)

*Revision 50, from QA round 49's confirmation pass over I-13 + I-13b + I-13c + I-13d + I-13e (**SEND BACK**
— 0 BLOCKERS, 1 MAJOR, 4 MINOR). **The mechanism held for the second round running**, and so did every
group A-68 asked for. This increment does not fix an eleventh site. It changes what the correctness
argument is made of: A-68 Part 4.1's twelve-row table and Part 7's ten-row proof stop being load-bearing,
and an invariant repaired at a boundary takes their place. **This is a
`packages/client/src/store/store.ts` increment plus the tests that measure it.** It opens **no `.tsx`**,
touches **no `qa/` file**, adds no dependency, and moves no `SCHEMA_VERSION`, `DB_VERSION`,
`SUMMARY_VERSION`, `RefKind`, selector, port method or core export. `generation.ts` is a zero-line diff.*

> **BUILT at `ae075db`, and AMENDED at revision 51 in four places — read this before the entry below.** The
> builder implemented A-69 as ruled and disclosed four defects in the ruling's own text rather than
> resolving any of them silently (BUILD-NOTES **KD-83**…**KD-86**). Three are text corrections and are
> applied in place below and in `ARCHITECTURE.md`: **site S2's printed placement is unreachable** (group 1
> item 3), **G18's nine reds are eight** and **G23's stated fault is a no-op** (both replaced with the
> faults that reproduce), and **G21's "three" and G24's "two" are counts of functions and sites, not of
> grep tokens.** The fourth, **KD-84**, is a real contradiction between A-69 Part 4 and §10 **A-65 T1** and
> is ruled at revision 51 as §4.2 **A-70**; **I-13h** below is its one-disjunct follow-up. **The builder's
> two new tests `G13b` and `G14b` in `packages/client/test/liveness.test.ts` pin the defective path
> deliberately and are expected to go red on A-70** — I-13h re-cuts them as **G26** and **G27**, which is
> what they were written for. **Nothing in I-13g is withdrawn and no group is rebuilt.**

> **Read order for the builder.** `ARCHITECTURE.md` §4.2 **A-69 whole** (~12k — Part 2 is why this shape
> and not the two obvious alternatives, Parts 4–6 and 8 are the code, Part 11 is the proof you are done,
> Part 12 is the criteria). Then **A-68 Parts 4.2, 5a and 5c** and **A-67 Part 3**, for the machinery A-69
> keeps — and read A-67's and A-68's **amendment banners**, which name every line of theirs that no longer
> holds. **You do not need §10, §4.4, or any other part of §4.** A-69 Parts 9 and 10 are corrections to
> A-68's own text and to `qa/` criteria; they are **not yours to implement**.

- **Built.** Three code groups and one deletion group. Group 1 is the boundary, group 2 is the type fence,
  group 3 is the deletion A-69 pays for with them, group 4 is R49-4.

  **1. The settling boundary (A-69 Part 4, QA R49-1 and R49-5). Both sites, or neither.**
  1. `availabilityUnanswered()` and `settleAvailability()` — the predicate and the repair, as A-69 Part 4
     prints them. The predicate's two `guard.observe(...)` terms are load-bearing and are not "defensive
     checks" to be tidied: they are what stop the boundary issuing a read while somebody is already
     responsible for one.
  2. **Site S1** — `settling(...)` wrapped once around `createStore`'s returned object literal. **A wrapper
     and not a line in each method**, because a line in each method is the enumeration that produced this
     finding (A-69 Part 3). `fn.apply(out, …)` and not `api`, so `this.dispatch`/`this.openTrip` compose
     through the boundary. Synchronous methods pass through untouched.
  3. **Site S2** — ~~`await settleAvailability();` as the last statement of `readPhotoAvailability`,
     **after** its `try`/`finally`, unconditional.~~ *(**Corrected at revision 51 — §4.2 **A-70** Part 7
     item 1, BUILD-NOTES **KD-85**. The semantics are unchanged; the placement above is unreachable.** Every
     drop path in `readPhotoAvailability` is a `return` **inside** its `try`, and a `return` inside a `try`
     runs the `finally` and leaves the function — it never reaches a statement below the block. In that
     position the line is dead code on exactly the four paths it exists for. **The ruled shape**, which is
     what shipped: split the function in two and make S2 a `finally` — `readPhotoAvailability` is
     `try { await readAvailabilityOnce(doc); } finally { await settleAvailability(); }` and
     `readAvailabilityOnce` holds the claim, the four branches and the release. **A `finally` is the
     construct A-69 Part 2 option 3 chose the whole mechanism for**, and it gains coverage of a `throw` out
     of the read. **A builder may not collapse the split back**; A-70 **G30** is the control.)* This is the
     one hole S1 cannot see: a read dropped by a bump whose owner has already returned. **Landing S1 without
     S2 leaves R49-1's shape reachable.**

  **2. The type fence (A-69 Part 5).** `setPhotos`' parameter becomes
  `Partial<Omit<PhotoSession, 'tripId' | 'available' | 'availabilityError'>>`; the three-arm
  `AvailabilityAnswer` union and `setAvailability` are added; `readPhotoAvailability`'s four branches and
  both optimistic writes in `importPhotos`/`removePhoto` go through it. The `default:` arm's
  `const exhaustive: never = answer;` is the compile error a fourth answer produces and is not decoration.
  **Type aliases and unions only — nothing here is an enum, a namespace or a `declare` field**
  (`cairn-constraints` §3, `erasableSyntaxOnly`).

  **3. The deletions A-69 buys (A-69 Part 6). Delete, do not leave beside.** `availabilityOwed` in
  `importPhotos` and `removePhoto`, both `else { availabilityOwed = true; }` branches, and both
  `if (availabilityOwed && guard.current('doc', g)) await readPhotoAvailability(state.doc);` lines.
  **Four things that STAY and whose removal is the way to get this wrong:** the hoisted
  `guard.supersede('photoAvailability')` at both byte-write sites (A-68 Part 5a — *ordering*, a different
  obligation from liveness); R45-4's value guards nested inside them; `removePhoto`'s
  `guard.observe('doc')` and the gate over its whole tail (A-68 Part 5c); and `deleteTrip`'s
  `if (wasActive) await readPhotoAvailability(state.doc);` on its rejecting cascade (A-68 Part 6 — it
  repairs a **stale** answer, which the boundary deliberately never does).

  **4. R49-4 — the browse pane that outlives its trip (A-69 Part 8).** `deleteTrip`'s **non**-active
  install takes `guard.supersede('browsing')` **unconditionally** and clears the pane only when it is the
  deleted trip's: `browsing: state.browsing?.id === id ? null : state.browsing`. A-69 Part 8 has the block
  and the disclosed cost. **A `supersede('photoAvailability')` on that branch is still forbidden** — A-68
  Part 4.2 item 1 is narrowed, not withdrawn.

  **5. The comments the first four make true or false. NON-BLOCKING, in the same diff.**
  `readPhotoAvailability`'s docstring paragraph about A-68 Part 3's pairing rule now describes the
  boundary; `claimTransition`'s comment keeps its one-slot explanation; the long comment above the deleted
  discharge line goes with the line. **Nothing else in this file's prose moves**, and A-69's amendment
  markers live in `ARCHITECTURE.md`, not duplicated here.

- **What the builder does NOT do**, each with its reason:
  - **No `qa/` file is touched.** Round 49's breaker already re-cut all four `qa/r47-i13c.mjs` lines and
    repaired both probes; A-69 Parts 9 and 10 correct the *ruling's* text about them, which is architect
    work already done. Five standing precedents say a builder does not edit a probe.
  - **No `.tsx` file is opened.** **I-13f** still holds the two lines, still unscheduled alone.
  - **No change to `generation.ts`** — no fourth slot, no new method, no `busy` term in `current`, no ticket
    in `AppState`. A-67 Parts 3, 8 and 9 and A-68 Part 11 all still hold.
  - **No `emit()` hardening.** A throwing subscriber stays a broken application; A-69 Part 7 and residue 1
    say what is and is not fixed, and the rest belongs to whoever opens the subscriber wiring.
- **User-visible outcome.** **Still nothing on screen** — there is no photo surface yet, which is again why
  this is worth closing now. What changes underneath: **a photo listing stops loading no matter how the
  gesture that invalidated it ended** — including when the app's own subscriber threw. And **a trip you
  have deleted stops being readable**: the browse pane over it closes, so stops cannot be copied out of a
  trip with no row, no record and no bytes.
- **Architecture / data model.** `ARCHITECTURE.md` §4.2 gains **A-69** and rule 6d gains its third half;
  A-68 is amended in place at Parts 4.1, 4.2, 5b, 5c, 7, 9 and 10, and A-67 gains a third amendment banner.
  **No type in `packages/core`, no field, no selector, no port method, no version.** **Five things a builder
  does not get to decide:** that the answer is a **boundary** and not a twelfth site or a `TransitionOutcome`
  union (A-69 Part 2 refuses both, with reasons — the union cannot see an exception); that the supersedes,
  the value guards, `removePhoto`'s gate and `deleteTrip`'s catch read all **stay** (Part 6, and removing
  any of them re-opens R48-1 or A-65 T1); that the boundary repairs an **absent** answer and never a wrong
  one; that R49-4 is fixed **now** rather than tracked (Part 8); and that A-68's tables are demoted rather
  than widened (Part 3).
- **Verification.** **A-69 Part 12's G18…G25, each red before and green after, recorded.** G18–G20, G22 and
  G23 are behavioural and belong in `packages/client/test/`; G21 is a **typecheck** result; G24 and G25 are
  `S5`-shaped greps and re-runs.
  - `[stated]` **G18 — R49-1, all of it.** Availability unknown, a two-file import, and during file 2's
    `derive` each of A-68 Part 4.1's non-installing exits in turn (rows 3, 4, 5, 6, 7, 8, 11 and 12 on both
    branches). Every one: the trip that stayed open reaches a terminal state, and each exit still throws or
    returns exactly what it does today with A-47's chip and banner unchanged. **Injected fault: make
    `settleAvailability` a no-op → ~~nine~~ eight reds**, each `phase:'loading'` — round 49's own
    measurement. *(**Corrected at revision 51 — §4.2 **A-70** Part 7 item 2, BUILD-NOTES **KD-86**.** Nine
    cases run; **eight** redden. The ninth — row **12b**, `deleteTrip` of the **ACTIVE** trip whose cascade
    rejects — is green under this fault for a named reason: **A-68 Part 6's `catch` read answers it
    directly**, which is the mechanism A-69 Part 6 item 3 explicitly keeps. It was never a ninth
    independent case for this fault, and it is separately red under its own, which is **G12**'s.)*
  - `[stated]` **G19 — the second shape.** Two overlapping batches, both owing, ended by one gesture: both
    settle and **one** extra `present()` is issued in total.
  - `[stated]` **G20 — R49-5.** A subscriber that throws inside the reseeding `set` of `openTrip`,
    `createTrip`, `adoptTrip` and `importDoc`: the document is installed, the subscriber's error propagates
    **unchanged**, and the listing reaches a terminal state. **Injected fault: settle only on the wrapper's
    success arm → four reds.**
  - `[stated]` **G21 — the type fence, measured as a compile error.** `setPhotos({ available: new Set() })`
    anywhere fails `npm run typecheck`, naming `available`. `setAvailability(` is called from **exactly
    three functions** — `readAvailabilityOnce`, `importPhotos`, `removePhoto`. Recorded as a typecheck
    transcript, not a test. *(**Clarified at revision 51 — §4.2 **A-70** Part 7 item 3, BUILD-NOTES
    **KD-83**. The three is a count of writing FUNCTIONS, not of tokens**: a literal
    `grep -c 'setAvailability('` returns **six**, and six is correct, because the read alone calls it once
    per branch. **A check asserts three enclosing functions and three union arms by shape; a token count of
    six is the expected value and is not a finding.**)*
  - `[stated]` **G22 — R49-4.** `browseTrip(B)` then `deleteTrip(B)` (non-active) leaves `browsing` `null`;
    **and the control**, `browseTrip(B)` then `deleteTrip(C)`, leaves the pane intact. **Injected fault:
    restore `set({ ...state, library, openFailures })` → the pane survives → red.**
  - `[stated]` **G23 — the cost bound, which is what stops this becoming a port call per file.** After a
    successful `openTrip` of a trip with photographs, importing three files issues **zero** extra
    `present()` calls. ~~**Injected fault: move the settle inside the import loop → three extra reads →
    red.**~~ *(**Corrected at revision 51 — §4.2 **A-70** Part 7 item 2, BUILD-NOTES **KD-86**. That fault
    does not reproduce and could never have**: `settleAvailability` is predicate-guarded and this
    criterion's own path keeps the predicate false throughout, so calling it per file is a no-op. **The two
    that do reproduce, and both are run:** (i) an **unguarded** per-file `await
    readPhotoAvailability(state.doc)` in the loop → **exactly three** extra `present()` calls → red; and
    (ii) **delete `state.photos.available === null` from the predicate's first disjunct** → the boundary
    repairs a *present* answer, which A-69 Part 6 item 3 forbids, and it **does not terminate** — both
    suites hang, which is the termination argument being load-bearing.)*
  - `[stated]` **G24 — the closed lists, checkable.** `createStore` has exactly one `return` and it is
    `return settling(`; `settleAvailability(` is called from exactly two **logical sites**;
    `availabilityOwed` appears **nowhere**; `supersede('photoAvailability')` is still exactly eight and
    `claim('photoAvailability')` still exactly one. Outcome clause: these three greps are what A-69 Part
    11's proof depends on, so a changed count is a finding against A-69 routed to the architect.
    *(**Clarified at revision 51 — §4.2 **A-70** Part 7 item 3, BUILD-NOTES **KD-83**. The two is a count
    of SITES, not of tokens**: `grep -c 'settleAvailability('` returns **three**, and three is correct,
    because **S1 is one site with two arms** and both are load-bearing under G20. **A check pins the
    wrapper's two arms with one shape assertion and the `finally` with another; a token count of three is
    the expected value and is not a finding.** The eight and the one **are** token counts and were measured
    as such.)*
  - `[stated]` **G25 — A-67's nine and A-68's eight, unmoved.** G1…G17 re-run red-before/green-after,
    **with G14 and G17 as corrected by A-69 Part 10** — G14 has **one** mutation (the settle), not two, and
    G17's mutant is applied at a **document-less** reseed. **G12 and G13 are the ones this increment could
    plausibly have broken** and are called out for the builder to check first.
  - `[stated]` **The invariant, asserted structurally.** One helper asserting *"`doc === null` ∨
    `available !== null` ∨ `availabilityError !== null`"*, called at the end of **every** test in
    `packages/client/test/generation.test.ts` and `liveness.test.ts` — not one test per exit, which is
    A-69 Part 3's defect written into a test file.
  - `[stated]` **The suite and the probes.** `npm test`, `npm run typecheck` and the sample build green with
    no `package.json` diff and no lockfile movement. `qa/r45-i13.mjs`, `qa/r46-i13b.mjs`, `qa/r47-i13c.mjs`
    and `qa/r48-i13d.mjs` at the status round 49 left them — `qa/r47-i13c.mjs` **ALL CLEAR end to end**, and
    a regression there now blocks, since the disclosed exemption that covered its three lines is spent.
    `qa/r49-i13e.mjs`'s 16 `FAIL` lines are the target: **all sixteen green.** Outcome clause, unchanged in
    force: a red line anywhere else is a finding against A-69 routed to the architect, not a line to re-cut
    and not a guard to put back.
  - `[stated]` **The fence:** `git diff --name-only` shows **zero** `.tsx` files, **zero** `qa/` files, zero
    files under `cairn/docs/design/`, and `packages/client/src/store/generation.ts` **unchanged**.
- **Dependencies / blockers.** I-13e (built, `106bbd3`/`4398de5`). **Nothing else** — orderable immediately,
  and it blocks I-11. **It does not fire A-39 Part 11**: no store is added, no version moves, no upgrade
  writes a record.
- **Ship gate.** G18…G25 each red before and green after, recorded; group 5 is checked and reported but is
  **not** a hold. Then a **breaker round over I-13, I-13b, I-13c, I-13d, I-13e and I-13g together** — rounds
  45 through 49 all returned SEND BACK and it is I-13g that has to earn the reversal. **That round's first
  job is to attack A-69 Part 11's proof at its three named dependencies** (one `return`, one writer,
  no un-awaited work touching `photos`), because those three are now what liveness rests on, and **its
  second is to look for a store operation whose correctness still reads as a list of sites** — A-69 Part 3
  is the standing rule and the round that finds an exception to it has found the next ruling. A-69's six
  residues and A-67/A-68's (as amended) are read at the gate; **none is a ship condition**.

#### I-13h — a failed answer is not a current answer: the predicate asks the slot (BUILD-NOTES **KD-84**; §4.2 **A-70**)

*Revision 51, from the I-13g builder's own disclosure rather than from a QA round. **This is the smallest
increment in the arc and it is deliberately tiny: one disjunct, one stamp, one read-only accessor, and two
existing tests re-cut.** A-69's boundary is upheld whole — both settling sites, the type fence, the
deletions, Part 3's standing rule and Part 8's browse clause all stay and none of them is rebuilt. **This is
a `packages/client/src/store/store.ts` increment plus one method in `generation.ts` plus the tests that
measure it.** It opens **no `.tsx`**, touches **no `qa/` file**, adds no dependency, and moves no
`SCHEMA_VERSION`, `DB_VERSION`, `SUMMARY_VERSION`, `RefKind`, `AppState` field, `PhotoSession` field,
selector, port method or core export.*

> **Read order for the builder.** `ARCHITECTURE.md` §4.2 **A-70 whole** (~7k — Part 2 is why A-65 T1 is
> upheld rather than amended, Parts 3 and 4 are the mechanism, Part 5 is the list of things that must not
> move, Part 6 is the criteria). Then **A-69 Parts 4, 5 and 6** for the code A-70 keeps, and A-69's
> **amendment banner**, which names every line of A-69's that no longer holds. **You need nothing else in
> this document** — not §10, not §4.4, not the rest of §4.

- **Built.** Three changes and two test re-cuts. **All three code changes or none**: the accessor with no
  stamp is dead, and the stamp with no disjunct is unread.

  **1. `generation.ts` gains `sequenceOf(slot: GuardedSlot): Ticket` — `(s) => seq[s]` — and nothing
  else** (A-70 Part 4a). **This is the first change to that file in four revisions and it is deliberate**:
  it reads and returns, takes no lock, changes no counter and gates nothing, so A-67 Part 3's four
  properties are untouched. **Its docstring must say that it is NOT a substitute for `observe`** and must
  never gate a write — `observe`'s `null`-inside-a-window is load-bearing (A-67 Part 3 item 2) and
  `sequenceOf` deliberately ignores `busy`, which makes it the wrong tool for every question except the one
  in group 2.

  **2. `setAvailability` stamps the answer it writes** (A-70 Part 4b). One closure variable beside `cache`
  — `let availabilityAt: Ticket | null = null;` — assigned `guard.sequenceOf('photoAvailability')` as the
  first statement of `setAvailability`, with no `await` between it and the `set`. **It is not an `AppState`
  field, not persisted, not a selector input and not visible to a subscriber**; two stores over one
  `memoryStorage` do not share it, for A-67 Part 3 item 3's reason. A-69 Part 5 already closed the set of
  incremental writers to this one function, which is what makes the stamp complete by construction rather
  than by discipline — **do not add a second assignment site.**

  **3. `availabilityUnanswered` becomes a disjunction** (A-70 Part 4c), printed in full in that Part. The
  `state.photos.availabilityError === null` **conjunct** is replaced by a second **disjunct**:
  `!guard.current('photoAvailability', availabilityAt)`. **Four things that do not move:** the
  `state.doc !== null` guard, **both** `guard.observe(...)` terms (still load-bearing, still not defensive
  checks to be tidied), the first disjunct entire, and `settleAvailability` itself, which does not change by
  a character.

  **4. `G13b` and `G14b` are re-cut as `G26` and `G27`** in `packages/client/test/liveness.test.ts`. The
  I-13g builder wrote them to go red on this ruling and said so; **they are re-cut, not deleted.** Their
  fixtures are exactly right and stay — a failed `present()`, then an import (G26) or `removePhoto` +
  `undo` (G27) — and what changes is the expected outcome and the injected fault. **G26**: the listing
  reaches `'ready'`, `missing: 0`, **exactly one** extra `present()` for the whole batch, and no photograph
  on disk ever reads `'missing'`. **G27**: the restored record reads `'missing'` with **no**
  `refreshPhotoAvailability()` in between — §10 **A-65 T1**, whose *"never `'unreadable'`"* is upheld
  unamended. Their `KD-84` assertion messages are replaced by A-70 pointers, and the trailing
  *"recoverable one tap later"* assertions stay, since they now assert the ordinary path rather than a
  disclosed defect.

  **5. The comments the first three make true or false. NON-BLOCKING, in the same diff.**
  `availabilityUnanswered`'s docstring gains the second disjunct's reason (*the record of the obligation is
  the slot's sequence, not the value of the field*); `settleAvailability`'s docstring keeps *"repairs an
  absent answer and never a wrong one"* — **it is still true**, and A-70 Part 5 item 2 says why — but its
  sentence *"a failed read writes `availabilityError`, which makes the predicate false"* is **replaced** by
  *"a failed read restamps, which makes the predicate false"*; and `readPhotoAvailability`'s docstring
  paragraph about the boundary gains one clause. **Nothing else in this file's prose moves.**

- **What the builder does NOT do**, each with its reason:
  - **No fourth `AvailabilityAnswer` arm and no clearing of `availabilityError` at the byte-write sites.**
    A-70 Part 5 item 3 refuses both, with reasons: an *"unknown"* answer written at each write puts the
    obligation back into an enumeration, and it destroys the port's message before knowing whether the
    replacement read will succeed.
  - **No second `sequenceOf` caller.** One call site, inside `setAvailability`. A second is a finding
    before it is a feature (A-70 residue 3).
  - **No `qa/` file is touched** and **no `.tsx` file is opened.** **I-13f** still holds its two lines.
  - **Nothing in A-69 is rebuilt or reverted** — the settling sites, `settling(...)`, the type fence, the
    deletions and Part 8's browse clause are all shipped and correct.
- **User-visible outcome.** **Still nothing on screen** — there is no photo surface yet. What changes
  underneath: **after a photo read has failed once, the store stops holding that failure over you.** Import
  three photographs and the listing tells you they are there instead of repeating a stale error; tap *Try
  again* while an import is running and your tap is no longer eaten; remove a photograph and undo it, and
  the restored record says `'missing'` — *"the picture is gone, the memory is not"* — which is what §10
  **A-65** ruled it must say and what the previous revision said only when nothing had ever failed.
- **Architecture / data model.** `ARCHITECTURE.md` §4.2 gains **A-70** and rule 6d gains its fourth half;
  A-69 is amended in place at Part 4 (the predicate and site S2) and Part 12 (G18, G21, G23, G24); §10
  **A-65** Part 6 gains a scope sentence and nothing else. **Four things a builder does not get to decide:**
  that §10 A-65 T1 is **upheld** rather than amended (A-70 Part 2 refuses the amendment with reasons); that
  the fix is a question to the **guard** rather than a fourth clause about the error field (Part 3); that
  the byte-write `supersede`s, R45-4's value guards, `removePhoto`'s tail gate and `deleteTrip`'s `catch`
  read all **stay** (Part 5 item 1); and that the boundary must still **never repair a wrong answer**, which
  **G12** measures (Part 5 item 2).
- **Verification.** **A-70 Part 6's G26…G30, each red before and green after, recorded.**
  - `[stated]` **G26 — KD-84 face 1.** A failed `present()`, a *Try again* parked behind it, three files
    imported underneath: the listing reaches `'ready'` with `missing: 0`, **exactly one** extra `present()`
    for the batch, and no photograph on disk reads `'missing'`. **Injected fault: restore
    `availabilityError === null` as a conjunct → zero reads, the previous failure's message stands → red.**
  - `[stated]` **G27 — KD-84 face 2, which is §10 A-65 T1.** The same failed read, then `removePhoto` then
    `undo`: the restored record reads **`'missing'`** with no refresh in between. **Two faults, both red:**
    restore the conjunct → `'unreadable'`; make `settleAvailability` a no-op → `'loading'`. **G14 (unread
    fixture) and G27 (failed fixture) must now agree in outcome, and that agreement is the criterion.**
  - `[stated]` **G28 — the misuse fence, an `S5`-shaped grep.** `sequenceOf(` has **exactly one** call site
    and it is inside `setAvailability`; `availabilityAt` is assigned in exactly one place and read in
    exactly one; it appears in no type in `store/state.ts` and in no selector.
  - `[stated]` **G29 — the invariant helper, strengthened.** It asserts **`!availabilityUnanswered()`**
    rather than A-69's three-way disjunction, at the end of every test in `generation.test.ts`,
    `liveness.test.ts` and `settling.test.ts`. **Outcome clause:** if an existing test reddens on the
    strengthened form and the store's behaviour is otherwise correct, that is a **finding routed to the
    architect**, not a line to re-cut and not a reason to weaken the helper.
  - `[stated]` **G30 — S2's placement, with its control.** With S2 as `readPhotoAvailability`'s `finally`
    around `readAvailabilityOnce`, deleting it reddens the S2-isolating test and nothing else. **Control:
    move S2 to a statement after the `try`/`finally` → the S2-isolating test is red WITH the line
    present.** This is KD-85 pinned so the printed placement cannot come back.
  - `[stated]` **The four this could plausibly have broken, checked first: G12, G13, G14 and G23.** G12
    because the boundary must still not repair a **wrong** answer — its own fault (drop A-68 Part 6's
    `catch` read) must still redden, and it does, because nothing bumps the slot on that path so the stamp
    is still current. G13 and G23 because their `present()` counts must not move. G14 because it and G27
    must now agree.
  - `[stated]` **A-67's G1…G9, A-68's G10…G17 and A-69's G18…G25 all re-run**, with A-69's **G18**,
    **G21**, **G23** and **G24** as corrected above and in A-70 Part 7.
  - `[stated]` **The suite and the probes.** `npm test`, `npm run typecheck` and the sample build green
    with no `package.json` diff and no lockfile movement. `qa/r45-i13.mjs`, `qa/r46-i13b.mjs`,
    `qa/r47-i13c.mjs`, `qa/r48-i13d.mjs` and `qa/r49-i13e.mjs` at the status I-13g left them. Outcome
    clause, unchanged in force: a red line anywhere is a finding routed to the architect, not a line to
    re-cut.
  - `[stated]` **The fence:** `git diff --name-only` shows **zero** `.tsx` files, **zero** `qa/` files,
    zero files under `cairn/docs/design/`, and the only file outside `packages/client/src/store/store.ts`
    and `packages/client/test/` is `packages/client/src/store/generation.ts`, whose diff is **one method**.
- **Dependencies / blockers.** I-13g (built, `ae075db`). **Nothing else** — orderable immediately, and it
  blocks I-11. **It does not fire A-39 Part 11**: no store is added, no version moves, no upgrade writes a
  record.
- **Ship gate.** G26…G30 each red before and green after, recorded; group 5 is checked and reported but is
  **not** a hold. Then the **breaker round over I-13, I-13b, I-13c, I-13d, I-13e, I-13g and I-13h
  together** that I-13g's gate already schedules — rounds 45 through 49 all returned SEND BACK and it is
  this pair that has to earn the reversal. **That round's jobs are I-13g's two, plus a third:** attack A-69
  Part 11's proof at its three named dependencies; look for a store operation whose correctness still reads
  as a list of sites (A-69 Part 3); and **look for a second predicate in this store that decides an
  obligation by reading the value of a field rather than the record of the obligation** (A-70 Part 3) —
  three rulings in a row have consulted the wrong resource and the shape now has a name. A-70's four
  residues and A-69's/A-68's/A-67's are read at the gate; **none is a ship condition**.

#### I-13i — a subscriber's exception is not the store's failure: one brand, one classifier, seven `catch` blocks deleted (QA round 50 — **R50-5** MAJOR, **R50-2** MAJOR; §4.2 **A-71**, §10 **A-66 Part 11**)

*Revision 52, from QA round 50's two MAJORs. **Both are pre-existing and neither is a defect in A-67…A-70
— that arc closed at round 50 and this increment does not touch it.** No slot, no ticket, no claim, no
supersede, no read, no predicate: `generation.ts` does not change by a character and neither does
`availabilityUnanswered`, `settleAvailability`, `settling` or `setAvailability`'s body. **This is a
`packages/client/src/store/store.ts` increment plus the tests that measure it.** It opens **no `.tsx`**,
touches **no `qa/` file**, adds no dependency, and moves no `SCHEMA_VERSION`, `DB_VERSION`,
`SUMMARY_VERSION`, `RefKind`, `AppState` field, `PhotoSession` field, selector, port method or core export.*

> **Read order for the builder.** `ARCHITECTURE.md` §4.2 **A-71 whole** (~10k at revision 53, and **its
> amendment banner first** — four of its sentences were corrected after QA round 51 confirmed the
> mechanism: G35's control, Part 4a's failure direction, the `saveAs` that never existed, and Part 4d's
> *"every exit"* — Part 1 is the five measured
> faces, Part 2 is the one-sentence cause, Part 3 is what is refused and why the obvious fix is wrong,
> Part 4 is the mechanism printed in full, Part 5 is the list of things that must not move, Part 6 is the
> criteria). Then §10 **A-66 Part 11** (~2k — the second MAJOR, and its one line meets A-71's at the import
> loop's `finally`). Then **A-69 Part 7 and Part 13 residue 1**, both of which now carry A-71's amendment
> banner, so you can see exactly what of the old disclosure survives. **You need nothing else in that
> document** — not A-67, not A-68, not A-70, not §4.4, not the rest of §10.

- **Built.** Four groups. **Groups 1 and 2 are all-or-nothing** — the brand with no classifier is unread,
  and the classifier with no brand mis-rethrows nothing.

  **Group 1 — `emit` brands what a subscriber throws** (A-71 Part 4a). A closure-local
  `const fromSubscriber = new WeakSet<object>()`, a two-line `isSubscriberError`, and a `try`/`catch`
  around the listener call that adds the thrown value to the set and **rethrows it unchanged**. **Who is
  notified does not change**: `emit` still stops at the first throw, and A-69 Part 13 residue 1 keeps its
  other two costs and its trigger. A non-object throw is wrapped in an `Error` whose message is
  `String(e)` — the only case where the caller sees something other than exactly what was thrown, because
  a `WeakSet` cannot hold a string.

  **Group 2 — `attempt`, the one classifier in the file** (A-71 Part 4b), printed in full in that Part.
  `async attempt<T>(op: () => Promise<T>): Promise<Attempted<T>>`, with
  `if (isSubscriberError(error)) throw error;` as the line the whole ruling rests on. **A `type Attempted<T>`
  local to this file, not exported, not in `state.ts`, not in `packages/core`.**

  **Group 3 — the seven `catch` blocks become `attempt` calls** (A-71 Part 4c's table).
  `readAvailabilityOnce` (printed in full in Part 4c, and it merges its two identical
  `guard.current('photoAvailability', t)` drop checks into one); `removePhoto`'s `remove`;
  `importPhotos`' `derive` and its `write` — **the `throw new Error('handled')` sentinel and the per-file
  `catch` that existed to read it are both deleted** (Part 4d); and the three persistence writes
  (`attemptSave`, and **`doMerge`'s two chained writes** — the `stored === null` write-it-back branch and
  the merge write). *(**Corrected at revision 53, QA R51-3**: this line said `saveAs`, a method that has
  never existed. The builder read it correctly and shipped the right site; the ruling's text was wrong and
  is fixed in §4.2 A-71 Part 1, Part 4c row 6 and Part 6 G34.)* **Every recorded outcome keeps its
  exact value** — the port's message in `availabilityError`, the id in `orphans`, `'quota_exceeded'` in
  `failures`, the port's message in `lastError`. **No user-visible string moves.**

  **Group 3a — `importPhotos`' progress settlement becomes the loop's `finally`** (A-71 Part 4d). The
  deleted per-file `catch` was keeping the fraction settling by accident; a `finally` keeps it settling on
  purpose, including on a throw out of the loop. **A `finally`, not a statement below the block**, for
  KD-85's exact reason.

  **Group 4 — `setBatch`, and it is §10 A-66 Part 11's** (QA **R50-2**). One arrow function inside
  `importPhotos`, `setPhotos` gated on `guard.current('doc', g)`, printed in full in Part 11. **Every
  `setPhotos` call inside `importPhotos` goes through it** — `fail`'s, the opening `{pending, total}` pair,
  the per-file decrement, and group 3a's `finally`. **The explicit `if (!guard.current('doc', g)) return
  state;` after `pickImages()` STAYS**: it aborts the batch, which is strictly more than gating a write.

  **Group 5 — the comments the first four make true or false. NON-BLOCKING, in the same diff.**
  `readAvailabilityOnce`'s *"it carries no photo id, no caption and no coordinate (§6.1 rule 1)"* was true
  of the port's message and false of the field (round 50's BLOCKERS row records it as R50-5's third note);
  it becomes true and the comment says why. `reclaimPhotoBytes`' *"the rule `removePhoto`'s tail and the
  import loop both keep"* is **false of the import loop today** and becomes true at group 4 — leave the
  sentence, it is the one this increment earns. `importPhotos`' docstring gains one clause naming
  `setBatch`. **Nothing else in this file's prose moves.**

- **What the builder does NOT do**, each with its reason:
  - **No change to who `emit` notifies.** Isolating listeners so the rest are notified is a genuine
    improvement, is **not** this increment's, and is A-69 Part 13 residue 1's with its trigger unchanged
    (A-71 Part 3, Part 5 item 1). This increment buys **distinguishability** and nothing else.
  - **No error channel.** No `ports.log`, no `AppState` field for subscriber errors, no deferred rethrow
    through `queueMicrotask`. A-71 Part 3 refuses all three: each is a new design bought to solve what one
    brand solves, and `cairn-constraints` §4 would have something to say about the third.
  - **The three `try { core.fromJSON(...) } catch` sites, `reclaimPhotoBytes`' `remove`, and
    `deleteTrip`'s two cascade clauses all STAY exactly as they are** (A-71 Part 5 items 3 and 4). Their
    `try` bodies cannot reach an emit, so they cannot misattribute. Converting them is change for
    symmetry's sake and it is not wanted.
  - **Nothing in A-67, A-68, A-69 or A-70 is rebuilt, reverted or tidied.** No bump, no claim, no
    supersede, no read, no predicate. Both `guard.observe` terms in `availabilityUnanswered` are still
    load-bearing.
  - **No `qa/` file is touched** and **no `.tsx` file is opened.** **I-13f** still holds its two lines.
- **User-visible outcome.** **Still nothing on screen** — there is no photo surface yet. What changes
  underneath: **when the app's own view breaks, the app stops blaming your data for it.** A render bug
  while your photographs load no longer leaves *"the photo store could not be read"* permanently over
  photographs that are all on disk, with a *Try again* that can never clear it; a render bug while a
  photograph is removed no longer lists a deleted photograph as an un-reclaimed orphan; a render bug while
  a photograph is added no longer tells you the file could not be added when it was; and — the one that
  matters most — **a render bug while your trip saves no longer says your work could not be saved when it
  is in storage.** In every case the exception now reaches the caller instead of being erased. And,
  separately: **a photo import you walk away from stops leaving its report and its progress bar on the trip
  you walked to.**
- **Architecture / data model.** `ARCHITECTURE.md` §4.2 gains **A-71**; §10 **A-66** gains **Part 11**,
  one clause on Part 6's surface sentence, two rows on Part 8's table and a pointer in §10.6's union block;
  §4.2 **A-69** Part 7 and Part 13 residue 1 gain amendment banners; §4.2 **A-70** Part 7 item 3 and A-69's
  **G21**/**G24**/**G28** rows have their published counts corrected (QA **R50-1**) — *and at **revision
  53** those same rows lose their published counts entirely, because the correction drifted again inside
  its own revision (QA **R51-6**); see the **count rule**, which is now **How a criterion is written**
  rule 6*. **Five things a
  builder does not get to decide:** that the fix is a **brand plus one classifier** rather than five
  narrowed `try` blocks (A-71 Part 3 — the second is A-69 Part 3's forbidden enumeration); that `emit`'s
  stop-at-the-first behaviour **does not change** (Part 5 item 1); that every recorded outcome keeps its
  **exact** value (Part 5 item 2); that the misattributed import report is **dropped and not retargeted or
  tenanted** (A-66 Part 11's four reasons); and that `PhotoImportFailure` still has **exactly five arms**
  (`U5`, unmoved).
- **Verification.** **A-71 Part 6's G31…G38 and §10 A-66 Part 8's U6/U7, each red before and green after,
  recorded.** Every behavioural one is driven by a subscriber that throws on the **Nth emit** after arming,
  not on every emit — a subscriber that throws on the first emit aborts the operation before it reaches the
  `catch` under test, and an "all emits" subscriber is why four of these five faces went unmeasured for
  fifty rounds.
  - `[stated]` **G31 — R50-5 itself.** One photograph whose bytes are on disk; the subscriber throws on the
    availability emit inside `openTrip`. `availabilityError` is **`null`**, `available` is the real set,
    `presentCount` is **1**, and `openTrip` **rejects with the subscriber's own `Error`, message
    unchanged**. **Fault: move `setAvailability` back inside the `try` → red.**
  - `[stated]` **G32 — the orphan face.** The subscriber throws in `removePhoto`'s tail on a `remove` that
    **succeeds**. `orphans` is **`[]`** and `photo.read(trip, id, 'thumb')` is `null`. **Fault: restore the
    wide `try` → `orphans: ['photo-1']` over deleted bytes → red.**
  - `[stated]` **G33 — the named-file face.** The subscriber throws on `importPhotos`' `addPhoto` emit with
    a `write` that **succeeds**. `failures` is **`[]`**, the record is in the document, `pending` settles
    to **0**. **Two faults, both red:** restore the per-file `catch` → a `'storage_failed'` naming a file
    that landed; delete group 3a's `finally` → `pending` stranded above 0, which is §10.6's opening
    sentence.
  - `[stated]` **G34 — the persistence face, and it is the one that says this is not a photo defect.** The
    subscriber throws on `writeAndSettle`'s install behind `flush()`. `persistence.status` is **`'idle'`**,
    `savedVersion` is the version storage holds, `lastError` untouched. **Fault: restore `attemptSave`'s
    wide `try` → `'error'` with the fence advanced → red.** Repeat for **both of `doMerge`'s chained
    writes** — three variants in all *(**corrected at revision 53, QA R51-3**; this line said `saveAs`)*.
  - `[stated]` **G35 — the control, and what it controls is face 4.** Delete the `WeakSet.add` in `emit`
    (rethrow unbranded) → **G34's three variants and G37 go red; G31, G32 and G33 stay GREEN, and that is
    the criterion.** *(**Rewritten at revision 53, QA R51-1**, which measured the mutation. The four
    non-persistence sites pass `attempt` a bare port call, so — by A-71 Part 4b's own rule — no `emit` runs
    inside the classifier's scope there and the brand is never consulted; it is load-bearing at the three
    `writeAndSettle` sites and nowhere else. **Widening `attempt` to make the old wording reproduce would
    violate Part 4b and is refused.**)* **Run the sharper second mutation beside it: delete `attempt`'s
    `if (isSubscriberError(error)) throw error;` → the same four red and no others**, which is what says
    the brand's two halves are one mechanism.
  - `[stated]` **G36 — the other side, and it is the criterion that says nothing changed except who gets
    blamed.** With **no subscriber involved**: a `present()` that rejects, a `remove` that rejects, a
    `write` that throws `QuotaExceededError`, a `saveIfVersion` that rejects. Every recorded outcome is
    byte-identical to the pre-A-71 store.
  - `[stated]` **G37 — the fence, and the number lives in BUILD-NOTES and in the test, never here**
    (§4.2 **A-70 Part 7 item 3's count rule**, revision 53, which supersedes R50-1's *"publish the command
    beside the number"*). Every `catch` clause in `store.ts` is one of the six kinds A-71 Part 6 names.
    **The command is `grep -coE '\}\s*catch\b|^\s*catch\b' packages/client/src/store/store.ts`; it was 13
    before the fix, at `37cf4f0` — history, stamped, and no criterion depends on it — and the builder
    publishes the post-fix value in BUILD-NOTES beside that exact command.** Do not publish a number this
    document predicted, and do not copy the post-fix value back into this document: four rounds have now
    filed a finding against a number in a contract doc.
  - `[stated]` **U6 / U7 — §10 A-66 Part 11 (R50-2).** U6: a `derive` the double refuses, with
    `openTrip(B)` landing inside that decode → **`failures` is `[]` on B**; fault: `fail` calls `setPhotos`
    directly → `[{name, reason: 'decode_failed'}]` on B → red. Run the `'storage_failed'` arm the same way.
    U7: A's four-file batch abandoned by `openTrip(B)`, **B then starts its own four-file batch and has
    landed nothing** → **B's `pending` is 4 before A's batch ends and 4 after**; fault: the closing
    settlement calls `setPhotos` directly → `4 → 0` → red. **U1 and U2 stay and still pass; they are the
    weaker versions and the reason four faces went unmeasured.**
  - `[stated]` **G38 — everything before it re-runs.** A-67's **G1…G9**, A-68's **G10…G17**, A-69's
    **G18…G25** (with G18/G21/G23/G24 as corrected) and A-70's **G26…G30**, all green. **G12, G13, G26 and
    G29 first** — they are the four this ruling could plausibly have broken.
  - `[stated]` **The suite and the probes.** `npm test`, `npm run typecheck` and the sample build green
    with no `package.json` diff and no lockfile movement. `qa/r45-i13.mjs`, `qa/r46-i13b.mjs`,
    `qa/r47-i13c.mjs`, `qa/r48-i13d.mjs`, `qa/r49-i13e.mjs` and `qa/r50-i13h.mjs` at the status round 50's
    fix pass left them. **And `merge-race.test.ts`, `flush-race.test.ts`, `storage-version.test.ts`,
    `dirty.test.ts` and `switch.test.ts` are named explicitly**, because group 3 touches the write fence
    and those five are what defend it. Outcome clause, unchanged in force: a red line anywhere is a finding
    routed to the architect, not a line to re-cut.
  - `[stated]` **The fence:** `git diff --name-only` shows **zero** `.tsx` files, **zero** `qa/` files,
    zero files under `cairn/docs/design/`, and the only files are
    `packages/client/src/store/store.ts` and `packages/client/test/`.
- **Dependencies / blockers.** I-13h (built, `e051306`) and round 50's fix pass (`37cf4f0`). **Nothing
  else** — orderable immediately, and it blocks I-11. **It does not fire A-39 Part 11**: no store is added,
  no version moves, no upgrade writes a record.
- **Ship gate.** G31…G38 and U6/U7 each red before and green after, recorded; group 5 is checked and
  reported but is **not** a hold. Then a **breaker round over the whole I-13 arc including this
  increment**, whose jobs are round 50's three plus a fourth: **look for a third source of synchronous
  foreign code in this store** (A-71's own reopen trigger — a port that takes a callback, a middleware
  hook, a `derive` that calls back in), and **look for another place where a rule this document states as a
  prediction is already being broken by the code it was written to protect** — which is what A-66 Part 11
  is, and it is the second time in this arc (Part 10 was the first). A-71's four residues, A-66 Part 11's
  one, and A-70's/A-69's/A-68's/A-67's are read at the gate; **none is a ship condition**.
- **Outcome — QA round 51 (`032a4cb`, findings at `119d336`). The mechanism SHIPS.** The breaker ran the
  gate's fourth job, attacked the brand as a mechanism (identity semantics, a same-message impostor, six
  non-object throw types, a nested emit, two stores over one storage, observability), drove the three
  write-fence sites through a real debounced autosave, a queued second write and a real two-tab merge, and
  **could not break it**: **0 BLOCKERS, 0 MAJOR, 6 MINOR, and every one of the six is a wrong sentence or a
  wrong number rather than a defect in the code.** Five route to the architect and are corrected in
  `ARCHITECTURE.md` at **revision 53** (R51-1 G35's control, R51-2 the false-positive brand's direction,
  R51-3 `saveAs`, R51-4 Part 4d's *"every exit"*, R51-6 the count rule); **R51-5 is one row of BUILD-NOTES'
  I-13i addendum and is a builder's, non-blocking**. **A-71 gains two residues — 5 (a false-positive brand
  leaves `'saving'` stuck; unreachable in today's `apps/web`) and 6 (the import fraction does not settle on
  the one exit above the `try`; pre-existing, measured identical at `8d69ff1`, fix specified in Part 4d)**
  — and **neither is a ship condition**: no code moves for round 51, and **I-13i is complete as shipped.**

#### I-13f — the two `.tsx` lines this arc has been fencing (A-68 Part 8, A-67 Part 11 residue 3). NOT SCHEDULED ALONE

*Revision 49. **This is a queued follow-up, not an increment to dispatch on its own** — it is two edits in
one file, and the whole of the I-12/I-13 arc has been deliberately fenced out of `.tsx`. It is written down
here because "deferred forever because nobody owns it" is how both of these were found: one of them was
disclosed as *unreachable* for two revisions and is reachable today.*

- **Both land in the first increment that opens `apps/web/src/App.tsx`** — most plausibly the photo surface
  — and **both are ship conditions of that increment**, not of I-13e.
  1. **A-68 Part 8 (QA R48-3).** `App.tsx:239`/`:240` call `store.redo()`/`store.undo()` bare inside a
     `window` `keydown` listener. During a `deleteTrip` cascade the store refuses with
     `TRANSITION_IN_PROGRESS_MESSAGE` — correctly, and A-68 Part 8 refuses both a silent no-op and a
     queued undo — so the refusal surfaces as an **uncaught error inside a DOM event listener**, where no
     React error boundary can see it. Wrap both calls: `try { … } catch (e) { setError((e as Error).message); }`.
     The message was written for a user's eyes and this is what lets it reach them.
  2. **A-67 Part 11 residue 3.** The Map and Profile tabs call `openTrip` unconditionally, including for
     the trip that is **already active** — a navigation, not a document transition, and under A-67 it stops
     an import running into that trip. Make the call conditional on `state.activeTripId !== id`.
     **It does not remove the `A → B → A` case** (A-68 Part 9), which stays disclosed.
- **Urgency, ruled.** Neither is urgent: today item 1 costs a keystroke that does nothing plus a console
  error, on a gesture that would not have undone the delete anyway, and item 2 costs an import the user can
  repeat. **Neither may be dropped**, and this entry exists so the next `.tsx` increment inherits them
  rather than rediscovering them.

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
- **Verification.** All exit criteria below, each re-derived; the whole Phase 1 suite unchanged; the
  attack list for this phase run end to end.
- **Dependencies / blockers.** I-0 through I-10, **and I-12, I-12a, I-13, I-13a, I-13b, I-13c, I-13d, I-13e, I-13g, I-13h and I-13i** (revision 40,
  step 2d — numbered above this increment and sequenced below it; I-12a added at revision 41, I-13a at
  revision 43, **I-13b at revision 44 — it is the repair pass for round 45's SEND BACK on I-13 and the
  phase cannot be gated with it unbuilt**, and **I-13c at revision 45, the repair pass for round 46's
  SEND BACK on I-13b, on the same terms**, and **I-13d at revision 47 — the repair pass for round 47's
  SEND BACK on I-13c, and the only one of the four that is a `packages/client` **store** increment rather
  than a photo one; it is where §4.2 rule 6d and A-67 land, so the phase cannot be gated with it unbuilt**,
  and **I-13e at revision 49 and I-13g at revision 50 — the two repair passes over A-67's wiring and over
  A-68's own discharge gate; I-13g is where §4.2 A-69's settling boundary lands and the phase cannot be
  gated with it unbuilt either**, and **I-13h at revision 51 — one disjunct, one stamp and one read-only
  accessor, where §4.2 A-70 narrows A-69's predicate so that a byte write after a failed read still
  discharges its promise and §10 A-65 T1 is true again on every path; it is the smallest of the seven and
  the phase cannot be gated with §10 A-65 T1 regressed**, and **I-13i at revision 52 — the eighth and the
  only one that is not about the generation guard: one brand on `emit`, one classifier `attempt`, seven
  `catch` blocks deleted, where §4.2 A-71 stops a `catch` recording a *subscriber's* exception as its own
  subject's failure and §10 A-66 Part 11 puts `setBatch` between the import loop and `state.photos`. **The
  phase cannot be gated with §4.2 A-71 unbuilt**, and the reason is the same class as I-13h's: A-71 Part 1
  measured **five shipped surfaces stating a false fact about the user's own data** — a photo store that
  reads fine reported unreadable with a *Try again* that can never clear, bytes that were deleted listed as
  orphans, a photograph that landed named as `'storage_failed'`, and **a write that landed with the fence
  advanced reported as `persistence.status: 'error'`** — so a gate run with it unbuilt would be certifying
  a phase that lies about whether the traveller's work is saved**).

  **I-13a is a one-file test-and-comment pass** and may land inside any earlier commit that opens
  `photos.test.ts`; it is named here so that it cannot reach the gate unbuilt.

  ***Measured at revision 54, against `git log` on `master` rather than against this document's own status
  cells, immediately before the gate was to be dispatched. Four of the dependencies named above were NOT
  BUILT, and the full chain may not be ordered until the ones that remain required are.*** **Revision 55
  resolves one of the four rather than building it: `I-10` is deferred by Jacob's decision and is no longer
  a dependency of this gate — three remain (`I-9`, `I-12a` item 5, `I-13a`), and the sub-bullets below are
  updated in place.** This bullet is the authoritative list;
  where the 2d status cell above, the revision-53 ledger entry or `CAIRN_VISUAL_ROADMAP.md` says the only
  thing standing between here and the gate is I-11's own chain, **they are wrong and are superseded here**.

  - ***`I-9` is required and was not started at revision 54.*** Measured against `master`: no `Participant`
    type in `packages/core/src/model/types.ts`, no `packages/core/src/build/participants.ts`, no
    `duplicate_participant_id` or `participant_name_empty` in `validateTrip.ts`. **A builder was dispatched
    to it on 2026-09-04** and this bullet is discharged when its commit is on `master`, not when it is in a
    working tree. **`I-9` alone discharges every participant-touching exit criterion in this phase**, and
    revision 55 enumerated them rather than assuming: **(1)** *"Participation grants nothing, asserted
    mechanically"* — the §6.2 access conformance set run twice, with and without participants, diffing to
    nothing — whose implementation is `packages/core/test/access.test.ts` and `qa/access.mjs`, where the
    predicates take a `TripRelationship` and a clock and never a rendered surface; **(2)** the round-trip
    and undo parity clause over `Trip.participants`, at depth 50; **(3)** §4.2 rule 1's *every new action
    maps 1:1 onto a core build function*; and **(4)** NO SILENT LOSS's 200-step dirty walk *"with
    participant edits in the step chooser"*, which is `packages/client/test/dirty.test.ts` under
    `node --test`. **All four run in plain Node with no browser and no screen**, so (3) and (4) are what pin
    the **store-side half of I-9** that its own *Verification* bullet already requires; an I-9 that landed
    core-only would owe that half **to I-9**, not to I-10, and nothing about it opens a `.tsx`.
    ***I-9 landed on `master` at `0e556a0` and this sub-bullet is discharged.*** **Revision 56 adds `I-9a`
    and it is NOT a dependency of this gate**: it is the builder follow-up for `ARCHITECTURE.md` A-72
    (`SCHEMA_VERSION` → 3) and A-73 (`duplicate_participant_id` has one home), **no exit criterion of this
    phase names `SCHEMA_VERSION`, `migrateDoc` or the parser's duplicate refusal**, and none of the four
    criteria enumerated above touches either group. It should nonetheless land **before** the gate rather
    than after it, because a schema bump taken after a gate is taken against a larger corpus of documents.
  - ***`I-10` is DEFERRED and does NOT block this gate*** — Jacob's decision of 2026-09-04, recorded at
    revision 55, on the same footing revision 54 gave **I-13f**. It is real, specified and needed for the
    whole of 2c, and it is the **only increment left in this phase that requires a screen**
    (`Participants.tsx`, plus the grouping on `Profile.tsx`), which the standing `.tsx` fence bars while the
    visual direction is unresolved — the same rule *Explicitly not in Phase 2* applies to *"any photo screen
    at all"*. **No exit criterion of this phase names `Participants.tsx`, the profile grouping, or any
    rendered participant text**; the §6.2 double-run sat in I-10's *Built* bullet because 2c **shipped**
    there, which is placement and not dependency. What genuinely waits for I-10 is **I-10's own ship gate**
    — a step gate, not this one. **So Phase 2 ships with participants as a core-and-store capability with no
    surface**, which is a stated deferral rather than an unbuilt dependency, and §8.3's *"the view says so"*
    obligation is **unfired rather than violated** because there is no view. **This is not a claim about
    I-9**: I-9 stays required, above. I-10's trigger is written into its own entry — the visual-direction
    track resuming, an increment that opens either file for a reason of its own, or the first surface
    anywhere that groups participants across trips, whichever comes first.
  - **The revision-40 note above is still true that 2d is *"orderable before or after 2c"***; it never made
    2c optional, and **I-11 is below 2c as narrowed** — that is, below **I-9**.
  - ***`I-12a` item 5 (§8.4 A-60 Part 6) is not built.*** The entry has said *"owed by the repair pass, not
    yet built"* since revision 42 and it is still accurate — but the repair pass it was owed by
    (`74a2762`) **landed before revision 42 wrote the item** (`598cd7f`), so nothing has carried it since.
    `packages/core/src/derive/travelStats.ts` still computes `rawA`/`rawB` from the `??` substitutes and
    tests disjointness on them; A-60 Part 6.3 requires the **supplied** edges (`obsA`/`obsB` first,
    `rawA`/`rawB` last) and there is no `obsA` in the file. 6.2's owed test — the one that distinguishes the
    per-field `??` from the pair-wide reading — does not exist either, which is why the fork stayed live.
    The measurable consequence is still the one the entry states: a `null` `firstDay` beside a readable
    `lastDay` strictly before `a` prints `[a, a]`, a single day the traveller is provably elsewhere.
  - ***`I-13a` is not built, and the ride-along clause above is what hid it.*** Two commits opened
    `packages/core/test/photos.test.ts` after revision 43 created the increment — `b24b14c` (round 45's fix
    pass) and `70b9ee6` (I-13b) — and **neither carried it**. In the file as shipped, the size case reports
    the measured delta and the per-photo figure **only inside an assertion message, which speaks when it
    fails**; the 128-character bound still has no fixture-scoped comment and no pointer to A-61 Part 8
    residue 1; and **BUILD-NOTES `KD-81` is still open and still marked *"Routed to the architect"***, which
    I-13a's own *Verification* bullet says it closes. The clause stays as written — I-13a is genuinely
    orderable anywhere after I-13 — but it is a **debt this bullet is now tracking**, not a likelihood.

  **Everything else on this list is built, verified commit by commit at revision 54, with its round's fix
  pass where one exists:** I-12 (`8b50889`), I-13 (`1820813`, ship gate `497c116`), I-13b (`70b9ee6`),
  I-13c (group 2 `a6c5d04`, group 3 `c440170`), I-13d (`4316167` + `ae62326`), I-13e (`106bbd3`), I-13g
  (`ae075db`), I-13h (`e051306`) and I-13i (`032a4cb`, confirmed at `119d336`, fix pass `de190bb`); I-12a's
  first four items are built at `b574dc5` with round 44's fix pass at `74a2762`. **Every commit hash this
  entry and the 2d cell cite resolves on `master` to the change it is cited for.**

  **`I-13f` is correctly absent from this list and does not block this gate**, and the revision-49 framing
  still holds unchanged: it is **two lines in `apps/web/src/App.tsx`**, it is a **ship condition of the
  first increment that opens that file**, and it is **not a claim about the store mechanism's soundness**.
  No such increment exists in this phase — *Explicitly not in Phase 2* refuses **"any photo screen at
  all"** while the visual direction is unsettled — so Phase 2 ships with A-68 Part 8's uncaught listener
  error and A-67 Part 11 residue 3's redundant `openTrip` **disclosed and ruled non-urgent**, which is a
  stated deferral rather than an unbuilt dependency. **`CAIRN_VISUAL_ROADMAP.md`'s two newest blocks call
  I-13f *"the actual photo screen"* and say it is what stands between here and shippable; that is wrong on
  both halves** — I-13f is not a screen, and what actually stands there is the three unbuilt increments
  above. Correcting it is part of the board rebuild this increment's *Architecture / data model* bullet
  already owns, and **revision 55 has already corrected it on the board in that revision's own block**.

  **`I-10` now sits beside `I-13f` on this list rather than above it** (revision 55): both are named, both
  are specified, both are barred by the same `.tsx` fence, and **neither blocks this gate**. The difference
  worth keeping straight is the trigger — I-13f's two lines **ride along** in a file a later increment opens
  anyway, while I-10 is a screen that rides along with nobody and therefore has an **event** for a trigger.
  Neither may be dropped, and both are written down here for exactly that reason.
- **Ship gate.** A manager verdict of **SHIP**. Nothing else counts as the phase being done. **And one
  precondition on ordering the chain at all**, added at revision 54 because it was nearly missed: the
  breaker round is *over the whole phase*, so **every increment named in the bullet above is built first**.
  Dispatching it against unbuilt dependencies does not produce a SEND BACK with findings — it produces a
  round that reports exit criteria as un-runnable, which costs a full adversarial pass and decides nothing.
  **Revision 55 sharpens what "every increment named above" means**: it is every increment the bullet still
  lists as **required** — three, at revision 55 — and **not** the two it names as deferred with a trigger
  (`I-10`, `I-13f`). A deferral this document states, with what it costs written down, is a thing the gate
  **certifies**; an unbuilt dependency is a thing the gate **cannot see**. The breaker's round is expected
  to report both deferrals as disclosed and to attack whether the disclosure is complete — in I-10's case,
  whether any Phase 2 exit criterion in fact needs a rendered participant surface. **Revision 55's answer is
  that none does; a round that finds one has found a defect in this ruling and it is architect-routed.**

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
- **Statistics cannot be stored.** *(Rewritten at revision 24, §8.4 **A-31** Part 6. The old form — "grep
  `packages/core`, `packages/client` and `apps/web` for a persisted field whose name is a count of
  countries, cities, trips or days; expect **zero**" — is **withdrawn as false**, not reinterpreted:
  `TripSummaryRow.cityCount` and `.dayCount` are persisted counts of cities and days and have been since
  Phase 1, so the criterion only ever passed because nobody ran it as written. Rule 5 — a criterion may not
  demand a number the spec derives differently.)* The rule it was reaching for is **a count may be stored
  only if it is a property of exactly one document, minted inside the write that carries that document
  (§8.4 clause 1) and stamped with `SUMMARY_VERSION` (clause 3); every number that summarises more than one
  trip is computed on read and has no storage representation at all.** Six parts:

  *(**Revision 25, §8.4 A-33, QA R28-2.** Parts **a** and **b** below are the revision-24 form and are
  **superseded**: half (b) was a regex for `name: number` over source text, so it matched a **declaration**
  and could never match a **value**. The breaker made both `SUMMARIES.put(summary, id)` call sites in
  `apps/web/src/ports/storage.ts` mint and persist `countriesVisited` and `daysTravelled` — the literal
  number this criterion exists to forbid, in IndexedDB, on every write — and **criterion 6, the 795-test
  suite and `tsc` were all green**. §0.5: a rule that cannot catch its own bug does not ship. The rule
  block-quoted above is unchanged and is still the point; what follows replaces the mechanism.)*
  - **a′. The row's key set is pinned in full — every field, not the count-shaped ones.** A compile-time
    `Record<keyof TripSummaryRow, true>` map, a runtime top-level key-set assertion against a minted row,
    and a runtime **leaf-path** assertion over the union of three rows (the reference trip; a trip with one
    city whose `countryCode` is `null`; a trip with no city, place or stop). Adding **any** field to the row
    fails the run, and widening the list is an architect's ruling — a field on the row is a field in
    storage and `SUMMARY_VERSION` moves with it. The count-shaped eight survive as an assertion *about* the
    pinned set, not as the filter that decides it. **Injected fault:** `daysAbroad: number` on the row,
    minted — a count whose name carries no counting suffix and no plural domain noun, which the
    revision-24 classifier passed `[stated]`
  - **b′. Every `StoragePort` implementation the census names is EXECUTED, written through and read back.**
    *(Rewritten at revision 26, §8.4 **A-36**, QA R29-1. The revision-25 form said "a real port" and meant
    the memory port; the web port was covered by b″'s grep, and a one-line variant of the fault that grep
    was written for walks past it — and past every scoped version of it — into real IndexedDB.)* Two arms,
    one per implementation, both in the suite and both on bare Node: **`packages/client`'s memory port**
    through the store's write path, through the rescan's `refreshSummary`, and directly; and
    **`apps/web`'s IndexedDB port**, type-stripped and evaluated against a ~80-line **recording double**
    of the IndexedDB API surface it uses — it has zero runtime imports and reads `indexedDB` off the
    global, so it runs. For each: every value that reaches the summary store, and every row `listTrips()`
    returns, has top-level keys equal to the type's and leaf paths a subset of a′'s. The double's own
    fidelity is pinned by asserting the ports' **outcomes** too (a stale `expectedVersion` refuses and
    writes nothing; `refreshSummary` on an absent record refuses; `refreshSummary` moves no fence).
    **Injected faults, all of which must be red:** a spread into `memory.ts`'s `summaries.set`; the same
    spread in the web port; a `const summary = { ...row, … }` shadow above the web port's put; the web
    port's parameter **reassigned** before an unchanged put; and `listTrips` widening the rows it returns
    `[stated]`
  - **b″. A tripwire on the port source: the summary store's argument, and the site count.** *(Demoted at
    revision 26, A-36 Part 4 — it was load-bearing for the one port nothing executed, and b′ now executes
    it.)* In each implementation, the expression written to the summary store is the bare parameter
    identifier `summary` and nothing else, at a **pinned number of sites** (2 + 2); plus a **port
    census** — the set of source files mentioning `refreshSummary` is exactly four — so a third
    implementation cannot appear without an **executed b′ arm**. The parameter-declaration assertion is
    **withdrawn**: its failure message claimed to close "a local `const summary = {...spread}` above the
    put" and does not. **Injected fault, and it is the one b′ cannot see:** a *third* `SUMMARIES.put` site
    that writes a correct row `[stated]`
  - **b″′. The real persisted bytes, out of band and recorded.** Any increment that touches
    `apps/web/src/ports/storage.ts`, the recording double or `ROW_KEYS` runs `qa/i7a-idb-rowkeys.mjs`
    against real Chromium — the shipped port evaluated in a real page, written through on both mutating
    methods, and the `summaries` store read back with a raw transaction that bypasses the port — and
    records the result in `BUILD-NOTES.md`. **It is not part of `npm run test:tap` and never becomes so:**
    the gate must run on bare Node with no browser (`BRIEF.md`'s phasing principle, `cairn-constraints` §2
    and §3). **If no browser is available in the environment, that is a disclosed gap, stated as such, and
    not a pass** `[stated]`
  - **b‴. Nothing that persists anything imports `travelStats`.** Unchanged from the revision-24 form,
    including its inconclusiveness guard. **Injected fault:** a storage port importing `TravelStats`
    `[stated]`
  - **b⁗. The source sweep survives as a secondary tripwire**, over four roots (`packages/tokens/src`
    joins), with comments stripped and two widenings: a local `type X = number` alias counts as `number`,
    and a count-shaped property initialised to a numeric literal counts too. Measured at the moment of the
    ruling: all three changes together produce **zero** new allow-list entries. **Injected fault:**
    `countriesVisited: number` on `Trip`, and an exported `lifetimeTotals` object literal in the store
    `[stated]`
  - **c. `travelStats` is pure and order-independent.** Called twice on one input, deep-equal; once on a
    mutated copy, different; the input array and its rows byte-identical after the call; and the same rows
    passed in a different order give a deep-equal result — the function sorts a `slice()` into its own
    canonical order (A-31 Part 4 step 2) so no output depends on how the caller built the list `[stated]`
- **The day skeleton is bounded, in core, at the function that mints it.** *(New at revision 26, §2.3
  **A-35**, QA R29-2.)* `ensureDays` refuses a span over **3,653 days** — ten Gregorian years, inclusive —
  before it allocates, so no caller can mint an unbounded day skeleton from a date range: not the two trip
  forms, not `setTripMeta`, not the legacy importer, not a phase that does not exist yet. Asserted at both
  edges (`2020-01-01 → 2029-12-31` succeeds at exactly 3,653; `2020-01-01 → 2030-01-01` throws at 3,654)
  and through the product path (`createTrip` with `0202-01-01 → 2020-12-31` throws instead of building
  664,377 `Day` records, and the message names the span, the cap and the dates). **Injected fault:** delete
  the check and the same call builds 664,377 days with `validateTrip` reporting zero issues, which is the
  shipped behaviour this criterion replaces `[stated]`
- **Injected fault — the summary is only as fresh as the write that minted it** (§8.4, §0.6). Write three
  trips; bump `SUMMARY_VERSION`; reopen the library. Assert: every row below the version is recomputed
  **from its own document**, the rewritten rows go through the ordinary chained write (the §4.3 structural
  grep still finds zero `ports.storage.*` mutations outside `chainOntoSaving`), the map does **not** claim
  to be complete while the rescan runs, and — the ceiling — a row is never computed from another row, from
  `AppState`, or from a document other than the one it is about `[stated]`

  *(**Revision 23 adds the half this was missing**, QA R26-6. As written it asserts only that a stale row
  is **brought current**, and never what that may **cost** — which is how a rescan that rewrote every
  document and moved every write fence passed it. The criterion gains: **a second store holding one of
  those trips open and idle is still `'idle'` after the pass, and its next keystroke settles without a
  `'conflict'`; the record's `StorageVersion` is unchanged, read through the port's own map and never
  asserted as a literal; and its document bytes are unchanged.** Injected fault, and it is the mutation
  whose absence let R26-6 ship: restore the `saveIfVersion` document rewrite in `runRescan` and this goes
  red while every clause above it stays green. §4.3 **A-30**.)*
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

**Added at revision 40, for step 2d.** Three criteria, and each is a ceiling rather than a floor:

- **A summary row is exactly what the allow-list says and no more.** `ROW_PATHS` is exactly the 24 leaves
  §8.4 **A-56** Part 6 transcribes, `ROW_KEYS` is exactly the 14 top-level keys A-33 Part 2 transcribes, and
  `ROW_PATHS.filter(countShaped)` is exactly the **eight** entries of `ROW_COUNT_FIELDS`. **Injected fault:**
  add `cities[].dayCount` to the minted row and every one of the three goes red — a count that could have
  been derived does not get to be stored, which is A-31 Part 6's rule with a value-shaped check behind it
  `[stated]`
- **No coordinate leaves the device's own storage.** Grep `fixtures/golden/*.json`, every emitted asset
  under `apps/web/dist/`, and the full output of every `cli.ts` command for a coordinate-shaped float pair:
  expect **zero**. Two new fields can violate this — `TripSummaryCity.centre` and `PhotoAsset.at` — and
  they share one assertion rather than having one each. **Injected fault:** print `centre` from
  `cli.ts stats` and the grep goes red `[stated]`
- **The photo subsystem is exercisable, and refusable, with no browser.** A-57 Part 7's **P1–P13** all run
  under `node --test` against `memoryPhotos()`, each is recorded with its measured result, and each was red
  before its fix. **Ceiling:** `npm test` and `npm run typecheck` are green with **no `package.json` diff
  and no lockfile movement** anywhere in the repo — which is A-58's *"no dependency"* verdict expressed as
  something a machine checks rather than something a reviewer remembers `[stated]`

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
**an empty `summaries` array**, which must give zeroes and empty arrays and never a throw · **one row
passed twice**, which must throw and name the id · **the same rows shuffled**, which must give a deep-equal
result · **a row with `startDate` `0001-01-01` and `endDate` `9999-12-31`**, which must not allocate a day
per day (A-31 Part 4 step 5 is a sweep for exactly this reason) · **two trips whose ranges are adjacent but
not overlapping** (one ends the 10th, the next starts the 11th), which must count every day once and not
merge into one interval that loses a day · **`today` equal to a trip's `startDate` and to its `endDate`**,
which are both `'active'` and both contribute exactly one day at the boundary · **a city named `'  '`, one
named with only an emoji, and two blank-named cities in different trips**, which must be `unnamedCities: 2`
and **zero** city rows · **the same city name attributed in one trip and `null` in another**, which is two
rows by design and is the one a tester is most likely to file as a bug (A-31 Part 5 residue 3 says why) ·
a participant list of 200 · two participants with the same
name and different ids, and the same id twice · a participant named `''` and one named with only an emoji ·
`kind:'self'` appearing twice, and zero times · coordinates at the poles, at the antimeridian, at exactly
`(0,0)` and inside a country's enclave · a stop in international waters · a city whose stops attribute to
two different countries (the FRA connect on a Vienna day) · a trip with no coordinate-bearing record at all
(the profile must say "no places yet", not "0 countries" as if that were measured) ·
**a trip whose only cities are on Vis and Hvar, each stating `countryCode: 'HR'`** (§8.4 A-29: the
coordinates are `null` at every scale and stay `null`, and the *row* must say `HR` from the cities' own
records — the case that mints `countryCodes: []` before I-6a) · **the same trip with `'hr'`, `'  HR  '`,
`'HRV'`, `'Croatia'`, `'ZZ'` and `'RE'`** (only the first two are admitted, and `RE` is refused on purpose —
A-29 Part 3) · **a Vienna city stating `'HU'`** (the coordinate wins; `HU` must not reach the lifetime map) ·
**two tabs over one storage, one of them idle with a trip open, while the other boots and rescans** (§4.3
A-30: no fence moves, no document is rewritten, and the idle tab's next keystroke does not raise a
conflict) · `SUMMARY_VERSION`
bumped mid-rescan with a write in flight · a library of 40 summaries where one document is corrupt (the map
must render the other 39 and say one is unreadable) · the reference trip evaluated at a `today` inside the
trip, on each of its 16 days in turn · **a trip whose cities are `東京` and `京都`, and one whose city is
named `Transit`, `''` or a single emoji** (§2.2 A-10) · **a conflict dismissed while the trip is live and
then left alone while the clock crosses `endDate`, opened, reopened, undone and redone** (§2.7 A-9 × the
retirement ledger) · and every Phase 1 attack in the list above, re-run.

**Added at revision 40, for step 2d.** A city whose days are **non-contiguous** — Vienna on day 1 and again
on day 12 — where `firstDay`/`lastDay` span the gap and must be read as a range and not as a stay · a day
listing **two** cities, so both claim it and the city ranges legitimately overlap (A-56 residue 1: no
surface may sum them) · a trip with cities and **zero days**, which is 2a's own past-trip output and is the
majority population of the thing being built · a stored version-4 row whose `cities` disagree with its
document, to prove the rescan reads the **document** · a `startDate` after `endDate` crossed with a city
range · a photo attached to a `stopId` that is then **deleted** · a photo attached to a `dayId` in a trip
whose day skeleton is then **re-minted** · **the byte stores emptied under a live trip** (eviction:
`availability` must read `'missing'`, `phase` must stay `'ready'`, nothing may throw and nothing may render
`'empty'`) · a 12-file import where files 2 and 7 are a **text file renamed `.jpg`** and a **truncated
JPEG** (10 assets, 2 named failures, import completes) · a `QuotaExceededError` on the 5th of 8 files (no
asset, no orphan, no partial document write) · **a HEIC file**, which is the expected iOS case and must
produce `unsupported_container` rather than a plausible wrong answer · an EXIF block with a
self-referential IFD offset, 65,535 claimed entries, a zero GPS denominator, `"0000:00:00 00:00:00"` and an
exact `(0, 0)` coordinate — **each must terminate, each must set `reason`, none may throw** · and a photo
whose caption is a booking reference inside a URL inside a sentence, through `redactForSample`.

### Explicitly not in Phase 2

No server, no accounts, no auth *enforcement* (the predicates still only define), no sync, no location, no
device. **No stop-level participants.** No trip invitations. No public profile. No goals or
achievements — §8.8 architects them as derived and this phase does not implement them. **No in-trip delete
control** (see the routed items below). No renumbering of anything in Phase 1.

*(**Revision 40 removes "no photos" from that list and replaces it with a narrower one.** Step 2d builds the
photo **record class** — §10, A-57. What this phase still does **not** build: library enumeration,
`suggestPhotoStops`, any suggestion queue, `place` attachment, photo bytes in an export, any non-JPEG
metadata reader, and **any photo screen at all** — no surface is scheduled while the visual direction is
unselected. `ARCHITECTURE.md` §7 carries each with its trigger.)*

*(**Revision 55 adds one more, and it is a deferral rather than a scope cut**, by Jacob's decision of
2026-09-04: **no participants editor and no *"people you have travelled with"* grouping** — **`I-10`**. The
same sentence above does the work: no surface is scheduled while the visual direction is unselected, and
I-10 is the last increment in this phase that needs one. **What this phase still ships is the whole of
`I-9`** — `Trip.participants`, its three build functions and their actions, its two validation codes, and
*participation grants nothing* proved by the §6.2 conformance double-run in plain Node. **What it does not
ship is the ability to enter or see a participant in the app.** I-10's entry is unchanged, is not
withdrawn, and carries its own trigger; **it does not block `I-11`**, and I-11's *Dependencies / blockers*
is where that is adjudicated. This is the same treatment **I-13f** already has, which is the precedent it
was written against.)*

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
| **A-1** — §8.1's provenance table claims `{source:'user', confidence:'asserted'}` for memory-entered travel; `model/provenance.ts:18` hardcodes `'confirmed'` and nothing produces `'asserted'`. ~~Plus: whether a day-city the past-trip form assigned (not the user) may stand as evidence in `travelStats`~~ | **architect** | §8.1 (the `travelStats` half is closed) | **The `travelStats` half is closed at revision 24, and the answer is that the question does not arise.** A-31 Part 4 fixes what `travelStats` reads: `row.countryCodes` and `row.cities[]`, both of which come from `trip.cities` and `trip.places` — **it never reads a day→city edge at all**, so an edge the past-trip form assigned rather than the user cannot stand as evidence for anything, because it is not evidence for anything. The city itself *is* the user's — they typed the name — and A-29 already rules on how much of that statement is admitted. **The provenance half stands and is unchanged: architect, §8.1, before any surface renders a confidence.** It no longer blocks an increment |
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

> **Narrowed at revision 40, and it is a narrowing rather than a cut.** Phase 2 step **2d / I-13** builds
> the **record class** this phase suggests into — `PhotoAsset`, manual import, storage, thumbnailing, the
> EXIF reader and the loading-state selectors (`ARCHITECTURE.md` **§10**). What remains here is everything
> that genuinely needs the phone: **library enumeration, native EXIF/location read, `suggestPhotoStops`,
> the suggestion queue, and the two non-engineering gates below.** Nothing in this phase's *reasoning*
> changes; it gains a foundation that has already been attacked. Two consequences worth naming: this phase
> no longer designs a data model under time pressure at the end of the roadmap, and `readExif` is
> **not** what native uses — `expo-media-library`'s `getExifAsync`/`getLocationAsync` are, which is
> **A-58** Part 4's argument for why the web parser never earned a dependency.

**Ships:** on-device library enumeration by trip window, EXIF/location read, `suggestPhotoStops` scoring in
core, a suggestion queue, and opt-in attach with EXIF GPS stripped on upload (§5.4). The association model
is §8.6 and it is deliberately narrow: one trip, at most one of a stop/place/day, optionally participants,
candidate until accepted — **and `place` attachment arrives with §2.13 A-6a's reference-counted delete,
which I-13 deliberately did not fire (`ARCHITECTURE.md` §7 and A-57 Part 3)**.

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
