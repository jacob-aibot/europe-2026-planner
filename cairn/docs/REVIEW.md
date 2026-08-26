# Cairn — Phase 1 review

> **Status: SUPERSEDED, no fresh verdict issued.** This review covers round 1 (`master` @
> `0c68d6f`) and its verdict below is **SEND BACK** — unchanged, not re-decided. Since then: an
> architecture revision (rev 2), a builder re-delivery, a round-2 QA pass (`QA-FINDINGS.md`,
> 3 blockers found), and one fix commit (`b5c742b`, closes R2-3 — see `BUILD-NOTES.md` KD-20/21).
> R2-1 and R2-2 have **no fix commit** as of `master` @ `b5c742b`. **No manager verdict exists
> for the current state of `master`.** The Phase 1 SHIP gate is not granted by this document —
> read it for the routing history, not as a statement about `master` today.

Manager, stage 4. Reviewed `master` @ `0c68d6f`, 2026-08-25.
Everything below was run from a **clean `git clone`** into a scratch directory, Node v22.22.2,
Chromium via the system Playwright. Commands and their output are in **Verified** at the end.

---

## Verdict: **SEND BACK**

Not because the work is thin — it is not. `packages/core` is a real engine, the CLI prints a day
Jacob could travel from, the read-only boundary around his live planner is airtight, and the goldens
are honest. Phase 1 is roughly 90% of a good phase.

It goes back for three reasons, in order of weight:

**1. It loses data, in two ways Jacob will actually hit.** Two browser tabs on the same trip: the
second save silently destroys the first tab's edits and the losing tab still says "Saved" (F-1).
An "Import JSON" overwrites a stored trip that has real edits in it, with no warning and no new id,
contradicting `importDoc`'s own doc comment (F-2). I reproduced both — F-1 in a real browser, F-2
headless. A planner that quietly discards the plan is not shippable at any level of polish.

**2. It breaks the one convention `CLAUDE.md` calls non-negotiable.** Import a friend's exported
trip and **91 of 112 stops render as Jacob's own plan**, and the document keeps the friend's
`ownerId` (F-6). `BRIEF.md` carries that rule forward verbatim — *"Never present a suggestion as the
user's own plan"* — and `ARCHITECTURE.md` §6.2 makes ownership traceability one of the four things
designed now precisely so it is never retrofitted. Phase 1 shipped the one import path with no
provenance story, and it is the path a friend's trip arrives through. The badge machinery for
`imported` already exists in `packages/tokens` and in the views; nothing ever produces the state.

**3. The phase's headline feature mis-reports itself.** Of 12 blocker conflicts on the reference
trip, **3 are actionable and 9 are noise** — and the `geo_outlier` rule, whose stated justification
in `ROADMAP.md` is *"the tool that would have caught the Fisherman's Bastion typo"*, does not catch
it. I reproduced the historical bug exactly (Place `place-68`, lat 47.5025 → 48.5025, 111 km north):
**27 conflicts before, 27 after; 31 validation issues before, 31 after.** Nothing fires. The rule
examines 31 of 238 coordinate-bearing records. `validateTrip`'s `stop_far_from_city` — which the
tester did not route — has the same defect and is bigger: 13 of its 20 warnings are explained by
another city on the same day or a `daytrip` flag.

Everything else on the list is ordinary Phase-1 residue and could have ridden into Phase 2.

---

## The process failure, and the rule that stops it

Six files under `packages/core/src` say "see BUILD-NOTES" for a caveat `BUILD-NOTES.md` does not
contain. That is the visible symptom. Two deeper things are wrong, and they route differently.

**The builder's fault is disclosure, not judgement.** `impossibleTransfer.ts:8` documents the
departure-time artifact by name, before anyone found it, and says it implemented §2.7 as written
rather than silently patching it. That was the right call. `geoOutlier.ts:10` proposes its own fix.
The builder then wrote "Conflicts: 12 blockers" into BUILD-NOTES under a heading called **"Verified,
by running it"**, and put nothing in **"Objections to the design"** except a missing timestamp field
and a pseudo-city. A caveat recorded where nobody reads it is not a caveat; it is a green run with a
footnote in the basement. That is how nine false-positive blockers reached a passing acceptance gate.

**The roadmap's fault is that its acceptance criteria are countable and the product is not.** Every
Phase 1 criterion is a number or a golden diff. A count is satisfiable while the thing misbehaves —
"12 blockers" is a *self-snapshot* (`core-conflicts.json`), not a result, and `gen-golden.mjs` says
so in its own header. Two criteria are worse than under-specified, they are unmeetable or wrong:

- *"`rollUpCost(day)` reproduces the live app's `dayCost()` string for all 16 days"* — actual **6 of
  16**. I checked all ten divergences by hand and every one is required by §2.6's money model
  (currency kept separate, per-party not summed with per-person, "gardens free · palace €15–24" split
  into two amounts). **The code is right and the criterion is wrong** — §2.6 and this criterion
  contradict each other. `derive.test.ts:120` resolves the contradiction by asserting `exact === 6`
  and permitting the other ten as "divergent — see BUILD-NOTES". BUILD-NOTES is silent. Neither the
  builder nor the tester mentions that a named acceptance criterion is met at 37%.
- *"7 stops carrying a Ticket, **2** of them `kind:'bundled'`"* — actual **3**, over 2 distinct files.
  The builder's reasoning is defensible and is written in `import.test.ts:63`. But BUILD-NOTES reports
  "7 tickets (2 bundled)" under "Verified, by running it", and QA-FINDINGS re-verifies it as **TRUE,
  "re-counted"**. Both reports state a number the repo's own test suite asserts is different.

**Two rules, one per agent, both mechanically checkable:**

- **Builder:** a comment in `packages/*/src` is not a disclosure. Any source comment that records a
  known divergence from `ARCHITECTURE.md` or `ROADMAP.md` — "see BUILD-NOTES", "objection",
  "artifact", "not a real defect", "the roadmap says X but" — MUST have a matching entry in a
  BUILD-NOTES section called **Known divergences from the contract**, and that section is the first
  thing the manager reads. Add a grep-based check to `npm test` so the two cannot drift.
- **Architect:** every acceptance criterion that is a count gets a second clause naming the outcome,
  and every criterion checked against a file the builder generates says so in the criterion. For
  conflicts specifically: *"the golden records the count **and** one line per blocker justifying why
  Jacob must act on it."* Nine cries of wolf would not have survived writing that line nine times.

---

## Routing

### Must be fixed in the re-delivery — Phase 2 cannot start over these

| # | To | What, exactly |
|---|---|---|
| **F-1** | **builder** | `packages/client/src/store/store.ts:82` — `save()` writes the whole document with no compare-and-set against the stored revision, though `persistence.savedRevision` is already tracked. Load the stored doc's revision before writing; if it moved, refuse the write and surface it. The losing tab MUST NOT display "Saved". Repro: `cairn/qa/browser5.mjs`. §2.2 promises "last-writer-wins per stop with a revision guard"; Phase 1 has neither. |
| **F-2** | **builder** | `store.ts:252` — `if (state.library.some(r => r.id === doc.id))` checks a boot-time in-memory snapshot. Check `await ports.storage.load(doc.id)`. Either mint the fresh id the doc comment already promises, or refuse with a visible prompt. Repro: `cairn/qa/browser4.mjs` (browser) and `cairn/qa/client1.mjs` (headless). |
| **F-6** | **architect first, then builder** | Architect: decide which of the three `importDoc` is — (a) adopt ownership and stamp every entity `{source:'friend', state:'candidate', origin.sourceTripId}` when the incoming `ownerId` is not the local user, (b) refuse a foreign `ownerId`, or (c) `importDoc` is contractually "re-import my own export" and the Library must not offer it as a way to receive someone else's trip. Write the answer into §2.10 and §4.5. Builder: implement it; the `imported` badge already exists in `packages/tokens/src/index.ts:48` and in `DayTimeline.tsx:85`. **This must land in Phase 1**: §6.2 designs ownership now specifically so trips do not reach a database with a stranger's `ownerId` and 112 unbadged rows. |
| **F-7** | **builder**, architect confirms invariant | `updateStop` does `{...s, ...rest}`; `StopPatch = Partial<Omit<Stop,'id'|'placement'>>` is compile-time only. At runtime `updateStop(trip, id, {provenance: {...source:'user', state:'accepted'}})` turns a system suggestion into `'own'`, and `{id:'HIJACKED'}` rewrites the stop id and dangles its `bookingId` and any `ConflictResolution` naming it. Throw on `id`, `placement` and `provenance` keys — programmer error per §2.1. Phase 3's ingest worker is exactly the caller §5.1 says must have no such path. |
| **F-13** | **builder** | `access/predicates.ts:41` — `effectiveRole` does `if (s.expiresAt && s.expiresAt < now) continue`. I ran it: an expired viewer share returns `canView === false` with `now:'2026-08-25'` and **`true` with `now` undefined or `''`**. Throw on a missing or non-`YYYY-MM-DD` `now`. These predicates are the definition Phase 2's RLS policies are generated from and tested against (§6.2.4); a definition that fails open generates a policy that fails open. |
| **F-3** | **builder** | `npm run typecheck` exits non-zero on a fresh checkout: `apps/web/src/sample.ts(8,17): error TS2307: Cannot find module './sample/europe2026.json'`. It passes only after `web:build`. Make `typecheck` depend on `presample`, or commit a `.d.ts` shim. BUILD-NOTES documents the failing sequence as the working one. |
| **F-16** | **builder** | `cli.ts` `cmdExport` does `writeFileSync(argv[1], text)` with no normalisation or prefix check. `npm run cli -- export ../europe-2026-itinerary.html` overwrites the live app on Jacob's phone. Refuse any path that normalises outside `cairn/`. Sequencing rule 4 makes this non-negotiable and `tools/serve.mjs` already has the equivalent guard on its read path. |

### Ride along in the re-delivery — the phase is not presentable without these

| # | To | What, exactly |
|---|---|---|
| **F-4a** | **architect** | **Adjudication verified — I re-ran `cairn/qa/vehicles.mjs` and the numbers hold.** 31 vehicle-journey stops; 4 firing; 3 of those the departure-time artifact; **25 silent only because the printed clock gap happens to exceed the journey time**, with margins of 1 min (Blue Cave, Boat to Skradinski Buk) and 11 min (Condor DE4345, BA863). The model cannot say that a stop's `time` is a **departure** and its `arrival` is **the vehicle's own journey**. Add a field the conflict rules read. **Both recorded constraints check out and stand:** (1) additive only — `legacy-legs.json` is generated by running the live page's own `legBetween` in a `node:vm` (`tools/gen-golden.mjs:54`), so any change to how `arrival` feeds `computeLegs` breaks parity on all 16 days; (2) the importer must derive it, and `cat==='transit'` + vehicle mode does not cover Aug 13's `cat:'trip'` speedboats or Aug 10's `move:{mode:'bus'}` transfer-into-a-hotel. If it cannot be derived reliably, take the recorded alternative: downgrade `impossible_transfer` to `warning` for vehicle-mode arrivals. **One addition to the adjudication:** the same ambiguity has a second consumer nobody named — `validateTrip` emits *"Virgin Atlantic VS23 → Los Angeles is 8751 km from london, on a london day."* Specify the fix against `impossible_transfer` **and** `validateTrip.stop_far_from_city`, or it will be half-applied. |
| **F-4 / F-5 / M-3 / M-5** | **architect** | The geography rules, as one decision. Measured, so the fix is not chosen blind: **the builder's own suggested fix — measure against the nearest of `day.cities` — plus a `daytrip` exemption removes only 3 of the 6 `geo_outlier` blockers.** The Krka stops (Skradin, Roški Slap) and the Aug 8 FRA connect survive both. Decide: (a) anchor, (b) `daytrip` exemption, (c) what to do about a stop legitimately 50 km out on a day trip, (d) **scope** — `geo_outlier` skips the 81 stops that carry an `arrival` and all 31 pool stops and all 95 `Place` rows, which is why the Fisherman's Bastion typo is invisible; every `Place` carries `cityKey` and `at`, so the check is one `haversine` away, and (e) `geo_outlier` skips any day whose `primaryCity` is `transit`, so a coordinate typo on Aug 7 cannot be seen at all. **`validateTrip.stop_far_from_city` is a second implementation of the same rule with the same defect** (20 of 31 issues; 13 explained by another same-day city or a `daytrip` flag) — sequencing rule 1 says a second implementation is a design defect. Fold them. |
| **F-15** | **builder** | `packages/client/src/store/derived.ts:39,51` calls `core.rollUpCost(day.stops)` with no `opts.target`, so `missingRates` lists every currency including the trip's own, and `DayTimeline.tsx:40` renders *"No conversion rate for EUR"* on a `homeCurrency: 'EUR'` trip. Pass `{ target: trip.homeCurrency }`. This is the first thing Jacob will see and it is nonsense. |
| **F-9** | **builder**, then architect | Builder: `conflict.test.ts:158` asserts `notDeepEqual([Y,X], [X])` — true, and it proves nothing. Replace with an assertion that a **specific acknowledged conflict id is absent** after the edit. Architect: the criterion itself is wrong. I ran it — acknowledge the Aug 18 `impossible_transfer` (05:00 checkout → 05:30 bus), then move the flight 07:30 → 19:30, and **the acknowledgement is still applied**, correctly, because that edit does not touch that conflict's inputs. The content-addressing mechanism is sound. Restate the criterion against an edit that changes a value inside an existing conflict. |
| **F-20 / M-1 / M-2** | **builder** | Write the objections into BUILD-NOTES under **Known divergences from the contract**, and add the grep check above to `npm test`. The section must contain, at minimum: the `geo_outlier` anchor objection; the `impossible_transfer` departure-time artifact; **`rollUpCost` day-cost parity is 6/16, not 16/16, and why §2.6 requires that**; **3 bundled tickets over 2 files, not 2 bundled**; the `closed` rule having no data path; and the `cluster.ts` and `stops.ts` caveats. Correct the "Verified, by running it" table: `2 bundled` is false and `12 blockers` is a self-snapshot, not a result. |
| **F-11** | **builder** | `createTrip({startDate:'2026-13-45'})` yields a 2-day trip starting 2027-02-14 and `validateTrip` returns `[]`; `'2026-02-30'` yields a 0-day trip that also validates clean. The regex guard passes and `Date.UTC` rolls over. Validate the calendar, not the shape. |

### Deferrable to Phase 2 — but the *decision* is due now, in writing

| # | To | What, exactly |
|---|---|---|
| **F-18** | **architect** | `geoOutlier.ts` puts raw `lat`/`lng` into `Conflict.params` and `values`, and six precise coordinates are consequently committed in `fixtures/golden/core-conflicts.json`. §6.1's cross-cutting assertion is *"No coordinates in any log line, ever. Log `stopId`, never `lat/lng`"*, and `Conflict.params` is the structure that gets logged, alerted on and shipped to the server in Phase 2. `stopId` is already in `subjects`. Rule now, implement when there is a log. |
| **F-19 / M-7** | **architect** | Worse than filed. `apps/web/dist/assets/index-*.js` embeds the whole real trip: live unauthenticated ticket URLs (`cityairporttrain.com/en/account/order/9zusk…`, `ulaznice.hr/…/fcvbimxq`), **Jacob's hotel door PIN (`PIN 0754`)**, booking confirmation `5814731574`, flight refs `YZGDTS`/`IU1TUY`, and personal notes. Nothing is committed and nothing is deployed, so there is no exposure **today** — but §7 puts the public share-page host on this same build in Phase 2. "Redact tickets" is the wrong remedy; decide instead whether the built sample may ever be the real trip, and if not, what the shipped sample is. |
| **F-8** | **architect** | `closed` cannot fire: 0 of 95 places carry `hours`, §2.11's mapping table has no `hours` row, and no stop called Naschmarkt exists in the source. §2.7 names a fixture case that is not in the data. Drop the rule and the row, or add an hours source. |
| **F-10** | **architect** | A dismissed conflict returns, still dismissed, when the data reverts to its old value — content-addressing has no revocation-on-revert story. And `trip.resolutions` accumulates dead rows forever with nothing collecting them and `validateTrip` silent about them. A dismissed **blocker** re-arming without a user action is the class of thing §2.7 exists to prevent. |
| **F-14** | **architect** | `packages/core/src/index.ts` exports 102 runtime symbols; 64 are outside §2.10's list, including things the client genuinely needs (`sequentialIds`, `LOCAL_OWNER`, `TripParseError`, `mapBounds`, `stopPoints`, `reorderStop`) and things it does not (`digest`, `canonical`, `makeConflict`, `blankDay`). §2.10 says "exactly this and nothing else". Either widen §2.10 or narrow the index; only you can say which. |
| **F-12** | **builder** | `fromJSON` accepts `"category":"nuclear"`, `"source":"nsa"`, `"kind":"telepathic"`, `"lat":"33.9425"` and `"lat":1e999`. Structural validation is genuinely good; enum and numeric-domain validation is absent. `ROADMAP.md` lists "unknown enum values" as an attack. Fails safe today by luck, not design. |
| **F-17** | **builder** | `accepted_without_timestamp` is checked for stops and not for bookings; a `Booking{state:'accepted', acceptedAt:null}` renders `'own'` and `validateTrip` says nothing. That is precisely the shape a Phase 3 ingest bug produces. |
| **M-6** | **builder** | §3 specifies *"Dependency direction, enforced by a test that walks imports: `core` → nothing … Nothing imports `web` or `mobile`. This is the boundary that rots first."* **No such test exists.** `store.test.ts:408` covers the client's no-DOM half only. I verified the property holds today — `core` imports nothing external, `client` imports nothing but `@cairn/core` — so this is a missing guard, not a live defect. It is also not in BUILD-NOTES' stub list and not in QA-FINDINGS. Write it; four packages is when it is cheap. |

### To the tester

The QA pass is strong and I am not sending much back. The attack list reached the sensitive paths that
exist, every finding has a script, and re-deriving the builder's numbers independently is exactly the
job. Four things:

1. **You re-verified "7 tickets (2 bundled)" as TRUE. It is 3.** The repo's own `import.test.ts:63`
   asserts 3, with a comment explaining why. A claim marked "re-counted" that the test suite
   contradicts is the one place your independence demonstrably lapsed. Re-check how that happened.
2. **You did not check `rollUpCost` day-cost parity against its acceptance criterion.** ROADMAP says
   16/16; it is 6/16; `derive.test.ts:120` encodes the 6 as expected. You checked `computeLegs` parity
   (16/16, correct) and stopped. Cost parity is the criterion that guards the money re-model, which is
   the single largest semantic change in the import.
3. **You routed `geo_outlier` and missed its twin.** `validateTrip.stop_far_from_city` is a second
   implementation of the same rule, produces 20 of the 31 validation issues, and 13 of those are the
   same false-positive class. F-5 measures `geo_outlier`'s coverage precisely and then does not ask
   what the *other* distance check does with the same data.
4. **`Export JSON` was never exercised in a browser by anyone** — not in the builder's 17 Playwright
   steps, not in your four browser probes — and it is on the "may not be stubbed" list. I ran it:
   `europe-2026.cairn.json`, 228,691 bytes, round-trips byte-identically through `fromJSON`/`toJSON`.
   It works. Add it to the browser probes so it stays working.

Also untouched by anyone, in descending order of how much I care: `migrateDoc` beyond the
`schemaVersion: 99` case; `packages/tokens` (no test at all — trivial, but it now holds the badge
labels that F-6 turns on); the `rule_error` catch in `detect.ts:61`, which downgrades a throwing rule
to a `note` rather than failing loudly. I probed `tools/serve.mjs` for path traversal myself —
`/../../../../etc/passwd` returns the SPA fallback, not the file. No finding there.

---

## Verified — what I personally ran

Clean `git clone` of `master` @ `0c68d6f` into a scratch directory, `npm install`, Node v22.22.2.

| # | Command | Result |
|---|---|---|
| 1 | `npm test` | `# pass 69 # fail 0`. True. |
| 2 | `npm run typecheck` (clean clone, documented order) | **Fails.** `apps/web/src/sample.ts(8,17): error TS2307: Cannot find module './sample/europe2026.json'`. Passes after `npm run web:build`. F-3 confirmed. |
| 3 | `npm run web:build` | Clean, 561,641-byte bundle. |
| 4 | `npm run cli -- trip` | `16 days · 112 scheduled stops · 31 pooled · 95 places · 21 bookings`; six city ranges; `12 blockers, 4 warnings, 11 notes`; `1 errors, 30 warnings`. Matches BUILD-NOTES. |
| 5 | `npm run cli -- day 2026-08-13` | Real, dense, travel-usable output — times, legs with mode and km, override vs estimate marked, cost roll-up per currency, `no rate table for: USD, EUR`, map focus span. This is the part of the phase that plainly works. |
| 6 | `npm run cli -- conflicts` | 27 listed. Blockers = 2 `legacy_flag` + 4 `impossible_transfer` + 6 `geo_outlier`; the three departure-time artifacts (Aug 7 Condor, Aug 12 FlixBus, Aug 22 Virgin) are there verbatim. |
| 7 | Ticket census through `importLegacyDays` | `7 ticketed | bundled: 3 | url: 4 | distinct bundled files: 2`. **BUILD-NOTES and QA-FINDINGS both say 2 bundled.** |
| 8 | `rollUpCost` vs `fixtures/golden/legacy-daycost.json`, all 16 days | **exact 6/16, divergent 10/16.** Inspected all ten: every divergence is required by §2.6. Criterion vs code, not code vs correctness. |
| 9 | Fisherman's Bastion typo, `place-68` lat 47.5025 → 48.5025 | conflicts **27 → 27**, issues **31 → 31**. Same for the pool stop moved 1°. F-5 confirmed exactly. |
| 10 | `geo_outlier` coverage census | eligible 31 scheduled stops; **skipped: 81 with `arrival`, 31 pool, 95 places**. |
| 11 | False-positive census, my own | `geo_outlier` 6 blockers → 2 near another same-day city, 1 `daytrip`, **3 unexplained** (Skradin, Roški Slap, FRA connect). `stop_far_from_city` 20 → 8 + 5, **7 unexplained**. The proposed fix removes half the noise, not all of it. |
| 12 | F-6, my own headless probe | Marta's trip (`ownerId:'user:marta'`) exported and imported through `store.importDoc`: **`ownerId` still `user:marta`; displayStatus tally `{"own":91,"suggested":21}` of 112; zero `imported`.** |
| 13 | F-2, my own headless probe over one `memoryStorage` | stored name before import `JACOBS REAL PLAN — do not lose this`; keys after import `['trip-x']` (no new id); stored name after `Dubrovnik bus terminal (Gruž)`. **Edit destroyed.** |
| 14 | F-1, `cairn/qa/browser5.mjs`, real Chromium | `stored doc contains TAB A EDIT: false | TAB B EDIT: true`; `tab A save indicator says: Saved`. Reproduces. |
| 15 | F-9, my own probe | Acknowledged `impossible_transfer-…94fbea32`, moved the Aug 18 flight 07:30 → 19:30: **still present, resolution still `"acknowledged"`.** 2 ids appeared, 0 disappeared. Criterion not met; mechanism sound. |
| 16 | F-13, my own probe | expired viewer share, `now:'2026-08-25'` → `canView false`; `now: undefined` → **`true`**; `now: ''` → **`true`**. |
| 17 | F-4a re-run, `cairn/qa/vehicles.mjs` | 31 vehicle stops, 4 firing, 25 silent by coincidence; margins of 1 min on Blue Cave and Boat to Skradinski Buk, 11 min on Condor DE4345 and BA863. Adjudication and both constraints hold. |
| 18 | Read-only boundary, my own | `npm test && npm run golden && cli trip/conflicts/validate/export && npm run web:build`, then `git status --porcelain`: **zero modified tracked files**. Root planner, `docs/` and `tickets/` byte-identical; goldens regenerate byte-for-byte from a clean clone. Both properties in one run. |
| 19 | Golden provenance | `tools/gen-golden.mjs:54` runs `haversine`, `legBetween`, `dayCost`, `clusterStops`, `focusCluster` sliced out of the live page and executed in a `node:vm`; `extract-legacy.mjs:41` uses `lastIndexOf('<script>')`. The file's own header distinguishes `legacy-*` (from the page) from `core-*` (self-snapshots) honestly. |
| 20 | Export JSON in real Chromium | `europe-2026.cairn.json`, 228,691 bytes, `schemaVersion 1`, 16 days; **round-trips byte-identically** through `fromJSON`/`toJSON`. Only console errors are `ERR_TUNNEL_CONNECTION_FAILED` on map tiles — this sandbox has no route to `tile.openstreetmap.org`, as BUILD-NOTES says. |
| 21 | Bundle contents | `PIN 0754`, `conf 5814731574`, `YZGDTS`, `IU1TUY`, `girlfriend` — all present in `apps/web/dist/assets/index-*.js`. |
| 22 | Dependency direction | `core` imports nothing external; `client` imports nothing but `@cairn/core`; nothing imports `apps/web`. Property holds; **the §3 test that enforces it does not exist.** |
| 23 | Hygiene | 0 `console.log` in `apps/web/src`, `packages/*/src` or `cli.ts`. 0 `fetch`/`XMLHttpRequest` in `packages/*`. |
| 24 | `tools/serve.mjs` path traversal | `/../../../../etc/passwd` and the percent-encoded variant both return the SPA `index.html`, not the file. Safe. |

---

## For Jacob

**Short version: it is close, it does real work, and you should not trust it with anything you have
not got another copy of. Give it one more round.**

What actually exists and is good: your whole trip — 16 days, 112 stops, every ticket, every price —
now lives in a proper engine instead of being hardcoded in one HTML file. You can open it in a
browser, click through all 16 days, see the map open on the right city instead of a Bavarian field,
edit stops, and export the whole thing as a file. There is a cost report that finally refuses to
pretend 450 CZK is €18, and it tells you what it can't convert instead of guessing. Your live
planner on your phone was never touched — I checked every file before and after a full run and they
are byte-for-byte identical.

**Three things to know:**

1. **It can lose your edits.** Two browser tabs open on the same trip, or importing a file, and one
   set of changes disappears while the app still says "Saved". This is the reason it is going back
   and it is a fixable bug, not a design problem.

2. **The "conflicts" panel — the feature meant to be the reason to use this over the old page — is
   crying wolf.** It reports 12 things you must act on. Three are real: your two hand-flagged days
   (Aug 18 and Aug 20) and one genuine problem on Aug 18 where a 05:00 checkout does not leave enough
   time for a 05:30 airport bus that takes 40 minutes. The other nine are the app not understanding
   that a flight's time is when it *leaves*, and that a Krka day trip is supposed to be 50 km outside
   Split. Worse, the check that was supposed to catch the coordinate typo we hit last time — the one
   that put Fisherman's Bastion 111 km north of Budapest — doesn't look at the kind of record that
   typo lived in. I re-introduced that exact typo and the app noticed nothing.

3. **A friend's trip currently arrives looking like yours.** If someone exported their itinerary and
   you imported it, 91 of its 112 stops would show up unmarked, as though you had planned them. That
   breaks the one rule you set that I treat as absolute — my suggestions and other people's ideas
   never get presented as your plan. The badges for it are already built; nothing switches them on.

**Two decisions I need from you, both small:**

- **Should "Import JSON" be able to receive a friend's trip, or only re-open your own exports?**
  If it is for friends, the app has to mark every stop as theirs and hand ownership to you at the
  same time, and that should be built now rather than after there is a database. If it is only for
  your own files, I will make it say so and refuse anything else. Either is fine; nobody has chosen.

- **Is it ever OK for a built copy of Cairn to contain your real trip?** Right now the sample trip
  baked into the app is your actual itinerary — including your Vienna hotel door PIN, your booking
  references and your flight ticket links. That is harmless on your own laptop and it is how it got
  built so fast. It stops being harmless the moment this is on the internet as a share page, which is
  the next phase. I need to know whether the demo trip is you, or something invented.

**One thing coming later, so it is not a surprise:** connecting Gmail to read your booking emails
needs a security assessment from a Google-approved lab, roughly $540–$1,000, renewed every year.
Outlook has no such requirement. That decision is not due until mailbox ingestion (Phase 3), and the
plan already routes around it — forwarding a confirmation to an address works with no OAuth at all,
and that is what gets built first.

Nothing here is a rethink. The design held up; the engine is right; the money model is better than
the old page's. It is a round of fixes and one design answer about what a "conflict" is allowed to
be, and then it is worth putting in front of your friends.
