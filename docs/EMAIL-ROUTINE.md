# The "check email" routine

When Jacob says "check email" (or equivalent), don't re-scan the whole inbox — search Gmail for anything **newer than the "Last verified against Gmail" date at the top of `docs/BOOKINGS.md`**. For each new ticket, booking, or confirmation found:

- Add/update it in the relevant `docs/BOOKINGS.md` section (table row, seat/ref changes, new "Resolved" entry).
- Reflect it in the matching `DAYS` stop in the HTML (ref, price, seat, booking link).
- **Embed the actual ticket in the app when there's a real, working link for it** — set `ticket:true` and point `book.u` at it, same pattern as the CAT and City Walls tickets. **Load the URL and confirm it actually resolves before adding it — no exceptions, including links pulled from an email's structured/JSON-LD data.** A link sitting in structured data next to a broken visible button (FlixBus's "view ticket" button was malformed) is not evidence the structured one works either — it 404'd when tried. If nothing verifiable turns up, don't guess: use the generic manage-booking link and say plainly in the stop's note that the real ticket is a PDF/PNG attachment in Gmail (no attachment-download tool exists to pull it out automatically — see below).
- Bump the "Last verified against Gmail" date to today once done.

If nothing new turns up, still bump the date — that's what makes the next check incremental instead of a full re-scan.

**When there's no verifiable direct link** (the common case — see the attachment-download constraint below): ask Jacob to open the attachment on his own phone and send it back in chat. Once he does, save it under `tickets/` (e.g. `tickets/<operator>-<route>-<bookingref>.pdf`) and point `book.u` at that local path instead of any external URL. A file committed alongside the app can't 404 or expire the way a vendor's auth-token link can — this is the reliable option, not a fallback.

## Constraints worth not rediscovering

- The Gmail connector holds **one account at a time** — reconnecting swaps rather than adds. Ryanair mail is in `jacobierules@gmail.com`, everything else in `jacobseemann1@gmail.com`.
- There is **no attachment-download tool**. `get_message`/`get_thread` return attachment metadata only, never bytes. Jacob can get the bytes to us by opening the attachment himself and sending it in chat — see the routine above.
- The Ryanair confirmations (`IU1TUY`, `I54C9A`) are **not in either inbox**. Exhaustively searched. Don't re-run those queries.
- `Croatia Itinerary.xlsx` — Jacob's source spreadsheet — is merged into the HTML but not in this repo. It only ever existed as a chat upload. If you need the original, ask him to re-attach it.
