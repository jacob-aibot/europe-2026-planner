# Cairn — build notes, Phase 1

For the breaker and the manager. What is built, how to run it, what is stubbed, and what I
could not verify.

Phase 1 is **complete against `ROADMAP.md`**: the core engine, the local-first client, and
`apps/web`. Nothing on the "may not be stubbed" list is stubbed.

---

## How to run it

```bash
cd cairn
npm install
npm test          # 69 tests: 42 core, 27 client. Plain node, no browser, no network.
npm run typecheck # two projects — see "Why two tsconfigs"
npm run cli -- trip           # headline counts and city ranges
npm run cli -- day 2026-08-13 # one day: stops, legs, costs, badges
npm run cli -- conflicts      # the conflicts panel as text
npm run web:dev   # http://localhost:5173
npm run web:build && npm run serve   # production build on http://localhost:4173
```

`npm run golden` regenerates `fixtures/golden/*.json`. Only run it when you have decided the
new output is correct — that is the whole point of the files.

## What actually runs

| Piece | State |
|---|---|
| `packages/core` | Complete. Model, build, derive, conflict (11 rules), validate, access, serialize, legacy import. |
| `packages/client` | Complete. Store, reducer, ports, selectors, derived cache. 27 tests. |
| `packages/tokens` | Complete — colours, category labels, mode icons, status badges. |
| `apps/web` | Complete for Phase 1. Library, day view, day map, conflicts, validation, pool, places, import/export. |
| `cli.ts` | Complete. |
| `tools/extract-legacy.mjs` | Reads the live planner READ-ONLY. |
| `tools/gen-sample.mjs` | Builds the web app's sample trip at build time. Output is gitignored. |
| `tools/serve.mjs` | Zero-dependency static server for `apps/web/dist`. |
| `tools/doc-section` | Prints one section of a docs file. Read before opening ARCHITECTURE.md whole. |

## Verified, by running it

`npm test` — 69 pass. `npm run typecheck` — both projects clean. `npm run web:build` — clean.

Against the live planner, through `importLegacyDays`: **16 days, 112 scheduled stops, 31
pooled, 95 places, 21 bookings**, six city ranges reproduced. Conflicts: 12 blockers, 4
warnings, 11 notes. Validation: 1 error, 30 warnings.

`apps/web` was driven in a real Chromium (Playwright), 17 steps, all passing: the sample
loads; all 16 days are reachable; the day map mounts with pins and the journey polyline;
the timeline renders legs, times, costs, badges and inline conflicts; adding a stop through
the editor works; the save indicator reaches "Saved"; and the edit survives a page reload
out of IndexedDB. Acknowledging a conflict writes a resolution and does **not** auto-fix.

**The Aug 8 map bug is structurally fixed, and I measured it**: that day's whole-day span is
621 km, its focus cluster's span is 19.5 km centred on 48.196, 16.400 — Vienna. The map opens
on the cluster, with a "Whole day's journey" toggle for the full hop. `MIN_SPAN_KM` is 1.2.

## Defects found and fixed during this pass

1. **UI state leaked across a trip switch.** `createTrip` and `adoptTrip` spread the previous
   trip's `ui` into the new one, so a selected stop and an open panel followed you between
   trips — directly against the acceptance criterion. `openTrip` and `importDoc` were already
   correct. Both now reset, and both drop the outgoing trip's derived cache.
2. **A day could be unreachable from the sidebar.** Aug 7 is `cities: ['transit']`, and
   `transit` is not one of the trip's six cities, so the spine silently omitted the first day
   of the trip. Any trip created with no cities hid *every* day. The spine now renders a
   catch-all group for days in no city tab, and orders groups by date so "In transit" sorts
   first rather than after London.
3. **`npm run typecheck` never passed.** `fixtures/loadEurope2026.mjs` is `.mjs` by design and
   had no declarations, leaving two implicit-`any` errors. Added `loadEurope2026.d.mts`.

## Stubbed — allowed by the roadmap, listed here as required

- **Drag-reorder.** Buttons (↑ ↓) instead, which the roadmap says is fine.
- **The city map.** `cityMapPoints` exists and is tested; no view mounts it. The Places panel
  is a list. The day map is the one that matters and it is real.
- **Duplicate and rename a trip.** Neither is wired to a control. `createTrip` + `importDoc`
  cover the underlying need; rename needs only a `setTripMeta` dispatch.
- **The new-trip wizard** is title + dates + a comma-separated city list, as permitted.

## Not verified, and why

- **Map tiles.** This sandbox has no route to `tile.openstreetmap.org`, so every tile request
  fails with `ERR_TUNNEL_CONNECTION_FAILED`. Leaflet mounts, panes exist, pins and the
  polyline render and bounds are applied — but nobody has seen a tile behind them. First thing
  to check on a real network.
- **Safari and iOS.** Everything was driven in Chromium. The storage-eviction and
  installed-web-app behaviour in ARCHITECTURE §1.1 is unverified on a device.
- **Quota exhaustion against real IndexedDB.** Covered in tests through the in-memory port's
  `failAll`; not provoked against a real browser quota.
- **`node --test` on Node 24.** The roadmap specifies Node 24; this environment is Node
  22.22.2, where type stripping is already unflagged and all 69 tests run. `engines` says
  `>=22.18`.

## Why two tsconfigs

`tsconfig.json` covers core, client, the tests and the CLI, and is deliberately strict Node
ESM (`module: NodeNext`, `erasableSyntaxOnly`, `verbatimModuleSyntax`) — that is what lets
`node --test` run the `.ts` files with no build step. `apps/web/tsconfig.json` extends it and
switches to bundler resolution with JSX. Merging them would mean weakening the first to
accommodate the second. `npm run typecheck` runs both.

## Objections to the design — none blocking

- **`TripSummaryRow` has no timestamp.** The library therefore cannot say "last edited", and
  sorts by start date. §2.10 is explicit about the export surface, so I did not add one, but
  a trip list without "recently opened" will feel wrong once there are more than a handful.
  Worth an architect decision rather than a builder's.
- **`cities: ['transit']` is a pseudo-city in the data.** The view now copes, but the import
  arguably ought to materialise a real `transit` city from `CITY_META` — the live planner has
  one, with a name and a flag. That changes golden files, so it is an architect call.
