# Europe 2026 Trip Planner

Interactive planner for a two-week Europe trip, Aug 7–22 2026.
LA → Vienna → Dubrovnik → Split → Prague → Budapest → London → LA.

**Open `europe-2026-itinerary.html` in any browser.** No install, no build step.

Features a sidebar spine (cities with their dates nested beneath), per-city
maps with booking links in the pins, and a day view that puts a numbered
route on a map beside a timeline showing transport mode and travel time
between every stop.

## Working on it with Claude Code

```bash
cd europe-2026
claude
```

`CLAUDE.md` loads automatically and explains the data model, the two
non-obvious map behaviours, and the project conventions. Read
`docs/BOOKINGS.md` before changing trip content — it holds the confirmed
flight refs and two deliberately unresolved conflicts.

## Layout

```
CLAUDE.md                    project memory — read automatically by Claude Code
europe-2026-itinerary.html   the entire app
docs/BOOKINGS.md             flights, prices, open items
docs/HISTORY.md              why things are the way they are
cairn/                       Cairn — this planner generalised into a product (in progress)
```

## Cairn

`cairn/` holds the brief, architecture and roadmap for turning this single-trip planner into a
multi-trip, multi-person product. Nothing in it changes the planner above, which stays a single
self-contained HTML file. See `cairn/docs/BRIEF.md`.
