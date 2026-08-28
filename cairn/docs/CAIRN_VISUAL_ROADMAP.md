# Cairn Visual Roadmap

**Read this file, not your memory of a past session, before answering "where is Cairn."** It is
the plain-English companion to `ARCHITECTURE.md` and `ROADMAP.md` — those are the contract; this
is the status board. It does not redefine anything they say. There is also an HTML version of
this same content at `cairn/docs/CAIRN_VISUAL_ROADMAP.html` — open it in a browser (phone or
desktop) for the visual version. **Keep the two in sync**: when the state below changes, update
both files in the same pass (`cairn/CLAUDE.md` now says so explicitly, at the point the last
update to this file added that instruction).

> **✅ THE PHASE RE-CUT IS NOW REFLECTED HERE — as of 2026-08-28 this board is current.** Phase 1
> shipped (`REVIEW.md`, verdict SHIP, `b32ef9a`, 2026-08-27). The same day, the roadmap was re-cut
> against Jacob's product thesis: **Phase 2 is now travel history, local-first** (past trips, the
> trip lifecycle, the lifetime map, participants), accounts/the server moved to **Phase 3**, and
> there are **seven** phases, not six. Every section below — the phase list, "what I can do today",
> the journey table, "what happens next" — has been rebuilt against that order; the stale
> six-phase, accounts-are-Phase-2 stepper is gone rather than annotated. Sources of truth remain
> `PRODUCT-VISION.md` (why this order), `ROADMAP.md` (the sequence, with the old-number →
> new-number mapping at its top) and `ARCHITECTURE.md` §8 (the model).


> **⚙ PHASE 2 IS UNDERWAY — step 2a is built (not yet verified, not yet shipped).** As of
> 2026-08-27, increments **I-0 … I-4** of the twelve in `ROADMAP.md` revision 10 are **built**:
> the QA probe board is repaired and its baseline numbers re-measured (I-0); `lifecycle()` is in
> core and in the CLI (I-1); `Trip.datePrecision` is a stored field (I-2); every conflict rule
> declares whether it is about *feasibility* or *integrity*, and a feasibility rule no longer
> fires about a day already past (I-3) — **this closes the live defect where the app kept telling
> Jacob his finished trip was missing a hotel**; and there is a *"Record a past trip"* form plus
> lifecycle chips in the app (I-4). **Built is not verified and not shippable**: no breaker round
> has attacked any of it and no manager verdict exists. I-5 … I-11 (the lifetime map, travel
> statistics, participants, and the phase gate) are ⚪ **NOT STARTED**. Numbers and caveats:
> `BUILD-NOTES.md`'s current status note.
>
> **Since then, two gaps 2a disclosed are closed** (still built, still not verified): a past trip
> recorded through the form now **names at least one city and puts it on every one of its days**,
> so the trips 2b's lifetime map is built from are attributable to a place instead of to the
> "transit" catch-all; and restoring a backup file that carries no owner no longer fails to load.
>
> **2a has now been attacked** (QA round 12): **no blockers**, 3 major and 5 minor findings.
> Four of the eight are **fixed**: two browser tabs editing the same trip no longer throw away
> a change to *how precisely you knew the dates*; a conflict rule that crashes is now reported
> on a finished trip instead of being silently swallowed; the trip list shows *"June 2019"*
> rather than two exact days for a trip you only remembered the month of; and a trip can no
> longer be written with a date-precision value that stops it loading again. **Four remain
> open:** two went to the architect (a dismissed warning being permanently retired by the
> calendar alone; a city name in a non-Latin alphabet collapsing to a meaningless key — the
> Japan case), and two are disclosed (one undo peels the city off a long recorded trip; a
> backup file with no owner is adopted without marking its foreign content).

> **The architect ruled on both, and both are now BUILT** (still not verified — no breaker
> round has attacked them). **Two more increments, I-3a and I-4a:**
>
> - **A dismissed warning is no longer thrown away by the calendar.** Before: you tell the app
>   *"not a problem"* about a missing hotel, the trip ends, and simply **opening** the trip
>   deleted your answer, changed the file and queued a save — from looking at it. If the
>   warning ever came back it accused you of a dismissal you never took back. Now the app asks
>   *"does this trip still produce that finding?"* rather than *"is the app still nagging me
>   about it?"* — two different questions that had been quietly treated as one.
> - **A city called 東京 is a city called 東京.** Before: any name outside the English alphabet
>   became the same meaningless key `-`, so *"日本 2019 — 東京, 京都"* recorded as **one** city
>   and every day of the trip pointed at nothing, silently. Now the app mints an internal id
>   for a city instead of building one out of its name, so it works in any script; the name is
>   only ever a label. Trips already saved with the old collapse now **say so on screen** —
>   they still open, and the app names the problem instead of mis-filing every day.
>
> Left open from round 12, unchanged: the undo that peels the city off a long recorded trip,
> and the ownerless backup file adopted without marking its foreign content.

> **Those two have now been attacked too** (QA round 13): **no blockers**, 2 major and 6 minor.
> Both fixes do the thing they were meant to do — and **neither is finished**, because four of the
> findings are holes in the *rulings*, not in the code, so they came back to the architect. In
> plain terms: **(1)** the calendar can still throw away a dismissal, through a second door — the
> *"book this within 60 days"* reminder reads your phone's local date, and flying **west** (or
> correcting a wrong clock) can move that date **backwards** a day, which the app was reading as
> *"you fixed it"*. **(2)** If a rule ever crashes, every dismissal that rule was holding is
> thrown away with it. **(3)** Copying an activity between **two trips you made yourself** now
> leaves the receiving trip with an error you cannot clear — the copied place is filed under the
> *other* trip's internal city id, which the new minted-id scheme guarantees can never match. And
> **(4)** one of the tests written to prove the fix could not prove what it claimed. The architect
> has ruled on all four (`ARCHITECTURE.md` A-11 … A-14); a builder implements them next, and
> **I-3a and I-4a stay open until then** rather than being counted as done.

> **All four were built, and then attacked** (QA round 14): **three of them are done and
> verified** — the clock can no longer throw away a dismissal through either door (checked at 434
> different dates across ten different trips), a crashing rule no longer takes your dismissals
> with it, and copying between two trips of your own files the place under *your* city instead of
> leaving an error you cannot clear. **One blocker came back, and it is the important one:** when
> you copy an activity, the *place* it points at travels with it — and its note and its links were
> travelling **unedited**. So a hotel's door PIN, a booking confirmation number, a voucher link
> and an email address typed into a place note would all land in the other person's trip, on a
> record nothing marks as somebody else's. The activity's own note has been scrubbed since
> round 2; the place beside it never was. Two smaller design gaps came with it: copying **within
> one trip** can duplicate a place under the wrong city when the trip visits two places with the
> same name (a there-and-back through the same hub), and one proof about the 60-day reminder was
> claimed more broadly than it holds. The architect has ruled on all three (`ARCHITECTURE.md`
> **A-15**, **A-16**, **A-17**, revision 13). **Nothing about sharing with a friend ships until
> A-15 is built** — the copy is the one place in the whole design where your data crosses to
> another person.

> **Those three were built, and attacked again** (QA round 15). The place-note scrub **holds** —
> eleven different notes were pushed across the boundary and only credential-shaped ones changed —
> and both of the smaller fixes hold too. What the tester found is that the *same mistake* had been
> made twice more, one level further in, and neither had been looked at: when you copy an activity,
> the activity's own **cost note** and **arrival label** were still travelling unedited, so
> *"paid with card, conf 5814731574"* and *"Bus 8, booking GYGG45MLA9Q9"* would land in the other
> person's trip word for word — even though the demo-data scrub has cleaned both of those fields
> for months. The lesson the architect has taken from two rounds of this: a list of fields is only
> a real list as far down as it actually goes, so the rule is now *nothing is copied wholesale, at
> any depth* — everything the copy writes is rebuilt field by field from fields somebody named.
> One smaller gap came with it: copying an activity into the *optional list* of another trip could
> file it under a city that trip does not have, leaving an error nothing on screen can clear; that
> is now refused outright rather than guessed at. The architect has ruled on both
> (`ARCHITECTURE.md` **A-18** and **A-19**, revision 14). **Nothing about sharing with a friend
> ships until A-18 is built**, for the second round running and for the same reason.

> **Both of those were built, and the credential leak is finally closed** (QA round 16). The tester
> pushed a door PIN, a confirmation number, a voucher link and an email address across the copy on
> every carrier the last four rounds found, and none of them arrived; an ordinary note, an ordinary
> price and an ordinary bus label all crossed **unchanged**, which is the half that proves the rule
> is a scrub and not a blanket. What is left is smaller and is not a leak. When a trip file is
> opened, every field in it is checked — except one: a place's **opening hours** were taken on
> trust. That single gap is what produced the last two rounds' findings, and the two patches written
> to contain it disagreed with each other, so a copy could quietly throw away opening hours while
> the app's own "something looks wrong here" report called them fine. The architect's ruling
> (`ARCHITECTURE.md` **A-20**, revision 15): opening hours get checked at the door like everything
> else, and there is now **one** definition of what valid opening hours are, shared by the three
> places that were each carrying their own. The warning a builder added for this — *"this place has
> opening hours this trip cannot read"* — is **approved and stays**; it is what tells you before an
> export you cannot re-open. **Still built, not yet verified:** one builder pass lands A-20, then a
> tester round 17 attacks it.

> **That was built, and round 17 could not break it — but it found the fix's own blind spot.** When
> the app checks a value and then goes back to fetch it again to use it, those are two separate
> looks at the same thing. Normal trip data never changes between two looks, which is why the rule
> worked. But a value can be a tiny function rather than a stored fact — and one written to answer
> *"9:00"* the first three times and hand over a door PIN the fourth slips a credential straight
> past the check, into the other person's trip. The tester demonstrated it, and found the same
> pattern on a **price** field and in three places where it makes the app crash rather than leak.
> Nothing a trip *file* contains can do this — a saved file has no room for a tiny function — so
> the exposure is limited to the app talking to itself, which is why it is filed as minor. The
> architect's ruling (`ARCHITECTURE.md` **A-21**, revision 16): **look once.** Whatever the check
> looked at is the exact thing that gets used, and the check now hands that value back instead of
> just saying "fine". One thing it deliberately does **not** fix, and says so in writing: the
> app cannot promise that a value it checked this second is the same value it saves a minute later,
> if the value is free to change itself in between. **Built, not yet verified:** one builder pass
> lands A-21, then a tester round 18 attacks it.

> **That was built — and round 18 found five more places the same fix had missed, in the same file,
> for the fifth round running.** The worst one is not a leak but a *mis-credit*: the app looked up
> "whose trip am I copying from?" five separate times while copying one activity, so it could take
> the stop out of one friend's trip and then put a *different* friend's name on it — and putting the
> right name on borrowed plans is one of this project's founding promises. The other four are
> smaller (a stray identifier crossing over, and two ways to make the app crash on a coordinate).
> All five need the app to be talking to itself rather than reading a saved file, so all five are
> minor — but five rounds of the same thing is a pattern, not bad luck. So the architect's ruling
> (`ARCHITECTURE.md` **A-22** and **A-23**, revision 17) has two halves. Fix the five. Then **stop
> relying on people to spot the sixth**: an automatic check now counts, every time the tests run,
> how many times the copying code looks at each piece of borrowed data, and the build fails the
> moment anything looks twice. Five exceptions are written down with a reason each, and adding a
> sixth needs an architect, not a quiet edit. Verified before it was written down: the new check
> goes red on today's code and names all five, and green once they are fixed.

> **Both were built, and round 19 attacked the automatic check itself.** The five fixes all hold —
> the copy now credits the trip it actually took the stop from — and the new check is not
> decoration: the tester planted **twenty** deliberate "looked twice" bugs inside the area it
> watches and it caught **all twenty**, fourteen of which no other test noticed, twelve of them in
> parts of the copy nobody had ever written a test for. The mechanism is right. What the tester
> broke is the check's **reach** — the small print about *what* it watches, which the ruling wrote
> down and got wrong in three places. **(1)** It skipped each trip's own record wholesale as "just
> the container", except that two things in that container are exactly what the copy carries
> across: **which trip this came from, and whose it is** — the credit line again, for the sixth
> round running, and the check could not see it. **(2)** It listed ten situations to test the copy
> in, and one of them cannot reach the case it was added for, so a place with **no map
> coordinates** — Jacob's own data has exactly one, Windsor Great Park — was never exercised on
> the path it actually takes. Copying **within your own trip**, which is the only kind of copying
> that exists today, was not among the ten either. **(3)** It promised "any new field is watched
> automatically", which is true only of fields the test data fills in — and the one it did not fill
> in is **the ticket**, the single field the design calls a credential that must never travel. The
> architect's ruling (`ARCHITECTURE.md` **A-24**, revision 18): watch each trip's own details and
> skip only its lists of days, cities and places; add four more situations, including the
> coordinate-less place and the copy within one trip; put a ticket in the test data and check all
> three kinds of ticket rather than one. The payoff is concrete — with A-24 in place, that sixth
> defect stops being something a person has to spot and becomes a failing test. **Ruled, not yet
> built:** one builder pass lands the two small fixes plus A-24, then a tester round 20 attacks it.

> **That was built, and round 20 is the round where the copying code itself came up clean.** The
> tester threw twenty-two more shapes of trip data at it and **all 143 stops of Jacob's real Europe
> trip**, and found **no** new way to look at borrowed data twice, no crash, and no ticket or door
> PIN crossing over. The sixth-round defect is now caught by the automatic check rather than by a
> person, exactly as promised. What round 20 broke instead is the check's **own upkeep**, and it is
> the same lesson one level further out. The last ruling said in writing *"the test data must fill
> in every field"* — and shipped nothing that enforces it, so the tester added a pretend new field,
> fixed the one compile error a builder would see, and slipped a leak straight past a fully green
> test suite. The same ruling also left **two of its own new fields empty**: the trip's home
> location — a real address, exactly the kind of thing the design says must never leak — and its
> free-text notes bag. One genuine new defect turned up too, narrow but real: if you have **three
> cities with the same name** in one trip, the copy can file a place under the wrong one and nothing
> reports it. The architect's ruling (`ARCHITECTURE.md` **A-25**, revision 19): make the test data's
> completeness a **rule the compiler and the tests enforce**, not a sentence someone has to
> remember — a new field on a trip, a stop, a place or a city now fails the build until the test
> data actually fills it in, and an empty value that would hide a whole subtree has to be justified
> out loud. Plus one one-line fix for the three-same-name-cities case, city records added to what
> the check watches, and a fifteenth test situation that builds them. **And A-25 closes this
> arc**: after seven rounds on one file, it writes down the exact six checks that must pass for
> "closed" to be true, and the single thing that would re-open it — a blind spot in the check
> itself, not just another finding. **Ruled, not yet built:** one builder pass lands A-25, then a
> tester round 21 verifies the six checks.

> **Last updated:** 2026-08-28, against `master` after ARCHITECTURE revision 19 (**A-25** — the
> automatic read-once check's *upkeep*: test-data completeness enforced by the compiler instead of
> by memory, the last narrow copy defect, and a **written closing criterion** for the seven-round
> arc) — previously revision 18's A-24. Update this line every time you edit this file.

**Status vocabulary used throughout:** 🟢 COMPLETE · 🟡 IN PROGRESS · 🟠 NEXT / APPROVED ·
🔴 BLOCKED · ⚪ NOT STARTED. Also: **built** (code exists) vs **verified** (an adversarial tester
tried to break it and couldn't) vs **shippable** (a manager gate said SHIP). These are three
different claims — see "Definition of done" at the bottom.

---

## ⚠️ A decision only Jacob can make

Before anything else: `REVIEW.md`'s SHIP verdict named one open question for Jacob, not for the
pipeline. **Do you want an "accept" control before Phase 2?** Today, copying an activity from one
of your trips into another leaves it permanently badged *"from a friend"* — there's no button that
says "yes, this is mine now." That's the safe default (nothing of someone else's is ever shown as
yours), but it's the kind of thing you'd notice the first time you used the feature. It's cheap to
add now; otherwise it ships with the Phase 3 accounts work. **Nobody is blocked waiting on this**
— it's a preference, not a gate — but it's sitting unanswered, so it's flagged here rather than
buried in a paragraph.

---

## 1. Where we are

**Phase:** 1 of **7** is 🟢 **COMPLETE — SHIPPED.** Phase 2 — *travel history*, not accounts (the
phases were re-cut on 2026-08-27; accounts are now Phase 3) — is 🟡 **IN PROGRESS**: step **2a of 3
is built** (increments I-0…I-4), built but **not verified and not shipped**. Steps 2b (the lifetime
map and travel identity) and 2c (participants) are ⚪ **NOT STARTED**.

**Where the effort has actually gone since Phase 1 shipped.** Not on 2b or 2c. Eight consecutive
adversarial rounds (12 → 19) have been spent on **two** increments — I-3a (a dismissed warning
staying dismissed) and I-4a (city identity, and everything the *copy* touches) — and the copy is
where seven of those rounds landed. That is deliberate, and it is written down as a rule rather
than a habit: **nothing about sharing with a friend, or any public share link, ships until the copy
path is closed**, because the copy is the one place in the whole design where your data crosses to
another person. Round 19's result is the first sign of that arc actually ending: the defect it
found is one the *tests* will catch next time instead of a person.

**How Phase 1 closed.** The manager sent it back once for three disclosed screen gaps; the
builder fixed all of them plus four smaller items in one pass; then an adversarial QA tester found
a real, if narrow, remaining bug (R11-1 — a merge landing at the same instant as a local edit could
silently overwrite the other tab's saved work) across three more rounds (R9, R10, R11) of the
usual find → design ruling → fix → re-verify cycle. The architect ruled on the fix (revision 8,
**A-7**), the builder implemented it, and the manager's final gate review re-derived the fix's
correctness on its **own** probe — not the builder's tests — before recording **SHIP**.

**Plain-English assessment.** Phase 1 is done, for real, by this project's own standard: built,
independently attacked, and signed off by the role whose job is exactly that. The manager was
explicit about one shortcut it took on the way there — it verified the very last fix (A-7) itself,
by hand, rather than ordering a full extra breaker round, and said so in writing rather than
silently skipping a step. It also named the one place it wants the *first* Phase 2 breaker round
to point: the merge/write code (`doMerge`/`writeAndSettle`) that has produced four of this
project's bugs so far (R3-3, R7-1, R8-4, R10-3, R11-1). That's not a loose end Phase 1 left behind
— it's a disclosed, deliberate trigger for the next phase's QA to pick up on day one.

**Current gate status:** 🟢 **Phase 1's gate is PASSED — Phase 1 itself is closed, not open.** ("The
gate is open" describes the *door into Phase 2*, not Phase 1's own status — worth saying plainly
since that phrase reads the wrong way at a glance.) Nothing is routed back to any role for Phase 1.
What carries forward — three small entry items, a couple of stale numbers, and Jacob's one open
decision above — is listed in §4.

---

## 2. What is already built

Everything below is not just built — it's **shipped**, per the manager's SHIP verdict:

- **The trip engine** (`packages/core`) — days, stops, legs, cost roll-up, geographic
  clustering, conflict detection, validation, JSON import/export, and the provenance rules that
  track who a piece of data belongs to. Zero runtime dependencies. Deterministic (no clock, no
  randomness, so the same input always gives the same output).
- **The persistence/write layer** (`packages/client`) — decides when an edit is safe to save,
  refuses to overwrite a concurrent edit, never silently drops something you typed — **including
  the case of two tabs merging and editing at the same instant**, which took 11 rounds total to
  close (§6).
- **The web app** (`apps/web`) — opens in a browser, loads the real Europe 2026 trip, supports any
  number of trips, day/stop editing, a day map, a conflicts panel that shows exactly the two things
  Jacob needs to act on, and copying one stop from another trip with a credit line that now shows
  up on every screen that can render it. A travel stop shows a real departure/arrival, not a
  misleading single time.
- **A command-line tool** (`cli.ts`) — `trip`, `day`, `conflicts`, `cost`, `validate`, `export`,
  runnable with no browser at all.
- **618 automated tests, all passing** (615 at the last update to this document; 432 the update
  before), plus a wide stack of adversarial probe scripts under `cairn/qa/` built to actively try to
  break specific claims — a race condition, a database wipe mid-write, a symlink escape, a merge
  landing at the same instant as an edit.
- **A standing automatic check on the copy path** (`packages/core/test/readOnce.test.ts`, new since
  round 18) — it counts how many times the copying code looks at each piece of borrowed data and
  fails the build if anything is looked at twice without a written-down reason. It is the first
  thing in this project that catches a *class* of defect rather than a known one; round 19 proved it
  works by planting twenty and catching twenty, and round 20 confirmed the copying code itself is
  now clean across twenty-two more data shapes and all 143 stops of the real trip. The remaining
  work is on the check's own upkeep — that is A-25, ruled and not yet built, and it is what makes
  this arc closeable.

---

## 3. What I can actually do today

**Everything below is shipped — verified by an adversarial tester, signed off by the manager, not
just "the builder says it works":**

- Open the app and see your real Europe 2026 trip, loaded read-only from the live planner.
- Create any number of trips and switch between them without them bleeding into each other.
- Edit a day's stops and see them on a map, without losing the edit on tab close, a trip switch,
  two tabs open at once, **or two tabs saving and merging at the same instant** — the last of
  these was the specific thing that held Phase 1 back until this pass.
- See a conflicts panel that flags exactly your two real red-flag days (Aug 18, Aug 20) and
  nothing invented — five rounds of design work went into keeping that count honest.
- See a flight/train stop rendered correctly: "departs 14:30 · 1h 20m · arrives 15:50," not a
  single time that reads like an arrival.
- Dismiss a conflict and have it stay dismissed, even if you edit the value away and back.
- Browse another trip and copy one stop into this one — badged "from a friend," credited to the
  source trip on every screen that shows it, with any door PIN or booking number redacted.
- Export and re-import a trip as a JSON file (backup/restore).

**Known, disclosed, and deliberately not fixed for Phase 1 (see §4):** a copied stop has no
"accept as mine" control yet — see the decision box at the top. Two narrow, real bugs exist that
are not reachable through anything currently in the app (R8-3, R8-4) and are queued as Phase 2
entry conditions rather than Phase 1 blockers.

**Built in Phase 2 so far, but not yet verified and not yet shipped** — so this is "the builder says
it works", which this project does not count as done:
- Record a **past trip** from a form, with lifecycle chips (planned / current / past) on the list.
- Dates you only half-remember — *"June 2019"* rather than two invented exact days.
- A finished trip stops nagging you about things that were only ever about the future (that was the
  live defect where the app kept saying Jacob's completed trip was missing a hotel).
- City names in any script — 東京 is a city called 東京, not a collapsed placeholder.

**Not built at all yet — later phases:**
- The lifetime map, travel statistics and travel identity, and who you went with (the rest of
  Phase 2 — steps 2b and 2c).
- Accounts, sync across devices, friends, or share links (Phase 3).
- Anything that reads your email for bookings (Phase 4).
- A phone app, offline mode, or a live drawn path of where you actually went (Phase 5).
- Photos placed on the trip automatically (Phase 6).
- Discovery through the network, the trip recap, and sharing polish (Phase 7).

---

## 4. What carries forward — Phase 1 is closed, nothing is owed

**Nothing is routed back to any role for Phase 1.** The table below is not unfinished Phase 1 work
— it's the disclosed list of small items and one decision that the *next* phase inherits, so
nobody has to re-derive them from git history.

| # | What | Why it matters | Next responsible role/action |
|---|---|---|---|
| — | **Jacob's call: add an "accept" control for copied stops?** | Cheap either way; changes nothing about safety, only about a screen you'll see the first time you copy something | **Jacob** — see the box at the top |
| R8-3 | A copied stop's acceptance can, in one specific case, replace a geographic anchor and mint a false conflict on a stop *you* wrote | Violates a stated invariant, but unreachable until an "accept" control exists in the app | **Architect** — must be ruled on before any accept control ships |
| R8-4 | A merge already in flight can resurrect a trip that was just deleted, in one narrow window | Real, but the delete control isn't reachable with a trip still open today | **Architect** — rule on it when `deleteTrip` becomes reachable that way, or when Phase 2's sync gives loading a second source |
| R10-1 | Two undos in a row can make one dismiss-rule clause decline instead of act; the screen looks identical either way | Cosmetic-only edge case | **Architect** — bless the current behavior or extend the rule, low priority |
| — | ~~Five dormant QA probe scripts report stale pass/fail counts~~ — **DONE** in Phase 2 I-0: sixteen probes repaired, none deleted, one line of reasoning each | Was: a QA round could waste real time chasing a false signal | **Closed.** `qa/README.md` and BUILD-NOTES' status note list every repair |
| — | ~~`BUILD-NOTES.md` has two stale numbers~~ — **DONE** in Phase 2 I-0…I-4: the current status note carries measured figures (472 tests, 71 exported symbols) | Cosmetic | **Closed.** §4/§5 further down that file are still historical — its status note says so |

**The one thing written down as a trigger, not just a residual:** Phase 2's **first breaker round**
is pre-committed to attack `doMerge`/`writeAndSettle` specifically — the code that has produced
five of this project's bugs across Phase 1 (R3-3, R7-1, R8-4, R10-3, R11-1). That's the manager's
own call, made explicitly rather than left implicit.

---

## 5. The journey — Phase 1 through shipping, as outcomes for Jacob

| Phase | You'll be able to... | Status |
|---|---|---|
| **1 — Core planner** | Plan trips like the old single-trip app, but as many trips as you want, safely — nothing you type ever silently vanishes | 🟢 **COMPLETE — SHIPPED** |
| **2 — Travel history** | Record the trips you've already taken, see your whole travel life on one map, and say who you went with — a new Cairn doesn't start empty | 🟡 **IN PROGRESS** — 2a built, not verified; 2b and 2c not started |
| **3 — Accounts, server & sharing** | Have your trips follow you across devices, and let friends see them and copy a stop into their own | ⚪ NOT STARTED |
| **4 — Email ingestion** | Forward a booking confirmation and have Cairn find it, file it on the right day, and attach the ticket | ⚪ NOT STARTED |
| **5 — Phone app & live path** | Carry Cairn on your phone, fully offline, and have it quietly draw the route you actually traveled next to the plan | ⚪ NOT STARTED |
| **6 — Photos** | Have your trip photos land on the right day — and often the right stop — automatically | ⚪ NOT STARTED |
| **7 — Discovery, recap & polish** | Find places through the people you travel with, get a real recap and cost report, and share a trip publicly with a clean page | ⚪ NOT STARTED |

*(Phases 3–7 were numbered 2–6 before the 2026-08-27 re-cut. Anything older that says "Phase 2 =
accounts" means what is now Phase 3.)*

Each later phase only starts once the one before it gets a manager verdict of **SHIP** — see
§10 for why that gate matters and isn't just a formality. Phase 1 is the only phase to have
cleared that bar so far.

---

## 6. Recent progress — R2 through R11 (Phase 1), then R12 through R19 (Phase 2)

Short version: **eleven rounds of one QA tester repeatedly trying to break the save/persistence
layer**, four design rulings from the architect, and a manager who verified the very last fix
personally before signing off — and then **eight more rounds**, all of them on Phase 2's first two
increments, seven of them on the copy path. The chronological log of rounds 12–19 is the banner
stack at the top of this file; the Phase 1 sequence is below.

- **R2–R7** — closed a lost-edit race, a vanishing pool stop, a leaked credential, an ABA
  compare-and-set spoof, an undo that could skip a write while showing "Saved," an edit discarded
  mid-transition with no error, and a silent give-up-after-retries path. (Full detail in the prior
  version of this document, preserved in git history — the short version is: nearly every round
  found a real way to lose data, until round 6.)
- **Gate review** — looked at the actual app screens for the first time in five rounds and sent
  Phase 1 back for three disclosed-but-unfixed gaps: a misleading travel time, a conflict dismissal
  that didn't stick, and a missing credit line on two screens.
- **The SEND-BACK pass** — the builder fixed all three, plus four smaller routed items, in one
  pass (387 tests passing).
- **R8** — independently verified that pass closed (0 BLOCKER), and found 4 new MAJOR issues one
  layer over: a retirement-ledger gap and a copy-path anchor problem, both routed to the architect.
- **R9** — the architect's rulings (A-5, A-5a, A-6) implemented and verified; 0 BLOCKER, 2 MAJOR
  remained, both narrow.
- **R10** — those two closed (a merge-then-undo sequence, and a stop's `place` field escaping a
  pruning rule); found one more BLOCKER, adjacent, not the same mechanism: **R11-1**.
- **R11** — the final one. **R11-1**: a merge landing at the same instant as a local edit could
  make the store discard the just-merged document from memory and silently overwrite the other
  writer's already-saved edit — with the screen still saying "Saved." Routed to the architect.
- **Architecture revision 8 (A-7)** ruled on it: the save-fence must only ever advance to a
  document the store still holds or one it wrote itself; a write that lands but is no longer
  wanted refuses instead of installing.
- **The builder implemented A-7**, with six new regression tests proving the exact defect and two
  ceiling tests proving the fix doesn't over-refuse an ordinary merge or an ordinary autosave.
- **The manager's final gate review** re-derived the fix's correctness itself — wrote its own
  probe, watched it fail against the old code and pass against the new, then attacked five adjacent
  paths by hand (closeTrip, undo, further edits, a third writer, a concurrent merge-vs-write race).
  All clean. **Verdict: SHIP.**

**Why this took eleven rounds before Phase 1 counted as shippable:** every one of these was a way
an edit could be silently lost, corrupted, or overwritten — the single worst thing a trip planner
can do. Each fix was immediately attacked rather than trusted, which is why several "closed" bugs
reopened one layer up, and why the very last one (R11-1) surfaced only after ten rounds had already
passed. That's expensive, and it's the only way to actually trust the result.

**Rounds 12–19, in one paragraph.** Phase 2's first slice went in, and the tester found two design
holes rather than code bugs: a dismissed warning being thrown away by the calendar, and city names
outside the English alphabet collapsing into one meaningless key. Both were ruled on and built —
and then every round from 14 onward landed on the same 500-line file: the one that copies an
activity from one trip into another. Round 14 found a hotel door PIN riding along in a place's
note. Round 15 found the same mistake one level deeper, in a cost note and a bus label. Round 16
found the last unchecked field in a saved file (opening hours). Rounds 17 and 18 found that a value
can be a tiny function rather than a stored fact, so *checking* a value and *using* it can be two
different values — and that the fix for it had missed nine sites across two attempts. Round 19
attacked the automatic check written to end that pattern, confirmed it works, and found three
places it was not looking. **Same file, six rounds, and the reason is not carelessness:** this is
the one place in the design where your data crosses to another person, so the standard applied to
it is deliberately higher than anywhere else, and nothing about friends or share links ships until
it is closed.

---

## 7. Technical work → why I care

| Technical thing | What it actually buys Jacob |
|---|---|
| **Persistence safety** (the R2–R11 work above) | Your edits don't silently disappear — not from a crash, a closed tab, two tabs open at once, or the app giving up after retrying |
| **Merge/save serialization**, including the last-mile fix (A-7) | Two things happening at the exact same instant — an autosave racing a merge from another tab — can't silently overwrite one side's saved work; the app now refuses and tells you instead |
| **Provenance** (every piece of data remembers where it came from) | A stop copied from a friend's trip is always visibly marked as theirs until you accept it as your own — nothing gets silently presented as your own plan |
| **Validation** (`validateTrip`, the conflicts engine) | Bad or contradictory trip data — an overlapping booking, a stop nowhere near the rest of the day, a flight time that doesn't match the ticket — gets flagged instead of silently accepted |

---

## 8. What happens next

```
  Architect  →  Builder  →  Breaker  →  Manager
   (done)      (next up)    (round 21)   (2a gate)
```

Phase 2 is underway, and the immediate sequence is short, specific, and — for the first time in
this arc — **finite by written agreement**:

- **Architect — done.** `ARCHITECTURE.md` revision 19 (**A-25**) is written: test-data completeness
  enforced by the compiler and the tests instead of by memory, one one-line fix for the
  three-same-name-cities case, city records added to what the check watches, a fifteenth test
  situation, and a **closing criterion** for the whole seven-round arc.
- **Builder — next.** One pass, in a fixed order: the one-line fix first, then the check's new
  watch list and test situation, then the completeness machinery. Two of the steps must be shown to
  fail **and** pass — back the fix out and the check must go red naming exactly the right thing;
  invent a new field and the build must refuse to go green until the test data fills it in. If
  either can't be reproduced, A-25 was implemented wrongly and that gets reported rather than
  worked around.
- **Breaker — round 21**, attacking that pass **against the six-point closing criterion** rather
  than open-endedly. The standing rule holds: it may not quietly add an exception to the check's
  list; a new exception is an architect's ruling.
- **Manager** makes the **2a SHIP / SEND BACK** call once I-3a and I-4a are genuinely closed —
  the first manager gate since Phase 1. With the criterion met, that call is a judgment about the
  two increments rather than another round of this arc. Only this role can open the rest of Phase 2.

**Still standing from Phase 1, unchanged:** whenever the merge/write code is next touched, the
first breaker round on it is pre-committed to attack `doMerge`/`writeAndSettle` — the code behind
five of Phase 1's bugs.

---

## 9. Tools / skills under consideration

Tracking third-party tools that have come up in discussion. **None of these are installed by this
document** — this is a status list, not an action.

| Tool | Status | Why |
|---|---|---|
| **superpowers** (`obra/superpowers`) | ✅ Useful now | Already vendored in `cairn/.claude/skills/` — `test-driven-development`, `systematic-debugging`, `verification-before-completion` are in active use by the four pipeline agents. `using-superpowers` itself was deliberately *not* installed (see `cairn/.claude/skills/README.md`) because its trigger rule would hijack every turn in the repo, including plain trip-edits. |
| **skill-creator** | ⏸ Useful later | Would help package a repeatable Cairn workflow as a proper skill. Not worth it while the pipeline is 4 fixed roles and a small doc set — revisit once there's a third or fourth recurring workflow to package. |
| **agent-browser** | ⛔ Not needed | The breaker's Chromium-driving QA scripts (`cairn/qa/*-browser.mjs`) already do this job, purpose-built to the specific probes this project needs. |
| **gstack** | ⏸ Useful soon | Phase 1 shipped with no server at all. Phase 3 (`services/api`, Postgres/RLS, hosting) is where a deployment stack stops being hypothetical — worth a real look once the architect starts Phase 3 design, not before. Phase 2 is local-first and needs none of it. |
| **ui-ux-pro-max** | ⏸ Useful later | Phase 1's gaps were correctness bugs — a mismatch between what the engine knew and what the screen showed — not visual design problems. Earns its keep once a phase is functionally correct and the question shifts to "does this look and feel good." |
| **taste-skill** | ⏸ Useful later | Same reasoning — matters most once Phase 7 ("discovery, recap and polish") is the actual work being done. |
| **impeccable** | ⛔ Not needed | No specific gap in the current pipeline this would fill; the project already has strict typechecking, 615 tests, and a dedicated adversarial QA role covering correctness. |
| **claude-hud** | ⏸ Useful later | A session/status dashboard could be handy once there are multiple concurrent agent sessions to watch, but `cairn/CLAUDE.md`'s "one task per session" rule keeps things to one thing at a time. |
| **GSAP / Emil** | ⛔ Not needed | Would be a runtime dependency, and `packages/core`/`packages/client` are contractually zero-dependency (`cairn-constraints` skill). Nothing before Phase 7 calls for animation work. |

---

## 10. Definition of "done"

**Code existing is not the same as a phase being shipped.** This project has a four-stage
pipeline — architect → builder → breaker → manager — specifically because "the builder says it
works" was never good enough on its own; every phase gate in this document is the **manager's**
verdict, not the builder's completion.

A phase is complete only when:

1. Its acceptance criteria in `ROADMAP.md` are met — and written so a criterion can't be
   satisfied by accident (see that file's "How a criterion is written" section — this project
   was burned once by criteria that passed while the actual thing they were meant to prove was
   still broken).
2. An adversarial tester has tried specifically to break it and the result is written down
   (`QA-FINDINGS.md`), not assumed.
3. The manager has reviewed the actual product against the brief — not just the test count — and
   recorded a verdict of **SHIP** in `REVIEW.md`.

**Phase 1 has now cleared all three, genuinely.** It is not merely "built" (code exists), and it
is not merely "verified" (a tester tried and found nothing) — the manager reviewed the actual
product, disclosed the one shortcut it took along the way (verifying the last fix itself instead
of ordering a ceremonial extra round), and recorded SHIP. That's what makes it the first phase in
this document to earn the 🟢 label rather than 🟡. The same discipline — and the same three-way
distinction — applies to every phase after it, starting with Phase 2.
