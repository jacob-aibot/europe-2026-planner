# Waypoint — Roadmap

Phased delivery. Every phase ships something usable on its own. Phase 1 needs no device, no cloud account,
no API keys and no network. Later phases may assume all of them.

Companion to `ARCHITECTURE.md`; section references point into it.

| Phase | Ships | New external dependency |
|---|---|---|
| **1** | `packages/core` + `packages/client` + `apps/web`: a local-first, multi-trip planner Jacob can open and use | none — Node 24 and a browser |
| **2** | `services/api` + Postgres/RLS: accounts, sync, friends, shares, public share links | a managed Postgres/auth/storage account |
| **3** | `services/ingest`: mailbox → candidate review queue → tickets | forward-in address, then Outlook OAuth, then Gmail |
| **4** | `apps/mobile` (Expo): offline travel, then background location and the live path | Apple/Google developer accounts, a physical phone |
| **5** | Photos: on-device library scan, stop suggestions, opt-in attach | device photo library |
| **6** | Trace sharing, share-page polish, cost reporting | — |

---

## Phase 1 — the core engine and a working multi-trip planner

**Goal.** The domain model of `ARCHITECTURE.md` §2 and the local-first client of §4, with the Europe 2026
itinerary loaded through both as the reference trip.

**Independently useful:** Jacob opens a browser, sees his real trip, creates a second one, edits days and
stops, sees them on a map, and gets a conflicts panel and a validation report the current HTML cannot give
him. It is also the tool that would have caught the Fisherman's Bastion typo.

### Deliverables

```
waypoint/
  package.json                  type:module; no runtime deps in core/client; devDep: typescript
  tsconfig.json                 strict, "erasableSyntaxOnly": true, "verbatimModuleSyntax": true
  packages/core/src/
    model/      types.ts ids.ts money.ts provenance.ts
    build/      createTrip.ts days.ts stops.ts bookings.ts pool.ts candidates.ts
    derive/     legs.ts cluster.ts cost.ts summary.ts display.ts
    conflict/   detect.ts resolve.ts rules/*.ts       (one file per rule in §2.7)
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
5. `apps/web`: trip library → day view → day map → conflicts panel → import/export.

**May be stubbed, called out in BUILD-NOTES:** drag-reorder (buttons suffice), the city map, duplicate and
rename, any new-trip wizard beyond title + dates. **May not be stubbed:** multi-trip switching, stop editing,
the day map, the conflicts panel, JSON import/export.

### Acceptance criteria — the numbers the tester will check

Loading the extracted legacy data through `importLegacyDays` MUST produce:

- 16 days, dense from `2026-08-07` to `2026-08-22`, `Day.id === Day.date` throughout
- 112 scheduled stops; 31 pool stops (vienna 8, dubrovnik 3, split 3, prague 8, budapest 6, london 3)
- 95 places (vienna 15, dubrovnik 12, split 15, prague 25, budapest 21, london 7)
- 5 multi-city days: `08-10 vienna+dubrovnik`, `08-12 dubrovnik+split`, `08-15 split+prague`,
  `08-18 prague+budapest`, `08-21 budapest+london`
- 3 days with `provenance.state === 'candidate'`; 21 stops with `displayStatus() === 'suggested'`
- 7 stops carrying a `Ticket`, 2 of them `kind:'bundled'`
- 81 stops with an `arrival` override; 49 with a non-null `cost`
- `cityRange()` reproduces the six hardcoded `CITY_RANGE` strings exactly
- `computeLegs` reproduces the live app's minutes and kilometres for all 16 days (golden file)
- `rollUpCost(day)` reproduces the live app's `dayCost()` string for all 16 days (golden file), including
  that badge-only "free" stops contribute nothing
- `toJSON(fromJSON(toJSON(trip)))` is byte-identical
- `returnToPool` then `scheduleFromPool` restores a stop to the same day, time and position, losslessly
- `validateTrip` returns exactly the golden issue list, including the known warts of §2.11
- `detectConflicts` returns exactly the golden conflict list — the two `legacy_flag` blockers (Aug 18,
  Aug 20), the `superseded_booking` note for YZGDTS, the two `unverified_reference` warnings — and **does
  not** fire `booking_vs_plan` for Aug 15, which is a resolved agreement
- conflict ids are stable across a no-op re-import and **change** when the Aug 18 flight time is edited

And in the client, without a browser:

- every action dispatches to exactly one core build function; the reducer contains no domain logic
- `ui` state never appears in a persisted document (assert on the saved bytes)
- `derived` is recomputed on `doc.revision` change and never read stale
- undo/redo restores the previous `Trip` exactly, to a depth of 50
- a failing `StoragePort.save` puts `persistence.status = 'error'` and never drops the edit silently
- two trips in the library do not leak state into each other when switching

### What the tester should attack (plain `node`, no network)

Zero-day trip · end date before start date · a day with zero stops · a stop with `PlaceLink {kind:'none'}`
through legs, clusters, cost and validation · two stops at the same time · `time: null` · an overnight leg
(LAX 16:45 → FRA 13:00+1) · a day spanning 621 km (Aug 8 — `focusCluster` must return the Vienna cluster)
and a day on one street (`fitSpanKm` must not fall below `MIN_SPAN_KM`) · a ±1° latitude typo (`geo_outlier`
must fire) · CZK and GBP costs with no rate table (`missingRates`, never a silent conversion) · the Danube
cruise's per-party price mixed with per-person amounts (`basisWarnings`) · two bookings with the same
reference and different dates (`superseded`, not `duplicate`) · malformed JSON, truncated JSON,
`schemaVersion: 99`, unknown enum values · unicode and emoji names (Vyšehrad, Széchenyi, Jiráskovo náměstí)
surviving a round-trip · `displayStatus` — assert **nothing un-accepted and non-user ever returns `'own'`** ·
input immutability after every build function · storage port failures, quota-exceeded, and a corrupted
document in the library.

### Explicitly not in Phase 1

No HTTP, no database, no accounts, no auth enforcement. No location, photo or email code — those directories
do not exist yet. No timezone handling. No sub-maps (Lokrum). No currency conversion. No native app.

---

## Phase 2 — server, accounts, the social graph, and share links

**Ships:** `services/api` (Node 24, Postgres, RLS, managed auth and object storage), `packages/client` gains
a `SyncPort`, sign-in, multi-device sync, friends, per-trip shares (`viewer/commenter/editor`), `forkTrip`,
`importStop`, ticket upload, and **public share links a friend opens in a browser without installing
anything** — the web companion's other job per Jacob's answer.

**Independently useful:** Jacob's trips stop living in one browser, and his friends can see them.

Entry: Phase 1 shipped. Exit: the access conformance matrix (core predicates vs RLS policies, every
principal × relationship × operation cell) passes; a revoked share hard-fails on a cached client, offline;
the deletion cascade of §6.3 passes an orphan sweep; a full account export produces a readable zip.

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

Exit: a confirmation email produces a candidate; accepting writes a `Booking` with
`{source:'email', confidence:'confirmed'}`; the Smartwings reissue is presented side by side and never
applied automatically; no raw message body survives 24 hours; ingest's database role cannot write a stop
(prove it by trying).

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

Timezones (§7) are resolved here: a live "up next" across a border needs real instants.

---

## Phase 5 — photos

**Ships:** on-device library enumeration by trip window, EXIF/location read, `suggestPhotoStops` scoring in
core, a suggestion queue, and opt-in attach with EXIF GPS stripped on upload (§5.4).

**Independently useful:** "here are 40 photos from Aug 13, and here is the stop you were standing at" is the
pillar-5 payoff and needs nothing from Phase 6.

Watch item: Android `ACCESS_MEDIA_LOCATION`. Without it coordinates come back empty *with no error*, which
will look like a matching bug and is a manifest bug.

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
   the repo root are Jacob's working app; Waypoint reads them and never writes them, in any phase, until
   Jacob says the replacement is better.
