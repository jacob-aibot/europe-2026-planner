# Product

<!-- impeccable:product-schema 1 -->

**Status: durable product truth for Impeccable. Written 2026-09-02 by the architect pass that
carried Jacob's visual-direction ruling.**

**How this file was filled, stated plainly.** Impeccable's `init` requires an interview with the
user before writing this file, and its boot output says the mechanical test for "can anyone answer"
is whether a structured question tool exists in the tool surface. **It does not in this session** —
this pass runs as a sub-agent whose tools are file, shell and web only. Per `reference/init.md`
step 3 the substitution is therefore: **every fact below is inferred from committed project truth**
— `cairn/docs/BRIEF.md`, `cairn/docs/PRODUCT-VISION.md` (which holds Jacob's own words verbatim in
Appendix A), the root `CLAUDE.md`, and **Jacob's 2026-09-02 visual-direction ruling**, quoted in
`cairn/docs/design/REFERENCE-BOARD.md`. Nothing here is invented. Facts that are an *inference*
rather than a quote are marked **(inferred)**. Nothing in this file is a visual decision; visual
authority lives in `docs/design/REFERENCE-BOARD.md` and `docs/DESIGN.md`.

## Platform

web

*(Today. `BRIEF.md` settles that the end state is **native app plus web companion** — Expo/React
Native owns background location and the photo library, a web app covers desktop planning and share
links. `apps/mobile` does not exist yet, so the platform value that binds current design work is
`web`. When `apps/mobile` is created this becomes `adaptive` and `ios.md`/`android.md` load.)*

## Users

One primary user today: **Jacob**, planning and then travelling a real multi-city trip, and — after
2026-08-27's product thesis — **re-reading trips he has already taken**. The situation is a phone in
one hand, often on the move, often on a bad connection. The job is not "manage a project": it is
*know what is happening today, and keep what already happened.*

Second audience, not yet built: **friends**, who browse someone else's itinerary read-only and copy a
single stop into their own trip. `BRIEF.md` settles that whole-trip import is **not** the sharing
primitive and that friends build their own itineraries in the app.

## Product Purpose

Cairn is **the persistent record of a person's travel life**, not a planner that expires. The loop is
Discover → Plan → Travel → Document → Share → build history → discover through the network
(`PRODUCT-VISION.md`). A trip does not end when the itinerary ends: past trips are first-class, a
completed trip stays useful, and everywhere you have been accumulates into one map and one travel
identity.

Success, concretely: a finished trip is the **most valuable content in the product**, not an archive
row; and a new user does not start empty.

## Positioning

Two things a neighbouring product could not truthfully copy:

1. **The record is honest about its own holes.** Cairn counts what it can attribute and *says* what it
   could not — "18 of 222 located records could not be matched to a country, so they are counted in
   nothing above." No competitor's travel-stats screen admits its own denominator.
2. **Planned and observed travel stay distinguishable.** Observation never overwrites a plan; a `Visit`
   is not a mutation of a `Stop`. Every other product in the category collapses these.

## Operating Context

- Phone-first, one-handed, on the move, offline-capable. Phase 2 is **local-first**: an
  IndexedDB-backed client with no server and no network font/tile dependency.
- Desktop is the planning and editing surface — real keyboard, more content visible at once.
- The trip that exercises the product is real: LA → Vienna → Dubrovnik → Split → Prague → Budapest →
  London → LA, 7–22 Aug 2026, 16 days, 112 stops, 95 places, 21 bookings, overnight legs, multi-city
  days and two deliberately unresolved booking conflicts.

## Capabilities and Constraints

**Built and shipped** (Phase 1 + Phase 2 to I-8b): multi-trip library; a day/stop/place/booking
domain model in a zero-dependency `packages/core`; cost roll-up; conflict detection with deliberate
non-resolution; geographic clustering; a country-attribution index over Natural Earth 110m/10m/50m
polygons; travel history and lifetime stats; a country-shape world map; stop-level copy with
provenance; export/import of the user's own document; undo/redo.

**Modelled and not built:** photos, mailbox ingestion, location traces, participants, connections,
location-sharing permissions, goals.

**Hard constraints that bind design:**

- `packages/core` and `packages/client` have **zero runtime dependencies**, no DOM, no React.
- **Local-first and offline.** No CDN font, no map tile service, no network call on a render path.
- **The world map's geometry is closed** — clustering, framing, extent, pane order and tie-break are
  settled (`ARCHITECTURE.md` §4.4 A-40…A-54) and are **measurement-free by ruling**: nothing measures
  a container to decide a frame. A design pass owns how the map sits in a page; it does not own the
  frame.
- **Dark mode is in the contract**, not optional; every token has both values.
- The Europe 2026 planner at the repo root is a **live app on Jacob's phone and is read-only** to
  Cairn.

**Terminology that is product truth, not naming preference:** `Trip`, `Day`, `Stop`, `Place`,
`Booking`, `Leg`, `Conflict`, `Candidate`, `Visit`, `Participant`, `Connection`, `provisional`,
`unattributed`, `planned`/`active`/`completed`.

## Brand Commitments

- **Working name "Cairn"** — Jacob's own note says placeholder, not yet chosen.
- **Binding visual constraint, volunteered by Jacob and recorded without expansion**: the **Cairn
  Visual Reference Board** of 2026-09-02, weighted — Polarsteps primary, then Cosmos, Airbnb Where
  To/Trips, AllTrails/Strava, Apple Journal, editorial travel photography. Its full text and weighting
  live in `docs/design/REFERENCE-BOARD.md`. Jacob's closing line: *"maps carry the story; photography
  supplies emotion; interface stays calm, legible, and premium."*
- **Jacob's visual approval is required before broad UI implementation.** A passing test suite is not
  visual approval and an agent's SHIP verdict is not visual approval.

## Evidence on Hand

Real, in the repository:

- `apps/web/src/sample/europe2026.json` — the real Europe 2026 trip, generated from the live planner
  and **redacted** (door PINs, booking references and ticket URLs never reach a build artifact).
- `packages/core/src/geo/countries.gen.ts` — 239 ISO codes, 1033 rings, 22 220 points of real
  Natural Earth admin-0 geometry, public domain, pinned to `nvkelso/natural-earth-vector@v5.1.2`.
- Real city coordinates for the six trip cities; real stop coordinates for 112 stops.
- `qa/i8b-render.mjs`'s reference library — a **development fixture**, not Jacob's actual history:
  Central Europe 2019, Croatia 2022, London 2026, Japan 2027.

**Absences future work must not fabricate:**

- **There are no photographs.** No `PhotoAsset`, no library access, no photo pipeline until Phase 6.
- There are no achievements, streaks, badges or goals.
- There are no friends, no connections, no shared trips, no participants.
- There is no live location, no route trace, no distance-by-mode.
- `TripSummaryRow` carries **no city coordinate** — past trips recorded through the past-trip form are
  attributable to a **country**, not to a point. Pinning them to a city coordinate would be fabricated
  precision.

## Product Principles

1. **His content outranks our aesthetics.** Anything the system produced — a copied stop, a mail
   candidate, a provisional country — is marked on screen until accepted, and the mark may never be
   the thing that makes the composition look better.
2. **A screen may only show what exists.** A screen that looks thin because the product is young is
   honest; a screen that looks rich because it invented content is a lie. When a surface feels empty
   the answer is composition, never invented content.
3. **Flag conflicts; do not resolve them by guessing.** A disagreement between two pieces of data is a
   first-class entity, not an error state.
4. **The past is alive, not archived.** `completed` is a status, never decay — never lower contrast,
   never smaller, never collapsed into a footer.
5. **The base product must be valuable before automatic location, social discovery or gamification
   exist.** *"Do not build continuous background tracking simply because it is part of the vision."*

## Accessibility & Inclusion

Established and measured, not aspirational: WCAG 2.2 AA on body text (4.5:1) and 1.4.11 (3:1) on
non-text graphics, **in both colour schemes**; a 24 × 24 CSS px hard floor and a 44 × 44 primary
target floor on every pointer target; visible focus on every focusable element in both schemes; tab
order equals visual order; no content or control reachable only on `:hover`; full keyboard operation
of the tab bar and of every interactive map shape; `prefers-reduced-motion: reduce` honoured
everywhere; an 11 px rendered-text floor; no clipping or loss of function at 200 % zoom on a 390 px
viewport; `env(safe-area-inset-*)` respected under `viewport-fit=cover`.
