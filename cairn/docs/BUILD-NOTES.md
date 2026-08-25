# Cairn — build notes, Phase 1

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

---

## 2. How to run it

```bash
cd cairn
npm install
npm test          # 231 tests. Plain node, no browser, no network.
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

---

## 3. What actually runs

| Piece | State |
|---|---|
| `packages/core` | Model, build, derive (incl. **`geoCheck`**), conflict (**10 rules** — `closed` deleted), validate, access, serialize, legacy import, merge, **`copyStopInto`**. |
| `packages/client` | Store, reducer, ports, selectors, derived cache, revision guard (refuse + explicit merge), **browse-another-trip**, `syncResolutions`. |
| `packages/tokens` | Colours, category labels, mode icons, status badges. **No test of its own.** |
| `apps/web` | Library, day view, day map, conflicts, validation, pool, places, export, **restore-from-backup**, **Browse & copy** with the credit line. |
| `cli.ts` | Complete. Export is path-guarded. |
| `tools/extract-legacy.mjs` | Reads the live planner READ-ONLY. |
| `tools/gen-sample.mjs` | Builds the web app's sample trip at build time, **through `redactForSample`**, and fails the build if a credential survives. Output is gitignored. KD-14, KD-17, KD-18. |
| `tools/redact.mjs` | The §6.6 pattern array and `redactForSample`. Never imported by `packages/core`. |
| `tools/serve.mjs` | Zero-dependency static server for `apps/web/dist`. |
| `tools/doc-section` | Prints one section of a docs file. |

---

## 4. Verified, by running it

Every number below was produced by a command in this repo on this delivery, from a clean
`git clone`. Where a number is misleading, the caveat is **next to the number**, not in a
footnote.

| What | Number | Command | Caveat |
|---|---|---|---|
| Tests | **231 pass, 0 fail** | `npm test` | Was 69 at the first delivery. |
| Typecheck | clean, both projects | `npm run typecheck` | From a **clean clone**, in the documented order. Previously failed (F-3). |
| Web build | clean | `npm run web:build` | The bundle now carries **none** of the five known strings — asserted, including `.js.map`. See KD-18. |
| Import | 16 days · 112 scheduled stops · 31 pooled · 95 places · 21 bookings | `npm run cli -- import`, `-- trip` | Unchanged since the first delivery. |
| Tickets | **7 ticketed stops: 3 bundled over 2 files, 4 url** | ticket census through `importLegacyDays` | ROADMAP now says 3/2 too; revision 1 said "2 bundled" and this report repeated it — **KD-4**. |
| `travelRole` | **21 journey · 81 transfer · 10 unknown** of 112 | `import.test.ts` | Every `unknown` is a vehicle mode on a non-transit category, asserted individually, not just counted. |
| Blockers | **2** | `npm run cli -- conflicts` | Was 12, of which 3 were actionable. Both remaining are Jacob's own `legacy_flag` days, and the golden carries one line per blocker saying why he must act — a third cannot appear without someone writing that line. |
| `impossible_transfer` | **0 blockers, 0 warnings** | `conflict.test.ts` | Was 4. All four were departure-time artifacts — **including Aug 18**, which four reports called the one real defect. KD-1. Tightest remaining transfer margin: **7 min**, asserted. |
| `geoCheck` clean run | **0 findings** — 0/112 stops, 0/94 places | `geoCheck.test.ts` | Was 6 false blockers + 20 validation warnings across two implementations. |
| `geoCheck` injected fault | **112/112 stops, 92/94 places** caught at +1° latitude | `geoCheck.test.ts` | The two misses are `Blue Cave, Biševo` and `Stiniva Cove, Vis`, named in §2.13 and named in the test, so a third fails the run. |
| Fisherman's Bastion typo | **1 blocker, `place-68`, 109 km** | `geoCheck.test.ts` | Revision 1: 27 conflicts before the typo, 27 after. This is the criterion that would have caught the old rule. |
| Validation | **1 error, 10 warnings** | `npm run cli -- validate` | Was 1 and 30; 20 of those 30 were `stop_far_from_city`, which is deleted. |
| Leg parity | **16 of 16 days** exact | `derive.test.ts` | Against the live page's own `legBetween`, run in a `node:vm`. Mode and minutes exact, km within 1e-6. Byte-identical before and after `travelRole` — `npm run golden` produces no diff. |
| Day-cost parity | **6 of 16 exact, 10 divergent** | `derive.test.ts` | ROADMAP now says 6/16 too. Each of the ten is classified AND the classification is proved against the data — **KD-3**. |
| Export surface | **112 runtime symbols against §2.10's 50** | `surface.test.ts` | **Enumerated, not narrowed — KD-19.** Every extra symbol is listed with the caller that needs it. This criterion is partially met and is reported as partially met. |
| Redaction | 6/6 known leaks gone; every pattern exercised; 6 prose strings survive | `test/redact.test.ts` | `importLegacyDays` output is unchanged, so cost and leg parity are untouched — asserted. KD-17, KD-18. |
| Read-only boundary | 0 modified tracked files | full run then `git status --porcelain` | See §7. |

**The 2 blockers, line by line.** Revision 1's table needed twelve rows and nine of them
said "no". This is the whole table now:

| # | Rule | Subject | Act on it? |
|---|---|---|---|
| 1 | `legacy_flag` | Aug 18 — Jacob's own rebuild note | **Yes** — his flag, his words |
| 2 | `legacy_flag` | Aug 20 — the 7:30am/7:30pm correction | **Yes** — his flag, his words |

**Driven in real Chromium, over CDP with real elapsed time** (not `--virtual-time-budget`,
which stalls the app at "Opening your trips…" because virtual time does not advance while
IndexedDB is pending): the sample loads and still reads properly after redaction; a second
trip is created; "Browse & copy" lists the other trip's 112 stops read-only without
switching the active trip; copying one produces a stop that is badged *from a friend*,
carries a credit line, and **still carries both after a reload out of IndexedDB**; the
served bundle contains none of the five known strings; and restoring a document owned by
`user:marta` is refused with *"This trip belongs to someone else"* and does not enter the
library.

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

**Not fixed, and named as not fixed:** F-14 / the §2.10 export surface — enumerated rather
than narrowed, KD-19.

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
- **The merge under a real IndexedDB race.** `store.save()` does `load` → compare → `save`
  with no transaction around it, because `StoragePort` has none. Two tabs writing inside one
  event-loop turn can still interleave. The window is far smaller and the guard catches the
  case Jacob will hit, but this is **not** a compare-and-swap at the storage layer and should
  not be described as one. Phase 2's `SyncPort` is where that belongs.
- **Map tiles.** This sandbox has no route to `tile.openstreetmap.org`; every tile request
  fails with `ERR_TUNNEL_CONNECTION_FAILED`. Leaflet mounts, pins and the polyline render and
  bounds are applied — nobody has seen a tile behind them.
- **Safari and iOS.** Everything was driven in Chromium. The storage-eviction and
  installed-web-app behaviour in §1.1 is unverified on a device.
- **Real IndexedDB under quota exhaustion.** Covered through the in-memory port's `failAll`;
  not provoked against a real browser quota.
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

- **`TripSummaryRow` has no timestamp.** The library cannot say "last edited" and sorts by
  start date. §2.10 is explicit about the export surface so I did not add one, but a trip
  list without "recently opened" will feel wrong past a handful of trips.
- **`cities: ['transit']` is a pseudo-city in the data.** The view copes, but the import
  arguably ought to materialise a real `transit` city from `CITY_META` — the live planner has
  one, with a name and a flag. That changes golden files, so it is an architect call.
- **`PersistenceState.status` has no `'conflict'`.** A refused stale write is reported as
  `'error'` with an explanatory `lastError`, which is in-contract but conflates "storage is
  broken" with "someone else edited this". If §4.2 gains a fourth status, this is the case
  for it.

## 9. Why two tsconfigs

`tsconfig.json` covers core, client, the tests, `test/` and the CLI, and is deliberately
strict Node ESM (`module: NodeNext`, `erasableSyntaxOnly`, `verbatimModuleSyntax`) — that is
what lets `node --test` run the `.ts` files with no build step. `apps/web/tsconfig.json`
extends it and switches to bundler resolution with JSX. Merging them would mean weakening
the first to accommodate the second. `npm run typecheck` runs both.
