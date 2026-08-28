# Europe 2026 — Trip Planner + Cairn

A single self-contained HTML trip planner for Jacob's Aug 7–22, 2026 Europe trip
(LA → Vienna → Dubrovnik → Split → Prague → Budapest → London → LA), plus Cairn — the same planner
generalised into a multi-trip, multi-person product, built in `cairn/`.

## Branches — read this before your first commit

`master` is the canonical project branch. Work must ultimately land on `master`; do not silently leave completed work only on a temporary `claude/*` branch.

Some sessions may provide higher-priority instructions requiring work on a temporary branch. Those instructions take precedence over this file. In that situation, use the required branch while working, but do not treat it as the canonical project state or leave Jacob's completed work stranded there.

If a higher-priority instruction prevents merging or pushing the completed work to `master`, stop and tell Jacob rather than silently treating the temporary branch as shipped.

This repo has previously suffered from Cairn work existing only on an orphaned `claude/*` history while `master` remained stale. Avoid repeating that failure: before declaring work complete, verify that the canonical `master` lineage contains the work being reported as complete.

## Repo

```
europe-2026-itinerary.html   the entire app — one file, no build step
docs/BOOKINGS.md             flights, prices, and the unresolved open items
docs/HISTORY.md              why things are the way they are
docs/PLANNER.md              the DAYS data model, PWA quirks, and how to verify a planner edit
docs/EMAIL-ROUTINE.md        the "check email" workflow and its Gmail/attachment constraints
cairn/                       the Cairn app — this planner, generalised into a product
cairn/CLAUDE.md              Cairn-specific rules, the four-agent pipeline, and delegation/routing
```

Open the HTML by double-clicking it. There is no dev server, no package.json, nothing to install.

## The read-only boundary

`europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root are the live app on Jacob's phone.
**Cairn reads them, never writes them** — no copy of `DAYS` is ever committed under `cairn/`. This is the
one rule that must never drift between the two halves of this repo; everywhere else it is stated, treat it
as a pointer back to this paragraph, not an independent copy.

## Conventions — apply everywhere in this repo

- **Never present my suggestions as Jacob's/the user's own plan.** Anything not from the source of truth (his spreadsheet for the planner, an accepted booking for Cairn) stays visibly marked as ours until accepted — a `suggested` badge, a dimmed card, an explicit note. His content is authoritative and outranks our ideas, including his pacing choices.
- **Flag conflicts, don't resolve them by guessing.** Where the plan and the bookings (or two pieces of data) disagree, build around the hard constraint and surface the conflict visibly — don't silently pick a side.
- **Prompt for actions rather than mentioning them.** When something needs Jacob's input, ask directly instead of burying it in prose.
- **No unnecessary feature branches or PRs.** Default to working directly on `master`; when a higher-priority instruction requires a temporary branch, follow **Branches** above — get the work onto `master` rather than leaving it stranded there.
- **Be concise.** No preamble, no restating the request.

## Where to read next

- Editing the itinerary (`DAYS`, a stop, a booking link)? Read `docs/PLANNER.md` first.
- Jacob said "check email"? Read `docs/EMAIL-ROUTINE.md` — the incremental-scan rule and the Gmail account/attachment constraints live there.
- Working in `cairn/`? Read `cairn/CLAUDE.md` — the pipeline, the doc-cost map, and when to delegate.
- Before changing planner content of any kind: `docs/BOOKINGS.md` holds the confirmed flight refs and two **deliberately unresolved** conflicts. Don't "fix" them by picking a side.
