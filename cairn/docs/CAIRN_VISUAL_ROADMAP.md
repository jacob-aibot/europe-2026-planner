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


> **🟢 THE NEW MAP FRAME HAS BEEN ATTACKED AND IT HELD — as of 2026-09-01 (this block is the
> newest; it supersedes the block below on *"verified ❌"* and on what happens next, and nothing
> else).**
>
> **I-8i is designed ✅ · built ✅ · verified ✅ · shippable — the manager's call.** A tester spent
> a round trying to break it and, for the first time in this seven-round arc, could not. He wrote
> the whole frame calculation a second time from the ruling — his own distance formula, his own
> clustering algorithm, his own area formula — and got the **identical answer, character for
> character, on 24 different travel histories**, sixteen of which nobody had tested before. The
> guarantees were then checked on **every possible one- and two-country history there is** —
> 57,121 maps: not one lost a country, not one put a territory panel ahead of a place you actually
> went, and not one produced a broken frame. In a real browser, ten histories including the
> fourteen-panel worst case: every panel is on the page, none is hidden, collapsed or overlapping,
> and every country the calculation says to draw is drawn.
>
> **The five things Jacob asked to be re-attacked specifically, and what happened:**
>
> - **A trip to France opens on France.** Confirmed, and confirmed the hard way: the tester checked
>   that without the ordering rule it really would open on French Guiana, so the rule is doing work
>   rather than agreeing with an order that was already right.
> - **France + the United States.** Four panels, both countries at full size, France **342 × 236
>   px** measured on the real page. The two territory panels come after both, on screen and in the
>   order a screen reader hears — the tester checked the *laid-out grid positions*, not just the
>   page source.
> - **The Europe 2026 sample.** Unchanged to the byte, including when the map is built from the
>   real generated sample file rather than a test fixture.
> - **Sparse, far-flung histories.** Five new ones the tester invented (Iceland + New Zealand +
>   Mongolia, and four more). Each drew sensible independent panels; nothing merged that should not
>   have; nothing was lost.
> - **"I have been everywhere."** All 239 countries still collapse to one honest world map, to the
>   byte.
>
> **Seven small findings, none of them blocking, and none of them a bug in what was built.** They
> are all cases where a *sentence in the design document* is more confident than the measurement
> behind it — the published "worst case is 14 panels" is really 18; a census the roadmap states as
> "every one of 1,229" is a count of histories, not panels; a claim that the alphabet no longer
> breaks ties is technically not true (it still does, one step removed, and it only affects reading
> order); and the accessible label a screen reader hears on a territory panel says slightly more
> than the label printed beside it, which is the one item routed back to the builder as a real
> (one-word) fix. Full detail in `QA-FINDINGS.md`, round 39.
>
> **Zero blockers.** Nothing leaks, nothing is transmitted, nothing is destroyed; the saved data,
> the day map, the shared code list and the dependency list are all byte-identical.

> **🔵 THE MAP'S FRAMING MODEL WAS RECONSIDERED, JACOB'S FOLLOW-UP QUESTION IS ANSWERED, AND THE
> DESIGN IS NOW WAITING ONLY ON HIS APPROVAL — as of 2026-09-01 (this block is superseded on
> *"verified"* and on what happens next by the block above).**
>
> **This is not a fifth patch. Jacob stopped the patching.** Four rounds in a row, the architect
> added one more condition to the same rule, the builder built it faithfully, and the tester found
> the same kind of defect one step further out. After round 38 measured that the fourth fix reaches
> only the *minority* of maps (see the block below), Jacob told the architect to stop patching and
> reconsider the idea itself.
>
> **The idea being replaced.** Today the map decides *once* whether your history has a "main"
> region, then draws one big panel for it and small "shown separately" insets for everything else.
> That is why a country's size on screen depends on **where else you have been** — France is a
> comfortable 342 px wide on its own and 36 px wide the moment you add the United States, because
> the United States stretched the one rectangle they share.
>
> **The recommendation: no main panel at all.** Every cluster of places you have been gets its own
> equally-sized frame, in a grid, ordered so the region you travel most in comes first. Nothing is
> demoted to an inset, nothing is a footnote, and **nothing you add anywhere in the world can shrink
> a map you already had**. It is a *smaller* rule than the one it replaces — one grouping step
> instead of three, one kind of panel instead of four, no "is one region dominant enough?" test, no
> cap on panels, no alphabetical tie-break.
>
> **Measured before recommending, on real geometry:**
> - **France + United States**: France goes from **899 px²** to **80,712 px²** (90×), and the sliver
>   of French Guiana from **56 px²** to **64,224 px²**.
> - **France + New Zealand**: from **0.48% land** (i.e. 99.5% ocean) to **19% at worst**.
> - **Britain + Australia**: from **4% land** with Britain at 20 × 18 px, to **39%** with Britain at
>   307 × 288 px.
> - Across **all 28,441** two-country histories, panels wider than a third of the globe fall from
>   **8,364 to 1,229** — and every one of the 1,229 left is one of five countries whose *own* outline
>   wraps the globe (Antarctica, Russia, Fiji, Kiribati, the US minor islands), which is a separate,
>   already-documented problem this does not claim to fix.
> - **The Europe 2026 sample does not move at all** — the same three rectangles, to the character.
>   A history that really is one region stays one map. A history covering all 239 countries stays
>   **one honest world map**.
>
> **What it costs, stated rather than discovered:** a phone shows the panels stacked, so a history
> with many far-apart places is a longer scroll (worst realistic case ~14 panels). And it does not
> fix the two things no framing rule can — a micro-state like Monaco is still sub-pixel next to
> France, and the US minor islands still stretch their own panel across the Pacific. Both stay
> reachable through the country chip list under the map.
>
> **Jacob's one question about it, answered — and the answer is that the map already does the right
> thing (2026-09-01, `ARCHITECTURE.md` §4.4 A-53).** He asked: if France gets one panel and French
> Guiana gets another, hasn't the map just told me I went to South America when I only went to
> Paris? **Fair question, and the answer turned out to be no.** Three things:
>
> - **The app does not know you only went to Paris.** The lifetime map is built from a small
>   summary row per trip, and that row records **countries**, not places — the coordinates are used
>   once, to work out *which country*, and are not kept. So "France" is the whole of what the record
>   says, and French Guiana is exactly as much a part of France as Provence is. **Leaving it off
>   would be the app deciding which bits of a country count**, which it has no business doing and no
>   evidence for. (The same rule keeps **Alaska** on the map of a US trip — no one wants that
>   dropped, and no rule can drop Guiana without dropping Alaska too.)
> - **The panels are not all making the same claim, and they never were.** A panel holding a
>   country's *main* landmass carries that country's trip count and is captioned by name. A panel
>   holding only a far-flung piece carries **zero**, is captioned ***"distant parts of France"***,
>   and is sorted **after** every real destination. So France and the United States are what you see
>   first, at full size; Guiana and Alaska are last, labelled as what they are. Equal *rectangles*,
>   not equal *claims*.
> - **It cannot get out of hand, and this is now measured rather than hoped.** Across every country
>   on Earth, only **three** — France, the United States and the US minor islands — have geography
>   far enough from their own mainland to produce one of these panels at all. **The most any history
>   can ever have is three**, 372 of 400 randomly generated histories have **none**, and the 14-panel
>   worst case has **none**. Territories cannot flood the grid.
>
> One thing did get fixed by the question: nothing was checking that the real destinations sort
> first. Without that ordering rule, a France-only history would actually **open on French Guiana**
> — that is the raw order the geometry comes out in. The rule was already there; now it is written
> down and tested.
>
> **Established mapping libraries were checked first, not assumed away.** Before writing another
> Cairn-specific geography rule, the architect read the actual source of **D3 Geo** and **Turf.js**
> — the two standard tools for this — to see whether Cairn is reinventing something. Findings, with
> real numbers: D3's bounding-box function returns *the whole world* for a country outline drawn in
> the wrong direction, and stretches boxes taller than the shapes inside them (it measures curved
> paths across a globe; Cairn draws flat ones), so it would make the exact problem being fixed
> **worse**. Turf's clustering function **throws away** a lone island as "noise", which is the one
> thing this whole effort is not allowed to do. And all four real bugs found in this area over the
> past month were in Cairn's *own* choice of what to frame, not in any calculation a library
> provides. **So: no new dependency, nothing installed, 0 KB added.** The one place D3 genuinely is
> better — countries whose outlines wrap around the date line, like Fiji and Russia — is a known,
> separate, already-documented problem, and the note now says which 60 lines of D3 to borrow if it
> is ever tackled.
>
> **✅ APPROVED BY JACOB AND NOW BUILT — 2026-09-01.** He approved the equal-pane model and the
> home-pane/extent-pane answer to his membership question, and the builder pass has landed.
> **I-8i is designed ✅ · built ✅ · verified ❌ — nobody has attacked it yet, and a tester round is
> mandatory before it counts as anything more than "the code exists".** *(That round has now
> happened — round 39, 0 blockers, verdict SHIP. See the newest block at the top of this file;
> this line is superseded on "verified".)*
>
> What actually changed, in one line each:
>
> - **France and the United States now get a map each.** Before, that history drew one 134°-wide
>   strip of Atlantic with France 36 px across; now France is **342 × 236 px** — ninety times the
>   area — and the United States is beside it at its own scale.
> - **A country's size on your map no longer depends on where else you went.** Adding the US to a
>   France history moves France's rectangle by *nothing at all*. That was the actual defect, and it
>   was invisible to three previous testing rounds because you can only see it by comparing two
>   different histories.
> - **A trip to France opens on France.** The map's own geometry file happens to list French Guiana
>   before mainland France, so without the ordering rule the page would have opened on a small
>   rectangle of South America. It is now ordered by where you actually travelled, and there is a
>   test that would catch it coming back.
> - **Nothing is a footnote any more.** Every panel is the same size and every panel is labelled.
>   A panel holding only distant territory of a country you visited elsewhere says *"distant parts
>   of"* and carries a travel count of zero — it is never presented as a place you went.
> - **Territories cannot flood the screen.** Measured over every one of the 28,441 possible
>   two-country histories: at most **three** such panels can exist anywhere on Earth, and only if
>   you have been to France, the United States, or the US Minor Outlying Islands.
> - **The rest of the app is untouched** — the day map, the trip data, the saved files and the
>   shared-code list are all byte-identical, and no dependency was added.
>
> Three things the builder disclosed rather than hid, all for the tester and the architect to look
> at: a single-panel history (everywhere-you've-been at once) is drawn **35% shorter** than before,
> because every panel now shares one height limit — which costs three more tiny island states their
> tappable pixel, though every country is still reachable from the chip list; one line of the
> written test plan asks for something the layout rule it inherits cannot do (a narrow map is
> centred, not stretched); and one ordering rule is correct but currently redundant. All three are
> written up in `BUILD-NOTES.md` as KD-74, KD-75 and KD-76.

> **🟢 THE MAP'S NEW FRAME HAS NOW BEEN ATTACKED — the France/Greece defect really is fixed, and
> a bigger one behind it is not — as of 2026-09-01 (this block is superseded on "what happens next"
> by the block above, and is otherwise still the tester's verdict of record).**
>
> **I-8h is designed ✅ · built ✅ · verified ✅ · shippable — the manager's call, but the map
> *track* is not finished.** A tester spent a round trying to break it and **could not find one
> place where the code disagrees with the ruling**: he rewrote the whole frame calculation a
> second time, from scratch, and got the identical answer for every map he tried — same panes,
> same rectangles, same numbers, down to the character. **0 blockers.** France + Greece is fixed
> exactly as claimed (Greece is now **5,367 px²** on a phone against **783** before — 6.9× bigger),
> the Alaska rule is genuine geometry (he re-ran everything on a map file with **every country
> code scrambled** and got identical results), and the four-panel layout nobody had actually
> looked at renders correctly at four screen sizes.
>
> **What he found instead is that the fix does not reach the commonest map there is.** If you have
> been to two countries on two different continents, with one trip each, the map still refuses to
> split into two panels — that rule is deliberate and four years of architecture notes explain why
> — and the single panel it draws instead is the *same* "map of the wrong subject" the last two
> rounds were about. **France + United States draws France at 36 × 25 pixels** in a 356 × 80 strip;
> **France + New Zealand is 99.5% empty ocean.** **80% of all two-country histories are this
> shape.** Nobody had ever measured it. That goes back to the architect as **R38-2 (MAJOR)** and is
> why the map track needs a fifth design round rather than a ship.
>
> Three smaller things go back with it: a panel can still be more than half empty *box* even after
> the "fill the box" fix, because the fix measures the drawing and not the panel (**R38-3**); a
> distant island sharing its panel with another country's shrinks to **7 × 8 pixels** (**R38-4**);
> and a malformed map file could silently lose a shape with nothing on screen to say so
> (**R38-5** — not reachable from the shipped map data, flagged for later). One note goes back to
> the builder: the "prove this test can fail" check recorded as **KD-71** *can* in fact fail — just
> not on the country or at the distance the architect named (**R38-1**).
>
> The findings, the numbers and the exact commands are in `QA-FINDINGS.md`, round 38.

> **🟡 THE MAP'S NEW FRAME WAS BUILT HERE — as of 2026-09-01 (this block is superseded by the
> block above, which is the tester's verdict on it).**
>
> **I-8h was designed ✅ · built ✅ · verified ❌ when this block was written; it is now verified —
> see the block above.** Everything the
> redesign block below describes is now code, and every number in it was re-derived by running it
> rather than copied: France + Greece measures **31.20° × 16.23°** and **14.7% land on screen**
> (it was 81.13° × 49.10° and 1.95%), Greece renders **71 × 76 px** on a phone (it was 27 × 29),
> France alone goes **64.08° → 14.15°**, and your Europe 2026 main frame is **byte-for-byte
> identical** to the one that shipped. Alaska detaches from a US-only map and stays in frame the
> moment Canada is added — the test that proves the rule is geometric.
>
> The country-code chips are alphabetical again, and **every map now fills its box in both
> directions** — measured across all 239 single-country maps at a phone size and a desktop size,
> with no letterboxing beyond a single pixel. Chile went from 33% of its box to 100%.
>
> **Two honest notes, written down rather than smoothed over.** (1) One of the architect's own
> "prove this test can fail" checks turned out to be unfalsifiable on the shipped map data; a
> different check that genuinely can fail was substituted and the original is recorded as
> **KD-71**. (2) The architect's proof that a map frames exactly one connected group is true for a
> map built from one cluster and not for the two kinds of map that hold several — the *behaviour*
> is unaffected, only the proof is over-stated (**KD-72**).
>
> **A tester had not attacked this when this block was written; he has now — see the block above.
> KD-71's claim did not survive that round (R38-1); KD-72's did.** It widens the shared engine's
> public surface (78 → 79), which is why the adversarial round was mandatory. I-8h does **not**
> block **I-8b** (the Profile screen); I-8b still waits on **I-8f**.

> **🟠 THE MAP'S FRAME WAS REDESIGNED HERE — as of 2026-09-01 (this block is superseded by the
> block above on *"not built yet"*; it supersedes the round-37 block below on *"shippable — the
> manager's call"* and on I-8g's status).**
>
> The tester's finding went back to the architect, and the answer is written up as **A-49** and
> **A-50** in `ARCHITECTURE.md`, scheduled as **I-8h**. **No code has been written for it yet.**
>
> **What was actually wrong, in one sentence.** The last fix taught the map where a country *is*
> (the middle of its biggest landmass) but never taught it how far to *zoom out*, so it still
> stretched the frame far enough to include French Guiana — a map that knew France was in France
> and then drew the Atlantic anyway. Two different answers to the same question, in the same map.
>
> **The new rule, in plain terms.** A country is treated as its **pieces** — mainland France and
> French Guiana are two pieces, the mainland US and Alaska are two pieces — using exactly the same
> 4,000 km rule that already decides which countries share a map. A map frames the pieces its
> subject is actually connected to; the pieces that are far away get **their own small map**
> underneath, labelled with the country, still tappable. Nothing is cropped, nothing is hidden, and
> nothing anywhere in the rule knows what an "overseas territory" is.
>
> **Measured, before it was written down:**
>
> - **France + Greece:** the map goes from **81° × 49° and 2% land** to **31° × 16° and 14% land**,
>   and Greece is nearly **8× bigger**. French Guiana gets its own frame at 60% land — bigger than
>   it has ever been drawn.
> - **France on its own:** **64° wide → 14° wide.**
> - **Your Europe 2026 map does not move at all** — the main frame is byte-for-byte identical. The
>   US inset narrows from 105° to 58° (the lower 48), and Alaska and Hawaii move to a third small
>   frame. That is a visible change to your sample and it is written down as one.
> - **Alaska is the test that proves it is a rule and not a hack:** on a US-only map Alaska is far
>   enough away to get its own frame; add Canada to the map and Alaska stays in the main frame,
>   because it is genuinely connected to it. Same rule, different answer, no special case.
>
> **Two smaller decisions, both made:**
>
> - **The country-code chips go back to alphabetical.** The fix is in the data the screen is handed,
>   not in the screen — the new design makes the paint list contain a country twice, so a screen
>   that used it as a country list would print France twice.
> - **"The map fills its box" is fixed for tall maps too.** Chile and the Maldives stop leaving two
>   thirds of their box empty, and your Europe map stops leaving a quarter of it empty on a wide
>   desktop. Said honestly: this does not make a narrow country wider — the Maldives is a narrow
>   column on any honest map — it removes the wasted box around it.
>
> **I-8g is built ✅ · verified ✅ · shippable ❌ as the whole answer** — the code does exactly what
> it was told to do and the ruling it was told to follow was incomplete. **I-8h was designed ✅ ·
> built ❌ when this block was written; it is now built — see the block above.** I-8h does **not**
> block **I-8b** (the Profile screen): which countries share a map is settled, and only how wide
> the map is is not. I-8b still waits on **I-8f**.

> **🟢 I-8g HAS NOW BEEN ATTACKED — the two map defects really are fixed, and one is not — as of
> 2026-09-01 (this block is superseded by the redesign block above on *"shippable"*; it supersedes
> the I-8g block below on *"verified ❌"*).**
>
> The tester spent a round trying to break I-8g and **could not find one place where the code
> disagrees with the design**. Everything the builder claimed was re-measured from scratch, with a
> second, independently written implementation of every calculation rather than by re-running the
> builder's scripts: France's marker, the 203 km worst case, the 176 countries, the grouping being
> order-proof (checked across **288,000** different orderings), Andorra being tappable, the map
> filling its box, the dark-mode colour, and your Europe 2026 map still matching to four decimal
> places. **Zero blockers.** The day map is byte-for-byte unchanged — including the exact rectangle
> it zooms to, on every one of the 16 days.
>
> **What the round found, in plain terms.**
>
> - **The two-France-and-one-Greece map is still a picture of the ocean.** Both countries are on
>   one map now and Greece is no longer labelled "shown separately" — that part is genuinely
>   fixed. But **97.8% of that map is empty sea**, and **Greece is 35× smaller on screen than it
>   was before this change**, because it used to get its own small box and now it is a 27 × 29
>   pixel speck beside France. The cause is the one thing the ruling deliberately did not touch:
>   the frame still has to stretch far enough to contain French Guiana. **This goes back to the
>   architect** — it is the same "map of the wrong subject" problem as before, one step further
>   downstream, and it is not something the builder can fix without a new ruling.
> - **Three sentences in the code now say the opposite of what is true** (they describe the old
>   grouping rule and quote a safety margin the architect withdrew as false). Cosmetic, but it is
>   the one place a future reader goes to find out why a number is what it is. **Back to the
>   builder**, one small edit.
> - **The country-code chips under the map quietly stopped being alphabetical.** They now list
>   largest country first. Nothing is unreachable — every country is still in the list and still
>   clickable — but for someone with fifty countries it is harder to scan, and the ruling says
>   this list did not change. **Architect's call.**
> - **"The map fills its box" is true for wide maps and not for tall ones.** A Chile-only or
>   Maldives-only map still leaves 2/3 of its box empty at phone width, and even your Europe map
>   drops to 77% on a wide desktop screen. Not a regression — it is exactly what it was before —
>   but it is only half a fix and nobody had written that down.
>
> **I-8g is built ✅ · verified ✅ · shippable — the manager's call.** The recommendation is *ship
> the code and send the frame-width question back to the architect*, which is the same routing the
> previous round gave. **I-8b (the Profile screen) is no longer blocked by the map's grouping** —
> that question is settled — though it still waits on **I-8f**.

> **🟡 I-8g IS BUILT — France is in France, and the alphabet no longer decides which country gets
> exiled — as of 2026-09-01 (this block is superseded by the round-37 block above on
> *"verified ❌"*; it supersedes the I-8d block below on *"I-8g is built ❌"*).**
>
> Both design defects the tester found in the map rule are now fixed in code, and the fixes are
> measured rather than argued:
>
> - **A country's position is now the middle of its single largest landmass.** France lands in
>   central France, Russia in Siberia, Kiribati on its biggest island. The worst error across all
>   239 countries falls from **16,598 km to 203 km**, and **176 countries** now have their marker
>   inside their own borders. France is once again nearer to Germany (804 km) and Czechia
>   (1,075 km) than to Morocco (2,227 km) — the numbers were 3,891 / 4,137 / 1,339.
> - **Grouping is computed for the whole set at once**, so the order countries arrive in cannot
>   change the answer. The UAE / Austria / Greece example is **one map in all six orders**, checked
>   both in a test and by planting it in the real app three different ways. Of the three-country
>   combinations that used to split neighbours apart, **none do now**.
> - **Andorra is tappable again.** Big countries are drawn first, so the small ones sit on top. In
>   a real browser, over a library holding all 239 countries, Andorra now hits itself where it had
>   **zero** tappable pixels before.
> - **The map fills its box on a phone**: **42.6% → 100%** at 390 px wide, i.e. the 264 px of empty
>   sea is gone. And the **dark-mode** country colour goes from **2.87:1 to 3.87:1** against the
>   sea, clearing the 3:1 accessibility floor with room to spare (light mode is unchanged).
> - **Your Europe 2026 map is untouched, to four decimal places** — that was pinned as a test
>   before anything else was written, and it still passes.
>
> **One thing it does not fix, said plainly.** A traveller with two France trips and one Greece
> trip now gets **one map holding both** instead of Greece exiled to the side box — but that map is
> still **81° wide**, because France's *drawn shape* includes French Guiana and the frame has to
> contain everything it draws. It is a better map than before and it is still mostly ocean. The
> architect's ruling covers where a country *is* for grouping, not how wide the frame around it
> gets; changing that is a separate decision and is written up as **KD-70** in the build notes.
>
> **I-8g is built ✅ · verified ❌ (not yet attacked) · shippable ❌** — it changes a shared piece of
> the engine (the same grouping code the day map uses) and adds one function to the core boundary,
> so a breaker round is mandatory before it can ship. **I-8d's two design defects are fixed but
> not yet re-attacked.** I-8b (the Profile screen) still waits on **I-8f**.

> **🟠 I-8d HAS NOW BEEN ATTACKED, AND THE THING THAT'S WRONG IS THE RULE I WROTE, NOT THE CODE —
> as of 2026-08-31 (this block is the newest; it supersedes the I-8d block below on
> *"verified"*, supersedes the I-8e block's *"I-8d has still never been attacked"* line, and
> adds one increment).**
>
> The tester spent a round on the map framing and **could not find a single place where the code
> disagrees with the design** — every clause, checked against all 239 countries in the dataset,
> **zero blockers**. The fix that motivated it is real and confirmed: the six European countries
> that were 28–46 px wide are now **152–245 px**. What it broke was **the rule itself**, twice.
>
> **Problem 1 — "where is France?" is answered by a rectangle.** To decide which countries belong
> on the same map, the rule takes the middle of the box drawn around each country. France's box
> includes **French Guiana, in South America**, so the point that stands for "France" sits in the
> **open Atlantic, 2,633 km from anywhere French**. The consequence is not cosmetic: France then
> counts as **closer to Morocco (1,339 km) than to Czechia (4,137 km)**, and a traveller with two
> France trips and one Greece trip gets a main map **four-fifths ocean** with Greece — actually
> 1,900 km from France — pushed into the little side box. That is exactly the failure this whole
> map fix existed to remove, reproduced by the fix.
>
> **Problem 2 — the alphabet decides which country gets exiled.** Countries are grouped one at a
> time, in the order they arrive, which is alphabetical. Give the app the UAE, Austria and
> Greece: **Austria (1,326 km from Greece) goes to the side box while the UAE (3,281 km) shares
> the main map** — and the identical three countries in a different order produce one map. There
> are **122** such three-country combinations; the tightest separates **Hungary and Slovenia, 350
> km apart**.
>
> **What is now scheduled to fix it (`I-8g`), in two sentences.** A country's position becomes
> the middle of **its single largest landmass**, not the middle of a box drawn around everything
> it owns — no special cases and nothing that knows which country is which: France lands in
> central France, Russia in Siberia, Kiribati on its biggest island, and the worst error across
> all 239 countries falls from **16,598 km to 203 km**, with 164 countries not moving at all. And
> the grouping is computed **for the whole set at once** rather than one country at a time, so
> the order they arrive in cannot change the answer — the three-country example above becomes
> **one map, in all six orders**.
>
> **What must not change, and is pinned as a test:** your Europe 2026 map stays exactly as it
> looks today — Europe in the main frame, the United States in the inset, the same numbers to
> four decimal places.
>
> Three smaller things ride along, all measured this round: on a phone the map paints only
> **42.6%** of the space it is given (264 px of empty sea below it); the country colour in **dark
> mode** sits under the accessibility contrast floor against the sea (2.87:1 against a floor of
> 3:1); and **Andorra currently has no tappable pixel at all**, because France is drawn on top of
> it — fixed by drawing the big countries first, which is free and provably right.
>
> **I-8d is built ✅ · verified ⚠️ (attacked, 0 blockers, 2 design defects found in the rule) ·
> shippable ❌**, and **I-8g is designed ✅ · built ❌**. I-8b (the Profile screen) now waits on
> **I-8f and I-8g**.

> **🟠 I-8e HAS NOW BEEN ATTACKED, AND THE "SAVE A COPY" PROMISE TURNED OUT TO COVER AN EIGHTH OF
> WHAT IT CLAIMED — as of 2026-08-31 (this block is superseded on *"I-8d has still never been
> attacked"* by the block above).**
>
> The tester could not break anything I-8e was asked to build — the warning, the rescue copy, the
> Delete confirmation and the fixed "Close this trip" all held up under attack, **zero blockers**.
> What it broke was **my own claim about how far they reach**.
>
> **The problem, in one sentence:** the card decides whether to warn you by looking at the trip's
> **start and end dates** — but a trip file has a date on *every day* and *every booking*, and on
> your Europe 2026 trip that is **16 dates against 2**. So a file with one bad day-date shows a
> **completely healthy card**: past-trip badge, full counts, a confident date range. Tap it and it
> correctly says the file cannot be read — and *even then* there is still no "Save a copy" button
> and Delete still gives you the ordinary "this cannot be undone" with no mention that the copy on
> your phone is the only one. That is roughly **8 out of every 9** unreadable files, not an edge
> case.
>
> **What is now scheduled to fix it (`I-8f`):** stop guessing from the dates on the card, and
> **write it down when the file actually fails to open**. When you tap a trip and it refuses, the
> app records that it refused — so the card you come back to now carries the warning, the "Save a
> copy" button, and a Delete that says what Delete costs. Nothing extra is opened or scanned to do
> this: it only remembers what already happened. The one honest limitation stays and is written
> down: **on a fresh start, a bad file still looks fine until something tries to open it** —
> finding it any earlier would mean opening every trip on the device every time the list is drawn,
> which is exactly what the app is built not to do.
>
> Two smaller things ride along: `cli.ts --today 2026-13-45` used to print *"statistics as of
> 2026-13-45"* over numbers actually computed for **2027-02-14** — it now refuses the date instead
> of quietly correcting it; and the "save the stored copy" call now refuses to be pointed at the
> trip that is currently open, where it could hand back slightly stale bytes.
>
> Two cosmetic findings go to the builder, not into this: the new explanatory sentence under the
> warning is **too pale to read** (2.63:1, well under the floor), and **one** bad trip inflates
> **every** card in the list from 95 px to 446 px tall.
>
> **I-8e is built ✅ · verified ⚠️ (attacked, 0 blockers, 1 design gap found) · shippable ❌**, and
> **I-8f is designed ✅ · built ❌**. I-8b (the Profile screen) now waits on **I-8f**.
>
> **Also worth saying plainly: I-8d has still never been attacked.** It shipped after the last
> tester round, and the two rounds since were both aimed at other increments. It owes its own
> round before 2b can ship.

> **🟡 I-8e IS BUILT, AND I-8c'S BROKEN "CLOSE THIS TRIP" IS FIXED — as of 2026-08-31 (this
> block is superseded on *"verified"* and on *"I-8b is now UNBLOCKED"* by the block above).**
>
> **A trip Cairn cannot open now says so on the card, before you tap it — and you can save a
> copy of it instead of choosing between a dead screen and Delete.** Three things landed:
>
> 1. **The card tells the truth.** A trip whose stored dates are not real dates — `2026-02-30`,
>    `2026-13-01` — used to render as a completely healthy card: a `PAST TRIP` badge, full
>    counts, a confident date range. Tapping it produced a parser error and nothing opened. It
>    now carries the same *"This trip's file could not be read"* warning the app already used
>    elsewhere, and the date line shows the two strings that are **actually in the file**
>    instead of a plausible-looking guess. (It used to print *"February 2026"* for a trip whose
>    file says `2026-02-30`, which is a month that date does not exist in.)
> 2. **"Save a copy."** A new control, on that card only, that writes the stored file out
>    exactly as it is — no repair, no rewriting, byte for byte. It is named
>    `…cairn-unreadable.json` rather than `…cairn.json` and the card says plainly that Cairn
>    cannot re-read it: it is a copy to **keep or send on**, not a backup to restore. Verified
>    end to end in a real browser download.
> 3. **Delete now says what Delete costs.** On such a card the confirmation says the copy on
>    this device is the only one that will exist afterwards, and points at "Save a copy" first.
>    Before this, Delete was the *only* thing that card offered, with no warning at all.
>
> **And "Close this trip" now works.** The one recovery the app offers when a screen fails
> closed the trip but left the error banner up and the library blank — you had to click a second
> button to actually get back. One click now does what it says, verified in Chromium with the
> fault still armed.
>
> Two smaller repairs went with it: the warning colour was too pale to read at chip size (it now
> clears the accessibility contrast floor in both light and dark), and the message you get when a
> trip refuses to open is a sentence now rather than a raw parser path.
>
> **What this does *not* claim, deliberately:** a trip can still be listed as fine and refuse to
> open, because the only way to find some faults is to open the file. The card says *"could not
> be read"* when it knows; it never says *"everything else here will open."*
>
> **I-8e is built ✅ · verified ❌ (not yet attacked) · shippable ❌. I-8b (the Profile screen) is
> now UNBLOCKED** — I-8c, I-8d and I-8e have all landed, which was its whole blocker list. Both
> I-8d and I-8e still owe a breaker round before 2b can ship.

> **🟡 I-8d IS BUILT — the map is now a map of your trip, not of one country — as of 2026-08-31
> (superseded on "what is still owed" by the block above).** The lifetime map used to open on a 194° frame because one flight stop in the
> United States sat 7,439 km from the rest of the trip, squeezing all six European countries
> into 149 px of a 958 px figure. It now frames **the main geographic cluster**, with the
> distant country **beside it in its own small frame that names it** — Jacob's own decision,
> built as `ARCHITECTURE.md` §4.4 **A-41**.
>
> Measured on the real Europe 2026 sample, loaded through the *"Load Europe 2026"* button: two
> frames, the main one **30.3° × 16.2°** across Europe holding `AT CZ DE GB HR HU`, and an inset
> holding `US`, captioned with its code and tappable exactly like the main map. **Nothing is
> dropped and nothing is hidden**: all seven countries are still drawn, still counted and still
> attributable to the trip they came from — that was Jacob's first constraint and it is asserted
> as a test, not promised. A history where no part dominates (one US trip, one Japan trip) still
> gets today's single wide frame, because there is no subject to prioritise; a history with many
> scattered clusters gets at most three frames, the last of which holds everything remaining.
>
> Two smaller things went with it. Every frame now leaves a visible margin around what it draws,
> so the outermost country's outline is no longer clipped at the edge (it was clipped by exactly
> 0.000000° of margin before). And the legend's *"Zoomed out to a readable minimum"* line is
> **deleted** — it claimed something the map could not support, and saying nothing is more honest
> than saying that.
>
> **There is no new control, and that is deliberate.** No "reframe" button, no zoom, no threshold
> slider: a control that exists mostly to repair a bad default is a confession, and the default
> is now right.
>
> **I-8d is built ✅ · verified ❌ (not yet attacked) · shippable ❌.** *(Superseded twice: what
> was still owed before I-8b — I-8c's two fixes and I-8e — has landed; and I-8d **has** now been
> attacked, with two design defects found in the rule this block describes. See the newest block
> at the top.)*

> **🟠 I-8c HAS NOW BEEN ATTACKED, AND IT GOES BACK — as of 2026-08-31 (this block is the newest;
> it supersedes the I-8c block below on "verified" and adds one increment).** The breaker round
> could not break either of the two data-integrity gates below — it fed the date parser 140,042
> dates against an independent calendar and found no disagreement — but it found two things:
>
> - **A screen that fails still traps you.** *"Close this trip"* on the error banner leaves you
>   looking at the same dead screen; a second click gets you out. A four-line ordering bug in the
>   one branch that shipped untested. Going straight to a builder.
> - **We refuse the bad file, and then never tell you that you have one.** This is the design
>   defect, and it is mine. A trip whose stored file contains a date that does not exist shows up
>   in your list as a **completely healthy trip card** — full counts, no warning — and only fails
>   when you tap it, with an internal error string. The only button on that card is **Delete**, and
>   there is **no way to export a trip you cannot open**. The ruling that refused the file said
>   this case would be flagged; it measurably is not.
>
> **What is now scheduled to fix it (`I-8e`):** the card says *"This trip's file could not be
> read"* using the warning style the list already has, shows the raw dates as they are actually
> stored instead of inventing a readable-looking range, warns you before Delete that this is the
> only copy — and adds **"Save a copy"**, which writes the file out byte-for-byte without trying
> to read it. Repairing such a file in-app is still deliberately not built; getting it out safely
> now is.
>
> **I-8c is built ✅ · verified ❌ (SEND BACK) · shippable ❌**, and **I-8e is designed ✅ · built
> ❌**. I-8b (the Profile screen) now waits on **I-8c's fix, I-8d and I-8e**.

> **🟡 I-8c IS BUILT — as of 2026-08-31 (superseded on *"not yet attacked"* by the block above; it
> amends the I-8a block below on two of the items that block routed).** Three small fixes, all on
> the same screen, all shipped together as one increment:
>
> - **A backup file that contains a date which does not exist is now refused, in words, naming the
>   field.** Before this, restoring a file that said `2026-02-30` or `2026-13-01` loaded cleanly and
>   then quietly told you a trip you actually took never happened — a two-day trip could read back
>   as 183 days, and a trip in 2026 could roll into 2027, classify as *upcoming*, and vanish from
>   *everywhere you have been* with nothing on screen saying so. Nothing the app writes could make
>   such a file; a hand-edited or hand-built one could.
> - **One unreadable stored record now costs one row, not the whole screen.** That row shows an
>   explicit *"Dates could not be read"* chip and everything else — including **Delete** — keeps
>   working. This is the item the I-8a review routed as *"no way out if it were reachable."*
> - **When a screen does fail, there is a way back.** The error banner now offers *"Try again"*
>   and one more control that does not live on the broken screen, and it stops showing once the
>   cause is gone instead of staying for the rest of the session.
>
> **I-8c is built ✅ · verified ❌ · shippable ❌.** It does **not** unblock I-8b on its own:
> **I-8d — the map-framing decision below — is still owed**, and so are I-8c's own two fixes and
> I-8e (see the block above).
>
> **🟢 I-8a IS SHIPPED — the Map screen and the visual language are signed off — as of 2026-08-31
> (this block is the current state; the 2026-08-29 block below it is older on I-8 only).** I-8 was
> split into **I-8a** (the map, the tab shell, the type-and-colour layer) and **I-8b** (the Profile
> screen). **I-8a is now built, attacked and shipped.** What you can actually see: the app has **tabs — Trips and Map** —
> and the Map draws **every country you have been to, filled in, from a map bundled inside the app**
> with nothing fetched from a server. Tap a country and it lists the trips that took you there.
> A country you are only counted in because you are *on a trip right now* is drawn differently —
> outlined, not filled — instead of being claimed as somewhere you have been. If a country in your
> history has no shape in the bundled map, the screen **says so and names it**, rather than quietly
> drawing one country fewer than the number beside it.
>
> Two things that are not on the map but are the point: **the app now looks like the planner it came
> from** — condensed display type, every number and label in a typewriter face, hairline rules,
> small corners, outlined badges — with the three typefaces **served from the app itself** so it
> still reads with no network (91.7 KB in total). And **a real design defect is fixed**: an activity
> you had not accepted yet was shown by fading the whole row, and a row that *also* had a scheduling
> problem faded the warning too — so the more wrong it was, the fainter it got. Provenance is now a
> dashed outline and a badge, and the warning keeps its full colour whatever else is true of the row.
>
> **What is NOT built: I-8b, the Profile screen.** There is deliberately **no empty Profile tab**
> waiting for it — a tab that promises something is exactly what this product refuses to do. Adding
> it later is one line in the tab list. **2b does not ship until I-8b lands.**
>
> **I-8a is built ✅ · verified ✅ · shippable ✅.** QA round 33 attacked it — **0 blockers, 4
> MAJOR, 5 MINOR** — and the manager gate ruled **SHIP** (`REVIEW.md`, "I-8a", `6b89c91`,
> 2026-08-31), re-deriving the map on his own oracle rather than taking the numbers. What held:
> the map is drawn correctly from the bundled index with **nothing fetched from any server**;
> the "cannot fit a map in a hidden container" bug that bit the original planner is genuinely
> **absent** here, not patched (the map's frame is byte-identical whether the tab is hidden,
> shown, or computed with no browser at all); the faded-signal design defect is really fixed;
> and no credential, no gradient and no external font reaches the build.
>
> **One thing is not good and Jacob has a decision to make about it.** His trip includes the LA
> flights, so his history contains the **United States** — and the map fits itself around
> everything, so the six European countries the trip is about end up a small clump against the
> right-hand edge while America fills the screen. Nothing is *wrong* (all seven countries are
> drawn, labelled and listed), but it is a map of America with Europe in the corner. **The
> Profile screen (I-8b) is blocked until that framing is decided** — the three options are in
> `REVIEW.md`'s "For Jacob". Also routed and non-blocking: an unreadable stored record would
> take the Trips screen down with no button left to delete or export the trip causing it (not
> reachable from anything the app writes today, but there is no way out if it were); and three
> of the ten injected-fault checks behind the ship gate measure the right thing the wrong way —
> the manager re-established their substance by hand, and the instrument is being repaired.

> **🟢 STEP 2b's DATA LAYER IS SHIPPED — as of 2026-08-29 (this block is the current state; every
> 2b/I-7 sentence below it is older).** `REVIEW.md` now records **SHIP** for "Phase 2, step 2b
> (data layer) — I-5 … I-7b", at `6cd7187` on `master`. Every increment from the country index
> through the summary-row read boundary is **built ✅ · verified ✅ · shippable ✅**: I-5/I-5a/I-5b/I-5c
> (the country index, corrected at the edges), I-6/I-6a (the widened summary row and its rescan),
> I-7 (`travelStats`), I-7a (the calendar fix and `provisional` marking), and I-7b (the storage
> read boundary, closed by architecture rulings **A-38** and **A-39** after QA rounds 30 through 32
> found and closed the last two gaps in its coverage).
>
> **What is NOT shipped: I-8, the Map and Profile screens — 2b's remaining and final increment.**
> Nothing new is on screen yet; `WorldMap.tsx` and `Profile.tsx` do not exist. I-8's
> design-independent data plumbing — a `travelHistory` selector wrapping `travelStats` with the
> typed read boundary I-8 needs — shipped in the same commit as the ruling above, but I-8's UI is
> deliberately **paused**, pending a new native-iOS visual-direction process. It is a scheduling
> choice, not a technical block: nothing above is waiting on it.
>
> **🟠 [history] STEP 2b — WHERE IT ACTUALLY IS, as of 2026-08-28 (superseded by the block above;
> kept as the running log, oldest first).** Six increments of 2b are now **built**, and this board had
> fallen five behind, so here is the whole of it in one place. **I-5** put a country index in the
> app and taught it to say which country a coordinate is in — **offline, from a bundled map,
> never by asking a server where you are**. **I-5a, I-5b and I-5c** were three rounds of making
> that index honest at the edges: small island countries stopped coming back blank, and the one
> place it was quietly answering *"Macao"* about mainland China was fixed. **I-6** widened the
> saved-per-trip summary so the trip list carries its countries and cities without opening forty
> trips, and added the *"Recomputing…"* pass that repairs old rows when the answer improves.
> **I-6a** let a city you typed a country for fill a gap the map cannot answer — never override
> one — and stopped that repair pass from stepping on another tab's edits. **I-7 (this pass)**
> is `travelStats`: everywhere you have been, computed on demand from those summaries, with the
> one rule the whole feature rests on — **a trip you have booked but not taken counts for
> nothing**, and a trip you are on right now counts only up to today.
>
> **What that means for what you can see:** still nothing new on screen. The numbers exist and are
> printable from the command line (`node cli.ts stats`), but the **Map and Profile screens are
> I-8**, which is where 2b actually ships. **Verification:** I-5 through I-6a have all
> been attacked (QA rounds 22–27, the last one clean of blockers), and **I-7 has now been attacked
> too — QA round 28, 2026-08-28, and it did not pass.** **I-7a then fixed everything that round
> found, and has not itself been attacked yet.** No manager verdict exists for any of 2b.
> Built ✅ · verified ⚪ · shippable ⚪.
>
> **🟡 I-7a IS BUILT — every one of round 28's findings is closed in code, and nobody has attacked
> the fixes yet.** Dates before the year 1000 are now real years: the app does its own calendar
> arithmetic instead of asking JavaScript's `Date`, so a trip recorded as year `0202` stores,
> reopens and validates like any other, and the year comes back four digits wide instead of three.
> The rule that stops a lifetime total ever being *saved* was rewritten to check **what is actually
> written into storage** rather than what the source code declares — including reading the rows
> back out of a real store after a real save — and the ten ways a tester found to smuggle a total
> past the old rule are now ten faults the new one is checked against. And the command line stops
> presenting a country you reach next week as somewhere you have been: those rows now say
> **"· in progress"**, with a one-line explanation underneath, and are marked rather than hidden —
> because hiding them would tell someone standing in Vienna that they have never been there. Four
> smaller fixes came with it: a crash on a stale saved row (which the app itself could produce for
> a second between opening the trip list and finishing its repair pass), a count that could go
> negative, one field with two different answers to *"is this country unknown"*, and
> `--today gibberish` printing a wall of red stack trace instead of one line.
> **I-7a is built ✅ · verified ⚪ · shippable ⚪** — QA round 29 is what would move the second one.
>
> **🔴 What round 28 found, and what happens before I-8.** *(History as of I-7a. The statistics
> function itself held up)*
> under everything the tester threw at it. Two things underneath it did not. **(1) Dates before the
> year 1000 were being silently misread as 1900-something** — a JavaScript rule from 1995 that
> `Date` still honours — which meant that recording a past trip and mistyping the year as `0202`
> instead of `2020` wrote a trip to your browser's storage **that could never be opened again**.
> That is real data loss on a screen you can reach in four clicks, and it is the reason this round
> is a send-back rather than a note. **(2) The rule that is supposed to stop the app ever *saving* a
> lifetime total** — because a saved total is a number that can silently disagree with the trips it
> claims to summarise — **could not actually catch it happening**: the tester wrote
> `countriesVisited` into every stored record and the whole 795-test suite stayed green. A third,
> smaller finding: the command-line output prints a country you reach *next week* as somewhere you
> have already been, with dates and no marker, which is the one convention this project has held
> since day one. All three are now designed (`ARCHITECTURE.md` revision 25) and scheduled as a new
> increment, **I-7a**, which is owed **before** I-8 — because I-8 is the screen that would otherwise
> put every one of them in front of you. **I-7a is now built** — see the paragraph above it.

> **🟢 STEP 2a IS SHIPPED.** The manager reviewed it at `67f5588` on 2026-08-28 and the verdict is
> **SHIP** — `REVIEW.md`, "Phase 2, step 2a". So 2a is now **built ✅ · verified ✅ · shippable ✅**,
> all three, which are three different claims (see "Definition of done" at the bottom). **Step 2b —
> the map of everywhere you have been — is unblocked and is next.** Seven follow-up items were routed
> and **none of them blocks 2b**; two of them are visible to you and are written up in *"What Jacob
> should know"* below. One thing the verdict deliberately did **not** do: the block on
> sharing/friends/public links stays in place until one design question about importing someone
> else's file is settled.
>
> The paragraphs below are the running log of how 2a got here, oldest first. **They are history, not
> current state** — the current state is the paragraph you just read.

> **⚙ [history] PHASE 2 IS UNDERWAY — step 2a is built (not yet verified, not yet shipped).** As of
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

> **That was built, round 21 checked it against the written criterion, and the arc is now CLOSED.**
> This is the first time in this project that an arc has ended on a *test someone wrote in advance*
> rather than on a judgement call at the end. The tester ran all six checks — not looking for
> whatever it could find, but for exactly the six things the ruling said must be true — and **all
> six hold**, each one re-run from the code rather than taken from the builder's report: the full
> suite green with the copy check inside it, the one-line fix shown to fail when backed out and pass
> when applied, the "invent a new field" trap now catching a builder at **two** places instead of
> one (so there is no green-and-blind state to walk past), the two empty fields now filled and
> proven watched, no new exceptions quietly added to the list, and the leftovers re-derived from
> scratch rather than copied from the ruling. Then it attacked anyway: **twenty-two more shapes of
> trip data no earlier test had built** — a city whose name folds to nothing, a door PIN in a place
> note, five cities sharing a name — and found **no crash, nothing looked at twice that isn't
> written down, and nothing crossing between people.** One small thing came back, and it is a
> documentation gap rather than a defect: the ruling's own list of *"things this check knowingly
> doesn't watch"* named the categories correctly but was **three items short**, all three being
> containers inside the *recipient's own* trip where nothing crosses. That is fixed in the ruling's
> prose, in place, with **no code change** — and the tester said in writing that it does not re-open
> the arc. **Status: built ✅, verified ✅ (round 21), and now shippable ✅** — see the manager's
> verdict below.

> **✅ THE MANAGER RULED: SHIP. Step 2a is done.** (`REVIEW.md`, "Phase 2, step 2a", reviewed at
> `67f5588`, 2026-08-28.) The manager did not take anyone's word for it: it re-ran the whole test
> suite (620, all passing), the type checker, the build, the golden files and **78** separate attack
> scripts, re-derived every headline number from scratch rather than quoting one, entered a
> *"Japan, March 2019 — 東京, 京都"* trip itself and got zero warnings and zero problems back, and
> re-proved two of the six closing checks on the copy-path arc by breaking the code on purpose and
> watching the right test go red. Everything 2a promised is built and works.
>
> **Seven follow-ups were routed and none of them blocks step 2b.** Four are housekeeping on the
> tester's own attack scripts — one of them had been quietly crashing half-way through for seven
> commits, which is exactly the kind of thing a gate exists to catch. Two are real but small, and are
> in *"What Jacob should know"* below: **undo behaves badly immediately after recording a very long
> past trip**, and **the app assumes every day of a recorded trip was in the first city you listed**
> (so "Tokyo, Kyoto" records 31 days in Tokyo and none in Kyoto) — the second is now a design
> question that must be settled *before* the lifetime map is built from that data. The seventh is the
> one thing the SHIP verdict deliberately did **not** unblock: **sharing, friends and public links
> stay blocked** until an architect rules on what should happen when someone hands you a trip file
> with no owner recorded in it.

> **Last updated:** 2026-08-28, against `master` after the **manager's 2a gate — verdict SHIP**. Step
> 2a (past trips and the trip lifecycle) is built, verified and **shipped**; step 2b (the lifetime
> map) is unblocked and next. Previously: QA round 21, the closure round — the builder landed A-25,
> the tester verified all six points of its written closing criterion, and the seven-round copy-path
> arc closed. Update this line every time you edit this file.

**Status vocabulary used throughout:** 🟢 COMPLETE · 🟡 IN PROGRESS · 🟠 NEXT / APPROVED ·
🔴 BLOCKED · ⚪ NOT STARTED. Also: **built** (code exists) vs **verified** (an adversarial tester
tried to break it and couldn't) vs **shippable** (a manager gate said SHIP). These are three
different claims — see "Definition of done" at the bottom.

---

## ⚠️ Decisions only Jacob can make

**Two now, neither blocking anything today.**

**1. NEW, from the 2a gate — what should happen to a trip file with no owner in it?** If someone
exports a trip and sends it to you, the app correctly refuses it: *"this belongs to someone else."*
But if that file happens to carry no owner at all, the app adopts the **whole thing** as yours — and
91 of the activities inside it stay quietly stamped with the other person's name underneath, with
nothing on screen saying so. Nothing leaks and nothing breaks; the problem is that the app would be
telling you a trip is yours when it isn't, which is the one rule you said is not negotiable.
**(a)** refuse anything that isn't provably yours, **(b)** accept it but visibly badge the whole trip
as imported from someone else, or **(c)** leave it until real accounts exist in Phase 3?
*All friend-sharing and public-link work is blocked until this is settled either way, so nothing is
waiting on you today.*

**2. Still unanswered from Phase 1 — do you want an "accept" control?** Today, copying an activity
from one of your trips into another leaves it permanently badged *"from a friend"* — there's no
button that says "yes, this is mine now." That's the safe default (nothing of someone else's is ever
shown as yours), but it's the kind of thing you'd notice the first time you used the feature. It's
cheap to add now; otherwise it ships with the Phase 3 accounts work. **Nobody is blocked waiting on
this** — it's a preference, not a gate.

---

## 📌 What Jacob should know about 2a, in plain terms

**What you can do now that you couldn't before.** Record trips you have already taken — title,
roughly-when, the cities, no day-by-day required — and the app treats them as *records* rather than
as itineraries that have expired. And your Europe trip has stopped nagging you: it ended on 22
August, and until now the app kept telling you, forever, that you were missing a hotel in Budapest
for nights you'd already slept through. That's gone. Your own two red flags for Aug 18 and Aug 20
are still there, which is exactly right — nothing of *yours* gets silenced.

**"Roughly when" is recorded honestly.** If you only remember *March 2019*, it stores March 2019 and
says so on screen. It does not quietly claim you were there from the 1st to the 31st.

**Two rough edges, both small, both now assigned rather than floating:**

- **Undo, straight after recording a past trip.** Record a whole *year* and then press Ctrl+Z and it
  peels the trip apart one day at a time — and you can't get all the way back. A month-long trip is
  fine, just fiddly. Found nine rounds ago, quietly never picked up; it now has a name on it.
- **Every day of a recorded trip is assumed to be in the first city you listed.** So *"Tokyo,
  Kyoto"* records 31 days in Tokyo and none in Kyoto. The form does tell you this before you press
  the button, which is the right instinct — but the **next** step is the map of everywhere you've
  been, and it will be built from exactly that data. So the architect has to settle, before that map
  exists, how the app tells the difference between *"I said I was in Kyoto"* and *"the app filled
  that in for me."* That's your own rule — never present our guess as your plan — applied one step
  ahead of where it would have bitten.

---

## 1. Where we are

**Phase:** 1 of **7** is 🟢 **COMPLETE — SHIPPED.** Phase 2 — *travel history*, not accounts (the
phases were re-cut on 2026-08-27; accounts are now Phase 3) — is 🟡 **IN PROGRESS**: step **2a of 3
is 🟢 SHIPPED** (increments I-0…I-4a) — built, then **verified** over ten adversarial rounds (12 →
21) ending with round 21 closing the copy-path arc against a criterion written in advance, then
**signed off by the manager on 2026-08-28 at `67f5588`, verdict SHIP** (`REVIEW.md`, "Phase 2, step
2a"). Step **2b** (the lifetime map and travel identity) is 🟢 **its data layer SHIPPED**: I-5
through I-7b — the country index, the widened summary row, `travelStats`, and the storage read
boundary (A-38, A-39) — are all **built ✅ · verified ✅ · shippable ✅**, signed off **2026-08-29 at
`6cd7187`, verdict SHIP** (`REVIEW.md`, "Phase 2, step 2b (data layer) — I-5 … I-7b"). **I-8 — the
Map and Profile screens, 2b's last increment — is not started; its UI is paused pending a new
native-iOS design process**, not blocked on anything technical. Step **2c** (participants) is
⚪ **NOT STARTED**.

**2b's first increment found a real gap, and it is the good kind of finding.** The builder was told
that two Croatian island stops (the Blue Cave on Biševo, Stiniva Cove on Vis) had to come out as
Croatia, and that if they didn't, the fix was a more detailed world map. He measured all three
available levels of detail and reported that the instruction was wrong: those two coves come out as
*"unknown"* at **every** level, and the more detailed maps make everything else **worse** — a nine
times larger dataset that fails to place Dubrovnik's Old Town. Rather than fudge it, he shipped the
best-measured version and sent the instruction back. Checking it found he was right, and found
something larger underneath: **the world map we ship contains 175 countries and is missing 64** —
Malta, the Maldives, Mauritius, the Seychelles, Macao, Hong Kong, Singapore, Bermuda, the Faroes and
55 more — with eight of them silently reported as their neighbour (a stop in Monaco came out as
France; one in Singapore came out as Malaysia). A trip diary that can never say *Malta* is broken for
exactly the kind of travel this is for, and no trip in the sample data could have shown it.
**The fix is scheduled as its own increment before anything is built on top:** keep the small,
forgiving world map as the base and add the detailed outline of just the 64 missing countries — about
double the file size, against 52× for the alternative — with a check that proves no existing answer
changes. **Two answers stay wrong on purpose and are written down rather than hidden:** Vatican City
comes out as Italy (the source dataset draws the Vatican as a 110-metre box in the wrong place, at
every level of detail), and about 700 m of French ground next to Monaco will come out as Monaco. And
the two island coves stay *"unknown"* — that is now the **correct** answer, because the boundary data
simply does not contain those islands at any resolution, and inventing a nearest-country guess is the
one thing this design refuses to do.

**Then the same mistake turned up one level down, found by the round that checked the fix.** The
completion pass adds the 64 missing countries at the *most detailed* level available — the level the same
investigation had already measured and rejected for everything else, because a highly detailed outline
hugs the waterline and a real coordinate on a harbour front falls just outside it. So we can now say
*Malta*, but a stop on the seafront in **Nuku'alofa, St John's, St George's or Diego Garcia** still comes
out as *"unknown"*. **And the obvious fix is worse.** Dropping those countries to the coarser outline was
measured and refused: at that level the **Maldives loses 175 of its 176 islands**, the Seychelles 24 of
26, French Polynesia 67 of 88. You would buy a capital city and pay with an archipelago — silently,
because neither a file-size check nor a world-grid check can see an atoll disappear. **So the ruling is
to stop choosing: a missing country now ships at both levels of detail at once** — the detailed outline
for its islands, the coarser one for its coastline — which combine to mean "either counts". It costs
**+7.8%** of the file, it fixes all four capitals, and it cannot make any existing answer worse, because
every outline we ship today is still shipped untouched and the change can only *add*. Two guards keep it
honest, both measured rather than asserted: a coarser outline is dropped if it does not sit on the
country it claims to be (which is what removes the Vatican's, drawn a kilometre west of the real thing),
and dropped if it would reach into a **neighbour's** ground (which removes Andorra's, Monaco's, San
Marino's, Liechtenstein's, Hong Kong's, Singapore's and Sint Maarten's). **One new cost is accepted in
writing:** around 54 island territories, a few kilometres of open sea will now come out as that island
rather than *"unknown"* — for a travel diary that is the useful direction to be wrong in, and it is the
same tolerance every answer on this map already carries.

**One number worth knowing, decided rather than deferred.** The world-boundary file is about a third of
what the browser downloads on first load, and nothing uses it yet — the map that will is two increments
away. It stays. Splitting it out would be undone almost immediately: the moment trips start recording
which countries they touched, the file is needed every time a trip is *saved*, not only when the map is
opened. It is capped by a test so it cannot creep, and on the phone app it is a file inside the app
rather than a download at all.

**What the 2a gate actually checked**, because "the manager said SHIP" is only worth something if it
means someone ran it: the full suite (620 tests, all passing), the type checker on both projects,
the production build, the golden-file regeneration (byte-identical), **78** attack scripts, the
command-line tool at three different dates, and a *"Japan, March 2019 — 東京, 京都"* trip entered by
hand end to end (two distinct cities, 31 days, **zero** warnings, **zero** problems). Every headline
number was re-derived from scratch rather than quoted, and two of the copy-path arc's six closing
checks were re-proved by deliberately breaking the code and confirming the right test went red.
**Seven follow-ups were routed; none blocks 2b.** The sharing/friends/public-link block is **not**
lifted — it now hangs on the ownerless-import question in *"Decisions only Jacob can make"* above.

**Where the effort has actually gone since Phase 1 shipped.** Not on 2b or 2c. Ten consecutive
adversarial rounds (12 → 21) have been spent on **two** increments — I-3a (a dismissed warning
staying dismissed) and I-4a (city identity, and everything the *copy* touches) — and the copy is
where eight of those rounds landed. That is deliberate, and it is written down as a rule rather
than a habit: **nothing about sharing with a friend, or any public share link, ships until the copy
path is closed**, because the copy is the one place in the whole design where your data crosses to
another person. **That arc has now ended, and it ended on a test rather than on a judgement call:**
round 19 planted twenty defects and the automatic check caught twenty, round 20 found the copying
code itself clean across twenty-two more data shapes and all 143 stops of the real trip, and round
21 confirmed — point by point, against six checks written down *before* it started — that the last
ruling landed. **I-4a's ship gate is met.** The share/friend/public-link block stays in place until
the manager's Phase-2a verdict, which is a scope rule rather than an open defect.

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
- **620 automated tests, all passing** (618 at the last update to this document; 615 the update
  before), re-run by the round-21 tester rather than taken from the builder's report, plus a wide stack of adversarial probe scripts under `cairn/qa/` built to actively try to
  break specific claims — a race condition, a database wipe mid-write, a symlink escape, a merge
  landing at the same instant as an edit.
- **A standing automatic check on the copy path** (`packages/core/test/readOnce.test.ts`, new since
  round 18) — it counts how many times the copying code looks at each piece of borrowed data and
  fails the build if anything is looked at twice without a written-down reason. It is the first
  thing in this project that catches a *class* of defect rather than a known one; round 19 proved it
  works by planting twenty and catching twenty, and round 20 confirmed the copying code itself is
  now clean across twenty-two more data shapes and all 143 stops of the real trip. Its own upkeep —
  the risk that the check quietly stops watching a newly added field — is now enforced by the
  compiler rather than by memory (A-25, built), and **round 21 verified all six points of the
  written closing criterion, so this arc is closed** rather than merely closeable.

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
| **2 — Travel history** | Record the trips you've already taken, see your whole travel life on one map, and say who you went with — a new Cairn doesn't start empty | 🟡 **IN PROGRESS** — 2a shipped; 2b's data layer (I-5…I-7b) shipped, its Map/Profile screens (I-8) paused pending design; 2c not started |
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
  Architect  →  Builder  →  Breaker  →  Manager  ⇒  I-8 (paused)
   (done)       (done)      (done, r32)  (done — SHIP, 6cd7187)   (design first)
```

**Step 2a is closed, and so is step 2b's data layer.** The four-agent chain ran through I-7b, and
`REVIEW.md`'s `6cd7187` entry records SHIP for I-5 … I-7b. What's left in 2b is **I-8 — the Map and
Profile screens** — and it is deliberately **paused** for a native-iOS visual-direction pass rather
than blocked on any open technical item. The numbered list below is the plan **as it stood when 2a
closed**, kept as the running log rather than rewritten or re-verified item by item here — item 5
(the world-boundary dataset's missing countries) shipped as I-5a/I-5b/I-5c. **`QA-FINDINGS.md`'s own
status note is the authoritative list of what is still open**, and as of round 32 it still names
item 1 (the breaker board, `B-1`…`B-4` there) and item 4 (the past-trip undo defect, `P2-5`) as
untouched — read that note rather than this historical list for current standing.

How 2a's last round went, for the record:

- **Architect — done.** `ARCHITECTURE.md` revision 19 (**A-25**): test-data completeness enforced by
  the compiler and the tests instead of by memory, one one-line fix for the three-same-name-cities
  case, city records added to what the check watches, a fifteenth test situation, and a **closing
  criterion** for the whole seven-round arc.
- **Builder — done.** One pass, in the ruling's fixed order, landed on `master`. Both two-sided
  demonstrations reproduced: back the one-line fix out and the check goes red naming exactly the
  right thing; invent a new field and the build refuses to go green until the test data fills it in.
- **Breaker — done (round 21).** Attacked against the six-point criterion rather than open-endedly:
  **all six hold**, every one re-run from the code. Then twenty-two fresh data shapes on top of
  that — no crash, no unexplained second look at borrowed data, nothing crossing between people.
  One MINOR finding, a three-item gap in the ruling's own disclosure list, corrected in prose with
  no code change and explicitly **not** a re-opening.
- **Manager — done, 2026-08-28 at `67f5588`: verdict SHIP.** Re-ran the suite, the type checker, the
  build, the golden files and 78 attack scripts; re-derived every number rather than quoting one;
  entered a past trip by hand end to end; and re-proved two of the arc's six closing checks by
  breaking the code on purpose. **Seven follow-ups routed, none blocking.** The block on
  sharing/friends/public links is **not** lifted — it now hangs on one design question about
  importing a trip file with no owner (see *"Decisions only Jacob can make"* at the top).

**What 2b starts with, in order:**

1. **Breaker, before its first round on 2b:** clean the attack board and re-run **all** of it, not
   just the files in scope. The 2a gate found one script (`qa/r11-recheck.mjs`) that had been
   crashing half-way through for seven commits, losing nine of its checks with no status note
   mentioning it, plus three stale ceilings. **New standing rule:** the whole board runs at every
   step boundary, and its state gets recorded.
2. **Architect, before the lifetime map is built:** rule on how the app distinguishes a place *you*
   said you went from one *the form filled in for you* — and on why a trip typed in from memory
   currently records at the same certainty as one with a booking confirmation behind it. Both feed
   the map directly.
3. **Architect, before any sharing work:** the ownerless-import question above.
4. **Builder, in 2b's first pass:** the undo-after-recording-a-long-past-trip defect.
5. **Builder, before the map screen is built:** complete the world-boundary dataset — the 64 missing
   countries described above. Done now it costs one increment; done after the map exists it costs the
   same increment plus re-computing every trip summary already written.

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
