# Cairn — build notes, Phase 1

> **Status: CURRENT, gate-review SEND-BACK pass** (`master`, after `5bdd0dc`). This pass
> implements the manager's `REVIEW.md` routing **B-1 … B-7** and the architect's revision-5
> rulings **A-1, A-2, A-4**, and nothing else. Every one of the thirteen items has a `KD-`
> entry in §1 — **KD-23 … KD-33** are new and each names the item it answers.
>
> **§3 and §4 are regenerated.** §3's `apps/web` and `packages/client` rows claimed the credit
> line and `syncResolutions` while §6 caveated them away; both are now true of the product as
> well as of the code, and both rows say what changed. §4's *"231 pass"* table — stale since
> before round 2 — is **replaced**, not annotated: `npm run test:tap` is **387 pass / 0 fail**
> (was **333 / 0** at the reviewed `8a65a53`), `npm run typecheck` clean on both projects.
>
> **§5, §6, §7 and §8 are as of the earlier passes and are unrevised except where a bullet is
> struck in place.** §6's PoolPanel caveat is closed by KD-26 and marked so.
>
> **Two QA probes now report a stale assertion rather than a defect, and §4's probe table says
> which and why:** `qa/r6-flush.mjs` samples `status` 200 ms after the abort, by which time
> §4.2 rule 6a″ says the banner has correctly cleared; `qa/r7-chain.mjs` §static and §11 carry
> hardcoded counts of a structure that changed. Neither script was edited — probe repair is a
> commit of its own and it belongs to the breaker.
>
> **`qa/r5-freshness.mjs` §5.7 stays rotten and is still deliberately unpatched.** It has
> called the removed `core.accept` since round 5; §2.10 revision 5 also removes
> `friendImport` and `needsBadge`, which the same dead block references. Nothing observable
> changes — it already crashed one line earlier. KD-33.
>
> **Out of scope and NOT fixed, so nobody has to re-derive it:** everything on the review's
> *"What rides"* list (R5-3, R5-4, R3-6…R3-9, R2-13…R2-21, the five `r6-actor` residuals), and
> `acceptCandidate` is still reachable from no control in `apps/web` — an imported stop stays
> badged forever. That fails safe; §3's row now says so out loud instead of leaving it to be
> found.

> **Status, R3-3 pass (`master`, after round 6):** one finding only — **R3-3** is fixed and its
> row is appended to §5. `npm test` **333 pass / 0 fail** (was **331 / 0** at `584c218`; the two
> new tests are `packages/client/test/merge-race.test.ts`), `npm run typecheck` clean on both
> projects. `qa/r3-merge.mjs` now reports **4 ok / 0 FAIL** (round 6 recorded 2 FAIL) and
> `qa/r3-cas.mjs` probe **A** reports 3 ok (round 6 recorded it as FAILing in agreement with
> R3-3). **Neither script was edited** — both were already written to assert the fixed state,
> so they flip from FAIL to ok on their own. **R6-1, R6-2 and everything else open in round 6's
> status note were explicitly out of scope and are NOT fixed;** I did not re-run those probes.
> Everything below this line is as of the round-5 pass and is unrevised.

> **Status:** §1 (Known divergences) is current through **KD-21**, which includes the round-2
> fix for R2-3 (`b5c742b`). **§4 (Verified) predates round 2 QA** — it records the state after
> round 1's re-delivery ("231 pass") and was not regenerated. Don't read §4's numbers as
> current without re-running the commands in them.
>
> **§5 (Defects fixed) is current as of the round-5 fix pass** — **R5-1, R5-2 and R5-5** are
> added at the end of the table. Round 4's rows (R4-1, R4-2, the two other F2 violations, the
> R2-11 ruling, and the corrected R3-4 row) stand unchanged. Test count at this pass:
> **`npm test` 331 pass / 0 fail** (was 318 at `d97feed`), typecheck clean on both projects.
> §6's third bullet ("this is **not** a compare-and-swap at the storage layer") has been stale
> since `a746d75` and is struck in place.
>
> **R5-3 and R5-4 were explicitly out of scope for this pass and are NOT fixed.** So is
> everything else still open in `QA-FINDINGS.md`'s round-5 status note.
>
> **One probe is now rotten because of the R5-5 fix, deliberately not patched:**
> `qa/r5-freshness.mjs:602` calls `core.accept(...)` unguarded and now crashes with
> *"core.accept is not a function"*, which is the finding's own remedy taking effect. Its §5.5
> check (*"core.accept(p, at, null) refuses a missing actor"*) reports `ok`. Editing the
> tester's script is not a product change and is not smuggled into a fix commit — the same
> ruling the round-5 note applies to `qa/r2-copy2.mjs` and `qa/r2-import.mjs`.

For the breaker and the manager. What is built, how to run it, what is stubbed, what I
could not verify, and — first, because it is the thing that went wrong last round —
**every known divergence from the contract**.

> **Read §1 first.** A source comment is not a disclosure. Every "see BUILD-NOTES",
> "objection", "artifact" or "the roadmap says X but" in `packages/*/src`, `packages/*/test`,
> `apps/web/src`, `cli.ts` and `tools/` cites a `KD-n` entry in §1 by number, and
> `npm test` fails if a citation has no entry or an entry has no home. That check is
> `cairn/test/disclosure.test.ts`.

---

## 1. Known divergences from the contract

Every entry is a place where the shipped code does **not** do what `ARCHITECTURE.md` or
`ROADMAP.md` says, or does it in a way whose consequences are not obvious from the spec.
Each says what it is, why, what it costs, and who has to decide.

### KD-1 — `impossible_transfer` now reads `travelRole`, and the Aug 18 case was never real

`packages/core/src/conflict/rules/impossibleTransfer.ts`

Revision 1's objection is **resolved** by §2.12 and this entry now records the outcome, not
the complaint. `Stop.travelRole` says what a stop's `time` and `arrival` mean: `'transfer'`
→ blocker, `'unknown'` → the same arithmetic as a warning, `'journey'` → the rule does not
run. Measured: 4 blockers → **0 blockers and 0 warnings**.

**The one thing worth reading twice:** all four of revision 1's hits were artifacts,
*including the Aug 18 05:00-checkout → 05:30-bus case that the review, the QA pass, my own
BUILD-NOTES and the note to Jacob all called the single real transfer defect.* The bus
departs 05:30, runs 40 minutes, reaches PRG at 06:10, and the flight is 07:30. Four reports
agreed on a number none of them had checked the semantics of. The tightest remaining margin
on any `'transfer'` stop is 7 minutes (Aug 14, Skradin bus stop → ticket office), and
`conflict.test.ts` asserts that number so it cannot drift quietly.

The two recorded constraints both hold: `computeLegs` still reads only `arrival` (leg parity
is byte-identical on all 16 days), and the importer derives the field from `move.mode` +
`cat` for 102 of 112 stops, with the other 10 becoming `'unknown'` rather than a guess.

### KD-2 — `geo_outlier` is now a thin publisher over `geoCheck`

`packages/core/src/conflict/rules/geoOutlier.ts`, `packages/core/src/derive/geoCheck.ts`

Also **resolved**, by §2.13. There is one implementation of coordinate-to-anchor distance in
core and `geo_outlier` is its only consumer; `validateTrip.stop_far_from_city` is deleted
outright, not folded. Every coordinate is measured to the nearest point in the trip's own
declared geography — city centres of the day's cities, `Trip.homeBase`, other stops that
day, the adjacent-day boundary — rather than to `day.primaryCity`.

Measured here, and every number in §2.13 reproduced exactly:

| | clean trip | +1° latitude injected on each record in turn |
|---|---|---|
| scheduled stops | 0 findings / 112 | **112 caught / 112** |
| places | 0 findings / 94 | **92 caught / 94** |

The two permitted misses are `Blue Cave, Biševo` and `Stiniva Cove, Vis`, named in §2.13 and
named in `geoCheck.test.ts` so a third would fail the run. The Fisherman's Bastion typo
fires at 109.5 km with exactly one blocker naming `place-68`. Revision 1's rule saw none of
this: 27 conflicts before the typo and 27 after.

`validateTrip` drops from 31 issues to 11 as a consequence.

### KD-3 — day-cost parity is **6 of 16**, not 16 of 16, and §2.6 requires that

`packages/core/test/derive.test.ts`, `packages/core/src/derive/cost.ts`

ROADMAP's acceptance criterion reads *"`rollUpCost(day)` reproduces the live app's
`dayCost()` string for all 16 days"*. **It reproduces 6.** The criterion and ARCHITECTURE
§2.6 contradict each other, and §2.6 is right: it exists precisely to stop the live page's
four money defects being carried forward. Reproducing `dayCost()` on all 16 days would mean
reproducing those defects.

All ten divergences, classified — and the test now proves each classification against the
data instead of citing this file and moving on:

| Day | Core | Live page | Why |
|---|---|---|---|
| 08-09 | ≈ €35–48 | ≈ €20–48 | `split_product` — "Gardens free · palace €15–24" is two products; `c:[0,24]` is one |
| 08-13 | ≈ €15–25 | ≈ €175–185 | `multi_currency` — "$159.98pp" stays USD instead of becoming `c:[160,160]` |
| 08-14 | ≈ €88–92 | ≈ €88–93 | `c_pair_vs_display` — a €14.49 fare carries `c:[14,15]` |
| 08-15 | ≈ €21–31 | ≈ €25–35 | `multi_currency` — ~100 CZK stays CZK |
| 08-16 | ≈ €15–20 | ≈ €37–42 | `multi_currency` — ~550 CZK stays CZK |
| 08-17 | ≈ €95–130 | ≈ €113–148 | `multi_currency` — ~450 CZK stays CZK |
| 08-18 | ≈ €63–94 | ≈ €67–98 | `multi_currency` — ~100 CZK stays CZK |
| 08-19 | ≈ €62–80 | ≈ €630–658 | `per_party_basis` — "$573.25 total" is a party total for 5, in USD |
| 08-21 | ≈ €7 | ≈ €30–47 | `multi_currency` — London GBP stays GBP |
| 08-22 | (no EUR) | ≈ €57–84 | `multi_currency` — the day has no EUR amount at all |

**The code is right and the criterion is wrong.** The architect is restating the criterion.
Nothing in the code changes.

### KD-4 — the ticket census is **7 ticketed, 3 bundled over 2 files**, not "2 bundled"

`packages/core/test/import.test.ts`

ROADMAP says *"7 stops carrying a Ticket, **2** of them `kind:'bundled'`"*. The import
produces **3** bundled stops over **2** distinct files: both FlixBus legs of the
Split↔Skradin return share `tickets/flixbus-split-skradin-3384415948.pdf`, and the
Dubrovnik→Split leg has its own PDF. Three stops, two files. The criterion counts files;
the model counts stops, and stops are what the UI renders a badge on.

**The previous BUILD-NOTES reported "7 tickets (2 bundled)" under "Verified, by running it",
and the repo's own `import.test.ts` asserted 3 at the same time.** That is the disclosure
failure this section exists to prevent, and it is why the count below is now shown with its
breakdown attached.

### KD-5 — the `closed` rule is deleted (doc-only: the file no longer exists)

`packages/core/src/conflict/rules/closed.ts` — **deleted this round.**

Revision 1 shipped the rule with a fixture case that does not exist. **0 of 95 places carry
`hours`**, §2.11's mapping table has no `hours` row, and no stop named Naschmarkt exists in
the source; the "coverage" was a synthetic test constructing the only input that could ever
reach it. §2.7 now drops the rule from Phase 1 and it returns in the phase that has an hours
source. `Place.hours` stays in the type.

Recorded here rather than quietly removed because a rule that reads as coverage and is not
is the same failure mode as a count that reads as a result and is not — and this one sat in
a source comment for a whole round.

### KD-6 — `compareStops` is never applied destructively to an existing day

`packages/core/src/build/stops.ts`

§2.4 specifies stop ordering as `(timeVal(time), order)` ascending. The implementation uses
that comparator when **inserting** a stop and never re-sorts a day that already exists,
because Jacob can drag stops into an order that contradicts their times and §2.4 says that
must survive. The two statements are consistent, but only if you read the second sentence:
`day.stops` array order is canonical and `placement.order` mirrors the array index. A reader
who sees "ordering is by time" and applies `compareStops` to a loaded day will silently undo
a drag.

### KD-7 — the map min-span guard moved into core, so the view arithmetic is gone

`packages/core/src/derive/cluster.ts`

§2.5 says the min-span guard "moves into core"; it lived inside `applyDayFit()` in the live
page's view layer. Consequence worth stating plainly: `mapBounds` returns a box that has
**already been widened to `MIN_SPAN_KM` (1.2 km)** and reports `clamped: true` when it did.
A port that applies its own minimum on top will double-clamp. `apps/web`'s Leaflet port
therefore does no bounds arithmetic at all, which is the point — `CLAUDE.md` records that
both live map bugs came from view-layer map maths.

### KD-8 — `booking_vs_plan` has a 30-minute time tolerance that §2.7 does not mention

`packages/core/src/conflict/rules/bookingVsPlan.ts`

A stop is often timed for boarding or check-in rather than departure — the Danube cruise
boards at 19:10 for a 19:30 sailing and the voucher says arrive 20–30 minutes early. With no
tolerance this rule is a blocker on ordinary, correct data and would be switched off within
a day. `BOOKING_TIME_TOLERANCE_MINS = 30`. **Dates never get a tolerance.** This is a
builder's judgement inside a spec that did not anticipate the case; it should be either
blessed or replaced with a number the architect picks.

### KD-9 — `mergeTrips` is on core's export surface and is not in §2.10

`packages/core/src/merge/mergeTrips.ts`, `packages/core/src/index.ts`

§2.2's authority table promises **"last-writer-wins per stop with a revision guard"** for
`Trip`/`Day`/`Stop`. Phase 1 shipped neither half, which is F-1: two tabs on one trip
destroyed each other's edits and the losing tab said "Saved". The guard is a compare-and-set
in `packages/client/src/store/store.ts`. The resolution is `mergeTrips`, a pure three-way
merge in core — merging documents is domain logic, and putting it in the client would have
meant `apps/mobile` re-deriving it later.

§2.10 says core re-exports *"exactly this and nothing else"* and `mergeTrips`,
`mergeLostData` and `describeMerge` are not on that list. (Neither are 64 other symbols —
F-14, architect.) Flagging it rather than hiding it inside the client.

**A refusal alone would not have been enough.** The manager's routing said "refuse the write
and surface it"; that is implemented, for the case where there is **no common ancestor** to
merge against. But refusing every concurrent write would leave §2.2's sentence half built
and would still lose tab B's work in the ordinary two-tab case, so the merge is there too.
If the architect wants refuse-only, deleting the `mergeTrips` call in `save()` leaves the
guard intact.

### KD-10 — `persistence.lastMerge` is additive to §4.2's `AppState`

`packages/client/src/store/reducer.ts`

§4.2 fixes `persistence: { savedRevision, status: 'idle'|'saving'|'error', lastError? }`. A
merged save is neither an error nor silent, and there is no in-contract place to put "this
trip was edited elsewhere while you were working; here is what I kept and what I overrode".
Added `lastMerge?: { message, report }`, cleared by `store.clearMergeNotice()` and by
switching or closing a trip. `status` is untouched and still one of the three specified
values.

### KD-11 — `Import JSON` is restore-my-own-export only, decided by Jacob, not by §2.10

`packages/client/src/store/store.ts`

`importDoc`'s doc comment promised that an import never overwrites an existing trip, and
then checked the boot-time in-memory `state.library` instead of storage, so an import from a
stale tab wiped a stored trip (F-2). Both halves are fixed: the collision check reads
`ports.storage.load(doc.id)`, and a document whose `ownerId` is not this user's is
**refused** with a visible message.

The refusal is Jacob's decision, relayed through the manager: import is backup/restore of
his own exports; friends build their own itinerary and copy individual activities across,
which is Phase 2. **The architect is writing the formal contract into §2.10/§4.5 and it may
supersede this.** If it says "adopt and badge", the `imported` badge already exists in
`packages/tokens/src/index.ts` and in `DayTimeline.tsx`; nothing currently produces the
state, so no badge machinery has to be built, only switched on.

### KD-12 — the calendar guard is on `createTrip`/`setTripMeta`, not on `fromJSON`

`packages/core/src/build/createTrip.ts`, `packages/core/src/model/ids.ts`

F-11: `createTrip({startDate:'2026-13-45'})` used to yield a 2-day trip starting 2027-02-14
that validated clean, because the guard checked the shape and `Date.UTC` rolled over.
`isIsoDate` now validates the calendar and is the single date validator in core.

**A document can still arrive through `fromJSON` with `"startDate":"2026-02-30"`.**
`fromJSON`'s enum and numeric-domain validation is absent generally (F-12: it accepts
`"category":"nuclear"` and `"lat":1e999`), which is deferred; the date domain is part of
that same gap and I did not widen the fix into it unasked. `validateTrip` has no
`invalid_date` code, and adding one is an addition to §2.9's issue list.

### KD-13 — `apps/web`'s stubs

`apps/web/src/views/Library.tsx`

Duplicate and rename are stubbed, which ROADMAP permits. So is the city map: `cityMapPoints`
exists and is tested, but no view mounts it, and the Places panel is a list. Drag-reorder is
↑/↓ buttons. The new-trip wizard is title + dates + a comma-separated city list. All four are
explicitly allowed to be stubbed; they are listed here as well as in §5 so the two lists
cannot drift.

### KD-14 — `fixtures/golden/core-*.json` are self-snapshots, not independent goldens

`tools/gen-golden.mjs`

`legacy-*.json` is generated by executing the **live page's own** `haversine`, `legBetween`,
`dayCost`, `clusterStops` and `focusCluster` inside a `node:vm`. Diffing against those is a
real check. `core-*.json` is this code's own output, recorded. A `core-*` golden proves
*nothing changed*; it cannot prove *anything is right*. `core-conflicts.json` in particular
records 12 blockers, and KD-1 and KD-2 are why 9 of them are noise. The file's own header
says this; it is repeated here because a number read out of it landed in a report as a
result.

### KD-15 — a journey does not overlap the journey that immediately follows it

`packages/core/src/conflict/rules/overlap.ts`

§2.12 says a `travelRole:'journey'` stop occupies `[time, time + arrival.mins)` for
`overlap`, even with `durationMins` null. Taken literally that puts **one warning on the
reference trip**: Aug 21, BA863 departs Budapest 12:55 and runs 165 minutes, and the next
stop is 15:15 in Windsor. §2.7 requires `overlap` to return 0 on that trip, and §2.12 itself
identifies that exact pair as a **CEST → BST timezone artifact** — the reason
`journey_overrun` is deferred to Phase 4. Reporting it under a different rule id would ship
the artifact the deferral exists to avoid.

So: a journey's *derived* occupancy is not compared against an immediately-following stop
that is itself a `'journey'` — the itinerary continuing at the destination, on the
destination's clock. Anything else scheduled inside the run still fires, and
`conflict.test.ts` asserts both halves. **This is a narrowing of §2.12's overlap row that
the architect did not write.** If it is wrong, the fix is one `continue` and a golden.

### KD-16 — ROADMAP C's injected-fault criterion names a stop that cannot show the fault

`packages/core/test/conflict.test.ts`

*"Set `travelRole:'transfer'` on the Aug 8 Condor DE4345 stop and `impossible_transfer` fires
as a blocker."* **It does not, in any role.** DE4345 departs 14:30 against a 13:00 previous
stop and runs 80 minutes: the gap already exceeds the journey by 10 minutes, so the rule is
silent whichever role the stop carries. It is one of the 25 stops §2.12 itself describes as
"silent only because the printed clock gap happens to exceed the journey time".

The mechanism the criterion is reaching for is real, so the test asserts it on a stop where
the flip **is** observable — Aug 7, Condor DE2081, a 660-minute flight in a 120-minute gap,
blocker as `'transfer'`, warning as `'unknown'`, silent as `'journey'` — and then asserts
that DE4345 is silent in all three roles, so the criterion's own stop is covered too and the
reason is written down. Architect: restate the criterion against DE2081.

### KD-17 — the redaction pattern for booking references does not require a digit

`tools/redact.mjs`

§6.6 words one pattern as *"any 6+ character uppercase-alphanumeric token **containing both
letters and digits** (`YZGDTS`, `IU1TUY`, `D8WQHO`)"* — and `YZGDTS` contains no digits. The
examples win: a six-character all-caps booking reference is exactly the shape being
protected, and requiring a digit would have let `YZGDTS` — **one of the five strings the
review found in the bundle** — straight through the rule written to catch it.

Shipped as `\b[A-Z0-9]{6,}\b`. The cost is that a 6+ letter ALL-CAPS word in prose is
redacted too; on the reference trip that is **0 strings**, and `test/redact.test.ts` asserts
both that every fixture is fully redacted and that six pieces of ordinary prose survive
untouched, so the trade is measured rather than assumed.

Two smaller departures in the same file, for the same reason — a pattern that fires on
structure rather than credentials is a pattern that gets switched off:

- the keyword pattern's separator excludes a bare hyphen, so the structural id `booking-16`
  is not mistaken for a reference;
- it is split in two (`keyword_token`, `keyword_digits`) so *"the booking is done"* and
  *"Booking recommended in summer"* survive while *"PIN BGXw"* and *"Booking 338 441 5948"*
  do not. Both halves carry their own fixture, per §6.6's "a pattern that catches nothing is
  itself a failure".

### KD-18 — three source COMMENTS were shipping booking references, and `sourceDoc` is dropped

`packages/core/src/build/bookings.ts`, `conflict/rules/supersededBooking.ts`,
`conflict/rules/unverifiedReference.ts`, `tools/redact.mjs`

Two findings that only appear once the §6.6 bundle check is actually run, both worth
recording because neither is in any report:

1. **The check must include `.js.map`.** A sourcemap embeds `sourcesContent`, so a booking
   reference sitting in a *source comment* ships in the build artifact exactly as surely as
   one in the data. Three comments named `YZGDTS`, `IU1TUY` and `I54C9A` to explain their
   own fixture cases; all three are reworded, and the test greps maps as well as scripts so
   a fourth cannot creep back. Nothing about the rules changed.
2. **`Booking.sourceDoc` is dropped from the redacted sample.** It holds `docs/BOOKINGS.md`,
   which is not a credential — but `BOOKINGS` matches the all-caps pattern of KD-17, and the
   alternative was to exempt a key from the "no string matches any pattern" criterion. A
   provenance breadcrumb pointing at a file that is not deployed is not something the sample
   needs, so dropping it keeps the criterion literal instead of carved out. **The real trip
   keeps it** — redaction never touches `importLegacyDays` output.

### KD-19 — core exports 112 runtime symbols against §2.10's 50, and the gap is enumerated not narrowed

`packages/core/src/index.ts`, `packages/core/test/surface.test.ts`

§2.10 says the index re-exports *"exactly this and nothing else"* and ROADMAP E asks for set
equality in both directions. **The first half is met and the second is not.** Every symbol
§2.10 names is exported (asserted). But 62 more are exported besides, and this round did not
narrow them — it enumerated them.

`surface.test.ts` carries two lists: §2.10 transcribed, and `BEYOND_2_10`, which names every
extra symbol **with the caller that needs it, one line each**. A symbol added to the index
without appearing in one of the two fails the build; a listed symbol that stops being
exported fails too; and the size of the gap is asserted so it cannot drift.

Six of the 62 are marked `INTERNAL` and should simply become private: `canonical`, `digest`,
`makeConflict`, `conflictId`, `blankDay`, `toDoc`. The other 56 are things the client, the
CLI or the views demonstrably call — `fmtMins`, `issueCounts`, `orderedCities`, `haversine`,
`isIsoDate`, `effectiveRole` and so on — which is the same finding F-14 made and the
architect answered by widening §2.10 to 50. **50 is still short of what the client uses.**

**Why enumerated rather than narrowed:** cutting 62 exports at the end of a session means
rewriting the import site of every test and every view, with the failure mode being a
green suite that no longer tests through the public surface. The enumerated list gives the
manager the thing the criterion was actually for — a reviewable, line-by-line account of the
leak that cannot grow silently — and leaves the cut as one mechanical change against a test
that already knows the answer. **This is a criterion partially met, and it is reported as
partially met.**

### KD-20 — `copyStopInto` was redacting the structured credentials and copying the same class of credential as prose

`packages/core/src/build/copyStop.ts`, `packages/core/src/build/redactText.ts` (new — moved
out of `tools/redact.mjs`, which now imports it), `packages/core/test/copyStop.test.ts`

QA round 2's worst finding, confirmed by the coordinator independently before routing here.
Rule 3 already drops `bookingId` and refuses to let a `Ticket` travel, in as many words
because a booking reference and a ticket URL are access credentials (§6.6). Rule 5 then
copied `note` verbatim — and Jacob's door PINs and booking confirmations live as prose
inside notes, not in structured fields, so the exact class of information rule 3 protects
crossed the trip boundary through rule 5. Reproduced by `qa/r2-copy.mjs` section H: copying
the Habyt Vienna stop carried `"conf 5814731574, PIN 0754"` into the target trip's note.

**Fix:** the pattern set that already existed for build-artifact redaction (§6.6) is the
right tool — a booking confirmation and a door PIN are exactly what it was written to catch.
It has moved to `packages/core/src/build/redactText.ts` so both callers share one
definition of "credential-shaped": `tools/redact.mjs` now imports and re-exports it rather
than defining its own copy, and `copyStopInto` runs a copied stop's `note` through it before
the stop exists in the target trip. `name`, `category`, `flags`, `durationMins`, `arrival`
and `travelRole` are unchanged — they describe a place and a journey, not a claim about the
user, and are not where the leak was.

No exposure existed — Phase 1 has no second user, so there was nobody to leak to — but this
is the mechanism Phase 2's real sharing runs on unchanged, which is why round 2 routed it as
a blocker rather than a note for later.

**Not addressed here, and worth the architect's attention regardless:** round 2 also found
`PoolPanel` renders a copied stop's badge without calling `attribution()`, which is rule 7
("every view that renders one renders the other") failing on its own terms — a display gap,
not a leak, and out of scope for this fix. *(Closed later, in the SEND-BACK pass — KD-26.)* And the redaction pattern set is still the fixed
list KD-17/KD-18 describe, not a broader mechanism; sharing the definition closes the
note-field leak specifically without closing that gap.

### KD-21 — moving `redactText` into core shipped its own rationale strings to the browser

`packages/core/src/build/redactText.ts`

Caught in the same pass as KD-20, before it was pushed, by rebuilding and grepping the
bundle the way QA round 2 did. Each pattern in `REDACTION_PATTERNS` originally carried a
`why: '...'` string for documentation — one of them was `'A 6+ character all-caps
alphanumeric token: YZGDTS, IU1TUY, D8WQHO, 3379864687.'`, using the real leaked references
as the example. That was harmless while the module lived only in `tools/redact.mjs`, a
build-time-only script never bundled for the browser. Moving it into `packages/core` for
KD-20 changed that: `apps/web` bundles core, so the string became runtime data shipped to
every visitor, and `npm run web:build` proved it — `YZGDTS`, `IU1TUY` and `5814731574` were
all present in `dist/assets/index-*.js`, none of them inside a comment.

**Fix:** `why` is a comment on each pattern now, not a field. Nothing reads `.why` at
runtime (checked — zero references outside this file before the change), so nothing was
lost by making it non-data; minification strips comments, so it does not reach the bundle.
The lesson generalises past this one file: **a rationale string is exempt from bundle
scrutiny only while its module is provably build-time-only, and that exemption silently
expires the moment something in `packages/core` or `apps/web` imports it.**

### KD-22 — the page-exit handlers live in `packages/client`, not `apps/web`

`packages/client/src/store/pageExit.ts`, `apps/web/src/App.tsx`

§4.2 rule 6 says *"`apps/web` registers `visibilitychange` → `hidden` and `pagehide` … and
registers a `beforeunload` handler"*. It does — `App.tsx` calls `registerPageExit({ win:
window, doc: document, … })` — but the handler *logic* sits in `packages/client`, taking its
two event targets as arguments and touching no DOM type.

Why, in one sentence: **§3's dependency-direction test forbids anything importing `apps/web`,
so a module that lives there cannot be tested**, and ROADMAP F asks for exactly that test
("assert the listeners are registered and that the visibility handler calls `flush()`"). The
first attempt did put it in `apps/web/src/pageExit.ts` with a root-level test, and
`test/boundaries.test.ts` correctly failed the run.

**Cost:** none that I can see — it does not violate "`packages/client` never touches the DOM
or React" (there is no DOM type in the file, only a two-method structural type), and
`apps/mobile` will want the same dedupe logic against `AppState` rather than
`visibilitychange`. **If the architect disagrees, the move back is one file and one import**,
and the test goes with it — but then the criterion loses its test and should say so.

### KD-23 — `geoCheck` gives a copied stop no anchors, in both directions

`packages/core/src/derive/geoCheck.ts`

§2.13's anchor table gained a row in revision 5 and this implements it. Two halves, and the
second is the one that is easy to get backwards:

1. **A record `copyStopInto` produced is measured but never `'certain'`.** Copying "Arrive
   LAX" into a Lisbon trip produced `geo_outlier: 9140 km, certain` — a blocker on the
   phase's newest primitive, seconds after a human deliberately asked for that record to be
   there. §0.5 governs. `km` and `nearest` are still measured, so a view can say how far it
   is; `geo_outlier` publishes neither `'unanchored'` case.
2. **An un-accepted copy is not an anchor for anything else.** An anchor asserts *"the
   trip's geography includes this point"*, and a candidate the user has not accepted is not
   yet part of the plan — letting one in would let it **suppress a real blocker** on a stop
   the user wrote themselves. Once accepted it joins the anchor set, and that direction
   matters: acceptance only ever *adds* anchors, so it can only ever remove a blocker,
   never create one.

**The known blind spot, restated because it is deliberate:** a coordinate typed *into* a
copied stop after the copy is invisible, because the row keys on `attribution(stop) !== null`
and not on `provenance.state`. Keying on state would make the same document produce different
conflicts either side of a provenance transition. §2.13 rates a named blind spot above a rule
that mints unexplained blockers.

**`Place` gets no row and needs none** — it carries no `provenance`, so a copied place is not
identifiable as one, and both outcomes the existing Place row produces are already correct.
No `Place.provenance` was added.

**Ceiling, asserted:** the reference trip contains no record with a non-null `attribution`, so
0/112 and 0/94 clean, 112/112 and 92/94 under +1°, and the Fisherman's Bastion blocker are all
unchanged. `geoCheck.test.ts` asserts the "no attributed record" premise itself, so the day
that stops being true the ceiling fails rather than quietly stops meaning anything.

### KD-24 — `travelLine` re-parses `HH:MM` instead of calling core's `timeVal`

`packages/client/src/selectors/index.ts`

§2.12's day-view row needs "departs 14:30 · 1h 20m · **arrives 15:50**", and the arrival
clock has to be computed from a time and a duration. Core has that arithmetic — `timeVal` —
and **§2.10 revision 5 took `timeVal` off the public surface** in the same pass, as an
internal of `computeLegs`; §2.10's own ceiling then forbids `packages/client` from reaching
past the index into a core module path. So the selector carries four lines of `HH:MM`
parsing of its own.

That is a second implementation of something, and sequencing rule 1 is about exactly that, so
it is written down rather than left to be found. **Why it is the cheaper wrong:** it decides
nothing about the trip; it returns `null` on anything that is not a clock rather than
guessing; and the alternative — widening §2.10 for a display helper — is a documentation
change the builder does not get to make. **If the architect would rather have `timeVal` on the
surface, this is four lines and one import.**

Two related choices, stated: the shaping lives in `packages/client` and not in `apps/web` so
it can be tested in plain Node (§3 forbids importing `apps/web` from anywhere) and so
`apps/mobile` inherits it. And the arithmetic is **wall-clock with no timezone** — a run that
crosses midnight reports `nextDay` and renders "(+1 day)"; a run that crosses a timezone is
reported as the clock arithmetic it is and nothing more, which is why `journey_overrun` is
still deferred to Phase 4 (KD-15).

### KD-25 — `syncResolutions` is called from `getDerived()`, and one ROADMAP F test was rebuilt around that

`packages/client/src/store/store.ts`, `packages/client/test/derived-cache.test.ts`

§2.7 calls `syncResolutions` *"a build function the client calls whenever it recomputes the
derived conflict set"*. Nothing called it (QA R2-7), so the conflicts panel's **Not a problem**
button resurrected its own dismissals. The call now sits in `getDerived()`, immediately after
`derivedFor` — the one place the conflict set is known to have been computed from the current
`state.doc`, which is what §2.2b F2 requires of a function that reads derived data and
**writes the document**.

Two consequences worth naming:

- **`getDerived()` can now change the document and schedule a save.** It is a read that
  writes, which is unusual, and it is what §2.7 asks for. It converges in one pass —
  retiring a resolution cannot make a conflict appear or disappear, only detach a
  `resolution` from one — and the retirement is bookkeeping, so it does not go on the undo
  stack, exactly as the pre-existing `store.syncResolutions()` method already did it.
- **`derived-cache.test.ts`'s R4-1 test had to be rebuilt.** Its old setup acknowledged a
  conflict, edited it away, and then undid — and with the call finally wired, the
  intermediate `getDerived()` retires that acknowledgement *legitimately*, which made the
  final assertion vacuous rather than wrong. The resolution is now created **after** the
  cache has gone stale, which is the only way a live resolution and a stale conflict set can
  coexist at all. The property under test is unchanged and still fails if the sync trusts
  the cache instead of recomputing.

### KD-26 — the credit line is one shared function, and the views ceiling carries one exemption

`apps/web/src/format.ts`, `apps/web/src/views/Panels.tsx`, `apps/web/src/views/StopEditor.tsx`

§2.14 rule 7: *"any view that renders a record with a non-null `attribution` renders the
credit"*. Two of the four stop-rendering views did not — `PoolPanel` rendered the badge *from
a friend* and no credit, `StopEditor` rendered neither (QA R2-8). Both now do, using the same
`creditLabel` the day view used, **moved into `format.ts` rather than copied**: four
hand-written versions of a rule is four chances for one of them to quietly not exist, which
is how this defect happened.

The ceiling is now a grep, not four hand checks (`test/views.test.ts`): a view that renders
the provenance **badge** renders the **credit**, and the set of badge-rendering views is
pinned so a fifth cannot appear silently. **One exemption, `Sidebar.tsx`**, which renders a
`Day` chip and never a `Stop`. Its justification is not argued, it is asserted: the test
proves at runtime that neither the reference trip nor a freshly copied stop produces a `Day`
with a non-null `attribution`, so the day the exemption stops being true the run fails.

**What this ceiling cannot do**, stated: `apps/web` cannot be imported from `cairn/test/` —
§3's dependency test forbids it, and that is the boundary keeping the planner's data out of a
bundle — so the views are read as *text*. The rendered strings are asserted separately, in
Chromium, by `qa/r8-views.mjs` §2.

### KD-27 — the bundle check is a derived rule now, with two named non-credentials

`packages/core/src/build/redactText.ts`, `packages/core/src/model/types.ts`, `test/redact.test.ts`

§6.6 enforcement clause 2 asks for *"a rule applied by the sample generator, covered by a
test, not a one-off scrub"*. The shipped test grepped `apps/web/dist` for six hardcoded
literals and never applied `redactionHits` at all, so a seventh credential was simply not
looked for — and a seventh had crept in: a real FlixBus booking reference written as the
example in a source comment, shipped through the sourcemap's `sourcesContent`, plus a real
flight designator from `types.ts`. Both are replaced with invented placeholders.

The rule now **derives** the credential set — run the redactor over the *unredacted* trip,
keep every token it removes, assert none appears in any emitted asset — so it grows with the
data. **`REDACTION_PATTERNS` is deliberately NOT applied to the bundle directly**: minified
JS is wall-to-wall short uppercase identifiers and long digit runs, and QA already ruled that
unimplementable. The patterns are applied to the DATA; the resulting tokens are what the
bundle is grepped for.

**The divergence: two tokens are excused, by name, with a checkable claim each.** `OPTIONAL`
is an English word in Jacob's own day note, caught by the deliberately digit-free all-caps
pattern (KD-17's stated cost), and in the bundle it is `LegacyConstants.OPTIONAL`, a property
name of the importer's input type. `BOOKINGS` is part of the repo path `docs/BOOKINGS.md` on
a dropped `sourceDoc` field, and in the bundle it is a doc comment naming that file. Both
entries are asserted **live** — an excuse the derivation no longer produces is a dead line
and fails — and asserted **disjoint from the known-leak list**, so a real credential can
never be excused. The six-literal list stays as a floor beneath the rule, not as the rule.

### KD-28 — the flush-exhausted exit reports and re-arms; the other two exits do neither

`packages/client/src/store/store.ts`

§4.2 rule 6a″ (revision 5, QA R6-1/R6-2). Exhausting `FLUSH_MAX_ATTEMPTS` was the one path
that aborted a transition without telling anyone — `status` stayed `'idle'`, and no banner
reads `'idle'`, so the click did nothing and said nothing — and it cancelled the timer the
user's own edit had scheduled without putting it back. It now sets `status:'error'` with
`FLUSH_EXHAUSTED_MESSAGE`, which renders through the **existing** error banner with its two
recoveries, and re-arms the ordinary debounced `attemptSave`.

**Deliberately not `'conflict'`:** nothing refused the write and there is no other writer to
merge with, so offering a merge would be a lie about what went wrong. **Deliberately a
three-way rule:** on `'conflict'` a re-armed autosave would spin against a fence that refuses
it every 400 ms; on a port `'error'` the port is failing and the banner's Retry is the
deliberate act. Only the bound-exhausted exit re-arms. All three are asserted, the last two
as ceilings — behaviourally, by firing the scheduler and counting writes at the port, because
`manualScheduler.pending` keeps cancelled jobs and is not an answer to "is a timer pending".

### KD-29 — `expiresAt` and `revokedAt` fail closed on anything that is not a calendar date

`packages/core/src/access/predicates.ts`

`if (s.expiresAt && s.expiresAt < now)` is a lexical string compare, and a lexical compare on
an unvalidated string is not a calendar comparison: `"9999-99-99"`, `"tomorrow"` and
`"never"` all sort after a real `YYYY-MM-DD`, so all three read as *not yet expired* and
granted access. That is F-13's argument one field over, and §6.2.4 is why it is not
Phase-2 work: these predicates are *the definition the Phase 2 RLS policies are generated
from and tested against*, and a definition that fails open generates a policy that fails open.

Both fields are validated with `isIsoDate` and fail closed. **`null`, `''` and absent keep
meaning "no expiry"** — asserted explicitly, in both directions, alongside a real past date
still expiring and a real future date still granting.

### KD-30 — `cli export` resolves symlinks, and refuses to clobber

`cli.ts`

Two holes in one command (QA R2-5). `safeWritePath` was lexical: `resolve()` normalises `..`
and a leading `/` but does **not** follow symlinks, so `ln -s <outside>/victim.txt
cairn/qa/escape-link.json` passed the prefix test and `writeFileSync` wrote *through* the
link — the file outside `cairn/` was overwritten with the trip JSON and the CLI reported
success. Root `CLAUDE.md` calls this boundary *"the one rule that must never drift"*. The
guard now `realpathSync`es the containing directory (which catches a symlinked parent) and
the target itself when it exists (which catches a symlinked file), and a missing parent
directory is a refusal too.

Second half: `export <existing file>` overwrote it with no prompt and exit code 0. **A CLI has
no dialog to raise and a prompt would break every scripted use, so the answer is
refuse-by-default with the way through named in the message** — exit 3, *"refusing to
overwrite … Pass --force if you meant to replace it."* `--force` is a deliberate act and it
still cannot cross the `cairn/` boundary, asserted. If the architect wants an interactive
prompt on a TTY instead, that is a small addition on top of this, not a replacement for it.

### KD-31 — `deleteTrip` is a link on the serialization chain

`packages/client/src/store/store.ts`

§4.2 rule 6c, revision 5 (QA R7-3). **The exception is about not *writing*. It is not about
not *ordering*.** A write already queued can settle *after* `ports.storage.delete(id)`
returns, and an expect-absent write is *satisfied* by the record's absence, so it succeeds,
`upsertSummary` puts the library row back, and the trip is resurrected with the delete
silently undone.

`await saving; ports.storage.delete(id)` is **not** the fix and was not used — the architect
identified it as its own race, a check-then-act with an interleaving point in the middle. The
delete is a `chainOntoSaving` link of its own: *drain, delete, forget*, with the port delete,
the library-row removal and (when the deleted trip was active) the reset of `doc`, `savedDoc`
and `savedVersion` all inside the one link, so no later link can observe a half-deleted store.

**The exception survives, and it is asserted**: the active trip's pending timer is still
cancelled *without* writing, so the queue this link drains holds only writes the store had
already committed to; a conflicted trip is still deletable.

### KD-32 — the merge button has an in-flight guard, and the debounced save absorbs its own rejection

`packages/client/src/store/store.ts`

**R7-1.** `mergeWithStored` is `load()` … `mergeTrips` … `chainOntoSaving(write)`, three
awaits with interleaving points between them, and `App.tsx` has no disabled state on the
button. Two presses before the first settles both read the same `stored.version`, so the
first write moved storage on and the second was refused against a version its own predecessor
had spent — leaving `'conflict'` and *"Not saved — edited elsewhere"* over a document that was
merged and written correctly. **Chaining does not close this**, which is why the guard is an
in-flight slot and not a queue: serialising two merges still runs the second one's stale
expectation. A second press joins the first press's promise. `finally` clears the slot
whichever way the merge ends, so a failed merge never wedges the button.

**R7-2.** The fix is the `.catch` on `scheduleSave`'s `void save(...)`, **not** a `try/catch`
per listener in `emit()`. The two are not equivalent here: per-listener isolation would also
swallow the rejection an explicit `flush()` owes its own caller, and `qa/r7-chain.mjs` §3
asserts that a failing link still rejects for the caller that asked for it. The absorbing
`.catch` is on the fire-and-forget path only — the one with no caller to reject to — and it is
the same shape as `chainOntoSaving`'s existing `.catch(() => {})`, one level out. A *storage*
failure is still reported: `attemptSave` turns that into `status:'error'`, and the only
rejections reaching the swallowed line come from a subscriber throwing inside `set()`.

### KD-33 — the export surface is 69 symbols, and 45 came off

`packages/core/src/index.ts`, `packages/core/test/surface.test.ts`

§2.10 revision 5 settled a criterion that had been "partially met" for three rounds: the test
asserted set equality against the **union** of a 50-name list and a 60-name "beyond the
section" list, which is 110 = 110 for any 110 exports, and QA R2-12 found 42 of the 60
per-symbol justifications did not hold. It is now one list of 69, set equality both
directions, plus ROADMAP E's two ceilings: no second list and neither banned identifier
anywhere in the file (asserted by grepping the test's own source), and no consumer outside
`packages/core` importing a core module path.

**The expected shape of the change, per §2.10 itself: some tests and probes now import a
module path directly.** Tests do not create surface, and attacking an internal is their job.
Rewritten from the index to the module path: `access.test.ts` (`isIsoDate`), `build.test.ts`
and `merge.test.ts` (`userProvenance`, `systemSuggestion`, `addPlace`), `conflict.test.ts`
(`STALE_RESOLUTION_LIMIT`, `timeVal`), `copyStop.test.ts` (`addPlace`, `needsBadge`),
`derive.test.ts` (`haversine`, `rawSpanKm`), and the probes `qa/attack2.mjs`,
`qa/r2-copy.mjs`, `qa/r6-actor.mjs`, `qa/vehicles.mjs`. `tools/redact.mjs` moved the other
way — its deep import into `build/redactText.ts` now goes **through** the index, which is why
the redaction four are on the surface at all.

**Not repaired, and disclosed:** `qa/r5-freshness.mjs` §5.7 calls `core.accept`, which QA
R5-5 removed two rounds ago, so that block has been dead since round 5 and BUILD-NOTES
already records it as deliberately unpatched. This pass also takes `friendImport` and
`needsBadge` off the index, which that same dead block references; nothing observable changes
because it already crashes one line earlier. Probe repair is a commit of its own, and it is
the breaker's.

---

## 2. How to run it

```bash
cd cairn
npm install
npm test          # 387 tests. Plain node, no browser, no network.
npm run typecheck # generates the sample first (see F-3 below), then both TS projects
npm run cli -- trip           # headline counts and city ranges
npm run cli -- day 2026-08-13 # one day: stops, legs, costs, badges
npm run cli -- conflicts      # the conflicts panel as text
npm run web:dev   # http://localhost:5173
npm run web:build && npm run serve   # production build on http://localhost:4173
```

Both commands work from a **clean clone**. `npm run typecheck` used to fail on a fresh
checkout — `apps/web/src/sample/europe2026.json` is gitignored and generated by
`gen-sample.mjs`, so `tsc` could not resolve it until after `npm run web:build` (F-3). There
is now `npm run sample`, and `pretypecheck` runs it.

`npm run golden` regenerates `fixtures/golden/*.json`. Only run it when you have decided the
new output is correct — that is the whole point of the files. See KD-14 for what a `core-*`
golden does and does not prove.

`npm run cli -- export <path>` refuses any path that normalises outside `cairn/` (F-16).
`cairn/test/cli.test.ts` runs the real CLI against `../europe-2026-itinerary.html`,
`../docs/BOOKINGS.md`, `../tickets/…` and `/etc/passwd` and asserts all four are refused.

**The persistence probes**, for anyone re-checking R2-1 / R3-1 / R3-4 / R3-2 / R4-1. Plain node:

```bash
node qa/r3-undo.mjs      # the fence vs. Ctrl-Z            (all probes ok)
node qa/r3-loss.mjs      # flush-before-switch, real timers (all probes ok)
node qa/r3-cas2.mjs      # ABA, corrupt records, page exit  (probes 1-4 ok; 5-7 are R3-5+)
node qa/r3-cas.mjs       # the save chain                   (all ok except A, which is R3-3)
node qa/r4-switch.mjs    # R4-1's ten probes                (all ok since the round-4 pass)
node qa/r2-copy.mjs      # R2-11's ruling, §B               (all ok since the round-4 pass)
```

The 200-step walk in `packages/client/test/dirty.test.ts` takes a seed, so a failing run is
replayable: `CAIRN_WALK_SEED=12345 node --test packages/client/test/dirty.test.ts`. The
default is `20260826` and the failure message prints whichever seed was used.

Real Chromium, against real IndexedDB — needs the build and the server first:

```bash
npm run web:build && node tools/serve.mjs &
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-race.mjs      # 0 of 3 rounds lose an edit
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-tabs.mjs
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-browser.mjs   # R3-1 and R3-2, both closed
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-upcast.mjs    # the §2.2a upcast
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-browser.mjs   # R4-1, 4 probes, all ok
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-epoch.mjs     # R4-2, 6 probes, all ok
```

`qa/r3-upcast.mjs` is new: it seeds a genuine **version-1** `cairn` database — `docs` +
`summaries`, no envelope version, the shape Jacob's browser actually holds — then boots the
app over it and checks the record is stamped at open, opens, edits and saves.

---

## 3. What actually runs

| Piece | State |
|---|---|
| `packages/core` | Model, build, derive (incl. **`geoCheck`**), conflict (**10 rules** — `closed` deleted), validate, access, serialize, legacy import, merge, **`copyStopInto`**. |
| `packages/client` | Store, reducer, ports, selectors, derived cache, the **`StorageVersion` write fence** (refuse + explicit merge — §2.2a), **flush-before-switch** (§4.2 rule 6) and `pageExit`, **browse-another-trip**. `syncResolutions` is now *called*, from `getDerived()` — until this pass it existed with no caller and the row said so anyway (KD-25). Every `StoragePort` mutation, `delete()` included, is on the serialization chain (KD-31); the merge button has an in-flight guard (KD-32); the exhausted flush reports and re-arms (KD-28). `travelLine` shapes §2.12's day-view string (KD-24). |
| `packages/tokens` | Colours, category labels, mode icons, status badges. **No test of its own.** |
| `apps/web` | Library, day view, day map, conflicts, validation, pool, places, export, **restore-from-backup**, **Browse & copy**. The **credit line now renders in all four views that render a stop** — the day view and the browse pane always did; the Optional panel and the stop editor did not, and the row used to claim otherwise (KD-26). **`travelRole` is rendered**: a `journey` stop reads *"departs 14:30 · 1h 20m · arrives 15:50"*, and an `unknown` stop carries the one-tap control §2.12 asks for (KD-24). **`acceptCandidate` is still reachable from no control** — an imported stop stays badged forever. That fails safe and it is not fixed here; it is named so nobody has to find it again. |
| `cli.ts` | Complete. `export` resolves symlinks before the boundary test and refuses to clobber an existing file without `--force` (KD-30). |
| `tools/extract-legacy.mjs` | Reads the live planner READ-ONLY. |
| `tools/gen-sample.mjs` | Builds the web app's sample trip at build time, **through `redactForSample`**, and fails the build if a credential survives. Output is gitignored. KD-14, KD-17, KD-18. |
| `tools/redact.mjs` | The §6.6 pattern array and `redactForSample`. Never imported by `packages/core`. |
| `tools/serve.mjs` | Zero-dependency static server for `apps/web/dist`. |
| `tools/doc-section` | Prints one section of a docs file. |

---

## 4. Verified, by running it

**Regenerated for the SEND-BACK pass** (round 8's builder pass, on `master` after `5bdd0dc`).
The previous table under this heading reported *"231 pass"* and predated round 2; the review
was explicit that a stale table here is what round 1 was sent back for. Every number below
came out of a command in this repo, on this delivery, in this pass. Where a number is
misleading, the caveat is **next to the number**, not in a footnote.

| What | Number | Command | Caveat |
|---|---|---|---|
| Tests | **387 pass, 0 fail** | `npm run test:tap` | Was **333 / 0** at `8a65a53` (the reviewed commit). +54, all of them this pass's regression coverage; one file is new (`packages/client/test/travel-line.test.ts`, `test/views.test.ts`) and one existing test was **rebuilt rather than added to** — see KD-25. |
| Typecheck | clean, both projects | `npm run typecheck` | `pretypecheck` generates the sample first. Not re-checked from a fresh clone this pass; the review verified that clause at `8a65a53` and nothing here changes the install or the config. |
| Web build | clean | `npm run web:build` | 583 kB `index-*.js`, unchanged in kind. |
| Bundle credentials | **0 leaks of 108 derived tokens** | `npm run web:build && node qa/r2-redact.mjs` | Was **7**, including Jacob's real FlixBus reference in a `.js.map`. The three the probe still prints are `OPTIONAL` and `BOOKINGS`, which are an English word and a repo-path fragment — named, justified and asserted-live in `test/redact.test.ts`. **KD-27.** |
| Import | 16 days · 112 scheduled · 31 pooled · 95 places · 21 bookings | `node cli.ts trip` | Unchanged. |
| Tickets | **7 ticketed stops: 3 bundled over 2 files, 4 url** | ticket census through `importLegacyDays` | ROADMAP says 3/2 too; revision 1 said "2 bundled" and an earlier version of this report repeated it — **KD-4**. |
| `travelRole` | **21 journey · 81 transfer · 10 unknown** of 112 | `import.test.ts`; `qa/r8-views.mjs` §1 | The model half was already right. **This pass put it on the screen** — Aug 8 renders *"departs 14:30 · 1h 20m · arrives 15:50"*, asserted in Chromium, and the ten `unknown` stops now carry a control that dispatches. KD-24. |
| Blockers | **2** | `node cli.ts conflicts` | Both are Jacob's own `legacy_flag` days, and the golden carries one line per blocker saying why he must act — a third cannot appear without someone writing that line. **The copy path can no longer mint a third** (KD-23), which is what R2-9 was. |
| `impossible_transfer` | **0 blockers, 0 warnings** | `conflict.test.ts` | Unchanged. Tightest remaining transfer margin **7 min**, asserted. KD-1. |
| `geoCheck` clean run | **0 findings** — 0/112 stops, 0/94 places | `geoCheck.test.ts` | Unchanged by KD-23's new row, and the test now asserts the *premise* (the reference trip holds no attributed record) so the ceiling cannot go quietly vacuous. |
| `geoCheck` injected fault | **112/112 stops, 92/94 places** at +1° latitude | `geoCheck.test.ts` | Unchanged. The two misses are the named ones. |
| Fisherman's Bastion typo | **1 blocker, `place-68`, 109 km** | `geoCheck.test.ts`, `qa/r2-data.mjs` | Unchanged; re-derived independently by the probe in this pass. |
| Copy path × `geo_outlier` | **`unanchored`, 9140 km, 0 conflicts** | `node qa/r2-data.mjs` | Was `certain` → `blocker: geo_outlier`. Both halves asserted: the false blocker is gone, **and** an un-accepted copy cannot suppress a real blocker on an own stop. KD-23. |
| Validation | **1 error, 10 warnings** | `node cli.ts validate` | Unchanged. |
| Leg parity | **16 of 16 days** exact | `derive.test.ts` | Against the live page's own `legBetween` in a `node:vm`. Untouched by this pass — `computeLegs` still does not read `travelRole`. |
| Day-cost parity | **6 of 16 exact, 10 divergent** | `derive.test.ts` | Each of the ten is classified and the classification is proved against the data — **KD-3**. |
| Export surface | **69 runtime symbols = §2.10's 69** | `surface.test.ts` | Was **110 against an enumerated 50 + 60**, which was 110 = 110 for any 110 exports. Set equality, both directions, one list, plus ROADMAP E's two ceilings. **KD-33 supersedes KD-19.** |
| Redaction | every pattern exercised; 6 prose strings survive; `importLegacyDays` output unchanged | `test/redact.test.ts` | Plus the new derived rule and its red-green check: a planted credential the old six-literal grep would have missed is caught. KD-27. |
| `cli export` boundary | 6 lexical escapes + **2 symlink escapes** refused; clobber refused | `test/cli.test.ts` | The symlink half is new. Reproduced first: the file outside `cairn/` really was overwritten. KD-30. |
| Access predicates | 3 named malformed expiries fail closed; `null`/`""`/absent still mean "no expiry" | `packages/core/test/access.test.ts`, `node qa/r2-access.mjs` | `qa/r2-access.mjs` was **1 FAIL**, now **0**. KD-29. |
| Read-only boundary | 0 modified tracked files at the repo root | full run, then `git status --porcelain` | `md5sum europe-2026-itinerary.html` = `7c69df3208ef91c8be0fb59a56443188` before and after, across the full suite, four web builds, six Chromium sessions and ~25 probe runs. See §7. |

**The 2 blockers, line by line.** Unchanged, and this is the whole table:

| # | Rule | Subject | Act on it? |
|---|---|---|---|
| 1 | `legacy_flag` | Aug 18 — Jacob's own rebuild note | **Yes** — his flag, his words |
| 2 | `legacy_flag` | Aug 20 — the 7:30am/7:30pm correction | **Yes** — his flag, his words |

**The QA probe board, as measured in this pass**, against the review's own counts at `8a65a53`:

| Probe | Review @ `8a65a53` | This pass | What moved |
|---|---|---|---|
| `r2-access` | 1 FAIL | **0** | KD-29 |
| `r2-resolutions` | FAIL at §4 | **0** | KD-25 — §4 flips **through the dispatch path**, not by a hand call |
| `r2-data` | `geo_outlier` blocker on the copy | **0**, finding is `unanchored` | KD-23 |
| `r2-redact` | 7 leaks | **0** (3 printed, 2 distinct, both named non-credentials) | KD-27 |
| `r7-chain` | 3 FAIL | **2** | §3b, §7 and §10 all close (KD-31, KD-32). The two left are the probe's own hardcoded structural counts — *"three call sites route through it"* is now 5, and *"recorded: `ports.storage.delete` is NOT on the chain"* is a recording line that is now false. **Probe repair, not a defect.** |
| `r6-flush` | 3 FAIL | **2** | R6-2's *"autosave is still armed after the bound is spent"* closes. The remaining R6-1 line samples `status` **200 ms after** the abort, by which time the re-armed write has landed and §4.2 rule 6a″ says the banner clears. Measured directly: immediately after `closeTrip()` returns, `status='error'`, `lastError="Couldn't finish saving before switching. Your edit is still here."`. **Probe sampling point, not a defect** — `packages/client/test/switch.test.ts` asserts the rendered banner at the right moment. |
| `r3-undo` `r3-loss` `r4-switch` `r2-copy` `r3-merge` `r2-race` `r3-cas` `r4-epoch` | 0 FAIL | **0** | nothing regressed |
| `r3-pool` `r3-cas2` `r6-actor` `r2-constraints` `r5-freshness` | 3 / 3 / 5 / 2 / 4 | **3 / 3 / 5 / 2 / 4** | identical — all accepted Phase 1 residue |

**Driven in real Chromium over real elapsed time** (`npm run web:build && node tools/serve.mjs`,
then `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-views.mjs` — a new probe, **0 FAIL**,
zero page errors across five sessions):

- **Aug 8 reads `departs 14:30 · 1h 20m · arrives 15:50`** and Aug 18 reads `departs 05:30 ·
  40 min · arrives 06:10`. A `transfer` stop still renders the bare time. An `unknown` stop
  renders *"This time — is it when you arrive, or when this leaves?"* with two buttons, and
  one click dispatches `updateStop`, removes the control and re-renders the stop as a journey.
- **Copy a stop, press ⇩, open Optional: badge *from a friend* AND credit *From "Europe
  2026"*.** Open the stop editor on it: both again. Both were absent before this pass.
- **A write that cannot land renders `Not saved. <reason>` with Retry and Export this copy**,
  the indicator does not read "Saved", and the edit is still on screen. That is the banner the
  exhausted-flush exit now reuses.
- **Dismiss a `booking_vs_plan` blocker, move the stop back, move it away again** — the
  conflict returns **live**, with *"you dismissed this…"* in its detail. That is §2.7's own
  sentence, driven as a user.

## 5. Defects fixed, across both rounds of this re-delivery

| # | What | Where | Proof |
|---|---|---|---|
| F-1 | `save()` had no compare-and-set; two tabs destroyed each other's edits and the loser said "Saved" | `client/src/store/store.ts` | `store.test.ts` ×5, `merge.test.ts` ×14, `qa/browser5.mjs` |
| F-2 | `importDoc` checked the in-memory library, not storage | `client/src/store/store.ts` | `store.test.ts` ×3, `qa/client1.mjs`, `qa/browser4.mjs` |
| F-6 | a friend's trip arrived unbadged, keeping their `ownerId` | `core/src/build/copyStop.ts`, `client/src/store/store.ts` | `copyStop.test.ts` ×20, `serialize.test.ts`, real Chromium |
| F-3 | `npm run typecheck` failed on a clean clone | `package.json` | run from a scratch clone of `master` |
| F-7 | `updateStop` accepted `id`, `placement` and `provenance` at runtime | `core/src/build/stops.ts` | `build.test.ts` ×5 |
| F-8 | the `closed` rule could not fire — 0 of 95 places carry hours | rule **deleted** | KD-5 |
| F-9 | `conflict.test.ts:158` asserted `notDeepEqual([Y,X],[X])`, which passes on a list that merely grew | `core/test/conflict.test.ts` | two tests, one per direction |
| F-10 | a dismissed conflict returned still dismissed when the data reverted | `core/src/conflict/resolve.ts` `syncResolutions` | `conflict.test.ts` ×3 |
| F-11 | `createTrip` accepted `2026-13-45` and `2026-02-30` | `core/src/model/ids.ts` `isIsoDate` | `build.test.ts` ×3, `serialize.test.ts` |
| F-12 | `fromJSON` was reported to accept unknown enums and non-numeric coordinates | **it does not** | `serialize.test.ts` ×14 — see §6 |
| F-13 | `canView` returned `true` on an expired share when `now` was `undefined` or `''` | `core/src/access/predicates.ts` | `access.test.ts` ×27 |
| F-15 | `rollUpCost` called with no target, so a EUR trip said "No conversion rate for EUR" | `client/src/store/derived.ts`, `cli.ts` | `boundaries.test.ts` greps every call site — see §6 |
| F-16 | `cli export` could overwrite the live planner | `cli.ts` | `test/cli.test.ts` ×6 |
| F-17 | `accepted_without_timestamp` was checked for stops and not bookings | `core/src/validate/validateTrip.ts` | `copyStop.test.ts` |
| F-18 | `geo_outlier` put raw `lat`/`lng` into `Conflict.params` and into a committed golden | `core/src/conflict/rules/geoOutlier.ts` | `conflict.test.ts` greps for float pairs |
| F-19 | the built bundle embedded a door PIN, refs and live ticket URLs | `tools/redact.mjs` | `test/redact.test.ts` ×10, real Chromium |
| F-4/F-5 | `impossible_transfer` and `geo_outlier` crying wolf | §2.12 `travelRole`, §2.13 `geoCheck` | KD-1, KD-2 |
| M-6 | §3's dependency-direction test did not exist | `test/boundaries.test.ts` | mutation-checked — see §6 |
| M-1/M-2 | source comments cited a BUILD-NOTES section that did not exist | §1 above, `test/disclosure.test.ts` | `npm test` |
| **R2-1** ⚠️ **incomplete — see R3-1** | `save()` was `load` → compare → `save`: two awaits with an interleaving point, so two tabs saving at the same moment both passed the compare and the second write destroyed the first — **both** displaying "Saved". The compare was moved **inside** `StoragePort.saveIfRevision`, atomically, and a store no longer races itself. **That closed the concurrent race and nothing else.** The token was `Trip.revision`, which `undo()` rewinds, so the guard could re-issue a revision it had already spent on a refusal and readmit the tab it had refused. The row above claimed R2-1 closed; it was closed *for the case it was filed under*. The fence is now a separate opaque `StorageVersion` — R3-1. | `client/src/ports/types.ts`, `client/src/ports/memory.ts`, `client/src/store/store.ts`, `apps/web/src/ports/storage.ts` | `store.test.ts` ×3 new (concurrent tabs, self-overlap, port contract) — each **verified to fail against the pre-fix code**; `qa/r2-race.mjs` in real Chromium: **0 of 3 rounds lost an edit** (was 2 of 3) |
| **R2-2** | a stop returned to the pool from a day belonging to no city was filed under the transit pseudo-city, which is never in `trip.cities` and so was never a key the pool panel could show: the stop was in the document, in the count, and rendered by nothing. `returnToPool` now resolves to a real trip city when the day has one; the panel renders an always-visible catch-all group for the rest; `validateTrip` reports `pool_stop_unknown_city` for a key that is neither. | `core/src/build/pool.ts`, `core/src/model/ids.ts`, `core/src/validate/validateTrip.ts`, `client/src/selectors/index.ts`, `apps/web/src/views/Panels.tsx` | `build.test.ts` ×4, `store.test.ts` ×2; `qa/r2-poolloss.mjs` in real Chromium: **"the stop is reachable again"** (was "in NO Optional panel, under any group") |

| **R3-1** | `Trip.revision` was doing two incompatible jobs: content counter **and** write fence. `undo()` restores a snapshot verbatim, revision included, and autosaves it — so a revision the compare-and-set had already spent refusing another tab came back around, and the refused tab's next keystroke walked straight through the guard. Both tabs then read "Saved" over different documents, which is R2-1's symptom sentence verbatim. **Split, per §2.2a:** `Trip.revision` is unchanged and stays content; the fence is a new opaque `StorageVersion` minted by storage inside the atomic write step, held in the record's *envelope* beside the document and never inside it. `revisionOf()` is deleted — nothing above the port derives a version from parsed bytes. `undo`/`redo` cannot move it because the reducer never names it. `undo` does **not** synthesise `revision + 1`; §2.2a supersedes that. | `client/src/ports/types.ts`, `client/src/ports/memory.ts`, `client/src/store/store.ts`, `client/src/store/reducer.ts`, `apps/web/src/ports/storage.ts` | `storage-version.test.ts` ×17 — **red-green verified**: reverting the port to revision 2's scheme (`version = epoch.revision`) fails "undo cannot readmit a refused write" with `'idle' !== 'conflict'`, the exact defect. `qa/r3-undo.mjs` all probes ok; `qa/r3-browser.mjs` probe 1 in real Chromium: fence `…3268…ca.1 → …ca.3` while `Trip.revision` went `1 → 0` on Ctrl-Z, tab B still refused |
| **R3-4** | the same root defect from the other side: a per-document counter cannot tell "this document, unchanged" from "a different document that happens to sit on the same number" after a delete and recreate under the same id (the export → delete → restore path `importDoc` permits). Closed **by construction**, with no ABA-specific code: the counter is storage-wide and never rewinds on `delete()`, and ~~an `epoch` minted with `crypto.randomUUID()` and persisted with the database covers the same ABA one level up~~ — **that half was wrong and R4-2 is the bill: the epoch was cached in the port's closure, so a tab surviving the wipe minted against a dead one. Superseded by R4-2's fresh-CSPRNG-per-mint below; the ABA fix itself stands.** | `client/src/ports/memory.ts`, `apps/web/src/ports/storage.ts` | `storage-version.test.ts`: zero repeats over 200 writes across 3 ids interleaved with `delete()`; ABA at the *same* `Trip.revision` refused; export→delete→restore-under-the-same-id refused through the store. Red-green verified. `qa/r3-cas2.mjs` probes 1–3 ok |
| **R3-2** | a 400 ms debounced autosave was still pending when the active document was replaced, closed or deleted; `attemptSave` read `state.doc` at fire time, so trip A's write executed against trip B and the edit was gone with **nothing on screen**. One click, no second tab. §4.2 rule 6: all six document-changing transitions (`closeTrip`, `openTrip`, `createTrip`, `adoptTrip`, `importDoc`, `deleteTrip` — a closed list, asserted as a ceiling) now `await flushForTransition()` first; a refused (`'conflict'`) or failed (`'error'`) flush **aborts the transition** and the banner names both recoveries; `deleteTrip` of the *active* trip is the one exception and cancels the timer without writing. Belt and braces: a scheduled save captures its trip id and is **dropped, not retargeted**, if `state.doc` moved. Page exit registers `visibilitychange`→`hidden` + `pagehide` (deduped) → `flush()` and `beforeunload` → `preventDefault()` while dirty. | `client/src/store/store.ts`, `client/src/store/pageExit.ts` (new), `apps/web/src/App.tsx` | `switch.test.ts` ×22, `page-exit.test.ts` ×8 — **red-green verified**: removing the flush calls and the trip-id capture fails **19 of 22**. `qa/r3-loss.mjs` all 4 probes ok (including the real-timer one); `qa/r3-browser.mjs` probe 2 in real Chromium: the edit typed inside the debounce window survives clicking "Cairn" |

| **R4-1** | "is there an unwritten edit" was `doc.revision !== savedRevision` — a *content counter* being asked whether an edit would be lost. `undo()` restores a snapshot verbatim, revision included, so a fresh, **different** edit landing on a number an earlier edit already used made the store report "nothing to write"; `flushForTransition` skipped the write, the switch completed, and the screen read "Saved" over a document storage did not hold. One click, no second tab. **`persistence.savedRevision` is deleted** — not corrected, deleted — and `persistence.savedDoc: Trip \| null` replaces it, absorbing the store's module-level `baseDoc` so exactly one pointer answers both "is there an unwritten edit" and "what is the merge's common ancestor". `dirty()` is now `!!state.doc && state.doc !== state.persistence.savedDoc` — reference identity, exact because `Trip` is immutable. `savedDoc` is assigned only from a port result (the exact document a successful `saveIfVersion` carried, or `load()`'s) and the reducer never names it. `flushForTransition`'s skip now needs **all three** of `status === 'idle'`, no pending debounce timer, and `doc === savedDoc`; `flush()` stays unconditional. §2.2b F1/F2, §4.2 rules 4 and 6a′. | `client/src/store/reducer.ts`, `client/src/store/store.ts` | `dirty.test.ts` ×15 (new), incl. the **inconclusive-not-pass** precondition and the **200-step seeded walk** asserting `isDirty() === (toJSON(doc) !== the port's bytes)` at every step — **red-green verified**: restoring the revision comparison and the two-conjunct skip fails 8 of them, the walk failing at step 9 with "the dirty predicate and the bytes disagree". `qa/r4-switch.mjs` all probes ok (was FAIL); `qa/r4-browser.mjs` §1 in real Chromium: Ctrl-Z + one ↓ reorder + the brand button, and the reorder **is** in IndexedDB (`stop-57,stop-58…` → `stop-58,stop-57…`) |
| **R4-2** | the `StorageVersion` was `` `${epoch}.${n}` `` with `epoch` read once at open and **remembered in the port's closure**. A tab alive across a site-data clear (or §1.1's 7-day eviction) kept minting against a dead epoch while the counter had genuinely reset to zero, and reproduced a token it had already issued — verified in Chromium, byte for byte. The `epoch`, the storage-wide counter and the `meta` object store are **deleted** (`DB_VERSION` 2 → 3, which drops `meta`), and every mint is **16 bytes of fresh `crypto.getRandomValues`, base64url-encoded, derived from nothing**. Not `crypto.randomUUID`: it is secure-context-only and `undefined` over plain HTTP from a LAN address, which is exactly how `tools/serve.mjs` would be used from a phone. **No `Math.random()`/`Date.now()` fallback** — a fence fails closed and the store shows `'error'`. The one-time upcast stamps pre-fence records with the same mint. The in-memory port stays deterministic (`packages/client` may not touch ambient randomness): `` `${instance}.${n}` `` from a process-wide instance counter, with an injectable `mintVersion` as the only way to model a collision. §2.2a rules 2/5, §2.2b F3. | `apps/web/src/ports/storage.ts`, `client/src/ports/memory.ts` | `storage-version.test.ts` ×5 new: 100 construct/write/discard cycles with **zero duplicates in the pooled 200 tokens**; a token from one instance refused by another; no `StorageVersion` literal in any test, golden or fixture; no `Math.random`/`Date.now`/`randomUUID` on the fence path; F3's closure-state scan (`ready` is the only closure variable and `saveIfVersion` does not read it). **Red-green verified** against the true pre-fix port from `98ec06a`: 4 fail. `qa/r4-epoch.mjs` in real Chromium: `V=OSL3-…`, `deleteDatabase`, restore → `V2=ZE4W…`, `V2 !== V`, the pre-wipe token **refused**, storage still holds the restorer's document, tab B reads *"Not saved — edited elsewhere"* |
| **R4-3** | the same F2 violation in the derived cache: `cache.revision === trip.revision && cache.tripId === trip.id`, so undo-then-a-different-edit served the pre-undo document's legs, costs, clusters and conflicts. Through `store.syncResolutions()` that does not merely render — it **writes the document**, retiring resolutions against conflicts the current document does not have. The key is now `(document identity, today)`; `revision` leaves the cache entirely, `tripId` is subsumed (two trips cannot be the same object), and `today` closes a smaller pre-existing hole where date-sensitive conflict rules went stale across midnight. `DayMap.tsx`'s effect dependency array carried `derived?.revision` — a dependency array is `===` suppressing work — and now depends on the cache object, per §4.2 rule 3's "depend on the cache object, not on a number inside it". `apps/web/src/store.ts`'s `useDerived` read `state.doc?.revision`; it reads `state.doc`. | `client/src/store/derived.ts`, `apps/web/src/views/DayMap.tsx`, `apps/web/src/store.ts` | `derived-cache.test.ts` ×4 (new) — **red-green verified**: restoring the revision key fails 3 of 4, including the `syncResolutions` one, which retires a live resolution. Plus the 200-step walk's ceiling (`getDerived()` deep-equals `computeDerived(doc, today)` at **every** step) and a grep test asserting no dependency array or memo key in `apps/web/src` contains a revision |
| **R2-11** | §2.14's invariant — a credited record never reads as the user's own plan unless a **member** accepted it — was stated and enforced nowhere. `copyStopInto`'s `ctx.actorUserId` was already non-nullable in the type and unchecked at runtime, and R2-11 went straight through it. Enforced now at the two places documents come from: `acceptCandidate`, `rejectCandidate` and `copyStopInto` **throw** (`TypeError`, via a shared `requireActor`) on `null`, `undefined` or `''`, checked before anything is copied so the input trip is unchanged and `revision` has not moved; and a non-member actor on an attributed record is `validateTrip`'s new `accepted_by_non_member` (`level:'error'`, `params` carrying the actor and the owner), written membership-shaped (`members(trip)`, which degenerates to `{ownerId}` in Phase 1) rather than as `=== ownerId`. **`displayStatus` is untouched** and still returns `'own'` on a faulted record, deliberately: it is a pure function of one `Provenance`, cannot see the trip, and must not learn to. | `core/src/build/candidates.ts`, `core/src/build/copyStop.ts`, `core/src/validate/validateTrip.ts`, `core/src/model/types.ts`, `client/src/store/actions.ts` | `copyStop.test.ts` ×6 new: the throw over the full ref matrix (`day`/`stop`/`booking` × `null`/`undefined`/`''`) with the unchanged-trip ceiling after each; the injected fault producing **exactly one** additional issue with the right code/level/ref/params; **zero additional issues on the unmodified reference trip**; and a `source:'user'`/`actorUserId:null` record staying outside the rule. `qa/r2-copy.mjs` §B now reports ok instead of two FAILs |

| **R5-1** | `flushForTransition()` decided whether a transition could proceed by sampling `persistence.status` **after** awaiting its own `save()` — a fact about the write that had just finished, not about the document about to be abandoned. An edit dispatched while that write was in flight left `state.doc` on a new document, `savedDoc` correctly on the old one, and the status on `'idle'`; the transition proceeded, `state.doc` became `null` or another trip, and `attemptSave`'s early returns dropped the re-armed write. `isDirty()` then read `false` because there was no document left to be dirty about. Five of six transitions lost it. **The decision now re-asserts `dirty()` after every write and loops**, cancelling the re-armed timer on each pass, bounded by `FLUSH_MAX_ATTEMPTS = 5`. Exhausting the bound is treated as a **refused flush** (rule 6b): the transition aborts, the trip stays open, the edit stays in memory and `isDirty()` is `true` — nothing is discarded, and the click can simply be repeated once the typing stops. The realistic case settles in two writes. Not a timer fix: with `autosave:false` the same edit was lost and now lands. | `client/src/store/store.ts`, `client/src/index.ts` (exports `FLUSH_MAX_ATTEMPTS` so the bound is assertable) | `flush-race.test.ts` ×9 (new) — asserted on **stored bytes**, never on `isDirty()` alone: all five affected transitions, the `autosave:false` control, `deleteTrip(otherId)`'s by-construction safety, a genuinely refused flush still aborting, and the bound terminating in exactly `FLUSH_MAX_ATTEMPTS` writes and then succeeding once typing stops. **Red-green verified**: against the pre-fix decision, 7 of 9 fail, `closeTrip` with `['edit ONE','edit TWO']` where `['edit ONE','edit TWO','edit THREE']` was expected. `qa/r5-browser.mjs` in real Chromium: **5 of 5 delays now keep the edit** (was 5 of 5 losing it) |
| **R5-2** | `accepted_by_non_member`'s guard was `if (!actor \|\| memberIds.has(actor)) return`, which added an unstated fourth conjunct — *the actor must be truthy* — to §2.9's three, and exempted `null`, `undefined` and `''`. A credited, `state:'accepted'` record accepted by **nobody** validated clean and rendered as the user's own plan. The guard is now `if (actor !== null && memberIds.has(actor)) return` over a normalised actor (`typeof === 'string' && !== ''`), so only a **member** short-circuits; `params.actorUserId` carries `''` for the absent case (§2.1: `params` is `Record<string, string \| number>`, and a `null` must not leak through as a non-string), with a message that reads *"…is marked accepted, but records nobody as having accepted it."* rather than *"accepted by null"*. §2.14's stated null-actor exemption is scoped by **attribution**, not by nullness, and is untouched: `source:'user'` records stay outside the rule. | `core/src/validate/validateTrip.ts` | `copyStop.test.ts` ×3 new: all three missing-actor shapes flagged exactly once each with the right level/ref/params and a message naming no `null`; a real non-member still flagged and the **owner** still not; and the **ceiling** — zero additional issues on the unmodified Europe 2026 reference trip (it carries 156 accepted records and **zero** attributed ones, asserted rather than assumed), with a one-record injected fault on that same document producing exactly one issue so the ceiling is not vacuous. **Red-green verified**: restoring the falsy short-circuit fails 2 of 3 with *"actorUserId=null was not flagged (0 issues)"*. `qa/r5-freshness.mjs` §5.3–§5.5 now report `ok` |
| **R5-5** | `accept`/`reject` were on core's public export surface taking `UserId \| null` with no `requireActor` check — §2.14's gate with a public bypass, and R5-2's construction path. **Option (b): dropped from `index.ts`.** Nothing in `packages/client`, `apps/web`, `cli.ts` or the tests ever called them (verified by grep, not assumed), so `surface.test.ts`'s justification — *"used by the client for optimistic UI"* — was simply false and is deleted with the entries. Option (a) was rejected on layering: `requireActor` lives in `build/candidates.ts` and `provenance.ts` is `model/`, so routing the primitives through it would invert the dependency direction for a symbol with no caller. The checked wrappers `acceptCandidate`/`rejectCandidate` are unchanged and are now the only public way to accept. | `core/src/index.ts`, `core/test/surface.test.ts` | `surface.test.ts` — a new test asserting both names are absent from the runtime export list while the wrappers remain, plus the existing set-equality and gap-size tests, which fail on their own if either is re-exported without being re-justified. The §2.10 gap drops 62 → 60 |

| **R3-3** | `save()` chains (`saving = saving.catch(() => {}).then(…)`) and its comment states why — *"One store never races ITSELF"*. `mergeWithStored()` had **two bare `saving = (async () => …)()` assignments**, one per branch, which *replace* the chain instead of extending it. An autosave still unsettled when the user pressed "Merge and save" therefore ran **alongside** the merge's write, from one store: the merge landed correctly, the orphaned autosave was then refused against its now-stale expectation, and the banner read *"Not saved — edited elsewhere"* with `isDirty() === false` over a document that was fully and correctly saved — not clearing until the next edit. No data was lost; the indicator lied in the safe direction. **Fixed by extracting the chaining expression into `chainOntoSaving(work)`** and routing all three call sites (`save()` and both merge branches) through it. Chosen over inlining the expression a third time because it makes the invariant structural: `saving = run` now appears **once** in the file, so a future write path cannot opt out of the chain by writing an assignment, and `qa/r3-merge.mjs`'s static probe (which greps for `saving = (async`) is measuring something real rather than a convention. Everything else in both branches is byte-for-byte preserved — the deleted-trip branch's `writeAndSettle(doc, doc, null, null)`, the merge branch's expectation of `stored.version` rather than a recomputed one, and both branches' `catch` → `status:'error'`. | `client/src/store/store.ts` | `merge-race.test.ts` ×2 (new) — a storage port that both **parks** `saveIfVersion` and **counts how many writes are inside it at once**, because "one store never races itself" is a fact about concurrency at the port and cannot be read off the store's status enum. **Red-green verified, test written first**: against unmodified `store.ts` both fail with `2 !== 1` — *"two writes were inside the storage port at once, from ONE store"* — one per branch. Assertions are on **stored bytes** (`day1` is this tab's latest edit **and** `day2` is the other tab's, so neither is dropped by the overlap), then on `status === 'idle'` and `lastMerge`. `qa/r3-merge.mjs` 4 ok / 0 FAIL, unedited; `qa/r3-cas.mjs` probe A 3 ok |

**Not fixed, and named as not fixed:** F-14 / the §2.10 export surface — enumerated rather
than narrowed, KD-19. **And R2-4 through R2-21 of round 2, apart from R2-11 above** — only
the routed findings were touched. `qa/r2-access.mjs` (R2-6, a malformed `expiresAt` still
fails open) and `qa/r2-constraints.mjs` (R2-18) still report their findings, unchanged. So do
`qa/r3-cas2.mjs` probes 5–7, `qa/r3-merge.mjs`, `qa/r3-pool.mjs`, `qa/r2-copy2.mjs`,
`qa/r2-import.mjs`, `qa/r2-resolutions.mjs` and `qa/r2-browser.mjs`'s PoolPanel credit-line
probe — **all of them were captured before and after the round-4 pass and the two outputs are
byte-identical apart from `qa/r2-copy.mjs`'s R2-11 lines**, which is the finding that was
routed.

**And R3-3 and R3-5 … R3-9, which the round-3 persistence pass did not touch** — only R3-1,
R3-4 and R3-2 were routed. `qa/r3-merge.mjs` still FAILs its static probe (R3-3:
`mergeWithStored` assigns `saving` instead of chaining onto it) and `qa/r3-cas.mjs` probe A
says the same; both were run against `HEAD` *before* this pass and report identically, so the
pass neither fixed nor worsened them. `qa/r3-cas2.mjs` probes 5, 6 and 7 likewise still FAIL,
unchanged. §6's "not a compare-and-swap at the storage layer" bullet is struck: it has been
untrue since `a746d75`.

## 6. Not verified, and why

- **F-15's rendering is still unverified, though the call sites are not.** The fix is one
  argument, and it was applied to `derived.ts` and **missed in `cli.ts`** — where
  `npm run cli -- day 2026-08-13` on a EUR trip printed *"no rate table for: USD, EUR"* right
  through the clean-clone check at the end of this round. `boundaries.test.ts` now greps
  every `rollUpCost` call outside core for a `target:`, which is the guard that would have
  caught it. What is still not tested is the rendered string in `DayTimeline`: nothing in
  this repo renders React outside a browser. **Treat the React half of F-15 as
  fixed-by-inspection.** The lesson is the one this whole section exists for — a one-line fix
  applied to the place you were looking at is not a fixed defect.
- **F-12 disagrees with the review and I could not reconcile it.** The review reports
  `fromJSON` accepting `category:'nuclear'`, `source:'nsa'`, `kind:'telepathic'`,
  `lat:'33.9425'` and `lat:1e999`. I ran all five against `master` and all five are rejected
  with a `TripParseError` carrying a JSON path, and `oneOf`/`numOf` have been there since the
  first delivery. `serialize.test.ts` now pins fourteen such cases so the question cannot
  come back unanswered — but I do not know what the review ran, and "the finding does not
  reproduce" is a weaker statement than "the finding was wrong".
- ~~**The merge under a real IndexedDB race.** `store.save()` does `load` → compare → `save`
  with no transaction around it … this is **not** a compare-and-swap at the storage layer.~~
  **Struck — untrue since `a746d75`.** The compare, the write and (since the round-3 pass) the
  minting of the new `StorageVersion` all happen inside one IndexedDB `readwrite` transaction,
  and inside one synchronous block in the memory port. What replaces this bullet, honestly:
  - **Two tabs against one real IndexedDB is verified** — `qa/r2-race.mjs`, 0 of 3 rounds lost
    an edit; `qa/r2-tabs.mjs`; `qa/r3-browser.mjs`. What is *not* verified is more than two
    real tabs, or two tabs across two devices, which is Phase 2's `SyncPort`.
  - **A passively stale tab still reads "Saved".** A tab that has not written since storage
    moved holds an older document and its indicator says "Saved", because nothing notifies it.
    No edit is at risk — its next write is refused — but the ROADMAP ceiling "no moment at
    which two stores both render Saved while holding different documents" is only true of
    stores that have *written*. `storage-version.test.ts` asserts it in that form and says so
    in a comment. Closing it properly needs cross-tab notification, which Phase 1 has not got.
  - **A trip switch now blocks on the in-flight write** (§4.2 rule 6a). In the app that write
    always completes, but there is **no spinner or disabled state** while it does — the button
    just takes as long as the write takes. Not a defect against the spec; worth a UI pass.
- **The page-exit guarantee is deliberately weaker than it sounds.** `visibilitychange`→
  `hidden` and `pagehide` call `store.flush()`, and `beforeunload` calls `preventDefault()`
  while dirty. **An unload handler cannot await an asynchronous IndexedDB write**, and
  `pagehide`/`beforeunload`/`unload` are unreliable on mobile. Nothing here claims an edit
  survives an arbitrary tab close, and `page-exit.test.ts` deliberately does not assert it.
  The listener registration and the flush call are tested with fake targets in plain Node; the
  Chromium leg (hide the tab, find the edit in IndexedDB) is **not run** — `qa/r3-browser.mjs`
  covers the in-app `closeTrip` case instead, which is the one with a real guarantee.
- **Map tiles.** This sandbox has no route to `tile.openstreetmap.org`; every tile request
  fails with `ERR_TUNNEL_CONNECTION_FAILED`. Leaflet mounts, pins and the polyline render and
  bounds are applied — nobody has seen a tile behind them.
- **Safari and iOS.** Everything was driven in Chromium. The storage-eviction and
  installed-web-app behaviour in §1.1 is unverified on a device.
- **Real IndexedDB under quota exhaustion.** Covered through the in-memory port's `failAll`;
  not provoked against a real browser quota.

**Added by the round-4 freshness pass:**

- **Browser-initiated eviction is still not reproducible here.** `qa/r4-epoch.mjs` fires
  `indexedDB.deleteDatabase('cairn')`, which is the same mechanism §1.1's 7-day eviction uses,
  with a trigger we can pull. Chromium cannot be made to evict on demand, and the criterion
  says so rather than pretending. What is verified is the whole sequence with `deleteDatabase`
  as the trigger.
- **The `meta` object store's deletion is verified on a database that had one.**
  `qa/r4-epoch.mjs` boots against whatever the profile holds and asserts `meta` is absent
  after the upgrade. A profile carrying a *populated* revision-2 `meta` (Jacob's actual
  browser) was not available to test against; the upgrade path is `deleteObjectStore` inside
  `onupgradeneeded`, which is not conditional on the contents.
- **`crypto.getRandomValues` over plain HTTP was reasoned about, not measured.** The design's
  claim — `randomUUID` is secure-context-only, `getRandomValues` is not — is what drove the
  choice, and `qa/r4-epoch.mjs` runs over `http://localhost:4173`, which browsers treat as a
  *secure* context. **The case that matters (`http://<LAN-ip>:4173` from a phone) was not
  run.** If the claim is wrong, the fence throws and the store shows `'error'` — it fails
  closed, which is the deliberate design — but it would fail closed *on every write*.
- ~~**`qa/r2-browser.mjs` still FAILs its PoolPanel credit-line probe** (§2.14 rule 7: the
  pool item renders the badge but not `attribution`). Pre-existing, unrouted, untouched by
  this pass, and unchanged before and after it.~~ **CLOSED by KD-26** in the SEND-BACK pass:
  `PoolPanel` and `StopEditor` both render the credit now, the shared `creditLabel` is the one
  implementation, and `test/views.test.ts` holds the whole class as a grep-shaped ceiling
  rather than four hand checks. Verified in Chromium — `qa/r8-views.mjs` §2.
- **`copyStopInto` from a genuinely foreign trip.** Exercised over two local trips, which is
  the Phase 1 path, and over a hand-built `ownerId:'user:marta'` document in
  `copyStop.test.ts`. There is no server and no second user, so nobody has copied a stop
  across an account boundary.
- **`node --test` on Node 24.** ROADMAP specifies Node 24; this environment is Node 22.22.2,
  where type stripping is already unflagged and all 231 tests run. `engines` says `>=22.18`.
- **The boundary and disclosure tests were mutation-checked**, which is the only reason I
  trust tests that passed the first time they ran: adding `node:fs`, `@cairn/tokens` and an
  `apps/web` import to `core/src/derive/geo.ts` produced all three expected violations, and
  the file was restored.

## 7. The read-only boundary

`europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root are the live app on
Jacob's phone. Cairn reads them and never writes them.

**This was violated once during this round, by my own test, and it is worth recording.**
Writing `test/cli.test.ts` before the F-16 guard existed meant the first run of that test
executed `cli export ../europe-2026-itinerary.html` — and overwrote the live planner with
JSON. It was restored from git within the minute and the final tree is byte-identical, but
"the test ran before the fix" is exactly how a read-only boundary gets crossed by someone
who is trying to protect it. The test now snapshots the file, restores it if it changed, and
*then* fails loudly — so a future regression is noisy rather than expensive.

---

## 8. Objections to the design — non-blocking

### SEND-BACK pass — three objections, none blocking, all implemented as specified anyway

- **§2.10's 69 does not include the arithmetic §2.12's own consumer row needs.** The day view
  is specified to render *"arrives 15:50"*, and computing it needs `HH:MM + minutes`. Core has
  that (`timeVal`), and revision 5 took it off the surface in the same document that asked for
  the render. The result is four lines of clock parsing in `packages/client` — a second
  implementation of something, which is what sequencing rule 1 is about. **KD-24** carries the
  detail and the one-import fix if the architect would rather put `timeVal` back on the list.
  I did not widen §2.10, because widening it is a documentation change and not mine to make.
- **§6.6's derived credential rule cannot be made exception-free against a real bundle, and
  the section does not say what to do about that.** The rule catches everything the redactor
  removes, which on Jacob's own prose includes the English word `OPTIONAL` — and `OPTIONAL`
  is also a property name of the importer's public input type, so it is in the bundle for a
  reason that has nothing to do with him. **KD-27** ships the rule with two named, asserted,
  live-checked exceptions. The alternative — a second pattern class that can tell an English
  word from a booking reference — is the thing KD-17 already decided against.
- **`getDerived()` now writes.** §2.7 says `syncResolutions` is called "whenever the client
  recomputes the derived conflict set", and §2.2b F2 says it must not run against a stale one;
  together those put the call inside `getDerived`, which makes a read into something that can
  change the document, schedule a save, and notify subscribers. It converges in one pass and
  it is what the two sections jointly ask for, but a reader who expects `getDerived()` to be
  a pure read will be surprised, and one existing ROADMAP-F test had to be rebuilt around it
  (**KD-25**). If the architect would rather the call sat on `dispatch`/`undo`/`redo` instead,
  that is a smaller surprise for a slightly weaker guarantee, and it is a one-line move.

- **`TripSummaryRow` has no timestamp.** The library cannot say "last edited" and sorts by
  start date. §2.10 is explicit about the export surface so I did not add one, but a trip
  list without "recently opened" will feel wrong past a handful of trips.
- **`cities: ['transit']` is a pseudo-city in the data.** The view copes, but the import
  arguably ought to materialise a real `transit` city from `CITY_META` — the live planner has
  one, with a name and a flag. That changes golden files, so it is an architect call.
- **`PersistenceState.status` has no `'conflict'`.** ~~A refused stale write is reported as
  `'error'`~~ — **stale, resolved in revision 3: `'conflict'` exists and is what a refusal
  sets.**

### Round 4 — two readings I had to choose between, both flagged rather than settled

Neither blocked the work and neither is a redesign, but both are places where the design
admits two readings and I picked one. If the breaker disagrees with either, the disagreement
is with a sentence in ARCHITECTURE, not with the code.

- **`accepted_by_non_member` fires on a *set* actor who is not a member; a `null` actor on an
  attributed, accepted record does not fire it.** §2.9 says "whose `provenance.actorUserId`
  is not a member of the trip", and `null ∉ members(trip)`, so a literal reading would fire.
  §2.14 reads the other way: the null-actor half is what the **throw** at the call site is
  for, and `accepted_by_non_member` is described as "a **wrong** (non-member) actor". I took
  the second reading — the issue's `params` carries "both the actor and the owner", and there
  is no actor to carry when it is `null`. Consequence if it is wrong: a hand-edited or
  Phase 2-synced document with `{source:'friend', state:'accepted', actorUserId:null}` passes
  validation. It cannot be produced by any call in this codebase.
- **The rule is scoped to records with a non-null `attribution()`, not to
  `source !== 'user'`.** §2.9 states the scope as "a record with a non-null `attribution()`"
  and gives the reason ("that is exactly §2.14's subject — the credited copy"), so that is
  what is implemented. The practical difference: a `source:'system'` suggestion accepted by a
  non-member is **not** flagged. That follows from the design as written; it is worth an
  architect's eye anyway, because "a stranger accepted our suggestion on your behalf" is the
  same category of claim.

## 9. Why two tsconfigs

`tsconfig.json` covers core, client, the tests, `test/` and the CLI, and is deliberately
strict Node ESM (`module: NodeNext`, `erasableSyntaxOnly`, `verbatimModuleSyntax`) — that is
what lets `node --test` run the `.ts` files with no build step. `apps/web/tsconfig.json`
extends it and switches to bundler resolution with JSX. Merging them would mean weakening
the first to accommodate the second. `npm run typecheck` runs both.
