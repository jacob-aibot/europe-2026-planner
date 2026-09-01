# QA reproduction scripts

The scripts behind `cairn/docs/QA-FINDINGS.md`. They are **not** part of the product and are
not run by `npm test`. Each one is a standalone probe; run it from this directory.

```bash
cd cairn/qa
node accept.mjs        # every ROADMAP Phase 1 acceptance number, re-derived independently
node attack1.mjs       # zero-day / inverted / impossible-calendar trips; immutability; displayStatus matrix
node attack2.mjs       # validateTrip density, geo typos, out-of-range coords, pool round trip
node attack3.mjs       # geo_outlier scope; conflict ids under an Aug 18 edit
node attack5.mjs       # F-5: the Fisherman's Bastion typo vs geo_outlier / validateTrip coverage
node attack6.mjs       # legacy -> core coordinate parity for scheduled and pool stops
node attack7.mjs       # F-12: malformed / hostile documents, prototype pollution, unicode round trip
node attack8.mjs       # F-7: updateStop patch escape; rollUpCost target
node access.mjs        # the full 12-principal x 5-operation access matrix (F-13)
node client1.mjs       # F-2 (headless), ui leakage, undo/redo depth, save failure, quota
node confid.mjs        # F-9: the Aug 18 conflict-id criterion
node confid2.mjs       # F-10: dismissed-conflict resurrection, resolutions growth
node probe1.mjs        # F-4: the 12 blockers, listed
node prov.mjs          # F-6, F-7, F-17: provenance escape paths
node rev.mjs           # revision bumping and derived-cache keying
node rules.mjs         # F-8 and the rules that stay silent on the fixture
node --experimental-strip-types r18-readonce.mjs   # A-21/A-21a: the read-once census (round 18)
node --experimental-strip-types r21-closure.mjs    # A-25 Part 6's six closure clauses (round 21)
bash r21-clause3.sh                                # clause 3's four-step mutation, in a throwaway worktree
```

I-8a (the world map, the tab shell, the token layer, and the signal-collision fix) has two
scripts of its own — a rendered-output probe and the injected-fault battery behind its ship gate:

```bash
# needs npm run web:build && npm run serve in another shell
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8a-signals.mjs   # 8 sections, rendered output
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers bash qa/i8a-faults.sh     # 10 injected faults, all RED
```

`i8a-faults.sh` needs no server of its own: it builds and serves each mutated copy on port 4184
(override with `I8A_FAULT_PORT`) and refuses to run if that port is already answering.

I-8c (§2.9 **A-45**, §8.4 **A-44**, **BLD-3**) has one script, for the two of its four criteria
that are about rendered output — the other two (the parser's refusals, and `store.importDoc`) are
covered in plain Node by `packages/core/test/serialize.test.ts` and need no browser:

```bash
# needs npm run web:build && npm run serve in another shell
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8c-render.mjs   # 3 sections; ALL CLEAR or exit 1
```

Its §A is **R33-3 turned around**: the same planted shape-invalid row that took the Trips tab
down now costs one row and one chip. §A2 exists because §A cannot exercise the Map drill-down —
a library containing such a row makes `travelStats` refuse wholesale, so there is no country to
click; that is pre-existing and correct (§8.4 A-31 Part 4), and it is recorded rather than
asserted away. §B forces a render failure from *outside* the app's state (an armed
`Array.prototype.join`) so that "the cause is gone" and "the banner cleared" stay two facts.

**Round 34** is the adversarial pass over the same increment. Three probes, run from `cairn/`:

```bash
node qa/r34-a45.mjs    # A-45: all 5 date sites, leap/domain edges, importDoc, A-32 non-regression
node qa/r34-a44.mjs    # A-44: rowLifecycle parity + null set; the view greps; I-8c criterion 3
# with `npm run web:build && npm run serve` in another shell:
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r34-render.mjs
```

`r34-render.mjs` has nine sections: **A** BLD-3's *"Close this trip"* branch (the one BUILD-NOTES
did not drive — it fails, with a root-cause drill printed inline), **B** *"Try again"* with a
document open, **C** dark mode contrast for the unreadable chip and the error banner, **D**
reduced motion at 360 px, **E** `TripView`'s own chip, **F** A-45's residue in the real app
(a stored document rewritten to `2026-02-30`), **G** what the rest of an unreadable card says,
**H** the New trip form's shape-only regex, **I** that *"Reload Cairn"* really reloads.
A `FAIL` line is the finding: `r34-a45.mjs` reports 9 (R34-3, R34-2) and `r34-render.mjs`
reports 8 (R34-1, R34-2, R34-4). `r34-a44.mjs` is ALL CLEAR by design — R34-5 and R34-8 are
`note` lines there, because both are facts about the design rather than broken expectations.
Read `../docs/QA-FINDINGS.md`'s round-34 note before assuming any of the three is broken.

**After I-8e, `r34-render.mjs` reports 5, not 8, and none of the five is a live defect.** The
two §A failures are gone — that was R34-1 and it is fixed. What remains, and why each is
expected rather than owed:

- **§F, 2 failures.** §F rewrites the stored **document**'s `startDate` and leaves the summary
  **row** alone, so the two records disagree — a state no shipped write path produces
  (`core.tripSummary` copies `trip.startDate` straight into the row). A-46's predicate is
  `rowDatesReadable(row)` **by signature**, so it reads the row and cannot see a doc-only fault;
  A-46 Part 3 states that incompleteness in as many words (*"a row can be readable while its
  document is not; only opening it finds that"*). `i8e-render.mjs` §B plants **both** records —
  which is what a pre-A-45 build actually wrote — and the card is flagged and the copy saved;
  §B2 plants §F's doc-only version deliberately and asserts the unflagged card **plus** the
  refusal-with-a-path on tap. §F's third failure (*"a sentence, not a raw parser path"*) now
  passes.
- **§G, 3 failures.** §G asserts the card's range line matches `/^(—|not recorded|unknown|dates
  could not)/i` — the breaker's guess at the fix, written before the ruling. §2.9 **A-46** Part 3
  clause 2 ruled the opposite: print the two stored strings **verbatim**, joined, with no
  month-name lookup and no `datePrecision` branch, because *"the fix is to show the user the two
  strings that are actually in their file."* `not-a-date → 2019-05-08` is the ruled behaviour.
  §G's expectation is superseded, not unmet.

Neither file was edited to make it green; the round-34 probes are the record of what round 34
measured.

**I-8e** (§2.9 **A-46**, plus R34-1's ordering fix) has one script, `i8e-render.mjs`:

```bash
# needs npm run web:build && npm run serve in another shell
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8e-render.mjs   # 8 sections; ALL CLEAR or exit 1
```

**A** R34-1 — *"Close this trip"* recovers in **one** click with the fault still armed, and
*"Try again"* still re-raises with the cause present and clears without it; **B** R34-2's
population on rendered output (both records planted); **B1** R34-4 at **month/year** precision,
which is the only place the old label was both plausible and false (*"February 2026"* for
`2026-02-30`); **B2** the stated incompleteness, asserted rather than hidden; **C** the rescue
export through a **real download** — byte equality against the stored bytes, raw-JSON parseable,
`core.fromJSON` still refusing, `.cairn-unreadable.json`; **D** a healthy library claims nothing;
**E** the warn chip's contrast in both schemes (R34-7); **F** Delete's confirmation on both row
kinds; **G** I-8c criterion 3a and 3b, confirmed rather than changed.

The injected faults each measure red, and are recorded here so nobody re-derives them: the
`rowLifecycle(...) === null` predicate → §B and §B1 (`unreadable` back to 0, and the meta line
back to *"February 2026"*); the pre-fix `recovery.run(); this.setState(...)` ordering → §A
(banner up, `cards=0` — round 34 exactly); `LifecycleChip` calling `core.lifecycle` → §G's 3a
(0 cards, tab down) and **not** 3b, which is A-46 Part 5's point. Two more are plain-Node:
inlining a calendar in `rowDatesReadable` → `packages/client/test/row-dates-readable.test.ts`
(three ways: totality, the differential against `core.isIsoDate`, and the source grep); routing
the export through `fromJSON`/`toJSON` → 8 of 9 in `packages/client/test/export-stored-doc.test.ts`.

**Round 35** is the adversarial pass over I-8e. Two probes, run from `cairn/`:

```bash
node --experimental-strip-types qa/r35-store.mjs   # exportStoredDoc + rowDatesReadable, bare Node
# with `npm run web:build && npm run serve` in another shell:
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r35-render.mjs
```

`r35-render.mjs` has five sections: **A** the population A-46 leaves without a rescue — a
document whose summary **row** is readable but whose `days[n].date` is not, which is what a
pre-A-45 `store.importDoc` actually wrote (**R35-1**); **B** the unreadable card at 360 px and
in dark mode; **C** contrast of the new *"Save a copy"* control and its hint line in both
schemes (**R35-2**); **D** the export as a side effect — double-fire, a hostile title in the
filename, a row with no stored document; **E** `--warn`'s other two consumers, measured rather
than read off the hex (R34-7 confirmed at 5.87:1).

`r35-store.mjs` has five sections: **A** staleness (**R35-5** — the export returns superseded
bytes for a document with a pending debounced write; not reachable from today's UI); **B**
per-trip identity and the deliberate absence of an ownership check, with `importDoc`'s refusal
asserted as the invariant that makes it safe; **C** failure modes (storage throwing, `FilePort`
throwing, an unknown id, a non-string id); **D** `rowDatesReadable` totality over twelve
hostile row shapes plus the containment claim; **E** R35-1 at the client layer — the store
rescues that document byte-perfectly, so the gap is entirely in what the surface offers.

`r35-render.mjs` reports **7 FAIL(S)**: 4 × R35-1 (§A), 2 × R35-2 (§C), and one §D line
(*"no markup survives into the filename"*) that is **not** a finding — `<script>` slugs to
`-script-`, a surviving word rather than a surviving construct, and §D's other three
assertions prove the filename carries no separator, no traversal and no extension injection.
`r35-store.mjs` reports **1 FAIL**, R35-5, deliberately: the behaviour is A-46 Part 4's own
choice and the assertion is the record of what that choice costs.

**I-8d** (§4.4 **A-41**, the atlas frame, and **A-42**) has three scripts. *They shipped at
`6814f73` and were never indexed here — round 36 added this block; if you looked for them in
this file before then, they were not missing, they were unlisted.*

```bash
node qa/i8d-frame.mjs                                    # the shipped sample's panes, bare Node
bash qa/i8d-faults.sh                                    # 13 mutations in throwaway worktrees
# needs npm run web:build && npm run serve in another shell
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8d-render.mjs   # 4 sections; ALL CLEAR or exit 1
```

**Round 36** is the adversarial pass over I-8d. Two probes, run from `cairn/`:

```bash
node qa/r36-atlas.mjs                                    # A-41 clause by clause, over all 239 codes
# with `npm run web:build && npm run serve` in another shell:
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r36-render.mjs
```

`r36-atlas.mjs` has eight sections: **A** C2's key point swept over every code, with the
displacement from the country it names (**R36-1**); **B** C3/C4 — the partition is genuinely
first-fit, and what that costs on real neighbours (**R36-2**), plus the threshold's real
margin re-measured over all 28,441 pairs (**R36-3**); **C** C5 at the exact integer boundary in
both directions, including the weight-vs-trips conflation (**R36-4**); **D** C6's three ranking
keys, one observable test each; **E** C7 and I1–I7 at 1, 2, 3, 5 and 239 countries, plus
hostile input; **F** Part 4 / A-42 (b) containment swept over all 239 single-country libraries
with the reference `viewBox`es re-derived byte-for-byte; **G** Part 6's one kernel, with a
2,000-case differential against the pre-extraction loop; **H** W1/W2/W3, Part 7's do-not-build
list and A-42 (c). It exits **0 FAIL** — every clause of A-41 holds *as implemented*; the
findings are its **FOUND** lines, which are cases where the ruling is what is wrong.

**I-8g** (§4.4 **A-48** — C2′'s key point, C3′'s partition, C9's paint order, Part 6's `aspect`)
adds one script and **re-points both round-36 probes at the rule that replaced the one they were
written against**. The two round-36 MAJORs were defects in A-41 itself, so the assertions that
encoded the superseded clauses now encode the corrected ones, each marked `[I-8g]` in place, with
the superseded rule kept beside it as the injected fault's oracle (§A still computes C2's
union-box keys; §B still runs a first-fit reference). Both now report **0 FAIL, 0 FOUND**.

```bash
bash qa/i8g-faults.sh                                    # 14 mutations in throwaway worktrees
```

Three of `i8d-faults.sh`'s thirteen mutations were re-pointed at the lines A-48 replaced (marked
`[I-8g]` there); all thirteen are still RED. The two browser-side I-8g criteria — the main pane
filling ≥75% of its box (R36-5) and dark mode clearing 3:1 (R36-6) — have their faults injected by
hand against `r36-render.mjs` §A/§C, because they need a rebuild; the measurements are in
BUILD-NOTES.

`r36-render.mjs` has six sections: **A** dark mode on the new inset and its caption, the two
things the builder could not verify (**R36-6**); **B** reduced motion, with a control;
**C** 390 px, where the builder's own "observation 2" is measured (**R36-5**); **D** three
panes on screen for the first time, from a planted five-cluster library, with A-42 (b)
re-asserted on pane 3 from the browser's own `getBBox()`; **E** the shipped sample's
containment cross-checked in Chromium against the bare-Node numbers; **F** A-41 constraint 1's
*"still tappable"*, tested by sampling every country's own filled interior (**R36-7**).

**Round 37** is the adversarial pass over I-8g. Two probes, written from A-48 and the shipped
source rather than by re-pointing an existing one — the builder re-pointed round 36's two probes
at the rule that replaced the one they were written against, so a round that leaned on them would
be grading the builder's own homework. Run from `cairn/`:

```bash
node qa/r37-a48.mjs                                  # A-48 clause by clause, second implementations
# with `npm run web:build && npm run serve` in another shell:
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r37-render.mjs
```

`r37-a48.mjs` has ten sections and re-derives every quantity with a **second implementation**:
a Lambert equal-area shoelace beside A-48's spherical formula, an independent point-in-polygon,
a BFS connected-components reference, and a first-fit reference. **A** `countryKeyPoint` over all
239 codes; **B** its edge cases — a bit-identical area tie in both orders, the union-box fallback,
zero/2-point/3-point/odd-length rings, hostile input; **C** I9 across **288,000** partitions
(400 six-point sets × all 720 orderings, every 3-subset of 24 codes × 6, every 4-subset of 12 × 24,
plus 500 triples binary-searched onto the exact 4,000 km threshold), and `haversine`'s bit-exact
symmetry, which is what I9 rests on; **D** the day map on the real fixture at 90 and 60 km;
**E** `pane.aspect` re-derived from the emitted `viewBox`, and R33-1's pinned strings;
**F** C9/I10 in bare geometry; **G** KD-70 with the ocean fraction measured; **H** KD-69;
**I** cost; **J** the shipped source's comments against the ruling they cite.

`r37-render.mjs` has five sections, all of them things the builder measured at one viewport and
one library: **A** the aspect fix at five viewports; **B** across library shapes (a tall pane, a
very wide pane, a four-country library); **C** KD-70 rendered, with `elementFromPoint` sampling
the pane and every country's rendered bbox in css px; **D** the chip list's order in the DOM;
**E** the dark `--map-fill` against every surface the map is drawn over, including the legend
swatch's own background.

`r37-a48.mjs` reported **3 FAIL**, all of them **R37-2** (§J). `r37-render.mjs` reported **ALL
CLEAR**: R37-1, R37-3 and R37-4 were `NOTE` lines there, because each is a measurement whose
interpretation is the finding rather than a broken expectation. Read `../docs/QA-FINDINGS.md`'s
round-37 note before assuming either is broken.

**I-8h** (§4.4 **A-49** — a country's geometry is its *parts*, C8′'s extent, C8″'s `detached`
pane, C7′'s cap, Part 5's `frame.codes` — and **A-50**, the pane box in both directions) adds two
scripts and **re-points six probes at the rule that replaced the one they were written against**.
Round 37's MAJOR was a defect in A-48 itself, so the assertions that encoded the superseded clause
now encode the corrected one, each marked `[I-8h]` in place, with the superseded rule kept beside
it as the injected fault's oracle — `r36-atlas.mjs` §B4 still computes A-48 C8's union-box extent
and still measures **81.13°**; `r37-render.mjs` §B still lists the 50 codes that letterboxed under
the static clamp; `r37-a48.mjs` §H still shows the paint list's order and its duplicate row.
`r36-atlas.mjs`, `r36-render.mjs`, `r37-a48.mjs`, `r37-render.mjs` and `i8g-render.mjs` all report
clean, and four of `i8g-faults.sh`'s fourteen mutations were re-pointed at lines A-49 rewrote (all
fourteen still RED). `i8d-faults.sh` is untouched and still 13 of 13 RED.

```bash
bash qa/i8h-faults.sh                                    # 15 mutations in throwaway worktrees
# with `npm run web:build && npm run serve` in another shell:
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8h-render.mjs
```

`i8h-render.mjs` has four sections: **A** A-50's symmetric no-letterboxing criterion over every
pane of all **239** single-country libraries at **390 × 820 and 1440 × 700** — the method is
stated in the probe's own header, because it is not one page load per library: the box rule is a
pure function of `--pane-aspect`, `--pane-cap` and the available width, so the sweep sets the real
custom property on the real `<svg>` and reads the real computed layout back; **B** six real
libraries driven end to end at both viewports, which is what checks §A's premise against the app;
**C** the `detached` pane on screen — last, its own class, captioned *"Distant parts of"* rather
than *"Shown separately"*, tappable, and both of a twice-drawn country's paths carrying the
identical attribution; **D** one chip per country on a library that draws one twice, with React's
duplicate-key warning asserted absent.

**One of A-49's own named injected faults cannot be red** — *"rank parts by summed area … and `US`
mismatches"* — and `i8h-faults.sh`'s header says so rather than faking it; a substitute that is
red is fault 3, and the vacuity is a test in `packages/core/test/countryParts.test.ts`. See
**KD-71** in `../docs/BUILD-NOTES.md`. **Round 38 measured that vacuity claim as too wide** — it
holds at the five thresholds A-49 I12 names and fails at seven others (`ID`@900 km is the sharpest,
two parts 2,481 km apart), so A-49's own fault *is* red, just not on `US` and not at 4,000 km.
**R38-1.** A-50's browser-side fault (restore `width: 100%` with the static `max-height`) needs a
rebuild, so it is injected by hand against `i8h-render.mjs`; it measures **9 FAIL** and the numbers
are in BUILD-NOTES.

## Round 38 (2026-09-01, `master` @ `dea2c67`) — the I-8h / A-49 / A-50 breaker pass

Two scripts, both written from A-49, A-50 and the shipped source rather than by re-pointing the
builder's `i8h-*` probes — this is the **third** independent round on this area, so every quantity
is re-derived from a second implementation in the probe itself: my own haversine, my own spherical
ring area (Lambert cylindrical equal-area shoelace), my own connected components (BFS), my own
`mapBounds`+padding, and a **complete second `worldMapFrame`** written straight off C1…C9/P/C8′/C8″
and compared to the shipped one string for string.

```bash
node qa/r38-a49.mjs                                      # A-49 clause by clause, second implementations
# with `npm run web:build && npm run serve` in another shell:
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r38-render.mjs
```

`r38-a49.mjs` has thirteen sections: **A** the index census (KD-73's ring claim); **B** KD-71 swept
over **32** thresholds with both area formulas; **C** I12 over 8 thresholds / 1,912 comparisons;
**D** the headline extents, each rebuilt by my own frame; **E** Alaska, with the part-graph edge
lengths and with **every ISO code in the index permuted** so "nothing reads a code" is tested and
not read; **F** KD-72's component counts; **G** I1/I2/I3/I5/I11/I13/I14/I15 over **643** libraries;
**H** I6 under every row permutation; **I** KD-73 on a fixture that actually carries a degenerate
ring; **J** the residual R37-1 shape and its census; **K0/K** cost, against `09f7ce4` on the same
run; **L** the standing constraints; **M** degenerate inputs.

`r38-render.mjs` has seven sections, all **real page loads** — it does not use the builder's
`--pane-aspect` shortcut: **A** the four-pane layout at four viewports with screenshots (BUILD-NOTES
says this was never looked at); **B** A-50 over 14 libraries × 4 viewports = **92 panes**, two of
the viewports ones the builder never used; **C** browser `viewBox` vs bare Node; **D** `UM`'s
344°-wide main pane and its 0.028° detached speck; **E** reachability on the four-pane library;
**F** the pane **cell** rather than the `<svg>` (**R38-3**); **G** a detached part's rendered size
(**R38-4**). Screenshots land in `/tmp/cairn-r38/`.

`r38-a49.mjs` reported **4 FAIL** at `dea2c67` — three were **R38-1**, one was **R38-2**'s census.
`r38-render.mjs` reported **2 FAIL** — **R38-3** and **R38-4**. **All six are fixed at I-8i**, so
both scripts now report clean; see the I-8i entry below for which assertions flipped and which are
marked `SUPER`. Read `../docs/QA-FINDINGS.md`'s round-38 note before assuming either is broken.

## I-8i (2026-09-01) — A-51 / A-52 / A-53: one pane per geographic cluster

`worldMapFrame`'s framing model was reopened rather than patched a fifth time, so this increment
touches **every** world-map probe in this directory. Two new files, and eight re-pointed.

```bash
bash qa/i8i-faults.sh                                    # 16 mutations in throwaway worktrees
# with `npm run web:build && npm run serve` in another shell:
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8i-render.mjs
```

`i8i-faults.sh` is the successor to `i8d-faults.sh`/`i8g-faults.sh`/`i8h-faults.sh` for this area.
Its 16 mutations cover **A-51**: C5 restored (1), every component folded into one pane (2), the
zero-weight components dropped (3), **A-53 I18** — order by canonical position and an `FR`-only
library opens on French Guiana (4) — `weight` summed over `codes` rather than `home` (5), the
extent-pane rule keyed on *"holds a non-principal part"* so `FR DE IT JP PE` misclassifies (6),
**A-52**'s `ring.length >= 6` filter restored (7), the *"Distant parts of"* caption dropped (8),
flex instead of grid (9), the two role-keyed caps restored (10), `role` restored (11), a second
geometric input at the population loop (12), the partition over country key points instead of
parts (13), the canonical part list built in paint order (14), `countryKeyPoint` dropped from the
export surface now that it has no production caller (15), and a second `clusterPoints` call inside
the pane loop (16). **All 16 measure red.**

`i8i-render.mjs` has five sections, all real page loads: **A** R38-3's criterion on the bordered
**cell** at 390 × 820 and 1440 × 700 over the reference sample, a four-pane library and all 239
single-country libraries; **B** the three libraries Jacob asked the breaker to re-attack — `FR`
alone (I18's sharpest case), `FR`+`US`, and the 239-code ceiling; **C** A-53 on screen (the caption
is the disclosure, and no pane ever says *"shown separately"*); **D** nothing is hidden — every
pane is in the document with a non-zero box, every code is tappable and chipped; **E** R38-2's four
libraries as the pixel numbers the ROADMAP pins. It reports **ALL CLEAR / 121 ok**.

**Re-pointed, with each superseded assertion named rather than deleted.** `r36-atlas.mjs` reports
**0 FAIL · 11 SUPERSEDED**, `r38-a49.mjs` **ALL CLEAR · 8 SUPERSEDED** (its §B and §I flip — R38-1
and R38-5 are fixed — and its §J census, R38-2's own oracle, flips and gains A-51's replacement
histogram); `r37-a48.mjs`, `i8g-faults.sh`, `i8d-faults.sh` (2 RETIRED), `i8h-faults.sh`
(4 RETIRED), `i8d-render.mjs`, `i8g-render.mjs`, `i8h-render.mjs`, `r36-render.mjs` and
`r38-render.mjs` all report clean. A `SUPER`/`RETIRED` line is an assertion whose *clause* A-51
withdrew: it is printed with the ruling that withdrew it and with what the same fixture measures
now, so the record of what the old rule guaranteed survives without pretending the product is
broken.

Browser probes need `npm run web:build && npm run serve` in one shell first, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node browser2.mjs   # badges, spine, Aug 8 map
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node browser3.mjs   # map refit, corrupt document
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node browser4.mjs   # F-2 in a real browser, two tabs
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node browser5.mjs   # F-1 two tabs, one trip; zero-day trip
```

A "FAIL" line in this directory means the probe found what it was looking for. Read the
finding in `../docs/QA-FINDINGS.md` before assuming a script is broken.

---

## Round 2 (2026-08-25, `master` @ `fcceb56`)

Written against the re-delivery. `cairn/docs/QA-FINDINGS.md` names the finding each one
backs. Headless probes run from `cairn/`:

```bash
node qa/r2-copy.mjs         # copyStopInto: every provenance escape path; credentials in notes (R2-3)
node qa/r2-copy2.mjs        # the copy through the client store: undo/redo, Place copy, browse read-only
node qa/r2-import.mjs       # importDoc F-2/F-6 re-check; storage failure, quota, corrupt documents
node qa/r2-resolutions.mjs  # R2-7: syncResolutions has no caller, so a dismissal still resurrects
node qa/r2-access.mjs       # R2-6: F-13 re-check, and the share's own dates failing open
node qa/r2-data.mjs         # real-trip shapes; travelRole x geoCheck x copy interactions (R2-9)
node qa/r2-constraints.mjs  # cairn-constraints: determinism, DOM, zero-dep, coordinates in params
node qa/r2-redact.mjs       # R2-4: the credential set derived from the trip, greped against dist/
```

`r2-redact.mjs` needs `npm run web:build` first. Browser probes need
`npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-browser.mjs    # Browse & copy, badges, credit line
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-poolloss.mjs   # R2-2: a pooled transit stop vanishes
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-tabs.mjs       # the revision guard's sequential case
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-race.mjs       # R2-1: two tabs at once, an edit lost
```

`r2-race.mjs` is timing-dependent by nature: it lost an edit in 2 of 3 rounds when filed.

---

## Round 3 (2026-08-26, `master` @ `a746d75`)

Re-verification of the R2-1 / R2-2 fix. `cairn/docs/QA-FINDINGS.md` names the finding each one
backs. Headless probes run from `cairn/`:

```bash
node qa/r3-cas.mjs      # the atomic saveIfRevision: 3-way race, self-race, in-flight trip switch,
                        # storage failure mid-chain, ABA, corrupt records, rapid-fire dispatches
node qa/r3-cas2.mjs     # R3-4/R3-5/R3-8/R3-9 — ABA in a user-shaped sequence, corrupt records x6,
                        # the catch-all's double render, the transcribed save indicator
node qa/r3-undo.mjs     # R3-1 (BLOCKER) — undo lowers the stored revision and reopens R2-1
node qa/r3-loss.mjs     # R3-2 (BLOCKER) — the 400 ms debounce vs closeTrip / openTrip
node qa/r3-merge.mjs    # R3-3 — mergeWithStored assigns `saving` instead of chaining onto it
node qa/r3-pool.mjs     # R2-2's fix: poolCityFor, pool_stop_unknown_city, the catch-all round trip
```

Browser probes need `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-browser.mjs   # R3-1 and R3-2 in real IndexedDB
```

`r3-browser.mjs` is **not** timing-dependent: both cases are deterministic sequences, not races.
R2-6, R2-11 and R2-18 were re-confirmed with the unmodified round-2 scripts (`r2-access.mjs`,
`r2-copy.mjs`, `r2-constraints.mjs`) and are unchanged by `a746d75`.

Note: `r3-pool.mjs` was corrected in this round — it was calling `addStop(trip, dayId, …)` and
`setDayMeta(trip, id, patch, ctx)`, and the real signatures are `addStop(trip, placement, init,
ctx)` and `setDayMeta(trip, id, patch)`. It aborted at section 2 before the fix.

---

## Round 4 (2026-08-26, `master` @ `3a124a2`) — the phase-gate re-verification

Written against the §2.2a `StorageVersion` / flush-before-switch delivery. Headless probes
run from `cairn/`:

```bash
node qa/r4-switch.mjs   # R4-1 (BLOCKER) §1-3; 3 and 4 concurrent tabs; a trip deleted under
                        # another tab; mergeWithStored vs a switch; importDoc onto a live id;
                        # §10 falsifies ARCHITECTURE §2.2a rule 1's "equal revision implies
                        # identical content" in six lines
```

Browser probes need `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-browser.mjs  # R4-1 in real IndexedDB, and
                                                                  # the visibilitychange/pagehide
                                                                  # leg BUILD-NOTES §6 never ran
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-epoch.mjs    # R4-2 (BLOCKER) — a token from
                                                                  # a destroyed database accepted
                                                                  # by its replacement
```

Neither is timing-dependent: both are deterministic sequences, not races. `r4-browser.mjs` §1
does depend on the second edit landing inside the 400 ms debounce that follows the undo, which
is why it uses `DayTimeline`'s ↑/↓ reorder button (one click, one dispatch) rather than the
rename dialog.

R3-3, R2-6, R2-11 and R2-18 were re-confirmed with the unmodified scripts (`r3-merge.mjs`,
`r2-access.mjs`, `r2-copy.mjs`, `r2-constraints.mjs`) and are unchanged by `3a124a2`.
`r3-cas2.mjs` probe **3** now passes — R3-5 is closed as a side effect of the fence redesign,
which the builder's report did not claim.

---

## Round 5 (2026-08-26, `master` @ `c3c79b3`) — verification of the §2.2b freshness rule

Written against the R4-1 / R4-2 / R2-11 delivery. Headless probe runs from `cairn/`:

```bash
node qa/r5-freshness.mjs   # §1 the dirty oracle over mergeWithStored / createTrip / importDoc /
                           #    deleteTrip / syncResolutions — the transitions dirty.test.ts's
                           #    200-step walk never visits
                           # §2 every way to fool flushForTransition's three-conjunct skip,
                           #    including R5-3 (the not-dirty 'conflict' trap)
                           # §3 the token mint: 200 port instances, 300k CSPRNG mints, opacity,
                           #    and the no-token-literal ceiling
                           # §4 the derived cache's (doc identity, today) key
                           # §5 the R2-11 ruling — requireActor, accepted_by_non_member, and
                           #    R5-2's null / undefined / '' actor (the classification finding)
                           # §6 R5-1 (BLOCKER) — an edit dispatched during a transition's own
                           #    flush, across all six transitions by name
```

Browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r5-browser.mjs   # R5-1 through the shipped UI
```

`r5-browser.mjs` is **not** a race in the flaky sense — it sweeps the delay between the "Cairn"
click and the ↓ click across 0/1/2/4/8 ms and reproduced at all five when filed. It is timing-
*shaped* by nature (the window is the length of one real IndexedDB write), so `r5-freshness.mjs`
§6 is the deterministic form and is what a fix should be verified against first.

R4-1 and R4-2 were re-verified with the unmodified `qa/r4-browser.mjs` (4/4 ok) and
`qa/r4-epoch.mjs` (6/6 ok). R3-3, R3-6…R3-9, R2-6, R2-7, R2-9, R2-11 and R2-18 were re-run with
the unmodified round-2/3 scripts and are unchanged by `c3c79b3`.

**Two round-2 probes no longer run at all** and were left alone rather than quietly repaired:
`qa/r2-copy2.mjs:86` and `qa/r2-import.mjs:51` both do `JSON.parse(await storage.load(id))`, and
`StoragePort.load()` has returned `{doc, version}` since `3a124a2` (ARCHITECTURE §2.2a rule 4).
They have not executed since round 2; anyone re-running them needs `.doc` first.

---

## Round 6 (2026-08-26, `master` @ `5f92145`)

Independent verification of the R5-1 / R5-2 / R5-5 fix pass. Headless, from `cairn/`:

```bash
node qa/r6-flush.mjs   # the R5-1 drain loop, attacked: mid-flush edits on the same and on
                       # another trip, the bound exhausted with a REAL scheduler, a refusal
                       # arriving mid-loop, all six transitions propagating false, R3-3 x the
                       # loop, deleteTrip(active) racing a parked flush
node qa/r6-actor.mjs   # accepted_by_non_member over ten actor shapes x four ref kinds, the
                       # §2.14 exemptions, the reference-trip ceiling re-derived, and R5-5's
                       # export surface
```

Both are **oracles, not confirmations**: against the pre-fix code (`flushForTransition` reverted
to `d97feed`'s single pass, `if (!actor || …)` restored, `accept`/`reject` re-exported, all in a
scratch copy) they report 12 FAIL and 17 FAIL respectively, versus 3 and 5 at `5f92145`. The
FAILs that remain at `5f92145` are R6-1/R6-2 (`r6-flush.mjs` §3), R3-3's static probe
(`r6-flush.mjs` §6, a known-open finding restated) and `r6-actor.mjs`'s params-fidelity note on
non-string actors, which is an observation rather than a filed defect — see QA-FINDINGS round 6.

`qa/r5-freshness.mjs` still crashes at `:602` on `core.accept`, which is the R5-5 fix taking
effect. It was **not** patched, deliberately, same ruling as `r2-copy2.mjs` / `r2-import.mjs`
above; §1–§5 still run and were used this round.

---

## Round 7 (2026-08-26, `master` @ `32a3839`)

Independent verification of the R3-3 fix (`chainOntoSaving`). Headless, from `cairn/`:

```bash
node qa/r7-chain.mjs      # the chain, attacked: a THREE-way pile-up (autosave + flush() +
                          # mergeWithStored) measured at the port; a genuine third writer
                          # landing mid-queue; a link that really rejects (the `.catch(() => {})`
                          # claim); the merge branch rejecting; R5-1's drain loop x the chain;
                          # merge LATENCY and what is on screen for it; the button pressed twice;
                          # the deleted-trip branch; a stalled chain; deleteTrip off the chain;
                          # and the structural claim (one saveIfVersion call site, three
                          # writeAndSettle, all inside chainOntoSaving)
node qa/r7-r6recheck.mjs  # R6-1/R6-2's SEVERITY re-derived independently of r6-flush.mjs:
                          # the bound-exhausted abort, then all three backstops — the next
                          # keystroke, registerPageExit (visibilitychange AND pagehide), and
                          # beforeunload's preventDefault
```

Browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r7-browser.mjs   # R3-3 end to end through
                                                                  # the shipped UI, and R7-1's
                                                                  # reachability swept at
                                                                  # 0/30/80/150 ms
```

`r7-chain.mjs` is an **oracle, not a confirmation**: against the parent commit `584c218` (in a
scratch `git worktree`, never in `cairn/`) it reports **10 FAIL**; at `32a3839` it reports **3**,
and all three of those also FAIL at `584c218`, so nothing it still reports is a regression.
`r7-r6recheck.mjs` reports **0 FAIL** — a FAIL there would mean R6-1/R6-2 are worse than MINOR.
`r7-browser.mjs` is timing-*shaped* but not flaky: §2 sweeps four inter-click gaps and the
second press fails to land at all four.

**Probe rot found this round and deliberately not patched** (same ruling as rounds 5 and 6):

- `qa/r6-flush.mjs` §6's static check is `/^\s*saving = (?!saving)/gm`, which now matches
  `chainOntoSaving`'s own `saving = run;` and falsely reports R3-3 open. `qa/r3-merge.mjs`'s
  check (`/^\s*saving = \(async/`) is the correct one. One of `r6-flush.mjs`'s three FAILs is
  stale; R6-1/R6-2 account for the other two.
- `qa/r2-constraints.mjs`'s zero-dep check counts `packages/client`'s workspace-internal
  `{"@cairn/core": "*"}` as a runtime dependency. The root workspace declares none at all.
  Only R2-18 is a real FAIL in that probe.
- `qa/r5-freshness.mjs:602`, `qa/r2-copy2.mjs:86`, `qa/r2-import.mjs:51` remain rotten.

---

## Round 8 (2026-08-27, `master` @ `0a58c81`) — the gate-breaker pass over the SEND-BACK work

Narrow: the diff `5bdd0dc..0a58c81` only (B-1…B-7, A-1…A-4). R2–R7 were **not** re-run.
Headless, from `cairn/`:

```bash
node qa/r8-geo.mjs      # A-1 (§2.13 revision 5) falsified twice — R8-2, the copied PLACE
                        # rule 4 drags in mints a geo_outlier BLOCKER on the real fixture;
                        # R8-3, accepting a copied stop REPLACES the adjacent-day anchor and
                        # mints a blocker on a user-authored stop. §3 is the half A-1 did
                        # deliver: copy-of-a-copy place chains, credit direction, exemption.
node qa/r8-persist.mjs  # §1 R8-4 — mergeWithStored's OFF-CHAIN load() lets an in-flight merge
                        #    resurrect a trip the delete link just removed (A-2)
                        # §2 the delete orderings A-2 did close (confirmations)
                        # §3 R8-1 — undo restores a PRE-RETIREMENT snapshot, so a dismissed
                        #    blocker comes back dismissed (§2.7, opened by B-2's own fix)
                        # §4 B-4/A-3 — the bound exhausted for real, all three obligations,
                        #    plus the two exits that must not re-arm (confirmations)
                        # §5 B-6's R7-1 merge guard and R7-2 unhandled rejection (confirmations)
```

`r8-geo.mjs` reports **2 FAIL** and `r8-persist.mjs` **2 FAIL**, and in both cases every other
section is a confirmation that must stay at 0. Neither is timing-dependent: `r8-persist.mjs`
§1 forces the interleaving with a port whose `load()` takes 60 ms, which is an ordinary
IndexedDB read, not a race window.

Browser probes need `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-views.mjs  # the builder's own probe,
                                                                # re-run unmodified: 0 FAIL
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-undo.mjs   # R8-1 as a user: four clicks
                                                                # and Ctrl+Z, 1 FAIL
```

`r8-undo.mjs` is `r8-views.mjs` §4 with the last leg replaced by the app's own Ctrl+Z. It is a
deterministic click sequence, not a race.

**Probe rot re-confirmed and again not patched** (same ruling as rounds 5–7): `qa/r6-flush.mjs`
samples `status` 200 ms after the abort, and `r8-persist.mjs` §4 shows the re-armed write lands
and clears the banner inside that window — the assertion is stale, the product is right.
`qa/r5-freshness.mjs:602` still crashes on `core.accept`.

---

## Round 9 (2026-08-27, `master` @ `773f8ea`) — the A-5 / A-5a / A-6 gate verification

Narrow: four items only — R8-1 across undo *with the A-5a veto present*, KD-36's second
dismissal across further edits, the same case across a storage round-trip/reseed, and A-6's
copy-borne `Place`. R2–R8 were **not** re-litigated; R8-3 and R8-4 were deliberately not
investigated. Headless, from `cairn/`:

```bash
node qa/r9-ledger.mjs   # §1 R8-1 with the veto: six undo/redo cycles, undo PAST the
                        #    conflictId's creation, the stale-mark leak, and a retirement
                        #    that happens while a live row for the same id is present
                        # §2 KD-36 case 1: ten further edits, edits on the conflict's OWN
                        #    subject day, an id-moving edit and back, undo/redo after the
                        #    second dismissal, and a THIRD dismissal (3 rows, one id)
                        # §3 KD-36 case 2: five close/reopen round trips, an A -> B -> A trip
                        #    switch, and the `mergeWithStored` reseed path
                        # §4 R9-1's root cause isolated: the same live row put back by
                        #    `redo()` vs by `dispatch()`, one difference — releaseRetirement
node qa/r9-geo.mjs      # §1 two copied stops from TWO source trips, incl. `samePlace` reuse
                        # §2 accepting one of two copies, then both
                        # §3 user-authored -> copy-only and back (`every`, not `some`)
                        # §4 R9-2 — reject (fine) vs remove (mints a blocker on the orphan)
                        # §5 R9-2 on the REAL fixture through the store: Browse, Copy, ×
```

`r9-ledger.mjs` reports **4 FAIL**, all one root cause (R9-1). `r9-geo.mjs` reports **3 FAIL**,
all one root cause (R9-2); everything else in both files is a confirmation that must stay at 0.
Neither is timing-dependent — both are deterministic call sequences.

Browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r9-redo.mjs   # R9-1 as a user: seven
                                                                # actions, and the redone
                                                                # dismissal is stillborn
```

`r9-redo.mjs` is `r8-undo.mjs` continued by three more actions (a second "Not a problem",
Ctrl+Z, Ctrl+Shift+Z). Deterministic, not a race; 2 FAIL, both R9-1.

Round-8 probes re-run **unmodified** this round and unchanged by `773f8ea`: `qa/r8-geo.mjs`
**1 FAIL** (R8-3, out of scope — R8-2 closes), `qa/r8-persist.mjs` **1 FAIL** (R8-4, out of
scope — R8-1 closes), `qa/r8-undo.mjs` in Chromium **0 FAIL**. `npm run test:tap` 412/0.

---

## Round 10 (2026-08-27, `master` @ `9ced6e7`) — the A-5b / A-6a gate re-verification

Narrow: two items only — A-5b (`redo` releases the retirement ledger) and A-6a (`removeStop`
prunes the one `Place` a copied stop orphans). R8-3, R8-4 and the round 2–7 open list were
**not** re-run. Headless, from `cairn/`:

```bash
node qa/r10-redo.mjs       # A-5b past retirement-ledger.test.ts: empty future, unrelated
                           #   redo, undo of an `unresolveConflict`, two interleaved
                           #   conflicts, the 50-entry history limit, an A->B->A switch, a
                           #   merge reseed, and the A-5b invariant after every step
                           #   3 FAIL — all R10-1 (MINOR), all pre-existing at 9ba5aec
node qa/r10-prune.mjs      # A-6a past geoCheck.test.ts: the four clauses one at a time
                           #   (pool, accepted, rejected, copy-of-a-copy, duplicate stop id,
                           #   purity, one revision bump), the anti-sweep guards, dangling
                           #   references, undo/redo, the real fixture at scale
                           #   1 FAIL — §5, R10-2 (MAJOR): the `updateStop` door
node qa/r10-mergeundo.mjs  # R10-3 (BLOCKER) — one Ctrl+Z after a merge writes a pre-merge
                           #   snapshot over storage and destroys the other tab's edit
                           #   2 FAIL
```

Everything else in both `r10-*` probes is a confirmation that must stay at 0. None are
timing-dependent: all are deterministic call sequences.

Browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r10-editdoor.mjs  # R10-2 as a user: six
                                                                    # actions, and the
                                                                    # copy-borne Place is
                                                                    # orphaned in IndexedDB
```

Round-9 probes re-run **unmodified** at `9ced6e7`: `qa/r9-geo.mjs` **ALL OK** (was 3 FAIL,
R9-2 closed), `qa/r9-redo.mjs` in Chromium **0 FAIL** (was 2, R9-1's user-visible repro
closed), `qa/r9-ledger.mjs` **2 FAIL** (was 4; the two that remain are §1.2c/d = R10-1, a
sequence A-5b clause 2 declines by construction). `npm run test:tap` 420/0.

## Round 11 — after the R10-3 / R10-2 fixes (`c6c6e2b`)

```bash
node qa/r11-recheck.mjs     # §1 R10-3 past the builder's test: a non-empty `future` at merge
                            #   time, ten undos after a merge, and typing THROUGH the merge
                            #   write
                            #   2 FAIL — §1.3b/§1.3c, R11-1 (BLOCKER, pre-existing race):
                            #   `stillOurs` discards the merged document and the un-merged
                            #   local one is autosaved over storage. No undo involved.
                            # §2 R10-2 past it: place -> none, a re-point to a DIFFERENT
                            #   place, a pooled copy, moveStop/reorderStop, the pool-side
                            #   over-prune guard, the reducer action
                            #   0 FAIL
```

All three round-10 probes re-run **unmodified** at `c6c6e2b`: `qa/r10-mergeundo.mjs` **0 FAIL**
(was 2, R10-3 closed), `qa/r10-prune.mjs` **ALL OK** (was 1 FAIL, R10-2 closed),
`qa/r10-editdoor.mjs` in Chromium **0 FAIL** (was 1). `npm run test:tap` 426/0.

---

## Phase 2, I-0 — probe repair and the measured baseline (`master`, after `a55634f`)

Sixteen probes were dead or stale. **None was deleted**; each carries the reason for its repair
at the call site, and BUILD-NOTES' current status note has the one-line-per-probe table.

Seven had *crashed* and had not executed past their first bad line for several rounds:
`attack3.mjs` (`updateStop({placement})` now throws), `attack8.mjs` / `confid.mjs` (both
targeted an `impossible_transfer` §2.12 took to zero), `prov.mjs` (`importDoc` of a foreign
document now throws by design), `r2-copy2.mjs` / `r2-import.mjs` (`load()` returns
`{doc, version}`; `save()` became `saveIfVersion()`), and `r5-freshness.mjs` (`core.accept`,
un-exported by R5-5).

Nine asserted a contract the architecture had **deliberately changed** — a deleted issue code
(`stop_far_from_city`), a retracted ROADMAP revision-1 criterion, a renamed `params` key
(`stopName` → `name`), a dropped rule (`closed`), and three closed findings (R3-3, R7-3, R2-7)
whose fixes the probes were still reporting as open.

Two new probes:

```bash
node qa/baseline.mjs        # the six Phase 2 baseline numbers, derived by RUNNING:
                            #   detectConflicts at FIXTURE_TODAY = 2 blockers / 4 warn / 11 notes
                            #   geoCheck clean          = 0/112 stops, 0/94 places
                            #   geoCheck under +1 deg   = 112/112 stops, 92/94 places
```

The browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/p2-pasttrip.mjs
                            # I-4 end to end: record a past trip, the persisted document,
                            # the lifecycle chips, exit criterion 3 on screen, and the
                            # injected fault with the browser's Date pinned mid-trip
```

**FAILs that are still real open findings and were left alone:** `r10-redo` 3 / `r9-ledger` 2
(R10-1) · `r7-r6recheck` 3 / `r6-flush` 1 (R6-1/R6-2) · `r8-geo` 1 (R8-3) · `r8-persist` 1
(R8-4) · `r6-actor` 5 · `r3-cas2` 3 / `r3-pool` 3 · `r5-freshness` 4 · `r2-constraints` 1 (its
zero-dep false positive **is** repaired; the determinism-grep one is a genuine gap) ·
`r2-import` 1 (**new** — `fromJSON` rejects an absent `ownerId` that §2.14 rule 1 permits).

---

## Round 12 (2026-08-27, `master` @ `5a3c723`) — the Phase 2 **2a** breaker pass

Narrow: the diff `8df2ae6..5a3c723` only — `lifecycle()`, `Trip.datePrecision`, `Rule.class` +
the `detect.ts` feasibility gate, `PastTripForm.tsx` (incl. KD-38's city assignment), and the
`fromJSON`/`importDoc` absent-`ownerId` fix (KD-40). Phase 1's open list was **not**
re-litigated. Headless, from `cairn/`:

```bash
node --experimental-strip-types qa/p2b-gate.mjs
        # §1  the gate: the ten classes vs §8.2's table; a wholly-past trip (integrity
        #     identical by id AND count, feasibility gone); a STRADDLING trip with a real
        #     city on every day; `subjectDate` over all seven ref shapes incl. the pool /
        #     place / trip / unknown-id fallbacks; ruling 1's asymmetry on the subjects
        #     themselves; ruling 3 (`today` omitted / undefined / `''`); the un-padded
        #     `today` the gate accepts and `lifecycle` rejects; the `rule_error` claim
        #     (P2-4); the gate x the retirement ledger (P2-1); the Phase 1 ceiling
        # §2  datePrecision: an independent grep walk of the ceiling; 11 malformed values;
        #     absent -> 'exact' through fromJSON AND migrateDoc; round-trip parity both
        #     ways; undo/redo x 50; mergeTrips (P2-3); setTripMeta (P2-7); the summary row
        #     the Library renders (P2-6)
        # §3  the form's document rebuilt through its own three dispatches; the city-key
        #     slug (P2-2); the "a year" path at 365 days
        # §4  ownerId: absent / null / non-string x 8 / a real foreign owner / `''` /
        #     one space / the deleted-key bypass (P2-8)
```

The browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/p2b-past.mjs
        # §1 a straddling trip recorded through the real form with a real city on every day
        # §2 "a year" precision — 365 days and 366 dispatches behind one click, timed by
        #    POLLING IndexedDB rather than sleeping, then one Ctrl+Z (P2-5)
        # §3 a trip to Japan named in Japanese — both cities become key "-" (P2-2)
        # §4 the Library's range label vs the open trip's (P2-6)
```

`p2b-gate.mjs` reports **19 FAIL** and `p2b-past.mjs` **6 FAIL**, all by design; everything
else in both files is a confirmation that must stay at 0. Neither is timing-dependent — both
are deterministic call/click sequences.

Re-run **unmodified** this round and unchanged by `5a3c723`: `qa/baseline.mjs` 0 FAIL,
`qa/accept.mjs` 28/0, `qa/r2-import.mjs` 0 FAIL, `qa/prov.mjs` 0 FAIL, `qa/p2-pasttrip.mjs`
in Chromium 0 FAIL (30 assertions), `qa/r2-constraints.mjs` 1 FAIL (R2-18, known).
`npm run test:tap` 479/0, `npm run typecheck` clean, `npm run web:build` clean.

---

## Round 13 (2026-08-27, `master` @ `4dd50d1`) — the I-3a / I-4a breaker pass

Narrow: the diff `23f37b9..4dd50d1` only — §2.7 **A-9** (retirement vs the clock,
`syncResolutions(trip, at)`, `detectUngated`, the deleted `delta < 0`), §2.2 **A-10** (`CityKey`
is a minted opaque id, the three new `validateTrip` codes, the slug deletion in the two web
forms), and the follow-ups **KD-42** (the 71 export count) and **KD-44** (`geoOutlier`'s
city-label fallback). Phase 1's open list, P2-5 and P2-8 were **not** re-litigated.

```bash
node --experimental-strip-types qa/r13-gate-citykey.mjs
        # §1  R13-1 — `unbooked_ticketed`'s SURVIVING `delta > 60` guard is a second
        #     clock-driven suppression and `detectUngated` applies it, so one clock step
        #     BACKWARDS across the 60-day boundary permanently retires a live dismissal.
        #     Core (§1.2) and through the real store + storage port (§1.3).
        # §2  the gate crossed in both directions, alone and combined with real edits; a
        #     genuine fix still retires at any clock, in core and into storage   (0 FAIL)
        # §3  R13-2 — A-9 assertion 4's substituted test: the `setTripMeta({endDate})` is
        #     inert, and the literal A-9(4) is unachievable for `missing_lodging`
        # §4  R13-3 — a crashed rule retires every dismissal it owned; plus the five content
        #     routes into a crash that `fromJSON` refuses (why it stays MINOR)
        # §5  `detectUngated` off `index.ts`, unnamed by client/web/cli, absent from the
        #     built bundle, no deep module-path import anywhere              (0 FAIL)
        # §6  A-10: 22 adversarial names -> 22 distinct keys; the three new codes; an
        #     explicit `key:''`; `fromJSON`/`migrateDoc`/`importDoc` silence on a collapsed
        #     pre-A-10 document; the reference trip's keys and its 11 issues   (0 FAIL)
        # §7  KD-42 re-derived both ways (71 / 71) — and R13-4, the stale `70` left in
        #     `detect.ts:192` by the same pass that corrected the docs
        # §8  R13-5 — KD-44's phrase composed into the sentence a person reads, at both
        #     label sites
        # §9  the ceilings, by running: 2/4/11 at FIXTURE_TODAY; un-gated 17 vs gated 5 on
        #     the completed trip; `ctx.today` in exactly one rule file          (0 FAIL)
        # §10 R13-6 — A-10 x `copyStopInto`: a cross-trip copy imports the SOURCE trip's
        #     minted CityKey on the copied `Place`, so the recipient's document reports
        #     `unknown_city_key` (error). Control: the same copy under the pre-A-10 slug
        #     is clean.
```

**16 FAIL by design**; everything else in the file is a confirmation that must stay at 0.
Not timing-dependent — deterministic call sequences only, no races and no sleeps.

The two **byte-identity** claims were re-derived rather than trusted, and the recipe is not in
the probe because it needs a second checkout:

```bash
git worktree add /tmp/pre 23f37b9        # the commit before I-3a/I-4a
# run the same dump script against both trees and diff — conflicts + issues + summary +
# cities on the reference trip at FIXTURE_TODAY, 2026-08-10, -08-14, -08-27, 2027-01-01,
# 2019-01-01 and with no clock: 52229 bytes, identical.
cd /tmp/pre/cairn && npm run golden      # pre-change code
diff -r /tmp/pre/cairn/fixtures/golden cairn/fixtures/golden   # identical
cd cairn && npm run golden && npm run sample && git status --porcelain   # empty
```

Re-run this round: `qa/p2b-gate.mjs` **5 FAIL** (exactly the five the builder disclosed — P2-5,
P2-8 ×2, the §1.7 un-padded-`today` crash, the §2.1 `summary.ts` ceiling), `qa/confid2.mjs`
**0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). `npm run test:tap` 515/0,
`npm run typecheck` clean, `npm run web:build` clean, `npm run cli -- trip|conflicts` run.

Browser probe, needing `npm run web:build && node tools/serve.mjs` in one shell:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/p2b-past.mjs   # 3 FAIL, all probe rot
```

The builder disclosed that he had **not** re-run this one, so I did. Its §3 confirms A-10 end to
end in a real browser — 東京 and 京都 get two distinct minted keys (`city_5f59852c43dc`,
`city_f545e99a1ba1`), day 1 carries the first, 0 validation issues. Its 3 FAILs are **R13-8**:
§1c and §2d still assert `primaryCity === 'tokyo'` (the deleted slug's output) and §3d still
expects the app to *report* a collapse that no longer happens. Left unpatched, same ruling as
rounds 5–10 — a probe that measures a deleted expression is a finding, not a repair job for the
breaker.

---

## Round 14 (2026-08-27, `master` @ `fb3ff34`) — the A-11 / A-12 / A-13 / A-14 breaker pass

Narrow: the diff `4dd50d1..fb3ff34` only — `Rule.horizonDays` + `beyondHorizon` (**A-11**),
`detectUngatedChecked` + `syncResolutions`' crash refusal (**A-12**), the substituted A-9(4)
test and its `endDate`-fallback tripwire (**A-13**), and `copyStopInto` rule 4's three-step
re-filing + the new `model/cityName.ts` (**A-14**). R13-4, R13-5, P2-5, P2-8 and the Phase 1
open list were **not** re-litigated.

```bash
node --experimental-strip-types qa/r14-horizon-copy.mjs
        # §1  A-11 past its own six-clock sweep: 434 clocks x 10 documents; the 60-day
        #     boundary in both sets; injected rules at horizon 0 / -1 / NaN / Infinity / 1e9,
        #     an INTEGRITY class, a horizon-free rule beside a horizoned one, mixed-date and
        #     empty subject sets; §1.4's pre-vs-post differential and §1.5, the horizon
        #     leaking 73 days out on a duplicate-stop-id document      (R14-1, 2 FAIL)
        # §2  KD-48 re-derived from the FIXTURE by hand, not from the rule: ten, and the
        #     three named cases are among them                                     (0 FAIL)
        # §3  A-12 vs 1/2/4/ten simultaneous crashes, a CLOCK-DEPENDENT crash over a
        #     genuinely-fixed dismissal, 25 crash/recover rounds, and the real store
        #                                                                          (0 FAIL)
        # §4  A-13's tripwire: shape, 5/5 rule coverage, and forced RED in a scratch
        #     worktree by a real rule increment (a ticketed pool stop)              (0 FAIL)
        # §5  A-14: assertions 1-5; the three-same-named-cities tie-break x5; R14-2, the
        #     WITHIN-trip copy A-14 says is unchanged (§5.2, §5.7, §5.10 through the store);
        #     R14-3, the aliased inline PlaceLink (§5.3); eight Unicode folding cases;
        #     double-hop copies; KD-47's disclosed gap; the reworked
        #     `lisbonWithCopiedPlaceStop` fixture measured against the one it replaced; and
        #     §5.9 R14-4 (BLOCKER) — the copied PLACE's note and links cross the trip
        #     boundary unredacted           (R14-2 x5, R14-3 x2, R14-4 x6)
        # §6  cross-cutting: copy -> horizoned conflict -> unrelated crash -> retirement
        # §7  the ceilings re-derived by running: 71 exports, conflicts at five clocks,
        #     validateTrip, goldens + sample, KD numbering, test/disclosure.test.ts  (0 FAIL)
```

**15 FAIL by design** with both worktrees present, **14** without (the missing one is §1.4's
differential; §1.5 carries R14-1's other half and needs no second checkout) — R14-1 ×2, R14-2 ×5,
R14-3 ×2, R14-4 ×6. Every other line in the file is a confirmation that must stay at 0. Not
timing-dependent — deterministic call sequences only, no races and no sleeps.

Two sections need a second checkout and print `skip` without one, because both are differentials
against other commits rather than assertions about this one:

```bash
git worktree add /tmp/r14-pre 78b490f   # the commit BEFORE A-11/A-12/A-13 — §1.4's oracle
git worktree add /tmp/r14-tw  fb3ff34   # a scratch tree §4 patches and restores, for the
                                        # tripwire's RED state. It edits
                                        # unbookedTicketed.ts in THAT tree only and puts the
                                        # file back in a `finally`; nothing under cairn/ is
                                        # ever written.
```

Re-run **unmodified** this round and unchanged by `fb3ff34`: `qa/r2-copy.mjs` **0 FAIL** and
`qa/prov.mjs` **0 FAIL** — neither had been run at a commit carrying *both* builder passes (the
A-14 builder ran them in a detached worktree holding only his five files) — and
`qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). `npm run test:tap` 554/0, `npm run typecheck`
clean, `npm run web:build` clean. `qa/r13-gate-citykey.mjs` was **not** re-run: the orchestrating
session had already re-run it at 0 FAIL and §1/§3/§4/§10 of this file attack the same rulings from
angles that probe does not cover.

Note for whoever reads §5.9 first: `qa/r2-copy.mjs` §H does **not** fail on R14-4. It only
inspects the copied *stop*'s note, ticket and links — the copied `Place` is not in its scope,
which is how the un-fixed half of R2-3 stayed invisible for eleven rounds.

---

## Round 15 (2026-08-28, `claude/i4a-r14-issues-f0bkgc` @ `bd195bd`) — the A-15 / A-16 / A-17 breaker pass

Narrow: the diff `3409420..bd195bd` only — `placeForCopy` and `refileCityKey`'s new step 2 in
`build/copyStop.ts` (**A-15**, **A-16**), the `PlaceLink` clone (**R14-3**), the `Rule.horizonDays`
comment (**A-17**), and the two test files. Round 14's own open list was re-derived only where
this diff claims to close it; R13-4, R13-5, P2-5, P2-8 and the Phase 1 list were **not**
re-litigated.

```bash
node --experimental-strip-types qa/r15-place-copy.mjs
        # §1  A-15 measured against what a `Place` carries at RUNTIME, not against the type:
        #     §1.1 the one surviving spread (`{...w}` over `hours.weekly`) and §1.2 a
        #     non-string `hours.note`, both live because `fromJSON` casts `hours` unvalidated
        #                                                              (R15-1, 7 FAIL)
        #     §1.3 the six `place.hours` shapes fromJSON accepts and copyStopInto now THROWS
        #     on — all six copy cleanly at 3409420                      (R15-2, 2 FAIL)
        #     §1.4 what the ruling's table DOES deliver, and §1.5 over-redaction measured
        #     across eleven notes                                                 (0 FAIL)
        # §2  §2.1 `Stop.cost.note` and `Stop.arrival.label` cross verbatim while §6.6's
        #     sample path redacts both; §2.2 the reference trip's exposure, measured
        #                                                              (R15-3, 5 FAIL)
        # §3  A-16: assertions 1-5, the stale source in both directions, the coincidental
        #     cross-document key, same-`.id`-different-object, determinism   (0 FAIL);
        #     §3.2 the step-1-before-step-2 ordering nothing can fail on (R15-4, 1 FAIL);
        #     §3.3 the trip-id collision, checked in store.ts rather than reasoned about;
        #     §3.4 the pool placement's raw cityKey                      (R15-6, 1 FAIL)
        # §4  R14-3 from BOTH directions, plus every other alias copyStopInto still has
        #                                                                          (0 FAIL)
        # §5  A-17's directional test measured for what it can actually detect
        #                                                              (R15-5, 1 FAIL)
        # §6  the ceilings, the read-only boundary, and the pre-vs-post differential (0 FAIL)
```

**17 FAIL by design** — R15-1 ×7, R15-2 ×2, R15-3 ×5, R15-4 ×1, R15-5 ×1, R15-6 ×1. Every other
line in the file is a confirmation that must stay at 0. Deterministic call sequences only, no
races and no sleeps.

§6.3 is a differential and prints `skip` without a second checkout:

```bash
git worktree add /tmp/r15-pre 3409420   # the commit BEFORE A-15/A-16/A-17 were built
```

Three of this round's findings are about **tests that cannot fail**, and none of them can be
expressed as an assertion inside this probe — a probe cannot mutate the product code it is
importing. Each was established by editing `copyStop.ts`, `detect.ts` or `unbookedTicketed.ts` in
a throwaway `git worktree add /tmp/r15-mut bd195bd`, running `node --test`, and discarding the
tree. Nothing under `cairn/` was ever written. The three mutations, so the next round does not
re-derive them:

```bash
# R15-4 — move refileCityKey's step 2 above step 1:      568/568 pass, r14 probe ALL OK
# R15-4 rider — `name: redactText(p.name)` in placeForCopy: 568/568 pass
# R15-5 — beyondHorizon's `subjects.every(...)` -> `.some(...)`: 568/568 pass
#         (the same mutation on §8.2's `suppressedAsPast` turns 3 tests red, which is the
#          contrast that makes R15-5 a finding rather than a general observation)
```

Re-run **unmodified** this round: `qa/r14-horizon-copy.mjs` **0 FAIL** with both worktrees
present (A-15/A-16/A-17/R14-3 close every line it had red), `qa/r2-copy.mjs` **0 FAIL**,
`qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). `npm run test:tap`
568/0, `npm run typecheck` clean.

Note for whoever reads §1.1 first: `qa/r14-horizon-copy.mjs` §5.9 does **not** fail on R15-1. It
inspects the copied place's `note` and `links` — the two fields R14-4 named — and never
populates `hours`, which is how the third carrier survived the ruling written to close the first
two.

**Round 16 maintained this file to 0 FAIL.** All six R15 findings close; three lines could not be
closed by product code and were re-expressed rather than deleted (A-19 assertion 7 forbids the
builder editing anything under `qa/`, so this was QA's job):

- **§3.4** asserted against a document A-19 now refuses to return. It is a `throws` assertion
  now, against A-19's real contract, with `TRANSIT_CITY_KEY` and a key the target *does* have
  measured beside it so the line proves a refusal and not a blanket ban.
- **§3.2 (R15-4)** and **§5.1 (R15-5)** were literal `ok(..., false, …)` — statements about a gap
  in the *shipped suite*, not measurements of the product, so no product change could ever turn
  them green. Both now point at the test that closed them. **Round 16 re-derived both by
  mutation** rather than trusting the builder: see the round-16 section below.

---

## Round 16 (2026-08-28, `claude/i4a-r14-issues-f0bkgc` @ `bff7a81`) — the A-18 / A-19 breaker pass

Narrow: the diff `b3a0c89..bff7a81` only — `build/copyStop.ts` (`redacted`, `costForCopy`,
`arrivalForCopy`, `weeklyForCopy`, `hoursForCopy`, A-19's three parts), `model/types.ts` (the new
`place_hours_malformed` code), `validate/validateTrip.ts` (`wellFormedHours`) and the two test
files. Nothing else was re-litigated.

```bash
node --experimental-strip-types qa/r16-copy-depth.mjs
        # §1  A-18 past r15 §2.1's repro: §1.1 the `display` predicate at six edges;
        #     §1.2 an unclassified key on ALL FOUR records the ruling enumerates —
        #     `CostEstimate`, `Money`, `MoveOverride` and **`Link`**       (R16-1, 1 FAIL)
        #     §1.3 the strings that still cross verbatim, checked against
        #     tools/redact.mjs's STRUCTURAL_KEYS rather than against the ruling's prose;
        #     §1.4 the open/close judgment call vs all 240 clock times in a day  (0 FAIL)
        # §2  `Place.hours`: 34 shapes through the live fromJSON route, including nested
        #     objects, array-likes, `__proto__` as a data key and 1e999 as a `day`
        #                                                                        (0 FAIL)
        #     §2.3 the new `place_hours_malformed` vs what the copy actually did
        #                                                                 (R16-2, 1 FAIL)
        # §3  A-19's eight assertions re-derived, plus the id factory behind the refusal
        #     and a placement whose `kind` is out of the union             (0 FAIL)
        # §4  `place_hours_malformed` as shipped: ceiling, determinism, Ref, wiring (0 FAIL)
        # §5  ceilings, BUILD-NOTES' two greppable claims (comments stripped, or they
        #     report their own docstring), and a byte-identity differential vs b3a0c89
        #                                                                        (0 FAIL)
```

**2 FAIL by design** — R16-1 ×1, R16-2 ×1. Every other line is a confirmation that must stay at 0.
Deterministic call sequences only, no races and no sleeps.

§5.3 is a differential and prints `skip` without a second checkout:

```bash
git worktree add /tmp/r16-pre b3a0c89   # the commit BEFORE A-18/A-19 were built
```

Ten mutations, all made in a throwaway `git worktree add /tmp/r16-mut bff7a81` and discarded —
nothing under `cairn/` was ever written. The counts are what a future round should reproduce:

```bash
# reintroduce the cost/arrival spread                     3 red
# `{...w}` back on hours.weekly                           2 red
# alias the caller's placement into addStop               2 red
# delete A-19's pool-city check                           1 red
# carry the source hint verbatim                          2 red
# skip `redacted` on cost.note / on arrival.label       1 red each
# `display: c.display` (drop the predicate)               2 red
# refileCityKey step 2 above step 1                       1 red  <- R15-4 CLOSES
# beyondHorizon `subjects.every` -> `.some`               1 red  <- R15-5 CLOSES (full suite)
# spread `links` back to `{ ...l }`                       0 red  <- R16-1
# restore `redactText(p.note) as string` in placeForCopy   0 red  <- R16-1's rider
```

Re-run **unmodified** this round: `qa/r14-horizon-copy.mjs` **ALL OK** with both worktrees
present, `qa/r2-copy.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL**
(R2-18, known). `npm run test:tap` 583/0, `npm run typecheck` clean, `npm run web:build` clean,
`npm run golden` + `npm run sample` byte-identical (sample sha `40955ca0b182`).

Note for whoever reads §1.2 first: `r16` does **not** re-run round 15's credential repro. That
lives in `qa/r15-place-copy.mjs` §1.1/§1.2/§2.1 and now passes there; re-running it here would
have spent a run re-confirming a number the builder already reported and I had no reason to doubt.

---

## Round 17 (2026-08-28, `master` @ `909b4a3`) — the A-20 breaker pass

Narrow: the diff `69f551c..909b4a3` under `packages/` only — the new `model/openingHours.ts`,
`serialize/fromJSON.ts` (`clock`, `parseOpeningHours`, `clockOrNull`), `serialize/toJSON.ts`
(`weeklyOut`, `hours`), `validate/validateTrip.ts` (`wellFormedHours` deleted), `build/copyStop.ts`
(`weeklyForCopy`), `model/types.ts` and the two test files. Nothing else was re-litigated.

```bash
node --experimental-strip-types qa/r17-hours-parser.mjs
        # §1  A-20's contract sentence — `isOpeningHours(v)` is true EXACTLY when `fromJSON`
        #     accepts `v` — over 53 shapes against fromJSON's OBJECT arm: unicode digits,
        #     a trailing newline, a NUL, an RTL override, boxed primitives, Proxies,
        #     Object.create(null), inherited-only fields, sparse arrays, accessors  (0 FAIL)
        #     §1.2 the ruling's own two normalisation claims, checked literally;
        #     §1.3 a legitimate `hours` is not collateral damage                    (0 FAIL)
        # §2  Part 5(a) re-derived: the accepted set brute-forces to exactly 11 000 and
        #     redactText alters none of them; and the invariant is TIED to redactText by a
        #     red test, with one pattern list shared with tools/redact.mjs          (0 FAIL)
        # §3  R15-2's closure against 41 hostile CAST-BUILT `hours`                 (0 FAIL)
        #     §3.2 an entry whose open/close are ACCESSORS: validated on one read,
        #     copied from another                                            (R17-1, 2 FAIL)
        # §4  the ratification chain end to end over 26 shapes: validateTrip warns ->
        #     toJSON re-emits -> fromJSON refuses at the exact path              (0 FAIL)
        # §5  statements about the SHIPPED SUITE, mutation-verified in a scratch worktree:
        #     §5.1 toJSON's `hours` rebuild is unpinned                      (R17-2, 1 FAIL)
        #     §5.2 clockOrNull's refusal is unpinned, pre-existing            (R17-3, 1 FAIL)
        # §6  ceilings, A-20 assertions 5 and 6, and the read-only boundary        (0 FAIL)
```

**4 FAIL by design** — R17-1 ×2, R17-2 ×1, R17-3 ×1. Every other line is a confirmation that must
stay at 0. Deterministic call sequences only, no races and no sleeps. No second checkout needed.

Seventeen mutations, all made in a throwaway `git worktree add /tmp/r17-mut 909b4a3` (and one in
`/tmp/r17-pre 69f551c`) and discarded — nothing under `cairn/` was ever written. The counts are
what a future round should reproduce:

```bash
# isClockTime without its `$` anchor                        1 red
# isWeeklyEntry without Number.isFinite(day)                3 red
# isWeeklyEntry weakened to the old `typeof e.open string`  4 red
# isOpeningHours without the `note` typeof check            2 red
# isOpeningHours without Array.isArray(v)                   0 red  <- unreachable population
# isWeeklyEntry without Array.isArray(v)                    0 red  <- unreachable population
# parseOpeningHours: `str` instead of `clock`               2 red
# parseOpeningHours: `{...e}` back on a parsed entry        2 red
# parsePlace: the raw cast restored                         5 red
# parseOpeningHours: `hours: null` accepted as absent       2 red
# parseOpeningHours: an `undefined` slot refused            1 red
# weeklyForCopy without isWeeklyEntry                       1 red
# weeklyForCopy without its redaction line                  0 red  <- provably dead, per A-20 5(a)
# validateTrip: the place_hours_malformed push deleted      2 red
# a REDACTION_PATTERN that alters a clock time              6 red  <- 5(a) and 5(b) both fire
# toJSON: `hours: p.hours` restored                         0 red  <- R17-2
# clockOrNull: the HH:MM refusal deleted                    0 red  <- R17-3 (0 red at 69f551c too)
# `{ ...l }` back on links                                  1 red  <- R16-1 CLOSES  (0 at bff7a81)
# `redactText(p.note) as string` in placeForCopy            1 red  <- rider CLOSES  (0 at bff7a81)
```

Re-run **unmodified** this round: `qa/r14-horizon-copy.mjs` **ALL OK**, `qa/r2-copy.mjs` **0 FAIL**,
`qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). `npm run test:tap`
593/0, `npm run typecheck` clean, `npm run web:build` clean, `npm run golden` + `npm run sample`
byte-identical (sample sha `40955ca0b182`).

**`qa/r15-place-copy.mjs` and `qa/r16-copy-depth.mjs` are both back at 0 FAIL and both now run to
completion.** A-20 said in writing that it would turn two probes red on purpose and that
re-expressing them is QA's job; both aborted with an uncaught `TripParseError` before this pass
(`r15` at §1.2, `r16` at §1.4 line 253). Every affected line is now two-sided in the form
`packages/core/test/copyStop.test.ts` models — the parser refuses (or, for an extra key, **drops**)
with a JSON path, and `copyStopInto` still never throws on the cast-built equivalent:

- **`r15` §1.1** asserted the hostile entry *survived* the parser; it now asserts the parser keeps
  the entry and drops the unenumerated key, with the copy measured on a cast-built source.
- **`r15` §1.2 / §1.3** now assert the refusal and its exact path (`$.places[0].hours.note`, and
  the six R15-2 shapes), then the cast-built copy.
- **`r16` §1.4(b), §2.1, §2.2** the same; §2.1 measures all 35 shapes on both sides rather than
  skipping the refused ones, which would have silently emptied the section.
- **`r16` §2.3** is R16-2's own assertion, unchanged in wording and now **green** — one predicate,
  three importers, and `wellFormedHours` gone.
- **`r16` §1.2's R16-1 line** was a literal `ok(…, false, …)` about the shipped suite, so it now
  points at the fixture that closed it, mutation-verified above.

Note for whoever reads §3.2 first: R17-1 needs an **accessor property** on a `weekly` entry. No JSON
document can carry one, and every shipped caller of `fromJSON` passes text (`importDoc(text)`,
`cli`, and `StoredDoc.doc`, which is `type TripDoc = string`) — so the population is an in-process
writer, the same one `place_hours_malformed` exists for. That is the whole reason it is MINOR.

---

## Round 18 (2026-08-28, `master` @ `1d091a6`) — the A-21 / A-21a breaker pass

Narrow: the diff `10fe04c..1d091a6` under `packages/` only — `build/copyStop.ts` (file-wide),
`model/openingHours.ts` (`isWeeklyEntry` → `readWeeklyEntry`), `serialize/toJSON.ts` (`hours()`)
and the three test files — plus the three round-17 findings a builder closed in the same pass.
Nothing else was re-litigated.

```bash
node --experimental-strip-types qa/r18-readonce.mjs
        # §1  a mechanical read-count CENSUS: every field of every caller-supplied record
        #     `copyStopInto` touches, over five control-flow paths, each wrapped in a
        #     counting getter that returns a STABLE value          (census summary, 1 FAIL)
        # §2  A-21a's read-count table re-derived path by path              (0 FAIL)
        #     §2.2 its stated bound attacked from three directions: duplicate row yes,
        #          crash no, false-positive merge no, new leak no            (0 FAIL)
        #     §2.3 where the bound stops holding, one level down      (R18-5, 2 FAIL)
        # §3  the sites the census finds that neither ruling names:
        #     §3.1 `source.trip` ×5 — the credit names the wrong person (R18-1, 2 FAIL)
        #     §3.2 `src.id` ×2 — tested by `find`, emitted as origin    (R18-2, 1 FAIL)
        #     §3.3 `srcPlace.at` ×2 in the inline branch               (R18-3, 2 FAIL)
        #     §3.4 `samePlace` reads the RECIPIENT's `a.at` ×3         (R18-4, 1 FAIL)
        #     §3.5 the ctx fields whose second read is inert today      (recorded, 0 FAIL)
        # §4  where A-21's claim DOES hold — Parts 1, 4 and 4(c) and A-21a's
        #     own two fixtures, all re-derived                                  (0 FAIL)
        # §5  ceilings, `cairn-constraints` and the read-only boundary          (0 FAIL)
```

**9 FAIL by design** — R18-1 ×2, R18-2 ×1, R18-3 ×2, R18-4 ×1, R18-5 ×2, plus the §1.1 census
summary. Every other line is a confirmation that must stay at 0. Deterministic call sequences only,
no races and no sleeps. No second checkout needed.

**The census in §1.1 is the reusable part.** A-21's own residue paragraph says the rule is checked
behaviourally rather than by a grep, and that *"the day `copyStop.ts` grows a new helper, the
reviewer's question is: does any field of a source record appear twice in this function?"* — one
pass over a 500-line file, by hand. §1.1 is that question asked mechanically: it wraps every own
enumerable field of the source stop, its `PlaceLink`, the source `Place`, the `placement` and the
two argument objects in counting getters that return **stable** values, so it measures the shipped
control flow and injects no fault at all. Run it on any future pass that touches this file; the
only maintenance it needs is the `BLESSED` set, which is the two carve-outs the rulings write down.

Thirteen mutations, all made in a throwaway `git worktree add … 1d091a6` and discarded — nothing
under `cairn/` was ever written. Baseline 608/608 before and after each, restore verified. **Every
one is red; none survives**, which is the opposite of round 17's result and is the strongest thing
in the builder's two passes:

```bash
# A-21's own six
# re-read `e.open` in weeklyForCopy                          1 red
# re-read `c.display` in costForCopy                         1 red
# re-read `o.weekly` in isOpeningHours                       1 red
# re-read `o.weekly` in hoursForCopy                         1 red
# re-read `p.at` in placeForCopy                             1 red
# restore `place = src.place` as the ternary fallthrough     2 red
# A-21a's seventh
# restore `original.at` in the step-3 branch                 1 red
# the Part 1 reversion the ruling is written against
# readWeeklyEntry -> a bool the caller re-derives from       2 red
# the builder's five
# re-read `placement.cityKey` in Part 4(c)                   1 red
# re-read `o.weekly` in toJSON's hours()                     1 red
# revert toJSON's `hours` rebuild                            1 red  <- R17-2 CLOSES (0 at 909b4a3)
# delete clockOrNull's HH:MM refusal                         1 red  <- R17-3 CLOSES (0 at 909b4a3
#                                                                      AND at 69f551c)
# drop Number.isFinite from readWeeklyEntry                  3 red
```

Re-run **unmodified** this round: `qa/r14-horizon-copy.mjs` **ALL OK**, `qa/r15-place-copy.mjs`
**ALL OK**, `qa/r2-copy.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1
FAIL** (R2-18, known). `npm run test:tap` 608/0, `npm run typecheck` clean, `npm run web:build`
clean, `npm run golden` + `npm run sample` byte-identical (sample sha `40955ca0b182`),
`Object.keys(core).length` 71 with `index.ts` byte-unchanged across the whole diff.

**`qa/r16-copy-depth.mjs` and `qa/r17-hours-parser.mjs` are both at 0 FAIL and both run to
completion.** A-21 named the lines it would turn red and said re-expressing them is QA's job, not
the builder's; this round did it:

- **`r16` §1.4's source-grep** tested `/isWeeklyEntry\(w\)/` and `/redacted\(e\.open\) !== e\.open/`.
  A-21 renamed both halves; the equivalents are `/readWeeklyEntry\(w\)/` and
  `/redacted\(open\) !== open/` and the assertion's *subject* — the structural half is asked once,
  elsewhere, and the redaction half is a copy-boundary policy — is unchanged and still true. A
  second line now asserts, against **comment-stripped** source, that the old boolean predicate was
  **deleted** rather than shipped alongside the new one.
- **`r16` §3.5** recorded, as *"confirmed, not filed"*, that an out-of-union placement `kind` fell
  past A-19's city check and wrote `{kind:'pool', cityKey: undefined}`. A-21 Part 4(c) merges the
  check and the rebuild into one branch on the discriminant, so the call is now **refused**. The
  ruling does not name this; the builder reported it. The line is re-expressed two-sided (the
  refusal, and the target byte-identical behind it) with the residual coercion — an out-of-union
  `kind` carrying a key the target *has* still lands in the pool — recorded beside it.
- **`r17` §3.2's second assertion** (`warned || restores`) is **withdrawn by A-21 Part 6** as
  unsatisfiable by any implementation that does not re-read, and is replaced by Part 6's own
  four-part invariant, measured rather than argued: neither traversal throws at any of 7 flip
  points and the export stays parseable JSON; **each traversal reads each field exactly once**
  (`validateTrip` 1/1, `toJSON` 1/1, `copyStopInto` 1/1 — which is the checkable form of
  *"internally consistent"*); the two-traversal disagreement is **recorded and not asserted**; and
  the harm is bounded to the caller's own document, which is the half that must not be withdrawn.
- **`r17` §5.1 and §5.2** were literal `ok(…, false, …)` statements about the shipped suite's own
  coverage gaps — R17-2 and R17-3 — which no product change can turn green. Both now assert the
  closure by naming the fixture, and both are re-derived by mutation at `1d091a6` rather than taken
  from BUILD-NOTES. §5.2 also gains **R17-4**'s closure, re-derived: `importDoc(text: string)`,
  `type TripDoc = string`, `cli.ts`'s `readFileSync(…, 'utf8')`.

Note for whoever reads `r18-readonce.mjs` §3 first: every finding needs an **accessor property on a
caller-supplied value**. `JSON.parse` produces own data properties and never accessors,
`TripDoc = string`, and `apps/web`'s only `copyStopInto` call site builds
`{ trip: browsing, stopId: stop.id }` as an object literal from a parsed document. The population
is an in-process caller past the type system — the same one `place_hours_malformed` was ratified
for. That is the whole reason all five are MINOR and none is a BLOCKER.

---

## Round 29 (2026-08-28, `claude/cairn-i7-r28-closure-6yrw8b` @ `61f5e71`) — I-7a: the civil calendar, exit criterion 6 with teeth, and `provisional`

Seven new probes. Six are offline; **`i7a-idb-rowkeys.mjs` needs a browser** and is A-33 **6b-4**,
the assertion BUILD-NOTES I-7a stubbed as unrunnable — it runs, from the same absolute Playwright
path `qa/i6a-idb.mjs` has imported since round 27. The three `.sh` probes build throwaway
`git worktree`s at `HEAD`, mutate them and remove them; nothing in the working tree is touched.
All run from `cairn/`.

```bash
node --experimental-strip-types qa/i7a-calendar.mjs   # ALL OK, 37 checks. A-32 against THREE oracles that are
                                                      # neither `Date` nor Hinnant: Fliegel–Van Flandern's JDN
                                                      # (360,000 dates), Zeller's congruence (49,995 weekdays
                                                      # plus nine historical anchors), and a brute-force
                                                      # day-by-day walker over years 1..1200 (438,291 days).
                                                      # `Date.UTC` cannot see years < 100 at all, so the
                                                      # architect's and the builder's differentials were both
                                                      # blind in exactly the band the BLOCKER lived in.
                                                      # Plus the exhaustive 3,652,425-day round trip, the
                                                      # domain edges, and the roll-over non-regression.

node --experimental-strip-types qa/i7a-provisional.mjs  # 2 FAIL BY DESIGN. A-34's `provisional` at every
                                                      # lifecycle boundary (one completed among several
                                                      # active/planned, order-independence, the exact day a
                                                      # trip stops being active, a zero-day trip, an inverted
                                                      # row); R28-4's clamp per row vs per total AND what it
                                                      # now hides; R28-5's undefined/null unification; the
                                                      # version-3 row at all three lifecycles. The two FAILs
                                                      # are R29-7 (the composite key's width) and R29-6
                                                      # (a five-digit-year `lastVisit`).

node --experimental-strip-types qa/i7a-today.mjs      # 4 FAIL BY DESIGN — R29-3. Runs the CLI on a
                                                      # shape-valid calendar-invalid `--today`, and
                                                      # differentially compares a round-trip calendar check
                                                      # built from two §2.10 exports against `isIsoDate`
                                                      # itself over 300,000 strings: KD-66's "out of reach"
                                                      # does not hold.

node --experimental-strip-types --max-old-space-size=3000 qa/i7a-span.mjs
                                                      # 2 FAIL BY DESIGN — R29-2. The exact-date branch of
                                                      # both trip forms is unbounded: `0202-01-01 →
                                                      # 2020-12-31` is 664,377 days and 266.7 MB, and
                                                      # `validateTrip` reports nothing. `--fast` skips it.

PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node --experimental-strip-types qa/i7a-idb-rowkeys.mjs
                                                      # ALL OK on the shipped tree — A-33 6b-4, the persisted
                                                      # bytes of the real IndexedDB port read straight out of
                                                      # the database. Add `--fault` for R29-1: 3 FAIL, with
                                                      # `countriesVisited` and `daysTravelled` in the record.

bash qa/i7a-exit6b.sh                                 # SIX new exit-6 faults past A-33 Part 6's own F1..F10.
                                                      # G1 and G4 are GREEN — R29-1. Unlike i7-exit6.sh this
                                                      # harness reports a drifted anchor as UNRUN and exits
                                                      # non-zero (R29-4).

bash qa/i7a-reexpressed.sh                            # The three KD-67 probe re-expressions, mutation-tested:
                                                      # revert the implementation fix alone and check the
                                                      # NEW assertion still reds. All three are legitimate
                                                      # re-targets. §R4 demonstrates R29-4.

bash qa/i7a-bundle.sh                                 # The +416-byte delta bisected across four builds —
                                                      # A-32 is +511 and the travelStats rewrite is −95.
```

Round 28's probes at `61f5e71`: `i7-oracle` **ALL OK**, `i7-year` **ALL OK** (was 8 FAIL),
`i7-pastyear` **ALL OK** (was 3), `i7-rescan` **ALL OK** (was 2), `i7-edges` **1 FAIL** (was 3 —
the remaining one is R29-7), `bash qa/i7-faults.sh` all seven red (4·2·2·3·5·1·1),
`bash qa/i7-exit6.sh` all ten red. Historic: `r13`…`r20` **0 FAIL**, `r21-closure` **1 FAIL**
(R21-1), `r2-constraints` **1 FAIL** (R2-18), `qa/i6a-idb.mjs` **ALL OK**.

---

## Round 28 (2026-08-28, `claude/cairn-i7-travelstats-c5oe7o` @ `db9dc1d`) — I-7: `travelStats` and the row's record census

Seven new probes, **all offline** — no browser, no web build, no server. The two `.sh` ones build
throwaway `git worktree`s at `HEAD`, mutate them and remove them; nothing in the working tree is
touched. All run from `cairn/`.

```bash
node --experimental-strip-types qa/i7-oracle.mjs     # ALL OK. A-31 Part 7's four-number oracle re-derived
                                                     # by a THIRD program: my own walk of the document with
                                                     # my own reading of stopLatLng's contract, against
                                                     # countries.json, against row.attribution, against
                                                     # travelStats. 94 / 3 / 132 / 4, and the pool
                                                     # contributes 20 so "pool included" is not vacuous.
                                                     # Then KD-63: both clock blocks present, byte-equal to
                                                     # fresh calls, zero non-integer numbers in the golden.

node --experimental-strip-types qa/i7-edges.mjs      # 3 FAIL BY DESIGN. The boundary battery: the interval
                                                     # union at eight boundaries (endpoint-touching,
                                                     # adjacency, containment, three-way, zero-day, leap
                                                     # day, rollovers, pre-epoch); the `today` clamp on its
                                                     # five exact days; the composite key's separator and
                                                     # sentinel; whitespace/NBSP/NFD city names; census
                                                     # invariants; deep-frozen purity and output aliasing;
                                                     # and the year-0001 COST (200 max-span rows in ~2ms,
                                                     # 50k rows in ~224ms). FAILs = R28-4 (negative
                                                     # unattributed), R28-5 (undefined vs null), and the
                                                     # '--' sentinel collision. R28-1 shows up here as a
                                                     # note line and is proved in i7-year / i7-pastyear.

node --experimental-strip-types qa/i7-year.mjs       # 8 FAIL BY DESIGN — R28-1 isolated to two helpers.
                                                     # Date.UTC maps years 0..99 to 1900..1999, and
                                                     # fromDayNumber never pads the year. So
                                                     # dayNumber('0001-01-01') === dayNumber('1901-01-01')
                                                     # and fromDayNumber(dayNumber('0500-06-01')) is
                                                     # "500-06-01", which parseIsoDate — eight lines up in
                                                     # the same file — throws on.

node --experimental-strip-types qa/i7-pastyear.mjs   # 3 FAIL BY DESIGN — R28-1 END TO END. Drives the real
                                                     # client store over the real memory port exactly as
                                                     # PastTripForm does. Year "0202" (a plausible mistype
                                                     # of 2020, and typeable: the field gate is /^\d{4}$/)
                                                     # writes a document whose day ids are "202-01-01" and
                                                     # which fromJSON then permanently refuses. Year "0026"
                                                     # stores 1926 days against a 0026 startDate with
                                                     # validateTrip reporting ZERO issues. Year "2019" is
                                                     # the control and is clean.

node --experimental-strip-types qa/i7-rescan.mjs     # 2 FAIL BY DESIGN — §1 and §2 are ALL OK and close
                                                     # BUILD-NOTES' first two "could not verify" items:
                                                     # the 3->4 rescan against REAL version-3 rows (minted
                                                     # by the shipped tripSummary with `attribution`
                                                     # deleted), and travelStats over a real multi-row
                                                     # library out of storage. §3 is R28-3: between
                                                     # refreshLibrary() and the rescan finishing, a
                                                     # COMPLETED version-3 row throws — and a PLANNED one
                                                     # with the same defect passes silently.

bash qa/i7-faults.sh                                 # The builder's SEVEN injected faults, re-derived from
                                                     # A-31's own wording and re-run in throwaway
                                                     # worktrees, with the WHOLE suite run so the blast
                                                     # radius is measured rather than asserted.
                                                     # M1 pool dropped from the row census   -> 4 red
                                                     # M2 key = nameKey alone                -> 2 red
                                                     # M3 sweep -> naive sum                 -> 2 red
                                                     # M4 today clamp removed                -> 2 red
                                                     # M5 planned rows admitted              -> 5 red
                                                     # M6 duplicate id deduped               -> 1 red
                                                     # M7 sort() without slice()             -> 1 red

bash qa/i7-exit6.sh                                  # EXIT CRITERION 6, MUTATION-TESTED FROM OUTSIDE — R28-2.
                                                     # Eight faults, each alone, each in a worktree.
                                                     # F1 countriesVisited: number on Trip    -> RED
                                                     # F2 daysTravelled: number on a port     -> RED
                                                     # F3 citiesVisited on the row, minted    -> RED (both halves)
                                                     # F4 daysAbroad on the row, minted       -> GREEN  <- hole
                                                     # F5 untyped lifetime-totals const       -> GREEN  <- hole
                                                     # F6 the counts via `type Tally = number`-> GREEN  <- hole
                                                     # F7 a port imports TravelStats          -> RED
                                                     # F8 the counts SPREAD ONTO THE RECORD
                                                     #    written to IndexedDB                -> GREEN  <- R28-2
                                                     # F8 also runs the full 795-test suite (green) and
                                                     # apps/web typecheck (clean) under the fault.
```

Re-run **unmodified** this round: `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known and
pre-existing), `qa/r14-horizon-copy.mjs` **2 FAIL** — and both of those are stale ceilings, not
findings: the §2.10 pin says 73 against a shipped 75 (BUILD-NOTES **KD-65**, nine scripts) and the
KD-id ceiling says 53 against 65. **A FAIL line in `r13`…`r21` that names an export count or a KD
count is drift, not a defect** — R28-8. Everything else in those probes is still green.

Ceilings re-derived by running: `npm run test:tap` **795/0**, `npm run typecheck` clean,
`Object.keys(core).length` **75**, `npm run golden` and `npm run sample` byte-identical (sample sha
`40955ca0b182`), `npm run web:build` clean at **976,160 bytes**, reference summary row **864 bytes**
with **0** coordinate-shaped floats, `grep -rlP '\x00'` over the tree **clean**.

---

## Round 27 (2026-08-28, `master` @ `481b7e8`) — I-6a: A-29's stated-country gate and A-30's `refreshSummary`

Six new probes, two of which need a browser. All run from `cairn/`; `i6a-kd62.sh` builds a
throwaway `git worktree` at `HEAD`, mutates it and removes it — nothing in the working tree is
touched.

```bash
node --experimental-strip-types qa/i6a-gate.mjs         # A-29's gate past the builder's seven inputs:
                                                        # all 2,704 two-ASCII-letter strings against a
                                                        # regex-FREE reading of Part 3; 15 Unicode
                                                        # homoglyph / fullwidth / combining cases; the
                                                        # "uppercase before the regex" trap ('ıl' -> IL);
                                                        # the index's own alphabet; the typo census
                                                        # (R27-3); per-city isolation; a 1,244-pair
                                                        # invariant sweep; the reference trip
node --experimental-strip-types qa/i6a-chain.mjs        # the RUNTIME backstop for §4.3 that KD-62 says
                                                        # needs dataflow analysis: with one chain link
                                                        # parked inside a port mutation, no other port
                                                        # mutation may reach the port. Three parks plus a
                                                        # control. This is R27-2's executable spec
bash qa/i6a-kd62.sh                                     # plants KD-62's thunk mutation in a worktree:
                                                        # typecheck CLEAN, grep GREEN, client suite GREEN
                                                        # (216/216), i6a-chain.mjs RED. §0 is a static
                                                        # census of the live tree for the shape the hole
                                                        # needs — it is ABSENT
node --experimental-strip-types qa/i6a-fence.mjs        # the write fence, scenarios i6-fence.sh does not
                                                        # cover: A open and IDLE (never having written) ·
                                                        # the same assertion given teeth by swapping the
                                                        # PORT for a minting one · two tabs rescanning at
                                                        # once · the CAS racing deleteTrip on the SAME
                                                        # document · the CAS racing a document save, both
                                                        # orders · a rejecting refresh mid-pass
node --experimental-strip-types qa/i6a-bookkeeping.mjs  # R26-1/2/3 re-derived from the FINDINGS' text
                                                        # rather than from the builder's re-expressed
                                                        # probes, with different fixtures. §7 is R27-1
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i6a-idb.mjs
                                                        # apps/web/src/ports/storage.ts EXECUTED against
                                                        # real IndexedDB. Needs NO web build and no
                                                        # tools/serve.mjs — it serves one blank page from
                                                        # an ephemeral port (IndexedDB is unavailable on
                                                        # about:blank) and type-strips the shipped file,
                                                        # whose only imports are `import type`
```

The last one needs `npm run web:build && node tools/serve.mjs` in another shell:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i6a-browser.mjs
                                                        # the same port THROUGH App.tsx's boot: a row
                                                        # knocked back below SUMMARY_VERSION is brought
                                                        # current, the envelope version and document
                                                        # bytes do not move, countrySource reaches real
                                                        # storage, and R26-6's two-tab scenario runs in
                                                        # two real pages
```

`i6a-bookkeeping.mjs` is **3 FAIL** and they are §7 — that is R27-1, and §1–§6 (R26-1, R26-2,
R26-3) must stay green. Every other probe in this round is **ALL OK**. `i6a-kd62.sh` is a report
with no verdict line; read its five headings in order, because the finding is the *combination*
(grep green + suite green + `i6a-chain.mjs` red), not any one of them.

Two notes for whoever runs these next:

- **`i6a-fence.mjs` §1 and §2 deliberately do not flush tab A.** Flushing there makes Y's row
  current, the pass skips Y entirely, and the fence assertion passes for the wrong reason — the
  same class of error KD-61 records against measuring §D over the wrong window. Both sections
  assert the precondition (*both rows below `SUMMARY_VERSION`*) before measuring anything.
- **`i6a-bookkeeping.mjs` §6 starts the delete and awaits it after the release.** KD-60 is real:
  with the end-of-pass install on the chain, `await store.deleteTrip(id)` before releasing a parked
  pass is a **deadlock**, not a failure.

Re-run **unmodified** this round, all accurate, none passing for the wrong reason:
`qa/i6-summary.mjs`, `qa/i6-race.mjs`, `qa/i6-converge.mjs`, `qa/i6-ghostrow.mjs` and
`qa/i6-unreadable.mjs` **ALL OK**; `qa/r7-chain.mjs` **0 FAIL**; `bash qa/i6-ceiling.sh` reds the
structural grep on all three mutations; `bash qa/i6-fence.sh` reproduces both counterfactuals (M-A
**7** tests red, M-B **8** tests red and **7** probe FAILs); `qa/accept.mjs` **28 pass / 0 fail**;
`qa/r2-constraints.mjs` **1 FAIL** (R2-18, known, unchanged). `npm run test:tap` **751/0**,
`npm run typecheck` clean, `Object.keys(core).length` **74** / client **38**, reference trip
**2 / 4 / 11** with `validateTrip` 11 and `geoCheck` 0, `npm run golden` + `npm run sample`
no-diff (source sha `40955ca0b182`), `npm run web:build` clean at **973,783 bytes**.

## Round 26 (2026-08-28, `master` @ `0f52c4c`) — I-6: the widened row and the `SUMMARY_VERSION` rescan

Six new probes. All run from `cairn/`; the two `.sh` ones build a throwaway `git worktree` at
`HEAD`, mutate it, and remove it — nothing in the working tree is touched.

```bash
node --experimental-strip-types qa/i6-summary.mjs     # tripSummary(trip, index): the required-argument
                                                      # throw (8 bad indexes), `null` in the countryCodes
                                                      # aggregation, KD-55's homeBase exclusion, purity,
                                                      # determinism, real-trip shapes, the Europe fixture
bash qa/i6-fence.sh                                   # KD-57 TESTED, NOT BELIEVED. Routes the rescan's
                                                      # non-active write through writeAndSettle in a
                                                      # worktree and shows the fence move to another
                                                      # trip, the spurious conflict, and mergeTrips
                                                      # throwing on the ancestor. Runs i6-fence-probe.mjs
bash qa/i6-ceiling.sh                                 # the §4.3 structural grep, three mutations: a bare
                                                      # async IIFE, a third off-chain call site, and the
                                                      # same write hoisted one frame out of the callback
node --experimental-strip-types qa/i6-race.mjs        # A openTrip mid-pass · B closeTrip on the row being
                                                      # rescanned · C a port-level delete between load and
                                                      # write · D two tabs, the other one conflicted ·
                                                      # E a conflicted active trip · F the in-flight edit ·
                                                      # G doc/activeTripId/persistence untouched ·
                                                      # H a failing port · I three joined passes
node --experimental-strip-types qa/i6-converge.mjs    # is RESCAN_MAX_PASSES = 5 enough? port-call
                                                      # arithmetic, a transient refusal, rows arriving
                                                      # behind the pass, an adversary, an ORPHAN row, 40 rows
node --experimental-strip-types qa/i6-unreadable.mjs  # the `unreadable` report outliving its own subject
node --experimental-strip-types qa/i6-ghostrow.mjs    # R26-1: the off-chain end-of-pass listTrips()
```

`i6-unreadable.mjs` (**4 FAIL**, R26-2) and `i6-ghostrow.mjs` (**1 FAIL**, R26-1) fail by design —
they are the two findings. `i6-summary.mjs`, `i6-race.mjs` and `i6-converge.mjs` are **ALL OK**;
R26-4 and R26-6 are recorded inside `i6-race.mjs` as `note` lines beside passing assertions,
because the behaviour is correct-as-built and the finding is about what it costs. `i6-fence.sh`'s
probe reports **7 FAIL** *inside the mutated worktree* — that is the counterfactual failing, which
is the evidence; against the shipped tree the same probe would be trivially green.

`i6-ghostrow.mjs` models a slow port by reading first and delivering late, which is what an
IndexedDB cursor round trip does. Wrapping `listTrips` so it parks *before* reading does **not**
reproduce it — the window is between the read and the `set`, not before the read.

**Repaired this round, per KD-58** (seven `core.tripSummary(trip)` sites that now hit the
required-argument throw): `attack1.mjs:12`, `p2b-gate.mjs:491`, `r6-flush.mjs:213/252/305`,
`r8-persist.mjs:32`, `r9-ledger.mjs:257` — each gained `, core.COUNTRY_INDEX`. All five scripts
were then re-run against `4eabf08` and `0f52c4c`: FAIL counts identical (**0 / 5 / 1 / 1 / 2**), so
their remaining FAILs are the historic findings each probe exists to demonstrate and none of them
is an I-6 regression.

Re-run **unmodified** this round: `qa/r2-constraints.mjs` **1 FAIL** (the determinism grep's scope,
known and pre-existing), `qa/r2-redact.mjs` 3 "leaks" — all its known false positives
(`OPTIONAL`, `BOOKINGS`), unchanged. `npm run test:tap` **722/0**, `npm run typecheck` clean,
`npm run web:build` clean, `npm run golden` + `npm run sample` byte-identical (sample sha
`40955ca0b182`), `Object.keys(core).length` **74**, `Object.keys(client).length` **38**,
`dist/assets/*.js` 972,580 bytes against 969,414 at `4eabf08`.

---

## Round 25 (2026-08-28, `master` @ `32efd1e`) — the I-5 closure round

Fifth and last round on the geography surface: a confirmation pass over the R24-2 / R24-3 / R24-4
cleanup, not a fresh hunt. **No new probe file.** Three existing ones were extended and two
repaired, which is the point — everything this round needed was already built:

```bash
bash qa/i5c-family.sh                                   # R24-3's regression guard, and a VERDICT
                                                        # now: six mutations that must exit 2, one
                                                        # (G) that must not, and §2's mutation of
                                                        # the guard against the suite
bash qa/i5b-mutants.sh                                  # unchanged rows; default commit now HEAD
node --experimental-strip-types qa/i5c-sweep.mjs        # R24-4 closed: the phase assertion inverted
node --experimental-strip-types qa/i5b-macao.mjs        # §2 now reconciles 22.6 km² against 22.1
```

**Everything on this surface is now green.** `i5c-sweep.mjs` **ALL OK — 25 checks** (it was
1 FAIL by design at round 24, and that FAIL was R24-4); `i5b-macao.mjs`, `i5b-forgiveness.mjs`,
`i5b-predicate.mjs`, `i5c-filter2.mjs`, `i5c-predicate.mjs`, `i5c-thirdsource.mjs` and
`i5-order.mjs` all **ALL OK / 0 FAIL**; `i5b-neighbour.mjs` is **2 FAIL**, both the artefacts of
the source layer round 24 explained (`MF`→`SX` at 1:50m, Alofi's `ISO_A2`); `i5-fillscale.mjs` is
still **1 FAIL by design** (R22-2, open, untouched by I-5c). `i5b-mutants.sh` exits 0 with every
one of its 26 mutations applying and a **29 pass** baseline.

**What changed in the three files, and why a breaker rather than a builder changed them.** All
three are `qa/`, which is QA's own; the builder's I-5c cleanup pass correctly declined to touch
them and disclosed the fact.

- **`qa/i5c-family.sh`** — round 24 wrote it as a report whose case **B** exited 0, and B exiting 0
  *was* R24-3. B now exits 2, so the narrative around it was describing a fixed bug in the present
  tense. Rewritten as the finding's **regression guard**: cases **A**–**F** must all exit 2 before
  fetching (D, E and F are new: an unpinned scale in `FAMILY`, a repeated scale, and byte pins
  swapped without reordering `FAMILY`), the script exits non-zero if any of them does not, and
  case **G** — `FAMILY = ['10m']`, which both assertions pass — is the one remaining hole, R25-2.
  Default commit is now `HEAD`, not `99c2e84`. A new **§2** mutates each arm of the guard in the
  real generator and re-runs `test/forgiveness.test.ts`: two arms turn a test red, the third turns
  **none** red, which is R25-3.
- **`qa/i5b-mutants.sh`** — its rows were **not** stale, contrary to what BUILD-NOTES still says:
  round 24 repaired them and this round re-ran them against `32efd1e` with every mutation applying.
  Only the default commit was stale (`99c2e84` → `HEAD`), and the header now records the measured
  result rather than the disclosure it inherited.
- **`qa/i5c-sweep.mjs`** §4 — probe rot introduced by the R24-4 fix, exactly as intended. The
  assertion read *"the 0.005° cell count is phase-INDEPENDENT, as BUILD-NOTES claims"*; BUILD-NOTES
  no longer claims it, so the assertion is **inverted** rather than deleted — the 76–82 spread is
  now the thing being asserted. §4 also computes the ring's area under *both* sets of Earth
  constants, which is half of the reconciliation below.
- **`qa/i5b-macao.mjs`** §2 — extended with the other half. The two figures on record for `MO`'s
  removed ring were never two measurements of one quantity: **22.1 km²** (round 24, A-28) is the
  ground *the 1:10m layer calls China* that stopped answering `MO`; **22.6 km²** (BUILD-NOTES) is
  *all* ground that stopped answering it. `90,991 = 89,286 + 1,705` cells, the 1,705 being
  Pearl-estuary water inside a coarse 1:50m coastline — **1.87 %**, which is the builder's "~2 %
  gap". Asserted now, so it cannot be reopened a third time.

`i5c-family.sh` case **G** and §2 need no network for the six guarded cases (they exit before any
fetch); G itself runs the generator to completion and prints SKIP if the pinned layers are
unreachable. §2 runs the suite four times and the whole script takes ~18 s.

---

## Round 24 (2026-08-28, `master` @ `99c2e84`) — the I-5c breaker pass on A-28's second arm

Fourth round on the geography surface, and the first that found nothing wrong with the mechanism.
Five new probes, run from `cairn/`:

```bash
node --experimental-strip-types qa/i5c-sweep.mjs        # offline: the I-5b → I-5c delta, and BOTH
                                                        # sweeps re-derived with the grid's phase
                                                        # stepped through the cell
node --experimental-strip-types qa/i5c-filter2.mjs      # network: the two arms in isolation on
                                                        # synthetic rings, then A-28 Part 4's census
                                                        # rebuilt from the pinned layers
node --experimental-strip-types qa/i5c-predicate.mjs    # offline: 21 fresh adversarial ring pairs,
                                                        # a raster differential, and R23-3's two
                                                        # remaining arithmetic mutants
node --experimental-strip-types qa/i5c-thirdsource.mjs  # network: every one of the 983 recorded
                                                        # thirdSource answers re-derived from the
                                                        # raw 1:10m layer
bash qa/i5c-family.sh                                   # R24-3: three mutations of FAMILY/FILL —
                                                        # a report, no verdict
bash qa/i5b-mutants.sh                                  # 26 mutants of the REAL tools/forgiveness.mjs,
                                                        # REPAIRED for the two-arm source (below)
```

`i5c-sweep.mjs` is **1 FAIL by design** (R24-4 — the 0.005° count is not phase-independent).
`i5c-filter2.mjs`, `i5c-predicate.mjs` and `i5c-thirdsource.mjs` must be **ALL OK**.
`i5c-family.sh` prints no verdict: its case **B** exiting 0 *is* R24-3.

The network probes reuse `$TMPDIR/cairn-qa-ne/` — the same cache rounds 22 and 23 fill — and print
`SKIP` for the affected section rather than a false pass if the fetch is blocked. `i5c-sweep.mjs`
takes about two minutes for §2; set `I5C_SKIP_FULL=1` to skip that one section while iterating.
Nothing under `cairn/` is written by any of them except `i5b-mutants.sh` and `i5c-family.sh`, which
write only inside a `git worktree` they then remove.

What each probe covers:

| probe | § | what it measures |
|---|---|---|
| `i5c-sweep` | 1 | the two artefacts and the multiset difference between them — one entry, one 9-vertex ring, `MO`'s, nothing added; and **why the "54 forgiveness boxes" is an ambiguous sweep geometry** (48 of the recorded positions are the *first* entry of their code) |
| | 2 | 14,926,301 cells at 0.02° over the recorded boxes → 4 changed, all `MO` → `null` |
| | 3 | the phase family: 5,5,4,4,4,5,6,5,6,5 — and the two anchors on record giving 4 and 5 for identical ground |
| | 4 | the 0.005° sweep, its own phase spread (76–82), the ring's equal-area shoelace (22.7 km²), and the named coordinates both ways |
| | 5 | the reference trip's 226 coordinate-bearing records, both artefacts, 0 changed |
| `i5c-filter2` | 1 | eight synthetic cases isolating each arm: 2a-only, 2b-only, both, neither, filter 1's precedence, the empty-population throw, cross-arm independence, and self-exclusion |
| | 2 | A-28 Part 4's census rebuilt from the pinned layers: 153 candidates, 151 past filter 1, exactly 4 disagreements |
| | 3 | **new** — the 13 code-**less** 1:10m features neither arm's population can see, and whether any admitted ring touches one (none does) |
| `i5c-predicate` | 1 | 21 hand-built pairs, none of them round 23's or the shipped test's |
| | 2 | 2,000 randomised simple pairs against a raster reference sharing no code with `overlaps()` |
| | 3 | R23-3's `insideRing` strictness mutant over 500,000 pairs — 0 disagreements, an equivalent mutant |
| | 4 | R23-3's `prepRing` truncation mutant — observable, and the new fixture that catches it |
| | 5 | the self-intersection census under the narrowed claim |
| `i5c-thirdsource` | 1 | the block's shape and whether every probe lies inside the ring it is filed against |
| | 2 | **all 983 recorded answers re-derived from the raw 1:10m layer** — the only check that can tell a true third-source record from a plausible one |
| | 3 | the `MO` record: 8 probes, `CN` at 1:10m, `null` in the shipped index |
| | 4 | what the block costs in bytes, what reads it, and that no part of it reaches the bundle |

**`qa/i5b-mutants.sh` — repaired, and the repair is structural.** Five rows (not the four
BUILD-NOTES discloses) matched no source text after I-5c renamed `filter2` to `filter2a`/`filter2b`
and deleted the vertex means. A `perl -0pi -e 's///'` that matches nothing exits 0, so those rows
ran an **unmutated** module and printed `fail=0`. The rows are now re-expressed against the two-arm
source, eight rows were added for A-28's own machinery (each arm, the arm **order**, the `against`
label, the empty-population guard, an emptied 2b population, a `floor` variant of the rounding
mutant), and **every mutation is verified to have applied** — `mutate` diffs against a pristine
copy, prints `MUTATION DID NOT APPLY` for a stale row, and the script exits non-zero if any row is
stale. Default commit is now `99c2e84`.

**QA pin repairs this round (probe rot, introduced by I-5c as intended).**

- `qa/i5b-forgiveness.mjs` — 7 pins (54→53 positions, 11→12 drops with the arm split asserted,
  293→292 entries, 54→53 duplicate-code entries, 1,034→1,033 rings, 22,229→22,220 points).
  **ALL OK**, and its §4 C-notch case — round 23's R23-2 failure — is green.
- `qa/i5b-predicate.mjs` — the 54→53 split, and §3's blast-radius diff re-expressed: that
  simulation is A-27's *one-arm* filter 2, so exactly one shipped decision is unreproducible from
  the coverage-only index and it must be `MO`'s. Asserted by name. §1's three R23-2 counterexamples
  are green. **ALL OK.**
- `qa/i5b-macao.mjs` — **threw** at `99c2e84` (it dereferenced an entry that no longer exists).
  Rewritten as R23-1's regression guard: the "before" is now the I-5b artefact from
  `git show 38d23c9:…`, §1 asserts `MO` is refused **by arm 2b naming CN**, and §2 measures the
  89,286 sample cells that answered `MO` at I-5b against the 0 that do now (≈22.1 km²). **ALL OK.**
- `qa/i5b-neighbour.mjs` — 142→141 admitted rings, and §4's heading 10→11 refused codes. Now
  **2 FAIL**, both previously explained and neither a defect: `MF`→`SX` at 1:50m (a same-scale
  artefact of the source layer) and Alofi's `ISO_A2` being `NZ`. Its §1 `MO`→`CN` line — the sweep
  that filed R23-1 — is **green**.
- `qa/i5-order.mjs` — 118→117 added entries, and `EMITTED_BYTES` is now **read from
  `0-countryBudget.test.ts`** instead of hardcoded, with an added assertion that the pin is exact
  rather than a loose ceiling. It has rotted on this number three times; it cannot a fourth.
  **0 FAIL.**

`qa/i5-fillscale.mjs` needed no repair and is still **1 FAIL by design** (R22-2, open, and A-28
deliberately does not touch it).

**Not touched, and not routed to this round:** breaker-board items **B-1**…**B-4**.
`qa/r11-recheck.mjs` still throws at line 243 and `qa/p2b-gate.mjs` is still 5 FAIL.

---

## Round 23 (2026-08-28, `master` @ `38d23c9`) — the I-5b breaker pass on A-27's forgiveness entry

Second round on the geography surface. Five new probes, run from `cairn/`:

```bash
node --experimental-strip-types qa/i5b-forgiveness.mjs  # offline: additivity, composition, double
                                                        # coverage, the predicate, the drops fixture,
                                                        # artefact hygiene, the regression sweeps
node --experimental-strip-types qa/i5b-predicate.mjs    # offline: is overlaps() "exact for simple
                                                        # rings"? (R23-2) and does it change any
                                                        # shipped decision? (no)
node --experimental-strip-types qa/i5b-neighbour.mjs    # network: the two filters re-asked against
                                                        # the 1:10m and 1:50m layers they never saw
node --experimental-strip-types qa/i5b-macao.mjs        # network: R23-1, isolated and measured
bash qa/i5b-mutants.sh                                  # 18 mutants of the REAL tools/forgiveness.mjs,
                                                        # in a throwaway worktree — a report, no verdict
```

`i5b-forgiveness.mjs` is **1 FAIL by design** (R23-2, the C-notch false positive).
`i5b-predicate.mjs` is **3 FAIL by design** (R23-2's three counterexamples).
`i5b-neighbour.mjs` is **3 FAIL** — two are R23-1 (`MO`→`CN` at 1:10m and at 1:50m) and the third is
a Natural Earth labelling artefact (Alofi's `ISO_A2` is `NZ`, its `ADM0NAME` is `Niue`), explained
in the finding's "could not break" list so the next round does not re-derive it.
`i5b-macao.mjs` is **2 FAIL by design** (R23-1). Everything else in all four must stay at 0.

The two network probes fetch the three pinned `nvkelso/natural-earth-vector@v5.1.2` admin-0 layers
into `$TMPDIR/cairn-qa-ne/`, verify each against the checksum `tools/gen-countries.mjs` pins, cache
them, and print `SKIP` rather than a false pass if the egress proxy blocks the fetch.
`i5b-macao.mjs` additionally reconstructs the **pre-I-5b index** from the shipped payload by
removing the 54 positions `fixtures/golden/forgiveness-drops.json` records — no `git show` needed,
which is what makes the before/after columns trustworthy. Nothing under `cairn/` is written by any
of them except `i5b-mutants.sh`, which writes only inside a `git worktree` it then removes.

What each section covers:

| probe | § | what it measures |
|---|---|---|
| `i5b-forgiveness` | 1 | **additivity** — strip the 54 recorded positions from the packed literal and compare to `git show b6200e6:…`; also the in-order byte-identical-subsequence check, independent of the fixture |
| | 2 | **composition** — 70,712 points chosen *inside* the 54 forgiveness entries' own rings (not capitals); every one must resolve to that entry's code, and no forgiveness entry may be preceded by an overlapping entry of another code |
| | 3 | **double coverage** — every forgiveness entry against every other shipped entry, including *other forgiveness entries*, which filter 2 never saw (A-27 Part 6 residue 3) |
| | 4 | `overlaps()` — 12 hand-built adversarial pairs, 4,000 randomised pairs against an independent area-sampling reference, and a self-intersection census of the whole artefact |
| | 5 | the drops fixture: 11 drops, 2 by filter 1 / 9 by filter 2, and where the two filter-1 drops actually are |
| | 6 | artefact hygiene — 239 distinct codes over 293 entries, no code three times, 1,034 rings, 22,229 points, ring hygiene, ascending area by an independent formula |
| | 7 | regression — 14,926,301 cells at 0.02° over the 54 padded boxes (704 gained, 0 lost, 0 switched) and a global sweep at **0.29° / offset 0.11** |
| | 8 | the reference trip's coordinate-bearing records, both indexes, 0 changed |
| `i5b-predicate` | 1 | the counterexamples to *"exact for simple rings"* — a C-shape notch and a horseshoe bay, both directions |
| | 2 | are the vertex-mean probes ever load-bearing? (20,000 randomised pairs: no) |
| | 3 | **blast radius** — both filters re-run over all 153 candidate rings with a mean-free predicate; 0 of 153 decisions change |
| | 4 | direction of harm, and how many coverage entries have a ring whose vertex mean falls outside it (28 of 239) |
| `i5b-neighbour` | 1 | all 142 admitted rings against all 239 codes of the **1:10m** layer and all 237 of the 1:50m — this is what finds R23-1 |
| | 2 | `ne_10m_populated_places` as a third opinion: does an admitted ring contain another country's settlement? |
| | 3 | filter 1's two drops re-examined against the raw layers — quantisation artefact, or genuinely somewhere else? |
| | 4 | the 10 refused codes; `GI`/`UM` genuinely absent at 1:50m; the 1:110m layer carries none of the 64 filled codes |
| `i5b-macao` | 1–4 | R23-1 isolated: the missing code in A-27's own list, the km² of Chinese mainland, named coordinates before and after, and the 1:110m-vs-1:10m cell counts that explain why filter 2 could not see it |

**QA pin repairs this round (probe rot, introduced by I-5b as intended).** `qa/i5-order.mjs` had
five assertions pinned to the pre-A-27 artefact and was **5 FAIL** at `38d23c9`; all five are
re-expressed against what A-27 made true and it is **ALL OK** again:

- §2 `new Set(codes).size === codes.length` — deliberately false now (54 codes carry two entries).
  Replaced by the property it was really asserting: **no two entries tie on `(area, code)`**, so the
  comparator is still a total order and `Array.sort` stability is still unreachable. Plus a
  `239 distinct over 293` count.
- §3 `+64 codes` → **`+118` entries** (64 fill from I-5a, 54 forgiveness from I-5b).
- §5 the ten-pair overlap census — same-code pairs now overlap **by design** (filter 1 requires it)
  and carry the same answer, so they are separated out and reported, and the assertion is on the
  **cross-code** list, which is still exactly **10**. A new assertion checks that every same-code
  pair belongs to a *filled* code, i.e. A-27 touched nothing the base carries.
- §8 `EMITTED_BYTES` 346,455 → **374,826**, and R22-4's guard 1 no longer exists: it was replaced by
  guard 1a (statements after the header, 579/1,500) and guard 1b (header prose with ISO code runs
  subtracted, 3,293/6,000). The assertion is now a headroom check on both — **921 and 2,707 bytes**,
  so R22-4 is confirmed closed by the probe that filed it.

`qa/i5-fillscale.mjs` needed no numeric repair — its §1 (R22-1) went green on its own, which is the
cleanest possible confirmation that I-5b fixed the finding it was written for. Its §3 finding id was
mislabelled **R22-3**; corrected to **R22-2** (R22-3 is the `derive/country.ts` docstring finding).
§2's header no longer claims a finding id it never had. §3 is still **1 FAIL by design** — R22-2 is
open and A-27 deliberately does not touch it.

**Not touched, and not routed to this round:** breaker-board items **B-1**…**B-4**.
`qa/r11-recheck.mjs` still throws at line 243 and `qa/p2b-gate.mjs` is still 5 FAIL.

---

## Round 22 (2026-08-28, `master` @ `b6200e6`) — the I-5 / I-5a breaker pass on A-26's country index

First round on the geography surface. Two new probes, run from `cairn/`:

```bash
node --experimental-strip-types qa/i5-order.mjs      # offline: order, determinism, non-regression,
                                                     # double coverage, ray casting, KD-52, the budget guards
node --experimental-strip-types qa/i5-fillscale.mjs  # network: the fill-scale measurement (R22-1),
                                                     # country-holes.json vs raw Natural Earth, quantisation (R22-2)
```

`i5-order.mjs` is **1 FAIL by design** (R22-4 — guard 1 has 140 bytes of headroom).
`i5-fillscale.mjs` is **2 FAIL by design** (R22-1, R22-2). Everything else in both must stay at 0.

`i5-fillscale.mjs` fetches the three pinned `nvkelso/natural-earth-vector@v5.1.2` admin-0 layers
into `$TMPDIR/cairn-ne-v5.1.2/`, verifies each against the checksum `tools/gen-countries.mjs`
pins, and caches them. If the egress proxy blocks the fetch it prints `SKIP` per section rather
than a false pass. Nothing under `cairn/` is written by either probe.

What each section covers:

| probe | § | what it measures |
|---|---|---|
| `i5-order` | 1 | the emitted order re-derived with a **different** area formula (Lambert equal-area shoelace vs the generator's Chamberlain–Duquette); 0 violations, 0 ties, `VA` first / `RU` last |
| | 2 | ordering determinism — unique codes ⇒ total order, 20 seeded permutations re-sort identically, no `NaN` area |
| | 3 | the structural non-regression proof: all 175 pre-I-5a entries present with **byte-identical rings**, so `country → null` is impossible by construction |
| | 4 | a global grid sweep at **0.31° / offset 0.07** (deliberately not the builder's 0.25°) against `git show 897b928:…` — 674,541 cells, 0 worse |
| | 5 | double coverage: exactly **ten** overlapping pairs on Earth, contested area in km², and who wins each |
| | 6 | ray casting — an opposite-direction (−∞) implementation on 1,225,395 cells; holes via single-country indices; antimeridian; poles; malformed input; ring hygiene; self-intersection census |
| | 7 | KD-52 — the Vatican patch mapped, its four one-step neighbours, St Peter's, and the seven ring vertices |
| | 8 | the budget test's three guards and their measured headroom |
| `i5-fillscale` | 1 | **R22-1** — all 64 filled codes probed at their capital; the misses re-tested at 1:50m and 1:110m; the per-code 10m-vs-50m coverage ratio |
| | 2 | `country-holes.json`'s seven `resolvesAt` values re-derived from the raw layers, quantised **and** unquantised |
| | 3 | **R22-2** — where the nine self-intersecting rings come from, and the bounded damage |

**QA pin repairs this round (probe rot, pre-existing since I-5 at `897b928`).** Nine probes pinned
`Object.keys(core).length === 71`; I-5 added `countryOf` and `COUNTRY_INDEX`, so the surface is
**73**. `qa/r13-gate-citykey.mjs` §7 also pinned §2.10's own enumerated group sum at 71 (the
document already says 73), and `qa/r14-horizon-copy.mjs` §7 pinned `kds.length === 50` (BUILD-NOTES
now holds 53: KD-51 from I-5, KD-52 and KD-53 from I-5a). All brought current — one number each,
never relaxed to `>=`, each with a dated comment. After the repair: `r13` `r14` `r15` `r16` `r17`
`r18` `r19` `r20` **ALL OK**; `r21-closure.mjs` **1 FAIL**, which is R21-1 and is by design.

**Not touched, and not routed to this round:** breaker-board items **B-1**…**B-4**.
`qa/r11-recheck.mjs` still throws at line 243 and `qa/p2b-gate.mjs` is still 5 FAIL.

---

## Round 21 (2026-08-28, `master` @ `020ee37`) — the closure round on A-25

**A-25 Part 6 does not ask for a fresh hunt.** It states a **criterion** in six clauses and says
the `copyStop.ts` read-once / credential-boundary arc is *"closed for I-4a's ship gate once round
21 confirms the criterion"*, with a deliberately narrow re-opening condition: *a multi-read the
shipped census structurally cannot see, of a value that crosses a person boundary or decides where
a crossed record is filed.* Round 21 re-derived all six clauses independently and attacked the
re-opening condition directly. **All six hold. Nothing found meets the re-opening condition. The
arc is CLOSED.**

```bash
node --experimental-strip-types qa/r21-closure.mjs
        # §1  clause 1 — ceilings: 71 exports, 2/4/11, 11 validateTrip issues, sample
        #     sha 40955ca0b182, 8 ALLOWED / 15 rows / 9 roots / 4 tests / 0 exports,
        #     determinism, zero-dep core, no fixture literal in apps/web/dist.  (0 FAIL)
        # §2  clause 2 — the `City.order` hoist BOTH ways, from the shipped tree: with
        #     it reverted, assertion 1 reds naming EXACTLY `15 · … : tgtCity1.order ×2`;
        #     with the eighth ALLOWED entry ALSO removed, exactly that plus the
        #     builder's disclosed `tgtCity0.key ×2` (row 9); applied, all eight
        #     observed at exactly 2, and the eighth is tight at max 1 and 3.    (0 FAIL)
        # §3  clause 3 — the structural preconditions; the mutation is r21-clause3.sh.
        # §4  clause 4 — the meta/homeBase plants GREEN at 3d1be3b and RED at A-25;
        #     DECLARED_NULLS empty; a null sweep over EVERY root of EVERY row (not the
        #     seven the shipped test visits) finds nulls only on rows 5/11/14, the
        #     three deliberately non-maximal rows; no empty-container vacancy. (0 FAIL)
        # §5  clause 5 — 8 entries, all max 2, A-24's seven byte-identical.     (0 FAIL)
        # §6  clause 6 — a fully opened census over all 15 rows prints classes A, B and
        #     C and nothing else; `tgtTrip.cities.<n>.order` is gone.
        #     R21-1: Part 5's class-A enumeration is complete by CLASS and short by
        #     three INSTANCES.                                          (1 FAIL by design)
        # §6b the classification the A-25 builder routed, settled by measurement: a
        #     flipping City ROW produces an outcome BYTE-IDENTICAL to the already-
        #     ALLOWED `tgtCity0.key ×2` field flip, so it is the accepted class and not
        #     a worse one; flipping to a city the target lacks is strictly MORE
        #     visible (`unknown_city_key`, an error).                           (0 FAIL)
        # §7  the fresh attack — 22 document shapes no row of the fifteen builds, run
        #     through both censuses. 0 throws, 0 unnamed multi-reads inside the roots,
        #     0 paths outside the accounted set, and the source's `homeBase` /
        #     `meta.poolNotes` read ZERO times and absent from the recipient.   (0 FAIL)

bash qa/r21-clause3.sh     # clause 3's four steps, in a throwaway `git worktree`:
        # 1. add `Stop.voucher`, written by makeStop only when truthy
        # 2. `npm run typecheck` fails at TWO sites (round 20 measured ONE):
        #    copyStop.test.ts(1256,7) and readOnce.test.ts(197,7), both TS2741
        # 3. satisfy both maps -> typecheck clean, census fixture test STILL RED
        # 4. populate the fixture -> 4/4 green; plant R19-5's shape -> assertion 1
        #    reds with `srcStop.voucher ×3` on 14 of 15 rows (row 14 is minimal)
```

**Three probes were re-expressed under A-19 assertion 7 and are now ALL OK.**
`qa/r14-horizon-copy.mjs` §7's KD ceiling 49 → **50** (that was R20-5, explicitly QA's).
`qa/r19-census-gaps.mjs` §7.2's *"seven `ALLOWED` entries and no eighth"* → **eight and no ninth**,
plus a new line pinning that every one is still `max: 2` (A-25 Part 6 clause 5).
`qa/r20-census-reach.mjs` §2 and §5 stopped measuring **QA's own local copy** of the fixtures and
of A-24's residue prose — the exact staleness mode that has now bitten `r18`, `r19` and `r20` in
turn — and §4's message-family line now pins A-25 Part 5's *ruled* state instead of asserting the
symmetry the architect declined. **`r21-closure.mjs` avoids the mode entirely**: it derives an
importable module from the shipped `readOnce.test.ts` in `os.tmpdir()`, so its census, fixtures,
matrix and allow-list are the shipped ones by construction and cannot drift.

Re-run **unmodified** this round: `qa/r15-place-copy.mjs` **ALL OK**, `qa/r16-copy-depth.mjs`
**ALL OK**, `qa/r17-hours-parser.mjs` **ALL OK**, `qa/r18-readonce.mjs` **ALL OK**,
`qa/r2-copy.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL**. `npm run test:tap` **620/0** with all four
`readOnce.test.ts` tests inside it (505–508), `npm run typecheck` clean (both projects),
`npm run web:build` clean, `npm run golden` + `npm run sample` byte-identical, `git status` at the
repo root empty.

---

## Round 20 (2026-08-28, `master` @ `3d1be3b`) — the A-24 / R19-1 / R19-2 / KD-50 breaker pass

> **Superseded in round 21.** All five of R20-1…R20-5 are closed by A-25 and by QA's own ceiling
> re-expression, and `qa/r20-census-reach.mjs` is **ALL OK** — its §2, §4 and §5 were re-expressed
> to pin the closed state rather than the open finding. The block below records what round 20
> found; read `r20-census-reach.mjs`'s own docstring for what it measures **now**.

Narrow: the diff `63a14d7..3d1be3b` under `packages/` — `build/copyStop.ts`,
`test/copyStop.test.ts` (85 → 88) and `test/readOnce.test.ts` (10 rows → 14, 5 `ALLOWED` → 7,
fixture 14/15 → 15/15 `Stop` fields) — plus `docs/BUILD-NOTES.md`'s **KD-50**. Seventh consecutive
round on `copyStop.ts`'s read-once / credential-boundary class.

```bash
node --experimental-strip-types qa/r20-census-reach.mjs
        # §1  R20-1 — A-24's amended maintenance rule ("the fixture populating every
        #     field of both records is part of this contract") is UNENFORCED. Nothing
        #     ties `readOnce.test.ts`'s fixture to `keyof Stop` / `keyof Place`, and
        #     `copyStop.test.ts`'s STOP_FIELDS assertion filters `ticket` OUT, so it
        #     pins a different fixture to a different list.                     (1 FAIL)
        # §2  R20-2 — the same gap one record UP, created by A-24 Part 1 itself: the
        #     two new `Trip` roots carry 17 of `Trip`'s 18 keys. `meta` is ABSENT and
        #     `homeBase` is `null`, so `Trip.meta` may be multi-read invisibly and the
        #     `homeBase.at` subtree (a named home coordinate) is never entered.  (2 FAIL)
        #     ...and the closing line proves the FIX costs no eighth `ALLOWED` entry:
        #     ten further document shapes, both fields populated, still green.  (0 FAIL)
        # §3  R20-3 — `copyStop.ts:357` reads a TARGET `City.order` twice in
        #     `refileCityKey`'s step-4 fold (compared, then recorded), so A-16's
        #     tie-break is decided on a number the winning record does not carry.
        #     With three same-named target cities the `Place` is mis-filed.      (2 FAIL)
        # §4  KD-50 — the builder's two disclosed consequences, CHECKED: the message,
        #     the id draws (2 / 1 / 0-written), the target byte-identical behind the
        #     refusal, and the refuse-then-retry. Safe, with one cosmetic residue —
        #     the three refusals no longer share a message family.               (1 FAIL)
        # §5  R20-4 — A-24 Part 1's residue paragraph names TWO invisible multi-reads;
        #     a fully-opened census finds FIVE, and two of the three it does not name
        #     produce a divergent record rather than only a count.                (1 FAIL)
        # §6  R20-5 — `qa/r14-horizon-copy.mjs` §7 pins `kds.length === 49`; this pass
        #     minted KD-50, so a probe that was ALL OK at `215aeee` is 1 FAIL, while
        #     BUILD-NOTES says "nothing in this pass went unrun".                 (1 FAIL)
        # §7  Ceilings, `cairn-constraints`, and the attack list that did NOT break —
        #     including all 143 reference-trip stops copied into a fresh trip with 0
        #     throws and 0 credential/ticket crossings.                           (0 FAIL)
```

**8 FAIL by design.** Every other line is a confirmation that must stay at 0. Deterministic call
sequences only, no races and no sleeps. No second checkout needed.

**`qa/r19-census-gaps.mjs` is re-expressed and now ALL OK.** It was 12 FAIL by design at
`215aeee` and 8 FAIL unedited at `3d1be3b`; the builder correctly reported that all 8 were
measured against **QA's own local copy of the pre-A-24 census** and refused to touch a file
A-19 assertion 7 assigns to QA. Round 20 brought it current:

- `a23Source` → `a24Source` (gains `ticket` and a `pool` option) plus a new `a24Minimal`;
- the matrix **10 rows → 14**, with rows 1–10 unchanged in construction and numbering so the
  cross-check against `readOnce.test.ts` stays row-by-row;
- `censusTrip` / `TRIP_SKELETON` copied from A-24 Part 1, so the two `Trip` documents are roots
  rather than members of `opaque`;
- `ALLOWED` **5 → 7** (`tgtTrip.id`, `tgtTrip.revision`);
- §1, §2, §4 and §5 re-expressed from *"here is the gap"* to *"here is the closure"*, each with
  this file's own flipping accessors rather than the builder's tests.

**Nothing in those 8 was a genuine gap once the probe was current** — every one closed on
re-expression. Round 20's own findings are in `r20-census-reach.mjs`, not here.

Every mutation below was made in a throwaway `git worktree add … 3d1be3b` and discarded — nothing
under `cairn/` was ever written by one, and the worktree was removed. Baseline `readOnce.test.ts`
2/2, `copyStop.test.ts` 88/88 and `npm run test:tap` 618/0 before and after each. `RO` is
`readOnce.test.ts`, `CS` is `copyStop.test.ts`, `ALL` is `npm run test:tap`:

```bash
# A-24's own acceptance check, both directions
# `git show 63a14d7:…/copyStop.ts` under the SHIPPED test  RO red: `srcTrip.id ×2` on 11 of 14
#                                                            rows; rows 6/7/8 correctly show 1
# as shipped                                               RO 2/2 green, all 7 ALLOWED at max
# the two ALLOWED entries A-24 added, both directions
# `tgtTrip.id`       max: 2 -> 1                           RO red (BOTH assertions)
# `tgtTrip.id`       max: 2 -> 3                           RO red (assertion 2 only)
# `tgtTrip.revision` max: 2 -> 1                           RO red (BOTH assertions)
# `tgtTrip.revision` max: 2 -> 3                           RO red (assertion 2 only)
# R20-1 — the maintenance rule, in four steps
# 1. add `voucher?: { code: string }` to `Stop`            typecheck red at ONE site:
#    (written by makeStop only when truthy)                  copyStop.test.ts:1256 TS2741
# 2. satisfy it as a builder would (STOP_FIELDS +          typecheck clean, ALL 618/618 green,
#    STOP_FIELDS_THAT_CROSS)                                 RO fixture never touched
# 3. plant R19-5's shape on the new field                  RO 2/2 GREEN  <- R20-1
# R20-2 — the `Trip` roots' own fixture
# double-read `Trip.meta` on BOTH documents                RO green  CS green  ALL 618/618
# R18-5's hybrid shape on `sourceTrip.homeBase.at`         RO green  CS green  ALL 618/618
# ...the SAME two plants with the fixture populating       RO RED: `srcTrip.homeBase ×3`,
#    `homeBase` and `meta`                                   `srcTrip.homeBase.at ×2`,
#                                                            `srcTrip.meta ×2`   <- the fix
# an eighth multi-read in the product code — 22 shapes     none found, 0 throws
```

Re-run **unmodified** this round: `qa/r15-place-copy.mjs` **ALL OK**, `qa/r16-copy-depth.mjs`
**ALL OK**, `qa/r17-hours-parser.mjs` **ALL OK**, `qa/r18-readonce.mjs` **ALL OK**,
`qa/r2-copy.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL**, `qa/accept.mjs` **28 pass / 0 fail**,
`qa/r2-constraints.mjs` **1 FAIL** (R2-18, known), `qa/r2-redact.mjs` unchanged (its two known
non-credential words, KD-27). **`qa/r14-horizon-copy.mjs` is 1 FAIL** — that is **R20-5**, new
this pass, and the one-character ceiling re-expression is deliberately *not* done here: this
round's brief lists the `qa/` files it may edit and `r14-horizon-copy.mjs` is not among them.
`npm run test:tap` 618/0, `npm run typecheck` clean, `npm run web:build` clean, `npm run golden`
+ `npm run sample` byte-identical (sample sha `40955ca0b182`), `Object.keys(core).length` 71,
reference trip 2/4/11 and 11 `validateTrip` issues.

Note for whoever reads `r20-census-reach.mjs` §2 or §3 first: both need an **accessor property on
a caller-supplied value**, the same population bound as every read-once finding since round 16,
which is why they are MINOR. **§1, §5 and §6 do not** — they are gaps in a guard and in a
disclosure, each demonstrated by planting something the guard or the report should have caught and
measuring that it did not.

---

## Round 19 (2026-08-28, `master` @ `215aeee`) — the A-22 / A-23 breaker pass

> **Superseded in round 20.** `qa/r19-census-gaps.mjs` no longer matches the block below: it was
> re-expressed at `3d1be3b` onto the shipped A-24 census (14 rows, `censusTrip`, 7 `ALLOWED`
> entries) and is now **ALL OK**, with §1/§2/§4/§5 asserting the *closure* of R19-1…R19-5 rather
> than the gap. The section below is kept as the record of what the probe measured at `215aeee`.

Narrow: the diff `993d8fc..215aeee` under `packages/` only — `build/copyStop.ts`,
`test/copyStop.test.ts` (80 → 85) and the new **`test/readOnce.test.ts`** (A-23's standing
census, +2). Nothing else was re-litigated.

```bash
node --experimental-strip-types qa/r19-census-gaps.mjs
        # §1  R19-1 — `source.trip.id` is read TWICE on the SHIPPED tree: read 1 is the
        #     credit (`origin.sourceTripId`), read 2 is A-16 step 2's `source.id ===
        #     target.id`. A-22 Part 1 hoisted the CONTAINER and left the FIELD.  (2 FAIL)
        #     §1.2 the harm, measured: step 2 fires on a city-key COINCIDENCE and a
        #          Vienna `Place` lands filed under the recipient's PRAGUE city;
        #          `validateTrip` 0 issues; a `Place` carries no provenance (A-6)
        # §2  R19-2 — the recipient's own `Day.id` read twice across `copyStopInto` ->
        #     `addStop`: the guard passes, `withDay` then throws `no such day`  (2 FAIL)
        # §3  R19-3 — A-23's `opaque` set holds both whole `Trip`s, so no field of either
        #     document's own record can ever reach the offender list; and the ruling's
        #     stated reason ("the document skeleton rather than values that cross") is
        #     FALSE for `Trip.id`/`Trip.ownerId`, which cross into `origin`     (2 FAIL)
        #     §3.1 first cross-checks QA's copy of the census against the shipped
        #          `readOnce.test.ts` — A-23 says a divergence is itself a finding (0 FAIL)
        # §4  R19-4 — the matrix's reach: row 5 does NOT deliver `placeForCopy`'s
        #     `at === null` (the reuse branch short-circuits it), and A-16 step 2, a
        #     POOLED source stop and the absent-optional-field arms are unreached (4 FAIL)
        # §5  R19-5 — `Stop.ticket` is invisible: the census enumerates the fixture's
        #     keys and A-23's fixture list omits the one field §6.6 calls a
        #     credential                                                        (2 FAIL)
        # §6  R19-6 — A-23's printed `srcPlace.at.lat ×3` is ×4, re-derived; cosmetic,
        #     which is what this line CONFIRMS                                  (0 FAIL)
        # §7  what A-23 does catch (20 mutations), ceilings, `cairn-constraints`,
        #     the read-only boundary                                            (0 FAIL)
```

**12 FAIL by design.** Every other line is a confirmation that must stay at 0. Deterministic
call sequences only, no races and no sleeps. No second checkout needed.

**`qa/r18-readonce.mjs` is now ALL OK** — R18-1…R18-5 are all closed, and the two lines A-22
handed QA to re-express are re-expressed (A-19 assertion 7: the builder edits nothing under
`qa/`):

- **§2.3**'s first assertion was `latReads === 1`. A-22 Part 2 makes the correct claim
  `latReads === 2` **and** `lngReads === 2`, **constant in N** — one read by the reuse probe, one
  by `placeForCopy`, never a count the recipient's document controls. Re-expressed, plus a second
  line asserting `lat` and `lng` are now read the *same* number of times as each other, which is
  what kills the hybrid coordinate. Measured 2/2 at N = 0, 1 and 3.
- **§3.5**'s three *"recorded, not filed"* lines measured a second read A-22 Part 1(b) removed.
  Re-expressed as read-count assertions of **1** on `ctx.actorUserId`, `ctx.today` and — a fourth
  line, new — `ctx.ids`, each still checked byte-identical beside the count.

Every mutation below was made in a throwaway `git worktree add … 215aeee` and discarded —
nothing under `cairn/` was ever written. Baseline `readOnce.test.ts` 2/2 and `copyStop.test.ts`
85/85 before and after each, restore verified. The counts are what a future round should
reproduce; `RO` is `readOnce.test.ts`, `CS` is `copyStop.test.ts`:

```bash
# A-22's own five, reverted
# restore `sourceStopId: src.id`                       RO red  CS red
# restore `friendUserId: source.trip.ownerId`          RO red  CS red
# restore the inline `srcPlace.at` double read         RO red  CS red
# restore `samePlace`'s `a.at` reads                   RO red  CS red
# un-clone the reuse probe's `at`                      RO red  CS red
# A-22 Part 1(b) — the trio A-23 exists for
# restore `ids: ctx.ids` in addStop's opts             RO red  CS GREEN
# restore `now: ctx.today` in addStop's opts           RO red  CS GREEN
# restore `actorUserId: ctx.actorUserId`               RO red  CS GREEN
# twelve INVENTED sites, in functions no ruling names
# re-read `c.note` in costForCopy                      RO red  CS GREEN
# re-read `a.label` in arrivalForCopy                  RO red  CS GREEN
# re-read `p.note` in placeForCopy                     RO red  CS GREEN
# re-read `o.note` in hoursForCopy                     RO red  CS GREEN
# re-read `l.href` in the Stop.links map               RO red  CS GREEN
# call readWeeklyEntry twice in weeklyForCopy          RO red  CS red
# spread `flags` from `src.flags`                      RO red  CS GREEN
# re-read `src.provenance.confidence`                  RO red  CS GREEN
# re-read `h.dayId` in the hint block                  RO red  CS GREEN
# re-read `a.name` in samePlace (recipient's row)      RO red  CS GREEN
# re-read `a.lo` in the cost.amounts map               RO red  CS GREEN
# re-read `srcPlace.placeId` in the find predicate     RO red  CS GREEN
# seven planted OUTSIDE A-23's five roots — six are the findings, the
# seventh is the control that localises R19-5
# double-read `sourceTrip.ownerId`                     RO GREEN  CS GREEN  (426/426 green)
# double-read `sourceTrip.id`                          RO GREEN  CS GREEN  <- R19-1's shape
# double-read a target `City.name` in refileCityKey    RO GREEN  CS GREEN
# emit `src.ticket` only when `kind === 'bundled'`     RO GREEN  CS GREEN  <- R19-5
# emit `src.ticket` unconditionally                    RO GREEN  CS red    <- localises R19-5
# double-read `original.cityKey` on the A-16 step-2
#   path only                                          RO GREEN  CS GREEN  <- R19-4
# double-read `src.place` when the source stop is in
#   the source's POOL                                  RO GREEN  CS GREEN  <- R19-4
# the ALLOWED table, both directions, all five entries
# any entry `max: 2 -> 1`                              RO red (BOTH assertions)
# any entry `max: 2 -> 3`                              RO red (assertion 2 only)
# un-clone the probe WITH scenario 3 deleted           RO red (assertion 2)
# the matrix's own reach
# delete `placeForCopy`'s `at === null` guard          RO GREEN as shipped;
#   ...with row 5's target place RENAMED               RO red  <- R19-4, two-sided
# revert copyStop.ts to 993d8fc under the shipped test RO red, 57 offender lines,
#   including `srcPlace.at.lat ×4`  <- R19-6, ×3 in the ruling is low by one
```

Re-run **unmodified** this round: `qa/r14-horizon-copy.mjs` **ALL OK**, `qa/r15-place-copy.mjs`
**ALL OK**, `qa/r16-copy-depth.mjs` **ALL OK**, `qa/r17-hours-parser.mjs` **ALL OK**,
`qa/r2-copy.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL**
(R2-18, known). `npm run test:tap` 615/0 (with `readOnce.test.ts` confirmed inside it at
`ok 502`/`ok 503`, not just standalone), `npm run typecheck` clean, `npm run web:build` clean,
`npm run golden` + `npm run sample` byte-identical (sample sha `40955ca0b182`),
`Object.keys(core).length` 71 with `index.ts` byte-unchanged across the whole diff.

Note for whoever reads `r19-census-gaps.mjs` §1 or §2 first: R19-1 and R19-2 need an **accessor
property on a caller-supplied value**, the same population bound as every read-once finding since
round 16, which is why they are MINOR. **R19-3, R19-4 and R19-5 do not** — they are gaps in the
guard rather than defects in the guarded code, and each is demonstrated by planting a defect the
guard should have caught and measuring that it did not.

---

## Round 30 (2026-08-28, `claude/cairn-i7-architect-pass-4y8q40` @ `b964e19`) — I-7b: A-35's span cap, A-36's executed port gate, A-37's row read gates

Six new probes plus three **re-expressions** of existing ones. Five probes are offline; the sixth
needs a browser. The `.sh` probes build throwaway `git worktree`s at `HEAD`, mutate them and
remove them; nothing in the working tree is touched. All run from `cairn/`.

```bash
node --experimental-strip-types qa/r30-span.mjs        # ALL OK, 30 checks. A-35 at every edge: the cap in
                                                       # BOTH directions on three decade anchors (incl. a
                                                       # low-era one with only two leap days, which is why
                                                       # 3,653 is a MAXIMUM and not one decade's length),
                                                       # R29-2's own repro, every legitimate span, every
                                                       # OTHER caller (setTripMeta, bare ensureDays), the
                                                       # WIDENED span (the pinned day must carry stops or
                                                       # the probe measures nothing), Part 5 clause 1's
                                                       # "an over-cap document stays usable", the export
                                                       # surface at 75, and both forms' catch → onError.

node --experimental-strip-types qa/r30-rowgates.mjs     # ALL OK, 55 checks. A-37's two gates. The HIGH edge
                                                       # is R29-6's; the LOW edge is not in the ruling —
                                                       # '0000-00-00' is shape-valid and rolls BELOW
                                                       # dayNumber('0000-01-01'). Eleven malformed country
                                                       # codes at BOTH read sites; the deliberate '--'→null
                                                       # merge (one row, two counted, both trips, nothing
                                                       # dropped); the 'A|' key ambiguity; purity; an
                                                       # out-of-domain `today`; and §3 is the discriminating
                                                       # case for the UNCLAMPED comparator that the suite
                                                       # does not have (R30-3).

node --experimental-strip-types qa/r30-upcast.mjs       # 2 FAIL BY DESIGN — R30-1, against A-36 Part 3's own
                                                       # recording double. Proves G12 is a real leak and not
                                                       # a no-op: write with one port instance, then open a
                                                       # SECOND over the same database (every page load after
                                                       # the first) and the record goes 14 → 16 keys.

bash qa/r30-exit6c.sh                                   # EIGHT new exit-6 faults past round 29's G1..G6.
                                                       # RED: G7 (the parameter reassigned in place — A-36's
                                                       # crux, 6b-1b alone), G7b (Object.assign in place),
                                                       # G8 (a third SUMMARIES.put writing a CORRECT row —
                                                       # 6b-2's site count alone), G11 (listTrips DROPS a
                                                       # key), G12b (the upcast widening spelled as a literal
                                                       # objectStore(SUMMARIES).put chain).
                                                       # GREEN: G9/G9m (a lifetime cache in a SECOND store,
                                                       # unannotated — R30-2), G10 (widening gated on
                                                       # `typeof window` — R30-4), G12 (the upcast widening
                                                       # through a hoisted store reference — R30-1).

bash qa/r30-reexpressed.sh                              # The three round-30 probe re-expressions,
                                                       # mutation-tested: revert ONE implementation line and
                                                       # check the NEW assertion still reds. i7-edges 2 FAIL,
                                                       # i7a-provisional 6 FAIL, i7a-span 8 FAIL. None was
                                                       # laundered. Note: i7-edges' ROW COUNT alone does not
                                                       # discriminate, which is why the re-expression asserts
                                                       # the emitted value and the count too.

PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node --experimental-strip-types qa/r30-upcast-browser.mjs
                                                       # 3 FAIL BY DESIGN — R30-1 in real Chromium: 14 → 16
                                                       # keys in the browser's own IndexedDB, read back with
                                                       # a raw transaction that bypasses the port.
                                                       # Add `--clean` for the shipped-port control: ALL OK,
                                                       # 14 keys across a second open — a property nothing in
                                                       # the repo asserted before this round.
```

**Re-expressed this round** — three probes whose assertions were pinned to behaviour ARCHITECTURE
revision 26 has since corrected. Each is ALL OK on the shipped tree and each still reds when its
implementation fix alone is reverted (`bash qa/r30-reexpressed.sh`):

- `qa/i7-edges.mjs` — the `'--'` sentinel expectation. A-37 Part 4 names this line and prints the
  ruled answer: **one** row, `countryCode: null`, `unattributed.cities` **2**, both `tripIds`.
- `qa/i7a-provisional.mjs` §4 — the same, plus the `''` half (now counted as unattributed) and the
  `'A|'` half (still two rows, both codes now `null`).
- `qa/i7a-span.mjs` §§2–3 — asserted the *presence* of R29-2, so under A-35 the probe **died with
  a stack trace and printed no verdict**. `measure()` now returns the refusal; §§2–3 assert it;
  §1 is unchanged and re-labelled as A-35 Part 6's *positive* criterion (the bound is NOT in the
  view); §3 gains two assertions nobody had made — after a refused `store.createTrip` the port
  holds **no** library row, and a legitimate trip through the same store still lands. `--fast` is
  now a no-op.

Round 29's probes at `b964e19`: `i7a-calendar` **ALL OK**, `i7a-provisional` **ALL OK** (was 2
FAIL, re-expressed), `i7a-span` **ALL OK** (was 2 FAIL / then a crash, re-expressed), `i7a-today`
**4 FAIL** (R29-3, still open and validly deferred), `i7a-idb-rowkeys` **ALL OK** and `--fault`
**3 FAIL**, `bash qa/i7a-exit6b.sh` all six red (1·2·1·1·3·10 — G1 and G4 were GREEN at round 29).
Round 28's: `i7-edges` **ALL OK** (was 1 FAIL, re-expressed), `i7-oracle`/`i7-year`/`i7-pastyear`/
`i7-rescan` **ALL OK**, `bash qa/i7-faults.sh` all seven red (4·2·2·3·5·1·1) and exit 0,
`bash qa/i7-exit6.sh` all ten red and exit 0. **R29-4 verified by construction:** drift every
anchor and the two harnesses print `7 fault(s) UNRUN … M1…M7` / `6 fault(s) UNRUN … F1…F6` and
**exit 1**. Historic: `r13`…`r20` **0 FAIL**, `r21-closure` **1 FAIL** (R21-1), `r2-constraints`
**1 FAIL** (R2-18).

---

## A-38 builder pass (2026-08-29, `claude/cairn-i7-architect-pass-4y8q40` @ `c38db0a`) — R30-1: the `ensureReady` upcast, executed

One new harness, and `qa/i7a-idb-rowkeys.mjs` **grows a second phase**. ARCHITECTURE §8.4
**A-38**: a port's coverage is its **write paths**, not its interface methods, so 6b-1b becomes
**five arms each stating its starting state** and 6b-4 gains a seeded legacy phase. All run from
`cairn/`; the `.sh` harness builds throwaway `git worktree`s at `HEAD` and removes them.

```bash
bash qa/a38-exit6d.sh                                   # A-38 Part 7's three faults, all in
                                                        # `ensureReady()`, plus the two SCOPED runs
                                                        # that make the improvement quantitative.
                                                        # RED: G12 (the upcast widens every row —
                                                        # 8 fail; GREEN before this pass), G13 (the
                                                        # same widening INSIDE THE STAMPING BRANCH,
                                                        # so it fires only for a versionless record
                                                        # — 6 fail, arms 3 and 4; GREEN before this
                                                        # pass), G14 (the `have.has(...) continue`
                                                        # removed, so a fence the port was HANDED is
                                                        # overwritten — 6 fail, arms 2, 4 and 5).
                                                        # GREEN BY DESIGN, and this is the
                                                        # measurement R30-1 turns on: G13 under the
                                                        # PRE-A-38 gate shape (arm 1 alone, the
                                                        # empty-database arm — 4 tests, 0 fail) and
                                                        # under 6b-2's two surviving assertions
                                                        # (2 tests, 0 fail). Each run's measured
                                                        # colour is compared to the expected one and
                                                        # a mismatch exits 1, as does an UNRUN
                                                        # anchor (R29-4).

PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node --experimental-strip-types qa/i7a-idb-rowkeys.mjs
                                                        # ALL OK — now in TWO phases. Phase 1 is
                                                        # what it always did (fresh database, one
                                                        # instance, both mutating methods, raw
                                                        # read-back): 14 keys, 387 bytes.
                                                        # **Phase 2 is new** (A-38 Part 6): a LEGACY
                                                        # database written RAW — doc + summary row,
                                                        # no `versions` entry — closed, and only
                                                        # then opened by the port. It asserts the
                                                        # seed landed and is ROW_KEYS-shaped BEFORE
                                                        # the port runs, that the upcast stamped the
                                                        # versionless record exactly once, that
                                                        # `load()` resolves with the newly minted
                                                        # fence (it cannot, unless the stamp
                                                        # landed), and then ROW_KEYS + the blob
                                                        # check on the persisted bytes.
                                                        # `--fault=g1`  → phase 1 **3 FAIL** (16
                                                        # keys), phase 2 clean — the write-path
                                                        # class.
                                                        # `--fault=g13` → phase 1 clean, phase 2
                                                        # **3 FAIL** (16 keys) — the upcast-path
                                                        # class, which is exactly the blindness
                                                        # R30-1 found. `--fault` alone still means
                                                        # `--fault=g1`.
```

**What this pass changed in the existing harnesses' measurements**, re-run at `c38db0a`:
`bash qa/r30-exit6c.sh` — **G12 is now RED (8 fail) and G12b RED (9 fail)** where round 30
measured G12 **GREEN**; G9/G9m (**R30-2**) and G10 (**R30-4**) are **still GREEN and untouched**,
deliberately — A-38 Part 9 leaves all four round-30 MINORs unruled. `bash qa/i7a-exit6b.sh` all
six still red (1·2·1·5·3·20). The script comments in `qa/r30-exit6c.sh` still describe round 30's
own measurement and were **not** rewritten: they are the breaker's record of what was true then.

---

## A-39 builder pass (2026-08-29, `claude/cairn-i7-architect-pass-4y8q40`) — R31-1: the finite covering set

One new harness, and `qa/i7a-idb-rowkeys.mjs`'s **phase 2 gains a second record**. ARCHITECTURE
§8.4 **A-39** supersedes A-38 Part 7's *required property* sentence (which quantified over
**faults**, and so could never be discharged by a finite fixture list) and A-38 Part 3's arm
**seeds**: the quantifier moves to the state `ensureReady()` can **read**, which is finite, and the
five arms carry a **15-state pairwise covering set** (5 summary-row generations × 3 row-content
representatives, minimal by the `|S| × |C|` lower bound). All run from `cairn/`; the `.sh` harness
builds throwaway `git worktree`s at `HEAD` and removes them.

```bash
bash qa/a39-exit6e.sh                                   # A-39 Part 9's five faults, one per axis
                                                        # state the covering set exists to reach.
                                                        # Each is the transaction-scope widening
                                                        # G12 already makes with a different GUARD,
                                                        # generated from one shared template so the
                                                        # guard is the only difference.
                                                        # RED, against the two SEEDED ARMS alone
                                                        # (2 tests / 2 fail each, where a red can
                                                        # only mean the covering table caught it):
                                                        #   G16 `summaryVersion < SUMMARY_VERSION`
                                                        #       — R31-1's own H4;
                                                        #   G17 `!('attribution' in r)` — a KEY-
                                                        #       PRESENCE guard, no version read;
                                                        #   G18 `summaryVersion !== SUMMARY_VERSION`
                                                        #       — fires on gen-future too;
                                                        #   G19 `countryCodes.length === 0`;
                                                        #   G20 `stops.attributed < stops.located`.
                                                        # G16 whole-gate is 46 tests / 19 fail.
                                                        # GREEN BY DESIGN: all five under the
                                                        # PRE-A-38 gate shape (arm 1 alone — 4/0),
                                                        # G16 under 6b-2 (2/0), and — the
                                                        # measurement R31-1 turns on — **G16 under
                                                        # the PRE-A-39 gate shape: A-38's same five
                                                        # arms with FRESHLY MINTED rows, 2 tests /
                                                        # 0 fail.** A mismatch exits 1, as does an
                                                        # UNRUN anchor (R29-4).

PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node --experimental-strip-types qa/i7a-idb-rowkeys.mjs
                                                        # ALL OK. **Phase 2 now seeds TWO records**
                                                        # (A-39 Part 8), both with no `versions`
                                                        # entry: `t-legacy` = ROW(id, 4) (14 keys)
                                                        # and `t-legacy-g1` = the new ROW_GEN1(id)
                                                        # (10 keys — summaryVersion, countryCodes,
                                                        # cities and attribution genuinely ABSENT,
                                                        # asserted). Each record's key set is
                                                        # checked against the key set it was SEEDED
                                                        # with, per id. This is not the coverage
                                                        # mechanism — it is a spot-check, and does
                                                        # NOT take the 15-state array.
                                                        # `--fault=g16` → **3 FAIL, phase 2, all on
                                                        # `t-legacy-g1`** (extra `daysTravelled`),
                                                        # where before this pass that shape measured
                                                        # ALL OK on both phases.
                                                        # `--fault=g1` → 3 FAIL, phase 1.
                                                        # `--fault=g13` → **1 FAIL, phase 2**, and
                                                        # it is a THROW rather than a key-set
                                                        # failure: G13 dereferences `countryCodes`
                                                        # and a gen-1 row has none. Phase 2's
                                                        # evaluate is wrapped so that is REPORTED
                                                        # rather than killing the probe before it
                                                        # can print a summary. G13's 6b-4 signal is
                                                        # degraded, not lost, and BUILD-NOTES says
                                                        # so.
```

**What this pass changed in the existing harnesses' measurements**, re-run on this branch:
`bash qa/a38-exit6d.sh` — **exit 0, unchanged**: G12/G13/G14 all still RED and both of G13's
scoped negatives still GREEN. `bash qa/i7a-exit6b.sh` — all six still red.
`bash qa/r30-exit6c.sh` — unchanged, including **G9/G9m (R30-2) and G10 (R30-4) still GREEN and
untouched**, deliberately: A-39 Part 13 leaves R30-2…R30-5, R31-2, R31-3 and R31-4 unruled.
**`qa/i7a-idb-rowkeys.mjs` still exits 0 unconditionally (R31-4)** — read the printed summary,
not the exit code.

## Round 32 — verifying A-39 against its own table (R32-1, R32-2)

Three breaker probes, aimed at the covering set's **own claims** rather than at new architecture,
plus the builder fix that closed the two MAJORs they found. All run from `cairn/`; the two `.sh`
harnesses build throwaway `git worktree`s at **`HEAD`** and remove them — so **commit before
running them**, or they measure the last commit rather than your working tree.

```bash
bash qa/r32-a39-nested.sh                               # Four faults `qa/a39-exit6e.sh` does not
                                                        # build, each with its vacuity control.
                                                        # NOW RED, both fixed in `f21fa42`:
                                                        #   G21n gen-2's guard one level down —
                                                        #        `cities.some(c => !('country
                                                        #        Source' in c))`, body writes the
                                                        #        key back INTO the entry. Seeded
                                                        #        arms: 2 tests / 1 fail (arm 3
                                                        #        only — arm 2's sole gen-2 row is
                                                        #        the degenerate one, `cities: []`).
                                                        #        **Was GREEN 2/0 — that is R32-1.**
                                                        #   G23  `r.revision === 0`, Axis C's
                                                        #        revision ZERO cell: 2 tests /
                                                        #        2 fail, BOTH arms.
                                                        #        **Was GREEN 2/0 — that is R32-2.**
                                                        # RED throughout: G21t (G21n's top-level
                                                        # twin, the vacuity control), G21n whole-
                                                        # gate, G22 `!('summaryVersion' in r)`.
                                                        # **GREEN, so the harness still exits 1:**
                                                        # G23c `r.revision === 1`, G23's control.
                                                        # Its premise died with the fix — the
                                                        # fixtures are now revision 0 / 3 / 4 and
                                                        # none sits at exactly 1, because the only
                                                        # one that did was the degenerate row that
                                                        # now reaches the ZERO cell. A-39 Part 4
                                                        # partitions counts into {zero, non-zero}
                                                        # and nothing finer, and BOTH cells are now
                                                        # occupied. Read the per-run lines, not the
                                                        # exit code. BUILD-NOTES records this.

node --experimental-strip-types qa/r32-revision0.mjs    # ALL OK (was 1 FAIL). Three steps proving
                                                        # `revision: 0` is REACHABLE, with no fault
                                                        # injected and no hand-written row:
                                                        # `fromJSON` preserves it; `importDoc` +
                                                        # `flush` + `listTrips()` returns a
                                                        # PERSISTED row carrying it; and the
                                                        # degenerate Axis-C fixture no longer pins
                                                        # `revision === 1`. This is what refuted
                                                        # the prior pass's "unreachable" deviation.

bash qa/r32-pins.sh                                     # exit 0, ALL SEVEN FIRE. A-39 Part 6's
                                                        # three pins, each broken on purpose:
                                                        # pin 1 (SUMMARY_VERSION bumped to 5 with
                                                        # the ledger untouched), pin 2 (`ageRow`
                                                        # WRITES a value; and the breaker's own
                                                        # P2-COERCE, `summaryVersion` coerced to a
                                                        # string, scoped and whole-gate), pin 3
                                                        # (`ageRow` ADDS a key; `ageRow`'s DELETE
                                                        # LOOP removed = version-only ageing), and
                                                        # DEV2 (G19 with A-39 Part 9's LITERAL
                                                        # unguarded text). A pin that does not fire
                                                        # is worse than no pin.
```

**What the R32-1/R32-2 fix changed elsewhere**, re-run at `f21fa42`: `bash qa/a39-exit6e.sh` —
**exit 0, unchanged**, all 13 runs the colour A-39 Part 9 states. `bash qa/a38-exit6d.sh` —
**exit 0, unchanged**. `bash qa/r32-pins.sh` — exit 0; the pin-3 edit broke none of its anchors.
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node --experimental-strip-types qa/i7a-idb-rowkeys.mjs`
— **ALL OK**, and `--fault=g1` / `--fault=g13` / `--fault=g16` → **3 / 1 / 3 FAIL**, identical to
the counts the A-39 pass recorded. `npm run test:tap` stays at **884 / 0 fail**: the fix adds no
test, it strengthens assertions inside tests that already existed.

---

## Round 33 (2026-08-31, `master` @ `6b89c91`) — the I-8a breaker pass

Written against the I-8a delivery (the tab shell, `WorldMap.tsx`, `worldMapFrame`, the token
layer, the `.stop--dim` fix). These go at what `qa/i8a-signals.mjs` and `qa/i8a-faults.sh` — the
builder's own probes, both re-run green here — do **not** cover: dark mode, motion, the network
boundary, the antimeridian residue as *rendered pixels*, mobile, the error boundary's recovery
path, and the ship gate's own instrument. `cairn/docs/QA-FINDINGS.md` round 33 names the finding
each one backs. Headless probes run from `cairn/`:

```bash
node --experimental-strip-types qa/r33-minspan.mjs   # R33-2. Sweeps ALL 239 shipped codes through
                                                     # the exact corner collection worldMapFrame
                                                     # performs and calls core's own mapBounds:
                                                     # VA is the ONLY code that clamps (spanKm
                                                     # exactly 1.2), AT is 630.97 km and does not,
                                                     # and the injected fault (raw box vs
                                                     # mapBounds) is red for VA and GREEN for AT.
                                                     # Confirms the builder's AT->VA substitution.

node --experimental-strip-types qa/r33-frame.mjs     # R33-1 / R33-6. The reference frame is NOT a
                                                     # dateline case (no box touches +-180; re-
                                                     # expressing to [0,360) makes the span WORSE:
                                                     # 350.75 vs 194.50 deg), so dateline-aware
                                                     # bounds would not change it. Also: zero
                                                     # frame padding, the A-40 Part 5 payload
                                                     # figures re-measured (11,090 B / 374,268 B),
                                                     # hostile input, purity, the projection.

node --experimental-strip-types qa/r33-reach.mjs     # R33-3. Is the lifecycle-throws gap reachable
                                                     # from a shipped write path? No: createTrip
                                                     # refuses a 5-digit year and fromJSON refuses
                                                     # every non-IsoDate date, so backup/restore
                                                     # cannot carry one either.

bash qa/r33-vacuity.sh                               # R33-4. THE CONTROL i8a-faults.sh DOES NOT
                                                     # RUN ON ITSELF: makes the same throwaway
                                                     # copy, injects NOTHING, and the views-scoped
                                                     # suite is already `# fail 1`. Exits non-zero
                                                     # when the control is red, i.e. when the three
                                                     # views-scoped ship-gate faults are vacuous.
```

Browser probes need `npm run web:build && npm run serve` in one shell first, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r33-render.mjs
   # A dark mode (both themes, both removals, A-34)  B motion + prefers-reduced-motion
   # C zero external requests                        D the antimeridian, in rendered CSS px
   # E mobile 375x667                                F the error boundary's recovery path
   # G every opacity rule in the shipped CSS         H min-span end-to-end through the tab UI
   # Writes /tmp/r33-map-{light,dark}.png, /tmp/r33-antimeridian.png, /tmp/r33-mobile.png.

PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r33-render2.mjs
   # I the transitions with time to ARRIVE   J the two sticky bars, at three viewports (R33-5)
   # K W2 behaviourally: click, sea, Enter   L font faces actually used
   # M severity x provenance, nine cells     N a second ungated core.lifecycle call on the Map

PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r33-render3.mjs
   # every surface toured: all four woff2 fetched, no dead face; the sticky-bar stripe
   # photographed; the brand mark measured. Writes /tmp/r33-sticky.png, /tmp/r33-mark.png.

PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r33-a11y.mjs
   # R33-7. 239-country history: the hidden panel never enters the tab order, `display: contents`
   # does not drop role=tabpanel, and the tablist has no arrow keys and two tab stops.
```

A FAIL in `r33-render.mjs` §F and §H, and a non-zero exit from `r33-vacuity.sh`, are the
findings — not broken probes.
