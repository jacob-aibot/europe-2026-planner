# Cairn — the design contract

> # ⚠ REVISION 3, 2026-09-02 — §1 IS VOID. THIS DOCUMENT IS NO LONGER THE VISUAL AUTHORITY.
>
> **Jacob has rejected the visual direction this document produced, in full.** Not as a polish
> request: *"unattractive, bland, overly typographic, and emotionally empty… reads more like a
> technical report, transit atlas, or typeset database than a premium consumer travel product."*
>
> **The visual authority is now `docs/design/REFERENCE-BOARD.md`**, and above that, the file it
> points to: **`docs/design/references/cairn-visual-reference-board.png`**. Open the PNG. A written
> description of it is not a substitute — `REFERENCE-BOARD.md` §8 records what went wrong the one
> time that was tried.
>
> **What this means for you, by section — the triage Jacob asked for:**
>
> | | Sections | Status |
> |---|---|---|
> | **Product-truth and accessibility rules that SURVIVE** | **§0** (provenance is visible; a screen may only show what exists), **§2**'s measured contrast decisions and the 11px floor, **§3.4** (touch targets, focus, keyboard, virtual keyboard, orientation), **§3.5** (landmarks, `<dl>` pairs, map `role`/`tabIndex`/`aria-label`, 200% zoom), **§6** (the rendered acceptance standard and its five device contexts), **§6.3**, **§6.4** (what Chromium cannot verify) | **BINDING, unchanged.** None of this was rejected. §0 in particular is *strengthened*: it is the reason the new directions render empty photo slots instead of stock imagery |
> | **Implementation guidance that REMAINS USEFUL** | **§3.1–§3.3** (the measured starting point, mobile-first breakpoints, what recomposes per surface), **§3**'s R1/R2/R3 rulings, **§4** (the tooling ruling — but see the amendments below), **§5.6**'s fence on `WorldMap.tsx`, **§7**'s deferral table | **ADVISORY until a direction is selected.** These are sound mechanics that assume the rejected composition. Re-read them against the selected direction; expect R1 (bottom bar) and §3.3 to survive and §5.3–§5.5 to be replaced wholesale |
> | **Rejected aesthetic prescriptions that MUST BE REPLACED** | **§1 entirely** — all nine principles, and especially **P4** (hierarchy is typographic), **P8**'s restraint list, **P9**'s four "non-negotiable" characteristics, and the reference-translation table at the end of §1. **§2**'s type stack. **§5.1–§5.5** (the I-8b Profile spec) | **VOID.** Do not build from them, do not cite them, do not polish inside them |
>
> **Three specific reversals, so no one re-derives them from §1's text:**
>
> 1. **P9.1's condensed uppercase display type and P9.3's hairlines-and-small-radii are the "transit
>    atlas".** There is **no serif and no condensed uppercase display anywhere on the board**, and the
>    board's own radii are generous (cards ≈16–20px, sheets ≈24px). Big Shoulders is not the voice.
> 2. **P9.2 — "mono for every number, code, time, count and micro-label" — is reversed.** Impeccable
>    names it directly: *"monospace as a costume for 'technical' rather than for code, data, or
>    measurement."* Mono is now for genuine measurement only (a clock time, a coordinate); counts use
>    the body face with tabular figures.
> 3. **P2's "nothing map-shaped is faked to fill the space" stands, but its corollary was over-read.**
>    Rule B forbids fake *content*; it was read as forbidding *composition at photographic scale*, and
>    that is how every large surface in the product became type.
>
> **The gate.** Jacob's explicit visual selection is required before broad UI implementation. A
> passing test suite is not visual approval; a green Impeccable audit is not visual approval; a
> manager's SHIP verdict is not visual approval — I-8b had one. `REFERENCE-BOARD.md` §6.
>
> **Where the replacement is being worked out:** `docs/design/DIRECTIONS.md` and the three rendered
> prototypes under `docs/design/directions/`. When Jacob selects one, **this document is rewritten
> from it in that same pass** and this banner comes off.
>
> **Amendments to §4's tooling ruling, made by revision 3 under Jacob's instruction:**
> **Impeccable** moves from *selective use* to **vendored and operationally required** (pinned at
> `c0f4952`; `PINNED-REVISION.txt`); Emil's **`prototype`** and **`review-animations`** are vendored
> alongside the existing two; **UI/UX Pro Max** stays REJECTED and untouched; **21st.dev** stays
> unavailable and unused; Anthropic's **frontend-design** plugin is **absent from this environment**
> and its upstream skill source was read as a document instead. `REFERENCE-BOARD.md` §9 has the
> evidence, the pins, and the one instruction that was not followed literally (the design hook, which
> is repo-root-scoped and would fire on the live trip planner).

**Status: CONTRACT for everything the banner above marks as surviving. Revision 3, 2026-09-02
(architect).** *(Revision 1, 2026-09-01, created it. Revision 2 ruled QA round 41's R41-14 — the
§5.5/§5.6 precedence question. Revision 3 carries Jacob's rejection of the visual direction and does
not otherwise edit the body: the sections below are left intact deliberately, so the triage above can
point at them and so the record of what was rejected survives verbatim.)*
`ARCHITECTURE.md` **§9 / A-55** makes this
document binding: where a surface increment and this document disagree, this document is the spec and the
increment is the defect. It sits beside `ARCHITECTURE.md` rather than inside it because `ARCHITECTURE.md`
is ~271k tokens and no builder of a screen should have to enter it to find out what the product looks like.

**What it is not.** It is not `docs/VISUAL-TELLS.md`, which is **advisory** and stays advisory — a post-hoc
checklist of *generic* design, read once before writing CSS and once at rendered verification, that
**does not outrank anything here**. It is not a component library and it names no framework as an identity.
It does not decide product scope: a screen may never be enriched with a capability the roadmap has not
built.

## Who reads what

| You are | Read |
|---|---|
| building any web surface | §1, §2, §3, then §6, then your increment. ~9k |
| building **I-8b Profile** | all of it; §5 is your spec |
| the breaker / QA on a surface | §2, §3, §6 — §6 is the acceptance standard |
| the manager at a gate | §0's two rules, §6 |
| adding a frontend dependency | §4. It is a ruling, not a preference |
| the architect | all of it; you are the one agent that changes it |

`cairn/tools/doc-section DESIGN 3 6` prints the responsive contract and the acceptance standard alone.

---

## 0. Two rules that outrank the rest of this document

**Rule A — his content outranks our aesthetics.** The root `CLAUDE.md` convention (*never present my
suggestions as Jacob's own plan*) is a **visual** requirement here, not only an editorial one. Anything the
system produced — a copied stop, an email candidate, a provisional country, our recommendation — is marked
on screen until accepted, and the mark may never be the thing that makes a composition look better. If a
layout is only handsome because it hides provenance, the layout is wrong.

**Rule B — a screen may only show what exists.** No placeholder photography, no empty achievement shelf, no
Discovery slot, no "coming soon" tile, no fabricated hero image. This is `ROADMAP.md` I-8's *"no DISCOVER
tab: a slot that exists to promise something is the opposite of what this product's conventions say"*,
generalised to every surface. **A screen that looks thin because the product is young is honest. A screen
that looks rich because it invented content is a lie**, and it is the specific way a design pass damages
this product. When a surface feels empty, the answer is composition — scale, space, typography, the map —
never invented content.

---

## 1. The visual direction

Nine principles. Each is written so that a rendered screen can disagree with it.

### P1 — A travel record, not a dashboard

Cairn is a premium consumer travel product. It is not SaaS, not analytics, not admin. Concretely: **a
number appears because it is part of a person's travel identity, never because a metric needed a home.**
There is no KPI grid, no bento tile wall, no "overview" of widgets. A statistic is set as **editorial
display type in a line of prose or a run of paired label/value**, not as a card with an icon in the corner.

*Rendered test:* count the bordered boxes on a surface. If the primary content of the screen is a grid of
same-shaped bordered boxes, the screen has failed P1 regardless of how well it is spaced.

### P2 — Geography is the signature surface

The map is the thing Cairn does that a list app cannot. It is **content, not illustration**: it carries
data (which countries, which panes, which are provisional), it is interactive, and it is never used as
wallpaper behind text. Where a surface has geography available, geography leads; where it does not,
**nothing map-shaped is faked to fill the space** (P1's rule B corollary).

The world map's *geometry* — clustering, framing, extent, pane order, tie-break — is closed and settled in
`ARCHITECTURE.md` §4.4 A-40…A-54 and is **out of scope for design passes**. What design owns is how the map
*sits in a page*: its size relative to type, what surrounds it, how it recomposes across widths (§3).

### P3 — The past is alive, not archived

A completed trip is not greyed out, not collapsed into a footer, not "history". The lifecycle chips
(`planned` / `active` / `completed`) are **status, not decay**: `completed` is a dashed outline, never
lower contrast, never lower ink. A finished trip is the product's most valuable content, and it must read
that way — full-strength ink, full-size type, first-class position.

*Rendered test:* no `completed`-state element has lower computed contrast than the same element in
`planned` or `active` state.

### P4 — Hierarchy is typographic and steep, and it is not made of containers

The shipped scale has real jumps in it — a `clamp(26px, 4.2vw, 38px)` uppercase condensed display head over
14px body over an 11px tracked mono label. **Hierarchy is carried by size, weight, case, tracking and
whitespace.** It is not carried by nesting boxes. A bordered box inside a bordered box inside a bordered
box is a hierarchy failure, and so is "three sizes that are almost the same size."

Spacing has rhythm: the vertical gap between a section and the next is materially larger than the gap
inside a section. Monotonous spacing — every gap the same — reads as generated.

### P5 — Signal channels stay orthogonal, and opacity carries none of them

Shipped at I-8a and not reopened. Three channels, three mechanisms:

1. **Severity** — a conflict's weight. Full-strength **colour**, always, never attenuated.
2. **Provenance** — "you have not accepted this". A **mark**: dashed rule, outlined badge, credit line. It
   attenuates nothing it composes with.
3. **Provisional** — "counted from a trip you are on now". A **different treatment** (outline over a faint
   tint), never the confirmed ink at lower strength.

`opacity` carries none of them, and any new state needs a **fourth mechanism**, not a fourth use of one of
these three. Secondary text is quieter by **ink** (`--ink-dim`, `--ink-faint`), never by opacity.

### P6 — Motion is a small vocabulary, spent on state, never on arrival

Cairn animates **state changes the user caused** — a selection, a panel opening, a tab moving. It does not
animate page entrances, does not stagger lists on load, does not have a scroll-reveal, and has no
decorative motion of any kind (no pulsing dots, no shimmer, no blinking cursor). Budget:

- **Duration ≤ 200 ms** for anything under a finger, ≤ 300 ms for a sheet-sized surface.
- **Easing is a named curve, never `ease` / `ease-in-out` defaults, and never bounce or elastic.**
  Entrances decelerate; exits are faster than entrances.
- **Every animation is interruptible** and every one is off under `prefers-reduced-motion: reduce`, which
  the stylesheet already honours in two places and must honour everywhere.
- **Nothing animates that changes layout of other content** unless it is the thing the user just opened.

The single most valuable motion in this product is not on any screen yet: a map that *re-frames* when the
subject changes. It is deferred (§7) and it is deferred deliberately — the frame is measurement-free by
ruling (A-40 W1) and an animated re-frame is exactly the thing that reintroduces the hidden-container bug.

### P7 — Modes have different visual emphasis

One product, five registers. This is why Cairn does not have a single "page template":

| Mode | Register | Emphasis |
|---|---|---|
| **Planning** (`TripView`, the day timeline) | functional, dense, keyboard-capable | information density wins; the spine and the timeline are working surfaces |
| **Exploring** (browse another trip; later, Discovery) | visual, generous | larger type, more space, less chrome |
| **Travelling** (day view on the road; later, live path) | map-first | the map is the page, everything else is an overlay on it |
| **Remembering** (past trips; later, recaps) | editorial | large heads, generous measure, the record reads like a page rather than a record |
| **Identity** (Profile) | composed, personal | the screen is *about a person*, not about a dataset |

A register is not a theme: the tokens, the type faces and the three signal channels are identical in all
five. What varies is **density, scale and how much of the screen the primary object takes.**

### P8 — Restraint is the house style, and it is not the same as blandness

Every element earns its place by carrying meaning. Concretely, and these are the ones this codebase has
actually reached for: **no gradient chrome, no glassmorphism, no glow or halo, no untinted drop shadows, no
rounded-square icon tile above a heading, no eyebrow chip floating over a hero, no decorative side-stripe.**
Two of these were removed by hand at I-8a and neither comes back.

Colour is signal. The palette is warm paper and ink with **one** accent (`--accent`), **one** provenance
gold and **three** severity inks. A new hue needs a new meaning, not a new mood.

### P9 — The character comes from four specific things, and they are not negotiable down

Being clean is not a visual identity. Cairn's identity is:

1. **Condensed uppercase display type against a neutral body face** — an editorial pairing, not a UI one.
2. **Mono for every number, code, time, count and micro-label** — the data channel is visible as a channel.
   A column of times reads as a column.
3. **Hairline rules and small radii** — 1px lines and 4–6px corners. The language's backbone. A future
   audit may not "soften" them into 12px cards with wide soft shadows.
4. **Outlined marks, never filled ones** — a badge is an annotation, and an annotation does not spend the
   strongest ink on the least important row.

If a pass makes a screen look better by removing one of these four, the pass is wrong and the screen was
solving the wrong problem.

### The references, translated

Jacob named these as **intent**, not as things to copy. What we take from each, and what we deliberately do
not:

| Reference | Take | Do not take |
|---|---|---|
| **House Goals** | that polish and personality are a product feature, not a finishing pass | its literal surfaces |
| **Polarsteps** | that a travel *history* deserves a strong visual map treatment and reads as a record, not a log | its illustration style; its map is a tiled map and ours is deliberately not (§8.4) |
| **Airbnb "Where To"** | destination-led composition; a place is presented, not listed | its commerce framing — Cairn sells nothing |
| **Airbnb Trips** | that a trip needs to be *organised* and legible under time pressure | its card-stack orientation. **Cairn is more map-first than Trips is** |
| **Flighty** | **precedent only** for representing a flight/route as a first-class object inside a trip — a leg has a shape, not just a row | its aesthetic entirely |
| **AllTrails** | that a completed thing is an achievement worth rendering | badges/streaks/gamification, which are unbuilt and P1-rule-B forbidden until they exist |
| **Strava** | that a route is a **meaningful artefact** — the map of a thing you did is the thing itself | its social/competitive furniture |
| **Editorial travel** (large photography, destination-led composition) | scale contrast, generous measure, a heading that commands the page | large photography *now* — Cairn has no photo pipeline until Phase 6, and P1-rule-B forbids faking one |
| **Apple Journal** | that memory and storytelling are a legitimate UI register (P7's *remembering*) | its exact chrome |
| **Cosmos** | that exploration layouts may be unconventional and non-grid | unconventional layout on *working* surfaces, where predictability wins |
| **Midlife Engineering / WeAreStockt / bysaurabh** | selective personality in interaction and motion — one memorable move per surface, at most | their literal layouts; and nothing that violates P6's budget |

**A reference may not be cited to overrule a principle above.** They are inputs; §1 is the contract.

---

## 2. The established baseline — shipped, and not up for re-decision

I-8a settled these against rendered output and a manager verdict of SHIP. A design pass **extends** them; it
does not re-litigate them. All of it lives in `apps/web/src/styles.css`, declared once as custom properties.

- **Type.** `Big Shoulders` (display, 600–800, condensed uppercase) · `Public Sans` (body, 400–700) ·
  `IBM Plex Mono` (500/600, all data). **Self-hosted latin woff2 from `src/fonts/`, 91.7 KB for four files,
  zero CDN, `font-display: swap`.** A per-view network font dependency is refused for the same reason a
  per-view tile dependency is: Phase 2 is local-first and offline.
- **The UI text floor is 11px** (`--ui-text-floor`), decided once and written down, including for the
  tracked uppercase micro-labels the language is built on. Nothing rendered goes below it.
- **Scale:** `--t-display` `clamp(26px, 4.2vw, 38px)` · h1 25 · h2 19 · h3 15 · body 14 · small 12.5 ·
  label 11. Tracking: `--label-track: .09em`, `--caps-track: .06em`.
- **Rules and radii:** `--hair: 1px`; `--radius: 6px` / `--radius-sm: 4px` / `--radius-pill: 5px`;
  `--shadow: 0 1px 0 rgb(20 20 15 / 6%)` — a hairline shadow, tinted, not a soft halo.
- **Marks are outlined:** `.pill` is `border: 1px solid currentColor; background: transparent`.
- **Provenance is ink weight and border-style, never opacity** — the `.stop--dim` fix (P5).
- **Two removals, permanent:** `.topbar__mark`'s gradient-plus-glow, and `.topbar`'s
  `backdrop-filter: blur(8px)`. Both are asserted absent in a computed-style probe and both stay absent.
- **Dark mode is already in the product contract** — `@media (prefers-color-scheme: dark)` with a full
  token override and `color-scheme: light dark`, and QA round 40 verified the world map in it. It is **not**
  optional and **not** something a new surface may skip; every new token gets both values, and every
  contrast number is measured in both.
- **Measured contrast decisions already made and not to be undone:** `--warn: #8f5816` (QA R34-7, ≥4.5:1 on
  all three light surfaces at 11px) and dark `--map-fill: #6d7794` (QA R36-6, ≥3:1 against the sea, WCAG
  1.4.11).

**What is missing from the baseline, and is this document's job to add:** a responsive system (§3), touch
targets, safe-area handling, and a motion vocabulary. See §3 and §6.

---

## 3. The responsive contract — mobile-first, desktop-capable

**Position: one product, recomposed. Not two implementations, and not one implementation widened.** Mobile
is the primary experience. Desktop is not "mobile with more margin": it gets **more content visible at
once**, not bigger content.

### 3.1 The measured starting point, stated plainly

`apps/web/src/styles.css` today contains **five** `@media` blocks: two are `prefers-color-scheme` /
`prefers-reduced-motion`, and the entire layout system is **two `max-width: 900px` rules** that collapse
`.trip`'s two columns and unstick `.spine`. That is a **desktop-first stylesheet with one breakpoint.**
Three consequences are live defects, and each has a fix below rather than a discussion:

1. **`index.html` sets `viewport-fit=cover` and the stylesheet uses `env(safe-area-inset-*)` zero times.**
   Opting into the display cutout without padding for it is the combination that puts content under the
   home indicator and behind the notch in landscape. *(Needs rendered verification on real iOS Safari — see
   §6.4; Chromium's device emulation does not synthesise safe-area insets.)*
2. **`.tabbar` is `position: sticky; top: 2.7rem`** — a hardcoded number equal to the topbar's height at
   its current content. Any topbar wrap (a long trip title, a large text-size setting) and the two stick
   on top of each other.
3. **Touch targets are below the floor.** `.icon` is **26 × 26 px**; `.tabbar__tab` computes to ≈ 35 px
   tall; `.btn` and `.chip` to ≈ 31 px. See §3.4.

### 3.2 Breakpoints — mobile-first, `min-width` only, four of them

Named once, as custom-property-free plain queries, and **no new breakpoint may be added without a measured
reason recorded here.**

| Name | Query | Reference viewport | Register |
|---|---|---|---|
| **base** | *(no query)* | **320 × 568** (iPhone SE) and **390 × 664** (iPhone 12–14) | one column, thumb-first |
| **wide phone** | `@media (min-width: 600px)` | 600–899 | one column, more air; two-up where a pair is genuinely a pair |
| **split** | `@media (min-width: 900px)` | **768 × 1024** portrait stays base; **1024 ×** and up | side content becomes persistent; the existing `.trip` two-column threshold, inverted |
| **desktop** | `@media (min-width: 1280px)` | **1280 × 800** | full composition; the content column stops growing |
| **wide** | `@media (min-width: 1600px)` | **1600 × 900** | **no new layout.** Margins grow, content does not. Verified, not designed |

**900 is kept deliberately** — it is the threshold `.trip` already uses and it has shipped through a manager
gate. The change is that it is written `min-width` and the base case is the phone.

**Container ceiling.** `max-width: 62rem` (≈ 992 px) is the shipped content ceiling on `.library` and
`.worldmap` and it stays. At **wide**, the page does not become a 1600px-wide column of 14px text.

### 3.3 What recomposes, per surface

**The shell (`App.tsx`) — the one structural change this pass rules.**

> **R1 — navigation is bottom-anchored on phones and top-anchored from `split` up.** At base and
> **wide phone**, `.tabbar` is a **bottom bar**: `position: fixed; bottom: 0`, above the safe-area inset,
> with the topbar reduced to brand + trip title + save state. From **split** it returns to its current
> position under the topbar. **Same DOM, same `role="tablist"`, same three buttons, same order** — a CSS
> reposition, not a second navigation. Reason, measured rather than asserted: the shipped tab bar sits at
> `top: 2.7rem` on a 390 × 664 viewport, which is the least reachable region of a phone held one-handed,
> and it is the product's *only* top-level navigation.
>
> Consequences that are part of the rule, not optional: the page gets
> `padding-bottom: calc(<bar height> + env(safe-area-inset-bottom))` so the last row of any list is
> reachable; the bar itself gets `padding-bottom: env(safe-area-inset-bottom)`; and the bar is **opaque**
> (`--paper` + a hairline top rule) — never translucent, never blurred (P8).

> **R2 — the topbar is sticky at every width and never has a hardcoded offset under it.** `.tabbar`'s
> `top: 2.7rem` is replaced: from **split** up, topbar and tabbar are one sticky stacking context
> (a single `position: sticky; top: 0` wrapper), so the second element's offset is the first element's
> real height, whatever it turns out to be.

> **R3 — `100dvh` is not used for anything the user scrolls in on iOS.** `.app`'s `min-height: 100dvh` is
> correct and stays. `.spine`'s `max-height: calc(100dvh - 3.1rem)` is a **scroll container** and `dvh`
> changes as Safari's chrome retracts, which resizes it mid-scroll: it becomes `100svh`-based at **split**
> and above, where the spine is a sticky column, and has **no** height constraint at base, where it is a
> static block. Rule of thumb, written once: **`svh` for anything with a fixed/sticky height that must not
> move while scrolling; `dvh` only for a full-bleed element that should follow the chrome.**

**`Library` / `TripView` (planning register).**

- **base:** one column. `.triplist`'s `minmax(17rem, 1fr)` auto-fill already degrades to one column at
  320 px — verified by inspection, and it is the correct behaviour, so it stays. `.trip`'s spine sits
  **above** the pane as a horizontally scrolling city strip rather than a stacked vertical list of every
  day; the day list belongs to the selected city, not to the page.
- **wide phone:** unchanged from base except spacing.
- **split and up:** the shipped two-column `15rem | 1fr` with the sticky spine. This already works; it is
  being renamed from "the desktop layout" to "the split layout."
- **desktop:** the pane's content column is capped so a day timeline does not become a 1200px-wide line of
  14px text; the freed space is margin, not a third column. **No third column is introduced by this pass.**

**`WorldMap` (travelling / remembering register). Layout only — geometry is closed.**

- **The pane grid is already correct and already measurement-free**, and it must stay that way. A-54 G7′'s
  wrapping flex line box is the responsive mechanism: `flex: 1 1 var(--pane-min, 300px); min-width: 0`
  wraps by itself at every width with **no media query and no measured figure**, and the frame is
  byte-identical in bare Node at all widths (A-41 Part 7, W1). **This pass adds no breakpoint to
  `.worldmap__panes` and no breakpoint may be added to it** — a per-screen-size *frame* rule is forbidden by
  ruling, and a per-screen-size *cell* rule is one refactor away from being one.
- **What §3 does own:** `--pane-cap: min(38vh, 300px)` is a **viewport-unit height cap inside a scrolling
  page**, which is the one place `vh` is wrong on iOS — it does not retract with the chrome and it makes the
  map card's height change when the address bar does. It becomes `min(38svh, 300px)`. This is a one-token
  change, it moves no `viewBox`, and it is inside `styles.css` where A-54 Part 5 already licenses layout
  edits.
- **Map gestures:** the world map is an `<svg>` with `<path>` click/keyboard handlers and **no pan, no
  zoom, no pinch** — so there is no gesture conflict to resolve, and this pass introduces none. The **day**
  map is Leaflet and does pan/pinch: at base it must not be inside a horizontally scrolling ancestor, and it
  keeps a visible non-gesture path to every action it offers (§3.5).
- The `.codelist` chip run and the `.triprows` drill-down stack at base and sit **beside** the map figure
  from **desktop** up — the one place where desktop genuinely shows more at once.

**`Profile` (identity register).** §5.

### 3.4 Touch, pointer and input — the numbers, decided once

Written down here in the same spirit as `--ui-text-floor`, so they stop being re-decided per surface.

- **Primary touch target: 44 × 44 CSS px minimum** (Apple HIG, and WCAG 2.2 SC 2.5.5 AAA). Applies to
  every tab, every button that is the main action of a row, and every map country chip.
- **Hard floor: 24 × 24 CSS px** for every pointer target without exception — WCAG 2.2 SC 2.5.8 (AA), whose
  only relevant escape is a ≥ 24 px offset to every adjacent target. **`.icon` at 26 × 26 clears the floor
  and fails the target**, and it appears in rows of three with ~2px gaps, so the offset exception does not
  save it. Its **hit area** grows to 44 × 44 (padding or a pseudo-element), its **visual** box may stay 26.
- **Spacing between adjacent targets ≥ 8 px** at base.
- **Hover is never the only way to reach anything.** Today `.tabbar__tab:hover`, `.tripcard__open:hover`,
  `.worldmap__country:hover` and the `.btn`/`.icon`/`.chip` hovers are all *reinforcement* over an
  always-visible control — that is correct and is the rule: **no content and no control may exist only at
  `:hover`.**
- **Focus is always visible.** `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` is
  shipped and global. Any element that gets a custom focus style must be at least as visible, in both
  colour schemes, and **`outline: none` without a replacement is a defect.**
- **Keyboard.** The three-tab `role="tablist"` must support arrow-key traversal (`Home`/`End` too) — today
  it is click-only, which is a real WAI-ARIA tabs gap and belongs to the increment that next opens
  `App.tsx`. `Cmd/Ctrl+Z` / `Shift+Cmd/Ctrl+Z` are shipped and stay.
- **Virtual keyboard.** No surface in current scope has a focused input inside a bottom-fixed container. If
  one appears, the bottom bar hides while an input in that surface has focus rather than floating over the
  keyboard — stated now so the first surface that needs it does not invent a rule.
- **Orientation and resize.** No layout may depend on `orientation`; the breakpoints are width-only, so a
  landscape phone is simply a **wide phone**. Nothing re-measures on resize (W1 forbids it on the map, and
  no other surface measures at all), so a resize is a re-layout and never a re-computation.

### 3.5 Accessibility semantics that are part of the layout, not a later pass

- Landmarks: one `<header>`, one `<nav role="tablist">`, one `<main>` per visible panel. Shipped and kept.
- The bottom bar at base is still `role="tablist"` with `aria-selected`; a bottom position is not a
  different widget.
- Every statistic that reads as a pair is marked up as a pair (`<dl>`/`<dt>`/`<dd>`), as `.statrow` already
  does — a screen reader must get "Countries, 7", not "7".
- Every interactive `<path>` on the map keeps its `role="button"`, `tabIndex={0}`, Enter/Space handler and
  `aria-label` (shipped) — and **R39-6 is open**: an extent pane's `aria-label` says *", shown in a separate
  frame"* where the visible caption does not. That is a builder item and it is not made worse here.
- Text scaling: at 200% browser zoom on a 390px viewport, nothing may be clipped or become unreachable.
  This is a §6 assertion, not an aspiration.

---

## 4. The tooling ruling

Full reasoning, the eight candidates and the evidence behind each: **`ARCHITECTURE.md` §9 A-55.** The
outcome, so a builder does not have to open it:

| Tool | Verdict |
|---|---|
| **Playwright** (1.56.1, installed) | **USE — required infrastructure.** Device profiles, not bare viewports. §6 |
| **Impeccable** | **SELECTIVE USE.** `docs/VISUAL-TELLS.md` stays as-is *and* the skill may be vendored for its critique/audit vocabulary. **No hooks, no settings changes, no CLI, no npm dependency.** Advisory; never outranks §1 |
| **Emil `emil-design-eng` + `animate`** | **USE, vendored.** They are the source of P6's motion budget. Construction-time only; not a design authority |
| **UI/UX Pro Max** | **REJECT.** Jacob already removed it from this repo once (see A-55) |
| **21st.dev** | **DEFER — operationally.** Blocked by the egress proxy for agent tools. Not architecturally rejected |
| **Tailwind CSS** | **REJECT for `apps/web`.** Re-open only if a second frontend app appears |
| **shadcn/ui + Radix** | **DEFER.** Trigger unchanged and **not** hit by I-8b. Radix primitives may be adopted **individually** when a surface needs focus-trapping/dismissal correctness |
| **Vaul** | **REJECT.** Cairn has no bottom-sheet surface, and the package is stale |

**The dependency boundary, confirmed explicitly because the question keeps recurring.**
`cairn-constraints` §2 reads: *"No runtime dependencies in `packages/core` or `packages/client` … `apps/web`
may take dependencies; nothing it depends on may leak back across the boundary. Adding a dep to either
package needs Jacob."* **"Either package" is `core` and `client`.** So:

- `packages/core`, `packages/client` — **zero runtime dependencies, no DOM, no React.** Nothing in this
  document, §4, or any tool decision changes that, now or later.
- `packages/tokens` — presentation values, no logic, no dependencies.
- `apps/web` — **may take runtime dependencies.** It already has three (`react`, `react-dom`, `leaflet`).
  A new one is an architectural decision recorded here, not a builder's call, and it may never be imported
  from `core`, `client` or `tokens`. The import-direction test in §3 of `ARCHITECTURE.md` is what enforces
  it.

---

## 5. I-8b — Profile, the design target

**This is the first proof of §1–§3.** It is deliberately the smallest screen that can prove them: it has
real data, no new backend, and no map geometry to argue about.

### 5.1 The data, and only the data

From `travelStats` via the `travelHistory` selector — **`ROADMAP.md` I-8b's already-approved scope, with
nothing added**:

`countries[]` (`code`, `firstVisit`, `lastVisit`, `tripIds[]`, `provisional`) · `cities[]` (`name`,
`countryCode`, `tripIds[]`, `provisional`) · `trips` (`planned` / `active` / `completed`) · `daysTravelled` ·
`located` and `unattributed` (each `{cities, places, stops}`) · `unnamedCities` · plus `state.library` for
trip titles and dates, and the I-6 rescan indicator.

**Not in this increment, and not to be designed in:** photos, a map on Profile with city pins
(`TripSummaryRow` carries no city coordinate — A-40 Part 5), achievements, goals, participants (I-9/I-10),
distance by mode (§8.10), an avatar upload, or any editable identity field. **A screen that needs one of
these to look good has failed §0 rule B.**

### 5.2 What the screen is *about*

Not "your stats". **A person's travel life, stated in their own numbers, with the holes admitted.** The
whole screen is one editorial page with four movements:

1. **The claim** — the identity line. The largest type on the screen.
2. **The record** — countries and cities, as a readable body of places rather than a table.
3. **The shape of it over time** — first and last visit, and the trip lifecycle counts.
4. **What we do not know** — the unattributed count, `unnamedCities`, and the rescan state.

Movement 4 is not a footnote and not an error state. **On this product it is a feature**, and it is the
single strongest anti-generic move available on this screen: no dashboard admits its own denominator.

### 5.3 Composition — base (320–599)

Single column, `padding: 1.25rem 1rem`, bottom padding clearing the bottom bar and the safe area.

- **Identity line.** `--t-display`, condensed uppercase, two or three lines, set as **prose with the
  numbers inline in mono at display weight**, not as stat tiles:
  > **7 COUNTRIES · 19 CITIES · 46 DAYS TRAVELLED**
  with a quieter body line under it naming the span — *"across 3 trips, from Aug 2019 to Aug 2026"* — built
  from `trips` and the min/max of `firstVisit`/`lastVisit`. Numbers in `--font-mono` with
  `font-variant-numeric: tabular-nums`; labels in tracked mono at the 11px floor. **This replaces
  `.statrow`'s three boxes with one typographic statement**, and it is the P1/P4 proof. **Scope, ruled
  (R41-14):** *on this screen*. The Map keeps `.statrow` until the increment that opens `WorldMap.tsx`
  (§5.6's fence, §7), so for the duration of I-8b the same three numbers are deliberately set two ways one
  tab apart. That is a **stated and bounded** divergence with a named end, not a licence for a third
  treatment and not a defect to re-file: the Map's stat row converges in the same pass that adopts §5.5's
  shared refusal.
- **The country record.** A single-column list, one row per country, `--rule-soft` hairline between rows —
  **no card, no border box, no chevron**. Each row: the **ISO code in mono at h2 scale** as the leading
  element (it is the country's identity on this product and it is already the map's vocabulary), the
  country's trip count, and the visit span in mono at `--t-small`. `provisional` rows carry the shipped
  provisional treatment — a dashed outline mark, never lower ink (P3, P5).
- **Cities.** Text, per A-40 Part 5, and **grouped under their country row rather than listed separately** —
  a run of names at `--t-body` on one wrapped line, `--ink-soft`. This is where cities cost nothing and read
  as content.
- **What we do not know.** A single block with a `border-left: 2px solid var(--line)` (the shipped
  `.worldmap__gap` idiom, reused rather than reinvented) carrying, in prose: the unattributed count against
  its denominator, the `unnamedCities` count if non-zero, and — distinguished, per I-8b's own criterion —
  *"no places yet"* when `located` is zero versus *"everything attributed"* when `unattributed` is zero.
- **Trips.** The lifecycle counts as one line, with `completed` first and at full strength (P3).

**No section on this screen is a card.** The screen's structure is: display head → hairline-separated rows →
a marked prose block. That composition is the P1 rendered test passing by construction.

### 5.4 Composition — split (≥ 900) and desktop (≥ 1280)

**Desktop shows more at once; it does not show the same thing bigger.**

- At **split**, the page becomes **two columns, `minmax(0,1fr) | 20rem`**, inside the 62rem ceiling. Left:
  the identity line and the country record. Right, sticky (`top` = the sticky header stack, `svh`-based):
  the **trip lifecycle counts, the "what we do not know" block and the rescan indicator** — the metadata
  about the record, beside the record instead of after it.
- At **desktop**, the left column's country record goes to **two columns of rows** (`columns: 2` on the
  list, or a two-column grid — either is acceptable; the rows must stay hairline-separated and must keep
  reading order down-then-across). The identity line stays full width above both.
- At **wide**, nothing changes but the margins. Asserted, not designed.

### 5.5 Interaction, states, motion

- **Tapping a country row** selects it and reveals its trips inline (the existing `.triprows` treatment,
  reused). It does **not** navigate away and it does **not** open a modal — I-8b needs no dialog, which is
  why the shadcn trigger is not hit (§4). The row is the accordion; the expansion is the only motion on the
  screen.
- **Motion budget for this screen: one animation.** The row expansion — height/opacity, **≤ 180 ms**, a
  decelerating curve, interruptible, off under `prefers-reduced-motion`. Nothing else on Profile animates.
  No entrance, no stagger, no count-up.
- **Loading.** The shell already shows *"Opening your trips…"* while booting. Profile adds nothing: if
  `state.library` is read and the rescan is still running, the screen renders what it has and says
  *"Recomputing…"* over it — the shipped honest-state pattern from `Library`, not a spinner.
- **Empty.** `stats.countries.length === 0`: the screen shows the identity line with **zeroes, not
  placeholders**, and one sentence naming the two ways to fill it (record a past trip; open a trip you have
  taken) — the same wording register as `WorldMap`'s empty state. **No illustration, no ghost cards.**
- **Refusal.** `travelHistory(state, today).ok === false` renders the same *"We could not read your travel
  history"* banner the world map renders, with the offending row id and the parser message — **the same
  words**, because one vocabulary for "could not be read" is already the rule. A user meets this failure on
  two tabs one tap apart; two wordings for one fact is the product defect, and it is the *words* that carry
  that, not the file the JSX lives in.

  **Precedence, ruled — R41-14.** Revision 1 asked for *"the same component and the same words"* while §5.6
  fenced `WorldMap.tsx` at a zero-line diff, and one import cannot be both. **§5.6 wins; §5.5 yields its
  mechanism and keeps its words.** Concretely, for the duration of the fence:
  1. The shared component **exists** and the Profile uses it — `apps/web/src/views/Refusal.tsx`. The world
     map keeps its inline copy and **adopts the component in the first increment that opens `WorldMap.tsx`
     for a reason of its own** (§7 carries that as a deferral with its trigger, so it is scheduled rather
     than remembered).
  2. While the duplication exists it is held equal by a **rendered equivalence assertion over both refusal
     branches** (§6.2) — the two surfaces' banners must produce **identical text on screen**. A list of
     sentences asserted to appear in both *source files* does **not** discharge this: R41-13 mutation-tested
     exactly that shape and it passes a fourth sentence added to one side and an inverted `rowId` branch.
     An allow-list is a duplication nobody is watching, wearing the costume of one that is watched.
  3. Neither surface's refusal may gain a sentence, a branch or a control the other does not have. The way
     to add one is to adopt the component first.

  *Why not the alternatives, in a sentence each.* Extracting the strings to a shared module still needs a new
  import in `WorldMap.tsx` (it inlines them today) and the only module it already imports is `@cairn/client`,
  which §5.6 fences and which is the wrong home for UI copy. Carving a "text-only refactor" exception out of
  the fence destroys the property that makes the fence cheap — that nobody has to adjudicate what counts as
  text-only. And withdrawing the identity requirement in favour of *"the same idea"* makes drift **legal**
  rather than merely unwatched, which is the worse of the two failures.
- **Error inside the surface** is caught by the shell's per-tab `TabBoundary`, which already exists and
  which Profile inherits by being registered.

### 5.6 Shell and WorldMap changes this needs — bounded, and this is the whole list

1. **`App.tsx`: register the third tab.** `TabId` gains `'profile'`, `TABS` gains one entry. The shell was
   built for exactly this ("adding it is a registration, not a second shell").
2. **The bottom bar at base (R1) + the sticky-stack fix (R2) + safe-area padding.** This lands here because
   this is the increment that makes the shell carry three tabs, and a three-tab top bar at 320 px is where
   the current arrangement first visibly fails.
3. **`--pane-cap: min(38vh → 38svh, 300px)`** (R3). One token. No `viewBox` moves.
4. **Touch-target floors on `.icon`, `.tabbar__tab`, `.btn`, `.chip`** (§3.4). Hit area only; visual boxes
   unchanged, so no other surface's composition moves.
5. **Tablist arrow-key traversal** (§3.4), since `App.tsx` is open anyway.

**Explicitly not in I-8b:** any change to `WorldMap.tsx` (it is a zero-line diff for three increments
running and there is no reason for this to be the fourth), any change to the world map's geometry, any
change to `packages/core` or `packages/client`, any new dependency, any `SUMMARY_VERSION` bump.

**What the `WorldMap.tsx` fence is, and is not — R41-14.** It is a *mechanical proxy* for
`ARCHITECTURE.md` §9.2 fence 1, the settled map arc A-40 → A-54. What it actually protects is the
geometry and the rendering logic — the frame, the panes, the `viewBox`, W1's identifier counts — and its
whole value is that it costs no judgement: `git diff --stat` decides, and no reviewer has to rule on whether
a particular diff was "only text." **That is why it is not narrowed here.** An exception carved for one
text-only extraction would have to be re-argued for the next one, and the increment that would carry it is
the one currently going back with three MAJOR findings; opening the map file mid-send-back converts a
zero-risk item into a re-verification of the map. The fence therefore stands, and its two visible costs are
named rather than left to be discovered by the next reader: the duplicated refusal (§5.5, held equal by
§6.2) and the Map's surviving `.statrow` (§5.3). Both end in the same future increment, and §7 records it.

---

## 6. The rendered acceptance standard

**A design decision that was not rendered was not verified.** Source-code reasoning does not discharge
anything in this document. This is the standard for I-8b and for every surface increment after it.

### 6.1 The matrix — five viewports, and they are device profiles, not widths

Playwright 1.56.1 is at `/opt/node22/lib/node_modules/playwright` with
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. Existing probes use `newContext({ viewport: { width, height } })`,
which emulates **no touch, no device pixel ratio and no coarse pointer**. Surface probes from here on use
`...devices[...]`, which does.

| # | Context | Why |
|---|---|---|
| 1 | `devices['iPhone SE']` — 320 × 568, DPR 2, touch | the smallest real phone; the width where A-54 measured a 12px overflow |
| 2 | `devices['iPhone 14']` — 390 × 664, DPR 3, touch | the reference phone across this whole arc |
| 3 | `devices['iPad Mini']` — 768 × 1024, DPR 2, touch | the **split** boundary from below: a touch device that is *not* a phone |
| 4 | `{ viewport: { width: 1280, height: 800 } }` | **desktop**, mouse + keyboard |
| 5 | `{ viewport: { width: 1600, height: 900 } }` | **wide** — asserts that *nothing changes* except margins |

Every assertion below runs at every applicable context, in **both colour schemes**
(`newContext({ colorScheme: 'light' \| 'dark' })`) — dark mode is already in the contract (§2), so it is
verified, not added.

### 6.2 What is asserted — computed style and geometry, not screenshots

Screenshots are **evidence to look at**, never the assertion. Each of these is a `page.evaluate` measurement
with a pass/fail:

**Layout integrity**
- **No horizontal overflow.** `document.scrollingElement.scrollWidth ≤ innerWidth + 1` at every context.
- **No element extends past the viewport.** No `getBoundingClientRect().right > innerWidth + 1` for any
  element with a non-zero box.
- **No clipping.** For every scroll container, `scrollWidth ≤ clientWidth + 1`; for every element with
  `overflow: hidden`, no child's rect exceeds its padding box by > 1 px.
- **No dead space.** On Profile, the tallest run of vertical space containing no rendered ink is
  **≤ 25 % of viewport height** at contexts 1–3 and **≤ 33 %** at 4–5. *(A container-level criterion, in
  the shape A-54 Part 1 established: a criterion written about the box one level in cannot see the box one
  level out.)*
- **`wide` changes nothing but margins:** the computed `getBoundingClientRect().width` of every element
  inside the content column is **identical at 1280 and 1600**, and the only differing value is the
  container's left offset.

**Touch and pointer**
- Every element matching `button, a[href], [role="button"], [role="tab"], input, select` has a hit box
  **≥ 24 × 24** at every context (hard floor, §3.4) and **≥ 44 × 44** at contexts 1–3 for anything tagged as
  a primary target. **Injected fault:** restore `.icon`'s 26 × 26 hit area and the assertion goes red at
  contexts 1–3.
- **Adjacent-target spacing ≥ 8 px** at contexts 1–3.
- **No control or content exists only at `:hover`.** For each element with a `:hover` rule, its computed
  style at rest has non-`none` `display`, non-`hidden` `visibility` and non-`0` `opacity`.

**Safe area and viewport units**
- With `viewport-fit=cover` set, **the bottom bar's `padding-bottom` resolves to `env(safe-area-inset-bottom)`**
  and the scroll container's bottom padding clears the bar. *(Chromium reports these insets as `0px`, so
  this assertion **cannot be discharged in Chromium alone** — see §6.4.)*
- **No `vh` or `dvh` unit remains on a fixed-height scroll container.** A greppable ceiling over
  `styles.css`, in the shape of W1's: `100vh`, `100dvh` and `38vh` may not appear on `.spine` or
  `--pane-cap`. **Injected fault:** put `38vh` back and the grep goes red.

**Focus, keyboard and semantics**
- Tab through the page: **every focusable element has a visible focus indicator** (computed `outline-width`
  ≥ 2px or an equivalent explicitly allow-listed), in **both** colour schemes.
- **Tab order equals visual order** on Profile at every context — including at **desktop**, where the
  two-column country list must read down-then-across.
- **Arrow keys move between tabs**, `Home`/`End` go to first/last, and exactly one tab has
  `aria-selected="true"`.
- One `<main>` per visible panel; `role="tablist"` present at every context **including base**, where the
  bar is at the bottom.
- Every stat pair is `<dt>`/`<dd>` inside a `<dl>`.

**Visual identity and hierarchy**
- **No rendered text below 11 px** (`--ui-text-floor`), outside a named allow-list. Shipped rule, re-asserted
  on the new surface.
- **No `backdrop-filter` other than `none`**, and **no `linear-gradient`/`radial-gradient` background on a
  chrome element** (the map's own fills exempt by named selector). The two I-8a removals, permanent.
- **Body text meets WCAG AA (4.5:1) against its composited background**, and non-text graphical objects meet
  1.4.11 (3:1), **in both colour schemes** — the discipline R34-7 and R36-6 already established.
- **P3 is asserted:** for the lifecycle chips, the computed contrast of `completed` is **≥** that of
  `planned`. **Injected fault:** give `.chip--life-completed` a lower-contrast ink and it goes red.
- **P4 is asserted:** the largest and smallest rendered font sizes on the surface differ by **≥ 2.5×**, and
  no three consecutive levels of the type hierarchy are within 2 px of each other.
- **Nesting ceiling:** no element with a visible border is nested more than **two** deep inside other
  elements with visible borders.
- **Motion budget:** every non-zero `transition-duration` / `animation-duration` on the surface is
  **≤ 300 ms**, no `transition-timing-function` is a bare `ease-in`, and **under
  `newContext({ reducedMotion: 'reduce' })` every one resolves to `0s`.**

**Interaction, driven — not inspected**
- Tap a country row (`page.tap`, touch context): its trips appear, the row's `aria-expanded` flips, and the
  page's scroll position does not jump.
- Tap it again: it collapses. Press `Enter` on it with the keyboard: same result.
- Switch tabs Trips → Map → Profile → Trips: each panel renders, none throws, the world map's rendered
  `viewBox` after being hidden equals the one `worldMapFrame` returned *(the shipped hidden-container
  assertion, re-run because Profile adds a third mounted panel)*.
- **Refusal path, driven:** plant an unreadable summary row, open Profile, assert the refusal banner with
  the row id — and assert the **other two tabs still work**, which is what the per-tab error boundary is for.
- **Refusal equivalence, driven — §5.5's ruling, and the criterion that replaces R41-13's allow-list.**
  With one planted library, open **Map** and **Profile** in the same session and assert that each surface's
  `.banner--error` has **identical normalised text content** (collapse whitespace; compare the banner
  subtree only — the surfaces' own `<h1>`s differ by design, and the map's banner carries no test id and
  **may not be given one**, because that is a `WorldMap.tsx` diff). Assert it on **both** branches of the
  message, both of which are reachable from real storage: a **duplicate summary id** (`rowId` non-null) and
  a **malformed stored date** (`rowId` null — `packages/client` §`travelHistory`). **A source-substring
  check over the two files does not discharge this criterion.** **Injected fault:** each of R41-13's three
  mutations of `Refusal.tsx` — reword a listed sentence, add a fourth sentence the map does not have, invert
  the `rowId` conditional — must go **red**; `qa/r41-refusal-drift.sh` already applies all three and reads
  the colour, so it is the fault harness, not a new one. This criterion retires with the duplication (§7).
- **Empty path, driven:** an empty library renders zeroes and the two-ways-forward sentence, and **zero**
  elements matching the country-row selector.
- **Provisional path, driven** *(I-8b's inherited criterion)*: one `completed` trip to `AT` and one `active`
  trip to `AT` + `GB` renders `GB` in the provisional treatment and `AT` in the confirmed one **on the
  Profile**, with the map asserted in the same pass. **Injected fault:** render them identically and it goes
  red.

### 6.3 Map gesture conflict

The world map has no pan/zoom, so the assertion is a **ceiling**, not a behaviour: on the Profile and Map
surfaces at contexts 1–3, a vertical touch drag starting on a country `<path>` **scrolls the page** — i.e.
no element in the map subtree sets `touch-action: none` and no handler calls `preventDefault` on
`touchmove`. **Injected fault:** add `touch-action: none` to `.worldmap__svg` and the drag stops scrolling.

### 6.4 The one thing Chromium cannot verify, stated rather than skipped

**Only Chromium is installed** (`/opt/pw-browsers`: chromium 141 + headless shell + ffmpeg; `webkit` and
`firefox` are absent and `browserType.launch` fails on both — measured). Chromium's iPhone device profiles
emulate viewport, DPR, touch and UA. They do **not** emulate iOS Safari's retracting browser chrome, its
`dvh`/`svh` behaviour, its virtual-keyboard viewport resize, or `env(safe-area-inset-*)`, which report
`0px`.

So **the safe-area and iOS-chrome assertions in §6.2 are not discharged by the Chromium matrix**, and a
report that claims them from a Chromium run is making a claim it did not measure. Two honest ways forward,
in order:

1. **Install WebKit and add it as context 6.** `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
   node /opt/node22/lib/node_modules/playwright/cli.js install webkit` — the CDN URL resolves through the
   egress proxy (probed 2026-09-01: `HTTP/2 307` to the Microsoft mirror), so this is expected to work and
   should be attempted first. WebKit is the engine iOS Safari uses; it still is not a phone, but it is the
   right engine and it honours `svh`/`dvh` semantics.
2. **If WebKit will not install:** assert what *is* checkable in Chromium — that the declaration exists in
   the computed style (`padding-bottom` contains `env(safe-area-inset-bottom)` in the cascade, resolving to
   `0px`), and that the layout is correct with the inset forced non-zero by a test-only override that sets
   the fallback (`env(safe-area-inset-bottom, 34px)`). Then **record the residue in `BUILD-NOTES.md` as an
   unverified claim**, which is the project's existing convention for a thing that could not be run.

**Screenshots are still taken and still looked at**, at every context in both schemes — that is how R38-3's
"grey block" and A-54's "card-white slack" were actually settled. They are an input to judgement, and they
are not a substitute for any assertion above.

---

## 7. Deliberately deferred, with the trigger for each

| Deferred | Why | Reopen when |
|---|---|---|
| **Photography anywhere in the UI** | there is no photo pipeline until Phase 6, and faking one breaks §0 rule B | `PhotoAsset` exists and a real library is readable |
| **Achievements, streaks, goals** | `Goal` is modelled (§8) and unbuilt. AllTrails/Strava were cited for *artefact value*, not for badges | Phase 7 |
| **A Discovery surface** | there is no third tab and no fourth slot, by ruling | the roadmap schedules it |
| **Participants on Profile** | I-9/I-10, and it is a schema change | I-10 |
| **An animated map re-frame** | the frame is measurement-free by ruling (A-40 W1); an animated re-frame is the fastest route back to the hidden-container bug | never, without an architect ruling that says how it stays measurement-free |
| **A design-token package or a CSS framework** | §4 | a second frontend app exists (`apps/mobile`) and needs the same tokens |
| **Custom scroll-driven or view-transition effects** | P6's budget, and `@view-transition` is not baseline across the two engines we would have to verify in | both engines verified in this environment |
| **A component library of any kind** | §4; Cairn has one screen family and it is not big enough to have a component-library problem yet | a surface needs a real modal **and** a combobox together (the standing shadcn trigger) |
| **Light/dark manual toggle** | `prefers-color-scheme` is honoured and there is no place to put a setting; adding one is a settings screen, which Profile is explicitly not | a settings surface exists |
| **The Map adopting `views/Refusal.tsx`, and the Map's `.statrow` becoming §5.3's typographic statement** | Both are `WorldMap.tsx` diffs, and §5.6's zero-line fence outranks §5.5's *"same component"* (R41-14). Neither is invisible in the meantime: the words are held equal by §6.2's rendered equivalence check, and §5.3 names the two-treatment divergence | the **first increment that opens `WorldMap.tsx` for a reason of its own** — it does both in that pass, and §6.2's equivalence criterion retires with the duplication |
| **`MGR-6` / `R40-3`** — I19's quantifier for non-WGS84 coordinate domains | an architect item, correctly MINOR, unreachable from any real data, and **inside the settled geometry arc this pass is fenced out of** | the next architect pass that opens §4.4 for a reason of its own |
