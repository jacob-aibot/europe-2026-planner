# The trip planner — data model and editing rules

Read this before editing `europe-2026-itinerary.html` or anything under `tickets/`. See the root
`CLAUDE.md` for the read-only boundary, the branch rule, and the conventions that apply to the whole
repo — they are not repeated here.

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

## Staying current on Jacob's phone

Jacob has this added to his home screen as a PWA (`manifest.json`, `display: standalone`). Home-screen web apps on iOS tend to resume their last-loaded DOM instead of re-fetching when reopened, so a deployed content change can sit invisible until the app is force-killed — this bit us once (07:30/19:30 flight-time fix deployed and confirmed live, but his phone kept showing the stale page). Fixed with a small self-check script at the top of `<head>`: whenever the app becomes visible again, it HEADs its own URL, compares the server's real `Last-Modified` against what it saw last time, and force-reloads with a cache-busting query string if they differ. No manual version bump required — don't remove this thinking `CONTENT_VERSION` (further down, used only to invalidate the on-device drag-order cache) already covers it. It doesn't; that constant isn't reliably bumped on every edit and was stale for a week before this was added.

## Two things that will bite you

1. **Maps must be re-fit when their tab becomes visible.** Leaflet cannot compute a zoom against a `display:none` container — it picks a nonsense zoom and never recovers. This produced a real bug where the Aug 8 map opened onto empty Bavarian farmland. `applyDayFit()`, `refitCity()` and `refitOverview()` run on tab activation. Don't remove those calls.

2. **Day maps cluster their stops before fitting.** A day spanning Frankfurt→Vienna would otherwise fit a 621 km rectangle showing nothing useful. `focusCluster()` groups stops geographically and defaults to the cluster where the day is actually spent, with a "Whole day's journey" toggle for the full hop. There's also a min-span guard so days spent on one street don't slam into max zoom.

## Verifying changes

There is no test suite. After editing the script block, run a smoke check — extract the inline JS, stub `L` and `document`, then call `selectDay()` for every entry in `DAYS` and `activateTab()` for every tab. That catches the failure mode that matters here: a typo in the data taking down a render path you didn't look at.

Also worth checking after data edits: every `lat`/`lng` should sit within ~35 km of its city centre. A single-digit typo once put Fisherman's Bastion 111 km north of Budapest and nothing visibly broke.

## Writing and adding content

- **Write like an expert travel planner.** Opening hours, crowd timing, which entrance, what's already included in which ticket, what's a tourist trap. Not a list of attractions.
- **Every ticketed thing gets a booking link.** Official operator site where one exists, GetYourGuide for tours, airline manage-booking pages for flights. Verify a URL resolves before adding it.
- **"Add" means add it to the app.** When Jacob says to add something, put it in the HTML (`DAYS`/`CITY_PLACES`/`OPTIONAL`) so he can see it on the page — don't just answer in chat. Commit and push straight to `master` without a second confirmation; only ask first if the day/city/placement is genuinely ambiguous.
