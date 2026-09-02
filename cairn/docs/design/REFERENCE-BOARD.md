# The Cairn Visual Reference Board — 2026-09-02

**Status: VISUAL AUTHORITY. This document outranks every visual prescription in
`cairn/docs/DESIGN.md`.** It records Jacob's rejection of the shipped I-8b visual direction and the
weighted reference set he supplied to replace it. `DESIGN.md` §0 now points here; where the two
disagree, this document is the spec.

**Who reads this:** every agent that is about to change a pixel. It is ~6k tokens and it is the
cheapest document in the design set. Read it whole. `docs/DESIGN.md` is the mechanical contract that
implements it.

---

## 0. THE BOARD IS A FILE. OPEN IT.

> ### `cairn/docs/design/references/cairn-visual-reference-board.png`
> **3600 × 5000, 8-bit RGB, 4.7 MB. In the repository. Committed.**
>
> **Open it with the Read tool before you make or revise a single visual decision.** Not §2 of this
> document. Not Jacob's prompt. Not your own earlier summary. **The file.**

This is a rule with a scar behind it. The first pass at this document was written from a careful,
good-faith *text description* of the board by an agent who had genuinely seen it — and the text was
still wrong about three things that changed the design, one of them fundamental. §8 lists them.
**A description of a taste artifact is not the artifact**, and the gap does not announce itself: the
prose reads perfectly convincing right up until you open the PNG and find no serifs anywhere.

So the precedence order in this document is:

1. **The PNG.** Primary evidence, and the only thing here that is evidence at all.
2. **Appendix A, Jacob's ruling verbatim.** His words about the board — weighting, borrows,
   refusals, the gate.
3. **§2–§9 of this document.** *Supplementary, derived, and subordinate.* Written by an agent that
   had the PNG open. Useful as an index and as a record of what was decided; **not a substitute for
   looking.** Where §2 and the PNG disagree, the PNG is right and §2 is a defect to fix.

If you are about to write CSS and you have not opened the PNG in this session, stop and open it.

**Sampling it, rather than describing it.** Colour values in `directions/tokens.css` were measured
off the file by `docs/design/sample-board.mjs`, which scans rectangles and reports their extremes.
Re-run it rather than trusting a hex written in prose — including the ones in §7 below.

---

## 1. What was rejected, and why it is not a polish request

Jacob has seen I-8b's Profile and the World Map rendered on his own phone and rejects the visual
direction **in full**. In his words: *"unattractive, bland, overly typographic, and emotionally
empty… reads more like a technical report, transit atlas, or typeset database than a premium
consumer travel product."*

On the map specifically:

> geography is broken into disconnected visual pieces; it does not immediately read as a coherent
> travel history; the relationship between routes, places, trips, memories, and the world is weak;
> concepts such as "distant parts of" are visually confusing; **correct geographic behavior has been
> mistaken for successful visual design.**

**This is a rejection of the visual language, not of the product.** Explicitly preserved: Cairn's
settled product semantics, data integrity, geographic correctness, accessibility requirements and
functional architecture.

**Explicitly forbidden as a response:** *"Do not spend another cycle polishing separators, empty
space, type ratios, or minor styling inside this rejected composition."*

### Why the previous pass diverged from the board — the diagnosis, in four sentences

1. **The board's own references were translated into a table of things *not* to take.** `DESIGN.md`
   revision 1 §1 listed nine references and, for six of them, the "take" column was an abstraction
   (*"that a completed thing is an achievement worth rendering"*) while the "do not take" column was
   the concrete visual thing (*"large photography now"*, *"its illustration style"*, *"its map is a
   tiled map and ours is deliberately not"*). Every visually specific instruction was in the refusal
   column, so the references constrained the design without ever supplying it.
2. **"Not SaaS" was allowed to stand in for a direction.** P1's rendered test is *count the bordered
   boxes* — a test a blank page passes. Five of the nine principles are written as prohibitions.
   A principle set that can only subtract converges on emptiness, and it did.
3. **Rule B (a screen may only show what exists) was correct and was applied one step too far.** It
   correctly forbids fake photographs. It was read as also forbidding *composition at photographic
   scale*, so every large surface on the product became type — which is exactly the "typeset
   database" Jacob names.
4. **The map's correctness was mistaken for its design.** A-40…A-54 settled a genuinely hard problem
   (measurement-free framing, multi-part countries, distant extents) and the pane grid that fell out
   of it — grey rectangles containing detached country silhouettes with a caption strip — was never
   designed, only verified. Jacob's sentence for this is the one to keep: *correct geographic
   behavior has been mistaken for successful visual design.*

---

## 2. An index to the board — *supplementary to §0's file, never a replacement for it*

**Read this only as a table of contents for the PNG.** Every row is a pointer to a region of an
image you should have open. Nothing here is evidence.

Cream/off-white ground (measured `#f2efe9`). Eyebrow "CAIRN" in brick red (measured `#d4503a`).
Headline "Visual reference board" in a heavy neo-grotesque sans. Subhead: *"Map-first travel history
— richer, warmer, and unmistakably alive."* Six cards, each a pillarboxed screenshot, a bold
uppercase caption, and a one-line "Borrow:" note. Footer in small caps: "REFERENCE USE ONLY • PUBLIC
PRODUCT / EDITORIAL IMAGERY", a sources credit line (OutdoorMonster, Cosmos.so, Airbnb Newsroom 2025
Summer Release, Popular Science, TechRadar, Condé Nast Traveller/Squire Fox), and the closing line:

> **Design direction: maps carry the story; photography supplies emotion; interface stays calm,
> legible, and premium.**

### The six cards, in Jacob's weighting

| # | Reference | Weight | What was on the card |
|---|---|---|---|
| 1 | **Polarsteps** | **PRIMARY** — full-width top card, *"the strongest reference on the board"* | Three panels: (a) a dark immersive **3D globe**, a landmass glowing violet against a starfield — atmospheric, not a flat map; (b) a "Travel stats" card floating over the globe — *"You've seen: 32 countries, 16% of the world"* with small map thumbnails — and a separate "Now traveling" card with the traveller's avatar photo over a full-bleed location photograph (an ornate Moroccan/Middle-Eastern archway); (c) a rich, **tilted satellite-textured terrain map of South America** with a dotted route connecting circular stop markers **that each contain a small destination photograph**, plus a floating "Day 16" progress badge |
| 2 | **Cosmos** (cosmos.so) | secondary — visual exploration | A spare, confident landing hero on cream ground; large mixed serif/sans headline *"Your space for inspiration"*; two pill buttons. **Borrow: visual rhythm, discovery, variation, and intrigue** |
| 3 | **Airbnb — Where To + Trips** | secondary — premium consumer polish | Two dark-mode phone shots: an experience listing card with a real photograph (*"Get in the ring with a real Mexican luchador"*) and nav icons; an itinerary detail view with small round avatar photos and a "Details" action. **Borrow: premium hierarchy and polish. Keep Cairn map-first** |
| 4 | **AllTrails / Strava** | secondary — route and tracking presentation only | A light outdoor trail map (green terrain, a drawn trail line, an elevation graph beneath) beside a real photograph of a person on a wooded dirt path with a pace/distance overlay. **Borrow: route lines and terrain as beautiful visual artifacts** |
| 5 | **Apple Journal** | narrow — memory and reflection surfaces only | A "Monday Jun 5" entry: a 2×2 grid of small real photographs (a beach walk, a concert, a shell, an ocean) above a paragraph of intimate first-person text. **Borrow: intimate photo clusters woven into remembered moments** |
| 6 | **Editorial travel photography** (Condé Nast Traveller / Squire Fox) | full-width bottom card | One large, UI-free, cinematic photograph — sand-dune ripples meeting turquoise water, warm and moody. **Borrow: let exceptional photography breathe at genuinely large scale** |

### What each reference is explicitly *not* licence for

Jacob wrote these limits himself; they are as binding as the borrows.

- **Polarsteps** — *"Do not copy Polarsteps literally. Cairn needs its own identity, product model,
  and visual language."*
- **Cosmos** — *"Do not turn Cairn into an image-bookmarking application."*
- **Airbnb** — *"Cairn must remain map-first. Do not turn the product into a conventional card feed or
  make Trips the primary organizing metaphor."*
- **AllTrails/Strava** — *"secondary references for route and tracking presentation, not Cairn's
  overall identity."*
- **Apple Journal** — *"a reference for Cairn's memory and reflection surfaces, not its main
  navigation or overall visual system."*
- **Editorial photography** — *"Do not reduce every photograph to a small card thumbnail."*

---

## 3. The extracted Cairn qualities — design around these, not around components

Jacob: *"Do not mechanically combine components from the referenced products. Identify and design
around the recurring qualities I selected."* Verbatim:

1. map-first
2. photography-rich
3. premium but approachable
4. emotionally connected to travel
5. spatial and exploratory
6. visually varied but coherent
7. contemporary
8. restrained interface chrome
9. immediately understandable geography
10. routes, stops, trips, photographs, and memories forming one system
11. past travel feeling valuable and alive
12. distinctive enough to be recognizable as Cairn

---

## 4. Anti-patterns — refuse all of these

Jacob's list, verbatim, plus the two the diagnosis in §1 adds.

- another typography-and-hairlines editorial report
- a SaaS dashboard
- a statistics dashboard
- a generic card grid
- nested rounded rectangles
- repetitive bento layouts
- gratuitous glassmorphism
- purple-blue AI gradients
- excessive pills
- weak gray-on-gray hierarchy
- small photographs trapped in uniform cards
- decorative maps that do not communicate travel
- disconnected geographic fragments without a clear world or journey context
- visual complexity without product meaning
- three nearly identical alternatives
- placeholder achievements, social content, memories, or photography presented as shipped
  functionality

> *"'Not SaaS' is not an adequate design direction by itself."*

**Added by §1's diagnosis, and they are the two that produced I-8b:**

- **A principle written only as a prohibition.** Every principle in the replacement contract must be
  something a screen can be built *from*, not only judged against.
- **Verified geography presented as designed geography.** The frame being provably correct says
  nothing about whether it reads as a journey.

---

## 5. Corroboration from the tooling, not just from taste

Impeccable's own craft floor (`.claude/skills/impeccable/reference/craft-floor.md`, pinned revision
in `.claude/skills/impeccable/PINNED-REVISION.txt`) independently names three of I-8b's shipped
moves as category defaults to refuse. This matters because it is a second, mechanical witness that
Jacob's reaction is not a matter of personal taste:

| Impeccable's rule | What I-8b ships |
|---|---|
| *"A kicker or eyebrow above a heading. **This one is a ban, not a default: no brief earns it back.**"* | `YOUR TRAVEL RECORD` above the Profile display head; `TRAVEL HISTORY` above `EVERYWHERE YOU HAVE BEEN` on the Map |
| *"The hero-metric template: big number, small label, supporting stats, accent."* | the Map's `COUNTRIES 7 / TRIPS 1 / DAYS TRAVELLED 16` stat row |
| *"Monospace as a costume for 'technical' rather than for code, data, or measurement."* | `DESIGN.md` P9.2 — *"mono for every number, code, time, count and micro-label"* — applied to trip counts, city names' neighbours and the tab labels |

`craft-floor.md` also supplies two positive requirements the rejected direction has no answer for:
*"Browser surfaces: the parts you did not draw still carry the design — text selection, the caret,
scrollbars, focus rings, underline offset, tabular numerals"*, and *"Motion: one authored moment,
not scattered effects."*

**A third, independent witness.** Anthropic's `frontend-design` skill lists the three looks that
AI-generated design currently clusters into. Its number three is: *"a broadsheet-style layout with
hairline rules, zero border-radius, and dense newspaper-like columns."* That is a description of
shipped I-8b written by a party that had never seen it. Its number one — *"a warm cream background
(near #F4F1EA) with a high-contrast serif display and a terracotta accent"* — is the trap the
**replacement** was walking into before the PNG was opened (§8), and it is why the new type system is
a grotesque rather than a serif even though the ground is warm off-white.

---

## 6. The gate — this is a rule, not a courtesy

> **Jacob's explicit visual selection is required before broad UI implementation begins.** His
> reaction to rendered pixels is the gate.

Consequences, stated so a future session cannot misread them:

- **A passing test suite is not visual approval.** Neither is a green Impeccable audit.
- **An agent's SHIP verdict is not visual approval.** I-8b was SHIP-verdicted by a manager pass and
  then rejected by Jacob; that sequence is the reason this clause exists.
- **No agent may pick the direction on Jacob's behalf**, and no agent may treat "he did not object"
  as selection.
- After he selects a direction, that direction becomes the visual authority for implementation, and
  `DESIGN.md` is rewritten from it in the same pass.

---

## 7. What the board actually establishes — measured, not described

Every value here came out of `docs/design/sample-board.mjs`, which scans a rectangle of the PNG and
reports its extremes. **Re-run it rather than trusting this table** — it exists so that the next
agent does not have to take a hex on faith from prose, which is the failure §8 records.

| Role | Measured | Where in the PNG |
|---|---|---|
| Ground | **`#f2efe9`** | the board's own paper, sampled at two widely separated points and identical in both |
| Ink | **`#161714`** | the "Visual reference board" headline |
| Secondary ink | **`#676a62`** | the subhead. A *warm* grey, not a neutral one |
| **Accent** | **`#d4503a`** | the "CAIRN" eyebrow **and** the "PRIMARY" pill on the Polarsteps card — measured independently in two regions, identical in both. **This is Jacob's own accent on his own board.** Brick/vermilion |
| Live / now | **`#da005a`** | Polarsteps' current-position dot, and the ring around its selected marker |
| Space | **`#04121c`** → `#000` | Polarsteps' globe background |
| Atmosphere | **`#003e60`** | the cyan limb glow on the globe — the single most "alive" element on the primary card |
| Route | **`#ffffff`** | Polarsteps' route line. **Not** the accent |
| Sand | **`#f9eec8`** | the Condé Nast dune |
| Trail | green ≈ `#c6ffb3` highlights | AllTrails' route |

**Structural facts, read off the pixels:**

- **The board is predominantly LIGHT.** Median luma is 238–250 across its own ground, Cosmos,
  Journal and the Airbnb card. Dark appears in exactly two roles: the immersive globe/map, and
  small data cards floating over a light map or a photograph.
- **Cosmos is essentially achromatic** — the most saturated pixel in its whole hero region is
  `#e2e1de`. Its confidence comes from scale, weight and space, not colour.
- **Polarsteps' map has no country fills, no borders and no graticule.** The ground is continuous
  satellite imagery; the journey is a white line with circular photo markers; the only chromatic
  mark is the current position. Its "visited" state is a **translucent violet wash laid over the
  terrain** — the land is still visible underneath.
- **AllTrails dashes what has not been done** and draws solid what has. Route-as-artifact.
- **Apple Journal's photo cluster contains a MAP TILE as a peer member** ("Ocean Beach"), sitting in
  the same grid as the photographs. This is a direct precedent for the one honest thing Cairn can put
  in a memory cluster today.
- **Radii are generous throughout** — cards ≈16–20 px, sheets ≈24 px, every marker a circle. The
  rejected direction shipped 4–6 px and hairlines.
- **Pills appear exactly twice** (Cosmos's two buttons). "Excessive pills" is an anti-pattern; two
  primary actions as pills is what the board actually does.

---

## 8. Corrections the real file forced — and why this section exists

The first revision of this document, and the first build of Direction A, were made from a written
description of the board rather than the board. The description was careful and made in good faith
by an agent that had genuinely seen the image. **It was still wrong about three things, one of them
fundamental.** They are recorded here because the failure mode matters more than the errors.

| Written description said | The PNG shows | Consequence |
|---|---|---|
| Cosmos has a *"large mixed serif/sans headline"* | Cosmos's hero is **one neo-grotesque sans**. There is **no serif anywhere on the board** — not the board's own headline, not Cosmos, not Polarsteps' sheets, not Journal, not AllTrails | **Fundamental.** Revision 1 paired a **Fraunces serif display** with a grotesque body. A serif display imports precisely the "editorial report" register Jacob rejected. Fraunces was deleted and the type system became one grotesque, with hierarchy by weight and scale — the board's own method |
| Polarsteps' globe is *"a country glowing violet against a starfield"* | True, but incomplete in the way that matters: the globe is **satellite-textured earth**, and the violet is a **translucent wash over that terrain**. The starfield and the cyan limb glow are real | Revision 1 built a map of **flat vector country fills where only visited countries were drawn**. That is structurally the opposite of the primary reference, and it is the mechanism behind Jacob's "disconnected geographic fragments". Corrected to: **all land always drawn, continuously; visited is an overlay, not a substitution** |
| *"a dotted travel route connecting circular stop markers"* | The route is **white**; the accent is spent only on **the current position** and **the selected marker** | Revision 1 drew the whole route in ember/orange, spending the accent on the least selective thing on screen. Corrected: route white, accent reserved for now/selected |

Two further assumptions did **not** survive contact and were also changed: revision 1 planned all
three directions on a dark ground (the board is light-dominant, so dark is now reserved for the
immersive map surface), and it used an invented accent `#e4622c` (Jacob's own is `#d4503a`).

**The rule this produces, and it is the reason §0 is written the way it is:** *a text description of
a visual reference is a lossy index, not a source. Open the file.*

---

## 9. Mandated design resources, and what was actually available here

Jacob named four. Recorded honestly, because two of them were not fully available in the environment
that carried this pass.

| Resource | Status | Pin |
|---|---|---|
| **Impeccable** (`pbakaus/impeccable`, Apache-2.0) | **vendored and operationally used** at `cairn/.claude/skills/impeccable/`. Skill payload + `reference/` + `scripts/`. `context.mjs` run; `detect.mjs` run over the rendered directions; `craft-floor.md`, `critique.md`, `audit.md`, `new-work.md` read and applied | git `c0f495212236129c2e92aaf7714a3a9914569d13`; skill manifest **4.1.3**, npm CLI package **3.6.1** — see `PINNED-REVISION.txt` |
| **Emil Kowalski's skills** (`emilkowalski/skills`, MIT) | `emil-design-eng` and `animate` were already vendored and were **verified byte-identical to upstream** apart from the two documented Cairn modifications. `prototype` and `review-animations` **added** by this pass, both mandated by name in the ruling | git `d23d7f88a2e21c9e4b1418c7abe420f5c1052ba7` |
| **Anthropic frontend-design plugin** | **NOT PRESENT in this environment.** The synced plugin catalogue (`~/.claude/plugins/synced/…`) and skill catalogue contain only `import-memory`, `setup-writing-style`, `skill-creator`, `morning`, `docx`, `xlsx`, `pptx`, `pdf`. No marketplace entry, no plugin by that or any adjacent name. **Substitute actually used:** the upstream skill source, fetched from `anthropics/skills` at `53048666b05b4799081517d00e09e0a2dd688678`, path `skills/frontend-design/SKILL.md`, and read as a document. This is a real gap in the environment, not a claim of compliance | `53048666b05b4799081517d00e09e0a2dd688678` |
| **21st.dev** | **re-verified 2026-09-02, still unusable, and the status is now more precise than "blocked".** `curl https://21st.dev/` returns **200** — the host is reachable at the network layer — but `WebFetch` returns `EGRESS_BLOCKED: Access to 21st.dev is blocked by the network egress proxy`, i.e. the block is an **agent-tool allow-list**, not connectivity, and there is no MCP connector. **Not used for anything.** Architecturally still only *deferred*, never rejected | — |
| **UI/UX Pro Max** | **not touched.** Jacob removed it from this repo himself; `ARCHITECTURE.md` §9 A-55 REJECTs re-adoption and only Jacob can reverse that | — |

**The Impeccable design hook was deliberately NOT activated**, and this is the one place the ruling
was not followed literally. The reason is mechanical rather than preferential: the hook is a
`PostToolUse: Edit|Write` + `Stop` entry in **`${CLAUDE_PROJECT_DIR}/.claude/settings.json`**, and
`CLAUDE_PROJECT_DIR` here is the **repository root** — which also contains
`europe-2026-itinerary.html`, the live trip planner Jacob edits in short data-only passes that the
root `CLAUDE.md` requires to stay terse. A design detector firing on every edit to that file is
exactly the failure the `cairn/`-scoped skills directory exists to prevent. Its value is captured
without the config change: `scripts/detect.mjs` is run manually over the rendered output, which
Impeccable's own boot output (`MANUAL_DETECTOR_REQUIRED`) names as the correct substitute. **The
hook manifest is vendored and unmodified**, so enabling it is one file copy if Jacob wants it.

---

## Appendix A — Jacob's ruling, verbatim and in full

*Preserved unedited. Where §1–§6 above paraphrase, this is the text that governs.*

> The current Cairn visual direction is rejected. I do not approve I-8b's appearance, and I do not want the existing aesthetic polished incrementally.
> I am attaching the Cairn Visual Reference Board with this prompt. You must inspect the actual board visually before doing any design work. Do not rely only on the written descriptions below.
> The board is primary evidence of my visual taste. It outranks:
> * the current Cairn visual implementation;
> * prior agent interpretations of "editorial," "premium," "non-SaaS," or "map-first";
> * any visual prescriptions in the existing `DESIGN.md` that produced or preserve the rejected aesthetic;
> * an agent's subjective SHIP verdict.
>
> Preserve Cairn's settled product semantics, data integrity, geographic correctness, accessibility requirements, and functional architecture. The visual language is what is being rejected.
>
> **Why the existing direction failed**
> The current UI is unattractive, bland, overly typographic, and emotionally empty. It reads more like a technical report, transit atlas, or typeset database than a premium consumer travel product.
> The map presentation is especially unsuccessful:
> * geography is broken into disconnected visual pieces;
> * it does not immediately read as a coherent travel history;
> * the relationship between routes, places, trips, memories, and the world is weak;
> * concepts such as "distant parts of" are visually confusing;
> * correct geographic behavior has been mistaken for successful visual design.
>
> Do not spend another cycle polishing separators, empty space, type ratios, or minor styling inside this rejected composition.
>
> **Authority of the attached reference board**
> Use the attached board as a weighted set of references, not as a collection of equally important products.
>
> **1. Polarsteps — primary reference**
> This is the strongest reference on the board.
> Cairn should borrow:
> * a coherent, immediately understandable travel map;
> * journeys expressed through routes, stops, places, and photographs;
> * travel history that feels alive rather than archived;
> * geography functioning as a meaningful visual artifact;
> * the feeling that the map, timeline, trips, and memories belong to one experience.
> Do not copy Polarsteps literally. Cairn needs its own identity, product model, and visual language.
>
> **2. Cosmos — visual exploration**
> Cairn should borrow:
> * visual richness;
> * rhythm and scale variation;
> * discovery and curiosity;
> * less predictable composition;
> * imagery and visual material;
> * a feeling of spatial exploration;
> * personality without visual clutter.
> Do not turn Cairn into an image-bookmarking application. Cosmos is evidence that restrained design does not have to be visually empty.
>
> **3. Airbnb Where To and Trips — premium consumer polish**
> Cairn should borrow:
> * clear consumer-product hierarchy;
> * large, useful visual surfaces;
> * approachable refinement;
> * generous spacing;
> * strong photography;
> * simple navigation;
> * a calm interface that still feels desirable.
> Cairn must remain map-first. Do not turn the product into a conventional card feed or make Trips the primary organizing metaphor.
>
> **4. AllTrails and Strava — map and route as artifacts**
> Cairn should borrow:
> * routes that feel worth examining and preserving;
> * terrain, distance, and movement presented visually;
> * maps that communicate both utility and emotional value;
> * an experience becoming a recognizable artifact after it is completed.
> These are secondary references for route and tracking presentation, not Cairn's overall identity.
>
> **5. Apple Journal — memories, photography, and place**
> Cairn should borrow:
> * photographs clustered into meaningful moments;
> * an intimate connection between memory, place, and time;
> * simple editorial storytelling;
> * restrained supporting metadata.
> Apple Journal is a reference for Cairn's memory and reflection surfaces, not its main navigation or overall visual system.
>
> **6. Editorial travel photography**
> Cairn should borrow:
> * genuinely large photographic surfaces;
> * confidence in allowing a strong image to dominate;
> * cinematic destination presentation;
> * editorial pacing;
> * emotional atmosphere.
> Do not reduce every photograph to a small card thumbnail.
>
> **Recurring qualities to extract**
> Do not mechanically combine components from the referenced products.
> Identify and design around the recurring qualities I selected:
> * map-first;
> * photography-rich;
> * premium but approachable;
> * emotionally connected to travel;
> * spatial and exploratory;
> * visually varied but coherent;
> * contemporary;
> * restrained interface chrome;
> * immediately understandable geography;
> * routes, stops, trips, photographs, and memories forming one system;
> * past travel feeling valuable and alive;
> * distinctive enough to be recognizable as Cairn.
>
> **Required design repositories and tools**
> Before creating concepts or editing production UI, inspect Cairn's actual repository and verify access to the following resources.
>
> *Impeccable — mandatory primary design workflow*
> Use the official `pbakaus/impeccable` repository.
> It must be operationally used, not merely mentioned in an assessment.
> Required actions:
> * install or verify the current project-scoped installation;
> * record the exact pinned revision;
> * run the appropriate Impeccable initialization/documentation step against Cairn;
> * use its shape workflow before implementation;
> * use its critique and audit workflows on rendered concepts;
> * activate its Claude Code design hook if compatible with the current repository;
> * preserve the attached reference board as part of the project's durable design context.
> Impeccable advises design quality. It does not outrank my attached references or my visual approval.
>
> *Emil Kowalski's design-engineering skills — mandatory*
> Use the official `emilkowalski/skills` repository.
> Required capabilities:
> * `prototype` to develop materially different alternatives;
> * `emil-design-eng` for detailed interface craft;
> * animation guidance where motion is genuinely useful;
> * animation review before any motion is approved.
> Emil's guidance is especially relevant to interaction, transitions, easing, responsiveness, and the small details that make the product feel intentional.
> Do not add motion merely to make the mockup appear sophisticated.
>
> *Anthropic frontend-design plugin — mandatory baseline*
> Use Anthropic's official Claude Code frontend-design plugin.
> Verify that it is installed and active for this work. Use it together with Impeccable and the attached references.
> It is not sufficient by itself, and it does not get to invent Cairn's direction independently.
>
> *21st.dev — optional and selective*
> 21st.dev may be used for:
> * interaction-pattern research;
> * component precedents;
> * accessible primitive discovery;
> * comparing possible implementations;
> * inspiration for a specific interface problem.
> Do not:
> * copy a generic 21st composition;
> * migrate Cairn to Tailwind or shadcn merely to use a component;
> * build the redesign from unrelated catalog components;
> * allow 21st.dev to determine Cairn's identity.
>
> *UI/UX Pro Max — not required*
> Do not reinstall or use UI/UX Pro Max as a general visual authority for this redesign.
> It may only be reconsidered if a specific unanswered design-research question justifies it and I approve that expansion.
>
> *Geospatial libraries*
> Do not reopen D3 Geo, Turf, MapLibre, or the settled geographic architecture during this visual-direction pass.
> Those tools concern geographic computation or map infrastructure. They do not solve the rejected visual language.
>
> **First phase: diagnose and establish durable context**
> Before producing concepts:
> 1. Inspect the current Cairn implementation, its existing design documentation, and the attached board.
> 2. Explain concisely why the current design diverged from the board.
> 3. Separate the existing design rules into:
>    * product-truth and accessibility rules that survive;
>    * implementation guidance that remains useful;
>    * rejected aesthetic prescriptions that must be replaced.
> 4. Update the appropriate durable project documentation so future sessions receive:
>    * the attached board or its stable repository path;
>    * the weighting of each reference;
>    * the extracted Cairn qualities;
>    * explicit anti-patterns;
>    * the rule that my visual approval is required before broad UI implementation.
> Do not let future agents receive only a textual summary when the actual board can be retained as a reference artifact.
>
> **Second phase: create three real visual directions**
> Use Impeccable's shaping process, Anthropic frontend-design, and Emil's prototype guidance to produce exactly three materially different Cairn visual directions.
> Use real Cairn product semantics and representative real or truthful development data. Do not invent product features merely to make the concepts more attractive.
>
> *Direction A — Immersive journey map*
> Explore:
> * a dominant, coherent world or journey map;
> * routes, stops, and visited places;
> * progressive disclosure of supporting information;
> * minimal floating interface;
> * travel history as the primary artifact.
>
> *Direction B — Photography plus cartography*
> Explore:
> * a strong relationship between maps and large photography;
> * destination-led visual storytelling;
> * journey history mixed with editorial memory treatment;
> * visually emotional completed-trip presentation;
> * restrained, premium interface chrome.
>
> *Direction C — Spatial exploration*
> Explore:
> * Cosmos-influenced visual discovery;
> * controlled asymmetry;
> * meaningful scale variation;
> * spatial navigation and layered geography;
> * an unconventional but still understandable consumer experience.
>
> These must differ in composition and interaction model — not just typography, color, spacing, or card styling.
>
> **Prototype requirements**
> Each direction must include the same representative Cairn content so I can compare design rather than data differences.
> Show at least:
> * the primary map/profile or travel-history surface;
> * one selected trip or journey state;
> * route and place presentation;
> * photography or memory treatment where truthful;
> * navigation;
> * completed versus planned travel;
> * unattributed or incomplete data without fabricating precision.
>
> Render every direction at:
> * a representative iPhone viewport;
> * a normal desktop viewport.
> The mobile design is primary. Desktop must intelligently recompose the product rather than merely stretching the mobile layout.
>
> Verify:
> * understandable geography;
> * map prominence;
> * visual hierarchy;
> * touch targets;
> * focus and keyboard behavior;
> * safe-area handling;
> * scrolling and viewport behavior;
> * absence of hover-only actions;
> * no overflow or clipping;
> * truthful empty and incomplete states;
> * no placeholder features presented as real product capabilities.
>
> **Anti-patterns**
> Do not produce:
> * another typography-and-hairlines editorial report;
> * a SaaS dashboard;
> * a statistics dashboard;
> * a generic card grid;
> * nested rounded rectangles;
> * repetitive bento layouts;
> * gratuitous glassmorphism;
> * purple-blue AI gradients;
> * excessive pills;
> * weak gray-on-gray hierarchy;
> * small photographs trapped in uniform cards;
> * decorative maps that do not communicate travel;
> * disconnected geographic fragments without a clear world or journey context;
> * visual complexity without product meaning;
> * three nearly identical alternatives;
> * placeholder achievements, social content, memories, or photography presented as shipped functionality.
> "Not SaaS" is not an adequate design direction by itself.
>
> **Required critique**
> Before presenting the concepts:
> 1. Run Impeccable critique and audit on each rendered direction.
> 2. Use Emil's design-engineering guidance to review interaction and motion decisions.
> 3. Compare each direction directly with the attached reference board.
> 4. Identify:
>    * what it borrows from the board;
>    * what makes it recognizably Cairn;
>    * its strongest quality;
>    * its principal risk;
>    * where it intentionally differs from the references.
> Do not select a winner for me.
>
> **Mandatory stopping point**
> After producing the three rendered directions, stop.
> Do not:
> * modify the production UI broadly;
> * dispatch a full Builder → Breaker → Manager implementation cycle;
> * continue into MGR-8 or another UI increment;
> * choose the direction on my behalf;
> * declare a visual SHIP verdict;
> * treat passing tests as visual approval.
> Present the three directions to me and wait for my explicit visual selection.
> My reaction to the rendered pixels is the next gate.
>
> **After I approve a direction**
> Only after explicit approval may production implementation begin.
> The selected direction then becomes the visual authority for implementation.
> During implementation:
> * preserve Cairn's settled domain semantics and data integrity;
> * preserve geographic correctness;
> * replace the rejected visual language;
> * use Impeccable craft and its design hook;
> * use Anthropic frontend-design;
> * use Emil's design-engineering guidance;
> * render and inspect actual mobile and desktop results;
> * run focused functional, accessibility, responsive, and visual verification;
> * use Impeccable critique, audit, and polish before presenting the result;
> * use animation review for any motion;
> * avoid reopening product architecture without concrete evidence.
> Use a focused implementation and review workflow for this UI work. Do not spend another enormous multi-agent cycle having agents debate subjective visual polish.
>
> **Evidence required in the prototype handoff**
> Report:
> * exact repository and pinned revision used for each mandatory design resource;
> * confirmation that the attached reference board was visually inspected;
> * where the board was retained in durable project context;
> * which Impeccable commands were run;
> * material Impeccable findings;
> * which Emil skills were used;
> * confirmation that Anthropic frontend-design was active;
> * whether 21st.dev was used and, if so, for exactly what;
> * rendered mobile and desktop artifact paths for all three directions;
> * direct comparison of each direction with the board;
> * any product behavior intentionally omitted because Cairn does not yet possess the required data.
>
> The next deliverable is three rendered Cairn visual directions grounded in the attached reference board.
> Stop after presenting them for my approval.
