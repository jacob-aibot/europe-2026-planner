# Cairn — returning to the original visual ambition

14 September 2026. Research and proposed direction, not a shipped redesign or user-approved replacement.

Method: dual-agent (A: visual_direction_a; B: visual_direction_b). Both independently inspected the original board and fresh live browser tabs. A additionally reviewed current mobile captures. No production UI changes were made in this research pass.

## Finding

The rejected implementation keeps the palette and serif but removes the reference's substance: immersive geography, photographic destinations, overlapping surfaces and compact useful information. It looks like an onboarding website rather than a travel app. Passing accessibility or static checks is not evidence of visual fidelity.

The original board is still the authority. The Figma file from the preceding pass is rejected direction, not an approved design system. Stale Profile.tsx comments prohibit photography and maps and should be retired during implementation. No personal visit, friend, photo or booking should be fabricated; that restriction does not prohibit clearly sourced destination imagery.

## Recommended changes

1. Make the globe the signature experience: approximately 340–365px wide at a 390px viewport, header over the sky, limestone sheet overlapping the lower globe. Strongly directed light, dark blue ocean, fine atmosphere, restrained terrain detail. Gold visit overlays represent only saved travel.
2. Show travel value before a large setup form. Keep profile optional. Propose a compact first-place action plus an explicit example preview; changing the prior profile-first priority requires a visible design decision, not a silent behavioral change.
3. Establish destination photography as a system. Curate wide heroes, portrait destination tiles and tight place thumbnails, with crop focal points and source/license metadata. Destination imagery must remain distinguishable from the user's own photos.
4. Build a real country-preview screen. A country opens a photographic introduction, meaningful city choices and a geographic detail map. This is an additional read-only discovery capability, not something the current library supports today.
5. Recompose Trips and You with the board's compact hierarchy: image, title, concise metadata, thumbnail rhythm. Avoid repeating large generic welcome headlines across all tabs. Personal analytics appear only with real records.
6. Use motion to connect places: globe turns toward a selected country, destination opens from that geography, a saved first city receives a short reveal. Support reduced motion and static fallback; profile setup and performance should not block basic use.

## Research translated to Cairn

- [Airbnb's 2025 release](https://news.airbnb.com/product-releases/airbnb-2025-summer-release) presents image-led exploration and an itinerary that brings accommodation and experiences together. The transferable lesson is to make actual places and activities the visual content. Do not copy the booking business model or invent services.
- [Apple's 2025 Design Awards](https://developer.apple.com/design/awards/2025/) describe Lumy's curated palette and quick access to celestial information, and Denim's smooth transitions, cropping and depth. The inference for Cairn: visual delight should reinforce its distinctive object—the globe—and the user's journey through places.
- [NASA Blue Marble Next Generation](https://svs.gsfc.nasa.gov/12564/) supplies geographically grounded Earth imagery. A textured globe prototype could use an appropriately sized and credited Earth texture. The source is historical composite imagery, not live satellite data.

## Implementation order

First establish one convincing vertical slice: World → Croatia preview → add a mapped place → return to illuminated World. Produce both an empty-library and populated-library composition. Prototype the globe material in a browser before promising a renderer: richer SVG can improve substantially, while a textured WebGL sphere may be needed for convincing depth under rotation. Keep the existing geographic state/picking rules and SVG/list fallback.

Next apply the photographic cover system and compact layouts to Trips and You. Then complete motion, responsive layouts and real-phone performance checks. Approve the actual rendered slice before expanding or committing; do not treat a pretty generated board as proof of feasible implementation.

## Assessment evidence

A's provisional Nielsen scores: status 3, real-world match 3, control 3, consistency 3, error prevention not exercised, recognition 2, efficiency 2, aesthetics 2, recovery not exercised, help not sufficiently inspected. Total 18/28. This is a usability score, not a visual-fidelity score.

B ran the static detector exactly once across World, Library, Profile and ExampleJourney: zero findings, exit 0. Browser warning/error logs were empty. No overlay was injected: the available browser evaluate API was read-only. No physical-phone or populated-history interaction was performed during this research pass. No data was loaded into the user's library.

## Concept image

`cairn-immersive-concept.png` was made with the built-in image-generation tool using the original board as a reference. Prompt intent: three rich mobile concepts—fresh World, Croatia destination preview, and an explicit Europe 2026 example—with luminous Earth, destination photography, overlapping limestone sheets, compact travel detail and the approved palette/type character.

It is an art-direction illustration. Its avatar, destination imagery, map labels and itinerary day allocations are illustrative, not sourced implementation assets or validated itinerary data. First-run production should use initials/profile outline until user media is supported. Real photography and geography must replace generated representations. It omits some necessary controls and does not establish interaction, accessibility or performance quality.

Questions skipped: the user's original reference board and rejection establish the direction clearly. The next checkpoint should show an actual rich rendered slice, not ask for another palette selection.
