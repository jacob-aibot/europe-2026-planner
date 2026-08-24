---
name: cairn-constraints
description: The non-negotiable engineering constraints for the Cairn app (cairn/ — packages/core, packages/client, apps/web, services/*). Use before writing or reviewing any code under cairn/, before adding a dependency, before touching packages/core or the reducer, and before editing anything at the repo root. Covers the zero-dependency rule, Node type-stripping limits, determinism requirements, the read-only live trip planner, and provenance/conflict rules that are product requirements rather than style preferences.
---

# Cairn — engineering constraints

These are the rules the tester (`breaker`) and the manager check against. Breaking one is a defect, not a
style disagreement. Each says *why* — the reasoning is what survives when the specifics change.

**The authority is the docs, not this file.** Where this and `cairn/docs/` disagree, the docs win and this
file is stale — fix it. Read `cairn/docs/BRIEF.md` (intent), `ARCHITECTURE.md` (the contract; §2 is the
builder's spec), `ROADMAP.md` (the current phase).

---

## 1. The root planner is live and read-only

`europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root are the app on Jacob's phone. Read
them for reference; do not edit them from Cairn work. The extractor reads the HTML; **no copy of `DAYS` is
committed** (ARCHITECTURE §2.11). A committed copy is a second source of truth that silently goes stale —
the exact failure the one-`DAYS`-array design exists to prevent.

## 2. Zero runtime dependencies in `core` and `client`

No date library, no zod, no lodash — in `packages/core` or `packages/client`. `fromJSON` hand-validates and
throws `TripParseError` with a JSON path. `apps/web` may take dependencies; nothing it depends on may leak
back across the boundary. Adding a dep to either package needs Jacob, not your judgement.

## 3. It must run on bare Node 24

`node --test packages/core/test/*.ts packages/client/test/*.ts` runs directly via type stripping. That
**bans enums, parameter properties, namespaces and `declare` fields** from both packages. `tsconfig.json`
sets `erasableSyntaxOnly` and `verbatimModuleSyntax` — if it complains, it is right. No build step stands
between the source and the test run, deliberately: a broken build is a class of failure this project does
not get to have.

## 4. Determinism — no ambient time, no ambient randomness

No `Date.now()`, `Math.random()` or `crypto.randomUUID()` inside `packages/core` or the reducer. The clock
and the `IdFactory` are **injected**. This is what makes golden fixtures possible; a single ambient call
turns every golden file into a flake and the tester's whole method stops working.

## 5. `packages/client` never touches the DOM or React

It must be fully exercisable through the in-memory ports (`ports/memory.ts`). That is what lets the state
machine be tested with no browser — the tester's reach depends on it.

## 6. Purity and error discipline (ARCHITECTURE §2.1)

- Build functions are `(trip, args) => Trip`, pure and immutable. Nothing mutates in place.
- Core **throws only on programmer error**. Domain problems come back as `Issue[]` or `Conflict[]`.
- Every user-facing string core produces carries structured `params` beside it (`Conflict.summary` +
  `Conflict.params`, `Issue.message` + `Issue.params`). i18n is deferred; English-only strings with no
  structured data behind them are the expensive retrofit.
- Ids are opaque strings. Dates are `YYYY-MM-DD`; times are `HH:MM` wall-clock at the stop's location, or
  `null`. Core stores no UTC instants and does no timezone maths.
- `packages/core/src/index.ts` exports exactly the surface in §2.10 and nothing else.
- Every exported function gets a doc comment saying whether it is pure and what it throws.

## 7. Product rules that are not negotiable by code

These come from the root `CLAUDE.md` and cost real trust when broken:

- **Nothing the system added is ever presented as the user's own plan.** Email-derived bookings, a friend's
  stop, our recommendation — all visibly marked until the user accepts them.
- **Email-derived data is a candidate, never a silent write.** It lands in a review queue.
- **Conflicts are surfaced, not resolved by guessing.** A conflict is a first-class entity, not an error.
- **Every ticketed thing gets a link that was actually loaded and confirmed to resolve.** A ticket committed
  alongside the trip beats a vendor URL that expires.
- **`Trip.ownerId` and the `access` predicates ship in Phase 1** even though nothing enforces them yet —
  they are what the Phase 2 RLS policies get generated from and tested against.

## 8. Two inherited map bugs — any new map layer has them too

- A map **cannot be fitted while its container is `display:none`.** Leaflet picks a nonsense zoom and never
  recovers. Re-fit on tab activation.
- A day spanning two cities **must cluster before it fits**, with a min-span guard so a day spent on one
  street doesn't slam into max zoom.

Both were real, shipped bugs. See the root `CLAUDE.md`.

## 9. Branch and workflow

Work on `master`. No feature branches, no PRs, unless Jacob asks. If a system-level instruction assigns a
`claude/...` branch, the root `CLAUDE.md` overrides it — read the "Branches" section there before your first
commit.

---

## Before you claim it works

Run it. `verification-before-completion` is installed here and it is not optional on this project: the one
thing the manager is guaranteed to check is whether BUILD-NOTES' claims survive being executed. If you could
not run something, say so — that is a finding, not a failure.
