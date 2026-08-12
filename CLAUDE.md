# Europe 2026 — Trip Planner

A single self-contained HTML trip planner for Jacob's Aug 7–22, 2026 Europe trip.
LA → Vienna → Dubrovnik → Split → Prague → Budapest → London → LA.

## Repo

```
europe-2026-itinerary.html   the entire app — one file, no build step
docs/BOOKINGS.md             flights, prices, and the unresolved open items
docs/HISTORY.md              why things are the way they are
```

Open the HTML by double-clicking it. There is no dev server, no package.json, nothing to install.

## Before you change anything

Read `docs/BOOKINGS.md`. It holds the confirmed flight refs and, more importantly, **two conflicts that are deliberately unresolved**. Don't "fix" them by picking a side.

## Architecture

Everything renders from a single `DAYS` array in the `<script>` block at the bottom of the HTML. City tabs and the day view both read from it, which is what keeps them from drifting apart.

**Edit the data, not the markup.** If you find yourself hand-writing a `<div class="day">`, you're doing it wrong.

```js
{ id:"08-13", dow:"Thu", d:13,
  city:"split",              // primary city — drives sidebar grouping
  cities:["split"],          // every city tab this day appears under
  title:"...", sub:"...",
  flag:true,                 // red card + red dot in the sidebar
  sugDay:true,               // "my addition" — dims the card
  stops:[ {
    t:"07:00",
    n:"Speedboat pickup",
    cat:"trip",              // sight|food|night|suggest|trip|transit|stay
    lat:43.5060, lng:16.4400,
    note:"...",
    cost:"€90–113",          // display string
    c:[90,113],              // numeric [lo,hi] — feeds the daily cost roll-up
    book:{l:"Book the tour ↗", u:"https://..."},
    move:{mode:"speedboat", mins:105},  // overrides the distance-based estimate
    sug:true,                // marks one stop (not the whole day) as my suggestion
    badge:"free"
  } ] }
```

Supporting structures, same script block: `OPTIONAL` (per-city extras), `CITY_PLACES` (curated map pins, a superset of itinerary stops), `CITY_META`, `CITY_ORDER`, `CITY_RANGE`, `MODES`, `COLORS`.

### Two things that will bite you

1. **Maps must be re-fit when their tab becomes visible.** Leaflet cannot compute a zoom against a `display:none` container — it picks a nonsense zoom and never recovers. This produced a real bug where the Aug 8 map opened onto empty Bavarian farmland. `applyDayFit()`, `refitCity()` and `refitOverview()` run on tab activation. Don't remove those calls.

2. **Day maps cluster their stops before fitting.** A day spanning Frankfurt→Vienna would otherwise fit a 621 km rectangle showing nothing useful. `focusCluster()` groups stops geographically and defaults to the cluster where the day is actually spent, with a "Whole day's journey" toggle for the full hop. There's also a min-span guard so days spent on one street don't slam into max zoom.

## Verifying changes

There is no test suite. After editing the script block, run a smoke check — extract the inline JS, stub `L` and `document`, then call `selectDay()` for every entry in `DAYS` and `activateTab()` for every tab. That catches the failure mode that matters here: a typo in the data taking down a render path you didn't look at.

Also worth checking after data edits: every `lat`/`lng` should sit within ~35 km of its city centre. A single-digit typo once put Fisherman's Bastion 111 km north of Budapest and nothing visibly broke.

## Conventions

- **Never present my suggestions as Jacob's plan.** Anything not from his own spreadsheet gets a `suggested` badge, a dimmed day card, or an explicit "my addition" note. His content is authoritative and outranks my ideas — including his pacing choices. Vienna Aug 9 is deliberately light because Aug 10 starts at 4:45am; don't fill it.
- **Flag conflicts, don't resolve them by guessing.** Where his plan and his bookings disagree, build around the hard booking and surface the conflict visibly.
- **Write like an expert travel planner.** Opening hours, crowd timing, which entrance, what's already included in which ticket, what's a tourist trap. Not a list of attractions.
- **Every ticketed thing gets a booking link.** Official operator site where one exists, GetYourGuide for tours, airline manage-booking pages for flights. Verify a URL resolves before adding it.
- **Prompt for actions rather than mentioning them.** Standing instruction from Jacob: when something needs his input, ask directly instead of burying it in prose.
- **"Add" means add it to the app.** When Jacob says to add something, put it in the HTML (`DAYS`/`CITY_PLACES`/`OPTIONAL`) so he can see it on the page — don't just answer in chat. Commit and push straight to `master` without a second confirmation; only ask first if the day/city/placement is genuinely ambiguous.
- **No feature branches, no PRs.** Jacob only wants `master` — work directly on it and push there. Don't create a `claude/...` working branch for edits unless he explicitly asks for one.
- **Be concise.** No preamble, no restating the request.

## The "check email" routine

When Jacob says "check email" (or equivalent), don't re-scan the whole inbox — search Gmail for anything **newer than the "Last verified against Gmail" date at the top of `docs/BOOKINGS.md`**. For each new ticket, booking, or confirmation found:

- Add/update it in the relevant `docs/BOOKINGS.md` section (table row, seat/ref changes, new "Resolved" entry).
- Reflect it in the matching `DAYS` stop in the HTML (ref, price, seat, booking link).
- **Embed the actual ticket in the app when there's a real, working link for it** — set `ticket:true` and point `book.u` at it, same pattern as the CAT and City Walls tickets. **Load the URL and confirm it actually resolves before adding it — no exceptions, including links pulled from an email's structured/JSON-LD data.** A link sitting in structured data next to a broken visible button (FlixBus's "view ticket" button was malformed) is not evidence the structured one works either — it 404'd when tried. If nothing verifiable turns up, don't guess: use the generic manage-booking link and say plainly in the stop's note that the real ticket is a PDF/PNG attachment in Gmail (no attachment-download tool exists to pull it out automatically — see below).
- Bump the "Last verified against Gmail" date to today once done.

If nothing new turns up, still bump the date — that's what makes the next check incremental instead of a full re-scan.

**When there's no verifiable direct link** (the common case — see the attachment-download constraint below): ask Jacob to open the attachment on his own phone and send it back in chat. Once he does, save it under `tickets/` (e.g. `tickets/<operator>-<route>-<bookingref>.pdf`) and point `book.u` at that local path instead of any external URL. A file committed alongside the app can't 404 or expire the way a vendor's auth-token link can — this is the reliable option, not a fallback.

## Constraints worth not rediscovering

- The Gmail connector holds **one account at a time** — reconnecting swaps rather than adds. Ryanair mail is in `jacobierules@gmail.com`, everything else in `jacobseemann1@gmail.com`.
- There is **no attachment-download tool**. `get_message`/`get_thread` return attachment metadata only, never bytes. Jacob can get the bytes to us by opening the attachment himself and sending it in chat — see the "check email" routine above.
- The Ryanair confirmations (`IU1TUY`, `I54C9A`) are **not in either inbox**. Exhaustively searched. Don't re-run those queries.
- `Croatia Itinerary.xlsx` — Jacob's source spreadsheet — is merged into the HTML but not in this repo. It only ever existed as a chat upload. If you need the original, ask him to re-attach it.
