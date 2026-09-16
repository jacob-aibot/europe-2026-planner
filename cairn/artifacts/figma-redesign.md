# Cairn Figma redesign — 14 September 2026

[Editable Figma file](https://www.figma.com/design/ni4enXsWxhFHa5pqIEknAl)

Six native, editable compositions cover World, Trips and You at phone and desktop sizes. The file includes Cairn color variables, text styles, reusable action components, actual globe vectors and licensed Dubrovnik destination photography.

The working web app implements the direction with operational globe controls, form actions, source disclosures and responsive content. Figma is a design reference; it is not a working prototype of persistence or city selection.

## What changed

- World keeps an immersive globe and puts profile setup, a past place and a new plan within the first phone viewport. Quiet action rows replace the stack of equally prominent cards.
- Trips leads with a clear planning action and a secondary past-journey path. Its removable Europe example has real destination photography with visible source details.
- You uses a navy identity panel and a warmer travel-journal layout, without empty analytics. Existing populated history, local profile editing and error recovery remain available.

## Evidence

The six `redesign-{world,trips,you}-{mobile,desktop}.png` files in `.impeccable/review/` are working-app captures from 390×844 and 1280×800 viewports. Mobile files include the full scrollable page. `figma-final-*.png` are Figma exports. All were opened and visually inspected.

Passed: root and web TypeScript checks; 78 view, boundary, local identity and globe tests; first-run browser acceptance; out-of-order city search and storage failure checks; failed-save/retry confirmation; 320px reflow; production build. Existing large-chunk build warning remains.

The independent reviewer validated all six app screenshots and reported no material issue in its interim message, but hit a usage limit before returning a final review. Do not treat that as independent sign-off.

The production preview was rebuilt on port 5175. No commit or push has been made. User visual approval is still pending.
