# Rendered-output tells — a checklist, not an authority

**Status: advisory reference. Not a contract doc** (`BRIEF.md` / `ARCHITECTURE.md` / `ROADMAP.md` are the
contract, and nothing here overrides them). Read it in two places and nowhere else:

- **the builder of a surface increment**, once, before writing CSS;
- **the breaker or QA pass**, at rendered-output verification, beside the Playwright probes.

## Where it came from, and what was deliberately not taken

Derived from reading [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0) — its
`cli/engine/rules/checks.mjs` (~5,700 lines, 61 deterministic detector rules that run against computed
styles with no LLM and no API key) and `skill/reference/audit.md`, read at `main` on 2026-08-31. What is
below is a hand-picked subset restated for this project.

**Nothing was installed.** No skill, no hooks, no `PRODUCT.md`/`DESIGN.md` context files, no CLI, no browser
extension, no vendored code, and **no new runtime dependency** — which is also why the rules are restated as
prose rather than imported: the engine is a browser-runtime detector with its own `color`/`fonts`/`constants`
modules, and `cairn-constraints` §2 does not permit that arriving as a dependency on anyone's judgement but
Jacob's. The four-agent workflow in `cairn/CLAUDE.md` is unchanged and remains the only workflow.

## Precedence — read this before using the list

**Cairn's own visual language wins, every time.** This list detects *generic* design; Cairn's problem has
never been genericness, and several entries below fire on things this product does on purpose. A hit is a
**question** — *"is this deliberate, and is it written down?"* — never a defect, and never a reason to
change a design decision `ARCHITECTURE.md` or an approved design pass already made.

## The list, as it applies here

Grouped by whether it has ever actually bitten this codebase.

**1. Found in Cairn's own CSS, and already scheduled for removal (I-8a):**

- **gradient chrome** — `.topbar__mark`'s `linear-gradient(150deg, …)` plus its glow ring.
- **glassmorphism** — `.topbar`'s `backdrop-filter: blur(8px)` over a `color-mix` translucent background.

Both are on the canonical tell list, and both were already independently identified. That agreement is the
whole reason this file exists; it is not evidence the tool should be given authority.

**2. Worth checking on any new surface:**

- purple/blue gradient fills, and gradient *text* (`background-clip: text`);
- glassmorphism anywhere else — a blur over a translucent panel;
- an accent side-stripe border (one edge ≥2px in a non-neutral colour) used as decoration;
- nested cards — a bordered box inside a bordered box inside a bordered box;
- rounded-square icon tiles stacked above a heading;
- an eyebrow/kicker chip above a hero heading;
- overused typefaces used as the *whole* system (Inter, Arial, system-ui defaults);
- grey body text on a coloured background, and pure `#000`/`#666` with no tint;
- untinted default shadows; a "thin border + wide soft shadow" card;
- bounce/elastic easing, and pulsing-dot or blinking-cursor decoration;
- radial spotlight glow / halo backgrounds;
- monotonous spacing — every gap the same, no rhythm;
- flat type hierarchy — three sizes that are almost the same size;
- content hidden at rest that only appears on hover;
- decoration with no purpose: anything that would not be missed if deleted.

**3. Deliberate in Cairn — recorded here so they are not re-litigated every pass:**

- **numbered labels** (`numbered-section-labels`). The planner numbers stops and map pins because the number
  *is data* — it is the pin's identity, not an editorial scaffold. Keep.
- **tracked uppercase micro-labels** (`tracked-caps`, `hero-eyebrow-chip`, `all-caps-body`). The
  editorial-cartographic language is built on them. Keep — but they must remain *labels*, never body copy.
- **UI text below 11px** (`undersized-ui-text`). `.tab__badge` and `.pill` sit at `.68rem` ≈ 10.9px, and the
  detector explicitly does *not* exempt uppercase letterspaced micro-labels. This one is a genuine tension:
  the tell is about legibility, not taste. **Decide it once, in the I-8a token layer, and write the number
  down** — do not silently drift below it afterwards.
- **hairline rules and small radii.** Flagged nowhere; noted because they are the language's backbone and a
  future audit must not "soften" them.

## What is worth mechanising (and what is not)

The existing Playwright probes in `cairn/qa/` already run Chromium with `page.evaluate`, so a handful of
these are computed-style assertions with **zero** new dependency. Worth adding to a surface increment's own
probe, in this order:

1. no element has a non-`none` `backdrop-filter`;
2. no chrome element paints a `linear-gradient`/`radial-gradient` background (the map's own fills are
   exempt by selector, named explicitly);
3. no rendered text below the floor the token layer settles, outside a named allow-list of classes;
4. no element carries exactly one border edge ≥2px in a non-neutral colour;
5. computed contrast of body text against its composited background meets WCAG AA.

Everything else on the list stays prose. A detector with more rules than the surface has elements produces
findings faster than a human can adjudicate them, and an unadjudicated finding list is how a checklist
quietly becomes an authority.

## Impeccable's other half, and why it is not here

Its `audit` reference is a five-dimension scored rubric (accessibility, performance, responsive, theming,
implementation integrity; P0–P3 severities; a 0–20 score). Cairn already has a severity taxonomy, a breaker
stage and a manager gate. A second scoring system competing with `QA-FINDINGS.md` is exactly the overlap
this project does not need, so only the **tells** are taken.

## Relationship to the Emil skills

Not redundant, and the boundary is clean: **`emil-design-eng` / `animate` are construction** — they decide
whether a thing should animate at all, then pick the curve, duration, property and interruption *before* the
code is written, and they carry almost nothing about static composition. **This list is post-hoc audit of
static rendered output** — it looks at computed styles after the fact and asks what the result looks like it
was generated by. Different moment, different subject. Keep both, in those roles.
