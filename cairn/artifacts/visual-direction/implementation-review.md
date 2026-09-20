# Cairn immersive implementation checkpoint — 2026-09-14

The user approved the richer concept direction. This checkpoint implements that direction in
World, a Croatia destination preview, and first-run Trips and You. The actual browser build is
awaiting the user's visual approval; no commit or push has been made.

## Implemented

- NASA imagery on an interactive Earth, with SVG geography, highlighting and fallback.
- Sourced Dubrovnik/Split photography, overlapping limestone surfaces and a real regional map.
- Croatia city choices seed the existing new/past journey city search. A saved gazetteer pick
  and successful persistence are required before a recorded visit appears on World.
- Photographic example-trip presentation and an explicitly labelled scenic profile cover.
- Existing optional local identity, skip, unreadable-data and failed-save recovery retained.

## Verified

- Both TypeScript projects and 78 focused view/boundary/local-identity/globe tests passed.
- First-run acceptance, failed search/create/read, and failed IndexedDB write/retry scripts passed.
- Textured World → Croatia → Split selection → saved visit → highlighted Croatia passed at
  390×844 and 1280×800 in isolated browser contexts.
- All three tabs reflow at 320px. Desktop 200% reflow equivalent and reduced-motion checks passed.
- Failed image request and unavailable WebGL retain keyboard-operable SVG geography. Graphics
  context loss shows fallback; restoration reloads the material. Preview exploration creates
  no journey and Back restores its trigger focus.
- Production build passed. The main entry remains approximately 1.10 MB with Vite's size warning.
- LAN preview returns HTTP 200 at `http://LAPTOP-LAN-IP:5175/`, listening on `0.0.0.0:5175`.
  Profile setup, lazy city search, saved visit, World, reload and You passed there in Edge touch
  emulation with no page errors. This is not physical iPhone/Safari testing.
- Changed-source design detector returned `[]`; raster provenance scan: four rasters, none missing.

## Visual review

A fresh independent reviewer inspected the original board, approved concept and ten mobile/desktop
captures. Its initial disposition was **fix**, with one material finding: undersized secondary
labels/disclosures on the new surfaces. Those labels and World source text were raised to 11px.
The reviewer inspected the correction and recaptures and returned **ship**, scoped to that resolved
finding. This does not replace the user's visual approval or certify the remaining reference views.

Current captures in `.impeccable/review/`:

- `immersive-world-{mobile,desktop}.png`
- `immersive-croatia-{mobile,desktop}.png`
- `immersive-saved-{mobile,desktop}.png`
- `redesign-trips-{mobile,desktop}.png`
- `redesign-you-{mobile,desktop}.png`

Full-page mobile captures include the fixed navigation at the viewport's bottom; scrolling reveals
the content below it. The older Figma file/captures describe the rejected sparse direction and
are not evidence for this implementation. Image credits and licenses remain in
`apps/web/public/images/README.md` and accompanying JSON provenance sidecars.
