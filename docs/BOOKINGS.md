# Bookings & Open Items

Traveller: Jacob — jacobseemann1@gmail.com (Ryanair mail lives in jacobierules@gmail.com)
Last verified against Gmail: **Aug 11, 2026**

## Confirmed transport

| Date | Route | Details | Ref |
|---|---|---|---|
| Fri Aug 7 | LAX → Frankfurt | Condor DE2081, 16:45 → 13:00 (+1) | 17097157-02 |
| Sat Aug 8 | Frankfurt → Vienna | Condor DE4345, 14:30 → 15:50 · **$549.99 for both legs, was $439.99** — booking changed 7Aug2026, ref went 01→02. Cause unclear from the inbox (a "Special Services" confirmation landed the same night but the PDF isn't readable through this tool) — worth a manual check in Manage Booking before you fly | 17097157-02 |
| Mon Aug 10 | Vienna → Dubrovnik | Ryanair, 06:55 → 08:15 | **IU1TUY** ⚠️ |
| Wed Aug 12 | Dubrovnik → Split | FlixBus, 07:15 → 11:20 | #3379864687 |
| **Sat Aug 15** | Split → Prague | Smartwings QS1083, 14:40 → 16:15 — **reissued 04Aug2026, moved up from Aug 18** | YZGDTS |
| **Tue Aug 18** | Prague → Budapest | Ryanair, dep ~19:30 — **date confirmed directly by Jacob** | **I54C9A** ⚠️ |
| Fri Aug 21 | Budapest → London | British Airways BA863, 12:55 → 14:40 · Chase Travel Trip 1020543417 | AS67UA |
| Sat Aug 22 | London → LAX | Virgin Atlantic VS23, 18:15 → 21:25, direct | D8WQHO |

⚠️ **IU1TUY and I54C9A came from Jacob verbally, not from an email**, and still haven't turned up in either inbox after exhaustive searching. Don't re-run that search, it's exhausted. **Important correction (Aug 6):** an earlier pass of this doc assumed I54C9A's date moved from Aug 18 to Aug 15 alongside the Smartwings reissue, since the two tickets share a booking-ref pattern (YZGDTS, found via `eticket@amadeus.com` — 16Jul2026 issue said Aug 18, 04Aug2026 reissue said Aug 15) and that seemed like the only way the connection still worked. **That assumption was wrong.** Jacob confirmed directly that Prague→Budapest is still Aug 18 at 7:30pm. The two flights are three days apart, not connecting — Prague is a real 3-night stay, not a layover. Lesson: a shared-looking pattern between two unconfirmed data points is not confirmation of either one. Ask, don't infer, when it's this load-bearing.

**Nights:** Vienna 2 (Aug 8–10) · Dubrovnik 2 (Aug 10–12) · Split 3 (Aug 12–15) · Prague 3 (Aug 15–18) · Budapest 3 (Aug 18–21) · London ~1 (Aug 21–22, ~27 hrs)

**Currencies:** Austria € · Croatia € (joined 2023) · **Czechia CZK** · **Hungary HUF** · UK £

---

## Resolved

### The Aug 15 conflict is resolved — the flight moved, not the plan

Jacob's spreadsheet always planned **Sat Aug 15**: morning with his girlfriend's family, then a 2pm flight out. The Smartwings reissue puts Split → Prague at exactly 14:40 on Aug 15 — same date, same time as his sheet, just routed through Prague instead of direct to Budapest. Built the Aug 15 day around his original morning plan; only the flight routing changed. Split reverts to its original 3 nights (Aug 12–15) as a direct consequence — the 6-night extension is gone.

### Vienna, Dubrovnik & Split lodging — booked

Found via `search_threads`/`get_message` on booking.com confirmation emails in jacobseemann1@gmail.com:

- **Habyt Vienna** — Bruno-Marek-Allee 26, 1020 Vienna (Leopoldstadt/Nordbahnviertel, *not* Innere Stadt as originally assumed). Conf 5814731574, PIN 0754. Check-in Aug 8, 2 nights.
- **Hostel Petra Marina** — Obala Stjepana Radića 25, Gruž, Dubrovnik (near the ferry port, not Old Town). Conf 5175904714, PIN 4809. Check-in Aug 10, 1 dorm bed, 2 nights.
- **Guest House Lana** — Hektorovićeva 53, Split (near Bačvice Beach, ~15 min walk to Diocletian's Palace). Conf 6381031260, PIN 4200. Check-in Aug 12, Double/Twin room, 3 nights, €325 total, **non-refundable, dates can't be changed**. Booked Aug 9 — found this one two days after it happened, not from a "check email" pass; worth a tighter loop going forward.

### Three tickets purchased Aug 7 — now booked

Found in the Aug 7 sweep, all same-day purchases:

- **City Airport Train** (Aug 8, Vienna) — order 843249, €13.41.
- **Dubrovnik City Walls** (Aug 11) — order DUB26M6CVTSWMF, €40 (adult walls + Lovrijenac combined, matches what was already budgeted as one ticket).
- **Dubrovnik Cable Car** (Aug 10) — order 2665250 via ulaznice.hr, open-dated through 31 Mar 2027.

### FlixBus seat reassigned, boarding pass now in the app (Aug 11)

FlixBus emailed on Aug 6 that booking #3379864687 (Dubrovnik → Split) got reseated: **seat 12A**, previously unassigned.

I initially tried a direct "pdfqr" ticket link scraped from the confirmation email's structured data — it 404'd. There's no attachment-download tool, so I can't pull the actual PDF out of Gmail myself. Jacob downloaded the real boarding pass on his own phone and sent it back; it's now committed at `tickets/flixbus-dubrovnik-split-3379864687.pdf` and linked from the Aug 12 stop (`ticket:true`). This sidesteps FlixBus's auth-token links entirely — it's a static file served alongside the app, nothing to expire or 404.

### Blue Cave/Hvar speedboat tour — booked (Aug 13)

Booked directly by Jacob via GetYourGuide. "5 Islands Full-Day Tour to Blue Cave, Vis & Hvar" (t490898), operator **Salty Experience**: Blue Cave, Stiniva, Budikovac Lagoon swim, Hvar Town (~2 hrs) on a small-group speedboat with a sun deck (not a bare RIB). Picked over two alternatives — a Brač-added tour with an extra unincluded Blue Cave fee, and a closer-to-Split Šolta/Drvenik/Čiovo tour that skips Blue Cave and Hvar entirely.

Confirmation landed Aug 12, 8:20am (`GYGG45MLA9Q9`, PIN `BGXw#EW8`, confirmed via `search_threads`/`get_message`): **$159.98 total, not the $132 listing price** shown pre-checkout — taxes/fees on top. Meeting point is the "SPLIT" letters sign on the Riva, arrive 6:45am for the 7:00am departure. Blue Cave entrance fee is separate and cash-only. Booking is non-refundable/non-reschedulable. No PDF ticket exists — GetYourGuide's model here is an in-app mobile ticket tied to the booking ref, unlike FlixBus's downloadable boarding pass, so there's nothing to embed as a local file this time; the app itself is the ticket.

### UK ETA — approved

Ref 2020-0000-5923-3855, approved Aug 7, valid until 7 Aug 2028, tied to the passport ending 2770. Paid $27.98. Needed for the London/Windsor leg — nothing to print, checked automatically against the passport at the border.

## Open items — only Jacob can resolve these

### 1. Prague, Budapest, and London lodging still unbooked

Nothing booked for Prague, Budapest, or London. The Overview tab carries Booking.com search links pre-filled with the correct dates for all three. (Split is booked — see Resolved, above.)

### 1b. Tickets/tours still unpurchased — the Overview tab has the full punch list

Most urgent: the **Hungarian Parliament tour** (Aug 20) sells out days ahead in August and is the only item here that can go to zero. Also worth doing before he lands: **Széchenyi** (skips the walk-up queue), **Prague Castle Main Circuit** (Aug 15, biggest tour-bus magnet), **Windsor Castle** (saves ~£4pp booked ahead). Lower-urgency: Jewish Quarter combined ticket, Danube cruise, Austrian National Library State Hall. (Blue Cave/Hvar speedboat is booked — see Resolved, below.)

### 2. Prague is a brand-new 3-night city, entirely undrafted before this pass

Turned out to be a real stay (Aug 15–18) once Jacob confirmed the Aug 18 Ryanair date — not the 3-hour connection the Smartwings arrival alone would have suggested. Castle, Charles Bridge, Jewish Quarter, Vyšehrad are all new content, drafted from nothing.

### 3. London leg needs a hotel — now based in Windsor, not central London

~27 hours on the ground, no booking found in either inbox. Jacob confirmed (Aug 6) he'll be based in Windsor rather than central London — Windsor is 20–30 min from Heathrow (bus 8 or taxi), so the plan is now built around Windsor Castle, Eton, and the riverside rather than Tower/Westminster. Still needs an actual hotel booked in Windsor to lock in.

---

## Build status

| City | Status |
|---|---|
| Vienna | Complete — merged from his spreadsheet, lodging booked |
| Dubrovnik | Complete — merged from his spreadsheet, lodging booked |
| Split | Aug 12–15 from his sheet, lodging booked (Guest House Lana) |
| Prague | Now a full 3-night city (Aug 15–18) — entirely my draft, didn't exist before this pass |
| Budapest | Back to its original 3 nights (Aug 18–21, Aug 19–20 content from the earlier pass) — he'd planned nothing here |
| London (Windsor) | Complete but **my draft**, contingent on a hotel — rebuilt Aug 6 around Windsor per Jacob, not central London |

## Pricing verified Aug 6, 2026

Checked against operators' own sites, not memory.

Dubrovnik City Walls €35 (includes Fort Lovrijenac — don't pay twice) · Lokrum €27 boat + entry · Blue Cave / Hvar 5-island speedboat €90–113pp · Krka €31–35pp incl. park entry · Széchenyi ~€35 · Tower of London ~£35 · Dubrovnik Cable Car ~€27 return · House of Terror ~4,000 HUF, closed Mondays · Rudas Baths ~14,800 HUF weekend 2026.

**Gellért Thermal Bath is closed for renovation until 2028** — pulled from all lists, replaced with Rudas Baths as the alternative-bath suggestion.

One live detail worth acting on: **City Airport Train is running 10% off online bookings Jul 31 – Aug 31, 2026** — exactly Jacob's window. The S7 city train is ~€4 versus CAT's ~€15 if he'd rather save it.
