# World — approved-board implementation

Status: richer first-run direction and Croatia preview implemented. The fresh finish reviewer returned ship after its one readability finding was resolved. Awaiting Jacob's visual approval of the actual build before commit or push.

## Direction contract

THESIS: World opens a person's real travel history through an interactive Earth.
OWN-WORLD: Atlantic navy, a textured Earth, amber visited geography, serif Cairn wordmark, overlapping limestone sheet, destination photography and terracotta active navigation. The original board and subsequently approved richer concept in `artifacts/visual-direction/cairn-immersive-concept.png` are visual direction references; the generated concept's invented details are not product data.
STORY: Explore Earth and Croatia, choose a real city, record a journey, then see its country on World.
FIRST VIEWPORT: At 390×844, brand above a central whole globe; progress and country history below; bottom World · Trips · You navigation.
FORM: The richer composition approved by Jacob, with sourced imagery and real stored journey facts. No social fixtures or invented travel.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Bounded rendering contract

This user-approved World-first slice adds `World.tsx` and `Globe.tsx`; the existing
`WorldMap.tsx` atlas and its selector remain available via “Atlas view”, unchanged.
A-40…A-54 still govern that atlas. They do not describe the new orthographic renderer.

`d3-geo` is a web-only dependency for spherical projection, horizon clipping and path
generation. It consumes the existing COUNTRY_INDEX without changing its bytes or attribution.
Pure geometry lives in `apps/web/src/world/globeGeometry.ts`; React owns transient view pose.
Pointer deltas rotate/tilt, two pointers zoom, and the browser hit-tests SVG country paths.
No DOM measurement determines geography. A fixed SVG viewBox remains valid after hidden-tab
activation. Keyboard rotation/zoom/reset and an always-available country list cover small or
back-facing countries. No auto-rotation or persistent view-state writes.

Country history and numbers come through `travelHistory`; current-trip-only countries remain
provisional, not confirmed visited. Upcoming geography is read from guarded planned summary
rows and is never added to travel totals. No 195 denominator or physical-coverage claim.
Missing shapes, unreadable data and rescanning remain disclosed. Opening trips uses the existing
store path, including its persistence refusal behavior. Empty libraries invite recording a trip.

The shell uses World · Trips · You (existing internal tab ids retained). Discover is future-only.
No personal photos, friend activity, avatars, live statuses, countdowns, or routes are invented.
Sourced destination covers and a labelled Croatia map now support discovery; route overlays
remain deferred. The warm shell extends through populated Trips and You, journey forms and the
existing trip editor: consistent paper surfaces, navy text, serif headings, navigation and focus
treatment. This is a scoped visual extension; the live itinerary's composition remains later work.
No core, client, schema, corpus, access, provenance, lifecycle or trip-persistence changes are
part of this slice. This brief records the implemented surface and does not replace the approved
board or introduce global architectural requirements.

## First-run extension

An empty library now keeps the globe as the emotional anchor and replaces the zero-stat report
with “Make this world yours.” Profile setup is optional. Its versioned name, home-city text, bio
and welcome choice live in localStorage, separately from trip documents and backups. Name, home
city and bio are limited to 80, 120 and 240 characters respectively; saves trim surrounding
whitespace and reads validate the version, types and limits. The home city is never treated as
travel. Save/read failures use the shell error channel and a failed profile save leaves the form
intact for retry. This is a browser-local identity, not an account or a synced profile. Browser
storage is scoped to the origin: localhost and a LAN address, or different ports, have separate
profiles and trip libraries; a phone does not inherit the laptop's records.

World, Trips and You share a one-shot library intent, so their “plan” and “past journey” actions
open the existing forms after any open trip closes successfully. Empty Trips gives those two paths
primary hierarchy; restore and the removable Europe 2026 example are secondary. The example
preview explicitly names its cities and shows its actual city count, day count and dates over a sourced Dubrovnik cover.
It invents no route or personal visits; loading it is an explicit action described as adding a
removable example to this device. Empty You introduces personal identity and explains how journey
history grows without rendering empty analytics. An upcoming-only library features its next
journey without claiming it as visited. Its “Places ahead” country buttons provide a keyboard
path to country history, including geography that is small or behind the globe. Country selection
focuses the detail heading; returning restores focus to the country choice.

Both trip forms use one accessible ordered city selector. At two characters it lazily loads the
appropriate `@cairn/core/gazetteer` shard, ignores stale requests, renders the returned GeoNames
source plus its resolving CC BY 4.0 link, and persists only `cityPickFromRow` results. A deliberate
free-text fallback remains and states that the city may not appear on World. Failed search loads
explain that the name can be kept without a map match, so the journey can continue. Arrow keys,
Enter and Escape operate the city suggestions; selected cities retain their journey order.

Recording a past journey retains a pending completion tied to the exact created trip id. The
confirmation and “See it on World” action appear only while that same trip is open, persistence
is idle and the store is clean. A failed write shows the existing retry/export recovery instead
of a success claim; a successful retry can reveal the retained completion. The World action opens
the selected matched country, or explains the missing location when no city was map matched.

World's entrance is coordinated across the globe, history sheet and action choices, using a small
vertical rise and a visible starting opacity. Content remains visible without animation; the
action animation is scoped to World, and reduced-motion preference disables motion across the
shell. There is no auto-rotation or persistent animation state.

## Finish verification and preview

The September 14 immersive extension adds a decorative WebGL Earth material using NASA's July
2004 Blue Marble composite. Its pose matches the existing orthographic SVG interaction layer;
the original interactive SVG remains available if imagery or WebGL fails. GPU textures are
bounded to 2048×1024. Context loss restores the fallback, and context recovery reloads the image.
There is no continuous render loop. Country focus animates once and obeys reduced motion.

Croatia's preview has sourced Dubrovnik and Split photographs and a separate detailed Natural
Earth regional map. A city choice seeds the existing form search; the user still selects a
gazetteer match. Preview coordinates never become saved CityPick values. Exploring writes no
journey. A successful past-trip save, through the existing persistence gate, is what highlights
the country on World. Trips and You use explicitly identified scenic imagery; none implies a
personal visit or user-owned photograph. Image origins and licenses are in the asset README
and accompanying provenance sidecars.

Current-pass checks: both TypeScript projects; 78 focused view, boundary, identity and globe
tests; first-run acceptance and failure scripts; failed-write retry; textured World → Croatia →
Split → saved visit on both 390×844 and 1280×800; 320px reflow and 200% desktop reflow equivalent;
image/WebGL fallback, context loss/recovery, preview return focus, no implicit preview writes;
production build and LAN-origin phone emulation. Current source detector returned no findings.
The source provenance scan reports four rasters and zero missing origins. The fresh reviewer
requested larger secondary labels, then marked that one fix resolved with disposition ship.
Ten recaptured full-page screenshots are in `.impeccable/review/`, using `immersive-` for World,
Croatia and saved-country views, and `redesign-` for Trips and You. Build retains a chunk-size
warning (approximately 1.10 MB main entry). Physical Safari and the other reference-board
screens remain outside this checkpoint. The rejected older Figma file is not the current design.

### Earlier first-run verification

The independent finish reviewer marked all three material fixes resolved: save-gated completion
bound to the exact trip, keyboard country choices for upcoming-only history, and visible-default
World-only entrance motion. Its ship disposition is technical review, not Jacob's visual approval.

Validation passed: 78 focused view, boundary, local-identity and globe tests; 249 focused core
tests; both typechecks; and the production build. The build retains a bundle-size warning for an
approximately 1.09 MB entry (354 KB gzip). Browser evidence is recorded in
`.impeccable/review/first-run-acceptance-results.json`, with failure and save-retry exercises in
`.impeccable/review/first-run-failures.mjs` and `.impeccable/review/past-save-retry.mjs`.

The production preview at `http://192.168.1.92:5175` passed profile setup, lazy Split search,
past-trip save, Croatia on World, reload and You in Edge with touch emulation, without page
errors. Laptop localhost and LAN port 5175 respond. Physical-phone connectivity and testing remain
unconfirmed. `docs/PHONE-PREVIEW.md` and `tools/phone-preview.ps1` document, build and reuse the
stable LAN preview for Jacob's visual review. No commit or push is authorized by these checks.

## Windows checkout

The reserved `con.json` shard was written through Windows' extended path namespace using the
exact Git blob. Node reads it normally; sparse checkout was then disabled. No corpus rename,
content change, or corpus re-generation was needed.
