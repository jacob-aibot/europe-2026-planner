# Cairn — manager reviews

**Four verdicts live in this file, newest first.** Phase 2 increment **I-8a** is the current
one; the **2b (data layer)**, **2a** and **Phase 1** verdicts below it are **closed and kept
for the record**, not superseded — their routing discharged and their carried items re-placed
downstream.

| Verdict | Scope | Commit reviewed | Date | Result |
|---|---|---|---|---|
| **I-8a — the tab shell, the world map, the token layer, the signal-collision fix** | `ROADMAP.md` Phase 2, step 2b, increment **I-8a** (revision 27) against `ARCHITECTURE.md` §4.4 **A-40** (revision 29) — **I-8b is not included, and 2b does not ship here** | `6b89c91` | 2026-08-31 | **SHIP** (7 items routed; 4 of them gate I-8b) |
| **2b (data layer) — I-5 … I-7b** (geography attribution, `travelStats`, the summary-row read boundary) | `cairn/docs/ROADMAP.md` Phase 2, step 2b, increments I-5 through I-7b, A-26…A-39 — **I-8 (the Map/Profile surfaces) is not included** | `69e44d4` | 2026-08-29 | **SHIP** |
| **2a — past trips and the lifecycle** (I-0 … I-4a) | `cairn/docs/ROADMAP.md` Phase 2, first of three steps | `67f5588` | 2026-08-28 | **SHIP** |
| **Phase 1** — core engine + local-first client | whole phase | `218c7f0` | 2026-08-27 | **SHIP** (closed) |

---

# I-8a — the tab shell, the world map, and the token layer

> **Status: CURRENT.** Manager, stage 4. Reviewed `master` @ `6b89c91` (QA round 33's record
> landed alongside at `e15c80d`), 2026-08-31, Node v22.22.2, Chromium via the system
> Playwright at `/opt/node22/lib/node_modules/playwright`. **Verdict: SHIP. I-8a is closed;
> I-8b may open, and four of the seven routed items gate it.**
> Scope was I-8a and nothing else. **2b does not ship here** — ROADMAP says so and this verdict
> does not move it. Every claim below has a command in **Verified — I-8a** that I ran myself,
> on this tree.
>
> **Unlike the 2a review, Playwright is available in this environment**, so the browser half
> of the board is my own evidence rather than a prior round's. I drove the shipped Europe 2026
> sample through the real UI, looked at the rendered map, and measured it before reading
> anyone's numbers for it.
>
> **The breaker's advisory lean was SEND BACK and I am overruling it, with reasons rather than
> a preference** — see *Why this is not a SEND BACK*, and *Where I disagree with round 33*,
> below. Its four MAJORs are all real; I reproduced every one. What I do not accept is its
> stated ground for blocking.

---

## Verdict: **SHIP**

**Every deliverable I-8a names is built, none is a stub, and the increment's written ship gate
is met.** I re-derived the gate clause by clause rather than reading the harness's exit code —
which matters here, because the harness's exit code is partly meaningless and I had to
establish the substance by hand.

Concretely, on my own runs:

- **`worldMapFrame`** — pure, zero-dependency, `node --test`-able, never throws for a code the
  index cannot fill, not memoised, does not mutate `stats` or the index, row order verbatim.
  18/18 in `packages/client/test/world-map.test.ts`, and I ran the frame myself against the
  real sample rather than a fixture.
- **`WorldMap.tsx` under A-40 Part 4** — W1's greppable ceiling is clean on my own grep, over a
  set **wider** than the ruling names (10 identifiers, comments included): 0 hits. W2 holds —
  the handler is on the `<path>` and there is no coordinate arithmetic in the file at all.
- **CLAUDE.md's first map bug is genuinely absent, measured on my own oracle.** Booting on
  Trips, the Map panel is mounted inside a container that computes `display: none` with
  `getBoundingClientRect().width === 0`, and its `viewBox` attribute is already
  `-171.7911 -71.3578 194.5016 52.4416`. After the tab switch it is the **same string, byte for
  byte**, and it is also the string `worldMapFrame` returns in bare Node from the same rows.
  Three independent readings, one string. That is the strongest single result in this
  increment and it is the one A-40 was written to produce.
- **The tab shell** — `TABS` ids are exactly `['trips','map']`, every id has a `render`, no
  fourth slot, `Profile.tsx` does not exist and no Profile tab is stubbed. The *"no DISCOVER"*
  ceiling is comment-stripped before it greps, so it is an honest ceiling and not one that
  passes by accident.
- **The signal-collision fix** — `opacity: .72` is gone from the stylesheet; no provenance,
  provisional or unresolved-severity selector sets `opacity` anywhere in the shipped CSS; the
  blocker's colour and the product of every ancestor `opacity` are identical on an `imported`
  row and an `own` row. This was a real design defect and it is really fixed.
- **The read-only boundary and §6.6 hold.** Root diff empty, `md5sum` unchanged at
  `7c69df3208ef91c8be0fb59a56443188`, `packages/core` byte-untouched, `ports/map.ts`
  byte-identical, export surface still **75**, `r2-redact` **0 KNOWN_LEAKS**, and the only
  match for `fonts.googleapis|gstatic|cdn.` anywhere in `apps/web` is a comment saying the app
  does not use one.

### The one thing I re-derived from scratch, because it decides the verdict: R33-1

I did not take the pixel measurements on faith. I loaded the shipped sample through the real
*"Load Europe 2026"* button, switched to Map, screenshotted the figure and **looked at it**.

The stored row is `["AT","CZ","DE","GB","HR","HU","US"]`. In a 958 × 418 px figure the rendered
country boxes are **US 516.3 · GB 45.6 · DE 44.5 · AT 36.9 · CZ 32.6 · HU 32.1 · HR 28.2** css
px, and the six European countries the trip is actually about occupy **149.2 px of 958**,
against the right edge. Looking at the picture rather than the numbers: it is a map of the
United States with a legible United Kingdom beside a clump of five continental countries that
are separated only by hairlines. It is not "a few pixels wide" as BUILD-NOTES says, and it is
not unreadable either — **it is a map of the wrong subject.**

**The breaker's re-derivation of the cause is correct and the builder's is not**, and I checked
this myself rather than adjudicating between them: the reference extent is
`-171.7911 … 22.7105`, one contiguous 194.50° span, **no country's box touches ±180°**, and
re-expressing every longitude into `[0,360)` makes the span *worse*. So BUILD-NOTES'
*"the fix is dateline-aware bounds in a core function the day map also depends on"* is wrong —
that change would leave this frame byte-identical — and A-40 Part 7 residue 1's framing of the
whole case as *"the antimeridian"* is a misdiagnosis. The cause is a single equirectangular
extent over a set containing one 106°-wide outlier. **Nobody should be asked to build
dateline-aware bounds on the strength of this finding**, and that is the single most valuable
thing round 33 produced.

**Why it does not block.** Four reasons, in order of weight:

1. **The frame is not wrong; it is framed wrong, and the framing is a ruling this increment
   obeyed.** A-40 clause 2 states, as a ruling, that *"the extent comes from core and nothing
   else"* — `worldMapFrame` collects each visited country's `box` corners and calls
   `mapBounds`. The builder implemented that literally, reported the consequence in writing
   rather than improvising past it, and A-40 Part 5 explicitly forbids a builder inventing a
   second geometry pass on its own authority. Sending this back to a builder would be sending
   back a correct implementation of the architect's own sentence.
2. **Nothing on the screen is false.** All seven countries are drawn, correctly attributed,
   correctly filled; the provisional treatment is distinct; the code list underneath names all
   seven and each is tappable; and the surface states what it could not attribute. This is a
   legibility defect, not a correctness, data-loss or privacy one.
3. **It does not get more expensive after I-8b, and the breaker's contrary claim is the one
   part of its reasoning I checked and found wrong.** Round 33 grounds its SEND BACK lean on
   *"the Profile renders the same `travelStats` rows on the same screen."* `worldMapFrame` has
   exactly **one** product consumer — `apps/web/src/views/WorldMap.tsx` — and I-8b's Profile is
   text off `travelStats`, not off the frame. The frame is map-only. So the cost of ruling on
   R33-1 during I-8b is the same as ruling on it now.
4. **I-8a is explicitly not the point at which Jacob sees a shipped 2b.** ROADMAP: *"2b does
   not ship here — the phase's map/identity pair is only half delivered until I-8b."* The gate
   at which this map reaches a user is I-8b's, and I am putting R33-1 on that gate as a hard
   blocker rather than a note.

What I will not do is ship it quietly. It goes to Jacob in plain words below, with the
decision attached, because *"drop the outlier / inset it / fit the modal cluster"* is a product
question about what *"everywhere you've been"* means, not a purely technical one.

### Why this is not a SEND BACK

Stated the same way 2a stated it, so it cannot be read as a soft SHIP: **if any one of the nine
open items were a data-loss path, a privacy leak, a wrong-person's-data path, or a named I-8a
deliverable that was not built, this would be a SEND BACK.** None is, and I checked each of
those four classes by running something rather than by reading the finding:

- **Data loss / availability.** R33-3 is the only candidate and it is real — one unreadable
  stored row leaves the Trips tab permanently unusable with `["BUTTON:CAIRN","BUTTON:TRIPS",
  "BUTTON:MAP"]` as the complete set of surviving controls, and `TabBoundary` never resets even
  after the cause is removed. **But I re-derived the reachability myself, because that is what
  decides it:** `createTrip` refuses all seven malformed dates I tried, and `fromJSON` — the
  backup/restore path — refuses six of the seven. No shipped write path mints such a row. This
  is the same class as R8-3/R8-4, which 2a and Phase 1 both carried with a trigger rather than
  blocking on.
- **Privacy.** `r2-redact` against the rebuilt `dist/`: **0 KNOWN_LEAKS**, 3 hits, all the
  pre-existing `OPTIONAL`/`BOOKINGS` identifiers. No door PIN, no booking reference, no ticket
  URL. No CDN reference, no external font, nothing new that touches a network.
- **Wrong person's data.** Nothing in this increment touches `access/`, `redactText`,
  `copyStop`, `cli export` or a provenance transition. `packages/core` is byte-untouched.
- **A named deliverable missing.** All six of I-8a's *"Built"* bullet are present and none is a
  stub. `Profile.tsx`'s absence is the spec, not a gap.

The ship gate itself is met, with one honest caveat I discharged by hand rather than waving
through — see the table below and **R33-4**.

### Where I disagree with round 33

Round 33 is a strong pass and I am recording where it is wrong, because it is committed to
`master` as the record and the next round will read it.

- **Its ground for SEND BACK does not hold.** See point 3 above: `worldMapFrame` has one
  consumer and the Profile is not it.
- **One of the numbers it certifies as exact is not.** Its closing table says *"`d` payload:
  reference library 11,090 B = 10.8 KB (AT 618, CZ 574, GB 879, HR 694, HU 522, US 7,803) …
  both figures re-computed, not quoted."* That is a **six**-code set with no `DE`. The
  reference library's actual set is seven codes including `DE` — round 33 prints exactly that
  set two rows earlier, in R33-1's own text. Re-derived by me from the real sample: **12,040 B
  = 11.8 KB (AT 618, CZ 574, DE 950, GB 879, HR 694, HU 522, US 7,803)**. Immaterial to the
  512 KB ceiling; material to the claim that every builder number was re-derived. The origin is
  BUILD-NOTES, which names the same wrong six-code set; round 33 re-derived the builder's *code
  list* rather than the sample's.
- **Its own committed probes report FAILs that its status note does not disclose.**
  `qa/r33-frame.mjs` ends `# 2 FAILED` and `qa/r33-reach.mjs` ends `# 1 claim(s) NOT
  confirmed`. Both are the probe demonstrating a finding rather than a regression — which is a
  legitimate style — but this project has now twice been bitten by exactly this (Phase 1's
  *"probe repair, five rounds overdue"*, and 2a's **B-1**…**B-4**), and the whole point of a
  disclosed FAIL count is that round 34 can tell an expected red from a new one.

None of these three changes any of round 33's findings. All four MAJORs reproduce.

---

## Routing — I-8a

Nine items. **None blocks this verdict. Four of them block I-8b, and that is a hard gate, not a
preference.** Each names its agent, its file, and its trigger.

### architect — **before I-8b**, in one pass, because they are one frame

- **A-41. R33-1 — A-40 Part 7 residue 1 is misdiagnosed, its reopening trigger has fired, and
  the fix it names would do nothing.** Residue 1 says *"reopen it with a real user, not a
  hypothetical one."* The real user's library is the shipped sample and it hits the case on
  first paint. **Do not rule dateline-aware bounds**: measured, no country in the reference set
  has a box touching ±180°, the extent is one contiguous 194.50° span, and re-expressing
  longitudes into `[0,360)` makes the span worse (350.75° vs 194.50°), so a dateline-aware
  `mapBounds` leaves this frame byte-identical — and it would change a core function the day
  map depends on for nothing. **What is actually needed is a ruling on how the lifetime frame
  is chosen when one country's box lies far outside the rest**, and A-40 clause 2's
  *"the extent comes from core and nothing else"* is the sentence that has to move or be
  qualified. Three candidate shapes, all of which are product decisions as much as technical
  ones and **all three of which are on Jacob's desk below**: fit the modal cluster and inset
  the outlier; fit everything but let the surface offer a "zoom to Europe"-style reframing;
  or accept the wide frame and say in words what it is showing. Whatever is ruled, A-40 Part 5's
  *"no second geometry implementation"* still binds — a framing choice is not a simplifier, and
  the ruling should say which side of that line it sits on. **Fold R33-6 into the same
  ruling** (below). Evidence: `qa/r33-frame.mjs` §1, `qa/r33-render.mjs` §D, and my own run in
  **Verified** rows 12–14. **Trigger: I-8b does not ship until this is ruled and built.**
- **A-42. R33-2 — A-40 clause 2's claim that `MIN_SPAN_KM` satisfies "must not open at a
  rooftop zoom" is false at world-map scale, and the criterion it licenses verifies a number
  with no rendered consequence.** Re-derived across all 239 index codes: **`VA` is the only
  code that clamps**, at exactly `MIN_SPAN_KM` = **1.2 km**, which is a *day-map* constant
  (`cluster.ts:104`: *"a zoom-16 window is ≈1.2 km wide"*) and zoom 16 **is** rooftop zoom;
  `AT` is 631 km and does not clamp, so ROADMAP I-8a's second criterion is unsatisfiable as
  written and its injected fault is green — **the builder's `AT`→`VA` substitution is sound and
  reporting it rather than editing the criterion was the right call**. Two things to rule: (a)
  what the world map's min-span guard should actually be, given it is a different surface from
  the day map with a different constant; and (b) rewrite ROADMAP I-8a's second criterion to
  assert something with a rendered consequence — as it stands the surface has no tiles and
  draws no unvisited countries, so a one-country history paints the same single polygon at any
  scale, and the only visible difference between `VA` (1.20 km, clamped, prints *"Zoomed out to
  a readable minimum"*) and `GI` (1.76 km, not clamped, prints nothing) is a claim the geometry
  does not support. **Edit the ROADMAP criterion in this pass** — the builder correctly refused
  to, and sequencing rule 5 makes it yours. Evidence: `qa/r33-minspan.mjs`, `qa/r33-render.mjs`
  §H. **Trigger: I-8b does not ship until this is ruled.**
- **A-43. R33-6 — the frame has zero inset, measured exactly.** `bounds.east` is `22.7105` and
  the easternmost drawn vertex is `22.7105`; my own measurement of the inset is **0.000000**.
  With `overflow: hidden` on `.worldmap__figure` and `vectorEffect="non-scaling-stroke"`, the
  outer half of the extreme country's stroke is clipped, and I can see it in the screenshot.
  `mapBounds` has no padding concept and W1 forbids the renderer computing one, so it belongs
  in A-40 Part 3, which does not mention it. **Rule it as part of A-41 — it is the same frame
  and it would be perverse to decide the extent twice.**
- **A-44. R33-3's design half, and only that half.** The builder correctly refused to decide
  alone where `core.lifecycle`'s read gate belongs, given A-37 Part 2 already put one around
  `travelStats`. Rule it. The concrete question: `lifecycle` → `dayNumber` → `parseIsoDate`
  throws (`summary.ts:73`) and `Library.tsx:29` calls it per row through `LifecycleChip` with
  no gate, which is A-37's own failure class on a second surface. Decide whether the gate goes
  in `lifecycle`, in a client selector, or in each surface, and say so once. **Trigger:
  before I-8b, which registers a third surface into the same shell.**
- **A-45 (new this pass, mine, not round 33's). `fromJSON` accepts a calendar-invalid date that
  produces a nonsense number on the surface I-8a just built.** Round 33 checked whether such a
  row reaches a *throw* and correctly concluded it does not. It did not check whether it
  reaches a *wrong answer*. Measured, my own run: `fromJSON` refuses `"202-01-01"`,
  `"10000-01-04"`, `"2026-8-7"`, `""`, `"March 2019"` and `"not-a-date"` — and **accepts
  `"2026-02-30"`**, a date that does not exist. Carried through the real pipeline, that trip
  gives `lifecycle` = `active`, `tripSummary` succeeds, and `travelStats` reports
  **`daysTravelled` = 183 for a two-day trip**; `"2026-13-01"` gives `0`. The Map tab renders
  `stats.daysTravelled` in its stat row, so I-8a is the first surface to print it. Reachable
  through **a shipped write path** (backup/restore of the user's own hand-edited export) —
  unlike R33-3 — which is why it is here and not filed as a curiosity. This is §2.1 **A-32**'s
  `IsoDate` *domain* question, so it is the architect's, not a builder patch. **Trigger: before
  I-8b, which renders the same number as text on the Profile — this is the item round 33's
  "gets more expensive after I-8b" argument actually applies to, and it is not one of the two it
  applied it to.** Repro: the two scripts in **Verified** rows 20–21.

### builder — the next builder pass, before any further increment quotes `i8a-faults.sh`

- **BLD-2. R33-4 — `qa/i8a-faults.sh:58` decides RED as "the suite failed", and three of the
  ten ship-gate faults are vacuous as measured.** Confirmed on my own control, not read from
  the finding: an **unmutated** copy of the tree, run at the harness's own `test/views.test.ts`
  scope, reports `# pass 22 / # fail 1` — so line 58's `grep -qE '^# fail 0$'` cannot match and
  the harness scores W1, the shared-opacity fault and the `backdrop-filter` fault **RED with no
  fault injected**. The failing test is `test/views.test.ts:84` (*"every exemption's
  justification holds"*), and the cause is `loadEurope2026` → `extract-legacy.mjs` →
  `ENOENT … /europe-2026-itinerary.html`, because a copied `cairn/` cannot reach the repo-root
  planner. **Fix it by making the verdict specific, not by making the suite green** — match the
  named `not ok` id, or take a per-test scope. Making `loadEurope2026` resolve the planner from
  the git root is the lesser fix: it papers over a harness whose verdict is *"something in the
  file went red"* when the ROADMAP asks for *"the named criterion went red"*.
  **This is not blocking, and here is exactly why:** I discharged the substance by hand. Each
  of the three mutations, applied to a fresh copy, adds **its own named failure** on top of the
  pre-existing one — `not ok 15 - I-8a / A-40 W1: WorldMap.tsx reads no layout geometry`,
  `not ok 21 - I-8a: no provenance signal is carried by opacity`, `not ok 23 - I-8a: neither
  named removal comes back`. The three criteria **are** load-bearing; the instrument does not
  establish it and I do, in **Verified** rows 8–9. Repro: `bash qa/r33-vacuity.sh`.
- **BLD-3. R33-3's recovery half.** Two things, both in `apps/web/src/App.tsx`: `TabBoundary`
  (`:87-110`) latches `message` for the session and has **no reset**, so it keeps showing the
  banner even after the cause is gone — I watched that happen. And with the Trips tab down, the
  complete set of visible controls is `["BUTTON:CAIRN","BUTTON:TRIPS","BUTTON:MAP"]`: the
  Library is the only surface with delete, export or restore, and the Library is the surface
  that threw. Give the boundary a reset (a *"Try again"* that clears `message`), and give the
  user **one** recovery that does not live inside the surface that throws. Do **not** invent
  the read-gate placement — that is **A-44**. Repro: `qa/r33-render.mjs` §F.
- **BLD-4. R33-5, `apps/web/src/styles.css:221`.** `.tabbar { position: sticky; top: 2.7rem }`
  is a hardcoded **43.2 px** against a topbar that computes **38.38 px**, so a **4.81 px**
  stripe of scrolling page content shows between the two sticky bars at every viewport —
  measured again on my own run at 375 px (`topbar bottom 38.4, tabbar top 43.2`). Derive the
  offset rather than hardcoding it. Ride the related z-index line with it: `.leaflet-top`
  computes `1000` and `.leaflet-control` `800` against `.topbar` **500** and `.tabbar` **490**,
  so the day map's zoom controls paint over both bars.
- **BLD-5. R33-8, `apps/web/src/styles.css:416`.** The token layer declares three severity
  channels and uses one: `--sev-warning` and `--sev-note` are declared at `:92-93` and appear
  in **no** rule, `.stop--flag` paints **every** conflict severity in `--sev-blocker`, and this
  pass *strengthened* it — I diffed it: `color-mix(in srgb, var(--danger) 55%, var(--line))` at
  `04eeb5d` → full `var(--sev-blocker)` = `var(--danger)` at `6b89c91`. `DayTimeline.tsx:115-117`
  already computes a `data-severity` attribute and **nothing in the CSS reads it** (0 matches).
  Wire the attribute the builder already emitted to the two channels the builder already
  declared. Correctly MINOR: measured in the browser, the reference trip's opening view renders
  **0** flagged cards, so nothing is mis-coloured on Jacob's trip today.
- **BLD-6. R33-7, `apps/web/src/App.tsx:208-223`.** `role="tablist"`/`role="tab"` is declared
  and neither half of the WAI-ARIA tablist pattern is implemented: no arrow-key navigation, and
  `tabIndex` is `[0, 0]` rather than a roving single stop. Either implement the pattern or drop
  the roles. Confirmed by reading — there is no `onKeyDown` on the tab buttons at all.
- **BLD-7. R33-9 plus one more, both in `BUILD-NOTES.md`'s I-8a addendum, doc-only.** (a) The
  scope line says *"11 new files (4 of them font binaries) and 10 changed"*; measured,
  `git diff --name-status 04eeb5d 6b89c91` is **10 added / 13 modified**. (b) More worth
  fixing: the payload row's *"reference library"* set is `AT HR CZ HU GB US` — six codes, no
  `DE` — and the reference library's actual set is `["AT","CZ","DE","GB","HR","HU","US"]`. The
  true figure is **12,040 B = 11.8 KB** with `DE 950`, not 11,090 B. Still an order of magnitude
  under the 512 KB ceiling, so nothing about A-40 Part 5 moves; correct the number so the next
  round does not re-derive a wrong one from it, as round 33 did.

### breaker — before round 34, in a commit of its own

- **B-6. Round 33's own probes report undisclosed FAILs, which is the B-1…B-4 rot recurring one
  round after it was cleared.** `node --experimental-strip-types qa/r33-frame.mjs` ends
  `# 2 FAILED` (both are R33-6's padding assertions, i.e. the probe demonstrating its own
  finding) and `qa/r33-reach.mjs` ends `# 1 claim(s) NOT confirmed` (`createTrip ACCEPTS a
  range that crosses year 9999` — it does not; it refuses). Neither count appears in
  `QA-FINDINGS.md`'s round-33 status note, which lists the four commands with no expected
  colours. **Either re-express them as positive assertions of what is true, or state the
  expected FAIL count beside each command in the status note.** A standing probe whose expected
  colour is undocumented costs the next round real time — this file has said so twice.
- **B-7. Round 33 did not attack the token layer's own claim.** Its "what I could not break"
  list is long and genuinely good on dark mode, motion, network and composition — but the
  increment's other half is *"the type scale, rule weights, radii and the signal channels
  declared once as custom properties"*, and the pass verified the two named removals and the
  11 px floor and stopped. **BLD-5 is the defect that was sitting in that gap** — three
  declared channels, one used, and a `data-severity` attribute wired to nothing — and it was
  found by reading rather than by the round. Round 34 takes the token layer as a named target:
  every declared custom property is either used or removed, and every attribute the views emit
  for styling is either read by a rule or deleted.

### Carried forward, re-placed rather than re-derived

| Item | Status at this gate | Where it now belongs |
|---|---|---|
| **R32-3, R32-4** (MINOR) | Untouched by this pass, unchanged | `QA-FINDINGS.md` round 32. Not I-8a items |
| **R31-2…R31-4, R30-2…R30-5, R29-3, R27-1…R27-3** | Untouched, unchanged | Unchanged homes |
| **2a's A-1** (provenance half), **A-2** (P2-8), **BLD-1** (P2-5) | Unchanged; none is an I-8a item and none was reopened here | 2a's routing table, unchanged triggers |
| **B-1…B-4** (2a's probe rot) | Not re-run this pass; **B-6 above is the same failure recurring**, which is the more useful signal | Fold B-1…B-4 into B-6's commit |
| **R8-3, R8-4** (MAJOR, unreachable) | Unchanged. Nothing in I-8a made either reachable — `acceptCandidate` still has no control, `deleteTrip` still only at `Library.tsx` | Phase 3, triggers unchanged |

---

## The I-8a ship gate, clause by clause, and how I checked each

ROADMAP I-8a's ship gate is three clauses. I checked all three and I did not accept the
harness's verdict for the middle one.

| Gate clause | Result |
|---|---|
| **A-40's W1 grep is clean** | **PASS**, my own grep, over a **wider** identifier set than the ruling names: `getBoundingClientRect`, `offsetWidth`, `offsetHeight`, `ResizeObserver`, `innerWidth`, `clientX`, `clientY`, `elementFromPoint`, `getBBox`, `getScreenCTM` — **0 hits** in `WorldMap.tsx`, comments included |
| **Every criterion has its injected fault red** | **PASS on substance, with the instrument defective — and the distinction is mine, established by hand.** `bash qa/i8a-faults.sh` exits **0** with all 10 measured RED. But 3 of the 10 are scoped to `test/views.test.ts`, which fails once in a copied tree with no mutation at all (`# pass 22 / # fail 1`, my own control), so those three verdicts are vacuous *as measured*. I then measured the substance directly: each of the three mutations adds **its own named `not ok`** (15 / 21 / 23). The clause is true; the harness does not establish it. **BLD-2** |
| **The map bugs have a test each rather than a comment each** | **PASS for the hidden-container bug** — and it is the strongest result here: hidden `viewBox` === shown `viewBox` === bare-Node `viewBox`, byte-identical, verified on my own oracle against the real sample. **Nominal for the min-span bug** — the test asserts `VA` clamps, which is true and correctly substituted, but clamping to 1.2 km is itself a rooftop zoom and the surface has no scale reference, so the test asserts the guard fired rather than the bug being absent. Not blocking — measured, the case has **no rendered consequence** on this surface — but the criterion is wrong. **A-42** |

### I-8a's own verification bullets, as ROADMAP writes them

| # | Criterion | Result |
|---|---|---|
| 1 | The world map fits correctly when its tab was hidden at mount | **PASS**, my own Chromium run: mounted at `display:none` with `width === 0`, `viewBox` already correct, byte-identical after the switch and identical to Node's |
| 2 | A one-country history does not exceed the min-span guard | **PASS as re-expressed (`VA`), and the re-expression is sound** — `VA` is the only clamping code in all 239, at exactly 1.2 km; `AT` is 631 km and does not clamp, so the criterion as written is unsatisfiable and its fault is green. **The criterion needs rewriting — A-42** |
| 3 | A provisional country renders differently from a confirmed one, asserted on rendered output | **PASS.** `i8a-signals.mjs` §3 green on my run; the browser fault (provisional painted in the confirmed ink) measured **RED**, and that one is a genuine browser measurement, not a vacuous one |
| 4 | A code the index cannot fill appears in `missing` and on screen | **PASS.** `worldMapFrame` never throws for `ZZ`, `''`, `'at'`, `__proto__` or a 5,000-char code; `drawn + missing` accounts for every row; the fault (drop it silently) measured **RED** |
| 5 | `travelStats` is rendered behind a boundary that can refuse | **PASS** — the Map shows *"We could not read your travel history"* with the row id, and I watched it. **But the boundary has no way out — R33-3 / BLD-3 / A-44** |
| 6 | The two signals are separable | **PASS**, and this is a real fix. No provenance/provisional/unresolved-severity selector sets `opacity` anywhere in the shipped CSS; the blocker's colour and the effective opacity product are identical on an `imported` and an `own` row |
| 7 | Neither removal comes back | **PASS**, over computed style on every element in the running app: no `backdrop-filter`, no gradient in a chrome fill, opaque topbar, drawn flat-ink mark |
| 8 | The payload ceiling is measured and recorded | **PASS on the ceiling, wrong on the number.** Re-derived: reference library **12,040 B = 11.8 KB**, index worst case (239 codes) **374,268 B = 365.5 KB**, both under 512 KB. BUILD-NOTES' 11,090 B is a six-code set missing `DE` — **BLD-7** |

---

## `cairn-constraints` and the read-only boundary, re-verified directly

| Constraint | How I checked | Result |
|---|---|---|
| §1 read-only boundary | `git diff 04eeb5d 6b89c91 -- europe-2026-itinerary.html docs/ tickets/` from the repo root, and `md5sum` after the full suite, a web build, a golden regen, the ship-gate harness (3 mutated browser builds) and ~10 Chromium sessions | diff **empty**; `7c69df3208ef91c8be0fb59a56443188` — byte-identical to the hash in Phase 1's and 2a's verdicts |
| `packages/core` untouched | `git diff --stat 04eeb5d 6b89c91 -- cairn/packages/core/` | **empty**. A-40 Part 2's requirement, discharged |
| `MapPort` untouched | `git diff --stat 04eeb5d 6b89c91 -- cairn/apps/web/src/ports/map.ts` | **empty**, byte-identical |
| §6 export surface | `Object.keys(core).length` | **75**, unmoved |
| §6.6 credentials may not reach a build | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS**; 3 hits, all `OPTIONAL`/`BOOKINGS` |
| No new runtime dependency, no CDN | grep `fonts.googleapis\|gstatic\|cdn.` across `apps/web/src` and `apps/web/dist` | one hit, and it is a **comment** in `styles.css:18` saying the app does not use one. All four `woff2` are emitted into `dist/assets/` and served from the app's own origin |
| Goldens and sample byte-stable | `npm run golden && npm run sample && git status --porcelain` | tree **clean**; sha still `40955ca0b182dddcc33540accadf2a65a329bc20b9e6ca109c9884e776bb06d2` |

---

## Verified — I-8a: what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `6b89c91` (record commit `e15c80d`),
Node v22.22.2, Chromium 1194 via `/opt/node22/lib/node_modules/playwright`. `git status
--porcelain` **empty** before and after; `git worktree list` shows only the main tree
(one leftover at `04eeb5d` from an earlier stage was removed).

| # | Command | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit **0**, **both** projects; `pretypecheck` regenerated the redacted sample first (`16 days, 112 stops, 31 pool, 95 places, 120 import issues, source 40955ca0b182, REDACTED per §6.6`) |
| 2 | `npm run test:tap` | `# tests 915 · # pass 915 · # fail 0 · # skipped 0`, 17.8 s. **BUILD-NOTES' and round 33's 915 are both accurate** |
| 3 | `npm run golden && npm run sample && git status --porcelain` | tree **clean**, sha `40955ca0b182…` — byte-identical regeneration |
| 4 | `npm run web:build` | exit 0. Four `woff2` emitted into `dist/assets/`; the pre-existing >500 kB chunk advisory is unchanged |
| 5 | `Object.keys(core).length` | **75** |
| 6 | three `git diff --stat` from the **repo root** (`packages/core/`, `ports/map.ts`, root boundary) | **all three empty**. *(Noted because I first ran these from `cairn/` and the pathspecs silently resolved to nothing — a false negative I caught by re-running from the root. Anyone repeating this check should run it from the repo root.)* |
| 7 | `PLAYWRIGHT_BROWSERS_PATH=… bash qa/i8a-faults.sh` | exit **0**, all 10 measured RED against expected RED, `every injected fault fired` |
| 8 | **my own control**: an unmutated copy of the tree, `node --test test/views.test.ts` | `# pass 22 · # fail 1` — `not ok 5 - every exemption's justification holds`, `ENOENT … /europe-2026-itinerary.html`. **R33-4 reproduced: three of the ten ship-gate verdicts are vacuous.** The same control at `packages/client/test/world-map.test.ts` scope is `# pass 18 · # fail 0`, so the other seven faults are honestly measured |
| 9 | **my own substance check**: each of the three views-scoped mutations applied to a fresh copy, every `not ok` line printed | each adds exactly its own: `not ok 15 - … A-40 W1`, `not ok 21 - … no provenance signal is carried by opacity`, `not ok 23 - … neither named removal comes back`. **The three criteria are load-bearing. The gate's substance is met; its instrument is not.** |
| 10 | `bash qa/r33-vacuity.sh` | reproduces #8 and names the same test and the same ENOENT. Round 33's diagnosis is correct |
| 11 | `PLAYWRIGHT_BROWSERS_PATH=… node qa/i8a-signals.mjs` | **all green, 8 sections**, my own run: no `backdrop-filter` and no gradient on any element, opaque topbar, drawn mark, nothing rendered below the 11 px floor, all four self-hosted faces `loaded` from the app |
| 12 | **my own Chromium probe**, shipped sample through the real *"Load Europe 2026"* button, Trips → Map | while hidden: `display:none`, `getBoundingClientRect().width === 0`, `viewBox = "-171.7911 -71.3578 194.5016 52.4416"`. After the switch: **the identical string**. **CLAUDE.md's first map bug is absent, on my own oracle** |
| 13 | the same probe, `worldMapFrame` in bare Node from the same rows | **the identical string again.** Three readings — Node, hidden DOM, shown DOM — one byte-identical `viewBox` |
| 14 | the same probe, rendered country boxes, and **I looked at the screenshot** | 958 × 418 px figure: **US 516.3 · GB 45.6 · DE 44.5 · AT 36.9 · CZ 32.6 · HU 32.1 · HR 28.2**; the six European countries occupy **149.2 px of 958**. Stat row reads `Countries 7 · Trips 1 · Days travelled 16`; the chip list reads `AT 1 CZ 1 DE 1 GB 1 HR 1 HU 1 US 1`. **R33-1 reproduced, and it is a map of the United States** |
| 15 | **my own frame arithmetic**: max/min longitude over the reference set, and the same set re-expressed into `[0,360)` | contiguous span **194.5016°**, no box within 8° of ±180°; re-expressed span **350.75°** — *worse*. **Dateline-aware bounds would change this frame by zero. BUILD-NOTES' proposed fix is wrong** |
| 16 | **my own inset measurement**: `bounds.east` vs the easternmost vertex in every emitted `d` | `22.7105` vs `22.7105`, inset **0.000000**. R33-6 exact, and visible in the screenshot |
| 17 | **my own payload measurement** over the sample's real country set | reference **12,040 B = 11.8 KB** (`AT 618, CZ 574, DE 950, GB 879, HR 694, HU 522, US 7803`); worst case over all **239** codes **374,268 B = 365.5 KB**. Both under 512 KB. **BUILD-NOTES' 11,090 B omits `DE`** |
| 18 | `node --experimental-strip-types qa/r33-minspan.mjs` | ALL GREEN. `VA` is the only clamping code in 239; `spanKm` exactly **1.2**; `AT` **630.97 km**, not clamped; the injected fault changes the answer for `VA` and **not** for `AT`. **The `AT`→`VA` substitution is sound and the ROADMAP criterion is unsatisfiable as written** |
| 19 | `qa/r33-frame.mjs`, `qa/r33-reach.mjs`, `qa/r33-render.mjs` | All three reproduce their findings. §F: with a bad row planted, the complete visible control set is `["BUTTON:CAIRN","BUTTON:TRIPS","BUTTON:MAP"]` and the boundary still shows the banner after the cause is removed. **Also: `r33-frame` ends `# 2 FAILED` and `r33-reach` ends `# 1 claim(s) NOT confirmed`, neither disclosed in the status note — routing B-6** |
| 20 | **my own reachability check**, seven malformed dates through `createTrip` and through `fromJSON` | `createTrip` refuses **all seven**. `fromJSON` refuses `"202-01-01"`, `"10000-01-04"`, `"2026-8-7"`, `""`, `"March 2019"`, `"not-a-date"` — and **accepts `"2026-02-30"`**. R33-3's *"no shipped write path mints an unreadable row"* holds |
| 21 | **the follow-on round 33 did not run**: `"2026-02-30"` carried through the real pipeline | `fromJSON` ACCEPTED → `lifecycle` = `active` → `tripSummary` ok → `travelStats` **`daysTravelled` = 183 for a two-day trip** (`"2026-13-01"` → `0`). The Map tab prints that number. **New: routing A-45** |
| 22 | `git diff 04eeb5d:styles.css` vs current, on `.stop--flag` | `color-mix(in srgb, var(--danger) 55%, var(--line))` → `var(--sev-blocker)`. **The collapse was strengthened by this pass.** `--sev-warning`/`--sev-note` appear in **no** rule; `data-severity` is read by **0** CSS rules |
| 23 | **my own browser count** of `.stop--flag` cards on the reference trip's opening view | **0**. R33-8 is correctly MINOR — nothing is mis-coloured on Jacob's trip today |
| 24 | `grep -cE` W1's identifiers (10 of them) in `WorldMap.tsx` | **0** |
| 25 | `ls apps/web/src/views/`; the `TABS` registry test read in full | **`Profile.tsx` does not exist**; ids exactly `['trips','map']`; the *"no DISCOVER"* grep runs on **comment-stripped** source, so the ceiling is honest and the one `discover` in `App.tsx` is a doc comment quoting I-8 |
| 26 | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS**; 3 hits, all `OPTIONAL`/`BOOKINGS` |
| 27 | `git diff --name-status 04eeb5d 6b89c91 \| cut -f1 \| sort \| uniq -c` | **10 A / 13 M**. BUILD-NOTES says *"11 new … and 10 changed"* — routing BLD-7 |
| 28 | `git status -sb`, `git worktree list`, `git rev-parse HEAD origin/master` | `master...origin/master`, in sync, clean tree, one worktree. The work is on `master`, per `CLAUDE.md` |

---

## For Jacob — I-8a

**There is now a map of everywhere you have been, and the app has tabs — Trips and Map.** I ran
the whole thing myself: 915 tests, the type checker, the build, the injected-fault harness, and
about ten browser sessions driving your real Europe trip through the actual screens rather than
taking anyone's word for it. **Nothing here is a stub.**

Three things you would notice:

- **The Map tab.** It fills in every country you have been to, drawn from a map bundled inside
  the app — nothing is fetched from any server, and I confirmed that by watching the network:
  every single request goes to the app itself. Tap a country and it lists the trips that took
  you there. A country you are only counted in because you are *on a trip right now* is drawn
  as an outline instead of being claimed as somewhere you have been.
- **The app looks like your planner again** — condensed display type, every number and label in
  a typewriter face, hairlines, small corners, outlined badges. The three typefaces are served
  from the app itself, so it still reads with no network at all. Two bits of glassy chrome are
  gone for good and there is a test that stops them coming back.
- **A real design bug is fixed.** An activity you had not accepted yet used to be shown by
  fading the whole row — and if that row *also* had a scheduling problem, the warning faded
  too. The more wrong it was, the fainter it got. Now the "not yours yet" mark is a dashed
  outline and the warning keeps its full colour whatever else is true of the row. I checked
  this nine different ways and it holds.

**One thing is not good, and I want to be straight about it rather than let you find it.**

Your trip includes the LA flights, so your travel history contains the United States. The map
fits itself around *everything* you have been to — and the moment the United States is in the
picture, the six European countries the trip is actually about become a small clump against the
right-hand edge, about a seventh of the width of the screen, while America takes up most of it.
I opened it and looked at it. It is not *wrong* — all seven countries are there, correctly
drawn, correctly labelled, and listed in text underneath — but it is a map of America with
Europe in the corner, which is not what "show me everywhere I've been" should feel like for
this trip.

**This needs a decision from you, and it is genuinely a product question, not a technical one.**
When one place you have been is a long way from all the others, what should the map do?

- **(a) Fit the main cluster and tuck the outlier into a corner inset**, the way an atlas puts
  Alaska and Hawaii in boxes. You see Europe properly and America is still shown, just smaller
  and off to one side.
- **(b) Fit everything as it does now**, but give you a control that reframes to the part you
  are looking at — so the default is honest about the whole span and you can zoom in.
- **(c) Leave it as it is** and have the screen say in words what it is showing you.

I have blocked the second half of this screen — the Profile, with your country and city and day
counts — until this is decided, so nothing is waiting on you today, but it is the next thing.

**Two smaller things, both scheduled with names on them:** if a stored trip record ever became
unreadable, the Trips screen would go down and there would be no button left that lets you
delete or export the trip causing it — that cannot happen from anything the app itself writes
today, but there is no way out if it ever did, so it is being fixed. And one of the checks that
proves this work is correct is measuring the right thing the wrong way; the checks themselves
are sound — I re-ran them by hand to be sure — but the instrument is being repaired so nobody
has to do that again.

**Still open from before, unchanged:** the *"accept"* button question from Phase 1, and the
"someone else's trip file with no owner in it" question from 2a. Neither is blocking anything.

**Next:** I-8b — the Profile screen, and then step 2b ships.

---

# Phase 2, step 2b (data layer) — I-5 … I-7b

> **Status: CURRENT.** Manager ruling, recorded against `master` @ `69e44d4`, 2026-08-29.
> **Verdict: SHIP.** I-5, I-5a, I-5b, I-5c, I-6, I-6a, I-7, I-7a, I-7b — and the QA arc directly
> under I-7b, A-38 and A-39 — are shipped. **I-8, the Map and Profile surfaces, is explicitly
> not included in this verdict** and remains not started: `apps/web/src/views/WorldMap.tsx` and
> `Profile.tsx` do not exist as of `69e44d4`.
>
> **This entry is a different kind of record than the other two in this file, and that
> difference is stated rather than blurred.** The 2a and Phase 1 verdicts above are each an
> independent review pass with its own re-derived evidence. This one is not: it records a
> decision Jacob made directly, closing a gap in the paper trail rather than reopening the
> work. Ten breaker rounds (22 through 32) already did the adversarial work this gate exists
> for, and round 32's own status note — still the most recent independent verification on
> record — says as much in its closing lines: *"nothing found in this round or the last three
> is a defect in shipped code … R32-1 and R32-2 are one builder pass, they need no architect
> ruling."* That builder pass ran at `f21fa42`, addressing exactly the two findings round 32
> named, no other file changed. **No breaker round has re-verified `f21fa42` since.** Jacob's
> instruction accompanying this ruling is explicit that this gap is not to be closed by
> reopening I-7's architecture, R32, or A-39 — so it isn't; this entry records the ruling and
> stops there.

## What this records

- **Shipped, per the round-32 status note and unchanged since:** the country-attribution index
  (I-5/I-5a/I-5b/I-5c — A-26, A-27, A-28), the widened `TripSummaryRow` and its rescan
  (I-6/I-6a — A-29, A-30), `travelStats` and the record census (I-7 — A-31), the civil-calendar
  fix and `provisional` (I-7a — A-32, A-33, A-34), the executed port gate and the two row read
  gates (I-7b — A-35, A-36, A-37), the seeded-double `ensureReady` upcast (A-38), and the finite
  covering set for the storage read gate (A-39).
- **Closed by the builder pass at `f21fa42`**, per that commit's own BUILD-NOTES addendum: R32-1
  (the per-id key-set assertions now check nested `cities[].countrySource`, not top-level only)
  and R32-2 (the Axis-C `revision: 0` cell is now covered via `importDoc`'s reachable path,
  rather than argued unreachable). That addendum reports 884/884 tests, both projects typecheck
  clean, `Object.keys(core).length` 75, and goldens/sample byte-identical — figures this entry
  quotes rather than re-derives.
- **Still open, and this ruling adjudicates none of it:** R32-3, R32-4 (both MINOR), R31-2,
  R31-3, R31-4, R30-2…R30-5, R29-3, R27-1…R27-3, and the carried Phase 1 list.
  `QA-FINDINGS.md`'s status note remains the authoritative record for each; nothing there is
  edited by this entry.
- **Not included, at all:** I-8. Nothing in this verdict is a statement about the Map or
  Profile surfaces, the app-shell navigation, or any visual treatment — those remain 2b's
  unbuilt remainder.

## Routing

None. This entry closes no open finding and opens none — the items listed above as still open
keep exactly the routing `QA-FINDINGS.md` and `ROADMAP.md` already give them.

---

# Phase 2, step 2a — past trips and the lifecycle

> **Status: CURRENT.** Manager, stage 4. Reviewed `master` @ `67f5588`, 2026-08-28, Node v22.22.2.
> **Verdict: SHIP. 2a is closed; 2b (I-5 … I-8) may open.**
> Scope was I-0 through I-4a and nothing else — I-5 … I-11 are not started and were not judged.
> Every claim below has a command in **Verified — 2a** that I ran myself, on this tree.
>
> **What I did not run:** the Chromium probes (`qa/p2-pasttrip.mjs`, `qa/p2b-past.mjs`,
> `qa/browser*.mjs`, `qa/r8-views.mjs`, `qa/r9-redo.mjs`, `qa/r10-editdoor.mjs`, and the other
> browser-driven files). **`playwright` is not installed in this environment** — `require('playwright')`
> fails with `Cannot find module`. I-4's *"run it in the browser, not only in Node"* clause is
> therefore taken on round 12's and round 13's own Chromium evidence rather than re-derived by me,
> and I say so rather than implying I checked it. Every headless assertion in those probes' Node
> equivalents I did run.

---

## Verdict: **SHIP**

**2a is what `BRIEF.md` and `ARCHITECTURE.md` §8.1–§8.2 say it should be, it is built, and the
reported state is true.** I re-derived every headline number rather than quoting one, and every
one of them reproduced. Nothing named in the 2a row of ROADMAP's three-steps table is missing,
stubbed, or misreported.

Concretely, on my own runs:

- **`lifecycle()`** — pure, in `derive/`, no stored status field, three stages correct at the
  boundaries, and `node cli.ts trip --today 2026-08-27` prints `[completed]` / `stage: completed`.
- **`Trip.datePrecision`** — stored, defaulted, refused when malformed, byte-identical through
  `toJSON(fromJSON(toJSON(t)))`, carried through undo/redo at depth 50, and its grep ceiling is a
  test with **one pinned exemption** (`derive/summary.ts`, which §8.4 names and which carries the
  field without branching on it).
- **The feasibility/integrity rule class** — all ten rules classified per §8.2's table; at a clock
  after `endDate` the reference trip returns **5 findings, 0 of them feasibility**; at the goldens'
  clock it returns the Phase 1 set **unmoved**.
- **The live defect closes.** This is the reason 2a exists and it is the thing I most wanted to see
  fail. It does not: at the real clock the reference trip's two `missing_lodging` warnings go to
  **zero**, and both `legacy_flag` blockers — Jacob's own Aug 18 and Aug 20 flags — stay.
- **The past-trip flow** — a real form, not a stub: 255 lines, wired into `Library.tsx`, dispatching
  only `createTrip` / `setTripMeta` / `setDayMeta`, with lifecycle chips on both `Library` and
  `TripView`. End to end in core, my own run: *"Japan, March 2019 — 東京, 京都"* mints **two distinct
  keys**, 31 dense days, **0 conflicts and 0 validation issues**, round-trip byte-identical.
- **Phase 1's ceiling is unchanged, re-derived not quoted:** 620/620, typecheck clean on both
  projects, goldens and sample byte-identical at sha `40955ca0b182`, 2/4/11 at `FIXTURE_TODAY`,
  `validateTrip` 11, `geoCheck` 0 on the clean trip and 112/112 + 92/94 under the +1° fault,
  **71** exports.

### On I-3a and I-4a's long history, and why I am not adding a round to it

Both were re-opened repeatedly (I-3a through A-9/A-11/A-12/A-13/A-17; I-4a through
A-10/A-14 … A-25, nine breaker rounds). Length is not evidence in either direction, so I judged the
**final state**, and I re-derived the two clauses of A-25 Part 6 that are cheapest to fake and most
expensive to be wrong about:

- **Clause 2, two-sided, in a throwaway worktree at `67f5588`.** Reverting `refileCityKey`'s step-4
  `order` hoist turns `readOnce.test.ts` assertion 1 red with a **one-element** offender list naming
  exactly `15 · three same-named target cities — the step-4 order tie-break: tgtCity1.order ×2` and
  nothing else. Restored, 4/4. The census catches its own subject.
- **Clause 4's null clause, my own mutation.** Planting `homeBase: null` back onto the source fixture
  reds test 4 naming exactly `srcTrip.homeBase` — i.e. the R20-2 blindness A-25 Part 1 was written to
  close is genuinely closed by a test rather than by a docstring. `DECLARED_NULLS` is `{}`.

Worktree removed; `git worktree list` shows none of mine.

**I did not re-derive clauses 1, 3, 5 and 6 a third time, and here is the reason rather than an
assertion.** Clause 1 is a set of ceilings I ran independently anyway (they are in **Verified**
below). Clauses 3, 5 and 6 were each derived twice already — once by the builder in a discarded
worktree (`BUILD-NOTES` on `f515768`) and once, independently and adversarially, by round 21
(`qa/r21-closure.mjs`, `qa/r21-clause3.sh`) — and round 21's own fresh attack of 22 document shapes
beyond the matrix returned 0 throws and 0 unnamed multi-reads. A third derivation of a clause two
independent parties already produced identical numbers for is the work §0.5 warns about: not
distinguishable from progress. What I checked instead is the thing a third derivation could not have
caught — whether the *guard* is live — and both mutations above say it is.

### The residues, checked one at a time

Each is a principled, disclosed boundary rather than something that should have been fixed:

- **A-15's `Stop.links`** — classified out loud, with a key-set assertion so a ninth `Place` field
  cannot travel unclassified. `links` is **dropped entirely**, not emptied. Verified: `qa/r15-place-copy.mjs`
  ALL OK.
- **A-21 Part 3's `toJSON` scope boundary** — drawn around one function with a stated reason, and
  A-25 Part 5 class C draws the identical boundary around `build/stops.ts` with three reasons **and a
  trigger** (the day a `Stop.placement` is built by something other than a person's own hand). A
  boundary with a trigger is a decision; one without is a gap. These have triggers.
- **A-25's classes A, B and C** — A is the skeleton scan (closing it needs `max: 5` on an array,
  which is a licence, not an exception); B is reclassified from "residue" to "floor" under A-24's own
  spread-versus-read discriminator, which is a correction rather than an excuse; C is out of scope with
  a trigger. I confirmed by running that class A's list is now complete by instance as well as by class
  after `67f5588`.

Nothing in that set is a defect wearing a disclosure.

### Why this is not a SEND BACK

I found six things. **None of them is in 2a's shipped product surface as a defect that 2a's own gate
should have caught** — four are in the *record and the verification apparatus*, and two are product
items that already had a routing which nobody executed for nine rounds. The correct manager action
for the latter is to **place them with a trigger**, which nine consecutive status notes failed to do
and which is exactly what a gate is for. Blocking a phase step that has met every criterion written
for it, in order to force work on two MINORs that a routing already exists for, would be manufacturing
a SEND BACK rather than making one.

Stated plainly so it cannot be read as a soft SHIP: **if any one of the six had been a data-loss, a
privacy leak, a wrong-person's-data path, or a named 2a deliverable that was not built, this would be
a SEND BACK.** None is.

---

## Routing — 2a

Seven items. **None blocks 2b from opening.** Each names its agent, its file, and its trigger.

### breaker — before 2b's first breaker round, in a commit of its own

This is I-0's obligation recurring inside the phase I-0 opened. I-0 exists as a whole increment with
*"user-visible outcome: NONE"* precisely because a stale FAIL costs a later round real time, and its
ship gate says **"the full board runs; every probe is PASS or gone."** I ran the full board. It does
not. Rounds 14–21 each ran only the probes in their own narrow scope, so the rot re-accumulated
unnoticed and no status note discloses it.

- **B-1. `qa/r11-recheck.mjs` dies mid-run and silently loses 9 of its 21 assertions.**
  `qa/r11-recheck.mjs:207` — `withCopy({ kind: 'pool' })` passes a pool placement with **no `cityKey`**,
  which `copyStopInto` has correctly refused since A-19 landed (revision 14): the probe aborts with
  `Error: copyStopInto: no such city undefined in trip-mine` at `packages/core/src/build/copyStop.ts:537`.
  12 of 21 assertions run; **§2.3, §2.4, §2.5 and §2.6 never execute**, which includes R10-2's entire
  end-to-end coverage through the store's own dispatch path with undo/redo. This is a stale probe, not
  a product defect — A-19's throw is correct and `StopPlacement`'s pool variant requires `cityKey` in
  the type, so only a `.mjs` caller can reach it. **Fix:** give §2.3's `withCopy` call a `cityKey` the
  target actually holds, exactly as ROADMAP revision 14 assigned `qa/r15-place-copy.mjs` §3.4 to QA.
  Do not change `copyStop.ts`.
- **B-2. `qa/r21-closure.mjs` reports 1 FAIL for a finding that closed one commit ago.**
  `qa/r21-closure.mjs:407-409` hardcodes the label `'class A — NOT enumerated in Part 5'` for
  `tgtTrip.cities.<n>`, `tgtTrip.pool` and `tgtTrip.days.<n>.stops.<n>`; the probe does not read
  `ARCHITECTURE.md`. Commit `67f5588` folded R21-1 into A-25 Part 5 and all three **are** now
  enumerated there. Re-express §6's assertion (and preferably read the list out of A-25 Part 5 rather
  than restating it) so the probe is at **0 FAIL**. Its §6b measurement stays as a `console.log`.
- **B-3. `qa/p2b-gate.mjs` §2.1's `datePrecision` ceiling is stale.** It fails on
  `packages/core/src/derive/summary.ts`, which P2-6's own fix put there and which §8.4 blesses in
  writing (*"carried and never branched on"*). `packages/core/test/datePrecision.test.ts:241` already
  pins that as the **single** permitted exemption and asserts the exemption list cannot grow silently.
  Re-express §2.1 against the same one-entry allow-list.
- **B-4. `QA-FINDINGS.md`'s status note carries two false "STILL OPEN" claims.** Nine consecutive
  rounds wrote *"STILL OPEN, unchanged and not re-litigated: R13-4, R13-5, …"*. **Both are closed.**
  `packages/core/src/conflict/detect.ts:248` reads *"stays at 71"*, and `geoOutlier.ts`'s two label
  sites are distinguishable (*"the map for a city this trip does not have"* vs *"the optional list
  for …"*). `qa/r13-gate-citykey.mjs` §7 and §8 are green and assert exactly those two things. The
  status note is the first thing a manager reads; correct it.
- **B-5 (housekeeping, no commit needed).** Four worktrees from earlier rounds are still registered:
  `/tmp/r14-pre`, `/tmp/r14-tw`, `/tmp/r15-pre`, `/tmp/r16-pre`. They are the documented differential
  fixtures for `qa/r14-horizon-copy.mjs`, `qa/r15-place-copy.mjs` §6.3 and `qa/r16-copy-depth.mjs`
  §5.3, all of which skip gracefully without them — so this is not a defect, and my "ALL OK" on those
  three is the **stronger** reading because the differential sections ran. Noted only so the next
  session knows why they exist.

### architect — before I-6, which consumes the data

- **A-1. §8.1's provenance table claims a capability the product does not have, and I-6 is the
  increment that will consume it.** §8.1 argues *"there is no `Trip.kind`, and manually-entered travel
  needs no new provenance value … the certainty of a record is already `provenance.confidence`, and it
  already means exactly the right things"*, and its first table row maps *manually entered from
  memory* → `{source:'user', confidence:'asserted'}`. **No path in the product produces that.**
  `packages/core/src/model/provenance.ts:18` — `userProvenance` hardcodes `confidence: 'confirmed'`,
  and it is what `createTrip`, `ensureDays`, `addStop` and `setDayMeta` all use. Measured, my own run:
  a trip recorded through `PastTripForm` comes back with every one of its 31 days at
  `{source:'user', state:'accepted', confidence:'confirmed'}` — the same value a booked, documented
  trip carries. The only `'asserted'` producers in `packages/core/src` are `systemSuggestion` and
  `copyStop.ts`'s `demote`. **Nothing is user-visible in 2a** (`confidence` is read by no surface in
  `apps/web`, and `displayStatus` does not consult it), which is why this is not a 2a blocker — but
  §8.4's `travelStats` and the lifetime map are derived from exactly this data, and Jacob's own
  principle is *"treat manually entered, imported, and observed travel as potentially different
  provenance rather than pretending all data has identical certainty."*
  **Second half of the same ruling, because it is the same data:** `PastTripForm` assigns the trip's
  **first** city to **every** day (KD-38, disclosed on screen and in BUILD-NOTES). Measured: for
  *"東京, 京都"*, `daysForCity(東京) = 31` and `daysForCity(京都) = 0`. Those 31 day-city facts are
  **ours, not the user's**, and they will be the lifetime map's input. Rule on whether a day-city the
  form assigned may stand as evidence in `travelStats`, and if so how the surface says which it is.
  Do not patch this in code — sequencing rule 5 makes it an architect's call.
  **Trigger: before I-6 widens `TripSummaryRow`.** ROADMAP already requires A-10/A-14 to land before
  I-6 for this exact reason; this is the same dependency, one field over.

### architect — before any share, friend or public-share-link work, and before 2b touches `importDoc`

- **A-2. P2-8 has been routed to the architect since round 12 and has never been ruled.** Nine status
  notes list it as *"still open, not re-litigated"*; ROADMAP's carried-forward table does not contain
  it; so it currently has no home at all. Reproduced by me, `qa/p2b-gate.mjs` §4.6: with
  `"ownerId":"user:marta"` present the file is refused with `ForeignDocumentError`; **delete that one
  key and the same file is adopted whole as `local:self`**, carrying 91 stops whose
  `provenance.actorUserId` is still `user:marta`, with `validateTrip` reporting **0** ownership issues
  (21 of 112 stops do not render as the importer's own; 91 do). `BRIEF.md` states as settled that
  *"`importDoc` … refuses a document owned by someone else, **visibly**"* — deleting one key defeats
  "visibly". `packages/client/src/store/store.ts:1027-1028`; KD-40's reasoning for *allowing* an
  absent owner is sound and is not what is being questioned. The open question is the one round 12
  wrote: does *allowed* also mean *adopt its foreign provenance unexamined*.
  **This is the same class of block I-4a already carries** and it deserves the same wording: it is a
  scope rule, not an open defect, and 2a's SHIP does not lift it.

### builder — in 2b's first builder pass

- **BLD-1. P2-5, `apps/web/src/views/PastTripForm.tsx:107-143`.** Routed to a builder at round 12,
  with a `file:line` and **two repro scripts already in `cairn/qa/`** — which by `cairn/CLAUDE.md`'s
  delegation table is the cheapest route this project has — and never executed. Reproduced by me,
  `qa/p2b-gate.mjs` §3.4: after recording a one-year trip, **400 undos accepted, 315 of 365 days still
  carry the city.** The city assignment is one `setDayMeta` per day, so one press is N+2 undo entries
  and the 50-entry history means a year-length trip can **never** be undone back past its own
  recording. With the form's default `'month'` precision it is 33 presses — annoying rather than
  broken — so the sharp edge is `'year'` only, which is why it is MINOR and not more. It is still a
  defect in the one flow 2a exists to deliver, in the first minute of using it.
  Repros: `qa/p2b-past.mjs` §2f (Chromium) and `qa/p2b-gate.mjs` §3.4 (headless).

### Carried forward, re-placed rather than re-derived

| Item | Status at this gate | Where it now belongs |
|---|---|---|
| **R10-1** (MINOR) | **Closed.** ARCHITECTURE §2.7 **A-8** blesses A-5b clause 2 with a reopening trigger. Nothing owed. | — |
| **R8-3** (MAJOR, unreachable) | Unchanged. `acceptCandidate` still has no control in `apps/web` — re-verified. | **Architect, Phase 3**, or earlier if Jacob pulls the accept control forward. Trigger unchanged. |
| **R8-4** (MAJOR, unreachable) | Unchanged. 2a added no in-trip delete control. | **Phase 3, with the `SyncPort`.** Trigger unchanged. |
| **R13-4, R13-5** | **Closed in code**, and QA's status note is wrong to list them. | Nothing owed to a builder — **B-4** above corrects the record. |
| **R2-18** (`qa/r2-constraints.mjs`, 1 FAIL) | Unchanged and correctly classified. The determinism grep in `test/boundaries.test.ts` walks `packages/core/src` only, so the reducer — which `cairn-constraints` §4 names — is not covered by it. The probe's own next line confirms `packages/client` is clean **today**, so this is a guard gap, not a live defect. | **Phase 1 carried list.** Not a 2a item. |
| **P2-5, P2-8** | Real, open, both routed at round 12 and neither executed. | **BLD-1** and **A-2** above. They now have a home and a trigger for the first time. |
| **`qa/p2b-gate.mjs` §1.7** (un-padded `today`) | Real and correctly not gated on: `detectConflicts(today:"2019-3-5")` returns 3 where `"2019-03-05"` returns 2, because the gate compares `IsoDate` strings while `lifecycle()` parses. Reachable only past the types — `cairn-constraints` §6 makes `YYYY-MM-DD` the contract and `apps/web`'s only clock is `ports/env.ts`. | Fold into **A-1**'s pass if the architect is in `§8.1` anyway; otherwise leave disclosed. Not owed. |
| The Phase 1 MINOR list (R6-1/2, R5-2, R11-1's record, R3-6…R3-9, the `r6-actor` residuals) | Re-run this pass at exactly their disclosed counts. **No undisclosed FAIL anywhere on the headless board.** | Unchanged. |

---

## Exit criteria — which apply to 2a, and how I checked each

ROADMAP's Phase 2 exit criteria are the **phase** gate (I-11), not 2a's. Four of the ten are 2b/2c
work and I did not judge 2a against them, per this review's stated scope. The table says which is
which and what I ran.

| # | Criterion | Applies to 2a? | Result |
|---|---|---|---|
| 1 | Phase 1's whole suite passes unchanged, every number re-derived | **Yes — sequencing rule 3** | **PASS.** 620/620; 2/4/11 at `FIXTURE_TODAY`; `geoCheck` 0 clean and 112/112 + 92/94 under +1°; `validateTrip` 11; goldens + sample byte-identical at `40955ca0b182`. All re-derived by running, none quoted |
| 2 | Injected fault — the rule class does what it claims | **Yes — I-3** | **PASS.** After `endDate`: 5 findings, **0** feasibility, composition `legacy_flag 2 / superseded_booking 1 / unverified_reference 2`, both blockers intact. Back at the goldens' clock: the original 17 exactly. `ruleClass.test.ts` states the count and one line per finding, and reasons explicitly about why *"before `startDate`"* means `FIXTURE_TODAY` |
| 3 | A past trip is silent | **Yes — I-4** | **PASS**, my own end-to-end run: 31 dense days, `Day.id === Day.date`, **0** conflicts and **0** validation issues. Injected fault (a stop after `today`) returns feasibility for that day only — `past-trip.test.ts` 49/50/51/52/53 |
| 4 | Country attribution measured, holes visible | No — **I-5/2b** | Not judged |
| 5 | Generated index inside its budget | No — **I-5/2b** | Not judged |
| 6 | Statistics cannot be stored | No — **I-7/2b** | Not judged. Spot-checked negatively anyway: no `travelStats`, no `countries.gen.ts`, nothing counting into storage exists yet |
| 7 | Injected fault — the summary is only as fresh as its write | No — **I-6/2b** | Not judged |
| 8 | Participation grants nothing | No — **2c** | Not judged |
| 9 | Round-trip and undo parity over the new fields | **Partly — the `datePrecision` half is 2a** | **PASS.** `toJSON(fromJSON(toJSON(t)))` byte-identical with the field present and absent; `fromJSON` rejects `datePrecision:'fortnight'` with `$.datePrecision`; undo/redo at depth 50 carries it (test 146); a pre-`datePrecision` document loads as `'exact'`. The participants half is 2c |
| 10 | Every new action maps 1:1 onto a core build function | **Yes — I-4** | **PASS.** The form adds **no** action: `setTripMeta` → `core.setTripMeta`, `setDayMeta` → `core.setDayMeta`, both pre-existing (test 54). The closed list of document-installing store methods is still **six**, asserted structurally at `retirement-ledger.test.ts:219` (`adoptTrip, closeTrip, createTrip, deleteTrip, importDoc, openTrip`, plus `doMerge` = exactly 7 `reseed: true` sites) |
| 11 | NO SILENT LOSS unchanged and extended to the new write paths | **Partly — the participant half is 2c** | **PASS for 2a.** The 200-step dirty-walk oracle holds; no new path assigns `state.doc`. **One note, not a finding:** the walk's step chooser dispatches `setDayMeta` only, so a `setTripMeta{datePrecision}` step is not in it — that path is covered instead by `store.test.ts` 147 (save + reopen) and `merge.test.ts` 485/486. The criterion's own wording is about participant edits, so I am not manufacturing a 2c item out of it |

### I-1 … I-4a's own ship gates, as ROADMAP states them

| Increment | Ship gate | Result |
|---|---|---|
| **I-0** | Full board runs; every probe PASS or gone; six baseline numbers with their commands | **PASS at the time; NOT true today** — see routing **B-1**/**B-2**/**B-3**. The six baseline numbers all reproduce |
| **I-1** | `lifecycle` on §2.10's list, count re-counted; CLI prints the stage; no `Date.now()`/`new Date()` in `packages/core` | **PASS.** 71 exports counted; CLI verified at three clocks; the only `Date` uses in core are `derive/summary.ts`'s pure UTC arithmetic — no ambient read anywhere, and `test/boundaries.test.ts` asserts it |
| **I-2** | The grep ceiling is a test not a promise; round-trip parity both ways; no export added | **PASS.** 0 hits under `conflict/` and `validate/`; one pinned exemption under `derive/`; the exemption list itself cannot grow silently; 71 unmoved |
| **I-3** | All Phase 1 conflict numbers unchanged; every rule carries a class; `subjectDate` tested per `RefKind` | **PASS.** 2/4/11 unmoved; 10/10 classified against §8.2's transcribed table; `subjectDate` covers day/stop/booking/trip/place/pool-stop and both unknown-id fallbacks |
| **I-4** | 2a independently shippable; criteria 1, 2, 3 and the NO-SILENT-LOSS extension pass | **PASS** — with **BLD-1** open against the same file, MINOR, routed |
| **I-3a** | Every Phase 1 and 2a conflict number unchanged; 2 suppressed `missing_lodging` at the real clock; `detectConflicts` byte-identical at all sweep clocks; the horizon still bites; `qa/r13-gate-citykey.mjs` §1/§4 at 0 FAIL | **PASS**, re-derived. `detectUngated`'s id set is **identical at all 8 clocks I swept** (17 findings each); at 200 days before the trip `detectConflicts` reports **0** `unbooked_ticketed` while `detectUngated` reports **10**; the real clock suppresses exactly the two `missing_lodging` warnings; `r13-gate-citykey` **0 FAIL** |
| **I-4a** | The slug expression nowhere in `apps/`/`packages/`; no call site outside core mints a city key; three validation codes each with an injected-fault test; A-25 Part 6's six clauses | **PASS.** The slug survives only inside a test docstring explaining what was deleted; `cityKey.test.ts` 262 asserts the no-outside-minting rule; 246/247/248 are the three injected faults; clauses 2 and 4 re-derived by me above, 1 measured, 3/5/6 taken on two prior independent derivations with the reason stated |

**On the ROADMAP's own arithmetic, one correction worth recording rather than routing.** I-3a's ship
gate says *"at a clock 200 days before the trip, `detectConflicts` reports **no** `unbooked_ticketed`
note while `detectUngated` reports **three**."* I measure **10**, not three.
`horizonGate.test.ts:200-207` already caught this and documents it: *three* is §2.7's rule table
naming the three fixture **cases** (Széchenyi, Prague Castle, Windsor), and the rule fires ten times
on the reference trip. The test asserts the three by name **and** the measured count. That is the
correct handling of a document number that is off, and I am recording it here so nobody re-derives it
a fourth time — not routing it.

---

## `cairn-constraints`, re-verified directly

| Constraint | How I checked | Result |
|---|---|---|
| §1 read-only boundary | `md5sum europe-2026-itinerary.html` before and after the full suite, a web build, a golden regen and ~78 probe runs; `git status --porcelain -- . ':(exclude)cairn'` | `7c69df3208ef91c8be0fb59a56443188` **unchanged** — byte-identical to the hash in Phase 1's own verdict; root diff **empty** |
| §1 write paths that *could* reach it | `node --test test/cli.test.ts` | **16/16.** `cli export` refuses a path escaping `cairn/`, through a symlinked file, through a symlinked parent, and under `--force`; *"the live planner is not writable through any cli command"* is a test |
| §2 zero runtime deps | `package.json` of both packages | `core` `{}`; `client` `{"@cairn/core":"*"}` — a workspace sibling that installs nothing |
| §3 bare-Node type stripping | the whole suite and every probe ran under `node --experimental-strip-types`, no build step | clean |
| §4 no ambient clock / randomness | grep over `packages/core/src` + `packages/client/src` | **zero** `Date.now()`, `Math.random()`, `crypto.randomUUID()` or zero-arg `new Date()`. The two `Date` uses are `derive/summary.ts`'s pure `Date.UTC` arithmetic. Behavioural proof: two separate processes and two CLI runs produce byte-identical output (`qa/r2-constraints.mjs`) |
| §5 no DOM/React in `packages/client` | grep for `document`/`window`/`React`/`localStorage`/`HTMLElement` | every hit is prose in a comment; `pageExit.ts` takes its targets as **arguments** rather than reaching for `window` |
| §6 export surface | `Object.keys(core).length` | **71**, and §2.10's own group counts sum to 71 (`7+17+22+6+2+2+7+3+1+4`) |
| §6.6 credentials may not reach a build | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS.** 3 hits over 108 derived tokens, all `OPTIONAL`/`BOOKINGS` — KD-27's two named non-credentials. No door PIN, no booking reference, no ticket URL in `dist/`. `dist/` and the generated sample are both gitignored |

---

## Verified — 2a: what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `67f5588`, Node v22.22.2.

| # | Command | Result |
|---|---|---|
| 1 | `npm run test:tap` | `# tests 620 · # pass 620 · # fail 0 · # skipped 0`, 8.9 s. **BUILD-NOTES' and QA's 620 are both accurate** |
| 2 | grep the TAP stream for `readOnce.test.ts`'s tests | `ok 505` / `ok 506` / `ok 507` / `ok 508` — **all four inside the suite**, not standalone. A-25 clause 1 |
| 3 | `npm run typecheck` | exit 0, **both** projects; `pretypecheck` regenerated the sample first (`16 days, 112 stops, 31 pool, 95 places, 120 import issues, source 40955ca0b182, REDACTED per §6.6`) |
| 4 | `npm run golden` then `git status --porcelain` | all 8 goldens + `fixtures/europe2026.sha256` = `40955ca0b182dddcc33540accadf2a65a329bc20b9e6ca109c9884e776bb06d2`; tree **clean** — byte-identical regeneration |
| 5 | `npm run web:build` | exit 0. `dist/assets/index-ok4BX8GA.js` 598.73 kB; the pre-existing >500 kB advisory is unchanged |
| 6 | `Object.keys(core).length` | **71** |
| 7 | `detectConflicts(trip, {today: FIXTURE_TODAY})` | **2 blocker / 4 warning / 11 note**, 17 total; `legacy_flag 2, missing_lodging 2, superseded_booking 1, unbooked_ticketed 10, unverified_reference 2` |
| 8 | `validateTrip(trip)` | **11** issues |
| 9 | `detectConflicts` at `2026-08-30` (after `endDate`) | **5** findings, **0** from any feasibility rule; `legacy_flag 2, superseded_booking 1, unverified_reference 2`. **Exit criterion 2** |
| 10 | `detectConflicts` at `2026-08-27` (the real clock) | `missing_lodging` **2 → 0**, both blockers intact. **The live defect §8.2 was written to close, closed** |
| 11 | `detectConflicts` with **no** `today` | 7 findings, feasibility present — edge ruling 3 holds, the gate invents no clock |
| 12 | **my own clock sweep**: `detectUngated` id-list at `2019-01-01`, `2026-01-01`, `2026-02-13`, `2026-08-01`, `2026-08-24`, `2026-08-30`, `2027-08-30`, `2030-01-01` | **identical at all eight**, 17 findings each. A-11's property, re-derived rather than quoted |
| 13 | same, 200 days before `startDate` (`2026-01-19`) | `detectConflicts` **0** `unbooked_ticketed`; `detectUngated` **10**. The horizon still bites, and it bites in the gate |
| 14 | `node cli.ts trip --today {2026-08-01, 2026-08-10, 2026-08-27}` | `[planned]` / `[active]` / `[completed]`, with `stage:` printed and the clock echoed. At the completed clock: `2 blockers, 2 warnings, 1 notes` |
| 15 | **my own end-to-end past-trip build** in core: *"Japan 2019"*, `2019-03-01…31`, cities `東京`/`京都`, precision `month`, `setDayMeta` per day | two **distinct** keys (`tcity-1`, `tcity-2`); 31 dense days; **0 conflicts, 0 validation issues**; `lifecycle` = `completed`; `toJSON(fromJSON(toJSON(t)))` **byte-identical**. **Exit criterion 3 and A-10's headline case, on my own oracle** |
| 16 | the same run, `daysForCity` per city | `東京 = 31`, `京都 = 0` — the input to routing **A-1** |
| 17 | the same run, `days[0].provenance` | `{source:'user', state:'accepted', confidence:'confirmed'}` — the other input to **A-1**. §8.1's table says memory-entry is `'asserted'`; nothing produces it |
| 18 | **A-25 clause 2, two-sided**, throwaway worktree at `67f5588`: revert `refileCityKey`'s step-4 `order` hoist | **red**, offender list a **one-element array**: `15 · three same-named target cities — the step-4 order tie-break: tgtCity1.order ×2`, and nothing else. Restored: **4/4** |
| 19 | **A-25 clause 4's null clause, my own mutation**: plant `homeBase: null` back on `sourceTrip` | test 4 **red** naming exactly `srcTrip.homeBase`. Worktree removed; `git worktree list` shows none of mine |
| 20 | `qa/r13-gate-citykey` `r14-horizon-copy` `r15-place-copy` `r16-copy-depth` `r17-hours-parser` `r18-readonce` `r19-census-gaps` `r20-census-reach` | **0 FAIL / ALL OK each.** r14/r15/r16 ran **with** their differential worktrees present, so §7, §6.3 and §5.3 executed rather than skipping |
| 21 | `qa/r21-closure.mjs` | **1 FAIL — stale, not a finding.** §6 hardcodes `'NOT enumerated in Part 5'` at `:407-409`; `67f5588` enumerated all three. Routing **B-2** |
| 22 | **the whole headless board**, all 78 `qa/*.mjs` | Every FAIL is disclosed and reproduces at its documented count: `p2b-gate` 5 (P2-5, P2-8 ×2, §1.7, §2.1), `r2-constraints` 1 (R2-18), `r10-redo` 3 (R10-1), `r3-cas2` 3, `r3-pool` 3, `r5-freshness` 4, `r6-actor` 5, `r7-r6recheck` 3, `r6-flush` 1, `r8-geo` 1, `r8-persist` 1, `r9-ledger` 2, `r21-closure` 1. **One undisclosed defect: `r11-recheck` crashes** — routing **B-1** |
| 23 | `qa/p2b-gate.mjs` §3.4, read in full | **400 undos accepted, 315 of 365 days still carry the city.** P2-5 reproduced on my own run — routing **BLD-1** |
| 24 | `qa/p2b-gate.mjs` §4.6, read in full | `ownerId` present → `ForeignDocumentError`; key deleted → **adopted as `local:self`**, 91 stops still `user:marta`, **0** ownership validation issues, 21/112 not rendering as the importer's own. P2-8 reproduced — routing **A-2** |
| 25 | `qa/r13-gate-citykey.mjs` §7 and §8 | Both **green**: no source comment claims 70, and the two `geo_outlier` label sites are distinguishable. **R13-4 and R13-5 are closed** — routing **B-4** |
| 26 | `node --test test/cli.test.ts` | **16/16**, including the four `cli export` escape refusals and *"the live planner is not writable through any cli command"* |
| 27 | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS**; 3 hits, all `OPTIONAL`/`BOOKINGS` |
| 28 | `md5sum europe-2026-itinerary.html`; `git status --porcelain -- . ':(exclude)cairn'` | `7c69df3208ef91c8be0fb59a56443188`, unchanged; root diff **empty** |
| 29 | `grep` for the slug expression across `apps/` and `packages/` | one hit, inside `cityKey.test.ts`'s docstring explaining what was deleted. **The expression exists nowhere in product code** |
| 30 | `grep datePrecision` under `conflict/`, `derive/`, `validate/` | 0, 1, 0 — the one being `derive/summary.ts`, pinned as the single exemption by `datePrecision.test.ts:241`, which also asserts the exemption list cannot grow |
| 31 | `require('playwright')` | `Cannot find module`. **The Chromium half of the board could not run here** — stated in the status note rather than implied |

---

## For Jacob — 2a

**You can now record trips you have already taken, and the app stops nagging you about a trip you
have already been on.** That is step one of three in the current phase, and it is done.

Three things changed, and one of them you will feel immediately:

- **The app knows a trip can be over.** Your Europe trip ended on 22 August. Until now the app kept
  telling you, forever, that you were missing a hotel in Budapest — for nights you had already slept
  through. It no longer does. I checked this by running it: the two "missing lodging" warnings are
  gone, and your own two red flags for Aug 18 and Aug 20 are still there, which is exactly right —
  those are yours, and nothing of yours gets silenced.
- **There is a "record a past trip" form.** Title, roughly-when, and the cities. No day-by-day
  required. I entered *"Japan, March 2019 — 東京, 京都"* myself and it came back with **zero warnings
  and zero problems** — which is the whole point: a trip from seven years ago should be a record, not
  a to-do list.
- **"Roughly when" is recorded honestly.** If you only remember *March 2019*, the app stores that as
  March 2019 and says so on screen — it does not quietly claim you were there from the 1st to the
  31st.

**Nothing here is a stub.** I ran the tests (620, all passing), the type checker, the build, and 78
separate attack scripts myself rather than taking anyone's word for it.

**Two rough edges, both small, both now scheduled rather than floating:**

- **Undo, straight after recording a past trip, behaves badly.** If you record a whole *year* and
  then press Ctrl+Z, it peels the trip apart one day at a time and you cannot get all the way back.
  A month-long trip is fine, just fiddly. It was found nine rounds ago and quietly never got picked
  up; it is now assigned with a name on it.
- **The app assumes every day of a recorded past trip was in the first city you listed.** So *"Tokyo,
  Kyoto"* records 31 days in Tokyo and none in Kyoto. The form does tell you this before you press the
  button, which is the right instinct — but the next step is the *map of everywhere you have been*,
  and it will be built from exactly that data. So I have asked the architect to settle, before that
  map is built, how the app should tell the difference between *"I said I was in Kyoto"* and *"the app
  filled that in for me."* That is your own rule — never present our guess as your plan — applied one
  step ahead of where it would have bitten.

**One decision I would like from you, and it is not urgent.**

Right now, if someone sends you a trip file they exported, the app correctly refuses it as *"this
belongs to someone else."* But if that file happens to have no owner recorded in it, the app adopts
the whole thing as yours, and 91 of the activities in it stay quietly stamped with the other person's
name underneath. Nothing leaks and nothing breaks — but the app would be telling you the trip is
yours when it is not. **Do you want it to (a) refuse anything that is not provably yours, (b) accept
it but visibly badge the whole trip as imported from someone else, or (c) leave it as is until real
accounts exist in Phase 3?** I have blocked all friend-sharing and public-link work until this is
settled either way, so nothing is waiting on you today.

**Still open from Phase 1, unchanged:** the *"accept"* button question from last time is still sitting
unanswered. Not blocking anything.

**Next:** step 2b — the map of everywhere you have been, and a count of countries and cities derived
from your real trips rather than typed in. It is unblocked as of this verdict.

---
---

# Phase 1 review *(closed 2026-08-27 — kept for the record)*

> **Status: CLOSED.** Manager, stage 4. Reviewed `master` @ `218c7f0`, 2026-08-27, Node v22.22.2,
> Chromium via the system Playwright over real elapsed time. **Verdict: SHIP. Phase 1 is closed.**
> Every claim below has a command in **Verified** that I ran myself, on this tree.
>
> The previous `REVIEW.md` (`82c1a4f`, SEND BACK on R11-1) is superseded by this document and is
> preserved in git history. Its routing is closed: **A-7 is ruled (ARCHITECTURE revision 8) and
> built (`218c7f0`), and I re-verified it against my own oracle rather than against the finding.**
> The two review items that rode with it — R8-4 and the *What rides* list — are unchanged and are
> carried forward below as disclosed Phase 2 entry items.
>
> **Superseded by the 2a verdict above only where they overlap:** its "Carried to Phase 2" lists are
> re-placed in 2a's routing table, and the probe-repair item it named was discharged by I-0 and has
> **re-accumulated** (2a routing B-1).

---

## Verdict: **SHIP** *(Phase 1)*

Phase 1 is done. The engine, the client state machine and the web client deliver what the brief
and ROADMAP §4.5 name, the one blocker that held the last gate is closed, and nothing else that
is open is a data-loss, privacy or wrong-person's-data path.

### R11-1 / A-7 is closed, and I proved it with my own probe, not with the builder's

The ruling (ARCHITECTURE §2.2a **A-7**, §4.2 rule 4a) is implemented exactly as written, both
mechanisms, in the two places the ruling names and nowhere else:

- `packages/client/src/store/store.ts:432` — `if (!stillOurs && toWrite !== startedFrom)` sits
  immediately after `stillOurs` (`:419`) and before the `set` at `:440`: it upserts the library
  row from the write's own summary, sets `'conflict'` with the existing `CONFLICT_MESSAGE`, and
  returns. No install, no fence advance, no re-arm, no `lastMerge`.
- `store.ts:657` — `if (state.doc !== doc)` at the top of `doMerge`'s `chainOntoSaving`
  callback, **inside** the link and before the `try`, so the wide half of the window (the
  IndexedDB read, `fromJSON`, `mergeTrips`, `toJSON`, and anything queued ahead on the chain)
  is closed without a write being attempted at all.
- The deleted-trip branch (`:620-629`) is **not** modified, which A-7's scope paragraph
  explicitly requires — R8-4 rides on its own reachability argument and was not folded in.

I did not take the fix on the tests that ship with it. I wrote my own probe
(scratch, not committed) reproducing the measurement I made at the last gate — gate `load()`,
type during the read, then the **real 400 ms debounce with no explicit `flush()`** — and the
same again gating `saveIfVersion`. Against `218c7f0`: the other tab's edit survives in storage,
`savedVersion`/`savedDoc` do **not** move, `status` is `'conflict'`, `isDirty()` is true, the
local edit is still in `doc`, and a second press of *Merge and save* converges on both writers'
edits. Against the same probe with `store.ts` reverted to `bcf2beb` in a scratch worktree:
**8 FAIL**, `stored title=""` with `status=idle` — the loss, with the chip on *Saved*. That is a
red/green on an oracle the builder did not write.

The two ceilings hold, which is what stops the fix being a regression: the ordinary merge still
installs, still advances the fence, still reads `'idle'` with a `lastMerge` notice (in Node
**and** in real Chromium — `qa/r7-browser.mjs` drives the merge through the UI and both tabs'
edits are in IndexedDB with the chip reading *Saved*), and an edit landing during an **ordinary**
autosave still advances the fence and still re-arms.

### The breaker stage, stated honestly

**No full breaker round ran against the A-7 diff.** A targeted re-verification did. I am the gate
and that is my call to make, so here is the reasoning rather than an assertion: rounds 8, 9, 10
and 11 each found the shipped ruling correct and one adjacent door open, so the base rate says
attack the neighbourhood. I attacked it myself instead of ordering a round — five adjacent doors
after an A-7 refusal, all with real timers and all asserted on stored bytes: `closeTrip` (rule 6b
aborts, nothing lost), two `undo`s (storage intact), five further edits (every later autosave
refused by the fence), a **third** writer landing inside the merge window (not clobbered, the
conflict stands), and a concurrent merge against a concurrent write (no state where both edits
are gone). All clean. Plus the whole standing probe board, the 200-step dirty walk under three
seeds, and the full suite.

The residual risk is real but bounded: A-7 only ever *refuses*, in one branch, and its two
failure modes are "still loses data" (falsified twice, independently) and "over-refuses"
(falsified in Node and in a browser). I am not sending a phase back for a ceremonial round after
red/greening the fix on my own oracle. **Trigger, written down rather than left implicit: Phase
2's first breaker round takes `doMerge`/`writeAndSettle` as a named target**, because that is
where R3-3, R7-1, R8-4, R10-3 and R11-1 all lived.

---

## Routing — Phase 1

**Nothing is routed for Phase 1. Do not open a builder, breaker or architect task against this
verdict.** The items below are Phase 2 *entry* items, listed so nobody re-derives them, each
already disclosed by the agent that found it.

### Carried to Phase 2 — architect, at the point named, not now

- **R8-3** (MAJOR, unreachable today). Accepting a copied stop can *replace* the `adjacent_day`
  anchor and mint a `geo_outlier` blocker on a stop the user wrote. It violates A-1's
  monotonicity claim. **Trigger: it must be ruled on before any `acceptCandidate` control ships
  in `apps/web`** — and shipping that control is the cheap Phase 2 item Jacob may pull forward,
  so these two move together.
- **R8-4** (MAJOR, unreachable today). `doMerge`'s off-chain `load()` at `:612` lets a merge
  already in flight resurrect a trip the delete link just removed. A-7 deliberately did not
  reach it (its scope paragraph says so). **Trigger: whenever `deleteTrip` becomes reachable
  with a trip open, or when the `SyncPort` gives `load()` a second source.**
- **R10-1** (MINOR). Two Ctrl+Z's make A-5b clause 2 decline; either bless clause 2 or extend
  the rule. The render is identical to the one the user was already looking at.

### Carried to Phase 2 — breaker, before its first round

- **Probe repair, now five rounds overdue.** `qa/r6-flush.mjs` §6's static check and
  `qa/r7-chain.mjs`'s hardcoded structural counts report stale assertions, not defects;
  `qa/r5-freshness.mjs:602`, `qa/r2-copy2.mjs:86` and `qa/r2-import.mjs:51` are dead. Their
  FAIL counts are load-bearing in every status note in `QA-FINDINGS.md`, so a stale one costs a
  future round real time. Repair them in a commit of their own, or strike them.
- **`QA-FINDINGS.md`'s R11-1 row still records the window as *"the merge write is in flight"***.
  The authoritative statement is now ARCHITECTURE §2.2a A-7 (whole of `doMerge`); the QA row is
  the record of a closed finding and understates it. Correct it when you next touch the file.

### Carried to Phase 2 — builder, in the next pass that touches the file

- **`BUILD-NOTES.md` §4's table is stale in two rows**: *"Tests 387 pass"* (now 432) and
  *"Export surface 69 runtime symbols = §2.10's 69"* (now **70**, since A-5 added
  `reassertRetirements`). The status note at the top supersedes it and `cairn/CLAUDE.md`'s doc-cost
  map warns readers to check that note first, so this is disclosed debt rather than a false
  claim — but a number that is wrong on its face is worth one line to fix. No KD entry was added
  for A-7; none was owed, because the code matches the ruling with no divergence, and the status
  note carries the disclosure §1 exists for.

### What ships as a known, non-blocking limitation

Each is real, each is disclosed by the design or by an agent, none blocks the phase:

- **`acceptCandidate` is reachable from no control in `apps/web`**, so a copied stop stays badged
  *from a friend* forever. It fails safe — nothing of anyone else's is ever presented as Jacob's
  own — and ROADMAP §4.5's may-not-be-stubbed list does not name it. **Jacob's call** (below).
- **§6.6's stated cost:** the shipped sample is still recognisably Jacob's trip. Credentials are
  stripped by rule and the build is verified clean; personal prose is deliberately not stripped.
  Already a Phase 2 exit condition — the day a public host serves this build, the sample must be
  an invented trip.
- **A passively stale tab still reads "Saved"** (BUILD-NOTES §6). It holds an older document and
  nothing notifies it; its next write is refused, so no edit is at risk. Closing it properly
  needs cross-tab notification, which Phase 1 does not have.
- **The round-7 MINOR list** — R5-3, R5-4, R3-6…R3-9, R2-13…R2-21 and the five `r6-actor`
  residuals — unchanged and re-run this pass at exactly their disclosed counts.
- **Unverified environments, named rather than implied:** Safari and iOS (everything was driven
  in Chromium), real IndexedDB under quota exhaustion, map tiles (this sandbox has no route to
  `tile.openstreetmap.org`), `crypto.getRandomValues` over plain HTTP from a LAN address, and
  Node 24 (this environment is Node 22.22.2; `engines` says `>=22.18`).
- **Phase 2 scope by design:** RLS enforcement, sync, real friends, share revocation.

---

## Verified — Phase 1: what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `218c7f0`, in sync with `origin/master`.
`git status --porcelain` was **empty** before and after; `md5sum europe-2026-itinerary.html` =
`7c69df3208ef91c8be0fb59a56443188` before and after. The read-only boundary held through the full
suite, a web build, two Chromium sessions and ~30 probe runs.

| # | Command | Result |
|---|---|---|
| 1 | `npm run test:tap` | `# tests 432 · # pass 432 · # fail 0`, zero `not ok`. **BUILD-NOTES' number is accurate** |
| 2 | `npm run typecheck` | exit 0, both projects; `pretypecheck` regenerated the redacted sample first |
| 3 | `git diff --stat bcf2beb..218c7f0` | **5 files**: `store.ts` (+33), `merge-race.test.ts` (+223), and the three docs. **Exactly what A-7 authorized — no other product file moved** |
| 4 | read `store.ts:419-458`, `:609-682`; `grep -n 'writeAndSettle('` | Both A-7 mechanisms present, in the ruling's two places; the deleted-trip branch at `:620-629` **untouched** (R8-4 not folded in); three call sites, only `:667` has `startedFrom !== toWrite` |
| 5 | `node --test packages/client/test/merge-race.test.ts` | **12 pass / 0 fail**. The six new tests map 1:1 onto A-7's table of six and every one asserts on `core.fromJSON(<the port's bytes>)` |
| 6 | same file against `store.ts` reverted to `bcf2beb` (scratch worktree) | **exactly 4 fail** — cases 2, 3, 4, 5 — and the two ceilings pass either way, which is correct. **The builder's red/green claim is true and the tests are aimed at the real defect** |
| 7 | **my own probe**: gate `load()`, dispatch during the read, **real 400 ms debounce, no explicit flush**; then the same gating `saveIfVersion` | **0 FAIL.** `stored title="OTHER TAB"`, `savedVersion`/`savedDoc` unmoved, `status=conflict`, `isDirty()=true`, the local edit still in `doc`, and a second press converges on both edits |
| 8 | the same probe against `bcf2beb`'s `store.ts` | **8 FAIL** — `stored title=""` with `status=idle`. The loss reproduces on my own oracle and is closed by this fix |
| 9 | **my own adjacent-door probe** after an A-7 refusal: `closeTrip`, two `undo`s, five further edits, a **third** writer inside the window, a concurrent merge vs. a concurrent write | **0 FAIL.** Rule 6b aborts the transition with nothing lost; storage never regresses; every later autosave is refused by the fence; the third writer is not clobbered |
| 10 | `node qa/r11-recheck.mjs` | **0 FAIL** (was 2, both R11-1). §1.3b — the zero-undo control — now reports `stored title="OTHER TAB" status=conflict` |
| 11 | probe board, all my own runs | `r3-undo` `r3-loss` `r4-switch` `r2-copy` `r3-merge` `r2-resolutions` `r2-data` `r2-access` `r10-mergeundo` `r10-prune` `r9-geo` = **0 FAIL each**; `r10-redo` 3, `r9-ledger` 2, `r8-geo` 1, `r8-persist` 1, `r7-chain` 2, `r6-flush` 2, `r3-pool` 3, `r3-cas2` 3, `r6-actor` 5, `r2-constraints` 2 — **identical to the disclosed board. No undisclosed FAIL anywhere, no regression in the previously-closed chain** |
| 12 | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-views.mjs` | **0 FAIL, zero page errors**, my own Chromium run. Aug 8 renders `departs 14:30 · 1h 20m · arrives 15:50`; an `unknown` stop's control dispatches; the Optional panel and stop editor render *from a friend* **and** *From "Europe 2026"*; a dismissed conflict comes back **live**; the *Not saved* banner offers Retry and Export this copy. **B-1, B-2, B-3 still real** |
| 13 | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r7-browser.mjs` | **0 FAIL.** The merge driven through the real UI keeps **both** tabs' edits in IndexedDB and the chip reads *Saved*, at four press gaps. **A-7 does not over-refuse the ordinary merge in a browser** |
| 14 | `CAIRN_WALK_SEED={1,4242,20260827} node --test packages/client/test/dirty.test.ts` | 15 pass / 0 fail each. The 200-step oracle walk (`isDirty() === (toJSON(doc) !== the port's bytes)`) still holds under A-7 |
| 15 | `npm run web:build` | clean |
| 16 | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS.** 3 hits over 108 derived tokens, all `OPTIONAL`/`BOOKINGS` — KD-27's two named non-credentials. No PIN, no reference, no ticket URL in `dist/` |
| 17 | `Object.keys()` on `packages/core/src/index.ts` | **70 runtime symbols** — §2.10 and criterion E agree. A-7 added none, as specified |
| 18 | `node cli.ts trip` / `node cli.ts conflicts` | `16 days · 112 scheduled · 31 pooled · 95 places · 21 bookings`; `2 blockers, 4 warnings, 11 notes`; `1 error, 10 warnings`. Both blockers are `legacy_flag` — Jacob's own Aug 18 and Aug 20 flags. **No third blocker after five rounds of copy-path rulings** |
| 19 | `grep -rn 'acceptCandidate\|deleteTrip' apps/web/src --include=*.tsx` | `deleteTrip` only at `Library.tsx:101`; `acceptCandidate` **nowhere**. R8-3's and R8-4's unreachability claims still hold, on my own evidence |
| 20 | `git status -sb`, `git worktree list` | `master...origin/master`, in sync, no feature branch. The work is on `master`, per `CLAUDE.md` |

---

## For Jacob — Phase 1

**Phase 1 is done.** Open a browser and you get your real Europe trip, plus any number of other
trips: create one, switch between them, edit days and stops, see them on a map, copy an activity
out of one trip into another with the *"From Europe 2026"* credit following it everywhere it
appears, and get a conflicts panel and a validation report the current HTML page cannot give you.
The conflicts panel shows exactly two things you have to act on — your own Aug 18 and Aug 20 red
flags — and it took five rounds of design rulings to keep it honest at two rather than letting the
app cry wolf.

**The one thing that held it back last time is fixed, and I checked it the hard way.** There was a
moment where, if you had the trip open in two windows and kept typing during the fraction of a
second a merge took, the app could throw away the other window's saved work and still say *Saved*.
It now stops, keeps your typing on screen, tells you the trip was edited elsewhere, and one more
press of *Merge and save* brings both sides together. I reproduced the old bug myself, watched my
own test fail against the old code and pass against the new, and then went looking for four more
ways to reach the same loss around it. None of them worked.

**Nothing here is a stub pretending to be finished.** What is deliberately not built is written
down: no accounts, no server, no sync, no phone app, no email scanning — those are Phases 2 to 4
and always were.

**Two things worth knowing, and one is a decision only you can make.**

- **Decision: do you want an "accept" button before Phase 2?** Today, when you copy an activity
  from one of your trips into another, it stays labelled *from a friend* forever — there is no
  control that says "yes, this is mine now". That is the safe direction (nothing of anyone else's
  is ever shown as yours), but you will notice it the first time you use the feature. It is
  cheap to add, and adding it also forces one small design question we have already written down
  and parked. Say the word and it comes forward; otherwise it ships with the accounts work.
- **The demo trip is still recognisably yours.** Door PINs, booking references and ticket links
  are stripped by a rule with a test behind it, and I re-verified the build is clean today. Your
  prose is not stripped, on purpose, while this only runs on our machines. The day it serves a
  public page it has to become an invented trip — that is already written down as a Phase 2 exit
  condition, not something that can be forgotten.

Next up is Phase 2: accounts, a server, sync between your devices, and friends being able to open
your trip from a link. Phase 1 is closed and shipped.
