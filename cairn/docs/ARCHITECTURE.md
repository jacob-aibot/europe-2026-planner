# Cairn — Architecture

Stage 1 output. Inputs: `cairn/docs/BRIEF.md`, Jacob's answers to the open questions (2026-08-24 and
2026-08-25), the root `CLAUDE.md`, and `europe-2026-itinerary.html` — the working proof of the format.

**Revision 2, 2026-08-25.** The Phase 1 review (`REVIEW.md`) sent five design defects back here. What
changed, and where: `Stop.travelRole` and the schedule rules that read it (§2.12); one geography
mechanism replacing two implementations (§2.13); the import and stop-copy contract, replacing
`forkTrip` (§2.14); sample-data redaction (§6.6); and, in `ROADMAP.md`, how an acceptance criterion is
allowed to be written. Every number in the new sections was measured against the live planner, not
reasoned about; the measurements are in the sections themselves.

**Revision 4, 2026-08-26.** QA round 4 found the round-3 fence fix correct but incomplete: two places
*upstream* of the fence still made the category error §2.2a was written to remove (R4-1, R4-2). Rather than
patch them where they surfaced for the third round running, the rule is now stated at the level it lives at
— **§2.2b, the freshness rule**, three clauses with a mechanical check each — and §2.2a, §2.9, §2.10, §2.14,
§4.2 and §4.3 are amended to it. §2.14 also carries the ruling on R2-11's `displayStatus` half, which had
been left to silence for two rounds.

**Revision 5, 2026-08-26.** The Phase 1 gate review (`REVIEW.md`, verdict SEND BACK) routed four rulings
here, none of them a redesign. What changed, and where: the copy path gets its row in the geography anchor
table and copied records stop producing blockers (§2.13, QA R2-9); the serialization chain's subject becomes
every `StoragePort` *mutation* rather than every *write*, so `delete()` goes on the chain too (§4.2 rule 6c,
§4.3, QA R7-3); the flush loop's bound is blessed at 5, named in the design, and its exhausted exit becomes a
refusal that shows on screen and re-arms the debounce (§4.2 rule 6a″, QA R6-1/R6-2); and §2.10's export
surface is settled at **69 runtime symbols**, derived by a stated principle rather than enumerated against
itself (QA R2-12, KD-19). §2.2 and §2.5 pick up three documented-shape drifts in the same pass.

**Revision 6, 2026-08-27.** QA round 8 falsified two promises revision 5 made, both on paths a user reaches
in four clicks. Two rulings, no redesign, and the engine still does not move. **A-5** (§2.7, §4.2 rule 5, QA
R8-1): retirement is *monotone metadata*, not document history — it lives in the document because it must
persist, and a **retirement ledger** outside `history` re-asserts it after every snapshot restore, so undo
reverts the user's edits and never the bookkeeping. **A-6** (§2.13, QA R8-2): revision 5's *"Places need no
row of their own"* paragraph is **withdrawn** — its premise (an unrecognised `cityKey` yields `nearest ===
null`) is false for any trip with a `homeBase`, which is the field §2.13 itself added, so a copied `Place`
mints a blocker. A place whose only referents are copied stops is now exempt, derived at evaluation time
with **no change to `Place`'s shape**. §2.10 moves 69 → 70 runtime symbols as a mechanical consequence of
A-5, and for no other reason. **A-5a** (§2.7, BUILD-NOTES KD-36) is an addendum to A-5, not a new ruling: the
builder objected — with a reproduction — that A-5's absorb step re-acquires a released id from the retired row
the document still carries, which makes a *second* dismissal stillborn. Upheld. The ledger may now acquire a
`conflictId` from a document only when that document holds no live row for it, at **both** the reseed and the
absorb, and everything else about A-5 stands.

**Revision 7, 2026-08-27.** QA round 9 verified A-5, A-5a and A-6 and found one adjacent door open on each,
both user-reachable, both the same defect the ruling was written to close reached one action further along.
Two addenda, no redesign, no change to any engine. **A-5b** (§2.7, QA R9-1): `redo` releases the ledger too —
the release list goes from two `dispatch` action types to three sites, and because history stores snapshots
and not actions, `redo`'s release keys off the document delta (a row count that rises for a `conflictId` is a
redone `resolveConflict` and nothing else). A uniform veto rule *cannot* work here and the addendum proves
it. `undo` is unchanged and must stay unchanged. **A-6a** (§2.13, QA R9-2): A-6 clause 1 stands — 60 of the
reference trip's 94 coordinate-bearing places are orphans and `place-68` is one of them, so exempting orphans
would delete two thirds of the rule's detection — and instead `removeStop` prunes the one `Place` a copied
stop leaves with no referent. `Place`'s shape still does not change, `packages/client` does not change, and
§2.10 stays at 70 runtime symbols.

**Revision 8, 2026-08-27.** The Phase 1 gate re-review (`REVIEW.md`, SEND BACK) routed **one** ruling here
and nothing else. **A-7** (§2.2a, §4.2 rule 4a, QA R11-1): a successful write whose document the store
*declines to install* was still advancing `savedDoc` and `savedVersion` to it and re-arming the debounce, so
the user's next autosave wrote an un-merged document over another writer's saved work with the fence's
blessing and the chip on *Saved*. The fence and the document it stands for move **together or not at all**;
the merged write is the one site in the system where they can come apart, the exposure is the whole of
`doMerge` rather than the write, and the merge refuses rather than rebasing. No engine, no persisted shape,
no export surface and no autosave behaviour moves. R8-3, R8-4 and R10-1 are **not** adjudicated by this
revision.

**Revision 9, 2026-08-27.** Phase 1 shipped (`REVIEW.md`, verdict SHIP, `b32ef9a`) and Jacob gave the
product thesis in full. This revision is **additive**: a new **§8** carries the travel-history model — the
trip lifecycle, past trips, participants, geography attribution and the lifetime map — and states what the
location, photo and social phases must be able to land on. **No Phase 1 section changes behaviour.** Three
smaller things ride with it: **A-8** (§2.7, QA **R10-1**) blesses A-5b clause 2 and closes the last carried
MINOR; every rule in §2.7 gains a **class**, ruled in §8.2 (a feasibility rule does not
run on a day that has passed — the reference trip is itself in the past as of today, and the app has been
telling Jacob his finished trip is missing a hotel); and §4.2's `TripSummaryRow` comment is corrected to the
shipped shape. **R8-3 and R8-4 are still not adjudicated** — `ROADMAP.md` names the phase and the trigger
for each.

**Revision 10, 2026-08-27.** Jacob followed the thesis with one clarification: Cairn should eventually track
**meaningful physical travel distance by mode** — air, train, road, walking, cycling, boat — and must keep
three things visibly apart: physical distance, *planned* distance, and airline loyalty rewards. That is a
model decision, so it is taken here rather than in the phase that first wants a number. New **§8.10**: four
provenance bases (`verified` / `observed` / `derived` / `planned`) that may never be summed across, a
`Journey` record class that is the movement counterpart of §8.5's `Visit`, a bundled airport index on the
same mechanism as §8.4's country index, the definition of a *verified* flight endpoint measured against the
model as it actually is, and a per-mode phase schedule. §8.8's blanket mileage deferral is **superseded, not
reversed** — a distance derived from a plan still never counts. **Nothing in §8.10 is Phase 2 scope and
nothing in it is implemented by this revision**; the mechanical consequences are three one-line deliverable
additions in `ROADMAP.md` (phases 4, 5b and 7) and no new phase. Airline loyalty miles are **out of scope and
unscheduled** — §8.10.7 says why, and why that is not the same kind of "no" as §8.8's refusal of live presence.

**Revision 11, 2026-08-27.** QA round 12 — the first adversarial pass over Phase 2's **2a** slice — routed
**two** design findings here and nothing else. Both are addenda; no engine, no phase and no persisted shape
moves. **A-9** (§2.7, §8.2, QA **P2-1**): §8.2's feasibility gate gave a conflict a second way to leave the
detected set, and `syncResolutions` — which has read *"absent"* as *"the user fixed it"* since revision 1 —
retired every dismissal on a trip the moment the **clock** passed its end date, with no user action, a
`revision` bump and a scheduled write. Retirement is a claim about the document; the gate is a claim about
the user's attention; they may not read the same set. `syncResolutions` becomes `(trip, at)` and detects the
**un-gated** set itself, so no caller can hand it the wrong one, and `unbooked_ticketed`'s open-coded copy of
the gate is deleted. The retirement ledger (A-5/A-5a/A-5b/A-8) is **not** reopened and does not change.
**A-10** (§2.2, §8.1, §8.4, QA **P2-2**): the trip forms' `[^a-z0-9]` slug maps every non-Latin city name to
the single key `"-"`, so 東京 and 京都 are one city and nothing validates it. Human-readable city keys were
never an invariant — the audit is in the addendum — so a `CityKey` becomes a minted opaque id like every
other id here, cross-trip city identity is derived from the normalised **name** (§8.3's precedent), and
`validateTrip` gains three codes. No migration and no `schemaVersion` bump: `CityKey` was, and stays,
`string`. The mechanical consequences in `ROADMAP.md` are two new increments (**I-3a**, **I-4a**) and one
widened field in I-6.

**Revision 12, 2026-08-27.** QA round 13 — the mandatory breaker pass over I-3a/I-4a — routed **four**
design findings here: code faithful to revision 11's rulings, whose *reasoning* has a hole. Four addenda; no
redesign, no engine, no persisted shape, no `schemaVersion` bump and no movement on §2.10's export surface.
**A-11** (§2.7, §8.2, QA **R13-1**): A-9 kept `unbooked_ticketed`'s far-future horizon on an argument it
states in its own text — *"as a clock advances `delta` only shrinks"* — which is true only of a **monotone**
clock, and the clock this product ships is the device's **local civil date**, which steps backwards on a
westward flight or a corrected device clock. One step back across the 60-day boundary permanently retires a
live dismissal. The horizon moves out of `rule.run` into the gate where `detectUngated` can disable it, and
A-9's greppable invariant is replaced by the property retirement actually needs: **the un-gated set's ids are
a function of the document, never of the clock**, asserted by a sweep rather than by a grep. **A-12** (§2.7,
QA **R13-3**): A-9 point 1's *"a crash can never be the thing that retires a resolution"* is false — the
`catch` replaces a crashing rule's **whole** output with one note, and every real finding it would have
produced leaves the un-gated set with it. A crashed rule's contribution is **unknown, not absent**:
`syncResolutions` retires nothing on a detection in which any rule threw, and A-9 point 1 becomes true by
mechanism instead of by assertion. **A-13** (§2.7, QA **R13-2**): A-9 assertion 4's literal mechanism —
extend `endDate` so a gated finding returns — is **not achievable for any rule Phase 1 has**, and the reason
is structural rather than a builder's shortfall. The assertion is rewritten to the mechanism that does test
its harm, and the structural reason becomes a tripwire test so the literal case is written the day it becomes
possible. **A-14** (§2.14, §2.2, QA **R13-6**): A-10's *"what this changes elsewhere — the complete list"*
missed `copyStopInto`. A `CityKey` is **trip-relative filing, not a property of a place**, so it may not cross
a trip boundary unchanged: a copied place is re-filed against the target's own cities by normalised name, and
a place that cannot be filed **does not travel** — the stop keeps its coordinate inline. The mechanical
consequences in `ROADMAP.md` are I-3a's and I-4a's ship gates and nothing else: **no new increment, no change
to the phase order.**

**Revision 13, 2026-08-27.** QA round 14 — the mandatory breaker pass over A-11…A-14 — closed three of the
four and routed **three** findings back here: one BLOCKER and two holes in revision 12's own reasoning.
Three addenda; no redesign, no engine, no persisted shape, no `schemaVersion` bump, no movement on §2.10's
export surface. **A-15** (§2.14, §6.6, QA **R14-4**): rule 4 hands the referenced `Place`'s `note` and
`links` across the trip boundary **unredacted**, two lines after rule 5 redacts the *stop's* note — a door
PIN, a confirmation number, a voucher URL and a mailbox address all land in the recipient's document. This
is the unfixed half of round 2's BLOCKER R2-3, and the root cause is an asymmetry rather than a missed
line: the sample path (§6.6) **fails closed** — a deep walk redacts every string not under a structural key
— while the copy path is field-by-field with no default and therefore **fails open** on every field nobody
listed. A copied `Place` is sanitised field by field against a table that names all eight of them, and the
key set is asserted, so the next field added to `Place` cannot travel un-classified. **A-16** (§2.14, QA
**R14-2**): A-14's closing claim *"copying within one trip is unchanged"* is false — `refileCityKey` re-files
by name unconditionally, so on a trip legitimately holding two cities of the same name (A-10 blesses that) a
within-trip copy silently re-files onto the wrong one and writes a duplicate place row. A-14 stands; what it
missed is that **re-filing is a derivation, and a derivation is only for when the document has not already
answered.** The source's own key wins when — and only when — the source *is* the target document and the
target still holds that key. **A-17** (§2.7, QA **R14-1**): A-11 assertion 5's *"provably output-neutral"*
proof assumes a stop id is unique per document; on a `duplicate_id` document (a `validateTrip` **error**
that `fromJSON` still accepts) the horizon leaks. The claim is **narrowed to documents `validateTrip`
accepts** rather than threading a subject date through the rule contract — the document is the resource that
states when a stop is (§0.6), a rule carrying its own copy of that date is the category error §0.6 names,
and the divergence is over-reporting only. The `Rule` contract gains one standing obligation that keeps that
direction true for the *next* rule to declare a horizon, and one directional test. The mechanical
consequences in `ROADMAP.md` are I-3a's and I-4a's Built/Verification/Ship-gate lines and nothing else:
**no new increment, no change to the phase order.**

**Revision 14, 2026-08-28.** QA round 15 — the breaker pass over A-15/A-16/A-17 — confirmed A-16 and A-17
and attacked A-15's own direction argument, which held for `Place` and failed twice at other depths. Two
addenda, both in §2.14; no redesign, no engine, no persisted shape, no `schemaVersion` bump, no movement on
§2.10's export surface. **A-18** (§2.14, §6.6, QA **R15-3**, BLOCKER): the copied **stop** spreads its own
`cost` and `arrival`, so `cost.note` (*"paid with card, conf 5814731574"*) and `arrival.label` (*"Bus 8,
booking GYGG45MLA9Q9"*) cross the person boundary verbatim while §6.6's sample path redacts both — A-15's
*"sample fails closed, copy fails open"* asymmetry, one record **inward**. The general fault is that **a
field list is only exhaustive down to the depth it recurses**: rule 5 named `arrival`, and `arrival` is a
record, not a string. So the ruling is stated once for every record the copy writes — **no spread of a source
record at any depth** — with `costForCopy`/`arrivalForCopy`, a cast-free `redacted()` helper replacing every
`as string` in the file, and four key-set assertions so the next field added to `CostEstimate` or
`MoveOverride` cannot travel un-classified. `cost.display` is the one field that takes a third answer — it is
a price *and* a text box, so it crosses only when redaction leaves it byte-identical and is `null` otherwise,
where `costLabel` fills the hole from `amounts`. **A-19** (§2.14, §2.2, QA **R15-6**, MINOR): a
`{kind:'pool'}` placement's `cityKey` reaches the target unchecked and mints an uncleanable
`pool_stop_unknown_city`. It is **not** re-filed like `Place.cityKey`: a placement is an *argument about the
target*, the caller holds the target, and A-16 established that name-derivation is only for when the primary
answer is missing. It is validated exactly as `placement.dayId` already is (with `TRANSIT_CITY_KEY` the one
honest answer a caller with no city can give), the placement is rebuilt field by field — closing an alias
R14-3's sweep missed — and a stale `hint.dayId` is dropped rather than refused. The mechanical consequences
in `ROADMAP.md` are I-4a's Built / Verification / Ship-gate lines and nothing else: **no new increment, no
change to the phase order.**

**Revision 15, 2026-08-28.** QA round 16 — the breaker pass over A-18/A-19 — closed the whole R14/R15 chain
and left exactly one thing for an architect: a builder-added `IssueCode` with no ruling behind it, and the
design question underneath it. **One addendum, in §2.9**; no redesign, no engine, no persisted shape, no
`schemaVersion` bump, no movement on §2.10's export surface. **A-20** (§2.9, §2.14, QA **R16-2**):
`parsePlace` casts `hours` through unvalidated — the one field of that hand-rolled parser that is not
structurally checked — and that single gap produced **both** R15-1 (a credential crossing a person boundary
inside `hours.weekly`) and R15-2 (`copyStopInto` throwing on shapes `fromJSON` accepts). The two
compensating guards were then written independently, in one commit, and **diverged**: three `weekly` shapes
the copy silently drops are shapes `validateTrip` calls well-formed, so the warning added to say *"your
hours did not survive"* does not fire on the documents it was added for. The parser is where a document's
**shape** is decided in this system — `isoDate` refuses `'2026-13-4x'` while `invalid_calendar_date`
*reports* `'2026-13-45'`; `oneOf` refuses an unknown enum while `duplicate_city_key` *reports* a legal
one — so `hours` is validated at parse time exactly like every other field, and **one predicate in
`model/openingHours.ts` becomes the only definition of a well-formed `OpeningHours` anywhere in the repo**,
shared by the parser, `validateTrip` and the copy boundary. `place_hours_malformed` is **ratified**, with
its meaning narrowed to what it now is: *this in-memory document holds hours `fromJSON` would refuse* —
which is also the warning that precedes an export that will not re-import. §2.9's printed code list picks
up A-10's three codes, which it has lagged by since revision 11, in the same sweep. The mechanical
consequences in `ROADMAP.md` are I-4a's Built / Verification / Ship-gate lines and nothing else: **no new
increment, no change to the phase order.**

**Revision 16, 2026-08-28.** QA round 17 — the breaker pass over A-20 — closed A-20, R16-1 and R16-2 and
routed **one** finding back here, because the defect is in the ruling's own printed function body rather
than in the code that implements it. **One addendum, in §2.9**; no redesign, no engine, no persisted shape,
no `schemaVersion` bump, no movement on §2.10's export surface. **A-21** (§2.9, §2.14, QA **R17-1**): A-20
Part 1 prints `isWeeklyEntry(v): boolean`, so **the read that is validated and the read that is used are two
different reads of the same field**. For a plain data object they are equal, which is why A-20's argument
held; for an **accessor property** they are not, and `weeklyForCopy` — which reads `open` four times —
validates `'09:00'` and copies a door PIN into the recipient's document, R15-1's exact harm on the boundary
A-18 was written to close. The answer is not a fourth guard around `hours`: a predicate over a compound
value **returns what it read** (`readWeeklyEntry(v): WeeklyRead`), and every field of a caller-supplied
record is read **once**, into a `const`, which everything downstream then tests, redacts, compares and
emits. Searching the module family for the same shape found **seven more sites in six functions the finding
did not name**, all previously unfiled and all measured: `cost.display` leaks a credential by the identical
mechanism, `copyStopInto` **aliases** the source's own `PlaceLink` into the target for an out-of-union
`kind` (no accessor needed at all), and a flipping
`weekly` makes `isOpeningHours`, `hoursForCopy` and `toJSON`'s `hours()` each throw a raw `TypeError` — out
of a predicate documented *"throws nothing"*, out of `validateTrip`, and out of an export, all three of
which §2.1 forbids. What A-21 explicitly does **not** close is named rather than left to be re-found:
across **two** traversals (`validateTrip` at T1, `toJSON` at T2) no discipline inside either can make an
unstable document consistent, so R17-1's second face is narrowed, not closed, and the two mechanisms that
would close it (freeze the document at every entry point; round-trip the export text) are both costed and
refused with a trigger. **A-21a** (§2.9, BUILD-NOTES) is an addendum to A-21, not a new ruling and not a new
revision: the builder objected — with a reproduction — that Part 4 claims a **total**, file-wide rule while
its own printed block exempts A-14/A-15/A-16's place logic as *"verbatim"*, and that block still reads
`original.at` three times and still throws `Cannot read properties of null` out of `copyStopInto`. Upheld,
and re-derived here: *verbatim* meant *A-14/A-15/A-16's rules are unchanged*, never *exempt from Part 4*.
`original.cityKey`, `original.at` and `original.name` are read once each into `const`s ahead of every use;
the one surviving double read — `placeForCopy` re-reading `name` and `at` on the reuse-miss path — is
bounded, measured (a duplicate `Place` row; never a leak, never a throw) and kept deliberately, because
closing it would break A-15's *"every field of `Place` is classified in one function"*. The mechanical
consequences in `ROADMAP.md` are I-4a's Built / Verification /
Ship-gate lines and nothing else: **no new increment, no change to the phase order.**

**Revision 17, 2026-08-28.** QA round 18 — the breaker pass over A-21/A-21a — confirmed both rulings are
faithfully built (7 flip points, 0 leak, 0 throw; A-21a's read-count table re-derived exactly) and falsified
the one claim they rest on: that the search was **exhaustive**. A mechanical read-count census over the
shipped control flow found **six** more fields of caller-supplied values read more than once, in the same
file. Two addenda, both in §2.9 beside A-21; no redesign, no engine, no persisted shape, no `schemaVersion`
bump, no movement on §2.10's export surface. **A-22** (§2.9, §2.14, QA **R18-1**…**R18-5**): four of the five
are mechanical applications of rules already written — `source.trip` read **five** times, so the stop is
copied out of one document while `provenance.origin` credits **another** (§2.14 rule 7, the credit every view
renders beside the badge); `src.id` tested by the `find` predicate and then emitted as `origin.sourceStopId`;
`srcPlace.at` read twice in the `kind:'inline'` branch, which is A-21a's defect in the sibling branch of the
same `if`, printed inside A-21's own body; and `samePlace` reading the **recipient's own** row up to three
times, throwing a raw `TypeError` out of core because of what the *target* document contains (§2.1, R15-2).
The fifth needs new reasoning, because what is wrong is A-21a's own printed bound: the accepted exception is
stated over `original`'s **fields**, and one level down `original.at.lat` was read **N+1** times with N
controlled by the *recipient's* document, producing a **hybrid** coordinate rather than the disclosed
duplicate row. It is restated at scalar granularity and **restored** — the reuse probe carries a clone of the
coordinate, so two is the ceiling again at every level and independent of the other party's document, with
`samePlace`, `placeForCopy` and A-15's single classification point untouched. The `ctx` trio round 18
recorded as inert is fixed with them, because its harmlessness is a property of `addStop` and not of this
function. **A-23** (§2.9, §2.14) is the ruling this revision cares most about: the read-once rule stops being
checked by the next reviewer's eyes and becomes a **standing census test** in
`packages/core/test/readOnce.test.ts` — counting accessors over every field of every caller-supplied record,
recursing into nested records, covering the recipient's rows as well as the source's, across a specified
ten-scenario matrix, with a five-entry allow-list every entry of which must be exercised or the suite goes
red. A-21 said the mechanical check would be needed *"the day the file stops being small"*; the file did not
grow and the search failed anyway, so the correct trigger is **recurrence**, and this file has produced a
finding in five consecutive rounds. Verified both ways before being written down: red on the shipped tree,
naming all five findings; green with A-22 applied. The mechanical consequences in `ROADMAP.md` are I-4a's
Built / Verification / Ship-gate lines and nothing else: **no new increment, no change to the phase order.**

**Revision 18, 2026-08-28.** QA round 19 — the mandatory breaker pass over A-22 and A-23 — confirmed that
**A-22 is faithfully and completely built** (every named site fixed, every named mutation red, the `ctx` trio
caught by the census and by nothing else) and that **A-23's mechanism works**: 20 planted read-once defects
inside its roots, all 20 red, fourteen of them invisible to `copyStop.test.ts`, twelve of them in functions no
ruling has ever touched. What it falsified is not the mechanism but **three lines of A-23's own
specification** — the `opaque` set, the scenario matrix and the fixture's field list — each in the same shape
as the failure A-23 exists to end: *a ruling printed a claim about its own reach, and the reach was smaller.*
One ruling, no redesign, no engine, no persisted shape, no `schemaVersion` bump, no movement on §2.10's
export surface (**71**). **A-24** (§2.9, §2.14, QA **R19-3**…**R19-6**): the census's `opaque` set narrows
from *the whole `Trip`* to *the `Trip`'s six collections*, so `Trip.id` and `Trip.ownerId` — which cross the
person boundary verbatim into `provenance.origin`, and are therefore the opposite of the *"document
skeleton"* A-23 called them — are censused like any other value, and R19-1 becomes a red test rather than a
sixth consecutive hand-found defect; the ten-row matrix gains **four** rows for four ordinary document shapes
it never built (`placeForCopy`'s `at === null` arm, which row 5's own reuse branch short-circuits past;
A-16 step 2, the same-document copy §2.14 says Phase 1 exercises; `findAnywhere`'s pool arm; and a stop with
its optional fields *absent*, since A-23 only ever measured a maximal document); `Stop.ticket` joins the
fixture and rule 3's fixture covers **all three** `Ticket` kinds, because *"no ticket travels"* is a claim
over the union and a kind-gated regression was invisible to both files; and A-23's printed `srcPlace.at.lat
×3` is corrected in place to **×4**. Two allow-list entries are added and both are **irreducible structural
counts** rather than blessed judgment calls — the rule that separates them from a defect is stated in Part 1
and is measured, not argued. The mechanical consequences in `ROADMAP.md` are I-4a's Built / Verification /
Ship-gate lines and nothing else: **no new increment, no change to the phase order.**

**Revision 19, 2026-08-28.** QA round 20 — the mandatory breaker pass over A-24 — is the first round of this
arc whose findings are **almost entirely about the guard rather than the guarded code**, and that is the
result, not the caveat. The census now catches its own subject: 22 further document shapes produced **no**
eighth multi-read in `copyStop.ts`, all **143** of the reference trip's real stops copy with zero throws and
zero credential crossings, and A-24's two-sided acceptance check reproduces exactly. What round 20 falsified
is A-24's own *maintenance* clause — *"the fixture populating every field of both records is part of this
contract"* was a sentence with nothing behind it, and the ruling that wrote it created a second instance of
the gap it describes (`Trip.meta` absent, `Trip.homeBase` `null`) — plus one narrow new product site.
**A-25** (§2.9, §2.14, QA **R20-1**…**R20-5**) is one ruling in six parts, all of it measured rather than
argued: fixture completeness stops being prose and becomes a **compile-time key-set map plus a runtime
key-set assertion plus a declared-nulls list**, in the idiom `copyStop.test.ts` has used since A-15, so the
next field added to `Stop`, `Place`, `Trip` or `City` cannot be invisible to the census; `City` **rows**
become census roots, because A-24's trigger was written about the wrong verb (a value that **decides where a
crossed record is filed** is in scope exactly as one that crosses is — R18-4 is the precedent); one hoist in
`refileCityKey`'s step-4 fold closes R20-3; a fifteenth matrix row builds the three same-named target cities
no row built; A-24's residue disclosure is **corrected and completed** from a fully-opened census; and the
arc is **declared closed for I-4a's ship gate on a written criterion**, with the remaining residue named and
bounded rather than left to a ninth round. `reindex`'s `placement` multi-read is ruled **out of scope** with
a reason and a trigger, in the same shape as A-21 Part 3's `toJSON` boundary. No redesign, no engine, no
persisted shape, no `schemaVersion` bump, no movement on §2.10's export surface (**71**). The mechanical
consequences in `ROADMAP.md` are I-4a's Built / Verification / Ship-gate lines and nothing else: **no new
increment, no change to the phase order.**

**Revision 19, corrected in place, 2026-08-28 — no revision 20, and here is why.** QA round 21 ran A-25 Part
6's criterion and reports **all six clauses HOLD** at `020ee37`, with a fresh 22-shape adversarial pass
finding nothing that meets the re-opening condition. **The arc is closed.** Its one finding, **R21-1**
(MINOR), is the output of clause 6's own assigned re-derivation: Part 5's class-A residue was complete by
*class* and short **three instances** (`tgtTrip.cities.<n> ×2`, `tgtTrip.pool ×2`,
`tgtTrip.days.<n>.stops.<n> ×2`), all containers or rows of the recipient's own document, all measured to be
the already-accepted class. Those three are now written into Part 5 and Part 6 records that the criterion was
met. **This is an in-place correction, not a new revision**, on the A-21a precedent rather than the A-22 one:
a revision number in this document means *the contract moved and you must re-read* — and nothing moved. No
rule, no `ALLOWED` entry, no `max`, no root, no matrix row, no gate, no code, no test, no `qa/` file; a reader
who has read revision 19 remains correct without re-reading. What distinguished A-22 was **new normative
content** (four sites closed, a read-count table superseded); a QA round having intervened is not by itself
the distinction, because this particular round's finding is the *execution of a step revision 19 scheduled
for it*. Round 21's optional suggestion of two extra matrix rows is **declined**, with the reasoning in
Part 5.

**§8.4's Natural Earth citation, corrected in place, 2026-08-28 — still revision 19, and here is why.**
I-5's one external dependency was checked before the increment started, as `ROADMAP.md` requires, and the
host revision 9 cited is **blocked by this environment's egress proxy**. The citation now records the source
actually used — the same dataset, at the same scales, from Natural Earth's own repository, pinned to
`v5.1.2` — with the identity, scale and licence each re-verified from content rather than inherited. **No
contract moved**: not `countryOf`, not the injected index, not `null`-as-a-first-class-answer, not the
size-budget-measured-by-the-generator rule, not the correctness floor that decides the scale, and not one
line of I-5's spec in `ROADMAP.md`. A reader who has read revision 19 remains correct without re-reading;
what changed is which URL the word *verified* points at, and a provenance note is not a redesign. **Not
escalated to Jacob**, and deliberately so: the licence is unchanged (public domain either way), the privacy
posture is unchanged (still a bundled dataset, still no network geocoder, §6.1 untouched), and the product
behaves identically. Escalating which HTTP host serves identical public-domain bytes would be escalating an
environment detail dressed as a design question. **What would have been a blocker** — and would have stopped
for Jacob rather than been routed around — is a *lower-resolution substitute*, a *different dataset*, an
*unverifiable licence*, or hand-typed polygons. None of those is what happened.

**Revision 20, 2026-08-28.** I-5 shipped the country index and the builder disclosed, as **BUILD-NOTES
KD-51**, that §8.4's *correctness floor* prescribes a remedy the data does not support: the two Dalmatian
records ROADMAP's exit criterion 4 requires to attribute to **HR** are `null` at 1:110m, and escalating to
1:50m or 1:10m — the floor's stated mechanism — leaves them `null` while making every other number worse.
He was right to route it and right not to work around it. Investigating it found the routed defect and a
larger one underneath. **One ruling, in §8.4: A-26.** Three parts. (1) The two islands are a **dataset gap,
not a resolution problem** — Biševo, Budikovac and Lokrum have no admin-0 polygon at *any* scale in the
pinned family (nearest Croatian ring at 1:10m: 4.26 km, 2.75 km, 1.87 km) — so exit criterion 4's island
clause is **withdrawn as factually wrong**, `null` is ruled the correct answer for them, and the criterion is
rewritten to the property that actually discriminates a good index from a bad one. (2) The floor's
*escalate-one-step* mechanism is **withdrawn** and replaced by *measure the whole family*; 1:110m stays the
base, now for a stated reason rather than a score. (3) The finding's smaller half is the larger defect: at
1:110m the index carries **175 ISO codes and is missing 64**, including Malta, the Maldives, Mauritius, the
Seychelles, Macao, Hong Kong, Singapore, Bermuda, the Faroes, Cape Verde and Bahrain — **8 of them come back
as the wrong neighbour** (AD→FR, GI→ES, HK→CN, LI→AT, MC→FR, SG→MY, SM→IT, VA→IT) and the other 56 are
unreachable. A lifetime map that can never say *Malta* is broken in a way the reference trip cannot show.
The answer is a **mixed-resolution index** — 1:110m base plus the 1:10m polygons for exactly the codes the
base omits, emitted in the order `countryOf` must test them — measured at **239 codes / 892 rings / 20,702
points / ~343 KB packed**, against 9.07 MB for a wholesale escalation. **`countryOf` does not change**: no
distance function, no buffer, no snapping. The mechanical consequences in `ROADMAP.md` are a rewritten exit
criterion 4, an amended I-5 and **one new increment, I-5a**, owed before I-6. No engine, no persisted shape,
no `schemaVersion` bump and no movement on §2.10's export surface (**71**).

**Revision 21, 2026-08-28.** QA round 22 — the first adversarial pass over the geography surface — found
I-5 and I-5a sound in every respect it could measure *except the one decision A-26 took without measuring*.
Three findings route here and are answered by one ruling, **A-27** in §8.4. (1) **R22-1 (MAJOR).** A-26
Part 4 fixes the fill at the family's **finest** layer by fiat — the layer A-26 **Part 2** measured and
rejected for the base, because a fine ring tracks the waterline and drops the shoreline coordinates travel
data is made of. The breaker measured the consequence: capitals of filled countries returning `null`. I
re-derived it and then tested the remedy the finding gestures at — per-code scale *selection* — and
**falsified it**: at 1:50m the Maldives goes from 176 rings to 2, the Seychelles 26 → 1, French Polynesia
88 → 21, Tonga 10 → 3. Choosing a scale per code buys a capital and pays with an archipelago. So the ruling
is not *which* scale but *why this is a choice at all*: **a filled code ships both — the finest scale for
coverage and the coarser one for forgiveness, as two entries under one ISO code.** `countryOf` returns on
the first *entry* that contains the point and even-odd runs *within* an entry, so two entries give union
semantics with holes intact, **`countryOf` does not change, and neither does any behaviour in
`packages/core`.** Non-regression is structural, exactly as A-26 Part 4's was: every ring shipped today is
still shipped. Measured: **293 entries / 239 codes / 1,034 rings / 369,688 packed (+7.8 %)**, 54 forgiveness
entries, 10 codes correctly refused one, and over 14.9 M cells at 0.02° — **704 `null` → a country, 0 worse,
0 changed country.** (2) **R22-3.** Two sentences in `derive/country.ts`'s docstring were made false by
A-26; A-27 Part 8 carries their replacements verbatim and lifts A-26 Part 6 item 3 far enough for a builder
to paste them. (3) **R22-6.** The index is 36.4 % of the web bundle with no consumer until I-6. Accepted,
bounded and recorded — A-27 Part 9 — because I-6 puts the index on the *write* path, where §0.6 forbids the
async boundary a lazy import would need. `ROADMAP.md` carries this as **I-5b**, owed before I-6.

**Revision 22, 2026-08-28.** QA round 23 attacked I-5b on four axes and broke one: **A-27's own filter 2**.
Three findings route here and are answered by one ruling, **A-28** in §8.4, read *with* A-26 and A-27 and
never instead of them. (1) **R23-1 (MAJOR).** A-27 Part 4's filter 2 compares a candidate ring against
*"every other entry of the coverage-only index"* — and A-26 made that index **mixed-resolution**, so 175 of
its 239 entries are drawn at 1:110m. Macao's 1:50m ring was checked against China's 1:110m coastline, which
is generalised kilometres inland of the Pearl River delta, passed, and **took ≈22.1 km² of Guangdong** —
bigger than Macao. A-27's own list of filter-2 rejects is short by one, and the reason neither the builder's
verification nor mine caught it is worth carrying forward: **every sweep compared the index against itself,
and a wrong answer of this class is only visible against a third source.** The remedy is *not* to replace
the population with the finest layer: measured, that admits `HK`'s two outlying-island rings and `SG`'s and
moves **23 cells `CN`→`HK` and 42 `MY`→`SG`**, the exact class A-27 Part 3 property 2 declares impossible.
So filter 2 becomes **two arms** — 2a against the shipped index (non-regression), 2b against each
neighbour's finest drawing (truth) — and **all 153 candidate rings against all 239 codes** say the two arms
disagree on exactly four rings, `MO` being the only one in the harmful direction. Filter 1 carries no
instance of the class, by construction, with the trigger written down. (2) **R23-2.** The predicate's two
*"arithmetic mean of the vertices"* probes are removed and *"exact for simple rings"* is restated as the
theorem it is; 0 of 153 decisions change, re-verified under the **new** filter. (3) **R23-4.** ROADMAP's
*"`node --test packages/core` still runs directly … and the budget test is still the first test"* attaches
two facts to one command that demonstrates only the first; each is re-pointed at the command that proves it.
Measured outcome: **292 entries / 239 codes / 1,033 rings / 369,524 packed**, 53 forgiveness entries, 11
codes correctly refused one, and a 17.9 M-cell sweep in which the *whole* delta from the committed artefact
is 5 cells of `MO` reverting to `null`. **No engine, no persisted shape, no `schemaVersion` bump, no
movement on §2.10's export surface (71), and exactly one hand-written number in `packages/core`** —
`countryIndex.ts`'s forgiveness census, 54 → 53, corrected 2026-08-28 per QA R24-1; A-28 Part 7 item 3
carries the note. `ROADMAP.md`
carries this as **I-5c**, owed before I-6 for the third time and for the same reason.

**Revision 23, 2026-08-28.** QA round 26 attacked **I-6** — the widened `TripSummaryRow` and the
`SUMMARY_VERSION` rescan — found the write path sound and the bookkeeping around it wrong in four places,
and routed **two** of its six findings here. Both are answered, in two rulings that live in two different
sections because they are about two different things.

(1) **R26-5 → §8.4 A-29.** `tripSummary` derives `countryCodes` from coordinates only, so a trip whose
cities are on Vis and Hvar — landforms A-26 Part 1 measured as absent from the dataset at *every* scale, and
correctly `null` — mints `countryCodes: []` while its own `City` records say `HR`. §8.4 clause 1 rules on
attributing *a coordinate*; it had nothing to say about a country the document already **states**. Ruled:
a city's stated `countryCode` is admitted **where the coordinate cannot answer, never over it**, through a
total four-step gate whose last step is *the shipped index must carry the code* — because §8.4 clause 3's
second consequence draws the lifetime map from that index's own rings, so a code the index cannot draw is a
country the map cannot fill. `TripSummaryCity` gains `countrySource: 'coordinate' | 'stated' | null`, so
the blend is legible rather than silent, and `SUMMARY_VERSION` goes to **3**. Measured on the reference
trip: **all six cities' stated codes equal their derived codes, so `countryCodes` does not move** — the same
non-regression check A-26, A-27 and A-28 each leaned on. Three residues are named, one of them the
disagreement case, with the trigger that reopens it written down.

(2) **R26-6 → §4.3 A-30.** Bringing a row current means `saveIfVersion(id, v, toJSON(doc), summary)` — a
full document rewrite, byte-identical to what storage already held, purely to move the summary — which
**mints a new `StorageVersion` and therefore knocks another tab holding that document into a conflict with
nothing to merge**. The defect is not the byte-identical write, it is that *a summary refresh moves the
document's fence*, and that is true of every rescan write including the necessary ones. Ruled: the fence's
meaning is stated once — **equality of `StorageVersion` asserts that the document bytes have not changed,
and asserts nothing about the summary row beside them** — and `StoragePort` gains
`refreshSummary(id, expectedVersion, summary)`: same atomic compare-and-set, writes the row only, carries no
document argument at all, and **does not mint**. §8.4 clause 1's *"no port method changes"* is amended by
name. The rescan's per-row link becomes uniform — the `attemptSave` branch for the active trip goes away
with it, which **subsumes R26-4** and removes KD-57's entire subject. The finding's own remedy, *skip the
write when the row is unchanged*, is measured and refused in A-30 Part 4, and what "unchanged" would have
had to mean is written down there so the question is closed rather than left open.

Nothing else moves: no engine, no `schemaVersion` bump, no change to `countryOf` or the country index, no
new §2.10 export, no §4.2 rule, and the closed list of six document-installing store methods is still six —
A-30 takes the rescan *further* from it. `ROADMAP.md` carries the pair as **I-6a**, with R26-1…R26-4.

**Revision 24, 2026-08-28.** Not a QA round: this is the architect pass that specifies **I-7**
(`travelStats`) down to a signature and an algorithm, and it found that §8.4 clause 2's five-year-old type
block **cannot be computed from the row it is handed**. One ruling, **A-31** in §8.4, read after A-29
because it consumes A-29's row.

The defect is small and total: clause 2 promises `unattributed: {places, stops}`, and `TripSummaryRow`
carries `countryCodes` and `cities[]` and **nothing about the records those codes were derived from** — no
place census, no coordinate-bearing stop count, no `placeCount` at all. So a `travelStats` built against
the shipped row can only ever say *"0 countries"*, and cannot tell the trip with fifty unattributable stops
from the trip with none — which is precisely the answer `ROADMAP` I-7's own verification forbids (*"a trip
with no coordinate-bearing record at all must produce 'no places yet', never '0 countries' as though zero
had been measured"*). A criterion that the design makes unsatisfiable is a design defect (**How a criterion
is written**, rule 5), and it is mine.

Ruled: the row gains **`attribution: {places: {located, attributed}, stops: {located, attributed}}`**,
computed in the walk that already visits every one of those records, and `SUMMARY_VERSION` goes to **4**.
Cities need nothing — `City.centre` is non-nullable, so the city census is already derivable from
`cities[]`. `travelStats`' full type, its exact signature and its algorithm are A-31 Parts 2–4, including
the four things clause 2 never said: **planned trips contribute no country, no city and no day**; an
`active` trip's contribution is **clamped at `today`** (which is what `today` is *for*, beyond the trip
counts); cities group on the **pair** `(nameKey, countryCode)`, because ROADMAP requires two rows for one
name in two countries; and a name that folds to `''` is **not an identity** (`model/cityName.ts`, A-14
assertion 5), so it is counted in `unnamedCities` rather than merged into a blank row.

Two things this changes outside §8.4. (1) **§2.10's list is corrected to 74 and then to 75** — the shipped
index has exported `SUMMARY_VERSION` since I-6 and §2.10's block never gained the line, so the document has
been one behind the test since then; `travelStats` joins under **P2**. (2) **ROADMAP exit criterion 6 is
rewritten**, because *"grep for a persisted field naming a count of countries, cities, trips or days;
expect zero"* is falsified by `cityCount` and `dayCount`, which have been on the row since Phase 1. The
principle was never *"no counts in storage"*; it is **no count that is not a property of exactly one
document, minted inside the write that carries that document, and stamped with `SUMMARY_VERSION`** — and a
lifetime statistic has no such document, which is why it may never be stored at all. A-31 Part 6 states the
rule and the mechanical check that replaces the grep.

Folded into this revision without a ruling of its own: **R27-3** (QA round 27, MINOR, architect-doc) — A-29
Part 8 residue 3 bounds how often the stated branch *fires* and never how often a fired branch is *wrong*;
the measured figure is added there and residue 1's trigger points at it. No behaviour changes and no
number in A-29 moves.

Nothing else moves: no engine, no `schemaVersion` bump, no change to `countryOf`, the country index or the
generator, no `StoragePort` method, no §4.2 rule, and no client change at all — the rescan already selects
on `row.summaryVersion < core.SUMMARY_VERSION` and does not care what the constant is. `ROADMAP.md` carries
this as **I-7**.

**Revision 25, 2026-08-28.** QA round 28 — the mandatory breaker pass over I-7 — found `travelStats`
itself sound at every boundary it could construct, and broke **the substrate it stands on** and **the gate
that is supposed to police it**. Three rulings, in two sections, and none of them is a redesign.

**A-32** (§2.1, QA **R28-1**, BLOCKER): `dayNumber` is `Math.floor(Date.UTC(y, m-1, dd)/86400000)`, and
`Date.UTC` applies the ES legacy two-digit-year rule — a `year` argument of 0–99 means 1900–1999 — so
`dayNumber('0001-01-01')` and `dayNumber('1901-01-01')` are **the same number**, measured, both `-25202`.
`weekdayOf` is built the same way and has the same fault. `fromDayNumber` pads the month and the day and
**not the year**, so `fromDayNumber(dayNumber('0500-06-01'))` is `"500-06-01"`, which `parseIsoDate` —
eight lines up in the same file — throws on. It is product-reachable: `PastTripForm`'s Year field gates on
`/^\d{4}$/`, so `0202` is typeable, and the trip it creates is written to storage with days minted as
`"202-01-01"` and **can never be read back**. Ruled: the three helpers are re-implemented in **pure civil
arithmetic that never constructs a `Date`** (Hinnant's `days_from_civil`/`civil_from_days`, with an
explicit month normalisation so the roll-over `fromJSON` already permits is preserved exactly), the year is
zero-padded to four digits on the way out, and **`IsoDate`'s domain is stated for the first time**:
proleptic Gregorian, `0000-01-01` … `9999-12-31`, which is what `isIsoDate` has always implemented.
Narrowing the domain instead (a floor at 1000 or 1900) is costed and **refused** — an `IsoDate` is minted
from user input at more than a dozen sites across two validators, and the arithmetic is 30 lines. Printed
function bodies, the differential I ran against `Date.UTC`, and the ruling on
`travelStats.test.ts:280` are in A-32. **`packages/core/src` loses its last two `new Date(`
constructions as a consequence, which is a determinism win the ruling did not set out to buy.**

**A-33** (§8.4, QA **R28-2**, MAJOR): exit criterion 6 half (b) is a regex over source text —
`/([A-Za-z$_][\w$]*)\??\s*:\s*number\b/` — so it matches a **declaration** and can never match a **value**.
The breaker wrote `countriesVisited` and `daysTravelled` into every IndexedDB summary record, on every
write, forever, and criterion 6, the 795-test suite and `tsc` were **all green**. §0.5: *a rule that cannot
catch its own bug does not ship*. Ruled: half (a) stops classifying by name and asserts the row's **whole
key set**; half (b) becomes four gates — **the rows a real port actually holds after a real write**, the
argument every port hands its summary store, a port census so a third implementation cannot appear
unpoliced, and the import assertion — plus the source sweep demoted to a **secondary tripwire** with two
measured widenings (a `number` type alias, a numeric literal, comments stripped) that cost **zero** new
allow-list entries. `ROOTS` gains `packages/tokens/src`. The eight faults become the criterion's own
injected-fault matrix.

**A-34** (§8.4, QA **R28-7**, MINOR): A-31 Part 5 residue 2 licenses an `active` trip contributing all of
its countries unclamped, and `cli.ts stats` therefore prints *"GB 2026-08-07 → 2026-08-14 (1 trip)"* for a
country the traveller does not reach until Aug 20 — a plan rendered as an accomplished fact, which is the
root `CLAUDE.md` convention this project has held since revision 1. Ruled: the *statistic* carries the
fact rather than each surface re-deriving it — `TravelStatsCountry` and `TravelStatsCity` gain
`provisional: boolean`, true exactly when **no `completed` trip contributed the row** — and every surface
that renders `travelStats` marks it. ROADMAP I-8 carries the requirement for the Map and Profile; the CLI
marks it now, because the CLI is the surface that exists.

Folded into this revision without rulings of their own: **R28-6** — A-31 Part 5 gains **residue 6**, the
inverse of residue 3 (two *different* unattributed cities that fold to the same name become **one** row,
because `null === null`), accepted as documented behaviour with the reasoning and the trigger; A-31 Part 2
gains the one sentence that says what `travelStats` does when a stored row's census violates the
*"never greater than `located`"* invariant (**clamp at zero, never negative, never throw** — R28-4's
implementation, specified so the builder does not have to choose); and **R28-8**, which is arithmetic
rather than design: §2.10's list and its **75** are correct and re-derived here, and it is `ROADMAP.md`
criterion **E** that is stale at 73.

Nothing else moves: no engine, no `schemaVersion` bump, no `SUMMARY_VERSION` bump (the row's *shape* does
not change), no change to `countryOf`, the country index or the generator, no `StoragePort` method, no §4.2
rule, no client change, and **no movement on §2.10's export surface (75)** — `dayNumber`, `fromDayNumber`,
`parseIsoDate` and `addDays` are all internal (§2.10's "45 that come off", group 1). `ROADMAP.md` carries
the three rulings and round 28's four builder findings as **I-7a**.

**Revision 26, 2026-08-29.** Not a QA round and not a defect. Jacob gave a product-vision clarification
against his own thesis (`PRODUCT-VISION.md` Appendix A, unchanged) whose entire purpose is to **reserve
future capabilities so later phases have something to land on**, and which asks explicitly that no phase be
expanded or restructured. This revision is therefore **additive and touches §8.6, §8.7, §8.8 and §8.9 only**.
Precedent for its shape is revision 10 (§8.10), the other Jacob clarification: a decision recorded because
it is a one-way door, with nothing built and no ruling number, because no finding was adjudicated. Three
things are reserved:

1. **A share is not a read-only page — §8.7.** The capability is *their trip → discover → select → add to my
   trip → adapt to my itinerary*, and every step of it already exists: the browse-another-trip pane,
   `copyStopInto` (§2.14, shipped in Phase 1), `acceptCandidate`, then ordinary editing of a record that is
   now the recipient's own. The decision taken here, so a builder does not invent one: **copying out is
   inherent in the `viewer` grant** — not a fourth role and not a per-share `allowCopy` flag — and the copy
   unit stays one `Stop` with its `Place`. **§2.14 is not redesigned and not amended**; what widens is the
   list of trips the pane may show.
2. **Conversations attach to travel objects, and there is no `Post` — §8.8.** A trip, a day, a stop, a place
   or a photo/moment can carry a conversation; nothing exists whose reason to be is to be commented on. The
   stored shape is sketched (§8.5's precedent) because one clause of it is the one-way door: a comment is
   **server-side and never part of the trip document**, which is the mirror image of §8.3's ruling on
   participants and inverts for the same reason — a participant is the owner's statement about their own
   trip; a comment is another person's content on it.
3. **The feed is split in two — §8.8.** *"No feed"* was doing two jobs. An **engagement** feed is refused
   permanently (ranking model, follower/like economy, generic post items, counters that exist to bring
   someone back); a **derived, travel-native surface** over the same queries Phase 7 already ships is
   reserved, with **no store of its own and no activity-event table**, and reading through the same
   authorization predicates as every other read path.

§8.6 gains one cross-reference (a photo is a conversation subject — that is what the thesis's *"moment"* is
in this model) and §8.9 records that all three cost the export surface nothing. **Nothing here is
implemented, nothing here is Phase 2 scope, and nothing here is a new persisted structure in any shipping
phase**: no engine, no `schemaVersion` or `SUMMARY_VERSION` bump, no client change, no new exported symbol,
**no movement on §2.10's export surface (75)**, and no change to `copyStopInto`, `acceptCandidate`,
`attribution` or any rule that reads them. The mechanical consequences in `ROADMAP.md` are **two reworded
paragraphs** — Phase 3's sharing line and Phase 7's discovery bullet — and no new phase, no new increment
and no change to any phase's exit criteria.

**Phase 1 is §2 and §4. The next phase is §8.1–§8.4.** Everything else is the shape those must not
foreclose. See `ROADMAP.md` for sequencing and `PRODUCT-VISION.md` for why this order and not another.

## Read only your sections

This document is ~186k tokens (re-measured at revision 25, with
`cairn/tools/doc-section ARCHITECTURE` — §2 is ~106k of it and §8 ~44k; the per-section figures below were stale by a third before revision 11 and are
re-measured, not estimated, whenever a revision lands). Nothing needs all of it, and a fresh agent that reads it whole starts a sixth
of the way into its context before writing a line. Pull what you need:

```bash
cairn/tools/doc-section ARCHITECTURE 2 4     # prints §2 and §4 only
cairn/tools/doc-section ARCHITECTURE         # lists the sections and their sizes
```

| § | Contents | ≈ cost | Who needs it |
|---|---|---|---|
| 0 | Six positions, stated up front | <1k | everyone — read it, it is 20 lines |
| 1 | Stack decision and the capability checks behind it | 3k | architect. Settled; do not re-litigate |
| 2 | **Domain model — the builder's contract.** §2.12 `travelRole`, §2.13 geography and §2.14 import/copy are new in revision 2 and are where the Phase 1 rework lives; **§2.2a (the `StorageVersion` write fence, revision 3) and §2.2b (the freshness rule it turned out to be one instance of, revision 4) are read together with §4.2 and §4.3, never alone**; §2.10 (the export surface) and §2.13's copied-record row are settled in revision 5; **§2.7's retirement ledger (A-5) and §2.13's copy-borne `Place` rule (A-6) are revision 6**; **§2.2a's A-7 (the fence a declined write may not move) is revision 8** and is read with §4.2 rule 4a; **§2.2's A-10 (a `CityKey` is a minted opaque id) and §2.7's A-9 (retirement is decided against the un-gated set) are revision 11** — a Phase 2 builder needs both; **A-11, A-12 and A-13 (§2.7) and A-14 (§2.14) are revision 12** and are read *with* A-9 and A-10, never instead of them — A-11 replaces A-9's greppable invariant, A-12 narrows A-9 point 1, A-13 rewrites A-9 assertion 4, and A-14 corrects A-10's change table; **A-15 and A-16 (§2.14) and A-17 (§2.7) are revision 13** — A-15 is the copy path's redaction rule and is read with §6.6, A-16 withdraws A-14's *"within one trip is unchanged"* paragraph, A-17 narrows A-11 assertion 5; **A-18 and A-19 (§2.14) are revision 14** — A-18 is the copy path's redaction rule for the *stop's own* nested records (`cost`, `arrival`) and generalises A-15 to *no spread at any depth*, A-19 rules that the `placement` **argument** is validated against the target and never re-filed. **Anyone touching `copyStopInto` reads A-14, A-15 and A-16 as one rule 4, and A-18 with rules 3 and 5**; **A-20 is revision 15 and lives in §2.9, not §2.14** — it is where the *shape* of a document is decided, it amends A-15's `hours` row and A-18's *"changes nothing in `fromJSON`"* paragraph, and **anyone touching `Place.hours` at any layer reads it first**; **A-21 is revision 16, lives in §2.9 beside A-20 and is read with it** — it replaces A-20's `isWeeklyEntry` with a reader that returns what it read, and imposes one read per field on `copyStop.ts`, so **anyone touching a predicate over an `unknown`, or any function in `copyStop.ts`, reads A-21 with A-15 and A-18**; **A-21a is a revision-16 addendum in the same place** and is what makes A-21's file-wide rule actually total — it is read with A-21, never instead of it; **A-22 and A-23 are revision 17, in the same place again** — A-22 closes the four sites A-21/A-21a's searches missed and **supersedes A-21a's read-count table one level down** (read A-22 Part 2's table, not A-21a's), and **A-23 is the standing census test that replaces the hand search** — *anyone adding a branch to `copyStopInto`, or a field to `Stop` or `Place`, reads A-23 first, because the scenario matrix and the allow-list are part of the contract and widening the allow-list is an architect's ruling*; **A-24 is revision 18 and is read *with* A-23, never instead of it** — it supersedes A-23's `opaque` set, its ten-row matrix and its fixture list, and nothing else about A-23 moves; **A-25 is revision 19 and is the last of the chain — it is read with A-23 and A-24 and closes the arc**, adding `City` rows to the roots, a fifteenth matrix row, an eighth `ALLOWED` entry, the structural fixture-completeness tests, and the **written closing criterion** in its Part 6 that a manager or a future session checks rather than takes on trust. **QA round 21 ran that criterion and all six clauses hold, so the arc is closed rather than closeable** — Part 6 records the verification and Part 5's class-A residue list was completed **in place** with the three instances round 21's re-derivation added (R21-1); that correction carries **no revision number** because no rule, entry, root, row, gate or line of code moved. **A-32 is revision 25 and lives in §2.1**, at the other end of the section from the copy chain — the civil-calendar implementation of `dayNumber`/`fromDayNumber`/`weekdayOf` and the first written statement of `IsoDate`'s **domain**; it is ~4k on its own, and **anyone touching a date helper, or minting an `IsoDate` from user input, reads it and needs nothing else in §2** | 106k | builder, breaker |
| 3 | Module boundaries | <1k | builder |
| 4 | **The Phase 1 client.** §4.2 rule 6 (a pending write is never outlived by its document) is new in revision 3 — QA R3-2; rule 6a′ and the `savedDoc` predicate are revision 4 — QA R4-1; **rule 6a″ (the flush bound and its exits) and rule 6c's "delete goes on the chain" are revision 5** — QA R6-1/R6-2/R7-3; **rule 5's retirement carve-out is revision 6** — QA R8-1, read with §2.7; **rule 4a is revision 8** — QA R11-1, read with §2.2a A-7; **§4.3's A-30 is revision 23** — the `refreshSummary` port method, the fence's meaning stated once, and the rescan's uniform per-row link — and **anyone touching `runRescan`, `StoragePort` or a port implementation reads it first**, with §8.4 clause 3 beside it | 10k | builder |
| 5 | The four hard subsystems | 2k | breaker; builder from Phase 3 on |
| 6 | Privacy, authorization, deletion cascade. **§6.6 is the build-artifact threshold; the copy threshold is §2.14 A-15 + A-18 (revisions 13 and 14) and they differ deliberately, in two named places — read them together or neither** | 4k | breaker, manager; builder for §6.2 |
| 7 | Explicitly deferred | <1k | anyone about to build something not in the roadmap |
| 8 | **The travel-history model** (revision 9) — trip lifecycle and past trips (§8.1), the feasibility/integrity rule class (§8.2), participants (§8.3), geography attribution, travel stats and the summary-row rule (§8.4); then the shapes the location, photo and social phases must land on (§8.5–§8.7) and what is refused (§8.8). **§8.10 is revision 10** — physical travel distance by mode and the four provenance bases that keep it honest; **it is not Phase 2 scope**, so a Phase 2 builder reads §8.1–§8.4 and stops. **Revision 11 amends §8.1, §8.2 and §8.4 by pointer only — the two rulings themselves live in §2.2 (A-10) and §2.7 (A-9), and a Phase 2 builder reads both; revision 12 amends §8.2 by pointer in the same way, and its four rulings live in §2.7 (A-11, A-12, A-13) and §2.14 (A-14)**. **A-26 is revision 20 and lives in §8.4** — the mixed-resolution country index, the withdrawal of the correctness floor's escalation mechanism, and the ruling that `null` is the right answer for a landform the dataset does not carry; **anyone touching `tools/gen-countries.mjs`, `geo/countryIndex.ts` or the attribution golden reads it first**, and it is what ROADMAP's I-5a builds; **A-27 is revision 21, sits directly under A-26 and is read *with* it, never instead of it** — it amends A-26 Part 4's block-quoted rule with a third clause (a filled code ships a **forgiveness entry** as well as a coverage entry), supersedes A-26 Part 5's two-residue list with three, lifts A-26 Part 6 item 3 for a docstring correction only, and is what ROADMAP's **I-5b** builds; **A-28 is revision 22, sits under A-27 and is read with both, never instead of them** — it supersedes A-27 Part 4's filter 2 (two arms, because the coverage index it compared against is mixed-resolution and answered generously) and A-27 Part 4's `overlaps` predicate (the vertex-mean probes come out), corrects A-27 Part 5's Macao sentence and every count in it, and is what ROADMAP's **I-5c** builds. **Anyone touching `tools/forgiveness.mjs` or the forgiveness pass reads A-28 first and A-27 second**; **A-29 is revision 23 and sits under A-28** — it is the only one of the four that is *not* about the index: it rules that a `City`'s **stated** `countryCode` fills a gap the coordinate cannot answer, never overrides one, and only through a gate ending in index membership, and it takes `SUMMARY_VERSION` to 3. **Anyone touching `derive/summary.ts` reads A-29 and §4.3's A-30 together** — A-29 changes what a row *says*, A-30 changes how it is *written*, and I-6a builds both; **A-31 is revision 24 and sits under A-29** — it is the `travelStats` specification (type, signature, algorithm, sort orders, residues), and it widens the row a second time with the **record census** clause 2's `unattributed` cannot be computed without, taking `SUMMARY_VERSION` to 4. **A builder of I-7 reads §8.4 clause 2, then A-31, and needs nothing else in this document except §2.10's list**; A-31 also rewrites ROADMAP exit criterion 6, so **anyone about to add a count to `TripSummaryRow` reads A-31 Part 6 first — widening that allow-list is an architect's ruling**; **A-33 and A-34 are revision 25 and sit under A-31** — **A-33 supersedes A-31 Part 6's two-half check entirely** (it grepped declarations while the danger is a *value*, and a persisted `countriesVisited` passed it), so read A-33 and treat Part 6 as the *principle* it block-quotes and nothing more; **A-34** adds `provisional` to `travelStats`' two row types and is the ruling that stops an active trip's unreached countries being printed as fact. **A builder of I-7a reads A-31, then A-33 and A-34, plus §2.1's A-32**; **revision 26 is additive, carries no ruling number and touches §8.6, §8.7, §8.8 and §8.9 only** — the discover/select/adapt reading of a share, the conversation model, and the travel-native feed, all *reserved and none built*, so **a Phase 2 builder needs none of it** and the reader who does is the architect or whoever builds Phase 3's shares or Phase 7's discovery | 44k | architect; the builder and breaker of the phase after Phase 1 (§8.1–§8.4 only). §8.10 is for the architect and for phases 4, 5 and 7. Read with `PRODUCT-VISION.md` |

*(§8's figure is measured with `doc-section`, not estimated. §8.1–§8.4 — the Phase 2 model — are roughly
five sixths of it since revisions 20–24 put A-26, A-27, A-28, A-29 and A-31 in §8.4; a Phase 2 builder
who reads only those pays about 31k, and a builder of I-6a who reads §8.4 alone pays about 28k — with §4.3
(~4k, and A-30 is most of it) beside it, because I-6a is the one increment that needs both. **A-28 is the entry
point to that trio, not the last of it** — it names which of A-27's sentences it supersedes, so a builder who
reads A-28 first knows which parts of A-27 to skip. **A builder of I-7 needs none of A-26…A-29** — those are
about the index and about one city field, and A-31 is about the row and the statistic; §8.4's clauses 1–3
plus A-31 is ~9k and is the whole brief. **A builder of I-7a** reads A-31 → A-33 → A-34 (**11.3k**
together, measured) plus §2.1's **A-32** (**4k**), and needs nothing else in either section.)*

Read the whole document when you are the manager, when you are changing the design, or when a change
crosses a section boundary. Otherwise this table is the contract.

---

## 0. Six positions, stated up front

1. **The brief's two hard constraints hold, and one is worse than the brief says.** They force a native
   shell for pillars 4 and 5 — not a native-first architecture. Jacob has confirmed the end state:
   Expo/React Native on the phone, a web companion for desktop planning and share links friends can open
   without installing. §1.
2. **Days are stored. Stops belong to days by an explicit edge, not by timestamp.** §2.3.
3. **Location traces and photo metadata never leave the device** unless the user explicitly shares one day's
   simplified path. Raw fixes, EXIF and library enumeration have no server counterpart in any phase. §6.1.
4. **Public-grade on what is expensive to retrofit, friends-grade on everything else.** Concretely, four
   things are designed now and nothing else is: authorization on every read path, ownership on every row,
   deletion and export as a designed cascade, and minimum-scope parse-then-discard mail handling. §6.
5. **A blocker is a thing Jacob must act on, and a rule that cannot catch its own bug does not ship.**
   Added after Phase 1 shipped 12 blockers of which 3 were real and a coordinate rule that could not see
   the coordinate typo it was written for. Two consequences run through §2.7, §2.12 and §2.13: a rule that
   cannot distinguish "the data says something impossible" from "the data is shaped oddly" degrades to a
   warning rather than asserting a defect, and every rule ships with an **injected-fault criterion** —
   the exact fault it exists to catch, and the exact output it must produce. `ROADMAP.md` "How a criterion
   is written".
6. **A fact about a resource is only valid at the moment, and in the place, the resource itself stated
   it.** Everything else is a copy, and every copy goes stale. This is one principle with three
   consequences — nothing may fence *or gate* a write to storage with a property of the document; nothing
   may infer "unchanged" from a counter rather than from the thing that was written; and no token storage
   mints may depend on a value cached outside the step that mints it. Separately, a debounced write is
   flushed before the document it belongs to is replaced, and if it cannot land, the switch does not
   happen. Four consecutive QA rounds found the same error at four different levels — R2-1 (compare above
   the port), R3-1/R3-4 (`revision` as the fence), R4-1 (`revision` as the decision to write), R4-2 (a
   port's cached `epoch`) — which is why it is stated once, as a rule with mechanical checks, in **§2.2b**.
   §2.2a is the fence itself; §2.2b is the rule §2.2a turned out to be one instance of; §4.2 rules 3, 4
   and 6 are where the client obeys them.
7. **A trip does not end when the itinerary ends, and nothing about the history is stored as a count.**
   Added at revision 9 from Jacob's product thesis. The lifecycle is derived from dates; a past trip is a
   trip whose end date has passed; participation, access, friendship and location-sharing are four
   different edges; and every statistic — countries, cities, days, goals — is derived from the trips it
   claims to summarise, so it cannot drift from them and cannot be inflated by typing. §8.

---

## 1. Stack decision, driven by constraints

### 1.1 What I actually verified

Checked 2026-08-24. **Caveat on method:** this session's egress proxy blocked direct `WebFetch` to
`developer.mozilla.org`, `caniuse.com`, `bugs.webkit.org`, `docs.expo.dev`, `webkit.org` and several others,
so most rows below are search-result summaries of those sources rather than pages read end to end. Rows
marked **⚠ NEEDS DEVICE CHECK** are ones I would not bet a schedule on without a physical iPhone.

| Capability | State as of Aug 2026 | Consequence |
|---|---|---|
| **Background geolocation, web** | Not available. `watchPosition()` stops reporting when the screen is off; backgrounded, iOS may power the GPS down under its own rules. No spec, no vendor roadmap; W3C device-APIs discussion still open as of Jun 2025. | Pillar 4 impossible in a browser. Confirms the brief. |
| **Geolocation in an *installed* iOS web app** | Reports since iOS 26 that geolocation is **denied outright** in home-screen web apps while working in the same page in Safari. iOS 26 also made every "Add to Home Screen" default to web-app mode. ⚠ NEEDS DEVICE CHECK | *Worse than the brief.* Even a foreground "record while open" web fallback is unreliable on iOS. Kills the "PWA now, native later" hedge. |
| **Background Sync API** | Not implemented in WebKit, not on Apple's roadmap. Periodic Background Sync is Chromium-only. | No PWA can flush a queued trace or poll a mailbox while closed, on any iOS browser (all are WebKit). |
| **Did anything move in Safari 26?** | Checked the Safari 26.0 / 26.2 / 26.4 feature posts and 18.4's additions. What landed: Declarative Web Push, Screen Wake Lock (18.4), CSS work. What did **not**: background geolocation, Background Sync, any photo-library API, local-disk file access. | **Nothing has moved that changes the native/web split.** The brief's assumption holds a year on. |
| **Screen Wake Lock** | iOS Safari from **16.4**; broken specifically in installed home-screen web apps until Apple fixed it in **18.4** (WebKit #254545). | A foreground, screen-on web live-path is viable on Android/desktop and current iOS. The web app is a degraded mode for pillar 4, not a dead end. |
| **File System Access API** | Safari supports **only** the Origin Private File System (15.2+). `showOpenFilePicker` / `showSaveFilePicker` / `showDirectoryPicker` are Chromium-only everywhere. | No local trip files or ticket vault in Safari. Web export is a download; web import is `<input type=file>`. §4.4. |
| **Photo library enumeration, web** | No API in any browser, by design. The platform offers a *picker* only. Same restriction Google applied when it removed the broad Photos library scope in Mar 2025. | Pillar 5's auto-suggest impossible in a browser. Confirms the brief. |
| **EXIF on iOS Safari uploads** | iOS strips sensitive EXIF — including GPS — from photos uploaded through a Safari file input (WebKit #207088, long-standing, unresolved). | *A second reason the brief doesn't give.* Even the manual-picker fallback cannot get coordinates on iOS. There is no partial web version of pillar 5. |
| **iOS storage eviction** | Script-created storage deleted after 7 days without interaction — but **home-screen web apps keep their own days-of-use counter** and are not expected to be evicted. | An installed web app can hold a trip offline. A tab cannot. Ship `apps/web` installable. |
| **Expo / React Native** | **SDK 56**, released 2026-05-21: RN 0.85, React 19.2, Hermes v1 default, New Architecture assumed (RN 0.83+ is New-Arch-only). `expo-sqlite` gained session changesets on both platforms. | Native shell is on a current supported line; changesets are a plausible sync primitive later. |
| **Background location, native** | `expo-location.startLocationUpdatesAsync` + `expo-task-manager`; config-plugin flags `isIosBackgroundLocationEnabled` (adds `location` to `UIBackgroundModes`) and `isAndroidBackgroundLocationEnabled` (adds `ACCESS_BACKGROUND_LOCATION`); Android runs a foreground service. | Pillar 4 is first-party in Expo. |
| **Photo library, native** | `expo-media-library.getAssetsAsync` enumerates; `getExifAsync`/`getLocationAsync` return coordinates. Android additionally requires `ACCESS_MEDIA_LOCATION` or coordinates come back **empty with no error**. | Pillar 5 is first-party in Expo. That Android permission is the most likely silent bug in the whole product. |
| **Gmail scope tiers** — *confirmed at the coordinator's request* | `gmail.readonly` is a **restricted** scope. So is `gmail.metadata`. (Google's console has historically mislabeled `readonly` as merely "sensitive"; the policy FAQ corrects it.) An app's classification is its **most restrictive scope**. | **There is no narrow Gmail read scope that escapes the restricted tier.** "Just ask for less" is not an available mitigation. §6.4. |
| **Gmail restricted-scope gate** | Restricted scopes + the ability to access data *through a third-party server* (our ingest worker, by definition) ⇒ a **CASA** security assessment by a Google-empanelled lab, with **annual revalidation**. Tiers are built on OWASP ASVS: T1 self-assessment, T2 third-party DAST (2026 self-serve lab fees ≈ **$540–$1,000**), T3 full manual pentest. Unverified/"Testing" avoids all of it but caps at **100 test users** and **expires every refresh token after 7 days**. | The coordinator's suspicion is correct: **Gmail OAuth is a hard gate on going public.** It shapes the ingestion design and the phase order. §5.1, §6.4. |
| **Microsoft / Outlook equivalent** | Microsoft Graph `Mail.Read`. **Publisher verification is free** and no license is required; it removes the "app is not commonly used" warning and clears risk-based step-up consent, which otherwise blocks unverified multitenant apps registered after 2020-11-08. **No mandatory third-party security assessment.** Microsoft 365 Certification (annual independent audit incl. pentest) exists but is **optional**, aimed at enterprise/marketplace. | **Materially cheaper path to a public launch than Gmail.** Outlook can ship publicly before Gmail does. §6.4. |

Sources: [PWA iOS limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) ·
[WebKit features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) ·
[WebKit features for Safari 26.2](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/) ·
[caniuse: Background Sync](https://caniuse.com/background-sync) ·
[caniuse: Periodic Background Sync](https://caniuse.com/wf-periodic-background-sync) ·
[caniuse: Wake Lock](https://caniuse.com/wake-lock) ·
[WebKit #254545 — wake lock in home-screen web apps](https://bugs.webkit.org/show_bug.cgi?id=254545) ·
[WebKit #207088 — iOS uploads strip EXIF](https://bugs.webkit.org/show_bug.cgi?id=207088) ·
[Apple Developer Forums — iOS 26 PWA geolocation](https://developer.apple.com/forums/thread/804381) ·
[WebKit — updates to storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) ·
[File System Access browser support](https://www.testmuai.com/learning-hub/file-system-access-api-browser-support/) ·
[Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56) ·
[expo-location](https://docs.expo.dev/versions/latest/sdk/location/) ·
[expo-media-library](https://docs.expo.dev/versions/latest/sdk/media-library/) ·
[Google — restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) ·
[Google — restricted scopes list](https://support.google.com/cloud/answer/13464325) ·
[Google — security assessment](https://support.google.com/cloud/answer/13465431) ·
[App Defense Alliance — CASA](https://appdefensealliance.dev/casa) ·
[Google — manage app audience / test users](https://support.google.com/cloud/answer/15549945) ·
[Google OAuth refresh-token expiry in Testing](https://www.unipile.com/google-oauth-refresh-token/) ·
[Microsoft — publisher verification](https://learn.microsoft.com/en-gb/entra/identity-platform/publisher-verification-overview) ·
[Microsoft 365 App Compliance Program](https://learn.microsoft.com/en-us/microsoft-365-app-certification/overview) ·
[Node.js EOL schedule](https://endoflife.date/nodejs) ·
[Node.js TypeScript support](https://nodejs.org/api/typescript.html) ·
[Node.js test runner](https://nodejs.org/api/test.html).

### 1.2 What each option kills

| Option | What it kills |
|---|---|
| **PWA only** (extend the current HTML) | Pillar 4 outright (no background location on any iOS browser; Android suspends too). Pillar 5 outright (no enumeration API anywhere; iOS strips EXIF even from picked files). Offline-reliable mail polling. **Rejected.** |
| **Native Swift + native Kotlin** | Nothing capability-wise — it is the ceiling. Kills the schedule: two platform codebases plus a web app plus a server for an audience of tens, with domain logic in three languages. That is the exact drift the `DAYS` array was invented to prevent. **Rejected.** |
| **Capacitor / web-in-a-shell** | Keeps the existing HTML nearly intact; community background-geolocation plugins exist. Gets thin on photo-library enumeration + EXIF through a plugin bridge, and leaves offline storage on the same WebKit rules that already bit this project. Viable, not chosen. |
| **Expo/RN phone app + TypeScript web companion + TypeScript server** ✅ | Nothing in the brief. Costs a native rebuild of the UI — the existing HTML stays as reference and is not ported. Confirmed by Jacob. |

### 1.3 The decision

- **`packages/core`** — pure TypeScript. Zero runtime dependencies, no DOM, no `fetch`, no `fs`, no clock, no randomness.
- **`packages/client`** — the trip store, ports and selectors. Platform-agnostic, no DOM, no React. Runs in plain Node.
- **`apps/web`** — Vite + React + TypeScript. Desktop planning, public share pages, OAuth callbacks. Installable.
- **`apps/mobile`** — Expo SDK 56 / RN 0.85. Location, photo library, offline travel.
- **`services/api`** — Node 24 + Postgres with row-level security, managed auth and object storage.
- **`services/ingest`** — a worker in the same runtime; **separate deploy unit, separate credentials, no write grant on trip tables**.

Runtime floor everywhere: **Node 24 LTS**. `core` and `client` are written so `node --test` runs their `.ts`
files directly via type stripping — so they may not use enums, parameter properties, namespaces, or anything
else `erasableSyntaxOnly` rejects. That is a hard constraint on the builder and the reason the tester needs
no toolchain, no browser, and no device to attack the model *and* the state machine.

**The constraint that forced the stack** is not background location alone — that only proves "some native
code exists". It is background location **and** photo-library enumeration **and** a server-side mail worker
**and** a browser planning surface, all needing to agree on what a trip is, on a budget of one builder.
Four surfaces, one domain model, one language.

**What does *not* have to wait for the native shell** — worth stating, because it decides the phase order:
multi-trip planning and editing, maps, cost roll-ups, conflict surfacing, mail-derived candidates, friends,
sharing, and public share links friends open without installing anything. Only the live path (pillar 4),
the photo library (pillar 5), and genuinely-offline travel need the phone. That is why Phase 1 ends with a
usable web client and the native app is Phase 4.

**On managed Postgres, which the brief asked me to cost:** take it, and take row-level security specifically.
Jacob's answer makes this non-negotiable — "retrofitting authz is the worst migration in this product" is
correct, and RLS is how you avoid it. But RLS is the *enforcement* layer, not the *definition* layer. The
rules are pure functions in `packages/core/access`; the policies are tested against them by a conformance
matrix (§6.2). Otherwise the tester can only attack policies against a live database and every phase before
Phase 2 loses its plain-Node property.

### 1.4 Where I disagree with the brief

1. **"The end state is a native app, so the design must not paint itself into a browser."** Half right, and
   Jacob's answer settles it: native app *with a web companion*. The design is core-first; the web app is a
   permanent first-class surface, not a stepping stone.
2. **"A PWA cannot do [background location] on iOS at all."** True and understated — since iOS 26 there are
   credible reports geolocation is refused in installed home-screen web apps even in the foreground.
3. **Photo library.** The brief's reason is correct but incomplete: iOS also strips GPS EXIF from picked
   files, so there is no reduced web version of pillar 5 at all.
4. **Email ingestion.** The brief's reasoning is right and the coordinator's suspicion is confirmed — with
   one correction that makes it *worse* than assumed: **every** Gmail read scope is restricted, including
   `gmail.metadata`, so minimising scope does not escape the gate. And one that makes it better: **Microsoft
   Graph has no CASA equivalent and publisher verification is free**, so Outlook is the cheaper first
   provider for a public launch. §6.4.
5. **`LocationPoint` / `LocationSegment` in the brief's entity list** read as server tables. Here they are
   device-local types with no server counterpart. The only location entity that exists server-side is
   `SharedTrace`, which is a coarser, opt-in, per-day thing. §6.1.

---

## 2. Domain model — the core specification

This section is the builder's contract. Where it says MUST, the tester will check it.

### 2.1 Conventions

- Ids are opaque strings. Core never generates them; an `IdFactory` is injected so tests are deterministic.
- Dates are `YYYY-MM-DD`. Times are `HH:MM` 24h **wall-clock at the stop's location**, or `null`. Core stores
  no UTC instants and does no timezone maths — §7.
- All build functions are **pure and immutable**: `(trip, args) => Trip`. Nothing mutates in place.
- Core throws only on programmer error. Domain problems are returned as `Issue[]` or `Conflict[]`, never thrown.
- **Every `*Patch` type is enforced at runtime by an explicit key allowlist, not by TypeScript.**
  `Partial<Omit<Stop,'id'|'placement'>>` is a compile-time comment; `{...s, ...patch}` honours none of it.
  Every patch-taking build function iterates the patch's own keys, throws `TypeError` on a key outside its
  allowlist, and throws on the forbidden keys by name. For `updateStop` the forbidden keys are `id`,
  `placement` and `provenance`: identity is not editable, placement goes through `moveStop`, and provenance
  transitions go through `acceptCandidate` / `rejectCandidate` / `copyStopInto` and nowhere else. *(This
  confirms the invariant F-7 asked about: the acceptance gate is not optional, and Phase 3's ingest worker
  is exactly the caller that must not be able to route around it.)*
- **Every user-facing string core produces carries structured `params` beside it** (`Conflict.summary` +
  `Conflict.params`, `Issue.message` + `Issue.params`). i18n is deferred, but generating English-only strings
  with no structured data behind them is exactly the kind of thing that is expensive to retrofit. §7.
- **`IsoDate`'s domain is `0000-01-01` … `9999-12-31`, proleptic Gregorian, and every date helper is civil
  arithmetic with no `Date` in it.** Stated for the first time in revision 25 — **A-32**, below, which is
  where a builder goes.

#### A-32 — the civil calendar under `IsoDate`: `Date.UTC` may not appear in a date helper, and a year below 1000 is a real year (revision 25, QA R28-1, BLOCKER)

**Part 1 — the defect, measured rather than described.**

`derive/summary.ts` has carried three date helpers since revision 1, and two of them go through `Date`:

```ts
export function dayNumber(d: IsoDate): number {           // :21
  const { y, m, d: dd } = parseIsoDate(d);
  return Math.floor(Date.UTC(y, m - 1, dd) / 86400000);
}
export function fromDayNumber(n: number): IsoDate {       // :27
  const dt = new Date(n * 86400000);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}
export function weekdayOf(d: IsoDate): string {           // :44
  const { y, m, d: dd } = parseIsoDate(d);
  return [...][new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
}
```

Two independent faults, in two disjoint bands of years:

| | Fault | Band | Measured |
|---|---|---|---|
| 1 | **`Date.UTC` applies the ES legacy two-digit-year rule** — a `year` argument of 0–99 *means* 1900–1999 | years **0000–0099** | `dayNumber('0001-01-01')` and `dayNumber('1901-01-01')` are both `-25202`. `dayNumber('0100-01-01')` is `-683003`, so the band ends exactly at 100 |
| 2 | **`fromDayNumber` pads the month and the day and not the year** | years **0000–0999** | `fromDayNumber(dayNumber('0500-06-01'))` is `"500-06-01"`, which `parseIsoDate` — eight lines up in the same file — throws on |

`weekdayOf` is fault 1 again and was confirmed rather than assumed: `weekdayOf('0001-01-01')` returns
`'Tue'`, which is 1901's weekday; the proleptic Gregorian answer is **Mon**. `weekdayOf('0099-03-01')`
equals `weekdayOf('1999-03-01')`.

**It is reachable from the product, and it destroys data.** `apps/web/src/views/PastTripForm.tsx:76` gates
the Year field on `/^\d{4}$/` and nothing else, and the input strips non-digits and truncates to four — so
`0202`, a plausible mistype of `2020`, is typeable and valid. `createTrip` accepts it, `ensureDays` mints
365 days whose `date` **and `id`** are `"202-01-01"`…, the document is written to storage, and the next cold
start gets `TripParseError: expected YYYY-MM-DD (at $.days[0].date)`. The trip is in storage, it is the only
copy, and it can never be opened again. Year `0026` is the quieter half: no error anywhere, days minted as
**1926-01-01…1926-12-31** against a `startDate` of `0026-01-01`, and `validateTrip` reporting **0 issues**,
because its density check runs through the same mangled `dayNumber` and is therefore internally consistent
in mangled space.

**Part 2 — the two directions, and why this one.**

*(a) Fix the arithmetic.* Implement the three helpers as civil-calendar arithmetic that never passes a raw
year to `Date`, and pad the year to four digits on the way out.

*(b) Narrow the domain.* Give `IsoDate` a floor (1000, or 1900), make the validators refuse below it, and
withdraw A-31 Part 4 step 5's *"an `IsoDate` admits year `0001`"*.

**Ruled: (a).** (b) is refused on a count, not on taste. An `IsoDate` is minted from outside core at more
sites than the finding suggests, and a floor has to land at every one of them or it is not a domain:

- **two** validators inside core that do not share code — `model/ids.ts`'s `isIsoDate` (7 call sites:
  `createTrip` ×2, `validateTrip` ×2, `conflict/resolve`, `access/predicates` ×2) and
  `serialize/fromJSON.ts:75`'s `isoDate` (**9** call sites), which deliberately checks shape where
  `isIsoDate` checks the calendar (§2.9 A-20);
- `derive/summary.ts`'s own `parseIsoDate`, a third shape check;
- **three** branches of `PastTripForm.rangeFor` plus the new-trip form, which under (b) must refuse at the
  point of entry rather than downstream — a rule the user only meets after their trip is written is not a
  narrowed domain, it is a delayed error;
- `cli.ts --today`, `ports/env.ts`'s clock, and every `at` a provenance stamp carries.

So (b) is a dozen-plus edit sites, a new class of user-facing refusal, a withdrawn clause in A-31, and a
`.gen`-free contract that now has a magic number in it — against **30 lines of arithmetic** that make the
question disappear. And (a) pays a dividend (b) does not: it removes the **last two `new Date(`
constructions in `packages/core/src`**, which the determinism grep has had to carve an exception for since
round 2.

**Part 3 — the implementation, printed, because a wrong algorithm here is a silent wrong answer.**

Howard Hinnant's `days_from_civil` / `civil_from_days` (*chrono-Compatible Low-Level Date Algorithms*,
public domain), which is constant-time, exact over the whole proleptic Gregorian calendar, and has **no
two-digit-year special case because it has no `Date` in it**. Both are module-private in
`derive/summary.ts`; neither goes on §2.10's surface, and neither is exported from the module.

```ts
const EPOCH_SHIFT = 719468;   // days from 0000-03-01 to 1970-01-01, the era's own origin
const ERA_DAYS = 146097;      // days in a 400-year Gregorian era

/**
 * Days since 1970-01-01 for a civil (y, m, d), proleptic Gregorian. Pure, no `Date`.
 *
 * The first two lines normalise an out-of-range month **exactly as `Date.UTC` does**, because
 * `fromJSON` accepts a shape-valid, calendar-invalid date (`2026-13-45`) and `validateTrip`
 * *reports* it rather than refusing it (§2.9 A-20) — so this function must stay total on one, and
 * must not change the day it has always answered with. Verified: over all 100,000 shape-valid
 * `(m, d)` pairs at ten sample years >= 100, this and `Date.UTC` agree on every one.
 */
function daysFromCivil(year: number, month: number, day: number): number {
  const y0 = year + Math.floor((month - 1) / 12);
  const m = ((month - 1) % 12 + 12) % 12 + 1;
  const y = y0 - (m <= 2 ? 1 : 0);              // the era's year starts in March
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;                    // [0, 399]
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * ERA_DAYS + doe - EPOCH_SHIFT;
}

/** The inverse. Pure, no `Date`. Total for every integer. */
function civilFromDays(n: number): { y: number; m: number; d: number } {
  const z = n + EPOCH_SHIFT;
  const era = Math.floor(z / ERA_DAYS);
  const doe = z - era * ERA_DAYS;               // [0, 146096]
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524)
    - Math.floor(doe / 146096)) / 365);         // [0, 399]
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);   // [0, 11]
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: y + (m <= 2 ? 1 : 0), m, d };
}
```

Every `/` above is a **floor** division, written as `Math.floor`. Hinnant's C++ writes several of them as
truncating division with a sign guard; every operand that is divided here is non-negative except `y / 400`
and `z / ERA_DAYS`, for which `Math.floor` *is* the guarded form. Do not "simplify" one to `| 0` or `~~`:
`| 0` truncates toward zero and is wrong for a negative year, and both coerce through int32, which
`z = 2932896 + 719468` survives and a future range may not.

The three exported helpers then become:

```ts
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Days since 1970-01-01 for a `YYYY-MM-DD`. Pure, timezone-free, no `Date`. */
export function dayNumber(d: IsoDate): number {
  const { y, m, d: dd } = parseIsoDate(d);
  return daysFromCivil(y, m, dd);
}

/**
 * `YYYY-MM-DD` for a day number. Pure, no `Date`.
 *
 * The year is padded to **four** digits, which is the half of R28-1 that silently minted
 * `"202-01-01"` into a stored document. A day number outside `IsoDate`'s domain renders
 * faithfully rather than being clamped or thrown on — five digits, or a leading `-` — so the
 * caller gets a string `parseIsoDate` refuses instead of a plausible wrong date. See A-32 Part 4
 * for why this is deliberately not a throw.
 */
export function fromDayNumber(n: number): IsoDate {
  const { y, m, d } = civilFromDays(n);
  const p = (x: number) => String(x).padStart(2, '0');
  const year = y < 0 ? `-${String(-y).padStart(4, '0')}` : String(y).padStart(4, '0');
  return `${year}-${p(m)}-${p(d)}`;
}

/** Three-letter weekday, Sun-first index. Pure, no `Date`. */
export function weekdayOf(d: IsoDate): string {
  const { y, m, d: dd } = parseIsoDate(d);
  // 1970-01-01 is day 0 and was a Thursday, hence the +4; the double modulo is for day < 0.
  return WEEKDAYS[((daysFromCivil(y, m, dd) + 4) % 7 + 7) % 7];
}
```

`parseIsoDate`, `addDays` and `dateSpan` are **unchanged** — `addDays` and `dateSpan` are already written
in terms of the two functions above, and `parseIsoDate` is a shape check that must keep accepting what
`fromJSON` accepts.

**What I ran before printing this** (all four differentials, on the exact bodies above):

- **Calendar differential vs `Date.UTC`**, every month × four days per month, years 100…9999 step 3 —
  **158,400 dates, 0 mismatches**. The band `Date.UTC` gets right, this gets identically right.
- **Roll-over differential vs `Date.UTC`**, every shape-valid `(m, d)` in `[0,99] × [0,99]` at ten sample
  years — **100,000 cases, 0 mismatches**. This is the assertion that `2026-13-45` still answers
  `2027-02-14` and `2026-02-30` still answers `2026-03-02`.
- **Exhaustive round-trip** over the whole domain: for every `n` in `[dayNumber('0000-01-01'),
  dayNumber('9999-12-31')]` = `[-719528, 2932896]`, `fromDayNumber(n)` matches `/^\d{4}-\d{2}-\d{2}$/` and
  `dayNumber` of it is `n` again — **3,652,425 days, 0 failures**.
- **Weekday differential vs `Date`** for years ≥ 100 — **0 mismatches**; and `weekdayOf('0001-01-01')` is
  **`'Mon'`**, the proleptic Gregorian answer, where the shipped code says `'Tue'`.

**Part 4 — the domain, and why `fromDayNumber` does not throw.**

> **An `IsoDate` is a proleptic Gregorian calendar date in `YYYY-MM-DD`, from `0000-01-01` to
> `9999-12-31` inclusive.** `model/ids.ts`'s `isIsoDate` is the definition and has always implemented
> exactly this: four digits of year, a real month, a real day for that month, with the Gregorian leap rule
> applied uniformly (so `0004-02-29` is a date and `0100-02-29` is not). There is no floor and no ceiling
> inside that range, and nothing anywhere may invent one.

The tempting extra — make `fromDayNumber` throw outside the domain — is **refused**, and the reason is a
real path rather than a hypothetical. `fromJSON` accepts `endDate: '9999-13-45'` (shape-valid,
calendar-invalid; `validateTrip` reports it as `invalid_calendar_date` and does not reject it). That
document reaches `validateTrip.ts:202`'s `addDays(trip.startDate, i)` and `build/days.ts:53`'s, and the
roll-over carries the year past 9999. A throw there is a throw **out of `validateTrip`, on a document
`fromJSON` accepted** — which §2.1 forbids and §2.9 A-21 has already ruled on once. So `fromDayNumber`
stays total and renders honestly: a five-digit or negative year is a string every downstream
`parseIsoDate` refuses, which is where the refusal belongs, and the document that produced it is already
carrying an `invalid_calendar_date` issue for the field that caused it. **No new `IssueCode`, no new
validation call site, and no change to `isIsoDate`.**

**Part 5 — `PastTripForm`'s Year field: no floor, and here is the trigger that would add one.**

With Part 3 in place, year `0202` is no longer data loss — the trip stores, reads back, validates, and can
be edited or deleted like any other. What remains is a typo the user can see and fix, which is not a class
of problem this codebase adds validation for. A plausibility floor in the form would be **a second
definition of `IsoDate`'s domain living in a view**, which is the shape §2.9 A-20 spent a whole ruling
removing, and it buys nothing once the arithmetic is right. **Trigger to reopen:** any evidence that an
out-of-era trip costs something beyond the user's own typo — unbounded work (it is not: a `year` trip is
365 days at any year), a surface that sorts or ranges badly on it, or a second report of the same mistype.
If it is ever added, it goes in `isIsoDate` — the one validator — and the forms refuse at the point of
entry against **that**, never against a regex of their own.

**Part 6 — what happens to the test that certifies the wrong answer.**

`packages/core/test/travelStats.test.ts:280` asserts `daysTravelled === 365` for a row spanning
`0001-01-01`…`0001-12-31`. **The number is right and the reason is wrong** — it is green because it is
measuring 1901, which also has 365 days. Fixing the arithmetic does not move it, so the fix must be the
assertion that would have caught this, not the number:

1. **Keep the case and keep `365`.** Year 1 is not a leap year in the proleptic Gregorian calendar, so
   this is the correct answer for the correct reason once A-32 lands.
2. **Add the assertion that discriminates.** Give the row a `countryCodes: ['JP']` and assert
   `countries[0].firstVisit === '0001-01-01'` and `lastVisit === '0001-12-31'`. Under the shipped code
   those are `'1901-01-01'` / `'1901-12-31'`; under A-32 they are the year they were given. **This is the
   line that makes the test measure what its own name says.**
3. **Add a second row for the padding half**, which the year-`0001` case cannot reach: a row spanning
   `0500-06-01`…`0500-06-10` with a country code reports `firstVisit === '0500-06-01'`, where the shipped
   code emits `"500-06-01"` — a string its own `parseIsoDate` throws on.
4. **A-31 Part 4 step 5's justification is honoured, not withdrawn.** *"An `IsoDate` admits year `0001`"*
   is now true, and the sweep is still the right algorithm for the reason it gave. Round 28 timed it:
   200 rows each spanning `0001-01-01`…`9999-12-31` sweep in **1.9 ms** and 50,000 rows in **283 ms**,
   against ~730M `Set` insertions for the first.

Beyond `travelStats`, the helper-level tests belong with the helpers: a `dayNumber`/`fromDayNumber`
round-trip over the domain's two endpoints and the four boundary years (`0000`, `0099`/`0100` — fault 1's
edge — and `0999`/`1000` — fault 2's edge), the `weekdayOf('0001-01-01') === 'Mon'` case, and the roll-over
non-regression (`2026-13-45` → `2027-02-14`, `2026-02-30` → `2026-03-02`) so the next person to "clean up"
`parseIsoDate` finds out immediately.

**Part 7 — the injected fault, per §0.5.**

Restore `Math.floor(Date.UTC(y, m - 1, dd) / 86400000)` in `dayNumber` alone and Part 6's item 2 goes red
naming `1901-01-01`. Restore the unpadded year in `fromDayNumber` alone and item 3 goes red naming
`"500-06-01"`. Restore `new Date(Date.UTC(...)).getUTCDay()` in `weekdayOf` alone and the `'Mon'` case goes
red. Three faults, three named tests, no overlap — and the determinism grep over `packages/core/src` gains
`new Date(` back on each of them, which is the fourth signal.

**Part 8 — the residues.**

1. **`parseIsoDate` still validates shape and not the calendar**, so `dayNumber('2026-02-30')` still
   answers `2026-03-02`'s day number rather than refusing. That is deliberate and load-bearing (Part 4);
   the calendar check is `isIsoDate`'s and the reporting is `validateTrip`'s. **Trigger:** a finding where
   a *rolled-over* date, not an out-of-domain one, produces a wrong user-visible answer.
2. **The domain is not enforced at the type level.** `IsoDate` is `string`, as `CityKey` and `CountryCode`
   are, for the reason `model/ids.ts` already gives about branding being a migration. Nothing in this
   ruling changes that.
3. **`fromDayNumber` can return a string that is not an `IsoDate`** — a five-digit or negative year — for a
   day number outside the domain, and its return type still says `IsoDate`. This is the honest lesser evil
   of Part 4 and it is bounded: the only way to reach it is a date that already carries an
   `invalid_calendar_date` issue. **Trigger:** a second way to reach it that does not.

### 2.2 Entities

```ts
type Trip = {
  id: TripId;
  title: string;
  ownerId: UserId;               // present from Phase 1; a local-only sentinel until accounts exist
  startDate: IsoDate;            // inclusive
  endDate: IsoDate;              // inclusive
  homeCurrency: Currency;
  homeBase: { name: string; at: LatLng } | null;   // where the trip starts and ends from — §2.13
  party: { adults: number; children: number };
  cities: City[];                // ordered
  days: Day[];                   // dense over [startDate,endDate]; MUST have no gaps
  pool: Stop[];                  // unscheduled stops — the generalisation of OPTIONAL
  places: Place[];               // the map-pin superset — generalisation of CITY_PLACES
  bookings: Booking[];
  resolutions: ConflictResolution[];
  revision: number;              // CONTENT revision. Bumped by every build function. NOT a write fence — §2.2a
  schemaVersion: 1;
};

type City = { key: CityKey; name: string; countryCode: string; centre: LatLng; order: number;
              meta?: { flagEmoji?: string; color?: string } };

type Day = {
  id: DayId;                     // MUST equal the date: "2026-08-13"
  date: IsoDate;
  primaryCity: CityKey | 'transit';   // editorial, not derivable
  cities: CityKey[];             // MUST include primaryCity
  title: string; subtitle: string;
  stops: Stop[];
  provenance: Provenance;
  legacyFlag?: boolean;          // migration only, §2.11
};

type Stop = {
  id: StopId;
  placement: StopPlacement;
  name: string;
  category: StopCategory;        // 'sight'|'food'|'night'|'trip'|'transit'|'stay'|'suggest'
  place: PlaceLink;
  note: string;
  cost: CostEstimate | null;
  arrival: MoveOverride | null;  // the travel attached to this stop — §2.5 for the maths,
                                 // §2.12 for what it MEANS
  travelRole: TravelRole;        // 'transfer' | 'journey' | 'unknown' — §2.12. Default 'transfer'.
  bookingId: BookingId | null;
  flags: StopFlag[];             // 'free' | 'daytrip' | ... — display badges only
  provenance: Provenance;
  durationMins: number | null;   // null = unknown; never guessed
  links?: Link[];                // reference links (the legacy `book:` field where it is not a ticket) —
                                 // §2.11. Descriptive, so it copies across trips (§2.14 rule 5).
  ticket?: Ticket | null;        // a ticket attached to the STOP rather than to a Booking — §2.11.
                                 // Absent and null both mean "none". NEVER copies across trips: a ticket
                                 // is an access credential (§2.14 rule 3, §6.6).
};

type StopPlacement =
  | { kind: 'scheduled'; dayId: DayId; time: ClockTime | null; order: number }
  | { kind: 'pool'; cityKey: CityKey; hint?: { dayId: DayId; time: ClockTime } };

type PlaceLink =
  | { kind: 'place'; placeId: PlaceId }
  | { kind: 'inline'; at: LatLng }
  | { kind: 'none' };            // MUST be supported end-to-end

type Place = { id: PlaceId; cityKey: CityKey; name: string; at: LatLng | null;
               category: StopCategory; note?: string; links?: Link[]; hours?: OpeningHours };
// `at: null` means the source had no coordinates. The live planner has exactly one ("Windsor
// Great Park / Long Walk"); importing it honestly and letting `validateTrip` report it is the
// point, and `geoCheck` skips it (§2.13, last row of the anchor table).

type Booking = {
  id: BookingId; tripId: TripId;
  kind: 'flight'|'bus'|'train'|'ferry'|'lodging'|'tour'|'ticket'|'other';
  operator: string; reference: string | null;
  route?: { fromName: string; toName: string };
  startsAt: { date: IsoDate; time: ClockTime | null };
  endsAt?:   { date: IsoDate; time: ClockTime | null };
  price: CostEstimate | null; party: number | null; seat?: string;
  status: 'active' | 'superseded' | 'cancelled';
  supersedesId?: BookingId;      // the YZGDTS reissue — NOT a duplicate
  ticket: Ticket | null;
  provenance: Provenance;
};

type Ticket =
  | { kind: 'bundled'; path: string; label: string }        // a file we host — cannot 404
  | { kind: 'url'; href: string; label: string; verifiedAt: IsoDate | null; verifiedBy: 'fetch'|'user'|null }
  | { kind: 'attachment'; mailMessageId: string; filename: string; label: string };
```

**Ownership and tenancy, from Phase 1.** `Trip.ownerId` exists before accounts do, carrying the sentinel
`local:self` until Phase 2 rewrites it at first sign-in. Nested entities inherit tenancy from their trip in
core; when they become rows in Phase 2 **every table carries a non-null `trip_id` or `user_id`** and RLS keys
off it. There is no table without a tenancy column, and no blob without a tenancy prefix. §6.2.

Server-authoritative vs client-local:

| Entity | Authority | Note |
|---|---|---|
| `User`, `Friendship`, `TripShare`, `TripMember` | **Server only.** | Permissions are not enforceable client-side. Clients cache read-only and MUST revalidate. |
| `Trip`, `Day`, `Stop`, `Place`, `Booking` | Server-authoritative from Phase 2; client-replicated and offline-editable. In Phase 1 the client *is* the authority. | Last-writer-wins per stop behind the **storage-version guard** — §2.2a, not `Trip.revision`. |
| `Ticket` bytes | Server object storage, private bucket, keyed `trip/{tripId}/…` | Bundled tickets are repo files today; that pattern survives as "an asset we host". |
| `Conflict` | **Derived. Never stored.** | Only `ConflictResolution` is stored. §2.7. |
| `Leg`, cost roll-ups, clusters, `CITY_RANGE` | **Derived. Never stored.** | §2.5. |
| `MailAccount`, `IngestCandidate` | Server only. | §5.1. |
| `LocationFix`, `LocationSegment`, `PhotoAsset` | **Device only. No server table exists.** | §6.1. |
| `SharedTrace` | Server, opt-in per day. | The only location data ever transmitted. |

#### A-10 — a `CityKey` is a minted opaque id, not a slug of the city's name (revision 11, QA P2-2)

**The defect.** Both trip-creation forms mint a city key with
`name.toLowerCase().replace(/[^a-z0-9]+/g, '-')`. That expression deletes every character outside ASCII
alphanumerics, so **any name written in a non-Latin script collapses to the single key `"-"`**. Recording
*"日本 2019, 東京, 京都"* stores two cities with the **same** key, puts `primaryCity: "-"` on all 30 days, and
`validateTrip` reports nothing, because no check anywhere asserts that city keys are distinct. §8.1's own
worked example is a trip to Japan; this is the phase's headline scenario, not its edge case.

**The question that decides the fix: was a human-readable key ever an invariant?** It was not, and the audit
is short enough to state in full. (1) `ids.ts` declares `export type CityKey = string` in the same block as
`TripId`, `StopId` and `PlaceId`, under a file header that says *"ids are opaque strings"*. (2) The only
keys in this system that read like words are `vienna`, `split`, `prague` … — hand-authored in
`europe-2026-itinerary.html`'s `CITY_ORDER` and carried through `import/legacyDays.ts` verbatim. They are an
artefact of one hand-written source file, not a rule anybody wrote down. (3) Nothing routes on a city key:
`apps/web` has no URL router at all, and `AppState.ui.activeCityKey` is in-memory state. (4) No surface
renders a key as a label — the sidebar uses `city.name` and the key only as a React key, and `cli.ts` prints
`city.name`. (5) Every consumer in core compares keys for **equality** and nothing parses one: `daysForCity`,
`cityRange`, `poolFor`, `geoCheck`'s centre map, `Place.cityKey`, `Day.cities`, `poolNotes`. (6) The one
sentinel, `TRANSIT_CITY_KEY`, is a separate exported constant, not a reserved prefix. So the slug was
convenience, and it bought nothing that survives contact with a second alphabet.

**Transliteration is not available and would not be enough.** §1's zero-runtime-dependency rule means no
`unidecode`, and Jacob — not our judgement — is who adds a dependency. Hand-rolling one is a table for Latin
diacritics, which is the easy fifth of the problem; 東京 → *tōkyō* needs a kanji reading dictionary and is
**context-dependent** (the same characters read differently in different names), so a table produces a
confident wrong answer, which is worse than a hole (§8.4's `null`-is-a-first-class-answer argument, applied
to text). Even a perfect transliterator leaves the deeper flaw untouched: a name-derived key is **mutable by
rename**, so renaming a city today silently orphans every `Day.primaryCity`, `Place.cityKey` and pool
placement that pointed at it.

**The rule, with nothing left to the builder's judgment:**

> **A `CityKey` is an opaque id minted by the injected `IdFactory` — `ctx.ids.newId('city')` — exactly as
> every other id in this system is. It is never derived from, and never has to agree with, the city's
> display name. `CityInit.key` becomes optional; when it is absent `createTrip` mints one; when it is
> present it is honoured verbatim. No caller outside `packages/core` constructs a city key. Both web forms
> stop computing one. Where a city must be shown to a person, `City.name` is shown; where two cities across
> different trips must be recognised as the same place, they are grouped by normalised **name**, and the
> surface says so.**

**Four consequences in `validateTrip`, because a key that is minted is not thereby a key that is trusted** —
a document can arrive by `importDoc`, by hand-edit, or from a build that predates this ruling:

- `duplicate_city_key` (**error**) — two entries of `trip.cities` with the same key. Structurally broken,
  not merely untidy: `daysForCity` and `poolFor` return the same rows for both, and a pooled stop under
  that key belongs to neither. It rides on the existing `claim()` mechanism that already covers day, stop,
  place and booking ids, with `ref: {kind:'trip', id: trip.id}` and `params: { cityKey }`.
- `reserved_city_key` (**error**) — a city whose key equals `TRANSIT_CITY_KEY`. Reachable today by naming a
  city *"Transit"*; unreachable by construction once keys are minted; still reachable by import, and a
  shadowed sentinel is silent corruption of `Day.primaryCity`'s meaning.
- `city_name_empty` (**error**) — decoupling the key from the name makes the name the **only** human
  identity a city has. This is `participant_name_empty`'s argument (§8.3) verbatim, and it becomes true for
  cities on the day this ruling lands, not before.
- **`fromJSON` is not the place for any of these, and `createTrip` does not throw on them.** A document
  already carrying the `"-"` collision must still **open**, so the user can see it and act; refusing to
  parse would make it unopenable, which is the harm P2-7 describes. Domain problems come back as `Issue[]`
  (§2.1).

**Cross-trip city identity is derived by name, and this is §8.3's precedent applied unchanged.** Two trips
to Tokyo carry two different `CityKey`s and always did in every design considered here — a slug would have
merged *Paris, France* with *Paris, Texas* and split 東京 from itself, so it was never the right grouping
key either. The lifetime map groups by

```ts
normalizeCityName(name) = name.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()
```

— `toLowerCase`, not `toLocaleLowerCase`, because the latter is locale-dependent and core is not. Two
spellings of one city are two rows until the user says otherwise, **and the surface states that it is
grouping by name**, exactly as *"people you have travelled with"* must. *(`String.prototype.normalize` is
ES2015 and present in Node and every browser; whether Hermes ships it is **unverified** and is a Phase 5
question. It is used only for display grouping, so a runtime that lacked it would render two rows instead of
one and could not corrupt anything.)*

**What this changes elsewhere — the complete list, so nothing is discovered later:**

| Site | Change |
|---|---|
| `build/createTrip.ts` | `CityInit.key?: CityKey`; mint `ctx.ids.newId('city')` when absent. The only new code. |
| `apps/web` `PastTripForm.tsx`, `Library.tsx` | Both `.map((name, i) => ({ key: slug(name), … }))` expressions drop `key` entirely. The slug function is deleted, not fixed. |
| `conflict/rules/geoOutlier.ts` | Two label helpers interpolate a key into a user-visible summary — *"the vienna map"*, *"the split optional list"*. They resolve the key to `City.name`, falling back to the key when the trip has no such city. `params.cityKey` stays the key: it is structured data, and §2.7 requires the id there. |
| §8.4 `TripSummaryRow` | I-6's widening is `cities: Array<{ key: CityKey; name: string; countryCode: CountryCode \| null }>` **instead of** `cityKeys: CityKey[]`. An opaque key alone cannot name a city or place it on a map, and a row that has to be joined against a document it does not carry defeats the whole point of the summary (§8.4 clause 4 sends drill-downs to the document; the map's *labels* are not a drill-down). |
| §8.4 `TravelStats.cities[]` | `{ key: CityKey; … }` becomes `{ nameKey: string; name: string; countryCode: CountryCode \| null; tripIds: TripId[] }`. `nameKey` is `normalizeCityName(name)`; it is a grouping key, not a `CityKey`, and calling it one would be the drift this table exists to stop. |
| `build/copyStop.ts` | **Added at revision 12 — this row was missing and the one below was wrong. §2.14 A-14.** Rule 4 spreads the source `Place`, so a minted key crosses a trip boundary into a document that cannot have it. The copied place is **re-filed** against the target's cities by normalised name, and a place that cannot be filed does not travel. |
| `build/copyStop.ts`, the `placement` **argument** | **Added at revision 14. §2.14 A-19 (QA R15-6).** The row below is right about a *stored* `StopPlacement` and wrong about the one this function takes as a parameter: a `{kind:'pool'}` placement carrying the source's key is written into the target and mints `pool_stop_unknown_city`. It is **not** re-filed — it is an instruction in the target's terms, like `placement.dayId` — so it is **validated against `target.cities`** (with `TRANSIT_CITY_KEY` exempt) and refused when it does not resolve. |
| **Nothing else** — *with the two exceptions above.* | `Day.primaryCity`, `Day.cities`, `StopPlacement.pool.cityKey` *as stored in a document*, `Place.cityKey` *within one document*, `Trip.poolNotes`, `geoCheck`'s anchors, `TRANSIT_CITY_KEY` and every equality comparison in `validateTrip` are untouched — they compare keys and never read them. What this row missed is the one place in the system where a record **moves between documents**; equality inside a trip was never the exposure, and A-14 says so at the level the mistake was made. **Revision 14 adds the second half of that sentence:** at that same boundary a key also arrives as an *argument*, and an argument is neither re-filed nor compared — it is checked against the document it claims to be about (A-19). |

**No migration, and no `schemaVersion` bump.** `CityKey` is `string` and stays `string`; existing documents
keep the keys they have, so the reference trip's `vienna`/`split`/… are still legal, `import/legacyDays.ts`
still passes them explicitly, every golden and the sample JSON are **byte-identical**, and the 2a defect's
own casualties — a trip with two `"-"` cities, if one exists at all after four days — show up as a
`duplicate_city_key` error on screen rather than silently. Repairing such a document by rewriting keys would
mean rewriting `Day.primaryCity`, `Day.cities`, `Place.cityKey` and every pool placement in one migration,
for a population that is plausibly empty; the honest answer is to make it visible and let the user re-record
the trip.

**Ceiling.** No Phase 1 number moves: the reference trip's validation issue count is unchanged (it has six
distinct, non-reserved, non-empty city keys), `detectConflicts` is unchanged at every clock, and the
round-trip goldens are byte-identical. The single expected-string change in the whole repo is the
injected-fault `geo_outlier` case, which now reads *"the Vienna map"* rather than *"the vienna map"* — and
that is the fix, not a casualty.

### 2.2a `Trip.revision` is a content counter. The write fence is a separate opaque `StorageVersion`

Revision 2 used one number for two jobs and they are not the same job. QA R3-1 is the bill: `undo()` restores
a previously captured `Trip` — `revision` and all — that snapshot gets autosaved, the stored revision moves
*backwards*, and a revision the compare-and-set guard had already spent on refusing another tab is re-issued
to different content. The refused tab's next keystroke passes the compare and lands. Both tabs then display
"Saved" over different documents, which is the R2-1 symptom sentence verbatim. R3-4 is the same root defect
seen from the other side: a bare per-document counter cannot distinguish "this document, unchanged" from "a
different document that happens to sit on the same number" after a delete and recreate under the same id.

The mistake was not the counter. It was asking a **property of the document** to fence **writes to a
resource**. Those are split, permanently:

**1. `Trip.revision` — content revision. Semantics unchanged, wording corrected twice.** Bumped by every
build function. Restored verbatim by undo/redo, because a snapshot restore is supposed to reproduce the
document exactly. The invariant that is actually true is one sentence long, and revision 3 got it wrong:

> **`revision` may prove that two documents differ. It may never prove that they are the same.**
> `a.revision !== b.revision` implies `a ≠ b`, because `revision` is itself part of the content.
> `a.revision === b.revision` implies **nothing**, not even within one document in one store.

Revision 3 wrote "within one document in one store, equal `revision` implies identical content" and QA R4-1
falsified it in six lines: `undo()` restores a snapshot verbatim, `revision` included, so a document at
revision *N* can be undone to *N−1* and pushed forward by a **different** edit back to revision *N* — a
different document wearing a number an earlier document already wore. One document, one store, equal
revision, different content. The clause is struck. What survives is
non-decrease along a chain of build-function applications and nothing else; a revision from another store,
another device, an imported file or a hand-edited record carries no meaning at all.

**`Trip.revision` MUST NOT be used as a compare-and-set token, an ETag, a sync cursor, evidence that one
document is newer than another, or — this is the R4-1 addition — as grounds for skipping any work,**
anywhere, in any phase. Using `!==` on it to *trigger* work is sound (difference is provable); using `===`
on it to *suppress* work is the defect, every time. §2.2b F2.

**2. `StorageVersion` — the write fence. Opaque, storage-issued, outside the document.**

```ts
type StorageVersion = string;                              // opaque. Compared for EQUALITY only.
type StoredDoc = { doc: TripDoc; version: StorageVersion }; // what load() returns
```

Four rules define it, and they are the entire contract:

1. **Storage issues it, on every successful write *of a document*, inside the same atomic step as the
   write.** Nothing above the port ever computes, derives, increments or forges one. The client's only
   sources are `load()` and a successful `saveIfVersion()`.

   *(**Narrowed at revision 23 by §4.3 A-30**, QA R26-6 — three words, and they are the whole of the
   change. What the fence means, stated once because I-6 was the first thing to need it stated:*
   **equality of a `StorageVersion` asserts that the document bytes under that id have not changed since
   the token was issued, and asserts nothing whatever about the summary row stored beside them.** *A write
   that can change the document therefore MUST mint; a write that changes only the summary MUST NOT, because
   minting for it would assert a change the document did not make and would refuse another writer holding a
   token that is still true. `refreshSummary` is that second kind, it carries no document argument, and it
   leaves the record's version exactly as it found it. The client's sources of a token are unchanged: a
   successful `refreshSummary` returns the version it was handed, not a new one.)*
2. **It never repeats within one storage, ever** — not after a `delete()`, not after the record is recreated
   under the same id, not after the whole database is recreated. This is what closes R3-4's ABA. The rule was
   stated correctly in revision 3 and the implementation drifted from it (R4-2), so it now carries its
   burden of proof: **a port must be able to name which of exactly two uniqueness arguments it relies on** —
   (a) *transactional*: every value the token is computed from is read **and** written inside the same atomic
   step as the write it fences, in the same storage that write goes to; or (b) *probabilistic*: at least 128
   bits of fresh CSPRNG entropy per mint. Anything else — a closure variable, a module variable, a field of
   `AppState`, a value read at open — is neither, and is rule 5.
3. **It is opaque and equality-only.** No ordering, no arithmetic, no parsing, no inference of recency. This
   is the discipline that lets an HTTP `ETag`, a Postgres `xmin` and a SQLite counter all be dropped in
   without touching a line above the port. Corollary, added after R4-2: **no test, golden or fixture may
   contain a `StorageVersion` literal.** A test that pins `'mem.1'` is a test that will be "fixed" by making
   the token predictable again.
4. **It is not part of `Trip`.** It lives in the storage record's envelope beside the serialized document,
   never inside it. `toJSON`/`fromJSON` round-trip is untouched, an exported backup carries no storage state
   (correct — an export is content), and — the point — no in-memory document operation can rewind it. R3-1 is
   structurally unreachable rather than fixed.
5. **Nothing a token is computed from may be cached outside the step that mints it.** Added after R4-2.
   A port may memoize *that* a one-time job has run (a `Promise<void>` carrying no value); it may not
   memoize a *value* that a later token is derived from. §2.2b F3 states the check.

**The Phase 1 construction, revised after R4-2.** `version` is **16 bytes of fresh CSPRNG output per mint**,
base64url-encoded, computed inside the same `readwrite` transaction as the write and derived from nothing
else. Rule 2 argument (b). The `epoch` and the storage-wide counter are **deleted**, along with the `meta`
object store that held them — a single random token per write does both jobs the pair was doing (distinct
within a database; distinct across a database's recreation) and, crucially, leaves nothing that can go stale.

Revision 3's `"${epoch}.${n}"` was not wrong about what had to be true; it put the uniqueness-bearing value
somewhere that had to be *remembered*, and a remembered fact about storage is exactly what a storage wipe
invalidates. R4-2 is that, exactly: a tab alive across a site-data clear (or the 7-day eviction of §1.1)
kept minting `${deadEpoch}.${n}` against a counter genuinely reset to zero, reproducing a token it had
issued before the wipe byte for byte — verified in Chromium against real IndexedDB. The counter half was
always fine (it *was* re-read inside the transaction, argument (a)); the epoch half was the cached one. Under
rule 5 the old construction is illegal and the new one has nothing to make illegal.

`apps/web` mints with **`crypto.getRandomValues(new Uint8Array(16))`, never `crypto.randomUUID()`.**
*Verified:* `randomUUID` is a secure-context-only API and is `undefined` when a page is served over plain
HTTP from a LAN address — which is exactly how `tools/serve.mjs` would be used to open this on a phone —
while `getRandomValues` is available in insecure contexts. The existing `Date.now()`/`Math.random()`
fallback is **forbidden for a fence**: `Math.random()` is not a CSPRNG and its collision behaviour is not the
one rule 2(b) is claiming. If no CSPRNG is present the port throws and the store shows `'error'` — a fence
fails closed. (`browserIds()` has the same `randomUUID`-or-`Math.random` shape for *ids*; ids are content,
not fences, so this is not a defect there, but it should move to the same helper — noted, not required.)

The in-memory port stays deterministic, because `packages/client` may not touch ambient randomness: it mints
`"${instance}.${n}"` where `n` is its own counter and `instance` is drawn from a module-level counter that
never rewinds within one Node process. Deterministic across runs, distinct across every port instance in a
run — so "the database was recreated" (a second `memoryStorage()`) does **not** silently reissue the first
one's tokens, which is what a fixed default `epoch` did. A test that wants to model a collision injects a
mint function explicitly. Nothing above the port can tell the two constructions apart, which is rule 3.

**Records written before this design existed** (they exist in Jacob's IndexedDB) carry no envelope version.
The port stamps every such record with a fresh version in one `readwrite` transaction at open, once, before
serving any read — so `load()` stays `readonly` and no code path above the port ever sees a versionless
record.

**What the fence does not see.** A record edited out of band — devtools, a hand-written IndexedDB entry —
does not advance the version, so a stale writer will overwrite it. Revision 2's scheme would have caught that
by accident, if the hand edit happened to change `revision`. This is a deliberate trade and it is the right
one: the guard's subject is *writes through the port*, and a guard that depends on parsing user-controlled
bytes is a guard whose refusal behaviour is decided by an attacker's JSON.

**The seven cases this has to survive.**

| Case | What happens |
|---|---|
| **Two tabs, concurrent** (R2-1) | Both hold `V0`, both issue `saveIfVersion(id,'V0',…)` before either awaits. Inside one atomic step exactly one finds `V0`, writes, and gets back a fresh `V1`; the other finds `V1 ≠ V0` and gets `{ok:false, storedVersion:'V1'}`. Winner `'idle'`, loser `'conflict'` with its edit in memory and an indicator that does not read "Saved". Unchanged behaviour; the token is simply no longer forgeable. |
| **Undo / redo** (R3-1) | The reducer restores the snapshot verbatim, `revision` and all, and **does not touch `persistence.savedVersion`** — that field is bookkeeping about *storage*, not about the document. The autosave that follows therefore still expects whatever storage last agreed with this store. A tab already refused still expects `V0` and is refused again; a tab in good standing writes its undone content forward and legitimately says "Saved", because that content really is in storage. The narrow client fix R3-1 proposes — making `undo` synthesise `revision + 1` — is **superseded and MUST NOT be built**: it would make the counter look like a version while an imported file could still assert any number it liked. |
| **Merge** (`mergeWithStored`) | `load()` returns `{doc, version}`. The merge is only valid against that exact `remote`, so the merged write carries **that same `version`** as its expectation. A third writer landing in between moves the version, the port refuses, the conflict stands unmerged and the edit stays in memory. On success **and only while the store still holds the document the merge started from**, the merged write mints a new version, which becomes `savedVersion`, and `savedDoc` becomes the merged document. If the store has moved on — the user typed anywhere inside `doMerge`, which is a window spanning the load, the parse, the merge and the queue, not just the write — the merged document is not installed **and the fence does not move with it**: **A-7** below, QA R11-1. The deleted-trip branch expects `null` — "nothing is stored under this id" — so a newcomer appearing in the gap is refused rather than clobbered. (This reinforces rather than replaces the R3-3 fix: the merged write must go through the store's own save chain, because an expectation computed before an in-flight autosave settles is stale by construction.) |
| **Delete then recreate under one id** (R3-4, ABA) | `delete()` removes the record; the counter does not rewind. The recreated record gets a strictly fresh version, so a writer holding the dead record's version matches nothing and is refused. `importDoc`'s "keep the original id when it is free" path — the export → delete → restore sequence — is therefore safe by construction, and so is the within-lineage recycle R3-1 exploited. One mechanism, both findings. |
| **The whole database is destroyed under a live tab** (R4-2, ABA one level up) | Site data cleared, or §1.1's 7-day eviction of a non-installed tab. Tab A has been open the whole time and holds `V`. Tab B restores the backup into the freshly-created database and gets `V2`. `V2` is 128 fresh random bits, so `V2 ≠ V` — not because anything checked, but because there is no shared derivation for the two to collide through. A's next keystroke offers `V`, matches nothing, is refused, and A reads *"Not saved — edited elsewhere"* rather than "Saved". The old scheme produced `V2 === V` here, verified in Chromium. Note what the fix is *not*: it is not "re-read the epoch more often". Any cadence leaves a window, because the wipe is not an event the port is told about. |
| **Phase 2, server-authoritative** | The token becomes server-issued: an `ETag` on the trip resource, `If-Match` on the write, or a `version` column with `UPDATE … WHERE version = $expected`. Because the client only ever compares for equality and only ever obtains a token from a port result, **nothing above the port changes** — same `persistence.savedVersion`, same refusal → `'conflict'`, same `mergeWithStored`. A synced device's local record carries **two** envelope fields, and they are never conflated: `version` fences local writers (two tabs on one device) and `serverVersion` records the last version the server acknowledged, fencing the sync push. Two fences over two resources. Phase 2 adds a field; it does not redesign this. |
| **Phase 4, `apps/mobile` over SQLite** | Identical contract, no SQLite-specific concept. `UPDATE trips SET doc=?,summary=?,version=? WHERE id=? AND version=?` (or an insert guarded on absence when the expectation is `null`) inside one `BEGIN IMMEDIATE` transaction, with `changes() === 0` meaning refused; re-read and return `storedVersion`. The counter is a one-row `meta` table bumped in the same transaction. `expo-sqlite` exposes `withExclusiveTransactionAsync()` for exactly this, and `BEGIN IMMEDIATE` is the documented way to avoid a mid-transaction `SQLITE_BUSY` — *verified against Expo's SQLite docs and expo/expo#13552, but the isolation actually delivered across two JS contexts must be re-verified on a device before Phase 4 ships.* The token being an opaque **string** rather than a number is what makes all three backings free. |

#### A-7 — a write the store declines to install may not move the fence (revision 8, QA R11-1)

The **Merge** row above says what happens when the merged write succeeds. It never contemplated the branch
where the write succeeds *and the store does not keep the document it wrote*, which is the branch a single
keystroke reaches. This addendum rules on that branch. It changes no engine, no persisted shape, no export
surface, and no behaviour at either autosave site.

**The defect, verified against the code and not against the finding.** In
`packages/client/src/store/store.ts`:

- `doMerge:590` captures `const doc = state.doc` — call it **A** — **before** its first `await`,
  `ports.storage.load(doc.id)` at `:592`.
- `:620` computes `merged = mergeTrips(ancestor, A, remote)`; `:634-640` calls
  `writeAndSettle(A, merged.trip, …, stored.version, {reseed:true})` inside a `chainOntoSaving` link
  (`:627`), so the write also queues behind anything already on the chain.
- `writeAndSettle:419` computes `stillOurs = state.doc === startedFrom`. `:422` installs `toWrite` **only**
  if `stillOurs`. `:429-431` set `savedDoc = toWrite` and `savedVersion = outcome.version`
  **unconditionally**, and `:437` re-arms the ordinary debounce precisely when `!stillOurs`.
- So if the store advanced to any document **B** at any point between `:590` and the write settling, the
  merged document is discarded from memory while sitting in storage, and the store keeps a fence minted by
  a document it does not hold. The re-armed autosave then writes **B** — which never incorporated the merge —
  under that fence. The port has nothing to object to: this tab really does own that version. The other
  writer's saved edit is destroyed in storage, `status` is `'idle'`, and the chip reads *Saved*.

**The window is the whole of `doMerge`, and a future reader must not re-derive it narrower.** It is not "the
tens of milliseconds the merge write is in flight". `startedFrom` is captured at `:590`, so the exposure
covers the IndexedDB `load()`, `fromJSON`, `mergeTrips`, `toJSON`, **and any write already queued ahead of
this one on `chainOntoSaving`** — the manager measured 233 801 bytes and a 5.7 ms CPU floor on the reference
trip *before* either storage round trip, and reproduced the loss with `load()` gated, the write untouched,
the shipped 400 ms debounce and no explicit flush at all. With an autosave already queued when the button is
pressed, the window is unbounded. This is why the fix cannot be a check taken once at the top of `doMerge`.

**What is actually wrong is not that the merge was dropped.** Dropping it is `stillOurs` doing its job:
`state.doc` is the user's own document and A-7 does not overwrite it. The defect is that three facts are
recorded as one, and one of them is a lie:

| Recorded | True after a non-installed merge write? |
|---|---|
| storage issued `outcome.version` for the bytes of `toWrite` | **yes** — a fact about storage, stated by storage |
| `savedDoc` is *"the last document this store and storage agreed about"* (§2.2b F2's definition) | **no** — this store never held `merged.trip` |
| therefore this store may write `state.doc` forward over what storage holds | **no** — `B` does not incorporate `merged.trip` |

That third line is the loss, and it is §0.6 one level out from where §2.2a found it: *the write's success is a
fact about `toWrite`, and it says nothing whatever about `state.doc`.* Advancing the pair converts a fact
about one document into a licence to overwrite storage with another. **F1** names this write-path code —
deciding to *keep* a fence is deciding to *permit* a later write, taken earlier and with less information, so
it is subject to the same prohibition as deciding to skip one. **F2** is what breaks first: `savedDoc` is
read by `dirty()` **and** by `doMerge:612` as the merge's common ancestor, and after this branch it is
neither.

**The invariant.** Stated as §4.2 **rule 4a**, and it is the whole ruling:

> **`persistence.savedDoc` and `persistence.savedVersion` advance together, and only to a document this
> store still holds or may legitimately write forward over.** Concretely, at the moment the write settles,
> either the store still holds the document the write began from (`state.doc === startedFrom`), or the
> write carried exactly that document (`toWrite === startedFrom`) — in which case whatever `state.doc` has
> since become came from this store's own `dispatch`/`undo`/`redo` chain and legitimately supersedes it.
> **A successful write whose document the store declines to install advances neither field, installs
> nothing, re-arms nothing, and leaves `status: 'conflict'`.**

The second disjunct is what makes this a two-line discrimination rather than a redesign: `toWrite ===
startedFrom` holds at **both** autosave sites (`:373` and the deleted-trip merge branch at `:602`) and is
false at exactly one site in the system, `:634`. That asymmetry — the one place `startedFrom !== toWrite` —
*is* R11-1, and the invariant reads it directly instead of asking the call site to declare its intent.

**Why "refuse", of the three options on the table.**

| Option | Ruling |
|---|---|
| **Re-queue / rebase** — `mergeTrips(savedDoc, state.doc, merged.trip)` and write that | **Refused.** It is a second three-way merge the user never pressed a button for, and its ancestor is a fiction — `savedDoc` is the ancestor of *A* and of *remote*, not of a document that already incorporates both. It is also self-similar: the rebase write is raced by the same keystroke that caused it, so the honest form is a loop with a bound, i.e. a second `flushForTransition` on the merge path. ROADMAP F's sentence for this path is *"the automatic save path must refuse rather than guess"*, and per-stop last-writer-wins is the thing the user asks for by pressing a button (§4.2's own words: *"a button, not a behaviour"*). Guessing twice for one press is not that. |
| **Install the merge and surface B's edits as a new notice** | **Refused, as the manager expected.** It discards the user's in-flight content, which §4.2 rule 6b already refuses in the transition case for stated reasons: the user's content is authoritative and conflicts are surfaced, not resolved by guessing. A notice does not make it not a discard. |
| **Refuse: leave `'conflict'` standing, the user's edit intact, and the button where it already is** | **Chosen.** It matches rule 6b's shape verbatim (*the transition does not happen*), it matches R7-1's in-flight guard (a second press joins the first rather than starting a second merge), it costs one click, it invents no semantic model, and it is the only option whose failure mode is "the user presses a button again" rather than "the app wrote something nobody asked for". |

**Not advancing `savedDoc` is required by the *merge*, not only by the fence — and this is what kills every
half-measure.** Suppose the store kept `savedVersion` (a true fact about storage) and advanced `savedDoc` to
`merged.trip`. The next press of *Merge and save* would compute `mergeTrips(merged.trip, B, remote′)` — a
three-way merge asserting that **B** descends from a document containing the other tab's edits. It does not.
The diff would read those edits as **deletions B performed**, and the merge would remove them on purpose.
That is the same loss reached through the merge instead of through the autosave. So the pair moves together
or not at all, which is why the invariant is written about the pair.

**What the fence does in the meantime, explicitly.** The store keeps its **stale** `savedVersion` and knows
it is stale. That is the honest state and it needs no new machinery:

- `status` becomes `'conflict'` with the existing `CONFLICT_MESSAGE`. No new string, no new banner: the
  situation genuinely *is* "storage holds a document your copy has not incorporated; merge it or export
  this copy", which is what that message says and what the banner already offers.
- The next autosave is **refused by the port**, against a version storage has moved past. That is the fence
  doing exactly its job, and it is why this design fails safe even if the pre-write check below is defeated.
- The debounce is **not** re-armed (`:437`), which is §4.2 rule 6a″'s standing three-way rule: a `'conflict'`
  exit must not spin against a fence that will refuse it every 400 ms.
- `library` **is** still upserted from the write's own `summary`. The write landed; the row is a true fact
  about what storage now holds.
- `persistence.lastMerge` is **not** set on this branch. The merge notice is a disclosure about the document
  on screen; describing content the user cannot see would be the *inverse* of the rule it exists to serve.
- Nothing is lost anywhere: storage holds a document that incorporates both sides, the user's later edit is
  in `doc`, and the screen does not read *Saved*. Pressing *Merge and save* again converges in one step,
  because `savedDoc` is still the true common ancestor **A**.

**Two mechanisms, and neither substitutes for the other. A builder that ships one has not implemented A-7.**

1. **A precondition inside the chained link** (`doMerge:627`, *before* `writeAndSettle`): if `state.doc !==
   doc`, abandon the merge without writing and leave `'conflict'` standing. This closes the wide part of the
   window — the load, the parse, the merge, the serialization, and the queue wait — at the cost of nothing.
   It must be *inside* the link, after the queue has drained: checking before `chainOntoSaving` is a
   check-then-act with an interleaving point in the middle, §0.6's error and R7-3's exact mistake.
2. **The invariant in `writeAndSettle`**, applied when the write has already committed. This one is
   load-bearing and cannot be replaced by any amount of checking above the port, because the last stretch of
   the window is inside `saveIfVersion`'s own `await` — which is §2.2a's founding lesson (R2-1), reached
   from the other side.

**Where the fix goes, and the smallest change that enforces the invariant.** Two edits, both in
`packages/client/src/store/store.ts`, no new function, no new state field, no new message constant, no
change to `packages/core`, `apps/web` or any port:

1. **`writeAndSettle`, immediately after `:419`** (`const stillOurs = …`), before the existing `set` at
   `:420`. Everything below it stays exactly as it is:

   ```ts
   const stillOurs = state.doc === startedFrom;                    // :419, unchanged
   // A-7 / §4.2 rule 4a. The write landed, and this store does not hold the document it wrote —
   // true only of the merged write, where `toWrite !== startedFrom`. The fence may not move to a
   // document `state.doc` neither is nor descends from, or the next autosave writes an un-merged
   // document over another writer's work with the fence's blessing (QA R11-1).
   if (!stillOurs && toWrite !== startedFrom) {
     set({
       ...state,
       library: upsertSummary(state.library, summary),            // storage really does hold this
       persistence: { ...state.persistence, status: 'conflict', lastError: CONFLICT_MESSAGE },
     });
     return;                                                       // no install, no fence, no re-arm
   }
   ```

2. **`doMerge`'s merged-write link, at the top of the `chainOntoSaving` callback at `:627`**, before the
   `try` that wraps `writeAndSettle`: if `state.doc !== doc`, `set` `status:'conflict'` with
   `CONFLICT_MESSAGE` and `return` without writing. Inside the link, never before it.

Both branches leave `merging` to `mergeWithStored`'s `finally` (R7-1), so the button is pressable again and
a second press starts a fresh merge from the document the user now holds — which is the "re-queue" option
arriving where it belongs, behind a user action.

**The regression set — the smallest set that proves the invariant rather than one timing window.** Six
tests. `packages/client/test/merge-race.test.ts` already owns the harness (`gatedStorage`,
`conflictedStoreWithParkedAutosave`, `manualScheduler`); it needs one addition, a gate on `load` as well as
on `saveIfVersion`, because the two gates open different halves of the window. **Every test asserts on the
bytes the port holds** — `core.fromJSON(await storage.load(id))` — and no test proves a write with
`isDirty()` alone (ROADMAP F's standing rule since R4-1):

| # | Sequence | Must hold |
|---|---|---|
| 1 | **Ordinary case.** Two tabs, a real conflict, *Merge and save*, **no** interleaving dispatch | stored bytes contain **both** tabs' edits; `state.doc` **is** the merged document; `savedDoc === state.doc`; `savedVersion` advanced; `status:'idle'`; `isDirty()` false; `lastMerge` recorded. This is the test that fails if the fix over-refuses |
| 2 | **Edit lands during the write.** Gate `saveIfVersion`, dispatch one edit, release — `qa/r11-recheck.mjs` §1.3b's shape, **zero undo calls** | the other tab's edit survives in storage; `status:'conflict'`; the local edit is still in `doc`; and then, **with the real 400 ms debounce and no explicit flush**, the bytes still contain it — the loss lands through the ordinary autosave, so the test must let that autosave run |
| 3 | **Edit lands before the storage read completes.** Gate `load()`, dispatch during the read, release | no merged write is issued at all (count `saveIfVersion` calls); stored bytes are exactly the other tab's document; `status:'conflict'`; local edit intact |
| 4 | **A write already queued ahead of the merge.** Dispatch, let the autosave park in the port, press *Merge and save*, dispatch again while the queue drains | same as 3 or 2 depending on where it lands, and in both: no document reaches storage that does not incorporate what storage held |
| 5 | **The invariant directly, not a timing window.** After any non-installed merge write | `savedVersion` is **not** the version that write minted and `savedDoc` is **not** the merged document; the store's next autosave is **refused** by the port; and pressing `mergeWithStored()` a second time converges — stored bytes then contain the other tab's edit **and** both local edits |
| 6 | **Ceiling: the autosave sites are unchanged.** Gate `saveIfVersion`, dispatch during an *ordinary* autosave, release | `savedDoc`/`savedVersion` **do** advance, the debounce **is** re-armed, and the newer document reaches storage with `status:'idle'`. A fix that turns this into a conflict has broken rule 4 to satisfy 4a |

**Scope, stated so it is not read wider than it is.**

- **Both autosave call sites are byte-identical after this ruling** (`:373`, `:602`): `toWrite ===
  startedFrom`, so the fence advances exactly as today and `!stillOurs → scheduleSave()` still writes the
  newer document forward, which is correct — it descends from the one just written.
- **`{reseed:true}` stays where it is.** On the non-install branch the document does not change, so `set`
  returns at its step-1 identity check and the R10-3 history clear does not run — correct, and deliberately
  so: the surviving `history` is linear with the document the store still holds. Nothing here licenses
  clearing history on a branch where `state.doc` did not move.
- **R8-4 is untouched by this ruling.** Its harm is a *record resurrected by a write*, not a fence advanced
  by one, and closing it means deciding whether `doMerge`'s off-chain `load()` at `:592` may be trusted at
  all after a delete — a question about read ordering, not about `savedDoc`/`savedVersion`. The deleted-trip
  branch (`:598-611`) is therefore **not** modified by A-7, and R8-4 rides unchanged on its own reachability
  argument. A builder must not add the mechanism-1 precondition to that branch under cover of this ruling.

### 2.2b The freshness rule — three clauses, three mechanical checks

§2.2a fixed the fence and QA round 4 found the same error twice more, one level away from it each time. That
is the third consecutive round on one root cause, so the rule gets stated at the level it actually lives at
rather than being patched where it last surfaced.

**The principle.** *A fact about a resource is only valid at the moment, and in the place, the resource
itself stated it.* Five findings across three rounds are one violation each:

| Finding | The fact | Whose it really was | Where it went stale |
|---|---|---|---|
| R2-1 | "storage still holds *R*" | storage | between the `load()` and the `save()` |
| R3-1 | `Trip.revision` as the fence | the document | undo rewound it |
| R3-4 | `Trip.revision` after delete+recreate | the document | a new record inherited an old number |
| **R4-1** | `revision === savedRevision` ⇒ "nothing to write" | the document | undo made revision non-injective over content |
| **R4-2** | the port's cached `epoch` | storage | the database was destroyed and recreated |

§2.2a's wording — *"a property of the document may never fence writes to a resource"* — is necessary and not
sufficient. It governs the write path and says nothing about the decision *whether to write*, and nothing at
all about a cached fact concerning the storage instance itself. Three clauses, each with a check a future
round can run mechanically:

> **F1 — No property of the document may fence *or gate* a write.** The decision to *skip* a write is the
> same decision as the decision to *refuse* one, taken earlier and with strictly less information; it is
> subject to the same prohibition. Any code that decides whether to call `saveIfVersion` at all is write-path
> code.
>
> *Check:* enumerate every branch that can cause `saveIfVersion` not to be called for a document that differs
> from what storage holds. Each must be justified by F2 or be the one stated exception (§4.2 rule 6c,
> `deleteTrip` of the active trip).

> **F2 — "Unchanged since the last write" is answered by comparing against the thing that was written, never
> by a counter derived from it.** The permitted answers are exactly two: reference identity against the
> document object that was written (`doc === savedDoc`), which is exact because `Trip` is immutable; or
> equality of the serialized bytes. `Trip.revision` is not a permitted answer for **any** purpose that can
> skip a write, reuse a cache, or suppress an effect.
>
> *Check:* grep `packages/client` and `apps/web` for `revision` in a `===` or `!==`, and for `revision` in a
> React dependency array or any other memoisation key. Every hit is a defect unless the comparison can only
> ever cause *more* work to happen. (`!==` triggering work is sound — difference is provable. `===`
> suppressing work is the bug, every time. §2.2a rule 1.)

> **F3 — No token storage mints may depend on a value cached outside the atomic step that mints it.** A port
> may memoise *that* a one-time job has run — a `Promise<void>` carries no value and cannot be wrong about
> one. It may not memoise a *value* a later token is computed from. Uniqueness rests on §2.2a rule 2's
> argument (a) or (b) and the port must be able to say which.
>
> *Check:* read the path from entering `saveIfVersion` to producing the returned `version`. Every identifier
> on it is a parameter, a local, or a value read inside the same transaction. An identifier declared in the
> port factory's closure on that path is a defect. `ensureReady()`'s `ready` promise is legal under this
> check and its `epoch` variable was not — which is the distinction the check exists to draw.

#### F1/F2 applied: what "is there an unwritten edit" means

`dirty()` becomes reference identity against the last document storage agreed with us about, and
`savedRevision` is **deleted from `AppState`** — not corrected, deleted, because it has no remaining job and
a field that exists is a field the next person will compare:

```ts
// packages/client — the whole predicate.
function dirty(): boolean {
  return !!state.doc && state.doc !== state.persistence.savedDoc;
}
```

`savedDoc` is the store's existing `baseDoc` — *"the last document this store and storage agreed about"* —
promoted from a module-level `let` into `persistence`, so exactly one pointer answers both questions that
need it (the merge's common ancestor, and this one), it moves only inside a `set()` so a subscriber can
never read an indicator that disagrees with the state it was handed, and a test can assert it. It is
assigned in exactly the places `savedVersion` is: a successful `saveIfVersion` (to the document written),
`load()`'s result in `openTrip`, and `null` on close/delete. The reducer never touches it — undo and redo
change the document, not what storage holds.

**Why identity and not the alternatives.** The failure profiles are not symmetric, and that is the whole
argument:

| Answer | False "dirty" (harmless: an extra write) | False "clean" (**silent data loss**) |
|---|---|---|
| `doc.revision === savedRevision` | undo back to the saved document | **reachable in six lines** — R4-1 |
| `doc === savedDoc` | any rewrite producing equal content | requires a `Trip` mutated in place |
| `toJSON(doc) === lastBytes` | none | requires the bytes to be wrong |
| `hasUnwrittenChange` flag | undo back to the saved document | **whenever the flag's bookkeeping is wrong** |

- **Serialized-bytes comparison is correct and is rejected as the runtime mechanism.** It is not *more*
  correct than identity: identity gives a false "clean" only if a `Trip` is mutated in place, which is
  already forbidden by §2.1 and already asserted independently ("input immutability after every build
  function"), and which would have corrupted the undo stack and the derived cache long before it reached
  here. It costs a full serialization of a 176 KB document at every flush-decision point — including inside
  `beforeunload`, on the main thread, while the user is trying to leave — plus a retained copy of the bytes.
  Strictly more expensive for a strictly narrower gain. **It keeps a job, though: it is the *test oracle*.**
  The regression criterion asserts `isDirty() === (toJSON(doc) !== the bytes storage holds)` at every step of
  a walk — the expensive exact answer checking the cheap one, which is the only thing that makes the cheap
  one trustworthy.
- **A `hasUnwrittenChange` boolean is rejected**, and it is worth saying why at length, because it is the
  obvious answer and it is the same category error again. A boolean is a *summary of history* standing in for
  a *statement about the present* — precisely what `revision` was. It then has to be reconciled with every
  outcome, and the reconciliation is where it drifts: (i) a **refused** write must not clear it, so the clear
  becomes conditional on `ok:true` — fine; (ii) **two flushes race**: flush 1 (of document A) resolves after
  a new edit has produced document B, and clearing the flag on flush 1's success marks B as written. Storage
  holds A, the flag says clean, the next transition skips the write — R4-1 with a different field. The store
  already detects this case, and it detects it with `state.doc === startedFrom` (`stillOurs`) — document
  identity. So the flag is only safe if the identity pointer exists anyway, at which point the flag is a
  duplicate of `doc !== savedDoc` that can disagree with it. (iii) a **stale confirmation** clearing a flag
  set by a newer edit is case (ii) again. Keeping the fact instead of a summary of the fact is the same move
  §2.2a made one level down.
- **Folding content into the `StorageVersion`** (a hash of the document as, or inside, the token) is
  rejected outright: it re-couples content to the fence, which is the thing §2.2a exists to prevent, and a
  content hash is something the client computes, so storage would no longer be the sole issuer (rule 1).

**The skip stays, and it is now sound.** `flushForTransition` may still avoid rewriting 176 KB on every
navigation, on **all three** of: `persistence.status === 'idle'`, no pending debounce timer, and
`state.doc === state.persistence.savedDoc`. The third is the real condition; the first two are belt and
braces and are stated as such — each can only cause more writing, never less, which is what F2's check
requires of any conjunct. `flush()` itself remains unconditional (QA round 4 confirmed it does not consult
`dirty()`, and it must not start).

#### F2 applied: the derived cache has the identical defect

`derivedFor(cache, trip, today)` keys on `cache.revision === trip.revision && cache.tripId === trip.id`.
That is `===` on a revision suppressing work, so R4-1's sequence makes it serve the pre-undo document's legs,
costs, clusters, conflicts and map bounds for a document that no longer contains them. §4.2 rule 3 and
ROADMAP F both say derived data is *"recomputed on `doc.revision` change and never read stale"*, and the
second half of that sentence does not follow from the first.

**Honest scoping of this one, because it was reasoned to and not measured.** QA round 4 measured R4-1 in
Chromium; it did not measure this. Reaching it requires no `getDerived()` call between the `undo()` and the
next edit, and in `apps/web` the store's subscriber fires synchronously on `undo()`, so React usually renders
and refreshes the cache in that gap — the defect is *narrow* through the React app and **not** narrow through
`packages/client` used headlessly (the CLI, any test, any future non-React consumer, and `syncResolutions`
below, which does not render at all). It is fixed regardless: the key is wrong for the same reason
`dirty()` was, the correct key is cheaper than the wrong one, and "currently hard to reach through one
surface" is not a property this design gets to rely on.

The key becomes identity, and gains the clock it was always missing:

```ts
type DerivedCache = { doc: Trip; today: IsoDate; days: …; conflicts: …; issues: …; tripCost: …; summary: … };
// reuse iff cache.doc === trip && cache.today === today
```

`tripId` is subsumed — two trips cannot be the same object — and `revision` leaves the cache entirely.
Adding `today` closes a smaller pre-existing hole: date-sensitive conflict rules went stale across midnight
because nothing invalidated on the clock.

This is not only a rendering concern. `store.syncResolutions()` reads the derived conflict set and **writes
the document** from it (`core.syncResolutions(doc, derived.conflicts, today)`), so a stale cache there
retires resolutions against conflicts the current document does not have. A display bug and a document
mutation, from one `===`.

### 2.3 Position: days are stored; stop→day is an explicit edge

**Days are stored.** Deriving them from `[startDate, endDate]` plus stop timestamps loses four things the
Europe 2026 trip actually contains:

1. **Editorial city assignment.** Aug 12 starts in Dubrovnik at 06:50 and ends in Split; the app calls it a
   *Split* day. Five of sixteen days are like this. Nothing derives "which city is this day *about*" — and
   `pickDay()` already depends on it, deliberately, so a Vienna add-on doesn't land on the transit day.
2. **Day-level prose that isn't a function of its stops.** Aug 9's subtitle explains why the day is *empty*.
   `CLAUDE.md` forbids filling it. Derived days have nowhere to put that.
3. **Empty days.** A rest day with zero stops must exist, be titled, and be navigable.
4. **Day-level provenance.** Three days are wholly our draft (`sugDay`).

The dangerous half of "stored" is drift. Core closes it: `days` MUST be dense over `[startDate,endDate]`,
`Day.id === Day.date`, and any build function changing trip dates calls `ensureDays()`. `validateTrip` fails
on a gap. Stored for the editorial content; generated and invariant-checked for the skeleton.

**Stop→day is an explicit edge.** The LAX→Frankfurt flight departs 16:45 Aug 7 and lands 13:00 Aug 8; it
belongs to Aug 7. Deriving membership from an instant puts overnight legs on the wrong card.

### 2.4 Stop ordering

`(timeVal(time), order)` ascending, `timeVal(null) = +∞` — untimed stops last, in insertion order. `order`
exists because Jacob can drag stops into an order that contradicts their times, and that must survive.
`insertStopSorted` inserts before the first stop with a strictly greater time — a port of today's behaviour.

### 2.5 Legs, clusters and cost — all derived

```ts
computeLegs(day: Day, trip: Trip): (Leg | null)[]   // index-aligned with day.stops
type Leg = { mode: TravelMode; mins: number; km: number | null; source: 'override' | 'estimate' };
```

**The second parameter is the `Trip`, not a `TripCtx`** (revision 5, QA R2-21). Revisions 2–4 of this section
wrote `ctx: TripCtx` and the code has always taken `trip: Trip`; the doc was wrong and is corrected here
rather than the code, because the only thing `computeLegs` needs the second argument for is
`trip.places` — resolving a `PlaceLink {kind:'place'}` to a coordinate. `TripCtx` is the *conflict engine's*
per-run context (`{ trip, today? }`, §2.7) and it has no business in a derive function that must not know
what day it is. §2.5 is the section a Phase 4 native port is written from, so the signatures here are the
shipped ones, verbatim: a name that only reads right is the drift this revision exists to remove.

A **byte-exact port** of `legBetween`. The tester will diff against the running page; do not improve it:

- `arrival` override wins; `km` is still the haversine to the previous stop, or `null` if a coordinate is missing.
- Otherwise, if either stop lacks coordinates → `null`. `km < 0.12` → `null`.
- `km <= 1.6` → `{ mode:'walk',    mins: max(2, round(km * 1.35 / 4.8 * 60)) }`
- `km <= 9`   → `{ mode:'transit', mins: max(8, round(km * 1.25 / 17  * 60) + 6) }`
- else        → `{ mode:'taxi',    mins: round(km * 1.2 / 50 * 60) + 5 }`
- Haversine with R = 6371 km.

**For leg arithmetic, `arrival` is read exactly as today's `move`: `legBetween(prev, s)`.** This is the
easiest thing in the model to implement backwards; the migration test asserts Aug 12's FlixBus leg is 245
min *arriving at Split*. **`computeLegs` reads `arrival` and nothing else, and MUST NOT read
`travelRole`** — golden parity against the live page depends on it. What `arrival` *means* — a transfer into
the stop, or the vehicle's own run departing at the stop's time — is `travelRole`, it is additive, and only
the conflict rules and the view layer read it. §2.12.

```ts
clusterStops(stops, thresholdKm = 90): Stop[][]
focusCluster(stops): { focus: Stop[]; groups: Stop[][]; split: boolean; spanKm: number }
fitSpanKm(points): number
MIN_SPAN_KM = 1.2
```

Straight ports, including the heuristic that the cluster containing the *last* stop wins if it is within one
of the largest, and the fallback when the winner has fewer than two points. **The min-span guard moves into
core** — it currently lives inside `applyDayFit()` in the view layer, and `CLAUDE.md` records that both map
bugs came from view-layer map maths. Every map surface takes bounds from core so neither can regress
independently. Core does not know what a map is; it returns points and a span. §4.4.

```ts
rollUpCost(scope, opts?): CostRollUp
type CostRollUp = {
  byCurrency: Record<Currency, { lo: number; hi: number }>;
  converted: { currency: Currency; lo: number; hi: number; rateSetId: string } | null;
  missingRates: Currency[];
  basisWarnings: string[];
};
```

**Core never invents an exchange rate.** With no `RateTable` it reports per-currency subtotals and lists what
it could not convert.

### 2.6 Money

Today a stop carries `cost:"€90–113"` (display) plus `c:[90,113]` (numeric, assumed EUR). Across the 112
stops that produces four real defects:

- `"~450 CZK"` → `c:[18,18]` and `"~100 CZK"` → `c:[4,4]` — hand-converted at an unrecorded rate and date.
- `"$159.98pp"` → `c:[160,160]` — per-person, currency silently wrong.
- `"$573.25 total"` → `c:[573,573]` — a *party* total for 5 adults summed alongside per-person amounts.
- `"Gardens free · palace €15–24"` → `c:[0,24]` — one string encoding two products.

```ts
type Money = { lo: number; hi: number; currency: Currency; basis: 'per_person' | 'per_party' };
type CostEstimate = { amounts: Money[]; display: string | null; note?: string };
```

`amounts` is a list so "gardens free, palace €15–24" is two entries. `display` is preserved verbatim and is
what a UI shows; core computes only from `amounts`. A roll-up spanning both bases emits a `basisWarning`
rather than adding them — it cannot know whether "€25–40 dinner" was already for the group.

### 2.7 Conflicts

*Flag conflicts, don't resolve them by guessing* — as a type.

```ts
detectConflicts(trip, ctx?): Conflict[]

type Conflict = {
  id: ConflictId;         // content-addressed, see below
  kind: ConflictKind; ruleId: RuleId;
  severity: 'blocker' | 'warning' | 'note';
  subjects: Ref[];
  summary: string;        // one line stating BOTH sides
  params: Record<string, string | number>;   // structured; the i18n hook
  detail?: string;
  resolution: ConflictResolution | null;
};

type ConflictResolution = { conflictId: ConflictId;
  state: 'acknowledged' | 'accepted_booking' | 'accepted_plan' | 'dismissed';
  by: UserId; at: IsoDate; note?: string;
  retiredAt: IsoDate | null };     // set when the conflict it answers stops existing — see below
```

Phase 1 rules, one file each. **Severity is a promise about the user's time**: a `blocker` asserts that the
plan cannot happen as written; a `warning` says the data disagrees with itself and the model cannot tell
which side is wrong; a `note` is a nudge.

| `ruleId` | Fires when | Severity | Fixture behaviour on Europe 2026 |
|---|---|---|---|
| `legacy_flag` | A migrated `d.flag:true` day. | blocker | **2 — Aug 18 and Aug 20.** Jacob's own hand-set red days. |
| `overlap` | Two scheduled stops whose `[time, time+durationMins)` intersect. `durationMins: null` never overlaps — no guessing. | warning | 0. Injected-fault case only. |
| `impossible_transfer` | `travelRole === 'transfer'` and `leg.mins` exceeds the gap from the previous stop. **Warning, not blocker, when `travelRole === 'unknown'`. Never fires on `'journey'`.** §2.12 | blocker / warning | **0.** All four of Phase 1's hits were departure-time artifacts, Aug 18 included. |
| `booking_vs_plan` | A linked booking's date/time/route disagrees with its stop. | blocker | 0. Aug 15 Smartwings now agrees, so it MUST NOT fire. |
| `geo_outlier` | A `geoCheck` finding of `confidence:'certain'`. §2.13 | blocker | **0 on clean data; 1 when the Fisherman's Bastion typo is injected.** |
| `unverified_reference` | `confidence === 'asserted'` with no `origin.messageId`. | warning | 2 — IU1TUY, I54C9A. |
| `duplicate_booking` | Two *different* references cover the same route and date. | warning | 0. Injected-fault case only (the ingest case). |
| `missing_lodging` | A night between two same-city days with no `stay` stop and no lodging booking. | warning | 2 — Budapest, London. |
| `superseded_booking` | Two bookings share `operator + reference`, different issue dates. Emits *supersedes*, not *duplicate*. | note | 1 — YZGDTS 16 Jul vs 04 Aug. |
| `unbooked_ticketed` | A stop with a booking link and a cost but no `Booking`, within N days of `now`. | note | Széchenyi, Prague Castle, Windsor. |

**Every rule also carries a `class` — `feasibility` or `integrity` — and a feasibility rule does not run
for a subject whose day is strictly before `ctx.today`** (revision 9). The classification, the reasoning
and the two ceilings are **§8.2**; it is stated there and not here because it is a consequence of the trip
lifecycle, and because the numbers in this section's fixture table are asserted at a fixed clock and must
not move.

**`closed` is dropped from Phase 1.** 0 of 95 places carry `hours`, §2.11 has no `hours` row, and the
fixture case named in the old table — "Naschmarkt flea market ends 14:00, arrival 15:50" — is not a stop in
the trip. A rule with a fictional fixture case reads as coverage and is not. `Place.hours` stays in the type
(opening hours are deferred anyway, §7); the rule returns in the phase that has an hours source.

**The reference trip now carries exactly two blockers, both of them Jacob's own flags.** That is the
outcome the count is allowed to assert; `ROADMAP.md` requires one justifying line per blocker in the golden,
so a third can only appear if somebody can write down why he must act on it.

**No rule may put a coordinate in `params` or `values`.** §6.1's cross-cutting rule is *"no coordinates in
any log line, ever — log `stopId`, never `lat/lng`"*, and `Conflict.params` is the structure that gets
logged, alerted on, committed to a golden and shipped to a server in Phase 2. Geography conflicts carry the
`stopId`/`placeId` in `subjects`, and `km`, `limitKm`, `anchorKind` and `cityKey` in `params`. A test greps
every rule's output on the fixture for float pairs in `[-180,180]` carrying three or more decimals.

**Conflict ids are content-addressed** over `(ruleId, sorted subject ids, the values that made it a conflict)`.
If the value behind a conflict changes, the id changes, so a previous "acknowledged" does **not** silently
carry over. That is `HISTORY.md` Pass 5's lesson, mechanised. Note the limit, precisely: an edit that does
*not* touch a conflict's inputs correctly leaves its acknowledgement standing — that is the mechanism
working, and the criterion that claimed otherwise was wrong, not the code.

**Resolutions are retired, not resurrected.** Content-addressing alone lets a dismissed conflict come back
still dismissed when the data reverts to its old value (`19:30 → 20:30 → 19:30` restores the original id and
the original dismissal). A dismissed *blocker* re-arming with no user action is exactly what this section
exists to prevent. So:

```ts
syncResolutions(trip, at: IsoDate): Trip      // was (trip, conflicts, at) — see A-9
```

A build function the client calls whenever it recomputes the derived conflict set. It sets `retiredAt` on
every live resolution whose `conflictId` is absent from the set detected for this document at this clock,
and never un-retires. **Which set, exactly, is A-9's ruling and it is load-bearing: the set with §8.2's
feasibility gate disabled**, because a finding the gate withheld has not been fixed. The function detects
that set itself rather than being handed one, so no caller can pass the gated set by accident. Two revision-12
addenda finish that sentence: **no rule may let the clock decide what is in that set** (A-11 — the far-future
horizon moves into the gate), and **a detection in which any rule threw is not a set retirement may be
computed from at all** (A-12). `detectConflicts`
ignores retired resolutions when attaching `Conflict.resolution`, but reads them for `detail`: *"you
dismissed this on 12 Aug; it has come back."* This also stops `trip.resolutions` growing without bound —
`validateTrip` emits `stale_resolutions` once retired rows exceed 50.

`detectConflicts` is pure. `resolveConflict(trip, resolution) => Trip` appends to `trip.resolutions` and
changes nothing else — a resolved conflict still renders, dimmed. **No code path in core edits a stop in
response to a conflict.**

#### A-5 — retirement is monotone metadata, and undo does not un-retire it (revision 6, QA R8-1)

**The defect, in one sentence.** `syncResolutions` writes `retiredAt` into the document *outside* the
reducer — correctly, because retirement is bookkeeping and §2.7 forbids it from consuming an undo slot — but
§4.2 rule 5's undo is a snapshot restore over that same document, and `history.past` already holds the
pre-retirement `Trip`. Ctrl+Z therefore restores `retiredAt: null` and a dismissed **blocker** renders again
as *"Marked dismissed on <date>"* after a keystroke that acknowledged nothing. QA measured it in Chromium in
four user actions (`qa/r8-undo.mjs`). §2.7's *"never un-retires"* and §2.7's *"not undoable document state"*
were both true of the code and were not reconciled with each other.

**The position.** *Undo restores the plan. It does not restore the user's ignorance of what has already been
retired.* Retirement is not a step in the document's history; it is a **monotone fact about a `conflictId`**,
discovered once and true from then on. It is stored in the document because it has to survive a reload, and
that storage location is what made it look like history. It is not history.

Two mechanisms were rejected before this one and the reasons are the ruling's own evidence:

- **Re-running `syncResolutions` after undo cannot work.** After the restore the conflict is live again, so
  the rule sees nothing to retire. QA's finding says this, and it is right: the mechanism cannot distinguish
  *"never retired"* from *"un-retired by a snapshot"* without remembering something.
- **Moving `retiredAt` out of `Trip` entirely is the expensive answer to the cheap question.** It is a second
  persisted structure with its own storage record, its own place in the §6.3 deletion cascade, its own
  export/round-trip parity and its own migration. The thing that must be remembered is one date per
  `conflictId`; a document already carries it.

**The mechanism — a retirement ledger, in client state, outside `history`.**

```ts
// packages/core/src/conflict/resolve.ts — pure, next to syncResolutions
reassertRetirements(trip: Trip, retired: ReadonlyMap<ConflictId, IsoDate>): Trip
```

Sets `retiredAt = retired.get(r.conflictId)` on every resolution row whose `retiredAt === null` and whose
`conflictId` the ledger holds. Returns the **same reference** when nothing changed; bumps `revision` when
something did, exactly as `syncResolutions` does. It changes no other field of any record, ever — that
sentence is the whole of §4.2 rule 5's carve-out and the builder writes a test that asserts it.

`AppState` gains one field, and it is neither persisted, exported, nor in `history`:

```ts
retired: { tripId: TripId; marks: ReadonlyMap<ConflictId, IsoDate> } | null;
```

There is **exactly one place it is read or written**: `set()`. This is deliberate and it is the R3-3 pattern
— one assignment site, so no path can opt out — rather than a closed list of callers to keep in step.

**`set(next, opts?: { reseed?: boolean })`, in five mechanical steps:**

1. If `next.doc === state.doc` (reference identity) → assign and emit, unchanged. Every UI-only `set` takes
   this branch; the cost is one comparison.
2. If `opts.reseed` is true → `retired` becomes **exactly** `next.doc`'s own retired rows (`null` when
   `next.doc === null`), and **no re-assertion runs**. The document that just arrived is the authority.
3. Otherwise, if `state.retired === null` or `state.retired.tripId !== next.doc.id` → same as step 2. (A
   ledger is per trip; conflict ids are content-addressed over subject ids, which do not cross trips, and a
   ledger that outlived its trip would only grow.)
4. Otherwise **absorb**: for every row of `next.doc.resolutions` with `retiredAt !== null`, record
   `marks[conflictId] = retiredAt` **if the key is absent** — first write wins, so the recorded date is the
   earliest retirement this session observed and does not drift.
5. Then **re-assert**: `next.doc = reassertRetirements(next.doc, marks)`. Assign and emit **once**, with the
   corrected document — never a `set` for the restored snapshot followed by a second `set` for the fix, or
   subscribers render the stale *"Marked dismissed"* for a frame, which is the defect.

**`reseed: true` is passed by exactly the paths that install a document from outside this store's own
edits** — §4.2 rule 6a's closed list (`closeTrip`, `openTrip`, `createTrip`, `adoptTrip`, `importDoc`,
`deleteTrip`) plus `doMerge`'s result. Seven paths; an eighth path that installs a document without passing
it is a defect, checked the way rule 6a's list is checked. Merge reseeds rather than absorbs because the
merged document is one storage and this tab have just *jointly agreed on*, at the user's explicit request,
and the ledger's job is to defend against this store's own undo stack — not to outvote a merge.

**Release, so a fresh answer is not stillborn.** `unresolveConflict` followed by a new `resolveConflict` for
the same `conflictId` would otherwise have its brand-new live row stamped retired by the ledger on the very
next `set`. So: **`dispatch` deletes the ledger entry for that conflict id before calling `set`, for exactly
two action types** — `resolveConflict` (key: `action.resolution.conflictId`) and `unresolveConflict` (key:
`action.conflictId`). Nothing else releases. This does not weaken *"never un-retires"*: both are deliberate
user acts *on that exact conflict*, which is the opposite of the bookkeeping-with-no-user-action that §2.7
exists to stop. Undoing past a release restores a live row, and that is the user's own answer being undone.

**Two obligations on the builder that are easy to miss and expensive to get wrong:**

- **After `set()`, the store reads `state.doc` — never the local it passed in.** `retireResolutions` today
  ends `return derivedFor(derived, next, …)`; `next` is the pre-re-assertion document and keying the derived
  cache on it is §2.2b F2 in miniature. It becomes `state.doc`.
- **Re-assertion is idempotent and converges in one pass** (it only ever moves `null` → a date the ledger
  already holds), so `set` → re-assert cannot recurse and `getDerived`'s existing one-pass convergence
  argument still holds.

**What is not persisted, and what happens on a hard kill.** The ledger is memory only and is reconstructed
on load from the stored document's own `retiredAt` fields — there is no new storage record and no change to
`toJSON`/`fromJSON`, the §6.3 cascade or `importDoc`. If the process dies before the retirement's autosave
lands, the retirement is lost together with the edit that triggered it, which is the same guarantee every
other edit in §4.2 has and no weaker.

#### A-5a — the ledger never *acquires* an id the document already holds a live answer for (revision 6 addendum, BUILD-NOTES KD-36)

**The objection is upheld.** KD-36 is right: A-5's release deletes the key and step 4's absorb puts it back
from the *surviving* retired row in the same document, so a second dismissal of a conflict that has come back
is stamped retired the instant it is made. The builder reproduced it, declined to work around it, and that
was the correct call. A-5 as written is defective in one clause; the fix is to that clause and nothing else.
The five steps, the release, `reassertRetirements`, the per-trip scoping and the reseeding list all stand.

**The ruling, as one rule a builder can apply without interpretation:**

> **The retirement ledger may record a `conflictId` from a document only if that same document contains no
> resolution row for that `conflictId` with `retiredAt === null`. This test governs every point at which the
> ledger reads marks out of a document — step 2/3's reseed *and* step 4's absorb, with no exception for
> either. Nothing else about the ledger changes: marks are still first-write-wins, are still removed only by
> `dispatch`'s release, and are still never removed by absorb.**

Say it as an invariant, because that is what makes it checkable: **the ledger acquires an id only from a
document that has no live answer for it, and loses an id only through release.** Acquisition is vetoed;
retention is not.

That is KD-36's option 1 — *corrected*, because option 1 as literally stated is not sufficient. Option 1 puts
the test only in step 4. But steps 2 and 3 build the ledger from the arriving document too, and the document
persisted after a second dismissal is exactly `[retired row, live row]`. Reload it, and the reseed at
`openTrip` records the id from the retired row; the next ordinary edit then re-asserts it onto the live row.
The second dismissal survives the click and dies at the next reload — the same defect through a third door,
with no `dispatch` and no release anywhere in the trace. One predicate, both sites, or the fix is half a fix.

**Why the veto is safe: what a coexisting live row actually means.** Within one document, a live row and a
retired row for the same `conflictId` arise from exactly one sequence — the user answered the conflict again
after a previous answer of theirs had been retired. `resolveConflict` is the only writer that appends a row,
and it drops any existing *live* row for the id while keeping the retired ones (that pairing is the whole
point of the retained row); `syncResolutions` and `reassertRetirements` only stamp rows in place and never
append; `unresolveConflict` drops every row for the id; and `mergeTrips` merges resolutions by `conflictId`,
so a merged document holds at most one row per id and cannot manufacture the pair. There is no other
legitimate state that looks like this. The veto is a set-membership test over the rows actually present, not
an assertion that the pair is unique — a hand-edited or corrupt stored document with two live rows declines
the id and is otherwise unremarkable.

**Why this does not weaken A-5's two requirements.**

- *Never un-retires with no user action.* The R8-1 trace is untouched. The document that follows a
  retirement carries the retired row and **no** live row for that id, so the ledger acquires the id exactly as
  before; the snapshot undo then restores a document whose only row for that id is live, and re-assertion
  stamps it. Acquisition already happened, and the veto never takes a mark away. The corner that looks
  dangerous — undo restoring `[retired, live]` after that live row had itself been retired — is safe for the
  same reason: at the moment that second row was retired the document had no live row for the id, so the mark
  was acquired then and is still held now.
- *Retirement is not an undo-stack entry.* Nothing here touches the reducer, `history`, or where `retiredAt`
  is written. The change lives entirely in how the client-side ledger is populated.

**The release stays.** It is not made redundant by the veto and must not be removed: marks are sticky, so
without `dispatch`'s release the pre-existing mark for that id would still be re-asserted onto the row the
user just created. Release removes the stale mark; the veto stops absorb from immediately restoring it. Both,
or neither works.

**Why not option 2 (a release that survives one `set`).** It is wrong, not merely fragile. Suppression that
expires after one cycle defers the defect by one keystroke: the document still holds the retired row, so the
*next* `set` from any cause absorbs the id again and re-asserts it onto the still-live second answer. Making
the suppression permanent-for-the-session would be a third structure to carry and would still not cover the
reload path, which has no release in it at all. Its expiry trigger is also unspecifiable in a way that
survives review — "the next `set`" and "the `set` this `dispatch` produces" happen to coincide today only
because `dispatch` runs `releaseRetirement`, `reduce` and `set` in one synchronous statement sequence with no
intervening store call, and a rule whose correctness rests on that is a rule the next `getDerived()` call site
can silently break. The corrected option 1 carries no timing state: it is a function of the document in hand,
so it holds under any call order, any number of intervening `set`s, and a reload.

**Accepted and named: the date, not the fact, can be early.** First-write-wins means a mark holds the
*earliest* retirement observed for that id, so a live row re-asserted after a later retirement is stamped with
the earlier date. A-5 chose first-write-wins deliberately so the recorded date does not drift; the visible
consequence is confined to `retiredAt`, which no view renders — `detectConflicts` renders `resolution.at`
("you dismissed this on …") and reads `retiredAt` only as a boolean. Not worth a second field.

**What the builder must assert** (three tests, all at the store level, no product redesign):

1. Dismiss → edit away (retire) → edit back → dismiss again: the conflict renders **resolved**, the document
   holds `[retiredAt: <date>, retiredAt: null]`, and it stays that way across a further unrelated edit.
2. The same document round-tripped through storage and reopened (`reseed`), then one unrelated edit: still
   resolved. This is the case option 1 as stated would have missed.
3. R8-1 itself, unchanged: dismiss → retire → Ctrl+Z restores the pre-retirement snapshot → the row is
   re-stamped retired and the blocker does **not** read "Marked dismissed".

#### A-5b — `redo` releases as well, and the release keys off the document delta (revision 7 addendum, QA R9-1)

**The defect.** A-5's release list is a closed list of two `dispatch` action types. `redo()` is not a
`dispatch` — §4.2 rule 5's history is `{ past: Trip[]; future: Trip[] }`, plain snapshots with no action
recorded — so it calls `set()` with no release. QA's seven-action trace ends with a **stillborn** dismissal:
the redone live row is stamped `retiredAt` inside the same `set()`, the blocker renders unresolved, and no
later edit or reload brings it back.

**Why A-5a's veto does not stop it, precisely.** The veto governs *acquisition*, not *retention* — A-5a's own
sentence, *"acquisition is vetoed; retention is not"*. At the sixth step the document `undo` installs holds
only the **retired** row for that id and no live row, so the veto passes and the ledger legitimately
(re-)acquires the mark. At the seventh step `redo` installs `[retired, live]`: absorb correctly declines to
re-acquire, and declining changes nothing, because the mark is **already held**. Step 5 re-asserts it onto the
redone live row. The veto was never the mechanism that protected the second dismissal — the *release* was, and
`redo` does not perform one.

**Approach B — "make the veto uniform so no new release call is needed" — is not merely inelegant, it is
impossible.** Two reachable states are indistinguishable to any predicate over `(the arriving document's
resolutions, the ledger's marks)` and require opposite outcomes:

| | document installed | ledger | required outcome |
|---|---|---|---|
| A-5a's blessed corner: dismiss → retire → undo → dismiss again → retire again → **undo** | `[retired₁, live₂]` | holds the id | **stamp** `live₂` — undo must not un-retire (A-5a says this corner is safe for exactly this reason) |
| R9-1: dismiss → retire → undo → dismiss again → undo → **redo** | `[retired₁, live₂]` | holds the id | **do not stamp** `live₂` — it is the user's own answer being reinstated |

Same rows, same marks, opposite answers. The only thing that differs is the direction history moved, and that
is known at the call site and nowhere else. **So the fix is at the call site: `redo` releases.** No change to
`marksOf`, to absorb, to the veto, to `reassertRetirements`, or to `dispatch`.

**The rule, exactly, with no judgment left to the builder.** Because history stores documents and not actions,
the release keys off the **document delta**, and the delta that identifies a redone `resolveConflict` is
exact: `resolveConflict` is the only writer in the system that *appends* a resolution row (A-5a's writer
analysis; `unresolveConflict` and the reducer's other 15 actions never do), so a redo step that raises the row
count for a `conflictId` is a redone `resolveConflict` for that id and nothing else.

> **`redo()` releases a `conflictId` from the ledger, before calling `set()`, exactly when all four hold:**
> 1. the redo actually moves — `next.doc !== state.doc`, both non-null — and the ledger exists and is for
>    this trip (`state.retired !== null && state.retired.tripId === next.doc.id`);
> 2. `next.doc.resolutions` contains a row for that id with `retiredAt === null` (a **live** row);
> 3. `state.retired.marks` currently holds that id;
> 4. **the row count for that id increased**: `rowsFor(next.doc, id) > rowsFor(state.doc, id)`, counting live
>    and retired rows alike.
>
> Release each such id with the existing `releaseRetirement()`, then call `set(next)` exactly as today. Order
> matters and is the same as `dispatch`'s: release first, `set` second, one emit.

Clause 4 is the one that is easy to drop and must not be. Without it the rule also fires when the *same* row
appears live in the redone snapshot and retired in the current one — a document the store passed through
without a `getDerived()` between two dispatches — and releasing there would un-retire a mark with no user act
behind it, which is R8-1 rebuilt inside `redo`. With clause 4, the release fires if and only if the redone
action was a `resolveConflict` on that id, which is precisely the act A-5 already blesses.

**The closed list is now three sites, not two:** `dispatch`'s `resolveConflict`, `dispatch`'s
`unresolveConflict`, and `redo`'s delta rule above. Nothing else releases. A redone `unresolveConflict` needs
no entry: it drops every row for the id, so clause 2 fails, and with no live row there is nothing a mark can
be stamped onto.

**`undo()` does not get this, and a builder must not add it.** Three reasons, in order of how decisive they
are:

1. **It is the mechanism.** A-5 exists because undo is a snapshot restore that resurrects `retiredAt: null`.
   Releasing on undo would delete the ledger's entire purpose, and R8-1 would come back on the first Ctrl+Z.
2. **Undo moves away from the user's answer, never toward it.** Undoing a `resolveConflict` *removes* the row
   — the row count falls, clause 4 fails, and there is nothing to protect. Undoing an unrelated action leaves
   the count equal (R8-1's own case), clause 4 fails, and the restored live row is stamped, which is exactly
   what §2.7 requires.
3. **The one shape where the same rule *would* fire on undo is a shape where firing is wrong**: undoing an
   `unresolveConflict` restores rows the unresolve dropped, raising the count with a live row present. A
   release there would leave a live blocker reading *"Marked dismissed"* after a keystroke that acknowledged
   nothing — R8-1's symptom sentence, verbatim. Undo's correct behaviour in every case is *stamp and stay
   silent*.

**One invariant makes all of this checkable, and it is cheap.** After every store operation:

> **For every id in `state.retired.marks`, `state.doc` contains no resolution row for that id with
> `retiredAt === null`.**

It holds today at every branch of `set` (re-assert stamps any live row for a held mark; `marksOf` and absorb
both refuse to acquire an id with a live row; release only removes marks), and it holds after `redo`'s
release. A test asserting it after each step of the three sequences below is worth more than the sequences
themselves — it is the property both R9-1 and KD-36 violate.

**What the builder asserts** (store level, in-memory ports, plus the Chromium shape of `qa/r9-redo.mjs`):

1. QA's seven actions: dismiss → retire → undo → dismiss again → undo → **redo** → the redone row's
   `retiredAt` is `null`, the conflict renders **resolved**, and both stay so across the next three `set()`s
   and across a storage round trip and reopen (the reseed, where A-5a's veto carries it).
2. Redo of an unrelated action never releases: with a mark held and a redo step that does not raise any row
   count, the restored live row is still stamped — R8-1 at redo depth, unchanged.
3. `undo()` contains no release: the R8-1 sequence, at six undo/redo depths, still ends with the row stamped
   and no rendered row reading *"Marked dismissed"* against a live blocker.

#### A-8 — A-5b clause 2 is blessed, and the reason is that history stores re-asserted documents (revision 9, QA R10-1)

**The finding.** With **two** Ctrl+Z's instead of one — dismiss → retire → undo → undo → redo — the document
`redo` installs already carries the dismissal row stamped `retiredAt`, because `set` step 5 re-asserted it
*before* the second `undo` pushed it into `future`. A-5b clause 2 requires a **live** row, so it declines,
no release happens, and the redone dismissal is dead in the document.

**Ruling: clause 2 stands as written. Nothing changes.** Three reasons, in order:

1. **It is not user-visible.** The render after the redo is identical to the one the user was looking at one
   keystroke earlier — A-5's blessed re-assertion — and pressing *"Not a problem"* again works and sticks.
   §0.5's standard is *"a blocker is a thing Jacob must act on"*; nothing here is.
2. **Weakening clause 2 rebuilds R8-1.** Releasing on a *retired* row is precisely the state A-5b's own
   impossibility table proves is indistinguishable from the corner where undo must **not** un-retire. Any
   rule that fires here fires there.
3. **The honest fix is one level down and is not worth its blast radius today.** The real cause is that
   `history` stores the document *after* re-assertion, so the pre-assertion truth the redo needs is already
   gone. Storing the document **as dispatched** — re-asserting only on install, which `set` does anyway —
   would make clause 2 pass without touching it. That is a change to the substrate of A-5, A-5a, A-5b and
   §4.2 rule 5, and it would have to be re-measured against all three; buying that with a defect nobody can
   see would be the worst trade in this document.

**The trigger, written down rather than left implicit:** if any surface ever renders `retiredAt` directly,
or makes the retired-versus-live distinction visible to the user, this stops being invisible and reason 1
expires — at which point the fix is reason 3's, not a new clause.

#### A-9 — retirement is decided against the *un-gated* set, because a clock is not a fix (revision 11, QA P2-1)

**The defect, in one sentence.** §8.2's feasibility gate gave a conflict a **second** way to leave
`detectConflicts`' returned set, and `syncResolutions` — written in revision 1, when there was only one way —
reads *"not in the set"* as *"the user fixed it"*, so **merely opening a trip after it ends retires every
dismissal of every feasibility finding on it**, bumps `revision`, and leaves the store dirty, with no user
action of any kind. QA measured it both in core and through the real store (`qa/p2b-gate.mjs` §1.10, §1.11):
dismiss `missing_lodging` before the trip → `retiredAt: null`; day 1 → `null`; the day after `endDate`, clock
only → `retiredAt: "2026-08-30"`, `revision 7 → 8`, `isDirty() === true`.

And because retirement is deliberately **monotone** (A-5, A-5a, A-5b — `reassertRetirements` never
un-retires), the damage does not stop at one write. If the same `conflictId` ever becomes live again — the
user corrects the end date, extends the trip, adds a stop — the panel renders *"You dismissed this on
&lt;date&gt; and it went away; it has come back."* over a dismissal the **clock** retired, and the user's
answer no longer suppresses anything. That sentence is now capable of being false. This is R8-1's harm class
reached through a door §2.7 was not written against.

**The position, and it is one sentence.** *Retirement is a claim about the document. The gate is a claim
about the user's attention. They may not read the same set.* §2.7 retires a resolution because the thing it
answered **is no longer produced by the rules from this document** — that is the whole of what
content-addressing plus retirement buys, and it is a statement about data. §8.2 withholds a finding because
nobody can act on it any more — a statement about *whether to ask*, taken at a clock, over a document that
has not changed. Reading the second as evidence for the first is a category error of exactly the §0.6 shape
this document has now made four times.

**The rule, with nothing left to the builder's judgment:**

> **`syncResolutions` retires a live resolution if and only if its `conflictId` is absent from the set
> `detectConflicts` would return for this document at this clock **with §8.2's feasibility gate disabled**.
> A conflict withheld solely by the gate has not been fixed and its resolution stays live. `syncResolutions`
> does not run at all when it is given no usable clock.**

**The mechanism — the caller stops being able to get this wrong.** The obvious fix (pass the un-gated set in
from the store) is rejected: `syncResolutions(trip, conflicts, at)` handed the set the panel is holding is
the *natural* call, it is the call QA's own probe makes, and a function whose correctness depends on the
caller not making the natural call is the footgun §2.1's runtime patch allowlists exist to refuse. So the
function acquires the set itself and the ambiguous argument is deleted:

```ts
// packages/core/src/conflict/detect.ts — NOT exported from index.ts, exactly as TRANSIT_CITY_KEY
// is not. The only legitimate caller is syncResolutions.
export function detectUngated(trip: Trip, opts?: DetectOpts): Conflict[];

// packages/core/src/conflict/resolve.ts
export function syncResolutions(trip: Trip, at: IsoDate): Trip;   // was (trip, conflicts, at)
```

Five mechanical points, and they are the whole change:

1. **`detect.ts` grows no second implementation.** Today's `detectConflicts` body moves into one private
   `runRules(trip, opts, gate: boolean)`; the single gate line gains one conjunct at its front and keeps
   every conjunct it already has — `if (gate && !crashed && rule.class === 'feasibility' &&
   suppressedAsPast(trip, c, opts.today)) continue;`. `detectConflicts` is `runRules(…, true)` and
   `detectUngated` is `runRules(…, false)`. The gate still lives **once**, where §8.2 put it, and
   `suppressedAsPast` does not move. *(The `!crashed` conjunct is P2-4's fix, landed separately at
   `25a223b`. A-9 neither removes nor relies on it: a `rule_error` note is ungated in both sets, so it can
   never be the thing that retires a resolution.)* **⚠ Narrowed at revision 12 — A-12.** That parenthesis is
   true of the **note** and false of the crashing rule's other findings, which leave the un-gated set with it
   and take their dismissals down. Read A-12 before touching this line; `syncResolutions` now refuses a
   detection in which any rule threw.
2. **`syncResolutions` early-returns twice, cheapest test first.** `if (!trip.resolutions.some((r) =>
   !r.retiredAt)) return trip;` — with no live row there is nothing retirement can do, and this is the
   common case (the reference trip has zero). Then `if (!isIsoDate(at)) return trip;` — `at` used to be
   only a stamp and is now also the clock, so a missing or malformed one must mean *do nothing*, never
   *detect with no horizon*. The rest of the body is unchanged: build `live` from `detectUngated(trip,
   { today: at })`, stamp every live row whose id is absent, return the same reference when nothing changed.
3. **The store's `retireResolutions` loses its argument and gains a guard.** It calls
   `core.syncResolutions(doc, derived.today)`. Because retirement is now a function of `(document, today)`
   — the same key `derivedFor` caches on — it runs **only when `derivedFor` returned a new cache object**:
   `const prev = cache; cache = derivedFor(cache, state.doc, ports.clock.today()); cache =
   retireResolutions(cache, cache !== prev);`. A cache hit means retirement already ran for that pair. The
   public `store.syncResolutions()` method passes `true` unconditionally — it is an explicit request, it is
   idempotent, and it is not on a render path. Everything else in `retireResolutions` stands, including
   *"after `set()`, read `state.doc`, never the local"* (A-5).
4. **`resolve.ts` may import `detect.ts`.** There is no cycle: `detect.ts` imports `model/` and `rules/`
   only, and `index.ts` imports both. `syncResolutions` stays pure — the rules are pure and the clock is
   injected.
5. **The export surface does not move.** `syncResolutions` keeps its place on §2.10's list, `detectUngated`
   is not on it, and the runtime symbol count stays at **71** (§2.10's own enumerated list; the count was
   already 71 before this revision — a stale `70` survived here from an earlier draft of this addendum,
   corrected in place). This is a signature change to one exported function and nothing else.

**The one rule that still hides a clock of its own, and what happens to it.** `unbooked_ticketed` is the
only rule that reads `ctx.today`, and it does so at both ends: `delta < 0` skips a past day and `delta > 60`
skips a far-future one. The low end is §8.2's gate, re-implemented inside a rule — precisely what
`rules/types.ts` already forbids in writing — and it defeats A-9, because a finding the *rule* withheld is
invisible to `detectUngated`. **Delete the `delta < 0` half of that guard** (`if (delta > UNBOOKED_HORIZON_DAYS)
continue;`). This is provably output-neutral for `detectConflicts`: the rule's two subjects are the stop and
its own day, both resolving to that day's date, so `delta < 0` and *"every subject is strictly before
`today`"* are the same predicate and the gate suppresses exactly what the rule used to skip. The far-future
half stays and needs nothing: as a clock advances `delta` only shrinks, so the 60-day horizon can only ever
*admit* a finding, never withdraw one — and a finding withdrawn because the user moved the day further out
is a data change, which is a retirement §2.7 wants. After this deletion the greppable invariant is
**`ctx.today` appears in exactly one rule file**, and §8.2's gate is the only clock-driven suppression in
the system.

**⚠ Superseded at revision 12 — A-11.** This paragraph's last three sentences are wrong. *"As a clock
advances `delta` only shrinks"* holds only of a **monotone** clock, and `systemClock()` returns the device's
**local civil date**, which steps backwards on a westward flight or a corrected clock; the far-future half is
therefore a second clock-driven suppression, it sits inside `rule.run` where `detectUngated` cannot disable
it, and one backwards step across it permanently retires a live dismissal. The grep was satisfied and the
invariant it claimed to establish was still false, because the survivor was in the file the grep permits.
A-11 moves the horizon into the gate as `Rule.horizonDays` and replaces the grep with a clock sweep. The
`delta < 0` deletion above is unaffected and stands.

**Two alternatives, and why neither is the answer.**

- *Give `syncResolutions` an extra argument naming the gated ids.* Same information, one more parameter that
  a caller can forget, and the caller has to run detection twice to produce it. It is this ruling with a
  worse ergonomic.
- *Never retire a feasibility-classed resolution while it is gated.* To know a stored resolution is
  feasibility-classed and currently gated you need its rule and its subjects — which you only have if the
  conflict was produced, i.e. you need the un-gated set anyway. The shortcut is to read the `ruleId` off the
  front of the `conflictId` string, which makes the id **format** load-bearing when §2.7 treats it as an
  opaque content address. And the rule over-reaches in the other direction: it would refuse to retire a
  feasibility dismissal on a past trip even when the user genuinely fixed it, which is the behaviour §2.7
  exists to have.

**What the builder asserts** (core, plus the store level with in-memory ports):

1. QA's §1.10 exactly, re-expressed against the new signature: dismiss `missing_lodging` while the trip is
   future → `syncResolutions(t, '2026-08-25')` leaves it live → `syncResolutions(t, '2026-08-30')`, after
   `endDate`, **still** leaves it live, and returns the **same trip reference** with `revision` unmoved.
2. QA's §1.11 exactly: a second store opens the stored document a fortnight later, calls `getDerived()`
   once, and the row is still live, `revision` is unmoved and `isDirty()` is **false**.
3. **The point of §2.7 is not lost.** On the same completed trip, add the lodging booking so the rule stops
   producing the finding at all → the next `syncResolutions` **does** retire the dismissal. Retirement still
   answers to the data at any clock.
4. **The re-arming case, end to end.** After (1), extend `endDate` so the conflict returns: it renders
   **dismissed**, carrying the user's live resolution, and its `detail` contains no *"it has come back"*.
   **⚠ Rewritten at revision 12 — A-13.** No Phase 1 rule can be un-gated by extending `endDate` (their
   subjects never resolve through §8.2 ruling 2's fallback), so the harm is proven across the **clock**
   crossing instead, and the structural reason becomes a tripwire test. A-13 is the assertion; this line is
   the record of what it replaced.
5. `unbooked_ticketed`: `detectConflicts` output is byte-identical before and after the `delta < 0`
   deletion, at `FIXTURE_TODAY`, at a clock inside the trip, and at a clock after `endDate`; and a
   dismissal of one is not retired by the day merely passing.
6. **No clock, nothing happens:** `syncResolutions(trip, '')` and a malformed `at` return the same
   reference, with live rows present.

**Ceiling.** Every Phase 1 and 2a number is re-derived unchanged — `detectConflicts` at `FIXTURE_TODAY` is
2 blockers / 4 warnings / 11 notes, the real trip at the real clock suppresses exactly the two
`missing_lodging` warnings, and the retirement ledger's own three test sequences (A-5a) and three more
(A-5b) pass untouched. **A-9 changes when retirement fires, never how a retirement behaves once it has
fired.** The ledger, the veto, the release list of three sites and A-8's blessing of clause 2 are all
outside this addendum.

**Consequence for the probes, stated so it is not discovered.** `qa/p2b-gate.mjs` §1.10 calls
`core.syncResolutions(t1, after, '2026-08-30')` with the gated set — that call is the defect, not the test,
and no correct fix can leave the three-argument form meaning what it means today. The probe's assertions are
right and are kept verbatim; its calls become the two-argument form. Any fix to P2-1 requires that edit;
this one says so.

#### A-11 — the clock may not decide *membership* of the un-gated set (revision 12, QA R13-1)

**The defect, in one sentence.** A-9 deleted `unbooked_ticketed`'s `delta < 0` guard and kept
`delta > UNBOOKED_HORIZON_DAYS`, on an argument A-9 states in its own text — *"as a clock advances `delta`
only shrinks, so the 60-day horizon can only ever admit a finding, never withdraw one"* — and every word of
that is true **only of a monotone clock**. The clock this product ships is not monotone, so the horizon is a
second clock-driven suppression, it lives inside `rule.run` where `detectUngated` cannot disable it, and one
step backwards across the 60-day boundary produces A-9's own target harm through the one door A-9 reasoned
would never open.

**The clock, verified rather than remembered** — §1's rule about platform claims applies to a claim about a
device clock exactly as it applies to a claim about background location.

- `apps/web/src/ports/env.ts`'s `systemClock()` returns `new Date()`'s `getFullYear`/`getMonth`/`getDate`.
  Those are **local-time** accessors by ECMAScript definition, so the value is the device's **local civil
  date** — deliberately, because §2.1 is wall-clock and a traveller's "today" is the date where they are
  standing, not in UTC.
- Both phone platforms move that time zone by themselves while the user travels. iOS updates the zone from
  the network and Location Services when *Settings → General → Date & Time → **Set Automatically*** is on,
  which is the default ([Apple support](https://support.apple.com/en-au/HT203483)). AOSP ships automatic
  time-zone detection with `auto_time_zone` **enabled by default**, updating from network and location
  signals ([Android platform docs](https://source.android.com/docs/core/connect/time)).
- A **westward** shift moves the local civil date **backwards** whenever the local time of day is earlier
  than the shift. §8.1's own worked example is a Japan trip: Tokyo (UTC+9) → Los Angeles (UTC−7) is sixteen
  hours, so the date steps back for any local moment before 16:00. The reference trip's own tail —
  Budapest (UTC+2) → London (UTC+1) → LA (UTC−7) — does it for any moment before 09:00. Cairn is a product
  whose users fly west by definition.
- **And none of that is load-bearing.** A user correcting a device clock that was wrong steps it backwards
  with no travel at all, and a browser on a laptop inherits the same zone change. *A design may not rest on
  a clock being monotone*, which is the general form of §0.6: a clock is a fact stated by a resource, valid
  at the moment it was stated, and the next reading is a new statement rather than a continuation of the
  last one.

**Measured** (`qa/r13-gate-citykey.mjs` §1.1–§1.3, in core and through the real store with a real
`memoryStorage` port). One ticketed, priced, unbooked stop on a day exactly 60 days out: a dismissal
recorded at `today = 2026-01-01` is live; the device date steps back one day to `2025-12-31`, `delta = 61`,
and **`detectUngated` withholds the finding too** (§1.1 returns 0, not 1) — because the surviving
suppression is inside `rule.run`, which `detectUngated` runs unchanged. `syncResolutions(trip,
'2025-12-31')` therefore reads *"not in the set"* as *"fixed"*: `retiredAt: "2025-12-31"`, `revision 4 → 5`,
a new trip reference, and through the store a write to storage after one `getDerived()` with no keystroke.
Retirement is monotone (A-5/A-5a/A-5b), so putting the clock right restores nothing and the finding comes
back carrying *"You dismissed this on 2026-01-01 and it went away; it has come back."* — the sentence A-9
exists to stop being false.

**Why A-9's greppable invariant could not see this, and what replaces it.** A-9 asked for *"`ctx.today`
appears in exactly one rule file"* and claimed that grep establishes *"§8.2's gate is the only clock-driven
suppression in the system"*. The builder satisfied the grep exactly; the claim is still false, because the
surviving suppression is in the one file the grep permits. **A token grep is a proxy for the property, and
the property is available directly**, so state and test the property instead:

> **A rule's *output set* may not depend on the clock. For one document, `detectUngated` returns the same
> conflict ids at every well-formed clock. A clock may change a rule's **prose** — `summary`, `detail`, and
> any `params` key that is not in `values` — and nothing else. Every clock-driven *suppression* in the
> system lives in `detect.ts` under the `gate` conjunct, where `detectUngated` disables it.**

This is exactly the property `syncResolutions` has always assumed: *absent from the un-gated set* means
*fixed* if and only if absence cannot be caused by the clock. It was never written down, which is why two
rounds of rulings could satisfy their own checks and leave it false.

**One degenerate case is permitted and is named here rather than discovered.** A rule may decline to run
**at all** when `ctx.today` is absent — `unbooked_ticketed`'s `if (!ctx.today) return [];` stays. That costs
retirement nothing, because `syncResolutions` also declines without a well-formed `at` (A-9 point 2), so the
two abstentions coincide exactly and the clock-free set is never the set retirement reads. What a rule may
not do is produce one set at one valid clock and a different set at another.

**The mechanism — the horizon becomes a second gate, next to the first, in the one place gates live.**

```ts
// packages/core/src/conflict/rules/types.ts
export type Rule = {
  id: RuleId; description: string; class: RuleClass;
  /**
   * §2.7 A-11. A finding whose every subject falls more than this many days AFTER `ctx.today`
   * is premature, and `detect.ts` withholds it — under `gate`, so `detectUngated` sees it.
   * A rule NEVER applies its own horizon. Only a `feasibility` rule may declare one.
   */
  horizonDays?: number;
  run: (ctx: TripCtx) => Conflict[];
};
```

Five mechanical points, and they are the whole change:

1. **`unbookedTicketed` declares `horizonDays: UNBOOKED_HORIZON_DAYS` and deletes
   `if (delta > UNBOOKED_HORIZON_DAYS) continue;`.** The constant does not move and stays off §2.10's
   surface. `ctx.today` stays in the file for `summary` and `params.daysOut` — *prose*, permitted by the rule
   above. `values` is untouched, so conflict ids were already clock-free and stay so.
2. **`detect.ts` grows `beyondHorizon(trip, conflict, today, horizonDays)`**, symmetrical with
   `suppressedAsPast` and sharing its asymmetry for its reason: **suppressed iff *every* subject resolves to
   a date strictly more than `horizonDays` days after `today`** (§8.2 ruling 1 — one subject inside the
   horizon keeps the whole finding, because suppression must never remove something somebody can act on).
   Subject dates come from `subjectDate`, unchanged; the arithmetic is `dayNumber` from `derive/summary.ts`,
   which imports only `model/` — no cycle.
3. **The gate line carries two independent suppressions under one `gate` conjunct**, and they are not nested:
   ```ts
   if (gate && !crashed &&
       ((rule.class === 'feasibility' && suppressedAsPast(trip, c, opts.today)) ||
        beyondHorizon(trip, c, opts.today, rule.horizonDays))) continue;
   ```
   Past-ness is a property of the rule's *class*; a horizon is a property of the *rule*. Collapsing them
   would make a builder guess which conjunct owns which, and §8.2's table classifies while this field
   parameterises. `beyondHorizon` returns `false` when `horizonDays` is `undefined` or `today` is absent, so
   the second disjunct is inert for the other nine rules.
4. **Only a `feasibility` rule may declare `horizonDays`.** A horizon says *"this is premature"*, which is a
   feasibility claim by construction; an integrity finding is true whenever it is true. Asserted in the same
   test as the invariant, not enforced by a type. **A-17 adds a second condition to the same assertion**: a
   rule declaring a horizon must emit a subject whose `subjectDate` resolution does not depend on an id being
   unique — in practice the `{kind:'day'}` ref of the day the finding is about.
5. **`detectConflicts` is provably output-neutral** — **on every document `validateTrip` accepts; narrowed
   by A-17 (revision 13, QA R14-1), which also states what happens on the documents it does not.**
   `unbooked_ticketed`'s two subjects are the stop and its
   own day, both resolving through `subjectDate` to that day's date, so *"every subject more than 60 days
   after today"* and the deleted `delta > 60` are one predicate over one date. A suppressed finding never
   enters `found`, so ordering, ids, `detail` and bytes are identical at every clock — including no clock,
   where the rule still returns nothing and the goldens are untouched.

**What this buys, stated as the trade it is.** A-9 wanted one thing from the horizon staying in the rule: *"a
finding withdrawn because the user moved the day further out is a data change, which is a retirement §2.7
wants."* That retirement still happens, and it never came from the horizon: `unbooked_ticketed` puts
`date` in `values`, so moving the day **changes the conflict id**, the old id is absent from the un-gated
set at any clock, and content-addressing retires the dismissal exactly as §2.7 intends. The horizon was
buying a behaviour that was already paid for, at the price of a clock that can retire a live answer.

**Two alternatives, and why neither is the answer.**

- *Make the clock monotone — clamp `today` so it never goes backwards.* It requires persisted per-device
  state that no port has, it is wrong for the user correcting a wrong clock (their correction is the truth),
  and it puts a memory inside a value §2.1 requires to be injected and pure. It also fixes one symptom of a
  general defect: any future rule reading `ctx.today` would reopen it.
- *Leave the horizon in the rule and have `syncResolutions` detect at two clocks (e.g. `at` and `at + 60`)
  and union the results.* It hard-codes one rule's constant into retirement, it is wrong the moment a second
  rule declares a different horizon, and it makes a function whose job is bookkeeping run detection twice.

**What the builder asserts** (core, plus the store level with in-memory ports):

1. **QA §1.1–§1.3 verbatim.** At `delta = 60` the dismissal is live; the clock steps back to `delta = 61`;
   `detectUngated` still contains the finding, `syncResolutions` returns the **same trip reference**,
   `revision` is unmoved, and through the store `isDirty()` is `false` after one `getDerived()`. Then the
   clock is corrected and the finding renders **dismissed**, with no *"it has come back"*.
2. **The invariant, as a sweep and not a grep.** For each of `2019-01-01`, `2026-08-01`, `2026-08-24`,
   `2026-08-30`, `2027-08-30`, `2030-01-01`, the sorted `detectUngated` id list is identical — run on the
   reference fixture **and** on each injected-fault fixture the per-rule criteria already use. The test
   **fails if any rule contributed no finding at any clock in the sweep**, because a sweep over a document
   that exercises three rules asserts nothing about the other seven (§0.5's injected-fault discipline
   applied to an invariant instead of a rule).
3. **`detectConflicts` byte-identity**, before and after, at all six clocks above and with no clock, on the
   reference fixture — the goldens are the oracle and they do not move.
4. **The horizon still works where it is supposed to.** At a clock 200 days before the reference trip,
   `detectConflicts` reports **no** `unbooked_ticketed` note and `detectUngated` reports **three**; at
   `FIXTURE_TODAY` both report three.
5. **Only feasibility rules declare a horizon**, and no rule file suppresses a finding on a date comparison —
   asserted by (2), which is what makes (2) worth more than the grep it replaces.

**Ceiling.** Every Phase 1 and 2a number is re-derived unchanged: 2 blockers / 4 warnings / 11 notes at
`FIXTURE_TODAY`, two suppressed `missing_lodging` warnings on the reference trip at the real clock, goldens
and sample JSON byte-identical, §2.10 unchanged at **71** runtime symbols (`horizonDays` is a field on an
internal type and `beyondHorizon` is module-private). The retirement ledger — A-5, A-5a, A-5b, A-8 — is not
reopened and does not change.

#### A-12 — a crashed rule's contribution is *unknown*, not *absent* (revision 12, QA R13-3)

**The defect.** A-9 point 1 says, of the `!crashed` conjunct, *"a `rule_error` note is ungated in both sets,
so it can never be the thing that retires a resolution."* The first clause is true and the conclusion does
not follow. `detect.ts`'s `catch` replaces the crashing rule's **entire output** with one synthetic note, so
every real finding that rule would have produced is absent from the un-gated set, and `syncResolutions`
retires every live dismissal those findings carried — at the same clock, with no edit, permanently, because
retirement is monotone. QA measured it: one crashed detection takes `retiredAt` from `null` to
`"2026-08-24"` and `revision` from 7 to 8, and when the rule works again the user is accused of a dismissal
that *"went away"*. `!crashed` protects the **note**; nothing protected the rule's other findings.

MINOR rather than MAJOR only because no content route into a crash survives `fromJSON` today — QA tried five
and all were refused at the parse. That is a property of today's parser, not of the design, and it is exactly
the kind of "unreachable, therefore fine" that this project has twice watched become reachable one increment
later (R8-3, R10-2).

**The position.** *A rule that threw did not report "nothing"; it reported nothing we can read.* Absence of
evidence is the whole mechanism of retirement, so an incomplete analysis is not a set retirement may be
computed from. The `catch` exists so one bad rule cannot take down the panel — a **rendering** concern — and
A-9's own sentence applies to it unchanged: rendering is a claim about the user's attention, retirement is a
claim about the document.

**The rule, with nothing left to the builder's judgment:**

> **`syncResolutions` retires nothing at all — same reference, `revision` unmoved — if any rule threw during
> the detection it is deciding from. The check happens before any row is stamped.**

Trip-wide rather than per-rule, and the reason is A-9's own: a stored `ConflictResolution` carries only its
`conflictId`, and working out which rule *would have* owned that id means either running the crashed rule
(it throws) or parsing the `ruleId` off the front of the id string — which A-9 refused, because it makes the
id **format** load-bearing when §2.7 treats a conflict id as an opaque content address. Nothing is lost by
being blunt: retirement is idempotent bookkeeping with no deadline, so it simply runs on the next recompute
after the crash is fixed, and until then the crash is on screen as a `rule_error` note rather than silently
eating the user's answers.

**The mechanism — one more internal function, pure, and `detectUngated`'s shape does not move.**

```ts
// packages/core/src/conflict/detect.ts — neither of these is on index.ts, so §2.10 stays at 71.
type UngatedDetection = { conflicts: Conflict[]; crashed: RuleId[] };

function runRules(trip: Trip, opts: DetectOpts, gate: boolean): UngatedDetection;      // private
export function detectConflicts(trip: Trip, opts?: DetectOpts): Conflict[];           // .conflicts
export function detectUngatedChecked(trip: Trip, opts?: DetectOpts): UngatedDetection; // the pair
export function detectUngated(trip: Trip, opts?: DetectOpts): Conflict[];              // .conflicts

// packages/core/src/conflict/resolve.ts — inside syncResolutions, after A-9's two early returns
const { conflicts, crashed } = detectUngatedChecked(trip, { today: at });
if (crashed.length > 0) return trip;          // unknown, not absent — A-12
const live = new Set(conflicts.map((c) => c.id));
```

Two shapes that were rejected, because the choice is the interesting part:

- **An out-parameter** (`detectUngated(trip, opts, health)`, filled by the `catch`). Filling a
  caller-supplied object is a side effect on an argument, and §2.1's purity rule is the reason golden
  fixtures work at all.
- **Changing `detectUngated` to return the pair.** It is the smaller diff, and it would force edits to
  `qa/r13-gate-citykey.mjs` §1.1 and §9 and to `retirementGate.test.ts`, all of which call it as an array
  today. A-9 had to say *"no correct fix can leave the three-argument form meaning what it means today"* and
  accept that its probe's calls changed; **this fix does not have to, and that is worth one extra internal
  name.** A probe whose assertions must be rewritten to accommodate a fix has stopped being independent
  evidence of that fix, and round 13's §1 assertions are the evidence that A-11 worked.

`crashed` is filled in the existing `catch`, in `RULES` order, with the crashing rule's id.
`detectUngated` becomes a one-line wrapper (`detectUngatedChecked(...).conflicts`) and keeps every property
A-9 gave it, including its absence from `index.ts` and from the built bundle.

Three points a builder should not have to infer: `detectConflicts` returns `.conflicts` and is otherwise
unchanged; `store.retireResolutions` is unchanged, because a `syncResolutions` that returns the same reference already
means *"nothing to write"* (A-9 point 3's cache guard still holds); and **the `!crashed` conjunct in the
gate stays** — it does a different job (keeping the note itself visible on a finished trip) and A-12 does
not make it redundant.

**A-9 point 1 is narrowed to what it can support, and then made true by mechanism.** Its parenthesis now
reads: *a `rule_error` note is ungated in both sets, so the note itself is never the thing that retires a
resolution* — which was all the `!crashed` conjunct ever established. The wider claim, that a crash cannot
retire a resolution, was false as written and is true from A-12 on because `syncResolutions` refuses the set,
not because of anything about the note.

**No new surface, and deliberately no new UI.** A crash already renders as a `rule_error` note in the
conflicts panel; a second indicator saying *"retirement is paused"* would explain a mechanism the user has
no way to act on. §0.5's test — *a blocker is a thing Jacob must act on* — applies to indicators too.

**What the builder asserts:**

1. QA §4 verbatim: a rule stubbed to throw, a live dismissal of a **different** rule's finding present, one
   `syncResolutions` at an unmoved clock → **same trip reference**, `retiredAt` still `null`, `revision`
   unmoved; the rule is then restored and the finding renders **dismissed** with no *"it has come back"*.
2. The crashed rule's own findings are the ones that matter: a dismissal of a finding **from the crashing
   rule** survives the crash identically.
3. **The point of §2.7 is not lost**: with no rule crashing, a genuine fix still retires at the same clock —
   the A-9 assertion 3 sequence, re-run, unchanged.
4. `detectConflicts` output during a crash is byte-identical to today's (one `rule_error` note, ungated).

#### A-13 — A-9 assertion 4 named a mechanism no Phase 1 rule can perform (revision 12, QA R13-2)

**The finding, and it is against this document rather than the code.** A-9 assertion 4 required the
re-arming case to be proven *"end to end"* by **extending `endDate` so the conflict returns**. For
`missing_lodging` — the rule the builder chose, and the rule §8.2's live defect is about — that is not
achievable, and QA reproduced why: the finding's subjects are its **own days**, which extending the trip
does not move, so it stays gated at a post-`endDate` clock however far the end date is pushed out. The
builder substituted a clock-based mechanism, disclosed the substitution, and added a control; QA then found
the substituted test's `setTripMeta({ endDate })` call **inert** — byte-identical results with and without
it, because the clock it reads is inside the original range.

**It is not achievable for any Phase 1 rule, and the reason is structural.** Extending `endDate` can un-gate
a finding only if some subject resolves to a date **through §8.2 ruling 2's fallback** (`{kind:'trip'}`,
`{kind:'place'}`, a pool stop, or an id nothing matches — the subjects with no day of their own). I checked
all five feasibility rules against their source rather than reasoning about them, and the result is stronger
than the finding needed: **every one of them emits a `{kind:'day'}` subject naming a day the trip actually
contains** — `missing_lodging` emits nothing else, and `overlap`, `impossible_transfer` and `booking_vs_plan`
each append `{kind:'day', id: day.id}` to their stop and booking refs, as does `unbooked_ticketed`. The gate
suppresses only when **every** subject is past (§8.2 ruling 1), so a real day pins every feasibility finding
to a real date and `trip.endDate` never enters the computation. And the neighbouring edit —
moving a day's date into the future — cannot substitute, because `missing_lodging` carries `dates` in
`values`, so the id changes and the dismissal correctly does not follow it. A-9 asked for something the
model does not currently permit, and a builder was right to say so rather than fake it.

**The ruling: the substituted mechanism is accepted, and A-9 assertion 4 is rewritten to name it.**

> **A-9 assertion 4 (as amended).** The re-arming case is proven across the gate **boundary**, not across an
> edit: dismiss a feasibility finding while it is live; move the clock past `endDate` so §8.2 withholds it
> and `syncResolutions` runs at that clock (A-9 assertion 1 — the row stays live); move the clock back
> inside the trip so the finding returns. It must render **dismissed**, carrying the user's own live
> resolution, and its `detail` must contain no *"it has come back."* A faithful pre-A-9 control must fail
> this test, and the test's name and comment must describe the clock crossing — the mechanism it actually
> runs.

That tests exactly the harm assertion 4 was written for: *the user's answer still suppresses the finding when
the finding comes back*. The route by which it comes back — the calendar moving, or the trip's dates moving —
is not the claim; it was an example, and it was the wrong one.

**And the structural reason becomes a tripwire, so the literal case is written the day it becomes possible.**

> **A test asserts that no `feasibility`-classed rule emits a subject that resolves through §8.2 ruling 2's
> fallback**, over the reference fixture and every injected-fault fixture: for each such finding, at least
> one subject is a day, a scheduled stop, or a booking that the trip actually contains. If a rule is ever
> added or changed so this fails, A-9 assertion 4's literal mechanism has become achievable and must be
> written as a test in the same commit — the failure message says so.

This converts a permanently-failing probe line into a live guard. It is deliberately *not* an assertion that
the fallback is unused — `rule_error` notes use `{kind:'trip'}` and integrity rules may — only that no rule
whose findings the gate can withhold depends on it.

**What the builder does, and it is small:** delete the inert `setTripMeta` call from
`packages/core/test/retirementGate.test.ts`, rename the test to the clock crossing it performs, keep every
assertion, keep the pre-A-9 control, and add the tripwire above. `qa/r13-gate-citykey.mjs` §3's first
assertion — *"extending `endDate` makes the conflict return"* — is **retired by this ruling, not fixed**: it
asserts a mechanism the model does not have, and the honest edit is to replace that line with the tripwire.
A builder may not make it pass by weakening anything else, and the reason it is being retired is written
here rather than in a probe comment.

#### A-17 — a horizon is only as sharp as the document's own answer to *when* (revision 13, QA R14-1)

**The defect, and it is in a proof rather than in code.** A-11 assertion 5 says *"`detectConflicts` is
provably output-neutral"*, on the argument that *"`unbooked_ticketed`'s two subjects are the stop and its own
day, both resolving through `subjectDate` to that day's date, so 'every subject more than 60 days after
today' and the deleted `delta > 60` are one predicate over one date."* `subjectDate` resolves a
`{kind:'stop'}` ref by scanning `trip.days` for the **first** day holding that id
(`conflict/detect.ts:133`), which is not the day the rule was iterating when the same stop id sits on two
days. On such a document `detectConflicts` diverges from pre-A-11 at **123 of 435 clocks**, and the horizon
leaks: a note **73 days out** survives a 60-day gate. `validateTrip` calls that document `duplicate_id`, an
**error**, but `fromJSON` accepts it and `importDoc` is therefore a live route to one.

The code is faithful — A-11 point 2 names `subjectDate` as the resolver, in those words. It is the proof
that overreached.

**The ruling: narrow the claim. The rule does not learn to carry its own subject date.** Three reasons, in
the order that decides it:

1. **§0.6.** *A fact about a resource is only valid at the moment, and in the place, the resource itself
   stated it.* The date a stop happens on is a fact the **document** states, by putting the stop on a day. A
   rule that carried its own copy of that date into its `Conflict` would be gating on a copy — and two rules
   reasoning about the same day could then disagree about when that day is, which is strictly worse than one
   resolver that is exactly as ambiguous as the document is. `subjectDate` is the right resolver, and on a
   `duplicate_id` document there is **no correct answer** for it to return: the question *"which day is this
   stop on"* has two answers in the document itself.
2. **The blast radius is out of proportion to the harm.** Threading a subject date changes `Conflict`'s
   shape, which is content-addressed (`values` decides the id) and persisted in every `Resolution` row — so
   it risks conflict ids, the retirement ledger and the goldens — plus both gates in `detect.ts` and all ten
   rules' return sites, to improve the behaviour of a document that is already invalid, already reported,
   and whose only bad outcome is showing the user something true.
3. **The direction is safe, and provably so rather than hopefully.** `beyondHorizon` suppresses only when
   **every** subject resolves beyond the horizon (§8.2 ruling 1's asymmetry). `unbooked_ticketed` emits,
   among its subjects, the `{kind:'day'}` ref of the day it iterated — and a day ref resolves through
   `subjectDate` to that day's own `date`, with no scan and no ambiguity. So a duplicated stop id can only
   ever make the conjunction *fail*: the gate can **keep** a finding the deleted `delta > 60` would have
   withheld, and can never withhold one that guard would have kept. Over-reporting, never hiding something
   actionable.

**What changes, and it is three things.**

1. **A-11 assertion 5 is narrowed.** Read it as: *"`detectConflicts` is provably output-neutral **on every
   document `validateTrip` accepts**. On a document carrying a `duplicate_id` error — which `fromJSON`
   accepts deliberately, because refusing to parse would make the document unopenable and hide the report
   (A-10's precedent) — `subjectDate` resolves a `{kind:'stop'}` ref to the first day holding that id, which
   need not be the day the rule reasoned about, and the gate may then keep a finding the deleted guard would
   have withheld. The divergence is **over-reporting only**, by the horizon-subject rule below, and it is
   bounded to documents this system already reports as invalid."* Assertions 1–4 are unchanged and A-11's
   mechanism is unchanged.
2. **The `Rule` contract gains one standing obligation**, so point 3 above stays true for the *next* rule to
   declare a horizon rather than being a property of the one rule that has one today:

   > **A rule that declares `horizonDays` must emit, among the subjects of every conflict it produces, at
   > least one ref whose `subjectDate` resolution does not depend on an id being unique — in practice the
   > `{kind:'day'}` ref for the day the finding is about. A rule that cannot do so may not declare a
   > horizon.**

   The case that rule excludes is real and A-13 already anticipated it: a finding about a **pool** stop,
   whose only subject has no day of its own and falls through to §8.2 ruling 2's `endDate`. Excluding it is
   the honest answer rather than a cost — a pool stop has no date, so *"more than 60 days out"* is a claim
   about a date that does not exist, and the finding simply always shows. Asserted in the same test as
   A-11's *"only a feasibility rule may declare a horizon"*, not enforced by a type, for the same reason.
3. **One directional test**, in `packages/core/test/horizonGate.test.ts`, which is what stops this being a
   doc edit that waves a finding through:

   > For every clock in A-11's sweep, over the reference fixture, each injected-fault fixture **and** a
   > `duplicate_id` document: every conflict in `detectUngated(t, {today})` whose rule declares a horizon and
   > whose `params.daysOut <= horizonDays` is present, **by id**, in `detectConflicts(t, {today})`.

   *"The gate never withholds a finding the deleted guard would have kept."* `params.daysOut` is the rule's
   own reckoning, computed from the day it was iterating — prose, which A-11 permits a clock to influence —
   so it is an oracle independent of `subjectDate`, which is exactly what makes the test worth writing. On a
   well-formed document it is the full equivalence; on the `duplicate_id` document it is the safe half, and
   the unsafe half is the one this ruling has decided not to buy.

**No code in `detect.ts`, `subjectDate`, `beyondHorizon` or any rule file changes.** §2.10 stays at **71**.
The goldens do not move.

**Two probe lines stay red, and that is the ruling rather than an omission.**
`qa/r14-horizon-copy.mjs` §1.5's assertion — *"no `unbooked_ticketed` note survives the gate more than 60
days out"* — asserts the claim this addendum has just narrowed, so it is **retired by this ruling, not
fixed**, on A-13's precedent. The honest edit is to keep the measurement (`console.log` of the surviving
`daysOut` values, which is the interesting number) and replace the `ok()` with the directional assertion in
point 3, naming A-17 in the comment; and to re-label §1.4's `duplicate-stop-id` differential as the
**measurement** of a documented divergence (123 of 435 clocks), since a pre-A-11 differential on an invalid
document is now expected to be non-zero. **Nothing else in that probe may be weakened**, and after A-15,
A-16 and R14-3 land, its expected FAIL count is **0** with both worktrees present.

### 2.8 Provenance

```ts
type Provenance = {
  source: 'user' | 'email' | 'friend' | 'system';
  state: 'candidate' | 'accepted' | 'rejected';
  confidence: 'confirmed' | 'asserted' | 'inferred';
  origin?: { mailAccountId?: string; messageId?: string;
             friendUserId?: UserId; sourceTripId?: TripId; sourceStopId?: StopId;
             ruleId?: string };
  addedAt: IsoDate; acceptedAt: IsoDate | null; actorUserId: UserId | null;
};
```

`source` = who produced it. `confidence` = how well attested: `confirmed` (we hold the document), `asserted`
(a human said so with nothing behind it — IU1TUY), `inferred` (we worked it out — every hand-converted CZK
price). `state` = whether the user has taken it on. **Email-derived data is created `state:'candidate'` and
is never a silent write.**

One function decides how everything renders, so web, native and server cannot drift:

```ts
displayStatus(x): 'own' | 'suggested' | 'candidate' | 'imported' | 'rejected'
// 'own'       iff source==='user' || state==='accepted'
// 'candidate' source==='email',  state==='candidate'  → review queue, badged
// 'imported'  source==='friend'                        → credited to the friend, badged
// 'suggested' source==='system', state==='candidate'   → dimmed, removable (today's sug:true)
```

The invariant the tester should attack: **nothing un-accepted and non-user may ever be presented without a
badge.**

`displayStatus` answers *how is this badged*. A second, separate accessor answers *who is it credited to*:

```ts
attribution(x): { friendUserId: UserId; sourceTripId: TripId; sourceStopId: StopId } | null
```

They are separate because acceptance changes the badge and must never change the credit. A stop copied from
Marta and then accepted is `displayStatus() === 'own'` — Jacob has taken it on, which is what the brief's
*"until the user accepts it"* means — and `attribution()` still names Marta, and every view that renders the
stop renders that. §2.14.

### 2.9 Validation

```ts
validateTrip(trip): Issue[]
type Issue = { level: 'error'|'warn'; code: string; ref: Ref; message: string; params: Record<string, string|number> };
```

Codes — **all 23, swept against `model/types.ts` at revision 15 and equal to it**: `days_not_dense`,
`day_id_mismatch`, `duplicate_id`, `primary_city_not_in_cities`, `unknown_city_key`,
`place_ref_dangling`, `lat_lng_out_of_range`, `pool_stop_has_day`, `pool_stop_unknown_city`, `scheduled_stop_has_no_day`,
`booking_ref_orphan`, `cost_basis_mixed`, `provenance_missing`, `accepted_without_timestamp`,
`owner_missing`, `origin_stripped`, `accepted_by_non_member`, `stale_resolutions`, `invalid_calendar_date`,
`duplicate_city_key`, `reserved_city_key`, `city_name_empty` *(the three A-10 added in revision 11; this
list lagged them for four revisions)*, `place_hours_malformed` *(A-20, revision 15)*.

**The list is the architect's, and it moves in the revision that adds the code — not a revision later.** It
has now drifted twice, and both times the same way: a ruling added codes to the type and left the prose
behind. The cost of that drift is documentation-only and was measured rather than assumed — QA round 16
established that **nothing in this repo switches exhaustively on `IssueCode`** (no `Record<IssueCode, …>`,
no `switch (issue.code)` in `packages/client`, `apps/web` or `cli.ts`), so an unlisted code renders its own
`message` and never `undefined`. There is deliberately no `ISSUE_CODES` runtime constant to check the list
against: it would be a new export for a documentation problem (§2.10 is 71 for stated reasons), and the real
rule is procedural — **a code arrives with a ruling, and a ruling that adds one edits this paragraph.** A
builder who finds a code missing here has found a ruling that was not finished, which is exactly what
`place_hours_malformed` was.

- **`accepted_by_non_member`** (level `error`, added in revision 4 — QA R2-11): a record with a non-null
  `attribution()` whose `provenance.state === 'accepted'` and whose `provenance.actorUserId` is not a member
  of the trip. In Phase 1 `members(trip) === {trip.ownerId}`; in Phase 2 it is `TripMember`. Scoped to
  attributed records because that is exactly §2.14's subject — the credited copy, where "somebody else
  decided this is yours" is the thing that must not be silent. It is an `Issue` and not a throw because a
  wrong actor arrives *inside a document* (a restored backup, a hand-edited record, a Phase 2 sync), where
  throwing means an unopenable trip; §2.9 is where document-level claims are enforced. The *call* that would
  create one throws instead — §2.14.

Four changes from revision 1, each with a reason:

- **`pool_stop_unknown_city`** (level `error`): a pooled stop whose `cityKey` is neither one of
  `trip.cities` nor the transit pseudo-city. The pool is reached *through* a city, so such a stop is in the
  document, counted in the pool total, and rendered by nothing — the user's stop is gone with no error and
  no way back (QA R2-2). The transit key is deliberately **exempt**: it is a rendered catch-all group, not
  a hole, and a rule that fired on every brand-new trip would be noise. `returnToPool` will not mint an
  unreachable key, so this rule exists to catch a hand-edited document, a deleted city, and the next bug.
- **`stop_far_from_city` is deleted outright.** It was a second implementation of `geo_outlier` with the
  same primaryCity-only defect and twice the noise — 20 of 31 issues, 13 of them explained by another city
  on the same day or a `daytrip` flag. Sequencing rule 1 calls a second implementation a design defect, and
  the fix is not to fold two rules into one file but to notice that a coordinate outlier is a **conflict** —
  a thing to act on, with both sides stated — and not a structural validity problem. There is now one
  implementation (`geoCheck`, §2.13) with one consumer (`geo_outlier`). `validateTrip` keeps
  `lat_lng_out_of_range`, which is a genuine structural check (`|lat| > 90`) and not a distance at all.
- **`accepted_without_timestamp` applies to bookings as well as stops.** `{state:'accepted',
  acceptedAt:null}` on a `Booking` renders `'own'` and is precisely the shape a Phase 3 ingest bug produces.
- **`origin_stripped`** (level `error`): a stop or booking whose `provenance.source === 'friend'` with no
  `origin.sourceTripId`. That is the credit link being lost, and §2.14 makes it unlosable.
- **`invalid_calendar_date`**: `startDate`/`endDate`/`Day.date` must be real calendar dates, not merely
  `YYYY-MM-DD`-shaped. `'2026-13-45'` currently rolls over to 2027-02-14 and validates clean.

This generalises the scripted checks in `CLAUDE.md` — the ones that caught bugs nothing visible was showing.

#### A-20 — the parser decides *shape*, `validateTrip` decides *meaning*, and `Place.hours` was the one field nobody applied that to (revision 15, QA R16-2)

**The defect, and it is one defect wearing three faces.** `serialize/fromJSON.ts:294` reads

```ts
...(o.hours !== undefined ? { hours: o.hours as Place['hours'] } : {}),
```

That is the only raw cast in a 400-line hand-rolled parser in which every other field of every other record
is checked and refused with a JSON path. Its consequences have now been filed three times:

- **R15-1** (BLOCKER) — a `weekly` entry may hold any key at all, so `{ ...w }` in `placeForCopy` carried a
  door PIN, a confirmation number, a mailbox address and a vendor voucher URL across a **person** boundary.
- **R15-2** (MAJOR) — `hours` may be a string, a number, an array, `null` or `{weekly:'mon-fri'}`, so
  `p.hours.weekly.map(...)` threw a raw `TypeError` from core on a document `fromJSON` had just accepted,
  which §2.1 forbids.
- **R16-2** (MINOR) — the two guards written to close those two symptoms, `wellFormedHours`
  (`validate/validateTrip.ts:406`) and `weeklyForCopy` (`build/copyStop.ts:157`), landed **in the same
  commit** with **different** definitions of a well-formed entry. `weeklyForCopy` additionally requires
  `Number.isFinite(day)` and an `open`/`close` that `redactText` leaves byte-identical; `wellFormedHours`
  requires only `typeof day === 'number'` and `typeof open === 'string'`. Measured: `close: '170000'`,
  `open: 'https://vendor.test/x'` and `open: 'YZGDTS'` are dropped to `null` by the copy — indistinguishable
  from *"this day is unknown"*, which is `OpeningHours`' own documented meaning — while `validateTrip` calls
  the same entries well-formed and says nothing. The `IssueCode` added to tell the user their hours did not
  survive does not fire on the documents whose hours did not survive.

So there are **three** answers in this repo to *"what is a well-formed `OpeningHours`"* — the parser's
(anything), `validateTrip`'s (loose), the copy's (strict) — and no two agree. Patching R16-2 where it
surfaced would produce a fourth. QA routed the mechanism to a builder and the question to me, correctly.

**The question, and the precedent that answers it.** Round 15 told a builder *"`parsePlace` should validate
`hours` the way it validates every other field"*; A-18 then said the pass *"changes nothing in `fromJSON`"*,
and the builder — obeying the ruling, which was the right thing to do — closed the two symptoms with two new
predicates instead of the one cause. QA names an A-10 precedent on each side. Both citations are real, and
they are about different things:

- **A-10's refusal to parse-check** is about `duplicate_city_key`, `reserved_city_key` and `city_name_empty`:
  *"A document already carrying the `"-"` collision must still **open**, so the user can see it and act;
  refusing to parse would make it unopenable."* Every one of those documents is a **structurally perfect**
  `Trip`. Each `City` has a string key, a string name, a numeric order. What is wrong is what the document
  **means** — two cities claiming one key, a key shadowing a sentinel, a name that identifies nobody.
- **The parser's refusals** are about shape: `str`, `numOf`, `oneOf`, `arr`, `obj`, `isoDate`, `clockOrNull`.
  A field that is not the type the model declares is not repairable by the user *looking* at it, because
  there is nothing to look at — the trip's own type system is lying about what it holds.

The pair that settles it is already in this file, one line apart in the same parser: **`isoDate` refuses
`'2026-13-4x'` (not `YYYY-MM-DD`-shaped) while `invalid_calendar_date` — an `Issue` — reports `'2026-13-45'`
(shaped right, means nothing).** That is the line, drawn twice, deliberately:

> **`fromJSON` decides whether a document *is* a `Trip`. `validateTrip` decides whether a `Trip` says
> something wrong. A value that is not the declared type is the parser's; a value of the declared type that
> is impossible, contradictory or unusable is `validateTrip`'s.**

`hours: 'mon-fri'` is not an `OpeningHours` in any field. It is `isoDate`'s case, not
`invalid_calendar_date`'s, and it is the only field in `parsePlace` — the only field in the whole parser —
on the wrong side of that line. **The parser validates `hours`.**

**The three objections, answered rather than waved past.**

1. *"An unopenable document is the harm A-10 named."* It is, and here the population is **empty and
   measurably so**: nothing in this repo has ever written `Place.hours` — `grep` finds it in `types.ts`,
   `toJSON`, `fromJSON`, `copyStop` and `validateTrip` and nowhere else; `import/legacyDays.ts` does not
   emit it; **0 of the reference trip's 95 places carry it**; no screen renders it. Every document that can
   fail this check today is hand-edited or hostile, which is precisely the population a parser exists for.
   And the refusal is *legible* — `expected HH:MM (at $.places[7].hours.weekly[2].close)` names the byte to
   fix, where the status quo silently drops the entry at a copy boundary the user never sees.
2. *"Then the trip is lost over the least important field in the model."* Only for a document that also
   cannot be produced by this system. Weigh the two failure modes rather than the two adjectives: refusing
   costs a named path in a hand-edited file; accepting costs a credential crossing a person boundary
   (R15-1), a throw out of core (R15-2), and a silent drop the warning misses (R16-2) — three findings
   across two rounds, all from one cast.
3. *"Does the ruling then delete `place_hours_malformed`?"* No — see the ratification below. It is exactly
   what it always should have been: the report on the one door the parser does not stand at.

**The ratification, and its narrowed meaning.** `place_hours_malformed` (level `warn`, `ref:{kind:'place'}`)
is **ratified as shipped** and stays. QA measured it safe — the reference trip is unmoved at 11 issues and
2/4/11 conflicts, it is deterministic, it never throws on any of 34 hostile shapes, its `Issue` obeys every
contract §2.9 and R13-7 impose, and it carries a place name and id and no coordinate, note or `hours`
content — and it answers the half of R15-2 that said *"nothing warns the user first"*. Its meaning is now
exact and is not what its current comment says:

> **`place_hours_malformed` means: this in-memory document holds a `Place.hours` that `fromJSON` would
> refuse.** After this ruling that state is unreachable through the parser, so it reports a document built
> in memory past the type system — a cast, a future untyped writer, a native bridge. It is not dead code
> for three reasons. (a) It is the **only** warning ahead of a real harm: `toJSON` will happily re-emit such
> an `hours`, and the export then fails to re-import at that field — the user learns their backup is
> unrestorable at restore time unless something says so first. (b) It is the same class the round-16 notes
> already record as *"recorded, not filed — it becomes a finding the day an untyped caller exists"* (the
> out-of-union `StopPlacement`), and `validateTrip` is where this design puts that class. (c) It is the
> injected-fault criterion for the shared predicate below (§0.5): the fault is a cast-built document, the
> output is exactly one `warn` per malformed place.

Its comment in `validate/validateTrip.ts` currently asserts that the parser's cast is **deliberate** and
cites A-10 for it. That sentence is now false and is replaced by this ruling; it was a builder's honest
reconstruction of a gap, and leaving it would teach the next reader the wrong rule.

**The mechanism — five parts, no judgment calls left in any of them.**

**Part 1. One predicate, one module.** New file `packages/core/src/model/openingHours.ts`, modelled on
`model/cityName.ts` and **deliberately off `index.ts`**, so §2.10 stays at **71** runtime symbols. This is
the only definition of a well-formed `OpeningHours` in the repo after this pass:

```ts
/** `H:MM` or `HH:MM`. The one clock-shape test in this system. */
export function isClockTime(v: unknown): boolean {
  return typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v);
}

/** One `weekly` entry: `null`/absent (day unknown, §7) or `{day, open, close}`. */
export function isWeeklyEntry(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== 'object' || Array.isArray(v)) return false;
  const e = v as { day?: unknown; open?: unknown; close?: unknown };
  return typeof e.day === 'number' && Number.isFinite(e.day) && isClockTime(e.open) && isClockTime(e.close);
}

/** True when `v` is an `OpeningHours` — i.e. exactly when `fromJSON` accepts it. */
export function isOpeningHours(v: unknown): boolean {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as { weekly?: unknown; note?: unknown };
  if (!Array.isArray(o.weekly)) return false;
  if (o.note !== undefined && typeof o.note !== 'string') return false;
  return o.weekly.every(isWeeklyEntry);
}
```

Three things it deliberately does **not** do, so nobody adds them:

- **No `day` range check.** `0 ≤ day ≤ 6` is a claim about *meaning*, not shape; §7 says a missing day is
  unknown and never a conflict; nothing in this system reads `day` yet. A range rule with no consumer is a
  rule with no injected-fault criterion (§0.5). If a renderer ever needs one it is a new `IssueCode` in
  `validateTrip`, ruled then, and **not** a parse refusal.
- **Extra keys on a `weekly` entry are not malformed.** The parser drops them (Part 2), exactly as
  `parseLinks` drops a third key on a `Link`, and nothing reads them. Reporting them would be over-reporting
  — QA's own words, and the reverse direction of R16-2 rather than a second instance of it.
- **`undefined` in a `weekly` slot is not malformed.** `fromJSON` normalises it to `null`, so by the
  predicate's own definition (*"exactly when `fromJSON` accepts it"*) it is accepted. Normalisation and
  refusal are different acts and this ruling keeps them apart on purpose: the parser normalises only
  **absence** (as it already does for `datePrecision`, `travelRole`, `ownerId`, `retiredAt`) and refuses
  every present-but-wrong value.

**Part 2. `serialize/fromJSON.ts` — `hours` becomes a field like every other field.**

```ts
/**
 * `HH:MM`, with no empty string. `clockOrNull` allows `''` because a stop's time may be blank;
 * an opening time that exists is a time.
 */
function clock(v: unknown, path: string): string {
  const s = str(v, path);
  if (!isClockTime(s)) throw new TripParseError('expected HH:MM', path);
  return s;
}

function parseOpeningHours(v: unknown, path: string): OpeningHours {
  const o = obj(v, path);
  return {
    weekly: arr(o.weekly, `${path}.weekly`).map((w, i) => {
      if (w === null || w === undefined) return null;
      const e = obj(w, `${path}.weekly[${i}]`);
      return {
        day: numOf(e.day, `${path}.weekly[${i}].day`),
        open: clock(e.open, `${path}.weekly[${i}].open`),
        close: clock(e.close, `${path}.weekly[${i}].close`),
      };
    }),
    ...(o.note !== undefined ? { note: str(o.note, `${path}.note`) } : {}),
  };
}
```

and in `parsePlace`, the cast becomes

```ts
...(o.hours !== undefined ? { hours: parseOpeningHours(o.hours, `${path}.hours`) } : {}),
```

Four points a builder does not have to decide:

- **`hours: null` is refused** (`expected an object`), because `Place.hours` is optional and *not* nullable —
  the same treatment `links: null` and `note: null` already get, and the opposite of `cost`/`ticket`/`at`,
  whose types *are* nullable. Only `undefined` means absent, and absent means the key is not written.
- **The entry is rebuilt from three named fields**, so an unenumerated key on a `weekly` entry — R15-1's
  actual carrier — cannot survive the parser at all. This is `parseLinks`' construction, applied one record
  over.
- **`isClockTime` is imported from Part 1's module, and `clockOrNull` is rewritten to use it too**
  (`if (s !== '' && !isClockTime(s)) throw …`). After this pass the clock regex appears **once** in
  `packages/core`. A second copy of the predicate is the disease this ruling is treating; introducing one
  while treating it would be absurd.
- **`numOf` already refuses `NaN`/`±Infinity`**, which is where `weeklyForCopy`'s extra `Number.isFinite`
  requirement came from. The two definitions agree now because there is one definition.

**Part 3. `validate/validateTrip.ts` — delete `wellFormedHours`.** Its 12 lines go; the call site becomes
`if (p.hours !== undefined && !isOpeningHours(p.hours))` and the `Issue` it pushes is **unchanged** in
level, code, ref, message and params. Its doc comment is rewritten to the narrowed meaning above.

**Part 4. `build/copyStop.ts` — `weeklyForCopy` keeps only what is genuinely a copy-boundary policy.**

```ts
function weeklyForCopy(w: unknown): { day: number; open: ClockTime; close: ClockTime } | null {
  if (w === null || w === undefined || !isWeeklyEntry(w)) return null;
  const e = w as { day: number; open: string; close: string };
  // A-18 policy, NOT a shape test: an opening time that redaction would alter is not a time the
  // recipient could trust. Provably unreachable for a structurally valid entry — Part 5(a).
  if (redacted(e.open) !== e.open || redacted(e.close) !== e.close) return null;
  return { day: e.day, open: e.open, close: e.close };
}
```

`hoursForCopy` is **unchanged**, including its `Array.isArray` guard and its `raw as unknown` treatment: the
copy still may not throw on an in-memory document that never went through the parser (R15-2's closure is not
reopened), and A-18's *"a field nobody named does not travel"* still holds. The structural half of the
question is now asked in exactly one place, and the redaction half stays where it belongs — a **policy**
that drops a time, distinguishable in code and in comment from *malformed*, which is what QA asked for.

**Part 5. Two tests, and the first is the one that makes R16-2 unrepeatable.**

- **(a) The redaction arm cannot fire on a well-formed entry — exhaustively, not by sampling.** For all
  **11 000** strings matching `/^\d{1,2}:\d{2}$/` (hours `0`–`9` and `00`–`99`, minutes `00`–`99`),
  `redactText(s) === s`. QA measured 240 of them by hand at round 16; the whole accepted set is small enough
  to prove. This converts *"the copy never silently drops an entry `validateTrip` calls well-formed"* from an
  argument into a red test the day someone adds a `REDACTION_PATTERN` that breaks it — at which point the
  divergence is an architect's problem again, on purpose, rather than a silent `null`.
- **(b) The invariant R16-2 asked for, stated directly.** Over a table of `weekly` entry shapes that
  includes the three R16-2 found (`close:'170000'`, `open:'https://vendor.test/x'`, `open:'YZGDTS'`), a
  legitimate entry, an entry with an extra key, `null`, `undefined`, a nested object, an array and a string:
  **if `isWeeklyEntry(w)` and `w != null`, then `weeklyForCopy(w) !== null`.** Given (a) this cannot be
  satisfied by weakening either side. Beside it: each of the three R16-2 shapes now (i) makes `fromJSON`
  throw a `TripParseError` naming the exact path, and (ii) produces exactly one `place_hours_malformed` on a
  cast-built in-memory document.

**What else moves, and it is one line.** `serialize/toJSON.ts:39` writes `hours: p.hours` — the same field
passed through unenumerated, on the way *out*, in a function that rebuilds every other field by name. It
becomes a field-by-field rebuild (`weekly` mapped to `{day, open, close}` or `null`, `note` via `omitUndef`),
which removes the aliasing between an in-memory `weekly` array and the object handed to `JSON.stringify`,
and stops `toJSON` re-emitting an unenumerated key from a cast-built document. It does **not** normalise or
drop a malformed value: an export stays a faithful record of what the document holds, `validateTrip` is what
says the document is wrong, and `fromJSON` is what refuses it on the way back in. The goldens and the sample
do not move — no place in either carries `hours`.

**What does not change.** `Place`'s shape and `OpeningHours`' shape; `schemaVersion` (no document that any
version of this system could write is refused by this rule — the population is empty, measured above, so a
bump would be ceremony); `redactText` and `REDACTION_PATTERNS` — **this ruling adds no pattern and no call
site**; `tools/redact.mjs` and §6.6's sample path, whose deep walk already runs `open`/`close` through
`redactText` (neither is a `STRUCTURAL_KEY`) with no effect, which Part 5(a) now pins; A-15's table, A-16,
A-18 position 2 and A-19 in full; `packages/client`, `apps/web`, `cli.ts`; §2.10 at **71**.

**Two sentences elsewhere in this document are amended by this ruling and are marked at their sites.**
A-15's `hours` row said *"`weekly` cloned entry by entry"* — it is now *rebuilt from three named fields
against one shared predicate*. A-18's *"this ruling changes nothing in `fromJSON`"* was true of A-18 and is
superseded here: the parser gap A-18 correctly identified as R15-1/R15-2's root cause is closed by A-20.

**`qa/` is QA's, and this ruling will turn two probes red on purpose.** `qa/r15-place-copy.mjs` and
`qa/r16-copy-depth.mjs` push hostile `hours` shapes **through `fromJSON`** and assert it accepts them. After
this pass those lines meet a `TripParseError`, which is the new correct behaviour and not a defect. A-19
assertion 7 stands — **the builder does not edit anything under `qa/`** — so the builder reports which probe
lines it expects to move and QA re-expresses them in round 17, exactly as round 16 re-expressed three lines
of `r15-place-copy.mjs`. The re-expressed assertion is two-sided and both halves must be kept: **`fromJSON`
refuses with a path**, and **`copyStopInto` still never throws** on the equivalent *cast-built in-memory*
document. Tests under `packages/core/test/` are the builder's and are re-expressed in this pass — a hostile
`hours` fixture now arrives by cast, not by parse.

**What the builder asserts:**

1. **Part 5(a) and 5(b) both green**, and 5(b) fails when either predicate is weakened on one side only —
   mutation-verified, since a test that cannot fail is what R15-4 and R15-5 were.
2. **`fromJSON` refuses with the exact path** for: `hours: 'mon-fri'` → `$.places[0].hours`;
   `hours: {weekly:'mon-fri'}` → `$.places[0].hours.weekly`; `hours: {weekly:[{day:1,open:'9:00',close:'170000'}]}`
   → `$.places[0].hours.weekly[0].close`; `hours: null` → `$.places[0].hours`; a non-string `hours.note` →
   `$.places[0].hours.note`.
3. **`fromJSON` accepts and normalises** — a legal `hours` round-trips byte-identically through
   `toJSON(fromJSON(doc))`; a `weekly` entry with an extra key parses with the key **dropped**; an
   `undefined` slot parses to `null`.
4. **`copyStopInto` never throws** on any of the 34 shapes round 15/16 built, supplied as a cast-built
   in-memory document rather than through the parser. R15-2 stays closed.
5. **Exactly one clock regex in `packages/core`** — `grep -rn '\d{1,2}:' packages/core/src` returns
   `model/openingHours.ts` and nothing else. (It returns exactly one line today, in `fromJSON.ts`; this
   assertion is that it still returns exactly one, at the new address.)
6. **`wellFormedHours` no longer exists**, `isOpeningHours` is not on `index.ts`, and no second copy of
   either predicate exists in `build/` or `validate/`.
7. Ceilings: **71** exports, the reference trip at **2 blockers / 4 warnings / 11 notes** at `FIXTURE_TODAY`
   and **11** `validateTrip` issues (`place_hours_malformed` does not fire — 0 of 95 places carry `hours`),
   goldens and sample sha byte-identical, `qa/r2-copy.mjs` (§H included), `qa/prov.mjs` and
   `qa/r14-horizon-copy.mjs` unmoved, `npm run test:tap` green, `npm run typecheck` clean, `npm run web:build`
   clean.

**The residue, named rather than discovered later.** The day something other than a person's own hand writes
`Place.hours` — a vendor's opening-hours feed, an ingest candidate (§5.1), an import from a mapping
service — the population that this rule refuses stops being empty, and refusing a whole trip because a
vendor writes `9:00 AM` is the wrong trade. **That is the trigger to re-rule Part 2**, and the shape it would
take is already decided by the rest of this ruling: the *parser* would normalise the field it can and drop to
`null` the entry it cannot, `place_hours_malformed` would become the live report of it, and the shared
predicate would not move. Nothing about the copy boundary or `validateTrip` changes on that day.

#### A-21 — a value that crosses a boundary is read once, and a predicate over a compound value hands back what it read (revision 16, QA R17-1)

**The defect, and it is in A-20's own printed body.** A-20 Part 1 prints `isWeeklyEntry(v): boolean`. A
boolean answers *"is that value well-formed?"* and then throws the value away, so every consumer must go
back to the object and **read the field again** to use it. `weeklyForCopy` therefore reads `open` four
times — inside `isWeeklyEntry`, inside `redacted(e.open)`, in the `!==` comparison, and in the object it
returns — and `close` four times, and `day` twice. For a plain data object every read is equal, which is
exactly why A-20's argument held and why every one of QA's 53 parser shapes agreed. For an **accessor
property** they are four different values.

Measured (a getter returning `'9:00'` on reads 1–3 and a credential on read 4, against bodies copied
verbatim out of `model/openingHours.ts` and `build/copyStop.ts`):

```
weeklyForCopy, as shipped:  {"day":1,"open":"Front door PIN 0754, conf 5814731574","close":"17:00"}
```

That string is then greppable in the recipient's `toJSON`. It is R15-1's exact harm, on the person boundary
A-15 and A-18 were written to close, reached through the one construction A-20 introduced while closing it.
**MINOR, and the bound is the population, not the harm**: `JSON.parse` produces own data properties and
never accessors, so no document can do this — it needs a `Place` built in memory past the type system, the
same population `place_hours_malformed` was ratified for. QA routed it here rather than to a builder because
the builder implemented the ruling exactly; the ruling is what re-reads.

**The rule, stated so it decides the next case as well as this one.**

> **Within one traversal, a field of a caller-supplied value is read exactly once.** The value that was
> checked is the value that is used, compared, redacted and emitted. A predicate over a **compound** value
> therefore returns *what it read* — never a `boolean` that its caller must re-derive the value to act on.

There is a safe double read and an unsafe one, and the difference is the whole rule. A builder applies this
discriminator rather than a style preference:

- **Safe — read 1 decides only whether a key is *present*; read 2 is validated and *is* the value used.**
  `fromJSON`'s `...(o.x !== undefined ? { x: str(o.x, path) } : {})` is this form, in about forty places.
  Nothing unvalidated can escape it: whatever read 2 returns is what `str`/`numOf`/`clock` check and hand
  back, and the worst outcome an unstable getter can produce is a `TripParseError` on a named path — a
  legitimate refusal. **This form does not change**; rewriting forty sites with no defect behind them is
  churn, and churn in a parser is how a parser acquires one.
- **Unsafe — read 1 is validated or tested, and read 2 is used, compared or emitted.** That is R17-1, and
  it is banned. Also unsafe, and the same shape one step down: **read 1 is `Array.isArray`-tested and read 2
  is `.map`ped or `.every`ed**, which is not a leak but a raw `TypeError` out of a function §2.1 says does
  not throw.

Note what is *not* covered, so nobody over-applies it: a value **core itself constructed** from validated
scalars is stable by construction and may be read freely (destructuring `read.entry` below is not a re-read
of the caller's object); and a **discriminant tested against a closed set**, where every branch builds a
fresh record from named fields, may be read more than once, because the worst an unstable discriminant can
then produce is a well-formed record of the wrong variant — a hole, never a leak. Both carve-outs are used
below and neither is discretionary.

**The search, and it found seven more sites in six functions the finding did not name.** The general class
is *reads a field of a caller-supplied value
more than once*, so this was a search of `model/openingHours.ts`, `serialize/fromJSON.ts`,
`build/copyStop.ts` and the `hours` half of `serialize/toJSON.ts` (A-20's own diff), not a patch of the
reported line. Every consequence below was produced by running the shipped body against a flipping getter,
not by reading it:

| site | field, reads | measured consequence today |
|---|---|---|
| `copyStop.ts` `weeklyForCopy` | `open` ×4, `close` ×4, `day` ×2 | **R17-1.** `open: "Front door PIN 0754, conf 5814731574"` in the recipient's document |
| `copyStop.ts` `costForCopy` | `display` ×4 | **The same leak, unfiled.** `display: "conf 5814731574"` crosses — A-18's own field, by A-18's own construction (`redacted(c.display) === c.display ? c.display : null`) |
| `copyStop.ts` `costForCopy` | `amounts` ×2 | `TypeError: c.amounts.map is not a function` out of `copyStopInto` |
| `copyStop.ts` `hoursForCopy` | `weekly` ×2 | `TypeError: o.weekly.map is not a function` out of `copyStopInto` — R15-2's closure, reopened on a getter |
| `copyStop.ts` `placeForCopy` | `at` ×3 | `TypeError: Cannot read properties of null (reading 'lat')` |
| `copyStop.ts` `copyStopInto` | `src.place` ×5, `placement.cityKey` ×2 | **An alias, and it needs no getter at all.** The ternary's fallthrough is `place = src.place`, so a cast-built `PlaceLink` with an out-of-union `kind` puts the **source's own object, with every key it carries**, into the target document — A-18 position 2's *"no spread of a source record at any depth"* defeated by something worse than a spread. The `as { placeId: string }` cast two lines down is the same re-read |
| `openingHours.ts` `isOpeningHours` | `weekly` ×2, `note` ×2 | `TypeError: o.weekly.every is not a function` — thrown out of a predicate whose docstring says *"Throws nothing"*, and out of `validateTrip`, whose docstring says *"Nothing here throws"* |
| `toJSON.ts` `hours()` | `weekly` ×2 | `TypeError: o.weekly.map is not a function` out of an export |
| `fromJSON.ts` `parseOpeningHours`, `clock`, `clockOrNull` | — | **Clean already.** `arr`/`obj`/`str`/`numOf`/`clock` each return the value they validated, and the entry is built from those returns. This is the shape the rest of this ruling copies |

`weeklyOut` in `toJSON.ts` is also already clean (one read per field). `arrivalForCopy`, `placeForCopy`'s
`note`/`hours` and `costForCopy`'s `note` are the **safe** double-read form (read 2 goes through `redacted`,
which is total and fails closed) — they are hoisted below anyway, for a reason given in Part 4.

**Part 1. `model/openingHours.ts` — the predicate returns the entry.** `isWeeklyEntry` is **deleted** and
replaced. The module keeps three runtime exports and stays **off `index.ts`** (§2.10 unmoved at **71**);
`WeeklyEntry` and `WeeklyRead` are types and cost nothing there.

```ts
/** `H:MM` or `HH:MM`. The one clock-shape test in this system. Pure. Throws nothing. */
export function isClockTime(v: unknown): v is ClockTime {
  return typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v);
}

/** One well-formed `weekly` entry, already read. Every field here is a value, never a getter. */
export type WeeklyEntry = { day: number; open: ClockTime; close: ClockTime };

/** The result of reading one `weekly` slot exactly once. Three outcomes, because `null` cannot
 *  mean both "absent, and that is valid" and "malformed". */
export type WeeklyRead =
  | { kind: 'absent' }
  | { kind: 'entry'; entry: WeeklyEntry }
  | { kind: 'malformed' };

/**
 * Reads one `weekly` slot **once per field** and hands back what it read (A-21). Pure. Throws
 * nothing of its own — a getter on the caller's object that throws still propagates, which is
 * true of reading any field of any record and is not this function's to catch.
 */
export function readWeeklyEntry(v: unknown): WeeklyRead {
  if (v === null || v === undefined) return { kind: 'absent' };
  if (typeof v !== 'object' || Array.isArray(v)) return { kind: 'malformed' };
  const e = v as { day?: unknown; open?: unknown; close?: unknown };
  // One read per field, in the order the boolean predicate short-circuited in, so the read
  // COUNT and the read ORDER are both unchanged from A-20 for every value either can see.
  const day: unknown = e.day;
  if (typeof day !== 'number' || !Number.isFinite(day)) return { kind: 'malformed' };
  const open: unknown = e.open;
  if (!isClockTime(open)) return { kind: 'malformed' };
  const close: unknown = e.close;
  if (!isClockTime(close)) return { kind: 'malformed' };
  return { kind: 'entry', entry: { day, open, close } };
}

/** True when `v` is an `OpeningHours` — i.e. exactly when `fromJSON` accepts it. Pure. Throws nothing. */
export function isOpeningHours(v: unknown): boolean {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as { weekly?: unknown; note?: unknown };
  const weekly: unknown = o.weekly;
  const note: unknown = o.note;
  if (!Array.isArray(weekly)) return false;
  if (note !== undefined && typeof note !== 'string') return false;
  return weekly.every((w) => readWeeklyEntry(w).kind !== 'malformed');
}
```

Four points a builder does not have to decide:

- **`isClockTime` becomes a type predicate** (`v is ClockTime`). That is what lets `readWeeklyEntry` build a
  `WeeklyEntry` with **no cast at all** — `w as { day: number; open: string; close: string }`, the
  construction A-18 spent a ruling removing from `copyStop.ts`, disappears from this system rather than
  moving. `ClockTime` is `string` (`model/ids.ts`), so every existing caller (`clock`, `clockOrNull`) is
  unaffected. Verified rather than assumed: every body printed in this ruling typechecks clean under
  `strict`, `erasableSyntaxOnly` and `verbatimModuleSyntax`, in a scratch file with the real declarations
  stubbed — including the narrowing that removes the cast.
- **`isOpeningHours` stays a `boolean`, and that is not an inconsistency.** Its only consumer *reports* on
  the value (`place_hours_malformed`) and never uses it, so there is nothing for it to hand back. The line
  is: a predicate whose caller will **act on the value** returns the value; a predicate whose caller will
  **describe the document** returns a boolean. `isClockTime` is a boolean for the other reason — its
  argument is an already-read scalar, so there is no second read to get wrong.
- **The accept set does not move**, and that is the load-bearing claim, because A-20's contract sentence
  (*"`isOpeningHours(v)` is true exactly when `fromJSON` accepts `v`"*) is the strongest thing in that
  ruling. `readWeeklyEntry(v).kind !== 'malformed'` ⟺ the old `isWeeklyEntry(v)`. Measured over the 28 entry
  shapes and 18 `hours` shapes of the shipped test table plus QA's round-17 hostiles (`Object.create(null)`,
  a boxed `String`, a function, a symbol, a trailing `\n`, a sparse `weekly`, a getter-bearing `weekly`):
  **0 disagreements**, in a scratch script against bodies copied verbatim. The builder re-derives this in
  `openingHours.test.ts` rather than trusting it.
- **`weekly.every` still skips array holes**, so round 17's *"a sparse `weekly` stays sparse"* note holds
  unchanged, and a hole never reaches `readWeeklyEntry` at all.

**Part 2. `serialize/fromJSON.ts` — nothing changes.** `parseOpeningHours`, `clock` and `clockOrNull` are
already read-once-and-return: `arr` hands back the array it checked, `obj` the object, `str`/`numOf`/`clock`
the scalar, and the entry is built from those returns. The parser is the model this ruling generalises from,
not a site of it. The `...(o.x !== undefined ? { x: str(o.x, path) } : {})` form throughout the file is the
**safe** double read defined above and is explicitly blessed here so that a later reader does not "finish
the job" across forty call sites.

**Part 3. `serialize/toJSON.ts` — one line, in the function A-20 added.**

```ts
function hours(h: Place['hours']): unknown {
  const raw = h as unknown;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const o = raw as { weekly?: unknown; note?: unknown };
  const weekly: unknown = o.weekly;              // A-21: one read; `Array.isArray` and `.map` see
  return omitUndef({                             // the same value, so an export cannot throw here.
    weekly: Array.isArray(weekly) ? weekly.map(weeklyOut) : weekly,
    note: o.note,
  });
}
```

`weeklyOut` is unchanged — it already reads each field once. **The rest of `toJSON` is deliberately out of
scope**, and the boundary is principled rather than arbitrary: `toJSON` writes the user's own document back
to the user, so an unstable getter there costs that caller their own data and crosses no boundary and leaks
to nobody. `hours()` is fixed because it is part of A-20's diff and because its second read can throw *out
of an export*. `place()`'s `p.at ? { lat: p.at.lat, … } : null` has the same shape and is knowingly left;
the day something other than a person's own hand builds a `Trip` in memory — a native bridge, an ingest
worker (§5.1) — is the trigger to sweep `toJSON` whole, and it is the same trigger A-20's own residue
paragraph names.

**Part 4. `build/copyStop.ts` — every field of a source record is read once.** Unlike Parts 2 and 3 this is
a **file-wide** rule, not five patched lines, and the reason is that this file is the one place in the
design where data crosses a *person* boundary: the discriminator between a safe and an unsafe double read is
a judgment call, and this is not the file to leave one in. Five helpers and one block. (Imports move by
three lines: `WeeklyEntry` and `readWeeklyEntry` come from `../model/openingHours.ts` in place of
`isWeeklyEntry`; `Money` and `LatLng` join the `../model/types.ts` type import; `ClockTime` leaves the
`../model/ids.ts` type import, where `weeklyForCopy`'s old return type was its only consumer.)

```ts
function weeklyForCopy(w: unknown): WeeklyEntry | null {
  const read = readWeeklyEntry(w);
  if (read.kind !== 'entry') return null;
  const { day, open, close } = read.entry;
  // A-18 policy, NOT a shape test: an opening time that redaction would alter is not a time the
  // recipient could trust. Provably unreachable for a structurally valid entry — A-20 Part 5(a).
  if (redacted(open) !== open || redacted(close) !== close) return null;
  // Rebuilt, not `return read.entry`: three scalars cost nothing, and the copy must not become
  // aliased to the reader's return value if the reader is ever changed to hand back its input.
  return { day, open, close };
}

function hoursForCopy(h: OpeningHours): OpeningHours {
  const raw = h as unknown;
  const o = (raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as {
    weekly?: unknown;
    note?: string;
  };
  const weekly: unknown = o.weekly;
  const note: string | undefined = o.note;
  return {
    weekly: Array.isArray(weekly) ? weekly.map(weeklyForCopy) : [],
    ...(note === undefined ? {} : { note: redacted(note) }),
  };
}

function costForCopy(c: CostEstimate): CostEstimate {
  const rawAmounts: unknown = c.amounts;
  const display: string | null = c.display;
  const note: string | undefined = c.note;
  const amounts: Money[] = Array.isArray(rawAmounts) ? rawAmounts : [];
  return {
    amounts: amounts.map((a) => ({ lo: a.lo, hi: a.hi, currency: a.currency, basis: a.basis })),
    display: display === null ? null : redacted(display) === display ? display : null,
    ...(note === undefined ? {} : { note: redacted(note) }),
  };
}

function arrivalForCopy(a: MoveOverride): MoveOverride {
  const label: string | undefined = a.label;
  return { mode: a.mode, mins: a.mins, ...(label === undefined ? {} : { label: redacted(label) }) };
}

function placeForCopy(p: Place, cityKey: string, id: PlaceId): Place {
  const at: LatLng | null = p.at;
  const note: string | undefined = p.note;
  const hours: OpeningHours | undefined = p.hours;
  return {
    id,
    cityKey,
    name: p.name,
    at: at === null ? null : { lat: at.lat, lng: at.lng },
    category: p.category,
    ...(note === undefined ? {} : { note: redacted(note) }),
    ...(hours === undefined ? {} : { hours: hoursForCopy(hours) }),
  };
}
```

and in `copyStopInto`, the place block loses its alias, its cast and its fallthrough:

```ts
  const srcPlace: PlaceLink = src.place;   // A-21: ONE read of the field.
  let withPlace = target;
  // The hole is the DEFAULT, and every branch below overwrites it deliberately. It used to be
  // `: src.place` — so a cast-built link with an out-of-union `kind` put the SOURCE's own object,
  // with every key it carried, into the target document. A-18 position 2 forbids a spread of a
  // source record at any depth; an alias of one is worse, and this was the only one left.
  let place: PlaceLink = { kind: 'none' };
  if (srcPlace.kind === 'inline') {
    // R14-3: a clone. Two documents may not share one mutable `LatLng`.
    place = { kind: 'inline', at: { lat: srcPlace.at.lat, lng: srcPlace.at.lng } };
  } else if (srcPlace.kind === 'place') {
    const original = source.trip.places.find((p) => p.id === srcPlace.placeId);
    // `original` missing → `place` stays `{kind:'none'}`: the source's own link dangled, and we
    // do not invent one. Everything else in this branch is A-14/A-15/A-16, unchanged.
    if (original) { /* … refileCityKey / samePlace / placeForCopy block, verbatim … */ }
  }
```

Four notes on this block. `srcPlace.kind` is read in two tests — permitted by the discriminant carve-out
above, because each branch constructs a fresh record and the worst an unstable `kind` yields is
`{kind:'none'}`, a hole. `srcPlace.placeId` is read once, as a lookup **key** against the target-side row,
which `placeForCopy` then rebuilds field by field. The `as { placeId: string }` cast is **gone**, because
narrowing a `const` of a discriminated union needs none. And the behaviour change is confined to documents
that are already type-lies: for every `PlaceLink` the type system actually permits, the output is
bit-for-bit what A-14/A-15/A-16 left — any test asserting the old aliasing is asserting the defect and is
re-expressed.

**Part 4(c). The one argument, held to the same rule.** `copyStopInto` validates `placement.cityKey` against
`target.cities` and then **emits a second read of it** into the document, which is the banned form even
though A-19 classifies a `placement` as an *argument* (programmer error) rather than a document. The two
validation throws and the rebuilt `placed` merge into one branch on the discriminant, so each field is read
once and the throw and the emission see the same value. **A-19's rules are otherwise untouched: same
throws, same messages, same `TRANSIT_CITY_KEY` exemption, same dropped-hint fallback**, and A-19's own
comment block above this code is unchanged.

```ts
  let placed: StopPlacement;
  if (placement.kind === 'scheduled') {
    const dayId = placement.dayId;
    const time = placement.time;
    const order = placement.order;
    if (!target.days.some((d) => d.id === dayId)) {
      throw new Error(`copyStopInto: no such day ${dayId} in ${target.id}`);
    }
    placed = { kind: 'scheduled', dayId, time, order };
  } else {
    const cityKey = placement.cityKey;
    const h = placement.hint;
    if (cityKey !== TRANSIT_CITY_KEY && !target.cities.some((c) => c.key === cityKey)) {
      throw new Error(`copyStopInto: no such city ${cityKey} in ${target.id}`);
    }
    // One read per hint field, into an object core owns. Everything below reads THAT object,
    // which is stable by construction — the carve-out, used deliberately.
    const hintFields = h === undefined ? undefined : { dayId: h.dayId, time: h.time, order: h.order };
    const hint =
      hintFields !== undefined && target.days.some((d) => d.id === hintFields.dayId)
        ? { dayId: hintFields.dayId, time: hintFields.time,
            ...(hintFields.order === undefined ? {} : { order: hintFields.order }) }
        : undefined;
    placed = { kind: 'pool', cityKey, ...(hint ? { hint } : {}) };
  }
```

`placement.kind` is read once per branch rather than hoisted, because hoisting a discriminant into a `const`
loses TypeScript's narrowing and would put back the very casts this ruling removes — the discriminant
carve-out exists for exactly this. The two throws are now in mutually exclusive branches, which is
unobservable: they were already mutually exclusive by `kind`. It is included because
the rule for this file is only checkable if it is **total** — "every field of every record this function
reads, once" is a property a reviewer can verify in one pass; "every field except the ones supplied by a
caller we trust" is a judgment call, and this file has produced at least one finding in each of the last
four QA rounds.

Likewise `src.name`, `src.category`, `src.note`, `src.cost`, `src.arrival`, `src.travelRole`, `src.flags`,
`src.links`, `src.durationMins` and `src.provenance.confidence` are read into `const`s once, ahead of the
`StopInit` literal. Most are already single-read; the rule is stated for the file so that the *next* field
added to `Stop` inherits it.

**What Part 4 deliberately does not do:** it adds **no new defensive guard**. `src.links` that is a truthy
non-array still throws on `.map`, and `[...src.flags]` still throws on a non-iterable, exactly as today.
A-21 is about *which value crosses*, not about whether a type-lie throws; the latter is R15-2's rule, whose
scope A-20 already fixed at `hours` (the one field a *parsed* document could lie about) and which this
ruling does not widen. Opening that campaign here would be a different ruling with a different criterion,
and there is no finding behind it.

**Part 5. What this closes, measured.** Same fixtures, same flip points, the new bodies:

```
weeklyForCopy:            {"day":1,"open":"9:00","close":"17:00"}     (was: the credential)
cost.display:             "€25"                                       (was: "conf 5814731574")
isOpeningHours(flipping): true                                        (was: TypeError …every is not a function)
hoursForCopy(flipping):   {"weekly":[]}                               (was: TypeError …map is not a function)
```

The invariant this establishes, and it is the one to state rather than any of the four lines above:
**no value crosses a person boundary that was not itself validated, and no traversal in core emits, compares
or redacts a value it did not read.**

**Part 6. What A-21 does *not* close — R17-1's second face, named rather than left to be re-found.**
QA's second face is that `validateTrip` reports no `place_hours_malformed` on a document whose export then
fails to re-import. That is a claim about **two traversals**: `validateTrip` reads at T1, `toJSON` reads at
T2, and if the document returns different values to the two of them, no report made at T1 can be true at T2.
**No single-read discipline inside either function can fix that**, because there is no single read — there
are two calls, and the instability is in the caller's object, not in core's code. So:

> After A-21, `validateTrip`'s verdict is a true statement about the values **it** read, and `toJSON` exports
> the values **it** read. Each traversal is internally consistent and none of them throws. A document that
> answers the two of them differently is not a document; it is a program pretending to be one, and the
> harm is bounded to that caller's own export of their own trip.

`qa/r17-hours-parser.mjs` §3.2's second assertion (`warned || restores`) is therefore **not satisfiable by
any implementation that does not re-read**, and it is withdrawn as over-strong rather than fixed. The
invariant QA may assert in its place is the four-part one above. Two mechanisms *would* close it, and both
are refused now with a trigger:

- **Freeze or deep-snapshot the document at every core entry point.** It would work, and it costs a full
  clone of the largest object in the app on every reducer action, in a design built on pure functions over
  shared immutable structure — and it *invokes every getter anyway*, so a throwing getter stops being a
  localised propagation and becomes a whole-document failure. Refused on cost, not on principle.
- **Round-trip the export: `fromJSON(toJSON(trip))` at save time, and warn if it throws.** This is strictly
  the better guarantee — *"your backup restores, or you were told"* becomes unconditional, for every cause
  and not just this one — and it would arguably supersede `place_hours_malformed`. It is refused **now**
  because it is a `packages/client` behaviour change on the save path, ratified two revisions ago in the
  other direction, for a fault only an in-process caller can create. **The trigger is the same one A-20
  named**: the day anything other than a person's own hand writes a document core did not parse — a native
  bridge, an ingest candidate (§5.1), a vendor feed — the round-trip check is the design, and it is ruled
  then, in `packages/client`, not here.

**What does not change.** `Place`'s shape and `OpeningHours`' shape (`WeeklyEntry` is named in
`model/openingHours.ts` and `model/types.ts` is **not** edited to import it — that is a refactor with no
defect behind it); `schemaVersion`; A-20's contract sentence, its Part 2, its Part 5(a)'s 11 000 strings and
its ratification of `place_hours_malformed` in level, code, `ref`, message and params; `redactText` and
`REDACTION_PATTERNS` — **this ruling adds no pattern and no call site**; `tools/redact.mjs` and §6.6's
sample path; A-14, A-15, A-16, A-18 and A-19 in rule and in outcome for every value the type system permits;
`validateTrip`'s call site (`p.hours !== undefined && !isOpeningHours(p.hours)` is the safe double-read
form); `packages/client`, `apps/web`, `cli.ts`; §2.10 at **71**; the reference trip at 2/4/11 and 11 issues;
the goldens and the sample sha.

**The probe lines this ruling moves, named by the ruling and re-expressed by QA.** A-19 assertion 7 stands —
**the builder edits nothing under `qa/`** — so the builder reports these and QA re-expresses them in round 18:

- `qa/r16-copy-depth.mjs` §1.4's source-grep assertion (~`:484`) tests `/isWeeklyEntry\(w\)/` and
  `/redacted\(e\.open\) !== e\.open/` against `build/copyStop.ts`. Both are false after Part 4 and the
  equivalents are `/readWeeklyEntry\(w\)/` and `/redacted\(open\) !== open/`. The assertion's *subject* —
  that the structural half is asked once, elsewhere, and the redaction half is a copy-boundary policy — is
  unchanged and still true.
- `qa/r17-hours-parser.mjs` §3.2's **first** assertion (the leak) must go **green**. If it does not, Part 4
  is not implemented.
- `qa/r17-hours-parser.mjs` §3.2's **second** assertion (`warned || restores`) stays red and is withdrawn by
  Part 6. A builder who makes it pass by touching `toJSON` or `place_hours_malformed` has reverted A-20.

**What the builder asserts.** Every one of these is mutation-verified — a test that cannot fail is what
R15-4, R15-5, R16-1 and R17-2 all were, and this ruling will not add a fifth.

1. **The injected fault is a flipping accessor** (§0.5). One four-line helper per test file that needs it:
   ```ts
   /** A getter that returns a different value on each read — A-21's injected fault. The last value
    *  repeats forever, so a call site's read COUNT cannot change the outcome. */
   function flipping<T>(values: readonly T[]): () => T {
     let i = 0;
     return () => { const v = values[Math.min(i, values.length - 1)] as T; i += 1; return v; };
   }
   ```
2. **`copyStop.test.ts`** — with `open` flipping `['9:00','9:00','9:00','Front door PIN 0754, conf 5814731574']`
   on a cast-built source place: the recipient's `hours.weekly[0].open` is **exactly `'9:00'`**, and neither
   `0754` nor `5814731574` is greppable anywhere in the recipient's `toJSON`. The same, for `cost.display`
   flipping `['€25','€25','€25','conf 5814731574']` → **`'€25'`**, `amounts` unmoved. The same, for a
   `weekly` flipping `[[], 'nope']` and an `at` flipping `[{lat:1,lng:2}, null]` → `copyStopInto` **does not
   throw** and the copied `at` is `{lat:1,lng:2}`. And a cast-built `place` of `{kind:'nope', pin:'…'}` →
   the copy's `place` is `{kind:'none'}` and `pin` is **not** in the recipient's `toJSON`. And Part 4(c):
   a `{kind:'pool'}` placement whose `cityKey` flips from a key the target **has** to one it does not →
   `copyStopInto` does not throw, the stop is filed under the **validated** key, and `validateTrip` on the
   recipient reports **no** `pool_stop_unknown_city` — the uncleanable issue A-19 exists to prevent.
3. **`openingHours.test.ts`** — the existing entry table is re-expressed 1:1 with the mapping `true` ⟺
   `readWeeklyEntry(v).kind !== 'malformed'`, and `null`/`undefined` ⟺ `kind === 'absent'`; **no row's
   verdict moves**. Plus: `isOpeningHours` and `toJSON` **do not throw** on a `weekly` flipping `[[],'nope']`,
   and `validateTrip` on the same document returns an `Issue[]` rather than throwing.
4. **A-20's contract sentence is re-derived, not assumed**: `isOpeningHours(v)` still agrees with
   `fromJSON`'s object arm on every shape the existing table carries.
5. **Six mutations, at least one red test each** (throwaway worktree, discarded): re-reading `e.open` in
   `weeklyForCopy`; re-reading `c.display` in `costForCopy`; re-reading `o.weekly` in `isOpeningHours`;
   re-reading `o.weekly` in `hoursForCopy`; re-reading `p.at` in `placeForCopy`; restoring
   `place = src.place` as the ternary fallthrough. A mutation that survives is a missing fixture and is
   reported as one, in BUILD-NOTES, in the finding's own words — not rounded down.
6. **Ceilings, unmoved**: `Object.keys(core).length` = **71** with `readWeeklyEntry` off `index.ts`; the
   reference trip at **2/4/11** at `FIXTURE_TODAY` and **11** `validateTrip` issues; `npm run golden` and
   `npm run sample` byte-identical, sample sha `40955ca0b182`; exactly **one** clock regex in
   `packages/core/src`, still at `model/openingHours.ts`; `npm run test:tap`, `npm run typecheck` and
   `npm run web:build` all clean; `qa/r2-copy.mjs`, `qa/prov.mjs`, `qa/r14-horizon-copy.mjs` and
   `qa/r15-place-copy.mjs` unmoved at 0 FAIL.
7. **No new `as` cast appears in `copyStop.ts`, and one is removed.** `copyStop.ts` still contains no
   `as string`, and — comments stripped — still exactly one `{ ...x }` spread, `{ ...target }`, the
   recipient's own document.

**The residue, named.** A-21 is a discipline, and a discipline that is not mechanically checked decays. The
check it ships with is behavioural (the flipping fixture), not a grep, because a grep over property-access
counts is brittle enough to be deleted the first time it false-positives. The day `copyStop.ts` grows a new
helper, the reviewer's question is *"does any field of a source record appear twice in this function?"* —
one pass over a 500-line file, and the reason that is affordable is that the file is deliberately small.
The day it stops being small is the day this rule needs a mechanical check, and that is a cheaper problem
than the one A-15, A-18 and A-21 have each been.

#### A-21a — Part 4's rule is total, and the one block it printed as *"verbatim"* still crashed (revision 16 addendum, BUILD-NOTES)

**The objection is upheld, and I re-derived it rather than taking the report.** Part 4 states a **file-wide**
rule and rests its whole value on that rule being **total** — *"every field of every record this function
reads, once"* is a property a reviewer can verify in one pass, and *"every field except the ones supplied by
a caller we trust"* is a judgment call. But Part 4's own printed place block elides A-14/A-15/A-16's
step-2/step-3 logic as `/* … refileCityKey / samePlace / placeForCopy block, verbatim … */`, and that block
reads `original.at` **three times** on the step-3 path — the `=== null` test, then `.lat`, then `.lng`. That
is the identical shape, on the identical field of the identical record, in the identical file, that Part 4
fixes one function away in `placeForCopy`.

Measured against the tree as shipped at `a3caca5`, in a throwaway copy, with a source place whose city the
target cannot re-file (so step 3 is live) and `at` an accessor:

```
at flips [{lat:1,lng:2}, null]        → TypeError: Cannot read properties of null (reading 'lat')
                                        thrown out of copyStopInto, after 2 reads
at flips [{lat:1,lng:2}, {lat:3,lng:4}] → copies {kind:'inline', at:{lat:3,lng:4}}, after 3 reads
```

The second line is the one that decides this, and it is not the one that was reported: it is not a crash but
a **coordinate that no `null` test ever saw crossing a person boundary**, which is A-21's subject sentence
verbatim. The builder prepared exactly the right fix, reverted it because the ruling said *verbatim*, and
routed it back. That was the correct call and it is what this addendum exists to answer.

**The word "verbatim" was shorthand for the wrong thing.** It marked *A-14/A-15/A-16's rules and outcomes as
unchanged* — which they are, and still are below — and it was written on a block Part 4 chose not to reprint.
A carve-out that exists only because a print was elided is not a ruling. **Part 4's rule extends to this
block**, and wherever Part 4 says "verbatim" it is to be read as *"A-14/A-15/A-16's rules and outcomes are
unchanged"*, never as *"exempt from Part 4"*.

**The fix, printed, because the last elision is what caused this.** Three lines change inside
`copyStopInto`'s `if (original)` block; `refileCityKey`, `samePlace` and `placeForCopy` are untouched in
body, in signature and in docstring, and A-14's step-3 comment and A-15's probe comment are preserved.

```ts
    if (original) {
      // A-21a: one read per field of `original` in THIS block. `at` was read three times below —
      // the `null` test and then `.lat`/`.lng` — which threw `Cannot read properties of null` out
      // of `copyStopInto`, and, for a getter that flipped to another coordinate, put a coordinate
      // the `null` test never saw into the recipient's document.
      const originalCityKey: string = original.cityKey;
      const at: LatLng | null = original.at;
      const targetKey = refileCityKey(source.trip, target, originalCityKey);
      if (targetKey === null) {
        // A-14 step 3 — comment unchanged.
        place = at === null
          ? { kind: 'none' }
          : { kind: 'inline', at: { lat: at.lat, lng: at.lng } };
      } else {
        // `refiled` is the PROBE the reuse search compares against — comment unchanged.
        // `name` is read HERE and not hoisted above `refileCityKey`: step 3 never uses it, and a
        // hoist would make a THROWING getter on `name` propagate on a path that never read it.
        // A-21 accepts that a getter's throw propagates; it does not widen the set of paths that
        // can see one.
        const name: string = original.name;
        const refiled = { cityKey: targetKey, name, at };
        // … `existing` / reuse / `placeForCopy` unchanged.
```

`LatLng` is already imported by this file (A-21 Part 4 added it for `placeForCopy`), so the import block does
not move. **Verified, not asserted**: with this body, `copyStopInto` returns rather than throws on both
flipping fixtures above, the step-3 read count of `at` is **1**, the copied coordinate is the one the `null`
test saw, `npm run typecheck` is clean on both projects, `packages/core/test/copyStop.test.ts` is **79/79**
and `openingHours.test.ts` **11/11** with **no assertion edited**, the full suite is unchanged against a
baseline run of the same copy, and `npm run golden` + `npm run sample` regenerate byte-identically.

**The search found a second field on the same split, which the report did not name.** `original.name` is read
by the `refiled` probe and again inside `placeForCopy`. Measured on the shipped tree: a `name` flipping
`['Belvedere', 'Front door PIN 0754, conf 5814731574']` puts the **second** read into the recipient's `Place`
row. That is the same rule violated, and — stated precisely — it is **not a new leak**: A-15 classifies
`name` as crossing verbatim (*"a place's name is a description of the world"*), so a stable hostile name
crosses identically today, by ratified policy. The harm is that the value the dedupe compared is not the
value the row carries.

**One exception survives this addendum, and it is now written down rather than invisible.** After the fix,
`placeForCopy(original, …)` still re-reads `name` and `at` on the reuse-**miss** path, because it takes a
`Place` and reads it. Read counts of `original`'s fields per path through `copyStopInto`, which is the
checkable form of this and what QA may assert:

> **This table is correct at its own granularity and is superseded one level down by A-22 Part 2
> (revision 17, QA R18-5).** All four rows re-derive exactly — QA measured them — but the table is written
> over `original`'s **fields**, and `original.at.lat` is not a field of `original`. On the shipped tree it
> was read **N+1** times, N being the number of same-city, same-name rows in the *recipient's* document, and
> the residue there was a **hybrid** coordinate rather than the duplicate row this paragraph describes.
> A-22 Part 2 prints the corrected table, restores the ceiling at scalar granularity, and is the version to
> read. Nothing else in this addendum moves.

| path | `cityKey` | `at` | `name` | `category` / `note` / `hours` |
|---|---|---|---|---|
| link dangles (no `original`) | 0 | 0 | 0 | 0 |
| step 3 — target cannot re-file | 1 | **1** (was 3) | 0 | 0 |
| re-filed, existing row reused | 1 | 1 | 1 | 0 |
| re-filed, new row written | 1 | **2** | **2** | 1 each, inside `placeForCopy` |

**Two is the ceiling, and never two reads inside one function**: one is the probe's, one is
`placeForCopy`'s. Measured consequence of that pair, on the shipped tree and on the fixed one alike: an `at`
flipping `[{9,9},{1,2}]` against a target that already holds that place writes a **duplicate `Place` row**
(the dedupe was computed on a coordinate the row does not carry). A hole, in A-21's own vocabulary — never a
leak, never a throw, and confined to a document built in memory past the type system.

**Why it stays, which is a ruling and not an omission.** Closing it costs one of two things, and both are
worse than naming it. Either `placeForCopy` takes `name` and `at` by argument — so half a `Place`'s fields
are classified at the call site and half inside the function — or `copyStopInto` builds a pre-read `Place`
snapshot to hand it, which needs a borrowed `id` and re-reads `note`/`hours` to build. Both break the thing
A-15 is *for*: **every field of `Place` is classified in one function, so that a ninth field fails there
first** (A-15's docstring and `copyStop.test.ts`'s key-set test are the mechanism). Two total rules meet
here; on a fault population only an in-process caller can construct, and where the residue is a hole rather
than a leak or a throw, **A-15's single classification point wins and A-21 records the exception with a
bound.** The trigger to revisit is the one A-20 and A-21 Part 6 already name: the day something other than a
person's own hand builds a `Trip` in memory — a native bridge, an ingest worker (§5.1), a vendor feed — the
whole read-once question is re-opened at once, and not one field of it at a time.

**What the builder asserts** (all in `copyStop.test.ts`, using A-21's existing `flipping`/`withAccessor`
helpers; nothing under `qa/` is edited, per A-19 assertion 7):

1. **The step-3 crash, and the wrong coordinate.** A source place whose city the target cannot re-file, `at`
   flipping `[{lat:1,lng:2}, null]`: `copyStopInto` **does not throw** and the stop's place is
   `{kind:'inline', at:{lat:1,lng:2}}`. The same fixture with `at` flipping `[{lat:1,lng:2},{lat:3,lng:4}]`
   copies `{lat:1,lng:2}` — the coordinate that was `null`-tested — and **`reads() === 1`**.
2. **The existing `at.reads() === 2` assertion is unmoved**, and its comment is re-expressed to point at this
   addendum rather than at "a disclosed residue of the ruling". A builder who drives that 2 to 1 has changed
   `placeForCopy`'s contract, which this addendum refuses.
3. **A seventh mutation**, in the same throwaway-worktree form as A-21's six: restoring `original.at` in the
   step-3 branch (`original.at === null ? … : {lat: original.at.lat, …}`) turns at least one test red. A
   mutation that survives is a missing fixture and is reported as one.
4. **Ceilings unmoved**: `Object.keys(core).length` = **71**; reference trip **2/4/11** and **11**
   `validateTrip` issues; `npm run golden` and `npm run sample` byte-identical, sample sha `40955ca0b182`;
   `copyStop.ts` still contains no `as string` and, comments stripped, exactly one `{ ...x }` spread
   (`{ ...target }`); `npm run test:tap` and `npm run typecheck` clean.

**This is an in-place correction to revision 16, not revision 17, and `ROADMAP.md` is not amended.** The
precedent is **A-5a**, which is the same shape: a builder implemented a just-shipped ruling exactly,
reproduced a defect in one clause of the ruling's own printed body, declined to work around it, and the
architect upheld it as a lettered addendum inside the revision that shipped the parent — one paragraph added
to that revision's header, no ROADMAP change, no new revision number. A revision number here tracks *what QA
reviewed*; this corrects one elided block of what QA already routed. I-4a's ship gate keeps its wording
(*"six mutations"* gated the increment that shipped); A-21a's seventh mutation is its own gate, stated above,
and the visual roadmap does not move because nothing about phase content, order or status changed.

#### A-22 — the four sites the search missed, and the one exception restated where the harm actually lands (revision 17, QA R18-1…R18-5)

**The record first, because it is the reason this ruling has a second half.** `build/copyStop.ts` has produced
a finding in **five consecutive breaker rounds** — R14-3 (an aliased `PlaceLink`), R15-1/R15-2 (`hours`),
R16-1 (`{...l}` on links), R17-1 (`open` read four times), and now R18-1…R18-5 — and since round 17 every one
of them has had the *same* shape: **a ruling printed a claim that its search was complete, and the search had
missed a site.** A-21 Part 4 said *file-wide*. A-21a said *total*, and upheld an objection specifically to
make it so. Round 18 then ran a mechanical read-count census over the shipped control flow
(`qa/r18-readonce.mjs` §1.1) and found **six** more fields of caller-supplied values read more than once —
three filed as findings (R18-1, R18-2, R18-3) and three recorded as inert (the `ctx` trio, Part 1(b) below),
with R18-4 and R18-5 found by the same probe one step further out. One of the six — `source.trip`, at
**five** reads — copies a stop out of one person's document while stamping `provenance.origin` with
**another person's** name. That is §2.14 rule 7, *"credit
survives acceptance, and the views must show it"*, and `BRIEF.md` calls it non-negotiable.

So this revision rules twice, and the two halves are deliberately separable. **A-22 closes the sites and
corrects A-21a's bound. A-23 replaces the search with a standing census**, because the honest reading of five
rounds is that a hand search of this file finds most of the sites and never all of them, and the sixth round
would otherwise find the sixth site the same way.

**Part 1 — R18-1, R18-2, R18-3 and R18-4 need no new reasoning, and this section says so explicitly.** Each
is a **direct, mechanical application** of a rule already written down, to a site the ruling's own search
missed. No discriminator is being extended, no carve-out is being narrowed, and a builder implements the four
bodies below without a judgment call:

- **R18-1** (`source.trip` ×5) and **R18-2** (`src.id` tested by the `find` predicate, emitted as
  `origin.sourceStopId`) are **A-21 Part 4(c)** applied to the argument Part 4(c) did not reach. Part 4(c)
  fixed `placement.cityKey` and stated the reason in writing — *"the rule for this file is only checkable if
  it is **total**"* — and `source` is the higher-read-count argument of the two.
- **R18-3** (`srcPlace.at` ×2 in the `kind:'inline'` branch) is **A-21a**, in the sibling branch of the same
  `if`, twenty lines above the block A-21a fixed and printed inside A-21 Part 4's own body. A-21a already
  settled the meta-question — *wherever Part 4 says "verbatim" it is to be read as "A-14/A-15/A-16's rules
  and outcomes are unchanged", never as "exempt from Part 4"* — so there is nothing left to rule on.
- **R18-4** (`samePlace` reading `a.at` up to three times) is **A-21 Part 4** applied to the one function in
  the reuse path both rulings left untouched in body. It is also the second §2.1 violation in the pair: a raw
  `TypeError` out of core because of the shape of a *document* — here the **recipient's own** — which is
  R15-2's rule.

**Part 1(b) — and the `ctx` trio is fixed with them, which is this ruling's own extension of QA's list.**
Round 18 recorded `ctx.actorUserId` ×2, `ctx.today` ×2 and `ctx.ids` ×3 as *"recorded, not filed"*, measured
inert because `addStop` does not stamp `opts.actorUserId` or `opts.now` on this path. That measurement is
correct and the classification is not: **the reason those double reads are harmless is a property of
`addStop`, not of `copyStopInto`**, and A-21's whole thesis is that a rule kept true by a fact about another
function decays the day that function changes. `requireActor` validating read 1 while `addStop` receives read
2 is the banned form on its face. It costs three lines, it makes the census in A-23 exact rather than
allow-listed, and the copied document is byte-identical either way — measured, `toJSON` unchanged over a
`ctx.actorUserId` flipping to `''` and to a credential and a `ctx.today` flipping to `1999-01-01`.

**The bodies. Every one below was applied to a throwaway copy of the tree at `993d8fc`, and the numbers in
Part 3 are from running it, not from reading it.**

```ts
export function copyStopInto(
  target: Trip,
  source: CopyStopSource,
  placement: StopPlacement,
  ctx: CopyStopCtx,
): Trip {
  const actorUserId = requireActor('copyStopInto', ctx.actorUserId);
  // A-22 Part 1 — the three ARGUMENTS are held to Part 4(c)'s rule, because Part 4(c)'s reason
  // ("the rule for this file is only checkable if it is TOTAL") is about arguments as a class and
  // not about `placement`. `source.trip` was read FIVE times — `findAnywhere` (which stop),
  // `origin.friendUserId`, `origin.sourceTripId`, `.places` and `refileCityKey` — so the document
  // the stop came from and the document the CREDIT names could be two different documents, and
  // the `Place` row a third. `source.stopId` was read twice (the lookup and the throw message);
  // `ctx.today`, `ctx.actorUserId` and `ctx.ids` reach `addStop`'s opts on a second read.
  const ids: IdFactory = ctx.ids;
  const today: IsoDate = ctx.today;
  const sourceTrip: Trip = source.trip;
  const stopId: StopId = source.stopId;
  const src = findAnywhere(sourceTrip, stopId);
  if (!src) throw new Error(`copyStopInto: no such stop ${stopId} in ${sourceTrip.id}`);
```

```ts
    origin: {
      friendUserId: sourceTrip.ownerId,
      sourceTripId: sourceTrip.id,
      // A-22 (R18-2): the id the caller NAMED and the predicate MATCHED, not a second read of the
      // found record. `src.id` is now read zero times, which is stronger than hoisting it: rule 1
      // says the source id survives only inside `origin`, and `stopId` is the only value in this
      // function that anything checked. `findAnywhere` compares `x.id === stopId`, so for every
      // document the type system permits this is bit-for-bit what shipped.
      sourceStopId: stopId,
    },
    addedAt: today,
```

```ts
  if (srcPlace.kind === 'inline') {
    // A-22 (R18-3) — A-21a's defect in the sibling branch. `at` flipping [{1,2}, null] threw
    // `Cannot read properties of null (reading 'lng')` out of `copyStopInto`; flipping
    // [{1,2},{3,4}] copied {lat:1, lng:4}, a pair no read ever produced.
    const srcAt: LatLng = srcPlace.at;
    place = { kind: 'inline', at: { lat: srcAt.lat, lng: srcAt.lng } };
  } else if (srcPlace.kind === 'place') {
    const original = sourceTrip.places.find((p) => p.id === srcPlace.placeId);
```

```ts
      const targetKey = refileCityKey(sourceTrip, target, originalCityKey);
```

```ts
/** Same name, same city, same coordinates to ~1 m — the same place. Pure.
 *
 *  A-22 (QA R18-4): `a` is a row of the RECIPIENT'S OWN `places`, and it was read up to three
 *  times — `a.at === null`, `a.at.lat`, `a.at.lng` — so a target row whose `at` flipped to `null`
 *  threw a raw `TypeError` out of `copyStopInto` because of what the TARGET document contains
 *  (§2.1, R15-2). `b` is `refiled`, which core constructs, and it is hoisted anyway for A-21's
 *  stated reason: "every field of every record this function reads, once" is a property a reviewer
 *  checks in one pass; "every field except the ones we judged safe" is a judgment call. */
function samePlace(a: Place, b: { cityKey: string; name: string; at: Place['at'] }): boolean {
  const aCityKey: string = a.cityKey;
  const bCityKey: string = b.cityKey;
  if (aCityKey !== bCityKey) return false;
  const aName: string = a.name;
  const bName: string = b.name;
  if (aName.trim().toLowerCase() !== bName.trim().toLowerCase()) return false;
  const aAt: LatLng | null = a.at;
  const bAt: LatLng | null = b.at;
  if (aAt === null || bAt === null) return aAt === bAt;
  return Math.abs(aAt.lat - bAt.lat) < 1e-5 && Math.abs(aAt.lng - bAt.lng) < 1e-5;
}
```

```ts
  // A-22 Part 1(b): the ids factory, the date and the actor are the values this function already
  // validated or already used — never a second read of `ctx`.
  return addStop(withPlace, placed, init, { ids, now: today, actorUserId });
```

and, correspondingly, `ids.newId('place')` and `ids.newId('stop')` in place of `ctx.ids.newId(…)`.

**Part 2 — R18-5, which does need new reasoning, because the thing that is wrong is A-21a's own printed
bound.** QA re-derived A-21a's four-row table and it reproduces **exactly**; the accepted exception is real
and its stated harm is real *at the granularity the table is written at*. One level down it is neither:

- **The count.** `samePlace` reads `b.at.lat` **once per candidate row** — every row in the recipient's trip
  whose folded city and folded name match — and `placeForCopy` reads it again. On the shipped tree
  `original.at.lat` is therefore read **N+1** times, N controlled by the **recipient's** document. Measured at
  N = 0 / 1 / 3: `lat` read **1 / 2 / 4** times. A bound the other party's document can raise is not a bound.
- **The residue.** The pair written was `{lat:10, lng:16.3806}` — `lat` from the fourth read and `lng` from
  the first, because `samePlace`'s `&&` **short-circuits** and never reaches `lng` once `lat` disagrees. That
  is a **hybrid** no single read produced, not the *"duplicate `Place` row"* the table discloses.

**The correction is not a sentence, because a restated bound would still be target-dependent.** The probe
carries a **clone** of the coordinate rather than the caller's own `LatLng`, which is R14-3's rule (*two
documents may not share one mutable `LatLng`*) applied to the one place it is not a document that would share
it. One line, inside the block A-21a printed:

```ts
        const name: string = original.name;
        // A-22 Part 2 (QA R18-5). The probe carries a CLONE of the coordinate: `samePlace` reads
        // `b.at.lat`/`b.at.lng` once per candidate row, so aliasing the caller's own `LatLng` here
        // made `original.at.lat`'s read count N+1 in the RECIPIENT's document — and, because
        // `samePlace`'s `&&` short-circuits, `lat` and `lng` were read a DIFFERENT number of times
        // as each other. Cloning restores A-21a's ceiling one level down: each scalar is read once
        // by the probe and once by `placeForCopy`, never twice inside one function, and never a
        // count the other party controls. `samePlace`, `placeForCopy` and `refileCityKey` are
        // untouched in body, in signature and in contract — A-15's "every field of `Place` is
        // classified in one function" is exactly what A-21a refused to trade, and it is not traded.
        const refiled = { cityKey: targetKey, name, at: at === null ? null : { lat: at.lat, lng: at.lng } };
```

**The corrected table, at both granularities, measured on the fixed tree** (this replaces A-21a's, which
stands as the record of what was true at `1d091a6`):

| path | `cityKey` | `at` | `at.lat` / `at.lng` | `name` | `category` / `note` / `hours` |
|---|---|---|---|---|---|
| link dangles (no `original`) | 0 | 0 | 0 | 0 | 0 |
| step 3 — target cannot re-file | 1 | 1 | 1 / 1 | 0 | 0 |
| re-filed, existing row reused | 1 | 1 | 1 / 1 | 1 | 0 |
| re-filed, new row written | 1 | 2 | **2 / 2** (was 1/1 at N=0, **4/1** at N=3) | 2 | 1 each, inside `placeForCopy` |

**Two is still the ceiling, now at every level, and it is now independent of the recipient's document**: one
read by the probe, one by `placeForCopy`, never two inside one function. The exception A-21a kept is
unchanged in kind and unchanged in why it is kept — closing it entirely still costs A-15's single
classification point, and that trade is still refused. What changes is that the disclosed residue is once
again the *true* one: a dedupe computed on a coordinate the written row does not carry, i.e. a **duplicate
`Place` row**. A hole — never a leak (A-15 has `at` and `name` crossing verbatim by ratified policy, so a
*stable* hostile value crosses identically today), never a throw, and confined to a document built in memory
past the type system.

**Part 3 — what this changes, measured.** Applied to a throwaway copy of `993d8fc`:

```
source.trip reads:            1  (was 5) — the credit now names the document the stop came from
origin.sourceStopId:          "s-src"  (was the credential the caller never named)
inline `at` [{1,2}, null]:    no throw, copies {lat:1,lng:2}  (was TypeError: …reading 'lng')
inline `at` [{1,2},{3,4}]:    {lat:1,lng:2}                    (was {lat:1,lng:4})
target row `at` [coord,null]: no throw                         (was TypeError: …reading 'lat')
original.at.lat, N = 0/1/3:   2 / 2 / 2                        (was 1 / 2 / 4)
```

And the fixes are **behaviour-neutral**, which is what "mechanical" means here: in that scratch tree
`node --test packages/core/test/*.test.ts` produces an **identical** pass/fail set before and after all five
(359 pass both ways; the only failures are the six tests that read files the scratch tree does not hold —
`cli.ts`, `apps/`, `docs/` and the repo-root planner — and they fail identically either way), and `tsc -p
tsconfig.json --noEmit` over `packages/core`'s `src` and `test` is clean under `strict` +
`erasableSyntaxOnly` + `verbatimModuleSyntax`. **The builder re-derives this against the whole repo** —
`npm run test:tap`, `npm run typecheck` and `npm run web:build` — rather than trusting these numbers; for
every value the type system permits, the output is bit-for-bit what A-14/A-15/A-16/A-18/A-19/A-21/A-21a
left.

**What does not change.** §2.14's seven rules in rule and in outcome; A-14's three-step decision, A-15's
single classification point and its key-set assertions, A-16's step 2, A-18's redaction thresholds, A-19's
throws, messages, `TRANSIT_CITY_KEY` exemption and dropped-hint fallback, A-20 entire, A-21's carve-outs and
Part 6; `Place`/`Stop`/`OpeningHours` shape; `schemaVersion`; `redactText` and `REDACTION_PATTERNS` — **no
pattern and no call site is added**; `tools/redact.mjs` and §6.6's sample path; `fromJSON`, `toJSON`,
`packages/client`, `apps/web`, `cli.ts`; §2.10 at **71**; the reference trip at 2/4/11 and 11 `validateTrip`
issues; the goldens and the sample sha. **No new defensive guard is added** — A-21's Part 4 disclaimer is
carried forward verbatim: this ruling governs *which value crosses*, never whether a type-lie throws.

**What the builder asserts.** All in `packages/core/test/copyStop.test.ts` using A-21's existing
`flipping`/`withAccessor` helpers, plus the new file A-23 specifies. Nothing under `qa/` is edited (A-19
assertion 7).

1. **The credit.** With `source.trip` an accessor flipping between two trips: the copied stop's
   `provenance.origin.friendUserId` and `.sourceTripId` name the document the stop was **found** in, the
   `Place` row written comes from that same document, and `reads() === 1`.
2. **The source stop id.** With the source stop's `id` flipping `['s-src', <credential>]`: the recipient's
   `origin.sourceStopId` is `'s-src'` and no part of the credential is greppable in the recipient's `toJSON`.
3. **The inline branch.** `at` flipping `[{lat:1,lng:2}, null]` → no throw, `{kind:'inline', at:{lat:1,lng:2}}`;
   flipping `[{lat:1,lng:2},{lat:3,lng:4}]` → `{lat:1,lng:2}`, `reads() === 1`.
4. **The recipient's own row.** A target `Place` whose `at` flips `[coord, null]` → `copyStopInto` returns
   rather than throws, and the copy still lands.
5. **R18-5's count.** With a source `at` whose `lat` and `lng` are counting accessors, against targets holding
   **0, 1 and 3** same-name rows: `lat` and `lng` are each read **exactly 2** times in all three, and the
   written row's pair is the pair `placeForCopy` read.
6. **Five mutations, at least one red test each** (throwaway worktree, discarded; the A-21/A-21a discipline,
   and a survivor is reported in BUILD-NOTES as a missing fixture rather than rounded down): restoring
   `source.trip` at any of the five sites; restoring `sourceStopId: src.id`; restoring
   `{lat: srcPlace.at.lat, lng: srcPlace.at.lng}`; restoring `samePlace`'s `a.at` reads; restoring
   `at` un-cloned in `refiled`. A sixth, for Part 1(b): restoring `actorUserId: ctx.actorUserId` in the
   `addStop` opts — if no test goes red, **that is expected and is A-23's job**, which is the whole argument
   for A-23 and is reported as such rather than papered over with a fixture that pins a fact about `addStop`.
7. **Ceilings unmoved**: `Object.keys(core).length` = **71**; reference trip **2/4/11** and **11**
   `validateTrip` issues; `npm run golden` and `npm run sample` byte-identical, sample sha `40955ca0b182`;
   `copyStop.ts` still contains no `as string` and, comments stripped, exactly one `{ ...x }` spread
   (`{ ...target }`); `npm run test:tap`, `npm run typecheck` and `npm run web:build` clean.

**The probe lines this ruling moves, named here and re-expressed by QA in round 19** (A-19 assertion 7 stands
— the builder edits nothing under `qa/`):

- `qa/r18-readonce.mjs` §1.1's census assertion must go **green**, with the `BLESSED` set reduced to
  `link.kind`, `place.at` and `place.name` — it already is that set, so the line needs no edit, only a
  re-run. If it is not green, Part 1 is not implemented.
- `qa/r18-readonce.mjs` §2.3's first assertion (`latReads === 1`) **stays red and is re-expressed**: the
  correct claim after Part 2 is `latReads === 2` and `lngReads === 2`, **constant in N**, which is what the
  corrected table states. A builder who drives that 2 to 1 has changed `placeForCopy`'s contract, which
  A-21a refused and this ruling does not reopen.
- `qa/r18-readonce.mjs` §2.3's second assertion and §3.1–§3.4 must all go green. §3.5's three
  *"recorded, not filed"* lines stay green and become vacuous — Part 1(b) removes the second read they
  measure — and QA may re-express them as read-count assertions of **1**.

#### A-23 — the standing census: the read-once rule is checked by a test, not by the next reviewer's eyes (revision 17, QA round 18 §1.1)

**The question, put plainly.** A-21's residue paragraph said this in writing:

> *The day `copyStop.ts` grows a new helper, the reviewer's question is "does any field of a source record
> appear twice in this function?" — one pass over a 500-line file… **The day it stops being small is the day
> this rule needs a mechanical check.***

That criterion — *when the file gets big* — is the wrong trigger, and round 18 is the evidence. The file did
not grow; the search failed anyway, **three times in a row, by three different agents, one of them me.** A-21
searched and missed five sites. A-21a searched the same file again, specifically for this shape, and missed
four of them — including one printed inside A-21's own body, in the sibling branch of the `if` it was fixing.
The correct trigger is not size, it is **recurrence**, and five consecutive rounds is past it.

**The decision: yes, a standing test, and it is the deliverable this revision cares most about.** A ruling
closes the sites that exist today. Only a test closes the sites nobody has written yet — and this file is
where the next one will be, because it is the only place in the design where a record crosses a **person**
boundary, so it is the only place where "the value that was checked is not the value that crossed" is a leak
rather than a bug.

**Why a census and not a grep, which is the objection A-21 raised against itself and it still stands.** A
grep over property-access counts cannot tell `p.at` inside a `find` predicate that runs once from `p.at`
inside one that runs N times, cannot see through a helper, and false-positives on the first legitimate
pattern it does not know — *"brittle enough to be deleted the first time it false-positives"*, which is a
test that removes itself. The census is **behavioural**: it wraps every field of every caller-supplied record
in a counting accessor that returns a **stable** value, runs the real `copyStopInto` over a matrix of
scenarios, and reports what the shipped control flow actually read. It is not a fault injection — the values
never change — so it cannot produce a false alarm about a value that was never read, and when it fails it
names the field, the count and the scenario. QA built exactly this in `qa/r18-readonce.mjs` §1.1 and it found
all five of round 18's findings without reading the diff; this ruling **adopts QA's mechanism** rather than
inventing a second one, and deepens it in the two places round 18 proved it needed.

**Where it lives, and why not in `qa/`.** `packages/core/test/readOnce.test.ts`, a new file, picked up by the
existing `packages/core/test/*.test.ts` glob in `npm test` / `npm run test:tap`. A `qa/` probe is run by a
breaker who chose to run it; a test in the suite fails **the build** the moment anyone reintroduces the
defect, and cannot be routed around without a human editing the allow-list — which is exactly the property
being bought. It does not replace `qa/r18-readonce.mjs`: QA keeps its own copy, at its own scope, and a
divergence between the two is itself a finding. It imports `copyStopInto`, `createTrip`, `addStop` and
`sequentialIds` from `../src/index.ts` and `addPlace` / `TRANSIT_CITY_KEY` by module path, which is §2.10's
own rule (*"tests do not create surface"*) and **moves the export count by nothing**: §2.10 stays at **71**.

**Two things it deepens beyond QA's §1.1**, both of them round 18's own lessons:

1. **It recurses.** QA's census wraps the fields of a record; R18-5 is a read count **one level below** a
   field (`original.at.lat`), and the harm there is a hybrid coordinate. The census therefore walks into
   plain objects and arrays, so `place.at.lat`, `cost.display`, `arrival.label`, `links[0].href` and
   `hours.weekly[0].open` are each counted in their own right.
2. **It censuses the recipient's rows too.** R18-4 is a multi-read of a `Place` row of the **target**
   document. "Caller-supplied" means both documents and all three arguments, not just the source.

**The specification. A builder implements this without a judgment call.**

> **Amended by A-24 Part 1 (revision 18, QA R19-3).** The `opaque` set below is **superseded**: it held
> both whole `Trip` records, and its stated reason — *"the document skeleton rather than values that
> cross"* — is **false for `Trip.id` and `Trip.ownerId`**, which cross verbatim into
> `provenance.origin.sourceTripId` and `.friendUserId`. `censusDeep`'s body is unchanged; what changes is
> what it is handed. Implement A-24 Part 1, not the paragraph below it.

```ts
type Counts = Record<string, number>;

/**
 * Wraps every own enumerable property of `v` — recursively, through plain objects and arrays — in
 * a counting accessor that returns a STABLE value. Recursion stops at `opaque` (the `Trip`
 * containers and the `IdFactory`: core legitimately scans `days`, `cities` and `places` in `find`
 * loops, and those are the document skeleton rather than values that cross).
 */
function censusDeep<T>(v: T, counts: Counts, path: string, opaque: ReadonlySet<unknown>): T {
  if (v === null || typeof v !== 'object' || opaque.has(v)) return v;
  const from = v as unknown as Record<string, unknown>;
  const out = (Array.isArray(v) ? [] : {}) as Record<string, unknown>;
  for (const k of Object.keys(from)) {
    const key = `${path}.${k}`;
    const child = censusDeep(from[k], counts, key, opaque);
    Object.defineProperty(out, k, {
      enumerable: true, configurable: true,
      get() { counts[key] = (counts[key] ?? 0) + 1; return child; },
    });
  }
  return out as unknown as T;
}
```

**What is censused, per scenario** — five roots, named by the path prefix the failure message prints:
`srcStop` (the source stop, substituted into its day), `srcPlace` (each row of the source's `places`),
`tgtPlace0…n` (each row of the **target's** `places`), `source` (the `CopyStopSource` argument, with
`source.trip` opaque), `placement`, and `ctx` (with `ctx.ids` opaque, because an `IdFactory` is a callable
core owns). Counts are snapshotted **immediately after `copyStopInto` returns** and before anything inspects
the result, so nothing but the copy is measured.

> **Amended by A-24 Part 1.** *"with `source.trip` opaque"* becomes **`srcTrip` and `tgtTrip` are two more
> roots, censused for every field except their six collections.** Seven roots, not five.

**The allow-list is the ruling, written in the test.** Exactly five entries after A-22, each with the ruling
that blesses it (**seven after A-24 Part 1** — the two additions are irreducible structural counts, and the
rule that makes them irreducible is in A-24, not here):

```ts
const ALLOWED: Record<string, { max: number; why: string }> = {
  'srcStop.place.kind': { max: 2, why: 'A-21: discriminant tested against a closed set; every branch builds a fresh record, so the worst an unstable kind yields is {kind:"none"} — a hole' },
  'srcPlace.at':        { max: 2, why: 'A-21a: the reuse probe reads it, placeForCopy reads it again; closing it would break A-15\'s single classification point' },
  'srcPlace.at.lat':    { max: 2, why: 'A-22 Part 2: the same exception one level down, now constant in the recipient\'s row count' },
  'srcPlace.at.lng':    { max: 2, why: 'A-22 Part 2: as above' },
  'srcPlace.name':      { max: 2, why: 'A-21a: probe + placeForCopy; A-15 has `name` crossing verbatim, so this is an inconsistency and not a crossing' },
};
```

**Two assertions, and the second one is not decoration.**

1. **No unnamed multi-read.** For every scenario, every field read more than once is in `ALLOWED` and within
   its `max`. The failure message lists `scenario: field ×count` for **all** offenders across the whole
   matrix — accumulated, then asserted once — so a builder sees the full set in one run rather than the
   first one.
2. **No dead allowance.** Every entry in `ALLOWED` is observed at **exactly** its `max` somewhere in the
   matrix. An exception nobody exercises has stopped being an exception and has become a licence, and this
   is what makes the two entries A-21a argued for into *pinned* behaviour: driving `srcPlace.at` to 1 turns
   the suite red, which is A-21a's *"a builder who drives that 2 to 1 has changed `placeForCopy`'s
   contract"* stated as a test instead of a sentence.

**The scenario matrix — ten rows, one per control-flow path through `copyStopInto`.** A census only measures
what the scenarios reach, so the matrix is part of the contract:

| # | scenario | what it is the only cover for |
|---|---|---|
| 1 | `{kind:'place'}` · re-filed · **new row** | `placeForCopy`, `refileCityKey` steps 1–4, the A-21a exception |
| 2 | `{kind:'place'}` · re-filed · **row reused** | the reuse branch; `samePlace` against a matching target row |
| 3 | `{kind:'place'}` · re-filed · **3 same-name target rows**, new row | R18-5: `samePlace` run more than once per copy |
| 4 | `{kind:'place'}` · **A-14 step 3** (target cannot re-file) | the step-3 inline fallback A-21a fixed |
| 5 | `{kind:'place'}` · **null coordinate**, target row also null | `samePlace`'s `null` arm, `placeForCopy`'s `at === null` |
| 6 | `{kind:'place'}` · **dangling `placeId`** | the `original` missing → `{kind:'none'}` path |
| 7 | `{kind:'inline'}` | R18-3 |
| 8 | `{kind:'none'}` | the untouched default |
| 9 | `{kind:'pool'}` placement with a **live hint** | Part 4(c)'s `hintFields` block |
| 10 | `{kind:'pool'}` placement with `TRANSIT_CITY_KEY` and a **stale hint** | the exemption and the dropped-hint fallback |

> **Amended by A-24 Part 2 (QA R19-4).** Row 5's second cover is **withdrawn** — a same-named target row with
> a `null` `at` makes `samePlace` return true, so the copy takes the reuse branch and `placeForCopy` is never
> called. Row 5 covers `samePlace`'s `null` arm and nothing else. **Four rows are added, 11–14**; the table
> is 14 rows.

The source stop carries every optional field (`note`, `flags`, `durationMins`, `travelRole`, `cost` with
`amounts`/`display`/`note`, `arrival` with a `label`, `links`) and the source place carries `note`, `links`
and `hours` with a `weekly` entry and a `note` — otherwise the recursion has nothing to count and the census
is green by vacancy. **Every scenario must complete without throwing**; a throw is reported as the scenario's
failure, because a stable-valued document that makes `copyStopInto` throw is a §2.1 violation on its own.

> **Amended by A-24 Part 3 (QA R19-5).** That list omits `ticket`, so the fixture stop carried **14 of
> `Stop`'s 15 fields** and the missing one is the field §6.6 classifies as an access credential. `ticket`
> joins it. **And by A-24 Part 2:** *"every optional field"* is now a property of rows 1–13; **row 14 is
> deliberately minimal**, because a census that only ever measures a maximal document never measures the
> absent-optional arms.

**The maintenance rule, which is the point of the whole mechanism.**

> A new branch in `copyStopInto` adds a **scenario row**. A new field on `Stop` or `Place` is covered
> automatically, because the census enumerates whatever the record carries. And a new entry in `ALLOWED` —
> or a raised `max` — is **an architect's ruling, not a builder's judgment**: it is the written form of "this
> value may be read twice and here is why the second read cannot leak". A builder who needs one stops and
> routes it, exactly as A-21a's builder did.

> **Amended by A-24 Parts 1 and 3.** Clause 2 is true only of fields **the fixture instance carries** —
> `makeStop` writes `ticket` only when `init.ticket` is truthy, which is how the credential stayed invisible
> — so it reads: *a new field on `Stop` or `Place` is covered automatically **once the fixture populates
> it**, and the fixture populating every field of both records is part of this contract.* And clause 3 gains
> its converse: **deleting an entry that a fix in the same pass made dead is a builder's obligation, not a
> widening** — assertion 2 will demand it.

**Verified, not asserted.** The specification above was implemented against a throwaway copy of `993d8fc` and
run both ways:

- Against the tree **as shipped**, it fails and names every one of round 18's findings, each from the
  scenario that exercises it: `source.trip ×5` (R18-1), `srcStop.id ×2` (R18-2), `srcStop.place.at ×2` in
  scenario 7 (R18-3), `tgtPlace0.at ×3` in scenario 2 (R18-4), `srcPlace.at.lat ×4` in scenario 3 (R18-5),
  plus `ctx.actorUserId ×2`, `ctx.today ×2` and `ctx.ids ×3` (Part 1(b)).
  *(**×4**, not the ×3 this sentence printed until revision 18 — corrected by A-24 Part 4, QA **R19-6**.
  Scenario 3 puts **N = 3** candidate rows through `samePlace`'s coordinate arm and A-22 Part 2's mechanism
  is N+1, which its own table states correctly as "4/1 at N = 3". Cosmetic: no behavioural claim rested on
  the 3, and the shipped test never asserted it.)*
- Against the tree **with A-22 applied**, it passes, with the five allow-list entries each observed at
  exactly 2.
- It typechecks clean under the repo's `strict` + `erasableSyntaxOnly` + `verbatimModuleSyntax`, and runs
  under `node --test` with no build step, which is the constraint every file in `packages/core/test/` is
  under.

**What A-23 does not claim, so nobody over-trusts it.**

- **It is not the `flipping` fixtures' replacement.** The census proves *how many times* a value is read; the
  A-21/A-21a/A-22 accessor fixtures prove *which value crosses* and that nothing throws. Both stay: the
  census would pass a function that read one field once and emitted a different field entirely.
- **It is scoped to `copyStopInto`, deliberately.** `fromJSON` is full of the **safe** double read A-21 Part
  2 blessed in writing, so a census there would be red by design and would invite exactly the sweep that
  ruling forbade. The trigger to widen it is the one A-20, A-21 Part 6 and A-21a all already name: **the day
  something other than a person's own hand builds a `Trip` in memory** — a native bridge, an ingest worker
  (§5.1), a vendor feed — at which point the read-once question reopens for every entry point at once, and
  this test is the shape the answer takes.
- **It measures the paths the matrix reaches.** That is why the matrix is specified here rather than left to
  the builder, and why adding a branch means adding a row.

#### A-24 — the census's reach: what `opaque` may hide, what the matrix must build, and the field the fixture never carried (revision 18, QA R19-3…R19-6)

**What is not reopened, stated first, because it is the larger half of round 19's result.** A-23's mechanism
is right and it is not decoration. Round 19 planted **20** read-once defects inside the census's roots, one
at a time, and every one turned `readOnce.test.ts` red; **fourteen of the twenty left `copyStop.test.ts`
green**, so the census buys coverage the value fixtures do not have rather than duplicating them; **twelve
were in functions no ruling has ever touched** (`costForCopy`'s `note` and `amounts`, `arrivalForCopy`'s
`label`, `hoursForCopy`'s `note`, `links.map`'s `href`, `[...src.flags]`, `provenance.confidence`, the hint
block's `dayId`, `samePlace`'s read of the recipient's `name`, the `srcPlace.placeId` predicate), which is
the whole argument for a census over a hand search and it holds. The allow-list is tight in **both**
directions: for all five entries `max: 2 → 1` turns both assertions red and `max: 2 → 3` turns assertion 2
red. `censusDeep`'s body, the two assertions, the failure messages, the existing roots and their naming
scheme, the snapshot point and A-23's four *"what this does not claim"* bullets are all **unchanged by this
ruling** — Part 1 adds two roots, it does not rename or remove one.

**What is wrong is three lines of A-23's own specification, and all three fail the same way.** A-23 exists
because *a ruling printed a claim that its search was complete, and the search had missed a site* — five
rounds running. A-23 then printed three claims about its **own reach**, and each is smaller than stated:

1. the `opaque` set hides *"the document skeleton rather than values that cross"* — and hides two fields
   that cross verbatim (**R19-3**);
2. the matrix table assigns row 5 two covers that are **mutually exclusive**, so one of them is never
   reached, and three more ordinary document shapes are unreached beside it (**R19-4**);
3. *"a new field on `Stop` or `Place` is covered automatically"* is true only of fields the **fixture
   instance** carries, and the one it does not carry is `Stop.ticket` (**R19-5**).

That is not an argument against the mechanism; it is the mechanism's own lesson applied to its own
specification. A guard's *scope* needs the same treatment its subject got: written down, and then measured.
**Every number below is from running A-23's census over its own matrix with the candidate narrowings
applied, not from reading the diff.**

---

**Part 1 — `opaque` narrows from the `Trip` to the `Trip`'s six collections (R19-3).**

A-23's justification was reaching for the right distinction and landed one level too high. What core
legitimately **scans** is the collections — `days`, `cities`, `places`, `pool`, `bookings`, `resolutions` —
in `find` / `some` / `findIndex` loops. What it **reads as a value** is `Trip.id` and `Trip.ownerId`, and
both cross the person boundary **verbatim**, into `provenance.origin.sourceTripId` and `.friendUserId`.
Those are §2.14 rule 7, the credit `BRIEF.md` calls non-negotiable, and the exact field R18-1 was filed
over. Making the *container* opaque in order to protect the *collections* made the credit invisible — which
is precisely how R19-1 survived A-22's own hoist of that container, and why round 19's sixth consecutive
finding in this file was again found by widening the guard rather than by running it.

**Three candidates, measured, before choosing:**

- **Open the `Trip` entirely.** 12–15 multi-reads per scenario, almost all of them the recipient's skeleton
  scan: `tgtTrip.days ×5`, `tgtTrip.days.1 ×4`, `tgtTrip.days.1.id ×3`, `tgtTrip.places ×3`,
  `tgtTrip.cities ×3`. Closing that needs allow entries with `max: 5` on an **array** — a licence, not an
  exception — and it would leave assertion 2 pinning nothing worth pinning. **Refused.**
- **Census `id` and `ownerId` by name.** Gives up A-23's *"a new field is covered automatically"* promise at
  the level where a Phase 2/3 field will actually be added to `Trip`, and buys nothing the collection rule
  does not already buy. **Refused** — a hand-picked field list is the judgment call A-21 refused in the
  product code, and it does not become sound because it is in a test.
- **Census every own field of a `Trip` except its six collections.** **Chosen.**

```ts
/**
 * A-24 Part 1 (QA R19-3). The `Trip` is a root, not an opaque box. Core legitimately SCANS the six
 * collections — those are the document skeleton — but `Trip.id` and `Trip.ownerId` cross the person
 * boundary verbatim into `provenance.origin`, so they are censused like any other value. The
 * collections are handed back BARE (their rows are already censused as their own roots), which is
 * why they are a key list here rather than members of `opaque`: `opaque` stops recursion at an
 * OBJECT, and what has to stop here is six NAMED FIELDS of one object.
 */
const TRIP_SKELETON: ReadonlySet<string> = new Set([
  'days', 'cities', 'places', 'pool', 'bookings', 'resolutions',
]);

function censusTrip(trip: Trip, counts: Counts, path: string, opaque: ReadonlySet<unknown>): Trip {
  const from = trip as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(from)) {
    const raw = from[k];
    if (TRIP_SKELETON.has(k)) { out[k] = raw; continue; }   // bare, uncounted
    const key = `${path}.${k}`;
    const child = censusDeep(raw, counts, key, opaque);
    Object.defineProperty(out, k, {
      enumerable: true, configurable: true,
      get() { counts[key] = (counts[key] ?? 0) + 1; return child; },
    });
  }
  return out as unknown as Trip;
}
```

and in `runScenario`, the two documents become roots instead of members of `opaque`. The substitution of
censused rows happens **first** and `censusTrip` wraps the result, so the collections still hand out the
already-wrapped `srcStop` / `srcPlace` / `tgtPlaceN` rows and nothing is counted twice:

```ts
  const srcSub: Trip = {
    ...srcTrip0,
    days: srcTrip0.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === 's-src' ? censusDeep(s, counts, 'srcStop', opaque) : s)) })),
    // A-24 Part 2 row 13: the source stop may live in the POOL, so it is substituted there too.
    pool: srcTrip0.pool.map((s) => (s.id === 's-src' ? censusDeep(s, counts, 'srcStop', opaque) : s)),
    places: srcTrip0.places.map((p, i) => censusDeep(p, counts, i === 0 ? 'srcPlace' : `srcPlace${i}`, opaque)),
  };
  const tgtSub: Trip = { ...tgtTrip0, places: tgtTrip0.places.map((p, i) => censusDeep(p, counts, `tgtPlace${i}`, opaque)) };
  const srcTrip = censusTrip(srcSub, counts, 'srcTrip', opaque);
  const tgtTrip = censusTrip(tgtSub, counts, 'tgtTrip', opaque);
  opaque.add(srcTrip);   // so the `source` root counts `source.trip` and does not re-wrap the document
  opaque.add(tgtTrip);
```

**The rule that separates a defect from an allow-list entry, so a builder never guesses.** Narrowing
`opaque` makes three new multi-reads visible, and two of them are not defects. The discriminator is
mechanical, not a judgment:

> **A field of a document the function *spreads* has an irreducible floor of one read, from the spread
> itself. A field of a document the function only *reads* has no floor.**

`copyStopInto` spreads the **target** (`{ ...target }`, and then `withDay`'s and `addStop`'s `{ ...trip }` /
`{ ...next }`) because its result *is* the recipient's own document rebuilt. It never spreads the **source**.
So, on the 14-row matrix:

| field | reads | verdict |
|---|---|---|
| `srcTrip.id` | **2** | **A defect — this is R19-1**, and it is now a red test. Read 1 is `origin.sourceTripId`, the credit; read 2 is `refileCityKey`'s `source.id === target.id`, the conjunct A-16 says *"turns key equality into an identity"*. The source is never spread, so 2 is a second read, not a floor. A builder's hoist takes it to **1** and no `ALLOWED` entry is written for it. |
| `srcTrip.ownerId` | 1 | Correct today — and, for the first time, watched. |
| `tgtTrip.id` | **2** | **Irreducible.** Read 1 is `refileCityKey`'s `target.id`; read 2 is the record spread that carries the recipient's own id into the document this function returns. No hoist removes read 2 without rebuilding a `Trip` field by field in three functions, which would put a second definition of *"what a `Trip` is"* in the build layer. `ALLOWED`, `max: 2`. |
| `tgtTrip.revision` | **2** | **Irreducible.** Read 1 is the `{ ...trip }` spread, whose value the explicit `revision:` key overwrites in the same literal; read 2 is `trip.revision + 1`. `ALLOWED`, `max: 2`. |
| every other `Trip` field, both documents | ≤ 1 | — |

so `ALLOWED` becomes **seven** entries:

```ts
  'tgtTrip.id':       { max: 2, why: 'A-24 Part 1: read 1 is refileCityKey\'s A-16 identity conjunct, read 2 is the record spread that rebuilds the RECIPIENT\'S OWN document — an irreducible floor, not a blessed second read. Nothing of the target Trip crosses a person boundary' },
  'tgtTrip.revision': { max: 2, why: 'A-24 Part 1: read 1 is the { ...trip } spread whose value the explicit `revision:` key immediately overwrites; read 2 is the increment. Irreducible for the same reason' },
```

**And the converse clause, which is not optional.** If the builder's R19-1 fix also removes
`refileCityKey`'s read of `target.id` (for instance by passing both ids in rather than both trips), then
`tgtTrip.id` drops to 1 and assertion 2 — *no dead allowance* — goes red. **That entry is then deleted in
the same pass.** Deleting an entry a fix in the same pass made dead is not widening the allow-list and is
explicitly a builder's obligation; adding one, or raising a `max`, remains an architect's ruling. A-23's
maintenance rule is amended in place to say so.

**What Part 1 deliberately does not do, and the trigger to revisit it.** It does not census the **rows** of
`days` and `cities`. Two known multi-reads therefore stay invisible: the recipient's `Day.id` (**R19-2**,
routed to a builder as a code fix, not as a census gap) and QA's recorded `tgtTrip.cities.0.key ×2` on the
pool-placement path. Both are the **recipient's own** values, neither crosses a person boundary, and
censusing them costs an index-normalised path scheme (`days.*.id`) plus four more allow entries with wide
maxes — masking more than it catches, which is the first candidate above in miniature. The extension point
is stated so nobody has to re-derive it: **the census's unit is a *root* — a record `copyStopInto` reads as
a value — and arrays are never roots, rows are.** The day a `City` or `Day` field crosses into a copied
record, the answer is a **new root** (`srcCity0…n`, `tgtDay0…n`, censused exactly as `tgtPlace0…n` already
is), never opening a collection. This is the residue, and it is disclosed rather than discovered.

---

**Part 2 — four new scenario rows (R19-4).**

Row 5's second cover is withdrawn, not repaired: its table entry claims *"`samePlace`'s `null` arm,
`placeForCopy`'s `at === null`"* and the two are mutually exclusive by construction — a same-named target
row whose `at` is `null` makes `samePlace` return **true** (`aAt === bAt`), so the copy takes the reuse
branch and `placeForCopy` is never called. Renaming row 5's target row would trade one cover for the other,
which is why this is four **new** rows rather than an edit. The matrix is **14**:

| # | scenario | what it is the only cover for |
|---|---|---|
| 11 | `{kind:'place'}` · **null coordinate, no matching target row** | `placeForCopy`'s `at === null` arm — row 5's withdrawn second cover. **This is the shape of Jacob's own data**: the live planner has exactly one place with no coordinates (Windsor Great Park / Long Walk) and the copy path for it is exactly *"no matching row in the target"*. Verified: the row written is `{name:'Habyt Vienna', cityKey:'tgt-city', at:null}` |
| 12 | `{kind:'place'}` · **the same document, two distinct objects** | **A-16 step 2** — `source.id === target.id && target.cities.some(…)`, the branch R19-1 subverts and the one §2.14 says Phase 1 exercises (*"copying between two of your own trips"*). Built by calling the source fixture **twice**: same `Trip.id`, same city key, distinct object graphs — which is A-16's own stated reason for `source.id === target.id` rather than `source === target`. No serializer in the loop. Verified: the place is filed under the **source's own** key, the row is reused, `validateTrip` reports 0 |
| 13 | source stop taken from the source's **`pool`** | `findAnywhere`'s second arm. The reference trip carries **31** pool stops, so this is the ordinary shape, not an exotic one |
| 14 | a **minimal** source stop | the absent-optional arms — `cost === null`, `arrival === null`, `links` absent, and a source `Place` with no `note` and no `hours`. A-23 populates the fixture maximally so the recursion has something to count; the cost is that it only ever measured a *maximal* document, and the honest fix is one row that is not maximal rather than a weaker fixture everywhere |

Rows 1–10 are unchanged in construction and in numbering, so `qa/`'s cross-check of the two censuses stays a
row-by-row comparison. **Measured across all 14 rows with Part 1 applied**: the only multi-reads are the five
existing `ALLOWED` entries (each still observed at exactly **2**, so assertion 2 stays live), the two new
ones, and `srcTrip.id ×2` — R19-1, which is the point.

---

**Part 3 — `Stop.ticket` joins the fixture, and rule 3's fixture covers all three `Ticket` kinds (R19-5).**

The census enumerates `Object.keys` of the **fixture instance**, and `makeStop` writes `ticket` only when
`init.ticket` is truthy. A-23's printed fixture list omits it, so the censused stop carried **14 of `Stop`'s
15 fields** and the absent one is the field §6.6 classifies as an access credential and rule 3 says may never
travel. The population needs no accessor and no cast — a `{kind:'bundled'}` ticket survives
`fromJSON(toJSON())` intact — and a regression emitting
`...(src.ticket && src.ticket.kind === 'bundled' ? { ticket: src.ticket } : {})` passes **615/615** today:
invisible to the census because the field is absent, and invisible to `copyStop.test.ts` because its rule-3
fixture pins a `{kind:'url'}` ticket and the regression is gated on a different `kind`.

Two changes, and the second is not optional:

1. **`readOnce.test.ts`'s fixture stop gains `ticket: { kind: 'bundled', path: 'tickets/entry.pdf', label:
   'Entry' }`** — one field, chosen `bundled` because it is the kind that names a file inside a build
   artifact (§6.6's own threshold) and it is the kind the demonstrated regression used. The census then
   carries **15 of 15**, its counts are unchanged (nothing reads the field today, verified), and any future
   regression that *tests* the ticket and then *emits* it reads `srcStop.ticket` twice and goes red.
2. **`copyStop.test.ts`'s rule 3 covers all three `Ticket` kinds** — `bundled`, `url` and `attachment` —
   not two. *"No `Ticket` travels"* is a claim over the **union**, and the shape that slipped past both files
   is a **kind-gated** emission, so a fixture pinning one kind measures a third of the rule. Mechanically:
   parameterise the source fixture by ticket, run rule 3's assertions once per kind, and assert for each that
   its own greppable payload (`href`, `path`, `mailMessageId` + `filename`) is absent from
   `JSON.stringify(trip)` — the existing `secret-token` assertion generalised. Add a compile-time
   exhaustiveness map over `Ticket['kind']` in the same idiom as `STOP_FIELDS`, so a **fourth** kind fails
   `npm run typecheck` there before it fails a test. *(The fixture's own docstring says "a bundled ticket"
   and the ticket is a `url` — the builder corrects the comment in the same pass.)*

---

**Part 4 — the number (R19-6).** A-23's *"Verified, not asserted"* section printed `srcPlace.at.lat ×3` in
scenario 3 against the pre-fix tree; it is **×4**. I agree with the breaker's classification: **cosmetic.**
The mechanism decides it — scenario 3 puts N = 3 candidate rows through `samePlace`'s coordinate arm and
A-22 Part 2's count is N+1 — A-22 Part 2's own table already states *"4/1 at N = 3"* correctly, and no
shipped assertion ever read the 3. Corrected in place, above, with the correction attributed rather than
silently overwritten.

---

**What the builder does, and in what order.** One pass, and the ordering is the ruling's own injected-fault
criterion (§0.5):

1. **R19-1 and R19-2 first** (already routed as builder work, unchanged by this ruling): one hoist so
   `source.trip.id` is read once at both the credit and the identity test — pass the id into
   `refileCityKey` rather than re-reading the trip — and one fix so the recipient's `Day` is resolved once
   across `copyStopInto` → `addStop`, either by dropping `copyStop.ts:480`'s pre-check and letting `addStop`
   own the throw it already produces, or by resolving the `Day` once and handing it down.
2. **Then A-24 Parts 1–3 in `readOnce.test.ts` and `copyStop.test.ts`.**
3. **Both directions, or it is not done.** With Part 1 applied and R19-1 **reverted**, `readOnce.test.ts`
   must be **red** naming `srcTrip.id ×2` — that is the census catching, mechanically, the defect this file
   produced for the sixth round running. With R19-1 applied it must be **green**, with all seven `ALLOWED`
   entries observed at exactly their max. A builder who cannot make it red by reverting the hoist has
   implemented Part 1 wrongly, and reports that rather than adjusting the allow-list.
4. **No `ALLOWED` entry beyond the seven**, and no raised `max`. If Part 2's four rows surface an eighth
   multi-read, that is a **finding**, routed here — not an entry.

**What does not change.** `copyStop.ts`'s behaviour for every value the type system permits, apart from
R19-1's and R19-2's two hoists; §2.14's seven rules in rule and in outcome; A-14, A-15, A-16, A-18, A-19,
A-20, A-21, A-21a and A-22 entire; `Place` / `Stop` / `OpeningHours` / `Ticket` shape; `schemaVersion`;
`redactText` and `REDACTION_PATTERNS` — **no pattern and no call site is added**; `fromJSON`, `toJSON`,
`packages/client`, `apps/web`, `cli.ts`; §2.10 at **71** (`censusTrip` and `TRIP_SKELETON` are test-local,
which is §2.10's *"tests do not create surface"*); the reference trip at 2/4/11 and 11 `validateTrip` issues;
the goldens and the sample sha `40955ca0b182`. **No new defensive guard is added**: this ruling governs what
the guard *sees*, never what the product code throws.

#### A-25 — the guard's completeness becomes structural, the last site closes, and the arc closes with it (revision 19, QA R20-1…R20-5)

**What is not reopened, stated first, because it is by far the larger half of round 20's result.** The
**code** side of this arc is converged, and round 20 says so with an attack list rather than an absence of
effort: **22 further document shapes** through the shipped census machinery produced **zero** offenders the
seven `ALLOWED` entries do not already cover and **zero** throws; **all 143** of the reference trip's real
stops (112 scheduled + 31 pooled, five multi-city days, the overnight legs, seven ticketed stops) copy into a
fresh trip with **0 throws** and **0 credential crossings** against the six real credentials; A-24's
two-sided acceptance check reproduces exactly (`63a14d7`'s `copyStop.ts` under the shipped `readOnce.test.ts`
is red naming `srcTrip.id ×2` on 11 of 14 rows, rows 6/7/8 correctly at 1); and the seven-entry allow-list is
tight in both directions. A-14 through A-24 are unchanged in rule and in outcome. `censusDeep`, `censusTrip`,
`TRIP_SKELETON`, the two assertions, the failure messages, the snapshot point, the seven existing roots and
their naming scheme, and A-23's four *"what this does not claim"* bullets are all **unchanged by this
ruling** — as with A-24, this adds roots and rows, it renames and removes none.

**What is wrong is the one clause A-24 wrote to stop the next round, and it is wrong in the shape this whole
arc is about.** A-24 amended A-23's maintenance rule to read *"a new field on `Stop` or `Place` is covered
automatically **once the fixture populates it**, and the fixture populating every field of both records is
part of this contract"* — and shipped **nothing behind the sentence**. Round 20 proved the consequence in
four steps rather than arguing it (**R20-1**): add a 16th `Stop` field written by `makeStop` only when
truthy — exactly `ticket`'s shape; `npm run typecheck` fails at **one** site, `copyStop.test.ts:1256`;
satisfy it the way a builder would; the suite is **618/618 green** and `readOnce.test.ts`'s fixture was never
touched; then plant R19-5's exact shape on the new field and the census is **2/2 green**. The compile-time
stop that exists fires, a builder clears it in the file where it fired, and the census stays blind. And the
same ruling created a second instance of the gap it was describing (**R20-2**): the two `Trip` roots A-24
added carry **17 of `Trip`'s 18 keys** — `meta` is absent, `homeBase` is `null` — so the two fields it most
needed to watch are the two it cannot see, and `Trip.homeBase` is a **named home coordinate**, a `geoCheck`
anchor (§2.13) and precisely the class `BRIEF.md` calls data that must not leak.

That is the arc's own failure applied to its own maintenance clause: *a ruling printed a claim about its own
completeness, and the claim was maintained by memory.* A rule that is not mechanically checked decays — A-21
said so in writing, A-23 acted on it for the **subject** and A-24 acted on it for the **reach**. This ruling
acts on it for the **fixture**, which is the last of the three dimensions a census has.

**Every number below is from running the specified implementation, in a throwaway `git worktree` at
`ad71e56` that was discarded, and not from reading the diff.**

---

**Part 1 — fixture completeness becomes structural (R20-1, R20-2).**

The mechanism is not new and does not need inventing: `copyStop.test.ts` has carried it since A-15 — a
`Record<keyof T, true>` map (a field added to `T` fails `npm run typecheck` *there*) plus a runtime key-set
assertion tying the **fixture instance** to that map. It has simply never been applied to the census's own
fixtures. It is applied now, to **all four** censused record types, and with one addition R20-2 forces:

> **A key-set assertion cannot see a `null`.** `homeBase` is *present* in the fixture and `null`, so a key
> set says the fixture is complete while `censusDeep` stops at the `null` and never enters the subtree —
> R18-5's hybrid-coordinate shape one level down is then green by vacancy. So completeness has two clauses:
> **every key present**, and **every null declared**.

```ts
// A-25 Part 1 (revision 19, QA R20-1, R20-2). A-24 amended the maintenance rule to say the fixture must
// populate every field and shipped nothing behind the sentence; a 16th `Stop` field then reproduced
// R19-5 with the suite green. These four maps are the same compile-time stop `copyStop.test.ts` has had
// since A-15, applied to the census's own fixtures — a new field on `Stop`, `Place`, `Trip` or `City`
// fails `npm run typecheck` HERE as well as there, and the key-set test below then stays red until the
// fixture actually carries it. The maximal fixtures get NO `filter`: `copyStop.test.ts:1300` excludes
// `ticket` because that assertion is about what may CROSS, and this one is about what is WATCHED.
const CENSUS_TRIP_FIELDS: Record<keyof Trip, true> = {
  id: true, title: true, ownerId: true, startDate: true, endDate: true, datePrecision: true,
  homeCurrency: true, homeBase: true, party: true, cities: true, days: true, pool: true,
  places: true, bookings: true, resolutions: true, revision: true, schemaVersion: true, meta: true,
};
const CENSUS_STOP_FIELDS: Record<keyof Stop, true> = {
  id: true, placement: true, name: true, category: true, place: true, note: true, cost: true,
  arrival: true, travelRole: true, bookingId: true, flags: true, provenance: true,
  durationMins: true, links: true, ticket: true,
};
const CENSUS_PLACE_FIELDS: Record<keyof Place, true> = {
  id: true, cityKey: true, name: true, at: true, category: true, note: true, links: true, hours: true,
};
const CENSUS_CITY_FIELDS: Record<keyof City, true> = {
  key: true, name: true, countryCode: true, centre: true, order: true, meta: true,
};

/** Row 14 is deliberately minimal (A-24 Part 2), and its minimality is PINNED rather than assumed: these
 *  are the keys `makeStop` / `addPlace` write only when the init carries them. A new optional field on
 *  `Stop` or `Place` reds the test below until it is either populated in the maximal fixture or named
 *  here — which is the classification, made once, out loud. */
const MINIMAL_STOP_ABSENT: ReadonlyArray<keyof Stop> = ['links', 'ticket'];
const MINIMAL_PLACE_ABSENT: ReadonlyArray<keyof Place> = ['note', 'links', 'hours'];

/** Nulls in a MAXIMAL census fixture, each with the reason it hides nothing. A null stops `censusDeep`
 *  dead, so an undeclared one is a subtree the census silently does not measure (R20-2). Empty today,
 *  and empty is the strongest state this list can be in. */
const DECLARED_NULLS: Record<string, string> = {};
```

with two tests, both of which are ordinary `deepEqual`s over sorted key lists:

```ts
test('A-25: the census fixtures populate every field of every censused record', () => {
  const src = sourceTrip();
  const tgt = targetTrip({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] });
  const min = minimalSourceTrip();
  assert.deepEqual(keys(src), keys(CENSUS_TRIP_FIELDS), 'srcTrip: a Trip field the fixture omits is invisible to the census (R20-2)');
  assert.deepEqual(keys(tgt), keys(CENSUS_TRIP_FIELDS), 'tgtTrip: as above, on the recipient');
  assert.deepEqual(keys(min), keys(CENSUS_TRIP_FIELDS), 'minimal srcTrip: row 14 is minimal in its STOP and PLACE, never in its Trip');
  assert.deepEqual(keys(srcStopOf(src)), keys(CENSUS_STOP_FIELDS), 'srcStop: this is R19-5 — `ticket` was absent and a kind-gated leak was invisible');
  assert.deepEqual(keys(srcStopOf(sourceTrip({ pool: true }))), keys(CENSUS_STOP_FIELDS), 'srcStop (row 13 takes it from the pool)');
  assert.deepEqual(keys(src.places[0]), keys(CENSUS_PLACE_FIELDS), 'srcPlace');
  assert.deepEqual(keys(tgt.places[0]), keys(CENSUS_PLACE_FIELDS), 'tgtPlace0: the RECIPIENT\'s rows are roots too — R18-4');
  assert.deepEqual(keys(src.cities[0]), keys(CENSUS_CITY_FIELDS), 'srcCity0');
  assert.deepEqual(keys(tgt.cities[0]), keys(CENSUS_CITY_FIELDS), 'tgtCity0');
  assert.deepEqual(keys(srcStopOf(min)), without(CENSUS_STOP_FIELDS, MINIMAL_STOP_ABSENT), 'minimal stop');
  assert.deepEqual(keys(min.places[0]), without(CENSUS_PLACE_FIELDS, MINIMAL_PLACE_ABSENT), 'minimal place');
});

test('A-25: every null a maximal census fixture carries is declared', () => {
  const src = sourceTrip();
  const tgt = targetTrip({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] });
  const found: string[] = [];
  tripNullPaths(src, 'srcTrip', found);          // skips TRIP_SKELETON, exactly as `censusTrip` does
  tripNullPaths(tgt, 'tgtTrip', found);
  nullPaths(srcStopOf(src), 'srcStop', found);
  nullPaths(src.places[0], 'srcPlace', found);
  nullPaths(tgt.places[0], 'tgtPlace0', found);
  nullPaths(src.cities[0], 'srcCity0', found);
  nullPaths(tgt.cities[0], 'tgtCity0', found);
  assert.deepEqual(found.sort(), Object.keys(DECLARED_NULLS).sort(),
    'a null in a maximal census fixture hides its whole subtree (R20-2: `homeBase: null` hid a named home ' +
    'coordinate). Populate it, or declare it with the reason it hides nothing.');
});
```

```ts
function keys(o: object): string[] { return Object.keys(o).sort(); }
function without<T extends string>(all: Record<string, true>, absent: ReadonlyArray<T>): string[] {
  return Object.keys(all).filter((k) => !(absent as ReadonlyArray<string>).includes(k)).sort();
}
function nullPaths(v: unknown, path: string, out: string[]): void {
  if (v === null || v === undefined) { out.push(path); return; }
  if (typeof v !== 'object') return;
  const from = v as Record<string, unknown>;
  for (const k of Object.keys(from)) nullPaths(from[k], `${path}.${k}`, out);
}
function tripNullPaths(t: Trip, path: string, out: string[]): void {
  const from = t as unknown as Record<string, unknown>;
  for (const k of Object.keys(from)) {
    if (TRIP_SKELETON.has(k)) continue;
    nullPaths(from[k], `${path}.${k}`, out);
  }
}
const srcStopOf = (t: Trip): Stop =>
  [...t.days.flatMap((d) => d.stops), ...t.pool].find((s) => s.id === 's-src')!;
```

**The fixture changes those two tests demand, and the one judgment inside them.** All three `Trip` fixtures
(`sourceTrip`, `minimalSourceTrip`, `targetTrip`) gain `homeBase: { name: 'Los Angeles', at: LAX }` and
`meta: { poolNotes: { [cityKey]: { title, note } }, sourceHash }` — `poolNotes` is KD-20's free-text carrier
class and `homeBase.at` is the coordinate §2.13 anchors on, so these are the two `Trip` fields worth watching
and not two arbitrary ones. Both documents' `City` rows gain `countryCode` and `meta`; the target's `Place`
rows gain `note`, `links` and `hours`, because `tgtPlace0…n` are roots and a root whose fixture is partial is
the R20-1 gap one record over. **The judgment: `srcStop.bookingId` is *populated* (`'bk-src'`), not
declared.** It is a scalar and a null scalar hides no subtree, so `DECLARED_NULLS` would have been the
cheaper answer — but the regression shape this arc keeps meeting is
`...(src.x && … ? { x: src.x } : {})`, and against a **null** that expression short-circuits after one read
and is invisible exactly as `ticket` was. A maximal fixture means values that make the test-then-emit shape
*measurable*, not merely keys that are present. With that, `DECLARED_NULLS` is empty and stays a live escape
hatch rather than a list.

**Measured, both directions.** R20-1's four-step mutation now stops at step 2: a 16th `Stop` field
(`voucher?: { code: string }`, written by `makeStop` only when truthy) fails `npm run typecheck` at **two**
sites — `copyStop.test.ts:1256` and `readOnce.test.ts`'s `CENSUS_STOP_FIELDS` — and satisfying both maps the
way a builder would leaves the census's fixture test **red** (`srcStop`), so the only way forward is to
populate the fixture; with it populated, R19-5's exact plant on the new field
(`...(src.voucher && src.voucher.code ? { voucher: src.voucher } : {})`) reds assertion 1 with
`srcStop.voucher ×3` on **every** scenario row. R20-2's two plants, both **2/2 green** at `3d1be3b`, now red:
`srcTrip.meta ×4` + `srcTrip.meta.sourceHash ×2`, and the `homeBase` hybrid-coordinate shape as
`srcTrip.homeBase ×4` + `srcTrip.homeBase.at ×2`. **And the fix costs no allowance**: with every fixture
populated as above, the shipped entries are unchanged and nothing throws — the suite is 620/620 (618 + these
two tests).

---

**Part 2 — `City` rows become census roots (R20-3's scope half, R20-4's first half).**

A-24 stated the extension point as *"the day a `City` or `Day` field **crosses** into a copied record"*.
Round 20 is right that this is written about the wrong verb, and the correction is the ruling, not the
site: **a read-once rule is about which value was checked, so a value that *decides where a crossed record
is filed* is in scope exactly as a value that crosses is.** The precedent is already in the roots: R18-4
put the **recipient's own** `Place` rows there, and nothing of a recipient's `Place` row ever crosses a
person boundary either — it is censused because `samePlace` decides on it. A `City` row's `key` and `order`
decide the same thing one level up, and the harm is worse than a miscount, because **a `Place` carries no
provenance (A-6)**: a place filed under the wrong one of two cities the recipient named identically is an
unbadged, uncredited row in their document that `validateTrip` reports as **0** issues and no view can
distinguish. That is the same silence A-16 exists to refuse.

**What changes is two lines in `runScenario`**, mirroring the `places` substitution that has been there since
A-23. Arrays are still never roots — A-24's *"the census's unit is a root; arrays are never roots, rows
are"* is the rule being **applied** here, not amended, and `TRIP_SKELETON` still hands `cities` back bare:

```ts
  const srcSub: Trip = {
    ...srcTrip0,
    days: /* unchanged */,
    pool: /* unchanged */,
    places: srcTrip0.places.map((p, i) => censusDeep(p, counts, i === 0 ? 'srcPlace' : `srcPlace${i}`, opaque)),
    // A-25 Part 2 (QA R20-3): a `City` row decides where a crossed `Place` is FILED — `key` is the answer
    // and `order` is the tie-break — so its rows are roots for the same reason `tgtPlace0…n` are.
    cities: srcTrip0.cities.map((c, i) => censusDeep(c, counts, `srcCity${i}`, opaque)),
  };
  const tgtSub: Trip = {
    ...tgtTrip0,
    places: tgtTrip0.places.map((p, i) => censusDeep(p, counts, `tgtPlace${i}`, opaque)),
    cities: tgtTrip0.cities.map((c, i) => censusDeep(c, counts, `tgtCity${i}`, opaque)),
  };
```

**Measured over the full 15-row matrix (Part 4's row included), opening the `City` rows produces exactly two
multi-reads and no others** — which is why this is a bounded widening and not A-24's first refused candidate:

| field | reads | verdict |
|---|---|---|
| `tgtCity1.order` | **2** | **A defect — this is R20-3**, closed by Part 3's hoist. The source is not spread and neither is the target's `cities` row; 2 is a second read, not a floor. |
| `tgtCity0.key` | **2** (row 9 only) | **`ALLOWED`, `max: 2`.** Read 1 is A-19 validating the **pool placement argument** against the target (`target.cities.some((c) => c.key === cityKey)` — a boolean about the *caller's* key; nothing of the row is emitted by it). Read 2 is step 4 recording the re-file's answer, which *is* the row's key. Two independent decisions producing two different fields of the result, over the **recipient's own** row; nothing crosses a person boundary. Collapsing them would require `refileCityKey` to work from a pre-read key list, i.e. a second definition of *"the target's cities"* in this file — A-24's own reason for calling `tgtTrip.id ×2` irreducible. |
| every other `City` field, both documents | ≤ 1 | — |

so `ALLOWED` becomes **eight** entries:

```ts
  'tgtCity0.key': { max: 2, why: 'A-25 Part 2: read 1 is A-19 validating the POOL PLACEMENT ARGUMENT against target.cities — a boolean about the caller\'s key, emitting nothing of the row; read 2 is refileCityKey step 4 recording the re-file answer. Two independent decisions over the RECIPIENT\'S OWN row; nothing of a target City crosses a person boundary' },
```

A-24's converse clause applies unchanged and is a gate: assertion 2 requires the new entry to be observed at
**exactly 2** somewhere in the matrix, and it is — row 9, the pool placement with a live hint, which is the
only row that reaches both reads. If a future fix removes either read, the entry is **deleted in the same
pass**; that is a builder's obligation, not a widening.

---

**Part 3 — the last site: `refileCityKey`'s step-4 fold reads a candidate's `order` twice (R20-3).**

`copyStop.ts:357` is A-21's banned form verbatim — the value that was compared is not the value that was
recorded, and the recorded one is what the next iteration compares against:

```ts
  let best: { key: string; order: number } | null = null;
  for (const c of target.cities) {
    if (normalizeCityName(c.name) !== wanted) continue;
    // A-25 Part 3 (revision 19, QA R20-3). ONE read of the candidate's `order`: the number the tie-break
    // is decided on is the number the winning record carries. With two reads, an `order` flipping [3, 99]
    // on the middle of three same-named target cities wins the comparison and is filed under the loser —
    // and `validateTrip` reports 0, because a `Place` carries no provenance (A-6).
    const order: number = c.order;
    if (best === null || order < best.order) best = { key: c.key, order };
  }
```

It takes **three** same-named target cities to reach: with two, the first match short-circuits on
`best === null` and `order` is read once. Nothing else in the function moves — `c.key` and `c.name` are each
read once per candidate already, A-16 step 2 and A-14 steps 1–3 are untouched, and for every stable document
the output is bit-for-bit what shipped (620/620, goldens and sample byte-identical, sample sha
`40955ca0b182`).

**Two-sided, and this is the acceptance check.** With Parts 1, 2 and 4 applied and this hoist **reverted**,
`readOnce.test.ts` is red naming exactly one offender — `15 · three same-named target cities — the step-4
order tie-break: tgtCity1.order ×2` — and with the hoist applied it is green with all **eight** `ALLOWED`
entries observed at exactly their max. A builder who cannot produce that red line has implemented Part 2
wrongly and reports it rather than adjusting the allow-list.

---

**Part 4 — the fifteenth matrix row.**

| # | scenario | what it is the only cover for |
|---|---|---|
| 15 | **three same-named target cities**, orders 5 / 3 / 4 | `refileCityKey`'s step-4 tie-break run more than once — the branch R20-3 subverts. Two candidates do not reach it (`best === null` short-circuits the first), which is why no row of the 14 could see this. Verified: the stable answer files the copied `Place` under the **order-3** city; with the second read disagreeing it files under the order-4 one and `validateTrip` reports **0**. A trip may legitimately hold two cities of one name — A-10 blesses that — so this is an ordinary document, not a fault injection |

Rows 1–14 are unchanged in construction and in numbering, so `qa/`'s row-by-row cross-check survives.

---

**Part 5 — the residue, corrected, completed, and bounded (R20-4; the class-A enumeration itself completed
in place after QA round 21 re-derived it — **R21-1**, below).**

A-24's residue paragraph said *"Two known multi-reads therefore stay invisible"* and named two. Round 20 is
right that a fuller sweep finds more, and right that the honest fix is for the disclosure to **be** the
residue. Here it is, measured with **nothing opaque but the `IdFactory`** — every collection and every row
opened — across all 15 rows with Parts 1–4 applied. There are three classes and they are on different sides
of two different lines:

**Class A — containers.** `tgtTrip.days ×4`, `tgtTrip.days.<n> ×3`, `tgtTrip.days.<n>.stops ×3`,
`tgtTrip.places ×3`, `tgtTrip.cities ×2–3`, `tgtTrip.places.<n> ×2`. This is the skeleton scan A-23 blessed
and A-24's first refused candidate: closing it needs allow entries with `max: 5` on an **array**, which is a
licence rather than an exception. **Unchanged, and correctly so.**

**Three further instances of this same class, added in place after round 21 re-derived the set (R21-1).** The
paragraph above shipped complete **by class** and short **by instance** — which matters here more than it
would anywhere else, because this arc's recurring failure is *a ruling printing a claim about the
completeness of its own search*, and Part 5 is the paragraph that exists to end that shape. The classes are
unchanged and the bound is unchanged. Each of the three is a **container or a row of the recipient's own
document**: nothing crosses a person boundary on any of them, and none decides where a crossed record is
filed — the two clauses Part 2 uses to bring a value *into* scope — so none of them is the re-opening
condition Part 6 names.

- **`tgtTrip.cities.<n> ×2`** — a `City` **row**, on row 9; the only one of the three any of the fifteen rows
  reaches, and the A-25 builder disclosed it itself rather than absorbing it. Read 1 is A-19's pool-placement
  validation, `target.cities.some((c) => c.key === cityKey)`, which extracts **only `.key`** from the row;
  read 2 is `refileCityKey`, which takes the whole filing decision from that one read. A flipping row can
  therefore diverge from the validation in exactly one dimension, and it is the dimension the eighth
  `ALLOWED` entry (`tgtCity0.key`) already names and bounds. Round 21 did not take that argument, it ran the
  experiment, on two cities the recipient had named identically: the **row** flip and the already-accepted
  **field** flip both file the copied `Place` under `tgt-city-2` with `validateTrip` reporting **0** —
  *byte-identical outcomes*. And the variant that is **not** accepted, flipping to a key the target does not
  hold, is strictly **more** visible rather than less: `validateTrip` reports `unknown_city_key`, an
  **error**. So this is the accepted class, not a worse one.
- **`tgtTrip.pool ×2`** — a container, and **no row of the fifteen reaches it**: it needs a pool placement
  whose `Place` is *reused*, so that `withPlace === target` and `addStop`'s
  `{ ...trip, pool: [...trip.pool, stop] }` lands on the censused object rather than on a fresh one. That is
  the identical **spread-then-overwrite floor** A-24 Part 1's discriminator already blesses and the
  `tgtTrip.revision` entry already names, one container over: a record this path *spreads* has an irreducible
  floor of one read, and the object spread is the second.
- **`tgtTrip.days.<n>.stops.<n> ×2`** — a row of the recipient's own day, also unreached by the fifteen: it
  needs `insertionIndex`, i.e. a scheduled `order` past the day's length. It is **class C's own container**,
  reached through the same `build/stops.ts` editing engine class C rules **out of scope for this arc** with a
  reason and a trigger, and it inherits class C's bound intact — the values are the recipient's own, nothing
  crosses, and the harm ceiling is the user's own day rendering out of the order they dragged it into, which
  is visible to the person it happens to and reversible by them with a drag. If class C's trigger ever fires
  (a `Stop.placement` built by something other than a person's own hand), this row is inside the census that
  answers it, not a separate question.

**Two of the three are reached only by a sweep wider than the matrix, and that is expected rather than a
gap — so the fix is these three entries and *not* two new matrix rows.** Round 21 offered the rows (a pool
placement with a reused `Place`; a scheduled `order` past the day's length) so that this list would be
re-derivable from the fifteen rows alone. Declined, for the reason Part 6 already gives when it refuses
branch coverage as the matrix's mechanical proxy: **the matrix and the residue measure different things.**
The matrix is a *branch-coverage* instrument over `copyStopInto`, and A-23's maintenance rule is written in
those terms — *a new branch in `copyStopInto` adds a row*. Neither proposed row adds a branch of
`copyStopInto`: one lands in `addStop`'s spread, the other in `build/stops.ts`, the engine this arc has
deliberately not annexed. The residue, by contrast, is a *bound on what the census structurally cannot see*,
and Part 6 clause 6 already specifies how it is kept honest — **a fully-opened census over whatever document
shapes the round builds**, which is exactly how round 21 found these two. A row added only to make an
accepted residue matrix-reachable would be a scenario that cannot fail differently from one already present
(round 21 measured the `City`-row case as byte-identical to the accepted field-level flip), and it would
churn the row numbering `qa/`'s row-by-row cross-check depends on, for a disclosure-only gain. **Standing
instruction instead, in one line:** any future re-derivation of this list sweeps shapes beyond the fifteen
rows, as round 21 did — a re-derivation that only sweeps the matrix has not done clause 6's job.

**Class B — `tgtTrip.days.<n>.id ×2`, on every row with a scheduled placement. Not a residue at all: a
floor, by A-24 Part 1's own discriminator.** Read 1 is `withDay`'s `findIndex(d => d.id === dayId)`; read 2
is the `{ ...day, stops }` spread that rebuilds the recipient's own day — a record this path **spreads**,
which A-24 already ruled has an irreducible floor of one read (that is the whole of `tgtTrip.id` and
`tgtTrip.revision`). A-24 listed it as *"known invisible"*; it is more precisely *"known and blessed by the
rule already written"*, and this ruling corrects the classification rather than the code. R19-2's actual
defect — a pre-check that accepted a day `withDay` then refused — is closed and stays closed.

**Class C — `tgtTrip.days.<n>.stops.<m>.placement ×6` and `.placement.kind ×2`, `insertionIndex` +
`reindex` in `build/stops.ts`. Ruled OUT OF SCOPE for this arc, for three reasons, with a trigger.** In the
15-row matrix it appears on **row 12 alone**, because row 12 is the only scenario whose target day already
holds a stop — which is itself the point: it is a property of *editing a day*, not of *copying into one*.

1. **It is not the copy path.** `reindex`, `insertionIndex` and `compareStops` are the editing engine:
   `addStop`, `moveStop`, `removeStop` and `merge/mergeTrips.ts` all call them, and `copyStopInto` reaches
   them only through `addStop`. A census specified over one caller measures the wrong function here — fixing
   these reads *for the copy* leaves them live under a drag, which is the shape of a fix that is not one.
   A-21 Part 3 drew exactly this boundary around `toJSON`'s non-`hours` fields and it held.
2. **Nothing crosses and nothing is filed.** The values are the **recipient's own** `placement`; no record
   crosses a person boundary on them and no crossed record is filed by them, which are the two clauses Part 2
   uses to bring a value *into* scope. The harm is the user's own day rendering out of the order they dragged
   it into — **visible to the person it happens to, and reversible by them with a drag**. That is the
   opposite of A-6's unbadged `Place`, and it is why classes B and C sit outside a line R20-3 sits inside.
3. **Its population is narrower than the arc's standing bound.** It needs an accessor property on a value
   the caller supplied, *and* that caller is the recipient's own document — so it is a strict subset of a set
   already measured to be empty for every shipped caller.

**The trigger, stated so nobody re-derives it:** the day a `Stop.placement` is built by something other than
a person's own hand — an ingest worker (§5.1), a native bridge, a vendor-feed merge — the read-once question
reopens for `build/stops.ts` **as a whole**, and the answer is one census over the editing engine, not four
hoists smuggled into this arc. That is the same trigger A-20, A-21 Part 6, A-21a and A-23 all already name,
pointed at the one file this arc has been walking past.

**R20-5 is QA's, and is confirmed rather than ruled.** `qa/r14-horizon-copy.mjs` §7 pins `kds.length === 49`
against a BUILD-NOTES that now holds 50; re-expressing the ceiling to **50** is one character and is A-19
assertion 7's standing assignment to QA, not a builder edit and not an architectural change. The disclosure
half is real and belongs in the ship gate: **a pass that mints a KD runs the probe that pins the KD count and
says so.** Two earlier builder passes declined to mint a KD *because of that line*, so it was known to be
load-bearing. KD-50's other residue — that `no such day: <id>` no longer shares a message family with the
other two refusals — stays **recorded and unchanged**: A-24's *"what does not change"* list keeps
`copyStopInto`'s throws stable, no caller pattern-matches the text (`copyStop.test.ts` asserts
`/no such day/`, the rule rather than the wording), and moving it now would trade a stable message for
symmetry.

---

**Part 6 — the closure judgment, and the criterion it is closed on.**

**Once Parts 1–4 land and round 21 verifies them, the read-once / credential-boundary arc is CLOSED for
I-4a's ship gate.** This is a decision, not an observation, so here is the reasoning and then the criterion
someone else can check.

**Why close.** Three rounds (18, 19, 20) at **zero BLOCKER**. The mechanism is not merely present but
demonstrated: 20 planted defects caught in round 19, 14 of them invisible to every other test; 22 further
document shapes and 143 real stops finding nothing in round 20. And the shape of the findings has moved
decisively — R14 through R19 found defects in the **guarded code**; round 20 found one narrow site (R20-3,
the recipient's own filing, `validateTrip`-silent but not a crossing) and otherwise found gaps in the
**guard's own completeness**, which is a strictly better place for a round to land and is the state a guard
is supposed to reach. This project's own established practice is to **name and bound** a residue rather than
chase every theoretical gap — A-15's disclosed `Stop.links` residue, A-21 Part 3's `toJSON` boundary, A-21a's
`placeForCopy` reuse-miss exception — and continuing by default would be the one thing §0.5 warns about from
the other direction: work that is not distinguishable from progress.

**What makes closing safe rather than optimistic is that all three dimensions of the guard are now
mechanical.** A census can only be wrong in three ways, and each now fails a test rather than a reviewer:

| dimension | how it used to fail | what closes it |
|---|---|---|
| **roots** — what is watched | A-23 hid both `Trip`s; A-24 hid `City` rows | A-24 Part 1 + A-25 Part 2. The rule for adding one is written and was applied twice: *a value that crosses, or that decides where a crossed record is filed* |
| **fixtures** — whether a watched record is populated | R19-5 (`ticket`), R20-1 (any next field), R20-2 (`meta`, `homeBase`) | **A-25 Part 1** — compile-time map, runtime key-set assertion, declared-nulls list. This is the dimension that was pure prose until now |
| **matrix** — which branches are reached | R19-4 (row 5's impossible cover), R20-3 (three same-named cities) | A-24 Part 2 + A-25 Part 4 — and **this one stays a maintenance rule**, honestly |

**The matrix is not made structural, and the reason is stated rather than skipped.** *"A branch"* is a
property of the code, not of a type, so no `Record<keyof T, true>` reaches it. The obvious mechanical
candidate — `node --test --experimental-test-coverage`'s branch report over `copyStop.ts` — is **refused**:
it measures the *whole suite's* coverage of the file, so a branch reached only by `copyStop.test.ts` would
satisfy it while the census never runs that branch, which is a check that passes for the wrong reason and is
exactly what §0.5 forbids. So the rule stands as A-23 wrote it — **a new branch in `copyStopInto` adds a
scenario row** — and its enforcement is the acceptance check on any future change to this file: the change
names the row it added, or it is not done.

**The criterion, written so a manager or a future session verifies it was met rather than declared.** At the
commit that lands A-25:

1. `npm run test:tap` **green with `readOnce.test.ts`'s four tests inside it**; `npm run typecheck` clean
   (both projects); `npm run web:build` clean; `Object.keys(core).length` = **71**; reference trip **2 / 4 /
   11** at `FIXTURE_TODAY`; `validateTrip` **11** issues; `npm run golden` and `npm run sample` regenerate
   byte-identically with the sample sha unmoved at **`40955ca0b182`**.
2. **Part 3 two-sided:** reverting the `refileCityKey` hoist reds assertion 1 naming **exactly**
   `15 · … : tgtCity1.order ×2` and nothing else; applied, green with **all eight** `ALLOWED` entries
   observed at exactly their max.
3. **Part 1 two-sided, run as R20-1's own four steps:** a 16th `Stop` field fails `npm run typecheck` at
   **two** sites; satisfying both maps leaves the fixture test **red**; populating the fixture makes it
   green; R19-5's plant on that new field then reds the census on every row. All four steps, or Part 1 is not
   implemented.
4. **Part 1's null clause two-sided:** the `Trip.meta` double read and the `Trip.homeBase` hybrid shape are
   both **red** (both were green at `3d1be3b`), and `DECLARED_NULLS` is **empty**.
5. **No ninth `ALLOWED` entry and no raised `max`** in the pass that lands this or any later builder pass. A
   multi-read the eight entries do not name is a **finding routed to the architect**.
6. **The Part 5 residue is re-derived by the round-21 breaker**, not inherited: a fully-opened census over
   the 15 rows prints classes A, B and C and nothing else.

**Verified. QA round 21, at `020ee37`, reports all six clauses HOLD** — clause by clause, each with a repro
(`qa/r21-closure.mjs`, `qa/r21-clause3.sh`), plus a fresh adversarial pass of **22 further document shapes**
through both the shipped census and a fully-opened one: **0 throws, 0 unnamed multi-reads inside the census's
roots, 0 paths outside the accounted set, and nothing meeting the re-opening condition.** Clause 6 produced
the one finding of the round, **R21-1** — the class-A list was short three instances, all of the same
already-accepted class — which is folded into Part 5 above, in place, and is explicitly **not** a re-opening
(the breaker says so, and the measurement behind it is quoted there). **So the arc is closed, not
closeable.** Anything further about `copyStop.ts` is ordinary work under the re-opening condition below.

**And the re-opening condition, which is the other half of a closure and is deliberately narrow.** A future
finding *inside* the census's roots is a **normal regression** — the guard caught it, which is the guard
working — and is routed as ordinary builder work, not as a re-opened arc. What re-opens the arc is exactly
one thing: **a multi-read that the shipped census structurally cannot see** — of a value that crosses a
person boundary, or that decides where a crossed record is filed — because that is a gap in the guard's
reach, and it is the single failure mode every one of rounds 14–20 was an instance of. Nothing else re-opens
it: not a count that moves, not a message that changes, not a residue already named in Part 5.

**The residue this closes over, named and bounded in one place.** Everything left in this class requires an
**accessor property on a caller-supplied value**, and the population is measured rather than argued, in the
same terms rounds 16–20 each re-derived independently: `JSON.parse` produces own data properties and never
accessors; `TripDoc = string`; `importDoc(text: string)` and `cli.ts` both pass text; `apps/web`'s only
`copyStopInto` call site builds `{ trip: browsing, stopId: stop.id }` as an object literal over a parsed
document. **No JSON document and no shipped caller can produce one**, so the population is an in-process
caller past the type system — and that population becomes real on exactly the day A-23's own widening trigger
fires (something other than a person's own hand builds a `Trip` in memory: a native bridge, an ingest worker
§5.1, a vendor feed), at which point the census is the shape the answer already takes.

---

**What the builder does, and in what order.** One pass; the ordering is the ruling's own injected-fault
criterion (§0.5):

1. **Part 3 first** — the one product-code line, in `copyStop.ts`. Alone, it changes no test.
2. **Then Part 2 and Part 4** in `readOnce.test.ts` (the two `cities:` substitution lines, row 15, the eighth
   `ALLOWED` entry). Verify criterion 2 **both ways** before going further; a builder who cannot make it red
   by reverting step 1 stops and reports rather than adjusting the allow-list.
3. **Then Part 1** — the four maps, the two lists, the two helpers, the two tests, and the fixture
   population. Verify criterion 3's four steps and criterion 4 in a throwaway worktree, and discard it.
4. **Nothing under `qa/` is edited by this pass.** `qa/r19-census-gaps.mjs` §5 pins *seven* `ALLOWED` entries
   and will go red at eight, and `qa/r20-census-reach.mjs` §2 measures QA's own local copy of the fixtures;
   both are **QA's to re-express in round 21** under A-19 assertion 7, along with R20-5's one-character
   ceiling in `qa/r14-horizon-copy.mjs` §7. The builder **reports the probe lines it expects to move** and
   does not touch them.

**What does not change.** `copyStop.ts`'s behaviour for every value the type system permits, apart from Part
3's hoist; §2.14's seven rules in rule and in outcome; A-14 through A-24 entire, including A-24's
spread-versus-read discriminator, its seven existing entries and its 14 rows; `Place` / `Stop` / `City` /
`Trip` / `Ticket` shape; `schemaVersion`; `redactText` and `REDACTION_PATTERNS` — **no pattern and no call
site is added**; `fromJSON`, `toJSON`, `build/stops.ts`, `packages/client`, `apps/web`, `cli.ts`; §2.10 at
**71** (every symbol this ruling names is test-local, which is §2.10's *"tests do not create surface"*).
**No new defensive guard is added**: like A-23 and A-24, this ruling governs what the guard *sees*, never
what the product code throws.

### 2.10 The public API surface

**Settled in revision 5 (QA R2-12, KD-19); 69 → 70 in revision 6, 70 → 71 in revision 10, 71 → 73 at
Phase 2 I-5, 73 → 74 at Phase 2 I-6 (recorded late — see below), and 74 → 75 at Phase 2 I-7, each for a
stated reason.**
`reassertRetirements` joins under **P1** — `packages/client`'s `set()` calls it — and it is the same class as
`syncResolutions`, which is already here: a pure build function the client must call because the client is
where the trigger lives. **`lifecycle` joins under P2 in revision 10** (Phase 2 I-1): §8.1 specifies it by
name, §8.9 is the documentation change, and `cli.ts` and `apps/web` are its callers. **`countryOf` and
`COUNTRY_INDEX` join at Phase 2 I-5**: §8.4 clause 1 specifies `countryOf(at, index)` by name (**P2**), and
the same clause's revision-10 consequence says the index *"is generated code inside `packages/core` and is
exported as a value from `index.ts` so every call site can pass it"* — `tools/gen-golden.mjs` is already such
a call site (**P1**), and ceiling (1) below forbids it reaching into `geo/countries.gen.ts` by module path.
The index's *constructor* and *decoder* (`countryIndex`, `decodeCountryIndex`) stay internal: a caller needs
to pass an index, not to mint one.

**`SUMMARY_VERSION` joined at Phase 2 I-6 and this block did not say so — corrected at revision 24, and the
correction is the interesting part.** I-6 added it to `index.ts` and to `surface.test.ts`'s list in the same
pass, so set equality held in both directions and nothing went red; only *this document* was behind, at
**73** while the code was at **74**. §2.10's enforcement is set equality between `index.ts` and
`surface.test.ts`, and the prose count is the one thing neither of them can check — so treat a number in
this paragraph as a claim to re-derive (`node -e "import('./packages/core/src/index.ts').then(m =>
console.log(Object.keys(m).length))"`), never as an oracle. It is a **P1** join: `packages/client`'s
`store.ts` compares `row.summaryVersion` against it and the whole rescan is that comparison.

**`travelStats` joins at Phase 2 I-7** under **P2** — §8.4 clause 2 specifies it by name and **A-31** gives
its signature — and under **P1** in the same increment, because `cli.ts stats` calls it. Its helpers stay
internal for group 1's reason: `normalizeCityName` is `model/cityName.ts`'s and is deliberately off the
index (§2.14 A-14), and a caller that can fold a name itself is a caller that will grow a second grouping
rule.

§2.10's own enforcement
rule is *"widening the surface is a documentation change
first"*, and these lines are that change. The list below is the whole contract: **75 runtime symbols**,
one list, asserted as set equality in both directions against the runtime exports of
`packages/core/src/index.ts`. It replaces a two-list arrangement — 50 "in §2.10" plus 60 "beyond §2.10, each
with a justification" — that made the criterion true by construction against 110 exports. A boundary the
Phase 2 server and the Phase 4 native app are written against cannot be "110 against 50, enumerated".

#### How the list was derived — the principle, so the next change does not need a ruling

A symbol is on the surface if **either**:

**(P1) a consumer outside `packages/core` calls it today** — `packages/client`, `apps/web`, `cli.ts`,
`fixtures/`, `tools/`. Measured, not assumed: 50 symbols in revision 5, **51 in revision 6**
(`reassertRetirements`, called by the store's `set()` — §2.7 A-5), counting the reducer's string-keyed
`ACTION_SPECS[…].coreFn` dispatch as a call site, because it is one.

**(P2) a numbered section of this document specifies it by name as a callable or a constant.** 19 symbols in
revision 6, **20 in revision 10**, **21 at Phase 2 I-5**, **22 at Phase 2 I-7** — things a phase has no
caller for yet, or that a section names outright: the access predicates (§6.2), `geoCheck`/`GEO_LIMIT_KM`
(§2.13), `clusterStops`/`MIN_SPAN_KM` (§2.5), `SCHEMA_VERSION`/`migrateDoc` (serialization),
`TripParseError`, `RULES`, the redaction four (§6.6), `lifecycle` (§8.1, §8.9), `countryOf` (§8.4) and
`travelStats` (§8.4 clause 2, **A-31**). `COUNTRY_INDEX` and `SUMMARY_VERSION` are **P1** joins, not P2
ones: `tools/gen-golden.mjs` passes the first and `packages/client`'s rescan compares against the second.

Everything else is internal, whether or not it is currently exported. **Tests do not create surface.**
`packages/core`'s own tests, `cairn/test/` and `cairn/qa/` may import a module path directly
(`packages/core/src/derive/geo.ts`) — attacking internals is their job, and routing that through the index
would make every internal public. The un-export pass therefore rewrites some probe import lines from the
index to the module path; that is the expected shape of the change, not a regression.

```
packages/core/src/index.ts re-exports exactly this and nothing else — 75 runtime symbols:

  model (7)      LOCAL_OWNER · SCHEMA_VERSION · sequentialIds · formatRange · costFromDisplay
                 TripParseError · ForeignDocumentError
  build (17)     createTrip(init) · ensureDays(trip) · setTripMeta(trip, patch) · setDayMeta(trip, dayId, patch)
                 addStop(trip, placement, stop) · updateStop(trip, stopId, patch) · removeStop(trip, stopId)
                 moveStop(trip, stopId, placement)      // day↔day, day↔pool, reorder — ONE function
                 reorderStop(trip, stopId, delta)
                 scheduleFromPool(trip, stopId, hint?) · returnToPool(trip, stopId) · poolFor(trip, cityKey)
                 acceptCandidate / rejectCandidate(trip, ref, actorUserId: UserId, at)  // NOT nullable — §2.14
                 copyStopInto(target, source, placement, ctx)        // §2.14 — the social primitive
                 upsertBooking · linkBooking
  derive (26)    computeLegs(day, trip) · dayMovingMinutes(day, trip) · dayDistanceKm(day, trip) · fmtMins
                 clusterStops · focusCluster · fitSpanKm · MIN_SPAN_KM · mapBounds · stopPoints · stopLatLng
                 rollUpCost · displayStatus · attribution
                 cityRange · daysForCity · orderedCities · weekdayOf · tripSummary
                 SUMMARY_VERSION                                     // §8.4 clause 3 — the rescan's subject
                 geoCheck · GEO_LIMIT_KM                             // §2.13 — one implementation
                 lifecycle(trip, today)                              // §8.1 — derived, never stored
                 countryOf(at, index) · COUNTRY_INDEX                // §8.4 clause 1 — index injected
                 travelStats(summaries, today)                       // §8.4 clause 2, A-31 — never stored
  conflict (6)   detectConflicts · RULES · resolveConflict · unresolveConflict · syncResolutions
                 reassertRetirements(trip, retired)                  // §2.7 A-5 — the retirement ledger
  validate (2)   validateTrip · issueCounts
  merge (2)      mergeTrips · describeMerge                          // §4.2 rule 6b's "merge with the stored copy"
  access (7)     canView · canComment · canEdit · canShare · canDelete · can · effectiveRole   // §6.2
  serialize (3)  toJSON · fromJSON · migrateDoc
  import (1)     importLegacyDays
  redact (4)     REDACTION_PATTERNS · REDACTED · redactText · redactionHits                     // §6.6

  types          exported freely and NOT part of the set-equality assertion: types are erased at runtime,
                 `tsc` already fails on a missing one, and a type cannot leak an implementation the way a
                 function can.
```

#### The 45 that come off, and why

`CAT_DEFAULT_TIME` · `DEFAULT_CLUSTER_THRESHOLD_KM` · `EARTH_RADIUS_KM` · `STALE_RESOLUTION_LIMIT` ·
`addDays` · `addPlace` · `blankDay` · `canonical` · `cityOfStop` · `compareStops` · `conflictId` ·
`conflictsFor` · `currenciesOf` · `dateSpan` · `dayCost` · `dayNumber` · `digest` · `emailCandidate` ·
`findDay` · `findStop` · `fixedClock` · `friendImport` · `fromDayNumber` · `haversine` · `inRange` ·
`insertionIndex` · `isIsoDate` · `legBetween` · `makeConflict` · `makeStop` · `mergeLostData` · `mixesBasis` ·
`needsBadge` · `parseCostDisplay` · `parseIsoDate` · `pickDay` · `rawSpanKm` · `resolvePlaceLink` ·
`statusLabel` · `stopsForBooking` · `supersedeBooking` · `systemSuggestion` · `timeVal` · `toDoc` ·
`userProvenance`

They fall into four groups, and the group is the reason — no per-symbol justification list, because a
per-symbol justification list is what let 42 wrong justifications through:

1. **Internals of a public function** (`legBetween`, `haversine`, `resolvePlaceLink`, `inRange`,
   `rawSpanKm`, `dayCost`, `parseCostDisplay`, `currenciesOf`, `mixesBasis`, `timeVal`, `insertionIndex`,
   `compareStops`, `conflictsFor`, `mergeLostData`, `blankDay`, `makeStop`, `findDay`, `findStop`,
   `cityOfStop`, `pickDay`, `addPlace`, `stopsForBooking`, `supersedeBooking`, `addDays`, `dateSpan`,
   `dayNumber`, `fromDayNumber`, `parseIsoDate`, `isIsoDate`, `statusLabel`, `needsBadge`). Exporting the
   halves of a function alongside the function invites a caller to assemble its own version of it — which is
   how two implementations of one geography rule came to exist (§2.13).
2. **Tuning constants a caller must not read or reproduce** (`CAT_DEFAULT_TIME`,
   `DEFAULT_CLUSTER_THRESHOLD_KM`, `EARTH_RADIUS_KM`, `STALE_RESOLUTION_LIMIT`). Contrast `MIN_SPAN_KM` and
   `GEO_LIMIT_KM`, which are on the surface because §2.5 and §2.13 state their values as part of the contract
   and a consumer explains a finding with them.
3. **Identity and canonicalisation** (`conflictId`, `makeConflict`, `digest`, `canonical`, `toDoc`) — the
   six the builder's own test already tagged `INTERNAL`. A conflict id is a value core mints and consumers
   compare; a consumer that can *mint* one can mint a resolution for a conflict that never existed.
4. **Provenance constructors** (`userProvenance`, `systemSuggestion`, `emailCandidate`, `friendImport`) and
   the test-only `fixedClock`. These are the same class as `accept`/`reject`, which QA R5-5 already took off
   the surface for the same reason: they stamp provenance with no gate, so exporting them publishes a way to
   mint an attributed record without going through `copyStopInto` and its seven rules (§2.14).

**Enforcement.** One list in `surface.test.ts`, set equality in both directions against `index.ts`'s runtime
exports, **no union and no second list**. A symbol added to the index without being added to §2.10 fails; a
symbol in §2.10 that is not exported fails. Widening the surface is a documentation change first — add the
caller or add the section that names it, then add the line.

`moveStop` covering day↔day, day↔pool and reorder is deliberate: today those are three functions with three
chances to disagree about what happens to `sug`/`_optId`/`addHint`.

`access` predicates ship in Phase 1 even though nothing enforces them yet — they are the definition the
Phase 2 RLS policies are generated from and tested against. Writing them later is the retrofit Jacob
specifically asked to avoid. All seven are on the surface, `can` and `effectiveRole` included: the module is a
*definition*, and a definition with a private half is a definition Phase 2 will re-derive.

The redaction four move onto the index in this revision because `tools/redact.mjs` reaches into
`packages/core/src/build/redactText.ts` by module path today. §6.6 makes redaction a rule with a test behind
it; a rule enforced through a deep import into another package is the boundary erosion this section exists to
prevent.

### 2.11 Migration: `DAYS` → core, exactly

Measured against the live file: **16 days, 112 stops** (all with coordinates), 5 multi-city days, 2 `flag`
days, 3 `sugDay` days, 21 `sug` stops, 21 `badge` stops, 7 `ticket` stops, 49 costed stops, 30 booking links,
81 `move` overrides, **31 `OPTIONAL` pool items** (vienna 8, dubrovnik 3, split 3, prague 8, budapest 6,
london 3) and **95 `CITY_PLACES`** (vienna 15, dubrovnik 12, split 15, prague 25, budapest 21, london 7).

| Legacy | Core | Notes |
|---|---|---|
| `CONTENT_VERSION` | — | dropped; `Trip.revision` replaces it |
| `CITY_META[k]` | `City{key,name,meta.*}` | `centre` from `cityStops[]` in the overview map; `countryCode` added by hand |
| `CITY_ORDER` | `City.order` | |
| `CITY_RANGE` | **derived** via `cityRange()` | The importer MUST assert the derived value matches the hardcoded string for all six cities |
| `MODES`,`COLORS`,`CAT_LABEL` | `packages/tokens` | Presentation. Core keeps only the `TravelMode`/`StopCategory` unions |
| `d.id "08-13"` | `Day.id`/`date` = `"2026-08-13"` | year from `opts.year` |
| `d.dow`, `d.d` | — | derived |
| `d.city` / `d.cities` | `primaryCity` / `cities` | `"transit"` stays legal |
| `d.title`, `d.sub` | `title`, `subtitle` | |
| `d.sugDay:true` | `Day.provenance {source:'system', state:'candidate', confidence:'inferred'}` | |
| `d.flag:true` | `Day.legacyFlag` **and** a `Conflict` `ruleId:'legacy_flag'`, blocker, summary = `d.sub` | The migration's real work: the two hand-set red days become first-class conflicts — Aug 18 and Aug 20 |
| `s.t` | `placement.time`; `"—"` → `null` | |
| `s.n`,`s.cat`,`s.note` | `name`,`category`,`note` | |
| `s.lat/s.lng` | `PlaceLink` | Name-match `CITY_PLACES` first → `{kind:'place'}`, else `{kind:'inline'}`. Every unmatched name reported as a `warn` Issue, never silently inlined |
| `s.cost` + `s.c` | `CostEstimate` | `display` = `s.cost` verbatim; `amounts` parsed from the display. Where `c` disagrees with the display currency (10 stops), keep one `Money` in the **display's** currency, mark the stop `confidence:'inferred'`, emit `cost_basis_mixed`. `"total"` → `per_party`; `"pp"` → `per_person`; default `per_person` |
| `s.badge:"free"` | `flags += 'free'`, cost stays `null` | Deliberately **not** synthesised into `Money{0,0}` — `dayCost` ignores badge-only stops and golden parity requires identical roll-ups |
| `s.cat === 'trip'` | `flags += 'daytrip'` | matches today's badge logic |
| `s.move` | `Stop.arrival` | unchanged — `computeLegs` still reads exactly this, byte-for-byte |
| `s.move.mode` + `s.cat` | `Stop.travelRole` | **new.** No `move` → `transfer`. Non-vehicle mode (`walk`/`metro`/`transit`/`bike`) → `transfer`. Vehicle mode (`flight`/`train`/`bus`/`boat`/`speedboat`/`ferry`) with `cat === 'transit'` → `journey`. Vehicle mode with any other category → `unknown`. Measured on the live file: **21 journey · 81 transfer · 10 unknown.** §2.12 |
| — | `Trip.homeBase` | **new**, hand-supplied via `opts.homeBase` exactly as `countryCode` already is. Europe 2026 passes `{name:'Los Angeles (LAX)', at:{lat:33.9425, lng:-118.4081}}`. §2.13 |
| `s.sug:true` | `{source:'system', state:'candidate', confidence:'inferred'}` | → `displayStatus === 'suggested'` |
| `s.book` | `Ticket{kind:'url'}` when `s.ticket`, else stop-level `links` | |
| `s.ticket:true` + repo path | `Ticket{kind:'bundled', path}` | the two FlixBus PDFs, **referenced by path, never copied** |
| `s.ticket:true` + URL | `verifiedBy:'user'` for the GYG short link (Jacob confirmed by hand; the proxy blocked verification), `verifiedBy:'fetch'` for the three actually checked | Verification provenance is data, per `CLAUDE.md` |
| `OPTIONAL[city].stops[i]` | `Stop` with `placement {kind:'pool', cityKey, hint}` | `addHint` → `hint`; pool titles → `Trip.meta.poolNotes[city]` |
| `CITY_PLACES[city][i]` | `Place` | |
| `LOKRUM_PLACES`/`LOKRUM_LOOP` | **not migrated** | §7 |

**Adjacent, not copied.** Per Jacob's answer on the repo, the Europe 2026 data is *referenced*:

- `tools/extract-legacy.mjs` reads `../europe-2026-itinerary.html` **read-only** at test time and evaluates
  the constant block. No copy of `DAYS` is committed. Committed instead: `fixtures/europe2026.sha256`
  (the source file's hash) and `fixtures/golden/*.json` (expected derived outputs). If the live planner
  changes, the tests fail loudly with "source changed — re-baseline", which is desirable: it keeps Cairn
  honest to the real trip instead of quietly diverging from it.
  *Trap, from `HISTORY.md`:* use `lastIndexOf('<script>')`, not `indexOf` — the first match is the Leaflet CDN tag.
- `docs/BOOKINGS.md` is prose and cannot be parsed reliably, so the 8 transport bookings, 4 lodgings and the
  tour/ticket records are transcribed **once** into `fixtures/europe2026.bookings.json`, each carrying
  `sourceDoc: "docs/BOOKINGS.md"`. A test asserts every `reference` string in that fixture still appears
  verbatim in `docs/BOOKINGS.md` — drift detected without parsing prose. Includes **YZGDTS twice**
  (16 Jul → Aug 18, 04 Aug → Aug 15, the second superseding the first) and IU1TUY/I54C9A as `asserted`.
- Ticket PDFs under `tickets/` are referenced by repo-relative path. Never copied into `cairn/`.

**Known fixture warts, which are features for the tester** — `validateTrip` and `detectConflicts` are
expected to report these on the unmodified fixture, and the expected output is a committed golden file:
mixed cost bases (5 adults on the Danube cruise vs per-person everywhere else), 10 non-EUR display
currencies, two unverifiable booking references, no lodging in Budapest or London, and two legacy-flag days.

---

### 2.12 `Stop.travelRole` — what a stop's time actually means

**The defect.** `arrival` was specified as "the leg *into* this stop" and the legacy `move` field was mapped
straight onto it. But `move` carries two different meanings and always has. On Aug 8, *"Condor DE4345 →
Vienna"* sits at 14:30 with `move:{flight, 80}`: 14:30 is when the aircraft **leaves Frankfurt**, and 80
minutes is **the flight**, not the walk to the gate. On Aug 18, *"Airport Express bus → Václav Havel"* sits
at 05:30 with `move:{bus, 40}`: 05:30 is when the bus **departs** and 40 minutes is **the ride**. Every rule
that reasons about time inherited the ambiguity, and `impossible_transfer` — which compares the journey
against the gap between two *departure* times — was semantically wrong on all 31 vehicle stops and quiet on
25 of them by arithmetic coincidence, with margins as low as one minute. An ordinary time edit manufactured
a blocker.

**The field.**

```ts
/** What `Stop.arrival` describes, and therefore what `placement.time` means. */
type TravelRole =
  | 'transfer'   // arrival = the journey INTO this stop; time = when you arrive. The default.
  | 'journey'    // this stop IS a vehicle run: arrival = the vehicle's own journey,
                 // time = when it DEPARTS, and the coordinate is one endpoint of that run
                 // — the model does not claim to know which end.
  | 'unknown';   // travel information is present and its role could not be established.
```

It is **purely additive and no derive function reads it.** `computeLegs` still consumes `arrival` and
nothing else, so `fixtures/golden/legacy-legs.json` — generated by running the live page's own `legBetween`
in a `node:vm` — keeps parity on all 16 days. This was the first of the two recorded constraints on the fix
and it is satisfied by construction: `travelRole` is read only by conflict rules and by the view layer.

**The derivation is total, and where it cannot be sure it says so.** The recorded second constraint was
that the importer must be able to derive the field. It can, for 102 of 112 stops, on two signals already in
the data — the travel mode and the stop's category. The residue is not fudged into a guess; it becomes
`'unknown'`, and `'unknown'` degrades every rule that reads it. The mapping is in §2.11 and the measured
split is 21 journey / 81 transfer / **10 unknown**, all ten of which are genuinely ambiguous on inspection
(Aug 13's `cat:'trip'` speedboat hops, the Dubrovnik cable-car bus, the Lokrum boat, a bus that is half a
transfer and half a check-in).

**Every rule that consumes it, and how.**

| Consumer | Behaviour by `travelRole` |
|---|---|
| `impossible_transfer` | `'transfer'` → today's arithmetic, unchanged, **blocker**. `'unknown'` → same arithmetic, **warning**, with `detail` saying the model cannot tell whether the time is a departure. `'journey'` → **does not run**: comparing a vehicle's own journey against the gap before it departs is not a statement about anything. |
| `overlap` | A `'journey'` stop occupies `[time, time + arrival.mins)` even when `durationMins` is null — a flight does overlap the thing you scheduled during it. `'transfer'` and `'unknown'` keep the no-guessing rule. |
| `geo_outlier` / `geoCheck` | **Does not read it.** Stated because it is the obvious place to reach for and it turned out to be unnecessary — see §2.13, where the anchor set makes an exemption redundant. Two independent defects, two independent fixes; conflating them is how the first round produced a fix that removed three of six false positives. |
| the day view | Renders it. A `'journey'` stop shows *"departs 14:30 · 1 h 20 · arrives 15:50"*; a `'transfer'` stop shows today's *"20 min by metro"*. `'unknown'` renders with a one-tap control to set it, which is the only new editing affordance this field needs. |

**Measured effect on the reference trip: `impossible_transfer` goes from 4 blockers to 0 blockers and 0
warnings.** All four of Phase 1's hits are artifacts, **including the Aug 18 case that the review, the QA
pass and the note to Jacob all called the one real transfer defect**. It is not: the bus departs 05:30, the
ride is 40 minutes, it reaches PRG at 06:10, and the flight is 07:30. What the model actually has to say
about the hotel-to-bus-stop transfer is nothing, because the data does not describe it — and asserting a
blocker from an absence is the same error as guessing. The tightest remaining margin on any genuine
transfer is **7 minutes** (Aug 14, walking from the Skradin bus stop to the ticket office), which is a real
property of the plan rather than of the display.

**What this buys and what it costs.** It buys a conflicts panel whose blockers are all real. It costs the
one thing the departure model would have *newly* found: on Aug 21, BA863 departs Budapest 12:55 and runs
165 minutes, and the next stop is scheduled 15:15 — which reads like a missed connection and is not, because
the flight crosses from CEST to BST and core stores wall-clock with no timezone (§7). A `journey_overrun`
rule is therefore specified and **deferred to Phase 4**, where timezones are resolved. Shipping
time-difference arithmetic on a model that cannot represent a time zone is the `closed`-rule mistake with a
longer fuse.

---

### 2.13 Geography — one mechanism, one consumer

**The defect.** Two implementations of the same idea, both anchored on `day.primaryCity`, both wrong in the
same way and neither able to catch the bug they exist for. `geo_outlier` produced 6 blockers on the
reference trip and all 6 were legitimate stops; `validateTrip.stop_far_from_city` produced 20 of the 31
validation issues with 13 in the same false-positive class. Meanwhile the historical Fisherman's Bastion
typo — one digit of latitude, 111 km north, nothing visibly broken — was reproduced exactly (`place-68`,
`47.5025 → 48.5025`) and **neither check moved: 27 conflicts before and after, 31 issues before and after.**
`geo_outlier` examined 31 of 238 coordinate-bearing records, skipping the 81 stops with an `arrival`, all 31
pool stops and all 95 places, which is the record class the real bug lived in.

**The single mechanism.** One pure function, `packages/core/src/derive/geoCheck.ts`, is the only place in
the system that measures a distance from a coordinate to an anchor. `geo_outlier` is its only consumer;
`stop_far_from_city` is deleted (§2.9).

```ts
geoCheck(trip: Trip): GeoFinding[]

type GeoAnchor =
  | { kind: 'city';      cityKey: CityKey }   // a centre the record's own day or filing claims
  | { kind: 'home_base' }                     // Trip.homeBase
  | { kind: 'same_day';  stopId: StopId }     // another stop on the same day
  | { kind: 'adjacent_day'; stopId: StopId }  // the last coordinate of D-1, the first of D+1
  | { kind: 'city_stop'; stopId: StopId };    // for a Place: a stop on one of that city's days

type GeoFinding = {
  ref: Ref;                       // { kind:'stop'|'place', id }
  km: number;                     // distance to the NEAREST anchor, rounded
  limitKm: number;                // GEO_LIMIT_KM — 35
  nearest: GeoAnchor | null;      // null when the record has no anchor at all
  confidence: 'certain' | 'unanchored';
};
```

`'unanchored'` carries **two** cases and a consumer tells them apart by `nearest` (revision 5): `nearest ===
null` is *"this trip offered the record no anchor"*; `nearest !== null` is *"anchors exist and this record is
deliberately not measured against them"* — the copied-record row below. Both mean the same thing to
`geo_outlier`, which publishes neither. There is no third `confidence` value, because a consumer that wants
the distinction already has it in a field it must read anyway.

**The principle, stated once:** *every coordinate is measured to the nearest point in the trip's own
declared geography, and a coordinate far from everything the trip knows about is a coordinate to look at.*
Not "far from its city" — a day trip is supposed to be far from its city, and a flight lands wherever it
lands.

The anchor set, by record class. The limit is a flat **35 km** everywhere — the constant is `GEO_LIMIT_KM`
and it is on §2.10's surface, so the number in this paragraph and the number in the code cannot disagree
quietly. There is no second radius, no `daytrip` exemption constant and no travel-mode exemption.

| Record | Anchors |
|---|---|
| **Scheduled stop** on day `D` | centres of every city in `D.cities` · `Trip.homeBase` · every *other* coordinate-bearing stop on `D` · the last coordinate-bearing stop of `D−1` · the first of `D+1` |
| **Pool stop** filed under city `c` | centre of `c` · every coordinate-bearing scheduled stop on a day whose `cities` include `c` |
| **Place** filed under city `c` | the same set, minus any stop that resolves its `PlaceLink` **through this place** (or the record would anchor itself) |
| **Any stop with `attribution(stop) !== null`** — a record `copyStopInto` produced (revision 5) | **none.** `confidence: 'unanchored'`, always. `km` and `nearest` are still measured against the row above so a view can say how far it is, but `geo_outlier` never publishes it |
| **Any *copy-borne* `Place`** — at least one stop in this trip resolves its coordinate through it, and **every** such stop has `attribution(stop) !== null` (revision 6) | **the same as the Place row above, and the same treatment as the copied-stop row**: measured, `km` and `nearest` still computed, `confidence: 'unanchored'`, never published |
| any record with no resolvable coordinate | not checked — `place_ref_dangling` and the `PlaceLink {kind:'none'}` path already cover it |

`geo_outlier` publishes `confidence:'certain'` findings as blockers. `'unanchored'` is not published as a
conflict at all in Phase 1 — neither the empty-trip case nor the copied-record case.

#### The copied-record row, and why it anchors on nothing (revision 5, QA R2-9)

Copying *"Arrive LAX"* out of the reference trip into a Lisbon-based trip produced `geo_outlier: dstop-1,
9140 km, certain` — **a blocker, on the phase's newest primitive, seconds after a human deliberately asked
for exactly that record to be there.** §0.5 governs and settles it: a rule that cannot distinguish *"the data
says something impossible"* from *"the data is shaped oddly by design"* degrades to a warning rather than
asserting a defect. A stop copied from another trip being far from this trip's geography is not odd, it is
**the point of the feature**, and ROADMAP C's promise that a third blocker appears only when somebody writes
down why Jacob must act on it cannot survive a primitive that mints blockers by being used.

**The choice, stated as a choice.** The alternative was to give the copied record an anchor inherited from
its origin trip. Rejected, on three counts, in order of how decisive they are:

1. **It is not computable.** `geoCheck(trip: Trip)` is a pure function of *one document*. The origin trip is
   not in it; `provenance.origin` holds ids, not coordinates. Inheriting an anchor means persisting the
   origin's geography inside the copy — new cross-document state, copied without the user asking, going stale
   from the moment it is written, and directly against §0.6.
2. **It would check the wrong claim.** The anchor set means *"the trip's own declared geography"*. A copied
   stop makes no claim about the destination trip's geography until the user accepts it; measuring it against
   the origin's geography would only re-run, against a snapshot, a check that already ran against the live
   document in the trip the record came from.
3. **The detection it appears to buy is already spent.** A copy is byte-identical in position to a record
   that `geoCheck` already examined in its own trip, where the anchors are meaningful. Copying does not
   create a new opportunity to catch a coordinate typo; it creates a new opportunity to *false-positive* on
   one that was already cleared.

**Symmetrically, and this half matters more than it looks: a copied stop is not an anchor for other records
while `provenance.state !== 'accepted'`.** An anchor asserts *"the trip's geography includes this point"*,
and an un-accepted candidate is by construction not yet part of the user's plan (§2.14). Letting one into the
anchor set would let a stop the user has not accepted **suppress a real blocker** on a stop they wrote
themselves. Once `acceptCandidate` runs, it joins the anchor set like any other stop — and note the direction
that moves in: acceptance can only ever *add* anchors, so it can only ever *remove* a blocker, never create
one. A transition that can mint a blocker is exactly what this ruling exists to stop.

#### A-6 — the copied `Place`, and why revision 5's paragraph here is withdrawn (revision 6, QA R8-2)

**Revision 5 said Places needed no row of their own. That paragraph is wrong and is withdrawn.** Its
argument was a disjunction: a place `copyStopInto` rule 4 drags in is filed either under a city the
destination trip *does* have — meaningful anchors, the check should run — or under a `cityKey` that trip has
never heard of, *"in which case the existing Place row already yields no anchor, `nearest === null`, and
`'unanchored'`"*. **The second disjunct is false, and it is falsified by this section's own new field.**
`homeBase` is appended to every anchor list unconditionally, so any trip with a `homeBase` — the reference
trip has one, LAX — offers the unrecognised place exactly one anchor, thousands of kilometres away.
`nearest !== null`, `km > 35`, `confidence: 'certain'`, and QA measured the result: **one Browse-and-copy
click puts a third `geo_outlier` blocker on the reference trip**, naming a record the user never typed a
coordinate into and never accepted (`qa/r8-geo.mjs` §1).

**(a) A-1's principle extends to the place. Yes, and for A-1's own three reasons, unchanged.** A place that
is in this trip *only* because a stop copy brought it is not a claim the user has made about this trip's
geography; measuring it against the destination's anchors checks the wrong claim; and the coordinate was
already measured, against meaningful anchors, in the trip it came from — copying creates no new opportunity
to catch a typo, only a new opportunity to false-positive on one already cleared. Above all, §0.5 governs
here exactly as it governed the stop: *the copy path may not mint blockers by being used*, and ROADMAP C's
promise that a third blocker appears only when somebody writes down why Jacob must act on it cannot survive
a primitive that mints one per click.

**(b) The implementation rule, exactly — and `Place`'s shape does not change.** The two candidate mechanisms
were provenance on `Place` and derivation at evaluation time. **Derivation wins, decisively**, and adding
`Place.provenance` is refused:

- Rule 4 **reuses** an equivalent existing place in the target when `samePlace` matches, so a "copied" place
  can be byte-identical to, and literally the same row as, one the user entered. A `provenance` field would
  have to answer what the reuse branch stamps, and any answer is a judgment call handed to a builder.
- It is new persisted state, in `toJSON`/`fromJSON` round-trip parity, `migrateDoc`, the §6.3 cascade and
  `validateTrip`'s provenance rules (`origin_stripped`, `accepted_by_non_member`) — bought to express a fact
  the document already contains.
- §2.2's *"a Place is a description of the world, not a claim about the user"* is still right. That is why
  it has no provenance, and this ruling does not disturb it.

So, the rule a builder implements with no interpretation, in `geoCheck.ts`'s `---- places ----` loop:

```ts
// Built once, before the loop, over trip.days.flatMap(d => d.stops) then trip.pool, in
// document order: placeId -> the stops whose PlaceLink names it.
//
// A Place is COPY-BORNE iff it has at least one such stop AND every one of them is isCopied().
const linking = linkedBy.get(p.id) ?? [];
const copyBorne = linking.length > 0 && linking.every(isCopied);
const f = finding({ kind: 'place', id: p.id }, p.at, anchors, copyBorne ? 'unanchored' : 'certain');
```

Four clauses, each load-bearing, each stated so nobody has to infer it:

1. **`linking.length > 0`.** A place with *no* stop pointing at it is a place the user keeps for its own
   sake, or an orphan. It is measured at `'certain'` exactly as today; this rule does not touch it.
2. **`every`, not `some`.** If even one stop the user wrote themselves resolves through this place, the
   user's own plan rests on that coordinate, and a blocker on it is indistinguishable from — and is — the
   Fisherman's Bastion case. The exemption is *"the only reason this record is here is a copy"*, and `every`
   is the only reading of that sentence.
3. **`isCopied`, i.e. `attribution(stop) !== null` — and NOT `provenance.state`.** This is what makes the
   ruling monotone across acceptance, which is the half R8-2's sibling finding proves is not optional. See
   the next paragraph.
4. **`anchors` is computed unchanged**, including the existing self-exclusion of stops that resolve through
   this place, so `km` and `nearest` are still real. §2.13's *"measure it and decline to publish"* applies
   verbatim: an implementation that `continue`s past the record has implemented "skip", loses the distance,
   and is wrong.

**What happens when the copied stop is accepted: nothing, deliberately, and that is the whole point.**
Because the clause keys on `attribution()` and not on `provenance.state`, accepting the copied stop does not
make its place `'certain'`. Had it keyed on state, `acceptCandidate` would flip the place from exempt to
measured and **mint a blocker at the moment of acceptance** — precisely the transition A-1 exists to forbid
(*"acceptance can only ever add anchors, so it can only ever remove a blocker, never create one"*), and
precisely the failure mode §0.5 rates as worse than a named blind spot. Acceptance stays monotone in the
only direction it moves: the accepted stop joins `anchorable` (`anchorsOthers` already keys on state), so the
place's coordinate starts serving as a `same_day`/`adjacent_day`/`city_stop` anchor for *other* records —
**anchors are added, and a blocker can therefore only disappear.** No code change is needed on the anchor
side at all: `Place` is not an anchor kind, a place's coordinate enters the anchor set only through a stop
that resolves via it, and that stop's eligibility is already governed by `anchorsOthers`.

**What ends the exemption is a user act, and it is the right one:** the moment the user creates a stop of
their own linking to that place, `every(isCopied)` is false, the place is measured at `'certain'`, and a
genuine outlier is reported — because that is the moment the coordinate becomes a claim about the user's own
plan. Until then it is a record they have been told came from somewhere else.

**The cost, stated rather than discovered later:** a coordinate typo that was already in the *source* trip's
place travels with the copy and is not re-reported here. That is A-1's third rejection reason applied
unchanged — the record was already measured where the anchors meant something — and it joins the numbered
limitations list below rather than being left implicit.

**Limitation 3 in the list below**: a
coordinate typed *into* a copied stop after it was copied is invisible to this rule, because the row keys on
`attribution(stop) !== null` and not on `provenance.state`. That is deliberate. Keying on state would make
the same document produce different conflicts either side of a provenance transition — accepting a stop could
*create* a blocker, with nobody writing down why — and §0.5 rates a rule that mints unexplained blockers as
worse than a rule with a named blind spot. The blind spot is one field on records the user has already been
told came from somewhere else.

**Measured, on the live planner, before specifying it.** Each element of the anchor set is load-bearing and
was kept only because removing it reintroduced a specific false positive:

| Anchor removed | False positives it lets back in |
|---|---|
| same-day stops + adjacent-day boundary | Frankfurt (FRA) connect, 603 km from Vienna on a Vienna day; and the three Krka stops, 48–54 km from Split |
| `Trip.homeBase` | Arrive LAX, 9,321 km from anything else in the trip |
| the *other*-stop exclusion on places | nothing — but without it a typo'd Place anchors itself and the check is vacuous |

And the results that decide whether it ships:

```
clean reference trip      scheduled stops   0 findings / 112      places   0 findings / 94
+1° latitude injected     scheduled stops   112 caught / 112      places   92 caught / 94
```

Compare the rule being replaced: 6 false blockers, 31 of 238 coordinate-bearing records examined, and **0 of
the 95 places** — the record class the real bug lived in — looked at at all.
**The Fisherman's Bastion typo is caught: 109.5 km from its nearest anchor, one blocker, naming `place-68`.**

Four honest limitations, written down rather than discovered later (1 and 2 are measurement misses; 3 and 4
are the stated cost of the two copy-path rows):

1. **The two misses are `Blue Cave, Biševo` and `Stiniva Cove, Vis`.** Both are Split-filed island places
   ~55–64 km out; displaced 1° north they land within 35 km of the Aug 14 Krka day-trip stops, which are
   legitimate anchors for a Split place. Naming them is cheaper than adding machinery for two records.
2. **A whole day of wrong coordinates is invisible**, because the day's stops anchor each other. The bug
   class this exists for — one digit, one record, `HISTORY.md` and `CLAUDE.md` both — is a single outlier.
   A bulk error is a different problem and it is not this rule's job to pretend otherwise.
3. A coordinate edited into a copied stop after the copy — the copied-record row above.
4. A coordinate typo already present in a *copy-borne* `Place` in its source trip — A-6 above. Same reason
   as 3, on the record class rule 4 drags across.

**None of the numbers above move under revision 5 or revision 6.** The reference trip contains no record with
`attribution(r) !== null`, so no place in it can satisfy A-6's `every(isCopied)` either: the clean run is
still 0/112 and 0/94, the +1° detection rate is still 112/112 and 92/94, and the Fisherman's Bastion blocker
is untouched. Both rows change what happens to records the *copy path* creates and nothing else — which is
why they are rows and not a rewrite. **The builder re-derives all four numbers rather than quoting them**;
ROADMAP C states them as the ceiling.

#### A-6a — the copy that brought a `Place` takes it away again (revision 7 addendum, QA R9-2)

**The defect.** `copyStopInto` rule 4 adds a `Place` row to the destination trip; `removeStop` removes the
stop and **not** the place (confirmed in `build/stops.ts` — `removeStop` never touches `trip.places`, and
`Stop.place` is the only referent a `Place` has anywhere in the model). One `×` after a copy, the place has
zero linking stops, A-6 clause 1 measures it at `'certain'`, and the reference trip carries a third
`geo_outlier` **blocker** naming `place-copy-1` — a record the user never authored and has just thrown away.

**Clause 1 is not the thing to change, and this is a measurement, not a preference.** On the reference trip,
**60 of the 94 coordinate-bearing places have no linking stop at all** — the importer creates places for named
things whether or not a stop resolves through them. Under the per-record +1° injection, 92 of 94 places are
caught and **60 of those 92 are orphans**. `place-68`, *Fisherman's Bastion* — the single historical bug this
entire section exists to catch — **is an orphan**. So every variant of *"an orphan is exempt"* or *"an orphan
degrades to a warning"* costs this rule roughly two thirds of its detection surface and the one blocker
ROADMAP C names by id. Refused on the number.

For the same reason, QA's option (a) is refused twice over: it is also not computable. A place with zero
linking stops carries no evidence of how it arrived — that is what "orphan" means — and A-6's refusal of
`Place.provenance` stands unchanged (the `samePlace` reuse branch has no honest value to stamp, and it is new
persisted state in `toJSON`/`fromJSON`, `migrateDoc`, the §6.3 cascade and `validateTrip`). Nothing about
`Place`'s shape moves in this ruling either. *(The other alternative — having rule 4 inline the coordinate
instead of copying a `Place` — would make the orphan impossible but would withdraw A-6 entirely and drop the
place's name, city and address on every copy; refused as a larger change than the defect.)*

**The ruling: the orphan is not created in the first place.** The `Place` entered the document as a side
effect of a copy, to support the copied stop; when that support is removed and nothing else refers to it, it
goes with it. This is the *action's* responsibility, exactly as QA's option (b) frames it, scoped so narrowly
that it cannot reach a record the user is keeping for its own sake:

> **`removeStop(trip, stopId)` deletes exactly one `Place`, and only when all four of these hold:**
> 1. the removed stop's link is `{ kind: 'place', placeId: P }`;
> 2. the removed stop is a copy — `attribution(stop.provenance) !== null`, the same predicate A-6 clause 3
>    uses and `geoCheck`'s `isCopied` is defined as;
> 3. **after** the removal, no stop anywhere in the trip (`days[].stops` ∪ `pool`) has
>    `place.kind === 'place' && place.placeId === P`;
> 4. `trip.places` contains a row with id `P`.
>
> The returned trip is then the same trip with that one row filtered out of `places`, and `revision` bumped
> **once** for the whole operation. If any clause fails, `removeStop` behaves exactly as it does today.

Four things that are load-bearing and must be stated so nobody infers them:

1. **It prunes the removed stop's own place and nothing else. It is never a sweep.** A garbage collector over
   `trip.places` would delete all 60 of the reference trip's orphans, `place-68` among them, and silently
   remove the Fisherman's Bastion detection. At most one row leaves per call.
2. **Clause 2 means removing a stop the *user* wrote never prunes anything.** Every existing path keeps its
   current behaviour; the fixture contains no record with `attribution() !== null`, so §2.13's four numbers
   are provably unmoved (0/112 and 0/94 clean, 112/112 and 92/94 under +1°, and the Fisherman's Bastion
   blocker still fires).
3. **There is no window in which the orphan is measured.** With two copied stops on one place, removing the
   first leaves `linking.length === 1` and A-6's exemption intact; removing the second prunes. `geoCheck` is
   never handed a zero-link copy-borne place, which is the state it has no evidence about.
4. **The prune lives inside `core.removeStop`, not in the reducer or a second action.** §4.2 rule 1 —
   one action, one core function, no domain logic in the reducer — so `packages/client` changes not at all,
   and undo keeps working for free: history is a `Trip` snapshot, so Ctrl+Z restores stop and place together.

**The cost, named rather than discovered later.** Because rule 4 *reuses* an equivalent existing place when
`samePlace` matches, the pruned row can be one the user originally typed — in the one sequence where they had
already deleted their own last stop linking it, leaving a copy as its only referent. That row is deleted. It
is acceptable in Phase 1 and the reasons are checkable rather than aesthetic: at that moment the place is
unreachable from every view (nothing in `apps/web` renders a place except through a stop), A-6 already
classifies it as a record whose only reason to be here is a copy, undo restores it, and it is a description of
the world, cheap to re-enter. **The trigger to revisit is explicit:** the moment `Place` gains a life of its
own — a saved-places library, place-level notes or photos, or any second referent kind — clause 2's prune must
become a reference-counted delete with a user-visible affordance, and this paragraph is the thing to reread.

**What the builder asserts:**

1. Browse → copy a place-linked stop → `×`. `detectConflicts` returns **2** blockers on the reference trip,
   not 3, and `trip.places.length` is back to what it was before the copy.
2. The user's own stop, own place, `×` → the place is **still there** and is still measured (inject +1° into
   it and get exactly one `geo_outlier` naming it). This is the guard against the sweep.
3. Two copied stops on one place: after the first `×` the place survives and is `'unanchored'`; after the
   second it is gone.
4. Ctrl+Z after the `×` restores both the stop and the place, and `geoCheck` reports the place
   `'unanchored'` again.
5. `rejectCandidate` on a copied stop prunes nothing — the stop stays in the document, so clause 3 fails.

`Trip.homeBase` is the one new field the mechanism needs. It is real modelling, not a patch: a trip starts
and ends somewhere, and the Europe trip starts and ends at LAX. It is nullable, the importer takes it from
`opts` exactly as it already takes `countryCode`, and Phase 2's new-trip form asks for it.

---

### 2.14 Import, and the copy that is actually how sharing works

Jacob's answer of 2026-08-25, in his words: *"They wouldn't import their trip — they would build it on this
app. This is a space for them to create their own itinerary — they could even look at mine and just add a
certain activity."* That reweights the model. Whole-trip transfer is not the primitive; **one stop is.**

#### `importDoc` is backup and restore of your own exports

Contract, enforced in `packages/client` and stated in the UI:

1. **A document owned by someone else is refused.** If `doc.ownerId` is present and is neither the local
   user (`LOCAL_OWNER` in Phase 1, the signed-in user id from Phase 2) nor absent, `importDoc` rejects with
   `ForeignDocumentError { ownerId }`. The Library surfaces it as *"This trip belongs to someone else — open
   it from their share instead."* It does **not** adopt ownership, and it does not silently badge 112 rows
   and call that sharing.
2. **An import never overwrites a stored trip.** The check is against `await ports.storage.load(doc.id)`,
   not a boot-time in-memory snapshot. When the id already exists the user is asked, with **"restore as a
   copy"** as the default: a fresh id from `IdPort`, the stored trip untouched. "Replace" is available and
   is a deliberate act.
3. Round-trip parity is unchanged: `toJSON(fromJSON(toJSON(trip)))` stays byte-identical, and export is
   still the whole document.

The Library labels the control **"Restore from a backup"**. It is not called "Import".

#### `copyStopInto` is the social primitive

```ts
copyStopInto(
  target: Trip,
  source: { trip: Trip; stopId: StopId },
  placement: StopPlacement,
  ctx: { ids: IdFactory; today: IsoDate; actorUserId: UserId }
): Trip
```

Pure, in core, and it ships in Phase 1. Seven rules, and rules 2 and 7 are the ones the tester should aim at.
**`placement` is an argument about the *target*, not a record that crosses — A-19 (revision 14) says what
`copyStopInto` does with a `{kind:'pool'}` one, and it is validated rather than re-filed.**

1. **A new id, always.** Ids never cross trips; `ctx.ids` mints one. The source's `id` is not preserved
   anywhere except inside `origin`.
2. **`provenance` is overwritten, never copied.** There is no code path that carries a source stop's
   provenance across a trip boundary.
   ```ts
   { source: 'friend', state: 'candidate',
     confidence: min(source.confidence, 'asserted'),   // you do not hold their document
     origin: { friendUserId: source.trip.ownerId,
               sourceTripId: source.trip.id, sourceStopId: source.stopId },
     addedAt: ctx.today, acceptedAt: null, actorUserId: ctx.actorUserId }
   ```
   `displayStatus()` therefore returns `'imported'` from the instant the stop exists. There is no window in
   which it is unbadged.
3. **`bookingId` is dropped and no `Ticket` travels.** A friend's booking reference is not yours, and their
   ticket URL is an access credential (§6.6). ~~`cost` is copied~~, with `confidence` demoted to
   `'inferred'`. **Amended by A-18 (revision 14, QA R15-3): `cost` crosses through `costForCopy`, not by
   spread** — the money (`amounts`) is a description of the world and crosses field by field, `cost.note` is
   free text and is redacted, and `cost.display` is a text box the user types into, so it crosses only when
   `redactText` leaves it byte-identical and is `null` otherwise.
4. **A referenced `Place` is copied with it**, new id, same provenance stamp — otherwise the link dangles.
   An existing place in the target with the same name and coordinates in the same city is reused instead.
   **Amended three times and never read on its own: A-14** (the `cityKey` is re-filed in the target's terms
   or the place does not travel), **A-15** (what of the place may cross — `note` redacted, `links` dropped,
   `at` cloned) and **A-16** (when the source *is* the target document, its own key is already the answer).
   "Same provenance stamp" was never true and is withdrawn: A-6 refused provenance on `Place`, which is
   precisely why A-15's redaction is not optional — nothing badges a `Place`.
5. `flags`, `name`, `note`, `category`, `durationMins`, ~~`arrival`~~, `travelRole` and `links` copy verbatim
   (`note` through `redactText` — BUILD-NOTES KD-20). They are descriptions of a place and a journey, not
   claims about the user. **`ticket` is not on this list and never joins it** — see rule 3.
   **Amended by A-18 (revision 14, QA R15-3): `arrival` leaves this list.** It is a record, not a string, and
   `arrival.label` is free text — it crosses through `arrivalForCopy`, `mode` and `mins` verbatim and `label`
   redacted. `links` still copy (A-15's disclosed residue, same trigger) but are **rebuilt field by field**,
   because A-18 position 2 admits no spread of a source record at any depth. `flags` and `name` stay
   verbatim, and A-18 gives each of them a measured reason rather than an assertion.
6. **Accepting is a separate, explicit act.** `acceptCandidate` sets `state:'accepted'` and `acceptedAt`,
   which by §2.8 makes `displayStatus()` return `'own'` — that is the brief's rule, *"marked as such **until
   the user accepts it**"*. But it **preserves `origin`**, and preserving it is not optional:
   `validateTrip` emits the `error` `origin_stripped` for any `source:'friend'` record with no
   `origin.sourceTripId`.
7. **Credit survives acceptance, and the views must show it.** `displayStatus` governs the *badge*; a new
   export, `attribution(x): { friendUserId, sourceTripId, sourceStopId } | null`, governs the *credit line*.
   The contract: **any view that renders a record with a non-null `attribution` renders the credit.** This
   is the mechanical form of `CLAUDE.md`'s oldest rule — *never present my suggestions as Jacob's plan* —
   applied to the path where it will actually be exercised.

**The invariant to attack, restated in revision 4 after QA R2-11 falsified it in one call:** for every
record `r` with `attribution(r) !== null`, `displayStatus(r) !== 'own'` unless `r.provenance.state ===
'accepted'` **and** `r.provenance.acceptedAt !== null` **and** `r.provenance.actorUserId ∈ members(trip)` —
and `attribution(r)` is *still* non-null afterwards.

`members(trip)` rather than `=== trip.ownerId`: a co-owner or editor accepting is legitimate the moment
`TripMember` exists, so the narrow clause would have been wrong in Phase 2 anyway. In Phase 1 it degenerates
to `{trip.ownerId}` and the two readings coincide.

**Where it is enforced, because "stated as an invariant and enforced nowhere" is what R2-11 found.**
`displayStatus` is a pure function of one `Provenance`; it does not receive the trip and structurally
*cannot* check membership, and it is not going to start — a badge function that needs the whole document is
a badge function that gets called with the wrong document. The invariant is a claim about which documents may
exist, so it is enforced at the two places documents come from:

1. **`acceptCandidate`, `rejectCandidate` and `copyStopInto` throw on a missing actor.** `actorUserId` stops
   being `UserId | null` and becomes `UserId`; `null`, `undefined` or `''` throws, as programmer error, per
   §2.1. An acceptance is a record of *who took this on*; one with no accepter is unfalsifiable forever
   after, and §6.2's "ownership traceable on every row" is on the brief's short list of things that are
   public-grade from day one because they are expensive to retrofit. The Phase 1 client already always
   passes `LOCAL_OWNER`, so this costs nothing today and closes the door before a second user exists to walk
   through it. `copyStopInto`'s `ctx.actorUserId` is already non-nullable in the type and unchecked at
   runtime — the same gap §2.1 already decided in favour of the runtime check for `updateStop`.
2. **A wrong (non-member) actor is `validateTrip`'s `accepted_by_non_member`**, §2.9 — an error on the
   document, not a throw at the call, because that shape arrives from outside.

**Explicitly out of scope in Phase 1, named rather than left silent:** `source:'user'` records built by
`addDay`/`addStop` carry `actorUserId: null` today (`userProvenance(at)` defaults it), and they stay legal.
They assert no acceptance of anyone *else's* content, so nothing is being presented as the user's own that
was not; `attribution()` on them is `null`, which puts them outside the invariant's subject. When accounts
arrive in Phase 2, `BuildCtx.actorUserId` becomes required, `userProvenance`'s default parameter is removed,
and every constructor threads it. That is a deferral with a boundary and a trigger, not an omission.

#### A-14 — a `CityKey` is trip-relative filing, so it may not cross a trip boundary (revision 12, QA R13-6)

**The defect.** Rule 4 copies the referenced `Place` with `{ ...original, id: newId('place') }`, which
carries the **source trip's** `cityKey` into the target document. Under A-10 a `CityKey` is minted per trip,
so between two independently created trips the keys **can never coincide** — and every cross-trip copy of a
place-linked stop now leaves the recipient's document reporting `unknown_city_key`, an **error**, which no
control in the UI can clear. Under the pre-A-10 slug two trips to Vienna both said `vienna` and the copy was
clean; QA carries that as a control, so this is a regression and not a pre-existing hole. **A-10's *"what
this changes elsewhere — the complete list"* table does not mention `copyStopInto` at all**, and its closing
row says *"Nothing else."* That row is wrong, and this addendum is the correction.

Two consequences follow from the same line and only one of them was filed:

- The copied place is filed under a city the target does not have. `validateTrip` says so (error); the web
  Places panel headings fall back to `?? key` and print the **raw opaque id** as a section title; and the
  place gets no city anchor in `geoCheck` (harmless today only because A-6 exempts a copy-borne place, and
  that exemption ends the moment the user links a stop of their own to it).
- **Rule 4's reuse branch stops working across trips entirely.** `samePlace` compares `cityKey` first, so
  after A-10 no place in the target can ever match a place from another trip, and every copy duplicates a
  row the target may already have. Nobody filed this because it is silent. It is the same defect.

**The position, and it is the same shape as A-9's and A-10's.** *A `CityKey` answers "which city **of this
trip** is this filed under". It is not a property of the place.* §2.2 already says a `Place` is a description
of the world rather than a claim about the user; its `cityKey` is not part of that description — it is this
document's filing system, minted by and meaningful only inside one trip. So the filing does not travel with
the record: **when a place crosses a trip boundary it is re-filed in the target's terms, or it does not
cross.**

**The rule, as a three-step decision with nothing left to the builder's judgment.** In `copyStopInto`, rule 4
only, after `original` is resolved and before any reuse search:

> 1. **Find the source's city.** Look up `source.trip.cities` for `c.key === original.cityKey`. If there is
>    no such city, or its `name` normalises to the empty string, there is no name to match on → step 3.
> 2. **Re-file by normalised name (A-10's cross-trip city identity, applied unchanged).** Find every city in
>    `target.cities` whose `normalizeCityName(name)` equals the source city's. If one or more match, the
>    copied place's `cityKey` is the matching city's key — **lowest `order` first, then the earliest in
>    `target.cities`**, so the result is deterministic when a trip legitimately holds two cities of the same
>    name (A-10 blesses that). Then run rule 4's existing reuse search with the **re-filed** key
>    (`samePlace(p, { ...original, cityKey: targetKey })`) and either reuse the match or push
>    `{ ...original, id: ctx.ids.newId('place'), cityKey: targetKey }`.
> 3. **Otherwise the place does not travel.** The stop keeps the coordinate instead: `place =
>    { kind: 'inline', at: original.at }` when `original.at !== null`, and `place = { kind: 'none' }` when it
>    is null. **No `Place` row is added to the target**, and the target's `cities` are not touched.

`normalizeCityName` is A-10's function, `name.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()`,
and it now lands earlier than §8.4 wanted it. It lives **once**, in `packages/core/src/model/cityName.ts` —
the lowest layer, so `build/` and `derive/` both import the same one — and it is **not** on `index.ts`, so
§2.10 stays at **71** runtime symbols. §8.4's `travelStats` (`ROADMAP` I-7) consumes that module rather than
writing a second copy; a second copy of this function is the drift A-10's own table exists to stop.

**One thing A-10 marked unverified stops being display-only here, so it is handled rather than inherited.**
A-10 noted that `String.prototype.normalize` is ES2015 and present in Node and every browser, but that
**whether Hermes ships it is unverified** — and said that mattered little because the function only grouped
rows for display. It now decides what a copy does. I could not resolve the Hermes question from its own
documentation (`doc/Strings.md` is about bytecode string storage and does not mention the method; the
public evidence is a years-old ethers.js report against React Native), so it stays **unverified and is a
Phase 5 check**, and `normalizeCityName` is written so the answer cannot break anything:

```ts
const nfc = (s: string) => (typeof s.normalize === 'function' ? s.normalize('NFC') : s);
```

On a runtime without it, two spellings that differ only in composition form stop matching, so the copy takes
step 3 and the place does not travel — the same hole, never a throw and never a wrong filing. Three tokens
of defence in the lowest layer, and the alternative (a polyfill) is a dependency, which is Jacob's decision
and not ours (§1).

**Why step 3 is a hole and not a guess, which is the whole argument.** The available alternatives all write
a city onto the place:

- *File it under the placement's city* — the target day's `primaryCity`, or the pool key. It is always
  available and always plausible, and that is the problem: copying *Blue Cave, Biševo* onto a Prague day
  would record, in the document, that Blue Cave is a Prague place. `Place` has no provenance (A-6 refused it,
  and that refusal stands), so nothing marks that filing as inherited or guessed, and it outlives the badge
  on the stop. A-10 refused a transliteration table on exactly this ground — *"a table produces a confident
  wrong answer, which is worse than a hole"* — and `CLAUDE.md`'s oldest rule says the same thing: flag it,
  do not resolve it by guessing.
- *Mint the source's city into the target.* Copying **one candidate stop** would add a city to the user's
  trip — a city they have not accepted, which then appears in the city tabs, in `orderedCities`, in
  `TripSummaryRow`, on the lifetime map and in *"countries visited"*. §0.7 says every statistic is derived
  from the trips it summarises; inflating one by clicking *copy* is the failure that principle exists to
  prevent, and *"never present a suggestion as the user's own plan"* is the same refusal in the brief's
  words.
- *A sentinel — `UNFILED_CITY_KEY`, on `TRANSIT_CITY_KEY`'s precedent.* Honest, and it costs a new constant,
  an exemption in `validateTrip`, a label in every surface that groups by city, and a second reserved value
  for `reserved_city_key` to defend. It buys a `Place` row nobody asked for in a trip that has no city for
  it.

**And an inline coordinate is not a degraded citizen here — it is the majority shape.**
`import/legacyDays.ts` produces `{kind:'inline'}` for most of the reference trip's stops, `derive/geo.ts`'s
`coordOf` resolves it, `StopEditor` edits it, and `fromJSON` parses it. The stop still renders, still pins on
the map, and §2.13's copied-stop row already gives it `confidence: 'unanchored'`, so it mints no blocker.

**The named loss, stated rather than discovered.** (**A-15 narrows what step 2 carries too**: the place's
`links` never travel, on either step, and its `note` crosses redacted.) In step 3 the *place-level* `note`,
`links`, `hours` and `category` do not travel; the stop's own `name`, `note` (through `redactText`), `category`, `links`, `cost`,
`arrival`, `durationMins`, `travelRole` and `flags` all still do, per rule 5. What is lost is a curated
record about a city the target trip does not have — and the user can create that city and re-copy, which is
the act that makes the filing true.

**What does not change.** Rules 1, 2, 3, 5, 6 and 7 are untouched; `Place`'s shape is untouched; no
`schemaVersion` bump, no migration, no persisted shape and no new export. `A-6`/`A-6a` (the copy-borne place
exemption and `removeStop`'s prune) apply unchanged to the step-2 case and simply have less to do in the
step-3 case, which adds no place. ~~**Copying within one trip is unchanged**: the source city is found by
key, its own name matches itself, the key comes back identical, and the reuse search matches the original
place exactly as today.~~ **That sentence is false and is withdrawn — see A-16 (revision 13, QA R14-2).**
It holds only for a trip whose city names are distinct and non-blank; `refileCityKey` re-files by name even
when the source *is* the target, so a trip holding two cities of the same name gets a duplicate place row
under the wrong one. A-16 is the correction and everything else in A-14 stands.

**What the builder asserts:**

1. QA §10 verbatim: two independently created *Vienna* trips, a place-linked stop copied from one into the
   other → **zero `unknown_city_key` issues**, the copied place carries the **target's** Vienna key, and the
   pre-A-10 slug control still passes.
2. **Reuse across trips is restored**: when the target already holds the same place (same normalised name,
   same coordinates, matching city by name), the copy **reuses** it — `target.places.length` is unmoved.
3. **The no-match case**: copying a Croatian place-linked stop into a Prague-only trip adds **no** place row,
   leaves the stop with a resolvable coordinate (`coordOf` non-null), and adds **no** `unknown_city_key`, no
   `place_ref_dangling` and no `geo_outlier` to what that document already had; a source place with
   `at: null` yields `{kind:'none'}`, and `place_ref_dangling` does not fire there either.
4. **Determinism**: a target holding two cities both named *Vienna* re-files onto the lower `order`, and the
   same copy run twice on the same inputs is byte-identical (`sequentialIds` makes this checkable).
5. **A blank source city name never matches a blank target city name** — it takes step 3.
6. The reference trip's numbers, the goldens and the sample JSON are unmoved; `qa/r2-copy.mjs`,
   `qa/prov.mjs` and the §2.14 provenance suite stay green.

#### A-15 — a copied `Place` crosses a person boundary, so §6.6 applies to it (revision 13, QA R14-4)

**The defect.** Rule 4 builds the copied place as `{ ...refiled, id: ctx.ids.newId('place') }`
(`build/copyStop.ts:169`). Two lines later rule 5 runs the copied **stop's** `note` through `redactText`.
The **place's** own `note` and `links` go through nothing. A place note reading *"Front door PIN 0754, conf
5814731574 — ask for jacob@example.com"* and a link `https://vendor.example/booking/GYGG45MLA9Q9` arrive
intact in the recipient's document and in every later `toJSON` of it: five of `redactText`'s six patterns
match the string that crossed. §6.6's free-text table **already names `Place.note`** as a string that must
be redacted, and its Tickets row already calls a vendor URL an access credential. §2.14 rule 4 says only
*"a referenced `Place` is copied with it"*. The two sections of this document disagree, which is why this is
a ruling and not a builder's bug. It is also the unfixed half of round 2's BLOCKER **R2-3** — R2-3's own text
named `Place.note` and `Place.links`, the fix (`b5c742b`) covered `Stop.note`, and the status table recorded
the whole finding closed.

**The root cause is a direction, not a missing line, and that is what makes it worth a ruling.** The two
places in this system that decide what may leave a document fail in opposite directions:

- **§6.6's sample path fails closed.** `redactStringsDeep` walks the whole document and redacts every string
  **except** under a key in `STRUCTURAL_KEYS`, on top of the field-by-field rules. §6.6 says why in its own
  words: *"a field added later is redacted by default rather than leaking by default."*
- **The copy path fails open.** `copyStopInto` enumerates fields, and a field nobody enumerated travels
  verbatim. `Place` grew `note`, `links` and `hours`; rule 4 spreads all of them.

So the fix is not three lines of `redactText` — it is three lines *plus* a mechanical reason the fourth field
cannot repeat this. Both are below.

**The position.** *A string's classification does not change because of which record it is attached to.* A
door PIN in `Place.note` is the same credential as a door PIN in `Stop.note`, and §6.6 has classified it
since revision 2. If anything the copied place is the **worse** carrier of the two, for a reason A-6 settled
deliberately: **a `Place` has no provenance.** The copied stop is stamped `source:'friend'`, badged
`'imported'` by `displayStatus` from the instant it exists, and carries `attribution` that every view must
render (rule 7). The place beside it is badged by nothing, credited to nobody, and — the recipient never
chose it. It rode along. A credential filed there is unattributable and outlives every badge in the system.

**The mechanism.** One module-private function in `build/copyStop.ts`, applied at the one site that pushes a
row, with a row for every field `Place` has:

```ts
/** §2.14 A-15. What of a Place may cross a trip boundary. Pure. */
function placeForCopy(p: Place, cityKey: string, id: PlaceId): Place { … }
```

| `Place` field | What crosses | Why |
|---|---|---|
| `id` | a fresh `ctx.ids.newId('place')` | rule 1, unchanged — ids never cross trips |
| `cityKey` | the re-filed key (A-14 step 2, A-16) | unchanged |
| `name` | **verbatim** | a place's name is a description of the world; rule 5 treats `Stop.name` identically, and §6.6 does not classify a name as free text |
| `at` | **cloned** — `{ lat, lng }` rebuilt, or `null` | purity. Two documents may not end up sharing one mutable `LatLng`; this is KD-47's own argument for cloning in step 3, applied to the branch beside it |
| `category` | **verbatim** | an enum |
| `note` | `redactText(p.note)`, **and the key is present only if the source had one** | §6.6's free-text row, applied to the record §6.6 already names in it |
| `links` | **dropped entirely — the key is absent from the copy**, not emptied and not redacted | rule 3's argument, below |
| `hours` | key present only if the source had one; `weekly` cloned entry by entry; **`hours.note` through `redactText`** | opening times are a description of the world. The note beside them is free text that §6.6's deep pass already redacts and this document's field list never named — the same class of omission as `Place.note`, closed in the same pass rather than left for round 15. **Amended at revision 15 (§2.9 A-20, QA R16-2):** *"cloned entry by entry"* is now *rebuilt from three named fields against `isOpeningHours`/`isWeeklyEntry`*, the one shared predicate the parser and `validateTrip` also use. The copy's own extra test — dropping an `open`/`close` that redaction would alter — stays, and is a **policy**, not a shape check |

At the call site, `refiled` stays exactly as A-14 left it — it is the *probe* the reuse search compares
against (`samePlace(p, refiled)`), and it is no longer the thing that gets pushed. The one line that pushes
a row becomes `const copy = placeForCopy(original, targetKey, ctx.ids.newId('place'));`, and **there is no
remaining spread of a source `Place` into the target document**; a builder who leaves one has not landed
this ruling.

The **reuse** branch is untouched and needs nothing: when an equivalent place already exists in the target,
no field of the source place crosses at all. `samePlace` compares `cityKey`, `name` and `at`, none of which
this changes, so reuse decisions are bit-for-bit what A-14 left.

**Why `links` are dropped rather than href-redacted.** Four reasons, and the first is the one that decides
it:

1. **A `Link` is `{ label, href }` and the href is the entire payload.** A link whose href is `''` or
   `[redacted]` is a control that renders and navigates nowhere — a confident wrong answer where a hole is
   honest. That is A-14's own preference, stated in A-14's own words about the transliteration table, and
   `CLAUDE.md`'s oldest rule in the brief's words.
2. **Rule 3 already decided this class.** *"Their ticket URL is an access credential"* is why no `Ticket`
   travels. A vendor voucher URL filed on a place is the same URL; it does not become safe by being one
   record further away from the stop.
3. **Nothing badges it** — the provenance argument above. Rule 3 can drop `bookingId` and leave the stop
   still marked as somebody else's; a place carries no such mark, so the only safe answer is that the
   credential does not arrive.
4. **It makes rule 4's two branches agree.** The reuse branch already gives the recipient no new links; the
   new-row branch gave them all of them. Whether a friend's voucher URL reached you depended on whether your
   trip happened to already hold that place — a security property decided by a deduplication match.

**Why `Stop.links` still copy verbatim, which is not an inconsistency but is a disclosed residue.** §6.6 and
§2.14 are two different thresholds and must not be collapsed: **§6.6 governs what may reach a build
artifact** — published to anyone, with no user in the loop, which is why it drops every href it sees — and
**§2.14 governs what may cross to one person who is looking at the record.** The stop is the record that
person chose, badged, credited and reviewable; its links are the vendor pages that make the stop usable, and
round 14 re-confirmed that decision deliberate (`qa/r2-copy.mjs` §H reports two order-shaped hrefs travelling
and passes). The residue, named rather than discovered: **a `Stop.links` href can be voucher-shaped today.**
It stays, and the trigger for reopening it is named — **the day anything writes `Stop.links` from a source
the user did not type** (§5.1's ingest candidates, Phase 4), rule 5's link clause is re-ruled, because at
that point a link is no longer *"a page the user pasted"* and the argument above stops holding.

**And the fail-open direction gets a mechanical stop.** `copyStop.test.ts` asserts that the copied place's
**key set** equals a literal list — built from a source place carrying every optional field populated. A
field added to `Place` therefore fails that test until it has a row in the table above. This is the cheapest
available form of §6.6's *"redacted by default rather than leaking by default"* inside a typed record, and it
is the reason this addendum enumerates all eight fields instead of naming the two that leaked.

**What does not change.** Rules 1, 2, 3, 5, 6 and 7; A-14's three-step decision; `Place`'s shape; the reuse
search; `redactText` and `REDACTION_PATTERNS` (**this ruling adds no pattern** — it adds call sites);
`tools/redact.mjs` and §6.6's sample rules (its deep pass already covers `hours.note`, so the sample is
unmoved); no `schemaVersion` bump, no migration, no new export — `placeForCopy` is module-private and §2.10
stays at **71** runtime symbols. The reference trip is unmoved: all 95 of its places carry a note, none is
credential-shaped, and none carries `hours` at all, so the goldens and the sample sha do not move.

**What the builder asserts:**

1. **`qa/r14-horizon-copy.mjs` §5.9 at 0 FAIL**, all six lines — the copied place's `note` has no
   `redactionHits`, its `links` carry no matching href, and none of the four credentials (`0754`,
   `5814731574`, `GYGG45MLA9Q9`, `jacob@example.com`) is greppable anywhere in the recipient's `toJSON`.
2. **Redaction is not a wipe.** A place note that is *not* credential-shaped (*"entrance is on the north
   side"*) crosses **byte-identical**, and `name`, `category`, `hours.weekly` and a `null` `at` are unmoved.
   A rule that redacts everything passes assertion 1 and is wrong.
3. **`hours.note` is covered**: a source place with `hours: { weekly: […], note: 'code 4417' }` arrives with
   the weekly array intact and the note redacted.
4. **The key-set test** above, and it fails when a ninth field is added to `Place` and not classified.
5. **No aliasing**: the copied place's `at` is not the source place's `at` object, and mutating the source
   document's place after the copy changes nothing in the target.
6. **The reuse branch is unmoved** — A-14 assertion 2 still holds (`target.places.length` unmoved) and the
   reused row keeps the target's own `note`/`links`, not the source's.
7. Ceilings: 71 exports, the reference trip's 2 blockers / 4 warnings / 11 notes at `FIXTURE_TODAY`, the
   goldens and sample sha byte-identical, `qa/r2-copy.mjs` and `qa/prov.mjs` at 0 FAIL.

#### A-16 — re-filing is a derivation, and the source document may already hold the answer (revision 13, QA R14-2)

**The defect.** A-14's closing paragraph claimed *"copying within one trip is unchanged: the source city is
found by key, its own name matches itself, the key comes back identical, and the reuse search matches the
original place exactly as today."* `refileCityKey` (`build/copyStop.ts:91`–`103`) never looks at whether
`source.trip` and `target` are the same document, so a within-trip copy is re-filed by name like any other.
Three shapes fall out, and QA reproduced all three in core and two of them through the real store and
reducer with one Copy click:

1. **A trip holding two cities of the same name** — which A-10 explicitly blesses, and which is what a
   there-and-back itinerary through a hub looks like. A place filed under the *second* Vienna re-files onto
   the *first* (lowest `order`), `samePlace` then fails against the original row, and a **duplicate `Place`
   row is written under the wrong city**. A-14 assertion 2's *"`places.length` is unmoved"* is false for
   exactly this document.
2. **A city whose name folds to `''`.** Step 1 returns `null`, the copy takes step 3, and the stop loses the
   place link — inside one trip, where there is no cross-document identity to derive and nothing was at risk.
3. **A place whose own `cityKey` the source document cannot resolve.** Also step 3 — and this one is
   **correct**, see below.

**The position, and it is a narrowing of A-14 rather than a reversal.** A-14's principle stands in full: *a
`CityKey` answers "which city **of this trip** is this filed under", so it is re-filed in the target's terms
or it does not cross.* What A-14 missed is that **re-filing by name is a *derivation of city identity across
documents*, and a derivation is only ever for the case where the primary answer is missing.** When the
source *is* the target document, the primary answer is right there: the place's `cityKey` already names a
city of the target, because the target is the document that minted it. Deriving an identity from the display
name at that point is not conservative — it discards a fact in favour of a guess, and A-10's own reason for
minting opaque keys was that the display name is *not* an identity.

Name matching is the fallback. The key is the answer.

**The mechanism — `refileCityKey` becomes four steps, and step 2 is the only new one.** Nothing else in
rule 4 moves.

> 1. **The source must resolve its own key.** `const sourceCity = source.cities.find(c => c.key === cityKey);
>    if (!sourceCity) return null;` — unchanged, and it stays **first**. A place filed under a key its own
>    document cannot resolve has no city, and a copy may not invent one. This is a data-integrity gap
>    (`validateTrip` reports it as `unknown_city_key`, an **error**) and re-filing must not paper over it —
>    so shape 3 above takes step 3 **even within one trip**, deliberately, and `qa/r14-horizon-copy.mjs` §5.7
>    pins it.
> 2. **The source's own key wins when the source is the target document and the target still holds that
>    key.** `if (source.id === target.id && target.cities.some(c => c.key === cityKey)) return cityKey;` — no
>    name is consulted, so a blank name, a name that folds to `''`, a duplicate name and a `String.normalize`
>    that Hermes may not have are all irrelevant on this path.
> 3. **Otherwise fold the name.** `const wanted = normalizeCityName(sourceCity.name); if (wanted === '')
>    return null;` — unchanged, now reached only when step 2 did not answer.
> 4. **Otherwise match by folded name, lowest `order` first, then document position.** Unchanged, A-14
>    verbatim.

**Both conjuncts of step 2 are load-bearing, and so is `.id` rather than `===`.**

- **`source.id === target.id`, not `source === target`.** The reducer applies the action to the store's
  *current* document while the `source.trip` the UI passes is whatever object it rendered from — a different
  object for the same document after any `openTrip` (which re-parses through `fromJSON`) and after any
  dispatch since the render. Object identity would answer *"different trips"* for a copy the user experiences
  as within one trip, intermittently, depending on what else they had clicked. `qa/r14-horizon-copy.mjs`
  §5.10 happens to pass the same object today because `adoptTrip` installs the caller's object; that is an
  accident of one code path and not a property to build on.
- **`target.cities.some(c => c.key === cityKey)`, and it is not redundant.** `source.trip` is a **copy** of
  the target document, and §0.6 is the rule that copies go stale: a snapshot taken before the user deleted
  that city would otherwise file the place under a key the target does not have — reintroducing the exact
  `unknown_city_key` A-14 exists to prevent, from the opposite direction. **The fact is read from `target`,
  which is the resource that holds it**, and a stale source falls through to name matching and then, if the
  name has gone too, to step 3. A hole, never a wrong filing.

**Why not the simpler rule — "the source's key wins whenever the target holds it", with no same-document
check.** It is one condition instead of two and it satisfies every test QA wrote. It is refused because **a
`CityKey` means nothing outside the document that minted it (A-10), so two documents sharing a key is a
coincidence, not an identity** — and it is a *reachable* coincidence: every deterministic `IdFactory` in this
repo (`sequentialIds`, the fixtures, `tools/gen-sample.mjs`) mints `city-1` in every document it builds, and
`importDoc`'s *"restore as a copy"* produces two documents with the same city keys by construction. Trusting
a bare key match would file a Vienna place under whatever the target's `city-1` happens to be. The
same-document conjunct is precisely what turns key equality from a coincidence into an identity.

**What this changes, shape by shape.** Shape 1: the copy keeps the place's own `cityKey`, the reuse search
matches the original row, and `places.length` is unmoved — A-14's withdrawn sentence becomes true because
the mechanism now makes it true. Shape 2: a within-trip copy under a blank-named city **keeps the place
link**, while a *cross-trip* copy between two blank-named cities still takes step 3 (A-14 assertion 5,
unchanged) — and the two are not in tension, because only the second one is deriving an identity from a name
that is not one. Shape 3: unchanged, and deliberately so.

**What does not change.** A-14 steps 1, 3 and 4 and its entire argument for step 3; A-15's sanitisation
(which applies to whatever row does get pushed); `normalizeCityName` and its Hermes guard; `samePlace`;
`Place`'s shape; the cross-trip behaviour in every one of A-14's five assertions, including the three-city
tie-break and the eight Unicode folding cases; no `schemaVersion` bump, no migration, no new export, §2.10
at **71**. `packages/client` does not change — this is four lines in one core function.

**What the builder asserts:**

1. **`qa/r14-horizon-copy.mjs` §5.2, §5.7 and §5.10 at 0 FAIL**, verbatim as QA wrote them: a within-trip
   copy on a two-Vienna trip keeps the place's own key and adds **no** row; a within-trip copy under a
   blank-named city keeps `{kind:'place'}`; a within-trip copy of a place whose `cityKey` the source cannot
   resolve **still** takes step 3 and mints no new `unknown_city_key`; and both store-level assertions hold
   after one dispatch and a `flush`, read back through `storage.load` + `fromJSON`.
2. **§5.1 is unmoved** — all of A-14's assertions 1–5, the five tie-break arrangements and assertion 5's
   blank cross-trip case still pass unchanged.
3. **The stale-source case, which no existing test covers:** copy within one trip from a `source.trip`
   snapshot taken **before** the city holding that place was removed from the target → the copy adds no
   `unknown_city_key`, and it lands on the target's city of that name if one exists, or on step 3 if not.
4. **Same document, different object**: the same copy performed with `source.trip` re-parsed through
   `fromJSON(toJSON(t))` (equal by `.id`, different object) produces a byte-identical result to the
   same-object call. This is the assertion that would fail under `===`.
5. Determinism and ceilings: the same copy run twice is byte-identical, the goldens and sample sha are
   unmoved, `npm run test:tap` green.

#### A-18 — free text does not become structural by being nested inside a `Stop` (revision 14, QA R15-3)

**The defect.** `build/copyStop.ts:292`–`293`. The copied **stop** carries

```ts
cost: src.cost ? { ...src.cost, amounts: src.cost.amounts.map((a) => ({ ...a })) } : null,
arrival: src.arrival ? { ...src.arrival } : null,
```

`CostEstimate.note` and `MoveOverride.label` are free text and go through nothing. A stop whose `cost.note`
reads *"paid with card, conf 5814731574"* and whose `arrival.label` reads *"Bus 8, booking GYGG45MLA9Q9"*
arrives in the recipient's document verbatim, with both numbers greppable in every later `toJSON` of it —
four `redactText` patterns match the first string and three the second. §6.6's **sample** path redacts both
today (`tools/redact.mjs:97` runs `cost.note` *and* `cost.display` through `redactText` by an explicit rule;
`redactStringsDeep` catches `arrival.label`, because `label` is not a `STRUCTURAL_KEY`), so the two
thresholds already disagree about these two strings. That disagreement is the thing A-15 called **the**
finding — *the sample path fails closed, the copy path fails open* — reproduced one record **inward** rather
than one record sideways.

**Why A-15 did not already cover it, stated rather than excused.** A-15 was written against the record that
crosses *beside* the stop, and its table enumerated `Place`. The stop itself looked enumerated, because rule
5 lists its fields by name. But rule 5 lists the fields of `Stop`, and `cost` and `arrival` are **records,
not strings**: naming them in a field list says which fields travel, not which *strings* do. So the general
statement, which is what makes this a ruling and not two more `redactText` calls:

> **A field list is only exhaustive down to the depth it recurses.** Enumeration stops at a **scalar**, never
> at a field name.

R15-1 is the same sentence proved one level down inside `Place` (`{ ...w }` on an `hours.weekly` entry), and
this is why the two land in one commit.

**The position.** Two sentences; the first is A-15's and the second is new:

1. *A string's classification does not change because of which record it is attached to.* A confirmation
   number in `cost.note` is the same credential as one in `Stop.note`, which rule 5 has redacted since KD-20.
2. **No record that crosses the trip boundary is copied by spread, at any depth.** Every record `copyStopInto`
   writes into the target — `Stop`, `Place`, `CostEstimate`, `Money`, `MoveOverride`, `Link`, `StopPlacement`
   — is rebuilt field by field from named fields, and a field nobody named does not travel. That is the
   fail-closed direction §6.6 has and the copy path did not.

**What `fromJSON` guarantees here, checked field by field rather than assumed** — because R15-1/R15-2's root
cause was a parser gap and this ruling must not inherit one. `parseCost` (`serialize/fromJSON.ts:132`–`140`)
builds `{ amounts, display, note? }` field by field, `parseMoney` (`:122`–`130`) builds
`{ lo, hi, currency, basis }`, `amounts` goes through `arr()` so it is an array before anything calls `.map`,
and the arrival branch (`:222`–`232`) builds `{ mode, mins, label? }`. **Neither `cost` nor `arrival` has any
counterpart to `parsePlace`'s raw `hours` cast (`:294`)**, so no document `fromJSON` accepts can carry an
unenumerated key or a non-string into either record, and **this ruling changes nothing in `fromJSON`**. It
still forbids the cast that hid R15-1: `redactText` is typed `(unknown) => unknown` for a reason, and
`as string` is how a non-string crossed whole.

> **Superseded in part at revision 15 — §2.9 A-20 (QA R16-2).** The sentence above is true of A-18 and its
> parenthetical is the finding: `parsePlace`'s raw `hours` cast is the one counterpart, and leaving it in
> place is what let the two compensating guards written for R15-1 and R15-2 diverge. A-20 closes the cast —
> `fromJSON` now validates `hours` field by field like everything else — and one shared predicate replaces
> both guards' structural halves. Nothing else in A-18 moves: `costForCopy`, `arrivalForCopy`, `redacted()`,
> position 2 and the four key-set assertions all stand exactly as written.

**The mechanism.** Three module-private functions in `build/copyStop.ts`, plus three call sites. Nothing is
exported and §2.10 stays at **71**.

```ts
/**
 * `redactText` at the call sites where the model says `string`. Pure.
 * Never a cast: a value typed `string` can still arrive non-string from a hand-built document,
 * and `redactText` returns a non-string unchanged — which is exactly how R15-1 crossed.
 */
function redacted(s: string): string {
  const out = redactText(s);
  return typeof out === 'string' ? out : REDACTED;   // fails closed, never throws
}

/** §2.14 A-18. What of a `CostEstimate` may cross a trip boundary. Pure. */
function costForCopy(c: CostEstimate): CostEstimate { … }

/** §2.14 A-18. What of a `MoveOverride` may cross a trip boundary. Pure. */
function arrivalForCopy(a: MoveOverride): MoveOverride { … }
```

`REDACTED` is imported from `build/redactText.ts` beside `redactText`. **`redacted()` replaces every
`as string` in this file** — rule 5's `note`, and `placeForCopy`'s `note` and `hours.note` — so the cast
appears nowhere in `copyStop.ts` when this lands.

| `CostEstimate` field | What crosses | Why |
|---|---|---|
| `amounts` | rebuilt entry by entry, **field by field** — `{ lo, hi, currency, basis }`, never `{ ...a }` | rule 3's *"the money is a description of the world"* holds for all four: two numbers, an ISO code and an enum. Field by field because the spread is the pattern that produced R14-4 and R15-1, not because `parseMoney` is suspect |
| `display` | `redacted(display)` **when that is byte-identical to the input; `null` when it is not** | it is a text box the user types into (`apps/web/src/views/StopEditor.tsx:121`, parsed by `costFromDisplay`), so it can hold a credential — *and* it is a **price**. `[redacted] HUF` is a number that is not a number: A-15's own *"a redacted href is a control that navigates nowhere"* argument, applied to money. Here the hole is **filled**: `amounts` crosses intact and `costLabel` (`apps/web/src/format.ts:36`–`45`) derives the figure from `amounts` whenever `display` is falsy, so the recipient sees a correct cost instead of a redaction marker |
| `note` | `redacted(note)`, **key present only if the source had one** | §6.6's free-text row. Prose keeps its meaning around a `[redacted]`; a price does not, which is the whole reason the two rows differ |

| `MoveOverride` field | What crosses | Why |
|---|---|---|
| `mode` | verbatim | an enum |
| `mins` | verbatim | a number |
| `label` | `redacted(label)`, **key present only if the source had one** | free text, and §6.6's deep pass already redacts it on the sample path. *"Bus 8, booking GYGG45MLA9Q9"* → *"Bus 8, [redacted]"*: the part that describes the journey survives, which is the difference from `display` |

The exact `display` predicate, so there is no judgment call in it:

```ts
const display =
  c.display === null ? null : redacted(c.display) === c.display ? c.display : null;
```

A non-string `display` yields `REDACTED !== c.display` and therefore `null` — fails closed, no throw, no cast.

**The three call sites.**

```ts
cost:    src.cost    ? costForCopy(src.cost)       : null,
arrival: src.arrival ? arrivalForCopy(src.arrival) : null,
...(src.links ? { links: src.links.map((l) => ({ label: l.label, href: l.href })) } : {}),
```

The `links` line is **the same policy and a different construction**: A-15's disclosed residue stands — a
`Stop`'s links still travel, with the same reopening trigger (*the day anything writes `Stop.links` from a
source the user did not type*) — but `{ ...l }` is a spread of a source record and position 2 above admits no
exceptions. `qa/r2-copy.mjs` §H, which asserts two order-shaped hrefs travel and passes, must stay passing;
a builder who "fixes" it has changed a policy this ruling did not.

**`flags` stay `[...src.flags]` and that is not an omission.** `StopFlag` is `'free' | 'daytrip' | string`,
so a flag is nominally free text — but `flags` is a `STRUCTURAL_KEY` in `tools/redact.mjs:63`, meaning §6.6's
sample path deliberately does **not** redact it. The two thresholds therefore already agree about flags, and
the array of scalars is copied, not spread from a record. Named here so round 16 does not re-derive it.

**`name` stays verbatim, and now with a measurement instead of an assertion.** A-15's table justified this
in prose; R15-4's rider observed that nothing pins it. The measurement, taken against the reference trip:
running `redactText` over all 143 stop names alters **4**, and all four are false positives —
`"Condor DE2081 → Frankfurt"`, `"Condor DE4345 → Vienna (VIE)"` and `"Smartwings QS1083 → Prague"` (public
timetable designators, matched by `alnum_reference`) and `"DECENTRAL — Sachertorte nightcap"` (a bar's name).
Against **0** credentials. A redacted name is also unrepairable by the recipient in a way a redacted note is
not: the name *is* the record they chose to copy, and *"[redacted] — Sachertorte nightcap"* cannot be
recovered from anything else in the document, whereas a mangled `display` has `amounts` behind it. This is
the general rule the three rows above apply: **redact a string in place when the surrounding prose still
carries the meaning; drop to a specified unknown when a fallback exists; keep it verbatim when neither is
true and the field is the record's identity.**

**What does not change.** Rules 1, 2, 4, 6 and 7; A-14, A-15 and A-16 in full, including `placeForCopy`'s
table and its key-set guard; `redactText` and `REDACTION_PATTERNS` — **this ruling adds no pattern**, only
call sites; `tools/redact.mjs` and §6.6's sample rules, which already cover all three strings (the deliberate
difference is now two-way and disclosed: the sample redacts `display` **in place** because a `[redacted]`
price in a demo document is a rule visibly working, while a copy hands a usable record to a person and so
takes the `null` that `costLabel` fills); `serialize/fromJSON.ts`; `packages/client` and `apps/web`; no
`schemaVersion` bump, no migration, no new export, §2.10 at **71**.

Rules 3 and 5 are amended in place above — *"`cost` is copied"* becomes *"`cost` crosses through
`costForCopy`"*, and `arrival` leaves rule 5's verbatim list. Those two sentences are what this finding
falsified, exactly as A-15 falsified rule 4's *"copied with it"*.

**The reference trip is unmoved, measured not asserted:** 0 of its 143 stops carry a `cost.note`, 0 carry an
`arrival.label`, and **0 of its 51 non-null `cost.display` strings are altered by `redactText`**. The shape
that would be altered is a space-grouped six-digit price — `"12 000 HUF"` → `"[redacted] HUF"` under the
sample path's rule, `display: null` plus a correct derived figure under this one — and Budapest is on this
trip, so it is a real future case and not a hypothetical. `"~100 CZK"`, `"€15–24"` and
*"gardens free · palace €15–24"* all cross byte-identical. The goldens and the sample do not move because
neither performs a copy.

**The mechanical stop, which is what QA asked for in the same breath.** A-15's key-set guard has no
counterpart for the stop, so the *next* field added to `CostEstimate` or `MoveOverride` would travel by
whatever construction the builder happened to use. `copyStop.test.ts` gains **four** key-set assertions
against literal lists, built from a source stop with every optional field populated:
`Object.keys(copied)`, `Object.keys(copied.cost!)`, `Object.keys(copied.cost!.amounts[0])` and
`Object.keys(copied.arrival!)`. Same limitation as A-15's, stated so it is not oversold: this catches a field
that **travels** unclassified (i.e. a re-introduced spread); a field that silently fails to travel is the
fail-closed direction and is caught by review, not by the test.

**What the builder asserts:**

1. **`qa/r15-place-copy.mjs` §2.1 at 0 FAIL**, all five lines — no `redactionHits` on the copied `cost.note`
   or `arrival.label`, neither `5814731574` nor `GYGG45MLA9Q9` greppable in the recipient's `toJSON`, and the
   two thresholds agreeing on both fields.
2. **Redaction is not a wipe.** A `cost.note` of *"tickets at the door"*, an `arrival.label` of *"Bus 8"* and
   a `display` of *"gardens free · palace €15–24"* all cross **byte-identical**; `amounts`, `mode` and `mins`
   are unmoved. A rule that redacts everything passes assertion 1 and is wrong.
3. **The `display` hole is filled, not just opened.** A source `cost` with `display: '€40, conf 5814731574'`
   and `amounts: [{lo:40,hi:40,…}]` crosses with `display === null` and `amounts` **unchanged**, so
   `costLabel` renders *€40* rather than *[redacted]* — asserted against `costLabel`'s own output, since that
   is the claim this row makes.
4. **The four key-set assertions**, and each fails when a field is added to its record and left unclassified.
5. **No aliasing, from both sides.** `copied.cost !== src.cost`, `copied.cost.amounts[0] !== src.cost.amounts[0]`,
   `copied.arrival !== src.arrival`, `copied.links[0] !== src.links[0]`; mutating any of the source's after
   the copy leaves `toJSON(target)` byte-identical, and mutating the target's leaves `toJSON(source)`
   byte-identical. (R14-3's sweep found these already fresh; the assertion pins them against the rebuild.)
6. **No new throw site.** Every `cost`/`arrival` shape `fromJSON` accepts copies without throwing —
   `cost: null`, `amounts: []`, `display: null`, an absent `note`, an absent `label` — and `copyStopInto`
   still throws only on the two argument errors it threw on before (plus A-19's third).
7. Ceilings: **71** exports, the reference trip at **2 blockers / 4 warnings / 11 notes** at `FIXTURE_TODAY`,
   goldens and sample sha byte-identical, `qa/r2-copy.mjs` (§H included) and `qa/prov.mjs` at 0 FAIL,
   `npm run test:tap` green, `npm run typecheck` clean.

**R15-1 and R15-2 are not re-ruled here** — A-15's table already decides them and QA routed both to a builder.
Position 2 above is the reason `placeForCopy`'s `weekly` entry becomes `{ day, open, close }` rather than
`{ ...w }`, and `redacted()` is the helper that removes its two casts, so the three land in one commit.

#### A-19 — a placement is an instruction in the target's terms, so it is validated, not re-filed (revision 14, QA R15-6)

**The defect.** `copyStopInto` validates the scheduled branch's `dayId` against the target
(`build/copyStop.ts:217`–`219`) and validates **nothing** for the pool branch. A caller-supplied
`{ kind: 'pool', cityKey }` carrying the **source's** key is written straight into the recipient's document,
where `validateTrip` reports `pool_stop_unknown_city` (`validate/validateTrip.ts:322`–`338`) — an **error**.

**What QA's *"unrepairable"* gets right, and what I checked rather than repeated.** The row is not invisible:
`unfiledPool` (`packages/client/src/selectors/index.ts:48`–`51`) catches **every** pooled stop whose `cityKey`
is not in `trip.cities`, and `PoolPanel` renders that catch-all unconditionally (`apps/web/src/views/Panels.tsx:118`,
`:167`–`181`). So this is not R2-2's lost stop. What is true is worse than a cosmetic issue and different
from what was filed: the recipient's document carries a `validateTrip` **error they did not cause**, the
panel explains it with a sentence that is false for this document (*"Taken off a travel day, so it belongs to
no city on this trip"*), and the *"Add to the plan"* button throws
`scheduleFromPool: no day available for <key>` (`build/pool.ts:91`) unless a day tab happens to be open,
surfacing a raw core message in a toast. §2.9's standard is that an `error` is something the user can act on;
this one is an error whose only repair is an action the control offering it may refuse to perform.

**The position, and it is a boundary A-14 does not extend across.** A-14/A-16 re-file `Place.cityKey` because
it is a **fact attached to a record that is crossing**: the source stated it, the target must restate it, and
A-16 settled that re-filing by name is a *derivation used only when the primary answer is missing*.
`copyStopInto`'s `placement` is not a record that crosses. It is an **argument the caller supplies about the
target**, in the same position and with the same authority as `placement.dayId` — which the caller has always
had to state in the target's terms. The primary answer is therefore *never* missing: the caller holds the
target document. Re-filing it inside core would mean core deriving an answer to a question the caller is the
authority on, silently, onto a filing nothing badges — which is the guess A-14 refused, arriving from the
opposite direction.

So: **the pool placement's `cityKey` is validated exactly as `dayId` is, and never re-filed.**
A-10's change-table row (*"`StopPlacement.pool.cityKey` … they compare keys and never read them"*) stays
true for every **stored** placement inside one document, and gains this one exception for the **argument**.

**The mechanism.** Three parts, all inside `copyStopInto`. `refileCityKey`, `placeForCopy` and rule 4 do not
move.

> 1. **Check the pool branch where the scheduled branch is already checked**, before anything is copied, so
>    nothing is partially built behind the throw:
>    ```ts
>    if (
>      placement.kind === 'pool' &&
>      placement.cityKey !== TRANSIT_CITY_KEY &&
>      !target.cities.some((c) => c.key === placement.cityKey)
>    ) {
>      throw new Error(`copyStopInto: no such city ${placement.cityKey} in ${target.id}`);
>    }
>    ```
>    `TRANSIT_CITY_KEY` (`model/ids.ts:31`) is exempt because `validateTrip` exempts it (`:323`) and because
>    it is the designed *"belongs to no city"* group (`build/pool.ts:38`–`56`) — the one honest answer a
>    caller with no city of the target can give. Imported from `model/ids.ts`; no export-surface change.
> 2. **Rebuild the placement field by field; never store the caller's object.** `makeStop` assigns
>    `placement` as given (`build/stops.ts:79`–`97`) and `reindex` keeps that same object when the order
>    already matches (`:45`–`51`), so the natural call — `copyStopInto(target, src, srcStop.placement, ctx)`,
>    *"copy it where it already sits"* — aliases one mutable object into two documents. That is **R14-3
>    exactly, one field over**; round 15 swept `cost`, `arrival`, `links` and `flags` for the same alias and
>    did not look at `placement`. A-18 position 2 covers it:
>    ```ts
>    const placed: StopPlacement =
>      placement.kind === 'scheduled'
>        ? { kind: 'scheduled', dayId: placement.dayId, time: placement.time, order: placement.order }
>        : { kind: 'pool', cityKey: placement.cityKey, ...(hint ? { hint } : {}) };
>    ```
>    `placed` is what goes to `addStop`.
> 3. **A `hint` whose `dayId` the target cannot resolve is dropped, not thrown on:**
>    ```ts
>    const h = placement.kind === 'pool' ? placement.hint : undefined;
>    const hint =
>      h && target.days.some((d) => d.id === h.dayId)
>        ? { dayId: h.dayId, time: h.time, ...(h.order === undefined ? {} : { order: h.order }) }
>        : undefined;
>    ```

**The asymmetry between parts 1 and 3 is the ruling, not an inconsistency, and it has a rule:** *a required
field with no honest unknown is refused; an optional field with a specified fallback becomes the hole.*
`cityKey` is required and decides where the stop can be reached — there is no "unknown city" value except
`TRANSIT_CITY_KEY`, and inventing one for the caller is a filing nothing badges. `hint` is optional, its
absence is legal and fully specified (`scheduleFromPool` falls back to the stored hint, then `pickDay` +
`CAT_DEFAULT_TIME`, `build/pool.ts:85`–`96`), and a hint naming the **source's** day is a fact about a
document the recipient does not have — carried across, it makes the recipient's *"Add to the plan"* throw
`scheduleFromPool: no such day` (`:92`). A hole, never a wrong filing: A-14 step 3's own rule, applied to the
one other field at this boundary that has an honest unknown.

**Why a throw and not an `Issue`.** §2.1: core throws on **programmer error** and returns `Issue[]` for a
**document**. A placement is an argument. A caller naming a city the target does not have has made the same
mistake as one naming a day the target does not have, and that has thrown since Phase 1. The converse stays
converse: R15-2 is a defect precisely because it throws on a *document shape* `fromJSON` accepts, and nothing
in A-18 or A-19 throws because of what a document contains.

**What a caller passes, so no future UI has to guess** — a refusal with no answer is not a design:

- Copying into the pool from one of the **target's own** city tabs → that city's key.
- Copying from a browsed trip with no city of the target chosen → **`TRANSIT_CITY_KEY`**. The stop lands
  under *"Not filed under a city"*, which is exactly where the recipient re-files it by scheduling it onto a
  day; the badge and the credit are untouched (rules 2 and 7).
- **Never the source's key, and never a name-derived key computed inside core.** If *"copy into my Vienna"*
  is wanted later, the **UI** may default a picker over `target.cities` to the name match and **show** it —
  a default the user can see is not the silent filing A-14 refused. `normalizeCityName` is already the
  function for that and is deliberately not exported (§2.10 at 71); exporting it is a decision for the phase
  that builds the picker, not a consequence of this ruling.

**What does not change.** A-14, A-15 and A-16 in full — the *place's* key is still re-filed, and the
placement's is still never re-filed; rules 1–7; `StopPlacement`'s shape; `addStop`, `makeStop`, `moveStop`,
`returnToPool`, `scheduleFromPool`, `poolFor`, `unfiledPool` and `validateTrip` are all untouched. The check
lives at the **copy boundary**, which is where the cross-document caller is; `addStop` is called by
`importLegacyDays` and by every editor inside one document and is deliberately not made stricter here.
`packages/client` and `apps/web` do not change — `BrowsePane` passes `{kind:'scheduled'}` and keeps doing so,
which is what bounds this finding to MINOR. No `schemaVersion` bump, no migration, no new export, §2.10 at
**71**.

**What the builder asserts:**

1. A cross-trip copy with `{ kind: 'pool', cityKey: <the source's key> }` **throws** an `Error` naming the key
   and the target id, and `target` is unmoved — same `revision`, byte-identical `toJSON`.
2. `{ kind: 'pool', cityKey: TRANSIT_CITY_KEY }` **succeeds**, adds **no** `pool_stop_unknown_city` and no
   other new issue, and the copied stop is in `unfiledPool(after)`.
3. `{ kind: 'pool', cityKey: <a key the target does have> }` succeeds and the stop is in
   `poolFor(after, key)` — the copy is otherwise identical to the scheduled case (same provenance stamp,
   same credit, A-15/A-18 applied).
4. A **within-trip** copy into the pool under the stop's own pool key succeeds and adds no issue.
5. **The hint:** a pool placement whose `hint.dayId` exists only in the *source* copies cleanly with **no
   `hint` key** on the written placement, and `scheduleFromPool` on the copy then succeeds through
   `pickDay`/`CAT_DEFAULT_TIME` instead of throwing; a `hint.dayId` the target **does** have is preserved,
   `order` included.
6. **No aliasing:** `copied.placement !== placement` and `copied.placement.hint !== placement.hint`, for the
   **scheduled** branch as well as the pool one (`reindex` keeps the caller's object when the order already
   matches); mutating the caller's placement after the copy leaves `toJSON(target)` byte-identical.
7. `qa/r15-place-copy.mjs` §3.4's second line — *no shipped caller offers a pool placement* — still passes.
   **Its first line asserts against a returned document and will now meet a throw**; that probe line is
   QA's to re-express as a `throws` assertion in round 16, and **the builder does not edit anything under
   `qa/`**.
8. Ceilings: **71** exports, 2 / 4 / 11 at `FIXTURE_TODAY`, goldens and sample sha byte-identical,
   `npm run test:tap` green.

#### Why this ships in Phase 1, with no friends and no server

The copy path is the same code whether the source trip came from your own library or from a friend's share.
In Phase 1 the client gets a read-only **"Browse another trip"** pane over the local library: open trip B
beside trip A, copy a stop across. That is genuinely useful on its own — it is how a second trip reuses the
first one's stops — and it means the provenance rule is exercised by a real user path months before there is
a friend to break it. In Phase 2 the pane's source list gains shared trips and nothing else changes.

**`TripFork` is cut.** It is `copyStopInto` in a loop plus a whole-trip credit edge that Jacob's answer says
nobody wants. `StopImport` is not a table either: it is `Provenance.origin`, which already carries every
field a `stop_imports` row would have. The only thing a table would add is enumerating *"what have people
taken from my trip"*, which nobody has asked for; if it is asked for, it is a query over provenance.

**One rule for this whole file lives in §2.9, not here: A-21 (revision 16, QA R17-1).** Every field of a
source record is read **once**, into a `const`, and everything downstream tests, redacts, compares and emits
*that* — because a check and a use that are two different reads of the same field are two different values
the moment the field is an accessor, and A-18's own `cost.display` construction leaked a credential that
way. It rewrites `weeklyForCopy`, `costForCopy`, `arrivalForCopy`, `hoursForCopy`, `placeForCopy` and
`copyStopInto`'s place block (which also stops **aliasing** the source's own `PlaceLink` into the target),
and it changes no rule in A-14, A-15, A-16, A-18 or A-19 for any value the type system permits. **The rule
is total for the file, and A-21a (§2.9, revision 16 addendum) is what makes that true**: A-21 printed
A-14/A-15/A-16's step-2/step-3 logic as *"verbatim"* and that block went on reading `original.at` three
times, crashing `copyStopInto` on the step-3 path; *verbatim* meant *those rules are unchanged*, never
*exempt*. A-21a hoists `cityKey`, `at` and `name`, and names the one bounded double read it deliberately
keeps (`placeForCopy` re-reading `name`/`at` on the reuse-miss path, because A-15 classifies every field of
a `Place` in **one** function). **Anyone touching `copyStop.ts` reads A-21 and A-21a with A-15 and A-18.**

---

## 3. Module boundaries

```
cairn/
  packages/
    core/          pure domain. zero runtime deps. no DOM, no fetch, no fs,
                   no Date.now() and no randomness in logic (injected clock + IdFactory).
    client/        trip store, ports, selectors. Platform-agnostic: no DOM, no React,
                   no network in Phase 1. Runs and is tested in plain Node.
    tokens/        colors, category labels, mode icons. No logic.
  apps/
    web/           Vite + React. Port implementations + views. Installable.
    mobile/        Expo SDK 56. The ONLY place expo-location / expo-media-library may be imported.
  services/
    api/           Node 24 + Postgres/RLS. Auth, trips, social graph, permissions, ticket storage.
    ingest/        Mailbox polling + parsing. Writes IngestCandidate rows and nothing else.
                   Separate deploy unit, separate credentials, no write grant on trip tables.
  db/              SQL migrations + RLS policies + the policy conformance test
  fixtures/        europe2026.sha256, europe2026.bookings.json, golden/
  tools/           extract-legacy.mjs and other one-shot scripts
  docs/            BRIEF, ARCHITECTURE, ROADMAP, BUILD-NOTES, QA-FINDINGS, REVIEW
```

Dependency direction, enforced by **a test that walks imports and does not currently exist** — write it;
four packages is when it is cheap, and the property holds today so it is a guard, not a repair. `core` →
nothing. `tokens` → nothing. `client` → core. `web`/`mobile` → client, core, tokens. `api`/`ingest` → core.
**Nothing imports `web` or `mobile`.** This is the boundary that rots first.

The same test carries one more assertion, which is a privacy boundary rather than a tidiness one:
**nothing under `apps/` may import `tools/extract-legacy.mjs`, directly or transitively.** `apps/web` reads
trip data only from the generated, redacted sample file (§6.6). That is what keeps the live planner's
credentials out of a bundle by construction rather than by remembering.

`services/ingest` having no write grant on trip tables is a security boundary, not tidiness: the component
holding mailbox credentials must not be able to modify an itinerary.

---

## 4. The Phase 1 client — local-first, multi-trip

Jacob's answer widened Phase 1: the engine **plus a working multi-trip UI he can open and use**. No server,
no accounts. This section specifies it tightly enough that the builder does not invent it.

**Which client: web first.** Vite + React + TypeScript. It is the surface Jacob, the builder, the tester and
a friend with a link can all run today with no device, no store review and no account — and per §1.3, desktop
planning is where this half of the product belongs permanently anyway.

### 4.1 Shape

```
packages/client/src/
  store/      TripStore — a reducer over core's build functions, plus history and persistence bookkeeping
  ports/      StoragePort, FilePort, MapPort, ClockPort, IdPort   (SyncPort arrives in Phase 2)
  selectors/  thin memoised wrappers over core's derive functions
apps/web/src/
  ports/      IndexedDB storage · download + <input type=file> · Leaflet map
  views/      React components. No domain logic. No core mutation outside dispatch.
```

### 4.2 State model

```ts
type AppState = {
  library: TripSummaryRow[];   // the shipped shape is {id,title,startDate,endDate,cityCount,dayCount,
                               // stopCount,poolCount,revision} — cheap, always loaded. (Revisions 1–8 said
                               // `updatedAt`, which has never existed; corrected in revision 9, and §8.4
                               // widens the row and states the freshness rule that keeps it honest.)
  activeTripId: TripId | null;
  doc: Trip | null;            // exactly ONE trip in memory at a time
  derived: DerivedCache;       // legs, roll-ups, clusters, conflicts, issues — keyed by (doc identity, today)
  ui: UiState;                 // activeDay, activeCity, mapScope, selection, panels — NEVER in the doc
  history: { past: Trip[]; future: Trip[]; limit: 50 };
  persistence: {
    savedDoc: Trip | null;                 // the document storage last agreed with us about — §2.2b F2.
                                           // Answers "is there an unwritten edit" AND is the merge ancestor.
    savedVersion: StorageVersion | null;   // the WRITE FENCE — §2.2a. `null` = nothing stored yet.
    status: 'idle'|'saving'|'error'|'conflict'; lastError?: string;
  };
};
```

**`savedRevision` is deleted** (revision 4, QA R4-1). It had one remaining consumer, `dirty()`, and that
consumer was the bug; a field left in place is a field the next person compares. `savedDoc` replaces it and
also absorbs the store's module-level `baseDoc`, so there is exactly one pointer to "what storage last agreed
with us about" instead of two facts that can disagree. Because it lives in `persistence` it moves only inside
a `set()`, so no subscriber can render an indicator computed against a pointer the state it was handed does
not contain.

**`savedVersion` and `savedDoc` are assigned from a port result and from nowhere else** — `load()`'s
`{doc, version}`, or a successful `saveIfVersion()` (paired with the document that write carried). Neither is
ever computed from the in-memory document, and **neither is touched by the reducer**, including by
`undo`/`redo`: undo changes the document, not what storage holds. That one sentence is what makes R3-1
structurally unreachable, and it is why `savedDoc` is safe where `savedRevision` was not — it is a *pointer
to bytes that were written*, not a number the document owns.

Six rules, each of which exists because of a specific failure:

1. **Every mutation is `dispatch(action)`, and every action maps 1:1 onto a core build function.** The
   reducer holds no domain logic — it is `doc = core[action.fn](doc, ...args)` plus history and persistence
   bookkeeping. If a feature needs logic the reducer cannot express, the logic goes into core. This is the
   mechanism that keeps web and native from drifting: it is `CLAUDE.md`'s "one data structure drives every
   view", one level up.
2. **`ui` is never persisted into the trip document.** Today the app stores drag order in localStorage keyed
   by `CONTENT_VERSION`, and that conflation is exactly why the cache went stale for a week. Stop order is
   *document* data (`placement.order`); which day is open is *UI* state.
3. **Derived data is never stored, and is invalidated wholesale on `(document identity, today)`.** No partial
   invalidation — cheap at 112 stops, and it removes a class of stale-view bugs outright. Revision 4: the key
   was `(revision, tripId)` and `===` on a revision cannot prove sameness (§2.2a rule 1), so undo-then-a-
   different-edit served the pre-undo document's legs and conflicts — and, through `syncResolutions`, *wrote*
   from them. §2.2b F2. The same defect exists in any view-level memo keyed on `derived.revision`
   (`DayMap`'s effect dependency array is one) and is fixed the same way: depend on the cache object, not on
   a number inside it.
4. **Autosave** writes the whole document, debounced 400 ms. `state.doc !== persistence.savedDoc` drives the
   dirty indicator (§2.2b F2).
   A failed write puts `persistence.status = 'error'` and says so on screen; it never fails silently.
   **The write is compare-and-set, and the compare happens inside the port.** `StoragePort` exposes
   `saveIfVersion(id, expectedVersion, doc, summary)` and nothing else that writes: the comparison and
   the write are one indivisible step (one IndexedDB `readwrite` transaction; one synchronous block in the
   in-memory port). The expectation is `persistence.savedVersion` — the opaque storage token of §2.2a, **not
   `doc.revision`**. If the stored version has moved, the write is refused, `status` becomes `'conflict'`,
   and the indicator says so. **A tab whose write was refused MUST NOT display "Saved."**

   It is worth being explicit about why the compare cannot live in the store, because the first fix put it
   there and it did not hold. `load()` → compare → `save()` is two awaits with an interleaving point in
   the middle: two tabs both read revision *R*, both passed the compare, and the second write destroyed
   the first while **both** displayed "Saved" (QA R2-1, two runs in three). No amount of checking above
   the port closes that window. Two tabs on one trip is not an exotic case; it is Jacob with a second
   window open.

   The store also serializes its **own** saves, chaining each attempt onto the last, so an autosave and an
   explicit `flush()` cannot overlap. A tab that conflicts with itself has no other writer to merge with,
   which makes it an unresolvable state rather than a recoverable one.

   **4a. A write the store declines to install may not move the fence** (revision 8, QA R11-1; the ruling,
   its alternatives and its reasoning are **§2.2a A-7**, and this rule is not implementable without it).

   > `persistence.savedDoc` and `persistence.savedVersion` advance **together**, and only to a document this
   > store still holds or may legitimately write forward over: at the moment the write settles, either
   > `state.doc === startedFrom` or `toWrite === startedFrom`. A successful write whose document the store
   > declines to install advances neither field, installs nothing, re-arms no debounce, and leaves
   > `status: 'conflict'` with the user's edit in `doc` and the indicator not reading "Saved".

   Rule 4 already says `savedVersion`/`savedDoc` come from a port result and nowhere else. That was
   necessary and not sufficient: the port result is a fact about **the bytes that were written**, and
   `writeAndSettle` was recording it as a fact about **the document the store holds**. When a merge writes a
   document the user has since typed past, those are different documents, the store keeps a fence it has no
   right to, and the next ordinary autosave writes an un-merged document over another writer's work with the
   fence's blessing and the chip on *Saved* — §0.6 reached one level out from where §2.2a found it. The two
   autosave call sites satisfy the second disjunct by construction and do not change; the merged write is
   the only site in the system where `toWrite !== startedFrom`.

5. **Undo/redo is snapshot-based** over the immutable `Trip`, limit 50. Structural sharing makes this cheap.
   The restored snapshot is byte-identical to the document it captured, `revision` included; it carries no
   authority over `savedVersion` (rule 4, §2.2a).

   **One carve-out, and it is exactly one field (revision 6, QA R8-1).** `resolutions[].retiredAt` is
   monotone metadata, not history: §2.7's A-5 ledger re-asserts it onto every restored snapshot, inside the
   same `set()`, before any subscriber sees the state. So the guarantee reads, precisely: *the restored
   snapshot is byte-identical to the document it captured except that a `resolutions[]` row whose `retiredAt`
   was `null` may be restored carrying the date the ledger already holds for its `conflictId`, and `revision`
   is bumped when that happens.* Nothing else moves — not a day, not a stop, not a place, not a booking, not
   a resolution's `state`, `by`, `at` or `note`, and not a row the ledger has no key for. `reassertRetirements`
   is a pure function whose only writable field is `retiredAt`, so this is enforced by the function's shape
   and not by discipline, and the test asserts field-by-field equality over everything else.

   The reducer's `undo`/`redo` stay pure snapshot restores and gain nothing: the ledger is applied by the
   store, above them. **Retirement still never consumes an undo slot and is still never a user edit** — it
   does not push onto `history.past`, and pressing undo *N* times reverts *N* of the user's own edits.
6. **A pending write is never outlived by its document.** The five NO-SILENT-LOSS cases the criterion
   enumerated all keep the edit in memory; QA R3-2 found the sixth, where the edit's *container* goes away —
   a 400 ms debounced write is still pending and the active document is replaced, closed or deleted, so the
   timer fires against a document that is no longer there and the edit is gone with nothing on screen. One
   click, no second tab, inside a window the app chose. Three rules close it:

   **6a. Every transition that changes the active document flushes first.** `closeTrip`, `openTrip`,
   `createTrip`, `adoptTrip`, `importDoc`, `deleteTrip` — that is the complete list, and it is a **closed
   list**: a seventh path that assigns `state.doc` is a defect. Each begins with `await flush()`, which
   cancels the pending timer and awaits the write.

   **6a′ (revision 4, QA R4-1). The flush may be skipped only on the F2 predicate.** `flushForTransition`
   is allowed to avoid rewriting a 176 KB document on every navigation, and that optimisation is where the
   whole of rule 6 was lost: it asked `doc.revision !== savedRevision`, a *content counter*, whether an edit
   would be lost — and undo makes that counter non-injective over content, so a fresh, different edit landing
   on a revision number an earlier edit already used made the store report "nothing to write", skip the
   write, complete the switch, and display "Saved" over a document storage did not hold. One click, no
   second tab, nothing on screen — R3-2's symptom sentence reached through the predicate rather than through
   the timer. The skip now requires **all three** of `status === 'idle'`, no pending debounce timer, and
   `state.doc === state.persistence.savedDoc`; the third is the real condition and the other two can only
   ever cause more writing. `flush()` stays unconditional and must never consult the predicate.

   **6a″ (revision 3, QA R5-1; the bound blessed and its exits ruled in revision 5, QA R6-1/R6-2). The flush
   is a loop, bounded by `FLUSH_MAX_ATTEMPTS = 5`.** A flush is not a moment — it is an `await` long enough
   for the user to type into — so the exit condition is `dirty()`, re-asserted *after* every write and never
   sampled before one. The loop needs a bound because a user typing through every write could otherwise hold
   a transition open forever, and a hang is not an improvement on data loss.

   **Five is right, and the reason is that the bound is not a timeout.** Each pass awaits its own write, so
   slow storage makes the loop *take longer*, it does not make it exhaust; the bound is only reached by a
   document that will not settle. Convergence in the realistic worst case takes two passes — the in-flight
   document, then the one that arrived behind it — and a transition is a *click*, not a typing session, so a
   third pass already means something unusual is happening. Five is two plus three of headroom, and it does
   not need to grow with document size, device speed or trip length. If a future phase finds it exhausted in
   the field, that is a defect report about what will not settle, not a reason to raise the number.

   **Exhausting the bound is a refusal, for display as well as for control flow.** It was the one path that
   aborted a transition without telling anyone: `flushForTransition` returned `false`, the caller returned
   `state` unchanged, `status` was still `'idle'`, and no banner reads `'idle'` — so the click did nothing
   and said nothing. Rule 6b's sentence is *"aborts the transition **and tells the user**"*, and this exit
   owes the same debt as the other two. Concretely, the give-up path sets `persistence.status = 'error'` with
   a `lastError` that names what happened — *"Couldn't finish saving before switching. Your edit is still
   here."* — so the **existing** error banner renders, offering the two recoveries it already offers (retry,
   export this copy). Not `'conflict'`: nothing refused the write and there is no other writer to merge with,
   so offering a merge would be a lie about what went wrong. No new UI mechanism; §4.2 rule 6b's refusal path
   already reaches the screen this way and this exit joins it.

   **And the debounce is re-armed when the loop gives up while the document is dirty.** The loop cancels the
   pending timer on every pass (`cancelTimer()`), including the pass on which it gives up — so before this
   ruling the store was left dirty, `'idle'`, and with **no scheduled write at all** until the user's next
   keystroke. Cancelling work the user's own edit had scheduled and not putting it back is a bug on its own
   terms, independent of the banner. So: on the bound-exhausted exit, if `dirty()`, re-arm the ordinary
   debounce.

   Re-arming automatically is the right shape, and the alternatives are worse for stated reasons. A
   "Retry" button alone leaves a dirty document with nothing scheduled, which is the defect. A dedicated
   retry loop with backoff is a second scheduler on the write path, and §4.2 has one. What is re-armed is the
   **ordinary** debounced `attemptSave`, not another `flushForTransition`, so it cannot recurse into the loop;
   if that write also leaves the document dirty it re-arms only through the normal `scheduleSave` path, which
   is what typing does anyway. When it lands, `status` returns to `'idle'` and the banner clears — the message
   is honestly transient. **The transition is never retried automatically**: the user clicks again. An app
   that navigates by itself some seconds after a click the user has already given up on is worse than one
   that does nothing.

   **The other two exits do not re-arm, and this is a three-way rule the builder must not flatten.** On
   `'conflict'`, a re-armed autosave would spin against a fence that will refuse it every 400 ms; the user
   must merge or export. On `'error'`, the port is failing and the banner's Retry is the deliberate act. Only
   the bound-exhausted exit re-arms, because it is the only one where nothing has actually refused anything.
   In all three, `isDirty()` stays true, the indicator does not read "Saved", and the edit is still in `doc`.

   **6b. If the flush cannot succeed, the transition does not happen.** A refusal (`'conflict'`) or a storage
   failure (`'error'`) aborts the switch: the old document stays active, still holds the edit, the indicator
   does not read "Saved", and the screen names the two things the user can actually do — merge with the
   stored copy, or export this copy. *Discarding the edit with a notice would satisfy the letter of "the app
   says so" and violate the product: this is a local-first, single-owner app whose stated conventions are
   that the user's content is authoritative and that conflicts are surfaced rather than resolved by guessing.
   Blocking is only tolerable because it is rare — it fires when a write genuinely cannot land, not on every
   navigation, which is why "flush" and not "prompt" is the default path.*

   **6c. `deleteTrip` of the active trip is the one exception, and it is explicit.** The pending timer is
   cancelled *without* writing and the transition proceeds — the user asked for that document to be
   destroyed, and 6b would otherwise make a conflicted trip undeletable. The delete confirmation names the
   trip.

   **The exception is about not *writing*. It is not about not *ordering*** (revision 5, QA R7-3). The
   parenthetical this rule used to end on — *"a stray timer surviving a delete would be harmless anyway: its
   expectation matches no record"* — was wrong, and wrong in the direction that costs data. A write already
   queued on the store's serialization chain can settle *after* `ports.storage.delete(id)` returns; an
   expect-absent write (`expectedVersion: null`) is then **satisfied** by the record's absence, so it
   succeeds, `upsertSummary` puts the library row back, and the trip is resurrected with the delete silently
   undone. QA measured it: `in storage=true in library=true`. It is not reachable through the shipped UI
   today, and that is luck, not design.

   So: **`delete()` goes on the serialization chain, as a link of its own** — §4.3. `deleteTrip` does not
   merely `await saving` and then call the port. `await saving; ports.storage.delete(id)` is a check-then-act
   with an interleaving point in the middle, which is §0.6's error one level up from where §2.2a found it:
   between the await resolving and the call, another link can be appended and land concurrently with the
   delete. Putting the delete *on* the chain gives the store one total order over every mutation it issues,
   which is the property `chainOntoSaving` already exists to provide. The link is *"drain, delete, forget"*
   and all three happen inside it: the port delete, the library row removal, and — when the deleted trip was
   the active one — the reset of `doc`, `savedDoc` and `savedVersion`, so that no later link can observe a
   half-deleted store or write against a fence pointer for a trip that no longer exists.

   None of that reopens the exception: the *active* trip's pending timer is still cancelled without writing,
   so the queue the delete link drains contains only writes the store had **already committed to** before the
   user asked for the deletion, and a conflicted trip is still deletable — a refused write ahead of the delete
   in the chain reports its own failure and the delete still runs behind it.

   Belt and braces, because a timer that fires late must not be able to hurt anything: **a scheduled save
   captures the trip id it was scheduled for**, and if `state.doc` is no longer that trip when it fires, it
   is dropped rather than retargeted at whatever is now open. Revision 2's `attemptSave` read `state.doc` at
   execution time, which is how trip A's pending write came to be executed against trip B.

   **Leaving the page is the same case, and the platform will not fully cooperate.** `apps/web` registers
   `visibilitychange` → `hidden` *and* `pagehide` (deduped) and calls `store.flush()` from both, and
   registers a `beforeunload` handler that calls `preventDefault()` while `isDirty()` so the browser shows
   its own "Leave site?" prompt. Verified, and stated as the limitation it is: `hidden` is the last state
   transition a page can reliably observe, `pagehide`/`beforeunload`/`unload` are *not* reliable on mobile,
   Safari does not always fire `visibilitychange` when the user clicks a link away, and the `beforeunload`
   dialog requires sticky activation — satisfied here by construction, since the user typed the edit.
   Crucially, an unload handler **cannot await an asynchronous IndexedDB write**, so the page-exit guarantee
   is "flushed at the last point the platform reliably offers, plus a native prompt if the user leaves
   dirty" — nothing stronger, and the criterion says so rather than pretending. The real guarantee is 6a/6b,
   which covers every in-app transition and needs no cooperation from the browser at all.

### 4.3 Ports — the honesty-to-native mechanism

```ts
type StorageVersion = string;                               // opaque; equality only — §2.2a
type StoredDoc      = { doc: TripDoc; version: StorageVersion };
type SaveOutcome    = { ok: true;  version: StorageVersion }        // the version now in storage
                    | { ok: false; storedVersion: StorageVersion | null };  // null = nothing stored

interface StoragePort { listTrips(): Promise<TripSummaryRow[]>; load(id): Promise<StoredDoc|null>;
                        // EVERY mutation below is issued from inside the store's serialization
                        // chain — `saveIfVersion`, `refreshSummary` and `delete` alike. §4.2 rule 6c,
                        // QA R7-3. The grep's exemptions are `listTrips` and `load`, and no others.
                        // ATOMIC compare-and-set. `expectedVersion: null` means "nothing stored yet".
                        // A refusal is `{ok:false, storedVersion}`, not a throw — storage is healthy.
                        // MUST mint a fresh, never-reused version on every success (§2.2a rules 1-2).
                        saveIfVersion(id, expectedVersion: StorageVersion|null, doc: TripDoc,
                                      summary: TripSummaryRow): Promise<SaveOutcome>;
                        // A-30, revision 23. The SAME atomic compare-and-set, writing the summary row
                        // and nothing else. No `doc` argument — structurally incapable of a document
                        // write. MUST NOT mint: the record's version is unchanged on success (§2.2a
                        // rule 1 as narrowed). `expectedVersion` is NOT nullable and an absent record
                        // is refused — a summary may never exist without its document.
                        refreshSummary(id, expectedVersion: StorageVersion,
                                       summary: TripSummaryRow): Promise<SaveOutcome>;
                        delete(id): Promise<void> }
interface FilePort    { exportDoc(name: string, bytes: Uint8Array): Promise<void>;
                        importDoc(): Promise<{ name: string; bytes: Uint8Array } | null> }
interface MapPort     { mount(el, points, bounds): MapHandle; refit(handle, bounds): void;
                        setVisible(handle, visible: boolean): void }
interface ClockPort   { today(): IsoDate }
interface IdPort      { newId(): string }
```

**The chain's subject is every `StoragePort` mutation, not every write** (revision 5, QA R7-3). `store.ts`'s
`chainOntoSaving` is the sole gateway for **all** storage mutations — `saveIfVersion`, `refreshSummary`
(A-30, revision 23) *and* `delete()` — so
the store issues at most one mutation at a time and in a single total order. A mutation that reaches the port
without going through it is a defect, and the criterion greps for it: every `ports.storage.*` call that is
not `listTrips` or `load` appears lexically inside a `chainOntoSaving` callback. The reason it must be the
port and not "the writes" is that the two kinds of mutation contradict each other — a delete makes a record
absent, and an expect-absent write is *satisfied* by absence, so the only thing standing between them is
their order.

**The port no longer parses the document to run the guard.** `revisionOf(doc)` is deleted: the fence is the
envelope version, so a truncated or corrupt record no longer decides its own refusal behaviour. Every
implementation is also responsible for the one-time upcast of §2.2a — stamp a fresh version onto any record
that lacks one, at open, before serving a read.

**And the port mints from nothing it remembers** (§2.2b F3, QA R4-2). The path from entering `saveIfVersion`
to returning `version` may read only parameters, locals, and values read inside the same atomic step. A port
may memoise *that* its one-time upcast has run — `ensureReady`'s `Promise<void>` carries no value, and a
stale one is harmless because the only records that need stamping predate the fence and cannot appear after
it. It may not memoise a value the token is built from, which is what `epoch` was. `apps/web` mints 16 bytes
from `crypto.getRandomValues`; the in-memory port mints from a per-instance prefix and its own counter;
Phase 2's server mints an `ETag`; Phase 4's SQLite bumps a counter inside `BEGIN IMMEDIATE`. All four satisfy
§2.2a rule 2 by argument (a) or (b), and each must be able to say which.

`apps/web` implements them with IndexedDB, download + file input (the File System Access API is Chromium-only
— §1.1), and Leaflet. `apps/mobile` implements the same interfaces later with `expo-sqlite`,
`expo-file-system` + the share sheet, and MapLibre. **`apps/web` and `apps/mobile` differ only in port
implementations and view components** — the store, the selectors and every rule above are shared from day
one, so Phase 4 does not rewrite state management.

`packages/client` and every reducer test run **in plain Node with in-memory ports**. That extends the
tester's no-browser reach from the model to the state machine, which is the point of putting the store here
rather than in `apps/web`.

#### A-30 — a summary refresh is not a document write, so it may not move the document's fence (revision 23, QA R26-6)

**Part 1 — the defect, stated one level up from where it was found.**

I-6 brings a stale row current by rewriting the whole record:
`saveIfVersion(id, stored.version, toJSON(doc), summary)`. The document bytes going in are the bytes that
came out — nothing about the trip changed — but `saveIfVersion` mints, because minting on every success is
the only contract it has. The bill, reproduced by round 26 with two stores over one storage: tab A holds
trip Y open and idle; tab B boots and runs `App.tsx`'s ordinary `refreshLibrary()` → `rescanSummaries()`;
tab A's next keystroke is refused with the full `CONFLICT_MESSAGE`, over a stored copy whose document is
byte-identical to the one tab A is holding. A conflict banner and a *Merge* button, with nothing to merge,
raised by a background pass with no user on the other side. At the forty-row scale §8.4 clause 3 is written
for, the same pass is also ~40 full document rewrites of ~230 KB each on a single boot.

**The finding files this as "the rescan writes even when the row is unchanged". That is the smaller half.**
The rows the rescan exists for are *below* `SUMMARY_VERSION`, so their recomputed row is **not** unchanged —
it differs in at least `summaryVersion`, which is the field the whole mechanism turns on. Tab B's write in
the reproduction above is a **necessary** refresh, and it is that necessary refresh which moved tab A's
fence. The defect is not the redundant write. It is that a summary refresh moves the document's fence at
all.

**Part 2 — the ruling.**

> **The fence fences the document.** Equality of a `StorageVersion` asserts that the document bytes under
> that id have not changed since the token was issued, and asserts nothing about the summary row stored
> beside them (§2.2a rule 1, as narrowed at this revision). A write that can change the document MUST mint.
> **A write that changes only the summary MUST NOT**, and `StoragePort` gains one for it:
>
> ```ts
> refreshSummary(id: string, expectedVersion: StorageVersion,
>                summary: TripSummaryRow): Promise<SaveOutcome>;
> ```
>
> The comparison, the write and the return happen in **one atomic step**, exactly as `saveIfVersion`'s do
> and for exactly R2-1's reason. It writes the summary row and nothing else: the document is not read for
> content, not parsed, and not written. `expectedVersion` is **not nullable** and an absent record is
> refused with `{ok: false, storedVersion: null}` — a summary row may never exist without the document it
> is about, so this method can neither create a record nor resurrect a deleted one. On success it returns
> `{ok: true, version: expectedVersion}`: the version now in storage, which is the one it was handed.

**§8.4 clause 1's *"and no port method changes"* is amended by name.** That sentence was written when a
summary was only ever computed inside a document write, which was true until I-6 introduced a second
occasion — a refresh with no document change. What clause 1 was actually protecting survives intact and is
restated as the invariant: **a summary is computed only from the document it is about, inside the same
chained step that read or wrote that document.** `refreshSummary` cannot violate it, because it carries no
document argument; there is nothing in its signature to write a summary *about*.

**Part 3 — what the rescan becomes, and the property that is replaced.**

`runRescan`'s per-row link, inside one `chainOntoSaving` callback, becomes uniform for every row:
`load(id)` → `fromJSON` → `tripSummary(doc, COUNTRY_INDEX)` → `refreshSummary(id, stored.version, summary)`
→ upsert the library row. No `toJSON`, no `saveIfVersion`, and **no `attemptSave` branch**. §8.4 clause 3's
four properties are unchanged except the fourth, which is replaced:

> **4. The rescan never writes a document — not even the active one — and therefore never moves a fence.**
> The row is computed from the document **storage holds**, read in the same chained step, because a
> `TripSummaryRow` is a fact about the *stored record*: `listTrips()` is what serves it. `state.doc` is not
> consulted by this path, so a half-typed title is no longer flushed to storage ahead of its own debounce,
> and an unsaved edit is never described by a row. The next autosave recomputes the row from the document
> it writes, exactly as it always has.

Four things this settles, each stated because a reader will otherwise re-derive it:

1. **§2.2a A-7 is untouched and gets easier.** A-7 governs the fence a *declined write* may not move. The
   rescan now has no document write to decline, and `refreshSummary` moves no fence in any outcome. **BUILD-NOTES
   KD-57's entire subject — whether `writeAndSettle` may be aimed at a non-active document — disappears**,
   because the rescan no longer has a document write to aim anywhere. Round 26 confirmed KD-57's analysis
   was correct; A-30 removes the question rather than answering it again.
2. **This subsumes QA R26-4.** With `attemptSave` out of the path, `state.persistence.savedVersion` is not
   in it either, so a trip sitting in `'conflict'` has its row brought current from the stored document —
   the conflict is about the user's in-memory edit, the row is about storage, and neither needs the other
   resolved first. **R26-4's proposed one-line `status === 'conflict'` skip is NOT implemented**; the
   builder verifies convergence and the absence of banner flicker with R26-4's own repro
   (`qa/i6-race.mjs` §E) instead.
3. **R26-1, R26-2 and R26-3 are unaffected and are implemented as routed.** A-30 changes what one link
   *writes*; those three are about what the pass *remembers* between links and passes. A-30 is deliberately
   compatible with §0.6's answer to them — a pass that re-derives its outstanding, unreadable and deleted
   state from storage on every pass rather than trusting an end-of-pass snapshot — because the uniform link
   above holds no cross-row state at all.
4. **No §4.2 rule changes, and the ceiling moves the right way.** The closed list of six document-installing
   store methods is still six and the rescan gets *further* from it: the pass now emits only `library` and
   `rescan` updates, and no longer reaches `persistence` through `attemptSave`. The retirement ledger is not
   in the path. The §4.3 chain grep's exemptions stay `listTrips` and `load`, and **`refreshSummary` is not
   exempt**.

**Part 4 — why not "skip the write when the row is unchanged", which is what the finding asks for.**

Refused, for three reasons in the order that decides it:

1. **It never fires where the defect is.** If the comparison includes `summaryVersion` — and it must, since
   that stamp is the entire subject of the rescan — then a row selected by `needsRescan` is by construction
   *changed*, so the skip cannot fire on the case round 26 reproduced. If the comparison **excludes** the
   stamp, the write is skipped, the stamp is never brought current, `needsRescan` selects the same row on
   every pass and on every boot forever, and `summaryScan` is pinned at `'stale'` — R26-3's permanent-row
   shape, manufactured deliberately.
2. **It needs a fact the pass does not hold.** `load()` returns `{doc, version}`; the stored *row* is not in
   it. Comparing against `state.library`'s copy is reading a fact about a resource somewhere other than
   where the resource stated it — §0.6, and the root cause of four of round 26's six findings. Getting it
   honestly means widening `StoredDoc` and both port implementations, for a comparison whose only firing
   case is a cross-tab race.
3. **Under A-30 the redundant write costs nothing worth a mechanism**: an idempotent put of a small row, no
   document bytes, no fence movement, in a race that resolves the same way whether or not it happens.

**And so the question is closed rather than left open, here is what "unchanged" would have had to mean** if
a future increment ever wants one: field-by-field structural equality over every declared field of
`TripSummaryRow` **including `summaryVersion`**, arrays compared elementwise, `cities` compared elementwise
by `{key, name, countryCode, countrySource}`. **Never `JSON.stringify`** — its answer depends on key
insertion order, so it would compare a row minted here against a row that came back through an adapter's
serializer and call two equal rows different, or drift the day a field is added in a different position.

**Part 5 — what a builder implements. Two port implementations, one store function, five tests. No engine.**

1. **`packages/client/src/ports/types.ts`** — the method above, with its contract as a docstring. `StoredDoc`,
   `SaveOutcome` and `StorageVersion` are unchanged; `SaveOutcome`'s *"the version now in storage"* comment
   gains one sentence saying that for `refreshSummary` that is the unchanged expectation.
2. **`packages/client/src/ports/memory.ts`** — one synchronous block, **no `await`**, for the same reason
   `saveIfVersion` has none: `summaries.set(id, summary)` only, `docs` and `versions` untouched. It gets its
   own counter, `refreshCount`, and **does not bump `saveCount`** — a test asserting "no document was
   written" has to be able to say so. `failAll` applies to it (a broken port is broken for everything); a
   new `failNextRefresh` is the injectable failure for this path, and `failNextSave` keeps meaning
   `saveIfVersion` alone.
3. **`apps/web/src/ports/storage.ts`** — one `readwrite` transaction over `[DOCS, SUMMARIES, VERSIONS]`,
   with every request issued from the previous one's `onsuccess` exactly as `saveIfVersion` does it:
   `DOCS.getKey(id)` for existence, `VERSIONS.get(id)` for the compare, then `SUMMARIES.put(summary, id)`
   and **no put on `DOCS` and no put on `VERSIONS`**. `ensureReady()` first, as everywhere else.
4. **`packages/client/src/store/store.ts`** — `runRescan`'s link as Part 3 states it, and the `if (state.doc
   && state.doc.id === id)` branch deleted. The docstring's property 4 is replaced with Part 3's wording.
5. **The tests, and §0.5's injected fault for each rule this ruling adds:**
   - **(a) the fence does not move.** Two stores over one `memoryStorage`. A opens trip Y and idles at
     version *V*, captured through the port's own `versions` map — never asserted as a literal (§2.2a rule 3's
     corollary). B boots, `refreshLibrary()` + `rescanSummaries()`. Assert: `versions.get(Y)` is still *V*,
     `docs.get(Y)` is byte-identical, `saveCount` did not move, and A's next edit and flush settle `'idle'`
     with no `'conflict'`. **Mutation: restore the `saveIfVersion` rewrite in `runRescan` → red.** This is
     the assertion whose absence let R26-6 ship.
   - **(b) the row is still brought current.** Same setup: after the pass, `listTrips()` shows Y at
     `SUMMARY_VERSION` carrying its own countries, and `summaryScan(state).phase` reaches `'complete'`.
     **Mutation: make `refreshSummary` a no-op → red.**
   - **(c) a refresh can neither create nor resurrect.** `refreshSummary` against an id with no document is
     refused and `listTrips()` does not grow; a delete landing between the pass's `load` and its
     `refreshSummary` leaves the trip deleted. **Mutation: drop the existence check → red.**
   - **(d) the chain still binds it.** The §4.3 structural grep exempts `listTrips` and `load` only;
     `refreshSummary` hoisted one frame out of its `chainOntoSaving` callback turns it red.
   - **(e) the active trip in `'conflict'` converges** — R26-4's own repro, `qa/i6-race.mjs` §E, re-run:
     the row reaches `SUMMARY_VERSION`, `persistence.status` never leaves `'conflict'` and never flickers
     through `'saving'`, and the user's in-memory edit is intact.

**Part 6 — the residue.** A `refreshSummary` and a `saveIfVersion` for the same record can race, and the
loser is refused rather than merged — which is correct and is the same fence doing the same job: the
refresh's expectation is the version its own `load` returned, so a document write landing in between refuses
it, and the rescan does not retry over another writer's work (§8.4 clause 3 property 3, unchanged). The
refused row stays below the version and is picked up by the next pass. **Trigger to reopen:** a storage
implementation that cannot make the compare-and-put atomic without also touching the document — none of the
four named in §4.3 has that shape, and a port that cannot be atomic must reject rather than write
optimistically, which is already the contract.

### 4.4 The map contract

**The client never computes bounds.** It calls `focusCluster` / `fitSpanKm` and hands `MapPort` a bounds
object. Both live map bugs from `CLAUDE.md` become structurally impossible: the day map's cluster focus and
its min-span guard live in core (§2.5), and `setVisible(handle, true)` triggers a `refit` — a port
implementation MUST no-op while its container has zero size and re-fit when it gains one. Leaflet cannot
compute a zoom against a `display:none` container, and this is the contract that stops that from being
rediscovered on every surface.

### 4.5 What Jacob can do at the end of Phase 1

- **Trip library:** create, duplicate, rename, delete, export JSON, **restore from a backup** (§2.14 — his
  own exports only; a foreign `ownerId` is refused with a message, and a restore never overwrites a stored
  trip), switch between trips. "New trip" takes a title, a date range, a home base and a list of cities and
  produces a dense day skeleton.
- **Browse another trip, and copy a stop out of it** (§2.14). A read-only pane over a second trip in the
  library; one control copies a stop into the open trip, where it appears immediately badged as imported and
  credited to the source trip. This is the pillar-3 path in the shape Jacob described it, and it is a real
  Phase 1 feature: it is how the second trip reuses the first one's work.
- **Day view:** the timeline with legs, times, costs and badges; add / edit / remove / retime / reorder
  stops; move a stop to another day; pool ↔ plan both ways, losslessly.
- **City tabs** grouped from `Day.cities`, exactly today's nesting.
- **Maps:** the day map with cluster focus and the "whole day's journey" toggle; the city map from `places`.
- **Conflicts panel:** every `Conflict` with both sides stated and acknowledge/dismiss writing a
  `ConflictResolution` — never an auto-fix.
- **Validation panel:** `validateTrip` issues, including the geo sanity check.
- **Provenance visible everywhere** via `displayStatus`: suggested, candidate and imported are always badged.
- **Europe 2026 loads as a built-in sample trip**, derived from the adjacent HTML at build time (§2.11).

**The spine, if time runs short.** The builder's own rule is *runnable beats complete*. May be stubbed and
called out: drag-reorder (buttons are fine), the city map (the day map is the one that matters), duplicate
and rename, any new-trip wizard beyond title + dates, and the browse-another-trip pane reduced to a plain
list of the other trip's stops with a "copy" button beside each. **May not be stubbed:** multi-trip
switching, stop editing, the day map, the conflicts panel, JSON export and backup-restore, and the copy
path's provenance badge and credit line — without those the phase has not delivered what Jacob asked for.

---

## 5. The four hard subsystems

### 5.1 Email ingestion

**Flow.** User connects a mailbox → `services/api` stores an encrypted refresh token (KMS; never in the
database in plaintext, never on a device) → `services/ingest` polls incrementally (Gmail `history.list`
after the first sync) → a sender/subject filter narrows to plausible booking mail → parsers (structured
JSON-LD first, then per-operator, then generic) extract fields → each match becomes an **`IngestCandidate`**:
extracted fields, a ≤500-character evidence snippet, the `messageId`, and a proposed target → the user
reviews → accepting writes a `Booking` and/or `Stop` with `{source:'email', state:'accepted',
confidence:'confirmed'}`. Attachments are fetched **only on acceptance**.

**Failure mode that matters most: a confident wrong parse that silently overwrites a correct plan.** The
Smartwings reissue is the live example — same reference, different ticket number, different date. A naive
parser updates the existing booking and Jacob's Aug 15 quietly changes. The answer is structural:
ingestion **can only create candidates** and has no write path to `stops` or `bookings` at all, enforced by
database grants (§3). A candidate matching an existing booking on `operator + reference` is presented as a
*reissue*, both versions side by side, diff highlighted, user picks. `HISTORY.md` Pass 5 is what happens
when software infers this instead.

**Secondary failure: the OAuth wall** — now confirmed as a hard gate on going public. §6.4 has the verified
rules and the resulting provider order.

### 5.2 Social graph and sharing permissions

**Flow.** `Friendship` is a bidirectional accepted edge. `TripShare` grants a principal (a user, or a link
token) `viewer | commenter | editor` on a trip, with `expiresAt` and `revokedAt`. `TripMember` is
co-ownership.

**What crosses between two people is one stop at a time.** Jacob's answer settles this: friends build their
own itineraries in the app and take individual activities from each other's. A share makes a trip
*readable*; `copyStopInto` (§2.14) is the only way anything moves. `forkTrip` is cut, and so is the
`TripFork` entity — a whole trip is the primitive applied N times. The credit link is `Provenance.origin`,
it is written by the copy and never by anything else, and it survives acceptance. Because the copy path is
already built and exercised in Phase 1 against two local trips, Phase 2 adds a source of trips, not a
mechanism.

Enforcement is two-layer: pure predicates in `core/access` that the API calls, **and** Postgres RLS that the
database enforces regardless. A conformance test generates the full (principal × relationship × operation)
matrix and asserts predicate and policy agree on every cell; disagreement fails the build. §6.2.

**Failure mode: revocation is not retroactive.** A revoked friend cannot fetch again, but bytes already on
their device are beyond recall. Two responses. (1) Honest scope: a share sends a **snapshot at share time**,
not a live feed, so exposure is bounded by what was true then. (2) Client contract: cached shared trips carry
`shareId` + server ETag and MUST revalidate on open with a **hard fail — a revoked share renders an error,
never stale content**, even offline. The tester should attack exactly this: pull a share, revoke it, go
offline, reopen. The correct behaviour is a refusal.

### 5.3 Location tracking

**Flow.** Native only. `expo-location.startLocationUpdatesAsync` with a TaskManager task writes fixes to
local encrypted SQLite (balanced accuracy, ~25 m distance filter; iOS `UIBackgroundModes: location`,
Android a foreground service with a persistent notification). On-device, `segmentTrace()` — pure, in core —
turns fixes into dwell and travel segments; dwell segments near a stop within its window become an
`observedAt` annotation. Nothing is uploaded. If the user taps *share today's path*, the device runs
Douglas–Peucker simplification (~50 m), drops fixes inside a configured private radius, and uploads a
**`SharedTrace`**: one polyline, one day, one trip, readable only by that trip's members.

**Failure mode: iOS silently stops the task and the map draws a straight line across the Adriatic.** iOS
kills background tasks under memory pressure and the user may downgrade *Always* to *While Using* mid-trip.
So a trace is **inherently gappy** by design: segments carry `confidence` and explicit `gap` markers, and the
renderer draws gaps as dashed and unclaimed rather than interpolating. A trace that pretends to be continuous
is worse than one that admits holes — the same principle as flagging conflicts instead of guessing. Android's
counterpart is OEM battery managers killing foreground services; detect a long gap on resume and say so.

### 5.4 Photo association

**Flow.** Native only. With library permission, `getAssetsAsync` enumerates assets created inside the trip
window — **identifiers and timestamps only, no bytes**. `getLocationAsync`/`getExifAsync` give coordinates
(Android additionally needs `ACCESS_MEDIA_LOCATION` or they come back empty *with no error* — the single most
likely silent bug in this subsystem). `suggestPhotoStops(assets, day, trace)` scores on-device by time
window, then distance, then the trace, returning suggestions with a confidence and a reason. Suggestions are
`{source:'system', state:'candidate'}` — they show as suggestions until accepted. Accepting a photo *into a
shared trip* uploads that one image with **EXIF GPS stripped before upload** unless the user opts in per photo.

**Failure mode: a photo with no EXIF at all** — screenshots, saved images, anything through a
metadata-stripping app, and on Android *everything* if the permission is missing. The matcher degrades to
time-only with reduced confidence and never asserts a location it does not have. Second failure mode is a
privacy one: iOS 14+ limited-library selection returns a partial library; work with what is granted and say
so, never nag for full access.

---

## 6. Privacy, authorization, and the public-grade line

Jacob's posture: **public-grade on what is expensive to retrofit, friends-grade on everything else.** Four
things qualify. They are §6.1–§6.4. §6.5 lists what is explicitly *not* being built.

### 6.1 What is stored where

| Data | On device | Reaches the server | Never transmitted |
|---|---|---|---|
| **Raw location fixes** | encrypted SQLite, kept until trip end + 30 days, one-button wipe | **nothing** — no batch, no crash report, no analytics event | the fix stream, in every phase |
| **Dwell/visit inference** | computed on device | only the *result* if attached: `{stopId, confidence}` | the coordinates and times behind it |
| **Simplified day trace** | derived on demand | only on an explicit per-day share: one polyline, one trip, members only, deletable | anything outside the shared day |
| **Private-zone fixes** | excluded before simplification, by radius | never, even inside a shared day | — |
| **Photo library index** (ids, timestamps, GPS, thumbnails) | in memory / local index | **nothing**, in every phase | the index |
| **A photo attached to a shared trip** | original stays in the library | that one image + `stopId`, **EXIF GPS stripped by default**, per-photo opt-in to keep it | every photo not explicitly attached |
| **Mailbox refresh token** | never on a device | encrypted under KMS, decryptable only by `services/ingest` | to any client, ever |
| **Message bodies** | — | a scan buffer, encrypted, **deleted within 24 h of parsing** | retained bodies, mailbox-wide search, any body content in logs |
| **What survives a scan** | — | `messageId`, sender, date, extracted fields, and a **≤500-char evidence snippet** so the user can see *why* we proposed something | the rest of the message |
| **Ticket attachments** | — | fetched and stored **only after acceptance**; private bucket, signed URLs ≤15 min | attachments of rejected or unreviewed candidates |
| **Friends' itineraries** | cached only while the share is live; revalidated on open, hard-fail on revoke | — | — |
| **Access credentials inside itinerary prose** — door PINs, booking references, ticket URLs | in the user's own trip, where they belong | only inside that user's own tenancy | **never into a build artifact** — §6.6 |

Cross-cutting rules the tester should treat as assertions:

1. **No coordinates in any log line, ever.** Log `stopId`, never `lat/lng`. Same for mailbox content and
   booking references. Grepping the logging paths for coordinate-shaped floats is a legitimate test.
2. **No third-party analytics or crash reporter in `apps/mobile`** while location or photo code is present,
   unless configured with an explicit field allowlist. Default: none.
3. **Nothing about location or photos is server-authoritative.** A full dump of the production database
   contains zero raw traces and zero library metadata. That is the property being bought.
4. Location and library permission prompts state the on-device-only guarantee at the point of asking.

### 6.2 Authorization on every read path

Designed now because retrofitting it is the worst migration in this product.

1. **Every table carries a tenancy column** — non-null `trip_id`, or `user_id` for user-scoped rows. There
   is no table without one. Object storage keys are prefixed `trip/{tripId}/…` so a blob's owner is
   recoverable from its key alone.
2. **RLS is `ENABLE` + `FORCE` on every table, default-deny, with an explicit policy per operation.** The
   API connects as a role **without** `BYPASSRLS`. There is no service-role key in any client bundle, and no
   "internal" endpoint that skips policy evaluation.
3. **`services/ingest` gets its own role**, with insert on `ingest_candidates` and select on `mail_accounts`
   and nothing else. Created in Phase 2, before there is any ingest code to use it.
4. **`core/access` predicates are the definition; policies are the enforcement.** A conformance test
   enumerates (principal × relationship × operation) — owner, member, viewer, commenter, editor, friend,
   revoked friend, stranger, expired link, anonymous — and asserts predicate and policy agree on every cell.
   Disagreement fails the build.
5. **Read paths are covered, not just writes.** The common authz bug is a list endpoint that filters in
   application code; RLS makes the filter unskippable, and the conformance matrix includes list operations.

### 6.3 Deletion and export, as a designed cascade

The invariant: **no row and no blob without a live tenancy reference.** If data can end up somewhere with no
owner, that is a design bug.

| Deleting | Cascades to | The awkward corner |
|---|---|---|
| a **stop** | its photo attachments, its conflict resolutions, its candidate links | a booking referenced by two stops is *unlinked*, not deleted, and marked `orphanedAt` for review |
| a **trip** | days, stops, places, bookings, ticket blobs, shared traces, shares, and the *links* from forks | **a friend's fork is their data.** Deleting your trip must not delete their copy; the credit link resolves to a tombstone, "original deleted" |
| a **mail connection** | token, scan buffer, and every unaccepted candidate, immediately | *accepted* bookings stay — they are the user's data now. `origin.messageId` becomes a dangling reference, which is fine and must not break rendering |
| a **user account** | all owned trips (cascade above), friendships, shares issued and received, push tokens | a co-owned trip transfers to the earliest remaining `TripMember`; with none, hard delete |
| a **device / session** | its local traces, its photo index, its cached friends' trips | the server cannot reach a device. Server-side deletion writes a **tombstone the device honours on next launch**, and a device wipes local data when its session is revoked. State this limit plainly in the UI rather than implying remote wipe |

A nightly sweeper asserts zero orphans across every table and the object store and **fails loudly** — it
alerts, it does not silently delete. Silent deletion of "orphans" is how you lose real data to a bug.

**Export** is user-initiated and produces a zip: `trips/*.json` (core's `toJSON` — the same format Phase 1
already ships), `tickets/*` blobs, `candidates.json`, `shares.json`, and a plain-text README. It is designed
now precisely because `toJSON` exists in Phase 1: export is not a later feature, it is the serializer with a
zip around it.

### 6.4 Mailbox scopes — verified, and what follows

Confirmed at the coordinator's request; sources in §1.1.

- **`gmail.readonly` is a restricted scope. So is `gmail.metadata`.** Google's Cloud Console has historically
  labelled `readonly` as merely "sensitive"; the policy FAQ corrects it. An app's classification is its
  **most restrictive scope**. **There is therefore no narrow Gmail read scope that escapes the restricted
  tier** — "ask for less" is not an available mitigation, which is the one place the coordinator's framing
  was optimistic.
- Restricted scopes **plus** the ability to access data through a third-party server — which our ingest
  worker is by definition — require a **CASA** assessment by a Google-empanelled lab with **annual
  revalidation**. Tiers follow OWASP ASVS: T1 self-assessment, T2 third-party DAST (2026 self-serve fees
  ≈ $540–$1,000), T3 full manual pentest.
- The unverified path ("Testing") needs none of it but caps at **100 test users** and **expires every refresh
  token after 7 days** — directly hostile to unattended polling.
- **Conclusion: Gmail OAuth is a hard gate on going public**, exactly as suspected.
- **Microsoft/Outlook is materially cheaper.** Graph `Mail.Read`; **publisher verification is free** and no
  license is required; it clears the risk-based step-up consent that otherwise blocks unverified multitenant
  apps registered after 2020-11-08. There is **no mandatory third-party security assessment**; Microsoft 365
  Certification (annual independent audit including pentest) is optional and aimed at enterprise/marketplace.

**What this does to the design** — nothing, and that is the point: minimum scope, parse-then-discard, store
candidates not messages. Those are already the privacy design in §6.1, and they are also the three things a
CASA assessment asks about, so the privacy work and the compliance work are the same work. What it changes
is the **order**: forward-to-an-address first (zero scopes, zero verification), Outlook OAuth second (free
verification), Gmail OAuth third (budget, 4–12 weeks, annual revalidation). `ROADMAP.md` Phase 3.

### 6.5 Explicitly not built now

Per Jacob, with a line each on what keeps the door open:

- **Moderation** — nothing is public-by-default and there is no user-generated content between strangers;
  the share model (§5.2) is the hook if that changes.
- **Rate limiting** — none. Tenancy columns and a single API entry point mean it can be added at the edge
  without touching handlers.
- **Billing** — none. No entitlement checks scattered anywhere to unpick later.
- **Admin tooling** — none. RLS + the export cascade (§6.3) means support questions are answerable with SQL
  under a policy rather than a bypass tool that becomes the biggest security hole in the product.
- **Scaling infrastructure** — one region, one database, no cache tier, no queue beyond the ingest worker.
- **i18n** — English only. Kept cheap by §2.1: every core-generated string ships with structured `params`
  beside it, so extraction later is mechanical rather than archaeological.

### 6.6 The shipped sample, and what may not reach a build

`npm run web:build` embedded Jacob's hotel door PIN (`PIN 0754`), booking confirmation `5814731574`, flight
references `YZGDTS` and `IU1TUY`, and two live unauthenticated ticket URLs — `cityairporttrain.com/en/
account/order/9zusk…` and `ulaznice.hr/…/fcvbimxq` — in `apps/web/dist/assets/index-*.js`. Nothing is
committed and nothing is deployed, so there is no exposure today. §7 puts the public share-page host on
that same build in Phase 2.

**Jacob's answer: Europe 2026 stays the demo trip, and credentials never reach a build.** So this is a rule,
applied by a function, covered by a test — not a scrub of the five strings we happen to have found.

**Where it happens.** In `tools/gen-sample.mjs`, between `importLegacyDays` and the JSON write, via one
exported function `redactForSample(trip): Trip` in `tools/redact.mjs`. It never runs inside
`packages/core`, and `importLegacyDays` output is **unchanged** — the CLI, the tests and every golden keep
reading the real trip, so cost and leg parity are untouched. Redaction is a property of the *build
artifact*, not of the model.

**What it covers**, by class:

| Class | Rule |
|---|---|
| **Booking references** | `Booking.reference` → `null`; `Booking.seat` → `null`. The `superseded_booking` demo survives on `operator` + dates. |
| **Tickets** | every `Ticket` → `null`, for all three kinds. A URL is an access credential; an `attachment` names a mailbox message; a `bundled` path points at `tickets/`, which is not deployed and would 404. The stop keeps `flags += 'ticketed'` so the badge still demonstrates. |
| **Free text** — `Stop.note`, `Day.subtitle`, `Trip.title`, `Place.note`, `meta.poolNotes` | passed through a redactor whose patterns live in **one exported array** in `tools/redact.mjs`: a keyword followed by an alphanumeric token (`PIN`, `code`, `conf`, `ref`, `order`, `booking`, `seat`, case-insensitive), any run of 6+ digits with optional spacing (`338 441 5948`), any 6+ character uppercase-alphanumeric token containing both letters and digits (`YZGDTS`, `IU1TUY`, `D8WQHO`), any `https?://` URL, and any email address. Each replaced with `[redacted]`. |
| **Links** | `Stop.links[].href` and any `book.u` survivor → dropped; the label is kept. |

**This table is the *build-artifact* threshold. The *copy* threshold is §2.14 A-15, and the two differ
deliberately (revision 13, QA R14-4).** A build artifact is published to anyone with no user in the loop, so
it drops every href it sees; a copy crosses to one person who is looking at the record they chose, so the
**stop's** links survive and the **place's** do not. Two things that are *not* differences, and that R14-4
found by being treated as ones: this table's *"Free text"* row has named `Place.note` since revision 2 and it
means it on **both** paths, and `OpeningHours.note` belongs in that row too — the sample path already
redacts it, because `redactStringsDeep` redacts every string not under a `STRUCTURAL_KEYS` key, and A-15
adds the field-by-field equivalent on the copy path, which has no such default. **That asymmetry is the
finding**: the sample path fails closed, the copy path failed open, and A-15's key-set assertion is what
makes the next field added to `Place` fail closed too.

**Revision 14 (QA R15-3, §2.14 A-18) closes the same gap one record inward, and records one more deliberate
difference.** Three strings this table's implementation has always redacted — `CostEstimate.note` and
`CostEstimate.display` by the explicit rule in `redactStop`, and `MoveOverride.label` through the deep pass,
since `label` is not a `STRUCTURAL_KEY` — were crossing the **copy** boundary verbatim, because §2.14 rule 5
named `arrival` in a list of fields and a field list is only exhaustive down to the depth it recurses. All
three are now classified on the copy path too. The one **difference** between the paths, disclosed rather
than discovered: the sample redacts `cost.display` **in place**, and the copy sets it to `null` when
redaction would change it, because `[redacted] HUF` is a price that is not a price and the copy has a correct
fallback the sample does not need — `amounts` crosses intact and `costLabel` derives the figure from it. Two
things that are again *not* differences: `Stop.flags` is a `STRUCTURAL_KEY` here and copies verbatim there,
and `Stop.links`/`Place.links` keep the split A-15 disclosed. **This table and `tools/redact.mjs` do not
move at revision 14** — the sample sha is unchanged.

**What it does not cover, deliberately.** Personal prose — *"Morning with your girlfriend's family"* — is
not a credential and is not redacted. The consequence, stated so nobody is surprised by it: the shipped
sample remains recognisably Jacob's trip. That is fine while the build is his own laptop and the Phase 2
share host serves *his* trips. **The day the build serves a public marketing page, the sample must be an
invented trip, and that is a Phase 2 exit condition, not a Phase 1 one.**

**How it is enforced.** Two tests, both in `npm test`:

1. `redactForSample` output is walked recursively and every string is matched against the pattern array;
   any hit fails. Every pattern is exercised by a fixture string, so a pattern that matches nothing is
   itself a failure — the `closed`-rule lesson applied to redaction.
2. When `apps/web/dist/` exists, every emitted asset is grepped for the same patterns and for a literal
   list of the five known strings above. It fails the build, not a review.

And one structural rule that makes the whole class harder to reintroduce: **`apps/web` may import trip data
only from the generated sample file.** There is no import path from `tools/extract-legacy.mjs` into a
bundle, and the dependency-direction test of §3 asserts it.

---

## 7. Explicitly deferred

- **Timezones and UTC instants.** All times are local wall-clock, as today. Real instants are needed for a
  live "up next" across a border and for photo matching (EXIF timestamps are UTC + offset). Deferring means
  **core carries an optional `Day.tzId` that nothing reads yet**, so adding it later is not a schema
  migration. Resolved in Phase 4.
  - **`journey_overrun` waits for it.** With `travelRole` (§2.12) the model can finally say *"this vehicle
    departs at T and runs N minutes, so it arrives at T+N — and the next stop is scheduled before that."*
    On the reference trip that rule fires exactly once, on Aug 21: BA863 departs Budapest 12:55 + 165 min,
    and Bus 8 to Windsor is scheduled 15:15. The plan is correct; the flight crosses CEST → BST and core
    cannot represent that. Specified, evidence recorded, **shipped in Phase 4 with timezones**. Shipping
    time-difference arithmetic on a timezone-blind model is the `closed`-rule mistake with a longer fuse.
- **`TripFork` and a `stop_imports` table.** Cut, not postponed — §2.14. Sharing is stop-level and the
  credit link is `Provenance.origin`. If "what have people taken from my trip" is ever asked for, it is a
  query over provenance, not a new entity.
- **The `closed` rule.** Dropped from Phase 1 (§2.7): no data path produces `Place.hours`, so it cannot
  fire. It returns in the phase that has an hours source — Phase 3 at the earliest.
- **Real-time collaboration / CRDTs.** Phase 2 is last-writer-wins per stop behind the §2.2a version guard. Two people
  editing one stop at once is not a problem tens of users have.
- **Sub-maps of a single stop** (`LOKRUM_PLACES`/`LOKRUM_LOOP`). A curated walking loop *inside* one stop is
  a second nesting level in the model; it stays hand-authored in the old app until something else needs it.
- **Opening hours as a general system.** `Place.hours` exists and one rule uses it, but a full grammar
  (seasonal, holiday, "Thu till 21:00, closed Mondays Oct–May") is its own project. Phase 1 supports simple
  weekly ranges; everything else is unknown, and **unknown never produces a conflict**.
- **Currency conversion.** Core reports per-currency subtotals and refuses to invent rates. A rate provider
  is a Phase 2 concern with a stored `rateSetId` so a total is always reproducible.
- **Booking/payments, chat, recommendation ML, offline map tiles, multi-tenant enterprise** — the brief's
  non-goals, restated so nobody re-adds them.
- **Public share pages with SEO/OG rendering** — the accounts phase. They are the one surface where a
  permission bug is publicly visible, so they get their own attack pass.

*(§8 adds to this list and, in two places, takes something off it. Read §8.8 with this section.)*

---

## 8. The travel-history model — what the next phase adds, and what nothing may foreclose

**Input: Jacob's product thesis of 2026-08-27**, given directly and in full. The product argument — why this
sequencing and not another — is `PRODUCT-VISION.md`. This section is only the part that is a *model*
decision, because that is the part that is expensive to get wrong later.

The thesis in one line: **Cairn is the persistent record of a person's travel life, and a trip does not end
when the itinerary ends.** Three of its ten principles are data-model decisions rather than policy
statements, and they are what this section exists to settle:

- **Principle 2 — planned and observed travel must stay distinguishable.** §8.5. Observation is a separate
  record class; it never mutates a `Stop`.
- **Principle 3 — trip participants, social relationships and location-sharing permissions are separate
  concepts.** §8.3 and §8.7. Five edges, never collapsed, and the first of them ships before any account
  exists so the separation is load-bearing before it is convenient to break.
- **Principle 5 — the lifetime history compounds in value.** §8.4. Every statistic is *derived*; nothing in
  this product stores a count of anything.

**Phase 1 is §2 and §4. The next phase is §8.1–§8.4** — all of it local-first, no server, no device.
§8.5–§8.7 are architected here and implemented in the phases `ROADMAP.md` names. §8.8 is what is refused.
**§8.10 is revision 10** — physical travel distance by mode, and the provenance that makes a distance figure
mean anything. It is **not** Phase 2 scope and nothing in it is built in Phase 2; it supersedes the mileage
bullet in §8.8, which deferred the whole subject before Jacob gave it a shape.

**Revision 26 adds three reservations and no implementation**, from Jacob's clarification of 2026-08-29:
what a share actually grants (§8.7 — *discover → select → add → adapt*, on the `copyStopInto` that already
shipped), conversations on travel objects (§8.8 — and the `Post` that must never exist), and the split
between the engagement feed this product refuses and the derived travel-native surface it reserves (§8.8).
Like §8.10 they are one-way doors written down early; unlike §8.1–§8.4 **no phase builds any of them yet**.

### 8.1 The trip lifecycle is derived. A past trip is a trip whose end date has passed.

```ts
lifecycle(trip: Trip, today: IsoDate): 'planned' | 'active' | 'completed'
```

Pure, in `derive/`, keyed on `today` exactly as the conflict engine's `ctx` already is. **No stored status
field, and a builder must not add one.** A stored `status` is a copy of a fact the dates already state, it
goes stale at midnight with nothing to invalidate it, and §0.6 is the whole of the argument — the same
reasoning that keeps `Leg`, `CostRollUp` and `Conflict` derived.

**Days stay dense.** A three-week trip to Japan in 2019 entered from memory gets 21 empty `Day` rows, and
that is fine: empty days are already a supported, titled, navigable shape (§2.3), `ensureDays` already
mints them, and a `Day` is small. The alternative — permitting `days: []` for "memory" trips — would put a
hole in the one invariant every derive function relies on, to save a few kilobytes.

**One new stored field, and it earns its place:**

```ts
Trip.datePrecision: 'exact' | 'month' | 'year';   // default 'exact'
```

`startDate` and `endDate` remain **real calendar dates** (`invalid_calendar_date` is unchanged), so every
existing rule, derive and golden is untouched; `datePrecision` records only that the user did not know the
exact days — *"Japan, March 2019"* is stored as `2019-03-01 … 2019-03-31, precision:'month'`. It is stored
because it is not derivable and because retrofitting fuzziness onto dates after a user has entered forty
trips is the expensive migration this project keeps choosing to avoid. It is read by **display and nothing
else**: no conflict rule, no derive, no validation may branch on it. It joins `setTripMeta`'s patch
allowlist; it adds no build function.

**The cities on a past trip are typed by a person, in that person's script.** The past-trip form is the
first surface in this product where a city name arrives from a keyboard rather than from a hand-authored
import, which is why §2.2 **A-10** is a Phase 2 ruling: a `CityKey` is a minted opaque id, never a slug of
the name, and cross-trip city identity is derived from the normalised name. A form that mints its own key
is the defect (QA P2-2), not the fix.

**There is no `Trip.kind`, and manually-entered travel needs no new provenance value.** The certainty of a
record is already `provenance.confidence`, and it already means exactly the right things:

| The thesis's phrase | Existing shape | Nothing new needed |
|---|---|---|
| manually entered from memory | `{source:'user', confidence:'asserted'}` | *"a human said so with nothing behind it"* — §2.8's own words |
| imported from a booking | `{source:'email', confidence:'confirmed'}` | we hold the document |
| observed by the device | `{source:'device', confidence:'inferred'}` | **one** new `source` value, and not until §8.5 |
| taken from someone else | `{source:'friend', …}` + `attribution()` | §2.14, shipped |

That is the thesis's *"treat manually entered, imported, and observed travel as potentially different
provenance rather than pretending all data has identical certainty"*, and four fifths of it was already
built. A phase that adds a `Trip.kind: 'past' | 'planned'` has added a second, weaker copy of both the
dates and the provenance.

### 8.2 Conflict rules gain a class: feasibility, or integrity

**The defect this closes, which is live today.** `detectConflicts` was designed against a trip in the
future. Today is 2026-08-27 and the reference trip ended on the 22nd, so the app now tells Jacob — forever
— that his Budapest lodging is missing for a trip he has already taken. Worse for the phase: a 21-day
memory trip in one city with no stops trips `missing_lodging` on every night of it, so **the first thing a
new user sees after entering their first past trip is a wall of warnings about a holiday they finished in
2019.** §0.5 governs: *a blocker is a thing Jacob must act on.* Nobody can act on the past.

**The rule.** Every entry in `RULES` declares its class:

```ts
class: 'feasibility' | 'integrity'
```

> A **feasibility** rule asserts something about whether the plan can happen. It does not run for a subject
> whose day is strictly before `ctx.today`. An **integrity** rule asserts that the data disagrees with
> itself or with the world; it always runs.

| Rule | Class | Why |
|---|---|---|
| `impossible_transfer` | feasibility | you cannot miss a connection you already made |
| `overlap` | feasibility | two things you already did do not clash |
| `missing_lodging` | feasibility | you slept somewhere; the record is merely incomplete |
| `unbooked_ticketed` | feasibility | *"book this within N days"* is meaningless afterwards |
| `booking_vs_plan` | feasibility | it asserts the plan cannot happen as written, which is the blocker definition |
| `legacy_flag` | integrity | the user marked this day themselves; retiring their own flag is not ours to do |
| `geo_outlier` | integrity | a coordinate typo is wrong forever, and the lifetime map now renders it |
| `unverified_reference` | integrity | a reference nobody could verify stays unverified |
| `duplicate_booking`, `superseded_booking` | integrity | two records disagreeing about one thing is a fact about the records |

**Per *subject day*, not per trip.** A trip in progress has past days and future days in the same document,
and a trip-level test would silence tomorrow's missed connection on the strength of yesterday's. The
subject's day is exact; the trip's lifecycle is not.

**Three edges the sentence above does not settle, ruled here rather than left to the builder** (revision 10,
written for the increment that implements this — the shipped `Conflict` carries `subjects: Ref[]`, plural,
and three of the ten rules emit more than one):

1. **A conflict is suppressed iff *every* subject resolves to a date strictly before `ctx.today`.** One
   subject on or after today keeps the whole finding. The asymmetry is deliberate and it is the safe
   direction: a `booking_vs_plan` between a past booking and a future day is still something Jacob can act
   on, and §0.5 is the test — suppression must never remove a finding somebody could still do something
   about.
2. **A subject that resolves to no date resolves to `trip.endDate`.** `{kind:'trip'}`, `{kind:'place'}` and
   a pool stop have no day of their own. Falling back to the trip's end date means a wholly-past trip goes
   quiet — which is the point of the whole ruling — while a trip that has not ended keeps every one of its
   trip-level findings. `{kind:'day'}` is its own date, `{kind:'stop'}` is its day's date, `{kind:'booking'}`
   is `startsAt.date`.
3. **With no `ctx.today`, nothing is gated.** `DetectOpts.today` is already optional and rules that need a
   horizon already skip themselves without it; the gate inherits that rule rather than inventing a default
   clock, which core is forbidden from having anyway (§2.1). **The goldens run at `FIXTURE_TODAY =
   2026-08-01`, which is before the reference trip starts**, so every subject in them is in the future and
   the gate is a no-op on the golden clock *by construction* — which is why "every Phase 1 number is
   re-derived unchanged" is an achievable ceiling and not a hope. A run that moves one has classified a rule
   wrongly, exactly as the criterion says.

**The gate does not decide anything about a stored resolution — §2.7 A-9 (revision 11, QA P2-1).** A
conflict the gate withholds has not been fixed, so it must not retire the user's dismissal of it;
`syncResolutions` therefore evaluates retirement against the **un-gated** set. Read A-9 before touching
either side. One consequence lands inside a rule: `unbooked_ticketed`'s `delta < 0` guard is this gate,
re-implemented in a rule, and A-9 deletes it.

**Revision 12 corrects the sentence that used to end that paragraph** (*"…so the gate is the only
clock-driven suppression in the system"*). It was not: `unbooked_ticketed`'s far-future horizon was a second
one, inside `rule.run` where `detectUngated` cannot disable it, and a device clock stepping **backwards**
across it retired a live dismissal (**§2.7 A-11**, QA R13-1). The horizon is now a `Rule.horizonDays` field
applied here, in the gate, as a second suppression under the same `gate` conjunct — so the sentence is true
by construction rather than by claim, and the property it was standing in for (*the un-gated set's ids are a
function of the document, not of the clock*) is asserted by a clock sweep. A second revision-12 addendum
lives on the other side of the same conjunct: a rule that **crashed** contributes *unknown*, not *absent*,
and `syncResolutions` retires nothing from a detection in which any rule threw (**A-12**, QA R13-3).

**Two ceilings, and the second is the one that will be got wrong.** (1) The goldens run at a fixed clock
(§2.1 — no ambient time), so **every number in ROADMAP §C must be re-derived and unchanged**; a run that
moves them has classified a rule wrongly. (2) `booking_vs_plan` going quiet on a completed trip is a
deliberate loss, and it is named here rather than discovered: for a trip that has happened, *"the booking
says the 15th and the plan says the 14th"* stops being a feasibility question and becomes a **history
accuracy** question — which is a real question, and it is answered in the phase that has observed data to
answer it with (§8.5), not by leaving a rule firing where nobody can act on it.

### 8.3 Participants — principle 3's first entity, shipped before there is anything to grant

```ts
type Participant = {
  id: ParticipantId;
  displayName: string;
  kind: 'self' | 'contact';
  userId: UserId | null;     // null until that person has an account AND the user links them
  note?: string;
};

Trip.participants: Participant[];   // ordered; at most one 'self'; 'self' is trip.ownerId
```

**Participation grants nothing. Not a read, not a comment, not a coordinate.** A participant is a statement
about *who was on the trip*; access is `TripMember` and `TripShare`; visibility of a location trace is
`LocationShare`; a social relationship is `Connection`. Five edges (§8.7), and Jacob's girlfriend's family
are participants with no row in any of the other four. This is principle 3 as a schema rather than a
sentence, and it ships now precisely because there is nothing to grant yet — the separation is free today
and is a migration the day it is not.

**Embedded in the document, not a second persisted structure.** The alternative — a store-level people
record — buys cross-trip identity and costs a second storage record, its own place in the §6.3 cascade, its
own export/round-trip parity, its own migration and its own index that can drift from the documents. That
is A-5's rejected option, verbatim, and it is rejected here for the same reasons. Embedding gives
round-trip parity, deletion and undo for free.

**Cross-trip identity is therefore derived, and the view says so.** *"People you have travelled with"*
groups by `userId` where it is non-null and by a normalised `displayName` otherwise, and the surface states
that it is grouping by name. Two spellings of one person are two people until one of them is linked to an
account. Named limitation, not a silent one.

**Not in this phase, and named so it is not assumed:** participants on a *stop* (who came to dinner),
inviting a participant, and a participant contributing anything. The first is a second nesting level nobody
has asked for; the other two require accounts and are §8.7.

`validateTrip` gains two codes: `duplicate_participant_id` (error) and `participant_name_empty` (error — a
participant with no name renders as a ghost row and can never be re-identified). One `'self'` at most is
the third check and rides on the first two's mechanism.

### 8.4 Geography attribution, travel statistics, and the lifetime map

This is the signature surface of the thesis and it is, in model terms, three decisions.

**1. A coordinate is attributed to a country on-device, from a bundled dataset, never by a network
geocoder.**

```ts
countryOf(at: LatLng, index: CountryIndex): CountryCode | null    // pure; index injected
```

Not a preference. Sending a coordinate to a geocoding service **is transmitting a location**, which §6.1
forbids in every phase, and it would put a per-request dependency in the middle of the one screen the
thesis calls the signature experience. Separately and independently: the public OSM/Nominatim service's
usage policy forbids exactly this use — systematic reverse queries, and any application whose function is
related to geocoding must run its own service *(verified 2026-08-27,
[operations.osmfoundation.org/policies/nominatim](https://operations.osmfoundation.org/policies/nominatim/))*.
There is no cheap hosted answer that is also a private one.

The index is generated by `tools/gen-countries.mjs` from **Natural Earth admin-0**, which is public domain
*(verified 2026-08-28, [nvkelso/natural-earth-vector `LICENSE.md`](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/LICENSE.md)
— "Everything here is public domain … the primary authors, Tom Patterson and Nathaniel Vaughn Kelso, and
all other contributors renounce all financial claim")*, into one committed module; the lookup is ray-casting
point-in-polygon over the ISO-coded rings.

**Where the bytes come from, and why not the obvious place.** Revision 9 cited
[naturalearthdata.com](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/)
*(verified 2026-08-27)*. **That host is unreachable from this environment** — the egress proxy answers
`CONNECT tunnel failed, response 403` *(re-confirmed 2026-08-28)*. The generator therefore fetches from
**`nvkelso/natural-earth-vector`**, Natural Earth's own vector repository: Nathaniel Vaughn Kelso is one of
the dataset's two named primary authors, and the repo carries the Natural Earth terms verbatim, which is why
the licence citation above now rests on a document that can actually be fetched rather than on a note that a
page once said so.

**This is a host substitution, not a data substitution, and that was verified from content rather than from
the host's reputation** *(2026-08-28)*. Same dataset, same layer, same scales:
`ne_110m_admin_0_countries.geojson` is 838,726 bytes and **177 features**, `"name":
"ne_110m_admin_0_countries"`, `featurecla: "Admin-0 country"` on every feature and no other value, standard
NE property schema (`SOVEREIGNT`, `ISO_A2_EH`, `ADM0_DIF`, …), Croatia present. `ne_50m` at the same tag is
3,083,490 bytes / **242 features**; 10m is reachable too. **The correctness floor's escalation is therefore
not constrained by the environment** — the generator can move 1:110m → 1:50m on measurement, exactly as the
bullet below requires, and the choice of scale stays a detection-quality decision.

**Pinned to a tag, not to `master`.** `master` carries `VERSION` `5.2.0-pre`, a moving pre-release ref, and a
committed generated module fetched from a moving ref is a measurement **nobody can reproduce** — which is
precisely what the size budget below is. The generator fetches **`v5.1.2`**, whose 110m file is byte-identical
to today's `master` (sha256 `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f`; 50m at the
same tag is `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb`). A later re-run whose checksum
differs is something the generator **reports**, not a number quietly absorbed into the budget.

**What this citation does not claim.** No checksum comparison against naturalearthdata.com's own release
artefact was possible, because that host cannot be reached to compare against. The citation asserts only what
was verified — the dataset's identity, its scale and its licence, each read out of the file's own content and
the repo's own licence text — and asserts nothing about a canonical byte stream it could not fetch. That is
the standard §7's OurAirports citation meets, and it is the standard "verified `<date>`, `<url>`" has always
meant in this document: *this claim was checked against this evidence on this date*, not *this claim is
beyond doubt*.

Two constraints on the generator, both measured rather than assumed:

- **A size budget, pinned by a test.** The generator reports the emitted bytes and a test fails above the
  budget. Start at the 1:110m simplification; **the builder measures, and the number goes in the test, not
  in this paragraph.**
- **A correctness floor that decides the scale.** 1:110m is coarse at coastlines and islands. The generator
  is validated against every coordinate-bearing record in the reference trip — 112 stops and 94 places,
  including the Dalmatian islands (`Blue Cave, Biševo`; `Stiniva Cove, Vis`) and Lokrum. ~~If 1:110m
  misattributes or drops one of them, the generator uses 1:50m and the budget moves.~~ **That escalation
  mechanism is withdrawn at revision 20 — it was written on an assumption I-5 measured and falsified. See
  A-26 below for what replaces it:** the generator measures the *whole* pinned family and the base scale is
  the one that minimises unattributed records, with the base's missing ISO codes filled from the family's
  finest scale. Detection quality still decides the dataset; the budget still does not.

**`null` is a first-class answer.** A coordinate the index does not resolve — mid-ocean, a disputed area, a
bad digit, **a landform no scale of the dataset carries** — is reported as *unattributed* and rendered as
unattributed. It is never snapped to the nearest country. This is §2.7's rule about `unknown` in a different
costume: a system that guesses a country is a system whose lifetime map is quietly wrong, and a wrong map is
worse than an honest hole.

**And the distinction A-26 forces, stated here because this is the paragraph a future reader will reach
for.** *"Never snapped"* is a rule about **the absence of evidence** — do not compute an answer from a
coordinate no polygon contains. It is **not** a claim that the polygons are exact. Every ring in this index
is a generalisation with a positional tolerance of hundreds of metres to tens of kilometres, and *"inside
the ring"* has always meant *"inside a simplified drawing of the country"*. Confusing the two is what makes
1:110m look like an accurate dataset that happens to miss two islands, when it is in fact a forgiving one
whose error runs outward at a convex coast. A-26 keeps the rule and drops the illusion.

**2. Every statistic is derived. Nothing counts anything into storage.**

```ts
travelStats(summaries: readonly TripSummaryRow[], today: IsoDate): TravelStats
type TravelStats = {
  // `provisional` (A-34): no COMPLETED trip contributed this row, so it may be somewhere the traveller
  // has not reached yet. Marked on every surface, never rendered as a visited fact.
  countries: Array<{ code: CountryCode; firstVisit: IsoDate; lastVisit: IsoDate; tripIds: string[];
                     provisional: boolean }>;
  // `nameKey` is normalizeCityName(name) — a GROUPING key, not a CityKey. §2.2 A-10: a CityKey is an
  // opaque per-trip id, so two trips to Tokyo carry two of them and only the name can join them.
  cities:    Array<{ nameKey: string; name: string; countryCode: CountryCode | null; tripIds: string[];
                     provisional: boolean }>;
  trips: { planned: number; active: number; completed: number };
  daysTravelled: number;
  located:      { cities: number; places: number; stops: number };   // what there was to attribute
  unattributed: { cities: number; places: number; stops: number };   // the honest hole, on screen
  unnamedCities: number;                                             // folded to '' — not an identity
};
```

*(**Revision 24, A-31.** This block is the ruling's own type and is written here so clause 2 is readable on
its own; **A-31 Parts 2–4 are the specification** — the population each field is computed over, the
clamping `today` does, the sort orders, and the algorithm. The two differences from revisions 9–23 are
recorded there: `unattributed` gains `cities` and grows a `located` twin, because `unattributed: 0` is
otherwise ambiguous between *"everything was attributed"* and *"there was nothing to attribute"* and the
second is the answer ROADMAP I-7 requires to read **"no places yet"**; and `unnamedCities` exists because a
name that folds to `''` may not be merged into a blank row. **A-31 also widens `TripSummaryRow` a second
time** — `unattributed.places` and `unattributed.stops` were never computable from the row clause 3
defines, which is a defect in this clause and not in whoever tried to build it.)*

*(**Revision 25, A-34.** Both row types gain `provisional`. Nothing else in this block moves, nothing about
the population changes, and `TripSummaryRow` does not move at all — `provisional` is a property of a
*statistic*, is never stored, and does not touch `SUMMARY_VERSION`.)*

A stored `countriesVisited: 47` is a second source of truth that can disagree with the trips it summarises,
and — the reason that matters for this product specifically — **it is a number a user can inflate by
typing**. Principle 1 says real-world travel is the source of truth; a derived statistic cannot drift from
the travel it is derived from. This same rule pre-decides goals and achievements (§8.8): a goal is a
declarative target evaluated against `travelStats`, never a counter that is incremented.

**3. The library summary widens, and one rule keeps it honest.** The lifetime map must not load forty trip
documents — §4.2's *"exactly ONE trip in memory at a time"* is unchanged and is not negotiable here.

The shipped `TripSummaryRow` is `{id, title, startDate, endDate, datePrecision, cityCount, dayCount,
stopCount, poolCount, revision}` *(§4.2's inline comment says `{…, updatedAt}` and has been wrong since
revision 1; corrected at revision 9, the shipped shape is the contract — the §2.5 precedent.
`datePrecision` was added by the P2-6 fix at `25a223b`, carried and never branched on)*. It gains
`countryCodes: CountryCode[]`, `cities: Array<{ key: CityKey; name: string; countryCode: CountryCode | null }>`
and `summaryVersion: number`. *(Revision 11: the city field was `cityKeys: CityKey[]` and is widened by
§2.2 A-10 — an opaque key alone can neither label a pin nor join two trips, and a row that must be resolved
against a document it does not carry is not a summary. **Revision 23: the city entry gains
`countrySource: 'coordinate' | 'stated' | null` and `SUMMARY_VERSION` goes to 3 — A-29 below, which is what
decides where a city entry's `countryCode` may come from. **Revision 24: the row gains
`attribution: {places: {located, attributed}, stops: {located, attributed}}` and `SUMMARY_VERSION` goes to
4 — A-31, which is what makes clause 2's `unattributed` computable at all. Cities get no such field: a
`City.centre` is non-nullable, so the city census is already derivable from `cities[]`.**)*

A summary is a **copy**, so §0.6 applies to it and four clauses discharge it:

1. **A summary is computed only from the document being written, inside the write that carries it.** That
   is already the shipped shape — `saveIfVersion(id, expectedVersion, doc, summary)` — and no port method
   changes. Nothing computes a summary from another summary, from `AppState`, or from a document it is not
   about.

   *(**Amended at revision 23 by §4.3 A-30**, QA R26-6. The *"and no port method changes"* half is
   withdrawn: it was written when a summary was only ever computed inside a document write, and I-6
   introduced a second occasion — a **refresh** with no document change, which under this clause was
   forced to rewrite the whole record and so moved another tab's write fence. `StoragePort` gains
   `refreshSummary(id, expectedVersion, summary)`. What this clause was protecting is unchanged and is
   restated as:* **a summary is computed only from the document it is about, inside the same chained step
   that read or wrote that document.** *`refreshSummary` cannot violate it — it carries no document
   argument, so there is nothing in its signature to write a summary about. **Read A-30 before
   implementing this clause.**)*
2. **Nothing edits a summary independently of its document.** A rename writes the document.
3. **`SUMMARY_VERSION` is a core constant, bumped whenever any summary field's derivation changes.** The
   client rescans every row below it — load the document, recompute, rewrite through the ordinary chained
   write — before the lifetime map claims to be complete, and the map says *"recomputing"* while it does.
   Without this, the day `countryOf` improves is the day the map silently keeps the old answer.
4. **Every drill-down reads the document.** The summary answers *"which countries"*; the moment the user
   taps one, the trip is opened and the answer comes from `Trip`.

**Two consequences of clause 1, ruled at revision 10 because the increment that builds it cannot avoid
them:**

- **The country index is a required argument to `tripSummary`, not an optional one.** `tripSummary(trip,
  index)` — because an optional index has a default behaviour, and the only available default is *"emit a
  row with no countries"*, which is a row that claims to be complete and is not. Making it required means
  there is no way to mint a summary that silently forgot the countries. The index itself is generated code
  inside `packages/core` and is exported as a value from `index.ts` so every call site can pass it; the
  *function* still takes it as a parameter and stays pure and testable against the four-polygon fixture. The
  `StoragePort` contract does not change — the caller computes the summary, as it already does. *(Revision
  21: this is also the answer to *"why is the index in the web bundle before any screen uses it"* — from I-6
  it is on the **write** path, not the map screen, so it cannot be lazily loaded behind a route without
  putting an `await` where §0.6 and §2.2b forbid one. **A-27 Part 9**, QA R22-6.)*
- **The lifetime map should be drawn from the country index we already bundle, with no tiles behind it.**
  `PRODUCT-VISION.md` §7 risk 5 names the exposure — a *lifetime* map loads on every profile view, so tile
  cost scales with sessions — and a phase that is local-first with no network has no business acquiring a
  tile dependency to draw filled countries. The rings are already in the bundle; a filled-country world map
  needs nothing else. The *trip* map keeps its existing tiles and is untouched.

**And the question §6.1 will be asked about this: no, a country code is not location data of the kind that
table governs.** It is derived from coordinates the user typed into their own itinerary and which already
live in the document; the table's subject is *observed* location — a fix stream, a library index, a dwell
inference — none of which exists in this phase. When observation does arrive (§8.5), a country derived from
a `Visit` inherits that `Visit`'s rules, not these. The cross-cutting rule still binds: **no coordinate in
any log line**, and a country code in a summary row is not a licence to log the point it came from.

**The map surface inherits both of `CLAUDE.md`'s map bugs and adds one.** §4.4 is unchanged — bounds come
from core, a hidden container never fits — and the world map's version of the min-span guard is that a
history containing one country must not zoom to a max-zoom rooftop view. Same mechanism (`fitSpanKm`,
`MIN_SPAN_KM`), new caller, no second implementation.

#### A-26 — the index is mixed-resolution, `null` is the right answer for a landform the dataset does not carry, and the correctness floor's escalation is withdrawn (revision 20, BUILD-NOTES KD-51)

I-5 shipped `tools/gen-countries.mjs`, `derive/country.ts` and `fixtures/golden/countries.json` at 1:110m
and routed one objection here rather than working around it: **the correctness floor above prescribes a
remedy that does not achieve its own goal.** The builder measured all three scales at the pinned tag and
found that escalating makes every number it is written in worse. He was right on both counts — the
measurement and the refusal to invent a coastal buffer, which this section forbids in writing.

Everything below was **re-derived independently** before ruling, from the same three files at the same
pinned tag (all three checksums re-verified against §8.4's own record). The builder's table reproduces
exactly. What it does not contain is the reason, and the reason changes the answer.

**Part 1 — why the two islands are `null`, and why no scale fixes it.**

Three distinct failures are stacked under one symptom, and the roadmap's single remedy addressed none of
them. Measured at 1:10m, the finest scale Natural Earth's admin-0 family offers:

| record | coordinate (from the live planner) | 1:110m | 1:50m | 1:10m | nearest Croatian ring at 1:10m |
|---|---|---|---|---|---|
| `Blue Cave, Biševo` | 43.0264, 16.0114 | `null` | `null` | `null` | **4.26 km** (Vis) |
| `Stiniva Cove, Vis` | 43.0322, 16.2306 | `null` | `null` | `null` | **1.14 km** (Vis) |
| `Budikovac / Blue Lagoon` | 43.0397, 16.2686 | `null` | `null` | `null` | **2.75 km** (Vis) |
| `Lokrum Island` | 42.6265, 18.1214 | **HR** | `null` | `null` | 1.87 km (mainland) |
| `Hvar Town` | 43.1729, 16.4413 | `null` | `null` | **HR** | 0.013 km *inside* |

1. **Biševo, Budikovac and Lokrum are not in the dataset at any scale.** *Measured:* no ISO-coded polygon
   at 1:110m, 1:50m or 1:10m contains any of them, and the nearest Croatian ring is kilometres away in each
   case. *Not measured, and marked as such:* all three are small — of the order of a few km² down to under
   one — and Natural Earth admin-0 evidently carries an island-inclusion threshold above them; that
   threshold is not documented in the dataset and is inferred from the three misses, not cited. This is not
   generalisation error and no resolution reaches it, because there is nothing at any resolution to reach.
   Verified the strong way: a **corrected** Blue Cave coordinate — 42.9806, 16.0475, about 6 km south-east
   of the planner's, which sits in open water — is *also* `null` at 1:10m, 4.26 km from the nearest ring.
   *(The two corrected coordinates in this point and the next are from general knowledge and are **not**
   verified against a source here. They are used only to separate "the datum is wrong" from "the dataset
   has no polygon", and the ruling does not rest on their precision.)*
2. **Stiniva's hole is two independent faults stacked.** The planner's coordinate is about 6 km east of a
   corrected one; that corrected coordinate (43.0263, 16.1517) **does** attribute to HR at 1:10m. So
   Stiniva is a bad-datum problem *and* a scale problem wearing one symptom, and the roadmap's criterion
   could not have told the difference — which is precisely why it needed a `resolvesAt` and not a country.
3. **Lokrum's `HR` at 1:110m is an artefact, not a success.** Lokrum is an offshore island with no polygon
   of its own; it attributes because the coarse mainland ring reaches ~1.9 km out over the water past it.
   The criterion that demanded `HR` for all three was, for this record, demanding that the dataset stay
   *imprecise* — and it duly stopped being satisfied at 1:50m and 1:10m.

**Ruling.** `null` is the correct answer for `Blue Cave, Biševo`, `Stiniva Cove, Vis` and
`Budikovac / Blue Lagoon`, at this and every scale, and it is a **first-class answer to a genuine gap in the
dataset** — not a defect, not a `TODO`, and never to be closed by a tolerance. Exit criterion 4's clause
requiring them to attribute to **HR** was written by me at revision 9 on an unverified assumption and is
**withdrawn as factually wrong**. `ROADMAP.md` carries the corrected criterion; the correction is explicit
there rather than left to be reinterpreted.

**Part 2 — why 1:110m is the base, stated as a mechanism instead of a score.**

The builder's ranking is confirmed (`--dry-run` at each scale, re-run here): 175,085 bytes / 3 unattributed
places / 4 unattributed stops at 1:110m, against 1,648,598 / 24 / 31 at 1:50m and 9,072,727 / 21 / 26 at
1:10m. The reason a nine-times-larger dataset is less accurate is worth writing down, because it is
counter-intuitive enough to be "fixed" by the next reader:

> **A country's admin-0 boundary is its waterline, and travel coordinates sit on the waterline.** At a
> convex coast, generalisation runs *outward*: a coarse ring bulges over the sea and swallows shoreline
> points; a fine one tracks the water and drops anything a few hundred metres seaward. Measured at 1:10m:
> Pile Gate is **358 m** outside Croatia's ring, Diocletian's Palace **300 m**, Split's Riva **377 m**.
> All three are unambiguously on land in Croatia. 1:110m gets them right by being wrong in the useful
> direction.

So the base scale is **1:110m** — and the honest statement of why is *"it is the most forgiving of the
error that dominates this dataset's use"*, plus *"it is 52× smaller"*, not *"it is the most accurate"*. The
selection rule that replaces the withdrawn escalation is: **the generator measures every scale in the
pinned family and the base is the one that leaves the fewest records unattributed over the reference
corpus; the budget follows the base.** One command, re-derivable, and it must be re-derived when a second
real trip exists, because a corpus of one Adriatic trip is exactly the sample that would make this
conclusion parochial.

**Part 3 — the defect underneath: 1:110m cannot name 64 countries, and misnames 8 of them.**

The builder's second, smaller disclosure — four European micro-enclaves absorbed by their neighbours — is
the visible corner of a larger hole, and measuring it changed my ruling. **The 1:110m layer carries 175
ISO-coded countries. The 1:10m layer carries 239.** The 64 the base omits, with what the shipped index
returns for a point inside each:

| | |
|---|---|
| **Misattributed — a wrong country, 8** | `AD`→FR, `GI`→ES, **`HK`→CN**, `LI`→AT, `MC`→FR, **`SG`→MY**, `SM`→IT, `VA`→IT |
| **Unreachable — `null`, 56** | `MT` Malta · `MV` Maldives · `MU` Mauritius · `SC` Seychelles · `MO` Macao · `BH` Bahrain · `BM` Bermuda · `FO` Faroes · `CV` Cabo Verde · `BB` Barbados · `IM` Isle of Man · `JE` Jersey · `GG` Guernsey · `AX` Åland · `AW` Aruba · `CW` Curaçao · `KY` Cayman · `TC` Turks and Caicos · `AG` `KN` `LC` `VC` `GD` `DM` `MS` `AI` `BL` `MF` `SX` `VG` `VI` · `PF` `WS` `TO` `TV` `KI` `FM` `MH` `PW` `GU` `MP` `AS` `NU` `CK` `NF` `WF` `NR` `PM` `SH` `ST` `KM` `IO` `GS` `HM` `UM` `PN` |

This is not a `countryOf` defect and it is not the ray cast being wrong. Verified: at 1:110m the set of
countries whose rings contain San Marino is the singleton `[IT]`; Vaduz's is `[AT]`; Monaco's is `[FR]`.
**No snapping occurs. The map of the world the function is handed does not contain those states.** The
guard `derive/country.ts` carries — no distance function anywhere in the file, so the shortcut cannot be
taken by accident — held perfectly, and held while the answer was wrong, which is the useful thing to
notice: a rule about how an answer is computed cannot protect a dataset that has no answer in it.

**And this is why the routed finding could not be settled inside its own terms.** Two Dalmatian coves and
four micro-enclaves are curiosities. *Malta, the Maldives, Mauritius, the Seychelles, Macao, Hong Kong,
Singapore, Bermuda, the Faroes, Cabo Verde, Bahrain, Barbados, the Isle of Man and fifty-one more* are
**destinations**, and the product this index exists for is a lifetime map of where a person has been. An
index that can never say *Malta* is broken for the exact demographic the thesis is about. The reference
trip cannot show that, which is the whole lesson: a criterion written against one corpus tests the corpus.

**Part 4 — the ruling: a mixed-resolution index, with its test order frozen in the artefact.**

> **The shipped index is 1:110m for every ISO code that layer carries, plus the 1:10m polygons for exactly
> the codes it does not, emitted in the order `countryOf` must test them: ascending polygon area, ties
> broken by ISO code ascending.**

*(**Amended at revision 21 by A-27**, which adds a third clause: each filled code also ships a
**forgiveness entry** — the same country at the coarser scale, under the same ISO code — because fixing the
fill at the finest layer is this paragraph making, for the fill, the assumption Part 2 measured and rejected
for the base. Read A-27 before implementing this sentence.)*

Three properties make this the answer rather than a compromise:

1. **It is not an escalation.** The wholesale move the withdrawn floor prescribed costs 9.07 MB and leaves 26
   stops unattributed, most of them shoreline coordinates that are on land. This costs the 64 small
   polygons and nothing else. Measured: **239 codes,
   892 rings, 20,702 points, 342,981 bytes packed** (against 175 codes / 286 rings / 10,559 points /
   172,953 packed). Roughly 2× the budget, ~4 % of a wholesale 1:10m index.
2. **It is provably non-regressive.** Over a 0.25° global grid — **1,036,800 cells** — the mixed index
   differs from the shipped one in **61** cells: **59 are `null` → a country** and **2 are a wrong country
   → the right one** (`MY`→`SG`, `CN`→`HK`). **Zero cells get worse.** And over the reference trip's
   **226** coordinate-bearing records, **0 answers change** — so `fixtures/golden/countries.json` keeps
   every country row, every `namedBy` and both unattributed lists byte-for-byte, and only its `index`
   header moves. That last property is the ship gate's strongest single check.
3. **`countryOf` does not change, at all.** No distance function, no coastal buffer, no nearest-neighbour,
   no new parameter. The fix lives entirely in *which polygons are in the index* and *what order they are
   in*. The one rule this section states about the function's behaviour is untouched.

**Why the order has to move, and why area.** Filling creates an overlap the source data does not contain:
at 1:50m and 1:10m Natural Earth punches a San Marino-shaped hole in Italy and a Liechtenstein-shaped hole
in Austria, but the 1:110m base has neither, so a Vaduz point is inside *both* `AT`'s coarse ring and
`LI`'s fine one. `countryIndex()` currently sorts by ISO code ascending and `countryOf` returns the first
hit, and **alphabetical order resolves 7 of these 8 overlaps in favour of the encloser** — `AT` before
`LI`, `CN` before `HK`, `ES` before `GI`, `FR` before `MC`, `IT` before `SM` and `VA`, `MY` before `SG`.
The sorting docstring's reasoning is right and its choice of key is arbitrary; **ascending area is the
non-arbitrary key, because an enclave is always smaller than the thing enclosing it.** Measured: on the
same 1,036,800-cell grid, exactly **2** cells are contained by more than one country (`MY`+`SG`, `CN`+`HK`)
and area-ordering is what decides them, both correctly. Everywhere else the two orderings are identical, so
this changes the tie-break and nothing else.

**And the order is emitted, not recomputed.** `countryIndex()` stops re-sorting and preserves the order it
is given; the generator emits countries already ordered. That keeps the property the current docstring
exists for — the answer is the same on every machine and every run — and strengthens it: the order becomes
part of the committed artefact, so a reorder is a diff a reviewer sees rather than a floating-point
comparison a reviewer trusts. A hand-built test fixture keeps working; it simply gets tested in the order
it was written, which is what a four-polygon fixture wants.

**Part 5 — the two residues, disclosed rather than left to be discovered.** *(Superseded at revision 21 by
**A-27 Part 6**, which carries three: residue 1's arithmetic is corrected by KD-52 and its exception becomes
a measured filter, residue 2 is unchanged and now protected by a filter, and a third — a band of sea around
54 island territories — is introduced by A-27 and quantified there.)*

1. **Vatican City is `IT` at every scale, and stays that way.** Natural Earth's `VA` feature is a 7-point
   sliver spanning 12.4527–12.4540 E, 41.9028–41.9039 N — about **110 m × 130 m**, against the real state's
   0.44 km² — and Italy carries a matching hole. St Peter's Basilica (41.9022, 12.4539) is ~90 m *south* of
   it. No scale, no ordering and no fill fixes that; the dataset has no better answer to prefer. It is
   pinned by a named test as a **known-wrong answer with its reason**, not repaired. **Why not null it:**
   the only mechanism available is a hand-authored exclusion box for one polity, which is the first step
   onto the hand-typed-polygon road I-5's dependency clause forbids, for a state whose every visitor is in
   Rome the same day and whose lifetime map therefore gains `IT` either way. **Trigger to reopen:** Natural
   Earth shipping a real `VA` polygon, or a second polity found to have a placeholder feature.
2. **At a filled country's border the index is biased toward the smaller state.** The filled polygon is
   1:10m and its neighbour is 1:110m, so there is no shared boundary — there is an overlap band, and area
   ordering hands it to the fill. Measured on the printed coordinates: Natural Earth's 12-point Monaco
   spans 43.7179–43.7635 N against Monaco's real 43.7247–43.7519, so roughly **700 m** of French ground
   next to Monaco will return `MC`. This is a wrong answer introduced by this ruling and it is accepted
   deliberately: it replaces *always wrong inside Monaco* with *right inside Monaco, wrong within ~700 m
   outside it*, which is strictly less wrong area, and it applies to 8 borders out of 64 fills (the other
   56 are islands with no neighbour to overlap). It is the generalisation tolerance every answer in this
   index already carries, not a guess — see the paragraph added above the `null` rule.

**Part 6 — what a builder implements. Five files, no engine.**

1. **`tools/gen-countries.mjs`** — `--scale` becomes the *base* scale (default `110m`) and the generator
   additionally fetches the family's finest scale (`10m`, pinned checksum already in the file) as the
   **fill**. For every ISO code present in the fill and absent from the base, the base's entry list gains
   the fill's rings unchanged. Entries are then ordered by ascending summed absolute spherical ring area,
   ties by ISO code ascending, and emitted in that order. The run reports, as it already reports bytes: the
   base code count, the fill count, the filled code list, and the emitted byte figure that goes in the
   budget test. Its existing guards — checksum pin, quantisation check, round-trip, and the cross-check of
   `countryOf` against the generator's own ray cast — all still run, and the cross-check must use the
   emitted order. **`--scale 10m` must keep working**, because Part 2's selection rule is only honest if
   the comparison is still one command. *(Revision 21: **A-27 Part 4** adds a third pass — forgiveness
   entries for the filled codes, under two measured filters — and **A-27 Part 7** is the implementation brief
   that supersedes this item. R22-5's missing fill-drop count is absorbed there.)*
2. **`packages/core/src/geo/countryIndex.ts`** — `countryIndex()` no longer sorts. It preserves the order
   of `init.countries` and derives each box as it does today. The docstring's determinism argument is kept
   and re-pointed: the order is a property of the committed artefact, and A-26 Part 4 says why area and not
   code. **This is the only hand-written change to `packages/core`.**
3. **`packages/core/src/derive/country.ts`** — **unchanged.** If this file grows a distance function, the
   increment has gone wrong. *(Narrowed at revision 21 by **A-27 Part 8**: the file's **behaviour** is
   unchanged — that half is permanent — but two docstring sentences this ruling made false are corrected,
   with the replacement text given verbatim there. QA R22-3.)*
4. **`fixtures/golden/country-holes.json`**, new, written by `gen-countries.mjs --holes` (which fetches all
   three scales — a human's generation-time cost, never the product's). One row per unattributed record of
   the reference trip: `{kind: 'stop'|'place', id, name, resolvesAt}`, where `resolvesAt` is the coarsest
   scale in the pinned family that *does* attribute it, or `null` if none does. This is the artefact that
   makes KD-51's question un-askable again: **a hole with a non-null `resolvesAt` is a scale question; a
   hole with `resolvesAt: null` is a dataset gap and is correct.** `tools/gen-golden.mjs` is unchanged and
   stays offline; a test asserts the two artefacts name the same set of records, so they cannot drift.
5. **The tests** — `0-countryBudget.test.ts`'s `EMITTED_BYTES` is re-measured from the generator's own
   output (projected ~345 KB; the *measured* number is the one that ships, and it does not go in this
   document). `country.test.ts`'s micro-enclave test inverts: `SM`, `MC`, `LI`, `AD`, `GI`, `HK`, `SG`
   attribute to themselves, `VA` is pinned as `IT` with Part 5's reason in the test's own text, and the
   code count assertion moves 175 → the measured count.

**Part 7 — where this sits.** This is a re-open of I-5, not a new capability and not a phase change: same
increment, same three artefacts, same section. `ROADMAP.md` carries it as **I-5a**, owed **before I-6**,
and the sequencing reason is §8.4 clause 3's own: `TripSummaryRow.countryCodes` minted from a 175-code
index would need a `SUMMARY_VERSION` rescan the day the index is completed, and there are currently zero
summaries in existence. Fixing the index while nothing depends on it costs one increment; fixing it after
I-6 costs one increment plus a migration of every row a user has written.

#### A-27 — a filled code ships coverage *and* forgiveness, because choosing between them deletes archipelagos (revision 21, QA R22-1, R22-3, R22-6)

QA round 22 attacked I-5a on three axes — is the artefact reproducible, is the ray cast right, is the order
right — and could break none of them. What survived is the one line A-26 wrote without a measurement behind
it: `tools/gen-countries.mjs:99`, `const FILL = '10m'`.

The finding is correct and its severity is right. **Everything below was re-derived here**, against the same
three pinned layers (fetched independently; 838,726 / 3,083,490 / 13,287,234 bytes, matching the generator's
pins to the byte) with the generator's own quantisation re-implemented. Where I could not reproduce the
breaker, I say so.

**Part 1 — the defect, reproduced, and one case that did not reproduce.**

A-26 Part 2's finding about the *base* applies unchanged to the *fill*: a fine ring tracks the waterline, and
travel coordinates sit on the waterline. Against the committed index, with capital-city coordinates typed
from general knowledge *(and marked as such — they are not verified against a source, and the ruling does not
rest on their precision, only on the fact that a plausible traveller's coordinate misses)*:

| coordinate | committed index (fill = 1:10m) | that country's 1:50m polygon |
|---|---|---|
| Nuku'alofa, Tonga | `null` | contains it |
| St John's, Antigua | `null` | contains it |
| St George's, Grenada | `null` | contains it |
| Diego Garcia, BIOT | `null` | contains it |
| St Helier, Jersey | `null` | **also misses it** |
| Grytviken, South Georgia | **`GS`** | contains it |

Four of the breaker's five reproduce. **Grytviken does not**: it attributes to `GS` today, both at the
coordinate I typed and at Natural Earth's own populated-place point for it, which differ by ~120 m. I record
that rather than repeating the list, because a ruling that inherits an unreproduced measurement is the exact
failure A-26 was written about. The other four stand and are enough. `JE` is a third thing again — a
coordinate no scale in the family attributes — and it is the same class as A-26 Part 1's Dalmatian coves:
`null` is the correct answer, and the builder of I-5a who noticed it in `country.test.ts` and moved the test
coordinate should have filed it. **A shoreline observation is a finding, not a test-fixture problem**; that is
the one process point in this ruling and it is directed at the builder role, not at the person.

**Part 2 — the remedy the finding gestures at, measured and rejected.**

The finding proposes a per-code *choice* of scale, measured the way `resolvesAt` is measured. I built it: a
per-code veto over Natural Earth's own `ne_10m_populated_places` at the same pinned tag, preferring the
coarsest scale that keeps every settlement the finest scale keeps and captures no neighbour's. It works on
its own terms — 49 codes to 1:50m, 15 held at 1:10m, `VA` and `MC` correctly held, and the payload gets
**smaller** (237,591 packed, −31 %). **And it is wrong**, for a reason no capital-city test and no global
grid can see. Counting rings that survive the move (a 1:10m ring is counted as lost when no scale-50m ring
of the same country overlaps it anywhere):

| country | 1:10m rings | 1:50m rings | landforms lost |
|---|---|---|---|
| Maldives | 176 | 2 | **175** |
| French Polynesia | 88 | 21 | 67 |
| Seychelles | 26 | 1 | 24 |
| Marshall Islands | 22 | 5 | 17 |
| Micronesia | 20 | 5 | 16 |
| Kiribati | 35 | 19 | 13 |
| Cook Islands | 13 | 1 | 12 |
| South Georgia | 12 | 2 | 10 |
| Tonga | 10 | 3 | 7 |

Thirty-one of the sixty-four lose at least one landform. A 0.25° grid sees eleven cells of this, because a
27 km cell rarely lands on an atoll — which is precisely how a measurement that counts *area* misses a
country disappearing. **Substituting a coarser polygon for a filled code buys its capital and pays with its
archipelago.** For a product whose signature screen is *everywhere you have been*, the Maldives drawn as two
blobs out of 176 atolls is a worse answer than a missed capital, and it is worse *silently*.

**Part 3 — the ruling.**

> **A-26 Part 4's rule gains a third clause.** The shipped index is 1:110m for every ISO code that layer
> carries, plus the 1:10m polygons for exactly the codes it does not — **and, for each of those filled codes
> only, the same country's polygons at each strictly coarser scale of the pinned family, as an additional
> entry under the same ISO code, subject to the two filters in Part 4.** Entries are emitted in the order
> `countryOf` must test them: ascending polygon area, ties by ISO code ascending, then by scale coarsest
> first.

The second entry is a **forgiveness entry**. It exists to be wrong in the useful direction — A-26 Part 2's
words — for the codes whose scale nobody chose by measurement.

Four properties make this the answer rather than a compromise:

1. **`countryOf` does not change and nothing in `packages/core` changes behaviour.** The function returns the
   first *entry* whose rings contain the point; even-odd runs across the rings *of one entry*, which is what
   makes holes work. Two entries carrying the same code therefore compose as a **union** — the intersection is
   not cancelled, because no two rings of a single entry overlap. `countryIndex()` maps entries one-to-one and
   preserves order; `decodeCountryIndex` parses `[code, rings]` pairs. **Neither assumes a code is unique**,
   and I checked that by reading them rather than by assuming it. Nothing gains a distance function, a buffer,
   a snap or a parameter. This is the same closing property A-26 Part 4 claimed, and it is why the fix is
   affordable at all.
2. **Non-regression is structural, not statistical.** Every ring in the committed index is still in the
   index, byte-identical; the change is purely additive. So the set of countries containing any point can only
   grow, a `country → null` regression is **impossible by construction**, and a `country → other country`
   change is possible only where a forgiveness ring overlaps another entry — which Part 4's second filter is
   there to make impossible. This is A-26 Part 4 property 2's argument, one level down, and it is the strongest
   check the ship gate has.
3. **It is not an escalation, and it is not the substitution of Part 2.** The forgiveness rings are the
   coarse, cheap ones. Measured: **+26,707 packed bytes, +7.8 %**, against +19 % for a blanket second layer and
   9.07 MB for a wholesale escalation.
4. **The scope is exactly the codes whose scale was never chosen.** The base's 175 codes were selected by
   A-26 Part 2's corpus measurement and keep the coarsest scale in the family, so there is nothing coarser to
   forgive them with; the rule is vacuous for them by construction rather than by exception. It applies to
   filled codes only, which is the population the defect is about.

**Part 4 — the two filters, stated so a builder implements them without a judgment call.**

Both run at generation time, both are reported in the run's own output, and both are expressed with one
predicate:

> **`overlaps(ring R, ring-set S)`** is true iff any of: (a) a vertex of `R`, or the arithmetic mean of `R`'s
> vertices, is inside `S` under the even-odd rule; (b) a vertex of any ring of `S`, or that ring's vertex
> mean, is inside `R`; (c) a segment of `R` crosses a segment of any ring of `S`. Rings whose bounding boxes
> are disjoint are rejected before any of this. The predicate is exact for simple rings and is evaluated on
> the **quantised** rings — the ones that ship — never the raw ones.

*(**Superseded at revision 22 by A-28 Part 5**, QA R23-2: the two *"or the arithmetic mean"* probes are
**removed** — they fire on a point neither ring contains when a ring is concave, which makes filter 1
unsound in the one direction it exists to guard — and *"exact for simple rings"* is restated as the theorem
it is. The removal changes 0 of the 153 shipped decisions. **Implement A-28's predicate, not this one.**)*

For each filled code, for each strictly coarser scale of the family that carries it, coarsest first, take that
scale's rings and apply, per ring:

1. **Filter 1 — it must be the same place.** Keep the ring only if `overlaps(ring, the code's coverage
   rings)`. A coarse polygon that does not touch the country as the finest scale draws it is not a coarser
   drawing of that country; it is a different claim about where the country is, and adding it would answer
   that code for ground the country is not on. *Measured: this filter alone drops Vatican City's 1:50m
   polygon, which sits ~1 km west of the state — so A-26 Part 5 residue 1 is now reproduced by measurement
   instead of held by a hand-written exception, which is the outcome it asked for.*
2. **Filter 2 — forgiveness may not be taken from a neighbour.** Keep a surviving ring only if
   `overlaps(ring, E.rings)` is false for **every other entry `E`** of the coverage-only index. A forgiveness
   ring's whole purpose is to claim ground beyond the waterline; where that ground is another country's, the
   claim is a wrong answer, not a tolerance. *Measured: this drops every ring of `AD`, `HK`, `LI`, `MC`, `SG`,
   `SM` and `SX` — i.e. every bordered filled code — so A-26 Part 5 residue 2's ~700 m bias is not widened by
   one metre.*

   *(**Superseded at revision 22 by A-28 Part 3**, QA R23-1 (MAJOR). Both sentences above are wrong. The
   population *"every other entry of the coverage-only index"* is **mixed-resolution** — 175 of its 239
   entries are drawn at 1:110m — so a 1:50m candidate is asked about a neighbour at the wrong scale, and it
   fails generously: `MO`'s ring was checked against China's 1:110m coastline, passed, and took ≈22.1 km² of
   Guangdong. **`MO` is a bordered filled code and the list above is short by one.** A-28 replaces this
   filter with two arms — 2a against the shipped index, 2b against each neighbour's finest drawing — and
   explains why replacing rather than adding is worse. **Implement A-28 Part 3, not this item.**)*

If no ring survives, the code has no forgiveness entry and the run says so. **A forgiveness entry may never
introduce an ISO code the coverage pass did not already emit** — asserted, not assumed, beside the existing
`stillMissing` guard.

**Part 5 — what this produces, measured.**

At `v5.1.2`, base `110m`, fill `10m`, forgiveness from `50m`:

- **54 forgiveness entries.** 142 of 153 candidate rings kept; 11 dropped — `MV` 1 and `VA` 1 by filter 1,
  and one to three each from `AD`, `HK`, `LI`, `MC`, `SG`, `SM`, `SX` by filter 2.
- **10 filled codes get none:** `AD` `HK` `LI` `MC` `SG` `SM` `SX` (bordered), `VA` (disjoint), `GI` and `UM`
  (no 1:50m polygon exists).
- **293 entries, 239 distinct ISO codes, 1,034 rings, 22,229 points, 369,688 bytes packed** — against
  239 / 892 / 20,702 / 342,981 today.
- **Nuku'alofa, St John's, St George's and Diego Garcia attribute to their own countries.** St Peter's is
  still `IT`; Macao's Senado Square is still `MO` and Zhuhai across the border is still `null`; Pile Gate is
  still `HR`; the three Dalmatian coves are still `null`.
- **14,926,301 cells at 0.02° (~2.2 km) over the 54 forgiveness bounding boxes, padded by 0.1°: 704 cells
  `null` → a country, 0 cells `country` → `null`, 0 cells one country → another.** A 0.25° global sweep
  agrees. **Zero cells get worse, and Part 3 property 2 says why that is a proof rather than a sample.**

These are an architect's measurements in a scratchpad with the generator's build re-implemented; **the
builder re-derives every one of them from `tools/gen-countries.mjs` itself** and the increment's numbers are
the generator's, not these. If they disagree, the generator is right and this paragraph is the defect.

*(**Superseded at revision 22 by A-28 Part 6.** Every figure in this Part is the I-5b artefact's and is
correct for it; A-28 refuses `MO`'s ring and the counts move to **53 entries / 141 of 153 rings kept /
12 dropped / 292 entries / 1,033 rings / 22,220 points / 369,524 packed**. The sentence *"Macao's Senado
Square is still `MO` and Zhuhai across the border is still `null`"* is **half false as shipped** — Senado
Square is `MO`, Zhuhai is `MO` too — and is true again under A-28. It was a spot check of one coordinate
where a sweep was owed, which is the process point of R23-1 and is stated in A-28 Part 1.)*

**Part 6 — the residues, now three.** A-26 Part 5's list is superseded by this one.

1. **Vatican City is `IT` at every scale, unchanged.** A-26 Part 5 residue 1 stands, with round 22's KD-52
   correction to its arithmetic (the sliver is ~108 m × 122 m, ~11.7 × 10³ m² against the real state's
   440,000 m² — *"about a thirtieth"*, not the figure Part 5 printed) and with round 22's own attack on it
   recorded: the 1:50m `VA` polygon is larger but ~1 km west, so it would claim a square kilometre of Rome and
   *still* miss the basilica. Under A-27 that is no longer a judgment — filter 1 drops it.
2. **At a filled country's border the index is biased toward the smaller state**, ~700 m at Monaco.
   Unchanged, and now protected: filter 2 forbids A-27 from widening it.
3. **New, and introduced by this ruling: around 54 island territories, a band of sea answers the island
   rather than `null`.** It is the 1:50m generalisation's outward error — kilometres, not metres — and the 704
   cells of Part 5 are its measure. It is accepted for A-26 Part 2's own reason: a coordinate a traveller
   records off an island is a coordinate *about* that island, the alternative is `null` for most of the
   habitable coast of a small state, and the whole index is a simplified drawing whose error already runs
   outward at every convex coast (see the paragraph above the `null` rule). **It is not a snap**: no answer is
   computed from a coordinate no polygon contains. **Trigger to reopen:** the first real trip whose coordinates
   sit between two island states close enough for their forgiveness bands to meet — filter 2 catches an
   overlap with a *shipped* entry, and nothing in the family currently produces such a pair.

   *(Revision 22: **53** territories, not 54 — A-28 refuses `MO`'s band. The trigger is **re-derived** in
   A-28 Part 8 rather than left asserted: all 1,378 pairs of the 53 entries, ring against ring-set, give zero
   overlaps. Round 23 confirmed independently that R23-1 is a *different* case from this one — forgiveness
   against a **coverage** entry too coarse to defend itself, not forgiveness against forgiveness — so this
   residue was never the hole.)*

**Part 7 — what a builder implements. Three files, no engine.**

1. **`tools/gen-countries.mjs`** — after the fill, a forgiveness pass over the filled codes exactly as Part 4
   states, with `overlaps` as one helper used by both filters. `orderEntries`'s comparator gains a third key
   (family index ascending, so the coarser entry of a same-code pair sorts first when areas tie) and stays a
   total order in the presence of duplicate codes. The run reports the forgiveness code list, the kept and
   dropped ring counts **with the filter that dropped each**, and — R22-5, absorbed here rather than left to
   drift — the fill's own degenerate-ring count alongside the base's. `COUNTRY_INDEX.scale` becomes
   `ne_110m+10m+50m` and `source` names all three files with their roles; that string is the *only* permitted
   change to `fixtures/golden/countries.json` and to `country-holes.json`'s `index` block. `--scale 10m`,
   `--scale 50m`, `--no-fill`, `--dry-run`, `--audit-only` and `--holes` all keep working; with `--no-fill`
   there are no filled codes and therefore no forgiveness pass.
2. **`packages/core`** — **no behavioural change, in any file.** Two docstrings move and nothing else:
   `geo/countryIndex.ts`'s paragraph describing the fill gains the forgiveness clause and the sentence that an
   ISO code may now appear on more than one entry, and `derive/country.ts` takes Part 8's two corrections.
   **If either file grows a distance function, or `countryOf` grows a branch, the increment has gone wrong.**
3. **The tests** — `country.test.ts:715`'s `countries.length === 239` splits into two assertions:
   `new Set(countries.map((c) => c.code)).size === 239` (the semantic one — *this many countries*) and
   `countries.length === <measured>` (the artefact one). `0-countryBudget.test.ts`'s `EMITTED_BYTES` is
   re-measured from the generator's output. **R22-4 is a prerequisite, not a parallel task:** its guard 1 has
   140 bytes of headroom against a header comment that A-27 lengthens by a 54-code list and its explanation,
   so guard 1 must be expressed against the code list's size (or folded into guard 3) **in or before** this
   increment, or the increment fails on a test that is measuring the wrong thing.

**Part 8 — R22-3: the two sentences in `derive/country.ts`, and the permission to change them.**

A-26 Part 6 item 3 says this file is *"unchanged"*, and the I-5a builder was right to read that literally and
refuse. **That instruction is narrowed here: `derive/country.ts`'s *behaviour* is unchanged — no distance
function, no branch, no parameter, now and in every later increment — and its docstring is corrected to
match what A-26 made true.** Both replacements are given verbatim so the change needs no judgment:

- **At `:27`,** *"The ray is cast towards +∞ longitude and stops at the box"* is false — the box is a
  **point** reject applied before the cast, and the ray is unbounded. Replace with:

  > The ray is cast towards +∞ longitude and is unbounded; the entry's bounding box is a *point* reject
  > applied before the cast, never a clip on the ray. A point at lng −179.5 is tested against the rings that
  > live at negative longitudes, which is where its half of the country is.

- **At `:70`,** *"which `countryIndex` fixes as ascending ISO code"* was withdrawn by A-26 Part 4;
  `countryIndex` fixes nothing. Replace the sentence with:

  > Entries are tested in the index's own order, which `countryIndex` **preserves** exactly as the committed
  > artefact emits it — ascending polygon area, ties by ISO code (§8.4 A-26 Part 4) — so an overlap in the
  > data resolves the same way on every machine and every run. An ISO code may appear on **more than one
  > entry** (§8.4 A-27): the first entry containing the point wins, and same-code entries carry the same
  > answer, so which one wins is not observable.

Round 22 audited every other behavioural claim in the file and found them all true. No third correction is
owed, and this is a comment change with no test.

**Part 9 — R22-6: the index is 36.4 % of the web bundle and has no consumer. That is accepted, bounded, and
recorded here rather than re-argued every round.**

The measurement is real: `apps/web` builds to 942.79 kB, of which 342,981 bytes is the country payload, and
`COUNTRY_INDEX`/`countryOf` have no caller in `apps/web`, `packages/client` or `cli.ts`. A-27 makes it
~369.7 kB of a ~969 kB bundle. **No code-splitting or lazy loading before I-6.** Four reasons, in the order
that decides it:

1. **I-6 puts the index on the *write* path, not the map screen.** §8.4 clause 3's first consequence makes
   the index a **required argument** to `tripSummary(trip, index)`, and a summary is computed *inside the
   write that carries it*. So from I-6 the index is needed every time a trip is saved — before any map is
   opened. A lazy `import()` there is an `await` inside the one path §0.6 and §2.2b spend three sections
   keeping synchronous and fenced. **Splitting now would be undone by I-6 and would be undone in the most
   expensive place in the codebase.**
2. **It is already bounded by a test.** `0-countryBudget.test.ts`'s `EMITTED_BYTES` is a ceiling on the
   payload, so this cannot drift upward without a builder editing a number a reviewer sees. What was missing
   was not a bound but a *ruling*, and this is it.
3. **§0.4 decides which side of the line this is on.** Public-grade is *what is expensive to retrofit*.
   Splitting a static asset out of a bundle is a build-configuration change with no schema, no migration and
   no user-visible state — the cheapest class of retrofit there is. Authorization, ownership and the deletion
   cascade are on the other side of that line; a first-load byte count on a desktop planning companion is not.
4. **The native shell inverts the question anyway.** On Expo the payload is a file in the app bundle, not a
   first-load cost, and §1's end state is that the phone is the primary client.

**What is owed instead of a split, and it is small:** any increment that moves `EMITTED_BYTES` re-measures
`npm run web:build` and records the resulting bundle figure in that increment's `ROADMAP.md` ship gate, so the
share is a tracked number rather than a thing each round rediscovers. **The trigger that reopens this:** a
*second* generated dataset shipping ahead of its consumers — §8.10's airport index is the one already
designed — because two of them is a pattern and one is an increment, and the right answer to a pattern is a
build-time split for the class, not a special case for this file.

#### A-28 — filter 2 is two comparisons, not one, because the index it compares against is mixed-resolution (revision 22, QA R23-1, R23-2, R23-4)

QA round 23 attacked A-27 on four axes and broke one. The finding is right, its severity is right, and its
closing paragraph is right about the shape of the remedy being an architect's call rather than a patch:
**it names three candidate populations for filter 2, and none of the three alone is correct.** The answer
is a conjunction of two of them, and the reason is that filter 2 has been doing two different jobs under
one name since A-27 was written.

Everything below is re-derived here, from the same three pinned layers fetched independently
(838,726 / 3,083,490 / 13,287,234 bytes; all three checksums match `tools/gen-countries.mjs`'s pins to the
byte) with the real generator re-run against a patched filter. The numbers are an architect's; **the builder
re-derives every one of them from the generator itself, and if they disagree the generator is right.**

**Part 1 — the defect, reproduced.**

A-27 Part 4's filter 2 tests a candidate ring against *"every other entry `E` of the coverage-only index"*.
A-26 Part 4 made that index deliberately **mixed-resolution**: 175 codes at 1:110m, 64 at 1:10m. So what
filter 2 actually asks is *"do you overlap this neighbour as the index happens to draw it"* — and for a
neighbour drawn at 1:110m that is a question at the wrong scale. It fails in exactly one direction:
**generously**.

`MO` is the case. Macao's 1:50m candidate ring was checked against China's **1:110m** coastline, which is
generalised kilometres inland of the Pearl River delta, so there was nothing there to reject it and the ring
was admitted. Measured against the committed artefact over `MO`'s candidate bounding box padded by 0.1°, at
0.005°: **77 of 2,754 cells answer `MO` today and answer `null` once the ring is refused — ≈22.1 km²,
against Macao's own ~33 km².** Zhuhai Nanping (22.221 N, 113.503 E) is `MO` in the shipped index. Natural
Earth's 1:10m layer calls that ground `CN`; the shipped index cannot say `CN` there, because it draws China
at 1:110m — so `null` is the answer A-26 Part 1's rule requires, and `MO` is simply wrong.

A-27 Part 4 enumerates filter 2's rejects as *"`AD`, `HK`, `LI`, `MC`, `SG`, `SM` and `SX` — i.e. every
bordered filled code"*. **`MO` is a bordered filled code, the enumeration is short by one, and that sentence
is the defect** — exactly as the finding says. It survived both my Part 5 verification and the builder's for
one reason worth writing down, because it generalises past this ruling: **every sweep either of us ran
compared the index against itself.** A cell that was `null` and is now `MO` books as a *gain* under A-27
Part 3 property 2, and the index's own opinion of Zhuhai is `null` before *and* after, so no self-consistent
check could ever see it. A wrong answer of this class is only visible against a **third source**, and the
right one was already in the repository: the 1:10m layer the fill itself is cut from.

**Part 2 — the finding's three populations, each measured, each insufficient.**

All 153 candidate rings, run through filter 1 and then through each population in turn. *Kept* counts rings
surviving both filters; two of the twelve drops (`MV[0]`, `VA[0]`) are filter 1's in every row.

| filter 2's population | kept | what it gets wrong |
|---|---|---|
| **the coverage-only index, as shipped** (A-27, today) | 142 | admits `MO[0]` — 22.1 km² of Guangdong attributes to Macao |
| **every other code at the family's finest scale (1:10m)** | 144 | rejects `MO[0]` correctly, but **admits `HK[1]`, `HK[2]` and `SG[0]`** |
| **every other code at the candidate's own scale (1:50m)** | 143 | admits the same three, **and** loses `MF[0]` to `SX` for no reason in the ground |

The second row is the trap, and it is why the obvious remedy is not the remedy. `CN`'s and `MY`'s **1:110m**
rings cover Lantau and Singapore Island wholesale; their 1:10m rings do not. So a finest-scale comparison
stops rejecting `HK`'s two outlying-island rings and `SG`'s ring — and admitting them moves, at 0.005° over
their own boxes, **23 cells from `CN` to `HK` and 42 from `MY` to `SG`**. That is precisely the
`country → other country` class **A-27 Part 3 property 2 declares impossible by construction**, and precisely
the widening of A-26 Part 5 residue 2 that A-27 Part 6 residue 2 says filter 2 forbids. Replacing the
population trades a wrong answer at Macao for two wrong answers at Hong Kong and Singapore and forfeits the
strongest check the ship gate has.

The third row loses `MF`'s only candidate ring because Saint-Martin's and Sint Maarten's **1:50m** polygons
overlap each other in the source layer — a same-scale artefact of Natural Earth, not a claim on anyone's
ground: `SX`'s 1:10m territory is nowhere answered `MF`. Rejected.

**Part 3 — the ruling. Filter 2 becomes two arms, and neither may be dropped in favour of the other.**

A-27 Part 4's filter 2 is replaced, in full, by:

> **Filter 2 — forgiveness may not be taken from a neighbour, and "neighbour" is decided at the finest
> scale available.** A ring that survived filter 1 is kept only if **both** of the following are false:
>
> - **2a — against the shipped index.** `overlaps(ring, E.rings)` for any other entry `E` of the
>   coverage-only index, each at the resolution that entry ships at.
> - **2b — against each neighbour's finest drawing.** `overlaps(ring, F(c))` for any ISO code `c` other
>   than the candidate's own that the coverage-only index carries, where `F(c)` is that code's rings at
>   **the finest scale of the pinned family that carries `c`**, quantised exactly as the shipped rings are —
>   *regardless of the scale `c`'s own coverage entry is drawn at*.
>
> The arms are tested in that order and a drop is booked against the first that fires. Both populations
> exclude the candidate's own ISO code. **2a is the non-regression guarantee and 2b is the truth guarantee**;
> A-27 Part 3 property 2 rests on 2a exactly as this ruling rests on 2b, and dropping either one re-opens a
> defect this section has now measured.

With `FAMILY` and `FILL` as pinned, `F(c)` is *c*'s 1:10m rings for all 239 codes: measured here, **every one
of the base's 175 codes is present at 1:10m** (and the 64 filled codes are 1:10m by construction), so the
*"finest scale that carries `c`"* clause selects one layer today and is insurance that costs nothing.

**Filter 1 is unchanged, and this is a measured property rather than an omission.** Its population is the
code's own **coverage** rings; for a filled code those *are* the fill, and the fill is `FAMILY`'s finest
scale — so filter 1 already compares at the finest resolution available and carries no instance of R23-1's
class. **The trigger, stated so it cannot be discovered later:** the moment `FILL` is not `FAMILY`'s last
element, filter 1 acquires exactly this defect and needs its own second arm. `gen-countries.mjs` therefore
asserts `FILL === FAMILY[FAMILY.length - 1]` at start-up, naming this ruling in the message, so that a change
to either constant fails loudly instead of quietly reintroducing R23-1 one filter to the left.

**Part 4 — the second-instance census, which is the part the finding asked for.**

Not sampled. Every one of the **151 candidate rings that survive filter 1** was run against **all 239 codes**
under both arms. Exactly **four rings** get different verdicts from the two arms, and they are all of them:

| ring | arm 2a (shipped index) | arm 2b (finest) | shipped today | under A-28 |
|---|---|---|---|---|
| `MO[0]` | passes | **rejects — `CN`** | admitted; **wrong** | rejected by 2b |
| `HK[1]` | **rejects — `CN`** | passes | rejected | rejected by 2a |
| `HK[2]` | **rejects — `CN`** | passes | rejected | rejected by 2a |
| `SG[0]` | **rejects — `MY`** | passes | rejected | rejected by 2a |

The other 147 receive the same verdict from both arms. So: **there is no second instance of R23-1 in
the harmful direction — `MO` is the only ring the shipped-index comparison wrongly admits.** There are three
instances in the *harmless* direction, and they are recorded above rather than left to be rediscovered,
because a future reader who finds `HK` and `SG` rejected "against a coarse polygon" will recognise R23-1's
mechanism and be tempted to fix it. **Those three rejections are correct and must stay**; Part 2 has the
measurement of what admitting them costs.

**Part 5 — R23-2: the vertex means come out, and the claim narrows to what is provable.**

The finding is right that *"exact for simple rings"* is false as A-27 wrote it: a ring's vertex mean can lie
outside a concave ring, so the *"or the arithmetic mean of the vertices"* clauses can fire on a point neither
ring contains. The harm has a direction — a false positive makes **filter 1 unsound**, which is the Vatican
failure filter 1 exists to stop — and the means are surplus, because containment in either direction is
already caught by the individual-vertex clauses. A-27 Part 4's predicate is replaced by:

> **`overlaps(ring R, ring-set S)`** is true iff any of: **(a)** a vertex of `R` is inside `S` under the
> even-odd rule; **(b)** a vertex of any ring of `S` is inside `R`; **(c)** a segment of `R` crosses a
> segment of any ring of `S`. Rings whose bounding boxes are disjoint are rejected before any of this. It is
> evaluated on the **quantised** rings — the ones that ship — never the raw ones, and on the integer lattice
> those rings live on, so every clause is an exact integer comparison.
>
> **Exact for simple rings, as a theorem rather than a claim.** If two simple closed rings have no crossing
> pair of segments, they are either disjoint or one lies wholly inside the other; in the second case every
> vertex of the inner ring is inside the outer, so (a) or (b) fires. (a)–(c) are therefore complete and
> sound for simple rings, and the integer arithmetic makes each decision exact rather than nearly exact.
> **No claim is made for self-intersecting rings.** The artefact contains nine — eight in `MV`, one in `SD`
> (QA R22-2) — none of them a forgiveness candidate; where such a ring sits in a filter's *population* the
> predicate could in principle miss an overlap, bounded by the bow-ties' own lobes, which R22-2 measured at
> ~0.0196 km² lost / ~0.0118 km² gained in total.

**Re-verified here rather than inherited:** the finding measured "0 of 153 decisions change" against the
*old* one-arm filter. I re-ran the **new two-arm** filter with a mean-free predicate over all 153 candidates:
**0 of 153 decisions differ** — same 141 kept, same 12 drops, same filter and same code on every one. So the
removal is a simplification with no shipped consequence, and after it the ruling's own sentence is true.

*(Round 23's **R23-3** — the seven `overlaps()` tests cannot detect any of its three clauses being deleted —
is routed to the builder, not here, and I am not ruling on it. It is **sequenced** into the same increment
for one reason: R23-3's cause is the surplus this Part removes, and the fixtures it asks for are fixtures for
the three clauses this Part rewrites. Doing them apart means writing the tests twice.)*

**Part 6 — what this produces, measured.**

Generated at `v5.1.2`, base `110m`, fill `10m`, forgiveness from `50m`, with both arms:

| | A-27, shipped today | A-28 |
|---|---|---|
| candidate rings kept | 142 of 153 | **141 of 153** |
| dropped | 11 — 2 by filter 1, 9 by filter 2 | **12 — 2 by filter 1, 9 by arm 2a, 1 by arm 2b (`MO` → `CN`)** |
| forgiveness entries / codes | 54 / 54 | **53 / 53** |
| filled codes refused one | 10 — `AD GI HK LI MC SG SM SX UM VA` | **11 — the same plus `MO`** |
| index entries / distinct codes | 293 / 239 | **292 / 239** |
| rings / points | 1,034 / 22,229 | **1,033 / 22,220** |
| packed / emitted bytes | 369,688 / 374,826 | **369,524 / 374,659** |

- **Nuku'alofa, St John's, St George's and Diego Garcia still attribute to their own countries.** Senado
  Square is still `MO`; St Peter's is still `IT`; Pile Gate is still `HR`; the three Dalmatian coves are
  still `null`. The reference trip's 226 coordinate-bearing records are unchanged, as they were at I-5b.
- **The whole delta is Macao's ring.** A 0.02° sweep over all **54** of the committed artefact's forgiveness
  bounding boxes padded by 0.1° — **17,889,541 cells** — finds **5 cells changed, all `MO` → `null`, and
  nothing else anywhere**. At 0.005° over `MO`'s box alone the figure is 77 cells, ≈22.1 km², and **every one
  of them is the Zhuhai ground**: refusing `MO`'s forgiveness costs Macao no water of its own that the sweep
  can see.
- **Additivity is preserved.** The coverage half is untouched and the forgiveness half is a strict subset of
  I-5b's, so every ring of the **pre-I-5b** index is still present byte-identical and
  `country → null` against that baseline remains impossible by construction. ROADMAP criterion 4(e)(ii) and
  (iii) are measured against the pre-I-5b index and both still hold as written; the five `MO → null` cells
  are a diff against the *committed I-5b artefact*, where they are the correction and not a regression.

**Part 7 — what a builder implements. Two files, the artefact, and the tests. No engine.**

1. **`tools/forgiveness.mjs`.** Delete the two vertex-mean probes from `overlaps` and `vertexMean` with them;
   replace the header's block-quoted predicate with Part 5's, verbatim, and drop implementation note 3.
   `forgivenessFor`'s signature becomes
   **`forgivenessFor(candidates, own, others, finestOthers, opts = {})`**, with
   `opts = { filter1, filter2a, filter2b }`, all defaulting true and **each independently removable** so the
   injected faults stay a call rather than a code edit. It **throws** when `filter2b` is enabled and
   `finestOthers` is absent or empty: an accidentally-empty finest population is R23-1 exactly, and it must
   not be reachable by forgetting an argument. Each drop record gains
   `against: 'coverage' | 'finest' | null`; `filter` stays `1 | 2` so the existing golden's shape and the
   run's counting survive.
2. **`tools/gen-countries.mjs`.** Assert `FILL === FAMILY[FAMILY.length - 1]` at start-up, with Part 3's
   trigger named in the message. Build the finest layer's full code→rings map **once, outside the per-code
   loop** — the fill layer is already downloaded and parsed, and re-preparing 239 ring-sets 62 times is the
   difference between a generator run and a coffee break. Report the two arms separately in the run's own
   output (`… 9 by filter 2a — a neighbour's ground as the index draws it; 1 by filter 2b — a neighbour's
   ground at the finest scale`). `fixtures/golden/forgiveness-drops.json` gains the `against` field and its
   `forgivenessAt` positions move because one entry is gone. `--no-fill`, `--scale`, `--dry-run`,
   `--audit-only` and `--holes` all keep working.
3. **`packages/core` — one hand-written number, and nothing else.** `countries.gen.ts` is regenerated;
   `countryIndex.ts`'s and `derive/country.ts`'s A-27 text is otherwise still true and must not be touched.
   **If `countryOf` grows a branch, a distance function or a parameter, the increment has gone wrong** — that
   sentence is now three rulings old and has not moved.

   *(**Corrected 2026-08-28, QA R24-1.** As first written this item said "no hand-written change in any
   file" and that `countryIndex.ts`'s A-27 text "is still true and must not be touched" — and it was wrong
   in one word. `countryIndex.ts`'s docstring says **"54 of the 64 filled codes carry a second entry"**, and
   this increment is exactly what makes that **53**: `MO` moves from having a forgiveness entry to being
   correctly refused one, so the entry count falls 54 → 53 and the refused count rises 10 → 11, as Part 6's
   table already states. The I-5c builder complied with the instruction and left the number stale; the
   instruction is the defect, not the compliance. **The number is now 53** in `countryIndex.ts:98`. Nothing
   else in that docstring or in `derive/country.ts` moves — the mechanism it describes is unchanged by A-28,
   only the census is. The 54s that remain elsewhere in this document and in `ROADMAP.md` are **historical
   and correct**: A-27's own Parts and revision 21's changelog record what I-5b measured, and Part 6's
   17.9 M-cell sweep is over the **committed I-5b artefact's** 54 boxes by construction.)*
4. **The tests.** `0-countryBudget.test.ts`'s `EMITTED_BYTES` is re-measured from the generator's output;
   `country.test.ts`'s entry count moves to the measured 292 while its distinct-code assertion stays at 239.
   **One new named test, and it is the point of the increment:** with `filter2b` removed, `MO` acquires a
   forgiveness entry and Zhuhai Nanping attributes to `MO` — red. That is the assertion whose absence let
   R23-1 ship. R23-3's per-clause fixtures land here too, per Part 5's note.

**Part 8 — the residues. A-27 Part 6's three stand, and its trigger is re-verified.**

1. **Vatican City is `IT` at every scale.** Unchanged; filter 1 still drops the 1:50m polygon.
2. **A filled country's border is biased toward the smaller state, ~700 m at Monaco.** Unchanged — and now
   *doubly* protected: arm 2a forbids widening it, and Part 2 records the 65 cells that would move if it were
   dropped.
3. **A band of sea answers the island rather than `null`, around 53 island territories** (was 54; `MO` leaves
   the list). Unchanged in kind. **Its trigger — two forgiveness bands meeting — is re-derived here rather
   than inherited:** all 1,378 pairs of the 53 entries, ring against ring-set, give **zero** overlaps.
   Fifteen pairs' bounding boxes meet, fourteen of them because `KI` spans 27° of the Pacific and the
   antimeridian and the fifteenth being `VG`/`VI`; not one is an overlap. The residue is intact and the
   trigger has not fired.

Nothing here is a *new* residue. Macao losing its forgiveness band is not one: Part 6 measures the cost at
zero cells of Macao's own water, and `MO` joins the ten codes A-27 already refused for being bordered.

**Part 9 — R23-4: the ROADMAP sentence, ruled here and corrected there.**

`ROADMAP.md`'s I-5, I-5a and I-5b ship gates each say *"`node --test packages/core` still runs directly"*
alongside *"the budget test is still the first test"*. Three facts, verified here by running all three
commands:

- `node --test packages/core` resolves the workspace through its `exports` field, imports `src/index.ts`,
  **registers no tests**, and reports one passing subtest named `packages/core` in ~170 ms. It **is** a real
  gate — it proves the 374 kB generated module type-strips with no build step — but it demonstrates nothing
  about ordering and runs none of the suite.
- `npm run test:tap` runs the whole suite, and **does not run it in file order**: with Node's default
  concurrency the budget test lands at **`ok 190`**, not `ok 1`. *(The finding's own correction says
  otherwise; this is the one place round 23 is wrong, and it is wrong in the direction of a stronger claim.)*
- `node --test --test-concurrency=1 packages/core/test/*.test.ts` puts the budget test at **`ok 1`, `ok 2`,
  `ok 3`** — so *"first"* is a true and useful claim about exactly one command.

**Ruling: attach each fact to the command that demonstrates it, and demote "first" to what it is.** The
type-stripping gate is the load-bearing half and it is order-independent — a module that will not strip
fails *every* test that imports core, whenever it runs. Being first is a fail-fast convenience observable
only under serial execution. `ROADMAP.md` carries the corrected wording in all three ship gates. **No new
script, no new command in any gate, and nothing about what is run changes** — this is a prose defect and its
fix is prose.

#### A-29 — a city's *stated* country fills a gap the coordinate cannot answer, never overrides one, and only if the index can draw it (revision 23, QA R26-5)

A-26, A-27 and A-28 are three rulings about **the index**. This one is not about the index at all, and that
is the reason the defect survived three adversarial rounds on the same paragraph: `City.countryCode` is not
a coordinate, so no amount of attention to `countryOf` was ever going to reach it.

**Part 1 — the defect, and why it is not the island residue in another costume.**

`derive/summary.ts` builds `cities[].countryCode` as `countryOf(c.centre, index)` and unions the non-null
answers, over city centres, places and stops, into `countryCodes`. The document's own `City.countryCode` —
stored, round-tripped through `toJSON`/`fromJSON`, hand-supplied by `createTrip` and by the legacy importer —
is never consulted. Measured against the shipped artefact: `countryOf` returns `null` for **Hvar Town**
(43.1729, 16.4413), **Stiniva Cove, Vis** and **Blue Cave, Biševo**. So a Dalmatian-islands trip whose
cities are Vis and Hvar mints `countryCodes: []` — an empty lifetime map for a trip whose every `City`
record says `HR`.

**That is not A-26 Part 1's residue and must not be filed under it.** A-26 ruled that `null` is the *correct*
answer for a coordinate no polygon in the dataset contains, and it is still correct: nothing here computes an
answer from that coordinate, nothing snaps, and no ring moves. What A-26 ruled on is **the absence of
evidence in the dataset**. What this ruling is about is a **second, independent piece of evidence the
document already carries and the summary threw away**. The two do not touch, and the root `CLAUDE.md`
convention that decides it — *"his content is authoritative and outranks our ideas"* — points one way only.

**The disclosure it was decided under.** BUILD-NOTES **KD-55** enumerates four *coordinate* sources and
argues one of them (`homeBase`) out; it does not consider a stated one, because it is a ruling about which
coordinates count. The builder's table row beside it does mention the field in passing — *"not copied from
`City.countryCode` (which is importer metadata and is not nullable)"* — and that half-sentence is the most
accurate thing anybody has written about the field. **It is also exactly why the answer is a gate and not a
copy.**

**Part 2 — what `City.countryCode` actually is, read out of the code rather than assumed.**

| | |
|---|---|
| Type | `string` — not `CountryCode \| null`, not branded. `ids.ts` says why, and that widening it is a migration rather than a rename |
| Default | `''`. `createTrip` writes `c.countryCode ?? ''`; the legacy importer writes `opts.countryCodes?.[key] ?? ''` |
| Validated | **Nowhere.** `fromJSON` asserts it is a string and nothing else. `validateTrip` has no rule for it. No case normalisation, no ISO membership check, no relation to `centre` |
| Written by a UI | **Never.** Neither `Library.tsx`'s *New trip* nor `PastTripForm.tsx` collects a country; every city created inside the product today carries `''` |
| Actually populated by | `import/legacyDays.ts`'s hand-supplied `countryCodes` map, and any document written or round-tripped as JSON |
| Read by | **nothing**, at any layer, before this ruling |

So the breaker's caution is right and is load-bearing: this field cannot simply be trusted. It can hold
`''`, `'Croatia'`, `'hr'`, `'HRV'`, `'ZZ'` or a stale answer, and nothing in the system would notice.
**It also cannot simply be ignored**, because it is the user's own statement about their own trip and it is
the only evidence that exists where the dataset has none. The answer is neither trust nor refusal: it is a
**gate**, and the gate's last step is what makes the whole thing safe.

**Part 3 — the ruling.**

> **A city's stated `countryCode` is admitted as an attribution for that city if and only if the coordinate
> attribution for the same city is `null`, and the stated value survives a four-step acceptance gate. It
> never overrides a non-null `countryOf`, it is never read for any record other than the `City` that carries
> it, and it never reaches `countryCodes` except through that city's own entry.**
>
> The gate, total and in order, evaluated per city:
>
> 1. `raw = city.countryCode`; if it is not a string, **reject**. (`fromJSON` guarantees a string for a
>    stored document; the helper is total so a hand-built fixture cannot crash it.)
> 2. `t = raw.trim()`; if `t` does not match `/^[A-Za-z]{2}$/`, **reject**. This is what rejects `''`,
>    `'HRV'`, `'Croatia'`, `'H1'` and `'H R'`.
> 3. `u = t.toUpperCase()`.
> 4. If the **shipped index does not carry `u`** as the code of some entry, **reject**. Otherwise the
>    accepted value is `u`.
>
> `tripSummary` builds the membership set once per call — `new Set(index.countries.map((e) => e.code))`,
> 292 entries, 239 distinct codes — and hands it to the per-city helper. The helper stays **module-private
> in `derive/summary.ts`**: §2.10's export surface does not move, and every clause of the gate is reachable
> through `tripSummary` with a hand-built `City`.

**Step 4 is what makes this affordable, and it is not a formality.** §8.4 clause 3's second consequence
draws the lifetime map from *this index's own rings, with no tiles behind it*. A code the index does not
carry is therefore a country the map **cannot fill** — the statistic would name a country the signature
screen silently omits. Measured against the shipped artefact: the 239 codes include `TW`, `XK`, `PS`, `EH`,
`HK`, `MO` and `SG`, and every sovereign state a traveller is likely to type; the codes it refuses are ISO
codes Natural Earth's admin-0 layer folds into a parent state — `RE`, `GF`, `GP`, `MQ`, `YT`, `SJ`, `TK`,
`BQ` — for which the coordinate attribution already returns the parent and is the better answer. So the
gate's alphabet is *the set of countries this product can draw*, which is the only alphabet a summary row
has any business speaking.

**Part 4 — precedence, and the field that makes the blend legible.**

`TripSummaryCity` becomes:

```ts
type TripSummaryCity = {
  key: CityKey;
  name: string;
  /** The answer, whatever its source. `null` is first-class and never a guess. */
  countryCode: CountryCode | null;
  /** Where that answer came from. `null` exactly when `countryCode` is null. */
  countrySource: 'coordinate' | 'stated' | null;
};
```

- `countryOf(city.centre, index)` is evaluated first. Non-null ⇒ `countrySource: 'coordinate'`, and the
  stated value is **not consulted**.
- Only if it is `null` is the gate run. Accepted ⇒ `countrySource: 'stated'`. Rejected ⇒
  `{countryCode: null, countrySource: null}`, which is exactly today's answer.
- `countryCodes` is the sorted distinct union of every non-null `cities[].countryCode` — *of either source* —
  plus, unchanged, `countryOf` over `trip.places[].at`, over every scheduled stop and over every pooled stop.
  `null` still never enters it.

Four things this deliberately does **not** do:

1. **It does not give `Place` or `Stop` a stated country.** They have no such field and none is being added,
   so a place on Vis stays unattributed and honestly so. A stated code on a city does not rescue that city's
   records; it attributes the city, and nothing else.
2. **It does not touch `homeBase`.** KD-55 stands verbatim and is re-affirmed: counting it would put the
   traveller's own country on the lifetime map for every trip they ever record.
3. **It does not make the union additive.** A stated code is admitted *only where the coordinate is silent*,
   so a typo'd `HU` on a Vienna city — whose centre resolves `AT` — can never put Hungary on the map. Had the
   rule been *"union both"*, one mistyped field would inflate the lifetime map permanently, which is §8.4
   decision 2's own objection (*"a number a user can inflate by typing"*) arriving through the back door.
4. **It does not rename `City.countryCode`.** `ids.ts` already rules that widening or renaming that field is
   a migration and not a naming change. The name collision the finding notes — the row's `countryCodes` and
   the document's `countryCode` meaning different things — is closed by `countrySource` and by the two
   docstrings, not by touching a persisted field.

**Part 5 — `SUMMARY_VERSION` goes to 3, and this is the cheapest moment it will ever be.**

Clause 3 is unambiguous: the constant is bumped whenever any summary field's derivation changes, and this
changes two. `SUMMARY_VERSION = 3`, with its own line in the constant's docstring. Two things worth stating
because they will not be obvious later:

- **This is the first bump that exercises the rescan as a rescan.** Version 2's rows were upgraded from rows
  carrying no `summaryVersion` field at all; I-6's own BUILD-NOTES records that a 2 → 3 bump was exercised
  only by ATTACK 1's synthetic knock-back. I-6a makes it real, which is the right place for it — the same
  increment repairs the rescan's bookkeeping under R26-1…R26-4, so the mechanism and its first genuine load
  land together.
- **It costs nothing today and would cost a migration later.** A-26 Part 7's argument for the fourth time,
  and it still holds: there are no user rows in the wild.

**Part 6 — non-regression, measured, not argued.**

On the reference trip, **all six cities' stated codes are identical to their derived codes** — `vienna` AT,
`dubrovnik` HR, `split` HR, `prague` CZ, `budapest` HU, `london` GB — so every one takes the `'coordinate'`
branch and the stated value is never consulted. `countryCodes` stays `['AT','CZ','DE','GB','HR','HU','US']`
and `fixtures/golden/countries.json` does not move. **A-29 changes nothing about the only real trip we
have**, which is the same strongest-single-check A-26, A-27 and A-28 each rested on — and it carries the same
warning: a corpus of one Adriatic trip cannot exercise the `'stated'` branch at all, so that branch's tests
are hand-built fixtures and must be, rather than something the sample is hoped to cover.

**Part 7 — what a builder implements. One core file, one constant, the tests. No engine, no port, no index.**

1. **`packages/core/src/derive/summary.ts`** — the module-private gate helper of Part 3; `TripSummaryCity`
   gains `countrySource`; `tripSummary`'s city map and the `countryCodes` union as Part 4 states them;
   `SUMMARY_VERSION = 3` with its docstring line. The function stays pure, keeps its required-index throw,
   and gains no argument.
2. **`packages/core/src/geo/`, `derive/country.ts`, `countries.gen.ts`, `tools/gen-countries.mjs`** —
   **untouched.** `countryOf` gains no branch, no parameter, no distance function. That sentence is now four
   rulings old and has not moved.
3. **`apps/web`** — `Library.tsx` renders `row.countryCodes` as it already does. `countrySource` is
   **carried and not branched on** in this increment (§8.1's precedent for `datePrecision`); a later surface
   may show it, and nothing may ever *gate* a country's inclusion on it, because inclusion is decided here.
4. **The tests, and §0.5's injected fault for every clause of the gate.** Hand-built cities, one assertion
   each: `''` → `null`; `'hr'` → `HR` (normalised); `'  HR  '` → `HR`; `'HRV'` → `null`; `'Croatia'` →
   `null`; `'ZZ'` → `null` (well-formed, not in the index); `'RE'` → `null` **with Part 3's reason in the
   test's own text**, so the next reader does not "fix" it. Then the three that are the point:
   - **the gap-fill** — a city at Hvar Town's coordinate with `countryCode: 'HR'` yields
     `{countryCode: 'HR', countrySource: 'stated'}` and `countryCodes: ['HR']`. **Mutation: delete the
     fallback → red.** This is the assertion whose absence let R26-5 ship.
   - **the non-override** — a city at Vienna's coordinate with `countryCode: 'HU'` yields
     `{countryCode: 'AT', countrySource: 'coordinate'}`, and `countryCodes` contains **`AT` and not `HU`**.
     **Mutation: let the stated value win → red.**
   - **the reference trip does not move** — `tripSummary` over the sample yields the same `countryCodes` as
     at `SUMMARY_VERSION` 2 and every city reports `'coordinate'`. **Mutation: reverse the precedence → the
     golden moves.**

**Part 8 — the residues, three, disclosed rather than left to be discovered.**

1. **A stated code that disagrees with a non-null coordinate attribution is unused and unreported.** The
   coordinate wins and nothing surfaces the disagreement, which is in tension with *"flag conflicts, don't
   resolve them by guessing"* — mitigated by the fact that this is a stated precedence rule rather than a
   guess, and that the disagreement cannot change any output. **It is not surfaced here on purpose:** the
   right home for the report is a `geoCheck`/`validateTrip` warning, and that needs the country index
   threaded into the validation surface as a required argument — a change to the most heavily ceilinged API
   in the project, for a case reachable today only through a hand-written document. **Trigger to reopen: the
   first surface that lets a user type a country code.** There is none today (Part 2's table), and the moment
   one exists the silent override becomes a user-visible surprise and the warning is owed in the same
   increment as the input. *(Revision 24, QA **R27-3**: residue 3 below now carries the number that decides
   whether the warning this residue defers is optional or owed on that day. Read the two together.)*
2. **A code the index does not carry is refused, so `RE`, `GF`, `GP`, `MQ`, `YT`, `SJ`, `TK` and `BQ` are
   never admitted.** Deliberate — Part 3's argument. The coordinate attribution answers the parent state for
   all of them, which is what the map can draw. **Trigger to reopen:** a dataset that carries the code, or a
   map surface not drawn from this index.
3. **A typo that lands on a valid, drawable code, on a city whose coordinate the index cannot answer, is
   accepted and puts a wrong country on the lifetime map.** Accepted deliberately: it is the user's own
   document stating it, their content outranks our inference, and it is reachable only where we have nothing
   better than `null` to offer. The alternative — refusing every stated code — is the defect this ruling
   closes. It is bounded to cities the index cannot attribute, which the reference corpus measures at three
   records out of 226.

   *(**Revision 24, QA R27-3.** That sentence bounds how often the stated branch **fires**; it says nothing
   about how often a fired branch is **wrong**, and the second number is the one the ruling is actually
   exposed to. Measured over the shipped index's own 239 codes: a single-character substitution lands on
   another real, drawable code for a mean of **22.4 of a code's 50 neighbours — 45 %** — and `HR`
   specifically has **19**, including `HU`, the neighbouring country; **82** codes have a real code as their
   own reversal. So on the exact case A-29 was written for, a Dalmatian-islands trip, mistyping `HR` as `HU`
   yields `countryCodes: ['HU']` — Hungary on the lifetime map, silently, labelled only `'stated'`. **This
   changes no decision and reopens nothing**: the gate is still the right shape, and the alternative is still
   worse. It is recorded because residue 1's trigger — the first surface that lets a user type a country
   code — needs it: a 45 % chance that a one-key slip is *accepted* rather than refused is what makes the
   `geoCheck` warning residue 1 defers **owed in the same increment as the input** rather than optional.
   `qa/i6a-gate.mjs` §4 is the census.)*

#### A-31 — `travelStats`: what it may be computed from, and the row census clause 2 forgot to ask for (revision 24, ROADMAP I-7)

Clause 2 has carried a `TravelStats` type since revision 9 and has never been implemented. Specifying it as
an implementation brief is what found the defect: **two of its six fields cannot be computed from the row
clause 3 defines**, and no amount of care by a builder would have changed that.

**Part 1 — the defect, measured against the shipped row.**

`TripSummaryRow` is `{id, title, startDate, endDate, datePrecision, cityCount, dayCount, stopCount,
poolCount, revision, countryCodes, cities, summaryVersion}`. Clause 2 asks for `unattributed: {places,
stops}`. The row carries:

| Asked for | What the row has | Verdict |
|---|---|---|
| how many **places** could not be attributed | nothing — there is no `placeCount`, let alone an attributed one | **not computable** |
| how many **stops** could not be attributed | `stopCount` and `poolCount`, which count *records*, not *coordinate-bearing* records | **not computable** |
| how many **cities** could not be attributed | `cities[].countryCode === null` | computable, and clause 2 never asked |
| whether the trip had **anything to attribute** | nothing | **not computable** |

The fourth row is the one that matters, because ROADMAP I-7's verification demands it in so many words: *"a
trip with no coordinate-bearing record at all must produce 'no places yet', never '0 countries' as though
zero had been measured."* Against the shipped row those two states are **the same value** — `countryCodes:
[]` — and a `travelStats` written against it must either guess or lie. A criterion the design makes
unsatisfiable is a design defect (**How a criterion is written**, rule 5); this one is mine, and it is
being fixed in the increment that first needs it rather than worked around in the increment's code.

**Why this is not solved by loading the documents.** §4.2's *"exactly ONE trip in memory at a time"* is not
negotiable here (clause 3's own first sentence), and the lifetime map is precisely the screen that would
want forty. The census has to be minted where the document is, which is `tripSummary`, which is where every
other summary field is minted. It is clause 1 working exactly as written — the fix is to compute the right
thing inside that write, not to move the computation.

**Part 2 — the row widening. Two numbers per record class, in the walk that already visits them.**

```ts
export type AttributionCensus = {
  /** Records bearing a resolvable coordinate. The denominator. */
  located: number;
  /** Of those, the ones `countryOf` gave a country. Never greater than `located`. */
  attributed: number;
};

// on TripSummaryRow:
  /**
   * The coordinate-bearing record census `countryCodes` was computed from (§8.4 A-31).
   * A count *about this one document*, minted inside the write that carries it and stamped
   * with `summaryVersion` — which is what separates it from a lifetime statistic, and why
   * Part 6's rule permits it. Cities are absent on purpose: `City.centre` is non-nullable,
   * so `located` is `cities.length` and `attributed` is the non-null `countryCode`s.
   */
  attribution: { places: AttributionCensus; stops: AttributionCensus };
```

Definitions, total and matching `countryCodes`' own walk record for record:

- `places.located` — `trip.places` where `at !== null`. `places.attributed` — of those, `countryOf(at,
  index) !== null`.
- `stops.located` — every scheduled stop (`trip.days[].stops`) **and** every pooled stop (`trip.pool`)
  where `stopLatLng(stop, trip) !== null`. `stops.attributed` — of those, a non-null `countryOf`.

**`attributed <= located` is an invariant of the mint and a *clamp* at the read (added at revision 25, QA
R28-4).** `tripSummary` cannot violate it — both counters are incremented in one walk and the second is
guarded by the first — but `travelStats` is handed rows out of **storage**, and a row that arrives with
`attributed > located` (hand-edited, half-migrated, or from a build that does not exist yet) would make
`unattributed` **negative**, which is a number no surface can render honestly. So the read clamps:
`unattributed.places += Math.max(0, p.located - p.attributed)`, and the same for stops. Not a throw — the
row came from storage, not from a caller, and A-31's policy for a malformed row is Part 3's *"counting zero
would make it invisible"*, not refusal. Not silent either: `located` is still summed as given, so a row
whose census is impossible still shows up in the denominator.

**Pooled stops are in, and that is inherited rather than decided here.** Clause 3 already defines
`countryCodes` as the union over *"every scheduled stop and over every pooled stop"*; a census whose
denominator excluded the pool could report `attributed < ` the number of countries the same row claims.
The two must walk the same records or the row contradicts itself. That a pooled stop is a plan rather than
travel is a real objection and it is Part 5 residue 4, filed against clause 3 where it belongs.

`SUMMARY_VERSION = 4`, with its own line in the constant's docstring. **A-29 Part 5's argument holds for the
fourth time and is not re-made:** there are no user rows in the wild, and the rescan is generic —
`store.ts:70` is `(row.summaryVersion ?? 0) < core.SUMMARY_VERSION` and `selectors/index.ts:213` is the same
comparison, and neither cares what the constant is. **So no client code changes.** The two readers above are
the only two permitted, and `test/views.test.ts:274` already asserts that **no view** is a third; a builder
who finds themselves editing a client file to accommodate this bump has found a fourth reader, which is a
finding rather than a chore.

**Part 3 — the population, and what `today` is for.**

This is the half clause 2 left open, and every field depends on it.

> **`travelStats` partitions its rows by `lifecycle(row, today)` and computes the lifetime map from the
> travelled ones only.** A `planned` trip contributes **no country, no city, no day and nothing to either
> census**. It contributes exactly one thing: `+1` to `trips.planned`.

The argument is clause 2's own. A stored `countriesVisited: 47` is refused because *"it is a number a user
can inflate by typing"* — and a lifetime map that counts a trip to Japan you have booked for next spring is
that same inflation, reached by planning instead of by typing. A country you have not been to is not on the
map of everywhere you have been.

Two consequences, both stated so a builder does not have to choose:

1. **An `active` trip's contribution is clamped at `today`.** A 14-day trip on its second day contributes
   **2** days to `daysTravelled`, not 14, and its `lastVisit` is `today`, not a date in the future. This is
   the second thing `today` is for and the reason it is a parameter rather than a convenience.
2. **An `active` trip contributes all of its countries and cities, unclamped.** Refining that needs
   day-level attribution, which the row does not carry and §8.5's `Visit` has not been built. Including
   them is the lesser wrong — Part 5 residue 2, with its trigger.

**A row whose `endDate` precedes its `startDate` degenerates to its start day.** `validateTrip` reports it
as an issue and does not reject it (`validateTrip.ts:181` computes `expected = 0`), `fromJSON` accepts it,
so it reaches this function and this function may not throw on it. One clause, applied everywhere:
`travelEnd = max(travelStart, clamp(endDate))`. It contributes one day, a same-day first/last visit, and
its countries. Counting zero would make a malformed row *invisible*, which is worse than counting it small.

**Part 4 — the algorithm, in the order a builder writes it.**

```ts
export type TravelStatsCountry = {
  code: CountryCode;
  /** The `startDate` of the earliest travelled trip carrying this code. */
  firstVisit: IsoDate;
  /** The clamped end of the latest travelled trip carrying it — never after `today`. */
  lastVisit: IsoDate;
  /** In canonical row order. `TripSummaryRow.id` is a plain `string`, so this is too. */
  tripIds: string[];
  /** **A-34.** True when no `completed` trip contributed this row. */
  provisional: boolean;
};
export type TravelStatsCity = {
  /** `normalizeCityName(name)` — a grouping key, never a `CityKey`, never `''`. */
  nameKey: string;
  /** The raw display name from the first member in canonical row order. */
  name: string;
  countryCode: CountryCode | null;
  tripIds: string[];
  /** **A-34.** True when no `completed` trip contributed this row. */
  provisional: boolean;
};
export type TravelRecordCensus = { cities: number; places: number; stops: number };
export type TravelStats = {
  countries: TravelStatsCountry[];
  cities: TravelStatsCity[];
  trips: { planned: number; active: number; completed: number };
  daysTravelled: number;
  located: TravelRecordCensus;
  unattributed: TravelRecordCensus;
  unnamedCities: number;
};

/** Pure. @throws {Error} programmer error only — a duplicate row id, or a malformed date. */
export function travelStats(summaries: readonly TripSummaryRow[], today: IsoDate): TravelStats;
```

1. **Duplicate ids throw.** `travelStats: duplicate summary id "<id>"` — a library is keyed by id, so two
   rows with one id is a caller bug, and a silent dedupe would make `trips.completed` quietly wrong for
   whoever built the list. §2.1: core throws on programmer error and returns `Issue[]` for everything else,
   and this is not a domain problem a user can have.
2. **Canonical order, computed once: `summaries.slice().sort()` by `dayNumber(startDate)` ascending, then
   `id` ascending.** Everything downstream reads this array, so **no output depends on the order the caller
   happened to pass** — which is what makes the golden stable and the purity assertion meaningful. `slice()`
   before `sort()`: the input is `readonly` and must come back untouched.
3. **`trips`** — `lifecycle(row, today)` over **every** row, counted three ways. `TripSummaryRow`
   structurally satisfies `DatedTrip` (`derive/lifecycle.ts:29`), so this is the existing function with a
   new caller and **not** a second implementation of trip state — sequencing rule 1.
4. **The travelled set `T`** — rows whose lifecycle is `'active'` or `'completed'`. Per row:
   `a = dayNumber(startDate)`; `b = lifecycle === 'active' ? min(dayNumber(endDate), dayNumber(today)) :
   dayNumber(endDate)`; then `b = max(a, b)`.
5. **`daysTravelled`** — the size of the **union** of the `[a, b]` intervals, by sort-and-sweep: sort by
   `a`, keep a current interval, extend it while `a <= cur.b`, otherwise bank `cur.b - cur.a + 1` and start
   a new one. **Union, not sum**, because two trips overlapping in time are not two days of your life; and
   sweep, not a `Set` of day numbers, because an `IsoDate` admits year `0001` and a hand-written row would
   otherwise allocate millions of entries. *(Revision 25: that justification was **true of the type and
   false of the implementation** until A-32 — `dayNumber('0001-01-01')` was silently `1901`'s. A-32 makes
   the clause honest, and round 28 measured the cost the clause asserts: 200 rows each spanning
   `0001-01-01`…`9999-12-31` sweep in **1.9 ms**, 50,000 rows in **283 ms**, against ~730M `Set`
   insertions for the first. The algorithm does not change.)*
6. **`countries`** — for each row of `T`, for each code in `row.countryCodes`: `firstVisit = min(a)`,
   `lastVisit = max(b)`, append `row.id`, and `provisional &&= lifecycle !== 'completed'` (**A-34**). Emit
   dates with `fromDayNumber`. **Sorted by `code` ascending.**
7. **`cities`** — for each row of `T`, for each `c` of `row.cities`: `nameKey = normalizeCityName(c.name)`.
   - If `nameKey === ''`, **`unnamedCities++` and skip.** `model/cityName.ts` is explicit that a name
     folding to `''` *"is not an identity"* (§2.14 A-14 assertion 5); grouping on it would put every blank
     city in every trip into one row labelled with nothing. Skipping without counting would be silent loss,
     which is why the count is a field.
   - **The group key is the pair `(nameKey, countryCode)`**, `null` being a distinct value. ROADMAP I-7
     requires the same name in two countries to be **two** rows, and that is only expressible if the country
     is part of the key. `name` and `countryCode` come from the **first** member in canonical order; a trip
     is added to `tripIds` **at most once** even if it holds two cities that fold to the same key.
     `provisional` accumulates as for a country (**A-34**), per row and not per city.
   - **Sorted by `nameKey` ascending, then by `countryCode` ascending with `null` last.**
   - **Two `null`-country cities that fold to the same name are one row.** `null === null`, so this
     follows from the key and is not a separate decision — Part 5 **residue 6** discloses it, weighs it and
     states the trigger.
8. **The two censuses**, summed over `T` only — same population as everything else:
   - `located.cities = Σ row.cities.length`; `unattributed.cities = Σ` of those with `countryCode === null`.
   - `located.places = Σ row.attribution.places.located`; `unattributed.places = Σ (located - attributed)`.
   - `located.stops` / `unattributed.stops` — the same, from `row.attribution.stops`.

**And the sentence the Profile is built against, stated here so I-8 has no judgment call:**

> **"No places yet"** is `located.cities + located.places + located.stops === 0`. It is *not*
> `countries.length === 0`, and it is *not* `unattributed === 0`. A history with nothing in it and a history
> whose every coordinate the dataset cannot name are different claims, and the second one says
> *"N places we could not put on the map"* — never *"0 countries"*, which asserts a measurement that was
> never taken.

**Part 5 — the residues, six, disclosed rather than left to be discovered.** *(Five at revision 24;
residue 6 added at revision 25, QA R28-6, and residue 2 gains the obligation A-34 attaches to it.)*

1. **`firstVisit`/`lastVisit` are trip-range, not country-range.** A trip through six countries reports the
   whole trip's span for each of them, so "first visited Croatia" is really "the start of the first trip
   that reached Croatia". The row carries no per-country or per-city dates and cannot without carrying the
   day→city edges, which is a document-sized answer. **Trigger to reopen:** day-level attribution — §8.5's
   `Visit`, or a summary that carries city date ranges (`cityRange` already computes them per document).
2. **An `active` trip contributes countries it has not reached yet.** Day 2 of a six-country trip puts all
   six on the map. Bounded — it self-corrects at `endDate`, it can only ever be wrong about a trip the user
   is *on*, and the alternative (excluding active trips) tells a traveller standing in Vienna that they have
   never been. **Trigger:** the same as residue 1. ***Revision 25 (QA R28-7): this residue is licensed only
   because the contribution is marked.*** Including a country the traveller has not reached is a tolerable
   over-report; rendering it *as a visited fact, with dates, unmarked* is the root `CLAUDE.md` convention
   broken — and that is exactly what `cli.ts stats` did. **A-34** attaches the obligation: every row whose
   evidence is entirely un-clamped carries `provisional: true`, and no surface renders one the way it
   renders a visited country. Reading this residue without A-34 gets the wrong answer.
3. **One city can become two rows.** Same city, two trips, one of which the index could attribute and one of
   which it could not, gives `(tokyo, JP)` and `(tokyo, null)`. Honest — nothing merges records we cannot
   show are the same place — and much narrower since A-29 gap-fills the common case. **Trigger:** a surface
   that lets a user merge two city rows, or a cross-trip city identity.
4. **A pooled stop is a plan, and it counts.** Inherited from clause 3's definition of `countryCodes`, not
   introduced by this ruling; the census merely stops it being invisible. **Trigger:** the first surface that
   shows "countries visited" beside a pool, at which point clause 3 is what changes, not A-31.
5. **`trips.completed` counts overlapping trips separately while `daysTravelled` counts their shared days
   once.** Deliberate and not a discrepancy: they are counts of different things, and the alternative
   (double-counting a day) is the one that inflates.
6. **Two *different* cities can become one row — the inverse of residue 3, and it was missing from it**
   (revision 25, QA R28-6). Residue 3 discloses the **split**: one city, two rows, because the country is
   part of the key. It never disclosed the **merge**: `null` is a value in that key, so two cities with the
   same folded name whose `countryCode` is `null` in *both* — genuinely different places, in genuinely
   different countries, neither of which the index could attribute — collapse into **one** row carrying
   both trips' ids. Springfield, Illinois and Springfield, Massachusetts are one row if neither could be
   placed.

   **Accepted as documented behaviour, and the reason is that the alternative inflates.** An unattributed
   city has, by definition, no information that distinguishes it from another unattributed city of the same
   name: the row carries `{key, name, countryCode, countrySource}` and the key is opaque and per-trip
   (§2.2 A-10), so *"are these two the same place"* has no evidence to answer with. The only mitigation
   available is to stop grouping `null`-country cities across trips at all — one row per trip. Costed
   against the census's purpose, that is strictly worse: the **common** case of a `null` country is not two
   Springfields, it is *the same city on two trips* that the dataset cannot name — Vis, Hvar, Biševo,
   Lokrum, the landforms A-26 Part 1 measured as absent at every scale — and it would report three visits
   to Hvar as **three cities**, which is the inflation §0.7 forbids, on the traveller's own real data,
   to avoid an under-count on a case requiring two same-named cities in two unattributable countries. A
   statistic that never inflates and occasionally under-counts is the right side of that trade, and it is
   the same side residue 3 already picked. A-29's stated-country gate narrows the whole class further with
   every code the index gains.

   **Bounded and marked.** It can only affect a row whose `countryCode` is `null` — which A-34's
   `provisional` does *not* cover, so this needs its own treatment on the surface: a `(nameKey, null)` row
   is already the row I-8 must render as *"we could not place this"* rather than as a located city, and
   that rendering is also the honest rendering of a possible merge. **Trigger to reopen:** the same as
   residues 1 and 3 — a cross-trip city identity, or a surface that lets a user split or merge city rows —
   plus one of its own: any `null`-country row whose `tripIds` span trips with **disjoint** country sets,
   which is the cheapest available signal that two different places have merged and is a *reporting*
   change rather than a grouping change.

**Part 6 — what replaces "grep for a persisted count", because the old rule was already false.**
**⚠ The two-half check at the end of this Part is superseded by A-33 (revision 25).** The block-quoted
**rule** below stands and is the whole point; the *mechanism* it proposed grepped declarations while the
danger is a value, and a persisted `countriesVisited` passed it. Read the rule here, then A-33.

ROADMAP exit criterion 6 says: *"Grep `packages/core`, `packages/client` and `apps/web` for a persisted
field whose name is a count of countries, cities, trips or days; expect **zero**."* Run it honestly and it
finds `cityCount` and `dayCount` on `TripSummaryRow`, which have been persisted since Phase 1. The criterion
has been passing because nobody ran it as written.

The principle was never *"no counts in storage"*. It is:

> **A count may be stored only if it is a property of exactly one document, minted inside the write that
> carries that document (clause 1) and stamped with `SUMMARY_VERSION` (clause 3). Everything else — every
> number that summarises more than one trip — is computed on read and has no storage representation at
> all.**

That is why `cityCount` is legitimate and `countriesVisited: 47` is not, and the distinction is mechanical:
the first can be recomputed from a document that exists and repaired by the rescan; the second summarises a
*set* of documents, has no document to be recomputed from, and drifts with nothing to notice. It is §0.6
applied one level up.

The check that replaces the grep, in two halves — **superseded by A-33; kept because A-33 names which of
these two sentences it replaces and which it keeps**:

1. **An allow-list, in a test, over `TripSummaryRow`'s own count-shaped fields** — today exactly
   `cityCount`, `dayCount`, `stopCount`, `poolCount`, `attribution.places.located`,
   `attribution.places.attributed`, `attribution.stops.located`, `attribution.stops.attributed`. A field
   added to the row without being added to the list fails, and **widening the list is an architect's
   ruling**, exactly as §2.10's surface list works. The test carries the block-quoted rule above in its own
   text, so the next reader knows what question the list is answering.
2. **The grep, re-aimed**: no persisted field naming a count of countries, cities, trips or days **anywhere
   outside `TripSummaryRow`** — no such field on `Trip`, on any document type, on `AppState`, or in any
   `ports/storage` record. Expect zero, and it currently is zero.

**Part 7 — what a builder implements. Two core files, two goldens, one CLI command. No engine, no port, no
index, no client change.**

1. **`packages/core/src/derive/summary.ts`** — `AttributionCensus`, `TripSummaryRow.attribution`, the two
   counters accumulated in the existing `add()` walk (**one traversal, not a second pass**), and
   `SUMMARY_VERSION = 4` with its docstring line. `tripSummary` gains no argument and stays pure.
2. **`packages/core/src/derive/travelStats.ts`** — Part 4, importing `normalizeCityName` from
   `../model/cityName.ts` (**by module path; it is deliberately off `index.ts` and stays off** — §2.14 A-14,
   and `qa/r14-horizon-copy.mjs:917` asserts it) and `lifecycle` from `./lifecycle.ts`.
3. **`packages/core/src/index.ts`** — `travelStats` and its types. §2.10's list is at 75.
4. **`tools/gen-golden.mjs`** — a new `travel-stats.json`, **derived by calling `travelStats`**, never
   hand-written. Its input is `[tripSummary(referenceTrip, COUNTRY_INDEX)]` at the fixture clock, and it
   carries the same *"NO COORDINATES"* discipline `countries.json` already has: codes, names, ids, counts.
   `countries.json` is unchanged and is not regenerated for this — but it becomes the **external check**
   below.
5. **`cli.ts stats`** — `travelStats([tripSummary(trip, COUNTRY_INDEX)], today)` as text, honouring
   `--today` and `--file`. One trip is a thin exercise of a multi-trip function; the tests are where the
   multi-trip cases live, and the CLI is what makes the numbers addressable without a browser.

**The check that is worth more than the golden.** `fixtures/golden/countries.json` already carries, for the
reference trip and computed by a *different* program (`gen-golden.mjs` walking the document directly),
`stops: {total, withCoordinates, attributed, unattributed}` and `places: {…}`. So:

> `travelStats` over the reference trip's single summary row must report `located.places`,
> `unattributed.places`, `located.stops` and `unattributed.stops` **equal to `countries.json`'s
> `places.withCoordinates`, `unattributedPlaces.length`, `stops.withCoordinates` and
> `unattributedStops.length`** — four numbers, two programs, one trip. This is the closest thing to an
> external oracle a derived statistic can have, and it is the assertion that would catch the row's census
> and the golden's census walking different records.

#### A-33 — exit criterion 6 checks a **value**, not a declaration: the row's whole key set, the port's own argument, and a census so a third port cannot appear unpoliced (revision 25, QA R28-2, MAJOR)

**Part 1 — what the shipped check actually asserts, measured.**

A-31 Part 6 withdrew the old grep as false and replaced it with two mechanical halves. Half (b), at
`test/stats-storage.test.ts:172`, is:

```ts
for (const m of src.matchAll(/([A-Za-z$_][\w$]*)\??\s*:\s*number\b/g)) { … }
```

That matches a **type declaration**. It does not and cannot match a **value being written**. Round 28 ran
eight faults, each alone, each in a throwaway worktree, and three are green:

| Fault | What it does | Result |
|---|---|---|
| **F8** | both `SUMMARIES.put(summary, id)` call sites in `apps/web/src/ports/storage.ts` become `put({ ...summary, countriesVisited: summary.countryCodes.length, daysTravelled: summary.dayCount }, id)` | criterion 6 **5 pass / 0 fail**; full suite **795 pass / 0 fail**; `tsc -p apps/web` **clean** (a spread widens the object type, so excess-property checking never fires) |
| **F6** | the same counts declared through a one-line `type Tally = number` alias | green — the regex wants the literal token `number` |
| **F4** | `daysAbroad: number` added to `TripSummaryRow` **and minted into every row** | green — the name classifier wants a counting suffix or a plural domain noun, and `daysAbroad` is neither |

F8 is the one that matters: those two numbers are in IndexedDB, on every write, forever, with nothing to
recompute them from — **the literal `countriesVisited: 47` A-31 Part 6 exists to forbid**, shipping past
the criterion written to forbid it. §0.5: *a rule that cannot catch its own bug does not ship*.

**KD-64 is not the problem and is not reopened.** The builder's two extra allow-list entries (`horizonDays`,
and `TravelStats`' own fields) are legitimate and round 28 assessed them so. F4 proves the allow-list's
*classifier* is name-based and therefore always one synonym behind — but the classifier is not what should
have been load-bearing. **The hole is the shape of the check**: it asks *what is declared* when the rule is
about *what is written*.

**Part 2 — half (a) replaced: the row's key set is total, and the classifier stops deciding.**

A-31 Part 6 half (a) filtered the row's numeric leaves through `countShaped()` and compared the survivors
to an eight-entry list. F4 walks past it by choosing a name. The fix is to stop filtering:

> **The set of leaf paths a minted `TripSummaryRow` carries is pinned in full.** Not the count-shaped
> subset — *every* key. Adding any field to the row, count-shaped or not, fails the run until the list is
> widened, and widening it is an architect's ruling, because a field on the row is a field in storage and
> `SUMMARY_VERSION` has to move with it (clause 3).

Three assertions, and the first two are the A-25 idiom (a compile-time key-set map beside a runtime key-set
assertion) applied one section over:

1. **Compile-time.** `const ROW_KEYS: Record<keyof TripSummaryRow, true> = { id: true, title: true,
   startDate: true, endDate: true, datePrecision: true, cityCount: true, dayCount: true, stopCount: true,
   poolCount: true, revision: true, countryCodes: true, cities: true, attribution: true,
   summaryVersion: true };` — a field added to the type without a line here is a **`tsc` error**, which is
   the earliest this can possibly fail. No `Partial`, no index signature.
2. **Runtime, top level.** `assert.deepEqual(Object.keys(mintedRow).sort(), Object.keys(ROW_KEYS).sort())`
   — a field minted but not typed, or typed but not minted, is red.
3. **Runtime, every leaf.** `ROW_PATHS`, the dotted leaf paths with array indices collapsed to `[]`,
   transcribed in full:

   ```
   attribution.places.attributed · attribution.places.located · attribution.stops.attributed ·
   attribution.stops.located · cities[].countryCode · cities[].countrySource · cities[].key ·
   cities[].name · cityCount · countryCodes[] · datePrecision · dayCount · endDate · id ·
   poolCount · revision · startDate · stopCount · summaryVersion · title
   ```

   The existing `numericPaths` generalises to `leafPaths` by removing the `typeof value === 'number'` gate
   (a leaf is anything that is not an array and not a plain object, `null` included). The assertion is over
   the **union of three rows**, because an empty collection contributes no path and one row cannot cover the
   set: the reference trip's row; a row from a trip with **one city whose `countryCode` is `null`**; and a
   row from a trip with **no city, no place and no stop**. Each individual row's paths must additionally be
   a **subset** of `ROW_PATHS`, which is what catches an injection into a row that is not the reference one.

**The count-shaped list survives as an assertion about the eight, not as a filter.** Keep
`countShaped()` and keep `ROW_COUNT_FIELDS`, and assert `ROW_PATHS.filter(countShaped) ===
ROW_COUNT_FIELDS` — so A-31 Part 6's block-quoted rule stays attached to a specific list of eight fields
and the test still says *why* `cityCount` is legitimate. What changes is that the classifier is no longer
the thing standing between a lifetime count and storage. It is now a **label** on a set that is pinned by
other means, which is the only job a name-based heuristic can do honestly.

**Part 3 — half (b) replaced: four gates and one out-of-band probe, and the first gate ends at a value in
a store rather than at text in a file.**

**6b-1 — the rows a real port actually holds.** Drive a port and read back, rather than reading source
text. `packages/client/src/ports/memory.ts` is a real `StoragePort` and runs in plain Node, which is the
whole reason §1.3 requires the client to be attackable there.

- Through the store's own write path: `createStore` over `memoryStorage`, `memoryFile`, `fixedClockPort`,
  `sequentialIdPort` and `immediateScheduler` — all five exported from `packages/client/src/index.ts`, so
  the test needs no deep import — then `createTrip`, flush, then `ports.storage.listTrips()`.
- Through the refresh path: knock a row's `summaryVersion` back, run the rescan, `listTrips()` again.
- Through the port directly: `saveIfVersion(id, null, doc, summary)` and `refreshSummary(id, version,
  summary)` with a summary minted by `tripSummary`.

`cairn/test/` may import `packages/client/src/index.ts` — criterion E's ceiling (1) exempts `cairn/test/`
and `cairn/qa/` by name, because tests do not create surface (§2.10). If it turns out cleaner to put 6b-1
in `packages/client/test/` instead, that is allowed on one condition: `ROW_KEYS` and `ROW_PATHS` are
defined **once** and imported by both files. Two copies of the pinned key set is two things to forget to
update, which is the failure mode this whole criterion is about.

For **every** row returned: `Object.keys(row).sort()` deep-equals `Object.keys(ROW_KEYS).sort()`, and
`leafPaths(row)` is a subset of `ROW_PATHS`. This is the check with actual teeth — it asserts what is in
the store, not what a file says.

**6b-2 — every port hands its summary store the value it was given, unmodified.** The one port 6b-1 cannot
reach is `apps/web/src/ports/storage.ts`: it is IndexedDB and does not run in Node, and building a fake
IndexedDB to make it run is a second implementation of a database in order to test a two-line property.
Assert the property directly instead — **the expression written to the summary store is the bare parameter
identifier and nothing else** — which is exactly what F8 violates:

| File | Regex over the source | Every capture must be | Sites |
|---|---|---|---|
| `apps/web/src/ports/storage.ts` | `/objectStore\(SUMMARIES\)\s*\.\s*put\(\s*([^,)]*?)\s*,/g` | `summary` | exactly **2** |
| `packages/client/src/ports/memory.ts` | `/summaries\.set\(\s*[^,)]*?\s*,\s*([^,)]*?)\s*\)/g` | `summary` | exactly **2** |

Plus, in each file, the total count of writes to that store — `/objectStore\(SUMMARIES\)\s*\.\s*put/g` and
`/summaries\.set\(/g` respectively — must equal the pinned site count, so a **third** write site fails even
if it happens to pass the identifier test, and so a renamed constant fails rather than silently matching
nothing. In each file the captured identifier must also be a parameter of the enclosing method: assert the
file contains `summary: TripSummaryRow` (web) / the `summary` parameter in both signatures (memory), which
is one more grep and closes "declare a local `const summary = {...spread}` above the put".

This is a static check and I am not pretending otherwise — it is a *value*-shaped one (it constrains the
argument expression, not a type annotation), it is the strongest thing available in Node for a browser-only
module, and it is backed at runtime by 6b-4 below.

**6b-3 — the port census, so a third implementation cannot appear unpoliced.** 6b-2 is a per-file recipe,
and a per-file recipe drifts the moment a fourth port exists. So pin the population: the set of files under
the source roots whose text contains `refreshSummary` must be **exactly**

```
apps/web/src/ports/storage.ts · packages/client/src/ports/memory.ts ·
packages/client/src/ports/types.ts · packages/client/src/store/store.ts
```

(the two implementations, the interface, and the one caller — measured, and the same four §4.3's chain
census already reasons about). A fifth file is red, with a message saying that a new `StoragePort`
implementation needs a 6b-2 recipe and that adding one is an architect's ruling.

**6b-4 — the real bytes, once, out of band.** The suite cannot run the IndexedDB port; `cairn/qa` can, and
has driven real Chromium against real IndexedDB since round 3. `qa/i6a-idb.mjs` already evaluates the
shipped port in a real page. It gains one assertion: after the differential script, read every record of
the `summaries` store back out of the database and assert `Object.keys(row)` equals `ROW_KEYS`. That is
the only place in this repo where *the actual persisted bytes of the actual shipped port* are checked, and
it is where F8 dies at runtime rather than by grep. It is a `qa/` probe, so it is not a gate — the gate is
6b-1 through 6b-3 — but it is named here so the next round runs it rather than re-deriving it.

**6b-5 — the import assertion is kept exactly as it is.** *"Nothing under `ports/`, `serialize/` or
`store` imports `travelStats`/`TravelStats`"* is the one existing check that already asserts a property of
the persistence layer rather than of a name, round 28 re-ran it as fault F7 and it goes red, and it is what
the `travelStats.ts` allow-list entries rest on. Unchanged, including its `persisters.length >= 5`
inconclusiveness guard.

**Part 4 — the source sweep survives as a secondary tripwire, with two widenings that cost nothing.**

The declaration grep is not deleted. It is the only check that can see a lifetime count **before** it is
written — F1 (`countriesVisited: number` on `Trip`) and F5 (an exported `lifetimeTotals` object literal in
the store) are both caught there and nowhere else — and a check that catches an intent one commit early is
worth keeping once it has stopped being the thing that was supposed to catch F8. It is demoted in the
file's own prose from *the* check to *a tripwire*, and it gets the two closures F6 and F5 named:

1. **Strip comments before scanning.** `src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')`.
   Required, not cosmetic: without it the numeric-literal sweep below hits
   `derive/travelStats.ts::countriesVisited` — the docstring quoting A-31's own rule — which would be a
   false positive on prose that must stay in the file.
2. **A local `number` alias counts as `number`.** Per file, collect
   `/^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*number\s*;/gm` and accept
   `name: <alias>` as well as `name: number`. Closes F6.
3. **A numeric literal counts too.** `/([A-Za-z$_][\w$]*)\s*:\s*(-?\d)/g` — a count-shaped property
   initialised to a number is a count whether or not anyone annotated it. Closes F5 and F8-shaped source
   even where it never reaches a port.

**Measured before ruling, so the builder knows what to expect: all three widenings together produce zero
new allow-list entries.** Over 77 files in the four roots, with comments stripped, the hit set is exactly
the 13 entries already in `SOURCE_ALLOW` — the six on `derive/summary.ts`, the five on
`derive/travelStats.ts`, and `horizonDays` in two files. There are **no** `type X = number` aliases in the
source trees today, and the only count-shaped numeric literals are `located:` and `attributed:` in
`derive/summary.ts`, which are already allow-listed under the same `<path>::<name>` key. So this widening
is free at the moment it lands, which is the only moment to land it.

**Part 5 — `ROOTS` gains `packages/tokens/src`.**

Round 28 noted the omission. It is worth closing and it is worth being honest about why: adding it produces
**zero** new hits today (the package is one file of design tokens). It goes in for *closure* — the roots
list is supposed to be "every source tree this repo ships", and a list that is nearly that invites the next
package to be forgotten — not because anything is hiding there. The four roots are then
`packages/core/src`, `packages/client/src`, `apps/web/src`, `packages/tokens/src`, and the test asserts
each resolves to a real directory so a renamed package fails loudly instead of silently scanning nothing.

**Part 6 — the injected-fault matrix, because §0.5 applies to this rule too.**

`qa/i7-exit6.sh` already builds eight faults and is the regression harness. **All eight must be red** after
this ruling, and the builder records the measured result. Two more are added, because A-33 introduces two
checks nothing currently attacks:

| | Fault | Must be caught by |
|---|---|---|
| F1 | `countriesVisited: number` on `Trip` | Part 4 tripwire |
| F2 | `daysTravelled: number` on a client port record | Part 4 tripwire |
| F3 | `citiesVisited: number` on the row, minted | Part 2 (all three assertions) |
| F4 | `daysAbroad: number` on the row, minted | **Part 2** — the fault the classifier could not see |
| F5 | an exported `lifetimeTotals` object literal in `store.ts` | Part 4 widening 3 |
| F6 | `countriesVisited: Tally` with `type Tally = number` | Part 4 widening 2 |
| F7 | a storage port imports `TravelStats` | 6b-5 |
| F8 | `put({ ...summary, countriesVisited, daysTravelled }, id)` in the web port | **6b-2** |
| **F9** | the same spread in `memory.ts`'s `summaries.set` | **6b-1** *and* 6b-2 — two independent checks, deliberately |
| **F10** | a third `SUMMARIES.put(summary, id)` site added to the web port | **6b-2**'s pinned site count |

A fault that is caught by exactly one check is fine; a fault caught by **none** is a hole and is a finding.
F9 existing at all is the answer to *"is 6b-2 redundant with 6b-1"* — no: 6b-1 can only see ports that run
in Node, and 6b-2 can only see source text, and F8 and F9 are each visible to exactly one of them until
they are both present.

**Part 7 — the residues.**

1. **6b-2 is static.** A port that computed its summary through a function call — `put(widen(summary), id)`
   — would fail 6b-2 (the capture is not the bare identifier `summary`), which is the correct outcome, but
   6b-2 cannot tell a *widening* helper from a harmless one and does not try: the rule is *the argument is
   the identifier*, full stop, and a port that needs to do something else has found a design question.
2. **The real IndexedDB port is asserted at runtime only in `qa/`** (6b-4), not in the gate. Closing that
   properly needs either a fake IndexedDB in the suite or the browser probe promoted into `npm run test:tap`,
   and both are larger than this criterion. **Trigger:** a second port-internal defect, or the first
   non-browser native port (Phase 5's `expo-sqlite`), at which point 6b-1's population is what grows.
3. **Part 4's tripwire is still name-based** and will always be one synonym behind. That is now acceptable
   *because it is not load-bearing*: everything that reaches storage is covered by Part 2 and 6b-1/6b-2,
   and the tripwire's job is to catch an intent before it reaches a port. **Trigger:** a fault that reaches
   storage and is caught only by the tripwire — that would mean Part 2 or 6b-1 has a hole.

#### A-34 — an un-clamped active-trip contribution is marked, never rendered as a visited fact (revision 25, QA R28-7)

**Part 1 — the defect.**

A-31 Part 5 residue 2 licenses an `active` trip contributing **all** of its countries and cities, unclamped
by which day the trip has actually reached, because refining that needs day-level attribution the row does
not carry. That licence was granted for the *statistic*. What shipped is the statistic rendered as fact:
on 2026-08-14, `cli.ts stats` prints

```
  GB  2026-08-07 → 2026-08-14  (1 trip)
```

for a trip that does not reach the UK until Aug 20 — a country the traveller has not been to, with dates,
in the same visual form as one they have. The root `CLAUDE.md` convention is *"never present my suggestions
as Jacob's own plan"*, and its natural extension — never present a plan as an accomplished fact — is what
`suggested` badges, dimmed cards and §2.14's provenance rules exist for everywhere else in this product.
This is the first place a *derived statistic* breaks it, and I-8 is about to put it on the Map and the
Profile, which is where it stops being a CLI line and becomes the product's headline claim.

**Part 2 — the ruling: the statistic carries the fact, not each surface.**

> **`TravelStatsCountry` and `TravelStatsCity` gain `provisional: boolean`, true exactly when no
> `completed` trip contributed the row.** A surface renders a `provisional` row visibly differently from a
> confirmed one, and never in a way that asserts the traveller has been there.

Accumulation is one line in the fold Part 4 steps 6 and 7 already run: start `provisional = true` when the
row is created, and set it to `false` the first time a contributing row's lifecycle is `'completed'`.
Equivalently, `provisional = tripIds.every(id => lifecycle(rowById(id), today) !== 'completed')`, but the
fold is what is built — no second pass and no second population rule.

**Why this predicate and not a narrower one.** The honest answer is that within an active trip the row
carries **no** evidence about which countries have been reached — that is residue 2's whole point — so
*"has this country been reached"* is unanswerable and any per-country cleverness would be invention. What
*is* answerable is *"is all the evidence for this row from a trip still under way"*, and that is exactly
the set of rows a reader could otherwise mistake for history. A country on both a completed trip and the
current one is **not** provisional, and correctly so: it was visited, and the active trip adds nothing to
that claim.

**Why on the type and not computed by the caller.** A caller can compute it — it has `tripIds` and can call
`lifecycle` — and that is precisely the problem: it would be a *second* expression of A-31 Part 3's
population rule, in every surface, diverging on the first edge case. Sequencing rule 1. It is also the
same argument A-31 used for `unattributed` being a field rather than an omission: the honest caveat is
part of the answer, not something the reader is expected to reconstruct.

**Cost.** One boolean on two row types. **No storage** — `TravelStats` is derived and never persisted
(A-33 6b-5 asserts exactly that), so **`SUMMARY_VERSION` does not move**, the row does not change, and
A-33 Part 2's key set is untouched. `provisional` is not count-shaped, so A-33 Part 4's tripwire does not
see it. `fixtures/golden/travel-stats.json` regenerates with the new field in both of its clock blocks,
which is a golden diff and not a behaviour change.

**Part 3 — the two surfaces.**

**The CLI, now**, because it is the surface that exists and the fix is four lines. A provisional row prints
a marker and the block prints a legend once, only when at least one row is provisional:

```
  GB  2026-08-07 → 2026-08-14  (1 trip)  ·  in progress
  ·  in progress — from a trip you are on; not yet confirmed reached
```

and the header count says so: `countries   7  (1 in progress)` when any row is provisional, and the bare
number otherwise. Same treatment on the city list. **Do not** hide provisional rows and do not exclude
them from the counts — that is the alternative residue 2 already refused (it tells a traveller standing in
Vienna that they have never been); the ruling is about *marking*, not about population.

**I-8's Map and Profile**, when they are built. `ROADMAP.md` I-8 carries the requirement so it is not lost
between now and then; the visual treatment is that increment's builder's, within the constraint that it is
**the same "not yet true" treatment this product already uses** — the dimmed/pending state of an unaccepted
copied stop (§2.14), not a novel one — and that a provisional country may not be filled on the map in the
same ink as a visited one.

**Part 4 — the injected fault.**

Set `provisional` to `false` unconditionally and the test that asserts a two-row library — one completed
trip to `AT`, one active trip to `AT` and `GB` — reports `GB` as confirmed; the CLI test's expected output
loses its marker line. Set it to `true` unconditionally and `AT`, which a completed trip visited, is marked
as in progress. Both directions are asserted, because a boolean with a test on one side only is a boolean
that will be inverted.

**Part 5 — the residue.**

`provisional` says *"the evidence is from a trip you are on"*. It does **not** say *"you have not been
here"* — on day 12 of a 14-day trip most provisional rows are true visits. It is a caveat, not a negation,
and the copy must not read as one; *"in progress"* is chosen over *"not visited"* for that reason.
**Trigger to reopen:** day-level attribution (§8.5's `Visit`), which is residue 1 and residue 2's trigger
too, and which would let the clamp be real instead of marked.

### 8.5 Observed travel — the shape Phase 5 must be able to land on

Not built now. Three decisions taken now, because each is a one-way door:

**1. Observation is a separate record class. It never mutates a `Stop`.**

```ts
type Visit = { id: VisitId; at: LatLng | null; placeId: PlaceId | null; stopId: StopId | null;
               arrived: IsoDateTimeLocal; departed: IsoDateTimeLocal | null;
               confidence: 'certain' | 'likely' | 'uncertain'; provenance: Provenance };
```

A `visited: boolean` on `Stop`, or a device writing an observed time over a planned one, destroys principle
2 permanently and irreversibly: once the plan has been overwritten there is no second copy to compare
against, so *"did I actually do what I planned"* — the question the completed-trip view exists to answer —
becomes unanswerable for every trip already travelled. This is the same rule as *"email-derived data is a
candidate, never a silent write"*, applied to the highest-volume source there will ever be.

**2. Acceptance is the transmission boundary, and this is what keeps §6.1 true when location arrives.** An
unaccepted observation is device-local: no server row, no upload, no analytics. Accepting one makes it
*trip content* — the user's own itinerary record, which syncs like the rest of the document. The user's
explicit act is the only thing that moves a location off the device, and it moves one coarse record rather
than a fix stream. §6.1's table gains its row in that phase, and the raw-fix row does not change.

**3. `Provenance.source` widens by exactly one value — `'device'` — and not before.** `fromJSON` rejects it
until then (that rejection is already asserted), and the widening carries a `schemaVersion` bump and a
`migrateDoc` case, so an older client cannot silently drop records it does not understand.

Country attribution then runs over visits with the same `countryOf`, and the profile can distinguish
*planned* countries from *observed* ones — which is principle 2 paying for itself on the surface the thesis
cares most about.

### 8.6 Photos — the shape, and the one thing it triggers

Not built now. §5.4 and §6.1 already hold the flow and the privacy rules; the thesis adds only the
association model, and it is deliberately narrow:

> A photo reference attaches to **exactly one trip** and **at most one** of a stop, a place or a day, plus
> optionally a subset of that trip's participants. It is `{source:'system', state:'candidate'}` until the
> user accepts it. Bytes stay in the library; only an accepted, explicitly attached photo is uploaded, with
> EXIF GPS stripped by default.

Not a general tagging graph, not many-to-many, not a feed item. **And it fires a trigger already written
down:** §2.13 A-6a's closing paragraph says that the moment `Place` gains a second referent kind — a saved
places library, place notes, or photos — `removeStop`'s single-row prune must become a reference-counted
delete with a user-visible affordance. Photos are that second referent. The phase that ships them re-reads
that paragraph; it is not a discovery.

**One cross-reference, added at revision 26: a photo is also a conversation *subject*.** §8.8's reserved
`Comment.subject` includes `{kind:'photo'}`, and that is what the thesis's *"moment"* is in this model — the
association record above, not a new entity and not a post. **It changes nothing in this section's shape**:
the association stays one trip and at most one of a stop, a place or a day, the bytes stay in the library,
and a conversation hanging off a photo is a server-side record that never enters the trip document.

### 8.7 The social graph — five edges, and the pairs that must never be collapsed

Phase 3's tables, stated now because `core/access` already models three of them and the conformance matrix
is generated from the types:

| Edge | Answers | Grants |
|---|---|---|
| `TripParticipant` | who travelled | **nothing** |
| `TripMember` | who co-owns | full rights on that trip |
| `TripShare` | who was given this trip (a user, or a link token) | `viewer` / `commenter` / `editor`, with `expiresAt` / `revokedAt` |
| `Connection` | who follows or is friends with whom | **nothing by itself** — §6.2's predicates already treat `friendIds` as granting nothing |
| `LocationShare` | who may see a trace, at what precision, until when | one audience, one day, revocable |

**The collapses to refuse, each of which is the obvious shortcut:** participant ⇒ member (*"they were on
the trip, let them edit"*), friend ⇒ viewer (*"friends can see my trips"*), member ⇒ location (*"we are
travelling together, share my position"*). Every one of them is a privacy decision disguised as a
convenience, and every one is a data migration to undo. The conformance matrix (§6.2) gains **participant
with no share** as a principal, and its expected verdict on every operation is `deny` — a cell that is
asserted before there is any code that could make it true.

**What a share actually grants, because *"read-only share page"* understates it and would be built as the
wrong thing** (Jacob's clarification, 2026-08-29; revision 26). A shared trip is somewhere the recipient
**explores**: *their trip → discover → select → **add to my trip** → adapt to my itinerary.* Every step of
that already exists — the browse-another-trip pane (Phase 1), `copyStopInto` (§2.14, shipped),
`acceptCandidate`, and then ordinary editing of a record that is now the recipient's own. Three things
follow, stated here so nobody invents a fourth:

1. **Copying out is inherent in the `viewer` grant. Not a fourth role, and not a per-share `allowCopy`
   flag.** A principal who may read a stop may copy it, because the copy writes into *their* document and
   carries `origin`; §2.14 rule 7's credit line is what protects the source, not a permission bit. A flag
   would be a new persisted field on every share row, a new cell in the conformance matrix, and a switch
   whose *off* position is unenforceable the moment the recipient can read the text at all — which is the
   definition of a control that lies. If Jacob ever wants "look but do not take", it is a product
   conversation about what sharing means, not a column.
2. **What crosses is one travel object at a time, and it crosses as a candidate.** Today that object is a
   `Stop`, with its `Place` under §2.14 rule 4. A whole trip, or a whole day, is a **loop over that
   primitive** — `TripFork` stays cut — and the recipient's document never gains an unbadged record they did
   not accept. **Adding a second copy unit is an architect's ruling**, on A-23's precedent, not a builder's
   convenience.
3. **`copyStopInto` and `acceptCandidate` are not redesigned by any of this.** The only widening is the
   *source*: a trip the user reached through a `TripShare` rather than one they own. That is a change to
   what the pane lists, not to the copy contract — A-14, A-15, A-16 and A-18 already assume the source is
   another person's document, and already re-file the `cityKey`, redact the free text and re-stamp the
   provenance on exactly that assumption.

**This is the loop's closing edge, and it is why the mechanism shipped in Phase 1.** *Discover → Plan →
Travel → Document → Share → build travel history → discover through the network → **plan again*** — the last
arrow is a copy into the user's own trip. Phase 7's discovery surfaces (*"friends who have been here"*) are
the *discover* step of that same edge and hand off to this one; they are a query, not a second mechanism.

**Following is not friendship and Cairn has no public surface** until a trip is explicitly published.
Publication is a `TripShare` to a link principal, which already exists; there is no `is_public` column, and
adding one is what would create the moderation obligation §6.5 defers.

### 8.8 What §8 refuses to architect, and the two it refuses outright

- **Live presence — *"people currently or approximately in the same destination"*. Refused outright, and
  this is the one place I push back on the thesis.** It cannot be built without the server holding where
  someone *is now*, which inverts §6.1's central claim — *"a full dump of the production database contains
  zero raw traces"* — the single property that makes every other location feature in this product
  defensible. **Nothing may add a `last_seen_at`, a `current_city` or a coordinate column "for later".** If
  it is ever built it is a separate, opt-in, per-trip *ephemeral presence*: a coarse geohash with a short
  TTL, written by the device, readable only by that trip's members, never joined to a trace and never
  retained. That design is written here so that the version which shows up under schedule pressure — a
  `users.current_location` column — is recognisable as the thing this paragraph refused.
- **Travel miles and flight miles. Deferred, both — *superseded at revision 10 by §8.10*, which is a
  refinement and not a reversal.** The refusal this bullet actually made stands verbatim and is now §8.10's
  first rule: **a mile count derived from a *plan* is a fabricated statistic**, and no planned distance ever
  counts toward a lifetime total. What has changed is that Jacob has given the capability a shape — distance
  by mode, with air separable from ground — so the deferral is now per mode and per *provenance* rather than
  wholesale, and the model decisions that keep the four kinds of number apart are taken in §8.10 rather than
  left for the phase that first needs them. **Airline loyalty miles (SkyMiles, AAdvantage, MileagePlus) are
  a different thing again and are out of scope in §8.10** — unscheduled, not refused.
- **Goals and achievements. Architected here in one line, implemented late:** a `Goal` is a declarative
  target (`{kind:'countries'|'cities'|'trips', target: number, window?: {from,to}}`) evaluated against
  `travelStats`. **No stored counters, no points, no badge table.** The reason is not tidiness: a
  gamification that rewards *entering* data corrupts the travel history's honesty, and this product's whole
  claim is that the history is real.
- **Conversations on travel objects. Architected here, implemented in the phase that has accounts — and what
  it refuses is a `Post`.** (Jacob's clarification, 2026-08-29; revision 26.) A user must eventually be able
  to talk about a **trip, a day, a stop, a place, or a photo/moment** — the objects that already exist.
  There is no generic social post, no wall, no timeline object, and **nothing whose reason to exist is to be
  commented on**. That is principle 9, and it is a model decision rather than a UI one because a `Post`
  table is the shape a travel product cannot be recovered from: once the unit of conversation is a post, the
  trip becomes an attachment to it. The stored shape is sketched on §8.5's precedent, because one clause of
  it is the one-way door:

  ```ts
  type Comment = {
    id: CommentId;
    tripId: TripId;                                    // resolves to exactly one trip, always
    subject: { kind: 'trip' }
           | { kind: 'day';   date: IsoDate }
           | { kind: 'stop';  stopId: StopId }
           | { kind: 'place'; placeId: PlaceId }
           | { kind: 'photo'; photoId: PhotoId };      // §8.6's association — not a new entity
    authorUserId: UserId;
    body: string;
    createdAt: IsoDateTimeLocal;
    editedAt: IsoDateTimeLocal | null;
    deletedAt: IsoDateTimeLocal | null;
  };
  ```

  Four decisions come with it, and they are the whole of what is being reserved:

  1. **A comment is server-side and is never part of the trip document. There is no `Trip.comments`, in any
     phase.** This is the mirror image of §8.3's ruling on participants, and it inverts for the reason §8.3
     gives: a participant is *the owner's* statement about their own trip, so embedding buys round-trip
     parity, undo and deletion for free; a comment is *another person's content* on the owner's trip, so
     embedding would put a friend's words inside the owner's `toJSON`, their export, their undo stack and a
     snapshot restore that would silently delete or resurrect them. Ownership would be untraceable at
     exactly the point §6.2 requires it most.
  2. **Readability is the subject's readability, and there is no sixth edge.** A comment is visible to
     precisely the principals who may read the trip it hangs off (§6.2's predicates, unchanged), and writing
     one is the `commenter` role `TripShare` already carries. In the phase that builds it the conformance
     matrix gains `comment` as an **operation**, not a new relationship: a `viewer` is denied it, a
     participant with no share is denied everything, and §8.7's five edges stay five.
  3. **No reactions, no likes, no counts.** §0.7 and §8.4 already forbid this product from storing a count of
     anything; a comment count is derived or it does not exist. A like is a follower economy with one field,
     and it is refused for the same reason the feed's is below.
  4. **Messaging that is not attached to a travel object stays deferred.** §7's *chat* non-goal is **not**
     lifted. Direct messages have no travel object, so they have a different privacy story and a different
     retention story, and if they are ever built they are a separate record — **not a generalisation of this
     one**. Deletion follows §6.3 when the phase arrives: deleting a trip deletes its comments; deleting an
     account tombstones authorship the way §6.3 already tombstones `attribution`.

  **Nothing here is Phase 2 scope and nothing here is built now.** The earliest phase that could build it is
  Phase 3, because a comment needs an author with an account; `ROADMAP.md` does not schedule it and this
  bullet does not ask it to.
- **A travel-native feed. The derived surface is reserved; the engagement feed is refused — and *"no feed"*
  was doing both jobs.** (Jacob's clarification, 2026-08-29; revision 26. It resolves a real tension:
  `ROADMAP.md` Phase 7 said *"no feed"* flatly, which refused more than this product means to refuse.)
  **Refused, permanently:** a ranked, algorithmic, engagement-driven feed — a ranking model, a
  follower/like economy, generic post items, and unread badges or counters that exist to bring someone back
  rather than to tell them something. **Reserved:** a *derived* surface over the travel graph, computed from
  exactly the queries Phase 7 already ships (§8.4's country and city attribution joined to `Connection` and
  `TripShare`), which may surface friends' and trusted people's trips, trip starts and completions, places
  added or visited, photos and moments, travel memories, planning activity, destination discovery, questions
  and conversations, and *"people you know have been here"*. It is allowed to be the reason someone opens
  the app; it is not allowed to be the reason they cannot put it down. Three model consequences, which are
  why this is here and not only in the roadmap:

  1. **The feed has no store of its own, and there is no activity-event table.** Every item it could show is
     already dated by state that exists: `Trip.startDate`/`endDate` through `lifecycle` (§8.1),
     `Provenance.addedAt`/`acceptedAt` (§2.8), `Visit.arrived` (§8.5), a photo's timestamp (§8.6), a
     comment's `createdAt` (above). A denormalised activity log is the cheap wrong version — a second copy
     of facts the documents already state, going stale with nothing to invalidate it — and §0.6 is the whole
     of the argument. If throughput ever demands a materialised cursor, it is a **cache, rebuildable by
     re-deriving**, never the source of truth: the same rule, and the same failure mode, as
     `TripSummaryRow` (§8.4).
  2. **A feed is not a second read path.** Every item is subject to the authorization of the object it
     derives from, evaluated by the same predicates (§6.2). A feed assembled by a job that "already knows"
     what it may show is how the one publicly visible permission bug in this product gets written — the
     surface reads through the same policies as every other read, or it does not ship.
  3. **It stays travel-native by a test rather than by intention: a surface that would still make sense with
     the travel data removed is the thing this bullet refuses.** The social unit stays the trip, the stop,
     the place or the moment (principle 9), and nothing may appear in it that is not one of the objects
     §8.8's comment reservation already enumerates.

  **Not Phase 2, and not built now.** It is a Phase 7 *candidate*, sequenced behind the data it derives from
  by `ROADMAP.md` sequencing rule 8 — the conversation category needs comments, the photo category needs
  Phase 6, the visited category needs Phase 5b — and Phase 7 now carries this distinction instead of the
  flat refusal it used to.
- **Automatic trip detection.** Nothing here forecloses it — a detected trip is a candidate `Trip` with
  `{source:'device', state:'candidate'}`, which is the shape that already exists — and nothing here builds
  it. It is worth the thesis's own warning: build it when the manual path is good enough that the automatic
  one has something to be checked against.
- **CRDTs, still.** §7's deferral stands, and its **trigger is now named**: the first `editor` role on a
  shared trip makes two people editing one document real. Last-writer-wins per stop behind the §2.2a fence
  is the answer for as long as the complaint is hypothetical.
- **Opening hours, currency conversion, sub-maps, booking/payments, chat, recommendation ML** — §7,
  unchanged.

### 8.9 The export surface, and what §8 costs it

§2.10 is set equality against one list, and *"widening the surface is a documentation change first"*. This
section is that change: it names, under **P2**, `lifecycle`, `countryOf`, `travelStats`, `SUMMARY_VERSION`,
the generated country index value `COUNTRY_INDEX` (revision 10 — `tripSummary` and the map surfaces are
outside `packages/core` and every one of them has to be handed one), and the participant build functions
`addParticipant` / `updateParticipant` / `removeParticipant`. `setTripMeta`'s patch allowlist gains
`datePrecision`; `tripSummary`'s return type widens and it **takes the index as a second parameter**
(revision 10, §8.4) — neither adds a symbol. **The new total is derived by counting, in the pass that adds the callers, and pinned in §2.10
and in ROADMAP criterion E in the same commit.** Quoting a number here that nobody has counted is the
defect §2.10 exists to prevent.

**§8.10 adds nothing to the surface now**, because it implements nothing now. The symbols it will name when
its first mode ships — `airportOf`, `journeyDistance`, and whatever `travelStats`' widening needs — are
listed in §8.10 and counted in the pass that adds their callers, under the same rule.

**Revision 26 adds nothing to the surface either, and that is the check on it.** §8.7's
discover/select/adapt reading of a share is `copyStopInto`, `acceptCandidate` and `attribution` — three
symbols that are already exported and none of which changes — and §8.8's conversation and feed reservations
implement nothing, name no symbol and add no persisted structure to any shipping phase. A revision that
claims to *reserve* a capability and moves the export surface has built something instead.

---

### 8.10 Physical travel distance — four bases, one per-mode schedule, and what may never be added together

**Input: Jacob's clarification of 2026-08-27**, given after the product thesis and recorded here because it
is a model decision, not a feature request. He asked for meaningful physical travel distance by mode — air,
train, car/road, walking/hiking, cycling, boat/ferry, and other modes where trustworthy data exists — and,
in the same breath, for three things to stay visibly apart: **physical distance** (actual travel, which may
count toward lifetime statistics and achievements), **planned distance** (itinerary estimates, which may
not), and **airline loyalty rewards** (SkyMiles and friends, which are not distance at all).

**This is not Phase 2 scope and none of it is built in Phase 2.** Phase 2 is §8.1–§8.4. This section exists
so that the phases that *can* produce an honest distance do not each invent their own answer, and so that
the cheap wrong version — one `totalKm` field, filled from whatever was nearest to hand — is recognisable
as the thing this section refused.

#### 1. The rule the whole section is for: a distance is only as good as the reader's ability to tell where it came from

A mode-by-mode figure is meaningless unless the reader can distinguish a great-circle distance between two
airports named on a confirmation from a GPS track sum from a number an operator's own document stated from
a guess the itinerary implied. **These are four different claims and they are never interchangeable.**

```ts
type DistanceBasis = 'verified' | 'observed' | 'derived' | 'planned';
type DistanceMethod = 'great_circle' | 'track_sum' | 'stated';
```

| Basis | Means | Example | Counts toward lifetime totals |
|---|---|---|---|
| `verified` | both endpoints came from a document we hold, or from the user confirming them against one, **and the journey is in the past** | airport-to-airport great circle for a completed, coded flight | **yes** |
| `observed` | measured from the device's own fixes, on the device | a walked, cycled or driven track summed by `segmentTrace` | **yes, on acceptance** (§8.5's boundary, unchanged) |
| `derived` | computed from a trustworthy stated figure that is not a measurement — Jacob's *"reliably derived"* | a rail operator's ticket that states 412 km | **yes, labelled as derived** |
| `planned` | implied by the itinerary and nothing else | `computeLegs`' `km` for a flight that has not happened; a haversine between two typed coordinates | **never** |

**Three consequences, each of which is the thing a later phase will be tempted to break:**

1. **No total is ever rendered across two bases.** *"48,120 km flown"* is only a sentence if every kilometre
   in it has the same basis; a screen may show *verified*, *observed* and *derived* subtotals side by side,
   and `planned` belongs in a different block or on a different screen entirely. A UI that adds `verified`
   to `planned` has committed §8.4's error — a statistic a user can inflate by typing — with an extra step.
2. **`null` stays a first-class answer**, exactly as it is for `countryOf` (§8.4). A journey whose endpoints
   do not resolve has **no distance**, and the surface says *"n journeys not measured"*. It is never
   back-filled from the plan, and it is never snapped to the nearest thing that would produce a number.
3. **Nothing counts anything into storage.** §8.4's rule is unchanged and binds here hardest, because a
   running mileage total is the single most tempting counter in the product. Every figure is derived, on
   read, from the records it claims to summarise.

#### 2. `Journey` — the movement counterpart of `Visit`, and it obeys §8.5's three rules

§8.5 gave observation one record class for *being somewhere*. Distance needs its counterpart for *going
between two somewheres*, and it is the same shape for the same reasons:

```ts
type Endpoint =
  | { kind: 'airport'; code: string }          // IATA/ICAO, resolved through the bundled index
  | { kind: 'place';   placeId: PlaceId }
  | { kind: 'coord';   at: LatLng }
  | { kind: 'name';    name: string };         // unresolvable by construction — distance is null

type Journey = {
  id: JourneyId;
  mode: TravelMode;                            // the existing enum — §2.2, no new values
  from: Endpoint; to: Endpoint;
  date: IsoDate;                               // the day it happened
  distance: { km: number; basis: DistanceBasis; method: DistanceMethod } | null;
  bookingId: BookingId | null;                 // what it was derived from, if anything
  stopId: StopId | null;
  provenance: Provenance;                      // the existing one — WHO produced the record
};
```

**Two provenances, deliberately, and they are not the same question.** `Journey.provenance` is §2.8's — who
produced this record and whether the user has taken it on. `distance.basis` is what the *number* is. A
`{source:'user'}` record can carry a `verified` distance (the user confirmed the airport codes against the
confirmation) and a `{source:'device'}` record can carry a `planned` one (it never should, and the type
permits saying so rather than lying). Collapsing them into one field is how *"asserted"* becomes
*"verified"* in a later refactor.

**The three §8.5 rules apply unchanged:** a `Journey` is a separate record class and **never mutates a
`Stop`** or a `Booking`; an unaccepted, device-produced `Journey` is device-local and **acceptance is the
transmission boundary**; and `source:'device'` is the one widening, carried by §8.5's `schemaVersion` bump,
not a second one.

**Stored or derived — the ruling, because §0.6 will be pointed at it.** A `Journey` is stored **only when
its inputs are not in the document**. Observed journeys are stored on acceptance, because the fix stream
they came from is device-local and never syncs, so there is nothing left to recompute from — which is
exactly `Visit`'s situation and gets `Visit`'s answer. **Air distance for a booked flight is not stored at
all**: it is recomputed on read from `(route.fromCode, route.toCode, airportIndex)`, so it cannot drift
from the booking and improves for free when the index does. A stored `distanceKm` on a `Booking` is the
`countriesVisited: 47` mistake in a different costume.

#### 3. The airport index — the same mechanism family as the country index, a separate dataset

```ts
airportOf(code: string, index: AirportIndex): LatLng | null    // pure; index injected
journeyDistance(j: Journey, ctx: { airports: AirportIndex; today: IsoDate }): Journey['distance']
```

Same **mechanism** as §8.4 and for the same three reasons — a bundled, generated, committed module; the
index injected so the function stays pure and testable against a four-airport fixture; a size budget pinned
by a test and measured by the generator, never quoted from a document; `null` first-class. **§8.4's finding
that there is no cheap hosted answer that is also a private one applies here unchanged, and it extends to
routing:** sending an origin and a destination to a routing service transmits a location just as surely as
sending one coordinate to a geocoder does. That is why `DistanceMethod` has no `'route'` value — a hosted
route API is not an available mechanism under §6.1, and if one ever becomes viable on-device it is a new
method value *and* a new privacy ruling, not a quiet addition.

**A separate dataset and a separate generator** (`tools/gen-airports.mjs`), not a widening of
`gen-countries.mjs`: countries are polygons tested by ray-casting, airports are points keyed by code, and
one generator emitting both would couple two size budgets that move for unrelated reasons.

**Source, with its licence checked rather than assumed** *(verified 2026-08-27)*: **OurAirports**, whose
distribution repository states the **Unlicense** and whose project data page is described as Open Data
Commons PDDL 1.0 — public domain either way, no attribution required, commercial use permitted. Filtered to
airports carrying an IATA code with scheduled service, which is a few thousand rows of `code → lat,lng`
rather than the full ~80,000. ⚠ **The project's own data page was blocked by this session's egress proxy,
so the licence line must be re-confirmed from the source before the generator ships** — the fallback, if it
cannot be, is Natural Earth's `ne_10m_airports` layer (already public domain, already the family §8.4
uses), at the cost of coverage that the correctness floor would then have to measure. Sources:
[ourairports-data](https://github.com/davidmegginson/ourairports-data) ·
[OurAirports open data](https://ourairports.com/data/).

#### 4. What *"verified/completed flight"* means against the model as it actually is

Three findings from the shipped code, because this is where a plausible-sounding spec would go wrong:

1. **There is no airport identity in the model today.** `Booking.route` is `{fromName, toName}` and both are
   free text: the reference trip's first booking reads `"Los Angeles (LAX)"`. That is a display string.
2. **`confidence:'confirmed'` is not sufficient.** All 21 bookings in the reference fixture are
   `{source:'user', state:'accepted', confidence:'confirmed'}` — transcribed by hand from `docs/BOOKINGS.md`
   — and two of them carry `unverified_reference` conflicts. Confidence describes *the booking*; it says
   nothing about whether an endpoint pair is trustworthy.
3. **Nothing in the model says a journey happened.** `lifecycle()` (§8.1) is the only thing that can, and
   only at day granularity — which is enough.

So, stated once:

> A flight's distance is **`verified`** iff all three hold: **(a)** the booking carries structured endpoint
> codes that came from the booking document itself or that the user confirmed against it; **(b)** both codes
> resolve in the bundled index; **(c)** the journey's date is strictly before `today`. Fail (a) or (b) and
> there is **no distance** — `null`, rendered as unmeasured. Fail only (c) and the identical number exists
> with basis `planned`, is labelled, and does not count.

**Named anti-pattern: regex-scraping `(LAX)` out of `fromName` does not produce a verified endpoint.** It
may produce a **suggestion the user confirms** — `{source:'system', state:'candidate'}`, the same
candidate-then-accept path as every other automatic source in this product — and that is the shape the phase
that builds it must take. A scraped code that silently becomes a lifetime statistic is precisely the
fabricated number this section exists to prevent.

**The additive field, named now, added in the phase that can populate it honestly:**

```ts
Booking.route?: { fromName: string; toName: string; fromCode?: string; toCode?: string };  // IATA/ICAO
```

Optional, display-neutral, **read by no rule, no derive and no validation**, exactly as `datePrecision` is
(§8.1). It lands in **Phase 4** with the parser that fills it from a real confirmation, plus a user-confirm
control for bookings already entered by hand. **It is not added in Phase 2**, because a field nothing can
fill honestly is a field that gets filled dishonestly.

#### 5. Per-mode schedule — which phase can make each mode honest

| Mode | Where an honest number comes from | Bases reachable | Phase |
|---|---|---|---|
| **Air** | great circle between two indexed airports | `verified` when past + coded + resolved; else `planned` | endpoints in **4**; index, `journeyDistance` and the surfaces in **7** |
| **Train** | observed track; or a distance the operator's document states | `observed`, `derived` | **5b** (observed); `derived` whenever a parser can read a stated figure — **4** at the earliest |
| **Car / road** | observed track | `observed` | **5b** |
| **Walking / hiking** | observed track | `observed` | **5b** |
| **Cycling** | observed track | `observed` | **5b** |
| **Boat / ferry** | observed track; or a stated operator figure | `observed`, `derived` | **5b** |
| anything else | — | — | a mode gets a model when it has a trustworthy source, not before |

**Air is the only mode that can be honest without a device**, which is the whole reason it is separable —
and it still cannot be honest before Phase 4, because nothing before Phase 4 produces a structured endpoint
pair. **Every ground mode waits for §8.5's observed data.** Sequencing rule 8 already says this in general
form; this table is it applied per mode.

Two constraints inherited rather than invented: distance arithmetic is `derive/geo.ts`'s haversine and
**there is exactly one implementation of coordinate distance in `packages/core`** (§2.13's grep criterion —
a `journeyDistance` that hand-rolls its own great circle fails it); and any surface that renders a journey
inherits §5.3's gap rule — a track with a hole is summed as the sum of its measured segments and the hole is
**reported**, never bridged.

#### 6. What `travelStats` gains, in the phase that ships the first mode

```ts
TravelStats.distance?: {
  byMode: Array<{ mode: TravelMode; km: number; basis: DistanceBasis; journeys: number }>;
  unmeasured: { journeys: number };      // the honest hole, on screen — §8.4's `unattributed`, again
};
```

One row per `(mode, basis)` pair and **no `totalKm` field anywhere**, so a caller that wants a total has to
choose a basis to state — which is the point. Units are stored in kilometres and converted for display; a
goal expressed as *"fly 25,000 miles"* stores its target with its unit, and §8.8's ruling stands unchanged:
a goal is a declarative target evaluated against derived statistics, filtered to physical bases, never a
counter that is incremented.

#### 7. Airline and loyalty rewards — out of scope, and not the same kind of out-of-scope as live presence

**SkyMiles, AAdvantage, MileagePlus and every programme like them are outside the near-to-mid-term
architecture.** Three reasons, in order:

1. **They are not a distance.** Award and status miles are derived from fare, cabin, status tier and
   promotions; the same physical flight earns different numbers in different programmes and different
   numbers for two passengers in adjacent seats. Putting them in the same field as a great-circle distance
   would be the exact conflation Jacob asked to prevent — **and it is forbidden in advance: no loyalty
   figure may ever be written into a `Journey`, into `TravelStats.distance`, or into any total that also
   contains physical travel.**
2. **They are a third-party integration surface**, not a travel-history concept: per-airline account
   linking, OAuth or scraping, credentials to hold, and a partner relationship to negotiate. That is the
   mailbox problem's family (§6.4), and it is the family this project has already measured as expensive.
3. **No phase plans for it**, and sequencing rule 8 says a capability with no data behind it does not get a
   phase.

**This is a deferral, not a refusal.** §8.8 refuses live presence *on principle*, because building it would
invert the product's central privacy claim; nothing of that kind is true here. If Jacob wants loyalty
balances later they are a separate capability with their own record class, their own credential handling and
their own phase — sitting **beside** physical distance on a profile, never summed into it.
