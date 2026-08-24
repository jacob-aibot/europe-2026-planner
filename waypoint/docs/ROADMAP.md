# Waypoint — Roadmap

Phased delivery. Every phase ships something usable on its own. Phases 1 and 2 need no device, no cloud
account, no API keys and no network. Later phases may assume all of them.

Companion to `ARCHITECTURE.md`; section references below point into it.

| Phase | Ships | New external dependency |
|---|---|---|
| **1** | `packages/core` + the Europe 2026 trip loaded through it + a CLI that reports on a real trip | none — Node 24 only |
| **2** | `apps/web`: read/edit any trip in a browser, local-first, static hosting | none |
| **3** | `services/api` + Postgres/RLS: accounts, sync, friends, shares, imports | a managed Postgres/auth/storage account |
| **4** | `services/ingest`: mailbox → candidate review queue → tickets | Gmail OAuth **or** a forward-in address (a decision for Jacob) |
| **5** | `apps/mobile` (Expo): offline trip, then background location and the live path | Apple/Google developer accounts, a physical phone |
| **6** | Photos: on-device library scan, stop suggestions, opt-in attach | device photo library |
| **7** | Public share pages, simplified trace sharing, polish | — |

---

## Phase 1 — the core engine and a real trip through it

**Goal.** The domain model of `ARCHITECTURE.md` §2, implemented, plus the Europe 2026 itinerary loaded
through it as the fixture, plus a CLI that makes it useful to a human today.

**Independently useful:** `node waypoint/cli.ts` prints Jacob's real trip — a day, its legs, its cost roll-up,
its conflicts, and a validation report. That is a working answer to "what is wrong with my itinerary" that
the current HTML cannot give, and it is the tool that would have caught the Fisherman's Bastion typo.

### Deliverables

```
waypoint/
  package.json                     type:module, no runtime deps; devDep: typescript only
  tsconfig.json                    strict, "erasableSyntaxOnly": true, "verbatimModuleSyntax": true
  packages/core/src/
    model/          types.ts ids.ts money.ts provenance.ts
    build/          createTrip.ts days.ts stops.ts bookings.ts pool.ts candidates.ts
    derive/         legs.ts cluster.ts cost.ts summary.ts display.ts
    conflict/       detect.ts resolve.ts rules/*.ts        (one file per rule in §2.7)
    validate/       validateTrip.ts
    serialize/      toJSON.ts fromJSON.ts migrate.ts
    import/         legacyDays.ts
    index.ts        the export surface in §2.10 — nothing else is public
  packages/core/test/               *.test.ts, node:test only
  tools/extract-legacy.mjs          reads europe-2026-itinerary.html READ-ONLY
  fixtures/europe2026.legacy.json   committed output of the extractor
  fixtures/europe2026.bookings.json hand-transcribed from docs/BOOKINGS.md
  fixtures/golden/*.json            expected legs, costs, clusters, conflicts, validation
  cli.ts                            trip show | day <date> | conflicts | cost | validate | export
```

### Hard constraints on the builder

- **Zero runtime dependencies in `core`.** No date library, no zod, no lodash. `fromJSON` hand-validates and
  throws `TripParseError` with a JSON path.
- **Runs on Node 24 with no build step**: `node --test packages/core/test/*.test.ts` must work directly via
  type stripping. That bans enums, parameter properties, namespaces and `declare` fields from core —
  `erasableSyntaxOnly` will tell you.
- **No `Date.now()`, no `Math.random()`, no `crypto.randomUUID()` inside core logic.** Clock and `IdFactory`
  are injected. Deterministic output is what makes golden files possible.
- **`europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root are read-only.** The extractor reads;
  nothing writes. Same for `docs/BOOKINGS.md` — transcribe it into a fixture, do not edit it.
- Every exported function gets a doc comment stating whether it is pure and what it throws.

### Acceptance criteria — the numbers the tester will check

Loading `fixtures/europe2026.legacy.json` through `importLegacyDays` MUST produce:

- 16 days, dense from `2026-08-07` to `2026-08-22`, `Day.id === Day.date` for all of them
- 112 scheduled stops; 31 pool stops (vienna 8, dubrovnik 3, split 3, prague 8, budapest 6, london 3)
- 95 places (vienna 15, dubrovnik 12, split 15, prague 25, budapest 21, london 7)
- 5 multi-city days: `08-10 vienna+dubrovnik`, `08-12 dubrovnik+split`, `08-15 split+prague`,
  `08-18 prague+budapest`, `08-21 budapest+london`
- 3 days with `provenance.state === 'candidate'` (the `sugDay` days) and 21 stops with
  `displayStatus() === 'suggested'`
- 7 stops carrying a `Ticket`, of which 2 are `kind:'bundled'` (the FlixBus PDFs)
- 81 stops with an `arrival` override; 49 with a non-null `cost`
- `cityRange()` reproduces the six hardcoded `CITY_RANGE` strings exactly
- `computeLegs` reproduces the live app's minutes and kilometres for all 16 days (golden file)
- `rollUpCost(day)` reproduces the live app's `dayCost()` string for all 16 days (golden file) —
  including that badge-only "free" stops contribute nothing
- `toJSON(fromJSON(toJSON(trip)))` is byte-identical
- `returnToPool` then `scheduleFromPool` restores a stop to the same day, time and position, losslessly
- `validateTrip` returns exactly the golden issue list — including the known warts of §2.11 (mixed cost
  bases, 10 non-EUR display currencies, 2 unverified references)
- `detectConflicts` returns exactly the golden conflict list — including the two `legacy_flag` blockers
  (Aug 18, Aug 20), the `superseded_booking` note for YZGDTS, and the two `unverified_reference` warnings
  (IU1TUY, I54C9A) — and **does not** fire `booking_vs_plan` for Aug 15, which is a resolved agreement
- conflict ids are stable across a no-op re-import, and **change** when the Aug 18 flight time is edited

### What the tester should attack (plain `node`, no network)

Zero-day trip · a trip whose end date precedes its start · a day with zero stops · a stop with
`PlaceLink {kind:'none'}` through legs, clusters, cost and validation · two stops at the same time · a stop
with `time: null` · an overnight leg (LAX 16:45 → FRA 13:00+1) · a day whose stops span 621 km
(Aug 8, Frankfurt→Vienna — `focusCluster` must return the Vienna cluster) and one spending the whole day on
one street (`fitSpanKm` must not fall below `MIN_SPAN_KM`) · a latitude typo of ±1° (`geo_outlier` must fire —
this is the Fisherman's Bastion case) · CZK and GBP costs with no rate table (`missingRates`, never a silent
conversion) · the Danube cruise's per-party price mixed with per-person amounts (`basisWarnings`) · two
bookings with the same reference and different dates (`superseded`, not `duplicate`) · malformed JSON,
truncated JSON, a `schemaVersion` of 99, unknown enum values · unicode and emoji names (Vyšehrad, Széchenyi,
Jiráskovo náměstí) surviving a JSON round-trip · a candidate stop rendered by `displayStatus` — assert that
**nothing un-accepted and non-user ever returns `'own'`** · mutation attempts (assert the input `Trip` is
untouched after every build function).

### Explicitly not in Phase 1

No UI of any kind. No HTTP. No database. No auth. No location, photo or email code — not even stubs; those
directories do not exist yet. No timezone handling (§6). No sub-maps (Lokrum). No currency conversion.

---

## Phase 2 — the web app

**Ships:** `apps/web`, a browser app that opens a trip JSON (file or bundled), renders it at parity with the
Europe 2026 planner — day view, city tabs, maps, cost roll-up, conflict cards — and **edits** it: add, move,
retime, reorder stops, pool↔plan, resolve a conflict, export back to JSON. Local-first: IndexedDB, no server.
Deployable as static files, which means Jacob can use it the day it exists.

**Independently useful:** it replaces the hand-edited HTML for *new* trips, and it does the thing the current
app can't — a second trip.

Entry: Phase 1 accepted. Exit: the Europe 2026 fixture renders with no data loss versus the live page, and
every mutation round-trips through `toJSON`.

Notes: the map layer takes bounds from `focusCluster`/`fitSpanKm`, never computes its own, and re-fits on tab
activation — both live bugs from `CLAUDE.md` are inherited from core rather than reintroduced. Ship it as an
installable web app: per §1.1 a home-screen web app keeps its storage, whereas a tab is evicted after 7 days.

---

## Phase 3 — server, accounts, and the social graph

**Ships:** `services/api` (Node 24, Postgres, row-level security, managed auth and object storage),
`packages/client` (typed client, offline cache, sync queue), sign-in, multi-device sync, friends, per-trip
shares with `viewer/commenter/editor`, `forkTrip`, `importStop`, ticket upload.

**Independently useful:** Jacob's trip stops living in one browser, and his friends can see it.

Entry: Phase 2 accepted. Exit: the access-policy conformance test (core predicates vs RLS policies, full
matrix) passes, and a revoked share hard-fails on a cached client, offline.

Deliberate: sharing sends a snapshot, not a live feed (§4.2). Deliberate: `services/ingest`'s database role is
created here, with no write grant on trip tables, before there is any ingest code to use it.

---

## Phase 4 — mailbox ingestion

**Ships:** `services/ingest`, the `IngestCandidate` review queue, per-operator parsers seeded from the real
mail in this trip (Condor, Ryanair, FlixBus, Smartwings/Amadeus, Booking.com, GetYourGuide), reissue-vs-duplicate
detection, and ticket attachment storage on acceptance.

**Independently useful:** the review queue on its own — "here are 6 things I found in your mail, accept or
reject" — is the feature, even before it is smart.

**Gate — a decision for Jacob before this phase starts.** Gmail restricted-scope access requires Google
verification plus a CASA Tier 2 assessment (≈$540–$1,000, 4–12 weeks); the unverified path caps at 100 users
and expires refresh tokens every 7 days, which breaks unattended polling (§1.1, §4.1).

- **(a)** Ship on the unverified path and accept a weekly re-consent tap. Free, immediate, slightly annoying.
- **(b)** Start CASA now and pay. Correct end state, adds 1–3 months before anything works.
- **(c)** **Recommended first version:** a forward-to-an-address inbox — Jacob forwards a confirmation, the
  parser runs, a candidate appears. No OAuth, no refresh tokens, no restricted scopes, no assessment, and it
  exercises every parser and the whole review queue. OAuth then becomes an upgrade, not a prerequisite.

Exit: a confirmation email produces a candidate; accepting it writes a `Booking` with
`provenance {source:'email', confidence:'confirmed'}`; the Smartwings reissue scenario is presented as a
side-by-side reissue and never applied automatically.

---

## Phase 5 — the native app and the live path

**Ships:** `apps/mobile` on Expo SDK 56. Split in two, shipped in order:

- **5a — offline trip.** The trip on a phone, fully offline, `expo-sqlite`-backed, syncing when there is
  signal. Useful on its own: this is the version Jacob actually travels with, and it is the one that would
  have survived the flaky-hotel-wifi cases in `HISTORY.md`.
- **5b — background location.** `expo-location` + `expo-task-manager`, iOS `UIBackgroundModes: location`,
  Android foreground service, fixes to encrypted local SQLite, `segmentTrace()` in core, gaps rendered as
  gaps (§4.3). Nothing uploaded. Opt-in per-day trace sharing lands here or in Phase 7.

Entry: Phase 3 accepted (the app needs sync). Requires developer accounts and a physical device — the first
phase where the tester cannot work from plain Node, so 5b must land with a recorded-fixture test path
(a canned fix stream through `segmentTrace`) that *is* testable in Node.

Timezones (§6) get resolved here: a live "up next" across a border needs real instants.

---

## Phase 6 — photos

**Ships:** on-device library enumeration by trip window, EXIF/location read, `suggestPhotoStops` scoring in
core, a suggestion queue, and opt-in attach with EXIF GPS stripped on upload (§4.4).

**Independently useful:** "here are 40 photos from Aug 13, and here is the stop you were standing at" is the
pillar-5 payoff and needs nothing from Phase 7.

Watch item: Android `ACCESS_MEDIA_LOCATION`. Without it coordinates come back empty with no error, which will
look like a matching bug and is a manifest bug.

---

## Phase 7 — sharing surfaces and polish

Public share pages (their own permission attack pass — the one surface where a mistake is publicly visible),
opt-in simplified trace sharing if it did not land in 5b, a proper trip-level cost report with a stored
`rateSetId`, and whatever the earlier phases proved was missing.

---

## Sequencing rules

1. **Nothing skips Phase 1.** Every later phase consumes `packages/core`; a second implementation of legs,
   costs or conflicts anywhere is a design defect, routed back to the architect.
2. **No phase begins before the previous one has a manager verdict of SHIP.** A phase built on an unverified
   phase is where the pipeline stops being worth having.
3. **Privacy invariants (§5) are tested every phase, not audited at the end.** From Phase 3 onward the
   tester's brief includes grepping for coordinates and mailbox content in logs, requests and database rows.
4. **The live planner stays untouched throughout.** `europe-2026-itinerary.html`, `docs/` and `tickets/` at the
   repo root are Jacob's working app; Waypoint reads them and never writes them, in any phase, until Jacob
   says the replacement is better.
