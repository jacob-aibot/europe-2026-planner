# Cairn Visual Roadmap

**Read this file, not your memory of a past session, before answering "where is Cairn."** It is
the plain-English companion to `ARCHITECTURE.md` and `ROADMAP.md` — those are the contract; this
is the status board. It does not redefine anything they say. There is also an HTML version of
this same content at `cairn/docs/CAIRN_VISUAL_ROADMAP.html` — open it in a browser (phone or
desktop) for the visual version. **Keep the two in sync**: when the state below changes, update
both files in the same pass.

> **Last updated:** 2026-08-27, against `master` @ `0a58c81` ("Cairn: the SEND-BACK pass —
> travelRole reaches the screen, and delete joins the chain"). Update this line every time you
> edit this file.

**Status vocabulary used throughout:** 🟢 COMPLETE · 🟡 IN PROGRESS · 🟠 NEXT / APPROVED ·
🔴 BLOCKED · ⚪ NOT STARTED. Also: **built** (code exists) vs **verified** (an adversarial tester
tried to break it and couldn't) vs **shippable** (a manager gate said SHIP). These are three
different claims — see "Definition of done" at the bottom.

---

## 1. Where we are

**Phase:** 1 of 6 — "the core engine and a working multi-trip planner."
**Status:** 🟡 IN PROGRESS. Sent back once by the manager gate (`REVIEW.md`, `43497a2`); the
architect answered the four rulings that review routed to design (`5bdd0dc`, "revision 5"); the
builder has now implemented all of it — the three disclosed screen gaps (B-1/B-2/B-3), the four
smaller fixes (B-4/B-5/B-6/B-7), and the three architecture rulings (A-1/A-2/A-4) — in one pass
(`0a58c81`, "the SEND-BACK pass"). **Not yet done:** an *independent* breaker round on that pass,
and the manager's re-gate. The builder's own test suite (387 pass / 0 fail, up from 333) and its
own new Chromium probe are the builder's evidence that its own work is correct — real, but not a
substitute for someone else trying to break it, which is the whole reason this pipeline has four
roles instead of one.

**Plain-English assessment.** The hard, invisible part — "does this thing lose your edits, ever,
under any race or crash" — has been done and independently verified for a while (seven rounds of
a tester actively trying to break it). The part Jacob actually looks at — the day view, the
conflicts panel, the copy-a-stop flow — had three specific, named gaps where what the screen
showed didn't match what the engine underneath already knew; the builder reports all three fixed
as of the pass that just landed. This is now "believed done, awaiting someone independent to
check" rather than either "just started" or "verified" — a real, meaningful step forward, and
still one gate away from shippable.

**Current gate status:** 🔴 the Phase 1 → Phase 2 gate is **not open**. The manager's last verdict
was SEND BACK, on the version of the product that had the three screen gaps. Before the manager
looks again, the breaker needs an independent round on this new pass — verifying B-1/B-2/B-3 as a
user in a real browser, not re-running the builder's own probe, plus the standing regression set.

---

## 2. What is already built

Only things that exist and run, today, on `master`:

- **The trip engine** (`packages/core`) — days, stops, legs, cost roll-up, geographic
  clustering, conflict detection, validation, JSON import/export, and the provenance rules that
  track who a piece of data belongs to. Zero runtime dependencies. Deterministic (no clock, no
  randomness, so the same input always gives the same output — this is what makes automated
  checking possible at all).
- **The persistence/write layer** (`packages/client`) — the part that decides when an edit is
  safe to save, refuses to overwrite a concurrent edit, and never silently drops something you
  typed. This is the part that took seven adversarial rounds (R2–R7 below) to get right.
- **The web app** (`apps/web`) — opens in a browser, loads the real Europe 2026 trip, lets you
  create a second trip, switch between trips, edit days and stops, see a day on a map, see a
  conflicts panel, and browse another trip to copy a single stop into your own (with credit to
  where it came from). As of the latest builder pass, this now also correctly renders a travel
  stop's departure/arrival, keeps a dismissed conflict dismissed, and shows the copy credit line
  on every screen that renders a stop — see §3 for the caveat on "as of."
- **A command-line tool** (`cli.ts`) — `trip`, `day`, `conflicts`, `cost`, `validate`, `export`,
  runnable with no browser at all. This is what a tester uses to check the engine without
  touching a UI.
- **387 automated tests, all passing** (up from 333 as of the latest builder pass), plus a
  separate stack of adversarial probe scripts under `cairn/qa/` that are not unit tests — they're
  built to actively try to break specific claims (a race condition, a database wipe mid-write, a
  symlink escape).

---

## 3. What I can actually do today

**Already works, right now, if you open the app:**
- Open the app and see your real Europe 2026 trip, loaded read-only from the live planner.
- Create a second trip and switch between the two without them bleeding into each other.
- Edit a day's stops, see them on a map, and not lose the edit if you close the tab, switch
  trips, or have it open in two tabs at once.
- See a conflicts panel that flags exactly your two real red-flag days (Aug 18, Aug 20) and
  nothing invented.
- Browse your other trip and copy one stop into this one — it arrives badged "from a friend"
  with a credit line saying which trip, and any door PIN or booking number in the note is
  redacted.
- Export and re-import a trip as a JSON file (backup/restore).
- **As of the latest builder pass** (not yet independently verified, see §4): a flight/train stop
  reads "departs 14:30 · 1h 20m · arrives 15:50" instead of the misleading old string; dismissing
  a conflict stays dismissed even if you edit the value away and back; the "copied from" credit
  line shows up wherever a copied stop is rendered, including the two screens it was missing from.

**Believed fixed, pending independent verification (see §4):** the three gaps above are what the
last manager gate sent back. The builder reports all three fixed, with its own tests and its own
new browser probe as evidence. That is real work, and it is exactly the kind of self-reported
"done" this project's own pipeline does not treat as the final word — the breaker's independent
round on this specific pass hasn't happened yet.

**Not built at all yet — planned for a later phase, not Phase 1:**
- Accounts, sync across devices, friends, or share links (Phase 2).
- Anything that reads your email for bookings (Phase 3).
- A phone app, offline mode, or a live drawn path of where you actually went (Phase 4).
- Photos placed on the trip automatically (Phase 5).

---

## 4. What is left for Phase 1

The seven items the manager's last gate review routed to the builder, plus three architecture
rulings, all landed in one pass (`0a58c81`). **Every row below is "built by the builder, not yet
independently verified"** — that distinction is the whole remaining gap, not a list of unwritten
code.

| # | What | Why it matters | Status |
|---|---|---|---|
| B-1 | Show a flight/train's departure vs. arrival correctly in the day view | The single thing most likely to mislead Jacob on a travel day — the exact bug the old planner had | 🟡 built, unverified |
| B-2 | Make the conflicts panel's "dismiss" actually stick | Right now dismissing something was pointless — it came back on its own | 🟡 built, unverified |
| B-3 | Show the "copied from" credit everywhere a copied stop appears | The rule is "never let a copied thing look unattributed"; two screens broke it | 🟡 built, unverified |
| B-4 | Tell the user when autosave gives up after retrying, and reschedule the save | It used to fail silently with no further attempt until the user typed again | 🟡 built, unverified |
| B-5 | Fix the sample-data scrub so a real booking reference/flight number can't leak into a build file | One did — the rule that shipped wasn't the rule Jacob asked for after the last review | 🟡 built, unverified |
| B-6 | Close narrow, UI-unreachable holes in the write/save logic found by round-7 QA | Not reachable by a user, but "not reachable yet" isn't the same as "safe" | 🟡 built, unverified |
| B-7 | Fix a file-export symlink escape, and a permission check that didn't validate a date string | Both small, both exactly the kind of thing that becomes real once Phase 2 adds real users | 🟡 built, unverified |

**What's actually next — process, not code (unless the breaker finds something):**

1. **Breaker, independently** — drives B-1/B-2/B-3 as a user in a real browser (not the builder's
   own `qa/r8-views.mjs`, though that's a useful starting point), walks the phase's full "what
   Jacob can do" list end to end, and re-runs the whole standing regression set to confirm nothing
   regressed under 387 tests' worth of change.
2. **Manager re-gates** — SHIP or SEND BACK, against the actual product, not the test count.

Nobody skips a step in that chain for a phase-boundary decision — see `cairn/CLAUDE.md`'s
delegation table. If the breaker finds the builder's fixes don't hold up, this table gets new rows.

---

## 5. The journey — Phase 1 through shipping, as outcomes for Jacob

| Phase | You'll be able to... | Status |
|---|---|---|
| **1 — Core planner** | Plan trips like the old single-trip app, but as many trips as you want, safely — nothing you type ever silently vanishes | 🟡 IN PROGRESS |
| **2 — Accounts & sharing** | Have your trips follow you across devices, and let friends see them and copy a stop into their own | ⚪ NOT STARTED |
| **3 — Email ingestion** | Forward a booking confirmation and have Cairn find it, file it on the right day, and attach the ticket | ⚪ NOT STARTED |
| **4 — Phone app & live path** | Carry Cairn on your phone, fully offline, and have it quietly draw the route you actually traveled next to the plan | ⚪ NOT STARTED |
| **5 — Photos** | Have your trip photos land on the right day — and often the right stop — automatically | ⚪ NOT STARTED |
| **6 — Sharing polish & cost reports** | Share a trip publicly with a clean page, and get a real cost report across a trip | ⚪ NOT STARTED |

Each later phase only starts once the one before it gets a manager verdict of **SHIP** — see
§10 for why that gate matters and isn't just a formality.

---

## 6. Recent progress — what the R2–R7 rounds actually did

Short version: **seven rounds of one QA tester repeatedly trying to break the save/persistence
layer, and finding a real way to lose data almost every time until round 6.** In order:

- **R2** — found and closed a lost-edit race, a stop that could vanish from the trip pool, and a
  copy-a-stop path that leaked a real credential into the copied note.
- **R3** — found the compare-and-set "is this still safe to save" check could be spoofed by a
  delete-then-recreate sequence (a classic "ABA" bug), and a debounced save could be abandoned
  mid-flight if you switched trips at the wrong instant.
- **R4** — found the *fix* for R3 had the same root bug one layer upstream: an undo followed by a
  new edit could reuse an old "this was already saved" marker and skip the write entirely, with
  the screen still saying "Saved."
- **R5** — found a case where an edit made *during* the save-before-switching-trips check could be
  thrown away with no error shown, plus a provenance check that could be satisfied by a blank
  actor field.
- **R6** — verified R5's fixes hold (deliberately reverted them in a scratch copy and watched the
  tests go red, to prove the tests were catching the real thing, not passing by accident), and
  found the "give up after 5 retries" path failed silently.
- **R7** — verified everything again, closed the last MAJOR-severity save-path bug, and found three
  more narrow issues that (for now) can't actually be triggered through the shipped UI.
- **Then the manager's gate review** looked past the save logic to the actual screens for the
  first time in five rounds, and sent Phase 1 back for three disclosed-but-never-fixed gaps (§4).
- **The builder's SEND-BACK pass** (`0a58c81`) just landed: all three screen gaps plus the smaller
  routed fixes, 387 tests passing. Independent verification of *this specific pass* hasn't
  happened yet — that's §4's "what's actually next."

**Why this took so long before Phase 1 was even considered close to ready:** every one of these
was a way an edit could be silently lost, corrupted, or double-applied — the single worst thing a
trip planner can do to someone's actual trip. Each fix closed one hole and QA immediately
attacked the fix itself rather than taking it on faith, which is why several "closed" bugs
reopened one layer up. That is expensive and it is also the only way to actually trust the
result — a save path that's merely "believed to work" is not different from one that's broken,
until someone has tried hard to break it.

---

## 7. Technical work → why I care

| Technical thing | What it actually buys Jacob |
|---|---|
| **Persistence safety** (the R2–R7 work above) | Your edits don't silently disappear — not from a crash, a closed tab, two tabs open at once, or the app giving up after retrying |
| **Merge/save serialization** (no two writes racing each other) | Two things happening "at once" — an autosave and a manual save, or two tabs — can't corrupt the trip into a half-applied state |
| **Provenance** (every piece of data remembers where it came from) | A stop copied from a friend's trip is always visibly marked as theirs until you accept it as your own — nothing gets silently presented as your own plan |
| **Validation** (`validateTrip`, the conflicts engine) | Bad or contradictory trip data — an overlapping booking, a stop nowhere near the rest of the day, a flight time that doesn't match the ticket — gets flagged instead of silently accepted |

---

## 8. What happens next

```
  Breaker   →  Manager
 (round 8)    (re-gate)
```

- **Architect** already did its part for this cycle — revision 5 (`5bdd0dc`) answered the four
  design questions the last gate review raised.
- **Builder** also already did its part — the SEND-BACK pass (`0a58c81`) implements all seven
  routed items plus the three architecture rulings.
- **Breaker** is next: an independent round on this specific pass, focused on the app screens
  (six rounds already went into the save logic; the screens have had one systematic pass so far,
  which is what found the three gaps that are now believed fixed).
- **Manager** makes the SHIP / SEND BACK call once the breaker's round is in. This is the only
  role that can open Phase 2.

---

## 9. Tools / skills under consideration

Tracking third-party tools that have come up in discussion. **None of these are installed by this
document** — this is a status list, not an action.

| Tool | Status | Why |
|---|---|---|
| **superpowers** (`obra/superpowers`) | ✅ Useful now | Already vendored in `cairn/.claude/skills/` — `test-driven-development`, `systematic-debugging`, `verification-before-completion` are in active use by the four pipeline agents. `using-superpowers` itself was deliberately *not* installed (see `cairn/.claude/skills/README.md`) because its trigger rule would hijack every turn in the repo, including plain trip-edits. |
| **skill-creator** | ⏸ Useful later | Would help package a repeatable Cairn workflow (e.g. "run the standing QA regression set") as a proper skill. Not worth it while the pipeline is 4 fixed roles and a small doc set — revisit once there's a third or fourth recurring workflow to package. |
| **agent-browser** | ⛔ Not needed | The breaker's Chromium-driving QA scripts (`cairn/qa/*-browser.mjs`) already do this job, purpose-built to the specific probes this project needs. Adding a general browser-automation skill on top would be a second way to do the same thing. |
| **gstack** | ⏸ Useful later | No deployment stack exists yet — Phase 1 has no server. Revisit at Phase 2, when `services/api` and a real hosting story get designed. |
| **ui-ux-pro-max** | ⏸ Useful later | Phase 1's open UI gaps (§4) are correctness bugs — a mismatch between what the engine knows and what the screen shows — not visual design problems. A UI/UX review tool earns its keep once the phase is functionally correct and the question shifts to "does this look and feel good." |
| **taste-skill** | ⏸ Useful later | Same reasoning as above — aesthetic judgment matters most once Phase 6 ("sharing surfaces and polish") is the actual work being done. |
| **impeccable** | ⛔ Not needed | No specific gap in the current pipeline this would fill; the project already has strict typechecking, 333 tests, and a dedicated adversarial QA role covering correctness. |
| **claude-hud** | ⏸ Useful later | A session/status dashboard could be handy once there are multiple concurrent agent sessions to watch, but right now `cairn/CLAUDE.md`'s "one task per session" rule keeps things to one thing at a time. |
| **GSAP / Emil** | ⛔ Not needed | Would be a runtime dependency, and `packages/core`/`packages/client` are contractually zero-dependency (`cairn-constraints` skill). Even in `apps/web`, which may take dependencies, nothing in Phase 1–5 calls for animation work. Revisit only if Phase 6 polish specifically wants motion design. |

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

Phase 1's engine and save logic are **built and verified** — genuinely, by the standard above.
The three screen gaps the manager sent back are now **built**, per the builder's own tests and
probe — that is not the same claim as **verified**, which needs an independent breaker round, and
neither is the same as **shippable**, which needs a manager verdict of SHIP. All three states are
real and distinct, and this document tries to always say which one it means.
