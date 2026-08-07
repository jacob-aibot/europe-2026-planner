# How this got here

Chronological, so you can tell which decisions were deliberate and which were just the last thing that happened.

## Origin

Jacob listed ~11 Vienna places he was considering and asked for a downloadable HTML artifact: a map of his chosen spots, plus a separate tab for the day-by-day breakdown including flights. He said up front this would cover the whole two weeks, not just Vienna.

## Flight data

Pulled from Gmail. Everything resolved except the two Ryanair legs, which live in a second account (`jacobierules@gmail.com`). Even after switching accounts, neither confirmation could be found — searched by sender, by booking code, including trash and spam. Jacob supplied the refs and times verbally instead. They're marked "From you" in the UI rather than "Confirmed" so the distinction survives.

Discovered in the process: the Gmail connector holds **one account at a time**. Reconnecting swaps the authenticated session rather than adding a second — data from the previous account becomes unsearchable. Confirmed by testing, not assumed.

## The spreadsheet

Jacob had emailed himself a `Croatia Itinerary.xlsx` with a real plan: actual tour operators, prices, pickup times. It could not be retrieved through Gmail — the connector returns attachment *metadata* only, never bytes, and there's no download tool. He eventually uploaded it directly to the chat, at which point it was read with openpyxl and merged in.

**This is why his content outranks mine.** Vienna, Dubrovnik and Split were substantially rewritten to match his real plan, replacing generic suggestions. His pacing decisions were kept even where they looked sparse — Vienna Aug 9 is deliberately light because Aug 10 starts at 4:45am, and he'd flagged that himself.

Merging it also surfaced the Aug 15 conflict (see `BOOKINGS.md`), which remains open.

## Redesign passes

**Pass 1 — aesthetics.** Fraunces + Inter, warmer palette, day-number badges, status pills, proportion bar for nights per city.

**Pass 2 — booking links and the calendar.** Jacob asked for purchase links on every event, and for a calendar where picking a day shows the route on a map with travel times and transport-mode icons.

This forced the real structural change: the hand-written day HTML was converted into the `DAYS` data model so the calendar and the city tabs render from one source. Before that they'd have been two copies of the same content, guaranteed to drift. ~41 booking URLs added, each checked to resolve.

Budapest and London were built out properly in this pass rather than left as stubs — but both are entirely my draft, and marked as such, because Jacob had planned neither.

**Pass 3 — navigation and the map bug.** Jacob reported the Aug 8 map opening onto empty Bavarian farmland, needing a lot of zooming out to find anything.

Two separate causes:

1. The day map was being built at page load while the Calendar tab was still `display:none`. Leaflet got a 0×0 container, computed a nonsense zoom, and never recovered. Fixed by re-fitting on tab reveal.
2. Even a correct fit was wrong for Aug 8, which spans Frankfurt→Vienna — a 621 km rectangle showing mostly countryside. Fixed with `focusCluster()`, which defaults the map to the cluster where the day is actually spent. Aug 8 went 621 km → 19 km, Aug 18 752 km → 18 km. A toggle shows the full hop on demand.

He also asked whether the calendar should be a sidebar, or the cities should. The answer was neither-separately: a top nav with a Calendar tab *alongside* city tabs duplicated the same information with no visible relationship between the two. Every date belongs to a city, so the sidebar nests them — cities as rows, their dates indented beneath.

## Pass 4 — the Aug 15 flight change and the optionality feature

Jacob asked to re-check Gmail for a flight change and some new housing, and to add a way to add/subtract suggestions from the main plan.

**The flight change.** Two `eticket@amadeus.com` messages shared the same booking ref (YZGDTS) but different ticket numbers and issue dates — 16Jul2026 said Split→Prague on Aug 18, 04Aug2026 said Aug 15. That's a reissue, not a duplicate. It also happened to resolve the Aug 15 conflict from Pass 2: his sheet's 2pm family-meetup-then-flight now matches the reissued ticket exactly, just via Prague instead of direct. Split dropped back to 3 nights; Budapest absorbed the difference and grew from 3 to 6, three of which (Aug 16–18) needed drafting from nothing.

Found in the same sweep: Habyt Vienna and Hostel Petra Marina booking.com confirmations. Habyt's address (Bruno-Marek-Allee 26, 1020) is Leopoldstadt/Nordbahnviertel, not Innere Stadt as originally assumed — corrected the coordinates and the "everything's walking distance" framing on Aug 8.

Also caught while researching Budapest content: Gellért Thermal Bath closed for renovation until 2028. It was sitting in three places (OPTIONAL, CITY_PLACES, and implicitly recommendable) as if still open — pulled from all of them, replaced with Rudas Baths.

**The optionality feature.** Every `OPTIONAL[city]` stop got a stable `id`; an `addOptional(cityKey, id)` function inserts it into the real plan at an explicit `addHint {day, t}` if the item has one, or otherwise the least-packed day in that city at a category-default time, then re-renders. `removeSuggestion(dayId, idx)` reverses it — demotes a `sug:true` stop back into the OPTIONAL pool with its exact slot remembered, so toggling is lossless in both directions. Naschmarkt, Donaukanal, and Brasserie Palmenhaus (Jacob's three explicit Vienna adds) are seeded through this exact code path at page load rather than hand-written into `DAYS`, so the feature is exercised by its own real use case instead of being a parallel untested system.

One accuracy check paid off directly: Naschmarkt's Saturday flea market closes at 2pm, and Jacob lands at 15:50 — he'd miss it regardless of scheduling. The regular food market stays open till 6pm, so it still fit right after hotel check-in. Moved the Austrian National Library to Sunday instead, since the State Hall is open Fri–Sun 9–18 in August (only closed Mondays Oct–May) — freed up the Saturday slot instead of trying to force both in.

## Pass 5 — the inference that turned out wrong

Pass 4 assumed the Ryanair Prague→Budapest leg (I54C9A) moved from Aug 18 to Aug 15 alongside the Smartwings reissue, on the theory that a same-day connection was "the only way it still worked." Jacob corrected this directly: it's still Aug 18, 7:30pm. The two flights are three days apart, not a connection at all.

That flipped the whole downstream shape: Prague goes from a 3-hour stub to a real 3-night stay (Aug 15–18), and Budapest — which Pass 4 had stretched to 6 nights specifically to absorb the assumed-earlier Ryanair arrival — reverts to its original 3 (Aug 18–21). The 3 Budapest days drafted in Pass 4 for Aug 16–18 (Margaret Island/Rudas, Heroes' Square/Synagogue, House of Terror/Memento Park) no longer belonged to Budapest at all; they got replaced with genuine Prague content (Castle, Charles Bridge, Jewish Quarter, Vyšehrad, Petřín) instead of moved, since a day built around Budapest's geography doesn't transplant to Prague.

The tell in hindsight: two unconfirmed data points (an unverifiable Ryanair ref, and an inference about what "must" be true for a connection to work) don't add up to a confirmed one just because they'd be convenient together. Should have surfaced it as an open question rather than building a full itinerary on top of it.

## Bugs caught by verification, not by looking

Worth knowing these were found by scripted checks, because none of them were visible in the rendered page:

- Fisherman's Bastion sat at lat `48.5025` instead of `47.5025` — 111 km north of Budapest, in range and plausible-looking. Caught by a distance-from-city-centre check.
- An HTML integrity script reported a suspiciously empty script block: `html.index('<script>')` was matching the Leaflet CDN tag rather than the inline block. `rindex` fixed it. If you write a similar check, don't repeat this.
- The Dubrovnik sub-nav used `data-sub="dbv-map"`, but the key-derivation logic (`split('-')[0]`) needed `dubrovnik` to match the map registry. Silent failure — the map simply never initialised.
