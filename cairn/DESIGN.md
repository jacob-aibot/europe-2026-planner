---
name: Cairn — immersive web
description: A textured Earth and limestone travel journal, grounded in real travel history.
colors:
  world-ink: "#112d39"
  world-muted: "#526875"
  world-paper: "#faf9f5"
  world-accent: "#bc492b"
  world-amber: "#d7aa61"
  card: "#fffefa"
  sky: "#031d27"
  primary-action: "#0b3441"
  first-run-action: "#07303e"
  first-run-action-hover: "#164b5d"
  on-dark: "#fffaf0"
  line: "#d5d7cc"
typography:
  display:
    fontFamily: '"DM Serif Display", Georgia, serif'
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-.02em"
  headline:
    fontFamily: '"DM Serif Display", Georgia, serif'
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-.025em"
  title:
    fontFamily: '"DM Serif Display", Georgia, serif'
    fontSize: "21px"
    fontWeight: 400
  body:
    fontFamily: '"Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: "14px"
    lineHeight: 1.5
  label:
    fontFamily: '"Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: "11px"
    lineHeight: 1.5
rounded:
  input: "9px"
  image: "10px"
  card: "12px"
  example: "16px"
  identity: "18px"
  pill: "24px"
  destination-sheet: "28px"
  world-sheet: "30px"
spacing:
  compact: "8px"
  pair: "12px"
  group: "16px"
  section: "20px"
  inset: "24px"
  desktop-sheet: "26px"
components:
  button-primary:
    backgroundColor: "{colors.primary-action}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.input}"
    padding: "13px 18px"
  button-first-run:
    backgroundColor: "{colors.first-run-action}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.pill}"
    padding: "12px 19px"
  button-first-run-hover:
    backgroundColor: "{colors.first-run-action-hover}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.world-ink}"
    rounded: "{rounded.input}"
    padding: "11px 12px"
  world-sheet:
    backgroundColor: "{colors.world-paper}"
    textColor: "{colors.world-ink}"
---

# Design System: Cairn

## Overview

**Creative North Star: "Earth, coast and limestone"**

This is an extraction of the implemented immersive web direction: a textured Earth, sourced destination photographs and warm sheets over deep navy. Serif headings give destinations and personal history presence; calm body text keeps actions and disclosures legible. The user selected the richer concept in `artifacts/visual-direction/cairn-immersive-concept.png` after rejecting an overly spare direction. The phrase above describes that implementation; it is not a separate brand decision.

Scope is World, Trips and You first-run surfaces, the Croatia destination preview, and their shared components. Source authority is `apps/web/src/world.css`, followed by `apps/web/src/immersive.css`, with the body font inherited from `styles.css`. This does not claim completion of all thirteen reference views. Final rendered visual approval remains pending; the finish review's ship disposition covers the resolved new-label size issue, not a general acceptance claim.

The surviving product-truth and accessibility requirements in `docs/DESIGN.md` remain binding. This extraction does not replace that historical contract. Durable product context remains in `docs/BRIEF.md` and `docs/PRODUCT-VISION.md`.

**Key Characteristics:**

- Earth and destination imagery provide scale and atmosphere.
- Limestone sheets overlap navy scenes, with readable text on stable surfaces.
- Personal identity is optional and device-local; travel history reflects actual records.
- Amber and terracotta mark selected states and actions without replacing written status.

## Colors

Deep maritime navy anchors the imagery; warm limestone holds reading and interaction.

Primary action uses navy, including a rounded first-run variant. Terracotta supplies active mobile navigation, focus and occasional text actions. Amber accents selected geography, desktop World navigation and identity outlines. These roles are contextual: amber is not a universal indication of a visit.

Neutral ink and muted text sit on paper or the lighter card surface. Dark scenes use warm light text. Real photography adds coastal blue, stone and terracotta without expanding the UI token palette.

**The Truth Rule.** A scenic cover is destination imagery, never proof of a visit or a user-owned photograph. Keep its label and accessible credits.

## Typography

DM Serif Display is self-hosted at regular weight for the wordmark, headings, destination names and selected figures. Public Sans is the self-hosted body face; system sans fallbacks preserve the layout.

The frontmatter records representative mobile roles, not a rigid universal scale. World first-run headlines grow from (30px) to (34px) at desktop; Croatia's title grows from (48px) to (60px). Trips first-run headings use (36px)/(46px). Section titles sit near (20–24px), body copy at (14px), and contextual labels at (11–12px). Inputs use (16px) in the shell. Uppercase tracking is limited to supporting kickers; it is not the display voice.

**The Readable Label Rule.** The binding text floor is (11px). Preserve it when adding labels; this documentation is not a claim that every legacy selector has been audited.

## Layout

Mobile places the scene above the reading surface. World overlaps the Earth with a rounded sheet; Croatia overlaps a full-width hero photograph with its destination sheet. Paired city photographs and paired secondary actions provide compact choice without a wall of cards. The bottom World/Trips/You navigation respects the safe-area inset.

At (900px), World becomes two columns within a (1120px) container, with a sticky Earth and an independent sheet. Croatia becomes a split photograph/detail composition in the same maximum width. Trips places introductory actions beside the example journey; You places identity beside welcome content. These are recompositions, not stretched mobile layouts. The identity layout also adapts at (560px).

Insets cluster around (24px); small groups use (8–16px). Text measures remain compact, commonly (34–48ch). Allow long names to wrap. Preserve keyboard access, meaningful landmarks and focus movement when opening a destination.

## Elevation & Depth

Depth comes from photographic crops, dark lower-image gradients, Earth lighting and overlapping paper. The World sheet has a soft upward shadow; library containers and city results use restrained ambient shadows. They support the material separation rather than decorate every row. Full shadow and motion values are in `.impeccable/design.json`.

Arrival motion is bounded: short rises for World content and the destination sheet, and a brief Earth fade. Country selection can rotate the Earth over (650ms). Reduced motion removes CSS animation and transitions and makes the selected-country movement immediate. Do not turn the globe into an unattended looping animation.

## Shapes

The Earth and identity mark are circles. First-run primary actions are pill-shaped; fields and photographic tiles have smaller curves. World and destination sheets have large top corners on mobile, becoming contained panels on desktop. Trip rows remain open and separated by quiet rules. Do not round every element into an interchangeable card.

## Components

- **Primary actions:** navy with light text, clear verbal labels and a trailing direction cue where useful. The first-run pill spans both action columns; secondary journey actions use open rows. Preserve observed hover darkening/lightening and the visible terracotta focus outline.
- **Inputs:** light card fill, fine neutral border, rounded corners and readable text. Labels, optional-field hints and device-local context stay visible. Focus uses an offset outline; textarea resizing remains available.
- **Navigation:** three labelled icons, World/Trips/You. Mobile stacks the icon above its label; desktop aligns them horizontally near the header. Selection uses color and an underline on desktop. Keep text labels alongside the icons.
- **Status chips:** visited, current and upcoming states have words as well as color; current and upcoming add dashed borders. Never merge planned and actual travel into one visual claim.
- **Destination tiles and example journey:** real sourced photos with dark lower gradients and light captions. The example badge and removable-device-example disclosure remain attached to the example. Its dates and counts come from the actual example trip data.
- **Earth:** the NASA texture is a visual layer over the SVG geographic interaction. SVG fallback, keyboard rotation/zoom/reset and the country list remain usable. Geographic highlight states follow existing travel-history semantics.
- **Croatia preview:** Dubrovnik and Split choices update the selected city and map marker. Planning and recording a visit are separate actions. Exploring the preview does not add history.
- **Identity:** an optional device-local name, home-city text and bio. Show initials only from the supplied name, otherwise the neutral profile icon. The scenic cover is labelled as destination imagery; home-city text does not imply a visit.

Image provenance and licenses live in `apps/web/public/images/README.md` and image sidecars. NASA Blue Marble is historical imagery, not live Earth data. Natural Earth geography and the detailed Croatia presentation map are separate from core travel attribution geometry.

## Do's and Don'ts

- **Do** use sourced destination imagery with visible context and credits.
- **Do** preserve authentic visits, distinct planned/current states and readable provenance.
- **Do** use the existing serif/sans pairing, warm paper and navy scene relationship.
- **Do** preserve the 11px text floor, usable touch targets, keyboard access and visible focus.
- **Do** provide reduced-motion alternatives and retain the SVG geographic fallback.
- **Don't** invent avatars, social activity, personal photographs, visits or example statistics.
- **Don't** let exploration, an optional home city or a scenic cover imply travel history.
- **Don't** use this scoped extraction as evidence that every reference surface is implemented or visually approved.

