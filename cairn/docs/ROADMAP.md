# Cairn — Roadmap

Phased delivery. Every phase ships something usable on its own. Phase 1 needs no device, no cloud account,
no API keys and no network. Later phases may assume all of them.

Companion to `ARCHITECTURE.md`; section references point into it.

**Revision 2, 2026-08-25.** Phase 1 went back with five design defects. The largest of them was mine: every
Phase 1 acceptance criterion was a count or a golden diff, `core-conflicts.json` is a snapshot of our own
output, and that is how nine false-positive blockers passed a green acceptance run while a named criterion
sat at 37 %. **How a criterion is written** below is the fix, and it is applied to every phase.

| Phase | Ships | New external dependency |
|---|---|---|
| **1** | `packages/core` + `packages/client` + `apps/web`: a local-first, multi-trip planner Jacob can open and use | none — Node 24 and a browser |
| **2** | `services/api` + Postgres/RLS: accounts, sync, friends, shares, public share links | a managed Postgres/auth/storage account |
| **3** | `services/ingest`: mailbox → candidate review queue → tickets | forward-in address, then Outlook OAuth, then Gmail |
| **4** | `apps/mobile` (Expo): offline travel, then background location and the live path | Apple/Google developer accounts, a physical phone |
| **5** | Photos: on-device library scan, stop suggestions, opt-in attach | device photo library |
| **6** | Trace sharing, share-page polish, cost reporting | — |

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
  yet. They are the definition the Phase 2 RLS policies are generated from and tested against (§6.2).
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
- **`packages/core/src/index.ts`'s runtime exports equal §2.10's list exactly**, asserted as set equality in
  both directions against a literal list in the test file `[stated]`

#### F. The client, without a browser

- every action dispatches to exactly one core build function; the reducer contains no domain logic `[stated]`
- `ui` state never appears in a persisted document (assert on the saved bytes) `[stated]`
- `derived` is recomputed on `doc.revision` change and never read stale `[stated]`
- undo/redo restores the previous `Trip` exactly, to a depth of 50 `[stated]`
- a failing `StoragePort.save` puts `persistence.status = 'error'` and never drops the edit silently
  `[stated]`
- **two tabs, one trip: the second save is refused, not silently applied.** Tab A saves, tab B saves, tab A
  saves again → tab A's write is refused, `status` is `'conflict'`, tab A's indicator does **not** say
  "Saved", and the stored document still contains tab B's edit `[stated]`
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
document in the library · **a foreign-owned document through every entry point** — `importDoc`, a
hand-edited stored record, `migrateDoc` from `schemaVersion` 0 — none may yield an unbadged stop ·
**`copyStopInto` with a source stop that is itself imported** (the credit must point at the trip it was
copied *from*, not chase the chain) · **`copyStopInto` from a trip into itself** · a copied stop whose
`Place` already exists in the target · redaction against a note that contains a booking reference inside a
URL inside a sentence.

### Explicitly not in Phase 1

No HTTP, no database, no accounts, no auth enforcement. No location, photo or email code — those directories
do not exist yet. No timezone handling, and therefore **no `journey_overrun`** (§2.12 — the rule
`travelRole` enables and a wall-clock model cannot support; Phase 4). No `closed` rule (§2.7 — no hours
source exists). No sub-maps (Lokrum). No currency conversion. No native app. **No `forkTrip` and no
`TripFork`** — cut, not deferred (§2.14).

---

## Phase 2 — server, accounts, the social graph, and share links

**Ships:** `services/api` (Node 24, Postgres, RLS, managed auth and object storage), `packages/client` gains
a `SyncPort`, sign-in, multi-device sync, friends, per-trip shares (`viewer/commenter/editor`), ticket
upload, and **public share links a friend opens in a browser without installing anything** — the web
companion's other job per Jacob's answer. **Sharing is read + `copyStopInto`**; the browse-another-trip pane
from Phase 1 gains shared trips as a source and nothing else changes. `forkTrip` is not in this phase and is
not coming (§2.14).

**Independently useful:** Jacob's trips stop living in one browser, and his friends can see them.

Entry: Phase 1 shipped, with a manager verdict of SHIP.

**Exit criteria**, tagged per **How a criterion is written**:

- **The access conformance matrix passes on every cell** — core predicates vs RLS policies, every principal
  × relationship × operation, and **the matrix is enumerated from the type definitions, not hand-listed**,
  so a new role or operation cannot be silently absent. Count criterion, outcome clause: *every cell names
  the principal, the relationship, the operation and the expected verdict; a cell that agrees because both
  sides are `false` for the wrong reason is a defect.* `[stated]`
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

## Phase 3 — mailbox ingestion

**Ships:** `services/ingest`, the `IngestCandidate` review queue, parsers seeded from the real mail in this
trip (Condor, Ryanair, FlixBus, Smartwings/Amadeus, Booking.com, GetYourGuide), reissue-vs-duplicate
detection, and ticket storage on acceptance.

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

## Phase 4 — the native app and the live path

**Ships:** `apps/mobile` on Expo SDK 56, in two shippable halves:

- **4a — offline travel.** The trip on a phone, fully offline, `expo-sqlite`-backed, syncing when there is
  signal. Useful on its own: this is the version Jacob travels with, and the one that survives the flaky
  hotel wifi in `HISTORY.md`. It reuses the Phase 1 store unchanged — only the ports are new (§4.3).
- **4b — background location.** `expo-location` + `expo-task-manager`, iOS `UIBackgroundModes: location`,
  Android foreground service, fixes to encrypted local SQLite, `segmentTrace()` in core, **gaps rendered as
  gaps** (§5.3). Nothing uploaded.

Entry: Phase 2 shipped (the app needs sync). First phase requiring developer accounts and a physical device,
so 4b must land with a recorded-fixture path — a canned fix stream through `segmentTrace` — that *is*
testable in plain Node.

Timezones (§7) are resolved here: a live "up next" across a border needs real instants. **`journey_overrun`
ships with them** (§2.12) — the rule `travelRole` makes possible and a wall-clock model cannot support. Its
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

## Phase 5 — photos

**Ships:** on-device library enumeration by trip window, EXIF/location read, `suggestPhotoStops` scoring in
core, a suggestion queue, and opt-in attach with EXIF GPS stripped on upload (§5.4).

**Independently useful:** "here are 40 photos from Aug 13, and here is the stop you were standing at" is the
pillar-5 payoff and needs nothing from Phase 6.

Watch item: Android `ACCESS_MEDIA_LOCATION`. Without it coordinates come back empty *with no error*, which
will look like a matching bug and is a manifest bug. **Injected-fault criterion, precisely because it is
silent:** run the suggester against an asset list with every coordinate stripped and assert it degrades to
time-only with reduced confidence and **says so**, rather than returning confident wrong matches `[stated]`.
Every photo suggestion is `{source:'system', state:'candidate'}` and `displayStatus()` returns
`'suggested'` until accepted — the same invariant as Phase 1, on new data `[stated]`.

---

## Phase 6 — sharing surfaces and polish

Opt-in simplified trace sharing if it did not land in 4b; share-page polish and its own permission attack
pass (the one surface where a mistake is publicly visible); a trip-level cost report with a stored
`rateSetId`; and whatever the earlier phases proved was missing.

---

## Sequencing rules

1. **Nothing skips Phase 1.** Every later phase consumes `packages/core` and `packages/client`. A second
   implementation of legs, costs, conflicts or trip state anywhere is a design defect, routed to the architect.
2. **No phase begins before the previous one has a manager verdict of SHIP.** A phase built on an unverified
   phase is where the pipeline stops being worth having.
3. **Privacy and authorization invariants are tested every phase, not audited at the end.** From Phase 2 the
   tester's brief includes grepping for coordinates and mailbox content in logs, requests and database rows,
   and running the access conformance matrix.
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
