# Cairn — QA findings, Phase 1

Tester: breaker. Run date 2026-08-25, against `master` @ `ae5cabe`.
Environment: Node v22.22.2, Chromium via Playwright (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`),
real elapsed time — **not** `--virtual-time-budget`, which hangs the app at "Opening your
trips…" because virtual time does not advance while IndexedDB work is pending. That is an
environment trap, not a defect, and is not logged as one.

All work was done from a **clean `git clone`** into a scratch directory, plus a live browser
against `npm run web:build && npm run serve`. Every finding below was reproduced by running
something. Nothing is labelled UNVERIFIED.

**Result: 2 BLOCKERS, 8 MAJOR, 11 MINOR.**

---

## Part 1 — the builder's claims, re-verified

Every number in `BUILD-NOTES.md` was re-derived independently (my own harness, not the
builder's tests). Summary: **the numbers are true. The conclusions drawn from some of them
are not.**

| Claim | Verdict | Evidence |
|---|---|---|
| 69 tests pass | **TRUE** | clean clone, `npm test` → `# pass 69 # fail 0` |
| both tsconfig projects typecheck clean | **TRUE, but not from a clean clone** | see F-3 |
| `web:build` clean | **TRUE** | exit 0, 561 kB bundle |
| 16 days / 112 scheduled / 31 pooled / 95 places / 21 bookings | **TRUE** | re-counted off `importLegacyDays` directly |
| pool split 8/3/3/8/6/3, places split 15/12/15/25/21/7 | **TRUE** | re-counted |
| six `CITY_RANGE` strings reproduced | **TRUE** | all six `ok:true` |
| 5 multi-city days, exactly the five named | **TRUE** | re-counted |
| 3 candidate days, 21 suggested stops, 7 tickets (2 bundled), 81 arrivals, 49 costed | **TRUE** | re-counted |
| 12 blockers / 4 warnings / 11 notes | **TRUE as a count, misleading as a result** | see F-4: 9 of the 12 blockers are false positives the builder knew about |
| validation 1 error / 30 warnings | **TRUE** | the one error is `place-92` Windsor Great Park, no coordinates |
| `toJSON(fromJSON(toJSON))` byte-identical | **TRUE** | also byte-identical with emoji/RTL/NUL/5000-char names |
| conflict ids stable across a no-op re-import | **TRUE** | verified with a genuine second `loadEurope2026()`, not just a second `detectConflicts` call |
| conflict ids **change** when the Aug 18 flight time is edited | **FALSE** | see F-9 |
| nothing un-accepted and non-user returns `displayStatus() === 'own'` | **TRUE for the 36-cell provenance matrix**; **but reachable through `updateStop`** | see F-7 |
| drove `apps/web` in real Chromium, 17 steps | **TRUE** — I drove it myself and it works | all 16 days reachable, timeline/legs/costs/badges render, map mounts with pins + polyline, save indicator reaches "Saved", edits survive reload |
| Aug 8 map opens on a 19.5 km Vienna cluster, not the 621 km span | **TRUE, exactly** | whole-day raw span 621.0 km; focus span 19.5 km; centre 48.196, 16.400; 7 of 7 focus pins inside the viewport in the browser |

### The two things I was specifically asked to check

**1a. Clean-clone command order.** Confirmed broken — F-3.

**1b. Were the goldens derived from the live planner, or from the code they check?**
**Genuinely from the live planner.** `tools/gen-golden.mjs` slices `haversine`, `legBetween`,
`dayCost`, `clusterStops`, `focusCluster` out of the page's own `<script>` text and runs them
in a `node:vm` context seeded with nothing but the page's own `DAYS`/`CITY_PLACES`/`OPTIONAL`.
`packages/core` is not in scope for any `legacy-*.json`. I regenerated all eight goldens from
scratch in the clean clone: **byte-identical to the committed files** (`git status` clean).
The `core-*.json` files *are* snapshots of the implementation, and `gen-golden.mjs` says so in
its header — which is why F-4 matters: "12 blockers" is a self-snapshot, not a result.

**2. The read-only boundary.** Clean. `npm install && npm test && cli trip/conflicts/validate/export
&& npm run golden && npm run web:build` leaves all 17 root files **byte-identical** (sha256 of
every file outside `cairn/`, before and after). `extract-legacy.mjs` and `gen-sample.mjs` do a
single `readFileSync` of the planner and never open it for writing. No copy of `DAYS` is
committed — `git ls-files` shows only `europe2026.sha256`, `europe2026.bookings.json` and eight
goldens (120 KB of derived output). Drift detection works: appending one comment line to the
planner in the clean clone made exactly one test fail, with the right message
(`europe-2026-itinerary.html changed — re-baseline`). One gap: F-16.

**3. The provenance rule.** Two real holes, F-6 and F-7.

---

## BLOCKER

### F-1 — Two browser tabs on the same trip: one tab's edits are silently destroyed
**Severity: BLOCKER (data loss). Routing: builder (implementation), with an architect note.**

**Reproduce** (`cairn/qa/browser5.mjs`, run against `npm run serve`):
1. Tab A: open the app, *Load Europe 2026*, go to 08-13, edit a stop's name to `TAB A EDIT`, wait for "Saved".
2. Tab B: open the app in a second tab, open the same trip from the library.
3. Tab B: go to 08-19, edit a stop's name to `TAB B EDIT`, wait for "Saved".
4. Read IndexedDB `cairn.docs['trip-europe-2026']`.

**Observed:** the stored document contains `TAB B EDIT` and **not** `TAB A EDIT`. Tab A's save
indicator still reads **"Saved"**. Reloading tab A shows the edit is gone.

**Expected:** either the second save is refused with a visible conflict, or the two edits merge.
At minimum the losing tab must not claim "Saved".

**Root cause:** `store.save()` (`packages/client/src/store/store.ts:82`) writes the *whole*
document (`ports.storage.save(doc.id, core.toJSON(doc), summary)`) with no compare-and-set
against the stored revision. The store already tracks `persistence.savedRevision`, so the guard
material exists and is unused. `ARCHITECTURE.md` §2.2 promises "last-writer-wins per stop with
a revision guard" — Phase 1 has neither the per-stop granularity nor the guard, and the roadmap
does not list this as stubbable.

---

### F-2 — `importDoc`'s "never overwrites" guard reads the wrong source of truth, and destroys a stored trip
**Severity: BLOCKER (data loss). Routing: builder (implementation).**

`store.importDoc` says in its own doc comment: *"A fresh id is minted when the incoming id
already exists, so an import never overwrites an existing trip."* It checks
`state.library` — an in-memory snapshot taken at boot — not storage.

**Reproduce, no devtools, two tabs** (`cairn/qa/browser4.mjs`):
1. Open tab B first, on an empty library. Leave it sitting there.
2. In tab A: *Load Europe 2026*, edit a stop to `JACOBS REAL PLAN — do not lose this`, wait for "Saved". Confirm it is in IndexedDB.
3. In tab B (library snapshot still empty): *Import JSON* → any earlier export of that trip.

**Observed:** doc keys in IndexedDB are still `["trip-europe-2026"]` — no new id was minted —
and `JACOBS REAL PLAN` is gone. Tab A after reload shows the pre-edit trip. No warning, no
error banner; the app says "Saved".

**Expected:** the import either mints a fresh id (as documented) or refuses with a visible
prompt. It must never silently replace a stored trip.

Also reproduced headless in Node (`cairn/qa/client1.mjs`, last block) with two stores over
one `memoryStorage`, so the defect is in `packages/client`, not in the React layer.

**Root cause:** `packages/client/src/store/store.ts` — `if (state.library.some(r => r.id === doc.id))`.
The check must be against `ports.storage.load(doc.id)`.

---

## MAJOR

### F-3 — `npm run typecheck` fails from a clean clone in the documented order
**Severity: MAJOR. Routing: builder.**

**Reproduce:**
```
git clone <repo> clean && cd clean/cairn
npm install
npm test          # 69 pass
npm run typecheck # exit 2
```
**Observed:** `apps/web/src/sample.ts(8,17): error TS2307: Cannot find module './sample/europe2026.json'`.
It passes only after `npm run web:build` (or `npm --prefix apps/web run presample`) has
generated the gitignored `apps/web/src/sample/europe2026.json`.

**Expected:** BUILD-NOTES' documented command sequence works on a fresh checkout. This is the
single most likely first thing anyone does with the repo, and it fails.

**Fix belongs to the builder:** make `typecheck` depend on `presample`, or a `prepare` script,
or commit a `.d.ts` shim for the generated module.

---

### F-4 — 9 of the 12 "blocker" conflicts on the reference trip are false positives, and BUILD-NOTES does not say so
**Severity: MAJOR. Routing: architect (rule specifications), builder (disclosure).**

**Reproduce:** `npm run cli -- conflicts`, or `cairn/qa/probe1.mjs`.

The 12 blockers are 6 × `geo_outlier` + 4 × `impossible_transfer` + 2 × `legacy_flag`.

`geo_outlier` — **all six are wrong**:
| Stop | Why it is not a defect |
|---|---|
| Buy the Visovac boat excursion (08-14, 51 km) | Krka day trip from Split; `cat:'trip'` → already flagged `daytrip` |
| Roški Slap (08-14, 48 km) | same |
| Arrive Skradin (08-14, 54 km) | same |
| Morning with your girlfriend's family (08-15, 746 km from Prague) | 08-15 is `cities:["split","prague"]`, `primaryCity:"prague"`. The stop is in Split, which is on the day. |
| Gellért Hill at sunrise (08-21, 1482 km from London) | 08-21 is `cities:["budapest","london"]` |
| Frankfurt (FRA) — connect (08-08, 603 km from Vienna) | a real connection on the inbound long-haul |

`impossible_transfer` — three of four are wrong (Aug 7 Condor, Aug 12 FlixBus, Aug 22 Virgin).
Only the Aug 18 `05:00 checkout → 05:30 airport bus` case is real. See **F-4a**, which is the
full adjudication: three is the count *today*, and it is not the interesting number.

**Observed:** a conflicts panel whose highest severity is 75 % noise. The two genuinely
hand-flagged days (Aug 18, Aug 20) are buried among nine cries of wolf.

**Expected:** blockers are things Jacob must act on.

**The aggravating factor is disclosure.** `geoOutlier.ts:10` and `impossibleTransfer.ts:8` both
say *"See BUILD-NOTES for the objection"*. `BUILD-NOTES.md` contains **no mention** of either —
its "Objections to the design" section lists only `TripSummaryRow` timestamps and the `transit`
pseudo-city. Six source files under `packages/core/src` point at BUILD-NOTES for context it
does not carry. The builder found these and then reported "12 blockers" as an achievement.

**Architect decisions needed:** (a) should `geo_outlier` measure against the *nearest* of
`day.cities` rather than `primaryCity` — the builder's own suggested fix, in the file; (b)
should a `daytrip`-flagged stop be exempt; (c) F-4a.

---

### F-4a — `impossible_transfer` on vehicle stops: the model cannot say "this time is a departure"
**Severity: MAJOR. Routing: ARCHITECT — this is a design defect, not an implementation defect.**

Raised by the coordinator; this is the adjudication, with the counts run rather than reasoned.
**Reproduce:** `cairn/qa/vehicles.mjs`.

**The builder's account is accurate and its judgement was correct.** `impossibleTransfer.ts:8`
documents the artifact before anyone found it, names three cases, and says it implemented
§2.7 as written rather than silently patching it. That is the right call and nothing here
contradicts it. What follows is the part the builder correctly declined to decide.

**Q1 — is three the true count?** Three is the count *today*. It is three out of **31**, and
the silence of the other 28 is arithmetic luck, not correctness.

```
vehicle-journey stops in the trip (arrival.mode in flight|bus|train|boat|speedboat) : 31
  currently firing                                                                  :  4
    of which the departure-time artifact                                            :  3
    of which a real transfer defect (Aug 18, 05:00 checkout -> 05:30 bus, 40 min)   :  1
  silent because they are the day's first stop                                      :  2
  silent ONLY because the printed clock gap happens to exceed the journey time      : 25
```

The rule is not "correct except for three known cases". It is **semantically wrong on all 31**
— every one of them compares a vehicle's whole journey against the gap between two departure
times — and quiet on 25 of them by coincidence. How thin the coincidence is:

| Day | Stop | Journey | Gap | Margin before it fires |
|---|---|---|---|---|
| 08-13 | Blue Cave, Biševo | speedboat 105 min | 105 min | **1 min** |
| 08-14 | Boat to Skradinski Buk | boat 20 min | 20 min | **1 min** |
| 08-08 | Condor DE4345 → Vienna | flight 80 min | 90 min | 11 min |
| 08-21 | British Airways BA863 → Heathrow | flight 165 min | 175 min | 11 min |
| 08-12 | Kasjuni Beach — swim | bus 30 min | 60 min | 31 min |
| 08-10 | Ryanair VIE → DBV | flight 80 min | 115 min | 36 min |

Nudging any previous stop later by those margins — an ordinary edit, and exactly what the
planner is for — converts a silent stop into a **blocker**. Six of the seven flights in the
trip are within 51 minutes of firing. So the honest statement is not "three artifacts": it is
*"`impossible_transfer` produces a blocker for any vehicle stop whose predecessor sits closer
to it than the vehicle's journey time, which is a property of the display, not of the plan."*

**Q2 — does "12 blockers" overstate the real conflicts?** Yes, by **nine**, not three.
12 = 2 `legacy_flag` + 4 `impossible_transfer` + 6 `geo_outlier`. Real: the two hand-flagged
days and the one genuine Aug 18 transfer. **3 of 12 blockers are actionable; 9 are noise.**
The `impossible_transfer` share is also unstable — a single time edit can add more without
anything in the plan getting worse. Agreed that this is a product defect even though the code
matches the spec: `BRIEF.md` makes conflicts a first-class entity precisely so Jacob acts on
them, and a panel that flags every long-haul flight trains him to ignore the panel. That is
the failure this rule was written to prevent, arrived at from the other direction.

**Q3 — routing. Agreed: DESIGN defect, architect.** Stated plainly, because the distinction is
the fix:

> The model has no way to express that a stop's `time` is a **departure** and its `arrival`
> override describes **the vehicle's own journey**, not the transfer into the stop.
> `ARCHITECTURE.md` §2.5 defines `arrival` as "the leg *into* this stop" and §2.11 deliberately
> maps legacy `move` onto it — but the legacy `move` field carries both meanings, and so
> therefore does `Stop.arrival`. Every rule that reasons about time inherits the ambiguity.
> The correct fix is a field in the model that the rules consume. It is not a special case in
> `impossibleTransfer.ts`, and it is not a tolerance constant.

Two constraints on whatever the architect chooses:

1. **It must be additive.** `computeLegs` is a contracted byte-exact port of `legBetween`
   (§2.5, "do not improve it") and is checked against `fixtures/golden/legacy-legs.json`, which
   is generated from the live page's own functions. Any change to how `arrival` feeds the leg
   calculation breaks golden parity on all 16 days. The new field must be read by the conflict
   rules only.
2. **The importer has to be able to derive it.** 31 of the 81 legacy `move` overrides are
   vehicle journeys. `s.cat === 'transit'` plus a vehicle `move.mode` covers most of them, but
   not all — Aug 13's speedboat hops are `cat:'trip'`, and Aug 10's "Check in — Hostel Petra
   Marina" carries `move:{mode:'bus'}` describing the transfer, not a vehicle it *is*. If the
   distinction cannot be derived reliably, the honest alternative is to downgrade
   `impossible_transfer` from `blocker` to `warning` for vehicle-mode arrivals until the model
   can tell them apart — surfacing the doubt rather than asserting a defect, which is the same
   principle as *flag conflicts, don't resolve them by guessing*.

I did not find a fourth artifact class: `walk` (36), `metro` (10), `transit` (3) and `bike` (1)
arrivals are all genuine transfers and none fires.

---

### F-5 — `geo_outlier` and `validateTrip` cannot catch the Fisherman's Bastion typo they were built for
**Severity: MAJOR. Routing: builder (validate coverage), architect (rule scope).**

`ROADMAP.md` Phase 1: *"It is also the tool that would have caught the Fisherman's Bastion
typo."* It is not.

**Reproduce** (`cairn/qa/attack5.mjs`):
```
# A. the real historical bug: the Place "Fisherman's Bastion" lat 47.5025 -> 48.5025 (111 km north)
#    conflicts: 27 -> 27.   validateTrip issues: 31 -> 31.  Nothing fires.
# B. the pool stop "Fisherman's Bastion & Matthias Church" moved 1 degree
#    conflicts: 27 -> 27.   issues: 31 -> 31.  Nothing fires.
# C. a scheduled stop that carries an `arrival` override, moved 1 degree
#    geo_outlier: silent (validateTrip's stop_far_from_city does fire)
```

**Coverage measured on the real trip: `geo_outlier` examines 31 of 238 coordinate-bearing records.**

| Record class | Count | `geo_outlier` | `validateTrip` distance check |
|---|---|---|---|
| Scheduled stop, no `arrival` | 31 | yes | yes |
| Scheduled stop **with** `arrival` | **81** | no (`if (stop.arrival) continue`) | yes |
| Pool stop | **31** | no (only walks `trip.days`) | **no** — `stop_far_from_city` requires a `dayId`, and pool stops have `dayId: null` |
| `Place` | **95** | no | **no** — places get only `inRange` (±90/±180) and `unknown_city_key` |

Every `Place` carries `cityKey` **and** `at`, so the check is one `haversine` away.
`CLAUDE.md`'s own scripted check — *"every lat/lng should sit within ~35 km of its city
centre"* — was applied to `CITY_PLACES`; the generalisation dropped it.

A secondary hole: `geo_outlier` skips any day whose `primaryCity` is `transit` (Aug 7), because
it has no anchor centre. A coordinate typo on a transit day is invisible.

---

### F-6 — A friend's trip, imported as JSON, is presented as Jacob's own plan — and keeps the friend's `ownerId`
**Severity: MAJOR (provenance rule + ownership traceability). Routing: architect (design), builder (implementation).**

**Reproduce** (`cairn/qa/prov.mjs`, last-but-one block):
```
Marta exports her trip (ownerId: "user:marta"); Jacob imports the file via the Library's
"Import JSON" button.
observed: 91 of 112 stops render displayStatus() === 'own'.  0 render 'imported'.
observed: the stored document's ownerId is still "user:marta".
observed: canEdit(local:self, that trip) === false, and nothing in the app calls it.
```

**Expected**, per `BRIEF.md` and §2.8: *"Never present a suggestion as the user's own plan…
a friend's stop is visibly marked as such until the user accepts it"*, and per §6.2
*"ownership traceable on every row"*.

`ARCHITECTURE.md` §5.2 defines `forkTrip` to mark every copied stop
`{source:'friend', state:'candidate', origin.sourceTripId}` — but that is Phase 2, while raw
JSON import ships in Phase 1 as a **"may not be stubbed"** deliverable. So Phase 1 ships the
one import path that has no provenance story, and it is the path a friend's trip actually
arrives through.

This is the retrofit Jacob explicitly asked to avoid: every trip imported before Phase 2 lands
in the database with a stranger's `ownerId` and 112 unbadged rows.

**Architect decision needed:** does `importDoc` (a) adopt ownership and mark every entity
`source:'friend'` when the incoming `ownerId` is not the local user, (b) refuse a foreign
`ownerId`, or (c) is `importDoc` contractually "re-import my own export" and the UI must not
offer it as a way to receive someone else's trip? Any of the three is fine; none is currently
chosen.

---

### F-7 — `acceptCandidate` is an optional gate: `updateStop` will rewrite provenance wholesale
**Severity: MAJOR. Routing: builder (narrow the patch type at runtime), architect (confirm the invariant).**

**Reproduce** (`cairn/qa/prov.mjs` / `attack8.mjs`):
```js
// a system suggestion, displayStatus() === 'suggested'
updateStop(trip, sug.id, { provenance: {
  source:'user', state:'accepted', confidence:'confirmed',
  addedAt:'2026-01-01', acceptedAt:'2026-01-02', actorUserId:'u1' } })
// -> displayStatus() === 'own'.  No actor check, no acceptance record, no revision of origin.
```
and
```js
updateStop(trip, stop.id, { id: 'HIJACKED' })   // -> the stop's id is rewritten
updateStop(trip, stop.id, { totallyUnknownKey: 'x' })  // -> written onto the stop
```

`StopPatch = Partial<Omit<Stop,'id'|'placement'>>` is a **compile-time** constraint only; at
runtime `updateStop` does `{...s, ...rest}`. `Omit<…,'id'>` does not stop `{id:…}` at runtime,
and rewriting a stop id dangles its `bookingId` links and any `ConflictResolution` naming it.
The client's `updateStop` action forwards the patch verbatim, so this is reachable from the
state machine, not just from core.

**Observed:** the one function `ARCHITECTURE.md` §2.8 designates as the gate for "email-derived
data is never a silent write" can be bypassed by the general-purpose editor. Phase 3's ingest
worker is exactly the caller that must not be able to do this.

**Expected:** `updateStop` refuses `provenance` and `id` (throw — it is programmer error);
provenance transitions go through `acceptCandidate`/`rejectCandidate` only.

The good news, verified: **no other path breaks it.** `moveStop`, `returnToPool` +
`scheduleFromPool`, `reorderStop`, `linkBooking`, `setDayMeta`, a JSON round-trip, and
undo/redo across an accept all preserve `{source:'system', state:'candidate'}` exactly, and the
full 4×3×3 provenance matrix never yields `'own'` for a non-user un-accepted item.

---

### F-8 — The `closed` rule can never fire on real data; its documented fixture case does not exist
**Severity: MAJOR. Routing: architect (the fixture case named in §2.7 is not in the source data).**

**Reproduce** (`cairn/qa/rules.mjs`):
```
places carrying opening hours after import: 0 / 95
Naschmarkt stop in the trip: not found
detectConflicts(...).filter(ruleId==='closed').length === 0
```

`ARCHITECTURE.md` §2.7 names the fixture case: *"Naschmarkt flea market ends 14:00, arrival
15:50"*. `CITY_PLACES` carries no hours, `§2.11`'s mapping table has no `hours` row, and no stop
in the imported trip is called Naschmarkt. The rule is exercised only by a synthetic test that
hand-builds a `Place` with `hours`.

Four of the eleven rules (`booking_vs_plan`, `overlap`, `closed`, `duplicate_booking`) are
silent on the reference trip. Three of those are correct — the fixture genuinely has no such
problem, and I confirmed each fires when provoked. `closed` is different: it *cannot* fire,
because no data path produces `Place.hours`.

**Architect decision needed:** either drop `closed` from Phase 1 and the §2.7 table, or add an
hours source. Shipping a rule with a fictional fixture case in the contract is the kind of thing
that reads as coverage and is not.

---

### F-9 — The Aug 18 conflict-id acceptance criterion is not met, and the test that "proves" it passes vacuously
**Severity: MAJOR. Routing: builder (the test), architect (the invariant's real shape).**

`ROADMAP.md`: *"conflict ids are stable across a no-op re-import and **change** when the Aug 18
flight time is edited"*. `ARCHITECTURE.md` §2.7: *"If the Ryanair time changes from 19:30 to
07:30 the id changes, so a previous 'acknowledged' does **not** silently carry over. That is
`HISTORY.md` Pass 5's lesson, mechanised."*

**Reproduce** (`cairn/qa/confid.mjs`):
```
Aug 18 conflicts BEFORE (flight 07:30):
   legacy_flag-6896e764…  impossible_transfer-d084b8e6…  missing_lodging-878b3974…  unbooked_ticketed ×2
Aug 18 conflicts AFTER  (flight 19:30):
   legacy_flag-6896e764…  impossible_transfer-d084b8e6…  impossible_transfer-1bcfdbc0…  booking_vs_plan-7c94…  missing_lodging-878b3974…  unbooked_ticketed ×2

ids that disappeared: 0
ids that appeared:   2
```
And the invariant that matters:
```
acknowledge impossible_transfer-d084b8e6 (the Aug 18 blocker) at 07:30
move the flight to 19:30
-> that acknowledgement is STILL APPLIED
```

**Why the builder's test passes:** `conflict.test.ts:158` asserts
`notDeepEqual(transferIdsAfter, transferIdsBefore)` where before is `[X]` and after is `[Y, X]`
— different arrays, but `X` (the conflict a user would have acknowledged) is untouched. The
criterion "ids change" is never actually asserted. Same test's "no-op re-import" half calls
`detectConflicts` twice on one trip object, which tests purity, not re-import. (I ran a genuine
second `loadEurope2026()` and ids do match, so that half of the criterion is met in fact.)

**The mechanism itself is sound** where a conflict's own values change — I verified that
rewriting a `legacy_flag` day's subtitle changes its id, and that a `booking_vs_plan` id changes
when the time behind it changes. The defect is that the acceptance criterion picked an edit
that does not touch any existing conflict, and the test was written to pass rather than to
check.

**Expected:** an assertion that a *specific* acknowledged conflict id is absent after the edit.

---

## MINOR

### F-10 — A dismissed conflict silently comes back to life when the data returns to its old value
**Routing: architect.** (`cairn/qa/confid2.mjs`)
```
flight 19:30 -> booking_vs_plan-7c94…   user dismisses it, note "I checked, it is fine"
flight 20:30 -> booking_vs_plan-74dc…   resolution null  (correct)
flight 19:30 -> booking_vs_plan-7c94…   resolution = the old dismissal, re-applied automatically
```
Content-addressing gives ids no revocation-on-revert story. Related: `trip.resolutions`
accumulates dead rows forever — 5 edit-and-acknowledge cycles leave 5 rows of which 1 is live;
nothing garbage-collects them, `validateTrip` does not mention them, and each is a re-armed
decision. Not data loss, but a dismissed **blocker** returning without a user action is the
class of thing §2.7 exists to prevent.

### F-11 — `createTrip` accepts impossible calendar dates and produces a zero-day trip that validates clean
**Routing: builder.** (`cairn/qa/attack1.mjs`)
```
createTrip({startDate:'2026-13-45', endDate:'2026-13-46'}) -> 2 days starting 2027-02-14; validateTrip: []
createTrip({startDate:'2026-02-30', endDate:'2026-03-01'}) -> 0 days;                      validateTrip: []
```
The date guard is a `YYYY-MM-DD` regex; `Date.UTC` then rolls over silently. `trip.startDate`
keeps the impossible string while `days[0].date` is something else. `validateTrip` is consistent
with itself (it recomputes the expected span the same wrong way) so `days_not_dense` never fires.
Everything else about density is solid — a gap in the middle, a truncated tail, zero days over a
real range, and a shifted `startDate` are all caught correctly.
The web app's *New trip* form is guarded by `<input type="date">` + `endDate >= startDate`, so
this is reachable through core/CLI/import, not the wizard. A zero-day trip imported into the UI
degrades correctly ("This trip has no days.").

### F-12 — `fromJSON` accepts unknown enum values and non-numeric coordinates
**Routing: builder.** `ROADMAP.md` lists "unknown enum values" as an attack. (`cairn/qa/attack7.mjs`)
```
ACCEPTED  "category":"nuclear"
ACCEPTED  "source":"nsa"            (provenance)
ACCEPTED  "kind":"telepathic"       (placement)
ACCEPTED  "lat":"33.9425"           (string)
ACCEPTED  "lat":1e999               (Infinity)
```
Structural validation is good — every malformed/truncated/`schemaVersion 99`/`days:null`/
`stops:{}` case is rejected as `TripParseError` with a JSON path, and `__proto__` payloads do
not pollute `Object.prototype`. Enum and numeric-domain validation is missing. An unknown
`provenance.source` fails safe today (`displayStatus` → `'suggested'`, not `'own'`), which is
the right direction, but it is luck rather than design.

### F-13 — `canView(p, rel, undefined)` fails **open** on an expired share
**Routing: builder.** (`cairn/qa/access.mjs`)
`effectiveRole` does `if (s.expiresAt && s.expiresAt < now) continue;` — with `now === undefined`,
`'2026-07-01' < undefined` is `false`, so every expired share becomes live. These predicates are
the definition Phase 2's RLS policies are generated from; a caller that forgets the clock silently
grants access. Should throw on a missing/invalid `now`.

Everything else in the access surface is **correct** — I ran the full matrix (12 principals ×
5 operations: owner, co-owner, editor, commenter, viewer, friend, revoked editor, stranger,
anonymous, live link, expired link, revoked link). A friend gets nothing by itself; a revoked
share grants nothing; an anonymous principal cannot match a link share and vice versa; a viewer
link cannot edit. No cell is wrong.

### F-14 — `packages/core/src/index.ts` exports 64 symbols beyond §2.10
**Routing: architect.** §2.10 says the index *"re-exports exactly this and nothing else"*. It
re-exports 102 runtime symbols, 64 of which are not in the list — including things the client
genuinely needs (`sequentialIds`, `LOCAL_OWNER`, `TripParseError`, `mapBounds`, `stopPoints`,
`needsBadge`, `formatRange`, `reorderStop`) and things it does not (`digest`, `canonical`,
`makeConflict`, `blankDay`). Either §2.10 is under-specified or the surface is leaking; only the
architect can say which.

### F-15 — `rollUpCost` is never told the trip's home currency, so the UI says "No conversion rate for EUR"
**Routing: builder.** `packages/client/src/store/derived.ts:39,51` calls `core.rollUpCost(day.stops)`
with no `opts.target`. With no target, `missingRates` lists **every** currency present, including
`EUR` on a `homeCurrency: 'EUR'` trip. `DayTimeline.tsx:40` then renders
*"No conversion rate for EUR, CZK …"*. Pass `{ target: trip.homeCurrency }`.
The underlying money model is otherwise correct: `converted` is always `null`, CZK/GBP/USD are
kept separate, and the Danube cruise's `$573.25 per_party` produces a real `basisWarning` naming
the stop rather than being summed with per-person amounts.

### F-16 — `cli.ts export <path>` has no path guard and can write into the read-only root
**Routing: builder.** `cmdExport` does `writeFileSync(argv[1], text)` with no normalisation or
prefix check. `npm run cli -- export ../europe-2026-itinerary.html` would overwrite the live app
on Jacob's phone. I verified there is no guard by exporting to an absolute path outside `cairn/`
(228 691 bytes written, no complaint); I did not aim it at the planner. `tools/serve.mjs` does
have a prefix check for reads — the same discipline is missing on the one write path.

### F-17 — `accepted_without_timestamp` is validated for stops but not for bookings
**Routing: builder.** (`cairn/qa/prov.mjs`, last block)
A `Booking` with `{state:'accepted', acceptedAt:null}` renders `displayStatus() === 'own'` and
`validateTrip` says nothing. That is precisely the shape an email-ingest bug would produce.
The stop-level check works.

### F-18 — `Conflict.params` carries raw coordinates, which land in committed files
**Routing: architect.** `geoOutlier.ts` puts `lat`/`lng` into `params` and `values`. Six precise
coordinates are consequently committed in `fixtures/golden/core-conflicts.json`. These are
itinerary pins, not location traces, so §6.1's "never transmitted" table is not violated today —
but §6.1's cross-cutting assertion is *"No coordinates in any log line, ever. Log `stopId`,
never `lat/lng`"*, and `Conflict.params` is the structure that will be logged, alerted on and
shipped to the server in Phase 2. `stopId` is already in `subjects`. Decide now.

### F-19 — `npm run web:build` bakes personal ticket tokens into the JS bundle
**Routing: architect.** The generated sample embeds live, unauthenticated ticket URLs, e.g.
`cityairporttrain.com/en/account/order/9zuskFnJPD8oOm5hGTJX54VCS_hmSZu7` and
`ulaznice.hr/web/confirmFromMailGuest/2665250/52/88193/fcvbimxq`. Nothing is committed
(`dist/` and the generated sample are gitignored) and the same URLs are already in the root
planner, so this is not a new exposure *today*. It becomes one the moment `apps/web/dist` is
deployed as the public share-page host in Phase 2. The sample trip should ship with tickets
redacted, or not ship in a public build.

### F-20 — Six source files point at BUILD-NOTES for content it does not contain
**Routing: builder.** `impossibleTransfer.ts`, `geoOutlier.ts`, `bookingVsPlan.ts`, `closed.ts`,
`stops.ts` and `cluster.ts` all say "See BUILD-NOTES". `BUILD-NOTES.md` discusses none of them.
This is how F-4 stayed invisible: the builder wrote the caveat down in the place nobody reads
and omitted it from the place everybody reads.

---

## What I attacked and could not break

Listed because "no finding" only means something with the attack list attached.

**Constraints (`cairn-constraints`), all clean:**
- **Determinism.** No `Date.now()`, `Math.random()` or `crypto.randomUUID()` anywhere in
  `packages/core` or `packages/client`. The two `new Date(Date.UTC(...))` uses in `summary.ts`
  and `closed.ts` are pure calendar arithmetic on injected values. `Date`/`crypto` are called in
  exactly one file, `apps/web/src/ports/env.ts`, as designed.
- **Zero runtime dependencies** in core and client. Client's only dependency is `@cairn/core`.
  No `node:` imports in either package (`conflict/id.ts` hand-rolls FNV-1a rather than reaching
  for `node:crypto`).
- **No DOM/React in `packages/client`.** No `document`, `window`, `localStorage`, `indexedDB`,
  `navigator`, `require`, or React import. The entire state machine ran under plain Node for
  every test in this report.
- **Type stripping.** All 69 tests run directly on Node 22.22.2 with no build step. (Note:
  ROADMAP specifies Node 24; this environment is 22.22.2, so Node-24-specific behaviour is
  untested — the builder flagged this and it is fair.)
- **Read-only root.** Byte-identical before and after a full run; no `DAYS` copy committed;
  the extractor is `readFileSync`-only. Drift detection fails loudly and correctly.

**Correctness under the real trip's shape:**
- Overnight LAX 16:45 → FRA 13:00+1 belongs to Aug 7; the FRA connect stop is on Aug 8.
- Aug 12's FlixBus leg is 245 min *arriving at Split*, `source:'override'`, on the arriving stop.
- All 16 days reproduce the live page's `legBetween` mode, minutes and kilometres exactly.
- All 16 days reproduce `focusCluster`'s split flag, group sizes and focus membership exactly.
- `fitSpanKm` never drops below `MIN_SPAN_KM` on any day; two pins 40 m apart still clamp to a
  usable box; `mapBounds([])` returns `empty:true` rather than inventing one.
- A day with zero stops, a stop with `PlaceLink {kind:'none'}`, two stops at the same time, and
  a stop whose neighbour has no coordinates all pass through legs, clusters, cost and validation
  without a throw and without a guessed value.
- `returnToPool` → `scheduleFromPool` is lossless at position 0, mid-day and last.
- `duplicate_booking` fires for two references on one route; `superseded_booking` fires for
  YZGDTS and `duplicate_booking` does **not**; `booking_vs_plan` stays silent for the agreeing
  Aug 15 Smartwings and fires as soon as the booking really disagrees; `overlap` never fires
  without `durationMins` and fires with one; `unverified_reference` names exactly IU1TUY and
  I54C9A; `missing_lodging` names exactly Budapest and London.
- All 21 booking references in `europe2026.bookings.json` still appear verbatim in
  `docs/BOOKINGS.md`; YZGDTS is present twice with the right supersede direction.
- Unicode, emoji, RTL-override, NUL-byte and 5 000-character names all survive a round-trip
  byte-identically.
- `haversine` stays finite on out-of-range input; NaN coordinates do not crash legs or clusters.

**Client state machine (no browser):**
- `ui` state appears nowhere in the persisted bytes.
- Two trips do not leak: `createTrip`, `adoptTrip`, `openTrip` and `importDoc` all reset ui,
  history and the derived cache; undo after a switch cannot resurrect the previous trip.
- Undo/redo is exactly 50 deep, byte-exact, and a no-op at both ends.
- A failing `StoragePort.save` sets `status:'error'`, keeps the edit in memory, keeps `isDirty()`
  true, and both edits persist once storage recovers. Quota exhaustion behaves the same.
- Every one of the 15 actions bumps `revision`; the derived cache is keyed on `(tripId, revision)`
  and two different trips sharing revision 7 do not share derived data.
- The reducer contains no domain logic — it is a table lookup to one core function per action.

**Browser (Chromium, production build):**
- All 16 dates reachable from the spine, including the `cities:['transit']` Aug 7.
- 21 `suggested` badges, 21 `free`, 7 `ticket`, 7 `daytrip` render across the days — every
  system suggestion I inspected carries a visible marker in its row.
- Aug 8 map: 7 of 7 focus pins inside the visible container; "Whole day's journey" toggle present.
- Map re-fit after navigating away and back is **pixel-identical** — the `display:none` fit bug
  does not reproduce.
- With all tile requests aborted, the map still mounts and renders pins and the polyline; the
  app does not collapse.
- A corrupt document in the library produces a readable error banner
  (`not valid JSON: Unexpected end of JSON input (at $)`) and the app stays usable.
- A zero-day trip imported through the file picker renders "This trip has no days." rather than
  a blank shell.
- Network egress from the built app: `localhost` + `*.tile.openstreetmap.org` only. No
  analytics, no crash reporter, no `fetch` anywhere in `packages/*` or `apps/web/src`. No
  `console.log` in any shipped file.

**Sensitive paths (ARCHITECTURE §5, §6):** there is no email, location or photo code in Phase 1
— no `services/`, no `apps/mobile`, no mailbox or coordinate persistence beyond itinerary pins.
Nothing to leak yet. The Phase 1 hooks that will matter later are F-7 (the ingest write gate),
F-18 (coordinates in `Conflict.params`) and F-6 (ownership on import).

---

## Routing summary

| To the builder | To the architect |
|---|---|
| F-1 revision guard on save | F-4 `geo_outlier` rule shape |
| F-2 `importDoc` collision check against storage | F-5 should `Place` and pool stops get a distance check |
| F-3 `typecheck` from a clean clone | F-6 what `importDoc` does with a foreign `ownerId` |
| F-7 lock down `updateStop`'s patch | **F-4a `arrival` cannot say "departure" — a model field, not a rule patch** |
| F-9 make the conflict-id test actually assert | F-8 drop `closed` or give it an hours source |
| F-11 calendar-valid dates | F-10 revert-resurrection and `resolutions` GC |
| F-12 enum + numeric validation in `fromJSON` | F-14 §2.10's export list |
| F-13 fail closed on a missing clock | F-18 coordinates in `Conflict.params` |
| F-15 pass `target` to `rollUpCost` | F-19 personal ticket tokens in a public build |
| F-16 path guard on `cli export` | |
| F-17 `accepted_without_timestamp` for bookings | |
| F-20 write the objections into BUILD-NOTES | |
